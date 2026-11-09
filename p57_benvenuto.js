<script>
/* =========================================================
   PAGINA DI BENVENUTO PER CHI ARRIVA DA UN INVITO
   Riconosce il telefono e mostra i passi giusti:
   - dentro WhatsApp/Instagram/Facebook → come aprire in Safari (iPhone) o Chrome (Android), con "Copia il link"
   - iPhone Safari → 1) crea l'account QUI (così il codice d'invito non si perde) 2) Aggiungi alla schermata Home 3) apri dall'icona
   - Android → 1) crea l'account 2) "📲 Installa l'app" (pulsante vero di Chrome, se disponibile)
   - computer → meglio dal telefono
   ========================================================= */
let BV_PROMPT=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();BV_PROMPT=e;const b=document.querySelector('#bvpage [data-bvinst]');if(b)b.hidden=false;});
function bvOS(){const ua=navigator.userAgent||'';if(/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&'ontouchend' in document))return'ios';if(/Android/i.test(ua))return'android';return'pc';}
function bvInvLink(){const c=localStorage.getItem('zsh_inv');return location.origin+'/'+(c?'?invito='+c:'');}
async function bvWho(){const c=localStorage.getItem('zsh_inv');if(!c||typeof SB==='undefined'||!SB)return null;try{const{data}=await SB.rpc('world_inviter',{p_code:c});return data||null;}catch(e){return null;}}
function bvSteps(os,where,logged){const acc=`<div class="bvst ${logged?'done':''}"><span>${logged?'✅':'1'}</span><div><b>Crea l’account</b><small>${logged?'Fatto: siete collegati.':'Serve per giocare con chi ti ha invitato. Fallo <b>qui</b>, prima di installare.'}</small>${logged?'':'<button class="btn" data-bvacc>Crea l’account</button>'}</div></div>`;
  if(where==='inapp')return`<div class="bvwarn">⚠️ Sei dentro <b>${/Instagram/i.test(navigator.userAgent)?'Instagram':/FBAN|FBAV/i.test(navigator.userAgent)?'Facebook':'WhatsApp'}</b>: qui l’app funziona a metà.</div>
    <div class="bvst"><span>1</span><div><b>Apri in ${os==='ios'?'Safari':'Chrome'}</b><small>${os==='ios'?'Tocca <b>•••</b> o l’icona <b>⤴</b> (in alto o in basso) → <b>Apri in Safari</b>.':'Tocca <b>⋮</b> in alto a destra → <b>Apri in Chrome</b> (o “Apri nel browser”).'}</small>
    <small>Non lo trovi? Copia il link e incollalo in ${os==='ios'?'Safari':'Chrome'}:</small><button class="btn ghost" data-bvcopy>📋 Copia il link</button></div></div>`;
  if(os==='ios')return acc+`<div class="bvst"><span>2</span><div><b>Mettila sulla schermata Home</b><small>Tocca <b>Condividi</b> <i class="bvic">⬆︎</i> (in basso; su iPad in alto) → scorri → <b>Aggiungi alla schermata Home</b> → <b>Aggiungi</b>.</small></div></div>
    <div class="bvst"><span>3</span><div><b>Apri dall’icona</b><small>Chiudi Safari e apri ZombieSafeHouse dalla nuova icona. Accedi con la stessa email: da lì arrivano notifiche e aggiornamenti.</small></div></div>`;
  if(os==='android')return acc+`<div class="bvst"><span>2</span><div><b>Installa l’app</b><small>Tocca il pulsante qui sotto. Se non c’è: <b>⋮</b> in alto a destra → <b>Installa app</b> (o “Aggiungi a schermata Home”).</small><button class="btn" data-bvinst ${BV_PROMPT?'':'hidden'}>📲 Installa l’app</button></div></div>
    <div class="bvst"><span>3</span><div><b>Apri dall’icona</b><small>Da lì arrivano notifiche e aggiornamenti.</small></div></div>`;
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
</script>
