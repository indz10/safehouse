# Migrazioni

Ogni cambio al database = un file nuovo `NNN_nome.sql` (numero a 3 cifre, in ordine). Regole:
- si può eseguire **più volte** senza danni (`create or replace`, `if exists`, `if not exists`);
- in cima un commento: cosa fa, cosa controllare dopo;
- prima di proporlo: `docs/strumenti/db_locale.sh` deve finire con `errori: 0` e `supabase/schema.sql` va rigenerato nello stesso commit;
- Alessandro lo esegue una volta in un **foglio nuovo** dell'SQL Editor; poi si aggiorna la tabella qui sotto.

| file | cosa fa | eseguito |
|---|---|---|
| 001_funzioni_mancanti.sql | rimette 7 funzioni usate dall'app e mancanti nel database vero (regali, prestiti, diario della casa, chi ti ha invitato); toglie 3 funzioni non usate | 10/11/2026 |
| 002_formule_uguali.sql | bonus del condominio anche nel risultato vero dell'orda e sulla mappa degli assalti; "Perché" con la stessa difesa; moltiplicatori della minaccia con 4 decimali (docs/FORMULE.md) | da eseguire |
