-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 044 — 🛡️ USURA DELLE DIFESE QUANDO LA CASA TIENE, SECONDO GLI ZOMBIE (21/11)
-- Prende il posto dell'usura uguale per tutte messa nella 043. Quando la casa tiene, ogni difesa si consuma solo
-- se gli zombie che ferma erano forti in quell'orda:
--   r = attacco / difesa della casa (sotto 0,5 = l'orda non si è avvicinata: niente usura)
--   m = forza del tipo di zombie in quell'orda (pendenza, meteo, ora: w_zm, da 0,3 a 1,8)
--   difesa principale del tipo:  ⌊12 × r × m / (1 + 0,5 × livello)⌋
--   difesa secondaria del tipo:  ⌊ 6 × r × m / (1 + 0,5 × livello)⌋
--   trappole (vaganti):          ⌊ 8 × r × m / (1 + 0,5 × livello)⌋
--   sotto 3 la difesa ha retto senza danni (resta intatta e si può alzare di livello).
-- Così una difesa alta o contro zombie deboli quel giorno resta intatta, le altre vanno restaurate.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_usura_difese(p_bid text, p_slot text, p_lvl int, p_r numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare wl int := least(greatest(p_lvl, 1), 30); s numeric; ev text; hh int; t record; m numeric; d int; out jsonb := '{}'::jsonb;
begin
  if p_r < 0.5 then return out; end if;
  s := public.w_slope(p_bid); ev := public.w_wxev(p_bid, p_slot); hh := coalesce(nullif(right(p_slot, 2), '')::int, 21);
  for t in select 'walker'::text as k, 'trappole'::text as dk, 8 as w
           union all select z.k, z.dk, 12 from public.w_ztypes() z where wl >= z.minl
           union all select z.k, z.dk2, 6 from public.w_ztypes() z where wl >= z.minl loop
    m := public.w_zm(t.k, s, ev, hh);
    select floor(t.w * p_r * m / (1 + 0.5 * level))::int into d from public.world_defs where building_id = p_bid and kind = t.dk and level > 0;
    if d is null or d < 3 then continue; end if;
    update public.world_defs set danno = least(100, danno + d) where building_id = p_bid and kind = t.dk;
    out := out || jsonb_build_object(t.dk, coalesce((out->>t.dk)::int, 0) + d);
  end loop;
  return out;
end $$;
revoke all on function public.w_usura_difese(text, text, int, numeric) from public, anon, authenticated;

create or replace function public.w_orde_tick() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
      if p >= a then
        -- 🛡️ la casa ha tenuto: ogni difesa si consuma secondo gli zombie che l'hanno colpita (w_usura_difese)
        if not sc then perform public.w_usura_difese(x.building_id, pid, lvl, a::numeric / greatest(1, p)); end if;
        continue;
      end if;
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

-- controllo: deve dire "usura pronta"
select case when exists (select 1 from pg_proc where proname = 'w_usura_difese') then 'usura pronta' else 'qualcosa manca' end as esito;
