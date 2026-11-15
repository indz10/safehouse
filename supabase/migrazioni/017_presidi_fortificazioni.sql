-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 017 — fortificazioni FISSE dei presidi (richiesta di Alessandro, 15/11)
-- Come per le case, i presidi hanno ora fortificazioni che restano (non solo guardie e assi della singola orda):
--   🧱 MURA       +8 di difesa per livello (max 3 → +24), contro l'orda e contro tutto
--   🗼 TORRETTA   −20% alla forza degli assalti dei rivali per livello (max −60%, come barricate/recinto/fossato delle case)
-- Le costruisce chi tiene il presidio o un suo alleato, con i 🧱 Mattoni: livello 1 = 100, 2 = 200, 3 = 300 (world_pres_fortifica).
-- Restano anche se il presidio passa a un altro (anche dopo una conquista); quando il presidio CADE escono danneggiate: −1 livello ciascuna.
-- Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_pres_defs(
  presidio_id text not null references public.world_presidi(id) on delete cascade,
  kind text not null check (kind in ('mura','torretta')),
  level int not null default 0 check (level between 0 and 3),
  primary key (presidio_id, kind));
alter table public.world_pres_defs enable row level security;

create or replace function public.w_pres_liv(p_id text, p_kind text) returns int
  language sql stable security definer set search_path to 'public' as $$
  select coalesce((select level from public.world_pres_defs where presidio_id = p_id and kind = p_kind), 0); $$;

-- difesa del presidio: base + mura + guardie + assi/difese − assalti
create or replace function public.w_pres_def(p_id text, p_slot text) returns integer
  language sql stable security definer set search_path to 'public' as $$
  select 55 + 8 * public.w_pres_liv(p_id, 'mura')
       + 12 * least(5, (select count(*) from public.world_presidi_guardie g where g.presidio_id = p_id and g.slot_id = p_slot))::int
       + public.w_casa_extra('pres:' || p_id, p_slot); $$;

-- fortificazioni che frenano gli assalti: case (barricate+recinto+fossato), presidi (torretta, vale doppio)
create or replace function public.w_fort(p_bid text) returns int
  language sql stable security definer set search_path to 'public' as $$
  select case when p_bid like 'pres:%' then 2 * public.w_pres_liv(substr(p_bid, 6), 'torretta')
    else public.w_def(p_bid,'barricate') + public.w_def(p_bid,'recinto') + public.w_def(p_bid,'fossato') end; $$;

-- costruire un livello di mura o torretta
create or replace function public.world_pres_fortifica(p_id text, p_kind text) returns json
  language plpgsql security definer set search_path to 'public' as $$
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
revoke all on function public.world_pres_fortifica(text, text) from public, anon;
grant execute on function public.world_pres_fortifica(text, text) to authenticated;

-- assalti (la torretta conta anche per i presidi), scheda dell'edificio, elenco con i livelli, danni quando cade
create or replace function public.w_azione(me uuid, p_bid text, p_lat double precision, p_lon double precision, p_kind text) RETURNS json
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

create or replace function public.world_edificio_info(p_bid text, p_lat double precision, p_lon double precision) RETURNS json
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

create or replace function public.world_presidi_list(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) RETURNS json
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

create or replace function public.w_pres_tick() RETURNS integer
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

-- controllo: deve dire "fortificazioni dei presidi pronte"
select case when exists (select 1 from pg_proc where proname = 'world_pres_fortifica') and exists (select 1 from pg_proc where proname = 'w_pres_def' and prosrc like '%mura%')
       then 'fortificazioni dei presidi pronte' else 'qualcosa manca' end as esito;
