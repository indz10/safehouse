#!/usr/bin/env bash
# Prove principali: build + prove Playwright (server finto sb_mock.js, schermo iPhone 13).
# Uso: ./prove.sh            (da qualsiasi cartella)
#      ./prove.sh t_map.py   (aggiunge altre prove della zona toccata)
cd "$(dirname "$0")"
./build.sh || { echo "STOP: la build non funziona"; exit 1; }
FALLITE=0
prova(){ # nome file, testo che NON deve mancare nell'uscita
  echo; echo "=== $1"
  OUT=$(timeout 300 python3 "$1" 2>&1); echo "$OUT" | tail -n 15
  if [ -n "$2" ] && ! echo "$OUT" | grep -qF -- "$2"; then echo "!!! $1: manca \"$2\""; FALLITE=$((FALLITE+1)); fi
  if echo "$OUT" | grep -q "Traceback"; then echo "!!! $1: si è fermata con un errore"; FALLITE=$((FALLITE+1)); fi
}
prova t_ar3.py "ERR2 []"
prova t_buttons.py "problemi: 0"
prova t_fronte_lento.py "ERR []"
prova t_account.py "ERR []"
prova t_casa_una.py "cambi visibili: 0"
for extra in "$@"; do prova "$extra" ""; done
echo
if [ $FALLITE -eq 0 ]; then echo "TUTTO OK"; else echo "PROVE NON RIUSCITE: $FALLITE"; exit 1; fi
