-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 049 — 🧭 GUIDI IL SUPERSTITE SULLA MAPPA DEL GIOCO (22/11)
-- Il superstite si muove sulla mappa del gioco col tocco. La posizione la tiene il server (world_esplora):
--   • parte da una tua casa (entro 150 m) — "🏠 Torna a casa" lo riporta a una casa qualsiasi, anche lontana;
--   • si muove al massimo a 12 m/s (più 30 m di tolleranza): niente salti;
--   • resta entro il raggio del superstite dalla casa più vicina (w_sup_raggio).
-- Vicino a uno zombie (entro 50 m) si combatte subito nell'arena: modo 'esplora', 🔋 1.
-- Si può eseguire più volte.
-- =====================================================================
create table if not exists public.world_esplora (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  at timestamptz not null default now()
);
alter table public.world_esplora enable row level security;
drop policy if exists world_esplora_mia on public.world_esplora;
create policy world_esplora_mia on public.world_esplora for select using (user_id = auth.uid());

alter table public.world_scontri drop constraint if exists world_scontri_modo_check;
alter table public.world_scontri add constraint world_scontri_modo_check check (modo in ('persona','superstite','esplora'));

-- regole (le stesse di prima + quelle nuove)
create or replace function public.w_arena_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'dist_m', 80, 'acc_max_m', 50, 'attesa_min', 30, 'max_giorno', 30,
    'diff', jsonb_build_object('facile', -2, 'equilibrato', 0, 'difficile', 2),
    'xp_molt', jsonb_build_object('facile', 0.7, 'equilibrato', 1.0, 'difficile', 1.5),
    'durata_max_s', 300, 'colpi_s', 2.5,
    'esplora_m', 50, 'esplora_vel_ms', 12, 'esplora_toll_m', 30, 'esplora_casa_m', 150);
$$;

-- distanza (km) dalla tua casa più vicina (vera o comprata)
create or replace function public.w_casa_vicina_km(p_user uuid, p_lat double precision, p_lon double precision) returns numeric
language sql stable security definer set search_path = public as $$
  select min(public.w_km(p_lat, p_lon, x.lat, x.lon))::numeric from (
    select h.lat, h.lon from public.world_homes h where h.user_id = p_user and h.lat is not null
    union all select b.lat, b.lon from public.world_buildings b where b.owner = p_user and b.lat is not null) x; $$;

-- sposta il superstite: controlli di velocità e raggio. p_casa = true per ripartire da una casa.
create or replace function public.world_esplora_muovi(p_lat double precision, p_lon double precision, p_casa boolean default false) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c jsonb := public.w_arena_cfg(); ex public.world_esplora; d numeric; max_m numeric; kc numeric; s public.world_superstite; r numeric;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_lat is null or p_lon is null then return json_build_object('ok', false, 'msg', 'Posizione mancante'); end if;
  kc := public.w_casa_vicina_km(me, p_lat, p_lon);
  if kc is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo'); end if;
  select * into ex from public.world_esplora where user_id = me for update;
  if p_casa or ex.user_id is null then
    if kc * 1000 > (c->>'esplora_casa_m')::int then return json_build_object('ok', false, 'msg', 'Il superstite parte da una delle tue case'); end if;
    insert into public.world_esplora(user_id, lat, lon, at) values (me, p_lat, p_lon, now())
      on conflict (user_id) do update set lat = excluded.lat, lon = excluded.lon, at = now();
    return json_build_object('ok', true, 'lat', p_lat, 'lon', p_lon);
  end if;
  s := public.w_sup(me); r := public.w_sup_raggio(s.xp, s.abil);
  if kc > r then return json_build_object('ok', false, 'lat', ex.lat, 'lon', ex.lon, 'msg', format('Più in là no: il superstite si allontana al massimo %s km dalle tue case', r)); end if;
  d := public.w_km(ex.lat, ex.lon, p_lat, p_lon) * 1000;
  max_m := least(600, extract(epoch from now() - ex.at) * (c->>'esplora_vel_ms')::numeric) + (c->>'esplora_toll_m')::numeric;
  if d > max_m then return json_build_object('ok', false, 'lat', ex.lat, 'lon', ex.lon, 'msg', 'Troppo veloce: il superstite cammina, non vola'); end if;
  update public.world_esplora set lat = p_lat, lon = p_lon, at = now() where user_id = me;
  return json_build_object('ok', true, 'lat', p_lat, 'lon', p_lon);
end $$;

create or replace function public.world_esplora_dove() returns json
language sql stable security definer set search_path = public as $$
  select coalesce((select json_build_object('ok', true, 'lat', lat, 'lon', lon, 'at', at) from public.world_esplora where user_id = auth.uid()), json_build_object('ok', true)); $$;

grant execute on function public.world_esplora_muovi(double precision, double precision, boolean) to authenticated;
grant execute on function public.world_esplora_dove() to authenticated;
revoke all on function public.w_casa_vicina_km(uuid, double precision, double precision) from public, anon, authenticated;

create or replace function public.world_scontro_parti(p_zid text, p_modo text, p_diff text, p_lat double precision, p_lon double precision, p_acc double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); z json; c jsonb := public.w_arena_cfg(); s public.world_superstite; g int; liv int; w public.world_wallet;
  day text := to_char(now() at time zone 'Europe/Rome', 'YYYY-MM-DD'); n int; v jsonb; d numeric; nid bigint; en int; cc int; ck int; ex public.world_esplora;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_modo not in ('persona','superstite','esplora') or p_diff not in ('facile','equilibrato','difficile') then return json_build_object('ok', false, 'msg', 'Scelta non valida'); end if;
  z := public.w_zm_trova(p_zid);
  if z is null or z->>'k' <> 'zombie' then return json_build_object('ok', false, 'msg', 'Questo zombie è sparito'); end if;
  if exists (select 1 from public.world_zombie_presi where user_id = me and zid = p_zid) then return json_build_object('ok', false, 'msg', 'L’hai già abbattuto'); end if;
  if exists (select 1 from public.world_scontri where user_id = me and zid = p_zid) then return json_build_object('ok', false, 'msg', 'Hai già affrontato questo zombie'); end if;
  if p_modo = 'superstite' and exists (select 1 from public.world_scontri where user_id = me and stato in ('viaggio','pronto') and modo = 'superstite') then
    return json_build_object('ok', false, 'msg', 'Il superstite è già in viaggio verso uno zombie: affronta prima quello'); end if;
  w := public.w_wallet(me); n := coalesce((w.caps->>('arena:' || day))::int, 0);
  if n >= (c->>'max_giorno')::int then return json_build_object('ok', false, 'msg', 'Oggi hai già fatto ' || n || ' scontri: riposati'); end if;
  s := public.w_sup(me); g := public.w_grado(s.xp); liv := greatest(1, g + (c->'diff'->>p_diff)::int);
  if p_modo = 'esplora' then
    -- 🧭 il superstite guidato sulla mappa del gioco: deve essere lì (posizione controllata dal server, aggiornata da poco)
    select * into ex from public.world_esplora where user_id = me;
    if ex.user_id is null or ex.at < now() - interval '3 minutes' then return json_build_object('ok', false, 'msg', 'Porta il superstite vicino allo zombie sulla mappa del gioco'); end if;
    d := public.w_km(ex.lat, ex.lon, (z->>'lat')::float, (z->>'lon')::float) * 1000;
    if d > (c->>'esplora_m')::int then return json_build_object('ok', false, 'msg', format('Il superstite è a %s m: avvicinalo a meno di %s m', round(d), (c->>'esplora_m')::int)); end if;
    if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min)', public.w_en_ric(s.abil))); end if;
    update public.world_superstite set energia = energia - 1, energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
    insert into public.world_scontri(user_id, zid, tipo, modo, diff, livello, zlat, zlon, costo, stato, scade)
      values (me, p_zid, z->>'tipo', 'esplora', p_diff, liv, (z->>'lat')::float, (z->>'lon')::float, '{"energia":1}', 'pronto', now() + interval '15 minutes') returning id into nid;
  elsif p_modo = 'persona' then
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
  return json_build_object('ok', true, 'id', nid, 'stato', case when p_modo = 'superstite' then 'viaggio' else 'pronto' end,
    'min', case when p_modo = 'superstite' then (v->>'min')::int else 0 end,
    'msg', case when p_modo <> 'superstite' then '🧟 Allo scontro!' else format('🎒 Il superstite parte %s: arriva fra %s min. Ti avviso io', v->>'mezzo_nome', v->>'min') end);
end $$;

-- controllo: deve dire "esplora pronta"
select case when exists (select 1 from pg_proc where proname = 'world_esplora_muovi') then 'esplora pronta' else 'qualcosa manca' end as esito;
