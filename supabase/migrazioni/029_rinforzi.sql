-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 029 — 🛡️ RINFORZI CONTRO GLI ATTACCHI (Fase 36, 17/11)
-- Durante l'avvicinamento di un attacco (migrazione 028):
--  - chi è attaccato chiede rinforzi a alleati, alleanze e coinquilini (world_rinforzi_chiedi → novità 'pvp_aiuto',
--    una volta per attacco) e vede chi può arrivare in tempo (world_rinforzi_info: distanza, minuti, ✅/❌);
--  - gli alleati mandano una squadra (world_rinforza): viaggia con gli STESSI tempi degli attacchi (w_viaggio_min,
--    dalla loro casa più vicina), costa 🥫 5 + ⛽ del mezzo; se non arriva prima dell'impatto non parte;
--  - all'impatto (w_attacchi_tick) la difesa è w_forza_dif + w_rinf_tot: metà della forza di ogni squadra arrivata,
--    con il calo 1 · 0,6 · 0,4 · 0,25 (dalla più forte), massimo +60, massimo 6 squadre;
--  - se l'attacco è respinto ogni squadra prende ⭐ 15 e 🥫 5 (novità 'pvp_difeso'); se è annullato riprende il 🥫.
--  - REGOLA: chi è alleato anche dell'attaccante resta fuori (niente rinforzi contro la propria alleanza).
-- Le regole nuove sono in w_pvp_cfg() insieme alle altre. Richiede la 028. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) le regole, in un posto solo (le stesse della 028 + rinforzi) ----------
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
    'rinf_quota', 0.5,                                                 -- ogni squadra vale metà della sua forza d'attacco
    'calo', jsonb_build_array(1, 0.6, 0.4, 0.25),                      -- dalla più forte: 1ª, 2ª, 3ª, dalla 4ª in poi
    'rinf_max', 60, 'rinf_max_n', 6,                                   -- massimo +60 alla difesa, massimo 6 squadre
    'rinf_cibo', 5, 'rinf_xp', 15, 'rinf_premio_cibo', 5); $$;

-- ---------- 2) le squadre di rinforzo ----------
create table if not exists public.world_attacchi_rinforzi (
  id bigserial primary key,
  attacco_id bigint not null references public.world_attacchi(id) on delete cascade,
  helper uuid not null references auth.users(id) on delete cascade,
  forza numeric not null,
  km numeric, minuti int not null, mezzo text,
  partenza timestamptz not null default now(),
  arrivo timestamptz not null,
  unique (attacco_id, helper)
);
alter table public.world_attacchi_rinforzi enable row level security;
create index if not exists world_attacchi_rinforzi_helper on public.world_attacchi_rinforzi(helper, partenza desc);
alter table public.world_attacchi add column if not exists chiesto timestamptz;

-- quanto valgono le squadre arrivate entro l'impatto
create or replace function public.w_rinf_tot(p_att bigint, p_impatto timestamptz) returns numeric language sql stable security definer set search_path to 'public' as $$
  with k as (select public.w_pvp_cfg() as c),
  r as (select forza, row_number() over (order by forza desc, id) as n from public.world_attacchi_rinforzi where attacco_id = p_att and arrivo <= p_impatto)
  select round(least((k.c->>'rinf_max')::numeric,
    coalesce(sum(r.forza * (k.c->>'rinf_quota')::numeric * (k.c->'calo'->>(least(r.n, 4) - 1)::int)::numeric), 0)), 1)
  from k left join r on true group by k.c; $$;

-- perché no (null = può mandare la squadra)
create or replace function public.w_rinf_no(p_me uuid, p_att bigint) returns text language plpgsql stable security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); a public.world_attacchi; km double precision;
begin
  select * into a from public.world_attacchi where id = p_att;
  if a.id is null or a.stato <> 'viaggio' or a.impatto <= now() then return 'Questo attacco è già finito'; end if;
  if p_me = a.vittima then return 'È casa tua: chiedi rinforzi ai tuoi alleati'; end if;
  if p_me = a.attaccante then return 'Sei tu ad attaccare'; end if;
  if not (public.w_are_allies(p_me, a.vittima) or public.w_coinq(p_me, a.vittima)) then return 'Solo i suoi alleati possono mandare rinforzi'; end if;
  if public.w_are_allies(p_me, a.attaccante) or public.w_coinq(p_me, a.attaccante) then return 'Anche chi attacca è tuo alleato: tra alleati non si combatte, resti fuori'; end if;
  if exists (select 1 from public.world_attacchi_rinforzi where attacco_id = p_att and helper = p_me) then return 'La tua squadra è già partita'; end if;
  if (select count(*) from public.world_attacchi_rinforzi where attacco_id = p_att) >= (k->>'rinf_max_n')::int then return 'Ci sono già abbastanza squadre a difenderlo'; end if;
  km := public.w_dist_pt(p_me, a.lat, a.lon);
  if km is null then return 'Ti serve una casa nel mondo'; end if;
  if now() + make_interval(mins => public.w_viaggio_min(km)) > a.impatto then
    return format('Non arrivi in tempo: ti servono %s min, l’impatto è fra %s', public.w_viaggio_min(km), greatest(1, ceil(extract(epoch from a.impatto - now()) / 60))); end if;
  return null;
end $$;

-- ---------- 3) chiedere rinforzi (chi è attaccato) ----------
create or replace function public.world_rinforzi_chiedi(p_att bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a public.world_attacchi; n int := 0; u uuid; left_min int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into a from public.world_attacchi where id = p_att and vittima = me;
  if a.id is null or a.stato <> 'viaggio' then return json_build_object('ok', false, 'msg', 'Questo attacco è già finito'); end if;
  if a.chiesto is not null then return json_build_object('ok', false, 'msg', 'Hai già chiesto rinforzi per questo attacco'); end if;
  left_min := greatest(1, ceil(extract(epoch from a.impatto - now()) / 60));
  for u in select x from (select distinct x from (select public.w_allies_of(me) as x) q) z
           where x <> a.attaccante and not public.w_are_allies(x, a.attaccante) and not public.w_coinq(x, a.attaccante)
           order by public.w_dist_pt(x, a.lat, a.lon) nulls last limit 30 loop
    perform public.w_feed_add('pvp_aiuto', me, u, null, null, a.id || '|' || left_min || '|' || public.w_nick(a.attaccante)); n := n + 1;
  end loop;
  update public.world_attacchi set chiesto = now() where id = a.id;
  return json_build_object('ok', true, 'n', n, 'msg', case when n = 0 then '📣 Non hai alleati da chiamare: fai alleanza con i vicini'
    else format('📣 Chiamati %s alleati: valgono le squadre che arrivano prima dell’impatto', n) end);
end $$;

-- chi può arrivare in tempo (per chi è attaccato)
create or replace function public.world_rinforzi_info(p_att bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a public.world_attacchi;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into a from public.world_attacchi where id = p_att and vittima = me;
  if a.id is null then return json_build_object('ok', false, 'msg', 'Attacco non trovato'); end if;
  return json_build_object('ok', true, 'ora', now(), 'impatto', a.impatto, 'chiesto', a.chiesto is not null, 'rinf', public.w_rinf_tot(a.id, a.impatto),
    'alleati', coalesce((select json_agg(z.x order by z.km nulls last) from (
      select json_build_object('id', u, 'nick', public.w_nick(u), 'km', round(d::numeric, 1), 'minuti', public.w_viaggio_min(d),
        'in_tempo', d is not null and now() + make_interval(mins => public.w_viaggio_min(d)) <= a.impatto,
        'partito', r.arrivo is not null, 'arrivo', r.arrivo) as x, d as km
      from (select distinct u from (select public.w_allies_of(me) as u) q) al
      cross join lateral (select public.w_dist_pt(al.u, a.lat, a.lon) as d) dd
      left join public.world_attacchi_rinforzi r on r.attacco_id = a.id and r.helper = al.u
      where al.u <> a.attaccante and not public.w_are_allies(al.u, a.attaccante) and not public.w_coinq(al.u, a.attaccante)
      limit 40) z), '[]'::json));
end $$;

-- ---------- 4) mandare la squadra (gli alleati) ----------
create or replace function public.world_rinforza(p_att bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg(); a public.world_attacchi; why text; km double precision; mz text; c int; mins int; f numeric;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  why := public.w_rinf_no(me, p_att);
  if why is not null then return json_build_object('ok', false, 'msg', why); end if;
  select * into a from public.world_attacchi where id = p_att;
  km := public.w_dist_pt(me, a.lat, a.lon); mz := public.w_mz_eff(me, km); c := public.w_mz_carb(mz, km); mins := public.w_viaggio_min(km);
  perform public.w_wallet(me);
  update public.world_wallet set cibo = cibo - (k->>'rinf_cibo')::int, carb = carb - c where user_id = me and cibo >= (k->>'rinf_cibo')::int and carb >= c;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🥫 %s%s', k->>'rinf_cibo', case when c > 0 then ' e ⛽ ' || c else '' end)); end if;
  f := public.w_forza_att(me, mz);
  insert into public.world_attacchi_rinforzi(attacco_id, helper, forza, km, minuti, mezzo, arrivo)
    values (a.id, me, f, round(km::numeric, 2), mins, mz, now() + make_interval(mins => mins)) on conflict do nothing;
  if not found then return json_build_object('ok', false, 'msg', 'La tua squadra è già partita'); end if;
  perform public.w_feed_add('pvp_rinf', me, a.vittima, null, null, a.id || '|' || mins);
  return json_build_object('ok', true, 'minuti', mins, 'valore', round(f * (k->>'rinf_quota')::numeric),
    'msg', format('🛡️ Rinforzi partiti %s: arrivano fra %s min, prima dell’attacco · 🥫 −%s%s', public.w_mz_nome(mz), mins, k->>'rinf_cibo', case when c > 0 then ' ⛽ −' || c else '' end));
end $$;

-- ---------- 5) la risoluzione conta i rinforzi arrivati in tempo ----------
create or replace function public.w_attacchi_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); a public.world_attacchi; t jsonb; dif numeric; rf numeric; res jsonb; e int; loot jsonb; dn int; n int := 0; h record;
begin
  for a in select * from public.world_attacchi where stato = 'viaggio' and impatto <= now() order by impatto limit 50 for update skip locked loop
    t := public.w_bersaglio(null, a.bid);
    -- regola assoluta e bersaglio ancora valido, controllati anche all'impatto
    if t is null or (t->>'owner')::uuid <> a.vittima or public.w_are_allies(a.attaccante, a.vittima) or public.w_coinq(a.attaccante, a.vittima)
       or ((t->>'home')::boolean and public.w_custodita(a.vittima)) then
      update public.world_attacchi set stato = 'annullato', esito = jsonb_build_object('msg', 'Attacco annullato: il bersaglio non è più attaccabile') where id = a.id;
      update public.world_wallet set cibo = cibo + (k->>'costo_cibo')::int where user_id = a.attaccante;
      update public.world_wallet w set cibo = cibo + (k->>'rinf_cibo')::int from public.world_attacchi_rinforzi r where r.attacco_id = a.id and w.user_id = r.helper;
      continue;
    end if;
    rf := public.w_rinf_tot(a.id, a.impatto);
    dif := public.w_forza_dif(a.vittima, a.bid) + rf;
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
    else
      dn := 0;
      -- chi ha difeso in tempo viene premiato
      for h in select helper from public.world_attacchi_rinforzi where attacco_id = a.id and arrivo <= a.impatto loop
        perform public.w_wallet(h.helper);
        update public.world_wallet set cibo = cibo + (k->>'rinf_premio_cibo')::int where user_id = h.helper;
        perform public.w_xp(h.helper, (k->>'rinf_xp')::int);
        perform public.w_feed_add('pvp_difeso', a.vittima, h.helper, null, null, a.id || '|' || public.w_nick(a.attaccante));
      end loop;
    end if;
    update public.world_attacchi set stato = 'risolto', esito = res || jsonb_build_object('att', a.forza, 'dif', dif, 'rinf', rf,
      'rinf_n', (select count(*) from public.world_attacchi_rinforzi where attacco_id = a.id and arrivo <= a.impatto), 'loot', loot, 'danno', dn) where id = a.id;
    perform public.w_feed_add('pvp_esito', a.attaccante, a.vittima, null, null, a.id || '|' || e || '|' || 'dif');
    perform public.w_feed_add('pvp_esito', a.vittima, a.attaccante, null, null, a.id || '|' || e || '|' || 'att');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- 6) Io: attacchi con i rinforzi e alleati sotto attacco ----------
create or replace function public.world_attacchi_miei() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_attacchi_tick();
  return json_build_object('ok', true, 'ora', now(),
    'in_arrivo', coalesce((select json_agg(json_build_object('id', a.id, 'da', public.w_nick(a.attaccante), 'da_id', a.attaccante, 'bid', a.bid, 'casa_vera', a.casa_vera,
        'impatto', a.impatto, 'minuti', a.minuti, 'km', a.km, 'chiesto', a.chiesto is not null, 'rinf', public.w_rinf_tot(a.id, a.impatto),
        'rinforzi', coalesce((select json_agg(json_build_object('nick', public.w_nick(r.helper), 'arrivo', r.arrivo, 'in_tempo', r.arrivo <= a.impatto) order by r.arrivo)
                              from public.world_attacchi_rinforzi r where r.attacco_id = a.id), '[]'::json)) order by a.impatto)
      from public.world_attacchi a where a.vittima = me and a.stato = 'viaggio'), '[]'::json),
    'in_viaggio', coalesce((select json_agg(json_build_object('id', a.id, 'contro', public.w_nick(a.vittima), 'contro_id', a.vittima, 'bid', a.bid, 'casa_vera', a.casa_vera,
        'impatto', a.impatto, 'minuti', a.minuti, 'forza', a.forza) order by a.impatto) from public.world_attacchi a where a.attaccante = me and a.stato = 'viaggio'), '[]'::json),
    'alleati', coalesce((select json_agg(z.x order by z.imp) from (
        select json_build_object('id', a.id, 'chi', public.w_nick(a.vittima), 'chi_id', a.vittima, 'da', public.w_nick(a.attaccante), 'casa_vera', a.casa_vera,
          'impatto', a.impatto, 'km', round(d::numeric, 1), 'minuti', public.w_viaggio_min(d),
          'in_tempo', d is not null and now() + make_interval(mins => public.w_viaggio_min(d)) <= a.impatto,
          'partito', r.arrivo is not null, 'arrivo', r.arrivo, 'chiesto', a.chiesto is not null) as x, a.impatto as imp
        from public.world_attacchi a
        cross join lateral (select public.w_dist_pt(me, a.lat, a.lon) as d) dd
        left join public.world_attacchi_rinforzi r on r.attacco_id = a.id and r.helper = me
        where a.stato = 'viaggio' and a.impatto > now() and a.vittima <> me and a.attaccante <> me
          and a.vittima in (select public.w_allies_of(me))
          and not public.w_are_allies(me, a.attaccante) and not public.w_coinq(me, a.attaccante)
        order by a.impatto limit 10) z), '[]'::json),
    'storico', coalesce((select json_agg(z.x order by z.quando desc) from (
        select json_build_object('id', a.id, 'io', case when a.attaccante = me then 'att' else 'dif' end, 'altro', public.w_nick(case when a.attaccante = me then a.vittima else a.attaccante end),
          'altro_id', case when a.attaccante = me then a.vittima else a.attaccante end, 'casa_vera', a.casa_vera, 'stato', a.stato, 'esito', a.esito, 'quando', a.impatto) as x, a.impatto as quando
        from public.world_attacchi a where (a.attaccante = me or a.vittima = me) and a.stato <> 'viaggio' order by a.impatto desc limit 20) z(x, quando)), '[]'::json),
    'danno_casa', coalesce((select danno from public.world_homes where user_id = me), 0),
    'danni', coalesce((select json_agg(json_build_object('bid', building_id, 'danno', danno)) from public.world_buildings where owner = me and danno > 0), '[]'::json));
end $$;

revoke all on function public.w_rinf_tot(bigint, timestamptz) from public, anon, authenticated;
revoke all on function public.w_rinf_no(uuid, bigint) from public, anon, authenticated;
revoke all on function public.world_rinforzi_chiedi(bigint) from public, anon;
revoke all on function public.world_rinforzi_info(bigint) from public, anon;
revoke all on function public.world_rinforza(bigint) from public, anon;
revoke all on function public.w_attacchi_tick() from public, anon;
revoke all on function public.world_attacchi_miei() from public, anon;
grant execute on function public.w_attacchi_tick() to service_role;
grant execute on function public.world_rinforzi_chiedi(bigint) to authenticated;
grant execute on function public.world_rinforzi_info(bigint) to authenticated;
grant execute on function public.world_rinforza(bigint) to authenticated;
grant execute on function public.world_attacchi_miei() to authenticated;

-- controllo: deve dire "rinforzi pronti"
select case when exists (select 1 from pg_proc where proname = 'world_rinforza') and exists (select 1 from pg_proc where proname = 'w_rinf_tot')
       then 'rinforzi pronti' else 'qualcosa manca' end as esito;
