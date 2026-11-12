<script>
/* =========================================================
   SUPERSTITI — UNA FUNZIONE PER OGNI COSA (Fase 4d)
   Prima: socPaint = base (p26) + 10 strati; socLine, playerSheet = base + 5 strati;
   renderSocial, socFetchTab, alHTML, alBind, ayRefresh, eqRankPaint, thrView, allySheet,
   inviteSheet = base + 1–3 strati. Ora: la base si chiama …Base nel modulo di origine e
   UNA funzione fa, nello stesso ordine, quello che facevano gli strati. Ogni pezzo che era
   uno strato sta in un blocco a sé (un "return" anticipato ferma solo quel pezzo, come prima).
   ========================================================= */
/* contenuto della linguetta: Rivali (p36) · Piazza (p27) · altre (p26); poi le aggiunte per linguetta */
function socPaint(){
  if(SOC.tab==='rivali'){(()=>{pzStop();
  const B=app.querySelector('#socBody');
  if(!B)return;
  if(!S.user){B.innerHTML='<div class="panel"><p>Accedi per vedere i rivali.</p><button class="btn" onclick="loginSheet()">Accedi</button></div>';return;}
  const m=window.W&&W.m;
  const L=SOC.riv;
  B.innerHTML=`<div class="panel rivhead"><b class="disp" style="font-size:22px">😈 Rivali</b><p style="font-weight:400;font-size:13.5px;margin:4px 0 6px">Qualche vicino ti sta antipatico? Fagli un dispetto prima della prossima orda. Ma attento: possono farlo anche a te.</p>
    <div class="hwal"><span>💎 ${(typeof G!=='undefined'&&G.gems)||0} gemme</span><span>🧱 ${m?wNum(m.mattoni):'…'} Mattoni</span></div>
    <details class="man" style="margin-top:6px"><summary>Regole</summary><div class="man-b"><p>• Niente dispetti agli alleati. • I giocatori 3 o più livelli sotto di te sono protetti. • Massimo 3 dispetti al giorno, uno per tipo per orda. • La vittima riceve una notifica e può difendersi chiedendo aiuto agli alleati (+5 per alleato). • Al massimo −25 di difesa per orda, qualunque cosa succeda.</p></div></details></div>
   <div class="panel">${L==null?'<p class="muted"><span class="spin"></span> Cerco i rivali alla tua portata…</p>':L.length?L.map(r=>`<div class="rivc"><div class="rivn"><span class="sav">${esc((r.nick||'?')[0].toUpperCase())}</span><div>${socNick(r.user_id,r.nick)}<small>livello ${r.wlevel}${r.dist_km!=null?' · '+wNum(r.dist_km)+' km':''}</small></div></div>
       <div class="rivb">${DISP.map(d=>`<button data-dv="${d[0]}" data-u="${r.user_id}" data-n="${esc(r.nick)}" ${d[0]==='orda'&&r.attacked?'disabled':''}><b>${d[1]}</b>${d[2]}<small>${d[5]==='gem'?'💎':'🧱'} ${d[4]}</small></button>`).join('')}</div></div>`).join(''):'<p class="muted">Nessun rivale alla tua portata: i giocatori molto più deboli sono protetti e gli alleati non si toccano.</p>'}</div>`;
  B.querySelectorAll('[data-dv]').forEach(b=>b.onclick=async()=>{b.disabled=true;await doDisp(b.dataset.u,b.dataset.n,b.dataset.dv);rivLoad();});})();}
  else{
    if(SOC.tab==='piazza'){(()=>{const B=app.querySelector('#socBody');
  if(!B)return;
  const n=(SOC.pend||[]).length+(SOC.per||[]).filter(f=>Date.now()-new Date(f.created_at).getTime()<86400000).length;
  const fresh=!B.querySelector('.pzwrap');
  if(fresh){B.innerHTML=pzHTML();pzBind();if(S.user)pzStart();}
  let nb=B.querySelector('.pznews');
  if(n&&S.user){if(!nb){B.insertAdjacentHTML('afterbegin','<button class="pznews" data-pznews></button>');nb=B.querySelector('.pznews');nb.onclick=()=>{SOC.tab='bacheca';renderSocial();};}nb.textContent=`📬 Hai ${n} ${n===1?'novità':'novità'} per te${(SOC.pend||[]).length?' · '+SOC.pend.length+(SOC.pend.length===1?' proposta':' proposte')+' di alleanza':''} →`;}else if(nb)nb.remove();})();}else{pzStop();socPaintBase();}
    (()=>{try{if(SOC.tab!=='squadra'||!S.user)return;const B=app.querySelector('#socBody');if(!B||B.querySelector('.apan'))return;
  const h=alHTML();if(h){B.insertAdjacentHTML('beforeend',h);alBind();alLoad();}}catch(e){console.warn('squadra',e);}})();  /* Squadra: alleati e rivali (p32) */
    (()=>{try{if(SOC.tab==='squadra'){const B=app.querySelector('#socBody');const h=[...B.querySelectorAll('.apan h4.ah')].find(x=>/Rivali/.test(x.textContent));
      if(h&&!B.querySelector('.rivlink')){let n=h.nextElementSibling;while(n&&!(n.tagName==='H4'||n.matches('button[data-ainv]'))){const nx=n.nextElementSibling;n.remove();n=nx;}h.outerHTML='<button class="btn ghost small rivlink" data-gorv>😈 I rivali hanno una sezione tutta loro →</button>';const g=B.querySelector('[data-gorv]');if(g)g.onclick=()=>{SOC.tab='rivali';renderSocial();};}}}catch(e){}})();  /* Squadra: i rivali hanno una sezione loro (p36) */
  }
  (()=>{try{if(SOC.tab==='rivali'&&Array.isArray(SOC.riv)){
  app.querySelectorAll('.rivc').forEach((c,i)=>{const r=SOC.riv[i];if(!r||!r.shield)return;c.querySelectorAll('[data-dv]').forEach(b=>b.disabled=true);const n=c.querySelector('.rivn small');if(n&&!/scudo/.test(n.textContent))n.insertAdjacentHTML('beforeend',' · 🛡️ nuovo arrivato, protetto');});
  eqPaint();if(!EQ.s)eqLoad();}}catch(e){}
  try{if(SOC.tab!=='classifiche')return;const seg=app.querySelector('#socBody .schips');if(!seg||seg.querySelector('[data-rs=lega]'))return;
    seg.insertAdjacentHTML('afterbegin',`<button data-rs="lega" class="${SOC.rs==='lega'?'on':''}">🏅 La mia lega</button>`);
    seg.querySelector('[data-rs=lega]').onclick=()=>{SOC.rs='lega';socPaint();eqRank();};
    if(SOC.rs==='lega'){seg.querySelectorAll('[data-rs]').forEach(b=>b.classList.toggle('on',b.dataset.rs==='lega'));eqRankPaint();}}catch(e){}})();  /* Rivali: chi ha lo scudo è protetto (p37) */
  (()=>{try{if(SOC.tab!=='squadra'||!S.user)return;const B=app.querySelector('#socBody');if(!B)return;
  if(!B.querySelector('.tbpan'))B.insertAdjacentHTML('afterbegin',`<div class="panel tbpan"><b class="disp" style="font-size:22px">🛡️ Bonus di squadra</b><p style="font-weight:400;font-size:12.5px;margin:2px 0 8px">Per la prossima orda. Gli alleati e i coinquilini non possono mandarsi orde né dispetti.</p><div class="tbbox">${tbHTML()}</div>
    <details class="man"><summary>Come funzionano le alleanze</summary><div class="man-b"><p>• <b>Rinforzi</b>: +5 per ogni alleato che ti aiuta (max +20), gratis.<br>• <b>Scudo</b>: 20 💎, +5 a un alleato (max 2 scudi).<br>• <b>Difesa di squadra</b>: se almeno 3 tuoi alleati preparano le case, +5 a te.<br>• <b>Coinquilini</b>: chi abita nel tuo stesso edificio è alleato automatico; +3 per ognuno che prepara le case (max +9).<br>• <b>Doni</b>: Mattoni (anche in prestito), gemme, giri di ruota, biglietti.</p></div></details></div>`);
  try{ayRefresh();}catch(e){}try{ayLoad();}catch(e){}tbDecorate();
  tbLoad();}catch(e){}})();  /* Squadra: bonus di squadra (p43) */
  (()=>{try{if(SOC.tab!=='squadra'||!S.user)return;const B=app.querySelector('#socBody');if(!B||B.querySelector('.afpan'))return;
  const anchor=B.querySelector('.tbpan');const html=`<div class="panel afpan"><b class="disp" style="font-size:22px">➕ Aggiungi alla squadra</b><p style="font-weight:400;font-size:12.5px;margin:2px 0 8px">Cerca un superstite e proponigli l’alleanza. Diventate alleati anche se vi aiutate in un’orda, se vi invitate o se abitate nello stesso palazzo.</p>
    <div class="afsearch"><input class="field" id="afQ" placeholder="Nome del superstite (almeno 2 lettere)" value="${esc(AF.q)}" autocomplete="off"><button class="btn small" data-afinv>📨 Invita</button></div><div class="afbox"></div></div>`;
  if(anchor)anchor.insertAdjacentHTML('afterend',html);else B.insertAdjacentHTML('afterbegin',html);
  const q=B.querySelector('#afQ');let t=0;q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>afSearch(q.value),350);};B.querySelector('[data-afinv]').onclick=()=>inviteSheet();
  if(!SOC.riv)rivLoad().then(afPaint).catch(()=>{});afPaint();}catch(e){}})();  /* Squadra: aggiungi alla squadra (p45) */
  (()=>{try{if(SOC.tab!=='rivali')return;app.querySelectorAll('.rivc').forEach((c,i)=>{const r=(SOC.riv||[])[i];if(!r||c.querySelector('[data-rally]'))return;const n=c.querySelector('.rivn');if(!n)return;
  n.insertAdjacentHTML('beforeend',`<button class="btn small ghost rally" data-rally="${r.user_id}">🤝 Alleanza</button>`);n.querySelector('[data-rally]').onclick=e=>allyAsk(r.user_id,r.nick,e.currentTarget);});}catch(e){}})();  /* Rivali: proponi alleanza (p45) */
  (()=>{try{if(SOC.tab!=='squadra'||!S.user)return;const B=app.querySelector('#socBody');if(!B||B.querySelector('.alspan'))return;
  const html=`<div class="panel alspan"><b class="disp" style="font-size:22px">📋 I tuoi alleati alla prossima orda</b><p style="font-weight:400;font-size:12.5px;margin:2px 0 8px">In alto chi rischia di più. Tocca un alleato per vedere la simulazione delle sue case.</p><div class="alsbox">${alsHTML(ALS.L,false)}</div></div>`;
  const tb=B.querySelector('.tbpan');if(tb)tb.insertAdjacentHTML('beforebegin',html);else B.insertAdjacentHTML('afterbegin',html);
  const ayb=B.querySelector('.ayb');if(ayb)ayb.hidden=true;alsLoad(true).then(alsRefresh);}catch(e){}})();  /* Squadra: alleati alla prossima orda (p48) */
  (()=>{try{if(SOC.tab!=='piazza'||!S.user)return;const w=app.querySelector('#socBody .pzwrap .schips');if(!w||w.querySelector('[data-pzdm]'))return;
  w.insertAdjacentHTML('beforeend','<button data-pzdm>✉️ Privati</button>');w.querySelector('[data-pzdm]').onclick=dmThreads;dmBadge();}catch(e){}})();  /* Piazza: messaggi privati (p49) */
  (()=>{scDecorate();})();  /* Classifiche: Punteggio Superstite (p60) */
}
/* dati da caricare per la linguetta: Rivali (p36) · Piazza (p27) · altre (p26) */
function socFetchTab(){if(SOC.tab==='rivali'){if(S.user){socLoad('per');rivLoad();}return;}if(SOC.tab==='piazza'){if(S.user)socLoad('per');return;}return socFetchTabBase();}
/* una riga della bacheca: ogni tipo di evento ha la sua (p55 casa, p49 messaggi, p43 scudo, p36 dispetti, p33 aiuto) */
function socLine(f){
  if(f.kind==='house_req'||f.kind==='house_ok'){return (()=>{const a=socNick(f.actor,f.actor_nick);
  const toMe=S.user&&f.target===S.user.id;
  return`<div class="sitem"><span class="sic">🏠</span><div class="stx">${a} ${f.kind==='house_req'?(toMe?'dice che vivete nella stessa casa':'ha chiesto di vivere insieme'):(toMe?'ora vive con te: casa condivisa':'ora vive insieme a un superstite')}<small>${socAgo(f.created_at)}</small></div>${toMe&&f.kind==='house_req'?'<button class="btn small" data-hkopen>Rispondi</button>':''}</div>`;})();}
  if(f.kind==='dm'){return (()=>{const a=socNick(f.actor,f.actor_nick);
  const toMe=S.user&&f.target===S.user.id;
  return`<div class="sitem"><span class="sic">✉️</span><div class="stx">${a} ${toMe?'ti ha scritto':'ha scritto'}${f.info?`: «${esc(f.info)}»`:''}<small>${socAgo(f.created_at)}</small></div>${toMe?`<button class="btn small" data-dmr="${esc(f.actor)}" data-n="${esc(f.actor_nick||'')}">Rispondi</button>`:''}</div>`;})();}
  if(f.kind==='shield'){return (()=>{const a=socNick(f.actor,f.actor_nick),t=f.target?socNick(f.target,f.target_nick):'';
  return`<div class="sitem"><span class="sic">🛡️</span><div class="stx">${a} ha dato uno scudo a ${t}: +5 alla prossima orda<small>${socAgo(f.created_at)}</small></div></div>`;})();}
  if(f.kind==='curse'){return (()=>{const a=socNick(f.actor,f.actor_nick),t=f.target?socNick(f.target,f.target_nick):'';
  const d=DISP.find(x=>x[0]===f.info)||DISP[1];
  const toMe=S.user&&f.target===S.user.id;
  return`<div class="sitem"><span class="sic">${d[1]}</span><div class="stx">${a} ha fatto un dispetto a ${t}: ${d[2].toLowerCase()} (${d[3]})<small>${socAgo(f.created_at)}</small></div>${toMe?'<button class="btn small" data-askh>🆘 Chiedi aiuto</button>':''}</div>`;})();}
  if(f.kind==='ask_ally'){return (()=>{const a=socNick(f.actor,f.actor_nick);
  return`<div class="sitem"><span class="sic">🆘</span><div class="stx">${a} chiede il tuo aiuto per la prossima orda<small>${socAgo(f.created_at)}</small></div><button class="btn small" data-shelp="${esc(f.actor)}">Manda rinforzi</button></div>`;})();}
  return socLineBase(f);}
/* scheda di un giocatore: base (p26) + dispetti (p36) + scudo (p43) + alleanza (p45) + simulazione dell'alleato (p48) + messaggio privato (p49) */
async function playerSheet(uid){await playerSheetBase(uid);
  await (async()=>{try{const c=document.querySelector('#sheet.open .placts');if(!c||c.querySelector('[data-pdv]'))return;
  const nick=(document.querySelector('#sheet.open .plhead .disp')||{}).textContent||'';if(/Siete alleati|Questo sei tu/.test(document.querySelector('#sheet.open').textContent))return;if(/protetto/.test(c.textContent))return;
  c.insertAdjacentHTML('beforeend',`<div class="rivb">${DISP.slice(1).map(d=>`<button data-pdv="${d[0]}"><b>${d[1]}</b>${d[2]}<small>💎 ${d[4]}</small></button>`).join('')}</div>`);
  c.querySelectorAll('[data-pdv]').forEach(b=>b.onclick=()=>doDisp(uid,nick.replace('@',''),b.dataset.pdv));}catch(e){}})();
  await (async()=>{try{const c=document.querySelector('#sheet.open');if(!c||c.querySelector('[data-pshield]'))return;if(!/Siete alleati|alleat/i.test(c.textContent)||/Questo sei tu/.test(c.textContent))return;
  const ac=c.querySelector('.placts');const nick=((c.querySelector('.plhead .disp')||{}).textContent||'').replace('@','');if(!ac)return;
  ac.insertAdjacentHTML('afterbegin',`<button class="btn small" data-pshield>🛡️ Scudo +5 (💎 20)</button>`);ac.querySelector('[data-pshield]').onclick=()=>allyShield(uid,nick);}catch(e){}})();
  await (async()=>{try{const c=document.querySelector('#sheet.open .sheet-b');if(!c)return;
  const sp=[...c.querySelectorAll('span.muted')].find(s=>/Proposta inviata/.test(s.textContent));if(!sp)return;
  sp.outerHTML=`<div class="alwait"><b>⏳ Proposta di alleanza inviata</b><small>Diventerete alleati quando accetta. Intanto puoi ricordarglielo o aiutarlo in un’orda: chi si aiuta diventa alleato da solo.</small><button class="btn small" data-alnudge>📣 Ricordaglielo</button></div>`;
  c.querySelector('[data-alnudge]').onclick=e=>allyNudge(uid,e.currentTarget);}catch(e){}})();
  await (async()=>{try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('[data-alsim]'))return;
  if(!/Siete alleati/.test(c.textContent))return;const ac=c.querySelector('.placts')||c;ac.insertAdjacentHTML('afterbegin','<button class="btn small" data-alsim>🔍 Vedi la sua simulazione</button>');
  c.querySelector('[data-alsim]').onclick=()=>allySheet(uid);}catch(e){}})();
  await (async()=>{try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('[data-pdm]')||/Questo sei tu/.test(c.textContent))return;if(S.user&&uid===S.user.id)return;
  const nick=((c.querySelector('.plhead .disp')||{}).textContent||'').replace('@','');const ac=c.querySelector('.placts')||c;ac.insertAdjacentHTML('afterbegin',`<button class="btn small" data-pdm>💬 Scrivi</button>`);
  c.querySelector('[data-pdm]').onclick=()=>dmSheet(uid,nick);}catch(e){}})();
  await (async()=>{try{const p=window.PLX;const c=document.querySelector('#sheet.open .sheet-b');if(!p||p.me||p.user_id!==uid||!c||c.querySelector('.plmz')||p.dist_km==null)return;
    c.querySelector('.plhead').insertAdjacentHTML('afterend',mzRigaHTML(p));}catch(e){}})();
  /* ⭐ preferito anche se non è alleato (p72, migrazione 010) */
  await (async()=>{try{if(typeof trFavDecorate==='function')await trFavDecorate(uid);}catch(e){}})();}
/* pagina Superstiti: base (p26) + Piazza (p27) + Rivali (p36) + "Alleati" (p48) */
function renderSocial(){renderSocialBase();
  (()=>{try{const seg=app.querySelector('.sseg');if(seg&&!seg.querySelector('[data-st=piazza]')){
    seg.insertAdjacentHTML('afterbegin','<button data-st="piazza">💬 Piazza</button>');seg.classList.add('four');
    seg.querySelectorAll('[data-st]').forEach(b=>{b.classList.toggle('on',b.dataset.st===SOC.tab);b.onclick=()=>{SOC.tab=b.dataset.st;seg.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b));socPaint();socFetchTab();};});}
  if(!S.user){const h=app.querySelector('.shead');if(h&&!app.querySelector('.nolog'))h.insertAdjacentHTML('afterend',`<div class="panel nolog"><b>🔒 Non sei collegato in questa app</b>${pzSafariNote()}<button class="btn" onclick="loginSheet()">Accedi</button></div>`);}}catch(e){}
  socPaint();})();
  (()=>{try{const seg=app.querySelector('.sseg');if(seg&&!seg.querySelector('[data-st=rivali]')){
    const sq=seg.querySelector('[data-st=squadra]');(sq||seg.lastElementChild).insertAdjacentHTML('afterend','<button data-st="rivali">😈 Rivali</button>');seg.classList.remove('four');seg.classList.add('five');
    const cl=seg.querySelector('[data-st=classifiche]');if(cl)cl.innerHTML='🏆 Classifica';
    seg.querySelectorAll('[data-st]').forEach(b=>{b.classList.toggle('on',b.dataset.st===SOC.tab);b.onclick=()=>{SOC.tab=b.dataset.st;seg.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b));socPaint();socFetchTab();};});}}catch(e){}})();
  (()=>{try{const b=app.querySelector('.sseg [data-st=squadra]');if(b)b.innerHTML='🤝 Alleati';}catch(e){}})();
  /* 🔎 Trova superstiti (p72): vicino a una mia casa, per nome, ⭐ preferiti */
  (()=>{try{if(typeof trovaBtn==='function')trovaBtn();}catch(e){}})();}
/* alleati in Squadra: base (p23) + regali e prestiti (p24) */
function alHTML(){const h=alHTMLBase();return h?h.replace('<button class="btn ghost small" data-ainv',ayHTML()+'<button class="btn ghost small" data-ainv'):h;}
function alBind(){alBindBase();ayBind();ayLoad();}
function ayRefresh(){ayRefreshBase();tbDecorate();}
/* classifiche (p37) + Punteggio Superstite (p60) */
function eqRankPaint(){eqRankPaintBase();scDecorate();}
/* simulazione di un alleato (p48) con gli zombie cliccabili (p60) */
function thrView(T){const h=thrViewBase(T);
  if(!window.__azT)return h;
  const i=window.__azT.push(T)-1;
  return h.replace(/<div class="thrw"><span>🧟 Vaganti/,`<div class="thrw azk" data-azk="walker" data-azt="${i}"><span>🧟 Vaganti`).replace(/<div class="thrw"><span>(\S+) ([^<]+)<small>difesa:/g,(m,ic,n)=>{const k=Object.keys(ZSP).find(x=>ZSP[x].n===n.trim());return k?`<div class="thrw azk" data-azk="${k}" data-azt="${i}"><span>${ic} ${n}<small>difesa:`:m;});}
async function allySheet(uid){window.__azT=[];window.__azU=uid;const r=await allySheetBase(uid);return r;}
/* inviti (p20) + nota del Padrino (p37/p45) */
function inviteSheet(){const r=inviteSheetBase.apply(this,arguments);[0,300,900].forEach(t=>setTimeout(eqPad,t));
  /* chi non risulta invitato da nessuno può collegarsi a chi gli ha mandato il link (Fase 10: il collegamento si perdeva installando l'app) */
  Promise.resolve(r).then(async()=>{let mio=null;try{mio=await invMio();}catch(e){}if(mio)return;
    /* la finestra si ridisegna nel primo secondo (eqPad): il pulsante si rimette se manca */
    const put=()=>{const c=document.querySelector('#sheet.open .card')||document.querySelector('#sheet.open');if(!c||!/Invita amici/.test(c.textContent)||c.querySelector('[data-invme]'))return;
      c.insertAdjacentHTML('beforeend','<button class="btn ghost wide" data-invme style="margin-top:10px">🤝 Ti ha invitato qualcuno? Collegati a lui</button>');
      c.querySelector('[data-invme]').onclick=()=>{window.SHEET_BACK={t:'‹ Invita',fn:inviteSheet};invCollega();};};[0,350,1000,1600].forEach(t=>setTimeout(put,t));});
  return r;}
</script>
