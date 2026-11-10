# Strumenti della mappa del codice (Fase 2)

Servono a rifare le misure di `docs/MAPPA_CODICE.md` (prima/dopo le Fasi 3, 4 e 7).
Hanno bisogno di `acorn` (lettore di JavaScript), da installare in una cartella di lavoro, non nel repository.

```bash
REPO=/percorso/del/repository
mkdir -p /tmp/an && cd /tmp/an && npm init -y >/dev/null && npm i acorn acorn-walk
cp "$REPO"/docs/strumenti/*.js "$REPO"/docs/strumenti/*.py .
"$REPO"/build.sh                                 # crea app.html
node analizza.js "$REPO" > analisi.json          # definizioni, avvolgimenti, riferimenti
python3 copertura.py "$REPO" "$PWD/cov.json"     # giro dell'app: funzioni eseguite
node unisci.js "$REPO"                           # tabella per modulo -> moduli.json
node morto.js "$REPO"                            # funzioni mai nominate, strati scavalcati
python3 tempi.py "$REPO"                         # tempi degli strati della pagina della casa
```

Dopo la misura: `git checkout -- dist/` se non si vuole pubblicare la build appena fatta.

## Database (Fase 6a)
- `schema_sql.js` — ordine di esecuzione dei file `*.sql` (ORDER) e inventario → `docs/DATABASE.md`. `node docs/strumenti/schema_sql.js .`
- `db_locale.sh <cartella di lavoro>` — Postgres 16 di prova: esegue i file nell'ordine + `supabase/migrazioni/`, scrive `supabase/schema.sql` e `supabase/controllo/impronte_attese.txt`. Usa `db_supabase_finto.sql` (utenti, ruoli, cron finti).
- `confronta_db.js <impronte vere>` — confronta il risultato di `supabase/controllo/001_impronte.sql` sul database vero con quello atteso.
- `prova_formule.js <cartella>` (Fase 6c) — sul Postgres di prova costruisce 12 situazioni (livelli, fortificazioni, condominio, pendenza, meteo) e controlla che app (`thrCalc`), minaccia (`world_threats`), orda vera (`world_raid_status`) e "Perché" (`world_my_defense`) diano gli stessi numeri → `FORMULE UGUALI`.
