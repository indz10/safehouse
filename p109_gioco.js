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
   {id:'bg',type:'background',paint:{'background-color':'#78c850'}},
   {id:'res',type:'fill',source:'omt','source-layer':'landuse',filter:['in',['get','class'],['literal',['residential','suburb','neighbourhood','commercial','retail','industrial']]],paint:{'fill-color':'#84cc5a'}},
   {id:'farm',type:'fill',source:'omt','source-layer':'landcover',filter:['in',['get','class'],['literal',['farmland','grass']]],paint:{'fill-color':'#98d868'}},
   {id:'wood',type:'fill',source:'omt','source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'#2f8a3a','fill-outline-color':'#1f5a28'}},
   {id:'park',type:'fill',source:'omt','source-layer':'park',paint:{'fill-color':'#48a848','fill-outline-color':'#2f7a2f'}},
   {id:'water',type:'fill',source:'omt','source-layer':'water',paint:{'fill-color':'#4aa0f0','fill-outline-color':'#2a70c0'}},
   {id:'waterway',type:'line',source:'omt','source-layer':'waterway',paint:{'line-color':'#4aa0f0','line-width':['interpolate',['linear'],['zoom'],12,1.5,17,8]}},
   {id:'path',type:'line',source:'omt','source-layer':'transportation',filter:['in',['get','class'],['literal',['path','track']]],paint:{'line-color':'#d8c088','line-width':[...R,14,1,18,6]}},
   {id:'road-cas',type:'line',source:'omt','source-layer':'transportation',filter:ROADS,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8a6a3a','line-width':[...R,12,['match',['get','class'],MJ,4,SC,3,2],18,['match',['get','class'],MJ,34,SC,28,['service'],12,22]]}},
   {id:'road',type:'line',source:'omt','source-layer':'transportation',filter:ROADS,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],MJ,'#f8e8b8','#f0dca8'],'line-width':[...R,12,['match',['get','class'],MJ,2.6,SC,2,1.2],18,['match',['get','class'],MJ,28,SC,23,['service'],8,17]]}},
   {id:'bld',type:'fill',source:'omt','source-layer':'building',minzoom:14,paint:{'fill-color':['match',['%',['to-number',['id'],0],5],0,'#d05848',1,'#5878c8',2,'#c89048',3,'#9868b8','#d8784a'],'fill-outline-color':'#2a1810'}},
   {id:'bld-line',type:'line',source:'omt','source-layer':'building',minzoom:15,paint:{'line-color':'#2a1810','line-width':1.6}},
   {id:'nomi',type:'symbol',source:'omt','source-layer':'transportation_name',minzoom:16,layout:{'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Bold'],'text-size':11},paint:{'text-color':'#3a2a10','text-halo-color':'#f8ecc8','text-halo-width':2}}]};}
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
  if(!isFinite(dist[t]))return[a,b];const P=[];for(let u=t;u>=0;u=prev[u])P.push(d.N[u]);P.reverse();return[a,...P,b];}
function gmAlong(P,f){let L=0;const seg=[];for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);seg.push(l);L+=l;}let r=Math.max(0,Math.min(1,f))*L;
  for(let i=0;i<seg.length;i++){if(r<=seg[i]){const k=seg[i]?r/seg[i]:0;return[P[i][0]+(P[i+1][0]-P[i][0])*k,P[i][1]+(P[i+1][1]-P[i][1])*k,Math.atan2(P[i+1][1]-P[i][1],P[i+1][0]-P[i][0])];}r-=seg[i];}
  const n=P.length-1;return[P[n][0],P[n][1],0];}
// dove si trova il superstite adesso: in viaggio verso lo zombie (solo andata) o in spedizione (andata e ritorno)
function gmSup(){const L=(MIS.L||[]).filter(m=>(m.tipo==='scontro'||m.tipo==='spedizione')&&m.lat!=null);const home=gmXY(GM.c0.lat,GM.c0.lon);
  if(!L.length)return{x:home[0],y:home[1],a:0,fermo:true,txt:'🏠 A casa · tocca uno zombie per affrontarlo'};
  const m=L[0];const key=m.tipo+m.id;let R=GM.rt.get(key);const meta=gmXY(m.lat,m.lon);{const H=(typeof myHouses==='function'?myHouses():[]).filter(h=>h.lat!=null);if(H.length){const hb=H.slice().sort((a,b)=>trM(a.lat,a.lon,m.lat,m.lon)-trM(b.lat,b.lon,m.lat,m.lon))[0];const hp=gmXY(hb.lat,hb.lon);home[0]=hp[0];home[1]=hp[1];}}if(!R){if(GM.d){R=gmRoute(home,meta);GM.rt.set(key,R);}else R=[home,meta];}
  const t0=new Date(m.inizio).getTime(),t1=m.fineMs||new Date(m.fine).getTime();let f=t1>t0?(Date.now()-t0)/(t1-t0):1;f=Math.max(0,Math.min(1,f));
  const ar=m.tipo==='scontro';const pos=ar?gmAlong(R,f):(f<.5?gmAlong(R,f*2):gmAlong(R.slice().reverse(),(f-.5)*2));const left=Math.max(0,(t1-Date.now())/1000);
  const txt=ar?(f>=1?`🧟 Arrivato da ${m.titolo.replace(/^Verso /,'')} · ⚔️ tocca per combattere`:`🎒 Verso ${m.titolo.replace(/^Verso /,'')} · ${misT(left)}`):(f>=1?'📦 Spedizione tornata: raccogli':`🎒 Spedizione · ${f<.5?'andata':'ritorno'} · ${misT(left)}`);
  return{x:pos[0],y:pos[1],a:pos[2],fermo:f>=1,txt,m,R,f,ar};}
async function gmOpen(){if(GM.on)return;GM.on=true;try{zmClose();}catch(e){}closeSheet();
  document.body.insertAdjacentHTML('beforeend',`<div id="gmap"><div class="gmmap"></div><canvas></canvas><div class="gmtop"><b>🎮 Gioco</b><span data-gmtxt>Carico la mappa…</span><button class="gmx" data-gmx aria-label="Chiudi">✕</button></div>
    <div class="gmside">${[['lente','📷','Lente'],['vicini','🧟','Vicini'],['mis','⏳','Missioni'],['pedia','📖','Zombipedia'],['dfa','🛡️','Difendi'],['boss','👹','Boss'],['evt','🚨','Eventi'],['case','🏠','Case'],['mv','❓','Come']].map(b=>`<button data-gmb="${b[0]}"><span>${b[1]}</span><small>${b[2]}</small></button>`).join('')}</div>
    <div class="gmzoom"><button data-gmz="1">＋</button><button data-gmz="-1">－</button><button data-gmz="0" aria-label="Segui il superstite">🎯</button></div></div>`);
  const el=document.getElementById('gmap');GM.el=el;GM.cv=el.querySelector('canvas');GM.ctx=GM.cv.getContext('2d');
  el.querySelector('[data-gmx]').onclick=gmClose;
  el.querySelectorAll('[data-gmz]').forEach(b=>b.onclick=()=>{const k=+b.dataset.gmz;const m=GM.map;if(!m)return;if(!k){GM.follow=true;GM.lastFollow=0;return;}m.easeTo({zoom:Math.max(13,Math.min(19,m.getZoom()+k)),duration:250});});
  const A={case:()=>gmCase(),lente:()=>{gmClose();lenteOpen();},vicini:()=>zmRadarSheet(),mis:()=>misSheet(),pedia:()=>zmPedia(),dfa:()=>dfaGo(),boss:()=>bossSheet(),mv:()=>mvSheet(),
    evt:()=>{const ev=typeof EVT!=='undefined'?evtAperti().filter(e=>e.km!=null&&e.km<=e.raggio):[];if(ev.length)evtSheet(ev[0].id);else toast('🚨 Nessun evento qui vicino adesso: ti arriva la notifica quando compare');}};
  el.querySelectorAll('[data-gmb]').forEach(b=>b.onclick=()=>{const f=A[b.dataset.gmb];if(f)f();});
  const hs=(typeof myHouses==='function'?myHouses():[]);const h=hs[0]||(S.geo&&S.geo.lat!=null?{lat:S.geo.lat,lon:S.geo.lon}:null);
  if(!h){el.querySelector('[data-gmtxt]').textContent='Ti serve una casa nel mondo per vedere la mappa del gioco';return;}
  GM.c0={lat:h.lat,lon:h.lon};GM.d=null;GM.rt.clear();GM.follow=true;GM.lastFollow=0;
  try{zmLoad(true);}catch(e){}misLoad(true);
  try{await loadML();}catch(e){el.querySelector('[data-gmtxt]').textContent='Mappa non disponibile: controlla la connessione';return;}if(!GM.on)return;
  const m=GM.map=new maplibregl.Map({container:el.querySelector('.gmmap'),style:gmStyle(),center:[h.lon,h.lat],zoom:17,minZoom:13,maxZoom:19,dragRotate:false,pitchWithRotate:false,attributionControl:false});
  try{m.touchZoomRotate.disableRotation();}catch(e){}
  m.on('idle',gmGraph);m.on('dragstart',()=>{GM.follow=false;});m.on('click',e=>gmTap(e.point.x,e.point.y));
  gmSize();addEventListener('resize',gmSize);GM.raf=requestAnimationFrame(gmLoop);}
function gmClose(){GM.on=false;if(GM.base){GM.base=null;try{zmLoad(true);}catch(e){}}cancelAnimationFrame(GM.raf);removeEventListener('resize',gmSize);try{GM.map&&GM.map.remove&&GM.map.remove();}catch(e){}GM.map=null;const el=document.getElementById('gmap');if(el)el.remove();}
function gmSize(){const c=GM.cv;if(!c)return;const r=c.getBoundingClientRect(),dp=Math.min(2,devicePixelRatio||1);c.width=Math.max(1,r.width*dp);c.height=Math.max(1,r.height*dp);GM.dp=dp;try{GM.map&&GM.map.resize();}catch(e){}}
// da metri (attorno a casa) a punto sullo schermo della mappa
function gmScr(x,y){const p=GM.map.project(gmLL(x,y));return[p.x,p.y];}
function gmTap(X,Y){if(!GM.map)return;let hit=null,bd=30;
  const chk=(x,y,o)=>{const p=gmScr(x,y);const d=Math.hypot(p[0]-X,p[1]-12-Y)-(o.k==='zombie'?8:0);if(d<bd){bd=d;hit=o;}};
  (ZM.L||[]).filter(z=>!z.preso).forEach(z=>{const p=gmXY(z.lat,z.lon);chk(p[0],p[1],{k:z.k,z});});
  const s=gmSup();chk(s.x,s.y,{k:'sup',s});(typeof myHouses==='function'?myHouses():[]).forEach(h=>{const p=gmXY(h.lat,h.lon);chk(p[0],p[1],{k:'casa'});});
  if(!hit)return;try{sfx&&sfx('tap');}catch(e){}
  if(hit.k==='zombie')arnCard(hit.z);else if(hit.k==='cassa')zmVicino();else if(hit.k==='casa')casasSheet();
  else if(hit.k==='sup'){const m=hit.s.m;if(m&&m.tipo==='scontro'&&hit.s.fermo)arnVai(m.id,m.ic);else if(m&&m.tipo==='spedizione'&&hit.s.fermo)supSheet('sped');else misSheet();}}
function gmLoop(now){if(!GM.on)return;GM.t=now/1000;if(GM.map){const s=gmSup();
    if(GM.follow&&!s.fermo&&now-(GM.lastFollow||0)>1200){GM.lastFollow=now;try{GM.map.easeTo({center:gmLL(s.x,s.y),duration:1000});}catch(e){}}
    const tx=GM.el.querySelector('[data-gmtxt]');if(tx&&tx.textContent!==s.txt)tx.textContent=s.txt;gmDraw(s);}
  GM.raf=requestAnimationFrame(gmLoop);}
// 🏠 Case: sposta il gioco su una delle tue case (anche lontanissima): zombie di quella zona, il superstite parte da lì
function gmCase(){const H=(typeof myHouses==='function'?myHouses():[]);if(!H.length){toast('Non hai ancora case nel mondo');return;}
  openSheet('🏠 Gioca vicino a…',`<p class="muted" style="font-size:13px;margin:0 0 8px">Sposta la mappa del gioco su una tua casa: vedi gli zombie di quella zona e ci mandi il superstite da lì. Di persona combatti solo dove sei davvero.</p>${H.map((h,i)=>`<button class="mzopt ${GM.c0&&Math.abs(GM.c0.lat-h.lat)<1e-6&&Math.abs(GM.c0.lon-h.lon)<1e-6?'on':''}" data-gmc="${i}"><span>${h.ic||'🔑'}</span><b>${esc(h.label||'Casa')}</b><small>${h.km!=null?(h.km<1?Math.round(h.km*1000)+' m':Math.round(h.km)+' km')+' dalla prima':''}</small></button>`).join('')}`,
    c=>c.querySelectorAll('[data-gmc]').forEach(b=>b.onclick=()=>{const h=H[+b.dataset.gmc];closeSheet();gmVai(h);}));}
function gmVai(h){GM.base={lat:h.lat,lon:h.lon};GM.c0={lat:h.lat,lon:h.lon};GM.d=null;GM.rt.clear();GM.follow=true;GM.casa=h;
  try{GM.map&&GM.map.jumpTo({center:[h.lon,h.lat],zoom:17});}catch(e){}try{ZM.L=[];zmLoad(true);}catch(e){}toast(`📍 ${h.label||'Casa'}: zombie di questa zona`);}
// mentre la mappa del Gioco è su una casa, gli zombie si caricano intorno a quella casa
const _zmPos55=zmPos;zmPos=function(){if(GM.on&&GM.base)return GM.base;return _zmPos55.apply(this,arguments);};
// sopra la mappa: percorso, case, zombie, casse e il superstite che cammina
function gmDraw(s){const c=GM.cv,x=GM.ctx,dp=GM.dp||1;if(!c.width)return;x.setTransform(dp,0,0,dp,0,0);const W=c.width/dp,H=c.height/dp,T=GM.t;x.clearRect(0,0,W,H);
  const z=Math.max(.7,Math.min(1.5,Math.pow(2,((GM.map.getZoom&&GM.map.getZoom())||17)-17)));
  if(s.R&&!s.fermo){x.setLineDash([6,6]);x.lineDashOffset=-T*20;x.strokeStyle='#ff3df2';x.lineWidth=4;x.beginPath();s.R.forEach((p,i)=>{const q=gmScr(p[0],p[1]);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.stroke();x.setLineDash([]);}
  (typeof myHouses==='function'?myHouses():[]).forEach(h=>{const p=gmXY(h.lat,h.lon);const q=gmScr(p[0],p[1]);gmEmoji(x,h.home?'🏠':'🏚️',q[0],q[1]-10,30*z);
    if(h.home){x.font='bold 10px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText('CASA',q[0]+1,q[1]+14);x.fillStyle='#fff';x.fillText('CASA',q[0],q[1]+13);}});
  (ZM.L||[]).filter(zz=>!zz.preso).forEach((zz,i)=>{const p=gmXY(zz.lat,zz.lon);const q=gmScr(p[0],p[1]);if(q[0]<-30||q[1]<-30||q[0]>W+30||q[1]>H+30)return;const bob=Math.sin(T*3+i)*2;
    x.fillStyle='#00000040';x.beginPath();x.ellipse(q[0],q[1]+4,10*z,3*z,0,0,7);x.fill();gmEmoji(x,zz.k==='cassa'?'📦':(ZM_T[zz.tipo]||['🧟'])[0],q[0],q[1]-8+bob,28*z);
    if(zz.k!=='cassa'&&(ZM_T[zz.tipo]||[0,1])[1]>=3){x.strokeStyle='#ffd23f';x.lineWidth=2;x.beginPath();x.arc(q[0],q[1]-8+bob,17*z,0,7);x.stroke();}});
  const q=gmScr(s.x,s.y);gmOmino(x,q[0],q[1],s.a,s.fermo?0:T,!s.fermo);
  if(s.fermo&&s.m&&s.ar){x.font='bold 18px sans-serif';x.textAlign='center';x.fillText('❗',q[0],q[1]-34+Math.sin(T*6)*2);}}
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
</script>
