<script>
/* =========================================================
   COMUNE — UNA FUNZIONE PER OGNI COSA (Fase 4f-1)
   Navigazione (go: base p4 + 8 strati), accesso (onLogin: base p17 + 4), case del mondo
   (wMine: base p21 + 4), salvataggi (saveLocal, pushCloud, snapshot, restore), finestre
   (openSheet, closeSheet), analisi della zona (analyzeZone: base p2 + 5). La base si chiama
   …Base nel modulo di origine; UNA funzione fa, nello stesso ordine, quello che facevano gli strati.
   ========================================================= */
/* cambio scheda: Casa (p31) · Superstiti (p26) · Io (p25) · le altre (p4) con il banner dell'orda (p22);
   la regia degli assalti si ferma uscendo dalla Mappa (p29); poi disegni della casa (p41, p49) e Mattoni (p52) */
function go(tab){
  if(tab==='casa'&&casasOk()){casasSheet();return;}
  if(tab==='casa'){(()=>{window.__last='apre la mia casa';
  document.body.classList.remove('inbattle');
  if(typeof G!=='undefined'&&G.run){G.run.stop=true;G.run=null;}
  S.tab='casa';
  renderNav();
  window.scrollTo(0,0);
  try{closeSheet();}catch(e){}
  renderCasaDash();
  try{const top=app.querySelector('.page');if(top&&!app.querySelector('.cback'))top.insertAdjacentHTML('afterbegin','<button class="cback" data-cback>‹ Torna alla home</button>');const b=app.querySelector('[data-cback]');if(b)b.onclick=()=>go('home');}catch(e){}})();}
  else{
    if(tab!=='mappa')REG.active=false;
    if(tab==='social'){(()=>{window.__last='apre superstiti';
  document.body.classList.remove('inbattle');
  if(typeof G!=='undefined'&&G.run){G.run.stop=true;G.run=null;}
  S.tab='social';
  renderNav();
  window.scrollTo(0,0);
  try{setMusic('app');}catch(e){}
  try{closeSheet();}catch(e){}
  renderSocial();})();}
    else if(tab==='io'){(()=>{window.__last='apre io';
  document.body.classList.remove('inbattle');
  if(typeof G!=='undefined'&&G.run){G.run.stop=true;G.run=null;}
  S.tab='io';
  renderNav();
  window.scrollTo(0,0);
  try{setMusic('app');}catch(e){}
  try{closeSheet();}catch(e){}
  renderIo();})();}
    else{goBase(tab);orPutBanner();}
  }
  if(tab==='casa')setTimeout(casaTop,30);
  if(tab==='casa')setTimeout(()=>{casaTop().then(()=>setTimeout(casaAll,200)).catch(()=>casaAll());},60);
  setTimeout(()=>coinText(),400);}
/* accesso: account diverso sullo stesso telefono → dati vecchi cancellati (p54); poi accesso (p17),
   profilo e superstiti (p20), mondo e premi (p21), barra e Superstiti (p27) */
async function onLogin(u,fresh){
  try{const prev=localStorage.getItem(OWN_K);
  if(prev&&u&&prev!==u.id){zWipeLocal();localStorage.setItem(OWN_K,u.id);sessionStorage.setItem('zsh_switched','1');location.reload();return;}
  if(u)localStorage.setItem(OWN_K,u.id);}catch(e){}
  const r=await onLoginBase(u,fresh);
  window.ZADMIN=null;zSyncProfile();zLoadUsers();
  setTimeout(async()=>{await wMine();await wEarn('login');await wEarn('verifica');wClaim(false);},1500);
  try{renderNav();if(S.tab==='social')renderSocial();}catch(e){}
  return r;}
/* le mie case dal server (p21) → doni ricevuti (p24) → kit e leghe (p37) → difesa e prossimo passo (p44) → Mattoni in attesa (p52) */
async function wMine(silent){const r=await wMineBase(silent);
  ayInbox();
  try{if(S.user){eqWelcome();eqLoad();}}catch(e){}
  try{rsSync();await defLoad(true);coPut();if(S.tab==='orda'&&FR.node)frHeader();}catch(e){}
  try{if(S.user&&!wMine.__fl){wMine.__fl=1;setTimeout(()=>{matFlush();coinSweep();},500);}}catch(e){}
  return r;}
/* salvataggi: mai durante il cambio account (p54) */
function saveLocal(){if(window.__noSave)return;return saveLocalBase.apply(this,arguments);}
async function pushCloud(){if(window.__noSave)return;return pushCloudBase.apply(this,arguments);}
/* fotografia dei dati (p17) + visibilità sulla mappa (p20) + case passate (p20) */
function snapshot(){const d=snapshotBase();if(d&&d.S)d.S.pubOk=S.pubOk;if(d&&d.S)d.S.case=S.case||[];return d;}
function restore(d){const r=restoreBase(d);try{if(d&&d.S&&d.S.pubOk!=null)S.pubOk=d.S.pubOk;}catch(e){}try{if(d&&d.S&&d.S.case)S.case=d.S.case;}catch(e){}return r;}
/* finestre: base (p5) + pulizia (p45) + Mattoni al posto delle monete (p52); chiusura + pulizia (p45) + pagina intera (p53) */
function openSheet(){const r=openSheetBase.apply(this,arguments);setTimeout(sheetClean,80);setTimeout(()=>coinText(),60);return r;}
function closeSheet(){const r=closeSheetBase.apply(this,arguments);sheetClean();try{document.getElementById('sheet').classList.remove('hfull');}catch(e){}return r;}
/* analisi della zona: base (p2) → territorio vero (p20) → tipo e piani della casa (p20) → profilo (p20) → trasloco (p20) → casa nel mondo (p21) */
async function analyzeZone(address){let z=await analyzeZoneBase(address);
  z=await (async()=>{const base=z;if(!navigator.onLine)return base;try{const R=await terrFetch(address);return terrApply(base,R);}catch(e){console.warn('territorio vero',e);return base;}})();
  try{const H=z&&z.real&&z.real.house;if(H&&S.answers){S.aiFilled=S.aiFilled||{};
    const t={villa:'villa',bifamiliare:'bifam',schiera:'schiera',casale:'cascina'}[H.kind];if(t&&!S.answers.tipo){S.answers.tipo=t;S.aiFilled.tipo=true;}
    if(H.kind!=='apt'&&!S.answers.piani){S.answers.piani=H.levels>=3?'3':String(H.levels);S.aiFilled.piani=true;}}}catch(e){}
  setTimeout(()=>zSyncProfile(true),500);
  if(S.moving)setTimeout(()=>{S.moving=0;},0);
  setTimeout(()=>{if(S.user)wClaim(true);},1200);
  return z;}
</script>
