-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 041 — 🚗 I MEZZI DEL SUPERSTITE (20/11)
-- 6 mezzi in ordine: 🚶 a piedi, 🚲 bici, 🏍️ moto, 🚗 auto, 🚙 fuoristrada, 🚐 furgone (nuovo).
--  · Tempo: distanza vera sulla mappa ÷ velocità (5 / 15 / 40 / 60 / 50 / 45 km/h) + 2 min, come prima.
--  · Energia: a piedi l'energia del viaggio, in bici +1 (più veloce ma più fatica); i mezzi a motore non usano
--    energia ma ⛽ al km: moto 1, auto 1,5, fuoristrada 2, furgone 2,5.
--  · Capienza: quanto bottino riporti dalle spedizioni (e dalle casse): ×1 / ×1,2 / ×1,4 / ×1,8 / ×2,2 / ×3.
--  · Bottega: bici 🧱 100, moto 300, auto 600, fuoristrada 1.200, furgone 1.800 (se non li hai dalla valutazione).
--  · 🥫 → 🔋: world_energia_compra(n): 🥫 10 = 🔋 1, al massimo 10 al giorno e fino al pieno.
-- Funzioni toccate: w_pvp_cfg (velocità), w_mz_rank/carb/nome/atk/range/speed/help, world_mezzo, world_buy_mezzo,
-- world_mezzo_scegli, world_mezzi_info, world_sped_parti, world_sped_raccogli. Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_mz_rank(p text) returns integer language sql immutable as $$
  select case p when 'bici' then 1 when 'moto' then 2 when 'auto' then 3 when 'fuori' then 4 when 'furgone' then 5 else 0 end; $$;
create or replace function public.w_mz_carb(p_mz text, p_km double precision) returns integer language sql immutable as $$
  select ceil(greatest(coalesce(p_km,0),0) * case p_mz when 'moto' then 1 when 'auto' then 1.5 when 'fuori' then 2 when 'furgone' then 2.5 else 0 end)::int; $$;
create or replace function public.w_mz_nome(p_mz text) returns text language sql immutable as $$
  select case p_mz when 'bici' then 'in bici' when 'moto' then 'in moto' when 'auto' then 'in auto' when 'fuori' then 'in fuoristrada' when 'furgone' then 'in furgone' else 'a piedi' end; $$;
create or replace function public.w_mz_atk(p text) returns numeric language sql immutable as $$
  select case p when 'bici' then 0.9 when 'moto' then 1.0 when 'auto' then 1.2 when 'fuori' then 1.3 when 'furgone' then 1.1 else 0.8 end::numeric; $$;
create or replace function public.w_mz_range(p text) returns integer language sql immutable as $$
  select case p when 'bici' then 5 when 'moto' then 12 when 'auto' then 20 when 'fuori' then 20 when 'furgone' then 20 else 2 end; $$;
create or replace function public.w_mz_speed(p text) returns numeric language sql immutable as $$
  select case p when 'bici' then 15 when 'moto' then 40 when 'auto' then 50 when 'fuori' then 45 when 'furgone' then 45 else 5 end::numeric; $$;
create or replace function public.w_mz_cap(p text) returns numeric language sql immutable as $$
  select case p when 'bici' then 1.2 when 'moto' then 1.4 when 'auto' then 1.8 when 'fuori' then 2.2 when 'furgone' then 3.0 else 1.0 end::numeric; $$;
create or replace function public.w_mz_en(p text, p_base int) returns int language sql immutable as $$
  select case p when 'piedi' then greatest(1, coalesce(p_base, 1)) when 'bici' then greatest(1, coalesce(p_base, 1)) + 1 else 0 end; $$;

create or replace function public.world_energia_compra(p_n int) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; n int; fatti int; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); w public.world_wallet;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  s := public.w_sup(me); w := public.w_wallet(me);
  fatti := coalesce((w.caps->>('energia_cibo:' || day))::int, 0);
  if fatti >= 10 then return json_build_object('ok', false, 'msg', 'Oggi hai già convertito 10 energia: riprova domani'); end if;
  if s.energia >= public.w_en_max(s.abil) then return json_build_object('ok', false, 'msg', 'Energia già al massimo'); end if;
  n := least(greatest(coalesce(p_n, 1), 1), 10 - fatti, public.w_en_max(s.abil) - s.energia, floor(w.cibo / 10)::int);
  if n < 1 then return json_build_object('ok', false, 'msg', 'Servono 🥫 10 per 🔋 1'); end if;
  update public.world_wallet set cibo = cibo - 10 * n, caps = jsonb_set(caps, array['energia_cibo:' || day], to_jsonb(fatti + n)) where user_id = me;
  perform public.w_en_add(me, n);
  return json_build_object('ok', true, 'n', n, 'msg', format('🔋 +%s energia · 🥫 −%s', n, 10 * n));
end $$;

create or replace function public.w_pvp_cfg() RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
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
    'velocita', jsonb_build_object('piedi', 5, 'bici', 15, 'moto', 40, 'auto', 60, 'fuori', 50, 'furgone', 45),   -- km/h
    'viaggio_base', 2,                                                 -- minuti per partire
    'sped_ricerca', 5,                                                 -- minuti di ricerca sul posto (spedizioni)
    'cant_danno', 3, 'cant_integ', 2, 'cant_crollo', 240, 'cant_min', 10,   -- minuti di cantiere
    'acc_min', 5,
    -- potenziamenti a tempo (036)
    'pot_min', 20);                                                    -- minuti per livello: 20, 40, 60                                                     -- accelerare: 🧱 1 ogni 5 minuti che mancano
  $$;

create or replace function public.w_mz_help(p text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p when 'bici' then 5 when 'moto' then 6 when 'auto' then 8 when 'furgone' then 9 when 'fuori' then 10 else 4 end; $$;

create or replace function public.world_mezzo() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select json_build_object('mezzo', public.w_mezzo(auth.uid()),
    'vero', coalesce((select caps->>'mezzo_vero' from public.world_wallet where user_id = auth.uid()), 'piedi'),
    'comprato', (select caps->>'mezzo_comprato' from public.world_wallet where user_id = auth.uid()),
    'range_km', public.w_mz_range(public.w_mezzo(auth.uid())), 'speed', public.w_mz_speed(public.w_mezzo(auth.uid())),
    'help_pts', public.w_mz_help(public.w_mezzo(auth.uid())) + public.w_dot(auth.uid()), 'dotazioni', public.w_dot(auth.uid()),
    'atk_mult', public.w_mz_atk(public.w_mezzo(auth.uid())),
    'prezzi', json_build_object('bici', 100, 'moto', 300, 'auto', 600, 'fuori', 1200, 'furgone', 1800));
$$;

create or replace function public.world_buy_mezzo(p_mezzo text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); price int; w public.world_wallet;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  price := case p_mezzo when 'bici' then 100 when 'moto' then 300 when 'auto' then 600 when 'fuori' then 1200 when 'furgone' then 1800 else null end;
  if price is null then return json_build_object('ok', false, 'msg', 'Mezzo non in vendita'); end if;
  if public.w_mz_rank(p_mezzo) <= public.w_mz_rank(public.w_mezzo(me)) then return json_build_object('ok', false, 'msg', 'Hai già un mezzo uguale o migliore'); end if;
  w := public.w_wallet(me);
  if w.mattoni < price then return json_build_object('ok', false, 'msg', 'Servono ' || price || ' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - price, caps = jsonb_set(caps, '{mezzo_comprato}', to_jsonb(p_mezzo)) where user_id = me and mattoni >= price;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -price, 'Mezzo comprato', true);
  return json_build_object('ok', true, 'msg', 'Nuovo mezzo pronto', 'mezzo', p_mezzo);
end $$;

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
  if p_mz not in ('piedi','bici','moto','auto','fuori','furgone') or public.w_mz_rank(p_mz) > public.w_mz_rank(public.w_mezzo(me)) then
    return json_build_object('ok', false, 'msg', 'Questo mezzo non ce l’hai: lo trovi in Bottega'); end if;
  update public.world_wallet set caps = jsonb_set(caps, '{mezzo_scelto}', to_jsonb(p_mz)) where user_id = me;
  return json_build_object('ok', true, 'msg', '🚗 Viaggerai ' || public.w_mz_nome(p_mz));
end $$;

create or replace function public.world_mezzi_info(p_km numeric) returns json
language sql stable security definer set search_path to 'public' as $$
  select json_build_object('ok', auth.uid() is not null, 'km', round(coalesce(p_km, 0), 1),
    'scelto', (select caps->>'mezzo_scelto' from public.world_wallet where user_id = auth.uid()),
    'usato', public.w_mz_eff(auth.uid(), p_km), 'carb', coalesce((select carb from public.world_wallet where user_id = auth.uid()), 0),
    'mezzi', (select json_agg(json_build_object('mz', z, 'nome', public.w_mz_nome(z), 'kmh', (public.w_pvp_cfg()->'velocita'->>z)::int,
        'min', public.w_viaggio_mz(p_km, z), 'carb', public.w_mz_carb(z, p_km), 'forza', public.w_mz_atk(z), 'energia', public.w_mz_en(z, 1), 'cap', public.w_mz_cap(z)) order by public.w_mz_rank(z))
      from unnest(array['piedi','bici','moto','auto','fuori','furgone']) z where public.w_mz_rank(z) <= public.w_mz_rank(public.w_mezzo(auth.uid())))); $$;

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
  en := public.w_mz_en(mz, (c->>'energia')::int); mins := 2 * public.w_viaggio_mz(km, mz) + (public.w_pvp_cfg()->>'sped_ricerca')::int;
  if s.energia < en then
    return json_build_object('ok', false, 'energia_poca', true, 'msg', format('Serve %s energia %s: ne hai %s (una carica ogni %s min, o 🥫 10 = 🔋 1 nel superstite → 🚗 Mezzi). Con un mezzo a motore non serve energia', en, public.w_mz_nome(mz), s.energia, public.w_en_ric(s.abil)));
  end if;
  co := public.w_sped_costo(km); cc := (co->>'cibo')::int; ck := public.w_mz_carb(mz, km * 2);
  co := json_build_object('cibo', cc, 'carb', ck, 'mezzo', mz, 'cap', public.w_mz_cap(mz));
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
    'mezzo', mz, 'cap', public.w_mz_cap(mz), 'msg', format('🎒 Partito %s! Torna fra %s min · 🥫 −%s%s%s · bottino ×%s', public.w_mz_nome(mz), mins, cc, case when ck > 0 then ' ⛽ −' || ck else '' end, case when en > 0 then ' 🔋 −' || en else '' end, replace(public.w_mz_cap(mz)::text, '.', ',')));
end $$;

create or replace function public.world_sped_raccogli(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); x public.world_spedizioni; s public.world_superstite; w public.world_wallet; c jsonb; b int; ko boolean;
  l int := 0; f int := 0; k int := 0; e int := 0; xp int; mt int := 0; got json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); g0 int; tes int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into x from public.world_spedizioni where id = p_id and user_id = me for update;
  if x.id is null or x.stato <> 'via' then return json_build_object('ok', false, 'msg', 'Spedizione già raccolta'); end if;
  if x.end_at > now() then return json_build_object('ok', false, 'msg', 'Non è ancora tornato'); end if;
  s := public.w_sup(me); g0 := public.w_grado(s.xp); c := x.calc;
  ko := random() * 100 < x.rischio;
  b := round((c->>'bottino')::int * coalesce((c->>'cap')::numeric, 1)); if ko then b := b / 2; end if;
  case x.kind
    when 'cibo' then f := b;
    when 'legno' then l := b;
    when 'carb' then k := round(b * 0.6);
    when 'farmaco' then f := b / 2; e := case when ko then 1 else 2 end;
    when 'sponsor' then l := b / 2; f := b / 2; k := b / 3;
    else l := b / 3; f := b / 3; k := b / 3;
  end case;
  got := public.w_res(me, l, f, k);
  if e > 0 then perform public.w_en_add(me, e); end if;
  xp := (c->>'xp')::int + case when x.kind = 'sponsor' then 5 else 0 end; if ko then xp := xp / 2; end if;
  perform public.w_xp(me, xp);
  w := public.w_wallet(me); tes := coalesce((w.caps->>('tesori:' || day))::int, 0);
  if random() * 100 < (c->>'tesoro')::int and tes < 5 then
    mt := least(60, 15 + 5 * g0);
    update public.world_wallet set caps = jsonb_set(caps, array['tesori:' || day], to_jsonb(tes + 1)) where user_id = me;
    perform public.w_pay(me, mt, 'Spedizione: tesoro trovato');
  end if;
  update public.world_spedizioni set stato = 'raccolta', avvisato = true,
    esito = jsonb_build_object('ko', ko, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'energia', e, 'xp', xp, 'mattoni', mt)
    where id = p_id;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'ko', ko, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
    'energia', e, 'xp', xp, 'mattoni', mt, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0,
    'msg', case when ko then 'Gli zombie l’hanno inseguito: ha portato a casa metà' else 'Spedizione riuscita' end);
end $$;

revoke all on function public.world_energia_compra(int) from public, anon;
grant execute on function public.world_energia_compra(int) to authenticated;

-- controllo: deve dire "mezzi pronti"
select case when public.w_mz_cap('furgone') = 3.0 and exists (select 1 from pg_proc where proname = 'world_energia_compra') then 'mezzi pronti' else 'qualcosa manca' end as esito;
