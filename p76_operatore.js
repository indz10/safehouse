<script>
/* =========================================================
   📻 CAPITANO KILO, IL RADIO OPERATORE (Fase 15b, richiesta di Alessandro 14/11)
   Primo accesso (casa non ancora valutata):
   - Home semplice: solo "ZombieSafeHouse", il Capitano e "📻 Accendi la radio" (opHome, al posto di renderHome)
   - racconto a fumetto in 3 battute (scritte una lettera alla volta) → "📍 Trova il mio rifugio" → Valuta
   - durante la valutazione il Capitano resta in basso (opDock) e per ogni passo dice cosa fare, con
     "👆 Mostrami" (accShow di p16) e "💬 Chiedi" (askAI con le risposte di riserva di ACC_FAQ)
   - a valutazione fatta: indice commentato e "🔑 Crea l'account" / "🌍 Entra nel mondo"
   Dialoghi scritti: funzionano subito. Con la chiave ANTHROPIC_API_KEY risponde anche l'IA alle domande libere.
   ========================================================= */
const OP={on:false,scene:0,key:'',typing:null,min:false};
const OP_INTRO=[
  '📡 …krrr… Qui Capitano Kilo, frequenza 147.3. Se mi senti, sei ancora vivo. Bene: è già qualcosa.',
  'La città ha smesso di dormire tre notti fa. Ogni sera, alle nove, loro tornano. Ma ogni casa ha una possibilità. Anche la tua.',
  'Io vedo dall’alto, tu conosci le tue porte. Insieme scopriamo quanto resiste il tuo rifugio: cinque minuti, non di più. Pronto, superstite?'];
function opWho(){return`<div class="ophero"><div class="opface"><span class="opman">🦸</span><span class="opset">🎧</span><span class="opradio">📻</span></div><div class="opname"><b>CAPITANO KILO</b><small>📡 147.3 MHz · operatore radio</small></div></div>`;}
/* la battuta compare una lettera alla volta; un tocco la mostra subito */
function opType(el,txt){clearInterval(OP.typing);let i=0;el.textContent='';el.onclick=()=>{clearInterval(OP.typing);el.textContent=txt;};
  OP.typing=setInterval(()=>{i+=2;el.textContent=txt.slice(0,i);if(i>=txt.length)clearInterval(OP.typing);},22);}
/* ---- Home semplice del primo accesso ---- */
function opHome(){document.body.classList.add('ophome');try{S.acc.asked=true;}catch(e){}
  app.innerHTML=`<div class="ophomep"><h1 class="oplogo"><span>Zombie</span><span>SafeHouse</span></h1><p class="opsub">Quanto resisterebbe casa tua? Scoprilo, e rendila più sicura davvero.</p>
    ${opWho()}<div class="opbub"><p data-optx></p></div>
    <div class="opbtns"><button class="btn wide" data-opgo>📻 Accendi la radio</button>
    ${S.user?'':'<button class="opsmall" data-oplog>Ho già un account → Accedi</button>'}</div></div>`;
  opType(app.querySelector('[data-optx]'),'📡 …krrr… C’è qualcuno in ascolto? Tocca la radio, superstite. Ho bisogno di te.');
  app.querySelector('[data-opgo]').onclick=()=>opIntro(0);const l=app.querySelector('[data-oplog]');if(l)l.onclick=()=>{try{loginSheet();}catch(e){}};}
function opIntro(n){OP.scene=n;const p=app.querySelector('.ophomep');if(!p)return;const last=n>=OP_INTRO.length-1;
  p.querySelector('.opbtns').innerHTML=last?'<button class="btn wide" data-opval>📍 Trova il mio rifugio</button><button class="opsmall" data-opask>💬 Prima ho una domanda</button>':'<button class="btn wide" data-opnx>Avanti ›</button>';
  opType(p.querySelector('[data-optx]'),OP_INTRO[n]);
  const nx=p.querySelector('[data-opnx]');if(nx)nx.onclick=()=>opIntro(n+1);
  const v=p.querySelector('[data-opval]');if(v)v.onclick=()=>{OP.on=true;try{localStorage.setItem('zsh_op','1');}catch(e){}document.body.classList.remove('ophome');S.step=0;go('valuta');setTimeout(opDock,300);};
  const a=p.querySelector('[data-opask]');if(a)a.onclick=opAsk;}
/* ---- il Capitano durante la valutazione ---- */
function opLine(){const R=S.result;
  if(R){const i=R.idx;const c=i<=3?'solido: le mie mappe lo segnano in verde':i<=6?'regge, ma ha dei punti deboli che conosco bene':'fragile: ma è proprio da qui che si comincia';
    return[`Ricevuto. Il tuo rifugio ha indice ${fmtI(i)} su 10: ${c}. Ti ho lasciato il piano d’azione, punto per punto. Ora entra nel mondo: altri superstiti sono già in ascolto.`,null,'fine'];}
  if(S.tab!=='valuta')return null;
  if(!S.zone)return['Dimmi dove sei. Scrivi l’indirizzo del tuo rifugio, via, numero e paese, e tocca “Analizza la zona”: punto l’antenna lì.','#addr'];
  if((S.step||0)===0)return['Eccola, la tua zona vista dalla mia torretta: strade, vicini, vie di fuga. Quando hai guardato, avanti: voglio vedere le tue difese.','#next0'];
  if(S.step===1)return['Tre foto: la porta, una finestra al piano terra, il cancello. Le guardo e le dimentico, sui miei nastri non resta niente. Se preferisci, salta alle domande.','#aiBtn'];
  if(S.step===2)return['Ora qualche domanda. Rispondi come faresti con un amico che deve passare la notte da te: sincero, senza fretta.','.opt:not(.on)'];
  return['Quasi fatto. Guarda il verdetto: più l’indice è basso, più il rifugio regge.',null];}
function opDock(){let d=document.getElementById('opdock');const L=OP.on?opLine():null;
  if(!L){if(d)d.remove();document.body.classList.remove('opon');return;}
  document.body.classList.add('opon');const key=L[0];if(d&&OP.key===key)return;OP.key=key;
  if(!d){d=document.createElement('div');d.id='opdock';document.body.appendChild(d);}
  d.classList.toggle('min',OP.min);
  d.innerHTML=`<div class="opdh">${opWho()}<button class="opmin" data-opmin aria-label="${OP.min?'Apri':'Riduci'}">${OP.min?'▲':'▼'}</button></div>
    <div class="opbub"><p data-optx></p></div>
    <div class="opdb">${L[2]==='fine'?(S.user?'<button class="btn small" data-opend>🌍 Entra nel mondo</button>':'<button class="btn small" data-oplogin>🔑 Crea l’account</button>'):''}${L[1]?'<button class="btn small alt" data-opshow>👆 Mostrami</button>':''}<button class="btn small ghost" data-opask>💬 Chiedi</button></div>`;
  opType(d.querySelector('[data-optx]'),L[0]);
  d.querySelector('[data-opmin]').onclick=()=>{OP.min=!OP.min;OP.key='';opDock();};
  const s=d.querySelector('[data-opshow]');if(s)s.onclick=()=>accShow(L[1]);
  d.querySelector('[data-opask]').onclick=opAsk;
  const e=d.querySelector('[data-opend]');if(e)e.onclick=opEnd;
  const lg=d.querySelector('[data-oplogin]');if(lg)lg.onclick=()=>{try{loginSheet();}catch(err){}};}
function opEnd(){OP.on=false;try{localStorage.removeItem('zsh_op');localStorage.setItem('zsh_op_done','1');}catch(e){}opDock();S.zv='mondo';go('mappa');}
/* domande libere al Capitano: IA se c'è, altrimenti le risposte scritte */
function opAsk(){openSheet('📻 Chiedi al Capitano Kilo',`${opWho()}<p class="muted" style="font-size:13px;margin:8px 0">Scrivi come parleresti a una persona: “perché le foto?”, “cos’è l’orda?”, “i miei dati sono al sicuro?”</p>
   <div class="row" style="gap:6px"><input class="field" id="opIn" placeholder="La tua domanda" style="flex:1;min-width:0"><button class="btn small" data-opq>Chiedi</button></div><div id="opOut"></div>
   <div class="accfaq">${['Perché servono le foto?','Cos’è l’orda?','I miei dati sono al sicuro?','Come si gioca?'].map(q=>`<button data-opf="${q}">${q}</button>`).join('')}</div>`,c=>{
   const ask=async q=>{const out=c.querySelector('#opOut');if(!q)return;out.innerHTML='<p class="muted">📡 …ricevo…</p>';let ans=null;
     const FAQ=[[/foto/i,'Le foto servono a capire porta, finestre e cancello. Le guardo e le dimentico: non vengono salvate.'],[/orda/i,'Ogni giorno alle 9 e alle 21 l’orda attacca tutte le case del mondo. Più la tua casa è preparata e fortificata, più regge.'],[/dati|privacy|sicur/i,'I dati della tua casa restano sul tuo profilo. Gli altri vedono la tua posizione solo approssimata, e il tuo nome solo se lo scegli tu.'],[/gioc/i,'Valuti la casa, poi nel Mondo la difendi: prepari, fortifichi, conquisti i luoghi veri e aiuti gli alleati prima di ogni orda.']];
     try{ans=await Promise.race([askAI('Sei il Capitano Kilo, operatore radio eroico di un fumetto sugli zombie, dentro l’app ZombieSafeHouse che valuta la sicurezza della casa vera. Rispondi in italiano, con tono da fumetto ma chiaro, massimo 4 frasi, consigli concreti.',q),new Promise(r=>setTimeout(()=>r(null),9000))]);}catch(e){}
     const loc=FAQ.find(([re])=>re.test(q))||(typeof ACC_FAQ!=='undefined'?ACC_FAQ.find(([re])=>re.test(q)):null);
     out.innerHTML=`<div class="opbub"><p>${esc(ans||(loc?loc[1]:'Ricevuto, ma la linea è disturbata. Chiedimi della valutazione, delle foto, dell’orda o della privacy.'))}</p></div>`;};
   c.querySelector('[data-opq]').onclick=()=>ask(c.querySelector('#opIn').value.trim());
   c.querySelectorAll('[data-opf]').forEach(b=>b.onclick=()=>{c.querySelector('#opIn').value=b.dataset.opf;ask(b.dataset.opf);});});}
/* Home: al primo accesso (casa non valutata) la Home semplice del Capitano */
const _renderHomeOp=renderHome;renderHome=function(){document.body.classList.remove('ophome');if(!S.result){opHome();return;}return _renderHomeOp.apply(this,arguments);};
/* il Capitano segue la valutazione */
try{OP.on=localStorage.getItem('zsh_op')==='1';}catch(e){}
zEvery(()=>{try{if(OP.on)opDock();}catch(e){}},900,'operatore');
</script>
