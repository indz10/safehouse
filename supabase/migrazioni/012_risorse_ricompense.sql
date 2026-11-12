-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 012 — risorse e ricompense nuove (gioco di strategia sul mondo reale, scelte di Alessandro 12/11)
-- 1) RISORSE: accanto ai 🧱 Mattoni arrivano 🪵 Legno, 🥫 Cibo, ⛽ Carburante (world_wallet.legno/cibo/carb).
--    Le dà solo il server (w_res), al massimo 400 al giorno per risorsa. Serviranno per costruire (prossime fasi);
--    subito: il Mercato in Bottega (world_trade) scambia 20 di una risorsa con 10 Mattoni, max 100 Mattoni al giorno.
-- 2) RICOMPENSE (premiare presidi, orde, alleati, rivali):
--      orda, ogni casa che tiene    🧱 10 + 6 × livello (prima 8 + 4 ×), più 🪵 4 e 🥫 6; casa sfondata 🧱 3 (prima 2)
--      orda mandata a segno         🧱 35 (prima 25) più ⛽ 10
--      rinforzi a un alleato        🧱 10 (prima 5) più 🥫 5 (sempre max 5 al giorno)
--      presidio tenuto a ogni orda  20 + 2 × orde di fila (max +20) della sua risorsa:
--                                   parco, sport → 🪵 · piazza, centro, chiesa → 🥫 · stazione, polizia, pompieri → ⛽
--                                   municipio, scuola, biblioteca, ospedale → 🧱 15 + orde di fila (max +15)
--      accesso del giorno           🧱 20 (come prima) più 🪵 10, 🥫 10, ⛽ 5
--      casa vera valutata           🧱 200 (come prima) più 🪵 50, 🥫 50, ⛽ 30
-- Si può eseguire più volte.
-- =====================================================================

alter table public.world_wallet add column if not exists legno int not null default 0;
alter table public.world_wallet add column if not exists cibo int not null default 0;
alter table public.world_wallet add column if not exists carb int not null default 0;

-- dà risorse con il tetto di 400 al giorno per risorsa; restituisce quante ne ha date davvero
create or replace function public.w_res(p_user uuid, p_legno int, p_cibo int, p_carb int) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  gl int; gc int; gf int;
begin
  if p_user is null then return json_build_object('legno',0,'cibo',0,'carb',0); end if;
  w := public.w_wallet(p_user);
  gl := least(greatest(coalesce(p_legno,0),0), 400 - coalesce((w.caps->>('res:legno:'||day))::int,0));
  gc := least(greatest(coalesce(p_cibo,0),0),  400 - coalesce((w.caps->>('res:cibo:'||day))::int,0));
  gf := least(greatest(coalesce(p_carb,0),0),  400 - coalesce((w.caps->>('res:carb:'||day))::int,0));
  gl := greatest(gl,0); gc := greatest(gc,0); gf := greatest(gf,0);
  if gl + gc + gf = 0 then return json_build_object('legno',0,'cibo',0,'carb',0); end if;
  update public.world_wallet set legno = legno + gl, cibo = cibo + gc, carb = carb + gf,
    caps = caps || jsonb_build_object('res:legno:'||day, coalesce((w.caps->>('res:legno:'||day))::int,0) + gl,
                                      'res:cibo:'||day,  coalesce((w.caps->>('res:cibo:'||day))::int,0) + gc,
                                      'res:carb:'||day,  coalesce((w.caps->>('res:carb:'||day))::int,0) + gf)
    where user_id = p_user;
  return json_build_object('legno',gl,'cibo',gc,'carb',gf);
end $$;
revoke all on function public.w_res(uuid, int, int, int) from public, anon, authenticated;

-- rendita di un presidio tenuto a un'orda
create or replace function public.w_pres_rendita(p_user uuid, p_kind text, p_record int) returns void
  language plpgsql security definer set search_path to 'public' as $$
declare a int := 20 + least(20, 2 * greatest(coalesce(p_record,1),1));
begin
  if p_user is null then return; end if;
  if p_kind in ('parco','sport') then perform public.w_res(p_user, a, 0, 0);
  elsif p_kind in ('piazza','centro','chiesa') then perform public.w_res(p_user, 0, a, 0);
  elsif p_kind in ('stazione','polizia','pompieri') then perform public.w_res(p_user, 0, 0, a);
  else perform public.w_pay(p_user, 15 + least(15, greatest(coalesce(p_record,1),1)), 'Presidio tenuto'); end if;
end $$;
revoke all on function public.w_pres_rendita(uuid, text, int) from public, anon, authenticated;

-- le mie risorse
create or replace function public.world_resources() returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  return json_build_object('ok',true,'mattoni',w.mattoni,'legno',w.legno,'cibo',w.cibo,'carb',w.carb,
    'mercato_left', 100 - coalesce((w.caps->>('mercato:'||day))::int,0));
end $$;

-- 🔄 Mercato: 20 di una risorsa = 10 Mattoni, al massimo 100 Mattoni al giorno
create or replace function public.world_trade(p_kind text, p_n int) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  have int; done int; m int; n int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('legno','cibo','carb') then return json_build_object('ok',false,'msg','Risorsa sconosciuta'); end if;
  w := public.w_wallet(me);
  have := case p_kind when 'legno' then w.legno when 'cibo' then w.cibo else w.carb end;
  done := coalesce((w.caps->>('mercato:'||day))::int,0);
  n := (least(greatest(coalesce(p_n,0),0), have) / 20) * 20;
  m := least(n / 2, 100 - done); n := m * 2;
  if n <= 0 then return json_build_object('ok',false,'msg', case when done >= 100 then 'Oggi hai già scambiato il massimo (100 Mattoni)' else 'Servono almeno 20 di quella risorsa' end); end if;
  update public.world_wallet set
    legno = legno - case when p_kind = 'legno' then n else 0 end,
    cibo  = cibo  - case when p_kind = 'cibo'  then n else 0 end,
    carb  = carb  - case when p_kind = 'carb'  then n else 0 end,
    caps = jsonb_set(caps, array['mercato:'||day], to_jsonb(done + m))
    where user_id = me;
  perform public.w_pay(me, m, 'Mercato: risorse scambiate');
  return json_build_object('ok',true,'dato',n,'mattoni',m,'mercato_left',100 - done - m);
end $$;

-- ricompense ritoccate (stesse funzioni di prima, numeri nuovi + risorse)
create or replace function public.world_raid_status() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); lvl int; bon int; cb int; res json; held int; tot int; matt int; bounty int;
begin
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me); lvl := public.w_level(w.lifetime); bon := public.w_upower(me, pid); cb := public.w_condo_bonus(me);
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack3(pid,x.building_id,lvl),'power',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home),
           'held',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl))),'[]'::json),
         count(*) filter (where public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl)), count(*),
         coalesce(sum(case when public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl) then 10 + 6*x.level else 3 end),0)
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
    'next_bonus', public.w_upower(me, nid));
end $$;

create or replace function public.world_raid_claim() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; s json; pid text; r json;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  s := public.world_raid_status(); pid := s->>'prev_id';
  w := public.w_wallet(me);
  if coalesce((w.caps->>('raid:'||pid))::int,0) = 1 then return json_build_object('ok',false,'msg','Premi di questa orda già riscattati'); end if;
  if (s->>'total')::int = 0 and (s->>'bounty')::int = 0 then return json_build_object('ok',false,'msg','Nessuna tua casa era nel mondo durante questa orda'); end if;
  update public.world_wallet set caps = jsonb_set(caps, array['raid:'||pid], '1') where user_id = me;
  perform public.w_pay(me, (s->>'mattoni')::int, 'Orda del mondo: premi');
  r := public.w_res(me, coalesce((s->>'legno')::int,0), coalesce((s->>'cibo')::int,0), coalesce((s->>'carb')::int,0));
  update public.world_log set seen = true where user_id = me and reason = 'Orda del mondo: premi' and not seen;
  return json_build_object('ok',true,'held',(s->>'held')::int,'total',(s->>'total')::int,'mattoni',(s->>'mattoni')::int,'bounty',(s->>'bounty')::int,
    'legno',coalesce((r->>'legno')::int,0),'cibo',coalesce((r->>'cibo')::int,0),'carb',coalesce((r->>'carb')::int,0));
end $$;

create or replace function public.world_send_help(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    perform public.w_pay(me, 10, 'Rinforzi mandati a un alleato');
    perform public.w_res(me, 0, 5, 0);
    update public.world_log set seen = true where user_id = me and reason = 'Rinforzi mandati a un alleato' and not seen;
  end if;
  return json_build_object('ok',true,'msg','Rinforzi in viaggio: arrivano tra ' || eta || ' min, ' || quando || '. +' || v || ' alla sua difesa' || case when n < 5 then ', +10 Mattoni e 🥫 5 a te' else '' end,
    'got', case when n < 5 then 10 else 0 end, 'eta_min', eta, 'slot', sid, 'pts', v);
end $$;

create or replace function public.w_pres_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare pt timestamptz := public.w_prev_slot(now()); pid text := public.w_slot_id(public.w_prev_slot(now())); p record; n int := 0;
begin
  for p in select * from public.world_presidi where holder is not null and coalesce(ultimo_slot, '') < pid and held_since < pt for update skip locked loop
    if public.w_pres_def(p.id, pid) >= public.w_pres_attack(pid, p.id) then
      update public.world_presidi set ultimo_slot = pid, record = record + 1 where id = p.id;
      perform public.w_pres_rendita(p.holder, p.kind, p.record + 1);
    else
      update public.world_presidi set ultimo_slot = pid, holder = null, held_since = null, record = 0, perso_da = p.holder, perso_il = pt where id = p.id;
      update public.world_presidi_tenute set al = pt where presidio_id = p.id and al is null;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.world_earn(p_reason text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  k text; n int; lim int; amt int; got int := 0; c int; done int;
begin
  if me is null then return json_build_object('ok',false,'msg','accedi'); end if;
  w := public.w_wallet(me);
  if p_reason in ('notte','missione','login') then
    lim := case p_reason when 'notte' then 5 when 'missione' then 3 else 1 end;
    amt := case p_reason when 'notte' then 10 when 'missione' then 15 else 20 end;
    k := p_reason || ':' || day;
    n := coalesce((w.caps->>k)::int, 0);
    if n >= lim then return json_build_object('ok',false,'msg','limite di oggi raggiunto','mattoni',w.mattoni); end if;
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, amt, case p_reason when 'notte' then 'Notte vinta' when 'missione' then 'Missione del giorno' else 'Accesso del giorno' end);
    got := amt;
    if p_reason = 'login' then perform public.w_res(me, 10, 10, 5); end if;
  elsif p_reason = 'verifica' then
    -- valutazione della casa (una volta)
    if coalesce((w.caps->>'valutazione')::int,0) = 0 and exists (select 1 from public.profili_pubblici where user_id = me and indice is not null) then
      update public.world_wallet set caps = jsonb_set(caps, '{valutazione}', '1') where user_id = me;
      perform public.w_pay(me, 200, 'Casa vera valutata'); got := got + 200;
      perform public.w_res(me, 50, 50, 30);
    end if;
    -- codici sconto usati davvero in negozio
    select count(*) into c from public.coupons where user_id = me and redeemed_at is not null;
    done := coalesce((w.caps->>'codici')::int,0);
    if c > done then
      update public.world_wallet set caps = jsonb_set(caps, '{codici}', to_jsonb(c)) where user_id = me;
      perform public.w_pay(me, (c-done)*100, 'Codice sconto usato in negozio'); got := got + (c-done)*100;
    end if;
    -- amici invitati che hanno valutato la casa
    select count(*) into c from public.profili_pubblici where invitato_da = left(me::text,8) and user_id <> me and indice is not null;
    done := coalesce((w.caps->>'inviti')::int,0);
    if c > done then
      update public.world_wallet set caps = jsonb_set(caps, '{inviti}', to_jsonb(c)) where user_id = me;
      perform public.w_pay(me, (c-done)*150, 'Amico invitato ha valutato la casa'); got := got + (c-done)*150;
    end if;
  end if;
  select * into w from public.world_wallet where user_id = me;
  return json_build_object('ok', got > 0, 'got', got, 'mattoni', w.mattoni);
end $$;

revoke all on function public.world_resources() from public, anon;
grant execute on function public.world_resources() to authenticated;
revoke all on function public.world_trade(text, int) from public, anon;
grant execute on function public.world_trade(text, int) to authenticated;

select 'risorse pronte' as fatto;
