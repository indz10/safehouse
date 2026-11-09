<script>
/* =========================================================
   ORDA TUTTA SIMULATA: niente "Difendi tu" (notti, battaglia, campagna, attrezzi)
   Scheda Orda = 🗺️ Fronte · 🧟 Orda del mondo · 🎁 Premi e fortuna · 🎯 Missioni
   Le missioni sulle notti diventano missioni sull'orda simulata (stesso premio).
   ========================================================= */
window.ORDA_SIM=true;
/* ---- la scheda: tolgo "Gioca la notte" e le fisarmoniche ---- */
const _ordaUnifySim=ordaUnify;ordaUnify=function(){_ordaUnifySim();try{if(!ORDA_SIM||S.tab!=='orda')return;const pg=app.querySelector('.page');if(!pg)return;
  pg.querySelectorAll('.odplay,details.ofold').forEach(e=>{e.hidden=true;e.dataset.ohide='1';});
  const n=pg.querySelector('.fronte .frinfo p.muted');if(n)n.innerHTML='Strade: <b style="color:#2f9e44">verde</b> piano · <b style="color:#e8590c">arancio</b> salita verso casa (zombie più lenti) · <b style="color:#d7263d">rosso</b> discesa (più veloci). Tocca uno zombie per vederlo. È una simulazione: l’esito dell’orda lo calcola il server con livello, preparazione e aiuti.';
  const l=pg.querySelector('.lpan');if(l)l.querySelectorAll('p,small').forEach(x=>{if(/vincendo notti/.test(x.textContent))x.textContent='Giri e biglietti si guadagnano riscattando l’orda, completando le missioni e aiutando gli alleati.';});}catch(e){}};
/* ---- le missioni ---- */
const SIMM=[['prep','🛡️','Prepara le case prima della prossima orda'],['watch','🎬','Guarda l’assalto a fumetto'],['claim','🎁','Riscatta i premi dell’orda'],['help','🤝','Manda rinforzi o saluta un alleato'],['gold','💰','Acchiappa lo zombie d’oro sul fronte']];
function tmSimFix(T){if(!T||!T.list||T.sim)return T;let j=(new Date().getDate())%SIMM.length;const used=new Set();
  T.list=T.list.map(m=>{if(['cp','poi','biz','sp'].includes(m.k))return m;let s=SIMM[j%SIMM.length];while(used.has(s[0])){j++;s=SIMM[j%SIMM.length];}used.add(s[0]);j++;
    return{k:s[0],id:s[0],ic:s[1],t:s[2],goal:1,prog:0,done:false,cl:false,rw:m.rw||{c:80,g:2},go:s[0]};});T.sim=true;try{saveLocal();}catch(e){}return T;}
const _tmInitSim=tmInit;tmInit=function(){const T=_tmInitSim();return ORDA_SIM?tmSimFix(T):T;};
/* eventi che completano le missioni */
function tmSim(k){try{tmInit();tmEvent(k,k);if(S.tab==='orda')setTimeout(()=>{try{renderHub();}catch(e){}},1700);}catch(e){}}
setInterval(()=>{try{if(typeof SB==='undefined'||!SB||SB.__tmw||!SB.rpc)return;const o=SB.rpc.bind(SB);
  SB.rpc=async function(n,a){const r=await o(n,a);try{const ok=r&&!r.error&&!(r.data&&r.data.ok===false);if(ok){if(n==='world_prepare')tmSim('prep');else if(n==='world_raid_claim')tmSim('claim');else if(n==='world_send_help'||n==='world_shout')tmSim('help');}}catch(e){}return r;};SB.__tmw=1;}catch(e){}},1000);
const _assaltoSim=assalto;assalto=function(){tmSim('watch');return _assaltoSim.apply(this,arguments);};
const _frZSheetSim=frZSheet;frZSheet=function(k){const before=FR.gold;_frZSheetSim(k);if(k==='oro'&&!before&&FR.gold)tmSim('gold');};
/* "Vai" delle missioni nuove */
const _tmBindSim=tmBind;tmBind=function(){_tmBindSim();try{const p=app.querySelector('.tmp');if(!p||!G.tm)return;p.querySelectorAll('[data-tmg]').forEach(b=>{const m=G.tm.list[+b.dataset.tmg];if(!m||!SIMM.some(s=>s[0]===m.k))return;
  b.onclick=()=>{if(m.k==='watch')return assalto('last');if(m.k==='help'){SOC.tab='squadra';return go('social');}
    const t=m.k==='gold'?app.querySelector('.fronte'):app.querySelector('.opan');if(t){t.scrollIntoView({behavior:'smooth',block:'start'});t.classList.remove('flashme');void t.offsetWidth;t.classList.add('flashme');}
    toast(m.k==='prep'?'🛡️ Tocca “Prepara le case”':m.k==='claim'?'🎁 Tocca “Riscatta” quando l’orda è passata':'💰 Cerca lo zombie d’oro sul fronte e toccalo');};});}catch(e){}};
/* ---- testi e menu senza le notti ---- */
try{const _luckSim=luckTopBind;luckTopBind=function(){_luckSim();try{const p=app.querySelector('.lpan');if(!p)return;['wheel','scratch'].forEach(k=>{const b=p.querySelector(`[data-lt=${k}]`);if(!b)return;const o=b.onclick;
  b.onclick=()=>{if(k==='wheel'&&!(G.spins>0))return toast('Niente giri: riscatta l’orda o completa le missioni');if(k==='scratch'&&!(G.scratch>0))return toast('Niente biglietti: aiuta un alleato o completa le missioni');if(o)o();};});}catch(e){}};}catch(e){}
try{const _zmItemsSim=zmItems;zmItems=function(){const L=_zmItemsSim();const g=L.find(x=>x[0]==='Gioco');if(g)g[1]=g[1].filter(r=>!['g:difendi'].includes(r[2]));return L;};}catch(e){}
</script>
<script>
/* data, ora e meteo stanno nel fronte: il vecchio riquadro "📅 Oggi" non va più rimesso */
oggiPut=function(){try{app.querySelectorAll('.page > .ocal').forEach(e=>{e.hidden=true;e.dataset.ohide='1';});}catch(e){}};
</script>
