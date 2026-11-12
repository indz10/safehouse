-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 010 — 🔎 Trova superstiti e ⭐ preferiti (richiesta di Alessandro, 12/11)
-- 1) PREFERITI: ognuno può salvare tra i preferiti qualsiasi superstite, anche se non è alleato.
--    Li vede solo chi li ha salvati (il superstite non lo sa).
-- 2) VICINO A UNA MIA CASA: elenco dei superstiti entro 20 km da una delle mie case (casa dove abito o
--    comprata). La distanza è calcolata dalla posizione APPROSSIMATA già pubblica sulla mappa
--    (profili_pubblici.lat_r/lon_r, ~200 m): niente di nuovo sulla casa vera. Compaiono solo i superstiti
--    visibili sulla mappa; esclusi i bloccati (in tutte e due le direzioni).
-- Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_favs (
  user_id uuid not null,
  fav uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, fav)
);
alter table public.world_favs enable row level security;

create or replace function public.w_ally_state(a uuid, b uuid) returns text
  language sql stable security definer set search_path to 'public' as $$
  select case when public.w_are_allies(a, b) then 'ok'
    when exists (select 1 from public.world_allies x where x.requester = a and x.target = b and x.status = 'pending') then 'out'
    when exists (select 1 from public.world_allies x where x.requester = b and x.target = a and x.status = 'pending') then 'in'
    else 'none' end; $$;
revoke all on function public.w_ally_state(uuid, uuid) from public;

-- ⭐ aggiunge o toglie un preferito
create or replace function public.world_fav_set(p_user uuid, p_on boolean) returns json
  language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_user is null or p_user = auth.uid() then return json_build_object('ok',false,'msg','Non puoi salvare te stesso'); end if;
  if p_on then
    if (select count(*) from public.world_favs where user_id = auth.uid()) >= 200 then
      return json_build_object('ok',false,'msg','Hai già 200 preferiti'); end if;
    if not exists (select 1 from public.profili_pubblici where user_id = p_user) then
      return json_build_object('ok',false,'msg','Superstite non trovato'); end if;
    insert into public.world_favs(user_id, fav) values (auth.uid(), p_user) on conflict do nothing;
  else
    delete from public.world_favs where user_id = auth.uid() and fav = p_user;
  end if;
  return json_build_object('ok',true,'on',p_on);
end $$;

-- ⭐ i miei preferiti
create or replace function public.world_favs_list()
  returns table(user_id uuid, nick text, wlevel integer, comune text, ally text, seen_at timestamptz)
  language sql stable security definer set search_path to 'public' as $$
  select p.user_id, p.nick, public.w_lvl_of(p.user_id), case when p.visibile then p.comune end,
         public.w_ally_state(auth.uid(), p.user_id), p.seen_at
  from public.world_favs f join public.profili_pubblici p on p.user_id = f.fav
  where f.user_id = auth.uid()
  order by p.nick; $$;

-- 🔎 superstiti entro p_km (max 20) da una delle MIE case
create or replace function public.world_near_survivors(p_lat double precision, p_lon double precision, p_km double precision default 20)
  returns table(user_id uuid, nick text, wlevel integer, comune text, km numeric, ally text, fav boolean)
  language sql stable security definer set search_path to 'public' as $$
  with mie as (select lat, lon from public.world_homes where user_id = auth.uid()
               union all select lat, lon from public.world_buildings where owner = auth.uid()),
       ok as (select 1 from mie where public.w_km(mie.lat, mie.lon, p_lat, p_lon) <= 0.5 limit 1),
       r as (select least(20, greatest(1, coalesce(p_km, 20))) as km)
  select p.user_id, p.nick, public.w_lvl_of(p.user_id), p.comune,
         round(public.w_km(p_lat, p_lon, p.lat_r, p.lon_r)::numeric, 1),
         public.w_ally_state(auth.uid(), p.user_id),
         exists (select 1 from public.world_favs f where f.user_id = auth.uid() and f.fav = p.user_id)
  from public.profili_pubblici p, r
  where auth.uid() is not null and exists (select 1 from ok)
    and p.user_id <> auth.uid() and p.visibile and p.lat_r is not null and p.lon_r is not null
    and abs(p.lat_r - p_lat) < 0.2 and abs(p.lon_r - p_lon) < 0.3
    and public.w_km(p_lat, p_lon, p.lat_r, p.lon_r) <= r.km
    and not exists (select 1 from public.world_blocks b where (b.user_id = auth.uid() and b.blocked = p.user_id) or (b.user_id = p.user_id and b.blocked = auth.uid()))
  order by 5, p.nick
  limit 80; $$;

revoke all on function public.world_fav_set(uuid, boolean) from public;
revoke all on function public.world_favs_list() from public;
revoke all on function public.world_near_survivors(double precision, double precision, double precision) from public;
grant execute on function public.world_fav_set(uuid, boolean) to authenticated;
grant execute on function public.world_favs_list() to authenticated;
grant execute on function public.world_near_survivors(double precision, double precision, double precision) to authenticated;

select 'trova superstiti pronto' as fatto;
