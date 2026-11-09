-- ZombieSafeHouse · chi mi ha invitato (per la pagina di benvenuto; leggibile anche senza account)
create or replace function public.world_inviter(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select nick from public.profili_pubblici where left(user_id::text, 8) = lower(left(coalesce(p_code,''), 8)) and nick is not null limit 1;
$$;
grant execute on function public.world_inviter(text) to anon, authenticated;
notify pgrst, 'reload schema';
