<script>
/* =========================================================
   PRESIDI VERI CONDIVISI (Fase 9b)
   Luoghi pubblici veri (OpenStreetMap: parchi, piazze, stazioni, scuole…), uguali per tutti (Supabase, migrazione 006).
   - chi ha una casa entro 1 km occupa un presidio libero (max 3);
   - ogni orda attacca anche i presidi: attacco 50–99, difesa 55 + 12 per guardia (max 5: chi lo tiene e i suoi alleati);
   - se cade torna libero; finché è tenuto dà +3 di difesa a TUTTE le case entro 500 m (max +6), calcolato dal server.
   Mappa: segnaposto 🚩 (presDraw, chiamato da liveMap in p65) e pulsante "🚩 Presidi" (presList).
   ========================================================= */
const PRES_K={parco:['🌳','Parco'],piazza:['⛲','Piazza'],stazione:['🚆','Stazione'],municipio:['🏛️','Municipio'],biblioteca:['📚','Biblioteca'],scuola:['🏫','Scuola'],
  ospedale:['🏥','Ospedale'],pompieri:['🚒','Vigili del fuoco'],polizia:['🚓','Forze dell’ordine'],chiesa:['⛪','Chiesa'],centro:['🏟️','Centro civico'],sport:['⚽','Campo sportivo']};
const PRES={d:null,L:[]};
/* tipo di presidio dai tag di OpenStreetMap */
function presKind(t){const a=t.amenity,l=t.leisure;
  if(l==='park'||l==='garden'||l==='playground')return'parco';if(t.place==='square')return'piazza';if(t.railway==='station'||t.public_transport==='station')return'stazione';
  if(a==='townhall')return'municipio';if(a==='library')return'biblioteca';if(a==='school')return'scuola';if(a==='hospital')return'ospedale';if(a==='fire_station')return'pompieri';
  if(a==='police')return'polizia';if(a==='place_of_worship')return'chiesa';if(a==='community_centre')return'centro';if(l==='sports_centre'||l==='stadium')return'sport';return null;}
/* % di tenere la prossima orda: difesa contro attacco da 50 a 99 */
function presChance(p){const a0=(PRES.d&&PRES.d.attacco_min)||50,a1=(PRES.d&&PRES.d.attacco_max)||99;return Math.max(0,Math.min(100,Math.round((p.difesa-a0+1)/(a1-a0+1)*100)));}
/* l'app manda al server i luoghi pubblici vicino alle mie case (una volta a settimana per zona di ~2 km) */
async function presSeed(lat,lon){if(!S.user||(typeof SB==='undefined'||!SB))return 0;
  const near=myHouses().some(h=>h.lat!=null&&trM(h.lat,h.lon,lat,lon)<2500);if(!near)return 0;
  const key=Math.round(lat*50)+'|'+Math.round(lon*50);let M={};try{M=JSON.parse(localStorage.getItem('zsh_pres_seed')||'{}');}catch(e){}
  if(M[key]&&Date.now()-M[key]<7*864e5)return 0;
  const A=`(around:1500,${lat.toFixed(5)},${lon.toFixed(5)})`;
  const q=`[out:json][timeout:20];(nwr["leisure"~"^(park|garden|playground|sports_centre|stadium)$"]["name"]${A};nwr["place"="square"]["name"]${A};nwr["railway"="station"]["name"]${A};nwr["amenity"~"^(townhall|library|school|hospital|fire_station|police|place_of_worship|community_centre)$"]["name"]${A};);out center 150;`;
  let els=[];try{els=await trOverpass(q,20000,4);}catch(e){return 0;}
  const L=els.map(e=>{const t=e.tags||{};const k=presKind(t);const la=e.lat!=null?e.lat:e.center&&e.center.lat,lo=e.lon!=null?e.lon:e.center&&e.center.lon;
    return k&&la!=null&&t.name?{id:'osm:'+e.type[0]+e.id,name:String(t.name).slice(0,80),kind:k,lat:+la.toFixed(6),lon:+lo.toFixed(6),d:trM(lat,lon,la,lo)}:null;}).filter(Boolean);
  /* i più vicini, e non due dello stesso tipo a meno di 150 m (es. parco giochi dentro un parco) */
  L.sort((a,b)=>a.d-b.d);const P=[];L.forEach(x=>{if(P.length<40&&!P.some(y=>y.kind===x.kind&&trM(x.lat,x.lon,y.lat,y.lon)<150))P.push(x);});
  let n=0;try{const{data}=await SB.rpc('world_presidi_seed',{p:P.map(({d,...x})=>x)});n=(data&&data.nuovi)||0;M[key]=Date.now();localStorage.setItem('zsh_pres_seed',JSON.stringify(M));}catch(e){}
  return n;}
/* presidi nel riquadro della mappa */
async function presLoad(lm){if((typeof SB==='undefined'||!SB)||!lm||!lm.map)return null;const b=lm.map.getBounds();
  const{data,error}=await SB.rpc('world_presidi_list',{p_minlat:b.getSouth(),p_minlon:b.getWest(),p_maxlat:b.getNorth(),p_maxlon:b.getEast()});
  if(error||!data)return null;PRES.d=data;PRES.L=data.presidi||[];return data;}
/* segnaposto 🚩 sulla mappa (dallo zoom 13 in su) */
async function presDraw(lm){if(!lm||!lm.map)return;const map=lm.map;
  if(!lm._presOn){lm._presOn=1;map.on('moveend',()=>{clearTimeout(lm._prt);lm._prt=setTimeout(()=>presDraw(lm),700);});}
  const clear=()=>{(lm._pres||[]).forEach(m=>m.remove());lm._pres=[];};
  if(map.getZoom()<13){clear();return;}
  let d=null;try{d=await presLoad(lm);}catch(e){}if(!d)return;
  if(!d.presidi.length&&!lm._presSeeding){const c=map.getCenter();lm._presSeeding=1;try{if(await presSeed(c.lat,c.lng))d=await presLoad(lm);}catch(e){}lm._presSeeding=0;if(!d)return;}
  clear();
  d.presidi.forEach(p=>{const k=PRES_K[p.kind]||['🚩','Presidio'];
    const el=elDiv('lm-pres s-'+p.stato,`<b>${k[0]}</b><i>${p.stato==='libero'?'🏳️':'🚩'}</i>`);el.title=p.name;el.style.zIndex='5';
    el.addEventListener('click',e=>{e.stopPropagation();presSheet(p.id);});
    lm._pres.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.lon,p.lat]).addTo(map));});}
function presRefresh(){(window.__zlms||[]).forEach(lm=>{try{presDraw(lm);}catch(e){}});}
function presStato(p){if(p.stato==='libero')return p.perso?'🏳️ Libero: l’orda l’ha fatto cadere nelle ultime 24 ore':'🏳️ Libero';
  if(p.stato==='mio')return`🚩 Lo tieni tu${p.record?` · ha resistito a ${p.record} ${p.record===1?'orda':'orde'}`:''}`;
  return`🚩 Lo tiene ${p.nick?'@'+esc(p.nick):'un altro superstite'}${p.stato==='alleato'?' (alleato)':''}${p.record?` · ${p.record} ${p.record===1?'orda':'orde'} di fila`:''}`;}
/* scheda di un presidio */
function presSheet(id){const p=PRES.L.find(x=>x.id===id);if(!p)return;const k=PRES_K[p.kind]||['🚩','Presidio'];const ch=presChance(p);
  const g=Math.min(5,p.guardie||0);const tiene=p.stato==='mio'||p.stato==='alleato';
  openSheet(`${k[0]} ${esc(p.name)}`,`<p class="muted" style="margin:0 0 6px">${k[1]} · presidio pubblico</p>
   <div class="pres-st s-${p.stato}">${presStato(p)}</div>
   <p style="font-weight:400;font-size:14px;margin:8px 0">Chi tiene un presidio dà <b>+3 di difesa a tutte le case entro 500 m</b>, anche a quelle dei vicini (massimo +6 per casa).</p>
   ${p.stato!=='libero'?`<div class="pres-orda"><b>🧟 Prossima orda</b><span>Difesa <b>${p.difesa}</b> (55 + 12 per guardia · guardie ${g}/5) contro un attacco da 50 a 99</span>
     <span>Tiene nel <b>${ch}%</b> dei casi. Se cade torna libero.</span></div>`:''}
   <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">
    ${p.stato==='libero'?(S.user?(p.vicino?`<button class="btn" data-pocc>🚩 Occupa il presidio</button>`:`<p class="notice" style="margin:0">Per occuparlo serve una tua casa (vera o comprata) entro 1 km.</p>`):`<p class="notice" style="margin:0">Accedi per occupare i presidi.</p>`):''}
    ${tiene&&!p.io_guardia?`<button class="btn" data-pgua>🛡️ Fai la guardia (+12)</button>`:''}
    ${tiene&&p.io_guardia?`<span class="tag">🛡️ Sei di guardia per la prossima orda</span>`:''}
    ${p.stato==='mio'?`<button class="btn ghost small" data-plas>Lascia</button>`:''}
   </div>
   <p class="muted" style="font-size:12px;margin-top:10px">${p.stato==='mio'?'Chiedi agli alleati di fare la guardia: ognuno aggiunge +12. ':''}Si tengono al massimo ${(PRES.d&&PRES.d.max)||3} presidi a testa${PRES.d&&S.user?` (ora ne tieni ${PRES.d.miei})`:''}. Le guardie valgono per una sola orda (9:00 e 21:00).</p>`,
  card=>{const act=async(fn,b)=>{b.disabled=true;try{const{data,error}=await SB.rpc(fn,{p_id:id});if(error)throw error;toast((data&&data.msg)||'Fatto');
      if(data&&data.ok){const lm=(window.__zlms||[]).find(x=>x&&x.map&&x.map.getContainer().isConnected);if(lm)await presLoad(lm);presRefresh();presSheet(id);}else b.disabled=false;}
    catch(e){toast('Non riesco a contattare il server: riprova');b.disabled=false;}};
    const o=card.querySelector('[data-pocc]');if(o)o.onclick=()=>act('world_presidio_occupa',o);
    const gu=card.querySelector('[data-pgua]');if(gu)gu.onclick=()=>act('world_presidio_guardia',gu);
    const l=card.querySelector('[data-plas]');if(l)l.onclick=()=>{if(confirm('Lasci il presidio? Torna libero subito.'))act('world_presidio_lascia',l);};});}
/* elenco dei presidi intorno al centro della mappa */
async function presList(lm){lm=lm||window.__mf;openSheet('🚩 Presidi','<p><span class="spin"></span> Cerco i presidi qui intorno…</p>',()=>{});
  let d=null;try{if(lm&&lm.map&&lm.map.getZoom()<13)lm.map.setZoom(14.5);d=lm&&await presLoad(lm);
    if(d&&!d.presidi.length){const c=lm.map.getCenter();if(await presSeed(c.lat,c.lng)){d=await presLoad(lm);presRefresh();}}}catch(e){}
  if(!d){openSheet('🚩 Presidi','<p class="notice">Non riesco a caricare i presidi ora: riprova tra poco.</p>');return;}
  const c=lm.map.getCenter();const L=d.presidi.map(p=>({...p,dist:trM(c.lat,c.lng,p.lat,p.lon)})).sort((a,b)=>(a.stato==='mio'?-1:0)-(b.stato==='mio'?-1:0)||a.dist-b.dist).slice(0,30);
  const dist=m=>m<1000?Math.round(m/10)*10+' m':(m/1000).toFixed(1).replace('.',',')+' km';
  openSheet('🚩 Presidi',`<p style="font-weight:400;margin:0 0 8px">Luoghi pubblici veri, uguali per tutti. Chi li tiene dà <b>+3 di difesa alle case entro 500 m</b>; l’orda li attacca alle 9:00 e alle 21:00.${S.user?` Ne tieni <b>${d.miei}/${d.max}</b>.`:''}</p>
    ${L.length?L.map(p=>{const k=PRES_K[p.kind]||['🚩','Presidio'];return`<button class="pres-row s-${p.stato}" data-pr="${esc(p.id)}"><span class="pi">${k[0]}</span><span class="pt"><b>${esc(p.name)}</b><small>${presStato(p)} · ${dist(p.dist)}</small></span><span class="pc">${p.stato==='libero'?'Libero':presChance(p)+'%'}</span></button>`;}).join('')
     :`<p class="notice">Qui non ci sono ancora presidi. Compaiono vicino alle case dei superstiti: avvicinati a una tua casa sulla mappa.</p>`}`,
   card=>card.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{window.SHEET_BACK={t:'‹ Presidi',fn:()=>presList(lm)};presSheet(b.dataset.pr);}));}
</script>
