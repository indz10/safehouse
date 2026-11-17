-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 028 — ⚔️ ATTACCHI TRA SUPERSTITI: motore unico e attacco singolo (Fase 35, 17/11)
-- Scelte di Alessandro: casa vera custodita intoccabile dai giocatori · 🧱 si possono rubare · Combattente fino a +45%
-- (abilità fino a 9) · le vecchie "assalto alle case", "saccheggio" e "manda un'orda" sono sostituite da ⚔️ Attacca.
--  - REGOLE IN UN POSTO SOLO: w_pvp_cfg() (percentuali, soglie, bonus, tempi di viaggio, protezioni, limiti).
--  - MOTORE UNICO: w_combat(attacco, difesa, seme) → esito 0 respinto · 1 di misura · 2 normale · 3 schiacciante;
--    w_bottino(vittima, esito) toglie le scorte (sopra la scorta protetta) e le restituisce: l'attacco le dà
--    all'attaccante, le orde (fase successiva) le distruggeranno.
--  - ATTACCO: world_attacco_info (anteprima e controlli), world_attacca (parte: 🥫 + ⛽ del viaggio + 1 energia),
--    viaggio a tempo secondo la distanza, notifica subito al difensore (novità 'pvp_arrivo'), risoluzione automatica
--    all'impatto anche offline (w_attacchi_tick, ogni minuto con pg_cron e a ogni apertura), bottino e danni alle
--    difese (riparabili con 🪵: world_ripara), storico (world_attacchi_miei), esito a entrambi (novità 'pvp_esito').
--  - REGOLA ASSOLUTA: mai contro un alleato (alleanza, coinquilini, alleati): controllo alla partenza e all'impatto.
-- Richiede le migrazioni fino alla 027. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) le regole, in un posto solo ----------
create or replace function public.w_pvp_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'comb_pct', 0.05, 'comb_max', 9,                                   -- Combattente: +5% attacco e difesa per livello (max 9 = +45%)
    'viaggio', jsonb_build_array(jsonb_build_array(1,5), jsonb_build_array(5,10), jsonb_build_array(20,20), jsonb_build_array(50,40), jsonb_build_array(100,60)),
    'viaggio_oltre', 90,                                               -- minuti oltre 100 km
    'soglie', jsonb_build_array(1, 1.25, 1.6),                         -- rapporto attacco/difesa per misura, normale, schiacciante
    'perc', jsonb_build_array(0, 0.10, 0.20, 0.30),                    -- scorte perse per esito
    'danni', jsonb_build_array(0, 5, 10, 15),                          -- punti di difesa danneggiati per esito
    'danni_max', 30,
    'prot_pct', 0.30,                                                  -- scorta protetta: il più alto tra il 30% e il minimo
    'prot_min', jsonb_build_object('legno', 50, 'cibo', 50, 'carb', 50, 'mattoni', 100),
    'cap', jsonb_build_object('legno', 150, 'cibo', 150, 'carb', 150, 'mattoni', 100),   -- massimo per attacco
    'caso', 0.10,                                                      -- variazione casuale ±10% decisa dal server
    'atk_base', 30, 'atk_lvl', 3,                                      -- forza = (30 + 3 × livello) × (1 + Combattente) × mezzo
    'costo_cibo', 10, 'energia', 1,
    'coppia_ore', 12, 'scudo_ore', 6, 'max_sconfitte', 3, 'max_attacchi', 5,
    'riparo_legno', 2); $$;

create or replace function public.w_viaggio_min(p_km double precision) returns int language sql immutable as $$
  select coalesce((select (x->>1)::int from jsonb_array_elements(public.w_pvp_cfg()->'viaggio') with ordinality t(x, i)
                   where coalesce(p_km, 0) <= (x->>0)::numeric order by i limit 1), (public.w_pvp_cfg()->>'viaggio_oltre')::int); $$;

-- Combattente fino a 9 (le altre abilità restano fino a 5)
create or replace function public.w_ab(p_abil jsonb, p_k text) returns integer language sql immutable as $$
  select least(case when p_k = 'combattente' then 9 else 5 end, greatest(0, coalesce((p_abil->>p_k)::int, 0))); $$;

create or replace function public.world_sup_abilita(p_k text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; liberi int; a int; mx int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('esploratore','resistenza','combattente','cercatore','mercante') then return json_build_object('ok', false, 'msg', 'Abilità sconosciuta'); end if;
  s := public.w_sup(me);
  liberi := (public.w_grado(s.xp) - 1) - (select coalesce(sum(public.w_ab(s.abil, k)), 0) from unnest(array['esploratore','resistenza','combattente','cercatore','mercante']) k);
  a := public.w_ab(s.abil, p_k); mx := case when p_k = 'combattente' then 9 else 5 end;
  if liberi <= 0 then return json_build_object('ok', false, 'msg', 'Nessun punto libero: sali di grado con l’esperienza'); end if;
  if a >= mx then return json_build_object('ok', false, 'msg', format('Questa abilità è già al massimo (%s)', mx)); end if;
  update public.world_superstite set abil = jsonb_set(abil, array[p_k], to_jsonb(a + 1)) where user_id = me;
  return json_build_object('ok', true, 'livello', a + 1, 'msg', 'Abilità migliorata');
end $$;

create or replace function public.w_comb_bonus(p_user uuid) returns numeric language sql stable security definer set search_path to 'public' as $$
  select (public.w_pvp_cfg()->>'comb_pct')::numeric * coalesce((select public.w_ab(s.abil, 'combattente') from public.world_superstite s where s.user_id = p_user), 0); $$;

-- ---------- 2) il motore unico ----------
-- forza di un attaccante (snapshot alla partenza)
create or replace function public.w_forza_att(p_user uuid, p_mz text) returns numeric language sql stable security definer set search_path to 'public' as $$
  select round(((public.w_pvp_cfg()->>'atk_base')::numeric + (public.w_pvp_cfg()->>'atk_lvl')::numeric * least(greatest(public.w_lvl_of(p_user), 1), 30))
               * (1 + public.w_comb_bonus(p_user)) * public.w_mz_atk(p_mz), 1); $$;

-- danni alle difese ancora da riparare
alter table public.world_homes add column if not exists danno int not null default 0;
alter table public.world_buildings add column if not exists danno int not null default 0;

-- difesa di una casa adesso (la stessa dell'orda) × Combattente del padrone − danni
create or replace function public.w_forza_dif(p_owner uuid, p_bid text) returns numeric language plpgsql stable security definer set search_path to 'public' as $$
declare sid text := public.w_slot_id(public.w_next_slot(now())); home boolean; lvl int; d int; base numeric;
begin
  home := exists (select 1 from public.world_homes where user_id = p_owner and building_id = p_bid);
  lvl := coalesce((select level from public.world_buildings where building_id = p_bid), 1);
  d := case when home then coalesce((select danno from public.world_homes where user_id = p_owner), 0) else coalesce((select danno from public.world_buildings where building_id = p_bid), 0) end;
  base := 45 + 12 * greatest(lvl, 1) + case when home then 5 + public.w_condo_bonus(p_owner) else 0 end
        + public.w_upower(p_owner, sid) + public.w_pres_bonus(p_bid, sid) + public.w_casa_extra(p_bid, sid);
  return round(greatest(10, base * (1 + public.w_comb_bonus(p_owner)) - d), 1);
end $$;

create or replace function public.w_combat(p_att numeric, p_dif numeric, p_seed text) returns jsonb language sql immutable as $$
  with c as (select public.w_pvp_cfg() as k),
  v as (select k, (abs(hashtext(p_seed)) % 2001 - 1000) / 1000.0 * (k->>'caso')::numeric as x from c),
  r as (select k, x, round(p_att * (1 + x) / greatest(1, p_dif), 3) as r from v)
  select jsonb_build_object('r', r, 'caso', round(x, 3),
    'esito', case when r < (k->'soglie'->>0)::numeric then 0 when r < (k->'soglie'->>1)::numeric then 1 when r < (k->'soglie'->>2)::numeric then 2 else 3 end) from r; $$;

-- toglie le scorte alla vittima (sopra la scorta protetta) e le restituisce
create or replace function public.w_bottino(p_vittima uuid, p_esito int) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); w public.world_wallet; pc numeric; out jsonb := '{}'::jsonb; r text; val int; prot int; prend int;
begin
  if coalesce(p_esito, 0) <= 0 then return jsonb_build_object('legno',0,'cibo',0,'carb',0,'mattoni',0); end if;
  pc := (k->'perc'->>p_esito)::numeric; w := public.w_wallet(p_vittima);
  foreach r in array array['legno','cibo','carb','mattoni'] loop
    val := case r when 'legno' then w.legno when 'cibo' then w.cibo when 'carb' then w.carb else w.mattoni end;
    prot := greatest((k->'prot_min'->>r)::int, floor(val * (k->>'prot_pct')::numeric)::int);
    prend := least((k->'cap'->>r)::int, floor(greatest(0, val - prot) * pc)::int);
    out := out || jsonb_build_object(r, prend);
  end loop;
  update public.world_wallet set legno = legno - (out->>'legno')::int, cibo = cibo - (out->>'cibo')::int, carb = carb - (out->>'carb')::int,
    mattoni = mattoni - (out->>'mattoni')::int where user_id = p_vittima;
  if (out->>'mattoni')::int > 0 then insert into public.world_log(user_id, delta, reason, seen) values (p_vittima, -(out->>'mattoni')::int, 'Scorte perse in un attacco', false); end if;
  return out;
end $$;

-- ---------- 3) gli attacchi ----------
create table if not exists public.world_attacchi (
  id bigserial primary key,
  kind text not null default 'pvp',
  attaccante uuid references auth.users(id) on delete cascade,
  vittima uuid not null references auth.users(id) on delete cascade,
  bid text not null,
  casa_vera boolean not null,
  lat double precision, lon double precision,
  km numeric, minuti int not null,
  mezzo text,
  forza numeric not null,
  partenza timestamptz not null default now(),
  impatto timestamptz not null,
  stato text not null default 'viaggio' check (stato in ('viaggio','risolto','annullato')),
  esito jsonb
);
alter table public.world_attacchi enable row level security;
create index if not exists world_attacchi_stato on public.world_attacchi(stato, impatto);
create index if not exists world_attacchi_vittima on public.world_attacchi(vittima, partenza desc);
create index if not exists world_attacchi_att on public.world_attacchi(attaccante, partenza desc);

-- bersaglio: una casa (bid) o la casa vera di un giocatore
create or replace function public.w_bersaglio(p_user uuid, p_bid text) returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare h public.world_homes; b public.world_buildings;
begin
  if p_bid is not null then
    select * into h from public.world_homes where building_id = p_bid limit 1;
    if h.user_id is not null then return jsonb_build_object('owner', h.user_id, 'bid', h.building_id, 'home', true, 'lat', h.lat, 'lon', h.lon, 'label', 'casa di @' || public.w_nick(h.user_id)); end if;
    select * into b from public.world_buildings where building_id = p_bid;
    if b.owner is not null then return jsonb_build_object('owner', b.owner, 'bid', b.building_id, 'home', false, 'lat', b.lat, 'lon', b.lon, 'label', 'casa comprata di @' || public.w_nick(b.owner)); end if;
    return null;
  end if;
  select * into h from public.world_homes where user_id = p_user;
  if h.user_id is null then return null; end if;
  return jsonb_build_object('owner', h.user_id, 'bid', h.building_id, 'home', true, 'lat', h.lat, 'lon', h.lon, 'label', 'casa di @' || public.w_nick(h.user_id));
end $$;

-- perché no (null = si può)
create or replace function public.w_attacco_no(p_me uuid, p_t jsonb) returns text language plpgsql stable security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); o uuid; last timestamptz; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if p_t is null then return 'Qui non abita nessuno'; end if;
  o := (p_t->>'owner')::uuid;
  if o = p_me then return 'È casa tua'; end if;
  if public.w_are_allies(p_me, o) or public.w_coinq(p_me, o) then return 'È un tuo alleato: tra alleati non ci si attacca'; end if;
  if public.w_shielded(o) then return 'È appena arrivato: ha lo scudo del nuovo arrivato (15 giorni)'; end if;
  if (p_t->>'home')::boolean and public.w_custodita(o) then return 'È la sua casa vera ed è custodita (ci passa ogni settimana): intoccabile'; end if;
  if public.w_lvl_of(o) < public.w_lvl_of(p_me) - 3 then return 'È molto più debole di te: è protetto'; end if;
  if exists (select 1 from public.world_attacchi where attaccante = p_me and bid = p_t->>'bid' and stato = 'viaggio') then return 'La tua squadra è già in viaggio verso questa casa'; end if;
  select max(partenza) into last from public.world_attacchi where attaccante = p_me and vittima = o and stato <> 'annullato';
  if last > now() - make_interval(hours => (k->>'coppia_ore')::int) then
    return format('L’hai già attaccato: riprova fra %s ore', ceil(extract(epoch from (last + make_interval(hours => (k->>'coppia_ore')::int) - now())) / 3600)); end if;
  if exists (select 1 from public.world_attacchi where vittima = o and stato = 'risolto' and (esito->>'esito')::int > 0 and impatto > now() - make_interval(hours => (k->>'scudo_ore')::int)) then
    return 'È appena stato saccheggiato: riprova fra qualche ora'; end if;
  if (select count(*) from public.world_attacchi where vittima = o and stato = 'risolto' and (esito->>'esito')::int > 0 and impatto > now() - interval '24 hours') >= (k->>'max_sconfitte')::int then
    return 'Oggi ha già perso troppe volte: lascialo respirare'; end if;
  if (select count(*) from public.world_attacchi where attaccante = p_me and (partenza at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) >= (k->>'max_attacchi')::int then
    return format('Oggi hai già fatto %s attacchi', k->>'max_attacchi'); end if;
  return null;
end $$;

create or replace function public.world_attacco_info(p_user uuid, p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); t jsonb; why text; km double precision; mz text; att numeric; dif numeric; c int; s public.world_superstite; r jsonb;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  t := public.w_bersaglio(p_user, p_bid);
  why := public.w_attacco_no(me, t);
  if t is null then return json_build_object('ok', false, 'msg', why); end if;
  km := public.w_dist_pt(me, (t->>'lat')::float, (t->>'lon')::float);
  if km is null then return json_build_object('ok', false, 'msg', 'Per attaccare ti serve una casa nel mondo'); end if;
  mz := public.w_mz_eff(me, km); att := public.w_forza_att(me, mz); dif := public.w_forza_dif((t->>'owner')::uuid, t->>'bid');
  r := public.w_combat(att, dif, 'stima'); s := public.w_sup(me);
  return json_build_object('ok', why is null, 'msg', why, 'owner', t->>'owner', 'nick', public.w_nick((t->>'owner')::uuid), 'bid', t->>'bid', 'home', (t->>'home')::boolean,
    'label', t->>'label', 'km', round(km::numeric, 1), 'minuti', public.w_viaggio_min(km), 'mezzo', mz, 'mezzo_nome', public.w_mz_nome(mz),
    'costo', json_build_object('cibo', (public.w_pvp_cfg()->>'costo_cibo')::int, 'carb', public.w_mz_carb(mz, km), 'energia', (public.w_pvp_cfg()->>'energia')::int),
    'forza', att, 'difesa', round(dif / 10) * 10, 'rapporto', round(att / greatest(1, dif), 2), 'energia', s.energia,
    'combattente', public.w_ab(s.abil, 'combattente'));
end $$;

create or replace function public.world_attacca(p_user uuid, p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg(); t jsonb; why text; km double precision; mz text; c int; mins int; s public.world_superstite; nid bigint; lost boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  t := public.w_bersaglio(p_user, p_bid); why := public.w_attacco_no(me, t);
  if why is not null then return json_build_object('ok', false, 'msg', why); end if;
  km := public.w_dist_pt(me, (t->>'lat')::float, (t->>'lon')::float);
  if km is null then return json_build_object('ok', false, 'msg', 'Per attaccare ti serve una casa nel mondo'); end if;
  s := public.w_sup(me);
  if s.energia < (k->>'energia')::int then return json_build_object('ok', false, 'msg', 'Serve 1 energia: si ricarica da sola'); end if;
  mz := public.w_mz_eff(me, km); c := public.w_mz_carb(mz, km); mins := public.w_viaggio_min(km);
  update public.world_wallet set cibo = cibo - (k->>'costo_cibo')::int, carb = carb - c where user_id = me and cibo >= (k->>'costo_cibo')::int and carb >= c;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🥫 %s%s', k->>'costo_cibo', case when c > 0 then ' e ⛽ ' || c else '' end)); end if;
  update public.world_superstite set energia = energia - (k->>'energia')::int,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  lost := public.w_shielded(me);
  if lost then perform public.w_wallet(me); update public.world_wallet set caps = jsonb_set(caps, '{scudo_off}', '1') where user_id = me; end if;
  insert into public.world_attacchi(kind, attaccante, vittima, bid, casa_vera, lat, lon, km, minuti, mezzo, forza, impatto)
    values ('pvp', me, (t->>'owner')::uuid, t->>'bid', (t->>'home')::boolean, (t->>'lat')::float, (t->>'lon')::float, round(km::numeric, 2), mins, mz,
            public.w_forza_att(me, mz), now() + make_interval(mins => mins)) returning id into nid;
  perform public.w_feed_add('pvp_arrivo', me, (t->>'owner')::uuid, null, null, nid || '|' || mins || '|' || case when (t->>'home')::boolean then 'casa' else 'comprata' end);
  return json_build_object('ok', true, 'id', nid, 'minuti', mins, 'impatto', now() + make_interval(mins => mins),
    'msg', format('⚔️ Squadra partita %s: arriva fra %s min alla %s', public.w_mz_nome(mz), mins, t->>'label')
           || ' · 🥫 −' || (k->>'costo_cibo') || case when c > 0 then ' ⛽ −' || c else '' end || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

-- risoluzione all'impatto (ogni minuto e a ogni apertura)
create or replace function public.w_attacchi_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); a public.world_attacchi; t jsonb; dif numeric; res jsonb; e int; loot jsonb; dn int; n int := 0;
begin
  for a in select * from public.world_attacchi where stato = 'viaggio' and impatto <= now() order by impatto limit 50 for update skip locked loop
    t := public.w_bersaglio(null, a.bid);
    -- regola assoluta e bersaglio ancora valido, controllati anche all'impatto
    if t is null or (t->>'owner')::uuid <> a.vittima or public.w_are_allies(a.attaccante, a.vittima) or public.w_coinq(a.attaccante, a.vittima)
       or ((t->>'home')::boolean and public.w_custodita(a.vittima)) then
      update public.world_attacchi set stato = 'annullato', esito = jsonb_build_object('msg', 'Attacco annullato: il bersaglio non è più attaccabile') where id = a.id;
      update public.world_wallet set cibo = cibo + (k->>'costo_cibo')::int where user_id = a.attaccante;
      continue;
    end if;
    dif := public.w_forza_dif(a.vittima, a.bid);
    res := public.w_combat(a.forza, dif, 'pvp' || a.id); e := (res->>'esito')::int;
    loot := public.w_bottino(a.vittima, e);
    if e > 0 then
      perform public.w_wallet(a.attaccante);
      update public.world_wallet set legno = legno + (loot->>'legno')::int, cibo = cibo + (loot->>'cibo')::int, carb = carb + (loot->>'carb')::int,
        mattoni = mattoni + (loot->>'mattoni')::int where user_id = a.attaccante;
      if (loot->>'mattoni')::int > 0 then insert into public.world_log(user_id, delta, reason, seen) values (a.attaccante, (loot->>'mattoni')::int, 'Bottino di un attacco', false); end if;
      dn := (k->'danni'->>e)::int;
      if a.casa_vera then update public.world_homes set danno = least((k->>'danni_max')::int, danno + dn) where user_id = a.vittima;
      else update public.world_buildings set danno = least((k->>'danni_max')::int, danno + dn) where building_id = a.bid; end if;
    else dn := 0; end if;
    update public.world_attacchi set stato = 'risolto', esito = res || jsonb_build_object('att', a.forza, 'dif', dif, 'loot', loot, 'danno', dn) where id = a.id;
    perform public.w_feed_add('pvp_esito', a.attaccante, a.vittima, null, null, a.id || '|' || e || '|' || 'dif');
    perform public.w_feed_add('pvp_esito', a.vittima, a.attaccante, null, null, a.id || '|' || e || '|' || 'att');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.world_attacchi_miei() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_attacchi_tick();
  return json_build_object('ok', true, 'ora', now(),
    'in_arrivo', coalesce((select json_agg(json_build_object('id', a.id, 'da', public.w_nick(a.attaccante), 'da_id', a.attaccante, 'bid', a.bid, 'casa_vera', a.casa_vera,
        'impatto', a.impatto, 'minuti', a.minuti, 'km', a.km) order by a.impatto) from public.world_attacchi a where a.vittima = me and a.stato = 'viaggio'), '[]'::json),
    'in_viaggio', coalesce((select json_agg(json_build_object('id', a.id, 'contro', public.w_nick(a.vittima), 'contro_id', a.vittima, 'bid', a.bid, 'casa_vera', a.casa_vera,
        'impatto', a.impatto, 'minuti', a.minuti, 'forza', a.forza) order by a.impatto) from public.world_attacchi a where a.attaccante = me and a.stato = 'viaggio'), '[]'::json),
    'storico', coalesce((select json_agg(z.x order by z.quando desc) from (
        select json_build_object('id', a.id, 'io', case when a.attaccante = me then 'att' else 'dif' end, 'altro', public.w_nick(case when a.attaccante = me then a.vittima else a.attaccante end),
          'altro_id', case when a.attaccante = me then a.vittima else a.attaccante end, 'casa_vera', a.casa_vera, 'stato', a.stato, 'esito', a.esito, 'quando', a.impatto) as x, a.impatto as quando
        from public.world_attacchi a where (a.attaccante = me or a.vittima = me) and a.stato <> 'viaggio' order by a.impatto desc limit 20) z(x, quando)), '[]'::json),
    'danno_casa', coalesce((select danno from public.world_homes where user_id = me), 0),
    'danni', coalesce((select json_agg(json_build_object('bid', building_id, 'danno', danno)) from public.world_buildings where owner = me and danno > 0), '[]'::json));
end $$;

-- 🪵 riparare le difese danneggiate (casa vera o comprata)
create or replace function public.world_ripara(p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); d int; costo int; home boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  home := coalesce(p_bid, '') = '' or exists (select 1 from public.world_homes where user_id = me and building_id = p_bid);
  if home then d := (select danno from public.world_homes where user_id = me);
  else d := (select danno from public.world_buildings where building_id = p_bid and owner = me); end if;
  if d is null then return json_build_object('ok', false, 'msg', 'Non è casa tua'); end if;
  if d <= 0 then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
  costo := d * (public.w_pvp_cfg()->>'riparo_legno')::int;
  update public.world_wallet set legno = legno - costo where user_id = me and legno >= costo;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s', costo)); end if;
  if home then update public.world_homes set danno = 0 where user_id = me; else update public.world_buildings set danno = 0 where building_id = p_bid; end if;
  return json_build_object('ok', true, 'msg', format('🔨 Difese riparate: +%s · 🪵 −%s', d, costo));
end $$;

-- ---------- 4) le vecchie azioni sono sostituite da ⚔️ Attacca ----------
create or replace function public.world_send_attack(p_target uuid) returns json language sql security definer set search_path to 'public' as $$
  select json_build_object('ok', false, 'nuovo', true, 'target', p_target, 'msg', 'Ora si attacca con ⚔️ Attacca: viaggio, bottino e difesa'); $$;
create or replace function public.world_saccheggia(p_user uuid) returns json language sql security definer set search_path to 'public' as $$
  select json_build_object('ok', false, 'nuovo', true, 'target', p_user, 'msg', 'Ora si attacca con ⚔️ Attacca: viaggio, bottino e difesa'); $$;
create or replace function public.world_assalta(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); lost boolean := false; n int; quando text;
begin
  if p_bid not like 'pres:%' then return json_build_object('ok', false, 'nuovo', true, 'bid', p_bid, 'msg', 'Ora si attacca con ⚔️ Attacca: viaggio, bottino e difesa'); end if;
  a := public.w_azione(me, p_bid, p_lat, p_lon, 'atk');
  if not (a->>'ok')::boolean then return a; end if;
  update public.world_wallet set cibo = cibo - 10, carb = carb - (a->>'carb')::int where user_id = me and cibo >= 10 and carb >= (a->>'carb')::int;
  if not found then return json_build_object('ok',false,'msg','Risorse insufficienti'); end if;
  insert into public.world_assalti(bid, user_id, slot_id, kind, pts, vittima)
    values (a->>'bid', me, a->>'slot', 'atk', (a->>'pts')::int, case when a->>'tipo' = 'home' then (a->>'owner')::uuid end) on conflict do nothing;
  n := coalesce((select (caps->>('assalti:' || day))::int from public.world_wallet where user_id = me), 0);
  lost := public.w_shielded(me);
  update public.world_wallet set caps = jsonb_set(jsonb_set(caps, array['assalti:' || day], to_jsonb(n + 1)), '{scudo_off}', case when lost then '1' else coalesce(caps->'scudo_off','0') end) where user_id = me;
  perform public.w_feed_add('assalto', me, (a->>'owner')::uuid, null, null, a->>'tipo');
  quando := case when (a->>'in_tempo')::boolean then 'per l’orda delle ' || right(a->>'slot',2) || ':00' else 'troppo tardi per questa orda: conta per quella delle ' || right(a->>'slot',2) || ':00' end;
  return json_build_object('ok',true,'pts',(a->>'pts')::int,'slot',a->>'slot','msg','⚔️ Squadra partita ' || public.w_mz_nome(a->>'mezzo') || ': arriva tra ' || (a->>'eta_min') || ' min, ' || quando
    || ': −' || (a->>'pts') || ' alla sua difesa. Se cade, è tuo'
    || case when (a->>'carb')::int > 0 then ' · ⛽ −' || (a->>'carb') else '' end || ' · 🥫 −10' || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

revoke all on function public.w_bottino(uuid, int) from public, anon, authenticated;
revoke all on function public.w_attacchi_tick() from public, anon;
revoke all on function public.w_forza_dif(uuid, text) from public, anon, authenticated;
revoke all on function public.w_attacco_no(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.world_attacco_info(uuid, text) from public, anon;
revoke all on function public.world_attacca(uuid, text) from public, anon;
revoke all on function public.world_attacchi_miei() from public, anon;
revoke all on function public.world_ripara(text) from public, anon;
grant execute on function public.w_attacchi_tick() to service_role;
grant execute on function public.world_attacco_info(uuid, text) to authenticated;
grant execute on function public.world_attacca(uuid, text) to authenticated;
grant execute on function public.world_attacchi_miei() to authenticated;
grant execute on function public.world_ripara(text) to authenticated;

-- risoluzione automatica ogni minuto (anche se nessuno apre l'app)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('zsh-attacchi') where exists (select 1 from cron.job where jobname = 'zsh-attacchi');
    perform cron.schedule('zsh-attacchi', '* * * * *', 'select public.w_attacchi_tick();');
  end if;
end $$;

-- controllo: deve dire "attacchi pronti"
select case when exists (select 1 from pg_proc where proname = 'world_attacca') and exists (select 1 from pg_proc where proname = 'w_combat')
       then 'attacchi pronti' else 'qualcosa manca' end as esito;
