# ZombieSafeHouse — Road map di pulizia e crescita (per Claude Code)

Obiettivo: stessa app, stesse funzioni, ma **senza sovrapposizioni**, più **veloce** e **chiara** per chi la usa; poi le funzioni nuove (realtà aumentata, presidi, store).
Regola d'oro: **una fase = una proposta (pull request)**, piccola, provata, controllata da Alessandro sul telefono prima di unirla.

## Situazione di partenza (5/11/2026, versione zsh-202611050013)
- 76 moduli nella build, ~2,6 MB di sorgenti, app pubblicata ~1,3 MB.
- Funzioni avvolte da molti moduli (`const _x=f; f=function(){…}`): splitHub 14 strati, houseSheet 12, socPaint 10, liveMap 9, go 8, renderHome 7, renderHub 6, e altre (wSheet, wMine, onLogin, playerSheet, socLine, zmDo, zmItems, renderMenu, manualHTML, ssOf).
- Vecchio gioco a carte/notti ancora presente e nascosto: 12 moduli p5* (~267 KB). Usati in parte: zArt, sfx, ruota/gratta (p5b), premio del giorno (p5c), renderHub di base.
- 30 file SQL (blocchi eseguiti a mano in tempi diversi), 62 prove Playwright con server finto (sb_mock.js).

## Regole di lavoro (valgono per tutte le fasi)
1. Prima di cambiare: leggi CLAUDE.md, questa road map e il riepilogo. Proponi il piano, poi esegui.
2. Ogni fase su un ramo suo → pull request con titolo "Fase N — …" e descrizione in italiano: cosa cambia, cosa NON cambia, cosa controllare sul telefono (max 5 punti).
3. Nessuna funzione visibile all'utente deve sparire senza che sia scritto nella fase.
4. Prove prima di proporre: build ok, `t_ar3.py` → `ERR2 []`, prove della zona toccata, `t_buttons.py`, `t_fronte_lento.py`, `t_account.py`. Se l'ambiente non può avviare Chromium, dillo e indica quali prove non hai potuto fare.
5. SQL: mai eseguirlo da solo. Prepara i blocchi in `supabase/migrazioni/NNN_nome.sql` e scrivi nella PR, passo per passo, come incollarli (un foglio nuovo per blocco).
6. Mai chiedere o scrivere la chiave secret di Supabase.
7. Alla fine di ogni fase aggiorna CLAUDE.md, questa road map (tabella Stato) e ZombieSafeHouse_Riepilogo_per_nuova_chat.md.

---

## Fase 1 — Fondamenta del repository
**Obiettivo:** il repository contiene i sorgenti; Netlify pubblica la cartella `dist/` costruita.
- Estrai `ZombieSafeHouse_sorgenti.zip` alla radice del repo (il contenuto della cartella `ZombieSafeHouse/` va alla radice), poi cancella lo zip.
- Crea `netlify.toml` con `[build] publish = "dist"` (nessun comando di build: `dist/` è nel repo, costruita da te). Verifica che `dist/` contenga TUTTI i file oggi pubblicati alla radice (index.html, sw.js, manifest.json, icone, admin.html, negozio.html, elimina-account.html, privacy/termini e pagine legali, orde.ics se usato). Solo dopo togli i vecchi file pubblicati dalla radice.
- `build.sh`: deve funzionare in qualsiasi cartella (niente percorsi fissi).
- `.gitignore` per file temporanei (app.html, y*.png, __pycache__).
- Script `prove.sh` che lancia le prove principali.
**Controllo di Alessandro:** anteprima Netlify della PR (se c'è) o, dopo l'unione, safehousezombie.netlify.app/sw.js con la nuova versione; l'app funziona come prima.

## Fase 2 — Mappa del codice (solo rapporto, nessuna modifica)
- Per ogni modulo: cosa fa, cosa avvolge, se è ancora usato.
- Per ogni catena di avvolgimenti: l'ordine reale e cosa aggiunge ogni strato.
- Elenco del codice morto e dei doppioni.
- Proposta della nuova struttura (Fase 4) e ordine dei lavori.
**Consegna:** `docs/MAPPA_CODICE.md` e un riassunto di 10 righe nella PR.
**Esito (9/11):** fatta. Proposta: dividere la Fase 3 in 3a (file fuori build, funzioni mai chiamate, strati scavalcati) e 3b (spostare ciò che serve del vecchio gioco, poi toglierlo). Vedi §7 della mappa.

## Fase 3 — Via il vecchio gioco a carte/notti
**3b divisa a sua volta (9/11):** **3b-1** la scheda Orda disegna direttamente i suoi 6 riquadri (`p63_orda.js`) e non costruisce più il vecchio gioco per poi nasconderlo; **3b-2** toglie il codice del vecchio gioco rimasto senza uso (catena `splitHub`, p4b, p5*, gli strati di p20 sul vecchio quartiere) e le prove che lo provavano.
**Divisa in due (decisione 9/11):** **3a** toglie solo il codice sicuramente morto (file fuori build, funzioni mai chiamate, versioni vecchie già sostituite: vedi `docs/MAPPA_CODICE.md` §2 e §4); **3b** sposta ciò che serve ancora del vecchio gioco (§5 della mappa) e poi toglie il resto.
- Togli battaglia a carte, campagna, arena, sfide, vecchi presidi locali, "Difendi tu", monete, attrezzi, perk, quartieri finti.
- Tieni (spostandoli nei moduli giusti): disegno zombie (zArt), suoni (sfx), ruota e gratta e vinci, premio del giorno, missioni del giorno se usate.
- renderHub di base sostituita da una pagina Orda pulita (fronte, orda del mondo, alleati, premi, missioni).
**Controllo:** Orda, ruota, gratta e vinci, premio del giorno, missioni funzionano; l'app è più leggera.

## Fase 4 — Una funzione per ogni cosa (niente più strati)
Riscrivi per aree, ognuna con le sue funzioni definite UNA volta:
- `casa/` pagina della casa (disegno, fortificazioni, simulatore, abitazione, diario, legenda) e La mia casa.
- `mappa/` liveMap unica (giorno/notte col tramonto, 3D, sponsor, attività, effetti, case del mondo, residenti).
- `orda/` fronte, orda del mondo, assedio a fumetto, scheda zombie, alleati per l'orda.
- `superstiti/` Piazza, privati, bacheca, alleati, rivali, classifica, profilo giocatore.
- `menu/` menu, controllo del gioco, versione, uscita, benvenuto inviti.
- `comune/` stato, cloud, account, Mattoni/premi, notifiche, formule condivise (thrCalc), testi.
Una sola funzione `go`, `openSheet`, `houseSheet`, `renderHome`, `liveMap`. Un unico orologio centrale per i timer.
**Ordine deciso (9/11):** 4a pagina della casa → 4b Orda → 4c Mappa → 4d Superstiti → 4e Menu → 4f Comune (orologio unico).
- **Nota di Alessandro (9/11):** nella pagina della casa compare prima la versione vecchia e poi quella nuova (strati sovrapposti): la pagina deve disegnarsi una volta sola, già nella forma finale.
- **Nota di Alessandro (9/11, sull'anteprima della Fase 2):** aprendo una casa compaiono subito i potenziamenti vecchi e dopo qualche secondo le fortificazioni nuove; dalla homepage il pulsante "🏠 La mia casa" a volte apre la vecchia pagina "La mia casa" con tutte le case; da Mappa/Orda la casa mia e la 2 si aprono bene, la 1 no. Cause in `docs/MAPPA_CODICE.md` §3.
**Controllo:** tutte le schermate uguali o più chiare; nessuna funzione persa (lista nella PR).

## Fase 5 — Chiarezza per chi usa l'app
- **Richiesta di Alessandro (4e):** dal menu ☰, dopo aver aperto una voce, poter tornare al menu (oggi si chiude e bisogna riaprirlo con ☰).
- Piano a passi: **5a** testi del vecchio gioco (monete, notti, battaglia, "Difendi tu") · **5b** una sola pagina "La mia casa" · **5c** tornare al menu ☰ dopo una voce · **5d** aggiornamento all'apertura · **5e** stessi nomi ovunque, guida e "Il tuo prossimo passo".
- **5a fatta:** Invita amici, servizi della mappa (farmacia…: ora "Vivibilità"), Ho cambiato casa, Oggi e luna piena, regali agli alleati (niente più monete tra i doni), premi dell'orda e delle missioni in 🧱, bottega e pagina Io senza monete, giro guidato senza il passo "Difendi tu", istruzioni sui regali.
- **5b fatta:** una sola strada per le case: "🏠 Le mie case" (elenco, ❤️ casa dove abiti in cima, poi le comprate) → pagina della casa; nella casa vera ci sono anche piano d'azione e valutazione. La vecchia pagina Casa resta solo per chi non ha l'account.
- **5c fatta:** "‹ Menu" nelle finestre aperte dal menu ☰ (e "‹ Torna al menu" nelle pagine), "‹ Le mie case" nella pagina di una casa aperta dall'elenco. Corretto anche il link d'invito: puntava all'indirizzo da cui si invitava (un'anteprima → versione vecchia, niente notifiche); ora è sempre il sito vero.
- **5e fatta:** stesso premio d'invito ovunque (🧱 150 + 💎 5, come dà il server), "Il tuo prossimo passo" (Scudo x/5 con il passo successivo; "Potenzia" solo se hai case comprate e apre la casa), "Difese mirate" → "Fortificazioni contro questi zombie", giro guidato da 6 a 9 passi (fronte, Superstiti, Le mie case; missioni descritte come sono oggi).
- **5d fatta:** alla prima apertura dopo un aggiornamento l'app mostrava la versione vecchia. Causa: l'iPhone riapre l'app dallo sfondo con la pagina vecchia in memoria; l'aggiornamento automatico partiva solo nei primi 20 s dall'avvio vero o senza finestre aperte (il premio del giorno lo bloccava). Ora, appena l'app torna in primo piano: "✨ Aggiorno l'app…" e ricarica.
- Ogni schermata risponde a: dove sono, cosa vedo, cosa posso fare ora.
- Una sola pagina per casa: togliere i doppioni in La mia casa.
- Testi brevi, stessi nomi ovunque (Mattoni, gemme, fortificazioni, livello, Punteggio Superstite).
- Guida/aiuto e "Il tuo prossimo passo" aggiornati alle funzioni vere.
- Coerenza grafica (pulsanti, schede, colori, icone).
**Controllo:** Alessandro e un tester nuovo provano senza spiegazioni.

## Fase 6 — Database in ordine
- Piano a passi: **6a** stato ricostruito (`supabase/schema.sql`), inventario (`docs/DATABASE.md`), controllo di sola lettura del database vero · **6b** prima migrazione: togliere le funzioni non usate e sistemare le differenze trovate · **6c** formule in un posto solo (SQL = app) · **6d** funzioni Edge con istruzioni.
- **6d:** funzioni Edge nel repo una per cartella (`supabase/functions/zsh-push`, `supabase/functions/zsh-api`, spostata da `supabase/zsh-api.ts`), istruzioni di pubblicazione e segreti in `supabase/functions/LEGGIMI.md`, controllo di sola lettura delle notifiche `supabase/controllo/002_notifiche.sql`. Risultato del 10/11/2026: orologio e zsh-push funzionano (144 chiamate/24 h, 0 fallite, 12 avvisi in 3 giorni); un solo telefono iscritto → chi non riceve notifiche non le ha attivate dall'app sulla schermata Home.
- **6c:** le % "di tenere" erano calcolate in 3 modi diversi (minaccia vera, "Perché"/fronte con una formula vecchia, pagina della casa) → nella prova la stessa casa dava 37% e 88%. Ora l'app usa ovunque la minaccia vera (`frChanceOf`). Nel server il bonus del condominio era nella % e nel Punteggio ma non nel risultato vero dell'orda né nella mappa degli assalti: migrazione `002_formule_uguali.sql`. Formule in `docs/FORMULE.md`, prova `docs/strumenti/prova_formule.js` (96 controlli; senza la 002 trova 20 differenze).
- **6b:** controllo del database vero (10/11/2026, `supabase/controllo/impronte_vere_20261110.json`): tabelle e colonne identiche; **mancavano 7 funzioni usate dall'app** (`world_gifts_in`, `world_gift_claim`, `world_loans`, `w_settle_loans`, `world_mine2` da mondo_v4; `world_house_log` da assedio; `world_inviter` da benvenuto) → regali e prestiti tra alleati non arrivavano, diario della casa solo sul telefono. Migrazione `001_funzioni_mancanti.sql` le rimette e toglie `w_attack`, `w_power`, `world_blocked`. Restano differenze innocue: nomi diversi delle regole di `profili_pubblici`/`poi_reports`/`hidden_pois` (stesse protezioni), 4 tabelle vecchie non usate (`houses`, `leaderboard`, `messages`, `sponsors_vecchia_…`), `rls_auto_enable` (di Supabase). L'SQL Editor toglie le righe di commento dalle funzioni: il controllo le ignora.
- **6a:** i 30 file eseguiti in ordine su un Postgres di prova girano senza errori: 42 tabelle, 124 funzioni (3 non usate: `w_attack`, `w_power`, `world_blocked`), 41 regole, 11 trigger, 1 lavoro programmato.
- `supabase/schema.sql`: lo stato attuale completo (tabelle, funzioni, permessi) ricostruito dai 30 file.
- `supabase/migrazioni/`: da ora ogni cambio è un file numerato.
- Elenco delle funzioni SQL non più usate dall'app e blocco per toglierle.
- Formule (attacco, difesa, fortificazioni, punteggio) documentate in un posto e identiche tra SQL e app.
- Funzione Edge `zsh-push` nel repo con istruzioni di pubblicazione.
**Controllo:** Alessandro esegue i blocchi indicati; l'app funziona come prima.

## Fase 7 — Velocità e peso
- Piano a passi: **7a** Radio Operatore rifatta + orologio fermo in sfondo · **7b** forme degli edifici salvate su Supabase per tutti (casa 1 generica, case lente) · **7c** peso e apertura (caricare a pezzi, `t_perf.py` prima/dopo).
- **7c:** misure (`t_perf.py`, processore ×4 più lento, caratteri di Google lenti 1,5 s): app 1.012 KB → 854 KB, scaricata dal telefono 319 KB → 277 KB (compressione con esbuild in `build.sh`/`minifica.js`, 418 regole di stile mai usate tolte con `docs/strumenti/css_morto.js`; nessun pixel diverso su 12 schermate). Prima schermata 1,7 s → 0,3 s: i caratteri di Google non bloccano più il disegno. Service worker: se la rete tarda più di 3 s o il sito è in errore apre la copia salvata (rete lentissima: 8,1 s → 3,1 s). Il calcolo all'avvio era già piccolo (~60 ms): la lentezza vera veniva dalla rete. Obiettivo "sotto 700 KB" non raggiunto senza caricare a pezzi (lavoro grande, rimandato: conta quello che si scarica, già 277 KB).
- **7b:** forme e tipi degli edifici salvati su Supabase (`world_shapes`, migrazione 003): ordine memoria → telefono → server (max 2,5 s) → OpenStreetMap; la prima risposta di OpenStreetMap viene salvata per tutti; "non c'è un edificio" vale 3 giorni. Prova `t_forme.py` (in `prove.sh`). Se la casa 1 resta generica anche dopo: in OpenStreetMap non c'è un edificio entro 60 m dal punto (serve la posizione per verificarlo).
- **7a fatta:** Radio Operatore a misura di schermo (prima casella e domande finivano sotto la barra in basso, "Aiuto" sopra "Invia"); risposte automatiche aggiornate al gioco di oggi (servono finché manca `ANTHROPIC_API_KEY` su Supabase: l'IA non è mai stata attiva, decisione sul pagamento rimandata); istruzioni per l'IA aggiornate; orologio unico fermo con l'app in sfondo.
- Con l'orologio unico (4f-2) si può, in un posto solo, fermare o rallentare i compiti periodici quando l'app è in background (oggi solo alcuni lo fanno da sé).
- Obiettivo: app pubblicata sotto 700 KB, prima schermata in meno di 2 s sul telefono.
- Caricare a pezzi le parti pesanti (fumetto, disegni, classifica, piazza).
- Animazioni leggere (transform/opacity), niente lavoro con l'app in background.
- Prova di prestazioni (`t_perf.py`) confrontata prima/dopo nella PR.
- **Nota di Alessandro (9/11):** l'app è lenta all'apertura.
- **Nota di Alessandro (9/11, anteprima Fase 3a):** la **casa 1** resta sempre generica (disegno e potenziamenti; i potenziamenti si sistemano dopo qualche secondo, il disegno no). Probabile causa: in OpenStreetMap non c'è un edificio entro 60 m dal punto salvato, o la risposta di Overpass non arriva. Da verificare con paese/via e posizione del segnaposto.
- **Controllo sul telefono dopo la Fase 1 (9/11):** la casa 2 resta stilizzata (disegno generico), la casa 3 impiega molto ad apparire: stessa causa (forma da Overpass).
- **Nota di Alessandro (9/11):** a volte la casa è il disegno generico (mattoni, garage, auto) invece dell'edificio vero: la forma arriva da Overpass (lento) ed è salvata solo nella memoria del browser. Salvare la forma dell'edificio **una volta sul server (Supabase) per tutti**, e usare Overpass solo se manca (servirà un blocco SQL in `supabase/migrazioni/`).

## Fase 8 — Prove automatiche su GitHub
- GitHub Actions: a ogni pull request build + prove principali; risultato visibile nella PR.
- **8 fatta:** `.github/workflows/prove.yml`, due lavori a ogni pull request verso main e a ogni modifica di main: **App** (`prove.sh` + t_case, t_map, t_menu, t_reale; controllo che `dist/` nel commit sia ricostruita dai sorgenti; schermate allegate se qualcosa fallisce) e **Database** (file SQL e migrazioni sul Postgres di prova senza errori, `impronte_attese.txt` aggiornato, `prova_formule.js` → FORMULE UGUALI).

## Fase 9 — Funzioni nuove già decise
- Ordine deciso da Alessandro (11/11): **9-0** ricerca di un luogo in tutto il mondo sulla mappa · **9a** pannello del negozio e primi sponsor · **9b** presidi veri condivisi · poi considerazioni su come "confezionare il prodotto" prima degli store.
- **9-0:** pulsante **🔎 Cerca un luogo** sulla mappa (`cercaLuogo` in p65): ricerca in tutto il mondo (Nominatim, prima era solo Italia ed era nascosta nel menu ⋯), la mappa ci vola sopra; ultime 5 ricerche e "Torna a casa mia". Comprare lontano funzionava già lato server (prezzo = 200 + 10 ogni 50 km da casa, +10% per casa posseduta, max 9.000).
- Presidi veri condivisi (luoghi pubblici da OpenStreetMap; le orde li attaccano; chi li tiene dà +3 di difesa alle case entro 500 m).
- Pannello del negozio e primi sponsor veri.
- Pubblicazione negli store (Google Play, poi App Store).

## Fase 10 — Realtà aumentata "Lente ZombieSafeHouse"
**10A — nella PWA (fattibile ora, su iPhone e Android):**
- Fotocamera a schermo intero (getUserMedia) con **filtro fumetto in tempo reale** (shader WebGL: contorni neri spessi, colori a tinte piatte, retino a puntini, palette ZombieSafeHouse): tutto quello che inquadri diventa fumetto.
- **Etichette in realtà aumentata con GPS + bussola** (DeviceOrientation, con permesso iOS): sopra gli edifici inquadrati le tue case, quelle degli alleati, gli sponsor, i presidi; per i superstiti che hanno scelto "Tutti" nome, livello e Punteggio Superstite; per le case degli altri solo "🏠 Casa abitata". Precisione: GPS 5–20 m, bussola 10–20° → etichette "fluttuanti", non incollate al muro.
- Zombie a fumetto che camminano nell'inquadratura all'ora dell'orda.
- Privacy: nessuna informazione su chi abita in una casa se non ha scelto "Tutti"; niente foto salvate o inviate; tutto elaborato sul telefono.
**10B — nell'app degli store:**
- ARKit / ARCore con ancore geospaziali (la Geospatial API di ARCore funziona anche su iPhone): case a fumetto 3D allineate agli edifici veri, fortificazioni sopra la casa reale inquadrata, zombie che escono dagli angoli delle strade.

---

## Stato
| Fase | Stato | PR | Note |
|---|---|---|---|
| 1 | fatta | #1, #2 | sorgenti alla radice, netlify.toml → dist/ (con controllo che dist/ sia completa), build.sh e prove senza percorsi fissi, prove.sh |
| 2 | fatta | #3 | docs/MAPPA_CODICE.md, strumenti in docs/strumenti/ |
| 3 | fatta: 3a (#4), 3b-1 (#5), 3b-2 (#6), 3c (#7), 3d (#8) | #4–#8 | app pubblicata da 1.336 KB a 1.037 KB (−22 %): 3a codice morto; 3b-1 Orda pulita (p63); 3b-2 tolti 7 moduli del vecchio gioco, p5_game da 145 a 15 KB, circa 30 strati che li avvolgevano e 34 funzioni rimaste orfane. 3c: "Come si gioca" e istruzioni riscritte per il gioco di oggi. Restano p4b e p5j_giorno (Fase 4) |
| 4 | fatta: 4a–4f-2 (#9–#18) | #9–#18 | 4f-2: un solo timer di sistema al posto di 28 (p1z_orologio.js, zEvery), tolto un contatore sponsor doppio. 4f-1: navigazione go (base + 8 strati), accesso, salvataggi, finestre e analisi della zona definiti una volta in p68. 4e: menu ☰ (zmDo base + 5 strati), barre e istruzioni (manualHTML base + 5) definiti una volta in p67; tolto il vecchio menu a tendina di p10. 4d: socPaint (base + 10 strati) e altre 11 funzioni dei Superstiti definite una volta in p66. 4c: liveMap (base + 9 strati) e altre 6 funzioni della mappa definite una volta in p65. 4b: 14 funzioni dell'Orda definite una volta in p63 (prima base + 1–3 strati), tolte le catene morte del vecchio hub. 4a: houseSheet unica in p64_casa.js, la pagina compare una volta sola già completa; "La mia casa" dalla homepage aspetta i dati invece di aprire la pagina vecchia |
| 5 | fatta: 5a–5e (#19–#23) | #19–#23 | 5e: premio inviti uguale ovunque, prossimo passo e giro guidato aggiornati. 5d: "Aggiorno l'app…" e ricarica anche quando l'app torna dallo sfondo. 5c: pulsanti ‹ Menu e ‹ Le mie case, link d'invito al sito vero. 5b: elenco Le mie case, piano e valutazione nella pagina della casa vera. 5a: via monete, notti, battaglia e "Difendi tu" dai testi ancora visibili; premi mostrati in 🧱 |
| 6 | fatta: 6a–6d (#24–#26; migrazioni 001 e 002 eseguite) | #24–#26 | 6d: funzioni Edge con istruzioni, controllo notifiche. 6c: una sola % di tenere, migrazione 002, docs/FORMULE.md. 6b: migrazione 001 (7 funzioni mancanti, 3 tolte). 6a: schema.sql ricostruito, inventario, controllo di sola lettura |
| 7 | fatta: 7a–7c (#27–#29; migrazione 003 eseguita) | #27–#29 | 7c: compressione, stile pulito, caratteri non bloccanti, copia salvata se la rete tarda |
| 8 | fatta | #30 | .github/workflows/prove.yml: App + Database |
| 9 | 9-0 (cerca un luogo) in attesa di Merge | Fase 9-0 — Cerca un luogo nel mondo | poi 9a negozio, 9b presidi |
| 10 | da fare | | |
