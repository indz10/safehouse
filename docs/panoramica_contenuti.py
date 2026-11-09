V='<span class="bd ok">✅ VERO</span>';F='<span class="bd sim">🟡 SIMULATO</span>';D='<span class="bd dec">🔧 DA DECIDERE</span>';P='<span class="bd part">◐ IN PARTE</span>'
def cap(t,body,cls=''): return f'<div class="zcap {cls}"><h3>{t}</h3>{body}</div>'
def tab(rows,head=None):
    h=''.join(f'<th>{c}</th>' for c in head) if head else ''
    return '<table class="zt">'+(f'<tr>{h}</tr>' if head else '')+''.join('<tr>'+''.join(f'<td>{c}</td>' for c in r)+'</tr>' for r in rows)+'</table>'
def steps(L): return '<ol class="zst">'+''.join(f'<li>{x}</li>' for x in L)+'</ol>'
S=[]
S.append(('Come leggere questo documento',cap('📖 A cosa serve',
 '<p>ZombieSafeHouse è diventata grande. Qui trovi <b>tutto</b>, spiegato in modo semplice: cosa fa l’app, in che ordine, come si collegano casa vera, gioco, quartieri e sponsor. Alla fine c’è una <b>lista di decisioni</b> da valutare una alla volta.</p>'
 +tab([[V,'Funziona davvero, con dati e persone reali'],[F,'Funziona nel gioco, ma con dati o giocatori inventati dall’app: va collegato al database per diventare vero'],[P,'Una parte è vera, una parte simulata'],[D,'Serve una tua scelta']],['Simbolo','Significa']))
 +cap('🗺️ Il quadro in una pagina',
 '<div class="loop3"><div><b>🏠 CASA VERA</b>Valuti la tua casa: indice, punti deboli, piano d’azione. Sicurezza vera.</div><div><b>🧟 GIOCO</b>Difendi la tua casa vera (o una a scelta) nel tuo quartiere vero, notte dopo notte.</div><div><b>🤝 COMMUNITY E SPONSOR</b>Vicini veri, inviti, negozi della zona che aiutano a rendere le case più sicure.</div></div>'
 '<p><b>La regola che lega tutto:</b> quello che fai per la casa vera ti rende più forte nel gioco; il gioco ti porta a conoscere la zona e gli sponsor; gli sponsor ti aiutano a migliorare la casa vera. È un cerchio.</p>')))

S.append(('Parte A · La casa vera',
 cap('🏠 1. Casa vera o casa “finta”: la differenza',
 tab([['<b>Casa vera</b>','La tua casa reale: posizione confermata, forma e piani presi dalla mappa, valutazione con domande e foto. Nel gioco compare come <b>“La tua casa vera”</b>, nel tuo <b>quartiere vero</b>.',V],
      ['<b>Casa a scelta</b> (villa, schiera, condominio, casale, barca, rifugio, camper…)','Case “di fantasia” per chi vuole solo giocare o provare. Hanno statistiche e abilità diverse. Il quartiere resta quello vero se hai valutato la casa, altrimenti è disegnato.',V]],['Tipo','Cosa significa','Stato'])
 +'<p>Si può giocare senza valutare la casa, ma <b>chi valuta parte avvantaggiato</b> (vedi “Viatico”) e sblocca tutto il territorio vero.</p>')
 +cap('📷 2. La valutazione, passo per passo',steps([
  '<b>Zona</b>: indirizzo o “Usa la mia posizione” (GPS a più letture) → conferma “È qui casa tua?” spostando la casetta. L’app legge la zona vera: servizi fino a 10 km, case intorno, fiumi, salite, il tuo edificio. '+V,
  '<b>Foto</b>: fino a 7 (4 fuori, 3 dentro). Analisi automatica con IA '+D+' (serve la chiave Anthropic). Senza IA: le foto compaiono accanto alle domande.',
  '<b>Domande</b>: 45 in 6 capitoli (struttura, accessi, perimetro, risorse, comunicazioni, mobilità). Tipo di casa e piani si compilano dalla mappa. '+V,
  '<b>Verdetto</b>: indice da 1 (fortezza) a 10, notti di resistenza, le 3 falle più grosse, <b>piano d’azione</b> (gratis oggi / sotto 200 € / investimenti) con pulsante “Chiedi allo sponsor”. '+V]))
 +cap('🔁 3. Dopo la valutazione',tab([
  ['<b>La tua casa</b>','Chi ha già valutato entra in Valuta e trova la sua scheda: risultato, aggiorna risposte, nuove foto, correggi posizione, difendila nel gioco, ho cambiato casa.',V],
  ['<b>Trasloco</b>','Monete, gemme, livello, attrezzi, crediti vengono con te; edifici e potenziamenti restano con rimborso (70% / 50%, una volta ogni 30 giorni).',V],
  ['<b>Viatico</b>','La valutazione dà un vantaggio nel gioco: livello di partenza più alto se la casa è sicura, monete e gemme se le foto confermano le difese.',V],
  ['<b>Scudo della casa</b> (0–5)','Cresce con le azioni sulla casa vera (valutare, foto, missioni casa, preventivi, acquisti).',P],
  ['<b>Crediti Casa Vera</b>','Arrivano dalla valutazione e da acquisti veri presso gli sponsor. Oggi i codici d’esempio (ZSH-PORTA, ZSH10…) sono finti: vanno legati ai codici veri del pannello negozio.',F]],['Funzione','Come funziona','Stato']))))

S.append(('Parte B · Il gioco, in ordine',
 cap('🧭 L’ordine del gioco (la “giornata tipo”)','<p>Il gioco ha un ordine, ma oggi non si vede abbastanza. Eccolo:</p>'+steps([
  '<b>Scegli la casa</b> (la tua casa vera è la prima, col bordo rosso).',
  '<b>La campagna “Le notti dell’assedio”</b>: capitoli da 5 notti, la 5ª è un <b>boss</b>. Ogni notte vinta = un passo avanti, fino a 3 stelle. Le notti già fatte si possono rigiocare per più stelle.',
  '<b>Prima della notte</b>: ricognizione e <b>piano di difesa</b> (barricata, trappole, torretta; o “Piano automatico”).',
  '<b>La notte</b> (2–3 minuti): carte con le provviste, bersaglio, abilità della casa, attrezzi, rifornimenti a metà notte. Evento della notte dal <b>meteo vero</b>.',
  '<b>Fine notte</b>: stelle, monete, scrigno da scegliere; edifici danneggiati da riparare.',
  '<b>Il giorno</b>: spedizioni nei posti veri, 3 missioni del giorno, premio giornaliero, ruota e gratta e vinci, barattolo di quartiere.',
  '<b>Potenzia</b>: casa, attrezzi, edifici e servizi del quartiere, punti da fortificare.',
  '<b>Di nuovo notte</b>, più difficile. Il ciclo ricomincia.'])
 +'<p class="note">🔧 <b>Correzione già fatta:</b> prima, perdere anche un solo edificio faceva tornare indietro di livello (per questo si restava all’orda 2). Ora gli edifici persi si riparano pagando monete, e il livello resta.</p>')
 +cap('🏘️ Le 4 schede del gioco',tab([['<b>Quartiere</b>','Mappa del quartiere vero, campagna, missioni, spedizioni, bollettino del territorio, difendi.',V],['<b>Potenzia</b>','Casa, attrezzi, carte, cambio gemme.',V],['<b>Amici</b>','Amici, aiuti, quartieri condivisi.',F],['<b>Arena</b>','Sfide 1 contro 1 e Coppa del quartiere settimanale.',F]],['Scheda','Cosa c’è','Stato']))
 +cap('⚔️ Durante la notte: cosa può fare il giocatore',tab([
  ['🃏 Carte','4 in mano, costano provviste (barra gialla): trappole, torretta, rinforzo, ripara, petardo…'],['🎯 Bersaglio','Tocchi uno zombie: tutti sparano a lui con +35% di danni.'],['⚡ Abilità della casa','Colpo speciale con ricarica; con la casa vera dipende dal quartiere (vicini veri, idranti, campane, piena, collina).'],
  ['🧰 Attrezzi','Sbloccati in Potenzia, con ricarica (petardo, sirena, idrante, faro…).'],['📦 Rifornimenti','A metà notte scegli 1 bonus su 3.'],['🔥 Combo','Zombie scacciati di fila = provviste extra.'],['💎 Ripara','20 gemme: casa e barricata tornano piene.']],['Azione','Cosa fa']))))

S.append(('Parte C · Economia: monete, gemme e premi',
 cap('🪙 Monete','<p><b>Si guadagnano:</b> vincendo le notti, affitti degli edifici, bonus amici, missioni, spedizioni (materiali), premio del giorno, ruota, scrigno. <b>Si spendono:</b> potenziamenti della casa, edifici e servizi, punti da fortificare, attrezzi, riparazioni.</p>')
 +cap('💎 Gemme: a cosa servono oggi',tab([['Cambio','10 💎 → 250 🪙'],['Ripara in battaglia','20 💎 → casa e barricata piene']],['Uso','Cosa dà'])
 +'<p><b>Si guadagnano:</b> stelle nuove nelle notti rigiocate, missioni (1–3), scrigno missioni (10), premio del giorno (10 e 40), inviti (5), aiuti agli amici (5), ruota (5–50), gratta e vinci, viatico (8–15).</p>'
 +'<p class="note">🔧 <b>Problema:</b> si guadagnano in tanti modi ma si spendono in due soli. Le gemme sembrano inutili. Proposte nella parte G.</p>')
 +cap('🎁 Altri premi e “fortuna”',tab([['Premio del giorno','7 giorni di fila, il 7° è il più grande.',V],['Ruota della fortuna','1 giro ogni 3 vittorie e dal premio del giorno. Probabilità visibili, mai a pagamento.',V],['Gratta e vinci','Dal premio del giorno.',V],['Barattolo di quartiere','Obiettivo comune con gli amici.',F],['Medaglie','Imprese speciali (notte perfetta, buio, incubo, ondata 10).',V],['Materiali','Cibo, legno, metallo, batterie, medicine dalle spedizioni.',V]],['Premio','Come funziona','Stato']))))

S.append(('Parte D · Quartieri e interazioni (la parte più importante per l’engagement)',
 cap('🏘️ Il tuo quartiere vero','<p>La mappa del gioco è la tua zona vera: vie coi nomi, case, campi, fiumi. Gli <b>edifici in vendita</b> sono case vere intorno a te; i <b>punti da fortificare</b> sono posti veri (rotonda o incrocio, lampioni della via principale, chiesa, case vicine, campi); le <b>frecce dell’orda</b> partono dalle strade vere. Terreno, servizi, sponsor e meteo cambiano la notte. '+V+'</p>')
 +cap('🤝 Le interazioni tra giocatori: stato reale',tab([
  ['<b>Mappa della community</b>','Vedi gli altri superstiti (nick, indice, livello, online) in posizione approssimata.',V],
  ['<b>Inviti</b>','Link personale: 💎 5 per ogni invitato che valuta la casa.',V],
  ['<b>Vicini veri in battaglia</b>','Utenti registrati entro 1,5 km diventano la tua abilità “Vicini veri”.',V],
  ['<b>Aree community</b>','Livello medio delle aree (solo con almeno 5 utenti).',V],
  ['<b>Amici</b>','Lista amici, saluti, bonus amici.',F],
  ['<b>SOS amici / aiuto in battaglia</b>','“Un amico è sotto attacco: aiutalo” → giochi una notte nel suo quartiere.',F],
  ['<b>Quartieri condivisi</b>','Entri nel quartiere di un altro (es. Firenze), compri e vendi edifici tra membri.',F],
  ['<b>Arena: sfida 1 contro 1</b>','Stessa orda, vince chi resiste di più contro la difesa di un altro giocatore.',F],
  ['<b>Coppa del quartiere</b>','Torneo settimanale a gironi e finale.',F],
  ['<b>Presidi di zona</b>','Piazza, parco, stazione, sponsor: li tiene chi fa il record della settimana.',F],
  ['<b>Barattolo e premio di gruppo</b>','“Se riscuotete in almeno 3…”.',F]],['Funzione','Cosa fa','Stato'])
 +'<p class="note">🔧 <b>Il punto chiave:</b> la parte sociale del gioco è già <b>progettata e giocabile</b>, ma con giocatori inventati. Renderla vera (amici veri, sfide tra utenti veri, classifiche e presidi veri) è il passo che più aumenta l’engagement: ogni utente porta altri utenti e torna ogni giorno per difendere il suo posto.</p>')))

S.append(('Parte E · Sponsor e territorio',
 cap('⭐ Dove compare uno sponsor',tab([['Mappa','Bollino giallo col nome che pulsa, visibile fino a 10 km.'],['Gioco: presidio','+5% barricata a chi abita entro 3 km.'],['Gioco: spedizione','Una al giorno, senza rischi.'],['Missioni','“Scopri l’offerta e prendi il codice”.'],['Piano d’azione','“⭐ Chiedi a [sponsor]” sotto i consigli giusti.'],['Codici sconto','Validati in cassa dal pannello negozio.'],['Preventivi','Con contatto e indice della casa.'],['Recensioni','Solo verificate: chi ha usato il codice in negozio.'],['Statistiche','Visualizzazioni, schede aperte, codici, preventivi.']],['Dove','Cosa'])+'<p>Stato: '+V+' (manca solo inserire sponsor veri).</p>')
 +cap('🗺️ Dati della zona',tab([['Servizi, negozi, scuole, fermate, hotel, ristoranti','OpenStreetMap',V],['Quote e salite','Copernicus (Open-Meteo)',V],['Meteo della notte','Open-Meteo',V],['Attività aggiunte da te','Pannello admin, visibili a tutti',V],['Attività chiuse','Segnalazioni utenti + nascondi admin',V],['Recensioni','Link a Google + verificate degli sponsor',V],['Prezzi case e annunci','Solo da agenzie partner (oggi nessuna)',D]],['Cosa','Da dove','Stato']))))

S.append(('Parte F · Chi fa cosa',
 cap('👤 I tre ruoli',tab([['<b>Tu (admin INDZ)</b>','admin.html o menu ☰ “Pannello admin”: sponsor (aggiungi, modifica, disattiva, elimina), account negozio, attività aggiunte, segnalazioni, attività nascoste. Nell’app vedi in grigio le attività nascoste e le puoi rimettere.'],
  ['<b>Sponsor</b>','negozio.html o menu “Pannello del mio negozio”: valida codici, statistiche del mese, preventivi.'],
  ['<b>Utente</b>','Valuta la casa, gioca, invita, segnala, prende codici e preventivi, compare sulla mappa se vuole, trasloca, elimina l’account.']],['Chi','Cosa fa']))
 +cap('💾 Salvataggi','<p>Con l’accesso fatto la partita è sempre allineata tra iPhone, Mac e computer: ogni modifica va nel cloud in pochi secondi e ogni 20 secondi l’app controlla se un altro dispositivo ha salvato qualcosa di più recente. '+V+'</p>')))

S.append(('Parte G · Rendere l’orda più giocabile: proposte',
 cap('🎮 Cosa manca oggi durante la notte','<p>La notte funziona ma è <b>poco “nelle mani” del giocatore</b>: molto succede da solo (difensori, torrette), le scelte vere sono poche e il ritmo è uniforme. Proposte, dalla più semplice:</p>'
 +tab([['1','<b>Tocco diretto sempre attivo</b>','Anche in modalità tattica, toccare uno zombie lo colpisce (oltre a renderlo bersaglio). Il giocatore sente di agire.','S'],
  ['2','<b>Ritmo a ondate</b>','Ogni notte in 3 mini-ondate con una pausa di 5 secondi: “arrivano dal fiume!”. Tensione e respiro.','S'],
  ['3','<b>Contromosse chiare</b>','Ogni zombie speciale ha un’icona e una carta che lo batte (casco → petardo, scavatore → trappola). Imparare = vincere.','M'],
  ['4','<b>Bottino da raccogliere</b>','Durante la notte cadono monete, gemme e carte rare da toccare al volo.','S'],
  ['5','<b>Boss con fasi</b>','Ogni 5 notti un boss del territorio (es. “Il Bruto della Sagra”) che cambia comportamento a metà vita.','M'],
  ['6','<b>Effetti e sensazioni</b>','Vibrazione, rallentatore sull’ultimo zombie, contatore combo grande, musica che sale.','S'],
  ['7','<b>Notte in diretta coi vicini</b>','Se un vicino vero è online, può mandarti un aiuto durante la tua notte (richiede la parte sociale vera).','L']],['#','Proposta','Cosa cambia','Lavoro']))
 +cap('💎 Dare senso alle gemme',tab([['A','<b>Carte rare</b>','Pacchetti di carte speciali (es. “Elicottero”, “Muro di sacchi”) comprabili solo con gemme.'],['B','<b>Saltare l’attesa</b>','Spedizioni subito di ritorno, ricariche degli attrezzi.'],['C','<b>Estetica</b>','Pelli della casa, bandiere, effetti (arena e mappa).'],['D','<b>Seconda possibilità</b>','A fine notte persa: “Continua” con 15 gemme.'],['E','<b>Premi reali</b>','Gemme convertibili in sconti dagli sponsor (con limiti): lega il gioco ai negozi.']],['#','Idea','Cosa fa']))))

S.append(('Parte H · Lista delle decisioni (passo per passo)',
 cap('✅ Da valutare uno alla volta',tab([
  ['1','Attivare l’IA delle foto (chiave Anthropic)','Valutazioni più precise e “verificate”','S','☐'],
  ['2','Rendere vera la parte sociale: amici, SOS, sfide Arena, Coppa, presidi','Engagement e passaparola','L','☐'],
  ['3','Proposte per la notte (1, 2, 4, 6 subito; 3 e 5 dopo)','Giocabilità','S/M','☐'],
  ['4','Usi delle gemme (A, B, D subito; E con gli sponsor)','Economia sensata','S/M','☐'],
  ['5','Crediti Casa Vera legati ai codici veri del negozio','Collegamento casa vera ↔ gioco','M','☐'],
  ['6','Rendere visibile l’ordine del gioco (percorso “Notte 1 → 2 → Boss”)','Chi entra capisce cosa fare','S','☐'],
  ['7','Primi sponsor veri e loro account negozio','Ricavi','—','☐'],
  ['8','Privacy e termini dal consulente','Pubblicazione store','—','☐'],
  ['9','Google Play poi App Store','Distribuzione','M','☐'],
  ['10','Agenzie immobiliari partner (prezzi e annunci veri)','Nuovo ricavo','M','☐']],['#','Decisione','Perché','Lavoro','Ok?'])
 +'<p class="note">Lavoro: <b>S</b> = una sessione · <b>M</b> = 2–3 sessioni · <b>L</b> = più settimane (serve database per le parti sociali).</p>')))
