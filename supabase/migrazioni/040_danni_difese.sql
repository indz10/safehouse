-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 040 — 🛡️ OGNI DIFESA HA I SUOI DANNI (20/11)
-- Quando l'orda sfonda una casa, ogni tipo di zombie rovina le difese che lo fermano (w_ztypes: corridori → fossato e
-- trappole, caschi → barricate e grate, scavatori → fondamenta e pompa, ombre → fari e cani…): la difesa principale perde
-- 10 + 10 × esito %, la seconda 5 + 5 × esito %, le trappole 5 × esito % per i vaganti. Se la casa tiene, niente danni.
-- Una difesa rovinata vale di meno: livello effettivo = livello × (100 − danno) / 100 (w_defe), dentro l'attacco
-- dell'orda (w_attack3), la % "di tenere" (w_threats_of: 'defe' e 'danni') e la forza negli attacchi (w_fort).
-- Prima di salire di livello va RESTAURATA (world_def_restaura → cantiere 'restaura' a tempo, 🪵 e minuti secondo
-- danno e livello); world_case_stato mostra le difese con il loro danno. Si può eseguire più volte.
-- =====================================================================
alter table public.world_defs add column if not exists danno int not null default 0;
alter table public.world_defs drop constraint if exists world_defs_danno_check;
alter table public.world_defs add constraint world_defs_danno_check check (danno between 0 and 100);

create or replace function public.w_defe(p_bid text, p_kind text) returns numeric
language sql stable security definer set search_path to 'public' as $$
  select coalesce((select round(level * (100 - danno) / 100.0, 2) from public.world_defs where building_id = p_bid and kind = p_kind), 0); $$;

create or replace function public.w_restauro_legno(p_level int, p_danno int) returns int language sql immutable as $$
  select case when p_danno <= 0 then 0 else greatest(5, ceil(p_danno * greatest(p_level, 1) * 0.4))::int end; $$;
create or replace function public.w_restauro_min(p_level int, p_danno int) returns int language sql immutable as $$
  select case when p_danno <= 0 then 0 else greatest(5, ceil(p_danno * greatest(p_level, 1) * 0.3))::int end; $$;

create or replace function public.w_difese_stato(p_bid text) returns json
language sql stable security definer set search_path to 'public' as $$
  select coalesce(json_agg(json_build_object('kind', kind, 'level', level, 'danno', danno,
    'restauro', json_build_object('legno', public.w_restauro_legno(level, danno), 'minuti', public.w_restauro_min(level, danno)),
    'lavori', exists (select 1 from public.world_cantieri c where c.bid = p_bid and c.def_kind = d.kind and c.stato = 'lavori')) order by kind), '[]'::json)
  from public.world_defs d where building_id = p_bid and level > 0; $$;

create or replace function public.w_difese_pct(p_bid text) returns int
language sql stable security definer set search_path to 'public' as $$
  select coalesce(round(sum(level * danno)::numeric / nullif(sum(level), 0))::int, 0) from public.world_defs where building_id = p_bid and level > 0; $$;

create or replace function public.world_def_restaura(p_bid text, p_kind text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); d public.world_defs; home boolean; v_legno int; mins int; x public.world_cantieri;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_cantieri_tick();
  home := exists (select 1 from public.world_homes where building_id = p_bid and user_id = me);
  if not home and not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me) then return json_build_object('ok', false, 'msg', 'Non è una tua casa'); end if;
  select * into d from public.world_defs where building_id = p_bid and kind = p_kind;
  if d.building_id is null or d.danno <= 0 then return json_build_object('ok', false, 'msg', 'Questa difesa è intatta'); end if;
  if exists (select 1 from public.world_cantieri where bid = p_bid and def_kind = p_kind and stato = 'lavori') then
    return json_build_object('ok', false, 'msg', '🔧 Ci stanno già lavorando'); end if;
  v_legno := public.w_restauro_legno(d.level, d.danno); mins := public.w_restauro_min(d.level, d.danno);
  update public.world_wallet w set legno = w.legno - v_legno where w.user_id = me and w.legno >= v_legno;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s per restaurarla', v_legno)); end if;
  insert into public.world_cantieri(user_id, bid, home, fine, legno, mattoni, tipo, def_kind, def_level)
    values (me, p_bid, home, greatest(now(), coalesce((select max(fine) from public.world_cantieri where bid = p_bid and stato = 'lavori'), now())) + make_interval(mins => mins),
            v_legno, 0, 'restaura', p_kind, d.level) returning * into x;
  mins := ceil(extract(epoch from x.fine - now()) / 60);
  return json_build_object('ok', true, 'id', x.id, 'minuti', mins, 'fine', x.fine,
    'msg', format('🔧 Restauro avviato: pronto fra %s · 🪵 −%s', case when mins >= 60 then (mins / 60) || ' h ' || (mins % 60) || ' min' else mins || ' min' end, v_legno));
end $$;

create or replace function public.w_attack3(p_slot text, p_bid text, p_lvl integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with v as (select least(greatest(p_lvl,1),30) as wl, public.w_slope(p_bid) as s, public.w_wxev(p_bid,p_slot) as ev,
                    coalesce(nullif(right(p_slot,2),'')::int, 21) as hh, get_byte(decode(md5(p_slot || p_bid), 'hex'), 0) % 50 as r)
  select (round((30 + 2*v.wl + v.r) * public.w_zm('walker', v.s, v.ev, v.hh) * (1 - 0.06*least(public.w_defe(p_bid,'trappole'),3)))
          + coalesce((select sum(t.base * (1 + 0.03*v.wl) * public.w_zm(t.k, v.s, v.ev, v.hh)
                                 * (1 - 0.3*least(public.w_defe(p_bid, t.dk),3)) * (1 - 0.15*least(public.w_defe(p_bid, t.dk2),3)))
                      from public.w_ztypes() t where v.wl >= t.minl), 0))::int
  from v;
$$;

create or replace function public.w_threats_of(p_user uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare nid text := public.w_slot_id(public.w_next_slot(now())); wl int; up int; out json[] := '{}'; h record;
  s numeric; ev text; hh int; sp json; ssum numeric; mw numeric; tr numeric; dt int; amin int; amax int; pb int; ex int;
begin
  if p_user is null then return '[]'::json; end if;
  wl := least(greatest(public.w_lvl_of(p_user),1),30); up := public.w_upower(p_user, nid); hh := coalesce(nullif(right(nid,2),'')::int,21);
  for h in
    select hm.building_id as bid, true as home, coalesce((select bb.level from public.world_buildings bb where bb.building_id = hm.building_id),1) as lvl, hm.lat, hm.lon from public.world_homes hm where hm.user_id = p_user
    union all select bb.building_id, false, bb.level, bb.lat, bb.lon from public.world_buildings bb where bb.owner = p_user
  loop
    s := public.w_slope(h.bid); ev := public.w_wxev(h.bid, nid); mw := public.w_zm('walker', s, ev, hh); tr := 1 - 0.06*least(public.w_defe(h.bid,'trappole'),3);
    select coalesce(json_agg(json_build_object('k', t.k, 'base', round(t.base*(1+0.03*wl),4), 'mod', round(public.w_zm(t.k,s,ev,hh),4),
             'dk', t.dk, 'dl', public.w_defe(h.bid,t.dk), 'dk2', t.dk2, 'dl2', public.w_defe(h.bid,t.dk2),
             'p', round(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_defe(h.bid,t.dk),3))*(1-0.15*least(public.w_defe(h.bid,t.dk2),3)),1)) order by t.minl), '[]'::json),
           coalesce(sum(t.base*(1+0.03*wl)*public.w_zm(t.k,s,ev,hh)*(1-0.3*least(public.w_defe(h.bid,t.dk),3))*(1-0.15*least(public.w_defe(h.bid,t.dk2),3))),0)
      into sp, ssum from public.w_ztypes() t where wl >= t.minl;
    pb := public.w_pres_bonus(h.bid, nid); ex := public.w_casa_extra(h.bid, nid);
    dt := 45 + 12*greatest(h.lvl,1) + (case when h.home then 5 + public.w_condo_bonus(p_user) else 0 end) + up + pb + ex;
    amin := round((30+2*wl)*mw*tr + ssum); amax := round((30+2*wl+49)*mw*tr + ssum);
    out := out || json_build_object('bid', h.bid, 'home', h.home, 'level', h.lvl, 'lat', h.lat, 'lon', h.lon, 'def', dt, 'bonus', up, 'pres', pb, 'extra', ex, 'condo', case when h.home then public.w_condo_bonus(p_user) else 0 end,
      'wl', wl, 'slope', round(s,3), 'ev', ev, 'temp', (select x.temp from public.world_wx x where x.building_id = h.bid and x.slot_id = nid), 'hh', hh, 'mw', round(mw,4),
      'std_min', 30+2*wl, 'std_max', 30+2*wl+49, 'specials', sp, 'atk_min', amin, 'atk_max', amax,
      'chance', greatest(0, least(100, round((dt - amin + 1)::numeric / greatest(1, amax - amin + 1) * 100))),
      'defs', (select coalesce(json_object_agg(kind, level), '{}'::json) from public.world_defs where building_id = h.bid),
      'defe', (select coalesce(json_object_agg(kind, public.w_defe(h.bid, kind)), '{}'::json) from public.world_defs where building_id = h.bid),
      'danni', (select coalesce(json_object_agg(kind, danno), '{}'::json) from public.world_defs where building_id = h.bid and danno > 0));
  end loop;
  return array_to_json(out);
end $$;

create or replace function public.w_fort(p_bid text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select case when p_bid like 'pres:%' then 2 * public.w_pres_liv(substr(p_bid, 6), 'torretta')
    else round(public.w_defe(p_bid,'barricate') + public.w_defe(p_bid,'recinto') + public.w_defe(p_bid,'fossato'))::int end; $$;

create or replace function public.w_orde_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_pvp_cfg(); pt timestamptz := public.w_prev_slot(now()); pid text := public.w_slot_id(public.w_prev_slot(now()));
  u uuid; x record; lvl int; bon int; cb int; comb numeric; p int; a int; e int; emax int; cad jsonb; loot jsonb; sc boolean; resta int; n int := 0; zt record; wl int; dd jsonb; dm int;
begin
  -- solo le orde arrivate dopo l'installazione, e al massimo 12 ore fa
  if pt <= coalesce((select t from public.world_orde_avvio where id = 1), now()) or pt < now() - interval '12 hours' then return 0; end if;
  for u in select z.uid from (select h.user_id as uid from public.world_homes h where h.first_at <= pt
                              union select b.owner from public.world_buildings b where b.owner is not null and b.bought_at <= pt) z
           where not exists (select 1 from public.world_orde_esiti o where o.slot_id = pid and o.user_id = z.uid) limit 300 loop
    lvl := public.w_lvl_of(u); bon := public.w_upower(u, pid); cb := public.w_condo_bonus(u); comb := public.w_comb_bonus(u);
    emax := 0; cad := '[]'::jsonb; sc := public.w_shielded(u);
    for x in select * from public.w_raid_houses(u, pt) loop
      p := public.w_power3(x.level, bon + (case when x.home then cb else 0 end) + public.w_pres_bonus(x.building_id, pid) + public.w_casa_extra(x.building_id, pid), x.home);
      a := public.w_attack3(pid, x.building_id, lvl);
      if p >= a then continue; end if;
      e := public.w_esito(round(a::numeric / greatest(1, p * (1 + comb)), 3));
      dd := '{}'::jsonb;
      if not sc and e > 0 then
        -- ogni tipo di zombie dell'orda rovina le difese che lo fermano: la principale 10 + 10 × esito, la seconda la metà;
        -- i vaganti consumano le trappole (5 × esito). Una difesa rovinata va restaurata prima di salire di livello.
        wl := least(greatest(lvl, 1), 30);
        dm := 5 * e;
        update public.world_defs set danno = least(100, danno + dm) where building_id = x.building_id and kind = 'trappole' and level > 0;
        if found then dd := dd || jsonb_build_object('trappole', dm); end if;
        for zt in select * from public.w_ztypes() z where wl >= z.minl loop
          dm := 10 + 10 * e;
          update public.world_defs set danno = least(100, danno + dm) where building_id = x.building_id and kind = zt.dk and level > 0;
          if found then dd := dd || jsonb_build_object(zt.dk, coalesce((dd->>zt.dk)::int, 0) + dm); end if;
          dm := 5 + 5 * e;
          update public.world_defs set danno = least(100, danno + dm) where building_id = x.building_id and kind = zt.dk2 and level > 0;
          if found then dd := dd || jsonb_build_object(zt.dk2, coalesce((dd->>zt.dk2)::int, 0) + dm); end if;
        end loop;
      end if;
      cad := cad || jsonb_build_object('bid', x.building_id, 'home', x.home, 'attacco', a, 'difesa', p, 'esito', e, 'difese', dd);
      if sc or e <= 0 then continue; end if;
      emax := greatest(emax, e);
      if x.home then
        update public.world_homes set danno = least((k->>'danni_max')::int, danno + (k->'danni'->>e)::int) where user_id = u;
      else
        update public.world_buildings set danno = least((k->>'danni_max')::int, danno + (k->'danni'->>e)::int),
          integrita = greatest(0, integrita - (k->'integ'->>e)::int),
          caduta_at = case when caduta_at is null and integrita - (k->'integ'->>e)::int <= 0 then now() else caduta_at end
          where building_id = x.building_id and owner = u and caduta_at is null returning integrita into resta;
        if resta is not null and resta <= 0 then
          perform public.w_feed_add('casa_crollata', u, u, x.lat, x.lon, x.building_id || '|' || (k->>'caduta_ore') || '|orda');
        end if;
        resta := null;
      end if;
    end loop;
    loot := public.w_bottino(u, emax);   -- le scorte perse con l'orda spariscono
    insert into public.world_orde_esiti(slot_id, user_id, esito, scudo, loot, case_cadute) values (pid, u, emax, sc, loot, cad) on conflict do nothing;
    if emax > 0 then
      perform public.w_feed_add('orda_perdite', u, u, null, null,
        pid || '|' || emax || '|' || (loot->>'legno') || ',' || (loot->>'cibo') || ',' || (loot->>'carb') || ',' || (loot->>'mattoni'));
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.world_def_upgrade(p_bid text, p_kind text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; lv int; cost int; mins int; home boolean; x public.world_cantieri;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('fossato','barricate','sirena','fondamenta','fari','trappole','grate','recinto','cani','pompa') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  home := exists (select 1 from public.world_homes where building_id = p_bid and user_id = me);
  if not home and not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me) then return json_build_object('ok',false,'msg','Non è una tua casa'); end if;
  -- una difesa rovinata dall'orda va prima restaurata (world_def_restaura)
  if exists (select 1 from public.world_defs where building_id = p_bid and kind = p_kind and danno > 0) then
    return json_build_object('ok',false,'restaura',true,'danno',(select danno from public.world_defs where building_id = p_bid and kind = p_kind),
      'msg','🔧 Questa difesa è rovinata ('||(select danno from public.world_defs where building_id = p_bid and kind = p_kind)||'%): restaurala prima di salire di livello'); end if;
  if exists (select 1 from public.world_cantieri where bid = p_bid and def_kind = p_kind and tipo = 'restaura' and stato = 'lavori') then
    return json_build_object('ok',false,'msg','🔧 Restauro in corso: potrai salire di livello quando è finito'); end if;
  -- il livello conta anche i lavori già in coda
  lv := greatest(public.w_def(p_bid, p_kind), coalesce((select max(def_level) from public.world_cantieri where bid = p_bid and def_kind = p_kind and stato = 'lavori'), 0));
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo (o già in lavorazione)'); end if;
  cost := 80 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono '||cost||' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Fortificazione: '||p_kind||' livello '||(lv+1), p_bid, true);
  mins := (public.w_pvp_cfg()->>'pot_min')::int * (lv + 1);
  insert into public.world_cantieri(user_id, bid, home, fine, mattoni, tipo, def_kind, def_level)
    values (me, p_bid, home, greatest(now(), coalesce((select max(fine) from public.world_cantieri where bid = p_bid and stato = 'lavori'), now())) + make_interval(mins => mins),
            cost, 'potenzia', p_kind, lv + 1) returning * into x;
  mins := ceil(extract(epoch from x.fine - now()) / 60);
  return json_build_object('ok',true,'level',lv+1,'cost',cost,'cantiere',x.id,'fine',x.fine,'minuti',mins,
    'msg',format('🏗️ Lavori: %s livello %s pronto fra %s', p_kind, lv+1, case when mins >= 60 then (mins / 60) || ' h ' || (mins % 60) || ' min' else mins || ' min' end));
end $$;

create or replace function public.w_cantieri_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare c public.world_cantieri; n int := 0;
begin
  for c in select * from public.world_cantieri where stato = 'lavori' and fine <= now() order by fine limit 100 for update skip locked loop
    if c.tipo = 'potenzia' then
      insert into public.world_defs(building_id, kind, level) values (c.bid, c.def_kind, c.def_level)
        on conflict (building_id, kind) do update set level = greatest(public.world_defs.level, excluded.level);
    elsif c.tipo = 'restaura' then
      update public.world_defs set danno = 0 where building_id = c.bid and kind = c.def_kind;
    elsif c.home then update public.world_homes set danno = 0 where user_id = c.user_id;
    else update public.world_buildings set danno = 0, integrita = 100, caduta_at = null, caduta_da = null where building_id = c.bid and owner = c.user_id; end if;
    update public.world_cantieri set stato = 'finito' where id = c.id;
    perform public.w_feed_add('cantiere_ok', c.user_id, c.user_id, null, null, c.bid || '|' || case when c.home then 'casa' else 'comprata' end || '|' || c.tipo || '|' || coalesce(c.def_kind, ''));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.world_case_stato() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_cantieri_tick();
  return json_build_object('ok', true, 'ora', now(),
    'case', coalesce((select json_agg(z.x) from (
      select json_build_object('bid', h.building_id, 'home', true, 'danno', h.danno, 'integrita', 100, 'difese', public.w_difese_stato(h.building_id),
        'danno_pct', greatest(public.w_difese_pct(h.building_id), least(100, round(100.0 * h.danno / greatest(1, 50 + 12 * coalesce((select level from public.world_buildings where building_id = h.building_id), 1)))))) as x
        from public.world_homes h where h.user_id = me
      union all
      select json_build_object('bid', b.building_id, 'home', false, 'danno', b.danno, 'integrita', b.integrita, 'crollata', b.caduta_at is not null,
        'difese', public.w_difese_stato(b.building_id),
        'danno_pct', greatest(public.w_difese_pct(b.building_id), least(100, round(100.0 * b.danno / greatest(1, 45 + 12 * b.level))))) from public.world_buildings b where b.owner = me) z), '[]'::json),
    'orda', (select json_build_object('slot', o.slot_id, 'esito', o.esito, 'loot', o.loot, 'case', o.case_cadute) from public.world_orde_esiti o
             where o.user_id = me order by o.created_at desc limit 1),
    'attacchi', coalesce((select json_agg(json_build_object('bid', a.bid, 'quando', a.impatto, 'da', public.w_nick(a.attaccante), 'esito', (a.esito->>'esito')::int,
        'integ', (a.esito->>'integ')::int, 'danno', (a.esito->>'danno')::int) order by a.impatto desc)
      from (select * from public.world_attacchi where vittima = me and stato = 'risolto' order by impatto desc limit 10) a), '[]'::json),
    'perse', coalesce((select json_agg(json_build_object('kind', f.kind, 'da', case when f.kind = 'conquista' then public.w_nick(f.actor) end, 'quando', f.created_at) order by f.created_at desc)
      from (select * from public.world_feed where target = me and kind in ('conquista','casa_libera') and created_at > now() - interval '30 days' order by created_at desc limit 10) f), '[]'::json));
end $$;


revoke all on function public.w_defe(text, text) from public, anon, authenticated;
revoke all on function public.w_difese_stato(text) from public, anon, authenticated;
revoke all on function public.w_difese_pct(text) from public, anon, authenticated;
revoke all on function public.world_def_restaura(text, text) from public, anon;
grant execute on function public.world_def_restaura(text, text) to authenticated;

-- controllo: deve dire "danni delle difese pronti"
select case when exists (select 1 from pg_proc where proname = 'world_def_restaura') then 'danni delle difese pronti' else 'qualcosa manca' end as esito;
