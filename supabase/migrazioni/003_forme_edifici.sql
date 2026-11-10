-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 003 — forme degli edifici salvate per tutti (Fase 7b)
-- Prima la forma vera di ogni casa (pianta, piani, tetto) e il tipo di edificio arrivavano da OpenStreetMap
-- (Overpass: lento, a volte non risponde) ed erano salvati solo nel telefono di chi li aveva chiesti.
-- Ora la prima risposta di OpenStreetMap viene salvata qui e da quel momento tutti la ricevono subito.
-- Contiene solo dati pubblici di OpenStreetMap: nessun dato dei giocatori.
-- Leggere e scrivere: solo utenti con account. "Non c'è un edificio" vale 3 giorni (poi si riprova).
-- Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_shapes(
  k text not null,                       -- punto: "45.32550_10.65820" (5 decimali, ~1 m) per la forma; 4 decimali per il tipo
  kind text not null check (kind in ('geo','bt')),   -- geo = forma dell'edificio e vicini; bt = tipo di edificio
  val jsonb,                             -- null = OpenStreetMap ha risposto ma lì non c'è un edificio
  by_user uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (k, kind));
alter table public.world_shapes enable row level security;   -- nessuna regola: si legge e si scrive solo con le due funzioni

create or replace function public.world_shape_get(p_k text, p_kind text) returns json
language sql stable security definer set search_path = public as $$
  select case when s.k is null then null
              when s.val is null and s.updated_at < now() - interval '3 days' then null
              else json_build_object('found', s.val is not null, 'val', s.val) end
  from (select 1) x left join public.world_shapes s on s.k = p_k and s.kind = p_kind
  where auth.uid() is not null;
$$;

create or replace function public.world_shape_put(p_k text, p_kind text, p_val jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null then return json_build_object('ok', false); end if;
  if p_kind not in ('geo','bt') or p_k !~ '^-?[0-9]{1,3}\.[0-9]{4,5}_-?[0-9]{1,3}\.[0-9]{4,5}$' then return json_build_object('ok', false, 'msg', 'chiave'); end if;
  if p_val is not null and octet_length(p_val::text) > 40000 then return json_build_object('ok', false, 'msg', 'troppo grande'); end if;
  select count(*) into n from public.world_shapes where by_user = me and updated_at > now() - interval '1 day';
  if n >= 400 then return json_build_object('ok', false, 'msg', 'limite di oggi'); end if;
  insert into public.world_shapes(k, kind, val, by_user, updated_at) values (p_k, p_kind, p_val, me, now())
  on conflict (k, kind) do update set val = excluded.val, by_user = excluded.by_user, updated_at = now()
    -- una forma trovata non viene sostituita da un "non trovato"; si aggiorna se è vecchia di 60 giorni
    where world_shapes.val is null or (excluded.val is not null and world_shapes.updated_at < now() - interval '60 days');
  return json_build_object('ok', true);
end $$;

revoke all on function public.world_shape_get(text, text) from public, anon;
revoke all on function public.world_shape_put(text, text, jsonb) from public, anon;
grant execute on function public.world_shape_get(text, text) to authenticated;
grant execute on function public.world_shape_put(text, text, jsonb) to authenticated;

-- controllo: deve dire "forme pronte"
select case when to_regclass('public.world_shapes') is not null
             and exists (select 1 from pg_proc where proname = 'world_shape_get')
             and exists (select 1 from pg_proc where proname = 'world_shape_put') then 'forme pronte' else 'qualcosa manca' end as esito;
