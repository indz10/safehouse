-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 007 — notifiche dei messaggi della piazza
-- 1) push_subs: per ogni telefono la scelta "piazza" (no / zona / tutto) e l'ora dell'ultimo avviso della piazza.
-- 2) push_piazza: il giocatore sceglie dall'app (🔔 Notifiche delle orde) se ricevere i messaggi della piazza.
-- 3) w_piazza_nuovi: per la funzione Edge zsh-push (solo server): messaggi nuovi nella piazza della sua zona
--    (e del Mondo se ha scelto "tutto"), esclusi i suoi, quelli nascosti e quelli di chi ha bloccato.
-- La funzione Edge manda al massimo un avviso ogni 30 minuti, con l'ultimo messaggio e quanti altri.
-- Non cancella dati. Si può eseguire più volte.
-- =====================================================================

alter table public.push_subs add column if not exists piazza text not null default 'zona';
alter table public.push_subs add column if not exists last_chat timestamptz not null default now();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'push_subs_piazza_check') then
    alter table public.push_subs add constraint push_subs_piazza_check check (piazza in ('no','zona','tutto'));
  end if;
end $$;

-- scelta dall'app; con p_mode vuoto risponde solo con la scelta attuale
create or replace function public.push_piazza(p_endpoint text, p_mode text) returns json
language plpgsql security definer set search_path = public as $$
declare m text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if coalesce(p_mode, '') <> '' then
    if p_mode not in ('no','zona','tutto') then return json_build_object('ok', false, 'msg', 'scelta non valida'); end if;
    update public.push_subs set piazza = p_mode, last_chat = now() where endpoint = p_endpoint and user_id = auth.uid();
  end if;
  select piazza into m from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
  if m is null then return json_build_object('ok', false, 'msg', 'Notifiche non attive su questo telefono'); end if;
  return json_build_object('ok', true, 'piazza', m);
end $$;
revoke all on function public.push_piazza(text, text) from public, anon;
grant execute on function public.push_piazza(text, text) to authenticated;

-- messaggi nuovi per un giocatore (la usa solo la funzione Edge, con la chiave del server)
create or replace function public.w_piazza_nuovi(p_user uuid, p_since timestamptz, p_mode text) returns json
language sql stable security definer set search_path = public as $$
  with z as (select 'z:' || round(h.lat::numeric,1) || ':' || round(h.lon::numeric,1) as room from public.world_homes h where h.user_id = p_user),
  m as (select c.id, c.user_id, c.body, c.room from public.world_chat c
         where c.created_at > p_since and not c.hidden and c.user_id is distinct from p_user
           and (c.room in (select room from z) or (p_mode = 'tutto' and c.room = 'mondo'))
           and not exists (select 1 from public.world_blocks b where b.user_id = p_user and b.blocked = c.user_id))
  select json_build_object('n', (select count(*) from m),
    'nick', (select public.w_nick(m.user_id) from m order by m.id desc limit 1),
    'body', (select left(m.body, 90) from m order by m.id desc limit 1),
    'zona', (select bool_or(m.room <> 'mondo') from m));
$$;
revoke all on function public.w_piazza_nuovi(uuid, timestamptz, text) from public, anon, authenticated;

-- controllo: deve dire "notifiche piazza pronte"
select case when exists (select 1 from information_schema.columns where table_name = 'push_subs' and column_name = 'piazza')
             and exists (select 1 from pg_proc where proname = 'w_piazza_nuovi')
       then 'notifiche piazza pronte' else 'qualcosa manca' end as esito;
