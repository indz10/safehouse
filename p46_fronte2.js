<script>
/* =========================================================
   IL FRONTE SU TUTTE LE TUE CASE
   - fila delle tue case sopra la mappa, ognuna con la sua % (conto del server)
   - toccandone una il fronte va lì (anche lontanissima): strade vere della zona,
     salite vere (quote dei punti del percorso), orda che arriva
   - gli zombie attaccano tutte le tue case entro 1,5 km dalla casa inquadrata
   ========================================================= */
FR.focus=null;FR.roads={};FR.dests=[];FR.homes=[];
async function frRoads(lat,lon){const k=lat.toFixed(3)+','+lon.toFixed(3);if(FR.roads[k])return FR.roads[k];
  let els=[];try{els=await trOverpass(`[out:json][timeout:20];way(around:1000,${lat},${lon})["highway"];out geom 600;`,9000,2)||[];}catch(e){}const r={els};if(els.length)FR.roads[k]=r;return r;}
async function frElevate(paths){try{const P=[];const key=p=>p[0].toFixed(5)+','+p[1].toFixed(5);const seen=new Map();
    paths.forEach(pa=>pa.seg.forEach(s=>[s.a,s.b].forEach(p=>{const k=key(p);if(!seen.has(k)){seen.set(k,null);P.push(p);}})));if(!P.length)return;
    const step=Math.max(1,Math.ceil(P.length/100));const S2=P.filter((_,i)=>i%step===0).slice(0,100);
    const d=await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${S2.map(p=>p[0].toFixed(5)).join(',')}&longitude=${S2.map(p=>p[1].toFixed(5)).join(',')}`,{signal:trSig(9000)}).then(r=>r.json());
    if(!d||!d.elevation)return;S2.forEach((p,i)=>seen.set(key(p),d.elevation[i]));
    const el=p=>{const v=seen.get(key(p));if(v!=null)return v;let best=null,bd=1e9;S2.forEach(q=>{const dd=Math.abs(q[0]-p[0])+Math.abs(q[1]-p[1]);if(dd<bd){bd=dd;best=seen.get(key(q));}});return best;};
    paths.forEach(pa=>{pa.seg.forEach(s=>{const a=el(s.a),b=el(s.b);if(a!=null&&b!=null)s.g=(b-a)/s.d;});pa.climb=pa.seg.reduce((t,x)=>t+Math.max(0,x.g*x.d),0);pa.drop=pa.seg.reduce((t,x)=>t+Math.max(0,-x.g*x.d),0);});}catch(e){}}
function frDrawLines(){try{const map=FR.lm.map;const fs=[];FR.paths.forEach(P=>P.seg.forEach(s=>fs.push({type:'Feature',properties:{c:frCol(s.g)},geometry:{type:'LineString',coordinates:[[s.a[1],s.a[0]],[s.b[1],s.b[0]]]}})));
  const data={type:'FeatureCollection',features:fs};const go=()=>{try{if(map.getSource('fr-p'))map.getSource('fr-p').setData(data);else{map.addSource('fr-p',{type:'geojson',data});
    map.addLayer({id:'fr-pc',type:'line',source:'fr-p',paint:{'line-color':'#140f1f','line-width':9,'line-opacity':.55}});map.addLayer({id:'fr-pl',type:'line',source:'fr-p',paint:{'line-color':['get','c'],'line-width':5,'line-opacity':.95}});}}catch(e){}};
  /* disegno finché compare: anche se la mappa sta ancora caricando, e di nuovo dopo ogni cambio giorno/notte o 3D */
  FR.lmData=data;let n=0;const tryGo=()=>{go();if(!map.getSource('fr-p')&&n++<40)setTimeout(tryGo,500);};tryGo();
  if(!map._frsd){map._frsd=1;map.on('styledata',()=>{setTimeout(()=>{try{if(FR.lm&&FR.lm.map===map&&FR.lmData&&!map.getSource('fr-p'))frDrawLines();}catch(e){}},400);});}}catch(e){}}
function frChanceOfBase(h){try{const dh=defHouse(h.bid,h.home);return dh?defChance(dh.total):null;}catch(e){return null;}}
function frSel(H,F){const n=FR.node;if(!n)return;let s=n.querySelector('.frsel');if(!s){n.querySelector('.frmapw').insertAdjacentHTML('beforebegin','<div class="frsel"></div>');s=n.querySelector('.frsel');}
  s.innerHTML=H.map((h,i)=>{const c=frChanceOf(h);const on=(h.home&&F.home)||(!h.home&&!F.home&&h.bid===F.bid);return`<button data-frh="${i}" class="${on?'on':''}"><b>${h.ic} ${esc(h.label)}</b><small>${c!=null?c+'%':'…'}${h.km>1.5?' · '+kmTxt(h.km):''}</small></button>`;}).join('');
  s.querySelectorAll('[data-frh]').forEach(b=>b.onclick=()=>{const h=H[+b.dataset.frh];FR.focus={bid:h.bid,home:h.home};FR.key='';frMount();});}
frMount=async function(){const R=frR();if(!R||!FR.node)return;const H=myHouses();if(!H.length)return;
  const home=H.find(h=>h.home)||H[0];const F=(FR.focus&&H.find(h=>h.home===FR.focus.home&&(h.home||h.bid===FR.focus.bid)))||home;
  const key=F.lat.toFixed(4)+','+F.lon.toFixed(4)+'|'+H.length;frSel(H,F);frHeader();
  if(FR.lm&&FR.key===key){try{FR.lm.map.resize();}catch(e){}frLoop();frRings();return;}
  if(FR.busy)return;FR.busy=true;frStop();try{
  if(!FR.lm){try{const nx=oggiNext();let addr=S.zone&&S.zone.address;if(!addr){addr='__casa';RM.cache=RM.cache||{};if(!RM.cache[addr])RM.cache[addr]={lat:R.lat,lon:R.lon,els:[1]};}FR.lm=await liveMap(FR.node.querySelector('.frmap'),addr,{zoom:15.4,night:zIsNight(R.lat,R.lon)});}catch(e){FR.node.querySelector('.frmap').innerHTML='<p class="muted" style="padding:20px">Mappa non disponibile ora.</p>';return;}}
  try{FR.lm.map.jumpTo({center:[F.lon,F.lat],zoom:F.home?15.4:15.6});}catch(e){}
  (FR.homes||[]).forEach(m=>{try{m.remove();}catch(e){}});FR.homes=[];FR.homeEls=[];(FR.zs||[]).forEach(z=>{try{z.mk.remove();}catch(e){}});FR.zs=[];
  const dests=H.filter(h=>trM(F.lat,F.lon,h.lat,h.lon)<1500);if(!dests.includes(F))dests.unshift(F);dests.sort((a,b)=>(a===F?-1:b===F?1:0));FR.dests=dests;
  let m=F.home&&S.zone&&S.zone.address?(RM.cache&&RM.cache[S.zone.address]):null;
  if(!m||!m.els||!m.els.length){const got=await Promise.race([frRoads(F.lat,F.lon),new Promise(r=>setTimeout(()=>r(null),6000))]);
    if(got&&got.els&&got.els.length)m=got;else{const kk=key;frRoads(F.lat,F.lon).then(x=>{if(x&&x.els&&x.els.length&&FR.key===kk){FR.key=null;frMount();}}).catch(()=>{});}}
  let paths=[];dests.forEach((d,i)=>{let P=frPaths(d.home?R:{lat:d.lat,lon:d.lon},m);P=P.slice(0,d===F?6:3);P.forEach(p=>{p.dest=i;});paths=paths.concat(P);});
  const evp=frElevate(paths); /* stesso metodo per tutte le case: quote vere punto per punto */
  await Promise.race([evp,new Promise(r=>setTimeout(r,2000))]);
  FR.paths=paths;frDrawLines();evp.then(()=>{try{if(FR.paths===paths)frDrawLines();}catch(e){}});
  dests.forEach((d,i)=>{try{const el=document.createElement('div');el.className='frhome';el.innerHTML=`<div class="frhfx"></div><div class="frring"></div><b>${d.home?'🏠':'🔑'}</b><span data-frpct2="${i}"></span><i class="frhwx"></i>`;
    el.addEventListener('click',e=>{e.stopPropagation();houseSheet(d);});FR.homeEls=FR.homeEls||[];FR.homeEls[i]=el;FR.homes.push(new maplibregl.Marker({element:el}).setLngLat([d.lon,d.lat]).addTo(FR.lm.map));FR.paths.filter(p=>p.dest===i).forEach(p=>p.homeEl=el);}catch(e){}});
  frSpawn();frLoop();frHeader();frRings();FR.key=key;FR.err=null;frErrShow();
  }catch(e){FR.err=(e&&e.message)||String(e);FR.key=null;frErrShow();console.warn('fronte',e);}finally{FR.busy=false;}};
/* avviso sul fronte se qualcosa si blocca (con "Riprova") */
function frErrShow(){try{const w=FR.node&&FR.node.querySelector('.frmapw');if(!w)return;let c=w.querySelector('.frerr');
  if(!FR.err){if(c)c.remove();return;}if(!c){c=document.createElement('button');c.className='frerr';w.appendChild(c);c.onclick=()=>{FR.err=null;FR.key=null;c.remove();frMount();};}
  c.textContent='⚠️ Fronte: '+String(FR.err).slice(0,80)+' · Riprova';}catch(e){}}
function frRings(){try{(FR.dests||[]).forEach((d,i)=>{const c=frChanceOf(d);try{const he=(FR.homeEls||[])[i];const T=typeof thrOf==='function'?thrOf(d):null;if(he&&T){const ev=T.ev||'calma';const fx=he.querySelector('.frhfx');if(fx)fx.className='frhfx hx-'+ev;const wi=he.querySelector('.frhwx');if(wi)wi.textContent=ev==='calma'?'':(EVN[ev]||['',''])[0];}}catch(e){}const he=(FR.homeEls||[])[i];const el=he&&he.querySelector('[data-frpct2]');if(el)el.textContent=c!=null?c+'%':'';const ring=el&&el.parentNode.querySelector('.frring');if(ring&&c!=null)ring.style.setProperty('--ok',c>=50?'#5bd16a':'#d7263d');});
  const F=FR.dests&&FR.dests[0];if(F&&!F.home){const c=frChanceOf(F);const chip=[...FR.node.querySelectorAll('[data-frchips] span')].find(s=>/di tenere/.test(s.textContent));if(chip&&c!=null){chip.innerHTML=`🛡️ ${c}% di tenere (${esc(F.label)}) · <u>perché</u>`;chip.onclick=()=>whySheet(F.bid,false);}}
  const s=FR.node&&FR.node.querySelector('.frsel');if(s){const H=myHouses();s.querySelectorAll('[data-frh]').forEach(b=>{const h=H[+b.dataset.frh];const c=h&&frChanceOf(h);const sm=b.querySelector('small');if(sm&&c!=null)sm.textContent=c+'%'+(h.km>1.5?' · '+kmTxt(h.km):'');});}
  const pc=FR.node&&FR.node.querySelector('[data-frpct]');if(pc)pc.textContent='';}catch(e){}}
/* il percorso finisce alla casa di destinazione: nebbia e colpi riferiti a quella casa */
frLoop=function(){frStop();FR.last=performance.now();const step=t=>{FR.raf=requestAnimationFrame(step);if(S.tab!=='orda'||document.hidden||!FR.node||!FR.node.isConnected)return;
  const dt=Math.min(.1,(t-FR.last)/1000);FR.last=t;const w=FR.wx;const wf=frWf(w);
  const st=FR.zs.filter(z=>z.k==='strillone'&&z.x>0).map(z=>z.pos).filter(Boolean);
  FR.zs.forEach(z=>{const P=z.P;let g=0;if(z.x>=0){const sg=P.seg.find(s=>z.x>=s.s&&z.x<s.s+s.d)||P.seg[P.seg.length-1];g=sg?sg.g:0;}
    let f=z.k==='scavatore'?1:Math.max(.45,Math.min(1.45,1-g*(z.k==='runner'?6:3)));if(z.pos&&st.some(p=>trM(p[0],p[1],z.pos[0],z.pos[1])<45)&&z.k!=='strillone')f*=1.15;
    z.x+=z.v*f*wf*dt;
    if(z.x>=P.L){z.x=-40-Math.random()*120;try{const h=P.homeEl;if(h){h.classList.remove('hit');void h.offsetWidth;h.classList.add('hit');}}catch(e){}}
    const d=Math.max(0,z.x);const sg=P.seg.find(s=>d>=s.s&&d<=s.s+s.d)||P.seg[P.seg.length-1];const u=sg?Math.min(1,(d-sg.s)/sg.d):0;
    const la=sg.a[0]+(sg.b[0]-sg.a[0])*u,lo=sg.a[1]+(sg.b[1]-sg.a[1])*u;z.pos=[la,lo];try{z.mk.setLngLat([lo,la]);}catch(e){}
    const toH=Math.max(0,P.L-z.x);let op=z.x<0?0:1;if(w&&w.ev==='nebbia')op=toH<150?1:.18;z.el.style.opacity=op;z.el.classList.toggle('glow',!!(w&&w.ev==='blackout'&&toH>120));});};
  FR.raf=requestAnimationFrame(step);};
/* quando arriva il conto del server, aggiorno le % */
</script>
