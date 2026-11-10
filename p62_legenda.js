<script>
/* =========================================================
   "🔎 Sul disegno": sotto ogni casa l'elenco delle modifiche DAVVERO disegnate
   + finestre illuminate dopo il tramonto vero
   ========================================================= */
function hLegend(h,o,g){const L=[];const a=o.a||{};const d=o.defs||{};
  if(o.prep)L.push('🛡️ Assi alle finestre (case preparate)');
  if(h.home){if(a.porta==='blindata'||a.porta==='b4')L.push('🚪 Porta blindata');if(a.grate==='tutte'||a.grate==='alcune')L.push('▦ Grate alle finestre');if(a.vetri==='anti')L.push('🪟 Vetri antisfondamento');
    if(a.luci==='sensore')L.push('💡 Luce a sensore');if(a.allarme==='allarme')L.push('🚨 Allarme');if(a.allarme==='cam')L.push('📹 Telecamera');if(a.recinzione&&a.recinzione!=='no')L.push('🧱 Recinzione');}
  Object.keys(ZDEF||{}).forEach(k=>{const v=Math.min(3,d[k]||0);if(v)L.push(`${ZDEF[k][0]} ${ZDEF[k][1]} ${'●'.repeat(v)}${'○'.repeat(3-v)}`);});
  if((o.lvl||1)>=5)L.push('✨ Scudo di livello 5');if(o.helps)L.push(`🤝 ${o.helps} alleati alla porta`);if(g&&g.pools&&g.pools.length)L.push('🏊 Piscina');
  return L;}
const _drawHouseLg=drawHouse;drawHouse=async function(el,h,o={}){o=Object.assign({},o);if(o.night===undefined){try{o.night=zIsNight(h.lat,h.lon);}catch(e){}}
  if(o.prep===undefined)o.prep=!!(OR.s&&OR.s.prepared);if(o.lvl===undefined){const T=typeof thrOf==='function'?thrOf(h):null;o.lvl=T?T.level:(h.level||1);}
  if(o.defs==null){const T=typeof thrOf==='function'?thrOf(h):null;if(T)o.defs=T.defs||{};}if(h.home&&!o.a)o.a=S.answers||{};
  const g=await _drawHouseLg.call(this,el,h,o);
  try{if(el&&!o.noLegend&&!el.closest('#fumetto,.mhouses,.mhart')&&el.isConnected){let lg=el.nextElementSibling;if(!lg||!lg.classList.contains('hlegend')){lg=document.createElement('div');lg.className='hlegend';el.after(lg);}
    const L=hLegend(h,o,g&&g.geo?g.geo:g);lg.innerHTML=L.length?`<b>🔎 Sul disegno</b>${L.map(x=>`<span>${esc(x)}</span>`).join('')}`:'<b>🔎 Sul disegno</b><span class="muted">ancora nessuna modifica: le fortificazioni che compri compaiono qui e sulla casa</span>';}}catch(e){}
  return g;};
/* pagina della casa: il disegno viene copiato dentro, quindi la legenda la aggiungo dopo */
async function hLegendPut(box,h){try{if(!box||!box.isConnected)return;const T=typeof thrOf==='function'?thrOf(h):null;
  const o={prep:!!(OR.s&&OR.s.prepared),lvl:T?T.level:(h.level||1),defs:T?T.defs||{}:{},a:h.home?(S.answers||{}):{},helps:h.home?Math.min(4,+((OR.s&&OR.s.helps_in)||0)):0};
  let g=null;try{g=await bGeom(h.lat,h.lon);}catch(e){}let lg=box.nextElementSibling;if(!lg||!lg.classList.contains('hlegend')){lg=document.createElement('div');lg.className='hlegend';box.after(lg);}
  const L=hLegend(h,o,g);lg.innerHTML=L.length?`<b>🔎 Sul disegno</b>${L.map(x=>`<span>${esc(x)}</span>`).join('')}`:'<b>🔎 Sul disegno</b><span class="muted">ancora nessuna modifica: le fortificazioni che compri compaiono qui e sulla casa</span>';}catch(e){}}
/* miniature della barra "Le tue case" (Mappa): disegno vero al posto delle icone generiche */
</script>
