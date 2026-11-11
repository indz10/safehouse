<script>
/* =========================================================
   NUOVA STRUTTURA: 4 schede, un solo scopo ciascuna
   🏠 Casa (casa vera + valutazione)  🗺️ Mappa (mondo vero, filtri)
   🧟 Orda (Oggi · Impero · Difendi tu)  👤 Io (profilo, inviti, bottega, aiuto)
   Nessuna funzione tolta: cambia solo dove sta.
   ========================================================= */
ICON.io='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
const NAV_ACT={home:'home',valuta:'home',gioco:'home',mappa:'mappa',orda:'orda',io:'io',radio:'io',contatti:'io',sponsor:'io',guida:'io'};

/* ---------------- 🏠 CASA: la valutazione è qui dentro ---------------- */
const _renderHomeS=renderHome;renderHome=function(){_renderHomeS();try{
  if(!S.result)return;const hr=app.querySelector('.hero2');if(hr)hr.classList.add('mini');const c=app.querySelector('.hcard');if(!c||app.querySelector('.hval'))return;
  let plan='';try{plan=typeof planHTML==='function'?planHTML():'';}catch(e){plan='';}
  c.insertAdjacentHTML('afterend',`${plan}<div class="panel hval"><b class="disp" style="font-size:20px">📷 La tua valutazione</b>
    <div class="hvalg"><button data-hv="foto">📷<span>Nuove foto</span></button><button data-hv="risposte">✏️<span>Risposte</span></button><button data-hv="pos">📍<span>Posizione</span></button><button data-hv="moving">🚚<span>Trasloco</span></button></div>
    <button class="btn ghost wide" data-hv="tutto" style="margin-top:8px">Rivedi tutta la valutazione</button></div>`);
  app.querySelectorAll('[data-plsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.plsp,S.zone));
  app.querySelectorAll('[data-hv]').forEach(b=>b.onclick=()=>{const k=b.dataset.hv;
    if(k==='moving'){try{moveSheet();}catch(e){go('valuta');}return;}
    if(k==='pos'){S.step=0;go('valuta');return;}if(k==='foto'){S.step=1;go('valuta');return;}if(k==='risposte'){S.step=2;go('valuta');return;}S.step=3;go('valuta');});
  /* in Casa niente radio e scorciatoie doppie: stanno in Io e nelle schede */
  const rd=[...app.querySelectorAll('.panel.moon')].find(p=>/Radio Operatore/.test(p.textContent));if(rd)rd.remove();
  app.querySelectorAll('[data-qa]').forEach(b=>{const t=b.textContent;b.onclick=()=>{if(/impero|Alleati/i.test(t)){G.ss='impero';go('orda');}else if(/Mappa/.test(t)){go('mappa');}else if(/casa/i.test(t)){S.step=3;go('valuta');}else go('orda');};});
  }catch(e){console.warn('casa',e);}};

/* ---------------- 🗺️ MAPPA: una sola, a tutto schermo ---------------- */
S.mf=S.mf||{case:true,spons:true,serv:false,vac:false,all:false};
const MF=[['case','🏠','Case'],['spons','⭐','Sponsor'],['serv','🏥','Servizi'],['vac','🧳','Vacanza'],['all','🤝','Alleati']];
function renderMappaBase(){S.zv='mondo';const addr=S.zone&&S.zone.address;
  if(!addr){app.innerHTML=`<div class="page dots"><div class="panel night" style="margin-top:12px"><b class="disp" style="font-size:24px;color:var(--moon)">🗺️ Il mondo vero</b>
     <p style="color:#fff;font-weight:400">Valuta la tua casa: la mappa si apre sulla tua zona, con le case da comprare, gli sponsor vicini e l’orda.</p><button class="btn" data-go="valuta">📷 Valuta la mia casa</button></div>
     <div class="panel"><b>🔍 Oppure guarda una zona</b><div class="row" style="gap:6px;margin-top:6px"><input id="mfQ" class="field" placeholder="Via, paese o città" style="flex:1"><button class="btn small" id="mfGo">Vai</button></div></div></div>`;
    if(typeof bindGo==='function')bindGo();const g=app.querySelector('#mfGo');if(g)g.onclick=async()=>{const q=app.querySelector('#mfQ').value.trim();if(!q)return;g.disabled=true;try{S.zone=await analyzeZone(q);renderMappa();}catch(e){toast('Indirizzo non trovato');g.disabled=false;}};return;}
  app.innerHTML=`<div class="mapfull"><div id="mfMap"></div><div class="mfchips">${MF.map(([k,i,l])=>`<button data-mf="${k}" class="${S.mf[k]?'on':''}">${i} ${l}</button>`).join('')}</div><button class="mfmore" data-mfmore aria-label="Altro">⋯</button><div class="mfbar lm-orda"><span>🧟 Prossima orda tra <b data-oleft>${typeof orLeft==='function'?orLeft((OR.s&&OR.s.next_at)||vNextSlot()):'…'}</b></span><button data-mfraid>▶ Rivedi l’assalto</button></div></div>`;
  const wrap=app.querySelector('.mapfull');const fit=()=>{try{const nav=$('#nav');const top=wrap.getBoundingClientRect().top;wrap.style.height=Math.max(320,innerHeight-top-(nav?nav.offsetHeight:64))+'px';}catch(e){}};fit();
  window.addEventListener('resize',fit,{passive:true});
  const el=app.querySelector('#mfMap');
  liveMap(el,addr,{zoom:16}).then(lm=>{window.__mf=lm;mfApply();setTimeout(mfApply,1500);setTimeout(mfApply,4000);try{lm.map.on('moveend',()=>{if(window.__mf===lm)mfApply();});}catch(e){}}).catch(e=>console.warn('mappa',e));
  app.querySelectorAll('[data-mf]').forEach(b=>b.onclick=()=>{const k=b.dataset.mf;S.mf[k]=!S.mf[k];b.classList.toggle('on',S.mf[k]);mfApply();});
  app.querySelector('[data-mfmore]').onclick=mfMore;
  app.querySelector('[data-mfraid]').onclick=()=>{try{orPlay(window.__mf);}catch(e){}};}
function mfApply(){const lm=window.__mf;const box=app.querySelector('.mapfull');if(!box)return;const f=S.mf;
  box.classList.toggle('f-case-off',!f.case);box.classList.toggle('f-spons-off',!f.spons);box.classList.toggle('f-serv-off',!f.serv);box.classList.toggle('f-vac-off',!f.vac);box.classList.toggle('f-all-off',!f.all);
  if(!lm||!lm.map)return;
  /* Fase 9-0d: lontano da casa (oltre 3 km: un'altra città, Londra, New York…) attività e servizi pubblici si vedono sempre,
     perché lì non ci sono le attività della tua zona caricate a parte; vicino a casa vale il filtro "Servizi" */
  let lontano=false;try{const c=lm.map.getCenter();const h=lm.m||{};lontano=h.lat!=null&&trM(c.lat,c.lng,h.lat,h.lon)>3000;}catch(e){}
  box.classList.toggle('mf-lontano',lontano);
  try{if(lm.setLayer){lm.setLayer('spons',f.spons);lm.setLayer('biz',f.serv||lontano);lm.setLayer('pub',f.serv||lontano);}}catch(e){}
  if(f.vac&&!lm._vacDone){lm._vacDone=true;mfVacanza(lm);}}
async function mfVacanza(lm){try{const D=await zStruct(S.zone);const V=(D.items||[]).filter(x=>['hotel','bb','agri','camp','attr'].includes(x.g)).slice(0,60);
  V.forEach(x=>{const el=elDiv('lm-vac',`<b>${x.ic}</b><em>${esc((x.name||'').slice(0,18))}</em>`);el.addEventListener('click',e=>{e.stopPropagation();try{bizSheet({i:'v'+x.lat+x.lon,ic:x.ic,name:x.name,cat:x.cat,d:x.d,ll:[x.lat,x.lon],tel:x.tel||'',web:x.web||''},S.zone);}catch(err){}});
    new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([x.lon,x.lat]).addTo(lm.map);});}catch(e){}}
function mfMore(){const lm=window.__mf;const box=app.querySelector('.mapfull .lmap');const night=box&&box.classList.contains('night');
  openSheet('⋯ Mappa',`<div class="mfmenu">
    <button data-mm="mode">${night?'☀️ Giorno':'🌙 Notte'}</button><button data-mm="3d">🏙️ Vista 3D</button><button data-mm="10">🔭 Guarda 10 km</button><button data-mm="home">📍 Torna a casa mia</button>
    <button data-mm="raid">🧟 Rivedi l’ultimo assalto</button><button data-mm="zona">ℹ️ Vivere qui: la mia zona</button><button data-mm="comm">👥 Aree della community</button></div>
    <button class="btn wide" data-mm="cerca" style="margin-top:10px">🔎 Cerca un luogo nel mondo</button>`,card=>{
    const click=sel=>{const b=document.querySelector('.mapfull '+sel);if(b)b.click();};
    card.querySelectorAll('[data-mm]').forEach(b=>b.onclick=async()=>{const k=b.dataset.mm;
      if(k==='mode'){closeSheet();click('.lm-mode');return;}if(k==='3d'){closeSheet();click('.lm-3d');return;}if(k==='10'){closeSheet();click('.lm-10');return;}
      if(k==='home'){closeSheet();try{lm.map.flyTo({center:[lm.m.lon,lm.m.lat],zoom:16.5,pitch:0});}catch(e){}return;}
      if(k==='raid'){closeSheet();try{if(typeof orPlay==='function')orPlay(lm);}catch(e){}return;}
      if(k==='comm'){closeSheet();try{lm.setLayer('comm',!lm._commOn);lm._commOn=!lm._commOn;}catch(e){}return;}
      if(k==='zona'){mfZona();return;}
      if(k==='cerca'){cercaLuogo();return;}});});}
async function mfZona(){openSheet('ℹ️ Vivere qui','<p><span class="spin"></span> Raccolgo i servizi veri della zona…</p>',()=>{});
  try{const D=await zStruct(S.zone);const L=typeof stLive==='function'?stLive(S.zone,D):null;const near=k=>(D.items||[]).filter(x=>x.g===k).sort((a,b)=>a.d-b.d)[0];
    const ess=[['salute','💊','Farmacia o salute'],['spesa','🛒','Spesa'],['scuola','🏫','Scuola'],['servizi','🏦','Servizi'],['verde','🌳','Parco']].map(([k,i,l])=>{const x=near(k);return x?`<div class="ln2"><span>${i} ${l}: <b>${esc(x.name)}</b></span><span>${dist(x.d)}</span></div>`:'';}).join('');
    openSheet('ℹ️ Vivere qui',`${L?`<div class="vscore"><b>${L.score}</b><span>/100 vivibilità</span></div>${L.subs.map(([n,v])=>`<div class="ln2"><span>${esc(n)}</span><b>${v}</b></div>`).join('')}`:''}<h4 style="margin:10px 0 4px">L’essenziale più vicino</h4>${ess||'<p class="muted">Nessun dato per ora.</p>'}
      <p class="muted" style="font-size:12px;margin-top:10px">Accendi i filtri 🏥 Servizi e 🧳 Vacanza per vederli sulla mappa.</p>`);}catch(e){openSheet('ℹ️ Vivere qui','<p class="notice">Dati della zona non raggiungibili ora: riprova tra poco.</p>');}}

/* ---------------- 🧟 ORDA: Oggi · Impero · Difendi tu ---------------- */
G.ss=G.ss||'oggi';

/* ---------------- 👤 IO ---------------- */
function renderIo(){const u=S.user;const m=window.W&&W.m;const nick=u?(u.nick||(u.email||'').split('@')[0]):'';
  const row=(k,i,l,extra='')=>`<button class="iorow" data-io="${k}"><span>${i}</span><b>${l}</b>${extra}<i>›</i></button>`;
  app.innerHTML=`<div class="page dots">
   ${u?`<div class="panel night iohead"><div class="ioav">${esc((nick||'?')[0].toUpperCase())}</div><div><b class="disp" style="font-size:24px;color:var(--moon)">@${esc(nick)}</b>
     <small>Livello mondo ${m?m.wlevel:'…'} · 🧱 ${m?wNum(m.mattoni):'…'} · 💎 ${(typeof G!=='undefined'&&G.gems)||0}</small></div></div>`
     :`<div class="panel night"><b class="disp" style="font-size:24px;color:var(--moon)">👤 Entra nel mondo</b><p style="color:#fff;font-weight:400">Con l’account la tua casa è tua nel mondo vero, salvi i progressi su tutti i dispositivi e giochi con gli alleati.</p><button class="btn" data-io="login">Accedi o registrati</button></div>`}
   ${u?`<div class="panel"><b class="disp" style="font-size:20px">📨 Invita qualcuno</b><p style="font-weight:400;font-size:13.5px;margin:4px 0 8px">Vicino di casa o amico in Australia: chi entra con il tuo link e valuta la casa ti dà 🧱 150 e 💎 5 e diventa tuo alleato.</p><button class="btn" data-io="invita">📤 Invita</button></div>`:''}
   ${typeof shopHTML==='function'?shopHTML():''}
   <div class="panel iolist">
    ${row('tour','🧭','Giro guidato')}${row('rules','📖','Come si gioca e manuale')}${row('radio','📻','Radio Operatore')}
    ${u?row('vis','👥','Visibile sulla mappa',`<small>${S.pubOk?'sì':'no'}</small>`):''}${u?row('move','🚚','Ho cambiato casa'):''}
    ${row('sponsor','⭐','Gli sponsor e come diventarlo')}${row('contatti','✉️','Chi siamo e contatti')}
    <a class="iorow" href="privacy.html" target="_blank"><span>🔒</span><b>Privacy</b><i>›</i></a><a class="iorow" href="termini.html" target="_blank"><span>📄</span><b>Termini</b><i>›</i></a>
    ${u?row('logout','🚪','Esci dall’account'):''}${u?row('del','🗑','Elimina il mio account'):''}</div>
   <div id="ioAdm"></div></div>`;
  app.querySelectorAll('[data-io]').forEach(b=>b.onclick=()=>{const k=b.dataset.io;try{
    if(k==='login')loginSheet();else if(k==='invita')inviteSheet();else if(k==='tour'){go('orda');setTimeout(()=>{try{orTour(0);}catch(e){}},700);}
    else if(k==='rules')openRules(0);else if(k==='radio')go('radio');else if(k==='sponsor')go('sponsor');else if(k==='contatti')go('contatti');
    else if(k==='vis'){try{zTogglePublic();}catch(e){S.pubOk=!S.pubOk;}renderIo();}
    else if(k==='move'){try{moveSheet();}catch(e){go('valuta');}}
    else if(k==='logout'){if(confirm('Uscire dall’account?')){try{SB.auth.signOut();}catch(e){}S.user=null;location.reload();}}
    else if(k==='del'){try{deleteSheet();}catch(e){location.href='elimina-account.html';}}}catch(e){toast('Non disponibile ora');}});
  /* pannelli admin / negozio solo per chi li ha */
  (async()=>{try{if(!u)return;const box=app.querySelector('#ioAdm');if(!box)return;let h='';
    try{if(typeof zIsAdmin==='function'&&await zIsAdmin())h+='<a class="iorow" href="admin.html" target="_blank"><span>🛠️</span><b>Pannello admin INDZ</b><i>›</i></a>';}catch(e){}
    try{const{data}=await SB.from('sponsor_users').select('sponsor_id').eq('user_id',u.id).limit(1);if(data&&data.length)h+='<a class="iorow" href="negozio.html" target="_blank"><span>🏪</span><b>Pannello del mio negozio</b><i>›</i></a>';}catch(e){}
    if(h&&S.tab==='io')box.innerHTML=`<div class="panel iolist">${h}</div>`;}catch(e){}})();
  try{const d=app.querySelector('[data-dbl]');if(d)d.onclick=()=>{const s=OR.s;if(!s||G.gems<5||window.__dbl===s.prev_id)return;const c=30*(s.held||0)+10*((s.total||0)-(s.held||0));G.gems-=5;G.coins+=c;window.__dbl=s.prev_id;toast(`✨ Premio raddoppiato: +🧱 ${Math.max(1,Math.floor(c/5))}`);renderIo();};}catch(e){}}

/* la barra dell'orda in cima solo in Valuta (in Mappa c'è già quella sulla mappa) */
try{const _opb=orPutBanner;orPutBanner=function(){if(S.tab!=='valuta')return;return _opb();};}catch(e){}
/* il giro guidato segue le nuove schede */
try{if(typeof OT!=='undefined'&&Array.isArray(OT))OT.forEach(st=>{if(st&&st.sel&&/wpan|apan/.test(st.sel)){const t=st.tab;st.tab=()=>{G.ss='impero';if(t)t();else go('orda');};}if(st&&st.sel&&/opan|lpan|tmp/.test(st.sel)){const t=st.tab;st.tab=()=>{G.ss='oggi';if(t)t();else go('orda');};}});}catch(e){}
</script>
