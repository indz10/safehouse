-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 006 — presidi veri condivisi (Fase 9b)
-- Presidi = luoghi pubblici veri presi da OpenStreetMap (parchi, piazze, stazioni, scuole, biblioteche, municipi…).
-- 1) Chi ha una casa (vera o comprata) entro 1 km può occupare un presidio libero (massimo 3 a testa).
-- 2) Ogni orda (9:00 e 21:00) attacca anche i presidi: attacco da 50 a 99, difesa 55 + 12 per ogni guardia
--    (massimo 5: chi lo tiene e i suoi alleati/coinquilini, "Fai la guardia" prima dell'orda). Se cade torna libero.
-- 3) Ogni presidio tenuto dà +3 di difesa a TUTTE le case entro 500 m (anche dei vicini), massimo +6 a casa.
--    Entra nella difesa vera (w_home_held, world_raid_status, world_raid_view, w_threats_of, world_my_defense).
-- 4) Ogni ora un lavoro programmato chiude l'ultima orda sui presidi (lo fa anche l'app quando li guarda).
-- Non cancella dati. Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_presidi(
  id text primary key,                         -- 'osm:n123' / 'osm:w123' / 'osm:r123'
  name text not null,
  kind text not null,
  lat double precision not null,
  lon double precision not null,
  holder uuid,
  held_since timestamptz,
  record int not null default 0,               -- orde tenute di fila da chi lo tiene ora
  ultimo_slot text,                            -- ultima orda già conteggiata
  perso_da uuid,
  perso_il timestamptz,
  created_by uuid,
  created_at timestamptz not null default now());
create index if not exists world_presidi_lat on public.world_presidi(lat, lon);
create index if not exists world_presidi_holder on public.world_presidi(holder);
create table if not exists public.world_presidi_tenute(
  id bigserial primary key,
  presidio_id text not null references public.world_presidi(id) on delete cascade,
  user_id uuid not null,
  dal timestamptz not null default now(),
  al timestamptz);
create index if not exists world_presidi_tenute_p on public.world_presidi_tenute(presidio_id, dal);
create table if not exists public.world_presidi_guardie(
  presidio_id text not null references public.world_presidi(id) on delete cascade,
  user_id uuid not null,
  slot_id text not null,
  created_at timestamptz not null default now(),
  primary key (presidio_id, slot_id, user_id));
-- nessuno li tocca direttamente: solo con le funzioni qui sotto
alter table public.world_presidi enable row level security;
alter table public.world_presidi_tenute enable row level security;
alter table public.world_presidi_guardie enable row level security;

-- ora di un'orda dal suo nome ('2026-11-11-21' → 11/11/2026 21:00 ora italiana)
create or replace function public.w_slot_t(p_slot text) returns timestamptz
language sql stable as $$
  select (to_timestamp(p_slot, 'YYYY-MM-DD-HH24')::timestamp) at time zone 'Europe/Rome';
$$;

-- ha una casa (vera o comprata) entro p_km?
create or replace function public.w_pres_near(p_user uuid, p_lat double precision, p_lon double precision, p_km double precision) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.world_homes h where h.user_id = p_user and h.lat between p_lat - p_km/100 and p_lat + p_km/100 and public.w_km(h.lat, h.lon, p_lat, p_lon) <= p_km)
      or exists (select 1 from public.world_buildings b where b.owner = p_user and b.lat between p_lat - p_km/100 and p_lat + p_km/100 and public.w_km(b.lat, b.lon, p_lat, p_lon) <= p_km);
$$;

-- bonus dei presidi per una casa in un'orda: +3 per ogni presidio tenuto entro 500 m, massimo +6
create or replace function public.w_pres_bonus(p_bid text, p_slot text) returns integer
language sql stable security definer set search_path = public as $$
  with c as (select coalesce((select b.lat from public.world_buildings b where b.building_id = p_bid), (select h.lat from public.world_homes h where h.building_id = p_bid limit 1)) as lat,
                    coalesce((select b.lon from public.world_buildings b where b.building_id = p_bid), (select h.lon from public.world_homes h where h.building_id = p_bid limit 1)) as lon,
                    public.w_slot_t(p_slot) as t)
  select least(6, 3 * count(*))::int
  from c join public.world_presidi p on p.lat between c.lat - 0.005 and c.lat + 0.005 and public.w_km(c.lat, c.lon, p.lat, p.lon) <= 0.5
  where exists (select 1 from public.world_presidi_tenute t where t.presidio_id = p.id and t.dal < c.t and (t.al is null or t.al >= c.t));
$$;

-- l'orda sul presidio: attacco da 50 a 99 (diverso per ogni orda e presidio), difesa 55 + 12 per guardia (max 5)
create or replace function public.w_pres_attack(p_slot text, p_id text) returns integer
language sql immutable as $$
  select 50 + get_byte(decode(md5(p_slot || 'presidio' || p_id), 'hex'), 0) % 50;
$$;
create or replace function public.w_pres_def(p_id text, p_slot text) returns integer
language sql stable security definer set search_path = public as $$
  select 55 + 12 * least(5, (select count(*) from public.world_presidi_guardie g where g.presidio_id = p_id and g.slot_id = p_slot))::int;
$$;

-- chiude l'ultima orda sui presidi: chi tiene sale di record, chi cade torna libero
create or replace function public.w_pres_tick() returns integer
language plpgsql security definer set search_path = public as $$
declare pt timestamptz := public.w_prev_slot(now()); pid text := public.w_slot_id(public.w_prev_slot(now())); p record; n int := 0;
begin
  for p in select * from public.world_presidi where holder is not null and coalesce(ultimo_slot, '') < pid and held_since < pt for update skip locked loop
    if public.w_pres_def(p.id, pid) >= public.w_pres_attack(pid, p.id) then
      update public.world_presidi set ultimo_slot = pid, record = record + 1 where id = p.id;
    else
      update public.world_presidi set ultimo_slot = pid, holder = null, held_since = null, record = 0, perso_da = p.holder, perso_il = pt where id = p.id;
      update public.world_presidi_tenute set al = pt where presidio_id = p.id and al is null;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- l'app manda i luoghi pubblici trovati su OpenStreetMap vicino alle case di chi guarda (massimo 40 per volta)
create or replace function public.world_presidi_seed(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); e jsonb; n int := 0; c int; la double precision; lo double precision;
begin
  if me is null or jsonb_typeof(p) is distinct from 'array' then return json_build_object('ok', false, 'nuovi', 0); end if;
  for e in select value from jsonb_array_elements(p) limit 40 loop
    begin la := (e->>'lat')::double precision; lo := (e->>'lon')::double precision; exception when others then continue; end;
    if la is null or lo is null or coalesce(e->>'id', '') !~ '^osm:[nwr][0-9]{1,12}$'
       or coalesce(e->>'kind', '') not in ('parco','piazza','stazione','municipio','biblioteca','scuola','ospedale','pompieri','polizia','chiesa','centro','sport')
       or length(trim(coalesce(e->>'name', ''))) not between 2 and 80
       or not public.w_pres_near(me, la, lo, 2.5) then continue; end if;
    insert into public.world_presidi(id, name, kind, lat, lon, created_by)
    values (e->>'id', trim(e->>'name'), e->>'kind', la, lo, me) on conflict (id) do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return json_build_object('ok', true, 'nuovi', n);
end $$;

-- i presidi in un riquadro della mappa (anche senza account: solo da guardare)
create or replace function public.world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); res json; mine int := 0;
begin
  perform public.w_pres_tick();
  if me is not null then select count(*) into mine from public.world_presidi where holder = me; end if;
  select coalesce(json_agg(json_build_object(
      'id', p.id, 'name', p.name, 'kind', p.kind, 'lat', p.lat, 'lon', p.lon,
      'stato', case when p.holder is null then 'libero' when p.holder = me then 'mio' when me is not null and public.w_are_allies(me, p.holder) then 'alleato' else 'altro' end,
      'nick', case when p.holder is not null and me is not null and public.w_home_known(me, p.holder) then (select pp.nick from public.profili_pubblici pp where pp.user_id = p.holder) end,
      'record', p.record, 'dal', p.held_since,
      'perso', p.holder is null and p.perso_il is not null and p.perso_il > now() - interval '24 hours',
      'guardie', (select count(*) from public.world_presidi_guardie g where g.presidio_id = p.id and g.slot_id = nid),
      'io_guardia', me is not null and exists (select 1 from public.world_presidi_guardie g where g.presidio_id = p.id and g.slot_id = nid and g.user_id = me),
      'difesa', public.w_pres_def(p.id, nid),
      'vicino', me is not null and public.w_pres_near(me, p.lat, p.lon, 1.0))), '[]'::json)
    into res
    from (select * from public.world_presidi where lat between p_minlat and p_maxlat and lon between p_minlon and p_maxlon order by id limit 150) p;
  return json_build_object('presidi', res, 'miei', mine, 'max', 3, 'slot', nid, 'attacco_min', 50, 'attacco_max', 99);
end $$;

-- occupa un presidio libero: serve una tua casa entro 1 km, massimo 3 presidi
create or replace function public.world_presidio_occupa(p_id text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.world_presidi;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per occupare un presidio'); end if;
  perform public.w_pres_tick();
  select * into p from public.world_presidi where id = p_id for update;
  if p.id is null then return json_build_object('ok', false, 'msg', 'Presidio non trovato'); end if;
  if p.holder is not null then return json_build_object('ok', false, 'msg', case when p.holder = me then 'Lo tieni già tu' else 'È già tenuto: si libera se l''orda lo fa cadere' end); end if;
  if not public.w_pres_near(me, p.lat, p.lon, 1.0) then return json_build_object('ok', false, 'msg', 'Serve una tua casa entro 1 km dal presidio'); end if;
  if (select count(*) from public.world_presidi where holder = me) >= 3 then return json_build_object('ok', false, 'msg', 'Tieni già 3 presidi: lasciane uno per occuparne un altro'); end if;
  update public.world_presidi set holder = me, held_since = now(), record = 0, ultimo_slot = public.w_slot_id(public.w_prev_slot(now())) where id = p_id;
  insert into public.world_presidi_tenute(presidio_id, user_id, dal) values (p_id, me, now());
  return json_build_object('ok', true, 'msg', 'Presidio occupato! Dalla prossima orda dà +3 di difesa alle case entro 500 m');
end $$;

-- fai la guardia per la prossima orda: chi lo tiene, i suoi alleati e coinquilini
create or replace function public.world_presidio_guardia(p_id text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.world_presidi; nid text := public.w_slot_id(public.w_next_slot(now())); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per fare la guardia'); end if;
  perform public.w_pres_tick();
  select * into p from public.world_presidi where id = p_id;
  if p.id is null or p.holder is null then return json_build_object('ok', false, 'msg', 'Il presidio è libero: occupalo prima'); end if;
  if p.holder <> me and not public.w_are_allies(me, p.holder) then return json_build_object('ok', false, 'msg', 'Possono fare la guardia solo chi lo tiene e i suoi alleati'); end if;
  insert into public.world_presidi_guardie(presidio_id, user_id, slot_id) values (p_id, me, nid) on conflict do nothing;
  n := (select count(*) from public.world_presidi_guardie where presidio_id = p_id and slot_id = nid);
  return json_build_object('ok', true, 'guardie', n, 'difesa', public.w_pres_def(p_id, nid), 'msg', 'Sei di guardia per la prossima orda');
end $$;

-- lascia un presidio (torna libero subito)
create or replace function public.world_presidio_lascia(p_id text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  update public.world_presidi set holder = null, held_since = null, record = 0 where id = p_id and holder = me;
  if not found then return json_build_object('ok', false, 'msg', 'Non lo tieni tu'); end if;
  update public.world_presidi_tenute set al = now() where presidio_id = p_id and user_id = me and al is null;
  return json_build_object('ok', true, 'msg', 'Presidio lasciato');
end $$;

revoke all on function public.w_pres_tick() from public, anon, authenticated;
revoke all on function public.world_presidi_seed(jsonb) from public, anon;
grant execute on function public.world_presidi_seed(jsonb) to authenticated;
revoke all on function public.world_presidi_list(double precision, double precision, double precision, double precision) from public;
grant execute on function public.world_presidi_list(double precision, double precision, double precision, double precision) to anon, authenticated;
revoke all on function public.world_presidio_occupa(text) from public, anon;
grant execute on function public.world_presidio_occupa(text) to authenticated;
revoke all on function public.world_presidio_guardia(text) from public, anon;
grant execute on function public.world_presidio_guardia(text) to authenticated;
revoke all on function public.world_presidio_lascia(text) from public, anon;
grant execute on function public.world_presidio_lascia(text) to authenticated;

-- la difesa vera delle case conta anche i presidi vicini (stesse funzioni di prima + w_pres_bonus)
create or replace function public.w_home_held(p_user uuid, p_slot text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.w_power3(coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), public.w_upower(p_user,p_slot) + public.w_condo_bonus(p_user) + public.w_pres_bonus(h.building_id,p_slot), true)
         >= public.w_attack3(p_slot, h.building_id, public.w_lvl_of(p_user))
  from public.world_homes h where h.user_id = p_user;
$$;

create or replace function public.w_threats_of(p_user uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; tr numeric; dt int; amin int; amax int; pb int;
begin
  if p_user is null then return '[]'::json; end if;
  wl := least(greatest(public.w_lvl_of(p_user),1),30); up := public.w_upower(p_user, nid); hh := coalesce(nullif(right(nid,2),'')::int,21);
  for h in
    select hm.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = hm.building_id),1) as lvl, hm.lat, hm.lon from public.world_homes hm where hm.user_id = p_user
    union all select bb.building_id, false, bb.level, bb.lat, bb.lon from public.world_buildings bb where bb.owner = p_user
  loop
    s := public.w_slope(h.bid); ev := public.w_wxev(h.bid, nid); mw := public.w_zm('walker', s, ev, hh); tr := 1 - 0.06*least(public.w_def(h.bid,'trappole'),3);
    select coalesce(json_agg(json_build_object('k', t.k, 'base', round(t.base*(1+0.03*wl),4), 'mod', round(public.w_zm(t.k,s,ev,hh),4),
             'dk', t.dk, 'dl', public.w_def(h.bid,t.dk), 'dk2', t.dk2, 'dl2', public.w_def(h.bid,t.dk2),
             'p', round(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))*(1-0.15*least(public.w_def(h.bid,t.dk2),3)),1)) order by t.minl), '[]'::json),
           coalesce(sum(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))*(1-0.15*least(public.w_def(h.bid,t.dk2),3))),0)
      into sp, ssum from public.w_ztypes() t where wl >= t.minl;
    pb := public.w_pres_bonus(h.bid, nid);
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 + public.w_condo_bonus(p_user) else 0 end) + up + pb;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up, 'pres', pb, 'condo', case when h.home then public.w_condo_bonus(p_user) else 0 end,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,4),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;

create or replace function public.world_my_defense() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (select auth.uid() as u), n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  pr as (select w.user_id, coalesce((w.caps->>('prep:'||n.id))::int,0) = 1 as ok from public.world_wallet w, n),
  c as (select
      (case when coalesce((select ok from pr, me where pr.user_id = me.u), false) then 15 else 0 end) as prep,
      least(5, coalesce((select (caps->>'rs')::int from public.world_wallet, me where user_id = me.u),0)) as rs,
      (select count(*) from public.world_help_given, n, me where target = me.u and slot_id = n.id)::int as helps,
      (select count(*) from public.world_shields, n, me where target = me.u and slot_id = n.id)::int as sh,
      (select count(*) from me, public.w_allies_of(me.u) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from me, public.w_allies_of(me.u) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(me.u, a.u))::int as cq,
      (select count(*) from public.world_attack_given, n, me where target = me.u and slot_id = n.id)::int as atk,
      (select count(*) from public.world_curses, n, me where target = me.u and slot_id = n.id and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses, n, me where target = me.u and slot_id = n.id and kind = 'sabotaggio')::int as sab,
      public.w_lvl_of(auth.uid()) as wl),
  b as (select c.*, least(25, least(16, 8*atk) + least(10, 5*fog) + (case when sab > 0 and prep > 0 then 15 else 0 end)) as malus,
      30 + 2 * least(greatest(wl,1),30) as amin, public.w_condo_bonus(auth.uid()) as cb from c),
  hs as (
    select h.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = h.building_id),1) as lvl from public.world_homes h, me where h.user_id = me.u
    union all select bb.building_id, false, bb.level from public.world_buildings bb, me where bb.owner = me.u)
  select json_build_object(
    'prep', b.prep, 'realshield', b.rs, 'realshield_pts', 2*b.rs, 'helps', b.helps, 'helps_pts', least(20,5*b.helps),
    'shields', b.sh, 'shields_pts', least(10,5*b.sh), 'squad', b.ap, 'squad_pts', case when b.ap >= 3 then 5 else 0 end,
    'coinq', b.cq, 'coinq_pts', least(9,3*b.cq), 'attacks', b.atk, 'fog', b.fog, 'sab', b.sab, 'malus', b.malus,
    'bonus', b.prep + 2*b.rs + least(20,5*b.helps) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus,
    'attack_min', b.amin, 'attack_max', b.amin + 49, 'condo', b.cb, 'wlevel', b.wl,
    'houses', coalesce((select json_agg(json_build_object('bid', hs.bid, 'home', hs.home, 'level', hs.lvl, 'pres', public.w_pres_bonus(hs.bid, (select id from n)),
        'total', 45 + 12*greatest(hs.lvl,1) + (case when hs.home then 5 + b.cb else 0 end) + public.w_pres_bonus(hs.bid, (select id from n)) + b.prep + 2*b.rs + least(20,5*b.helps) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus)) from hs), '[]'::json))
  from b;
$$;

create or replace function public.world_raid_status() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); lvl int; bon int; cb int; res json; held int; tot int; matt int; bounty int;
begin
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me); lvl := public.w_level(w.lifetime); bon := public.w_upower(me, pid); cb := public.w_condo_bonus(me);
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack3(pid,x.building_id,lvl),'power',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home),
           'held',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl))),'[]'::json),
         count(*) filter (where public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl)), count(*),
         coalesce(sum(case when public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl) then 8 + 4*x.level else 2 end),0)
    into res, held, tot, matt
    from public.w_raid_houses(me, pt) x;
  select 25 * count(*) into bounty from public.world_attack_given a where a.attacker = me and a.slot_id = pid and public.w_home_held(a.target, pid) = false;
  return json_build_object('next_at', nt, 'next_id', nid, 'prev_at', pt, 'prev_id', pid, 'wlevel', lvl,
    'prepared', coalesce((w.caps->>('prep:'||nid))::int,0) = 1, 'prev_prepared', coalesce((w.caps->>('prep:'||pid))::int,0) = 1,
    'claimed', coalesce((w.caps->>('raid:'||pid))::int,0) = 1, 'houses', res, 'held', held, 'total', tot,
    'mattoni', matt + coalesce(bounty,0), 'bounty', coalesce(bounty,0),
    'asked', exists (select 1 from public.world_help where user_id = me and slot_id = nid),
    'helpers', (select count(*) from public.world_help_given where target = me and slot_id = nid),
    'attacks_in', (select count(*) from public.world_attack_given where target = me and slot_id = nid),
    'next_bonus', public.w_upower(me, nid));
end $$;

create or replace function public.world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) RETURNS TABLE(building_id text, lat double precision, lon double precision, held boolean, kind text, mine boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    public.w_power3(x.level, public.w_upower(x.who, s.id) + (case when x.kind = 'home' then public.w_condo_bonus(x.who) else 0 end) + public.w_pres_bonus(x.building_id, s.id), x.kind = 'home') >= public.w_attack3(s.id, x.building_id, public.w_lvl_of(x.who)),
    x.kind, x.who = auth.uid()
  from houses x, s
  limit 600;
$$;

select cron.unschedule('zsh-presidi') where exists (select 1 from cron.job where jobname = 'zsh-presidi');
select cron.schedule('zsh-presidi', '3 * * * *', $$ select public.w_pres_tick(); $$);

-- controllo: deve dire "presidi pronti"
select case when to_regclass('public.world_presidi') is not null and exists (select 1 from pg_proc where proname = 'world_presidio_occupa')
             and exists (select 1 from pg_proc where proname = 'w_threats_of' and prosrc like '%w_pres_bonus%')
             and exists (select 1 from cron.job where jobname = 'zsh-presidi')
       then 'presidi pronti' else 'qualcosa manca' end as esito;
