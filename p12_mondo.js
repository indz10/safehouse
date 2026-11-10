<script>
/* =========================================================
   MONDO REALE A FUMETTO
   - geocodifica dell'indirizzo (Nominatim) e dati della zona
     (Overpass / OpenStreetMap): strade con i nomi veri, edifici,
     verde, acqua, attività e servizi
   - disegno in stile fumetto; la casa dell'utente è evidenziata
     solo per lui; gli altri edifici sono sagome senza dati
   - se la rete non è disponibile (es. anteprima) si usa la mappa
     illustrata e lo si dice chiaramente
   ========================================================= */
const RM={cache:{}};
const RM_R=380;
async function rmFetch(addr){
  if(RM.cache[addr])return RM.cache[addr];
  const w=await trWhere(addr);const lat=w.lat,lon=w.lon;const key='zsh_rm2_'+lat.toFixed(5)+'_'+lon.toFixed(5);
  try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.t<7*864e5){RM.cache[addr]=c.m;S.realNames=rmTopNames(c.m);return c.m;}}catch(e){}
  const A=`(around:${RM_R},${lat},${lon})`;
  const q=`[out:json][timeout:25];(way["highway"]${A};way["building"]${A};way["leisure"~"park|garden|pitch|playground"]${A};way["landuse"~"grass|meadow|farmland|forest|orchard|vineyard|recreation_ground"]${A};way["natural"~"water|wood"]${A};way["waterway"]${A};node["amenity"]${A};node["shop"]${A};node["craft"]${A};node["tourism"]${A};node["emergency"="assembly_point"]${A};way["amenity"]${A};way["shop"]${A};way["craft"]${A};);out geom;`;
  let d=null;try{d={elements:await trOverpass(q,15000)};}catch(e){}
  if(!d)throw new Error('mappa vera non raggiungibile');
  /* negozi e servizi disegnati come edifici: anche un segnaposto al centro */
  const extra=[];d.elements.forEach(e=>{if(e.type==='way'&&e.tags&&(e.tags.amenity||e.tags.shop||e.tags.craft)&&e.geometry&&e.geometry.length){const c=e.geometry.reduce((a,p)=>[a[0]+p.lat,a[1]+p.lon],[0,0]).map(v=>v/e.geometry.length);extra.push({type:'node',id:1e12+e.id,lat:c[0],lon:c[1],tags:e.tags});}});
  const parts=String(addr).split(',');
  const res={lat,lon,place:parts[0].trim()||addr,town:(parts[1]||'').trim(),els:d.elements.concat(extra)};
  RM.cache[addr]=res;S.realNames=rmTopNames(res);try{localStorage.setItem(key,JSON.stringify({t:Date.now(),m:res}));}catch(e){}return res;}
function rmTopNames(m){const len={};m.els.forEach(e=>{if(e.type==='way'&&e.tags&&e.tags.highway&&e.tags.name&&e.geometry){let L=0;for(let i=1;i<e.geometry.length;i++)L+=Math.hypot(e.geometry[i].lat-e.geometry[i-1].lat,e.geometry[i].lon-e.geometry[i-1].lon);len[e.tags.name]=(len[e.tags.name]||0)+L;}});
  return Object.entries(len).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);}
const RM_CAT=t=>{const a=t.amenity,s=t.shop,tu=t.tourism;
  if(['pharmacy'].includes(a))return['✚','Farmacia','pub'];if(['hospital','clinic','doctors'].includes(a))return['H','Sanità','pub'];if(a==='police')return['🚓','Forze dell’ordine','pub'];if(a==='fire_station')return['🚒','Vigili del fuoco','pub'];
  if(['townhall','post_office','school','kindergarten','library'].includes(a))return['🏛️',{townhall:'Municipio',post_office:'Ufficio postale',school:'Scuola',kindergarten:'Scuola',library:'Biblioteca'}[a],'pub'];
  if(['bar','cafe','pub'].includes(a))return['☕','Bar','biz'];if(['restaurant','fast_food','pizzeria'].includes(a))return['🍝','Ristorante','biz'];if(a==='bank')return['🏦','Banca','biz'];if(a==='fuel')return['⛽','Distributore','biz'];
  if(t.craft){const C={locksmith:['🔑','Fabbro'],electrician:['💡','Elettricista'],metal_construction:['🔩','Carpenteria metallica'],window_construction:['🪟','Serramenti'],builder:['🧱','Impresa edile'],carpenter:['🪚','Falegname'],plumber:['🔧','Idraulico']}[t.craft];if(C)return[C[0],C[1],'biz'];}
  if(t.emergency==='assembly_point')return['⛺','Punto di raccolta','pub'];
  if(s){const M={locksmith:['🔑','Fabbro'],security:['🛡️','Sicurezza e allarmi'],electrical:['💡','Materiale elettrico'],trade:['🧱','Materiali edili'],paint:['🎨','Colori'],glaziery:['🪟','Vetreria'],supermarket:['🛒','Supermercato'],convenience:['🛒','Alimentari'],bakery:['🥖','Panificio'],hardware:['🔧','Ferramenta'],doityourself:['🔧','Fai da te'],hairdresser:['💈','Parrucchiere'],clothes:['👕','Abbigliamento'],butcher:['🥩','Macelleria'],florist:['💐','Fiori'],car_repair:['🔩','Officina'],electronics:['📺','Elettronica']};const m=M[s]||['🛍️','Negozio'];return[m[0],m[1],'biz'];}
  if(tu){return['🛏️',{hotel:'Hotel',guest_house:'B&B',apartment:'Appartamenti',attraction:'Da vedere',museum:'Museo'}[tu]||'Turismo','biz'];}
  return null;};
function rmSVG(m,L={biz:true,spons:true,pub:true,comm:false},W=800,H=800){
  const k=Math.cos(m.lat*Math.PI/180),sc=(W/2)/RM_R;
  const P=(la,lo)=>[(W/2+(lo-m.lon)*k*111320*sc).toFixed(1),(H/2-(la-m.lat)*110540*sc).toFixed(1)];
  const path=(g,close)=>g.map((p,i)=>(i?'L':'M')+P(p.lat,p.lon).join(' ')).join('')+(close?'Z':'');
  const ways=m.els.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>1);
  let green='',water='',bld='',roads0='',roads1='',labels='',pins='',me='';
  ways.forEach(e=>{const t=e.tags||{};
    if(t.leisure||/grass|meadow|recreation|park/.test(t.landuse||''))green+=`<path d="${path(e.geometry,1)}" fill="#a9c98a" stroke="#140f1f" stroke-width="1.5"/>`;
    else if(/farmland|orchard|vineyard/.test(t.landuse||''))green+=`<path d="${path(e.geometry,1)}" fill="#e7d48d" stroke="#140f1f" stroke-width="1" opacity=".8"/>`;
    else if(/forest/.test(t.landuse||'')||t.natural==='wood')green+=`<path d="${path(e.geometry,1)}" fill="#6f9f6a" stroke="#140f1f" stroke-width="1.2"/>`;
    else if(t.natural==='water')water+=`<path d="${path(e.geometry,1)}" fill="#6fa8dc" stroke="#140f1f" stroke-width="2"/>`;
    else if(t.waterway)water+=`<path d="${path(e.geometry)}" fill="none" stroke="#140f1f" stroke-width="${t.waterway==='river'?18:7}" stroke-linecap="round"/><path d="${path(e.geometry)}" fill="none" stroke="#6fa8dc" stroke-width="${t.waterway==='river'?13:4}" stroke-linecap="round"/>`;});
  const pal=['#e8dcbf','#d9c7a8','#cfc6e6','#f3e9d2','#e6d3b3','#c9d6c0'];
  const blds=ways.filter(e=>e.tags&&e.tags.building).slice(0,2200);
  let mine=null;const [px,py]=[W/2,H/2];
  const inside=(g)=>{let c=false;const pts=g.map(p=>P(p.lat,p.lon).map(Number));for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))c=!c;}return c;};
  blds.forEach(e=>{if(!mine&&inside(e.geometry))mine=e;});
  if(!mine){let best=1e9;blds.forEach(e=>{const c=e.geometry.reduce((a,p)=>[a[0]+p.lat,a[1]+p.lon],[0,0]).map(v=>v/e.geometry.length);const[x,y]=P(c[0],c[1]).map(Number);const d=Math.hypot(x-px,y-py);if(d<best&&d<30){best=d;mine=e;}});}
  blds.forEach(e=>{if(e===mine)return;bld+=`<path d="${path(e.geometry,1)}" fill="${pal[e.id%pal.length]}" stroke="#140f1f" stroke-width="1.3"/>`;});
  const RW={motorway:20,trunk:18,primary:16,secondary:14,tertiary:12,unclassified:10,residential:10,living_street:9,service:6,pedestrian:8,track:5,footway:3,path:3,cycleway:3,steps:3};
  const rds=ways.filter(e=>e.tags&&e.tags.highway&&RW[e.tags.highway]);
  rds.sort((a,b)=>RW[a.tags.highway]-RW[b.tags.highway]).forEach(e=>{const w=RW[e.tags.highway];const d=path(e.geometry);
    if(w<=3){roads1+=`<path d="${d}" fill="none" stroke="#7c6f8f" stroke-width="2" stroke-dasharray="4 4"/>`;return;}
    roads0+=`<path d="${d}" fill="none" stroke="#140f1f" stroke-width="${w+4}" stroke-linecap="round" stroke-linejoin="round"/>`;
    roads1+=`<path d="${d}" fill="none" stroke="${w>=14?'#f7d64a':'#f3e9d2'}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;});
  /* nomi delle vie lungo la strada, una volta per nome */
  const byName={};rds.forEach(e=>{const n=e.tags.name;if(!n||RW[e.tags.highway]<=3)return;const g=e.geometry;let len=0;for(let i=1;i<g.length;i++){const a=P(g[i-1].lat,g[i-1].lon),b=P(g[i].lat,g[i].lon);len+=Math.hypot(a[0]-b[0],a[1]-b[1]);}if(!byName[n]||byName[n].len<len)byName[n]={e,len};});
  Object.entries(byName).forEach(([n,{e,len}],i)=>{if(len<n.length*7)return;let g=e.geometry;const a=P(g[0].lat,g[0].lon),b=P(g[g.length-1].lat,g[g.length-1].lon);if(+b[0]<+a[0])g=g.slice().reverse();
    const id='rp'+e.id;labels+=`<path id="${id}" d="${path(g)}" fill="none"/><text font-family="Bangers,Impact,sans-serif" font-size="13" letter-spacing=".5" fill="#140f1f" stroke="#fff" stroke-width="3.5" paint-order="stroke" dy="4"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(n.toUpperCase())}</textPath></text>`;});
  if(mine)me=`<path d="${path(mine.geometry,1)}" fill="#d7263d" stroke="#140f1f" stroke-width="3"/>`;
  me+=`<g transform="translate(${px} ${py})"><circle r="34" fill="#d7263d" opacity=".18"/><path d="M-14 6 V-8 L0 -20 L14 -8 V6Z" fill="#d7263d" stroke="#140f1f" stroke-width="3"/><rect x="-26" y="10" width="52" height="16" fill="#f7d64a" stroke="#140f1f" stroke-width="2"/><text y="22" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="#140f1f">TU</text></g>`;
  /* attività e servizi */
  const nodes=m.els.filter(e=>e.type==='node'&&e.tags);m._pois=[];
  const biz=nodes.map(e=>({e,c:RM_CAT(e.tags)})).filter(x=>x.c);
  const bizOnly=biz.filter(x=>x.c[2]==='biz').map(x=>{const[X,Y]=P(x.e.lat,x.e.lon).map(Number);return{...x,X,Y,d:Math.hypot(X-px,Y-py)};}).sort((a,b)=>a.d-b.d);
  const GEO=window.SP_GEO||{};const useGeo=Object.keys(GEO).length>0;const spK=Object.keys(SPONSORS);const spSet=new Map();if(!useGeo)bizOnly.slice(0,spK.length).forEach((x,i)=>spSet.set(x.e.id,spK[i]));
  biz.forEach(x=>{const[X,Y]=P(x.e.lat,x.e.lon).map(Number);if(X<0||Y<0||X>W||Y>H)return;const t=x.e.tags,c=x.c;const i=m._pois.length;const sk=spSet.get(x.e.id);
    m._pois.push({name:t.name||c[1],cat:c[1],kind:c[2],sk,ic:c[0],phone:t.phone||t['contact:phone']||'',web:t.website||t['contact:website']||'',lat:x.e.lat,lon:x.e.lon});
    if(sk&&L.spons)pins+=`<g data-rmp="${i}" style="cursor:pointer"><path d="M${X} ${Y} l-9 -14 h18z" fill="#140f1f"/><rect x="${X-20}" y="${Y-42}" width="40" height="30" rx="5" fill="#f7d64a" stroke="#140f1f" stroke-width="3"/><text x="${X}" y="${Y-22}" text-anchor="middle" font-family="Bangers,Impact" font-size="15" fill="#140f1f">${SPONSORS[sk].logo}</text><text x="${X+17}" y="${Y-38}" font-size="12">⭐</text></g>`;
    else if(c[2]==='pub'&&L.pub)pins+=`<g data-rmp="${i}" style="cursor:pointer"><circle cx="${X}" cy="${Y}" r="11" fill="#fff" stroke="#2f5fb8" stroke-width="3"/><text x="${X}" y="${Y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#2f5fb8">${c[0]}</text></g>`;
    else if(c[2]==='biz'&&L.biz)pins+=`<g data-rmp="${i}" style="cursor:pointer" opacity=".85"><circle cx="${X}" cy="${Y}" r="8" fill="#9aa4b0" stroke="#140f1f" stroke-width="1.6"/><text x="${X}" y="${Y+3.5}" text-anchor="middle" font-size="9">${c[0]}</text></g>`;});
  if(useGeo)Object.entries(GEO).forEach(([sk,g])=>{if(!SPONSORS[sk]||g.lat==null)return;const[X,Y]=P(g.lat,g.lon).map(Number);if(X<0||Y<0||X>W||Y>H)return;const i=m._pois.length;
    m._pois.push({name:SPONSORS[sk].name,cat:SP_CAT[sk]||'Sponsor',kind:'biz',sk,ic:'⭐',lat:g.lat,lon:g.lon});
    if(L.spons)pins+=`<g data-rmp="${i}" style="cursor:pointer"><path d="M${X} ${Y} l-9 -14 h18z" fill="#140f1f"/><rect x="${X-20}" y="${Y-42}" width="40" height="30" rx="5" fill="#f7d64a" stroke="#140f1f" stroke-width="3"/><text x="${X}" y="${Y-22}" text-anchor="middle" font-family="Bangers,Impact" font-size="15" fill="#140f1f">${SPONSORS[sk].logo}</text><text x="${X+17}" y="${Y-38}" font-size="12">⭐</text></g>`;});
  let comm='';if(L.comm){const r=rng(Math.round(m.lat*1e4+m.lon*1e3));for(let row=0;row<7;row++)for(let col=0;col<8;col++){const x=50+col*104+(row%2)*52,y=60+row*104;const n=Math.round(r()*14);const ok=n>=5;comm+=`<path d="${hexPath(x,y,58)}" fill="${ok?(r()<.5?'#3f9b5f':'#f7d64a'):'#cfc6e6'}" fill-opacity="${ok?.22:.1}" stroke="#140f1f" stroke-width="1" stroke-dasharray="${ok?'':'4 4'}"/>${ok?`<text x="${x}" y="${y+5}" text-anchor="middle" font-family="Bangers,Impact" font-size="16" fill="#140f1f" stroke="#fff" stroke-width="3" paint-order="stroke">${n}</text>`:''}`;}}
  const sb=Math.round(100*sc);
  return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa a fumetto della zona di ${esc(m.place)}">${defs('rm')}<rect width="${W}" height="${H}" fill="#e9e0c9"/><rect width="${W}" height="${H}" fill="url(#htlrm)" opacity=".5"/>
    ${green}${water}${roads0}${bld}${roads1}${me}${labels}${comm}${pins}
    <g transform="translate(24 ${H-34})"><rect width="${sb}" height="8" fill="#140f1f"/><rect width="${sb/2}" height="8" fill="#fff" stroke="#140f1f" stroke-width="1.5"/><text y="-6" font-size="12" font-weight="700" fill="#140f1f">100 m</text></g>
    <text x="${W-12}" y="${H-10}" text-anchor="end" font-size="11" fill="#140f1f" opacity=".8">© OpenStreetMap</text>
    ${mFrame(W,H,(m.town?m.town.toUpperCase()+' · ':'')+'ZONA VERA')}</svg>`;}
function rmBox(id){return`<div class="panel mapwrap" style="padding:0;overflow:hidden" id="${id}"><div class="maptools">${[['spons','Sponsor'],['biz','Attività'],['pub','Servizi pubblici'],['comm','Community']].map(([k,l])=>`<button class="chip ${(S.rmL||{spons:1,biz:1,pub:1})[k]?'on':''}" data-rml="${k}">${l}</button>`).join('')}</div>
  <div class="mapsvg rm-svg"><div class="rm-load"><span class="spin"></span> Disegno la tua zona vera a fumetto…</div></div><div class="mapinfo rm-info"><span class="muted">Tocca un’attività o un servizio.</span></div></div>`;}
async function rmMount(box,addr){S.rmL=S.rmL||{spons:true,biz:true,pub:true,comm:false};const el=box.querySelector('.rm-svg'),info=box.querySelector('.rm-info');
  let m;try{m=await rmFetch(addr);}catch(e){let z=S.zone&&S.zone.address===addr?S.zone:null;if(!z){try{z=await analyzeZone(addr);}catch(_){}}
    el.innerHTML=`<div class="notice" style="margin:10px">Anteprima: rete esterna bloccata, vedi la zona illustrata di <b>${esc(addr)}</b>. Online: vie vere di OpenStreetMap. Tocca bollini e puntini.</div>`;if(z&&typeof fallbackMap==='function')fallbackMap(el,z);return false;}
  const draw=()=>{el.innerHTML=rmSVG(m,S.rmL);el.querySelectorAll('[data-rmp]').forEach(g=>g.onclick=()=>{const p=m._pois[+g.dataset.rmp];vibe();
    if(p.sk){sponsorSheet(p.sk,S.zone||{seed:7,address:addr});return;}
    const key='p-'+addr+'-'+p.name;const dirs=`https://www.openstreetmap.org/directions?to=${p.lat},${p.lon}`;
    info.innerHTML=`<b>${p.ic} ${esc(p.name)}</b><span>${esc(p.cat)}${p.kind==='pub'?' · servizio pubblico':''}</span>${p.kind==='biz'?`<span>${rvLine(key,5,4)}</span>`:''}
      <span class="row wrap" style="gap:6px;margin-top:6px"><a class="btn small ghost" href="${dirs}" target="_blank" rel="noopener">Indicazioni</a>${p.phone?`<a class="btn small ghost" href="tel:${esc(p.phone)}">Chiama</a>`:''}${p.web?`<a class="btn small ghost" href="${esc(p.web)}" target="_blank" rel="noopener">Sito</a>`:''}${p.kind==='biz'?rvBtn(key,p.name,5,4):''}</span>
      ${p.kind==='biz'?`<button class="btn small alt" data-claim style="margin-top:6px">È la tua attività? Mettiti in evidenza</button>`:''}`;
    const c=info.querySelector('[data-claim]');if(c)c.onclick=()=>{S.motivo='negozio';go('contatti');};});};
  draw();box.querySelectorAll('[data-rml]').forEach(b=>b.onclick=()=>{S.rmL[b.dataset.rml]=!S.rmL[b.dataset.rml];b.classList.toggle('on');draw();});
  if(G&&G.realHood&&S.tab==='orda')renderHub();return true;}
function zoneCommunityHTML(){const z=S.zone;if(!z)return`<div class="panel moon"><b class="disp" style="font-size:20px">Entra nella tua community vera</b><p style="font-weight:400;font-size:14px;margin:4px 0 8px">Valuta la tua casa: entri nella community della tua zona, con i vicini e le attività del territorio.</p><button class="btn small" data-go="valuta">Valuta la mia casa</button></div>`;
  const c=commSummary(z);const idx=S.result?S.result.idx:null;const better=idx!=null?Math.max(5,Math.min(95,Math.round(100-(idx/10)*100+((c.avg||5)-idx)*8))):null;const town=(z.address.split(',').slice(-1)[0]||'').trim();
  const goal=120,done=82;
  return`<div class="panel zc"><div class="row spread"><b class="disp" style="font-size:22px">🏘️ La tua zona vera</b><span class="tag">${esc(town)}</span></div>
   <div class="row" style="gap:8px;margin:8px 0"><div class="stat"><b>${c.tot}</b><small>superstiti in zona</small></div><div class="stat"><b>${c.avg?fmtI(c.avg):'–'}</b><small>indice medio</small></div><div class="stat"><b>${better!=null?better+'%':'–'}</b><small>${better!=null?'case meno sicure della tua':'valuta per saperlo'}</small></div></div>
   <div class="zchal"><b>🎯 Sfida di zona del mese</b><small>Abbassare l’indice medio della zona con ${goal} miglioramenti confermati dalle foto</small><div class="vbar"><span style="width:${done/goal*100}%"></span></div><small>${done} su ${goal} · premio: badge “Quartiere preparato” e offerte speciali degli sponsor</small></div>
   <p class="disp" style="font-size:18px;margin:10px 0 4px">Offerte per chi migliora casa</p>
   ${Object.keys(SPONSORS).map(k=>`<div class="frow"><span class="ti" style="background:#f7d64a;width:30px;height:30px;border:2px solid #140f1f;display:grid;place-items:center;font-family:var(--display)">${SPONSORS[k].logo}</span><div style="flex:1"><b>${esc(SPONSORS[k].name)}</b><small> ${SP_OFF[k]||''}</small></div><button class="btn small ghost" data-zsp="${k}">Scheda</button></div>`).join('')}
   <p class="muted" style="font-size:11px;margin-top:6px">Numeri aggregati: si mostrano solo aree con almeno 5 utenti. Anteprima: dati dimostrativi.</p></div>`;}
/* sezione Zone → Mondo */
function renderMondo(){const addr=S.mondoQ||(S.zone&&S.zone.address)||'';
  app.innerHTML=`<div class="maphero">${skyline()}<div class="mh-t"><h2>Il mondo vero</h2><div class="caption">La tua zona con le vie vere, a fumetto</div></div></div>${zoneSeg()}<div class="page">
   <div class="panel"><label class="disp" for="mq" style="font-size:20px">Indirizzo o zona</label><div class="row" style="margin-top:6px"><input id="mq" class="field" value="${esc(addr)}" placeholder="Es. Via Roma 10, Volta Mantovana"><button class="btn small" id="mgo">Vai</button></div></div>
   ${S.result?zoneCommunityHTML():''}
   ${typeof myRealHood==='function'?myRealHood():''}
   ${addr?rmBox('rmM'):'<div class="notice">Scrivi un indirizzo per vedere la zona vera.</div>'}
   <div class="panel moon"><b class="disp" style="font-size:22px">Una mappa per tutti, un quartiere di gioco per ciascuno</b>
    <ul style="margin:8px 0 0 18px;font-weight:400;line-height:1.5"><li>Qui ci sono <b>tutti gli utenti</b> sulla stessa mappa vera: vie, piazze, attività, community per area.</li><li>Le case sono <b>sagome senza dati</b>: la tua è evidenziata solo sul tuo telefono.</li><li>Gli <b>sponsor</b> hanno il bollino; le altre attività possono mettersi in evidenza.</li><li>Il <b>gioco</b> resta tuo: in Orda il “quartiere vero” prende da qui i nomi delle vie.</li></ul></div></div>`;
  bindZoneSeg();bindGo();app.querySelectorAll('[data-zsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.zsp,S.zone));const go1=()=>{const v=$('#mq').value.trim();if(!v){toast('Scrivi un indirizzo');return;}S.mondoQ=v;vibe();renderMondo();setTimeout(()=>{const m=$('#rmM');if(m)m.scrollIntoView({behavior:'smooth',block:'start'});},60);};$('#mgo').onclick=go1;$('#mq').onkeydown=e=>{if(e.key==='Enter')go1();};
  if(typeof bindRealHood==='function')bindRealHood();
  if(addr)rmMount($('#rmM'),addr);}
/* Valuta: "vedi la tua zona vera a fumetto" */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-realmap]');if(!b)return;const addr=b.dataset.realmap;
  openSheet('🗺️ La tua zona vera, a fumetto',rmBox('rmV')+'<p class="muted" style="font-size:12px;margin-top:6px">La tua casa è evidenziata solo per te. Gli altri edifici sono sagome senza dati.</p>',card=>rmMount(card.querySelector('#rmV'),addr));},true);

/* Il mio quartiere vero: valutazione reale dentro la community reale */
const RMISS=[['torcia','Controlla torcia e batterie di scorta','+1 giro di ruota','spin'],['acqua','Prepara 3 litri d’acqua a persona','+5 💎','gems'],['contatti','Salva i numeri utili (vicini, emergenze)','+30 🧱','coins'],['preventivo','Chiedi un preventivo a uno sponsor per il tuo punto debole','+40 Crediti Casa Vera','ccv']];
function myRealHood(){if(!S.zone||!S.result)return`<div class="panel moon"><b class="disp" style="font-size:22px">Entra nel tuo quartiere vero</b><p style="font-weight:400;margin:4px 0 8px">Valuta la tua casa: entri nella community della tua zona, vedi come sta il quartiere e ricevi le offerte degli sponsor vicini.</p><button class="btn small" data-go="valuta">Valuta la mia casa</button></div>`;
  const z=S.zone,c=commSummary(z),idx=S.result.idx;const pct=Math.max(5,Math.min(95,Math.round(50+(c.avg-idx)*15)));S.rmiss=S.rmiss||{};
  return`<div class="panel myhood"><div class="row spread"><b class="disp" style="font-size:24px">🏘️ Il mio quartiere vero</b><span class="tag ia">${esc(z.address.split(',').slice(-1)[0]||'')}</span></div>
   <div class="grid3"><div class="stat"><b>${fmtI(idx)}</b><small>indice di casa tua</small></div><div class="stat"><b>${pct}%</b><small>delle case della zona è meno preparata della tua</small></div><div class="stat"><b>${c.tot}</b><small>vicini nella community</small></div></div>
   <p class="muted" style="font-size:12px;margin:6px 0">Confronto con dati aggregati della zona: nessuno vede la tua casa o il tuo indice.</p>
   <div style="margin-top:8px">${typeof scudoBar==='function'?scudoBar():''}</div>
   <b style="display:block;margin-top:8px">🎁 Offerte del quartiere</b>${Object.keys(SPONSORS).map(k=>`<div class="offr" data-offr="${k}"><b>${esc(SPONSORS[k].name)}</b><small>${SP_OFF[k]||''}</small><span>›</span></div>`).join('')}
   <b style="display:block;margin-top:10px">✅ Missioni della casa vera</b><small class="muted" style="display:block;margin-bottom:4px">Le fai a casa davvero; il premio arriva nel gioco.</small>${RMISS.map(([k,t,r])=>`<label class="rmiss ${S.rmiss[k]?'ok':''}"><input type="checkbox" data-rmiss="${k}" ${S.rmiss[k]?'checked disabled':''}><span>${t}</span><b>${r}</b></label>`).join('')}</div>`;}
function bindRealHood(){app.querySelectorAll('[data-offr]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.offr,S.zone));if(typeof bindGo==='function')bindGo();
  app.querySelectorAll('[data-rmiss]').forEach(cb=>cb.onchange=()=>{const k=cb.dataset.rmiss;if(S.rmiss[k])return;S.rmiss[k]=1;const m=RMISS.find(x=>x[0]===k);
    if(typeof G!=='undefined'&&G.type){if(m[3]==='spin')G.spins=(G.spins||0)+1;if(m[3]==='gems')G.gems+=5;if(m[3]==='coins')G.coins+=150;if(m[3]==='ccv'){ccvInit();G.ccv.bal+=40;G.ccv.log.unshift({t:'Preventivo chiesto a uno sponsor',c:40});}toast(`Missione fatta: ${m[2]} nel gioco`);}
    else{S.pend=(S.pend||[]).concat(m[3]);toast(`Missione fatta: ${m[2]} ti aspetta in Orda`);}cb.disabled=true;cb.closest('.rmiss').classList.add('ok');sfx('coin');const sb=app.querySelector('.myhood .scudo');if(sb)sb.outerHTML=scudoBar();});}
</script>
