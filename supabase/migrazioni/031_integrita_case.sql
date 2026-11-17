-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 031 — 🏚️ INTEGRITÀ DELLE CASE COMPRATE (Fase 38, 17/11)
-- Stesso motore degli attacchi (028–030):
--  - ogni casa comprata ha l'INTEGRITÀ 0–100 (world_buildings.integrita); un attacco vinto contro di lei la abbassa
--    di 10 / 17 / 25 (di misura, normale, schiacciante). La casa vera non crolla mai (perde scorte e difese come prima).
--  - a 0 la casa CROLLA (caduta_at, caduta_da = chi l'ha abbattuta; in un attacco d'alleanza chi ha portato più forza):
--    niente affitto (world_collect), non si può attaccare, novità 'casa_crollata' al padrone.
--  - 48 ORE per ripararla (world_ripara: 🪵 2 a punto di difesa + 🪵 1 a punto di integrità + 🧱 50 se è crollata).
--  - Se non la ripara (w_cadute_tick, ogni 5 minuti): passa a chi l'ha abbattuta con integrità 50 (novità 'conquista',
--    al vecchio padrone torna metà della spesa, come le conquiste di prima); se lui ha già il massimo di case, torna
--    libera (novità 'casa_libera', metà della spesa al vecchio padrone). Nessun dato viene cancellato.
--  - Il calcolo sta in un trigger sull'esito dell'attacco (w_attacchi_integ), così la risoluzione resta una sola.
-- Richiede la 030. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) regole (le stesse + integrità) ----------
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
    'integ_conquista', 50); $$;

-- ---------- 2) colonne ----------
alter table public.world_buildings add column if not exists integrita int not null default 100;
alter table public.world_buildings add column if not exists caduta_at timestamptz;
alter table public.world_buildings add column if not exists caduta_da uuid;

-- ---------- 3) una casa crollata non si attacca ----------
create or replace function public.w_attacco_no(p_me uuid, p_t jsonb) returns text language plpgsql stable security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); o uuid; last timestamptz;
begin
  if p_t is null then return 'Qui non abita nessuno'; end if;
  o := (p_t->>'owner')::uuid;
  if o = p_me then return 'È casa tua'; end if;
  if public.w_are_allies(p_me, o) or public.w_coinq(p_me, o) then return 'È un tuo alleato: tra alleati non ci si attacca'; end if;
  if public.w_shielded(o) then return 'È appena arrivato: ha lo scudo del nuovo arrivato (15 giorni)'; end if;
  if not (p_t->>'home')::boolean and exists (select 1 from public.world_buildings where building_id = p_t->>'bid' and caduta_at is not null) then
    return 'È già crollata: aspetta che la ripari o che passi a chi l’ha abbattuta'; end if;
  if (p_t->>'home')::boolean and public.w_custodita(o) then return 'È la sua casa vera ed è custodita (ci passa ogni settimana): intoccabile'; end if;
  if public.w_lvl_of(o) < public.w_lvl_of(p_me) - 3 then return 'È molto più debole di te: è protetto'; end if;
  if exists (select 1 from public.world_attacchi where (attaccante = p_me or p_me = any(coalesce(squadra, '{}'))) and bid = p_t->>'bid' and stato = 'viaggio') then
    return 'La tua squadra è già in viaggio verso questa casa'; end if;
  if exists (select 1 from public.world_raduni r join public.world_raduni_membri m on m.raduno_id = r.id where m.user_id = p_me and r.bid = p_t->>'bid' and r.stato = 'raduno') then
    return 'Sei già nel raduno contro questa casa'; end if;
  select max(partenza) into last from public.world_attacchi where (attaccante = p_me or p_me = any(coalesce(squadra, '{}'))) and vittima = o and stato <> 'annullato';
  if last > now() - make_interval(hours => (k->>'coppia_ore')::int) then
    return format('L’hai già attaccato: riprova fra %s ore', ceil(extract(epoch from (last + make_interval(hours => (k->>'coppia_ore')::int) - now())) / 3600)); end if;
  if exists (select 1 from public.world_attacchi where vittima = o and stato = 'risolto' and (esito->>'esito')::int > 0 and impatto > now() - make_interval(hours => (k->>'scudo_ore')::int)) then
    return 'È appena stato saccheggiato: riprova fra qualche ora'; end if;
  if (select count(*) from public.world_attacchi where vittima = o and stato = 'risolto' and (esito->>'esito')::int > 0 and impatto > now() - interval '24 hours') >= (k->>'max_sconfitte')::int then
    return 'Oggi ha già perso troppe volte: lascialo respirare'; end if;
  if (select count(*) from public.world_attacchi where attaccante = p_me and kind = 'pvp' and (partenza at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date)
     + (select count(*) from public.world_raduni_membri m join public.world_raduni r on r.id = m.raduno_id where m.user_id = p_me and r.stato <> 'annullato'
          and (m.joined_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) >= (k->>'max_attacchi')::int then
    return format('Oggi hai già fatto %s attacchi', k->>'max_attacchi'); end if;
  return null;
end $$;

-- ---------- 4) all'esito dell'attacco: integrità e crollo ----------
create or replace function public.w_attacchi_integ() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); e int; meno int; resta int; chi uuid; gia boolean;
begin
  if new.stato <> 'risolto' or old.stato <> 'viaggio' or new.casa_vera then return new; end if;
  e := coalesce((new.esito->>'esito')::int, 0);
  if e <= 0 then return new; end if;
  meno := (k->'integ'->>e)::int;
  chi := coalesce((new.esito->'squadra'->0->>'u')::uuid, new.attaccante);
  select caduta_at is not null into gia from public.world_buildings where building_id = new.bid and owner = new.vittima;
  if gia is null then return new; end if;
  if gia then new.esito := new.esito || jsonb_build_object('integ', 0, 'integrita', 0, 'crollata', true); return new; end if;
  update public.world_buildings set integrita = greatest(0, integrita - meno),
    caduta_at = case when integrita - meno <= 0 then now() else caduta_at end,
    caduta_da = case when integrita - meno <= 0 then chi else caduta_da end
    where building_id = new.bid and owner = new.vittima returning integrita into resta;
  if resta is null then return new; end if;
  new.esito := new.esito || jsonb_build_object('integ', meno, 'integrita', resta, 'crollata', resta <= 0);
  if resta <= 0 then
    perform public.w_feed_add('casa_crollata', chi, new.vittima, new.lat, new.lon, new.bid || '|' || (k->>'caduta_ore'));
  end if;
  return new;
end $$;
drop trigger if exists world_attacchi_integ on public.world_attacchi;
create trigger world_attacchi_integ before update of stato on public.world_attacchi
  for each row execute function public.w_attacchi_integ();

-- ---------- 5) dopo 48 ore: conquista o casa libera ----------
create or replace function public.w_cadute_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); b public.world_buildings; refund int; n int := 0;
begin
  for b in select * from public.world_buildings where caduta_at is not null and caduta_at < now() - make_interval(hours => (k->>'caduta_ore')::int)
           order by caduta_at limit 50 for update skip locked loop
    refund := round(0.5 * (coalesce(b.paid, 0) + coalesce(b.upgrades, 0)));
    if b.owner is not null and refund > 0 then
      update public.world_wallet set mattoni = mattoni + refund where user_id = b.owner;
      insert into public.world_log(user_id, delta, reason, ref, seen) values (b.owner, refund, 'Casa crollata e non riparata: ti torna metà della spesa', b.building_id, false);
    end if;
    if b.caduta_da is not null and b.caduta_da <> coalesce(b.owner, '00000000-0000-0000-0000-000000000000'::uuid)
       and (select count(*) from public.world_buildings x where x.owner = b.caduta_da) < public.w_max(public.w_lvl_of(b.caduta_da)) then
      update public.world_buildings set owner = b.caduta_da, paid = 0, upgrades = 0, bought_at = now(), integrita = (k->>'integ_conquista')::int,
        danno = 0, caduta_at = null, caduta_da = null where building_id = b.building_id;
      perform public.w_feed_add('conquista', b.caduta_da, b.owner, b.lat, b.lon, 'casa');
    else
      update public.world_buildings set owner = null, paid = 0, upgrades = 0, bought_at = null, integrita = 100, danno = 0, caduta_at = null, caduta_da = null
        where building_id = b.building_id;
      if b.owner is not null then perform public.w_feed_add('casa_libera', b.owner, b.owner, b.lat, b.lon, b.building_id); end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- 6) riparare: difese, integrità e crollo ----------
create or replace function public.world_ripara(p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg(); d int; home boolean; b public.world_buildings; v_legno int; v_mat int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_cadute_tick();
  home := coalesce(p_bid, '') = '' or exists (select 1 from public.world_homes where user_id = me and building_id = p_bid);
  if home then
    d := (select danno from public.world_homes where user_id = me);
    if d is null then return json_build_object('ok', false, 'msg', 'Non è casa tua'); end if;
    if d <= 0 then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
    v_legno := d * (k->>'riparo_legno')::int;
    update public.world_wallet w set legno = w.legno - v_legno where w.user_id = me and w.legno >= v_legno;
    if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s', v_legno)); end if;
    update public.world_homes set danno = 0 where user_id = me;
    return json_build_object('ok', true, 'msg', format('🔨 Difese riparate: +%s · 🪵 −%s', d, v_legno));
  end if;
  select * into b from public.world_buildings where building_id = p_bid and owner = me for update;
  if b.building_id is null then return json_build_object('ok', false, 'msg', 'Non è casa tua (o l’hai già persa)'); end if;
  if b.danno <= 0 and b.integrita >= 100 and b.caduta_at is null then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
  v_legno := b.danno * (k->>'riparo_legno')::int + (100 - b.integrita) * (k->>'rip_integ_legno')::int;
  if b.caduta_at is not null then v_mat := (k->>'rip_caduta_mattoni')::int; end if;
  update public.world_wallet w set legno = w.legno - v_legno, mattoni = w.mattoni - v_mat where w.user_id = me and w.legno >= v_legno and w.mattoni >= v_mat;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s%s', v_legno, case when v_mat > 0 then ' e 🧱 ' || v_mat else '' end)); end if;
  if v_mat > 0 then insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -v_mat, 'Casa crollata ricostruita', p_bid, true); end if;
  update public.world_buildings set danno = 0, integrita = 100, caduta_at = null, caduta_da = null where building_id = p_bid;
  return json_build_object('ok', true, 'msg', format('🔨 %s · 🪵 −%s%s', case when b.caduta_at is not null then 'Casa ricostruita: è di nuovo tua al 100%' else 'Casa riparata: integrità 100' end,
    v_legno, case when v_mat > 0 then ' 🧱 −' || v_mat else '' end));
end $$;

-- ---------- 7) le tue case danneggiate e l'integrità di una casa ----------
create or replace function public.world_case_integrita() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg();
begin
  if me is null then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'ora', now(), 'case', coalesce((select json_agg(json_build_object('bid', b.building_id, 'lat', b.lat, 'lon', b.lon, 'level', b.level,
      'integrita', b.integrita, 'danno', b.danno, 'caduta_at', b.caduta_at,
      'scade', b.caduta_at + make_interval(hours => (k->>'caduta_ore')::int), 'chi', public.w_nick(b.caduta_da),
      'legno', b.danno * (k->>'riparo_legno')::int + (100 - b.integrita) * (k->>'rip_integ_legno')::int,
      'mattoni', case when b.caduta_at is not null then (k->>'rip_caduta_mattoni')::int else 0 end) order by b.caduta_at nulls last, b.integrita)
    from public.world_buildings b where b.owner = me and (b.integrita < 100 or b.danno > 0 or b.caduta_at is not null)), '[]'::json));
end $$;

create or replace function public.world_integrita(p_bid text) returns json language sql stable security definer set search_path to 'public' as $$
  select coalesce((select json_build_object('ok', true, 'integrita', integrita, 'crollata', caduta_at is not null) from public.world_buildings where building_id = p_bid and owner is not null),
    json_build_object('ok', false)); $$;

-- ---------- 8) le case crollate non rendono affitto ----------
create or replace function public.world_collect() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; rate int; hrs double precision; amt int;
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  select coalesce(sum(5 + 5*level + public.w_price(lat, lon) / 100),0) into rate from public.world_buildings where owner = me and caduta_at is null;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  amt := floor(rate * hrs / 24.0);
  if amt < 1 then return json_build_object('ok',false,'msg','Ancora niente da riscuotere','rate',rate); end if;
  update public.world_wallet set last_rent = now() where user_id = me;
  perform public.w_pay(me, amt, 'Affitti delle tue case');
  update public.world_log set seen = true where user_id = me and reason = 'Affitti delle tue case' and not seen;
  return json_build_object('ok',true,'got',amt,'rate',rate);
end $$;

revoke all on function public.w_attacchi_integ() from public, anon, authenticated;
revoke all on function public.w_cadute_tick() from public, anon, authenticated;
revoke all on function public.w_attacco_no(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.world_ripara(text) from public, anon;
revoke all on function public.world_case_integrita() from public, anon;
revoke all on function public.world_integrita(text) from public, anon;
grant execute on function public.w_cadute_tick() to service_role;
grant execute on function public.world_ripara(text) to authenticated;
grant execute on function public.world_case_integrita() to authenticated;
grant execute on function public.world_integrita(text) to authenticated;

-- ogni 5 minuti: case crollate e non riparate
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('zsh-cadute') where exists (select 1 from cron.job where jobname = 'zsh-cadute');
    perform cron.schedule('zsh-cadute', '*/5 * * * *', 'select public.w_cadute_tick();');
  end if;
end $$;

-- controllo: deve dire "integrità pronta"
select case when exists (select 1 from pg_proc where proname = 'w_cadute_tick') and exists (select 1 from pg_trigger where tgname = 'world_attacchi_integ')
       then 'integrità pronta' else 'qualcosa manca' end as esito;
