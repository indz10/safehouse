-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 020 — IL SUPERSTITE CHE CRESCE (scelta di Alessandro, 15/11)
-- Oltre alle case cresce anche il giocatore:
--  - 🎖️ GRADO dall'esperienza (⭐ XP): grado = 1 + radice(XP / 50). L'XP arriva da ogni premio in Mattoni
--    (1 XP ogni 4 🧱), dalle spedizioni, dalla serie di giorni, dalla condivisione e dagli amici invitati.
--  - 🧠 ABILITÀ: un punto per ogni grado sopra il primo, massimo 5 per abilità:
--      🧭 Esploratore +0,5 km di raggio e +10% bottino · 💪 Resistenza +1 ⚡ massima e ricarica 10 min più veloce
--      🔪 Combattente −4% di rischio · 🔍 Cercatore +3% di tesoro · 🤝 Mercante +1 🧱 ogni 10 🧱 scambiati al Mercato
--  - ⚡ ENERGIA: 10 cariche (+ Resistenza), una ogni 2 ore: si gioca quando si vuole, chi entra spesso le usa tutte.
--  - 🎒 SPEDIZIONI nei posti veri vicino alle tue case (supermercato → 🥫, ferramenta/parco → 🪵,
--    distributore → ⛽, farmacia → ⚡ e 🥫, altro → un po' di tutto): durata, rischio e bottino crescono con la
--    distanza; tornano da sole (notifica "🎒 Il tuo superstite è tornato").
--  - 🛠️ EQUIPAGGIAMENTO (livelli 1-3, 🪵 30·n + 🧱 50·n): 🎒 Zaino +15 bottino · 🔦 Torcia niente rischio di
--    notte e +2% tesoro · 🪓 Arma −5% rischio · 📻 Radio una spedizione in più alla volta.
--  - 📅 SERIE di giorni: premio crescente per 7 giorni di fila (il 7° con 🧱 50).
--  - 📣 CONDIVISIONE: la prima del giorno dà ⭐ 20 e ⚡ 1; ogni amico che crea l'account col tuo link
--    ⭐ 50, ⚡ 2 e scorte; quando valuta la casa ⭐ 150 e altre scorte (oltre ai 🧱 150 di prima).
-- Formule in docs/FORMULE.md. Richiede le migrazioni fino alla 019. Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_superstite (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp int not null default 0,
  abil jsonb not null default '{}'::jsonb,
  equip jsonb not null default '{}'::jsonb,
  energia int not null default 10,
  energia_at timestamptz not null default now(),
  serie int not null default 0,
  serie_day date,
  share_day date,
  inviti_reg int,
  inviti_val int,
  created_at timestamptz not null default now()
);
alter table public.world_superstite enable row level security;

create table if not exists public.world_spedizioni (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cibo','legno','carb','farmaco','misto')),
  nome text,
  lat double precision not null,
  lon double precision not null,
  km numeric not null,
  start_at timestamptz not null default now(),
  end_at timestamptz not null,
  rischio int not null,
  energia int not null,
  calc jsonb not null default '{}'::jsonb,
  stato text not null default 'via' check (stato in ('via','raccolta')),
  esito jsonb,
  avvisato boolean not null default false
);
alter table public.world_spedizioni enable row level security;
create index if not exists world_spedizioni_user on public.world_spedizioni(user_id, stato);
create index if not exists world_spedizioni_tick on public.world_spedizioni(end_at) where stato = 'via' and not avvisato;

-- ---------- formule di base ----------
create or replace function public.w_grado(p_xp int) returns int language sql immutable as $$
  select least(50, 1 + floor(sqrt(greatest(coalesce(p_xp,0),0) / 50.0))::int); $$;
create or replace function public.w_grado_xp(p_g int) returns int language sql immutable as $$
  select 50 * (greatest(p_g,1) - 1) * (greatest(p_g,1) - 1); $$;
create or replace function public.w_ab(p_abil jsonb, p_k text) returns int language sql immutable as $$
  select least(5, greatest(0, coalesce((p_abil->>p_k)::int, 0))); $$;
create or replace function public.w_eq(p_equip jsonb, p_k text) returns int language sql immutable as $$
  select least(3, greatest(0, coalesce((p_equip->>p_k)::int, 0))); $$;
create or replace function public.w_en_max(p_abil jsonb) returns int language sql immutable as $$
  select 10 + public.w_ab(p_abil, 'resistenza'); $$;
create or replace function public.w_en_ric(p_abil jsonb) returns int language sql immutable as $$
  select 120 - 10 * public.w_ab(p_abil, 'resistenza'); $$;
create or replace function public.w_sup_raggio(p_xp int, p_abil jsonb) returns numeric language sql immutable as $$
  select least(12, 1.5 + 0.5 * (public.w_grado(p_xp) - 1) + 0.5 * public.w_ab(p_abil, 'esploratore'))::numeric; $$;

-- durata, energia, rischio, bottino, XP e tesoro di una spedizione
create or replace function public.w_sped_calc(p_km numeric, p_abil jsonb, p_equip jsonb, p_notte boolean) returns json
language sql immutable as $$
  select json_build_object(
    'min', least(180, round(10 + 14 * p_km))::int,
    'energia', least(3, 1 + floor(p_km / 2.5))::int,
    'rischio', least(60, greatest(3, round(10 + 4 * p_km - 4 * public.w_ab(p_abil,'combattente') - 5 * public.w_eq(p_equip,'arma')
                 + case when p_notte and public.w_eq(p_equip,'torcia') = 0 then 10 else 0 end)))::int,
    'bottino', least(25 + 15 * public.w_eq(p_equip,'zaino'), round((10 + 6 * p_km) * (1 + 0.1 * public.w_ab(p_abil,'esploratore'))))::int,
    'xp', (10 + round(6 * p_km))::int,
    'tesoro', (5 + 3 * public.w_ab(p_abil,'cercatore') + 2 * public.w_eq(p_equip,'torcia'))::int); $$;

-- ---------- scheda del superstite (crea la riga e ricarica l'energia) ----------
create or replace function public.w_sup(p_user uuid) returns public.world_superstite
language plpgsql security definer set search_path = public as $$
declare s public.world_superstite; mx int; ric int; n int;
begin
  insert into public.world_superstite(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into s from public.world_superstite where user_id = p_user for update;
  mx := public.w_en_max(s.abil); ric := public.w_en_ric(s.abil);
  if s.energia >= mx then
    if s.energia_at < now() - interval '1 minute' then
      s.energia_at := now(); update public.world_superstite set energia_at = s.energia_at where user_id = p_user;
    end if;
  else
    n := floor(extract(epoch from (now() - s.energia_at)) / 60.0 / ric)::int;
    if n > 0 then
      if s.energia + n >= mx then s.energia := mx; s.energia_at := now();
      else s.energia := s.energia + n; s.energia_at := s.energia_at + make_interval(mins => n * ric); end if;
      update public.world_superstite set energia = s.energia, energia_at = s.energia_at where user_id = p_user;
    end if;
  end if;
  return s;
end $$;

create or replace function public.w_xp(p_user uuid, p_n int) returns int
language plpgsql security definer set search_path = public as $$
declare x int;
begin
  if p_user is null or coalesce(p_n,0) <= 0 then return 0; end if;
  insert into public.world_superstite(user_id, xp) values (p_user, p_n)
    on conflict (user_id) do update set xp = public.world_superstite.xp + excluded.xp returning xp into x;
  return x;
end $$;

-- energia in più (premi): mai oltre il massimo + 5
create or replace function public.w_en_add(p_user uuid, p_n int) returns void
language plpgsql security definer set search_path = public as $$
declare s public.world_superstite;
begin
  if coalesce(p_n,0) <= 0 then return; end if;
  s := public.w_sup(p_user);
  update public.world_superstite set energia = least(public.w_en_max(s.abil) + 5, energia + p_n) where user_id = p_user;
end $$;

-- ogni premio in Mattoni dà anche esperienza (1 XP ogni 4 🧱)
create or replace function public.w_pay(p_user uuid, p_delta integer, p_reason text, p_ref text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare extra int; inv uuid; pad int;
begin
  perform public.w_wallet(p_user);
  update public.world_wallet set mattoni = mattoni + p_delta, lifetime = lifetime + greatest(p_delta, 0) where user_id = p_user;
  insert into public.world_log(user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  if p_delta > 0 then perform public.w_xp(p_user, greatest(1, p_delta / 4)); end if;
  if p_delta > 0 and p_reason in ('Notte vinta','Missione del giorno','Accesso del giorno','Orda del mondo: premi','Affitti delle tue case','Rinforzi mandati a un alleato') then
    -- 3) spinta di recupero: chi è sotto il livello medio della zona guadagna il 50% in più
    if public.w_boost(p_user) then
      extra := floor(p_delta * 0.5);
      if extra > 0 then
        update public.world_wallet set mattoni = mattoni + extra, lifetime = lifetime + extra where user_id = p_user;
        insert into public.world_log(user_id, delta, reason, ref, seen) values (p_user, extra, 'Spinta di recupero +50%', p_ref, true);
      end if;
    end if;
    -- 6) padrino: nei primi 14 giorni chi ti ha invitato riceve il 10% in più (non lo togliamo a te)
    select q.user_id into inv from public.profili_pubblici p join public.profili_pubblici q on left(q.user_id::text,8) = p.invitato_da
      where p.user_id = p_user and p.invitato_da is not null and q.user_id <> p_user
        and (select created_at from auth.users where id = p_user) > now() - interval '14 days' limit 1;
    pad := floor(p_delta * 0.1);
    if inv is not null and pad > 0 then
      perform public.w_wallet(inv);
      update public.world_wallet set mattoni = mattoni + pad where user_id = inv;
      insert into public.world_log(user_id, delta, reason, ref) values (inv, pad, 'Padrino: il tuo invitato sta giocando', p_ref);
    end if;
  end if;
end $$;

-- premi degli amici invitati (account creato / casa valutata), una volta per amico
create or replace function public.w_sup_inviti(p_user uuid) returns json
language plpgsql security definer set search_path = public as $$
declare s public.world_superstite; reg int; val int; dr int; dv int;
begin
  s := public.w_sup(p_user);
  select count(*), count(*) filter (where indice is not null) into reg, val
    from public.profili_pubblici where invitato_da = left(p_user::text, 8) and user_id <> p_user;
  if s.inviti_reg is null then
    -- prima volta: gli amici di prima della 020 contano già (i loro 🧱 150 erano già stati dati), premio ridotto una volta sola
    update public.world_superstite set inviti_reg = reg, inviti_val = val, xp = xp + 50 * least(reg, 10) where user_id = p_user;
    return json_build_object('nuovi', 0, 'valutati', 0);
  end if;
  dr := least(10, greatest(0, reg - s.inviti_reg)); dv := least(10, greatest(0, val - coalesce(s.inviti_val, 0)));
  if dr + dv = 0 then return json_build_object('nuovi', 0, 'valutati', 0); end if;
  update public.world_superstite set inviti_reg = reg, inviti_val = val, xp = xp + 50 * dr + 150 * dv where user_id = p_user;
  if dr > 0 then perform public.w_en_add(p_user, 2 * dr); end if;
  perform public.w_res(p_user, 10 * dr + 20 * dv, 10 * dr + 20 * dv, 5 * dr + 10 * dv);
  return json_build_object('nuovi', dr, 'valutati', dv);
end $$;

-- i posti del giocatore da cui partono le spedizioni: casa vera e case comprate
create or replace function public.w_sped_km(p_user uuid, p_lat double precision, p_lon double precision) returns numeric
language sql stable security definer set search_path = public as $$
  select round(min(public.w_km(p_lat, p_lon, x.lat, x.lon))::numeric, 2) from (
    select lat, lon from public.world_homes where user_id = p_user
    union all select lat, lon from public.world_buildings where owner = p_user) x; $$;

-- ---------- 🎖️ scheda completa ----------
create or replace function public.world_sup_info() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; inv json; g int; today date := (now() at time zone 'Europe/Rome')::date;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_wallet(me);
  inv := public.w_sup_inviti(me);
  s := public.w_sup(me);
  g := public.w_grado(s.xp);
  return json_build_object('ok', true,
    'xp', s.xp, 'grado', g, 'xp_da', public.w_grado_xp(g), 'xp_a', public.w_grado_xp(g + 1),
    'punti', greatest(0, (g - 1) - (select coalesce(sum(public.w_ab(s.abil, k)), 0) from unnest(array['esploratore','resistenza','combattente','cercatore','mercante']) k)),
    'abil', s.abil, 'equip', s.equip,
    'energia', s.energia, 'energia_max', public.w_en_max(s.abil), 'ricarica_min', public.w_en_ric(s.abil),
    'prossima_s', case when s.energia >= public.w_en_max(s.abil) then 0
                       else greatest(0, round(extract(epoch from (s.energia_at + make_interval(mins => public.w_en_ric(s.abil)) - now()))))::int end,
    'raggio_km', public.w_sup_raggio(s.xp, s.abil),
    'max_sped', 1 + public.w_eq(s.equip, 'radio'),
    'serie', case when s.serie_day >= today - 1 then s.serie else 0 end,
    'serie_oggi', coalesce(s.serie_day = today, false),
    'share_oggi', coalesce(s.share_day = today, false),
    'inviti', inv,
    'notte', extract(hour from now() at time zone 'Europe/Rome') >= 20 or extract(hour from now() at time zone 'Europe/Rome') < 7,
    'spedizioni', (select coalesce(json_agg(json_build_object('id', x.id, 'kind', x.kind, 'nome', x.nome, 'lat', x.lat, 'lon', x.lon, 'km', x.km,
                     'start_at', x.start_at, 'end_at', x.end_at, 'rischio', x.rischio, 'stato', x.stato, 'esito', x.esito) order by x.stato, x.end_at desc), '[]'::json)
                   from (select * from public.world_spedizioni where user_id = me and (stato = 'via' or end_at > now() - interval '24 hours')
                         order by stato, end_at desc limit 8) x));
end $$;

-- ---------- 🧠 abilità ----------
create or replace function public.world_sup_abilita(p_k text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; liberi int; a int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('esploratore','resistenza','combattente','cercatore','mercante') then return json_build_object('ok', false, 'msg', 'Abilità sconosciuta'); end if;
  s := public.w_sup(me);
  liberi := (public.w_grado(s.xp) - 1) - (select coalesce(sum(public.w_ab(s.abil, k)), 0) from unnest(array['esploratore','resistenza','combattente','cercatore','mercante']) k);
  a := public.w_ab(s.abil, p_k);
  if liberi <= 0 then return json_build_object('ok', false, 'msg', 'Nessun punto libero: sali di grado con l’esperienza'); end if;
  if a >= 5 then return json_build_object('ok', false, 'msg', 'Questa abilità è già al massimo (5)'); end if;
  update public.world_superstite set abil = jsonb_set(abil, array[p_k], to_jsonb(a + 1)) where user_id = me;
  return json_build_object('ok', true, 'livello', a + 1, 'msg', 'Abilità migliorata');
end $$;

-- ---------- 🛠️ equipaggiamento ----------
create or replace function public.world_sup_equip(p_k text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; lv int; cl int; cm int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('zaino','torcia','arma','radio') then return json_build_object('ok', false, 'msg', 'Oggetto sconosciuto'); end if;
  s := public.w_sup(me); w := public.w_wallet(me);
  lv := public.w_eq(s.equip, p_k) + 1;
  if lv > 3 then return json_build_object('ok', false, 'msg', 'È già al livello massimo (3)'); end if;
  cl := 30 * lv; cm := 50 * lv;
  if w.legno < cl or w.mattoni < cm then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s e 🧱 %s', cl, cm)); end if;
  update public.world_wallet set legno = legno - cl where user_id = me;
  perform public.w_pay(me, -cm, 'Equipaggiamento: ' || p_k || ' livello ' || lv);
  update public.world_superstite set equip = jsonb_set(equip, array[p_k], to_jsonb(lv)) where user_id = me;
  return json_build_object('ok', true, 'livello', lv, 'msg', 'Costruito!');
end $$;

-- ---------- 🎒 spedizioni ----------
create or replace function public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; km numeric; c json; en int; mins int; h int; nid bigint; notte boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_kind not in ('cibo','legno','carb','farmaco','misto') then return json_build_object('ok', false, 'msg', 'Posto sconosciuto'); end if;
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
    return json_build_object('ok', false, 'msg', format('Serve ⚡ %s: ne hai %s (una carica ogni %s min)', en, s.energia, public.w_en_ric(s.abil)));
  end if;
  update public.world_superstite set energia = energia - en,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  insert into public.world_spedizioni(user_id, kind, nome, lat, lon, km, end_at, rischio, energia, calc)
    values (me, p_kind, left(coalesce(nullif(trim(p_nome), ''), 'Posto senza nome'), 60), p_lat, p_lon, km, now() + make_interval(mins => mins), (c->>'rischio')::int, en, c::jsonb)
    returning world_spedizioni.id into nid;
  return json_build_object('ok', true, 'id', nid, 'min', mins, 'energia', en, 'end_at', now() + make_interval(mins => mins),
    'msg', format('🎒 Partito! Torna fra %s min', mins));
end $$;

create or replace function public.world_sped_raccogli(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); x public.world_spedizioni; s public.world_superstite; w public.world_wallet; c jsonb; b int; ko boolean;
  l int := 0; f int := 0; k int := 0; e int := 0; xp int; mt int := 0; got json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); g0 int; tes int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into x from public.world_spedizioni where id = p_id and user_id = me for update;
  if x.id is null or x.stato <> 'via' then return json_build_object('ok', false, 'msg', 'Spedizione già raccolta'); end if;
  if x.end_at > now() then return json_build_object('ok', false, 'msg', 'Non è ancora tornato'); end if;
  s := public.w_sup(me); g0 := public.w_grado(s.xp); c := x.calc;
  ko := random() * 100 < x.rischio;
  b := (c->>'bottino')::int; if ko then b := b / 2; end if;
  case x.kind
    when 'cibo' then f := b;
    when 'legno' then l := b;
    when 'carb' then k := round(b * 0.6);
    when 'farmaco' then f := b / 2; e := case when ko then 1 else 2 end;
    else l := b / 3; f := b / 3; k := b / 3;
  end case;
  got := public.w_res(me, l, f, k);
  if e > 0 then perform public.w_en_add(me, e); end if;
  xp := (c->>'xp')::int; if ko then xp := xp / 2; end if;
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

-- ---------- 📅 serie di giorni ----------
create or replace function public.world_sup_serie() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; today date := (now() at time zone 'Europe/Rome')::date; n int; g int; mt int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_wallet(me);
  s := public.w_sup(me);
  if s.serie_day = today then return json_build_object('ok', false, 'msg', 'Premio della serie già preso oggi: torna domani'); end if;
  n := case when s.serie_day = today - 1 then s.serie + 1 else 1 end;
  g := ((n - 1) % 7) + 1;
  update public.world_superstite set serie = n, serie_day = today where user_id = me;
  perform public.w_res(me, 5 * g, 5 * g, 3 * g);
  perform public.w_xp(me, 10 * g);
  perform public.w_en_add(me, case when g = 7 then 3 else 1 end);
  if g = 7 then mt := 50; perform public.w_pay(me, 50, 'Serie di 7 giorni'); end if;
  return json_build_object('ok', true, 'serie', n, 'giorno', g, 'legno', 5 * g, 'cibo', 5 * g, 'carb', 3 * g, 'xp', 10 * g,
    'energia', case when g = 7 then 3 else 1 end, 'mattoni', mt);
end $$;

-- ---------- 📣 condivisione: la prima del giorno ----------
create or replace function public.world_sup_share(p_dove text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; today date := (now() at time zone 'Europe/Rome')::date;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  s := public.w_sup(me);
  if s.share_day = today then return json_build_object('ok', false, 'msg', 'Grazie! Il premio della condivisione è uno al giorno'); end if;
  update public.world_superstite set share_day = today where user_id = me;
  perform public.w_xp(me, 20);
  perform public.w_en_add(me, 1);
  return json_build_object('ok', true, 'xp', 20, 'energia', 1, 'msg', 'Grazie per la condivisione: ⭐ +20 e ⚡ +1');
end $$;

-- ---------- 🔔 avviso "il tuo superstite è tornato" (lo chiama zsh-push a ogni giro) ----------
create or replace function public.w_sped_tick() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with t as (update public.world_spedizioni set avvisato = true where stato = 'via' and not avvisato and end_at <= now() returning user_id, nome)
  insert into public.world_feed(kind, actor, target, info) select 'sped_ok', null, user_id, nome from t;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- 🤝 Mercante: bonus sugli scambi ----------
CREATE OR REPLACE FUNCTION public.world_trade(p_kind text, p_n integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  have int; done int; m int; n int; bon int;
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
  bon := (m / 10) * public.w_ab(coalesce((select abil from public.world_superstite where user_id = me), '{}'::jsonb), 'mercante');
  if bon > 0 then perform public.w_pay(me, bon, 'Mercante: bonus dello scambio'); end if;
  return json_build_object('ok',true,'dato',n,'mattoni',m + bon,'bonus',bon,'mercato_left',100 - done - m);
end $$;

-- ---------- permessi ----------
revoke all on function public.w_sup(uuid) from public, anon, authenticated;
revoke all on function public.w_xp(uuid, int) from public, anon, authenticated;
revoke all on function public.w_en_add(uuid, int) from public, anon, authenticated;
revoke all on function public.w_sup_inviti(uuid) from public, anon, authenticated;
revoke all on function public.w_sped_km(uuid, double precision, double precision) from public, anon, authenticated;
revoke all on function public.w_sped_tick() from public, anon, authenticated;
grant execute on function public.w_sped_tick() to service_role;
revoke all on function public.world_sup_info() from public, anon;
revoke all on function public.world_sup_abilita(text) from public, anon;
revoke all on function public.world_sup_equip(text) from public, anon;
revoke all on function public.world_sped_parti(text, text, double precision, double precision) from public, anon;
revoke all on function public.world_sped_raccogli(bigint) from public, anon;
revoke all on function public.world_sup_serie() from public, anon;
revoke all on function public.world_sup_share(text) from public, anon;
grant execute on function public.world_sup_info() to authenticated;
grant execute on function public.world_sup_abilita(text) to authenticated;
grant execute on function public.world_sup_equip(text) to authenticated;
grant execute on function public.world_sped_parti(text, text, double precision, double precision) to authenticated;
grant execute on function public.world_sped_raccogli(bigint) to authenticated;
grant execute on function public.world_sup_serie() to authenticated;
grant execute on function public.world_sup_share(text) to authenticated;

-- controllo: deve dire "superstite pronto"
select case when exists (select 1 from pg_proc where proname = 'world_sped_parti') and exists (select 1 from pg_proc where proname = 'w_pay' and prosrc like '%w_xp%')
       then 'superstite pronto' else 'qualcosa manca' end as esito;
