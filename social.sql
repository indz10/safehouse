-- =========================================================
-- ZombieSafeHouse · SOCIAL
-- alleanze vere, bacheca automatica, saluti con frasi pronte,
-- classifiche, scheda del giocatore
-- =========================================================

-- [1] ALLEANZE ----------------------------------------------
create table if not exists public.world_allies(
  requester uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (requester, target));
alter table public.world_allies enable row level security;

create or replace function public.w_are_allies(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_help_given g where ((g.helper = a and g.target = b) or (g.helper = b and g.target = a)) and g.created_at > now() - interval '30 days')
    or exists (select 1 from public.profili_pubblici p where p.user_id = b and p.invitato_da = left(a::text,8))
    or exists (select 1 from public.profili_pubblici p where p.user_id = a and p.invitato_da = left(b::text,8)));
$$;
revoke all on function public.w_are_allies(uuid,uuid) from public, anon, authenticated;

-- [2] ELENCO ALLEATI (anche le alleanze accettate) ----------
create or replace function public.world_allies() returns table(user_id uuid, nick text, wlevel int, dist_km numeric)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.world_homes where user_id = auth.uid()),
  ids as (
    select case when x.requester = auth.uid() then x.target else x.requester end as u from public.world_allies x where x.status = 'ok' and (x.requester = auth.uid() or x.target = auth.uid())
    union select g.target from public.world_help_given g where g.helper = auth.uid() and g.created_at > now() - interval '30 days'
    union select g.helper from public.world_help_given g where g.target = auth.uid() and g.created_at > now() - interval '30 days'
    union select p.user_id from public.profili_pubblici p where p.invitato_da = left(auth.uid()::text,8)
    union select q.user_id from public.profili_pubblici p, public.profili_pubblici q where p.user_id = auth.uid() and p.invitato_da is not null and left(q.user_id::text,8) = p.invitato_da)
  select ids.u, public.w_nick(ids.u), public.w_lvl_of(ids.u),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me, public.world_homes h where h.user_id = ids.u)
  from ids where ids.u is not null and ids.u <> auth.uid() limit 80;
$$;
grant execute on function public.world_allies() to authenticated;

-- [3] PROPORRE E ACCETTARE UN'ALLEANZA ----------------------
create or replace function public.world_ally_request(p_target uuid) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if exists (select 1 from public.world_allies where status = 'ok' and ((requester = me and target = p_target) or (requester = p_target and target = me))) then return json_build_object('ok',false,'msg','Siete già alleati'); end if;
  if exists (select 1 from public.world_allies where requester = p_target and target = me) then
    update public.world_allies set status = 'ok' where requester = p_target and target = me;
    return json_build_object('ok',true,'msg','Alleanza fatta!');
  end if;
  if (select count(*) from public.world_allies where requester = me and created_at > now() - interval '1 day') >= 20 then return json_build_object('ok',false,'msg','Oggi hai già proposto 20 alleanze'); end if;
  insert into public.world_allies(requester, target) values (me, p_target) on conflict do nothing;
  return json_build_object('ok',true,'msg','Proposta di alleanza inviata');
end $$;
create or replace function public.world_ally_answer(p_requester uuid, p_yes boolean) returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_yes then update public.world_allies set status = 'ok' where requester = p_requester and target = auth.uid();
  else delete from public.world_allies where requester = p_requester and target = auth.uid() and status = 'pending'; end if;
  return json_build_object('ok',true,'msg',case when p_yes then 'Alleanza fatta!' else 'Proposta rifiutata' end);
end $$;
create or replace function public.world_ally_pending() returns table(user_id uuid, nick text, wlevel int)
language sql stable security definer set search_path = public as $$
  select x.requester, public.w_nick(x.requester), public.w_lvl_of(x.requester) from public.world_allies x
  where x.target = auth.uid() and x.status = 'pending' order by x.created_at desc limit 30;
$$;
grant execute on function public.world_ally_request(uuid) to authenticated;
grant execute on function public.world_ally_answer(uuid,boolean) to authenticated;
grant execute on function public.world_ally_pending() to authenticated;

-- [4] BACHECA: si riempie da sola con quello che succede -----
create table if not exists public.world_feed(
  id bigserial primary key,
  kind text not null,
  actor uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  lat double precision, lon double precision,
  info text,
  created_at timestamptz not null default now());
create index if not exists world_feed_t on public.world_feed(created_at desc);
create index if not exists world_feed_tg on public.world_feed(target, created_at desc);
alter table public.world_feed enable row level security;
create table if not exists public.world_shouts(
  id bigserial primary key,
  from_u uuid references auth.users(id) on delete cascade,
  to_u uuid references auth.users(id) on delete cascade,
  code int not null,
  created_at timestamptz not null default now());
alter table public.world_shouts enable row level security;

create or replace function public.w_feed_add(p_kind text, p_actor uuid, p_target uuid, p_lat double precision, p_lon double precision, p_info text) returns void
language plpgsql security definer set search_path = public as $$
declare la double precision := p_lat; lo double precision := p_lon;
begin
  if la is null then select h.lat, h.lon into la, lo from public.world_homes h where h.user_id = p_actor; end if;
  insert into public.world_feed(kind, actor, target, lat, lon, info)
    values (p_kind, p_actor, p_target, round(la::numeric,2)::double precision, round(lo::numeric,2)::double precision, p_info);
end $$;
revoke all on function public.w_feed_add(text,uuid,uuid,double precision,double precision,text) from public, anon, authenticated;

-- [5] I FATTI DEL MONDO FINISCONO IN BACHECA DA SOLI ---------
create or replace function public.w_tr_feed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'world_homes' then
    if new.status = 'home' and (tg_op = 'INSERT' or old.status is distinct from 'home') then perform public.w_feed_add('join', new.user_id, null, new.lat, new.lon, null); end if;
  elsif tg_table_name = 'world_buildings' then
    if new.owner is not null and (tg_op = 'INSERT' or old.owner is distinct from new.owner) then perform public.w_feed_add('buy', new.owner, null, new.lat, new.lon, case when public.w_is_npc(new.building_id) then 'npc' end); end if;
  elsif tg_table_name = 'world_help' then perform public.w_feed_add('ask', new.user_id, null, null, null, null);
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
drop trigger if exists tr_feed on public.world_homes;          create trigger tr_feed after insert or update on public.world_homes for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_buildings;      create trigger tr_feed after insert or update on public.world_buildings for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_help;           create trigger tr_feed after insert on public.world_help for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_help_given;     create trigger tr_feed after insert on public.world_help_given for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_attack_given;   create trigger tr_feed after insert on public.world_attack_given for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_gifts;          create trigger tr_feed after insert on public.world_gifts for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_allies;         create trigger tr_feed after insert or update on public.world_allies for each row execute function public.w_tr_feed();
drop trigger if exists tr_feed on public.world_shouts;         create trigger tr_feed after insert on public.world_shouts for each row execute function public.w_tr_feed();

-- [6] LEGGERE LA BACHECA (zona, alleati, mondo, per te) -----
create or replace function public.world_feed_list(p_scope text) returns table(id bigint, kind text, actor uuid, actor_nick text, target uuid, target_nick text, comune text, info text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  with me as (select lat, lon from public.world_homes where user_id = auth.uid())
  select f.id, f.kind, f.actor, public.w_nick(f.actor), f.target, case when f.target is not null then public.w_nick(f.target) end,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = f.actor), f.info, f.created_at
  from public.world_feed f
  where f.created_at > now() - interval '7 days'
    and (p_scope = 'mondo'
      or (p_scope = 'zona' and exists (select 1 from me where f.lat between me.lat - 0.3 and me.lat + 0.3 and f.lon between me.lon - 0.4 and me.lon + 0.4))
      or (p_scope = 'alleati' and (f.actor = auth.uid() or f.target = auth.uid() or public.w_are_allies(auth.uid(), f.actor)))
      or (p_scope = 'pervoi' and f.target = auth.uid()))
  order by f.id desc limit 40;
$$;
grant execute on function public.world_feed_list(text) to authenticated;

-- [7] SALUTI CON FRASI PRONTE (niente testo libero) ---------
create or replace function public.world_shout(p_to uuid, p_code int) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or p_to is null or p_to = me then return json_build_object('ok',false,'msg','Non valido'); end if;
  if p_code < 1 or p_code > 12 then return json_build_object('ok',false,'msg','Frase non valida'); end if;
  if (select count(*) from public.world_shouts where from_u = me and created_at > now() - interval '1 day') >= 30 then return json_build_object('ok',false,'msg','Oggi hai già mandato 30 saluti'); end if;
  if exists (select 1 from public.world_shouts where from_u = me and to_u = p_to and created_at > now() - interval '2 minutes') then return json_build_object('ok',false,'msg','Aspetta un attimo prima di salutarlo di nuovo'); end if;
  insert into public.world_shouts(from_u, to_u, code) values (me, p_to, p_code);
  return json_build_object('ok',true,'msg','Saluto inviato');
end $$;
grant execute on function public.world_shout(uuid,int) to authenticated;

-- [8] CLASSIFICHE (zona o mondo, settimana o sempre) ---------
create or replace function public.world_rank(p_scope text, p_period text) returns table(pos bigint, user_id uuid, nick text, wlevel int, punti bigint, comune text, me boolean)
language sql stable security definer set search_path = public as $$
  with mh as (select lat, lon from public.world_homes where user_id = auth.uid()),
  base as (
    select w.user_id,
      case when p_period = 'settimana' then coalesce((select sum(l.delta) from public.world_log l where l.user_id = w.user_id and l.delta > 0 and l.created_at > now() - interval '7 days'
                 and l.reason not like 'Regalo%' and l.reason not like 'Prestito%' and l.reason not like 'Restituzione%'),0)
           else w.lifetime::bigint end as punti
    from public.world_wallet w
    where p_scope <> 'zona' or exists (select 1 from public.world_homes h, mh where h.user_id = w.user_id and h.lat between mh.lat - 0.3 and mh.lat + 0.3 and h.lon between mh.lon - 0.4 and mh.lon + 0.4)),
  r as (select row_number() over (order by punti desc, user_id) as pos, user_id, punti from base)
  select r.pos, r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id), r.punti,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = r.user_id), r.user_id = auth.uid()
  from r where r.pos <= 20 or r.user_id = auth.uid() order by r.pos;
$$;
grant execute on function public.world_rank(text,text) to authenticated;

-- [9] SCHEDA DEL GIOCATORE ----------------------------------
create or replace function public.world_player(p_user uuid) returns json
language sql stable security definer set search_path = public as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id)
  select json_build_object(
    'user_id', p_user, 'nick', public.w_nick(p_user), 'wlevel', public.w_lvl_of(p_user),
    'comune', (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = p_user),
    'houses', (select count(*) from public.world_buildings b where b.owner = p_user),
    'home', exists (select 1 from public.world_homes h where h.user_id = p_user),
    'me', p_user = auth.uid(),
    'ally', case when public.w_are_allies(auth.uid(), p_user) then 'ok'
                 when exists (select 1 from public.world_allies x where x.requester = auth.uid() and x.target = p_user and x.status = 'pending') then 'out'
                 when exists (select 1 from public.world_allies x where x.requester = p_user and x.target = auth.uid() and x.status = 'pending') then 'in'
                 else 'none' end,
    'asked', exists (select 1 from public.world_help w, n where w.user_id = p_user and w.slot_id = n.id),
    'helped', exists (select 1 from public.world_help_given g, n where g.helper = auth.uid() and g.target = p_user and g.slot_id = n.id),
    'attacked', exists (select 1 from public.world_attack_given a, n where a.attacker = auth.uid() and a.target = p_user and a.slot_id = n.id),
    'protected', public.w_lvl_of(p_user) < public.w_lvl_of(auth.uid()) - 3)
  from n;
$$;
grant execute on function public.world_player(uuid) to authenticated;
