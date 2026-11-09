-- =========================================================
-- ZombieSafeHouse · MONDO v3
-- 1) orda su misura del livello  2) comprare ovunque (prezzo con la distanza)
-- 3) case di superstiti simulati  4) alleati (aiuti) e rivali (orde mandate)
-- =========================================================

-- livello mondo di un utente
create or replace function public.w_lvl_of(p_user uuid) returns int language sql stable security definer set search_path = public as $$
  select public.w_level(coalesce((select lifetime from public.world_wallet where user_id = p_user),0));
$$;

-- casa di un superstite simulato (1 su 6 circa, sempre la stessa per tutti)
create or replace function public.w_is_npc(p_bid text) returns boolean language sql immutable as $$
  select get_byte(decode(md5('npc' || p_bid), 'hex'), 0) < 42;
$$;

-- prezzo: domanda della zona + distanza da casa tua (+10 ogni 50 km), massimo 6000
create or replace function public.w_price2(p_user uuid, p_lat double precision, p_lon double precision) returns int
language sql stable security definer set search_path = public as $$
  select least(6000, public.w_price(p_lat,p_lon) + coalesce((select (floor(public.w_km(h.lat,h.lon,p_lat,p_lon)/50)*10)::int from public.world_homes h where h.user_id = p_user),0));
$$;

-- tabelle alleati e rivali
create table if not exists public.world_help(
  user_id uuid references auth.users(id) on delete cascade,
  slot_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, slot_id));
create table if not exists public.world_help_given(
  helper uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  slot_id text not null,
  created_at timestamptz not null default now(),
  primary key (helper, target, slot_id));
create table if not exists public.world_attack_given(
  attacker uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  slot_id text not null,
  created_at timestamptz not null default now(),
  primary key (attacker, target, slot_id));
alter table public.world_help enable row level security;
alter table public.world_help_given enable row level security;
alter table public.world_attack_given enable row level security;

-- bonus/malus di un utente per un'orda: preparazione +15, aiuti +5 (max +20), orde subite -8 (max -16)
create or replace function public.w_upower(p_user uuid, p_slot text) returns int language sql stable security definer set search_path = public as $$
  select (case when coalesce((select (caps->>('prep:'||p_slot))::int from public.world_wallet where user_id = p_user),0) = 1 then 15 else 0 end)
       + least(20, 5 * (select count(*) from public.world_help_given where target = p_user and slot_id = p_slot)::int)
       - least(16, 8 * (select count(*) from public.world_attack_given where target = p_user and slot_id = p_slot)::int);
$$;
-- forza dell'orda su misura del livello
create or replace function public.w_attack3(p_slot text, p_bid text, p_lvl int) returns int language sql immutable as $$
  select 30 + (get_byte(decode(md5(p_slot || p_bid), 'hex'), 0) % 60) + 4 * least(greatest(p_lvl,1), 30);
$$;
create or replace function public.w_power3(p_level int, p_bonus int, p_home boolean) returns int language sql immutable as $$
  select 45 + 12 * greatest(p_level,1) + p_bonus + (case when p_home then 5 else 0 end);
$$;
-- la casa principale di un utente ha tenuto all'orda?
create or replace function public.w_home_held(p_user uuid, p_slot text) returns boolean language sql stable security definer set search_path = public as $$
  select public.w_power3(coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), public.w_upower(p_user,p_slot), true)
         >= public.w_attack3(p_slot, h.building_id, public.w_lvl_of(p_user))
  from public.world_homes h where h.user_id = p_user;
$$;

-- preventivo: ora si compra ovunque; case dei simulati comprabili (+30%)
create or replace function public.world_quote(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; h public.world_homes; b public.world_buildings; lvl int; nmine int; st text; d double precision; can boolean := false; why text := ''; price int;
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  select * into w from public.world_wallet where user_id = me;
  select * into h from public.world_homes where user_id = me;
  select * into b from public.world_buildings where building_id = p_bid;
  lvl := public.w_level(coalesce(w.lifetime,0));
  select count(*) into nmine from public.world_buildings where owner = me;
  st := case when exists (select 1 from public.world_excluded where building_id = p_bid) then 'excluded'
             when h.building_id = p_bid and h.status = 'home' then 'myhome'
             when h.building_id = p_bid then 'mypending'
             when exists (select 1 from public.world_homes x where x.building_id = p_bid and x.status = 'home') then 'home'
             when b.owner = me then 'mine' when b.owner is not null then 'owned'
             when public.w_is_npc(p_bid) then 'npc' else 'free' end;
  d := case when h.user_id is null then null else public.w_km(h.lat, h.lon, p_lat, p_lon) end;
  price := public.w_price2(me, p_lat, p_lon);
  if st = 'npc' then price := round(price * 1.3); end if;
  if st in ('free','npc') then
    if me is null then why := 'Accedi per comprare';
    elsif h.user_id is null then why := 'Prima registra la tua casa (Valuta)';
    elsif nmine >= public.w_max(lvl) then why := 'Hai già il massimo di case per il tuo livello: sali di livello';
    elsif coalesce(w.mattoni,0) < price then why := 'Mattoni insufficienti';
    else can := true; end if;
  end if;
  return json_build_object('status', st, 'price', price, 'can', can, 'why', why,
    'owner_nick', case when b.owner is not null then public.w_nick(b.owner) end, 'level', coalesce(b.level,1),
    'value', coalesce(b.paid,0) + coalesce(b.upgrades,0), 'mattoni', coalesce(w.mattoni,0), 'wlevel', lvl,
    'owned', nmine, 'max', public.w_max(lvl), 'radius_km', 20000, 'dist_km', round(coalesce(d,0)::numeric,1),
    'up_cost', 150 * coalesce(b.level,1));
end $$;

-- orda: stato personale (case, esiti, aiuti, orde ricevute, taglie)
create or replace function public.world_raid_status() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); lvl int; bon int; res json; held int; tot int; matt int; bounty int;
begin
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me); lvl := public.w_level(w.lifetime); bon := public.w_upower(me, pid);
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack3(pid,x.building_id,lvl),'power',public.w_power3(x.level,bon,x.home),
           'held',public.w_power3(x.level,bon,x.home) >= public.w_attack3(pid,x.building_id,lvl))),'[]'::json),
         count(*) filter (where public.w_power3(x.level,bon,x.home) >= public.w_attack3(pid,x.building_id,lvl)), count(*),
         coalesce(sum(case when public.w_power3(x.level,bon,x.home) >= public.w_attack3(pid,x.building_id,lvl) then 8 + 4*x.level else 2 end),0)
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

create or replace function public.world_raid_claim() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; s json; pid text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  s := public.world_raid_status(); pid := s->>'prev_id';
  w := public.w_wallet(me);
  if coalesce((w.caps->>('raid:'||pid))::int,0) = 1 then return json_build_object('ok',false,'msg','Premi di questa orda già riscattati'); end if;
  if (s->>'total')::int = 0 and (s->>'bounty')::int = 0 then return json_build_object('ok',false,'msg','Nessuna tua casa era nel mondo durante questa orda'); end if;
  update public.world_wallet set caps = jsonb_set(caps, array['raid:'||pid], '1') where user_id = me;
  perform public.w_pay(me, (s->>'mattoni')::int, 'Orda del mondo: premi');
  update public.world_log set seen = true where user_id = me and reason = 'Orda del mondo: premi' and not seen;
  return json_build_object('ok',true,'held',(s->>'held')::int,'total',(s->>'total')::int,'mattoni',(s->>'mattoni')::int,'bounty',(s->>'bounty')::int);
end $$;

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
    public.w_power3(x.level, public.w_upower(x.who, s.id), x.kind = 'home') >= public.w_attack3(s.id, x.building_id, public.w_lvl_of(x.who)),
    x.kind, x.who = auth.uid()
  from houses x, s
  limit 600;
$$;

-- ALLEATI: chiedere aiuto, vedere chi chiede, mandare rinforzi
create or replace function public.world_ask_help() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if not exists (select 1 from public.world_homes where user_id = me) then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  insert into public.world_help(user_id, slot_id) values (me, nid) on conflict do nothing;
  return json_build_object('ok',true,'msg','Richiesta di aiuto inviata a tutto il mondo');
end $$;

create or replace function public.world_help_list() returns table(user_id uuid, nick text, wlevel int, helpers int, dist_km numeric, mine_helped boolean)
language sql stable security definer set search_path = public as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id), me as (select * from public.world_homes where user_id = auth.uid())
  select r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id),
    (select count(*) from public.world_help_given g where g.target = r.user_id and g.slot_id = n.id)::int,
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me, public.world_homes h where h.user_id = r.user_id),
    exists (select 1 from public.world_help_given g where g.helper = auth.uid() and g.target = r.user_id and g.slot_id = n.id)
  from public.world_help r, n where r.slot_id = n.id and r.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid)
  order by r.created_at desc limit 30;
$$;

create or replace function public.world_send_help(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi aiutare te stesso'); end if;
  if not exists (select 1 from public.world_help where user_id = p_target and slot_id = nid) then return json_build_object('ok',false,'msg','Non ha chiesto aiuto per questa orda'); end if;
  insert into public.world_help_given(helper, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Lo hai già aiutato per questa orda'); end if;
  w := public.w_wallet(me); k := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 5, 'Rinforzi mandati a un alleato');
    update public.world_log set seen = true where user_id = me and reason = 'Rinforzi mandati a un alleato' and not seen;
    return json_build_object('ok',true,'msg','Rinforzi mandati: +5 alla sua difesa, +5 Mattoni a te','got',5);
  end if;
  return json_build_object('ok',true,'msg','Rinforzi mandati: +5 alla sua difesa (oggi hai già preso il massimo di premi per gli aiuti)','got',0);
end $$;

-- RIVALI: chi si può attaccare (attivi, non molto più deboli di te) e mandargli un'orda
create or replace function public.world_rivals() returns table(user_id uuid, nick text, wlevel int, dist_km numeric, attacked boolean)
language sql stable security definer set search_path = public as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id), me as (select * from public.world_homes where user_id = auth.uid()),
  ml as (select public.w_lvl_of(auth.uid()) as l)
  select h.user_id, public.w_nick(h.user_id), public.w_lvl_of(h.user_id),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me),
    exists (select 1 from public.world_attack_given a where a.attacker = auth.uid() and a.target = h.user_id and a.slot_id = n.id)
  from public.world_homes h, n, ml
  where h.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) and public.w_lvl_of(h.user_id) >= ml.l - 3
  order by abs(public.w_lvl_of(h.user_id) - ml.l), h.changed_at desc limit 30;
$$;

create or replace function public.world_send_attack(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi attaccare te stesso'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  w := public.w_wallet(me); k := 'orde:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n >= 3 then return json_build_object('ok',false,'msg','Oggi hai già mandato 3 orde'); end if;
  if w.mattoni < 30 then return json_build_object('ok',false,'msg','Servono 30 Mattoni'); end if;
  insert into public.world_attack_given(attacker, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già mandato un’orda per questa volta'); end if;
  update public.world_wallet set mattoni = mattoni - 30, caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -30, 'Orda mandata a un rivale', true);
  return json_build_object('ok',true,'msg','Orda mandata: −8 alla sua difesa. Se la sua casa cade, taglia di 25 Mattoni');
end $$;

revoke all on function public.w_upower(uuid,text) from public, anon, authenticated;
revoke all on function public.w_home_held(uuid,text) from public, anon, authenticated;
grant execute on function public.w_is_npc(text) to anon, authenticated;
grant execute on function public.world_quote(text,double precision,double precision) to anon, authenticated;
grant execute on function public.world_raid_status() to anon, authenticated;
grant execute on function public.world_raid_claim() to authenticated;
grant execute on function public.world_raid_view(double precision,double precision,double precision,double precision) to anon, authenticated;
grant execute on function public.world_ask_help() to authenticated;
grant execute on function public.world_help_list() to authenticated;
grant execute on function public.world_send_help(uuid) to authenticated;
grant execute on function public.world_rivals() to authenticated;
grant execute on function public.world_send_attack(uuid) to authenticated;
