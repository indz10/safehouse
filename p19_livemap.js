<script>
/* =========================================================
   MAPPA A FUMETTO COMPLETA (strada A, gratuita)
   - mappa vettoriale OpenFreeMap (dati OpenStreetMap, senza chiavi)
   - disegnata dall'app con i colori ZombieSafeHouse, contorni neri,
     giorno e notte; nomi di vie e paesi con i caratteri del fumetto
     ovunque si sposti la mappa
   - sopra: casa tua, sponsor, attività, servizi, aree community,
     simulazione della notte del quartiere
   - senza rete o senza libreria: torna la mappa disegnata di prima
   ========================================================= */
let MLP=null;
function loadML(){if(window.maplibregl&&maplibregl.Map)return Promise.resolve(maplibregl);if(MLP)return MLP;
  const tryLoad=(js,css)=>new Promise((ok,ko)=>{const c=document.createElement('link');c.rel='stylesheet';c.href=css;document.head.appendChild(c);
    const s=document.createElement('script');s.src=js;s.onload=()=>window.maplibregl?ok(maplibregl):ko(new Error('mappa'));s.onerror=()=>ko(new Error('mappa'));document.head.appendChild(s);});
  MLP=tryLoad('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js','https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css')
    .catch(()=>tryLoad('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js','https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'));
  MLP=Promise.race([MLP,new Promise((_,ko)=>setTimeout(()=>ko(new Error('tempo')),12000))]);MLP.catch(()=>{MLP=null;});return MLP;}
const POI_CAND=['hardware','doityourself','locksmith','security','electrical','trade','paint','glaziery','building_materials'];
const POI_N={hardware:'Ferramenta',doityourself:'Fai da te',locksmith:'Fabbro',security:'Sicurezza e allarmi',electrical:'Materiale elettrico',trade:'Materiali edili',paint:'Colori',glaziery:'Vetreria',building_materials:'Materiali edili',
  hospital:'Ospedale',clinic:'Clinica',pharmacy:'Farmacia',police:'Forze dell’ordine',fire_station:'Vigili del fuoco',townhall:'Municipio',town_hall:'Municipio',drinking_water:'Fontanella',
  supermarket:'Supermercato',convenience:'Alimentari',grocery:'Alimentari',bakery:'Panificio',cafe:'Bar',bar:'Bar',restaurant:'Ristorante',fast_food:'Fast food',fuel:'Distributore',bank:'Banca',hairdresser:'Parrucchiere',clothes:'Abbigliamento',butcher:'Macelleria',florist:'Fiori'};
const ZICON={hid:['🚫','#e6e1d6','#7c7a8a'],cand:['🔧','#ffe680','#b8860b',1],super:['🛒','#bfe8c9'],bar:['☕','#f3d9b1'],rist:['🍝','#ffd0b5'],pane:['🥖','#f6e2b3'],fuel:['⛽','#d9dde3'],bank:['🏦','#d6e4f5'],hair:['💈','#f5d6e8'],abiti:['👕','#e2d6f5'],hotel:['🛏️','#d6f0f5'],shop:['🛍️','#eee6d6'],
  osp:['🏥','#ffffff','#d7263d',1],farm:['💊','#ffffff','#3f9b5f',1],cc:['🚓','#ffffff','#2f5fb8',1],vvf:['🚒','#ffffff','#e2702d',1],mun:['🏛️','#ffffff','#2f5fb8',1],acqua:['💧','#ffffff','#2f7fb8',1]};
function zIcon(map,id){if(!id||id.indexOf('zi-')!==0||map.hasImage(id))return;const night=/-n$/.test(id);const k=id.slice(3).replace(/-n$/,'');const d=ZICON[k]||ZICON.shop;
  const S2=72,c=document.createElement('canvas');c.width=c.height=S2;const g=c.getContext('2d');const big=!!d[3];const r=big?29:24,cx=S2/2-2,cy=S2/2-2;
  g.fillStyle='#140f1f';g.beginPath();g.arc(cx+4,cy+4,r,0,7);g.fill();
  g.fillStyle=night&&!big?'#3b2f6e':d[1];g.beginPath();g.arc(cx,cy,r,0,7);g.fill();
  g.lineWidth=big?6:4;g.strokeStyle=d[2]||'#140f1f';if(k==='cand')g.setLineDash([7,4]);g.beginPath();g.arc(cx,cy,r-g.lineWidth/2+1,0,7);g.stroke();g.setLineDash([]);
  if(big&&k!=='cand'){g.lineWidth=2.5;g.strokeStyle='#140f1f';g.beginPath();g.arc(cx,cy,r+1,0,7);g.stroke();}
  g.font=`${big?30:25}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(d[0],cx,cy+2);
  if(k==='cand'){g.fillStyle='#d7263d';g.beginPath();g.arc(cx+r-4,cy-r+5,9,0,7);g.fill();g.fillStyle='#fff';g.font='bold 13px sans-serif';g.fillText('€',cx+r-4,cy-r+6);}
  try{map.addImage(id,g.getImageData(0,0,S2,S2),{pixelRatio:2});}catch(e){}}
const ZPAL={day:{bg:'#e2d5f4',res:'#d9caef',park:'#cfe3bd',wood:'#b3d0a2',farm:'#f5e7a4',water:'#b4d2f0',bld:'#fff0b4',bldl:'#4a3a6e',road:'#ffffff',main:'#f6d65a',cas:'#4a3a6e',rail:'#8f80b8'},
  night:{bg:'#1b1438',res:'#241a4a',park:'#24452f',wood:'#1d3a27',farm:'#3a3320',water:'#203a73',bld:'#3b2f6e',bldl:'#07050c',road:'#6a5aa0',main:'#c9a31a',cas:'#07050c',rail:'#8a80b0'}};
function zStyle(n){const P=n?ZPAL.night:ZPAL.day;const R=['interpolate',['exponential',1.6],['zoom']];const MJ=['motorway','trunk','primary'],SC=['secondary','tertiary'];
  const ROADS=['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]];
  const DEM=['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
  const SUB=['get','subclass'],CLS=['get','class'];
  const PUB=['any',['in',CLS,['literal',['hospital','pharmacy','police','fire_station','town_hall']]],['in',SUB,['literal',['hospital','clinic','pharmacy','police','fire_station','townhall','drinking_water']]]];
  const CAND=['in',SUB,['literal',POI_CAND]];
  const BIZ=['all',['!=',SUB,'vacant'],['!',PUB],['!',CAND],['in',CLS,['literal',['shop','grocery','bakery','cafe','bar','restaurant','fast_food','fuel','clothing_store','car','beer','alcohol_shop','ice_cream','lodging','bank','hairdresser','furniture','florist','jewelry','optician','pet','shoes','sports','stationery','mobile_phone']]]];
  const NM=['coalesce',['get','name:it'],['get','name']];const FONT=['Noto Sans Bold'];
  const HID=['!',['in',NM,['literal',window.ZHID||[]]]];
  const KEY=['coalesce',SUB,CLS];
  const BIZC=['match',KEY,['supermarket','convenience','grocery'],'super',['cafe','bar','pub'],'bar',['restaurant','fast_food'],'rist','bakery','pane','fuel','fuel',['bank','atm'],'bank',['hairdresser','beauty'],'hair',['clothes','clothing_store','shoes'],'abiti',['hotel','guest_house','lodging'],'hotel','shop'];
  const PUBC=['match',KEY,['hospital','clinic'],'osp','pharmacy','farm','police','cc','fire_station','vvf',['townhall','town_hall'],'mun','drinking_water','acqua','osp'];
  const TXT={'text-font':FONT,'text-anchor':'top','text-optional':true,'text-max-width':9};
  const POIS=[
   {id:'poi-biz',type:'symbol',source:'omt','source-layer':'poi',minzoom:15,filter:['all',BIZ,HID],layout:{'icon-image':['concat','zi-',BIZC,n?'-n':''],'icon-size':['interpolate',['linear'],['zoom'],15,.5,18,.85],'icon-padding':1,...TXT,'text-field':['step',['zoom'],'',17,NM],'text-size':10.5,'text-offset':[0,1.2]},paint:{'text-color':n?'#f3e9d2':'#140f1f','text-halo-color':n?'#140f1f':'#fffaf0','text-halo-width':2}},
   {id:'poi-pub',type:'symbol',source:'omt','source-layer':'poi',minzoom:11,filter:['all',PUB,HID],layout:{'icon-image':['concat','zi-',PUBC],'icon-size':['interpolate',['linear'],['zoom'],12,.45,17,.95],'icon-allow-overlap':true,...TXT,'text-field':['step',['zoom'],'',16,NM],'text-size':11,'text-offset':[0,1.5]},paint:{'text-color':'#1f3f80','text-halo-color':'#fff','text-halo-width':2.2}},
   {id:'poi-hid',type:'symbol',source:'omt','source-layer':'poi',minzoom:12,filter:['in',NM,['literal',window.ZHID||[]]],layout:{visibility:window.ZADMIN?'visible':'none','icon-image':'zi-hid','icon-size':['interpolate',['linear'],['zoom'],12,.45,17,.9],'icon-allow-overlap':true,...TXT,'text-field':['step',['zoom'],'',15,NM],'text-size':10.5,'text-offset':[0,1.4]},paint:{'icon-opacity':.75,'text-color':'#5a5470','text-halo-color':'#fff','text-halo-width':2}},
   {id:'poi-cand',type:'symbol',source:'omt','source-layer':'poi',minzoom:10.5,filter:['all',CAND,HID],layout:{'icon-image':'zi-cand','icon-size':['interpolate',['linear'],['zoom'],10.5,.38,13,.6,17,1.05],'icon-allow-overlap':true,...TXT,'text-field':['step',['zoom'],'',14,NM],'text-size':12,'text-offset':[0,1.7]},paint:{'text-color':'#140f1f','text-halo-color':'#ffe680','text-halo-width':2.6}}];
  return{version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{omt:{type:'vector',url:'https://tiles.openfreemap.org/planet'},
    dem:{type:'raster-dem',tiles:DEM,encoding:'terrarium',tileSize:256,maxzoom:14},dem3:{type:'raster-dem',tiles:DEM,encoding:'terrarium',tileSize:256,maxzoom:14}},layers:[
   {id:'bg',type:'background',paint:{'background-color':P.bg}},
   {id:'res',type:'fill',source:'omt','source-layer':'landuse',filter:['in',['get','class'],['literal',['residential','suburb','neighbourhood','commercial','retail','industrial']]],paint:{'fill-color':P.res}},
   {id:'farm',type:'fill',source:'omt','source-layer':'landcover',filter:['in',['get','class'],['literal',['farmland','grass']]],paint:{'fill-color':P.farm,'fill-opacity':.8}},
   {id:'wood',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':P.wood}},
   {id:'hill',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':n?.35:.55,'hillshade-shadow-color':n?'#07050c':'#8f7bbf','hillshade-highlight-color':n?'#3b2f6e':'#fffdf3','hillshade-accent-color':n?'#140f1f':'#b6a3dc'}},
   {id:'park',type:'fill',source:'omt','source-layer':'park',paint:{'fill-color':P.park,'fill-outline-color':P.cas}},
   {id:'water',type:'fill',source:'omt','source-layer':'water',paint:{'fill-color':P.water,'fill-outline-color':P.cas}},
   {id:'waterway',type:'line',source:'omt','source-layer':'waterway',paint:{'line-color':P.water,'line-width':['interpolate',['linear'],['zoom'],12,1.5,17,7]}},
   {id:'road-cas',type:'line',source:'omt','source-layer':'transportation',filter:ROADS,layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':P.cas,'line-width':[...R,12,['match',['get','class'],MJ,3,SC,2.4,1.4],18,['match',['get','class'],MJ,30,SC,24,['service'],10,17]]}},
   {id:'road',type:'line',source:'omt','source-layer':'transportation',filter:ROADS,layout:{'line-cap':'round','line-join':'round'},
    paint:{'line-color':['match',['get','class'],['motorway','trunk','primary','secondary'],P.main,P.road],'line-width':[...R,12,['match',['get','class'],MJ,1.8,SC,1.4,.7],18,['match',['get','class'],MJ,24,SC,19,['service'],7,13]]}},
   {id:'path',type:'line',source:'omt','source-layer':'transportation',filter:['in',['get','class'],['literal',['path','track']]],paint:{'line-color':P.rail,'line-width':1.5,'line-dasharray':[2,2]}},
   {id:'rail',type:'line',source:'omt','source-layer':'transportation',filter:['==',['get','class'],'rail'],paint:{'line-color':P.rail,'line-width':2.5,'line-dasharray':[3,2]}},
   {id:'bld',type:'fill',source:'omt','source-layer':'building',minzoom:14,paint:{'fill-color':P.bld,'fill-outline-color':P.bldl}},
   {id:'bld-line',type:'line',source:'omt','source-layer':'building',minzoom:15,paint:{'line-color':P.bldl,'line-width':1.2}},
   {id:'bld3d',type:'fill-extrusion',source:'omt','source-layer':'building',minzoom:14,layout:{visibility:'none'},paint:{'fill-extrusion-color':P.bld,'fill-extrusion-height':['coalesce',['get','render_height'],6],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.93}},...POIS]};}
function lmDist(a,b,c,d){const k=Math.cos(a*Math.PI/180);return Math.round(Math.hypot((c-a)*110540,(d-b)*111320*k));}
function cellLL(m,x,y){const k=Math.cos(m.lat*Math.PI/180);const mx=(x-200)*1.9,my=(y-170)*1.9;return[m.lon+mx/(111320*k),m.lat-my/110540];}
function hexRing(m,x,y,r){const out=[];for(let i=0;i<=6;i++){const a=Math.PI/180*(60*(i%6)-30);out.push(cellLL(m,x+r*Math.cos(a),y+r*Math.sin(a)));}return[out];}
async function lmGeocode(addr){const w=await trWhere(addr);return{lat:w.lat,lon:w.lon,els:[],place:addr};}
const elDiv=(cls,html)=>{const d=document.createElement('div');d.className='lm '+cls;d.innerHTML=html;return d;};
/* nomi di vie e paesi con il carattere del fumetto, presi dalla mappa stessa */
function lmLabels(map,box){(box._lbl||[]).forEach(x=>x.remove());const out=[];const z=map.getZoom();box._lbl=out;if(z<12.5)return;
  const seen=[];const near=(n,p,d)=>seen.some(s=>s.n===n&&Math.hypot(s.p.x-p.x,s.p.y-p.y)<d);const W=box.clientWidth,H=box.clientHeight;let feats=[];
  try{feats=map.querySourceFeatures('omt',{sourceLayer:'transportation_name'});}catch(e){}
  const rank={motorway:1,trunk:1,primary:1,secondary:2,tertiary:2,minor:3,service:4};
  feats.sort((a,b)=>(rank[a.properties.class]||5)-(rank[b.properties.class]||5));
  outer:for(const f of feats){const n=f.properties['name:it']||f.properties.name;const r=rank[f.properties.class]||5;if(!n||r>4||(r>=3&&z<15)||(r===4&&z<16))continue;
    const lines=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];
    for(const c of lines){if(!c||c.length<2)continue;const i=Math.floor((c.length-1)/2);const a=map.project(c[i]),b=map.project(c[i+1]);const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(mid.x<0||mid.y<0||mid.x>W||mid.y>H||near(n,mid,220))continue;seen.push({n,p:mid});
      let ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
      out.push(new maplibregl.Marker({element:elDiv('lm-lbl c'+r,`<span>${esc(n.toUpperCase())}</span>`),rotation:ang,rotationAlignment:'map'}).setLngLat(map.unproject([mid.x,mid.y])).addTo(map));if(out.length>90)break outer;}}
  let pl=[];try{pl=map.querySourceFeatures('omt',{sourceLayer:'place'});}catch(e){}
  const pr={city:1,town:1,village:2,suburb:2,hamlet:3,neighbourhood:3,isolated_dwelling:4};
  pl.forEach(f=>{const n=f.properties['name:it']||f.properties.name;const r=pr[f.properties.class];if(!n||!r||(r===3&&z<14)||(r===4&&z<15.5))return;const p=map.project(f.geometry.coordinates);
    if(p.x<0||p.y<0||p.x>W||p.y>H||near(n,p,400))return;seen.push({n,p});out.push(new maplibregl.Marker({element:elDiv('lm-place p'+r,`<span>${esc(n.toUpperCase())}</span>`)}).setLngLat(f.geometry.coordinates).addTo(map));});}
/* costruisce la mappa dentro un elemento */
async function liveMapBase(el,addr,o={}){await loadML();let m=(RM.cache&&RM.cache[addr])||await lmGeocode(addr);
  if(!m.els||!m.els.length)rmFetch(addr).then(r=>{S.realNames=rmTopNames(r);}).catch(()=>{});
  el.innerHTML=`<div class="lmap ${o.night?'night':''}"><div class="lm-gl"></div><div class="lm-frame"></div><button class="lm-mode" type="button">${o.night?'☀️ Giorno':'🌙 Notte'}</button><button class="lm-3d" type="button">🏙️ 3D</button><button class="lm-10" type="button">🔭 10 km</button></div>`;
  const box=el.querySelector('.lmap'),gl=box.querySelector('.lm-gl');let night=!!o.night;
  const map=new maplibregl.Map({container:gl,style:zStyle(night),center:[m.lon,m.lat],zoom:o.zoom||16,maxZoom:19,dragRotate:false,pitchWithRotate:false,attributionControl:false});
  map.on('styleimagemissing',e=>zIcon(map,e.id));(window.__zmaps=window.__zmaps||[]).push(map);
  try{map.touchZoomRotate.disableRotation();}catch(e){}
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');
  map.addControl(new maplibregl.AttributionControl({customAttribution:'© OpenStreetMap · OpenFreeMap',compact:true}));
  await new Promise(r=>{let done=false;const f=()=>{if(!done){done=true;r();}};map.once('load',f);setTimeout(f,6000);});
  const MK={me:[],spons:[],cand:[],biz:[],pub:[]};
  const add=(k,ll,elm,click)=>{if(click)elm.addEventListener('click',e=>{e.stopPropagation();click();});MK[k].push(new maplibregl.Marker({element:elm,anchor:'bottom'}).setLngLat(ll).addTo(map));};
  add('me',[m.lon,m.lat],elDiv('lm-tu','<svg viewBox="0 0 44 44" width="44" height="44"><path d="M4 21 L22 5 L40 21 V41 H4Z" fill="#d7263d" stroke="#140f1f" stroke-width="3" stroke-linejoin="round"/><text x="22" y="35" text-anchor="middle" font-family="Bangers,Impact" font-size="15" fill="#fff">TU</text></svg>'));
  const GEO=window.SP_GEO||{};const useGeo=Object.keys(GEO).some(k=>GEO[k]&&GEO[k].lat!=null&&SPONSORS[k]);
  const z=S.zone||{seed:7,address:addr};
  const spEl=(sk,nm)=>elDiv('lm-sp',`<b>${esc(SPONSORS[sk].logo)}</b><i>⭐</i><em>${esc(nm||SPONSORS[sk].name)}</em>`);
  /* tocchi su attività, servizi e posti sponsor disegnati dalla mappa */
  const poiInfo=f=>{const p=f.properties||{};const sub=p.subclass||p.class||'';const c=f.geometry.coordinates;const nm=p['name:it']||p.name||POI_N[sub]||'Attività';return{sub,nm,ll:[c[1],c[0]],d:lmDist(m.lat,m.lon,c[1],c[0])};};
  map.on('click','poi-cand',e=>{const f=e.features&&e.features[0];if(!f)return;const x=poiInfo(f);if(typeof bizSheet==='function')bizSheet({i:'t'+(f.id||x.nm),ic:({locksmith:'🔑',electrical:'💡',paint:'🎨',glaziery:'🪟',trade:'🧱',building_materials:'🧱',security:'🛡️'})[x.sub]||'🔧',name:x.nm,cat:POI_N[x.sub]||'Attività per la casa',d:x.d,ll:x.ll,cand:true},z);});
  map.on('click','poi-pub',e=>{const f=e.features&&e.features[0];if(!f)return;const x=poiInfo(f);lmPoi(x.nm,POI_N[x.sub]||'Servizio pubblico',x.d,x.ll,true);});
  map.on('click','poi-hid',e=>{const f=e.features&&e.features[0];if(!f)return;const x=poiInfo(f);openSheet('🚫 Attività nascosta',`<div class="bzc"><div class="bzc-hero" style="--c:#e6e1d6"><span class="bzc-ic">🚫</span><div class="bzc-t"><span class="bzc-cat">${esc(POI_N[x.sub]||'Attività')}</span><h4>${esc(x.nm)}</h4><small>Nascosta a tutti: la vedi solo tu perché sei amministratore.</small></div></div>
    <p style="font-weight:400;margin:12px 0">Se diventa sponsor o vuoi rimetterla, tocca qui sotto: torna visibile a tutti subito.</p><button class="btn wide" data-unh>✅ Rimetti sulla mappa</button></div>`,card=>{card.querySelector('[data-unh]').onclick=()=>zUnhide(x.nm);});});
  zIsAdmin().then(()=>zApplyHidden());
  map.on('click','poi-biz',e=>{const f=e.features&&e.features[0];if(!f)return;const x=poiInfo(f);if(typeof bizSheet==='function')bizSheet({i:'t'+(f.id||x.nm),ic:(ZICON[({supermarket:'super',convenience:'super',grocery:'super',cafe:'bar',bar:'bar',pub:'bar',restaurant:'rist',fast_food:'rist',bakery:'pane',fuel:'fuel',bank:'bank',hairdresser:'hair',clothes:'abiti',hotel:'hotel'})[x.sub]]||ZICON.shop)[0],name:x.nm,cat:POI_N[x.sub]||'Attività',d:x.d,ll:x.ll},z);});
  ['poi-cand','poi-pub','poi-biz'].forEach(id=>{map.on('mouseenter',id,()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave',id,()=>{map.getCanvas().style.cursor='';});});
  if(useGeo)Object.entries(GEO).forEach(([sk,g])=>{if(!g||g.lat==null||!SPONSORS[sk])return;add('spons',[g.lon,g.lat],spEl(sk),()=>sponsorSheet(sk,z));});
  /* aree community */
  const cells=commCells(S.zone||{seed:7});const col=c=>c.n>=K_MIN?(c.avg<=4?'#3f9b5f':c.avg<=6?'#f7d64a':'#d7263d'):'#cfc6e6';
  const fc=()=>({type:'FeatureCollection',features:cells.map((c,i)=>({type:'Feature',properties:{i,fill:c._fill||col(c),op:c._op!=null?c._op:(c.n>=K_MIN?.3:.08)},geometry:{type:'Polygon',coordinates:hexRing(m,c.x,c.y,33)}}))});
  const L0=S.rmL||{spons:true,biz:true,pub:true,comm:false};const vis=k=>o[k]!==undefined?o[k]:L0[k];const st={comm:vis('comm')};let lm=null;
  const addOver=()=>{if(map.getSource('comm'))return;map.addSource('comm',{type:'geojson',data:fc()});
    map.addLayer({id:'comm-fill',type:'fill',source:'comm',paint:{'fill-color':['get','fill'],'fill-opacity':['get','op']},layout:{visibility:st.comm?'visible':'none'}});
    map.addLayer({id:'comm-line',type:'line',source:'comm',paint:{'line-color':'#140f1f','line-width':1.5},layout:{visibility:st.comm?'visible':'none'}});
    map.addSource('fx',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    map.addLayer({id:'fx-line',type:'line',source:'fx',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':'#7bd36b','line-width':3,'line-dasharray':[2,1.5]}});
    map.addLayer({id:'fx-pt',type:'circle',source:'fx',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':['coalesce',['get','r'],5],'circle-color':['coalesce',['get','c'],'#7bd36b'],'circle-stroke-color':'#140f1f','circle-stroke-width':1.5,'circle-opacity':['coalesce',['get','o'],1],'circle-stroke-opacity':['coalesce',['get','o'],1]}});};
  addOver();map.on('click','comm-fill',e=>{const f=e.features&&e.features[0];if(f&&lm&&lm.onCell)lm.onCell(+f.properties.i);});
  const LV={spons:vis('spons'),biz:vis('biz'),pub:vis('pub')};const POIL={spons:['poi-cand'],biz:['poi-biz'],pub:['poi-pub']};
  const applyLV=()=>Object.entries(POIL).forEach(([k,ids])=>ids.forEach(id=>{try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',LV[k]?'visible':'none');}catch(e){}}));
  const setLayer=(k,on)=>{if(LV[k]!==undefined){LV[k]=on;applyLV();}if(k==='comm'){st.comm=on;['comm-fill','comm-line'].forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');});return;}(MK[k]||[]).concat(k==='spons'?MK.cand:[]).forEach(x=>{x.getElement().style.display=on?'':'none';});};
  ['spons','biz','pub'].forEach(k=>setLayer(k,vis(k)));
  const relabel=()=>lmLabels(map,box);map.on('moveend',relabel);map.on('idle',()=>{if(!box._lbl||!box._lbl.length)relabel();});setTimeout(relabel,1500);
  box.querySelector('.lm-mode').onclick=e=>{e.stopPropagation();night=!night;box.classList.toggle('night',night);e.target.textContent=night?'☀️ Giorno':'🌙 Notte';
    map.setStyle(zStyle(night));map.once('styledata',()=>{setTimeout(()=>{addOver();lm.refresh();relabel();},300);});};
  const inRing=(r,x,y)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;};
  const findMine=()=>{if(box._mineF)return box._mineF;try{const pt=map.project([m.lon,m.lat]);const fs=map.queryRenderedFeatures([[pt.x-3,pt.y-3],[pt.x+3,pt.y+3]],{layers:['bld']});
      for(const f of fs){const g=f.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
        const hit=polys.find(pl=>pl[0]&&inRing(pl[0],m.lon,m.lat));if(!hit)continue;
        const xs=hit[0].map(c=>c[0]),ys=hit[0].map(c=>c[1]);if(lmDist(Math.min(...ys),Math.min(...xs),Math.max(...ys),Math.max(...xs))>250)continue;
        box._mineF={type:'Feature',properties:{h:(f.properties&&f.properties.render_height)||8},geometry:{type:'Polygon',coordinates:hit}};break;}}catch(e){}return box._mineF;};
  const set3d=()=>{try{['bld3d','mine-3d'].forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',box._3d?'visible':'none');});map.setTerrain(box._3d?{source:'dem3',exaggeration:1.4}:null);}catch(e){}};
  const extras=()=>{try{applyLV();if(map.getSource('mine'))return;const f=findMine();
      map.addSource('mine',{type:'geojson',data:{type:'FeatureCollection',features:f?[f]:[]}});
      map.addLayer({id:'mine-fill',type:'fill',source:'mine',paint:{'fill-color':'#d7263d','fill-outline-color':'#140f1f'}});
      map.addLayer({id:'mine-3d',type:'fill-extrusion',source:'mine',layout:{visibility:box._3d?'visible':'none'},paint:{'fill-extrusion-color':'#d7263d','fill-extrusion-height':['coalesce',['get','h'],8],'fill-extrusion-opacity':.97}});
      const G0=S.geo;if(G0&&G0.acc>12&&lmDist(G0.lat,G0.lon,m.lat,m.lon)<40){map.addSource('acc',{type:'geojson',data:trCircle(m.lat,m.lon,Math.min(G0.acc,400))});
        map.addLayer({id:'acc-l',type:'line',source:'acc',paint:{'line-color':'#2f5fb8','line-width':2,'line-dasharray':[2,2]}});}
      if(box._3d)set3d();}catch(e){console.warn('mappa extra',e);}};
  const retryMine=()=>{if(box._mineF)return;const f=findMine();const src=map.getSource('mine');if(f&&src)src.setData({type:'FeatureCollection',features:[f]});};
  map.on('idle',retryMine);map.on('styledata',()=>{if(!map.getSource('mine'))setTimeout(()=>{if(map.isStyleLoaded())extras();},300);});
  if(map.isStyleLoaded())extras();
  box.querySelector('.lm-10').onclick=e=>{e.stopPropagation();box._far=!box._far;e.currentTarget.classList.toggle('on',box._far);e.currentTarget.textContent=box._far?'🏠 Vicino':'🔭 10 km';
    if(box._far){const d=10000/110540,k=d/Math.cos(m.lat*Math.PI/180);map.fitBounds([[m.lon-k,m.lat-d],[m.lon+k,m.lat+d]],{padding:10,duration:900});}else map.easeTo({center:[m.lon,m.lat],zoom:o.zoom||16,duration:900});setTimeout(relabel,1000);};
  box.querySelector('.lm-3d').onclick=e=>{e.stopPropagation();box._3d=!box._3d;e.currentTarget.classList.toggle('on',box._3d);set3d();map.easeTo({pitch:box._3d?58:0,zoom:box._3d?Math.max(map.getZoom(),16.3):map.getZoom(),duration:800});setTimeout(relabel,900);};
  lm={map,m,cells,MK,setLayer,refresh:()=>{const s=map.getSource('comm');if(s)s.setData(fc());},fx:d=>{const s=map.getSource('fx');if(s)s.setData(d);},onCell:null};
  let touched=false;map.on('dragstart',()=>{touched=true;});map.on('zoomstart',e=>{if(e&&e.originalEvent)touched=true;});
  const fit=()=>{try{map.resize();if(!touched)map.jumpTo({center:[m.lon,m.lat]});}catch(e){}};
  [120,400,1200].forEach(t=>setTimeout(fit,t));try{new ResizeObserver(fit).observe(box);}catch(e){}
  return lm;}
/* Mondo, Valuta e scheda "zona vera" */
const _rmMount19=rmMount;
rmMount=async function(box,addr){const el=box.querySelector('.rm-svg'),info=box.querySelector('.rm-info');
  try{el.innerHTML='<div class="rm-load"><span class="spin"></span> Disegno la mappa a fumetto della tua zona…</div>';const lm=await liveMap(el,addr);
    if(info)info.innerHTML='<span class="muted">Muovi la mappa con un dito, allarga con due. Tocca bollini e simboli.</span>';
    box.querySelectorAll('[data-rml]').forEach(b=>b.onclick=()=>{const k=b.dataset.rml;S.rmL=S.rmL||{};S.rmL[k]=!S.rmL[k];b.classList.toggle('on');lm.setLayer(k,S.rmL[k]);});
    if(lm.m.els&&lm.m.els.length)S.realNames=rmTopNames(lm.m);return true;}
  catch(e){console.warn('mappa a fumetto',e);return _rmMount19(box,addr);}};
/* Simula → Il mio quartiere, di notte */
const _rsq19=renderSimQuart;
renderSimQuart=function(){S.qLive=null;_rsq19();if(!S.zone||!S.zone.address)return;const box=document.getElementById('qmap');if(!box)return;
  liveMap(box,S.zone.address,{night:true,biz:false,comm:true,zoom:15}).then(lm=>{if(!document.body.contains(box))return;S.qScale=null;S.qLive=lm;
    const n=document.querySelector('.page p.muted');if(n)n.textContent='La tua zona vera, navigabile, divisa in aree della community. Solo dati aggregati, mai una casa singola.';}).catch(()=>{});};
const _qSiege19=qSiege;
qSiege=function(){if(!S.qLive)return _qSiege19();const lm=S.qLive,map=lm.map,m=lm.m;const btn=$('#qGo');btn.disabled=true;$('#qrep').innerHTML='';
  document.getElementById('qmap').scrollIntoView({behavior:'smooth',block:'start'});
  const cs=qCells().map((c,i)=>({...c,i,ll:cellLL(m,c.x,c.y)}));let me=cs[0],bd=1e9;cs.forEach(c=>{const d=lmDist(m.lat,m.lon,c.ll[1],c.ll[0]);if(d<bd){bd=d;me=c;}});
  const myIdx=S.qtog.rimedi?myIdxNow():(S.result?S.result.idx:myIdxNow());me.eff=Math.min(me.eff,myIdx);me.out=myIdx<=4.2?'tiene':myIdx<=6?'regge':'cede';
  const DUR=20000,col={tiene:'#3f9b5f',regge:'#f7d64a',cede:'#d7263d'},cnt={tiene:0,regge:0,cede:0};
  const live=$('#qlive'),prog=$('#qprog');const upd=()=>{if(live)live.innerHTML=`<span class="ok">✓ ${cnt.tiene} tengono</span><span class="mid">! ${cnt.regge} reggono</span><span class="ko">✕ ${cnt.cede} cedono</span>`;};upd();
  const cap=t=>{const c=$('#qcap');if(!c)return;c.textContent=t;c.classList.remove('in');void c.offsetWidth;c.classList.add('in');},clock=t=>{const c=$('#qclock');if(c)c.textContent=t;};
  lm.cells.forEach(c=>{c._fill='#1a1433';c._op=.35;});lm.setLayer('comm',true);lm.refresh();
  (S.qMarks||[]).forEach(x=>x.remove());S.qMarks=[];
  const b=map.getBounds(),N=b.getNorth(),Sx=b.getSouth(),E=b.getEast(),W=b.getWest();
  const pool=[];cs.forEach(c=>{for(let k=0;k<Math.max(1,Math.round((c.eff-2)*1.6));k++)pool.push(c);});
  const Z=[];for(let k=0;k<60;k++){const side=k%3,s=side===0?[W+Math.random()*(E-W),Sx]:side===1?[W,Sx+Math.random()*(N-Sx)]:[E,Sx+Math.random()*(N-Sx)];const tg=pool[Math.floor(Math.random()*pool.length)];
    Z.push({s,t:[tg.ll[0]+(Math.random()-.5)*.0008,tg.ll[1]+(Math.random()-.5)*.0006],d:Math.random()*5000});}
  const lines=[];let zo=1;
  const draw=t=>{const f=Z.map(z=>{const p=Math.max(0,Math.min(1,(t-z.d)/8000)),q=1-Math.pow(1-p,2);return{type:'Feature',properties:{o:zo},geometry:{type:'Point',coordinates:[z.s[0]+(z.t[0]-z.s[0])*q,z.s[1]+(z.t[1]-z.s[1])*q]}};});
    f.push({type:'Feature',properties:{r:26,c:'#f7d64a',o:.25},geometry:{type:'Point',coordinates:me.ll}});lm.fx({type:'FeatureCollection',features:f.concat(lines)});};
  const t0=performance.now();let raf;(function mv(){const t=performance.now()-t0;draw(t);if(prog)prog.style.width=Math.min(100,t/DUR*100)+'%';if(t<DUR+400&&S.qLive===lm)raf=requestAnimationFrame(mv);})();
  const T=(ms,f)=>setTimeout(()=>{if(S.qLive===lm)try{f();}catch(e){}},ms);
  const mark=(c,txt)=>{S.qMarks.push(new maplibregl.Marker({element:elDiv('lm-mk',txt)}).setLngLat(c.ll).addTo(map));};
  cs.slice().sort((a,b)=>b.eff-a.eff).forEach((c,k)=>T(4000+k/cs.length*12500,()=>{const cc=lm.cells[c.i];cc._fill=col[c.out];cc._op=c.known?.55:.3;lm.refresh();cnt[c.out]++;upd();
    if(c.out==='cede'){mark(c,'💥');sfx('crack');}else if(c===me||c.known)mark(c,c.out==='tiene'?'✓':'!');}));
  [[0,'22:00','L’orda arriva dalla campagna e dalle strade di ingresso.'],[3500,'23:00','Gli zombie puntano alle aree meno preparate.'],[7500,'00:30',S.qtog.gruppo?'Il gruppo di quartiere si attiva: i vicini si avvisano e si aiutano.':'Ogni casa si difende da sola: nessuno avvisa i vicini.'],
   [11500,'02:00',S.qtog.raccolta?'I servizi pubblici diventano punti di raccolta sicuri.':'Il momento più duro della notte.'],[15500,'04:30',S.qtog.luci?'Le luci a sensore nelle vie rallentano l’orda.':'L’orda insiste sulle ultime aree.'],[18000,'06:00','Alba. Ecco come ha passato la notte il quartiere.']].forEach(([ms,h,t])=>T(ms,()=>{clock(h);cap(t);}));
  T(1,()=>sfx('horn'));T(7600,()=>{if(S.qtog.gruppo)cs.filter(c=>c!==me&&lmDist(c.ll[1],c.ll[0],me.ll[1],me.ll[0])<180).forEach(c=>lines.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[me.ll,c.ll]}}));});
  T(DUR,()=>{cancelAnimationFrame(raf);zo=.25;draw(DUR+9000);sfx('win');btn.disabled=false;btn.textContent='🌙 Rilancia la notte';
    lm.onCell=i=>{const c=cs.find(x=>x.i===i);if(c)qArea(c,c===me);};qReport(cs,me);});};
</script>
