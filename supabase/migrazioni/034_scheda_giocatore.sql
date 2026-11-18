-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 034 — 👤 LA SCHEDA DEL SUPERSTITE PIÙ COMPLETA (18/11)
-- world_player_extra(p_user): quello che serve alla scheda di un giocatore (playerSheet), in sola lettura:
-- livello, grado e Combattente del superstite, casa vera, case comprate (e quante crollate), alleanze,
-- scorte ARROTONDATE alle decine (mai il numero esatto), attacchi vinti, subiti e respinti.
-- Nessuna posizione e nessun dato privato. Si può eseguire più volte.
-- =====================================================================
create or replace function public.world_player_extra(p_user uuid) returns json
language sql stable security definer set search_path to 'public' as $$
  select case when auth.uid() is null then json_build_object('ok', false) else json_build_object('ok', true,
    'livello', public.w_lvl_of(p_user),
    'grado', coalesce((select public.w_grado(s.xp) from public.world_superstite s where s.user_id = p_user), 1),
    'combattente', coalesce((select public.w_ab(s.abil, 'combattente') from public.world_superstite s where s.user_id = p_user), 0),
    'casa_vera', exists (select 1 from public.world_homes h where h.user_id = p_user),
    'case', (select count(*) from public.world_buildings b where b.owner = p_user),
    'crollate', (select count(*) from public.world_buildings b where b.owner = p_user and b.caduta_at is not null),
    'alleanze', coalesce((select json_agg(json_build_object('nome', a.nome, 'emblema', a.emblema, 'membri', (select count(*) from public.world_alleanze_membri x where x.alleanza_id = a.id)) order by m.dal)
                 from public.world_alleanze_membri m join public.world_alleanze a on a.id = m.alleanza_id where m.user_id = p_user), '[]'::json),
    'scorte', (select json_build_object('legno', round(w.legno, -1), 'cibo', round(w.cibo, -1), 'carb', round(w.carb, -1), 'mattoni', round(w.mattoni, -1))
                 from public.world_wallet w where w.user_id = p_user),
    'vinti', (select count(*) from public.world_attacchi a where a.stato = 'risolto' and (a.esito->>'esito')::int > 0
                and (a.attaccante = p_user or p_user = any(coalesce(a.squadra, '{}')))),
    'subiti', (select count(*) from public.world_attacchi a where a.stato = 'risolto' and a.vittima = p_user and (a.esito->>'esito')::int > 0),
    'respinti', (select count(*) from public.world_attacchi a where a.stato = 'risolto' and a.vittima = p_user and (a.esito->>'esito')::int = 0)) end; $$;

revoke all on function public.world_player_extra(uuid) from public, anon;
grant execute on function public.world_player_extra(uuid) to authenticated;

-- controllo: deve dire "scheda pronta"
select case when exists (select 1 from pg_proc where proname = 'world_player_extra') then 'scheda pronta' else 'qualcosa manca' end as esito;
