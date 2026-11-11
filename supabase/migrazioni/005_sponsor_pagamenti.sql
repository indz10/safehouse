-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 005 — pagamento degli sponsor (Fase 9a-2, pronto ma SPENTO)
-- 1) sponsor_prezzi: il listino dei pacchetti (prezzo, durata, se dà "in evidenza"). Si cambia con un UPDATE.
-- 2) sponsor_pagato: lo chiama SOLO la funzione Edge zsh-pay quando Stripe conferma un pagamento:
--    pacchetto, scadenza allungata, "in evidenza" se il pacchetto lo prevede, abbonamento registrato.
-- 3) sponsor_scadenze: ogni notte chi è scaduto torna "normale" (visibile, senza evidenza).
-- Finché su Supabase non ci sono le chiavi di Stripe nessuno può pagare: questa migrazione non cambia niente di visibile.
-- Si può eseguire più volte.
-- =====================================================================

create table if not exists public.sponsor_prezzi(
  package text primary key,
  nome text not null,
  prezzo_eur numeric(10,2) not null check (prezzo_eur > 0),
  mesi int not null default 12 check (mesi between 1 and 36),
  evidenza boolean not null default false,
  attivo boolean not null default true,
  ordine int not null default 0);
alter table public.sponsor_prezzi enable row level security;
drop policy if exists "tutti leggono il listino" on public.sponsor_prezzi;
create policy "tutti leggono il listino" on public.sponsor_prezzi for select using (attivo);
insert into public.sponsor_prezzi(package, nome, prezzo_eur, mesi, evidenza, ordine) values
  ('vetrina', 'Vetrina · 1 anno', 290, 12, false, 1),
  ('vetrina_plus', 'Vetrina Plus · 1 anno, in evidenza', 590, 12, true, 2),
  ('partner_categoria', 'Partner di categoria · 1 anno, in evidenza', 1490, 12, true, 3)
on conflict (package) do nothing;

create or replace function public.sponsor_pagato(p_sponsor uuid, p_package text, p_stripe_id text, p_eur numeric) returns json
language plpgsql security definer set search_path = public as $$
declare pr public.sponsor_prezzi; s public.sponsors; da date; fino date;
begin
  if exists (select 1 from public.subscriptions where stripe_id = p_stripe_id) then return json_build_object('ok', true, 'msg', 'già registrato'); end if;
  select * into pr from public.sponsor_prezzi where package = p_package;
  select * into s from public.sponsors where id = p_sponsor;
  if pr.package is null or s.id is null then return json_build_object('ok', false, 'msg', 'pacchetto o sponsor sconosciuto'); end if;
  da := greatest(current_date, coalesce(s.valid_to, current_date));
  fino := (da + make_interval(months => pr.mesi))::date;
  update public.sponsors set package = pr.package, valid_from = coalesce(valid_from, current_date), valid_to = fino,
    stato = 'attivo', visibility = case when visibility = 'nascosto' then 'nascosto' when pr.evidenza then 'evidenza' else 'normale' end,
    active = (visibility <> 'nascosto')
  where id = p_sponsor;
  insert into public.subscriptions(sponsor_id, package, price_eur, period, starts_on, ends_on, status, stripe_id)
  values (p_sponsor, pr.package, coalesce(p_eur, pr.prezzo_eur), pr.mesi || ' mesi', da, fino, 'attivo', p_stripe_id);
  return json_build_object('ok', true, 'fino', fino);
end $$;
revoke all on function public.sponsor_pagato(uuid, text, text, numeric) from public, anon, authenticated;

create or replace function public.sponsor_scadenze() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.subscriptions set status = 'scaduto' where status = 'attivo' and ends_on < current_date;
  update public.sponsors set visibility = 'normale' where visibility = 'evidenza' and valid_to is not null and valid_to < current_date;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.sponsor_scadenze() from public, anon, authenticated;
select cron.unschedule('zsh-sponsor-scadenze') where exists (select 1 from cron.job where jobname = 'zsh-sponsor-scadenze');
select cron.schedule('zsh-sponsor-scadenze', '17 3 * * *', $$ select public.sponsor_scadenze(); $$);

-- controllo: deve dire "pagamenti pronti (spenti finché mancano le chiavi Stripe)"
select case when to_regclass('public.sponsor_prezzi') is not null and exists (select 1 from pg_proc where proname = 'sponsor_pagato')
             and exists (select 1 from cron.job where jobname = 'zsh-sponsor-scadenze')
       then 'pagamenti pronti (spenti finché mancano le chiavi Stripe)' else 'qualcosa manca' end as esito;
