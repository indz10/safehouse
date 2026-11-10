-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 002 — stesse formule ovunque (Fase 6c)
-- La % "di tenere" che l'app mostra viene da world_threats (w_threats_of), che conta anche il bonus
-- dei coinquilini (w_condo_bonus, +3 per livello delle difese del condominio) sulla casa vera.
-- Anche w_home_held (Punteggio Superstite, taglie) lo conta. Ma il RISULTATO vero dell'orda
-- (world_raid_status: tenuta/sfondata e premi) e la mappa degli assalti (world_raid_view) no.
-- Qui lo aggiungo anche lì: stessa difesa in tutti i calcoli (la formula è in docs/FORMULE.md).
-- world_my_defense (riquadro "Perché"): totale della casa vera con il bonus del condominio e
-- forza dell'orda standard come in world_threats (30 + 2×livello … +49).
-- w_threats_of (world_threats): moltiplicatori con 4 decimali invece di 2, così il conto dell'app
-- (thrCalc, anche nel simulatore) dà esattamente gli stessi numeri del server.
-- Non tocca tabelle né dati. Si può eseguire più volte.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.world_raid_status()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); lvl int; bon int; cb int; res json; held int; tot int; matt int; bounty int;
begin
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me); lvl := public.w_level(w.lifetime); bon := public.w_upower(me, pid); cb := public.w_condo_bonus(me);
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack3(pid,x.building_id,lvl),'power',public.w_power3(x.level,bon + (case when x.home then cb else 0 end),x.home),
           'held',public.w_power3(x.level,bon + (case when x.home then cb else 0 end),x.home) >= public.w_attack3(pid,x.building_id,lvl))),'[]'::json),
         count(*) filter (where public.w_power3(x.level,bon + (case when x.home then cb else 0 end),x.home) >= public.w_attack3(pid,x.building_id,lvl)), count(*),
         coalesce(sum(case when public.w_power3(x.level,bon + (case when x.home then cb else 0 end),x.home) >= public.w_attack3(pid,x.building_id,lvl) then 8 + 4*x.level else 2 end),0)
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
end $function$;

CREATE OR REPLACE FUNCTION public.world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision)
 RETURNS TABLE(building_id text, lat double precision, lon double precision, held boolean, kind text, mine boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    public.w_power3(x.level, public.w_upower(x.who, s.id) + (case when x.kind = 'home' then public.w_condo_bonus(x.who) else 0 end), x.kind = 'home') >= public.w_attack3(s.id, x.building_id, public.w_lvl_of(x.who)),
    x.kind, x.who = auth.uid()
  from houses x, s
  limit 600;
$function$;

CREATE OR REPLACE FUNCTION public.world_my_defense()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'houses', coalesce((select json_agg(json_build_object('bid', hs.bid, 'home', hs.home, 'level', hs.lvl,
        'total', 45 + 12*greatest(hs.lvl,1) + (case when hs.home then 5 + b.cb else 0 end) + b.prep + 2*b.rs + least(20,5*b.helps) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus)) from hs), '[]'::json))
  from b;
$function$;

CREATE OR REPLACE FUNCTION public.w_threats_of(p_user uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; tr numeric; dt int; amin int; amax int;
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
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 + public.w_condo_bonus(p_user) else 0 end) + up;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up, 'condo', case when h.home then public.w_condo_bonus(p_user) else 0 end,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,4),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $function$;

-- controllo: deve dire "4 funzioni aggiornate"
select (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
          and p.proname in ('world_raid_status','world_raid_view','world_my_defense') and p.prosrc like '%w_condo_bonus%')
    + (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'w_threats_of' and p.prosrc like '%round(mw,4)%') || ' funzioni aggiornate' as esito;
