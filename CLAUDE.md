# ZombieSafeHouse — istruzioni per Claude Code

## Chi e come
- Titolare: Alessandro (INDZ). Scrivi sempre in **italiano**, risposte brevi e dirette.
- Per tutto ciò che deve fare lui (GitHub, Netlify, Supabase, iPhone): **un passo alla volta**, con cosa cliccare e cosa deve comparire.
- Usa Safari sul Mac (Google Traduttore in Chrome rompe le pagine tecniche).

## Cos'è
PWA in un solo file `index.html`: valuta la sicurezza della casa vera e la trasforma in un gioco a fumetto a tema zombie, in un **mondo unico condiviso** (Supabase). Barra bassa: 🏠 Casa · 🗺️ Mappa · 🧟 Orda · 👥 Superstiti.

## Struttura dei sorgenti
- Moduli `p1_head.html` (CSS), `p2_data.js` … `p61_notte.js`: ogni file è un `<script>`.
- `build.sh` (funziona da qualsiasi cartella) li concatena nell'ordine scritto lì → `app.html` → `dist/index.html` + `dist/sw.js` (versione = data/ora della build, `zsh-AAAAMMGGhhmm`).
- `check_syntax.js` e `check_css.py` bloccano la build in caso di errori.
- Molti moduli **avvolgono** funzioni dei moduli precedenti (`const _x=f; f=function(){…}`): l'ordine in `build.sh` conta.
- Sotto la scheda Orda c'è ancora il **vecchio gioco a carte/notti** (p5_game, p5b…p5h, renderHubBase), nascosto: è codice morto da eliminare con cura.
- SQL: file `*.sql` (blocchi già eseguiti su Supabase; i più recenti: zombie, alleati_sim, assedio, fortezze, premi, residenti, abitazione, nome_casa, classifica).
- Funzione Edge: `supabase/functions/zsh-push/index.ts` (notifiche + meteo/pendenza per casa).

## Prove
- Server finto: `sb_mock.js` (+ `ml_stub.js` per la mappa). Le prove sono `t_*.py` (Playwright, iPhone 13).
- Prove principali in un colpo: `./prove.sh` (build + t_ar3 `ERR2 []`, t_buttons `problemi: 0`, t_fronte_lento, t_account) → deve finire con `TUTTO OK`. Prove della zona toccata in aggiunta: `./prove.sh t_map.py t_case.py`.
- Le prove trovano `app.html`, `sb_mock.js`, `ml_stub.js` nella loro cartella (variabile `D`): niente percorsi fissi.
- Nel cloud di Claude Code serve Playwright per Python della stessa versione del Chromium preinstallato (`/opt/pw-browsers`); se la versione non coincide, lanciare Chromium con `executable_path`.
- Le prove NON vedono il Supabase vero, l'iPhone vero e la rete lenta: per questo i difetti veri arrivano dalle foto di Alessandro. Prova sempre anche: rete lenta/bloccata (`t_fronte_lento.py`), telefono senza dati salvati (S.zone nullo), cambio account.

## Come si lavora (Claude Code nel web)
- Alessandro usa **Claude Code nel browser** (claude.ai/code) o dall'app Claude sull'iPhone: il suo Mac è troppo vecchio per l'app desktop.
- Ogni lavoro = un ramo + una **pull request** con titolo "Fase N — …" e descrizione in italiano: cosa cambia, cosa controllare sul telefono (max 5 punti), eventuali blocchi SQL con istruzioni passo passo.
- Alessandro controlla (anteprima Netlify se presente) e preme **Merge**. Se qualcosa va storto: **Revert** sulla PR.
- Segui **ROADMAP.md**, una fase alla volta, e aggiorna la tabella "Stato".

## Pubblicare
- Sito: https://safehousezombie.netlify.app — Netlify pubblica da solo a ogni commit sul repo **indz10/safehouse** (ramo main).
- Dalla Fase 1: sorgenti alla radice del repo, `dist/` costruita con `./build.sh` e **salvata nel repo**; Netlify pubblica `dist/` tramite `netlify.toml` (`publish = "dist"`, nessun comando di build). Dopo ogni modifica ai sorgenti: rilanciare `./build.sh` e mettere nel commit anche `dist/`.
- `netlify.toml` imposta `publish = "dist"` per produzione, anteprime e rami, e un comando che **fa fallire** la pubblicazione se `dist/` è incompleta (meglio un deploy fallito che il sito in 404). 9/11/2026: dopo il Merge della Fase 1 il sito vero ha dato 404 mentre l'anteprima funzionava → controllare sempre il registro del deploy di produzione ("Publish directory" e numero di file).
- Dopo il push: controllare https://safehousezombie.netlify.app/sw.js (seconda riga = nuova versione). Sul telefono l'app si aggiorna da sola all'apertura; versione visibile in menu ☰ in fondo.

## Supabase
- Progetto `wmweptdpfworispqjhto` (Francoforte). Chiave pubblica nel codice: `sb_publishable_kaNxtTEWBzAdqGVAp_wLdA_XzOtNQFp`. La chiave **secret** non va mai scritta né chiesta in chat.
- Ogni blocco SQL va eseguito in un **foglio nuovo** dell'SQL Editor (fogli con blocchi vecchi hanno causato errori "cannot change return type").

## Regole del gioco da non rompere
- Privacy: case sempre nel punto esatto; il **nome** sopra la casa solo per chi ha scelto "Tutti" (world_homes.vis) o per alleati/coinquilini; superstiti sulla mappa in posizione approssimata (~200 m).
- Case abitate (anche in conferma) mai comprabili.
- Premi in Mattoni decisi dal server (world_reward, max 300/giorno). Niente monete.
- Account separati sullo stesso telefono (zsh_owner): mai copiare i dati di un account in un altro.
- Formule (attacco, difesa, fortificazioni, Punteggio Superstite) identiche tra SQL e app (p47 thrCalc).

## Riepilogo completo
Vedi `ZombieSafeHouse_Riepilogo_per_nuova_chat.md` (stato, decisioni, cronologia delle versioni).
