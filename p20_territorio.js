<script>
/* =========================================================
   TERRITORIO VERO
   - posizione precisa: GPS a più letture + civico più vicino
     + conferma "È qui casa tua?" con segnaposto da trascinare
   - zona reale: servizi veri (OpenStreetMap, 2,5 km), densità
     di case, acqua vicina, rilievo vero (quote Copernicus via
     Open-Meteo, riserva: AWS Terrain Tiles)
   - tutto il gioco dipende da qui: salite/discese/alture/zone
     basse vere, bonus da servizi e sponsor, spedizioni verso
     posti veri con tempi che contano distanza e dislivello
   ========================================================= */
function trHouse(els,lat,lon){if(!els||!els.length)return null;const k=Math.cos(lat*Math.PI/180);const XY=p=>[(p.lon-lon)*111320*k,(p.lat-lat)*110540];
  const W=els.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>3);const inR=(r,x,y)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;};
  let me=W.find(e=>inR(e.geometry.map(XY),0,0));
  if(!me){let bd=25;W.forEach(e=>{const P=e.geometry.map(XY);const c=P.reduce((a,p)=>[a[0]+p[0]/P.length,a[1]+p[1]/P.length],[0,0]);const d=Math.hypot(...c);if(d<bd){bd=d;me=e;}});}
  if(!me)return null;const t=me.tags||{};const P=me.geometry.map(XY);
  let area=0;for(let i=0,j=P.length-1;i<P.length;j=i++)area+=(P[j][0]+P[i][0])*(P[j][1]-P[i][1]);area=Math.abs(area/2);
  let len=0,ang=0;for(let i=1;i<P.length;i++){const L=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);if(L>len){len=L;ang=Math.atan2(P[i][1]-P[i-1][1],P[i][0]-P[i-1][0]);}}
  const ca=Math.cos(-ang),sa=Math.sin(-ang);const R=P.map(([x,y])=>[x*ca-y*sa,x*sa+y*ca]);const xs=R.map(p=>p[0]),ys=R.map(p=>p[1]);
  const L1=Math.max(...xs)-Math.min(...xs),L2=Math.max(...ys)-Math.min(...ys);
  const nodes=new Set(me.nodes||[]);const att=W.filter(e=>e!==me&&(e.nodes||[]).filter(n=>nodes.has(n)).length>=2).length;
  const bt=t.building||'yes';let lv=+t['building:levels']||(t.height?Math.round(parseFloat(t.height)/3):0);
  let kind=bt==='apartments'||lv>=4?'apt':bt==='terraced'||att>=2?'schiera':bt==='semidetached_house'||att===1?'bifamiliare':['farm','farm_auxiliary','barn','farmhouse'].includes(bt)||area>450&&lv<=2?'casale':'villa';
  if(!lv)lv=kind==='apt'?(area>600?5:4):kind==='casale'?2:2;
  const roof=t['roof:shape']||(kind==='apt'?'flat':'gabled');
  const cg=me.geometry.reduce((q,p)=>[q[0]+p.lat/me.geometry.length,q[1]+p.lon/me.geometry.length],[0,0]);
  return{bid:'w'+me.id,clat:+cg[0].toFixed(6),clon:+cg[1].toFixed(6),kind,bt,levels:Math.min(12,lv),roof,area:Math.round(area),len:Math.round(Math.max(L1,L2)),wid:Math.round(Math.min(L1,L2)),att,
    col:t['building:colour']||'',rcol:t['roof:colour']||'',mat:t['building:material']||'',poly:R.map(p=>[Math.round(p[0]*10)/10,Math.round(p[1]*10)/10])};}
const TR_N=11,TR_STEP=60,TR_FR=2500,TR_U=1.2;
const trSig=ms=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;};
function trM(la1,lo1,la2,lo2){const k=Math.cos(la1*Math.PI/180);return Math.hypot((la2-la1)*110540,(lo2-lo1)*111320*k);}
function trOff(lat,lon,dxE,dyN){const k=Math.cos(lat*Math.PI/180);return[lat+dyN/110540,lon+dxE/(111320*k)];}
function trLabel(a){if(!a)return'';const t=a.village||a.town||a.city||a.municipality||a.hamlet||'';return a.road?`${a.road}${a.house_number?' '+a.house_number:''}${t?', '+t:''}`:t;}
const TR_OVP=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function trOverpass(q,ms=20000,max=4){const one=ep=>fetch(ep,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:trSig(ms)}).then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.json();}).then(d=>{if(!d||!d.elements)throw new Error('vuoto');return d.elements;});
  /* i server pubblici si arrabbiano se li chiami tutti insieme: parto dal primo e, se tarda o sbaglia, passo al successivo */
  const L=TR_OVP.slice(0,Math.max(2,max));return new Promise((ok,ko)=>{let fail=0,done=false,next=0;
    const go=()=>{if(done||next>=L.length)return;const ep=L[next++];one(ep).then(v=>{if(!done){done=true;ok(v);}}).catch(()=>{fail++;if(fail>=L.length&&!done){done=true;ko(new Error('overpass'));}else go();});};
    go();setTimeout(go,2500);setTimeout(go,6000);});}
async function trGeocode(addr){const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=it&accept-language=it&q='+encodeURIComponent(addr),{signal:trSig(7000)}).then(x=>x.json());
  if(!r||!r[0])throw new Error('Indirizzo non trovato');const a=r[0].address||{};return{lat:+r[0].lat,lon:+r[0].lon,precise:!!a.house_number,label:trLabel(a)||addr};}
/* dove sta la casa: prima la posizione confermata, poi quella già analizzata, poi l'indirizzo */
async function trWhere(addr){
  if(S.geo&&S.geo.addr===addr&&S.geo.lat!=null)return{lat:S.geo.lat,lon:S.geo.lon,acc:S.geo.acc||null,src:S.geo.src||'gps'};
  if(S.zone&&S.zone.address===addr&&S.zone.real)return{lat:S.zone.real.lat,lon:S.zone.real.lon,acc:S.zone.real.acc||null,src:S.zone.real.src||'indirizzo'};
  const g=await trGeocode(addr);return{lat:g.lat,lon:g.lon,acc:g.precise?null:150,src:'indirizzo'};}
/* indirizzo dal punto: Nominatim + civico più vicino da OpenStreetMap */
async function trReverse(lat,lon){
  const tm=new Promise(r=>setTimeout(()=>r(null),8000));
  const [nom,ov]=await Promise.all([
    Promise.race([fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=it&zoom=18&addressdetails=1`,{signal:trSig(7000)}).then(x=>x.json()).catch(()=>null),tm]),
    Promise.race([trOverpass(`[out:json][timeout:8];nwr["addr:housenumber"](around:40,${lat},${lon});out center tags;`,7000,2).catch(()=>null),tm])]);
  const a=(nom&&nom.address)||{};let best=null;
  (ov||[]).forEach(e=>{const t=e.tags||{};const la=e.lat!=null?e.lat:(e.center&&e.center.lat),lo=e.lon!=null?e.lon:(e.center&&e.center.lon);if(la==null||!t['addr:street'])return;const d=trM(lat,lon,la,lo);if(!best||d<best.d)best={d,st:t['addr:street'],hn:t['addr:housenumber'],city:t['addr:city']};});
  const town=a.village||a.town||a.city||a.municipality||(best&&best.city)||'';
  if(best&&(!a.house_number||best.d<15))return`${best.st} ${best.hn}${town?', '+town:''}`;
  return trLabel(a)||`${lat.toFixed(5)}, ${lon.toFixed(5)}`;}
/* GPS: più letture, tiene la più precisa */
function trLocate(onAcc){return new Promise((ok,ko)=>{let best=null,last=null,done=false;const t0=Date.now();
  const fin=()=>{if(done)return;done=true;try{navigator.geolocation.clearWatch(id);}catch(e){}clearTimeout(tm);best?ok(best):ko(last||{code:2});};
  const id=navigator.geolocation.watchPosition(p=>{const c=p.coords;const a=Math.round(c.accuracy||9999);if(!best||a<best.acc){best={lat:c.latitude,lon:c.longitude,acc:a};if(onAcc)onAcc(a);}
      const el=Date.now()-t0;if(best.acc<=15||(el>5000&&best.acc<=35)||(el>9000&&best.acc<=80))fin();},
    e=>{last=e;if(e.code===1)fin();},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  const tm=setTimeout(fin,16000);});}
/* conferma: "È qui casa tua?" con segnaposto da trascinare */
function trCircle(lat,lon,r){const out=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;const p=trOff(lat,lon,Math.cos(a)*r,Math.sin(a)*r);out.push([p[1],p[0]]);}return{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[out]}};}
function trPick(o){return new Promise(res=>{let cur={lat:o.lat,lon:o.lon,label:o.label},moved=false,map=null,tmr=null;
  openSheet('📍 È qui casa tua?',`<p style="font-weight:700;font-size:17px;margin-bottom:4px" id="pkTxt">${esc(o.label||'')}</p>
    <div class="pkmap" id="pkMap"><div class="rm-load"><span class="spin"></span> Carico la mappa…</div></div>
    <p class="muted" style="font-size:12.5px;margin:6px 0 10px">${o.acc?`Precisione ±${o.acc} m. `:''}Se la casa rossa non è sul tuo tetto, <b>trascinala</b> nel punto giusto: serve per servizi, salite e sponsor veri.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-pkok>✅ Sì, è casa mia</button><button class="btn ghost small" data-pkno>Annulla</button></div>`,card=>{
    card.querySelector('[data-pkok]').onclick=()=>{clearTimeout(tmr);closeSheet();res({lat:+cur.lat.toFixed(6),lon:+cur.lon.toFixed(6),acc:moved?5:(o.acc||null),label:cur.label,src:moved?'pin':o.src});};
    card.querySelector('[data-pkno]').onclick=()=>{closeSheet();res(null);};
    const box=card.querySelector('#pkMap');
    loadML().then(()=>{box.innerHTML='';map=new maplibregl.Map({container:box,style:zStyle(false),center:[o.lon,o.lat],zoom:o.acc&&o.acc>120?16:18,maxZoom:19.5,dragRotate:false,attributionControl:false});
      map.on('styleimagemissing',e2=>zIcon(map,e2.id));try{map.touchZoomRotate.disableRotation();}catch(e){}map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');
      map.on('load',()=>{try{if(o.acc&&o.acc>8){map.addSource('acc',{type:'geojson',data:trCircle(o.lat,o.lon,o.acc)});map.addLayer({id:'acc',type:'fill',source:'acc',paint:{'fill-color':'#2f5fb8','fill-opacity':.12}});map.addLayer({id:'acc-l',type:'line',source:'acc',paint:{'line-color':'#2f5fb8','line-width':2,'line-dasharray':[2,2]}});}}catch(e){}});
      const el=elDiv('lm-tu pk','<svg viewBox="0 0 44 44" width="48" height="48"><path d="M4 21 L22 5 L40 21 V41 H4Z" fill="#d7263d" stroke="#140f1f" stroke-width="3" stroke-linejoin="round"/><text x="22" y="35" text-anchor="middle" font-family="Bangers,Impact" font-size="15" fill="#fff">TU</text></svg>');
      const mk=new maplibregl.Marker({element:el,anchor:'bottom',draggable:true}).setLngLat([o.lon,o.lat]).addTo(map);
      const upd=ll=>{cur.lat=ll.lat;cur.lon=ll.lng;moved=true;const t=card.querySelector('#pkTxt');if(t)t.textContent='Cerco l’indirizzo…';clearTimeout(tmr);
        tmr=setTimeout(()=>trReverse(ll.lat,ll.lng).then(l=>{cur.label=l;const t2=card.querySelector('#pkTxt');if(t2)t2.textContent=l;}),400);};
      mk.on('dragend',()=>upd(mk.getLngLat()));map.on('click',e=>{mk.setLngLat(e.lngLat);upd(e.lngLat);});
      setTimeout(()=>map.resize(),200);})
    .catch(()=>{box.innerHTML='<p class="notice">Mappa non disponibile ora: se l’indirizzo sopra è giusto, conferma.</p>';});});});}
function trSetHome(o){S.geo={lat:o.lat,lon:o.lon,acc:o.acc||null,addr:o.label,src:o.src||'gps'};
  const f=document.getElementById('addr');if(f)f.value=o.label;toast('📍 Casa fissata: '+o.label);
  const z=document.getElementById('zBtn');if(z)setTimeout(()=>{z.disabled=false;z.dataset.ok='1';z.click();},250);}
/* pulsante "Usa la mia posizione" (sostituisce quello vecchio) */
window.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('#geoBtn');if(!b)return;e.stopImmediatePropagation();e.preventDefault();
  if(!navigator.geolocation){toast('Questo dispositivo non dà la posizione: scrivi l’indirizzo');return;}
  if(b.dataset.busy)return;b.dataset.busy='1';b.disabled=true;b.textContent='📍 Cerco il segnale GPS…';
  try{const p=await trLocate(a=>{b.textContent=`📍 Precisione ±${a} m…`;});
    b.textContent='📍 Cerco l’indirizzo…';const lab=await trReverse(p.lat,p.lon);
    b.disabled=false;b.textContent='Usa la mia posizione';delete b.dataset.busy;
    const ok=await trPick({...p,label:lab,src:'gps'});if(ok)trSetHome(ok);}
  catch(er){b.disabled=false;b.textContent='Usa la mia posizione';delete b.dataset.busy;
    toast(er&&er.code===1?'Hai negato il permesso: attivalo in Impostazioni → Privacy → Localizzazione, oppure scrivi l’indirizzo':'Posizione non trovata: scrivi l’indirizzo');}},true);
/* indirizzo scritto a mano: prima di analizzare, conferma sulla mappa */
window.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('#zBtn');if(!b)return;
  if(b.dataset.ok==='1'){delete b.dataset.ok;return;}
  const f=document.getElementById('addr');const v=f?f.value.trim():'';if(!v||(S.geo&&S.geo.addr===v)||!navigator.onLine)return;
  e.stopImmediatePropagation();e.preventDefault();const old=b.innerHTML;b.disabled=true;b.innerHTML='<span class="spin"></span> Cerco l’indirizzo';
  const pass=()=>{b.disabled=false;b.innerHTML=old;b.dataset.ok='1';b.click();};
  try{const g=await trGeocode(v);b.disabled=false;b.innerHTML=old;
    const ok=await trPick({lat:g.lat,lon:g.lon,acc:g.precise?null:150,label:g.label||v,src:'indirizzo'});if(ok)trSetHome(ok);}
  catch(x){pass();}},true);

/* ---------- elevazione ---------- */
async function trTerrarium(pts){const z=14,n=2**z,tiles={};
  const need=pts.map(([la,lo])=>{const x=(lo+180)/360*n;const s=Math.log(Math.tan(Math.PI/4+la*Math.PI/360));const y=(1-s/Math.PI)/2*n;return{k:Math.floor(x)+'/'+Math.floor(y),px:Math.min(255,Math.floor((x%1)*256)),py:Math.min(255,Math.floor((y%1)*256))};});
  await Promise.all([...new Set(need.map(t=>t.k))].map(k=>new Promise(ok=>{const im=new Image();im.crossOrigin='anonymous';const t=setTimeout(ok,8000);
    im.onload=()=>{clearTimeout(t);try{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.drawImage(im,0,0);tiles[k]=g.getImageData(0,0,256,256).data;}catch(e){}ok();};
    im.onerror=()=>{clearTimeout(t);ok();};im.src=`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${k}.png`;})));
  return need.map(t=>{const d=tiles[t.k];if(!d)return null;const i=(t.py*256+t.px)*4;return d[i]*256+d[i+1]+d[i+2]/256-32768;});}
async function trElev(pts){const out=new Array(pts.length).fill(null);
  try{for(let i=0;i<pts.length;i+=100){const ch=pts.slice(i,i+100);
    const d=await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${ch.map(p=>p[0].toFixed(5)).join(',')}&longitude=${ch.map(p=>p[1].toFixed(5)).join(',')}`,{signal:trSig(9000)}).then(x=>x.json());
    (d.elevation||[]).forEach((v,j)=>{if(typeof v==='number'&&!isNaN(v))out[i+j]=v;});}}catch(e){}
  if(out.some(v=>v==null)){try{const t=await trTerrarium(pts);t.forEach((v,i)=>{if(out[i]==null&&v!=null&&v>-500)out[i]=v;});}catch(e){}}
  return out;}

/* ---------- servizi veri ---------- */
const TR_NAME={super:'Supermercato',farm:'Farmacia',osp:'Ospedale',ferr:'Ferramenta',dist:'Distributore',acqua:'Fontanella',cc:'Forze dell’ordine',vvf:'Vigili del fuoco',racc:'Punto di raccolta'};
function trKind(t){const a=t.amenity,s=t.shop,c=t.craft;
  if(s==='supermarket'||s==='convenience')return'super';if(a==='pharmacy')return'farm';if(a==='hospital'||a==='clinic')return'osp';
  if(['hardware','doityourself','trade','locksmith','security','electrical'].includes(s)||['locksmith','electrician','metal_construction','window_construction','builder'].includes(c))return'ferr';
  if(a==='fuel')return'dist';if(a==='drinking_water')return'acqua';if(a==='police')return'cc';if(a==='fire_station')return'vvf';if(t.emergency==='assembly_point'||a==='townhall')return'racc';return null;}
/* attività che possono diventare sponsor (sicurezza della casa) */
function trCand(t){return['hardware','doityourself','locksmith','security','electrical','trade','paint','glaziery'].includes(t.shop)||['locksmith','electrician','metal_construction','window_construction','builder','carpenter','plumber'].includes(t.craft);}
async function terrFetch(addr){const w=await trWhere(addr);const{lat,lon}=w;const key='zsh_tr5_'+lat.toFixed(4)+'_'+lon.toFixed(4);
  try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.t<14*864e5)return{...c.r,acc:w.acc,src:w.src};}catch(e){}
  const A=`(around:${TR_FR},${lat},${lon})`;
  const q=`[out:json][timeout:25];(nwr["amenity"~"^(hospital|clinic|pharmacy|police|fire_station|fuel|drinking_water|townhall)$"]${A};nwr["shop"~"^(supermarket|convenience|hardware|doityourself|locksmith|security|electrical|trade|paint|glaziery)$"]${A};nwr["craft"~"^(locksmith|electrician|metal_construction|window_construction|builder|carpenter|plumber)$"]${A};nwr["emergency"="assembly_point"]${A};nwr["amenity"~"^(hospital|police|fire_station)$"](around:10000,${lat},${lon});nwr["shop"~"^(hardware|doityourself|locksmith|security|trade)$"](around:10000,${lat},${lon});nwr["craft"~"^(locksmith|metal_construction|window_construction)$"](around:10000,${lat},${lon});nwr["natural"="water"](around:700,${lat},${lon});way["building"](around:250,${lat},${lon});nwr["shop"](around:500,${lat},${lon}););out center tags;way["waterway"~"^(river|canal|stream)$"](around:700,${lat},${lon});out tags geom;`;
  const hP=trOverpass(`[out:json][timeout:15];way["building"](around:45,${lat},${lon});out body geom;`,15000).catch(()=>null);
  let els=null;try{els=await trOverpass(q,18000);}catch(e){console.warn('servizi non raggiungibili',e);}const ov=!!els;els=els||[];
  let house=null;try{house=trHouse(await hP,lat,lon);}catch(e){}const fac=[],seen=new Set();let bld=0,shops=0,water=null;
  els.forEach(e=>{const t=e.tags||{};const la=e.lat!=null?e.lat:(e.center&&e.center.lat),lo=e.lon!=null?e.lon:(e.center&&e.center.lon);
    if(t.waterway&&e.geometry){let d=1e9;e.geometry.forEach(p=>{d=Math.min(d,trM(lat,lon,p.lat,p.lon));});if(!water||d<water.d)water={d:Math.round(d),n:t.name||({river:'il fiume',canal:'il canale',stream:'il torrente'}[t.waterway]),k:t.waterway};return;}
    if(t.natural==='water'){const d=la!=null?Math.min(700,trM(lat,lon,la,lo)):700;if(!water||d<water.d)water={d:Math.round(d),n:t.name||'lo specchio d’acqua',k:t.water||'lake'};return;}
    if(t.building&&e.type==='way'&&la!=null&&trM(lat,lon,la,lo)<=250)bld++;
    if(t.shop&&la!=null&&trM(lat,lon,la,lo)<=500)shops++;
    if(t.shop==='vacant'||t.opening_hours==='closed'||Object.keys(t).some(x=>/^(disused|was|abandoned|demolished|removed):/.test(x)))return;
    const k=trKind(t),cand=trCand(t);if((!k&&!cand)||la==null)return;const id=e.type[0]+e.id;if(seen.has(id))return;seen.add(id);
    fac.push({k:k||'ferr',cand,name:t.name||t.brand||TR_NAME[k||'ferr'],lat:+la.toFixed(6),lon:+lo.toFixed(6),d:Math.round(trM(lat,lon,la,lo)),tel:t.phone||t['contact:phone']||'',web:t.website||t['contact:website']||'',id});});
  fac.sort((a,b)=>a.d-b.d);const F=fac.slice(0,160);
  /* rilievo: griglia 600×600 m, anello a 1 km, servizi più vicini */
  const pts=[],c=(TR_N-1)/2;for(let r=0;r<TR_N;r++)for(let q2=0;q2<TR_N;q2++)pts.push(trOff(lat,lon,(q2-c)*TR_STEP,(c-r)*TR_STEP));
  for(let i=0;i<8;i++){const a=i*Math.PI/4;pts.push(trOff(lat,lon,Math.cos(a)*1000,Math.sin(a)*1000));}
  const near={};F.forEach(f=>{if(!near[f.k])near[f.k]=f;});const fe=Object.values(near).concat(F.filter(f=>f.cand).slice(0,4)).filter((f,i,a)=>a.indexOf(f)===i).slice(0,16);fe.forEach(f=>pts.push([f.lat,f.lon]));
  const ev=await trElev(pts);let grid=ev.slice(0,TR_N*TR_N);const okN=grid.filter(v=>v!=null).length;
  let T=null;if(okN>=TR_N*TR_N*.8){const vals=grid.filter(v=>v!=null);const mean=vals.reduce((a,b)=>a+b,0)/vals.length;grid=grid.map(v=>v==null?mean:Math.round(v*10)/10);
    const s=[...grid].sort((a,b)=>a-b);const home=grid[c*TR_N+c];const g=(r,q2)=>grid[r*TR_N+q2];
    const slope=Math.round(Math.hypot((g(c,c+1)-g(c,c-1))/(2*TR_STEP),(g(c-1,c)-g(c+1,c))/(2*TR_STEP))*1000)/10;
    const ring=ev.slice(TR_N*TR_N,TR_N*TR_N+8).filter(v=>v!=null);const rel1k=ring.length?Math.round(home-ring.reduce((a,b)=>a+b,0)/ring.length):0;
    fe.forEach((f,i)=>{const v=ev[TR_N*TR_N+8+i];if(v!=null)f.el=Math.round(v);});
    const p20=s[Math.floor(s.length*.2)],p80=s[Math.floor(s.length*.8)];
    const pos=home-mean>=8&&home>=p80?'altura':((home-mean<=-5&&home<=p20)||(water&&water.d<250&&home-mean<=-1))?'bassa':slope>=5?'pendio':'piano';
    T={grid,home:Math.round(home),mean:Math.round(mean*10)/10,min:Math.round(s[0]),max:Math.round(s[s.length-1]),slope,rel1k,pos};}
  const type=!ov?null:T&&(T.home>=700||T.max-T.min>=80)?'montagna':water&&water.d<=250&&water.k!=='stream'?'lago':bld>=230||(bld>=150&&shops>=12)?'centro':bld>=70?'periferia':'campagna';
  const r={lat,lon,fac:F,bld,shops,water,type,ov,house,...(T||{}),t0:Date.now()};
  if(ov&&T)try{localStorage.setItem(key,JSON.stringify({t:Date.now(),r}));}catch(e){}
  return{...r,acc:w.acc,src:w.src};}
function terrApply(z,R){if(!R.ov)return{...z,real:R};const res=[],k=Math.cos(R.lat*Math.PI/180);
  ['super','farm','osp','ferr','dist','acqua','cc','vvf','racc'].forEach(kd=>{R.fac.filter(f=>f.k===kd).slice(0,R.type==='centro'&&['super','farm','ferr'].includes(kd)?2:1).forEach(f=>res.push({kind:kd,name:f.name,dist:f.d,lat:f.lat,lon:f.lon,el:f.el,real:true}));});
  if(!res.some(r=>r.kind==='acqua')&&R.water&&R.water.d<700)res.push({kind:'acqua',name:R.water.n.replace(/^(il|lo|la) /,'').replace(/^./,m=>m.toUpperCase()),dist:R.water.d,real:true});
  const maxd=Math.max(600,...res.map(r=>r.dist||0));const sc=.42/maxd;
  res.forEach(r=>{if(r.lat==null){r.x=.5+(r.dist*sc)*.7;r.y=.5+(r.dist*sc)*.7;}else{r.x=.5+(r.lon-R.lon)*111320*k*sc;r.y=.5-(r.lat-R.lat)*110540*sc;}r.x=Math.max(.06,Math.min(.94,r.x));r.y=Math.max(.08,Math.min(.92,r.y));});
  const near=res.filter(x=>x.dist<800).length;const resRisk=Math.max(1,9-near*.9);
  let mobRisk={centro:8,periferia:5,lago:6,montagna:4,campagna:3}[R.type];if(R.pos==='bassa')mobRisk+=.5;if(R.slope>=8)mobRisk-=.5;
  /* il livello zona non dipende più dai superstiti simulati: servizi e mobilità veri + valore neutro */
  const level=Math.round((resRisk*.35+mobRisk*.35+5*.3)*10)/10;
  return{...z,type:R.type,resources:res,resRisk,mobRisk,level,real:R};}
const _azReal=analyzeZone;
analyzeZone=async function(address){const base=await _azReal(address);if(!navigator.onLine)return base;
  try{const R=await terrFetch(address);return terrApply(base,R);}catch(e){console.warn('territorio vero',e);return base;}};
function terrSummary(R){if(!R)return'';const bits=[];
  if(R.home!=null)bits.push(`⛰ <b>${R.home} m</b> s.l.m.`);
  if(R.pos)bits.push({altura:'🏔 casa <b>in altura</b>',bassa:'💧 casa <b>in zona bassa</b>',pendio:`📐 <b>pendio ${String(R.slope).replace('.',',')}%</b>`,piano:'➖ <b>pianura</b>'}[R.pos]);
  if(R.water&&R.water.d<700)bits.push(`🌊 ${esc(R.water.n)} a <b>${R.water.d} m</b>`);
  bits.push(`🏘 <b>${R.bld}</b> edifici nel raggio di 250 m`);
  const nd=k=>R.fac.find(f=>f.k===k);[['osp','🏥'],['farm','✚'],['super','🛒'],['cc','🚓'],['vvf','🚒']].forEach(([k,i])=>{const f=nd(k);if(f)bits.push(`${i} ${esc(f.name)} <b>${dist(f.d)}</b>`);});
  if(!R.ov)bits.push('⚠️ servizi non raggiungibili ora: riprova più tardi');  const nc=R.fac.filter(f=>f.cand).length;if(nc)bits.push(`📌 <b>${nc}</b> attività per la sicurezza della casa`);
  return`<div class="terrbox"><b class="disp">🗺️ Territorio vero</b><div class="terrchips">${bits.map(b=>`<span>${b}</span>`).join('')}</div><small class="muted">Dati © OpenStreetMap · quote Copernicus DEM. ${R.src==='gps'||R.src==='pin'?'Posizione confermata da te.':'Posizione dall’indirizzo: per più precisione usa “Usa la mia posizione”.'}</small></div>`;}
const _zoneCardTR=zoneCard;
zoneCard=function(z,key,me){let h=_zoneCardTR(z,key,me);if(z&&z.real&&z.real.ov)h=h.replace(/Servizi e superstiti simulati\. In produzione: servizi da Google Maps, superstiti dal database\./,'Servizi veri da OpenStreetMap entro 2,5 km. Superstiti della community ancora simulati.');if(z&&z.real&&me!==false)h+=terrSummary(z.real);return h;};

/* ---------- il gioco sul terreno vero ---------- */
function trElevAt(R,dx,dy){const c=(TR_N-1)/2;const fx=Math.max(0,Math.min(TR_N-1,c+dx/TR_STEP)),fy=Math.max(0,Math.min(TR_N-1,c-dy/TR_STEP));
  const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(TR_N-1,x0+1),y1=Math.min(TR_N-1,y0+1),ax=fx-x0,ay=fy-y0;const g=(r,q)=>R.grid[r*TR_N+q];
  return g(y0,x0)*(1-ax)*(1-ay)+g(y0,x1)*ax*(1-ay)+g(y1,x0)*(1-ax)*ay+g(y1,x1)*ax*ay;}
function trElevLL(R,la,lo){const k=Math.cos(R.lat*Math.PI/180);return trElevAt(R,(lo-R.lon)*111320*k,(la-R.lat)*110540);}
/* bonus veri: servizi vicini e sponsor come presidi */
/* spedizioni verso posti veri: tempo = distanza + salita */
const EXPS0=EXPS.map(x=>({...x}));
const trDur=(d,cl)=>Math.round(Math.min(240,20+d/30+Math.max(0,cl||0)*1.5));
const trClimb=cl=>cl==null?'':cl>=3?` · ⬆ salita +${Math.round(cl)} m`:cl<=-3?` · ⬇ discesa ${Math.round(cl)} m`:' · in piano';
function trLoot(cat){cat=cat||'';return/sicur|allarm|port|fabbr|serr|blind/i.test(cat)?{metallo:[2,3],batterie:[1,2]}:/energ|elettr|solar|fotov|luce/i.test(cat)?{batterie:[2,4],metallo:[0,1]}:/farm|salut|medic|sanit/i.test(cat)?{medicine:[2,3],cibo:[0,1]}:/aliment|super|cibo|bar|ristor|forn|panif/i.test(cat)?{cibo:[3,4],medicine:[0,1]}:{legno:[2,3],metallo:[2,3]};}
function terrExps(){const R=S.zone&&S.zone.real;const list=[];
  const sps=Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&g.lat!=null&&SPONSORS[k]).map(([k,g])=>({k,g,d:R?Math.round(trM(R.lat,R.lon,g.lat,g.lon)):null})).sort((a,b)=>(a.d||0)-(b.d||0)).slice(0,2);
  if(sps.length)sps.forEach(({k,g,d})=>{const cl=R&&R.grid&&d!=null&&d<350?trElevLL(R,g.lat,g.lon)-R.home:null;
    list.push({id:'sp_'+k,n:SPONSORS[k].name,ic:'⭐',t:d!=null?Math.max(15,Math.round(trDur(d,cl)*.6)):25,risk:0,loot:trLoot(SP_CAT[k]),sp:k,d:`Sponsor vero${d!=null?' a '+dist(d):''}: una volta al giorno, senza rischi`});});
  else if(SPONSORS[EXPS0[0].sp])list.push({...EXPS0[0]});
  const slot=(id,kinds,ic,loot,base,lab)=>{const f=R&&R.fac.find(x=>kinds.includes(x.k)&&!(x.k==='ferr'&&x.cand&&!/ferr|brico|hardware|edil/i.test(x.name+' '+lab))&&x.d<=TR_FR)||(R&&R.fac.find(x=>kinds.includes(x.k)&&x.d<=TR_FR));
    if(!f){const o=EXPS0.find(x=>x.id===id);if(o)list.push({...o});return;}
    const cl=f.el!=null&&R.home!=null?f.el-R.home:null;
    list.push({id,n:f.name,ic,t:trDur(f.d,cl),risk:Math.round(Math.min(.6,base+f.d/6000+(cl>0?cl/400:0))*100)/100,loot,d:`${lab} vero a ${dist(f.d)}${trClimb(cl)}`,real:1,ll:[f.lat,f.lon]});};
  slot('super',['super'],'🛒',{cibo:[2,4],legno:[0,2]},.1,'Supermercato');
  slot('ferr',['ferr'],'🔧',{metallo:[2,4],legno:[1,3]},.18,'Negozio per la casa');
  slot('osp',['osp','farm'],'🏥',{medicine:[1,3],batterie:[0,2]},.25,'Presidio sanitario');
  slot('cen',['dist'],'⛽',{batterie:[2,4],metallo:[1,2]},.3,'Distributore');
  (G.exp||[]).forEach(e=>{if(!list.some(x=>x.id===e.id)){const o=EXPS.find(x=>x.id===e.id)||EXPS0.find(x=>x.id===e.id)||{id:e.id,n:'Spedizione',ic:'🎒',t:30,risk:.2,loot:{cibo:[1,2]},d:''};list.push({...o,hide:1});}});
  EXPS.splice(0,EXPS.length,...list);}
const _dayInitTR=dayInit;dayInit=function(){_dayInitTR();try{terrExps();}catch(e){console.warn('spedizioni',e);}};
/* bollettino del territorio nella pagina del gioco */

/* ---------- aggiornamento automatico dell'app installata ---------- */
const ZSH_BUILD='__BUILD__';
(function autoUpdate(){if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
  const had=!!navigator.serviceWorker.controller;let reloading=false;
  const safe=()=>!(typeof G!=='undefined'&&G.view==='battle'&&S.tab==='orda')&&!document.querySelector('#sheet.open');
  const reload=why=>{if(reloading)return;const go2=()=>{if(!safe()){setTimeout(go2,4000);return;}reloading=true;try{if(typeof saveLocal==='function')saveLocal();}catch(e){}try{sessionStorage.setItem('zsh_upd',why||'1');}catch(e){}location.reload();};go2();};
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
    const check=()=>{reg.update().catch(()=>{});
      fetch('sw.js?c='+Date.now(),{cache:'no-store'}).then(r=>r.text()).then(t=>{const m=t.match(/zsh-(\d{8,})/);if(!m||!/^\d+$/.test(ZSH_BUILD))return;
        if(+m[1]>+ZSH_BUILD){let tried='';try{tried=sessionStorage.getItem('zsh_try')||'';}catch(e){}if(tried===m[1])return;try{sessionStorage.setItem('zsh_try',m[1]);}catch(e){}reload('v');}}).catch(()=>{});};
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});window.addEventListener('focus',check);setInterval(check,20*60*1000);setTimeout(check,4000);}).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)reload('sw');});
  try{if(sessionStorage.getItem('zsh_upd')){sessionStorage.removeItem('zsh_upd');setTimeout(()=>toast('✨ App aggiornata all’ultima versione'),1500);}}catch(e){}})();
</script>
<script>
/* =========================================================
   SCHEDA ATTIVITÀ A FUMETTO + attività nascoste (solo admin)
   ========================================================= */
const BZ_COL=[[/ferr|fai da te|fabbr|sicur|allarm|elettric|edil|serrament|vetr|color|carpent|idraul|falegn|casa/i,'#ffe680'],[/super|aliment|panif|macell|fiori/i,'#bfe8c9'],[/bar|ristor|fast|caff/i,'#ffd0b5'],[/farm|ospedal|clinic|sanit/i,'#c8f0d4'],[/carabin|polizi|ordine|vigili|municip|pubblic/i,'#cfe0ff']];
const bzCol=c=>(BZ_COL.find(([r])=>r.test(c||''))||[0,'#efe4c8'])[1];
window.ZHID=window.ZHID||[];
async function zIsAdmin(){if(window.ZADMIN!=null)return window.ZADMIN;try{const sb=typeof SB!=='undefined'&&SB;if(!sb||!S.user||!S.user.id)return false;
  const{data}=await sb.from('admins').select('user_id').eq('user_id',S.user.id).maybeSingle();window.ZADMIN=!!data;return window.ZADMIN;}catch(e){return false;}}
function zApplyHidden(){try{const L=zStyle(false).layers;(window.__zmaps||[]).forEach(map=>{['poi-biz','poi-pub','poi-cand','poi-hid'].forEach(id=>{try{const l=L.find(x=>x.id===id);if(l&&map.getLayer(id))map.setFilter(id,l.filter);}catch(e){}});
  try{if(map.getLayer('poi-hid'))map.setLayoutProperty('poi-hid','visibility',window.ZADMIN?'visible':'none');}catch(e){}});}catch(e){}}
async function zUnhide(name){try{const{error}=await SB.from('hidden_pois').delete().eq('name',name);if(error)throw error;window.ZHID=window.ZHID.filter(n=>n!==name);zApplyHidden();closeSheet();toast('✅ '+name+' è di nuovo sulla mappa');}
  catch(e){toast('Non riuscito: '+(e.message||'errore'));}}
(async()=>{try{const sb=await waitSB();if(!sb)return;const{data,error}=await sb.from('hidden_pois').select('name');if(!error&&data){window.ZHID=data.map(r=>r.name);zApplyHidden();}}catch(e){}})();
async function zHide(name,ll){try{const{error}=await SB.from('hidden_pois').insert({name,lat:ll?ll[0]:null,lon:ll?ll[1]:null});if(error)throw error;
    window.ZHID.push(name);zApplyHidden();closeSheet();toast('🚫 '+name+' non compare più sulla mappa');}
  catch(e){toast('Non riuscito: in Supabase manca la tabella “hidden_pois” (vedi istruzioni)');}}
function bzCard(b,pub){const tel=(b.tel||'').replace(/[^\d+]/g,'');const web=b.web?(/^https?:/.test(b.web)?b.web:'https://'+b.web):'';
  const nav=b.ll?`https://www.google.com/maps/dir/?api=1&destination=${b.ll[0]},${b.ll[1]}&travelmode=walking`:mapsLink(b.name,S.zone);
  const walk=Math.max(1,Math.round((b.d||0)/75));const key='biz-'+((S.zone&&S.zone.seed)||7)+'-'+String(b.i).replace(/\W/g,'');
  return`<div class="bzc">
   <div class="bzc-hero" style="--c:${pub?'#cfe0ff':bzCol(b.cat)}"><span class="bzc-ic">${b.ic||'📍'}</span>
     <div class="bzc-t"><span class="bzc-cat">${esc(b.cat||'Attività')}${pub?' · servizio pubblico':''}</span><h4>${esc(b.name)}</h4>
     <small>📍 ${dist(b.d||0)} da casa tua · 🚶 ${walk} min a piedi</small></div>${b.cand?'<span class="bzc-badge">POSTO<br>LIBERO</span>':''}</div>
   ${pub?'':`<div class="bzc-rate">${rvLine(key,5,4)}${rvBtn(key,b.name,5,4)}</div>`}
   <div class="bzc-act"><a href="${nav}" target="_blank" rel="noopener"><span>🧭</span>Portami lì</a>${tel?`<a href="tel:${tel}"><span>📞</span>Chiama</a>`:''}${web?`<a href="${esc(web)}" target="_blank" rel="noopener"><span>🌐</span>Sito</a>`:''}</div>
   ${pub?`<p class="bzc-note">${b.zfx||'Nel gioco i servizi vicini rinforzano la tua casa e il quartiere.'}</p>`:b.cand?`<div class="bzc-free"><b>📌 Può diventare il presidio sponsor della zona</b>
     <ul><li>⭐ Bollino giallo col nome, visibile a tutto il quartiere</li><li>🎟️ Offerta con codice personale da mostrare in cassa</li><li>📩 Richieste di preventivo da chi abita qui</li><li>🛡️ Nel gioco: presidio che dà +5% barricata ai vicini</li></ul>
     <button class="btn wide" data-claim>Diventa sponsor</button></div>`:`<button class="bzc-own" data-claim>È la tua attività? Mettiti in evidenza →</button>`}
   <div data-admin></div></div>`;}
bizSheet=function(b,z){openSheet(b.cand?'📌 Posto sponsor libero':'🛍️ Attività della zona',bzCard(b,false),card=>{
  const c=card.querySelector('[data-claim]');if(c)c.onclick=()=>{closeSheet();S.motivo=b.cand?'sponsor':'negozio';S.motivoBiz=b.name;go('contatti');};
  zIsAdmin().then(ok=>{const a=card.querySelector('[data-admin]');if(ok&&a){a.innerHTML='<button class="btn small ghost" style="margin-top:10px">🚫 Nascondi dalla mappa (solo admin)</button>';a.firstChild.onclick=()=>{if(confirm('Nascondere “'+b.name+'” dalla mappa per tutti?'))zHide(b.name,b.ll);};}});});};
lmPoi=function(name,cat,d,ll,pub){const ic={Farmacia:'💊',Ospedale:'🏥',Clinica:'🏥','Forze dell’ordine':'🚓','Vigili del fuoco':'🚒',Municipio:'🏛️',Fontanella:'💧'}[cat]||'📍';
  const fx={Farmacia:'Nel gioco: farmacia entro 800 m = resistenza casa +5%.',Ospedale:'Nel gioco: ospedale entro 1,5 km = resistenza casa +10%.',Clinica:'Nel gioco: presidio sanitario vicino = più resistenza.','Forze dell’ordine':'Nel gioco: forze dell’ordine entro 2 km = barricata +10%.','Vigili del fuoco':'Nel gioco: vigili del fuoco entro 3 km = barricata +5%.'}[cat];
  const b={i:name,ic,name,cat,d,ll,zfx:fx};openSheet(pub?'🛡️ Servizio della zona':'🛍️ Attività della zona',bzCard(b,pub),card=>{
    zIsAdmin().then(ok=>{const a=card.querySelector('[data-admin]');if(ok&&a){a.innerHTML='<button class="btn small ghost" style="margin-top:10px">🚫 Nascondi dalla mappa (solo admin)</button>';a.firstChild.onclick=()=>{if(confirm('Nascondere “'+name+'” dalla mappa per tutti?'))zHide(name,ll);};}});});};
</script>
<script>
/* =========================================================
   CASA VERA A FUMETTO: proporzioni, piani, tetto e vicini
   presi dall'edificio vero (OpenStreetMap) + risposte
   ========================================================= */
const KIND_N={apt:'Condominio',schiera:'Villetta a schiera',bifamiliare:'Bifamiliare',villa:'Casa indipendente',casale:'Casale'};
function hsShape(a){a=a||{};const R=S.zone&&S.zone.real&&S.zone.real.house;
  const kt={villa:'villa',bifam:'bifamiliare',schiera:'schiera',apt_pt:'apt',apt_12:'apt',apt_3:'apt',cascina:'casale'}[a.tipo];
  const kind=kt||(R&&R.kind)||'villa';
  let fl=R&&R.levels?R.levels:kind==='apt'?(a.tipo==='apt_3'?5:4):({'1':1,'2':2,'3':3}[a.piani]||2);
  if(!R&&a.piani&&kind!=='apt')fl={'1':1,'2':2,'3':3}[a.piani]||fl;fl=Math.max(1,Math.min(6,fl));
  const w=Math.round(Math.max(180,Math.min(300,R&&R.len?140+R.len*3.2:{apt:260,casale:280,schiera:190,bifamiliare:200,villa:180}[kind])));
  const roof=(R&&R.roof)||(kind==='apt'?'flat':'gabled');
  const okC=c=>/^#[0-9a-f]{3,6}$/i.test(c)||/^[a-z]{3,15}$/i.test(c);
  const wall=R&&R.col&&okC(R.col)?R.col:a.materiale==='legno'?'#8a5a34':a.materiale==='ca'||a.materiale==='prefab'?'#6f6a85':'#4b3f7a';
  const brick=a.materiale==='mattoni'&&!(R&&R.col);
  const rcol=R&&R.rcol&&okC(R.rcol)?R.rcol:'#d7263d';
  return{kind,fl,w,roof:/flat/.test(roof)?'flat':/hip|pyramid/.test(roof)?'hipped':'gabled',wall,brick,rcol,R};}
function hsParts(a,id,G){const H=hsShape(a);const cx=230,x0=cx-H.w/2,x1=cx+H.w/2,U=H.fl-1;
  const rh=H.roof==='flat'?12:Math.min(72,H.w*.36);const fh=U?Math.min(68,(196-30-rh)/U):0;const yT=196-U*fh;const top=yT-rh;
  const fill=H.brick?`url(#brick${id})`:H.wall;let b='';
  /* vicini attaccati (schiera, bifamiliare) */
  const nbw=(xa,xb)=>`<rect x="${xa}" y="${yT+10}" width="${xb-xa}" height="${G-yT-10}" fill="#3b2f6e"/><rect x="${xa}" y="${yT+10}" width="${xb-xa}" height="${G-yT-10}" fill="url(#ht${id})"/><path d="M${xa-4} ${yT+12} H${xb+4}" stroke-width="4"/><rect x="${(xa+xb)/2-10}" y="${yT+30}" width="20" height="20" fill="#1d1640"/>`;
  if(H.kind==='schiera'||H.kind==='bifamiliare')b+=nbw(Math.max(0,x0-80),x0);if(H.kind==='schiera')b+=nbw(x1,Math.min(480,x1+80));
  b+=`<rect x="${x0}" y="${yT}" width="${H.w}" height="${G-yT}" fill="${fill}"/><rect x="${x0}" y="${yT}" width="${H.w}" height="${G-yT}" fill="url(#ht${id})"/>`;
  for(let i=0;i<=U;i++)b+=`<path d="M${x0} ${196-i*fh} H${x1}" stroke-width="2"/>`;
  if(H.roof==='flat')b+=`<rect x="${x0-6}" y="${yT-12}" width="${H.w+12}" height="14" fill="#2b2240"/>`+(H.kind==='apt'?`<rect x="${x1-50}" y="${yT-30}" width="26" height="18" fill="#9aa4b0"/><path d="M${x1-37} ${yT-30} V${yT-40}" stroke-width="2"/>`:'');
  else{const ch=`<rect x="${cx+H.w*.2}" y="${top+rh*.25}" width="20" height="${rh*.6}" fill="${H.wall}"/><rect x="${cx+H.w*.2-4}" y="${top+rh*.25-6}" width="28" height="8" fill="#2b2240"/>`;
    b+=ch+(H.roof==='hipped'?`<path d="M${x0-16} ${yT+6} L${x0+H.w*.22} ${top} L${x1-H.w*.22} ${top} L${x1+16} ${yT+6}Z" fill="${H.rcol}"/>`:`<path d="M${x0-16} ${yT+6} L${cx} ${top} L${x1+16} ${yT+6}Z" fill="${H.rcol}"/><path d="M${x0+8} ${yT-8} L${cx} ${top+8} L${x1-8} ${yT-8}" fill="none" stroke-width="1.5" opacity=".6"/>`)+`<path d="M${x0-20} ${yT+8} H${x1+20}" stroke-width="4"/>`;}
  const n=Math.max(2,Math.round(H.w/90));const xs=Array.from({length:n},(_,i)=>x0+(H.w/n)*(i+.5)-19);
  const upper=win=>{let o='';const sc=Math.min(1,(fh-12)/40);for(let f=1;f<=U;f++){const y=196-f*fh+(fh-34*sc)/2;
      xs.forEach(x=>{o+=sc>=.98?win(x,y,false):`<g transform="translate(${x+19*(1-sc)} ${y}) scale(${sc})">${win(0,0,false)}</g>`;if(H.kind==='apt')o+=`<path d="M${x-6} ${y+34*sc+4} H${x+44}" stroke-width="3"/>${[0,1,2,3,4].map(k=>`<path d="M${x-4+k*11} ${y+34*sc+4} v-9" stroke-width="1.5"/>`).join('')}`;});}return o;};
  const ground=win=>{let o='';if(x0+56<156)o+=win(x0+14,212,true);if(x1-52>304)o+=win(x1-52,212,true);return o;};
  return{body:b,upper,ground,dy:top-62,H};}
</script>
<script>
/* la casa vera vista dall'alto, nel riquadro Territorio vero */
function trHouseCard(H){if(!H||!H.poly||H.poly.length<3)return'';const xs=H.poly.map(p=>p[0]),ys=H.poly.map(p=>p[1]);const mx=Math.min(...xs),Mx=Math.max(...xs),my=Math.min(...ys),My=Math.max(...ys);
  const sc=Math.min(118/Math.max(1,Mx-mx),78/Math.max(1,My-my));const pts=H.poly.map(([x,y])=>`${(10+(x-mx)*sc).toFixed(1)},${(10+(My-y)*sc).toFixed(1)}`).join(' ');
  const roofN={flat:'piano',gabled:'a due falde',hipped:'a padiglione'}[H.roof]||H.roof;
  return`<div class="thouse"><svg viewBox="0 0 140 100" width="140" height="100"><rect width="140" height="100" fill="#efe4c8"/><polygon points="${pts}" fill="#140f1f" transform="translate(4 4)"/><polygon points="${pts}" fill="#d7263d" stroke="#140f1f" stroke-width="3" stroke-linejoin="round"/></svg>
   <div><b class="disp">🏠 La tua casa vera</b><span>${KIND_N[H.kind]||'Edificio'}${H.att?` · attaccata a ${H.att} ${H.att===1?'casa':'case'}`:''}</span><span>≈ ${H.len} × ${H.wid} m · ${H.area} m² a terra</span><span>${H.levels} ${H.levels===1?'piano':'piani'} · tetto ${roofN}</span><small class="muted">La simulazione e il gioco la disegnano così.</small></div></div>`;}
const _terrSummaryH=terrSummary;terrSummary=function(R){const h=_terrSummaryH(R);if(!R||!R.house)return h;return h.replace('<div class="terrchips">',trHouseCard(R.house)+'<div class="terrchips">');};
/* valutazione: tipo di casa e piani compilati dalla mappa */
const _azHouse=analyzeZone;
analyzeZone=async function(address){const z=await _azHouse(address);try{const H=z&&z.real&&z.real.house;if(H&&S.answers){S.aiFilled=S.aiFilled||{};
    const t={villa:'villa',bifamiliare:'bifam',schiera:'schiera',casale:'cascina'}[H.kind];if(t&&!S.answers.tipo){S.answers.tipo=t;S.aiFilled.tipo=true;}
    if(H.kind!=='apt'&&!S.answers.piani){S.answers.piani=H.levels>=3?'3':String(H.levels);S.aiFilled.piani=true;}}}catch(e){}return z;};
/* gioco: "La tua casa vera" come casa da difendere */
function trSetupVera(){try{const R=S.zone&&S.zone.real,H=R&&R.house;if(!H)return;const base={apt:'apt',schiera:'schiera',bifamiliare:'bifamiliare',casale:'casale',villa:'villa'}[H.kind]||'villa';
  const B=HTYPES[base]||HTYPES.villa;const zone={centro:'centro',periferia:'periferia',campagna:'campagna',lago:'fiume',montagna:'montagna'}[R.type||S.zone.type]||B.zone;
  const v={...B,base,name:'La tua casa vera',zone,zl:(KIND_N[H.kind]||'Casa')+' · dalla mappa',hp:Math.round(B.hp+Math.min(4,H.levels-1)*6),
    pitch:`${KIND_N[H.kind]||'Casa'}, ${H.levels} ${H.levels===1?'piano':'piani'}, ${H.len}×${H.wid} m${H.att?', attaccata ai vicini':''}: è casa tua, nel tuo quartiere vero.`};
  if(!HTYPES.vera){const rest={...HTYPES};Object.keys(HTYPES).forEach(k=>delete HTYPES[k]);HTYPES.vera=v;Object.assign(HTYPES,rest);if(!NEWTYPES.includes('vera'))NEWTYPES.push('vera');}else Object.assign(HTYPES.vera,v);}catch(e){console.warn('casa vera',e);}}
setTimeout(trSetupVera,0);
</script>
<script>
/* =========================================================
   INFO ONLINE DEL SERVIZIO / ATTIVITÀ
   orari (aperto ora?), indirizzo, telefono, sito, social,
   accessibilità da OpenStreetMap + Google Maps per foto e recensioni
   ========================================================= */
const POI_INFO={};
async function poiDetails(name,ll){const k=name+'|'+(ll?ll.map(v=>v.toFixed(4)).join(','):'');if(POI_INFO[k])return POI_INFO[k];
  if(!ll)return null;const nm=String(name).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  let els=[];try{els=await trOverpass(`[out:json][timeout:10];nwr(around:90,${ll[0]},${ll[1]})["name"="${nm}"];out tags center 4;`,9000);}catch(e){return null;}
  let best=null,bd=1e9;els.forEach(e=>{const la=e.lat!=null?e.lat:(e.center&&e.center.lat),lo=e.lon!=null?e.lon:(e.center&&e.center.lon);if(la==null)return;const d=trM(ll[0],ll[1],la,lo);if(d<bd){bd=d;best=e;}});
  POI_INFO[k]=best?best.tags||{}:{};return POI_INFO[k];}
/* orari OpenStreetMap: "Mo-Fr 08:30-12:30,15:30-19:30; Sa 08:30-12:30; Su off" */
const OH_D=['Mo','Tu','We','Th','Fr','Sa','Su'],OH_IT=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
function ohParse(s){if(!s)return null;s=s.trim();if(s==='24/7')return OH_D.map(()=>[[0,1440]]);const W=OH_D.map(()=>null);let ok=false;
  for(const part of s.split(';')){const p=part.trim();if(!p)continue;const m=p.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)\s+(.+)$/);if(!m){if(/^\d/.test(p)){OH_D.forEach((_,i)=>W[i]=ohT(p));ok=true;}continue;}
    const days=[];m[1].split(',').filter(Boolean).forEach(r=>{const[a,b]=r.split('-');const i=OH_D.indexOf(a),j=b?OH_D.indexOf(b):i;if(i<0||j<0)return;for(let d=i;;d=(d+1)%7){days.push(d);if(d===j)break;}});
    const t=/off|closed/i.test(m[2])?[]:ohT(m[2]);if(t===null)continue;days.forEach(d=>W[d]=t);ok=true;}
  return ok?W:null;}
function ohT(s){const out=[];for(const r of s.split(',')){const m=r.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);if(!m)return null;out.push([+m[1]*60+ +m[2],+m[3]*60+ +m[4]]);}return out;}
const ohF=v=>`${String(Math.floor(v/60)%24).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
function ohHTML(raw){const W=ohParse(raw);if(!W)return`<div class="oh"><b>🕒 Orari</b><span>${esc(raw)}</span></div>`;
  const now=new Date(),d=(now.getDay()+6)%7,mn=now.getHours()*60+now.getMinutes();const T=W[d];
  const open=T&&T.some(([a,b])=>b<a?(mn>=a||mn<b):(mn>=a&&mn<b));const next=T&&T.find(([a])=>a>mn);
  const st=T===null?'<em class="ohu">orari di oggi non indicati</em>':open?'<em class="oho">● Aperto ora</em>':`<em class="ohc">● Chiuso ora${next?' · apre alle '+ohF(next[0]):''}</em>`;
  return`<div class="oh"><b>🕒 Orari</b>${st}<ul>${W.map((t,i)=>`<li class="${i===d?'today':''}"><span>${OH_IT[i]}</span>${t===null?'—':t.length?t.map(([a,b])=>ohF(a)+'–'+ohF(b)).join(', '):'chiuso'}</li>`).join('')}</ul></div>`;}
function onlineHTML(t,b){const A=[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ')+(t['addr:city']?', '+t['addr:city']:'');
  const tel=t.phone||t['contact:phone']||t['contact:mobile']||'',web=t.website||t['contact:website']||t.url||'',mail=t.email||t['contact:email']||'';
  const fb=t['contact:facebook']||t.facebook||'',ig=t['contact:instagram']||t.instagram||'';const W=u=>/^https?:/.test(u)?u:'https://'+u.replace(/^\/+/,'');
  const q=encodeURIComponent(b.name+' '+(t['addr:city']||((S.zone&&S.zone.address||'').split(',').slice(-1)[0]||'')));
  const g=`https://www.google.com/maps/search/?api=1&query=${q}`;
  let h='';if(A)h+=`<div class="onl"><span>📍</span>${esc(A)}</div>`;
  if(t.opening_hours)h+=ohHTML(t.opening_hours);
  if(tel)h+=`<a class="onl" href="tel:${tel.split(';')[0].replace(/[^\d+]/g,'')}"><span>📞</span>${esc(tel.split(';')[0])}</a>`;
  if(web)h+=`<a class="onl" href="${esc(W(web))}" target="_blank" rel="noopener"><span>🌐</span>${esc(web.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').slice(0,40))}</a>`;
  if(mail)h+=`<a class="onl" href="mailto:${esc(mail)}"><span>✉️</span>${esc(mail)}</a>`;
  if(fb)h+=`<a class="onl" href="${esc(/^https?:/.test(fb)?fb:'https://facebook.com/'+fb)}" target="_blank" rel="noopener"><span>📘</span>Facebook</a>`;
  if(ig)h+=`<a class="onl" href="${esc(/^https?:/.test(ig)?ig:'https://instagram.com/'+ig.replace('@',''))}" target="_blank" rel="noopener"><span>📸</span>Instagram</a>`;
  if(t.wheelchair)h+=`<div class="onl"><span>♿</span>${{yes:'Accessibile in sedia a rotelle',limited:'Accessibilità parziale',no:'Non accessibile in sedia a rotelle'}[t.wheelchair]||esc(t.wheelchair)}</div>`;
  if(t.emergency==='yes'||t.dispensing==='yes')h+=`<div class="onl"><span>🚑</span>${t.emergency==='yes'?'Pronto soccorso':'Farmacia con ricette'}</div>`;
  if(t.operator||t.brand)h+=`<div class="onl"><span>🏷️</span>${esc(t.brand||t.operator)}</div>`;
  if(t.description)h+=`<div class="onl"><span>ℹ️</span>${esc(t.description.slice(0,220))}</div>`;
  if(!h)h='<p class="muted" style="font-size:13px;margin:4px 0">Online non ci sono ancora orari o contatti per questa attività.</p>';
  return h+`<div class="onl-btn"><a href="${g}" target="_blank" rel="noopener">⭐ Foto e recensioni<br><small>Google Maps</small></a><a href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">🔎 Cerca online<br><small>Google</small></a>${t.wikipedia?`<a href="https://it.wikipedia.org/wiki/${encodeURIComponent(t.wikipedia.replace(/^it:/,''))}" target="_blank" rel="noopener">📖 Wikipedia</a>`:''}</div>`;}
async function fillOnline(card,b){const box=card.querySelector('[data-online]');if(!box)return;
  if(!navigator.onLine){box.innerHTML=onlineHTML({},b);return;}
  const t=await poiDetails(b.name,b.ll).catch(()=>null);if(!document.body.contains(box))return;box.innerHTML=onlineHTML(t||{},b);
  /* se online c'è telefono o sito, compaiono anche come pulsanti grandi */
  const act=card.querySelector('.bzc-act');if(act&&t){const tel=t.phone||t['contact:phone'];const web=t.website||t['contact:website'];
    if(tel&&!act.querySelector('a[href^="tel:"]'))act.insertAdjacentHTML('beforeend',`<a href="tel:${tel.split(';')[0].replace(/[^\d+]/g,'')}"><span>📞</span>Chiama</a>`);
    if(web&&!act.querySelector('a[data-web]'))act.insertAdjacentHTML('beforeend',`<a data-web href="${esc(/^https?:/.test(web)?web:'https://'+web)}" target="_blank" rel="noopener"><span>🌐</span>Sito</a>`);}}
const _bzCardO=bzCard;bzCard=function(b,pub){return _bzCardO(b,pub).replace('<div data-admin></div>','<div class="online" data-online><span class="spin"></span> Cerco orari e contatti online…</div><div data-admin></div>');};
const _bizSheetO=bizSheet;bizSheet=function(b,z){_bizSheetO(b,z);const c=document.querySelector('#sheet.open .sheet-card');if(c)fillOnline(c,b);};
const _lmPoiO=lmPoi;lmPoi=function(name,cat,d,ll,pub){_lmPoiO(name,cat,d,ll,pub);const c=document.querySelector('#sheet.open .sheet-card');if(c)fillOnline(c,{name,ll});};
</script>
<script>
/* =========================================================
   QUARTIERE VERO NEL GIOCO
   - sfondo: vie, case, verde e acqua veri (OpenStreetMap)
   - i lotti in vendita diventano case vere intorno alla tua
   - i punti da fortificare vanno su posti veri: rotonda,
     incroci, chiesa, case dei vicini, campi
   - servizi veri, posti sponsor e sponsor nelle posizioni vere
   ========================================================= */
const HQ={s:.62,map:null};
function hqMy(){return G.type==='camper'?[250,600]:HOME_POS[HTYPES[G.type].zone];}
function hqP(m,la,lo){const k=Math.cos(m.lat*Math.PI/180),[hx,hy]=hqMy();return[hx+(lo-m.lon)*111320*k*HQ.s,hy-(la-m.lat)*110540*HQ.s];}
const hqIn=([x,y])=>x>12&&x<388&&y>-104&&y<604;
function hqArea(g,m){const k=Math.cos(m.lat*Math.PI/180);let a=0;for(let i=0,j=g.length-1;i<g.length;j=i++){a+=((g[j].lon-m.lon)*111320*k+(g[i].lon-m.lon)*111320*k)*((g[j].lat-g[i].lat)*110540);}return Math.abs(a/2);}
function hqPlan(m){const key=S.zone.address+'|'+G.type;if(HQ.map&&HQ.map.key===key)return HQ.map;
  const my=hqMy();const ways=m.els.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>1);
  const cen=g=>{const c=g.reduce((a,p)=>[a[0]+p.lat,a[1]+p.lon],[0,0]).map(v=>v/g.length);return c;};
  const B=ways.filter(e=>e.tags&&e.tags.building).map(e=>{const c=cen(e.geometry);const P=hqP(m,c[0],c[1]);return{e,P,area:hqArea(e.geometry,m),bt:e.tags.building,d:Math.hypot(P[0]-my[0],P[1]-my[1])};}).filter(b=>hqIn(b.P)&&b.d>26&&b.area>25).sort((a,b)=>a.d-b.d);
  const F=ways.filter(e=>e.tags&&/farmland|meadow|orchard|vineyard|grass/.test(e.tags.landuse||'')).map(e=>{const c=cen(e.geometry);const P=hqP(m,c[0],c[1]);return{e,P,area:hqArea(e.geometry,m),d:Math.hypot(P[0]-my[0],P[1]-my[1])};}).filter(f=>hqIn(f.P)&&f.area>1200).sort((a,b)=>a.d-b.d);
  const used=[my];const free=(P,dm)=>used.every(u=>Math.hypot(u[0]-P[0],u[1]-P[1])>=dm);const take=(L,ok,dm=30)=>{const x=L.find(c=>ok(c)&&free(c.P,dm));if(x){used.push(x.P);x.used=1;}return x;};
  /* punti da fortificare */
  const sl={};const roads=ways.filter(e=>e.tags&&e.tags.highway&&e.tags.name&&!/footway|path|cycleway|steps|service|track/.test(e.tags.highway));
  const cnt={};roads.forEach(e=>(e.nodes||[]).forEach((n,i)=>{(cnt[n]=cnt[n]||{names:new Set(),p:e.geometry[i]}).names.add(e.tags.name);}));
  const X=Object.values(cnt).filter(c=>c.names.size>=2&&c.p).map(c=>{const P=hqP(m,c.p.lat,c.p.lon);return{P,names:[...c.names],d:Math.hypot(P[0]-my[0],P[1]-my[1])};}).filter(c=>hqIn(c.P)).sort((a,b)=>a.d-b.d);
  const rb=ways.find(e=>e.tags&&e.tags.junction==='roundabout');
  const put=(id,P,name)=>{if(P&&hqIn(P)&&free(P,26)){used.push(P);sl[id]={x:P[0],y:P[1],name};return true;}return false;};
  if(rb){const c=cen(rb.geometry);put('rotonda',hqP(m,c[0],c[1]),'Barricata alla rotonda'+(rb.tags.name?' di '+rb.tags.name:''));}
  if(!sl.rotonda&&X[0])put('rotonda',X[0].P,`Barricata all’incrocio ${X[0].names[0]} / ${X[0].names[1]}`);
  const ch=m.els.find(e=>e.tags&&e.tags.amenity==='place_of_worship'&&e.type==='node');if(ch)put('campanile',hqP(m,ch.lat,ch.lon),'Campanile vedetta'+(ch.tags.name?' · '+ch.tags.name:''));
  const len={};roads.forEach(e=>{let L=0;for(let i=1;i<e.geometry.length;i++)L+=Math.hypot(e.geometry[i].lat-e.geometry[i-1].lat,e.geometry[i].lon-e.geometry[i-1].lon);len[e.tags.name]=(len[e.tags.name]||0)+L;});
  const main=Object.entries(len).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  if(main[0]){const w=roads.filter(e=>e.tags.name===main[0]).sort((a,b)=>b.geometry.length-a.geometry.length)[0];const p=w.geometry[Math.floor(w.geometry.length/2)];put('lampioni',hqP(m,p.lat,p.lon),'Lampioni di '+main[0]);}
  [['rossi','Casa dei Rossi'],['bianchi','Casa Bianchi'],['neri','Casale Neri']].forEach(([id,nm],i)=>{const b=take(B,x=>x.d>34+i*30,26);if(b){used.pop();put(id,b.P,nm+(b.e.tags['addr:street']?' · '+b.e.tags['addr:street']:''));}});
  const fm=take(F,()=>true,30);if(fm){used.pop();put('fattoria',fm.P,'Fattoria Bassi · campi veri');}
  ['acquedotto','canile','fattoria','campanile','lampioni'].forEach(id=>{if(sl[id])return;const b=take(B,x=>x.d>90,30);if(b){used.pop();put(id,b.P,null);}});
  /* lotti in vendita = case vere */
  const lots={},lotsB={};const big=b=>b.area>=260||/apartments|commercial|retail|office|industrial/.test(b.bt),small=b=>b.area<260&&b.area>=40,farm=b=>/farm|barn|farm_auxiliary/.test(b.bt)||b.area>=220;
  /* barche solo lungo l'acqua vera, rifugi solo in montagna; lotti ben distanziati su tutta la mappa */
  const WP=[];ways.filter(e=>e.tags&&e.tags.waterway).forEach(e=>e.geometry.forEach((p,i)=>{if(i%3)return;const P=hqP(m,p.lat,p.lon);if(hqIn(P))WP.push({P,d:Math.hypot(P[0]-my[0],P[1]-my[1])});}));
  const mont=(S.zone.real&&S.zone.real.type)==='montagna';
  LOTS.forEach(l=>{let c=null;const DM=44;
    if(l.kind==='palazzo')c=take(B,big,DM)||take(B,()=>true,DM);else if(l.kind==='casale')c=take(B,farm,DM);else if(l.kind==='campo')c=take(F,()=>true,DM);
    else if(l.kind==='barca')c=take(WP,()=>true,DM);else if(l.kind==='rifugio')c=mont?take(B,small,DM):null;else c=take(B,small,DM)||take(B,()=>true,DM);
    lots[l.id]=c?[c.P[0],c.P[1]]:null;if(c&&c.e&&c.e.tags&&c.e.tags.building){const g=c.e.geometry;lotsB[l.id]={bid:'w'+c.e.id,lat:+(g.reduce((q,p)=>q+p.lat,0)/g.length).toFixed(6),lon:+(g.reduce((q,p)=>q+p.lon,0)/g.length).toFixed(6)};}});
  HQ.map={key,sl,lots,lotsB};return HQ.map;}
function hqApply(on){const P=on?HQ.map:null;
  LOTS.forEach(l=>{if(l._x0==null){l._x0=l.x;l._y0=l.y;}const v=P&&P.lots[l.id];const wb=P&&P.lotsB&&P.lotsB[l.id];if(v&&wb&&window.HQW&&HQW.blocked.has(wb.bid)&&!(G.lots&&G.lots[l.id])){l.x=-999;l.y=-999;}else if(v){l.x=Math.round(v[0]);l.y=Math.round(v[1]);}else if(P&&!(G.lots&&G.lots[l.id])){l.x=-999;l.y=-999;}else{l.x=l._x0;l.y=l._y0;}});
  SLOTS.forEach(s=>{if(s._x0==null){s._x0=s.x;s._y0=s.y;s._n0=s.name;}const v=P&&P.sl[s.id];if(v){s.x=Math.round(v.x);s.y=Math.round(v.y);if(v.name)s.name=v.name;}else{s.x=s._x0;s.y=s._y0;s.name=s._n0;}});}
function hqBack(m){const pr=(la,lo)=>hqP(m,la,lo).map(v=>v.toFixed(1)).join(' ');const path=(g,c)=>g.map((p,i)=>(i?'L':'M')+pr(p.lat,p.lon)).join('')+(c?'Z':'');
  const ways=m.els.filter(e=>e.type==='way'&&e.geometry&&e.geometry.length>1);let green='',water='',bld='',r0='',r1='',lab='';const I='#140f1f';
  const H=S.zone.real&&S.zone.real.house;const my=hqMy();
  ways.forEach(e=>{const t=e.tags||{};
    if(t.leisure||/grass|meadow|recreation|park/.test(t.landuse||''))green+=`<path d="${path(e.geometry,1)}" fill="#a9d38a" stroke="${I}" stroke-width="1"/>`;
    else if(/farmland|orchard|vineyard/.test(t.landuse||''))green+=`<path d="${path(e.geometry,1)}" fill="#ecd98f" stroke="${I}" stroke-width=".8"/>`;
    else if(/forest/.test(t.landuse||'')||t.natural==='wood')green+=`<path d="${path(e.geometry,1)}" fill="#6faa6a" stroke="${I}" stroke-width="1"/>`;
    else if(t.natural==='water')water+=`<path d="${path(e.geometry,1)}" fill="#6fb3e6" stroke="${I}" stroke-width="1.6"/>`;
    else if(t.waterway)water+=`<path d="${path(e.geometry)}" fill="none" stroke="${I}" stroke-width="${t.waterway==='river'?14:6}" stroke-linecap="round"/><path d="${path(e.geometry)}" fill="none" stroke="#6fb3e6" stroke-width="${t.waterway==='river'?10:3.5}" stroke-linecap="round"/>`;});
  let mineDone=false;
  ways.filter(e=>e.tags&&e.tags.building).forEach(e=>{const c=e.geometry.reduce((a,p)=>[a[0]+p.lat/e.geometry.length,a[1]+p.lon/e.geometry.length],[0,0]);const P=hqP(m,c[0],c[1]);
    const mine=!mineDone&&Math.hypot(P[0]-my[0],P[1]-my[1])<9;if(mine)mineDone=true;
    bld+=`<path d="${path(e.geometry,1)}" fill="${mine?'#d7263d':'#f4e7cf'}" stroke="${I}" stroke-width="${mine?2.2:1}"/>`;});
  const RW={motorway:13,trunk:12,primary:11,secondary:10,tertiary:9,unclassified:7,residential:7,living_street:6,service:4,pedestrian:6,track:3,footway:2,path:2,cycleway:2};
  const rds=ways.filter(e=>e.tags&&e.tags.highway&&RW[e.tags.highway]).sort((a,b)=>RW[a.tags.highway]-RW[b.tags.highway]);
  rds.forEach(e=>{const w=RW[e.tags.highway];const d=path(e.geometry);if(w<=3){r1+=`<path d="${d}" fill="none" stroke="#7c6f8f" stroke-width="1.4" stroke-dasharray="3 3"/>`;return;}
    r0+=`<path d="${d}" fill="none" stroke="${I}" stroke-width="${w+3}" stroke-linecap="round" stroke-linejoin="round"/>`;r1+=`<path d="${d}" fill="none" stroke="${w>=10?'#f7d64a':'#fffaf0'}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;});
  const byN={};rds.forEach(e=>{const n=e.tags.name;if(!n||RW[e.tags.highway]<=3)return;const g=e.geometry;let L=0;for(let i=1;i<g.length;i++){const a=hqP(m,g[i-1].lat,g[i-1].lon),b=hqP(m,g[i].lat,g[i].lon);L+=Math.hypot(a[0]-b[0],a[1]-b[1]);}if(!byN[n]||byN[n].L<L)byN[n]={e,L};});
  Object.entries(byN).sort((a,b)=>b[1].L-a[1].L).slice(0,14).forEach(([n,{e,L}])=>{if(L<n.length*5.5)return;let g=e.geometry;const a=hqP(m,g[0].lat,g[0].lon),b=hqP(m,g[g.length-1].lat,g[g.length-1].lon);if(b[0]<a[0])g=g.slice().reverse();
    lab+=`<path id="hq${e.id}" d="${path(g)}" fill="none"/><text font-family="Bangers,Impact,sans-serif" font-size="9.5" letter-spacing=".4" fill="${I}" stroke="#fff" stroke-width="2.6" paint-order="stroke" dy="3.2"><textPath href="#hq${e.id}" startOffset="50%" text-anchor="middle">${esc(n.toUpperCase())}</textPath></text>`;});
  /* servizi veri, posti sponsor e sponsor */
  let pins='';const R=S.zone.real;
  if(R)R.fac.forEach((f,i)=>{const P=hqP(m,f.lat,f.lon);if(!hqIn(P))return;const ic=(RES_ICON[f.k]||['📍'])[0];
    if(f.cand)pins+=`<g data-rfac="${i}" style="cursor:pointer"><circle cx="${P[0]}" cy="${P[1]}" r="9" fill="#ffe680" stroke="#b8860b" stroke-width="2.4" stroke-dasharray="4 2"/><text x="${P[0]}" y="${P[1]+3.5}" text-anchor="middle" font-size="9">🔧</text></g>`;
    else if(['osp','farm','cc','vvf','racc','super','dist'].includes(f.k))pins+=`<g data-rfac="${i}" style="cursor:pointer"><circle cx="${P[0]+1.5}" cy="${P[1]+1.5}" r="10" fill="${I}"/><circle cx="${P[0]}" cy="${P[1]}" r="10" fill="#fff" stroke="${(RES_ICON[f.k]||[0,'#2f5fb8'])[1]}" stroke-width="2.6"/><text x="${P[0]}" y="${P[1]+4}" text-anchor="middle" font-size="10.5" font-weight="700">${ic}</text></g>`;});
  Object.entries(window.SP_GEO||{}).forEach(([k,g])=>{if(!g||g.lat==null||!SPONSORS[k])return;const P=hqP(m,g.lat,g.lon);if(!hqIn(P))return;
    pins+=`<g data-rsp="${k}" style="cursor:pointer"><rect x="${P[0]-17}" y="${P[1]-26}" width="34" height="22" rx="4" fill="#f7d64a" stroke="${I}" stroke-width="2.5"/><path d="M${P[0]-6} ${P[1]-4} L${P[0]} ${P[1]+4} L${P[0]+6} ${P[1]-4}Z" fill="${I}"/><text x="${P[0]}" y="${P[1]-10}" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="${I}">${esc(SPONSORS[k].logo)}</text><text x="${P[0]}" y="${P[1]+16}" text-anchor="middle" font-size="8" font-weight="700" fill="${I}" stroke="#fff" stroke-width="2.4" paint-order="stroke">${esc(SPONSORS[k].name.slice(0,18))}</text></g>`;});
  /* l'orda arriva dalle strade che entrano nel quartiere */
  const edge=[];rds.filter(e=>RW[e.tags.highway]>=7).forEach(e=>{[e.geometry[0],e.geometry[e.geometry.length-1]].forEach(p=>{const P=hqP(m,p.lat,p.lon);if(!hqIn(P)&&P[0]>-60&&P[0]<460&&P[1]>-160&&P[1]<660)edge.push({P,n:e.tags.name});});});
  const pick=[];edge.forEach(x=>{if(pick.length<4&&pick.every(y=>Math.hypot(y.P[0]-x.P[0],y.P[1]-x.P[1])>140))pick.push(x);});
  const arrows=pick.map(x=>{const cx=Math.max(14,Math.min(386,x.P[0])),cy=Math.max(-100,Math.min(600,x.P[1]));const a=Math.atan2(my[1]-cy,my[0]-cx);
    return`<g transform="translate(${cx} ${cy}) rotate(${a*180/Math.PI})"><path d="M-6 -9 L12 0 L-6 9Z" fill="#d7263d" stroke="${I}" stroke-width="2"/></g><text x="${cx+(cx<200?16:-16)}" y="${cy+(cy<250?18:-10)}" text-anchor="${cx<200?'start':'end'}" font-family="Bangers,Impact" font-size="9" fill="#d7263d" stroke="#fff" stroke-width="2.4" paint-order="stroke">🧟 ORDA${x.n?' DA '+esc(x.n.toUpperCase().slice(0,20)):''}</text>`;}).join('');
  return`<rect y="-120" width="400" height="800" fill="#efe4c8"/><rect y="-120" width="400" height="800" fill="url(#hthd)" opacity=".7"/>${green}${water}${r0}${bld}${r1}${lab}${pins}${arrows}
   <rect y="620" width="400" height="60" fill="#3b3550"/>${typeof mBanner==='function'?mBanner(200,640,'FUORI PAESE: QUI SI RADUNA L’ORDA',0,9):''}
   <text x="392" y="612" text-anchor="end" font-size="7.5" fill="#5a5470">© OpenStreetMap</text>`;}
/* se i dati della zona non sono ancora in memoria, li carico e ridisegno */
</script>
<script>
/* =========================================================
   COMMUNITY VERA: utenti registrati sulla mappa (solo chi
   accetta, posizione arrotondata ~200 m) + segnalazioni
   "ha chiuso" per le attività
   ========================================================= */
window.ZUSERS=window.ZUSERS||[];
const rLat=v=>Math.round(v/0.002)*0.002,rLon=v=>Math.round(v/0.0028)*0.0028;
async function zLoadUsers(){try{const sb=await waitSB();if(!sb)return;const{data,error}=await sb.from('profili_pubblici').select('user_id,nick,lat_r,lon_r,comune,indice,livello,seen_at').limit(2000);
  if(error||!data)return;window.ZUSERS=data.filter(u=>u.lat_r!=null);(window.__zlms||[]).forEach(lm=>{try{zDrawUsers(lm);}catch(e){}});}catch(e){}}
async function zSyncProfile(force){try{const sb=typeof SB!=='undefined'&&SB;if(!sb||!S.user||!S.user.id)return;const R=S.zone&&S.zone.real;
  if(S.pubOk===undefined&&R&&!zSyncProfile.asked){zSyncProfile.asked=1;setTimeout(zAskPublic,1200);}
  /* presenza: sempre (serve per contare chi è online); posizione solo se ha accettato */
  const vis=S.pubOk===true;const row={user_id:S.user.id,nick:S.user.nick,seen_at:new Date().toISOString(),updated_at:new Date().toISOString(),visibile:vis,
    indice:S.result?S.result.idx:null,livello:(typeof G!=='undefined'&&G.type)?G.level:null,lat_r:null,lon_r:null,comune:null};
  if(vis&&R){row.lat_r=+rLat(R.lat).toFixed(4);row.lon_r=+rLon(R.lon).toFixed(4);row.comune=((S.zone.address||'').split(',').slice(-1)[0]||'').trim();}
  await sb.from('profili_pubblici').upsert(row,{onConflict:'user_id'});if(force)zLoadUsers();zStats();}catch(e){}}
/* numeri veri in alto: utenti registrati e online negli ultimi 5 minuti */
async function zStats(){try{const sb=await waitSB(4000);if(!sb)return;const{data,error}=await sb.rpc('zsh_stats');if(error||!data)return;
  STATS.reg=data.utenti||0;STATS.on=data.online||0;tickStats();}catch(e){}}
zStats();setInterval(()=>{if(!document.hidden)zStats();},60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){zSyncProfile();zStats();}});
function zAskPublic(){if(document.querySelector('#sheet.open'))return setTimeout(zAskPublic,4000);
  openSheet('👥 Vuoi comparire sulla mappa?',`<p style="font-weight:400;margin-bottom:10px">Gli altri superstiti vedranno il tuo <b>nickname @${esc(S.user.nick)}</b>, l'<b>indice della casa</b> e il livello nel gioco, in una <b>posizione approssimata di circa 200 metri</b>. Mai l'indirizzo, mai i punti deboli della casa.</p>
   <p class="muted" style="font-size:13px;margin-bottom:12px">Così vedi anche tu chi c'è nel quartiere. Puoi cambiare idea quando vuoi dal menu ☰.</p>
   <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-pub="1">✅ Sì, mostrami</button><button class="btn ghost small" data-pub="0">No grazie</button></div>`,card=>{
   card.querySelectorAll('[data-pub]').forEach(b=>b.onclick=()=>{S.pubOk=b.dataset.pub==='1';closeSheet();toast(S.pubOk?'👥 Sei sulla mappa della community':'Ok, resti invisibile');zSyncProfile(true);try{saveLocal();}catch(e){}});});}
/* l'impostazione si salva con i progressi */
const _snapZ=snapshot;snapshot=function(){const d=_snapZ();if(d&&d.S)d.S.pubOk=S.pubOk;return d;};
const _restZ=restore;restore=function(d){const r=_restZ(d);try{if(d&&d.S&&d.S.pubOk!=null)S.pubOk=d.S.pubOk;}catch(e){}return r;};
/* segnaposto degli utenti sulla mappa vera */
function zDrawUsers(lm){if(!lm||!lm.map)return;(lm._usr||[]).forEach(x=>x.remove());lm._usr=[];const me=S.user&&S.user.id;const now=Date.now();
  window.ZUSERS.forEach(u=>{if(u.user_id===me)return;const on=u.seen_at&&now-new Date(u.seen_at).getTime()<6*60*1000;
    const col=u.indice==null?'#9aa4b0':u.indice<=4?'#3f9b5f':u.indice<=6?'#f7d64a':'#d7263d';
    const el=elDiv('lm-usr',`<b style="background:${col}">${esc((u.nick||'?')[0].toUpperCase())}</b>${on?'<i></i>':''}<em>@${esc(u.nick)}</em>`);el.dataset.uid=u.user_id;
    el.addEventListener('click',e=>{e.stopPropagation();openSheet('👤 @'+esc(u.nick),`<div class="bzc"><div class="bzc-hero" style="--c:#e2d6f5"><span class="bzc-ic" style="background:${col}">${esc((u.nick||'?')[0].toUpperCase())}</span><div class="bzc-t"><span class="bzc-cat">Superstite${on?' · online ora':''}</span><h4>@${esc(u.nick)}</h4><small>${u.comune?esc(u.comune)+' · ':''}zona indicativa (circa 200 m)</small></div></div>
      <div class="terrb" style="margin-top:12px"><span class="ok">🏠 Indice ${u.indice!=null?String(u.indice).replace('.',','):'–'}</span><span class="ok">🎮 Livello ${u.livello||'–'}</span></div>
      <p class="muted" style="font-size:13px">Per privacy non vedi l'indirizzo né i punti deboli della sua casa.</p></div>`);});
    lm._usr.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([u.lon_r,u.lat_r]).addTo(lm.map));});}
const _liveMapZ=liveMap;liveMap=async function(el,addr,o){const lm=await _liveMapZ(el,addr,o);try{(window.__zlms=window.__zlms||[]).push(lm);zDrawUsers(lm);}catch(e){}return lm;};
/* quando ci si collega o si valuta la casa */
const _onLoginZ=onLogin;onLogin=async function(u,fresh){const r=await _onLoginZ(u,fresh);window.ZADMIN=null;zSyncProfile();zLoadUsers();return r;};
const _azZ=analyzeZone;analyzeZone=async function(a){const z=await _azZ(a);setTimeout(()=>zSyncProfile(true),500);return z;};
zLoadUsers();setInterval(()=>{if(!document.hidden)zSyncProfile();},3*60*1000);setInterval(()=>{if(!document.hidden)zLoadUsers();},5*60*1000);
/* menu: cambiare idea */
window.zTogglePublic=()=>{S.pubOk=!S.pubOk;zSyncProfile(true);toast(S.pubOk?'👥 Ora sei visibile sulla mappa':'Ora sei invisibile sulla mappa');try{saveLocal();}catch(e){}};
/* aree community calcolate sugli utenti veri (un'area si colora solo con almeno K_MIN persone) */
const _commCellsZ=commCells;
commCells=function(z){const base=_commCellsZ(z);const R=z&&z.real;if(!R||!window.ZUSERS)return base;const key=window.ZUSERS.length+'|'+R.lat;if(z._commR===key&&z._commRv)return z._commRv;
  const k=Math.cos(R.lat*Math.PI/180);const out=base.map(c=>({x:c.x,y:c.y,n:0,sum:0}));
  window.ZUSERS.forEach(u=>{const dx=(u.lon_r-R.lon)*111320*k,dy=(u.lat_r-R.lat)*110540;const x=200+dx/1.9,y=170-dy/1.9;let b=null,bd=60;out.forEach(c=>{const d=Math.hypot(c.x-x,c.y-y);if(d<bd){bd=d;b=c;}});if(b){b.n++;b.sum+=(u.indice!=null?+u.indice:5);}});
  if(S.user&&S.result){let b=null,bd=60;out.forEach(c=>{const d=Math.hypot(c.x-200,c.y-170);if(d<bd){bd=d;b=c;}});if(b&&!window.ZUSERS.some(u=>u.user_id===S.user.id)){b.n++;b.sum+=S.result.idx;}}
  out.forEach(c=>{c.avg=c.n?c.sum/c.n:(z.avgU||5);delete c.sum;});z._commR=key;z._commRv=out;return out;};
const _zoneCardU=zoneCard;zoneCard=function(z,key,me){let h=_zoneCardU(z,key,me);try{if(z&&z.real&&window.ZUSERS){const R=z.real;const near=window.ZUSERS.filter(u=>trM(R.lat,R.lon,u.lat_r,u.lon_r)<3000&&!(S.user&&u.user_id===S.user.id));
    const av=near.filter(u=>u.indice!=null);h=h.replace(/<b>\d+<\/b><small>superstiti<\/small>/,`<b>${near.length}</b><small>superstiti entro 3 km</small>`)
      .replace(/(<b>)[^<]*(<\/b><small>indice medio<\/small>)/,`$1${av.length?fmtI(av.reduce((a,u)=>a+ +u.indice,0)/av.length):'–'}$2`)
      .replace('Superstiti della community ancora simulati.','Superstiti veri: solo chi ha scelto di comparire, in posizione approssimata.');}}catch(e){}return h;};
/* segnalazione "ha chiuso" */
window.ZMYHID=JSON.parse(localStorage.getItem('zsh_myhid')||'[]');
async function zReport(name,ll){if(!S.user||typeof SB==='undefined'||!SB){toast('Accedi per segnalare: così evitiamo segnalazioni false');return;}
  try{const{error}=await SB.from('poi_reports').insert({name,lat:ll?ll[0]:null,lon:ll?ll[1]:null,motivo:'chiusa'});if(error)throw error;}catch(e){toast('Segnalazione non inviata: riprova più tardi');return;}
  window.ZMYHID.push(name);try{localStorage.setItem('zsh_myhid',JSON.stringify(window.ZMYHID));}catch(e){}window.ZHID=[...new Set([...(window.ZHID||[]),name])];zApplyHidden();closeSheet();toast('Grazie! Segnalazione inviata: la controlliamo noi');}
window.ZHID=[...new Set([...(window.ZHID||[]),...window.ZMYHID])];
const _bzCardR=bzCard;bzCard=function(b,pub){return _bzCardR(b,pub).replace('<div data-admin></div>',`<button class="bzc-rep" data-rep>⚠️ Ha chiuso o non esiste più? Segnalalo</button><div data-admin></div>`);};
const _bizSheetR=bizSheet;bizSheet=function(b,z){_bizSheetR(b,z);const c=document.querySelector('#sheet.open .sheet-card');const r=c&&c.querySelector('[data-rep]');if(r)r.onclick=()=>zReport(b.name,b.ll);};
const _lmPoiR=lmPoi;lmPoi=function(name,cat,d,ll,pub){_lmPoiR(name,cat,d,ll,pub);const c=document.querySelector('#sheet.open .sheet-card');const r=c&&c.querySelector('[data-rep]');if(r)r.onclick=()=>zReport(name,ll);};
</script>
<script>
const _renderMenuZ=renderMenu;renderMenu=function(){_renderMenuZ();try{if(!S.user)return;const u=document.querySelector('.dr-user');if(!u||document.querySelector('[data-pubt]'))return;
  u.insertAdjacentHTML('afterend',`<button class="mi" data-pubt="1"><span>👥</span>Sulla mappa della community: <b style="margin-left:4px">${S.pubOk?'visibile':'invisibile'}</b></button>`);
  document.querySelector('[data-pubt]').onclick=e=>{e.stopPropagation();zTogglePublic();renderMenu();};}catch(e){}};
</script>
<script>
/* =========================================================
   LA NOTTE DEL GIOCO = LA NOTTE VERA
   meteo reale della tua zona (Open-Meteo) + fase della luna:
   pioggia → zombie più lenti; nebbia → si vede poco;
   temporale/vento forte → blackout; luna piena → orda rabbiosa
   ma monete doppie. Senza rete: eventi casuali come prima.
   ========================================================= */
const ZW={t:0,d:null};
function moonInfo(d=new Date()){const age=((d.getTime()-Date.UTC(2000,0,6,18,14))/864e5)%29.530588;const a=age<0?age+29.530588:age;const ill=(1-Math.cos(2*Math.PI*a/29.530588))/2;
  const n=a<1.8||a>27.7?'luna nuova':a<6.4?'luna crescente':a<8.4?'primo quarto':a<13.8?'gibbosa crescente':a<15.8?'luna piena':a<21?'gibbosa calante':a<23?'ultimo quarto':'luna calante';
  const ic=a<1.8||a>27.7?'🌑':a<6.4?'🌒':a<8.4?'🌓':a<13.8?'🌔':a<15.8?'🌕':a<21?'🌖':a<23?'🌗':'🌘';return{age:a,ill,n,ic,full:a>=13.8&&a<15.8};}
function wName(c){return c===0?'sereno':c<=2?'poco nuvoloso':c===3?'nuvoloso':c===45||c===48?'nebbia':c>=51&&c<=57?'pioviggine':c>=61&&c<=67?'pioggia':c>=71&&c<=77?'neve':c>=80&&c<=82?'rovesci':c>=85&&c<=86?'neve':c>=95?'temporale':'variabile';}
function wIcon(c){return c===0?'☀️':c<=2?'⛅':c===3?'☁️':c===45||c===48?'🌫️':c>=51&&c<=67?'🌧️':c>=71&&c<=77||c===85||c===86?'❄️':c>=80&&c<=82?'🌦️':c>=95?'⛈️':'🌥️';}
function realNightCond(){const w=ZW.d;if(!w)return undefined;const m=moonInfo();const c=w.weather_code;
  if(c>=95||(w.wind_gusts_10m||0)>=60)return{ev:'blackout',why:`${wIcon(c)} ${c>=95?'Temporale':'Vento forte'} sulla tua zona: salta la corrente, si vede solo vicino alla luce`};
  if(c===45||c===48||(w.visibility!=null&&w.visibility<1000))return{ev:'nebbia',why:'🌫️ Nebbia vera stanotte: gli zombie spuntano all’ultimo'};
  if((c>=51&&c<=67)||(c>=80&&c<=82)||(w.precipitation||0)>=.2)return{ev:'pioggia',why:`🌧️ Piove davvero (${String(w.precipitation||0).replace('.',',')} mm): zombie più lenti${S.zone.real.pos==='bassa'?', ma la tua zona bassa si allaga':''}`};
  if(m.full)return{ev:'luna',why:'🌕 Luna piena vera: orda più veloce, ma monete doppie'};
  return{ev:null,why:`${wIcon(c)} Notte tranquilla: ${wName(c)}, ${Math.round(w.temperature_2m)}°C, ${m.ic} ${m.n}`};}
/* zona bassa + pioggia vera: la barricata soffre di più */
/* nel pannello "Il territorio decide la notte" */
</script>
<script>
/* =========================================================
   TRASLOCO: "Ho cambiato casa"
   Viene con te: monete, gemme, livello, medaglie, attrezzi,
   materiali e kit, Crediti Casa Vera, amici, codici sconto,
   risposte personali (scorte, kit medico, radio, mezzo).
   Resta nella casa vecchia (rimborsata in parte): edifici del
   quartiere 70%, punti fortificati 50%, potenziamenti casa 50%.
   Si ricomincia: posizione, valutazione della casa, Scudo.
   Rimborso al massimo una volta ogni 30 giorni.
   ========================================================= */
const MOVE_KEEP=['cibo','medico','radio','mezzo','acqua'];
function movePlan(){const out={lots:0,q:0,h:0,nl:0,nq:0,nh:0};const sum=(a,n)=>(a||[]).slice(0,n).reduce((x,y)=>x+(y||0),0);
  if(typeof G!=='undefined'&&G.type){
    Object.entries(G.lots||{}).forEach(([id,b])=>{if(b.owner)return;const l=LOTS.find(x=>x.id===id);out.lots+=Math.round((l?l.cost:300)*.7);if(b.kind==='bld'&&BLD[b.b])out.lots+=Math.round(BLD[b.b].cost*.5);out.nl++;});
    Object.entries(G.q||{}).forEach(([id,lv])=>{const s=SLOTS.find(x=>x.id===id);if(s&&lv){out.q+=Math.round(sum(s.cost,lv)*.5);out.nq++;}});
    const st=(HTYPES[G.type]&&HTYPES[G.type].start)||{};Object.entries(G.h||{}).forEach(([id,lv])=>{const u=HUP.find(x=>x.id===id);const paid=lv-(st[id]||0);if(u&&paid>0){out.h+=Math.round((sum(u.cost,lv)-sum(u.cost,st[id]||0))*.5);out.nh++;}});}
  out.tot=out.lots+out.q+out.h;out.cool=!!(typeof G!=='undefined'&&G.lastMove&&Date.now()-G.lastMove<30*864e5);if(out.cool)out.tot=0;return out;}
function moveSheet(){const P=movePlan();const g=typeof G!=='undefined'&&G.type;const old=S.zone&&S.zone.address;
  openSheet('🚚 Ho cambiato casa',`<p style="font-weight:400;margin-bottom:10px">${old?`Lasci <b>${esc(old)}</b>. `:''}Valuti la casa nuova e il gioco si sposta nel quartiere nuovo.</p>
   <div class="mvcol"><div class="mv ok"><b>🎒 Viene con te</b><ul><li>Monete, gemme, livello e medaglie</li><li>Attrezzi anti-zombie, materiali e kit</li><li>Crediti Casa Vera e codici sconto già ottenuti</li><li>Amici e classifica</li><li>Le tue scorte, kit medico, radio e mezzo</li></ul></div>
   <div class="mv ko"><b>🏚️ Resta nella casa vecchia</b><ul><li>${g?`${P.nl} ${P.nl===1?'edificio':'edifici'} del quartiere${P.nl?` → rimborso 70%: 🪙 ${P.lots}`:''}`:'Edifici del quartiere'}</li><li>${g?`${P.nq} ${P.nq===1?'punto fortificato':'punti fortificati'}${P.nq?` → rimborso 50%: 🪙 ${P.q}`:''}`:'Punti fortificati'}</li><li>${g?`Potenziamenti della casa${P.nh?` → rimborso 50%: 🪙 ${P.h}`:''}`:'Potenziamenti della casa'}</li><li>Valutazione, Scudo e missioni della casa vecchia (rifai tutto sulla nuova)</li></ul></div></div>
   ${g?`<div class="mvtot">${P.cool?'Bonus trasloco già usato negli ultimi 30 giorni: questa volta nessun rimborso.':`🎁 Bonus trasloco: <b>🪙 ${P.tot}</b>`}</div>`:''}
   <p class="muted" style="font-size:12.5px;margin:8px 0">La casa vecchia resta salvata nella tua cronologia. Sulla mappa della community la tua posizione si sposta quando valuti la casa nuova.</p>
   <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-mvok>🚚 Sì, mi sono trasferito</button><button class="btn ghost small" data-close2>Annulla</button></div>`,card=>{
    card.querySelector('[data-close2]').onclick=closeSheet;card.querySelector('[data-mvok]').onclick=()=>{doMove(P);};});}
function doMove(P){try{
  S.case=(S.case||[]);if(S.zone)S.case.unshift({address:S.zone.address,idx:S.result?S.result.idx:null,t:Date.now(),type:S.zone.type});S.case=S.case.slice(0,10);
  const keep={};MOVE_KEEP.forEach(k=>{if(S.answers&&S.answers[k]!=null&&!(k==='acqua'&&S.answers[k]==='pozzo'))keep[k]=S.answers[k];});
  S.answers=keep;S.aiFilled={};S.zone=null;S.geo=null;S.result=null;S.rmiss={};S.step=0;S.qLive=null;
  if(S.game){S.game.base=null;S.game.applied=new Set();}
  if(typeof G!=='undefined'&&G.type){G.coins+=P.tot;G.lots={};G.q={};G.h={...((HTYPES[G.type]&&HTYPES[G.type].start)||{})};G.sel=null;G.exp=[];G.rhAuto=0;if(P.tot)G.lastMove=Date.now();
    if(typeof ccvInit==='function'){ccvInit();if(P.tot)G.ccv.log.unshift({t:'Trasloco: rimborso in monete',c:0});}}
  HQ.map=null;try{hqApply(false);}catch(e){}ZW.d=null;
  try{saveLocal();if(typeof pushCloud==='function')pushCloud();}catch(e){}zSyncProfile(true);
  closeSheet();toast(P.tot?`🚚 Trasloco fatto: +🪙 ${P.tot}. Ora valuta la casa nuova`:'🚚 Trasloco fatto: ora valuta la casa nuova');go('valuta');}
  catch(e){console.warn('trasloco',e);toast('Trasloco non riuscito: riprova');}}
/* pulsante in Valuta (quando c'è già una casa) e nel menu */
const _vZonaMv=vZona;vZona=function(){_vZonaMv();try{if(!S.zone||document.getElementById('mvBtn'))return;const g=document.getElementById('geoBtn');const row=g&&g.parentElement;
  if(row)row.insertAdjacentHTML('afterend','<button class="btn ghost small" id="mvBtn" style="margin-top:8px">🚚 Ho cambiato casa</button>');const b=document.getElementById('mvBtn');if(b)b.onclick=moveSheet;}catch(e){}};
const _renderMenuMv=renderMenu;renderMenu=function(){_renderMenuMv();try{if(!S.zone||document.querySelector('[data-move]'))return;const ref=document.querySelector('[data-pubt]')||document.querySelector('.dr-user');
  if(ref){ref.insertAdjacentHTML('afterend','<button class="mi" data-move="1"><span>🚚</span>Ho cambiato casa</button>');document.querySelector('[data-move]').onclick=e=>{e.stopPropagation();try{toggleMenu(false);}catch(x){}moveSheet();};}}catch(e){}};
/* cronologia delle case salvata con i progressi */
const _snapMv=snapshot;snapshot=function(){const d=_snapMv();if(d&&d.S)d.S.case=S.case||[];return d;};
const _restMv=restore;restore=function(d){const r=_restMv(d);try{if(d&&d.S&&d.S.case)S.case=d.S.case;}catch(e){}return r;};
</script>
<script>
/* =========================================================
   MISSIONI DI OGGI SUL TERRITORIO VERO
   3 missioni al giorno, diverse per ogni casa, sui posti veri:
   spedizione verso un posto vero, difesa di un punto vero,
   notte col meteo vero, sponsor / servizi veri da scoprire.
   Premio per ogni missione + scrigno se le fai tutte e 3.
   ========================================================= */
const tmDay=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
function tmGen(){const R=S.zone&&S.zone.real;if(!R)return null;const r=rng(hash(tmDay()+'|'+S.zone.address));const pick=a=>a[Math.floor(r()*a.length)];const L=[];
  try{dayInit();}catch(e){}
  const ex=EXPS.filter(x=>x.real&&!x.hide);if(ex.length){const x=pick(ex);L.push({k:'exp',id:x.id,ic:'🎒',t:`Manda una squadra a <b>${esc(x.n)}</b> (${esc(x.d.split(' vero a ')[1]||'')}) e torna col bottino`,go:'day',rw:{c:80+Math.round(r()*40),g:1}});}
  try{if(G.realHood&&S.zone.address&&RM.cache[S.zone.address]){hqPlan(RM.cache[S.zone.address]);}}catch(e){}
  const sl=HQ.map&&HQ.map.sl?Object.entries(HQ.map.sl).filter(([,v])=>v.name):[];
  if(sl.length&&r()<.6){const[id,v]=pick(sl);L.push({k:'def',id,ic:'🛡️',t:`Fortifica <b>${esc(v.name)}</b> e vinci una notte`,go:'map',rw:{c:120,g:2}});}
  else{const w=realNightCond();L.push(w&&w.ev?{k:'ev',id:w.ev,ic:'🌙',t:`Vinci la notte di oggi con l’evento vero: <b>${{pioggia:'pioggia',nebbia:'nebbia',blackout:'blackout',luna:'luna piena'}[w.ev]}</b>`,go:'fight',rw:{c:140,g:3}}:{k:'win',id:'2',goal:2,ic:'🧟',t:'Vinci <b>2 notti</b> nel tuo quartiere vero',go:'fight',rw:{c:110,g:2}});}
  const sps=Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&g.lat!=null&&SPONSORS[k]);
  if(sps.length){const[k]=pick(sps);L.push({k:'cp',id:k,ic:'⭐',t:`Scopri l’offerta di <b>${esc(SPONSORS[k].name)}</b> e prendi il tuo codice sconto`,go:'sp',rw:{c:60,g:3}});}
  else{const pub=R.fac.filter(f=>['osp','farm','cc','vvf'].includes(f.k)&&f.d<2500);const cand=R.fac.filter(f=>f.cand&&f.d<2500);
    if(pub.length&&(r()<.5||!cand.length)){const f=pick(pub.slice(0,4));L.push({k:'poi',id:f.name,ic:'🏥',t:`Controlla orari e contatti di <b>${esc(f.name)}</b> (${dist(f.d)}): ti servono il giorno dell’emergenza`,go:'poi',ll:[f.lat,f.lon],kk:f.k,d:f.d,rw:{c:50,g:1}});}
    else if(cand.length){const f=pick(cand.slice(0,4));L.push({k:'biz',id:f.name,ic:'🔧',t:`Scopri <b>${esc(f.name)}</b> (${dist(f.d)}): può diventare il presidio sponsor della zona`,go:'biz',ll:[f.lat,f.lon],d:f.d,f,rw:{c:50,g:1}});}}
  L.forEach(m=>{m.goal=m.goal||1;m.prog=0;m.done=false;m.cl=false;});return{day:tmDay(),addr:S.zone.address,list:L,chest:false};}
function tmInitBase(){if(typeof G==='undefined'||!G.type)return null;if(!G.tm||G.tm.day!==tmDay()||G.tm.addr!==(S.zone&&S.zone.address))G.tm=tmGen();return G.tm;}
function tmEvent(k,id,ok){const T=G&&G.tm;if(!T||T.day!==tmDay())return;let hit=false;
  T.list.forEach(m=>{if(m.done)return;let p=false;
    if(m.k===k&&(m.id===id||k==='win'))p=true;if(k==='win'&&m.k==='def'&&G.q&&G.q[m.id]>=1)p=true;if(k==='evwin'&&m.k==='ev'&&m.id===id)p=true;if(k==='win'&&m.k==='win')p=true;
    if(m.k==='exp'&&k==='exp'&&m.id===id&&!ok)p=false;
    if(p){m.prog=Math.min(m.goal,m.prog+1);if(m.prog>=m.goal){m.done=true;m.cl=true;hit=true;G.coins+=m.rw.c;G.gems+=m.rw.g||0;setTimeout(()=>toast(`🎯 Missione completata: +🪙 ${m.rw.c}${m.rw.g?' +💎 '+m.rw.g:''}`),1600);try{sfx('coin');}catch(e){}}}});
  if(hit)try{saveLocal();}catch(e){}}
window.onExpDone=(id,ok)=>tmEvent('exp',id,ok);
window.onWaveEnd=(win,L,ev,coop)=>{if(!win||coop)return;tmEvent('win','x');if(ev)tmEvent('evwin',ev);};
const _couponForTM=couponFor;couponFor=function(k){const c=_couponForTM(k);try{tmEvent('cp',k);}catch(e){}return c;};
const _lmPoiTM=lmPoi;lmPoi=function(name,cat,d,ll,pub){_lmPoiTM(name,cat,d,ll,pub);try{tmEvent('poi',name);}catch(e){}};
const _bizSheetTM=bizSheet;bizSheet=function(b,z){_bizSheetTM(b,z);try{tmEvent('biz',b.name);}catch(e){}};
function tmHTML(){const T=tmInit();if(!T)return'';const done=T.list.filter(m=>m.cl).length;
  return`<div class="panel tmp"><div class="row spread"><b class="disp" style="font-size:22px">🎯 Missioni di oggi</b><span class="tag">${done}/${T.list.length}</span></div>
   <p style="font-weight:400;font-size:12.5px;margin:2px 0 8px">Sui posti veri della tua zona. Cambiano ogni giorno a mezzanotte.</p>
   ${T.list.map((m,i)=>`<div class="tm ${m.cl?'cl':m.done?'ok':''}"><span class="tmi">${m.cl?'✅':m.ic}</span><div class="tmt"><span>${m.t}</span>${m.goal>1?`<div class="vbar"><span style="width:${m.prog/m.goal*100}%"></span></div>`:''}<small>Premio: 🪙 ${m.rw.c}${m.rw.g?` · 💎 ${m.rw.g}`:''}</small></div>
     ${m.cl?'':m.done?`<button class="btn small" data-tmc="${i}">Riscatta</button>`:`<button class="btn small ghost" data-tmg="${i}">Vai</button>`}</div>`).join('')}
   ${done===T.list.length&&!T.chest?`<button class="btn wide alt" data-tmx>🎁 Apri lo scrigno: tutte fatte! (💎 10)</button>`:T.chest?'<p class="muted" style="font-size:12.5px;margin-top:6px">Scrigno aperto. Domani nuove missioni.</p>':`<p class="muted" style="font-size:12.5px;margin-top:6px">Completale tutte e 3 per lo scrigno: 💎 10.</p>`}</div>`;}
function tmBindBase(){const p=app.querySelector('.tmp');if(!p)return;const T=G.tm;
  p.querySelectorAll('[data-tmc]').forEach(b=>b.onclick=()=>{const m=T.list[+b.dataset.tmc];if(!m||!m.done||m.cl)return;m.cl=true;G.coins+=m.rw.c;G.gems+=m.rw.g||0;sfx('coin');vibe();toast(`+🪙 ${m.rw.c}${m.rw.g?` +💎 ${m.rw.g}`:''}`);renderHub();});
  const x=p.querySelector('[data-tmx]');if(x)x.onclick=()=>{T.chest=true;G.gems+=10;sfx('win');toast('🎁 Scrigno delle missioni: +💎 10');renderHub();};
  p.querySelectorAll('[data-tmg]').forEach(b=>b.onclick=()=>{const m=T.list[+b.dataset.tmg];if(!m)return;
    if(m.go==='day'){const d=app.querySelector('.dayp');if(d){const f=d.closest('details');if(f)f.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}}
    else if(m.go==='fight'){const f=app.querySelector('#fight');if(f)f.scrollIntoView({behavior:'smooth',block:'center'});}
    else if(m.go==='map'){const sl=SLOTS.find(s=>s.id===m.id);G.sel=m.id;renderHub();setTimeout(()=>{const i=app.querySelector('#slotinfo');if(i)i.scrollIntoView({behavior:'smooth',block:'center'});},60);}
    else if(m.go==='sp'){sponsorSheet(m.id,S.zone);}
    else if(m.go==='poi'){lmPoi(m.id,TR_NAME[m.kk]||'Servizio',m.d,m.ll,true);renderHub();}
    else if(m.go==='biz'){bizSheet({i:'tm',ic:'🔧',name:m.id,cat:'Attività per la casa',d:m.d,ll:m.ll,cand:true,tel:m.f&&m.f.tel,web:m.f&&m.f.web},S.zone);}});}
</script>
<script>
/* =========================================================
   DIFESE E ZOMBIE DEL TERRITORIO
   Abilità della tua casa scelta dal quartiere vero:
   👥 vicini veri (utenti registrati entro 1,5 km), 🚒 idranti
   (vigili del fuoco vicini), 🔔 campane (chiesa vera),
   🌊 piena del fiume, ⛰ sassi dalla collina.
   Zombie del territorio: 💧 annegati dal fiume (corsia bassa),
   🌾 braccianti dai campi, 🧗 scalatori in collina,
   🚆 pendolari in centro.
   ========================================================= */
const ZVAR={annegato:['💧','Annegato: sale dal fiume, più resistente'],bracciante:['🌾','Bracciante: lento ma duro'],scalatore:['🧗','Scalatore: le salite non lo rallentano'],pendolare:['🚆','Pendolare: arriva di corsa']};
window.zTerrZ=(z,s)=>{const R=S.zone&&S.zone.real;if(!R||!z||z.ty==='boss'||z.ty==='oro')return;const H=G.hoods&&G.hoods[G.curHood];if(H&&H.id!=='own')return;const r=Math.random();
  if(R.water&&R.water.d<500&&z.lane===2&&r<.4){z.vic='💧';z.hp*=1.35;z.max*=1.35;z.spMul=1.12;}
  else if(R.type==='campagna'&&z.ty==='walker'&&r<.25){z.vic='🌾';z.hp*=1.6;z.max*=1.6;z.spMul=.85;}
  else if((R.pos==='pendio'||R.pos==='altura'||(s&&s.slope&&s.slope<1))&&r<.22){z.vic='🧗';z.noSlope=1;}
  else if(R.type==='centro'&&z.ty==='runner'&&r<.35){z.vic='🚆';z.spMul=1.18;}};
/* nel pannello del territorio: abilità e zombie della zona */
</script>
<script>
/* =========================================================
   VALUTAZIONE PIÙ RICCA
   - foto per stanza (7 zone: fuori e dentro)
   - 17 domande nuove nei 6 capitoli (45 in tutto)
   - le tue foto accanto alle domande che le riguardano
   - piano d'azione: tutte le falle, ordinate per efficacia,
     divise in "gratis oggi", "sotto 200 €", "investimenti",
     con lo sponsor della zona quando c'è
   ========================================================= */
const PHOTO_SLOTS=[['porta','🚪 Porta d’ingresso'],['finestre','🪟 Finestre al piano terra'],['perimetro','🧱 Cancello e recinzione'],['retro','🏡 Retro e giardino'],['ingresso','🔐 Ingresso visto da dentro'],['soggiorno','🛋️ Soggiorno e portefinestre'],['garage','🚗 Garage o cantina']];
PHOTO_SLOTS.forEach(([k])=>{if(!(k in S.photos))S.photos[k]=null;});
const QPHOTO={porta:'porta',spioncino:'porta',serratura:'ingresso',finestre:'finestre',grate:'finestre',tapparelle:'finestre',vetri:'finestre',recinzione:'perimetro',cancello:'perimetro',luci:'perimetro',visibile:'perimetro',retro:'retro',appigli:'retro',videosorv:'retro',portafin:'soggiorno',garage:'garage',cantina:'garage',ingressi:'retro'};
const QNEW=[
 {id:'anno',ch:'str',t:'Quando è stata costruita la casa?',h:'Le case recenti seguono norme antisismiche e hanno serramenti migliori.',o:[['n2010','Dopo il 2010, o ristrutturata da poco',2],['n1980','Tra il 1980 e il 2010',4],['v1980','Prima del 1980',6],['ns','Non lo so',5]]},
 {id:'rifugio',ch:'str',t:'C’è una stanza che si chiude bene da dentro, senza finestre basse?',h:'Una camera al piano alto o un bagno con porta robusta: l’ultima linea di difesa.',o:[['si','Sì, con porta robusta e chiave',2],['quasi','Sì, ma con porta normale',4],['no','No',7]]},
 {id:'serratura',ch:'acc',t:'Che serratura ha la porta d’ingresso?',ai:1,h:'Il cilindro europeo antiscasso con “defender” (la placca di protezione) è lo standard di oggi.',o:[['cil','Cilindro europeo antiscasso con defender',2],['dop','Doppia mappa (chiave lunga)',6],['norm','Normale',5],['ns','Non lo so',5]]},
 {id:'spioncino',ch:'acc',t:'Vedi chi c’è fuori prima di aprire?',o:[['video','Videocitofono o spioncino digitale',2],['spio','Spioncino o finestra vicino alla porta',4],['no','No',7]]},
 {id:'portafin',ch:'acc',t:'Ci sono portefinestre o vetrate al piano terra?',ai:1,o:[['no','Nessuna',1],['prot','Sì, con grate o tapparelle robuste',3],['si','Sì, senza protezioni',8]]},
 {id:'retro',ch:'acc',t:'Com’è la porta sul retro o di servizio?',ai:1,o:[['nessuna','Non c’è',1],['blind','Blindata o robusta',3],['norm','Normale o con vetri',7]]},
 {id:'videosorv',ch:'per',t:'Da dentro casa vedi tutto il giardino o il cortile?',o:[['tutto','Sì, tutto',2],['parte','Solo in parte',5],['no','No, ci sono angoli nascosti',7],['na','Non ho giardino né cortile',3]]},
 {id:'appigli',ch:'per',t:'Vicino ai muri ci sono cose per arrampicarsi (bidoni, scale, cataste, alberi)?',ai:1,o:[['no','No, niente',2],['qualche','Qualcosa',5],['molti','Sì, parecchie',8]]},
 {id:'estintore',ch:'ris',t:'Hai estintore e rilevatore di fumo o gas?',o:[['entrambi','Sì, entrambi',2],['uno','Solo uno dei due',5],['no','Nessuno',8]]},
 {id:'farmaci',ch:'ris',t:'Chi in famiglia prende farmaci ogni giorno, quanti ne ha di scorta?',o:[['nn','Nessuno ne ha bisogno',2],['30','Per un mese o più',2],['7','Per circa una settimana',5],['0','Per pochi giorni',8]]},
 {id:'contanti',ch:'ris',t:'Tieni un po’ di contanti in casa per le emergenze?',h:'Se saltano corrente e rete, i pagamenti elettronici non funzionano.',o:[['si','Sì',2],['poco','Pochi',5],['no','No',7]]},
 {id:'numeri',ch:'com',t:'I numeri importanti sono scritti anche su carta?',o:[['si','Sì, a portata di mano',2],['no','No, solo nel telefono',7]]},
 {id:'ritrovo',ch:'com',t:'La famiglia ha un punto di ritrovo concordato?',o:[['si','Sì, e lo sanno tutti',2],['vago','Più o meno',5],['no','No',8]]},
 {id:'powerbank',ch:'com',t:'Come tieni carico il telefono senza corrente?',o:[['si','Powerbank carichi o pannellino solare',2],['auto','Solo con l’auto',4],['no','Non posso',7]]},
 {id:'zainofuga',ch:'mob',t:'Hai uno zaino pronto per andare via in 5 minuti?',o:[['si','Sì, con acqua, torcia, documenti e farmaci',2],['parz','Più o meno',5],['no','No',8]]},
 {id:'carbur',ch:'mob',t:'Di solito il serbatoio dell’auto è…',o:[['pieno','Sopra la metà',2],['basso','Spesso in riserva',6],['na','Non ho l’auto',5]]},
 {id:'aiuto',ch:'mob',t:'In casa c’è chi non può camminare a lungo (anziani, bimbi piccoli, disabilità)?',h:'Non cambia il voto della casa in sé: serve a darti un piano adatto.',o:[['no','No',3],['si','Sì: serve un piano su misura',5]]}];
QNEW.forEach(q=>{if(!QBY[q.id]){Q.push(q);QBY[q.id]=q;}});
Object.assign(FIND_LABEL,{serratura:'Serratura',portafin:'Portefinestre',retro:'Porta sul retro',appigli:'Appigli sui muri',garage:'Garage',allarme:'Allarme e telecamere'});
Object.assign(SAMPLE,{anno:'n1980',rifugio:'quasi',serratura:'norm',spioncino:'spio',portafin:'si',retro:'norm',videosorv:'parte',appigli:'qualche',estintore:'uno',farmaci:'nn',contanti:'poco',numeri:'no',ritrovo:'vago',powerbank:'auto',zainofuga:'no',carbur:'basso',aiuto:'no'});
/* foto accanto alle domande */
const _vDomandeP=vDomande;vDomande=function(){_vDomandeP();try{document.querySelectorAll('#vv .q').forEach(div=>{const b=div.querySelector('[data-q]');const id=b&&b.dataset.q;const k=QPHOTO[id];const ph=k&&S.photos[k];
    if(ph&&!div.querySelector('.qph'))div.querySelector('label').insertAdjacentHTML('afterend',`<div class="qph"><img src="${ph.url}" alt=""><span>La tua foto: ${esc((PHOTO_SLOTS.find(x=>x[0]===k)||[0,''])[1])}. Guardala e scegli la risposta.</span></div>`);});}catch(e){}};
/* foto: titoli "fuori" e "dentro" */
const _vFotoP=vFoto;vFoto=function(){_vFotoP();try{const sh=document.querySelector('#vv .shots');if(!sh||sh.dataset.g)return;sh.dataset.g=1;const L=[...sh.children];
  if(L.length>=7){L[0].insertAdjacentHTML('beforebegin','<div class="shg">🏠 Fuori</div>');L[4].insertAdjacentHTML('beforebegin','<div class="shg">🚪 Dentro <small>(facoltative: più foto, consigli più precisi)</small></div>');}
  const h=document.querySelector('#vv h2');if(h)h.textContent='Fotografa la casa, stanza per stanza';const p=h&&h.nextElementSibling;if(p)p.textContent='Fino a 7 foto: 4 da fuori e 3 da dentro. Persone, targhe e oggetti di valore vengono ignorati. Le foto restano sul telefono e non vengono salvate.';}catch(e){}};
/* piano d'azione nel risultato */
const ADV={anno:{bad:['v1980','ns'],best:'n2010',t:'Fai controllare porte e finestre: nelle case più vecchie sono il punto debole',c:0,cat:'serrament'},
 rifugio:{bad:['quasi','no'],best:'si',t:'Scegli una stanza al piano alto e metti una porta robusta con chiave',c:350,cat:'port|serrament|fabbr'},
 serratura:{bad:['dop','norm','ns'],best:'cil',t:'Cambia il cilindro con uno europeo antiscasso + defender',c:150,cat:'fabbr|ferr|sicur'},
 spioncino:{bad:['no','spio'],best:'video',t:'Spioncino digitale o videocitofono',c:90,cat:'elettr|sicur'},
 portafin:{bad:['si'],best:'prot',t:'Grate apribili o tapparelle rinforzate sulle portefinestre',c:700,cat:'serrament|ferr|fabbr'},
 retro:{bad:['norm'],best:'blind',t:'Rinforza la porta sul retro: barra trasversale o porta blindata',c:450,cat:'port|fabbr|serrament'},
 videosorv:{bad:['no','parte'],best:'tutto',t:'Luci con sensore e una telecamera sugli angoli nascosti del giardino',c:120,cat:'elettr|sicur'},
 appigli:{bad:['qualche','molti'],best:'no',t:'Sposta bidoni, scale e cataste lontano dai muri; pota i rami bassi',c:0},
 estintore:{bad:['uno','no'],best:'entrambi',t:'Estintore da 6 kg + rilevatori di fumo e gas',c:70,cat:'ferr|sicur|antincend'},
 farmaci:{bad:['7','0'],best:'30',t:'Chiedi al medico di avere sempre un mese di scorta dei farmaci abituali',c:0},
 contanti:{bad:['poco','no'],best:'si',t:'Tieni 200 € in tagli piccoli in un posto sicuro',c:0},
 numeri:{bad:['no'],best:'si',t:'Scrivi su un foglio i numeri importanti e mettilo nello zaino',c:0},
 ritrovo:{bad:['vago','no'],best:'si',t:'Decidete un punto di ritrovo e un parente di riferimento fuori zona',c:0},
 powerbank:{bad:['no','auto'],best:'si',t:'Due powerbank sempre carichi o un pannellino solare',c:40,cat:'elettr'},
 zainofuga:{bad:['parz','no'],best:'si',t:'Prepara lo zaino 72 ore: acqua, torcia, radio, documenti, farmaci',c:80,cat:'ferr'},
 carbur:{bad:['basso'],best:'pieno',t:'Fai il pieno quando arrivi a metà serbatoio',c:0},
 aiuto:{bad:['si'],best:null,t:'Piano su misura: chi aiuta chi, ausili pronti, medico e vicini informati',c:0}};
function planItems(){const A=S.answers,out=[];const base=computeScore(A,S.zone).idx;const g=(q,v)=>v==null?0:Math.max(0,Math.round((base-computeScore({...A,[q]:v},S.zone).idx)*100)/100);
  Object.entries(ADV).forEach(([q,a])=>{if(a.bad.includes(A[q]))out.push({q,t:a.t,c:a.c,cat:a.cat,gain:a.best?g(q,a.best):.05,ch:QBY[q].ch});});
  const seen=new Set();UPG.slice().sort((x,y)=>x.cost-y.cost).forEach(u=>{if(!QBY[u.q]||seen.has(u.q))return;const r0=risk(u.q,A[u.q]),r1=risk(u.q,u.v);if(r0==null||r1==null||r1>=r0)return;seen.add(u.q);
    out.push({q:u.q,t:u.name+(u.note?' — '+u.note:''),c:u.cost,cat:u.sp?({ferr:'ferr',sic:'sicur|fabbr|port',sol:'energ|solar|fotov'}[u.sp]):null,gain:g(u.q,u.v),ch:QBY[u.q].ch});});
  return out.filter(x=>x.gain>0||x.c===0).sort((a,b)=>(b.gain/Math.max(30,b.c))-(a.gain/Math.max(30,a.c)));}
function planSp(cat){if(!cat)return null;const re=new RegExp(cat,'i');const R=S.zone&&S.zone.real;const L=Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&SPONSORS[k]&&re.test((SP_CAT[k]||'')+' '+SPONSORS[k].name));
  if(!L.length)return null;if(R)L.sort((a,b)=>trM(R.lat,R.lon,a[1].lat,a[1].lon)-trM(R.lat,R.lon,b[1].lat,b[1].lon));return L[0][0];}
function planHTML(){const L=planItems();if(!L.length)return'';const grp=[['🆓 Gratis, da fare oggi',x=>x.c===0],['💶 Sotto i 200 €',x=>x.c>0&&x.c<200],['🏗️ Investimenti',x=>x.c>=200]];
  const tot=L.reduce((a,x)=>a+x.gain,0);
  return`<div class="panel plan"><h3>📋 Il tuo piano d’azione</h3><p class="muted" style="font-size:13px;margin:2px 0 8px">${L.length} cose da fare, in ordine di efficacia. Tutte insieme: indice più basso di circa <b>${fmtI(Math.min(tot,S.result.idx-1))}</b> punti.</p>
   ${grp.map(([n,f])=>{const G2=L.filter(f).slice(0,6);if(!G2.length)return'';return`<div class="plg"><b>${n}</b>${G2.map(x=>{const sp=planSp(x.cat);return`<div class="pli"><span class="plc">${x.c?'≈ '+x.c.toLocaleString('it-IT')+' €':'0 €'}</span><div><span>${esc(x.t)}</span><small>${CHAPTERS.find(c=>c.id===x.ch).name}${x.gain>=.05?` · indice −${fmtI(x.gain)}`:''}</small>${sp?`<button class="btn small" data-plsp="${sp}">⭐ Chiedi a ${esc(SPONSORS[sp].name)}</button>`:''}</div></div>`;}).join('')}</div>`;}).join('')}
   <p class="muted" style="font-size:12px;margin-top:6px">Costi indicativi. Gli sponsor della tua zona ti fanno il preventivo.</p></div>`;}
const _vRisP=vRisultato;vRisultato=function(){_vRisP();try{if(!S.result)return;const t=document.querySelector('#vv .panel.paper');const h=planHTML();if(!t||!h)return;t.insertAdjacentHTML('afterend',h);
  document.querySelectorAll('[data-plsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.plsp,S.zone));}catch(e){console.warn('piano',e);}};
/* il Radio Operatore sa del nuovo questionario */
</script>
<script>
/* =========================================================
   IA VERA, GOOGLE "APERTA/CHIUSA", INVITI, ELIMINA ACCOUNT
   ========================================================= */
/* IA: passa dalla funzione sicura su Supabase (la chiave non è nell'app) */
const _askAIo=askAI;
askAI=async function(system,messages){const sb=typeof SB!=='undefined'&&SB;
  if(sb&&S.user){const{data,error}=await sb.functions.invoke('zsh-api',{body:{action:system===VISION_PROMPT?'vision':'chat',system,messages}});
    if(error)throw error;const d=typeof data==='string'?JSON.parse(data):data;if(d&&d.error)throw new Error(d.error.message||d.error);
    return(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();}
  throw new Error('Accedi per usare l’IA');};
/* Google: l'attività è ancora aperta? (solo quando qualcuno apre la scheda) */
async function zPlace(name,ll){if(!ll||typeof SB==='undefined'||!SB||!S.user)return null;const k='zsh_pl_'+name+'|'+ll.map(v=>v.toFixed(4)).join(',');
  try{const c=JSON.parse(localStorage.getItem(k)||'null');if(c&&Date.now()-c.t<30*864e5)return c.d;}catch(e){}
  try{const{data,error}=await SB.functions.invoke('zsh-api',{body:{action:'place',name,lat:ll[0],lon:ll[1]}});if(error)return null;const d=typeof data==='string'?JSON.parse(data):data;if(!d||d.error)return null;
    try{localStorage.setItem(k,JSON.stringify({t:Date.now(),d}));}catch(e){}return d;}catch(e){return null;}}
const _fillOnlineG=fillOnline;fillOnline=async function(card,b){await _fillOnlineG(card,b);const box=card.querySelector('[data-online]');if(!box)return;
  const g=await zPlace(b.name,b.ll);if(!g||!g.found||!document.body.contains(box))return;
  const st=g.status==='CLOSED_PERMANENTLY'?'<b style="color:#d7263d">⛔ Chiusa definitivamente secondo Google</b>':g.status==='CLOSED_TEMPORARILY'?'<b style="color:#e2702d">⏸ Chiusa temporaneamente secondo Google</b>':`<b style="color:#2e7d4a">✅ In attività secondo Google</b>${g.openNow===true?' · aperta ora':g.openNow===false?' · chiusa ora':''}`;
  box.insertAdjacentHTML('afterbegin',`<div class="onl"><span>🔎</span><div>${st}${g.rating?`<br><small>⭐ ${String(g.rating).replace('.',',')} su Google (${g.reviews||0} recensioni)</small>`:''}</div></div>`);
  if(g.status==='CLOSED_PERMANENTLY'){try{await SB.from('poi_reports').insert({name:b.name,lat:b.ll[0],lon:b.ll[1],motivo:'google: chiusa definitivamente'});}catch(e){}
    window.ZMYHID.push(b.name);try{localStorage.setItem('zsh_myhid',JSON.stringify(window.ZMYHID));}catch(e){}window.ZHID=[...new Set([...window.ZHID,b.name])];zApplyHidden();}};
/* INVITI: link personale, chi entra col tuo link è collegato a te */
(function(){try{const p=new URLSearchParams(location.search).get('invito');if(p&&/^[0-9a-f]{8}$/i.test(p)){localStorage.setItem('zsh_inv',p.toLowerCase());history.replaceState(null,'',location.pathname);}}catch(e){}})();
const myCode=()=>S.user&&S.user.id?S.user.id.slice(0,8):null;
const invLink=()=>location.origin+'/?invito='+myCode();
/* messaggio d'invito con le istruzioni: aprire in Safari/Chrome, creare l'account, mettere l'app sulla Home */
const invTxt=()=>`🧟 Ti invito su ZombieSafeHouse: scopri quanto resisterebbe casa tua a un’apocalisse zombie (e come renderla più sicura davvero).

1) Apri il link con Safari (iPhone) o Chrome (Android), non dentro WhatsApp: ${invLink()}
2) Crea l’account: così siamo collegati e giochiamo nello stesso mondo
3) Fai la valutazione della tua casa
4) iPhone: Condividi → Aggiungi alla schermata Home (Android: menu ⋮ → Installa app)`;
const _zSyncInv=zSyncProfile;zSyncProfile=async function(force){await _zSyncInv(force);try{const inv=localStorage.getItem('zsh_inv');if(!inv||!S.user||inv===myCode()||localStorage.getItem('zsh_inv_ok'))return;
  const{error}=await SB.from('profili_pubblici').update({invitato_da:inv}).eq('user_id',S.user.id);if(!error)localStorage.setItem('zsh_inv_ok','1');}catch(e){}};
async function inviteSheet(){if(!S.user){toast('Accedi per avere il tuo link di invito');return;}let L=[];try{const{data}=await SB.rpc('miei_invitati');L=data||[];}catch(e){}
  G.invCl=G.invCl||[];const ready=L.filter(x=>x.valutato&&!G.invCl.includes(x.nick));
  openSheet('📨 Invita amici e vicini',`<p style="font-weight:400;margin-bottom:10px">Chi entra col tuo link e valuta la sua casa ti fa guadagnare <b>💎 5</b>. Se abita entro 1,5 km diventa uno dei tuoi <b>👥 Vicini veri</b>: nella battaglia la tua abilità diventa più forte.</p>
   <div class="invl"><input readonly value="${esc(invLink())}"><button class="btn small" data-invcp>Copia</button></div>
   <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><button class="btn" data-invsh>📤 Condividi il link</button><a class="btn ghost small" href="https://wa.me/?text=${encodeURIComponent(invTxt())}" target="_blank" rel="noopener">WhatsApp</a></div>
   <h3 style="margin-top:6px">I tuoi invitati (${L.length})</h3>${L.length?L.map(x=>`<div class="tm ${x.valutato?'ok':''}"><span class="tmi">${x.valutato?'✅':'⏳'}</span><div class="tmt"><span><b>@${esc(x.nick)}</b></span><small>${x.valutato?(G.invCl.includes(x.nick)?'Premio già ritirato':'Ha valutato la casa: premio pronto'):'Registrato, deve ancora valutare la casa'}</small></div></div>`).join(''):'<p class="muted">Ancora nessuno: condividi il link!</p>'}
   ${ready.length?`<button class="btn wide alt" data-invcl>🎁 Ritira 💎 ${ready.length*5}</button>`:''}`,card=>{
    card.querySelector('[data-invcp]').onclick=()=>{try{navigator.clipboard.writeText(invLink());toast('Link copiato');}catch(e){}};
    card.querySelector('[data-invsh]').onclick=()=>{if(navigator.share)navigator.share({title:'ZombieSafeHouse',text:invTxt()}).catch(()=>{});else{try{navigator.clipboard.writeText(invLink());toast('Link copiato');}catch(e){}}};
    const c=card.querySelector('[data-invcl]');if(c)c.onclick=()=>{ready.forEach(x=>G.invCl.push(x.nick));if(G.type)G.gems+=ready.length*5;try{saveLocal();}catch(e){}toast(`+💎 ${ready.length*5} dagli inviti`);closeSheet();};});}
/* ELIMINA ACCOUNT (richiesto da Apple e Google) */
function deleteSheet(){openSheet('🗑 Elimina il mio account',`<p style="font-weight:400">Vengono cancellati <b>per sempre</b>: account, salvataggi nel cloud, profilo sulla mappa, inviti. I codici sconto usati restano ai negozi in forma anonima.</p>
   <p style="font-weight:400;margin:10px 0">Per confermare scrivi <b>ELIMINA</b>:</p><input id="delTx" autocomplete="off" style="width:100%;padding:10px;border:3px solid var(--ink);font-size:16px">
   <div class="row" style="gap:8px;margin-top:12px"><button class="btn" data-delok style="background:#d7263d">Elimina definitivamente</button><button class="btn ghost small" data-delno>Annulla</button></div>`,card=>{
   card.querySelector('[data-delno]').onclick=closeSheet;card.querySelector('[data-delok]').onclick=async()=>{if(card.querySelector('#delTx').value.trim().toUpperCase()!=='ELIMINA'){toast('Scrivi ELIMINA per confermare');return;}
     try{const{error}=await SB.rpc('delete_my_account');if(error)throw error;await SB.auth.signOut().catch(()=>{});}catch(e){toast('Non riuscito: '+(e.message||'riprova'));return;}
     try{Object.keys(localStorage).filter(k=>k.startsWith('zsh')).forEach(k=>localStorage.removeItem(k));}catch(e){}closeSheet();toast('Account eliminato');setTimeout(()=>location.reload(),1200);};});}
/* voci di menu */
const _renderMenuI=renderMenu;renderMenu=function(){_renderMenuI();try{const ref=document.querySelector('.dr-user');if(!ref||!S.user||document.querySelector('[data-inv]'))return;
  ref.insertAdjacentHTML('afterend','<button class="mi" data-inv="1"><span>📨</span>Invita amici e vicini</button>');
  const last=[...document.querySelectorAll('#drawer .mi')].pop();(last||ref).insertAdjacentHTML('afterend','<button class="mi" data-delacc="1" style="color:#d7263d"><span>🗑</span>Elimina il mio account</button><a class="mi" href="privacy.html" target="_blank"><span>🔒</span>Privacy</a><a class="mi" href="termini.html" target="_blank"><span>📄</span>Termini d’uso</a>');
  document.querySelector('[data-inv]').onclick=e=>{e.stopPropagation();try{toggleMenu(false);}catch(x){}inviteSheet();};
  document.querySelector('[data-delacc]').onclick=e=>{e.stopPropagation();try{toggleMenu(false);}catch(x){}deleteSheet();};}catch(e){}};
</script>
<script>
/* =========================================================
   "LA TUA CASA": chi ha già una casa valutata non rivede la
   schermata dei nuovi utenti. Trasloco con schermata dedicata.
   ========================================================= */
const _vZonaHome=vZona;
vZona=function(){
  /* trasloco in corso: schermata "La tua nuova casa" */
  if(S.moving&&!S.zone){_vZonaHome();try{const h=document.querySelector('#vv h2');if(h)h.textContent='Dove si trova la casa nuova?';
      const old=S.case&&S.case[0];const p=h&&h.nextElementSibling;
      if(p)p.outerHTML=`<div class="mvnew"><b>🚚 Trasloco${old?` da ${esc(old.address)}`:''}</b><span>Monete, gemme, livello, attrezzi, crediti e amici sono già con te. Trova la casa nuova: il gioco si sposta nel nuovo quartiere vero.</span></div>`;
      const mv=document.getElementById('mvBtn');if(mv)mv.remove();
      if(!document.getElementById('mvUndo'))document.getElementById('vv').insertAdjacentHTML('beforeend','<p style="margin-top:14px"><button class="btn ghost small" id="mvUndo">Annulla: non ho traslocato</button></p>');
      const u=document.getElementById('mvUndo');if(u)u.onclick=()=>{const o=S.case&&S.case[0];if(!o){toast('Scrivi l’indirizzo della casa');return;}const f=document.getElementById('addr');if(f)f.value=o.address;S.moving=0;toast('Riscrivi o conferma il vecchio indirizzo e premi Analizza');};}catch(e){}return;}
  /* casa già valutata: la sua scheda */
  if(S.zone&&S.result&&!S.vzNew){const z=S.zone,R=S.result,[g,col]=grade(R.idx),H=z.real&&z.real.house;
    $('#vv').innerHTML=`<div class="myhome">
      <div class="mh-top"><div class="mh-ring">${ring(R.idx,110)}</div><div><span class="bzc-cat">La tua casa</span><h2>${esc(z.address)}</h2>
        <p><b style="color:${col}">${g}</b> · resisti <b>${nightsFor(R.idx)} notti</b></p>${H?`<small>${esc(KIND_N[H.kind]||'Casa')} · ${H.levels} ${H.levels===1?'piano':'piani'} · ≈ ${H.len}×${H.wid} m</small>`:''}</div></div>
      <div class="mh-act">
        <button data-mh="3"><span>📋</span>Risultato e piano d’azione</button>
        <button data-mh="2"><span>✏️</span>Aggiorna le risposte</button>
        <button data-mh="1"><span>📷</span>Nuove foto</button>
        <button data-mh="pos"><span>📍</span>Correggi la posizione</button>
        <button data-mh="game"><span>🧟</span>Difendila nel gioco</button>
        <button data-mh="move"><span>🚚</span>Ho cambiato casa</button></div></div>
     <div id="rmHwrap">${rmBox('rmH')}</div>
     ${z.real?terrSummary(z.real):''}`;
    document.querySelectorAll('[data-mh]').forEach(b=>b.onclick=async()=>{const k=b.dataset.mh;
      if(k==='move')return moveSheet();if(k==='game')return go('orda');
      if(k==='pos'){const R0=z.real;const ok=await trPick({lat:R0?R0.lat:45.4,lon:R0?R0.lon:10.6,acc:null,label:z.address,src:'pin'});if(!ok)return;
        S.geo={lat:ok.lat,lon:ok.lon,acc:ok.acc,addr:ok.label,src:ok.src};b.disabled=true;b.innerHTML='<span class="spin"></span> Aggiorno la zona…';
        try{S.zone=await analyzeZone(ok.label);S.answers.zona=S.zone.type;S.result=computeScore(S.answers,S.zone);HQ.map=null;toast('📍 Posizione aggiornata');}catch(e){toast('Non riuscito: riprova');}vZona();return;}
      S.step=+k;if(k==='2')S.chapter=0;renderValuta();});
    try{rmMount(document.getElementById('rmH'),z.address);}catch(e){}return;}
  _vZonaHome();};
/* dopo l'analisi della casa nuova il trasloco è finito */
const _azMove=analyzeZone;analyzeZone=async function(a){const z=await _azMove(a);if(S.moving)setTimeout(()=>{S.moving=0;},0);return z;};
/* il trasloco porta alla schermata dedicata */
const _doMoveH=doMove;doMove=function(P){S.moving=Date.now();_doMoveH(P);};
</script>
<script>
const _renderValutaH=renderValuta;renderValuta=function(){_renderValutaH();try{if(S.step!==0)return;const b=app.querySelector('.page .bubble');if(!b)return;
  if(S.moving&&!S.zone)b.innerHTML='<b>Nuova casa, nuovo quartiere!</b> Dimmi dove ti sei trasferito: rifaccio la mappa e il gioco intorno a te.';
  else if(S.zone&&S.result)b.innerHTML=`<b>Bentornato${S.user?' @'+esc(S.user.nick):''}!</b> Questa è la tua casa: da qui la rivedi, la aggiorni o, se ti sei trasferito, cambi casa.`;}catch(e){}};
</script>
<script>
/* =========================================================
   COME SI GIOCA: fumetto a 7 tavole da sfogliare, con prove
   interattive. Parte da solo la prima volta nel Gioco.
   Le regole complete restano in fondo ("Tutte le regole").
   ========================================================= */
const HOW=[
 {t:'La tua casa vera',ic:'🏠',p:'Valuti la <b>casa dove abiti</b>: porta, finestre, luci, vicini. Diventa la tua casa nel <b>mondo unico</b>, disegnata com’è davvero, con il suo indice di sicurezza.',
  demo:()=>hwChips([['📷','Valuta la casa'],['🛡️','Scudo 0–5'],['🌍','Casa nel mondo']])},
 {t:'L’orda del mondo',ic:'🧟',p:'Ogni giorno alle <b>9:00</b> e alle <b>21:00</b> un’orda attacca <b>tutte le case</b>, da sola. Ogni casa tiene o viene sfondata: la tua <b>% di tenuta</b> la vedi in Orda e nella pagina di ogni casa.',
  demo:()=>hwChips([['🛡️','Prepara le case'],['🧮','Perché questa %'],['🎬','Guarda l’assalto']])},
 {t:'Il fronte',ic:'🗺️',p:'La mappa vera di casa tua, con gli zombie che arrivano sulle <b>strade vere</b>: in <b>salita</b> rallentano, in <b>discesa</b> accelerano. Meteo e notte cambiano la marcia. Tocca uno zombie per vedere cosa lo ferma.',
  demo:()=>hwChips(Object.values(typeof ZSP!=='undefined'?ZSP:{}).slice(0,6).map(z=>[z.ic,z.n]))},
 {t:'Fortificazioni e Mattoni',ic:'🧱',p:'Con i <b>🧱 Mattoni</b> compri le <b>fortificazioni</b> di ogni casa (fino a 3 livelli) e la potenzi (+12 di difesa per livello). In alto trovi le più utili contro gli zombie e il meteo di <b>quella</b> casa.',
  demo:()=>hwChips(Object.values(typeof ZDEF!=='undefined'?ZDEF:{}).slice(0,6).map(d=>[d[0],d[1]]))},
 {t:'Alleati e superstiti',ic:'🤝',p:'Nei <b>👥 Superstiti</b> trovi la Piazza, la squadra, gli alleati e la classifica. Chiedi aiuto per la prossima orda, manda rinforzi, regala o presta Mattoni.',
  demo:()=>hwChips([['💬','Piazza'],['🛡️','Squadra'],['🏅','Classifica']])},
 {t:'Premi e missioni',ic:'🎁',p:'Dopo ogni orda <b>riscatti</b> i premi. In Orda ci sono la ruota, il gratta e vinci, il premio del giorno e le <b>missioni di oggi</b>. I Mattoni li decide il server: al massimo 300 al giorno.',
  demo:()=>hwChips([['🎡','Ruota'],['🎟️','Gratta e vinci'],['🎁','Premio del giorno'],['🎯','Missioni']])},
];
function hwChips(L){return`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${L.map(([i,t])=>`<span style="border:2px solid var(--ink);background:#fff;padding:5px 9px;font-weight:700;font-size:13px">${i} ${esc(t)}</span>`).join('')}</div>`;}
function howHTML(i){const h=HOW[i];return`<div class="hw" data-hi="${i}"><div class="hw-dots">${HOW.map((_,k)=>`<i class="${k===i?'on':k<i?'done':''}"></i>`).join('')}</div>
  <div class="hw-panel"><div class="hw-num">${i+1}/${HOW.length}</div><div class="hw-ic">${h.ic}</div><h3>${h.t}</h3><p>${h.p}</p><div class="hw-demo">${h.demo()}</div></div>
  <div class="hw-nav"><button class="btn ghost small" data-hprev ${i?'':'style="visibility:hidden"'}>← Indietro</button>${i<HOW.length-1?`<button class="btn" data-hnext>Avanti →</button>`:`<button class="btn" data-hplay>🧟 Vai all’Orda</button>`}</div>
  <button class="btn small ghost wide" data-hall style="margin-top:10px">📚 Tutte le regole</button>${i===HOW.length-1?'':'<button class="hw-skip" data-hskip>Salta: so già giocare</button>'}</div>`;}
openRules=function(start){let i=Math.max(0,Math.min(HOW.length-1,start||0));
  openSheet('📖 Come si gioca',howHTML(i),card=>{const draw=()=>{const w=card.querySelector('.hw');w.outerHTML=howHTML(i);bind();};
    const bind=()=>{const w=card.querySelector('.hw');const h=HOW[i];if(h.bind)h.bind(w);
      const n=w.querySelector('[data-hnext]');if(n)n.onclick=()=>{i++;draw();};const p=w.querySelector('[data-hprev]');if(p)p.onclick=()=>{i--;draw();};
      const s=w.querySelector('[data-hskip]');if(s)s.onclick=()=>{try{G.howSeen=1;}catch(e){}closeSheet();};
      const pl=w.querySelector('[data-hplay]');if(pl)pl.onclick=()=>{try{G.howSeen=1;}catch(e){}closeSheet();go('orda');};
      const a=w.querySelector('[data-hall]');if(a)a.onclick=()=>{try{G.howSeen=1;}catch(e){}openSheet('📚 Tutte le regole',rulesHTML(),c2=>{const b=c2.querySelector('[data-tutagain]');if(b)b.onclick=()=>{G.tutDone=false;toast('Il tutorial ripartirà alla prossima battaglia');closeSheet();};});};
      let x0=null;w.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
      w.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)<60||e.target.closest('.hw-demo'))return;if(dx<0&&i<HOW.length-1){i++;draw();}else if(dx>0&&i>0){i--;draw();}},{passive:true});};
    bind();});};
/* anche dalla pagina "Come funziona" */
window.rulesSheet=()=>openRules(0);
/* la prima volta nel gioco parte da sola */
</script>
<script>
/* =========================================================
   MANUALE COMPLETO DEL GIOCO (capitoli apribili)
   I numeri arrivano dai dati del gioco: restano sempre giusti.
   ========================================================= */
function manualHTML(){const sec=(id,t,body,open)=>`<details class="man" ${open?'open':''} id="man-${id}"><summary>${t}</summary><div class="man-b">${body}</div></details>`;
  const tab=(rows,cols)=>`<div class="mtab">${rows.map(r=>`<div>${r.map((c,i)=>i===0?`<span>${c}</span>`:i===1?`<b>${c}</b>`:`<small>${c}</small>`).join('')}</div>`).join('')}</div>`;
  /* Fase 3c: tolti i capitoli del vecchio gioco a carte/notti; le tabelle vengono dai dati dell'app (ZSP, ZDEF, EVN di p47) */
  const ZS=typeof ZSP!=='undefined'?ZSP:{},ZD=typeof ZDEF!=='undefined'?ZDEF:{},EV=typeof EVN!=='undefined'?EVN:{};
  const S1=sec('case','🏠 Le tue case e le fortificazioni',`<p>Ogni casa ha la sua <b>pagina</b>: il disegno della casa, la <b>% di tenuta</b> alla prossima orda (tocca <b>🧮 Perché</b> per il conto) e le fortificazioni.</p>
    <p><b>⬆️ Potenzia:</b> +12 di difesa per livello. <b>🛡️ Prepara le case:</b> +15 per la prossima orda. <b>Fortificazioni:</b> si comprano con i 🧱 Mattoni, fino a 3 livelli ciascuna; in alto trovi le più utili contro gli zombie e il meteo di quella casa.</p>
    ${tab(Object.entries(ZD).map(([k,d])=>{const z=Object.values(ZS).filter(x=>x.dk===k).map(x=>x.ic+' '+x.n);return[d[0],d[1],k==='trappole'?'frenano i 🧟 vaganti':z.length?'ferma: '+z.join(', '):'difesa in più'];}))}`);
  const S2=sec('fronte','🗺️ Il fronte e gli zombie',`<p>In 🧟 Orda il <b>fronte</b> è la mappa vera di casa tua: gli zombie arrivano sulle strade vere. Strade <b style="color:#2f9e44">verdi</b> in piano, <b style="color:#e8590c">arancio</b> in salita verso casa (zombie più lenti), <b style="color:#d7263d">rosse</b> in discesa (più veloci). Tocca uno zombie per vedere cosa lo ferma; lo <b>✨ zombie d’oro</b> va acchiappato. È una simulazione: l’esito dell’orda lo calcola il server.</p>
    ${tab([['🧟','Vagante','il più comune: lo frenano le 🪤 trappole'],...Object.values(ZS).map(z=>[z.ic,z.n,z.why+(ZD[z.dk]?' · si ferma con '+ZD[z.dk][0]+' '+ZD[z.dk][1]:'')])])}
    <p style="margin-top:8px"><b>Il meteo vero</b> della tua zona cambia l’orda:</p>${tab(Object.values(EV).map(e=>[e[0],e[1],e[2]]))}`);
  const S3=sec('premi','🎁 Premi e missioni',`<p>Dopo ogni orda tocca <b>Riscatta</b>: arrivano Mattoni, giri di ruota e biglietti del gratta e vinci. In 🧟 Orda, nel riquadro <b>Premi e fortuna</b>, trovi la 🎡 ruota, il 🎟️ gratta e vinci, il 🎁 premio del giorno e il 🫙 barattolo; sotto, le <b>🎯 missioni di oggi</b> (il pulsante “Vai” ti porta dove si fanno).</p>
    <p>Giri e biglietti si guadagnano riscattando l’orda, completando le missioni e aiutando gli alleati. I 🧱 Mattoni li decide il server: al massimo 300 al giorno.</p>`);
  const S15=sec('community','👥 Community e inviti',`<p><b>Mappa della community:</b> se accetti, gli altri vedono il tuo nickname, l’indice della casa e il livello, in una posizione approssimata di circa 200 m. Mai l’indirizzo.</p>
    <p><b>Inviti</b> (menu ☰): chi entra col tuo link e valuta la casa ti dà 💎 5.</p>`);
  const S16=sec('vera','🔄 Casa vera ⇄ gioco',`<p>Quello che fai per la casa vera ti rende più forte nel gioco: lo <b>Scudo della casa vera</b> (0–5) cresce con la valutazione e le migliorie vere e dà +2 di difesa a tutte le tue case per ogni livello; i <b>Crediti Casa Vera</b> arrivano da sconti e preventivi usati davvero.</p>
    <p><b>Ho cambiato casa</b> (menu ☰): la casa vecchia resta nell’elenco delle tue case passate, ricevi un rimborso (che diventa Mattoni) e poi valuti la casa nuova. Il rimborso vale una volta ogni 30 giorni.</p>
    <p><b>Salvataggi:</b> con l’accesso fatto la partita è sempre allineata tra iPhone, Mac e computer.</p>`);
  return`<div class="manual"><p class="muted" style="font-size:13px;margin:0 0 8px">Tocca un capitolo per aprirlo.</p>${[S1,S2,S3,S15,S16].join('')}</div>`;}
var rulesHTML=function(){return manualHTML();};  /* le regole sono le istruzioni complete (con i capitoli aggiunti dagli altri moduli) */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-howagain]');if(!b)return;openRules(0);});
</script>
<script>
/* =========================================================
   NIENTE RECENSIONI INVENTATE
   - le stelle generate a caso sono tolte ovunque
   - si mostrano solo recensioni verificate (da codice usato
     in negozio, tabella reviews) quando ci sono
   - il pulsante porta alle recensioni vere su Google Maps
     (link esterno: consentito)
   - controllo Google "aperta/chiusa" spento: le condizioni di
     Google vietano i suoi dati in app con mappe non Google
   ========================================================= */
CONFIG.GOOGLE_STATUS=false;
rvGen=function(){return[];};
try{if(S.rv)Object.keys(S.rv).forEach(k=>{S.rv[k]=(S.rv[k]||[]).filter(x=>x&&x.mine);});}catch(e){}
rvLine=function(key){const l=rvList(key,0,0);if(!l.length)return'<small class="muted">Nessuna recensione verificata, per ora</small>';const a=rvAvg(l);return`${rvStars(a)} <b>${a.toFixed(1).replace('.',',')}</b> <small class="muted">(${l.length} verificate)</small>`;};
rvBtn=function(key,name){const town=((S.zone&&S.zone.address)||'').split(',').slice(-1)[0]||'';return`<a class="btn small ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((name||'')+' '+town)}" target="_blank" rel="noopener">⭐ Recensioni su Google</a>`;};
const _zPlaceOff=zPlace;zPlace=async function(name,ll){if(!CONFIG.GOOGLE_STATUS)return null;return _zPlaceOff(name,ll);};
</script>
<script>
/* =========================================================
   VIVERE QUI e VACANZA IN ZONA con strutture VERE
   (OpenStreetMap: negozi, servizi, fermate, stazione, scuole,
   verde e sport entro 1,5 km; hotel, B&B, agriturismi,
   campeggi, ristoranti e cose da vedere fino a 8 km).
   Prezzi e annunci: solo da agenzie partner (per ora nessuno).
   Recensioni: solo verificate + link a Google.
   ========================================================= */
const ST_CAT=t=>{const s=t.shop,a=t.amenity,tu=t.tourism,h=t.historic,l=t.leisure;
  if(t.highway==='bus_stop')return['bus','Fermata bus','🚏'];if(t.railway==='station'||t.railway==='halt')return['treno','Stazione','🚆'];
  if(a==='school')return['scuola','Scuola','🏫'];if(a==='kindergarten')return['scuola','Scuola dell’infanzia','🧸'];if(a==='library')return['scuola','Biblioteca','📚'];
  if(a==='pharmacy')return['salute','Farmacia','💊'];if(a==='doctors'||a==='clinic')return['salute','Medico','🩺'];if(a==='dentist')return['salute','Dentista','🦷'];
  if(['park','playground'].includes(l))return['verde',l==='park'?'Parco':'Parco giochi','🌳'];if(['pitch','sports_centre','fitness_centre','swimming_pool'].includes(l))return['sport',{pitch:'Campo sportivo',sports_centre:'Centro sportivo',fitness_centre:'Palestra',swimming_pool:'Piscina'}[l],'⚽'];
  if(['hotel','motel'].includes(tu))return['hotel','Hotel','🏨'];
  if(['guest_house','apartment','hostel','chalet'].includes(tu))return(t.agriturismo==='yes'||t.guest_house==='farm'||/agritur/i.test(t.name||''))?['agri','Agriturismo','🌾']:['bb',tu==='hostel'?'Ostello':tu==='apartment'?'Appartamento vacanze':'B&B / Affittacamere','🛏️'];
  if(['camp_site','caravan_site'].includes(tu))return['camp','Campeggio','⛺'];
  if(['attraction','museum','viewpoint','gallery','zoo','theme_park'].includes(tu)||['castle','monument','ruins','fort','archaeological_site'].includes(h))return['attr',{museum:'Museo',viewpoint:'Panorama',castle:'Castello',ruins:'Rovine',monument:'Monumento'}[tu]||{castle:'Castello',ruins:'Rovine',monument:'Monumento',fort:'Forte',archaeological_site:'Sito archeologico'}[h]||'Da vedere','🏛️'];
  if(a==='restaurant'||a==='fast_food')return['risto',/pizz/i.test((t.cuisine||'')+(t.name||''))?'Pizzeria':a==='fast_food'?'Fast food':'Ristorante','🍝'];
  if(a==='bar'||a==='cafe'||a==='pub')return['bar','Bar','☕'];if(a==='ice_cream')return['bar','Gelateria','🍦'];
  if(['supermarket','convenience','greengrocer','butcher','deli','dairy'].includes(s))return['spesa',{supermarket:'Supermercato',convenience:'Alimentari',greengrocer:'Frutta e verdura',butcher:'Macelleria',deli:'Gastronomia',dairy:'Latteria'}[s],'🛒'];
  if(s==='bakery'||s==='pastry')return['spesa',s==='bakery'?'Panificio':'Pasticceria','🥖'];
  if(a==='bank')return['servizi','Banca','🏦'];if(a==='post_office')return['servizi','Ufficio postale','📮'];if(a==='townhall')return['servizi','Municipio','🏛️'];if(a==='fuel')return['servizi','Distributore','⛽'];
  if(s==='newsagent'||s==='kiosk')return['negozi','Edicola','📰'];if(s==='hairdresser'||s==='beauty')return['negozi',s==='hairdresser'?'Parrucchiere':'Estetista','💈'];
  if(['hardware','doityourself','locksmith','electrical','paint'].includes(s))return['negozi','Negozio per la casa','🔧'];
  if(s)return['negozi',({clothes:'Abbigliamento',shoes:'Scarpe',florist:'Fiori',optician:'Ottico',pet:'Animali',books:'Libreria',tobacco:'Tabaccheria',mobile_phone:'Telefonia',car_repair:'Officina',furniture:'Arredamento',gift:'Regali',jewelry:'Gioielleria',chemist:'Drogheria',stationery:'Cartoleria'})[s]||'Negozio','🛍️'];
  return null;};
async function zStruct(z){if(z._st)return z._st;let lat,lon;if(z.real){lat=z.real.lat;lon=z.real.lon;}else{const w=await trWhere(z.address);lat=w.lat;lon=w.lon;}
  const key='zsh_st1_'+lat.toFixed(4)+'_'+lon.toFixed(4);try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.t<7*864e5){z._st=c.d;return c.d;}}catch(e){}
  const q=`[out:json][timeout:30];(nwr["shop"](around:1500,${lat},${lon});nwr["amenity"~"^(bar|cafe|pub|ice_cream|restaurant|fast_food|pharmacy|doctors|dentist|clinic|bank|post_office|school|kindergarten|library|fuel|townhall)$"](around:1500,${lat},${lon});node["highway"="bus_stop"](around:1000,${lat},${lon});nwr["leisure"~"^(park|playground|pitch|sports_centre|fitness_centre|swimming_pool)$"](around:1500,${lat},${lon}););out center tags;nwr["railway"~"^(station|halt)$"](around:12000,${lat},${lon});out center tags 6;(nwr["tourism"~"^(hotel|motel|guest_house|hostel|apartment|chalet|camp_site|caravan_site|attraction|museum|viewpoint|gallery|zoo|theme_park)$"](around:8000,${lat},${lon});nwr["historic"~"^(castle|monument|ruins|fort|archaeological_site)$"](around:8000,${lat},${lon});nwr["amenity"~"^(restaurant)$"](around:5000,${lat},${lon}););out center tags;`;
  const els=await trOverpass(q,25000);const items=[],seen=new Set();
  els.forEach(e=>{const t=e.tags||{};if(t.shop==='vacant'||Object.keys(t).some(x=>/^(disused|was|abandoned):/.test(x)))return;const c=ST_CAT(t);if(!c)return;
    const la=e.lat!=null?e.lat:(e.center&&e.center.lat),lo=e.lon!=null?e.lon:(e.center&&e.center.lon);if(la==null)return;
    if(!t.name&&!['bus','verde','sport'].includes(c[0]))return;const id=e.type[0]+e.id;if(seen.has(id))return;seen.add(id);
    if(window.ZHID&&t.name&&window.ZHID.includes(t.name))return;
    items.push({g:c[0],cat:c[1],ic:c[2],name:t.name||c[1],lat:+la.toFixed(6),lon:+lo.toFixed(6),d:Math.round(trM(lat,lon,la,lo)),tel:t.phone||t['contact:phone']||'',web:t.website||t['contact:website']||'',stars:t.stars||''});});
  items.sort((a,b)=>a.d-b.d);const d={lat,lon,items:items.slice(0,700),t:Date.now()};try{localStorage.setItem(key,JSON.stringify({t:Date.now(),d}));}catch(e){}z._st=d;return d;}
const walk=m=>Math.max(1,Math.round(m/75));
function stLive(z,D){const I=D.items,R=z.real;const near=(g,f)=>I.filter(x=>x.g===g&&(!f||f(x)));const n1=(g,m)=>near(g,x=>x.d<=m).length;const fd=g=>{const x=I.find(y=>y.g===g);return x?x.d:9999;};
  const fac=k=>{const f=R&&R.fac.find(x=>x.k===k);return f?f.d:9999;};const sc=v=>Math.max(5,Math.min(100,Math.round(v)));
  const subs=[['Sanità e farmacie',sc(100-Math.min(fd('salute'),fac('farm'))/25-fac('osp')/90)],['Spesa e negozi',sc(15+n1('spesa',1000)*7+n1('negozi',1000)*2-fd('spesa')/40)],
    ['Trasporti',sc(n1('bus',500)*18+45-fd('treno')/150)],['Scuole',sc(n1('scuola',1500)*22+10)],['Verde e sport',sc((n1('verde',1500)+n1('sport',1500))*12+15)],['Servizi di emergenza',sc(100-fac('cc')/35-fac('vvf')/45)]];
  return{subs,score:Math.round(subs.reduce((t,s)=>t+s[1],0)/subs.length)};}
function stRow(x,i){return`<button class="strow" data-st="${i}"><span>${x.ic}</span><div><b>${esc(x.name)}</b><small>${esc(x.cat)} · ${dist(x.d)} · 🚶 ${walk(x.d)} min</small></div>${spNear(x)?'<i class="tag sp">Sponsor</i>':''}</button>`;}
function spNear(x){return Object.entries(window.SP_GEO||{}).find(([k,g])=>g&&g.lat!=null&&SPONSORS[k]&&trM(g.lat,g.lon,x.lat,x.lon)<40);}
function stBind(z,list){app.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{const x=list[+b.dataset.st];if(!x)return;const sp=spNear(x);if(sp)return sponsorSheet(sp[0],z);
  if(['salute','scuola','servizi','treno','bus','verde','sport'].includes(x.g))lmPoi(x.name,x.cat,x.d,[x.lat,x.lon],true);else bizSheet({i:'st'+b.dataset.st,ic:x.ic,name:x.name,cat:x.cat,d:x.d,ll:[x.lat,x.lon],tel:x.tel,web:x.web,cand:false},z);});}
renderVivere=async function(){const z=S.reZone||S.zone;const vac=S.rvMode==='vacanza';
  const head=`<div class="maphero">${vivereHero()}<div class="mh-t"><h2>${vac?'Vacanza in zona':'Vivere qui'}</h2><div class="caption">${vac?'Dove dormire, mangiare e cosa vedere: posti veri':'Servizi, negozi, scuole e trasporti veri della zona'}</div></div></div>${zoneSeg()}`;
  const search=`<div class="panel"><label for="reQ" class="disp" style="font-size:20px">Cerca una zona o un indirizzo</label><div class="row" style="margin-top:6px"><input id="reQ" class="field" placeholder="Es. Mantova centro" value="${esc(z?z.address:'')}"><button class="btn small" id="reGo">Cerca</button></div></div>`;
  const bindS=()=>{bindZoneSeg();const g=document.getElementById('reGo');if(g)g.onclick=async()=>{const q=document.getElementById('reQ').value.trim();if(!q)return;g.innerHTML='<span class="spin"></span>';try{S.reZone=await analyzeZone(q);}catch(e){toast('Zona non trovata');}renderVivere();};};
  if(!z){app.innerHTML=head+`<div class="page">${search}<div class="panel moon"><p>Scrivi una zona, oppure valuta prima la tua casa: la tua zona comparirà qui.</p></div>${b2b()}</div>`;bindS();return;}
  app.innerHTML=head+`<div class="page">${search}<div class="panel" id="stBox"><span class="spin"></span> Carico le strutture vere della zona…</div></div>`;bindS();
  let D;try{D=await zStruct(z);}catch(e){document.getElementById('stBox').innerHTML='<p class="notice">Dati della zona non raggiungibili ora: riprova tra poco.</p>';return;}
  if(S.tab!=='mappa')return;const box=document.getElementById('stBox');if(!box)return;
  if(vac){const KS=[['tutti','Tutto'],['hotel','🏨 Hotel'],['bb','🛏️ B&B'],['agri','🌾 Agriturismi'],['camp','⛺ Campeggi'],['risto','🍝 Ristoranti'],['attr','🏛️ Da vedere']];const f=S.vf||'tutti';
    const L=D.items.filter(x=>['hotel','bb','agri','camp','risto','attr'].includes(x.g)&&(f==='tutti'||x.g===f));
    box.outerHTML=`<div class="panel moon"><b class="disp" style="font-size:22px">Vacanza in zona</b><p style="font-weight:400;font-size:14px;margin-top:4px">${D.items.filter(x=>['hotel','bb','agri','camp'].includes(x.g)).length} posti dove dormire, ${D.items.filter(x=>x.g==='risto').length} ristoranti e ${D.items.filter(x=>x.g==='attr').length} cose da vedere fino a 8 km. Tocca per orari, contatti, foto e recensioni su Google.</p></div>
      <div class="chips" style="margin:8px 0">${KS.map(([k,l])=>`<button class="chip ${f===k?'on':''}" data-vf="${k}">${l}</button>`).join('')}</div>
      <div class="panel" style="padding:6px 10px">${L.length?L.slice(0,80).map(x=>stRow(x,D.items.indexOf(x))).join(''):'<p class="muted">Nessun posto di questo tipo nella zona.</p>'}</div>
      <p class="notice" style="margin:10px 0">Dati © OpenStreetMap. Le recensioni dentro l’app sono solo <b>verificate</b> (clienti con codice usato in cassa); per le altre trovi il link alle recensioni su Google.</p>`;
    app.querySelectorAll('[data-vf]').forEach(b=>b.onclick=()=>{S.vf=b.dataset.vf;renderVivere();});stBind(z,D.items);return;}
  const LV=stLive(z,D);const[lab,col]=liveLabel(LV.score);const I=D.items;const first=g=>I.find(x=>x.g===g);
  const ess=[['salute'],['spesa'],['bus'],['treno'],['scuola'],['servizi']].map(([g])=>first(g)).filter(Boolean);
  const groups=[['spesa','🛒 Spesa'],['negozi','🛍️ Negozi'],['bar','☕ Bar e locali'],['risto','🍝 Ristoranti'],['salute','💊 Salute'],['scuola','🏫 Scuole'],['verde','🌳 Verde'],['sport','⚽ Sport'],['servizi','🏦 Servizi']];
  box.outerHTML=`<div class="panel"><div class="row spread"><b class="disp" style="font-size:24px">Vivibilità</b><span class="tag" style="background:${col};color:#140f1f">${LV.score}/100 · ${lab}</span></div>
     <div class="bars" style="margin-top:8px">${LV.subs.map(([n,v])=>`<div class="b"><div class="row spread" style="border:0;height:auto;background:none"><span>${n}</span><b>${v}</b></div><div class="bar"><span class="fill" style="width:${v}%;background:${liveLabel(v)[1]}"></span></div></div>`).join('')}</div>
     <small class="muted">Calcolata sulle distanze vere da farmacie, negozi, fermate, stazione, scuole, parchi, carabinieri e vigili del fuoco.</small></div>
   <div class="panel"><h3>📍 L’essenziale più vicino</h3>${ess.map(x=>stRow(x,I.indexOf(x))).join('')||'<p class="muted">Nessun dato.</p>'}</div>
   ${groups.map(([g,t])=>{const L=I.filter(x=>x.g===g);if(!L.length)return'';return`<details class="man"><summary>${t} <small style="font-family:inherit;font-size:14px">(${L.length})</small></summary><div class="man-b">${L.slice(0,40).map(x=>stRow(x,I.indexOf(x))).join('')}</div></details>`;}).join('')}
   <div class="panel"><h3>🏡 Prezzi e annunci</h3><p style="font-weight:400;font-size:14px">Qui compariranno prezzi al m² e annunci veri delle <b>agenzie partner</b> della zona. Per ora in questa zona non ce ne sono.</p></div>${b2b()}
   <p class="muted" style="font-size:11.5px;margin:8px 2px">Dati © OpenStreetMap: se un’attività ha chiuso, aprila e tocca “Segnalalo”.</p>`;
  stBind(z,I);try{app.querySelectorAll('[data-b2b],[data-go]').forEach(()=>{});if(typeof bindGo==='function')bindGo();}catch(e){}};
/* B: recensioni verificate degli sponsor (solo chi ha usato il codice in negozio) */
window.ZREV={};
async function zLoadRev(){try{const sb=await waitSB();if(!sb)return;const{data}=await sb.from('reviews').select('sponsor_id,stars,text,created_at').eq('hidden',false).order('created_at',{ascending:false}).limit(1000);
  const byId={};Object.entries(window.SP_GEO||{}).forEach(([k,g])=>{if(g&&g.id)byId[g.id]=k;});window.ZREV={};(data||[]).forEach(r=>{const k=byId[r.sponsor_id];if(!k)return;(window.ZREV[k]=window.ZREV[k]||[]).push({st:r.stars,txt:r.text||'',nick:'cliente verificato',when:new Date(r.created_at).toLocaleDateString('it-IT',{month:'long',year:'numeric'}),ver:true,title:''});});}catch(e){}}
setTimeout(zLoadRev,3000);
const _rvListV=rvList;rvList=function(key,n,b){if(/^sp-/.test(key))return window.ZREV[key.slice(3)]||[];return _rvListV(key,n,b);};
const _rvBtnV=rvBtn;rvBtn=function(key,name){const g=_rvBtnV(key,name);if(!/^sp-/.test(key)||!window.SP_GEO||!SP_GEO[key.slice(3)])return g;return g+`<button class="btn small" data-rvsp="${esc(key.slice(3))}">✍️ Recensisci</button>`;};
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-rvsp]');if(!b)return;const k=b.dataset.rvsp,g=SP_GEO[k];
  if(!S.user||typeof SB==='undefined'||!SB){toast('Accedi per recensire');return;}
  const{data}=await SB.from('coupons').select('id').eq('user_id',S.user.id).eq('sponsor_id',g.id).not('redeemed_at','is',null).limit(1);
  if(!data||!data.length){toast('Puoi recensire dopo aver usato il codice sconto in negozio: così le recensioni sono tutte vere');return;}
  let st=5;openSheet('✍️ Recensisci '+esc(SPONSORS[k].name),`<p style="font-weight:400">La tua recensione comparirà come <b>cliente verificato</b>: hai usato il codice in negozio.</p>
    <div class="rvst" style="font-size:34px;margin:10px 0;cursor:pointer">${[1,2,3,4,5].map(i=>`<span data-s="${i}">★</span>`).join('')}</div>
    <textarea id="rvT" rows="4" style="width:100%;padding:10px;border:3px solid var(--ink);font-size:15px" placeholder="Com’è andata? (facoltativo)"></textarea>
    <button class="btn wide" data-rvok style="margin-top:10px">Pubblica</button>`,card=>{const paint=()=>card.querySelectorAll('[data-s]').forEach(s=>s.style.color=+s.dataset.s<=st?'#f7b500':'#ccc');paint();
    card.querySelectorAll('[data-s]').forEach(s=>s.onclick=()=>{st=+s.dataset.s;paint();});
    card.querySelector('[data-rvok]').onclick=async()=>{const{error}=await SB.from('reviews').insert({sponsor_id:g.id,user_id:S.user.id,coupon_id:data[0].id,stars:st,text:card.querySelector('#rvT').value.trim().slice(0,600)});
      if(error){toast('Non pubblicata: '+error.message);return;}closeSheet();toast('Grazie! Recensione verificata pubblicata');zLoadRev();};});});
</script>
<script>
/* =========================================================
   ATTIVITÀ AGGIUNTE DA INDZ + "MANCA UN'ATTIVITÀ?"
   ========================================================= */
const CUST_CAT={spesa:['spesa','Alimentari','🛒'],negozi:['negozi','Negozio','🛍️'],casa:['negozi','Negozio per la casa','🔧'],bar:['bar','Bar','☕'],risto:['risto','Ristorante','🍝'],salute:['salute','Salute','💊'],servizi:['servizi','Servizi','🏦'],scuola:['scuola','Scuola','🏫'],sport:['sport','Sport','⚽'],verde:['verde','Parco','🌳'],hotel:['hotel','Hotel','🏨'],bb:['bb','B&B / affittacamere','🛏️'],agri:['agri','Agriturismo','🌾'],camp:['camp','Campeggio','⛺'],attr:['attr','Da vedere','🏛️']};
window.ZCUSTOM=[];
async function zLoadCustom(){try{const sb=await waitSB();if(!sb)return;const{data,error}=await sb.from('custom_pois').select('*');if(error||!data)return;window.ZCUSTOM=data;
  (window.__zlms||[]).forEach(lm=>{try{zDrawCustom(lm);}catch(e){}});[S.zone,S.reZone].forEach(z=>{if(z&&z._st)z._st=null;});}catch(e){}}
setTimeout(zLoadCustom,2500);
function zDrawCustom(lm){if(!lm||!lm.map)return;(lm._cus||[]).forEach(x=>x.remove());lm._cus=[];const m=lm.m;
  window.ZCUSTOM.forEach(c=>{if(trM(m.lat,m.lon,c.lat,c.lon)>15000)return;if(window.ZHID&&window.ZHID.includes(c.name))return;const C=CUST_CAT[c.cat]||CUST_CAT.negozi;
    const el=elDiv(c.cat==='casa'?'lm-cand':'lm-cust',c.cat==='casa'?`<b>${C[2]}</b><em>${esc(c.name.slice(0,22))}</em>`:`<b>${C[2]}</b><em>${esc(c.name.slice(0,22))}</em>`);
    el.addEventListener('click',e=>{e.stopPropagation();const d=Math.round(trM(m.lat,m.lon,c.lat,c.lon));
      if(['salute','servizi','scuola','verde','sport'].includes(C[0]))lmPoi(c.name,C[1],d,[c.lat,c.lon],true);else bizSheet({i:'c'+c.id,ic:C[2],name:c.name,cat:C[1],d,ll:[c.lat,c.lon],tel:c.phone||'',web:c.website||'',cand:c.cat==='casa'},S.zone);});
    lm._cus.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([c.lon,c.lat]).addTo(lm.map));});}
const _liveMapC=liveMap;liveMap=async function(el,addr,o){const lm=await _liveMapC(el,addr,o);try{zDrawCustom(lm);}catch(e){}return lm;};
/* anche in Vivere qui / Vacanza */
const _zStructC=zStruct;zStruct=async function(z){const fresh=!z._st;const D=await _zStructC(z);if(fresh||!D._c){D._c=1;(window.ZCUSTOM||[]).forEach(c=>{const C=CUST_CAT[c.cat]||CUST_CAT.negozi;const d=Math.round(trM(D.lat,D.lon,c.lat,c.lon));
    const lim=['hotel','bb','agri','camp','attr','risto'].includes(C[0])?8000:1500;if(d>lim||D.items.some(x=>x.name===c.name&&trM(x.lat,x.lon,c.lat,c.lon)<60))return;
    D.items.push({g:C[0],cat:C[1],ic:C[2],name:c.name,lat:c.lat,lon:c.lon,d,tel:c.phone||'',web:c.website||''});});D.items.sort((a,b)=>a.d-b.d);}return D;};
/* utenti: "Manca un'attività? Segnalala" (arriva nelle segnalazioni dell'admin) */
function missingSheet(){if(!S.user){toast('Accedi per segnalare un’attività');return;}
  openSheet('➕ Manca un’attività?',`<p style="font-weight:400">Dicci cosa manca: la controlliamo e la aggiungiamo per tutti.</p>
   <label class="disp" style="font-size:17px">Nome</label><input id="msN" class="field" placeholder="Es. Panificio Rossi">
   <label class="disp" style="font-size:17px;margin-top:8px;display:block">Cos’è</label><select id="msC" class="field">${Object.entries(CUST_CAT).map(([k,v])=>`<option value="${k}">${v[2]} ${v[1]}</option>`).join('')}</select>
   <label class="disp" style="font-size:17px;margin-top:8px;display:block">Indirizzo</label><input id="msA" class="field" placeholder="Via, numero, paese">
   <button class="btn wide" data-msok style="margin-top:12px">Invia</button>`,card=>{card.querySelector('[data-msok]').onclick=async()=>{const n=card.querySelector('#msN').value.trim(),a=card.querySelector('#msA').value.trim(),c=card.querySelector('#msC').value;
     if(!n||!a){toast('Servono nome e indirizzo');return;}const R=S.zone&&S.zone.real;
     try{const{error}=await SB.from('poi_reports').insert({name:n,lat:R?R.lat:null,lon:R?R.lon:null,motivo:`MANCA: ${(CUST_CAT[c]||[])[1]||c} · ${a}`});if(error)throw error;closeSheet();toast('Grazie! La controlliamo e la aggiungiamo');}catch(e){toast('Non inviata: riprova');}};});}
const _renderVivereC=renderVivere;renderVivere=async function(){await _renderVivereC();try{if(S.tab!=='mappa'||app.querySelector('[data-miss]'))return;const pg=app.querySelector('.page');if(!pg)return;
  pg.insertAdjacentHTML('beforeend','<button class="btn ghost wide" data-miss style="margin:6px 0 14px">➕ Manca un’attività? Segnalala</button>');app.querySelector('[data-miss]').onclick=missingSheet;}catch(e){}};
</script>
<script>
/* attività aggiunte da INDZ anche nella mappa del quartiere del gioco */
const _hqBackC=hqBack;hqBack=function(m){let s=_hqBackC(m);try{let pins='';(window.ZCUSTOM||[]).forEach((c,i)=>{const P=hqP(m,c.lat,c.lon);if(!hqIn(P))return;const C=CUST_CAT[c.cat]||CUST_CAT.negozi;
    pins+=`<g data-rcus="${i}" style="cursor:pointer"><circle cx="${P[0]+1.5}" cy="${P[1]+1.5}" r="10" fill="#140f1f"/><circle cx="${P[0]}" cy="${P[1]}" r="10" fill="#fff" stroke="#140f1f" stroke-width="2.4"/><text x="${P[0]}" y="${P[1]+4}" text-anchor="middle" font-size="10.5">${C[2]}</text></g>`;});
  if(pins)s=s.replace('<rect y="620" width="400" height="60"',pins+'<rect y="620" width="400" height="60"');}catch(e){}return s;};
document.addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('[data-rcus]');if(!g)return;const c=(window.ZCUSTOM||[])[+g.dataset.rcus];if(!c)return;const C=CUST_CAT[c.cat]||CUST_CAT.negozi;
  const R=S.zone&&S.zone.real;const d=R?Math.round(trM(R.lat,R.lon,c.lat,c.lon)):0;if(['salute','servizi','scuola','verde','sport'].includes(C[0]))lmPoi(c.name,C[1],d,[c.lat,c.lon],true);else bizSheet({i:'c'+c.id,ic:C[2],name:c.name,cat:C[1],d,ll:[c.lat,c.lon],tel:c.phone||'',web:c.website||'',cand:c.cat==='casa'},S.zone);});
/* pannello admin e negozio raggiungibili dal menu (admin solo per chi è amministratore) */
const _renderMenuA=renderMenu;renderMenu=function(){_renderMenuA();try{if(!S.user||document.querySelector('[data-admlink]'))return;const ref=document.querySelector('.dr-user');if(!ref)return;
  zIsAdmin().then(ok=>{if(!ok||document.querySelector('[data-admlink]'))return;ref.insertAdjacentHTML('afterend','<a class="mi" data-admlink="1" href="admin.html" target="_blank"><span>🛠️</span>Pannello admin INDZ</a>');});
  (async()=>{try{const{data}=await SB.from('sponsor_users').select('sponsor_id').eq('user_id',S.user.id).limit(1);if(data&&data.length&&!document.querySelector('[data-neglink]'))ref.insertAdjacentHTML('afterend','<a class="mi" data-neglink="1" href="negozio.html" target="_blank"><span>🏪</span>Pannello del mio negozio</a>');}catch(e){}})();}catch(e){}};
</script>
<script>
/* 3) su iPhone il tocco sui pulsanti dei premi arriva sempre (anche quando il "click" si perde) */
(function(){const SEL='[data-ch],[data-chok],[data-tmc],[data-tmx],#dClaim,[data-expok],[data-invcl],#toHub,#again,[data-pgo],[data-pauto]';let sx=0,sy=0,st=0;
  document.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now();},{passive:true,capture:true});
  document.addEventListener('touchend',e=>{const el=e.target.closest&&e.target.closest(SEL);if(!el||el.disabled||el.hidden)return;const t=e.changedTouches[0];
    if(Math.hypot(t.clientX-sx,t.clientY-sy)>12||Date.now()-st>800)return;e.preventDefault();el.click();},{passive:false,capture:true});})();
</script>
