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
float L(vec2 p){return dot(texture2D(t,of+p*sc).rgb,vec3(.299,.587,.114));}
void main(){vec2 p=v;vec3 c=texture2D(t,of+p*sc).rgb;
 float a=L(p+px*vec2(-1.,-1.)),b=L(p+px*vec2(0.,-1.)),d=L(p+px*vec2(1.,-1.)),e=L(p+px*vec2(-1.,0.)),f=L(p+px*vec2(1.,0.)),g=L(p+px*vec2(-1.,1.)),h=L(p+px*vec2(0.,1.)),i=L(p+px*vec2(1.,1.));
 float gx=-a-2.*e-g+d+2.*f+i,gy=-a-2.*b-d+g+2.*h+i;float ed=length(vec2(gx,gy));
 float l=dot(c,vec3(.299,.587,.114));vec3 q=floor(c*4.+.5)/4.;q=clamp(mix(vec3(dot(q,vec3(.333))),q,1.45),0.,1.);
 q=mix(q,vec3(.97,.84,.29),step(.86,l)*.18);
 vec2 hg=gl_FragCoord.xy/5.;float dd=length(fract(hg)-.5);if(l<.5)q*=mix(1.,.62,step(dd,(.5-l)*1.1));
 q=mix(q,vec3(.078,.059,.122),smoothstep(.22,.42,ed));gl_FragColor=vec4(q,1.);}`;
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
/* cosa c'è intorno: case mie, case del mondo (world_view: il nome solo se il server lo manda), sponsor, presidi */
async function lnTargets(lat,lon){const T=[];const add=(id,ic,t,la,lo,k,act)=>{if(la==null||lo==null)return;const d=trM(lat,lon,la,lo);if(d<=LN_MAXM&&d>=8)T.push({id,ic,t,lat:la,lon:lo,d,k,act});};
  try{myHouses().forEach((h,i)=>add('mh'+i,h.home?'❤️':'🔑',h.home?'Casa tua':'La tua '+h.label.toLowerCase(),h.lat,h.lon,'mia'));}catch(e){}
  const dl=0.0062,dn=dl/Math.max(.2,Math.cos(lat*Math.PI/180));
  try{if(S.user){const rows=await wRpc('world_view',{p_minlat:lat-dl,p_minlon:lon-dn,p_maxlat:lat+dl,p_maxlon:lon+dn})||[];
    rows.forEach(r=>{if(r.status==='home')add('w'+r.building_id,'🏠',r.nick?'@'+r.nick:'Casa abitata',r.lat,r.lon,'casa');
      else if(r.status==='owned')add('w'+r.building_id,'🔑',r.nick?'Casa di @'+r.nick:'Casa comprata',r.lat,r.lon,'casa');});}}catch(e){}
  try{Object.entries(window.SP_GEO||{}).forEach(([k,g])=>{if(g&&SPONSORS[k])add('s'+k,'⭐',SPONSORS[k].name,g.lat,g.lon,'sp',()=>sponsorSheet(k,S.zone||{seed:7}));});}catch(e){}
  try{if(typeof SB!=='undefined'&&SB){const{data}=await SB.rpc('world_presidi_list',{p_minlat:lat-dl,p_minlon:lon-dn,p_maxlat:lat+dl,p_maxlon:lon+dn});
    if(data&&data.presidi){PRES.d=data;PRES.L=data.presidi;data.presidi.forEach(p=>add('p'+p.id,(PRES_K[p.kind]||['🚩'])[0],p.name+(p.stato==='mio'?' · tuo':p.stato==='libero'?' · libero':''),p.lat,p.lon,'pres-'+p.stato,()=>presSheet(p.id)));}}}catch(e){}
  /* due etichette nello stesso punto: tengo la prima */
  const out=[];T.sort((a,b)=>a.d-b.d).forEach(x=>{if(!out.some(y=>trM(x.lat,x.lon,y.lat,y.lon)<12))out.push(x);});return out.slice(0,40);}
async function lnRefresh(force){const L=LENTE,p=L.pos;if(!p||!L.on)return;if(!force&&L.tpos&&trM(L.tpos.lat,L.tpos.lon,p.lat,p.lon)<120)return;L.tpos={lat:p.lat,lon:p.lon};
  const T=await lnTargets(p.lat,p.lon);if(!L.on)return;L.T=T;const ids=new Set(T.map(x=>x.id));L.els.forEach((el,id)=>{if(!ids.has(id)){el.remove();L.els.delete(id);}});
  const box=L.root.querySelector('.lnl');T.forEach(x=>{if(L.els.has(x.id))return;const el=document.createElement('button');el.className='lnlab k-'+x.k;el.type='button';
    el.innerHTML=`<b>${x.ic} ${esc(x.t.slice(0,34))}</b><small></small>`;if(x.act)el.onclick=e=>{e.stopPropagation();const a=x.act;lenteClose();setTimeout(a,60);};box.appendChild(el);L.els.set(x.id,el);});
  lnStatus();}
/* le etichette davanti, alla direzione giusta; più lontane = più in alto e più piccole */
function lnLabels(){const L=LENTE,p=L.pos;if(!p)return;const W=L.root.clientWidth,H=L.root.clientHeight;const head=((L.h==null?0:L.h)+L.man+360)%360;
  const hor=H*.52-((L.beta||90)-90)/LN_VFOV*H;const used=[];
  L.T.forEach(x=>{const el=L.els.get(x.id);if(!el)return;x.d=trM(p.lat,p.lon,x.lat,x.lon);const rel=((lnBearing(p.lat,p.lon,x.lat,x.lon)-head+540)%360)-180;
    if(Math.abs(rel)>LN_HFOV/2+4||x.d>LN_MAXM){el.style.display='none';return;}el.style.display='';
    const s=Math.max(.62,1.05-x.d/LN_MAXM*.45);const X=W/2+rel/LN_HFOV*W;let Y=hor-30-Math.min(1,x.d/LN_MAXM)*H*.22;
    const w=(el.offsetWidth||140)*s,hh=34*s;for(let k=0;k<6;k++){const hit=used.some(u=>Math.abs(u.x-X)<(u.w+w)/2&&Math.abs(u.y-Y)<(u.h+hh)/2);if(!hit)break;Y-=hh+4;}used.push({x:X,y:Y,w,h:hh});
    el.style.transform=`translate(${Math.round(X-w/2)}px,${Math.round(Y)}px) scale(${s.toFixed(2)})`;el.querySelector('small').textContent=x.d<1000?Math.round(x.d/5)*5+' m':'';});
  const n=L.root.querySelector('.lnn');if(n)n.textContent=['N','NE','E','SE','S','SO','O','NO'][Math.round(head/45)%8]+' '+Math.round(head)+'°';}
/* zombie a fumetto: all'ora dell'orda (20 minuti) o per 25 s con "Fai passare l'orda" */
function lnZombies(now){const L=LENTE,box=L.root.querySelector('.lnz');const live=(typeof orLive==='function'&&orLive())||Date.now()<L.prevUntil;
  if(!live){if(L.z.length){L.z.forEach(z=>z.el.remove());L.z=[];}return;}
  const W=L.root.clientWidth,H=L.root.clientHeight;
  if(L.z.length<6&&Math.random()<.04){const el=document.createElement('div');el.className='lnzb';el.textContent=['🧟','🧟‍♂️','🧟‍♀️'][Math.floor(Math.random()*3)];box.appendChild(el);
    const left=Math.random()<.5;L.z.push({el,x:left?-.1:1.1,y:.62+Math.random()*.12,vx:(left?1:-1)*(.0006+Math.random()*.0007),vy:.00025+Math.random()*.0002,s:.6,t0:now,ph:Math.random()*6});}
  L.z=L.z.filter(z=>{const dt=Math.min(60,now-(z.tl||now));z.tl=now;z.x+=z.vx*dt*.06;z.y+=z.vy*dt*.06;z.s=Math.min(1.5,z.s+.00025*dt);
    if(z.x<-.25||z.x>1.25||z.y>1.05){z.el.remove();return false;}
    const bob=Math.sin((now-z.t0)/140+z.ph)*6,tilt=Math.sin((now-z.t0)/260+z.ph)*9;
    z.el.style.transform=`translate(${Math.round(z.x*W)}px,${Math.round(z.y*H+bob)}px) rotate(${tilt.toFixed(1)}deg) scale(${(z.s*(z.vx<0?-1:1)).toFixed(2)},${z.s.toFixed(2)})`;return true;});}
function lnStatus(){const L=LENTE,s=L.root&&L.root.querySelector('.lnst');if(!s)return;const n=L.T.length;
  s.textContent=!L.pos?'📍 Cerco la tua posizione…':!L.bussola?'🧭 Bussola spenta: trascina col dito per girarti':n?`👀 ${n} cose qui intorno (entro ${LN_MAXM} m)`:'Niente di segnato qui intorno (entro 600 m)';
  const o=L.root.querySelector('.lnor');if(o){const s2=typeof OR!=='undefined'&&OR.s;const live=typeof orLive==='function'&&orLive();
    if(live)o.textContent='🧟 L’ORDA È QUI!';else if(s2&&s2.next_at){const m=Math.max(0,Math.round((new Date(s2.next_at)-Date.now())/60000));o.textContent=`🧟 Prossima orda tra ${m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min'}`;}else o.textContent='🧟 Le orde arrivano alle 9:00 e alle 21:00';}}
/* apertura: va chiamata da un tocco (iPhone chiede i permessi solo così) */
async function lenteOpen(){if(LENTE.on)return;const L=LENTE;
  /* iPhone: il permesso della bussola va chiesto subito, dentro il tocco */
  let perm=Promise.resolve('granted');try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')perm=DeviceOrientationEvent.requestPermission().catch(()=>'denied');}catch(e){}
  try{closeSheet();}catch(e){}try{zmClose();}catch(e){}
  Object.assign(L,{on:true,h:null,man:0,T:[],z:[],frames:0,pos:null,tpos:null,bussola:false,prevUntil:0});L.els=new Map();
  const r=document.createElement('div');r.id='lente';r.className='lente';
  r.innerHTML=`<video class="lnv" playsinline muted autoplay></video><canvas class="lnc"></canvas><div class="lnz"></div><div class="lnl"></div>
    <div class="lntop"><button class="lnx" data-lnx type="button" aria-label="Chiudi">✕</button><div class="lntt"><b>📷 Lente</b><span class="lnst">Accendo la fotocamera…</span></div><span class="lnn"></span></div>
    <div class="lnbot"><span class="lnor"></span><button class="lnprev" data-lnprev type="button">👀 Fai passare l’orda</button></div>
    <p class="lnpriv">Niente foto salvate o inviate: tutto resta sul telefono.</p>`;
  document.body.appendChild(r);L.root=r;document.documentElement.classList.add('lente-on');
  r.querySelector('[data-lnx]').onclick=()=>lenteClose();
  r.querySelector('[data-lnprev]').onclick=()=>{L.prevUntil=Date.now()+25000;try{sfx&&sfx('zombie');}catch(e){}};
  /* senza bussola: si gira trascinando il dito */
  let dx=null;r.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;dx=e.clientX;});r.addEventListener('pointermove',e=>{if(dx==null)return;L.man-=(e.clientX-dx)/r.clientWidth*LN_HFOV;dx=e.clientX;});
  ['pointerup','pointercancel','pointerleave'].forEach(k=>r.addEventListener(k,()=>dx=null));
  L.onOri=e=>lnOri(e);window.addEventListener('deviceorientationabsolute',L.onOri);window.addEventListener('deviceorientation',L.onOri);
  L.onVis=()=>{if(document.hidden)lenteClose();};document.addEventListener('visibilitychange',L.onVis);
  /* posizione: GPS del telefono; finché non arriva, quella già nota */
  const g0=S.geo&&S.geo.lat!=null?S.geo:(S.zone&&S.zone.real?{lat:S.zone.real.lat,lon:S.zone.real.lon}:null);if(g0){L.pos={lat:g0.lat,lon:g0.lon};lnRefresh(true);}
  try{L.watch=navigator.geolocation.watchPosition(p=>{L.pos={lat:p.coords.latitude,lon:p.coords.longitude};lnRefresh();},()=>{},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});}catch(e){}
  /* fotocamera dietro + filtro fumetto */
  const v=r.querySelector('.lnv'),cv=r.querySelector('.lnc');L.video=v;L.cv=cv;
  try{L.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(!L.on){L.stream.getTracks().forEach(t=>t.stop());return;}v.srcObject=L.stream;try{await v.play();}catch(e){}
    L.G=lnGL(cv);r.classList.toggle('nogl',!L.G);}
  catch(e){r.classList.add('nocam');const s=r.querySelector('.lnst');if(s)s.textContent='📷 Fotocamera non disponibile: consenti la fotocamera a Safari (Impostazioni › Safari › Fotocamera)';}
  perm.then(x=>{if(x!=='granted'){L.bussola=false;}lnStatus();});
  L.stT=setInterval(lnStatus,5000);lnFrame();setTimeout(lnStatus,600);}
function lenteClose(){const L=LENTE;if(!L.on)return;L.on=false;cancelAnimationFrame(L.raf);clearInterval(L.stT);
  try{L.stream&&L.stream.getTracks().forEach(t=>t.stop());}catch(e){}L.stream=null;
  try{navigator.geolocation.clearWatch(L.watch);}catch(e){}
  window.removeEventListener('deviceorientationabsolute',L.onOri);window.removeEventListener('deviceorientation',L.onOri);document.removeEventListener('visibilitychange',L.onVis);
  try{L.root&&L.root.remove();}catch(e){}L.root=null;L.G=null;L.els=new Map();L.z=[];document.documentElement.classList.remove('lente-on');}
</script>
