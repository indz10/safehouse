-- =========================================================
-- ZombieSafeHouse · TIPI DI ABITAZIONE
-- casa (anche condivisa da chi vive insieme) · condominio (scala/interno + difese comuni) · residence (temporanea)
-- =========================================================

-- [C1] colonne e tabelle --------------------------------------------------------
alter table public.world_homes add column if not exists kind text not null default 'casa';
alter table public.world_homes add column if not exists unit text;
alter table public.world_homes add column if not exists kind_set boolean not null default false;
alter table public.world_homes drop constraint if exists world_homes_kind_check;
alter table public.world_homes add constraint world_homes_kind_check check (kind in ('casa','condominio','residence'));
create table if not exists public.world_house_req(
  from_u uuid references auth.users(id) on delete cascade,
  to_u uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_u, to_u));
create table if not exists public.world_condo(
  ckey text not null,
  kind text not null check (kind in ('portone','cancello','telecamere')),
  level int not null default 0,
  pot int not null default 0,
  primary key (ckey, kind));
create table if not exists public.world_condo_gifts(
  id bigserial primary key, ckey text not null, kind text not null,
  user_id uuid references auth.users(id) on delete cascade, amount int not null,
  created_at timestamptz not null default now());
alter table public.world_house_req enable row level security;
alter table public.world_condo enable row level security;
alter table public.world_condo_gifts enable row level security;

-- [C2] l'aggancio a un edificio vicino usa il codice dell'EDIFICIO, mai quello dell'appartamento
create or replace function public.w_canon(p_bid text, p_lat double precision, p_lon double precision) returns text
language sql stable security definer set search_path = public as $$
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

-- [C3] registrare la casa: stesso edificio = nessun trasloco (anche con scala/interno); residence senza attese
create or replace function public.world_claim_home(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
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

-- [C4] scegliere il tipo di abitazione (e per il condominio scala/interno) -----------
create or replace function public.world_set_home(p_kind text, p_unit text) returns json
language plpgsql security definer set search_path = public as $$
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
grant execute on function public.world_set_home(text,text) to authenticated;

-- [C5] VIVIAMO INSIEME: chi vive nella stessa abitazione condivide la casa -----------
create or replace function public.world_house_invite(p_to uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_to is null or p_to = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if not public.w_coinq(me, p_to) then return json_build_object('ok',false,'msg','Potete vivere insieme solo se abitate nello stesso edificio'); end if;
  insert into public.world_house_req(from_u, to_u) values (me, p_to) on conflict do nothing;
  perform public.w_feed_add('house_req', me, p_to, null, null, null);
  return json_build_object('ok',true,'msg','Richiesta inviata: quando accetta, condividete la stessa casa');
end $$;
create or replace function public.world_house_answer(p_from uuid, p_yes boolean) returns json
language plpgsql security definer set search_path = public as $$
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
create or replace function public.world_house_leave() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h public.world_homes; nid text;
begin
  select * into h from public.world_homes where user_id = me;
  if h.user_id is null then return json_build_object('ok',false,'msg','Nessuna casa'); end if;
  nid := split_part(h.building_id,'#',1) || '#p' || left(replace(me::text,'-',''),6);
  insert into public.world_buildings(building_id, lat, lon) values (nid, h.lat, h.lon) on conflict (building_id) do nothing;
  update public.world_homes set building_id = nid where user_id = me;
  return json_build_object('ok',true,'msg','Ora hai una casa tutta tua nello stesso edificio');
end $$;
grant execute on function public.world_house_invite(uuid) to authenticated;
grant execute on function public.world_house_answer(uuid,boolean) to authenticated;
grant execute on function public.world_house_leave() to authenticated;

-- [C6] DIFESE COMUNI DEL CONDOMINIO: si pagano insieme, +3 di difesa per livello a ogni casa del condominio
create or replace function public.w_condo_key(p_user uuid) returns text language sql stable security definer set search_path = public as $$
  select min(split_part(o.building_id,'#',1)) from public.world_homes m join public.world_homes o
    on o.kind = 'condominio' and (split_part(o.building_id,'#',1) = split_part(m.building_id,'#',1) or public.w_km(o.lat,o.lon,m.lat,m.lon) < 0.025)
  where m.user_id = p_user and m.kind = 'condominio';
$$;
create or replace function public.w_condo_bonus(p_user uuid) returns int language sql stable security definer set search_path = public as $$
  select coalesce(3 * sum(level), 0)::int from public.world_condo where ckey = public.w_condo_key(p_user);
$$;
revoke all on function public.w_condo_key(uuid) from public, anon, authenticated;
revoke all on function public.w_condo_bonus(uuid) from public, anon, authenticated;
create or replace function public.world_condo_give(p_kind text, p_amount int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text := public.w_condo_key(auth.uid()); w public.world_wallet; c public.world_condo; ups int := 0;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if k is null then return json_build_object('ok',false,'msg','Solo per chi abita in un condominio'); end if;
  if p_kind not in ('portone','cancello','telecamere') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if p_amount < 10 or p_amount > 500 then return json_build_object('ok',false,'msg','Da 10 a 500 Mattoni'); end if;
  w := public.w_wallet(me); if w.mattoni < p_amount then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
  insert into public.world_condo(ckey, kind) values (k, p_kind) on conflict do nothing;
  select * into c from public.world_condo where ckey = k and kind = p_kind for update;
  if c.level >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  update public.world_wallet set mattoni = mattoni - p_amount where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -p_amount, 'Condominio: '||p_kind, k, true);
  insert into public.world_condo_gifts(ckey, kind, user_id, amount) values (k, p_kind, me, p_amount);
  c.pot := c.pot + p_amount;
  while c.level < 3 and c.pot >= 240 * (c.level + 1) loop c.pot := c.pot - 240 * (c.level + 1); c.level := c.level + 1; ups := ups + 1; end loop;
  update public.world_condo set level = c.level, pot = c.pot where ckey = k and kind = p_kind;
  return json_build_object('ok',true,'level',c.level,'pot',c.pot,'up',ups,
    'msg', case when ups > 0 then 'Il condominio sale al livello '||c.level||'!' else 'Grazie! Contributo versato' end);
end $$;
grant execute on function public.world_condo_give(text,int) to authenticated;

-- [C7] tutto sulla mia abitazione, in una chiamata -----------------------------
create or replace function public.world_house_info() returns json
language sql stable security definer set search_path = public as $$
  with m as (select * from public.world_homes where user_id = auth.uid()), k as (select public.w_condo_key(auth.uid()) as ck)
  select json_build_object(
    'kind', m.kind, 'unit', m.unit, 'kind_set', m.kind_set, 'building_id', m.building_id, 'status', m.status,
    'members', (select coalesce(json_agg(json_build_object('user_id', o.user_id, 'nick', public.w_nick(o.user_id))), '[]'::json)
                from public.world_homes o where o.user_id <> m.user_id and o.building_id = m.building_id),
    'neighbors', (select coalesce(json_agg(json_build_object('user_id', o.user_id, 'nick', public.w_nick(o.user_id), 'status', o.status, 'kind', o.kind, 'unit', o.unit,
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
grant execute on function public.world_house_info() to authenticated;

-- [C8] le difese del condominio contano nell'orda vera e nel simulatore ----------
create or replace function public.w_home_held(p_user uuid, p_slot text) returns boolean language sql stable security definer set search_path = public as $$
  select public.w_power3(coalesce((select b.level from public.world_buildings b where b.building_id = h.building_id),1), public.w_upower(p_user,p_slot) + public.w_condo_bonus(p_user), true)
         >= public.w_attack3(p_slot, h.building_id, public.w_lvl_of(p_user))
  from public.world_homes h where h.user_id = p_user;
$$;
create or replace function public.w_threats_of(p_user uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; tr numeric; dt int; amin int; amax int;
begin
  if p_user is null then return '[]'::json; end if;
  wl := least(greatest(public.w_lvl_of(p_user),1),30); up := public.w_upower(p_user, nid); hh := coalesce(nullif(right(nid,2),'')::int,21);
  for h in
    select hm.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = hm.building_id),1) as lvl, hm.lat, hm.lon from public.world_homes hm where hm.user_id = p_user
    union all select bb.building_id, false, bb.level, bb.lat, bb.lon from public.world_buildings bb where bb.owner = p_user
  loop
    s := public.w_slope(h.bid); ev := public.w_wxev(h.bid, nid); mw := public.w_zm('walker', s, ev, hh); tr := 1 - 0.06*least(public.w_def(h.bid,'trappole'),3);
    select coalesce(json_agg(json_build_object('k', t.k, 'base', round(t.base*(1+0.03*wl),2), 'mod', round(public.w_zm(t.k,s,ev,hh),2),
             'dk', t.dk, 'dl', public.w_def(h.bid,t.dk), 'dk2', t.dk2, 'dl2', public.w_def(h.bid,t.dk2),
             'p', round(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))*(1-0.15*least(public.w_def(h.bid,t.dk2),3)),1)) order by t.minl), '[]'::json),
           coalesce(sum(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))*(1-0.15*least(public.w_def(h.bid,t.dk2),3))),0)
      into sp, ssum from public.w_ztypes() t where wl >= t.minl;
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 + public.w_condo_bonus(p_user) else 0 end) + up;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up, 'condo', case when h.home then public.w_condo_bonus(p_user) else 0 end,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,2),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;
revoke all on function public.w_threats_of(uuid) from public, anon, authenticated;
notify pgrst, 'reload schema';
