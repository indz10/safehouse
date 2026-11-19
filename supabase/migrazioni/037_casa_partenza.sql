-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 037 — 🏠 DA QUALE CASA PARTI (18/11)
-- Prima di mandare il superstite (spedizioni, casse), i rinforzi, gli aiuti e gli attacchi l'app chiede da quale
-- delle tue case partire (world_partenza_set): distanza, tempo di viaggio, carburante e portata si calcolano da quella.
-- La scelta vale 30 minuti (poi si torna alla casa più vicina, come prima). Funzioni toccate, stessa firma:
-- w_dist_pt (attacchi, rinforzi, raduni), w_sped_km (spedizioni e casse), w_dist_km (aiuti per l'orda).
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_partenza(p_user uuid) returns table(lat double precision, lon double precision)
language sql stable security definer set search_path to 'public' as $$
  with c as (select caps->'partenza' as p from public.world_wallet where user_id = p_user)
  select x.lat, x.lon from c, (
    select h.building_id as bid, h.lat, h.lon from public.world_homes h where h.user_id = p_user
    union all select b.building_id, b.lat, b.lon from public.world_buildings b where b.owner = p_user) x
  where c.p is not null and x.bid = c.p->>'bid' and (c.p->>'at')::timestamptz > now() - interval '30 minutes'
  limit 1; $$;

create or replace function public.w_dist_pt(p_user uuid, p_lat double precision, p_lon double precision) returns double precision
language sql stable security definer set search_path to 'public' as $$
  select coalesce((select public.w_km(q.lat, q.lon, p_lat, p_lon) from public.w_partenza(p_user) q),
    (select min(public.w_km(x.lat, x.lon, p_lat, p_lon)) from (
      select lat, lon from public.world_homes where user_id = p_user union all select lat, lon from public.world_buildings where owner = p_user) x)); $$;

create or replace function public.w_sped_km(p_user uuid, p_lat double precision, p_lon double precision) returns numeric
language sql stable security definer set search_path to 'public' as $$
  select round(public.w_dist_pt(p_user, p_lat, p_lon)::numeric, 2); $$;

create or replace function public.w_dist_km(a uuid, b uuid) returns double precision
language sql stable security definer set search_path to 'public' as $$
  with ca as (select lat, lon from public.w_partenza(a)
              union all select lat, lon from public.world_homes where user_id = a and not exists (select 1 from public.w_partenza(a))
              union all select lat, lon from public.world_buildings where owner = a and not exists (select 1 from public.w_partenza(a))),
       cb as (select lat, lon from public.world_homes where user_id = b union all select lat, lon from public.world_buildings where owner = b)
  select min(public.w_km(ca.lat, ca.lon, cb.lat, cb.lon)) from ca, cb; $$;

create or replace function public.world_partenza_set(p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_wallet(me);
  if coalesce(p_bid, '') = '' then
    update public.world_wallet set caps = caps - 'partenza' where user_id = me;
    return json_build_object('ok', true, 'msg', '🏠 Partirai dalla casa più vicina');
  end if;
  if not exists (select 1 from public.world_homes where user_id = me and building_id = p_bid)
     and not exists (select 1 from public.world_buildings where owner = me and building_id = p_bid) then
    return json_build_object('ok', false, 'msg', 'Non è una tua casa'); end if;
  update public.world_wallet set caps = jsonb_set(caps, '{partenza}', jsonb_build_object('bid', p_bid, 'at', now())) where user_id = me;
  return json_build_object('ok', true, 'msg', '🏠 Parti da questa casa');
end $$;

revoke all on function public.w_partenza(uuid) from public, anon, authenticated;
revoke all on function public.world_partenza_set(text) from public, anon;
grant execute on function public.world_partenza_set(text) to authenticated;

-- controllo: deve dire "partenza pronta"
select case when exists (select 1 from pg_proc where proname = 'world_partenza_set') then 'partenza pronta' else 'qualcosa manca' end as esito;
