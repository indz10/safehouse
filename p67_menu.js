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
  (()=>{const g=L.find(x=>x[0]==='Gioco');
  if(g)g[1]=g[1].map(r=>r[2]==='g:difendi'?['⚔️','Gioca la notte','g:difendi']:r);})();
  (()=>{const g=L.find(x=>x[0]==='Gioco');
  if(g)g[1]=g[1].filter(r=>!['g:difendi'].includes(r[2]));})();
  return L;}
/* cosa fa ogni voce: Orda e fronte (p39) · Oggi (p34) · casa, regole, Mattoni (p32) · piano (p31) · assalti e notifiche (p29) · il resto (p28) */
function zmDo(k,b){
  if(k==='g:difendi'||k==='g:oggi'||k==='g:impero'){zmClose();go('orda');setTimeout(()=>{const t=k==='g:difendi'?app.querySelector('.odplay'):app.querySelector('.fronte');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},400);return;}
  if(k==='oggi'){zmClose();oggiSheet();return;}
  if(k==='casa'){zmClose();go('casa');return;}if(k==='manual'){zmClose();openSheet('📚 Tutte le regole',rulesHTML());return;}if(k==='shop'){zmClose();shopSheet(0);return;}
  if(k==='home'&&b&&/Piano/.test(b.textContent)){zmClose();go('casa');return;}
  if(k==='a:last'||k==='a:sim'){zmClose();assalto(k.slice(2));return;}if(k==='push'){zmClose();pushSheet();return;}
  return zmDoBase(k,b);}
/* apertura del menu: base (p28) + versione (p50) + niente monete (p52) + "Controlla il mio gioco" (p56) */
function zmOpen(){const r=zmOpenBase.apply(this,arguments);
  (()=>{setTimeout(()=>{try{const v=document.querySelector('#zmenu .zmver');if(v)v.textContent=`ZombieSafeHouse · un marchio INDZ · versione ${appVerTxt()}`;}catch(e){}},30);})();
  (()=>{setTimeout(()=>{try{document.querySelectorAll('#zmenu .zmwal span').forEach(s=>{if(/🪙/.test(s.textContent))s.remove();});}catch(e){}},40);})();
  (()=>{setTimeout(()=>{try{const v=document.querySelector('#zmenu .zmver');if(v&&!document.querySelector('#zmenu [data-zstat]')){v.insertAdjacentHTML('beforebegin','<button class="zmrow zstbtn" data-zstat><span>🩺</span><b>Controlla il mio gioco</b><i>›</i></button>');
  document.querySelector('#zmenu [data-zstat]').onclick=()=>{try{zmClose();}catch(e){}zStatusSheet();};}}catch(e){}},40);})();
  return r;}
/* barra in alto: logo, 🔔, ☰ (p28) + pulsante audio (p33) */
function zTopbar(){zTopbarBase();zSoundBtn();}
/* barra in basso (p26) + barra in alto (p28) */
function renderNav(){renderNavBase();zTopbar();}
/* istruzioni: base (p20) + capitoli mondo unico (p21), orda del mondo (p22), alleati e rivali (p23), regali (p24) + testo di p32 */
function manualHTML(){let h=manualHTMLBase();
  h=h.replace('<details class="man"',`<details class="man"><summary>🌍 Il mondo unico</summary><div class="man-b"><p>Tutti gli utenti registrati giocano nello <b>stesso mondo vero</b>. La tua casa è tua (si conferma in due giorni). Con i <b>🧱 Mattoni</b> compri le case libere vere: prima vicino a casa, poi, salendo di livello, sempre più lontano, fino al mondo intero.</p><p>Ogni casa rende <b>affitti</b> ogni giorno e si può potenziare fino al livello 5. Se l’abitante vero si iscrive, la casa passa a lui e tu ricevi indietro tutto il valore più un bonus (25%, 75% se l’avevi invitato tu).</p><p><b>Mattoni</b>: notti vinte, missioni, accesso del giorno, casa valutata, codici usati in negozio, amici invitati, affitti. Ogni giorno c’è un tetto. Le case di chi non gioca da 30 giorni tornano libere (rimborso 50%).</p><p>Nel quartiere del gioco gli edifici veri comprati nel mondo sono tuoi edifici da difendere; quelli di altri giocatori o abitati sono segnati e non si comprano.</p></div></details><details class="man"`);
  h=h.replace('<details class="man"',`<details class="man" open><summary>🧟 L’orda del mondo (la cosa principale)</summary><div class="man-b"><p>Ogni giorno alle <b>9:00</b> e alle <b>21:00</b> un’orda attacca <b>tutte le case del mondo unico</b>, da sola. Ogni casa tiene o viene sfondata in base alla sua difesa: <b>45 + 12 per livello</b> (massimo 5), <b>+15 se hai premuto “Prepara”</b>, +5 per casa tua. La forza dell’orda cambia per ogni casa e ogni orda (da 40 a 99).</p><p><b>Prima</b>: Prepara e Fortifica. <b>Dopo</b>: guarda l’assalto sulla mappa (🛡️ tenute, 💥 sfondate) e <b>riscatta</b> prima dell’orda successiva: 🧱 8 + 4 × livello per ogni casa che tiene (2 per quelle sfondate), 🪙 30 per casa che tiene, 💎 2 se tengono tutte.</p><p>Le notti giocate a mano restano: sono “Difendi tu”, facoltative, con i loro premi.</p></div></details><details class="man"`);
  h=h.replace('<details class="man"',`<details class="man"><summary>🤝 Alleati, rivali e simulati</summary><div class="man-b"><p><b>Chiedi aiuto</b> per la prossima orda: chiunque nel mondo può mandarti rinforzi (+5 di difesa ciascuno, fino a +20) e chi aiuta guadagna Mattoni. <b>Manda un’orda</b> a un rivale: costa 30 Mattoni, gli toglie 8 di difesa e, se la sua casa cade, prendi una taglia di 25 Mattoni. Chi è molto più debole di te (3 livelli sotto) è protetto.</p><p>L’orda è <b>su misura</b>: cresce con il tuo livello, così chi arriva dopo può crescere. Le case si comprano <b>ovunque</b>: il prezzo sale con la distanza da casa tua.</p><p>🤖 Circa una casa su sei è di un <b>superstite simulato</b>, un personaggio del gioco: si può comprare (+30%).</p></div></details><details class="man"`);
  h=h.replace('<details class="man"',`<details class="man"><summary>🎁 Regali, prestiti e fortuna</summary><div class="man-b"><p><b>Alleati</b> sono i giocatori con cui vi siete aiutati negli ultimi 30 giorni e chi hai invitato (o chi ti ha invitato). Agli alleati puoi <b>prestare Mattoni</b> (tornano da soli dopo 3 giorni) o <b>regalare</b> Mattoni, monete, gemme e materiali. Limiti al giorno: 300 Mattoni, 1.000 monete, 20 gemme, 10 per materiale; gli account nuovi possono regalare dopo 3 giorni.</p><p><b>Ruota, gratta e vinci, premio del giorno e barattolo</b> sono in alto nel gioco: giri e biglietti si guadagnano riscattando l’orda, vincendo notti e aiutando gli alleati.</p></div></details><details class="man"`);
  h=h.replace(/o <b>regalare<\/b> Mattoni, monete, gemme e materiali\. Limiti al giorno: 300 Mattoni, 1\.000 monete, 20 gemme, 10 per materiale/,'o <b>regalare</b> Mattoni, gemme, giri di ruota e biglietti. Limiti al giorno: 300 Mattoni, 20 gemme, 1 giro di ruota, 1 biglietto');
  return h;}
</script>
