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
