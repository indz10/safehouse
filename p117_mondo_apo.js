<script>
/* ===== Fase 71 — ☣️ SCENARIO APOCALITTICO ANCHE NEL 🌍 MONDO (dall'alto e in 3D) =====
   Stessi pezzi del Gioco (p116: apoAuto, apoMacerie, apoBarile + apoFumo, apoBarricata, apoZombie) messi lungo le strade
   vere della mappa del Mondo (sorgente 'omt', strato 'transportation', letto con querySourceFeatures), entro 450 m dal
   centro, al massimo 60, posti decisi da apoHash (sempre gli stessi). Strato Three.js 'apom' (mwApoStrato) con origine
   fissa (rifatta se la mappa si sposta di oltre 3 km); i pezzi si rifanno quando la mappa si ferma 150 m più in là.
   Dall'alto i pezzi sono ingranditi secondo lo zoom (mwApoK), sotto lo zoom 14 non si vedono. Sopra la mappa .mwfog
   (cenere che cade e bordi scuri, più leggeri che nel Gioco). Telefono debole o zsh_3d = '0': niente strato. Lo strato resta sempre l'ultimo (mwApoMonta lo rimette in cima se altri moduli aggiungono strati dopo). */
const MWA={c0:null,c:null,g:null,fuochi:[],zombie:[],L:null,map:null,t:0};
const MWA_STRADE=['motorway','trunk','primary','secondary','tertiary','minor','service','street','residential','living_street','unclassified'];
function mwApoK(m){const z=(m&&m.getZoom&&m.getZoom())||16;const piatta=((m&&m.getPitch&&m.getPitch())||0)<25;return Math.max(2.6,Math.min(16,3*Math.pow(2,(17-z)*.85)*(piatta?1.6:1)));}
function mwApoRifai(L,m){const sc=L.sc,c0=MWA.c0;if(MWA.g)sc.remove(MWA.g);const g=MWA.g=new THREE.Group();MWA.fuochi=[];MWA.zombie=[];sc.add(g);
  let F=[];try{F=m.querySourceFeatures('omt',{sourceLayer:'transportation'});}catch(e){}
  const C=m.getCenter(),kx=111320*Math.cos(c0.lat*Math.PI/180),ky=110540;const cx=(C.lng-c0.lon)*kx,cy=-(C.lat-c0.lat)*ky;const visti=new Set();let n=0;const k=mwApoK(m);
  /* prima tutti i tratti di strada candidati, poi i 60 più vicini al centro (prima finivano tutti ai bordi) */
  const cand=[];
  for(const f of F){const p=f.properties||{};if(MWA_STRADE.indexOf(p.class)<0)continue;const G=f.geometry;if(!G)continue;
    const linee=G.type==='LineString'?[G.coordinates]:G.type==='MultiLineString'?G.coordinates:[];
    for(const ln of linee){for(let i=1;i<ln.length;i++){const a=[(ln[i-1][0]-c0.lon)*kx,-(ln[i-1][1]-c0.lat)*ky],b=[(ln[i][0]-c0.lon)*kx,-(ln[i][1]-c0.lat)*ky];
      const L2=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L2<8)continue;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;const dc=Math.hypot(mx-cx,my-cy);if(dc>450)continue;
      const h=apoHash(a[0]+c0.lon*1e5,a[1]+c0.lat*1e5,b[0]+c0.lon*1e5,b[1]+c0.lat*1e5);const key=Math.round(mx/6)+','+Math.round(my/6);if(h%3||visti.has(key))continue;visti.add(key);
      cand.push({a,b,L2,h,dc});}}}
  cand.sort((x,y)=>x.dc-y.dc);
  for(const c of cand.slice(0,60)){const{a,b,L2,h}=c;
      const ux=(b[0]-a[0])/L2,uy=(b[1]-a[1])/L2,lato=h&8?1:-1,off=4.6,q=.3+((h>>5)%40)/100;
      const px=a[0]+(b[0]-a[0])*q-uy*off*lato,py=a[1]+(b[1]-a[1])*q+ux*off*lato,ang=-Math.atan2(uy,ux);const tipo=(h>>8)%6;let o;
      if(tipo===0||tipo===5)o=apoAuto(h);else if(tipo===1)o=apoMacerie(h);else if(tipo===2){o=apoBarile();o.add(apoFumo());MWA.fuochi.push(o);}
      else if(tipo===3)o=apoBarricata(h);else{o=apoZombie(h);MWA.zombie.push(o);}
      o.position.set(px,0,py);o.rotation.y=ang+(tipo===0?(h%5-2)*.15:0);o.scale.setScalar(1.25*k);g.add(o);n++;}
  MWA.n=n;MWA.k=k;}
function mwApoStrato(){const T=THREE;return{id:'apom',type:'custom',renderingMode:'3d',
  onAdd(map,gl){this.map=map;this.cam=new T.Camera();this.sc=new T.Scene();this.sc.add(new T.AmbientLight(0xffffff,.8));const d=new T.DirectionalLight(0xffffff,1);d.position.set(-40,90,-30);this.sc.add(d);
    this.r=new T.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.r.autoClear=false;MWA.L=this;},
  render(gl,mtx){try{const m=this.map;const z=m.getZoom();if(z<14)return;const C=m.getCenter();
    if(!MWA.c0||trM(MWA.c0.lat,MWA.c0.lon,C.lat,C.lng)>3000){MWA.c0={lat:C.lat,lon:C.lng};MWA.c=null;}
    if(!MWA.c||trM(MWA.c.lat,MWA.c.lon,C.lat,C.lng)>150||Math.abs(mwApoK(m)-(MWA.k||0))>.4){if(!m.isMoving||!m.isMoving()){MWA.c={lat:C.lat,lon:C.lng};mwApoRifai(this,m);}}
    const c=MWA.c0,mc=maplibregl.MercatorCoordinate.fromLngLat([c.lon,c.lat],0),s=mc.meterInMercatorCoordinateUnits();
    const l=new T.Matrix4().makeTranslation(mc.x,mc.y,mc.z).scale(new T.Vector3(s,-s,s)).multiply(new T.Matrix4().makeRotationAxis(new T.Vector3(1,0,0),Math.PI/2));
    this.cam.projectionMatrix=new T.Matrix4().fromArray(mtx).multiply(l);mwApoAnima();this.r.resetState();this.r.render(this.sc,this.cam);
    if(MWA.fuochi.length&&!this.tm&&!document.hidden)this.tm=setTimeout(()=>{this.tm=0;try{if(document.body.contains(m.getContainer()))m.triggerRepaint();}catch(e){}},90);}
    catch(e){MWA.err=String(e&&e.message||e);}}};}
function mwApoAnima(){const t=performance.now()/1000;
  MWA.fuochi.forEach((o,i)=>{const f=o.userData.fuoco;if(!f)return;const s=1+Math.sin(t*14+i)*.18;f[0].scale.set(s,1+Math.sin(t*11+i)*.25,s);f[1].scale.setScalar(1+Math.sin(t*17+i)*.2);
    o.children.forEach(c=>{if(c.userData.fumo)c.children.forEach((s2,j)=>{s2.position.y=2.6+j*1.6+((t*.8+j*.4)%1.6);});});});
  MWA.zombie.forEach((z,i)=>g3Cammina(z,t+i,true));}
/* lo strato si aggiunge quando la mappa del Mondo è pronta (e dopo ogni cambio di stile); i fuochi si muovono circa 11 volte al secondo (attesa breve dopo ogni disegno, ferma con l'app in sfondo) */
async function mwApoMonta(){const lm=window.__mf;const m=lm&&lm.map;if(!m||!g3Puo()||document.hidden)return;if(!document.body.contains(m.getContainer()))return;
  if(MWA.map!==m){MWA.map=m;MWA.c0=null;MWA.c=null;MWA.g=null;}
  const el=m.getContainer();if(el&&!el.querySelector('.mwfog'))el.insertAdjacentHTML('beforeend','<div class="mwfog" aria-hidden="true">'+Array.from({length:12},(_,i)=>`<i style="left:${(i*41)%100}%;animation-delay:-${(i*.9)%7}s;animation-duration:${6+(i%5)}s"></i>`).join('')+'</div>');
  if(m.getLayer&&m.getLayer('apom')){try{const o=m.style&&m.style._order;if(o&&o[o.length-1]!=='apom')m.moveLayer('apom');}catch(e){}return;}if(!(m.isStyleLoaded&&m.isStyleLoaded())&&!(m.style&&m.style._loaded))return;
  const T3=await g3Load();if(!T3||m.getLayer('apom'))return;try{m.addLayer(mwApoStrato());}catch(e){MWA.err=String(e&&e.message||e);}}
zEvery(()=>{try{mwApoMonta();}catch(e){}},2000,'mondo-apocalisse');
</script>
