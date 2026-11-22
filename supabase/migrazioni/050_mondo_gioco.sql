-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 050 — 🔗 MONDO E GIOCO INSIEME (22/11)
-- • 🏠 Ogni zombie battuto nell'arena entro 1 km da una tua casa dà +2 alla difesa di quella casa
--   per la prossima orda (massimo +10 a casa, tipo 'gioco' in world_assalti, sommato in w_casa_extra).
-- • 🏰 Vicino a casa (entro 300 m) le fortificazioni aiutano anche nell'arena: ❤️ +5 e 🛡️ +1 per livello della casa (max 5).
-- Si può eseguire più volte.
-- =====================================================================
alter table public.world_assalti drop constraint if exists world_assalti_kind_check;
alter table public.world_assalti add constraint world_assalti_kind_check check (kind = any (array['atk','aiuto','assi','gioco']));

create or replace function public.w_casa_extra(p_bid text, p_slot text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select (least(18, coalesce(sum(pts) filter (where kind = 'assi'), 0)) + least(24, coalesce(sum(pts) filter (where kind = 'aiuto'), 0)) + least(10, coalesce(sum(pts) filter (where kind = 'gioco'), 0))
        - least(40, coalesce(sum(pts) filter (where kind = 'atk'), 0)))::int
  from public.world_assalti where bid = p_bid and slot_id = p_slot; $$;

create or replace function public.world_scontro_fine(p_id bigint, p_esito text, p_colpi integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); sc public.world_scontri; c jsonb := public.w_arena_cfg(); el numeric; serve int; tmin numeric; v boolean;
  xp int := 0; q int; got json; nuovo boolean := false; g0 int; s public.world_superstite; rar int; mt int := 0;
  h record; nid text := public.w_slot_id(public.w_next_slot(now())); cg int := 0;
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
  s := public.w_sup(me);
  update public.world_scontri set stato = 'vinto', fine = now(),
    premi = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt, 'nuovo', nuovo, 'case', cg) where id = p_id;
  return json_build_object('ok', true, 'vinto', true, 'esito', 'vinto', 'xp', xp, 'nuovo', nuovo, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int,
    'carb', (got->>'carb')::int, 'mattoni', mt, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp), 'nome', sc.zstats->>'nome', 'ic', sc.zstats->>'ic',
    'case_difese', cg, 'orda', right(nid, 2));
end $$;

create or replace function public.world_scontro_inizia(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); sc public.world_scontri; st jsonb; zs jsonb; lv int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_scontri_tick();
  select * into sc from public.world_scontri where id = p_id and user_id = me for update;
  if sc.id is null then return json_build_object('ok', false, 'msg', 'Scontro non trovato'); end if;
  if sc.stato = 'viaggio' then return json_build_object('ok', false, 'msg', 'Il superstite è ancora in viaggio'); end if;
  if sc.stato <> 'pronto' then return json_build_object('ok', false, 'gia', true, 'stato', sc.stato, 'msg', case sc.stato when 'vinto' then '✅ Questo zombie l’hai già battuto' when 'scaduto' then '⌛ Lo zombie non ti ha aspettato: è andato via' when 'lotta' then 'Lo scontro è già aperto' else 'Questo scontro è già finito' end); end if;
  st := public.w_sup_stats(me); zs := public.w_arena_zstats(sc.tipo, sc.livello);
  -- 🏰 vicino a casa (entro 300 m da una tua casa) le fortificazioni aiutano: ❤️ +5 e 🛡️ +1 per livello della casa (max 5)
  select max(least(5, greatest(1, coalesce(b.level, 1)))) into lv from (select building_id, lat, lon from public.world_homes where user_id = me
      union select building_id, lat, lon from public.world_buildings where owner = me) x left join public.world_buildings b on b.building_id = x.building_id
    where sc.zlat is not null and public.w_km(x.lat, x.lon, sc.zlat, sc.zlon) <= 0.3;
  if lv is not null then st := st || jsonb_build_object('vita', (st->>'vita')::int + 5 * lv, 'difesa', (st->>'difesa')::int + lv, 'casa', lv); end if;
  update public.world_scontri set stato = 'lotta', inizio = now(), stats = st, zstats = zs where id = p_id;
  return json_build_object('ok', true, 'id', p_id, 'diff', sc.diff, 'modo', sc.modo, 'io', st, 'zombie', zs,
    'danno_io', public.w_arena_danno((st->>'forza')::int, (zs->>'difesa')::int),
    'danno_z', public.w_arena_danno((zs->>'forza')::int, (st->>'difesa')::int),
    'nome', (select nome from public.world_superstite where user_id = me), 'avatar', (select avatar from public.world_superstite where user_id = me));
end $$;

-- controllo: deve dire "mondo e gioco pronti"
select case when pg_get_functiondef('public.w_casa_extra(text,text)'::regprocedure) like '%gioco%' then 'mondo e gioco pronti' else 'qualcosa manca' end as esito;
