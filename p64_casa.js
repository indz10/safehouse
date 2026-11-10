<script>
/* =========================================================
   PAGINA DELLA CASA — UNA SOLA FUNZIONE (Fase 4a)
   Prima: houseSheet di p31 + 12 strati (p33 … p62), ognuno modificava la pagina
   già visibile dopo un'attesa in rete → si vedeva la versione vecchia trasformarsi.
   Ora: gli stessi passi, nello stesso ordine, uno dopo l'altro su una pagina nascosta
   ("Carico la casa…"); la pagina compare solo alla fine, già nella forma finale
   (al massimo dopo ${HS_MAXMS/1000} s, anche se un dato tarda).
   ========================================================= */
const HS={tok:0};const HS_MAXMS=8000;
/* base: finestra, livello, cosa puoi fare, IA, lavori in zona (era in p31_mondo2.js) */
async function hs_base(h){openSheet(`${h.ic} ${h.label}`,'<p><span class="spin"></span> Carico la casa…</p>',()=>{});let q=null;
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
      :'<p class="muted" style="font-size:13px">Ancora nessuno sponsor entro 50 km. Conosci un’attività della zona? Invitala a diventare sponsor.</p><button class="btn ghost small" data-ha="spon">⭐ Diventa sponsor</button>'}`,card=>{hsHide(card);
    card.querySelectorAll('[data-hsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.hsp,S.zone||{seed:7}));
    card.querySelectorAll('[data-ha]').forEach(b=>b.onclick=async()=>{const k=b.dataset.ha;try{
      if(k==='shop'){shopSheet(up>mat?up-mat:0);return;}
      if(k==='up'){if(mat<up){shopSheet(up-mat);return;}b.disabled=true;const r=await wRpc('world_upgrade',{p_bid:(q&&q.status?h.bid:h.bid)});toast(r.ok?`⬆️ Livello ${r.level}!`:r.msg);await wMine(true);houseSheet(myHouses().find(x=>x.bid===h.bid)||h);return;}
      if(k==='prep'){b.disabled=true;const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);await orLoad(true);houseSheet(h);return;}
      if(k==='help'){b.disabled=true;const{data,error}=await SB.rpc('world_ask_help');if(error)throw error;toast('🆘 '+data.msg);await orLoad(true);houseSheet(h);return;}
      if(k==='watch'){closeSheet();const i=myHouses().findIndex(x=>x.bid===h.bid&&x.home===h.home);assalto('last',Math.max(0,i));return;}
      if(k==='rent'){const r=await wRpc('world_collect');toast(r.ok?`🏦 +🧱 ${wNum(r.got)}`:(r.msg||'Ancora niente'));await wMine(true);houseSheet(h);return;}
      if(k==='sell'){if(!confirm('Vendere la casa? Ricevi il 70% del valore.'))return;const r=await wRpc('world_sell',{p_bid:h.bid});toast(r.ok?`Venduta: +🧱 ${wNum(r.back)}`:r.msg);closeSheet();await wMine(true);mhBar();return;}
      if(k==='plan'){const p=card.querySelector('.plan');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});else{closeSheet();S.step=3;go('valuta');}return;}if(k==='foto'){closeSheet();S.step=1;go('valuta');return;}
      if(k==='comm'){closeSheet();SOC.tab='piazza';PZ.room='zona';go('social');setTimeout(()=>{const t=document.getElementById('pzTxt');if(t){t.value=`Consigli per la mia casa${h.home?'':' a '+kmTxt(h.km)}? Cosa conviene migliorare prima? `;t.focus();}},900);return;}
      if(k==='spon'){closeSheet();go('sponsor');return;}}catch(e){toast(e.message||'Non riuscito');b.disabled=false;}});});}
/* "Più Mattoni" e spiegazione (era in p33_fix.js) */
async function hs_mattoni(h){try{const b=document.querySelector('#sheet.open .hwal [data-ha=shop]');if(b){b.textContent='🧱 Più Mattoni';b.classList.remove('ghost');}
  const w=document.querySelector('#sheet.open .hwal');if(w&&!w.querySelector('.hwhy'))w.insertAdjacentHTML('afterend','<p class="hwhy">I 🧱 Mattoni servono per potenziare e comprare case. Toccando <b>Più Mattoni</b> vedi come guadagnarne subito (orde, missioni, affitti, inviti) e i pacchetti in vendita quando l’app sarà negli store.</p>');}catch(e){}}
/* attività vere della zona se non ci sono sponsor (era in p36_rivali.js) */
async function hs_attivita(h){try{const card=document.querySelector('#sheet.open');if(!card||card.querySelector('[data-hsp]'))return;
  const A=attVis().map(a=>({...a,dd:trM(h.lat,h.lon,a.lat,a.lon)})).filter(a=>a.dd<=50000).sort((a,b)=>a.dd-b.dd).slice(0,6);if(!A.length)return;
  const hs=[...card.querySelectorAll('h4.hh')].find(x=>/Lavori veri/.test(x.textContent));if(!hs)return;let n=hs.nextElementSibling;while(n&&n.tagName!=='H4'){const nx=n.nextElementSibling;n.remove();n=nx;}
  hs.insertAdjacentHTML('afterend',`<p class="muted" style="font-size:12px;margin:0 0 6px">Ancora nessuno sponsor qui: ecco le attività della zona.</p>${A.map((a,i)=>`<button class="strow" data-hat="${i}"><span class="splogo">${ATT_CAT[a.typ][0]}</span><div><b>${esc(a.name)}</b><small>${ATT_CAT[a.typ][1]} · ${kmTxt(a.dd/1000)}</small></div></button>`).join('')}`);
  card.querySelectorAll('[data-hat]').forEach(b=>b.onclick=()=>attSheet(A[+b.dataset.hat]));}catch(e){}}
/* spinta di recupero e scudo dei nuovi (era in p37_equita.js) */
async function hs_equita(h){try{const c=document.querySelector('#sheet.open');if(!c||c.querySelector('.eqhs')||!EQ.s)return;const w=c.querySelector('.hwal');if(!w)return;
  const t=[EQ.s.boost?`🚀 <b>Spinta di recupero</b>: sei sotto il livello medio della tua zona${EQ.s.median!=null?' ('+Math.round(EQ.s.median)+')':''}, ogni Mattone guadagnato vale +50%.`:'',EQ.s.shield?`🛡️ <b>Scudo</b> ancora ${EQ.s.shield_days} giorni.`:''].filter(Boolean);
  if(t.length)w.insertAdjacentHTML('afterend',`<p class="eqhs">${t.join('<br>')}</p>`);}catch(e){}}
/* disegno per tipo di edificio (era in p41_case.js) */
/* disegno della casa (Fase 4a-2): il riquadro c'è subito, nella posizione giusta, con "Disegno la casa…";
   il disegno vero arriva quando la forma dell'edificio è pronta (OpenStreetMap può metterci molti secondi)
   e cambia solo dentro il suo riquadro. Poi casa vera a fumetto (hs_reale) e "Sul disegno" (hs_legenda). */
function hs_tipo(h){try{const c=document.querySelector('#sheet.open');if(!c||c.querySelector('.hsart'))return;const hd=c.querySelector('.hshead');if(!hd)return;
  hd.insertAdjacentHTML('beforebegin','<div class="hsart hswait"><p class="hswaitp"><span class="spin"></span> Disegno la casa…</p></div>');
  const box=c.querySelector('.hsart');const tok=HS.tok;
  HS.art=(async()=>{try{
    try{bGeom(h.lat,h.lon).catch(()=>{});}catch(e){}/* Fase 4a-4: la forma parte subito, insieme al tipo */
    const t=h.home?(homeBT()||await bType(h.lat,h.lon,h.bid||'home')):await bType(h.lat,h.lon,h.bid);if(tok!==HS.tok||!box.isConnected)return;
    const lvl=+((c.querySelector('.hshead b')||{}).textContent||'').replace(/\D/g,'')||h.level||1;
    box.classList.remove('hswait');box.innerHTML=`${h.home&&S.answers?houseScene(S.answers,{sid:'hs'}):houseArt(t,lvl,h.bid||'home',{k:'s'})}<span>${BT[t][0]} ${BT[t][1]}</span>`;
    await hs_reale(h);if(tok!==HS.tok||!box.isConnected)return;await hs_legenda(h);}catch(e){console.warn('disegno casa',e);}})();}catch(e){}}
/* casa vera a fumetto (forma da OpenStreetMap) (era in p42_reale.js) */
async function hs_reale(h){try{const c=document.querySelector('#sheet.open');const box=c&&c.querySelector('.hsart');if(!box)return;const lvl=+((c.querySelector('.hshead b')||{}).textContent||'').replace(/\D/g,'')||h.level||1;
  const tmp=document.createElement('div');const g=await drawHouse(tmp,h,{lvl,a:h.home?(S.answers||{}):{},prep:!!(OR.s&&OR.s.prepared),helps:h.home?Math.min(4,+((OR.s||{}).helps_in||0)):0});
  if(g){const sp=box.querySelector('span');box.innerHTML=tmp.innerHTML+`<span>${esc(realDesc(g))}</span>`;}}catch(e){}}
/* % di tenuta dal server e "Perché" (era in p44_guida.js) */
async function hs_tenuta(h){try{await defLoad();const c=document.querySelector('#sheet.open');if(!c)return;const dh=defHouse(h.bid,h.home);const ch=dh?defChance(dh.total):null;
  const box=c.querySelector('.hsdef');if(box&&ch!=null){box.innerHTML=`<b>${ch}%</b><small>probabilità di tenere</small><button class="whyb" data-why>🧮 Perché</button>`;box.querySelector('[data-why]').onclick=()=>whySheet(h.bid,h.home);}}catch(e){}}
/* chi arriva su questa casa (era in p47_zombie.js) */
async function hs_zombie(h){try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.thpan'))return;
  const at=[...c.querySelectorAll('h4.hh')].find(x=>/Cosa puoi fare/.test(x.textContent));const html=`<div class="thpan"><h4 class="hh" style="margin-top:4px">🧟 Chi arriva su questa casa</h4><div class="thbox"><p class="muted"><span class="spin"></span> Calcolo l’orda con meteo e terreno veri…</p></div></div>`;
  if(at)at.insertAdjacentHTML('beforebegin',html);else c.insertAdjacentHTML('beforeend',html);await thrSection(c,h);
  const T=thrOf(h);if(T){const box=c.querySelector('.hsdef b');if(box)box.textContent=thrCalc(T).ch+'%';}}catch(e){console.warn(e);}}
/* fortificazioni consigliate (era in p50_fortezze.js) */
async function hs_fortezze(h){try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.fortpan'))return;await thrLoad();const T=thrOf(h);if(!T)return;
  const ai=[...c.querySelectorAll('h4.hh')].find(x=>/Migliorie consigliate/.test(x.textContent));const top=fortOpts(T).filter(o=>!o.max&&o.gain>0).slice(0,4);
  const html=`<div class="fortpan"><h4 class="hh">🎯 Fortificazioni consigliate per questa casa</h4><p class="muted" style="font-size:12px;margin:0 0 6px">In base agli zombie in arrivo e al meteo (${(EVN[T.ev]||EVN.calma)[0]} ${(EVN[T.ev]||EVN.calma)[1].toLowerCase()}). Tocca per comprare.</p>
    <div class="rinf">${top.length?top.map(o=>`<button class="fch no up" data-fk="${o.k}"><span>${fortLabel(o)}</span><small><b>+${o.gain}%</b> · 🧱 ${wNum(o.cost)}</small></button>`).join(''):'<span class="ok fdone">✓ Questa casa è già ben fortificata per l’orda in arrivo</span>'}</div></div>`;
  if(ai&&!h.home){let n=ai.nextElementSibling;while(n&&n.classList&&n.classList.contains('hai')){const nx=n.nextElementSibling;n.remove();n=nx;}if(ai.isConnected)ai.outerHTML=html;}
  else{const at=[...c.querySelectorAll('h4.hh')].find(x=>/Cosa puoi fare/.test(x.textContent));if(at)at.insertAdjacentHTML('beforebegin',html);else c.insertAdjacentHTML('beforeend',html);}
  c.querySelectorAll('.fortpan [data-fk]').forEach(b=>b.onclick=()=>{const o=fortOpts(T).find(x=>x.k===b.dataset.fk);if(o)fortBuy(h,T,o,()=>houseSheet(h));});}catch(e){console.warn(e);}}
/* pagina intera: fila delle case, tutte le fortificazioni, casa vera, diario (era in p53_casapagina.js) */
async function hs_pagina(h){try{const sh=document.getElementById('sheet');if(!sh||!sh.classList.contains('open'))return;sh.classList.add('hfull');
  const c=sh.querySelector('.sheet-b');if(!c||c.dataset.hp)return;c.dataset.hp='1';const T=thrOf(h);
  /* fila delle case */
  c.insertAdjacentHTML('afterbegin',hpSwitcher(h));c.querySelectorAll('[data-hps]').forEach(b=>b.onclick=()=>{const x=myHouses()[+b.dataset.hps];if(x)houseSheet(x);});
  /* tutte le fortificazioni al posto delle 4 consigliate */
  const fp=c.querySelector('.fortpan');if(fp&&T){const s=OR.s||{};fp.innerHTML=`<h4 class="hh">🧱 Fortificazioni di questa casa <small style="font-weight:400;font-size:12px">· tocca per comprare</small></h4>
     <p class="muted" style="font-size:12px;margin:0 0 6px">In alto le più utili contro gli zombie e il meteo di questa casa (${(EVN[T.ev]||EVN.calma)[0]} ${(EVN[T.ev]||EVN.calma)[1].toLowerCase()}).</p>
     <div class="rinf">${!s.prepared?'<button class="fch no up" data-fprep><span>🛡️ Prepara le case</span><small><b>+15</b> difesa · gratis</small></button>':'<span class="ok fdone">✓ 🛡️ Case preparate per la prossima orda</span>'}${fortChips(T,true)}</div>`;
    const redo=()=>houseSheet(h);fp.querySelectorAll('[data-fk]').forEach(b=>b.onclick=()=>{const o=fortOpts(T).find(x=>x.k===b.dataset.fk);if(o)fortBuy(h,T,o,redo);});
    const pr=fp.querySelector('[data-fprep]');if(pr)pr.onclick=async()=>{pr.disabled=true;try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);await orLoad(true);redo();}catch(e){toast(e.message||'Non riuscito');pr.disabled=false;}};
    /* subito sotto il disegno */const art=c.querySelector('.hsart');const hd=c.querySelector('.hshead');const anchor=(hd&&hd.nextElementSibling)||art;if(anchor&&fp!==anchor.nextElementSibling)anchor.after(fp);}
  /* casa vera: le voci della valutazione */
  if(h.home&&S.answers&&!c.querySelector('.hpreal')){const a=S.answers;const R=[['🚪','Porta blindata',a.porta==='blindata'||a.porta==='b4'],['▦','Grate alle finestre',a.grate==='tutte'||a.grate==='alcune'],['🪟','Vetri antisfondamento',a.vetri==='anti'],['💡','Luci a sensore',a.luci==='sensore'],['🚨','Allarme o telecamere',a.allarme==='allarme'||a.allarme==='cam'],['🧱','Recinzione',a.recinzione&&a.recinzione!=='no']];
    const lv=(typeof scudoLv==='function')?scudoLv():0;(c.querySelector('.fortpan')||c.querySelector('.hshead')).insertAdjacentHTML('afterend',`<div class="hpreal"><h4 class="hh">🏠 La casa vera (dalla valutazione) <small style="font-weight:400;font-size:12px">· Scudo ${lv}/5 = +${lv*2} difesa a tutte le case</small></h4>
      <div class="rinf">${R.map(([ic,t,ok])=>`<button class="fch ${ok?'ok':'no'}" data-hpr><span>${ic} ${t}</span><small>${ok?'fatto':'aggiorna la valutazione'}</small></button>`).join('')}</div></div>`);
    c.querySelectorAll('[data-hpr]').forEach(b=>b.onclick=()=>{if(b.classList.contains('ok'))return;closeSheet();S.step=1;go('valuta');});}
  /* diario */
  if(!c.querySelector('.hpdia')){c.insertAdjacentHTML('beforeend',`<details class="man mcdia hpdia"><summary>🕑 Diario delle modifiche</summary><div class="man-b" data-hpdl><p class="muted"><span class="spin"></span></p></div></details>`);
    const d=c.querySelector('.hpdia');d.addEventListener('toggle',async()=>{if(d.open)d.querySelector('[data-hpdl]').innerHTML=diaryHTML(await diaryLoad(h.bid||'home'));});}
  try{coinText(sh);}catch(e){}}catch(e){console.warn(e);}}
/* chi vive qui (era in p54_account.js) */
async function hs_residenti(h){try{if(!h.home)return;const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.crpan'))return;
  const at=c.querySelector('.hpreal')||c.querySelector('.fortpan');const box=document.createElement('div');box.className='crpan';box.innerHTML='<h4 class="hh">🏢 Chi vive qui</h4><div class="crbox"><p class="muted"><span class="spin"></span></p></div>';
  if(at)at.after(box);else c.appendChild(box);const b=box.querySelector('.crbox');b.innerHTML=await coresHTML();
  b.querySelectorAll('[data-crm]').forEach(x=>x.onclick=()=>dmSheet(x.dataset.crm,x.dataset.n));
  b.querySelectorAll('[data-cra]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const r=await socRpc('world_ally_request',{p_target:x.dataset.cra});toast(r&&r.msg?r.msg:'🤝 Richiesta inviata');}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});}catch(e){console.warn(e);}}
/* la tua abitazione (era in p55_abitazione.js) */
async function hs_abitazione(h){try{if(!h.home||!S.user)return;const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.abpan'))return;await abitMount(c,h);}catch(e){console.warn(e);}}
/* "Sul disegno" (era in p62_legenda.js) */
async function hs_legenda(h){try{const box=document.querySelector('#sheet.open .hsart');if(box)await hLegendPut(box,h);}catch(e){}}
/* casa vera: piano d'azione e valutazione al posto delle 3 migliorie dell'IA (Fase 5b: prima stavano nella vecchia pagina "La mia casa") */
async function hs_valutazione(h){try{if(!h.home||!S.result)return;const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.hval'))return;
  let plan='';try{plan=planHTML();}catch(e){}
  const ai=[...c.querySelectorAll('h4.hh')].find(x=>/Migliorie consigliate/.test(x.textContent));
  const html=`${plan}<div class="panel hval"><b class="disp" style="font-size:20px">📷 La tua valutazione</b><small class="muted" style="display:block;margin:2px 0 6px">Indice ${fmtI(S.result.idx)}/10 · ${esc((S.zone&&S.zone.address)||'')}</small>
    <div class="hvalg"><button data-hv="foto">📷<span>Nuove foto</span></button><button data-hv="risposte">✏️<span>Risposte</span></button><button data-hv="pos">📍<span>Posizione</span></button><button data-hv="moving">🚚<span>Trasloco</span></button></div>
    <button class="btn ghost wide" data-hv="tutto" style="margin-top:8px">Rivedi tutta la valutazione</button></div>`;
  if(ai){/* tolgo il titolo e le 3 migliorie (sono le prime del piano); resta la riga dei pulsanti */
    let n=ai.nextElementSibling;while(n&&n.classList.contains('hai')){const x=n;n=n.nextElementSibling;x.remove();}
    const pb=c.querySelector('[data-ha="plan"]');if(pb)pb.remove();ai.insertAdjacentHTML('beforebegin',html);ai.remove();}
  else{const lv=[...c.querySelectorAll('h4.hh')].find(x=>/Lavori veri/.test(x.textContent));if(lv)lv.insertAdjacentHTML('beforebegin',html);else c.insertAdjacentHTML('beforeend',html);}
  c.querySelectorAll('[data-plsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.plsp,S.zone));
  c.querySelectorAll('[data-hv]').forEach(b=>b.onclick=()=>{const k=b.dataset.hv;closeSheet();
    if(k==='moving'){try{moveSheet();}catch(e){go('valuta');}return;}
    S.step=k==='pos'?0:k==='foto'?1:k==='risposte'?2:3;go('valuta');});}catch(e){console.warn(e);}}
/* "Le mie case" (Fase 5b): per chi ha l'account e ha valutato la casa. In cima ❤️ la casa dove abiti, poi quelle comprate */
function casasOk(){try{return !!(S.user&&S.result&&myHouses().some(x=>x.home));}catch(e){return false;}}
function casasSheet(){const L=myHouses();const s=OR.s||{};
  const row=(h,i)=>{let c=null;try{c=frChanceOf(h);}catch(e){}const real=(s.houses||[]).find(x=>Math.abs(x.lat-h.lat)<.0003&&Math.abs(x.lon-h.lon)<.0004);
    return`<button class="strow csrow" data-cs="${i}"><span class="splogo">${h.home?'❤️':'🔑'}</span><div><b>${h.home?'Casa tua':esc(h.label)}${h.home?' · dove abiti':''}</b><small>${h.home?`Indice ${fmtI(S.result.idx)}/10 · `:kmTxt(h.km)+' da casa tua · '}livello ${h.level||1}${c!=null?` · tiene ${c}%`:''}${real?(real.held?' · 🛡️ ha tenuto':' · 💥 sfondata'):''}</small></div><i>›</i></button>`;};
  openSheet('🏠 Le mie case',`<p style="font-weight:400;margin-bottom:8px">Tocca una casa per vedere difese, fortificazioni e modifiche.</p>
    ${L.map(row).join('')}
    ${L.length<2?'<p class="muted" style="font-size:13px;margin:10px 0 6px">Con i 🧱 Mattoni puoi comprare altre case libere sulla mappa del mondo.</p>':''}
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-csm>🌍 ${L.length<2?'Compra una casa':'Compra altre case'}</button><button class="btn ghost small" data-csv>📷 Aggiorna la valutazione</button></div>`,card=>{
    card.querySelectorAll('[data-cs]').forEach(b=>b.onclick=()=>{const h=myHouses()[+b.dataset.cs];if(h)houseSheet(h);});
    card.querySelector('[data-csm]').onclick=()=>{closeSheet();S.mfHouses=true;go('mappa');};
    card.querySelector('[data-csv]').onclick=()=>{closeSheet();S.step=3;go('valuta');};});}
/* nasconde il corpo appena la pagina base viene creata (dentro openSheet, prima che lo schermo si ridisegni) */
function hsHide(card){const b=card.querySelector('.sheet-b');if(b)b.style.visibility='hidden';const sh=document.getElementById('sheet');if(sh)sh.classList.add('hfull');
  if(!card.querySelector('.hsload'))card.insertAdjacentHTML('beforeend','<p class="hsload"><span class="spin"></span> Carico la casa…</p>');}
async function houseSheet(h){const tok=++HS.tok;
  openSheet(`${h.ic} ${h.label}`,'<p><span class="spin"></span> Carico la casa…</p>',()=>{});/* subito, anche con la rete lenta */
  try{await thrLoad(true);}catch(e){}if(tok!==HS.tok)return;
  await hs_base(h);if(tok!==HS.tok)return;
  const sh=document.getElementById('sheet');const card=sh&&sh.querySelector('.sheet-card');const body=card&&card.querySelector('.sheet-b');if(!body)return;
  hsHide(card);
  const reveal=()=>{body.style.visibility='';const l=card.querySelector('.hsload');if(l)l.remove();};const t=setTimeout(reveal,HS_MAXMS);
  HS.art=null;
  for(const f of [hs_mattoni,hs_attivita,hs_equita,hs_tipo,hs_tenuta,hs_zombie,hs_fortezze,hs_pagina,hs_residenti,hs_abitazione,hs_valutazione]){if(tok!==HS.tok||!body.isConnected)break;try{await f(h);}catch(e){console.warn('pagina casa',f.name,e);}}
  /* se il disegno è quasi pronto lo aspetto un attimo, così compare già con la pagina */
  if(HS.art)await Promise.race([HS.art,new Promise(r=>setTimeout(r,1500))]);
  clearTimeout(t);if(body.isConnected)reveal();}
</script>
