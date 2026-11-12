-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 009 — mezzi, distanza e assalti dei rivali (decisioni di Alessandro, 11/11)
-- 1) MEZZO del giocatore: a piedi / bici / moto / auto / fuoristrada. Si parte da quello della valutazione
--    (al massimo l'auto) e si può comprare in Bottega: moto 300, auto 600, fuoristrada 1.200 Mattoni.
--      mezzo        portata  velocità  rinforzi  forza assalto
--      a piedi       2 km     5 km/h     +4        ×0,8
--      bici          5 km    15 km/h     +5        ×0,9
--      moto         12 km    40 km/h     +6        ×1
--      auto         20 km    50 km/h     +8        ×1,2
--      fuoristrada  20 km    45 km/h    +10        ×1,3
--    Dotazioni della valutazione (kit medico, radio, scorte di cibo): +1 ai rinforzi ciascuna (max +3).
-- 2) DISTANZA: aiuti e assalti solo verso chi ha una casa entro la portata del tuo mezzo (mai oltre 20 km).
--    I dispetti (nebbia, sabotaggio) restano senza limite di distanza.
-- 3) VIAGGIO: rinforzi e orde arrivano dopo distanza/velocità; se arrivano dopo l'orda valgono per quella dopo.
-- 4) FORZA DEGLI ASSALTI: (6 + 0,5 × livello di chi attacca) × mezzo, meno 10% per ogni livello di barricate,
--    recinto e fossato della casa attaccata (al massimo −60%), minimo 3. Tetto: −30 dalle orde dei rivali,
--    −35 di malus in tutto (prima −16 e −25). Rinforzi: tetto +24 (prima +20).
-- Le righe già esistenti tengono i valori di prima (rinforzo +5, orda −8). Si può eseguire più volte.
-- =====================================================================

alter table public.world_help_given add column if not exists pts int not null default 5;
alter table public.world_attack_given add column if not exists pts int not null default 8;

create or replace function public.w_mz_rank(p text) returns int language sql immutable as $$
  select case p when 'bici' then 1 when 'moto' then 2 when 'auto' then 3 when 'fuori' then 4 else 0 end; $$;
create or replace function public.w_mz_range(p text) returns int language sql immutable as $$
  select case p when 'bici' then 5 when 'moto' then 12 when 'auto' then 20 when 'fuori' then 20 else 2 end; $$;
create or replace function public.w_mz_speed(p text) returns numeric language sql immutable as $$
  select case p when 'bici' then 15 when 'moto' then 40 when 'auto' then 50 when 'fuori' then 45 else 5 end::numeric; $$;
create or replace function public.w_mz_help(p text) returns int language sql immutable as $$
  select case p when 'bici' then 5 when 'moto' then 6 when 'auto' then 8 when 'fuori' then 10 else 4 end; $$;
create or replace function public.w_mz_atk(p text) returns numeric language sql immutable as $$
  select case p when 'bici' then 0.9 when 'moto' then 1.0 when 'auto' then 1.2 when 'fuori' then 1.3 else 0.8 end::numeric; $$;

-- il mezzo che usa davvero: il migliore tra quello della valutazione e quello comprato
create or replace function public.w_mezzo(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  with w as (select coalesce(caps->>'mezzo_vero','piedi') as v, coalesce(caps->>'mezzo_comprato','piedi') as c from public.world_wallet where user_id = p_user)
  select coalesce((select case when public.w_mz_rank(c) > public.w_mz_rank(v) then c else v end from w), 'piedi');
$$;
create or replace function public.w_dot(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select least(3, greatest(0, coalesce((select (caps->>'dotazioni')::int from public.world_wallet where user_id = p_user), 0)));
$$;
-- distanza tra due giocatori: le loro case più vicine (casa vera e case comprate)
create or replace function public.w_dist_km(a uuid, b uuid) returns double precision
language sql stable security definer set search_path = public as $$
  with ca as (select lat, lon from public.world_homes where user_id = a union all select lat, lon from public.world_buildings where owner = a),
       cb as (select lat, lon from public.world_homes where user_id = b union all select lat, lon from public.world_buildings where owner = b)
  select min(public.w_km(ca.lat, ca.lon, cb.lat, cb.lon)) from ca, cb;
$$;
-- forza di un'orda di "a" contro la casa vera di "b"
create or replace function public.w_atk_pts(a uuid, b uuid) returns int
language sql stable security definer set search_path = public as $$
  with h as (select building_id from public.world_homes where user_id = b limit 1)
  select greatest(3, round((6 + 0.5 * public.w_lvl_of(a)) * public.w_mz_atk(public.w_mezzo(a))
           * (1 - least(0.6, 0.1 * coalesce((select public.w_def(h.building_id,'barricate') + public.w_def(h.building_id,'recinto') + public.w_def(h.building_id,'fossato') from h), 0)))))::int;
$$;

-- il mio mezzo (per l'app)
create or replace function public.world_mezzo() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('mezzo', public.w_mezzo(auth.uid()),
    'vero', coalesce((select caps->>'mezzo_vero' from public.world_wallet where user_id = auth.uid()), 'piedi'),
    'comprato', (select caps->>'mezzo_comprato' from public.world_wallet where user_id = auth.uid()),
    'range_km', public.w_mz_range(public.w_mezzo(auth.uid())), 'speed', public.w_mz_speed(public.w_mezzo(auth.uid())),
    'help_pts', public.w_mz_help(public.w_mezzo(auth.uid())) + public.w_dot(auth.uid()), 'dotazioni', public.w_dot(auth.uid()),
    'atk_mult', public.w_mz_atk(public.w_mezzo(auth.uid())),
    'prezzi', json_build_object('moto', 300, 'auto', 600, 'fuori', 1200));
$$;
-- mezzo e dotazioni dichiarati nella valutazione (al massimo l'auto: il fuoristrada si compra)
create or replace function public.world_set_mezzo_vero(p_mezzo text, p_dot int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m text;
begin
  if me is null then return json_build_object('ok', false); end if;
  m := case p_mezzo when 'bici' then 'bici' when 'moto' then 'moto' when 'auto' then 'auto' when 'fuori' then 'auto' else 'piedi' end;
  perform public.w_wallet(me);
  update public.world_wallet set caps = jsonb_set(jsonb_set(caps, '{mezzo_vero}', to_jsonb(m)), '{dotazioni}', to_jsonb(least(3, greatest(0, coalesce(p_dot, 0))))) where user_id = me;
  return json_build_object('ok', true, 'mezzo', public.w_mezzo(me));
end $$;
-- comprare un mezzo migliore in Bottega
create or replace function public.world_buy_mezzo(p_mezzo text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); price int; w public.world_wallet;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  price := case p_mezzo when 'moto' then 300 when 'auto' then 600 when 'fuori' then 1200 else null end;
  if price is null then return json_build_object('ok', false, 'msg', 'Mezzo non in vendita'); end if;
  if public.w_mz_rank(p_mezzo) <= public.w_mz_rank(public.w_mezzo(me)) then return json_build_object('ok', false, 'msg', 'Hai già un mezzo uguale o migliore'); end if;
  w := public.w_wallet(me);
  if w.mattoni < price then return json_build_object('ok', false, 'msg', 'Servono ' || price || ' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - price, caps = jsonb_set(caps, '{mezzo_comprato}', to_jsonb(p_mezzo)) where user_id = me and mattoni >= price;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -price, 'Mezzo comprato', true);
  return json_build_object('ok', true, 'msg', 'Nuovo mezzo pronto', 'mezzo', p_mezzo);
end $$;

-- rinforzi: portata del mezzo, tempo di viaggio, valore secondo mezzo e dotazioni
create or replace function public.world_send_help(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
  mz text; d double precision; arr timestamptz; sid text; v int; eta int; quando text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi aiutare te stesso'); end if;
  if not exists (select 1 from public.world_help where user_id = p_target and slot_id = nid) and not public.w_are_allies(me, p_target) then
    return json_build_object('ok',false,'msg','Non ha chiesto aiuto e non è tuo alleato'); end if;
  mz := public.w_mezzo(me); d := public.w_dist_km(me, p_target);
  if d is null then return json_build_object('ok',false,'msg','Per aiutare serve che abbiate entrambi una casa nel mondo'); end if;
  if d > public.w_mz_range(mz) then
    return json_build_object('ok',false,'msg','È a ' || round(d::numeric,1) || ' km: ' || case mz when 'piedi' then 'a piedi' when 'bici' then 'in bici' when 'moto' then 'in moto' when 'auto' then 'in auto' else 'in fuoristrada' end
      || ' arrivi fino a ' || public.w_mz_range(mz) || ' km' || case when public.w_mz_range(mz) < 20 then '. Un mezzo più veloce in Bottega' else '' end); end if;
  if exists (select 1 from public.world_help_given where helper = me and target = p_target and slot_id >= nid) then return json_build_object('ok',false,'msg','I tuoi rinforzi sono già in viaggio'); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); arr := now() + make_interval(mins => eta);
  sid := public.w_slot_id(public.w_next_slot(arr)); v := public.w_mz_help(mz) + public.w_dot(me);
  quando := case when sid = nid then 'in tempo per l’orda delle ' || right(sid,2) || ':00' else 'troppo tardi per questa orda: valgono per quella delle ' || right(sid,2) || ':00' end;
  insert into public.world_help_given(helper, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Lo hai già aiutato per quella orda'); end if;
  w := public.w_wallet(me); k := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 5, 'Rinforzi mandati a un alleato');
    update public.world_log set seen = true where user_id = me and reason = 'Rinforzi mandati a un alleato' and not seen;
  end if;
  return json_build_object('ok',true,'msg','Rinforzi in viaggio: arrivano tra ' || eta || ' min, ' || quando || '. +' || v || ' alla sua difesa' || case when n < 5 then ', +5 Mattoni a te' else '' end,
    'got', case when n < 5 then 5 else 0 end, 'eta_min', eta, 'slot', sid, 'pts', v);
end $$;

-- assalto di un rivale: solo entro 20 km e la portata del mezzo; forza secondo livello, mezzo e barricate dell'altro
create or replace function public.world_send_attack(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int; lost boolean := false;
  mz text; d double precision; arr timestamptz; sid text; v int; eta int; quando text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi attaccare te stesso'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: ha lo scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato (o coinquilino): niente orde'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  mz := public.w_mezzo(me); d := public.w_dist_km(me, p_target);
  if d is null or d > least(20, public.w_mz_range(mz)) then
    return json_build_object('ok',false,'msg','È a ' || coalesce(round(d::numeric,1)::text,'?') || ' km: ' || case when coalesce(d,99) > 20 then 'le orde arrivano solo entro 20 km (da lontano puoi fare solo dispetti)' else 'con il tuo mezzo arrivi fino a ' || public.w_mz_range(mz) || ' km. Un mezzo più veloce in Bottega' end); end if;
  if exists (select 1 from public.world_attack_given where attacker = me and target = p_target and slot_id >= nid) then return json_build_object('ok',false,'msg','La tua orda è già in viaggio verso di lui'); end if;
  w := public.w_wallet(me); k := 'orde:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n >= 3 then return json_build_object('ok',false,'msg','Oggi hai già mandato 3 orde'); end if;
  if w.mattoni < 30 then return json_build_object('ok',false,'msg','Servono 30 Mattoni'); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); arr := now() + make_interval(mins => eta);
  sid := public.w_slot_id(public.w_next_slot(arr)); v := public.w_atk_pts(me, p_target);
  quando := case when sid = nid then 'per l’orda delle ' || right(sid,2) || ':00' else 'troppo tardi per questa orda: colpirà a quella delle ' || right(sid,2) || ':00' end;
  insert into public.world_attack_given(attacker, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già mandato un’orda per quella volta'); end if;
  if public.w_shielded(me) then lost := true; end if;
  update public.world_wallet set mattoni = mattoni - 30, caps = jsonb_set(jsonb_set(caps, array[k], to_jsonb(n+1)), '{scudo_off}', case when lost then '1' else coalesce(caps->'scudo_off','0') end) where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -30, 'Orda mandata a un rivale', true);
  return json_build_object('ok',true,'msg','Orda in viaggio: arriva tra ' || eta || ' min, ' || quando || ': −' || v || ' alla sua difesa. Se la sua casa cade, taglia di 25 Mattoni'
    || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end, 'eta_min', eta, 'slot', sid, 'pts', v);
end $$;

revoke all on function public.world_mezzo() from public, anon; grant execute on function public.world_mezzo() to authenticated;
revoke all on function public.world_set_mezzo_vero(text, int) from public, anon; grant execute on function public.world_set_mezzo_vero(text, int) to authenticated;
revoke all on function public.world_buy_mezzo(text) from public, anon; grant execute on function public.world_buy_mezzo(text) to authenticated;

-- difesa, "Perché" e scheda del giocatore con i nuovi valori
create or replace function public.w_upower(p_user uuid, p_slot text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with pr as (select w.user_id, coalesce((w.caps->>('prep:'||p_slot))::int,0) = 1 as ok from public.world_wallet w),
  x as (
    select (case when coalesce((select ok from pr where user_id = p_user), false) then 15 else 0 end) as prep,
      least(5, coalesce((select (caps->>'rs')::int from public.world_wallet where user_id = p_user),0)) as rs,
      (select coalesce(sum(pts),0) from public.world_help_given where target = p_user and slot_id = p_slot)::int as helps,
      (select count(*) from public.world_shields where target = p_user and slot_id = p_slot)::int as sh,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(p_user, a.u))::int as cq,
      (select coalesce(sum(pts),0) from public.world_attack_given where target = p_user and slot_id = p_slot)::int as atk,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'sabotaggio')::int as sab)
  select prep + 2 * rs + least(24, helps) + least(10, 5 * sh) + (case when ap >= 3 then 5 else 0 end) + least(9, 3 * cq)
       - least(35, least(30, atk) + least(10, 5 * fog) + (case when sab > 0 and prep > 0 then 15 else 0 end))
  from x;
$$;

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
      (select coalesce(sum(pts),0) from public.world_help_given, n, me where target = me.u and slot_id = n.id)::int as helpv,
      (select count(*) from public.world_shields, n, me where target = me.u and slot_id = n.id)::int as sh,
      (select count(*) from me, public.w_allies_of(me.u) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from me, public.w_allies_of(me.u) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(me.u, a.u))::int as cq,
      (select count(*) from public.world_attack_given, n, me where target = me.u and slot_id = n.id)::int as atk,
      (select coalesce(sum(pts),0) from public.world_attack_given, n, me where target = me.u and slot_id = n.id)::int as atkv,
      (select count(*) from public.world_curses, n, me where target = me.u and slot_id = n.id and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses, n, me where target = me.u and slot_id = n.id and kind = 'sabotaggio')::int as sab,
      public.w_lvl_of(auth.uid()) as wl),
  b as (select c.*, least(35, least(30, atkv) + least(10, 5*fog) + (case when sab > 0 and prep > 0 then 15 else 0 end)) as malus,
      30 + 2 * least(greatest(wl,1),30) as amin, public.w_condo_bonus(auth.uid()) as cb from c),
  hs as (
    select h.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = h.building_id),1) as lvl from public.world_homes h, me where h.user_id = me.u
    union all select bb.building_id, false, bb.level from public.world_buildings bb, me where bb.owner = me.u)
  select json_build_object(
    'prep', b.prep, 'realshield', b.rs, 'realshield_pts', 2*b.rs, 'helps', b.helps, 'helps_pts', least(24,b.helpv),
    'shields', b.sh, 'shields_pts', least(10,5*b.sh), 'squad', b.ap, 'squad_pts', case when b.ap >= 3 then 5 else 0 end,
    'coinq', b.cq, 'coinq_pts', least(9,3*b.cq), 'attacks', b.atk, 'attacks_pts', least(30, b.atkv), 'fog', b.fog, 'sab', b.sab, 'malus', b.malus,
    'bonus', b.prep + 2*b.rs + least(24,b.helpv) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus,
    'attack_min', b.amin, 'attack_max', b.amin + 49, 'condo', b.cb, 'wlevel', b.wl,
    'houses', coalesce((select json_agg(json_build_object('bid', hs.bid, 'home', hs.home, 'level', hs.lvl, 'pres', public.w_pres_bonus(hs.bid, (select id from n)),
        'total', 45 + 12*greatest(hs.lvl,1) + (case when hs.home then 5 + b.cb else 0 end) + public.w_pres_bonus(hs.bid, (select id from n)) + b.prep + 2*b.rs + least(24,b.helpv) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus)) from hs), '[]'::json))
  from b;
$$;

create or replace function public.world_player(p_user uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id)
  select json_build_object(
    'user_id', p_user, 'nick', public.w_nick(p_user), 'wlevel', public.w_lvl_of(p_user),
    'comune', (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = p_user),
    'houses', (select count(*) from public.world_buildings b where b.owner = p_user),
    'home', exists (select 1 from public.world_homes h where h.user_id = p_user),
    'me', p_user = auth.uid(),
    'ally', case when public.w_are_allies(auth.uid(), p_user) then 'ok'
                 when exists (select 1 from public.world_allies x where x.requester = auth.uid() and x.target = p_user and x.status = 'pending') then 'out'
                 when exists (select 1 from public.world_allies x where x.requester = p_user and x.target = auth.uid() and x.status = 'pending') then 'in'
                 else 'none' end,
    'asked', exists (select 1 from public.world_help w, n where w.user_id = p_user and w.slot_id = n.id),
    'helped', exists (select 1 from public.world_help_given g, n where g.helper = auth.uid() and g.target = p_user and g.slot_id >= n.id),
    'attacked', exists (select 1 from public.world_attack_given a, n where a.attacker = auth.uid() and a.target = p_user and a.slot_id >= n.id),
    'dist_km', round(public.w_dist_km(auth.uid(), p_user)::numeric, 1),
    'mezzo', public.w_mezzo(auth.uid()), 'range_km', public.w_mz_range(public.w_mezzo(auth.uid())),
    'eta_min', ceil(public.w_dist_km(auth.uid(), p_user) / public.w_mz_speed(public.w_mezzo(auth.uid())) * 60),
    'help_pts', public.w_mz_help(public.w_mezzo(auth.uid())) + public.w_dot(auth.uid()),
    'atk_pts', public.w_atk_pts(auth.uid(), p_user),
    'protected', public.w_lvl_of(p_user) < public.w_lvl_of(auth.uid()) - 3)
  from n;
$$;


-- controllo: deve dire "mezzi e assalti pronti"
select case when exists (select 1 from information_schema.columns where table_name = 'world_attack_given' and column_name = 'pts')
             and exists (select 1 from pg_proc where proname = 'world_buy_mezzo')
             and exists (select 1 from pg_proc where proname = 'w_upower' and prosrc like '%least(30, atk)%')
       then 'mezzi e assalti pronti' else 'qualcosa manca' end as esito;
