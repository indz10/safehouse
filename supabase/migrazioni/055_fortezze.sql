-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 055 — 🏰 FORTIFICAZIONI VISIBILI SULLE CASE (25/11)
-- world_fortezze(riquadro): per le case abitate e comprate nel riquadro (max 300) le difese costruite, per disegnarle
-- sulle mappe 3D (Gioco, vista da vicino, Mondo in 3D).
-- • Le tue case e quelle di alleati/coinquilini: tipo, livello e danno di ogni difesa.
-- • Le case degli altri: solo QUALI difese ci sono (livello 0 = "c'è", niente danno): si capisce se una casa è tosta
--   senza sapere tutto. La posizione delle case è già pubblica (world_view).
-- • crollata: la casa comprata è crollata (macerie).
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.world_fortezze(p_minlat double precision, p_minlon double precision, p_maxlat double precision, p_maxlon double precision) returns json
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_maxlat - p_minlat > 0.05 or p_maxlon - p_minlon > 0.07 then return '[]'::json; end if;
  return (select coalesce(json_agg(x), '[]'::json) from (
    select c.bid, c.lat, c.lon,
      case when c.uid = me then 'mia' when public.w_are_allies(me, c.uid) then 'alleato' else 'altro' end as chi,
      coalesce((select json_object_agg(d.kind, case when c.uid = me or public.w_are_allies(me, c.uid) then d.level else 0 end)
                from public.world_defs d where d.building_id = c.bid and d.level > 0), '{}'::json) as defs,
      case when c.uid = me or public.w_are_allies(me, c.uid) then
        (select json_object_agg(d.kind, d.danno) from public.world_defs d where d.building_id = c.bid and d.level > 0 and d.danno > 0) end as danni,
      c.crollata
    from (
      select h.building_id as bid, h.lat, h.lon, h.user_id as uid, false as crollata
        from public.world_homes h where h.status = 'home' and h.lat between p_minlat and p_maxlat and h.lon between p_minlon and p_maxlon
      union all
      select b.building_id, b.lat, b.lon, b.owner, b.caduta_at is not null
        from public.world_buildings b where b.owner is not null and b.lat between p_minlat and p_maxlat and b.lon between p_minlon and p_maxlon
          and not exists (select 1 from public.world_homes h2 where h2.building_id = b.building_id and h2.status = 'home')
      limit 300) c) x);
end $$;

grant execute on function public.world_fortezze(double precision, double precision, double precision, double precision) to authenticated;

-- controllo: deve dire "fortezze pronte"
select case when exists (select 1 from pg_proc where proname = 'world_fortezze') then 'fortezze pronte' else 'qualcosa manca' end as esito;
