<script>
/* ===== Fase 70b — ☣️ SCENARIO APOCALITTICO NEL 🎮 GIOCO (e nella 🎥 vista da vicino) =====
   Lungo le strade vere caricate (grafo GM.d del Gioco), intorno al superstite (raggio 220 m, al massimo 45 pezzi):
   🚗 auto bruciate e storte, 🧱 macerie, 🛢️ barili in fiamme (fuoco che tremola, fumo che sale), 🚧 barricate di assi e gomme,
   🧟 zombie che barcollano sul marciapiede (solo scena, non si combattono: quelli veri sono quelli di ZM.L).
   Dove mettere i pezzi lo decide un numero calcolato dalle coordinate della strada (apoHash): sempre gli stessi posti,
   niente salti mentre ci si muove. Rifatti quando il superstite si sposta di 60 m. Vanno nella scena dei modelli (g3Update avvolta).
   Nella vista da vicino (p114) anche: niente tetti chiari, scritte e numeri civici; percorso disegnato sulla strada (sotto i
   palazzi) e foschia, cenere e bordo scuro (.vcfog). */
const APO={g:null,c:null,n:0,fuochi:[],zombie:[],fumi:[]};
const apoHash=(a,b,c,d)=>((Math.round(a)*73856093)^(Math.round(b)*19349663)^(Math.round(c)*83492791)^(Math.round(d)*2654435761))>>>0;
function apoAuto(h){const g=new THREE.Group();const col=[0x3a2a24,0x2a2a2e,0x4a3020,0x55423a][h%4];
  g.add(g3Box(4.2,.8,1.8,col,0,.65,0),g3Box(2.2,.6,1.7,0x1d1a1a,-.3,1.3,0),g3Box(.06,.4,1.4,0x101010,.82,1.3,0));
  [[-1.4,.85],[1.4,.85],[-1.4,-.85]].forEach(p=>{const r=g3Ruota(.34,.26,p[0],p[1]);r.position.y=.3;g.add(r);});
  g.add(g3Box(.5,.3,.5,0x111111,1.4,.18,-.85));g.rotation.z=(h%3-1)*.06;g.rotation.x=.05;g.add(g3Ombra(2.2));return g;}
function apoMacerie(h){const g=new THREE.Group();for(let i=0;i<7;i++){const k=(h>>i)&7;const b=g3Box(.5+k*.12,.25+(k%3)*.15,.4+(k%4)*.12,k%2?0x6b6258:0x55504a,(k-3)*.35,.15+(i%3)*.12,((h>>(i+3))&7)*.18-.6);b.rotation.y=k;b.rotation.z=(k%3-1)*.3;g.add(b);}
  g.add(g3Box(.1,.1,2.4,0x3a3a3a,.2,.3,0));return g;}
function apoBarile(){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,1.1,12),new THREE.MeshLambertMaterial({color:0x6a3a1a}));b.position.y=.55;g.add(b);
  const f=new THREE.Mesh(new THREE.ConeGeometry(.42,1.1,8),new THREE.MeshBasicMaterial({color:0xff8a1a,transparent:true,opacity:.9}));f.position.y=1.6;g.add(f);
  const f2=new THREE.Mesh(new THREE.ConeGeometry(.25,.8,6),new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:.9}));f2.position.y=1.5;g.add(f2);
  const al=new THREE.Mesh(new THREE.CircleGeometry(3,18),new THREE.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:.18,depthWrite:false}));al.rotation.x=-Math.PI/2;al.position.y=.05;g.add(al);
  g.userData.fuoco=[f,f2,al];return g;}
function apoFumo(){const g=new THREE.Group();g.userData.fumo=1;for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.7+i*.35,8,6),new THREE.MeshBasicMaterial({color:0x2a2a2a,transparent:true,opacity:.32-i*.05,depthWrite:false}));s.position.y=2.6+i*1.6;g.add(s);}return g;}
function apoBarricata(h){const g=new THREE.Group();for(let i=0;i<3;i++){const a=g3Box(3,.22,.14,0x7a4a22,0,.5+i*.4,0);a.rotation.z=(i%2?1:-1)*.12;g.add(a);}g.add(g3Box(.14,1.5,.14,0x5a3a1a,-1.2,.75,0),g3Box(.14,1.5,.14,0x5a3a1a,1.2,.75,0));
  for(let i=0;i<2;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.38,.16,6,12),new THREE.MeshLambertMaterial({color:0x151515}));t.rotation.x=Math.PI/2;t.position.set(-.6+i*1.2,.16+(h%2)*.3*i,.6);g.add(t);}return g;}
function apoZombie(h){const t=['vagante','vagante','operaio','dottore','soldato'][h%5];const z=g3Zombie({tipo:t,k:'zombie'});z.userData.vaga=1;z.userData.ph=h%100;return z;}
function apoRifai(sc,x,y){if(APO.g)sc.remove(APO.g);const g=APO.g=new THREE.Group();APO.fuochi=[];APO.zombie=[];sc.add(g);const d=GM.d;if(!d||!d.adj)return;let n=0;
  for(let i=0;i<d.N.length&&n<45;i++){const a=d.N[i];if(Math.abs(a[0]-x)>220||Math.abs(a[1]-y)>220)continue;
    for(const[v]of d.adj[i]){if(v<i||n>=45)continue;const b=d.N[v];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<8)continue;const h=apoHash(a[0],a[1],b[0],b[1]);if(h%3)continue;
      const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,lato=h&8?1:-1,off=4.6;const k=.3+((h>>5)%40)/100;
      const px=a[0]+(b[0]-a[0])*k-uy*off*lato,py=a[1]+(b[1]-a[1])*k+ux*off*lato,ang=-Math.atan2(uy,ux);
      const tipo=(h>>8)%6;let o;
      if(tipo===0||tipo===5)o=apoAuto(h);else if(tipo===1)o=apoMacerie(h);else if(tipo===2){o=apoBarile();const f=apoFumo();o.add(f);APO.fuochi.push(o);}
      else if(tipo===3)o=apoBarricata(h);else{o=apoZombie(h);APO.zombie.push(o);}
      o.position.set(px,0,py);o.rotation.y=ang+(tipo===0?(h%5-2)*.15:0);o.scale.multiplyScalar(1.25);g.add(o);n++;}}
  APO.n=n;}
function apoUpdate(sc){if(!GM.on||!GM.d)return;let p=null;try{p=typeof vcPos==='function'?vcPos():null;}catch(e){}
  if(!p&&GM.map){const c=GM.map.getCenter();const q=gmXY(c.lat,c.lng);p={x:q[0],y:q[1]};}if(!p)return;
  if(!APO.c||APO.d!==GM.d||Math.hypot(p.x-APO.c.x,p.y-APO.c.y)>60){APO.c={x:p.x,y:p.y};APO.d=GM.d;apoRifai(sc,p.x,p.y);}
  const t=GM.t||performance.now()/1000;
  APO.fuochi.forEach((o,i)=>{const f=o.userData.fuoco;if(!f)return;const s=1+Math.sin(t*14+i)*.18+Math.sin(t*23+i*2)*.1;f[0].scale.set(s,1+Math.sin(t*11+i)*.25,s);f[1].scale.setScalar(1+Math.sin(t*17+i)*.2);f[2].material.opacity=.14+Math.sin(t*9+i)*.05;
    o.children.forEach(c=>{if(c.userData.fumo)c.children.forEach((s2,j)=>{s2.position.y=2.6+j*1.6+((t*.8+j*.4)%1.6);});});});
  APO.zombie.forEach(z=>{const u=z.userData;g3Cammina(z,t+u.ph,true);z.rotation.y+=Math.sin(t*.5+u.ph)*.004;});}
const _g3UpdateApo=g3Update;g3Update=function(sc){const r=_g3UpdateApo.apply(this,arguments);try{apoUpdate(sc);}catch(e){APO.err=String(e&&e.message||e);}return r;};
const _gmCloseApo=gmClose;gmClose=function(){APO.g=null;APO.c=null;APO.fuochi=[];APO.zombie=[];return _gmCloseApo.apply(this,arguments);};
/* ---- vista da vicino: niente tetti/scritte, percorso sulla strada, foschia ---- */
const VC_NASC=['bld-tetto','nomi','posti','posti-pt','civici'];
function vcStile(on){const m=GM.map,el=GM.el;if(!m)return;VC_NASC.forEach(id=>{try{if(m.getLayer(id))m.setLayoutProperty(id,'visibility',on?'none':'visible');}catch(e){}});
  if(el){const cv=el.querySelector('canvas.gmfx');if(cv)cv.style.visibility=on?'hidden':'';let f=el.querySelector('.vcfog');
    if(on&&!f){(el.querySelector('.gmmap')||el).insertAdjacentHTML('afterend','<div class="vcfog" aria-hidden="true">'+Array.from({length:18},(_,i)=>`<i style="left:${(i*37)%100}%;animation-delay:-${(i*.7)%6}s;animation-duration:${5+(i%5)}s"></i>`).join('')+'</div>');}
    else if(!on&&f)f.remove();}
  try{if(!on){if(m.getLayer('vc-rt'))m.removeLayer('vc-rt');if(m.getSource('vc-rt'))m.removeSource('vc-rt');VC.rtk='';}}catch(e){}}
function vcRotta(p){const m=GM.map;if(!m||!p||!p.R||p.R.length<2)return;const k=p.R.length+':'+p.R[0]+':'+p.R[p.R.length-1];if(VC.rtk===k)return;VC.rtk=k;
  const gj={type:'Feature',properties:{},geometry:{type:'LineString',coordinates:p.R.map(q=>gmLL(q[0],q[1]))}};
  try{if(m.getSource('vc-rt'))m.getSource('vc-rt').setData(gj);else{m.addSource('vc-rt',{type:'geojson',data:gj});m.addLayer({id:'vc-rt',type:'line',source:'vc-rt',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#b25cff','line-width':7,'line-opacity':.85,'line-blur':1}},m.getLayer('bld')?'bld':undefined);}}catch(e){}}
const _vcOnApo=vcOn;vcOn=function(){const r=_vcOnApo.apply(this,arguments);try{if(VC.on)vcStile(true);}catch(e){}return r;};
const _vcOffApo=vcOff;vcOff=function(){try{vcStile(false);}catch(e){}return _vcOffApo.apply(this,arguments);};
const _vcCamApo=vcCam;vcCam=function(){const r=_vcCamApo.apply(this,arguments);try{if(VC.on)vcRotta(vcPos());}catch(e){}return r;};
</script>
