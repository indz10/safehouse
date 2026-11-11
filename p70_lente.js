<script>
/* =========================================================
   LENTE ZOMBIESAFEHOUSE (Fase 10A) — realtà aumentata nella PWA
   - fotocamera a schermo intero con FILTRO FUMETTO in tempo reale (WebGL: contorni neri, tinte piatte, retino);
   - ETICHETTE sopra quello che inquadri, con GPS + bussola: le tue case, case abitate (nome solo se il server lo dà:
     chi ha scelto "Tutti" o alleati), sponsor, presidi; precisione GPS 5–20 m e bussola 10–20° → etichette "fluttuanti";
   - ZOMBIE a fumetto che camminano nell'inquadratura all'ora dell'orda (o con "Fai passare l'orda").
   Privacy: nessuna foto salvata o inviata, tutto elaborato sul telefono; la fotocamera si spegne chiudendo la Lente
   o quando l'app va in sfondo.
   Si apre dal pulsante "📷 Lente" della mappa o dal menu ☰ (Gioco).
   ========================================================= */
const LENTE={on:false,h:null,beta:90,man:0,T:[],els:new Map(),z:[],prevUntil:0};
const LN_HFOV=56,LN_VFOV=72,LN_MAXM=600;
const LN_FS=`precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 px,sc,of;
vec3 T(vec2 p){return texture2D(t,of+p*sc).rgb;}
float L(vec2 p){return dot(T(p),vec3(.299,.587,.114));}
float sob(vec2 p,vec2 r){float a=L(p+r*vec2(-1.,-1.)),b=L(p+r*vec2(0.,-1.)),d=L(p+r*vec2(1.,-1.)),e=L(p+r*vec2(-1.,0.)),f=L(p+r*vec2(1.,0.)),g=L(p+r*vec2(-1.,1.)),h=L(p+r*vec2(0.,1.)),i=L(p+r*vec2(1.,1.));
 float gx=-a-2.*e-g+d+2.*f+i,gy=-a-2.*b-d+g+2.*h+i;return length(vec2(gx,gy));}
vec3 hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x);}
const vec3 INK=vec3(.078,.059,.122),NIGHT=vec3(.141,.102,.29),NIGHT2=vec3(.2,.153,.416),PAPER=vec3(.953,.914,.824),YEL=vec3(.969,.839,.29),RED=vec3(.843,.149,.239),GRN=vec3(.247,.608,.373),SKY=vec3(.42,.36,.72),BRK=vec3(.78,.42,.25);
vec3 tinta(float hue){if(hue<.06||hue>.93)return RED;if(hue<.11)return BRK;if(hue<.19)return YEL;if(hue<.45)return GRN;if(hue<.72)return SKY;return NIGHT2;}
void main(){vec2 p=v;
 vec3 c=(T(p)*2.+T(p+px*vec2(1.5,0.))+T(p-px*vec2(1.5,0.))+T(p+px*vec2(0.,1.5))+T(p-px*vec2(0.,1.5)))/6.;
 vec3 h=hsv(c);float val=h.z,sat=h.y;
 vec3 q;
 if(val<.22)q=NIGHT;else if(val<.45)q=mix(NIGHT2,tinta(h.x),sat>.3?.45:.12);else if(val<.75)q=mix(PAPER*.8,tinta(h.x),sat>.22?.8:.18);else q=sat>.35?mix(PAPER,tinta(h.x),.6):PAPER;
 vec2 hg=gl_FragCoord.xy/7.;float dd=length(fract(hg)-.5);
 if(val<.55)q=mix(q,INK,.55*step(dd,(.55-val)*.9));
 if(val>.8&&sat<.25)q=mix(q,YEL,.18*step(dd,.18));
 float ed=max(sob(p,px),sob(p,px*2.6)*.8);
 q=mix(q,INK,smoothstep(.15,.3,ed));
 gl_FragColor=vec4(q,1.);}`;
const LN_VS='attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
/* filtro fumetto: prepara WebGL sul canvas (false se non c'è) */
function lnGL(cv){let gl=null;try{gl=cv.getContext('webgl',{premultipliedAlpha:false,antialias:false})||cv.getContext('experimental-webgl');}catch(e){}if(!gl)return null;
  const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  try{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,LN_VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,LN_FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))return null;gl.useProgram(p);
    const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const al=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    return{gl,u:{px:gl.getUniformLocation(p,'px'),sc:gl.getUniformLocation(p,'sc'),of:gl.getUniformLocation(p,'of')}};}catch(e){return null;}}
/* un fotogramma: video "a tutto schermo" (taglia i bordi come object-fit:cover) e filtro */
function lnFrame(){const L=LENTE;if(!L.on)return;L.raf=requestAnimationFrame(lnFrame);const now=performance.now();if(now-(L.last||0)<33)return;L.last=now;L.frames=(L.frames||0)+1;
  const v=L.video,cv=L.cv,G=L.G;
  if(G&&v&&v.readyState>=2&&v.videoWidth){const gl=G.gl,w=cv.clientWidth,h=cv.clientHeight,k=Math.min(1,720/Math.max(1,w));const W=Math.round(w*k),H=Math.round(h*k);
    if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;gl.viewport(0,0,W,H);}
    try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,v);}catch(e){}
    const va=v.videoWidth/v.videoHeight,ca=W/H;let sx=1,sy=1;if(va>ca)sx=ca/va;else sy=va/ca;
    gl.uniform2f(G.u.sc,sx,sy);gl.uniform2f(G.u.of,(1-sx)/2,(1-sy)/2);gl.uniform2f(G.u.px,1.6/W,1.6/H);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
  lnLabels();lnZombies(now);}
/* direzione della bussola (iPhone: webkitCompassHeading; Android: deviceorientationabsolute) */
function lnOri(e){let h=null;if(e.webkitCompassHeading!=null&&!isNaN(e.webkitCompassHeading))h=e.webkitCompassHeading;else if((e.absolute||e.type==='deviceorientationabsolute')&&e.alpha!=null)h=360-e.alpha;
  if(e.beta!=null)LENTE.beta=LENTE.beta*.8+e.beta*.2;if(h==null)return;
  const so=(screen.orientation&&screen.orientation.angle)||window.orientation||0;h=(h+so+360)%360;
  if(LENTE.h==null)LENTE.h=h;else{const d=((h-LENTE.h+540)%360)-180;LENTE.h=(LENTE.h+d*.25+360)%360;}if(!LENTE.bussola){LENTE.bussola=true;lnStatus();}}
function lnBearing(la1,lo1,la2,lo2){const r=Math.PI/180,y=Math.sin((lo2-lo1)*r)*Math.cos(la2*r),x=Math.cos(la1*r)*Math.sin(la2*r)-Math.sin(la1*r)*Math.cos(la2*r)*Math.cos((lo2-lo1)*r);return(Math.atan2(y,x)/r+360)%360;}
/* servizi e attività intorno (carabinieri, farmacie, negozi…) + forme degli edifici per il mirino: una sola richiesta, tenuta 7 giorni */
const LN_POI=[['police','🚓','Carabinieri / Polizia'],['fire_station','🚒','Vigili del fuoco'],['pharmacy','💊','Farmacia'],['hospital','🏥','Ospedale'],['clinic','🏥','Ambulatorio'],['doctors','🩺','Medico'],
  ['townhall','🏛️','Municipio'],['post_office','📮','Ufficio postale'],['bank','🏦','Banca'],['fuel','⛽','Distributore'],['school','🏫','Scuola'],['library','📚','Biblioteca'],['place_of_worship','⛪','Chiesa'],
  ['bar','☕','Bar'],['cafe','☕','Bar'],['restaurant','🍝','Ristorante'],['pizzeria','🍕','Pizzeria'],['fast_food','🍔','Fast food'],['pub','🍺','Pub']];
const LN_SHOP={supermarket:['🛒','Supermercato'],convenience:['🛒','Alimentari'],bakery:['🥖','Panificio'],butcher:['🥩','Macelleria'],hardware:['🔧','Ferramenta'],doityourself:['🔧','Fai da te'],
  hairdresser:['💇','Parrucchiere'],clothes:['👕','Abbigliamento'],tobacco:['🚬','Tabaccheria'],newsagent:['📰','Edicola'],florist:['💐','Fiorista'],car_repair:['🔩','Officina'],optician:['👓','Ottico']};
async function lnArea(lat,lon){const key='zsh_ln_'+lat.toFixed(3)+'_'+lon.toFixed(3);try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.t<7*864e5)return c;}catch(e){}
  const A=`(around:600,${lat.toFixed(5)},${lon.toFixed(5)})`,B=`(around:260,${lat.toFixed(5)},${lon.toFixed(5)})`;
  const q=`[out:json][timeout:25];way["building"]${B};out ids tags geom 400;(nwr["amenity"~"^(${LN_POI.map(x=>x[0]).join('|')})$"]["name"]${A};nwr["shop"]["name"]${A};);out center tags 200;`;
  let els=[],ok=true;try{els=await trOverpass(q,22000,4);}catch(e){ok=false;}
  const B2=[],P=[];els.forEach(e=>{const t=e.tags||{};
    if(e.type==='way'&&e.geometry&&e.geometry.length>=3&&t.building){const R=e.geometry.map(g=>[+g.lon.toFixed(6),+g.lat.toFixed(6)]);B2.push({id:'w'+e.id,R,t:{b:t.building,l:t['building:levels']||'',n:t.name||'',a:(t['addr:street']?t['addr:street']+' '+(t['addr:housenumber']||''):'').trim()}});return;}
    const la=e.lat!=null?e.lat:e.center&&e.center.lat,lo=e.lon!=null?e.lon:e.center&&e.center.lon;if(la==null||!t.name)return;
    const am=LN_POI.find(x=>x[0]===t.amenity)||(t.amenity==='restaurant'&&/pizz/i.test(t.cuisine||'')?LN_POI.find(x=>x[0]==='pizzeria'):null);const sh=t.shop?(LN_SHOP[t.shop]||['🛍️','Negozio']):null;
    const k=am?[am[1],am[2]]:sh;if(!k)return;P.push({id:e.type[0]+e.id,ic:k[0],cat:k[1],name:String(t.name).slice(0,40),lat:+la.toFixed(6),lon:+lo.toFixed(6),tel:t.phone||t['contact:phone']||'',ore:t.opening_hours||'',
      ind:(t['addr:street']?t['addr:street']+' '+(t['addr:housenumber']||''):'').trim(),srv:!!am&&['police','fire_station','pharmacy','hospital','clinic','townhall'].includes(am[0])});});
  const seen=new Set(B2.map(b=>b.id));lnMemB(lat,lon).forEach(b=>{if(!seen.has(b.id)){seen.add(b.id);B2.push(b);}});
  const out={t:Date.now(),B:B2,P};if(ok&&B2.length)try{localStorage.setItem(key,JSON.stringify(out));}catch(e){}return out;}
/* edifici che l'app ha già (mappa della tua zona e zone viste), entro 300 m */
function lnMemB(lat,lon){const out=[];const pools=Object.values((window.RM&&RM.cache)||{}).map(m=>m&&m.els);
  try{Object.keys(localStorage).filter(k=>k.startsWith('zsh_rm2_')).forEach(k=>{try{pools.push(JSON.parse(localStorage.getItem(k)).m.els);}catch(e){}});}catch(e){}
  pools.forEach(els=>(els||[]).forEach(e=>{if(e.type!=='way'||!e.geometry||e.geometry.length<3||!(e.tags&&e.tags.building))return;const g=e.geometry[0];if(trM(lat,lon,g.lat,g.lon)>300)return;const t=e.tags;
    out.push({id:'w'+e.id,R:e.geometry.map(q=>[+q.lon.toFixed(6),+q.lat.toFixed(6)]),t:{b:t.building,l:t['building:levels']||'',n:t.name||'',a:(t['addr:street']?t['addr:street']+' '+(t['addr:housenumber']||''):'').trim()}});}));
  return out;}
/* cosa c'è intorno: case mie, case del mondo (world_view: il nome solo se il server lo manda), sponsor, presidi */
async function lnTargets(lat,lon){const T=[];const add=(id,ic,t,la,lo,k,act)=>{if(la==null||lo==null)return;const d=trM(lat,lon,la,lo);if(k==='mia'?d<=LN_MAXM*3:(d<=LN_MAXM&&d>=8))T.push({id,ic,t,lat:la,lon:lo,d,k,act});};
  try{myHouses().forEach((h,i)=>add('mh'+i,h.home?'❤️':'🔑',h.home?'Casa tua':'La tua '+h.label.toLowerCase(),h.lat,h.lon,'mia',()=>lnPanel(h)));}catch(e){}
  const dl=0.0062,dn=dl/Math.max(.2,Math.cos(lat*Math.PI/180));
  try{if(S.user){const rows=await wRpc('world_view',{p_minlat:lat-dl,p_minlon:lon-dn,p_maxlat:lat+dl,p_maxlon:lon+dn})||[];LENTE.rows=rows;
    rows.forEach(r=>{if(r.status==='home')add('w'+r.building_id,'🏠',r.nick?'@'+r.nick:'Casa abitata',r.lat,r.lon,'casa');
      else if(r.status==='owned')add('w'+r.building_id,'🔑',r.nick?'Casa di @'+r.nick:'Casa comprata',r.lat,r.lon,'casa');});}}catch(e){}
  try{Object.entries(window.SP_GEO||{}).forEach(([k,g])=>{if(g&&SPONSORS[k])add('s'+k,'⭐',SPONSORS[k].name,g.lat,g.lon,'sp',()=>sponsorSheet(k,S.zone||{seed:7}));});}catch(e){}
  try{if(typeof SB!=='undefined'&&SB){const{data}=await SB.rpc('world_presidi_list',{p_minlat:lat-dl,p_minlon:lon-dn,p_maxlat:lat+dl,p_maxlon:lon+dn});
    if(data&&data.presidi){PRES.d=data;PRES.L=data.presidi;data.presidi.forEach(p=>add('p'+p.id,(PRES_K[p.kind]||['🚩'])[0],p.name+(p.stato==='mio'?' · tuo':p.stato==='libero'?' · libero':''),p.lat,p.lon,'pres-'+p.stato,()=>presSheet(p.id)));}}}catch(e){}
  try{const a=LENTE.area;if(a)a.P.forEach(x=>add('o'+x.id,x.ic,x.name,x.lat,x.lon,x.srv?'srv':'att',()=>lnPoiCard(x)));}catch(e){}
  /* due etichette nello stesso punto: tengo la prima */
  const out=[];T.sort((a,b)=>(a.k==='mia'?-1:0)-(b.k==='mia'?-1:0)||a.d-b.d).forEach(x=>{if(x.k==='mia'||!out.some(y=>trM(x.lat,x.lon,y.lat,y.lon)<12))out.push(x);});return out.slice(0,40);}
async function lnRefresh(force){const L=LENTE,p=L.pos;if(!p||!L.on)return;if(!force&&L.tpos&&trM(L.tpos.lat,L.tpos.lon,p.lat,p.lon)<120)return;L.tpos={lat:p.lat,lon:p.lon};
  if(!L.area||trM(L.area.lat,L.area.lon,p.lat,p.lon)>150){
    /* subito le case che l'app conosce già; poi (in sottofondo) OpenStreetMap con servizi e attività */
    const mem=lnMemB(p.lat,p.lon);if(mem.length||!L.area)L.area={t:Date.now(),B:mem,P:(L.area&&L.area.P)||[],lat:p.lat,lon:p.lon,prov:true};
    if(!L.areaBusy){L.areaBusy=true;const la=p.lat,lo=p.lon;lnArea(la,lo).then(a=>{L.areaBusy=false;if(a&&L.on){L.area={...a,lat:la,lon:lo};L.tpos=null;lnRefresh(true);}}).catch(()=>{L.areaBusy=false;});}}
  const T=await lnTargets(p.lat,p.lon);if(!L.on)return;L.T=T;const ids=new Set(T.map(x=>x.id));L.els.forEach((el,id)=>{if(!ids.has(id)){el.remove();L.els.delete(id);}});
  const box=L.root.querySelector('.lnl');T.forEach(x=>{if(L.els.has(x.id))return;const el=document.createElement('button');el.className='lnlab k-'+x.k;el.type='button';
    el.innerHTML=`<b>${x.ic} ${esc(x.t.slice(0,34))}</b><small></small>`;if(x.act)el.onclick=e=>{e.stopPropagation();if(x.k==='mia'||x.k==='att'||x.k==='srv')x.act();else lnSheet(x.act);};box.appendChild(el);L.els.set(x.id,el);});
  lnStatus();}
/* le etichette davanti, alla direzione giusta; più lontane = più in alto e più piccole */
function lnLabels(){const L=LENTE,p=L.pos;if(!p)return;const W=L.root.clientWidth,H=L.root.clientHeight;const head=((L.h==null?0:L.h)+L.man+360)%360;
  const hor=H*.52-((L.beta||90)-90)/LN_VFOV*H;const used=[];
  const lim=Math.max(35,(L.acc||20)+15);let qui=null;L.T.forEach(x=>{if(x.k!=='mia')return;const d=trM(p.lat,p.lon,x.lat,x.lon);if(d>lim)return;const sc=d-(x.ic==='❤️'?lim:0);if(!qui||sc<qui.sc)qui={id:x.id,sc};});
  let nvis=0;
  L.T.forEach(x=>{const el=L.els.get(x.id);if(!el)return;x.d=trM(p.lat,p.lon,x.lat,x.lon);const rel=((lnBearing(p.lat,p.lon,x.lat,x.lon)-head+540)%360)-180;
    if(qui&&x.id===qui.id){el.style.display='';el.classList.add('qui');el.style.transform='';el.querySelector('small').textContent='📍 Sei qui · tocca per potenziarla';return;}el.classList.remove('qui');
    if(x.k==='mia'&&Math.abs(rel)>LN_HFOV/2&&x.d<=800){el.style.display='';el.classList.add('edge');const w=el.offsetWidth||140,left=rel<0;
      el.style.transform=`translate(${left?10:W-w-10}px,${Math.round(H*.3+used.filter(u=>u.e).length*48)}px)`;used.push({x:left?0:W,y:-999,w:0,h:0,e:1});
      el.querySelector('small').textContent=(left?'◀ ':'')+Math.round(x.d/5)*5+' m · girati'+(left?'':' ▶');return;}el.classList.remove('edge');
    if(Math.abs(rel)>LN_HFOV/2+4||x.d>LN_MAXM||((x.k==='att'||x.k==='srv')&&(nvis>=14||(x.k==='att'&&x.d>350)))){el.style.display='none';return;}el.style.display='';nvis++;
    const s=Math.max(.62,1.05-x.d/LN_MAXM*.45);const X=W/2+rel/LN_HFOV*W;let Y=hor-90-Math.min(1,x.d/LN_MAXM)*H*.2;
    const w=(el.offsetWidth||140)*s,hh=34*s;for(let k=0;k<6;k++){const hit=used.some(u=>Math.abs(u.x-X)<(u.w+w)/2&&Math.abs(u.y-Y)<(u.h+hh)/2);if(!hit)break;Y-=hh+4;}used.push({x:X,y:Y,w,h:hh});
    el.style.transform=`translate(${Math.round(X-w/2)}px,${Math.round(Y)}px) scale(${s.toFixed(2)})`;el.querySelector('small').textContent=(x.d<1000?Math.round(x.d/5)*5+' m':'')+(x.k==='mia'?' · tocca per potenziarla':'');});
  const n=L.root.querySelector('.lnn');if(n)n.textContent=['N','NE','E','SE','S','SO','O','NO'][Math.round(head/45)%8]+' '+Math.round(head)+'°'+(L.acc?' · GPS ±'+Math.round(L.acc)+' m':'');
  if(performance.now()-(L.aimT||0)>350){L.aimT=performance.now();lnAim(head);if(!document.querySelector('#sheet.open'))document.documentElement.classList.remove('lente-top');}}
/* ---- MIRINO: quale edificio stai inquadrando (raggio dalla tua posizione verso dove punta il telefono) ---- */
function lnInRing(R,x,y){let c=false;for(let i=0,j=R.length-1;i<R.length;j=i++){const[xi,yi]=R[i],[xj,yj]=R[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
function lnRay(bear){const L=LENTE,p=L.pos,a=L.area;if(!p||!a||!a.B||!a.B.length)return null;const r=Math.PI/180,kx=111320*Math.cos(p.lat*r),ky=110540;
  const B=a.B.filter(b=>!b._in&&b.R.some(q=>Math.abs((q[1]-p.lat)*ky)<220&&Math.abs((q[0]-p.lon)*kx)<220));
  for(let d=0;d<=200;d+=3){const la=p.lat+d*Math.cos(bear*r)/ky,lo=p.lon+d*Math.sin(bear*r)/kx;const b=B.find(b=>lnInRing(b.R,lo,la));if(b)return{b,d:Math.max(d,2)};}return null;}
function lnBInfo(b){const L=LENTE;const c=b.R.reduce((q,x)=>[q[0]+x[1]/b.R.length,q[1]+x[0]/b.R.length],[0,0]);
  const row=(L.rows||[]).find(r=>lnInRing(b.R,r.lon,r.lat))||(L.rows||[]).find(r=>trM(r.lat,r.lon,c[0],c[1])<15);
  const mine=(()=>{try{return myHouses().find(h=>h.lat!=null&&(lnInRing(b.R,h.lon,h.lat)||trM(h.lat,h.lon,c[0],c[1])<12));}catch(e){return null;}})();
  const kx=111320*Math.cos(c[0]*Math.PI/180);let A=0;for(let i=0;i<b.R.length;i++){const[x1,y1]=b.R[i],[x2,y2]=b.R[(i+1)%b.R.length];A+=(x1*kx)*(y2*110540)-(x2*kx)*(y1*110540);}
  const tipo={house:'Villetta',detached:'Villetta',semidetached_house:'Bifamiliare',terrace:'Villetta a schiera',apartments:'Condominio',residential:'Palazzina',farm:'Cascina',farm_auxiliary:'Rustico',barn:'Fienile',
    retail:'Negozio',commercial:'Edificio commerciale',industrial:'Capannone',garage:'Garage',garages:'Garage',church:'Chiesa',school:'Scuola',shed:'Capanno',hut:'Capanno'}[b.t.b]||'Edificio';
  const st=mine?(mine.home?'mia-casa':'mia'):row?row.status:'free';
  return{bid:row?row.building_id:(mine&&mine.bid)||b.id,lat:row?row.lat:+c[0].toFixed(6),lon:row?row.lon:+c[1].toFixed(6),st,nick:row&&row.nick,lvl:(row&&row.level)||(mine&&mine.level)||1,mine,
    tipo,piani:b.t.l,mq:Math.round(Math.abs(A)/2),nome:b.t.n,ind:b.t.a};}
function lnAim(head){const L=LENTE,box=L.root&&L.root.querySelector('.lnaim');if(!box)return;if(L.root.querySelector('.lnpan')){box.hidden=true;return;}
  const h=lnRay(head);if(!h){L.aim=null;const k0=L.area?'vuoto':'carico';if(box.dataset.k!==k0){box.dataset.k=k0;box.className='lnaim st-none';
      box.innerHTML=L.area?`<b>🎯 Punta il mirino su una casa</b><small>${L.area.B.length?'Nessuna casa in questa direzione (entro 200 m)':'Non trovo le forme delle case qui: riprova tra poco'}</small>`:'<b><span class="spin"></span> Riconosco le case qui intorno…</b>';}box.hidden=false;return;}const I=lnBInfo(h.b);L.aim={...I,d:h.d};
  const key=I.bid+'|'+I.st+'|'+Math.round(h.d/5);if(box.dataset.k===key&&!box.hidden)return;box.dataset.k=key;box.hidden=false;
  const S2={'mia-casa':['❤️','Casa tua','Tocca per potenziarla'],mia:['🔑','La tua casa','Tocca per potenziarla'],myhome:['❤️','Casa tua','Tocca per potenziarla'],mine:['🔑','La tua casa','Tocca per potenziarla'],
    home:['🏠',I.nick?'Casa di @'+I.nick:'Casa abitata','Tocca per vederla'],owned:['🔑',I.nick?'Comprata da @'+I.nick:'Casa comprata','Tocca per vederla'],free:['🏚️','Edificio libero','👆 Tocca per comprarla']}[I.st]||['🏚️','Edificio','Tocca per vederlo'];
  box.className='lnaim st-'+I.st;
  box.innerHTML=`<b>${S2[0]} ${esc(S2[1])} · ${esc(I.tipo)}</b><small>${[I.nome&&esc(I.nome),I.ind&&esc(I.ind),I.piani&&I.piani+' piani',I.mq>8&&I.mq+' m²','livello '+I.lvl,Math.round(h.d)+' m'].filter(Boolean).join(' · ')}</small><span>${S2[2]}</span>`;}
/* una scheda chiesta dalla Lente si apre sopra la fotocamera (gli altri avvisi dell'app restano sotto) */
function lnSheet(fn){document.documentElement.classList.add('lente-top');try{fn();}catch(e){}}
/* tocco su un edificio (mirino o punto dello schermo): la scheda del mondo, sopra la Lente */
function lnOpenB(I){if(!I)return;if(I.mine){lnPanel(I.mine);return;}if(!S.user){toast('Accedi per comprare case');return;}try{sfx&&sfx('click');}catch(e){}lnSheet(()=>wSheet(I.bid,I.lat,I.lon));}
function lnTap(x){const L=LENTE;const head=((L.h==null?0:L.h)+L.man+360)%360;const W=L.root.clientWidth;const h=lnRay((head+(x/W-.5)*LN_HFOV+360)%360);
  if(!h){toast(L.area?'Non vedo una casa lì: punta il mirino sulla casa':'Sto ancora riconoscendo le case qui intorno…');return;}lnOpenB(lnBInfo(h.b));}
/* scheda di un servizio o di un'attività, dentro la Lente */
function lnPoiCard(x){const L=LENTE;if(!L.root)return;let pan=L.root.querySelector('.lnpan');if(!pan){pan=document.createElement('div');pan.className='lnpan';L.root.appendChild(pan);['pointerdown','pointermove','pointerup'].forEach(k=>pan.addEventListener(k,e=>e.stopPropagation()));}
  const d=L.pos?Math.round(trM(L.pos.lat,L.pos.lon,x.lat,x.lon)):null;
  pan.innerHTML=`<div class="lnph"><div><b>${x.ic} ${esc(x.name)}</b><span>${esc(x.cat)}${d!=null?' · '+d+' m':''}</span></div><button class="lnpx" data-lnpx type="button" aria-label="Chiudi">✕</button></div>
   <div class="lnpb">${x.ind?`<p style="margin:0">📍 ${esc(x.ind)}</p>`:''}${x.ore?`<p style="margin:0">🕘 ${esc(x.ore)}</p>`:''}${x.tel?`<p style="margin:0">📞 <a href="tel:${esc(x.tel.replace(/\s/g,''))}">${esc(x.tel)}</a></p>`:''}
   ${x.srv?'<p class="muted" style="margin:0;font-size:13px">Un servizio vicino fa salire la Vivibilità della tua zona.</p>':''}
   <a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}">🧭 Portami lì</a></div>`;
  pan.querySelector('[data-lnpx]').onclick=()=>pan.remove();}
/* zombie a fumetto: all'ora dell'orda (20 minuti) o per 25 s con "Fai passare l'orda" */
function lnZombies(now){const L=LENTE,box=L.root.querySelector('.lnz');const live=(typeof orLive==='function'&&orLive())||Date.now()<L.prevUntil;
  if(!live){if(L.z.length){L.z.forEach(z=>z.el.remove());L.z=[];}return;}
  const W=L.root.clientWidth,H=L.root.clientHeight;
  if(L.z.length<6&&Math.random()<.04){const el=document.createElement('div');el.className='lnzb';el.textContent=['🧟','🧟‍♂️','🧟‍♀️'][Math.floor(Math.random()*3)];box.appendChild(el);
    lnBoom();const left=Math.random()<.5;L.z.push({el,x:left?-.1:1.1,y:.62+Math.random()*.12,vx:(left?1:-1)*(.0006+Math.random()*.0007),vy:.00025+Math.random()*.0002,s:.6,t0:now,ph:Math.random()*6});}
  L.z=L.z.filter(z=>{const dt=Math.min(60,now-(z.tl||now));z.tl=now;z.x+=z.vx*dt*.06;z.y+=z.vy*dt*.06;z.s=Math.min(1.5,z.s+.00025*dt);
    if(z.x<-.25||z.x>1.25||z.y>1.05){z.el.remove();return false;}
    const bob=Math.sin((now-z.t0)/140+z.ph)*6,tilt=Math.sin((now-z.t0)/260+z.ph)*9;
    z.el.style.transform=`translate(${Math.round(z.x*W)}px,${Math.round(z.y*H+bob)}px) rotate(${tilt.toFixed(1)}deg) scale(${(z.s*(z.vx<0?-1:1)).toFixed(2)},${z.s.toFixed(2)})`;return true;});}
function lnStatus(){const L=LENTE,s=L.root&&L.root.querySelector('.lnst');if(!s)return;const n=L.T.length;
  s.textContent=!L.pos?'📍 Cerco la tua posizione…':!L.bussola?'🧭 Bussola spenta: trascina col dito per girarti':(n?`👀 ${n} cose qui intorno`:'Niente di segnato qui intorno')+(L.area?` · 🏠 ${L.area.B.length} case riconosciute`:' · 🏠 cerco le case…');
  const o=L.root.querySelector('.lnor');if(o){const s2=typeof OR!=='undefined'&&OR.s;const live=typeof orLive==='function'&&orLive();
    if(live)o.textContent='🧟 L’ORDA È QUI!';else if(s2&&s2.next_at){const m=Math.max(0,Math.round((new Date(s2.next_at)-Date.now())/60000));o.textContent=`🧟 Orda tra ${m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min'}`;}else o.textContent='🧟 Le orde arrivano alle 9:00 e alle 21:00';}}
/* apertura: va chiamata da un tocco (iPhone chiede i permessi solo così) */
async function lenteOpen(){if(LENTE.on)return;const L=LENTE;
  /* iPhone: il permesso della bussola va chiesto subito, dentro il tocco */
  let perm=Promise.resolve('granted');try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')perm=DeviceOrientationEvent.requestPermission().catch(()=>'denied');}catch(e){}
  try{closeSheet();}catch(e){}try{zmClose();}catch(e){}
  Object.assign(L,{on:true,h:null,man:0,T:[],z:[],frames:0,pos:null,tpos:null,bussola:false,prevUntil:0,acc:null,gps:false,area:null,areaBusy:false,rows:[],aim:null});L.els=new Map();
  const r=document.createElement('div');r.id='lente';r.className='lente';
  r.innerHTML=`<video class="lnv" playsinline muted autoplay></video><canvas class="lnc"></canvas><div class="lnz"></div><div class="lnl"></div>
    <div class="lntop"><button class="lnx" data-lnx type="button" aria-label="Chiudi">✕</button><div class="lntt"><b>📷 Lente</b><span class="lnst">Accendo la fotocamera…</span></div><span class="lnn"></span></div>
    <div class="lnret" aria-hidden="true"></div><button class="lnaim" type="button" hidden></button>
    <div class="lnbot"><span class="lnor"></span><button class="lnprev" data-lnprev type="button">👀 Fai passare l’orda</button></div>
    <p class="lnpriv">Niente foto salvate o inviate: tutto resta sul telefono.</p>`;
  document.body.appendChild(r);L.root=r;document.documentElement.classList.add('lente-on');
  r.querySelector('[data-lnx]').onclick=()=>lenteClose();
  r.querySelector('[data-lnprev]').onclick=()=>{L.prevUntil=Date.now()+25000;try{sfx&&sfx('zombie');}catch(e){}};
  /* senza bussola: si gira trascinando il dito */
  let dx=null,x0=0,t0=0,mv=0;r.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,.lnpan'))return;dx=e.clientX;x0=e.clientX;t0=Date.now();mv=0;});
  r.addEventListener('pointermove',e=>{if(dx==null)return;mv=Math.max(mv,Math.abs(e.clientX-x0));if(!L.bussola)L.man-=(e.clientX-dx)/r.clientWidth*LN_HFOV;dx=e.clientX;});
  /* tocco breve sull'inquadratura (non un trascinamento): l'edificio in quel punto */
  r.addEventListener('pointerup',e=>{if(dx!=null&&mv<12&&Date.now()-t0<600)lnTap(e.clientX);dx=null;});
  ['pointercancel','pointerleave'].forEach(k=>r.addEventListener(k,()=>dx=null));
  r.querySelector('.lnaim').onclick=e=>{e.stopPropagation();if(L.aim)lnOpenB(L.aim);else lnTap(r.clientWidth/2);};
  L.onOri=e=>lnOri(e);window.addEventListener('deviceorientationabsolute',L.onOri);window.addEventListener('deviceorientation',L.onOri);
  L.onVis=()=>{if(document.hidden)lenteClose();};document.addEventListener('visibilitychange',L.onVis);
  /* posizione: GPS del telefono; finché non arriva, quella già nota */
  const g0=S.geo&&S.geo.lat!=null?S.geo:(S.zone&&S.zone.real?{lat:S.zone.real.lat,lon:S.zone.real.lon}:null);if(g0){L.pos={lat:g0.lat,lon:g0.lon};lnRefresh(true);}
  try{L.watch=navigator.geolocation.watchPosition(p=>{const c=p.coords,acc=Math.max(3,c.accuracy||30),now=Date.now();
      /* misura peggiore della precedente (e recente): la ignoro; altrimenti media pesata con la precisione */
      if(L.gps&&acc>L.acc*1.6&&now-L.gpsT<15000)return;
      if(!L.gps)L.pos={lat:c.latitude,lon:c.longitude};else{const w=Math.min(1,Math.max(.2,(L.acc*L.acc)/(L.acc*L.acc+acc*acc)));L.pos={lat:L.pos.lat+(c.latitude-L.pos.lat)*w,lon:L.pos.lon+(c.longitude-L.pos.lon)*w};}
      L.acc=L.gps?Math.min(acc,L.acc*.7+acc*.3):acc;L.gps=true;L.gpsT=now;lnRefresh();},()=>{},{enableHighAccuracy:true,maximumAge:0,timeout:20000});}catch(e){}
  /* fotocamera dietro + filtro fumetto */
  const v=r.querySelector('.lnv'),cv=r.querySelector('.lnc');L.video=v;L.cv=cv;
  try{L.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(!L.on){L.stream.getTracks().forEach(t=>t.stop());return;}v.srcObject=L.stream;try{await v.play();}catch(e){}
    L.G=lnGL(cv);r.classList.toggle('nogl',!L.G);}
  catch(e){r.classList.add('nocam');const s=r.querySelector('.lnst');if(s)s.textContent='📷 Fotocamera non disponibile: consenti la fotocamera a Safari (Impostazioni › Safari › Fotocamera)';}
  perm.then(x=>{if(x!=='granted'){L.bussola=false;}lnStatus();});
  L.stT=setInterval(lnStatus,5000);lnFrame();setTimeout(lnStatus,600);
  /* le mie case: se il mondo non è ancora caricato (Lente aperta dal menu) lo carico e rifaccio le etichette */
  if(S.user&&!(window.W&&W.m)){try{await wMine(true);}catch(e){}if(L.on)lnRefresh(true);}}
/* scritte da fumetto quando arrivano gli zombie */
function lnBoom(){const L=LENTE;if(!L.root||Math.random()>.5)return;const b=document.createElement('div');b.className='lnboom';
  b.textContent=['GRRR!','ARGH!','BRAAAINS!','CRASH!','UÀÀÀH!'][Math.floor(Math.random()*5)];
  b.style.left=Math.round(10+Math.random()*55)+'%';b.style.top=Math.round(38+Math.random()*22)+'%';b.style.setProperty('--r',(Math.random()*24-12).toFixed(0)+'deg');
  L.root.querySelector('.lnz').appendChild(b);setTimeout(()=>b.remove(),1400);}
/* potenzia una mia casa DENTRO la Lente: lo stesso simulatore della pagina della casa (difese, livello, prepara, compra) */
async function lnPanel(h){const L=LENTE;if(!L.root)return;if(!S.user){toast('Accedi per potenziare le tue case');return;}
  let pan=L.root.querySelector('.lnpan');if(!pan){pan=document.createElement('div');pan.className='lnpan';L.root.appendChild(pan);
    ['pointerdown','pointermove','pointerup'].forEach(k=>pan.addEventListener(k,e=>e.stopPropagation()));}
  pan.innerHTML=`<div class="lnph"><div><b>${h.home?'❤️ Casa tua':'🔑 '+esc(h.label||'La tua casa')}</b><span>Potenzia dalla Lente: la fotocamera resta accesa</span></div><button class="lnpx" data-lnpx type="button" aria-label="Chiudi">✕</button></div>
    <div class="lnpb"><div class="thbox"><p><span class="spin"></span> Carico le difese della casa…</p></div>
    <button class="btn ghost small" data-lnpcasa type="button">🏠 Apri tutta la pagina della casa</button></div>`;
  pan.querySelector('[data-lnpx]').onclick=()=>pan.remove();
  pan.querySelector('[data-lnpcasa]').onclick=()=>lnSheet(()=>houseSheet(h));
  try{await thrSection(pan,h,()=>{if(LENTE.on)lnPanel(h);});}catch(e){const b=pan.querySelector('.thbox');if(b)b.innerHTML='<p class="notice">Non riesco a caricare le difese ora: riprova tra poco.</p>';}}
function lenteClose(){const L=LENTE;if(!L.on)return;L.on=false;cancelAnimationFrame(L.raf);clearInterval(L.stT);
  try{L.stream&&L.stream.getTracks().forEach(t=>t.stop());}catch(e){}L.stream=null;
  try{navigator.geolocation.clearWatch(L.watch);}catch(e){}
  window.removeEventListener('deviceorientationabsolute',L.onOri);window.removeEventListener('deviceorientation',L.onOri);document.removeEventListener('visibilitychange',L.onVis);
  try{L.root&&L.root.remove();}catch(e){}L.root=null;L.G=null;L.els=new Map();L.z=[];document.documentElement.classList.remove('lente-on','lente-top');}
</script>
