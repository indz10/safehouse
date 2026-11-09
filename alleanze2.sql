-- =========================================================
-- ZombieSafeHouse · ALLEANZE 2: coinquilini, scudi, difesa di squadra, doni nuovi
-- =========================================================

-- [A] COINQUILINI: stesso edificio (o entro 25 m) = alleati automatici ------
create or replace function public.w_coinq(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_a <> p_b and exists (select 1 from public.world_homes a, public.world_homes b where a.user_id = p_a and b.user_id = p_b
    and (a.building_id = b.building_id or public.w_km(a.lat,a.lon,b.lat,b.lon) < 0.025)), false);
$$;
create or replace function public.w_are_allies(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_help_given g where ((g.helper = a and g.target = b) or (g.helper = b and g.target = a)) and g.created_at > now() - interval '30 days')
    or exists (select 1 from public.profili_pubblici p where p.user_id = b and p.invitato_da = left(a::text,8))
    or exists (select 1 from public.profili_pubblici p where p.user_id = a and p.invitato_da = left(b::text,8))
    or public.w_coinq(a, b));
$$;
create or replace function public.w_allies_of(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct t.u from (
    select case when x.requester = p_user then x.target else x.requester end as u from public.world_allies x where x.status = 'ok' and (x.requester = p_user or x.target = p_user)
    union select g.target from public.world_help_given g where g.helper = p_user and g.created_at > now() - interval '30 days'
    union select g.helper from public.world_help_given g where g.target = p_user and g.created_at > now() - interval '30 days'
    union select p.user_id from public.profili_pubblici p where p.invitato_da = left(p_user::text,8)
    union select q.user_id from public.profili_pubblici p, public.profili_pubblici q where p.user_id = p_user and p.invitato_da is not null and left(q.user_id::text,8) = p.invitato_da
    union select h.user_id from public.world_homes h, public.world_homes me where me.user_id = p_user and h.user_id <> p_user
      and h.lat between me.lat - 0.0005 and me.lat + 0.0005 and h.lon between me.lon - 0.0007 and me.lon + 0.0007 and public.w_coinq(p_user, h.user_id)) t
  where t.u is not null and t.u <> p_user;
$$;
revoke all on function public.w_coinq(uuid,uuid) from public, anon, authenticated;
revoke all on function public.w_are_allies(uuid,uuid) from public, anon, authenticated;
revoke all on function public.w_allies_of(uuid) from public, anon, authenticated;
drop function if exists public.world_allies();
create function public.world_allies() returns table(user_id uuid, nick text, wlevel int, dist_km numeric, coinq boolean)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.world_homes where user_id = auth.uid())
  select a.u, public.w_nick(a.u), public.w_lvl_of(a.u),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me, public.world_homes h where h.user_id = a.u),
    public.w_coinq(auth.uid(), a.u)
  from public.w_allies_of(auth.uid()) as a(u) limit 80;
$$;
grant execute on function public.world_allies() to authenticated;

-- [B] SCUDO PER UN ALLEATO (20 💎): +5 alla sua prossima orda, max 2 scudi ------
create table if not exists public.world_shields(
  giver uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  slot_id text not null,
  created_at timestamptz not null default now(),
  primary key (giver, target, slot_id));
alter table public.world_shields enable row level security;
create or replace function public.world_ally_shield(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Lo scudo si dà a un alleato'); end if;
  if not public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','Solo agli alleati'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if (select count(*) from public.world_shields where target = p_target and slot_id = nid) >= 2 then return json_build_object('ok',false,'msg','Ha già 2 scudi per la prossima orda'); end if;
  insert into public.world_shields(giver, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già dato uno scudo per questa orda'); end if;
  return json_build_object('ok',true,'msg','Scudo dato: +5 alla sua difesa alla prossima orda');
end $$;
grant execute on function public.world_ally_shield(uuid) to authenticated;

-- [C] DIFESA: aiuti + scudi + squadra + coinquilini − malus ----------------
create or replace function public.w_upower(p_user uuid, p_slot text) returns int language sql stable security definer set search_path = public as $$
  with pr as (select w.user_id, coalesce((w.caps->>('prep:'||p_slot))::int,0) = 1 as ok from public.world_wallet w),
  x as (
    select (case when coalesce((select ok from pr where user_id = p_user), false) then 15 else 0 end) as prep,
      (select count(*) from public.world_help_given where target = p_user and slot_id = p_slot)::int as helps,
      (select count(*) from public.world_shields where target = p_user and slot_id = p_slot)::int as sh,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(p_user, a.u))::int as cq,
      (select count(*) from public.world_attack_given where target = p_user and slot_id = p_slot)::int as atk,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'sabotaggio')::int as sab)
  select prep + least(20, 5 * helps) + least(10, 5 * sh) + (case when ap >= 3 then 5 else 0 end) + least(9, 3 * cq)
       - least(25, least(16, 8 * atk) + least(10, 5 * fog) + (case when sab > 0 and prep > 0 then 15 else 0 end))
  from x;
$$;
revoke all on function public.w_upower(uuid,text) from public, anon, authenticated;

-- [D] DONI: anche gemme (20/giorno), giri di ruota e biglietti (1/giorno) ------
create or replace function public.world_give(p_to uuid, p_kind text, p_amount int, p_loan boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  lim int; sent int; recv int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_amount is null or p_amount < 1 then return json_build_object('ok',false,'msg','Quantità non valida'); end if;
  if p_kind not in ('mattoni','monete','gemme','giri','biglietti','cibo','legno','metallo','batterie','medicine') then return json_build_object('ok',false,'msg','Cosa non valida'); end if;
  if p_loan and p_kind <> 'mattoni' then return json_build_object('ok',false,'msg','Si prestano solo i Mattoni'); end if;
  if not public.w_are_allies(me, p_to) then return json_build_object('ok',false,'msg','Potete scambiarvi cose solo da alleati: aiutatevi in un’orda o invitatevi'); end if;
  if (select created_at from auth.users where id = me) > now() - interval '3 days' then return json_build_object('ok',false,'msg','Account troppo nuovo: potrai regalare tra qualche giorno'); end if;
  lim := case p_kind when 'mattoni' then 300 when 'monete' then 300 when 'gemme' then 20 when 'giri' then 1 when 'biglietti' then 1 else 10 end;
  select coalesce(sum(amount),0) into sent from public.world_gifts where from_u = me and kind = p_kind and created_at > now() - interval '1 day';
  if sent + p_amount > lim then return json_build_object('ok',false,'msg','Limite di oggi: '||lim||' '||p_kind||' (ne hai già dati '||sent||')'); end if;
  select coalesce(sum(amount),0) into recv from public.world_gifts where to_u = p_to and kind = p_kind and created_at > now() - interval '1 day';
  if recv + p_amount > lim * 2 then return json_build_object('ok',false,'msg','Il tuo alleato ha già ricevuto il massimo di oggi'); end if;
  if p_kind = 'mattoni' then
    w := public.w_wallet(me);
    if w.mattoni < p_amount then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
    update public.world_wallet set mattoni = mattoni - p_amount where user_id = me;
    insert into public.world_log(user_id, delta, reason, seen) values (me, -p_amount, (case when p_loan then 'Prestito a @' else 'Regalo a @' end) || public.w_nick(p_to), true);
    perform public.w_wallet(p_to);
    update public.world_wallet set mattoni = mattoni + p_amount where user_id = p_to;
    insert into public.world_log(user_id, delta, reason) values (p_to, p_amount, (case when p_loan then 'Prestito da @' else 'Regalo da @' end) || public.w_nick(me) || (case when p_loan then ' (torna fra 3 giorni)' else '' end));
    insert into public.world_gifts(from_u, to_u, kind, amount, loan, due_at, left_due, claimed)
      values (me, p_to, p_kind, p_amount, p_loan, case when p_loan then now() + interval '3 days' end, case when p_loan then p_amount else 0 end, true);
  else
    insert into public.world_gifts(from_u, to_u, kind, amount) values (me, p_to, p_kind, p_amount);
  end if;
  return json_build_object('ok',true,'msg', case when p_loan then 'Prestito fatto: torna da solo fra 3 giorni' else 'Regalo inviato' end);
end $$;

-- [E] NIENTE ORDE AGLI ALLEATI; i rivali non comprendono alleati e coinquilini --
create or replace function public.world_send_attack(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int; lost boolean := false;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi attaccare te stesso'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: ha lo scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato (o coinquilino): niente orde'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  w := public.w_wallet(me); k := 'orde:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n >= 3 then return json_build_object('ok',false,'msg','Oggi hai già mandato 3 orde'); end if;
  if w.mattoni < 30 then return json_build_object('ok',false,'msg','Servono 30 Mattoni'); end if;
  insert into public.world_attack_given(attacker, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già mandato un’orda per questa volta'); end if;
  if public.w_shielded(me) then lost := true; end if;
  update public.world_wallet set mattoni = mattoni - 30, caps = jsonb_set(jsonb_set(caps, array[k], to_jsonb(n+1)), '{scudo_off}', case when lost then '1' else coalesce(caps->'scudo_off','0') end) where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -30, 'Orda mandata a un rivale', true);
  return json_build_object('ok',true,'msg','Orda mandata: −8 alla sua difesa. Se la sua casa cade, taglia di 25 Mattoni' || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;
drop function if exists public.world_rivals();
create function public.world_rivals() returns table(user_id uuid, nick text, wlevel int, dist_km numeric, attacked boolean, shield boolean)
language sql stable security definer set search_path = public as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id), me as (select * from public.world_homes where user_id = auth.uid()),
  ml as (select public.w_lvl_of(auth.uid()) as l)
  select h.user_id, public.w_nick(h.user_id), public.w_lvl_of(h.user_id),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me),
    exists (select 1 from public.world_attack_given a where a.attacker = auth.uid() and a.target = h.user_id and a.slot_id = n.id),
    public.w_shielded(h.user_id)
  from public.world_homes h, n, ml
  where h.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) and public.w_lvl_of(h.user_id) >= ml.l - 3 and not public.w_are_allies(auth.uid(), h.user_id)
  order by abs(public.w_lvl_of(h.user_id) - ml.l), h.changed_at desc limit 30;
$$;
grant execute on function public.world_rivals() to authenticated;

-- [F] AVVISI E RIEPILOGO DELLA SQUADRA ----------------------------------------
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
  elsif tg_table_name = 'world_shields' then perform public.w_feed_add('shield', new.giver, new.target, null, null, null);
  elsif tg_table_name = 'world_gifts' then perform public.w_feed_add('gift', new.from_u, new.to_u, null, null, case when new.loan then 'prestito' else new.kind end);
  elsif tg_table_name = 'world_allies' then
    if new.status = 'ok' and (tg_op = 'INSERT' or old.status is distinct from 'ok') then perform public.w_feed_add('ally', new.requester, new.target, null, null, null);
    elsif tg_op = 'INSERT' then perform public.w_feed_add('ally_req', new.requester, new.target, null, null, null); end if;
  elsif tg_table_name = 'world_shouts' then perform public.w_feed_add('shout', new.from_u, new.to_u, null, null, new.code::text);
  end if;
  return new;
end $$;
drop trigger if exists tr_feed on public.world_shields;
create trigger tr_feed after insert on public.world_shields for each row execute function public.w_tr_feed();
create or replace function public.world_team_bonus() returns json
language sql stable security definer set search_path = public as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  al as (select a.u from public.w_allies_of(auth.uid()) a(u)),
  pr as (select al.u from al, n join public.world_wallet w on true where w.user_id = al.u and coalesce((w.caps->>('prep:'||n.id))::int,0) = 1)
  select json_build_object(
    'coinq', coalesce((select json_agg(public.w_nick(al.u)) from al where public.w_coinq(auth.uid(), al.u)), '[]'::json),
    'coinq_prep', (select count(*) from pr where public.w_coinq(auth.uid(), pr.u)),
    'allies', (select count(*) from al),
    'allies_prep', (select count(*) from pr),
    'shields_in', (select count(*) from public.world_shields s, n where s.target = auth.uid() and s.slot_id = n.id),
    'shields_out', coalesce((select json_agg(s.target) from public.world_shields s, n where s.giver = auth.uid() and s.slot_id = n.id), '[]'::json));
$$;
grant execute on function public.world_team_bonus() to authenticated;
notify pgrst, 'reload schema';
