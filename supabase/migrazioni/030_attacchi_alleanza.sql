-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 030 — 🛡️⚔️ ATTACCHI D'ALLEANZA (Fase 37, 17/11)
-- Stesso motore della 028 (w_combat, w_bottino, w_forza_att, w_forza_dif, rinforzi della 029):
--  - RADUNO: un membro sceglie il bersaglio e chiama l'alleanza (world_raduno_crea, 10/20/30 minuti per unirsi,
--    novità 'raduno' a tutti i membri); chi si unisce paga come un attacco (🥫 10 + ⛽ + 1 energia, world_raduno_unisciti);
--    il capo del raduno può partire prima (world_raduno_parti) o annullare (world_raduno_annulla: tutto restituito).
--  - PARTENZA (w_raduni_tick): tutti insieme, il viaggio dura quanto quello del più lontano (w_viaggio_min);
--    il difensore riceve la notifica 'pvp_arrivo' con il nome dell'alleanza e può chiedere rinforzi (029).
--  - FORZA: le forze dei partecipanti, dalla più forte, pesano 1 · 0,6 · 0,4 · 0,25 (la stessa 'calo' dei rinforzi):
--    il numero da solo non basta. Massimo 10 partecipanti.
--  - BOTTINO: diviso in proporzione al contributo di ciascuno (esito.quote).
--  - REGOLA ASSOLUTA: mai contro un membro della propria alleanza, un alleato o un coinquilino: controllato per ogni
--    partecipante quando si unisce, alla partenza e all'impatto (chi non è più in regola esce e riprende il 🥫).
--  - Anti-abuso: le partecipazioni contano come attacchi (5 al giorno, stessa casa 1 volta ogni 12 ore).
-- Richiede la 029. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) regole (le stesse + raduno) ----------
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
    'raduno_max', 10, 'raduno_minuti', jsonb_build_array(10, 20, 30)); $$;

-- ---------- 2) tabelle ----------
create table if not exists public.world_raduni (
  id bigserial primary key,
  alleanza_id bigint not null references public.world_alleanze(id) on delete cascade,
  capo uuid not null references auth.users(id) on delete cascade,
  vittima uuid not null references auth.users(id) on delete cascade,
  bid text not null,
  casa_vera boolean not null,
  lat double precision, lon double precision,
  partenza timestamptz not null,
  stato text not null default 'raduno' check (stato in ('raduno','partito','annullato')),
  attacco_id bigint,
  created_at timestamptz not null default now()
);
create table if not exists public.world_raduni_membri (
  raduno_id bigint not null references public.world_raduni(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  forza numeric not null, mezzo text, km numeric, minuti int not null, cibo int not null, carb int not null,
  joined_at timestamptz not null default now(),
  primary key (raduno_id, user_id)
);
alter table public.world_raduni enable row level security;
alter table public.world_raduni_membri enable row level security;
create index if not exists world_raduni_stato on public.world_raduni(stato, partenza);
create index if not exists world_raduni_membri_user on public.world_raduni_membri(user_id, joined_at desc);
alter table public.world_attacchi add column if not exists squadra uuid[];
alter table public.world_attacchi add column if not exists raduno_id bigint;
alter table public.world_attacchi add column if not exists alleanza_id bigint;

-- ---------- 3) anti-abuso: anche le partecipazioni contano ----------
create or replace function public.w_attacco_no(p_me uuid, p_t jsonb) returns text language plpgsql stable security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); o uuid; last timestamptz;
begin
  if p_t is null then return 'Qui non abita nessuno'; end if;
  o := (p_t->>'owner')::uuid;
  if o = p_me then return 'È casa tua'; end if;
  if public.w_are_allies(p_me, o) or public.w_coinq(p_me, o) then return 'È un tuo alleato: tra alleati non ci si attacca'; end if;
  if public.w_shielded(o) then return 'È appena arrivato: ha lo scudo del nuovo arrivato (15 giorni)'; end if;
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

-- ---------- 4) la forza della squadra (solo chi è ancora in regola) ----------
create or replace function public.w_squadra(p_raduno bigint, p_vittima uuid) returns jsonb language sql stable security definer set search_path to 'public' as $$
  with k as (select public.w_pvp_cfg() as c),
  m as (select user_id, forza, row_number() over (order by forza desc, joined_at) as n from public.world_raduni_membri
        where raduno_id = p_raduno and not public.w_are_allies(user_id, p_vittima) and not public.w_coinq(user_id, p_vittima) and user_id <> p_vittima),
  w as (select m.user_id, m.forza, round(m.forza * (k.c->'calo'->>(least(m.n, 4) - 1)::int)::numeric, 1) as c from m, k)
  select jsonb_build_object('forza', coalesce(round(sum(c), 1), 0),
    'membri', coalesce(jsonb_agg(jsonb_build_object('u', user_id, 'nick', public.w_nick(user_id), 'f', forza, 'c', c) order by c desc), '[]'::jsonb)) from w; $$;

-- perché no a unirsi (null = si può)
create or replace function public.w_raduno_no(p_me uuid, p_raduno bigint) returns text language plpgsql stable security definer set search_path to 'public' as $$
declare r public.world_raduni;
begin
  select * into r from public.world_raduni where id = p_raduno;
  if r.id is null or r.stato <> 'raduno' or r.partenza <= now() then return 'Il raduno è già partito'; end if;
  if not exists (select 1 from public.world_alleanze_membri where alleanza_id = r.alleanza_id and user_id = p_me) then return 'Non sei in questa alleanza'; end if;
  if exists (select 1 from public.world_raduni_membri where raduno_id = r.id and user_id = p_me) then return 'Ci sei già'; end if;
  if (select count(*) from public.world_raduni_membri where raduno_id = r.id) >= (public.w_pvp_cfg()->>'raduno_max')::int then return 'Il raduno è pieno (10)'; end if;
  return public.w_attacco_no(p_me, public.w_bersaglio(null, r.bid));
end $$;

-- entrare nel raduno: paga come un attacco
create or replace function public.w_raduno_entra(p_me uuid, p_raduno bigint) returns json language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); r public.world_raduni; why text; km double precision; mz text; c int; s public.world_superstite; lost boolean;
begin
  select * into r from public.world_raduni where id = p_raduno for update;
  why := public.w_raduno_no(p_me, p_raduno);
  if why is not null then return json_build_object('ok', false, 'msg', why); end if;
  km := public.w_dist_pt(p_me, r.lat, r.lon);
  if km is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo'); end if;
  s := public.w_sup(p_me);
  if s.energia < (k->>'energia')::int then return json_build_object('ok', false, 'msg', 'Serve 1 energia: si ricarica da sola'); end if;
  mz := public.w_mz_eff(p_me, km); c := public.w_mz_carb(mz, km);
  perform public.w_wallet(p_me);
  update public.world_wallet set cibo = cibo - (k->>'costo_cibo')::int, carb = carb - c where user_id = p_me and cibo >= (k->>'costo_cibo')::int and carb >= c;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🥫 %s%s', k->>'costo_cibo', case when c > 0 then ' e ⛽ ' || c else '' end)); end if;
  update public.world_superstite set energia = energia - (k->>'energia')::int,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = p_me;
  lost := public.w_shielded(p_me);
  if lost then update public.world_wallet set caps = jsonb_set(caps, '{scudo_off}', '1') where user_id = p_me; end if;
  insert into public.world_raduni_membri(raduno_id, user_id, forza, mezzo, km, minuti, cibo, carb)
    values (r.id, p_me, public.w_forza_att(p_me, mz), mz, round(km::numeric, 2), public.w_viaggio_min(km), (k->>'costo_cibo')::int, c);
  return json_build_object('ok', true, 'msg', format('⚔️ Sei nel raduno %s: partite fra %s min · 🥫 −%s%s%s', public.w_mz_nome(mz),
    greatest(1, ceil(extract(epoch from r.partenza - now()) / 60)), k->>'costo_cibo', case when c > 0 then ' ⛽ −' || c else '' end,
    case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end));
end $$;

-- ---------- 5) raduno: crea, unisciti, parti, annulla ----------
create or replace function public.world_raduno_crea(p_alleanza bigint, p_user uuid, p_bid text, p_minuti int) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg(); t jsonb; why text; mins int; rid bigint; j json; u uuid; v_nome text;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if not exists (select 1 from public.world_alleanze_membri where alleanza_id = p_alleanza and user_id = me) then return json_build_object('ok', false, 'msg', 'Non sei in questa alleanza'); end if;
  t := public.w_bersaglio(p_user, p_bid); why := public.w_attacco_no(me, t);
  if why is not null then return json_build_object('ok', false, 'msg', why); end if;
  if exists (select 1 from public.world_alleanze_membri where alleanza_id = p_alleanza and user_id = (t->>'owner')::uuid) then
    return json_build_object('ok', false, 'msg', 'È nella tua alleanza: tra alleati non ci si attacca'); end if;
  if exists (select 1 from public.world_raduni where alleanza_id = p_alleanza and bid = t->>'bid' and stato = 'raduno') then
    return json_build_object('ok', false, 'msg', 'La tua alleanza ha già un raduno contro questa casa: unisciti'); end if;
  mins := case when p_minuti in (10, 20, 30) then p_minuti else 20 end;
  insert into public.world_raduni(alleanza_id, capo, vittima, bid, casa_vera, lat, lon, partenza)
    values (p_alleanza, me, (t->>'owner')::uuid, t->>'bid', (t->>'home')::boolean, (t->>'lat')::float, (t->>'lon')::float, now() + make_interval(mins => mins)) returning id into rid;
  j := public.w_raduno_entra(me, rid);
  if not (j->>'ok')::boolean then delete from public.world_raduni where id = rid; return j; end if;
  select al.nome into v_nome from public.world_alleanze al where al.id = p_alleanza;
  for u in select user_id from public.world_alleanze_membri where alleanza_id = p_alleanza and user_id <> me loop
    perform public.w_feed_add('raduno', me, u, null, null, rid || '|' || mins || '|' || public.w_nick((t->>'owner')::uuid) || '|' || coalesce(v_nome, ''));
  end loop;
  return json_build_object('ok', true, 'id', rid, 'minuti', mins,
    'msg', format('📯 Raduno chiamato: i membri di «%s» hanno %s min per unirsi, poi partite insieme', v_nome, mins));
end $$;

create or replace function public.world_raduno_unisciti(p_raduno bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  return public.w_raduno_entra(auth.uid(), p_raduno);
end $$;

create or replace function public.w_raduno_rimborsa(p_raduno bigint, p_carb boolean) returns void language sql security definer set search_path to 'public' as $$
  update public.world_wallet w set cibo = w.cibo + m.cibo, carb = w.carb + case when p_carb then m.carb else 0 end
  from public.world_raduni_membri m where m.raduno_id = p_raduno and w.user_id = m.user_id; $$;

create or replace function public.world_raduno_annulla(p_raduno bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  update public.world_raduni set stato = 'annullato' where id = p_raduno and capo = me and stato = 'raduno';
  if not found then return json_build_object('ok', false, 'msg', 'Solo chi ha chiamato il raduno può annullarlo, prima della partenza'); end if;
  perform public.w_raduno_rimborsa(p_raduno, true);
  return json_build_object('ok', true, 'msg', '✖ Raduno annullato: a tutti abbiamo restituito 🥫 e ⛽');
end $$;

-- partenza: tutti insieme, il viaggio del più lontano
create or replace function public.w_raduni_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare r public.world_raduni; t jsonb; sq jsonb; mins int; km numeric; nid bigint; n int := 0; sqd uuid[]; v_nome text;
begin
  for r in select * from public.world_raduni where stato = 'raduno' and partenza <= now() order by partenza limit 30 for update skip locked loop
    t := public.w_bersaglio(null, r.bid); sq := public.w_squadra(r.id, r.vittima);
    if t is null or (t->>'owner')::uuid <> r.vittima or ((t->>'home')::boolean and public.w_custodita(r.vittima)) or (sq->>'forza')::numeric <= 0 then
      update public.world_raduni set stato = 'annullato' where id = r.id;
      perform public.w_raduno_rimborsa(r.id, true);
      continue;
    end if;
    select array_agg((x->>'u')::uuid) into sqd from jsonb_array_elements(sq->'membri') x;
    select max(m.minuti), min(m.km) into mins, km from public.world_raduni_membri m where m.raduno_id = r.id and m.user_id = any(sqd);
    select al.nome into v_nome from public.world_alleanze al where al.id = r.alleanza_id;
    insert into public.world_attacchi(kind, attaccante, vittima, bid, casa_vera, lat, lon, km, minuti, mezzo, forza, impatto, squadra, raduno_id, alleanza_id)
      values ('alleanza', r.capo, r.vittima, r.bid, r.casa_vera, r.lat, r.lon, km, mins, null, (sq->>'forza')::numeric, now() + make_interval(mins => mins), sqd, r.id, r.alleanza_id)
      returning id into nid;
    update public.world_raduni set stato = 'partito', attacco_id = nid where id = r.id;
    perform public.w_feed_add('pvp_arrivo', r.capo, r.vittima, null, null, nid || '|' || mins || '|' || case when r.casa_vera then 'casa' else 'comprata' end || '|' || coalesce(v_nome, '') || '|' || cardinality(sqd));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.world_raduno_parti(p_raduno bigint) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); a public.world_attacchi;
begin
  update public.world_raduni set partenza = now() where id = p_raduno and capo = me and stato = 'raduno';
  if not found then return json_build_object('ok', false, 'msg', 'Solo chi ha chiamato il raduno può farlo partire'); end if;
  perform public.w_raduni_tick();
  select * into a from public.world_attacchi where raduno_id = p_raduno;
  if a.id is null then return json_build_object('ok', false, 'msg', 'Raduno annullato: il bersaglio non è più attaccabile (scorte restituite)'); end if;
  return json_build_object('ok', true, 'minuti', a.minuti, 'msg', format('🚀 Partiti in %s: arrivate fra %s min', cardinality(a.squadra), a.minuti));
end $$;

-- ---------- 6) risoluzione: singoli e alleanze, rinforzi, quote del bottino ----------
create or replace function public.w_attacchi_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); a public.world_attacchi; t jsonb; dif numeric; rf numeric; att numeric; res jsonb; e int; loot jsonb; dn int; n int := 0; h record;
        sq jsonb; tot numeric; quote jsonb; resto jsonb; q jsonb; x jsonb; r text; v int; bad boolean; u uuid;
begin
  perform public.w_raduni_tick();
  for a in select * from public.world_attacchi where stato = 'viaggio' and impatto <= now() order by impatto limit 50 for update skip locked loop
    t := public.w_bersaglio(null, a.bid);
    if a.kind = 'alleanza' then
      sq := public.w_squadra(a.raduno_id, a.vittima);
      -- chi nel frattempo è diventato alleato della vittima esce e riprende il 🥫
      update public.world_wallet w set cibo = w.cibo + m.cibo from public.world_raduni_membri m
        where m.raduno_id = a.raduno_id and w.user_id = m.user_id and m.user_id = any(a.squadra)
          and not exists (select 1 from jsonb_array_elements(sq->'membri') y where (y->>'u')::uuid = m.user_id);
      att := (sq->>'forza')::numeric; bad := att <= 0;
    else
      att := a.forza; bad := public.w_are_allies(a.attaccante, a.vittima) or public.w_coinq(a.attaccante, a.vittima);
    end if;
    -- regola assoluta e bersaglio ancora valido, controllati anche all'impatto
    if t is null or (t->>'owner')::uuid <> a.vittima or bad or ((t->>'home')::boolean and public.w_custodita(a.vittima)) then
      update public.world_attacchi set stato = 'annullato', esito = jsonb_build_object('msg', 'Attacco annullato: il bersaglio non è più attaccabile') where id = a.id;
      if a.kind = 'alleanza' then
        update public.world_wallet w set cibo = w.cibo + m.cibo from public.world_raduni_membri m
          where m.raduno_id = a.raduno_id and w.user_id = m.user_id and exists (select 1 from jsonb_array_elements(sq->'membri') y where (y->>'u')::uuid = m.user_id);
      else update public.world_wallet set cibo = cibo + (k->>'costo_cibo')::int where user_id = a.attaccante; end if;
      update public.world_wallet w set cibo = cibo + (k->>'rinf_cibo')::int from public.world_attacchi_rinforzi rr where rr.attacco_id = a.id and w.user_id = rr.helper;
      continue;
    end if;
    rf := public.w_rinf_tot(a.id, a.impatto);
    dif := public.w_forza_dif(a.vittima, a.bid) + rf;
    res := public.w_combat(att, dif, 'pvp' || a.id); e := (res->>'esito')::int;
    loot := public.w_bottino(a.vittima, e);
    quote := '{}'::jsonb;
    if e > 0 then
      if a.kind = 'alleanza' then
        -- il bottino diviso secondo il contributo; il resto delle divisioni va al primo
        tot := greatest(0.1, (select sum((y->>'c')::numeric) from jsonb_array_elements(sq->'membri') y)); resto := loot;
        for x in select * from jsonb_array_elements(sq->'membri') loop
          q := '{}'::jsonb;
          foreach r in array array['legno','cibo','carb','mattoni'] loop
            v := floor((loot->>r)::int * (x->>'c')::numeric / tot)::int; q := q || jsonb_build_object(r, v);
            resto := jsonb_set(resto, array[r], to_jsonb((resto->>r)::int - v));
          end loop;
          quote := quote || jsonb_build_object(x->>'u', q);
        end loop;
        x := sq->'membri'->0;
        quote := jsonb_set(quote, array[x->>'u'], (select jsonb_object_agg(kk, (quote->(x->>'u')->>kk)::int + (resto->>kk)::int) from unnest(array['legno','cibo','carb','mattoni']) kk));
      else
        quote := jsonb_build_object(a.attaccante::text, loot);
      end if;
      for u in select (jsonb_object_keys(quote))::uuid loop
        q := quote->(u::text);
        perform public.w_wallet(u);
        update public.world_wallet set legno = legno + (q->>'legno')::int, cibo = cibo + (q->>'cibo')::int, carb = carb + (q->>'carb')::int,
          mattoni = mattoni + (q->>'mattoni')::int where user_id = u;
        if (q->>'mattoni')::int > 0 then insert into public.world_log(user_id, delta, reason, seen) values (u, (q->>'mattoni')::int, 'Bottino di un attacco', false); end if;
      end loop;
      dn := (k->'danni'->>e)::int;
      if a.casa_vera then update public.world_homes set danno = least((k->>'danni_max')::int, danno + dn) where user_id = a.vittima;
      else update public.world_buildings set danno = least((k->>'danni_max')::int, danno + dn) where building_id = a.bid; end if;
    else
      dn := 0;
      for h in select helper from public.world_attacchi_rinforzi where attacco_id = a.id and arrivo <= a.impatto loop
        perform public.w_wallet(h.helper);
        update public.world_wallet set cibo = cibo + (k->>'rinf_premio_cibo')::int where user_id = h.helper;
        perform public.w_xp(h.helper, (k->>'rinf_xp')::int);
        perform public.w_feed_add('pvp_difeso', a.vittima, h.helper, null, null, a.id || '|' || public.w_nick(a.attaccante));
      end loop;
    end if;
    update public.world_attacchi set stato = 'risolto', esito = res || jsonb_build_object('att', att, 'dif', dif, 'rinf', rf,
      'rinf_n', (select count(*) from public.world_attacchi_rinforzi where attacco_id = a.id and arrivo <= a.impatto), 'loot', loot, 'danno', dn, 'quote', quote,
      'squadra', case when a.kind = 'alleanza' then sq->'membri' end) where id = a.id;
    if a.kind = 'alleanza' then
      for x in select * from jsonb_array_elements(sq->'membri') loop
        perform public.w_feed_add('pvp_esito', (x->>'u')::uuid, a.vittima, null, null, a.id || '|' || e || '|' || 'dif');
      end loop;
    else
      perform public.w_feed_add('pvp_esito', a.attaccante, a.vittima, null, null, a.id || '|' || e || '|' || 'dif');
    end if;
    perform public.w_feed_add('pvp_esito', a.vittima, a.attaccante, null, null, a.id || '|' || e || '|' || 'att');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- 7) anteprima: le tue alleanze per il raduno ----------
create or replace function public.world_attacco_info(p_user uuid, p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); t jsonb; why text; km double precision; mz text; att numeric; dif numeric; s public.world_superstite; r jsonb;
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
    'combattente', public.w_ab(s.abil, 'combattente'),
    'alleanze', coalesce((select json_agg(json_build_object('id', al.id, 'nome', al.nome, 'emblema', al.emblema,
        'membri', (select count(*) from public.world_alleanze_membri x where x.alleanza_id = al.id),
        'raduno', (select rd.id from public.world_raduni rd where rd.alleanza_id = al.id and rd.bid = t->>'bid' and rd.stato = 'raduno' limit 1)) order by m.dal)
      from public.world_alleanze_membri m join public.world_alleanze al on al.id = m.alleanza_id
      where m.user_id = me and not exists (select 1 from public.world_alleanze_membri v where v.alleanza_id = al.id and v.user_id = (t->>'owner')::uuid)), '[]'::json));
end $$;

-- ---------- 8) Io: raduni, squadre, quote ----------
create or replace function public.world_attacchi_miei() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_attacchi_tick();
  return json_build_object('ok', true, 'ora', now(),
    'in_arrivo', coalesce((select json_agg(json_build_object('id', a.id, 'da', public.w_nick(a.attaccante), 'da_id', a.attaccante, 'bid', a.bid, 'casa_vera', a.casa_vera,
        'impatto', a.impatto, 'minuti', a.minuti, 'km', a.km, 'chiesto', a.chiesto is not null, 'rinf', public.w_rinf_tot(a.id, a.impatto),
        'alleanza', (select al.emblema || ' ' || al.nome from public.world_alleanze al where al.id = a.alleanza_id), 'n', cardinality(a.squadra),
        'rinforzi', coalesce((select json_agg(json_build_object('nick', public.w_nick(r.helper), 'arrivo', r.arrivo, 'in_tempo', r.arrivo <= a.impatto) order by r.arrivo)
                              from public.world_attacchi_rinforzi r where r.attacco_id = a.id), '[]'::json)) order by a.impatto)
      from public.world_attacchi a where a.vittima = me and a.stato = 'viaggio'), '[]'::json),
    'in_viaggio', coalesce((select json_agg(json_build_object('id', a.id, 'contro', public.w_nick(a.vittima), 'contro_id', a.vittima, 'bid', a.bid, 'casa_vera', a.casa_vera,
        'impatto', a.impatto, 'minuti', a.minuti, 'forza', a.forza, 'n', cardinality(a.squadra),
        'alleanza', (select al.emblema || ' ' || al.nome from public.world_alleanze al where al.id = a.alleanza_id)) order by a.impatto)
      from public.world_attacchi a where (a.attaccante = me or me = any(coalesce(a.squadra, '{}'))) and a.stato = 'viaggio'), '[]'::json),
    'raduni', coalesce((select json_agg(z.x order by z.p) from (
        select json_build_object('id', r.id, 'alleanza', al.emblema || ' ' || al.nome, 'capo', public.w_nick(r.capo), 'io_capo', r.capo = me,
          'contro', public.w_nick(r.vittima), 'contro_id', r.vittima, 'casa_vera', r.casa_vera, 'partenza', r.partenza,
          'n', (select count(*) from public.world_raduni_membri x where x.raduno_id = r.id), 'max', (public.w_pvp_cfg()->>'raduno_max')::int,
          'forza', (public.w_squadra(r.id, r.vittima)->>'forza')::numeric,
          'membri', (select coalesce(json_agg(public.w_nick(x.user_id) order by x.joined_at), '[]'::json) from public.world_raduni_membri x where x.raduno_id = r.id),
          'ci_sono', exists (select 1 from public.world_raduni_membri x where x.raduno_id = r.id and x.user_id = me),
          'no', public.w_raduno_no(me, r.id),
          'minuti', public.w_viaggio_min(public.w_dist_pt(me, r.lat, r.lon)),
          'costo', json_build_object('cibo', (public.w_pvp_cfg()->>'costo_cibo')::int,
                     'carb', public.w_mz_carb(public.w_mz_eff(me, public.w_dist_pt(me, r.lat, r.lon)), public.w_dist_pt(me, r.lat, r.lon)))) as x, r.partenza as p
        from public.world_raduni r join public.world_alleanze al on al.id = r.alleanza_id
        where r.stato = 'raduno' and r.partenza > now() and exists (select 1 from public.world_alleanze_membri m where m.alleanza_id = r.alleanza_id and m.user_id = me)
        order by r.partenza limit 10) z), '[]'::json),
    'alleati', coalesce((select json_agg(z.x order by z.imp) from (
        select json_build_object('id', a.id, 'chi', public.w_nick(a.vittima), 'chi_id', a.vittima, 'da', public.w_nick(a.attaccante), 'casa_vera', a.casa_vera,
          'impatto', a.impatto, 'km', round(d::numeric, 1), 'minuti', public.w_viaggio_min(d),
          'in_tempo', d is not null and now() + make_interval(mins => public.w_viaggio_min(d)) <= a.impatto,
          'partito', r.arrivo is not null, 'arrivo', r.arrivo, 'chiesto', a.chiesto is not null) as x, a.impatto as imp
        from public.world_attacchi a
        cross join lateral (select public.w_dist_pt(me, a.lat, a.lon) as d) dd
        left join public.world_attacchi_rinforzi r on r.attacco_id = a.id and r.helper = me
        where a.stato = 'viaggio' and a.impatto > now() and a.vittima <> me and a.attaccante <> me and not (me = any(coalesce(a.squadra, '{}')))
          and a.vittima in (select public.w_allies_of(me))
          and not public.w_are_allies(me, a.attaccante) and not public.w_coinq(me, a.attaccante)
        order by a.impatto limit 10) z), '[]'::json),
    'storico', coalesce((select json_agg(z.x order by z.quando desc) from (
        select json_build_object('id', a.id, 'io', case when a.vittima = me then 'dif' else 'att' end,
          'altro', case when a.vittima = me then public.w_nick(a.attaccante) else public.w_nick(a.vittima) end,
          'altro_id', case when a.vittima = me then a.attaccante else a.vittima end, 'casa_vera', a.casa_vera, 'stato', a.stato,
          'esito', a.esito, 'quando', a.impatto, 'mia', a.esito->'quote'->(me::text),
          'alleanza', (select al.emblema || ' ' || al.nome from public.world_alleanze al where al.id = a.alleanza_id)) as x, a.impatto as quando
        from public.world_attacchi a where (a.attaccante = me or a.vittima = me or me = any(coalesce(a.squadra, '{}'))) and a.stato <> 'viaggio'
        order by a.impatto desc limit 20) z(x, quando)), '[]'::json),
    'danno_casa', coalesce((select danno from public.world_homes where user_id = me), 0),
    'danni', coalesce((select json_agg(json_build_object('bid', building_id, 'danno', danno)) from public.world_buildings where owner = me and danno > 0), '[]'::json));
end $$;

revoke all on function public.w_squadra(bigint, uuid) from public, anon, authenticated;
revoke all on function public.w_raduno_no(uuid, bigint) from public, anon, authenticated;
revoke all on function public.w_raduno_entra(uuid, bigint) from public, anon, authenticated;
revoke all on function public.w_raduno_rimborsa(bigint, boolean) from public, anon, authenticated;
revoke all on function public.w_raduni_tick() from public, anon, authenticated;
revoke all on function public.w_attacco_no(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.w_attacchi_tick() from public, anon;
revoke all on function public.world_raduno_crea(bigint, uuid, text, int) from public, anon;
revoke all on function public.world_raduno_unisciti(bigint) from public, anon;
revoke all on function public.world_raduno_parti(bigint) from public, anon;
revoke all on function public.world_raduno_annulla(bigint) from public, anon;
revoke all on function public.world_attacco_info(uuid, text) from public, anon;
revoke all on function public.world_attacchi_miei() from public, anon;
grant execute on function public.w_attacchi_tick() to service_role;
grant execute on function public.w_raduni_tick() to service_role;
grant execute on function public.world_raduno_crea(bigint, uuid, text, int) to authenticated;
grant execute on function public.world_raduno_unisciti(bigint) to authenticated;
grant execute on function public.world_raduno_parti(bigint) to authenticated;
grant execute on function public.world_raduno_annulla(bigint) to authenticated;
grant execute on function public.world_attacco_info(uuid, text) to authenticated;
grant execute on function public.world_attacchi_miei() to authenticated;

-- controllo: deve dire "alleanze all'attacco"
select case when exists (select 1 from pg_proc where proname = 'world_raduno_crea') and exists (select 1 from pg_proc where proname = 'w_squadra')
       then 'alleanze all''attacco' else 'qualcosa manca' end as esito;
