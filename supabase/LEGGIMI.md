# Cartella supabase/

- `schema.sql` — **stato del database** (schema `public`): tabelle, funzioni, regole, trigger, permessi. È un documento, non si esegue.
  Si rigenera con `docs/strumenti/db_locale.sh <cartella di lavoro>`, che esegue in ordine i file `*.sql` della radice e poi `migrazioni/` su un Postgres **di prova** (mai su quello vero).
- `migrazioni/` — **da ora ogni cambio al database è un file numerato** `NNN_nome.sql` (001, 002…). Alessandro lo esegue una volta, in un foglio nuovo dell'SQL Editor. I file `*.sql` alla radice sono la storia fino alla Fase 6a: non si modificano più.
- `controllo/` — interrogazioni di **sola lettura**.
  - `001_impronte.sql`: un'impronta per ogni funzione, tabella, regola e lavoro programmato del database vero.
  - `impronte_attese.txt`: le stesse impronte calcolate dal database di prova.
  - Confronto: `node docs/strumenti/confronta_db.js <impronte vere>`.
- `functions/zsh-push/` — funzione Edge per le notifiche e per meteo e pendenza delle case. `zsh-api.ts` — funzione Edge per l'IA delle foto, Radio Operatore e attività.

Inventario (chi usa cosa, funzioni non usate): `docs/DATABASE.md`.
