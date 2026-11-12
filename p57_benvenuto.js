<script>
/* =========================================================
   PAGINA DI BENVENUTO PER CHI ARRIVA DA UN INVITO
   Riconosce il telefono e mostra i passi giusti:
   - dentro WhatsApp/Instagram/Facebook → come aprire in Safari (iPhone) o Chrome (Android), con "Copia il link"
   - iPhone Safari → 1) crea l'account QUI (così il codice d'invito non si perde) 2) Aggiungi alla schermata Home 3) apri dall'icona
   - Android → 1) crea l'account 2) "📲 Installa l'app" (pulsante vero di Chrome, se disponibile)
   - computer → meglio dal telefono
   ========================================================= */
let BV_PROMPT=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();BV_PROMPT=e;const b=document.querySelector('#bvpage [data-bvinst]');if(b)b.hidden=false;document.querySelectorAll('[data-bvchr]').forEach(x=>x.hidden=true);});
function bvOS(){const ua=navigator.userAgent||'';if(/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&'ontouchend' in document))return'ios';if(/Android/i.test(ua))return'android';return'pc';}
/* apre il sito nel browser vero: su Android Chrome (anche da WhatsApp e dalle "schede" di altre app), su iPhone Safari (iOS 17+) */
function bvOpenHref(os){const u=bvInvLink();const r=u.replace(/^https:\/\//,'');
  return os==='ios'?'x-safari-https://'+r:'intent://'+r+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(u)+';end';}
function bvInvLink(){const c=localStorage.getItem('zsh_inv');return ZSH_SITO+'/'+(c?'?invito='+c:'');}
async function bvWho(){const c=localStorage.getItem('zsh_inv');if(!c||typeof SB==='undefined'||!SB)return null;try{const{data}=await SB.rpc('world_inviter',{p_code:c});return data||null;}catch(e){return null;}}
function bvSteps(os,where,logged){const acc=`<div class="bvst ${logged?'done':''}"><span>${logged?'✅':'1'}</span><div><b>Crea l’account</b><small>${logged?'Fatto: siete collegati.':'Serve per giocare con chi ti ha invitato. Fallo <b>qui</b>, prima di installare.'}</small>${logged?'':'<button class="btn" data-bvacc>Crea l’account</button>'}</div></div>`;
  if(where==='inapp')return`<div class="bvwarn">⚠️ Sei dentro <b>${/Instagram/i.test(navigator.userAgent)?'Instagram':/FBAN|FBAV/i.test(navigator.userAgent)?'Facebook':'WhatsApp'}</b>: qui l’app funziona a metà.</div>
    <div class="bvst"><span>1</span><div><b>Apri in ${os==='ios'?'Safari':'Chrome'}</b>${os==='pc'?'':`<a class="btn" href="${esc(bvOpenHref(os))}">🌐 Apri in ${os==='ios'?'Safari':'Chrome'}</a>`}<small>Se il pulsante non fa niente: ${os==='ios'?'tocca <b>•••</b> o l’icona <b>⤴</b> (in alto o in basso) → <b>Apri in Safari</b>.':'tocca <b>⋮</b> in alto a destra → <b>Apri in Chrome</b> (o “Apri nel browser”).'}</small>
    <small>Non lo trovi? Copia il link e incollalo in ${os==='ios'?'Safari':'Chrome'}:</small><button class="btn ghost" data-bvcopy>📋 Copia il link</button></div></div>`;
  if(os==='ios')return acc+`<div class="bvst"><span>2</span><div><b>Mettila sulla schermata Home</b><small>Tocca <b>Condividi</b> <i class="bvic">⬆︎</i> (in basso; su iPad in alto) → scorri → <b>Aggiungi alla schermata Home</b> → lascia acceso <b>Apri come app web</b> → <b>Aggiungi</b>.</small><small>Non trovi “Aggiungi alla schermata Home”? Non sei in Safari:</small><a class="btn ghost small" href="${esc(bvOpenHref('ios'))}">🧭 Apri in Safari</a></div></div>
    <div class="bvst"><span>3</span><div><b>Apri dall’icona e attiva le notifiche</b><small>Chiudi Safari e apri ZombieSafeHouse dalla nuova icona. Accedi con la stessa email: ti chiederà subito di <b>attivare le notifiche</b> → <b>Consenti</b>.</small></div></div>`;
  if(os==='android')return acc+`<div class="bvst"><span>2</span><div><b>Installa l’app</b><small>Tocca il pulsante qui sotto. Se non c’è: <b>⋮</b> in alto a destra → <b>Installa app</b> (o “Aggiungi a schermata Home”).</small><button class="btn" data-bvinst ${BV_PROMPT?'':'hidden'}>📲 Installa l’app</button><span data-bvchr ${BV_PROMPT?'hidden':''} style="display:contents"><small>Non vedi “Installa app”? Aprila in Chrome:</small><a class="btn ghost small" href="${esc(bvOpenHref('android'))}">🌐 Apri in Chrome</a></span><small>Scegli <b>Installa</b>, non “Crea scorciatoia”: così l’app compare in <b>Impostazioni → App</b>.</small></div></div>
    <div class="bvst"><span>3</span><div><b>Apri dall’icona e attiva le notifiche</b><small>Accedi con la stessa email: ti chiederà subito di <b>attivare le notifiche</b> → <b>Consenti</b>.</small></div></div>`;
  return acc+`<div class="bvst"><span>2</span><div><b>Meglio dal telefono</b><small>ZombieSafeHouse è pensata per il telefono: apri questo link sul cellulare, oppure continua qui.</small><button class="btn ghost" data-bvcopy>📋 Copia il link</button></div></div>`;}
async function bvShow(force){try{if(document.getElementById('bvpage'))return;const where=typeof zWhere==='function'?zWhere():'browser';if(where==='app'&&!force)return;
  const os=bvOS();const who=await bvWho();const logged=!!(typeof S!=='undefined'&&S&&S.user);
  document.body.insertAdjacentHTML('beforeend',`<div id="bvpage" role="dialog" aria-label="Benvenuto"><div class="bvcard">
    <div class="bvhead"><img src="icon-192.png" alt="" onerror="this.remove()"><div><b class="disp">${who?`@${esc(who)} ti ha invitato`:'Benvenuto!'}</b><small>ZombieSafeHouse: quanto resisterebbe casa tua a un’apocalisse zombie? E come renderla più sicura davvero.</small></div></div>
    <div class="bvbody">${bvSteps(os,where,logged)}</div>
    <button class="bvskip" data-bvskip>Continua nel browser</button></div></div>`);
  const P=document.getElementById('bvpage');
  P.querySelector('[data-bvskip]').onclick=()=>{sessionStorage.setItem('zsh_bv','1');P.remove();};
  const c=P.querySelector('[data-bvcopy]');if(c)c.onclick=async()=>{try{await navigator.clipboard.writeText(bvInvLink());c.textContent='✅ Link copiato';}catch(e){prompt('Copia questo link:',bvInvLink());}};
  const a=P.querySelector('[data-bvacc]');if(a)a.onclick=()=>{P.style.display='none';try{loginSheet();}catch(e){}const t=setInterval(()=>{if(!document.querySelector('#sheet.open')){clearInterval(t);P.remove();bvShow(true);}},700);};
  const i=P.querySelector('[data-bvinst]');if(i)i.onclick=async()=>{if(!BV_PROMPT){toast('Usa ⋮ → Installa app');return;}BV_PROMPT.prompt();try{const r=await BV_PROMPT.userChoice;if(r&&r.outcome==='accepted'){i.textContent='✅ Installata: aprila dall’icona';i.disabled=true;}}catch(e){}BV_PROMPT=null;};}catch(e){console.warn(e);}}
/* quando: arrivi da un invito, non sei nell'app installata e non l'hai già chiusa */
setTimeout(()=>{try{if(!localStorage.getItem('zsh_inv'))return;if(sessionStorage.getItem('zsh_bv'))return;if(localStorage.getItem('zsh_bv_done'))return;
  const where=typeof zWhere==='function'?zWhere():'browser';if(where==='app'){localStorage.setItem('zsh_bv_done','1');return;}
  const ib=document.getElementById('zbinapp');if(ib)ib.remove();bvShow();}catch(e){}},1200);
/* chi mi ha invitato (dal profilo sul server, non dalla memoria del telefono) */
async function invMio(){if(!S.user||typeof SB==='undefined'||!SB)return null;
  const{data}=await SB.from('profili_pubblici').select('invitato_da').eq('user_id',S.user.id).maybeSingle();const c=data&&data.invitato_da;if(!c)return null;
  try{const r=await SB.rpc('world_inviter',{p_code:c});return r.data||'un superstite';}catch(e){return 'un superstite';}}
/* collegarsi a mano a chi ti ha invitato: serve quando il link si è perso (su iPhone l'icona della schermata Home ha una memoria sua) */
function invCollega(){if(!S.user){toast('Accedi prima');return;}
  openSheet('🤝 Chi ti ha invitato?',`<p style="font-weight:400;margin:0 0 8px">Scrivi il nome di chi ti ha mandato il link. Vi collego: diventate subito alleati, vi vedete sulla mappa e lui riceve il premio quando valuti la casa.</p>
    <div class="row" style="gap:8px"><input id="invq" placeholder="es. ale" autocomplete="off" style="flex:1;min-width:0"><button class="btn small" data-invq>Cerca</button></div><div class="invres" style="margin-top:10px"></div>`,card=>{
    const go2=async()=>{const q=card.querySelector('#invq').value.trim().replace(/^@/,'');const box=card.querySelector('.invres');if(q.length<2){box.innerHTML='<p class="muted">Scrivi almeno 2 lettere</p>';return;}
      box.innerHTML='<p><span class="spin"></span> Cerco…</p>';let L=[];try{const{data}=await SB.rpc('world_find',{p_q:q});L=data||[];}catch(e){}
      box.innerHTML=L.length?L.map((x,i)=>`<button class="btn ghost wide" data-invp="${i}" style="margin-bottom:6px;text-align:left">@${esc(x.nick)} <small>· livello ${x.wlevel||1}${x.comune?' · '+esc(x.comune):''}</small></button>`).join(''):'<p class="muted">Nessun superstite con questo nome.</p>';
      box.querySelectorAll('[data-invp]').forEach(b=>b.onclick=async()=>{const x=L[+b.dataset.invp];b.disabled=true;
        try{const code=String(x.user_id).slice(0,8).toLowerCase();const{error}=await SB.from('profili_pubblici').update({invitato_da:code}).eq('user_id',S.user.id).is('invitato_da',null);if(error)throw error;
          try{localStorage.setItem('zsh_inv',code);localStorage.setItem('zsh_inv_ok','1');}catch(e){}toast('🤝 Collegato a @'+x.nick+': ora siete alleati');closeSheet();try{alsLoad&&alsLoad(true);}catch(e){}}
        catch(e){toast('Non riesco a collegarti ora: riprova');b.disabled=false;}});};
    card.querySelector('[data-invq]').onclick=go2;card.querySelector('#invq').addEventListener('keydown',e=>{if(e.key==='Enter')go2();});});}
/* 📲 INSTALLA L'APP (dopo la Fase 10): su Android Chrome la vera installazione (compare in Impostazioni → App,
   con le sue notifiche); altrimenti i passi giusti per il telefono e il browser. Da menu ☰, Controlla il mio gioco e Notifiche. */
function zBrowser(){const ua=navigator.userAgent||'';const os=/iPhone|iPad|iPod/.test(ua)?'ios':/Android/.test(ua)?'android':'altro';
  const br=/SamsungBrowser/.test(ua)?'samsung':/Firefox|FxiOS/.test(ua)?'firefox':/EdgA|Edg\//.test(ua)?'edge':/CriOS|Chrome\//.test(ua)?'chrome':/Safari\//.test(ua)?'safari':'altro';return{os,br};}
function zInstallSheet(){const w=typeof zWhere==='function'?zWhere():'browser';const{os,br}=zBrowser();const sito=ZSH_SITO+'/';
  const dopo='<div class="bvst"><span>✓</span><div><b>Poi</b><small>Apri ZombieSafeHouse dall’<b>icona</b>, accedi con la <b>stessa email</b>, poi menu ☰ → <b>🔔 Notifiche delle orde</b> → <b>Attiva</b> → <b>Consenti</b>.</small></div></div>';
  let body;
  if(w==='app')body='<p class="notice">✅ Stai già usando l’app installata. Per le notifiche: menu ☰ → 🔔 Notifiche delle orde.</p>';
  else if(w==='inapp')body=`<p style="font-weight:400">Sei dentro un’altra app (WhatsApp, Instagram…): da qui non si può installare né ricevere notifiche.</p>
    <div class="bvst"><span>1</span><div><b>Apri il link nel browser</b><small>${os==='ios'?'Tocca <b>⋯</b> o il pulsante <b>Safari</b> in basso → <b>Apri in Safari</b>.':'Tocca <b>⋮</b> in alto a destra → <b>Apri in Chrome</b> (o “Apri nel browser”).'} Oppure copia il link e incollalo nel browser.</small>${os==='ios'||os==='android'?`<a class="btn small" href="${esc(bvOpenHref(os))}">🌐 Apri in ${os==='ios'?'Safari':'Chrome'}</a>`:''}
    <div class="invl" style="margin-top:6px"><input readonly value="${esc(sito)}"><button class="btn small" data-zicp>Copia</button></div></div></div>${dopo}`;
  else if(BV_PROMPT)body=`<p style="font-weight:400">Il telefono può installare l’app: comparirà tra le app e nelle <b>Impostazioni</b>, con le sue notifiche.</p><button class="btn wide" data-ziinst>📲 Installa ZombieSafeHouse</button>${dopo}`;
  else if(os==='ios')body=`<div class="bvst"><span>1</span><div><b>Usa Safari</b><small>${br==='safari'?'Sei già in Safari. Se nel menu Condividi non trovi “Aggiungi alla schermata Home”, sei in una finestra di un’altra app:':'Apri il sito in <b>Safari</b>: è il modo più sicuro.'}</small><a class="btn ghost small" href="${esc(bvOpenHref('ios'))}">🧭 Apri in Safari</a></div></div>
    <div class="bvst"><span>2</span><div><b>Aggiungi alla schermata Home</b><small>Tocca <b>Condividi</b> (quadrato con la freccia) → scorri → <b>Aggiungi alla schermata Home</b> → <b>Aggiungi</b>.</small></div></div>${dopo}`;
  else if(os==='android')body=`<div class="bvst"><span>1</span><div><b>${br==='samsung'?'Samsung Internet':br==='firefox'?'Firefox':'Chrome'}</b><small>${br==='samsung'?'Tocca <b>≡</b> in basso → <b>Aggiungi pagina a</b> → <b>Schermata Home</b> (se compare <b>Installa</b>, scegli quello).':br==='firefox'?'Tocca <b>⋮</b> → <b>Installa</b>.':'Tocca <b>⋮</b> in alto a destra → <b>Installa app</b>. Se vedi solo “Aggiungi a schermata Home”, toccalo e poi scegli <b>Installa</b> (non “Crea scorciatoia”).'}</small></div></div>
    <div class="bvst"><span>2</span><div><b>Controlla</b><small>Se è installata davvero, la trovi in <b>Impostazioni → App → ZombieSafeHouse</b>. Se lì non c’è, è solo un collegamento: cancellalo e rifai il passo 1 da <b>Chrome</b>.</small>${br==='chrome'?'':`<a class="btn ghost small" href="${esc(bvOpenHref('android'))}">🌐 Apri in Chrome</a>`}</div></div>${dopo}`;
  else body=`<p style="font-weight:400">Sul computer: nella barra dell’indirizzo tocca l’icona <b>Installa</b> (o menu → Installa ZombieSafeHouse).</p>${dopo}`;
  openSheet('📲 Installa l’app',body,c=>{const b=c.querySelector('[data-ziinst]');if(b)b.onclick=async()=>{if(!BV_PROMPT){toast('Usa ⋮ → Installa app');return;}BV_PROMPT.prompt();try{const r=await BV_PROMPT.userChoice;if(r&&r.outcome==='accepted'){b.textContent='✅ Installata: aprila dall’icona';b.disabled=true;}}catch(e){}BV_PROMPT=null;};
    const cp=c.querySelector('[data-zicp]');if(cp)cp.onclick=()=>{try{navigator.clipboard.writeText(sito);toast('Link copiato');}catch(e){toast('Tieni premuto sul link e copia');}};});}
/* ULTIMO PASSO: aperta dall'icona, con l'account, notifiche mai chieste → le chiede subito (una volta al giorno finché non decide) */
function bvNotifCheck(){try{if(document.getElementById('bvnot')||document.getElementById('bvpage'))return;if(typeof zWhere!=='function'||zWhere()!=='app')return;
  if(typeof S==='undefined'||!S||!S.user||typeof SB==='undefined'||!SB)return;if(!('Notification' in window)||Notification.permission!=='default')return;
  if(typeof pushOk==='function'&&!pushOk())return;if(document.querySelector('#sheet.open'))return;const oggi=new Date().toISOString().slice(0,10);
  if(localStorage.getItem('zsh_bvnot')===oggi)return;
  document.body.insertAdjacentHTML('beforeend',`<div id="bvnot" role="dialog" aria-label="Notifiche"><div class="bvcard">
    <div class="bvhead"><img src="icon-192.png" alt="" onerror="this.remove()"><div><b class="disp">Ultimo passo 🔔</b><small>L’app è installata. Attiva le notifiche: ti avvisiamo 30 minuti prima di ogni orda, quando un alleato ti aiuta o un rivale ti attacca, e per i messaggi della piazza.</small></div></div>
    <div class="bvbody"><div class="bvst done"><span>✅</span><div><b>Account</b><small>@${esc(S.user.nick||'')}</small></div></div><div class="bvst done"><span>✅</span><div><b>App installata</b><small>Aperta dall’icona</small></div></div>
    <div class="bvst"><span>3</span><div><b>Notifiche</b><small>Tocca il pulsante, poi <b>Consenti</b>.</small><button class="btn" data-bvnon>🔔 Attiva le notifiche</button></div></div></div>
    <button class="bvskip" data-bvnlt>Più tardi</button></div></div>`);
  const P=document.getElementById('bvnot');
  P.querySelector('[data-bvnlt]').onclick=()=>{try{localStorage.setItem('zsh_bvnot',oggi);}catch(e){}P.remove();};
  P.querySelector('[data-bvnon]').onclick=()=>{P.remove();try{localStorage.setItem('zsh_bvnot',oggi);}catch(e){}pushEnable();};}catch(e){}}
setTimeout(bvNotifCheck,5000);zEvery(bvNotifCheck,20000,'bvNotif');
</script>
