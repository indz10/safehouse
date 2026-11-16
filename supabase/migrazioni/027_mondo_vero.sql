-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 027 — 🌍 IL MONDO VERO, SPIEGATO (Fase 30, richiesta di Alessandro 16/11)
-- "In base a dove abito o dove sono, farmacie e supermercati mi danno vantaggi. Ci vado col superstite digitale
--  (consumo scorte) oppure di persona con la Lente (gratis). Notifiche per usare la Lente. Se abbatto uno zombie
--  vicino alla casa di un altro superstite, a lui arriva la notifica che l'ho aiutato. Alleanze per zona: se compro
--  casa a New York vicino a un amico posso entrare nella sua alleanza; se non ho casa lì, gli mando aiuti da qua
--  usando più risorse."
--  1) 📍 POSTI VERI DI PERSONA: world_posto_visita — sei a meno di 50 m (GPS) da un posto vero → prendi il vantaggio
--     GRATIS (niente energia, niente scorte); ogni posto una volta ogni 12 ore, massimo 12 al giorno.
--  2) 🎒 COL SUPERSTITE: le spedizioni ora consumano scorte per il viaggio (w_sped_costo): 🥫 2 + km, e ⛽ oltre 3 km.
--  3) 🛡️ HAI PROTETTO UN VICINO: zombie abbattuto a meno di 200 m dalla casa di un altro superstite → novità
--     "zm_aiuto" per lui (notifica), al massimo una ogni 3 ore da te a lui.
--  4) 📷 "APRI LA LENTE": w_lente_tick (dal giro delle notifiche): tra le 10 e le 20, al massimo ogni 8 ore, a chi ha
--     zombie o casse a meno di ~300 m da casa → novità "lente".
--  5) 📦 AIUTI DA LONTANO: un alleato fuori dalla portata del tuo mezzo (anche in un altro continente) si aiuta con un
--     pacco (world_aiuto_lontano): costa di più (🥫 20, ⛽ 10 + 1 ogni 250 km fino a 50, 🧱 25), vale +6 alla sua
--     difesa e arriva all'orda dopo almeno 3 ore; massimo 2 al giorno. world_send_help ora lo propone da solo.
-- Le alleanze per zona c'erano già (migrazione 019): si entra con una casa (vera o comprata) a meno di 50 km da un
-- membro, e non si può stare in due alleanze nella stessa zona.
-- Richiede le migrazioni 020–026. Si può eseguire più volte.
-- =====================================================================

alter table public.sponsor_events drop constraint if exists sponsor_events_kind_check;
alter table public.sponsor_events add constraint sponsor_events_kind_check check (kind in ('vista_mappa','vista_verdetto','vista_gioco','scheda','chiama','whatsapp','indicazioni','sito','codice_creato','codice_usato','preventivo','spedizione','visita'));

-- ---------- 1) 📍 posti veri di persona ----------
create table if not exists public.world_posti_visite (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chiave text not null,
  kind text not null,
  nome text,
  at timestamptz not null default now()
);
alter table public.world_posti_visite enable row level security;
create index if not exists world_posti_visite_user on public.world_posti_visite(user_id, at desc);

create or replace function public.world_posto_visita(p_kind text, p_nome text, p_lat double precision, p_lon double precision,
  p_mylat double precision, p_mylon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); spid uuid; d numeric; ch text; s public.world_superstite; g int; b int; l int := 0; f int := 0; k int := 0; e int := 0;
  xp int; got json; oggi int; g0 int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_kind not in ('cibo','legno','carb','farmaco','misto','sponsor') then return json_build_object('ok', false, 'msg', 'Posto sconosciuto'); end if;
  if p_lat is null or p_mylat is null then return json_build_object('ok', false, 'msg', 'Serve la posizione: permetti il GPS'); end if;
  d := public.w_km(p_mylat, p_mylon, p_lat, p_lon);
  if d > 0.05 then return json_build_object('ok', false, 'msg', format('Avvicinati: sei a %s m (serve meno di 50 m)', round(d * 1000))); end if;
  if p_kind = 'sponsor' then
    select sp.id into spid from public.sponsors sp where sp.active and sp.lat is not null
      and public.w_km(p_lat, p_lon, sp.lat, sp.lon) < 0.06 order by public.w_km(p_lat, p_lon, sp.lat, sp.lon) limit 1;
    if spid is null then return json_build_object('ok', false, 'msg', 'Questa attività non è più sponsor'); end if;
  end if;
  ch := round(p_lat * 2500)::text || ':' || round(p_lon * 2000)::text;
  if exists (select 1 from public.world_posti_visite where user_id = me and chiave = ch and at > now() - interval '12 hours') then
    return json_build_object('ok', false, 'msg', 'Ci sei già passato: il posto si riempie di nuovo fra 12 ore');
  end if;
  select count(*) into oggi from public.world_posti_visite where user_id = me
    and (at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date;
  if oggi >= 12 then return json_build_object('ok', false, 'msg', 'Oggi hai già visitato 12 posti: torna domani'); end if;
  insert into public.world_posti_visite(user_id, chiave, kind, nome) values (me, ch, p_kind, left(coalesce(p_nome, ''), 60));
  s := public.w_sup(me); g0 := public.w_grado(s.xp); g := g0;
  b := 15 + least(15, g) + case when p_kind = 'sponsor' then 8 else 0 end;
  case p_kind
    when 'cibo' then f := b;
    when 'legno' then l := b;
    when 'carb' then k := round(b * 0.6);
    when 'farmaco' then f := b / 2; e := 2;
    when 'sponsor' then l := b / 2; f := b / 2; k := b / 3;
    else l := b / 3; f := b / 3; k := b / 3;
  end case;
  got := public.w_res(me, l, f, k);
  if e > 0 then perform public.w_en_add(me, e); end if;
  xp := 15 + case when p_kind = 'sponsor' then 5 else 0 end;
  perform public.w_xp(me, xp);
  if spid is not null then insert into public.sponsor_events(sponsor_id, kind) values (spid, 'visita'); end if;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'energia', e, 'xp', xp,
    'rimasti', 11 - oggi, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp));
end $$;

-- ---------- 2) 🎒 col superstite: costo in scorte del viaggio ----------
create or replace function public.w_sped_costo(p_km numeric) returns json language sql immutable as $$
  select json_build_object('cibo', (2 + ceil(p_km))::int, 'carb', case when p_km > 3 then ceil(p_km / 3)::int else 0 end); $$;

create or replace function public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; spid uuid; km numeric; c json; en int; mins int; h int; nid bigint; notte boolean;
  co json; cc int; ck int; w public.world_wallet;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_kind not in ('cibo','legno','carb','farmaco','misto','sponsor') then return json_build_object('ok', false, 'msg', 'Posto sconosciuto'); end if;
  if p_kind = 'sponsor' then
    select sp.id into spid from public.sponsors sp where sp.active and sp.lat is not null
      and public.w_km(p_lat, p_lon, sp.lat, sp.lon) < 0.06 order by public.w_km(p_lat, p_lon, sp.lat, sp.lon) limit 1;
    if spid is null then return json_build_object('ok', false, 'msg', 'Questa attività non è più sponsor: scegli un altro posto'); end if;
  end if;
  if p_lat is null or p_lon is null then return json_build_object('ok', false, 'msg', 'Posto senza posizione'); end if;
  s := public.w_sup(me);
  km := public.w_sped_km(me, p_lat, p_lon);
  if km is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo: le spedizioni partono da lì'); end if;
  km := greatest(0.2, km);
  if km > public.w_sup_raggio(s.xp, s.abil) then
    return json_build_object('ok', false, 'msg', format('È a %s km: il tuo raggio è %s km (sali di grado o usa 🧭 Esploratore)', km, public.w_sup_raggio(s.xp, s.abil)));
  end if;
  if (select count(*) from public.world_spedizioni where user_id = me and stato = 'via') >= 1 + public.w_eq(s.equip, 'radio') then
    return json_build_object('ok', false, 'msg', 'La squadra è già fuori: raccogli prima chi è tornato (📻 la Radio ne fa partire di più)');
  end if;
  if exists (select 1 from public.world_spedizioni where user_id = me and abs(lat - p_lat) < 0.0003 and abs(lon - p_lon) < 0.0004 and start_at > now() - interval '12 hours') then
    return json_build_object('ok', false, 'msg', 'Ci sei già stato: il posto si riempie di nuovo fra 12 ore');
  end if;
  h := extract(hour from now() at time zone 'Europe/Rome'); notte := h >= 20 or h < 7;
  c := public.w_sped_calc(km, s.abil, s.equip, notte);
  en := (c->>'energia')::int; mins := (c->>'min')::int;
  if s.energia < en then
    return json_build_object('ok', false, 'msg', format('Serve %s energia: ne hai %s (una carica ogni %s min)', en, s.energia, public.w_en_ric(s.abil)));
  end if;
  co := public.w_sped_costo(km); cc := (co->>'cibo')::int; ck := (co->>'carb')::int;
  w := public.w_wallet(me);
  if w.cibo < cc or w.carb < ck then
    return json_build_object('ok', false, 'msg', format('Per il viaggio servono 🥫 %s%s: vai di persona con la Lente (gratis) o prendi scorte', cc, case when ck > 0 then ' e ⛽ ' || ck else '' end));
  end if;
  update public.world_wallet set cibo = cibo - cc, carb = carb - ck where user_id = me;
  update public.world_superstite set energia = energia - en,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  insert into public.world_spedizioni(user_id, kind, nome, lat, lon, km, end_at, rischio, energia, calc)
    values (me, p_kind, left(coalesce(nullif(trim(p_nome), ''), 'Posto senza nome'), 60), p_lat, p_lon, km, now() + make_interval(mins => mins), (c->>'rischio')::int, en, (c::jsonb || co::jsonb))
    returning world_spedizioni.id into nid;
  if spid is not null then
    update public.world_spedizioni set calc = calc || jsonb_build_object('sponsor', spid) where id = nid;
    insert into public.sponsor_events(sponsor_id, kind) values (spid, 'spedizione');
  end if;
  return json_build_object('ok', true, 'id', nid, 'min', mins, 'energia', en, 'cibo', cc, 'carb', ck, 'end_at', now() + make_interval(mins => mins),
    'msg', format('🎒 Partito! Torna fra %s min · 🥫 −%s%s', mins, cc, case when ck > 0 then ' ⛽ −' || ck else '' end));
end $$;

-- ---------- 3) 🛡️ zombie abbattuto vicino alla casa di un altro: lui lo sa ----------
create or replace function public.world_zombie_fine(p_id bigint, p_vinto boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l public.world_zombie_lotte; t record; el numeric; v boolean; xp int := 0; q int := 0; mt int := 0; got json; nuovo boolean := false; g0 int; s public.world_superstite;
  z json; prot int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into l from public.world_zombie_lotte where id = p_id and user_id = me for update;
  if l.id is null or l.fine_at is not null then return json_build_object('ok', false, 'msg', 'Lotta già chiusa'); end if;
  el := extract(epoch from (now() - l.start_at));
  v := coalesce(p_vinto, false) and el >= l.hp * 0.35 and el <= 300;
  select * into t from public.w_zm_tipi() x where x.k = l.tipo;
  update public.world_zombie_lotte set fine_at = now(), vinto = v where id = p_id;
  if v then
    nuovo := not exists (select 1 from public.world_zombie_presi where user_id = me and tipo = l.tipo);
    insert into public.world_zombie_presi(user_id, zid, tipo) values (me, l.zid, l.tipo) on conflict do nothing;
    s := public.w_sup(me); g0 := public.w_grado(s.xp);
    xp := case t.rar when 1 then 8 when 2 then 15 when 3 then 30 else 60 end + case when nuovo then 20 else 0 end;
    q := case t.rar when 1 then 4 when 2 then 7 when 3 then 12 else 20 end;
    got := public.w_res(me, q, q, q / 2); perform public.w_xp(me, xp);
    if t.rar >= 3 then mt := case t.rar when 3 then 10 else 30 end; perform public.w_pay(me, mt, 'Lente: ' || t.nome || ' abbattuto'); end if;
    -- 🛡️ i vicini: chi ha la casa a meno di 200 m dallo zombie riceve la novità (max una ogni 3 ore da te)
    z := public.w_zm_trova(l.zid);
    if z is not null then
      insert into public.world_feed(kind, actor, target, info)
        select distinct 'zm_aiuto', me, hm.user_id, t.ic || ' ' || t.nome || '|' || round(public.w_km((z->>'lat')::float, (z->>'lon')::float, hm.lat, hm.lon) * 1000)
        from public.world_homes hm
        where hm.user_id <> me and public.w_km((z->>'lat')::float, (z->>'lon')::float, hm.lat, hm.lon) < 0.2
          and not exists (select 1 from public.world_feed f where f.kind = 'zm_aiuto' and f.actor = me and f.target = hm.user_id and f.created_at > now() - interval '3 hours');
      get diagnostics prot = row_count;
    end if;
    s := public.w_sup(me);
    return json_build_object('ok', true, 'vinto', true, 'nome', t.nome, 'ic', t.ic, 'rar', t.rar, 'nuovo', nuovo, 'xp', xp, 'protetti', prot,
      'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp));
  end if;
  return json_build_object('ok', true, 'vinto', false, 'nome', t.nome, 'msg', 'È scappato: riprova (resta lì fino alla fine dell’ora)');
end $$;

-- ---------- 4) 📷 "apri la Lente": zombie e casse vicino a casa ----------
create or replace function public.w_lente_tick() returns int
language plpgsql security definer set search_path = public as $$
declare h int := extract(hour from now() at time zone 'Europe/Rome'); o bigint := public.w_zm_ora(); u record; i int; j int; ci int; cj int; q json;
  nz int; nc int; mr int; n int := 0; r int;
begin
  if h < 10 or h >= 20 then return 0; end if;
  for u in select distinct on (hm.user_id) hm.user_id, hm.lat, hm.lon from public.world_homes hm
           where exists (select 1 from public.push_subs ps where ps.user_id = hm.user_id)
             and not exists (select 1 from public.world_feed f where f.target = hm.user_id and f.kind = 'lente' and f.created_at > now() - interval '8 hours') loop
    ci := floor(u.lat / 0.0014); cj := floor(u.lon / 0.0019); nz := 0; nc := 0; mr := 0;
    for i in ci - 2 .. ci + 2 loop for j in cj - 2 .. cj + 2 loop
      q := public.w_zm_qua(i, j, o);
      if (q->>'zombie')::boolean and not exists (select 1 from public.world_zombie_presi p where p.user_id = u.user_id and p.zid = q->>'zid') then
        nz := nz + 1; select greatest(mr, x.rar) into mr from public.w_zm_tipi() x where x.k = q->>'tipo';
      end if;
      if (q->>'cassa')::boolean and not exists (select 1 from public.world_zombie_presi p where p.user_id = u.user_id and p.zid = q->>'cid') then nc := nc + 1; end if;
    end loop; end loop;
    if nz + nc > 0 then
      insert into public.world_feed(kind, actor, target, info) values ('lente', null, u.user_id, nz || '|' || nc || '|' || coalesce(mr, 0));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------- 5) 📦 aiuti da lontano ----------
create or replace function public.w_lontano_costo(p_km double precision) returns json language sql immutable as $$
  select json_build_object('cibo', 20, 'carb', 10 + least(40, ceil(coalesce(p_km, 0) / 250))::int, 'mattoni', 25, 'pts', 6); $$;

create or replace function public.world_aiuto_lontano(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d double precision; co json; w public.world_wallet; k text := 'lontani:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  n int; sid text; cc int; ck int; cm int; v int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok', false, 'msg', 'Non puoi aiutare te stesso'); end if;
  if not public.w_are_allies(me, p_target) then return json_build_object('ok', false, 'msg', 'I pacchi da lontano si mandano solo agli alleati'); end if;
  d := public.w_dist_km(me, p_target);
  if d is null then return json_build_object('ok', false, 'msg', 'Per aiutare serve che abbiate entrambi una casa nel mondo'); end if;
  co := public.w_lontano_costo(d); cc := (co->>'cibo')::int; ck := (co->>'carb')::int; cm := (co->>'mattoni')::int; v := (co->>'pts')::int;
  w := public.w_wallet(me); n := coalesce((w.caps->>k)::int, 0);
  if n >= 2 then return json_build_object('ok', false, 'msg', 'Oggi hai già mandato 2 pacchi da lontano'); end if;
  if w.cibo < cc or w.carb < ck or w.mattoni < cm then
    return json_build_object('ok', false, 'msg', format('Servono 🥫 %s, ⛽ %s e 🧱 %s', cc, ck, cm));
  end if;
  sid := public.w_slot_id(public.w_next_slot(now() + interval '3 hours'));
  insert into public.world_help_given(helper, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then return json_build_object('ok', false, 'msg', 'Gli hai già mandato aiuti per quella orda'); end if;
  update public.world_wallet set cibo = cibo - cc, carb = carb - ck, mattoni = mattoni - cm, caps = jsonb_set(caps, array[k], to_jsonb(n + 1)) where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -cm, 'Pacco di aiuti da lontano', true);
  insert into public.world_feed(kind, actor, target, info) values ('aiuto_lontano', me, p_target, round(d)::text);
  return json_build_object('ok', true, 'pts', v, 'slot', sid, 'km', round(d),
    'msg', format('📦 Pacco partito (%s km): +%s alla sua difesa all’orda delle %s:00 · 🥫 −%s ⛽ −%s 🧱 −%s', round(d), v, right(sid, 2), cc, ck, cm));
end $$;

-- world_send_help: uguale a prima, ma se l'alleato è fuori portata propone il pacco da lontano
CREATE OR REPLACE FUNCTION public.world_send_help(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
  mz text; mzp text; c int; d double precision; arr timestamptz; sid text; v int; eta int; quando text; co json;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi aiutare te stesso'); end if;
  if not exists (select 1 from public.world_help where user_id = p_target and slot_id = nid) and not public.w_are_allies(me, p_target) then
    return json_build_object('ok',false,'msg','Non ha chiesto aiuto e non è tuo alleato'); end if;
  d := public.w_dist_km(me, p_target);
  if d is null then return json_build_object('ok',false,'msg','Per aiutare serve che abbiate entrambi una casa nel mondo'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); c := public.w_mz_carb(mz, d);
  if d > public.w_mz_range(mz) then
    if public.w_are_allies(me, p_target) and d > public.w_mz_range(mzp) then
      co := public.w_lontano_costo(d);
      return json_build_object('ok',false,'lontano',true,'km',round(d),'costo',co,'target',p_target,
        'msg','È a ' || round(d::numeric) || ' km: troppo lontano per i rinforzi. Puoi mandargli un 📦 pacco da lontano (🥫 ' || (co->>'cibo') || ', ⛽ ' || (co->>'carb') || ', 🧱 ' || (co->>'mattoni') || ' → +' || (co->>'pts') || ' alla sua difesa)');
    end if;
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

revoke all on function public.world_posto_visita(text, text, double precision, double precision, double precision, double precision) from public, anon;
revoke all on function public.world_aiuto_lontano(uuid) from public, anon;
revoke all on function public.w_lente_tick() from public, anon, authenticated;
grant execute on function public.world_posto_visita(text, text, double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.world_aiuto_lontano(uuid) to authenticated;
grant execute on function public.w_lente_tick() to service_role;

-- controllo: deve dire "mondo vero pronto"
select case when exists (select 1 from pg_proc where proname = 'world_posto_visita') and exists (select 1 from pg_proc where proname = 'world_aiuto_lontano')
            and exists (select 1 from pg_proc where proname = 'w_lente_tick')
       then 'mondo vero pronto' else 'qualcosa manca' end as esito;
