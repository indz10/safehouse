<script>
/* =========================================================
   MONDO UNICO (fase 2)
   - un solo mondo reale per tutti gli utenti registrati
   - la tua casa è tua; compri le case libere (di chi non è iscritto)
     con i 🧱 Mattoni, che stanno solo sul server
   - se l'abitante vero di una tua casa si iscrive, la casa passa a lui
     e tu ricevi tutto indietro (acquisto + potenziamenti) + bonus
   - il gioco (notti, premi, missioni, sponsor) resta com'è: le case
     del mondo comprate nel tuo quartiere diventano tuoi edifici
   ========================================================= */
window.W={on:false,m:null,busy:false};
window.HQW={blocked:new Set(),st:new Map(),t:0,key:''};
const wNum=n=>Number(n||0).toLocaleString('it-IT');
async function wRpc(fn,args){if(typeof SB==='undefined'||!SB||!S.user)throw new Error('Accedi per entrare nel mondo unico');const{data,error}=await SB.rpc(fn,args||{});if(error)throw error;return data;}
async function wMine(silent){if(typeof SB==='undefined'||!SB||!S.user||W.busy)return;W.busy=true;
  try{let d;try{d=await wRpc('world_mine2');}catch(x){d=await wRpc('world_mine');}if(!d)return;W.on=true;W.m=d;
    const news=(d.news||[]).filter(n=>n.delta>0);if(news.length&&!silent){const tot=news.reduce((a,n)=>a+n.delta,0);const big=news.find(n=>/abitante|esclus|inattiv|Bonus/.test(n.reason));
      setTimeout(()=>toast(big?`🏠 ${big.reason}: +🧱 ${wNum(big.delta)}`:`🧱 +${wNum(tot)} Mattoni`),1200);}
    if((d.news||[]).length)wRpc('world_seen').catch(()=>{});
    wRefresh();}catch(e){W.err=e.message;}finally{W.busy=false;}}
async function wEarn(r){try{const d=await wRpc('world_earn',{p_reason:r});if(d&&d.got>0){if(W.m)W.m.mattoni=d.mattoni;toast(`🧱 +${d.got} Mattoni`);wRefresh();}}catch(e){}}
function wRefresh(){try{const p=app.querySelector('.wpan');if(p){const n=document.createElement('div');n.innerHTML=wPanelHTML();const np=n.firstElementChild;np.dataset.grp=p.dataset.grp||'q';p.replaceWith(np);wBind();}}catch(e){}
  const h=document.querySelector('#wHome');if(h)h.innerHTML=wHomeLine();}
/* ---- la tua casa nel mondo: conferma in 2 giorni (contro i furbi) ---- */
async function wClaim(force){const H0=S.zone&&S.zone.real&&S.zone.real.house;const H=(H0&&H0.bid)?H0:(window.__homeG?{bid:__homeG.bid,clat:__homeG.lat,clon:__homeG.lon}:null);if(!H||!H.bid||!S.user)return;
  try{const r=await wRpc('world_claim_home',{p_bid:H.bid,p_lat:H.clat||S.zone.real.lat,p_lon:H.clon||S.zone.real.lon});W.claim=r;
    if(r&&r.status==='home'&&W.m&&(!W.m.home||W.m.home.status!=='home'))toast('🏠 '+r.msg);else if(force&&r&&r.msg)toast('🏠 '+r.msg);wMine(true);}catch(e){}}
function wHomeLine(){const h=W.m&&W.m.home;if(!S.user)return'Accedi per avere la tua casa nel mondo unico.';if(!h)return'Valuta la casa: diventa tua nel mondo unico.';
  return h.status==='home'?'❤️ <b>Casa tua nel mondo unico</b>: nessuno può comprarla.':'⏳ <b>Casa tua in conferma</b>: riapri l’app domani per confermarla (serve contro chi fa il furbo).';}
/* ---- pannello nel gioco ---- */
function wPanelHTML(){if(!S.user)return`<div class="panel wpan"><b class="disp" style="font-size:22px">🌍 Il mondo unico</b><p style="font-weight:400;font-size:14px;margin:6px 0">Un solo mondo vero per tutti: la tua casa è tua, e puoi comprare le case libere della tua zona e poi sempre più lontano.</p><button class="btn small" onclick="loginSheet()">Accedi per entrare</button></div>`;
  const m=W.m;if(!m)return`<div class="panel wpan"><b class="disp" style="font-size:22px">🌍 Il mondo unico</b><p class="muted"><span class="spin"></span> Collegamento al mondo…</p>${W.err?`<p class="notice">Il mondo unico non risponde: ${esc(W.err)}. Serve il blocco SQL “mondo_unico” su Supabase.</p>`:''}</div>`;
  const prev=100*Math.pow(m.wlevel-1,2),pct=Math.max(3,Math.min(100,Math.round((m.lifetime-prev)/Math.max(1,m.next-prev)*100)));
  return`<div class="panel wpan"><div class="row spread"><b class="disp" style="font-size:22px">🌍 Il mondo unico</b><span class="wbal">🧱 ${wNum(m.mattoni)}</span></div>
   <p style="font-weight:400;font-size:13.5px;margin:4px 0 8px" id="wHome">${wHomeLine()}</p>
   <div class="wlv"><b>Livello mondo ${m.wlevel}</b><div class="vbar"><span style="width:${pct}%"></span></div><small>${wNum(m.lifetime)} / ${wNum(m.next)} Mattoni guadagnati in tutto</small></div>
   <div class="wgrid"><div><b>${m.houses.length}/${m.max}</b><small>case comprate</small></div><div><b>${m.radius_km>=20000?'🌍 mondo':wNum(m.radius_km)+' km'}</b><small>raggio d’acquisto</small></div><div><b>🧱 ${m.rate}/giorno</b><small>affitti</small></div></div>
   <button class="btn wide ${m.ready>0?'':'ghost'}" data-wcol ${m.ready>0?'':'disabled'}>${m.ready>0?`🏦 Riscuoti affitti: 🧱 ${wNum(m.ready)}`:'Affitti: niente da riscuotere per ora'}</button>
   ${m.houses.length?`<div class="wlist">${m.houses.map((h,i)=>`<button class="strow" data-wh="${i}"><span>🔑</span><div><b>Casa ${h.building_id.slice(1,7)}</b><small>livello ${h.level} · valore 🧱 ${wNum(h.value)}</small></div></button>`).join('')}</div>`:''}
   <details class="man" style="margin-top:8px"><summary>Come funziona</summary><div class="man-b">
    <p>• <b>Compri</b> case libere vere, toccandole sulla mappa (scheda Mondo) o nel quartiere del gioco. Ogni casa rende affitti ogni giorno.</p>
    <p>• Più sali di <b>livello mondo</b>, più case puoi avere e più lontano puoi comprare: dalla tua zona fino al mondo intero.</p>
    <p>• Se l’<b>abitante vero</b> di una tua casa si iscrive, la casa passa a lui: tu ricevi indietro <b>tutto</b> (acquisto + potenziamenti) e dopo 3 giorni un <b>bonus del 25%</b> (75% se l’avevi invitato tu).</p>
    <p>• <b>Mattoni</b>: notti vinte, missioni, accesso del giorno, casa valutata, codici usati in negozio, amici invitati, affitti. Ogni giorno c’è un tetto: non si possono “fabbricare”.</p></div></details></div>`;}
function wBind(){const p=app.querySelector('.wpan');if(!p)return;const c=p.querySelector('[data-wcol]');if(c)c.onclick=async()=>{c.disabled=true;try{const r=await wRpc('world_collect');if(r&&r.ok){toast(`🏦 Affitti: +🧱 ${wNum(r.got)}`);sfx&&sfx('coin');}}catch(e){toast(e.message);}wMine(true);};
  p.querySelectorAll('[data-wh]').forEach(b=>b.onclick=()=>{const h=W.m.houses[+b.dataset.wh];wSheet(h.building_id,h.lat,h.lon);});}
/* ---- scheda di un edificio del mondo ---- */
const W_ST={free:['🟢','Casa libera','#bfe8c9'],owned:['🟡','Casa di un altro giocatore','#fff0a0'],mine:['🔑','Casa tua (comprata)','#ffe680'],home:['🏠','Abitata da un superstite','#e2d6f5'],myhome:['❤️','Casa tua','#f6b8bf'],mypending:['⏳','Casa tua in conferma','#f6b8bf'],excluded:['🚫','Esclusa dal gioco','#e6e1d6']};
async function wSheetBase(bid,lat,lon){openSheet('🌍 Edificio del mondo','<p><span class="spin"></span> Controllo l’edificio…</p>',()=>{});let q;
  try{q=await wRpc('world_quote',{p_bid:bid,p_lat:lat,p_lon:lon});}catch(e){openSheet('🌍 Edificio del mondo',`<p class="notice">${esc(e.message)}</p>`);return;}
  const st=W_ST[q.status]||W_ST.free;const lv=`<span class="tag">livello ${q.level}</span>`;let act='';
  if(q.status==='free')act=`<div class="wbuy"><div><b>Prezzo</b><span>🧱 ${wNum(q.price)}</span></div><div><b>I tuoi Mattoni</b><span>🧱 ${wNum(q.mattoni)}</span></div><div><b>Distanza</b><span>${q.dist_km} km / ${q.radius_km>=20000?'∞':q.radius_km+' km'}</span></div><div><b>Case</b><span>${q.owned}/${q.max}</span></div></div>
     ${q.can?`<button class="btn wide" data-wbuy>Compra questa casa · 🧱 ${wNum(q.price)}</button>`:`<p class="notice">${esc(q.why)}</p>`}
     <p class="muted" style="font-size:12.5px;margin-top:8px">Se un giorno l’abitante vero si iscrive, la casa passa a lui e tu ricevi tutto indietro più un bonus.</p>`;
  else if(q.status==='mine')act=`<p style="font-weight:400">Valore: <b>🧱 ${wNum(q.value)}</b> · rende <b>🧱 ${5+5*q.level}</b> al giorno.</p><div class="row" style="gap:8px;flex-wrap:wrap">${q.level<5?`<button class="btn" data-wup>Potenzia · 🧱 ${wNum(q.up_cost)}</button>`:''}<button class="btn ghost small" data-wsell>Vendi (70%: 🧱 ${wNum(Math.floor(q.value*.7))})</button></div>`;
  else if(q.status==='myhome')act=`<p style="font-weight:400">Nessuno può comprarla. Potenziandola sale di livello.</p>${q.level<5?`<button class="btn" data-wup>Potenzia · 🧱 ${wNum(q.up_cost)}</button>`:''}`;
  else if(q.status==='mypending')act='<p style="font-weight:400">Riapri l’app domani: la conferma in due giorni serve a evitare che qualcuno si prenda case non sue.</p>';
  else if(q.status==='owned')act=`<p style="font-weight:400">Proprietà di <b>@${esc(q.owner_nick||'superstite')}</b>. Non si può comprare.</p>`;
  else if(q.status==='home')act='<p style="font-weight:400">Qui abita un superstite registrato: è casa sua, non si può comprare.</p>';
  else if(q.status==='excluded')act='<p style="font-weight:400">Chi abita qui ha chiesto di non far parte del gioco.</p>';
  const mine=W.m&&W.m.home;const canClaim=S.user&&['free','owned'].includes(q.status);
  openSheet('🌍 Edificio del mondo',`<div class="bzc"><div class="bzc-hero" style="--c:${st[2]}"><span class="bzc-ic">${st[0]}</span><div class="bzc-t"><span class="bzc-cat">${st[1]}</span><h4>Edificio ${esc(bid.slice(1,8))}</h4><small>${lv}</small></div></div></div>
    <div style="margin-top:12px">${act}</div>
    ${canClaim?`<button class="bzc-own" data-wclaim>${mine?'Ti sei trasferito qui? Rendila casa tua →':'Abiti qui? Rendila casa tua →'}</button>`:''}
    <button class="bzc-rep" data-wexcl>Abiti qui e non vuoi che sia nel gioco? Chiedi l’esclusione</button>`,card=>{
    const b=card.querySelector('[data-wbuy]');if(b)b.onclick=async()=>{b.disabled=true;try{const r=await wRpc('world_buy',{p_bid:bid,p_lat:lat,p_lon:lon});toast(r.ok?`🔑 ${r.msg}: −🧱 ${wNum(r.price)}`:r.msg);if(r.ok){closeSheet();HQW.t=0;await wMine(true);wAfterChange();}else b.disabled=false;}catch(e){toast(e.message);b.disabled=false;}};
    const u=card.querySelector('[data-wup]');if(u)u.onclick=async()=>{u.disabled=true;try{const r=await wRpc('world_upgrade',{p_bid:bid});toast(r.ok?`⬆️ Livello ${r.level}`:r.msg);await wMine(true);if(r.ok)wSheet(bid,lat,lon);else u.disabled=false;}catch(e){toast(e.message);}};
    const s=card.querySelector('[data-wsell]');if(s)s.onclick=async()=>{if(!confirm('Vendere la casa? Ricevi il 70% del valore e torna libera.'))return;try{const r=await wRpc('world_sell',{p_bid:bid});toast(r.ok?`Venduta: +🧱 ${wNum(r.back)}`:r.msg);closeSheet();HQW.t=0;await wMine(true);wAfterChange();}catch(e){toast(e.message);}};
    const c=card.querySelector('[data-wclaim]');if(c)c.onclick=async()=>{if(!confirm('Confermi che questa è la casa dove abiti? Puoi cambiarla una volta ogni 30 giorni.'))return;try{const r=await wRpc('world_claim_home',{p_bid:bid,p_lat:lat,p_lon:lon});toast('🏠 '+r.msg);closeSheet();wMine(true);}catch(e){toast(e.message);}};
    card.querySelector('[data-wexcl]').onclick=async()=>{if(!S.user){toast('Scrivi a INDZ dalla pagina Privacy per chiedere l’esclusione');return;}
      try{await SB.from('poi_reports').insert({name:'Edificio '+bid,lat,lon,motivo:'ESCLUDI EDIFICIO '+bid});toast('Richiesta inviata: la valutiamo noi');closeSheet();}catch(e){toast('Non inviata');}};});}
function wAfterChange(){try{if(S.tab==='orda'&&G.view==='hub')renderHub();}catch(e){}(window.__zlms||[]).forEach(lm=>{try{wDrawMap(lm,true);}catch(e){}});}
/* ---- mappa: stato degli edifici del mondo + tocco su un edificio ---- */
async function wDrawMapBase(lm,force){if(!lm||!lm.map||!W.on)return;const map=lm.map;if(map.getZoom()<14){(lm._w||[]).forEach(x=>x.remove());lm._w=[];return;}
  const b=map.getBounds();const key=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()].map(v=>v.toFixed(3)).join(',');if(!force&&lm._wk===key)return;lm._wk=key;
  let rows=[];try{rows=await wRpc('world_view',{p_minlat:b.getSouth(),p_minlon:b.getWest(),p_maxlat:b.getNorth(),p_maxlon:b.getEast()})||[];}catch(e){return;}
  (lm._w||[]).forEach(x=>x.remove());lm._w=[];lm._wrows=rows;
  /* un solo segnaposto per edificio (entro 20 m), con chi ci abita */
  const pri={myhome:0,mine:1,home:2,owned:3,free:4};rows=rows.slice().sort((x,y)=>(pri[x.status]??9)-(pri[y.status]??9));const kept=[];rows.forEach(r=>{if(!kept.some(k=>trM(k.lat,k.lon,r.lat,r.lon)<20))kept.push(r);});rows=kept;lm._wrows=rows;
  rows.forEach(r=>{const st=W_ST[r.status]||W_ST.owned;const res=r.residents?String(r.residents).split(', ').filter(Boolean):[];
    const lbl=r.status==='myhome'?(res.length?`<em>👥 @${esc(res[0])}${res.length>1?' +'+(res.length-1):''}</em>`:''):r.status==='home'?((res[0]||r.nick)?`<em>${r.pending?'⏳ ':''}@${esc(res[0]||r.nick)}${res.length>1?' +'+(res.length-1):''}</em>`:(r.pending?'<em>⏳</em>':'')):r.status==='owned'&&r.nick?`<em>@${esc(r.nick)}</em>`:r.status==='mine'?'<em>tua</em>':'';
    const el=elDiv('lm-w '+r.status+(r.pending?' pend':''),`<b>${st[0]}</b>${lbl}`);
    el.addEventListener('click',e=>{e.stopPropagation();wSheet(r.building_id,r.lat,r.lon);});lm._w.push(new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([r.lon,r.lat]).addTo(map));});}
/* codice dell'edificio dal disegno della mappa: stesso per tutti (stesse mappe), istantaneo, senza server */
function wFromTile(feats,lat,lon){for(const f of feats||[]){const g=f.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
    const hit=polys.find(pl=>pl[0]&&wInRing(pl[0],lon,lat));if(!hit)continue;const R=hit[0].slice(0,-1);if(R.length<3)continue;
    let A=0,cx=0,cy=0;for(let i=0;i<R.length;i++){const[x1,y1]=R[i],[x2,y2]=R[(i+1)%R.length];const c=x1*y2-x2*y1;A+=c;cx+=(x1+x2)*c;cy+=(y1+y2)*c;}
    if(Math.abs(A)<1e-12){cx=R.reduce((a,p)=>a+p[0],0)/R.length;cy=R.reduce((a,p)=>a+p[1],0)/R.length;}else{cx/=3*A;cy/=3*A;}
    const la=+cy.toFixed(5),lo=+cx.toFixed(5);return{bid:'g'+la.toFixed(5)+'_'+lo.toFixed(5),lat:la,lon:lo};}return null;}
function wInRing(r,x,y){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
function wPick(els,lat,lon){let best=null,bd=1e9;(els||[]).forEach(e=>{if(e.type!=='way'||!e.geometry||e.geometry.length<3||(e.tags&&!e.tags.building))return;
    const R=e.geometry.map(p=>[p.lon,p.lat]);const c=e.geometry.reduce((q,p)=>[q[0]+p.lat/e.geometry.length,q[1]+p.lon/e.geometry.length],[0,0]);
    const d=wInRing(R,lon,lat)?-1:trM(lat,lon,c[0],c[1]);if(d<bd){bd=d;best={bid:'w'+e.id,lat:+c[0].toFixed(6),lon:+c[1].toFixed(6),d};}});return best&&best.d<15?best:null;}
async function wIdentify(lat,lon){
  /* 1) edifici già in memoria (la tua zona e quelle già viste): istantaneo, senza server */
  const pools=Object.values(RM.cache||{}).map(m=>m&&m.els);try{Object.keys(localStorage).filter(k=>k.startsWith('zsh_rm2_')).forEach(k=>{try{pools.push(JSON.parse(localStorage.getItem(k)).m.els);}catch(e){}});}catch(e){}
  for(const els of pools){const b=wPick(els,lat,lon);if(b)return b;}
  /* 2) chiedo al server delle mappe, con riserva e un secondo tentativo */
  for(let t=0;t<2;t++){try{const els=await trOverpass(`[out:json][timeout:12];way["building"](around:12,${lat},${lon});out ids tags geom;`,12000,4);const b=wPick(els.map(e=>({...e,type:'way'})),lat,lon);if(b)return b;return null;}catch(e){if(t===0)await new Promise(r=>setTimeout(r,2500));}}
  throw new Error('occupato');}
/* ---- il quartiere del gioco usa il mondo unico ---- */
async function wHood(){if(!W.on||!HQ.map||!HQ.map.lotsB)return;const m=RM.cache[S.zone&&S.zone.address];if(!m)return;
  if(Date.now()-HQW.t<60000&&HQW.key===S.zone.address)return;HQW.t=Date.now();HQW.key=S.zone.address;
  let rows=[];try{rows=await wRpc('world_view',{p_minlat:m.lat-0.007,p_minlon:m.lon-0.01,p_maxlat:m.lat+0.007,p_maxlon:m.lon+0.01})||[];}catch(e){return;}
  HQW.st=new Map(rows.map(r=>[r.building_id,r]));
  /* stesso edificio arrivato con un codice diverso: lo riconosco dalla posizione */
  Object.values(HQ.map.lotsB).forEach(wb=>{if(HQW.st.has(wb.bid))return;const r=rows.find(x=>trM(x.lat,x.lon,wb.lat,wb.lon)<=4);if(r)HQW.st.set(wb.bid,r);});
  HQW.blocked=new Set([...HQW.st.entries()].filter(([k,r])=>['owned','home','myhome'].includes(r.status)).map(([k])=>k));
  /* le case comprate nel mondo sono edifici tuoi nel gioco; quelle passate ad altri escono */
  let ch=false;Object.entries(HQ.map.lotsB).forEach(([lid,wb])=>{const r=HQW.st.get(wb.bid);const own=G.lots[lid];
    if(r&&r.status==='mine'&&!own){G.lots[lid]={kind:'house',lv:1,ten:null,w:1};ch=true;}
    if(own&&r&&['owned','home','myhome'].includes(r.status)){const l=LOTS.find(x=>x.id===lid);if(!own.w)G.coins+=(l&&l.cost)||300;delete G.lots[lid];ch=true;toast('🏠 Un edificio del tuo quartiere è passato a chi ci abita: ti è stato rimborsato');}
    if(own&&own.w&&(!r||r.status!=='mine')){delete G.lots[lid];ch=true;}});
  if(ch||rows.length){HQ.map=HQ.map;try{if(S.tab==='orda'&&G.view==='hub'&&(G.sub||'q')==='q')renderHub();}catch(e){}}}
/* nel quartiere del gioco: comprare un edificio = comprare la casa vera nel mondo (con i Mattoni) */
/* case degli altri e abitate: segnate sulla mappa del quartiere */
const _hqBackW=hqBack;hqBack=function(m){let s=_hqBackW(m);try{let pins='';HQW.st.forEach(r=>{if(!['owned','home','myhome'].includes(r.status))return;const P=hqP(m,r.lat,r.lon);if(!hqIn(P))return;const st=W_ST[r.status];
    pins+=`<g data-wst="${r.building_id}" style="cursor:pointer"><circle cx="${P[0]}" cy="${P[1]}" r="8" fill="${st[2]}" stroke="#140f1f" stroke-width="2"/><text x="${P[0]}" y="${P[1]+3.5}" text-anchor="middle" font-size="9">${st[0]}</text>${r.status==='owned'&&r.nick?`<text x="${P[0]}" y="${P[1]+16}" text-anchor="middle" font-size="7" font-weight="700" fill="#140f1f" stroke="#fff" stroke-width="2" paint-order="stroke">@${esc(r.nick.slice(0,10))}</text>`:''}</g>`;});
  if(pins)s=s.replace('<rect y="620" width="400" height="60"',pins+'<rect y="620" width="400" height="60"');}catch(e){}return s;};
document.addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('[data-wst]');if(!g)return;const r=HQW.st.get(g.dataset.wst);if(r)wSheet(r.building_id,r.lat,r.lon);});
/* ---- guadagnare Mattoni con il gioco di sempre (il server mette i tetti) ---- */
const _oweW=window.onWaveEnd;window.onWaveEnd=function(win,L,ev,coop){try{if(_oweW)_oweW(win,L,ev,coop);}catch(e){}if(win&&!coop&&S.user)wEarn('notte');};
const _tmEventW=tmEvent;tmEvent=function(k,id,ok){const T=G&&G.tm;const before=T?T.list.filter(m=>m.done).length:0;_tmEventW(k,id,ok);const after=T?T.list.filter(m=>m.done).length:0;for(let i=before;i<after;i++)if(S.user)wEarn('missione');};
/* all'accesso: riepilogo, accesso del giorno, verifiche (valutazione, codici, inviti), conferma casa */
const _onLoginW=onLogin;onLogin=async function(u,fresh){const r=await _onLoginW(u,fresh);setTimeout(async()=>{await wMine();await wEarn('login');await wEarn('verifica');wClaim(false);},1500);return r;};
const _azW=analyzeZone;analyzeZone=async function(a){const z=await _azW(a);setTimeout(()=>{if(S.user)wClaim(true);},1200);return z;};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.user)wMine(true);});
/* la scheda "La tua casa" mostra lo stato nel mondo unico */
const _vZonaWorld=vZona;vZona=function(){_vZonaWorld();try{const t=document.querySelector('.myhome .mh-top>div:last-child');if(t&&!t.querySelector('.mhw'))t.insertAdjacentHTML('beforeend',`<small class="mhw" style="display:block;margin-top:4px" id="wHome">${wHomeLine()}</small>`);}catch(e){}};
/* manuale: capitolo del mondo unico */
setTimeout(()=>{if(S.user&&!W.m)wMine(true);},4000);
</script>
