<script>
/* =========================================================
   UNA SOLA PAGINA PER OGNI CASA (a schermo intero)
   Homepage "La mia casa", Mappa, Orda (fronte), La mia casa → tutte qui.
   In cima: fila delle case. Poi: disegno vero, TUTTE le fortificazioni (comprabili),
   casa vera (valutazione), chi arriva + simulatore, azioni, lavori in zona, diario.
   ========================================================= */
function hpSwitcher(cur){const H=myHouses();if(H.length<2)return'';return`<div class="hpsel">${H.map((h,i)=>{const on=(h.home&&cur.home)||(!h.home&&!cur.home&&h.bid===cur.bid);const c=(typeof frChanceOf==='function')?frChanceOf(h):null;
  return`<button data-hps="${i}" class="${on?'on':''}"><b>${h.ic} ${esc(h.label)}</b><small>${c!=null?c+'%':''}</small></button>`;}).join('')}</div>`;}
const _houseSheetHP=houseSheet;houseSheet=async function(h){await thrLoad(true);await _houseSheetHP(h);try{const sh=document.getElementById('sheet');if(!sh||!sh.classList.contains('open'))return;sh.classList.add('hfull');
  const c=sh.querySelector('.sheet-b');if(!c||c.dataset.hp)return;c.dataset.hp='1';const T=thrOf(h);
  /* fila delle case */
  c.insertAdjacentHTML('afterbegin',hpSwitcher(h));c.querySelectorAll('[data-hps]').forEach(b=>b.onclick=()=>{const x=myHouses()[+b.dataset.hps];if(x)houseSheet(x);});
  /* tutte le fortificazioni al posto delle 4 consigliate */
  const fp=c.querySelector('.fortpan');if(fp&&T){const s=OR.s||{};fp.innerHTML=`<h4 class="hh">🧱 Fortificazioni di questa casa <small style="font-weight:400;font-size:12px">· tocca per comprare</small></h4>
     <p class="muted" style="font-size:12px;margin:0 0 6px">In alto le più utili contro gli zombie e il meteo di questa casa (${(EVN[T.ev]||EVN.calma)[0]} ${(EVN[T.ev]||EVN.calma)[1].toLowerCase()}).</p>
     <div class="rinf">${!s.prepared?'<button class="fch no up" data-fprep><span>🛡️ Prepara le case</span><small><b>+15</b> difesa · gratis</small></button>':'<span class="ok fdone">✓ 🛡️ Case preparate per la prossima orda</span>'}${fortChips(T,true)}</div>`;
    const redo=()=>houseSheet(h);fp.querySelectorAll('[data-fk]').forEach(b=>b.onclick=()=>{const o=fortOpts(T).find(x=>x.k===b.dataset.fk);if(o)fortBuy(h,T,o,redo);});
    const pr=fp.querySelector('[data-fprep]');if(pr)pr.onclick=async()=>{pr.disabled=true;try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);await orLoad(true);redo();}catch(e){toast(e.message||'Non riuscito');pr.disabled=false;}};
    /* subito sotto il disegno */const art=c.querySelector('.hsart');const hd=c.querySelector('.hshead');const anchor=(hd&&hd.nextElementSibling)||art;if(anchor&&fp!==anchor.nextElementSibling)anchor.after(fp);}
  /* casa vera: le voci della valutazione */
  if(h.home&&S.answers&&!c.querySelector('.hpreal')){const a=S.answers;const R=[['🚪','Porta blindata',a.porta==='blindata'||a.porta==='b4'],['▦','Grate alle finestre',a.grate==='tutte'||a.grate==='alcune'],['🪟','Vetri antisfondamento',a.vetri==='anti'],['💡','Luci a sensore',a.luci==='sensore'],['🚨','Allarme o telecamere',a.allarme==='allarme'||a.allarme==='cam'],['🧱','Recinzione',a.recinzione&&a.recinzione!=='no']];
    const lv=(typeof scudoLv==='function')?scudoLv():0;(c.querySelector('.fortpan')||c.querySelector('.hshead')).insertAdjacentHTML('afterend',`<div class="hpreal"><h4 class="hh">🏠 La casa vera (dalla valutazione) <small style="font-weight:400;font-size:12px">· Scudo ${lv}/5 = +${lv*2} difesa a tutte le case</small></h4>
      <div class="rinf">${R.map(([ic,t,ok])=>`<button class="fch ${ok?'ok':'no'}" data-hpr><span>${ic} ${t}</span><small>${ok?'fatto':'aggiorna la valutazione'}</small></button>`).join('')}</div></div>`);
    c.querySelectorAll('[data-hpr]').forEach(b=>b.onclick=()=>{if(b.classList.contains('ok'))return;closeSheet();S.step=1;go('valuta');});}
  /* diario */
  if(!c.querySelector('.hpdia')){c.insertAdjacentHTML('beforeend',`<details class="man mcdia hpdia"><summary>🕑 Diario delle modifiche</summary><div class="man-b" data-hpdl><p class="muted"><span class="spin"></span></p></div></details>`);
    const d=c.querySelector('.hpdia');d.addEventListener('toggle',async()=>{if(d.open)d.querySelector('[data-hpdl]').innerHTML=diaryHTML(await diaryLoad(h.bid||'home'));});}
  try{coinText(sh);}catch(e){}}catch(e){console.warn(e);}};
const _closeSheetHP=closeSheet;closeSheet=function(){const r=_closeSheetHP.apply(this,arguments);try{document.getElementById('sheet').classList.remove('hfull');}catch(e){}return r;};
/* tutte le strade portano alla pagina della casa */
const _renderHomeHP=renderHome;renderHome=function(){_renderHomeHP();try{const b=app.querySelector('[data-hs=casa]');if(b)b.onclick=()=>{const home=S.user&&myHouses().find(x=>x.home);if(home)houseSheet(home);else go('casa');};}catch(e){}};
const _casaAllHP=casaAll;casaAll=async function(){await thrLoad(true);await _casaAllHP();try{app.querySelectorAll('.mycasa2').forEach(c=>{const h=myHouses().filter(x=>!x.home)[+c.dataset.mc];c.querySelectorAll('[data-mcs]').forEach(b=>b.onclick=()=>houseSheet(h));});}catch(e){}};
</script>
