<script>
/* =========================================================
   MENU ☰, BARRA IN ALTO, ISTRUZIONI — UNA FUNZIONE PER OGNI COSA (Fase 4e)
   Prima: zmDo = base (p28) + 5 strati; zmItems = base (p32) + 3; zmOpen = base (p28) + 3;
   manualHTML = base (p20) + 5; zTopbar, renderNav = base + 1. Ora la base si chiama …Base
   nel modulo di origine e UNA funzione fa, nello stesso ordine, quello che facevano gli strati.
   Tolto anche il vecchio menu a tendina di p10 (il suo pulsante era nascosto dallo stile).
   ========================================================= */
/* voci del menu: base (p32) + "Oggi" (p34) + "Gioca la notte" (p39) poi tolta con l'Orda simulata (p40) */
function zmItems(){const L=zmItemsBase();
  (()=>{const g=L.find(x=>x[0]==='Gioco');
  if(g)g[1].unshift(['📅','Oggi: ora, meteo e calendario','oggi']);})();
  /* 📲 Installa l'app (quando si usa dal browser) */
  (()=>{try{if(zWhere()==='app')return;const g=L.find(x=>x[0]==='Account');if(g)g[1].unshift(['📲','Installa l’app sul telefono','inst']);}catch(e){}})();
  /* Fase 10A: la Lente (fotocamera a fumetto) */
  (()=>{const g=L.find(x=>x[0]==='Gioco');
  if(g)g[1].splice(1,0,['📷','Lente: guarda con la fotocamera','lente']);})();
  /* Fase 15a: la Home si apre dal menu (la barra in basso non c'è più per chi gioca già) */
  (()=>{const g=L[0];if(g)g[1].unshift(['🏠','Home','hpage'],['🌍','Mondo: mappa e orda','mondo'],['🧭','Cosa fare ora (guida)','guida'],['🎮','Gioca: difendi la casa','gioca'],['🎖️','Il mio superstite','sup'],['💬','Messaggi','msg'],['🛡️','Le mie alleanze','alz'],['📣','Condividi sui social','share']);})();
  (()=>{const g=L.find(x=>x[0]==='Gioco');
  if(g)g[1]=g[1].map(r=>r[2]==='g:difendi'?['⚔️','Gioca la notte','g:difendi']:r);})();
  (()=>{const g=L.find(x=>x[0]==='Gioco');
  if(g)g[1]=g[1].filter(r=>!['g:difendi'].includes(r[2]));})();
  return L;}
/* cosa fa ogni voce: Orda e fronte (p39) · Oggi (p34) · casa, regole, Mattoni (p32) · piano (p31) · assalti e notifiche (p29) · il resto (p28) */
/* ogni voce del menu: finestra con "‹ Menu"; pagina con "‹ Torna al menu" in cima (Fase 5c) */
function zmDo(k,b){const tab0=S.tab;const back={t:'‹ Menu',fn:()=>{closeSheet();zmOpen();}};window.SHEET_BACK=back;
  const r=zmDoRun(k,b);
  setTimeout(()=>{if(document.querySelector('#sheet.open'))return;if(window.SHEET_BACK===back)window.SHEET_BACK=null;
    if(S.tab===tab0)return;const p=app.querySelector('.page')||app.firstElementChild;if(!p||app.querySelector('[data-zmback]'))return;
    p.insertAdjacentHTML('afterbegin','<button class="cback" data-zmback>‹ Torna al menu</button>');app.querySelector('[data-zmback]').onclick=()=>zmOpen();},1300);
  return r;}
function zmDoRun(k,b){
  if(k==='g:difendi'||k==='g:oggi'||k==='g:impero'){zmClose();go('orda');setTimeout(()=>{const t=k==='g:difendi'?app.querySelector('.odplay'):app.querySelector('.fronte');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},400);return;}
  if(k==='oggi'){zmClose();oggiSheet();return;}
  if(k==='lente'){zmClose();lenteOpen();return;}
  if(k==='hpage'){zmClose();MW.userNav=1;go('home');return;}if(k==='mondo'){zmClose();S.zv='mondo';go('mappa');return;}if(k==='guida'){gdSheet();return;}if(k==='msg'){msgHub();return;}if(k==='alz'){alzMenu();return;}if(k==='sup'){supSheet('io');return;}if(k==='gioca'){difOpen();return;}if(k==='share'){shareSheet();return;}
  if(k==='inst'){zmClose();zInstallSheet();return;}
  if(k==='casa'){zmClose();go('casa');return;}if(k==='manual'){zmClose();openSheet('📚 Tutte le regole',rulesHTML());return;}if(k==='shop'){zmClose();shopSheet(0);return;}
  if(k==='home'&&b&&/Piano/.test(b.textContent)){zmClose();go('casa');return;}
  if(k==='a:last'||k==='a:sim'){zmClose();assalto(k.slice(2));return;}if(k==='push'){zmClose();pushSheet();return;}
  return zmDoBase(k,b);}
/* apertura del menu: base (p28, con versione e "Controlla il mio gioco"; niente monete) */
/* "🩺 Controlla il mio gioco" in fondo al menu */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#zmenu [data-zstat]');if(!b)return;try{zmClose();}catch(x){}zStatusSheet();});
function zmOpen(){const r=zmOpenBase.apply(this,arguments);
  /* versione e "Controlla il mio gioco" ora sono dentro il menu (p28): restano anche quando il menu si ridisegna */
  return r;}
/* barra in alto: logo, 🔔, ☰ (p28) + pulsante audio (p33) */
function zTopbar(){zTopbarBase();zSoundBtn();}
/* barra in basso (p26) + barra in alto (p28) */
function renderNav(){renderNavBase();zTopbar();try{mwNoNav();}catch(e){}}
/* istruzioni: base (p20) + capitoli mondo unico (p21), orda del mondo (p22), alleati e rivali (p23), regali (p24) + testo di p32 */
function manualHTML(){let h=manualHTMLBase();
  h=h.replace('<details class="man"',`<details class="man"><summary>🌍 Il mondo unico</summary><div class="man-b"><p>Tutti gli utenti registrati giocano nello <b>stesso mondo vero</b>. La tua casa è tua (si conferma in due giorni). Con i <b>🧱 Mattoni</b> compri le case libere vere: prima vicino a casa, poi, salendo di livello, sempre più lontano, fino al mondo intero.</p><p>Ogni casa rende <b>affitti</b> ogni giorno e si può potenziare fino al livello 5. Se l’abitante vero si iscrive, la casa passa a lui e tu ricevi indietro tutto il valore più un bonus (25%, 75% se l’avevi invitato tu).</p><p><b>Mattoni</b>: notti vinte, missioni, accesso del giorno, casa valutata, codici usati in negozio, amici invitati, affitti. Ogni giorno c’è un tetto. Le case di chi non gioca da 30 giorni tornano libere (rimborso 50%).</p><p>Nel quartiere del gioco gli edifici veri comprati nel mondo sono tuoi edifici da difendere; quelli di altri giocatori o abitati sono segnati e non si comprano.</p></div></details><details class="man"`);
  h=h.replace('<details class="man"',`<details class="man" open><summary>🧟 L’orda del mondo (la cosa principale)</summary><div class="man-b"><p>Ogni giorno alle <b>9:00</b> e alle <b>21:00</b> un’orda attacca <b>tutte le case del mondo unico</b>, da sola. Ogni casa tiene o viene sfondata in base alla sua difesa: <b>45 + 12 per livello</b> (massimo 5), <b>+15 se hai premuto “Prepara”</b>, +5 per casa tua. La forza dell’orda cambia per ogni casa e ogni orda (da 40 a 99).</p><p><b>Prima</b>: Prepara e Fortifica. <b>Dopo</b>: guarda l’assalto sulla mappa (🛡️ tenute, 💥 sfondate) e <b>riscatta</b> prima dell’orda successiva: 🧱 10 + 6 × livello per ogni casa che tiene, più 🪵 4 e 🥫 6 (🧱 3 per quelle sfondate), 🪙 30 per casa che tiene, 💎 2 se tengono tutte.</p><p>Le notti giocate a mano restano: sono “Difendi tu”, facoltative, con i loro premi.</p></div></details><details class="man"`);
  h=h.replace('<details class="man"',`<details class="man"><summary>🤝 Alleati, rivali e simulati</summary><div class="man-b"><p><b>Chiedi aiuto</b> per la prossima orda: gli alleati e chi abita vicino possono mandarti rinforzi, fino a +24 di difesa, e chi aiuta guadagna Mattoni. <b>Manda un’orda</b> a un rivale: costa 30 Mattoni e, se la sua casa cade, prendi una taglia di 35 Mattoni e ⛽ 10. Chi è molto più debole di te (3 livelli sotto) è protetto.</p><p>🚗 <b>Il tuo mezzo</b> (quello della valutazione, o uno migliore comprato in Bottega) decide fin dove arrivi e quanto velocemente: a piedi 2 km, bici 5, moto 12, auto e fuoristrada 20 (le orde mai oltre 20 km). Più il mezzo è grande, più valgono i rinforzi (da +4 a +10, +1 per kit medico, radio e scorte) e più è forte la tua orda; le barricate, il recinto e il fossato di chi attacchi la indeboliscono. Se arrivi dopo l’orda, vale per quella dopo.</p><p>L’orda è <b>su misura</b>: cresce con il tuo livello, così chi arriva dopo può crescere. Le case si comprano <b>ovunque</b>: il prezzo sale con la distanza da casa tua.</p><p>🤖 Circa una casa su sei è di un <b>superstite simulato</b>, un personaggio del gioco: si può comprare (+30%).</p></div></details><details class="man"`);
  h=h.replace('<details class="man"',`<details class="man"><summary>🎁 Regali, prestiti e fortuna</summary><div class="man-b"><p><b>Alleati</b> sono i giocatori con cui vi siete aiutati negli ultimi 30 giorni e chi hai invitato (o chi ti ha invitato). Agli alleati puoi <b>prestare Mattoni</b> (tornano da soli dopo 3 giorni) o <b>regalare</b> Mattoni, monete, gemme e materiali. Limiti al giorno: 300 Mattoni, 1.000 monete, 20 gemme, 10 per materiale; gli account nuovi possono regalare dopo 3 giorni.</p><p><b>Ruota, gratta e vinci, premio del giorno e barattolo</b> sono in alto nel gioco: giri e biglietti si guadagnano riscattando l’orda, vincendo notti e aiutando gli alleati.</p></div></details><details class="man"`);
  h=h.replace(/o <b>regalare<\/b> Mattoni, monete, gemme e materiali\. Limiti al giorno: 300 Mattoni, 1\.000 monete, 20 gemme, 10 per materiale/,'o <b>regalare</b> Mattoni, gemme, giri di ruota e biglietti. Limiti al giorno: 300 Mattoni, 20 gemme, 1 giro di ruota, 1 biglietto');
  /* migrazione 014: territorio (dopo il capitolo dell'orda) */
  const TER=`<details class="man"><summary>🏴 Territorio: assalti, conquiste e scorte</summary><div class="man-b">
    <p><b>❤️ La casa dove abiti</b> non si perde mai. È <b>intoccabile</b> se almeno una volta ogni 7 giorni apri l’app da lì (entro 200 m: “📍 Sono a casa”). Se non passi da casa per più di 7 giorni i rivali possono <b>saccheggiarla</b>: se all’orda cade, rubano una parte delle tue scorte.</p>
    <p><b>🔑 Case comprate e 🚩 presidi</b> si possono <b>⚔️ assaltare</b> (🥫 10 di cibo più il carburante del viaggio, massimo 3 al giorno). Se all’orda cadono, passano a chi le ha assaltate di più; al vecchio padrone torna metà della spesa. Più rivali possono assaltare insieme: i loro assalti si sommano.</p>
    <p><b>Difendersi:</b> barricate, recinto e fossato tolgono fino al 60% della forza degli assalti; gli <b>alleati</b> vengono a difendere (🛡️) e tu o loro potete inchiodare le <b>🪵 assi</b> (20 legno = +6, fino a +18 per orda). Prima di allargarti, fai alleanze e potenzia le case.</p>
    <div class="mtab"><div><span>🧱</span><b>Mattoni</b><small>case, fortificazioni, mezzi</small></div><div><span>🪵</span><b>Legno</b><small>assi: +6 per 20</small></div><div><span>🥫</span><b>Cibo</b><small>squadra d’assalto: 10</small></div><div><span>⛽</span><b>Carburante</b><small>moto 1, auto 1,5, fuoristrada 2 al km; senza si va a piedi</small></div></div>
    <p>Le case in <b>zone care</b> rendono più affitto. I <b>🚩 presidi</b> si occupano fino a <b>5 km</b> da una tua casa e a ogni orda retta rendono <b>40 + 4 per orda di fila</b> della loro risorsa (fino a 80); tenuti da almeno 7 giorni danno +5 alle case vicine; si fortificano per sempre con 🧱 mura (+8 per livello) e 🗼 torretta (−20% agli assalti dei rivali per livello), e per la singola orda con le guardie (+12 ciascuna, tu e gli alleati, max 5), le assi (🪵 20 = +6) e i difensori alleati; e nella scheda del presidio “📋 Dettagli e come fortificarlo” mostra quanto sale la %. Nel condominio l’<b>🏅 amministratore</b> (chi versa di più nel mese) ha le difese comuni doppie e il 10% dei versamenti degli altri. Chi è appena arrivato ha <b>15 giorni di scudo</b>.</p>
    <p><b>🧭 Cosa fare</b> (in alto nel Mondo e nel menu ☰): l’elenco delle mosse migliori adesso, con costi e premi; basta toccare il pulsante.</p></div></details>`;
  try{const i=h.indexOf('🧟 L’orda del mondo (la cosa principale)');const j=i<0?-1:h.indexOf('</details>',i);if(j>0)h=h.slice(0,j+10)+TER+h.slice(j+10);else h=h.replace('<details class="man"',TER+'<details class="man"');}catch(e){}
  /* migrazione 020: il superstite che cresce (subito dopo il territorio) */
  const SUPC=`<details class="man"><summary>🎖️ Il tuo superstite: grado, energia e spedizioni</summary><div class="man-b">
    <p>Oltre alle case cresce anche <b>il tuo superstite</b>. Ogni premio in 🧱 Mattoni dà anche <b>esperienza ⭐</b> (1 ogni 4 Mattoni), e così le spedizioni, la serie di giorni, le condivisioni e gli amici invitati. Con l’esperienza sali di <b>grado 🎖️</b>: 2 a ⭐ 50, 3 a ⭐ 200, 4 a ⭐ 450, 5 a ⭐ 800…</p>
    <p><b>🔋 Energia</b>: 10 cariche, una in più ogni 2 ore. Le usi per le <b>🎒 spedizioni</b> nei posti veri vicino alle tue case: 🛒 supermercati e alimentari → 🥫 cibo; 🔧 ferramenta, vivai e parchi → 🪵 legno; ⛽ distributori → carburante; 💊 farmacie → 🔋 energia; scuole, poste e municipio → un po’ di tutto. Più il posto è lontano, più la spedizione dura, rende e rischia (se gli zombie lo inseguono torna con metà). Il raggio parte da 3 km e cresce di 1 km per grado (fino a 30), e parte dalla casa che scegli, anche lontana. Le ⭐ attività sponsor rendono di più. Ogni posto si rifà dopo 12 ore. A volte trova un 💰 tesoro.</p>
    <p><b>🧠 Abilità</b> (un punto per grado, massimo 5): 🧭 Esploratore (raggio e bottino), 💪 Resistenza (energia), 🔪 Combattente (meno rischio), 🔍 Cercatore (tesori), 🤝 Mercante (più Mattoni al Mercato). <b>🛠️ Attrezzi</b> (3 livelli, 🪵 30 e 🧱 50 per livello): 🎒 zaino, 🔦 torcia, 🪓 arma, 📻 radio (più spedizioni insieme).</p>
    <p><b>🔫 Caccia nella Lente</b>: apri 📷 Lente e tocca <b>🔫 Caccia (1 energia)</b>. Arrivano da 3 a 6 zombie da direzioni diverse (di più salendo di grado): girati col telefono (le frecce ◀ ▶ ti dicono dove) e toccali prima che ti raggiungano. 🧟 lento e 🧟‍♂️ corridore vanno giù con 2 colpi, 🧟‍♀️ il bruto con 4 (con l’🪓 arma di livello 2 colpisci doppio). Ogni zombie: ⭐ 5 e una scorta (🪵, 🥫 o ⛽); presi tutti: ⭐ 10 in più. Massimo 10 cacce al giorno.</p>
    <p><b>📬 Richieste</b>: chi chiede di entrare nella tua alleanza, chi ti invita, chi ti propone un’alleanza o dice che vivete insieme: tutto in 💬 Messaggi → <b>📬 Richieste</b>, con ✅ Accetta e ❌ Rifiuta. Le trovi anche nella carta ADESSO.</p>
    <p><b>🔋 Energia</b>: è la forza del tuo superstite. Ogni spedizione, caccia, evento o partita ne usa 1 (le spedizioni lontane 2–3); si ricarica da sola, 1 ogni 2 ore.</p>
    <p><b>🎮 Difendi la casa</b> (tasto 🎮 Gioca sulla mappa o menu ☰): partita da 45 secondi, gli zombie arrivano da tutte le parti verso la tua casa e tu li tocchi per fermarli (i grossi vogliono 2 colpi). Le vite sono il livello vero della tua casa + 2 (massimo 8): potenziare la casa aiuta anche qui. La prima partita del giorno è gratis, poi 🔋 1; massimo 15 al giorno. Premi: ⭐ 2 a zombie, una scorta ogni 2 zombie, e se la casa resiste ⭐ 15 e 🧱 5. In 🛒 Bottega, con i Mattoni: 🔋 +5 energia (🧱 60), 💣 bomba che spazza via tutti gli zombie (🧱 25), 🛡️ scudo +2 vite (🧱 25).</p>
    <p><b>👉 Una mossa alla volta</b>: sulla mappa, in basso, la carta <b>ADESSO</b> ti dice la cosa più importante da fare con un solo pulsante; “Altre cose da fare” apre la guida completa. Le tue case e l’orda sono nel cassetto (tira su ▲).</p>
    <p><b>🚨 Eventi dal vivo</b>: ogni ora circa compare sulla mappa un evento a tempo vicino alle case (ti arriva la notifica): 📦 <b>rifornimento caduto</b> (i primi 3 che ci mandano il superstite si dividono le scorte), 🚑 <b>superstite ferito</b> (il primo che lo cura con 🥫 5 prende ⭐ 50 e 🧱 20), 🧟 <b>nido di zombie</b> e ⭐ <b>sponsor sotto assedio</b> (si abbattono insieme: ogni colpo 🔋 1, massimo 3 a testa; premi a tutti quelli che colpiscono, 🧱 15 a chi dà il colpo finale). Devono stare nel raggio del tuo superstite.</p>
    <p><b>🏆 Sfida del quartiere</b>: ogni settimana fai punti con zombie abbattuti (2), spedizioni (5) ed eventi (10). La classifica è con chi abita entro 10 km; il lunedì i primi 3 prendono 🧱 150 / 100 / 50. La trovi nel tuo superstite (🏆 Sfida).</p>
    <p><b>🏢 Abiti in un condominio?</b> Se la tua casa non risulta nel mondo (in “La tua abitazione” c’è “Registra la mia casa”), toccalo, oppure vai a casa e tocca “📍 Sono a casa adesso”. Poi, quando compare la carta 🏢, scegli “Ho il mio appartamento” e scrivi scala e interno (o “stessa famiglia” se vivi con chi è già registrato).</p>
    <p><b>📅 Serie di giorni</b>: ritira il premio ogni giorno, cresce per 7 giorni (il 7° dà 🧱 50). <b>📣 Condividi</b> (menu ☰): un’immagine pronta con grado e casa e il tuo link per WhatsApp, Facebook, Instagram, TikTok, X e Telegram; la prima del giorno dà ⭐ 20 e 🔋 1, ogni amico che entra ⭐ 50 e 🔋 2, e quando valuta la casa ⭐ 150 e 🧱 150.</p>
    <p><b>Il superstite sei tu</b>: lo vedi sulla mappa sopra casa tua (e in cammino quando è in spedizione) e nel tondo in basso a sinistra, che ti dice sempre la cosa da fare <b>adesso</b>. L’aspetto cambia col grado: 🧑 Recluta, 🧑‍🔧 Raccoglitore (3), 🧑‍🚒 Veterano (5), 🥷 Ranger (10), 🦸 Leggenda (15). Si apre anche da 🎖️ in alto, dal menu ☰ e dalla guida 🧭.</p></div></details>`;
  try{const i=h.indexOf('🏴 Territorio: assalti, conquiste e scorte');const j=i<0?-1:h.indexOf('</details>',i);if(j>0)h=h.slice(0,j+10)+SUPC+h.slice(j+10);else h=h.replace('<details class="man"',SUPC+'<details class="man"');}catch(e){}
  return h;}
</script>
