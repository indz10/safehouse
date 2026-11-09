-- =========================================================
-- ZombieSafeHouse · NOTIFICHE PUSH
-- telefoni iscritti, chiavi (create dalla funzione), registro invii,
-- orologio automatico ogni 10 minuti
-- =========================================================

-- [1] TABELLE -----------------------------------------------
create table if not exists public.push_subs(
  endpoint text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  last_feed timestamptz not null default now(),
  created_at timestamptz not null default now());
create table if not exists public.push_keys(
  id int primary key default 1,
  public_key text not null,
  private_key text not null,
  cron_secret text not null,
  created_at timestamptz not null default now());
create table if not exists public.push_log(
  slot text not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (slot, kind));
alter table public.push_subs enable row level security;
alter table public.push_keys enable row level security;
alter table public.push_log enable row level security;

-- [2] ISCRIVERSI E CANCELLARSI --------------------------------
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  insert into public.push_subs(endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
  return json_build_object('ok',true);
end $$;
create or replace function public.push_unsubscribe(p_endpoint text) returns json
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
  select json_build_object('ok',true);
$$;
grant execute on function public.push_subscribe(text,text,text) to authenticated;
grant execute on function public.push_unsubscribe(text) to authenticated;
