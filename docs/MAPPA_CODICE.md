# Mappa del codice — Fase 2

Rapporto senza modifiche all'app. Fotografia della versione **zsh-202611091545** (9/11/2026).
Serve a preparare la Fase 3 (via il vecchio gioco) e la Fase 4 (una funzione per ogni cosa).

## Come è stata fatta
- **Lettura del codice** (strumento `acorn`): per ogni modulo le funzioni definite, quelle che **avvolge** (`const _x=f; f=function(){… _x() …}`) e quelle che **sostituisce** del tutto (`f=function(){…}` senza richiamare la vecchia), e in quali altri moduli ogni nome compare.
- **Giro dell'app con la copertura di Chromium**: app aperta col server finto (`sb_mock.js`) su iPhone 13, visitate le 4 schede e le sottoschede, premuti **207 pulsanti** (anche dentro le finestre aperte) e tutte le voci del menu ☰. Per ogni funzione: eseguita sì/no.
- Strumenti e istruzioni per rifare le misure: `docs/strumenti/`.

**Limiti.** "Mai eseguita nel giro" non vuol dire per forza "morta": il giro non vede il Supabase vero, l'accesso, l'uscita dall'account, gli inviti, le notifiche, i dati veri degli edifici (Overpass) e le finestre aperte a più livelli di profondità. Prima di togliere qualcosa (Fase 3–4) va sempre controllato a mano. I riferimenti tra moduli sono contati per nome: qualche nome corto (es. `busy`) può essere contato anche dove è solo una parola uguale.

## In breve
| | |
|---|---|
| Moduli nella build | **75** (p1_head + 74 script), 1,27 MB di sorgenti |
| Moduli fuori dalla build ma ancora nel repo | 4 (`p3a.js`, `p3b.js`, `p3c.js`, `p11_guida.js`), 46 KB |
| Funzioni globali con nome | 753, di cui **402 eseguite** nel giro (53 %) |
| Funzioni avvolte o sostituite da moduli successivi | **124**; 22 con 3 o più strati |
| Vecchio gioco a carte/notti (p4b, p5_game … p5k) | 13 moduli, **279 KB**; ancora eseguito in parte, perché la scheda Orda lo disegna e poi lo nasconde |
| Timer (`setInterval`) sparsi nei moduli | **37** in 27 moduli |

## 1. I moduli (nell'ordine della build)

**Stato**: *vivo* = la maggior parte delle sue funzioni è stata eseguita; *usato poco nel giro* = meno di un terzo; *mai eseguito nel giro* = nessuna funzione eseguita (vedi limiti); *vecchio gioco* = codice del gioco a carte/notti. Nella colonna "Avvolge" l'asterisco indica una **sostituzione** completa.

| Modulo | KB | Cosa fa | Avvolge (sostituisce*) | Funzioni eseguite | Stato |
|---|---:|---|---|---:|---|
| p1_head.html | 161.7 | Stile (CSS) e intestazione della pagina | — | — | stile |
| p2_data.js | 20.0 | Dati e calcoli di base: rischio, punteggio della casa, analisi della zona, IA (askAI) | — | 5/12 | vivo |
| p2b_audio.js | 11.1 | AUDIO: musica generata dal telefono (nessun file) + effetti | — | 16/24 | vivo |
| p3_art.js | 48.4 | Disegni a fumetto: zombie, eroe, scene, logo (SVG) | — | 13/24 | vivo |
| p3b_community.js | 6.0 | COMMUNITY E SPONSOR SULLA MAPPA REALE | — | 2/10 | usato poco nel giro |
| p4_app.js | 47.0 | Ossatura dell’app: navigazione (go), Home, Valuta, Mappa, Gioco di base | — | 7/34 | usato poco nel giro |
| p4b_tavole.js | 12.4 | SIMULA: LE TAVOLE DELLA NOTTE 9 fasi dell'assedio, ognuna con due versioni (tiene / cede)… | — | 0/7 | **vecchio gioco, mai eseguito** |
| p5_game.js | 144.9 | TAB ORDA — gioco a ondate (separato da valutazione e mappa) | — | 25/50 | vecchio gioco, in parte usato |
| p5b_luck.js | 10.2 | FORTUNA: ruota, gratta e vinci, barattolo di quartiere Regole: biglietti solo giocando (mai… | — | 7/8 | vecchio gioco, in parte usato |
| p5c_daily.js | 3.8 | PREMI GIORNALIERI E MISSIONI (per far tornare ogni giorno) | — | 4/5 | vecchio gioco, in parte usato |
| p5d_viatico.js | 4.3 | VIATICO: la valutazione vera della casa dà un vantaggio in Orda | — | 3/3 | vecchio gioco, in parte usato |
| p5e_sfide.js | 11.5 | CREDITI CASA VERA + SFIDE TRA PROPRIETÀ (asincrone) | — | 5/11 | vecchio gioco, in parte usato |
| p5f_arena.js | 54.1 | ARENA: case personalizzabili, sfida 1 contro 1 giocabile, Coppa del Quartiere settimanale… | — | 5/31 | vecchio gioco, in parte usato |
| p5g_terreno.js | 7.8 | TERRENO DEL QUARTIERE (salite, discese, alture, zone basse) e QUARTIERE VERO generato dalla… | buildSites, hoodSVG | 3/7 | vecchio gioco, in parte usato |
| p5h_presidi.js | 4.7 | PRESIDI DI ZONA (livello condiviso) + RECENSIONI OVUNQUE | — | 1/9 | vecchio gioco, in parte usato |
| p5i_hoods.js | 6.9 | QUARTIERI CONDIVISI | lotSheet | 5/7 | vecchio gioco, in parte usato |
| p5j_campagna.js | 3.1 | CAMPAGNA "LE NOTTI DELL'ASSEDIO": progressione chiara del gioco capitoli da 5 notti, stelle… | — | 2/2 | vecchio gioco, in parte usato |
| p5k_guida.js | 8.2 | ISTRUZIONI DEL GIOCO: "Come si gioca" + tutorial guidato | — | 0/5 | **vecchio gioco, mai eseguito** |
| p5j_giorno.js | 7.2 | ORDA · GIORNO E NOTTE Giorno: spedizioni con la tua squadra (tempo reale) → materiali… | — | 3/7 | vecchio gioco, in parte usato |
| p7_vivere.js | 19.2 | ZONE > VIVERE QUI — dati di zona per chi cerca casa Produzione: negozi e servizi da Google… | — | 0/11 | **mai eseguito nel giro** |
| p7b_reviews.js | 11.5 | RECENSIONI (stile TripAdvisor) per attività e vacanze Produzione: tabella reviews su… | — | 1/12 | usato poco nel giro |
| p9_contatti.js | 10.0 | CHI SIAMO E CONTATTI COMPANY: dati societari da completare prima della pubblicazione | — | 3/3 | vivo |
| p10_menu.js | 9.2 | BARRA SUPERIORE, MENU, ACCESSO, SPONSOR, CONTATORE UTENTI | — | 5/8 | vivo |
| p12_mondo.js | 22.7 | MONDO REALE A FUMETTO | — | 2/11 | usato poco nel giro |
| p13_ponte.js | 5.8 | IL PONTE SEMPLICE: lo Scudo della casa vera tutto ciò che fai nel mondo vero alza lo Scudo;… | — | 2/6 | usato poco nel giro |
| p14_attivita.js | 9.5 | MAPPA DELLE ATTIVITÀ INTERATTIVA + SCHEDA SPONSOR CHE VENDE | scudoSteps, sponsorSheet* | 2/10 | usato poco nel giro |
| p15_simquart.js | 18.9 | SIMULAZIONE: DALLA CASA SINGOLA AL QUARTIERE | renderGioco | 1/13 | usato poco nel giro |
| p16_accompagna.js | 13.4 | L'ACCOMPAGNATORE: guida passo passo per chi non è pratico | — | 0/6 | **mai eseguito nel giro** |
| p17_cloud.js | 9.0 | APP VERA: login Supabase, salvataggio, posizione reale | loginSheet | 6/13 | vivo |
| p18_live.js | 4.9 | DATI VERI: sponsor dal database, mappa vera in Valuta e nella simulazione del quartiere,… | vZona, renderSimQuart, qCells | 1/2 | vivo |
| p19_livemap.js | 29.8 | MAPPA A FUMETTO COMPLETA (strada A, gratuita) | rmMount, renderSimQuart, qSiege | 7/11 | vivo |
| p20_territorio.js | 160.3 | TERRITORIO VERO | analyzeZone, zoneCard, terrainAt, hills, houseMaxHP, barrierMax, dayInit, renderHub, splitHub, terrSummary, custHouseSVG, renderPick, bzCard, bizSheet, lmPoi, hoodSVG, snapshot, restore, liveMap, onLogin, commCells, renderMenu, terrPanelHTML, vZona, couponFor, habOf, vDomande, vFoto, vRisultato, askAI, fillOnline, zSyncProfile, doMove, renderValuta, zPlace, rvList, rvBtn, zStruct, renderVivere, hqBack, bizSheet*, lmPoi*, openRules*, rvGen*, rvLine*, rvBtn*, renderVivere* | 59/102 | vivo |
| p21_mondo.js | 22.6 | MONDO UNICO (fase 2) | splitHub, liveMap, renderHub, lotSheet, hqBack, tmEvent, onLogin, analyzeZone, vZona, manualHTML | 14/17 | vivo |
| p22_orda.js | 18.2 | L'ORDA DEL MONDO (semplice da usare, stesso concetto) | go, splitHub, liveMap, renderMenu, renderHub, manualHTML | 13/19 | vivo |
| p23_v3.js | 20.3 | MONDO v3 — semplice e unico | wSheet, wDrawMap, orView, splitHub, orPanelHTML, manualHTML, renderHome* | 11/13 | vivo |
| p24_alleati.js | 9.4 | ALLEATI: REGALI E PRESTITI + PREMI E FORTUNA IN PRIMO PIANO | wMine, alHTML, alBind, splitHub, manualHTML | 5/8 | vivo |
| p25_struttura.js | 16.2 | NUOVA STRUTTURA: 4 schede, un solo scopo ciascuna 🏠 Casa (casa vera + valutazione) 🗺️… | go, renderHome, splitHub, orPutBanner, renderNav*, renderMappa* | 4/7 | vivo |
| p26_social.js | 19.5 | 👥 SUPERSTITI: il social al centro bacheca · per te · squadra · classifiche · scheda… | go, renderHome, liveMap, renderMappa, renderNav* | 13/16 | vivo |
| p27_piazza.js | 10.6 | 💬 PIAZZA: la chat della community (Zona · Mondo) + accesso sempre chiaro, avatar… | renderSocial, socPaint, socFetchTab, onLogin, renderHome | 6/8 | vivo |
| p28_menu.js | 8.0 | BARRA IN ALTO + MENU A TENDINA (come nelle app moderne) logo · contatore · 🔔 novità · ☰… | renderNav, ioBtn* | 4/7 | vivo |
| p29_assalto.js | 12.6 | 🎬 REGIA DEGLI ASSALTI + 🔮 SIMULAZIONE + 🔔 NOTIFICHE | orView, go, splitHub, ssOf, renderMappa, zmItems, zmDo | 7/17 | vivo |
| p30_fumetto.js | 13.1 | 📖 L'ORDA A FUMETTO (stile manga/anime, disegnata in vettoriale) 4 vignette: la notte ·… | assalto | 7/7 | vivo |
| p31_mondo2.js | 13.8 | HOMEPAGE A DISEGNO + LE TUE CASE NEL MONDO + SCHEDA DELLA CASA | go, renderHome, renderMappa, wSheet, zmDo | 4/6 | vivo |
| p32_semplice.js | 5.3 | SEMPLIFICAZIONE: ogni cosa in un posto solo 🏠 Home → 🌍 Mondo (case, scheda casa, sponsor)… | renderHome, ssOf, splitHub, orRefresh, socPaint, mfMore, zmDo, manualHTML, zmItems* | 1/1 | vivo |
| p33_fix.js | 3.4 | CORREZIONI dalle foto 1) pulsante audio 🔊/🔇 sempre visibile in alto 2) "Acquista" → "🧱… | zTopbar, houseSheet, shopSheet, socLine | 2/2 | vivo |
| p34_oggi.js | 8.4 | 📅 OGGI: data vera, ora che scorre, meteo adesso e all'ora dell'orda, effetto sul gioco,… | ssOf, splitHub, zmItems, zmDo | 5/7 | vivo |
| p35_spdemo.js | 3.0 | SPONSOR DI ESEMPIO SULLA MAPPA (come prima) Finché nel database non ci sono sponsor veri… | liveMap | 2/2 | vivo |
| p36_rivali.js | 14.4 | 1) ATTIVITÀ VERE DELLA ZONA (20 km) al posto degli sponsor di esempio mostrate come… | liveMap, houseSheet, renderSocial, socPaint, socFetchTab, playerSheet, socLine, spDemoPlace*, spList* | 4/6 | vivo |
| p37_equita.js | 7.3 | EQUITÀ DEL MONDO UNICO (le regole stanno sul server, qui si mostrano) 1 Kit di benvenuto 2… | renderHome, wMine, socPaint, houseSheet, wSheet, inviteSheet | 6/7 | vivo |
| p38_oggifix.js | 5.2 | ORDA → OGGI: ogni pulsante fa qualcosa, ogni cosa in un posto solo | ssOf, splitHub, tmBind, luckTopBind* | 2/3 | vivo |
| p39_fronte.js | 17.2 | 🗺️ IL FRONTE + SCHEDA ORDA UNICA | ssApply, splitHub, zmDo, zmItems | 14/16 | vivo |
| p40_simulato.js | 4.7 | ORDA TUTTA SIMULATA: niente "Difendi tu" (notti, battaglia, campagna, attrezzi) Scheda Orda… | ordaUnify, tmInit, assalto, frZSheet, tmBind, luckTopBind, zmItems, oggiPut* | 2/2 | vivo |
| p41_case.js | 11.1 | CASE DISEGNATE DIVERSE | go, houseSheet, mhBar | 4/6 | vivo |
| p42_reale.js | 24.4 | CASE VERE A FUMETTO Pianta reale, piani, tetto e colori da OpenStreetMap, vicini veri… | casaTop, houseSheet | 2/9 | usato poco nel giro |
| p43_squadra.js | 8.5 | ALLEANZE 2: coinquilini, scudo per un alleato (20 💎), difesa di squadra, doni anche di… | socPaint, ayRefresh, playerSheet, socLine, ayInbox*, aySheet* | 7/7 | vivo |
| p44_guida.js | 11.7 | 1) La casa vera conta nell'orda: Scudo 0–5 → +2 difesa a tutte le case per livello 2) Conto… | houseSheet, frHeader, regSimRows, renderHome, splitHub, wMine, orLoad, ssOf, scudoBar*, openScudo* | 11/11 | vivo |
| p45_alleanza.js | 6.3 | 1) la nota "Padrino" va dentro la finestra (non resta più a schermo) + pulizia di qualunque… | closeSheet, openSheet, playerSheet, socPaint, eqPad* | 4/6 | vivo |
| p46_fronte2.js | 9.7 | IL FRONTE SU TUTTE LE TUE CASE | defLoad, frMount*, frLoop* | 5/7 | vivo |
| p47_zombie.js | 12.8 | ZOMBIE SPECIALI, METEO E TERRENO VERI, DIFESE MIRATE, SIMULATORE Stessa formula del server… | frChanceOf, houseSheet, frComp, frWx, frHeader, defLoad, whySheet | 5/7 | vivo |
| p48_alleati.js | 10.1 | ALLEATI: simulazione delle loro case, elenco con lo stato per la prossima orda, aiuti… | renderSocial, socPaint, ssOf, splitHub, playerSheet | 11/13 | vivo |
| p49_assedio.js | 16.2 | 1) La mia casa: TUTTE le case come la casa vera (edificio vero a fumetto, difese e meteo… | go, drawHouse, wRpc, fumetto, liveMap, playerSheet, socPaint, socLine, sponsorSheet | 7/13 | vivo |
| p50_fortezze.js | 6.6 | FORTIFICAZIONI CON UN TOCCO | casaAll, houseSheet, zmOpen | 4/6 | vivo |
| p51_logout.js | 1.7 | USCITA DALL'ACCOUNT CHE FUNZIONA Prima: si ricaricava la pagina senza aspettare la chiusura… | — | 0/1 | **mai eseguito nel giro** |
| p52_mattoni.js | 3.6 | VIA LE MONETE: tutti i premi sono in 🧱 Mattoni (accreditati dal server, tetto 300 al giorno) | wMine, openSheet, go, zmOpen | 4/4 | vivo |
| p53_casapagina.js | 5.0 | UNA SOLA PAGINA PER OGNI CASA (a schermo intero) Homepage "La mia casa", Mappa, Orda… | houseSheet, closeSheet, renderHome, casaAll | 1/1 | vivo |
| p54_account.js | 3.9 | ACCOUNT SEPARATI SULLO STESSO TELEFONO + CHI VIVE NELLA MIA CASA | saveLocal, pushCloud, onLogin, zLogout, houseSheet | 1/2 | vivo |
| p55_abitazione.js | 10.4 | TIPI DI ABITAZIONE (pagina della casa vera → "🏘️ La tua abitazione") 🏠 casa (anche… | houseSheet, socLine | 4/5 | vivo |
| p56_stato.js | 7.4 | PERCHÉ UN AMICO VEDE MENO COSE: controllo, versione nuova, browser di WhatsApp | zmOpen | 3/7 | vivo |
| p57_benvenuto.js | 5.7 | PAGINA DI BENVENUTO PER CHI ARRIVA DA UN INVITO Riconosce il telefono e mostra i passi giusti: | — | 0/5 | **mai eseguito nel giro** |
| p58_abitata.js | 2.4 | CASA ABITATA DA ALTRI: niente "Casa libera · Prezzo", ma chi ci abita (se è alleato o… | wSheet | — | vivo |
| p59_zscheda.js | 2.2 | SCHEDA DELLO ZOMBIE (pulsanti sotto il fronte e zombie in marcia): in più "Su questa casa":… | frZSheet | — | vivo |
| p60_classifica.js | 7.5 | CLASSIFICA CON PUNTEGGIO SUPERSTITE (su 1000) + SCHEDA ZOMBIE ANCHE PER GLI ALLEATI | socPaint, eqRankPaint, thrView, allySheet, frZSheet, thrOf* | 4/4 | vivo |
| p61_notte.js | 2.4 | NOTTE AUTOMATICA SU TUTTE LE MAPPE, con il tramonto vero del posto (calcolo astronomico per… | liveMap | 2/2 | vivo |
| p62_legenda.js | 3.8 | "🔎 Sul disegno": sotto ogni casa l'elenco delle modifiche DAVVERO disegnate + finestre… | drawHouse, houseSheet, mhBar | 2/2 | vivo |
| p6_boot.js | 0.4 | Avvio dell’app (ultimo modulo) | — | — | avvio |
| p11_guida.js | 8.7 | GUIDA E ORIENTAMENTO (non cambia le funzioni, le rende chiare) - home: "Cosa vuo… | — | — | **fuori dalla build** |
| p3a.js | 7.8 | vecchia arte a fumetto (versione precedente di p3_art) | — | — | **fuori dalla build** |
| p3b.js | 28.5 | vecchia arte a fumetto (versione precedente di p3_art) | — | — | **fuori dalla build** |
| p3c.js | 1.2 | vecchia arte a fumetto (versione precedente di p3_art) | — | — | **fuori dalla build** |

Note sulla tabella:
- `p51_logout`, `p57_benvenuto`: non eseguiti solo perché il giro **evita** l'uscita dall'account e non arriva da un invito. Sono vivi.
- `p42_reale` (case vere a fumetto): `realHouseSVG` non è stato eseguito perché il server finto non dà la forma dell'edificio. È lo stesso meccanismo della nota di Alessandro "a volte la casa è il disegno generico" (Fase 7).
- `p7_vivere` ("Vivere qui"): la sua `renderVivere` è sostituita per intero da `p20_territorio`.
- `p16_accompagna` (pulsante "🙋 Aiuto" e guida passo passo): non compare più nelle schede di oggi → da decidere in Fase 3/5 se toglierlo o rimetterlo.

## 2. Le catene di avvolgimenti

Ogni riga è uno strato, nell'ordine in cui viene caricato. L'ultimo strato è quello chiamato per primo: richiama il precedente, poi aggiunge il suo pezzo.

### splitHub — scheda Orda (base in `p5f_arena`, 14 strati)
1. `p5f_arena` base: divide il vecchio hub del gioco in gruppi (quartiere, arena…).
2. `p20_territorio`: aggiunge il pannello del territorio vero.
3. `p21_mondo`: aggiunge il pannello del mondo unico (le tue case, Mattoni).
4. `p22_orda`: aggiunge il pannello dell'orda del mondo (9:00 e 21:00) e il banner.
5. `p23_v3`: toglie le schede con giocatori finti (amici, arena), aggiunge gli alleati veri.
6. `p24_alleati`: aggiunge "Premi e fortuna" (ruota, gratta e vinci).
7. `p25_struttura`: crea le sottoschede Oggi · Impero · Difendi tu.
8. `p29_assalto`: aggiunge la scheda "🎬 Gli assalti" e le notifiche.
9. `p32_semplice`: toglie "Impero", porta tutto in un riquadro.
10. `p34_oggi`: aggiunge data, ora e meteo (Oggi).
11. `p38_oggifix`: missioni del giorno che portano davvero dove si fanno.
12. `p39_fronte`: unifica la scheda Orda attorno al **Fronte** (mappa con l'orda).
13. `p44_guida`: aggiunge "🧭 Il tuo prossimo passo".
14. `p48_alleati`: aggiunge lo stato degli alleati alla prossima orda.

Insieme a `ssOf` (7 strati: decide in quale sottoscheda va ogni riquadro) e `renderHub` (4 strati, base in `p5_game`). **Effetto:** ogni volta che si apre l'Orda, l'app disegna prima il vecchio hub del gioco a carte, poi 13 strati aggiungono, spostano e **nascondono** pezzi.

### houseSheet — pagina della casa (base in `p31_mondo2`, 13 strati)
1. `p31_mondo2` base: finestra della casa (cosa fare, Mattoni).
2. `p33_fix`: "🧱 Più Mattoni" e spiegazione.
3. `p36_rivali`: lavori veri della zona (attività entro 50 km).
4. `p37_equita`: spinta di recupero, scudo da nuovo arrivato.
5. `p41_case`: disegno della casa (tipo di edificio dalla mappa).
6. `p42_reale`: sostituisce il disegno con la **casa vera** a fumetto (forma da OpenStreetMap).
7. `p44_guida`: % di tenuta e "🧮 Perché".
8. `p47_zombie`: "🧟 Chi arriva su questa casa".
9. `p50_fortezze`: "🎯 Fortificazioni consigliate" comprabili.
10. `p53_casapagina`: trasforma la finestra in **pagina intera**, fila delle case in cima.
11. `p54_account`: "🏢 Chi vive qui".
12. `p55_abitazione`: "🏘️ La tua abitazione".
13. `p62_legenda`: "🔎 Sul disegno" (elenco delle modifiche disegnate).

### renderHome — pagina iniziale (10 strati, base in `p4_app`)
- `p4_app` base → **sostituita per intero** da `p23_v3` (la base di p4 non viene più eseguita).
- `p25_struttura`, `p26_social`, `p27_piazza` aggiungono valutazione, novità dei superstiti, avviso "non sei collegato".
- `p31_mondo2`: la catena fin qui viene **rinominata `renderCasaDash`** e diventa la scheda "La mia casa"; `renderHome` riparte da zero con la homepage a disegno.
- `p32_semplice`, `p37_equita`, `p44_guida`, `p53_casapagina` avvolgono la nuova homepage.

Quindi oggi "La mia casa" (`renderCasaDash`) e la homepage (`renderHome`) sono due pagine diverse costruite con pezzi in comune: è il doppione da togliere in Fase 5 ("una sola pagina per casa").

### Altre catene lunghe
- **socPaint** (scheda Superstiti, 10 strati, base `p26_social`): Piazza (`p27`), squadra con alleati (`p32`), rivali (`p36`), scudo dei nuovi (`p37`), bonus di squadra (`p43`), "Aggiungi alla squadra" (`p45`), alleati alla prossima orda (`p48`), messaggi privati (`p49`), Punteggio Superstite (`p60`).
- **go** (cambio scheda, 9 strati, base `p4_app`): banner dell'orda (`p22`), scheda Io (`p25`), scheda Superstiti (`p26`), regia assalti (`p29`), scheda Casa (`p31`), disegno della casa (`p41`), "La mia casa" con tutte le case (`p49`), testo Mattoni (`p52`).
- **liveMap** (mappa, 9 strati, base `p19_livemap`): utenti (`p20`), casa nel mondo (`p21`), pulsante Orda (`p22`), sponsor (`p26`), sponsor di esempio (`p35`), attività della zona (`p36`), effetti dell'assedio (`p49`), notte col tramonto vero (`p61`).
- **manualHTML** (istruzioni, 6 strati): ogni strato aggiunge un capitolo con un "cerca e sostituisci" sul testo.
- **socLine** (righe della bacheca, 6 strati): ogni strato aggiunge un tipo di evento (aiuto, dispetto, scudo, messaggio, richiesta di casa).
- **playerSheet** (scheda giocatore, 6 strati): dispetti, scudo, alleanza, simulazione dell'alleato, messaggio privato.
- **zmItems / zmDo** (menu ☰, 6 strati ciascuno): voci aggiunte, poi `p32_semplice` **riscrive tutto il menu** (gli strati di `p28` e `p29` su zmItems non servono più).
- **onLogin** (5), **wMine** (5), **wSheet** (5), **renderMappa** (5, base sostituita da `p25`), **renderNav** (4, sostituita due volte: `p25` e `p26`).

### Strati scavalcati (codice che non viene più eseguito)
Funzioni la cui versione di base (e gli strati prima) è stata **sostituita per intero** da un modulo successivo:

| Funzione | Versione morta in | Sostituita in |
|---|---|---|
| renderHome | p4_app | p23_v3 |
| renderMappa | p4_app | p25_struttura |
| renderNav | p4_app + p25_struttura | p26_social |
| zmItems | p28_menu + p29_assalto | p32_semplice |
| sponsorSheet | p3b_community | p14_attivita |
| bizSheet, lmPoi, openRules, renderVivere, rvGen, rvLine, rvBtn | p14, p19, p5k, p7, p7b, p5h | p20_territorio |
| scudoBar, openScudo | p13_ponte | p44_guida |
| ayInbox, aySheet | p24_alleati | p43_squadra |
| luckTopBind | p24_alleati | p38_oggifix |
| ioBtn | p26_social | p28_menu |
| spList, spDemoPlace | p26_social, p35_spdemo | p36_rivali |
| oggiPut | p34_oggi | p40_simulato |
| eqPad | p37_equita | p45_alleanza |
| frMount, frLoop | p39_fronte | p46_fronte2 |
| thrOf | p47_zombie | p60_classifica |

## 3. Le cause delle note di Alessandro

**"Nella pagina della casa compare prima la versione vecchia e poi quella nuova" (Fase 4).**
`houseSheet` apre la finestra di base e poi i 12 strati la modificano **uno dopo l'altro**, ognuno dopo un'attesa (`await`): disegno della casa, % di tenuta, zombie, fortificazioni, poi `p53` la trasforma in pagina intera, poi abitazione e legenda. Col server finto tutto avviene in 37 ms (misura `tempi.py`, 26 cambi della pagina); sul telefono ogni attesa è una chiamata in rete (Supabase, OpenStreetMap), quindi si vede la pagina **cambiare forma più volte**. Anche la scheda Orda fa lo stesso: disegna il vecchio hub e poi lo nasconde. Rimedio (Fase 4): una sola `houseSheet` che prima raccoglie i dati e poi disegna la pagina **una volta**, già nella forma finale.

**Controllo di Alessandro sull'anteprima della Fase 2 (9/11).**
- *"Aprendo le case c'è subito la versione vecchia dei potenziamenti, dopo qualche secondo quella nuova"*: la finestra di base (`p31_mondo2`) mostra "Cosa puoi fare → ⬆️ Potenzia al livello…"; `p50_fortezze` aggiunge 4 "Fortificazioni consigliate"; solo alla fine `p53_casapagina` le sostituisce con **tutte** le fortificazioni e sposta il riquadro sotto il disegno. In mezzo ci sono attese in rete (`thrLoad`, `defLoad`, tipo di edificio).
- *"Il pulsante 🏠 La mia casa della homepage me le fa vedere alla vecchia maniera"*: `p53` collega il pulsante alla pagina nuova **solo se** in quel momento `myHouses()` trova la casa (dati del mondo `W.m` già arrivati dal server e utente collegato). Se i dati non sono ancora arrivati, o se si entra da menu ☰ → "La mia casa", parte `go('casa')`, cioè la vecchia pagina "La mia casa" (`renderCasaDash` + `casaAll` di `p49`, schede `.mycasa2`). Sono le due pagine doppie della §2.
- *"Da Mappa o Orda la casa mia e la 2 vanno bene, la 1 no"*: da verificare con una foto. Possibile causa: `p58_abitata` apre la pagina nuova solo se riconosce la casa per codice dell'edificio o entro 120 m; altrimenti resta la vecchia scheda dell'edificio (`wSheet`).

**"A volte la casa è il disegno generico" e "l'app è lenta all'apertura" (Fase 7).**
`drawHouse`/`realHouseSVG` (`p42_reale`) usano la forma dell'edificio da Overpass; se non arriva, resta il disegno generico di `p41_case`. Sull'apertura pesano: 1,3 MB in un solo file, 279 KB di vecchio gioco ancora caricato ed eseguito in parte, 37 timer che girano sempre.

## 4. Codice morto e doppioni

1. **Fuori dalla build** (si possono togliere subito, non finiscono nell'app): `p3a.js`, `p3b.js`, `p3c.js` (vecchia versione dell'arte, sostituita da `p3_art.js`), `p11_guida.js` (vecchia guida). 46 KB.
2. **Strati scavalcati**: la tabella qui sopra (circa 25 funzioni).
3. **Funzioni mai nominate altrove** (definite e mai chiamate): `mTone` (p2b), `logoWordmark` (p3_art), `rvKeySp` (p5h), `rmTimeout` (p12), `accSay` (p16), `sbReady` (p17). Piccole (1 KB in tutto).
4. **Vecchio gioco** (Fase 3): `p4b_tavole` e `p5k_guida` mai eseguiti; `p5f_arena` 5 funzioni su 31; `p5_game` 25 su 50, quasi tutte solo per disegnare l'hub che poi viene nascosto.
5. **Mai eseguiti nel giro, da verificare**: `p7_vivere` ("Vivere qui", sostituita da p20), `p16_accompagna` (aiuto passo passo), gran parte di `p15_simquart` (simulazione del quartiere), `p12_mondo` (vecchio mondo a fumetto: oggi la mappa è `p19_livemap`), `p13_ponte` (scudo, sostituito da p44).
6. **Doppioni**:
   - due pagine per la casa: "La mia casa" (`renderCasaDash`) e la pagina della casa (`houseSheet`, a schermo intero da p53);
   - due disegni della casa: `houseArt` (p41) e `drawHouse` (p42);
   - menu ☰ costruito da `p28` e riscritto da `p32`;
   - istruzioni (`manualHTML`) cucite con "cerca e sostituisci" sul testo;
   - due guide: `p13_ponte` "Come funziona" e `p44_guida` "Il tuo prossimo passo" (più p5k e p16).

## 5. Cosa serve ancora del vecchio gioco (lista per la Fase 3)

Funzioni dei moduli p5*/p4b **usate dai moduli nuovi**, da spostare prima di togliere il resto:

| Cosa | Dove sta oggi | Usata da | Dove va (Fase 4) |
|---|---|---|---|
| `openSheet`, `closeSheet` (le finestre) | p5_game | quasi tutti | `comune/` |
| `G` (stato del gioco) | p5_game | quasi tutti | `comune/` (solo i campi ancora usati) |
| `sfx` (suoni) | p5_game | molti | `comune/` con p2b_audio |
| `ZT` (tipi di zombie) | p5_game | p39_fronte, p47_zombie | `orda/` |
| `BLD`, `LOTS`, `HTYPES`, `HOME_POS`, `SLOTS`, `TOOLS`, `HUP`, `DIFF`, `NEWTYPES`, `houseMaxHP`, `barrierMax`, `hoodSVG`, `renderPick`, `gHouse` | p5_game | p20_territorio (alcuni p15, p21, p7) | da controllare uno per uno: molti servono solo al vecchio quartiere |
| `renderHub`, `splitHub`, `renderOrda` | p5_game, p5f_arena | catena Orda | sostituite dalla nuova pagina Orda |
| ruota, gratta e vinci, barattolo (`luckInit`, `wheelSheet`, `scratchSheet`, `luckHTML`, `jarTotal`) | p5b_luck | p24, p38 | `orda/premi` |
| premio del giorno (`dailyState`, `dailyHTML`, `DAILY`) | p5c_daily | p22, p24, p38, p44 | `orda/premi` |
| `viatico` (vantaggio della casa vera) | p5d_viatico | p4_app, p13 | da verificare se serve ancora |
| `ccvInit` (crediti casa vera) | p5e_sfide | p12, p14, p20 | da verificare |
| `custHouseSVG`, `habOf`, `OGRP` | p5f_arena | p20, p23 | da verificare |
| `terrainAt`, `hills` | p5g_terreno | p20 | `mappa/` o via |
| `rvStarsTxt`, `rvBtn` (stelle recensioni) | p5h_presidi | p3b, p4, p7, p12, p14, p20 | `comune/` o via con le recensioni |
| `coach`, `openRules`, `rulesHTML`, `RULES_*` | p5k_guida | p13, p20, p23, p25, p28, p44 | `menu/` (guida unica) |
| `dayInit`, `EXPS` | p5j_giorno | p20 | via (spedizioni del vecchio gioco) |
| `zArt` (disegno zombie) | **p30_fumetto** (non p5) | fumetto, fronte | `orda/` |

## 6. Proposta di struttura (Fase 4)

Ogni area è una cartella con pochi file; `build.sh` li unisce in quest'ordine. Ogni funzione è definita **una volta**, niente più `const _x=f; f=function…`.

```
comune/      stato (S, G ridotto), finestre (openSheet/closeSheet), cloud e account (p17, p51, p54),
             Mattoni e premi dal server (p52), notifiche push (p29), formule condivise (thrCalc, p47),
             suoni (p2b + sfx), testi e stile, UN orologio centrale (sostituisce i 37 setInterval)
casa/        pagina della casa UNICA (houseSheet: p31+p33+p37+p41+p42+p44+p47+p50+p53+p54+p55+p62),
             disegno unico (houseArt + drawHouse), valutazione (p4_app Valuta, p2_data), abitazione, diario
mappa/       liveMap unica (p19+p20+p21+p22+p26+p35+p36+p49+p61), territorio vero (p20), case del mondo (p21, p58),
             sponsor e attività (p14, p26, p35, p36)
orda/        pagina Orda nuova (fronte p39+p46, orda del mondo p22, assedio a fumetto p30+p49, scheda zombie p47+p59,
             alleati per l'orda p48, premi: ruota/gratta/premio del giorno/missioni da p5b+p5c+p38)
superstiti/  Piazza (p27), messaggi privati (p49), bacheca (socLine unica), squadra e alleanze (p43, p45, p48),
             rivali (p36), classifica (p60), scheda giocatore (playerSheet unica)
menu/        menu ☰ (una sola zmItems/zmDo), controllo del gioco e versione (p56), uscita, benvenuto inviti (p57),
             istruzioni e guida unica (manualHTML scritto per intero, coach, "Il tuo prossimo passo")
```

## 7. Ordine dei lavori proposto
1. **Fase 3a** (piccola, sicura): togliere i 4 file fuori dalla build, le 6 funzioni mai nominate e gli strati scavalcati della tabella in §2. Prove: `./prove.sh`.
2. **Fase 3b**: spostare in un modulo `comune` le cose della §5 che servono ancora (finestre, `G`, `sfx`, `ZT`, premi), poi togliere p4b, p5_game, p5d–p5k e la catena `splitHub`/`renderHub`, sostituite da una pagina Orda pulita.
3. **Fase 4**, un'area per pull request, in quest'ordine: `casa/` (risolve la nota "versione vecchia poi nuova") → `orda/` → `mappa/` → `superstiti/` → `menu/` → `comune/` con l'orologio unico. Dopo ogni area: `./prove.sh` + le prove della zona + controllo sul telefono.
4. **Fase 5–7** come da road map; in Fase 7 anche la forma degli edifici salvata su Supabase.
