<script>
/* =========================================================
   HOMEPAGE A DISEGNO + LE TUE CASE NEL MONDO + SCHEDA DELLA CASA
   - home: un disegno a tutto schermo con i pulsanti (🌍 Vai al mondo…)
   - nel mondo: in basso le tue case; un tocco e la mappa ci vola sopra
   - tocco sulla casa: cosa fare con 🧱 Mattoni e 💎 gemme, acquisto in app,
     migliorie consigliate dall'IA, community, lavori veri degli sponsor entro 50 km
   ========================================================= */
/* ---------------- la vecchia pagina Casa diventa "La mia casa" ---------------- */
const renderCasaDash=renderHome;NAV_ACT.casa='home';
const _goM2=go;go=function(tab){if(tab!=='casa')return _goM2(tab);window.__last='apre la mia casa';document.body.classList.remove('inbattle');
  if(typeof G!=='undefined'&&G.run){G.run.stop=true;G.run=null;}S.tab='casa';renderNav();window.scrollTo(0,0);try{closeSheet();}catch(e){}renderCasaDash();
  try{const top=app.querySelector('.page');if(top&&!app.querySelector('.cback'))top.insertAdjacentHTML('afterbegin','<button class="cback" data-cback>‹ Torna alla home</button>');const b=app.querySelector('[data-cback]');if(b)b.onclick=()=>go('home');}catch(e){}};
/* ---------------- HOMEPAGE: tutta un disegno ---------------- */
renderHome=function(){const m=window.W&&W.m,s=OR.s;const has=!!S.result;const next=(s&&s.next_at)||vNextSlot();
  app.innerHTML=`<section class="hscene"><div class="hsart">${heroSVG()}</div>
    <div class="hstitle"><h1>Zombie<span>Safe House</span></h1><p>${has?'Il mondo ti aspetta, superstite.':'Quanto resiste la tua casa all’orda?'}</p></div>
    <div class="hsbtns">${S.user&&m?`<div class="hschips"><span>🧱 ${wNum(m.mattoni)}</span><span>💎 ${(typeof G!=='undefined'&&G.gems)||0}</span><span>🧟 tra <b data-oleft>${orLeft(next)}</b></span></div>`:''}
      <button class="hsbig" data-hs="mondo">🌍 Vai al mondo</button>
      ${has?'<button class="hsmid" data-hs="casa">🏠 La mia casa</button>':'<button class="hsmid" data-hs="valuta">📷 Valuta la mia casa</button>'}
      <div class="hsrow"><button data-hs="orda">🧟 Orda</button><button data-hs="social">👥 Superstiti</button><button data-hs="menu">☰ Tutto</button></div>
    </div></section>`;
  try{const sv=app.querySelector('.hsart svg');if(sv){sv.setAttribute('preserveAspectRatio','xMidYMid slice');}const sc=app.querySelector('.hscene');const nav=$('#nav');sc.style.height=Math.max(460,innerHeight-sc.getBoundingClientRect().top-(nav?nav.offsetHeight:64))+'px';}catch(e){}
  app.querySelectorAll('[data-hs]').forEach(b=>b.onclick=()=>{const k=b.dataset.hs;if(k==='mondo'){S.mfHouses=true;go('mappa');}else if(k==='menu')zmOpen();else go(k);});
  if(S.user&&!W.m&&typeof wMine==='function'&&Date.now()-(window.__homeAsk||0)>30000){window.__homeAsk=Date.now();wMine(true).then(()=>{if(S.tab==='home'&&W.m)renderHome();}).catch(()=>{});}};
/* ---------------- NEL MONDO: le tue case in basso ---------------- */
function myHouses(){const m=window.W&&W.m;const L=[];const home=m&&m.home&&m.home.lat!=null?m.home:(S.zone&&S.zone.real?{lat:S.zone.real.lat,lon:S.zone.real.lon,status:'pending'}:null);
  if(home)L.push({home:true,bid:home.building_id||'',lat:home.lat,lon:home.lon,level:1,label:'Casa tua',ic:'❤️'});
  ((m&&m.houses)||[]).forEach((h,i)=>L.push({home:false,bid:h.building_id,lat:h.lat,lon:h.lon,level:h.level||1,value:h.value||0,label:'Casa '+(i+1),ic:'🔑'}));
  const o=L[0];L.forEach(h=>{h.km=o?trM(o.lat,o.lon,h.lat,h.lon)/1000:0;});return L;}
function kmTxt(k){return k<1?Math.round(k*1000)+' m':k<100?k.toFixed(1).replace('.',',')+' km':wNum(Math.round(k))+' km';}
function mhBar(){const w=app.querySelector('.mapfull');if(!w)return;let b=w.querySelector('.mhouses');const L=myHouses();
  const html=`<div class="mhhead"><b>🏠 Le tue case (${L.length})</b><button data-mhx>${S.mhOpen===false?'▲':'▼'}</button></div>
    <div class="mhlist" ${S.mhOpen===false?'hidden':''}>${L.length?L.map((h,i)=>`<button class="mhc" data-mh="${i}"><span>${h.ic}</span><b>${h.label}</b><small>${h.home?'livello '+h.level:'liv. '+h.level+' · '+kmTxt(h.km)}</small></button>`).join(''):`<p class="muted" style="font-size:12.5px;margin:4px">${S.user?'Valuta la tua casa: diventa la prima del tuo impero.':'Accedi per avere le tue case nel mondo.'}</p>`}
     <button class="mhc add" data-mhadd><span>➕</span><b>Compra</b><small>tocca una casa libera</small></button></div>`;
  if(!b){w.insertAdjacentHTML('beforeend',`<div class="mhouses">${html}</div>`);b=w.querySelector('.mhouses');}else b.innerHTML=html;
  b.querySelector('[data-mhx]').onclick=()=>{S.mhOpen=S.mhOpen===false;mhBar();};
  b.querySelectorAll('[data-mh]').forEach(x=>x.onclick=()=>{const h=L[+x.dataset.mh];mhFly(h,true);});
  const ad=b.querySelector('[data-mhadd]');if(ad)ad.onclick=()=>openSheet('➕ Comprare una casa','<p style="font-weight:400">Avvicina la mappa e <b>tocca una casa</b>: se è libera (o di un superstite simulato 🤖) vedi il prezzo in 🧱 Mattoni e il pulsante Compra. Puoi comprare ovunque, anche in Australia: il prezzo sale con la distanza da casa tua.</p><p class="muted" style="font-size:12.5px">Per andare lontano usa ⋯ → 🔍 Cerca un luogo.</p>');}
function mhFly(h,open){const lm=window.__mf;if(!lm||!lm.map)return;try{lm.map.flyTo({center:[h.lon,h.lat],zoom:17,pitch:0,duration:h.km>500?3200:1500});}catch(e){}
  if(open)setTimeout(()=>houseSheet(h),h.km>500?3300:1600);}
const _renderMappaM2=renderMappa;renderMappa=function(){_renderMappaM2();try{mhBar();setTimeout(mhBar,1500);}catch(e){}};
/* ---------------- SCHEDA DELLA CASA ---------------- */
async function houseSheet(h){openSheet(`${h.ic} ${h.label}`,'<p><span class="spin"></span> Carico la casa…</p>',()=>{});let q=null;
  try{if(S.user&&h.bid)q=await wRpc('world_quote',{p_bid:h.bid,p_lat:h.lat,p_lon:h.lon});}catch(e){}
  const m=W.m||{};const mat=m.mattoni||0,gems=(typeof G!=='undefined'&&G.gems)||0;const lvl=(q&&q.level)||h.level||1;const up=150*lvl;const s=OR.s||{};
  const real=(s.houses||[]).find(x=>Math.abs(x.lat-h.lat)<.0003&&Math.abs(x.lon-h.lon)<.0004);
  const pw=45+12*lvl+(s.next_bonus!=null?s.next_bonus:(s.prepared?15:0))+(h.home?5:0);const wl=s.wlevel||m.wlevel||1;const chance=Math.max(3,Math.min(97,Math.round((pw-(30+4*Math.min(wl,30))+1)/60*100)));
  const need=n=>mat>=n?'':`<small class="need">Ti mancano 🧱 ${wNum(n-mat)}</small>`;
  const act=(k,ic,t,sub,cost,dis)=>`<button class="hact" data-ha="${k}" ${dis?'disabled':''}><span>${ic}</span><div><b>${t}</b><small>${sub}</small>${cost?need(cost):''}</div>${cost?`<i>🧱 ${wNum(cost)}</i>`:'<i>›</i>'}</button>`;
  /* migliorie consigliate dall'IA */
  let ai='';try{if(h.home&&S.result&&typeof planItems==='function'){const P=planItems().slice(0,3);ai=P.length?P.map(p=>`<div class="hai"><b>${esc(p.t)}</b><small>${p.c===0?'gratis':'circa '+p.c+' €'}${p.gain?' · indice −'+String(p.gain).replace('.',','):''}</small></div>`).join(''):'<p class="muted">La valutazione non trova punti deboli importanti.</p>';}
    else ai=['Porta blindata o rinforzata','Grate o vetri antisfondamento al piano terra','Luci con sensore e telecamera'].map(t=>`<div class="hai"><b>${t}</b><small>nel gioco: +1 livello di difesa con il potenziamento</small></div>`).join('');}catch(e){}
  /* lavori veri degli sponsor entro 50 km */
  const sp=Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&g.lat!=null&&SPONSORS[k]).map(([k,g])=>({k,d:trM(h.lat,h.lon,g.lat,g.lon)})).filter(x=>x.d<=50000).sort((a,b)=>a.d-b.d).slice(0,8);
  const off=typeof SP_OFF!=='undefined'?SP_OFF:{},cat=typeof SP_CAT!=='undefined'?SP_CAT:{};
  openSheet(`${h.ic} ${h.label}`,`<div class="hshead"><div><b>Livello ${lvl}</b><small>${h.home?'La tua casa vera':'Comprata nel mondo · '+kmTxt(h.km)+' da casa tua'}</small></div><div class="hsdef"><b>${chance}%</b><small>probabilità di tenere</small></div></div>
    ${real?`<p class="hslast ${real.held?'ok':'ko'}">${real.held?'🛡️ All’ultima orda ha TENUTO':'💥 All’ultima orda è stata SFONDATA'}</p>`:''}
    <div class="hwal"><span>🧱 ${wNum(mat)} Mattoni</span><span>💎 ${gems} gemme</span><button class="btn small ghost" data-ha="shop">＋ Acquista</button></div>
    <h4 class="hh">⚒️ Cosa puoi fare</h4>
    ${lvl<5?act('up','⬆️',`Potenzia al livello ${lvl+1}`,'+12 di difesa a ogni orda, più affitti',up,false):'<p class="muted">Livello massimo raggiunto.</p>'}
    ${act('prep','🛡️',s.prepared?'Case già preparate ✓':'Prepara per la prossima orda','+15 di difesa a tutte le tue case (gratis)',0,!!s.prepared)}
    ${act('help','🆘',s.asked?'Aiuto già chiesto ✓':'Chiedi aiuto agli alleati','+5 di difesa per ogni alleato che risponde',0,!!s.asked)}
    ${act('watch','🎬','Guarda l’assalto su questa casa','fumetto dell’ultima orda o simulazione',0,false)}
    ${!h.home?act('rent','🏦','Riscuoti gli affitti','ogni casa rende ogni giorno',0,false)+act('sell','🔑','Vendi la casa','ricevi il 70% del valore',0,false):''}
    <h4 class="hh">🤖 Migliorie consigliate dall’IA</h4>${ai}
    <div class="row" style="gap:8px;margin-top:8px">${h.home?'<button class="btn ghost small" data-ha="plan">📋 Tutto il piano</button><button class="btn ghost small" data-ha="foto">📷 Analizza con le foto</button>':''}<button class="btn ghost small" data-ha="comm">💬 Chiedi alla community</button></div>
    <h4 class="hh">🔧 Lavori veri in zona (50 km)</h4>
    ${sp.length?sp.map(x=>`<button class="strow" data-hsp="${x.k}"><span class="splogo">${esc(SPONSORS[x.k].logo)}</span><div><b>${esc(SPONSORS[x.k].name)}</b><small>${esc(cat[x.k]||'Sponsor')} · ${kmTxt(x.d/1000)}${off[x.k]?' · '+esc(off[x.k]):''}</small></div></button>`).join('')
      :'<p class="muted" style="font-size:13px">Ancora nessuno sponsor entro 50 km. Conosci un’attività della zona? Invitala a diventare sponsor.</p><button class="btn ghost small" data-ha="spon">⭐ Diventa sponsor</button>'}`,card=>{
    card.querySelectorAll('[data-hsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.hsp,S.zone||{seed:7}));
    card.querySelectorAll('[data-ha]').forEach(b=>b.onclick=async()=>{const k=b.dataset.ha;try{
      if(k==='shop'){shopSheet(up>mat?up-mat:0);return;}
      if(k==='up'){if(mat<up){shopSheet(up-mat);return;}b.disabled=true;const r=await wRpc('world_upgrade',{p_bid:(q&&q.status?h.bid:h.bid)});toast(r.ok?`⬆️ Livello ${r.level}!`:r.msg);await wMine(true);houseSheet(myHouses().find(x=>x.bid===h.bid)||h);return;}
      if(k==='prep'){b.disabled=true;const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);await orLoad(true);houseSheet(h);return;}
      if(k==='help'){b.disabled=true;const{data,error}=await SB.rpc('world_ask_help');if(error)throw error;toast('🆘 '+data.msg);await orLoad(true);houseSheet(h);return;}
      if(k==='watch'){closeSheet();const i=myHouses().findIndex(x=>x.bid===h.bid&&x.home===h.home);assalto('last',Math.max(0,i));return;}
      if(k==='rent'){const r=await wRpc('world_collect');toast(r.ok?`🏦 +🧱 ${wNum(r.got)}`:(r.msg||'Ancora niente'));await wMine(true);houseSheet(h);return;}
      if(k==='sell'){if(!confirm('Vendere la casa? Ricevi il 70% del valore.'))return;const r=await wRpc('world_sell',{p_bid:h.bid});toast(r.ok?`Venduta: +🧱 ${wNum(r.back)}`:r.msg);closeSheet();await wMine(true);mhBar();return;}
      if(k==='plan'){closeSheet();go('casa');return;}if(k==='foto'){closeSheet();S.step=1;go('valuta');return;}
      if(k==='comm'){closeSheet();SOC.tab='piazza';PZ.room='zona';go('social');setTimeout(()=>{const t=document.getElementById('pzTxt');if(t){t.value=`Consigli per la mia casa${h.home?'':' a '+kmTxt(h.km)}? Cosa conviene migliorare prima? `;t.focus();}},900);return;}
      if(k==='spon'){closeSheet();go('sponsor');return;}}catch(e){toast(e.message||'Non riuscito');b.disabled=false;}});});}
/* tocco su una casa tua sulla mappa → la sua scheda */
const _wSheetM2=wSheet;wSheet=async function(bid,lat,lon){const h=myHouses().find(x=>(x.bid&&x.bid===bid)||(Math.abs(x.lat-lat)<.0002&&Math.abs(x.lon-lon)<.0003));if(h&&S.user)return houseSheet(h);return _wSheetM2(bid,lat,lon);};
/* ---------------- ACQUISTO IN APP (Mattoni e gemme) ---------------- */
function shopSheet(miss){openSheet('🛒 Bottega',`${miss?`<p class="notice">Ti mancano <b>🧱 ${wNum(miss)} Mattoni</b>. Puoi guadagnarli giocando oppure comprarli.</p>`:''}
  <h4 class="hh">🧱 Mattoni</h4><div class="shopg">${[['🧱 500','1,99 €'],['🧱 1.500','4,99 €'],['🧱 4.000','9,99 €']].map(([a,b])=>`<div><b>${a}</b><small>${b}</small><button class="btn small ghost" disabled>Presto</button></div>`).join('')}</div>
  <h4 class="hh">💎 Gemme</h4><div class="shopg">${[['💎 80','0,99 €'],['💎 450','4,99 €'],['💎 1.000','9,99 €']].map(([a,b])=>`<div><b>${a}</b><small>${b}</small><button class="btn small ghost" disabled>Presto</button></div>`).join('')}</div>
  <div class="passx" style="margin-top:10px"><b>⭐ Pass del Superstite · 4,99 €/mese</b><small>Case preparate in automatico · +20% affitti · 1 casa in più · premi doppi nelle missioni</small></div>
  <p class="muted" style="font-size:12.5px;margin-top:10px">Gli acquisti si attivano quando l’app sarà su App Store e Google Play (lo richiedono le loro regole). Intanto: <b>Mattoni</b> con orde, missioni, affitti, codici sconto usati in negozio e amici invitati; <b>gemme</b> con premio del giorno, ruota, gratta e vinci e scrigni.</p>
  <div class="row" style="gap:8px;margin-top:8px"><button class="btn small" data-sg="orda">🧟 Vai a guadagnarli</button><button class="btn small ghost" data-sg="inv">📨 Invita (+150 🧱)</button></div>`,c=>{
  c.querySelector('[data-sg=orda]').onclick=()=>{closeSheet();G.ss='oggi';go('orda');};c.querySelector('[data-sg=inv]').onclick=()=>{closeSheet();if(!S.user)return loginSheet();inviteSheet();};});}
/* il menu porta anche a "La mia casa" */
try{const _zmDoM2=zmDo;zmDo=function(k,b){if(k==='home'&&b&&/Piano/.test(b.textContent)){zmClose();go('casa');return;}return _zmDoM2(k,b);};}catch(e){}
</script>
