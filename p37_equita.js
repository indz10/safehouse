<script>
/* =========================================================
   EQUITÀ DEL MONDO UNICO (le regole stanno sul server, qui si mostrano)
   1 Kit di benvenuto  2 Scudo 14 giorni  3 Spinta di recupero +50%
   4 Leghe  5 Case più care per chi ne ha tante  6 Padrino
   ========================================================= */
window.EQ={s:null,t:0};
async function eqLoad(force){if(!S.user||(typeof SB==='undefined'||!SB))return null;if(!force&&EQ.s&&Date.now()-EQ.t<10*60*1000)return EQ.s;
  try{const{data,error}=await SB.rpc('world_status_extra');if(error)throw error;EQ.s=data;EQ.t=Date.now();eqPaint();}catch(e){}return EQ.s;}
/* 1) kit di benvenuto: una volta per account (il server lo garantisce) */
async function eqWelcome(){if(!S.user||(typeof SB==='undefined'||!SB))return;const k='zsh_kit_'+S.user.id;try{if(localStorage.getItem(k))return;}catch(e){}
  try{const{data,error}=await SB.rpc('world_welcome');if(error)throw error;try{localStorage.setItem(k,'1');}catch(e){}
    if(data&&data.got>0){try{G.gems=(G.gems||0)+50;saveLocal();}catch(e){}if(typeof wMine==='function')wMine(true);await eqLoad(true);
      openSheet('🎁 Benvenuto nel mondo!',`<div class="kitbox"><div><b>🧱 300</b><small>Mattoni</small></div><div><b>💎 50</b><small>gemme</small></div><div><b>🛡️ 14</b><small>giorni di scudo</small></div></div>
        <p style="font-weight:400">Con i Mattoni puoi comprare subito una seconda casa. Per 14 giorni <b>nessun giocatore può mandarti orde o dispetti</b> (se ne fai tu, lo scudo finisce).</p>
        <p style="font-weight:400">E finché sei sotto il livello medio della tua zona, ogni Mattone che guadagni vale <b>+50%</b>.</p><button class="btn" data-kgo>🌍 Vai al mondo</button>`,c=>{c.querySelector('[data-kgo]').onclick=()=>{closeSheet();go('mappa');};});}}catch(e){}}
/* indicatori: scudo, spinta, lega */
function eqChips(){const s=EQ.s;if(!s)return'';return[s.shield?`<span class="eqc sh">🛡️ Scudo ${s.shield_days} g</span>`:'',s.boost?`<span class="eqc bo">🚀 +50% 🧱</span>`:'',s.league?`<span class="eqc lg">🏅 ${esc(s.league)}</span>`:''].join('');}
function eqPaint(){try{const h=app.querySelector('.hschips');if(h){h.querySelectorAll('.eqc').forEach(x=>x.remove());h.insertAdjacentHTML('beforeend',eqChips());}}catch(e){}
  try{const r=app.querySelector('.rivhead');if(r&&EQ.s){let x=r.querySelector('.eqriv');const t=EQ.s.shield?`🛡️ Hai lo <b>scudo del nuovo arrivato</b> ancora per ${EQ.s.shield_days} giorni: nessuno può mandarti orde o dispetti. Se ne fai tu, lo perdi.`:'';
    if(t){if(!x){r.insertAdjacentHTML('beforeend','<p class="eqriv"></p>');x=r.querySelector('.eqriv');}x.innerHTML=t;}else if(x)x.remove();}}catch(e){}}
const _renderHomeEq=renderHome;renderHome=function(){_renderHomeEq();eqPaint();if(S.user){eqLoad();}};
/* al collegamento: kit e stato */
/* 2) rivali con lo scudo: pulsanti spenti */
EQ.rank={};
async function eqRank(){const p=SOC.rp||'settimana';try{const{data,error}=await SB.rpc('world_rank_lega',{p_period:p});if(error)throw error;EQ.rank[p]=data||[];}catch(e){EQ.rank[p]={err:e.message};}if(S.tab==='social'&&SOC.tab==='classifiche'&&SOC.rs==='lega')eqRankPaint();}
function eqRankPaintBase(){const B=app.querySelector('#socBody');if(!B)return;const p=SOC.rp||'settimana';const L=EQ.rank[p];const seg=B.querySelector('.schips');const box=seg&&seg.nextElementSibling;if(!box)return;
  const lg=EQ.s&&EQ.s.league||'';const head=`<p class="muted" style="font-size:12.5px;margin:0 0 6px">🏅 Lega <b>${esc(lg)}</b>: Bronzo 1–5 · Argento 6–12 · Oro 13–20 · Diamante 21+. Giochi solo contro chi ha il tuo livello.</p>`;
  if(L==null){box.innerHTML=head+'<p class="muted"><span class="spin"></span> Carico la tua lega…</p>';if(!EQ._rq){EQ._rq=1;eqRank().finally(()=>EQ._rq=0);}return;}
  if(L.err){box.innerHTML=head+`<p class="muted">Classifica della lega non disponibile (${esc(L.err)}).</p>`;return;}
  box.innerHTML=head+(L.length?L.map(r=>`<div class="srank ${r.me?'me':''}"><span class="rpos">${r.pos<=3?['🥇','🥈','🥉'][r.pos-1]:r.pos}</span><div class="stx">${socNick(r.user_id,r.nick)}<small>livello ${r.wlevel}${r.comune?' · '+esc(r.comune):''}</small></div><b>🧱 ${wNum(r.punti)}</b></div>`).join(''):'<p class="muted">Ancora nessuno nella tua lega questa settimana: puoi essere il primo!</p>');}
/* 3) spinta e 5) prezzo progressivo spiegati nella scheda casa e nel preventivo */
/* 6) padrino: nell'invito si spiega il premio */
setInterval(()=>{if(S.user&&document.visibilityState==='visible')eqLoad();},5*60*1000);
</script>
