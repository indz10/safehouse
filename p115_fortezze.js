<script>
/* ===== Fase 70 — 🏰 FORTIFICAZIONI VISIBILI SULLE CASE =====
   world_fortezze(riquadro) (migrazione 055): per ogni casa abitata o comprata le difese costruite (tue e degli alleati con
   livello e danno; degli altri solo quali ci sono: livello 0 → disegnate a livello 2, senza danni).
   Modelli Three.js (fzModello) intorno al punto della casa, in metri veri (x est, y su, z sud):
   🪵 barricate (assi incrociate), 🚧 recinto (pali e traverse, dal 3 col filo spinato, dal 5 muro), 🕳️ fossato (anello scuro),
   🪤 trappole (punte), ⛓️ grate (pannelli a sbarre), 💡 fari (palo con luce, accesi di sera), 🐕 cani (cuccia e cane),
   📢 sirena (sul palo, lampeggia), 🧱 fondamenta (base di cemento), 💧 pompa (serbatoio blu). Con danno ≥ 50 le parti
   sono storte e scure; casa crollata → macerie.
   Strato personalizzato `fzStrato(map, origine)`: nel 🎮 Gioco (anche nella vista da vicino) con l'origine GM.c0,
   nel 🌍 Mondo solo col tasto 3D acceso (origine = centro della mappa all'accensione). Dati ricaricati ogni 90 s o
   quando la mappa si sposta di 300 m (fzLoad). Telefono debole o zsh_3d = '0' (g3Puo falso): niente strato. */
const FTZ={L:[],t:0,c:null,busy:false,maps:new Set()};
const FZ_R=8; /* raggio intorno al punto della casa */
async function fzLoad(m,force){if(!m||!S.user||typeof SB==='undefined'||!SB||FTZ.busy)return;let c;try{c=m.getCenter();}catch(e){return;}
  if(!force&&FTZ.c&&Date.now()-FTZ.t<90000&&trM(FTZ.c.lat,FTZ.c.lon,c.lat,c.lng)<300)return;
  FTZ.busy=true;FTZ.t=Date.now();FTZ.c={lat:c.lat,lon:c.lng};const dl=.008,dn=dl/Math.max(.2,Math.cos(c.lat*Math.PI/180));
  try{const{data,error}=await SB.rpc('world_fortezze',{p_minlat:c.lat-dl,p_minlon:c.lng-dn,p_maxlat:c.lat+dl,p_maxlon:c.lng+dn});if(!error&&Array.isArray(data)){FTZ.L=data;FTZ.ver=(FTZ.ver||0)+1;}}catch(e){}
  FTZ.busy=false;}
/* ── i modelli ── */
function fzM(c,em){return new THREE.MeshLambertMaterial({color:c,emissive:em||0});}
function fzB(g,w,h,d,c,x,y,z,ry,rz,em){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),fzM(c,em));m.position.set(x,y,z);if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;g.add(m);return m;}
function fzCil(g,r1,r2,h,c,x,y,z,em,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||12),fzM(c,em));m.position.set(x,y,z);g.add(m);return m;}
const FZ_K={
  fondamenta(g,L){const r=FZ_R+.6;const h=.25+.12*L;[0,1,2,3].forEach(i=>{const a=i*Math.PI/2;fzB(g,2*r,h,.9,0x8a8a8a,Math.cos(a)*r,h/2,Math.sin(a)*r,a+Math.PI/2);});},
  barricate(g,L){const n=Math.min(4,1+Math.ceil(L/2));for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*(FZ_R-.5),z=Math.sin(a)*(FZ_R-.5),ry=-a+Math.PI/2;
      for(let k=0;k<n;k++){const p=fzB(g,2.6,.22,.12,k%2?0x8a5a2b:0x6e4420,x,.5+k*.42,z,ry,(k%2?1:-1)*.35);if(g.userData.rotti)p.rotation.z+=.5;}}},
  recinto(g,L){const r=FZ_R+3,n=20,h=1+.25*L,muro=L>=5;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,a2=(i+1)/n*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(muro){const xm=(x+Math.cos(a2)*r)/2,zm=(z+Math.sin(a2)*r)/2;fzB(g,2*Math.PI*r/n+.05,h,.5,0x9a8f84,xm,h/2,zm,-(a+a2)/2+Math.PI/2);}
      else{const p=fzB(g,.18,h,.18,0x6e4420,x,h/2,z);if(g.userData.rotti&&i%3===0)p.rotation.z=.6;
        const xm=(x+Math.cos(a2)*r)/2,zm=(z+Math.sin(a2)*r)/2,ry=-(a+a2)/2+Math.PI/2;if(!(g.userData.rotti&&i%4===1)){fzB(g,2*Math.PI*r/n,.12,.08,0x8a5a2b,xm,h*.35,zm,ry);fzB(g,2*Math.PI*r/n,.12,.08,0x8a5a2b,xm,h*.75,zm,ry);}}
      if(L>=3){const xm=(x+Math.cos(a2)*r)/2,zm=(z+Math.sin(a2)*r)/2;fzB(g,2*Math.PI*r/n,.04,.04,0x2a2a2a,xm,h+.15,zm,-(a+a2)/2+Math.PI/2);}}},
  fossato(g,L){const r1=FZ_R+4.2,r2=r1+1.4+.3*L;const m=new THREE.Mesh(new THREE.RingGeometry(r1,r2,40),new THREE.MeshLambertMaterial({color:g.userData.rotti?0x3a3a2a:0x1d2a33,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2;m.position.y=.06;g.add(m);if(L>=3){const w=new THREE.Mesh(new THREE.RingGeometry(r1+.2,r2-.2,40),new THREE.MeshLambertMaterial({color:0x2f6f8f,emissive:0x0a2030,side:THREE.DoubleSide}));w.rotation.x=-Math.PI/2;w.position.y=.08;g.add(w);}},
  trappole(g,L){const n=3+L*2;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+.2,r=FZ_R+1.6+(i%2)*.7;const c=new THREE.Mesh(new THREE.ConeGeometry(.16,.7,6),fzM(0x9a9aa6));c.position.set(Math.cos(a)*r,.35,Math.sin(a)*r);g.add(c);}},
  grate(g,L){for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a)*(FZ_R-1.2),z=Math.sin(a)*(FZ_R-1.2),ry=-a+Math.PI/2;const n=4+L;
      for(let k=0;k<n;k++){const off=(k-(n-1)/2)*.32;fzB(g,.07,2.4,.07,0x3a3a44,x+Math.cos(ry)*off,1.6,z-Math.sin(ry)*off);}fzB(g,(n)*.32,.1,.1,0x3a3a44,x,2.8,z,ry);fzB(g,(n)*.32,.1,.1,0x3a3a44,x,.4,z,ry);}},
  fari(g,L){const n=Math.min(4,1+Math.floor(L/2));for(let i=0;i<n;i++){const a=i/n*Math.PI*2+.8,x=Math.cos(a)*(FZ_R+2),z=Math.sin(a)*(FZ_R+2);
      fzCil(g,.1,.12,5,0x3a3a44,x,2.5,z);const lamp=fzB(g,.6,.35,.6,0xfff3b0,x,5.1,z,0,0,0xffe066);g.userData.luci=(g.userData.luci||[]).concat(lamp);
      const cono=new THREE.Mesh(new THREE.ConeGeometry(2.4,5,16,1,true),new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}));cono.position.set(x,2.5,z);g.add(cono);g.userData.coni=(g.userData.coni||[]).concat(cono);}},
  cani(g,L){const x=FZ_R+1.5,z=-2;fzB(g,1.6,1.1,1.4,0xa04a2b,x,.55,z);const t1=fzB(g,1.2,.12,1.6,0x6e2a18,x-.35,1.3,z,0,.6),t2=fzB(g,1.2,.12,1.6,0x6e2a18,x+.35,1.3,z,0,-.6);
    fzB(g,.5,.6,.04,0x111111,x-.81,.4,z);
    if(typeof g3Cane==='function'&&L>0){const n=Math.min(3,Math.ceil(L/2));for(let i=0;i<n;i++){const c=g3Cane();c.traverse(o=>{if(o.material&&o.material.color)o.material=o.material.clone(),o.material.color.setHex(0x8a6a3a),o.material.emissive&&o.material.emissive.setHex(0);});c.position.set(x+1.2,0,z+1.4+i*1.3);c.rotation.y=-Math.PI/2;g.add(c);}}},
  sirena(g,L){const x=-FZ_R+1,z=FZ_R-1;fzCil(g,.12,.14,9+L,0x4a4a54,x,(9+L)/2,z);const s=fzCil(g,.45,.6,.7,0xd92a2a,x,9+L+.35,z,0x660000,10);g.userData.sirena=s;fzB(g,1.2,.1,.1,0x333333,x,9+L,z);},
  pompa(g,L){const x=-FZ_R-1.5,z=-2;fzCil(g,1+.1*L,1+.1*L,2.4+.3*L,0x2f6fbf,x,(2.4+.3*L)/2,z,0x0a1a30,16);fzCil(g,.15,.15,1.2,0x9a9aa6,x+1.4,.6,z);fzB(g,.6,.5,.5,0x555560,x+1.4,.25,z+.6);}};
function fzModello(row){const g=new THREE.Group();const D=row.defs||{},dn=row.danni||{};g.userData={};
  if(row.crollata){for(let i=0;i<14;i++){const a=i*2.4,r=(i%5)*1.4;fzB(g,1+(i%3)*.6,.4+(i%4)*.25,1+(i%2)*.8,i%3?0x6b6258:0x4a443c,Math.cos(a)*r,.3,Math.sin(a)*r,a,(i%2?.3:-.2));}
    const f=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,6),new THREE.MeshBasicMaterial({color:0x555555,transparent:true,opacity:.35,depthWrite:false}));f.position.y=3;g.add(f);g.userData.fumo=f;return g;}
  Object.keys(FZ_K).forEach(k=>{if(D[k]==null)return;const L=Math.max(1,Math.min(6,D[k]||2));const sg=new THREE.Group();sg.userData.rotti=(dn[k]||0)>=50;
    try{FZ_K[k](sg,L);}catch(e){}
    if(sg.userData.rotti)sg.traverse(o=>{if(o.material&&o.material.color){o.material=o.material.clone();o.material.color.multiplyScalar(.55);}});
    ['luci','coni','sirena'].forEach(q=>{if(sg.userData[q])g.userData[q]=(g.userData[q]||[]).concat(sg.userData[q]);});g.add(sg);});
  return g;}
/* ── lo strato dentro la mappa ── */
function fzStrato(id,origine){const T=THREE;return{id,type:'custom',renderingMode:'3d',
  onAdd(map,gl){this.map=map;this.cam=new T.Camera();this.sc=new T.Scene();this.sc.add(new T.AmbientLight(0xffffff,.8));const d=new T.DirectionalLight(0xffffff,1);d.position.set(-40,90,-30);this.sc.add(d);
    this.r=new T.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.r.autoClear=false;this.obj={};this.ver=-1;FTZ.maps.add(map);},
  onRemove(){FTZ.maps.delete(this.map);},
  render(gl,mtx){try{const c=origine();if(!c)return;if(this.c0&&(this.c0.lat!==c.lat||this.c0.lon!==c.lon)){Object.values(this.obj).forEach(o=>this.sc.remove(o));this.obj={};this.ver=-1;}this.c0=c;
    const mc=maplibregl.MercatorCoordinate.fromLngLat([c.lon,c.lat],0),s=mc.meterInMercatorCoordinateUnits();
    const l=new T.Matrix4().makeTranslation(mc.x,mc.y,mc.z).scale(new T.Vector3(s,-s,s)).multiply(new T.Matrix4().makeRotationAxis(new T.Vector3(1,0,0),Math.PI/2));
    this.cam.projectionMatrix=new T.Matrix4().fromArray(mtx).multiply(l);fzSync(this,c);this.r.resetState();this.r.render(this.sc,this.cam);
    if(this.anim)this.map.triggerRepaint();}catch(e){FTZ.err=String(e&&e.message||e);}}};}
function fzSync(Lr,c){const t=performance.now()/1000,notte=(()=>{const h=new Date().getHours();return h>=18||h<7;})();
  if(Lr.ver!==FTZ.ver){Lr.ver=FTZ.ver;const vivi={};
    (FTZ.L||[]).forEach(row=>{if(row.lat==null)return;const key=row.bid+'|'+JSON.stringify(row.defs)+'|'+JSON.stringify(row.danni)+'|'+row.crollata;vivi[key]=1;
      if(!Lr.obj[key]){if(!row.crollata&&!Object.keys(row.defs||{}).length)return;const g=fzModello(row);const kx=111320*Math.cos(c.lat*Math.PI/180);
        g.position.set((row.lon-c.lon)*kx,0,-(row.lat-c.lat)*110540);g.scale.setScalar(1.4);Lr.obj[key]=g;Lr.sc.add(g);}});
    Object.keys(Lr.obj).forEach(k=>{if(!vivi[k]){Lr.sc.remove(Lr.obj[k]);delete Lr.obj[k];}});}
  let anim=false;Object.values(Lr.obj).forEach(g=>{const u=g.userData;
    (u.coni||[]).forEach(o=>o.visible=notte);(u.luci||[]).forEach(o=>o.material.emissive.setHex(notte?0xffe066:0x332200));
    (u.sirena||[]).forEach(o=>{o.material.emissive.setHex(Math.sin(t*6)>0?0xff2020:0x330000);anim=true;});
    if(u.fumo){u.fumo.position.y=3+Math.sin(t)*.4;u.fumo.scale.setScalar(1+Math.sin(t*.7)*.15);anim=true;}});Lr.anim=anim;}
async function fzAggiungi(m,id,origine,prima){if(!m||!m.getLayer||m.getLayer(id)||!g3Puo())return;const T3=await g3Load();if(!T3)return;
  try{if(!m.getLayer(id))m.addLayer(fzStrato(id,origine),prima&&m.getLayer(prima)?prima:undefined);}catch(e){FTZ.err=String(e&&e.message||e);}fzLoad(m,true);}
/* 🎮 Gioco: lo strato si aggiunge con quello dei modelli (g3) */
const _g3InitFz=g3Init;g3Init=async function(m){const r=await _g3InitFz.apply(this,arguments);try{if(GM.on&&GM.map===m)fzAggiungi(m,'fz3',()=>GM.c0);}catch(e){}return r;};
/* 🌍 Mondo: col tasto 3D acceso */
const _w3ApplyFz=w3Apply;w3Apply=function(m,on){const r=_w3ApplyFz.apply(this,arguments);try{if(on){if(!m._fzc){const c=m.getCenter();m._fzc={lat:c.lat,lon:c.lng};}fzAggiungi(m,'fzw',()=>m._fzc);}
  else if(m.getLayer&&m.getLayer('fzw')){m.removeLayer('fzw');m._fzc=null;}}catch(e){}return r;};
zEvery(()=>{try{FTZ.maps.forEach(m=>{if(document.body.contains(m.getContainer()))fzLoad(m);else FTZ.maps.delete(m);});}catch(e){}},5000,'fortezze');
</script>
