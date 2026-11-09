-- =========================================================
-- ZombieSafeHouse · MONDO UNICO (fase 2)
-- Un solo mondo reale per tutti gli utenti registrati.
-- Tutte le regole stanno qui sul server: il telefono non può
-- barare su mattoni, acquisti, case e rimborsi.
-- Eseguire in Supabase → SQL Editor → New query → Run
-- =========================================================

-- 1) TABELLE ------------------------------------------------
create table if not exists public.world_wallet(
  user_id uuid primary key references auth.users(id) on delete cascade,
  mattoni int not null default 0,
  lifetime int not null default 0,
  caps jsonb not null default '{}'::jsonb,
  last_rent timestamptz not null default now());

create table if not exists public.world_log(
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref text,
  seen boolean not null default false,
  created_at timestamptz not null default now());
create index if not exists world_log_user on public.world_log(user_id, seen);

create table if not exists public.world_buildings(
  building_id text primary key,
  lat double precision not null,
  lon double precision not null,
  owner uuid references auth.users(id) on delete set null,
  paid int not null default 0,
  upgrades int not null default 0,
  level int not null default 1,
  bought_at timestamptz);
create index if not exists world_b_pos on public.world_buildings(lat, lon);
create index if not exists world_b_owner on public.world_buildings(owner);

create table if not exists public.world_homes(
  user_id uuid primary key references auth.users(id) on delete cascade,
  building_id text not null,
  lat double precision not null,
  lon double precision not null,
  status text not null default 'pending',   -- pending | home
  first_at timestamptz not null default now(),
  confirmed_at timestamptz,
  changed_at timestamptz not null default now());
create index if not exists world_h_b on public.world_homes(building_id, status);

create table if not exists public.world_excluded(
  building_id text primary key,
  created_at timestamptz not null default now());

create table if not exists public.world_bonus(
  id bigserial primary key,
  owner uuid references auth.users(id) on delete cascade,
  claimant uuid references auth.users(id) on delete cascade,
  building_id text not null,
  amount int not null,
  due_at timestamptz not null,
  paid boolean not null default false);

-- 2) SICUREZZA: si legge, ma si scrive SOLO con le funzioni ----
alter table public.world_wallet enable row level security;
alter table public.world_log enable row level security;
alter table public.world_buildings enable row level security;
alter table public.world_homes enable row level security;
alter table public.world_excluded enable row level security;
alter table public.world_bonus enable row level security;
drop policy if exists ww_sel on public.world_wallet;   create policy ww_sel on public.world_wallet for select using (user_id = auth.uid());
drop policy if exists wl_sel on public.world_log;      create policy wl_sel on public.world_log for select using (user_id = auth.uid());
drop policy if exists wb_sel on public.world_buildings; create policy wb_sel on public.world_buildings for select using (true);
drop policy if exists wh_sel on public.world_homes;    create policy wh_sel on public.world_homes for select using (user_id = auth.uid());
drop policy if exists we_sel on public.world_excluded; create policy we_sel on public.world_excluded for select using (true);
drop policy if exists we_adm on public.world_excluded; create policy we_adm on public.world_excluded for all using (public.is_admin()) with check (public.is_admin());

-- 3) FUNZIONI DI SERVIZIO -----------------------------------
create or replace function public.w_km(a_lat double precision, a_lon double precision, b_lat double precision, b_lon double precision)
returns double precision language sql immutable as $$
  select sqrt(power((b_lat-a_lat)*111.0,2) + power((b_lon-a_lon)*111.0*cos(radians(a_lat)),2));
$$;

create or replace function public.w_level(p_life int) returns int language sql immutable as $$
  select 1 + floor(sqrt(greatest(p_life,0)/100.0))::int;
$$;

create or replace function public.w_radius(p_lvl int) returns double precision language sql immutable as $$
  select case when p_lvl >= 50 then 20000 when p_lvl >= 30 then 300 when p_lvl >= 20 then 100 else greatest(1, p_lvl) end::double precision;
$$;

create or replace function public.w_max(p_lvl int) returns int language sql immutable as $$
  select 2 + p_lvl / 2;
$$;

create or replace function public.w_nick(p_user uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nick from public.profili_pubblici where user_id = p_user), 'superstite');
$$;

-- portafoglio (lo crea se manca)
create or replace function public.w_wallet(p_user uuid) returns public.world_wallet
language plpgsql security definer set search_path = public as $$
declare w public.world_wallet;
begin
  insert into public.world_wallet(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into w from public.world_wallet where user_id = p_user;
  return w;
end $$;

create or replace function public.w_pay(p_user uuid, p_delta int, p_reason text, p_ref text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.w_wallet(p_user);
  update public.world_wallet set mattoni = mattoni + p_delta,
     lifetime = lifetime + greatest(p_delta, 0) where user_id = p_user;
  insert into public.world_log(user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
end $$;

-- prezzo di una casa: base + domanda della zona (case già possedute entro ~1 km)
create or replace function public.w_price(p_lat double precision, p_lon double precision) returns int
language sql stable security definer set search_path = public as $$
  select least(2000, 200 + 25 * (select count(*) from public.world_buildings b
     where b.owner is not null and b.lat between p_lat-0.009 and p_lat+0.009 and b.lon between p_lon-0.013 and p_lon+0.013))::int;
$$;

-- case di proprietari inattivi da 30 giorni: tornano libere, 50% rimborsato
create or replace function public.w_cleanup() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select b.* from public.world_buildings b
     where b.owner is not null and not exists (select 1 from public.profili_pubblici p where p.user_id = b.owner and p.seen_at > now() - interval '30 days')
       and coalesce(b.bought_at, now()) < now() - interval '30 days' limit 50 loop
    perform public.w_pay(r.owner, ((r.paid + r.upgrades) / 2), 'Casa liberata per inattività: rimborso 50%', r.building_id);
    update public.world_buildings set owner = null, paid = 0, bought_at = null where building_id = r.building_id;
  end loop;
end $$;

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

-- 4) GUADAGNARE MATTONI (con tetti giornalieri) ----------------
create or replace function public.world_earn(p_reason text) returns json
language plpgsql security definer set search_path = public as $$
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
  elsif p_reason = 'verifica' then
    -- valutazione della casa (una volta)
    if coalesce((w.caps->>'valutazione')::int,0) = 0 and exists (select 1 from public.profili_pubblici where user_id = me and indice is not null) then
      update public.world_wallet set caps = jsonb_set(caps, '{valutazione}', '1') where user_id = me;
      perform public.w_pay(me, 200, 'Casa vera valutata'); got := got + 200;
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

-- 5) LA MIA CASA (diritto di chi abita) -------------------------
-- prima conferma = "in conferma"; seconda conferma dopo almeno 20 ore = casa tua.
-- Se la casa era di un altro giocatore: lui riceve il 100% (acquisto + potenziamenti)
-- subito e +25% (+50% se ti aveva invitato) dopo 3 giorni, se resti lì.
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

-- bonus maturati per i proprietari (pagati solo se l'abitante è ancora lì)
create or replace function public.w_settle(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select * from public.world_bonus where owner = p_user and not paid and due_at <= now() loop
    if exists (select 1 from public.world_homes where user_id = r.claimant and building_id = r.building_id and status = 'home') then
      perform public.w_pay(r.owner, r.amount, 'Bonus: l’abitante è rimasto nella casa', r.building_id);
    end if;
    update public.world_bonus set paid = true where id = r.id;
  end loop;
end $$;

-- 6) GUARDARE, PREVENTIVARE, COMPRARE, POTENZIARE, VENDERE -------
create or replace function public.world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision)
returns table(building_id text, lat double precision, lon double precision, status text, nick text, level int)
language sql stable security definer set search_path = public as $$
  select b.building_id, b.lat, b.lon,
    case when exists (select 1 from public.world_homes h where h.building_id = b.building_id and h.status = 'home' and h.user_id = auth.uid()) then 'myhome'
         when exists (select 1 from public.world_homes h where h.building_id = b.building_id and h.status = 'home') then 'home'
         when b.owner = auth.uid() then 'mine'
         when b.owner is not null then 'owned' else 'free' end,
    case when b.owner is not null then public.w_nick(b.owner) else null end, b.level
  from public.world_buildings b
  where b.lat between p_minlat and p_maxlat and b.lon between p_minlon and p_maxlon
    and (b.owner is not null or exists (select 1 from public.world_homes h where h.building_id = b.building_id and h.status = 'home'))
  limit 800;
$$;

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

create or replace function public.world_upgrade(p_bid text) returns json
language plpgsql security definer set search_path = public as $$
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

create or replace function public.world_sell(p_bid text) returns json
language plpgsql security definer set search_path = public as $$
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

-- affitti: ogni casa rende ogni giorno (5 + 5 × livello), si accumulano fino a 7 giorni
create or replace function public.world_collect() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; rate int; hrs double precision; amt int;
begin
  if me is null then return json_build_object('ok',false); end if;
  w := public.w_wallet(me);
  select coalesce(sum(5 + 5*level),0) into rate from public.world_buildings where owner = me;
  hrs := least(168, extract(epoch from (now() - w.last_rent)) / 3600.0);
  amt := floor(rate * hrs / 24.0);
  if amt < 1 then return json_build_object('ok',false,'msg','Ancora niente da riscuotere','rate',rate); end if;
  update public.world_wallet set last_rent = now() where user_id = me;
  perform public.w_pay(me, amt, 'Affitti delle tue case');
  update public.world_log set seen = true where user_id = me and reason = 'Affitti delle tue case' and not seen;
  return json_build_object('ok',true,'got',amt,'rate',rate);
end $$;

-- riepilogo personale (lo chiama l'app all'apertura)
create or replace function public.world_mine() returns json
language plpgsql security definer set search_path = public as $$
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

create or replace function public.world_seen() returns void language sql security definer set search_path = public as $$
  update public.world_log set seen = true where user_id = auth.uid() and not seen;
$$;

-- 7) ESCLUSIONE DI UN EDIFICIO (chi abita e non vuole essere nel gioco) --
create or replace function public.admin_world_exclude(p_bid text) returns text
language plpgsql security definer set search_path = public as $$
declare b public.world_buildings;
begin
  if not public.is_admin() then return 'Solo per amministratori'; end if;
  select * into b from public.world_buildings where building_id = p_bid;
  if b.owner is not null then perform public.w_pay(b.owner, b.paid + b.upgrades, 'Edificio escluso dal gioco: rimborso completo', p_bid); end if;
  delete from public.world_buildings where building_id = p_bid;
  insert into public.world_excluded(building_id) values (p_bid) on conflict do nothing;
  return 'ok';
end $$;

-- 8) PERMESSI ----------------------------------------------------
revoke all on function public.w_pay(uuid,int,text,text) from public, anon, authenticated;
revoke all on function public.w_wallet(uuid) from public, anon, authenticated;
revoke all on function public.w_cleanup() from public, anon, authenticated;
revoke all on function public.w_settle(uuid) from public, anon, authenticated;
grant execute on function public.w_canon(text,double precision,double precision) to anon, authenticated;
grant execute on function public.world_earn(text) to authenticated;
grant execute on function public.world_claim_home(text,double precision,double precision) to authenticated;
grant execute on function public.world_view(double precision,double precision,double precision,double precision) to anon, authenticated;
grant execute on function public.world_quote(text,double precision,double precision) to anon, authenticated;
grant execute on function public.world_buy(text,double precision,double precision) to authenticated;
grant execute on function public.world_upgrade(text) to authenticated;
grant execute on function public.world_sell(text) to authenticated;
grant execute on function public.world_collect() to authenticated;
grant execute on function public.world_mine() to authenticated;
grant execute on function public.world_seen() to authenticated;
grant execute on function public.admin_world_exclude(text) to authenticated;
