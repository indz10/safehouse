-- =========================================================
-- ZombieSafeHouse · LA CASA VERA CONTA NELL'ORDA + CONTO ESATTO DELLA DIFESA
-- Scudo della casa vera (0–5) → +2 di difesa a tutte le tue case per livello (max +10)
-- =========================================================

-- [A] LO SCUDO DELLA CASA VERA ARRIVA AL SERVER (si aggiorna al massimo ogni 6 ore) --
create or replace function public.world_set_realshield(p_lvl int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; old int; v int := greatest(0, least(5, coalesce(p_lvl,0)));
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me); old := coalesce((w.caps->>'rs')::int, 0);
  if v = old then return json_build_object('ok',true,'rs',old); end if;
  if coalesce((w.caps->>'rs_at')::bigint,0) > extract(epoch from now())::bigint - 6*3600 and v > old then return json_build_object('ok',false,'rs',old,'msg','Lo Scudo si aggiorna ogni 6 ore'); end if;
  update public.world_wallet set caps = jsonb_set(jsonb_set(caps,'{rs}',to_jsonb(v)),'{rs_at}',to_jsonb(extract(epoch from now())::bigint)) where user_id = me;
  return json_build_object('ok',true,'rs',v);
end $$;
grant execute on function public.world_set_realshield(int) to authenticated;

-- [B] DIFESA: + Scudo della casa vera ----------------------------------------
create or replace function public.w_upower(p_user uuid, p_slot text) returns int language sql stable security definer set search_path = public as $$
  with pr as (select w.user_id, coalesce((w.caps->>('prep:'||p_slot))::int,0) = 1 as ok from public.world_wallet w),
  x as (
    select (case when coalesce((select ok from pr where user_id = p_user), false) then 15 else 0 end) as prep,
      least(5, coalesce((select (caps->>'rs')::int from public.world_wallet where user_id = p_user),0)) as rs,
      (select count(*) from public.world_help_given where target = p_user and slot_id = p_slot)::int as helps,
      (select count(*) from public.world_shields where target = p_user and slot_id = p_slot)::int as sh,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(p_user, a.u))::int as cq,
      (select count(*) from public.world_attack_given where target = p_user and slot_id = p_slot)::int as atk,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'sabotaggio')::int as sab)
  select prep + 2 * rs + least(20, 5 * helps) + least(10, 5 * sh) + (case when ap >= 3 then 5 else 0 end) + least(9, 3 * cq)
       - least(25, least(16, 8 * atk) + least(10, 5 * fog) + (case when sab > 0 and prep > 0 then 15 else 0 end))
  from x;
$$;
revoke all on function public.w_upower(uuid,text) from public, anon, authenticated;

-- [C] IL CONTO ESATTO DELLA PROSSIMA ORDA (voce per voce, per ogni casa) -------------
create or replace function public.world_my_defense() returns json
language sql stable security definer set search_path = public as $$
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
      30 + 4 * least(greatest(wl,1),30) as amin from c),
  hs as (
    select h.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = h.building_id),1) as lvl from public.world_homes h, me where h.user_id = me.u
    union all select bb.building_id, false, bb.level from public.world_buildings bb, me where bb.owner = me.u)
  select json_build_object(
    'prep', b.prep, 'realshield', b.rs, 'realshield_pts', 2*b.rs, 'helps', b.helps, 'helps_pts', least(20,5*b.helps),
    'shields', b.sh, 'shields_pts', least(10,5*b.sh), 'squad', b.ap, 'squad_pts', case when b.ap >= 3 then 5 else 0 end,
    'coinq', b.cq, 'coinq_pts', least(9,3*b.cq), 'attacks', b.atk, 'fog', b.fog, 'sab', b.sab, 'malus', b.malus,
    'bonus', b.prep + 2*b.rs + least(20,5*b.helps) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus,
    'attack_min', b.amin, 'attack_max', b.amin + 59, 'wlevel', b.wl,
    'houses', coalesce((select json_agg(json_build_object('bid', hs.bid, 'home', hs.home, 'level', hs.lvl,
        'total', 45 + 12*greatest(hs.lvl,1) + (case when hs.home then 5 else 0 end) + b.prep + 2*b.rs + least(20,5*b.helps) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus)) from hs), '[]'::json))
  from b;
$$;
grant execute on function public.world_my_defense() to authenticated;
notify pgrst, 'reload schema';
