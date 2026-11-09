<script>
/* =========================================================
   UNA SOLA PAGINA PER OGNI CASA (a schermo intero)
   Homepage "La mia casa", Mappa, Orda (fronte), La mia casa → tutte qui.
   In cima: fila delle case. Poi: disegno vero, TUTTE le fortificazioni (comprabili),
   casa vera (valutazione), chi arriva + simulatore, azioni, lavori in zona, diario.
   ========================================================= */
function hpSwitcher(cur){const H=myHouses();if(H.length<2)return'';return`<div class="hpsel">${H.map((h,i)=>{const on=(h.home&&cur.home)||(!h.home&&!cur.home&&h.bid===cur.bid);const c=(typeof frChanceOf==='function')?frChanceOf(h):null;
  return`<button data-hps="${i}" class="${on?'on':''}"><b>${h.ic} ${esc(h.label)}</b><small>${c!=null?c+'%':''}</small></button>`;}).join('')}</div>`;}
const _closeSheetHP=closeSheet;closeSheet=function(){const r=_closeSheetHP.apply(this,arguments);try{document.getElementById('sheet').classList.remove('hfull');}catch(e){}return r;};
/* tutte le strade portano alla pagina della casa */
const _renderHomeHP=renderHome;renderHome=function(){_renderHomeHP();try{const b=app.querySelector('[data-hs=casa]');if(b)b.onclick=async()=>{let home=S.user&&myHouses().find(x=>x.home);
    /* Fase 4a: se i dati delle case non sono ancora arrivati li aspetto, invece di aprire la vecchia "La mia casa" */
    if(!home&&S.user){b.disabled=true;try{await wMine(true);}catch(e){}b.disabled=false;home=myHouses().find(x=>x.home);}
    if(home)houseSheet(home);else go('casa');};}catch(e){}};
const _casaAllHP=casaAll;casaAll=async function(){await thrLoad(true);await _casaAllHP();try{app.querySelectorAll('.mycasa2').forEach(c=>{const h=myHouses().filter(x=>!x.home)[+c.dataset.mc];c.querySelectorAll('[data-mcs]').forEach(b=>b.onclick=()=>houseSheet(h));});}catch(e){}};
</script>
