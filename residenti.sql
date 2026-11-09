-- =========================================================
-- ZombieSafeHouse · CHI ABITA DOVE (coinquilini, condomini, nuovi in conferma)
-- =========================================================

-- [R1] la mappa: per ogni edificio anche chi ci abita (entro 25 m), compresi i nuovi in conferma
drop function if exists public.world_view(double precision, double precision, double precision, double precision);
create function public.world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision)
returns table(building_id text, lat double precision, lon double precision, status text, nick text, level int, residents text, pending boolean)
language sql stable security definer set search_path = public as $$
  with hm as (select h.building_id, h.lat, h.lon, h.user_id, h.status from public.world_homes h
              where h.status in ('home','pending') and h.lat between p_minlat - 0.001 and p_maxlat + 0.001 and h.lon between p_minlon - 0.001 and p_maxlon + 0.001),
  pts as (select b.building_id, b.lat, b.lon from public.world_buildings b
            where b.lat between p_minlat and p_maxlat and b.lon between p_minlon and p_maxlon and b.owner is not null
          union select hm.building_id, hm.lat, hm.lon from hm where hm.lat between p_minlat and p_maxlat and hm.lon between p_minlon and p_maxlon)
  select p.building_id, p.lat, p.lon,
    case when exists (select 1 from hm where hm.user_id = auth.uid() and (hm.building_id = p.building_id or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025)) then 'myhome'
         when exists (select 1 from hm where hm.building_id = p.building_id or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025) then 'home'
         when bb.owner = auth.uid() then 'mine'
         when bb.owner is not null then 'owned' else 'free' end,
    coalesce(public.w_nick(bb.owner), (select public.w_nick(hm.user_id) from hm where (hm.building_id = p.building_id or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025) and hm.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) limit 1)),
    coalesce(bb.level, 1),
    (select string_agg(distinct public.w_nick(hm.user_id), ', ') from hm where (hm.building_id = p.building_id or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025)
       and hm.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)),
    coalesce((select bool_and(hm.status = 'pending') from hm where hm.building_id = p.building_id or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025), false)
  from pts p left join public.world_buildings bb on bb.building_id = p.building_id
  limit 800;
$$;
grant execute on function public.world_view(double precision, double precision, double precision, double precision) to anon, authenticated;

-- [R2] chi abita nel mio stesso edificio (entro 25 m): per la pagina della casa
create or replace function public.world_coresidents() returns table(user_id uuid, nick text, status text, seen_at timestamptz, ally boolean)
language sql stable security definer set search_path = public as $$
  select o.user_id, public.w_nick(o.user_id), o.status, (select seen_at from public.profili_pubblici where user_id = o.user_id),
         public.w_are_allies(auth.uid(), o.user_id)
  from public.world_homes m join public.world_homes o on o.user_id <> m.user_id
   and (o.building_id = m.building_id or public.w_km(o.lat,o.lon,m.lat,m.lon) < 0.025)
  where m.user_id = auth.uid() and o.status in ('home','pending')
  order by o.status, 2;
$$;
grant execute on function public.world_coresidents() to authenticated;
notify pgrst, 'reload schema';
