-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 059 — 🏢 CONDOMINIO INSIEME (scelte di Alessandro, 27/11)
-- 1) CHI VIVE NELLO STESSO PALAZZO È ALLEATO PER FORZA: coinquilini e vicini dello stesso condominio non possono
--    più rompere (né con 😈 Rompi del condominio né con 💔 Rompi l'alleanza); le rotture fatte finora sono tolte.
-- 2) APPARTAMENTI: in un condominio ognuno può comprare il suo appartamento, anche se ci abita già qualcuno o
--    se un altro giocatore l'ha già comprato. Ogni appartamento è una riga di world_buildings con codice
--    "<palazzo>~a<n>" (stesse regole delle altre case comprate: affitti, potenziamenti, attacchi, conquista solo
--    di quell'appartamento). Massimo 12 proprietari per palazzo.
--    Un palazzo è un condominio se: ci abita qualcuno che ha scelto "condominio" o "residence", oppure ha già
--    appartamenti, oppure la mappa (world_shapes 'bt') lo dà come 'condo'.
-- 3) Chi ha casa o appartamento nello stesso palazzo è coinquilino (w_coinq): non si attacca, è alleato.
-- 4) Quando un abitante vero conferma la casa in un condominio, gli appartamenti comprati restano ai loro padroni.
-- Si può eseguire più volte.
-- =====================================================================

-- 1) niente più rotture tra chi vive nello stesso palazzo
delete from public.world_condo_rifts;

create or replace function public.w_condo_vicini(p_a uuid, p_b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$ select false; $$;
revoke all on function public.w_condo_vicini(uuid, uuid) from public, anon, authenticated;

create or replace function public.world_condo_break(p_user uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
begin
  return json_build_object('ok', false, 'msg', '🏢 Nello stesso palazzo si è alleati per forza: si difende insieme');
end $$;

-- palazzi di un giocatore: dove abita e dove ha case/appartamenti comprati
create or replace function public.w_basi(p_user uuid) returns setof text
  language sql stable security definer set search_path to 'public' as $$
  select split_part(split_part(h.building_id, '#', 1), '~', 1) from public.world_homes h where h.user_id = p_user and h.status in ('home', 'pending')
  union select split_part(b.building_id, '~', 1) from public.world_buildings b where b.owner = p_user; $$;
revoke all on function public.w_basi(uuid) from public, anon, authenticated;

create or replace function public.w_coinq(p_a uuid, p_b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(p_a <> p_b and (
    exists (select 1 from public.world_homes a, public.world_homes b where a.user_id = p_a and b.user_id = p_b
      and (a.building_id = b.building_id or public.w_km(a.lat,a.lon,b.lat,b.lon) < 0.025))
    or exists (select 1 from public.w_basi(p_a) x where x in (select public.w_basi(p_b)))), false); $$;

create or replace function public.w_allies_of(p_user uuid) returns setof uuid
  language sql stable security definer set search_path to 'public' as $$
  select distinct t.u from (
    select case when x.requester = p_user then x.target else x.requester end as u from public.world_allies x where x.status = 'ok' and (x.requester = p_user or x.target = p_user)
    union select mb.user_id from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = p_user
    union select h.user_id from public.world_homes h, public.world_homes me where me.user_id = p_user and h.user_id <> p_user
      and h.lat between me.lat - 0.0005 and me.lat + 0.0005 and h.lon between me.lon - 0.0007 and me.lon + 0.0007 and public.w_coinq(p_user, h.user_id)
    union select h.user_id from public.w_basi(p_user) x join public.world_homes h on split_part(h.building_id, '#', 1) = x and h.status in ('home', 'pending')
    union select b.owner from public.w_basi(p_user) x join public.world_buildings b on split_part(b.building_id, '~', 1) = x where b.owner is not null) t
  where t.u is not null and t.u <> p_user and not public.w_rift(p_user, t.u); $$;

-- per l'app: siete nello stesso palazzo? (allora il tasto Rompi non compare)
create or replace function public.world_coinq(p_target uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$ select auth.uid() is not null and public.w_coinq(auth.uid(), p_target); $$;
revoke all on function public.world_coinq(uuid) from public, anon;
grant execute on function public.world_coinq(uuid) to authenticated;

create or replace function public.world_ally_rompi(p_target uuid) returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok', false, 'msg', 'Superstite non valido'); end if;
  if public.w_coinq(me, p_target) then
    return json_build_object('ok', false, 'msg', '🏢 Avete casa nello stesso palazzo: siete alleati per forza e vi difendete insieme'); end if;
  delete from public.world_allies where (requester = me and target = p_target) or (requester = p_target and target = me);
  if exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = me and mb.user_id = p_target) then
    return json_build_object('ok', false, 'msg', 'Siete nella stessa alleanza a gruppi: per separarvi uno dei due deve uscire dall’alleanza (☰ → 🛡️ La mia alleanza)'); end if;
  return json_build_object('ok', true, 'msg', '💔 Alleanza rotta: ora non siete più alleati');
end $$;
grant execute on function public.world_ally_rompi(uuid) to authenticated;

-- 2) appartamenti
-- il codice del palazzo non deve mai finire su un appartamento ("~")
create or replace function public.w_canon(p_bid text, p_lat double precision, p_lon double precision) returns text
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select b.building_id from public.world_buildings b where b.building_id = split_part(p_bid,'#',1)),
    (select x.bid from (
       select b.building_id as bid, public.w_km(p_lat,p_lon,b.lat,b.lon) as d from public.world_buildings b
        where position('#' in b.building_id) = 0 and position('~' in b.building_id) = 0
          and b.lat between p_lat-0.00005 and p_lat+0.00005 and b.lon between p_lon-0.00007 and p_lon+0.00007
       union all
       select split_part(h.building_id,'#',1), public.w_km(p_lat,p_lon,h.lat,h.lon) from public.world_homes h
        where h.lat between p_lat-0.00005 and p_lat+0.00005 and h.lon between p_lon-0.00007 and p_lon+0.00007
     ) x where x.d <= 0.004 order by x.d limit 1),
    split_part(p_bid,'#',1)); $$;

create or replace function public.w_condo_edif(p_bid text, p_lat double precision, p_lon double precision) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.world_homes h where h.status in ('home','pending') and h.kind in ('condominio','residence')
                   and (split_part(h.building_id,'#',1) = p_bid or public.w_km(h.lat,h.lon,p_lat,p_lon) < 0.025))
      or exists (select 1 from public.world_buildings b where b.building_id like p_bid || '~%')
      or exists (select 1 from public.world_shapes s where s.kind = 'bt' and s.val #>> '{}' = 'condo' and s.k in (
           select to_char(round((coalesce(bb.lat, p_lat) + dy * 0.0001)::numeric, 4), 'FM9990.0000') || '_' || to_char(round((coalesce(bb.lon, p_lon) + dx * 0.0001)::numeric, 4), 'FM9990.0000')
             from generate_series(-2, 2) dy, generate_series(-2, 2) dx
             left join public.world_buildings bb on bb.building_id = p_bid)); $$;
revoke all on function public.w_condo_edif(text, double precision, double precision) from public, anon, authenticated;

-- proprietari degli appartamenti di un palazzo (anche chi ha comprato il palazzo intero prima)
create or replace function public.w_appart(p_bid text) returns setof public.world_buildings
  language sql stable security definer set search_path to 'public' as $$
  select * from public.world_buildings b where b.owner is not null and (b.building_id = p_bid or b.building_id like p_bid || '~%'); $$;
revoke all on function public.w_appart(text) from public, anon, authenticated;

create or replace function public.world_quote(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql stable security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; h public.world_homes; b public.world_buildings; lvl int; nmine int; st text; d double precision; can boolean := false; why text := ''; price int;
  mine_here boolean; other_here boolean; res json; pend boolean; base text; condo boolean := false; app boolean := false; napp int := 0; mio_app boolean := false; app_l json;
begin
  if position('~' in p_bid) = 0 then p_bid := public.w_canon(p_bid, p_lat, p_lon); end if;
  base := split_part(p_bid, '~', 1);
  select * into w from public.world_wallet where user_id = me;
  select * into h from public.world_homes where user_id = me;
  select * into b from public.world_buildings where building_id = p_bid;
  lvl := public.w_level(coalesce(w.lifetime,0));
  select count(*) into nmine from public.world_buildings where owner = me;
  mine_here := h.user_id is not null and (split_part(h.building_id,'#',1) = base or public.w_km(h.lat,h.lon,p_lat,p_lon) < 0.025);
  other_here := exists (select 1 from public.world_homes x where x.user_id <> coalesce(me,'00000000-0000-0000-0000-000000000000'::uuid) and x.status in ('home','pending')
                 and (split_part(x.building_id,'#',1) = base or public.w_km(x.lat,x.lon,p_lat,p_lon) < 0.025));
  st := case when exists (select 1 from public.world_excluded where building_id = base) then 'excluded'
             when mine_here and h.status = 'home' then 'myhome'
             when mine_here then 'mypending'
             when b.owner = me then 'mine'
             when other_here then 'home'
             when b.owner is not null then 'owned'
             when public.w_is_npc(p_bid) then 'npc' else 'free' end;
  if st = 'home' then
    select coalesce(json_agg(json_build_object('user_id', x.user_id, 'nick', public.w_nick(x.user_id), 'status', x.status, 'ally', public.w_are_allies(me, x.user_id))), '[]'::json),
           bool_and(x.status = 'pending')
      into res, pend
      from public.world_homes x where x.user_id <> coalesce(me,'00000000-0000-0000-0000-000000000000'::uuid) and x.status in ('home','pending')
       and (split_part(x.building_id,'#',1) = base or public.w_km(x.lat,x.lon,p_lat,p_lon) < 0.025)
       and public.w_home_known(me, x.user_id);
  end if;
  d := case when h.user_id is null then null else public.w_km(h.lat, h.lon, p_lat, p_lon) end;
  price := public.w_price2(me, p_lat, p_lon);
  if st = 'npc' then price := round(price * 1.3); end if;
  -- 🏢 condominio: un appartamento si compra anche se qualcuno ci abita o l'ha già comprato
  if st in ('home','owned') and position('~' in p_bid) = 0 then
    condo := public.w_condo_edif(base, p_lat, p_lon);
    if condo then
      select count(*), coalesce(bool_or(a.owner = me), false),
             coalesce(json_agg(json_build_object('nick', public.w_nick(a.owner), 'level', a.level) order by a.bought_at), '[]'::json)
        into napp, mio_app, app_l from public.w_appart(base) a;
      app := not mio_app;
      if app then
        if me is null then why := 'Accedi per comprare';
        elsif h.user_id is null then why := 'Prima registra la tua casa (Valuta)';
        elsif napp >= 12 then why := 'Il condominio è pieno: 12 appartamenti già comprati';
        elsif nmine >= public.w_max(lvl) then why := 'Hai già il massimo di case per il tuo livello: sali di livello';
        elsif coalesce(w.mattoni,0) < price then why := 'Mattoni insufficienti';
        else can := true; end if;
      end if;
    end if;
  end if;
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
    'condo', condo, 'appart', app, 'appart_n', napp, 'appart_mio', mio_app, 'appart_max', 12, 'appartamenti', coalesce(app_l, '[]'::json),
    'pending', coalesce(pend, exists (select 1 from public.world_homes x where x.status = 'pending' and (split_part(x.building_id,'#',1) = base or public.w_km(x.lat,x.lon,p_lat,p_lon) < 0.025))));
end $$;

create or replace function public.world_buy(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); q json; price int; got text; n int;
begin
  p_bid := public.w_canon(split_part(p_bid, '~', 1), p_lat, p_lon);
  if me is null then return json_build_object('ok',false,'msg','Accedi per comprare'); end if;
  perform public.w_cleanup();
  -- 🧟 prima il guardiano: la casa va liberata nel picchiaduro (vale 24 ore)
  if not public.w_liberata(me, 'b:' || p_bid) then
    return json_build_object('ok', false, 'guardiano', public.w_guardiano('b:' || p_bid), 'target', 'b:' || p_bid,
      'msg', '🧟 La casa è infestata: batti prima il suo guardiano'); end if;
  q := public.world_quote(p_bid, p_lat, p_lon);
  if not (q->>'can')::boolean then return json_build_object('ok',false,'msg',coalesce(nullif(q->>'why',''),'Non disponibile: qui abita qualcuno')); end if;
  price := (q->>'price')::int;
  if (q->>'appart')::boolean then
    -- 🏢 appartamento nel condominio: una riga nuova "<palazzo>~a<n>"
    perform pg_advisory_xact_lock(hashtext('appart:' || p_bid));
    if exists (select 1 from public.w_appart(p_bid) a where a.owner = me) then return json_build_object('ok',false,'msg','Hai già un appartamento qui'); end if;
    select coalesce(max(nullif(regexp_replace(split_part(b.building_id, '~a', 2), '\D', '', 'g'), '')::int), 1) + 1 into n
      from public.world_buildings b where b.building_id like p_bid || '~%';
    got := p_bid || '~a' || n;
    update public.world_wallet set mattoni = mattoni - price where user_id = me and mattoni >= price;
    if not found then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
    insert into public.world_buildings(building_id, lat, lon, owner, paid, bought_at) values (got, p_lat, p_lon, me, price, now());
    insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -price, 'Appartamento comprato', got, true);
    return json_build_object('ok',true,'msg','Appartamento comprato: siete vicini e alleati','price',price,'appart',true,'bid',got);
  end if;
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

-- 4) l'abitante vero che arriva in un condominio non toglie gli appartamenti comprati
create or replace function public.world_claim_home(p_bid text, p_lat double precision, p_lon double precision) returns json
  language plpgsql security definer set search_path to 'public' as $$
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
  elsif b.owner = me then
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
  elsif b.owner is not null and public.w_condo_edif(p_bid, p_lat, p_lon) then
    null; -- 🏢 condominio: l'appartamento comprato resta al suo padrone, e siete vicini alleati
  elsif b.owner is not null then
    refund := b.paid + b.upgrades;
    perform public.w_pay(b.owner, refund, 'Un abitante è arrivato in una tua casa: rimborso completo', p_bid);
    inv := exists (select 1 from public.profili_pubblici where user_id = me and invitato_da = left(b.owner::text,8));
    bonus := round(refund * (case when inv then 0.75 else 0.25 end));
    if (select count(*) from public.world_bonus where owner = b.owner and due_at > now() - interval '7 days') < 2 then
      insert into public.world_bonus(owner, claimant, building_id, amount, due_at) values (b.owner, me, p_bid, bonus, now() + interval '3 days');
    end if;
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
  end if;
  return json_build_object('ok',true,'status','home','msg','Confermata: questa è casa tua nel mondo');
end $$;

-- controllo: deve comparire "condominio pronto"
select 'condominio pronto' as controllo;
