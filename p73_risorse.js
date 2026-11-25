<script>
/* =========================================================
   RISORSE (migrazione 012): 🪵 Legno · 🥫 Cibo · ⛽ Carburante accanto ai 🧱 Mattoni
   - le dà solo il server (presidi tenuti, orde, rinforzi, rivali, accesso, valutazione; max 400 al giorno ciascuna)
   - resLoad: world_resources ogni 2 minuti (app in primo piano) → gettoni nella homepage (.hschips) e avviso "+🥫 12"
   - 🔄 Cambio in Bottega (mktFill → cmbFill, chiamato da shopSheet in p31): da 💎/🥫/🪵/⛽/🧱 a 🥫/🪵/⛽/🧱, quantità libera (world_cambio, migrazione 053)
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
/* 🔄 CAMBIO LIBERO (migrazione 053): da cosa, in cosa e quanto lo decide il giocatore; regole in w_cambio_cfg sul server */
const CMB_K={gemme:['💎','Gemme'],cibo:['🥫','Cibo'],legno:['🪵','Legno'],carb:['⛽','Carburante'],mattoni:['🧱','Mattoni']};
async function cmbFill(box,da0,a0){if(!box)return;if(!S.user||typeof SB==='undefined'||!SB){box.innerHTML='<p class="muted">Accedi per cambiare le risorse.</p>';return;}
  let d=null;try{const r=await SB.rpc('world_cambio_info');d=r.data;}catch(e){}
  if(!d||!d.ok){box.innerHTML='<p class="muted" style="font-size:13px">Il Cambio arriva dopo l’aggiornamento del server (blocco SQL 053).</p>';return;}
  let da=CMB_K[da0]?da0:'gemme',a=a0&&a0!==da&&a0!=='gemme'?a0:(da==='mattoni'?'cibo':'mattoni');const V=d.valori,sal=d.saldo||{};
  const comm=()=>da==='gemme'?0:d.comm;const mx=()=>Math.min(sal[da]||0,da==='gemme'?d.max_gemme:d.max_altro);
  const calc=n=>{let r=Math.floor(n*V[da]*(100-comm())/100/V[a]);if(da!=='gemme'&&r>d.resta[a]){n=Math.ceil(d.resta[a]*V[a]*100/(V[da]*(100-comm())));r=Math.min(d.resta[a],Math.floor(n*V[da]*(100-comm())/100/V[a]));}return{n,r};};
  const paint=()=>{const q=box.querySelector('.cmbq input'),v=q?q.value:'';
    box.innerHTML=`<h4 class="hh">🔄 Cambio</h4><p class="muted" style="font-size:12.5px;margin:0 0 4px">Scegli cosa dai, cosa vuoi e scrivi quanto. Dalle 💎 il cambio è pieno; tra risorse il mercato trattiene il ${d.comm}%${d.comm>10?' (meno con l’abilità Mercante)':''}. Le gemme non si ottengono dalle risorse.</p>
      <b class="cmbl">Dai</b><div class="gemris">${Object.keys(CMB_K).map(k=>`<button type="button" data-cda="${k}" class="${k===da?'on':''}">${CMB_K[k][0]} ${CMB_K[k][1]}<small>hai ${wNum(sal[k]||0)}</small></button>`).join('')}</div>
      <b class="cmbl">Ricevi</b><div class="gemris">${Object.keys(CMB_K).filter(k=>k!=='gemme'&&k!==da).map(k=>`<button type="button" data-ca="${k}" class="${k===a?'on':''}">${CMB_K[k][0]} ${CMB_K[k][1]}<small>${da==='gemme'?'1💎 = '+Math.floor(V.gemme/V[k]):'oggi ancora '+d.resta[k]}</small></button>`).join('')}</div>
      <b class="cmbl">Quanto ${CMB_K[da][0]}</b><div class="cmbq"><input type="number" inputmode="numeric" min="1" max="${mx()}" placeholder="0" value="${v}"><button type="button" data-cq="meta">Metà</button><button type="button" data-cq="max">Tutto</button></div>
      <p class="gemprev"></p><button class="btn wide" data-cgo>Cambia</button>`;
    const inp=box.querySelector('.cmbq input'),go=box.querySelector('[data-cgo]'),pv=box.querySelector('.gemprev');
    const prev=()=>{const n=Math.floor(+inp.value||0);if(n<1){pv.innerHTML=`Scrivi quanti ${CMB_K[da][0]} vuoi dare (massimo ${wNum(mx())}).`;go.disabled=true;return;}
      if(n>mx()){pv.innerHTML=`Al massimo <b>${CMB_K[da][0]} ${wNum(mx())}</b>.`;go.disabled=true;return;}
      if(da!=='gemme'&&d.resta[a]<=0){pv.innerHTML=`Oggi hai già ricevuto il massimo di ${CMB_K[a][0]} dai cambi: riprova domani.`;go.disabled=true;return;}
      const c=calc(n);if(c.r<1){pv.innerHTML='Troppo poco: aumenta la quantità.';go.disabled=true;return;}
      pv.innerHTML=`Dai <b>${CMB_K[da][0]} ${wNum(c.n)}</b> → ricevi <b>${CMB_K[a][0]} ${wNum(c.r)}</b>${comm()?` · mercato ${comm()}%`:''}${c.n<n?` <small>(tetto di oggi: uso solo ${wNum(c.n)})</small>`:''}`;go.disabled=false;};
    inp.oninput=prev;prev();
    box.querySelectorAll('[data-cda]').forEach(b=>b.onclick=()=>{da=b.dataset.cda;if(a===da)a=da==='mattoni'?'cibo':'mattoni';inp.value='';paint();});
    box.querySelectorAll('[data-ca]').forEach(b=>b.onclick=()=>{a=b.dataset.ca;paint();});
    box.querySelectorAll('[data-cq]').forEach(b=>b.onclick=()=>{let n=b.dataset.cq==='max'?mx():Math.floor(mx()/2);if(da!=='gemme'&&n>0)n=Math.min(n,calc(n).n);inp.value=n||'';prev();});
    go.onclick=async()=>{const n=Math.floor(+inp.value||0);go.disabled=true;const key=Date.now()+'-'+Math.random().toString(36).slice(2,7);
      try{const{data,error}=await SB.rpc('world_cambio',{p_da:da,p_a:a,p_n:n,p_chiave:key});if(error)throw error;toast(data.msg);
        if(data.ok){try{sfx&&sfx('coin');}catch(e){}RES.t=0;try{resLoad(true);wMine(true);if(typeof gemLoad==='function')gemLoad(true);}catch(e){}}}catch(e){toast('Non riuscito: riprova');}
      cmbFill(box,da,a);};};
  paint();}
/* la Bottega usa il Cambio al posto del vecchio Mercato a pacchetti fissi */
async function mktFill(c){const box=c.querySelector('.mktbox');if(!box)return;if(!S.user||typeof SB==='undefined'||!SB){box.remove();return;}box.classList.add('cmbbox');return cmbFill(box,'gemme');}
</script>
