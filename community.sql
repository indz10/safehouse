-- =========================================================
-- ZombieSafeHouse · COMMUNITY VERA e SEGNALAZIONI (ottobre 2026)
-- Eseguire una volta in Supabase → SQL Editor → New query → Run
-- =========================================================
-- profili pubblici: solo chi accetta, posizione arrotondata (~200 m)
create table if not exists public.profili_pubblici(
  user_id uuid primary key references auth.users(id) on delete cascade,
  nick text not null,
  lat_r double precision,
  lon_r double precision,
  comune text,
  indice numeric,
  livello int,
  visibile boolean default true,
  seen_at timestamptz default now(),
  updated_at timestamptz default now());
alter table public.profili_pubblici enable row level security;
drop policy if exists "si vedono i profili pubblici" on public.profili_pubblici;
create policy "si vedono i profili pubblici" on public.profili_pubblici for select using (visibile or user_id = auth.uid());
drop policy if exists "ognuno crea il suo profilo" on public.profili_pubblici;
create policy "ognuno crea il suo profilo" on public.profili_pubblici for insert with check (user_id = auth.uid());
drop policy if exists "ognuno aggiorna il suo profilo" on public.profili_pubblici;
create policy "ognuno aggiorna il suo profilo" on public.profili_pubblici for update using (user_id = auth.uid());
drop policy if exists "ognuno cancella il suo profilo" on public.profili_pubblici;
create policy "ognuno cancella il suo profilo" on public.profili_pubblici for delete using (user_id = auth.uid());

-- segnalazioni degli utenti: "questa attività ha chiuso"
create table if not exists public.poi_reports(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision,
  lon double precision,
  motivo text,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz default now());
alter table public.poi_reports enable row level security;
drop policy if exists "utenti segnalano" on public.poi_reports;
create policy "utenti segnalano" on public.poi_reports for insert with check (auth.uid() is not null);
drop policy if exists "admin legge segnalazioni" on public.poi_reports;
create policy "admin legge segnalazioni" on public.poi_reports for select using (public.is_admin());
drop policy if exists "admin gestisce segnalazioni" on public.poi_reports;
create policy "admin gestisce segnalazioni" on public.poi_reports for delete using (public.is_admin());

-- numeri veri in alto: utenti registrati e attivi negli ultimi 5 minuti
create or replace function public.zsh_stats() returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'utenti', (select count(*) from auth.users),
    'online', (select count(*) from public.profili_pubblici where seen_at > now() - interval '5 minutes'),
    'visibili', (select count(*) from public.profili_pubblici where visibile and lat_r is not null));
$$;
grant execute on function public.zsh_stats() to anon, authenticated;
