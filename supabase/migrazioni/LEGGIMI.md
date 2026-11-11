# Migrazioni

Ogni cambio al database = un file nuovo `NNN_nome.sql` (numero a 3 cifre, in ordine). Regole:
- si può eseguire **più volte** senza danni (`create or replace`, `if exists`, `if not exists`);
- in cima un commento: cosa fa, cosa controllare dopo;
- prima di proporlo: `docs/strumenti/db_locale.sh` deve finire con `errori: 0` e `supabase/schema.sql` va rigenerato nello stesso commit;
- Alessandro lo esegue una volta in un **foglio nuovo** dell'SQL Editor; poi si aggiorna la tabella qui sotto.

| file | cosa fa | eseguito |
|---|---|---|
| 001_funzioni_mancanti.sql | rimette 7 funzioni usate dall'app e mancanti nel database vero (regali, prestiti, diario della casa, chi ti ha invitato); toglie 3 funzioni non usate | 10/11/2026 |
| 002_formule_uguali.sql | bonus del condominio anche nel risultato vero dell'orda e sulla mappa degli assalti; "Perché" con la stessa difesa; moltiplicatori della minaccia con 4 decimali (docs/FORMULE.md) | 10/11/2026 |
| 003_forme_edifici.sql | tabella `world_shapes` + `world_shape_get`/`world_shape_put`: forme e tipi degli edifici da OpenStreetMap salvati una volta per tutti | 11/11/2026 |
| 004_sponsor_iscrizione.sql | sponsor: stato (in attesa/attivo/rifiutato) e visibilità (oscurato/normale/in evidenza), Google/TikTok/orari/descrizione; il negoziante modifica solo contatti e scheda (prima poteva attivarsi da solo); `sponsor_request` (iscrizione dall'app), `admin_sponsor_set`; contatti toccati nelle statistiche | 11/11/2026 |
| 005_sponsor_pagamenti.sql | listino `sponsor_prezzi` (Vetrina 290 €, Vetrina Plus 590 € in evidenza, Partner di categoria 1.490 € in evidenza, 12 mesi), `sponsor_pagato` (solo per la funzione zsh-pay), scadenze ogni notte alle 3:17 (`sponsor_scadenze`) | da eseguire |
