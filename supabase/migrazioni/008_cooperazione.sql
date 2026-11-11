-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 008 — cooperazione visiva tra coinquilini e vicini di palazzo
-- world_house_info dice anche CHI ha già preparato la casa per la prossima orda: tu ('me_prep'),
-- i coinquilini (members[].prep) e i vicini dello stesso edificio (neighbors[].prep).
-- Serve alla nuova scheda "🤝 Insieme" nella pagina della casa. Non cambia nessuna formula. Si può eseguire più volte.
-- =====================================================================

create or replace function public.world_house_info() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with m as (select * from public.world_homes where user_id = auth.uid()), k as (select public.w_condo_key(auth.uid()) as ck)
  select json_build_object(
    'kind', m.kind, 'unit', m.unit, 'kind_set', m.kind_set, 'building_id', m.building_id, 'status', m.status,
    'me_prep', coalesce((select (w.caps->>('prep:'||public.w_slot_id(public.w_next_slot(now()))))::int from public.world_wallet w where w.user_id = m.user_id),0) = 1,
    'members', (select coalesce(json_agg(json_build_object('user_id', o.user_id, 'nick', public.w_nick(o.user_id), 'prep', coalesce((select (w.caps->>('prep:'||public.w_slot_id(public.w_next_slot(now()))))::int from public.world_wallet w where w.user_id = o.user_id),0) = 1)), '[]'::json)
                from public.world_homes o where o.user_id <> m.user_id and o.building_id = m.building_id),
    'neighbors', (select coalesce(json_agg(json_build_object('user_id', o.user_id, 'nick', public.w_nick(o.user_id), 'status', o.status, 'kind', o.kind, 'unit', o.unit, 'prep', coalesce((select (w.caps->>('prep:'||public.w_slot_id(public.w_next_slot(now()))))::int from public.world_wallet w where w.user_id = o.user_id),0) = 1,
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

-- controllo: deve dire "cooperazione pronta"
select case when exists (select 1 from pg_proc where proname = 'world_house_info' and prosrc like '%me_prep%')
       then 'cooperazione pronta' else 'qualcosa manca' end as esito;
