<script>
/* =========================================================
   🎬 REGIA DEGLI ASSALTI + 🔮 SIMULAZIONE + 🔔 NOTIFICHE
   - ultimo assalto o simulazione della prossima orda, casa per casa
     (anche le case lontane, fino in Australia)
   - notifiche push: 30 minuti prima, all'orda, novità personali
   ========================================================= */
window.REG={mode:'last',i:0,H:[],busy:false};
function regHouses(){const H=[];const m=window.W&&W.m;
  if(m&&m.home&&m.home.lat!=null)H.push({lat:m.home.lat,lon:m.home.lon,lv:1,home:true,label:'❤️ Casa tua'});
  else if(S.zone&&S.zone.real)H.push({lat:S.zone.real.lat,lon:S.zone.real.lon,lv:1,home:true,label:'❤️ Casa tua'});
  ((m&&m.houses)||[]).forEach((h,i)=>H.push({lat:h.lat,lon:h.lon,lv:h.level||1,home:false,bid:h.building_id,label:`🔑 Casa ${i+1}`}));return H;}
/* simulazione: stessa formula del server, con un'orda "possibile" */
function regSimRows(){const s=OR.s||{};const lvl=s.wlevel||((window.W&&W.m&&W.m.wlevel)||1);const bon=s.next_bonus!=null?s.next_bonus:(s.prepared?15:0);
  return REG.H.map(h=>{const atk=30+Math.floor(Math.random()*60)+4*Math.min(Math.max(lvl,1),30);const pw=45+12*Math.max(h.lv,1)+bon+(h.home?5:0);
    return{building_id:h.bid||('home'+h.lat),lat:h.lat,lon:h.lon,held:pw>=atk,kind:h.home?'home':'owned',mine:true,sim:{atk,pw}};});}
async function assaltoMappa(mode,i){REG.mode=mode||'last';REG.H=regHouses();REG.i=Math.max(0,Math.min(i||0,REG.H.length-1));REG.active=true;
  if(!OR.s&&S.user){try{await orLoad(true);}catch(e){}}
  if(S.tab!=='mappa')go('mappa');let n=0;const wait=()=>new Promise(r=>{const t=setInterval(()=>{const lm=window.__mf;n++;if((lm&&lm.map&&document.body.contains(lm.map.getContainer()))||n>50){clearInterval(t);r(lm);}},200);});
  const lm=await wait();if(!lm||!lm.map){toast('Mappa non pronta: riprova');return;}regBar(lm);regGo(lm);}
function regGo(lm){const h=REG.H[REG.i];if(!h){regText(lm,'Valuta la tua casa per vedere gli assalti.');return;}
  regText(lm,`${h.label} · ${REG.mode==='sim'?'simulazione in preparazione…':'l’orda arriva…'}`);
  try{lm.map.flyTo({center:[h.lon,h.lat],zoom:16.4,pitch:0,duration:1400});}catch(e){}
  setTimeout(async()=>{try{lm._playing=false;await orPlay(lm);const me=(REG.lastRows||[]).find(r=>r.mine&&Math.abs(r.lat-h.lat)<.0003&&Math.abs(r.lon-h.lon)<.0004);
      const bans=lm.map.getContainer().closest('.lmap').querySelectorAll('.oplay');const ban=bans[bans.length-1];if(ban&&REG.mode==='sim'){ban.querySelector('b').textContent='🔮 SIMULAZIONE (stima, non è l’orda vera)';ban.classList.add('sim');}
      setTimeout(()=>{let t;if(REG.mode==='sim'){t=me?(me.held?`🛡️ ${h.label}: in questa simulazione TIENE (difesa ${me.sim.pw} contro ${me.sim.atk}).`:`💥 ${h.label}: in questa simulazione CEDE (difesa ${me.sim.pw} contro ${me.sim.atk}). Prepara le case o potenziala!`):'';}
        else{const real=(OR.s&&OR.s.houses||[]).find(x=>Math.abs(x.lat-h.lat)<.0003&&Math.abs(x.lon-h.lon)<.0004);
          t=real?(real.held?`🛡️ ${h.label}: ha TENUTO all’orda delle ${orTime(OR.s.prev_at)}.`:`💥 ${h.label}: è stata SFONDATA all’orda delle ${orTime(OR.s.prev_at)}.`):`ℹ️ ${h.label} non era ancora nel mondo durante l’ultima orda: guarda la 🔮 simulazione.`;}
        regText(lm,t);},REG.mode==='sim'?6500:7000);}catch(e){regText(lm,'Assalto non disponibile ora.');}},1600);}
function regBar(lm){const box=lm.map.getContainer().closest('.mapfull')||lm.map.getContainer().closest('.lmap');if(!box)return;let b=box.querySelector('.regbar');if(b)b.remove();
  box.insertAdjacentHTML('beforeend',`<div class="regbar"><div class="regt"><b>${REG.mode==='sim'?'🔮 Simulazione':'🎬 Ultimo assalto'}</b><span class="regtx"></span></div>
    <div class="regbtn">${REG.H.length>1?'<button data-rg="prev">◀</button><span class="regn"></span><button data-rg="next">▶</button>':''}<button data-rg="again">⟳</button><button data-rg="mode">${REG.mode==='sim'?'🎬 Ultimo':'🔮 Simula'}</button><button data-rg="x">✕</button></div></div>`);
  b=box.querySelector('.regbar');b.querySelectorAll('[data-rg]').forEach(x=>x.onclick=e=>{e.stopPropagation();const k=x.dataset.rg;
    if(k==='x'){REG.active=false;b.remove();return;}if(k==='mode'){REG.mode=REG.mode==='sim'?'last':'sim';regBar(lm);regGo(lm);return;}
    if(k==='prev')REG.i=(REG.i-1+REG.H.length)%REG.H.length;if(k==='next')REG.i=(REG.i+1)%REG.H.length;regGo(lm);});}
function regText(lm,t){const b=document.querySelector('.regbar');if(!b)return;b.querySelector('.regtx').textContent=t;const n=b.querySelector('.regn');if(n)n.textContent=`${REG.i+1}/${REG.H.length}`;}
/* uscendo dalla mappa la regia si spegne */
/* ---- punti di accesso ben visibili ---- */
/* mappa: i pulsanti della barra dell'orda aprono la regia */
/* menu: due voci nuove */

/* ---------------- 🔔 NOTIFICHE PUSH ---------------- */
const pushOk=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const isStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}};
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const b64u=s=>{const p='='.repeat((4-s.length%4)%4);const r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)));};
async function pushState(){try{if(!pushOk())return isIOS()&&!isStandalone()?'home':'nosupport';if(Notification.permission==='denied')return'denied';
  const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();return sub&&Notification.permission==='granted'?'on':(isIOS()&&!isStandalone()?'home':'off');}catch(e){return'off';}}
async function pushEnable(){if(!S.user){loginSheet();return;}const st=await pushState();if(st==='home'||st==='nosupport'){pushSheet();return;}
  try{const perm=await Notification.requestPermission();if(perm!=='granted'){toast('Notifiche non permesse: puoi attivarle da Impostazioni › Notifiche › ZombieSafeHouse');pushRow();return;}
    const{data,error}=await SB.functions.invoke('zsh-push',{body:{task:'key'}});if(error||!data||!data.publicKey)throw new Error('servizio notifiche non attivo (manca la funzione zsh-push)');
    const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(data.publicKey)});
    const j=sub.toJSON();const r=await SB.rpc('push_subscribe',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth});if(r.error)throw r.error;
    try{await SB.functions.invoke('zsh-push',{body:{task:'test',endpoint:j.endpoint}});}catch(e){}toast('🔔 Notifiche attive: tra poco arriva una notifica di prova');}
  catch(e){toast('Notifiche non attivate: '+(e.message||e));}pushRow();}
async function pushOff(){try{const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();if(sub){try{await SB.rpc('push_unsubscribe',{p_endpoint:sub.endpoint});}catch(e){}await sub.unsubscribe();}toast('Notifiche spente');}catch(e){}pushRow();}
async function pushRow(){const el=document.getElementById('pushRow');if(!el)return;const st=await pushState();
  el.innerHTML=st==='on'?'<div class="pushon">🔔 Notifiche attive: ti avvisiamo 30 minuti prima di ogni orda <button class="btn ghost small" data-poff>Spegni</button></div>'
    :`<button class="btn wide ${st==='denied'?'ghost':''}" data-pon>🔔 Avvisami prima di ogni orda</button>${st==='home'?'<small class="muted">Su iPhone funziona solo con l’app aggiunta alla schermata Home.</small>':st==='denied'?'<small class="muted">Hai bloccato le notifiche: riattivale da Impostazioni › Notifiche.</small>':''}`;
  const on=el.querySelector('[data-pon]');if(on)on.onclick=pushEnable;const off=el.querySelector('[data-poff]');if(off)off.onclick=pushOff;}
async function pushSheet(){const st=await pushState();
  const body=st==='home'?`<p style="font-weight:400">Su iPhone le notifiche arrivano solo all’app <b>aggiunta alla schermata Home</b>:</p><ol style="font-weight:400;padding-left:18px"><li>Apri il sito in <b>Safari</b></li><li>Tocca <b>Condividi</b> (quadrato con freccia)</li><li><b>Aggiungi alla schermata Home</b></li><li>Apri l’app dall’icona, accedi e torna qui</li></ol>`
    :st==='nosupport'?(zWhere()==='inapp'?'<p style="font-weight:400">Sei dentro un’altra app (WhatsApp, Instagram…): qui le notifiche non esistono. Apri il sito nel browser e installa l’app.</p>':'<p style="font-weight:400">Questo browser non supporta le notifiche. Su Android usa <b>Chrome</b> (o Samsung Internet); su iPhone serve iOS 16.4 o più recente e l’app aggiunta alla schermata Home.</p>')
    :st==='denied'?'<p style="font-weight:400">Hai bloccato le notifiche. Riattivale da <b>Impostazioni › Notifiche › ZombieSafeHouse</b>, poi torna qui.</p>'
    :st==='on'?'<p style="font-weight:400">✅ Notifiche attive su questo telefono: 30 minuti prima di ogni orda (8:30 e 20:30), all’orda, e quando un superstite ti cerca.</p><div class="pspz"><b>💬 Messaggi della piazza</b><small>al massimo un avviso ogni 30 minuti</small><div class="hkvb"><button data-pz="no">No</button><button data-pz="zona">La mia zona</button><button data-pz="tutto">Anche il Mondo</button></div></div><button class="btn ghost" data-ps="off">Spegni le notifiche</button>'
    :'<p style="font-weight:400">Ricevi un avviso <b>30 minuti prima di ogni orda</b> (8:30 e 20:30), quando l’orda attacca e quando qualcuno ti propone un’alleanza, ti aiuta o ti attacca.</p><button class="btn" data-ps="on">🔔 Attiva le notifiche</button>';
  const inst=zWhere()!=='app'?'<button class="btn ghost small" data-psi style="margin-top:8px">📲 Installa l’app sul telefono</button><small class="muted" style="display:block;font-size:12px">Installata, compare tra le app e nelle Impostazioni, e le notifiche arrivano anche ad app chiusa.</small>':'';
  openSheet('🔔 Notifiche delle orde',body+inst+'<p class="muted" style="font-size:12px;margin-top:10px">Senza notifiche trovi sempre il conto alla rovescia in alto nella mappa e nella scheda Orda.</p>',c=>{const a=c.querySelector('[data-ps=on]');if(a)a.onclick=()=>{closeSheet();pushEnable();};const o=c.querySelector('[data-ps=off]');if(o)o.onclick=()=>{closeSheet();pushOff();};
    const si=c.querySelector('[data-psi]');if(si)si.onclick=()=>{window.SHEET_BACK={t:'‹ Notifiche',fn:pushSheet};zInstallSheet();};
    /* messaggi della piazza: no / la mia zona / anche il Mondo (migrazione 007) */
    if(c.querySelector('[data-pz]'))pushPzBind(c);});}
async function pushPzEndpoint(){try{const r=await navigator.serviceWorker.ready;const s=await r.pushManager.getSubscription();return s&&s.endpoint;}catch(e){return null;}}
async function pushPzBind(c){const B=[...c.querySelectorAll('[data-pz]')];const mark=m=>B.forEach(b=>b.classList.toggle('on',b.dataset.pz===m));
  const ep=await pushPzEndpoint();if(!ep){c.querySelector('.pspz').hidden=true;return;}
  try{const{data}=await SB.rpc('push_piazza',{p_endpoint:ep,p_mode:null});if(data&&data.ok)mark(data.piazza);else{mark('zona');}}catch(e){mark('zona');}
  B.forEach(b=>b.onclick=async()=>{const m=b.dataset.pz;try{const{data,error}=await SB.rpc('push_piazza',{p_endpoint:ep,p_mode:m});if(error)throw error;if(!data.ok)throw new Error(data.msg);mark(data.piazza);
    toast(m==='no'?'💬 Niente avvisi dalla piazza':m==='zona'?'💬 Ti avviso dei messaggi della tua zona':'💬 Ti avviso dei messaggi della tua zona e del Mondo');}catch(e){toast(e.message||'Non riuscito');}});}
/* un tocco sulla notifica apre il posto giusto */
function zGoUrl(u){try{const q=new URL(u,location.href).searchParams;if(q.get('assalto'))setTimeout(()=>assalto(q.get('assalto')==='sim'?'sim':'last'),300);else if(q.get('go')){const g=q.get('go');if(g==='social'){const tb=q.get('tab');SOC.tab=tb==='piazza'?'piazza':tb==='squadra'?'squadra':'bacheca';}if(g==='orda')G.ss='oggi';go(g);
    /* notifica di un messaggio privato: apre subito la chat con chi ha scritto (migrazione 011) */
    const dm=q.get('dm');if(g==='social'&&dm&&/^[0-9a-f-]{36}$/i.test(dm))setTimeout(async()=>{let n='';try{const{data}=await SB.from('profili_pubblici').select('nick').eq('user_id',dm).maybeSingle();n=data&&data.nick||'';}catch(e){}try{dmSheet(dm,n);}catch(e){}},700);}}catch(e){}}
try{navigator.serviceWorker&&navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.zgo)zGoUrl(e.data.zgo);});}catch(e){}
setTimeout(()=>{try{if(/[?&](assalto|go)=/.test(location.search)){const u=location.href;history.replaceState(null,'',location.pathname);zGoUrl(u);}}catch(e){}},1800);
</script>
