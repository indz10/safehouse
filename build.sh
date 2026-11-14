#!/usr/bin/env bash
# Costruisce l'app: concatena i moduli (l'ordine conta!) -> app.html -> dist/
# Funziona da qualsiasi cartella: si sposta sempre nella cartella del repository.
set -e
cd "$(dirname "$0")"

cat p1_head.html p1z_orologio.js p2_data.js p2b_audio.js p3_art.js p3b_community.js p4_app.js p4b_tavole.js p5_game.js p5b_luck.js p5c_daily.js p5d_viatico.js p5z_tenuti.js p5j_giorno.js p7_vivere.js p7b_reviews.js p9_contatti.js p10_menu.js p12_mondo.js p13_ponte.js p14_attivita.js p15_simquart.js p16_accompagna.js p17_cloud.js p18_live.js p19_livemap.js p20_territorio.js p21_mondo.js p22_orda.js p23_v3.js p24_alleati.js p25_struttura.js p26_social.js p27_piazza.js p28_menu.js p29_assalto.js p30_fumetto.js p31_mondo2.js p32_semplice.js p33_fix.js p34_oggi.js p35_spdemo.js p36_rivali.js p37_equita.js p38_oggifix.js p39_fronte.js p40_simulato.js p41_case.js p42_reale.js p43_squadra.js p44_guida.js p45_alleanza.js p46_fronte2.js p47_zombie.js p48_alleati.js p49_assedio.js p50_fortezze.js p51_logout.js p52_mattoni.js p53_casapagina.js p54_account.js p55_abitazione.js p56_stato.js p57_benvenuto.js p58_abitata.js p59_zscheda.js p60_classifica.js p61_notte.js p62_legenda.js p63_orda.js p64_casa.js p65_mappa.js p66_superstiti.js p67_menu.js p68_comune.js p69_presidi.js p70_lente.js p71_mezzi.js p72_trova.js p73_risorse.js p74_alleati_mappa.js p75_mondo.js p76_operatore.js p77_condominio.js p6_boot.js > app.html
node check_syntax.js || { echo "STOP: errore di sintassi"; exit 1; }
python3 check_css.py || { echo "STOP: stile con nomi non definiti"; exit 1; }
node -e "
const fs=require('fs');const s=fs.readFileSync('app.html','utf8');
const parts=s.split('<script>').slice(1).map(p=>p.split('</script>')[0]);
try{new Function(parts.join('\n'));console.log('JS ok '+s.length)}catch(e){console.log('ERRORE',e.message);process.exit(1)}" || { echo "STOP: errore nel JS unito"; exit 1; }

# Fase 7c: app compressa (spazi e commenti tolti) con esbuild; se non si può installare, resta com'è
if [ ! -d .strumenti/node_modules/esbuild ]; then npm install --silent --no-save --no-audit --no-fund --prefix .strumenti esbuild@0.24.0 >/dev/null 2>&1 || true; fi
node minifica.js app.html
node -e "
const fs=require('fs');const s=fs.readFileSync('app.html','utf8');
const parts=s.split('<script>').slice(1).map(p=>p.split('</script>')[0]);
try{new Function(parts.join('\n'));}catch(e){console.log('ERRORE dopo la compressione',e.message);process.exit(1)}" || { echo "STOP: errore nel JS compresso"; exit 1; }

# versione: data e ora della build, uguale in index.html e sw.js
B=$(TZ=Europe/Rome date +%Y%m%d%H%M)  # ora italiana
sed -i "s/__BUILD__/$B/g" app.html
rm -rf dist && mkdir -p dist
cp app.html dist/index.html
sed "s/__BUILD__/$B/g" pwa/sw.js > dist/sw.js
cp pwa/manifest.json pwa/*.png pwa/orde.ics pwa/supabase.js dist/
cp admin.html negozio.html legal/*.html dist/
echo "versione $B -> dist/"
