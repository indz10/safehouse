-- =========================================================
-- ZombieSafeHouse · CORREZIONE: tabella dei dispetti + blocchi 7 e 8 + ricerca giocatori
-- Un solo Run.
-- =========================================================

-- 1) la tabella dei dispetti (mancava) e il suo avviso in bacheca
create table if not exists public.world_curses(
  attacker uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  slot_id text not null,
  kind text not null check (kind in ('nebbia','sabotaggio')),
  created_at timestamptz not null default now(),
  primary key (attacker, target, slot_id, kind));
alter table public.world_curses enable row level security;
drop trigger if exists tr_feed on public.world_curses;
create trigger tr_feed after insert on public.world_curses for each row execute function public.w_tr_feed();

-- 2) blocco 7: la formula completa della difesa
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

-- 3) blocco 8: il conto esatto ("Perché")
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

-- 4) cercare un giocatore per nome (per proporgli l'alleanza)
create or replace function public.world_find(p_q text) returns table(user_id uuid, nick text, wlevel int, comune text, ally text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.nick, public.w_lvl_of(p.user_id), case when p.visibile then p.comune end,
    case when public.w_are_allies(auth.uid(), p.user_id) then 'ok'
         when exists (select 1 from public.world_allies x where x.requester = auth.uid() and x.target = p.user_id and x.status = 'pending') then 'out'
         when exists (select 1 from public.world_allies x where x.requester = p.user_id and x.target = auth.uid() and x.status = 'pending') then 'in'
         else 'none' end
  from public.profili_pubblici p
  where auth.uid() is not null and p.user_id <> auth.uid() and char_length(btrim(coalesce(p_q,''))) >= 2 and p.nick ilike btrim(p_q) || '%'
  order by p.nick limit 12;
$$;
grant execute on function public.world_find(text) to authenticated;
notify pgrst, 'reload schema';
