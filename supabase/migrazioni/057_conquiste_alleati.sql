-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 057 — 🏴 CASE CONQUISTATE CON GLI ATTACCHI, 🤝 ALLEATI SOLO VERI, 💔 ROMPI L'ALLEANZA (26/11)
-- 🏴 Attacchi alle case comprate: se l'attacco vince (anche di misura) la casa passa SUBITO a chi ha vinto
--   (da solo: l'attaccante; d'alleanza: chi ha portato più forza, se ha ancora posto per una casa, altrimenti il
--   successivo). Integrità 50, difese che restano con la casa. Se nessuno ha posto, la casa perde integrità come prima.
--   La ❤️ casa vera si può attaccare (bottino e danni) ma non si conquista mai.
--   Bottino come prima: 10/20/30% delle scorte non protette; in un attacco d'alleanza diviso in proporzione alla
--   forza che ognuno ha portato (i resti a chi ne ha portata di più).
-- 🤝 Alleati in tutto il gioco = solo quelli veri: alleanza accettata, stessa alleanza a gruppi, coinquilini.
--   Chi ti ha invitato o chi hai aiutato non è più alleato automatico.
-- 💔 world_ally_rompi(utente): chiude un'alleanza a due (prima non c'era modo di romperla).
-- 📯 I raduni d'alleanza possono partire anche contro una casa vera custodita (come gli attacchi da soli).
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_are_allies(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(a <> b and not public.w_rift(a, b) and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = a and mb.user_id = b)
    or public.w_coinq(a, b)), false); $$;

create or replace function public.w_allies_of(p_user uuid) returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct t.u from (
    select case when x.requester = p_user then x.target else x.requester end as u from public.world_allies x where x.status = 'ok' and (x.requester = p_user or x.target = p_user)
    union select mb.user_id from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = p_user
    union select h.user_id from public.world_homes h, public.world_homes me where me.user_id = p_user and h.user_id <> p_user
      and h.lat between me.lat - 0.0005 and me.lat + 0.0005 and h.lon between me.lon - 0.0007 and me.lon + 0.0007 and public.w_coinq(p_user, h.user_id)) t
  where t.u is not null and t.u <> p_user and not public.w_rift(p_user, t.u); $$;

create or replace function public.world_ally_rompi(p_target uuid) returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  delete from public.world_allies where (requester = me and target = p_target) or (requester = p_target and target = me);
  get diagnostics n = row_count;
  if n = 0 then
    if exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = me and mb.user_id = p_target) then
      return json_build_object('ok', false, 'msg', 'È nella tua alleanza a gruppi: per separarvi uno dei due deve uscire dall’alleanza'); end if;
    return json_build_object('ok', false, 'msg', 'Non siete alleati'); end if;
  return json_build_object('ok', true, 'msg', '💔 Alleanza rotta: ora non siete più alleati');
end $$;
grant execute on function public.world_ally_rompi(uuid) to authenticated;

create or replace function public.w_raduni_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r public.world_raduni; t jsonb; sq jsonb; mins int; km numeric; nid bigint; n int := 0; sqd uuid[]; v_nome text;
begin
  for r in select * from public.world_raduni where stato = 'raduno' and partenza <= now() order by partenza limit 30 for update skip locked loop
    t := public.w_bersaglio(null, r.bid); sq := public.w_squadra(r.id, r.vittima);
    if t is null or (t->>'owner')::uuid <> r.vittima or (sq->>'forza')::numeric <= 0 then
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
create or replace function public.w_attacchi_integ() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare k jsonb := public.w_pvp_cfg(); e int; meno int; resta int; chi uuid; gia boolean; cq uuid; x jsonb;
begin
  if new.stato <> 'risolto' or old.stato <> 'viaggio' or new.casa_vera then return new; end if;
  e := coalesce((new.esito->>'esito')::int, 0);
  if e <= 0 then return new; end if;
  meno := (k->'integ'->>e)::int;
  chi := coalesce((new.esito->'squadra'->0->>'u')::uuid, new.attaccante);
  select caduta_at is not null into gia from public.world_buildings where building_id = new.bid and owner = new.vittima;
  if gia is null then return new; end if;
  -- 🏴 attacco vinto: la casa passa subito a chi ha vinto (d'alleanza: chi ha portato più forza e ha posto)
  if new.kind = 'alleanza' and jsonb_typeof(new.esito->'squadra') = 'array' then
    for x in select * from jsonb_array_elements(new.esito->'squadra') loop
      if (select count(*) from public.world_buildings b where b.owner = (x->>'u')::uuid) < public.w_max(public.w_lvl_of((x->>'u')::uuid)) then cq := (x->>'u')::uuid; exit; end if;
    end loop;
  elsif (select count(*) from public.world_buildings b where b.owner = new.attaccante) < public.w_max(public.w_lvl_of(new.attaccante)) then cq := new.attaccante;
  end if;
  if cq is not null then
    update public.world_buildings set owner = cq, paid = 0, upgrades = 0, bought_at = now(), integrita = (k->>'integ_conquista')::int,
      danno = 0, caduta_at = null, caduta_da = null where building_id = new.bid and owner = new.vittima;
    if found then
      new.esito := new.esito || jsonb_build_object('conquistata', true, 'nuovo', cq, 'nuovo_nick', public.w_nick(cq));
      perform public.w_feed_add('conquista', cq, new.vittima, new.lat, new.lon, 'casa');
      return new;
    end if;
  end if;
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

-- controllo: deve dire "conquiste pronte"
select case when exists (select 1 from pg_proc where proname = 'world_ally_rompi') then 'conquiste pronte' else 'qualcosa manca' end as esito;
