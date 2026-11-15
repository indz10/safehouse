-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 021 — 🔫 CACCIA NELLA LENTE e CASE DEI CONDOMINI (richieste di Alessandro, 15/11)
-- 1) 🔫 Caccia agli zombie nella Lente: con ⚡ 1 parte un'ondata di 3–6 zombie intorno a te (di più salendo di grado);
--    li colpisci toccandoli prima che ti raggiungano. Il server decide quanti e quali zombie, controlla i tempi
--    (niente uccisioni impossibili) e dà i premi: ⭐ 5 a zombie (+10% per punto di 🔪 Combattente), ⭐ 10 se li
--    prendi tutti, e da ogni zombie una scorta (🪵/🥫/⛽ 3, il bruto 6). Massimo 10 cacce al giorno.
-- 2) 🎒 Spedizioni: raggio da 3 km (+1 km per grado e per 🧭 Esploratore, max 30) e ⭐ attività sponsor come mete.
-- 3) 🏢 Case non registrate: a chi ha valutato la casa ma non ce l'ha nel mondo (capitava nei condomini)
--    arriva una notifica "🏠 Registra la tua casa" (subito e poi al massimo ogni 3 giorni, dal giro di zsh-push).
-- Richiede la migrazione 020. Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_cacce (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null default now(),
  n int not null,
  zombie jsonb not null,
  uccisi int,
  fine_at timestamptz,
  esito jsonb
);
alter table public.world_cacce enable row level security;
create index if not exists world_cacce_user on public.world_cacce(user_id, start_at desc);

create or replace function public.world_caccia_inizia() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  fatte int; g int; n int; z jsonb := '[]'::jsonb; i int; k text; nid bigint;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  w := public.w_wallet(me); s := public.w_sup(me);
  fatte := coalesce((w.caps->>('cacce:' || day))::int, 0);
  if fatte >= 10 then return json_build_object('ok', false, 'msg', 'Oggi hai già fatto 10 cacce: gli zombie tornano domani'); end if;
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve ⚡ 1: si ricarica una ogni %s min', public.w_en_ric(s.abil))); end if;
  -- una caccia lasciata a metà da più di 10 minuti si chiude senza premi
  update public.world_cacce set fine_at = now(), uccisi = 0, esito = '{"scaduta":true}'::jsonb where user_id = me and fine_at is null and start_at < now() - interval '10 minutes';
  if exists (select 1 from public.world_cacce where user_id = me and fine_at is null) then
    return json_build_object('ok', false, 'msg', 'Hai già una caccia in corso');
  end if;
  g := public.w_grado(s.xp); n := least(6, 3 + g / 5);
  for i in 1..n loop
    k := case when random() < least(0.4, 0.1 + 0.02 * g) then 'bruto' when random() < 0.35 then 'corridore' else 'lento' end;
    z := z || jsonb_build_object('k', k, 'hp', case k when 'bruto' then 4 else 2 end,
      'b', round(random() * 240 - 120), 'dt', round(((i - 1) * 2.2 + random() * 1.5)::numeric, 1));
  end loop;
  update public.world_superstite set energia = energia - 1,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  update public.world_wallet set caps = jsonb_set(caps, array['cacce:' || day], to_jsonb(fatte + 1)) where user_id = me;
  insert into public.world_cacce(user_id, n, zombie) values (me, n, z) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'zombie', z, 'n', n, 'rimaste', 9 - fatte,
    'danno', 1 + case when public.w_eq(s.equip, 'arma') >= 2 then 1 else 0 end);
end $$;

create or replace function public.world_caccia_fine(p_id bigint, p_uccisi int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c public.world_cacce; s public.world_superstite; el numeric; u int; xp int; l int := 0; f int := 0; k int := 0;
  r numeric; q int; z jsonb; i int := 0; got json; g0 int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into c from public.world_cacce where id = p_id and user_id = me for update;
  if c.id is null or c.fine_at is not null then return json_build_object('ok', false, 'msg', 'Caccia già chiusa'); end if;
  el := extract(epoch from (now() - c.start_at));
  -- non si possono abbattere zombie più in fretta di così: 3 s per cominciare, poi almeno 1,2 s l'uno
  u := greatest(0, least(coalesce(p_uccisi, 0), c.n, floor((el - 3) / 1.2)::int));
  if el > 600 then u := 0; end if;
  s := public.w_sup(me); g0 := public.w_grado(s.xp);
  -- una scorta da ogni zombie abbattuto (i primi u della lista)
  for z in select * from jsonb_array_elements(c.zombie) loop
    i := i + 1; exit when i > u;
    q := case when z->>'k' = 'bruto' then 6 else 3 end; r := random();
    if r < 0.4 then f := f + q; elsif r < 0.75 then l := l + q; else k := k + q; end if;
  end loop;
  xp := round(5 * u * (1 + 0.1 * public.w_ab(s.abil, 'combattente'))) + case when u = c.n then 10 else 0 end;
  got := public.w_res(me, l, f, k);
  perform public.w_xp(me, xp);
  update public.world_cacce set fine_at = now(), uccisi = u,
    esito = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int) where id = p_id;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'uccisi', u, 'n', c.n, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
    'tutti', u = c.n, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0);
end $$;

-- ---------- 🎒 spedizioni: raggio più ampio e attività ⭐ sponsor come mete (segnalazione di Alessandro, 15/11) ----------
-- Raggio = min(30, 3 + 1 × (grado − 1) + 1 × Esploratore) km dalla tua casa più vicina (prima 1,5 + 0,5 per grado):
-- chi ha case lontane (anche in Brasile) parte da quella che sceglie. Le attività sponsor sono mete speciali:
-- bottino misto più ricco (🪵 e 🥫 metà, ⛽ un terzo) e ⭐ +5; ogni spedizione conta come visita per lo sponsor.
create or replace function public.w_sup_raggio(p_xp int, p_abil jsonb) returns numeric language sql immutable as $$
  select least(30, 3 + 1 * (public.w_grado(p_xp) - 1) + 1 * public.w_ab(p_abil, 'esploratore'))::numeric; $$;
alter table public.world_spedizioni drop constraint if exists world_spedizioni_kind_check;
alter table public.world_spedizioni add constraint world_spedizioni_kind_check check (kind in ('cibo','legno','carb','farmaco','misto','sponsor'));
alter table public.sponsor_events drop constraint if exists sponsor_events_kind_check;
alter table public.sponsor_events add constraint sponsor_events_kind_check check (kind in ('vista_mappa','vista_verdetto','vista_gioco','scheda','chiama','whatsapp','indicazioni','sito','codice_creato','codice_usato','preventivo','spedizione'));

create or replace function public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; spid uuid; km numeric; c json; en int; mins int; h int; nid bigint; notte boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_kind not in ('cibo','legno','carb','farmaco','misto','sponsor') then return json_build_object('ok', false, 'msg', 'Posto sconosciuto'); end if;
  -- ⭐ sponsor: solo un'attività sponsor attiva vera a meno di 60 m dal punto
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
    return json_build_object('ok', false, 'msg', format('Serve ⚡ %s: ne hai %s (una carica ogni %s min)', en, s.energia, public.w_en_ric(s.abil)));
  end if;
  update public.world_superstite set energia = energia - en,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  insert into public.world_spedizioni(user_id, kind, nome, lat, lon, km, end_at, rischio, energia, calc)
    values (me, p_kind, left(coalesce(nullif(trim(p_nome), ''), 'Posto senza nome'), 60), p_lat, p_lon, km, now() + make_interval(mins => mins), (c->>'rischio')::int, en, c::jsonb)
    returning world_spedizioni.id into nid;
  if spid is not null then
    update public.world_spedizioni set calc = calc || jsonb_build_object('sponsor', spid) where id = nid;
    insert into public.sponsor_events(sponsor_id, kind) values (spid, 'spedizione');
  end if;
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

-- ---------- 🏠 avviso a chi ha valutato la casa ma non ce l'ha nel mondo ----------
create or replace function public.w_casa_manca_tick() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.world_feed(kind, actor, target, info)
    select 'casa_manca', null, p.user_id, null from public.profili_pubblici p
    where p.indice is not null
      and exists (select 1 from auth.users u where u.id = p.user_id)
      and not exists (select 1 from public.world_homes h where h.user_id = p.user_id)
      and not exists (select 1 from public.world_feed f where f.target = p.user_id and f.kind = 'casa_manca' and f.created_at > now() - interval '3 days');
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.w_casa_manca_tick() from public, anon, authenticated;
grant execute on function public.w_casa_manca_tick() to service_role;
revoke all on function public.world_caccia_inizia() from public, anon;
revoke all on function public.world_caccia_fine(bigint, int) from public, anon;
grant execute on function public.world_caccia_inizia() to authenticated;
grant execute on function public.world_caccia_fine(bigint, int) to authenticated;

-- subito: l'avviso a chi oggi non ha la casa nel mondo (arriva a chi ha le notifiche attive)
select public.w_casa_manca_tick() as avvisati_senza_casa;

-- controllo: deve dire "caccia pronta"
select case when exists (select 1 from pg_proc where proname = 'world_caccia_fine') and exists (select 1 from pg_proc where proname = 'w_casa_manca_tick')
       then 'caccia pronta' else 'qualcosa manca' end as esito;
