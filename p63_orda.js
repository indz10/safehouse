<script>
/* =========================================================
   ORDA PULITA (Fase 3b-1)
   La scheda Orda disegna direttamente i suoi riquadri, nell'ordine di prima:
   🧭 il tuo prossimo passo · 🗺️ il fronte · 🧟 l'orda del mondo · 🤝 i tuoi alleati
   · 🎁 premi e fortuna · 🎯 missioni di oggi.
   Prima costruiva tutto il vecchio gioco a carte/notti (33 blocchi, ~115 KB di pagina)
   e poi ne nascondeva 27 con 14 strati di splitHub/ssOf/ordaUnify.
   Niente più schermata "scegli il tipo di casa": si gioca sempre con la casa vera.
   ========================================================= */
/* partita: gli stessi pezzi che creava renderHubBase (premi, missioni e Mattoni li usano ancora) */
function ordaPrep(){
  try{trSetupVera();}catch(e){}
  /* prima volta: la partita parte come quando si sceglieva la casa (monete di partenza poi convertite in Mattoni,
     un giro di ruota, un gratta e vinci, vantaggio della casa vera); startGame ridisegna già la scheda */
  if(!G.type){startGame(HTYPES.vera?'vera':Object.keys(HTYPES)[0]);return true;}
  if(!HTYPES[G.type])G.type=HTYPES.vera?'vera':Object.keys(HTYPES)[0];
  if(G.level==null)G.level=1;if(G.coins==null)G.coins=0;if(G.gems==null)G.gems=0;
  if(!G.h)G.h={porta:0,grate:0,muro:0,luci:0,energia:0,vedetta:0,...((HTYPES[G.type]||{}).start||{})};G.q=G.q||{};G.lots=G.lots||{};G.tools=G.tools||{petardo:1,sirena:1};
  if(!G.friends||!G.me||!G.event)socialInit();G.perk=G.perk||{};G.med=G.med||{};G.wins=G.wins||0;
  try{luckInit();}catch(e){}
  try{dailyBonus();}catch(e){}
  G.view='hub';G.sub='q';G.ss='oggi';G.replay=null;return false;}

var renderOrda=function(){
  if(G.run){G.run.stop=true;G.run=null;}
  try{setMusic('app');}catch(e){}
  document.body.classList.remove('inbattle');try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
  renderHub();};

var renderHub=function(){
  if(ordaPrep())return;
  app.innerHTML='<div class="page orda1" data-one="1"></div>';const pg=app.querySelector('.page');
  /* 🗺️ il fronte (lo stesso riquadro di prima, riusato tra un disegno e l'altro) */
  try{const fr=frNode();pg.appendChild(fr);
    const n=fr.querySelector('.frinfo p.muted');if(n)n.innerHTML='Strade: <b style="color:#2f9e44">verde</b> piano · <b style="color:#e8590c">arancio</b> salita verso casa (zombie più lenti) · <b style="color:#d7263d">rosso</b> discesa (più veloci). Tocca uno zombie per vederlo. È una simulazione: l’esito dell’orda lo calcola il server con livello, preparazione e aiuti.';}catch(e){console.warn('fronte',e);}
  /* 🧟 l'orda del mondo, con simula / le mie case / notifiche */
  try{pg.insertAdjacentHTML('beforeend',orPanelHTML());orBind(pg);opanExtra();}catch(e){console.warn('orda',e);}
  /* 🤝 i tuoi alleati alla prossima orda (subito sotto l'orda) */
  try{alsPutOrda();}catch(e){}
  /* 🎁 premi e fortuna */
  try{pg.insertAdjacentHTML('beforeend',luckTopHTML());luckTopBind();
    const l=pg.querySelector('.lpan');if(l)l.querySelectorAll('p,small').forEach(x=>{if(/vincendo notti/.test(x.textContent))x.textContent='Giri e biglietti si guadagnano riscattando l’orda, completando le missioni e aiutando gli alleati.';});}catch(e){console.warn('fortuna',e);}
  /* 🎯 missioni di oggi */
  try{const h=tmHTML();if(h){pg.insertAdjacentHTML('beforeend',h);tmBind();}}catch(e){console.warn('missioni',e);}
  /* 🧭 il tuo prossimo passo (in cima) */
  try{coPut();}catch(e){}
  setTimeout(()=>{try{frMount();}catch(e){}},30);
  /* dati: come faceva la vecchia catena di renderHub */
  try{orLoad();}catch(e){}
  try{if(S.user&&!W.m&&!W.busy)wMine();else if(W.on)wHood();}catch(e){}
  try{if(!OGGI.d||Date.now()-OGGI.t>20*60*1000)oggiMeteo().then(()=>{try{oggiPut();}catch(e){}});}catch(e){}
  try{if(W.on&&!G.tourDone&&G.howSeen)setTimeout(orOffer,1500);}catch(e){}
  try{if(!G.howSeen&&!document.querySelector('#sheet.open')&&(G.level||1)<=2){G.howSeen=1;setTimeout(()=>{if(!document.querySelector('#sheet.open'))openRules(0);},700);}}catch(e){}};
</script>
