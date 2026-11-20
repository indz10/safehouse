# 🧪 Beta per i tester — pronta, da attivare dopo

Tutto il lavoro per i tester è in `fase_beta_tester.patch` (preparato il 19/11/2026, Fase 48):

- **🐞 Segnala un problema** nel menu ☰ e in 🩺 Controlla il mio gioco: tipo (non funziona / grafica / non ho capito / idea), testo, dati tecnici automatici (versione, pagina, telefono, ultimi errori, **mai la posizione**), massimo 20 al giorno.
- **📋 Elenco per l'amministratore** in fondo alla stessa scheda, con ✅ Risolta.
- **🧪 Benvenuto nella beta**: una volta sola, 5 cose da provare.
- SQL: migrazione `039_segnalazioni.sql` (tabella `world_segnalazioni`), dentro il file.

## Quando volete aprire ai tester
1. Scrivi a Claude Code: **"attiva la beta dei tester da docs/beta"**.
2. Claude applica il file, aggiorna build e prove e apre una PR "Fase N — Beta per i tester".
3. Tu esegui l'SQL 039 in un foglio nuovo dell'SQL Editor (deve dire **segnalazioni pronte**) e premi Merge.

Comandi per Claude: `git apply --3way docs/beta/fase_beta_tester.patch`, poi controllare che `p102_beta.js` sia in `build.sh` (prima di `p103_bacheca.js`), `./build.sh`, `./prove.sh t_beta.py`.
