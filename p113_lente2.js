<script>
/* ===== Fase 68 — 📷 LENTE: FOTO E 🚨 EVENTI DI PERSONA =====
   - 📸 Foto (.lnfoto in alto): il fotogramma col filtro fumetto + zombie, casse, etichette ed eventi visibili + firma del gioco
     → anteprima .lnfbox con 📤 Condividi (condivisione del telefono con l'immagine e il link d'invito) e 💾 Salva.
     La foto resta sul telefono finché non la condividi tu. La prima condivisione del giorno dà il premio di shrPremio (p83).
   - 🚨 Eventi intorno a DOVE SEI, anche lontano dalle tue case: world_eventi_qui(lat, lon) (migrazione 054) entro 2 km;
     se non c'è niente ne nasce uno a 150–600 m. In alto le schede .lnevt (i 3 più vicini, distanza e direzione);
     entro 600 m anche come etichette k-evt nell'inquadratura. Tocco → pannello lnEvtCard: entro 60 m "Fallo di persona"
     (world_evento_qui, niente energia), più lontano "🎒 Manda il superstite" (evtSheet di p85). */
const LE={L:[],t:0,p:null,busy:false};
async function leLoad(force){const L=LENTE;if(!L.on||!L.pos||!S.user||typeof SB==='undefined'||!SB||LE.busy)return;
  if(!force&&LE.p&&Date.now()-LE.t<60000&&trM(LE.p.lat,LE.p.lon,L.pos.lat,L.pos.lon)<100)return;
  LE.busy=true;LE.t=Date.now();LE.p={lat:L.pos.lat,lon:L.pos.lon};
  try{const{data,error}=await SB.rpc('world_eventi_qui',{p_lat:L.pos.lat,p_lon:L.pos.lon});if(!error&&Array.isArray(data)){const prima=LE.L.map(e=>e.id).join();LE.L=data;if(data.map(e=>e.id).join()!==prima){L.tpos=null;try{lnRefresh(true);}catch(e){}}}}catch(e){}
  LE.busy=false;lePaint();}
const leM=e=>LENTE.pos?trM(LENTE.pos.lat,LENTE.pos.lon,e.lat,e.lon):(e.m||9999);
const leOk=e=>new Date(e.end_at)>Date.now()&&!evtFatto(e);
function lePaint(){const L=LENTE;if(!L.on||!L.root)return;let box=L.root.querySelector('.lnevts');
  if(!box){box=document.createElement('div');box.className='lnevts';L.root.appendChild(box);['pointerdown','pointerup','pointermove'].forEach(k=>box.addEventListener(k,e=>e.stopPropagation()));}
  const head=((L.h==null?0:L.h)+L.man+360)%360;
  const E=(LE.L||[]).filter(leOk).sort((a,b)=>leM(a)-leM(b)).slice(0,3);
  const h=E.map(e=>{const K=EVT_K[e.kind]||EVT_K.cassa;const m=Math.round(leM(e));let fr='';
    if(L.pos){const rel=((lnBearing(L.pos.lat,L.pos.lon,e.lat,e.lon)-head+540)%360)-180;fr=Math.abs(rel)<25?'⬆️':rel<0?'⬅️':'➡️';}
    return`<button type="button" class="lnevt${m<=60?' qui':''}" data-leid="${e.id}"><b>${K[0]} ${esc(K[1])}</b><small>${m<=60?'📍 Sei qui · tocca!':(m>=1000?(m/1000).toFixed(1).replace('.',',')+' km':m+' m')+' '+fr} · ⏱ ${evtLeft(e.end_at)}</small></button>`;}).join('');
  if(box.dataset.h!==h){box.dataset.h=h;box.innerHTML=h;box.querySelectorAll('[data-leid]').forEach(b=>b.onclick=()=>{const e=LE.L.find(x=>String(x.id)===b.dataset.leid);if(e)lnEvtCard(e);});}}
/* le etichette dentro l'inquadratura (come i posti e i servizi) */
const _lnTargetsLe=lnTargets;lnTargets=async function(lat,lon){const T=await _lnTargetsLe.apply(this,arguments);
  try{(LE.L||[]).filter(leOk).forEach(e=>{const d=trM(lat,lon,e.lat,e.lon);if(d>LN_MAXM)return;const K=EVT_K[e.kind]||EVT_K.cassa;T.unshift({id:'ev'+e.id,ic:K[0],t:K[1],lat:e.lat,lon:e.lon,d,k:'evt',act:()=>lnEvtCard(e)});});}catch(e){}
  return T;};
/* pannello dell'evento dentro la Lente */
function lnEvtCard(e){const L=LENTE;if(!L.root)return;let pan=L.root.querySelector('.lnpan');if(!pan){pan=document.createElement('div');pan.className='lnpan';L.root.appendChild(pan);['pointerdown','pointermove','pointerup'].forEach(k=>pan.addEventListener(k,x=>x.stopPropagation()));}
  const K=EVT_K[e.kind]||EVT_K.cassa;const m=Math.round(leM(e));const qui=m<=60+Math.min(30,L.acc||0);const fatto=evtFatto(e);const st=evtStile(e.kind);
  const az=e.kind==='salva'?'🚑 Curalo (🥫 5)':e.kind==='scorta'?'🚐 Scortali (⛽ 5)':st==='cassa'?'🎒 Prendi la tua parte':'💥 Colpisci';
  pan.innerHTML=`<div class="lnph"><div><b>${K[0]} ${esc(K[1])}</b><span>⏱ ${evtLeft(e.end_at)} · 👥 ${e.gente} · 📏 ${m} m</span></div><button class="lnpx" data-lnpx type="button" aria-label="Chiudi">✕</button></div>
   <div class="lnpb"><p style="margin:0;font-size:13.5px;font-weight:400">${K[2]}</p>
   ${e.hp_max?`<div class="evthp"><span style="width:${Math.max(2,Math.round(e.hp/e.hp_max*100))}%"></span><b>${e.hp}/${e.hp_max}</b></div>`:''}
   ${fatto?'<p class="notice" style="margin:0">✅ Hai già fatto la tua parte.</p>':qui?`<button class="btn wide" data-lepers>${az} · di persona, niente energia</button>`:`<p class="notice" style="margin:0">📍 Vai lì di persona (meno di 60 m) e lo fai <b>senza spendere energia</b>.</p><a class="btn small ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lon}&travelmode=walking">🧭 Portami lì</a>`}
   ${!fatto&&!qui?'<button class="btn small" data-lesped>🎒 O manda il superstite</button>':''}</div>`;
  pan.querySelector('[data-lnpx]').onclick=()=>pan.remove();
  const bp=pan.querySelector('[data-lepers]');if(bp)bp.onclick=async()=>{bp.disabled=true;let r=null;const p=L.pos||{};
    try{const{data,error}=await SB.rpc('world_evento_qui',{p_id:e.id,p_lat:p.lat,p_lon:p.lon,p_acc:L.acc||0});if(error)throw error;r=data;}catch(x){toast('Non riuscito: riprova');}
    if(r){toast(r.msg||(r.ok?'Fatto':'Non riuscito'));try{sfx&&sfx(r.ok?'win':'lose');}catch(x){}}
    RES.t=0;try{resLoad(true);supLoad(true);}catch(x){}EVT.t=0;await leLoad(true);const n=LE.L.find(x=>x.id===e.id);if(n&&L.root.querySelector('.lnpan'))lnEvtCard(n);else pan.remove();};
  const bs=pan.querySelector('[data-lesped]');if(bs)bs.onclick=()=>lnSheet(()=>evtSheet(e.id));}
/* ---------- 📸 FOTO ---------- */
async function lnFoto(){const L=LENTE;if(!L.on||!L.root)return;const R=L.root;const W=R.clientWidth,H=R.clientHeight;const k=Math.min(2,1440/Math.max(W,H));
  const c=document.createElement('canvas');c.width=Math.round(W*k);c.height=Math.round(H*k);const x=c.getContext('2d');x.scale(k,k);
  /* il fotogramma: dalla tela col filtro (subito dopo il disegno), altrimenti dal video */
  const cover=(src,sw,sh)=>{const a=sw/sh,b=W/H;let w=sw,h=sh,ox=0,oy=0;if(a>b){w=sh*b;ox=(sw-w)/2;}else{h=sw/b;oy=(sh-h)/2;}try{x.drawImage(src,ox,oy,w,h,0,0,W,H);}catch(e){}};
  await new Promise(res=>{if(L.G&&L.cv){L.snap=cv=>{try{x.drawImage(cv,0,0,W,H);}catch(e){}res();};setTimeout(()=>{if(L.snap){L.snap=null;res();}},400);}else{const v=L.video;if(v&&v.videoWidth)cover(v,v.videoWidth,v.videoHeight);res();}});
  const r0=R.getBoundingClientRect();
  const bolla=(el,big)=>{const b=el.getBoundingClientRect();if(b.width<2||b.bottom<0||b.top>H)return;const t=el.innerText.split('\n').filter(Boolean);
    x.save();if(big){const ic=el.querySelector('span');const s=parseFloat(getComputedStyle(ic||el).fontSize)||40;const m=new DOMMatrix(getComputedStyle(el).transform);
      x.font=`${Math.round(s*(m.a||1))}px sans-serif`;x.textAlign='center';x.textBaseline='middle';x.shadowColor='#000';x.shadowBlur=8;x.fillText(ic?ic.textContent:'🧟',b.left-r0.left+b.width/2,b.top-r0.top+b.height*.45);x.restore();return;}
    x.font='bold 13px sans-serif';const w=Math.max(...t.map(s=>x.measureText(s).width))+16,hh=8+t.length*16;const X=b.left-r0.left,Y=b.top-r0.top;
    x.fillStyle='#fff';x.strokeStyle='#1d1630';x.lineWidth=2.5;x.fillRect(X,Y,w,hh);x.strokeRect(X,Y,w,hh);x.fillStyle='#1d1630';x.textBaseline='top';t.forEach((s,i)=>{x.font=(i?'':'bold ')+'13px sans-serif';x.fillText(s,X+8,Y+5+i*16);});x.restore();};
  R.querySelectorAll('.lnlab').forEach(el=>{if(el.style.display!=='none')bolla(el,false);});
  R.querySelectorAll('.zmobj,.lnzb').forEach(el=>bolla(el,true));
  /* firma */
  x.fillStyle='#140f1fcc';x.fillRect(0,H-58,W,58);x.fillStyle='#fff';x.font='900 20px sans-serif';x.textBaseline='middle';x.textAlign='left';x.fillText('🧟 ZombieSafeHouse',14,H-38);
  x.font='13px sans-serif';x.fillStyle='#ffd86b';x.fillText('La tua città, invasa. Gioca anche tu: '+String(typeof ZSH_SITO!=='undefined'?ZSH_SITO:'safehousezombie.netlify.app').replace(/^https?:\/\//,''),14,H-16);
  c.toBlob(bl=>{if(!bl){toast('Foto non riuscita');return;}lnFotoBox(bl);},'image/jpeg',.9);
  try{sfx&&sfx('click');}catch(e){}const fl=document.createElement('div');fl.className='lnflash';R.appendChild(fl);setTimeout(()=>fl.remove(),450);}
function lnFotoBox(bl){const R=LENTE.root;if(!R)return;const u=URL.createObjectURL(bl);const nome='zombiesafehouse-'+new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')+'.jpg';
  let link='';try{link=shrLink();}catch(e){}const T='🧟 Zombie nella mia città! Vieni a difenderla con me su ZombieSafeHouse'+(link?' '+link:'');
  const b=document.createElement('div');b.className='lnfbox';['pointerdown','pointerup','pointermove'].forEach(k=>b.addEventListener(k,e=>e.stopPropagation()));
  b.innerHTML=`<img alt="La tua foto" src="${u}"><div class="lnfbtn"><button class="btn" data-lfs>📤 Condividi</button><a class="btn ghost" data-lfd download="${nome}" href="${u}">💾 Salva</a><button class="btn ghost" data-lfx>✕</button></div><small>La foto resta sul telefono finché non la condividi tu.</small>`;
  R.appendChild(b);const chiudi=()=>{b.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);};b.querySelector('[data-lfx]').onclick=chiudi;
  b.querySelector('[data-lfs]').onclick=async()=>{const f=new File([bl],nome,{type:'image/jpeg'});
    try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:T,title:'ZombieSafeHouse'});try{shrPremio('lente');}catch(e){}return;}}catch(e){if(e&&e.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(T);}catch(e){}b.querySelector('[data-lfd]').click();toast('💾 Foto salvata e testo copiato: pubblicala dal social che vuoi');try{shrPremio('lente');}catch(e){}};}
/* aggancio alla Lente: tasto 📸, scatto dentro il fotogramma, eventi ogni 5 s */
const _lnFrameFo=lnFrame;lnFrame=function(){_lnFrameFo.apply(this,arguments);const L=LENTE;if(L.snap&&L.cv&&L.G){const f=L.snap;L.snap=null;f(L.cv);}};
const _lenteOpenFo=lenteOpen;lenteOpen=async function(){const r=await _lenteOpenFo.apply(this,arguments);const L=LENTE;
  if(L.root&&!L.root.querySelector('.lnfoto')){const t=L.root.querySelector('.lntop');if(t){t.insertAdjacentHTML('beforeend','<button class="lnfoto" type="button" aria-label="Fai una foto">📸</button>');const b=t.querySelector('.lnfoto');['pointerdown','pointerup'].forEach(k=>b.addEventListener(k,e=>e.stopPropagation()));b.onclick=e=>{e.stopPropagation();lnFoto();};}}
  LE.p=null;LE.L=[];setTimeout(()=>leLoad(true),800);return r;};
zEvery(()=>{try{if(typeof LENTE!=='undefined'&&LENTE.on){leLoad();lePaint();}}catch(e){}},5000,'lente-eventi');
</script>
