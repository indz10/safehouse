<script>
/* =========================================================
   🗺️ IL FRONTE + SCHEDA ORDA UNICA
   - mappa vera di casa tua con l'orda che arriva sulle strade vere
   - zombie di 8 tipi con caratteristiche diverse (velocità, resistenza, speciale)
   - salite (arancio, più lenti) e discese (rosso, più veloci) dalla griglia delle quote vere
   - meteo vero dell'ora dell'orda: pioggia, nebbia, blackout, luna piena
   - una sola scheda: fronte · orda · gioca la notte · premi · missioni · 3 fisarmoniche
   ========================================================= */
const FZ={ /* tipi: icona, variante disegno, scala, testi */
 walker:{ic:'🧟',v:0,sc:1,  sp:'Lento e testardo: arriva sempre.'},
 runner:{ic:'🏃',v:2,sc:.9, sp:'Velocissimo ma fragile. Le salite lo frenano il doppio.'},
 casco:{ic:'🪖',v:1,sc:1.05,sp:'Il casco dimezza i colpi: serve la barricata.'},
 strillone:{ic:'📢',v:3,sc:1,sp:'Urla: gli zombie vicini accelerano del 15%.'},
 scavatore:{ic:'⛏️',v:4,sc:1, sp:'Scava sotto terra: salite e discese non lo cambiano.'},
 brute:{ic:'💪',v:1,sc:1.35,sp:'Lento ma fortissimo: sfonda le porte.'},
 oro:{ic:'💰',v:0,sc:.85,  sp:'Scappa veloce. Toccalo sulla mappa: 5 Mattoni (una volta per orda).'},
 boss:{ic:'👑',v:3,sc:1.7, sp:'Il Bruto della Sagra: arriva con le orde grandi (livello mondo 8+).'}};
window.FR={node:null,lm:null,paths:[],zs:[],raf:0,t0:0,last:0,key:'',wx:null,gold:false};
/* composizione dell'orda in base al livello del mondo */
function frCompBase(wl){const n=Math.min(28,8+2*wl);const L=[];const add=(k,c)=>{for(let i=0;i<c;i++)L.push(k);};
  add('runner',wl>=2?Math.round(n*.15):0);add('casco',wl>=3?Math.round(n*.12):0);add('strillone',Math.max(1,Math.round(n*.08)));add('scavatore',wl>=4?Math.round(n*.08):0);
  add('brute',wl>=5?Math.max(1,Math.round(n*.06)):0);add('boss',wl>=8?1:0);add('oro',1);while(L.length<n)L.push('walker');return L;}
/* strade vere → percorsi verso casa (Dijkstra sul grafo delle strade OSM) */
function frPaths(R,m){const els=((m&&m.els)||[]).filter(e=>e.tags&&e.tags.highway&&e.geometry&&e.geometry.length>1&&!/footway|steps|path|cycleway|service/.test(e.tags.highway));
  const K=p=>p.lat.toFixed(5)+','+p.lon.toFixed(5);const N={},adj={};const node=p=>{const k=K(p);if(!N[k]){N[k]=[p.lat,p.lon];adj[k]=[];}return k;};
  els.forEach(e=>{for(let i=1;i<e.geometry.length;i++){const a=node(e.geometry[i-1]),b=node(e.geometry[i]);const d=trM(N[a][0],N[a][1],N[b][0],N[b][1]);adj[a].push([b,d]);adj[b].push([a,d]);}});
  const keys=Object.keys(N);let out=[];
  if(keys.length>10){let h=null,hd=1e9;keys.forEach(k=>{const d=trM(R.lat,R.lon,N[k][0],N[k][1]);if(d<hd){hd=d;h=k;}});
    const dist={},prev={},done=new Set();dist[h]=0;const Q=[h];
    while(Q.length){let bi=0;for(let i=1;i<Q.length;i++)if(dist[Q[i]]<dist[Q[bi]])bi=i;const u=Q.splice(bi,1)[0];if(done.has(u))continue;done.add(u);if(dist[u]>1100)continue;
      adj[u].forEach(([v,w])=>{const nd=dist[u]+w;if(dist[v]==null||nd<dist[v]){dist[v]=nd;prev[v]=u;Q.push(v);}});}
    const sect={};Object.keys(dist).forEach(k=>{const d=dist[k];if(d<350||d>950)return;const b=Math.atan2(N[k][0]-R.lat,(N[k][1]-R.lon)*Math.cos(R.lat*Math.PI/180));const s=Math.floor(((b+Math.PI)/(2*Math.PI))*6)%6;
      if(!sect[s]||Math.abs(d-650)<Math.abs(dist[sect[s]]-650))sect[s]=k;});
    out=Object.values(sect).map(k=>{const p=[];let c=k;while(c){p.push(N[c]);c=prev[c];}p.push([R.lat,R.lon]);return p;}).filter(p=>p.length>2);}
  if(out.length<3){out=[0,1,2,3,4].map(i=>{const a=i*1.256+.4,p=[];for(let j=0;j<=12;j++){const r=600*(1-j/12),w=Math.sin(j*.9+i)*25;const o=trOff(R.lat,R.lon,Math.cos(a)*r+Math.sin(a)*w,Math.sin(a)*r-Math.cos(a)*w);p.push(o);}return p;});}
  /* pendenza vera di ogni tratto (verso casa: positiva = salita) */
  return out.map(p=>{const seg=[];let L=0;for(let i=1;i<p.length;i++){const d=Math.max(1,trM(p[i-1][0],p[i-1][1],p[i][0],p[i][1]));let g=0;
      try{if(R.grid){g=(trElevLL(R,p[i][0],p[i][1])-trElevLL(R,p[i-1][0],p[i-1][1]))/d;}}catch(e){}seg.push({a:p[i-1],b:p[i],d,g,s:L});L+=d;}
    const climb=seg.reduce((s,x)=>s+Math.max(0,x.g*x.d),0),drop=seg.reduce((s,x)=>s+Math.max(0,-x.g*x.d),0);return{p,seg,L,climb,drop};});}
const frCol=g=>g>.025?'#ff9f1c':g<-.025?'#d7263d':'#5bd16a';
/* meteo all'ora dell'orda */
function frWxBase(){try{return oggiAt(OGGI.d,oggiNext());}catch(e){return null;}}
function frWf(w){return !w?1:w.ev==='pioggia'?.8:w.ev==='luna'?1.2:w.ev==='blackout'?.9:1;}
/* lo zombie disegnato (stile fumetto) */
function frZel(k,i){const t=FZ[k];const el=document.createElement('div');el.className='frz frz-'+k;el.style.setProperty('--sc',t.sc);el.style.setProperty('--bd',(i%7)*.07+'s');
  el.innerHTML=`<div class="frzb">${zArt(t.v+(k==='oro'?0:i),{lean:3})}</div>${k!=='walker'?`<i class="frzi">${t.ic}</i>`:''}`;
  el.addEventListener('click',e=>{e.stopPropagation();frZSheet(k);});return el;}
function frZSheetBase(k){const z=ZT[k]||{},t=FZ[k];const wx=FR.wx;const bar=(v,m)=>`<span class="frbar"><i style="width:${Math.min(100,v/m*100)}%"></i></span>`;
  if(k==='oro'&&!FR.gold){const sid=(OR.s&&OR.s.next_at)||'x';const kk='zsh_gold_'+sid;let got=false;try{got=!!localStorage.getItem(kk);}catch(e){}
    if(!got){try{localStorage.setItem(kk,'1');}catch(e){}giveMattoni(5,'Zombie d’oro');try{sfx('coin');}catch(e){}toast('💰 Preso lo zombie d’oro!');FR.gold=true;}}
  openSheet(`${t.ic} ${z.name||k}`,`<div class="frzs"><div class="frzart">${zArt(t.v,{lean:0})}</div><div><p style="font-weight:400;margin:0 0 8px">${t.sp}</p>
    <div class="frst"><span>Velocità</span>${bar(z.sp||10,48)}</div><div class="frst"><span>Resistenza</span>${bar(z.hp||4,70)}</div><div class="frst"><span>Danno</span>${bar(z.dps||5,22)}</div></div></div>
    <h4 class="hh">Sul terreno vero</h4><p style="font-weight:400;font-size:13px">${k==='scavatore'?'Le pendenze non lo cambiano.':k==='runner'?'In salita rallenta il doppio degli altri, in discesa vola.':'In salita (strade arancioni) rallenta, in discesa (strade rosse) accelera.'}${wx?` Con il meteo dell’orda: ${esc(wx.eff)}`:''}</p>`);}
/* il riquadro del fronte (creato una volta e riusato) */
function frNode(){if(FR.node)return FR.node;const d=document.createElement('div');d.className='panel fronte';
  d.innerHTML=`<div class="frtop"><div><b class="disp">🗺️ Il fronte</b><small data-frnext>…</small></div><div class="frclock"><b data-clock>--:--</b><small data-frday></small></div></div>
   <div class="frmapw"><div class="frmap"></div><div class="frfx"></div><div class="frwx"></div><button class="frcal" data-frcal aria-label="Calendario e meteo"><span class="ocd mini"><small data-frmon></small><b data-frdd></b></span></button></div>
   <div class="frinfo"><div class="frchips" data-frchips></div><div class="frleg" data-frleg></div>
   <p class="muted" style="font-size:11.5px;margin:6px 0 0">Strade: <b style="color:#2f9e44">verde</b> piano · <b style="color:#e8590c">arancio</b> salita verso casa (zombie più lenti) · <b style="color:#d7263d">rosso</b> discesa (più veloci). Tocca uno zombie per vederlo. L’esito dell’orda del mondo lo decide il server con livello, preparazione e aiuti; meteo e salite cambiano la marcia qui e nelle notti che giochi.</p></div>`;
  d.querySelector('[data-frcal]').onclick=e=>{e.stopPropagation();oggiSheet();};FR.node=d;return d;}
function frHeaderBase(){try{const d=FR.node;const nx=oggiNext();const n=new Date();FR.wx=frWx();const w=FR.wx;const s=OR.s||{};
  d.querySelector('[data-frnext]').innerHTML=`Orda delle <b>${String(nx.getHours()).padStart(2,'0')}:00</b> · tra ${orLeft(nx)}`;d.querySelector('[data-frday]').textContent=`${GG[n.getDay()].slice(0,3)} ${n.getDate()} ${MM[n.getMonth()].slice(0,3)}`;const mo=d.querySelector('[data-frmon]'),dd=d.querySelector('[data-frdd]');if(mo)mo.textContent=MMs[n.getMonth()];if(dd)dd.textContent=n.getDate();
  const fx=d.querySelector('.frfx'),wb=d.querySelector('.frwx');fx.className='frfx'+(w?' fx-'+w.ev:'');d.querySelector('.frmapw').classList.toggle('dark',!!(w&&w.ev==='blackout'));
  wb.innerHTML=w?`${w.ic} ${w.t}°C · ${esc(w.eff.split(':')[0].replace(/^[^\s]+\s/,''))}`:'meteo…';
  const wl=s.wlevel||(W.m&&W.m.wlevel)||1;const comp=frComp(wl);const cnt={};comp.forEach(k=>cnt[k]=(cnt[k]||0)+1);
  const P=FR.paths||[];const up=P.filter(p=>p.climb-p.drop>4).length,dn=P.filter(p=>p.drop-p.climb>4).length;
  const pw=45+12+(s.next_bonus!=null?s.next_bonus:(s.prepared?15:0))+5;const atk=30+4*Math.min(wl,30)+30;const ch=Math.max(3,Math.min(97,Math.round((pw-(30+4*Math.min(wl,30))+1)/60*100)));
  d.querySelector('[data-frchips]').innerHTML=[`<span>🧟 ${comp.length} zombie</span>`,`<span>🛡️ ${ch}% di tenere</span>`,w?`<span>${w.ic} ${esc(w.name)}</span>`:'',P.length?`<span>⬆ ${up} vie in salita · ⬇ ${dn} in discesa</span>`:'',s.prepared?'<span class="ok">✓ case preparate</span>':'<span class="ko">⚠ case non preparate</span>'].join('');
  d.querySelector('[data-frleg]').innerHTML=Object.keys(FZ).filter(k=>cnt[k]).map(k=>`<button data-frz="${k}"><b>${FZ[k].ic}</b>${esc((ZT[k]||{}).name||k)}<small>×${cnt[k]}</small></button>`).join('');
  d.querySelectorAll('[data-frz]').forEach(b=>b.onclick=()=>frZSheet(b.dataset.frz));
  const pc=d.querySelector('[data-frpct]');if(pc)pc.textContent=ch+'%';const ring=d.querySelector('.frring');if(ring)ring.style.setProperty('--ok',ch>=50?'#5bd16a':'#d7263d');}catch(e){}}
function frSpawn(){(FR.zs||[]).forEach(z=>{try{z.mk.remove();}catch(e){}});FR.zs=[];if(!FR.lm||!FR.paths.length)return;const s=OR.s||{};const wl=s.wlevel||(W.m&&W.m.wlevel)||1;
  frComp(wl).forEach((k,i)=>{const el=frZel(k,i);const P=FR.paths[i%FR.paths.length];const mk=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([P.p[0][1],P.p[0][0]]).addTo(FR.lm.map);
    FR.zs.push({k,el,mk,P,x:-(i/FR.paths.length|0)*70-Math.random()*60,v:((ZT[k]||{}).sp||16)*1.5*(k==='oro'?.9:1)});});}
function frStop(){cancelAnimationFrame(FR.raf);FR.raf=0;}
/* posizione della casa: dalla valutazione sul telefono, altrimenti dal server (telefono nuovo, cambio account…) */
function frR(){try{if(S.zone&&S.zone.real&&S.zone.real.lat!=null)return S.zone.real;const H=typeof myHouses==='function'?myHouses():[];const h=H.find(x=>x.home)||H[0];return h&&h.lat!=null?{lat:h.lat,lon:h.lon}:null;}catch(e){return null;}}
/* ---------- SCHEDA ORDA UNICA ---------- */
window.ORDA_ONE=true;
/* i pulsanti che portano a un riquadro dentro una fisarmonica: la apro */
(function(){const o=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(a){try{let d=this.closest&&this.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details');}}catch(e){}return o.call(this,a);};})();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.tab==='orda'&&FR.lm)frLoop();});
setInterval(()=>{if(S.tab==='orda'&&FR.node&&FR.node.isConnected)frHeader();},30000);
</script>
<script>
/* menu: "Difendi tu" porta al riquadro "Gioca la notte"; "Oggi" in cima al fronte */
try{const _zmDoFr=zmDo;zmDo=function(k,b){if(k==='g:difendi'||k==='g:oggi'||k==='g:impero'){zmClose();go('orda');setTimeout(()=>{const t=k==='g:difendi'?app.querySelector('.odplay'):app.querySelector('.fronte');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},400);return;}return _zmDoFr(k,b);};}catch(e){}
try{const _zmItemsFr=zmItems;zmItems=function(){const L=_zmItemsFr();const g=L.find(x=>x[0]==='Gioco');if(g)g[1]=g[1].map(r=>r[2]==='g:difendi'?['⚔️','Gioca la notte','g:difendi']:r);return L;};}catch(e){}
</script>
