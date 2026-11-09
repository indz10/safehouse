-- =========================================================
-- ZombieSafeHouse · PIAZZA (chat della community)
-- stanze: Zona (celle di circa 10 km) e Mondo
-- moderazione: filtro parole, segnalazioni, blocchi, admin
-- =========================================================

-- [1] TABELLE -----------------------------------------------
create table if not exists public.world_chat(
  id bigserial primary key,
  room text not null,
  user_id uuid references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  hidden boolean not null default false,
  reports int not null default 0,
  created_at timestamptz not null default now());
create index if not exists world_chat_room on public.world_chat(room, id desc);
create table if not exists public.world_chat_reports(
  chat_id bigint references public.world_chat(id) on delete cascade,
  reporter uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chat_id, reporter));
create table if not exists public.world_blocks(
  user_id uuid references auth.users(id) on delete cascade,
  blocked uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked));
alter table public.world_chat enable row level security;
alter table public.world_chat_reports enable row level security;
alter table public.world_blocks enable row level security;

-- [2] STANZA DELLA MIA ZONA e PAROLE VIETATE -----------------
create or replace function public.w_room(p_room text) returns text language sql stable security definer set search_path = public as $$
  select case when p_room = 'mondo' then 'mondo'
    else coalesce((select 'z:' || round(h.lat::numeric,1) || ':' || round(h.lon::numeric,1) from public.world_homes h where h.user_id = auth.uid()), 'mondo') end;
$$;
create or replace function public.w_bad(p_text text) returns boolean language sql immutable as $$
  select lower(p_text) ~ '(porc[oa] ?(dio|madonna)|dio ?(cane|porco|maiale|boia)|madonna ?(puttana|troia)|\mnegr[oaie]\M|\mfroc[io]|ricchion|\mterron[ei]\M|ti ammazzo|ti uccido|ti sgozzo|ti vengo a prendere|ammazzati|\mpedofil|\mstupr|\mnazist)';
$$;

-- [3] SCRIVERE --------------------------------------------
create or replace function public.world_chat_send(p_room text, p_body text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r text; b text := btrim(coalesce(p_body,''));
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi per scrivere'); end if;
  if char_length(b) < 1 then return json_build_object('ok',false,'msg','Scrivi qualcosa'); end if;
  if char_length(b) > 280 then return json_build_object('ok',false,'msg','Massimo 280 caratteri'); end if;
  if public.w_bad(b) then return json_build_object('ok',false,'msg','Non inviato: niente bestemmie, insulti pesanti o minacce. Si può discutere, non offendere.'); end if;
  if exists (select 1 from public.world_chat where user_id = me and created_at > now() - interval '4 seconds') then return json_build_object('ok',false,'msg','Piano: un messaggio ogni 4 secondi'); end if;
  if (select count(*) from public.world_chat where user_id = me and created_at > now() - interval '1 day') >= 200 then return json_build_object('ok',false,'msg','Oggi hai già scritto 200 messaggi'); end if;
  r := public.w_room(p_room);
  insert into public.world_chat(room, user_id, body) values (r, me, b);
  if random() < 0.02 then delete from public.world_chat where created_at < now() - interval '90 days'; end if;
  return json_build_object('ok',true,'room',r);
end $$;
grant execute on function public.world_chat_send(text,text) to authenticated;

-- [4] LEGGERE (senza i messaggi nascosti né quelli di chi hai bloccato) --
create or replace function public.world_chat_list(p_room text, p_after bigint) returns table(id bigint, user_id uuid, nick text, wlevel int, body text, created_at timestamptz, mine boolean, room text)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, public.w_nick(c.user_id), public.w_lvl_of(c.user_id), c.body, c.created_at, c.user_id = auth.uid(), c.room
  from public.world_chat c
  where c.room = public.w_room(p_room) and not c.hidden and c.id > coalesce(p_after,0)
    and c.created_at > now() - interval '90 days'
    and not exists (select 1 from public.world_blocks b where b.user_id = auth.uid() and b.blocked = c.user_id)
  order by c.id desc limit 60;
$$;
grant execute on function public.world_chat_list(text,bigint) to authenticated;

-- [5] SEGNALARE, BLOCCARE, NASCONDERE (admin) ---------------
create or replace function public.world_chat_report(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if public.is_admin() then update public.world_chat set hidden = true where id = p_id; return json_build_object('ok',true,'msg','Messaggio nascosto'); end if;
  insert into public.world_chat_reports(chat_id, reporter) values (p_id, auth.uid()) on conflict do nothing;
  select count(*) into n from public.world_chat_reports where chat_id = p_id;
  update public.world_chat set reports = n, hidden = (n >= 3) where id = p_id;
  return json_build_object('ok',true,'msg', case when n >= 3 then 'Segnalato: il messaggio è stato nascosto' else 'Segnalazione inviata, grazie' end);
end $$;
create or replace function public.world_block(p_user uuid, p_on boolean) returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_user = auth.uid() then return json_build_object('ok',false,'msg','Non valido'); end if;
  if p_on then insert into public.world_blocks(user_id, blocked) values (auth.uid(), p_user) on conflict do nothing;
  else delete from public.world_blocks where user_id = auth.uid() and blocked = p_user; end if;
  return json_build_object('ok',true,'msg', case when p_on then 'Bloccato: non vedrai più i suoi messaggi' else 'Sbloccato' end);
end $$;
create or replace function public.world_blocked() returns table(user_id uuid, nick text)
language sql stable security definer set search_path = public as $$
  select b.blocked, public.w_nick(b.blocked) from public.world_blocks b where b.user_id = auth.uid();
$$;
grant execute on function public.world_chat_report(bigint) to authenticated;
grant execute on function public.world_block(uuid,boolean) to authenticated;
grant execute on function public.world_blocked() to authenticated;
