-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 048 — 🎮 MAPPA DEL GIOCO E SISTEMAZIONI DELL'ARENA (21/11)
-- 1) world_missioni: spedizioni e viaggi verso lo zombie con la posizione della meta (lat, lon),
--    così la mappa del gioco fa camminare il superstite per le strade.
-- 2) 💎 Arriva subito: lo scontro diventa pronto senza mandare anche la notifica "Il superstite è arrivato".
-- 3) Aprire uno scontro già fatto dice perché (già battuto, zombie andato via) invece di un errore.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.world_missioni() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k jsonb := public.w_gem_cfg(); L jsonb := '[]'::jsonb;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_cantieri_tick(); perform public.w_sup_lavori_tick(); perform public.w_scontri_tick(); perform public.w_attacchi_tick();
  -- 🔨 cantieri delle case
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','cantiere','id',c.id,'ic',case c.tipo when 'potenzia' then '🏗️' when 'restaura' then '🔧' else '🔨' end,
      'titolo', case c.tipo when 'potenzia' then 'Potenziamento ' || coalesce(c.def_kind,'') || ' → ' || coalesce(c.def_level::text,'') when 'restaura' then 'Restauro ' || coalesce(c.def_kind,'') else 'Riparazione' end,
      'meta', case when c.home then '❤️ Casa tua' else '🔑 Casa comprata' end, 'inizio', c.inizio, 'fine', c.fine,
      'secondi', greatest(0, extract(epoch from c.fine - now()))::int, 'gemme', public.w_gem_costo(c.fine, now()), 'bid', c.bid))
    from public.world_cantieri c where c.user_id = me and c.stato = 'lavori'), '[]'::jsonb);
  -- 🧑 sviluppi del superstite
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','sup','id',l.id,'ic','⬆️',
      'titolo', case l.tipo when 'stat' then 'Sviluppo ' || l.chiave when 'abil' then 'Abilità ' || l.chiave else 'Attrezzo ' || l.chiave end || ' · grado ' || l.grado,
      'meta', '🧑 Il tuo superstite', 'inizio', l.inizio, 'fine', l.fine, 'secondi', greatest(0, extract(epoch from l.fine - now()))::int, 'gemme', public.w_gem_costo(l.fine, now())))
    from public.world_sup_lavori l where l.user_id = me and l.stato = 'lavori'), '[]'::jsonb);
  -- 🎒 spedizioni (tornate = da raccogliere)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','spedizione','id',p.id,'ic','🎒','titolo','Spedizione', 'meta', coalesce(p.nome,'') || ' · ' || p.km || ' km', 'lat', p.lat, 'lon', p.lon,
      'inizio', p.start_at, 'fine', p.end_at, 'secondi', greatest(0, extract(epoch from p.end_at - now()))::int, 'pronto', p.end_at <= now(),
      'gemme', case when p.end_at > now() then public.w_gem_costo(p.end_at, now()) end))
    from public.world_spedizioni p where p.user_id = me and p.stato = 'via'), '[]'::jsonb);
  -- 🧟 superstite verso lo zombie (arrivato = pronto per l'arena)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','scontro','id',s.id,'ic',t.ic,'titolo','Verso ' || t.nome || ' · Lv ' || s.livello,
      'meta', '🎒 Superstite · ' || coalesce(s.km::text,'') || ' km', 'lat', s.zlat, 'lon', s.zlon, 'zid', s.zid, 'tipo_z', s.tipo, 'inizio', s.creato, 'fine', s.arrivo, 'scade', s.scade,
      'secondi', greatest(0, extract(epoch from s.arrivo - now()))::int, 'pronto', s.stato = 'pronto',
      'gemme', case when s.stato = 'viaggio' then public.w_gem_costo(s.arrivo, now()) end))
    from public.world_scontri s join public.w_zm_tipi() t on t.k = s.tipo where s.user_id = me and s.modo = 'superstite' and s.stato in ('viaggio','pronto')), '[]'::jsonb);
  -- ⚔️ i tuoi attacchi in viaggio (mai prima di 5 minuti dall'arrivo)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','attacco','id',a.id,'ic','⚔️','titolo','Attacco a @' || coalesce(pp.nick,'?'),
      'meta', coalesce(a.km::text,'') || ' km', 'inizio', a.partenza, 'fine', a.impatto, 'secondi', greatest(0, extract(epoch from a.impatto - now()))::int,
      'gemme', case when a.impatto > now() + make_interval(mins => (k->>'attacco_min_rimasti')::int)
        then public.w_gem_costo(a.impatto, now() + make_interval(mins => (k->>'attacco_min_rimasti')::int)) end))
    from public.world_attacchi a left join public.profili_pubblici pp on pp.user_id = a.vittima where a.attaccante = me and a.stato = 'viaggio'), '[]'::jsonb);
  -- 🛡️ i tuoi rinforzi in viaggio
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','rinforzo','id',r.id,'ic','🛡️','titolo','Rinforzi per @' || coalesce(pp.nick,'?'),
      'meta', coalesce(r.km::text,'') || ' km', 'inizio', r.partenza, 'fine', r.arrivo, 'secondi', greatest(0, extract(epoch from r.arrivo - now()))::int,
      'gemme', public.w_gem_costo(r.arrivo, now())))
    from public.world_attacchi_rinforzi r join public.world_attacchi a on a.id = r.attacco_id left join public.profili_pubblici pp on pp.user_id = a.vittima
    where r.helper = me and r.arrivo > now() and a.stato = 'viaggio'), '[]'::jsonb);
  -- 🚨 attacchi in arrivo a te (solo da guardare: si risponde con Prepara e rinforzi)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','arrivo','id',a.id,'ic','🚨','titolo','Attacco in arrivo da @' || coalesce(pp.nick,'?'),
      'meta', case when a.casa_vera then '❤️ Casa tua' else '🔑 Casa comprata' end, 'inizio', a.partenza, 'fine', a.impatto,
      'secondi', greatest(0, extract(epoch from a.impatto - now()))::int))
    from public.world_attacchi a left join public.profili_pubblici pp on pp.user_id = a.attaccante where a.vittima = me and a.stato = 'viaggio'), '[]'::jsonb);
  return json_build_object('ok', true, 'cfg', json_build_object('min_per_gemma', k->'min_per_gemma', 'subito_min', k->'subito_min'),
    'missioni', (select coalesce(jsonb_agg(x order by (x->>'pronto')::boolean desc nulls last, (x->>'fine')::timestamptz), '[]'::jsonb) from jsonb_array_elements(L) x));
end $$;

create or replace function public.world_scontro_subito(p_id bigint, p_costo_visto int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); sc public.world_scontri; g jsonb := public.w_gem_cfg(); costo int; r int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into sc from public.world_scontri where id = p_id and user_id = me for update;
  if sc.id is null or sc.stato <> 'viaggio' then return json_build_object('ok', false, 'msg', 'Il superstite è già arrivato'); end if;
  costo := greatest((g->>'subito_min')::int, ceil(extract(epoch from sc.arrivo - now()) / 60.0 / (g->>'min_per_gemma')::numeric)::int);
  if p_costo_visto is distinct from costo then return json_build_object('ok', false, 'cambiato', true, 'costo', costo, 'msg', 'Il costo è cambiato: ' || costo || ' 💎'); end if;
  r := public.w_gemme_add(me, -costo, 'Arrivo subito allo zombie', p_id::text, 'subito:scontro:' || p_id, false);
  if r is null then return json_build_object('ok', false, 'msg', 'Non hai abbastanza 💎'); end if;
  -- arrivato subito: pronto senza notifica (prima arrivava anche "Il superstite è arrivato" e sembrava doppio)
  update public.world_scontri set arrivo = now(), stato = 'pronto', scade = now() + make_interval(mins => (public.w_arena_cfg()->>'attesa_min')::int) where id = p_id;
  return json_build_object('ok', true, 'gemme', r, 'msg', '💎 Il superstite è arrivato!');
end $$;

create or replace function public.world_scontro_inizia(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); sc public.world_scontri; st jsonb; zs jsonb;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_scontri_tick();
  select * into sc from public.world_scontri where id = p_id and user_id = me for update;
  if sc.id is null then return json_build_object('ok', false, 'msg', 'Scontro non trovato'); end if;
  if sc.stato = 'viaggio' then return json_build_object('ok', false, 'msg', 'Il superstite è ancora in viaggio'); end if;
  if sc.stato <> 'pronto' then return json_build_object('ok', false, 'gia', true, 'stato', sc.stato, 'msg', case sc.stato when 'vinto' then '✅ Questo zombie l’hai già battuto' when 'scaduto' then '⌛ Lo zombie non ti ha aspettato: è andato via' when 'lotta' then 'Lo scontro è già aperto' else 'Questo scontro è già finito' end); end if;
  st := public.w_sup_stats(me); zs := public.w_arena_zstats(sc.tipo, sc.livello);
  update public.world_scontri set stato = 'lotta', inizio = now(), stats = st, zstats = zs where id = p_id;
  return json_build_object('ok', true, 'id', p_id, 'diff', sc.diff, 'modo', sc.modo, 'io', st, 'zombie', zs,
    'danno_io', public.w_arena_danno((st->>'forza')::int, (zs->>'difesa')::int),
    'danno_z', public.w_arena_danno((zs->>'forza')::int, (st->>'difesa')::int),
    'nome', (select nome from public.world_superstite where user_id = me), 'avatar', (select avatar from public.world_superstite where user_id = me));
end $$;

-- controllo: deve dire "gioco pronto"
select case when pg_get_functiondef('public.world_missioni()'::regprocedure) like '%zlat%' then 'gioco pronto' else 'qualcosa manca' end as esito;
