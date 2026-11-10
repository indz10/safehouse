# ZombieSafeHouse — riepilogo per continuare in una nuova conversazione
Aggiornato: 26 ottobre 2026 · Titolare: Alessandro (INDZ) · ZombieSafeHouse è un marchio INDZ

## 1. Cos'è
PWA (un solo `index.html`) che valuta la sicurezza della casa vera e la trasforma in un gioco a fumetto a tema zombie **sul territorio vero**. Regola: quello che fai per la casa vera ti rende più forte nel gioco. Navigazione: Casa · Valuta · Gioco · Mondo (+ menu ☰).

## 2. Account e indirizzi
| Servizio | Riferimento |
|---|---|
| Sito | https://safehousezombie.netlify.app |
| Pannello INDZ (admin) | /admin.html — sponsor, account negozio, segnalazioni, attività nascoste |
| Pannello negozio | /negozio.html — valida codici, statistiche, preventivi |
| Pagine legali | /privacy.html · /termini.html · /elimina-account.html (BOZZE da far verificare) |
| GitHub | indz10/safehouse (Add file → Upload files → Commit) |
| Netlify | sito safehousezombie, pubblica da solo dopo ogni commit |
| Supabase | progetto wmweptdpfworispqjhto (Francoforte) |
| Chiave pubblica | sb_publishable_kaNxtTEWBzAdqGVAp_wLdA_XzOtNQFp (la secret mai condivisa) |
| Admin | raschi.ale@gmail.com (tabella admins) |
| Utenti al 25/10 | 2 (raschi.ale, giangymn) |

File su GitHub (dalla Fase 1, novembre 2026): i **sorgenti** sono alla radice del repo indz10/safehouse; Netlify pubblica la cartella **dist/** (`netlify.toml`, `publish = "dist"`), costruita con `./build.sh` e salvata nel repo. index.html e sw.js escono sempre insieme dalla build (stessa versione).

## 3. Sorgenti (alla radice del repository, dalla Fase 1)
`./build.sh` (da qualsiasi cartella) → `dist/` (index.html + sw.js con numero di versione in ora italiana, manifest, icone, pagine, orde.ics). Prove principali: `./prove.sh` (build + t_ar3 → `ERR2 []`, t_buttons → `problemi: 0`, t_fronte_lento, t_account; si possono aggiungere altre prove: `./prove.sh t_map.py`). Le prove trovano i file nella loro cartella (non più /home/claude/v3). Lo zip ZombieSafeHouse_sorgenti.zip non c'è più.
Modulo principale nuovo: **p20_territorio.js** (territorio vero, GPS, casa vera, quartiere vero, missioni, meteo, community, inviti, trasloco, valutazione ricca, IA, elimina account). Mappa: p19_livemap.js. Legali: cartella legal/. Funzione server: supabase/zsh-api.ts.

## 4. Database (Supabase) — eseguito
Tabelle: sponsors, offers, coupons, leads, reviews, sponsor_events, subscriptions, admins, sponsor_users, salvataggi, **profili_pubblici, poi_reports, hidden_pois**. Funzioni: redeem_coupon, is_admin, my_sponsor, **zsh_stats**. Vista sponsor_stats_month (security_invoker).
**Da eseguire:** `aggiornamento_ottobre.sql` (delete_my_account, admin_link_sponsor, admin_sponsor_accounts, inviti: colonna invitato_da + miei_invitati).
**Da creare:** Edge Function `zsh-api` + segreti ANTHROPIC_API_KEY (IA foto e Radio Operatore) e GOOGLE_PLACES_KEY (attività aperte/chiuse).

## 5. Cosa fa l'app oggi
- **Posizione**: GPS a più letture, civico più vicino, conferma "È qui casa tua?" con casetta da trascinare.
- **Zona vera**: servizi OSM (2,5 km; ospedali, forze dell'ordine, vigili del fuoco e attività per la casa fino a 10 km), case intorno, acqua, rilievo vero (Open-Meteo / AWS), casa vera (forma, piani, tetto, vicini attaccati).
- **Mappa**: giorno lilla/giallo tenue, notte; icone a fumetto; posti sponsor liberi (📌 gialli col nome), sponsor veri (bollino col nome), servizi; casa tua rossa; 3D con rilievo; pulsante 🔭 10 km; utenti veri (cerchi con iniziale, verde se online); attività nascoste visibili solo all'admin (🚫 grigie, "Rimetti").
- **Schede attività**: info online (orari con "aperto ora", contatti, social, Google Maps); con Google attivo: "in attività / chiusa definitivamente" (chiuse nascoste e segnalate in automatico); "Segnala: ha chiuso".
- **Valutazione**: 7 foto per stanza, 45 domande, foto accanto alle domande, tipo casa e piani dalla mappa, piano d'azione (gratis / sotto 200 € / investimenti) con pulsante sponsor. IA vera solo tramite zsh-api (senza: nessun dato inventato).
- **Gioco**: "La tua casa vera"; quartiere vero (vie, case, lotti su edifici veri, punti fortificati su posti veri, frecce dell'orda dalle strade vere); terreno vero; bonus da servizi e sponsor; spedizioni nei posti veri; notte = meteo e luna veri; missioni giornaliere sul territorio; abilità del territorio (vicini veri, idranti, campane, piena, collina); zombie del territorio (annegato, bracciante, scalatore, pendolare).
- **Community**: numeri veri in alto; profilo pubblico su consenso (≈200 m); aree community con utenti veri (min 5); inviti con link personale (💎 5 per invitato che valuta la casa).
- **Trasloco**: "Ho cambiato casa" (rimborso 70% edifici, 50% punti e potenziamenti, 1 volta / 30 giorni).
- **Aggiornamento automatico** dell'app installata su iPhone.

## 5-bis. MONDO UNICO (fase 2, in corso)
- Un solo mondo reale per tutti i registrati. Modulo **p21_mondo.js**, database **mondo_unico.sql** (tabelle world_wallet, world_log, world_buildings, world_homes, world_excluded, world_bonus; funzioni world_*).
- **🧱 Mattoni**: valuta solo sul server (tetti giornalieri): notte vinta 10 (max 5/giorno), missione 15 (max 3), accesso 20, casa valutata 200 (una volta), codice usato in negozio 100, amico invitato che valuta 150, affitti (5 + 5×livello al giorno per casa, max 7 giorni).
- **Casa tua**: conferma in 2 giorni (≥20 ore), una per account, cambio ogni 30 giorni. Nessuno può comprarla.
- **Comprare**: case libere vere (tocco sulla mappa o lotto nel quartiere del gioco). Prezzo 200 + 25 per ogni casa posseduta entro ~1 km (max 2000). Livello mondo = 1 + √(Mattoni guadagnati/100); case max = 2 + livello/2; raggio = livello km (20 → 100 km, 30 → 300 km, 50 → mondo). Acquisto atomico (vince il primo).
- **Abitante che arriva**: casa a lui con i potenziamenti; il proprietario riceve subito 100% (acquisto + potenziamenti) e dopo 3 giorni +25% (+75% se l'aveva invitato), solo se l'abitante è ancora lì; massimo 2 bonus a settimana per proprietario.
- Potenzia fino a livello 5 (150 × livello), vendi al 70%. Case di proprietari inattivi 30 giorni: libere, rimborso 50%. Esclusione edificio su richiesta (admin: Segnalazioni → Escludi dal gioco).
- Nel quartiere del gioco: lotti = edifici veri; comprati nel mondo = tuoi edifici da difendere; di altri/abitati = segnati e non comprabili. Monete del gioco restano per potenziamenti e servizi.

## 5-ter. ORDA DEL MONDO (p22_orda.js + orda_mondo.sql)
- Ogni giorno alle 9:00 e 21:00 (ora italiana) l'orda attacca in automatico tutte le case del mondo unico (casa + comprate prima dell'orda).
- Esito calcolato dal server: forza orda = 40 + (md5(orda+edificio) % 60); difesa = 45 + 12×livello + 15 se "Prepara le case" + 5 se è casa propria.
- Premi (una volta, prima dell'orda successiva): 🧱 8+4×livello per casa tenuta, 2 per sfondata; 🪙 30 per tenuta, 10 per sfondata; 💎 2 se tenute tutte.
- Pannello in cima al gioco (countdown, Prepara, Riscatta, Guarda l'assalto); sulla mappa barra "Prossima orda" + "Rivedi l'ultima" con zombie animati e esiti 🛡️/💥 anche delle case degli altri. Le notti a mano restano ("Difendi tu").
- Giro guidato (8 passi) proposto una volta e nel menu ☰.

## 5-ter. ORDA DEL MONDO (cuore del gioco, semplificato)
- Ogni giorno alle 9:00 e alle 21:00 (ora italiana) un'orda attacca in automatico tutte le case del mondo unico. Modulo **p22_orda.js**, database **orda_mondo.sql** (w_prev_slot, w_next_slot, w_attack, w_power, world_raid_status, world_prepare, world_raid_claim, world_raid_view).
- Esito per casa (server, uguale per tutti): difesa 45 + 12×livello + 15 se "Prepara" + 5 se casa propria, contro attacco 40–99 (diverso per casa e orda).
- Premi da riscattare prima dell'orda successiva: 🧱 8 + 4×livello per casa che tiene (2 se sfondata), 🪙 30 per casa che tiene, 💎 2 se tengono tutte.
- Pannello in cima al Gioco (prossima orda, Prepara, Fortifica, Guarda l'assalto, Riscatta), striscia in alto su Casa/Valuta/Gioco/Mondo, pulsante 🧟 Orda sulla mappa (assalto animato, esiti 🛡️/💥 visibili a tutti), promemoria calendario (8:45 e 20:45), giro guidato in 8 passi (proposto la prima volta, poi dal menu). Le notti a mano restano come "Difendi tu".

## 5-quater. MONDO v3 (p23_v3.js + mondo_v3.sql)
- Orda su misura: forza = 30 + (md5 % 60) + 4×livello mondo (max 30); difesa = 45 + 12×livello casa + bonus (+15 preparazione, +5 per alleato max +20, −8 per orda ricevuta max −16) + 5 casa propria.
- Compra ovunque: niente raggio; prezzo = domanda zona + 10 🧱 ogni 50 km da casa (max 6000); numero case legato al livello.
- Superstiti simulati 🤖: ~1 casa su 6 (md5('npc'+edificio) primo byte < 42), dichiarati; comprabili +30%.
- Alleati e rivali in tutto il mondo: Chiedi aiuto (rinforzi +5, chi aiuta +5 🧱, max 5 premi/giorno); Manda orda (30 🧱, −8 difesa, taglia 25 🧱 se la casa del rivale cade, max 3/giorno, protetti i giocatori 3+ livelli sotto).
- Tolte le schede Amici e Arena (giocatori finti). Pagina Casa rifatta (disegno libero, la tua casa, orda, scorciatoie, sponsor veri vicini). Bottega: gemme e Pass (acquisti veri con gli store), raddoppio monete orda con 5 💎.
- Nota: l'Orda del mondo usa il modulo "OR" (window.OR, orLoad, orPanelHTML, orPlay, orTour).

## 5-quinquies. MONDO v4: alleati, regali, prestiti, fortuna (p24_alleati.js + mondo_v4.sql)
- Alleati = aiutati/aiutanti negli ultimi 30 giorni + inviti (in entrambe le direzioni).
- Mattoni: regalo o prestito (torna da solo dopo 3 giorni dal saldo di chi lo riceve; la restituzione NON conta per il livello). Monete e materiali: regalo in casella. Gemme: non si regalano.
- Tetti al giorno: Mattoni 300, monete 300, materiali 10 per tipo; ricevuti max il doppio; account con meno di 3 giorni non possono regalare.
- Pannello "🎁 Premi e fortuna" in alto nel gioco: premio del giorno, ruota, gratta e vinci, barattolo. La sezione con gli amici simulati è nascosta.

## 5-sexies. NUOVA STRUTTURA A 4 SCHEDE (p25_struttura.js)
- Barra: 🏠 Casa · 🗺️ Mappa · 🧟 Orda · 👤 Io (menu ☰ nascosto; Valuta raggiungibile da Casa).
- Casa: fascia bassa + scheda casa (indice, Mattoni, livello, case) + piano d'azione + "La tua valutazione" (foto, risposte, posizione, trasloco) + sponsor vicini.
- Mappa: una sola, a tutto schermo; filtri Case/Sponsor/Servizi/Vacanza/Alleati (classi f-*-off); "⋯" con Notte, 3D, 10 km, torna a casa, rivedi assalto, Vivere qui, aree community, cerca luogo; barra orda in alto.
- Orda: sezioni Oggi (orda, premi e fortuna, premio del giorno, missioni) · Impero (mondo unico, alleati) · Difendi tu (tutto il resto); G.ss; funzione ssOf/ssApply.
- Io: profilo, invita, bottega, giro guidato, manuale, radio, visibilità, trasloco, sponsor, contatti, privacy, termini, esci, elimina; pannelli admin/negozio se abilitati.
- Test: t_struct.py (nuova struttura), t_hang.py (server con errori: nessun blocco).

## 5-septies. SOCIAL E SPONSOR (p26_social.js + social.sql)
- Barra: 🏠 Casa · 🗺️ Mappa · 🧟 Orda · 👥 Superstiti; Io sull'avatar tondo in alto a destra (#ioBtn).
- Superstiti: Per te (proposte di alleanza, rinforzi/orde/regali/saluti ricevuti, numerino rosso), Bacheca (Zona ±0,3° / Alleati / Mondo, ultimi 7 giorni), Squadra (alleati), Classifiche (zona/mondo × settimana/sempre; punti = Mattoni guadagnati giocando, regali e prestiti esclusi).
- Bacheca automatica: trigger su world_homes, world_buildings, world_help, world_help_given, world_attack_given, world_gifts, world_allies, world_shouts → world_feed (posizione arrotondata a ~1 km; paese solo se profilo visibile).
- Scheda giocatore (tocco su qualsiasi @nick o su un giocatore della mappa): proponi/accetta alleanza, rinforzi, regala/presta, manda orda, saluti con 12 frasi pronte (max 30/giorno, niente testo libero).
- Sponsor: segnaposto grandi (logo, nome, etichetta offerta rossa, pulsano), ridisegnati quando arrivano i dati, posizione dall'indirizzo se manca il segnaposto (cache), pulsante "⭐ N sponsor" in mappa con elenco per distanza → vola lì e apre la scheda.
- build.sh esegue check_syntax.js: se un modulo ha un errore di sintassi la compilazione si ferma.

## 5-octies. PIAZZA, la chat della community (p27_piazza.js + chat.sql)
- Superstiti → 💬 Piazza (prima voce): stanze 📍 Zona (celle ~10 km: 'z:lat1:lon1' dalla casa) e 🌍 Mondo; aggiornamento ogni 5 s mentre è aperta.
- Messaggi 1–280 caratteri, 1 ogni 4 s, 200/giorno; filtro w_bad (bestemmie, insulti razziali/sessuali/origine, minacce); 🚩 Segnala (3 segnalazioni = nascosto; admin nasconde subito); 🚫 Blocca (world_blocks); conservati 90 giorni.
- Frasi rapide nella barra di scrittura; tocco su un messaggio → profilo, rispondi, segnala, blocca, nascondi (admin).
- Avviso "📬 Hai N novità per te" in cima alla Piazza. Avatar aggiornato dopo l'accesso; avviso "Non sei collegato in questa app" (l'app sulla Home di iPhone ha accesso separato da Safari).
- Test: t_piazza.py, t_buttons.py (preme ogni pulsante di ogni scheda: 119, 0 errori).
- Privacy e termini aggiornati (Piazza, bacheca, regole della community).

## 5-novies. BARRA IN ALTO E MENU A TENDINA (p28_menu.js)
- Barra: logo · "ZombieSafeHouse" · 🔔 novità (numerino, porta alla Bacheca) · ☰ menu (giallo). Contatore utenti spostato nel menu su telefono; pulsante musica volante tolto (ora nel menu); fascia "Zombie Safe House" doppia tolta.
- Menu da destra (si chiude con ✕, tocco fuori o scorrendo a destra): intestazione con avatar, livello, Mattoni/gemme/monete, utenti online; 4 scorciatoie; sezioni La mia casa · Gioco · Community · Aiuto · Account (interruttori Visibile sulla mappa, Suoni, Musica; privacy, termini, admin/negozio se abilitati, esci, elimina).
- Test: t_zmenu.py (29 voci, 0 errori).

## 5-decies. REGIA DEGLI ASSALTI E NOTIFICHE PUSH (p29_assalto.js, push.sql, push_cron.sql, supabase/functions/zsh-push)
- Regia: assalto('last'|'sim') → apre la Mappa, vola su ogni casa (casa tua + comprate, anche lontane), anima l'orda; barra in basso con esito per casa (◀ ▶, ⟳, cambia ultimo/simula, ✕). Simulazione = stessa formula del server con forza dell'orda casuale (stima). Accessi: riquadro "🎬 Gli assalti" in Orda → Oggi, pulsante "🎬 Assalti" sulla mappa, menu → Gioco.
- Push: tabelle push_subs, push_keys (chiavi VAPID create dalla funzione alla prima chiamata), push_log; RPC push_subscribe/push_unsubscribe; funzione zsh-push (Verify JWT spento) con task key/test/tick; pg_cron ogni 10 min → tick: 'prep' alle 8:30/20:30, 'raid' alle 9:00/21:00 (ora di Roma), novità personali da world_feed. sw.js gestisce push e notificationclick (apre /?assalto=last o /?go=...).
- iPhone: notifiche solo con app sulla schermata Home (iOS 16.4+) e permesso concesso. Riquadro "🔔 Avvisami prima di ogni orda" in Orda → Oggi; menu → Account → Notifiche.

## 5-undecies. L'ORDA A FUMETTO (p30_fumetto.js)
- assalto() ora apre prima la tavola a fumetto (stile manga/anime in SVG): 4 vignette che entrano a scatto (notte sulla casa · orda con 5 zombie e linee di velocità · mani sulla porta con BAM!/CRACK! e assi se preparata · TENUTA! con scudo o SFONDATA! con fiamme), tocco per saltare, ◀▶ case, "Vedi sulla mappa" porta alla regia.
- zArt(i): 5 varianti di zombie (pelle, vestiti, capelli, occhi luminosi). Sulla mappa i marcatori .lm-z usano lo zombie disegnato che cammina.
- Test: t_fumetto.py.

## 5-duodecies. HOMEPAGE A DISEGNO, CASE NEL MONDO, SCHEDA DELLA CASA (p31_mondo2.js)
- Home = disegno a tutto schermo (heroSVG) con 🌍 Vai al mondo, La mia casa (o Valuta), Orda, Superstiti, ☰ Tutto; contatori Mattoni/gemme/orda.
- La vecchia pagina Casa = route 'casa' ("La mia casa": indice, piano, valutazione, sponsor, novità) con "‹ Torna alla home".
- Mappa: barra "🏠 Le tue case" (casa tua + comprate, distanza), tocco → volo (anche intercontinentale) → houseSheet.
- houseSheet: livello, probabilità di tenere, esito ultima orda, portafoglio + Acquista; azioni (potenzia 150×liv, prepara, aiuto, assalto, affitti, vendi) con "Ti mancano X"→Bottega; migliorie IA (planItems per la casa vera); 💬 chiedi alla community (Piazza precompilata); lavori veri sponsor entro 50 km.
- shopSheet: pacchetti Mattoni e gemme + Pass (attivi con gli store), modi per guadagnare.
- Guida PDF: ZombieSafeHouse_Guida_completa.pdf (10 pagine, docs/guida_build.py).

## 5-terdecies. SEMPLIFICAZIONE (p32_semplice.js) — notifiche push ATTIVE (notifica di prova arrivata)
- Home: solo 🌍 Vai al mondo e 🏠 La mia casa (Orda/Superstiti nella barra, il resto nel menu).
- Orda: 2 sezioni (☀️ Oggi · ⚔️ Difendi tu). Sezione Impero tolta: case → Mondo (barra "Le tue case" + scheda casa), alleati/rivali/regali → Superstiti › Squadra. L'orda è un solo riquadro: prepara, fortifica, 👀 guarda l'assalto (apre il fumetto), riscatta, 🔮 simula, 🌍 le mie case, 🔔 notifiche.
- Mondo: in basso solo "Le tue case"; filtri spostati in ⋯ → "Mostra sulla mappa" (interruttori).
- La mia casa: solo casa (indice, piano, valutazione, sponsor).
- Menu ridotto a 21 voci senza doppioni della barra.

## 5-quaterdecies. CORREZIONI (p33_fix.js, aiuto_alleati.sql)
- 🔊/🔇 in alto accanto alla campanella: spegne/accende musica e suoni insieme (ricordato tra le sessioni: localStorage zsh_mute).
- Scheda casa: "🧱 Più Mattoni" + spiegazione; Bottega con "Come avere Mattoni adesso, gratis".
- Richiesta d'aiuto: trigger su world_help crea righe 'ask_ally' per ogni alleato (w_allies_of) → bacheca/per te con "Manda rinforzi" e push "@x chiede il tuo aiuto" (NAMES.ask_ally nella funzione zsh-push).
- Inviti: niente push a chi non è iscritto (riceve il link via WhatsApp/SMS); chi entra e valuta dà 150 🧱 + 5 💎 e diventa alleato.

## 5-quindecies. OGGI E CALENDARIO (p34_oggi.js, pwa/orde.ics → dist/orde.ics)
- Riquadro "📅 Oggi" in cima a Orda › Oggi: data vera, orologio che scorre, meteo adesso e all'ora della prossima orda (Open-Meteo hourly), effetto sul gioco (pioggia/nebbia/blackout/luna piena: vale per le notti giocate).
- Scheda: prossime 3 orde col meteo, luna, tramonto; Google Calendar (abbonamento a orde.ics), Calendario iPhone (webcal://), "solo la prossima" (link Google).
- La casella "Premio del giorno" mostra il calendario vero (l'emoji Apple mostra sempre 17 luglio).
- PDF investitori: ZombieSafeHouse_Investitori.pdf (10 pagine, dati Censis-Verisure, PoliMi IoT, IIDEA).

## 5-sedecies. COLORI (p1_head.html)
- Il rosso --red non era definito (usato in 13 punti: pulsante "Sì, accompagnami" invisibile, pulsante Aiuto…): ora --red:#d7263d.
- Colori sempre chiari anche con iPhone in modalità scura: meta color-scheme light, :root{color-scheme:light}, :where(button,input,select,textarea){color:var(--ink)}.
- build.sh esegue anche check_css.py: si ferma se lo stile usa var(--nome) non definiti.

## 5-septendecies. SPONSOR DI ESEMPIO IN MAPPA (p35_spdemo.js)
- Senza sponsor veri nel database, gli sponsor di esempio (quelli caricati all'avvio) vengono appoggiati sui negozi veri più vicini (ferramenta/fabbri/elettricisti/serramentisti, poi altri negozi; entro 2,5 km) o intorno a casa: segnaposto grande, elenco, scheda, lavori entro 50 km.
- Appena arriva uno sponsor vero (caricato da p18), gli esempi spariscono. Gli sponsor veri senza segnaposto NON vengono mai piazzati su un negozio a caso (prendono la posizione dall'indirizzo, p26).

## 5-duodevicies. ATTIVITÀ DELLA ZONA E RIVALI (p36_rivali.js, dispetti.sql)
- Sponsor di esempio spenti (SP_DEMO_KEYS svuotato). Al loro posto le ATTIVITÀ VERE entro 20 km (Overpass: ferramenta, fabbri, serramentisti, vetrai, elettricisti, porte, sicurezza, falegnami), cache 7 giorni; segnaposto bianco/viola "attività della zona", NON sponsor, niente offerte inventate. Scheda: indirizzo, orari, Chiama, Sito, Portami lì; admin: "Fallo diventare sponsor" (admin.html) e "Togli dalla mappa" (zHide). Elenco "🔧 N attività"; nelle schede casa se non ci sono sponsor entro 50 km.
- Superstiti › 😈 Rivali: Orda (30 🧱, −8), Nebbia (15 💎, −5, max 2), Sabotaggio (25 💎, annulla Prepara −15). Regole: niente agli alleati, protetti 3+ livelli sotto, max 3 dispetti/giorno, uno per tipo per orda e bersaglio, malus totale max −25 per orda. Gemme scalate dal telefono, effetto deciso dal server (world_curses, w_upower). Vittima: bacheca "per te" con 🆘 Chiedi aiuto + push (NAMES.curse).
- Prezzi sponsor: iscritti attivi entro 20 km (scaglioni 500/2.000/5.000/20.000). PDF: ZombieSafeHouse_Piano_sponsor_investitori.pdf.

## 5-undevicies. EQUITÀ DEL MONDO UNICO (p37_equita.js, equita.sql blocchi A–G)
- 1 Kit di benvenuto: world_welcome() 300 🧱 una volta (caps.benvenuto) + 50 💎 sul telefono; finestra "Benvenuto nel mondo!".
- 2 Scudo 14 giorni: w_shielded (account < 14 g e caps.scudo_off≠1); world_send_attack/world_send_curse lo rispettano; chi attacca durante lo scudo lo perde. world_rivals ha colonna shield.
- 3 Spinta +50%: w_pay aggiunge 50% sui guadagni da gioco se w_lvl_of < mediana dei giocatori attivi entro ~20 km (w_median_near, min 3 giocatori). Riga log "Spinta di recupero +50%".
- 4 Leghe: w_league (Bronzo 1–5, Argento 6–12, Oro 13–20, Diamante 21+), world_rank_lega(p_period); pulsante "🏅 La mia lega" nelle Classifiche.
- 5 Prezzo progressivo: w_price2 × (1 + 0,10 × case possedute), tetto 9.000.
- 6 Padrino: w_pay dà 10% a chi ha invitato nei primi 14 giorni dell'invitato (log "Padrino…").
- world_status_extra() → chip in homepage (🛡️ Scudo N g · 🚀 +50% · 🏅 lega), righe nella scheda casa, avviso nei Rivali.
- PDF: ZombieSafeHouse_Equita_mondo_unico.pdf.

## 5-vicies. ORDA › OGGI: PULSANTI CHE RISPONDONO (p38_oggifix.js, test t_oggibtn.py)
- Oggi contiene solo: 📅 Oggi · 🧟 Orda · 🎁 Premi e fortuna · 🎯 Missioni di oggi.
- Caselle: Premio del giorno → dailySheet(), Barattolo → jarSheet(), Ruota/Gratta → loro finestre.
- La fisarmonica vecchia "Premi e missioni di oggi" diventa "🎯 Missioni delle notti" in ⚔️ Difendi tu (solo le missioni MISSIONS); "Fortuna 🍀" doppia nascosta.
- "Vai" delle missioni: day/fight/map → passa a Difendi tu e scorre al punto; poi/sp/biz → apre la scheda.
- t_oggibtn.py verifica che ogni pulsante di Oggi apra qualcosa o sposti di sezione (non solo l'assenza di errori).

## 5-unetvicies. SCHEDA ORDA UNICA + IL FRONTE (p39_fronte.js, test t_fronte.py)
- Niente più "Oggi / Difendi tu": ORDA_ONE. Ordine: 🗺️ Il fronte · 🧟 Orda del mondo · ⚔️ Gioca la notte (scudo, livello, difficoltà, #fight) · 🎁 Premi e fortuna · 🎯 Missioni · fisarmoniche 🌙 Campagna/quartiere/bestiario, 🛠️ Attrezzi/casa/proprietà, 👥 Amici e sfide. Bottega vecchia nascosta (c'è la Bottega nuova). .ocal nascosto (data/ora/meteo nel fronte, 📅 apre oggiSheet).
- Il fronte: liveMap riusata (FR.node persistente), percorsi veri da OSM (Dijkstra, 350–950 m, 6 settori) o di riserva; pendenze da trElevLL → strade verde/arancio/rosso; zombie frComp(livello mondo): Vagante, Corridore (2+), Col casco (3+), Strillone, Scavatore (4+), Bruto (5+), Bruto della Sagra (8+), Zombie d'oro (toccalo: +20 🪙 una volta per orda). Velocità = ZT.sp × pendenza (corridore ×2, scavatore immune) × meteo (pioggia 0,8, luna 1,2, blackout 0,9); strillone +15% ai vicini; nebbia: lontani al 18%; blackout: mappa scura e occhi luminosi. Casa con anello % di tenere; colpo = lampo.
- Element.scrollIntoView apre le fisarmoniche che contengono il bersaglio. Menu "Gioca la notte" → .odplay.

## 5-duovicies. ORDA TUTTA SIMULATA (p40_simulato.js, test t_sim.py)
- ORDA_SIM: scheda Orda = 🗺️ Fronte · 🧟 Orda del mondo · 🎁 Premi e fortuna · 🎯 Missioni. "Gioca la notte" e le fisarmoniche (campagna, attrezzi, amici) nascosti; niente Difendi tu nel menu. Il codice del gioco a notti resta ma non è raggiungibile.
- Missioni: quelle sulle notti (win/exp/def/ev) sostituite da prep/watch/claim/help/gold con lo stesso premio; si completano da sole (SB.rpc world_prepare / world_raid_claim / world_send_help o world_shout, assalto(), zombie d'oro). Restano quelle sui posti veri (poi/biz/cp/sp).
- oggiPut spento: data, ora e meteo stanno nel fronte.

## 5-tervicies. CASE DISEGNATE DIVERSE (p41_case.js, test t_case.py)
- houseArt(tipo,livello,seme): 6 forme (villetta, bifamiliare, schiera, condominio, cascina, negozio), colori dal seme; livello 2 luci+lampione, 3 recinzione, 4 assi su porte e finestre, 5 cupola-scudo e bandiera.
- Tipo dalla mappa vera: bType(lat,lon) → Overpass way(around:18)["building"] → btFromTags (house/detached→villetta, semidetached→bifamiliare, terrace→schiera, apartments o 3+ piani→condominio, farm/barn→cascina, commercial/retail→negozio), cache 'zsh_bt_*'; se manca, scelta dal seme. Casa vera: dal tipo scelto (G.type) o dalla mappa.
- "La mia casa": in cima la casa vera disegnata dalle risposte (houseScene), indice/livello/Mattoni, poi "Le tue case nel mondo" con disegni; tocco → mappa e scheda. Scheda di ogni casa: disegno e tipo in alto. Barra "Le tue case": miniature.
- Mappa: pulsante 🏙️ 3D di nuovo visibile (era solo nel menu ⋯).

## 5-quatervicies. CASE VERE A FUMETTO (p42_reale.js, test t_reale.py)
- bGeom(lat,lon): Overpass way(around:70)["building"] out tags geom → edificio che contiene il punto (o il più vicino entro 30 m) + vicini entro 55 m; pianta in metri, cache 'zsh_bg_*'.
- realHouseSVG: prospettiva obliqua (K=0,55), facciate visibili per segno dell'area, ombra sul lato est, finestre per piano ogni ~3,4 m, tetto da roof:shape o stimato (due falde / padiglione / piano) con camino, colori da building:colour o intonaci; vicini viola tenui; strada e prato; inquadratura stretta sulla casa.
- Rinforzi visibili: porta blindata (acciaio con traverse), grate, vetri antisfondamento (azzurri), luci a sensore (lampada + cono), allarme/telecamera, recinzione (o livello 3+), assi su porta e finestre (case preparate o livello 4+), alleati davanti alla porta (fino a 3), cupola-scudo (livello 5). Elenco "🛡️ Rinforzi della tua casa" ✓/✗ in La mia casa.
- Usato in La mia casa (casa vera + galleria) e nella scheda di ogni casa; se manca la pianta resta houseArt/houseScene.

## 5-quinvicies. ALLEANZE 2 (p43_squadra.js, alleanze2.sql blocchi A–F, test t_squadra.py)
- Coinquilini: w_coinq = stesso building_id o entro 25 m → alleati automatici (w_are_allies, w_allies_of, world_allies con colonna coinq). Niente orde né dispetti tra alleati/coinquilini; i rivali li escludono.
- Scudo per un alleato: world_ally_shield (20 💎 dal telefono), +5, max 2 per orda (tabella world_shields, avviso 'shield' + push).
- w_upower: prep 15 + rinforzi 5×(max 20) + scudi 5×(max 10) + squadra +5 se ≥3 alleati preparati + coinquilini preparati 3×(max 9) − malus (max 25).
- world_give: anche gemme (20/g), giri (1/g), biglietti (1/g); materiali tolti dalla finestra dei doni (servivano solo al vecchio Difendi tu).
- Squadra: riquadro "🛡️ Bonus di squadra" (world_team_bonus), "🏢 coinquilino", pulsante 🛡️ Scudo accanto a ogni alleato e nella scheda giocatore. Corretto: la lista alleati con Regala/Presta ora compare sempre in Squadra.
- Valute: Mattoni (server), gemme (telefono), monete (telefono, oggi senza uso), giri/biglietti, materiali e coppe residui del vecchio gioco → proposta di semplificazione in attesa.

## 5-sexvicies. CASA VERA NELL'ORDA + CONTO ESATTO + GUIDA (p44_guida.js, casavera.sql A–C, test t_guida.py)
- Scudo della casa vera 0–5 (scudoSteps: valutata, indice ≤3,5, ≤2,5, 2 missioni casa vera, acquisto verificato) → world_set_realshield (caps.rs, aggiornabile in salita ogni 6 h) → w_upower +2 per livello (max +10) a tutte le case.
- w_upower definitivo: prep 15 + 2×Scudo + rinforzi 5×(max 20) + scudi 5×(max 10) + squadra +5 (≥3 alleati pronti) + coinquilini 3×(max 9) − malus (max 25).
- world_my_defense(): conto voce per voce + per casa (45 + 12×livello + 5 casa vera + bonus); attacco tra 30+4×liv e +59. App: "🧮 Perché X%" (scheda casa, fronte), probabilità vera nel fronte e nelle schede, simulazione con i totali veri.
- 🧭 "Il tuo prossimo passo" in homepage e in cima a Orda, per tutti: valuta → accedi → riscatta → prepara → chiedi aiuto → scudo a un alleato → premio del giorno → Scudo casa vera → potenzia → compra → missioni → fatti un alleato; "Tutti i passi" con ✓ e "Rifai il giro guidato".
- Salite e meteo restano visivi sul fronte (per farli contare servirebbe il meteo letto dal server).

## 5-septvicies. CORREZIONI SQUADRA (p45_alleanza.js, squadra_fix.sql, test t_alleanza.py)
- Errore blocco 7 ("world_curses does not exist"): mancava la tabella dei dispetti. squadra_fix.sql la crea (con trigger) e rifà w_upower (blocco 7) e world_my_defense (blocco 8), più world_find(p_q) per cercare giocatori per nome (stato alleanza ok/out/in/none).
- Scritta "Padrino" che restava in alto: ora dentro .sheet-b; closeSheet e un controllo ogni 1,5 s tolgono qualunque avanzo dal contenitore #sheet.
- Scheda giocatore: "⏳ Proposta di alleanza inviata" con "📣 Ricordaglielo" (saluto 5 "Facciamo squadra?").
- Squadra: "➕ Aggiungi alla squadra" con ricerca per nome, superstiti vicini (dai rivali), Proponi / Ricorda / Accetta, e Invita. Rivali: pulsante "🤝 Alleanza".

## 5-octvicies. FRONTE SU TUTTE LE CASE (p46_fronte2.js, test t_fronte2.py)
- Fila delle case sopra la mappa (❤️ Casa tua · 🔑 Casa N, % dal conto del server, distanza se lontana); tocco → il fronte va su quella casa (jumpTo), anche all'estero.
- Gli zombie attaccano tutte le case entro 1,5 km dalla casa inquadrata (6 percorsi alla casa inquadrata, 3 alle altre), ognuna con anello e %; tocco sull'anello → scheda della casa.
- Strade: casa vera = dati del quartiere; altrove frRoads (Overpass way["highway"] 1 km). Salite: griglia della casa vera o quote Open-Meteo dei punti del percorso (frElevate, max 100 punti).
- Nebbia e colpi riferiti alla casa di arrivo del percorso.

## 5-novvicies. ZOMBIE SPECIALI, METEO E TERRENO VERI, DIFESE MIRATE (p47_zombie.js, zombie.sql A–D, zsh-push con wx/terrain, test t_zombie.py)
- Speciali per livello: Corridore 2 (fossato), Col casco 3 (barricate), Strillone 3 (sirena), Scavatore 4 (fondamenta), Bruto 5 (barricate), Ombra 6 (fari), Bruto della Sagra 8 (barricate).
- w_attack3 (ora stable): (30 + 2×liv + caso 0–49)×mod(vagante) + Σ base×(1+0,03×liv)×mod×(1−0,3×difesa). mod = terreno (pendenza casa vs anello 400 m, ±12%) × meteo (pioggia/neve/nebbia/blackout/luna) × ora (Ombra ×1,2 sera, ×0,6 mattina), limitato 0,3–1,8.
- Dati: world_terrain (pendenza) e world_wx (meteo all'ora dell'orda) li scrive zsh-push a ogni tick (meteo entro 3 h dall'orda, celle 0,1°, 40 per chiamata; terreno 40 case per tick, 5 punti a 400 m). task "wx" per forzare.
- world_defs (fossato, barricate, sirena, fondamenta, fari, 0–3; 🧱 80×livello) e world_def_upgrade. world_threats(): per ogni casa composizione, mod, pressioni, difese, forza min–max.
- App: scheda casa "🧟 Chi arriva su questa casa" + "🎯 Difese mirate" con simulatore (± difese e livello casa → % subito) e "Compra queste migliorie"; % ovunque dalla minaccia vera; fronte con composizione, meteo e temperatura veri della casa inquadrata; nuovo zombie 👤 Ombra.

## 5-tricies. SIMULAZIONE DEGLI ALLEATI (p48_alleati.js, alleati_sim.sql E1–E4; file unico zombie_alleati.sql, test t_alleati.py)
- world_send_help: agli alleati i rinforzi si mandano anche se non li hanno chiesti.
- w_threats_of(utente) = simulazione di tutte le case (con 'chance'); world_threats() = la mia; world_ally_view(uid) = stato dell'alleato (pronto, chiesto aiuto, visto, rinforzi/scudi ricevuti, già aiutato da me) + le sue case simulate; world_allies_status() = elenco alleati ordinato per rischio.
- App: Superstiti › "🤝 Alleati" (ex Squadra) con "📋 I tuoi alleati alla prossima orda" in cima (🟢/🔴 pronto, visto, % casa più a rischio, Rinforzi +5, Scudo 💎20, Ricordaglielo, Regala); tocco → scheda simulazione con ogni casa espandibile. Riquadro "🤝 I tuoi alleati" in Orda (i 4 più a rischio). Scheda giocatore alleato: "🔍 Vedi la sua simulazione".

## 5-untricies. ASSEDIO, CASE COME LA FOTO 1, EFFETTI, MESSAGGI (p49_assedio.js, assedio.sql F1–F4, zsh-push aggiornata, test t_assedio.py)
- realHouseSVG disegna anche le difese mirate (fossato d'acqua, sacchi di sabbia, fari con cono, sirena sul tetto, fondamenta di pietra) e il meteo (pioggia, neve, nebbia, blackout con fulmine, luna).
- La mia casa: ogni casa comprata ha la scheda grande come la casa vera (edificio vero, % tenuta, meteo, rinforzi con difese ●●○, "Simula e migliora", "Sulla mappa", 🕑 diario da world_house_log + diario locale).
- Assedio a fumetto: casa vera della casa attaccata con difese e meteo nelle vignette 1 e 4, zombie e simboli degli speciali veri, effetto meteo sulle vignette, 📜 cronaca.
- Fronte: pendenze con frElevate per TUTTE le case (anche la vera); meteo intorno a ogni casa (cerchio e simbolo).
- world_my_effects: sulla mappa e sul fronte le case dei giocatori a cui ho dato nebbia/sabotaggio/orda/scudo/rinforzi.
- Messaggi diretti: world_dm (+ send/list/threads, trigger 'dm' → bacheca e push con il testo), "💬 Scrivi" nel profilo, Piazza "✉️ Privati (n)", "Rispondi" in bacheca; sponsor: "💬 Scrivi al negozio" (apre la richiesta).
- Simulatore: "🧠 Consigliami" (migliorie migliori con i Mattoni che hai) e "🛡️ Prepara tutte le case".
- zsh-push: meteo letto sempre (fino a 13 h prima) e rinfrescato ogni 90 minuti; NAMES.dm.

## 5-duotricies. 10 FORTIFICAZIONI CON UN TOCCO (p50_fortezze.js, fortezze.sql G1–G5, test t_fortezze.py)
- Fortificazioni: fossato, trappole, barricate, grate, recinto, fari, cani, sirena, fondamenta, pompa (0–3, 🧱 80×livello). Ogni speciale: principale −30%/liv e supporto −15%/liv (w_ztypes con dk2: runner fossato+trappole, casco barricate+grate, strillone sirena+cani, scavatore fondamenta+pompa, brute/boss barricate+recinto, ombra fari+cani); trappole −6%/liv sui vaganti.
- La mia casa: i rinforzi sono pulsanti (+% e costo, ordinati per convenienza), "Prepara le case", casa vera "aggiorna la valutazione". Scheda casa: "🎯 Fortificazioni consigliate" (le 4 migliori) al posto dei consigli generici per le case comprate. Simulatore e Consigliami con tutte le 10.
- Disegno: anche trappole a punta, grate sulle finestre, recinto con scintille, cani, pompa con tubo e pozza.
- Versione dell'app in fondo al menu ☰ (APPV = numero della build).

## 5-tertricies. USCITA (p51_logout.js, test t_logout.py)
- Prima "Esci" ricaricava senza aspettare signOut → si restava dentro. zLogout: salva nel cloud (max 1,5 s), signOut({scope:'local'}) (max 3 s), cancella le chiavi sb-*-auth-token, S.user=null, location.replace(?uscito=…) e messaggio "Sei uscito". Intercetta sia [data-zm=logout] (menu) sia [data-io=logout] (profilo).

## 5-quattuortricies. PAGINA UNICA DELLA CASA + MATTONI AL POSTO DELLE MONETE (p52_mattoni.js, p53_casapagina.js, premi.sql, test t_casapagina.py)
- houseSheet = pagina a schermo intero (#sheet.hfull): fila delle case, disegno vero (corretto: .hsart svg non più assoluto), TUTTE le fortificazioni + Prepara, casa vera (valutazione e Scudo), chi arriva + simulatore, azioni, lavori in zona, 🕑 diario. Homepage "La mia casa", Mappa, Orda, La mia casa → houseSheet. Ricarica sempre le minacce (thrLoad(true)): le fortificazioni fatte ovunque si vedono ovunque. Avviso prezzo +N% solo quando si compra una casa.
- Monete eliminate: ruota (🧱10/25/60, biglietto, giro), gratta e vinci (🧱40/20), premio del giorno (🧱20, 🧱60, 💎40+🧱50), barattolo (🧱20), zombie d'oro (🧱5). giveMattoni → world_reward (max 60 a premio, 300 al giorno; a rate se di più). Monete residue e quelle delle missioni: 5 monete = 1 Mattone (conversione iniziale max 300). Testi 🪙 → 🧱.

## 5-quinquetricies. ACCOUNT SEPARATI E CHI ABITA DOVE (p54_account.js, residenti.sql R1–R2, test t_account.py)
- Bug: entrando con un altro account sullo stesso telefono, onLogin copiava nel nuovo account i dati locali del precedente (casa, risposte, gioco). Ora: zsh_owner = id dell'account; se cambia → cancella i dati zsh* (tranne preferenze e cache mappe), blocca saveLocal/pushCloud (__noSave) e ricarica. Anche "Esci" cancella i dati locali dopo aver salvato nel cloud.
- Bug: world_view metteva un solo segnaposto per edificio e solo case confermate → coinquilini e nuovi iscritti invisibili. Ora world_view (drop + create) aggiunge residents (nick entro 25 m) e pending; l'app unisce i segnaposto entro 20 m: sulla mia casa "👥 @nome +n", sulle altre "@nome", "⏳" se in conferma.
- Edificio con due codici (g… dal disegno, w… da OSM): coinquilini e residenti si riconoscono per distanza (25 m).
- Pagina della casa vera: "🏢 Chi vive qui" (world_coresidents) con Scrivi e Alleanza.
- Da decidere: condomini/residence/conviventi (stesso appartamento) — proposta in chat.

## 5-sextricies. TIPI DI ABITAZIONE (p55_abitazione.js, abitazione.sql C1–C8, test t_abitazione.py)
- world_homes: kind (casa/condominio/residence), unit, kind_set. Condominio: building_id = edificio#interno (riga world_buildings propria, difese copiate se non condivise). w_canon e world_claim_home lavorano sul codice dell'EDIFICIO (split_part '#') e per distanza 25 m: niente falsi traslochi; residence = nuova casa attiva subito e senza limite di 30 giorni.
- Viviamo insieme: world_house_invite/answer (solo coinquilini entro 25 m) → stesso building_id = fortificazioni e livello in comune; world_house_leave → casa propria (edificio#p…).
- Difese del condominio: world_condo (portone, cancello, telecamere, 0–3; livello n costa 240×n, pagato a contributi con world_condo_give 10–500), chiave = codice edificio minimo del gruppo; w_condo_bonus = +3 per livello alla casa di ogni condomino, contato in w_home_held (orda vera) e w_threats_of (simulatore).
- world_house_info: tipo, membri, vicini, richieste, condominio. Pagina della casa vera: "🏘️ La tua abitazione" (sostituisce "Chi vive qui"). Bacheca: house_req / house_ok.

## 5-septemtricies. PERCHÉ GLI AMICI VEDONO MENO (p56_stato.js, test t_stato.py)
- Il file è lo stesso per tutti (sw.js: pagina sempre dalla rete); le differenze vengono dallo stato: ospite senza account, valutazione non fatta, casa in conferma, livello 1, meteo non ancora letto, link aperto nel browser di WhatsApp.
- Menu ☰ → "🩺 Controlla il mio gioco": ✓/✗ su versione, dove è aperta, account, valutazione, casa, tipo, livello e speciali, meteo, notifiche, alleati; azioni Aggiorna/Accedi/Valuta; "📤 Manda lo stato".
- Avviso "versione nuova" (confronta APPV con /sw.js ogni 10 min e al ritorno nell'app; Aggiorna = svuota cache e ricarica). Avviso "browser di un'altra app".
- Invito (WhatsApp e Condividi): testo con 4 passi (aprire in Safari/Chrome, creare account, valutazione, aggiungere alla Home).

## 5-octotricies. PAGINA DI BENVENUTO DEGLI INVITI (p57_benvenuto.js, benvenuto.sql, test t_benvenuto.py)
- Chi apre il link ?invito= fuori dall'app installata vede "@nick ti ha invitato" (world_inviter, anche senza account) e i passi per il suo telefono: dentro WhatsApp/Instagram/Facebook → aprire in Safari/Chrome + "📋 Copia il link"; iPhone → 1) crea l'account QUI (l'app sulla Home ha memoria separata da Safari: il codice si perderebbe) 2) Condividi → Aggiungi alla schermata Home 3) apri dall'icona; Android → account + "📲 Installa l'app" (beforeinstallprompt) o ⋮ → Installa app; computer → meglio dal telefono. "Continua nel browser" la chiude.
- zsh_inv e zsh_bv_done non vengono cancellati al cambio account/uscita.

## 5-novemtricies. CASE ABITATE E PRIVACY (p58_abitata.js, casa_abitata.sql P1–P4, test t_abitata.py)
- Bug: world_quote/world_buy consideravano abitata solo una casa CONFERMATA con codice identico → una casa in conferma (nuovi iscritti, traslochi) risultava "Casa libera" e comprabile. Ora abitata = qualunque world_homes 'home' o 'pending' con stesso edificio (split_part '#') o entro 25 m: non in vendita.
- Privacy (errore introdotto con R1): la mappa mostrava il nome di chi abita nel punto esatto. Ora world_view e world_quote danno il nome solo ad alleati e coinquilini; per gli altri "🏠 Casa abitata" senza nome. world_my_effects: casa esatta solo per alleati/coinquilini, altrimenti posizione arrotondata (~200 m). I segnaposto dei superstiti restano approssimati (~200 m) come promesso.
- App: toccando una casa abitata da altri → "🏠 Casa di @nick" (Profilo, Scrivi) o "🏠 Casa abitata".

## 5-quadraginta. NOME SULLA CASA A SCELTA (nome_casa.sql V1+P1–P4, sostituisce casa_abitata.sql; test t_vis.py)
- Le case sono sempre nel punto esatto per tutti (forma, piscina). world_homes.vis ('alleati' predefinito, 'tutti'): w_home_known = io, alleato, coinquilino o vis='tutti'. Decide se si vede il nome sulla casa (world_view, world_quote) e se nebbia/orda/sabotaggio ricevuti stanno sulla casa esatta (world_my_effects).
- Pagina della casa vera → "🏘️ La tua abitazione" → "👁️ Chi vede il tuo nome sulla tua casa: 🌍 Tutti / 🤝 Solo alleati e coinquilini" (world_home_vis).

## 5-quadragintauno. FRONTE CHE NON SI FERMA + SCHEDA ZOMBIE (p59_zscheda.js, test t_fronte3.py)
- Bug: frMount e frLoop richiedevano S.zone.real (valutazione salvata sul telefono): senza (telefono nuovo, cambio account, dati cancellati) niente percorsi, case e zombie fermi. Ora frR() = S.zone.real o la casa dal server (myHouses); mappa centrata con le coordinate (RM.cache['__casa']); strade scaricate se manca la cache.
- La vecchia pagina Orda (renderHubBase) se si blocca lascia una pagina di riserva con segnaposto e avvia splitHub: riquadro orda, fronte, alleati compaiono comunque. G.type mancante → 'vera'.
- frZSheet (pulsanti sotto il fronte e tocco sugli zombie in marcia): riquadro "🏠 Su <casa>" con forza su quella casa, effetto salita/meteo, fortificazioni principale e supporto comprabili (+% e costo), % di tenuta.

## 5-quadragintadue. PUNTEGGIO SUPERSTITE + ZOMBIE DEGLI ALLEATI (p60_classifica.js, classifica.sql K1–K3, test t_classifica.py)
- w_score(utente, settimana?) su 1000: Difesa 300 (orde tenute dalla casa vera con w_home_held sulle ultime 14/30 orde dopo la conferma; pieno valore da 4 orde), Fortezza 200 (livelli fortificazioni + 2×potenziamenti, pieno a 30), Casa vera 150 ((10−indice)/10, indice da profili_pubblici), Squadra 150 (aiuti dati 5/20 → 100 + alleati 5 → 50), Costanza 100 (giorni con attività), Crescita 100 (Mattoni guadagnati 800/3000, regali/prestiti/kit esclusi).
- world_rank e world_rank_lega ordinano per punteggio (stessa forma di prima); world_score(utente, periodo) per il dettaglio. App: righe 🏅, "Sempre" → "30 giorni", riquadro "🏅 Il tuo Punteggio Superstite" con consiglio sulla voce più debole, tocco su un giocatore → dettaglio.
- Simulazione di un alleato: righe degli zombie toccabili → stessa scheda zombie calcolata sulla sua casa (fortificazioni solo da vedere) + Rinforzi, Scudo, "💬 Consigliagli" (messaggio pronto).

## 5-quadragintatre. FRONTE CON RETE LENTA (p46 aggiornato, test t_fronte_lento.py)
- Causa vera dei fronti senza strade/zombie: frRoads (Overpass) aspettava fino a 20 s per server provando tutti i server (anche >1 minuto), memorizzava il risultato vuoto e FR.key veniva segnato prima della fine → nessun nuovo tentativo.
- Ora: strade max 6 s (poi percorsi diretti di frPaths e ridisegno automatico quando arrivano), quote max 2 s (poi colori aggiornati in background), risultato vuoto non memorizzato, FR.key solo a lavoro finito, FR.busy contro avvii doppi, avviso "⚠️ Fronte: … · Riprova" (frErrShow). Con strade e quote bloccate gli zombie partono in ~9 s.
- Pulsante 🏙️ 3D di nuovo visibile sul fronte.
- I vecchi "Presidi della zona" (p5h_presidi.js) erano del gioco a carte, locali e con avversari inventati: spariti con il gioco. Proposta in chat: presidi veri condivisi (da decidere).

## 5-quadragintaquattuor. STRADE COLORATE E NOTTE AUTOMATICA (p61_notte.js, p46 frDrawLines, test t_notte.py)
- Bug: frDrawLines, se la mappa non aveva finito di caricare, aspettava l'evento 'load' già passato → strade colorate mai disegnate; inoltre cambiando giorno/notte o 3D sparivano. Ora riprova ogni 0,5 s (max 20 s) e le rimette dopo ogni 'styledata'.
- Notte automatica col tramonto vero (zSun: calcolo NOAA per data e posizione; notte da 20 min dopo il tramonto a 20 min prima dell'alba): liveMap parte di notte o di giorno di conseguenza (anche il fronte, prima legato all'ora della prossima orda), e ogni minuto le mappe aperte cambiano da sole; se l'utente tocca 🌙/☀️ quella mappa resta come ha scelto.

## 5-quadragintaquinque. VELOCITÀ E CASE PIÙ VERE (p62_legenda.js, p42 disegno, CSS animazioni, test t_perf.py)
- Misura (CDP, 15 s sul fronte): il lavoro era quasi tutto ridisegno delle animazioni (codice ~2%). Con animazioni spente 3%. Interventi: niente filter drop-shadow sui 22 zombie, anelli/effetti con transform+opacity (frpulseT), pioggia del fronte come strato ::before con translateY a steps(6), niente animazione sugli effetti meteo delle case e del fumetto, rispetto di "Riduci movimento". Risultato: fronte da ~19–22% a ~9% di processore.
- Timer: setInterval ≥1 s fermi quando l'app è in background (patch in p2_data.js); coinText/menu/schede ora su apertura scheda/cambio pagina invece che ogni 1,2–1,5 s; vari timer rallentati; frLoop a ~20 aggiornamenti/s.
- Disegno casa: piscine da OSM (bGeom chiede anche leisure=swimming_pool; nuova chiave zsh_bg2_), finestre con cornice, vetro, davanzale e persiane, zoccolo e cornici tra i piani, tegole sui tetti a falde, vialetto e siepi, assi alle finestre solo se le case sono preparate (non più dal livello 4), finestre illuminate dopo il tramonto.
- "🔎 Sul disegno": sotto ogni disegno (La mia casa e pagina della casa) le modifiche davvero disegnate.
- Da fare (Claude Code): eliminare il vecchio gioco a carte e unificare le catene di funzioni avvolte; peso dell'app 1,3 MB.

## 5-quadragintasex. CASE COMPRATE COME LA CASA VERA (p58, p62, p41, p42; test t_miecase.py)
- Bug: toccando una casa comprata sulla mappa si apriva la vecchia scheda "Edificio del mondo" (disegno generico, niente fila delle case) se il punto toccato distava >~20 m da quello salvato (punto del vecchio quadratino). Ora: se world_quote dice mine/myhome/mypending → sempre houseSheet, scegliendo la mia casa con lo stesso codice o la più vicina entro 120 m (ricarica wMine se serve).
- Disegno vero anche nelle miniature della barra "Le tue case" (Mappa); la vecchia funzione delle icone generiche (p41) non sovrascrive più.
- bGeom: edificio principale cercato fino a 60 m dal punto salvato (prima 30 m).

## 5-quadragintaseptem. PASSAGGIO A CLAUDE CODE (8/11/2026)
- Il Mac di Alessandro è troppo vecchio per l'app desktop: si usa Claude Code nel browser (claude.ai/code) o dall'app Claude su iPhone, collegato al repo indz10/safehouse; lavoro tramite pull request che Alessandro unisce (Merge/Revert).
- ROADMAP.md nel progetto (10 fasi: fondamenta repo con netlify.toml publish=dist, mappa del codice, via il gioco a carte (12 moduli p5*, ~267 KB), una funzione per cosa (catene: splitHub 14, houseSheet 12, socPaint 10, liveMap 9, go 8, renderHome 7, renderHub 6), chiarezza, database (schema unico + migrazioni), velocità (<700 KB), prove automatiche GitHub, funzioni nuove (presidi veri, negozio, store), realtà aumentata (10A PWA: filtro fumetto WebGL sulla fotocamera + etichette GPS/bussola con privacy; 10B app store: ARKit/ARCore geospaziale)).
- CLAUDE.md aggiornato con il modo di lavorare nel web. Guida per Alessandro: ZombieSafeHouse_Guida_Claude_Code.pdf (5 pagine).
- Prossimo passo: Tappa A (zip su GitHub), Tappa B (claude.ai/code + GitHub app su indz10/safehouse), Tappa C (Fase 1).

## 6. Da fare
0. Road map di pulizia: vedi ROADMAP.md. Fase 1 fatta (#1, #2: dopo il Merge il sito vero dava 404, corretto con netlify.toml esplicito per produzione/anteprime). Fase 2 fatta (#3): docs/MAPPA_CODICE.md. Fase 3a fatta (#4, −31 KB). Fase 3b-1 fatta (#5, scheda Orda pulita, p63_orda.js). Fase 3b-2 fatta (#6, vecchio gioco tolto, app 1.037 KB). Fase 3c (#7) e 3d (#8) fatte: "Come si gioca" e istruzioni per il gioco di oggi, "Tutte le regole" nel menu. Fase 4a fatta (#9–#12: pagina della casa unica in p64_casa.js, disegno che non blocca, forme più veloci). Fase 4b fatta (#13, funzioni dell'Orda definite una volta in p63). Fase 4c fatta (#14, mappa in p65). Fase 4d fatta (#15, Superstiti in p66). Fase 4e fatta (#16, menu in p67). Fase 4f-1 fatta (#17, comune in p68). Fase 4f-2 (orologio unico, p1z_orologio.js) in pull request. Prossima: Fase 5 (chiarezza per chi usa l'app; elenco delle cose da sistemare in ROADMAP).
1. Caricare i file, eseguire aggiornamento_ottobre.sql, creare zsh-api con le chiavi.
2. Primi sponsor veri + collegare i loro account negozio; provare codice e preventivo.
3. Legale: far verificare privacy/termini; email dedicata (privacy@…); dati INDZ.
4. **Google Play**: PWABuilder (pacchetto Android TWA), account sviluppatore 25 $, assetlinks.json, 12 tester × 14 giorni, scheda store.
5. **App Store**: account Apple Developer 99 $/anno, Mac con Xcode recente, pacchetto iOS (PWABuilder o Capacitor), eliminazione account già presente, privacy e termini online, schede "Privacy dell'app". Rischio regola 4.2 (app "solo sito"): puntare su GPS, gioco, notifiche.
6. Al lancio: MapTiler a pagamento, limite di spesa su Google Cloud e Anthropic.
7. Aggiornare video, PDF a fumetto e materiali investitori con le novità.

## 7. Modello di business
Vetrina 290/588 € · Vetrina Plus 590/1.188 € · Partner di categoria 1.490/2.988 € · Agenzie 390 € + 12 €/annuncio · Acchiappa-clienti 99 €/mese o 15 €/contatto · eventi 100–300 € · Kit Superstite (PAAL.AT) · acquisti nel gioco 0,99–4,99 €. Round ipotizzato 290–420 k€.

## 8. Come lavorare con Alessandro
Italiano, risposte brevi e dirette, un passo alla volta per le cose tecniche, indirizzi da incollare e cosa deve comparire. Safari (non Chrome con Traduttore). Attenzione ai nomi file ("-2", "(1)"). SQL: dare blocchi corti da copiare (copiare dalle anteprime tronca il testo). Documenti da condividere: PDF o PowerPoint.
