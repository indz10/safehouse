<script>
/* =========================================================
   RISORSE (migrazione 012): 🪵 Legno · 🥫 Cibo · ⛽ Carburante accanto ai 🧱 Mattoni
   - le dà solo il server (presidi tenuti, orde, rinforzi, rivali, accesso, valutazione; max 400 al giorno ciascuna)
   - resLoad: world_resources ogni 2 minuti (app in primo piano) → gettoni nella homepage (.hschips) e avviso "+🥫 12"
   - 🔄 Mercato in Bottega (mktFill, chiamato da shopSheet in p31): 20 di una risorsa = 10 🧱, max 100 🧱 al giorno
   ========================================================= */
const RES={d:null,t:0};
const RESK=[['legno','🪵','Legno','parchi e campi sportivi'],['cibo','🥫','Cibo','piazze, centri e chiese'],['carb','⛽','Carburante','stazioni, polizia e pompieri']];
async function resLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return RES.d;if(!force&&Date.now()-RES.t<20000)return RES.d;RES.t=Date.now();
  try{const{data,error}=await SB.rpc('world_resources');if(error||!data||data.ok===false)return RES.d;
    const old=RES.d;RES.d=data;
    if(old){const up=RESK.filter(([k])=>(data[k]||0)>(old[k]||0)).map(([k,ic])=>`${ic} +${data[k]-old[k]}`);if(up.length)toast(up.join(' · '));}
    resPaint();}catch(e){}return RES.d;}
function resChips(){const d=RES.d;if(!d)return'';return RESK.map(([k,ic,n])=>`<span class="resc" title="${n}">${ic} ${wNum(d[k]||0)}</span>`).join('');}
function resPaint(){try{const h=app.querySelector('.hschips');if(!h||!RES.d)return;h.querySelectorAll('.resc').forEach(x=>x.remove());
  const m=[...h.children].find(x=>/🧱/.test(x.textContent)&&!x.classList.contains('eqc'));(m||h.firstElementChild||h).insertAdjacentHTML(m?'afterend':'beforeend',resChips());}catch(e){}}
/* i gettoni vanno rimessi quando la homepage si ridisegna */
zEvery(()=>{try{if(!S.user||document.hidden)return;const h=app&&app.querySelector('.hschips');if(h&&RES.d&&!h.querySelector('.resc'))resPaint();
  if(Date.now()-RES.t>120000)resLoad();}catch(e){}},2000,'risorse');
setTimeout(()=>{try{resLoad(true);}catch(e){}},2500);
/* 🔄 Mercato in Bottega */
async function mktFill(c){const box=c.querySelector('.mktbox');if(!box)return;if(!S.user||typeof SB==='undefined'||!SB){box.remove();return;}
  const d=await resLoad(true);if(!d){box.innerHTML='<p class="muted" style="font-size:13px">Il Mercato arriva dopo l’aggiornamento del server.</p>';return;}
  box.innerHTML=`<h4 class="hh">🔄 Mercato del superstite</h4><p class="muted" style="font-size:13px;margin:0 0 8px">Le risorse si raccolgono tenendo i 🚩 presidi veri, reggendo le orde e aiutando gli alleati. Qui le scambi: <b>20 = 🧱 10</b> (oggi ancora 🧱 ${d.mercato_left}).</p>
    <div class="mktgrid">${RESK.map(([k,ic,n,da])=>`<div class="mktr"><span class="mki">${ic}</span><div><b>${n}: ${wNum(d[k]||0)}</b><small>da ${da}</small></div><button class="btn small" data-mk="${k}" ${(d[k]||0)<20||d.mercato_left<=0?'disabled':''}>20 → 🧱 10</button></div>`).join('')}</div>`;
  box.querySelectorAll('[data-mk]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_trade',{p_kind:b.dataset.mk,p_n:20});if(error)throw error;
      toast(data.ok?`🔄 +🧱 ${data.mattoni}`:data.msg);if(data.ok){try{await wMine(true);}catch(e){}}}catch(e){toast('Non riuscito');}RES.t=0;mktFill(c);});}
</script>
