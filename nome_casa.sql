-- =========================================================
-- ZombieSafeHouse · NOME SULLA CASA: lo sceglie ogni giocatore (Tutti / Solo alleati e coinquilini)
-- Le case sono SEMPRE nel punto esatto per tutti; questa scelta riguarda solo il NOME sopra la casa.
-- =========================================================

-- [V1] la scelta di ognuno (all'inizio: solo alleati e coinquilini, come promesso finora)
alter table public.world_homes add column if not exists vis text not null default 'alleati';
alter table public.world_homes drop constraint if exists world_homes_vis_check;
alter table public.world_homes add constraint world_homes_vis_check check (vis in ('tutti','alleati'));
create or replace function public.w_home_known(p_me uuid, p_u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select p_u = p_me or public.w_are_allies(p_me, p_u) or public.w_coinq(p_me, p_u)
      or coalesce((select vis = 'tutti' from public.world_homes where user_id = p_u), false);
$$;
revoke all on function public.w_home_known(uuid,uuid) from public, anon, authenticated;
create or replace function public.world_home_vis(p_vis text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v text;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_vis in ('tutti','alleati') then update public.world_homes set vis = p_vis where user_id = me; end if;
  select vis into v from public.world_homes where user_id = me;
  return json_build_object('ok', v is not null, 'vis', v);
end $$;
grant execute on function public.world_home_vis(text) to authenticated;

-- [P1] la mappa: case sempre esatte; il nome di chi abita lo vede chi lui ha scelto (tutti, oppure solo alleati e coinquilini)
create or replace function public.world_view(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision)
returns table(building_id text, lat double precision, lon double precision, status text, nick text, level int, residents text, pending boolean)
language sql stable security definer set search_path = public as $$
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
grant execute on function public.world_view(double precision, double precision, double precision, double precision) to anon, authenticated;

-- [P2] il preventivo: una casa abitata (anche in conferma, anche con interno di condominio) non è in vendita
create or replace function public.world_quote(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql stable security definer set search_path = public as $$
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

-- [P3] l'acquisto: bloccato se qualcuno ci abita (anche in conferma)
create or replace function public.world_buy(p_bid text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
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

-- [P4] bonus e malus sulla mappa: sulla casa esatta se lui ha scelto "tutti" (o siete alleati/coinquilini), altrimenti vicino (~200 m)
create or replace function public.world_my_effects() returns json
language sql stable security definer set search_path = public as $$
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
grant execute on function public.world_my_effects() to authenticated;
notify pgrst, 'reload schema';
