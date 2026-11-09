-- =========================================================
-- ZombieSafeHouse · ZOMBIE SPECIALI + METEO/TERRENO + DIFESE MIRATE + SIMULAZIONE ALLEATI
-- Un solo Run (oppure i blocchi uno alla volta, nell'ordine)
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
-- [E1] RINFORZI: agli alleati si possono mandare anche se non li hanno chiesti ----
create or replace function public.world_send_help(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); w public.world_wallet; k text; n int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target = me then return json_build_object('ok',false,'msg','Non puoi aiutare te stesso'); end if;
  if not exists (select 1 from public.world_help where user_id = p_target and slot_id = nid) and not public.w_are_allies(me, p_target) then
    return json_build_object('ok',false,'msg','Non ha chiesto aiuto e non è tuo alleato'); end if;
  insert into public.world_help_given(helper, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  if not found then return json_build_object('ok',false,'msg','Lo hai già aiutato per questa orda'); end if;
  w := public.w_wallet(me); k := 'aiuti:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  if n < 5 then
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, 5, 'Rinforzi mandati a un alleato');
    update public.world_log set seen = true where user_id = me and reason = 'Rinforzi mandati a un alleato' and not seen;
    return json_build_object('ok',true,'msg','Rinforzi mandati: +5 alla sua difesa, +5 Mattoni a te','got',5);
  end if;
  return json_build_object('ok',true,'msg','Rinforzi mandati: +5 alla sua difesa (oggi hai già preso il massimo di premi per gli aiuti)','got',0);
end $$;

-- [E2] LA SIMULAZIONE DI UN GIOCATORE (stessa formula per tutti) ------------------
create or replace function public.w_threats_of(p_user uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; dt int; amin int; amax int;
begin
  if p_user is null then return '[]'::json; end if;
  wl := least(greatest(public.w_lvl_of(p_user),1),30); up := public.w_upower(p_user, nid); hh := coalesce(nullif(right(nid,2),'')::int,21);
  for h in
    select hm.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = hm.building_id),1) as lvl, hm.lat, hm.lon from public.world_homes hm where hm.user_id = p_user
    union all select bb.building_id, false, bb.level, bb.lat, bb.lon from public.world_buildings bb where bb.owner = p_user
  loop
    s := public.w_slope(h.bid); ev := public.w_wxev(h.bid, nid); mw := public.w_zm('walker', s, ev, hh);
    select coalesce(json_agg(json_build_object('k', t.k, 'base', round(t.base*(1+0.03*wl),2), 'mod', round(public.w_zm(t.k,s,ev,hh),2), 'dk', t.dk, 'dl', public.w_def(h.bid,t.dk),
             'p', round(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3)),1)) order by t.minl), '[]'::json),
           coalesce(sum(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_def(h.bid,t.dk),3))),0)
      into sp, ssum from public.w_ztypes() t where wl >= t.minl;
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 else 0 end) + up;
    amin := round((30+2*wl)*mw + ssum); amax := round((30+2*wl+49)*mw + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,2),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;
revoke all on function public.w_threats_of(uuid) from public, anon, authenticated;
create or replace function public.world_threats() returns json language sql stable security definer set search_path = public as $$
  select public.w_threats_of(auth.uid());
$$;
grant execute on function public.world_threats() to authenticated;

-- [E3] LA SCHEDA DI UN ALLEATO: stato per la prossima orda + le sue case simulate ----
create or replace function public.world_ally_view(p_user uuid) returns json
language sql stable security definer set search_path = public as $$
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
grant execute on function public.world_ally_view(uuid) to authenticated;

-- [E4] L'ELENCO DEI MIEI ALLEATI CON LO STATO (i più a rischio prima) --------------
create or replace function public.world_allies_status() returns json
language sql stable security definer set search_path = public as $$
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
grant execute on function public.world_allies_status() to authenticated;
notify pgrst, 'reload schema';
