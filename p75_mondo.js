<script>
/* =========================================================
   🌍 MONDO (Fase 13a, scelta di Alessandro 12/11): Mappa e Orda in una sola scheda
   - barra in basso: 🏠 Home · 🌍 Mondo · 👥 Superstiti (renderNavBase in p26; la pagina Orda accende "Mondo": NAV_ACT.orda)
   - in cima a Mappa e Orda: barra dell'orda (quanto manca, % della casa vera, 🛡️ Prepara) + linguette 🗺️ Mappa · 🧟 Orda · 📷 Lente
   - Mappa: pulsanti tondi a destra (🔎 Cerca, 🚩 Presidi, 🤝 Alleati, ⭐ Sponsor, ⋯ Altro) e il cassetto dal basso:
     chiuso = le tue case con la %, Riscatta, alleati; aperto = l'orda (Prepara/Fortifica/Riscatta), alleati, fortuna, missioni
   - linguetta Orda = la pagina Orda di prima (fronte e tutto il resto), con la stessa barra in cima
   Chiamate: mwMappa() da renderMappa (p65), mwOrda(pg) da renderHub (p63).
   ========================================================= */
const MW={open:false};
function mwPct(){try{const h=myHouses().find(x=>x.home);return h?frChanceOf(h):null;}catch(e){return null;}}
function mwTopHTML(mode){const s=OR.s||{};const next=s.next_at||vNextSlot();const pc=mwPct();const pr=!!s.prepared;
  return`<div class="mwtop"><div class="mwbar"><span class="mwz">🧟</span><div class="mwt"><b>Orda tra <span data-oleft>${orLeft(next)}</span></b><small>${pr?'✅ Case preparate: +15':'Prepara: +15 di difesa'}</small></div>
    ${pc!=null?`<span class="mwpc ${chCls(pc)}">${pc}%</span>`:''}<button class="mwprep" data-mwprep ${pr||!S.user?'disabled':''}>🛡️ ${pr?'Pronte':'Prepara'}</button></div>
    <div class="mwmodes"><button data-mwm="mappa" class="${mode==='mappa'?'on':''}">🗺️ Mappa</button><button data-mwm="orda" class="${mode==='orda'?'on':''}">🧟 Orda</button><button data-mwm="social" class="${mode==='social'?'on':''}">👥 Superstiti</button></div></div>`;}
function mwTopBind(root){const pr=root.querySelector('[data-mwprep]');if(pr)pr.onclick=async()=>{if(!S.user){loginSheet();return;}pr.disabled=true;
    try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+((data&&data.msg)||'Case preparate: +15 difesa'));}catch(e){toast('Non riuscito');pr.disabled=false;}
    try{await orLoad(true);}catch(e){}mwRefresh();};
  root.querySelectorAll('[data-mwm]').forEach(b=>b.onclick=()=>{const m=b.dataset.mwm;if(m==='lente'){try{lenteOpen();}catch(e){}return;}if(m==='orda'&&S.tab!=='orda')go('orda');else if(m==='social'&&S.tab!=='social')go('social');else if(m==='mappa'&&S.tab!=='mappa'){S.zv='mondo';go('mappa');}});}
function mwRefresh(){const t=app.querySelector('.mwtop');if(!t)return;const mode=S.tab==='orda'?'orda':S.tab==='social'?'social':'mappa';t.outerHTML=mwTopHTML(mode);const n=app.querySelector('.mwtop');if(n)mwTopBind(n);
  if(S.tab==='mappa'){const d=app.querySelector('.mwdrawer');if(d&&!MW.open)mwDrawerPaint(d);}}
/* ---- Mappa ---- */
function mwMappa(){const w=app.querySelector('.mapfull');if(!w||w.querySelector('.mwtop'))return;w.classList.add('mw');
  w.insertAdjacentHTML('afterbegin',mwTopHTML('mappa'));mwTopBind(w);
  const sp=Object.values(window.SP_GEO||{}).filter(g=>g&&g.lat!=null).length;
  w.insertAdjacentHTML('beforeend',`<div class="mwside"><button data-mws="cerca">🔎<small>Cerca</small></button><button data-mws="pres">🚩<small>Presidi</small></button>${S.user?'<button data-mws="ally">🤝<small>Alleati</small></button>':''}<button data-mws="spons">⭐<small>${sp||''} Sponsor</small></button><button data-mws="more">⋯<small>Altro</small></button></div>
    <div class="mwdrawer"></div>`);
  w.querySelectorAll('[data-mws]').forEach(b=>b.onclick=()=>{const k=b.dataset.mws;if(k==='cerca')cercaLuogo();else if(k==='pres')presList(window.__mf);else if(k==='ally')alPick();else if(k==='spons')spList(window.__mf);else mfMore();});
  MW.open=false;mwDrawerPaint(w.querySelector('.mwdrawer'));
  if(S.user&&!OR.s)try{orLoad().then(mwRefresh);}catch(e){}}
function mwDrawerPaint(d){const H=(()=>{try{return myHouses();}catch(e){return[];}})();const s=OR.s||{};
  const claim=S.user&&s.total>0&&!s.claimed;const nal=(typeof ALS!=='undefined'&&ALS.L)?ALS.L.length:null;
  const chips=H.map((h,i)=>{let c=null;try{c=frChanceOf(h);}catch(e){}return`<button class="mwchip" data-mwh="${i}">${h.home?'❤️':'🔑'} ${esc(h.home?'Casa tua':h.label)}${c!=null?` <b class="${chCls(c)}">${c}%</b>`:''}</button>`;}).join('')
    +(claim?`<button class="mwchip hot" data-mwc>🎁 Riscatta</button>`:'')+(S.user?`<button class="mwchip" data-mwa>🤝 ${nal!=null?nal+' ':''}alleati</button>`:'');
  d.classList.toggle('open',MW.open);
  d.innerHTML=`<button class="mwgrip" data-mwg aria-label="${MW.open?'Chiudi':'Apri'} il cassetto"><span></span></button>
    <div class="mwdh" data-mwg><b>${MW.open?'🧟 La tua orda':'🧟 Orda · 🏠 Le tue case'}</b><i>${MW.open?'▼':'▲'}</i></div>
    <div class="mwchips">${chips||'<small class="muted">Valuta la casa per entrare nel mondo</small>'}</div>
    ${MW.open?'<div class="mwbody"></div>':''}`;
  document.body.classList.toggle('mwopen',MW.open);
  d.querySelectorAll('[data-mwg]').forEach(x=>x.onclick=()=>{MW.open=!MW.open;mwDrawerPaint(d);});
  d.querySelectorAll('[data-mwh]').forEach(x=>x.onclick=()=>{const h=myHouses()[+x.dataset.mwh];if(h){window.SHEET_BACK=null;houseSheet(h);}});
  const c=d.querySelector('[data-mwc]');if(c)c.onclick=()=>{MW.open=true;mwDrawerPaint(d);setTimeout(()=>{const x=d.querySelector('[data-ocl]');if(x)x.scrollIntoView({behavior:'smooth',block:'center'});},200);};
  const a=d.querySelector('[data-mwa]');if(a)a.onclick=()=>alPick();
  if(MW.open){const b=d.querySelector('.mwbody');
    try{b.insertAdjacentHTML('beforeend',orPanelHTML());orBind(b);}catch(e){}
    try{if(S.user){b.insertAdjacentHTML('beforeend','<div class="panel alsorda"><b class="disp" style="font-size:20px">🤝 I tuoi alleati</b><div class="alsbox cmp"></div></div>');const ab=b.querySelector('.alsbox');ab.innerHTML=alsHTML(ALS.L,true);alsBind(ab);if(!ALS.L)alsLoad().then(alsRefresh);}}catch(e){}
    try{b.insertAdjacentHTML('beforeend',luckTopHTML());luckTopBind();}catch(e){}
    try{const h=tmHTML();if(h){b.insertAdjacentHTML('beforeend',h);tmBind();}}catch(e){}}}
/* ---- Orda (modalità orda): stessa barra in cima ---- */
function mwOrda(pg){if(!pg||pg.querySelector('.mwtop'))return;pg.insertAdjacentHTML('afterbegin',mwTopHTML('orda'));mwTopBind(pg);}
/* la barra si aggiorna quando arrivano i dati dell'orda */
zEvery(()=>{try{if(document.hidden||!['mappa','orda','social'].includes(S.tab))return;const t=app.querySelector('.mwtop');if(!t)return;const pc=mwPct();const e=t.querySelector('.mwpc');
  if(pc!=null&&(!e||e.textContent!==pc+'%'))mwRefresh();}catch(e){}},3000,'mondo');
/* ---- Fase 15a: schermata unica per chi ha l'account e la casa valutata ---- */
function mwOk(){return !!(S.user&&S.result);}
/* Superstiti: stessa barra in cima */
function mwSocial(){if(!mwOk())return;const pg=app.querySelector('.page')||app.firstElementChild;if(!pg||pg.querySelector('.mwtop'))return;pg.insertAdjacentHTML('afterbegin',mwTopHTML('social'));mwTopBind(pg);}
/* niente barra in basso: si naviga con le linguette, la Lente e il menu ☰ (dove c'è la Home) */
function mwNoNav(){const on=mwOk();document.body.classList.toggle('nonav',on);
  if(on&&!document.querySelector('.mwlente')){document.body.insertAdjacentHTML('beforeend','<button class="mwlente" data-mwlente aria-label="Lente: guarda con la fotocamera"><span>📷</span><b>Lente</b></button>');
    document.querySelector('.mwlente').onclick=()=>{try{lenteOpen();}catch(e){}};}}
/* all'apertura dell'app: se hai account e casa valutata si va dritti al Mondo (non se hai scelto tu la Home dal menu) */
MW.t0=Date.now();
zEvery(()=>{try{mwNoNav();if(MW.auto||MW.userNav)return;if(Date.now()-MW.t0>20000){MW.auto=1;return;}
  if(mwOk()&&S.tab==='home'&&!document.querySelector('#sheet.open')&&!/[?&](go|assalto|invito)=/.test(location.search)){MW.auto=1;S.zv='mondo';go('mappa');}}catch(e){}},1000,'mondo-avvio');
</script>
