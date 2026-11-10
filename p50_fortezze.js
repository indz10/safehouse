<script>
/* =========================================================
   FORTIFICAZIONI CON UN TOCCO
   - nelle schede "La mia casa": ogni rinforzo è un pulsante con costo e +% (si compra subito)
   - nella scheda della casa: "🎯 Fortificazioni consigliate" per gli zombie e il meteo di QUELLA casa
   - versione dell'app nel menu (per capire se un telefono è aggiornato)
   ========================================================= */
const APPV='__BUILD__';
function fortOpts(T){if(!T)return[];const base=thrCalc(T).ch;const L=[];
  DKS.forEach(k=>{const cur=(T.defs||{})[k]||0;if(cur>=3){L.push({k,cur,max:true,gain:0,cost:0});return;}const nx=thrCalc(T,{defs:{[k]:cur+1}}).ch;L.push({k,cur,cost:80*(cur+1),gain:nx-base,to:nx});});
  if(T.level<5){const nx=thrCalc(T,{level:T.level+1}).ch;L.push({k:'_lvl',cur:T.level,cost:150*T.level,gain:nx-base,to:nx});}
  return L.sort((a,b)=>(b.gain/(b.cost||1e9))-(a.gain/(a.cost||1e9))||b.gain-a.gain);}
function fortLabel(o){if(o.k==='_lvl')return`⬆️ Livello ${o.cur} → ${o.cur+1}`;const d=ZDEF[o.k];return`${d[0]} ${d[1]} ${'●'.repeat(o.cur)}${'○'.repeat(3-o.cur)}`;}
async function fortBuy(h,T,o,after){const m=(window.W&&W.m&&W.m.mattoni)||0;const base=thrCalc(T).ch;
  if(o.max){toast('Già al massimo');return;}if(m<o.cost){toast(`Servono 🧱 ${wNum(o.cost)} (ne hai ${wNum(m)})`);shopSheet(o.cost-m);return;}
  if(!confirm(`${fortLabel(o)}\nCosto 🧱 ${wNum(o.cost)} · questa casa passa dal ${base}% al ${o.to}% di tenuta. Confermi?`))return;
  try{if(o.k==='_lvl'){const r=await wRpc('world_upgrade',{p_bid:T.bid});if(!r.ok)throw new Error(r.msg);}
    else{const{data,error}=await SB.rpc('world_def_upgrade',{p_bid:T.bid,p_kind:o.k});if(error)throw error;if(!data.ok)throw new Error(data.msg);diaryAdd(T.bid,`Fortificazione: ${ZDEF[o.k][1]} livello ${o.cur+1}`);}
    toast(`🛡️ Fatto! Ora tiene il ${o.to}%`);try{sfx('win');}catch(e){}await wMine(true);await thrLoad(true);await defLoad(true);if(after)after();}catch(e){toast(e.message||'Non riuscito');}}
function fortChips(T,all){const L=fortOpts(T);const show=all?L:L.filter(o=>o.gain>0||o.cur>0||o.k==='_lvl');
  return show.map((o,i)=>`<button class="fch ${o.max?'max':o.cur>0?'ok':'no'} ${o.gain>0?'up':''}" data-fk="${o.k}"><span>${fortLabel(o)}</span>${o.max?'<small>massimo</small>':`<small>${o.gain>0?`<b>+${o.gain}%</b> · `:''}🧱 ${wNum(o.cost)}</small>`}</button>`).join('');}
/* ---- 1) schede "La mia casa": rinforzi = pulsanti ---- */
function fortCard(card,h){const T=thrOf(h);const rf=card.querySelector('.rinf');if(!rf||!T||rf.dataset.f)return;rf.dataset.f='1';const s=OR.s||{};
  const real=h.home?[...rf.querySelectorAll('span')].filter(x=>/Porta blindata|Grate alle finestre|Vetri antisfondamento|Luci a sensore|Allarme|Recinzione/.test(x.textContent)):[];
  rf.innerHTML=`${!s.prepared?'<button class="fch no up" data-fprep><span>🛡️ Prepara le case</span><small><b>+15</b> difesa · gratis</small></button>':'<span class="ok fdone">✓ 🛡️ Case preparate</span>'}${fortChips(T,true)}`;
  if(real.length){rf.insertAdjacentHTML('afterend',`<h4 class="hh">🏠 Casa vera (dalla valutazione)</h4><div class="rinf rinfreal">${real.map(x=>`<button class="fch ${x.classList.contains('ok')?'ok':'no'}" data-freal><span>${esc(x.textContent.replace(/^[✓✗]\s*/,''))}</span><small>${x.classList.contains('ok')?'fatto':'aggiorna la valutazione'}</small></button>`).join('')}</div>`);}
  const hh=rf.previousElementSibling;if(hh&&hh.tagName==='H4')hh.innerHTML='🧱 Fortificazioni <small style="font-weight:400;font-size:12px">· tocca per comprare</small>';
  const redo=()=>{const pg=app.querySelector('.page');if(pg)delete pg.dataset.all;go('casa');};
  rf.querySelectorAll('[data-fk]').forEach(b=>b.onclick=()=>{const o=fortOpts(T).find(x=>x.k===b.dataset.fk);if(o)fortBuy(h,T,o,redo);});
  const pr=rf.querySelector('[data-fprep]');if(pr)pr.onclick=async()=>{pr.disabled=true;try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);await orLoad(true);await thrLoad(true);redo();}catch(e){toast(e.message||'Non riuscito');pr.disabled=false;}};
  card.querySelectorAll('[data-freal]').forEach(b=>b.onclick=()=>{if(b.classList.contains('ok'))return;S.step=1;go('valuta');});}
const _casaAllF=casaAll;casaAll=async function(){await _casaAllF();try{const H=myHouses();const home=H.find(h=>h.home);const hc=app.querySelector('.page > .mycasa:not(.mycasa2)');if(hc&&home)fortCard(hc,home);
  const L=H.filter(h=>!h.home);app.querySelectorAll('.mycasa2').forEach(c=>{const h=L[+c.dataset.mc];if(h)fortCard(c,h);});}catch(e){console.warn(e);}};
/* ---- 2) scheda della casa: fortificazioni consigliate ---- */
/* ---- 3) versione dell'app nel menu ---- */
function appVerTxt(){const v=String(APPV);return /^\d{12}$/.test(v)?`${v.slice(6,8)}/${v.slice(4,6)} ${v.slice(8,10)}:${v.slice(10,12)} (zsh-${v})`:v;}
</script>
