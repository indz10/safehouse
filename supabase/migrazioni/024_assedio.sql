-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 024 — 🧟 ASSEDIO A LIVELLI (scelta di Alessandro, 16/11: "un gioco più strutturato")
-- Prende il posto di "Difendi la casa" (023). Una strada di livelli (1, 2, 3, …): in ogni livello prima PIAZZI le difese
-- intorno alla tua casa con le provviste del livello (🪵 barricata, 🔫 torretta, 💣 mina), poi arriva l'ondata e tu aiuti
-- toccando gli zombie. Da 1 a 3 ⭐ per livello; ogni livello vinto sblocca il successivo.
--  - Costo: la prima partita del giorno è gratis, poi 🔋 1 energia; massimo 20 partite al giorno.
--  - Premi (decisi dal server, con controllo dei tempi): per ogni ⭐ NUOVA ⭐ esperienza 10 + 2 × livello e
--    🪵 🥫 ⛽ 4 + livello; la prima vittoria di un livello anche 🧱 5 + livello (max 30); rigiocare un livello
--    già fatto dà ⭐ 5 e 2 di ogni scorta; ogni zombie abbattuto ⭐ 1.
--  - 🛠️ Potenziamenti per sempre (livelli 1–3, 🪵 20·n + 🧱 30·n): 🔫 torretta più forte, 🪵 barricata più robusta,
--    💣 mina più potente, 🏠 casa con più vita. 💣 bomba e 🛡️ scudo della Bottega valgono anche qui
--    (la bomba spazza lo schermo, lo scudo dà +3 vita alla casa).
-- Richiede le migrazioni 020–023. Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_assedio (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stelle jsonb not null default '{}'::jsonb,
  max_liv int not null default 0,
  up jsonb not null default '{}'::jsonb
);
alter table public.world_assedio enable row level security;

create table if not exists public.world_assedio_partite (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  livello int not null,
  start_at timestamptz not null default now(),
  piano jsonb not null,
  gratis boolean not null default false,
  scudo boolean not null default false,
  bombe int not null default 0,
  fine_at timestamptz,
  stelle int,
  uccisi int,
  esito jsonb
);
alter table public.world_assedio_partite enable row level security;
create index if not exists world_assedio_partite_user on public.world_assedio_partite(user_id, start_at desc);

create or replace function public.w_ass_up(p_up jsonb, p_k text) returns int language sql immutable as $$
  select least(3, greatest(0, coalesce((p_up->>p_k)::int, 0))); $$;

-- il piano di un livello: quanti zombie e di che tipo, provviste per le difese, durata minima
create or replace function public.w_ass_piano(p_liv int) returns json language sql immutable as $$
  select json_build_object('livello', p_liv,
    'zombie', least(60, 6 + 2 * p_liv),
    'corridori', case when p_liv >= 3 then least(0.35, 0.1 + 0.02 * p_liv) else 0 end,
    'bruti', case when p_liv >= 5 then least(0.25, 0.05 + 0.015 * p_liv) else 0 end,
    'hp_extra', p_liv / 6,
    'provviste', 60 + 5 * p_liv,
    'intervallo', greatest(0.6, 2.2 - 0.06 * p_liv),
    'min_s', 8 + p_liv); $$;

create or replace function public.w_ass(p_user uuid) returns public.world_assedio
language plpgsql security definer set search_path = public as $$
declare a public.world_assedio;
begin
  insert into public.world_assedio(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into a from public.world_assedio where user_id = p_user;
  return a;
end $$;

create or replace function public.world_assedio_info() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a public.world_assedio; s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  a := public.w_ass(me); s := public.w_sup(me); w := public.w_wallet(me);
  return json_build_object('ok', true, 'stelle', a.stelle, 'max_liv', a.max_liv, 'up', a.up,
    'tot_stelle', (select coalesce(sum(value::int), 0) from jsonb_each_text(a.stelle)),
    'energia', s.energia, 'bombe', s.bombe, 'scudi', s.scudi, 'legno', w.legno, 'mattoni', w.mattoni,
    'partite', coalesce((w.caps->>('assedio:' || day))::int, 0));
end $$;

create or replace function public.world_assedio_inizia(p_liv int, p_scudo boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a public.world_assedio; s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  fatte int; gr boolean; sc boolean := false; nid bigint; p json;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  a := public.w_ass(me); s := public.w_sup(me); w := public.w_wallet(me);
  if p_liv is null or p_liv < 1 or p_liv > least(100, a.max_liv + 1) then return json_build_object('ok', false, 'msg', 'Livello ancora chiuso: vinci quello prima'); end if;
  fatte := coalesce((w.caps->>('assedio:' || day))::int, 0);
  if fatte >= 20 then return json_build_object('ok', false, 'msg', 'Oggi hai giocato 20 partite: gli zombie tornano domani'); end if;
  update public.world_assedio_partite set fine_at = now(), stelle = 0, uccisi = 0, esito = '{"abbandonata":true}'::jsonb where user_id = me and fine_at is null;
  gr := fatte = 0;
  if not gr and s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min) o la trovi in 🛒 Bottega', public.w_en_ric(s.abil))); end if;
  if not gr then
    update public.world_superstite set energia = energia - 1,
      energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  end if;
  if coalesce(p_scudo, false) and s.scudi > 0 then sc := true; update public.world_superstite set scudi = scudi - 1 where user_id = me; end if;
  update public.world_wallet set caps = jsonb_set(caps, array['assedio:' || day], to_jsonb(fatte + 1)) where user_id = me;
  p := public.w_ass_piano(p_liv);
  insert into public.world_assedio_partite(user_id, livello, piano, gratis, scudo) values (me, p_liv, p::jsonb, gr, sc) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'piano', p, 'gratis', gr, 'up', a.up, 'bombe', s.bombe,
    'casa', 10 + 2 * public.w_ass_up(a.up, 'casa') + case when sc then 3 else 0 end, 'stelle_prima', coalesce((a.stelle->>p_liv::text)::int, 0));
end $$;

create or replace function public.world_assedio_bomba(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return json_build_object('ok', false); end if;
  if not exists (select 1 from public.world_assedio_partite where id = p_id and user_id = me and fine_at is null) then return json_build_object('ok', false, 'msg', 'Partita finita'); end if;
  update public.world_superstite set bombe = bombe - 1 where user_id = me and bombe > 0 returning bombe into n;
  if n is null then return json_build_object('ok', false, 'msg', 'Non hai bombe: le trovi in 🛒 Bottega'); end if;
  update public.world_assedio_partite set bombe = bombe + 1 where id = p_id;
  return json_build_object('ok', true, 'bombe', n);
end $$;

create or replace function public.world_assedio_fine(p_id bigint, p_vinto boolean, p_stelle int, p_uccisi int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.world_assedio_partite; a public.world_assedio; s public.world_superstite; el numeric; st int; prima int; u int; L int; tot int;
  xp int := 0; q int := 0; mt int := 0; nuove int; got json; g0 int; vinto boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into p from public.world_assedio_partite where id = p_id and user_id = me for update;
  if p.id is null or p.fine_at is not null then return json_build_object('ok', false, 'msg', 'Partita già chiusa'); end if;
  el := extract(epoch from (now() - p.start_at)); L := p.livello; tot := (p.piano->>'zombie')::int;
  -- non si vince più in fretta del minimo, e non si abbattono più di 3 zombie al secondo (più quelli delle bombe)
  vinto := coalesce(p_vinto, false) and el >= (p.piano->>'min_s')::numeric and el <= 900;
  u := greatest(0, least(coalesce(p_uccisi, 0), tot, floor(el * 3)::int + p.bombe * 20));
  if vinto and u < tot then vinto := false; end if;
  st := case when vinto then least(3, greatest(1, coalesce(p_stelle, 1))) else 0 end;
  a := public.w_ass(me); s := public.w_sup(me); g0 := public.w_grado(s.xp);
  prima := coalesce((a.stelle->>L::text)::int, 0);
  nuove := greatest(0, st - prima);
  if nuove > 0 then
    xp := nuove * (10 + 2 * L); q := nuove * (4 + L);
    if prima = 0 then mt := least(30, 5 + L); end if;
    update public.world_assedio set stelle = jsonb_set(stelle, array[L::text], to_jsonb(st)), max_liv = greatest(max_liv, case when st > 0 then L else 0 end) where user_id = me;
  elsif vinto then xp := 5; q := 2;
  end if;
  xp := xp + u;
  got := public.w_res(me, q, q, q);
  perform public.w_xp(me, xp);
  if mt > 0 then perform public.w_pay(me, mt, 'Assedio: livello ' || L || ' superato'); end if;
  update public.world_assedio_partite set fine_at = now(), stelle = st, uccisi = u,
    esito = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt) where id = p_id;
  s := public.w_sup(me); a := public.w_ass(me);
  return json_build_object('ok', true, 'vinto', vinto, 'stelle', st, 'nuove', nuove, 'uccisi', u, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int,
    'carb', (got->>'carb')::int, 'mattoni', mt, 'max_liv', a.max_liv, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0);
end $$;

create or replace function public.world_assedio_potenzia(p_k text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a public.world_assedio; w public.world_wallet; lv int; cl int; cm int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('torretta','barricata','mina','casa') then return json_build_object('ok', false, 'msg', 'Sconosciuto'); end if;
  a := public.w_ass(me); w := public.w_wallet(me);
  lv := public.w_ass_up(a.up, p_k) + 1;
  if lv > 3 then return json_build_object('ok', false, 'msg', 'Già al massimo (3)'); end if;
  cl := 20 * lv; cm := 30 * lv;
  if w.legno < cl or w.mattoni < cm then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s e 🧱 %s', cl, cm)); end if;
  update public.world_wallet set legno = legno - cl where user_id = me;
  perform public.w_pay(me, -cm, 'Assedio: potenziamento ' || p_k);
  update public.world_assedio set up = jsonb_set(up, array[p_k], to_jsonb(lv)) where user_id = me;
  return json_build_object('ok', true, 'livello', lv, 'msg', 'Potenziato!');
end $$;

revoke all on function public.w_ass(uuid) from public, anon, authenticated;
revoke all on function public.world_assedio_info() from public, anon;
revoke all on function public.world_assedio_inizia(int, boolean) from public, anon;
revoke all on function public.world_assedio_bomba(bigint) from public, anon;
revoke all on function public.world_assedio_fine(bigint, boolean, int, int) from public, anon;
revoke all on function public.world_assedio_potenzia(text) from public, anon;
grant execute on function public.world_assedio_info() to authenticated;
grant execute on function public.world_assedio_inizia(int, boolean) to authenticated;
grant execute on function public.world_assedio_bomba(bigint) to authenticated;
grant execute on function public.world_assedio_fine(bigint, boolean, int, int) to authenticated;
grant execute on function public.world_assedio_potenzia(text) to authenticated;

-- controllo: deve dire "assedio pronto"
select case when exists (select 1 from pg_proc where proname = 'world_assedio_fine') and exists (select 1 from pg_proc where proname = 'world_assedio_potenzia')
       then 'assedio pronto' else 'qualcosa manca' end as esito;
