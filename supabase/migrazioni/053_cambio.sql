-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 053 — 🔄 CAMBIO LIBERO DELLE RISORSE (25/11)
-- Nella Bottega si sceglie DA cosa e IN cosa cambiare e si scrive la quantità (non più pacchetti fissi).
-- • Ogni cosa ha un valore in punti (w_cambio_cfg): 💎 300 · 🥫 30 · 🪵 30 · ⛽ 36 · 🧱 20
--   (quindi 1 💎 = 🥫 10 = 🪵 10 = ⛽ 8 = 🧱 15, come il cambio delle gemme di prima).
-- • Dalle 💎 il cambio è pieno (le gemme restano la valuta principale). Tra risorse e mattoni c'è la
--   commissione del mercato: 30%, −4% per livello di Mercante (minimo 10%).
-- • Le gemme NON si ottengono dalle risorse. Tetti al giorno per i cambi tra risorse: 🧱 150 ricevuti,
--   🥫/🪵/⛽ 300 ricevuti ciascuna. Dalle gemme: max 💎 200 per volta, senza tetto giornaliero.
-- • world_trade e world_gemme_converti restano (vecchie app), l'app nuova usa world_cambio.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_cambio_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'valori', jsonb_build_object('gemme', 300, 'cibo', 30, 'legno', 30, 'carb', 36, 'mattoni', 20),
    'comm', 30, 'comm_mercante', 4, 'comm_min', 10,
    'tetto', jsonb_build_object('mattoni', 150, 'cibo', 300, 'legno', 300, 'carb', 300),
    'max_gemme', 200, 'max_altro', 5000); $$;

create or replace function public.w_cambio_comm(p_user uuid) returns int language sql stable security definer set search_path = public as $$
  select greatest((c->>'comm_min')::int, (c->>'comm')::int - (c->>'comm_mercante')::int
    * public.w_ab(coalesce((select abil from public.world_superstite where user_id = p_user), '{}'::jsonb), 'mercante'))
  from (select public.w_cambio_cfg() c) x; $$;

create or replace function public.world_cambio_info() returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; k jsonb := public.w_cambio_cfg(); day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  w := public.w_wallet(me);
  return json_build_object('ok', true, 'valori', k->'valori', 'comm', public.w_cambio_comm(me), 'max_gemme', (k->>'max_gemme')::int, 'max_altro', (k->>'max_altro')::int,
    'saldo', json_build_object('gemme', w.gemme, 'cibo', w.cibo, 'legno', w.legno, 'carb', w.carb, 'mattoni', w.mattoni),
    'resta', json_build_object(
      'mattoni', greatest(0, (k->'tetto'->>'mattoni')::int - coalesce((w.caps->>('cambio:mattoni:' || day))::int, 0)),
      'cibo', greatest(0, (k->'tetto'->>'cibo')::int - coalesce((w.caps->>('cambio:cibo:' || day))::int, 0)),
      'legno', greatest(0, (k->'tetto'->>'legno')::int - coalesce((w.caps->>('cambio:legno:' || day))::int, 0)),
      'carb', greatest(0, (k->'tetto'->>'carb')::int - coalesce((w.caps->>('cambio:carb:' || day))::int, 0))));
end $$;

create or replace function public.world_cambio(p_da text, p_a text, p_n int, p_chiave text) returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; k jsonb := public.w_cambio_cfg(); day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  vd int; va int; cm int; n int; r int; fatti int; resta int; hav int; s int; mx int;
  ic jsonb := '{"gemme":"💎","cibo":"🥫","legno":"🪵","carb":"⛽","mattoni":"🧱"}'::jsonb;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_da not in ('gemme','cibo','legno','carb','mattoni') or p_a not in ('cibo','legno','carb','mattoni') or p_da = p_a then
    return json_build_object('ok', false, 'msg', 'Cambio non valido (le gemme non si ottengono dalle risorse)'); end if;
  perform public.w_wallet(me);
  select * into w from public.world_wallet where user_id = me for update;
  if coalesce(p_chiave, '') <> '' and w.caps->>'cambio_ultimo' = p_chiave then return json_build_object('ok', true, 'gia', true, 'msg', 'Cambio già fatto'); end if;
  n := coalesce(p_n, 0);
  mx := (k->>(case when p_da = 'gemme' then 'max_gemme' else 'max_altro' end))::int;
  if n < 1 or n > mx then return json_build_object('ok', false, 'msg', 'Quantità da 1 a ' || mx); end if;
  vd := (k->'valori'->>p_da)::int; va := (k->'valori'->>p_a)::int;
  cm := case when p_da = 'gemme' then 0 else public.w_cambio_comm(me) end;
  r := floor(n::numeric * vd * (100 - cm) / 100 / va);
  if p_da <> 'gemme' then
    fatti := coalesce((w.caps->>('cambio:' || p_a || ':' || day))::int, 0);
    resta := (k->'tetto'->>p_a)::int - fatti;
    if resta <= 0 then return json_build_object('ok', false, 'msg', 'Oggi hai già ricevuto il massimo di ' || (ic->>p_a) || ' dai cambi: riprova domani'); end if;
    if r > resta then n := ceil(resta::numeric * va * 100 / (vd * (100 - cm))); r := least(resta, floor(n::numeric * vd * (100 - cm) / 100 / va)::int); end if;
  end if;
  if r < 1 then return json_build_object('ok', false, 'msg', 'Troppo poco: aumenta la quantità'); end if;
  hav := case p_da when 'gemme' then w.gemme when 'cibo' then w.cibo when 'legno' then w.legno when 'carb' then w.carb else w.mattoni end;
  if hav < n then return json_build_object('ok', false, 'msg', 'Non ne hai abbastanza: hai ' || (ic->>p_da) || ' ' || hav); end if;
  -- toglie
  if p_da = 'gemme' then
    s := public.w_gemme_add(me, -n, 'Cambio in ' || p_a, p_a, case when coalesce(p_chiave,'') <> '' then 'cmb:' || me || ':' || p_chiave end);
    if s = -1 then return json_build_object('ok', true, 'gia', true, 'msg', 'Cambio già fatto'); end if;
    if s is null then return json_build_object('ok', false, 'msg', 'Gemme insufficienti'); end if;
  elsif p_da = 'mattoni' then
    update public.world_wallet set mattoni = mattoni - n where user_id = me;
    insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -n, 'Cambio in ' || p_a, 'cambio', true);
  else
    update public.world_wallet set cibo = cibo - case when p_da = 'cibo' then n else 0 end, legno = legno - case when p_da = 'legno' then n else 0 end,
      carb = carb - case when p_da = 'carb' then n else 0 end where user_id = me;
  end if;
  -- dà
  if p_a = 'mattoni' then perform public.w_pay(me, r, 'Cambio: ' || (ic->>p_da) || ' ' || n);
  else update public.world_wallet set cibo = cibo + case when p_a = 'cibo' then r else 0 end, legno = legno + case when p_a = 'legno' then r else 0 end,
      carb = carb + case when p_a = 'carb' then r else 0 end where user_id = me; end if;
  update public.world_wallet set caps = caps || jsonb_build_object('cambio_ultimo', coalesce(p_chiave, ''))
      || case when p_da <> 'gemme' then jsonb_build_object('cambio:' || p_a || ':' || day, fatti + r) else '{}'::jsonb end
    where user_id = me;
  return json_build_object('ok', true, 'dato', n, 'ricevi', r, 'da', p_da, 'a', p_a, 'comm', cm,
    'msg', format('%s −%s → %s +%s', ic->>p_da, n, ic->>p_a, r));
end $$;

revoke all on function public.w_cambio_comm(uuid) from public, anon, authenticated;
grant execute on function public.world_cambio_info() to authenticated;
grant execute on function public.world_cambio(text, text, int, text) to authenticated;

-- controllo: deve dire "cambio pronto"
select case when exists (select 1 from pg_proc where proname = 'world_cambio') then 'cambio pronto' else 'qualcosa manca' end as esito;
