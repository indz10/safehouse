#!/bin/bash
# Fase 6a · ricostruisce il database IN LOCALE (mai quello vero): un Postgres di prova, i file *.sql nell'ordine di
# docs/strumenti/schema_sql.js, poi scrive supabase/schema.sql (pg_dump) e supabase/controllo/impronte_attese.txt.
# Uso: docs/strumenti/db_locale.sh <cartella di lavoro fuori dal repository>
# Serve PostgreSQL 16 (initdb, pg_ctl, psql, pg_dump); va lanciato da root (il server gira come utente postgres).
set -e
R=$(cd "$(dirname "$0")/../.." && pwd); W=${1:?cartella di lavoro}; B=$(ls -d /usr/lib/postgresql/*/bin | tail -1); PORT=5499
mkdir -p "$W/run"; chown postgres "$W"
# il server (utente postgres) deve poter attraversare le cartelle sopra W
d="$W"; while [ "$d" != "/" ]; do chmod o+x "$d" 2>/dev/null || true; d=$(dirname "$d"); done
if ! psql -h "$W" -p $PORT -U postgres -c 'select 1' postgres >/dev/null 2>&1; then
  [ -d "$W/data" ] || su postgres -c "$B/initdb -D $W/data -A trust -U postgres >/dev/null"
  su postgres -c "$B/pg_ctl -D $W/data -o '-p $PORT -k $W' -l $W/log.txt start" >/dev/null; sleep 2; fi
P="psql -h $W -p $PORT -U postgres -q"
$P -c "drop database if exists zsh" -c "create database zsh" postgres >/dev/null 2>&1
$P -d zsh -f "$R/docs/strumenti/db_supabase_finto.sql" >/dev/null
ORDER=$(node -e "const s=require('fs').readFileSync('$R/docs/strumenti/schema_sql.js','utf8');console.log(eval(s.match(/const ORDER=(\[[\s\S]*?\]);/)[1]).join(' '))")
ERR=0
for f in $ORDER; do sed -E 's/^\s*create extension if not exists pg_(cron|net);//I' "$R/$f" > "$W/run/$f"
  e=$($P -d zsh -v ON_ERROR_STOP=0 -f "$W/run/$f" 2>&1 >/dev/null | grep -E "ERROR" || true)
  if [ -n "$e" ]; then echo "== $f"; echo "$e" | head -8; ERR=1; fi; done
for f in "$R"/supabase/migrazioni/[0-9]*.sql; do [ -e "$f" ] || continue
  e=$($P -d zsh -v ON_ERROR_STOP=0 -f "$f" 2>&1 >/dev/null | grep -E "ERROR" || true); if [ -n "$e" ]; then echo "== $(basename $f)"; echo "$e" | head -8; ERR=1; fi; done
{ echo "-- ZombieSafeHouse · STATO DEL DATABASE (schema public) ricostruito eseguendo in ordine i file *.sql"
  echo "-- e supabase/migrazioni/ su un Postgres di prova (docs/strumenti/db_locale.sh). È un DOCUMENTO: non eseguirlo."
  echo "-- Per cambiare il database: un file nuovo in supabase/migrazioni/NNN_nome.sql."
  echo "-- Lavori programmati (cron): $($P -d zsh -tA -c "select string_agg(jobname||' '||schedule, '; ') from cron.job")"
  "$B/pg_dump" -h "$W" -p $PORT -U postgres -d zsh -n public --schema-only --no-owner | grep -v '^-- Dumped\|^SET \|^SELECT pg_catalog.set_config' | cat -s; } > "$R/supabase/schema.sql"
$P -d zsh -tA -f "$R/supabase/controllo/001_impronte.sql" > "$R/supabase/controllo/impronte_attese.txt"
echo "schema.sql: $(wc -l < "$R/supabase/schema.sql") righe · impronte: $(grep -c . "$R/supabase/controllo/impronte_attese.txt") righe · errori: $ERR"
