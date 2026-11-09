-- =====================================================================
-- ZombieSafeHouse · Backend sponsor (Supabase / PostgreSQL)
-- Da incollare in Supabase → SQL Editor → New query → Run
-- Progetto: wmweptdpfworispqjhto
-- =====================================================================

-- =====================================================================
-- PREPARAZIONE: se nel progetto ci sono tabelle vecchie con lo stesso
-- nome ma fatte in un altro modo (es. "sponsors" con la colonna "attivo"),
-- le rinomino in *_vecchia così non si perde niente e non danno errore.
-- Si può eseguire più volte senza problemi.
-- =====================================================================
do $$
declare r record;
begin
  for r in select * from (values
    ('sponsors','slug'),('offers','sponsor_id'),('coupons','code'),('leads','consent'),
    ('reviews','coupon_id'),('sponsor_events','kind'),('subscriptions','package'),
    ('salvataggi','dati'),('admins','user_id'),('sponsor_users','sponsor_id')) as t(tab,col)
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=r.tab)
       and not exists (select 1 from information_schema.columns where table_schema='public' and table_name=r.tab and column_name=r.col) then
      execute format('alter table public.%I rename to %I', r.tab, r.tab||'_vecchia_'||to_char(now(),'YYYYMMDD_HH24MI'));
      raise notice 'Tabella % rinominata (era di una versione precedente)', r.tab;
    end if;
  end loop;
end $$;

-- =====================================================================
-- 0) SALVATAGGI DEGLI UTENTI (login e progressi nel cloud)
--    Serve all'app per ricordare casa valutata, gioco e premi di ogni persona.
-- =====================================================================
create table if not exists public.salvataggi (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dati jsonb not null,
  updated_at timestamptz default now()
);
alter table public.salvataggi enable row level security;
drop policy if exists "ognuno legge il suo salvataggio" on public.salvataggi;
create policy "ognuno legge il suo salvataggio" on public.salvataggi for select using (user_id = auth.uid());
drop policy if exists "ognuno crea il suo salvataggio" on public.salvataggi;
create policy "ognuno crea il suo salvataggio" on public.salvataggi for insert with check (user_id = auth.uid());
drop policy if exists "ognuno aggiorna il suo salvataggio" on public.salvataggi;
create policy "ognuno aggiorna il suo salvataggio" on public.salvataggi for update using (user_id = auth.uid());

-- 1) RUOLI: chi è amministratore INDZ e chi è un utente di uno sponsor
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 2) SPONSOR: la scheda che compare su mappa, verdetto e gioco
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- es. 'ferramenta-volta'
  name text not null,
  logo_text text,                            -- sigla nel bollino, es. 'FV'
  category text not null,                    -- es. 'Ferramenta e sicurezza'
  package text not null check (package in ('vetrina','vetrina_plus','partner_categoria','agenzia','acchiappa','nazionale')),
  founder boolean default false,             -- prezzo fondatori
  address text, comune text, provincia text,
  lat double precision, lon double precision,
  phone text, whatsapp text, website text, instagram text, facebook text,
  active boolean default false,              -- visibile nell'app solo se attivo
  valid_from date, valid_to date,            -- periodo del contratto
  created_at timestamptz default now()
);

-- persone dello sponsor che possono entrare nel pannello
create table if not exists public.sponsor_users (
  sponsor_id uuid references public.sponsors(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (sponsor_id, user_id)
);

create or replace function public.my_sponsor(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sponsor_users where sponsor_id = s and user_id = auth.uid());
$$;

-- 3) OFFERTE: lo sconto mostrato nella scheda
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  title text not null,                       -- es. '−10% sulle grate'
  details text,
  remedy_tags text[],                        -- rimedi del verdetto collegati, es. {'porta','grate'}
  active boolean default true,
  valid_to date,
  created_at timestamptz default now()
);

-- 4) CODICI SCONTO: uno per persona e sponsor, validato in cassa
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- es. 'ZSH-FV-1390'
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days',
  redeemed_at timestamptz,                   -- quando il negozio lo valida
  amount_eur numeric(10,2)                   -- importo dello scontrino (facoltativo)
);

-- 5) PREVENTIVI (contatti con consenso)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null, contact text not null, message text,
  consent boolean not null check (consent = true),
  house_index numeric(3,1),                  -- indice della casa, se l'utente lo condivide
  status text default 'nuovo' check (status in ('nuovo','contattato','preventivo','vinto','perso')),
  created_at timestamptz default now()
);

-- 6) RECENSIONI (solo da visite verificate da codice)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  coupon_id uuid references public.coupons(id),
  stars int not null check (stars between 1 and 5),
  text text,
  hidden boolean default false,
  created_at timestamptz default now()
);

-- 7) EVENTI PER LE STATISTICHE (nessun dato personale)
create table if not exists public.sponsor_events (
  id bigint generated always as identity primary key,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  kind text not null check (kind in ('vista_mappa','vista_verdetto','vista_gioco','scheda','chiama','whatsapp','indicazioni','sito','codice_creato','codice_usato','preventivo')),
  created_at timestamptz default now()
);

-- 8) ABBONAMENTI (pagamenti: collegabili a Stripe in seguito)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  package text not null, price_eur numeric(10,2) not null,
  period text default 'annuale', starts_on date, ends_on date,
  status text default 'attivo' check (status in ('attivo','scaduto','sospeso')),
  invoice_ref text, stripe_id text,
  created_at timestamptz default now()
);

-- ===================== SICUREZZA (RLS) =====================
alter table public.admins enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_users enable row level security;
alter table public.offers enable row level security;
alter table public.coupons enable row level security;
alter table public.leads enable row level security;
alter table public.reviews enable row level security;
alter table public.sponsor_events enable row level security;
alter table public.subscriptions enable row level security;

-- tutti vedono gli sponsor attivi e le loro offerte attive
drop policy if exists "app legge sponsor attivi" on public.sponsors;
create policy "app legge sponsor attivi" on public.sponsors for select using (active or public.is_admin() or public.my_sponsor(id));
drop policy if exists "admin gestisce sponsor" on public.sponsors;
create policy "admin gestisce sponsor" on public.sponsors for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sponsor modifica i propri contatti" on public.sponsors;
create policy "sponsor modifica i propri contatti" on public.sponsors for update using (public.my_sponsor(id)) with check (public.my_sponsor(id));

drop policy if exists "app legge offerte attive" on public.offers;
create policy "app legge offerte attive" on public.offers for select using (active or public.is_admin() or public.my_sponsor(sponsor_id));
drop policy if exists "sponsor e admin gestiscono offerte" on public.offers;
create policy "sponsor e admin gestiscono offerte" on public.offers for all using (public.is_admin() or public.my_sponsor(sponsor_id)) with check (public.is_admin() or public.my_sponsor(sponsor_id));

drop policy if exists "admin vede admin" on public.admins;
create policy "admin vede admin" on public.admins for select using (public.is_admin());
drop policy if exists "admin gestisce utenti sponsor" on public.sponsor_users;
create policy "admin gestisce utenti sponsor" on public.sponsor_users for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "utente vede il proprio legame" on public.sponsor_users;
create policy "utente vede il proprio legame" on public.sponsor_users for select using (user_id = auth.uid());

-- codici: l'utente vede i suoi; lo sponsor vede quelli del suo negozio
drop policy if exists "utente crea i suoi codici" on public.coupons;
create policy "utente crea i suoi codici" on public.coupons for insert with check (user_id = auth.uid());
drop policy if exists "lettura codici" on public.coupons;
create policy "lettura codici" on public.coupons for select using (user_id = auth.uid() or public.my_sponsor(sponsor_id) or public.is_admin());

-- preventivi: chiunque autenticato invia, solo lo sponsor e l'admin leggono
drop policy if exists "utente invia preventivo" on public.leads;
create policy "utente invia preventivo" on public.leads for insert with check (user_id = auth.uid());
drop policy if exists "sponsor legge i suoi preventivi" on public.leads;
create policy "sponsor legge i suoi preventivi" on public.leads for select using (public.my_sponsor(sponsor_id) or public.is_admin());
drop policy if exists "sponsor aggiorna stato preventivo" on public.leads;
create policy "sponsor aggiorna stato preventivo" on public.leads for update using (public.my_sponsor(sponsor_id) or public.is_admin());

-- recensioni: pubbliche se non nascoste; si scrivono solo con un codice usato
drop policy if exists "app legge recensioni" on public.reviews;
create policy "app legge recensioni" on public.reviews for select using (not hidden or public.is_admin());
drop policy if exists "recensione verificata" on public.reviews;
create policy "recensione verificata" on public.reviews for insert with check (
  user_id = auth.uid() and exists (select 1 from public.coupons c where c.id = coupon_id and c.user_id = auth.uid() and c.redeemed_at is not null and c.sponsor_id = reviews.sponsor_id));
drop policy if exists "admin modera recensioni" on public.reviews;
create policy "admin modera recensioni" on public.reviews for update using (public.is_admin());

-- eventi: l'app scrive, solo sponsor e admin leggono
drop policy if exists "app registra eventi" on public.sponsor_events;
create policy "app registra eventi" on public.sponsor_events for insert with check (true);
drop policy if exists "sponsor legge le sue statistiche" on public.sponsor_events;
create policy "sponsor legge le sue statistiche" on public.sponsor_events for select using (public.my_sponsor(sponsor_id) or public.is_admin());

drop policy if exists "admin gestisce abbonamenti" on public.subscriptions;
create policy "admin gestisce abbonamenti" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sponsor vede il suo abbonamento" on public.subscriptions;
create policy "sponsor vede il suo abbonamento" on public.subscriptions for select using (public.my_sponsor(sponsor_id));

-- ===================== FUNZIONI =====================
-- il negozio valida il codice in cassa (solo se il codice è suo e non scaduto)
create or replace function public.redeem_coupon(p_code text, p_amount numeric default null)
returns text language plpgsql security definer set search_path = public as $$
declare c public.coupons;
begin
  select * into c from public.coupons where code = upper(p_code);
  if not found then return 'Codice inesistente'; end if;
  if not public.my_sponsor(c.sponsor_id) then return 'Codice di un altro negozio'; end if;
  if c.redeemed_at is not null then return 'Codice già usato'; end if;
  if c.expires_at < now() then return 'Codice scaduto'; end if;
  update public.coupons set redeemed_at = now(), amount_eur = p_amount where id = c.id;
  insert into public.sponsor_events (sponsor_id, kind) values (c.sponsor_id, 'codice_usato');
  return 'Codice valido: sconto applicato';
end; $$;

-- statistiche del mese per il pannello sponsor
create or replace view public.sponsor_stats_month as
select sponsor_id,
  count(*) filter (where kind like 'vista_%') as visualizzazioni,
  count(*) filter (where kind = 'scheda') as schede_aperte,
  count(*) filter (where kind = 'codice_creato') as codici_creati,
  count(*) filter (where kind = 'codice_usato') as codici_usati,
  count(*) filter (where kind = 'preventivo') as preventivi
from public.sponsor_events
where created_at >= date_trunc('month', now())
group by sponsor_id;

-- ===================== PRIMI DATI (esempio, da modificare) =====================
insert into public.sponsors (slug, name, logo_text, category, package, founder, comune, provincia, active)
values ('ferramenta-volta','Ferramenta Volta','FV','Ferramenta e sicurezza','vetrina_plus',true,'Volta Mantovana','MN',false)
on conflict (slug) do nothing;
-- Per diventare amministratore: dopo esserti registrato nell'app, esegui
-- insert into public.admins (user_id) select id from auth.users where email = 'TUA_EMAIL';

-- =========================================================
-- ATTIVITÀ NASCOSTE DALLA MAPPA (aggiunta ottobre 2026)
-- =========================================================
create table if not exists public.hidden_pois(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision,
  lon double precision,
  created_at timestamptz default now());
alter table public.hidden_pois enable row level security;
drop policy if exists "tutti leggono nascosti" on public.hidden_pois;
create policy "tutti leggono nascosti" on public.hidden_pois for select using (true);
drop policy if exists "admin gestisce nascosti" on public.hidden_pois;
create policy "admin gestisce nascosti" on public.hidden_pois for all using (public.is_admin()) with check (public.is_admin());
-- =========================================================
-- ZombieSafeHouse · COMMUNITY VERA e SEGNALAZIONI (ottobre 2026)
-- Eseguire una volta in Supabase → SQL Editor → New query → Run
-- =========================================================
-- profili pubblici: solo chi accetta, posizione arrotondata (~200 m)
create table if not exists public.profili_pubblici(
  user_id uuid primary key references auth.users(id) on delete cascade,
  nick text not null,
  lat_r double precision,
  lon_r double precision,
  comune text,
  indice numeric,
  livello int,
  visibile boolean default true,
  seen_at timestamptz default now(),
  updated_at timestamptz default now());
alter table public.profili_pubblici enable row level security;
drop policy if exists "si vedono i profili pubblici" on public.profili_pubblici;
create policy "si vedono i profili pubblici" on public.profili_pubblici for select using (visibile or user_id = auth.uid());
drop policy if exists "ognuno crea il suo profilo" on public.profili_pubblici;
create policy "ognuno crea il suo profilo" on public.profili_pubblici for insert with check (user_id = auth.uid());
drop policy if exists "ognuno aggiorna il suo profilo" on public.profili_pubblici;
create policy "ognuno aggiorna il suo profilo" on public.profili_pubblici for update using (user_id = auth.uid());
drop policy if exists "ognuno cancella il suo profilo" on public.profili_pubblici;
create policy "ognuno cancella il suo profilo" on public.profili_pubblici for delete using (user_id = auth.uid());

-- segnalazioni degli utenti: "questa attività ha chiuso"
create table if not exists public.poi_reports(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision,
  lon double precision,
  motivo text,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz default now());
alter table public.poi_reports enable row level security;
drop policy if exists "utenti segnalano" on public.poi_reports;
create policy "utenti segnalano" on public.poi_reports for insert with check (auth.uid() is not null);
drop policy if exists "admin legge segnalazioni" on public.poi_reports;
create policy "admin legge segnalazioni" on public.poi_reports for select using (public.is_admin());
drop policy if exists "admin gestisce segnalazioni" on public.poi_reports;
create policy "admin gestisce segnalazioni" on public.poi_reports for delete using (public.is_admin());

-- numeri veri in alto: utenti registrati e attivi negli ultimi 5 minuti
create or replace function public.zsh_stats() returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'utenti', (select count(*) from auth.users),
    'online', (select count(*) from public.profili_pubblici where seen_at > now() - interval '5 minutes'),
    'visibili', (select count(*) from public.profili_pubblici where visibile and lat_r is not null));
$$;
grant execute on function public.zsh_stats() to anon, authenticated;
-- ZombieSafeHouse · attività aggiunte a mano da INDZ (anche non sponsor)
create table if not exists public.custom_pois(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cat text not null,
  address text,
  lat double precision not null,
  lon double precision not null,
  phone text,
  website text,
  created_at timestamptz default now());
alter table public.custom_pois enable row level security;
drop policy if exists custom_select on public.custom_pois;
create policy custom_select on public.custom_pois for select using (true);
drop policy if exists custom_admin on public.custom_pois;
create policy custom_admin on public.custom_pois for all using (public.is_admin()) with check (public.is_admin());
