-- CONTROLLO (solo lettura): chi abita dove e quante case possiede ciascuno
select p.nick, h.status as casa, h.building_id as edificio, round(h.lat::numeric,5) as lat, round(h.lon::numeric,5) as lon,
       (select count(*) from public.world_buildings b where b.owner = h.user_id) as case_comprate, p.seen_at as ultimo_accesso
from public.world_homes h left join public.profili_pubblici p on p.user_id = h.user_id
order by h.lat, h.lon;
