-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 058 — 💔 ROMPI L'ALLEANZA IN OGNI CASO (26/11)
-- world_ally_rompi(utente) toglie l'alleanza a due e, se risultate ancora alleati perché coinquilini/vicini di casa,
-- segna la rottura (world_condo_rifts, come "rompi" del condominio): da quel momento non siete più alleati.
-- Se siete nella stessa alleanza a gruppi risponde che uno dei due deve uscirne.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.world_ally_rompi(p_target uuid) returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok', false, 'msg', 'Superstite non valido'); end if;
  delete from public.world_allies where (requester = me and target = p_target) or (requester = p_target and target = me);
  if public.w_are_allies(me, p_target) then
    if exists (select 1 from public.world_alleanze_membri ma join public.world_alleanze_membri mb on mb.alleanza_id = ma.alleanza_id where ma.user_id = me and mb.user_id = p_target) then
      return json_build_object('ok', false, 'msg', 'Siete nella stessa alleanza a gruppi: per separarvi uno dei due deve uscire dall’alleanza (☰ → 🛡️ La mia alleanza)'); end if;
    insert into public.world_condo_rifts(a, b) values (me, p_target);
  end if;
  return json_build_object('ok', true, 'msg', '💔 Alleanza rotta: ora non siete più alleati');
end $$;
grant execute on function public.world_ally_rompi(uuid) to authenticated;

-- controllo: deve dire "rompi pronto"
select case when exists (select 1 from pg_proc where proname = 'world_ally_rompi') then 'rompi pronto' else 'qualcosa manca' end as esito;
