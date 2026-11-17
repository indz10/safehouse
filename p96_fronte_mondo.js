<script>
/* =========================================================
   🧟 IL FRONTE SULLA MAPPA DEL MONDO (Fase 34, richiesta di Alessandro 17/11, nessun SQL)
   "Nella mappa del mondo non vedo gli zombie che vagano e le pendenze come nella vecchia Orda: aggiungi. I riquadri
    (quanti zombie, % di tenere, meteo, giorno) in basso a sinistra; i tipi di zombie nella Zombipedia."
   - Strade verso le tue case colorate per pendenza (verde piano · arancio salita · rosso discesa) e gli zombie
     dell'orda che ci camminano sopra, come nel fronte (frRoads/frPaths/frElevate/frComp/frZel di p39/p46/p63),
     disegnati sulla mappa del Mondo (window.__mf) con le sorgenti 'mo-p' (mfoMount, mfoLoop).
   - In basso a sinistra .mfochips: 🧟 n zombie (→ Zombipedia), 🛡️ % di tenere (→ la tua casa), meteo, giorno (→ Oggi).
   - Zombipedia: in fondo "🧟 Zombie dell'orda": i tipi che hai già visto arrivare (zsh_ozv) e quelli che ti mancano.
   ========================================================= */
const MFO={map:null,key:'',paths:[],zs:[],raf:0,busy:false,last:0,comp:[]};
function mfoClear(){cancelAnimationFrame(MFO.raf);MFO.raf=0;(MFO.zs||[]).forEach(z=>{try{z.mk.remove();}catch(e){}});MFO.zs=[];}
function mfoVisti(){try{return JSON.parse(localStorage.getItem('zsh_ozv')||'{}')||{};}catch(e){return{};}}
function mfoSegna(comp){const v=mfoVisti();let n=0;comp.forEach(k=>{if(!v[k]){v[k]=Date.now();n++;}});if(n)try{localStorage.setItem('zsh_ozv',JSON.stringify(v));}catch(e){}}
async function mfoMount(){if(S.tab!=='mappa'||!S.user)return;const lm=window.__mf;if(!lm||!lm.map||!document.body.contains(lm.map.getContainer()))return;
  let H=[];try{H=myHouses().filter(h=>h.lat!=null);}catch(e){}const F=H.find(h=>h.home)||H[0];if(!F)return;
  const key=F.lat.toFixed(4)+','+F.lon.toFixed(4)+'|'+H.length;
  if(MFO.map===lm.map&&MFO.key===key){if(!MFO.raf&&MFO.zs.length)mfoLoop();return;}
  if(MFO.busy)return;MFO.busy=true;
  try{mfoClear();MFO.map=lm.map;MFO.key=key;const R=F.home?(frR()||{lat:F.lat,lon:F.lon}):{lat:F.lat,lon:F.lon};
    let m=F.home&&S.zone&&S.zone.address?(RM.cache&&RM.cache[S.zone.address]):null;
    if(!m||!m.els||m.els.length<5){const got=await Promise.race([frRoads(F.lat,F.lon),new Promise(r=>setTimeout(()=>r(null),8000))]);if(got&&got.els&&got.els.length)m=got;else{MFO.key='';}}
    const dests=H.filter(h=>trM(F.lat,F.lon,h.lat,h.lon)<1500);let paths=[];
    dests.forEach(d=>{let P=frPaths(d.home?R:{lat:d.lat,lon:d.lon},m);P=P.slice(0,d===F?6:3);paths=paths.concat(P);});
    const ev=frElevate(paths);await Promise.race([ev,new Promise(r=>setTimeout(r,2500))]);
    if(MFO.map!==lm.map)return;MFO.paths=paths;mfoLines();ev.then(()=>{if(MFO.paths===paths)mfoLines();}).catch(()=>{});
    mfoSpawn();mfoLoop();mfoChips();}catch(e){MFO.key='';}finally{MFO.busy=false;}}
function mfoLines(){const map=MFO.map;if(!map)return;const fs=[];MFO.paths.forEach(P=>P.seg.forEach(s=>fs.push({type:'Feature',properties:{c:frCol(s.g)},geometry:{type:'LineString',coordinates:[[s.a[1],s.a[0]],[s.b[1],s.b[0]]]}})));
  const data={type:'FeatureCollection',features:fs};MFO.data=data;
  const go=()=>{try{if(map.getSource('mo-p'))map.getSource('mo-p').setData(data);else{map.addSource('mo-p',{type:'geojson',data});
    map.addLayer({id:'mo-pc',type:'line',source:'mo-p',paint:{'line-color':'#140f1f','line-width':8,'line-opacity':.45}});map.addLayer({id:'mo-pl',type:'line',source:'mo-p',paint:{'line-color':['get','c'],'line-width':4.5,'line-opacity':.9}});}}catch(e){}};
  let n=0;const tryGo=()=>{go();if(!map.getSource('mo-p')&&n++<30)setTimeout(tryGo,500);};tryGo();
  if(!map._mosd){map._mosd=1;map.on('styledata',()=>setTimeout(()=>{try{if(MFO.map===map&&MFO.data&&!map.getSource('mo-p'))mfoLines();}catch(e){}},400));}}
function mfoSpawn(){(MFO.zs||[]).forEach(z=>{try{z.mk.remove();}catch(e){}});MFO.zs=[];if(!MFO.map||!MFO.paths.length)return;const s=OR.s||{};const wl=s.wlevel||(W.m&&W.m.wlevel)||1;
  let comp=[];try{comp=frComp(wl);}catch(e){comp=frCompBase(wl);}MFO.comp=comp;mfoSegna(comp);
  comp.slice(0,14).forEach((k,i)=>{try{const el=frZel(k,i);el.classList.add('mfoz');const P=MFO.paths[i%MFO.paths.length];
    const mk=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([P.p[0][1],P.p[0][0]]).addTo(MFO.map);
    MFO.zs.push({k,el,mk,P,x:-(i/MFO.paths.length|0)*70-Math.random()*60,v:((ZT[k]||{}).sp||16)*1.5});}catch(e){}});}
function mfoLoop(){cancelAnimationFrame(MFO.raf);MFO.last=performance.now();const step=t=>{MFO.raf=requestAnimationFrame(step);
  if(!MFO.map||!document.body.contains(MFO.map.getContainer())){mfoClear();MFO.map=null;MFO.key='';return;}
  if(S.tab!=='mappa'||document.hidden)return;const dt=Math.min(.1,(t-MFO.last)/1000);MFO.last=t;let wf=1;try{wf=frWf(frWx());}catch(e){}
  MFO.zs.forEach(z=>{const P=z.P;let g=0;if(z.x>=0){const sg=P.seg.find(s=>z.x>=s.s&&z.x<s.s+s.d)||P.seg[P.seg.length-1];g=sg?sg.g:0;}
    const f=z.k==='scavatore'?1:Math.max(.45,Math.min(1.45,1-g*(z.k==='runner'?6:3)));z.x+=z.v*f*wf*dt;if(z.x>=P.L)z.x=-40-Math.random()*120;
    const d=Math.max(0,z.x);const sg=P.seg.find(s=>d>=s.s&&d<=s.s+s.d)||P.seg[P.seg.length-1];const u=sg?Math.min(1,(d-sg.s)/sg.d):0;
    const la=sg.a[0]+(sg.b[0]-sg.a[0])*u,lo=sg.a[1]+(sg.b[1]-sg.a[1])*u;try{z.mk.setLngLat([lo,la]);}catch(e){}z.el.style.opacity=z.x<0?0:1;});};
  MFO.raf=requestAnimationFrame(step);}
/* in basso a sinistra: zombie, % di tenere, meteo, giorno */
function mfoChips(){const w=app.querySelector('.mapfull');if(!w||S.tab!=='mappa'||typeof sbOk!=='function'||!sbOk())return;let c=w.querySelector('.mfochips');
  if(!c){w.insertAdjacentHTML('beforeend','<div class="mfochips"></div>');c=w.querySelector('.mfochips');
    c.addEventListener('click',e=>{const b=e.target.closest('[data-mfo]');if(!b)return;e.stopPropagation();const k=b.dataset.mfo;
      if(k==='z')zmPedia();else if(k==='p'){try{const h=myHouses().find(x=>x.home);if(h){window.SHEET_BACK=null;houseSheet(h);}}catch(er){}}else oggiSheet();});}
  const n=MFO.comp.length||(()=>{try{return frComp((OR.s&&OR.s.wlevel)||1).length;}catch(e){return 0;}})();
  let pc=null;try{pc=mwPct();}catch(e){}let wx=null;try{wx=frWx();}catch(e){}const d=new Date();
  const h=`<button data-mfo="z">🧟 ${n} zombie</button>${pc!=null?`<button data-mfo="p" class="${pc>=50?'ok':'ko'}">🛡️ ${pc}% di tenere · <u>perché</u></button>`:''}${wx?`<button data-mfo="g">${wx.ic} ${wx.t}°C · ${esc(wx.name||'')}</button>`:''}<button data-mfo="g" class="mfocal"><small>${GG[d.getDay()].slice(0,3)}</small><b>${d.getDate()}</b><small>${MMs[d.getMonth()]}</small></button>`;
  if(c.dataset.h!==h){c.dataset.h=h;c.innerHTML=h;}}
zEvery(()=>{try{if(document.hidden||S.tab!=='mappa'||!S.user)return;mfoMount();mfoChips();}catch(e){}},3000,'fronte-mondo');
/* 📖 Zombipedia: in fondo gli zombie dell'orda */
function mfoPediaHTML(){const v=mfoVisti();const K=Object.keys(FZ||{});if(!K.length)return'';const cnt={};(MFO.comp||[]).forEach(k=>cnt[k]=(cnt[k]||0)+1);const n=K.filter(k=>v[k]).length;
  return`<div class="mfoped"><b>🧟 Zombie dell’orda · ${n}/${K.length}</b><span class="muted">Arrivano alle 9:00 e alle 21:00 sulle strade vere verso le tue case. Quelli che non hai ancora visto sono in ombra.</span>
    <div class="zmgrid">${K.map(k=>{const s=!!v[k];return`<button class="zmcard ${s?'':'no'}" data-mfoz="${k}" type="button"><span>${s?FZ[k].ic:'❓'}</span><b>${s?esc((ZT[k]||{}).name||k):'???'}</b><small>${cnt[k]?'stasera ×'+cnt[k]:s?'già visto':'mai visto'}</small></button>`;}).join('')}</div></div>`;}
const _zmPediaMfo=zmPedia;zmPedia=async function(){const r=await _zmPediaMfo.apply(this,arguments);try{const box=document.querySelector('#lente .zmped')||document.querySelector('#sheet.open .zmlistsheet');
  if(box&&!box.querySelector('.mfoped')){const btn=box.querySelector(':scope > div:last-child button');const h=mfoPediaHTML();if(btn&&btn.closest('#lente'))btn.parentElement.insertAdjacentHTML('beforebegin',h);else box.insertAdjacentHTML('beforeend',h);
    box.querySelectorAll('[data-mfoz]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.mfoz;if(mfoVisti()[k])frZSheet(k);else toast('❓ Non l’hai ancora visto: arriva con le orde');});}}catch(e){}return r;};
</script>
