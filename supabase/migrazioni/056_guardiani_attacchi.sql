-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 056 — ⚔️ ATTACCHI PIÙ LIBERI, 🧟 GUARDIANI DI CASE E PRESIDI, 🔄 MATTONI SENZA TETTO (26/11)
-- ⚔️ Attacchi tra superstiti (solo per gli attacchi: il resto del gioco non cambia):
--   • alleati = solo quelli veri: alleanza accettata, stessa alleanza a gruppi, coinquilini (w_alleati_veri).
--     Chi ti ha invitato, chi hai invitato e chi hai aiutato NON blocca più l'attacco.
--   • scudo del nuovo arrivato: 3 giorni invece di 15 (w_scudo_pvp).
--   • la casa vera custodita si può attaccare, ma difende il 30% in più (all'impatto, in w_attacchi_tick).
-- 🧟 Guardiani: ogni casa libera e ogni presidio libero ha il suo guardiano (tipo fisso deciso dal posto, w_guardiano).
--   Per comprare la casa (world_buy) o occupare il presidio (world_presidio_occupa) bisogna prima batterlo nel
--   picchiaduro: world_guardiano(target, diff) apre uno scontro 'guardiano' (1 energia, subito pronto, ovunque tu sia);
--   vinto, il posto resta liberato per te 24 ore (tabella world_liberate). La tua casa vera si prende come prima.
-- 🔄 Cambio: niente più tetto giornaliero ai mattoni ricevuti dai cambi tra risorse.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_alleati_veri(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and not public.w_rift(a, b) and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = a and mb.user_id = b)
    or public.w_coinq(a, b)); $$;

create or replace function public.w_scudo_pvp(p_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select u.created_at > now() - interval '3 days' from auth.users u where u.id = p_user), false)
     and coalesce((select (w.caps->>'scudo_off')::int from public.world_wallet w where w.user_id = p_user), 0) = 0; $$;

create or replace function public.w_attacco_no(p_me uuid, p_t jsonb) returns text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare k jsonb := public.w_pvp_cfg(); o uuid; last timestamptz;
begin
  if p_t is null then return 'Qui non abita nessuno'; end if;
  o := (p_t->>'owner')::uuid;
  if o = p_me then return 'È casa tua'; end if;
  if public.w_alleati_veri(p_me, o) then return 'È un tuo alleato: tra alleati non ci si attacca'; end if;
  if public.w_scudo_pvp(o) then return 'È appena arrivato: ha lo scudo del nuovo arrivato (3 giorni)'; end if;
  if not (p_t->>'home')::boolean and exists (select 1 from public.world_buildings where building_id = p_t->>'bid' and caduta_at is not null) then
    return 'È già crollata: aspetta che la ripari o che passi a chi l’ha abbattuta'; end if;
  if public.w_lvl_of(o) < public.w_lvl_of(p_me) - 3 then return 'È molto più debole di te: è protetto'; end if;
  if exists (select 1 from public.world_attacchi where (attaccante = p_me or p_me = any(coalesce(squadra, '{}'))) and bid = p_t->>'bid' and stato = 'viaggio') then
    return 'La tua squadra è già in viaggio verso questa casa'; end if;
  if exists (select 1 from public.world_raduni r join public.world_raduni_membri m on m.raduno_id = r.id where m.user_id = p_me and r.bid = p_t->>'bid' and r.stato = 'raduno') then
    return 'Sei già nel raduno contro questa casa'; end if;
  select max(partenza) into last from public.world_attacchi where (attaccante = p_me or p_me = any(coalesce(squadra, '{}'))) and vittima = o and stato <> 'annullato';
  if last > now() - make_interval(hours => (k->>'coppia_ore')::int) then
    return format('L’hai già attaccato: riprova fra %s ore', ceil(extract(epoch from (last + make_interval(hours => (k->>'coppia_ore')::int) - now())) / 3600)); end if;
  if exists (select 1 from public.world_attacchi where vittima = o and stato = 'risolto' and (esito->>'esito')::int > 0 and impatto > now() - make_interval(hours => (k->>'scudo_ore')::int)) then
    return 'È appena stato saccheggiato: riprova fra qualche ora'; end if;
  if (select count(*) from public.world_attacchi where vittima = o and stato = 'risolto' and (esito->>'esito')::int > 0 and impatto > now() - interval '24 hours') >= (k->>'max_sconfitte')::int then
    return 'Oggi ha già perso troppe volte: lascialo respirare'; end if;
  if (select count(*) from public.world_attacchi where attaccante = p_me and kind = 'pvp' and (partenza at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date)
     + (select count(*) from public.world_raduni_membri m join public.world_raduni r on r.id = m.raduno_id where m.user_id = p_me and r.stato <> 'annullato'
          and (m.joined_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) >= (k->>'max_attacchi')::int then
    return format('Oggi hai già fatto %s attacchi', k->>'max_attacchi'); end if;
  return null;
end $$;
create or replace function public.w_attacchi_tick() returns integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare k jsonb := public.w_pvp_cfg(); a public.world_attacchi; t jsonb; dif numeric; rf numeric; att numeric; res jsonb; e int; loot jsonb; dn int; n int := 0; h record;
        sq jsonb; tot numeric; quote jsonb; resto jsonb; q jsonb; x jsonb; r text; v int; bad boolean; u uuid;
begin
  perform public.w_raduni_tick();
  for a in select * from public.world_attacchi where stato = 'viaggio' and impatto <= now() order by impatto limit 50 for update skip locked loop
    t := public.w_bersaglio(null, a.bid);
    if a.kind = 'alleanza' then
      sq := public.w_squadra(a.raduno_id, a.vittima);
      -- chi nel frattempo è diventato alleato della vittima esce e riprende il 🥫
      update public.world_wallet w set cibo = w.cibo + m.cibo from public.world_raduni_membri m
        where m.raduno_id = a.raduno_id and w.user_id = m.user_id and m.user_id = any(a.squadra)
          and not exists (select 1 from jsonb_array_elements(sq->'membri') y where (y->>'u')::uuid = m.user_id);
      att := (sq->>'forza')::numeric; bad := att <= 0;
    else
      att := a.forza; bad := public.w_alleati_veri(a.attaccante, a.vittima);
    end if;
    -- regola assoluta e bersaglio ancora valido, controllati anche all'impatto
    if t is null or (t->>'owner')::uuid <> a.vittima or bad then
      update public.world_attacchi set stato = 'annullato', esito = jsonb_build_object('msg', 'Attacco annullato: il bersaglio non è più attaccabile') where id = a.id;
      if a.kind = 'alleanza' then
        update public.world_wallet w set cibo = w.cibo + m.cibo from public.world_raduni_membri m
          where m.raduno_id = a.raduno_id and w.user_id = m.user_id and exists (select 1 from jsonb_array_elements(sq->'membri') y where (y->>'u')::uuid = m.user_id);
      else update public.world_wallet set cibo = cibo + (k->>'costo_cibo')::int where user_id = a.attaccante; end if;
      update public.world_wallet w set cibo = cibo + (k->>'rinf_cibo')::int from public.world_attacchi_rinforzi rr where rr.attacco_id = a.id and w.user_id = rr.helper;
      continue;
    end if;
    rf := public.w_rinf_tot(a.id, a.impatto);
    dif := public.w_forza_dif(a.vittima, a.bid) * case when (t->>'home')::boolean and public.w_custodita(a.vittima) then 1.3 else 1 end + rf;
    res := public.w_combat(att, dif, 'pvp' || a.id); e := (res->>'esito')::int;
    loot := public.w_bottino(a.vittima, e);
    quote := '{}'::jsonb;
    if e > 0 then
      if a.kind = 'alleanza' then
        -- il bottino diviso secondo il contributo; il resto delle divisioni va al primo
        tot := greatest(0.1, (select sum((y->>'c')::numeric) from jsonb_array_elements(sq->'membri') y)); resto := loot;
        for x in select * from jsonb_array_elements(sq->'membri') loop
          q := '{}'::jsonb;
          foreach r in array array['legno','cibo','carb','mattoni'] loop
            v := floor((loot->>r)::int * (x->>'c')::numeric / tot)::int; q := q || jsonb_build_object(r, v);
            resto := jsonb_set(resto, array[r], to_jsonb((resto->>r)::int - v));
          end loop;
          quote := quote || jsonb_build_object(x->>'u', q);
        end loop;
        x := sq->'membri'->0;
        quote := jsonb_set(quote, array[x->>'u'], (select jsonb_object_agg(kk, (quote->(x->>'u')->>kk)::int + (resto->>kk)::int) from unnest(array['legno','cibo','carb','mattoni']) kk));
      else
        quote := jsonb_build_object(a.attaccante::text, loot);
      end if;
      for u in select (jsonb_object_keys(quote))::uuid loop
        q := quote->(u::text);
        perform public.w_wallet(u);
        update public.world_wallet set legno = legno + (q->>'legno')::int, cibo = cibo + (q->>'cibo')::int, carb = carb + (q->>'carb')::int,
          mattoni = mattoni + (q->>'mattoni')::int where user_id = u;
        if (q->>'mattoni')::int > 0 then insert into public.world_log(user_id, delta, reason, seen) values (u, (q->>'mattoni')::int, 'Bottino di un attacco', false); end if;
      end loop;
      dn := (k->'danni'->>e)::int;
      if a.casa_vera then update public.world_homes set danno = least((k->>'danni_max')::int, danno + dn) where user_id = a.vittima;
      else update public.world_buildings set danno = least((k->>'danni_max')::int, danno + dn) where building_id = a.bid; end if;
    else
      dn := 0;
      for h in select helper from public.world_attacchi_rinforzi where attacco_id = a.id and arrivo <= a.impatto loop
        perform public.w_wallet(h.helper);
        update public.world_wallet set cibo = cibo + (k->>'rinf_premio_cibo')::int where user_id = h.helper;
        perform public.w_xp(h.helper, (k->>'rinf_xp')::int);
        perform public.w_feed_add('pvp_difeso', a.vittima, h.helper, null, null, a.id || '|' || public.w_nick(a.attaccante));
      end loop;
    end if;
    update public.world_attacchi set stato = 'risolto', esito = res || jsonb_build_object('att', att, 'dif', dif, 'rinf', rf,
      'rinf_n', (select count(*) from public.world_attacchi_rinforzi where attacco_id = a.id and arrivo <= a.impatto), 'loot', loot, 'danno', dn, 'quote', quote,
      'squadra', case when a.kind = 'alleanza' then sq->'membri' end) where id = a.id;
    if a.kind = 'alleanza' then
      for x in select * from jsonb_array_elements(sq->'membri') loop
        perform public.w_feed_add('pvp_esito', (x->>'u')::uuid, a.vittima, null, null, a.id || '|' || e || '|' || 'dif');
      end loop;
    else
      perform public.w_feed_add('pvp_esito', a.attaccante, a.vittima, null, null, a.id || '|' || e || '|' || 'dif');
    end if;
    perform public.w_feed_add('pvp_esito', a.vittima, a.attaccante, null, null, a.id || '|' || e || '|' || 'att');
    n := n + 1;
  end loop;
  return n;
end $$;
create or replace function public.w_cambio_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'valori', jsonb_build_object('gemme', 300, 'cibo', 30, 'legno', 30, 'carb', 36, 'mattoni', 20),
    'comm', 30, 'comm_mercante', 4, 'comm_min', 10,
    'tetto', jsonb_build_object('mattoni', 1000000, 'cibo', 300, 'legno', 300, 'carb', 300),
    'max_gemme', 200, 'max_altro', 5000); $$;

-- 🧟 guardiani
alter table public.world_scontri drop constraint if exists world_scontri_modo_check;
alter table public.world_scontri add constraint world_scontri_modo_check check (modo = any (array['persona','superstite','esplora','guardiano']));
create table if not exists public.world_liberate (
  user_id uuid not null references auth.users(id) on delete cascade,
  target text not null,
  at timestamptz not null default now(),
  primary key (user_id, target));
alter table public.world_liberate enable row level security;

-- il guardiano di un posto: sempre lo stesso tipo (dal nome del posto), mai i 2 più rari per le case piccole
create or replace function public.w_guardiano(p_target text) returns json language sql stable as $$
  select json_build_object('tipo', t.k, 'nome', t.nome, 'ic', t.ic, 'rar', t.rar)
  from (select k, nome, ic, rar, row_number() over (order by k) - 1 as i, count(*) over () as n from public.w_zm_tipi()) t
  where t.i = abs(hashtext('guard:' || p_target)) % t.n; $$;

create or replace function public.w_liberata(p_user uuid, p_target text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.world_liberate where user_id = p_user and target = p_target and at > now() - interval '24 hours'); $$;

create or replace function public.world_guardiano(p_target text, p_diff text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c jsonb := public.w_arena_cfg(); gd json; s public.world_superstite; g int; liv int; nid bigint; sc public.world_scontri;
  la double precision := p_lat; lo double precision := p_lon; v_zid text := 'g:' || p_target; w public.world_wallet;
  day text := to_char(now() at time zone 'Europe/Rome', 'YYYY-MM-DD'); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_target !~ '^(b|p):' then return json_build_object('ok', false, 'msg', 'Posto non valido'); end if;
  if coalesce(p_diff, '') not in ('facile','equilibrato','difficile') then p_diff := 'equilibrato'; end if;
  if public.w_liberata(me, p_target) then return json_build_object('ok', true, 'liberata', true, 'msg', '✅ L’hai già liberato: ora puoi prenderlo'); end if;
  if left(p_target, 2) = 'p:' then select lat, lon into la, lo from public.world_presidi where id = substr(p_target, 3); end if;
  gd := public.w_guardiano(p_target);
  -- uno scontro già aperto per questo posto: si riprende quello
  select * into sc from public.world_scontri where user_id = me and world_scontri.zid = v_zid and stato in ('pronto','lotta') and coalesce(scade, now()) > now() order by id desc limit 1;
  if sc.id is not null then
    if sc.stato = 'lotta' then update public.world_scontri set stato = 'pronto' where id = sc.id; end if;
    return json_build_object('ok', true, 'id', sc.id, 'tipo', sc.tipo, 'guardiano', gd);
  end if;
  w := public.w_wallet(me); n := coalesce((w.caps->>('arena:' || day))::int, 0);
  if n >= (c->>'max_giorno')::int then return json_build_object('ok', false, 'msg', 'Oggi hai già fatto ' || n || ' scontri: riposati'); end if;
  s := public.w_sup(me);
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min)', public.w_en_ric(s.abil))); end if;
  update public.world_superstite set energia = energia - 1, energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  update public.world_wallet set caps = jsonb_set(caps, array['arena:' || day], to_jsonb(n + 1)) where user_id = me;
  g := public.w_grado(s.xp); liv := greatest(1, g + (c->'diff'->>p_diff)::int);
  insert into public.world_scontri(user_id, zid, tipo, modo, diff, livello, zlat, zlon, costo, stato, scade)
    values (me, v_zid, gd->>'tipo', 'guardiano', p_diff, liv, la, lo, '{"energia":1}', 'pronto', now() + interval '15 minutes') returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'tipo', gd->>'tipo', 'guardiano', gd, 'msg', '🧟 Allo scontro col guardiano!');
end $$;

create or replace function public.world_scontro_fine(p_id bigint, p_esito text, p_colpi integer) returns json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); sc public.world_scontri; c jsonb := public.w_arena_cfg(); el numeric; serve int; tmin numeric; v boolean;
  xp int := 0; q int; got json; nuovo boolean := false; g0 int; s public.world_superstite; rar int; mt int := 0;
  h record; gm int := 0; pz int := 0; gq int; nid text := public.w_slot_id(public.w_next_slot(now())); cg int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_esito not in ('vinto','perso','abbandonato') then return json_build_object('ok', false, 'msg', 'Esito non valido'); end if;
  select * into sc from public.world_scontri where id = p_id and user_id = me for update;
  if sc.id is null or sc.stato <> 'lotta' then return json_build_object('ok', false, 'msg', 'Scontro già chiuso'); end if;
  el := extract(epoch from now() - sc.inizio);
  serve := ceil((sc.zstats->>'vita')::numeric / public.w_arena_danno((sc.stats->>'forza')::int, (sc.zstats->>'difesa')::int) / 3.0);  -- la mossa speciale fa ×3
  tmin := serve / (c->>'colpi_s')::numeric;
  v := p_esito = 'vinto' and el >= tmin and el <= (c->>'durata_max_s')::int and coalesce(p_colpi, 0) >= serve;
  if not v then
    update public.world_scontri set stato = case when p_esito = 'abbandonato' then 'abbandonato' else 'perso' end, fine = now(),
      premi = jsonb_build_object('rifiutato', p_esito = 'vinto') where id = p_id;
    return json_build_object('ok', true, 'vinto', false, 'esito', case when p_esito = 'abbandonato' then 'abbandonato' else 'perso' end,
      'msg', case when p_esito = 'vinto' then 'Lo scontro non torna: niente premi' when p_esito = 'abbandonato' then 'Sei scappato: lo zombie resta lì' else 'Lo zombie ha vinto: allenati e riprova con un altro' end);
  end if;
  rar := (sc.zstats->>'rar')::int;
  -- 🧟 guardiano battuto: la casa o il presidio restano liberati per te 24 ore
  if sc.modo = 'guardiano' then insert into public.world_liberate(user_id, target, at) values (me, substr(sc.zid, 3), now())
    on conflict (user_id, target) do update set at = now(); end if;
  nuovo := not exists (select 1 from public.world_zombie_presi where user_id = me and tipo = sc.tipo);
  insert into public.world_zombie_presi(user_id, zid, tipo) values (me, sc.zid, sc.tipo) on conflict do nothing;
  s := public.w_sup(me); g0 := public.w_grado(s.xp);
  xp := round((10 + 3 * sc.livello + 6 * rar) * (c->'xp_molt'->>sc.diff)::numeric)::int + case when nuovo then 20 else 0 end;
  q := 3 + sc.livello / 2 + rar * 2;
  got := public.w_res(me, q, q, q / 2); perform public.w_xp(me, xp);
  if rar >= 3 then mt := case rar when 3 then 10 else 30 end; perform public.w_pay(me, mt, 'Arena: ' || (sc.zstats->>'nome') || ' abbattuto'); end if;
  -- 🏠 zombie battuto entro 1 km da una tua casa: +2 alla difesa di quella casa per la prossima orda (max +10 a casa)
  for h in select x.building_id as bid from (select building_id, lat, lon from public.world_homes where user_id = me
      union select building_id, lat, lon from public.world_buildings where owner = me) x
      where sc.zlat is not null and public.w_km(x.lat, x.lon, sc.zlat, sc.zlon) <= 1 loop
    insert into public.world_assalti(bid, user_id, slot_id, kind, pts) values (h.bid, me, nid, 'gioco', 2)
      on conflict (bid, user_id, slot_id, kind) do update set pts = public.world_assalti.pts + 2;
    cg := cg + 1;
  end loop;
  -- 💎 gemme dal Gioco (tetto giornaliero) e 🎖️ piastrine per la pista settimanale
  gq := case when sc.diff = 'difficile' then 2 else 1 end
    + case when not exists (select 1 from public.world_scontri x where x.user_id = me and x.stato = 'vinto' and x.id <> sc.id
        and (x.fine at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) then 2 else 0 end
    + case when nuovo then 3 else 0 end;
  gm := public.w_gioco_gemme(me, gq, 'Gioco: vittoria in arena', 'scontro:' || sc.id, 'gioco:scontro:' || sc.id);
  pz := case sc.diff when 'difficile' then 15 when 'facile' then 6 else 10 end;
  perform public.w_piastrine(me, pz);
  s := public.w_sup(me);
  update public.world_scontri set stato = 'vinto', fine = now(),
    premi = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt, 'nuovo', nuovo, 'case', cg, 'gemme', gm, 'piastrine', pz) where id = p_id;
  return json_build_object('ok', true, 'vinto', true, 'esito', 'vinto', 'xp', xp, 'nuovo', nuovo, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int,
    'carb', (got->>'carb')::int, 'mattoni', mt, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp), 'nome', sc.zstats->>'nome', 'ic', sc.zstats->>'ic',
    'case_difese', cg, 'orda', right(nid, 2), 'gemme', gm, 'piastrine', pz, 'gemme_oggi', public.w_gioco_oggi(me), 'liberata', case when sc.modo = 'guardiano' then substr(sc.zid, 3) end, 'gemme_max', (public.w_gioco_cfg()->>'max_giorno')::int);
end $$;
create or replace function public.world_buy(p_bid text, p_lat double precision, p_lon double precision) returns json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); q json; price int; got text;
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  if me is null then return json_build_object('ok',false,'msg','Accedi per comprare'); end if;
  perform public.w_cleanup();
  -- 🧟 prima il guardiano: la casa va liberata nel picchiaduro (vale 24 ore)
  if not public.w_liberata(me, 'b:' || p_bid) then
    return json_build_object('ok', false, 'guardiano', public.w_guardiano('b:' || p_bid), 'target', 'b:' || p_bid,
      'msg', '🧟 La casa è infestata: batti prima il suo guardiano'); end if;
  q := public.world_quote(p_bid, p_lat, p_lon);
  if not (q->>'can')::boolean then return json_build_object('ok',false,'msg',coalesce(nullif(q->>'why',''),'Non disponibile: qui abita qualcuno')); end if;
  price := (q->>'price')::int;
  insert into public.world_buildings(building_id, lat, lon) values (p_bid, p_lat, p_lon) on conflict (building_id) do nothing;
  update public.world_buildings set owner = me, paid = price, bought_at = now()
    where building_id = p_bid and owner is null
      and not exists (select 1 from public.world_homes h where h.status in ('home','pending')
                      and (split_part(h.building_id,'#',1) = p_bid or public.w_km(h.lat,h.lon,p_lat,p_lon) < 0.025))
    returning building_id into got;
  if got is null then return json_build_object('ok',false,'msg','Non disponibile: qualcuno l’ha appena comprata o ci abita'); end if;
  update public.world_wallet set mattoni = mattoni - price where user_id = me and mattoni >= price;
  if not found then
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
    return json_build_object('ok',false,'msg','Mattoni insufficienti');
  end if;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -price, 'Casa comprata', p_bid, true);
  return json_build_object('ok',true,'msg','Casa comprata','price',price);
end $$;
create or replace function public.world_presidio_occupa(p_id text) returns json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); p public.world_presidi; d double precision; mz text; mzp text; c int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per occupare un presidio'); end if;
  perform public.w_pres_tick();
  select * into p from public.world_presidi where id = p_id for update;
  if p.id is null then return json_build_object('ok', false, 'msg', 'Presidio non trovato'); end if;
  if p.holder is not null then return json_build_object('ok', false, 'msg', case when p.holder = me then 'Lo tieni già tu' else 'È già tenuto: assaltalo, oppure aspetta che l''orda lo faccia cadere' end); end if;
  d := public.w_dist_pt(me, p.lat, p.lon);
  if d is null or d > 5 then return json_build_object('ok', false, 'msg', 'Serve una tua casa entro 5 km dal presidio'); end if;
  if not public.w_liberata(me, 'p:' || p_id) then
    return json_build_object('ok', false, 'guardiano', public.w_guardiano('p:' || p_id), 'target', 'p:' || p_id,
      'msg', '🧟 Il presidio è infestato: batti prima il suo guardiano'); end if;
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

revoke all on function public.w_alleati_veri(uuid, uuid) from public, anon, authenticated;
revoke all on function public.w_scudo_pvp(uuid) from public, anon, authenticated;
revoke all on function public.w_liberata(uuid, text) from public, anon, authenticated;
grant execute on function public.world_guardiano(text, text, double precision, double precision) to authenticated;

-- controllo: deve dire "guardiani pronti"
select case when exists (select 1 from pg_proc where proname = 'world_guardiano') then 'guardiani pronti' else 'qualcosa manca' end as esito;
