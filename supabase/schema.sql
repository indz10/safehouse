-- ZombieSafeHouse · STATO DEL DATABASE (schema public) ricostruito eseguendo in ordine i file *.sql
-- e supabase/migrazioni/ su un Postgres di prova (docs/strumenti/db_locale.sh). È un DOCUMENTO: non eseguirlo.
-- Per cambiare il database: un file nuovo in supabase/migrazioni/NNN_nome.sql.
-- Lavori programmati (cron): zsh-push-tick */10 * * * *; zsh-sponsor-scadenze 17 3 * * *; zsh-presidi 3 * * * *
--
-- PostgreSQL database dump
--

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';

--
-- Name: admin_link_sponsor(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_link_sponsor(p_sponsor uuid, p_email text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare uid uuid;
begin
  if not public.is_admin() then return 'Solo per amministratori'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return 'Nessun account con questa email: il negoziante deve prima registrarsi nell''app'; end if;
  insert into public.sponsor_users(sponsor_id, user_id) values (p_sponsor, uid) on conflict do nothing;
  return 'ok';
end $$;

--
-- Name: admin_sponsor_accounts(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_sponsor_accounts(p_sponsor uuid) RETURNS TABLE(email text, user_id uuid)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select u.email::text, u.id from public.sponsor_users su join auth.users u on u.id = su.user_id
  where su.sponsor_id = p_sponsor and public.is_admin();
$$;

--
-- Name: admin_sponsor_set(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_sponsor_set(p_id uuid, p_stato text, p_visibility text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s public.sponsors;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', 'solo admin'); end if;
  select * into s from public.sponsors where id = p_id;
  if s.id is null then return json_build_object('ok', false, 'msg', 'sponsor non trovato'); end if;
  update public.sponsors set
    stato = coalesce(nullif(p_stato,''), stato),
    visibility = coalesce(nullif(p_visibility,''), visibility),
    active = (coalesce(nullif(p_stato,''), stato) = 'attivo' and coalesce(nullif(p_visibility,''), visibility) <> 'nascosto'),
    valid_from = case when coalesce(nullif(p_stato,''), stato) = 'attivo' and valid_from is null then current_date else valid_from end
  where id = p_id returning * into s;
  return json_build_object('ok', true, 'stato', s.stato, 'visibility', s.visibility, 'active', s.active);
end $$;

--
-- Name: admin_world_exclude(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_world_exclude(p_bid text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare b public.world_buildings;
begin
  if not public.is_admin() then return 'Solo per amministratori'; end if;
  select * into b from public.world_buildings where building_id = p_bid;
  if b.owner is not null then perform public.w_pay(b.owner, b.paid + b.upgrades, 'Edificio escluso dal gioco: rimborso completo', p_bid); end if;
  delete from public.world_buildings where building_id = p_bid;
  insert into public.world_excluded(building_id) values (p_bid) on conflict do nothing;
  return 'ok';
end $$;

--
-- Name: delete_my_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_my_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  delete from auth.users where id = auth.uid();
end $$;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

--
-- Name: miei_invitati(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.miei_invitati() RETURNS TABLE(nick text, valutato boolean, dal timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.nick, p.indice is not null, p.updated_at from public.profili_pubblici p
  where p.invitato_da = left(auth.uid()::text, 8) and p.user_id <> auth.uid();
$$;

--
-- Name: my_sponsor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.my_sponsor(s uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.sponsor_users where sponsor_id = s and user_id = auth.uid());
$$;

--
-- Name: push_piazza(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.push_piazza(p_endpoint text, p_mode text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare m text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if coalesce(p_mode, '') <> '' then
    if p_mode not in ('no','zona','tutto') then return json_build_object('ok', false, 'msg', 'scelta non valida'); end if;
    update public.push_subs set piazza = p_mode, last_chat = now() where endpoint = p_endpoint and user_id = auth.uid();
  end if;
  select piazza into m from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
  if m is null then return json_build_object('ok', false, 'msg', 'Notifiche non attive su questo telefono'); end if;
  return json_build_object('ok', true, 'piazza', m);
end $$;

--
-- Name: push_subscribe(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  insert into public.push_subs(endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
  return json_build_object('ok',true);
end $$;

--
-- Name: push_unsubscribe(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.push_unsubscribe(p_endpoint text) RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
  select json_build_object('ok',true);
$$;

--
-- Name: redeem_coupon(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_coupon(p_code text, p_amount numeric DEFAULT NULL::numeric) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare c public.coupons;
begin
  select * into c from public.coupons where code = upper(p_code);
  if not found then return 'Codice inesistente'; end if;
  if not public.my_sponsor(c.sponsor_id) then return 'Codice di un altro negozio'; end if;
  if c.redeemed_at is not null then return 'Codice già usato'; end if;
  if c.expires_at < now() then return 'Codice scaduto'; end if;
  update public.coupons set redeemed_at = now(), amount_eur = p_amount where id = c.id;
  insert into public.sponsor_events (sponsor_id, kind) values (c.sponsor_id, 'codice_usato');
  return 'Codice valido: sconto applicato';
end; $$;

--
-- Name: sponsor_pagato(uuid, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sponsor_pagato(p_sponsor uuid, p_package text, p_stripe_id text, p_eur numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare pr public.sponsor_prezzi; s public.sponsors; da date; fino date;
begin
  if exists (select 1 from public.subscriptions where stripe_id = p_stripe_id) then return json_build_object('ok', true, 'msg', 'già registrato'); end if;
  select * into pr from public.sponsor_prezzi where package = p_package;
  select * into s from public.sponsors where id = p_sponsor;
  if pr.package is null or s.id is null then return json_build_object('ok', false, 'msg', 'pacchetto o sponsor sconosciuto'); end if;
  da := greatest(current_date, coalesce(s.valid_to, current_date));
  fino := (da + make_interval(months => pr.mesi))::date;
  update public.sponsors set package = pr.package, valid_from = coalesce(valid_from, current_date), valid_to = fino,
    stato = 'attivo', visibility = case when visibility = 'nascosto' then 'nascosto' when pr.evidenza then 'evidenza' else 'normale' end,
    active = (visibility <> 'nascosto')
  where id = p_sponsor;
  insert into public.subscriptions(sponsor_id, package, price_eur, period, starts_on, ends_on, status, stripe_id)
  values (p_sponsor, pr.package, coalesce(p_eur, pr.prezzo_eur), pr.mesi || ' mesi', da, fino, 'attivo', p_stripe_id);
  return json_build_object('ok', true, 'fino', fino);
end $$;

--
-- Name: sponsor_request(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sponsor_request(p jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); n int; sid uuid; nm text := left(trim(coalesce(p->>'name','')), 80); sl text;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per iscrivere la tua attività'); end if;
  if length(nm) < 2 then return json_build_object('ok', false, 'msg', 'Scrivi il nome dell''attività'); end if;
  select count(*) into n from public.sponsors where richiesto_da = me and stato = 'in_attesa';
  if n > 0 then return json_build_object('ok', false, 'msg', 'Hai già una richiesta in attesa: INDZ la sta controllando'); end if;
  select count(*) into n from public.sponsors where richiesto_da = me;
  if n >= 5 then return json_build_object('ok', false, 'msg', 'Troppe richieste da questo account: scrivi a INDZ'); end if;
  sl := trim(both '-' from regexp_replace(lower(nm), '[^a-z0-9]+', '-', 'g')) || '-' || left(md5(random()::text), 4);
  insert into public.sponsors(slug, name, logo_text, category, package, address, comune, lat, lon, phone, whatsapp, website, instagram, facebook,
                              tiktok, google_url, orari, descrizione, active, stato, visibility, richiesto_da, richiesto_il)
  values (sl, nm, left(coalesce(nullif(p->>'logo',''), upper(left(nm, 2))), 3), left(coalesce(nullif(p->>'category',''), 'Attività'), 60), 'vetrina',
          left(p->>'address', 160), left(p->>'comune', 80), nullif(p->>'lat','')::double precision, nullif(p->>'lon','')::double precision,
          left(p->>'phone', 40), left(p->>'whatsapp', 40), left(p->>'website', 200), left(p->>'instagram', 200), left(p->>'facebook', 200),
          left(p->>'tiktok', 200), left(p->>'google_url', 300), left(p->>'orari', 300), left(p->>'descrizione', 600),
          false, 'in_attesa', 'normale', me, now())
  returning id into sid;
  insert into public.sponsor_users(sponsor_id, user_id) values (sid, me);
  if length(trim(coalesce(p->>'offer',''))) > 1 then
    insert into public.offers(sponsor_id, title, details, active) values (sid, left(trim(p->>'offer'), 120), left(p->>'offer_details', 400), true);
  end if;
  return json_build_object('ok', true, 'id', sid, 'msg', 'Richiesta inviata: INDZ la controlla e la attiva');
end $$;

--
-- Name: sponsor_scadenze(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sponsor_scadenze() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int;
begin
  update public.subscriptions set status = 'scaduto' where status = 'attivo' and ends_on < current_date;
  update public.sponsors set visibility = 'normale' where visibility = 'evidenza' and valid_to is not null and valid_to < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

--
-- Name: sponsors_guard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sponsors_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  new.id := old.id; new.slug := old.slug; new.package := old.package; new.founder := old.founder;
  new.active := old.active; new.stato := old.stato; new.visibility := old.visibility;
  new.valid_from := old.valid_from; new.valid_to := old.valid_to; new.created_at := old.created_at;
  new.richiesto_da := old.richiesto_da; new.richiesto_il := old.richiesto_il;
  new.lat := old.lat; new.lon := old.lon; new.category := old.category; new.name := old.name;
  return new;
end $$;

--
-- Name: w_ab(jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_ab(p_abil jsonb, p_k text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select least(5, greatest(0, coalesce((p_abil->>p_k)::int, 0))); $$;

--
-- Name: w_alleanza_chiudi(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_alleanza_chiudi(p_id bigint) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: w_alleanza_di(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_alleanza_di(p_user uuid) RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select alleanza_id from public.world_alleanze_membri where user_id = p_user order by dal limit 1; $$;

--
-- Name: w_allies_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_allies_of(p_user uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: w_ally_state(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_ally_state(a uuid, b uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when public.w_are_allies(a, b) then 'ok'
    when exists (select 1 from public.world_allies x where x.requester = a and x.target = b and x.status = 'pending') then 'out'
    when exists (select 1 from public.world_allies x where x.requester = b and x.target = a and x.status = 'pending') then 'in'
    else 'none' end; $$;

--
-- Name: w_ancora(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_ancora(p_user uuid, p_aid bigint) RETURNS TABLE(lat double precision, lon double precision)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select c.lat, c.lon from (select h.lat, h.lon from public.world_homes h where h.user_id = p_user union all select b.lat, b.lon from public.world_buildings b where b.owner = p_user) c
  where coalesce(public.w_dist_alleanza(p_aid, c.lat, c.lon), 999) <= 50 and public.w_zona_libera(p_user, c.lat, c.lon, p_aid)
  order by public.w_dist_alleanza(p_aid, c.lat, c.lon) limit 1; $$;

--
-- Name: w_are_allies(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_are_allies(a uuid, b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select a <> b and not public.w_rift(a, b) and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = a and mb.user_id = b)
    or exists (select 1 from public.world_help_given g where ((g.helper = a and g.target = b) or (g.helper = b and g.target = a)) and g.created_at > now() - interval '30 days')
    or exists (select 1 from public.profili_pubblici p where p.user_id = b and p.invitato_da = left(a::text,8))
    or exists (select 1 from public.profili_pubblici p where p.user_id = a and p.invitato_da = left(b::text,8))
    or public.w_coinq(a, b)); $$;

--
-- Name: w_assalti_tick(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_assalti_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare pid text := public.w_slot_id(public.w_prev_slot(now())); r record; b public.world_buildings; held boolean; top uuid; refund int; n int := 0;
  vw public.world_wallet; tl int; tc int; tf int; tm int;
begin
  for r in select a.bid, a.slot_id, max(a.vittima::text)::uuid as vittima from public.world_assalti a
           where a.kind = 'atk' and a.slot_id <= pid and a.bid not like 'pres:%' and a.created_at > now() - interval '3 days'
             and not exists (select 1 from public.world_assalti_esiti e where e.bid = a.bid and e.slot_id = a.slot_id)
           group by a.bid, a.slot_id limit 50 loop
    insert into public.world_assalti_esiti(bid, slot_id, held, esito) values (r.bid, r.slot_id, true, 'in_corso') on conflict do nothing;
    if not found then continue; end if;
    select a.user_id into top from public.world_assalti a where a.bid = r.bid and a.slot_id = r.slot_id and a.kind = 'atk' order by a.pts desc, a.created_at limit 1;
    if r.vittima is not null then
      -- casa vera incustodita: saccheggio
      held := coalesce(public.w_home_held(r.vittima, r.slot_id), true);
      if held then
        update public.world_assalti_esiti set esito = 'respinto', perdente = r.vittima where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('respinto', r.vittima, top, null, null, 'casa');
      else
        vw := public.w_wallet(r.vittima);
        tl := least(60, floor(vw.legno * 0.25)::int); tc := least(60, floor(vw.cibo * 0.25)::int); tf := least(60, floor(vw.carb * 0.25)::int); tm := least(50, floor(vw.mattoni * 0.10)::int);
        update public.world_wallet set legno = legno - tl, cibo = cibo - tc, carb = carb - tf, mattoni = mattoni - tm where user_id = r.vittima;
        perform public.w_wallet(top);
        update public.world_wallet set legno = legno + tl, cibo = cibo + tc, carb = carb + tf, mattoni = mattoni + tm where user_id = top;
        if tm > 0 then
          insert into public.world_log(user_id, delta, reason, seen) values (r.vittima, -tm, 'Casa saccheggiata da @' || public.w_nick(top), false);
          insert into public.world_log(user_id, delta, reason, seen) values (top, tm, 'Bottino del saccheggio', false);
        end if;
        update public.world_assalti_esiti set held = false, esito = 'saccheggio', vincitore = top, perdente = r.vittima where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('saccheggio', top, r.vittima, null, null, tm || ',' || tl || ',' || tc || ',' || tf);
      end if;
    else
      select * into b from public.world_buildings where building_id = r.bid for update;
      if b.owner is null then
        update public.world_assalti_esiti set esito = 'vuota' where bid = r.bid and slot_id = r.slot_id; continue; end if;
      held := public.w_power3(b.level, public.w_upower(b.owner, r.slot_id) + public.w_pres_bonus(r.bid, r.slot_id) + public.w_casa_extra(r.bid, r.slot_id), false)
              >= public.w_attack3(r.slot_id, r.bid, public.w_lvl_of(b.owner));
      if held or top is null or top = b.owner then
        update public.world_assalti_esiti set esito = 'respinto', perdente = b.owner where bid = r.bid and slot_id = r.slot_id;
        if top is not null then perform public.w_feed_add('respinto', b.owner, top, b.lat, b.lon, 'edificio'); end if;
      elsif (select count(*) from public.world_buildings x where x.owner = top) < public.w_max(public.w_lvl_of(top)) then
        refund := round(0.5 * (coalesce(b.paid,0) + coalesce(b.upgrades,0)));
        if refund > 0 then
          update public.world_wallet set mattoni = mattoni + refund where user_id = b.owner;
          insert into public.world_log(user_id, delta, reason, ref, seen) values (b.owner, refund, 'Casa conquistata da @' || public.w_nick(top) || ': ti torna metà della spesa', r.bid, false);
        end if;
        update public.world_buildings set owner = top, paid = 0, upgrades = 0, bought_at = now() where building_id = r.bid;
        delete from public.world_assalti where bid = r.bid and slot_id > r.slot_id;
        update public.world_assalti_esiti set held = false, esito = 'conquista', vincitore = top, perdente = b.owner where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('conquista', top, b.owner, b.lat, b.lon, 'casa');
        -- chi ha assaltato insieme a lui: 🧱 20
        perform public.w_pay(a.user_id, 20, 'Assalto riuscito insieme a @' || public.w_nick(top), r.bid)
          from public.world_assalti a where a.bid = r.bid and a.slot_id = r.slot_id and a.kind = 'atk' and a.user_id <> top;
      else
        perform public.w_pay(top, 40, 'Bottino dell''assalto (hai già il massimo di case)', r.bid); perform public.w_res(top, 20, 0, 0);
        update public.world_assalti_esiti set held = false, esito = 'bottino', vincitore = top, perdente = b.owner where bid = r.bid and slot_id = r.slot_id;
        perform public.w_feed_add('saccheggio', top, b.owner, b.lat, b.lon, '40,20,0,0');
      end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

--
-- Name: w_atk_b(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_atk_b(p_user uuid, p_mz text, p_bid text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select greatest(3, round((6 + 0.5 * public.w_lvl_of(p_user)) * public.w_mz_atk(p_mz) * (1 - least(0.6, 0.1 * public.w_fort(p_bid)))))::int; $$;

--
-- Name: w_atk_pts(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_atk_pts(a uuid, b uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with h as (select building_id from public.world_homes where user_id = b limit 1)
  select greatest(3, round((6 + 0.5 * public.w_lvl_of(a)) * public.w_mz_atk(public.w_mezzo(a))
           * (1 - least(0.6, 0.1 * coalesce((select public.w_def(h.building_id,'barricate') + public.w_def(h.building_id,'recinto') + public.w_def(h.building_id,'fossato') from h), 0)))))::int;
$$;

--
-- Name: w_attack3(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_attack3(p_slot text, p_bid text, p_lvl integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with v as (select least(greatest(p_lvl,1),30) as wl, public.w_slope(p_bid) as s, public.w_wxev(p_bid,p_slot) as ev,
                    coalesce(nullif(right(p_slot,2),'')::int, 21) as hh, get_byte(decode(md5(p_slot || p_bid), 'hex'), 0) % 50 as r)
  select (round((30 + 2*v.wl + v.r) * public.w_zm('walker', v.s, v.ev, v.hh) * (1 - 0.06*least(public.w_def(p_bid,'trappole'),3)))
          + coalesce((select sum(t.base * (1 + 0.03*v.wl) * public.w_zm(t.k, v.s, v.ev, v.hh)
                                 * (1 - 0.3*least(public.w_def(p_bid, t.dk),3)) * (1 - 0.15*least(public.w_def(p_bid, t.dk2),3)))
                      from public.w_ztypes() t where v.wl >= t.minl), 0))::int
  from v;
$$;

--
-- Name: w_attivita(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_attivita(p_user uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select count(distinct (l.created_at at time zone 'Europe/Rome')::date)::int from public.world_log l
  where l.user_id = p_user and l.created_at > now() - interval '30 days'; $$;

--
-- Name: w_azione(uuid, text, double precision, double precision, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_azione(me uuid, p_bid text, p_lat double precision, p_lon double precision, p_kind text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare t json; tipo text; own uuid; tb text; la double precision; lo double precision; w public.world_wallet; nid text := public.w_slot_id(public.w_next_slot(now()));
  d double precision; mz text; mzp text; carb int; eta int; sid text; pp int; why text; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); somma int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  t := public.w_target(p_bid, p_lat, p_lon); tipo := t->>'tipo';
  if tipo = 'none' then return json_build_object('ok',false,'msg','Qui non c''è niente da assaltare o difendere'); end if;
  tb := t->>'bid'; own := (t->>'owner')::uuid; la := (t->>'lat')::double precision; lo := (t->>'lon')::double precision;
  w := public.w_wallet(me);
  if p_kind = 'assi' then
    if tipo = 'pres' and own is null then return json_build_object('ok',false,'tipo',tipo,'msg','Il presidio è libero: occupalo prima'); end if;
    if own <> me and not public.w_are_allies(me, own) then return json_build_object('ok',false,'tipo',tipo,'msg','Le assi si inchiodano solo sulle tue case e su quelle degli alleati'); end if;
    somma := coalesce((select sum(pts) from public.world_assalti where bid = t->>'bid' and slot_id = nid and kind = 'assi'), 0);
    if somma >= 18 then return json_build_object('ok',false,'tipo',tipo,'msg','Già 3 file di assi per questa orda (+18)'); end if;
    if w.legno < 20 then return json_build_object('ok',false,'tipo',tipo,'msg','Servono 🪵 20 di legno (lo danno parchi e campi sportivi tenuti, le orde rette e l''accesso del giorno)'); end if;
    return json_build_object('ok',true,'tipo',tipo,'bid',tb,'owner',own,'slot',nid,'pts',6,'legno',20,'somma',somma);
  end if;
  if own is null then return json_build_object('ok',false,'tipo',tipo,'msg','Non lo tiene nessuno'); end if;
  d := public.w_dist_pt(me, la, lo);
  if d is null then return json_build_object('ok',false,'tipo',tipo,'msg','Serve una tua casa nel mondo'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); carb := public.w_mz_carb(mz, d);
  if p_kind = 'atk' then
    if own = me then return json_build_object('ok',false,'tipo',tipo,'msg','È tua'); end if;
    if tipo = 'home' and public.w_custodita(own) then return json_build_object('ok',false,'tipo',tipo,'msg','Casa vera custodita: chi ci abita è passato da lì negli ultimi 7 giorni. È intoccabile'); end if;
    if public.w_are_allies(me, own) then return json_build_object('ok',false,'tipo',tipo,'msg','È di un tuo alleato: puoi solo difenderla'); end if;
    if public.w_shielded(own) then return json_build_object('ok',false,'tipo',tipo,'msg','È di un nuovo arrivato: 15 giorni di scudo'); end if;
    if public.w_lvl_of(own) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'tipo',tipo,'msg','È molto più debole di te: è protetto'); end if;
    if exists (select 1 from public.world_assalti where bid = t->>'bid' and user_id = me and slot_id >= nid and kind = 'atk') then
      return json_build_object('ok',false,'tipo',tipo,'msg','La tua squadra è già in viaggio'); end if;
    if coalesce((w.caps->>('assalti:' || day))::int,0) >= 3 then return json_build_object('ok',false,'tipo',tipo,'msg','Oggi hai già fatto 3 assalti'); end if;
    pp := public.w_atk_b(me, mz, tb);
  elsif p_kind = 'aiuto' then
    if own = me then return json_build_object('ok',false,'tipo',tipo,'msg','È tua: inchioda le assi o chiedi agli alleati'); end if;
    if not public.w_are_allies(me, own) then return json_build_object('ok',false,'tipo',tipo,'msg','Si difendono solo gli alleati'); end if;
    if exists (select 1 from public.world_assalti where bid = t->>'bid' and user_id = me and slot_id >= nid and kind = 'aiuto') then
      return json_build_object('ok',false,'tipo',tipo,'msg','Sei già in viaggio per difenderla'); end if;
    pp := public.w_mz_help(mz) + public.w_dot(me);
  else return json_build_object('ok',false,'msg','Azione non valida'); end if;
  if d > least(20, public.w_mz_range(mz)) then
    why := 'È a ' || round(d::numeric,1) || ' km: ' || public.w_mz_nome(mz) || ' arrivi fino a ' || least(20, public.w_mz_range(mz)) || ' km'
      || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ', ne hai ' || w.carb || ')' when d > 20 then '' else '. Un mezzo più veloce in Bottega' end;
    return json_build_object('ok',false,'tipo',tipo,'msg',why,'dist_km',round(d::numeric,1),'mezzo',mz); end if;
  if p_kind = 'atk' and w.cibo < 10 then return json_build_object('ok',false,'tipo',tipo,'msg','Servono 🥫 10 di cibo per la squadra'); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); sid := public.w_slot_id(public.w_next_slot(now() + make_interval(mins => eta)));
  return json_build_object('ok',true,'tipo',tipo,'bid',tb,'owner',own,'dist_km',round(d::numeric,1),'mezzo',mz,'mezzo_pieno',mzp,'carb',carb,
    'cibo',case when p_kind = 'atk' then 10 else 0 end,'eta_min',eta,'slot',sid,'in_tempo',sid = nid,'pts',pp);
end $$;

--
-- Name: w_bad(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_bad(p_text text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select lower(p_text) ~ '(porc[oa] ?(dio|madonna)|dio ?(cane|porco|maiale|boia)|madonna ?(puttana|troia)|\mnegr[oaie]\M|\mfroc[io]|ricchion|\mterron[ei]\M|ti ammazzo|ti uccido|ti sgozzo|ti vengo a prendere|ammazzati|\mpedofil|\mstupr|\mnazist)';
$$;

--
-- Name: w_boost(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_boost(p_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(public.w_lvl_of(p_user) < public.w_median_near(p_user), false);
$$;

--
-- Name: w_canon(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_canon(p_bid text, p_lat double precision, p_lon double precision) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select b.building_id from public.world_buildings b where b.building_id = split_part(p_bid,'#',1)),
    (select x.bid from (
       select b.building_id as bid, public.w_km(p_lat,p_lon,b.lat,b.lon) as d from public.world_buildings b
        where position('#' in b.building_id) = 0 and b.lat between p_lat-0.00005 and p_lat+0.00005 and b.lon between p_lon-0.00007 and p_lon+0.00007
       union all
       select split_part(h.building_id,'#',1), public.w_km(p_lat,p_lon,h.lat,h.lon) from public.world_homes h
        where h.lat between p_lat-0.00005 and p_lat+0.00005 and h.lon between p_lon-0.00007 and p_lon+0.00007
     ) x where x.d <= 0.004 order by x.d limit 1),
    split_part(p_bid,'#',1));
$$;

--
-- Name: w_casa_extra(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_casa_extra(p_bid text, p_slot text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select (least(18, coalesce(sum(pts) filter (where kind = 'assi'), 0)) + least(24, coalesce(sum(pts) filter (where kind = 'aiuto'), 0))
        - least(40, coalesce(sum(pts) filter (where kind = 'atk'), 0)))::int
  from public.world_assalti where bid = p_bid and slot_id = p_slot; $$;

--
-- Name: w_casa_manca_tick(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_casa_manca_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int;
begin
  insert into public.world_feed(kind, actor, target, info)
    select 'casa_manca', null, p.user_id, null from public.profili_pubblici p
    where p.indice is not null
      and exists (select 1 from auth.users u where u.id = p.user_id)
      and not exists (select 1 from public.world_homes h where h.user_id = p.user_id)
      and not exists (select 1 from public.world_feed f where f.target = p.user_id and f.kind = 'casa_manca' and f.created_at > now() - interval '3 days');
  get diagnostics n = row_count;
  return n;
end $$;

--
-- Name: w_cella(double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_cella(p_lat double precision, p_lon double precision) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select floor(p_lat / 0.05)::int || ':' || floor(p_lon / 0.07)::int; $$;

--
-- Name: w_cleanup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_cleanup() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r record;
begin
  for r in select b.* from public.world_buildings b
     where b.owner is not null and not exists (select 1 from public.profili_pubblici p where p.user_id = b.owner and p.seen_at > now() - interval '30 days')
       and coalesce(b.bought_at, now()) < now() - interval '30 days' limit 50 loop
    perform public.w_pay(r.owner, ((r.paid + r.upgrades) / 2), 'Casa liberata per inattività: rimborso 50%', r.building_id);
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = r.building_id;
  end loop;
end $$;

--
-- Name: w_coinq(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_coinq(p_a uuid, p_b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(p_a <> p_b and not public.w_rift(p_a, p_b) and exists (select 1 from public.world_homes a, public.world_homes b where a.user_id = p_a and b.user_id = p_b
    and (a.building_id = b.building_id or public.w_km(a.lat,a.lon,b.lat,b.lon) < 0.025)), false); $$;

--
-- Name: w_condo_admin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_condo_admin(p_ckey text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select g.user_id from public.world_condo_gifts g where g.ckey = p_ckey and g.created_at > now() - interval '30 days' and g.user_id is not null
  group by g.user_id order by sum(g.amount) desc, g.user_id limit 1; $$;

--
-- Name: w_condo_bonus(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_condo_bonus(p_user uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with k as (select public.w_condo_key(p_user) as ck)
  select case when exists (select 1 from public.world_condo_gifts g, k where g.ckey = k.ck and g.user_id = p_user and g.created_at > now() - interval '30 days')
    then (coalesce((select 3 * sum(c.level) from public.world_condo c, k where c.ckey = k.ck), 0)
          * case when (select public.w_condo_admin(ck) from k) = p_user then 2 else 1 end)::int else 0 end; $$;

--
-- Name: w_condo_key(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_condo_key(p_user uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select min(split_part(o.building_id,'#',1)) from public.world_homes m join public.world_homes o
    on o.kind = 'condominio' and (split_part(o.building_id,'#',1) = split_part(m.building_id,'#',1) or public.w_km(o.lat,o.lon,m.lat,m.lon) < 0.025)
  where m.user_id = p_user and m.kind = 'condominio';
$$;

--
-- Name: w_condo_vicini(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_condo_vicini(p_a uuid, p_b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p_a <> p_b and public.w_condo_key(p_a) is not null and public.w_condo_key(p_a) = public.w_condo_key(p_b)
    and coalesce((select lower(btrim(coalesce(h.unit,''))) from public.world_homes h where h.user_id = p_a), '') is distinct from
        coalesce((select lower(btrim(coalesce(h.unit,''))) from public.world_homes h where h.user_id = p_b), '')
    and coalesce((select lower(btrim(coalesce(h.unit,''))) from public.world_homes h where h.user_id = p_a), '') <> ''; $$;

--
-- Name: w_custodita(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_custodita(p_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select h.status = 'pending' or coalesce(h.presente_at, now()) > now() - interval '7 days' from public.world_homes h where h.user_id = p_user), true); $$;

--
-- Name: w_def(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_def(p_bid text, p_kind text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select level from public.world_defs where building_id = p_bid and kind = p_kind), 0);
$$;

--
-- Name: w_dist_alleanza(bigint, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_dist_alleanza(p_aid bigint, p_lat double precision, p_lon double precision) RETURNS double precision
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select min(public.w_km(m.lat, m.lon, p_lat, p_lon)) from public.world_alleanze_membri m where m.alleanza_id = p_aid and m.lat is not null; $$;

--
-- Name: w_dist_km(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_dist_km(a uuid, b uuid) RETURNS double precision
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with ca as (select lat, lon from public.world_homes where user_id = a union all select lat, lon from public.world_buildings where owner = a),
       cb as (select lat, lon from public.world_homes where user_id = b union all select lat, lon from public.world_buildings where owner = b)
  select min(public.w_km(ca.lat, ca.lon, cb.lat, cb.lon)) from ca, cb;
$$;

--
-- Name: w_dist_pt(uuid, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_dist_pt(p_user uuid, p_lat double precision, p_lon double precision) RETURNS double precision
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select min(public.w_km(x.lat, x.lon, p_lat, p_lon)) from (
    select lat, lon from public.world_homes where user_id = p_user union all select lat, lon from public.world_buildings where owner = p_user) x; $$;

--
-- Name: w_dot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_dot(p_user uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select least(3, greatest(0, coalesce((select (caps->>'dotazioni')::int from public.world_wallet where user_id = p_user), 0)));
$$;

--
-- Name: w_en_add(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_en_add(p_user uuid, p_n integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s public.world_superstite;
begin
  if coalesce(p_n,0) <= 0 then return; end if;
  s := public.w_sup(p_user);
  update public.world_superstite set energia = least(public.w_en_max(s.abil) + 5, energia + p_n) where user_id = p_user;
end $$;

--
-- Name: w_en_max(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_en_max(p_abil jsonb) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 10 + public.w_ab(p_abil, 'resistenza'); $$;

--
-- Name: w_en_ric(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_en_ric(p_abil jsonb) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 120 - 10 * public.w_ab(p_abil, 'resistenza'); $$;

--
-- Name: w_eq(jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_eq(p_equip jsonb, p_k text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select least(3, greatest(0, coalesce((p_equip->>p_k)::int, 0))); $$;

--
-- Name: w_eventi_tick(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_eventi_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: w_feed_add(text, uuid, uuid, double precision, double precision, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_feed_add(p_kind text, p_actor uuid, p_target uuid, p_lat double precision, p_lon double precision, p_info text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare la double precision := p_lat; lo double precision := p_lon;
begin
  if la is null then select h.lat, h.lon into la, lo from public.world_homes h where h.user_id = p_actor; end if;
  insert into public.world_feed(kind, actor, target, lat, lon, info)
    values (p_kind, p_actor, p_target, round(la::numeric,2)::double precision, round(lo::numeric,2)::double precision, p_info);
end $$;

--
-- Name: w_fort(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_fort(p_bid text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when p_bid like 'pres:%' then 2 * public.w_pres_liv(substr(p_bid, 6), 'torretta')
    else public.w_def(p_bid,'barricate') + public.w_def(p_bid,'recinto') + public.w_def(p_bid,'fossato') end; $$;

--
-- Name: w_grado(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_grado(p_xp integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select least(50, 1 + floor(sqrt(greatest(coalesce(p_xp,0),0) / 50.0))::int); $$;

--
-- Name: w_grado_xp(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_grado_xp(p_g integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 50 * (greatest(p_g,1) - 1) * (greatest(p_g,1) - 1); $$;

--
-- Name: w_home_held(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_home_held(p_user uuid, p_slot text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.w_power3(coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), public.w_upower(p_user,p_slot) + public.w_condo_bonus(p_user) + public.w_pres_bonus(h.building_id,p_slot) + public.w_casa_extra(h.building_id,p_slot), true)
         >= public.w_attack3(p_slot, h.building_id, public.w_lvl_of(p_user))
  from public.world_homes h where h.user_id = p_user;
$$;

--
-- Name: w_home_known(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_home_known(p_me uuid, p_u uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p_u = p_me or public.w_are_allies(p_me, p_u) or public.w_coinq(p_me, p_u)
      or coalesce((select vis = 'tutti' from public.world_homes where user_id = p_u), false);
$$;

--
-- Name: w_in_alleanza(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_in_alleanza(p_user uuid, p_aid bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.world_alleanze_membri where user_id = p_user and alleanza_id = p_aid); $$;

--
-- Name: w_is_npc(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_is_npc(p_bid text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select get_byte(decode(md5('npc' || p_bid), 'hex'), 0) < 42;
$$;

--
-- Name: w_km(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_km(a_lat double precision, a_lon double precision, b_lat double precision, b_lon double precision) RETURNS double precision
    LANGUAGE sql IMMUTABLE
    AS $$
  select sqrt(power((b_lat-a_lat)*111.0,2) + power((b_lon-a_lon)*111.0*cos(radians(a_lat)),2));
$$;

--
-- Name: w_league(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_league(p_lvl integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case when p_lvl <= 5 then 'Bronzo' when p_lvl <= 12 then 'Argento' when p_lvl <= 20 then 'Oro' else 'Diamante' end;
$$;

--
-- Name: w_level(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_level(p_life integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 1 + floor(sqrt(greatest(p_life,0)/100.0))::int;
$$;

--
-- Name: w_lvl_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_lvl_of(p_user uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.w_level(coalesce((select lifetime from public.world_wallet where user_id = p_user),0));
$$;

--
-- Name: w_max(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_max(p_lvl integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 2 + p_lvl / 2;
$$;

--
-- Name: w_median_near(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_median_near(p_user uuid) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (select lat, lon from public.world_homes where user_id = p_user),
  v as (select public.w_level(w.lifetime) as l from public.world_wallet w join public.world_homes h on h.user_id = w.user_id, me
        where w.user_id <> p_user and h.lat between me.lat - 0.18 and me.lat + 0.18 and h.lon between me.lon - 0.25 and me.lon + 0.25
          and exists (select 1 from public.profili_pubblici p where p.user_id = w.user_id and p.seen_at > now() - interval '30 days'))
  select case when count(*) >= 3 then percentile_cont(0.5) within group (order by l)::numeric end from v;
$$;

--
-- Name: w_mezzo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mezzo(p_user uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with w as (select coalesce(caps->>'mezzo_vero','piedi') as v, coalesce(caps->>'mezzo_comprato','piedi') as c from public.world_wallet where user_id = p_user)
  select coalesce((select case when public.w_mz_rank(c) > public.w_mz_rank(v) then c else v end from w), 'piedi');
$$;

--
-- Name: w_mz_atk(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_atk(p text) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p when 'bici' then 0.9 when 'moto' then 1.0 when 'auto' then 1.2 when 'fuori' then 1.3 else 0.8 end::numeric; $$;

--
-- Name: w_mz_carb(text, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_carb(p_mz text, p_km double precision) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select ceil(greatest(coalesce(p_km,0),0) * case p_mz when 'moto' then 1 when 'auto' then 1.5 when 'fuori' then 2 else 0 end)::int; $$;

--
-- Name: w_mz_eff(uuid, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_eff(p_user uuid, p_km double precision) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with m as (select public.w_mezzo(p_user) as mz, coalesce((select carb from public.world_wallet where user_id = p_user), 0) as carb,
                    coalesce((select caps->>'mezzo_vero' from public.world_wallet where user_id = p_user), 'piedi') as vero)
  select case when public.w_mz_carb(mz, p_km) <= carb then mz when vero = 'bici' then 'bici' else 'piedi' end from m; $$;

--
-- Name: w_mz_help(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_help(p text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p when 'bici' then 5 when 'moto' then 6 when 'auto' then 8 when 'fuori' then 10 else 4 end; $$;

--
-- Name: w_mz_nome(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_nome(p_mz text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p_mz when 'bici' then 'in bici' when 'moto' then 'in moto' when 'auto' then 'in auto' when 'fuori' then 'in fuoristrada' else 'a piedi' end; $$;

--
-- Name: w_mz_range(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_range(p text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p when 'bici' then 5 when 'moto' then 12 when 'auto' then 20 when 'fuori' then 20 else 2 end; $$;

--
-- Name: w_mz_rank(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_rank(p text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p when 'bici' then 1 when 'moto' then 2 when 'auto' then 3 when 'fuori' then 4 else 0 end; $$;

--
-- Name: w_mz_speed(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_mz_speed(p text) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  select case p when 'bici' then 15 when 'moto' then 40 when 'auto' then 50 when 'fuori' then 45 else 5 end::numeric; $$;

--
-- Name: w_next_slot(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_next_slot(p_ts timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    AS $$
  select min(t) from (
    select ((date_trunc('day', p_ts at time zone 'Europe/Rome') + d * interval '1 day' + h * interval '1 hour') at time zone 'Europe/Rome') as t
    from (values (0),(1)) dd(d), (values (9),(21)) hh(h)) x
  where t > p_ts;
$$;

--
-- Name: w_nick(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_nick(p_user uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select nick from public.profili_pubblici where user_id = p_user), 'superstite');
$$;

--
-- Name: w_pay(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pay(p_user uuid, p_delta integer, p_reason text, p_ref text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare extra int; inv uuid; pad int;
begin
  perform public.w_wallet(p_user);
  update public.world_wallet set mattoni = mattoni + p_delta, lifetime = lifetime + greatest(p_delta, 0) where user_id = p_user;
  insert into public.world_log(user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  if p_delta > 0 then perform public.w_xp(p_user, greatest(1, p_delta / 4)); end if;
  if p_delta > 0 and p_reason in ('Notte vinta','Missione del giorno','Accesso del giorno','Orda del mondo: premi','Affitti delle tue case','Rinforzi mandati a un alleato') then
    -- 3) spinta di recupero: chi è sotto il livello medio della zona guadagna il 50% in più
    if public.w_boost(p_user) then
      extra := floor(p_delta * 0.5);
      if extra > 0 then
        update public.world_wallet set mattoni = mattoni + extra, lifetime = lifetime + extra where user_id = p_user;
        insert into public.world_log(user_id, delta, reason, ref, seen) values (p_user, extra, 'Spinta di recupero +50%', p_ref, true);
      end if;
    end if;
    -- 6) padrino: nei primi 14 giorni chi ti ha invitato riceve il 10% in più (non lo togliamo a te)
    select q.user_id into inv from public.profili_pubblici p join public.profili_pubblici q on left(q.user_id::text,8) = p.invitato_da
      where p.user_id = p_user and p.invitato_da is not null and q.user_id <> p_user
        and (select created_at from auth.users where id = p_user) > now() - interval '14 days' limit 1;
    pad := floor(p_delta * 0.1);
    if inv is not null and pad > 0 then
      perform public.w_wallet(inv);
      update public.world_wallet set mattoni = mattoni + pad where user_id = inv;
      insert into public.world_log(user_id, delta, reason, ref) values (inv, pad, 'Padrino: il tuo invitato sta giocando', p_ref);
    end if;
  end if;
end $$;

--
-- Name: w_perche_no(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_perche_no(p_user uuid, p_aid bigint) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case
    when public.w_in_alleanza(p_user, p_aid) then 'È già in questa alleanza'
    when (select count(*) from public.world_alleanze_membri where user_id = p_user) >= 3 then 'Ha già 3 alleanze (il massimo)'
    when not exists (select 1 from (select h.lat, h.lon from public.world_homes h where h.user_id = p_user union all select b.lat, b.lon from public.world_buildings b where b.owner = p_user) c
                     where coalesce(public.w_dist_alleanza(p_aid, c.lat, c.lon), 999) <= 50) then 'Serve una casa entro 50 km dalla casa di un membro'
    when not public.w_vicino_alleanza(p_user, p_aid) then 'In quella zona c''è già un''altra sua alleanza: le alleanze devono stare a più di 50 km l''una dall''altra'
    end; $$;

--
-- Name: w_piazza_nuovi(uuid, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_piazza_nuovi(p_user uuid, p_since timestamp with time zone, p_mode text) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with z as (select 'z:' || round(h.lat::numeric,1) || ':' || round(h.lon::numeric,1) as room from public.world_homes h where h.user_id = p_user),
  m as (select c.id, c.user_id, c.body, c.room from public.world_chat c
         where c.created_at > p_since and not c.hidden and c.user_id is distinct from p_user
           and (c.room in (select room from z) or (p_mode = 'tutto' and c.room = 'mondo'))
           and not exists (select 1 from public.world_blocks b where b.user_id = p_user and b.blocked = c.user_id))
  select json_build_object('n', (select count(*) from m),
    'nick', (select public.w_nick(m.user_id) from m order by m.id desc limit 1),
    'body', (select left(m.body, 90) from m order by m.id desc limit 1),
    'zona', (select bool_or(m.room <> 'mondo') from m));
$$;

--
-- Name: w_power3(integer, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_power3(p_level integer, p_bonus integer, p_home boolean) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 45 + 12 * greatest(p_level,1) + p_bonus + (case when p_home then 5 else 0 end);
$$;

--
-- Name: w_pres_attack(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_attack(p_slot text, p_id text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select 50 + get_byte(decode(md5(p_slot || 'presidio' || p_id), 'hex'), 0) % 50;
$$;

--
-- Name: w_pres_bonus(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_bonus(p_bid text, p_slot text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with c as (select coalesce((select b.lat from public.world_buildings b where b.building_id = p_bid), (select h.lat from public.world_homes h where h.building_id = p_bid limit 1)) as lat,
                    coalesce((select b.lon from public.world_buildings b where b.building_id = p_bid), (select h.lon from public.world_homes h where h.building_id = p_bid limit 1)) as lon,
                    public.w_slot_t(p_slot) as t)
  select least(10, coalesce(sum((select case when min(t.dal) <= c.t - interval '7 days' then 5 else 3 end from public.world_presidi_tenute t
                                  where t.presidio_id = p.id and t.dal < c.t and (t.al is null or t.al >= c.t))), 0))::int
  from c join public.world_presidi p on p.lat between c.lat - 0.005 and c.lat + 0.005 and public.w_km(c.lat, c.lon, p.lat, p.lon) <= 0.5
  where exists (select 1 from public.world_presidi_tenute t where t.presidio_id = p.id and t.dal < c.t and (t.al is null or t.al >= c.t)); $$;

--
-- Name: w_pres_def(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_def(p_id text, p_slot text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select 55 + 8 * public.w_pres_liv(p_id, 'mura')
       + 12 * least(5, (select count(*) from public.world_presidi_guardie g where g.presidio_id = p_id and g.slot_id = p_slot))::int
       + public.w_casa_extra('pres:' || p_id, p_slot); $$;

--
-- Name: w_pres_liv(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_liv(p_id text, p_kind text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select level from public.world_pres_defs where presidio_id = p_id and kind = p_kind), 0); $$;

--
-- Name: w_pres_near(uuid, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_near(p_user uuid, p_lat double precision, p_lon double precision, p_km double precision) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.world_homes h where h.user_id = p_user and h.lat between p_lat - p_km/100 and p_lat + p_km/100 and public.w_km(h.lat, h.lon, p_lat, p_lon) <= p_km)
      or exists (select 1 from public.world_buildings b where b.owner = p_user and b.lat between p_lat - p_km/100 and p_lat + p_km/100 and public.w_km(b.lat, b.lon, p_lat, p_lon) <= p_km);
$$;

--
-- Name: w_pres_rendita(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_rendita(p_user uuid, p_kind text, p_record integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r int := greatest(coalesce(p_record,1),1); a int := 40 + least(40, 4 * greatest(coalesce(p_record,1),1));
begin
  if p_user is null then return; end if;
  if p_kind in ('parco','sport') then perform public.w_res(p_user, a, 0, 0);
  elsif p_kind in ('piazza','centro','chiesa') then perform public.w_res(p_user, 0, a, 0);
  elsif p_kind in ('stazione','polizia','pompieri') then perform public.w_res(p_user, 0, 0, a);
  else perform public.w_pay(p_user, 30 + least(30, 2 * r), 'Presidio tenuto'); end if;
end $$;

--
-- Name: w_pres_tick(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_pres_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare pt timestamptz := public.w_prev_slot(now()); pid text := public.w_slot_id(public.w_prev_slot(now())); p record; n int := 0; top uuid;
begin
  for p in select * from public.world_presidi where holder is not null and coalesce(ultimo_slot, '') < pid and held_since < pt for update skip locked loop
    if public.w_pres_def(p.id, pid) >= public.w_pres_attack(pid, p.id) then
      update public.world_presidi set ultimo_slot = pid, record = record + 1 where id = p.id;
      perform public.w_pres_rendita(p.holder, p.kind, p.record + 1);
      insert into public.world_assalti_esiti(bid, slot_id, held, esito, perdente) select 'pres:' || p.id, pid, true, 'respinto', p.holder
        where exists (select 1 from public.world_assalti a where a.bid = 'pres:' || p.id and a.slot_id = pid and a.kind = 'atk') on conflict do nothing;
    else
      update public.world_presidi_tenute set al = pt where presidio_id = p.id and al is null;
      -- le fortificazioni fisse escono danneggiate: −1 livello ciascuna
      update public.world_pres_defs set level = greatest(0, level - 1) where presidio_id = p.id;
      select a.user_id into top from public.world_assalti a where a.bid = 'pres:' || p.id and a.slot_id = pid and a.kind = 'atk' and a.user_id <> p.holder
        order by a.pts desc, a.created_at limit 1;
      if top is not null and (select count(*) from public.world_presidi where holder = top) < 3 then
        update public.world_presidi set ultimo_slot = pid, holder = top, held_since = now(), record = 0, perso_da = p.holder, perso_il = pt where id = p.id;
        insert into public.world_presidi_tenute(presidio_id, user_id, dal) values (p.id, top, now());
        perform public.w_feed_add('conquista', top, p.holder, p.lat, p.lon, 'presidio:' || p.name);
        insert into public.world_assalti_esiti(bid, slot_id, held, esito, vincitore, perdente) values ('pres:' || p.id, pid, false, 'conquista', top, p.holder) on conflict do nothing;
      else
        update public.world_presidi set ultimo_slot = pid, holder = null, held_since = null, record = 0, perso_da = p.holder, perso_il = pt where id = p.id;
      end if;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

--
-- Name: w_prev_slot(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_prev_slot(p_ts timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    AS $$
  select max(t) from (
    select ((date_trunc('day', p_ts at time zone 'Europe/Rome') + d * interval '1 day' + h * interval '1 hour') at time zone 'Europe/Rome') as t
    from (values (-1),(0)) dd(d), (values (9),(21)) hh(h)) x
  where t <= p_ts;
$$;

--
-- Name: w_price(double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_price(p_lat double precision, p_lon double precision) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select least(2000, 200 + 25 * (select count(*) from public.world_buildings b
     where b.owner is not null and b.lat between p_lat-0.009 and p_lat+0.009 and b.lon between p_lon-0.013 and p_lon+0.013))::int;
$$;

--
-- Name: w_price2(uuid, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_price2(p_user uuid, p_lat double precision, p_lon double precision) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select least(9000, round(
    (public.w_price(p_lat,p_lon) + coalesce((select (floor(public.w_km(h.lat,h.lon,p_lat,p_lon)/50)*10)::int from public.world_homes h where h.user_id = p_user),0))
    * (1 + 0.10 * (select count(*) from public.world_buildings b where b.owner = p_user))))::int;
$$;

--
-- Name: w_radius(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_radius(p_lvl integer) RETURNS double precision
    LANGUAGE sql IMMUTABLE
    AS $$
  select case when p_lvl >= 50 then 20000 when p_lvl >= 30 then 300 when p_lvl >= 20 then 100 else greatest(1, p_lvl) end::double precision;
$$;

--
-- Name: w_raid_houses(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_raid_houses(p_user uuid, p_slot_t timestamp with time zone) RETURNS TABLE(building_id text, lat double precision, lon double precision, level integer, home boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select h.building_id, h.lat, h.lon, coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), true
    from public.world_homes h where h.user_id = p_user and h.first_at <= p_slot_t
  union all
  select b.building_id, b.lat, b.lon, b.level, false from public.world_buildings b
    where b.owner = p_user and b.bought_at is not null and b.bought_at <= p_slot_t;
$$;

--
-- Name: w_res(uuid, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_res(p_user uuid, p_legno integer, p_cibo integer, p_carb integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  gl int; gc int; gf int;
begin
  if p_user is null then return json_build_object('legno',0,'cibo',0,'carb',0); end if;
  w := public.w_wallet(p_user);
  gl := least(greatest(coalesce(p_legno,0),0), 400 - coalesce((w.caps->>('res:legno:'||day))::int,0));
  gc := least(greatest(coalesce(p_cibo,0),0),  400 - coalesce((w.caps->>('res:cibo:'||day))::int,0));
  gf := least(greatest(coalesce(p_carb,0),0),  400 - coalesce((w.caps->>('res:carb:'||day))::int,0));
  gl := greatest(gl,0); gc := greatest(gc,0); gf := greatest(gf,0);
  if gl + gc + gf = 0 then return json_build_object('legno',0,'cibo',0,'carb',0); end if;
  update public.world_wallet set legno = legno + gl, cibo = cibo + gc, carb = carb + gf,
    caps = caps || jsonb_build_object('res:legno:'||day, coalesce((w.caps->>('res:legno:'||day))::int,0) + gl,
                                      'res:cibo:'||day,  coalesce((w.caps->>('res:cibo:'||day))::int,0) + gc,
                                      'res:carb:'||day,  coalesce((w.caps->>('res:carb:'||day))::int,0) + gf)
    where user_id = p_user;
  return json_build_object('legno',gl,'cibo',gc,'carb',gf);
end $$;

--
-- Name: w_rift(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_rift(p_a uuid, p_b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.world_condo_rifts r where (r.a = p_a and r.b = p_b) or (r.a = p_b and r.b = p_a)); $$;

--
-- Name: w_room(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_room(p_room text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when p_room = 'mondo' then 'mondo'
    else coalesce((select 'z:' || round(h.lat::numeric,1) || ':' || round(h.lon::numeric,1) from public.world_homes h where h.user_id = auth.uid()), 'mondo') end;
$$;

--
-- Name: w_score(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_score(p_user uuid, p_week boolean) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int := case when p_week then 14 else 30 end; days int := case when p_week then 7 else 30 end;
  base timestamptz := public.w_next_slot(now()); h public.world_homes; held int := 0; tot int := 0; g int; sid text;
  fort int; lvup int; ind numeric; helps int; al int; act int; earn bigint; since text;
  s_dif int; s_for int; s_casa int; s_sq int; s_cos int; s_cre int;
begin
  select * into h from public.world_homes where user_id = p_user;
  if h.user_id is not null and h.status = 'home' then
    for g in 1..n loop
      exit when base - make_interval(hours => 12*g) < coalesce(h.confirmed_at, h.first_at, now());
      sid := public.w_slot_id(base - make_interval(hours => 12*g)); tot := tot + 1;
      if coalesce(public.w_home_held(p_user, sid), false) then held := held + 1; end if;
    end loop;
  end if;
  s_dif := case when tot = 0 then 0 else round(300.0 * held / tot * least(1, tot / 4.0)) end;
  select coalesce(sum(d.level),0) into fort from public.world_defs d
   where d.building_id in (select building_id from public.world_homes where user_id = p_user union select building_id from public.world_buildings where owner = p_user);
  select coalesce(sum(greatest(b.level,1) - 1),0) into lvup from public.world_buildings b
   where b.owner = p_user or b.building_id = h.building_id;
  s_for := round(200 * least(1, (fort + 2 * lvup) / 30.0));
  select p.indice into ind from public.profili_pubblici p where p.user_id = p_user;
  s_casa := case when ind is null then 0 else round(150 * greatest(0, least(1, (10 - ind) / 10.0))) end;
  since := public.w_slot_id(now() - make_interval(days => days));
  helps := (select count(*) from public.world_help_given where helper = p_user and slot_id >= since)
         + (select count(*) from public.world_shields where giver = p_user and slot_id >= since);
  al := (select count(*) from public.w_allies_of(p_user));
  s_sq := round(100 * least(1, helps / (case when p_week then 5.0 else 20.0 end))) + round(50 * least(1, al / 5.0));
  select count(distinct (l.created_at at time zone 'Europe/Rome')::date) into act from public.world_log l
   where l.user_id = p_user and l.created_at > now() - make_interval(days => days);
  s_cos := round(100 * least(1, act::numeric / days));
  select coalesce(sum(l.delta),0) into earn from public.world_log l where l.user_id = p_user and l.delta > 0 and l.created_at > now() - make_interval(days => days)
    and l.reason not like 'Regalo%' and l.reason not like 'Prestito%' and l.reason not like 'Restituzione%' and l.reason not like 'Kit%' and l.reason not like 'Padrino%';
  s_cre := round(100 * least(1, earn / (case when p_week then 800.0 else 3000.0 end)));
  return json_build_object('tot', s_dif + s_for + s_casa + s_sq + s_cos + s_cre,
    'dif', s_dif, 'forte', s_for, 'casa', s_casa, 'squadra', s_sq, 'costanza', s_cos, 'crescita', s_cre,
    'held', held, 'orde', tot, 'fort', fort, 'lvup', lvup, 'indice', ind, 'helps', helps, 'alleati', al, 'giorni', act, 'giorni_max', days, 'mattoni', earn);
end $$;

--
-- Name: w_settimana(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_settimana(p_t timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    AS $$
  select (date_trunc('week', p_t at time zone 'Europe/Rome')) at time zone 'Europe/Rome'; $$;

--
-- Name: w_settle(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_settle(p_user uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r record;
begin
  for r in select * from public.world_bonus where owner = p_user and not paid and due_at <= now() loop
    if exists (select 1 from public.world_homes where user_id = r.claimant and building_id = r.building_id and status = 'home') then
      perform public.w_pay(r.owner, r.amount, 'Bonus: l’abitante è rimasto nella casa', r.building_id);
    end if;
    update public.world_bonus set paid = true where id = r.id;
  end loop;
end $$;

--
-- Name: w_settle_loans(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_settle_loans(p_user uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r record; bal int; take int;
begin
  for r in select * from public.world_gifts where kind = 'mattoni' and loan and left_due > 0 and due_at <= now()
             and (to_u = p_user or from_u = p_user) order by due_at limit 20 loop
    select mattoni into bal from public.world_wallet where user_id = r.to_u for update;
    take := least(coalesce(bal,0), r.left_due);
    if take > 0 then
      update public.world_wallet set mattoni = mattoni - take where user_id = r.to_u;
      insert into public.world_log(user_id, delta, reason, seen) values (r.to_u, -take, 'Prestito restituito a @' || public.w_nick(r.from_u), false);
      -- la restituzione non conta come guadagno: non fa salire di livello
      perform public.w_wallet(r.from_u);
      update public.world_wallet set mattoni = mattoni + take where user_id = r.from_u;
      insert into public.world_log(user_id, delta, reason) values (r.from_u, take, 'Prestito restituito da @' || public.w_nick(r.to_u));
      update public.world_gifts set left_due = left_due - take where id = r.id;
    end if;
  end loop;
end $$;

--
-- Name: w_sfida_premi(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sfida_premi() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: w_sfida_punti(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sfida_punti(p_user uuid, p_da timestamp with time zone, p_a timestamp with time zone) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select (coalesce((select sum(uccisi) from public.world_cacce where user_id = p_user and start_at >= p_da and start_at < p_a and uccisi is not null), 0) * 2
        + (select count(*) from public.world_spedizioni where user_id = p_user and stato = 'raccolta' and end_at >= p_da and end_at < p_a) * 5
        + (select count(*) from public.world_eventi_azioni where user_id = p_user and at >= p_da and at < p_a) * 10)::int; $$;

--
-- Name: w_shielded(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_shielded(p_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select u.created_at > now() - interval '15 days' from auth.users u where u.id = p_user), false)
     and coalesce((select (w.caps->>'scudo_off')::int from public.world_wallet w where w.user_id = p_user), 0) = 0; $$;

--
-- Name: w_slope(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_slope(p_bid text) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select greatest(-0.12, least(0.12, coalesce((select slope from public.world_terrain where building_id = p_bid), 0)))::numeric;
$$;

--
-- Name: w_slot_id(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_slot_id(p_t timestamp with time zone) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select to_char(p_t at time zone 'Europe/Rome', 'YYYY-MM-DD"-"HH24');
$$;

--
-- Name: w_slot_t(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_slot_t(p_slot text) RETURNS timestamp with time zone
    LANGUAGE sql STABLE
    AS $$
  select (to_timestamp(p_slot, 'YYYY-MM-DD-HH24')::timestamp) at time zone 'Europe/Rome';
$$;

--
-- Name: w_sped_calc(numeric, jsonb, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sped_calc(p_km numeric, p_abil jsonb, p_equip jsonb, p_notte boolean) RETURNS json
    LANGUAGE sql IMMUTABLE
    AS $$
  select json_build_object(
    'min', least(180, round(10 + 14 * p_km))::int,
    'energia', least(3, 1 + floor(p_km / 2.5))::int,
    'rischio', least(60, greatest(3, round(10 + 4 * p_km - 4 * public.w_ab(p_abil,'combattente') - 5 * public.w_eq(p_equip,'arma')
                 + case when p_notte and public.w_eq(p_equip,'torcia') = 0 then 10 else 0 end)))::int,
    'bottino', least(25 + 15 * public.w_eq(p_equip,'zaino'), round((10 + 6 * p_km) * (1 + 0.1 * public.w_ab(p_abil,'esploratore'))))::int,
    'xp', (10 + round(6 * p_km))::int,
    'tesoro', (5 + 3 * public.w_ab(p_abil,'cercatore') + 2 * public.w_eq(p_equip,'torcia'))::int); $$;

--
-- Name: w_sped_km(uuid, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sped_km(p_user uuid, p_lat double precision, p_lon double precision) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select round(min(public.w_km(p_lat, p_lon, x.lat, x.lon))::numeric, 2) from (
    select lat, lon from public.world_homes where user_id = p_user
    union all select lat, lon from public.world_buildings where owner = p_user) x; $$;

--
-- Name: w_sped_tick(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sped_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int;
begin
  with t as (update public.world_spedizioni set avvisato = true where stato = 'via' and not avvisato and end_at <= now() returning user_id, nome)
  insert into public.world_feed(kind, actor, target, info) select 'sped_ok', null, user_id, nome from t;
  get diagnostics n = row_count;
  return n;
end $$;

--
-- Name: world_superstite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_superstite (
    user_id uuid NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    abil jsonb DEFAULT '{}'::jsonb NOT NULL,
    equip jsonb DEFAULT '{}'::jsonb NOT NULL,
    energia integer DEFAULT 10 NOT NULL,
    energia_at timestamp with time zone DEFAULT now() NOT NULL,
    serie integer DEFAULT 0 NOT NULL,
    serie_day date,
    share_day date,
    inviti_reg integer,
    inviti_val integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    bombe integer DEFAULT 0 NOT NULL,
    scudi integer DEFAULT 0 NOT NULL
);

--
-- Name: w_sup(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sup(p_user uuid) RETURNS public.world_superstite
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s public.world_superstite; mx int; ric int; n int;
begin
  insert into public.world_superstite(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into s from public.world_superstite where user_id = p_user for update;
  mx := public.w_en_max(s.abil); ric := public.w_en_ric(s.abil);
  if s.energia >= mx then
    if s.energia_at < now() - interval '1 minute' then
      s.energia_at := now(); update public.world_superstite set energia_at = s.energia_at where user_id = p_user;
    end if;
  else
    n := floor(extract(epoch from (now() - s.energia_at)) / 60.0 / ric)::int;
    if n > 0 then
      if s.energia + n >= mx then s.energia := mx; s.energia_at := now();
      else s.energia := s.energia + n; s.energia_at := s.energia_at + make_interval(mins => n * ric); end if;
      update public.world_superstite set energia = s.energia, energia_at = s.energia_at where user_id = p_user;
    end if;
  end if;
  return s;
end $$;

--
-- Name: w_sup_inviti(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sup_inviti(p_user uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s public.world_superstite; reg int; val int; dr int; dv int;
begin
  s := public.w_sup(p_user);
  select count(*), count(*) filter (where indice is not null) into reg, val
    from public.profili_pubblici where invitato_da = left(p_user::text, 8) and user_id <> p_user;
  if s.inviti_reg is null then
    -- prima volta: gli amici di prima della 020 contano già (i loro 🧱 150 erano già stati dati), premio ridotto una volta sola
    update public.world_superstite set inviti_reg = reg, inviti_val = val, xp = xp + 50 * least(reg, 10) where user_id = p_user;
    return json_build_object('nuovi', 0, 'valutati', 0);
  end if;
  dr := least(10, greatest(0, reg - s.inviti_reg)); dv := least(10, greatest(0, val - coalesce(s.inviti_val, 0)));
  if dr + dv = 0 then return json_build_object('nuovi', 0, 'valutati', 0); end if;
  update public.world_superstite set inviti_reg = reg, inviti_val = val, xp = xp + 50 * dr + 150 * dv where user_id = p_user;
  if dr > 0 then perform public.w_en_add(p_user, 2 * dr); end if;
  perform public.w_res(p_user, 10 * dr + 20 * dv, 10 * dr + 20 * dv, 5 * dr + 10 * dv);
  return json_build_object('nuovi', dr, 'valutati', dv);
end $$;

--
-- Name: w_sup_raggio(integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_sup_raggio(p_xp integer, p_abil jsonb) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  select least(30, 3 + 1 * (public.w_grado(p_xp) - 1) + 1 * public.w_ab(p_abil, 'esploratore'))::numeric; $$;

--
-- Name: w_target(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_target(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare p public.world_presidi; b public.world_buildings; h public.world_homes; bid text;
begin
  if p_bid like 'pres:%' then
    select * into p from public.world_presidi where id = substr(p_bid, 6);
    if p.id is null then return json_build_object('tipo','none'); end if;
    return json_build_object('tipo','pres','bid','pres:' || p.id,'owner',p.holder,'lat',p.lat,'lon',p.lon,'level',1,'nome',p.name);
  end if;
  select * into h from public.world_homes where building_id = p_bid and status = 'home' limit 1;
  if h.user_id is not null then
    return json_build_object('tipo','home','bid',h.building_id,'owner',h.user_id,'lat',h.lat,'lon',h.lon,
      'level',coalesce((select level from public.world_buildings where building_id = h.building_id),1)); end if;
  bid := public.w_canon(p_bid, p_lat, p_lon);
  select * into b from public.world_buildings where building_id = bid and owner is not null;
  if b.building_id is null then return json_build_object('tipo','none'); end if;
  return json_build_object('tipo','owned','bid',b.building_id,'owner',b.owner,'lat',b.lat,'lon',b.lon,'level',b.level);
end $$;

--
-- Name: w_threats_of(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_threats_of(p_user uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; tr numeric; dt int; amin int; amax int; pb int; ex int;
begin
  if p_user is null then return '[]'::json; end if;
  wl := least(greatest(public.w_lvl_of(p_user),1),30); up := public.w_upower(p_user, nid); hh := coalesce(nullif(right(nid,2),'')::int,21);
  for h in
    select hm.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = hm.building_id),1) as lvl, hm.lat, hm.lon from public.world_homes hm where hm.user_id = p_user
    union all select bb.building_id, false, bb.level, bb.lat, bb.lon from public.world_buildings bb where bb.owner = p_user
  loop
    s := public.w_slope(h.bid); ev := public.w_wxev(h.bid, nid); mw := public.w_zm('walker', s, ev, hh); tr := 1 - 0.06*least(public.w_def(h.bid,'trappole'),3);
    select coalesce(json_agg(json_build_object('k', t.k, 'base', round(t.base*(1+0.03*wl),4), 'mod', round(public.w_zm(t.k,s,ev,hh),4),
             'dk', t.dk, 'dl', public.w_def(h.bid,t.dk), 'dk2', t.dk2, 'dl2', public.w_def(h.bid,t.dk2),
             'p', round(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))*(1-0.15*least(public.w_def(h.bid,t.dk2),3)),1)) order by t.minl), '[]'::json),
           coalesce(sum(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))*(1-0.15*least(public.w_def(h.bid,t.dk2),3))),0)
      into sp, ssum from public.w_ztypes() t where wl >= t.minl;
    pb := public.w_pres_bonus(h.bid, nid); ex := public.w_casa_extra(h.bid, nid);
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 + public.w_condo_bonus(p_user) else 0 end) + up + pb + ex;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up, 'pres', pb, 'extra', ex, 'condo', case when h.home then public.w_condo_bonus(p_user) else 0 end,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,4),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;

--
-- Name: w_tr_casa_pos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_tr_casa_pos() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.profili_pubblici set lat_r = lat_r where user_id = new.user_id and lat_r is not null;
  return new;
end $$;

--
-- Name: w_tr_dm(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_tr_dm() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin perform public.w_feed_add('dm', new.from_u, new.to_u, null, null, left(new.body, 60)); return new; end $$;

--
-- Name: w_tr_feed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_tr_feed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_table_name = 'world_homes' then
    if new.status = 'home' and (tg_op = 'INSERT' or old.status is distinct from 'home') then perform public.w_feed_add('join', new.user_id, null, new.lat, new.lon, null); end if;
  elsif tg_table_name = 'world_buildings' then
    if new.owner is not null and (tg_op = 'INSERT' or old.owner is distinct from new.owner) then perform public.w_feed_add('buy', new.owner, null, new.lat, new.lon, case when public.w_is_npc(new.building_id) then 'npc' end); end if;
  elsif tg_table_name = 'world_help' then
    perform public.w_feed_add('ask', new.user_id, null, null, null, null);
    insert into public.world_feed(kind, actor, target) select 'ask_ally', new.user_id, a from public.w_allies_of(new.user_id) a;
  elsif tg_table_name = 'world_help_given' then perform public.w_feed_add('help', new.helper, new.target, null, null, null);
  elsif tg_table_name = 'world_attack_given' then perform public.w_feed_add('attack', new.attacker, new.target, null, null, null);
  elsif tg_table_name = 'world_curses' then perform public.w_feed_add('curse', new.attacker, new.target, null, null, new.kind);
  elsif tg_table_name = 'world_shields' then perform public.w_feed_add('shield', new.giver, new.target, null, null, null);
  elsif tg_table_name = 'world_gifts' then perform public.w_feed_add('gift', new.from_u, new.to_u, null, null, case when new.loan then 'prestito' else new.kind end);
  elsif tg_table_name = 'world_allies' then
    if new.status = 'ok' and (tg_op = 'INSERT' or old.status is distinct from 'ok') then perform public.w_feed_add('ally', new.requester, new.target, null, null, null);
    elsif tg_op = 'INSERT' then perform public.w_feed_add('ally_req', new.requester, new.target, null, null, null); end if;
  elsif tg_table_name = 'world_shouts' then perform public.w_feed_add('shout', new.from_u, new.to_u, null, null, new.code::text);
  end if;
  return new;
end $$;

--
-- Name: w_tr_feed_push(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_tr_feed_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare s text;
begin
  if new.target is null or new.target = new.actor then return new; end if;
  if not exists (select 1 from public.push_subs where user_id = new.target) then return new; end if;
  begin
    select cron_secret into s from public.push_keys where id = 1;
    if s is null then return new; end if;
    perform net.http_post(
      url := 'https://wmweptdpfworispqjhto.supabase.co/functions/v1/zsh-push',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('task','feed','user',new.target,'secret',s));
  exception when others then null; -- mai bloccare l'azione del giocatore: ci pensa il giro dei 10 minuti
  end;
  return new;
end $$;

--
-- Name: w_tr_invite_join(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_tr_invite_join() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare inv uuid;
begin
  if new.invitato_da is null or (tg_op = 'UPDATE' and old.invitato_da is not distinct from new.invitato_da) then return new; end if;
  select u.id into inv from auth.users u where left(u.id::text, 8) = new.invitato_da and u.id <> new.user_id limit 1;
  if inv is null then return new; end if;
  insert into public.world_feed(kind, actor, target, info) values ('invite_join', new.user_id, inv, null);
  return new;
end $$;

--
-- Name: w_tr_pos_casa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_tr_pos_casa() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare h record;
begin
  if new.lat_r is null or new.lon_r is null then return new; end if;
  select lat, lon into h from public.world_homes where user_id = new.user_id and status in ('home','pending');
  if found then
    new.lat_r := round((round(h.lat / 0.002) * 0.002)::numeric, 4);
    new.lon_r := round((round(h.lon / 0.0028) * 0.0028)::numeric, 4);
  end if;
  return new;
end $$;

--
-- Name: w_upower(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_upower(p_user uuid, p_slot text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with pr as (select w.user_id, coalesce((w.caps->>('prep:'||p_slot))::int,0) = 1 as ok from public.world_wallet w),
  x as (
    select (case when coalesce((select ok from pr where user_id = p_user), false) then 15 else 0 end) as prep,
      least(5, coalesce((select (caps->>'rs')::int from public.world_wallet where user_id = p_user),0)) as rs,
      (select coalesce(sum(pts),0) from public.world_help_given where target = p_user and slot_id = p_slot)::int as helps,
      (select count(*) from public.world_shields where target = p_user and slot_id = p_slot)::int as sh,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from public.w_allies_of(p_user) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(p_user, a.u))::int as cq,
      (select coalesce(sum(pts),0) from public.world_attack_given where target = p_user and slot_id = p_slot)::int as atk,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses where target = p_user and slot_id = p_slot and kind = 'sabotaggio')::int as sab)
  select prep + 2 * rs + least(24, helps) + least(10, 5 * sh) + (case when ap >= 3 then 5 else 0 end) + least(9, 3 * cq)
       - least(35, least(30, atk) + least(10, 5 * fog) + (case when sab > 0 and prep > 0 then 15 else 0 end))
  from x;
$$;

--
-- Name: w_vicino_alleanza(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_vicino_alleanza(p_user uuid, p_aid bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.w_ancora(p_user, p_aid)); $$;

--
-- Name: w_votanti(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_votanti(p_aid bigint) RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(array_agg(u order by att desc, dal), '{}') from (
    select m.user_id as u, public.w_attivita(m.user_id) as att, m.dal from public.world_alleanze_membri m
    where m.alleanza_id = p_aid order by att desc, m.dal limit 3) x; $$;

--
-- Name: world_wallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_wallet (
    user_id uuid NOT NULL,
    mattoni integer DEFAULT 0 NOT NULL,
    lifetime integer DEFAULT 0 NOT NULL,
    caps jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_rent timestamp with time zone DEFAULT now() NOT NULL,
    legno integer DEFAULT 0 NOT NULL,
    cibo integer DEFAULT 0 NOT NULL,
    carb integer DEFAULT 0 NOT NULL
);

--
-- Name: w_wallet(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_wallet(p_user uuid) RETURNS public.world_wallet
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare w public.world_wallet;
begin
  insert into public.world_wallet(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into w from public.world_wallet where user_id = p_user;
  return w;
end $$;

--
-- Name: w_wxev(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_wxev(p_bid text, p_slot text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select ev from public.world_wx where building_id = p_bid and slot_id = p_slot), 'calma');
$$;

--
-- Name: w_xp(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_xp(p_user uuid, p_n integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare x int;
begin
  if p_user is null or coalesce(p_n,0) <= 0 then return 0; end if;
  insert into public.world_superstite(user_id, xp) values (p_user, p_n)
    on conflict (user_id) do update set xp = public.world_superstite.xp + excluded.xp returning xp into x;
  return x;
end $$;

--
-- Name: w_zm(text, numeric, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_zm(k text, s numeric, ev text, hh integer) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  select greatest(0.3, least(1.8,
    (case k when 'runner' then 1-4*s when 'brute' then 1-3*s when 'boss' then 1-2*s when 'walker' then 1-s when 'casco' then 1-s when 'ombra' then 1-s else 1 end)
    * (case ev
        when 'pioggia' then (case k when 'runner' then 0.7 when 'walker' then 0.9 when 'scavatore' then 1.3 when 'ombra' then 1.1 else 1 end)
        when 'neve' then (case k when 'runner' then 0.5 when 'walker' then 0.8 when 'scavatore' then 0.6 when 'brute' then 0.8 else 1 end)
        when 'nebbia' then (case k when 'ombra' then 1.6 when 'runner' then 0.9 else 1 end)
        when 'blackout' then (case k when 'ombra' then 1.6 else 1.05 end)
        when 'luna' then 1.15 else 1 end)
    * (case when k = 'ombra' then (case when hh >= 18 then 1.2 else 0.6 end) else 1 end)));
$$;

--
-- Name: w_zona_libera(uuid, double precision, double precision, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_zona_libera(p_user uuid, p_lat double precision, p_lon double precision, p_aid bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select not exists (select 1 from public.world_alleanze_membri mine where mine.user_id = p_user and mine.alleanza_id is distinct from p_aid
                     and coalesce(public.w_dist_alleanza(mine.alleanza_id, p_lat, p_lon), 999) <= 50); $$;

--
-- Name: w_ztypes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.w_ztypes() RETURNS TABLE(k text, minl integer, base numeric, dk text, dk2 text)
    LANGUAGE sql IMMUTABLE
    AS $$
  values ('runner',2,4.0,'fossato','trappole'),('casco',3,4.0,'barricate','grate'),('strillone',3,3.0,'sirena','cani'),
         ('scavatore',4,5.0,'fondamenta','pompa'),('brute',5,6.0,'barricate','recinto'),('ombra',6,5.0,'fari','cani'),('boss',8,9.0,'barricate','recinto');
$$;

--
-- Name: world_alleanza_chat(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_chat(p_after bigint) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select public.world_alleanza_chat2(public.w_alleanza_di(auth.uid()), p_after); $$;

--
-- Name: world_alleanza_chat2(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_chat2(p_aid bigint, p_after bigint) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(json_agg(x order by x.id), '[]'::json) from (
    select c.id, c.user_id, public.w_nick(c.user_id) as nick, c.body, c.created_at, c.user_id = auth.uid() as mine
    from public.world_alleanze_chat c where c.alleanza_id = p_aid and public.w_in_alleanza(auth.uid(), p_aid) and c.id > coalesce(p_after, 0)
    order by c.id desc limit 80) x; $$;

--
-- Name: world_alleanza_chiedi(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_chiedi(p_aid bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_crea(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_crea(p_nome text, p_emblema text) RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select public.world_alleanza_fonda(p_nome, p_emblema, null, null); $$;

--
-- Name: world_alleanza_esci(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_esci() RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select public.world_alleanza_esci2(public.w_alleanza_di(auth.uid())); $$;

--
-- Name: world_alleanza_esci2(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_esci2(p_aid bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_fonda(text, text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_fonda(p_nome text, p_emblema text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_info(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_info() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_invita(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_invita(p_user uuid) RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.world_alleanza_invita2(p_user, (select m.alleanza_id from public.world_alleanze_membri m where m.user_id = auth.uid()
    order by (select min(public.w_dist_km(p_user, x.user_id)) from public.world_alleanze_membri x where x.alleanza_id = m.alleanza_id) nulls last limit 1)); $$;

--
-- Name: world_alleanza_invita2(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_invita2(p_user uuid, p_aid bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_risposta(bigint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_risposta(p_id bigint, p_si boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_scrivi(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_scrivi(p_body text) RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select public.world_alleanza_scrivi2(public.w_alleanza_di(auth.uid()), p_body); $$;

--
-- Name: world_alleanza_scrivi2(bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_scrivi2(p_aid bigint, p_body text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanza_vota(bigint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanza_vota(p_id bigint, p_si boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanze_mie(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanze_mie() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_alleanze_vicine(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_alleanze_vicine() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_allies(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_allies() RETURNS TABLE(user_id uuid, nick text, wlevel integer, dist_km numeric, coinq boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (select * from public.world_homes where user_id = auth.uid())
  select a.u, public.w_nick(a.u), public.w_lvl_of(a.u),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me, public.world_homes h where h.user_id = a.u),
    public.w_coinq(auth.uid(), a.u)
  from public.w_allies_of(auth.uid()) as a(u) limit 80;
$$;

--
-- Name: world_allies_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_allies_status() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  al as (select a.u from public.w_allies_of(auth.uid()) a(u)),
  v as (select al.u, public.w_threats_of(al.u) as th from al)
  select coalesce(json_agg(x order by x.prepared, x.worst nulls last), '[]'::json) from (
    select v.u as user_id, public.w_nick(v.u) as nick, public.w_lvl_of(v.u) as wlevel,
      (select seen_at from public.profili_pubblici where user_id = v.u) as seen_at,
      coalesce((select (caps->>('prep:'||n.id))::int from public.world_wallet where user_id = v.u),0) = 1 as prepared,
      exists (select 1 from public.world_help where user_id = v.u and slot_id = n.id) as asked,
      exists (select 1 from public.world_help_given where helper = auth.uid() and target = v.u and slot_id = n.id) as helped_by_me,
      exists (select 1 from public.world_shields where giver = auth.uid() and target = v.u and slot_id = n.id) as shield_by_me,
      public.w_coinq(auth.uid(), v.u) as coinq,
      json_array_length(v.th) as houses,
      (select min((e->>'chance')::int) from json_array_elements(v.th) e) as worst
    from v, n) x;
$$;

--
-- Name: world_ally_answer(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_ally_answer(p_requester uuid, p_yes boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if p_yes then update public.world_allies set status = 'ok' where requester = p_requester and target = auth.uid();
  else delete from public.world_allies where requester = p_requester and target = auth.uid() and status = 'pending'; end if;
  return json_build_object('ok',true,'msg',case when p_yes then 'Alleanza fatta!' else 'Proposta rifiutata' end);
end $$;

--
-- Name: world_ally_pending(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_ally_pending() RETURNS TABLE(user_id uuid, nick text, wlevel integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select x.requester, public.w_nick(x.requester), public.w_lvl_of(x.requester) from public.world_allies x
  where x.target = auth.uid() and x.status = 'pending' order by x.created_at desc limit 30;
$$;

--
-- Name: world_ally_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_ally_request(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_ally_shield(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_ally_shield(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Lo scudo si dà a un alleato'); end if;
  if not public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','Solo agli alleati'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if (select count(*) from public.world_shields where target = p_target and slot_id = nid) >= 2 then return json_build_object('ok',false,'msg','Ha già 2 scudi per la prossima orda'); end if;
  insert into public.world_shields(giver, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già dato uno scudo per questa orda'); end if;
  return json_build_object('ok',true,'msg','Scudo dato: +5 alla sua difesa alla prossima orda');
end $$;

--
-- Name: world_ally_view(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_ally_view(p_user uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id)
  select case when auth.uid() is null or not public.w_are_allies(auth.uid(), p_user) then json_build_object('ok', false, 'msg', 'Solo per i tuoi alleati')
  else json_build_object('ok', true, 'user_id', p_user, 'nick', public.w_nick(p_user), 'wlevel', public.w_lvl_of(p_user),
    'seen_at', (select seen_at from public.profili_pubblici where user_id = p_user),
    'prepared', coalesce((select (caps->>('prep:'||n.id))::int from public.world_wallet where user_id = p_user),0) = 1,
    'asked', exists (select 1 from public.world_help where user_id = p_user and slot_id = n.id),
    'helps_in', (select count(*) from public.world_help_given where target = p_user and slot_id = n.id),
    'shields_in', (select count(*) from public.world_shields where target = p_user and slot_id = n.id),
    'helped_by_me', exists (select 1 from public.world_help_given where helper = auth.uid() and target = p_user and slot_id = n.id),
    'shield_by_me', exists (select 1 from public.world_shields where giver = auth.uid() and target = p_user and slot_id = n.id),
    'coinq', public.w_coinq(auth.uid(), p_user),
    'houses', public.w_threats_of(p_user)) end
  from n;
$$;

--
-- Name: world_ask_help(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_ask_help() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if not exists (select 1 from public.world_homes where user_id = me) then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  insert into public.world_help(user_id, slot_id) values (me, nid) on conflict do nothing;
  return json_build_object('ok',true,'msg','Richiesta di aiuto inviata a tutto il mondo');
end $$;

--
-- Name: world_assalta(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_assalta(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); a json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); lost boolean := false; n int; quando text;
begin
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
    || ': −' || (a->>'pts') || ' alla sua difesa. ' || case when a->>'tipo' = 'home' then 'Se cade, saccheggi le sue scorte' else 'Se cade, è tua' end
    || case when (a->>'carb')::int > 0 then ' · ⛽ −' || (a->>'carb') else '' end || ' · 🥫 −10' || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

--
-- Name: world_assi(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_assi(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); a json;
begin
  a := public.w_azione(me, p_bid, p_lat, p_lon, 'assi');
  if not (a->>'ok')::boolean then return a; end if;
  update public.world_wallet set legno = legno - 20 where user_id = me and legno >= 20;
  if not found then return json_build_object('ok',false,'msg','Servono 🪵 20'); end if;
  insert into public.world_assalti(bid, user_id, slot_id, kind, pts) values (a->>'bid', me, a->>'slot', 'assi', 6)
    on conflict (bid, user_id, slot_id, kind) do update set pts = public.world_assalti.pts + 6;
  if (a->>'owner')::uuid <> me then perform public.w_feed_add('assi', me, (a->>'owner')::uuid, null, null, a->>'tipo'); end if;
  return json_build_object('ok',true,'msg','🪵 Assi inchiodate: +6 alla difesa per l’orda delle ' || right(a->>'slot',2) || ':00 (in tutto +' || least(18, (a->>'somma')::int + 6) || ')');
end $$;

--
-- Name: world_block(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_block(p_user uuid, p_on boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null or p_user = auth.uid() then return json_build_object('ok',false,'msg','Non valido'); end if;
  if p_on then insert into public.world_blocks(user_id, blocked) values (auth.uid(), p_user) on conflict do nothing;
  else delete from public.world_blocks where user_id = auth.uid() and blocked = p_user; end if;
  return json_build_object('ok',true,'msg', case when p_on then 'Bloccato: non vedrai più i suoi messaggi' else 'Sbloccato' end);
end $$;

--
-- Name: world_bottega_compra(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_bottega_compra(p_item text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; s public.world_superstite; c int; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_item not in ('energia','bomba','scudo') then return json_build_object('ok', false, 'msg', 'Oggetto sconosciuto'); end if;
  w := public.w_wallet(me); s := public.w_sup(me);
  c := case p_item when 'energia' then 60 else 25 end;
  if w.mattoni < c then return json_build_object('ok', false, 'msg', format('Servono 🧱 %s', c)); end if;
  if p_item = 'energia' then
    n := coalesce((w.caps->>('energia_comprata:' || day))::int, 0);
    if n >= 2 then return json_build_object('ok', false, 'msg', 'Oggi hai già comprato energia 2 volte'); end if;
    update public.world_wallet set caps = jsonb_set(caps, array['energia_comprata:' || day], to_jsonb(n + 1)) where user_id = me;
    update public.world_superstite set energia = least(public.w_en_max(abil) + 5, energia + 5) where user_id = me;
  elsif p_item = 'bomba' then
    if s.bombe >= 5 then return json_build_object('ok', false, 'msg', 'Puoi tenere al massimo 5 bombe'); end if;
    update public.world_superstite set bombe = bombe + 1 where user_id = me;
  else
    if s.scudi >= 5 then return json_build_object('ok', false, 'msg', 'Puoi tenere al massimo 5 scudi'); end if;
    update public.world_superstite set scudi = scudi + 1 where user_id = me;
  end if;
  perform public.w_pay(me, -c, 'Bottega: ' || p_item);
  s := public.w_sup(me);
  return json_build_object('ok', true, 'msg', case p_item when 'energia' then '⚡ +5 energia' when 'bomba' then '💣 Bomba pronta' else '🛡️ Scudo pronto' end,
    'energia', s.energia, 'bombe', s.bombe, 'scudi', s.scudi);
end $$;

--
-- Name: world_buy(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_buy(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); q json; price int; got text;
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  if me is null then return json_build_object('ok',false,'msg','Accedi per comprare'); end if;
  perform public.w_cleanup();
  q := public.world_quote(p_bid, p_lat, p_lon);
  if not (q->>'can')::boolean then return json_build_object('ok',false,'msg',coalesce(nullif(q->>'why',''),'Non disponibile: qui abita qualcuno')); end if;
  price := (q->>'price')::int;
  insert into public.world_buildings(building_id, lat, lon) values (p_bid, p_lat, p_lon) on conflict (building_id) do nothing;
  update public.world_buildings set owner = me, paid = price, bought_at = now()
    where building_id = p_bid and owner is null
      and not exists (select 1 from public.world_homes h where h.status in ('home','pending')
                      and (split_part(h.building_id,'#',1) = p_bid or public.w_km(h.lat,h.lon,p_lat,p_lon) < 0.025))
    returning building_id into got;
  if got is null then return json_build_object('ok',false,'msg','Non disponibile: qualcuno l’ha appena comprata o ci abita'); end if;
  update public.world_wallet set mattoni = mattoni - price where user_id = me and mattoni >= price;
  if not found then
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
    return json_build_object('ok',false,'msg','Mattoni insufficienti');
  end if;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -price, 'Casa comprata', p_bid, true);
  return json_build_object('ok',true,'msg','Casa comprata','price',price);
end $$;

--
-- Name: world_buy_mezzo(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_buy_mezzo(p_mezzo text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); price int; w public.world_wallet;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  price := case p_mezzo when 'moto' then 300 when 'auto' then 600 when 'fuori' then 1200 else null end;
  if price is null then return json_build_object('ok', false, 'msg', 'Mezzo non in vendita'); end if;
  if public.w_mz_rank(p_mezzo) <= public.w_mz_rank(public.w_mezzo(me)) then return json_build_object('ok', false, 'msg', 'Hai già un mezzo uguale o migliore'); end if;
  w := public.w_wallet(me);
  if w.mattoni < price then return json_build_object('ok', false, 'msg', 'Servono ' || price || ' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - price, caps = jsonb_set(caps, '{mezzo_comprato}', to_jsonb(p_mezzo)) where user_id = me and mattoni >= price;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -price, 'Mezzo comprato', true);
  return json_build_object('ok', true, 'msg', 'Nuovo mezzo pronto', 'mezzo', p_mezzo);
end $$;

--
-- Name: world_caccia_fine(bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_caccia_fine(p_id bigint, p_uccisi integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); c public.world_cacce; s public.world_superstite; el numeric; u int; xp int; l int := 0; f int := 0; k int := 0;
  r numeric; q int; z jsonb; i int := 0; got json; g0 int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into c from public.world_cacce where id = p_id and user_id = me for update;
  if c.id is null or c.fine_at is not null then return json_build_object('ok', false, 'msg', 'Caccia già chiusa'); end if;
  el := extract(epoch from (now() - c.start_at));
  -- non si possono abbattere zombie più in fretta di così: 3 s per cominciare, poi almeno 1,2 s l'uno
  u := greatest(0, least(coalesce(p_uccisi, 0), c.n, floor((el - 3) / 1.2)::int));
  if el > 600 then u := 0; end if;
  s := public.w_sup(me); g0 := public.w_grado(s.xp);
  -- una scorta da ogni zombie abbattuto (i primi u della lista)
  for z in select * from jsonb_array_elements(c.zombie) loop
    i := i + 1; exit when i > u;
    q := case when z->>'k' = 'bruto' then 6 else 3 end; r := random();
    if r < 0.4 then f := f + q; elsif r < 0.75 then l := l + q; else k := k + q; end if;
  end loop;
  xp := round(5 * u * (1 + 0.1 * public.w_ab(s.abil, 'combattente'))) + case when u = c.n then 10 else 0 end;
  got := public.w_res(me, l, f, k);
  perform public.w_xp(me, xp);
  update public.world_cacce set fine_at = now(), uccisi = u,
    esito = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int) where id = p_id;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'uccisi', u, 'n', c.n, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
    'tutti', u = c.n, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0);
end $$;

--
-- Name: world_caccia_inizia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_caccia_inizia() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  fatte int; g int; n int; z jsonb := '[]'::jsonb; i int; k text; nid bigint;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  w := public.w_wallet(me); s := public.w_sup(me);
  fatte := coalesce((w.caps->>('cacce:' || day))::int, 0);
  if fatte >= 10 then return json_build_object('ok', false, 'msg', 'Oggi hai già fatto 10 cacce: gli zombie tornano domani'); end if;
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve ⚡ 1: si ricarica una ogni %s min', public.w_en_ric(s.abil))); end if;
  -- una caccia lasciata a metà da più di 10 minuti si chiude senza premi
  update public.world_cacce set fine_at = now(), uccisi = 0, esito = '{"scaduta":true}'::jsonb where user_id = me and fine_at is null and start_at < now() - interval '10 minutes';
  if exists (select 1 from public.world_cacce where user_id = me and fine_at is null) then
    return json_build_object('ok', false, 'msg', 'Hai già una caccia in corso');
  end if;
  g := public.w_grado(s.xp); n := least(6, 3 + g / 5);
  for i in 1..n loop
    k := case when random() < least(0.4, 0.1 + 0.02 * g) then 'bruto' when random() < 0.35 then 'corridore' else 'lento' end;
    z := z || jsonb_build_object('k', k, 'hp', case k when 'bruto' then 4 else 2 end,
      'b', round(random() * 240 - 120), 'dt', round(((i - 1) * 2.2 + random() * 1.5)::numeric, 1));
  end loop;
  update public.world_superstite set energia = energia - 1,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  update public.world_wallet set caps = jsonb_set(caps, array['cacce:' || day], to_jsonb(fatte + 1)) where user_id = me;
  insert into public.world_cacce(user_id, n, zombie) values (me, n, z) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'zombie', z, 'n', n, 'rimaste', 9 - fatte,
    'danno', 1 + case when public.w_eq(s.equip, 'arma') >= 2 then 1 else 0 end);
end $$;

--
-- Name: world_chat_list(text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_chat_list(p_room text, p_after bigint) RETURNS TABLE(id bigint, user_id uuid, nick text, wlevel integer, body text, created_at timestamp with time zone, mine boolean, room text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select c.id, c.user_id, public.w_nick(c.user_id), public.w_lvl_of(c.user_id), c.body, c.created_at, c.user_id = auth.uid(), c.room
  from public.world_chat c
  where c.room = public.w_room(p_room) and not c.hidden and c.id > coalesce(p_after,0)
    and c.created_at > now() - interval '90 days'
    and not exists (select 1 from public.world_blocks b where b.user_id = auth.uid() and b.blocked = c.user_id)
  order by c.id desc limit 60;
$$;

--
-- Name: world_chat_report(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_chat_report(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int;
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if public.is_admin() then update public.world_chat set hidden = true where id = p_id; return json_build_object('ok',true,'msg','Messaggio nascosto'); end if;
  insert into public.world_chat_reports(chat_id, reporter) values (p_id, auth.uid()) on conflict do nothing;
  select count(*) into n from public.world_chat_reports where chat_id = p_id;
  update public.world_chat set reports = n, hidden = (n >= 3) where id = p_id;
  return json_build_object('ok',true,'msg', case when n >= 3 then 'Segnalato: il messaggio è stato nascosto' else 'Segnalazione inviata, grazie' end);
end $$;

--
-- Name: world_chat_send(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_chat_send(p_room text, p_body text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); r text; b text := btrim(coalesce(p_body,''));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi per scrivere'); end if;
  if char_length(b) < 1 then return json_build_object('ok',false,'msg','Scrivi qualcosa'); end if;
  if char_length(b) > 280 then return json_build_object('ok',false,'msg','Massimo 280 caratteri'); end if;
  if public.w_bad(b) then return json_build_object('ok',false,'msg','Non inviato: niente bestemmie, insulti pesanti o minacce. Si può discutere, non offendere.'); end if;
  if exists (select 1 from public.world_chat where user_id = me and created_at > now() - interval '4 seconds') then return json_build_object('ok',false,'msg','Piano: un messaggio ogni 4 secondi'); end if;
  if (select count(*) from public.world_chat where user_id = me and created_at > now() - interval '1 day') >= 200 then return json_build_object('ok',false,'msg','Oggi hai già scritto 200 messaggi'); end if;
  r := public.w_room(p_room);
  insert into public.world_chat(room, user_id, body) values (r, me, b);
  if random() < 0.02 then delete from public.world_chat where created_at < now() - interval '90 days'; end if;
  return json_build_object('ok',true,'room',r);
end $$;

--
-- Name: world_claim_home(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_claim_home(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); h public.world_homes; b public.world_buildings; refund int; bonus int; inv boolean; same boolean;
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  if me is null then return json_build_object('ok',false,'msg','accedi'); end if;
  if p_bid is null or length(p_bid) < 2 then return json_build_object('ok',false,'msg','edificio non riconosciuto'); end if;
  if exists (select 1 from public.world_excluded where building_id = p_bid) then return json_build_object('ok',false,'msg','edificio escluso dal gioco'); end if;
  perform public.w_wallet(me);
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then
    insert into public.world_homes(user_id, building_id, lat, lon) values (me, p_bid, p_lat, p_lon);
    return json_build_object('ok',true,'status','pending','msg','Casa registrata: domani riapri l’app per confermarla');
  end if;
  same := split_part(h.building_id,'#',1) = p_bid or public.w_km(h.lat,h.lon,p_lat,p_lon) < 0.025;
  if not same then
    if h.kind <> 'residence' and h.status = 'home' and h.changed_at > now() - interval '30 days' then
      return json_build_object('ok',false,'status',h.status,'msg','Puoi cambiare casa una volta ogni 30 giorni');
    end if;
    update public.world_homes set building_id = p_bid, lat = p_lat, lon = p_lon,
      status = case when h.kind = 'residence' then 'home' else 'pending' end,
      first_at = now(), confirmed_at = case when h.kind = 'residence' then now() else null end, changed_at = now(),
      unit = null, kind = case when h.kind = 'residence' then 'residence' else 'casa' end, kind_set = (h.kind = 'residence')
      where user_id = me;
    if h.kind = 'residence' then return json_build_object('ok',true,'status','home','msg','Residence: nuova casa attiva subito'); end if;
    return json_build_object('ok',true,'status','pending','msg','Nuova casa registrata: domani riapri l’app per confermarla');
  end if;
  if h.status = 'home' then return json_build_object('ok',true,'status','home','msg','È già casa tua'); end if;
  if h.kind <> 'residence' and h.first_at > now() - interval '20 hours' then
    return json_build_object('ok',true,'status','pending','msg','Conferma possibile da domani');
  end if;
  update public.world_homes set status = 'home', confirmed_at = now() where user_id = me;
  select * into b from public.world_buildings where building_id = p_bid for update;
  if b.building_id is null then
    insert into public.world_buildings(building_id, lat, lon) values (p_bid, p_lat, p_lon) on conflict (building_id) do nothing;
  elsif b.owner is not null and b.owner <> me then
    refund := b.paid + b.upgrades;
    perform public.w_pay(b.owner, refund, 'Un abitante è arrivato in una tua casa: rimborso completo', p_bid);
    inv := exists (select 1 from public.profili_pubblici where user_id = me and invitato_da = left(b.owner::text,8));
    bonus := round(refund * (case when inv then 0.75 else 0.25 end));
    if (select count(*) from public.world_bonus where owner = b.owner and due_at > now() - interval '7 days') < 2 then
      insert into public.world_bonus(owner, claimant, building_id, amount, due_at) values (b.owner, me, p_bid, bonus, now() + interval '3 days');
    end if;
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
  elsif b.owner = me then
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
  end if;
  return json_build_object('ok',true,'status','home','msg','Confermata: questa è casa tua nel mondo');
end $$;

--
-- Name: world_collect(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_collect() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; rate int; hrs double precision; amt int;
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  select coalesce(sum(5 + 5*level + public.w_price(lat, lon) / 100),0) into rate from public.world_buildings where owner = me;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  amt := floor(rate * hrs / 24.0);
  if amt < 1 then return json_build_object('ok',false,'msg','Ancora niente da riscuotere','rate',rate); end if;
  update public.world_wallet set last_rent = now() where user_id = me;
  perform public.w_pay(me, amt, 'Affitti delle tue case');
  update public.world_log set seen = true where user_id = me and reason = 'Affitti delle tue case' and not seen;
  return json_build_object('ok',true,'got',amt,'rate',rate);
end $$;

--
-- Name: world_condo_break(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_condo_break(p_user uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if not public.w_condo_vicini(me, p_user) then
    return json_build_object('ok',false,'msg','Si può rompere solo con un vicino di un altro appartamento dello stesso condominio (scala e interno diversi)'); end if;
  if public.w_rift(me, p_user) then return json_build_object('ok',false,'msg','Avete già rotto'); end if;
  insert into public.world_condo_rifts(a, b) values (me, p_user) on conflict do nothing;
  delete from public.world_allies where (requester = me and target = p_user) or (requester = p_user and target = me);
  return json_build_object('ok',true,'msg','Avete rotto: ora siete rivali. Puoi fare pace quando vuoi');
end $$;

--
-- Name: world_condo_give(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_condo_give(p_kind text, p_amount integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); k text := public.w_condo_key(auth.uid()); w public.world_wallet; c public.world_condo; ups int := 0; adm uuid; fee int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if k is null then return json_build_object('ok',false,'msg','Solo per chi abita in un condominio'); end if;
  if p_kind not in ('portone','cancello','telecamere') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if p_amount < 10 or p_amount > 500 then return json_build_object('ok',false,'msg','Da 10 a 500 Mattoni'); end if;
  w := public.w_wallet(me); if w.mattoni < p_amount then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
  adm := public.w_condo_admin(k);
  insert into public.world_condo(ckey, kind) values (k, p_kind) on conflict do nothing;
  select * into c from public.world_condo where ckey = k and kind = p_kind for update;
  if c.level >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  update public.world_wallet set mattoni = mattoni - p_amount where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -p_amount, 'Condominio: '||p_kind, k, true);
  insert into public.world_condo_gifts(ckey, kind, user_id, amount) values (k, p_kind, me, p_amount);
  c.pot := c.pot + p_amount;
  while c.level < 3 and c.pot >= 240 * (c.level + 1) loop c.pot := c.pot - 240 * (c.level + 1); c.level := c.level + 1; ups := ups + 1; end loop;
  update public.world_condo set level = c.level, pot = c.pot where ckey = k and kind = p_kind;
  -- compenso dell'amministratore (chi lo era prima di questo versamento): 10%
  fee := floor(p_amount * 0.10);
  if adm is not null and adm <> me and fee > 0 then perform public.w_pay(adm, fee, 'Compenso da amministratore del condominio'); end if;
  return json_build_object('ok',true,'level',c.level,'pot',c.pot,'up',ups,
    'msg', case when ups > 0 then 'Il condominio sale al livello '||c.level||'!' else 'Grazie! Contributo versato' end);
end $$;

--
-- Name: world_condo_info(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_condo_info() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with k as (select public.w_condo_key(auth.uid()) as ck),
  v as (select g.user_id, sum(g.amount)::int as tot from public.world_condo_gifts g, k where g.ckey = k.ck and g.created_at > now() - interval '30 days' and g.user_id is not null group by g.user_id),
  nb as (select distinct h.user_id, h.unit from public.world_homes h, k where k.ck is not null and h.kind = 'condominio' and h.user_id <> auth.uid()
           and public.w_condo_key(h.user_id) = k.ck)
  select case when auth.uid() is null or (select ck from k) is null then json_build_object('ok', false)
  else json_build_object('ok', true,
    'admin', (select json_build_object('user_id', v.user_id, 'nick', public.w_nick(v.user_id), 'tot', v.tot) from v order by v.tot desc, v.user_id limit 1),
    'sono_admin', (select public.w_condo_admin(ck) from k) = auth.uid(),
    'versati', coalesce((select json_agg(json_build_object('nick', public.w_nick(v.user_id), 'tot', v.tot, 'me', v.user_id = auth.uid()) order by v.tot desc) from v), '[]'::json),
    'me_tot', coalesce((select tot from v where user_id = auth.uid()), 0),
    'bonus', public.w_condo_bonus(auth.uid()),
    'vicini', coalesce((select json_agg(json_build_object('user_id', nb.user_id, 'nick', public.w_nick(nb.user_id), 'unit', nb.unit,
        'rotto', public.w_rift(auth.uid(), nb.user_id),
        'rotto_da_me', exists (select 1 from public.world_condo_rifts r where r.a = auth.uid() and r.b = nb.user_id),
        'pace_chiesta', exists (select 1 from public.world_condo_rifts r where (r.a = auth.uid() and r.b = nb.user_id and r.b_wants_peace) or (r.a = nb.user_id and r.b = auth.uid() and r.b_wants_peace)),
        'puo_rompere', public.w_condo_vicini(auth.uid(), nb.user_id)) order by nb.unit) from nb), '[]'::json)) end; $$;

--
-- Name: world_condo_peace(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_condo_peace(p_user uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); r public.world_condo_rifts;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  select * into r from public.world_condo_rifts where (a = me and b = p_user) or (a = p_user and b = me);
  if r.a is null then return json_build_object('ok',false,'msg','Non avete rotto'); end if;
  if r.a = me then
    delete from public.world_condo_rifts where a = me and b = p_user;
    return json_build_object('ok',true,'peace',true,'msg','Pace fatta: siete di nuovo alleati');
  end if;
  update public.world_condo_rifts set b_wants_peace = true where a = p_user and b = me;
  return json_build_object('ok',true,'peace',false,'msg','Proposta di pace inviata: quando accetta tornate alleati');
end $$;

--
-- Name: world_consigli(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_consigli() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; rate int; hrs double precision;
  minacce json; richieste json; alleati json; presidi json; bersagli json; c record;
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_assalti_tick(); perform public.w_pres_tick();
  w := public.w_wallet(me);
  -- assalti in arrivo sulle mie case e sui miei presidi
  select coalesce(json_agg(x order by x.atk desc), '[]'::json) into minacce from (
    select a.bid, case when a.bid like 'pres:%' then 'pres' when exists (select 1 from public.world_homes h where h.building_id = a.bid and h.user_id = me) then 'home' else 'owned' end as tipo,
      coalesce((select p.name from public.world_presidi p where 'pres:' || p.id = a.bid), '') as nome,
      coalesce((select b.lat from public.world_buildings b where b.building_id = a.bid), (select h.lat from public.world_homes h where h.building_id = a.bid limit 1), (select p.lat from public.world_presidi p where 'pres:' || p.id = a.bid)) as lat,
      coalesce((select b.lon from public.world_buildings b where b.building_id = a.bid), (select h.lon from public.world_homes h where h.building_id = a.bid limit 1), (select p.lon from public.world_presidi p where 'pres:' || p.id = a.bid)) as lon,
      least(40, sum(a.pts) filter (where a.kind = 'atk'))::int as atk, count(*) filter (where a.kind = 'atk')::int as n,
      least(24, coalesce(sum(a.pts) filter (where a.kind = 'aiuto'), 0))::int as aiuti, least(18, coalesce(sum(a.pts) filter (where a.kind = 'assi'), 0))::int as assi
    from public.world_assalti a
    where a.slot_id = nid and (a.bid in (select building_id from public.world_buildings where owner = me) or a.bid in (select building_id from public.world_homes where user_id = me)
           or a.bid in (select 'pres:' || id from public.world_presidi where holder = me))
    group by a.bid having count(*) filter (where a.kind = 'atk') > 0) x;
  -- alleati che chiedono aiuto per la prossima orda (e non li ho ancora aiutati)
  select coalesce(json_agg(x order by x.dist_km), '[]'::json) into richieste from (
    select h.user_id, public.w_nick(h.user_id) as nick, round(public.w_dist_km(me, h.user_id)::numeric, 1) as dist_km,
      public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0)) as mezzo,
      public.w_mz_carb(public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0)), public.w_dist_km(me, h.user_id)) as carb,
      coalesce(public.w_dist_km(me, h.user_id), 99) <= public.w_mz_range(public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0))) as arrivo,
      public.w_mz_help(public.w_mz_eff(me, coalesce(public.w_dist_km(me, h.user_id), 0))) + public.w_dot(me) as pts
    from public.world_help h
    where h.slot_id = nid and h.user_id <> me and public.w_are_allies(me, h.user_id)
      and not exists (select 1 from public.world_help_given g where g.helper = me and g.target = h.user_id and g.slot_id >= nid)
    limit 6) x;
  -- edifici e presidi degli alleati sotto assalto
  select coalesce(json_agg(x), '[]'::json) into alleati from (
    select t.bid, t.owner, public.w_nick(t.owner) as nick, t.tipo, t.lat, t.lon, t.atk,
      public.w_azione(me, t.bid, t.lat, t.lon, 'aiuto') as aiuto
    from (select a.bid, coalesce(b.owner, p.holder) as owner, case when p.id is not null then 'pres' else 'owned' end as tipo,
            coalesce(b.lat, p.lat) as lat, coalesce(b.lon, p.lon) as lon, least(40, sum(a.pts))::int as atk
          from public.world_assalti a left join public.world_buildings b on b.building_id = a.bid left join public.world_presidi p on 'pres:' || p.id = a.bid
          where a.slot_id = nid and a.kind = 'atk' and coalesce(b.owner, p.holder) is not null and coalesce(b.owner, p.holder) <> me
            and public.w_are_allies(me, coalesce(b.owner, p.holder))
          group by a.bid, b.owner, p.holder, p.id, b.lat, p.lat, b.lon, p.lon) t
    where not exists (select 1 from public.world_assalti z where z.bid = t.bid and z.user_id = me and z.slot_id >= nid and z.kind = 'aiuto')
    limit 4) x;
  -- presidi liberi entro 5 km
  select coalesce(json_agg(x order by x.dist_km), '[]'::json) into presidi from (
    select p.id, p.name, p.kind, p.lat, p.lon, round(public.w_dist_pt(me, p.lat, p.lon)::numeric, 1) as dist_km,
      public.w_mz_carb(public.w_mz_eff(me, public.w_dist_pt(me, p.lat, p.lon)), public.w_dist_pt(me, p.lat, p.lon)) as carb
    from public.world_presidi p
    where p.holder is null and public.w_pres_near(me, p.lat, p.lon, 5.0)
    order by public.w_dist_pt(me, p.lat, p.lon) limit 3) x;
  -- case dei rivali più facili (livello basso, poche fortificazioni, vicine) che posso davvero assaltare
  select coalesce(json_agg(x), '[]'::json) into bersagli from (
    select y.building_id as bid, y.lat, y.lon, y.level, public.w_nick(y.owner) as nick, y.dist_km, public.w_fort(y.building_id) as fort,
      public.w_azione(me, y.building_id, y.lat, y.lon, 'atk') as atk
    from (select b.*, round(public.w_dist_pt(me, b.lat, b.lon)::numeric, 1) as dist_km from public.world_buildings b, public.world_homes h
          where h.user_id = me and b.owner is not null and b.owner <> me
            and b.lat between h.lat - 0.1 and h.lat + 0.1 and b.lon between h.lon - 0.14 and h.lon + 0.14
            and not public.w_are_allies(me, b.owner) and not public.w_shielded(b.owner)) y
    where y.dist_km <= 12
    order by y.level, public.w_fort(y.building_id), y.dist_km limit 3) x;
  select coalesce(sum(5 + 5*level + public.w_price(lat, lon) / 100),0) into rate from public.world_buildings where owner = me;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  return json_build_object('ok', true, 'slot', nid, 'minacce', minacce, 'richieste', richieste, 'alleati', alleati, 'presidi', presidi, 'bersagli', bersagli,
    'affitti', floor(rate * hrs / 24.0)::int, 'miei_presidi', (select count(*) from public.world_presidi where holder = me),
    'asked', exists (select 1 from public.world_help where user_id = me and slot_id = nid),
    'risorse', json_build_object('mattoni', w.mattoni, 'legno', w.legno, 'cibo', w.cibo, 'carb', w.carb));
end $$;

--
-- Name: world_coresidents(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_coresidents() RETURNS TABLE(user_id uuid, nick text, status text, seen_at timestamp with time zone, ally boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select o.user_id, public.w_nick(o.user_id), o.status, (select seen_at from public.profili_pubblici where user_id = o.user_id),
         public.w_are_allies(auth.uid(), o.user_id)
  from public.world_homes m join public.world_homes o on o.user_id <> m.user_id
   and (o.building_id = m.building_id or public.w_km(o.lat,o.lon,m.lat,m.lon) < 0.025)
  where m.user_id = auth.uid() and o.status in ('home','pending')
  order by o.status, 2;
$$;

--
-- Name: world_def_upgrade(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_def_upgrade(p_bid text, p_kind text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; lv int; cost int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('fossato','barricate','sirena','fondamenta','fari','trappole','grate','recinto','cani','pompa') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me)
     and not exists (select 1 from public.world_homes where building_id = p_bid and user_id = me) then return json_build_object('ok',false,'msg','Non è una tua casa'); end if;
  lv := public.w_def(p_bid, p_kind);
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  cost := 80 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono '||cost||' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Fortificazione: '||p_kind||' livello '||(lv+1), p_bid, true);
  insert into public.world_defs(building_id, kind, level) values (p_bid, p_kind, lv + 1)
    on conflict (building_id, kind) do update set level = excluded.level;
  return json_build_object('ok',true,'level',lv+1,'cost',cost,'msg','Fortificazione migliorata: livello '||(lv+1));
end $$;

--
-- Name: world_difendi(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_difendi(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); a json; w public.world_wallet; k text := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n int; quando text;
begin
  a := public.w_azione(me, p_bid, p_lat, p_lon, 'aiuto');
  if not (a->>'ok')::boolean then return a; end if;
  update public.world_wallet set carb = carb - (a->>'carb')::int where user_id = me and carb >= (a->>'carb')::int;
  if not found then return json_build_object('ok',false,'msg','Carburante insufficiente'); end if;
  insert into public.world_assalti(bid, user_id, slot_id, kind, pts) values (a->>'bid', me, a->>'slot', 'aiuto', (a->>'pts')::int) on conflict do nothing;
  w := public.w_wallet(me); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 10, 'Difesa di un alleato');
    update public.world_log set seen = true where user_id = me and reason = 'Difesa di un alleato' and not seen;
  end if;
  perform public.w_feed_add('difesa', me, (a->>'owner')::uuid, null, null, a->>'tipo');
  quando := case when (a->>'in_tempo')::boolean then 'in tempo per l’orda delle ' || right(a->>'slot',2) || ':00' else 'troppo tardi: vale per l’orda delle ' || right(a->>'slot',2) || ':00' end;
  return json_build_object('ok',true,'pts',(a->>'pts')::int,'msg','🛡️ In viaggio ' || public.w_mz_nome(a->>'mezzo') || ': arrivi tra ' || (a->>'eta_min') || ' min, ' || quando || '. +' || (a->>'pts') || ' alla difesa'
    || case when (a->>'carb')::int > 0 then ' · ⛽ −' || (a->>'carb') else '' end || case when n < 5 then ' · +10 Mattoni a te' else '' end);
end $$;

--
-- Name: world_difesa_bomba(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_difesa_bomba(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return json_build_object('ok', false); end if;
  if not exists (select 1 from public.world_partite where id = p_id and user_id = me and fine_at is null) then return json_build_object('ok', false, 'msg', 'Partita finita'); end if;
  update public.world_superstite set bombe = bombe - 1 where user_id = me and bombe > 0 returning bombe into n;
  if n is null then return json_build_object('ok', false, 'msg', 'Non hai bombe: le trovi in 🛒 Bottega'); end if;
  update public.world_partite set bombe = bombe + 1 where id = p_id;
  return json_build_object('ok', true, 'bombe', n);
end $$;

--
-- Name: world_difesa_fine(bigint, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_difesa_fine(p_id bigint, p_uccisi integer, p_resistita boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); p public.world_partite; s public.world_superstite; w public.world_wallet; el numeric; u int; xp int; q int; r numeric;
  l int := 0; f int := 0; k int := 0; mt int := 0; i int; got json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); fatti int; g0 int; res boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into p from public.world_partite where id = p_id and user_id = me for update;
  if p.id is null or p.fine_at is not null then return json_build_object('ok', false, 'msg', 'Partita già chiusa'); end if;
  el := extract(epoch from (now() - p.start_at));
  -- al massimo 4 zombie al secondo (più quelli spazzati dalle bombe), e la partita dura 45 secondi
  u := greatest(0, least(coalesce(p_uccisi, 0), floor(el * 4)::int + p.bombe * 12, 260));
  if el > 300 then u := 0; end if;
  res := coalesce(p_resistita, false) and el >= 40;
  s := public.w_sup(me); g0 := public.w_grado(s.xp);
  xp := 2 * u + case when res then 15 else 0 end;
  q := u / 2;
  for i in 1..q loop r := random(); if r < 0.4 then f := f + 2; elsif r < 0.75 then l := l + 2; else k := k + 2; end if; end loop;
  got := public.w_res(me, l, f, k);
  perform public.w_xp(me, xp);
  if res then
    w := public.w_wallet(me); fatti := coalesce((w.caps->>('partite_mt:' || day))::int, 0);
    if fatti < 50 then mt := least(5, 50 - fatti);
      update public.world_wallet set caps = jsonb_set(caps, array['partite_mt:' || day], to_jsonb(fatti + mt)) where user_id = me;
      perform public.w_pay(me, mt, 'Difendi la casa: casa salva');
    end if;
  end if;
  update public.world_partite set fine_at = now(), uccisi = u, resistita = res,
    esito = jsonb_build_object('xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt) where id = p_id;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'uccisi', u, 'resistita', res, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
    'mattoni', mt, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0,
    'record', u > coalesce((select max(uccisi) from public.world_partite where user_id = me and id <> p_id), 0));
end $$;

--
-- Name: world_difesa_inizia(boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_difesa_inizia(p_scudo boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  fatte int; g int; lv int; v int; gr boolean; nid bigint; sc boolean := false;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  w := public.w_wallet(me); s := public.w_sup(me); g := public.w_grado(s.xp);
  fatte := coalesce((w.caps->>('partite:' || day))::int, 0);
  if fatte >= 15 then return json_build_object('ok', false, 'msg', 'Oggi hai giocato 15 partite: gli zombie si riposano fino a domani'); end if;
  update public.world_partite set fine_at = now(), uccisi = 0, resistita = false, esito = '{"scaduta":true}'::jsonb
    where user_id = me and fine_at is null and start_at < now() - interval '5 minutes';
  if exists (select 1 from public.world_partite where user_id = me and fine_at is null) then
    update public.world_partite set fine_at = now(), uccisi = 0, resistita = false, esito = '{"abbandonata":true}'::jsonb where user_id = me and fine_at is null;
  end if;
  gr := fatte = 0;
  if not gr and s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve ⚡ 1: si ricarica una ogni %s min (o compra energia in 🛒 Bottega)', public.w_en_ric(s.abil))); end if;
  if not gr then
    update public.world_superstite set energia = energia - 1,
      energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  end if;
  if coalesce(p_scudo, false) and s.scudi > 0 then sc := true; update public.world_superstite set scudi = scudi - 1 where user_id = me; end if;
  lv := coalesce((select b.level from public.world_homes h join public.world_buildings b on b.building_id = h.building_id where h.user_id = me), 1);
  v := least(8, lv + 2) + case when sc then 2 else 0 end;
  update public.world_wallet set caps = jsonb_set(caps, array['partite:' || day], to_jsonb(fatte + 1)) where user_id = me;
  insert into public.world_partite(user_id, vite, ondate, gratis, scudo) values (me, v, least(6, 3 + g / 4), gr, sc) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'vite', v, 'ondate', least(6, 3 + g / 4), 'durata', 45, 'gratis', gr, 'scudo', sc,
    'bombe', s.bombe, 'velocita', round(1 + 0.04 * least(g, 20), 2), 'rimaste', 14 - fatte);
end $$;

--
-- Name: world_dm_list(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_dm_list(p_with uuid) RETURNS TABLE(id bigint, mine boolean, body text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.world_dm set read = true where to_u = auth.uid() and from_u = p_with and not read;
  return query select d.id, d.from_u = auth.uid(), d.body, d.created_at from public.world_dm d
    where (d.from_u = auth.uid() and d.to_u = p_with) or (d.from_u = p_with and d.to_u = auth.uid())
    order by d.id desc limit 60;
end $$;

--
-- Name: world_dm_send(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_dm_send(p_to uuid, p_body text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body,''));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_to is null or p_to = me then return json_build_object('ok',false,'msg','Destinatario non valido'); end if;
  if char_length(b) < 1 or char_length(b) > 500 then return json_build_object('ok',false,'msg','Da 1 a 500 caratteri'); end if;
  if public.w_bad(b) then return json_build_object('ok',false,'msg','Non inviato: niente bestemmie, insulti pesanti o minacce.'); end if;
  if exists (select 1 from public.world_blocks where user_id = p_to and blocked = me) then return json_build_object('ok',false,'msg','Non puoi scrivere a questo giocatore'); end if;
  if exists (select 1 from public.world_dm where from_u = me and created_at > now() - interval '3 seconds') then return json_build_object('ok',false,'msg','Piano: un messaggio ogni 3 secondi'); end if;
  if (select count(*) from public.world_dm where from_u = me and created_at > now() - interval '1 day') >= 300 then return json_build_object('ok',false,'msg','Hai raggiunto il limite di oggi'); end if;
  insert into public.world_dm(from_u, to_u, body) values (me, p_to, b);
  return json_build_object('ok',true);
end $$;

--
-- Name: world_dm_threads(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_dm_threads() RETURNS TABLE(user_id uuid, nick text, last_body text, last_at timestamp with time zone, unread bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with m as (select case when from_u = auth.uid() then to_u else from_u end as other, body, created_at, (to_u = auth.uid() and not read) as un
             from public.world_dm where from_u = auth.uid() or to_u = auth.uid())
  select m.other, public.w_nick(m.other), (array_agg(m.body order by m.created_at desc))[1], max(m.created_at), count(*) filter (where m.un)
  from m group by m.other order by max(m.created_at) desc limit 50;
$$;

--
-- Name: world_earn(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_earn(p_reason text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  k text; n int; lim int; amt int; got int := 0; c int; done int;
begin
  if me is null then return json_build_object('ok',false,'msg','accedi'); end if;
  w := public.w_wallet(me);
  if p_reason in ('notte','missione','login') then
    lim := case p_reason when 'notte' then 5 when 'missione' then 3 else 1 end;
    amt := case p_reason when 'notte' then 10 when 'missione' then 15 else 20 end;
    k := p_reason || ':' || day;
    n := coalesce((w.caps->>k)::int, 0);
    if n >= lim then return json_build_object('ok',false,'msg','limite di oggi raggiunto','mattoni',w.mattoni); end if;
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, amt, case p_reason when 'notte' then 'Notte vinta' when 'missione' then 'Missione del giorno' else 'Accesso del giorno' end);
    got := amt;
    if p_reason = 'login' then perform public.w_res(me, 10, 10, 5); end if;
  elsif p_reason = 'verifica' then
    -- valutazione della casa (una volta)
    if coalesce((w.caps->>'valutazione')::int,0) = 0 and exists (select 1 from public.profili_pubblici where user_id = me and indice is not null) then
      update public.world_wallet set caps = jsonb_set(caps, '{valutazione}', '1') where user_id = me;
      perform public.w_pay(me, 200, 'Casa vera valutata'); got := got + 200;
      perform public.w_res(me, 50, 50, 30);
    end if;
    -- codici sconto usati davvero in negozio
    select count(*) into c from public.coupons where user_id = me and redeemed_at is not null;
    done := coalesce((w.caps->>'codici')::int,0);
    if c > done then
      update public.world_wallet set caps = jsonb_set(caps, '{codici}', to_jsonb(c)) where user_id = me;
      perform public.w_pay(me, (c-done)*100, 'Codice sconto usato in negozio'); got := got + (c-done)*100;
    end if;
    -- amici invitati che hanno valutato la casa
    select count(*) into c from public.profili_pubblici where invitato_da = left(me::text,8) and user_id <> me and indice is not null;
    done := coalesce((w.caps->>'inviti')::int,0);
    if c > done then
      update public.world_wallet set caps = jsonb_set(caps, '{inviti}', to_jsonb(c)) where user_id = me;
      perform public.w_pay(me, (c-done)*150, 'Amico invitato ha valutato la casa'); got := got + (c-done)*150;
    end if;
  end if;
  select * into w from public.world_wallet where user_id = me;
  return json_build_object('ok', got > 0, 'got', got, 'mattoni', w.mattoni);
end $$;

--
-- Name: world_edificio_info(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_edificio_info(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); t json; own uuid; nid text := public.w_slot_id(public.w_next_slot(now())); b text; vis boolean; e public.world_assalti_esiti;
begin
  perform public.w_assalti_tick(); perform public.w_pres_tick();
  t := public.w_target(p_bid, p_lat, p_lon);
  if t->>'tipo' = 'none' then return json_build_object('tipo','none'); end if;
  own := (t->>'owner')::uuid; b := t->>'bid';
  vis := own is not null and (own = me or public.w_home_known(me, own) or t->>'tipo' <> 'home');
  select * into e from public.world_assalti_esiti where bid = b and slot_id = public.w_slot_id(public.w_prev_slot(now()));
  return json_build_object('tipo', t->>'tipo', 'bid', b, 'level', (t->>'level')::int, 'nome', t->>'nome',
    'owner', case when vis then own end, 'nick', case when vis then public.w_nick(own) end,
    'mio', own = me, 'alleato', own is not null and own <> me and public.w_are_allies(me, own),
    'scudo', own is not null and public.w_shielded(own), 'custodita', case when t->>'tipo' = 'home' then public.w_custodita(own) end,
    'presente_at', case when own = me and t->>'tipo' = 'home' then (select presente_at from public.world_homes where user_id = me) end,
    'fort', public.w_fort(b),
    'rendita', case when t->>'tipo' = 'owned' then 5 + 5 * (t->>'level')::int + public.w_price((t->>'lat')::double precision, (t->>'lon')::double precision) / 100 end,
    'slot', nid,
    'assalti', (select count(*) from public.world_assalti where bid = b and slot_id = nid and kind = 'atk'),
    'assalti_pts', least(40, (select coalesce(sum(pts),0) from public.world_assalti where bid = b and slot_id = nid and kind = 'atk')),
    'aiuti', (select count(*) from public.world_assalti where bid = b and slot_id = nid and kind = 'aiuto'),
    'aiuti_pts', least(24, (select coalesce(sum(pts),0) from public.world_assalti where bid = b and slot_id = nid and kind = 'aiuto')),
    'assi_pts', least(18, (select coalesce(sum(pts),0) from public.world_assalti where bid = b and slot_id = nid and kind = 'assi')),
    'ultimo', case when e.bid is not null then json_build_object('esito', e.esito, 'vincitore', public.w_nick(e.vincitore)) end,
    'atk', public.w_azione(me, p_bid, p_lat, p_lon, 'atk'), 'aiuto', public.w_azione(me, p_bid, p_lat, p_lon, 'aiuto'), 'assi', public.w_azione(me, p_bid, p_lat, p_lon, 'assi'),
    'risorse', (select json_build_object('legno', legno, 'cibo', cibo, 'carb', carb, 'mattoni', mattoni) from public.world_wallet where user_id = me));
end $$;

--
-- Name: world_eventi_vicini(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_eventi_vicini() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_evento_azione(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_evento_azione(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_fav_set(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_fav_set(p_user uuid, p_on boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_user is null or p_user = auth.uid() then return json_build_object('ok',false,'msg','Non puoi salvare te stesso'); end if;
  if p_on then
    if (select count(*) from public.world_favs where user_id = auth.uid()) >= 200 then
      return json_build_object('ok',false,'msg','Hai già 200 preferiti'); end if;
    if not exists (select 1 from public.profili_pubblici where user_id = p_user) then
      return json_build_object('ok',false,'msg','Superstite non trovato'); end if;
    insert into public.world_favs(user_id, fav) values (auth.uid(), p_user) on conflict do nothing;
  else
    delete from public.world_favs where user_id = auth.uid() and fav = p_user;
  end if;
  return json_build_object('ok',true,'on',p_on);
end $$;

--
-- Name: world_favs_list(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_favs_list() RETURNS TABLE(user_id uuid, nick text, wlevel integer, comune text, ally text, seen_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.user_id, p.nick, public.w_lvl_of(p.user_id), case when p.visibile then p.comune end,
         public.w_ally_state(auth.uid(), p.user_id), p.seen_at
  from public.world_favs f join public.profili_pubblici p on p.user_id = f.fav
  where f.user_id = auth.uid()
  order by p.nick; $$;

--
-- Name: world_feed_list(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_feed_list(p_scope text) RETURNS TABLE(id bigint, kind text, actor uuid, actor_nick text, target uuid, target_nick text, comune text, info text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (select lat, lon from public.world_homes where user_id = auth.uid())
  select f.id, f.kind, f.actor, public.w_nick(f.actor), f.target, case when f.target is not null then public.w_nick(f.target) end,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = f.actor), f.info, f.created_at
  from public.world_feed f
  where f.created_at > now() - interval '7 days'
    and (p_scope = 'mondo'
      or (p_scope = 'zona' and exists (select 1 from me where f.lat between me.lat - 0.3 and me.lat + 0.3 and f.lon between me.lon - 0.4 and me.lon + 0.4))
      or (p_scope = 'alleati' and (f.actor = auth.uid() or f.target = auth.uid() or public.w_are_allies(auth.uid(), f.actor)))
      or (p_scope = 'pervoi' and f.target = auth.uid()))
  order by f.id desc limit 40;
$$;

--
-- Name: world_find(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_find(p_q text) RETURNS TABLE(user_id uuid, nick text, wlevel integer, comune text, ally text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p.user_id, p.nick, public.w_lvl_of(p.user_id), case when p.visibile then p.comune end,
    case when public.w_are_allies(auth.uid(), p.user_id) then 'ok'
         when exists (select 1 from public.world_allies x where x.requester = auth.uid() and x.target = p.user_id and x.status = 'pending') then 'out'
         when exists (select 1 from public.world_allies x where x.requester = p.user_id and x.target = auth.uid() and x.status = 'pending') then 'in'
         else 'none' end
  from public.profili_pubblici p
  where auth.uid() is not null and p.user_id <> auth.uid() and char_length(btrim(coalesce(p_q,''))) >= 2 and p.nick ilike btrim(p_q) || '%'
  order by p.nick limit 12;
$$;

--
-- Name: world_gift_claim(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_gift_claim(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare g public.world_gifts;
begin
  update public.world_gifts set claimed = true where id = p_id and to_u = auth.uid() and not claimed returning * into g;
  if g.id is null then return json_build_object('ok',false); end if;
  return json_build_object('ok',true,'kind',g.kind,'amount',g.amount);
end $$;

--
-- Name: world_gifts_in(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_gifts_in() RETURNS TABLE(id bigint, kind text, amount integer, nick text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select g.id, g.kind, g.amount, public.w_nick(g.from_u) from public.world_gifts g
  where g.to_u = auth.uid() and not g.claimed and g.kind <> 'mattoni' order by g.created_at limit 50;
$$;

--
-- Name: world_give(uuid, text, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_give(p_to uuid, p_kind text, p_amount integer, p_loan boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  lim int; sent int; recv int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_amount is null or p_amount < 1 then return json_build_object('ok',false,'msg','Quantità non valida'); end if;
  if p_kind not in ('mattoni','monete','gemme','giri','biglietti','cibo','legno','metallo','batterie','medicine') then return json_build_object('ok',false,'msg','Cosa non valida'); end if;
  if p_loan and p_kind <> 'mattoni' then return json_build_object('ok',false,'msg','Si prestano solo i Mattoni'); end if;
  if not public.w_are_allies(me, p_to) then return json_build_object('ok',false,'msg','Potete scambiarvi cose solo da alleati: aiutatevi in un’orda o invitatevi'); end if;
  if (select created_at from auth.users where id = me) > now() - interval '3 days' then return json_build_object('ok',false,'msg','Account troppo nuovo: potrai regalare tra qualche giorno'); end if;
  lim := case p_kind when 'mattoni' then 300 when 'monete' then 300 when 'gemme' then 20 when 'giri' then 1 when 'biglietti' then 1 else 10 end;
  select coalesce(sum(amount),0) into sent from public.world_gifts where from_u = me and kind = p_kind and created_at > now() - interval '1 day';
  if sent + p_amount > lim then return json_build_object('ok',false,'msg','Limite di oggi: '||lim||' '||p_kind||' (ne hai già dati '||sent||')'); end if;
  select coalesce(sum(amount),0) into recv from public.world_gifts where to_u = p_to and kind = p_kind and created_at > now() - interval '1 day';
  if recv + p_amount > lim * 2 then return json_build_object('ok',false,'msg','Il tuo alleato ha già ricevuto il massimo di oggi'); end if;
  if p_kind = 'mattoni' then
    w := public.w_wallet(me);
    if w.mattoni < p_amount then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
    update public.world_wallet set mattoni = mattoni - p_amount where user_id = me;
    insert into public.world_log(user_id, delta, reason, seen) values (me, -p_amount, (case when p_loan then 'Prestito a @' else 'Regalo a @' end) || public.w_nick(p_to), true);
    perform public.w_wallet(p_to);
    update public.world_wallet set mattoni = mattoni + p_amount where user_id = p_to;
    insert into public.world_log(user_id, delta, reason) values (p_to, p_amount, (case when p_loan then 'Prestito da @' else 'Regalo da @' end) || public.w_nick(me) || (case when p_loan then ' (torna fra 3 giorni)' else '' end));
    insert into public.world_gifts(from_u, to_u, kind, amount, loan, due_at, left_due, claimed)
      values (me, p_to, p_kind, p_amount, p_loan, case when p_loan then now() + interval '3 days' end, case when p_loan then p_amount else 0 end, true);
  else
    insert into public.world_gifts(from_u, to_u, kind, amount) values (me, p_to, p_kind, p_amount);
  end if;
  return json_build_object('ok',true,'msg', case when p_loan then 'Prestito fatto: torna da solo fra 3 giorni' else 'Regalo inviato' end);
end $$;

--
-- Name: world_help_list(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_help_list() RETURNS TABLE(user_id uuid, nick text, wlevel integer, helpers integer, dist_km numeric, mine_helped boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id), me as (select * from public.world_homes where user_id = auth.uid())
  select r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id),
    (select count(*) from public.world_help_given g where g.target = r.user_id and g.slot_id = n.id)::int,
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me, public.world_homes h where h.user_id = r.user_id),
    exists (select 1 from public.world_help_given g where g.helper = auth.uid() and g.target = r.user_id and g.slot_id = n.id)
  from public.world_help r, n where r.slot_id = n.id and r.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid)
  order by r.created_at desc limit 30;
$$;

--
-- Name: world_home_vis(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_home_vis(p_vis text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); v text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_vis in ('tutti','alleati') then update public.world_homes set vis = p_vis where user_id = me; end if;
  select vis into v from public.world_homes where user_id = me;
  return json_build_object('ok', v is not null, 'vis', v);
end $$;

--
-- Name: world_house_answer(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_house_answer(p_from uuid, p_yes boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); host public.world_homes;
begin
  if me is null or not exists (select 1 from public.world_house_req where from_u = p_from and to_u = me) then return json_build_object('ok',false,'msg','Richiesta non trovata'); end if;
  delete from public.world_house_req where from_u = p_from and to_u = me;
  if not p_yes then return json_build_object('ok',true,'msg','Richiesta rifiutata'); end if;
  select * into host from public.world_homes where user_id = p_from;
  if host.user_id is null then return json_build_object('ok',false,'msg','Casa non trovata'); end if;
  update public.world_homes set building_id = host.building_id, lat = host.lat, lon = host.lon, kind = host.kind, unit = host.unit, kind_set = true,
    status = case when host.status = 'home' then 'home' else status end, confirmed_at = case when host.status = 'home' then now() else confirmed_at end
    where user_id = me;
  perform public.w_feed_add('house_ok', me, p_from, null, null, null);
  return json_build_object('ok',true,'msg','Ora vivete nella stessa casa: fortificazioni e livello in comune');
end $$;

--
-- Name: world_house_info(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_house_info() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with m as (select * from public.world_homes where user_id = auth.uid()), k as (select public.w_condo_key(auth.uid()) as ck)
  select json_build_object(
    'kind', m.kind, 'unit', m.unit, 'kind_set', m.kind_set, 'building_id', m.building_id, 'status', m.status,
    'me_prep', coalesce((select (w.caps->>('prep:'||public.w_slot_id(public.w_next_slot(now()))))::int from public.world_wallet w where w.user_id = m.user_id),0) = 1,
    'members', (select coalesce(json_agg(json_build_object('user_id', o.user_id, 'nick', public.w_nick(o.user_id), 'prep', coalesce((select (w.caps->>('prep:'||public.w_slot_id(public.w_next_slot(now()))))::int from public.world_wallet w where w.user_id = o.user_id),0) = 1)), '[]'::json)
                from public.world_homes o where o.user_id <> m.user_id and o.building_id = m.building_id),
    'neighbors', (select coalesce(json_agg(json_build_object('user_id', o.user_id, 'nick', public.w_nick(o.user_id), 'status', o.status, 'kind', o.kind, 'unit', o.unit, 'prep', coalesce((select (w.caps->>('prep:'||public.w_slot_id(public.w_next_slot(now()))))::int from public.world_wallet w where w.user_id = o.user_id),0) = 1,
                    'seen_at', (select seen_at from public.profili_pubblici where user_id = o.user_id), 'ally', public.w_are_allies(m.user_id, o.user_id),
                    'asked', exists (select 1 from public.world_house_req r where r.from_u = m.user_id and r.to_u = o.user_id))), '[]'::json)
                from public.world_homes o where o.user_id <> m.user_id and o.building_id <> m.building_id and o.status in ('home','pending')
                  and (split_part(o.building_id,'#',1) = split_part(m.building_id,'#',1) or public.w_km(o.lat,o.lon,m.lat,m.lon) < 0.025)),
    'requests', (select coalesce(json_agg(json_build_object('user_id', r.from_u, 'nick', public.w_nick(r.from_u))), '[]'::json) from public.world_house_req r where r.to_u = m.user_id),
    'condo', case when k.ck is null then null else json_build_object('bonus', public.w_condo_bonus(auth.uid()),
      'defs', (select coalesce(json_agg(json_build_object('kind', x.kind, 'level', coalesce(c.level,0), 'pot', coalesce(c.pot,0),
                 'next', case when coalesce(c.level,0) >= 3 then null else 240 * (coalesce(c.level,0) + 1) end,
                 'top', (select coalesce(json_agg(t), '[]'::json) from (select public.w_nick(g.user_id) as nick, sum(g.amount)::int as tot from public.world_condo_gifts g
                          where g.ckey = k.ck and g.kind = x.kind group by g.user_id order by 2 desc limit 3) t))), '[]'::json)
               from (values ('portone'),('cancello'),('telecamere')) x(kind) left join public.world_condo c on c.ckey = k.ck and c.kind = x.kind)) end)
  from m, k;
$$;

--
-- Name: world_house_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_house_invite(p_to uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid();
begin
  if me is null or p_to is null or p_to = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if not public.w_coinq(me, p_to) then return json_build_object('ok',false,'msg','Potete vivere insieme solo se abitate nello stesso edificio'); end if;
  insert into public.world_house_req(from_u, to_u) values (me, p_to) on conflict do nothing;
  perform public.w_feed_add('house_req', me, p_to, null, null, null);
  return json_build_object('ok',true,'msg','Richiesta inviata: quando accetta, condividete la stessa casa');
end $$;

--
-- Name: world_house_leave(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_house_leave() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); h public.world_homes; nid text;
begin
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then return json_build_object('ok',false,'msg','Nessuna casa'); end if;
  nid := split_part(h.building_id,'#',1) || '#p' || left(replace(me::text,'-',''),6);
  insert into public.world_buildings(building_id, lat, lon) values (nid, h.lat, h.lon) on conflict (building_id) do nothing;
  update public.world_homes set building_id = nid where user_id = me;
  return json_build_object('ok',true,'msg','Ora hai una casa tutta tua nello stesso edificio');
end $$;

--
-- Name: world_house_log(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_house_log(p_bid text) RETURNS TABLE(reason text, delta integer, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select l.reason, l.delta, l.created_at from public.world_log l
  where l.user_id = auth.uid() and l.ref = p_bid order by l.created_at desc limit 30;
$$;

--
-- Name: world_inviter(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_inviter(p_code text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select nick from public.profili_pubblici where left(user_id::text, 8) = lower(left(coalesce(p_code,''), 8)) and nick is not null limit 1;
$$;

--
-- Name: world_loans(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_loans() RETURNS TABLE(dir text, nick text, amount integer, left_due integer, due_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select 'dato', public.w_nick(to_u), amount, left_due, due_at from public.world_gifts where from_u = auth.uid() and loan and left_due > 0
  union all
  select 'ricevuto', public.w_nick(from_u), amount, left_due, due_at from public.world_gifts where to_u = auth.uid() and loan and left_due > 0;
$$;

--
-- Name: world_mezzo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_mezzo() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select json_build_object('mezzo', public.w_mezzo(auth.uid()),
    'vero', coalesce((select caps->>'mezzo_vero' from public.world_wallet where user_id = auth.uid()), 'piedi'),
    'comprato', (select caps->>'mezzo_comprato' from public.world_wallet where user_id = auth.uid()),
    'range_km', public.w_mz_range(public.w_mezzo(auth.uid())), 'speed', public.w_mz_speed(public.w_mezzo(auth.uid())),
    'help_pts', public.w_mz_help(public.w_mezzo(auth.uid())) + public.w_dot(auth.uid()), 'dotazioni', public.w_dot(auth.uid()),
    'atk_mult', public.w_mz_atk(public.w_mezzo(auth.uid())),
    'prezzi', json_build_object('moto', 300, 'auto', 600, 'fuori', 1200));
$$;

--
-- Name: world_mine(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_mine() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; h public.world_homes; lvl int; rate int; hrs double precision;
begin
  if me is null then return null; end if;
  perform public.w_settle(me);
  w := public.w_wallet(me);
  select * into h from public.world_homes where user_id = me;
  lvl := public.w_level(w.lifetime);
  select coalesce(sum(5 + 5*level),0) into rate from public.world_buildings where owner = me;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  return json_build_object('mattoni', w.mattoni, 'lifetime', w.lifetime, 'wlevel', lvl, 'next', 100 * power(lvl,2),
    'max', public.w_max(lvl), 'radius_km', public.w_radius(lvl), 'rate', rate, 'ready', floor(rate*hrs/24.0),
    'home', case when h.user_id is null then null else json_build_object('building_id',h.building_id,'status',h.status,'lat',h.lat,'lon',h.lon,'first_at',h.first_at) end,
    'houses', coalesce((select json_agg(json_build_object('building_id',building_id,'lat',lat,'lon',lon,'level',level,'value',paid+upgrades) order by bought_at) from public.world_buildings where owner = me),'[]'::json),
    'news', coalesce((select json_agg(json_build_object('delta',delta,'reason',reason) order by created_at) from public.world_log where user_id = me and not seen),'[]'::json));
end $$;

--
-- Name: world_mine2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_mine2() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then return null; end if;
  perform public.w_settle_loans(auth.uid());
  return public.world_mine();
end $$;

--
-- Name: world_my_defense(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_my_defense() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (select auth.uid() as u), n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  pr as (select w.user_id, coalesce((w.caps->>('prep:'||n.id))::int,0) = 1 as ok from public.world_wallet w, n),
  c as (select
      (case when coalesce((select ok from pr, me where pr.user_id = me.u), false) then 15 else 0 end) as prep,
      least(5, coalesce((select (caps->>'rs')::int from public.world_wallet, me where user_id = me.u),0)) as rs,
      (select count(*) from public.world_help_given, n, me where target = me.u and slot_id = n.id)::int as helps,
      (select coalesce(sum(pts),0) from public.world_help_given, n, me where target = me.u and slot_id = n.id)::int as helpv,
      (select count(*) from public.world_shields, n, me where target = me.u and slot_id = n.id)::int as sh,
      (select count(*) from me, public.w_allies_of(me.u) a(u) join pr on pr.user_id = a.u where pr.ok)::int as ap,
      (select count(*) from me, public.w_allies_of(me.u) a(u) join pr on pr.user_id = a.u where pr.ok and public.w_coinq(me.u, a.u))::int as cq,
      (select count(*) from public.world_attack_given, n, me where target = me.u and slot_id = n.id)::int as atk,
      (select coalesce(sum(pts),0) from public.world_attack_given, n, me where target = me.u and slot_id = n.id)::int as atkv,
      (select count(*) from public.world_curses, n, me where target = me.u and slot_id = n.id and kind = 'nebbia')::int as fog,
      (select count(*) from public.world_curses, n, me where target = me.u and slot_id = n.id and kind = 'sabotaggio')::int as sab,
      public.w_lvl_of(auth.uid()) as wl),
  b as (select c.*, least(35, least(30, atkv) + least(10, 5*fog) + (case when sab > 0 and prep > 0 then 15 else 0 end)) as malus,
      30 + 2 * least(greatest(wl,1),30) as amin, public.w_condo_bonus(auth.uid()) as cb from c),
  hs as (
    select h.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = h.building_id),1) as lvl from public.world_homes h, me where h.user_id = me.u
    union all select bb.building_id, false, bb.level from public.world_buildings bb, me where bb.owner = me.u)
  select json_build_object(
    'prep', b.prep, 'realshield', b.rs, 'realshield_pts', 2*b.rs, 'helps', b.helps, 'helps_pts', least(24,b.helpv),
    'shields', b.sh, 'shields_pts', least(10,5*b.sh), 'squad', b.ap, 'squad_pts', case when b.ap >= 3 then 5 else 0 end,
    'coinq', b.cq, 'coinq_pts', least(9,3*b.cq), 'attacks', b.atk, 'attacks_pts', least(30, b.atkv), 'fog', b.fog, 'sab', b.sab, 'malus', b.malus,
    'bonus', b.prep + 2*b.rs + least(24,b.helpv) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus,
    'attack_min', b.amin, 'attack_max', b.amin + 49, 'condo', b.cb, 'wlevel', b.wl,
    'houses', coalesce((select json_agg(json_build_object('bid', hs.bid, 'home', hs.home, 'level', hs.lvl, 'pres', public.w_pres_bonus(hs.bid, (select id from n)), 'extra', public.w_casa_extra(hs.bid, (select id from n)),
        'total', 45 + 12*greatest(hs.lvl,1) + (case when hs.home then 5 + b.cb else 0 end) + public.w_pres_bonus(hs.bid, (select id from n)) + public.w_casa_extra(hs.bid, (select id from n)) + b.prep + 2*b.rs + least(24,b.helpv) + least(10,5*b.sh) + (case when b.ap >= 3 then 5 else 0 end) + least(9,3*b.cq) - b.malus)) from hs), '[]'::json))
  from b;
$$;

--
-- Name: world_my_effects(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_my_effects() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  e as (
    select c.target as u, c.kind as k from public.world_curses c, n where c.attacker = auth.uid() and c.slot_id = n.id
    union all select a.target, 'orda' from public.world_attack_given a, n where a.attacker = auth.uid() and a.slot_id = n.id
    union all select s.target, 'scudo' from public.world_shields s, n where s.giver = auth.uid() and s.slot_id = n.id
    union all select h.target, 'rinforzi' from public.world_help_given h, n where h.helper = auth.uid() and h.slot_id = n.id),
  hs as (select user_id as u, lat, lon from public.world_homes union all select owner, lat, lon from public.world_buildings where owner is not null)
  select coalesce(json_agg(json_build_object('user_id', e.u, 'nick', public.w_nick(e.u), 'kind', e.k,
    'lat', case when public.w_home_known(auth.uid(), e.u) then hs.lat else round(hs.lat::numeric * 500) / 500 end,
    'lon', case when public.w_home_known(auth.uid(), e.u) then hs.lon else round(hs.lon::numeric * 350) / 350 end)), '[]'::json)
  from e join hs on hs.u = e.u;
$$;

--
-- Name: world_near_survivors(double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_near_survivors(p_lat double precision, p_lon double precision, p_km double precision DEFAULT 20) RETURNS TABLE(user_id uuid, nick text, wlevel integer, comune text, km numeric, ally text, fav boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with mie as (select lat, lon from public.world_homes where user_id = auth.uid()
               union all select lat, lon from public.world_buildings where owner = auth.uid()),
       ok as (select 1 from mie where public.w_km(mie.lat, mie.lon, p_lat, p_lon) <= 0.5 limit 1),
       r as (select least(20, greatest(1, coalesce(p_km, 20))) as km)
  select p.user_id, p.nick, public.w_lvl_of(p.user_id), p.comune,
         round(public.w_km(p_lat, p_lon, p.lat_r, p.lon_r)::numeric, 1),
         public.w_ally_state(auth.uid(), p.user_id),
         exists (select 1 from public.world_favs f where f.user_id = auth.uid() and f.fav = p.user_id)
  from public.profili_pubblici p, r
  where auth.uid() is not null and exists (select 1 from ok)
    and p.user_id <> auth.uid() and p.visibile and p.lat_r is not null and p.lon_r is not null
    and abs(p.lat_r - p_lat) < 0.2 and abs(p.lon_r - p_lon) < 0.3
    and public.w_km(p_lat, p_lon, p.lat_r, p.lon_r) <= r.km
    and not exists (select 1 from public.world_blocks b where (b.user_id = auth.uid() and b.blocked = p.user_id) or (b.user_id = p.user_id and b.blocked = auth.uid()))
  order by 5, p.nick
  limit 80; $$;

--
-- Name: world_player(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_player(p_user uuid) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  d as (select public.w_dist_km(auth.uid(), p_user) as km),
  m as (select public.w_mz_eff(auth.uid(), coalesce((select km from d), 0)) as mz, public.w_mezzo(auth.uid()) as mzp)
  select json_build_object(
    'user_id', p_user, 'nick', public.w_nick(p_user), 'wlevel', public.w_lvl_of(p_user),
    'comune', (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = p_user),
    'houses', (select count(*) from public.world_buildings b where b.owner = p_user),
    'home', exists (select 1 from public.world_homes h where h.user_id = p_user),
    'me', p_user = auth.uid(),
    'ally', case when public.w_are_allies(auth.uid(), p_user) then 'ok'
                 when exists (select 1 from public.world_allies x where x.requester = auth.uid() and x.target = p_user and x.status = 'pending') then 'out'
                 when exists (select 1 from public.world_allies x where x.requester = p_user and x.target = auth.uid() and x.status = 'pending') then 'in'
                 else 'none' end,
    'asked', exists (select 1 from public.world_help w, n where w.user_id = p_user and w.slot_id = n.id),
    'helped', exists (select 1 from public.world_help_given g, n where g.helper = auth.uid() and g.target = p_user and g.slot_id >= n.id),
    'attacked', exists (select 1 from public.world_attack_given a, n where a.attacker = auth.uid() and a.target = p_user and a.slot_id >= n.id),
    'dist_km', round((select km from d)::numeric, 1),
    'mezzo', (select mz from m), 'mezzo_pieno', (select mzp from m), 'range_km', public.w_mz_range((select mz from m)),
    'carb_cost', public.w_mz_carb((select mz from m), (select km from d)), 'carb_pieno', public.w_mz_carb((select mzp from m), (select km from d)),
    'carb', (select carb from public.world_wallet where user_id = auth.uid()),
    'eta_min', ceil((select km from d) / public.w_mz_speed((select mz from m)) * 60),
    'help_pts', public.w_mz_help((select mz from m)) + public.w_dot(auth.uid()),
    'atk_pts', greatest(3, round((6 + 0.5 * public.w_lvl_of(auth.uid())) * public.w_mz_atk((select mz from m))
         * (1 - least(0.6, 0.1 * coalesce((select public.w_fort(h.building_id) from public.world_homes h where h.user_id = p_user limit 1), 0)))))::int,
    'protected', public.w_lvl_of(p_user) < public.w_lvl_of(auth.uid()) - 3,
    'scudo', public.w_shielded(p_user),
    'custodita', public.w_custodita(p_user),
    'saccheggiabile', p_user <> auth.uid() and exists (select 1 from public.world_homes h where h.user_id = p_user and h.status = 'home') and not public.w_custodita(p_user)
      and not public.w_are_allies(auth.uid(), p_user) and not public.w_shielded(p_user))
  from n;
$$;

--
-- Name: world_prepare(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_prepare() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now()));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  perform public.w_wallet(me);
  update public.world_wallet set caps = jsonb_set(caps, array['prep:'||nid], '1') where user_id = me;
  return json_build_object('ok',true,'msg','Case preparate per la prossima orda','next_id',nid);
end $$;

--
-- Name: world_pres_fortifica(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_pres_fortifica(p_id text, p_kind text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); p public.world_presidi; lv int; cost int; w public.world_wallet;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('mura','torretta') then return json_build_object('ok',false,'msg','Fortificazione non valida'); end if;
  select * into p from public.world_presidi where id = p_id;
  if p.id is null then return json_build_object('ok',false,'msg','Presidio non trovato'); end if;
  if p.holder is null then return json_build_object('ok',false,'msg','Il presidio è libero: occupalo prima'); end if;
  if p.holder <> me and not public.w_are_allies(me, p.holder) then return json_build_object('ok',false,'msg','Lo fortificano solo chi lo tiene e i suoi alleati'); end if;
  lv := public.w_pres_liv(p_id, p_kind);
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  cost := 100 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono 🧱 ' || cost); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me and mattoni >= cost;
  if not found then return json_build_object('ok',false,'msg','Servono 🧱 ' || cost); end if;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Presidio: ' || p_kind || ' livello ' || (lv + 1), p_id, true);
  insert into public.world_pres_defs(presidio_id, kind, level) values (p_id, p_kind, lv + 1)
    on conflict (presidio_id, kind) do update set level = excluded.level;
  if p.holder <> me then perform public.w_feed_add('assi', me, p.holder, p.lat, p.lon, 'pres'); end if;
  return json_build_object('ok',true,'level',lv + 1,'cost',cost,'msg',
    case p_kind when 'mura' then '🧱 Mura al livello ' || (lv + 1) || ': +' || 8 * (lv + 1) || ' di difesa, per sempre'
    else '🗼 Torretta al livello ' || (lv + 1) || ': −' || 20 * (lv + 1) || '% alla forza degli assalti dei rivali' end);
end $$;

--
-- Name: world_presenza(double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_presenza(p_lat double precision, p_lon double precision, p_acc double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); h public.world_homes; d double precision; w public.world_wallet; k text := 'presenza:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); r json; got int := 0;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  if p_lat is null or p_lon is null then return json_build_object('ok',false,'msg','Posizione non disponibile'); end if;
  d := public.w_km(h.lat, h.lon, p_lat, p_lon);
  if d > 0.2 + least(greatest(coalesce(p_acc,0),0),100) / 1000.0 then
    return json_build_object('ok',false,'lontano',true,'dist_m',round(d*1000),'msg','Sei a ' || case when d < 1 then round(d*1000) || ' m' else round(d::numeric,1) || ' km' end || ' da casa: la presenza vale entro 200 m'); end if;
  update public.world_homes set presente_at = now() where user_id = me;
  w := public.w_wallet(me);
  if coalesce((w.caps->>k)::int,0) = 0 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], '1') where user_id = me;
    r := public.w_res(me, 0, 0, 10); got := coalesce((r->>'carb')::int,0);
  end if;
  return json_build_object('ok',true,'carb',got,'msg','📍 Sei a casa: rifugio intoccabile per 7 giorni' || case when got > 0 then '. Pieno a casa: ⛽ +' || got else '' end);
end $$;

--
-- Name: world_presidi_list(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); res json; mine int := 0;
begin
  perform public.w_pres_tick();
  if me is not null then select count(*) into mine from public.world_presidi where holder = me; end if;
  select coalesce(json_agg(json_build_object(
      'id', p.id, 'name', p.name, 'kind', p.kind, 'lat', p.lat, 'lon', p.lon,
      'stato', case when p.holder is null then 'libero' when p.holder = me then 'mio' when me is not null and public.w_are_allies(me, p.holder) then 'alleato' else 'altro' end,
      'nick', case when p.holder is not null and me is not null and public.w_home_known(me, p.holder) then (select pp.nick from public.profili_pubblici pp where pp.user_id = p.holder) end,
      'record', p.record, 'dal', p.held_since,
      'perso', p.holder is null and p.perso_il is not null and p.perso_il > now() - interval '24 hours',
      'guardie', (select count(*) from public.world_presidi_guardie g where g.presidio_id = p.id and g.slot_id = nid),
      'io_guardia', me is not null and exists (select 1 from public.world_presidi_guardie g where g.presidio_id = p.id and g.slot_id = nid and g.user_id = me),
      'difesa', public.w_pres_def(p.id, nid),
      'mura', public.w_pres_liv(p.id, 'mura'), 'torretta', public.w_pres_liv(p.id, 'torretta'),
      'vicino', me is not null and public.w_pres_near(me, p.lat, p.lon, 1.0))), '[]'::json)
    into res
    from (select * from public.world_presidi where lat between p_minlat and p_maxlat and lon between p_minlon and p_maxlon order by id limit 150) p;
  return json_build_object('presidi', res, 'miei', mine, 'max', 3, 'slot', nid, 'attacco_min', 50, 'attacco_max', 99);
end $$;

--
-- Name: world_presidi_seed(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_presidi_seed(p jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare me uuid := auth.uid(); e jsonb; n int := 0; c int; la double precision; lo double precision;
begin
  if me is null or jsonb_typeof(p) is distinct from 'array' then return json_build_object('ok', false, 'nuovi', 0); end if;
  for e in select value from jsonb_array_elements(p) limit 60 loop
    begin la := (e->>'lat')::double precision; lo := (e->>'lon')::double precision; exception when others then continue; end;
    if la is null or lo is null or coalesce(e->>'id', '') !~ '^osm:[nwr][0-9]{1,12}$'
       or coalesce(e->>'kind', '') not in ('parco','piazza','stazione','municipio','biblioteca','scuola','ospedale','pompieri','polizia','chiesa','centro','sport')
       or length(trim(coalesce(e->>'name', ''))) not between 2 and 80
       or not public.w_pres_near(me, la, lo, 5.0) then continue; end if;
    insert into public.world_presidi(id, name, kind, lat, lon, created_by)
    values (e->>'id', trim(e->>'name'), e->>'kind', la, lo, me) on conflict (id) do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return json_build_object('ok', true, 'nuovi', n);
end $_$;

--
-- Name: world_presidio_guardia(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_presidio_guardia(p_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); p public.world_presidi; nid text := public.w_slot_id(public.w_next_slot(now())); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per fare la guardia'); end if;
  perform public.w_pres_tick();
  select * into p from public.world_presidi where id = p_id;
  if p.id is null or p.holder is null then return json_build_object('ok', false, 'msg', 'Il presidio è libero: occupalo prima'); end if;
  if p.holder <> me and not public.w_are_allies(me, p.holder) then return json_build_object('ok', false, 'msg', 'Possono fare la guardia solo chi lo tiene e i suoi alleati'); end if;
  insert into public.world_presidi_guardie(presidio_id, user_id, slot_id) values (p_id, me, nid) on conflict do nothing;
  n := (select count(*) from public.world_presidi_guardie where presidio_id = p_id and slot_id = nid);
  return json_build_object('ok', true, 'guardie', n, 'difesa', public.w_pres_def(p_id, nid), 'msg', 'Sei di guardia per la prossima orda');
end $$;

--
-- Name: world_presidio_lascia(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_presidio_lascia(p_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  update public.world_presidi set holder = null, held_since = null, record = 0 where id = p_id and holder = me;
  if not found then return json_build_object('ok', false, 'msg', 'Non lo tieni tu'); end if;
  update public.world_presidi_tenute set al = now() where presidio_id = p_id and user_id = me and al is null;
  return json_build_object('ok', true, 'msg', 'Presidio lasciato');
end $$;

--
-- Name: world_presidio_occupa(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_presidio_occupa(p_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); p public.world_presidi; d double precision; mz text; mzp text; c int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi per occupare un presidio'); end if;
  perform public.w_pres_tick();
  select * into p from public.world_presidi where id = p_id for update;
  if p.id is null then return json_build_object('ok', false, 'msg', 'Presidio non trovato'); end if;
  if p.holder is not null then return json_build_object('ok', false, 'msg', case when p.holder = me then 'Lo tieni già tu' else 'È già tenuto: assaltalo, oppure aspetta che l''orda lo faccia cadere' end); end if;
  d := public.w_dist_pt(me, p.lat, p.lon);
  if d is null or d > 5 then return json_build_object('ok', false, 'msg', 'Serve una tua casa entro 5 km dal presidio'); end if;
  if (select count(*) from public.world_presidi where holder = me) >= 3 then return json_build_object('ok', false, 'msg', 'Tieni già 3 presidi: lasciane uno per occuparne un altro'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); c := public.w_mz_carb(mz, d);
  if d > public.w_mz_range(mz) then
    return json_build_object('ok', false, 'msg', 'È a ' || round(d::numeric,1) || ' km: ' || public.w_mz_nome(mz) || ' arrivi fino a ' || public.w_mz_range(mz) || ' km'
      || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ')' else '. Un mezzo più veloce in Bottega' end); end if;
  update public.world_wallet set carb = carb - c where user_id = me and carb >= c;
  if not found then return json_build_object('ok', false, 'msg', 'Servono ⛽ ' || c); end if;
  update public.world_presidi set holder = me, held_since = now(), record = 0, ultimo_slot = public.w_slot_id(public.w_prev_slot(now())) where id = p_id;
  insert into public.world_presidi_tenute(presidio_id, user_id, dal) values (p_id, me, now());
  return json_build_object('ok', true, 'msg', '🚩 Presidio occupato ' || public.w_mz_nome(mz) || case when c > 0 then ' (⛽ −' || c || ')' else '' end
    || '! Dalla prossima orda dà +3 di difesa alle case entro 500 m e a ogni orda retta ti dà la sua risorsa');
end $$;

--
-- Name: world_quote(text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_quote(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; h public.world_homes; b public.world_buildings; lvl int; nmine int; st text; d double precision; can boolean := false; why text := ''; price int;
  mine_here boolean; other_here boolean; res json; pend boolean;
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  select * into w from public.world_wallet where user_id = me;
  select * into h from public.world_homes where user_id = me;
  select * into b from public.world_buildings where building_id = p_bid;
  lvl := public.w_level(coalesce(w.lifetime,0));
  select count(*) into nmine from public.world_buildings where owner = me;
  mine_here := h.user_id is not null and (split_part(h.building_id,'#',1) = split_part(p_bid,'#',1) or public.w_km(h.lat,h.lon,p_lat,p_lon) < 0.025);
  other_here := exists (select 1 from public.world_homes x where x.user_id <> coalesce(me,'00000000-0000-0000-0000-000000000000'::uuid) and x.status in ('home','pending')
                 and (split_part(x.building_id,'#',1) = split_part(p_bid,'#',1) or public.w_km(x.lat,x.lon,p_lat,p_lon) < 0.025));
  st := case when exists (select 1 from public.world_excluded where building_id = p_bid) then 'excluded'
             when mine_here and h.status = 'home' then 'myhome'
             when mine_here then 'mypending'
             when other_here then 'home'
             when b.owner = me then 'mine' when b.owner is not null then 'owned'
             when public.w_is_npc(p_bid) then 'npc' else 'free' end;
  if st = 'home' then
    select coalesce(json_agg(json_build_object('user_id', x.user_id, 'nick', public.w_nick(x.user_id), 'status', x.status, 'ally', public.w_are_allies(me, x.user_id))), '[]'::json),
           bool_and(x.status = 'pending')
      into res, pend
      from public.world_homes x where x.user_id <> coalesce(me,'00000000-0000-0000-0000-000000000000'::uuid) and x.status in ('home','pending')
       and (split_part(x.building_id,'#',1) = split_part(p_bid,'#',1) or public.w_km(x.lat,x.lon,p_lat,p_lon) < 0.025)
       and public.w_home_known(me, x.user_id);
  end if;
  d := case when h.user_id is null then null else public.w_km(h.lat, h.lon, p_lat, p_lon) end;
  price := public.w_price2(me, p_lat, p_lon);
  if st = 'npc' then price := round(price * 1.3); end if;
  if st in ('free','npc') then
    if me is null then why := 'Accedi per comprare';
    elsif h.user_id is null then why := 'Prima registra la tua casa (Valuta)';
    elsif nmine >= public.w_max(lvl) then why := 'Hai già il massimo di case per il tuo livello: sali di livello';
    elsif coalesce(w.mattoni,0) < price then why := 'Mattoni insufficienti';
    else can := true; end if;
  end if;
  return json_build_object('status', st, 'price', price, 'can', can, 'why', why,
    'owner_nick', case when b.owner is not null then public.w_nick(b.owner) end, 'level', coalesce(b.level,1),
    'value', coalesce(b.paid,0) + coalesce(b.upgrades,0), 'mattoni', coalesce(w.mattoni,0), 'wlevel', lvl,
    'owned', nmine, 'max', public.w_max(lvl), 'radius_km', 20000, 'dist_km', round(coalesce(d,0)::numeric,1),
    'up_cost', 150 * coalesce(b.level,1), 'residents', coalesce(res,'[]'::json),
    'pending', coalesce(pend, exists (select 1 from public.world_homes x where x.status = 'pending' and (split_part(x.building_id,'#',1) = split_part(p_bid,'#',1) or public.w_km(x.lat,x.lon,p_lat,p_lon) < 0.025))));
end $$;

--
-- Name: world_raid_claim(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_raid_claim() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; s json; pid text; r json;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  s := public.world_raid_status(); pid := s->>'prev_id';
  w := public.w_wallet(me);
  if coalesce((w.caps->>('raid:'||pid))::int,0) = 1 then return json_build_object('ok',false,'msg','Premi di questa orda già riscattati'); end if;
  if (s->>'total')::int = 0 and (s->>'bounty')::int = 0 then return json_build_object('ok',false,'msg','Nessuna tua casa era nel mondo durante questa orda'); end if;
  update public.world_wallet set caps = jsonb_set(caps, array['raid:'||pid], '1') where user_id = me;
  perform public.w_pay(me, (s->>'mattoni')::int, 'Orda del mondo: premi');
  r := public.w_res(me, coalesce((s->>'legno')::int,0), coalesce((s->>'cibo')::int,0), coalesce((s->>'carb')::int,0));
  update public.world_log set seen = true where user_id = me and reason = 'Orda del mondo: premi' and not seen;
  return json_build_object('ok',true,'held',(s->>'held')::int,'total',(s->>'total')::int,'mattoni',(s->>'mattoni')::int,'bounty',(s->>'bounty')::int,
    'legno',coalesce((r->>'legno')::int,0),'cibo',coalesce((r->>'cibo')::int,0),'carb',coalesce((r->>'carb')::int,0));
end $$;

--
-- Name: world_raid_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_raid_status() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; pt timestamptz := public.w_prev_slot(now()); nt timestamptz := public.w_next_slot(now());
  pid text := public.w_slot_id(pt); nid text := public.w_slot_id(nt); lvl int; bon int; cb int; res json; held int; tot int; matt int; bounty int;
begin
  perform public.w_assalti_tick();
  if me is null then return json_build_object('next_at', nt, 'prev_at', pt); end if;
  w := public.w_wallet(me); lvl := public.w_level(w.lifetime); bon := public.w_upower(me, pid); cb := public.w_condo_bonus(me);
  select coalesce(json_agg(json_build_object('bid',x.building_id,'lat',x.lat,'lon',x.lon,'level',x.level,'home',x.home,
           'attack',public.w_attack3(pid,x.building_id,lvl),'power',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home),
           'held',public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl))),'[]'::json),
         count(*) filter (where public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl)), count(*),
         coalesce(sum(case when public.w_power3(x.level,bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id,pid) + public.w_casa_extra(x.building_id,pid),x.home) >= public.w_attack3(pid,x.building_id,lvl) then 10 + 6*x.level else 3 end),0)
    into res, held, tot, matt
    from public.w_raid_houses(me, pt) x;
  select 35 * count(*) into bounty from public.world_attack_given a where a.attacker = me and a.slot_id = pid and public.w_home_held(a.target, pid) = false;
  return json_build_object('next_at', nt, 'next_id', nid, 'prev_at', pt, 'prev_id', pid, 'wlevel', lvl,
    'prepared', coalesce((w.caps->>('prep:'||nid))::int,0) = 1, 'prev_prepared', coalesce((w.caps->>('prep:'||pid))::int,0) = 1,
    'claimed', coalesce((w.caps->>('raid:'||pid))::int,0) = 1, 'houses', res, 'held', held, 'total', tot,
    'mattoni', matt + coalesce(bounty,0), 'bounty', coalesce(bounty,0),
    'legno', 4*coalesce(held,0), 'cibo', 6*coalesce(held,0), 'carb', 10*(coalesce(bounty,0)/35),
    'asked', exists (select 1 from public.world_help where user_id = me and slot_id = nid),
    'helpers', (select count(*) from public.world_help_given where target = me and slot_id = nid),
    'attacks_in', (select count(*) from public.world_attack_given where target = me and slot_id = nid),
    'next_bonus', public.w_upower(me, nid),
    'presente_at', (select h.presente_at from public.world_homes h where h.user_id = me), 'custodita', public.w_custodita(me));
end $$;

--
-- Name: world_raid_view(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) RETURNS TABLE(building_id text, lat double precision, lon double precision, held boolean, kind text, mine boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with s as (select public.w_prev_slot(now()) as t, public.w_slot_id(public.w_prev_slot(now())) as id),
  houses as (
    select b.building_id, b.lat, b.lon, b.level, 'owned'::text as kind, b.owner as who
      from public.world_buildings b, s
     where b.owner is not null and b.bought_at <= s.t
       and b.lat between p_minlat and p_maxlat and b.lon between p_minlon and p_maxlon
    union all
    select h.building_id, h.lat, h.lon, coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), 'home', h.user_id
      from public.world_homes h, s
     where h.first_at <= s.t and h.lat between p_minlat and p_maxlat and h.lon between p_minlon and p_maxlon)
  select x.building_id, x.lat, x.lon,
    public.w_power3(x.level, public.w_upower(x.who, s.id) + (case when x.kind = 'home' then public.w_condo_bonus(x.who) else 0 end) + public.w_pres_bonus(x.building_id,s.id) + public.w_casa_extra(x.building_id,s.id), x.kind = 'home') >= public.w_attack3(s.id, x.building_id, public.w_lvl_of(x.who)),
    x.kind, x.who = auth.uid()
  from houses x, s
  limit 600;
$$;

--
-- Name: world_rank(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_rank(p_scope text, p_period text) RETURNS TABLE(pos bigint, user_id uuid, nick text, wlevel integer, punti bigint, comune text, me boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with mh as (select lat, lon from public.world_homes where user_id = auth.uid()),
  base as (
    select w.user_id, (public.w_score(w.user_id, p_period = 'settimana')->>'tot')::bigint as punti
    from public.world_wallet w
    where p_scope <> 'zona' or exists (select 1 from public.world_homes h, mh where h.user_id = w.user_id and h.lat between mh.lat - 0.3 and mh.lat + 0.3 and h.lon between mh.lon - 0.4 and mh.lon + 0.4)),
  r as (select row_number() over (order by punti desc, user_id) as pos, user_id, punti from base)
  select r.pos, r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id), r.punti,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = r.user_id), r.user_id = auth.uid()
  from r where r.pos <= 20 or r.user_id = auth.uid() order by r.pos;
$$;

--
-- Name: world_rank_alleanze(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_rank_alleanze() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with p as (select m.alleanza_id, sum((public.w_score(m.user_id, true)->>'tot')::int) as punti, count(*) as membri
             from public.world_alleanze_membri m group by m.alleanza_id),
  r as (select row_number() over (order by p.punti desc, p.alleanza_id) as pos, p.* from p)
  select coalesce(json_agg(json_build_object('pos', r.pos, 'id', a.id, 'nome', a.nome, 'emblema', a.emblema, 'membri', r.membri, 'punti', r.punti,
      'mia', public.w_in_alleanza(auth.uid(), a.id)) order by r.pos), '[]'::json)
  from r join public.world_alleanze a on a.id = r.alleanza_id where r.pos <= 30 or public.w_in_alleanza(auth.uid(), a.id); $$;

--
-- Name: world_rank_lega(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_rank_lega(p_period text) RETURNS TABLE(pos bigint, user_id uuid, nick text, wlevel integer, punti bigint, comune text, me boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with lg as (select public.w_league(public.w_lvl_of(auth.uid())) as l),
  base as (
    select w.user_id, (public.w_score(w.user_id, p_period = 'settimana')->>'tot')::bigint as punti
    from public.world_wallet w, lg where public.w_league(public.w_level(w.lifetime)) = lg.l),
  r as (select row_number() over (order by punti desc, user_id) as pos, user_id, punti from base)
  select r.pos, r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id), r.punti,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = r.user_id), r.user_id = auth.uid()
  from r where r.pos <= 20 or r.user_id = auth.uid() order by r.pos;
$$;

--
-- Name: world_resources(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_resources() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  return json_build_object('ok',true,'mattoni',w.mattoni,'legno',w.legno,'cibo',w.cibo,'carb',w.carb,
    'mercato_left', 100 - coalesce((w.caps->>('mercato:'||day))::int,0));
end $$;

--
-- Name: world_reward(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_reward(p_amount integer, p_reason text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; k text; n int; give int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi','got',0); end if;
  w := public.w_wallet(me); k := 'premi:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  give := least(greatest(coalesce(p_amount,0),0), 60, 300 - n);
  if give <= 0 then return json_build_object('ok',false,'msg','Hai già preso il massimo dei premi di oggi (300 Mattoni)','got',0); end if;
  update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n + give)) where user_id = me;
  perform public.w_pay(me, give, 'Premio: ' || left(coalesce(p_reason,'fortuna'), 40));
  return json_build_object('ok',true,'got',give);
end $$;

--
-- Name: world_rivals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_rivals() RETURNS TABLE(user_id uuid, nick text, wlevel integer, dist_km numeric, attacked boolean, shield boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id), me as (select * from public.world_homes where user_id = auth.uid()),
  ml as (select public.w_lvl_of(auth.uid()) as l)
  select h.user_id, public.w_nick(h.user_id), public.w_lvl_of(h.user_id),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me),
    exists (select 1 from public.world_attack_given a where a.attacker = auth.uid() and a.target = h.user_id and a.slot_id = n.id),
    public.w_shielded(h.user_id)
  from public.world_homes h, n, ml
  where h.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) and public.w_lvl_of(h.user_id) >= ml.l - 3 and not public.w_are_allies(auth.uid(), h.user_id)
  order by abs(public.w_lvl_of(h.user_id) - ml.l), h.changed_at desc limit 30;
$$;

--
-- Name: world_saccheggia(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_saccheggia(p_user uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare h public.world_homes;
begin
  select * into h from public.world_homes where user_id = p_user and status = 'home';
  if h.user_id is null then return json_build_object('ok',false,'msg','Non ha una casa confermata nel mondo'); end if;
  return public.world_assalta(h.building_id, h.lat, h.lon);
end $$;

--
-- Name: world_score(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_score(p_user uuid, p_period text) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when auth.uid() is null then null else public.w_score(coalesce(p_user, auth.uid()), p_period = 'settimana') end;
$$;

--
-- Name: world_seen(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_seen() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.world_log set seen = true where user_id = auth.uid() and not seen;
$$;

--
-- Name: world_sell(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sell(p_bid text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); b public.world_buildings; back int;
begin
  select * into b from public.world_buildings where building_id = p_bid for update;
  if me is null or b.owner is distinct from me then return json_build_object('ok',false,'msg','Non è tua'); end if;
  back := ((b.paid + b.upgrades) * 7) / 10;
  update public.world_buildings set owner = null, paid = 0, upgrades = 0, level = 1, bought_at = null where building_id = p_bid;
  perform public.w_pay(me, back, 'Casa venduta (70%)', p_bid);
  update public.world_log set seen = true where user_id = me and ref = p_bid and reason like 'Casa venduta%';
  return json_build_object('ok',true,'msg','Venduta','back',back);
end $$;

--
-- Name: world_send_attack(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_send_attack(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int; lost boolean := false;
  mz text; mzp text; c int; d double precision; arr timestamptz; sid text; v int; eta int; quando text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi attaccare te stesso'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: 15 giorni di scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato (o coinquilino): niente orde'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  d := public.w_dist_km(me, p_target);
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, coalesce(d, 0)); c := public.w_mz_carb(mz, d);
  if d is null or d > least(20, public.w_mz_range(mz)) then
    return json_build_object('ok',false,'msg','È a ' || coalesce(round(d::numeric,1)::text,'?') || ' km: ' || case when coalesce(d,99) > 20 then 'le orde arrivano solo entro 20 km (da lontano puoi fare solo dispetti)'
      else public.w_mz_nome(mz) || ' arrivi fino a ' || public.w_mz_range(mz) || ' km' || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ')' else '. Un mezzo più veloce in Bottega' end end); end if;
  if exists (select 1 from public.world_attack_given where attacker = me and target = p_target and slot_id >= nid) then return json_build_object('ok',false,'msg','La tua orda è già in viaggio verso di lui'); end if;
  w := public.w_wallet(me); k := 'orde:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n >= 3 then return json_build_object('ok',false,'msg','Oggi hai già mandato 3 orde'); end if;
  if w.mattoni < 30 then return json_build_object('ok',false,'msg','Servono 30 Mattoni'); end if;
  if w.carb < c then return json_build_object('ok',false,'msg','Servono ⛽ ' || c); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); arr := now() + make_interval(mins => eta);
  sid := public.w_slot_id(public.w_next_slot(arr));
  v := greatest(3, round((6 + 0.5 * public.w_lvl_of(me)) * public.w_mz_atk(mz)
         * (1 - least(0.6, 0.1 * coalesce((select public.w_fort(h.building_id) from public.world_homes h where h.user_id = p_target limit 1), 0)))))::int;
  quando := case when sid = nid then 'per l’orda delle ' || right(sid,2) || ':00' else 'troppo tardi per questa orda: colpirà a quella delle ' || right(sid,2) || ':00' end;
  insert into public.world_attack_given(attacker, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Gli hai già mandato un’orda per quella volta'); end if;
  if public.w_shielded(me) then lost := true; end if;
  update public.world_wallet set mattoni = mattoni - 30, carb = carb - c, caps = jsonb_set(jsonb_set(caps, array[k], to_jsonb(n+1)), '{scudo_off}', case when lost then '1' else coalesce(caps->'scudo_off','0') end) where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -30, 'Orda mandata a un rivale', true);
  return json_build_object('ok',true,'msg','Orda in viaggio ' || public.w_mz_nome(mz) || ': arriva tra ' || eta || ' min, ' || quando || ': −' || v || ' alla sua difesa. Se la sua casa cade, taglia di 25 Mattoni'
    || case when c > 0 then ' · ⛽ −' || c else '' end || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end, 'eta_min', eta, 'slot', sid, 'pts', v, 'carb', c);
end $$;

--
-- Name: world_send_curse(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_send_curse(p_target uuid, p_kind text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); lost boolean := false;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non puoi fare dispetti a te stesso'); end if;
  if p_kind not in ('nebbia','sabotaggio') then return json_build_object('ok',false,'msg','Dispetto non valido'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: ha lo scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato: niente dispetti'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  if (select count(*) from public.world_curses where attacker = me and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok',false,'msg','Oggi hai già fatto 3 dispetti'); end if;
  insert into public.world_curses(attacker, target, slot_id, kind) values (me, p_target, nid, p_kind) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Questo dispetto gliel’hai già fatto per la prossima orda'); end if;
  if public.w_shielded(me) then lost := true; perform public.w_wallet(me); update public.world_wallet set caps = jsonb_set(caps, '{scudo_off}', '1') where user_id = me; end if;
  return json_build_object('ok',true,'msg', (case when p_kind = 'nebbia' then 'Nebbia mandata: −5 alla sua difesa alla prossima orda' else 'Sabotaggio riuscito: se aveva preparato le case, perde il bonus (−15)' end) || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

--
-- Name: world_send_help(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_send_help(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
  mz text; mzp text; c int; d double precision; arr timestamptz; sid text; v int; eta int; quando text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi aiutare te stesso'); end if;
  if not exists (select 1 from public.world_help where user_id = p_target and slot_id = nid) and not public.w_are_allies(me, p_target) then
    return json_build_object('ok',false,'msg','Non ha chiesto aiuto e non è tuo alleato'); end if;
  d := public.w_dist_km(me, p_target);
  if d is null then return json_build_object('ok',false,'msg','Per aiutare serve che abbiate entrambi una casa nel mondo'); end if;
  mzp := public.w_mezzo(me); mz := public.w_mz_eff(me, d); c := public.w_mz_carb(mz, d);
  if d > public.w_mz_range(mz) then
    return json_build_object('ok',false,'msg','È a ' || round(d::numeric,1) || ' km: ' || public.w_mz_nome(mz) || ' arrivi fino a ' || public.w_mz_range(mz) || ' km'
      || case when mz <> mzp then ' (per andare ' || public.w_mz_nome(mzp) || ' servono ⛽ ' || public.w_mz_carb(mzp, d) || ')' when public.w_mz_range(mz) < 20 then '. Un mezzo più veloce in Bottega' else '' end); end if;
  if exists (select 1 from public.world_help_given where helper = me and target = p_target and slot_id >= nid) then return json_build_object('ok',false,'msg','I tuoi rinforzi sono già in viaggio'); end if;
  eta := ceil(d / public.w_mz_speed(mz) * 60); arr := now() + make_interval(mins => eta);
  sid := public.w_slot_id(public.w_next_slot(arr)); v := public.w_mz_help(mz) + public.w_dot(me);
  quando := case when sid = nid then 'in tempo per l’orda delle ' || right(sid,2) || ':00' else 'troppo tardi per questa orda: valgono per quella delle ' || right(sid,2) || ':00' end;
  update public.world_wallet set carb = carb - c where user_id = me and carb >= c;
  if not found then return json_build_object('ok',false,'msg','Carburante insufficiente'); end if;
  insert into public.world_help_given(helper, target, slot_id, pts) values (me, p_target, sid, v) on conflict do nothing;
  if not found then update public.world_wallet set carb = carb + c where user_id = me; return json_build_object('ok',false,'msg','Lo hai già aiutato per quella orda'); end if;
  w := public.w_wallet(me); k := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 10, 'Rinforzi mandati a un alleato');
    perform public.w_res(me, 0, 5, 0);
    update public.world_log set seen = true where user_id = me and reason = 'Rinforzi mandati a un alleato' and not seen;
  end if;
  return json_build_object('ok',true,'msg','Rinforzi in viaggio ' || public.w_mz_nome(mz) || ': arrivano tra ' || eta || ' min, ' || quando || '. +' || v || ' alla sua difesa'
    || case when c > 0 then ' · ⛽ −' || c else '' end || case when n < 5 then ', +10 Mattoni e 🥫 5 a te' else '' end,
    'got', case when n < 5 then 10 else 0 end, 'eta_min', eta, 'slot', sid, 'pts', v, 'carb', c);
end $$;

--
-- Name: world_set_home(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_set_home(p_kind text, p_unit text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); h public.world_homes; base text; u text; nid text; shared boolean; lv int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('casa','condominio','residence') then return json_build_object('ok',false,'msg','Tipo non valido'); end if;
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then return json_build_object('ok',false,'msg','Prima registra la tua casa'); end if;
  base := split_part(h.building_id,'#',1);
  u := left(regexp_replace(lower(coalesce(p_unit,'')), '[^a-z0-9]+', '', 'g'), 16);
  if p_kind = 'condominio' and u = '' then return json_build_object('ok',false,'msg','Scrivi scala e interno (per esempio: A 5)'); end if;
  nid := case when u <> '' and p_kind <> 'casa' then base || '#' || u else base end;
  shared := exists (select 1 from public.world_homes o where o.user_id <> me and o.building_id = h.building_id);
  if nid <> h.building_id then
    lv := coalesce((select level from public.world_buildings where building_id = h.building_id), 1);
    insert into public.world_buildings(building_id, lat, lon, level) values (nid, h.lat, h.lon, case when shared then 1 else lv end)
      on conflict (building_id) do nothing;
    if not shared then
      insert into public.world_defs(building_id, kind, level) select nid, d.kind, d.level from public.world_defs d where d.building_id = h.building_id
        on conflict (building_id, kind) do nothing;
    end if;
  end if;
  update public.world_homes set kind = p_kind, unit = nullif(btrim(p_unit),''), kind_set = true, building_id = nid,
    status = case when p_kind = 'residence' then 'home' else status end,
    confirmed_at = case when p_kind = 'residence' and status <> 'home' then now() else confirmed_at end
    where user_id = me;
  return json_build_object('ok',true,'building_id',nid,'msg',
    case p_kind when 'casa' then 'Casa singola salvata' when 'condominio' then 'Condominio salvato: '||coalesce(nullif(btrim(p_unit),''),'') else 'Residence salvato: casa temporanea' end);
end $$;

--
-- Name: world_set_mezzo_vero(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_set_mezzo_vero(p_mezzo text, p_dot integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); m text;
begin
  if me is null then return json_build_object('ok', false); end if;
  m := case p_mezzo when 'bici' then 'bici' when 'moto' then 'moto' when 'auto' then 'auto' when 'fuori' then 'auto' else 'piedi' end;
  perform public.w_wallet(me);
  update public.world_wallet set caps = jsonb_set(jsonb_set(caps, '{mezzo_vero}', to_jsonb(m)), '{dotazioni}', to_jsonb(least(3, greatest(0, coalesce(p_dot, 0))))) where user_id = me;
  return json_build_object('ok', true, 'mezzo', public.w_mezzo(me));
end $$;

--
-- Name: world_set_realshield(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_set_realshield(p_lvl integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; old int; v int := greatest(0, least(5, coalesce(p_lvl,0)));
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me); old := coalesce((w.caps->>'rs')::int, 0);
  if v = old then return json_build_object('ok',true,'rs',old); end if;
  if coalesce((w.caps->>'rs_at')::bigint,0) > extract(epoch from now())::bigint - 6*3600 and v > old then return json_build_object('ok',false,'rs',old,'msg','Lo Scudo si aggiorna ogni 6 ore'); end if;
  update public.world_wallet set caps = jsonb_set(jsonb_set(caps,'{rs}',to_jsonb(v)),'{rs_at}',to_jsonb(extract(epoch from now())::bigint)) where user_id = me;
  return json_build_object('ok',true,'rs',v);
end $$;

--
-- Name: world_sfida_quartiere(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sfida_quartiere() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

--
-- Name: world_shape_get(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_shape_get(p_k text, p_kind text) RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when s.k is null then null
              when s.val is null and s.updated_at < now() - interval '3 days' then null
              else json_build_object('found', s.val is not null, 'val', s.val) end
  from (select 1) x left join public.world_shapes s on s.k = p_k and s.kind = p_kind
  where auth.uid() is not null;
$$;

--
-- Name: world_shape_put(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_shape_put(p_k text, p_kind text, p_val jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return json_build_object('ok', false); end if;
  if p_kind not in ('geo','bt') or p_k !~ '^-?[0-9]{1,3}\.[0-9]{4,5}_-?[0-9]{1,3}\.[0-9]{4,5}$' then return json_build_object('ok', false, 'msg', 'chiave'); end if;
  if p_val is not null and octet_length(p_val::text) > 40000 then return json_build_object('ok', false, 'msg', 'troppo grande'); end if;
  select count(*) into n from public.world_shapes where by_user = me and updated_at > now() - interval '1 day';
  if n >= 400 then return json_build_object('ok', false, 'msg', 'limite di oggi'); end if;
  insert into public.world_shapes(k, kind, val, by_user, updated_at) values (p_k, p_kind, p_val, me, now())
  on conflict (k, kind) do update set val = excluded.val, by_user = excluded.by_user, updated_at = now()
    -- una forma trovata non viene sostituita da un "non trovato"; si aggiorna se è vecchia di 60 giorni
    where world_shapes.val is null or (excluded.val is not null and world_shapes.updated_at < now() - interval '60 days');
  return json_build_object('ok', true);
end $_$;

--
-- Name: world_shout(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_shout(p_to uuid, p_code integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid();
begin
  if me is null or p_to is null or p_to = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if p_code < 1 or p_code > 12 then return json_build_object('ok',false,'msg','Frase non valida'); end if;
  if (select count(*) from public.world_shouts where from_u = me and created_at > now() - interval '1 day') >= 30 then return json_build_object('ok',false,'msg','Oggi hai già mandato 30 saluti'); end if;
  if exists (select 1 from public.world_shouts where from_u = me and to_u = p_to and created_at > now() - interval '2 minutes') then return json_build_object('ok',false,'msg','Aspetta un attimo prima di salutarlo di nuovo'); end if;
  insert into public.world_shouts(from_u, to_u, code) values (me, p_to, p_code);
  return json_build_object('ok',true,'msg','Saluto inviato');
end $$;

--
-- Name: world_sped_parti(text, text, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; spid uuid; km numeric; c json; en int; mins int; h int; nid bigint; notte boolean;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_kind not in ('cibo','legno','carb','farmaco','misto','sponsor') then return json_build_object('ok', false, 'msg', 'Posto sconosciuto'); end if;
  -- ⭐ sponsor: solo un'attività sponsor attiva vera a meno di 60 m dal punto
  if p_kind = 'sponsor' then
    select sp.id into spid from public.sponsors sp where sp.active and sp.lat is not null
      and public.w_km(p_lat, p_lon, sp.lat, sp.lon) < 0.06 order by public.w_km(p_lat, p_lon, sp.lat, sp.lon) limit 1;
    if spid is null then return json_build_object('ok', false, 'msg', 'Questa attività non è più sponsor: scegli un altro posto'); end if;
  end if;
  if p_lat is null or p_lon is null then return json_build_object('ok', false, 'msg', 'Posto senza posizione'); end if;
  s := public.w_sup(me);
  km := public.w_sped_km(me, p_lat, p_lon);
  if km is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo: le spedizioni partono da lì'); end if;
  km := greatest(0.2, km);
  if km > public.w_sup_raggio(s.xp, s.abil) then
    return json_build_object('ok', false, 'msg', format('È a %s km: il tuo raggio è %s km (sali di grado o usa 🧭 Esploratore)', km, public.w_sup_raggio(s.xp, s.abil)));
  end if;
  if (select count(*) from public.world_spedizioni where user_id = me and stato = 'via') >= 1 + public.w_eq(s.equip, 'radio') then
    return json_build_object('ok', false, 'msg', 'La squadra è già fuori: raccogli prima chi è tornato (📻 la Radio ne fa partire di più)');
  end if;
  if exists (select 1 from public.world_spedizioni where user_id = me and abs(lat - p_lat) < 0.0003 and abs(lon - p_lon) < 0.0004 and start_at > now() - interval '12 hours') then
    return json_build_object('ok', false, 'msg', 'Ci sei già stato: il posto si riempie di nuovo fra 12 ore');
  end if;
  h := extract(hour from now() at time zone 'Europe/Rome'); notte := h >= 20 or h < 7;
  c := public.w_sped_calc(km, s.abil, s.equip, notte);
  en := (c->>'energia')::int; mins := (c->>'min')::int;
  if s.energia < en then
    return json_build_object('ok', false, 'msg', format('Serve ⚡ %s: ne hai %s (una carica ogni %s min)', en, s.energia, public.w_en_ric(s.abil)));
  end if;
  update public.world_superstite set energia = energia - en,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  insert into public.world_spedizioni(user_id, kind, nome, lat, lon, km, end_at, rischio, energia, calc)
    values (me, p_kind, left(coalesce(nullif(trim(p_nome), ''), 'Posto senza nome'), 60), p_lat, p_lon, km, now() + make_interval(mins => mins), (c->>'rischio')::int, en, c::jsonb)
    returning world_spedizioni.id into nid;
  if spid is not null then
    update public.world_spedizioni set calc = calc || jsonb_build_object('sponsor', spid) where id = nid;
    insert into public.sponsor_events(sponsor_id, kind) values (spid, 'spedizione');
  end if;
  return json_build_object('ok', true, 'id', nid, 'min', mins, 'energia', en, 'end_at', now() + make_interval(mins => mins),
    'msg', format('🎒 Partito! Torna fra %s min', mins));
end $$;

--
-- Name: world_sped_raccogli(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sped_raccogli(p_id bigint) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); x public.world_spedizioni; s public.world_superstite; w public.world_wallet; c jsonb; b int; ko boolean;
  l int := 0; f int := 0; k int := 0; e int := 0; xp int; mt int := 0; got json; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); g0 int; tes int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into x from public.world_spedizioni where id = p_id and user_id = me for update;
  if x.id is null or x.stato <> 'via' then return json_build_object('ok', false, 'msg', 'Spedizione già raccolta'); end if;
  if x.end_at > now() then return json_build_object('ok', false, 'msg', 'Non è ancora tornato'); end if;
  s := public.w_sup(me); g0 := public.w_grado(s.xp); c := x.calc;
  ko := random() * 100 < x.rischio;
  b := (c->>'bottino')::int; if ko then b := b / 2; end if;
  case x.kind
    when 'cibo' then f := b;
    when 'legno' then l := b;
    when 'carb' then k := round(b * 0.6);
    when 'farmaco' then f := b / 2; e := case when ko then 1 else 2 end;
    when 'sponsor' then l := b / 2; f := b / 2; k := b / 3;
    else l := b / 3; f := b / 3; k := b / 3;
  end case;
  got := public.w_res(me, l, f, k);
  if e > 0 then perform public.w_en_add(me, e); end if;
  xp := (c->>'xp')::int + case when x.kind = 'sponsor' then 5 else 0 end; if ko then xp := xp / 2; end if;
  perform public.w_xp(me, xp);
  w := public.w_wallet(me); tes := coalesce((w.caps->>('tesori:' || day))::int, 0);
  if random() * 100 < (c->>'tesoro')::int and tes < 5 then
    mt := least(60, 15 + 5 * g0);
    update public.world_wallet set caps = jsonb_set(caps, array['tesori:' || day], to_jsonb(tes + 1)) where user_id = me;
    perform public.w_pay(me, mt, 'Spedizione: tesoro trovato');
  end if;
  update public.world_spedizioni set stato = 'raccolta', avvisato = true,
    esito = jsonb_build_object('ko', ko, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'energia', e, 'xp', xp, 'mattoni', mt)
    where id = p_id;
  s := public.w_sup(me);
  return json_build_object('ok', true, 'ko', ko, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
    'energia', e, 'xp', xp, 'mattoni', mt, 'grado', public.w_grado(s.xp), 'salito', public.w_grado(s.xp) > g0,
    'msg', case when ko then 'Gli zombie l’hanno inseguito: ha portato a casa metà' else 'Spedizione riuscita' end);
end $$;

--
-- Name: world_status_extra(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_status_extra() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select json_build_object(
    'shield', public.w_shielded(auth.uid()),
    'shield_days', greatest(0, 14 - coalesce((select floor(extract(epoch from now() - created_at)/86400)::int from auth.users where id = auth.uid()), 99)),
    'boost', public.w_boost(auth.uid()),
    'median', public.w_median_near(auth.uid()),
    'wlevel', public.w_lvl_of(auth.uid()),
    'league', public.w_league(public.w_lvl_of(auth.uid())),
    'houses', (select count(*) from public.world_buildings where owner = auth.uid()));
$$;

--
-- Name: world_sup_abilita(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sup_abilita(p_k text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; liberi int; a int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('esploratore','resistenza','combattente','cercatore','mercante') then return json_build_object('ok', false, 'msg', 'Abilità sconosciuta'); end if;
  s := public.w_sup(me);
  liberi := (public.w_grado(s.xp) - 1) - (select coalesce(sum(public.w_ab(s.abil, k)), 0) from unnest(array['esploratore','resistenza','combattente','cercatore','mercante']) k);
  a := public.w_ab(s.abil, p_k);
  if liberi <= 0 then return json_build_object('ok', false, 'msg', 'Nessun punto libero: sali di grado con l’esperienza'); end if;
  if a >= 5 then return json_build_object('ok', false, 'msg', 'Questa abilità è già al massimo (5)'); end if;
  update public.world_superstite set abil = jsonb_set(abil, array[p_k], to_jsonb(a + 1)) where user_id = me;
  return json_build_object('ok', true, 'livello', a + 1, 'msg', 'Abilità migliorata');
end $$;

--
-- Name: world_sup_equip(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sup_equip(p_k text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; lv int; cl int; cm int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('zaino','torcia','arma','radio') then return json_build_object('ok', false, 'msg', 'Oggetto sconosciuto'); end if;
  s := public.w_sup(me); w := public.w_wallet(me);
  lv := public.w_eq(s.equip, p_k) + 1;
  if lv > 3 then return json_build_object('ok', false, 'msg', 'È già al livello massimo (3)'); end if;
  cl := 30 * lv; cm := 50 * lv;
  if w.legno < cl or w.mattoni < cm then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s e 🧱 %s', cl, cm)); end if;
  update public.world_wallet set legno = legno - cl where user_id = me;
  perform public.w_pay(me, -cm, 'Equipaggiamento: ' || p_k || ' livello ' || lv);
  update public.world_superstite set equip = jsonb_set(equip, array[p_k], to_jsonb(lv)) where user_id = me;
  return json_build_object('ok', true, 'livello', lv, 'msg', 'Costruito!');
end $$;

--
-- Name: world_sup_extra(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sup_extra() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
begin
  if me is null then return json_build_object('ok', false); end if;
  s := public.w_sup(me); w := public.w_wallet(me);
  return json_build_object('ok', true, 'bombe', s.bombe, 'scudi', s.scudi, 'energia', s.energia,
    'partite', coalesce((w.caps->>('partite:' || day))::int, 0), 'energia_comprata', coalesce((w.caps->>('energia_comprata:' || day))::int, 0),
    'record', coalesce((select max(uccisi) from public.world_partite where user_id = me), 0));
end $$;

--
-- Name: world_sup_info(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sup_info() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; inv json; g int; today date := (now() at time zone 'Europe/Rome')::date;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_wallet(me);
  inv := public.w_sup_inviti(me);
  s := public.w_sup(me);
  g := public.w_grado(s.xp);
  return json_build_object('ok', true,
    'xp', s.xp, 'grado', g, 'xp_da', public.w_grado_xp(g), 'xp_a', public.w_grado_xp(g + 1),
    'punti', greatest(0, (g - 1) - (select coalesce(sum(public.w_ab(s.abil, k)), 0) from unnest(array['esploratore','resistenza','combattente','cercatore','mercante']) k)),
    'abil', s.abil, 'equip', s.equip,
    'energia', s.energia, 'energia_max', public.w_en_max(s.abil), 'ricarica_min', public.w_en_ric(s.abil),
    'prossima_s', case when s.energia >= public.w_en_max(s.abil) then 0
                       else greatest(0, round(extract(epoch from (s.energia_at + make_interval(mins => public.w_en_ric(s.abil)) - now()))))::int end,
    'raggio_km', public.w_sup_raggio(s.xp, s.abil),
    'max_sped', 1 + public.w_eq(s.equip, 'radio'),
    'serie', case when s.serie_day >= today - 1 then s.serie else 0 end,
    'serie_oggi', coalesce(s.serie_day = today, false),
    'share_oggi', coalesce(s.share_day = today, false),
    'inviti', inv,
    'notte', extract(hour from now() at time zone 'Europe/Rome') >= 20 or extract(hour from now() at time zone 'Europe/Rome') < 7,
    'spedizioni', (select coalesce(json_agg(json_build_object('id', x.id, 'kind', x.kind, 'nome', x.nome, 'lat', x.lat, 'lon', x.lon, 'km', x.km,
                     'start_at', x.start_at, 'end_at', x.end_at, 'rischio', x.rischio, 'stato', x.stato, 'esito', x.esito) order by x.stato, x.end_at desc), '[]'::json)
                   from (select * from public.world_spedizioni where user_id = me and (stato = 'via' or end_at > now() - interval '24 hours')
                         order by stato, end_at desc limit 8) x));
end $$;

--
-- Name: world_sup_serie(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sup_serie() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; today date := (now() at time zone 'Europe/Rome')::date; n int; g int; mt int := 0;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_wallet(me);
  s := public.w_sup(me);
  if s.serie_day = today then return json_build_object('ok', false, 'msg', 'Premio della serie già preso oggi: torna domani'); end if;
  n := case when s.serie_day = today - 1 then s.serie + 1 else 1 end;
  g := ((n - 1) % 7) + 1;
  update public.world_superstite set serie = n, serie_day = today where user_id = me;
  perform public.w_res(me, 5 * g, 5 * g, 3 * g);
  perform public.w_xp(me, 10 * g);
  perform public.w_en_add(me, case when g = 7 then 3 else 1 end);
  if g = 7 then mt := 50; perform public.w_pay(me, 50, 'Serie di 7 giorni'); end if;
  return json_build_object('ok', true, 'serie', n, 'giorno', g, 'legno', 5 * g, 'cibo', 5 * g, 'carb', 3 * g, 'xp', 10 * g,
    'energia', case when g = 7 then 3 else 1 end, 'mattoni', mt);
end $$;

--
-- Name: world_sup_share(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_sup_share(p_dove text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); s public.world_superstite; today date := (now() at time zone 'Europe/Rome')::date;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  s := public.w_sup(me);
  if s.share_day = today then return json_build_object('ok', false, 'msg', 'Grazie! Il premio della condivisione è uno al giorno'); end if;
  update public.world_superstite set share_day = today where user_id = me;
  perform public.w_xp(me, 20);
  perform public.w_en_add(me, 1);
  return json_build_object('ok', true, 'xp', 20, 'energia', 1, 'msg', 'Grazie per la condivisione: ⭐ +20 e ⚡ +1');
end $$;

--
-- Name: world_team_bonus(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_team_bonus() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  al as (select a.u from public.w_allies_of(auth.uid()) a(u)),
  pr as (select al.u from al, n join public.world_wallet w on true where w.user_id = al.u and coalesce((w.caps->>('prep:'||n.id))::int,0) = 1)
  select json_build_object(
    'coinq', coalesce((select json_agg(public.w_nick(al.u)) from al where public.w_coinq(auth.uid(), al.u)), '[]'::json),
    'coinq_prep', (select count(*) from pr where public.w_coinq(auth.uid(), pr.u)),
    'allies', (select count(*) from al),
    'allies_prep', (select count(*) from pr),
    'shields_in', (select count(*) from public.world_shields s, n where s.target = auth.uid() and s.slot_id = n.id),
    'shields_out', coalesce((select json_agg(s.target) from public.world_shields s, n where s.giver = auth.uid() and s.slot_id = n.id), '[]'::json));
$$;

--
-- Name: world_threats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_threats() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.w_threats_of(auth.uid());
$$;

--
-- Name: world_trade(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_trade(p_kind text, p_n integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  have int; done int; m int; n int; bon int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('legno','cibo','carb') then return json_build_object('ok',false,'msg','Risorsa sconosciuta'); end if;
  w := public.w_wallet(me);
  have := case p_kind when 'legno' then w.legno when 'cibo' then w.cibo else w.carb end;
  done := coalesce((w.caps->>('mercato:'||day))::int,0);
  n := (least(greatest(coalesce(p_n,0),0), have) / 20) * 20;
  m := least(n / 2, 100 - done); n := m * 2;
  if n <= 0 then return json_build_object('ok',false,'msg', case when done >= 100 then 'Oggi hai già scambiato il massimo (100 Mattoni)' else 'Servono almeno 20 di quella risorsa' end); end if;
  update public.world_wallet set
    legno = legno - case when p_kind = 'legno' then n else 0 end,
    cibo  = cibo  - case when p_kind = 'cibo'  then n else 0 end,
    carb  = carb  - case when p_kind = 'carb'  then n else 0 end,
    caps = jsonb_set(caps, array['mercato:'||day], to_jsonb(done + m))
    where user_id = me;
  perform public.w_pay(me, m, 'Mercato: risorse scambiate');
  bon := (m / 10) * public.w_ab(coalesce((select abil from public.world_superstite where user_id = me), '{}'::jsonb), 'mercante');
  if bon > 0 then perform public.w_pay(me, bon, 'Mercante: bonus dello scambio'); end if;
  return json_build_object('ok',true,'dato',n,'mattoni',m + bon,'bonus',bon,'mercato_left',100 - done - m);
end $$;

--
-- Name: world_upgrade(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_upgrade(p_bid text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); b public.world_buildings; cost int; mine boolean;
begin
  select * into b from public.world_buildings where building_id = p_bid for update;
  mine := coalesce(b.owner = me, false) or exists (select 1 from public.world_homes where user_id = me and building_id = p_bid and status = 'home');
  if me is null or b.building_id is null or not mine then return json_build_object('ok',false,'msg','Non è tua'); end if;
  if b.level >= 5 then return json_build_object('ok',false,'msg','Già al livello massimo'); end if;
  cost := 150 * b.level;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me and mattoni >= cost;
  if not found then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
  update public.world_buildings set level = level + 1, upgrades = upgrades + cost where building_id = p_bid;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Casa potenziata', p_bid, true);
  return json_build_object('ok',true,'msg','Potenziata','level', b.level + 1);
end $$;

--
-- Name: world_view(double precision, double precision, double precision, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) RETURNS TABLE(building_id text, lat double precision, lon double precision, status text, nick text, level integer, residents text, pending boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with me as (select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) as id),
  hm as (select h.building_id, h.lat, h.lon, h.user_id, h.status,
                public.w_home_known(me.id, h.user_id) as known
         from public.world_homes h, me
         where h.status in ('home','pending') and h.lat between p_minlat - 0.001 and p_maxlat + 0.001 and h.lon between p_minlon - 0.001 and p_maxlon + 0.001),
  pts as (select b.building_id, b.lat, b.lon from public.world_buildings b
            where b.lat between p_minlat and p_maxlat and b.lon between p_minlon and p_maxlon and b.owner is not null
          union select hm.building_id, hm.lat, hm.lon from hm where hm.lat between p_minlat and p_maxlat and hm.lon between p_minlon and p_maxlon)
  select p.building_id, p.lat, p.lon,
    case when exists (select 1 from hm, me where hm.user_id = me.id and (split_part(hm.building_id,'#',1) = split_part(p.building_id,'#',1) or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025)) then 'myhome'
         when exists (select 1 from hm where split_part(hm.building_id,'#',1) = split_part(p.building_id,'#',1) or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025) then 'home'
         when bb.owner = (select id from me) then 'mine'
         when bb.owner is not null then 'owned' else 'free' end,
    coalesce(public.w_nick(bb.owner), (select public.w_nick(hm.user_id) from hm, me where hm.known and hm.user_id <> me.id
       and (split_part(hm.building_id,'#',1) = split_part(p.building_id,'#',1) or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025) limit 1)),
    coalesce(bb.level, 1),
    (select string_agg(distinct public.w_nick(hm.user_id), ', ') from hm, me where hm.known and hm.user_id <> me.id
       and (split_part(hm.building_id,'#',1) = split_part(p.building_id,'#',1) or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025)),
    coalesce((select bool_and(hm.status = 'pending') from hm where split_part(hm.building_id,'#',1) = split_part(p.building_id,'#',1) or public.w_km(hm.lat,hm.lon,p.lat,p.lon) < 0.025), false)
  from pts p left join public.world_buildings bb on bb.building_id = p.building_id
  limit 800;
$$;

--
-- Name: world_welcome(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.world_welcome() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet;
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  if coalesce((w.caps->>'benvenuto')::int,0) = 1 then return json_build_object('ok',false,'got',0); end if;
  update public.world_wallet set mattoni = mattoni + 300, caps = jsonb_set(caps, '{benvenuto}', '1') where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, 300, 'Kit di benvenuto', true);
  return json_build_object('ok',true,'got',300,'shield',public.w_shielded(me));
end $$;

--
-- Name: zsh_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.zsh_stats() RETURNS json
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select json_build_object(
    'utenti', (select count(*) from auth.users),
    'online', (select count(*) from public.profili_pubblici where seen_at > now() - interval '5 minutes'),
    'visibili', (select count(*) from public.profili_pubblici where visibile and lat_r is not null));
$$;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    sponsor_id uuid NOT NULL,
    offer_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    redeemed_at timestamp with time zone,
    amount_eur numeric(10,2)
);

--
-- Name: custom_pois; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_pois (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cat text NOT NULL,
    address text,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    phone text,
    website text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: hidden_pois; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hidden_pois (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    lat double precision,
    lon double precision,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    contact text NOT NULL,
    message text,
    consent boolean NOT NULL,
    house_index numeric(3,1),
    status text DEFAULT 'nuovo'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT leads_consent_check CHECK ((consent = true)),
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['nuovo'::text, 'contattato'::text, 'preventivo'::text, 'vinto'::text, 'perso'::text])))
);

--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    title text NOT NULL,
    details text,
    remedy_tags text[],
    active boolean DEFAULT true,
    valid_to date,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: poi_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.poi_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    lat double precision,
    lon double precision,
    motivo text,
    user_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: profili_pubblici; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profili_pubblici (
    user_id uuid NOT NULL,
    nick text NOT NULL,
    lat_r double precision,
    lon_r double precision,
    comune text,
    indice numeric,
    livello integer,
    visibile boolean DEFAULT true,
    seen_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    invitato_da text
);

--
-- Name: push_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_keys (
    id integer DEFAULT 1 NOT NULL,
    public_key text NOT NULL,
    private_key text NOT NULL,
    cron_secret text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: push_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_log (
    slot text NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: push_subs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subs (
    endpoint text NOT NULL,
    user_id uuid,
    p256dh text NOT NULL,
    auth text NOT NULL,
    last_feed timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    piazza text DEFAULT 'zona'::text NOT NULL,
    last_chat timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_subs_piazza_check CHECK ((piazza = ANY (ARRAY['no'::text, 'zona'::text, 'tutto'::text])))
);

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    user_id uuid,
    coupon_id uuid,
    stars integer NOT NULL,
    text text,
    hidden boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_stars_check CHECK (((stars >= 1) AND (stars <= 5)))
);

--
-- Name: salvataggi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salvataggi (
    user_id uuid NOT NULL,
    dati jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: sponsor_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsor_events (
    id bigint NOT NULL,
    sponsor_id uuid NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sponsor_events_kind_check CHECK ((kind = ANY (ARRAY['vista_mappa'::text, 'vista_verdetto'::text, 'vista_gioco'::text, 'scheda'::text, 'chiama'::text, 'whatsapp'::text, 'indicazioni'::text, 'sito'::text, 'codice_creato'::text, 'codice_usato'::text, 'preventivo'::text, 'spedizione'::text])))
);

--
-- Name: sponsor_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sponsor_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: sponsor_prezzi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsor_prezzi (
    package text NOT NULL,
    nome text NOT NULL,
    prezzo_eur numeric(10,2) NOT NULL,
    mesi integer DEFAULT 12 NOT NULL,
    evidenza boolean DEFAULT false NOT NULL,
    attivo boolean DEFAULT true NOT NULL,
    ordine integer DEFAULT 0 NOT NULL,
    CONSTRAINT sponsor_prezzi_mesi_check CHECK (((mesi >= 1) AND (mesi <= 36))),
    CONSTRAINT sponsor_prezzi_prezzo_eur_check CHECK ((prezzo_eur > (0)::numeric))
);

--
-- Name: sponsor_stats_month; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sponsor_stats_month WITH (security_invoker='true') AS
 SELECT sponsor_id,
    count(*) FILTER (WHERE (kind ~~ 'vista_%'::text)) AS visualizzazioni,
    count(*) FILTER (WHERE (kind = 'scheda'::text)) AS schede_aperte,
    count(*) FILTER (WHERE (kind = 'codice_creato'::text)) AS codici_creati,
    count(*) FILTER (WHERE (kind = 'codice_usato'::text)) AS codici_usati,
    count(*) FILTER (WHERE (kind = 'preventivo'::text)) AS preventivi,
    count(*) FILTER (WHERE (kind ~~ 'clic_%'::text)) AS contatti
   FROM public.sponsor_events
  WHERE (created_at >= date_trunc('month'::text, now()))
  GROUP BY sponsor_id;

--
-- Name: sponsor_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsor_users (
    sponsor_id uuid NOT NULL,
    user_id uuid NOT NULL
);

--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    logo_text text,
    category text NOT NULL,
    package text NOT NULL,
    founder boolean DEFAULT false,
    address text,
    comune text,
    provincia text,
    lat double precision,
    lon double precision,
    phone text,
    whatsapp text,
    website text,
    instagram text,
    facebook text,
    active boolean DEFAULT false,
    valid_from date,
    valid_to date,
    created_at timestamp with time zone DEFAULT now(),
    stato text DEFAULT 'attivo'::text NOT NULL,
    visibility text DEFAULT 'normale'::text NOT NULL,
    google_url text,
    tiktok text,
    orari text,
    descrizione text,
    richiesto_da uuid,
    richiesto_il timestamp with time zone,
    CONSTRAINT sponsors_package_check CHECK ((package = ANY (ARRAY['vetrina'::text, 'vetrina_plus'::text, 'partner_categoria'::text, 'agenzia'::text, 'acchiappa'::text, 'nazionale'::text]))),
    CONSTRAINT sponsors_stato_check CHECK ((stato = ANY (ARRAY['in_attesa'::text, 'attivo'::text, 'rifiutato'::text]))),
    CONSTRAINT sponsors_visibility_check CHECK ((visibility = ANY (ARRAY['nascosto'::text, 'normale'::text, 'evidenza'::text])))
);

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    package text NOT NULL,
    price_eur numeric(10,2) NOT NULL,
    period text DEFAULT 'annuale'::text,
    starts_on date,
    ends_on date,
    status text DEFAULT 'attivo'::text,
    invoice_ref text,
    stripe_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['attivo'::text, 'scaduto'::text, 'sospeso'::text])))
);

--
-- Name: world_alleanze; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_alleanze (
    id bigint NOT NULL,
    nome text NOT NULL,
    emblema text DEFAULT '🛡️'::text NOT NULL,
    capo uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_alleanze_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_alleanze_chat (
    id bigint NOT NULL,
    alleanza_id bigint NOT NULL,
    user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_alleanze_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_alleanze_chat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_alleanze_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_alleanze_chat_id_seq OWNED BY public.world_alleanze_chat.id;

--
-- Name: world_alleanze_domande; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_alleanze_domande (
    id bigint NOT NULL,
    alleanza_id bigint NOT NULL,
    user_id uuid NOT NULL,
    tipo text NOT NULL,
    da uuid,
    votanti uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    si uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    no uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    candidato_ok boolean DEFAULT true NOT NULL,
    stato text DEFAULT 'aperta'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_alleanze_domande_stato_check CHECK ((stato = ANY (ARRAY['aperta'::text, 'accettata'::text, 'rifiutata'::text, 'scaduta'::text]))),
    CONSTRAINT world_alleanze_domande_tipo_check CHECK ((tipo = ANY (ARRAY['richiesta'::text, 'invito'::text])))
);

--
-- Name: world_alleanze_domande_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_alleanze_domande_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_alleanze_domande_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_alleanze_domande_id_seq OWNED BY public.world_alleanze_domande.id;

--
-- Name: world_alleanze_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_alleanze_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_alleanze_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_alleanze_id_seq OWNED BY public.world_alleanze.id;

--
-- Name: world_alleanze_membri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_alleanze_membri (
    user_id uuid NOT NULL,
    alleanza_id bigint NOT NULL,
    dal timestamp with time zone DEFAULT now() NOT NULL,
    lat double precision,
    lon double precision
);

--
-- Name: world_allies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_allies (
    requester uuid NOT NULL,
    target uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_assalti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_assalti (
    bid text NOT NULL,
    user_id uuid NOT NULL,
    slot_id text NOT NULL,
    kind text NOT NULL,
    pts integer NOT NULL,
    vittima uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_assalti_kind_check CHECK ((kind = ANY (ARRAY['atk'::text, 'aiuto'::text, 'assi'::text])))
);

--
-- Name: world_assalti_esiti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_assalti_esiti (
    bid text NOT NULL,
    slot_id text NOT NULL,
    held boolean NOT NULL,
    esito text NOT NULL,
    vincitore uuid,
    perdente uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_attack_given; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_attack_given (
    attacker uuid NOT NULL,
    target uuid NOT NULL,
    slot_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    pts integer DEFAULT 8 NOT NULL
);

--
-- Name: world_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_blocks (
    user_id uuid NOT NULL,
    blocked uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_bonus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_bonus (
    id bigint NOT NULL,
    owner uuid,
    claimant uuid,
    building_id text NOT NULL,
    amount integer NOT NULL,
    due_at timestamp with time zone NOT NULL,
    paid boolean DEFAULT false NOT NULL
);

--
-- Name: world_bonus_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_bonus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_bonus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_bonus_id_seq OWNED BY public.world_bonus.id;

--
-- Name: world_buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_buildings (
    building_id text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    owner uuid,
    paid integer DEFAULT 0 NOT NULL,
    upgrades integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    bought_at timestamp with time zone
);

--
-- Name: world_cacce; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_cacce (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    n integer NOT NULL,
    zombie jsonb NOT NULL,
    uccisi integer,
    fine_at timestamp with time zone,
    esito jsonb
);

--
-- Name: world_cacce_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_cacce_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_cacce_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_cacce_id_seq OWNED BY public.world_cacce.id;

--
-- Name: world_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_chat (
    id bigint NOT NULL,
    room text NOT NULL,
    user_id uuid,
    body text NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    reports integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_chat_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 280)))
);

--
-- Name: world_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_chat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_chat_id_seq OWNED BY public.world_chat.id;

--
-- Name: world_chat_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_chat_reports (
    chat_id bigint NOT NULL,
    reporter uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_condo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_condo (
    ckey text NOT NULL,
    kind text NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    pot integer DEFAULT 0 NOT NULL,
    CONSTRAINT world_condo_kind_check CHECK ((kind = ANY (ARRAY['portone'::text, 'cancello'::text, 'telecamere'::text])))
);

--
-- Name: world_condo_gifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_condo_gifts (
    id bigint NOT NULL,
    ckey text NOT NULL,
    kind text NOT NULL,
    user_id uuid,
    amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_condo_gifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_condo_gifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_condo_gifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_condo_gifts_id_seq OWNED BY public.world_condo_gifts.id;

--
-- Name: world_condo_rifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_condo_rifts (
    a uuid NOT NULL,
    b uuid NOT NULL,
    b_wants_peace boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_curses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_curses (
    attacker uuid NOT NULL,
    target uuid NOT NULL,
    slot_id text NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_curses_kind_check CHECK ((kind = ANY (ARRAY['nebbia'::text, 'sabotaggio'::text])))
);

--
-- Name: world_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_defs (
    building_id text NOT NULL,
    kind text NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    CONSTRAINT world_defs_kind_check CHECK ((kind = ANY (ARRAY['fossato'::text, 'barricate'::text, 'sirena'::text, 'fondamenta'::text, 'fari'::text, 'trappole'::text, 'grate'::text, 'recinto'::text, 'cani'::text, 'pompa'::text])))
);

--
-- Name: world_dm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_dm (
    id bigint NOT NULL,
    from_u uuid,
    to_u uuid,
    body text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_dm_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 500)))
);

--
-- Name: world_dm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_dm_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_dm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_dm_id_seq OWNED BY public.world_dm.id;

--
-- Name: world_eventi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_eventi (
    id bigint NOT NULL,
    kind text NOT NULL,
    nome text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    cella text NOT NULL,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    end_at timestamp with time zone NOT NULL,
    hp integer DEFAULT 0 NOT NULL,
    hp_max integer DEFAULT 0 NOT NULL,
    posti integer DEFAULT 1 NOT NULL,
    sponsor_id uuid,
    stato text DEFAULT 'attivo'::text NOT NULL,
    CONSTRAINT world_eventi_kind_check CHECK ((kind = ANY (ARRAY['cassa'::text, 'salva'::text, 'nido'::text, 'sponsor'::text]))),
    CONSTRAINT world_eventi_stato_check CHECK ((stato = ANY (ARRAY['attivo'::text, 'finito'::text])))
);

--
-- Name: world_eventi_azioni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_eventi_azioni (
    evento_id bigint NOT NULL,
    user_id uuid NOT NULL,
    colpi integer DEFAULT 0 NOT NULL,
    danno integer DEFAULT 0 NOT NULL,
    posto integer,
    premio jsonb,
    at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_eventi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_eventi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_eventi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_eventi_id_seq OWNED BY public.world_eventi.id;

--
-- Name: world_excluded; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_excluded (
    building_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_favs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_favs (
    user_id uuid NOT NULL,
    fav uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_feed (
    id bigint NOT NULL,
    kind text NOT NULL,
    actor uuid,
    target uuid,
    lat double precision,
    lon double precision,
    info text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_feed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_feed_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_feed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_feed_id_seq OWNED BY public.world_feed.id;

--
-- Name: world_gifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_gifts (
    id bigint NOT NULL,
    from_u uuid,
    to_u uuid,
    kind text NOT NULL,
    amount integer NOT NULL,
    loan boolean DEFAULT false NOT NULL,
    due_at timestamp with time zone,
    left_due integer DEFAULT 0 NOT NULL,
    claimed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_gifts_amount_check CHECK ((amount > 0))
);

--
-- Name: world_gifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_gifts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_gifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_gifts_id_seq OWNED BY public.world_gifts.id;

--
-- Name: world_help; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_help (
    user_id uuid NOT NULL,
    slot_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_help_given; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_help_given (
    helper uuid NOT NULL,
    target uuid NOT NULL,
    slot_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    pts integer DEFAULT 5 NOT NULL
);

--
-- Name: world_homes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_homes (
    user_id uuid NOT NULL,
    building_id text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    first_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'casa'::text NOT NULL,
    unit text,
    kind_set boolean DEFAULT false NOT NULL,
    vis text DEFAULT 'alleati'::text NOT NULL,
    presente_at timestamp with time zone DEFAULT now(),
    CONSTRAINT world_homes_kind_check CHECK ((kind = ANY (ARRAY['casa'::text, 'condominio'::text, 'residence'::text]))),
    CONSTRAINT world_homes_vis_check CHECK ((vis = ANY (ARRAY['tutti'::text, 'alleati'::text])))
);

--
-- Name: world_house_req; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_house_req (
    from_u uuid NOT NULL,
    to_u uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_log (
    id bigint NOT NULL,
    user_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    ref text,
    seen boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_log_id_seq OWNED BY public.world_log.id;

--
-- Name: world_partite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_partite (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    vite integer NOT NULL,
    ondate integer NOT NULL,
    gratis boolean DEFAULT false NOT NULL,
    bombe integer DEFAULT 0 NOT NULL,
    scudo boolean DEFAULT false NOT NULL,
    uccisi integer,
    resistita boolean,
    fine_at timestamp with time zone,
    esito jsonb
);

--
-- Name: world_partite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_partite_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_partite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_partite_id_seq OWNED BY public.world_partite.id;

--
-- Name: world_pres_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_pres_defs (
    presidio_id text NOT NULL,
    kind text NOT NULL,
    level integer DEFAULT 0 NOT NULL,
    CONSTRAINT world_pres_defs_kind_check CHECK ((kind = ANY (ARRAY['mura'::text, 'torretta'::text]))),
    CONSTRAINT world_pres_defs_level_check CHECK (((level >= 0) AND (level <= 3)))
);

--
-- Name: world_presidi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_presidi (
    id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    holder uuid,
    held_since timestamp with time zone,
    record integer DEFAULT 0 NOT NULL,
    ultimo_slot text,
    perso_da uuid,
    perso_il timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_presidi_guardie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_presidi_guardie (
    presidio_id text NOT NULL,
    user_id uuid NOT NULL,
    slot_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_presidi_tenute; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_presidi_tenute (
    id bigint NOT NULL,
    presidio_id text NOT NULL,
    user_id uuid NOT NULL,
    dal timestamp with time zone DEFAULT now() NOT NULL,
    al timestamp with time zone
);

--
-- Name: world_presidi_tenute_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_presidi_tenute_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_presidi_tenute_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_presidi_tenute_id_seq OWNED BY public.world_presidi_tenute.id;

--
-- Name: world_sfide_fatte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_sfide_fatte (
    settimana date NOT NULL,
    fatto_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_sfide_premi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_sfide_premi (
    settimana date NOT NULL,
    user_id uuid NOT NULL,
    posto integer NOT NULL,
    punti integer NOT NULL,
    mattoni integer NOT NULL
);

--
-- Name: world_shapes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_shapes (
    k text NOT NULL,
    kind text NOT NULL,
    val jsonb,
    by_user uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT world_shapes_kind_check CHECK ((kind = ANY (ARRAY['geo'::text, 'bt'::text])))
);

--
-- Name: world_shields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_shields (
    giver uuid NOT NULL,
    target uuid NOT NULL,
    slot_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_shouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_shouts (
    id bigint NOT NULL,
    from_u uuid,
    to_u uuid,
    code integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_shouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_shouts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_shouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_shouts_id_seq OWNED BY public.world_shouts.id;

--
-- Name: world_spedizioni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_spedizioni (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    nome text,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    km numeric NOT NULL,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    end_at timestamp with time zone NOT NULL,
    rischio integer NOT NULL,
    energia integer NOT NULL,
    calc jsonb DEFAULT '{}'::jsonb NOT NULL,
    stato text DEFAULT 'via'::text NOT NULL,
    esito jsonb,
    avvisato boolean DEFAULT false NOT NULL,
    CONSTRAINT world_spedizioni_kind_check CHECK ((kind = ANY (ARRAY['cibo'::text, 'legno'::text, 'carb'::text, 'farmaco'::text, 'misto'::text, 'sponsor'::text]))),
    CONSTRAINT world_spedizioni_stato_check CHECK ((stato = ANY (ARRAY['via'::text, 'raccolta'::text])))
);

--
-- Name: world_spedizioni_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.world_spedizioni_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: world_spedizioni_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.world_spedizioni_id_seq OWNED BY public.world_spedizioni.id;

--
-- Name: world_terrain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_terrain (
    building_id text NOT NULL,
    elev double precision,
    slope double precision DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_wx; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.world_wx (
    building_id text NOT NULL,
    slot_id text NOT NULL,
    ev text DEFAULT 'calma'::text NOT NULL,
    code integer,
    temp double precision,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: world_alleanze id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze ALTER COLUMN id SET DEFAULT nextval('public.world_alleanze_id_seq'::regclass);

--
-- Name: world_alleanze_chat id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_chat ALTER COLUMN id SET DEFAULT nextval('public.world_alleanze_chat_id_seq'::regclass);

--
-- Name: world_alleanze_domande id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_domande ALTER COLUMN id SET DEFAULT nextval('public.world_alleanze_domande_id_seq'::regclass);

--
-- Name: world_bonus id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bonus ALTER COLUMN id SET DEFAULT nextval('public.world_bonus_id_seq'::regclass);

--
-- Name: world_cacce id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_cacce ALTER COLUMN id SET DEFAULT nextval('public.world_cacce_id_seq'::regclass);

--
-- Name: world_chat id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_chat ALTER COLUMN id SET DEFAULT nextval('public.world_chat_id_seq'::regclass);

--
-- Name: world_condo_gifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_condo_gifts ALTER COLUMN id SET DEFAULT nextval('public.world_condo_gifts_id_seq'::regclass);

--
-- Name: world_dm id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_dm ALTER COLUMN id SET DEFAULT nextval('public.world_dm_id_seq'::regclass);

--
-- Name: world_eventi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_eventi ALTER COLUMN id SET DEFAULT nextval('public.world_eventi_id_seq'::regclass);

--
-- Name: world_feed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_feed ALTER COLUMN id SET DEFAULT nextval('public.world_feed_id_seq'::regclass);

--
-- Name: world_gifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_gifts ALTER COLUMN id SET DEFAULT nextval('public.world_gifts_id_seq'::regclass);

--
-- Name: world_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_log ALTER COLUMN id SET DEFAULT nextval('public.world_log_id_seq'::regclass);

--
-- Name: world_partite id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_partite ALTER COLUMN id SET DEFAULT nextval('public.world_partite_id_seq'::regclass);

--
-- Name: world_presidi_tenute id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_presidi_tenute ALTER COLUMN id SET DEFAULT nextval('public.world_presidi_tenute_id_seq'::regclass);

--
-- Name: world_shouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shouts ALTER COLUMN id SET DEFAULT nextval('public.world_shouts_id_seq'::regclass);

--
-- Name: world_spedizioni id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_spedizioni ALTER COLUMN id SET DEFAULT nextval('public.world_spedizioni_id_seq'::regclass);

--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (user_id);

--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);

--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);

--
-- Name: custom_pois custom_pois_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_pois
    ADD CONSTRAINT custom_pois_pkey PRIMARY KEY (id);

--
-- Name: hidden_pois hidden_pois_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_pois
    ADD CONSTRAINT hidden_pois_pkey PRIMARY KEY (id);

--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);

--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);

--
-- Name: poi_reports poi_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poi_reports
    ADD CONSTRAINT poi_reports_pkey PRIMARY KEY (id);

--
-- Name: profili_pubblici profili_pubblici_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profili_pubblici
    ADD CONSTRAINT profili_pubblici_pkey PRIMARY KEY (user_id);

--
-- Name: push_keys push_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_keys
    ADD CONSTRAINT push_keys_pkey PRIMARY KEY (id);

--
-- Name: push_log push_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_log
    ADD CONSTRAINT push_log_pkey PRIMARY KEY (slot, kind);

--
-- Name: push_subs push_subs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subs
    ADD CONSTRAINT push_subs_pkey PRIMARY KEY (endpoint);

--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

--
-- Name: salvataggi salvataggi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salvataggi
    ADD CONSTRAINT salvataggi_pkey PRIMARY KEY (user_id);

--
-- Name: sponsor_events sponsor_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_events
    ADD CONSTRAINT sponsor_events_pkey PRIMARY KEY (id);

--
-- Name: sponsor_prezzi sponsor_prezzi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_prezzi
    ADD CONSTRAINT sponsor_prezzi_pkey PRIMARY KEY (package);

--
-- Name: sponsor_users sponsor_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_users
    ADD CONSTRAINT sponsor_users_pkey PRIMARY KEY (sponsor_id, user_id);

--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);

--
-- Name: sponsors sponsors_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_slug_key UNIQUE (slug);

--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

--
-- Name: world_alleanze_chat world_alleanze_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_chat
    ADD CONSTRAINT world_alleanze_chat_pkey PRIMARY KEY (id);

--
-- Name: world_alleanze_domande world_alleanze_domande_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_domande
    ADD CONSTRAINT world_alleanze_domande_pkey PRIMARY KEY (id);

--
-- Name: world_alleanze_membri world_alleanze_membri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_membri
    ADD CONSTRAINT world_alleanze_membri_pkey PRIMARY KEY (user_id, alleanza_id);

--
-- Name: world_alleanze world_alleanze_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze
    ADD CONSTRAINT world_alleanze_pkey PRIMARY KEY (id);

--
-- Name: world_allies world_allies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_allies
    ADD CONSTRAINT world_allies_pkey PRIMARY KEY (requester, target);

--
-- Name: world_assalti_esiti world_assalti_esiti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_assalti_esiti
    ADD CONSTRAINT world_assalti_esiti_pkey PRIMARY KEY (bid, slot_id);

--
-- Name: world_assalti world_assalti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_assalti
    ADD CONSTRAINT world_assalti_pkey PRIMARY KEY (bid, user_id, slot_id, kind);

--
-- Name: world_attack_given world_attack_given_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_attack_given
    ADD CONSTRAINT world_attack_given_pkey PRIMARY KEY (attacker, target, slot_id);

--
-- Name: world_blocks world_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_blocks
    ADD CONSTRAINT world_blocks_pkey PRIMARY KEY (user_id, blocked);

--
-- Name: world_bonus world_bonus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bonus
    ADD CONSTRAINT world_bonus_pkey PRIMARY KEY (id);

--
-- Name: world_buildings world_buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_buildings
    ADD CONSTRAINT world_buildings_pkey PRIMARY KEY (building_id);

--
-- Name: world_cacce world_cacce_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_cacce
    ADD CONSTRAINT world_cacce_pkey PRIMARY KEY (id);

--
-- Name: world_chat world_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_chat
    ADD CONSTRAINT world_chat_pkey PRIMARY KEY (id);

--
-- Name: world_chat_reports world_chat_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_chat_reports
    ADD CONSTRAINT world_chat_reports_pkey PRIMARY KEY (chat_id, reporter);

--
-- Name: world_condo_gifts world_condo_gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_condo_gifts
    ADD CONSTRAINT world_condo_gifts_pkey PRIMARY KEY (id);

--
-- Name: world_condo world_condo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_condo
    ADD CONSTRAINT world_condo_pkey PRIMARY KEY (ckey, kind);

--
-- Name: world_condo_rifts world_condo_rifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_condo_rifts
    ADD CONSTRAINT world_condo_rifts_pkey PRIMARY KEY (a, b);

--
-- Name: world_curses world_curses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_curses
    ADD CONSTRAINT world_curses_pkey PRIMARY KEY (attacker, target, slot_id, kind);

--
-- Name: world_defs world_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_defs
    ADD CONSTRAINT world_defs_pkey PRIMARY KEY (building_id, kind);

--
-- Name: world_dm world_dm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_dm
    ADD CONSTRAINT world_dm_pkey PRIMARY KEY (id);

--
-- Name: world_eventi_azioni world_eventi_azioni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_eventi_azioni
    ADD CONSTRAINT world_eventi_azioni_pkey PRIMARY KEY (evento_id, user_id);

--
-- Name: world_eventi world_eventi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_eventi
    ADD CONSTRAINT world_eventi_pkey PRIMARY KEY (id);

--
-- Name: world_excluded world_excluded_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_excluded
    ADD CONSTRAINT world_excluded_pkey PRIMARY KEY (building_id);

--
-- Name: world_favs world_favs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_favs
    ADD CONSTRAINT world_favs_pkey PRIMARY KEY (user_id, fav);

--
-- Name: world_feed world_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_feed
    ADD CONSTRAINT world_feed_pkey PRIMARY KEY (id);

--
-- Name: world_gifts world_gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_gifts
    ADD CONSTRAINT world_gifts_pkey PRIMARY KEY (id);

--
-- Name: world_help_given world_help_given_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_help_given
    ADD CONSTRAINT world_help_given_pkey PRIMARY KEY (helper, target, slot_id);

--
-- Name: world_help world_help_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_help
    ADD CONSTRAINT world_help_pkey PRIMARY KEY (user_id, slot_id);

--
-- Name: world_homes world_homes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_homes
    ADD CONSTRAINT world_homes_pkey PRIMARY KEY (user_id);

--
-- Name: world_house_req world_house_req_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_house_req
    ADD CONSTRAINT world_house_req_pkey PRIMARY KEY (from_u, to_u);

--
-- Name: world_log world_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_log
    ADD CONSTRAINT world_log_pkey PRIMARY KEY (id);

--
-- Name: world_partite world_partite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_partite
    ADD CONSTRAINT world_partite_pkey PRIMARY KEY (id);

--
-- Name: world_pres_defs world_pres_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_pres_defs
    ADD CONSTRAINT world_pres_defs_pkey PRIMARY KEY (presidio_id, kind);

--
-- Name: world_presidi_guardie world_presidi_guardie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_presidi_guardie
    ADD CONSTRAINT world_presidi_guardie_pkey PRIMARY KEY (presidio_id, slot_id, user_id);

--
-- Name: world_presidi world_presidi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_presidi
    ADD CONSTRAINT world_presidi_pkey PRIMARY KEY (id);

--
-- Name: world_presidi_tenute world_presidi_tenute_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_presidi_tenute
    ADD CONSTRAINT world_presidi_tenute_pkey PRIMARY KEY (id);

--
-- Name: world_sfide_fatte world_sfide_fatte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_sfide_fatte
    ADD CONSTRAINT world_sfide_fatte_pkey PRIMARY KEY (settimana);

--
-- Name: world_sfide_premi world_sfide_premi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_sfide_premi
    ADD CONSTRAINT world_sfide_premi_pkey PRIMARY KEY (settimana, user_id);

--
-- Name: world_shapes world_shapes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shapes
    ADD CONSTRAINT world_shapes_pkey PRIMARY KEY (k, kind);

--
-- Name: world_shields world_shields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shields
    ADD CONSTRAINT world_shields_pkey PRIMARY KEY (giver, target, slot_id);

--
-- Name: world_shouts world_shouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shouts
    ADD CONSTRAINT world_shouts_pkey PRIMARY KEY (id);

--
-- Name: world_spedizioni world_spedizioni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_spedizioni
    ADD CONSTRAINT world_spedizioni_pkey PRIMARY KEY (id);

--
-- Name: world_superstite world_superstite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_superstite
    ADD CONSTRAINT world_superstite_pkey PRIMARY KEY (user_id);

--
-- Name: world_terrain world_terrain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_terrain
    ADD CONSTRAINT world_terrain_pkey PRIMARY KEY (building_id);

--
-- Name: world_wallet world_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_wallet
    ADD CONSTRAINT world_wallet_pkey PRIMARY KEY (user_id);

--
-- Name: world_wx world_wx_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_wx
    ADD CONSTRAINT world_wx_pkey PRIMARY KEY (building_id, slot_id);

--
-- Name: world_alleanze_chat_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_alleanze_chat_a ON public.world_alleanze_chat USING btree (alleanza_id, id);

--
-- Name: world_alleanze_domande_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_alleanze_domande_a ON public.world_alleanze_domande USING btree (alleanza_id, stato);

--
-- Name: world_alleanze_membri_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_alleanze_membri_a ON public.world_alleanze_membri USING btree (alleanza_id);

--
-- Name: world_alleanze_membri_u; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_alleanze_membri_u ON public.world_alleanze_membri USING btree (user_id);

--
-- Name: world_alleanze_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX world_alleanze_nome ON public.world_alleanze USING btree (lower(nome));

--
-- Name: world_assalti_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_assalti_slot ON public.world_assalti USING btree (slot_id, kind);

--
-- Name: world_b_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_b_owner ON public.world_buildings USING btree (owner);

--
-- Name: world_b_pos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_b_pos ON public.world_buildings USING btree (lat, lon);

--
-- Name: world_cacce_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_cacce_user ON public.world_cacce USING btree (user_id, start_at DESC);

--
-- Name: world_chat_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_chat_room ON public.world_chat USING btree (room, id DESC);

--
-- Name: world_dm_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_dm_pair ON public.world_dm USING btree (LEAST(from_u, to_u), GREATEST(from_u, to_u), id DESC);

--
-- Name: world_dm_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_dm_to ON public.world_dm USING btree (to_u, read);

--
-- Name: world_eventi_attivi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_eventi_attivi ON public.world_eventi USING btree (stato, end_at);

--
-- Name: world_eventi_cella; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_eventi_cella ON public.world_eventi USING btree (cella, start_at DESC);

--
-- Name: world_feed_t; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_feed_t ON public.world_feed USING btree (created_at DESC);

--
-- Name: world_feed_tg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_feed_tg ON public.world_feed USING btree (target, created_at DESC);

--
-- Name: world_gifts_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_gifts_from ON public.world_gifts USING btree (from_u);

--
-- Name: world_gifts_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_gifts_to ON public.world_gifts USING btree (to_u, claimed);

--
-- Name: world_h_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_h_b ON public.world_homes USING btree (building_id, status);

--
-- Name: world_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_log_user ON public.world_log USING btree (user_id, seen);

--
-- Name: world_partite_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_partite_user ON public.world_partite USING btree (user_id, start_at DESC);

--
-- Name: world_presidi_holder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_presidi_holder ON public.world_presidi USING btree (holder);

--
-- Name: world_presidi_lat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_presidi_lat ON public.world_presidi USING btree (lat, lon);

--
-- Name: world_presidi_tenute_p; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_presidi_tenute_p ON public.world_presidi_tenute USING btree (presidio_id, dal);

--
-- Name: world_spedizioni_tick; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_spedizioni_tick ON public.world_spedizioni USING btree (end_at) WHERE ((stato = 'via'::text) AND (NOT avvisato));

--
-- Name: world_spedizioni_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX world_spedizioni_user ON public.world_spedizioni USING btree (user_id, stato);

--
-- Name: profili_pubblici profili_invite_join; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profili_invite_join AFTER INSERT OR UPDATE OF invitato_da ON public.profili_pubblici FOR EACH ROW EXECUTE FUNCTION public.w_tr_invite_join();

--
-- Name: profili_pubblici profili_pos_casa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profili_pos_casa BEFORE INSERT OR UPDATE OF lat_r, lon_r ON public.profili_pubblici FOR EACH ROW EXECUTE FUNCTION public.w_tr_pos_casa();

--
-- Name: sponsors sponsors_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sponsors_guard BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.sponsors_guard();

--
-- Name: world_dm tr_dm; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_dm AFTER INSERT ON public.world_dm FOR EACH ROW EXECUTE FUNCTION public.w_tr_dm();

--
-- Name: world_allies tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT OR UPDATE ON public.world_allies FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_attack_given tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_attack_given FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_buildings tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT OR UPDATE ON public.world_buildings FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_curses tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_curses FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_gifts tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_gifts FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_help tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_help FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_help_given tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_help_given FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_homes tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT OR UPDATE ON public.world_homes FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_shields tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_shields FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_shouts tr_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_feed AFTER INSERT ON public.world_shouts FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed();

--
-- Name: world_feed world_feed_push; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER world_feed_push AFTER INSERT ON public.world_feed FOR EACH ROW EXECUTE FUNCTION public.w_tr_feed_push();

--
-- Name: world_homes world_homes_pos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER world_homes_pos AFTER INSERT OR UPDATE OF lat, lon, status ON public.world_homes FOR EACH ROW EXECUTE FUNCTION public.w_tr_casa_pos();

--
-- Name: admins admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: coupons coupons_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;

--
-- Name: coupons coupons_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: coupons coupons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Name: leads leads_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: leads leads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Name: offers offers_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: poi_reports poi_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poi_reports
    ADD CONSTRAINT poi_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Name: profili_pubblici profili_pubblici_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profili_pubblici
    ADD CONSTRAINT profili_pubblici_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: push_subs push_subs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subs
    ADD CONSTRAINT push_subs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: reviews reviews_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id);

--
-- Name: reviews reviews_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Name: salvataggi salvataggi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salvataggi
    ADD CONSTRAINT salvataggi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: sponsor_events sponsor_events_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_events
    ADD CONSTRAINT sponsor_events_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: sponsor_users sponsor_users_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_users
    ADD CONSTRAINT sponsor_users_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: sponsor_users sponsor_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_users
    ADD CONSTRAINT sponsor_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: subscriptions subscriptions_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

--
-- Name: world_alleanze_chat world_alleanze_chat_alleanza_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_chat
    ADD CONSTRAINT world_alleanze_chat_alleanza_id_fkey FOREIGN KEY (alleanza_id) REFERENCES public.world_alleanze(id) ON DELETE CASCADE;

--
-- Name: world_alleanze_domande world_alleanze_domande_alleanza_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_domande
    ADD CONSTRAINT world_alleanze_domande_alleanza_id_fkey FOREIGN KEY (alleanza_id) REFERENCES public.world_alleanze(id) ON DELETE CASCADE;

--
-- Name: world_alleanze_membri world_alleanze_membri_alleanza_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_alleanze_membri
    ADD CONSTRAINT world_alleanze_membri_alleanza_id_fkey FOREIGN KEY (alleanza_id) REFERENCES public.world_alleanze(id) ON DELETE CASCADE;

--
-- Name: world_allies world_allies_requester_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_allies
    ADD CONSTRAINT world_allies_requester_fkey FOREIGN KEY (requester) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_allies world_allies_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_allies
    ADD CONSTRAINT world_allies_target_fkey FOREIGN KEY (target) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_attack_given world_attack_given_attacker_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_attack_given
    ADD CONSTRAINT world_attack_given_attacker_fkey FOREIGN KEY (attacker) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_attack_given world_attack_given_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_attack_given
    ADD CONSTRAINT world_attack_given_target_fkey FOREIGN KEY (target) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_blocks world_blocks_blocked_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_blocks
    ADD CONSTRAINT world_blocks_blocked_fkey FOREIGN KEY (blocked) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_blocks world_blocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_blocks
    ADD CONSTRAINT world_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_bonus world_bonus_claimant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bonus
    ADD CONSTRAINT world_bonus_claimant_fkey FOREIGN KEY (claimant) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_bonus world_bonus_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_bonus
    ADD CONSTRAINT world_bonus_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_buildings world_buildings_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_buildings
    ADD CONSTRAINT world_buildings_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE SET NULL;

--
-- Name: world_cacce world_cacce_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_cacce
    ADD CONSTRAINT world_cacce_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_chat_reports world_chat_reports_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_chat_reports
    ADD CONSTRAINT world_chat_reports_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.world_chat(id) ON DELETE CASCADE;

--
-- Name: world_chat_reports world_chat_reports_reporter_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_chat_reports
    ADD CONSTRAINT world_chat_reports_reporter_fkey FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_chat world_chat_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_chat
    ADD CONSTRAINT world_chat_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_condo_gifts world_condo_gifts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_condo_gifts
    ADD CONSTRAINT world_condo_gifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_curses world_curses_attacker_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_curses
    ADD CONSTRAINT world_curses_attacker_fkey FOREIGN KEY (attacker) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_curses world_curses_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_curses
    ADD CONSTRAINT world_curses_target_fkey FOREIGN KEY (target) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_dm world_dm_from_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_dm
    ADD CONSTRAINT world_dm_from_u_fkey FOREIGN KEY (from_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_dm world_dm_to_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_dm
    ADD CONSTRAINT world_dm_to_u_fkey FOREIGN KEY (to_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_eventi_azioni world_eventi_azioni_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_eventi_azioni
    ADD CONSTRAINT world_eventi_azioni_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.world_eventi(id) ON DELETE CASCADE;

--
-- Name: world_eventi_azioni world_eventi_azioni_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_eventi_azioni
    ADD CONSTRAINT world_eventi_azioni_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_feed world_feed_actor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_feed
    ADD CONSTRAINT world_feed_actor_fkey FOREIGN KEY (actor) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_feed world_feed_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_feed
    ADD CONSTRAINT world_feed_target_fkey FOREIGN KEY (target) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_gifts world_gifts_from_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_gifts
    ADD CONSTRAINT world_gifts_from_u_fkey FOREIGN KEY (from_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_gifts world_gifts_to_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_gifts
    ADD CONSTRAINT world_gifts_to_u_fkey FOREIGN KEY (to_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_help_given world_help_given_helper_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_help_given
    ADD CONSTRAINT world_help_given_helper_fkey FOREIGN KEY (helper) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_help_given world_help_given_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_help_given
    ADD CONSTRAINT world_help_given_target_fkey FOREIGN KEY (target) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_help world_help_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_help
    ADD CONSTRAINT world_help_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_homes world_homes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_homes
    ADD CONSTRAINT world_homes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_house_req world_house_req_from_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_house_req
    ADD CONSTRAINT world_house_req_from_u_fkey FOREIGN KEY (from_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_house_req world_house_req_to_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_house_req
    ADD CONSTRAINT world_house_req_to_u_fkey FOREIGN KEY (to_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_log world_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_log
    ADD CONSTRAINT world_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_partite world_partite_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_partite
    ADD CONSTRAINT world_partite_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_pres_defs world_pres_defs_presidio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_pres_defs
    ADD CONSTRAINT world_pres_defs_presidio_id_fkey FOREIGN KEY (presidio_id) REFERENCES public.world_presidi(id) ON DELETE CASCADE;

--
-- Name: world_presidi_guardie world_presidi_guardie_presidio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_presidi_guardie
    ADD CONSTRAINT world_presidi_guardie_presidio_id_fkey FOREIGN KEY (presidio_id) REFERENCES public.world_presidi(id) ON DELETE CASCADE;

--
-- Name: world_presidi_tenute world_presidi_tenute_presidio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_presidi_tenute
    ADD CONSTRAINT world_presidi_tenute_presidio_id_fkey FOREIGN KEY (presidio_id) REFERENCES public.world_presidi(id) ON DELETE CASCADE;

--
-- Name: world_sfide_premi world_sfide_premi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_sfide_premi
    ADD CONSTRAINT world_sfide_premi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_shields world_shields_giver_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shields
    ADD CONSTRAINT world_shields_giver_fkey FOREIGN KEY (giver) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_shields world_shields_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shields
    ADD CONSTRAINT world_shields_target_fkey FOREIGN KEY (target) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_shouts world_shouts_from_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shouts
    ADD CONSTRAINT world_shouts_from_u_fkey FOREIGN KEY (from_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_shouts world_shouts_to_u_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_shouts
    ADD CONSTRAINT world_shouts_to_u_fkey FOREIGN KEY (to_u) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_spedizioni world_spedizioni_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_spedizioni
    ADD CONSTRAINT world_spedizioni_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_superstite world_superstite_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_superstite
    ADD CONSTRAINT world_superstite_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: world_wallet world_wallet_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.world_wallet
    ADD CONSTRAINT world_wallet_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: subscriptions admin gestisce abbonamenti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin gestisce abbonamenti" ON public.subscriptions USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: hidden_pois admin gestisce nascosti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin gestisce nascosti" ON public.hidden_pois USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: poi_reports admin gestisce segnalazioni; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin gestisce segnalazioni" ON public.poi_reports FOR DELETE USING (public.is_admin());

--
-- Name: sponsors admin gestisce sponsor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin gestisce sponsor" ON public.sponsors USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: sponsor_users admin gestisce utenti sponsor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin gestisce utenti sponsor" ON public.sponsor_users USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: poi_reports admin legge segnalazioni; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin legge segnalazioni" ON public.poi_reports FOR SELECT USING (public.is_admin());

--
-- Name: reviews admin modera recensioni; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin modera recensioni" ON public.reviews FOR UPDATE USING (public.is_admin());

--
-- Name: admins admin vede admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin vede admin" ON public.admins FOR SELECT USING (public.is_admin());

--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: offers app legge offerte attive; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app legge offerte attive" ON public.offers FOR SELECT USING ((active OR public.is_admin() OR public.my_sponsor(sponsor_id)));

--
-- Name: reviews app legge recensioni; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app legge recensioni" ON public.reviews FOR SELECT USING (((NOT hidden) OR public.is_admin()));

--
-- Name: sponsors app legge sponsor attivi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app legge sponsor attivi" ON public.sponsors FOR SELECT USING ((active OR public.is_admin() OR public.my_sponsor(id)));

--
-- Name: sponsor_events app registra eventi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "app registra eventi" ON public.sponsor_events FOR INSERT WITH CHECK (true);

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_pois custom_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_admin ON public.custom_pois USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: custom_pois; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_pois ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_pois custom_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY custom_select ON public.custom_pois FOR SELECT USING (true);

--
-- Name: hidden_pois; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hidden_pois ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons lettura codici; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lettura codici" ON public.coupons FOR SELECT USING (((user_id = auth.uid()) OR public.my_sponsor(sponsor_id) OR public.is_admin()));

--
-- Name: offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

--
-- Name: profili_pubblici ognuno aggiorna il suo profilo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ognuno aggiorna il suo profilo" ON public.profili_pubblici FOR UPDATE USING ((user_id = auth.uid()));

--
-- Name: salvataggi ognuno aggiorna il suo salvataggio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ognuno aggiorna il suo salvataggio" ON public.salvataggi FOR UPDATE USING ((user_id = auth.uid()));

--
-- Name: profili_pubblici ognuno cancella il suo profilo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ognuno cancella il suo profilo" ON public.profili_pubblici FOR DELETE USING ((user_id = auth.uid()));

--
-- Name: profili_pubblici ognuno crea il suo profilo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ognuno crea il suo profilo" ON public.profili_pubblici FOR INSERT WITH CHECK ((user_id = auth.uid()));

--
-- Name: salvataggi ognuno crea il suo salvataggio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ognuno crea il suo salvataggio" ON public.salvataggi FOR INSERT WITH CHECK ((user_id = auth.uid()));

--
-- Name: salvataggi ognuno legge il suo salvataggio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "ognuno legge il suo salvataggio" ON public.salvataggi FOR SELECT USING ((user_id = auth.uid()));

--
-- Name: poi_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.poi_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: profili_pubblici; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profili_pubblici ENABLE ROW LEVEL SECURITY;

--
-- Name: push_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: push_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subs ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews recensione verificata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "recensione verificata" ON public.reviews FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.coupons c
  WHERE ((c.id = reviews.coupon_id) AND (c.user_id = auth.uid()) AND (c.redeemed_at IS NOT NULL) AND (c.sponsor_id = reviews.sponsor_id))))));

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: salvataggi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salvataggi ENABLE ROW LEVEL SECURITY;

--
-- Name: profili_pubblici si vedono i profili pubblici; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "si vedono i profili pubblici" ON public.profili_pubblici FOR SELECT USING ((visibile OR (user_id = auth.uid())));

--
-- Name: leads sponsor aggiorna stato preventivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sponsor aggiorna stato preventivo" ON public.leads FOR UPDATE USING ((public.my_sponsor(sponsor_id) OR public.is_admin()));

--
-- Name: offers sponsor e admin gestiscono offerte; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sponsor e admin gestiscono offerte" ON public.offers USING ((public.is_admin() OR public.my_sponsor(sponsor_id))) WITH CHECK ((public.is_admin() OR public.my_sponsor(sponsor_id)));

--
-- Name: leads sponsor legge i suoi preventivi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sponsor legge i suoi preventivi" ON public.leads FOR SELECT USING ((public.my_sponsor(sponsor_id) OR public.is_admin()));

--
-- Name: sponsor_events sponsor legge le sue statistiche; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sponsor legge le sue statistiche" ON public.sponsor_events FOR SELECT USING ((public.my_sponsor(sponsor_id) OR public.is_admin()));

--
-- Name: sponsors sponsor modifica i propri contatti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sponsor modifica i propri contatti" ON public.sponsors FOR UPDATE USING (public.my_sponsor(id)) WITH CHECK (public.my_sponsor(id));

--
-- Name: subscriptions sponsor vede il suo abbonamento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sponsor vede il suo abbonamento" ON public.subscriptions FOR SELECT USING (public.my_sponsor(sponsor_id));

--
-- Name: sponsor_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor_prezzi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_prezzi ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_users ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor_prezzi tutti leggono il listino; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tutti leggono il listino" ON public.sponsor_prezzi FOR SELECT USING (attivo);

--
-- Name: hidden_pois tutti leggono nascosti; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tutti leggono nascosti" ON public.hidden_pois FOR SELECT USING (true);

--
-- Name: coupons utente crea i suoi codici; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "utente crea i suoi codici" ON public.coupons FOR INSERT WITH CHECK ((user_id = auth.uid()));

--
-- Name: leads utente invia preventivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "utente invia preventivo" ON public.leads FOR INSERT WITH CHECK ((user_id = auth.uid()));

--
-- Name: sponsor_users utente vede il proprio legame; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "utente vede il proprio legame" ON public.sponsor_users FOR SELECT USING ((user_id = auth.uid()));

--
-- Name: poi_reports utenti segnalano; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "utenti segnalano" ON public.poi_reports FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));

--
-- Name: world_buildings wb_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wb_sel ON public.world_buildings FOR SELECT USING (true);

--
-- Name: world_excluded we_adm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY we_adm ON public.world_excluded USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: world_excluded we_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY we_sel ON public.world_excluded FOR SELECT USING (true);

--
-- Name: world_gifts wg_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wg_sel ON public.world_gifts FOR SELECT USING (((from_u = auth.uid()) OR (to_u = auth.uid())));

--
-- Name: world_homes wh_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wh_sel ON public.world_homes FOR SELECT USING ((user_id = auth.uid()));

--
-- Name: world_log wl_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wl_sel ON public.world_log FOR SELECT USING ((user_id = auth.uid()));

--
-- Name: world_alleanze; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_alleanze ENABLE ROW LEVEL SECURITY;

--
-- Name: world_alleanze_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_alleanze_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: world_alleanze_domande; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_alleanze_domande ENABLE ROW LEVEL SECURITY;

--
-- Name: world_alleanze_membri; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_alleanze_membri ENABLE ROW LEVEL SECURITY;

--
-- Name: world_allies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_allies ENABLE ROW LEVEL SECURITY;

--
-- Name: world_assalti; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_assalti ENABLE ROW LEVEL SECURITY;

--
-- Name: world_assalti_esiti; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_assalti_esiti ENABLE ROW LEVEL SECURITY;

--
-- Name: world_attack_given; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_attack_given ENABLE ROW LEVEL SECURITY;

--
-- Name: world_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: world_bonus; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_bonus ENABLE ROW LEVEL SECURITY;

--
-- Name: world_buildings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_buildings ENABLE ROW LEVEL SECURITY;

--
-- Name: world_cacce; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_cacce ENABLE ROW LEVEL SECURITY;

--
-- Name: world_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: world_chat_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_chat_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: world_condo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_condo ENABLE ROW LEVEL SECURITY;

--
-- Name: world_condo_gifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_condo_gifts ENABLE ROW LEVEL SECURITY;

--
-- Name: world_condo_rifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_condo_rifts ENABLE ROW LEVEL SECURITY;

--
-- Name: world_curses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_curses ENABLE ROW LEVEL SECURITY;

--
-- Name: world_defs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: world_dm; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_dm ENABLE ROW LEVEL SECURITY;

--
-- Name: world_eventi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_eventi ENABLE ROW LEVEL SECURITY;

--
-- Name: world_eventi_azioni; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_eventi_azioni ENABLE ROW LEVEL SECURITY;

--
-- Name: world_excluded; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_excluded ENABLE ROW LEVEL SECURITY;

--
-- Name: world_favs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_favs ENABLE ROW LEVEL SECURITY;

--
-- Name: world_feed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_feed ENABLE ROW LEVEL SECURITY;

--
-- Name: world_gifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_gifts ENABLE ROW LEVEL SECURITY;

--
-- Name: world_help; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_help ENABLE ROW LEVEL SECURITY;

--
-- Name: world_help_given; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_help_given ENABLE ROW LEVEL SECURITY;

--
-- Name: world_homes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_homes ENABLE ROW LEVEL SECURITY;

--
-- Name: world_house_req; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_house_req ENABLE ROW LEVEL SECURITY;

--
-- Name: world_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_log ENABLE ROW LEVEL SECURITY;

--
-- Name: world_partite; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_partite ENABLE ROW LEVEL SECURITY;

--
-- Name: world_pres_defs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_pres_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: world_presidi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_presidi ENABLE ROW LEVEL SECURITY;

--
-- Name: world_presidi_guardie; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_presidi_guardie ENABLE ROW LEVEL SECURITY;

--
-- Name: world_presidi_tenute; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_presidi_tenute ENABLE ROW LEVEL SECURITY;

--
-- Name: world_sfide_fatte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_sfide_fatte ENABLE ROW LEVEL SECURITY;

--
-- Name: world_sfide_premi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_sfide_premi ENABLE ROW LEVEL SECURITY;

--
-- Name: world_shapes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_shapes ENABLE ROW LEVEL SECURITY;

--
-- Name: world_shields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_shields ENABLE ROW LEVEL SECURITY;

--
-- Name: world_shouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_shouts ENABLE ROW LEVEL SECURITY;

--
-- Name: world_spedizioni; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_spedizioni ENABLE ROW LEVEL SECURITY;

--
-- Name: world_superstite; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_superstite ENABLE ROW LEVEL SECURITY;

--
-- Name: world_terrain; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_terrain ENABLE ROW LEVEL SECURITY;

--
-- Name: world_wallet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_wallet ENABLE ROW LEVEL SECURITY;

--
-- Name: world_wx; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.world_wx ENABLE ROW LEVEL SECURITY;

--
-- Name: world_wallet ww_sel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ww_sel ON public.world_wallet FOR SELECT USING ((user_id = auth.uid()));

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

--
-- Name: FUNCTION admin_link_sponsor(p_sponsor uuid, p_email text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_link_sponsor(p_sponsor uuid, p_email text) TO authenticated;

--
-- Name: FUNCTION admin_sponsor_accounts(p_sponsor uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_sponsor_accounts(p_sponsor uuid) TO authenticated;

--
-- Name: FUNCTION admin_sponsor_set(p_id uuid, p_stato text, p_visibility text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.admin_sponsor_set(p_id uuid, p_stato text, p_visibility text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_sponsor_set(p_id uuid, p_stato text, p_visibility text) TO authenticated;

--
-- Name: FUNCTION admin_world_exclude(p_bid text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.admin_world_exclude(p_bid text) TO authenticated;

--
-- Name: FUNCTION delete_my_account(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_my_account() TO authenticated;

--
-- Name: FUNCTION miei_invitati(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.miei_invitati() TO authenticated;

--
-- Name: FUNCTION push_piazza(p_endpoint text, p_mode text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.push_piazza(p_endpoint text, p_mode text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.push_piazza(p_endpoint text, p_mode text) TO authenticated;

--
-- Name: FUNCTION push_subscribe(p_endpoint text, p_p256dh text, p_auth text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text) TO authenticated;

--
-- Name: FUNCTION push_unsubscribe(p_endpoint text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.push_unsubscribe(p_endpoint text) TO authenticated;

--
-- Name: FUNCTION sponsor_pagato(p_sponsor uuid, p_package text, p_stripe_id text, p_eur numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sponsor_pagato(p_sponsor uuid, p_package text, p_stripe_id text, p_eur numeric) FROM PUBLIC;

--
-- Name: FUNCTION sponsor_request(p jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sponsor_request(p jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sponsor_request(p jsonb) TO authenticated;

--
-- Name: FUNCTION sponsor_scadenze(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sponsor_scadenze() FROM PUBLIC;

--
-- Name: FUNCTION w_alleanza_chiudi(p_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_alleanza_chiudi(p_id bigint) FROM PUBLIC;

--
-- Name: FUNCTION w_alleanza_di(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_alleanza_di(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_allies_of(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_allies_of(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_ally_state(a uuid, b uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_ally_state(a uuid, b uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_ancora(p_user uuid, p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_ancora(p_user uuid, p_aid bigint) FROM PUBLIC;

--
-- Name: FUNCTION w_are_allies(a uuid, b uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_are_allies(a uuid, b uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_assalti_tick(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_assalti_tick() FROM PUBLIC;

--
-- Name: FUNCTION w_atk_b(p_user uuid, p_mz text, p_bid text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_atk_b(p_user uuid, p_mz text, p_bid text) FROM PUBLIC;

--
-- Name: FUNCTION w_attivita(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_attivita(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_azione(me uuid, p_bid text, p_lat double precision, p_lon double precision, p_kind text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_azione(me uuid, p_bid text, p_lat double precision, p_lon double precision, p_kind text) FROM PUBLIC;

--
-- Name: FUNCTION w_boost(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_boost(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_canon(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.w_canon(p_bid text, p_lat double precision, p_lon double precision) TO anon;
GRANT ALL ON FUNCTION public.w_canon(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION w_casa_extra(p_bid text, p_slot text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_casa_extra(p_bid text, p_slot text) FROM PUBLIC;

--
-- Name: FUNCTION w_casa_manca_tick(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_casa_manca_tick() FROM PUBLIC;
GRANT ALL ON FUNCTION public.w_casa_manca_tick() TO service_role;

--
-- Name: FUNCTION w_cleanup(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_cleanup() FROM PUBLIC;

--
-- Name: FUNCTION w_coinq(p_a uuid, p_b uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_coinq(p_a uuid, p_b uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_condo_admin(p_ckey text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_condo_admin(p_ckey text) FROM PUBLIC;

--
-- Name: FUNCTION w_condo_bonus(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_condo_bonus(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_condo_key(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_condo_key(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_condo_vicini(p_a uuid, p_b uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_condo_vicini(p_a uuid, p_b uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_custodita(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_custodita(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_def(p_bid text, p_kind text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_def(p_bid text, p_kind text) FROM PUBLIC;

--
-- Name: FUNCTION w_dist_alleanza(p_aid bigint, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_dist_alleanza(p_aid bigint, p_lat double precision, p_lon double precision) FROM PUBLIC;

--
-- Name: FUNCTION w_dist_pt(p_user uuid, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_dist_pt(p_user uuid, p_lat double precision, p_lon double precision) FROM PUBLIC;

--
-- Name: FUNCTION w_en_add(p_user uuid, p_n integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_en_add(p_user uuid, p_n integer) FROM PUBLIC;

--
-- Name: FUNCTION w_eventi_tick(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_eventi_tick() FROM PUBLIC;
GRANT ALL ON FUNCTION public.w_eventi_tick() TO service_role;

--
-- Name: FUNCTION w_feed_add(p_kind text, p_actor uuid, p_target uuid, p_lat double precision, p_lon double precision, p_info text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_feed_add(p_kind text, p_actor uuid, p_target uuid, p_lat double precision, p_lon double precision, p_info text) FROM PUBLIC;

--
-- Name: FUNCTION w_home_held(p_user uuid, p_slot text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_home_held(p_user uuid, p_slot text) FROM PUBLIC;

--
-- Name: FUNCTION w_home_known(p_me uuid, p_u uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_home_known(p_me uuid, p_u uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_in_alleanza(p_user uuid, p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_in_alleanza(p_user uuid, p_aid bigint) FROM PUBLIC;

--
-- Name: FUNCTION w_is_npc(p_bid text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.w_is_npc(p_bid text) TO anon;
GRANT ALL ON FUNCTION public.w_is_npc(p_bid text) TO authenticated;

--
-- Name: FUNCTION w_median_near(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_median_near(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_mz_eff(p_user uuid, p_km double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_mz_eff(p_user uuid, p_km double precision) FROM PUBLIC;

--
-- Name: FUNCTION w_pay(p_user uuid, p_delta integer, p_reason text, p_ref text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_pay(p_user uuid, p_delta integer, p_reason text, p_ref text) FROM PUBLIC;

--
-- Name: FUNCTION w_perche_no(p_user uuid, p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_perche_no(p_user uuid, p_aid bigint) FROM PUBLIC;

--
-- Name: FUNCTION w_piazza_nuovi(p_user uuid, p_since timestamp with time zone, p_mode text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_piazza_nuovi(p_user uuid, p_since timestamp with time zone, p_mode text) FROM PUBLIC;

--
-- Name: FUNCTION w_pres_rendita(p_user uuid, p_kind text, p_record integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_pres_rendita(p_user uuid, p_kind text, p_record integer) FROM PUBLIC;

--
-- Name: FUNCTION w_pres_tick(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_pres_tick() FROM PUBLIC;

--
-- Name: FUNCTION w_raid_houses(p_user uuid, p_slot_t timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_raid_houses(p_user uuid, p_slot_t timestamp with time zone) FROM PUBLIC;

--
-- Name: FUNCTION w_res(p_user uuid, p_legno integer, p_cibo integer, p_carb integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_res(p_user uuid, p_legno integer, p_cibo integer, p_carb integer) FROM PUBLIC;

--
-- Name: FUNCTION w_rift(p_a uuid, p_b uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_rift(p_a uuid, p_b uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_score(p_user uuid, p_week boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_score(p_user uuid, p_week boolean) FROM PUBLIC;

--
-- Name: FUNCTION w_settle(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_settle(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_settle_loans(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_settle_loans(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_sfida_premi(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_sfida_premi() FROM PUBLIC;
GRANT ALL ON FUNCTION public.w_sfida_premi() TO service_role;

--
-- Name: FUNCTION w_sfida_punti(p_user uuid, p_da timestamp with time zone, p_a timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_sfida_punti(p_user uuid, p_da timestamp with time zone, p_a timestamp with time zone) FROM PUBLIC;

--
-- Name: FUNCTION w_shielded(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_shielded(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_slope(p_bid text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_slope(p_bid text) FROM PUBLIC;

--
-- Name: FUNCTION w_sped_km(p_user uuid, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_sped_km(p_user uuid, p_lat double precision, p_lon double precision) FROM PUBLIC;

--
-- Name: FUNCTION w_sped_tick(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_sped_tick() FROM PUBLIC;
GRANT ALL ON FUNCTION public.w_sped_tick() TO service_role;

--
-- Name: FUNCTION w_sup(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_sup(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_sup_inviti(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_sup_inviti(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_target(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_target(p_bid text, p_lat double precision, p_lon double precision) FROM PUBLIC;

--
-- Name: FUNCTION w_threats_of(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_threats_of(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_tr_casa_pos(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_tr_casa_pos() FROM PUBLIC;

--
-- Name: FUNCTION w_tr_feed_push(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_tr_feed_push() FROM PUBLIC;

--
-- Name: FUNCTION w_tr_invite_join(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_tr_invite_join() FROM PUBLIC;

--
-- Name: FUNCTION w_tr_pos_casa(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_tr_pos_casa() FROM PUBLIC;

--
-- Name: FUNCTION w_upower(p_user uuid, p_slot text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_upower(p_user uuid, p_slot text) FROM PUBLIC;

--
-- Name: FUNCTION w_vicino_alleanza(p_user uuid, p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_vicino_alleanza(p_user uuid, p_aid bigint) FROM PUBLIC;

--
-- Name: FUNCTION w_votanti(p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_votanti(p_aid bigint) FROM PUBLIC;

--
-- Name: FUNCTION w_wallet(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_wallet(p_user uuid) FROM PUBLIC;

--
-- Name: FUNCTION w_wxev(p_bid text, p_slot text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_wxev(p_bid text, p_slot text) FROM PUBLIC;

--
-- Name: FUNCTION w_xp(p_user uuid, p_n integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_xp(p_user uuid, p_n integer) FROM PUBLIC;

--
-- Name: FUNCTION w_zona_libera(p_user uuid, p_lat double precision, p_lon double precision, p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.w_zona_libera(p_user uuid, p_lat double precision, p_lon double precision, p_aid bigint) FROM PUBLIC;

--
-- Name: FUNCTION world_alleanza_chat(p_after bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_chat(p_after bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_chat(p_after bigint) TO authenticated;

--
-- Name: FUNCTION world_alleanza_chat2(p_aid bigint, p_after bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_chat2(p_aid bigint, p_after bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_chat2(p_aid bigint, p_after bigint) TO authenticated;

--
-- Name: FUNCTION world_alleanza_chiedi(p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_chiedi(p_aid bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_chiedi(p_aid bigint) TO authenticated;

--
-- Name: FUNCTION world_alleanza_crea(p_nome text, p_emblema text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_crea(p_nome text, p_emblema text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_crea(p_nome text, p_emblema text) TO authenticated;

--
-- Name: FUNCTION world_alleanza_esci(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_esci() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_esci() TO authenticated;

--
-- Name: FUNCTION world_alleanza_esci2(p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_esci2(p_aid bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_esci2(p_aid bigint) TO authenticated;

--
-- Name: FUNCTION world_alleanza_fonda(p_nome text, p_emblema text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_fonda(p_nome text, p_emblema text, p_lat double precision, p_lon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_fonda(p_nome text, p_emblema text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_alleanza_info(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_info() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_info() TO authenticated;

--
-- Name: FUNCTION world_alleanza_invita(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_invita(p_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_invita(p_user uuid) TO authenticated;

--
-- Name: FUNCTION world_alleanza_invita2(p_user uuid, p_aid bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_invita2(p_user uuid, p_aid bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_invita2(p_user uuid, p_aid bigint) TO authenticated;

--
-- Name: FUNCTION world_alleanza_risposta(p_id bigint, p_si boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_risposta(p_id bigint, p_si boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_risposta(p_id bigint, p_si boolean) TO authenticated;

--
-- Name: FUNCTION world_alleanza_scrivi(p_body text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_scrivi(p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_scrivi(p_body text) TO authenticated;

--
-- Name: FUNCTION world_alleanza_scrivi2(p_aid bigint, p_body text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_scrivi2(p_aid bigint, p_body text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_scrivi2(p_aid bigint, p_body text) TO authenticated;

--
-- Name: FUNCTION world_alleanza_vota(p_id bigint, p_si boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanza_vota(p_id bigint, p_si boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanza_vota(p_id bigint, p_si boolean) TO authenticated;

--
-- Name: FUNCTION world_alleanze_mie(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanze_mie() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanze_mie() TO authenticated;

--
-- Name: FUNCTION world_alleanze_vicine(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_alleanze_vicine() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_alleanze_vicine() TO authenticated;

--
-- Name: FUNCTION world_allies(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_allies() TO authenticated;

--
-- Name: FUNCTION world_allies_status(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_allies_status() TO authenticated;

--
-- Name: FUNCTION world_ally_answer(p_requester uuid, p_yes boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_ally_answer(p_requester uuid, p_yes boolean) TO authenticated;

--
-- Name: FUNCTION world_ally_pending(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_ally_pending() TO authenticated;

--
-- Name: FUNCTION world_ally_request(p_target uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_ally_request(p_target uuid) TO authenticated;

--
-- Name: FUNCTION world_ally_shield(p_target uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_ally_shield(p_target uuid) TO authenticated;

--
-- Name: FUNCTION world_ally_view(p_user uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_ally_view(p_user uuid) TO authenticated;

--
-- Name: FUNCTION world_ask_help(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_ask_help() TO authenticated;

--
-- Name: FUNCTION world_assalta(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_assalta(p_bid text, p_lat double precision, p_lon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_assalta(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_assi(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_assi(p_bid text, p_lat double precision, p_lon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_assi(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_block(p_user uuid, p_on boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_block(p_user uuid, p_on boolean) TO authenticated;

--
-- Name: FUNCTION world_bottega_compra(p_item text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_bottega_compra(p_item text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_bottega_compra(p_item text) TO authenticated;

--
-- Name: FUNCTION world_buy(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_buy(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_buy_mezzo(p_mezzo text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_buy_mezzo(p_mezzo text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_buy_mezzo(p_mezzo text) TO authenticated;

--
-- Name: FUNCTION world_caccia_fine(p_id bigint, p_uccisi integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_caccia_fine(p_id bigint, p_uccisi integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_caccia_fine(p_id bigint, p_uccisi integer) TO authenticated;

--
-- Name: FUNCTION world_caccia_inizia(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_caccia_inizia() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_caccia_inizia() TO authenticated;

--
-- Name: FUNCTION world_chat_list(p_room text, p_after bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_chat_list(p_room text, p_after bigint) TO authenticated;

--
-- Name: FUNCTION world_chat_report(p_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_chat_report(p_id bigint) TO authenticated;

--
-- Name: FUNCTION world_chat_send(p_room text, p_body text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_chat_send(p_room text, p_body text) TO authenticated;

--
-- Name: FUNCTION world_claim_home(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_claim_home(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_collect(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_collect() TO authenticated;

--
-- Name: FUNCTION world_condo_break(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_condo_break(p_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_condo_break(p_user uuid) TO authenticated;

--
-- Name: FUNCTION world_condo_give(p_kind text, p_amount integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_condo_give(p_kind text, p_amount integer) TO authenticated;

--
-- Name: FUNCTION world_condo_info(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_condo_info() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_condo_info() TO authenticated;

--
-- Name: FUNCTION world_condo_peace(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_condo_peace(p_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_condo_peace(p_user uuid) TO authenticated;

--
-- Name: FUNCTION world_consigli(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_consigli() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_consigli() TO authenticated;

--
-- Name: FUNCTION world_coresidents(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_coresidents() TO authenticated;

--
-- Name: FUNCTION world_def_upgrade(p_bid text, p_kind text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_def_upgrade(p_bid text, p_kind text) TO authenticated;

--
-- Name: FUNCTION world_difendi(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_difendi(p_bid text, p_lat double precision, p_lon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_difendi(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_difesa_bomba(p_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_difesa_bomba(p_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_difesa_bomba(p_id bigint) TO authenticated;

--
-- Name: FUNCTION world_difesa_fine(p_id bigint, p_uccisi integer, p_resistita boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_difesa_fine(p_id bigint, p_uccisi integer, p_resistita boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_difesa_fine(p_id bigint, p_uccisi integer, p_resistita boolean) TO authenticated;

--
-- Name: FUNCTION world_difesa_inizia(p_scudo boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_difesa_inizia(p_scudo boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_difesa_inizia(p_scudo boolean) TO authenticated;

--
-- Name: FUNCTION world_dm_list(p_with uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_dm_list(p_with uuid) TO authenticated;

--
-- Name: FUNCTION world_dm_send(p_to uuid, p_body text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_dm_send(p_to uuid, p_body text) TO authenticated;

--
-- Name: FUNCTION world_dm_threads(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_dm_threads() TO authenticated;

--
-- Name: FUNCTION world_earn(p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_earn(p_reason text) TO authenticated;

--
-- Name: FUNCTION world_edificio_info(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_edificio_info(p_bid text, p_lat double precision, p_lon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_edificio_info(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_eventi_vicini(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_eventi_vicini() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_eventi_vicini() TO authenticated;

--
-- Name: FUNCTION world_evento_azione(p_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_evento_azione(p_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_evento_azione(p_id bigint) TO authenticated;

--
-- Name: FUNCTION world_fav_set(p_user uuid, p_on boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_fav_set(p_user uuid, p_on boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_fav_set(p_user uuid, p_on boolean) TO authenticated;

--
-- Name: FUNCTION world_favs_list(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_favs_list() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_favs_list() TO authenticated;

--
-- Name: FUNCTION world_feed_list(p_scope text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_feed_list(p_scope text) TO authenticated;

--
-- Name: FUNCTION world_find(p_q text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_find(p_q text) TO authenticated;

--
-- Name: FUNCTION world_gift_claim(p_id bigint); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_gift_claim(p_id bigint) TO authenticated;

--
-- Name: FUNCTION world_gifts_in(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_gifts_in() TO authenticated;

--
-- Name: FUNCTION world_give(p_to uuid, p_kind text, p_amount integer, p_loan boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_give(p_to uuid, p_kind text, p_amount integer, p_loan boolean) TO authenticated;

--
-- Name: FUNCTION world_help_list(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_help_list() TO authenticated;

--
-- Name: FUNCTION world_home_vis(p_vis text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_home_vis(p_vis text) TO authenticated;

--
-- Name: FUNCTION world_house_answer(p_from uuid, p_yes boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_house_answer(p_from uuid, p_yes boolean) TO authenticated;

--
-- Name: FUNCTION world_house_info(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_house_info() TO authenticated;

--
-- Name: FUNCTION world_house_invite(p_to uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_house_invite(p_to uuid) TO authenticated;

--
-- Name: FUNCTION world_house_leave(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_house_leave() TO authenticated;

--
-- Name: FUNCTION world_house_log(p_bid text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_house_log(p_bid text) TO authenticated;

--
-- Name: FUNCTION world_inviter(p_code text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_inviter(p_code text) TO anon;
GRANT ALL ON FUNCTION public.world_inviter(p_code text) TO authenticated;

--
-- Name: FUNCTION world_loans(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_loans() TO authenticated;

--
-- Name: FUNCTION world_mezzo(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_mezzo() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_mezzo() TO authenticated;

--
-- Name: FUNCTION world_mine(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_mine() TO authenticated;

--
-- Name: FUNCTION world_mine2(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_mine2() TO authenticated;

--
-- Name: FUNCTION world_my_defense(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_my_defense() TO authenticated;

--
-- Name: FUNCTION world_my_effects(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_my_effects() TO authenticated;

--
-- Name: FUNCTION world_near_survivors(p_lat double precision, p_lon double precision, p_km double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_near_survivors(p_lat double precision, p_lon double precision, p_km double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_near_survivors(p_lat double precision, p_lon double precision, p_km double precision) TO authenticated;

--
-- Name: FUNCTION world_player(p_user uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_player(p_user uuid) TO authenticated;

--
-- Name: FUNCTION world_prepare(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_prepare() TO authenticated;

--
-- Name: FUNCTION world_pres_fortifica(p_id text, p_kind text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_pres_fortifica(p_id text, p_kind text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_pres_fortifica(p_id text, p_kind text) TO authenticated;

--
-- Name: FUNCTION world_presenza(p_lat double precision, p_lon double precision, p_acc double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_presenza(p_lat double precision, p_lon double precision, p_acc double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_presenza(p_lat double precision, p_lon double precision, p_acc double precision) TO authenticated;

--
-- Name: FUNCTION world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) TO anon;
GRANT ALL ON FUNCTION public.world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) TO authenticated;

--
-- Name: FUNCTION world_presidi_seed(p jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_presidi_seed(p jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_presidi_seed(p jsonb) TO authenticated;

--
-- Name: FUNCTION world_presidio_guardia(p_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_presidio_guardia(p_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_presidio_guardia(p_id text) TO authenticated;

--
-- Name: FUNCTION world_presidio_lascia(p_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_presidio_lascia(p_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_presidio_lascia(p_id text) TO authenticated;

--
-- Name: FUNCTION world_presidio_occupa(p_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_presidio_occupa(p_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_presidio_occupa(p_id text) TO authenticated;

--
-- Name: FUNCTION world_quote(p_bid text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_quote(p_bid text, p_lat double precision, p_lon double precision) TO anon;
GRANT ALL ON FUNCTION public.world_quote(p_bid text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_raid_claim(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_raid_claim() TO authenticated;

--
-- Name: FUNCTION world_raid_status(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_raid_status() TO anon;
GRANT ALL ON FUNCTION public.world_raid_status() TO authenticated;

--
-- Name: FUNCTION world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) TO anon;
GRANT ALL ON FUNCTION public.world_raid_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) TO authenticated;

--
-- Name: FUNCTION world_rank(p_scope text, p_period text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_rank(p_scope text, p_period text) TO authenticated;

--
-- Name: FUNCTION world_rank_alleanze(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_rank_alleanze() TO authenticated;
GRANT ALL ON FUNCTION public.world_rank_alleanze() TO anon;

--
-- Name: FUNCTION world_rank_lega(p_period text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_rank_lega(p_period text) TO authenticated;

--
-- Name: FUNCTION world_resources(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_resources() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_resources() TO authenticated;

--
-- Name: FUNCTION world_reward(p_amount integer, p_reason text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_reward(p_amount integer, p_reason text) TO authenticated;

--
-- Name: FUNCTION world_rivals(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_rivals() TO authenticated;

--
-- Name: FUNCTION world_saccheggia(p_user uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_saccheggia(p_user uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_saccheggia(p_user uuid) TO authenticated;

--
-- Name: FUNCTION world_score(p_user uuid, p_period text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_score(p_user uuid, p_period text) TO authenticated;

--
-- Name: FUNCTION world_seen(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_seen() TO authenticated;

--
-- Name: FUNCTION world_sell(p_bid text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_sell(p_bid text) TO authenticated;

--
-- Name: FUNCTION world_send_attack(p_target uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_send_attack(p_target uuid) TO authenticated;

--
-- Name: FUNCTION world_send_curse(p_target uuid, p_kind text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_send_curse(p_target uuid, p_kind text) TO authenticated;

--
-- Name: FUNCTION world_send_help(p_target uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_send_help(p_target uuid) TO authenticated;

--
-- Name: FUNCTION world_set_home(p_kind text, p_unit text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_set_home(p_kind text, p_unit text) TO authenticated;

--
-- Name: FUNCTION world_set_mezzo_vero(p_mezzo text, p_dot integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_set_mezzo_vero(p_mezzo text, p_dot integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_set_mezzo_vero(p_mezzo text, p_dot integer) TO authenticated;

--
-- Name: FUNCTION world_set_realshield(p_lvl integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_set_realshield(p_lvl integer) TO authenticated;

--
-- Name: FUNCTION world_sfida_quartiere(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sfida_quartiere() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sfida_quartiere() TO authenticated;

--
-- Name: FUNCTION world_shape_get(p_k text, p_kind text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_shape_get(p_k text, p_kind text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_shape_get(p_k text, p_kind text) TO authenticated;

--
-- Name: FUNCTION world_shape_put(p_k text, p_kind text, p_val jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_shape_put(p_k text, p_kind text, p_val jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_shape_put(p_k text, p_kind text, p_val jsonb) TO authenticated;

--
-- Name: FUNCTION world_shout(p_to uuid, p_code integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_shout(p_to uuid, p_code integer) TO authenticated;

--
-- Name: FUNCTION world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sped_parti(p_kind text, p_nome text, p_lat double precision, p_lon double precision) TO authenticated;

--
-- Name: FUNCTION world_sped_raccogli(p_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sped_raccogli(p_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sped_raccogli(p_id bigint) TO authenticated;

--
-- Name: FUNCTION world_status_extra(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_status_extra() TO authenticated;

--
-- Name: FUNCTION world_sup_abilita(p_k text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sup_abilita(p_k text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sup_abilita(p_k text) TO authenticated;

--
-- Name: FUNCTION world_sup_equip(p_k text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sup_equip(p_k text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sup_equip(p_k text) TO authenticated;

--
-- Name: FUNCTION world_sup_extra(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sup_extra() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sup_extra() TO authenticated;

--
-- Name: FUNCTION world_sup_info(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sup_info() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sup_info() TO authenticated;

--
-- Name: FUNCTION world_sup_serie(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sup_serie() FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sup_serie() TO authenticated;

--
-- Name: FUNCTION world_sup_share(p_dove text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_sup_share(p_dove text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_sup_share(p_dove text) TO authenticated;

--
-- Name: FUNCTION world_team_bonus(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_team_bonus() TO authenticated;

--
-- Name: FUNCTION world_threats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_threats() TO authenticated;

--
-- Name: FUNCTION world_trade(p_kind text, p_n integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.world_trade(p_kind text, p_n integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.world_trade(p_kind text, p_n integer) TO authenticated;

--
-- Name: FUNCTION world_upgrade(p_bid text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_upgrade(p_bid text) TO authenticated;

--
-- Name: FUNCTION world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) TO anon;
GRANT ALL ON FUNCTION public.world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) TO authenticated;

--
-- Name: FUNCTION world_welcome(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.world_welcome() TO authenticated;

--
-- Name: FUNCTION zsh_stats(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.zsh_stats() TO anon;
GRANT ALL ON FUNCTION public.zsh_stats() TO authenticated;

--
-- PostgreSQL database dump complete
--

