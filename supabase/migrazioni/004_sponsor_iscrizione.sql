-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 004 — sponsor che si iscrivono da soli (Fase 9a-1)
-- 1) Nuovi campi dello sponsor: stato (in attesa / attivo / rifiutato), visibilità (nascosto / normale / in evidenza),
--    link a Google, TikTok, orari, descrizione, chi l'ha chiesto e quando.
-- 2) SICUREZZA: prima il negoziante poteva modificare TUTTA la sua riga (anche attivarsi, mettersi in evidenza
--    o allungare la scadenza). Ora può cambiare solo contatti, social, orari, descrizione e logo.
-- 3) world: sponsor_request (iscrizione dall'app), admin_sponsor_set (approva / oscura / in evidenza).
-- 4) Statistiche del mese: anche i contatti (telefono, WhatsApp, sito, social, Google, indicazioni) toccati nell'app.
-- Non cancella dati. Gli sponsor già presenti restano attivi e "normali". Si può eseguire più volte.
-- =====================================================================

alter table public.sponsors add column if not exists stato text not null default 'attivo';
alter table public.sponsors add column if not exists visibility text not null default 'normale';
alter table public.sponsors add column if not exists google_url text;
alter table public.sponsors add column if not exists tiktok text;
alter table public.sponsors add column if not exists orari text;
alter table public.sponsors add column if not exists descrizione text;
alter table public.sponsors add column if not exists richiesto_da uuid;
alter table public.sponsors add column if not exists richiesto_il timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sponsors_stato_check') then
    alter table public.sponsors add constraint sponsors_stato_check check (stato in ('in_attesa','attivo','rifiutato'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sponsors_visibility_check') then
    alter table public.sponsors add constraint sponsors_visibility_check check (visibility in ('nascosto','normale','evidenza'));
  end if;
end $$;

-- il negoziante cambia solo i campi "suoi": il resto lo decide l'admin (o il pagamento, dal server)
create or replace function public.sponsors_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  new.id := old.id; new.slug := old.slug; new.package := old.package; new.founder := old.founder;
  new.active := old.active; new.stato := old.stato; new.visibility := old.visibility;
  new.valid_from := old.valid_from; new.valid_to := old.valid_to; new.created_at := old.created_at;
  new.richiesto_da := old.richiesto_da; new.richiesto_il := old.richiesto_il;
  new.lat := old.lat; new.lon := old.lon; new.category := old.category; new.name := old.name;
  return new;
end $$;
drop trigger if exists sponsors_guard on public.sponsors;
create trigger sponsors_guard before update on public.sponsors for each row execute function public.sponsors_guard();

-- iscrizione dall'app: crea lo sponsor "in attesa" (non visibile) e lo collega all'account di chi lo chiede
create or replace function public.sponsor_request(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int; sid uuid; nm text := left(trim(coalesce(p->>'name','')), 80); sl text;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per iscrivere la tua attività'); end if;
  if length(nm) < 2 then return json_build_object('ok', false, 'msg', 'Scrivi il nome dell''attività'); end if;
  select count(*) into n from public.sponsors where richiesto_da = me and stato = 'in_attesa';
  if n > 0 then return json_build_object('ok', false, 'msg', 'Hai già una richiesta in attesa: INDZ la sta controllando'); end if;
  select count(*) into n from public.sponsors where richiesto_da = me;
  if n >= 5 then return json_build_object('ok', false, 'msg', 'Troppe richieste da questo account: scrivi a INDZ'); end if;
  sl := trim(both '-' from regexp_replace(lower(nm), '[^a-z0-9]+', '-', 'g')) || '-' || left(md5(random()::text), 4);
  insert into public.sponsors(slug, name, logo_text, category, package, address, comune, lat, lon, phone, whatsapp, website, instagram, facebook,
                              tiktok, google_url, orari, descrizione, active, stato, visibility, richiesto_da, richiesto_il)
  values (sl, nm, left(coalesce(nullif(p->>'logo',''), upper(left(nm, 2))), 3), left(coalesce(nullif(p->>'category',''), 'Attività'), 60), 'vetrina',
          left(p->>'address', 160), left(p->>'comune', 80), nullif(p->>'lat','')::double precision, nullif(p->>'lon','')::double precision,
          left(p->>'phone', 40), left(p->>'whatsapp', 40), left(p->>'website', 200), left(p->>'instagram', 200), left(p->>'facebook', 200),
          left(p->>'tiktok', 200), left(p->>'google_url', 300), left(p->>'orari', 300), left(p->>'descrizione', 600),
          false, 'in_attesa', 'normale', me, now())
  returning id into sid;
  insert into public.sponsor_users(sponsor_id, user_id) values (sid, me);
  if length(trim(coalesce(p->>'offer',''))) > 1 then
    insert into public.offers(sponsor_id, title, details, active) values (sid, left(trim(p->>'offer'), 120), left(p->>'offer_details', 400), true);
  end if;
  return json_build_object('ok', true, 'id', sid, 'msg', 'Richiesta inviata: INDZ la controlla e la attiva');
end $$;

-- admin: approva / rifiuta / oscura / in evidenza (lo sponsor è visibile nell'app se attivo e non nascosto)
create or replace function public.admin_sponsor_set(p_id uuid, p_stato text, p_visibility text) returns json
language plpgsql security definer set search_path = public as $$
declare s public.sponsors;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', 'solo admin'); end if;
  select * into s from public.sponsors where id = p_id;
  if s.id is null then return json_build_object('ok', false, 'msg', 'sponsor non trovato'); end if;
  update public.sponsors set
    stato = coalesce(nullif(p_stato,''), stato),
    visibility = coalesce(nullif(p_visibility,''), visibility),
    active = (coalesce(nullif(p_stato,''), stato) = 'attivo' and coalesce(nullif(p_visibility,''), visibility) <> 'nascosto'),
    valid_from = case when coalesce(nullif(p_stato,''), stato) = 'attivo' and valid_from is null then current_date else valid_from end
  where id = p_id returning * into s;
  return json_build_object('ok', true, 'stato', s.stato, 'visibility', s.visibility, 'active', s.active);
end $$;

revoke all on function public.sponsor_request(jsonb) from public, anon;
grant execute on function public.sponsor_request(jsonb) to authenticated;
revoke all on function public.admin_sponsor_set(uuid, text, text) from public, anon;
grant execute on function public.admin_sponsor_set(uuid, text, text) to authenticated;

-- statistiche del mese: in più i contatti toccati nell'app (kind = 'clic_…')
create or replace view public.sponsor_stats_month with (security_invoker = true) as
 select sponsor_id,
    count(*) filter (where kind like 'vista_%') as visualizzazioni,
    count(*) filter (where kind = 'scheda') as schede_aperte,
    count(*) filter (where kind = 'codice_creato') as codici_creati,
    count(*) filter (where kind = 'codice_usato') as codici_usati,
    count(*) filter (where kind = 'preventivo') as preventivi,
    count(*) filter (where kind like 'clic_%') as contatti
   from public.sponsor_events
  where created_at >= date_trunc('month', now())
  group by sponsor_id;

-- controllo: deve dire "sponsor pronti"
select case when exists (select 1 from information_schema.columns where table_name = 'sponsors' and column_name = 'visibility')
             and exists (select 1 from pg_proc where proname = 'sponsor_request')
             and exists (select 1 from pg_trigger where tgname = 'sponsors_guard') then 'sponsor pronti' else 'qualcosa manca' end as esito;
