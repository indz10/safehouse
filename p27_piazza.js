<script>
/* =========================================================
   💬 PIAZZA: la chat della community (Zona · Mondo)
   + accesso sempre chiaro, avatar aggiornato, segnaposto giocatori,
     contatore sponsor vivo, riscontro a ogni tocco
   ========================================================= */
window.PZ={room:'zona',msgs:{zona:[],mondo:[]},last:{zona:0,mondo:0},timer:null,busy:false,admin:false,err:null};
const PZ_QUICK=['👏 Grande!','😂','🔥 Che orda!','🧟 Arrivano!','🛡️ Tenuto!','🤝 Chi si allea?','😤 Rivincita!','🙏 Grazie!'];
async function pzLoad(force){if(!S.user||PZ.busy)return;PZ.busy=true;const r=PZ.room;
  try{const{data,error}=await SB.rpc('world_chat_list',{p_room:r,p_after:force?0:PZ.last[r]});if(error)throw error;
    const add=(data||[]).slice().reverse();if(force)PZ.msgs[r]=add;else if(add.length)PZ.msgs[r]=PZ.msgs[r].concat(add.filter(m=>!PZ.msgs[r].some(x=>x.id===m.id))).slice(-120);
    if(PZ.msgs[r].length)PZ.last[r]=PZ.msgs[r][PZ.msgs[r].length-1].id;PZ.err=null;if(add.length||force)pzPaintList(force);}
  catch(e){PZ.err=e.message;pzPaintList(true);}finally{PZ.busy=false;}}
function pzStart(){pzStop();pzLoad(true);PZ.timer=setInterval(()=>{if(S.tab==='social'&&SOC.tab==='piazza'&&document.visibilityState==='visible')pzLoad(false);else pzStop();},5000);
  try{if(typeof zIsAdmin==='function')zIsAdmin().then(a=>{PZ.admin=!!a;});}catch(e){}}
function pzStop(){if(PZ.timer){clearInterval(PZ.timer);PZ.timer=null;}}
function pzHTML(){if(!S.user)return`<div class="panel"><b class="disp" style="font-size:20px">💬 Piazza</b><p style="font-weight:400">Per scrivere in piazza devi essere collegato <b>in questa app</b>.</p><button class="btn" onclick="loginSheet()">Accedi</button>${pzSafariNote()}</div>`;
  return`<div class="pzwrap"><div class="schips">${[['zona','📍 La mia zona'],['mondo','🌍 Mondo']].map(([k,l])=>`<button data-pzr="${k}" class="${PZ.room===k?'on':''}">${l}</button>`).join('')}<button class="pzrules" data-pzrules>Regole</button></div>
   <div class="pzlist" id="pzList"><p class="muted"><span class="spin"></span> Carico la piazza…</p></div>
   <div class="pzin"><div class="pzquick">${PZ_QUICK.map(q=>`<button data-pzq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
   <div class="pzrow"><input id="pzTxt" maxlength="280" placeholder="Scrivi in piazza… (complimenti, sfide, sfottò)" autocomplete="off"><button class="btn" data-pzsend>Invia</button></div></div></div>`;}
function pzSafariNote(){return'<p class="muted" style="font-size:12px;margin-top:8px">Su iPhone l’app sulla schermata Home ha un accesso separato da Safari: entra anche qui con la stessa email e password.</p>';}
function pzPaintList(toBottom){const L=document.getElementById('pzList');if(!L)return;const M=PZ.msgs[PZ.room]||[];const near=L.scrollHeight-L.scrollTop-L.clientHeight<80;
  L.innerHTML=(PZ.err?`<p class="notice">La piazza non risponde ora (${esc(PZ.err)}). Se compare “does not exist”, manca il blocco SQL della piazza su Supabase.</p>`:'')+
    (M.length?M.map(m=>`<div class="pzm ${m.mine?'mine':''}" data-pzid="${m.id}"><div class="pzh">${m.mine?'':`<b class="snick" data-pl="${esc(m.user_id)}">@${esc(m.nick)}</b><span>liv. ${m.wlevel}</span>`}<small>${socAgo(m.created_at)}</small></div><div class="pzb">${esc(m.body)}</div></div>`).join(''):(PZ.err?'':`<p class="muted">Ancora silenzio in ${PZ.room==='zona'?'zona':'piazza'}: rompi il ghiaccio!</p>`));
  if(toBottom||near)L.scrollTop=L.scrollHeight;
  L.querySelectorAll('.pzm').forEach(el=>el.onclick=ev=>{if(ev.target.closest('[data-pl]'))return;const m=M.find(x=>String(x.id)===el.dataset.pzid);if(m)pzActions(m);});}
function pzBind(){const B=app.querySelector('#socBody');if(!B)return;
  B.querySelectorAll('[data-pzr]').forEach(b=>b.onclick=()=>{PZ.room=b.dataset.pzr;B.querySelectorAll('[data-pzr]').forEach(x=>x.classList.toggle('on',x===b));pzLoad(true);});
  B.querySelectorAll('[data-pzq]').forEach(b=>b.onclick=()=>{const t=document.getElementById('pzTxt');t.value=(t.value?t.value+' ':'')+b.dataset.pzq;t.focus();});
  const r=B.querySelector('[data-pzrules]');if(r)r.onclick=()=>openSheet('📜 Regole della piazza',`<p style="font-weight:400">In piazza si chiacchiera, ci si fanno i complimenti, ci si sfida e ci si sfotte: anche litigare va bene.</p><p style="font-weight:400"><b>Non sono ammessi</b> bestemmie, insulti pesanti (razziali, sessuali, sull’origine), minacce e dati personali (indirizzi, telefoni).</p><p style="font-weight:400">Tocca un messaggio per <b>🚩 segnalarlo</b> (con 3 segnalazioni sparisce) o per <b>🚫 bloccare</b> chi ti dà fastidio. I messaggi restano 90 giorni.</p>`);
  const send=async()=>{const t=document.getElementById('pzTxt');const v=(t.value||'').trim();if(!v)return;const btn=B.querySelector('[data-pzsend]');btn.disabled=true;
    try{const{data,error}=await SB.rpc('world_chat_send',{p_room:PZ.room,p_body:v});if(error)throw error;if(data&&data.ok){t.value='';await pzLoad(false);const L=document.getElementById('pzList');if(L)L.scrollTop=L.scrollHeight;}else toast(data.msg||'Non inviato');}
    catch(e){toast(e.message||'Non inviato');}finally{setTimeout(()=>{btn.disabled=false;},600);}};
  const sb=B.querySelector('[data-pzsend]');if(sb)sb.onclick=send;const ti=document.getElementById('pzTxt');if(ti)ti.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send();}};}
function pzActions(m){openSheet('💬 Messaggio',`<div class="pzm ${m.mine?'mine':''}" style="margin-bottom:12px"><div class="pzh"><b>@${esc(m.nick)}</b><small>${socAgo(m.created_at)}</small></div><div class="pzb">${esc(m.body)}</div></div>
  <div class="placts">${m.mine?'':`<button class="btn" data-pa="pro">👤 Apri il profilo di @${esc(m.nick)}</button><button class="btn ghost" data-pa="re">↩️ Rispondi</button>`}
  ${m.mine?'':'<button class="btn ghost" data-pa="rep">🚩 Segnala</button><button class="btn ghost" data-pa="blk">🚫 Blocca @'+esc(m.nick)+'</button>'}${PZ.admin?'<button class="btn alt" data-pa="hide">🗑 Nascondi (admin)</button>':''}</div>`,card=>{
  card.querySelectorAll('[data-pa]').forEach(b=>b.onclick=async()=>{const k=b.dataset.pa;
    if(k==='pro'){closeSheet();playerSheet(m.user_id);return;}
    if(k==='re'){closeSheet();const t=document.getElementById('pzTxt');if(t){t.value='@'+m.nick+' ';t.focus();}return;}
    b.disabled=true;try{let r;if(k==='rep'||k==='hide'){r=await socRpc('world_chat_report',{p_id:m.id});}else if(k==='blk'){if(!confirm('Bloccare @'+m.nick+'? Non vedrai più i suoi messaggi.')){b.disabled=false;return;}r=await socRpc('world_block',{p_user:m.user_id,p_on:true});}
      toast(r.msg||'Fatto');closeSheet();pzLoad(true);}catch(e){toast(e.message||'Non riuscito');b.disabled=false;}});});}
/* la piazza è la prima voce di Superstiti */
SOC.tab='piazza';
/* ---------------- accesso chiaro e avatar sempre aggiornato ---------------- */
zEvery(()=>{try{const b=document.getElementById('ioBtn');if(!b)return;const want=S.user?((S.user.nick||(S.user.email||'?').split('@')[0])[0]||'?').toUpperCase():'👤';if(b.textContent!==want){b.textContent=want;b.classList.toggle('nolog',!S.user);}}catch(e){}},2000);
/* in Casa, se non sei collegato, lo vedi subito */
const _renderHomePz=renderHome;renderHome=function(){_renderHomePz();try{if(S.user||!S.result||app.querySelector('.nolog'))return;const c=app.querySelector('.hcard');if(c)c.insertAdjacentHTML('beforebegin',`<div class="panel nolog"><b>🔒 Non sei collegato in questa app</b><p style="font-weight:400;margin:4px 0">Accedi per salvare i progressi, avere la tua casa nel mondo e giocare con gli altri.</p>${pzSafariNote()}<button class="btn" onclick="loginSheet()">Accedi</button></div>`);}catch(e){}};
/* ---------------- giocatori sulla mappa: sempre la scheda nuova ---------------- */
document.addEventListener('click',e=>{const m=e.target.closest&&e.target.closest('.lm-usr');if(!m||!m.dataset.uid)return;e.stopPropagation();e.preventDefault();
  if(S.user&&m.dataset.uid===S.user.id){go('io');return;}playerSheet(m.dataset.uid);},true);
/* il tuo segnaposto non compare come "altro giocatore" */
zEvery(()=>{try{if(!S.user)return;document.querySelectorAll('.lm-usr').forEach(m=>{if(m.dataset.uid===S.user.id)m.style.display='none';});}catch(e){}},6000);
/* ---------------- contatore sponsor vivo ---------------- */
/* (Fase 4f-2) qui c'era un secondo contatore degli sponsor sulla mappa, in contrasto con quello di p36: tolto */
/* ---------------- riscontro a ogni tocco ---------------- */
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button,.btn,[role=button],.strow,.iorow');if(!b||b.disabled)return;b.classList.add('pressed');setTimeout(()=>b.classList.remove('pressed'),160);},{passive:true,capture:true});
</script>
