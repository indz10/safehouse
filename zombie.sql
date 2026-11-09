-- =========================================================
-- ZombieSafeHouse · ZOMBIE SPECIALI, METEO E TERRENO VERI, DIFESE MIRATE
-- =========================================================

-- [A] TABELLE ---------------------------------------------------------------
create table if not exists public.world_terrain(
  building_id text primary key,
  elev double precision,
  slope double precision not null default 0,
  updated_at timestamptz not null default now());
create table if not exists public.world_wx(
  building_id text not null,
  slot_id text not null,
  ev text not null default 'calma',
  code int, temp double precision,
  updated_at timestamptz not null default now(),
  primary key (building_id, slot_id));
create table if not exists public.world_defs(
  building_id text not null,
  kind text not null check (kind in ('fossato','barricate','sirena','fondamenta','fari')),
  level int not null default 0,
  primary key (building_id, kind));
alter table public.world_terrain enable row level security;
alter table public.world_wx enable row level security;
alter table public.world_defs enable row level security;

-- [B] LA FORMULA DEGLI ZOMBIE ------------------------------------------------
create or replace function public.w_ztypes() returns table(k text, minl int, base numeric, dk text) language sql immutable as $$
  values ('runner',2,4.0,'fossato'),('casco',3,4.0,'barricate'),('strillone',3,3.0,'sirena'),('scavatore',4,5.0,'fondamenta'),
         ('brute',5,6.0,'barricate'),('ombra',6,5.0,'fari'),('boss',8,9.0,'barricate');
$$;
create or replace function public.w_zm(k text, s numeric, ev text, hh int) returns numeric language sql immutable as $$
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
create or replace function public.w_def(p_bid text, p_kind text) returns int language sql stable security definer set search_path = public as $$
  select coalesce((select level from public.world_defs where building_id = p_bid and kind = p_kind), 0);
$$;
create or replace function public.w_slope(p_bid text) returns numeric language sql stable security definer set search_path = public as $$
  select greatest(-0.12, least(0.12, coalesce((select slope from public.world_terrain where building_id = p_bid), 0)))::numeric;
$$;
create or replace function public.w_wxev(p_bid text, p_slot text) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select ev from public.world_wx where building_id = p_bid and slot_id = p_slot), 'calma');
$$;
-- l'attacco su una casa: standard (con terreno e meteo) + speciali (con terreno, meteo, ora) − difese mirate
create or replace function public.w_attack3(p_slot text, p_bid text, p_lvl int) returns int language sql stable security definer set search_path = public as $$
  with v as (select least(greatest(p_lvl,1),30) as wl, public.w_slope(p_bid) as s, public.w_wxev(p_bid,p_slot) as ev,
                    coalesce(nullif(right(p_slot,2),'')::int, 21) as hh, get_byte(decode(md5(p_slot || p_bid), 'hex'), 0) % 50 as r)
  select (round((30 + 2*v.wl + v.r) * public.w_zm('walker', v.s, v.ev, v.hh))
          + coalesce((select sum(t.base * (1 + 0.03*v.wl) * public.w_zm(t.k, v.s, v.ev, v.hh) * (1 - 0.3*least(public.w_def(p_bid, t.dk),3)))
                      from public.w_ztypes() t where v.wl >= t.minl), 0))::int
  from v;
$$;
revoke all on function public.w_def(text,text) from public, anon, authenticated;
revoke all on function public.w_slope(text) from public, anon, authenticated;
revoke all on function public.w_wxev(text,text) from public, anon, authenticated;

-- [C] COSA ARRIVA SU OGNI MIA CASA (per l'app: scheda, simulatore, fronte) ----
create or replace function public.world_threats() returns json
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; dt int;
begin
  if me is null then return '[]'::json; end if;
  wl := least(greatest(public.w_lvl_of(me),1),30); up := public.w_upower(me, nid); hh := coalesce(nullif(right(nid,2),'')::int,21);
  for h in
    select hm.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = hm.building_id),1) as lvl, hm.lat, hm.lon from public.world_homes hm where hm.user_id = me
    union all select bb.building_id, false, bb.level, bb.lat, bb.lon from public.world_buildings bb where bb.owner = me
  loop
    s := public.w_slope(h.bid); ev := public.w_wxev(h.bid, nid); mw := public.w_zm('walker', s, ev, hh);
    select coalesce(json_agg(json_build_object('k', t.k, 'base', round(t.base*(1+0.03*wl),2), 'mod', round(public.w_zm(t.k,s,ev,hh),2), 'dk', t.dk, 'dl', public.w_def(h.bid,t.dk),
             'p', round(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3)),1)) order by t.minl), '[]'::json),
           coalesce(sum(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))),0)
      into sp, ssum from public.w_ztypes() t where wl >= t.minl;
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 else 0 end) + up;
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,2), 'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp,
      'atk_min', round((30+2*wl)*mw + ssum), 'atk_max', round((30+2*wl+49)*mw + ssum),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;
grant execute on function public.world_threats() to authenticated;

-- [D] COMPRARE UNA DIFESA MIRATA (🧱 80 × livello, massimo 3) ---------------
create or replace function public.world_def_upgrade(p_bid text, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; lv int; cost int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('fossato','barricate','sirena','fondamenta','fari') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me)
     and not exists (select 1 from public.world_homes where building_id = p_bid and user_id = me) then return json_build_object('ok',false,'msg','Non è una tua casa'); end if;
  lv := public.w_def(p_bid, p_kind);
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  cost := 80 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono '||cost||' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me;
  insert into public.world_log(user_id, delta, reason, seen) values (me, -cost, 'Difesa: '||p_kind||' livello '||(lv+1), true);
  insert into public.world_defs(building_id, kind, level) values (p_bid, p_kind, lv + 1)
    on conflict (building_id, kind) do update set level = excluded.level;
  return json_build_object('ok',true,'level',lv+1,'cost',cost,'msg','Difesa migliorata: livello '||(lv+1));
end $$;
grant execute on function public.world_def_upgrade(text,text) to authenticated;
notify pgrst, 'reload schema';
