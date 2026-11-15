-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 022 — ⚡ EVENTI DAL VIVO e 🏆 SFIDA DEL QUARTIERE (scelte di Alessandro, 15/11)
-- 1) Eventi dal vivo: ogni zona con giocatori attivi (celle di ~5 km) riceve un evento a tempo vicino alle case,
--    al massimo uno alla volta e uno nuovo ogni 40 minuti circa (li crea il giro di zsh-push, w_eventi_tick):
--      📦 cassa    (30 min) rifornimento caduto: i primi 3 che ci mandano il superstite prendono 24 / 14 / 8 di ogni scorta;
--      🚑 salva    (30 min) superstite ferito: il primo che porta 🥫 5 prende ⭐ 50, 🧱 20 e ⛽ 10;
--      🧟 nido     (60 min) nido di zombie: si abbatte insieme (ognuno fino a 3 colpi da ⚡ 1); quando cade, premi
--                  a tutti in base ai colpi e 🧱 15 a chi dà il colpo finale;
--      ⭐ sponsor  (45 min) attività sponsor sotto assedio: come il nido, e conta come visita per lo sponsor.
--    Si partecipa col superstite: l'evento deve stare nel suo raggio da una tua casa (⚡ 1 a mossa).
--    Notifica a chi ha una casa entro 3 km (al massimo una ogni 2 ore).
-- 2) 🏆 Sfida del quartiere: ogni settimana (da lunedì) punti = zombie abbattuti × 2 + spedizioni × 5 + eventi × 10;
--    la classifica è con chi abita entro 10 km; il lunedì dopo i primi 3 di ogni quartiere ricevono 🧱 150 / 100 / 50.
-- Richiede le migrazioni 020 e 021. Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_eventi (
  id bigserial primary key,
  kind text not null check (kind in ('cassa','salva','nido','sponsor')),
  nome text not null,
  lat double precision not null,
  lon double precision not null,
  cella text not null,
  start_at timestamptz not null default now(),
  end_at timestamptz not null,
  hp int not null default 0,
  hp_max int not null default 0,
  posti int not null default 1,
  sponsor_id uuid,
  stato text not null default 'attivo' check (stato in ('attivo','finito'))
);
alter table public.world_eventi enable row level security;
create index if not exists world_eventi_attivi on public.world_eventi(stato, end_at);
create index if not exists world_eventi_cella on public.world_eventi(cella, start_at desc);

create table if not exists public.world_eventi_azioni (
  evento_id bigint not null references public.world_eventi(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  colpi int not null default 0,
  danno int not null default 0,
  posto int,
  premio jsonb,
  at timestamptz not null default now(),
  primary key (evento_id, user_id)
);
alter table public.world_eventi_azioni enable row level security;

create table if not exists public.world_sfide_premi (
  settimana date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  posto int not null,
  punti int not null,
  mattoni int not null,
  primary key (settimana, user_id)
);
alter table public.world_sfide_premi enable row level security;
create table if not exists public.world_sfide_fatte (settimana date primary key, fatto_at timestamptz not null default now());
alter table public.world_sfide_fatte enable row level security;

create or replace function public.w_cella(p_lat double precision, p_lon double precision) returns text language sql immutable as $$
  select floor(p_lat / 0.05)::int || ':' || floor(p_lon / 0.07)::int; $$;

-- ---------- il giro: chiude gli eventi scaduti e ne crea di nuovi dove ci sono giocatori ----------
create or replace function public.w_eventi_tick() returns int
language plpgsql security definer set search_path = public as $$
declare c record; h record; sp record; k text; r numeric; t numeric; la double precision; lo double precision; nid bigint; nuovi int := 0; att int; dur int; nm text;
begin
  update public.world_eventi set stato = 'finito' where stato = 'attivo' and end_at <= now();
  for c in
    select public.w_cella(hm.lat, hm.lon) as cella, count(*) as n
    from public.world_homes hm join public.profili_pubblici p on p.user_id = hm.user_id
    where p.seen_at > now() - interval '3 days'
    group by 1 order by random() limit 200
  loop
    continue when exists (select 1 from public.world_eventi e where e.cella = c.cella and (e.stato = 'attivo' or e.start_at > now() - interval '40 minutes'));
    select hm.lat, hm.lon into h from public.world_homes hm join public.profili_pubblici p on p.user_id = hm.user_id
      where p.seen_at > now() - interval '3 days' and public.w_cella(hm.lat, hm.lon) = c.cella order by random() limit 1;
    continue when h.lat is null;
    r := random();
    select s.id, s.name, s.lat, s.lon into sp from public.sponsors s
      where s.active and s.lat is not null and public.w_km(h.lat, h.lon, s.lat, s.lon) < 3 order by random() limit 1;
    k := case when sp.id is not null and r < 0.15 then 'sponsor' when r < 0.45 then 'cassa' when r < 0.7 then 'salva' else 'nido' end;
    if k = 'sponsor' then la := sp.lat; lo := sp.lon;
    else
      t := random() * 2 * pi(); r := 0.3 + random() * 1.2;
      la := h.lat + r * cos(t) / 111.0; lo := h.lon + r * sin(t) / (111.0 * cos(radians(h.lat)));
    end if;
    dur := case k when 'nido' then 60 when 'sponsor' then 45 else 30 end;
    att := least(80, 20 + 10 * c.n::int);
    nm := case k when 'cassa' then '📦 Rifornimento caduto' when 'salva' then '🚑 Superstite ferito' when 'nido' then '🧟 Nido di zombie' else '⭐ ' || left(sp.name, 40) || ' sotto assedio' end;
    insert into public.world_eventi(kind, nome, lat, lon, cella, end_at, hp, hp_max, posti, sponsor_id)
      values (k, nm, la, lo, c.cella, now() + make_interval(mins => dur),
              case when k in ('nido','sponsor') then att else 0 end, case when k in ('nido','sponsor') then att else 0 end,
              case k when 'cassa' then 3 else 1 end, case when k = 'sponsor' then sp.id end)
      returning id into nid;
    nuovi := nuovi + 1;
    -- avviso a chi ha una casa entro 3 km (al massimo uno ogni 2 ore)
    insert into public.world_feed(kind, actor, target, info)
      select distinct 'evento', null::uuid, hm.user_id, k || '|' || nid from public.world_homes hm
      where public.w_km(la, lo, hm.lat, hm.lon) < 3
        and not exists (select 1 from public.world_feed f where f.target = hm.user_id and f.kind = 'evento' and f.created_at > now() - interval '2 hours');
  end loop;
  return nuovi;
end $$;

-- ---------- eventi che puoi raggiungere ----------
create or replace function public.world_eventi_vicini() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s public.world_superstite;
begin
  if me is null then return '[]'::json; end if;
  s := public.w_sup(me);
  return (select coalesce(json_agg(x order by x.km), '[]'::json) from (
    select e.id, e.kind, e.nome, e.lat, e.lon, e.end_at, e.hp, e.hp_max, e.posti,
      public.w_sped_km(me, e.lat, e.lon) as km, public.w_sup_raggio(s.xp, s.abil) as raggio,
      (select count(*) from public.world_eventi_azioni a where a.evento_id = e.id) as gente,
      (select row_to_json(a) from public.world_eventi_azioni a where a.evento_id = e.id and a.user_id = me) as mio
    from public.world_eventi e
    where e.stato = 'attivo' and e.end_at > now() and public.w_sped_km(me, e.lat, e.lon) <= 30) x);
end $$;

-- ---------- la mossa del superstite su un evento ----------
create or replace function public.world_evento_azione(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); e public.world_eventi; s public.world_superstite; w public.world_wallet; a public.world_eventi_azioni;
  km numeric; n int; q int; xp int; d int; g int; got json; mt int := 0; p record; tot int; fin boolean := false;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into e from public.world_eventi where id = p_id for update;
  if e.id is null or e.stato <> 'attivo' or e.end_at <= now() then return json_build_object('ok', false, 'msg', 'L’evento è finito'); end if;
  s := public.w_sup(me); w := public.w_wallet(me); g := public.w_grado(s.xp);
  km := public.w_sped_km(me, e.lat, e.lon);
  if km is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo'); end if;
  if km > public.w_sup_raggio(s.xp, s.abil) then
    return json_build_object('ok', false, 'msg', format('È a %s km: il raggio del tuo superstite è %s km', km, public.w_sup_raggio(s.xp, s.abil)));
  end if;
  select * into a from public.world_eventi_azioni where evento_id = e.id and user_id = me;
  if e.kind in ('cassa','salva') and a.user_id is not null then return json_build_object('ok', false, 'msg', 'Ci sei già andato'); end if;
  if e.kind in ('nido','sponsor') and coalesce(a.colpi, 0) >= 3 then return json_build_object('ok', false, 'msg', 'Hai già dato 3 colpi: lascia spazio agli altri'); end if;
  if e.kind = 'salva' and w.cibo < 5 then return json_build_object('ok', false, 'msg', 'Servono 🥫 5 per curarlo'); end if;
  if e.kind = 'cassa' and (select count(*) from public.world_eventi_azioni where evento_id = e.id) >= e.posti then
    update public.world_eventi set stato = 'finito' where id = e.id; return json_build_object('ok', false, 'msg', 'Arrivato tardi: la cassa è vuota');
  end if;
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve ⚡ 1: si ricarica una ogni %s min', public.w_en_ric(s.abil))); end if;
  update public.world_superstite set energia = energia - 1,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;

  if e.kind = 'cassa' then
    n := (select count(*) from public.world_eventi_azioni where evento_id = e.id);
    if n >= e.posti then update public.world_eventi set stato = 'finito' where id = e.id; return json_build_object('ok', false, 'msg', 'Arrivato tardi: la cassa è vuota'); end if;
    q := case n when 0 then 24 when 1 then 14 else 8 end; xp := case n when 0 then 30 when 1 then 20 else 10 end;
    got := public.w_res(me, q, q, q); perform public.w_xp(me, xp);
    insert into public.world_eventi_azioni(evento_id, user_id, colpi, posto, premio) values (e.id, me, 1, n + 1, jsonb_build_object('legno', q, 'cibo', q, 'carb', q, 'xp', xp));
    if n + 1 >= e.posti then update public.world_eventi set stato = 'finito' where id = e.id; end if;
    return json_build_object('ok', true, 'kind', e.kind, 'posto', n + 1, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
      'msg', format('📦 Sei arrivato %s°: hai preso la tua parte', n + 1));
  elsif e.kind = 'salva' then
    update public.world_wallet set cibo = cibo - 5 where user_id = me;
    perform public.w_xp(me, 50); perform public.w_pay(me, 20, 'Evento: superstite salvato'); got := public.w_res(me, 0, 0, 10);
    insert into public.world_eventi_azioni(evento_id, user_id, colpi, posto, premio) values (e.id, me, 1, 1, '{"xp":50,"mattoni":20,"carb":10}'::jsonb);
    update public.world_eventi set stato = 'finito' where id = e.id;
    return json_build_object('ok', true, 'kind', e.kind, 'xp', 50, 'mattoni', 20, 'carb', (got->>'carb')::int, 'msg', '🚑 L’hai salvato! Ti ringrazia con quello che aveva');
  end if;

  -- nido e sponsor: si abbatte insieme
  d := 5 + g / 2 + 2 * public.w_ab(s.abil, 'combattente') + 2 * public.w_eq(s.equip, 'arma');
  insert into public.world_eventi_azioni(evento_id, user_id, colpi, danno) values (e.id, me, 1, d)
    on conflict (evento_id, user_id) do update set colpi = public.world_eventi_azioni.colpi + 1, danno = public.world_eventi_azioni.danno + d, at = now();
  update public.world_eventi set hp = greatest(0, hp - d) where id = e.id returning * into e;
  perform public.w_xp(me, 5);
  if e.kind = 'sponsor' and e.sponsor_id is not null then
    begin insert into public.sponsor_events(sponsor_id, kind) values (e.sponsor_id, 'spedizione'); exception when others then null; end;
  end if;
  if e.hp <= 0 then
    fin := true;
    update public.world_eventi set stato = 'finito' where id = e.id;
    tot := greatest(1, (select sum(danno) from public.world_eventi_azioni where evento_id = e.id));
    for p in select * from public.world_eventi_azioni where evento_id = e.id loop
      q := 10 + round(40.0 * p.danno / tot);
      perform public.w_res(p.user_id, q, q, q / 2); perform public.w_xp(p.user_id, 20 + p.danno);
      update public.world_eventi_azioni set premio = jsonb_build_object('legno', q, 'cibo', q, 'carb', q / 2, 'xp', 20 + p.danno) where evento_id = e.id and user_id = p.user_id;
      if p.user_id <> me then insert into public.world_feed(kind, actor, target, info) values ('evento_vinto', me, p.user_id, e.nome); end if;
    end loop;
    mt := 15; perform public.w_pay(me, 15, 'Evento: colpo finale');
  end if;
  return json_build_object('ok', true, 'kind', e.kind, 'danno', d, 'hp', e.hp, 'hp_max', e.hp_max, 'finito', fin, 'mattoni', mt,
    'msg', case when fin then '💥 Abbattuto! Premi a tutti quelli che hanno colpito, e 🧱 15 a te per il colpo finale' else format('💥 −%s: ne restano %s', d, e.hp) end);
end $$;

-- ---------- 🏆 sfida del quartiere ----------
create or replace function public.w_sfida_punti(p_user uuid, p_da timestamptz, p_a timestamptz) returns int
language sql stable security definer set search_path = public as $$
  select (coalesce((select sum(uccisi) from public.world_cacce where user_id = p_user and start_at >= p_da and start_at < p_a and uccisi is not null), 0) * 2
        + (select count(*) from public.world_spedizioni where user_id = p_user and stato = 'raccolta' and end_at >= p_da and end_at < p_a) * 5
        + (select count(*) from public.world_eventi_azioni where user_id = p_user and at >= p_da and at < p_a) * 10)::int; $$;

create or replace function public.w_settimana(p_t timestamptz) returns timestamptz language sql stable as $$
  select (date_trunc('week', p_t at time zone 'Europe/Rome')) at time zone 'Europe/Rome'; $$;

create or replace function public.world_sfida_quartiere() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h record; da timestamptz := public.w_settimana(now()); a timestamptz := public.w_settimana(now()) + interval '7 days';
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select lat, lon into h from public.world_homes where user_id = me;
  if h.lat is null then select lat, lon into h from public.world_buildings where owner = me limit 1; end if;
  if h.lat is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo per entrare nella sfida del quartiere'); end if;
  return (with v as (
      select hm.user_id, public.w_sfida_punti(hm.user_id, da, a) as punti from public.world_homes hm
      where public.w_km(h.lat, h.lon, hm.lat, hm.lon) <= 10),
    r as (select user_id, punti, rank() over (order by punti desc) as pos from v)
    select json_build_object('ok', true, 'fine', a, 'premi', json_build_array(150, 100, 50),
      'io', (select json_build_object('punti', punti, 'pos', pos) from r where user_id = me),
      'tot', (select count(*) from r),
      'top', (select coalesce(json_agg(json_build_object('user_id', user_id, 'nick', public.w_nick(user_id), 'punti', punti, 'pos', pos, 'io', user_id = me) order by pos, punti desc), '[]'::json)
              from (select * from r where punti > 0 or user_id = me order by pos limit 20) z),
      'ultimo', (select json_build_object('posto', posto, 'mattoni', mattoni) from public.world_sfide_premi where user_id = me and settimana = (da - interval '7 days')::date)));
end $$;

-- il lunedì: premi della settimana prima ai primi 3 di ogni quartiere (una volta sola)
create or replace function public.w_sfida_premi() returns int
language plpgsql security definer set search_path = public as $$
declare da timestamptz := public.w_settimana(now()) - interval '7 days'; a timestamptz := public.w_settimana(now()); u record; pos int; n int := 0; m int;
begin
  if exists (select 1 from public.world_sfide_fatte where settimana = da::date) then return 0; end if;
  insert into public.world_sfide_fatte(settimana) values (da::date);
  for u in select hm.user_id, hm.lat, hm.lon, public.w_sfida_punti(hm.user_id, da, a) as punti from public.world_homes hm loop
    continue when u.punti <= 0;
    select 1 + count(*) into pos from public.world_homes o
      where o.user_id <> u.user_id and public.w_km(u.lat, u.lon, o.lat, o.lon) <= 10 and public.w_sfida_punti(o.user_id, da, a) > u.punti;
    continue when pos > 3;
    m := case pos when 1 then 150 when 2 then 100 else 50 end;
    insert into public.world_sfide_premi(settimana, user_id, posto, punti, mattoni) values (da::date, u.user_id, pos, u.punti, m) on conflict do nothing;
    perform public.w_pay(u.user_id, m, 'Sfida del quartiere: ' || pos || '° posto');
    insert into public.world_feed(kind, actor, target, info) values ('sfida_vinta', null, u.user_id, pos::text);
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.w_eventi_tick() from public, anon, authenticated;
revoke all on function public.w_sfida_premi() from public, anon, authenticated;
revoke all on function public.w_sfida_punti(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.w_eventi_tick() to service_role;
grant execute on function public.w_sfida_premi() to service_role;
revoke all on function public.world_eventi_vicini() from public, anon;
revoke all on function public.world_evento_azione(bigint) from public, anon;
revoke all on function public.world_sfida_quartiere() from public, anon;
grant execute on function public.world_eventi_vicini() to authenticated;
grant execute on function public.world_evento_azione(bigint) to authenticated;
grant execute on function public.world_sfida_quartiere() to authenticated;

-- subito i primi eventi dove ci sono giocatori
select public.w_eventi_tick() as eventi_creati;

-- controllo: deve dire "eventi pronti"
select case when exists (select 1 from pg_proc where proname = 'world_evento_azione') and exists (select 1 from pg_proc where proname = 'world_sfida_quartiere')
       then 'eventi pronti' else 'qualcosa manca' end as esito;
