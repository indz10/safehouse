<script>
/* 🏙️ MAPPA DEL GIOCO IN 3D (Fase 63)
   Solo la mappa del 🎮 Gioco (il Mondo resta com'è). Tre cose:
   • palazzi con le finestre (disegni fatti col canvas, `fill-extrusion-pattern` di MapLibre: 6 colori, di sera finestre accese);
   • mezzi, superstite, zombie e casse come modelli 3D (Three.js, in `pwa/three.min.js` → `dist/three.min.js`, caricato solo
     quando si apre il Gioco) dentro la mappa, in uno strato personalizzato che condivide la profondità con i palazzi;
   • se il telefono è debole, Three.js non si carica o qualcosa va storto, resta il disegno di prima (GM.no2d = false).
   Assi: x = est, y = su, z = sud (in metri da GM.c0), come gmXY. I modelli sono ingranditi (G3_K) per vederli bene. */
const G3={P:null,L:null,obj:{},me:null,meK:'',on:false};
function gmNome(x,cx,cy){const n=((typeof SV!=='undefined'&&SV.d&&SV.d.nome)||(S.user&&S.user.nick)||'Tu');x.font='bold 11px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText(n,cx+1,cy-41);x.fillStyle='#fff';x.fillText(n,cx,cy-42);}
function g3Puo(){try{if(localStorage.getItem('zsh_3d')==='0')return false;}catch(e){}return!(navigator.deviceMemory&&navigator.deviceMemory<2);}
function g3Load(){if(window.THREE&&THREE.WebGLRenderer)return Promise.resolve(THREE);if(G3.P)return G3.P;
  const t=src=>new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=()=>window.THREE?ok(THREE):ko();s.onerror=ko;document.head.appendChild(s);});
  G3.P=t('three.min.js').catch(()=>t('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js')).catch(()=>{G3.P=null;return null;});return G3.P;}
// 🪟 finestre sui palazzi (di sera accese); il tetto chiaro (bld-tetto) copre la faccia di sopra
const G3_MURI=['#8a5a9c','#4f7fa0','#a06a4f','#4f9a7a','#a0904f','#7a6aa8'];
function g3Finestre(m,lid){lid=lid||'bld';if(!m||!m.addImage||!m.setPaintProperty)return;const h=new Date().getHours(),notte=h>=18||h<7;
  G3_MURI.forEach((c,k)=>{const W=32,H=32,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle=c;x.fillRect(0,0,W,H);
    x.fillStyle='rgba(0,0,0,.22)';x.fillRect(0,H-3,W,3);x.fillStyle='rgba(255,255,255,.08)';x.fillRect(0,0,2,H);
    for(let i=0;i<2;i++)for(let j=0;j<2;j++){const acc=((k*7+i*3+j*5)%5)<(notte?3:1);x.fillStyle='#14101c';x.fillRect(3+i*16,4+j*14,10,10);x.fillStyle=acc?'#ffd86b':'#33456a';x.fillRect(4+i*16,5+j*14,8,8);
      x.fillStyle='rgba(255,255,255,.28)';x.fillRect(4+i*16,5+j*14,8,2);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(8+i*16,5+j*14,1,8);}
    try{if(!(m.hasImage&&m.hasImage('fin'+k)))m.addImage('fin'+k,x.getImageData(0,0,W,H),{pixelRatio:2});}catch(e){}});
  try{m.setPaintProperty(lid,'fill-extrusion-pattern',['concat','fin',['to-string',['%',['to-number',['id'],0],6]]]);}catch(e){}}
// ── pezzi dei modelli
function g3Mat(c,em){return new THREE.MeshLambertMaterial({color:c,emissive:em||0x000000});}
function g3Box(w,h,d,c,x,y,z,em){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),g3Mat(c,em));m.position.set(x,y,z);return m;}
function g3Ombra(r){const m=new THREE.Mesh(new THREE.CircleGeometry(r,18),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.35,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.04;return m;}
function g3Ruota(r,w,x,z){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,14),g3Mat(0x151515));t.rotation.x=Math.PI/2;g.add(t);
  const c=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r*.5,w+.02,10),g3Mat(0xb0b0b8));c.rotation.x=Math.PI/2;g.add(c);g.position.set(x,r,z);g.userData.ruota=1;return g;}
// superstite o zombie (avanti = +x)
function g3Persona(seduto,o){o=o||{};const g=new THREE.Group();const pelle=o.pelle||0xf1c27d,maglia=o.maglia||0xffd23f,pant=o.pant||0x24315e;
  const gl=new THREE.Group(),gr=new THREE.Group();[gl,gr].forEach((gg,i)=>{gg.position.set(0,.9,(i?1:-1)*.15);gg.add(g3Box(.22,.86,.22,pant,0,-.43,0));gg.add(g3Box(.3,.1,.24,0x141414,.04,-.86,0));g.add(gg);});
  if(seduto){gl.rotation.z=gr.rotation.z=1.35;}
  g.add(g3Box(.34,.72,.56,maglia,0,1.26,0));g.add(g3Box(.36,.12,.58,0x1a1a1a,0,.92,0));
  const al=new THREE.Group(),ar=new THREE.Group();[al,ar].forEach((gg,i)=>{gg.position.set(0,1.56,(i?1:-1)*.36);gg.add(g3Box(.16,.62,.16,o.zombie?pelle:maglia,0,-.31,0));gg.add(g3Box(.17,.14,.17,pelle,0,-.66,0));g.add(gg);});
  if(o.zombie)al.rotation.z=ar.rotation.z=1.45;
  g.add(g3Box(.4,.4,.4,pelle,0,1.84,0));
  if(o.zombie){g.add(g3Box(.05,.07,.08,0xff2020,.205,1.88,.1,0xff0000),g3Box(.05,.07,.08,0xff2020,.205,1.88,-.1,0xff0000),g3Box(.05,.06,.18,0x3a0a0a,.205,1.73,0));
    g.add(g3Box(.42,.1,.42,0x2a3a1a,0,2.06,0));}
  else{g.add(g3Box(.42,.09,.42,0xe8212e,0,1.97,0),g3Box(.42,.08,.42,0x3a2412,0,2.06,0),g3Box(.05,.06,.06,0x111111,.205,1.87,.1),g3Box(.05,.06,.06,0x111111,.205,1.87,-.1));}
  if(o.extra)o.extra(g);
  g.userData={gl,gr,al,ar,zombie:!!o.zombie};if(!seduto)g.add(g3Ombra(.6));return g;}
const G3_ACC={re:g=>{g.add(g3Box(.44,.14,.44,0xffd23f,0,2.16,0,0x553300));[-.15,0,.15].forEach(z=>g.add(g3Box(.08,.12,.08,0xffd23f,0,2.28,z,0x553300)));},
  soldato:g=>g.add(g3Box(.48,.16,.48,0x3d4a24,0,2.12,0)),operaio:g=>g.add(g3Box(.5,.14,.5,0xffd23f,0,2.12,0)),
  strega:g=>{const c=new THREE.Mesh(new THREE.ConeGeometry(.28,.6,10),g3Mat(0x1a1a24));c.position.set(0,2.4,0);g.add(c);g.add(g3Box(.7,.04,.7,0x1a1a24,0,2.12,0));},
  clown:g=>{g.add(g3Box(.1,.1,.1,0xff2a2a,.24,1.8,0));g.add(g3Box(.2,.25,.2,0x3df2ff,0,1.95,.28),g3Box(.2,.25,.2,0x3df2ff,0,1.95,-.28));},
  dottore:g=>g.add(g3Box(.38,.6,.6,0xe8e8e8,-.02,1.22,0)),urlatrice:g=>g.add(g3Box(.1,.7,.44,0xd9d9d9,-.2,1.75,0))};
function g3Cane(){const g=new THREE.Group();const c=0x6a7a4a;g.add(g3Box(1.1,.45,.4,c,0,.75,0),g3Box(.45,.4,.36,c,.7,.95,0),g3Box(.2,.15,.2,0x3a0a0a,.95,.86,0));
  const L=[];[[.4,.15],[.4,-.15],[-.4,.15],[-.4,-.15]].forEach(p=>{const gg=new THREE.Group();gg.position.set(p[0],.6,p[1]);gg.add(g3Box(.14,.6,.14,c,0,-.3,0));g.add(gg);L.push(gg);});
  g.add(g3Box(.06,.06,.06,0xff2020,.93,1.02,.1,0xff0000),g3Box(.06,.06,.06,0xff2020,.93,1.02,-.1,0xff0000),g3Ombra(.7));g.userData={zampe:L,cane:1};return g;}
function g3Zombie(z){if(z.k==='cassa'){const g=new THREE.Group();g.add(g3Box(1.1,.8,.8,0x8a5a2b,0,.4,0),g3Box(1.12,.12,.82,0x5a3a1a,0,.62,0),g3Box(.14,.82,.84,0x5a3a1a,0,.4,0),g3Box(.3,.1,.3,0xffd23f,0,.86,0,0x664400),g3Ombra(.8));g.userData.cassa=1;return g;}
  if(z.tipo==='cane')return g3Cane();const zl=(typeof ARN_ZL!=='undefined'&&ARN_ZL[z.tipo])||{s:1,pelle:'#8fbf6a',maglia:'#6b5a8a'};
  const g=g3Persona(false,{zombie:true,pelle:zl.pelle,maglia:zl.maglia,pant:0x3b3346,extra:G3_ACC[z.tipo]});g.scale.setScalar(zl.s||1);return g;}
function g3Mezzo(mz){if(mz==='piedi'){const p=g3Persona(false,{maglia:(typeof SV_C!=='undefined'&&typeof SV!=='undefined'&&SV.d&&SV.d.avatar&&SV_C[SV.d.avatar.c||0])||0xffd23f});return p;}
  const g=new THREE.Group();const col={bici:0x22c8e0,moto:0xff3df2,auto:0xe8212e,fuori:0x5a6e34,furgone:0xeeeeee}[mz]||0xe8212e;
  if(mz==='bici'||mz==='moto'){const L=mz==='moto'?2.2:1.8;g.add(g3Ruota(.36,.12,-L/2+.36,0),g3Ruota(.36,.12,L/2-.36,0));
    g.add(g3Box(L-.5,mz==='moto'?.42:.08,mz==='moto'?.28:.08,col,0,mz==='moto'?.66:.72,0));g.add(g3Box(.08,.6,.08,0x333333,L/2-.38,.85,0),g3Box(.08,.08,.7,0x222222,L/2-.38,1.15,0));
    if(mz==='moto')g.add(g3Box(.6,.2,.34,0x222222,-.15,.95,0),g3Box(.1,.14,.16,0xfff3b0,L/2-.25,1,0,0xffe066),g3Box(.08,.1,.14,0xff2a2a,-L/2+.1,.85,0,0x990000));
    const p=g3Persona(true,{maglia:0xffd23f});p.position.set(-.15,mz==='moto'?.3:.25,0);p.userData.al.rotation.z=p.userData.ar.rotation.z=1.2;g.add(p);g.add(g3Ombra(1.1));return g;}
  const L={auto:4.4,fuori:4.8,furgone:5.6}[mz]||4.4,W=mz==='furgone'?2.1:1.9,H=mz==='furgone'?2.3:(mz==='fuori'?1.15:.85),hb=mz==='fuori'?.6:.42,R=mz==='fuori'?.48:.37;
  [-1,1].forEach(sx=>[-1,1].forEach(sz=>g.add(g3Ruota(R,.32,sx*(L/2-.9),sz*(W/2-.02)))));
  g.add(g3Box(L,H,W,col,0,hb+H/2,0));g.add(g3Box(L+.04,.1,W+.04,0x1a1a1a,0,hb+.05,0));
  if(mz==='furgone'){g.add(g3Box(.05,.8,W-.4,0x9fd3ff,L/2+.01,hb+H-.6,0),g3Box(L-1.4,.14,W+.02,0xe8212e,-.6,hb+H*.55,0));
    g.add(g3Box(1.1,.6,.04,0x9fd3ff,L/2-.8,hb+H-.6,W/2+.01),g3Box(1.1,.6,.04,0x9fd3ff,L/2-.8,hb+H-.6,-W/2-.01));}
  else{const cl=L*.5;g.add(g3Box(cl,.72,W-.16,0x9fd3ff,-.25,hb+H+.36,0));g.add(g3Box(cl-.5,.74,W-.12,col,-.3,hb+H+.36,0));g.add(g3Box(cl+.02,.07,W-.12,col,-.25,hb+H+.75,0));
    g.add(g3Box(.06,.06,W-.1,0xffffff,-.25,hb+H+.8,0));if(mz==='fuori')g.add(g3Box(cl-.2,.12,W-.3,0x222222,-.3,hb+H+.9,0),g3Box(.5,.5,.5,0x333333,-L/2-.2,hb+H*.6,0));
    if(mz==='auto')g.add(g3Box(L*.9,.05,.18,0xffffff,0,hb+H+.01,0));}
  g.add(g3Box(.06,.22,.38,0xfff3b0,L/2+.01,hb+H*.62,W/2-.35,0xffe066),g3Box(.06,.22,.38,0xfff3b0,L/2+.01,hb+H*.62,-W/2+.35,0xffe066));
  g.add(g3Box(.06,.2,.32,0xff2a2a,-L/2-.01,hb+H*.62,W/2-.3,0x990000),g3Box(.06,.2,.32,0xff2a2a,-L/2-.01,hb+H*.62,-W/2+.3,0x990000));
  g.add(g3Box(.14,.26,W*.8,0x222222,L/2+.04,hb+.2,0),g3Box(.14,.26,W*.8,0x222222,-L/2-.04,hb+.2,0));
  const luce=new THREE.Mesh(new THREE.PlaneGeometry(6,3.2),new THREE.MeshBasicMaterial({color:0xffe66d,transparent:true,opacity:.18,depthWrite:false}));luce.rotation.x=-Math.PI/2;luce.position.set(L/2+3,.06,0);g.add(luce);g.userData.luce=luce;
  g.add(g3Ombra(2.3));return g;}
// ── strato 3D dentro la mappa
function g3Strato(){const T=THREE;return{id:'g3',type:'custom',renderingMode:'3d',
  onAdd(map,gl){this.cam=new T.Camera();this.sc=new T.Scene();this.sc.add(new T.AmbientLight(0xffffff,.75));const d=new T.DirectionalLight(0xffffff,1.1);d.position.set(-40,90,-30);this.sc.add(d);
    const d2=new T.DirectionalLight(0xb8a0ff,.35);d2.position.set(50,40,60);this.sc.add(d2);
    this.r=new T.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.r.autoClear=false;G3.L=this;},
  render(gl,mtx){try{if(!GM.c0||!GM.on)return;const c=GM.c0,mc=maplibregl.MercatorCoordinate.fromLngLat([c.lon,c.lat],0),s=mc.meterInMercatorCoordinateUnits();
    const l=new T.Matrix4().makeTranslation(mc.x,mc.y,mc.z).scale(new T.Vector3(s,-s,s)).multiply(new T.Matrix4().makeRotationAxis(new T.Vector3(1,0,0),Math.PI/2));
    this.cam.projectionMatrix=new T.Matrix4().fromArray(mtx).multiply(l);g3Update(this.sc);this.r.resetState();this.r.render(this.sc,this.cam);GM.map.triggerRepaint();}
    catch(e){G3.err=String(e&&e.message||e);GM.no2d=false;}}};}
function g3K(){const z=(GM.map&&GM.map.getZoom&&GM.map.getZoom())||18;return Math.max(2.4,Math.min(9,2.4*Math.pow(2,18-z)));}
function g3Cammina(g,t,v){const u=g.userData;if(!u)return;if(u.gl){const a=v?Math.sin(t*9)*.6:0;u.gl.rotation.z=a;u.gr.rotation.z=-a;if(!u.zombie){u.al.rotation.z=-a*.7;u.ar.rotation.z=a*.7;}else{u.al.rotation.z=1.45+Math.sin(t*3)*.12;u.ar.rotation.z=1.45+Math.sin(t*3+1)*.12;}}
  if(u.zampe)u.zampe.forEach((z,i)=>z.rotation.z=v?Math.sin(t*12+(i%2?Math.PI:0))*.6:0);}
function g3Update(sc){const T=GM.t||0,k=g3K(),s=GM.lastS||{};
  // il superstite (o il suo mezzo): in viaggio verso lo zombie, altrimenti dove l'hai guidato
  const mz=gmMz(),viaggio=s.m&&!s.fermo;let x,y,a,va;
  if(viaggio){x=s.x;y=s.y;a=s.a||0;va=true;}else if(GM.av){const p=gmXY(GM.av.lat,GM.av.lon);x=p[0];y=p[1];a=GM.av.a||0;va=!!GM.av.P;}
  if(G3.meK!==mz){if(G3.me)sc.remove(G3.me);G3.me=g3Mezzo(mz);G3.meK=mz;sc.add(G3.me);}
  const me=G3.me;me.visible=x!=null;if(x!=null){me.position.set(x,0,y);me.rotation.y=-a;me.scale.setScalar(k*(mz==='piedi'?1.6:mz==='bici'||mz==='moto'?1.3:1));
    me.traverse(o=>{if(o.userData&&o.userData.ruota&&va)o.rotation.z-=.25;});if(me.userData.luce)me.userData.luce.visible=(new Date().getHours()>=18||new Date().getHours()<7);
    g3Cammina(me,T,va);}
  // zombie e casse vicini (al massimo 40, entro 700 m dal centro della mappa)
  const C=GM.map.getCenter();const L=(ZM.L||[]).filter(z=>!z.preso&&trM(C.lat,C.lng,z.lat,z.lon)<700).slice(0,40);const vivi={};
  L.forEach((z,i)=>{const id=z.id||(z.lat+','+z.lon);vivi[id]=1;let g=G3.obj[id];if(!g){g=G3.obj[id]=g3Zombie(z);sc.add(g);}
    const p=gmXY(z.lat,z.lon);g.position.set(p[0],0,p[1]);g.scale.setScalar(k*(z.k==='cassa'?1.3:1.6*((typeof ARN_ZL!=='undefined'&&ARN_ZL[z.tipo]&&ARN_ZL[z.tipo].s)||1)));
    if(g.userData.cassa){g.rotation.y=T*.6+i;g.position.y=Math.sin(T*2+i)*.15*k;}
    else{if(x!=null)g.rotation.y=-Math.atan2(y-p[1],x-p[0]);g3Cammina(g,T+i,true);g.position.y=Math.abs(Math.sin(T*4+i))*.08*k;}});
  Object.keys(G3.obj).forEach(id=>{if(!vivi[id]){sc.remove(G3.obj[id]);delete G3.obj[id];}});}
async function g3Init(m){if(!m||m._g3||!g3Puo())return;m._g3=1;try{g3Finestre(m);}catch(e){}
  const T3=await g3Load();if(!T3||!GM.on||GM.map!==m)return;
  try{m.addLayer(g3Strato());GM.no2d=true;G3.on=true;}catch(e){G3.err=String(e&&e.message||e);GM.no2d=false;}}
// aggancio: aperta la mappa del Gioco, quando è pronta si aggiunge il 3D; chiusa, si azzera
const _gmOpen63=gmOpen;gmOpen=async function(){const r=await _gmOpen63.apply(this,arguments);try{const m=GM.map;let n=0;const go=()=>{if(!GM.on||GM.map!==m||n++>60)return;if(!m.isStyleLoaded||m.isStyleLoaded()||(m.style&&m.style._loaded))g3Init(m);else setTimeout(go,300);};if(m)go();}catch(e){}return r;};
const _gmClose63=gmClose;gmClose=function(){G3.obj={};G3.me=null;G3.meK='';G3.on=false;G3.L=null;GM.no2d=false;return _gmClose63.apply(this,arguments);};
const _gmDraw63=gmDraw;gmDraw=function(s){GM.lastS=s;return _gmDraw63.apply(this,arguments);};
</script>
