-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 021 — 🔫 CACCIA NELLA LENTE e CASE DEI CONDOMINI (richieste di Alessandro, 15/11)
-- 1) 🔫 Caccia agli zombie nella Lente: con ⚡ 1 parte un'ondata di 3–6 zombie intorno a te (di più salendo di grado);
--    li colpisci toccandoli prima che ti raggiungano. Il server decide quanti e quali zombie, controlla i tempi
--    (niente uccisioni impossibili) e dà i premi: ⭐ 5 a zombie (+10% per punto di 🔪 Combattente), ⭐ 10 se li
--    prendi tutti, e da ogni zombie una scorta (🪵/🥫/⛽ 3, il bruto 6). Massimo 10 cacce al giorno.
-- 2) 🏢 Case non registrate: a chi ha valutato la casa ma non ce l'ha nel mondo (capitava nei condomini)
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
