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
function bvInvLink(){const c=localStorage.getItem('zsh_inv');return ZSH_SITO+'/'+(c?'?invito='+c:'');}
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
</script>
