-- =========================================================
-- ZombieSafeHouse · SIMULAZIONE DEGLI ALLEATI + ELENCO CON LO STATO
-- =========================================================

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
