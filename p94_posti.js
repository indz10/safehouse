<script>
/* =========================================================
   🎁 POSTI VERI COME NEL GIOCO (Fase 32, richiesta di Alessandro 16/11, nessun SQL)
   "Davanti a farmacie e negozi, con la Lente devo guadagnare provviste; dal divano mando l'avatar e mi costa
    provviste. Bello ma semplice come gli altri giochi di strategia, sulle mappe vere."
   - Sulla MAPPA i posti veri intorno a te (OpenStreetMap + sponsor: supPoi/supLocal di p82) diventano segnaposti
     di gioco `.lm-posto` col premio (💊 🔋🥫, 🛒 🥫, 🔨 🪵, ⛽, ⭐); toccandoli: pvSheet con i due modi
     (📍 di persona con la Lente = GRATIS, 🎒 col superstite = costa 🥫/⛽). Già presi (12 ore): ✅ grigi.
   - Nella LENTE il tasto grande (zmAct di p90) diventa "🎁 PRENDI" quando un posto è nel mirino entro 50 m
     (o a meno di 25 m in qualunque direzione) → world_posto_visita (mvVisita di p92). Il radar conta anche i posti.
   - Il tasto 📷 Lente della mappa conta anche i posti entro 80 m (p93).
   ========================================================= */
const PV={P:[],t:0,pos:null,busy:false,mk:new Map(),mkMap:null,sig:''};
const pvKey=p=>Math.round(p.lat*2500)+':'+Math.round(p.lon*2000);
function pvVisti(){try{return JSON.parse(localStorage.getItem('zsh_pv')||'{}')||{};}catch(e){return{};}}
function pvPreso(p){const t=pvVisti()[pvKey(p)];return t&&Date.now()-t<12*3600e3?t:null;}
function pvSegna(p){PV.lt=0;const v=pvVisti();v[pvKey(p)]=Date.now();Object.keys(v).forEach(k=>{if(Date.now()-v[k]>12*3600e3)delete v[k];});try{localStorage.setItem('zsh_pv',JSON.stringify(v));}catch(e){}PV.sig='';}
const pvIc=p=>p.k==='sponsor'?'⭐':((typeof MV_VANT!=='undefined'&&MV_VANT[p.k])||['📦'])[0];
function pvDedup(L){const seen=new Set(),out=[];L.forEach(p=>{if(!p||p.lat==null||p.lon==null)return;const k=pvKey(p);if(seen.has(k))return;seen.add(k);out.push(p);});return out;}
/* i posti intorno a un punto: subito quelli già noti (sponsor, Lente), poi OpenStreetMap (in memoria 3 giorni) */
async function pvLoad(force){const p=typeof zmPos==='function'?zmPos():null;if(!p||!S.user)return PV.P;
  if(!force&&PV.pos&&trM(PV.pos.lat,PV.pos.lon,p.lat,p.lon)<150&&Date.now()-PV.t<300000)return PV.P;PV.pos={lat:p.lat,lon:p.lon};PV.t=Date.now();
  let L=[];try{L=supLocal({lat:p.lat,lon:p.lon},1);}catch(e){}
  try{const A=typeof LENTE!=='undefined'&&LENTE.area;if(A&&A.P)A.P.forEach(x=>L.push({k:mvKind(x),cat:x.cat,name:x.name,lat:x.lat,lon:x.lon}));}catch(e){}
  PV.P=pvDedup(L.concat(PV.P.filter(q=>trM(p.lat,p.lon,q.lat,q.lon)<1200)));PV.sig='';
  if(!PV.busy){PV.busy=true;Promise.resolve().then(()=>supPoi(p.lat,p.lon,1)).then(P2=>{PV.busy=false;if(P2&&P2.length){PV.P=pvDedup(PV.P.concat(P2));PV.sig='';pvMarks();}}).catch(()=>{PV.busy=false;});}
  return PV.P;}
function pvNear(m){const p=typeof zmPos==='function'?zmPos():null;if(!p)return 0;return PV.P.filter(q=>!pvPreso(q)&&trM(p.lat,p.lon,q.lat,q.lon)<=m).length;}
/* ---------- 🗺️ sulla mappa ---------- */
function pvMarks(){try{if(S.tab!=='mappa'||!S.user||typeof maplibregl==='undefined')return;const lm=window.__mf;if(!lm||!lm.map||!document.body.contains(lm.map.getContainer()))return;
  if(PV.mkMap!==lm.map){PV.mk.forEach(m=>{try{m.remove();}catch(e){}});PV.mk=new Map();PV.mkMap=lm.map;PV.sig='';}
  const p=zmPos();if(!p)return;const V=PV.P.filter(q=>trM(p.lat,p.lon,q.lat,q.lon)<1000).slice(0,60);const sig=V.map(q=>pvKey(q)+(pvPreso(q)?'v':'')).join(',');if(sig===PV.sig)return;PV.sig=sig;
  PV.mk.forEach(m=>{try{m.remove();}catch(e){}});PV.mk=new Map();
  V.forEach(q=>{const el=elDiv('lm-posto k-'+q.k+(pvPreso(q)?' preso':''),`<b>${pvIc(q)}</b>`);el.title=q.name;el.onclick=e=>{e.stopPropagation();pvSheet(q);};
    try{PV.mk.set(pvKey(q),new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([q.lon,q.lat]).addTo(lm.map));}catch(x){}});}catch(e){}}
function pvSheet(q){const v=(typeof MV_VANT!=='undefined'&&MV_VANT[q.k])||['📦','un po’ di tutto'];const p=zmPos();const d=p?Math.round(trM(p.lat,p.lon,q.lat,q.lon)):null;
  let km=null;try{km=supKm(q);}catch(e){}const c=km!=null?mvCostoSped(km):null;const preso=pvPreso(q);
  openSheet(`${pvIc(q)} ${esc(q.name)}`,`<p class="muted" style="margin:0 0 6px">${esc(q.cat||'')}${d!=null?` · a ${d<1000?d+' m':(d/1000).toFixed(1).replace('.',',')+' km'} da te`:''}</p>
    <div class="pvpremio"><span>${v[0]}</span><b>Qui trovi: ${v[1]}</b></div>
    <div class="mvdue pvdue"><div class="on"><span>📍 Di persona</span><small>${preso?'✅ Già preso: si riempie di nuovo fra '+Math.max(1,Math.ceil((12*3600e3-(Date.now()-preso))/3600e3))+' ore':'GRATIS: vai lì, apri la 📷 Lente e a meno di 50 m tocca 🎁 PRENDI'}</small>
      <button class="btn small" data-pvl>📷 Apri la Lente</button></div>
    <div><span>🎒 Dal divano</span><small>${c?`mandi il superstite: costa 🥫 ${c.cibo}${c.carb?' ⛽ '+c.carb:''} + energia`:'serve una casa nel mondo'}</small>
      <button class="btn small ghost" data-pvs data-km="${km!=null?km:''}" ${c?'':'disabled'}>🎒 Mandalo</button></div></div>
    <p class="muted" style="font-size:12.5px;margin-top:8px">Di persona guadagni e basta; col superstite spendi scorte per il viaggio.</p>`,box=>{
    box.querySelector('[data-pvl]').onclick=()=>{closeSheet();lenteOpen();};
    const s=box.querySelector('[data-pvs]');if(s)s.onclick=async()=>{s.disabled=true;try{const{data,error}=await SB.rpc('world_sped_parti',{p_kind:q.k,p_nome:q.name,p_lat:q.lat,p_lon:q.lon});if(error)throw error;toast(data.msg);if(data.ok){closeSheet();RES.t=0;try{resLoad(true);supLoad(true);}catch(e){}}else s.disabled=false;}catch(e){toast('Non riuscito: riprova');s.disabled=false;}};});}
zEvery(()=>{try{if(document.hidden||!S.user||S.tab!=='mappa')return;pvLoad().then(pvMarks);}catch(e){}},6000,'posti-mappa');
/* ---------- 📷 nella Lente: il tasto grande diventa 🎁 PRENDI ---------- */
function pvLente(){const L=LENTE;if(!L.pos)return[];if(PV.lc&&Date.now()-PV.lt<2000&&PV.lp&&trM(PV.lp.lat,PV.lp.lon,L.pos.lat,L.pos.lon)<10)return PV.lc;PV.lt=Date.now();PV.lp={lat:L.pos.lat,lon:L.pos.lon};let A=[];try{A=(L.area&&L.area.P||[]).map(x=>({k:mvKind(x),cat:x.cat,name:x.name,lat:x.lat,lon:x.lon}));}catch(e){}
  let B=[];try{B=supLocal({lat:L.pos.lat,lon:L.pos.lon},0.3);}catch(e){}PV.lc=pvDedup(A.concat(B,PV.P)).filter(q=>trM(L.pos.lat,L.pos.lon,q.lat,q.lon)<=120);return PV.lc;}
const _zmActPv=zmAct;zmAct=function(mira,vic){_zmActPv.apply(this,arguments);try{pvAct();}catch(e){}};
function pvAct(){const L=LENTE,b=L.root&&L.root.querySelector('.zmact');if(!b||ZM.f||ZM.starting||b.classList.contains('fuoco')||b.classList.contains('apri'))return;
  const head=((L.h==null?0:L.h)+L.man+360)%360;let best=null;
  pvLente().forEach(q=>{if(pvPreso(q))return;const d=trM(L.pos.lat,L.pos.lon,q.lat,q.lon);const rel=((lnBearing(L.pos.lat,L.pos.lon,q.lat,q.lon)-head+540)%360)-180;
    const ok=(d<=50&&Math.abs(rel)<=15)||d<=25;if(ok&&(!best||d<best.d))best={q,d};});
  if(!best)return;const q=best.q;const v=(typeof MV_VANT!=='undefined'&&MV_VANT[q.k])||['📦',''];const t=`🎁 PRENDI<small>${esc(q.name.slice(0,26))} · ${mvBreve(q.k)} gratis</small>`;
  if(b.dataset.k!==t){b.dataset.k=t;b.innerHTML=t;b.className='zmact prendi';}
  b._go=async()=>{if(b._busy)return;b._busy=true;const x={...q,ic:v[0]};await mvVisita(x,q.k);b._busy=false;b.dataset.k='';};}
</script>
