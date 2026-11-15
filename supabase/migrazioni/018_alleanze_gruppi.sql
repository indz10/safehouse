-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 018 — ALLEANZE A GRUPPI con voto, chat e classifica (richiesta di Alessandro, 15/11)
-- 1) 🛡️ ALLEANZA = un gruppo (max 20 superstiti, un'alleanza a testa) con nome ed emblema; chi la crea è il capo.
-- 2) Si entra solo con un VOTO: chi chiede di entrare, o chi viene invitato da un membro, deve essere accettato dai
--    3 MEMBRI PIÙ ATTIVI (giorni di gioco negli ultimi 30; se i membri sono meno di 3, tutti). Un "no" la respinge,
--    un invito lo deve accettare anche l'invitato; le richieste scadono dopo 7 giorni.
-- 3) Si entra solo se hai una casa (vera o comprata) ENTRO 50 KM dalla casa di un membro.
-- 4) Tutti i membri sono alleati tra loro (rinforzi, difese, assi, niente assalti tra loro). Le vecchie alleanze a due
--    restano valide, ma le nuove si fanno solo con le alleanze a gruppi: "Proponi alleanza" diventa invito o richiesta.
-- 5) 💬 CHAT DELL'ALLEANZA (solo i membri) con avviso sul telefono (al massimo uno ogni 30 minuti a testa).
-- 6) 🏆 CLASSIFICA DELLE ALLEANZE: somma dei Punteggi Superstite (7 giorni) dei membri.
-- Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_alleanze(
  id bigserial primary key,
  nome text not null,
  emblema text not null default '🛡️',
  capo uuid,
  created_at timestamptz not null default now());
create unique index if not exists world_alleanze_nome on public.world_alleanze (lower(nome));
create table if not exists public.world_alleanze_membri(
  user_id uuid primary key,
  alleanza_id bigint not null references public.world_alleanze(id) on delete cascade,
  dal timestamptz not null default now());
create index if not exists world_alleanze_membri_a on public.world_alleanze_membri(alleanza_id);
create table if not exists public.world_alleanze_domande(
  id bigserial primary key,
  alleanza_id bigint not null references public.world_alleanze(id) on delete cascade,
  user_id uuid not null,                 -- chi vuole entrare
  tipo text not null check (tipo in ('richiesta','invito')),
  da uuid,                               -- chi ha invitato
  votanti uuid[] not null default '{}',  -- i 3 membri più attivi quando è nata la domanda
  si uuid[] not null default '{}',
  no uuid[] not null default '{}',
  candidato_ok boolean not null default true,
  stato text not null default 'aperta' check (stato in ('aperta','accettata','rifiutata','scaduta')),
  created_at timestamptz not null default now());
create index if not exists world_alleanze_domande_a on public.world_alleanze_domande(alleanza_id, stato);
create table if not exists public.world_alleanze_chat(
  id bigserial primary key,
  alleanza_id bigint not null references public.world_alleanze(id) on delete cascade,
  user_id uuid not null, body text not null, created_at timestamptz not null default now());
create index if not exists world_alleanze_chat_a on public.world_alleanze_chat(alleanza_id, id);
alter table public.world_alleanze enable row level security;
alter table public.world_alleanze_membri enable row level security;
alter table public.world_alleanze_domande enable row level security;
alter table public.world_alleanze_chat enable row level security;

create or replace function public.w_alleanza_di(p_user uuid) returns bigint
  language sql stable security definer set search_path to 'public' as $$
  select alleanza_id from public.world_alleanze_membri where user_id = p_user; $$;
-- quanto gioca: giorni con attività negli ultimi 30
create or replace function public.w_attivita(p_user uuid) returns int
  language sql stable security definer set search_path to 'public' as $$
  select count(distinct (l.created_at at time zone 'Europe/Rome')::date)::int from public.world_log l
  where l.user_id = p_user and l.created_at > now() - interval '30 days'; $$;
-- i 3 membri più attivi (tutti se sono meno di 3)
create or replace function public.w_votanti(p_aid bigint) returns uuid[]
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(u order by att desc, dal), '{}') from (
    select m.user_id as u, public.w_attivita(m.user_id) as att, m.dal from public.world_alleanze_membri m
    where m.alleanza_id = p_aid order by att desc, m.dal limit 3) x; $$;
-- una casa entro 50 km da quella di un membro
create or replace function public.w_vicino_alleanza(p_user uuid, p_aid bigint) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.world_alleanze_membri m where m.alleanza_id = p_aid and m.user_id <> p_user
                 and coalesce(public.w_dist_km(p_user, m.user_id), 999) <= 50); $$;
revoke all on function public.w_alleanza_di(uuid) from public, anon, authenticated;
revoke all on function public.w_attivita(uuid) from public, anon, authenticated;
revoke all on function public.w_votanti(bigint) from public, anon, authenticated;
revoke all on function public.w_vicino_alleanza(uuid, bigint) from public, anon, authenticated;

-- i membri della stessa alleanza sono alleati (una rottura nel condominio resta più forte)
create or replace function public.w_are_allies(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select a <> b and not public.w_rift(a, b) and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = a and mb.user_id = b)
    or exists (select 1 from public.world_help_given g where ((g.helper = a and g.target = b) or (g.helper = b and g.target = a)) and g.created_at > now() - interval '30 days')
    or exists (select 1 from public.profili_pubblici p where p.user_id = b and p.invitato_da = left(a::text,8))
    or exists (select 1 from public.profili_pubblici p where p.user_id = a and p.invitato_da = left(b::text,8))
    or public.w_coinq(a, b)); $$;

create or replace function public.w_allies_of(p_user uuid) returns setof uuid
  language sql stable security definer set search_path to 'public' as $$
  select distinct t.u from (
    select case when x.requester = p_user then x.target else x.requester end as u from public.world_allies x where x.status = 'ok' and (x.requester = p_user or x.target = p_user)
    union select mb.user_id from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = p_user
    union select g.target from public.world_help_given g where g.helper = p_user and g.created_at > now() - interval '30 days'
    union select g.helper from public.world_help_given g where g.target = p_user and g.created_at > now() - interval '30 days'
    union select p.user_id from public.profili_pubblici p where p.invitato_da = left(p_user::text,8)
    union select q.user_id from public.profili_pubblici p, public.profili_pubblici q where p.user_id = p_user and p.invitato_da is not null and left(q.user_id::text,8) = p.invitato_da
    union select h.user_id from public.world_homes h, public.world_homes me where me.user_id = p_user and h.user_id <> p_user
      and h.lat between me.lat - 0.0005 and me.lat + 0.0005 and h.lon between me.lon - 0.0007 and me.lon + 0.0007 and public.w_coinq(p_user, h.user_id)) t
  where t.u is not null and t.u <> p_user and not public.w_rift(p_user, t.u);
$$;

-- chiude una domanda quando tutti i votanti hanno detto sì (o qualcuno no)
create or replace function public.w_alleanza_chiudi(p_id bigint) returns text
  language plpgsql security definer set search_path to 'public' as $$
declare d public.world_alleanze_domande; serve uuid[]; m uuid;
begin
  select * into d from public.world_alleanze_domande where id = p_id for update;
  if d.id is null or d.stato <> 'aperta' then return coalesce(d.stato, 'nessuna'); end if;
  if d.created_at < now() - interval '7 days' then update public.world_alleanze_domande set stato = 'scaduta' where id = p_id; return 'scaduta'; end if;
  if cardinality(d.no) > 0 then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id;
    perform public.w_feed_add('all_no', d.no[1], d.user_id, null, null, (select nome from public.world_alleanze where id = d.alleanza_id)); return 'rifiutata'; end if;
  -- contano i votanti ancora nell'alleanza; se non ce n'è più nessuno, i 3 più attivi di adesso
  select coalesce(array_agg(v), '{}') into serve from unnest(d.votanti) v where exists (select 1 from public.world_alleanze_membri x where x.user_id = v and x.alleanza_id = d.alleanza_id);
  if cardinality(serve) = 0 then serve := public.w_votanti(d.alleanza_id); update public.world_alleanze_domande set votanti = serve where id = p_id; end if;
  if not d.candidato_ok or exists (select 1 from unnest(serve) v where not (v = any(d.si))) then return 'aperta'; end if;
  if public.w_alleanza_di(d.user_id) is not null then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id; return 'rifiutata'; end if;
  if (select count(*) from public.world_alleanze_membri where alleanza_id = d.alleanza_id) >= 20 then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id; return 'piena'; end if;
  insert into public.world_alleanze_membri(user_id, alleanza_id) values (d.user_id, d.alleanza_id) on conflict do nothing;
  update public.world_alleanze_domande set stato = 'accettata' where id = p_id;
  update public.world_alleanze_domande set stato = 'rifiutata' where user_id = d.user_id and stato = 'aperta' and id <> p_id;
  for m in select user_id from public.world_alleanze_membri where alleanza_id = d.alleanza_id and user_id <> d.user_id loop
    perform public.w_feed_add('all_entrato', d.user_id, m, null, null, (select nome from public.world_alleanze where id = d.alleanza_id)); end loop;
  perform public.w_feed_add('all_si', coalesce(d.da, serve[1]), d.user_id, null, null, (select nome from public.world_alleanze where id = d.alleanza_id));
  return 'accettata';
end $$;
revoke all on function public.w_alleanza_chiudi(bigint) from public, anon, authenticated;

create or replace function public.world_alleanza_crea(p_nome text, p_emblema text) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); n text := btrim(coalesce(p_nome,'')); e text := left(btrim(coalesce(p_emblema,'')), 4); aid bigint;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if public.w_alleanza_di(me) is not null then return json_build_object('ok',false,'msg','Sei già in un''alleanza: esci prima di crearne una nuova'); end if;
  if not exists (select 1 from public.world_homes where user_id = me) then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  if char_length(n) < 3 or char_length(n) > 30 then return json_build_object('ok',false,'msg','Il nome deve avere da 3 a 30 caratteri'); end if;
  if public.w_bad(n) then return json_build_object('ok',false,'msg','Nome non permesso'); end if;
  if exists (select 1 from public.world_alleanze where lower(nome) = lower(n)) then return json_build_object('ok',false,'msg','Esiste già un''alleanza con questo nome'); end if;
  insert into public.world_alleanze(nome, emblema, capo) values (n, coalesce(nullif(e,''),'🛡️'), me) returning id into aid;
  insert into public.world_alleanze_membri(user_id, alleanza_id) values (me, aid);
  update public.world_alleanze_domande set stato = 'rifiutata' where user_id = me and stato = 'aperta';
  return json_build_object('ok',true,'id',aid,'msg','🛡️ Alleanza «' || n || '» fondata: ora invita i superstiti vicini (entro 50 km)');
end $$;

create or replace function public.world_alleanza_chiedi(p_aid bigint) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); v uuid[]; did bigint; x uuid;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if public.w_alleanza_di(me) is not null then return json_build_object('ok',false,'msg','Sei già in un''alleanza'); end if;
  if not exists (select 1 from public.world_alleanze where id = p_aid) then return json_build_object('ok',false,'msg','Alleanza non trovata'); end if;
  if not public.w_vicino_alleanza(me, p_aid) then return json_build_object('ok',false,'msg','Serve una tua casa entro 50 km dalla casa di un membro'); end if;
  if exists (select 1 from public.world_alleanze_domande where alleanza_id = p_aid and user_id = me and stato = 'aperta') then return json_build_object('ok',false,'msg','Hai già chiesto di entrare: aspetta il voto'); end if;
  if (select count(*) from public.world_alleanze_membri where alleanza_id = p_aid) >= 20 then return json_build_object('ok',false,'msg','L''alleanza è piena (20)'); end if;
  v := public.w_votanti(p_aid);
  insert into public.world_alleanze_domande(alleanza_id, user_id, tipo, votanti) values (p_aid, me, 'richiesta', v) returning id into did;
  foreach x in array v loop perform public.w_feed_add('all_voto', me, x, null, null, 'richiesta'); end loop;
  return json_build_object('ok',true,'id',did,'msg','🗳️ Richiesta inviata: la votano i ' || cardinality(v) || ' membri più attivi');
end $$;

create or replace function public.world_alleanza_invita(p_user uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); aid bigint := public.w_alleanza_di(auth.uid()); v uuid[]; did bigint; x uuid; r text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if aid is null then return json_build_object('ok',false,'msg','Prima crea un''alleanza o entra in una'); end if;
  if p_user is null or p_user = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if public.w_alleanza_di(p_user) = aid then return json_build_object('ok',false,'msg','È già nella tua alleanza'); end if;
  if public.w_alleanza_di(p_user) is not null then return json_build_object('ok',false,'msg','È già in un''altra alleanza'); end if;
  if not public.w_vicino_alleanza(p_user, aid) then return json_build_object('ok',false,'msg','Non ha una casa entro 50 km dalla casa di un membro'); end if;
  if exists (select 1 from public.world_alleanze_domande where alleanza_id = aid and user_id = p_user and stato = 'aperta') then return json_build_object('ok',false,'msg','C''è già una votazione aperta per lui'); end if;
  v := public.w_votanti(aid);
  insert into public.world_alleanze_domande(alleanza_id, user_id, tipo, da, votanti, si, candidato_ok)
    values (aid, p_user, 'invito', me, v, case when me = any(v) then array[me] else '{}' end, false) returning id into did;
  perform public.w_feed_add('all_invito', me, p_user, null, null, (select nome from public.world_alleanze where id = aid));
  foreach x in array v loop if x <> me then perform public.w_feed_add('all_voto', me, x, null, null, 'invito'); end if; end loop;
  return json_build_object('ok',true,'id',did,'msg','📨 Invito partito: deve accettarlo lui e votarlo ' || case when cardinality(v) = 1 then 'tu' else 'i ' || cardinality(v) || ' membri più attivi' end);
end $$;

create or replace function public.world_alleanza_vota(p_id bigint, p_si boolean) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); d public.world_alleanze_domande; r text;
begin
  select * into d from public.world_alleanze_domande where id = p_id for update;
  if d.id is null or d.stato <> 'aperta' then return json_build_object('ok',false,'msg','Votazione chiusa'); end if;
  if not (me = any(d.votanti)) then return json_build_object('ok',false,'msg','Votano solo i 3 membri più attivi'); end if;
  if me = any(d.si) or me = any(d.no) then return json_build_object('ok',false,'msg','Hai già votato'); end if;
  if p_si then update public.world_alleanze_domande set si = si || me where id = p_id; else update public.world_alleanze_domande set no = no || me where id = p_id; end if;
  r := public.w_alleanza_chiudi(p_id);
  return json_build_object('ok',true,'esito',r,'msg', case r when 'accettata' then '✅ Accettato: ora è nell''alleanza' when 'rifiutata' then '❌ Domanda respinta' when 'piena' then 'L''alleanza è piena' else '🗳️ Voto registrato: aspettiamo gli altri' end);
end $$;

create or replace function public.world_alleanza_risposta(p_id bigint, p_si boolean) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); d public.world_alleanze_domande; r text;
begin
  select * into d from public.world_alleanze_domande where id = p_id for update;
  if d.id is null or d.stato <> 'aperta' or d.user_id <> me or d.tipo <> 'invito' then return json_build_object('ok',false,'msg','Invito non valido'); end if;
  if not p_si then update public.world_alleanze_domande set stato = 'rifiutata' where id = p_id; return json_build_object('ok',true,'msg','Invito rifiutato'); end if;
  if public.w_alleanza_di(me) is not null then return json_build_object('ok',false,'msg','Sei già in un''alleanza: esci prima'); end if;
  update public.world_alleanze_domande set candidato_ok = true where id = p_id;
  r := public.w_alleanza_chiudi(p_id);
  return json_build_object('ok',true,'esito',r,'msg', case r when 'accettata' then '🛡️ Benvenuto nell''alleanza!' else '👍 Hai accettato: manca il voto dei membri più attivi' end);
end $$;

create or replace function public.world_alleanza_esci() returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); aid bigint := public.w_alleanza_di(auth.uid()); nuovo uuid;
begin
  if aid is null then return json_build_object('ok',false,'msg','Non sei in un''alleanza'); end if;
  delete from public.world_alleanze_membri where user_id = me;
  if not exists (select 1 from public.world_alleanze_membri where alleanza_id = aid) then delete from public.world_alleanze where id = aid;
    return json_build_object('ok',true,'msg','Sei uscito: l''alleanza, rimasta vuota, è sciolta'); end if;
  if (select capo from public.world_alleanze where id = aid) = me then
    select m.user_id into nuovo from public.world_alleanze_membri m where m.alleanza_id = aid order by public.w_attivita(m.user_id) desc, m.dal limit 1;
    update public.world_alleanze set capo = nuovo where id = aid; end if;
  return json_build_object('ok',true,'msg','Sei uscito dall''alleanza');
end $$;

-- la mia alleanza: membri, votazioni dove voto io, inviti per me, mie richieste
create or replace function public.world_alleanza_info() returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); aid bigint := public.w_alleanza_di(auth.uid()); a public.world_alleanze; d record;
begin
  if me is null then return json_build_object('ok',false); end if;
  for d in select id from public.world_alleanze_domande where stato = 'aperta' and created_at < now() - interval '7 days' loop perform public.w_alleanza_chiudi(d.id); end loop;
  select * into a from public.world_alleanze where id = aid;
  return json_build_object('ok', true,
    'alleanza', case when aid is null then null else json_build_object('id', a.id, 'nome', a.nome, 'emblema', a.emblema, 'capo', a.capo, 'capo_nick', public.w_nick(a.capo),
      'votanti', public.w_votanti(aid), 'ultimo_msg', (select max(id) from public.world_alleanze_chat where alleanza_id = aid),
      'membri', (select coalesce(json_agg(json_build_object('user_id', m.user_id, 'nick', public.w_nick(m.user_id), 'wlevel', public.w_lvl_of(m.user_id),
          'attivita', public.w_attivita(m.user_id), 'seen_at', (select seen_at from public.profili_pubblici where user_id = m.user_id), 'me', m.user_id = me)
          order by public.w_attivita(m.user_id) desc, m.dal), '[]'::json) from public.world_alleanze_membri m where m.alleanza_id = aid)) end,
    'da_votare', (select coalesce(json_agg(json_build_object('id', q.id, 'tipo', q.tipo, 'user_id', q.user_id, 'nick', public.w_nick(q.user_id), 'wlevel', public.w_lvl_of(q.user_id),
          'da', public.w_nick(q.da), 'si', cardinality(q.si), 'no', cardinality(q.no), 'votanti', cardinality(q.votanti), 'candidato_ok', q.candidato_ok,
          'dist_km', round(public.w_dist_km(me, q.user_id)::numeric, 1)) order by q.created_at), '[]'::json)
        from public.world_alleanze_domande q where q.stato = 'aperta' and q.alleanza_id = aid and me = any(q.votanti) and not (me = any(q.si)) and not (me = any(q.no))),
    'in_corso', (select coalesce(json_agg(json_build_object('id', q.id, 'tipo', q.tipo, 'nick', public.w_nick(q.user_id), 'si', cardinality(q.si), 'votanti', cardinality(q.votanti), 'candidato_ok', q.candidato_ok)), '[]'::json)
        from public.world_alleanze_domande q where q.stato = 'aperta' and q.alleanza_id = aid),
    'inviti', (select coalesce(json_agg(json_build_object('id', q.id, 'alleanza', w.nome, 'emblema', w.emblema, 'da', public.w_nick(q.da),
          'membri', (select count(*) from public.world_alleanze_membri x where x.alleanza_id = q.alleanza_id))), '[]'::json)
        from public.world_alleanze_domande q join public.world_alleanze w on w.id = q.alleanza_id where q.stato = 'aperta' and q.user_id = me and q.tipo = 'invito' and not q.candidato_ok),
    'mie_richieste', (select coalesce(json_agg(json_build_object('id', q.id, 'alleanza', w.nome, 'emblema', w.emblema, 'si', cardinality(q.si), 'votanti', cardinality(q.votanti))), '[]'::json)
        from public.world_alleanze_domande q join public.world_alleanze w on w.id = q.alleanza_id where q.stato = 'aperta' and q.user_id = me and q.candidato_ok));
end $$;

-- alleanze in cui posso entrare: un membro ha la casa entro 50 km da una mia casa
create or replace function public.world_alleanze_vicine() returns json
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(json_agg(x order by x.dist_km), '[]'::json) from (
    select a.id, a.nome, a.emblema, public.w_nick(a.capo) as capo, (select count(*) from public.world_alleanze_membri z where z.alleanza_id = a.id) as membri,
      round(min(public.w_dist_km(auth.uid(), m.user_id))::numeric, 1) as dist_km,
      exists (select 1 from public.world_alleanze_domande q where q.alleanza_id = a.id and q.user_id = auth.uid() and q.stato = 'aperta') as chiesto
    from public.world_alleanze a join public.world_alleanze_membri m on m.alleanza_id = a.id
    where auth.uid() is not null and a.id is distinct from public.w_alleanza_di(auth.uid())
    group by a.id having min(public.w_dist_km(auth.uid(), m.user_id)) <= 50
    order by 6 limit 30) x; $$;

-- 💬 chat dell'alleanza
create or replace function public.world_alleanza_chat(p_after bigint) returns json
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(json_agg(x order by x.id), '[]'::json) from (
    select c.id, c.user_id, public.w_nick(c.user_id) as nick, c.body, c.created_at, c.user_id = auth.uid() as mine
    from public.world_alleanze_chat c where c.alleanza_id = public.w_alleanza_di(auth.uid()) and c.id > coalesce(p_after, 0)
    order by c.id desc limit 80) x; $$;
create or replace function public.world_alleanza_scrivi(p_body text) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); aid bigint := public.w_alleanza_di(auth.uid()); b text := btrim(coalesce(p_body,'')); m uuid;
begin
  if aid is null then return json_build_object('ok',false,'msg','Non sei in un''alleanza'); end if;
  if char_length(b) < 1 or char_length(b) > 500 then return json_build_object('ok',false,'msg','Da 1 a 500 caratteri'); end if;
  if public.w_bad(b) then return json_build_object('ok',false,'msg','Non inviato: niente bestemmie, insulti pesanti o minacce.'); end if;
  if exists (select 1 from public.world_alleanze_chat where user_id = me and created_at > now() - interval '2 seconds') then return json_build_object('ok',false,'msg','Piano: un messaggio ogni 2 secondi'); end if;
  insert into public.world_alleanze_chat(alleanza_id, user_id, body) values (aid, me, b);
  for m in select user_id from public.world_alleanze_membri where alleanza_id = aid and user_id <> me loop
    if not exists (select 1 from public.world_feed f where f.target = m and f.kind = 'all_msg' and f.created_at > now() - interval '30 minutes') then
      perform public.w_feed_add('all_msg', me, m, null, null, left(b, 60)); end if;
  end loop;
  return json_build_object('ok',true);
end $$;

-- 🏆 classifica delle alleanze (somma dei Punteggi Superstite della settimana)
create or replace function public.world_rank_alleanze() returns json
  language sql stable security definer set search_path to 'public' as $$
  with p as (select m.alleanza_id, sum((public.w_score(m.user_id, true)->>'tot')::int) as punti, count(*) as membri
             from public.world_alleanze_membri m group by m.alleanza_id),
  r as (select row_number() over (order by p.punti desc, p.alleanza_id) as pos, p.* from p)
  select coalesce(json_agg(json_build_object('pos', r.pos, 'id', a.id, 'nome', a.nome, 'emblema', a.emblema, 'membri', r.membri, 'punti', r.punti,
      'mia', a.id = public.w_alleanza_di(auth.uid())) order by r.pos), '[]'::json)
  from r join public.world_alleanze a on a.id = r.alleanza_id where r.pos <= 30 or a.id = public.w_alleanza_di(auth.uid()); $$;

-- "Proponi alleanza" (vecchio pulsante): ora porta nelle alleanze a gruppi
create or replace function public.world_ally_request(p_target uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); mine bigint := public.w_alleanza_di(auth.uid()); sua bigint := public.w_alleanza_di(p_target);
begin
  if me is null or p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if mine is not null and mine = sua then return json_build_object('ok',false,'msg','Siete già nella stessa alleanza'); end if;
  if exists (select 1 from public.world_allies where requester = p_target and target = me and status = 'pending') then
    update public.world_allies set status = 'ok' where requester = p_target and target = me;
    return json_build_object('ok',true,'msg','Alleanza fatta!'); end if;
  if mine is not null and sua is null then return public.world_alleanza_invita(p_target); end if;
  if mine is null and sua is not null then return public.world_alleanza_chiedi(sua); end if;
  if mine is null then return json_build_object('ok',false,'msg','Le alleanze ora sono gruppi: fonda la tua (Superstiti → 🛡️ Alleanza) e poi invitalo'); end if;
  return json_build_object('ok',false,'msg','Siete in due alleanze diverse');
end $$;

revoke all on function public.world_alleanza_crea(text, text) from public, anon;
revoke all on function public.world_alleanza_chiedi(bigint) from public, anon;
revoke all on function public.world_alleanza_invita(uuid) from public, anon;
revoke all on function public.world_alleanza_vota(bigint, boolean) from public, anon;
revoke all on function public.world_alleanza_risposta(bigint, boolean) from public, anon;
revoke all on function public.world_alleanza_esci() from public, anon;
revoke all on function public.world_alleanza_info() from public, anon;
revoke all on function public.world_alleanze_vicine() from public, anon;
revoke all on function public.world_alleanza_chat(bigint) from public, anon;
revoke all on function public.world_alleanza_scrivi(text) from public, anon;
grant execute on function public.world_alleanza_crea(text, text) to authenticated;
grant execute on function public.world_alleanza_chiedi(bigint) to authenticated;
grant execute on function public.world_alleanza_invita(uuid) to authenticated;
grant execute on function public.world_alleanza_vota(bigint, boolean) to authenticated;
grant execute on function public.world_alleanza_risposta(bigint, boolean) to authenticated;
grant execute on function public.world_alleanza_esci() to authenticated;
grant execute on function public.world_alleanza_info() to authenticated;
grant execute on function public.world_alleanze_vicine() to authenticated;
grant execute on function public.world_alleanza_chat(bigint) to authenticated;
grant execute on function public.world_alleanza_scrivi(text) to authenticated;
grant execute on function public.world_rank_alleanze() to authenticated, anon;

-- controllo: deve dire "alleanze a gruppi pronte"
select case when exists (select 1 from pg_proc where proname = 'world_alleanza_vota') and exists (select 1 from pg_proc where proname = 'w_are_allies' and prosrc like '%world_alleanze_membri%')
       then 'alleanze a gruppi pronte' else 'qualcosa manca' end as esito;
