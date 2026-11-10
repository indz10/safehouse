<script>
/* =========================================================
   ORDA TUTTA SIMULATA: niente "Difendi tu" (notti, battaglia, campagna, attrezzi)
   Scheda Orda = 🗺️ Fronte · 🧟 Orda del mondo · 🎁 Premi e fortuna · 🎯 Missioni
   Le missioni sulle notti diventano missioni sull'orda simulata (stesso premio).
   ========================================================= */
window.ORDA_SIM=true;
/* ---- la scheda: tolgo "Gioca la notte" e le fisarmoniche ---- */
/* ---- le missioni ---- */
const SIMM=[['prep','🛡️','Prepara le case prima della prossima orda'],['watch','🎬','Guarda l’assalto a fumetto'],['claim','🎁','Riscatta i premi dell’orda'],['help','🤝','Manda rinforzi o saluta un alleato'],['gold','💰','Acchiappa lo zombie d’oro sul fronte']];
function tmSimFix(T){if(!T||!T.list||T.sim)return T;let j=(new Date().getDate())%SIMM.length;const used=new Set();
  T.list=T.list.map(m=>{if(['cp','poi','biz','sp'].includes(m.k))return m;let s=SIMM[j%SIMM.length];while(used.has(s[0])){j++;s=SIMM[j%SIMM.length];}used.add(s[0]);j++;
    return{k:s[0],id:s[0],ic:s[1],t:s[2],goal:1,prog:0,done:false,cl:false,rw:m.rw||{c:80,g:2},go:s[0]};});T.sim=true;try{saveLocal();}catch(e){}return T;}
/* eventi che completano le missioni */
function tmSim(k){try{tmInit();tmEvent(k,k);if(S.tab==='orda')setTimeout(()=>{try{renderHub();}catch(e){}},1700);}catch(e){}}
zEvery(()=>{try{if(typeof SB==='undefined'||!SB||SB.__tmw||!SB.rpc)return;const o=SB.rpc.bind(SB);
  SB.rpc=async function(n,a){const r=await o(n,a);try{const ok=r&&!r.error&&!(r.data&&r.data.ok===false);if(ok){if(n==='world_prepare')tmSim('prep');else if(n==='world_raid_claim')tmSim('claim');else if(n==='world_send_help'||n==='world_shout')tmSim('help');}}catch(e){}return r;};SB.__tmw=1;}catch(e){}},1000);
/* "Vai" delle missioni nuove */
/* ---- testi e menu senza le notti ---- */
</script>
<script>
/* data, ora e meteo stanno nel fronte: il vecchio riquadro "📅 Oggi" non va più rimesso */
</script>
