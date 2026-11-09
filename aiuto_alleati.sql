-- quando chiedi aiuto, ogni tuo alleato riceve una riga "per te" (e quindi la notifica push)
create or replace function public.w_allies_of(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct t.u from (
    select case when x.requester = p_user then x.target else x.requester end as u from public.world_allies x where x.status = 'ok' and (x.requester = p_user or x.target = p_user)
    union select g.target from public.world_help_given g where g.helper = p_user and g.created_at > now() - interval '30 days'
    union select g.helper from public.world_help_given g where g.target = p_user and g.created_at > now() - interval '30 days'
    union select p.user_id from public.profili_pubblici p where p.invitato_da = left(p_user::text,8)
    union select q.user_id from public.profili_pubblici p, public.profili_pubblici q where p.user_id = p_user and p.invitato_da is not null and left(q.user_id::text,8) = p.invitato_da) t
  where t.u is not null and t.u <> p_user;
$$;
revoke all on function public.w_allies_of(uuid) from public, anon, authenticated;
create or replace function public.w_tr_feed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'world_homes' then
    if new.status = 'home' and (tg_op = 'INSERT' or old.status is distinct from 'home') then perform public.w_feed_add('join', new.user_id, null, new.lat, new.lon, null); end if;
  elsif tg_table_name = 'world_buildings' then
    if new.owner is not null and (tg_op = 'INSERT' or old.owner is distinct from new.owner) then perform public.w_feed_add('buy', new.owner, null, new.lat, new.lon, case when public.w_is_npc(new.building_id) then 'npc' end); end if;
  elsif tg_table_name = 'world_help' then
    perform public.w_feed_add('ask', new.user_id, null, null, null, null);
    insert into public.world_feed(kind, actor, target) select 'ask_ally', new.user_id, a from public.w_allies_of(new.user_id) a;
  elsif tg_table_name = 'world_help_given' then perform public.w_feed_add('help', new.helper, new.target, null, null, null);
  elsif tg_table_name = 'world_attack_given' then perform public.w_feed_add('attack', new.attacker, new.target, null, null, null);
  elsif tg_table_name = 'world_gifts' then perform public.w_feed_add('gift', new.from_u, new.to_u, null, null, case when new.loan then 'prestito' else new.kind end);
  elsif tg_table_name = 'world_allies' then
    if new.status = 'ok' and (tg_op = 'INSERT' or old.status is distinct from 'ok') then perform public.w_feed_add('ally', new.requester, new.target, null, null, null);
    elsif tg_op = 'INSERT' then perform public.w_feed_add('ally_req', new.requester, new.target, null, null, null); end if;
  elsif tg_table_name = 'world_shouts' then perform public.w_feed_add('shout', new.from_u, new.to_u, null, null, new.code::text);
  end if;
  return new;
end $$;
