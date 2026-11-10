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
- Scheda Orda: la disegna `p63_orda.js` (`renderOrda`/`renderHub`) con i suoi 6 riquadri. Il **vecchio gioco a carte/notti è stato tolto** (Fasi 3a–3b-2): restano solo `p5_game.js` ridotto (finestre `openSheet`/`closeSheet`, stato `G`, `sfx`, tipi di zombie `ZT`, `startGame`, tabelle usate da p15/p20/p21), `p5b_luck` (ruota, gratta, barattolo), `p5c_daily` (premio del giorno), `p5d_viatico`, `p5j_giorno` (`busy`, `dayInit`, `EXPS` ancora usati), `p5z_tenuti.js` (pezzi salvati dai moduli tolti) e `p4b_tavole` ("Simula la notte" nella vecchia pagina Gioco: da decidere in Fase 4).
- Funzioni dell'Orda: dalla Fase 4b sono **definite una volta** in `p63_orda.js` (fronte `frComp`/`frWx`/`frChanceOf`/`frHeader`/`frZSheet`, `defLoad`, `orLoad`, `orRefresh`, `orView`, `assalto`, `tmInit`/`tmBind`, `luckTopBind`); le vecchie basi si chiamano `…Base` nei moduli di origine (`assaltoMappa` = regia sulla mappa). Tolte le sottoschede del vecchio hub (`ssOf`/`ssApply`, `ordaUnify`). Prova di confronto: `t_orda_fn.py`.
- Funzioni della mappa: dalla Fase 4c sono **definite una volta** in `p65_mappa.js` (`liveMap` — prima base + 9 strati —, `renderMappa`, `mhBar`, `wSheet`/`wSheetEdificio`, `wDrawMap`, `bizSheet`, `lmPoi`); le basi si chiamano `…Base` nei moduli di origine. Ogni pezzo che era uno strato sta in un blocco a sé, così un `return` anticipato ferma solo quel pezzo come prima. Prova di confronto: `t_mappa_fn.py`.
- Funzioni dei Superstiti: dalla Fase 4d sono **definite una volta** in `p66_superstiti.js` (`socPaint` — prima base + 10 strati —, `socLine`, `playerSheet`, `renderSocial`, `socFetchTab`, `alHTML`, `alBind`, `ayRefresh`, `eqRankPaint`, `thrView`, `allySheet`, `inviteSheet`); basi `…Base` nei moduli di origine. Prova di confronto: `t_superstiti_fn.py`.
- Menu ☰, barre e istruzioni: dalla Fase 4e sono **definiti una volta** in `p67_menu.js` (`zmItems`, `zmDo`, `zmOpen`, `zTopbar`, `renderNav`, `manualHTML`); basi `…Base` nei moduli di origine. Il vecchio menu a tendina di p10 (pulsante nascosto) è stato tolto. Prova di confronto: `t_menu_fn.py`. Controllo `docs/strumenti/troppo_presto.js`: segnala i riferimenti fatti al caricamento (anche dentro funzioni auto-eseguite) a funzioni definite in un modulo successivo: va lanciato dopo ogni spostamento di funzioni; se serve la versione di quel momento, usare la `…Base`.
- Funzioni comuni: dalla Fase 4f-1 sono **definite una volta** in `p68_comune.js` (`go` — prima base + 8 strati —, `onLogin`, `wMine`, `saveLocal`, `pushCloud`, `snapshot`, `restore`, `openSheet`, `closeSheet`, `analyzeZone`); basi `…Base` nei moduli di origine. Prova di confronto: `t_comune_fn.py`.
- **Orologio unico** (Fase 4f-2): `p1z_orologio.js` (caricato per primo) ha un solo timer di sistema; i compiti periodici si registrano con `zEvery(fn, ms, nome)` (stessi argomenti di `setInterval`). Per un nuovo compito permanente usare `zEvery`, non `setInterval`; i timer temporanei dentro pagine e animazioni restano `setInterval`. Prova: `t_orologio.py` (timer permanenti all'avvio: 1). Con l'app in sfondo (`document.hidden`) l'orologio non fa girare niente (Fase 7a).
- Pagina della casa: dalla Fase 4a è **una sola funzione** `houseSheet` in `p64_casa.js` (i 13 strati di p31…p62 sono diventati i passi `hs_*`, nello stesso ordine). La pagina resta nascosta ("Carico la casa…") finché tutti i passi non sono finiti (massimo 8 s) e poi compare già completa. Per cambiarla: modificare il passo giusto in p64, non aggiungere strati.
- **Le mie case** (Fase 5b): chi ha l'account e ha valutato la casa vede "🏠 Le mie case" (homepage e menu ☰): elenco `casasSheet` in p64, con in cima ❤️ la casa dove abita e poi quelle comprate; ogni casa apre `houseSheet`. Nella casa vera il passo `hs_valutazione` mette il piano d'azione e la valutazione (foto, risposte, posizione, trasloco). `go('casa')` con l'account apre l'elenco (`casasOk`); la vecchia pagina Casa resta solo per chi non ha l'account. Chi entra la prima volta vede "📷 Valuta la mia casa".
- **Indietro** (Fase 5c): prima di aprire una finestra da un elenco si mette `window.SHEET_BACK={t:'‹ …',fn}` → `openSheet` (p68) mostra il pulsante in cima finché la finestra non viene chiusa (`closeSheet` lo azzera). Il menu ☰ (`zmDo` in p67) lo fa per ogni voce ("‹ Menu"; se la voce apre una pagina, "‹ Torna al menu" in cima); "Le mie case" lo fa per ogni casa ("‹ Le mie case").
- **Aggiornamento** (Fase 5d): un solo meccanismo, `autoUpdate` in p20. Controlla la versione di `sw.js` all'apertura e ogni volta che l'app torna dallo sfondo; nei primi 20 s mostra "✨ Aggiorno l'app…" e ricarica subito, anche con una finestra aperta; più tardi aspetta che non ci siano finestre aperte. p56 mostra solo l'avviso "C'è una versione nuova".
- Link d'invito: sempre `ZSH_SITO` (sito vero, p20), anche quando si prova da un'anteprima.
- **Mappa del codice**: `docs/MAPPA_CODICE.md` (moduli, catene di avvolgimenti, codice morto, cosa serve del vecchio gioco, struttura della Fase 4). Strumenti per rifare le misure: `docs/strumenti/`.
- SQL: i file `*.sql` alla radice sono la **storia** (già eseguiti su Supabase, ordine in `docs/strumenti/schema_sql.js`): non si modificano più. Dalla Fase 6a ogni cambio è un file **`supabase/migrazioni/NNN_nome.sql`** (vedi `supabase/LEGGIMI.md`). Stato del database: `supabase/schema.sql`, rigenerato da `docs/strumenti/db_locale.sh` (Postgres di prova locale, mai quello vero). Inventario e funzioni non usate: `docs/DATABASE.md`. Controllo del database vero: `supabase/controllo/001_impronte.sql` (solo lettura) + `docs/strumenti/confronta_db.js`.
- Funzioni Edge: `supabase/functions/zsh-push/index.ts` (notifiche + meteo/pendenza per casa) e `supabase/functions/zsh-api/index.ts` (IA foto, Radio Operatore, attività); segreti e pubblicazione in `supabase/functions/LEGGIMI.md`. Controllo notifiche: `supabase/controllo/002_notifiche.sql`.

## Prove
- Server finto: `sb_mock.js` (+ `ml_stub.js` per la mappa). Le prove sono `t_*.py` (Playwright, iPhone 13).
- `t_ar3.py` è la **prova generale** (riscritta nella Fase 3b-1: tutte le schede, Orda, pagina della casa, menu, schermo orizzontale) → `ERR2 []`.
- Prove principali in un colpo: `./prove.sh` (build + t_ar3 `ERR2 []`, t_buttons `problemi: 0`, t_fronte_lento, t_account, t_casa_una `cambi visibili: 0`, t_orologio `timer permanenti all'avvio: 1`) → deve finire con `TUTTO OK`. Prove della zona toccata in aggiunta: `./prove.sh t_map.py t_case.py`.
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
- Formule (attacco, difesa, fortificazioni, Punteggio Superstite) identiche tra SQL e app (p47 thrCalc): scritte in **`docs/FORMULE.md`**; prova `node docs/strumenti/prova_formule.js <cartella>` (dopo `db_locale.sh`) → `FORMULE UGUALI`. Ogni % "di tenere" nell'app viene da `frChanceOf` (minaccia vera `world_threats` + `thrCalc`); `defChance` (world_my_defense) solo se la minaccia non è arrivata.

## Riepilogo completo
Vedi `ZombieSafeHouse_Riepilogo_per_nuova_chat.md` (stato, decisioni, cronologia delle versioni).
