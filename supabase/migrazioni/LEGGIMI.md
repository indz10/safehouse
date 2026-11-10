# Migrazioni

Ogni cambio al database = un file nuovo `NNN_nome.sql` (numero a 3 cifre, in ordine). Regole:
- si può eseguire **più volte** senza danni (`create or replace`, `if exists`, `if not exists`);
- in cima un commento: cosa fa, cosa controllare dopo;
- prima di proporlo: `docs/strumenti/db_locale.sh` deve finire con `errori: 0` e `supabase/schema.sql` va rigenerato nello stesso commit;
- Alessandro lo esegue una volta in un **foglio nuovo** dell'SQL Editor; poi si aggiorna la tabella qui sotto.

| file | cosa fa | eseguito |
|---|---|---|
