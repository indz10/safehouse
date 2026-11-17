-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 032 — 🧟 LE ORDE SUL MOTORE UNICO (Fase 39, 17/11)
-- Le orde delle 9 e delle 21 restano come sono (orari, forza dell'orda, difesa, case che tengono o cadono, premi).
-- Cambiano le CONSEGUENZE, con le stesse regole degli attacchi tra superstiti (w_pvp_cfg):
--  - dopo ogni orda (w_orde_tick, ogni 5 minuti, una volta per giocatore e per orda) per ogni casa caduta la gravità
--    viene da w_esito(rapporto), con rapporto = forza dell'orda / (difesa × (1 + Combattente)) e le stesse soglie
--    1 / 1,25 / 1,6 (senza il caso ±10%, così la % "di tenere" dell'app resta vera; il Combattente può salvare le scorte);
--  - SCORTE: una volta per orda, con la gravità peggiore, w_bottino toglie 10 / 20 / 30% sopra la scorta protetta
--    e le scorte vengono DISTRUTTE (non vanno a nessuno);
--  - DIFESE della casa vera −5 / −10 / −15 (si riparano con 🪵 in Io, world_ripara);
--  - INTEGRITÀ delle case comprate −10 / −17 / −25; a 0 crollano: 48 ore per ripararle, poi tornano libere con
--    metà della spesa restituita (w_cadute_tick della 031, caduta_da vuoto);
--  - lo SCUDO dei nuovi arrivati (15 giorni) protegge anche dalle perdite delle orde;
--  - novità 'orda_perdite' con quanto si è perso (e 'casa_crollata'); world_orde_mie per l'app.
-- Gli avvisi 60 e 15 minuti prima dell'orda li manda zsh-push (giro dei 10 minuti).
-- Richiede la 031. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) regole (le stesse + avvisi) ----------
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
    'riparo_legno', 2,
    -- rinforzi (029)
    'rinf_quota', 0.5,
    'calo', jsonb_build_array(1, 0.6, 0.4, 0.25),                      -- dalla più forte: 1ª, 2ª, 3ª, dalla 4ª in poi (rinforzi e attacchi d'alleanza)
    'rinf_max', 60, 'rinf_max_n', 6,
    'rinf_cibo', 5, 'rinf_xp', 15, 'rinf_premio_cibo', 5,
    -- attacchi d'alleanza (030)
    'raduno_max', 10, 'raduno_minuti', jsonb_build_array(10, 20, 30),
    -- integrità delle case comprate (031)
    'integ', jsonb_build_array(0, 10, 17, 25),                         -- integrità persa per esito (di misura, normale, schiacciante)
    'caduta_ore', 48,                                                  -- ore per riparare una casa crollata prima di perderla
    'rip_integ_legno', 1, 'rip_caduta_mattoni', 50,                    -- riparare: 🪵 1 a punto di integrità, +🧱 50 se è crollata
    'integ_conquista', 50,
    -- orde sul motore unico (032)
    'orda_avvisi', jsonb_build_array(60, 15));                        -- minuti prima dell'orda in cui arriva l'avviso
  $$;
-- l'esito dalle soglie, senza caso (per le orde)
create or replace function public.w_esito(p_r numeric) returns int language sql immutable as $$
  with k as (select public.w_pvp_cfg() as c)
  select case when p_r < (c->'soglie'->>0)::numeric then 0 when p_r < (c->'soglie'->>1)::numeric then 1 when p_r < (c->'soglie'->>2)::numeric then 2 else 3 end from k; $$;

-- ---------- 2) gli esiti delle orde ----------
create table if not exists public.world_orde_esiti (
  slot_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  esito int not null default 0,
  scudo boolean not null default false,
  loot jsonb,
  case_cadute jsonb,
  created_at timestamptz not null default now(),
  primary key (slot_id, user_id)
);
alter table public.world_orde_esiti enable row level security;
create index if not exists world_orde_esiti_user on public.world_orde_esiti(user_id, created_at desc);

-- da quando valgono le regole nuove (le orde passate non si toccano)
create table if not exists public.world_orde_avvio (id int primary key default 1, t timestamptz not null default now());
alter table public.world_orde_avvio enable row level security;
insert into public.world_orde_avvio(id, t) values (1, now()) on conflict (id) do nothing;

-- ---------- 3) dopo ogni orda: scorte, difese, integrità ----------
create or replace function public.w_orde_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); pt timestamptz := public.w_prev_slot(now()); pid text := public.w_slot_id(public.w_prev_slot(now()));
  u uuid; x record; lvl int; bon int; cb int; comb numeric; p int; a int; e int; emax int; cad jsonb; loot jsonb; sc boolean; resta int; n int := 0;
begin
  -- solo le orde arrivate dopo l'installazione, e al massimo 12 ore fa
  if pt <= coalesce((select t from public.world_orde_avvio where id = 1), now()) or pt < now() - interval '12 hours' then return 0; end if;
  for u in select z.uid from (select h.user_id as uid from public.world_homes h where h.first_at <= pt
                              union select b.owner from public.world_buildings b where b.owner is not null and b.bought_at <= pt) z
           where not exists (select 1 from public.world_orde_esiti o where o.slot_id = pid and o.user_id = z.uid) limit 300 loop
    lvl := public.w_lvl_of(u); bon := public.w_upower(u, pid); cb := public.w_condo_bonus(u); comb := public.w_comb_bonus(u);
    emax := 0; cad := '[]'::jsonb; sc := public.w_shielded(u);
    for x in select * from public.w_raid_houses(u, pt) loop
      p := public.w_power3(x.level, bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id, pid) + public.w_casa_extra(x.building_id, pid), x.home);
      a := public.w_attack3(pid, x.building_id, lvl);
      if p >= a then continue; end if;
      e := public.w_esito(round(a::numeric / greatest(1, p * (1 + comb)), 3));
      cad := cad || jsonb_build_object('bid', x.building_id, 'home', x.home, 'attacco', a, 'difesa', p, 'esito', e);
      if sc or e <= 0 then continue; end if;
      emax := greatest(emax, e);
      if x.home then
        update public.world_homes set danno = least((k->>'danni_max')::int, danno + (k->'danni'->>e)::int) where user_id = u;
      else
        update public.world_buildings set danno = least((k->>'danni_max')::int, danno + (k->'danni'->>e)::int),
          integrita = greatest(0, integrita - (k->'integ'->>e)::int),
          caduta_at = case when caduta_at is null and integrita - (k->'integ'->>e)::int <= 0 then now() else caduta_at end
          where building_id = x.building_id and owner = u and caduta_at is null returning integrita into resta;
        if resta is not null and resta <= 0 then
          perform public.w_feed_add('casa_crollata', u, u, x.lat, x.lon, x.building_id || '|' || (k->>'caduta_ore') || '|orda');
        end if;
        resta := null;
      end if;
    end loop;
    loot := public.w_bottino(u, emax);   -- le scorte perse con l'orda spariscono
    insert into public.world_orde_esiti(slot_id, user_id, esito, scudo, loot, case_cadute) values (pid, u, emax, sc, loot, cad) on conflict do nothing;
    if emax > 0 then
      perform public.w_feed_add('orda_perdite', u, u, null, null,
        pid || '|' || emax || '|' || (loot->>'legno') || ',' || (loot->>'cibo') || ',' || (loot->>'carb') || ',' || (loot->>'mattoni'));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- 4) le ultime orde per l'app ----------
create or replace function public.world_orde_mie() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_orde_tick();
  return json_build_object('ok', true, 'orde', coalesce((select json_agg(json_build_object('slot', o.slot_id, 'quando', public.w_slot_t(o.slot_id), 'esito', o.esito,
      'scudo', o.scudo, 'loot', o.loot, 'case', o.case_cadute) order by o.created_at desc)
    from (select * from public.world_orde_esiti where user_id = me order by created_at desc limit 6) o), '[]'::json));
end $$;

revoke all on function public.w_orde_tick() from public, anon, authenticated;
revoke all on function public.world_orde_mie() from public, anon;
grant execute on function public.w_orde_tick() to service_role;
grant execute on function public.world_orde_mie() to authenticated;

-- ogni 5 minuti: conseguenze dell'ultima orda
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('zsh-orde') where exists (select 1 from cron.job where jobname = 'zsh-orde');
    perform cron.schedule('zsh-orde', '*/5 * * * *', 'select public.w_orde_tick();');
  end if;
end $$;

-- controllo: deve dire "orde sul motore unico"
select case when exists (select 1 from pg_proc where proname = 'w_orde_tick') and exists (select 1 from pg_proc where proname = 'w_esito')
       then 'orde sul motore unico' else 'qualcosa manca' end as esito;
