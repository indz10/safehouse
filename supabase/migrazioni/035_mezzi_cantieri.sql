-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 035 — 🚗 MEZZI CON TEMPI VERI e 🔨 CANTIERI (18/11)
-- 1) MEZZI: il viaggio dura distanza ÷ velocità del mezzo (a piedi 5 km/h, bici 15, moto 40, auto 60, fuoristrada 50)
--    + 2 minuti per partire; i mezzi a motore consumano ⛽ (moto 1, auto 1,5, fuoristrada 2 a km: w_mz_carb).
--    Si sceglie il mezzo (world_mezzo_scegli, solo tra quelli che hai); senza ⛽ si parte con uno più lento (w_mz_eff).
--    Vale per attacchi, rinforzi e raduni (w_viaggio_min con il mezzo di chi viaggia) e per le spedizioni
--    (andata e ritorno + 5 minuti di ricerca, ⛽ di andata e ritorno: world_sped_parti). Tutte le regole in w_pvp_cfg.
-- 2) CANTIERI: world_ripara non ripara più all'istante: paghi e apre un cantiere (3 min a punto di difesa, 2 min a punto
--    di integrità, +4 ore se crollata, minimo 10), uno alla volta; a fine lavori w_cantieri_tick (ogni minuto) rimette
--    la casa a posto (novità 'cantiere_ok'); mentre lavora la casa crollata non si perde (w_cadute_tick);
--    ⚡ world_cantiere_accelera finisce subito per 🧱 1 ogni 5 minuti che mancano (minimo 5).
-- Richiede la 034. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) regole (le stesse + mezzi e cantieri) ----------
create or replace function public.w_pvp_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'comb_pct', 0.05, 'comb_max', 9,                                   -- Combattente: +5% attacco e difesa per livello (max 9 = +45%)
    'viaggio', jsonb_build_array(jsonb_build_array(1,5), jsonb_build_array(5,10), jsonb_build_array(20,20), jsonb_build_array(50,40), jsonb_build_array(100,60)),
    'viaggio_oltre', 90,                                               -- minuti oltre 100 km
    'soglie', jsonb_build_array(1, 1.25, 1.6),                         -- rapporto attacco/difesa per misura, normale, schiacciante
    'perc', jsonb_build_array(0, 0.10, 0.20, 0.30),                    -- scorte perse per esito
    'danni', jsonb_build_array(0, 5, 10, 15),                          -- punti di difesa danneggiati per esito
    'danni_max', 30,
    'prot_pct', 0.30,                                                  -- scorta protetta: il più alto tra il 30% e il minimo
    'prot_min', jsonb_build_object('legno', 50, 'cibo', 50, 'carb', 50, 'mattoni', 100),
    'cap', jsonb_build_object('legno', 150, 'cibo', 150, 'carb', 150, 'mattoni', 100),   -- massimo per attacco
    'caso', 0.10,                                                      -- variazione casuale ±10% decisa dal server
    'atk_base', 30, 'atk_lvl', 3,                                      -- forza = (30 + 3 × livello) × (1 + Combattente) × mezzo
    'costo_cibo', 10, 'energia', 1,
    'coppia_ore', 12, 'scudo_ore', 6, 'max_sconfitte', 3, 'max_attacchi', 5,
    'riparo_legno', 2,
    -- rinforzi (029)
    'rinf_quota', 0.5,
    'calo', jsonb_build_array(1, 0.6, 0.4, 0.25),                      -- dalla più forte: 1ª, 2ª, 3ª, dalla 4ª in poi (rinforzi e attacchi d'alleanza)
    'rinf_max', 60, 'rinf_max_n', 6,
    'rinf_cibo', 5, 'rinf_xp', 15, 'rinf_premio_cibo', 5,
    -- attacchi d'alleanza (030)
    'raduno_max', 10, 'raduno_minuti', jsonb_build_array(10, 20, 30),
    -- integrità delle case comprate (031)
    'integ', jsonb_build_array(0, 10, 17, 25),                         -- integrità persa per esito (di misura, normale, schiacciante)
    'caduta_ore', 48,                                                  -- ore per riparare una casa crollata prima di perderla
    'rip_integ_legno', 1, 'rip_caduta_mattoni', 50,                    -- riparare: 🪵 1 a punto di integrità, +🧱 50 se è crollata
    'integ_conquista', 50,
    -- orde sul motore unico (032)
    'orda_avvisi', jsonb_build_array(60, 15),
    -- mezzi e cantieri (035)
    'velocita', jsonb_build_object('piedi', 5, 'bici', 15, 'moto', 40, 'auto', 60, 'fuori', 50),   -- km/h
    'viaggio_base', 2,                                                 -- minuti per partire
    'sped_ricerca', 5,                                                 -- minuti di ricerca sul posto (spedizioni)
    'cant_danno', 3, 'cant_integ', 2, 'cant_crollo', 240, 'cant_min', 10,   -- minuti di cantiere
    'acc_min', 5);                                                     -- accelerare: 🧱 1 ogni 5 minuti che mancano
  $$;



-- ---------- 2) mezzi ----------
create or replace function public.w_viaggio_mz(p_km double precision, p_mz text) returns int language sql immutable as $$
  select least(1440, greatest(3, (public.w_pvp_cfg()->>'viaggio_base')::int
    + ceil(coalesce(p_km, 0) / greatest(1, coalesce((public.w_pvp_cfg()->'velocita'->>coalesce(p_mz, 'piedi'))::numeric, 5)) * 60)::int)); $$;

-- il mezzo che si usa: quello scelto (se lo hai), altrimenti il migliore; senza ⛽ si scala a bici o a piedi
create or replace function public.w_mz_eff(p_user uuid, p_km double precision) returns text
language sql stable security definer set search_path to 'public' as $$
  with m as (select public.w_mezzo(p_user) as best, coalesce((select carb from public.world_wallet where user_id = p_user), 0) as carb,
                    coalesce((select caps->>'mezzo_vero' from public.world_wallet where user_id = p_user), 'piedi') as vero,
                    (select caps->>'mezzo_scelto' from public.world_wallet where user_id = p_user) as sc),
  c as (select *, case when sc is not null and public.w_mz_rank(sc) <= public.w_mz_rank(best) then sc else best end as mz from m)
  select case when public.w_mz_carb(mz, p_km) <= carb then mz when public.w_mz_rank('bici') <= public.w_mz_rank(mz) and (vero = 'bici' or public.w_mz_rank(best) >= public.w_mz_rank('bici')) then 'bici' else 'piedi' end from c; $$;

-- minuti di viaggio per chi viaggia adesso (auth.uid): con il suo mezzo
create or replace function public.w_viaggio_min(p_km double precision) returns int language sql stable security definer set search_path to 'public' as $$
  select case when auth.uid() is not null then public.w_viaggio_mz(p_km, public.w_mz_eff(auth.uid(), p_km))
    else coalesce((select (x->>1)::int from jsonb_array_elements(public.w_pvp_cfg()->'viaggio') with ordinality t(x, i)
                   where coalesce(p_km, 0) <= (x->>0)::numeric order by i limit 1), (public.w_pvp_cfg()->>'viaggio_oltre')::int) end; $$;

create or replace function public.world_mezzo_scegli(p_mz text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_wallet(me);
  if coalesce(p_mz, '') in ('', 'migliore') then
    update public.world_wallet set caps = caps - 'mezzo_scelto' where user_id = me;
    return json_build_object('ok', true, 'msg', '🚗 Userai sempre il mezzo più veloce che hai');
  end if;
  if p_mz not in ('piedi','bici','moto','auto','fuori') or public.w_mz_rank(p_mz) > public.w_mz_rank(public.w_mezzo(me)) then
    return json_build_object('ok', false, 'msg', 'Questo mezzo non ce l’hai: lo trovi in Bottega'); end if;
  update public.world_wallet set caps = jsonb_set(caps, '{mezzo_scelto}', to_jsonb(p_mz)) where user_id = me;
  return json_build_object('ok', true, 'msg', '🚗 Viaggerai ' || public.w_mz_nome(p_mz));
end $$;

-- i mezzi che hai, con tempo e ⛽ per una distanza
create or replace function public.world_mezzi_info(p_km numeric) returns json
language sql stable security definer set search_path to 'public' as $$
  select json_build_object('ok', auth.uid() is not null, 'km', round(coalesce(p_km, 0), 1),
    'scelto', (select caps->>'mezzo_scelto' from public.world_wallet where user_id = auth.uid()),
    'usato', public.w_mz_eff(auth.uid(), p_km), 'carb', coalesce((select carb from public.world_wallet where user_id = auth.uid()), 0),
    'mezzi', (select json_agg(json_build_object('mz', z, 'nome', public.w_mz_nome(z), 'kmh', (public.w_pvp_cfg()->'velocita'->>z)::int,
        'min', public.w_viaggio_mz(p_km, z), 'carb', public.w_mz_carb(z, p_km), 'forza', public.w_mz_atk(z)) order by public.w_mz_rank(z))
      from unnest(array['piedi','bici','moto','auto','fuori']) z where public.w_mz_rank(z) <= public.w_mz_rank(public.w_mezzo(auth.uid())))); $$;

-- ---------- 3) spedizioni con il mezzo ----------
create or replace function public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) RETURNS json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; spid uuid; km numeric; c json; en int; mins int; h int; nid bigint; notte boolean;
  co json; cc int; ck int; w public.world_wallet; mz text;
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
  -- tempo e carburante dal mezzo (035): andata e ritorno + ricerca; più veloce = più ⛽
  mz := public.w_mz_eff(me, km * 2);
  en := (c->>'energia')::int; mins := 2 * public.w_viaggio_mz(km, mz) + (public.w_pvp_cfg()->>'sped_ricerca')::int;
  if s.energia < en then
    return json_build_object('ok', false, 'msg', format('Serve %s energia: ne hai %s (una carica ogni %s min)', en, s.energia, public.w_en_ric(s.abil)));
  end if;
  co := public.w_sped_costo(km); cc := (co->>'cibo')::int; ck := public.w_mz_carb(mz, km * 2);
  co := json_build_object('cibo', cc, 'carb', ck, 'mezzo', mz);
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
    'mezzo', mz, 'msg', format('🎒 Partito %s! Torna fra %s min · 🥫 −%s%s', public.w_mz_nome(mz), mins, cc, case when ck > 0 then ' ⛽ −' || ck else '' end));
end $$;

-- ---------- 4) cantieri ----------
create table if not exists public.world_cantieri (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bid text not null,
  home boolean not null,
  inizio timestamptz not null default now(),
  fine timestamptz not null,
  legno int not null default 0, mattoni int not null default 0,
  stato text not null default 'lavori' check (stato in ('lavori','finito'))
);
alter table public.world_cantieri enable row level security;
create index if not exists world_cantieri_stato on public.world_cantieri(stato, fine);
create index if not exists world_cantieri_user on public.world_cantieri(user_id, stato);

create or replace function public.w_cantieri_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare c public.world_cantieri; n int := 0;
begin
  for c in select * from public.world_cantieri where stato = 'lavori' and fine <= now() order by fine limit 100 for update skip locked loop
    if c.home then update public.world_homes set danno = 0 where user_id = c.user_id;
    else update public.world_buildings set danno = 0, integrita = 100, caduta_at = null, caduta_da = null where building_id = c.bid and owner = c.user_id; end if;
    update public.world_cantieri set stato = 'finito' where id = c.id;
    perform public.w_feed_add('cantiere_ok', c.user_id, c.user_id, null, null, c.bid || '|' || case when c.home then 'casa' else 'comprata' end);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.w_cadute_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); b public.world_buildings; refund int; n int := 0;
begin
  for b in select * from public.world_buildings where caduta_at is not null and caduta_at < now() - make_interval(hours => (k->>'caduta_ore')::int)
           and not exists (select 1 from public.world_cantieri c where c.bid = building_id and c.stato = 'lavori')
           order by caduta_at limit 50 for update skip locked loop
    refund := round(0.5 * (coalesce(b.paid, 0) + coalesce(b.upgrades, 0)));
    if b.owner is not null and refund > 0 then
      update public.world_wallet set mattoni = mattoni + refund where user_id = b.owner;
      insert into public.world_log(user_id, delta, reason, ref, seen) values (b.owner, refund, 'Casa crollata e non riparata: ti torna metà della spesa', b.building_id, false);
    end if;
    if b.caduta_da is not null and b.caduta_da <> coalesce(b.owner, '00000000-0000-0000-0000-000000000000'::uuid)
       and (select count(*) from public.world_buildings x where x.owner = b.caduta_da) < public.w_max(public.w_lvl_of(b.caduta_da)) then
      update public.world_buildings set owner = b.caduta_da, paid = 0, upgrades = 0, bought_at = now(), integrita = (k->>'integ_conquista')::int,
        danno = 0, caduta_at = null, caduta_da = null where building_id = b.building_id;
      perform public.w_feed_add('conquista', b.caduta_da, b.owner, b.lat, b.lon, 'casa');
    else
      update public.world_buildings set owner = null, paid = 0, upgrades = 0, bought_at = null, integrita = 100, danno = 0, caduta_at = null, caduta_da = null
        where building_id = b.building_id;
      if b.owner is not null then perform public.w_feed_add('casa_libera', b.owner, b.owner, b.lat, b.lon, b.building_id); end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.world_ripara(p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg(); d int; home boolean; b public.world_buildings; v_legno int; v_mat int := 0; mins int; hbid text; x public.world_cantieri;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_cantieri_tick(); perform public.w_cadute_tick();
  select * into x from public.world_cantieri where user_id = me and stato = 'lavori' order by fine limit 1;
  if x.id is not null then
    return json_build_object('ok', false, 'msg', format('🔨 Hai già un cantiere aperto: finisce fra %s min (⚡ accelera con 🧱)', greatest(1, ceil(extract(epoch from x.fine - now()) / 60)))); end if;
  home := coalesce(p_bid, '') = '' or exists (select 1 from public.world_homes where user_id = me and building_id = p_bid);
  if home then
    select building_id, danno into hbid, d from public.world_homes where user_id = me;
    if d is null then return json_build_object('ok', false, 'msg', 'Non è casa tua'); end if;
    if d <= 0 then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
    v_legno := d * (k->>'riparo_legno')::int;
    mins := greatest((k->>'cant_min')::int, d * (k->>'cant_danno')::int);
  else
    select * into b from public.world_buildings where building_id = p_bid and owner = me for update;
    if b.building_id is null then return json_build_object('ok', false, 'msg', 'Non è casa tua (o l’hai già persa)'); end if;
    if b.danno <= 0 and b.integrita >= 100 and b.caduta_at is null then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
    v_legno := b.danno * (k->>'riparo_legno')::int + (100 - b.integrita) * (k->>'rip_integ_legno')::int;
    if b.caduta_at is not null then v_mat := (k->>'rip_caduta_mattoni')::int; end if;
    mins := greatest((k->>'cant_min')::int, b.danno * (k->>'cant_danno')::int + (100 - b.integrita) * (k->>'cant_integ')::int
      + case when b.caduta_at is not null then (k->>'cant_crollo')::int else 0 end);
    hbid := p_bid;
  end if;
  update public.world_wallet w set legno = w.legno - v_legno, mattoni = w.mattoni - v_mat where w.user_id = me and w.legno >= v_legno and w.mattoni >= v_mat;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s%s', v_legno, case when v_mat > 0 then ' e 🧱 ' || v_mat else '' end)); end if;
  if v_mat > 0 then insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -v_mat, 'Cantiere: casa crollata da ricostruire', hbid, true); end if;
  insert into public.world_cantieri(user_id, bid, home, fine, legno, mattoni) values (me, hbid, home, now() + make_interval(mins => mins), v_legno, v_mat) returning * into x;
  return json_build_object('ok', true, 'id', x.id, 'minuti', mins, 'fine', x.fine,
    'msg', format('🔨 Cantiere aperto: lavori finiti fra %s · 🪵 −%s%s', case when mins >= 60 then (mins / 60) || ' h ' || (mins % 60) || ' min' else mins || ' min' end,
      v_legno, case when v_mat > 0 then ' 🧱 −' || v_mat else '' end));
end $$;

create or replace function public.world_cantiere_accelera(p_id bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); x public.world_cantieri; rest int; costo int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into x from public.world_cantieri where id = p_id and user_id = me and stato = 'lavori' for update;
  if x.id is null then return json_build_object('ok', false, 'msg', 'Il cantiere è già finito'); end if;
  rest := greatest(0, ceil(extract(epoch from x.fine - now()) / 60));
  costo := greatest(5, ceil(rest::numeric / (public.w_pvp_cfg()->>'acc_min')::int));
  update public.world_wallet set mattoni = mattoni - costo where user_id = me and mattoni >= costo;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🧱 %s', costo)); end if;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -costo, 'Cantiere accelerato', x.bid, true);
  update public.world_cantieri set fine = now() where id = x.id;
  perform public.w_cantieri_tick();
  return json_build_object('ok', true, 'msg', format('⚡ Lavori finiti subito · 🧱 −%s', costo));
end $$;

create or replace function public.world_cantieri_miei() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_cantieri_tick();
  return json_build_object('ok', true, 'ora', now(), 'cantieri', coalesce((select json_agg(json_build_object('id', c.id, 'bid', c.bid, 'home', c.home, 'fine', c.fine,
      'accelera', greatest(5, ceil(greatest(0, ceil(extract(epoch from c.fine - now()) / 60))::numeric / (public.w_pvp_cfg()->>'acc_min')::int))) order by c.fine)
    from public.world_cantieri c where c.user_id = me and c.stato = 'lavori'), '[]'::json));
end $$;

revoke all on function public.w_cantieri_tick() from public, anon, authenticated;
revoke all on function public.w_cadute_tick() from public, anon, authenticated;
revoke all on function public.world_ripara(text) from public, anon;
revoke all on function public.world_cantiere_accelera(bigint) from public, anon;
revoke all on function public.world_cantieri_miei() from public, anon;
revoke all on function public.world_mezzo_scegli(text) from public, anon;
revoke all on function public.world_mezzi_info(numeric) from public, anon;
grant execute on function public.w_cantieri_tick() to service_role;
grant execute on function public.world_ripara(text) to authenticated;
grant execute on function public.world_cantiere_accelera(bigint) to authenticated;
grant execute on function public.world_cantieri_miei() to authenticated;
grant execute on function public.world_mezzo_scegli(text) to authenticated;
grant execute on function public.world_mezzi_info(numeric) to authenticated;
grant execute on function public.world_sped_parti(text, text, double precision, double precision) to authenticated;

-- ogni minuto: cantieri finiti
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('zsh-cantieri') where exists (select 1 from cron.job where jobname = 'zsh-cantieri');
    perform cron.schedule('zsh-cantieri', '* * * * *', 'select public.w_cantieri_tick();');
  end if;
end $$;

-- controllo: deve dire "mezzi e cantieri pronti"
select case when exists (select 1 from pg_proc where proname = 'world_cantiere_accelera') and exists (select 1 from pg_proc where proname = 'w_viaggio_mz')
       then 'mezzi e cantieri pronti' else 'qualcosa manca' end as esito;
