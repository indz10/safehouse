-- =========================================================
-- ZombieSafeHouse · DIARIO DELLA CASA, BONUS/MALUS VISIBILI, MESSAGGI DIRETTI
-- =========================================================

-- [F1] le difese mirate finiscono nel diario della casa (ref = casa) -------------
create or replace function public.world_def_upgrade(p_bid text, p_kind text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; lv int; cost int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('fossato','barricate','sirena','fondamenta','fari') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  if not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me)
     and not exists (select 1 from public.world_homes where building_id = p_bid and user_id = me) then return json_build_object('ok',false,'msg','Non è una tua casa'); end if;
  lv := public.w_def(p_bid, p_kind);
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo'); end if;
  cost := 80 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono '||cost||' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Difesa: '||p_kind||' livello '||(lv+1), p_bid, true);
  insert into public.world_defs(building_id, kind, level) values (p_bid, p_kind, lv + 1)
    on conflict (building_id, kind) do update set level = excluded.level;
  return json_build_object('ok',true,'level',lv+1,'cost',cost,'msg','Difesa migliorata: livello '||(lv+1));
end $$;
grant execute on function public.world_def_upgrade(text,text) to authenticated;

-- [F2] il diario di una mia casa -------------------------------------------------
create or replace function public.world_house_log(p_bid text) returns table(reason text, delta int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.reason, l.delta, l.created_at from public.world_log l
  where l.user_id = auth.uid() and l.ref = p_bid order by l.created_at desc limit 30;
$$;
grant execute on function public.world_house_log(text) to authenticated;

-- [F3] i bonus e i malus che ho dato, per vederli sulla mappa --------------------
create or replace function public.world_my_effects() returns json
language sql stable security definer set search_path = public as $$
  with n as (select public.w_slot_id(public.w_next_slot(now())) as id),
  e as (
    select c.target as u, c.kind as k from public.world_curses c, n where c.attacker = auth.uid() and c.slot_id = n.id
    union all select a.target, 'orda' from public.world_attack_given a, n where a.attacker = auth.uid() and a.slot_id = n.id
    union all select s.target, 'scudo' from public.world_shields s, n where s.giver = auth.uid() and s.slot_id = n.id
    union all select h.target, 'rinforzi' from public.world_help_given h, n where h.helper = auth.uid() and h.slot_id = n.id),
  hs as (select user_id as u, lat, lon from public.world_homes union all select owner, lat, lon from public.world_buildings where owner is not null)
  select coalesce(json_agg(json_build_object('user_id', e.u, 'nick', public.w_nick(e.u), 'kind', e.k, 'lat', hs.lat, 'lon', hs.lon)), '[]'::json)
  from e join hs on hs.u = e.u;
$$;
grant execute on function public.world_my_effects() to authenticated;

-- [F4] MESSAGGI DIRETTI tra giocatori ------------------------------------------
create table if not exists public.world_dm(
  id bigserial primary key,
  from_u uuid references auth.users(id) on delete cascade,
  to_u uuid references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  read boolean not null default false,
  created_at timestamptz not null default now());
create index if not exists world_dm_pair on public.world_dm(least(from_u,to_u), greatest(from_u,to_u), id desc);
create index if not exists world_dm_to on public.world_dm(to_u, read);
alter table public.world_dm enable row level security;
create or replace function public.world_dm_send(p_to uuid, p_body text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body,''));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_to is null or p_to = me then return json_build_object('ok',false,'msg','Destinatario non valido'); end if;
  if char_length(b) < 1 or char_length(b) > 500 then return json_build_object('ok',false,'msg','Da 1 a 500 caratteri'); end if;
  if public.w_bad(b) then return json_build_object('ok',false,'msg','Non inviato: niente bestemmie, insulti pesanti o minacce.'); end if;
  if exists (select 1 from public.world_blocks where user_id = p_to and blocked = me) then return json_build_object('ok',false,'msg','Non puoi scrivere a questo giocatore'); end if;
  if exists (select 1 from public.world_dm where from_u = me and created_at > now() - interval '3 seconds') then return json_build_object('ok',false,'msg','Piano: un messaggio ogni 3 secondi'); end if;
  if (select count(*) from public.world_dm where from_u = me and created_at > now() - interval '1 day') >= 300 then return json_build_object('ok',false,'msg','Hai raggiunto il limite di oggi'); end if;
  insert into public.world_dm(from_u, to_u, body) values (me, p_to, b);
  return json_build_object('ok',true);
end $$;
create or replace function public.world_dm_list(p_with uuid) returns table(id bigint, mine boolean, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  update public.world_dm set read = true where to_u = auth.uid() and from_u = p_with and not read;
  return query select d.id, d.from_u = auth.uid(), d.body, d.created_at from public.world_dm d
    where (d.from_u = auth.uid() and d.to_u = p_with) or (d.from_u = p_with and d.to_u = auth.uid())
    order by d.id desc limit 60;
end $$;
create or replace function public.world_dm_threads() returns table(user_id uuid, nick text, last_body text, last_at timestamptz, unread bigint)
language sql stable security definer set search_path = public as $$
  with m as (select case when from_u = auth.uid() then to_u else from_u end as other, body, created_at, (to_u = auth.uid() and not read) as un
             from public.world_dm where from_u = auth.uid() or to_u = auth.uid())
  select m.other, public.w_nick(m.other), (array_agg(m.body order by m.created_at desc))[1], max(m.created_at), count(*) filter (where m.un)
  from m group by m.other order by max(m.created_at) desc limit 50;
$$;
grant execute on function public.world_dm_send(uuid,text) to authenticated;
grant execute on function public.world_dm_list(uuid) to authenticated;
grant execute on function public.world_dm_threads() to authenticated;
-- avviso (bacheca "per te" e notifica push)
create or replace function public.w_tr_dm() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.w_feed_add('dm', new.from_u, new.to_u, null, null, left(new.body, 60)); return new; end $$;
drop trigger if exists tr_dm on public.world_dm;
create trigger tr_dm after insert on public.world_dm for each row execute function public.w_tr_dm();
notify pgrst, 'reload schema';
