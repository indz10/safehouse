-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 052 — 💎 GEMME DAL GIOCO E 🎖️ PISTA SETTIMANALE (22/11)
-- Il 🎮 Gioco fa guadagnare, il 🌍 Mondo fa spendere.
-- • 💎 nel Gioco: vittoria in arena 1 (difficile 2), prima vittoria del giorno +2, zombie nuovo nella Zombipedia +3,
--   "Difenditi" senza errori +1 (una volta per scontro), colpo finale al Boss +5. Al massimo 10 💎 al giorno (w_gioco_cfg).
--   Le gemme passano sempre da w_gemme_add con una chiave unica (niente doppioni).
-- • 🎖️ piastrine (senza tetto): vittoria 6/10/15 secondo la difficoltà, "Difenditi" perfetto 3, attacco al Boss 3, colpo finale 20.
--   Riempiono la pista della settimana (lunedì → domenica): ogni tappa dà premi per il Mondo (risorse, energia, mattoni, gemme).
-- Si può eseguire più volte.
-- =====================================================================
create table if not exists public.world_pista (
  user_id uuid not null references auth.users(id) on delete cascade,
  sett text not null,
  piastrine int not null default 0,
  presi int not null default 0,
  primary key (user_id, sett)
);
alter table public.world_pista enable row level security;
drop policy if exists world_pista_mia on public.world_pista;
create policy world_pista_mia on public.world_pista for select using (user_id = auth.uid());

create or replace function public.w_gioco_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object('max_giorno', 10, 'boss_finale', 5, 'qte', 1,
    'tappe', jsonb_build_array(
      jsonb_build_object('p', 50,  'cibo', 20, 'legno', 20),
      jsonb_build_object('p', 120, 'gemme', 2),
      jsonb_build_object('p', 200, 'energia', 3),
      jsonb_build_object('p', 300, 'mattoni', 80),
      jsonb_build_object('p', 420, 'gemme', 3),
      jsonb_build_object('p', 560, 'cibo', 40, 'legno', 40, 'carb', 40),
      jsonb_build_object('p', 720, 'energia', 5),
      jsonb_build_object('p', 900, 'mattoni', 200, 'gemme', 5))); $$;

create or replace function public.w_settimana() returns text language sql stable as $$
  select to_char(now() at time zone 'Europe/Rome', 'IYYY-"W"IW'); $$;

-- gemme del Gioco già prese oggi (ora italiana)
create or replace function public.w_gioco_oggi(p_user uuid) returns int language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(delta), 0)::int from public.world_gemme_mov
  where user_id = p_user and delta > 0 and motivo like 'Gioco:%'
    and (created_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date; $$;

-- dà gemme dal Gioco rispettando il tetto del giorno; risponde quante ne ha date davvero
create or replace function public.w_gioco_gemme(p_user uuid, p_n int, p_motivo text, p_ref text, p_chiave text) returns int
  language plpgsql security definer set search_path to 'public' as $$
declare dar int;
begin
  if p_user is null or coalesce(p_n, 0) <= 0 then return 0; end if;
  dar := least(p_n, greatest(0, (public.w_gioco_cfg()->>'max_giorno')::int - public.w_gioco_oggi(p_user)));
  if dar <= 0 then return 0; end if;
  if public.w_gemme_add(p_user, dar, p_motivo, p_ref, p_chiave) is null then return 0; end if;
  return dar;
exception when others then return 0;
end $$;

create or replace function public.w_piastrine(p_user uuid, p_n int) returns int language plpgsql security definer set search_path to 'public' as $$
declare t int;
begin
  if p_user is null or coalesce(p_n, 0) <= 0 then return null; end if;
  insert into public.world_pista(user_id, sett, piastrine) values (p_user, public.w_settimana(), p_n)
    on conflict (user_id, sett) do update set piastrine = public.world_pista.piastrine + p_n returning piastrine into t;
  return t;
end $$;

create or replace function public.world_pista_info() returns json language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); r public.world_pista; c jsonb := public.w_gioco_cfg();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into r from public.world_pista where user_id = me and sett = public.w_settimana();
  return json_build_object('ok', true, 'sett', public.w_settimana(), 'piastrine', coalesce(r.piastrine, 0), 'presi', coalesce(r.presi, 0),
    'tappe', c->'tappe', 'gemme_oggi', public.w_gioco_oggi(me), 'gemme_max', (c->>'max_giorno')::int,
    'fine', (date_trunc('week', now() at time zone 'Europe/Rome') + interval '7 days') at time zone 'Europe/Rome');
end $$;

-- riscuote tutte le tappe raggiunte e non ancora prese
create or replace function public.world_pista_riscatta() returns json language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); r public.world_pista; c jsonb := public.w_gioco_cfg(); t jsonb; i int; n int := 0;
  gm int := 0; ci int := 0; le int := 0; ca int := 0; en int := 0; mt int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into r from public.world_pista where user_id = me and sett = public.w_settimana() for update;
  if r.user_id is null then return json_build_object('ok', false, 'msg', 'Gioca nel 🎮 Gioco per guadagnare piastrine'); end if;
  for i in r.presi .. jsonb_array_length(c->'tappe') - 1 loop
    t := c->'tappe'->i;
    exit when r.piastrine < (t->>'p')::int;
    n := n + 1;
    ci := ci + coalesce((t->>'cibo')::int, 0); le := le + coalesce((t->>'legno')::int, 0); ca := ca + coalesce((t->>'carb')::int, 0);
    en := en + coalesce((t->>'energia')::int, 0); mt := mt + coalesce((t->>'mattoni')::int, 0);
    if coalesce((t->>'gemme')::int, 0) > 0 then
      if public.w_gemme_add(me, (t->>'gemme')::int, 'Pista della settimana', r.sett, 'pista:' || me || ':' || r.sett || ':' || i) is not null then gm := gm + (t->>'gemme')::int; end if;
    end if;
  end loop;
  if n = 0 then return json_build_object('ok', false, 'msg', 'Nessuna tappa nuova: continua a giocare'); end if;
  update public.world_pista set presi = presi + n where user_id = me and sett = r.sett;
  if ci + le + ca > 0 then perform public.w_res(me, le, ci, ca); end if;
  if mt > 0 then perform public.w_pay(me, mt, 'Pista della settimana', 'pista:' || r.sett || ':' || r.presi); end if;
  if en > 0 then perform public.w_sup(me); update public.world_superstite set energia = energia + en where user_id = me; end if;
  return json_build_object('ok', true, 'tappe', n, 'gemme', gm, 'cibo', ci, 'legno', le, 'carb', ca, 'energia', en, 'mattoni', mt);
end $$;

-- "Difenditi" fatto senza errori: +1 💎 e +3 🎖️, una volta per scontro, solo a scontro aperto
create or replace function public.world_gioco_sequenza(p_id bigint) returns json language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); sc public.world_scontri; gm int;
begin
  if me is null then return json_build_object('ok', false); end if;
  select * into sc from public.world_scontri where id = p_id and user_id = me;
  if sc.id is null or sc.stato <> 'lotta' then return json_build_object('ok', false); end if;
  if exists (select 1 from public.world_gemme_mov where chiave = 'gioco:qte:' || p_id) then return json_build_object('ok', true, 'gemme', 0, 'piastrine', 0); end if;
  gm := public.w_gioco_gemme(me, (public.w_gioco_cfg()->>'qte')::int, 'Gioco: Difenditi perfetto', 'scontro:' || p_id, 'gioco:qte:' || p_id);
  perform public.w_piastrine(me, 3);
  return json_build_object('ok', true, 'gemme', gm, 'piastrine', 3);
end $$;

create or replace function public.world_scontro_fine(p_id bigint, p_esito text, p_colpi integer) RETURNS json
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
    'case_difese', cg, 'orda', right(nid, 2), 'gemme', gm, 'piastrine', pz, 'gemme_oggi', public.w_gioco_oggi(me), 'gemme_max', (public.w_gioco_cfg()->>'max_giorno')::int);
end $$;

create or replace function public.world_boss_fine(p_id bigint, p_colpi integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); c public.world_boss_colpi; b public.world_boss; el numeric; k int; dn int; s public.world_superstite;
  caduto boolean := false; u record; pos int := 0; got json; gm int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into c from public.world_boss_colpi where id = p_id and user_id = me for update;
  if c.id is null or c.fine_at is not null then return json_build_object('ok', false, 'msg', 'Attacco già chiuso'); end if;
  select * into b from public.world_boss where id = c.boss_id for update;
  el := extract(epoch from (now() - c.start_at));
  k := case when el > 120 then 0 else greatest(0, least(coalesce(p_colpi, 0), 45, floor(el / 0.45)::int)) end;
  s := public.w_sup(me);
  dn := case when k = 0 then 0 else round(k * c.base * c.molt)::int + public.w_grado(s.xp) end;
  if b.caduto_at is not null then dn := 0; end if;
  dn := least(dn, b.hp);
  update public.world_boss_colpi set fine_at = now(), colpi = k, danno = dn where id = p_id;
  update public.world_boss set hp = hp - dn where id = b.id returning * into b;
  if dn > 0 then perform public.w_xp(me, 5 + k / 3); perform public.w_piastrine(me, 3); end if;
  if b.hp <= 0 and b.caduto_at is null then
    update public.world_boss set caduto_at = now() where id = b.id;
    caduto := true;
    gm := public.w_gioco_gemme(me, (public.w_gioco_cfg()->>'boss_finale')::int, 'Gioco: colpo finale al Boss', 'boss:' || b.id, 'gioco:boss:' || b.id); perform public.w_piastrine(me, 20);
    for u in select user_id, sum(danno)::int d from public.world_boss_colpi where boss_id = b.id and danno > 0 group by user_id order by 2 desc loop
      pos := pos + 1;
      perform public.w_res(u.user_id, 25 + least(75, u.d / 8), 25 + least(75, u.d / 8), 10 + least(40, u.d / 16));
      perform public.w_xp(u.user_id, 40 + least(80, u.d / 5));
      if pos <= 3 then perform public.w_pay(u.user_id, case pos when 1 then 40 when 2 then 25 else 15 end, 'Boss della settimana: ' || b.nome, 'boss:' || b.id); end if;
      insert into public.world_feed(kind, actor, target, info) values ('boss_caduto', me, u.user_id, b.nome);
    end loop;
  end if;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'colpi', k, 'danno', dn, 'hp', greatest(0, b.hp), 'hp0', b.hp0, 'caduto', caduto, 'grado', public.w_grado(s.xp), 'gemme', gm);
end $$;

revoke all on function public.w_gioco_gemme(uuid, int, text, text, text) from public, anon, authenticated;
revoke all on function public.w_piastrine(uuid, int) from public, anon, authenticated;
revoke all on function public.w_gioco_oggi(uuid) from public, anon, authenticated;
grant execute on function public.world_pista_info() to authenticated;
grant execute on function public.world_pista_riscatta() to authenticated;
grant execute on function public.world_gioco_sequenza(bigint) to authenticated;

-- controllo: deve dire "gemme dal gioco pronte"
select case when exists (select 1 from pg_proc where proname = 'world_pista_riscatta') then 'gemme dal gioco pronte' else 'qualcosa manca' end as esito;
