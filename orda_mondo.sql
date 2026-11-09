-- =========================================================
-- ZombieSafeHouse · L'ORDA DEL MONDO
-- Ogni giorno alle 9:00 e alle 21:00 (ora italiana) un'orda
-- attacca tutte le case del mondo unico. L'esito lo calcola il
-- server, uguale per tutti: livello della casa + preparazione.
-- =========================================================

-- ultima orda passata e prossima orda
create or replace function public.w_prev_slot(p_ts timestamptz) returns timestamptz language sql stable as $$
  select max(t) from (
    select ((date_trunc('day', p_ts at time zone 'Europe/Rome') + d * interval '1 day' + h * interval '1 hour') at time zone 'Europe/Rome') as t
    from (values (-1),(0)) dd(d), (values (9),(21)) hh(h)) x
  where t <= p_ts;
$$;
create or replace function public.w_next_slot(p_ts timestamptz) returns timestamptz language sql stable as $$
  select min(t) from (
    select ((date_trunc('day', p_ts at time zone 'Europe/Rome') + d * interval '1 day' + h * interval '1 hour') at time zone 'Europe/Rome') as t
    from (values (0),(1)) dd(d), (values (9),(21)) hh(h)) x
  where t > p_ts;
$$;
create or replace function public.w_slot_id(p_t timestamptz) returns text language sql stable as $$
  select to_char(p_t at time zone 'Europe/Rome', 'YYYY-MM-DD"-"HH24');
$$;

-- esito di una casa: forza dell'orda (diversa per ogni casa e ogni orda) contro difesa
create or replace function public.w_attack(p_slot text, p_bid text) returns int language sql immutable as $$
  select 40 + (get_byte(decode(md5(p_slot || p_bid), 'hex'), 0) % 60);
$$;
create or replace function public.w_power(p_level int, p_prep boolean, p_home boolean) returns int language sql immutable as $$
  select 45 + 12 * greatest(p_level,1) + (case when p_prep then 15 else 0 end) + (case when p_home then 5 else 0 end);
$$;

-- le mie case colpite dall'ultima orda (casa + comprate prima dell'orda)
create or replace function public.w_raid_houses(p_user uuid, p_slot_t timestamptz) returns table(building_id text, lat double precision, lon double precision, level int, home boolean)
language sql stable security definer set search_path = public as $$
  select h.building_id, h.lat, h.lon, coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), true
    from public.world_homes h where h.user_id = p_user and h.first_at <= p_slot_t
  union all
  select b.building_id, b.lat, b.lon, b.level, false from public.world_buildings b
    where b.owner = p_user and b.bought_at is not null and b.bought_at <= p_slot_t;
$$;

create or replace function public.world_raid_status() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); prep_prev boolean; res json; held int; tot int; matt int;
begin
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me);
  prep_prev := coalesce((w.caps->>('prep:'||pid))::int,0) = 1;
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack(pid,x.building_id),'power',public.w_power(x.level,prep_prev,x.home),
           'held',public.w_power(x.level,prep_prev,x.home) >= public.w_attack(pid,x.building_id))),'[]'::json),
         count(*) filter (where public.w_power(x.level,prep_prev,x.home) >= public.w_attack(pid,x.building_id)), count(*),
         coalesce(sum(case when public.w_power(x.level,prep_prev,x.home) >= public.w_attack(pid,x.building_id) then 8 + 4*x.level else 2 end),0)
    into res, held, tot, matt
    from public.w_raid_houses(me, pt) x;
  return json_build_object('next_at', nt, 'next_id', nid, 'prev_at', pt, 'prev_id', pid,
    'prepared', coalesce((w.caps->>('prep:'||nid))::int,0) = 1, 'prev_prepared', prep_prev,
    'claimed', coalesce((w.caps->>('raid:'||pid))::int,0) = 1, 'houses', res, 'held', held, 'total', tot, 'mattoni', matt);
end $$;

-- prepararsi alla prossima orda (+15 difesa a tutte le tue case)
create or replace function public.world_prepare() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  perform public.w_wallet(me);
  update public.world_wallet set caps = jsonb_set(caps, array['prep:'||nid], '1') where user_id = me;
  return json_build_object('ok',true,'msg','Case preparate per la prossima orda','next_id',nid);
end $$;

-- riscattare i premi dell'ultima orda (una volta, prima della successiva)
create or replace function public.world_raid_claim() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; s json; pid text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  s := public.world_raid_status(); pid := s->>'prev_id';
  w := public.w_wallet(me);
  if coalesce((w.caps->>('raid:'||pid))::int,0) = 1 then return json_build_object('ok',false,'msg','Premi di questa orda già riscattati'); end if;
  if (s->>'total')::int = 0 then return json_build_object('ok',false,'msg','Nessuna tua casa era nel mondo durante questa orda'); end if;
  update public.world_wallet set caps = jsonb_set(caps, array['raid:'||pid], '1') where user_id = me;
  perform public.w_pay(me, (s->>'mattoni')::int, 'Orda del mondo: premi');
  update public.world_log set seen = true where user_id = me and reason = 'Orda del mondo: premi' and not seen;
  return json_build_object('ok',true,'held',(s->>'held')::int,'total',(s->>'total')::int,'mattoni',(s->>'mattoni')::int);
end $$;

-- l'assalto visto da tutti sulla mappa: esito dell'ultima orda per le case della zona
create or replace function public.world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision)
returns table(building_id text, lat double precision, lon double precision, held boolean, kind text, mine boolean)
language sql stable security definer set search_path = public as $$
  with s as (select public.w_prev_slot(now()) as t, public.w_slot_id(public.w_prev_slot(now())) as id),
  houses as (
    select b.building_id, b.lat, b.lon, b.level, 'owned'::text as kind, b.owner as who
      from public.world_buildings b, s
     where b.owner is not null and b.bought_at <= s.t
       and b.lat between p_minlat and p_maxlat and b.lon between p_minlon and p_maxlon
    union all
    select h.building_id, h.lat, h.lon, coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), 'home', h.user_id
      from public.world_homes h, s
     where h.first_at <= s.t and h.lat between p_minlat and p_maxlat and h.lon between p_minlon and p_maxlon)
  select x.building_id, x.lat, x.lon,
    public.w_power(x.level, coalesce((select (w.caps->>('prep:'||s.id))::int from public.world_wallet w where w.user_id = x.who),0) = 1, x.kind = 'home') >= public.w_attack(s.id, x.building_id),
    x.kind, x.who = auth.uid()
  from houses x, s
  limit 600;
$$;

revoke all on function public.w_raid_houses(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.world_raid_status() to anon, authenticated;
grant execute on function public.world_prepare() to authenticated;
grant execute on function public.world_raid_claim() to authenticated;
grant execute on function public.world_raid_view(double precision,double precision,double precision,double precision) to anon, authenticated;
