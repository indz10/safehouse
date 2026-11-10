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
- **Da sistemare (visto in 4d):** la finestra "📨 Invita amici" dice ancora "nella battaglia la tua abilità…" (vecchio gioco); testo in `inviteSheetBase` (p20).
- **Da sistemare (visto in 4c):** la scheda dei servizi (farmacia, ospedale, vigili…) dice ancora "Nel gioco: … resistenza casa +5%": è un bonus del vecchio gioco che non esiste più (testo in `lmPoiBase`, p20).
- Ogni schermata risponde a: dove sono, cosa vedo, cosa posso fare ora.
- Una sola pagina per casa: togliere i doppioni in La mia casa.
- Testi brevi, stessi nomi ovunque (Mattoni, gemme, fortificazioni, livello, Punteggio Superstite).
- Guida/aiuto e "Il tuo prossimo passo" aggiornati alle funzioni vere.
- Coerenza grafica (pulsanti, schede, colori, icone).
**Controllo:** Alessandro e un tester nuovo provano senza spiegazioni.

## Fase 6 — Database in ordine
- `supabase/schema.sql`: lo stato attuale completo (tabelle, funzioni, permessi) ricostruito dai 30 file.
- `supabase/migrazioni/`: da ora ogni cambio è un file numerato.
- Elenco delle funzioni SQL non più usate dall'app e blocco per toglierle.
- Formule (attacco, difesa, fortificazioni, punteggio) documentate in un posto e identiche tra SQL e app.
- Funzione Edge `zsh-push` nel repo con istruzioni di pubblicazione.
**Controllo:** Alessandro esegue i blocchi indicati; l'app funziona come prima.

## Fase 7 — Velocità e peso
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

## Fase 9 — Funzioni nuove già decise
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
| 4 | 4a–4f-1 fatte (#9–#17); 4f-2 (orologio unico) in attesa di Merge | #9–#17, Fase 4f-2 — Orologio unico | 4f-2: un solo timer di sistema al posto di 28 (p1z_orologio.js, zEvery), tolto un contatore sponsor doppio. 4f-1: navigazione go (base + 8 strati), accesso, salvataggi, finestre e analisi della zona definiti una volta in p68. 4e: menu ☰ (zmDo base + 5 strati), barre e istruzioni (manualHTML base + 5) definiti una volta in p67; tolto il vecchio menu a tendina di p10. 4d: socPaint (base + 10 strati) e altre 11 funzioni dei Superstiti definite una volta in p66. 4c: liveMap (base + 9 strati) e altre 6 funzioni della mappa definite una volta in p65. 4b: 14 funzioni dell'Orda definite una volta in p63 (prima base + 1–3 strati), tolte le catene morte del vecchio hub. 4a: houseSheet unica in p64_casa.js, la pagina compare una volta sola già completa; "La mia casa" dalla homepage aspetta i dati invece di aprire la pagina vecchia |
| 5 | da fare | | |
| 6 | da fare | | |
| 7 | da fare | | |
| 8 | da fare | | |
| 9 | da fare | | |
| 10 | da fare | | |
