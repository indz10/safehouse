-- =========================================================
-- ZombieSafeHouse · AGGIORNAMENTO (fine ottobre 2026)
-- Supabase → SQL Editor → New query → incolla tutto → Run
-- =========================================================

-- 1) ELIMINA ACCOUNT (obbligatorio per App Store e Google Play)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2) COLLEGARE UN ACCOUNT NEGOZIO A UNO SPONSOR (solo admin)
create or replace function public.admin_link_sponsor(p_sponsor uuid, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then return 'Solo per amministratori'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return 'Nessun account con questa email: il negoziante deve prima registrarsi nell''app'; end if;
  insert into public.sponsor_users(sponsor_id, user_id) values (p_sponsor, uid) on conflict do nothing;
  return 'ok';
end $$;
grant execute on function public.admin_link_sponsor(uuid, text) to authenticated;

create or replace function public.admin_sponsor_accounts(p_sponsor uuid) returns table(email text, user_id uuid)
language sql security definer set search_path = public as $$
  select u.email::text, u.id from public.sponsor_users su join auth.users u on u.id = su.user_id
  where su.sponsor_id = p_sponsor and public.is_admin();
$$;
grant execute on function public.admin_sponsor_accounts(uuid) to authenticated;

-- 3) INVITI: chi ha invitato chi
alter table public.profili_pubblici add column if not exists invitato_da text;
create or replace function public.miei_invitati() returns table(nick text, valutato boolean, dal timestamptz)
language sql security definer set search_path = public as $$
  select p.nick, p.indice is not null, p.updated_at from public.profili_pubblici p
  where p.invitato_da = left(auth.uid()::text, 8) and p.user_id <> auth.uid();
$$;
grant execute on function public.miei_invitati() to authenticated;

-- 4) STATISTICHE SPONSOR protette (se non l'hai già fatto)
alter view public.sponsor_stats_month set (security_invoker = true);
