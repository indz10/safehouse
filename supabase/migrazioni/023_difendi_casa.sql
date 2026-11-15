-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 023 — 🎮 DIFENDI LA CASA (minigioco sempre disponibile) e 🛒 potenziamenti in Bottega
-- Richiesta di Alessandro (15/11): un gioco semplice e interattivo per entrare quando si vuole e guadagnare risorse.
--  - Partita da 45 secondi: gli zombie arrivano da ogni lato verso la tua casa, li tocchi per fermarli.
--    La casa ha tante vite quanto il suo livello vero + 2 (massimo 8): le case potenziate resistono di più.
--  - Costa ⚡ 1 (la prima partita del giorno è gratis), massimo 15 partite al giorno.
--  - Premi decisi dal server, controllando i tempi: ⭐ 2 a zombie, una scorta ogni 2 zombie (🪵/🥫/⛽ 2),
--    se la casa resiste fino alla fine ⭐ 15 e 🧱 5 (al massimo 🧱 50 al giorno da qui).
--  - 🛒 Bottega (con i 🧱 Mattoni): ⚡ +5 energia (🧱 60, 2 al giorno), 💣 bomba (🧱 25: spazza via tutti gli zombie
--    sullo schermo), 🛡️ scudo (🧱 25: +2 vite per una partita). I potenziamenti si usano durante la partita.
-- Richiede le migrazioni 020–022. Si può eseguire più volte.
-- =====================================================================

alter table public.world_superstite add column if not exists bombe int not null default 0;
alter table public.world_superstite add column if not exists scudi int not null default 0;

create table if not exists public.world_partite (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null default now(),
  vite int not null,
  ondate int not null,
  gratis boolean not null default false,
  bombe int not null default 0,
  scudo boolean not null default false,
  uccisi int,
  resistita boolean,
  fine_at timestamptz,
  esito jsonb
);
alter table public.world_partite enable row level security;
create index if not exists world_partite_user on public.world_partite(user_id, start_at desc);

create or replace function public.world_difesa_inizia(p_scudo boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  fatte int; g int; lv int; v int; gr boolean; nid bigint; sc boolean := false;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  w := public.w_wallet(me); s := public.w_sup(me); g := public.w_grado(s.xp);
  fatte := coalesce((w.caps->>('partite:' || day))::int, 0);
  if fatte >= 15 then return json_build_object('ok', false, 'msg', 'Oggi hai giocato 15 partite: gli zombie si riposano fino a domani'); end if;
  update public.world_partite set fine_at = now(), uccisi = 0, resistita = false, esito = '{"scaduta":true}'::jsonb
    where user_id = me and fine_at is null and start_at < now() - interval '5 minutes';
  if exists (select 1 from public.world_partite where user_id = me and fine_at is null) then
    update public.world_partite set fine_at = now(), uccisi = 0, resistita = false, esito = '{"abbandonata":true}'::jsonb where user_id = me and fine_at is null;
  end if;
  gr := fatte = 0;
  if not gr and s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve ⚡ 1: si ricarica una ogni %s min (o compra energia in 🛒 Bottega)', public.w_en_ric(s.abil))); end if;
  if not gr then
    update public.world_superstite set energia = energia - 1,
      energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  end if;
  if coalesce(p_scudo, false) and s.scudi > 0 then sc := true; update public.world_superstite set scudi = scudi - 1 where user_id = me; end if;
  lv := coalesce((select b.level from public.world_homes h join public.world_buildings b on b.building_id = h.building_id where h.user_id = me), 1);
  v := least(8, lv + 2) + case when sc then 2 else 0 end;
  update public.world_wallet set caps = jsonb_set(caps, array['partite:' || day], to_jsonb(fatte + 1)) where user_id = me;
  insert into public.world_partite(user_id, vite, ondate, gratis, scudo) values (me, v, least(6, 3 + g / 4), gr, sc) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'vite', v, 'ondate', least(6, 3 + g / 4), 'durata', 45, 'gratis', gr, 'scudo', sc,
    'bombe', s.bombe, 'velocita', round(1 + 0.04 * least(g, 20), 2), 'rimaste', 14 - fatte);
end $$;

-- usa una bomba durante la partita (il server la scala subito)
create or replace function public.world_difesa_bomba(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return json_build_object('ok', false); end if;
  if not exists (select 1 from public.world_partite where id = p_id and user_id = me and fine_at is null) then return json_build_object('ok', false, 'msg', 'Partita finita'); end if;
  update public.world_superstite set bombe = bombe - 1 where user_id = me and bombe > 0 returning bombe into n;
  if n is null then return json_build_object('ok', false, 'msg', 'Non hai bombe: le trovi in 🛒 Bottega'); end if;
  update public.world_partite set bombe = bombe + 1 where id = p_id;
  return json_build_object('ok', true, 'bombe', n);
end $$;

create or replace function public.world_difesa_fine(p_id bigint, p_uccisi int, p_resistita boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.world_partite; s public.world_superstite; w public.world_wallet; el numeric; u int; xp int; q int; r numeric;
  l int := 0; f int := 0; k int := 0; mt int := 0; i int; got json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); fatti int; g0 int; res boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into p from public.world_partite where id = p_id and user_id = me for update;
  if p.id is null or p.fine_at is not null then return json_build_object('ok', false, 'msg', 'Partita già chiusa'); end if;
  el := extract(epoch from (now() - p.start_at));
  -- al massimo 4 zombie al secondo (più quelli spazzati dalle bombe), e la partita dura 45 secondi
  u := greatest(0, least(coalesce(p_uccisi, 0), floor(el * 4)::int + p.bombe * 12, 260));
  if el > 300 then u := 0; end if;
  res := coalesce(p_resistita, false) and el >= 40;
  s := public.w_sup(me); g0 := public.w_grado(s.xp);
  xp := 2 * u + case when res then 15 else 0 end;
  q := u / 2;
  for i in 1..q loop r := random(); if r < 0.4 then f := f + 2; elsif r < 0.75 then l := l + 2; else k := k + 2; end if; end loop;
  got := public.w_res(me, l, f, k);
  perform public.w_xp(me, xp);
  if res then
    w := public.w_wallet(me); fatti := coalesce((w.caps->>('partite_mt:' || day))::int, 0);
    if fatti < 50 then mt := least(5, 50 - fatti);
      update public.world_wallet set caps = jsonb_set(caps, array['partite_mt:' || day], to_jsonb(fatti + mt)) where user_id = me;
      perform public.w_pay(me, mt, 'Difendi la casa: casa salva');
    end if;
  end if;
  update public.world_partite set fine_at = now(), uccisi = u, resistita = res,
    esito = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt) where id = p_id;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'uccisi', u, 'resistita', res, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
    'mattoni', mt, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0,
    'record', u > coalesce((select max(uccisi) from public.world_partite where user_id = me and id <> p_id), 0));
end $$;

-- ---------- 🛒 Bottega: potenziamenti con i Mattoni ----------
create or replace function public.world_bottega_compra(p_item text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; s public.world_superstite; c int; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_item not in ('energia','bomba','scudo') then return json_build_object('ok', false, 'msg', 'Oggetto sconosciuto'); end if;
  w := public.w_wallet(me); s := public.w_sup(me);
  c := case p_item when 'energia' then 60 else 25 end;
  if w.mattoni < c then return json_build_object('ok', false, 'msg', format('Servono 🧱 %s', c)); end if;
  if p_item = 'energia' then
    n := coalesce((w.caps->>('energia_comprata:' || day))::int, 0);
    if n >= 2 then return json_build_object('ok', false, 'msg', 'Oggi hai già comprato energia 2 volte'); end if;
    update public.world_wallet set caps = jsonb_set(caps, array['energia_comprata:' || day], to_jsonb(n + 1)) where user_id = me;
    update public.world_superstite set energia = least(public.w_en_max(abil) + 5, energia + 5) where user_id = me;
  elsif p_item = 'bomba' then
    if s.bombe >= 5 then return json_build_object('ok', false, 'msg', 'Puoi tenere al massimo 5 bombe'); end if;
    update public.world_superstite set bombe = bombe + 1 where user_id = me;
  else
    if s.scudi >= 5 then return json_build_object('ok', false, 'msg', 'Puoi tenere al massimo 5 scudi'); end if;
    update public.world_superstite set scudi = scudi + 1 where user_id = me;
  end if;
  perform public.w_pay(me, -c, 'Bottega: ' || p_item);
  s := public.w_sup(me);
  return json_build_object('ok', true, 'msg', case p_item when 'energia' then '⚡ +5 energia' when 'bomba' then '💣 Bomba pronta' else '🛡️ Scudo pronto' end,
    'energia', s.energia, 'bombe', s.bombe, 'scudi', s.scudi);
end $$;

-- world_sup_info dice anche bombe, scudi e partite di oggi
create or replace function public.world_sup_extra() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if me is null then return json_build_object('ok', false); end if;
  s := public.w_sup(me); w := public.w_wallet(me);
  return json_build_object('ok', true, 'bombe', s.bombe, 'scudi', s.scudi, 'energia', s.energia,
    'partite', coalesce((w.caps->>('partite:' || day))::int, 0), 'energia_comprata', coalesce((w.caps->>('energia_comprata:' || day))::int, 0),
    'record', coalesce((select max(uccisi) from public.world_partite where user_id = me), 0));
end $$;

revoke all on function public.world_difesa_inizia(boolean) from public, anon;
revoke all on function public.world_difesa_bomba(bigint) from public, anon;
revoke all on function public.world_difesa_fine(bigint, int, boolean) from public, anon;
revoke all on function public.world_bottega_compra(text) from public, anon;
revoke all on function public.world_sup_extra() from public, anon;
grant execute on function public.world_difesa_inizia(boolean) to authenticated;
grant execute on function public.world_difesa_bomba(bigint) to authenticated;
grant execute on function public.world_difesa_fine(bigint, int, boolean) to authenticated;
grant execute on function public.world_bottega_compra(text) to authenticated;
grant execute on function public.world_sup_extra() to authenticated;

-- controllo: deve dire "difendi la casa pronto"
select case when exists (select 1 from pg_proc where proname = 'world_difesa_fine') and exists (select 1 from pg_proc where proname = 'world_bottega_compra')
       then 'difendi la casa pronto' else 'qualcosa manca' end as esito;
