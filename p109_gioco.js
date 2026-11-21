<script>
/* 🎮 GIOCO: mappa stile Pokémon (Fase 55, migrazione 048)
   Il tasto 🎮 Gioco apre #gmap: prato in pixel art, strade e case vere (OpenStreetMap, 7 giorni in memoria), alberi,
   zombie e casse del mondo (ZM.L), le tue case e il superstite che cammina PER LE STRADE (percorso più breve sul
   grafo delle strade) verso lo zombie o la spedizione, secondo il tempo del viaggio (world_missioni con lat/lon).
   Tocchi: zombie → arnCard, cassa → zmVicino, superstite → misSheet, casa → casasSheet. Tasti: Lente, Vicini, Zombipedia… */
const GM={on:false,d:null,c0:null,cam:{x:0,y:0,z:1.6},raf:0,drag:null,follow:true,rt:new Map(),t:0};
const GM_KEY='zsh_gmap2_';
function gmXY(lat,lon){const c=GM.c0;return[(lon-c.lon)*111320*Math.cos(c.lat*Math.PI/180),-(lat-c.lat)*110540];}
async function gmLoad(){const hs=(typeof myHouses==='function'?myHouses():[]);const h=hs[0]||(S.geo&&S.geo.lat!=null?{lat:S.geo.lat,lon:S.geo.lon}:null);if(!h)return null;
  GM.c0={lat:h.lat,lon:h.lon};const k=GM_KEY+h.lat.toFixed(3)+'_'+h.lon.toFixed(3);
  try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v&&Date.now()-v.t<7*864e5){GM.d=gmPrep(v.r,v.b);return GM.d;}}catch(e){}
  let els=[];try{els=await trOverpass(`[out:json][timeout:25];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path|cycleway|track|steps)$"](around:1500,${h.lat},${h.lon});)->.r;.r out geom;way["building"](around:450,${h.lat},${h.lon});out geom 400;`,22000);}catch(e){els=[];}
  const r=[],b=[];els.forEach(e=>{if(!e.geometry)return;const g=e.geometry.map(p=>[+p.lat.toFixed(6),+p.lon.toFixed(6)]);if(e.tags&&e.tags.building)b.push(g);else r.push([e.tags&&e.tags.highway||'',g]);});
  if(r.length)try{localStorage.setItem(k,JSON.stringify({t:Date.now(),r,b}));}catch(e){}
  GM.d=gmPrep(r,b);return GM.d;}
// strade → grafo (nodi = punti, archi = tratti) per il percorso più breve; alberi dove non ci sono strade né case
function gmPrep(r,b){const nodes=new Map(),N=[],adj=[];const id=(lat,lon)=>{const k=lat+','+lon;let i=nodes.get(k);if(i==null){i=N.length;nodes.set(k,i);N.push(gmXY(lat,lon));adj.push([]);}return i;};
  const W={motorway:9,trunk:9,primary:8,secondary:7,tertiary:6,unclassified:5,residential:5,living_street:5,service:3.5,pedestrian:4,track:3,footway:2.2,path:2.2,cycleway:2.2,steps:2};
  const roads=r.map(([hw,g])=>{const pts=g.map(p=>gmXY(p[0],p[1]));for(let i=1;i<g.length;i++){const a=id(g[i-1][0],g[i-1][1]),c=id(g[i][0],g[i][1]);const L=Math.hypot(N[a][0]-N[c][0],N[a][1]-N[c][1]);adj[a].push([c,L]);adj[c].push([a,L]);}return{w:W[hw]||4,pts,hw};});
  const blds=b.map(g=>g.map(p=>gmXY(p[0],p[1])));
  const trees=[];const near=(x,y)=>roads.some(R=>R.pts.some(p=>Math.abs(p[0]-x)<14&&Math.abs(p[1]-y)<14));
  for(let gx=-700;gx<=700;gx+=26)for(let gy=-700;gy<=700;gy+=26){const hsh=Math.abs(Math.sin(gx*12.9898+gy*78.233)*43758.5453)%1;if(hsh>.42)continue;const x=gx+(hsh-.2)*30,y=gy+((hsh*7)%1-.5)*20;
    if(trees.length<500&&!near(x,y))trees.push([x,y,hsh]);}
  return{roads,blds,trees,N,adj};}
function gmNear(x,y){const d=GM.d;let best=-1,bd=1e18;if(!d)return-1;for(let i=0;i<d.N.length;i++){const q=(d.N[i][0]-x)**2+(d.N[i][1]-y)**2;if(q<bd){bd=q;best=i;}}return best;}
// percorso più breve (Dijkstra con una coda semplice); se non c'è, linea dritta
function gmRoute(a,b){const d=GM.d;const s=gmNear(a[0],a[1]),t=gmNear(b[0],b[1]);if(s<0||t<0||s===t)return[a,b];
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
  const m=L[0];const key=m.tipo+m.id;let R=GM.rt.get(key);const meta=gmXY(m.lat,m.lon);if(!R){R=gmRoute(home,meta);GM.rt.set(key,R);}
  const t0=new Date(m.inizio).getTime(),t1=m.fineMs||new Date(m.fine).getTime();let f=t1>t0?(Date.now()-t0)/(t1-t0):1;f=Math.max(0,Math.min(1,f));
  const ar=m.tipo==='scontro';const pos=ar?gmAlong(R,f):(f<.5?gmAlong(R,f*2):gmAlong(R.slice().reverse(),(f-.5)*2));const left=Math.max(0,(t1-Date.now())/1000);
  const txt=ar?(f>=1?`🧟 Arrivato da ${m.titolo.replace(/^Verso /,'')} · ⚔️ tocca per combattere`:`🎒 Verso ${m.titolo.replace(/^Verso /,'')} · ${misT(left)}`):(f>=1?'📦 Spedizione tornata: raccogli':`🎒 Spedizione · ${f<.5?'andata':'ritorno'} · ${misT(left)}`);
  return{x:pos[0],y:pos[1],a:pos[2],fermo:f>=1,txt,m,R,f,ar};}
async function gmOpen(){if(GM.on)return;GM.on=true;try{zmClose();}catch(e){}closeSheet();
  document.body.insertAdjacentHTML('beforeend',`<div id="gmap"><canvas></canvas><div class="gmtop"><b>🎮 Gioco</b><span data-gmtxt>Carico le strade…</span><button class="gmx" data-gmx aria-label="Chiudi">✕</button></div>
    <div class="gmside">${[['lente','📷','Lente'],['vicini','🧟','Vicini'],['mis','⏳','Missioni'],['pedia','📖','Zombipedia'],['dfa','🛡️','Difendi'],['boss','👹','Boss'],['evt','🚨','Eventi'],['mv','❓','Come']].map(b=>`<button data-gmb="${b[0]}"><span>${b[1]}</span><small>${b[2]}</small></button>`).join('')}</div>
    <div class="gmzoom"><button data-gmz="1">＋</button><button data-gmz="-1">－</button><button data-gmz="0" aria-label="Segui il superstite">🎯</button></div></div>`);
  const el=document.getElementById('gmap');GM.el=el;GM.cv=el.querySelector('canvas');GM.ctx=GM.cv.getContext('2d');
  el.querySelector('[data-gmx]').onclick=gmClose;
  el.querySelectorAll('[data-gmz]').forEach(b=>b.onclick=()=>{const k=+b.dataset.gmz;if(!k){GM.follow=true;return;}GM.cam.z=Math.max(.6,Math.min(4,GM.cam.z*(k>0?1.35:1/1.35)));});
  const A={lente:()=>{gmClose();lenteOpen();},vicini:()=>zmRadarSheet(),mis:()=>misSheet(),pedia:()=>zmPedia(),dfa:()=>dfaGo(),boss:()=>bossSheet(),
    mv:()=>mvSheet(),evt:()=>{const ev=typeof EVT!=='undefined'?evtAperti().filter(e=>e.km!=null&&e.km<=e.raggio):[];if(ev.length)evtSheet(ev[0].id);else toast('🚨 Nessun evento qui vicino adesso: ti arriva la notifica quando compare');}};
  el.querySelectorAll('[data-gmb]').forEach(b=>b.onclick=()=>{const f=A[b.dataset.gmb];if(f)f();});
  gmInput();gmSize();addEventListener('resize',gmSize);
  try{zmLoad(true);}catch(e){}misLoad(true);await gmLoad();if(!GM.on)return;
  if(!GM.d){el.querySelector('[data-gmtxt]').textContent='Ti serve una casa nel mondo per vedere la mappa del gioco';return;}
  const s=gmSup();GM.cam.x=s.x;GM.cam.y=s.y;GM.raf=requestAnimationFrame(gmLoop);}
function gmClose(){GM.on=false;cancelAnimationFrame(GM.raf);removeEventListener('resize',gmSize);const el=document.getElementById('gmap');if(el)el.remove();}
function gmSize(){const c=GM.cv;if(!c)return;const r=c.getBoundingClientRect(),dp=Math.min(2,devicePixelRatio||1);c.width=Math.max(1,r.width*dp);c.height=Math.max(1,r.height*dp);GM.dp=dp;}
function gmInput(){const c=GM.cv;let pts=new Map(),moved=0,pinch=null;
  c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);moved=0;if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:GM.cam.z};}});
  c.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const o=pts.get(e.pointerId);const n=[e.clientX,e.clientY];pts.set(e.pointerId,n);
    if(pts.size===2&&pinch){const[a,b]=[...pts.values()];GM.cam.z=Math.max(.6,Math.min(4,pinch.z*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch.d));moved=99;return;}
    const dx=n[0]-o[0],dy=n[1]-o[1];moved+=Math.abs(dx)+Math.abs(dy);if(moved>6){GM.follow=false;GM.cam.x-=dx/GM.cam.z;GM.cam.y-=dy/GM.cam.z;}});
  const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(moved<=6&&pts.size===0)gmTap(e.clientX,e.clientY);};
  c.addEventListener('pointerup',up);c.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);pinch=null;});
  c.addEventListener('wheel',e=>{e.preventDefault();GM.cam.z=Math.max(.6,Math.min(4,GM.cam.z*(e.deltaY<0?1.15:1/1.15)));},{passive:false});}
function gmScr(x,y){const r=GM.cv.getBoundingClientRect();return[r.width/2+(x-GM.cam.x)*GM.cam.z,r.height/2+(y-GM.cam.y)*GM.cam.z];}
function gmTap(cx,cy){const r=GM.cv.getBoundingClientRect();const X=cx-r.left,Y=cy-r.top;let hit=null,bd=30;
  const chk=(x,y,o)=>{const p=gmScr(x,y);const d=Math.hypot(p[0]-X,p[1]-12-Y)-(o.k==='zombie'?8:0);if(d<bd){bd=d;hit=o;}};
  (ZM.L||[]).filter(z=>!z.preso).forEach(z=>{const p=gmXY(z.lat,z.lon);chk(p[0],p[1],{k:z.k,z});});
  const s=gmSup();chk(s.x,s.y,{k:'sup',s});(typeof myHouses==='function'?myHouses():[]).forEach(h=>{const p=gmXY(h.lat,h.lon);chk(p[0],p[1],{k:'casa'});});
  if(!hit)return;try{sfx&&sfx('tap');}catch(e){}
  if(hit.k==='zombie')arnCard(hit.z);else if(hit.k==='cassa')zmVicino();else if(hit.k==='casa')casasSheet();
  else if(hit.k==='sup'){const m=hit.s.m;if(m&&m.tipo==='scontro'&&hit.s.fermo)arnVai(m.id,m.ic);else if(m&&m.tipo==='spedizione'&&hit.s.fermo)supSheet('sped');else misSheet();}}
function gmLoop(now){if(!GM.on)return;GM.t=now/1000;const s=gmSup();if(GM.follow){GM.cam.x+=(s.x-GM.cam.x)*.12;GM.cam.y+=(s.y-GM.cam.y)*.12;}
  const tx=GM.el.querySelector('[data-gmtxt]');if(tx&&tx.textContent!==s.txt)tx.textContent=s.txt;gmDraw(s);GM.raf=requestAnimationFrame(gmLoop);}
function gmDraw(s){const c=GM.cv,x=GM.ctx,dp=GM.dp||1,d=GM.d;if(!c.width||!d)return;x.setTransform(dp,0,0,dp,0,0);x.imageSmoothingEnabled=false;const W=c.width/dp,H=c.height/dp,z=GM.cam.z,T=GM.t;
  // prato a quadretti con ciuffi
  x.fillStyle='#78c850';x.fillRect(0,0,W,H);const tile=16*z;const ox=((-GM.cam.x*z+W/2)%tile+tile)%tile,oy=((-GM.cam.y*z+H/2)%tile+tile)%tile;
  x.fillStyle='#70c048';for(let i=-1;i*tile<W+tile;i++)for(let j=-1;j*tile<H+tile;j++)if((i+j+Math.floor(GM.cam.x/16)+Math.floor(GM.cam.y/16))%2===0)x.fillRect(ox+i*tile,oy+j*tile,tile,tile);
  x.fillStyle='#58a838';for(let i=-1;i*tile<W+tile;i++)for(let j=-1;j*tile<H+tile;j++){const hh=((i*7+j*13+Math.floor(GM.cam.x/16)*7+Math.floor(GM.cam.y/16)*13)%5+5)%5;if(hh===0){x.fillRect(ox+i*tile+tile*.3,oy+j*tile+tile*.5,Math.max(1,z*2),Math.max(1,z*3));x.fillRect(ox+i*tile+tile*.45,oy+j*tile+tile*.4,Math.max(1,z*2),Math.max(1,z*4));}}
  const P=(px,py)=>[W/2+(px-GM.cam.x)*z,H/2+(py-GM.cam.y)*z];
  // strade: bordo scuro e sentiero chiaro
  x.lineCap='round';x.lineJoin='round';[['#a08858',2.4],['#e8d8a8',1.6]].forEach(([col,k])=>{x.strokeStyle=col;d.roads.forEach(R=>{x.lineWidth=Math.max(2,R.w*z*k*.6);x.beginPath();R.pts.forEach((p,i)=>{const q=P(p[0],p[1]);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.stroke();});});
  // case: tetti colorati con il bordo
  d.blds.forEach((b,i)=>{x.beginPath();b.forEach((p,k)=>{const q=P(p[0],p[1]);k?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.closePath();x.fillStyle=['#d05848','#5878c8','#c89048','#9868b8'][i%4];x.fill();x.lineWidth=Math.max(1,z*1.2);x.strokeStyle='#302018';x.stroke();});
  // alberi tondi
  d.trees.forEach(t=>{const q=P(t[0],t[1]);if(q[0]<-20||q[1]<-20||q[0]>W+20||q[1]>H+20)return;const r=(5+t[2]*4)*z;x.fillStyle='#285828';x.beginPath();x.arc(q[0],q[1]+r*.3,r,0,7);x.fill();x.fillStyle='#38a038';x.beginPath();x.arc(q[0]-r*.15,q[1],r*.85,0,7);x.fill();x.fillStyle='#58c058';x.fillRect(q[0]-r*.5,q[1]-r*.4,r*.4,r*.3);});
  // percorso del superstite (tratteggiato)
  if(s.R&&!s.fermo){x.setLineDash([6,6]);x.lineDashOffset=-T*20;x.strokeStyle='#ff3df2';x.lineWidth=3;x.beginPath();(s.ar?s.R:s.R).forEach((p,i)=>{const q=P(p[0],p[1]);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.stroke();x.setLineDash([]);}
  // le tue case
  (typeof myHouses==='function'?myHouses():[]).forEach(h=>{const p=gmXY(h.lat,h.lon);const q=P(p[0],p[1]);gmEmoji(x,h.home?'🏠':'🏚️',q[0],q[1],26*Math.min(1.4,Math.max(.8,z/1.6)));if(h.home){x.font='bold 10px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText('CASA',q[0]+1,q[1]+14);x.fillStyle='#fff';x.fillText('CASA',q[0],q[1]+13);}});
  // zombie e casse
  (ZM.L||[]).filter(zz=>!zz.preso).forEach((zz,i)=>{const p=gmXY(zz.lat,zz.lon);const q=P(p[0],p[1]);if(q[0]<-30||q[1]<-30||q[0]>W+30||q[1]>H+30)return;const bob=Math.sin(T*3+i)*2;
    x.fillStyle='#00000040';x.beginPath();x.ellipse(q[0],q[1]+4,9,3,0,0,7);x.fill();gmEmoji(x,zz.k==='cassa'?'📦':(ZM_T[zz.tipo]||['🧟'])[0],q[0],q[1]-6+bob,24);
    if(zz.k!=='cassa'&&(ZM_T[zz.tipo]||[0,1])[1]>=3){x.strokeStyle='#ffd23f';x.lineWidth=2;x.beginPath();x.arc(q[0],q[1]-6+bob,15,0,7);x.stroke();}});
  // il superstite: omino in pixel che cammina
  const q=P(s.x,s.y);gmOmino(x,q[0],q[1],s.a,s.fermo?0:T,!s.fermo);
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
</script>
