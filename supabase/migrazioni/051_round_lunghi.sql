-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 051 — 🥊 ROUND PIÙ LUNGHI NELL'ARENA (22/11)
-- Ogni round dura 90 secondi (prima 60): uno scontro al meglio di 3 può durare fino a 7,5 minuti,
-- quindi il server accetta la vittoria fino a 450 secondi dall'inizio (prima 300).
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_arena_cfg() RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  select jsonb_build_object(
    'dist_m', 80, 'acc_max_m', 50, 'attesa_min', 30, 'max_giorno', 30,
    'diff', jsonb_build_object('facile', -2, 'equilibrato', 0, 'difficile', 2),
    'xp_molt', jsonb_build_object('facile', 0.7, 'equilibrato', 1.0, 'difficile', 1.5),
    'durata_max_s', 450, 'colpi_s', 2.5,
    'esplora_m', 50, 'esplora_vel_ms', 20, 'esplora_toll_m', 30, 'esplora_casa_m', 150);
$$;

-- controllo: deve dire "round lunghi pronti"
select case when (public.w_arena_cfg()->>'durata_max_s')::int = 450 then 'round lunghi pronti' else 'qualcosa manca' end as esito;
