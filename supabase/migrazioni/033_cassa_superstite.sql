-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 033 — 📦 CASSE RACCOLTE DAL SUPERSTITE (18/11)
-- Le casse della Lente (migrazione 025, world_zombie_vicini) si possono prendere anche senza muoversi:
-- world_cassa_manda segna la cassa come presa (world_zombie_presi, la stessa della Lente: una volta sola per giocatore,
-- in tutti e due i modi) e manda il superstite con la spedizione di sempre (world_sped_parti, kind 'misto'):
-- stessa energia, raggio, costo del viaggio, tempo, rischio e bottino al ritorno (world_sped_raccogli).
-- Nessun altro sistema di raccolta: la Lente (world_cassa_apri) resta com'è. Richiede la 025 e la 027.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.world_cassa_manda(p_id text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); z json; r json;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  z := public.w_zm_trova(p_id);
  if z is null or z->>'k' <> 'cassa' then return json_build_object('ok', false, 'msg', 'La cassa non c’è più'); end if;
  -- prenotata subito: chi la apre con la Lente nello stesso momento trova "L'hai già aperta"
  insert into public.world_zombie_presi(user_id, zid, tipo) values (me, p_id, 'cassa') on conflict do nothing;
  if not found then return json_build_object('ok', false, 'msg', 'L’hai già presa'); end if;
  r := public.world_sped_parti('misto', '📦 Cassa di rifornimenti', (z->>'lat')::float, (z->>'lon')::float);
  if not coalesce((r->>'ok')::boolean, false) then
    delete from public.world_zombie_presi where user_id = me and zid = p_id;   -- non è partito: la cassa resta da prendere
    return r;
  end if;
  update public.world_spedizioni set calc = calc || jsonb_build_object('cassa', p_id) where id = (r->>'id')::bigint;
  return r;
end $$;

revoke all on function public.world_cassa_manda(text) from public, anon;
grant execute on function public.world_cassa_manda(text) to authenticated;

-- controllo: deve dire "casse pronte"
select case when exists (select 1 from pg_proc where proname = 'world_cassa_manda') then 'casse pronte' else 'qualcosa manca' end as esito;
