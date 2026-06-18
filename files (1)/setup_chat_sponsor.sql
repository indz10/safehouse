-- ============================================
-- ZOMBIESAFEHOUSE — SETUP CHAT + SPONSOR
-- Incolla tutto questo nell'SQL Editor di Supabase e premi RUN
-- ============================================

-- ---------- TABELLA MESSAGGI (chat community) ----------
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  autore text,
  testo text not null,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

-- Tutti gli utenti loggati possono LEGGERE tutti i messaggi (chat globale)
create policy "Chat leggibile da utenti loggati"
  on public.messages for select
  using (auth.role() = 'authenticated');

-- Ogni utente può scrivere solo a proprio nome
create policy "Utenti scrivono propri messaggi"
  on public.messages for insert
  with check (auth.uid() = user_id);

-- Ogni utente può cancellare solo i propri messaggi
create policy "Utenti cancellano propri messaggi"
  on public.messages for delete
  using (auth.uid() = user_id);

-- Attiva il realtime sulla tabella messaggi (aggiornamento dal vivo)
alter publication supabase_realtime add table public.messages;


-- ---------- TABELLA SPONSOR ----------
create table public.sponsors (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  descrizione text,
  url text,
  attivo boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.sponsors enable row level security;

-- Gli sponsor sono visibili a tutti gli utenti loggati
create policy "Sponsor visibili a utenti loggati"
  on public.sponsors for select
  using (auth.role() = 'authenticated');

-- ---------- SPONSOR DI ESEMPIO (puoi cancellarli o modificarli) ----------
insert into public.sponsors (nome, descrizione, url) values
('SurvivalGear IT', 'Attrezzatura e scorte per ogni emergenza', 'https://example.com'),
('Bunker Solutions', 'Rinforzi e sistemi di sicurezza per la casa', 'https://example.com');

-- ============================================
-- FINE. Dovresti vedere "Success".
-- ============================================


-- ============================================
-- AGGIORNAMENTO v2 — CLASSIFICA (LEADERBOARD)
-- Se hai già eseguito la parte sopra, esegui SOLO questo blocco nuovo
-- ============================================

create table if not exists public.leaderboard (
  user_id uuid references auth.users on delete cascade primary key,
  nickname text,
  best_score numeric,
  valutazioni integer default 0,
  updated_at timestamp with time zone default now()
);

alter table public.leaderboard enable row level security;

-- La classifica è visibile a tutti gli utenti loggati
create policy "Classifica visibile a utenti loggati"
  on public.leaderboard for select
  using (auth.role() = 'authenticated');

-- Ognuno gestisce solo la propria riga
create policy "Utenti creano propria riga classifica"
  on public.leaderboard for insert
  with check (auth.uid() = user_id);
create policy "Utenti aggiornano propria riga classifica"
  on public.leaderboard for update
  using (auth.uid() = user_id);

-- ============================================
-- FINE AGGIORNAMENTO v2
-- ============================================
