-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 026 — 🛡️ DIFESA DELLA CASA NELLA LENTE e 👹 BOSS DELLA SETTIMANA (Fase 29, 16/11)
-- Seconda parte del gioco della Lente scelto da Alessandro (mix tra caccia nel mondo vero e difesa in realtà aumentata):
--  - 🛡️ DIFENDI CASA: solo vicino alla TUA casa vera (meno di 300 m). Nella Lente punti il telefono e PIAZZI LE TORRETTE
--    nelle direzioni vere (1 + livello torretta dell'Assedio, max 3); poi arrivano 3 ondate di zombie da tutte le parti:
--    le torrette sparano da sole a quelli davanti a loro, tu tocchi gli altri. La casa ha vite (5 + livello casa
--    dell'Assedio). Costa 1 energia, massimo 6 al giorno. Il server decide gli zombie e i premi e controlla i tempi.
--  - 👹 BOSS DELLA SETTIMANA: un mostro enorme per zona (~25 km intorno alla tua casa vera), uguale per tutti quelli
--    della zona; ha tanta vita (più giocatori nella zona = più vita). Ognuno lo colpisce fino a 3 volte al giorno
--    (1 energia, 20 secondi di colpi sui punti deboli); se nello stesso giorno l'hanno colpito anche i tuoi alleati il
--    tuo colpo vale di più (+25% per alleato, max ×2). Quando cade, premi a tutti quelli che l'hanno colpito (in base al
--    danno) e 🧱 ai primi 3; notifica "boss_caduto". Un boss nuovo ogni lunedì.
-- Richiede le migrazioni 020–025. Si può eseguire più volte.
-- =====================================================================

-- ---------- 🛡️ DIFESA DELLA CASA NELLA LENTE ----------
create table if not exists public.world_difar (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null default now(),
  n int not null,
  ultimo numeric not null default 0,
  zombie jsonb not null,
  fine_at timestamptz,
  uccisi int,
  vinto boolean
);
alter table public.world_difar enable row level security;
create index if not exists world_difar_user on public.world_difar(user_id, start_at desc);

create or replace function public.world_difar_inizia(p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h public.world_homes; s public.world_superstite; w public.world_wallet; a public.world_assedio;
  day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); fatte int; g int; d numeric; z jsonb := '[]'::jsonb;
  o int; i int; n int; k text; tot int := 0; ult numeric := 0; dt numeric; nid bigint; tor int; casa int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then return json_build_object('ok', false, 'msg', 'Prima registra la tua casa nel mondo'); end if;
  if p_lat is null then return json_build_object('ok', false, 'msg', 'Serve la posizione: permetti il GPS'); end if;
  d := public.w_km(p_lat, p_lon, h.lat, h.lon);
  if d > 0.3 then return json_build_object('ok', false, 'msg', format('Si difende solo vicino a casa: sei a %s m (serve meno di 300 m)', round(d * 1000))); end if;
  w := public.w_wallet(me); s := public.w_sup(me);
  fatte := coalesce((w.caps->>('difar:' || day))::int, 0);
  if fatte >= 6 then return json_build_object('ok', false, 'msg', 'Oggi hai già difeso la casa 6 volte: riposati'); end if;
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min)', public.w_en_ric(s.abil))); end if;
  update public.world_difar set fine_at = now(), uccisi = 0, vinto = false where user_id = me and fine_at is null;
  select * into a from public.world_assedio where user_id = me;
  tor := 1 + least(2, public.w_ass_up(coalesce(a.up, '{}'::jsonb), 'torretta'));
  casa := 5 + public.w_ass_up(coalesce(a.up, '{}'::jsonb), 'casa');
  g := public.w_grado(s.xp);
  for o in 1..3 loop
    n := least(8, 2 + o + g / 6);
    for i in 1..n loop
      k := case when random() < 0.1 + 0.06 * o then 'bruto' when random() < 0.35 then 'corridore' else 'lento' end;
      dt := round(((o - 1) * 22 + (i - 1) * 2.4 + random() * 1.5)::numeric, 1);
      z := z || jsonb_build_object('k', k, 'hp', case k when 'bruto' then 4 else 2 end, 'o', o, 'b', round(random() * 360), 'dt', dt);
      tot := tot + 1; ult := greatest(ult, dt);
    end loop;
  end loop;
  update public.world_superstite set energia = energia - 1,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  update public.world_wallet set caps = jsonb_set(caps, array['difar:' || day], to_jsonb(fatte + 1)) where user_id = me;
  insert into public.world_difar(user_id, n, ultimo, zombie) values (me, tot, ult, z) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'zombie', z, 'n', tot, 'torrette', tor, 'casa', casa, 'rimaste', 5 - fatte,
    'danno', 1 + case when public.w_eq(s.equip, 'arma') >= 2 then 1 else 0 end);
end $$;

create or replace function public.world_difar_fine(p_id bigint, p_uccisi int, p_casa int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.world_difar; el numeric; u int; v boolean; xp int; q int; got json; mt int := 0;
  w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); s public.world_superstite; g0 int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into r from public.world_difar where id = p_id and user_id = me for update;
  if r.id is null or r.fine_at is not null then return json_build_object('ok', false, 'msg', 'Difesa già chiusa'); end if;
  el := extract(epoch from (now() - r.start_at));
  if el > 600 then u := 0; else u := greatest(0, least(coalesce(p_uccisi, 0), r.n, floor((el - 2) / 0.8)::int)); end if;
  v := coalesce(p_casa, 0) > 0 and el >= r.ultimo and el <= 600;
  update public.world_difar set fine_at = now(), uccisi = u, vinto = v where id = p_id;
  s := public.w_sup(me); g0 := public.w_grado(s.xp);
  xp := 4 * u + case when v then 25 else 0 end;
  q := 2 * u + case when v then 10 else 0 end;
  got := public.w_res(me, q, q, q / 2);
  if xp > 0 then perform public.w_xp(me, xp); end if;
  if v then
    w := public.w_wallet(me);
    if coalesce((w.caps->>('difar_win:' || day))::int, 0) = 0 then
      mt := 15; perform public.w_pay(me, mt, 'Lente: casa difesa');
      update public.world_wallet set caps = jsonb_set(caps, array['difar_win:' || day], '1'::jsonb) where user_id = me;
    end if;
  end if;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'uccisi', u, 'n', r.n, 'vinto', v, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int,
    'carb', (got->>'carb')::int, 'mattoni', mt, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp));
end $$;

-- ---------- 👹 BOSS DELLA SETTIMANA ----------
create table if not exists public.world_boss (
  id bigserial primary key,
  cella text not null,
  settimana text not null,
  tipo text not null,
  nome text not null,
  ic text not null,
  hp0 int not null,
  hp int not null,
  end_at timestamptz not null,
  caduto_at timestamptz,
  unique (cella, settimana)
);
alter table public.world_boss enable row level security;

create table if not exists public.world_boss_colpi (
  id bigserial primary key,
  boss_id bigint not null references public.world_boss(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null default now(),
  base int not null default 1,
  molt numeric not null default 1,
  fine_at timestamptz,
  colpi int,
  danno int not null default 0
);
alter table public.world_boss_colpi enable row level security;
create index if not exists world_boss_colpi_boss on public.world_boss_colpi(boss_id, user_id);
create index if not exists world_boss_colpi_user on public.world_boss_colpi(user_id, start_at desc);

create or replace function public.w_boss_tipi() returns table(k text, nome text, ic text) language sql immutable as $$
  values ('gigante','Il Gigante di fango','👹'),('abominio','L’Abominio','🐙'),('colosso','Il Colosso','🦍'),('conte','Il Conte dei morti','🧛'),('regina','La Regina dell’orda','👸'); $$;

create or replace function public.w_boss_cella(p_lat double precision, p_lon double precision) returns text language sql immutable as $$
  select floor(p_lat / 0.25)::int || ':' || floor(p_lon / 0.35)::int; $$;

create or replace function public.w_boss_settimana() returns text language sql stable as $$
  select to_char(now() at time zone 'Europe/Rome', 'IYYY-IW'); $$;

-- il boss della zona della casa vera (lo crea il primo che lo guarda nella settimana)
create or replace function public.w_boss_di(p_user uuid) returns public.world_boss
language plpgsql security definer set search_path = public as $$
declare h public.world_homes; c text; sett text := public.w_boss_settimana(); b public.world_boss; n int; t record; fine timestamptz;
begin
  select * into h from public.world_homes where user_id = p_user;
  if h.user_id is null then return null; end if;
  c := public.w_boss_cella(h.lat, h.lon);
  select * into b from public.world_boss where cella = c and settimana = sett;
  if b.id is not null then return b; end if;
  select count(*) into n from public.world_homes x where public.w_boss_cella(x.lat, x.lon) = c;
  select * into t from public.w_boss_tipi() x order by md5(c || sett || x.k) limit 1;
  fine := ((date_trunc('week', now() at time zone 'Europe/Rome') + interval '7 days') at time zone 'Europe/Rome');
  insert into public.world_boss(cella, settimana, tipo, nome, ic, hp0, hp, end_at)
    values (c, sett, t.k, t.nome, t.ic, least(4000, 300 + 150 * n), least(4000, 300 + 150 * n), fine)
    on conflict (cella, settimana) do nothing;
  select * into b from public.world_boss where cella = c and settimana = sett;
  return b;
end $$;

-- quanto vale il tuo colpo oggi: +25% per ogni alleato che ha già colpito questo boss oggi (max ×2)
create or replace function public.w_boss_molt(p_user uuid, p_boss bigint) returns numeric
language sql stable security definer set search_path = public as $$
  select least(2, 1 + 0.25 * count(distinct c.user_id)) from public.world_boss_colpi c
  where c.boss_id = p_boss and c.danno > 0 and c.user_id <> p_user and c.user_id in (select public.w_allies_of(p_user))
    and (c.start_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date; $$;

create or replace function public.world_boss_info() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b public.world_boss; oggi int; mio int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  b := public.w_boss_di(me);
  if b.id is null then return json_build_object('ok', false, 'msg', 'Prima registra la tua casa nel mondo'); end if;
  select count(*) into oggi from public.world_boss_colpi c where c.boss_id = b.id and c.user_id = me
    and (c.start_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date;
  select coalesce(sum(danno), 0) into mio from public.world_boss_colpi where boss_id = b.id and user_id = me;
  return json_build_object('ok', true, 'id', b.id, 'nome', b.nome, 'ic', b.ic, 'tipo', b.tipo, 'hp', b.hp, 'hp0', b.hp0, 'end_at', b.end_at,
    'caduto', b.caduto_at is not null, 'oggi', oggi, 'max', 3, 'mio', mio, 'molt', public.w_boss_molt(me, b.id),
    'top', coalesce((select json_agg(json_build_object('nick', public.w_nick(x.user_id), 'danno', x.d, 'io', x.user_id = me,
                       'alleato', x.user_id in (select public.w_allies_of(me))) order by x.d desc)
             from (select user_id, sum(danno)::int d from public.world_boss_colpi where boss_id = b.id and danno > 0 group by user_id order by 2 desc limit 10) x), '[]'::json),
    'alleati_oggi', coalesce((select json_agg(distinct public.w_nick(c.user_id)) from public.world_boss_colpi c
             where c.boss_id = b.id and c.danno > 0 and c.user_id <> me and c.user_id in (select public.w_allies_of(me))
               and (c.start_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date), '[]'::json),
    'giocatori', (select count(distinct user_id) from public.world_boss_colpi where boss_id = b.id and danno > 0));
end $$;

create or replace function public.world_boss_inizia() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b public.world_boss; s public.world_superstite; oggi int; nid bigint; base int; m numeric;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  b := public.w_boss_di(me);
  if b.id is null then return json_build_object('ok', false, 'msg', 'Prima registra la tua casa nel mondo'); end if;
  if b.caduto_at is not null then return json_build_object('ok', false, 'msg', 'Il boss è già caduto: il prossimo arriva lunedì'); end if;
  select count(*) into oggi from public.world_boss_colpi c where c.boss_id = b.id and c.user_id = me
    and (c.start_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date;
  if oggi >= 3 then return json_build_object('ok', false, 'msg', 'Oggi l’hai già attaccato 3 volte: torna domani'); end if;
  s := public.w_sup(me);
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min)', public.w_en_ric(s.abil))); end if;
  update public.world_superstite set energia = energia - 1,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  update public.world_boss_colpi set fine_at = now(), colpi = 0 where user_id = me and fine_at is null;
  base := 1 + case when public.w_eq(s.equip, 'arma') >= 2 then 1 else 0 end + public.w_ab(s.abil, 'combattente') / 2;
  m := public.w_boss_molt(me, b.id);
  insert into public.world_boss_colpi(boss_id, user_id, base, molt) values (b.id, me, base, m) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'nome', b.nome, 'ic', b.ic, 'hp', b.hp, 'hp0', b.hp0, 'base', base, 'molt', m, 'durata', 20, 'rimasti', 2 - oggi);
end $$;

create or replace function public.world_boss_fine(p_id bigint, p_colpi int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c public.world_boss_colpi; b public.world_boss; el numeric; k int; dn int; s public.world_superstite;
  caduto boolean := false; u record; pos int := 0; got json;
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
  if dn > 0 then perform public.w_xp(me, 5 + k / 3); end if;
  if b.hp <= 0 and b.caduto_at is null then
    update public.world_boss set caduto_at = now() where id = b.id;
    caduto := true;
    for u in select user_id, sum(danno)::int d from public.world_boss_colpi where boss_id = b.id and danno > 0 group by user_id order by 2 desc loop
      pos := pos + 1;
      perform public.w_res(u.user_id, 25 + least(75, u.d / 8), 25 + least(75, u.d / 8), 10 + least(40, u.d / 16));
      perform public.w_xp(u.user_id, 40 + least(80, u.d / 5));
      if pos <= 3 then perform public.w_pay(u.user_id, case pos when 1 then 40 when 2 then 25 else 15 end, 'Boss della settimana: ' || b.nome, 'boss:' || b.id); end if;
      insert into public.world_feed(kind, actor, target, info) values ('boss_caduto', me, u.user_id, b.nome);
    end loop;
  end if;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'colpi', k, 'danno', dn, 'hp', greatest(0, b.hp), 'hp0', b.hp0, 'caduto', caduto, 'grado', public.w_grado(s.xp));
end $$;

revoke all on function public.world_difar_inizia(double precision, double precision) from public, anon;
revoke all on function public.world_difar_fine(bigint, int, int) from public, anon;
revoke all on function public.w_boss_di(uuid) from public, anon, authenticated;
revoke all on function public.w_boss_molt(uuid, bigint) from public, anon, authenticated;
revoke all on function public.world_boss_info() from public, anon;
revoke all on function public.world_boss_inizia() from public, anon;
revoke all on function public.world_boss_fine(bigint, int) from public, anon;
grant execute on function public.world_difar_inizia(double precision, double precision) to authenticated;
grant execute on function public.world_difar_fine(bigint, int, int) to authenticated;
grant execute on function public.world_boss_info() to authenticated;
grant execute on function public.world_boss_inizia() to authenticated;
grant execute on function public.world_boss_fine(bigint, int) to authenticated;

-- controllo: deve dire "difesa e boss pronti"
select case when exists (select 1 from pg_proc where proname = 'world_difar_fine') and exists (select 1 from pg_proc where proname = 'world_boss_fine')
       then 'difesa e boss pronti' else 'qualcosa manca' end as esito;
