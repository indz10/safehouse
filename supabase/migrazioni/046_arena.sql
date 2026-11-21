-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 046 — 🧟 ARENA: ZOMBIE DI PERSONA O COL SUPERSTITE (21/11)
-- Ogni zombie del mondo vero (world_zombie_vicini) si affronta in due modi:
--   📍 di persona: con la Lente, entro 80 m (+ la precisione del GPS, massimo 50 m in più);
--   🎒 col superstite: parte dalla casa scelta, col mezzo, costa viaggio (🥫, ⛽ o 🔋) e tempo; all'arrivo
--      arriva la notifica e lo zombie lo aspetta 30 minuti. Le 💎 accorciano solo il viaggio, mai lo scontro.
-- Poi lo scontro nell'arena: statistiche del superstite e dello zombie fissate all'inizio (w_sup_stats),
-- livello dello zombie secondo il grado e la difficoltà scelta (facile −2, equilibrato, difficile +2).
-- Il server controlla tempi e risultato e dà XP e scorte una volta sola per scontro vinto.
-- Regole provvisorie in w_arena_cfg(). Si può eseguire più volte.
-- =====================================================================
create table if not exists public.world_scontri (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  zid text not null,
  tipo text not null,
  modo text not null check (modo in ('persona','superstite')),
  diff text not null check (diff in ('facile','equilibrato','difficile')),
  livello int not null,
  zlat double precision not null,
  zlon double precision not null,
  km numeric,
  costo jsonb not null default '{}'::jsonb,
  stato text not null default 'pronto' check (stato in ('viaggio','pronto','lotta','vinto','perso','abbandonato','scaduto')),
  creato timestamptz not null default now(),
  arrivo timestamptz not null default now(),
  scade timestamptz not null,
  inizio timestamptz,
  fine timestamptz,
  stats jsonb,
  zstats jsonb,
  premi jsonb
);
create index if not exists world_scontri_u on public.world_scontri(user_id, stato);
create unique index if not exists world_scontri_zid on public.world_scontri(user_id, zid);
alter table public.world_scontri enable row level security;
drop policy if exists world_scontri_mie on public.world_scontri;
create policy world_scontri_mie on public.world_scontri for select using (user_id = auth.uid());

create or replace function public.w_arena_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'dist_m', 80, 'acc_max_m', 50,              -- di persona: 80 m + precisione GPS (al massimo 50)
    'attesa_min', 30,                           -- dopo l'arrivo del superstite lo zombie aspetta 30 minuti
    'max_giorno', 30,                           -- scontri al giorno
    'diff', jsonb_build_object('facile', -2, 'equilibrato', 0, 'difficile', 2),
    'xp_molt', jsonb_build_object('facile', 0.7, 'equilibrato', 1.0, 'difficile', 1.5),
    'durata_max_s', 300,
    'colpi_s', 2.5);                            -- colpi al secondo al massimo (per il controllo dei tempi)
$$;

-- statistiche dello zombie: crescono col livello e con la rarità del tipo
create or replace function public.w_arena_zstats(p_tipo text, p_liv int) returns jsonb language sql immutable as $$
  select jsonb_build_object('livello', p_liv, 'tipo', t.k, 'nome', t.nome, 'ic', t.ic, 'rar', t.rar,
    'vita', 50 + t.hp * 8 + p_liv * 10,
    'forza', 7 + round(p_liv * 1.2 + t.rar * 2)::int,
    'difesa', 4 + p_liv + t.rar,
    'agilita', 5 + p_liv / 2 + case t.k when 'corridore' then 4 when 'cane' then 4 when 'bruto' then -2 else 0 end)
  from public.w_zm_tipi() t where t.k = p_tipo; $$;

-- danno di un colpo: forza × 1,5 − difesa × 0,6 (almeno 1). Uguale nell'app (arnDanno in p107).
create or replace function public.w_arena_danno(p_forza int, p_difesa int) returns int language sql immutable as $$
  select greatest(1, round(p_forza * 1.5 - p_difesa * 0.6))::int; $$;

-- viaggio del superstite verso il punto: mezzo, minuti, costo (solo andata: lo scontro è là)
create or replace function public.w_arena_viaggio(p_user uuid, p_lat double precision, p_lon double precision) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare km numeric; mz text; s public.world_superstite;
begin
  km := public.w_sped_km(p_user, p_lat, p_lon);
  if km is null then return jsonb_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo: il superstite parte da lì'); end if;
  km := greatest(0.1, round(km, 2)); s := public.w_sup(p_user);
  mz := public.w_mz_eff(p_user, km);
  return jsonb_build_object('ok', km <= public.w_sup_raggio(s.xp, s.abil), 'km', km, 'raggio', public.w_sup_raggio(s.xp, s.abil),
    'mezzo', mz, 'mezzo_nome', public.w_mz_nome(mz), 'min', public.w_viaggio_mz(km, mz),
    'cibo', 1 + ceil(km)::int, 'carb', public.w_mz_carb(mz, km), 'energia', public.w_mz_en(mz, 1));
end $$;

create or replace function public.w_scontri_tick() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  for r in update public.world_scontri set stato = 'pronto' where stato = 'viaggio' and arrivo <= now() returning id, user_id, tipo loop
    perform public.w_feed_add('scontro_pronto', r.user_id, r.user_id, null, null,
      r.id || '|' || coalesce((select t.ic || ' ' || t.nome from public.w_zm_tipi() t where t.k = r.tipo), 'Zombie'));
    n := n + 1;
  end loop;
  update public.world_scontri set stato = 'scaduto', fine = now() where stato = 'pronto' and scade < now();
  update public.world_scontri set stato = 'abbandonato', fine = now() where stato = 'lotta' and inizio < now() - interval '15 minutes';
  return n;
end $$;

-- scheda dell'incontro: zombie ai 3 livelli, statistiche tue, viaggio del superstite
create or replace function public.world_scontro_info(p_zid text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); z json; st jsonb; g int; c jsonb := public.w_arena_cfg(); v jsonb; sc public.world_scontri;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_scontri_tick();
  select * into sc from public.world_scontri where user_id = me and zid = p_zid;
  z := public.w_zm_trova(p_zid);
  if sc.id is null and (z is null or z->>'k' <> 'zombie') then return json_build_object('ok', false, 'msg', 'Questo zombie è sparito'); end if;
  if sc.id is null and exists (select 1 from public.world_zombie_presi where user_id = me and zid = p_zid) then return json_build_object('ok', false, 'msg', 'L’hai già abbattuto'); end if;
  perform public.w_sup(me); st := public.w_sup_stats(me); g := (st->>'grado')::int;
  v := public.w_arena_viaggio(me, coalesce(sc.zlat, (z->>'lat')::float), coalesce(sc.zlon, (z->>'lon')::float));
  return json_build_object('ok', true, 'zid', p_zid, 'tipo', coalesce(sc.tipo, z->>'tipo'), 'io', st, 'cfg', c, 'viaggio', v,
    'scontro', case when sc.id is null then null else json_build_object('id', sc.id, 'stato', sc.stato, 'modo', sc.modo, 'diff', sc.diff,
      'arrivo', sc.arrivo, 'scade', sc.scade, 'secondi', greatest(0, extract(epoch from sc.arrivo - now()))::int) end,
    'livelli', json_build_object(
      'facile', public.w_arena_zstats(coalesce(sc.tipo, z->>'tipo'), greatest(1, g + (c->'diff'->>'facile')::int)),
      'equilibrato', public.w_arena_zstats(coalesce(sc.tipo, z->>'tipo'), greatest(1, g)),
      'difficile', public.w_arena_zstats(coalesce(sc.tipo, z->>'tipo'), greatest(1, g + (c->'diff'->>'difficile')::int))));
end $$;

-- 📍 di persona (subito pronto) o 🎒 col superstite (viaggio)
create or replace function public.world_scontro_parti(p_zid text, p_modo text, p_diff text, p_lat double precision, p_lon double precision, p_acc double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); z json; c jsonb := public.w_arena_cfg(); s public.world_superstite; g int; liv int; w public.world_wallet;
  day text := to_char(now() at time zone 'Europe/Rome', 'YYYY-MM-DD'); n int; v jsonb; d numeric; nid bigint; en int; cc int; ck int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_modo not in ('persona','superstite') or p_diff not in ('facile','equilibrato','difficile') then return json_build_object('ok', false, 'msg', 'Scelta non valida'); end if;
  z := public.w_zm_trova(p_zid);
  if z is null or z->>'k' <> 'zombie' then return json_build_object('ok', false, 'msg', 'Questo zombie è sparito'); end if;
  if exists (select 1 from public.world_zombie_presi where user_id = me and zid = p_zid) then return json_build_object('ok', false, 'msg', 'L’hai già abbattuto'); end if;
  if exists (select 1 from public.world_scontri where user_id = me and zid = p_zid) then return json_build_object('ok', false, 'msg', 'Hai già affrontato questo zombie'); end if;
  if p_modo = 'superstite' and exists (select 1 from public.world_scontri where user_id = me and stato in ('viaggio','pronto') and modo = 'superstite') then
    return json_build_object('ok', false, 'msg', 'Il superstite è già in viaggio verso uno zombie: affronta prima quello'); end if;
  w := public.w_wallet(me); n := coalesce((w.caps->>('arena:' || day))::int, 0);
  if n >= (c->>'max_giorno')::int then return json_build_object('ok', false, 'msg', 'Oggi hai già fatto ' || n || ' scontri: riposati'); end if;
  s := public.w_sup(me); g := public.w_grado(s.xp); liv := greatest(1, g + (c->'diff'->>p_diff)::int);
  if p_modo = 'persona' then
    d := public.w_km(p_lat, p_lon, (z->>'lat')::float, (z->>'lon')::float) * 1000;
    if p_lat is null or d > (c->>'dist_m')::int + least(greatest(coalesce(p_acc, 0), 0), (c->>'acc_max_m')::int) then
      return json_build_object('ok', false, 'msg', format('Avvicinati: sei a %s m, serve meno di %s m', round(coalesce(d, 9999)), (c->>'dist_m')::int + least(greatest(coalesce(p_acc, 0), 0), (c->>'acc_max_m')::int)::int)); end if;
    if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min)', public.w_en_ric(s.abil))); end if;
    update public.world_superstite set energia = energia - 1, energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
    insert into public.world_scontri(user_id, zid, tipo, modo, diff, livello, zlat, zlon, costo, stato, scade)
      values (me, p_zid, z->>'tipo', 'persona', p_diff, liv, (z->>'lat')::float, (z->>'lon')::float, '{"energia":1}', 'pronto', now() + interval '15 minutes') returning id into nid;
  else
    v := public.w_arena_viaggio(me, (z->>'lat')::float, (z->>'lon')::float);
    if not coalesce((v->>'ok')::boolean, false) then
      return json_build_object('ok', false, 'msg', coalesce(v->>'msg', format('È a %s km: il raggio del superstite è %s km', v->>'km', v->>'raggio'))); end if;
    en := (v->>'energia')::int; cc := (v->>'cibo')::int; ck := (v->>'carb')::int;
    if s.energia < en then return json_build_object('ok', false, 'msg', format('Serve %s energia %s: ne hai %s', en, v->>'mezzo_nome', s.energia)); end if;
    if w.cibo < cc or w.carb < ck then return json_build_object('ok', false, 'msg', format('Per il viaggio servono 🥫 %s%s', cc, case when ck > 0 then ' e ⛽ ' || ck else '' end)); end if;
    update public.world_wallet set cibo = cibo - cc, carb = carb - ck where user_id = me;
    update public.world_superstite set energia = energia - en, energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
    insert into public.world_scontri(user_id, zid, tipo, modo, diff, livello, zlat, zlon, km, costo, stato, arrivo, scade)
      values (me, p_zid, z->>'tipo', 'superstite', p_diff, liv, (z->>'lat')::float, (z->>'lon')::float, (v->>'km')::numeric,
              jsonb_build_object('cibo', cc, 'carb', ck, 'energia', en, 'mezzo', v->>'mezzo'), 'viaggio',
              now() + make_interval(mins => (v->>'min')::int), now() + make_interval(mins => (v->>'min')::int + (c->>'attesa_min')::int)) returning id into nid;
  end if;
  update public.world_wallet set caps = jsonb_set(caps, array['arena:' || day], to_jsonb(n + 1)) where user_id = me;
  return json_build_object('ok', true, 'id', nid, 'stato', case when p_modo = 'persona' then 'pronto' else 'viaggio' end,
    'min', case when p_modo = 'persona' then 0 else (v->>'min')::int end,
    'msg', case when p_modo = 'persona' then '🧟 Allo scontro!' else format('🎒 Il superstite parte %s: arriva fra %s min. Ti avviso io', v->>'mezzo_nome', v->>'min') end);
end $$;

-- 💎 accorcia solo il viaggio del superstite (1 💎 ogni 6 minuti come gli altri lavori), mai lo scontro
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
  update public.world_scontri set arrivo = now(), scade = now() + make_interval(mins => (public.w_arena_cfg()->>'attesa_min')::int) where id = p_id;
  perform public.w_scontri_tick();
  return json_build_object('ok', true, 'gemme', r, 'msg', '💎 Il superstite è arrivato!');
end $$;

-- inizio: statistiche fissate adesso (i lavori che finiscono durante lo scontro non contano)
create or replace function public.world_scontro_inizia(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); sc public.world_scontri; st jsonb; zs jsonb;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_scontri_tick();
  select * into sc from public.world_scontri where id = p_id and user_id = me for update;
  if sc.id is null then return json_build_object('ok', false, 'msg', 'Scontro non trovato'); end if;
  if sc.stato = 'viaggio' then return json_build_object('ok', false, 'msg', 'Il superstite è ancora in viaggio'); end if;
  if sc.stato <> 'pronto' then return json_build_object('ok', false, 'msg', 'Questo scontro è già finito'); end if;
  st := public.w_sup_stats(me); zs := public.w_arena_zstats(sc.tipo, sc.livello);
  update public.world_scontri set stato = 'lotta', inizio = now(), stats = st, zstats = zs where id = p_id;
  return json_build_object('ok', true, 'id', p_id, 'diff', sc.diff, 'modo', sc.modo, 'io', st, 'zombie', zs,
    'danno_io', public.w_arena_danno((st->>'forza')::int, (zs->>'difesa')::int),
    'danno_z', public.w_arena_danno((zs->>'forza')::int, (st->>'difesa')::int),
    'nome', (select nome from public.world_superstite where user_id = me), 'avatar', (select avatar from public.world_superstite where user_id = me));
end $$;

-- fine: 'vinto' / 'perso' / 'abbandonato'. Vittoria valida solo se il tempo basta per i colpi necessari.
create or replace function public.world_scontro_fine(p_id bigint, p_esito text, p_colpi int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); sc public.world_scontri; c jsonb := public.w_arena_cfg(); el numeric; serve int; tmin numeric; v boolean;
  xp int := 0; q int; got json; nuovo boolean := false; g0 int; s public.world_superstite; rar int; mt int := 0;
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
  s := public.w_sup(me);
  update public.world_scontri set stato = 'vinto', fine = now(),
    premi = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt, 'nuovo', nuovo) where id = p_id;
  return json_build_object('ok', true, 'vinto', true, 'esito', 'vinto', 'xp', xp, 'nuovo', nuovo, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int,
    'carb', (got->>'carb')::int, 'mattoni', mt, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp), 'nome', sc.zstats->>'nome', 'ic', sc.zstats->>'ic');
end $$;

create or replace function public.world_scontri_miei() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_scontri_tick();
  return json_build_object('ok', true, 'scontri', coalesce((select json_agg(json_build_object('id', s.id, 'zid', s.zid, 'tipo', s.tipo, 'modo', s.modo, 'diff', s.diff,
      'livello', s.livello, 'stato', s.stato, 'arrivo', s.arrivo, 'scade', s.scade, 'km', s.km, 'costo', s.costo,
      'secondi', greatest(0, extract(epoch from s.arrivo - now()))::int, 'nome', t.nome, 'ic', t.ic) order by s.arrivo)
    from public.world_scontri s join public.w_zm_tipi() t on t.k = s.tipo where s.user_id = me and s.stato in ('viaggio','pronto')), '[]'::json));
end $$;

revoke all on function public.w_scontri_tick() from public, anon, authenticated;
revoke all on function public.w_arena_viaggio(uuid, double precision, double precision) from public, anon, authenticated;
grant execute on function public.world_scontro_info(text) to authenticated;
grant execute on function public.world_scontro_parti(text, text, text, double precision, double precision, double precision) to authenticated;
grant execute on function public.world_scontro_subito(bigint, int) to authenticated;
grant execute on function public.world_scontro_inizia(bigint) to authenticated;
grant execute on function public.world_scontro_fine(bigint, text, int) to authenticated;
grant execute on function public.world_scontri_miei() to authenticated;

-- orologio: ogni minuto (arrivi del superstite → notifica 'scontro_pronto')
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('zsh-scontri') where exists (select 1 from cron.job where jobname = 'zsh-scontri');
    perform cron.schedule('zsh-scontri', '* * * * *', 'select public.w_scontri_tick();');
  end if;
end $$;

-- controllo: deve dire "arena pronta"
select case when exists (select 1 from pg_proc where proname = 'world_scontro_fine') then 'arena pronta' else 'qualcosa manca' end as esito;
