-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 019 — PIÙ ALLEANZE, una per zona (scelta di Alessandro, 15/11)
-- Si può stare in più alleanze (massimo 3), ma ognuna in una zona diversa:
--  - ogni iscrizione è legata a una tua casa ("casa dell'alleanza"): quella entro 50 km da un membro;
--  - la casa di una nuova alleanza deve stare a PIÙ DI 50 KM dalle case dei membri delle tue altre alleanze
--    (così nella stessa zona si sta con un gruppo solo: niente doppio gioco).
-- I membri di ogni alleanza sono tuoi alleati, ma non diventano alleati dei membri delle altre.
-- Ogni alleanza ha la sua chat; in classifica ognuno porta i suoi punti a ciascuna delle sue alleanze.
-- Richiede la migrazione 018. Si può eseguire più volte.
-- =====================================================================

alter table public.world_alleanze_membri add column if not exists lat double precision;
alter table public.world_alleanze_membri add column if not exists lon double precision;
-- casa dell'alleanza per chi è già dentro: la casa vera (o la prima comprata)
update public.world_alleanze_membri m set lat = coalesce((select h.lat from public.world_homes h where h.user_id = m.user_id), (select b.lat from public.world_buildings b where b.owner = m.user_id order by b.bought_at limit 1)),
  lon = coalesce((select h.lon from public.world_homes h where h.user_id = m.user_id), (select b.lon from public.world_buildings b where b.owner = m.user_id order by b.bought_at limit 1))
  where m.lat is null;
alter table public.world_alleanze_membri drop constraint if exists world_alleanze_membri_pkey;
alter table public.world_alleanze_membri add primary key (user_id, alleanza_id);
create index if not exists world_alleanze_membri_u on public.world_alleanze_membri(user_id);

-- la prima delle mie alleanze (per le funzioni vecchie)
create or replace function public.w_alleanza_di(p_user uuid) returns bigint
  language sql stable security definer set search_path to 'public' as $$
  select alleanza_id from public.world_alleanze_membri where user_id = p_user order by dal limit 1; $$;
create or replace function public.w_in_alleanza(p_user uuid, p_aid bigint) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.world_alleanze_membri where user_id = p_user and alleanza_id = p_aid); $$;
-- distanza da un punto alla casa dell'alleanza più vicina tra i membri di un'alleanza
create or replace function public.w_dist_alleanza(p_aid bigint, p_lat double precision, p_lon double precision) returns double precision
  language sql stable security definer set search_path to 'public' as $$
  select min(public.w_km(m.lat, m.lon, p_lat, p_lon)) from public.world_alleanze_membri m where m.alleanza_id = p_aid and m.lat is not null; $$;
-- una casa va bene per una nuova alleanza se è a più di 50 km dalle case dei membri delle mie altre alleanze
create or replace function public.w_zona_libera(p_user uuid, p_lat double precision, p_lon double precision, p_aid bigint) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select not exists (select 1 from public.world_alleanze_membri mine where mine.user_id = p_user and mine.alleanza_id is distinct from p_aid
                     and coalesce(public.w_dist_alleanza(mine.alleanza_id, p_lat, p_lon), 999) <= 50); $$;
-- la mia casa con cui entrare in un'alleanza: entro 50 km da un membro e in una zona libera (la più vicina)
create or replace function public.w_ancora(p_user uuid, p_aid bigint) returns table(lat double precision, lon double precision)
  language sql stable security definer set search_path to 'public' as $$
  select c.lat, c.lon from (select h.lat, h.lon from public.world_homes h where h.user_id = p_user union all select b.lat, b.lon from public.world_buildings b where b.owner = p_user) c
  where coalesce(public.w_dist_alleanza(p_aid, c.lat, c.lon), 999) <= 50 and public.w_zona_libera(p_user, c.lat, c.lon, p_aid)
  order by public.w_dist_alleanza(p_aid, c.lat, c.lon) limit 1; $$;
create or replace function public.w_vicino_alleanza(p_user uuid, p_aid bigint) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.w_ancora(p_user, p_aid)); $$;
-- perché non può entrare (per i messaggi)
create or replace function public.w_perche_no(p_user uuid, p_aid bigint) returns text
  language sql stable security definer set search_path to 'public' as $$
  select case
    when public.w_in_alleanza(p_user, p_aid) then 'È già in questa alleanza'
    when (select count(*) from public.world_alleanze_membri where user_id = p_user) >= 3 then 'Ha già 3 alleanze (il massimo)'
    when not exists (select 1 from (select h.lat, h.lon from public.world_homes h where h.user_id = p_user union all select b.lat, b.lon from public.world_buildings b where b.owner = p_user) c
                     where coalesce(public.w_dist_alleanza(p_aid, c.lat, c.lon), 999) <= 50) then 'Serve una casa entro 50 km dalla casa di un membro'
    when not public.w_vicino_alleanza(p_user, p_aid) then 'In quella zona c''è già un''altra sua alleanza: le alleanze devono stare a più di 50 km l''una dall''altra'
    end; $$;
revoke all on function public.w_in_alleanza(uuid, bigint) from public, anon, authenticated;
revoke all on function public.w_dist_alleanza(bigint, double precision, double precision) from public, anon, authenticated;
revoke all on function public.w_zona_libera(uuid, double precision, double precision, bigint) from public, anon, authenticated;
revoke all on function public.w_ancora(uuid, bigint) from public, anon, authenticated;
revoke all on function public.w_perche_no(uuid, bigint) from public, anon, authenticated;

-- chiude una domanda: entra con la casa dell'alleanza giusta
create or replace function public.w_alleanza_chiudi(p_id bigint) returns text
  language plpgsql security definer set search_path to 'public' as $$
declare d public.world_alleanze_domande; serve uuid[]; m uuid; an record; why text;
begin
  select * into d from public.world_alleanze_domande where id = p_id for update;
  if d.id is null or d.stato <> 'aperta' then return coalesce(d.stato, 'nessuna'); end if;
  if d.created_at < now() - interval '7 days' then update public.world_alleanze_domande set stato = 'scaduta' where id = p_id; return 'scaduta'; end if;
  if cardinality(d.no) > 0 then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id;
    perform public.w_feed_add('all_no', d.no[1], d.user_id, null, null, (select nome from public.world_alleanze where id = d.alleanza_id)); return 'rifiutata'; end if;
  select coalesce(array_agg(v), '{}') into serve from unnest(d.votanti) v where public.w_in_alleanza(v, d.alleanza_id);
  if cardinality(serve) = 0 then serve := public.w_votanti(d.alleanza_id); update public.world_alleanze_domande set votanti = serve where id = p_id; end if;
  if not d.candidato_ok or exists (select 1 from unnest(serve) v where not (v = any(d.si))) then return 'aperta'; end if;
  why := public.w_perche_no(d.user_id, d.alleanza_id);
  if why is not null then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id; return 'rifiutata'; end if;
  if (select count(*) from public.world_alleanze_membri where alleanza_id = d.alleanza_id) >= 20 then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id; return 'piena'; end if;
  select * into an from public.w_ancora(d.user_id, d.alleanza_id);
  insert into public.world_alleanze_membri(user_id, alleanza_id, lat, lon) values (d.user_id, d.alleanza_id, an.lat, an.lon) on conflict do nothing;
  update public.world_alleanze_domande set stato = 'accettata' where id = p_id;
  for m in select user_id from public.world_alleanze_membri where alleanza_id = d.alleanza_id and user_id <> d.user_id loop
    perform public.w_feed_add('all_entrato', d.user_id, m, null, null, (select nome from public.world_alleanze where id = d.alleanza_id)); end loop;
  perform public.w_feed_add('all_si', coalesce(d.da, serve[1]), d.user_id, null, null, (select nome from public.world_alleanze where id = d.alleanza_id));
  return 'accettata';
end $$;

-- fondare: con una mia casa (p_lat/p_lon) in una zona libera; massimo 3 alleanze
create or replace function public.world_alleanza_fonda(p_nome text, p_emblema text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); n text := btrim(coalesce(p_nome,'')); e text := left(btrim(coalesce(p_emblema,'')), 4); aid bigint; c record;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if (select count(*) from public.world_alleanze_membri where user_id = me) >= 3 then return json_build_object('ok',false,'msg','Sei già in 3 alleanze (il massimo)'); end if;
  select x.lat, x.lon into c from (select h.lat, h.lon from public.world_homes h where h.user_id = me union all select b.lat, b.lon from public.world_buildings b where b.owner = me) x
    order by public.w_km(x.lat, x.lon, coalesce(p_lat, x.lat), coalesce(p_lon, x.lon)) limit 1;
  if c.lat is null then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  if p_lat is not null and public.w_km(c.lat, c.lon, p_lat, p_lon) > 0.1 then return json_build_object('ok',false,'msg','Scegli una delle tue case'); end if;
  if not public.w_zona_libera(me, c.lat, c.lon, null) then return json_build_object('ok',false,'msg','Qui intorno (50 km) sei già in un''altra alleanza: scegli una casa in un''altra zona'); end if;
  if char_length(n) < 3 or char_length(n) > 30 then return json_build_object('ok',false,'msg','Il nome deve avere da 3 a 30 caratteri'); end if;
  if public.w_bad(n) then return json_build_object('ok',false,'msg','Nome non permesso'); end if;
  if exists (select 1 from public.world_alleanze where lower(nome) = lower(n)) then return json_build_object('ok',false,'msg','Esiste già un''alleanza con questo nome'); end if;
  insert into public.world_alleanze(nome, emblema, capo) values (n, coalesce(nullif(e,''),'🛡️'), me) returning id into aid;
  insert into public.world_alleanze_membri(user_id, alleanza_id, lat, lon) values (me, aid, c.lat, c.lon);
  return json_build_object('ok',true,'id',aid,'msg','🛡️ Alleanza «' || n || '» fondata: ora invita i superstiti entro 50 km');
end $$;
create or replace function public.world_alleanza_crea(p_nome text, p_emblema text) returns json
  language sql security definer set search_path to 'public' as $$ select public.world_alleanza_fonda(p_nome, p_emblema, null, null); $$;

create or replace function public.world_alleanza_chiedi(p_aid bigint) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); v uuid[]; did bigint; x uuid; why text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if not exists (select 1 from public.world_alleanze where id = p_aid) then return json_build_object('ok',false,'msg','Alleanza non trovata'); end if;
  why := replace(replace(public.w_perche_no(me, p_aid), 'Ha già', 'Hai già'), 'sua alleanza', 'tua alleanza');
  if why is not null then return json_build_object('ok',false,'msg',why); end if;
  if exists (select 1 from public.world_alleanze_domande where alleanza_id = p_aid and user_id = me and stato = 'aperta') then return json_build_object('ok',false,'msg','Hai già chiesto di entrare: aspetta il voto'); end if;
  if (select count(*) from public.world_alleanze_membri where alleanza_id = p_aid) >= 20 then return json_build_object('ok',false,'msg','L''alleanza è piena (20)'); end if;
  v := public.w_votanti(p_aid);
  insert into public.world_alleanze_domande(alleanza_id, user_id, tipo, votanti) values (p_aid, me, 'richiesta', v) returning id into did;
  foreach x in array v loop perform public.w_feed_add('all_voto', me, x, null, null, 'richiesta'); end loop;
  return json_build_object('ok',true,'id',did,'msg','🗳️ Richiesta inviata: ' || case when cardinality(v) = 1 then 'la vota il capo' else 'la votano i ' || cardinality(v) || ' membri più attivi' end);
end $$;

create or replace function public.world_alleanza_invita2(p_user uuid, p_aid bigint) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); v uuid[]; did bigint; x uuid; why text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_aid is null or not public.w_in_alleanza(me, p_aid) then return json_build_object('ok',false,'msg','Prima crea un''alleanza o entra in una'); end if;
  if p_user is null or p_user = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  why := public.w_perche_no(p_user, p_aid);
  if why is not null then return json_build_object('ok',false,'msg',why); end if;
  if exists (select 1 from public.world_alleanze_domande where alleanza_id = p_aid and user_id = p_user and stato = 'aperta') then return json_build_object('ok',false,'msg','C''è già una votazione aperta per lui'); end if;
  v := public.w_votanti(p_aid);
  insert into public.world_alleanze_domande(alleanza_id, user_id, tipo, da, votanti, si, candidato_ok)
    values (p_aid, p_user, 'invito', me, v, case when me = any(v) then array[me] else '{}' end, false) returning id into did;
  perform public.w_feed_add('all_invito', me, p_user, null, null, (select nome from public.world_alleanze where id = p_aid));
  foreach x in array v loop if x <> me then perform public.w_feed_add('all_voto', me, x, null, null, 'invito'); end if; end loop;
  return json_build_object('ok',true,'id',did,'msg','📨 Invito partito: deve accettarlo lui e votarlo ' || case when cardinality(v) = 1 then 'tu' else 'i ' || cardinality(v) || ' membri più attivi' end);
end $$;
create or replace function public.world_alleanza_invita(p_user uuid) returns json
  language sql security definer set search_path to 'public' as $$
  select public.world_alleanza_invita2(p_user, (select m.alleanza_id from public.world_alleanze_membri m where m.user_id = auth.uid()
    order by (select min(public.w_dist_km(p_user, x.user_id)) from public.world_alleanze_membri x where x.alleanza_id = m.alleanza_id) nulls last limit 1)); $$;

create or replace function public.world_alleanza_risposta(p_id bigint, p_si boolean) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); d public.world_alleanze_domande; r text; why text;
begin
  select * into d from public.world_alleanze_domande where id = p_id for update;
  if d.id is null or d.stato <> 'aperta' or d.user_id <> me or d.tipo <> 'invito' then return json_build_object('ok',false,'msg','Invito non valido'); end if;
  if not p_si then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id; return json_build_object('ok',true,'msg','Invito rifiutato'); end if;
  why := public.w_perche_no(me, d.alleanza_id);
  if why is not null then return json_build_object('ok',false,'msg',replace(replace(why, 'Ha già', 'Hai già'), 'sua alleanza', 'tua alleanza')); end if;
  update public.world_alleanze_domande set candidato_ok = true where id = p_id;
  r := public.w_alleanza_chiudi(p_id);
  return json_build_object('ok',true,'esito',r,'msg', case r when 'accettata' then '🛡️ Benvenuto nell''alleanza!' else '👍 Hai accettato: manca il voto dei membri più attivi' end);
end $$;

create or replace function public.world_alleanza_esci2(p_aid bigint) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); nuovo uuid;
begin
  if p_aid is null or not public.w_in_alleanza(me, p_aid) then return json_build_object('ok',false,'msg','Non sei in questa alleanza'); end if;
  delete from public.world_alleanze_membri where user_id = me and alleanza_id = p_aid;
  if not exists (select 1 from public.world_alleanze_membri where alleanza_id = p_aid) then delete from public.world_alleanze where id = p_aid;
    return json_build_object('ok',true,'msg','Sei uscito: l''alleanza, rimasta vuota, è sciolta'); end if;
  if (select capo from public.world_alleanze where id = p_aid) = me then
    select m.user_id into nuovo from public.world_alleanze_membri m where m.alleanza_id = p_aid order by public.w_attivita(m.user_id) desc, m.dal limit 1;
    update public.world_alleanze set capo = nuovo where id = p_aid; end if;
  return json_build_object('ok',true,'msg','Sei uscito dall''alleanza');
end $$;
create or replace function public.world_alleanza_esci() returns json
  language sql security definer set search_path to 'public' as $$ select public.world_alleanza_esci2(public.w_alleanza_di(auth.uid())); $$;

-- le mie alleanze (fino a 3), con membri, voti e richieste
create or replace function public.world_alleanze_mie() returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); d record;
begin
  if me is null then return json_build_object('ok',false); end if;
  for d in select id from public.world_alleanze_domande where stato = 'aperta' and created_at < now() - interval '7 days' loop perform public.w_alleanza_chiudi(d.id); end loop;
  return json_build_object('ok', true, 'max', 3,
    'alleanze', (select coalesce(json_agg(json_build_object('id', a.id, 'nome', a.nome, 'emblema', a.emblema, 'capo', a.capo, 'capo_nick', public.w_nick(a.capo),
        'votanti', public.w_votanti(a.id), 'casa', json_build_object('lat', mm.lat, 'lon', mm.lon),
        'membri', (select coalesce(json_agg(json_build_object('user_id', m.user_id, 'nick', public.w_nick(m.user_id), 'wlevel', public.w_lvl_of(m.user_id),
            'attivita', public.w_attivita(m.user_id), 'me', m.user_id = me) order by public.w_attivita(m.user_id) desc, m.dal), '[]'::json)
            from public.world_alleanze_membri m where m.alleanza_id = a.id),
        'da_votare', (select coalesce(json_agg(json_build_object('id', q.id, 'tipo', q.tipo, 'user_id', q.user_id, 'nick', public.w_nick(q.user_id), 'wlevel', public.w_lvl_of(q.user_id),
            'da', public.w_nick(q.da), 'si', cardinality(q.si), 'no', cardinality(q.no), 'votanti', cardinality(q.votanti), 'candidato_ok', q.candidato_ok,
            'dist_km', round(public.w_dist_km(me, q.user_id)::numeric, 1)) order by q.created_at), '[]'::json)
            from public.world_alleanze_domande q where q.stato = 'aperta' and q.alleanza_id = a.id and me = any(q.votanti) and not (me = any(q.si)) and not (me = any(q.no))),
        'in_corso', (select coalesce(json_agg(json_build_object('id', q.id, 'tipo', q.tipo, 'nick', public.w_nick(q.user_id), 'si', cardinality(q.si), 'votanti', cardinality(q.votanti), 'candidato_ok', q.candidato_ok)), '[]'::json)
            from public.world_alleanze_domande q where q.stato = 'aperta' and q.alleanza_id = a.id)) order by mm.dal), '[]'::json)
      from public.world_alleanze_membri mm join public.world_alleanze a on a.id = mm.alleanza_id where mm.user_id = me),
    'inviti', (select coalesce(json_agg(json_build_object('id', q.id, 'alleanza', w.nome, 'emblema', w.emblema, 'da', public.w_nick(q.da),
          'membri', (select count(*) from public.world_alleanze_membri x where x.alleanza_id = q.alleanza_id), 'perche_no', public.w_perche_no(me, q.alleanza_id))), '[]'::json)
        from public.world_alleanze_domande q join public.world_alleanze w on w.id = q.alleanza_id where q.stato = 'aperta' and q.user_id = me and q.tipo = 'invito' and not q.candidato_ok),
    'mie_richieste', (select coalesce(json_agg(json_build_object('id', q.id, 'alleanza', w.nome, 'emblema', w.emblema, 'si', cardinality(q.si), 'votanti', cardinality(q.votanti))), '[]'::json)
        from public.world_alleanze_domande q join public.world_alleanze w on w.id = q.alleanza_id where q.stato = 'aperta' and q.user_id = me and q.candidato_ok));
end $$;

-- alleanze in cui posso entrare (entro 50 km, zona libera), escluse le mie
create or replace function public.world_alleanze_vicine() returns json
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(json_agg(x order by x.dist_km), '[]'::json) from (
    select a.id, a.nome, a.emblema, public.w_nick(a.capo) as capo, (select count(*) from public.world_alleanze_membri z where z.alleanza_id = a.id) as membri,
      round((select min(public.w_dist_alleanza(a.id, c.lat, c.lon)) from (select h.lat, h.lon from public.world_homes h where h.user_id = auth.uid() union all select b.lat, b.lon from public.world_buildings b where b.owner = auth.uid()) c)::numeric, 1) as dist_km,
      exists (select 1 from public.world_alleanze_domande q where q.alleanza_id = a.id and q.user_id = auth.uid() and q.stato = 'aperta') as chiesto,
      replace(replace(public.w_perche_no(auth.uid(), a.id), 'Ha già', 'Hai già'), 'sua alleanza', 'tua alleanza') as perche_no
    from public.world_alleanze a
    where auth.uid() is not null and not public.w_in_alleanza(auth.uid(), a.id)
      and exists (select 1 from (select h.lat, h.lon from public.world_homes h where h.user_id = auth.uid() union all select b.lat, b.lon from public.world_buildings b where b.owner = auth.uid()) c
                  where coalesce(public.w_dist_alleanza(a.id, c.lat, c.lon), 999) <= 50)
    limit 30) x; $$;

-- 💬 chat di una delle mie alleanze
create or replace function public.world_alleanza_chat2(p_aid bigint, p_after bigint) returns json
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(json_agg(x order by x.id), '[]'::json) from (
    select c.id, c.user_id, public.w_nick(c.user_id) as nick, c.body, c.created_at, c.user_id = auth.uid() as mine
    from public.world_alleanze_chat c where c.alleanza_id = p_aid and public.w_in_alleanza(auth.uid(), p_aid) and c.id > coalesce(p_after, 0)
    order by c.id desc limit 80) x; $$;
create or replace function public.world_alleanza_scrivi2(p_aid bigint, p_body text) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body,'')); m uuid; nm text;
begin
  if p_aid is null or not public.w_in_alleanza(me, p_aid) then return json_build_object('ok',false,'msg','Non sei in questa alleanza'); end if;
  if char_length(b) < 1 or char_length(b) > 500 then return json_build_object('ok',false,'msg','Da 1 a 500 caratteri'); end if;
  if public.w_bad(b) then return json_build_object('ok',false,'msg','Non inviato: niente bestemmie, insulti pesanti o minacce.'); end if;
  if exists (select 1 from public.world_alleanze_chat where user_id = me and created_at > now() - interval '2 seconds') then return json_build_object('ok',false,'msg','Piano: un messaggio ogni 2 secondi'); end if;
  insert into public.world_alleanze_chat(alleanza_id, user_id, body) values (p_aid, me, b);
  select nome into nm from public.world_alleanze where id = p_aid;
  for m in select user_id from public.world_alleanze_membri where alleanza_id = p_aid and user_id <> me loop
    if not exists (select 1 from public.world_feed f where f.target = m and f.kind = 'all_msg' and f.created_at > now() - interval '30 minutes') then
      perform public.w_feed_add('all_msg', me, m, null, null, left(nm || ': ' || b, 60)); end if;
  end loop;
  return json_build_object('ok',true);
end $$;
create or replace function public.world_alleanza_chat(p_after bigint) returns json
  language sql stable security definer set search_path to 'public' as $$ select public.world_alleanza_chat2(public.w_alleanza_di(auth.uid()), p_after); $$;
create or replace function public.world_alleanza_scrivi(p_body text) returns json
  language sql security definer set search_path to 'public' as $$ select public.world_alleanza_scrivi2(public.w_alleanza_di(auth.uid()), p_body); $$;

-- classifica: la mia è una qualsiasi delle mie
create or replace function public.world_rank_alleanze() returns json
  language sql stable security definer set search_path to 'public' as $$
  with p as (select m.alleanza_id, sum((public.w_score(m.user_id, true)->>'tot')::int) as punti, count(*) as membri
             from public.world_alleanze_membri m group by m.alleanza_id),
  r as (select row_number() over (order by p.punti desc, p.alleanza_id) as pos, p.* from p)
  select coalesce(json_agg(json_build_object('pos', r.pos, 'id', a.id, 'nome', a.nome, 'emblema', a.emblema, 'membri', r.membri, 'punti', r.punti,
      'mia', public.w_in_alleanza(auth.uid(), a.id)) order by r.pos), '[]'::json)
  from r join public.world_alleanze a on a.id = r.alleanza_id where r.pos <= 30 or public.w_in_alleanza(auth.uid(), a.id); $$;

-- "Proponi alleanza": lo invito in una mia alleanza della sua zona, oppure chiedo di entrare in una sua della mia zona
create or replace function public.world_ally_request(p_target uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); aid bigint;
begin
  if me is null or p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if exists (select 1 from public.world_allies where requester = p_target and target = me and status = 'pending') then
    update public.world_allies set status = 'ok' where requester = p_target and target = me;
    return json_build_object('ok',true,'msg','Alleanza fatta!'); end if;
  if exists (select 1 from public.world_alleanze_membri a join public.world_alleanze_membri b on b.alleanza_id = a.alleanza_id where a.user_id = me and b.user_id = p_target) then
    return json_build_object('ok',false,'msg','Siete già nella stessa alleanza'); end if;
  select m.alleanza_id into aid from public.world_alleanze_membri m where m.user_id = me and public.w_perche_no(p_target, m.alleanza_id) is null limit 1;
  if aid is not null then return public.world_alleanza_invita2(p_target, aid); end if;
  select m.alleanza_id into aid from public.world_alleanze_membri m where m.user_id = p_target and public.w_perche_no(me, m.alleanza_id) is null limit 1;
  if aid is not null then return public.world_alleanza_chiedi(aid); end if;
  if not exists (select 1 from public.world_alleanze_membri where user_id = me) then
    return json_build_object('ok',false,'msg','Le alleanze ora sono gruppi: fonda la tua (Superstiti → 🛡️ Alleanza) e poi invitalo'); end if;
  return json_build_object('ok',false,'msg','Non potete stare nella stessa alleanza: siete già in alleanze diverse nella stessa zona, o troppo lontani');
end $$;

revoke all on function public.world_alleanza_fonda(text, text, double precision, double precision) from public, anon;
revoke all on function public.world_alleanza_invita2(uuid, bigint) from public, anon;
revoke all on function public.world_alleanza_esci2(bigint) from public, anon;
revoke all on function public.world_alleanze_mie() from public, anon;
revoke all on function public.world_alleanza_chat2(bigint, bigint) from public, anon;
revoke all on function public.world_alleanza_scrivi2(bigint, text) from public, anon;
grant execute on function public.world_alleanza_fonda(text, text, double precision, double precision) to authenticated;
grant execute on function public.world_alleanza_invita2(uuid, bigint) to authenticated;
grant execute on function public.world_alleanza_esci2(bigint) to authenticated;
grant execute on function public.world_alleanze_mie() to authenticated;
grant execute on function public.world_alleanza_chat2(bigint, bigint) to authenticated;
grant execute on function public.world_alleanza_scrivi2(bigint, text) to authenticated;

-- controllo: deve dire "alleanze multiple pronte"
select case when exists (select 1 from pg_proc where proname = 'world_alleanze_mie') and exists (select 1 from information_schema.columns where table_name = 'world_alleanze_membri' and column_name = 'lat')
       then 'alleanze multiple pronte' else 'qualcosa manca' end as esito;
