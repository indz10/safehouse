-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 014 — il territorio: presenza, assalti, conquiste, carburante e legno (scelte di Alessandro, 14/11)
-- 1) ❤️ CASA VERA INTOCCABILE solo con la PRESENZA: almeno una volta ogni 7 giorni bisogna aprire l'app da lì
--    (GPS entro 200 m, world_presenza; ogni giorno la prima presenza dà ⛽ 10: "il pieno a casa").
--    Senza presenza da più di 7 giorni la casa vera diventa SACCHEGGIABILE dai rivali (world_saccheggia):
--    se all'orda cade, chi l'ha assaltata di più ruba il 25% di 🪵🥫⛽ (max 60 ciascuna) e il 10% dei 🧱 (max 50). Non si perde mai.
-- 2) 🔑 CASE COMPRATE e 🚩 PRESIDI si possono ASSALTARE (world_assalta: 🥫 10 + carburante, max 3 assalti al giorno).
--    Forza dell'assalto: (6 + 0,5 × livello) × mezzo, −10% per ogni livello di barricate, recinto e fossato dell'edificio (max −60%), minimo 3.
--    Si sommano gli assalti di più rivali (anche alleati tra loro). Gli ALLEATI del padrone difendono (world_difendi:
--    + rinforzi del mezzo, solo carburante) e chiunque tra padrone e alleati può INCHIODARE ASSI (world_assi: 🪵 20 = +6, max +18).
--    Sull'edificio: + assi (max 18) + difese (max 24) − assalti (max 40), solo per l'orda in cui arrivano.
--    Se all'orda l'edificio cade e c'era almeno un assalto: CONQUISTA — passa a chi l'ha assaltato di più
--    (se ha posto per un'altra casa, altrimenti prende un bottino di 🧱 40 e 🪵 20); il vecchio padrone riceve metà dei Mattoni spesi.
--    Un presidio conquistato passa a chi l'ha assaltato di più (se ne tiene meno di 3), altrimenti torna libero.
-- 3) ⛽ CARBURANTE: moto 1, auto 1,5, fuoristrada 2 per km (a piedi e in bici gratis). Senza carburante si va a piedi (o in bici
--    se è il mezzo della valutazione). Vale per rinforzi, orde, assalti e difese.
-- 4) 🛡️ Scudo del nuovo arrivato: 15 giorni (prima 14).
-- 5) Le case in zone care rendono di più: affitto al giorno 5 + 5 × livello + prezzo della zona / 100.
--    I presidi tenuti da almeno 7 giorni danno +5 alle case vicine (prima +3; massimo +10 per casa).
-- Si può eseguire più volte.
-- =====================================================================

alter table public.world_homes add column if not exists presente_at timestamptz;
update public.world_homes set presente_at = now() where presente_at is null;
alter table public.world_homes alter column presente_at set default now();

create table if not exists public.world_assalti(
  bid text not null,                 -- edificio (building_id), casa vera (building_id) o presidio ('pres:' || id)
  user_id uuid not null,             -- chi assalta / difende / inchioda
  slot_id text not null,             -- l'orda in cui conta
  kind text not null check (kind in ('atk','aiuto','assi')),
  pts int not null,
  vittima uuid,                      -- per il saccheggio della casa vera: di chi è la casa
  created_at timestamptz not null default now(),
  primary key (bid, user_id, slot_id, kind));
create index if not exists world_assalti_slot on public.world_assalti(slot_id, kind);
alter table public.world_assalti enable row level security;

create table if not exists public.world_assalti_esiti(
  bid text not null, slot_id text not null, held boolean not null, esito text not null,
  vincitore uuid, perdente uuid, created_at timestamptz not null default now(),
  primary key (bid, slot_id));
alter table public.world_assalti_esiti enable row level security;

-- scudo del nuovo arrivato: 15 giorni
create or replace function public.w_shielded(p_user uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select coalesce((select u.created_at > now() - interval '15 days' from auth.users u where u.id = p_user), false)
     and coalesce((select (w.caps->>'scudo_off')::int from public.world_wallet w where w.user_id = p_user), 0) = 0; $$;

-- casa vera "custodita": presenza negli ultimi 7 giorni (o casa ancora in conferma)
create or replace function public.w_custodita(p_user uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select coalesce((select h.status = 'pending' or coalesce(h.presente_at, now()) > now() - interval '7 days' from public.world_homes h where h.user_id = p_user), true); $$;

-- assi, difese e assalti su un edificio per un'orda
create or replace function public.w_casa_extra(p_bid text, p_slot text) returns integer
  language sql stable security definer set search_path to 'public' as $$
  select (least(18, coalesce(sum(pts) filter (where kind = 'assi'), 0)) + least(24, coalesce(sum(pts) filter (where kind = 'aiuto'), 0))
        - least(40, coalesce(sum(pts) filter (where kind = 'atk'), 0)))::int
  from public.world_assalti where bid = p_bid and slot_id = p_slot; $$;

-- carburante per un viaggio
create or replace function public.w_mz_carb(p_mz text, p_km double precision) returns integer
  language sql immutable as $$
  select ceil(greatest(coalesce(p_km,0),0) * case p_mz when 'moto' then 1 when 'auto' then 1.5 when 'fuori' then 2 else 0 end)::int; $$;
-- il mezzo con cui si parte davvero: senza carburante a piedi (o in bici se è il mezzo della valutazione)
create or replace function public.w_mz_eff(p_user uuid, p_km double precision) returns text
  language sql stable security definer set search_path to 'public' as $$
  with m as (select public.w_mezzo(p_user) as mz, coalesce((select carb from public.world_wallet where user_id = p_user), 0) as carb,
                    coalesce((select caps->>'mezzo_vero' from public.world_wallet where user_id = p_user), 'piedi') as vero)
  select case when public.w_mz_carb(mz, p_km) <= carb then mz when vero = 'bici' then 'bici' else 'piedi' end from m; $$;
create or replace function public.w_mz_nome(p_mz text) returns text language sql immutable as $$
  select case p_mz when 'bici' then 'in bici' when 'moto' then 'in moto' when 'auto' then 'in auto' when 'fuori' then 'in fuoristrada' else 'a piedi' end; $$;
-- distanza da una mia casa (vera o comprata) a un punto
create or replace function public.w_dist_pt(p_user uuid, p_lat double precision, p_lon double precision) returns double precision
  language sql stable security definer set search_path to 'public' as $$
  select min(public.w_km(x.lat, x.lon, p_lat, p_lon)) from (
    select lat, lon from public.world_homes where user_id = p_user union all select lat, lon from public.world_buildings where owner = p_user) x; $$;
-- fortificazioni che frenano gli assalti
create or replace function public.w_fort(p_bid text) returns int
  language sql stable security definer set search_path to 'public' as $$
  select public.w_def(p_bid,'barricate') + public.w_def(p_bid,'recinto') + public.w_def(p_bid,'fossato'); $$;
create or replace function public.w_atk_b(p_user uuid, p_mz text, p_bid text) returns int
  language sql stable security definer set search_path to 'public' as $$
  select greatest(3, round((6 + 0.5 * public.w_lvl_of(p_user)) * public.w_mz_atk(p_mz) * (1 - least(0.6, 0.1 * public.w_fort(p_bid)))))::int; $$;
revoke all on function public.w_casa_extra(text, text) from public, anon, authenticated;
revoke all on function public.w_custodita(uuid) from public, anon, authenticated;
revoke all on function public.w_mz_eff(uuid, double precision) from public, anon, authenticated;
revoke all on function public.w_dist_pt(uuid, double precision, double precision) from public, anon, authenticated;
revoke all on function public.w_atk_b(uuid, text, text) from public, anon, authenticated;

-- presidi: tenuti da almeno 7 giorni danno +5 (prima +3), massimo +10 per casa
create or replace function public.w_pres_bonus(p_bid text, p_slot text) returns integer
  language sql stable security definer set search_path to 'public' as $$
  with c as (select coalesce((select b.lat from public.world_buildings b where b.building_id = p_bid), (select h.lat from public.world_homes h where h.building_id = p_bid limit 1)) as lat,
                    coalesce((select b.lon from public.world_buildings b where b.building_id = p_bid), (select h.lon from public.world_homes h where h.building_id = p_bid limit 1)) as lon,
                    public.w_slot_t(p_slot) as t)
  select least(10, coalesce(sum((select case when min(t.dal) <= c.t - interval '7 days' then 5 else 3 end from public.world_presidi_tenute t
                                  where t.presidio_id = p.id and t.dal < c.t and (t.al is null or t.al >= c.t))), 0))::int
  from c join public.world_presidi p on p.lat between c.lat - 0.005 and c.lat + 0.005 and public.w_km(c.lat, c.lon, p.lat, p.lon) <= 0.5
  where exists (select 1 from public.world_presidi_tenute t where t.presidio_id = p.id and t.dal < c.t and (t.al is null or t.al >= c.t)); $$;

-- difesa di un presidio: guardie + assi + difese − assalti
create or replace function public.w_pres_def(p_id text, p_slot text) returns integer
  language sql stable security definer set search_path to 'public' as $$
  select 55 + 12 * least(5, (select count(*) from public.world_presidi_guardie g where g.presidio_id = p_id and g.slot_id = p_slot))::int
       + public.w_casa_extra('pres:' || p_id, p_slot); $$;

-- presidi all'orda: se cade e qualcuno l'ha assaltato, passa a chi l'ha assaltato di più
create or replace function public.w_pres_tick() returns integer
  language plpgsql security definer set search_path to 'public' as $$
declare pt timestamptz := public.w_prev_slot(now()); pid text := public.w_slot_id(public.w_prev_slot(now())); p record; n int := 0; top uuid;
begin
  for p in select * from public.world_presidi where holder is not null and coalesce(ultimo_slot, '') < pid and held_since < pt for update skip locked loop
    if public.w_pres_def(p.id, pid) >= public.w_pres_attack(pid, p.id) then
      update public.world_presidi set ultimo_slot = pid, record = record + 1 where id = p.id;
      perform public.w_pres_rendita(p.holder, p.kind, p.record + 1);
      insert into public.world_assalti_esiti(bid, slot_id, held, esito, perdente) select 'pres:' || p.id, pid, true, 'respinto', p.holder
        where exists (select 1 from public.world_assalti a where a.bid = 'pres:' || p.id and a.slot_id = pid and a.kind = 'atk') on conflict do nothing;
    else
      update public.world_presidi_tenute set al = pt where presidio_id = p.id and al is null;
      select a.user_id into top from public.world_assalti a where a.bid = 'pres:' || p.id and a.slot_id = pid and a.kind = 'atk' and a.user_id <> p.holder
        order by a.pts desc, a.created_at limit 1;
      if top is not null and (select count(*) from public.world_presidi where holder = top) < 3 then
        update public.world_presidi set ultimo_slot = pid, holder = top, held_since = now(), record = 0, perso_da = p.holder, perso_il = pt where id = p.id;
        insert into public.world_presidi_tenute(presidio_id, user_id, dal) values (p.id, top, now());
        perform public.w_feed_add('conquista', top, p.holder, p.lat, p.lon, 'presidio:' || p.name);
        insert into public.world_assalti_esiti(bid, slot_id, held, esito, vincitore, perdente) values ('pres:' || p.id, pid, false, 'conquista', top, p.holder) on conflict do nothing;
      else
        update public.world_presidi set ultimo_slot = pid, holder = null, held_since = null, record = 0, perso_da = p.holder, perso_il = pt where id = p.id;
      end if;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- assalti alle case comprate e saccheggi delle case vere: risultato dopo ogni orda (lo fa il primo che apre l'app)
create or replace function public.w_assalti_tick() returns integer
  language plpgsql security definer set search_path to 'public' as $$
declare pid text := public.w_slot_id(public.w_prev_slot(now())); r record; b public.world_buildings; held boolean; top uuid; refund int; n int := 0;
  vw public.world_wallet; tl int; tc int; tf int; tm int;
begin
  for r in select a.bid, a.slot_id, max(a.vittima::text)::uuid as vittima from public.world_assalti a
           where a.kind = 'atk' and a.slot_id <= pid and a.bid not like 'pres:%' and a.created_at > now() - interval '3 days'
             and not exists (select 1 from public.world_assalti_esiti e where e.bid = a.bid and e.slot_id = a.slot_id)
           group by a.bid, a.slot_id limit 50 loop
    insert into public.world_assalti_esiti(bid, slot_id, held, esito) values (r.bid, r.slot_id, true, 'in_corso') on conflict do nothing;
    if not found then continue; end if;
    select a.user_id into top from public.world_assalti a where a.bid = r.bid and a.slot_id = r.slot_id and a.kind = 'atk' order by a.pts desc, a.created_at limit 1;
    if r.vittima is not null then
      -- casa vera incustodita: saccheggio
      held := coalesce(public.w_home_held(r.vittima, r.slot_id), true);
      if held then
        update public.world_assalti_esiti set esito = 'respinto', perdente = r.vittima where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('respinto', r.vittima, top, null, null, 'casa');
      else
        vw := public.w_wallet(r.vittima);
        tl := least(60, floor(vw.legno * 0.25)::int); tc := least(60, floor(vw.cibo * 0.25)::int); tf := least(60, floor(vw.carb * 0.25)::int); tm := least(50, floor(vw.mattoni * 0.10)::int);
        update public.world_wallet set legno = legno - tl, cibo = cibo - tc, carb = carb - tf, mattoni = mattoni - tm where user_id = r.vittima;
        perform public.w_wallet(top);
        update public.world_wallet set legno = legno + tl, cibo = cibo + tc, carb = carb + tf, mattoni = mattoni + tm where user_id = top;
        if tm > 0 then
          insert into public.world_log(user_id, delta, reason, seen) values (r.vittima, -tm, 'Casa saccheggiata da @' || public.w_nick(top), false);
          insert into public.world_log(user_id, delta, reason, seen) values (top, tm, 'Bottino del saccheggio', false);
        end if;
        update public.world_assalti_esiti set held = false, esito = 'saccheggio', vincitore = top, perdente = r.vittima where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('saccheggio', top, r.vittima, null, null, tm || ',' || tl || ',' || tc || ',' || tf);
      end if;
    else
      select * into b from public.world_buildings where building_id = r.bid for update;
      if b.owner is null then
        update public.world_assalti_esiti set esito = 'vuota' where bid = r.bid and slot_id = r.slot_id; continue; end if;
      held := public.w_power3(b.level, public.w_upower(b.owner, r.slot_id) + public.w_pres_bonus(r.bid, r.slot_id) + public.w_casa_extra(r.bid, r.slot_id), false)
              >= public.w_attack3(r.slot_id, r.bid, public.w_lvl_of(b.owner));
      if held or top is null or top = b.owner then
        update public.world_assalti_esiti set esito = 'respinto', perdente = b.owner where bid = r.bid and slot_id = r.slot_id;
        if top is not null then perform public.w_feed_add('respinto', b.owner, top, b.lat, b.lon, 'edificio'); end if;
      elsif (select count(*) from public.world_buildings x where x.owner = top) < public.w_max(public.w_lvl_of(top)) then
        refund := round(0.5 * (coalesce(b.paid,0) + coalesce(b.upgrades,0)));
        if refund > 0 then
          update public.world_wallet set mattoni = mattoni + refund where user_id = b.owner;
          insert into public.world_log(user_id, delta, reason, ref, seen) values (b.owner, refund, 'Casa conquistata da @' || public.w_nick(top) || ': ti torna metà della spesa', r.bid, false);
        end if;
        update public.world_buildings set owner = top, paid = 0, upgrades = 0, bought_at = now() where building_id = r.bid;
        delete from public.world_assalti where bid = r.bid and slot_id > r.slot_id;
        update public.world_assalti_esiti set held = false, esito = 'conquista', vincitore = top, perdente = b.owner where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('conquista', top, b.owner, b.lat, b.lon, 'casa');
        -- chi ha assaltato insieme a lui: 🧱 20
        perform public.w_pay(a.user_id, 20, 'Assalto riuscito insieme a @' || public.w_nick(top), r.bid)
          from public.world_assalti a where a.bid = r.bid and a.slot_id = r.slot_id and a.kind = 'atk' and a.user_id <> top;
      else
        perform public.w_pay(top, 40, 'Bottino dell''assalto (hai già il massimo di case)', r.bid); perform public.w_res(top, 20, 0, 0);
        update public.world_assalti_esiti set held = false, esito = 'bottino', vincitore = top, perdente = b.owner where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('saccheggio', top, b.owner, b.lat, b.lon, '40,20,0,0');
      end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.w_assalti_tick() from public, anon, authenticated;

-- che cos'è un edificio per chi lo guarda (casa comprata, casa vera, presidio)
create or replace function public.w_target(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql stable security definer set search_path to 'public' as $$
declare p public.world_presidi; b public.world_buildings; h public.world_homes; bid text;
begin
  if p_bid like 'pres:%' then
    select * into p from public.world_presidi where id = substr(p_bid, 6);
    if p.id is null then return json_build_object('tipo','none'); end if;
    return json_build_object('tipo','pres','bid','pres:' || p.id,'owner',p.holder,'lat',p.lat,'lon',p.lon,'level',1,'nome',p.name);
  end if;
  select * into h from public.world_homes where building_id = p_bid and status = 'home' limit 1;
  if h.user_id is not null then
    return json_build_object('tipo','home','bid',h.building_id,'owner',h.user_id,'lat',h.lat,'lon',h.lon,
      'level',coalesce((select level from public.world_buildings where building_id = h.building_id),1)); end if;
  bid := public.w_canon(p_bid, p_lat, p_lon);
  select * into b from public.world_buildings where building_id = bid and owner is not null;
  if b.building_id is null then return json_build_object('tipo','none'); end if;
  return json_build_object('tipo','owned','bid',b.building_id,'owner',b.owner,'lat',b.lat,'lon',b.lon,'level',b.level);
end $$;
revoke all on function public.w_target(text, double precision, double precision) from public, anon, authenticated;

-- difesa con assi, difese e assalti dell'edificio: stessa formula ovunque (orda vera, minaccia, "Perché", mappa delle orde)
create or replace function public.w_home_held(p_user uuid, p_slot text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.w_power3(coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), public.w_upower(p_user,p_slot) + public.w_condo_bonus(p_user) + public.w_pres_bonus(h.building_id,p_slot) + public.w_casa_extra(h.building_id,p_slot), true)
         >= public.w_attack3(p_slot, h.building_id, public.w_lvl_of(p_user))
  from public.world_homes h where h.user_id = p_user;
$$;

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
    public.w_power3(x.level, public.w_upower(x.who, s.id) + (case when x.kind = 'home' then public.w_condo_bonus(x.who) else 0 end) + public.w_pres_bonus(x.building_id,s.id) + public.w_casa_extra(x.building_id,s.id), x.kind = 'home') >= public.w_attack3(s.id, x.building_id, public.w_lvl_of(x.who)),
    x.kind, x.who = auth.uid()
  from houses x, s
  limit 600;
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
    'houses', coalesce((select json_agg(json_build_object('bid', hs.bid, 'home', hs.home, 'level', hs.lvl, 'pres', public.w_pres_bonus(hs.bid, (select id from n)), 'extra', public.w_casa_extra(hs.bid, (select id from n)),
        'total', 45 + 12*greatest(hs.lvl,1) + (case when hs.home then 5 + b.cb else 0 end) + public.w_pres_bonus(hs.bid, (select id from n)) + public.w_casa_extra(hs.bid, (select id from n)) + b.prep + 2*b.rs + least(24,b.helpv) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus)) from hs), '[]'::json))
  from b;
$$;

create or replace function public.world_raid_status() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); lvl int; bon int; cb int; res json; held int; tot int; matt int; bounty int;
begin
  perform public.w_assalti_tick();
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me); lvl := public.w_level(w.lifetime); bon := public.w_upower(me, pid); cb := public.w_condo_bonus(me);
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack3(pid,x.building_id,lvl),'power',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home),
           'held',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl))),'[]'::json),
         count(*) filter (where public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl)), count(*),
         coalesce(sum(case when public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl) then 10 + 6*x.level else 3 end),0)
    into res, held, tot, matt
    from public.w_raid_houses(me, pt) x;
  select 35 * count(*) into bounty from public.world_attack_given a where a.attacker = me and a.slot_id = pid and public.w_home_held(a.target, pid) = false;
  return json_build_object('next_at', nt, 'next_id', nid, 'prev_at', pt, 'prev_id', pid, 'wlevel', lvl,
    'prepared', coalesce((w.caps->>('prep:'||nid))::int,0) = 1, 'prev_prepared', coalesce((w.caps->>('prep:'||pid))::int,0) = 1,
    'claimed', coalesce((w.caps->>('raid:'||pid))::int,0) = 1, 'houses', res, 'held', held, 'total', tot,
    'mattoni', matt + coalesce(bounty,0), 'bounty', coalesce(bounty,0),
    'legno', 4*coalesce(held,0), 'cibo', 6*coalesce(held,0), 'carb', 10*(coalesce(bounty,0)/35),
    'asked', exists (select 1 from public.world_help where user_id = me and slot_id = nid),
    'helpers', (select count(*) from public.world_help_given where target = me and slot_id = nid),
    'attacks_in', (select count(*) from public.world_attack_given where target = me and slot_id = nid),
    'next_bonus', public.w_upower(me, nid),
    'presente_at', (select h.presente_at from public.world_homes h where h.user_id = me), 'custodita', public.w_custodita(me));
end $$;

create or replace function public.w_threats_of(p_user uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; tr numeric; dt int; amin int; amax int; pb int; ex int;
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
    pb := public.w_pres_bonus(h.bid, nid); ex := public.w_casa_extra(h.bid, nid);
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 + public.w_condo_bonus(p_user) else 0 end) + up + pb + ex;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up, 'pres', pb, 'extra', ex, 'condo', case when h.home then public.w_condo_bonus(p_user) else 0 end,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,4),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;

-- 📍 presenza a casa (GPS entro 200 m, più l'imprecisione dichiarata fino a 100 m)
create or replace function public.world_presenza(p_lat double precision, p_lon double precision, p_acc double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); h public.world_homes; d double precision; w public.world_wallet; k text := 'presenza:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); r json; got int := 0;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  if p_lat is null or p_lon is null then return json_build_object('ok',false,'msg','Posizione non disponibile'); end if;
  d := public.w_km(h.lat, h.lon, p_lat, p_lon);
  if d > 0.2 + least(greatest(coalesce(p_acc,0),0),100) / 1000.0 then
    return json_build_object('ok',false,'lontano',true,'dist_m',round(d*1000),'msg','Sei a ' || case when d < 1 then round(d*1000) || ' m' else round(d::numeric,1) || ' km' end || ' da casa: la presenza vale entro 200 m'); end if;
  update public.world_homes set presente_at = now() where user_id = me;
  w := public.w_wallet(me);
  if coalesce((w.caps->>k)::int,0) = 0 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], '1') where user_id = me;
    r := public.w_res(me, 0, 0, 10); got := coalesce((r->>'carb')::int,0);
  end if;
  return json_build_object('ok',true,'carb',got,'msg','📍 Sei a casa: rifugio intoccabile per 7 giorni' || case when got > 0 then '. Pieno a casa: ⛽ +' || got else '' end);
end $$;

-- controllo comune per assalti, difese e assi (anche per mostrare costi e motivi nell'app)
create or replace function public.w_azione(me uuid, p_bid text, p_lat double precision, p_lon double precision, p_kind text) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare t json; tipo text; own uuid; tb text; la double precision; lo double precision; w public.world_wallet; nid text := public.w_slot_id(public.w_next_slot(now()));
  d double precision; mz text; mzp text; carb int; eta int; sid text; pp int; why text; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); somma int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  t := public.w_target(p_bid, p_lat, p_lon); tipo := t->>'tipo';
  if tipo = 'none' then return json_build_object('ok',false,'msg','Qui non c''è niente da assaltare o difendere'); end if;
  tb := t->>'bid'; own := (t->>'owner')::uuid; la := (t->>'lat')::double precision; lo := (t->>'lon')::double precision;
  w := public.w_wallet(me);
  if p_kind = 'assi' then
    if tipo = 'pres' and own is null then return json_build_object('ok',false,'tipo',tipo,'msg','Il presidio è libero: occupalo prima'); end if;
    if own <> me and not public.w_are_allies(me, own) then return json_build_object('ok',false,'tipo',tipo,'msg','Le assi si inchiodano solo sulle tue case e su quelle degli alleati'); end if;
    somma := coalesce((select sum(pts) from public.world_assalti where bid = t->>'bid' and slot_id = nid and kind = 'assi'), 0);
    if somma >= 18 then return json_build_object('ok',false,'tipo',tipo,'msg','Già 3 file di assi per questa orda (+18)'); end if;
    if w.legno < 20 then return json_build_object('ok',false,'tipo',tipo,'msg','Servono 🪵 20 di legno (lo danno parchi e campi sportivi tenuti, le orde rette e l''accesso del giorno)'); end if;
    return json_build_object('ok',true,'tipo',tipo,'bid',tb,'owner',own,'slot',nid,'pts',6,'legno',20,'somma',somma);
  end if;
  if own is null then return json_build_object('ok',false,'tipo',tipo,'msg','Non lo tiene nessuno'); end if;
  d := public.w_dist_pt(me, la, lo);
  if d is null then return json_build_object('ok',false,'tipo',tipo,'msg','Serve una tua casa nel mondo'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); carb := public.w_mz_carb(mz, d);
  if p_kind = 'atk' then
    if own = me then return json_build_object('ok',false,'tipo',tipo,'msg','È tua'); end if;
    if tipo = 'home' and public.w_custodita(own) then return json_build_object('ok',false,'tipo',tipo,'msg','Casa vera custodita: chi ci abita è passato da lì negli ultimi 7 giorni. È intoccabile'); end if;
    if public.w_are_allies(me, own) then return json_build_object('ok',false,'tipo',tipo,'msg','È di un tuo alleato: puoi solo difenderla'); end if;
    if public.w_shielded(own) then return json_build_object('ok',false,'tipo',tipo,'msg','È di un nuovo arrivato: 15 giorni di scudo'); end if;
    if public.w_lvl_of(own) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'tipo',tipo,'msg','È molto più debole di te: è protetto'); end if;
    if exists (select 1 from public.world_assalti where bid = t->>'bid' and user_id = me and slot_id >= nid and kind = 'atk') then
      return json_build_object('ok',false,'tipo',tipo,'msg','La tua squadra è già in viaggio'); end if;
    if coalesce((w.caps->>('assalti:' || day))::int,0) >= 3 then return json_build_object('ok',false,'tipo',tipo,'msg','Oggi hai già fatto 3 assalti'); end if;
    pp := public.w_atk_b(me, mz, case when tipo = 'pres' then '' else tb end);
  elsif p_kind = 'aiuto' then
    if own = me then return json_build_object('ok',false,'tipo',tipo,'msg','È tua: inchioda le assi o chiedi agli alleati'); end if;
    if not public.w_are_allies(me, own) then return json_build_object('ok',false,'tipo',tipo,'msg','Si difendono solo gli alleati'); end if;
    if exists (select 1 from public.world_assalti where bid = t->>'bid' and user_id = me and slot_id >= nid and kind = 'aiuto') then
      return json_build_object('ok',false,'tipo',tipo,'msg','Sei già in viaggio per difenderla'); end if;
    pp := public.w_mz_help(mz) + public.w_dot(me);
  else return json_build_object('ok',false,'msg','Azione non valida'); end if;
  if d > least(20, public.w_mz_range(mz)) then
    why := 'È a ' || round(d::numeric,1) || ' km: ' || public.w_mz_nome(mz) || ' arrivi fino a ' || least(20, public.w_mz_range(mz)) || ' km'
      || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ', ne hai ' || w.carb || ')' when d > 20 then '' else '. Un mezzo più veloce in Bottega' end;
    return json_build_object('ok',false,'tipo',tipo,'msg',why,'dist_km',round(d::numeric,1),'mezzo',mz); end if;
  if p_kind = 'atk' and w.cibo < 10 then return json_build_object('ok',false,'tipo',tipo,'msg','Servono 🥫 10 di cibo per la squadra'); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); sid := public.w_slot_id(public.w_next_slot(now() + make_interval(mins => eta)));
  return json_build_object('ok',true,'tipo',tipo,'bid',tb,'owner',own,'dist_km',round(d::numeric,1),'mezzo',mz,'mezzo_pieno',mzp,'carb',carb,
    'cibo',case when p_kind = 'atk' then 10 else 0 end,'eta_min',eta,'slot',sid,'in_tempo',sid = nid,'pts',pp);
end $$;
revoke all on function public.w_azione(uuid, text, double precision, double precision, text) from public, anon, authenticated;

-- scheda di un edificio: chi lo tiene, assalti e difese in arrivo, cosa posso fare e quanto costa
create or replace function public.world_edificio_info(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); t json; own uuid; nid text := public.w_slot_id(public.w_next_slot(now())); b text; vis boolean; e public.world_assalti_esiti;
begin
  perform public.w_assalti_tick(); perform public.w_pres_tick();
  t := public.w_target(p_bid, p_lat, p_lon);
  if t->>'tipo' = 'none' then return json_build_object('tipo','none'); end if;
  own := (t->>'owner')::uuid; b := t->>'bid';
  vis := own is not null and (own = me or public.w_home_known(me, own) or t->>'tipo' <> 'home');
  select * into e from public.world_assalti_esiti where bid = b and slot_id = public.w_slot_id(public.w_prev_slot(now()));
  return json_build_object('tipo', t->>'tipo', 'bid', b, 'level', (t->>'level')::int, 'nome', t->>'nome',
    'owner', case when vis then own end, 'nick', case when vis then public.w_nick(own) end,
    'mio', own = me, 'alleato', own is not null and own <> me and public.w_are_allies(me, own),
    'scudo', own is not null and public.w_shielded(own), 'custodita', case when t->>'tipo' = 'home' then public.w_custodita(own) end,
    'presente_at', case when own = me and t->>'tipo' = 'home' then (select presente_at from public.world_homes where user_id = me) end,
    'fort', case when t->>'tipo' = 'pres' then 0 else public.w_fort(b) end,
    'rendita', case when t->>'tipo' = 'owned' then 5 + 5 * (t->>'level')::int + public.w_price((t->>'lat')::double precision, (t->>'lon')::double precision) / 100 end,
    'slot', nid,
    'assalti', (select count(*) from public.world_assalti where bid = b and slot_id = nid and kind = 'atk'),
    'assalti_pts', least(40, (select coalesce(sum(pts),0) from public.world_assalti where bid = b and slot_id = nid and kind = 'atk')),
    'aiuti', (select count(*) from public.world_assalti where bid = b and slot_id = nid and kind = 'aiuto'),
    'aiuti_pts', least(24, (select coalesce(sum(pts),0) from public.world_assalti where bid = b and slot_id = nid and kind = 'aiuto')),
    'assi_pts', least(18, (select coalesce(sum(pts),0) from public.world_assalti where bid = b and slot_id = nid and kind = 'assi')),
    'ultimo', case when e.bid is not null then json_build_object('esito', e.esito, 'vincitore', public.w_nick(e.vincitore)) end,
    'atk', public.w_azione(me, p_bid, p_lat, p_lon, 'atk'), 'aiuto', public.w_azione(me, p_bid, p_lat, p_lon, 'aiuto'), 'assi', public.w_azione(me, p_bid, p_lat, p_lon, 'assi'),
    'risorse', (select json_build_object('legno', legno, 'cibo', cibo, 'carb', carb, 'mattoni', mattoni) from public.world_wallet where user_id = me));
end $$;

-- ⚔️ assalto a una casa comprata, a un presidio o (se incustodita) a una casa vera
create or replace function public.world_assalta(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); lost boolean := false; n int; quando text;
begin
  a := public.w_azione(me, p_bid, p_lat, p_lon, 'atk');
  if not (a->>'ok')::boolean then return a; end if;
  update public.world_wallet set cibo = cibo - 10, carb = carb - (a->>'carb')::int where user_id = me and cibo >= 10 and carb >= (a->>'carb')::int;
  if not found then return json_build_object('ok',false,'msg','Risorse insufficienti'); end if;
  insert into public.world_assalti(bid, user_id, slot_id, kind, pts, vittima)
    values (a->>'bid', me, a->>'slot', 'atk', (a->>'pts')::int, case when a->>'tipo' = 'home' then (a->>'owner')::uuid end) on conflict do nothing;
  n := coalesce((select (caps->>('assalti:' || day))::int from public.world_wallet where user_id = me), 0);
  lost := public.w_shielded(me);
  update public.world_wallet set caps = jsonb_set(jsonb_set(caps, array['assalti:' || day], to_jsonb(n + 1)), '{scudo_off}', case when lost then '1' else coalesce(caps->'scudo_off','0') end) where user_id = me;
  perform public.w_feed_add('assalto', me, (a->>'owner')::uuid, null, null, a->>'tipo');
  quando := case when (a->>'in_tempo')::boolean then 'per l’orda delle ' || right(a->>'slot',2) || ':00' else 'troppo tardi per questa orda: conta per quella delle ' || right(a->>'slot',2) || ':00' end;
  return json_build_object('ok',true,'pts',(a->>'pts')::int,'slot',a->>'slot','msg','⚔️ Squadra partita ' || public.w_mz_nome(a->>'mezzo') || ': arriva tra ' || (a->>'eta_min') || ' min, ' || quando
    || ': −' || (a->>'pts') || ' alla sua difesa. ' || case when a->>'tipo' = 'home' then 'Se cade, saccheggi le sue scorte' else 'Se cade, è tua' end
    || case when (a->>'carb')::int > 0 then ' · ⛽ −' || (a->>'carb') else '' end || ' · 🥫 −10' || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

-- 🛡️ difendere la casa comprata o il presidio di un alleato
create or replace function public.world_difendi(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a json; w public.world_wallet; k text := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n int; quando text;
begin
  a := public.w_azione(me, p_bid, p_lat, p_lon, 'aiuto');
  if not (a->>'ok')::boolean then return a; end if;
  update public.world_wallet set carb = carb - (a->>'carb')::int where user_id = me and carb >= (a->>'carb')::int;
  if not found then return json_build_object('ok',false,'msg','Carburante insufficiente'); end if;
  insert into public.world_assalti(bid, user_id, slot_id, kind, pts) values (a->>'bid', me, a->>'slot', 'aiuto', (a->>'pts')::int) on conflict do nothing;
  w := public.w_wallet(me); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 10, 'Difesa di un alleato');
    update public.world_log set seen = true where user_id = me and reason = 'Difesa di un alleato' and not seen;
  end if;
  perform public.w_feed_add('difesa', me, (a->>'owner')::uuid, null, null, a->>'tipo');
  quando := case when (a->>'in_tempo')::boolean then 'in tempo per l’orda delle ' || right(a->>'slot',2) || ':00' else 'troppo tardi: vale per l’orda delle ' || right(a->>'slot',2) || ':00' end;
  return json_build_object('ok',true,'pts',(a->>'pts')::int,'msg','🛡️ In viaggio ' || public.w_mz_nome(a->>'mezzo') || ': arrivi tra ' || (a->>'eta_min') || ' min, ' || quando || '. +' || (a->>'pts') || ' alla difesa'
    || case when (a->>'carb')::int > 0 then ' · ⛽ −' || (a->>'carb') else '' end || case when n < 5 then ' · +10 Mattoni a te' else '' end);
end $$;

-- 🪵 inchiodare le assi: 20 legno = +6 per la prossima orda (max +18), sulle tue case e su quelle degli alleati
create or replace function public.world_assi(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a json;
begin
  a := public.w_azione(me, p_bid, p_lat, p_lon, 'assi');
  if not (a->>'ok')::boolean then return a; end if;
  update public.world_wallet set legno = legno - 20 where user_id = me and legno >= 20;
  if not found then return json_build_object('ok',false,'msg','Servono 🪵 20'); end if;
  insert into public.world_assalti(bid, user_id, slot_id, kind, pts) values (a->>'bid', me, a->>'slot', 'assi', 6)
    on conflict (bid, user_id, slot_id, kind) do update set pts = public.world_assalti.pts + 6;
  if (a->>'owner')::uuid <> me then perform public.w_feed_add('assi', me, (a->>'owner')::uuid, null, null, a->>'tipo'); end if;
  return json_build_object('ok',true,'msg','🪵 Assi inchiodate: +6 alla difesa per l’orda delle ' || right(a->>'slot',2) || ':00 (in tutto +' || least(18, (a->>'somma')::int + 6) || ')');
end $$;

-- ⚔️ saccheggio dalla scheda del giocatore (casa vera incustodita)
create or replace function public.world_saccheggia(p_user uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare h public.world_homes;
begin
  select * into h from public.world_homes where user_id = p_user and status = 'home';
  if h.user_id is null then return json_build_object('ok',false,'msg','Non ha una casa confermata nel mondo'); end if;
  return public.world_assalta(h.building_id, h.lat, h.lon);
end $$;

revoke all on function public.world_presenza(double precision, double precision, double precision) from public, anon;
revoke all on function public.world_edificio_info(text, double precision, double precision) from public, anon;
revoke all on function public.world_assalta(text, double precision, double precision) from public, anon;
revoke all on function public.world_difendi(text, double precision, double precision) from public, anon;
revoke all on function public.world_assi(text, double precision, double precision) from public, anon;
revoke all on function public.world_saccheggia(uuid) from public, anon;
grant execute on function public.world_presenza(double precision, double precision, double precision) to authenticated;
grant execute on function public.world_edificio_info(text, double precision, double precision) to authenticated;
grant execute on function public.world_assalta(text, double precision, double precision) to authenticated;
grant execute on function public.world_difendi(text, double precision, double precision) to authenticated;
grant execute on function public.world_assi(text, double precision, double precision) to authenticated;
grant execute on function public.world_saccheggia(uuid) to authenticated;

-- ⛽ rinforzi e orde ai giocatori: anche loro col carburante
create or replace function public.world_send_help(p_target uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
  mz text; mzp text; c int; d double precision; arr timestamptz; sid text; v int; eta int; quando text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi aiutare te stesso'); end if;
  if not exists (select 1 from public.world_help where user_id = p_target and slot_id = nid) and not public.w_are_allies(me, p_target) then
    return json_build_object('ok',false,'msg','Non ha chiesto aiuto e non è tuo alleato'); end if;
  d := public.w_dist_km(me, p_target);
  if d is null then return json_build_object('ok',false,'msg','Per aiutare serve che abbiate entrambi una casa nel mondo'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); c := public.w_mz_carb(mz, d);
  if d > public.w_mz_range(mz) then
    return json_build_object('ok',false,'msg','È a ' || round(d::numeric,1) || ' km: ' || public.w_mz_nome(mz) || ' arrivi fino a ' || public.w_mz_range(mz) || ' km'
      || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ')' when public.w_mz_range(mz) < 20 then '. Un mezzo più veloce in Bottega' else '' end); end if;
  if exists (select 1 from public.world_help_given where helper = me and target = p_target and slot_id >= nid) then return json_build_object('ok',false,'msg','I tuoi rinforzi sono già in viaggio'); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); arr := now() + make_interval(mins => eta);
  sid := public.w_slot_id(public.w_next_slot(arr)); v := public.w_mz_help(mz) + public.w_dot(me);
  quando := case when sid = nid then 'in tempo per l’orda delle ' || right(sid,2) || ':00' else 'troppo tardi per questa orda: valgono per quella delle ' || right(sid,2) || ':00' end;
  update public.world_wallet set carb = carb - c where user_id = me and carb >= c;
  if not found then return json_build_object('ok',false,'msg','Carburante insufficiente'); end if;
  insert into public.world_help_given(helper, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then update public.world_wallet set carb = carb + c where user_id = me; return json_build_object('ok',false,'msg','Lo hai già aiutato per quella orda'); end if;
  w := public.w_wallet(me); k := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 10, 'Rinforzi mandati a un alleato');
    perform public.w_res(me, 0, 5, 0);
    update public.world_log set seen = true where user_id = me and reason = 'Rinforzi mandati a un alleato' and not seen;
  end if;
  return json_build_object('ok',true,'msg','Rinforzi in viaggio ' || public.w_mz_nome(mz) || ': arrivano tra ' || eta || ' min, ' || quando || '. +' || v || ' alla sua difesa'
    || case when c > 0 then ' · ⛽ −' || c else '' end || case when n < 5 then ', +10 Mattoni e 🥫 5 a te' else '' end,
    'got', case when n < 5 then 10 else 0 end, 'eta_min', eta, 'slot', sid, 'pts', v, 'carb', c);
end $$;

create or replace function public.world_send_attack(p_target uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int; lost boolean := false;
  mz text; mzp text; c int; d double precision; arr timestamptz; sid text; v int; eta int; quando text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi attaccare te stesso'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: 15 giorni di scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato (o coinquilino): niente orde'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  d := public.w_dist_km(me, p_target);
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, coalesce(d, 0)); c := public.w_mz_carb(mz, d);
  if d is null or d > least(20, public.w_mz_range(mz)) then
    return json_build_object('ok',false,'msg','È a ' || coalesce(round(d::numeric,1)::text,'?') || ' km: ' || case when coalesce(d,99) > 20 then 'le orde arrivano solo entro 20 km (da lontano puoi fare solo dispetti)'
      else public.w_mz_nome(mz) || ' arrivi fino a ' || public.w_mz_range(mz) || ' km' || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ')' else '. Un mezzo più veloce in Bottega' end end); end if;
  if exists (select 1 from public.world_attack_given where attacker = me and target = p_target and slot_id >= nid) then return json_build_object('ok',false,'msg','La tua orda è già in viaggio verso di lui'); end if;
  w := public.w_wallet(me); k := 'orde:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n >= 3 then return json_build_object('ok',false,'msg','Oggi hai già mandato 3 orde'); end if;
  if w.mattoni < 30 then return json_build_object('ok',false,'msg','Servono 30 Mattoni'); end if;
  if w.carb < c then return json_build_object('ok',false,'msg','Servono ⛽ ' || c); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); arr := now() + make_interval(mins => eta);
  sid := public.w_slot_id(public.w_next_slot(arr));
  v := greatest(3, round((6 + 0.5 * public.w_lvl_of(me)) * public.w_mz_atk(mz)
         * (1 - least(0.6, 0.1 * coalesce((select public.w_fort(h.building_id) from public.world_homes h where h.user_id = p_target limit 1), 0)))))::int;
  quando := case when sid = nid then 'per l’orda delle ' || right(sid,2) || ':00' else 'troppo tardi per questa orda: colpirà a quella delle ' || right(sid,2) || ':00' end;
  insert into public.world_attack_given(attacker, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già mandato un’orda per quella volta'); end if;
  if public.w_shielded(me) then lost := true; end if;
  update public.world_wallet set mattoni = mattoni - 30, carb = carb - c, caps = jsonb_set(jsonb_set(caps, array[k], to_jsonb(n+1)), '{scudo_off}', case when lost then '1' else coalesce(caps->'scudo_off','0') end) where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -30, 'Orda mandata a un rivale', true);
  return json_build_object('ok',true,'msg','Orda in viaggio ' || public.w_mz_nome(mz) || ': arriva tra ' || eta || ' min, ' || quando || ': −' || v || ' alla sua difesa. Se la sua casa cade, taglia di 25 Mattoni'
    || case when c > 0 then ' · ⛽ −' || c else '' end || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end, 'eta_min', eta, 'slot', sid, 'pts', v, 'carb', c);
end $$;

-- scheda del giocatore: mezzo con cui parti davvero, carburante, casa custodita o saccheggiabile
create or replace function public.world_player(p_user uuid) returns json
  language sql stable security definer set search_path to 'public' as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  d as (select public.w_dist_km(auth.uid(), p_user) as km),
  m as (select public.w_mz_eff(auth.uid(), coalesce((select km from d), 0)) as mz, public.w_mezzo(auth.uid()) as mzp)
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
    'dist_km', round((select km from d)::numeric, 1),
    'mezzo', (select mz from m), 'mezzo_pieno', (select mzp from m), 'range_km', public.w_mz_range((select mz from m)),
    'carb_cost', public.w_mz_carb((select mz from m), (select km from d)), 'carb_pieno', public.w_mz_carb((select mzp from m), (select km from d)),
    'carb', (select carb from public.world_wallet where user_id = auth.uid()),
    'eta_min', ceil((select km from d) / public.w_mz_speed((select mz from m)) * 60),
    'help_pts', public.w_mz_help((select mz from m)) + public.w_dot(auth.uid()),
    'atk_pts', greatest(3, round((6 + 0.5 * public.w_lvl_of(auth.uid())) * public.w_mz_atk((select mz from m))
         * (1 - least(0.6, 0.1 * coalesce((select public.w_fort(h.building_id) from public.world_homes h where h.user_id = p_user limit 1), 0)))))::int,
    'protected', public.w_lvl_of(p_user) < public.w_lvl_of(auth.uid()) - 3,
    'scudo', public.w_shielded(p_user),
    'custodita', public.w_custodita(p_user),
    'saccheggiabile', p_user <> auth.uid() and exists (select 1 from public.world_homes h where h.user_id = p_user and h.status = 'home') and not public.w_custodita(p_user)
      and not public.w_are_allies(auth.uid(), p_user) and not public.w_shielded(p_user))
  from n;
$$;

-- affitti: le case in zone care rendono di più (5 + 5 × livello + prezzo della zona / 100 al giorno)
create or replace function public.world_collect() returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; rate int; hrs double precision; amt int;
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  select coalesce(sum(5 + 5*level + public.w_price(lat, lon) / 100),0) into rate from public.world_buildings where owner = me;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  amt := floor(rate * hrs / 24.0);
  if amt < 1 then return json_build_object('ok',false,'msg','Ancora niente da riscuotere','rate',rate); end if;
  update public.world_wallet set last_rent = now() where user_id = me;
  perform public.w_pay(me, amt, 'Affitti delle tue case');
  update public.world_log set seen = true where user_id = me and reason = 'Affitti delle tue case' and not seen;
  return json_build_object('ok',true,'got',amt,'rate',rate);
end $$;

-- controllo: deve dire "territorio pronto"
select case when exists (select 1 from pg_proc where proname = 'world_assalta') and exists (select 1 from pg_proc where proname = 'w_assalti_tick')
             and exists (select 1 from information_schema.columns where table_name = 'world_homes' and column_name = 'presente_at')
             and exists (select 1 from pg_proc where proname = 'w_threats_of' and prosrc like '%w_casa_extra%')
       then 'territorio pronto' else 'qualcosa manca' end as esito;
