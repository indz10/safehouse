<script>
/* 🎮 GIOCO: mappa stile Pokémon (Fase 55, migrazione 048)
   Il tasto 🎮 Gioco apre #gmap: prato in pixel art, strade e case vere (OpenStreetMap, 7 giorni in memoria), alberi,
   zombie e casse del mondo (ZM.L), le tue case e il superstite che cammina PER LE STRADE (percorso più breve sul
   grafo delle strade) verso lo zombie o la spedizione, secondo il tempo del viaggio (world_missioni con lat/lon).
   Tocchi: zombie → arnCard, cassa → zmVicino, superstite → misSheet, casa → casasSheet. Tasti: Lente, Vicini, Zombipedia… */
const GM={on:false,d:null,c0:null,cam:{x:0,y:0,z:1.6},raf:0,drag:null,follow:true,rt:new Map(),t:0};
const GM_KEY='zsh_gmap2_';
function gmXY(lat,lon){const c=GM.c0;return[(lon-c.lon)*111320*Math.cos(c.lat*Math.PI/180),-(lat-c.lat)*110540];}
const gmLL=(x,y)=>[GM.c0.lon+x/(111320*Math.cos(GM.c0.lat*Math.PI/180)),GM.c0.lat-y/110540];
// stile Pokémon sulla mappa vera (stesse mattonelle del Mondo): prato, strade color sabbia bordate, tetti colorati, acqua, parchi
function gmStyle(){const R=['interpolate',['exponential',1.6],['zoom']];const MJ=['motorway','trunk','primary'],SC=['secondary','tertiary'];
  const ROADS=['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor','service']]];
  return{version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{omt:{type:'vector',url:'https://tiles.openfreemap.org/planet'}},layers:[
   {id:'bg',type:'background',paint:{'background-color':'#4a4552'}},
   {id:'res',type:'fill',source:'omt','source-layer':'landuse',filter:['in',['get','class'],['literal',['residential','suburb','neighbourhood','commercial','retail','industrial']]],paint:{'fill-color':'#504a5a'}},
   {id:'farm',type:'fill',source:'omt','source-layer':'landcover',filter:['in',['get','class'],['literal',['farmland','grass']]],paint:{'fill-color':'#3d5a34'}},
   {id:'wood',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'#2a4426','fill-outline-color':'#18301a'}},
   {id:'park',type:'fill',source:'omt','source-layer':'park',paint:{'fill-color':'#356b35','fill-outline-color':'#1f3f1f'}},
   {id:'water',type:'fill',source:'omt','source-layer':'water',paint:{'fill-color':'#1e3a6e','fill-outline-color':'#12264a'}},
   {id:'waterway',type:'line',source:'omt','source-layer':'waterway',paint:{'line-color':'#1e3a6e','line-width':['interpolate',['linear'],['zoom'],12,1.5,17,8]}},
   {id:'path',type:'line',source:'omt','source-layer':'transportation',filter:['in',['get','class'],['literal',['path','track']]],paint:{'line-color':'#7a6f60','line-width':[...R,14,1,18,6]}},
   {id:'road-cas',type:'line',source:'omt','source-layer':'transportation',filter:ROADS,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8c8494','line-width':[...R,12,['match',['get','class'],MJ,4,SC,3,2],18,['match',['get','class'],MJ,34,SC,28,['service'],12,22]]}},
   {id:'road',type:'line',source:'omt','source-layer':'transportation',filter:ROADS,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],MJ,'#232228','#2b2a30'],'line-width':[...R,12,['match',['get','class'],MJ,2.6,SC,2,1.2],18,['match',['get','class'],MJ,28,SC,23,['service'],8,17]]}},
   {id:'road-mid',type:'line',source:'omt','source-layer':'transportation',minzoom:15,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor']]],paint:{'line-color':'#e8d36a','line-width':[...R,15,.8,18,2.2],'line-dasharray':[3,3]}},
   {id:'bld',type:'fill-extrusion',source:'omt','source-layer':'building',minzoom:14,paint:{'fill-extrusion-color':['match',['%',['to-number',['id'],0],5],0,'#6b5a7a',1,'#5a6470',2,'#7a5a4a',3,'#4a5a4a','#6a6a72'],'fill-extrusion-height':['coalesce',['get','render_height'],8],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.95,'fill-extrusion-vertical-gradient':true}},
   {id:'nomi',type:'symbol',source:'omt','source-layer':'transportation_name',minzoom:15,layout:{'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Bold'],'text-size':14},paint:{'text-color':'#e8e0f0','text-halo-color':'#1a1420','text-halo-width':2}}]};}
// strade della mappa (le mattonelle caricate) → grafo per il percorso più breve; nodi su una griglia di 2 m così i pezzi si uniscono
function gmGraph(){const m=GM.map;if(!m||!GM.c0)return;let F=[];try{F=m.querySourceFeatures('omt',{sourceLayer:'transportation'})||[];}catch(e){}
  const nodes=new Map(),N=[],adj=[];const id=(ll)=>{const p=gmXY(ll[1],ll[0]);const k=Math.round(p[0]/2)+','+Math.round(p[1]/2);let i=nodes.get(k);if(i==null){i=N.length;nodes.set(k,i);N.push(p);adj.push([]);}return i;};
  F.forEach(f=>{const c=f.properties&&f.properties.class;if(!c||/rail|ferry|aerialway|transit/.test(c))return;const g=f.geometry;if(!g)return;
    const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
    lines.forEach(l=>{for(let i=1;i<l.length;i++){const a=id(l[i-1]),b=id(l[i]);if(a===b)continue;const L=Math.hypot(N[a][0]-N[b][0],N[a][1]-N[b][1]);adj[a].push([b,L]);adj[b].push([a,L]);}});});
  if(N.length&&(!GM.d||N.length!==GM.d.N.length)){GM.d={N,adj};GM.rt.clear();}}
function gmNear(x,y){const d=GM.d;let best=-1,bd=1e18;if(!d)return-1;for(let i=0;i<d.N.length;i++){const q=(d.N[i][0]-x)**2+(d.N[i][1]-y)**2;if(q<bd){bd=q;best=i;}}return best;}
// percorso più breve (Dijkstra con una coda semplice); se non c'è, linea dritta
function gmRoute(a,b){const d=GM.d;if(!d)return[a,b];const s=gmNear(a[0],a[1]),t=gmNear(b[0],b[1]);if(s<0||t<0||s===t)return[a,b];
  const dist=new Float64Array(d.N.length).fill(Infinity),prev=new Int32Array(d.N.length).fill(-1),heap=[[0,s]];dist[s]=0;
  const push=v=>{heap.push(v);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  while(heap.length){const[du,u]=pop();if(u===t)break;if(du>dist[u])continue;for(const[v,L]of d.adj[u]){const nd=du+L;if(nd<dist[v]){dist[v]=nd;prev[v]=u;push([nd,v]);}}}
  let e=t;if(!isFinite(dist[t])){let bd=1e18;e=-1;for(let i=0;i<d.N.length;i++)if(isFinite(dist[i])){const q=(d.N[i][0]-b[0])**2+(d.N[i][1]-b[1])**2;if(q<bd){bd=q;e=i;}}if(e<0||e===s)return[a,b];}
  const P=[];for(let u=e;u>=0;u=prev[u])P.push(d.N[u]);P.reverse();return[a,...P,b];}
function gmAlong(P,f){let L=0;const seg=[];for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);seg.push(l);L+=l;}let r=Math.max(0,Math.min(1,f))*L;
  for(let i=0;i<seg.length;i++){if(r<=seg[i]){const k=seg[i]?r/seg[i]:0;return[P[i][0]+(P[i+1][0]-P[i][0])*k,P[i][1]+(P[i+1][1]-P[i][1])*k,Math.atan2(P[i+1][1]-P[i][1],P[i+1][0]-P[i][0])];}r-=seg[i];}
  const n=P.length-1;return[P[n][0],P[n][1],0];}
// dove si trova il superstite adesso: in viaggio verso lo zombie (solo andata) o in spedizione (andata e ritorno)
function gmSup(){const L=(MIS.L||[]).filter(m=>(m.tipo==='scontro'||m.tipo==='spedizione')&&m.lat!=null);const home=gmXY(GM.c0.lat,GM.c0.lon);
  if(!L.length)return{x:home[0],y:home[1],a:0,fermo:true,txt:'🏠 A casa · tocca uno zombie per affrontarlo'};
  const m=L[0];const key=m.tipo+m.id;let R=GM.rt.get(key);const meta=gmXY(m.lat,m.lon);{const H=(typeof myHouses==='function'?myHouses():[]).filter(h=>h.lat!=null);if(H.length){const hb=H.slice().sort((a,b)=>trM(a.lat,a.lon,m.lat,m.lon)-trM(b.lat,b.lon,m.lat,m.lon))[0];const hp=gmXY(hb.lat,hb.lon);home[0]=hp[0];home[1]=hp[1];}}if(!R){if(GM.d){R=gmRoute(home,meta);if(R.length>2)GM.rt.set(key,R);}else R=[home,meta];}
  const t0=new Date(m.inizio).getTime(),t1=m.fineMs||new Date(m.fine).getTime();let f=t1>t0?(Date.now()-t0)/(t1-t0):1;f=Math.max(0,Math.min(1,f));
  const ar=m.tipo==='scontro';const pos=ar?gmAlong(R,f):(f<.5?gmAlong(R,f*2):gmAlong(R.slice().reverse(),(f-.5)*2));const left=Math.max(0,(t1-Date.now())/1000);
  const txt=ar?(f>=1?`🧟 Arrivato da ${m.titolo.replace(/^Verso /,'')} · ⚔️ tocca per combattere`:`🎒 Verso ${m.titolo.replace(/^Verso /,'')} · ${misT(left)}`):(f>=1?'📦 Spedizione tornata: raccogli':`🎒 Spedizione · ${f<.5?'andata':'ritorno'} · ${misT(left)}`);
  return{x:pos[0],y:pos[1],a:pos[2],fermo:f>=1,txt,m,R,f,ar};}
async function gmOpen(){if(GM.on)return;GM.on=true;try{zmClose();}catch(e){}closeSheet();
  document.body.insertAdjacentHTML('beforeend',`<div id="gmap"><div class="gmmap"></div><canvas class="gmfx"></canvas><div class="gmtop"><b>🎮 Gioco</b><span data-gmtxt>Carico la mappa…</span><button class="gmx" data-gmx aria-label="Chiudi">✕</button></div>
    <div class="gmside">${[['lente','📷','Lente'],['vicini','🧟','Vicini'],['mis','⏳','Missioni'],['pedia','📖','Zombipedia'],['dfa','🛡️','Difendi'],['boss','👹','Boss'],['evt','🚨','Eventi'],['case','🏠','Case'],['mv','❓','Come']].map(b=>`<button data-gmb="${b[0]}"><span>${b[1]}</span><small>${b[2]}</small></button>`).join('')}</div>
    <div class="gmzoom"><button data-gmz="1">＋</button><button data-gmz="-1">－</button><button data-gmz="0" class="gmme" aria-label="Centra sul superstite">📍<small>Tu</small></button></div></div>`);
  const el=document.getElementById('gmap');GM.el=el;GM.cv=el.querySelector('canvas.gmfx');GM.ctx=GM.cv.getContext('2d');
  el.querySelector('[data-gmx]').onclick=gmClose;
  // 🕹️ croce direzionale: tieni premuto per camminare (come nei giochi), anche con le frecce o W A S D
  GM.dir={u:0,d:0,l:0,r:0};
  el.querySelectorAll('[data-gmd]').forEach(b=>{const k=b.dataset.gmd;const giu=e=>{e.preventDefault();GM.dir[k]=1;GM.follow=true;b.classList.add('pr');};const su=e=>{e.preventDefault();if(GM.dir[k]){GM.dir[k]=0;gmAvSync(true);}b.classList.remove('pr');};
    b.addEventListener('pointerdown',giu);['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,su));b.oncontextmenu=e=>e.preventDefault();});
  const GK={arrowup:'u',w:'u',arrowdown:'d',s:'d',arrowleft:'l',a:'l',arrowright:'r',d:'r'};
  GM.kd=e=>{const k=GK[(e.key||'').toLowerCase()];if(!k||document.getElementById('arena')||/INPUT|TEXTAREA/.test((e.target||{}).tagName||''))return;e.preventDefault();GM.dir[k]=1;GM.follow=true;};
  GM.ku=e=>{const k=GK[(e.key||'').toLowerCase()];if(k&&GM.dir[k]){GM.dir[k]=0;gmAvSync(true);}};

  el.querySelectorAll('[data-gmz]').forEach(b=>b.onclick=()=>{const k=+b.dataset.gmz;const m=GM.map;if(!m)return;if(!k){GM.follow=true;GM.lastFollow=0;return;}m.easeTo({zoom:Math.max(13,Math.min(19,m.getZoom()+k)),duration:250});});
  const A={case:()=>gmCase(),lente:()=>{gmClose();lenteOpen();},vicini:()=>zmRadarSheet(),mis:()=>misSheet(),pedia:()=>zmPedia(),dfa:()=>dfaGo(),boss:()=>bossSheet(),mv:()=>mvSheet(),
    evt:()=>{const ev=typeof EVT!=='undefined'?evtAperti().filter(e=>e.km!=null&&e.km<=e.raggio):[];if(ev.length)evtSheet(ev[0].id);else toast('🚨 Nessun evento qui vicino adesso: ti arriva la notifica quando compare');}};
  el.querySelectorAll('[data-gmb]').forEach(b=>b.onclick=()=>{const f=A[b.dataset.gmb];if(f)f();});
  const hs=(typeof myHouses==='function'?myHouses():[]);const h=hs[0]||(S.geo&&S.geo.lat!=null?{lat:S.geo.lat,lon:S.geo.lon}:null);
  if(!h){el.querySelector('[data-gmtxt]').textContent='Ti serve una casa nel mondo per vedere la mappa del gioco';return;}
  GM.c0={lat:h.lat,lon:h.lon};GM.d=null;GM.rt.clear();GM.follow=true;GM.lastFollow=0;
  try{zmLoad(true);}catch(e){}misLoad(true);
  try{if(typeof mzUsoLoad==='function'&&!MZU)mzUsoLoad();}catch(e){}
  try{await loadML();}catch(e){el.querySelector('[data-gmtxt]').textContent='Mappa non disponibile: controlla la connessione';return;}if(!GM.on)return;
  const m=GM.map=new maplibregl.Map({container:el.querySelector('.gmmap'),style:gmStyle(),center:[h.lon,h.lat],zoom:17,pitch:50,minZoom:13,maxZoom:19,dragRotate:false,pitchWithRotate:false,attributionControl:false});
  try{m.touchZoomRotate.disableRotation();}catch(e){}
  m.on('idle',gmGraph);m.on('dragstart',()=>{GM.follow=false;});m.on('click',e=>gmTap(e.point.x,e.point.y,e.lngLat));
  gmAvInit(h);
  gmSize();addEventListener('resize',gmSize);GM.raf=requestAnimationFrame(gmLoop);}
function gmClose(){GM.on=false;if(GM.kd){removeEventListener('keydown',GM.kd);removeEventListener('keyup',GM.ku);GM.kd=null;}GM.dir={u:0,d:0,l:0,r:0};if(GM.base){GM.base=null;try{zmLoad(true);}catch(e){}}cancelAnimationFrame(GM.raf);removeEventListener('resize',gmSize);try{GM.map&&GM.map.remove&&GM.map.remove();}catch(e){}GM.map=null;const el=document.getElementById('gmap');if(el)el.remove();}
function gmSize(){const c=GM.cv;if(!c)return;const r=c.getBoundingClientRect(),dp=Math.min(2,devicePixelRatio||1);c.width=Math.max(1,r.width*dp);c.height=Math.max(1,r.height*dp);GM.dp=dp;try{GM.map&&GM.map.resize();}catch(e){}}
// da metri (attorno a casa) a punto sullo schermo della mappa
function gmScr(x,y){const p=GM.map.project(gmLL(x,y));return[p.x,p.y];}
function gmTap(X,Y,ll){if(!GM.map)return;let hit=null,bd=30;
  const chk=(x,y,o)=>{const p=gmScr(x,y);const d=Math.hypot(p[0]-X,p[1]-12-Y)-(o.k==='zombie'?8:0);if(d<bd){bd=d;hit=o;}};
  (ZM.L||[]).filter(z=>!z.preso).forEach(z=>{const p=gmXY(z.lat,z.lon);chk(p[0],p[1],{k:z.k,z});});
  const s=gmSup();chk(s.x,s.y,{k:'sup',s});(typeof myHouses==='function'?myHouses():[]).forEach(h=>{const p=gmXY(h.lat,h.lon);chk(p[0],p[1],{k:'casa'});});
  if(GM.av){const p=gmXY(GM.av.lat,GM.av.lon);chk(p[0],p[1],{k:'av'});}
  if(!hit||hit.k==='av'){if(hit&&hit.k==='av'){misSheet();return;}if(ll)gmCammina(ll.lat,ll.lng);return;}try{sfx&&sfx('tap');}catch(e){}
  if(hit.k==='zombie')arnCard(hit.z);else if(hit.k==='cassa')zmVicino();else if(hit.k==='casa')casasSheet();
  else if(hit.k==='sup'){const m=hit.s.m;if(m&&m.tipo==='scontro'&&hit.s.fermo)arnVai(m.id,m.ic);else if(m&&m.tipo==='spedizione'&&hit.s.fermo)supSheet('sped');else misSheet();}}
function gmLoop(now){if(!GM.on)return;const dt=Math.min(.05,(now-(GM.lastT||now))/1000);GM.lastT=now;GM.t=now/1000;if(GM.map){const s=gmSup();gmAvStep(dt);
    if(GM.follow&&GM.av&&now-(GM.lastFollow||0)>(GM.av.pad?120:GM.av.P?500:1500)){GM.lastFollow=now;try{GM.map.easeTo({center:[GM.av.lon,GM.av.lat],duration:GM.av.pad?120:GM.av.P?500:800});}catch(e){}}
    const txt=gmAvTxt(s);const tx=GM.el.querySelector('[data-gmtxt]');if(tx&&tx.textContent!==txt)tx.textContent=txt;gmDraw(s);}
  GM.raf=requestAnimationFrame(gmLoop);}
// 🏠 Case: sposta il gioco su una delle tue case (anche lontanissima): zombie di quella zona, il superstite parte da lì
function gmCase(){const H=(typeof myHouses==='function'?myHouses():[]);if(!H.length){toast('Non hai ancora case nel mondo');return;}
  openSheet('🏠 Gioca vicino a…',`<p class="muted" style="font-size:13px;margin:0 0 8px">Sposta la mappa del gioco su una tua casa: vedi gli zombie di quella zona e ci mandi il superstite da lì. Di persona combatti solo dove sei davvero.</p>${H.map((h,i)=>`<button class="mzopt ${GM.c0&&Math.abs(GM.c0.lat-h.lat)<1e-6&&Math.abs(GM.c0.lon-h.lon)<1e-6?'on':''}" data-gmc="${i}"><span>${h.ic||'🔑'}</span><b>${esc(h.label||'Casa')}</b><small>${h.km!=null?(h.km<1?Math.round(h.km*1000)+' m':Math.round(h.km)+' km')+' dalla prima':''}</small></button>`).join('')}`,
    c=>c.querySelectorAll('[data-gmc]').forEach(b=>b.onclick=()=>{const h=H[+b.dataset.gmc];closeSheet();gmVai(h);}));}
function gmVai(h){gmAvCasa(h);GM.base={lat:h.lat,lon:h.lon};GM.c0={lat:h.lat,lon:h.lon};GM.d=null;GM.rt.clear();GM.follow=true;GM.casa=h;
  try{GM.map&&GM.map.jumpTo({center:[h.lon,h.lat],zoom:17});}catch(e){}try{ZM.L=[];zmLoad(true);}catch(e){}toast(`📍 ${h.label||'Casa'}: zombie di questa zona`);}
// mentre la mappa del Gioco è su una casa, gli zombie si caricano intorno a quella casa
const _zmPos55=zmPos;zmPos=function(){if(GM.on&&GM.av)return{lat:GM.av.lat,lon:GM.av.lon};if(GM.on&&GM.base)return GM.base;return _zmPos55.apply(this,arguments);};
// sopra la mappa: percorso, case, zombie, casse e il superstite che cammina
function gmDraw(s){const c=GM.cv,x=GM.ctx,dp=GM.dp||1;if(!c.width)return;x.setTransform(dp,0,0,dp,0,0);const W=c.width/dp,H=c.height/dp,T=GM.t;x.clearRect(0,0,W,H);
  const z=Math.max(.7,Math.min(1.5,Math.pow(2,((GM.map.getZoom&&GM.map.getZoom())||17)-17)));
  if(s.R&&!s.fermo){x.setLineDash([6,6]);x.lineDashOffset=-T*20;x.strokeStyle='#ff3df2';x.lineWidth=4;x.beginPath();s.R.forEach((p,i)=>{const q=gmScr(p[0],p[1]);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.stroke();x.setLineDash([]);}
  (typeof myHouses==='function'?myHouses():[]).forEach(h=>{const p=gmXY(h.lat,h.lon);const q=gmScr(p[0],p[1]);gmEmoji(x,h.home?'🏠':'🏚️',q[0],q[1]-10,30*z);
    if(h.home){x.font='bold 10px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText('CASA',q[0]+1,q[1]+14);x.fillStyle='#fff';x.fillText('CASA',q[0],q[1]+13);}});
  (ZM.L||[]).filter(zz=>!zz.preso).forEach((zz,i)=>{const p=gmXY(zz.lat,zz.lon);const q=gmScr(p[0],p[1]);if(q[0]<-30||q[1]<-30||q[0]>W+30||q[1]>H+30)return;const bob=Math.sin(T*3+i)*2;
    x.fillStyle='#00000040';x.beginPath();x.ellipse(q[0],q[1]+4,10*z,3*z,0,0,7);x.fill();gmEmoji(x,zz.k==='cassa'?'📦':(ZM_T[zz.tipo]||['🧟'])[0],q[0],q[1]-8+bob,28*z);
    if(zz.k!=='cassa'&&(ZM_T[zz.tipo]||[0,1])[1]>=3){x.strokeStyle='#ffd23f';x.lineWidth=2;x.beginPath();x.arc(q[0],q[1]-8+bob,17*z,0,7);x.stroke();}});
  if(s.m){const q=gmScr(s.x,s.y);const a=s.a||0;if(gmMz()!=='piedi')gmVeicolo(x,q[0],q[1],a,gmMz(),!s.fermo,T);else gmOmino(x,q[0],q[1],a,s.fermo?0:T,!s.fermo);if(s.fermo&&s.ar){x.font='bold 18px sans-serif';x.textAlign='center';x.fillText('❗',q[0],q[1]-30+Math.sin(T*6)*2);}}
  if(GM.av&&!(s.m&&!s.fermo)){const p=gmXY(GM.av.lat,GM.av.lon),q=gmScr(p[0],p[1]);
    if(GM.av.P){x.setLineDash([3,5]);x.strokeStyle='#ffffffcc';x.lineWidth=3;x.beginPath();x.moveTo(q[0],q[1]);GM.av.P.slice(GM.av.i+1).forEach(pt=>{const r=gmScr(pt[0],pt[1]);x.lineTo(r[0],r[1]);});x.stroke();x.setLineDash([]);
      const e=GM.av.P[GM.av.P.length-1],r=gmScr(e[0],e[1]);x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(r[0],r[1],6+Math.sin(T*6)*2,0,7);x.stroke();}
    (ZM.L||[]).filter(zz=>!zz.preso&&zz.k==='zombie'&&trM(GM.av.lat,GM.av.lon,zz.lat,zz.lon)<=50).forEach(zz=>{const zp=gmXY(zz.lat,zz.lon),zq=gmScr(zp[0],zp[1]);
      x.strokeStyle='#3df24a';x.lineWidth=3;x.beginPath();x.arc(zq[0],zq[1]-8,20+Math.sin(T*8)*2,0,7);x.stroke();x.font='bold 12px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText('⚔️ TOCCA',zq[0]+1,zq[1]-33);x.fillStyle='#fff';x.fillText('⚔️ TOCCA',zq[0],zq[1]-34);});
    if(gmMz()!=='piedi')gmVeicolo(x,q[0],q[1],GM.av.a||0,gmMz(),!!GM.av.P,T);else gmOmino(x,q[0],q[1],GM.av.a||0,GM.av.P?T:0,!!GM.av.P);}}
// 🧭 il superstite guidato col tocco: cammina per le strade a 10 m/s; il server controlla velocità e raggio (world_esplora_muovi)
const GM_VEL=10;
async function gmAvInit(h){GM.av=null;let d=null;try{const r=await SB.rpc('world_esplora_dove');d=r&&r.data;}catch(e){}
  const raggio=((typeof SUP!=='undefined'&&SUP.d&&SUP.d.raggio_km)||3)*1000;const H=(typeof myHouses==='function'?myHouses():[]).filter(x=>x.lat!=null);
  if(d&&d.lat!=null&&H.some(x=>trM(d.lat,d.lon,x.lat,x.lon)<raggio)){GM.av={lat:d.lat,lon:d.lon,a:0};}else{await gmAvCasa(h,true);}
  try{GM.map.jumpTo({center:[GM.av.lon,GM.av.lat]});}catch(e){}GM.zmAt={lat:GM.av.lat,lon:GM.av.lon};try{zmLoad(true);}catch(e){}GM.mdAt=null;gmMondoLoad();}
async function gmAvCasa(h,zitto){GM.av={lat:h.lat,lon:h.lon,a:0};GM.zmAt=null;try{const{data}=await SB.rpc('world_esplora_muovi',{p_lat:h.lat,p_lon:h.lon,p_casa:true});if(data&&!data.ok&&!zitto)toast(data.msg);}catch(e){}GM.sent={t:Date.now(),lat:h.lat,lon:h.lon};}
function gmCammina(lat,lon){if(!GM.av)return;const a=gmXY(GM.av.lat,GM.av.lon),b=gmXY(lat,lon);if(Math.hypot(a[0]-b[0],a[1]-b[1])<4)return;
  const P=GM.d?gmRoute(a,b):[a,b];GM.av.P=P;GM.av.i=0;GM.av.f=0;GM.follow=true;try{sfx&&sfx('tap');}catch(e){}}
function gmAvStep(dt){const v=GM.av;if(!v)return;const D=GM.dir||{};const dx=(D.r?1:0)-(D.l?1:0),dy=(D.d?1:0)-(D.u?1:0);v.pad=!!(dx||dy);
  if(v.pad){v.P=null;const n=Math.hypot(dx,dy),a=gmXY(v.lat,v.lon);const x=a[0]+dx/n*GM_VEL*dt,y=a[1]+dy/n*GM_VEL*dt;v.a=Math.atan2(dy,dx);const ll=gmLL(x,y);v.lon=ll[0];v.lat=ll[1];gmAvSync(false);
    if(GM.zmAt&&trM(GM.zmAt.lat,GM.zmAt.lon,v.lat,v.lon)>120){GM.zmAt={lat:v.lat,lon:v.lon};try{zmLoad(true);}catch(e){}}return;}
  if(!v.P)return;let left=gmVel()*dt;
  while(left>0&&v.i<v.P.length-1){const a=v.P[v.i],b=v.P[v.i+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1])||.001;const rem=L*(1-v.f);
    if(left>=rem){left-=rem;v.i++;v.f=0;}else{v.f+=left/L;left=0;}v.a=Math.atan2(b[1]-a[1],b[0]-a[0]);}
  const a=v.P[v.i],b=v.P[Math.min(v.i+1,v.P.length-1)];const x=a[0]+(b[0]-a[0])*v.f,y=a[1]+(b[1]-a[1])*v.f;const ll=gmLL(x,y);v.lon=ll[0];v.lat=ll[1];
  if(v.i>=v.P.length-1){v.P=null;gmArrivato();}else gmAvSync(false);
  if(GM.zmAt&&trM(GM.zmAt.lat,GM.zmAt.lon,v.lat,v.lon)>120){GM.zmAt={lat:v.lat,lon:v.lon};try{zmLoad(true);}catch(e){}}}
async function gmAvSync(subito){const v=GM.av;if(!v||GM.syncing)return;if(!subito&&GM.sent&&Date.now()-GM.sent.t<1500)return;GM.syncing=true;
  try{const{data}=await SB.rpc('world_esplora_muovi',{p_lat:v.lat,p_lon:v.lon,p_casa:false});
    if(data&&data.ok)GM.sent={t:Date.now(),lat:v.lat,lon:v.lon};else if(data&&data.lat!=null){v.lat=data.lat;v.lon=data.lon;v.P=null;if(data.msg&&Date.now()-(GM.msgT||0)>4000){GM.msgT=Date.now();toast(data.msg);}}}catch(e){}GM.syncing=false;}
function gmAvTxt(s){const v=GM.av;if(!v)return s.txt;const z=(ZM.L||[]).filter(zz=>!zz.preso&&zz.k==='zombie').map(zz=>({zz,d:trM(v.lat,v.lon,zz.lat,zz.lon)})).sort((a,b)=>a.d-b.d)[0];
  if(z&&z.d<=50)return`⚔️ ${(ZM_N[z.zz.tipo]||'Zombie')} qui! Toccalo per combattere`;if(v.pad)return'🕹️ In cammino…';if(v.P)return'🚶 In cammino… tocca un altro punto per cambiare strada';
  return z?`🕹️ Usa la croce o tocca la mappa · zombie più vicino ${Math.round(z.d)} m`:'🕹️ Usa la croce o tocca la mappa per camminare';}
function gmEmoji(x,e,cx,cy,sz){x.fillStyle='#000';x.font=`${sz}px system-ui, "Apple Color Emoji", sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(e,cx,cy);x.textBaseline='alphabetic';}
function gmOmino(x,cx,cy,a,T,cammina){const av=(typeof SV!=='undefined'&&SV.d&&SV.d.avatar)||{};const col=SV_C[av.c||0]||'#ffd23f';const pelle='#f1c27d';const u=2.2;
  const passo=cammina?Math.sin(T*10):0;const lato=Math.cos(a)<0?-1:1;
  x.fillStyle='#00000055';x.beginPath();x.ellipse(cx,cy+2,8,3,0,0,7);x.fill();
  const R=(px,py,w,h,c)=>{x.fillStyle=c;x.fillRect(Math.round(cx+px*u*lato-(lato<0?w*u:0)),Math.round(cy+py*u),w*u,h*u);};
  R(-3,-3,2,3+(passo>0?0:-1),'#24315e');R(1,-3,2,3+(passo>0?-1:0),'#24315e');R(-3,0+(passo>0?0:-1),2,1,'#111');R(1,0+(passo>0?-1:0),2,1,'#111');
  R(-4,-9,8,6,col);R(-5,-8+(passo>0?1:0),1,4,pelle);R(4,-8+(passo>0?0:1),1,4,pelle);
  R(-3,-15,6,6,pelle);R(-3,-16,6,2,'#3a2412');R(-3,-14,6,1,'#e8212e');R(1,-12,1,1,'#111');
  x.font='bold 9px monospace';x.textAlign='center';const n=((typeof SV!=='undefined'&&SV.d&&SV.d.nome)||(S.user&&S.user.nick)||'Tu');x.fillStyle='#000';x.fillText(n,cx+1,cy-38);x.fillStyle='#fff';x.fillText(n,cx,cy-39);}
// il tasto 🎮 Gioco della barra apre la mappa del gioco (al posto di Lente)
const _sbHTML55=sbHTML;sbHTML=function(){let h=_sbHTML55.apply(this,arguments).replace('<span>📷</span><b>Lente</b>','<span>🎮</span><b>Gioco</b>');if(GM.on)h=h.replace(/class="on"/g,'class=""').replace('data-sb="gioca" class=""','data-sb="gioca" class="on"');return h;};
const _sbGo55=sbGo;sbGo=function(k){if(k==='gioca'){gmOpen();return;}if(GM.on)gmClose();return _sbGo55.apply(this,arguments);};
zEvery(()=>{try{if(GM.on&&!document.hidden)misLoad(false);}catch(e){}},15000,'gioco-mappa');
// "Zombie qui intorno": ogni riga si tocca → scheda dell'incontro (difficoltà, di persona o col superstite, casa e mezzo); casse → Vicino a te
const _zmRadar55=zmRadarSheet;zmRadarSheet=function(){const r=_zmRadar55.apply(this,arguments);try{const p=zmPos();
  const L=(ZM.L||[]).filter(z=>!z.preso).map(z=>({...z,d:p?trM(p.lat,p.lon,z.lat,z.lon):null})).sort((a,b)=>(a.d||0)-(b.d||0)).slice(0,12);
  const box=(typeof LENTE!=='undefined'&&LENTE.on&&LENTE.root)?LENTE.root.querySelector('.zmlist'):document.querySelector('#sheet.open .zmlistsheet');
  if(box)box.querySelectorAll('.zmrow').forEach((row,i)=>{const z=L[i];if(!z)return;row.classList.add('zmtap');row.setAttribute('role','button');row.insertAdjacentHTML('beforeend','<i>›</i>');
    row.onclick=e=>{e.stopPropagation();const lx=box.closest('.zmlist');if(lx)lx.remove();if(z.k==='cassa')zmVicino();else arnCard(z);};});}catch(e){}return r;};
// 🔗 il Mondo nel Gioco (Fase 59): presidi 🚩 e case degli alleati 🤝 sulla mappa del gioco; tocco → loro scheda
async function gmMondoLoad(){if(!GM.on||!S.user||typeof SB==='undefined'||!SB)return;const c=GM.av||GM.c0;if(!c)return;
  if(GM.mdAt&&trM(GM.mdAt.lat,GM.mdAt.lon,c.lat,c.lon)<800&&Date.now()-GM.mdAt.t<300000)return;GM.mdAt={lat:c.lat,lon:c.lon,t:Date.now()};
  try{const{data}=await SB.rpc('world_presidi_list',{p_minlat:c.lat-.02,p_minlon:c.lon-.03,p_maxlat:c.lat+.02,p_maxlon:c.lon+.03});
    GM.pres=(data&&data.presidi)||[];if(typeof PRES!=='undefined')GM.pres.forEach(p=>{if(!PRES.L.some(x=>x.id===p.id))PRES.L.push(p);});}catch(e){}
  try{const A=(typeof ALS!=='undefined'&&ALS.L)||(typeof alsLoad==='function'?await alsLoad(true):null)||[];
    const V=await Promise.all(A.slice(0,8).map(a=>SB.rpc('world_ally_view',{p_user:a.user_id}).then(r=>r.data).catch(()=>null)));
    GM.ally=[];V.filter(v=>v&&v.ok).forEach(d=>(d.houses||[]).forEach(T=>{if(T.lat!=null&&T.lon!=null)GM.ally.push({u:d.user_id,nick:d.nick,lat:T.lat,lon:T.lon});}));}catch(e){}}
function gmMondoPts(){const P=[];if(!GM.map)return P;
  (GM.pres||[]).forEach(p=>P.push({k:'pres',id:p.id,lat:p.lat,lon:p.lon,ic:(typeof PRES_K!=='undefined'&&PRES_K[p.kind]||['🚩'])[0],mio:p.stato==='mio',lb:p.name||'Presidio'}));
  (GM.ally||[]).forEach(a=>P.push({k:'ally',u:a.u,lat:a.lat,lon:a.lon,ic:'🤝',lb:'@'+(a.nick||'alleato')}));
  P.forEach(p=>{const q=gmXY(p.lat,p.lon);const r=gmScr(q[0],q[1]);p.x=r[0];p.y=r[1];});return P;}
const _gmDrawM=gmDraw;
gmDraw=function(s){_gmDrawM(s);try{const x=GM.ctx;if(!x||!GM.map)return;const dp=GM.dp||1;x.setTransform(dp,0,0,dp,0,0);
  gmMondoPts().forEach(p=>{x.fillStyle=p.k==='ally'?'#2f6db3':p.mio?'#2e9e4f':'#c0392b';x.strokeStyle='#111';x.lineWidth=2;x.beginPath();x.arc(p.x,p.y-12,13,0,7);x.fill();x.stroke();
    gmEmoji(x,p.ic,p.x,p.y-12,15);x.font='bold 10px system-ui';x.textAlign='center';x.fillStyle='#000';x.fillText(p.lb.slice(0,16),p.x+1,p.y+11);x.fillStyle='#fff';x.fillText(p.lb.slice(0,16),p.x,p.y+10);});}catch(e){}};
const _gmTapM=gmTap;
gmTap=function(X,Y,ll){try{const zv=(ZM.L||[]).some(z=>{const q=gmXY(z.lat,z.lon),r=gmScr(q[0],q[1]);return Math.hypot(r[0]-X,r[1]-Y)<26;});
    if(!zv){const h=gmMondoPts().map(p=>({p,d:Math.hypot(p.x-X,p.y-12-Y)})).filter(o=>o.d<22).sort((a,b)=>a.d-b.d)[0];
      if(h){if(h.p.k==='pres'&&typeof presSheet==='function')presSheet(h.p.id);else if(h.p.k==='ally'&&typeof allySheet==='function')allySheet(h.p.u);return;}}}catch(e){}
  return _gmTapM(X,Y,ll);};
zEvery(()=>{if(GM.on)gmMondoLoad();},20000,'gioco-mondo');
// 🚗 spostamenti automatici (Fase 59): il superstite va per le strade col mezzo che usi, lo guardi muoversi; arrivato vicino allo zombie si combatte
const GM_MZV={piedi:6,bici:9,moto:14,auto:18,fuori:16,furgone:15};
function gmMz(){const m=(typeof MZU!=='undefined'&&MZU)||'piedi';return GM_MZV[m]?m:'piedi';}
function gmVel(){return GM_MZV[gmMz()];}
function gmMzIc(){return(typeof MZ!=='undefined'&&MZ[gmMz()]&&MZ[gmMz()][0])||'🚶';}
async function gmArrivato(){await gmAvSync(true);const g=GM.goal;if(!g||!GM.av)return;GM.goal=null;
  if(trM(GM.av.lat,GM.av.lon,g.z.lat,g.z.lon)>50){toast('Non sono arrivato abbastanza vicino: tocca di nuovo lo zombie');return;}
  try{sfx&&sfx('boom');}catch(e){}arnParti(g.z,'esplora',g.diff||'equilibrato',document.createElement('button'));}
// mezzo visto dall'alto, stile anni '90: carrozzeria, vetri, ruote, fari
function gmVeicolo(x,cx,cy,a,mz,va,T){const L={bici:[14,4],moto:[16,6],auto:[24,12],fuori:[26,14],furgone:[30,14]}[mz]||[24,12];const col={bici:'#3df2ff',moto:'#ff3df2',auto:'#e8212e',fuori:'#4b5d2e',furgone:'#e8e8e8'}[mz]||'#e8212e';
  x.save();x.translate(cx,cy);x.rotate(a);const l=L[0],w=L[1];x.fillStyle='#00000066';x.fillRect(-l/2+2,-w/2+3,l,w);
  if(mz==='bici'||mz==='moto'){x.fillStyle='#111';x.fillRect(-l/2,-1.5,4,3);x.fillRect(l/2-4,-1.5,4,3);x.fillStyle=col;x.fillRect(-l/2+3,-w/2,l-6,w);x.fillStyle='#f1c27d';x.beginPath();x.arc(-1,0,3,0,7);x.fill();x.fillStyle='#e8212e';x.fillRect(-2,-3,2,6);}
  else{x.fillStyle='#111';[[-l/2+3,-w/2-1.5],[l/2-8,-w/2-1.5],[-l/2+3,w/2-1.5],[l/2-8,w/2-1.5]].forEach(p=>x.fillRect(p[0],p[1],5,3));
    x.fillStyle='#0a0612';x.fillRect(-l/2-1,-w/2-1,l+2,w+2);x.fillStyle=col;x.fillRect(-l/2,-w/2,l,w);x.fillStyle='#ffffff44';x.fillRect(-l/2,-w/2,l,2);
    x.fillStyle='#9fd3ff';x.fillRect(l/2-9,-w/2+2,4,w-4);x.fillStyle='#6aa0c8';x.fillRect(-l/2+3,-w/2+2,3,w-4);x.fillStyle='#00000033';x.fillRect(-l/2+7,-w/2+2,l-17,w-4);
    if(mz==='furgone'){x.fillStyle='#c0c0c0';x.fillRect(-l/2+1,-w/2+1,l-12,w-2);}
    x.fillStyle=va&&Math.floor(T*4)%2?'#ffe66d':'#fff8c0';x.fillRect(l/2-1,-w/2+1,2,3);x.fillRect(l/2-1,w/2-4,2,3);
    if(va){x.fillStyle='#ffe66d22';x.beginPath();x.moveTo(l/2,-w/2);x.lineTo(l/2+30,-w);x.lineTo(l/2+30,w);x.lineTo(l/2,w/2);x.fill();}}
  x.restore();x.font='bold 9px monospace';x.textAlign='center';const n=((typeof SV!=='undefined'&&SV.d&&SV.d.nome)||(S.user&&S.user.nick)||'Tu');x.fillStyle='#000';x.fillText(n,cx+1,cy-17);x.fillStyle='#fff';x.fillText(n,cx,cy-18);}
</script>