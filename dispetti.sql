-- =========================================================
-- ZombieSafeHouse · DISPETTI AI RIVALI (con le gemme)
-- 🌫️ Nebbia: −5 di difesa alla prossima orda (max 2 = −10)
-- 🔨 Sabotaggio: annulla il bonus "Prepara le case" (−15)
-- Regole: niente dispetti agli alleati, protetti i giocatori 3+ livelli
-- sotto di te, max 3 dispetti al giorno, uno per tipo per orda e bersaglio.
-- Malus totale massimo per orda (orde + dispetti): −25.
-- =========================================================

-- [1] TABELLA ------------------------------------------------
create table if not exists public.world_curses(
  attacker uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  slot_id text not null,
  kind text not null check (kind in ('nebbia','sabotaggio')),
  created_at timestamptz not null default now(),
  primary key (attacker, target, slot_id, kind));
alter table public.world_curses enable row level security;

-- [2] DIFESA: aiuti meno orde e dispetti ricevuti ------------
create or replace function public.w_upower(p_user uuid, p_slot text) returns int language sql stable security definer set search_path = public as $$
  with x as (
    select (case when coalesce((select (caps->>('prep:'||p_slot))::int from public.world_wallet where user_id = p_user),0) = 1 then 15 else 0 end) as prep,
      (select count(*) from public.world_help_given where target = p_user and slot_id = p_slot)::int as helps,
      (select count(*) from public.world_attack_given where target = p_user and slot_id = p_slot)::int as atk,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'sabotaggio')::int as sab)
  select prep + least(20, 5 * helps)
       - least(25, least(16, 8 * atk) + least(10, 5 * fog) + (case when sab > 0 and prep > 0 then 15 else 0 end))
  from x;
$$;
revoke all on function public.w_upower(uuid,text) from public, anon, authenticated;

-- [3] FARE UN DISPETTO --------------------------------------
create or replace function public.world_send_curse(p_target uuid, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non puoi fare dispetti a te stesso'); end if;
  if p_kind not in ('nebbia','sabotaggio') then return json_build_object('ok',false,'msg','Dispetto non valido'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato: niente dispetti'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  if (select count(*) from public.world_curses where attacker = me and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok',false,'msg','Oggi hai già fatto 3 dispetti'); end if;
  insert into public.world_curses(attacker, target, slot_id, kind) values (me, p_target, nid, p_kind) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Questo dispetto gliel’hai già fatto per la prossima orda'); end if;
  return json_build_object('ok',true,'msg', case when p_kind = 'nebbia' then 'Nebbia mandata: −5 alla sua difesa alla prossima orda' else 'Sabotaggio riuscito: se aveva preparato le case, perde il bonus (−15)' end);
end $$;
grant execute on function public.world_send_curse(uuid,text) to authenticated;

-- [4] LA VITTIMA LO SA (bacheca "per te" e notifica push) ---
create or replace function public.w_tr_feed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'world_homes' then
    if new.status = 'home' and (tg_op = 'INSERT' or old.status is distinct from 'home') then perform public.w_feed_add('join', new.user_id, null, new.lat, new.lon, null); end if;
  elsif tg_table_name = 'world_buildings' then
    if new.owner is not null and (tg_op = 'INSERT' or old.owner is distinct from new.owner) then perform public.w_feed_add('buy', new.owner, null, new.lat, new.lon, case when public.w_is_npc(new.building_id) then 'npc' end); end if;
  elsif tg_table_name = 'world_help' then
    perform public.w_feed_add('ask', new.user_id, null, null, null, null);
    insert into public.world_feed(kind, actor, target) select 'ask_ally', new.user_id, a from public.w_allies_of(new.user_id) a;
  elsif tg_table_name = 'world_help_given' then perform public.w_feed_add('help', new.helper, new.target, null, null, null);
  elsif tg_table_name = 'world_attack_given' then perform public.w_feed_add('attack', new.attacker, new.target, null, null, null);
  elsif tg_table_name = 'world_curses' then perform public.w_feed_add('curse', new.attacker, new.target, null, null, new.kind);
  elsif tg_table_name = 'world_gifts' then perform public.w_feed_add('gift', new.from_u, new.to_u, null, null, case when new.loan then 'prestito' else new.kind end);
  elsif tg_table_name = 'world_allies' then
    if new.status = 'ok' and (tg_op = 'INSERT' or old.status is distinct from 'ok') then perform public.w_feed_add('ally', new.requester, new.target, null, null, null);
    elsif tg_op = 'INSERT' then perform public.w_feed_add('ally_req', new.requester, new.target, null, null, null); end if;
  elsif tg_table_name = 'world_shouts' then perform public.w_feed_add('shout', new.from_u, new.to_u, null, null, new.code::text);
  end if;
  return new;
end $$;
drop trigger if exists tr_feed on public.world_curses;
create trigger tr_feed after insert on public.world_curses for each row execute function public.w_tr_feed();
