-- =========================================================
-- ZombieSafeHouse · 10 FORTIFICAZIONI (principale −30% e supporto −15% per livello)
-- =========================================================

-- [G1] i nuovi tipi di fortificazione -----------------------------------------
alter table public.world_defs drop constraint if exists world_defs_kind_check;
alter table public.world_defs add constraint world_defs_kind_check
  check (kind in ('fossato','barricate','sirena','fondamenta','fari','trappole','grate','recinto','cani','pompa'));

-- [G2] ogni speciale: difesa principale (dk) e di supporto (dk2) ---------------
drop function if exists public.w_ztypes();
create function public.w_ztypes() returns table(k text, minl int, base numeric, dk text, dk2 text) language sql immutable as $$
  values ('runner',2,4.0,'fossato','trappole'),('casco',3,4.0,'barricate','grate'),('strillone',3,3.0,'sirena','cani'),
         ('scavatore',4,5.0,'fondamenta','pompa'),('brute',5,6.0,'barricate','recinto'),('ombra',6,5.0,'fari','cani'),('boss',8,9.0,'barricate','recinto');
$$;

-- [G3] l'attacco: le trappole frenano anche i vaganti (−6% per livello) --------
create or replace function public.w_attack3(p_slot text, p_bid text, p_lvl int) returns int language sql stable security definer set search_path = public as $$
  with v as (select least(greatest(p_lvl,1),30) as wl, public.w_slope(p_bid) as s, public.w_wxev(p_bid,p_slot) as ev,
                    coalesce(nullif(right(p_slot,2),'')::int, 21) as hh, get_byte(decode(md5(p_slot || p_bid), 'hex'), 0) % 50 as r)
  select (round((30 + 2*v.wl + v.r) * public.w_zm('walker', v.s, v.ev, v.hh) * (1 - 0.06*least(public.w_def(p_bid,'trappole'),3)))
          + coalesce((select sum(t.base * (1 + 0.03*v.wl) * public.w_zm(t.k, v.s, v.ev, v.hh)
                                 * (1 - 0.3*least(public.w_def(p_bid, t.dk),3)) * (1 - 0.15*least(public.w_def(p_bid, t.dk2),3)))
                      from public.w_ztypes() t where v.wl >= t.minl), 0))::int
  from v;
$$;

-- [G4] la simulazione di ogni giocatore con le 10 fortificazioni ---------------
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
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 else 0 end) + up;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,2),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid));
  end loop;
  return array_to_json(out);
end $$;
revoke all on function public.w_threats_of(uuid) from public, anon, authenticated;

-- [G5] comprare una delle 10 fortificazioni (🧱 80 × livello, massimo 3) -------
create or replace function public.world_def_upgrade(p_bid text, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; lv int; cost int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('fossato','barricate','sirena','fondamenta','fari','trappole','grate','recinto','cani','pompa') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me)
     and not exists (select 1 from public.world_homes where building_id = p_bid and user_id = me) then return json_build_object('ok',false,'msg','Non è una tua casa'); end if;
  lv := public.w_def(p_bid, p_kind);
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  cost := 80 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono '||cost||' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Fortificazione: '||p_kind||' livello '||(lv+1), p_bid, true);
  insert into public.world_defs(building_id, kind, level) values (p_bid, p_kind, lv + 1)
    on conflict (building_id, kind) do update set level = excluded.level;
  return json_build_object('ok',true,'level',lv+1,'cost',cost,'msg','Fortificazione migliorata: livello '||(lv+1));
end $$;
grant execute on function public.world_def_upgrade(text,text) to authenticated;
notify pgrst, 'reload schema';
