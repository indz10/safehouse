-- =========================================================
-- ZombieSafeHouse · EQUITÀ DEL MONDO UNICO
-- 1 Kit di benvenuto (300 🧱)        2 Scudo del nuovo arrivato (14 giorni)
-- 3 Spinta di recupero (+50% 🧱)      4 Leghe per fascia di livello
-- 5 Case più care per chi ne ha tante 6 Padrino (+10% a chi ha invitato)
-- =========================================================

-- [A] FUNZIONI DI SERVIZIO ----------------------------------
create or replace function public.w_shielded(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select u.created_at > now() - interval '14 days' from auth.users u where u.id = p_user), false)
     and coalesce((select (w.caps->>'scudo_off')::int from public.world_wallet w where w.user_id = p_user), 0) = 0;
$$;
create or replace function public.w_league(p_lvl int) returns text language sql immutable as $$
  select case when p_lvl <= 5 then 'Bronzo' when p_lvl <= 12 then 'Argento' when p_lvl <= 20 then 'Oro' else 'Diamante' end;
$$;
-- livello medio (mediana) dei giocatori attivi entro circa 20 km; serve almeno 3 giocatori
create or replace function public.w_median_near(p_user uuid) returns numeric
language sql stable security definer set search_path = public as $$
  with me as (select lat, lon from public.world_homes where user_id = p_user),
  v as (select public.w_level(w.lifetime) as l from public.world_wallet w join public.world_homes h on h.user_id = w.user_id, me
        where w.user_id <> p_user and h.lat between me.lat - 0.18 and me.lat + 0.18 and h.lon between me.lon - 0.25 and me.lon + 0.25
          and exists (select 1 from public.profili_pubblici p where p.user_id = w.user_id and p.seen_at > now() - interval '30 days'))
  select case when count(*) >= 3 then percentile_cont(0.5) within group (order by l)::numeric end from v;
$$;
create or replace function public.w_boost(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.w_lvl_of(p_user) < public.w_median_near(p_user), false);
$$;
revoke all on function public.w_shielded(uuid) from public, anon, authenticated;
revoke all on function public.w_median_near(uuid) from public, anon, authenticated;
revoke all on function public.w_boost(uuid) from public, anon, authenticated;

-- [B] GUADAGNI: spinta di recupero (+50%) e padrino (+10% a chi ha invitato) ---
create or replace function public.w_pay(p_user uuid, p_delta int, p_reason text, p_ref text default null) returns void
language plpgsql security definer set search_path = public as $$
declare extra int; inv uuid; pad int;
begin
  perform public.w_wallet(p_user);
  update public.world_wallet set mattoni = mattoni + p_delta, lifetime = lifetime + greatest(p_delta, 0) where user_id = p_user;
  insert into public.world_log(user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  if p_delta > 0 and p_reason in ('Notte vinta','Missione del giorno','Accesso del giorno','Orda del mondo: premi','Affitti delle tue case','Rinforzi mandati a un alleato') then
    -- 3) spinta di recupero: chi è sotto il livello medio della zona guadagna il 50% in più
    if public.w_boost(p_user) then
      extra := floor(p_delta * 0.5);
      if extra > 0 then
        update public.world_wallet set mattoni = mattoni + extra, lifetime = lifetime + extra where user_id = p_user;
        insert into public.world_log(user_id, delta, reason, ref, seen) values (p_user, extra, 'Spinta di recupero +50%', p_ref, true);
      end if;
    end if;
    -- 6) padrino: nei primi 14 giorni chi ti ha invitato riceve il 10% in più (non lo togliamo a te)
    select q.user_id into inv from public.profili_pubblici p join public.profili_pubblici q on left(q.user_id::text,8) = p.invitato_da
      where p.user_id = p_user and p.invitato_da is not null and q.user_id <> p_user
        and (select created_at from auth.users where id = p_user) > now() - interval '14 days' limit 1;
    pad := floor(p_delta * 0.1);
    if inv is not null and pad > 0 then
      perform public.w_wallet(inv);
      update public.world_wallet set mattoni = mattoni + pad where user_id = inv;
      insert into public.world_log(user_id, delta, reason, ref) values (inv, pad, 'Padrino: il tuo invitato sta giocando', p_ref);
    end if;
  end if;
end $$;
revoke all on function public.w_pay(uuid,int,text,text) from public, anon, authenticated;

-- [C] 5) CASE PIÙ CARE PER CHI NE HA TANTE: +10% per ogni casa già posseduta ---
create or replace function public.w_price2(p_user uuid, p_lat double precision, p_lon double precision) returns int
language sql stable security definer set search_path = public as $$
  select least(9000, round(
    (public.w_price(p_lat,p_lon) + coalesce((select (floor(public.w_km(h.lat,h.lon,p_lat,p_lon)/50)*10)::int from public.world_homes h where h.user_id = p_user),0))
    * (1 + 0.10 * (select count(*) from public.world_buildings b where b.owner = p_user))))::int;
$$;

-- [D] 1) KIT DI BENVENUTO (una volta per account) ----------
create or replace function public.world_welcome() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet;
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  if coalesce((w.caps->>'benvenuto')::int,0) = 1 then return json_build_object('ok',false,'got',0); end if;
  update public.world_wallet set mattoni = mattoni + 300, caps = jsonb_set(caps, '{benvenuto}', '1') where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, 300, 'Kit di benvenuto', true);
  return json_build_object('ok',true,'got',300,'shield',public.w_shielded(me));
end $$;
grant execute on function public.world_welcome() to authenticated;

-- [E] 2) SCUDO DEL NUOVO ARRIVATO nelle orde e nei dispetti ---
create or replace function public.world_send_attack(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int; lost boolean := false;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi attaccare te stesso'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: ha lo scudo del nuovo arrivato'); end if;
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
create or replace function public.world_send_curse(p_target uuid, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); lost boolean := false;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non puoi fare dispetti a te stesso'); end if;
  if p_kind not in ('nebbia','sabotaggio') then return json_build_object('ok',false,'msg','Dispetto non valido'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: ha lo scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato: niente dispetti'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  if (select count(*) from public.world_curses where attacker = me and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok',false,'msg','Oggi hai già fatto 3 dispetti'); end if;
  insert into public.world_curses(attacker, target, slot_id, kind) values (me, p_target, nid, p_kind) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Questo dispetto gliel’hai già fatto per la prossima orda'); end if;
  if public.w_shielded(me) then lost := true; perform public.w_wallet(me); update public.world_wallet set caps = jsonb_set(caps, '{scudo_off}', '1') where user_id = me; end if;
  return json_build_object('ok',true,'msg', (case when p_kind = 'nebbia' then 'Nebbia mandata: −5 alla sua difesa alla prossima orda' else 'Sabotaggio riuscito: se aveva preparato le case, perde il bonus (−15)' end) || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

-- [F] RIVALI con lo scudo visibile ---------------------------
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
  where h.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) and public.w_lvl_of(h.user_id) >= ml.l - 3
  order by abs(public.w_lvl_of(h.user_id) - ml.l), h.changed_at desc limit 30;
$$;
grant execute on function public.world_rivals() to authenticated;

-- [G] 4) LEGHE e STATO PERSONALE -----------------------------
create or replace function public.world_rank_lega(p_period text) returns table(pos bigint, user_id uuid, nick text, wlevel int, punti bigint, comune text, me boolean)
language sql stable security definer set search_path = public as $$
  with lg as (select public.w_league(public.w_lvl_of(auth.uid())) as l),
  base as (
    select w.user_id,
      case when p_period = 'settimana' then coalesce((select sum(x.delta) from public.world_log x where x.user_id = w.user_id and x.delta > 0 and x.created_at > now() - interval '7 days'
                 and x.reason not like 'Regalo%' and x.reason not like 'Prestito%' and x.reason not like 'Restituzione%' and x.reason not like 'Kit%' and x.reason not like 'Padrino%'),0)
           else w.lifetime::bigint end as punti
    from public.world_wallet w, lg where public.w_league(public.w_level(w.lifetime)) = lg.l),
  r as (select row_number() over (order by punti desc, user_id) as pos, user_id, punti from base)
  select r.pos, r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id), r.punti,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = r.user_id), r.user_id = auth.uid()
  from r where r.pos <= 20 or r.user_id = auth.uid() order by r.pos;
$$;
create or replace function public.world_status_extra() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'shield', public.w_shielded(auth.uid()),
    'shield_days', greatest(0, 14 - coalesce((select floor(extract(epoch from now() - created_at)/86400)::int from auth.users where id = auth.uid()), 99)),
    'boost', public.w_boost(auth.uid()),
    'median', public.w_median_near(auth.uid()),
    'wlevel', public.w_lvl_of(auth.uid()),
    'league', public.w_league(public.w_lvl_of(auth.uid())),
    'houses', (select count(*) from public.world_buildings where owner = auth.uid()));
$$;
grant execute on function public.world_rank_lega(text) to authenticated;
grant execute on function public.world_status_extra() to authenticated;
notify pgrst, 'reload schema';
