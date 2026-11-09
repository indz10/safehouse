-- stesso edificio = stessa casa, anche se arriva con un codice diverso (entro 4 metri)
create or replace function public.w_canon(p_bid text, p_lat double precision, p_lon double precision) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select b.building_id from public.world_buildings b where b.building_id = p_bid),
    (select x.bid from (
       select b.building_id as bid, public.w_km(p_lat,p_lon,b.lat,b.lon) as d from public.world_buildings b
        where b.lat between p_lat-0.00005 and p_lat+0.00005 and b.lon between p_lon-0.00007 and p_lon+0.00007
       union all
       select h.building_id, public.w_km(p_lat,p_lon,h.lat,h.lon) from public.world_homes h
        where h.lat between p_lat-0.00005 and p_lat+0.00005 and h.lon between p_lon-0.00007 and p_lon+0.00007
     ) x where x.d <= 0.004 order by x.d limit 1),
    p_bid);
$$;

create or replace function public.world_claim_home(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h public.world_homes; b public.world_buildings; refund int; bonus int; inv boolean;
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
  if h.building_id <> p_bid then
    if h.status = 'home' and h.changed_at > now() - interval '30 days' then
      return json_build_object('ok',false,'status',h.status,'msg','Puoi cambiare casa una volta ogni 30 giorni');
    end if;
    update public.world_homes set building_id = p_bid, lat = p_lat, lon = p_lon, status = 'pending', first_at = now(), confirmed_at = null, changed_at = now() where user_id = me;
    return json_build_object('ok',true,'status','pending','msg','Nuova casa registrata: domani riapri l’app per confermarla');
  end if;
  if h.status = 'home' then return json_build_object('ok',true,'status','home','msg','È già casa tua'); end if;
  if h.first_at > now() - interval '20 hours' then
    return json_build_object('ok',true,'status','pending','msg','Conferma possibile da domani');
  end if;
  -- conferma definitiva
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
    -- chi abita eredita la casa con i suoi potenziamenti
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
  elsif b.owner = me then
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
  end if;
  return json_build_object('ok',true,'status','home','msg','Confermata: questa è casa tua nel mondo');
end $$;

create or replace function public.world_quote(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; h public.world_homes; b public.world_buildings; lvl int; nmine int; st text; d double precision; can boolean := false; why text := '';
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  select * into w from public.world_wallet where user_id = me;
  select * into h from public.world_homes where user_id = me;
  select * into b from public.world_buildings where building_id = p_bid;
  lvl := public.w_level(coalesce(w.lifetime,0));
  select count(*) into nmine from public.world_buildings where owner = me;
  st := case when exists (select 1 from public.world_excluded where building_id = p_bid) then 'excluded'
             when h.building_id = p_bid and h.status = 'home' then 'myhome'
             when h.building_id = p_bid then 'mypending'
             when exists (select 1 from public.world_homes x where x.building_id = p_bid and x.status = 'home') then 'home'
             when b.owner = me then 'mine' when b.owner is not null then 'owned' else 'free' end;
  d := case when h.user_id is null then null else public.w_km(h.lat, h.lon, p_lat, p_lon) end;
  if st = 'free' then
    if me is null then why := 'Accedi per comprare';
    elsif h.user_id is null then why := 'Prima registra la tua casa (Valuta)';
    elsif nmine >= public.w_max(lvl) then why := 'Hai già il massimo di case per il tuo livello';
    elsif d > public.w_radius(lvl) then why := 'Troppo lontana per il tuo livello: sali di livello per comprare più lontano';
    elsif coalesce(w.mattoni,0) < public.w_price(p_lat,p_lon) then why := 'Mattoni insufficienti';
    else can := true; end if;
  end if;
  return json_build_object('status', st, 'price', public.w_price(p_lat,p_lon), 'can', can, 'why', why,
    'owner_nick', case when b.owner is not null then public.w_nick(b.owner) end, 'level', coalesce(b.level,1),
    'value', coalesce(b.paid,0) + coalesce(b.upgrades,0), 'mattoni', coalesce(w.mattoni,0), 'wlevel', lvl,
    'owned', nmine, 'max', public.w_max(lvl), 'radius_km', public.w_radius(lvl), 'dist_km', round(coalesce(d,0)::numeric,2),
    'up_cost', 150 * coalesce(b.level,1));
end $$;

create or replace function public.world_buy(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); q json; price int; got text;
begin
  p_bid := public.w_canon(p_bid, p_lat, p_lon);
  if me is null then return json_build_object('ok',false,'msg','Accedi per comprare'); end if;
  perform public.w_cleanup();
  q := public.world_quote(p_bid, p_lat, p_lon);
  if not (q->>'can')::boolean then return json_build_object('ok',false,'msg',coalesce(nullif(q->>'why',''),'Non disponibile')); end if;
  price := (q->>'price')::int;
  insert into public.world_buildings(building_id, lat, lon) values (p_bid, p_lat, p_lon) on conflict (building_id) do nothing;
  -- acquisto atomico: vince il primo
  update public.world_buildings set owner = me, paid = price, bought_at = now()
    where building_id = p_bid and owner is null
      and not exists (select 1 from public.world_homes h where h.building_id = p_bid and h.status = 'home')
    returning building_id into got;
  if got is null then return json_build_object('ok',false,'msg','Qualcuno l’ha appena comprata'); end if;
  update public.world_wallet set mattoni = mattoni - price where user_id = me and mattoni >= price;
  if not found then
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = p_bid;
    return json_build_object('ok',false,'msg','Mattoni insufficienti');
  end if;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -price, 'Casa comprata', p_bid, true);
  return json_build_object('ok',true,'msg','Casa comprata','price',price);
end $$;

grant execute on function public.w_canon(text,double precision,double precision) to anon, authenticated;
