-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 016 — presidi a 5 km, amministratore del condominio, guida "Cosa fare" (richieste di Alessandro, 14/11)
-- 1) 🚩 PRESIDI ENTRO 5 KM: si scoprono e si occupano fino a 5 km da una tua casa (prima 2,5 e 1 km); per occupare si viaggia
--    col proprio mezzo (portata e ⛽ carburante come per gli assalti). RENDONO IL DOPPIO a ogni orda retta:
--    40 + 4 × orde di fila (max +40) della sua risorsa; municipio, scuola, biblioteca, ospedale 🧱 30 + 2 × orde di fila (max +30).
-- 2) 🏅 AMMINISTRATORE DEL CONDOMINIO (chi ha versato di più negli ultimi 30 giorni): le difese comuni valgono il DOPPIO sulla
--    sua casa (6 invece di 3 per livello) e riceve il 10% in Mattoni di ogni versamento degli altri condomini.
-- 3) 🧭 GUIDA "COSA FARE" (world_consigli): in un colpo solo le minacce sulle tue case e presidi, le richieste di aiuto degli
--    alleati, gli alleati sotto assalto, gli affitti pronti, i presidi liberi vicini e le case dei rivali più facili da assaltare,
--    ognuno con costo e fattibilità (stesso controllo delle azioni vere).
-- Si può eseguire più volte.
-- =====================================================================

-- 1) presidi entro 5 km
create or replace function public.world_presidi_seed(p jsonb) returns json
  language plpgsql security definer set search_path to 'public' as $_$
declare me uuid := auth.uid(); e jsonb; n int := 0; c int; la double precision; lo double precision;
begin
  if me is null or jsonb_typeof(p) is distinct from 'array' then return json_build_object('ok', false, 'nuovi', 0); end if;
  for e in select value from jsonb_array_elements(p) limit 60 loop
    begin la := (e->>'lat')::double precision; lo := (e->>'lon')::double precision; exception when others then continue; end;
    if la is null or lo is null or coalesce(e->>'id', '') !~ '^osm:[nwr][0-9]{1,12}$'
       or coalesce(e->>'kind', '') not in ('parco','piazza','stazione','municipio','biblioteca','scuola','ospedale','pompieri','polizia','chiesa','centro','sport')
       or length(trim(coalesce(e->>'name', ''))) not between 2 and 80
       or not public.w_pres_near(me, la, lo, 5.0) then continue; end if;
    insert into public.world_presidi(id, name, kind, lat, lon, created_by)
    values (e->>'id', trim(e->>'name'), e->>'kind', la, lo, me) on conflict (id) do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return json_build_object('ok', true, 'nuovi', n);
end $_$;

create or replace function public.world_presidio_occupa(p_id text) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); p public.world_presidi; d double precision; mz text; mzp text; c int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per occupare un presidio'); end if;
  perform public.w_pres_tick();
  select * into p from public.world_presidi where id = p_id for update;
  if p.id is null then return json_build_object('ok', false, 'msg', 'Presidio non trovato'); end if;
  if p.holder is not null then return json_build_object('ok', false, 'msg', case when p.holder = me then 'Lo tieni già tu' else 'È già tenuto: assaltalo, oppure aspetta che l''orda lo faccia cadere' end); end if;
  d := public.w_dist_pt(me, p.lat, p.lon);
  if d is null or d > 5 then return json_build_object('ok', false, 'msg', 'Serve una tua casa entro 5 km dal presidio'); end if;
  if (select count(*) from public.world_presidi where holder = me) >= 3 then return json_build_object('ok', false, 'msg', 'Tieni già 3 presidi: lasciane uno per occuparne un altro'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); c := public.w_mz_carb(mz, d);
  if d > public.w_mz_range(mz) then
    return json_build_object('ok', false, 'msg', 'È a ' || round(d::numeric,1) || ' km: ' || public.w_mz_nome(mz) || ' arrivi fino a ' || public.w_mz_range(mz) || ' km'
      || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ')' else '. Un mezzo più veloce in Bottega' end); end if;
  update public.world_wallet set carb = carb - c where user_id = me and carb >= c;
  if not found then return json_build_object('ok', false, 'msg', 'Servono ⛽ ' || c); end if;
  update public.world_presidi set holder = me, held_since = now(), record = 0, ultimo_slot = public.w_slot_id(public.w_prev_slot(now())) where id = p_id;
  insert into public.world_presidi_tenute(presidio_id, user_id, dal) values (p_id, me, now());
  return json_build_object('ok', true, 'msg', '🚩 Presidio occupato ' || public.w_mz_nome(mz) || case when c > 0 then ' (⛽ −' || c || ')' else '' end
    || '! Dalla prossima orda dà +3 di difesa alle case entro 500 m e a ogni orda retta ti dà la sua risorsa');
end $$;

create or replace function public.w_pres_rendita(p_user uuid, p_kind text, p_record integer) returns void
  language plpgsql security definer set search_path to 'public' as $$
declare r int := greatest(coalesce(p_record,1),1); a int := 40 + least(40, 4 * greatest(coalesce(p_record,1),1));
begin
  if p_user is null then return; end if;
  if p_kind in ('parco','sport') then perform public.w_res(p_user, a, 0, 0);
  elsif p_kind in ('piazza','centro','chiesa') then perform public.w_res(p_user, 0, a, 0);
  elsif p_kind in ('stazione','polizia','pompieri') then perform public.w_res(p_user, 0, 0, a);
  else perform public.w_pay(p_user, 30 + least(30, 2 * r), 'Presidio tenuto'); end if;
end $$;

-- 2) amministratore del condominio
create or replace function public.w_condo_admin(p_ckey text) returns uuid
  language sql stable security definer set search_path to 'public' as $$
  select g.user_id from public.world_condo_gifts g where g.ckey = p_ckey and g.created_at > now() - interval '30 days' and g.user_id is not null
  group by g.user_id order by sum(g.amount) desc, g.user_id limit 1; $$;
revoke all on function public.w_condo_admin(text) from public, anon, authenticated;

create or replace function public.w_condo_bonus(p_user uuid) returns integer
  language sql stable security definer set search_path to 'public' as $$
  with k as (select public.w_condo_key(p_user) as ck)
  select case when exists (select 1 from public.world_condo_gifts g, k where g.ckey = k.ck and g.user_id = p_user and g.created_at > now() - interval '30 days')
    then (coalesce((select 3 * sum(c.level) from public.world_condo c, k where c.ckey = k.ck), 0)
          * case when (select public.w_condo_admin(ck) from k) = p_user then 2 else 1 end)::int else 0 end; $$;

create or replace function public.world_condo_give(p_kind text, p_amount integer) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k text := public.w_condo_key(auth.uid()); w public.world_wallet; c public.world_condo; ups int := 0; adm uuid; fee int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if k is null then return json_build_object('ok',false,'msg','Solo per chi abita in un condominio'); end if;
  if p_kind not in ('portone','cancello','telecamere') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if p_amount < 10 or p_amount > 500 then return json_build_object('ok',false,'msg','Da 10 a 500 Mattoni'); end if;
  w := public.w_wallet(me); if w.mattoni < p_amount then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
  adm := public.w_condo_admin(k);
  insert into public.world_condo(ckey, kind) values (k, p_kind) on conflict do nothing;
  select * into c from public.world_condo where ckey = k and kind = p_kind for update;
  if c.level >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  update public.world_wallet set mattoni = mattoni - p_amount where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -p_amount, 'Condominio: '||p_kind, k, true);
  insert into public.world_condo_gifts(ckey, kind, user_id, amount) values (k, p_kind, me, p_amount);
  c.pot := c.pot + p_amount;
  while c.level < 3 and c.pot >= 240 * (c.level + 1) loop c.pot := c.pot - 240 * (c.level + 1); c.level := c.level + 1; ups := ups + 1; end loop;
  update public.world_condo set level = c.level, pot = c.pot where ckey = k and kind = p_kind;
  -- compenso dell'amministratore (chi lo era prima di questo versamento): 10%
  fee := floor(p_amount * 0.10);
  if adm is not null and adm <> me and fee > 0 then perform public.w_pay(adm, fee, 'Compenso da amministratore del condominio'); end if;
  return json_build_object('ok',true,'level',c.level,'pot',c.pot,'up',ups,
    'msg', case when ups > 0 then 'Il condominio sale al livello '||c.level||'!' else 'Grazie! Contributo versato' end);
end $$;

-- world_condo_info: in più quanto vale per me il bonus e chi è l'amministratore
create or replace function public.world_condo_info() returns json
  language sql stable security definer set search_path to 'public' as $$
  with k as (select public.w_condo_key(auth.uid()) as ck),
  v as (select g.user_id, sum(g.amount)::int as tot from public.world_condo_gifts g, k where g.ckey = k.ck and g.created_at > now() - interval '30 days' and g.user_id is not null group by g.user_id),
  nb as (select distinct h.user_id, h.unit from public.world_homes h, k where k.ck is not null and h.kind = 'condominio' and h.user_id <> auth.uid()
           and public.w_condo_key(h.user_id) = k.ck)
  select case when auth.uid() is null or (select ck from k) is null then json_build_object('ok', false)
  else json_build_object('ok', true,
    'admin', (select json_build_object('user_id', v.user_id, 'nick', public.w_nick(v.user_id), 'tot', v.tot) from v order by v.tot desc, v.user_id limit 1),
    'sono_admin', (select public.w_condo_admin(ck) from k) = auth.uid(),
    'versati', coalesce((select json_agg(json_build_object('nick', public.w_nick(v.user_id), 'tot', v.tot, 'me', v.user_id = auth.uid()) order by v.tot desc) from v), '[]'::json),
    'me_tot', coalesce((select tot from v where user_id = auth.uid()), 0),
    'bonus', public.w_condo_bonus(auth.uid()),
    'vicini', coalesce((select json_agg(json_build_object('user_id', nb.user_id, 'nick', public.w_nick(nb.user_id), 'unit', nb.unit,
        'rotto', public.w_rift(auth.uid(), nb.user_id),
        'rotto_da_me', exists (select 1 from public.world_condo_rifts r where r.a = auth.uid() and r.b = nb.user_id),
        'pace_chiesta', exists (select 1 from public.world_condo_rifts r where (r.a = auth.uid() and r.b = nb.user_id and r.b_wants_peace) or (r.a = nb.user_id and r.b = auth.uid() and r.b_wants_peace)),
        'puo_rompere', public.w_condo_vicini(auth.uid(), nb.user_id)) order by nb.unit) from nb), '[]'::json)) end; $$;

-- 3) 🧭 guida "Cosa fare"
create or replace function public.world_consigli() returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; rate int; hrs double precision;
  minacce json; richieste json; alleati json; presidi json; bersagli json; c record;
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_assalti_tick(); perform public.w_pres_tick();
  w := public.w_wallet(me);
  -- assalti in arrivo sulle mie case e sui miei presidi
  select coalesce(json_agg(x order by x.atk desc), '[]'::json) into minacce from (
    select a.bid, case when a.bid like 'pres:%' then 'pres' when exists (select 1 from public.world_homes h where h.building_id = a.bid and h.user_id = me) then 'home' else 'owned' end as tipo,
      coalesce((select p.name from public.world_presidi p where 'pres:' || p.id = a.bid), '') as nome,
      coalesce((select b.lat from public.world_buildings b where b.building_id = a.bid), (select h.lat from public.world_homes h where h.building_id = a.bid limit 1), (select p.lat from public.world_presidi p where 'pres:' || p.id = a.bid)) as lat,
      coalesce((select b.lon from public.world_buildings b where b.building_id = a.bid), (select h.lon from public.world_homes h where h.building_id = a.bid limit 1), (select p.lon from public.world_presidi p where 'pres:' || p.id = a.bid)) as lon,
      least(40, sum(a.pts) filter (where a.kind = 'atk'))::int as atk, count(*) filter (where a.kind = 'atk')::int as n,
      least(24, coalesce(sum(a.pts) filter (where a.kind = 'aiuto'), 0))::int as aiuti, least(18, coalesce(sum(a.pts) filter (where a.kind = 'assi'), 0))::int as assi
    from public.world_assalti a
    where a.slot_id = nid and (a.bid in (select building_id from public.world_buildings where owner = me) or a.bid in (select building_id from public.world_homes where user_id = me)
           or a.bid in (select 'pres:' || id from public.world_presidi where holder = me))
    group by a.bid having count(*) filter (where a.kind = 'atk') > 0) x;
  -- alleati che chiedono aiuto per la prossima orda (e non li ho ancora aiutati)
  select coalesce(json_agg(x order by x.dist_km), '[]'::json) into richieste from (
    select h.user_id, public.w_nick(h.user_id) as nick, round(public.w_dist_km(me, h.user_id)::numeric, 1) as dist_km,
      public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0)) as mezzo,
      public.w_mz_carb(public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0)), public.w_dist_km(me, h.user_id)) as carb,
      coalesce(public.w_dist_km(me, h.user_id), 99) <= public.w_mz_range(public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0))) as arrivo,
      public.w_mz_help(public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0))) + public.w_dot(me) as pts
    from public.world_help h
    where h.slot_id = nid and h.user_id <> me and public.w_are_allies(me, h.user_id)
      and not exists (select 1 from public.world_help_given g where g.helper = me and g.target = h.user_id and g.slot_id >= nid)
    limit 6) x;
  -- edifici e presidi degli alleati sotto assalto
  select coalesce(json_agg(x), '[]'::json) into alleati from (
    select t.bid, t.owner, public.w_nick(t.owner) as nick, t.tipo, t.lat, t.lon, t.atk,
      public.w_azione(me, t.bid, t.lat, t.lon, 'aiuto') as aiuto
    from (select a.bid, coalesce(b.owner, p.holder) as owner, case when p.id is not null then 'pres' else 'owned' end as tipo,
            coalesce(b.lat, p.lat) as lat, coalesce(b.lon, p.lon) as lon, least(40, sum(a.pts))::int as atk
          from public.world_assalti a left join public.world_buildings b on b.building_id = a.bid left join public.world_presidi p on 'pres:' || p.id = a.bid
          where a.slot_id = nid and a.kind = 'atk' and coalesce(b.owner, p.holder) is not null and coalesce(b.owner, p.holder) <> me
            and public.w_are_allies(me, coalesce(b.owner, p.holder))
          group by a.bid, b.owner, p.holder, p.id, b.lat, p.lat, b.lon, p.lon) t
    where not exists (select 1 from public.world_assalti z where z.bid = t.bid and z.user_id = me and z.slot_id >= nid and z.kind = 'aiuto')
    limit 4) x;
  -- presidi liberi entro 5 km
  select coalesce(json_agg(x order by x.dist_km), '[]'::json) into presidi from (
    select p.id, p.name, p.kind, p.lat, p.lon, round(public.w_dist_pt(me, p.lat, p.lon)::numeric, 1) as dist_km,
      public.w_mz_carb(public.w_mz_eff(me, public.w_dist_pt(me, p.lat, p.lon)), public.w_dist_pt(me, p.lat, p.lon)) as carb
    from public.world_presidi p
    where p.holder is null and public.w_pres_near(me, p.lat, p.lon, 5.0)
    order by public.w_dist_pt(me, p.lat, p.lon) limit 3) x;
  -- case dei rivali più facili (livello basso, poche fortificazioni, vicine) che posso davvero assaltare
  select coalesce(json_agg(x), '[]'::json) into bersagli from (
    select y.building_id as bid, y.lat, y.lon, y.level, public.w_nick(y.owner) as nick, y.dist_km, public.w_fort(y.building_id) as fort,
      public.w_azione(me, y.building_id, y.lat, y.lon, 'atk') as atk
    from (select b.*, round(public.w_dist_pt(me, b.lat, b.lon)::numeric, 1) as dist_km from public.world_buildings b, public.world_homes h
          where h.user_id = me and b.owner is not null and b.owner <> me
            and b.lat between h.lat - 0.1 and h.lat + 0.1 and b.lon between h.lon - 0.14 and h.lon + 0.14
            and not public.w_are_allies(me, b.owner) and not public.w_shielded(b.owner)) y
    where y.dist_km <= 12
    order by y.level, public.w_fort(y.building_id), y.dist_km limit 3) x;
  select coalesce(sum(5 + 5*level + public.w_price(lat, lon) / 100),0) into rate from public.world_buildings where owner = me;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  return json_build_object('ok', true, 'slot', nid, 'minacce', minacce, 'richieste', richieste, 'alleati', alleati, 'presidi', presidi, 'bersagli', bersagli,
    'affitti', floor(rate * hrs / 24.0)::int, 'miei_presidi', (select count(*) from public.world_presidi where holder = me),
    'asked', exists (select 1 from public.world_help where user_id = me and slot_id = nid),
    'risorse', json_build_object('mattoni', w.mattoni, 'legno', w.legno, 'cibo', w.cibo, 'carb', w.carb));
end $$;
revoke all on function public.world_consigli() from public, anon;
grant execute on function public.world_consigli() to authenticated;

-- controllo: deve dire "presidi e guida pronti"
select case when exists (select 1 from pg_proc where proname = 'world_consigli') and exists (select 1 from pg_proc where proname = 'w_condo_admin')
             and exists (select 1 from pg_proc where proname = 'w_pres_rendita' and prosrc like '%40 + least(40%')
       then 'presidi e guida pronti' else 'qualcosa manca' end as esito;
