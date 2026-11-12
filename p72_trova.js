<script>
/* =========================================================
   🔎 TROVA SUPERSTITI e ⭐ PREFERITI (migrazione 010)
   - pulsante "🔎 Trova superstiti" in cima alla pagina Superstiti (trovaBtn, chiamato da renderSocial in p66)
   - 🏠 Vicino a una mia casa: scegli la casa (myHouses) → superstiti entro 20 km (world_near_survivors,
     distanza dalla posizione approssimata già pubblica)
   - 🔤 Per nome: world_find
   - ⭐ Preferiti: chiunque, anche se non è alleato (world_fav_set / world_favs_list); la stella c'è
     anche nella scheda del giocatore (trFavDecorate, chiamato da playerSheet in p66)
   - toccando un superstite si apre la sua scheda con "‹ Trova superstiti"
   ========================================================= */
const TR={tab:'casa',hi:0,q:'',L:null,busy:false,err:null,favs:null,favL:null};
function trovaBtn(){if(!app||app.querySelector('[data-trova]'))return;const h=app.querySelector('.shead');if(!h)return;
  h.insertAdjacentHTML('afterend','<button class="btn wide trbtn" data-trova>🔎 Trova superstiti<small>vicino alle tue case · per nome · ⭐ preferiti</small></button>');
  app.querySelector('[data-trova]').onclick=()=>trovaSheet();}
async function trFavLoad(force){if(TR.favL&&!force)return TR.favL;try{TR.favL=await socRpc('world_favs_list')||[];}catch(e){TR.favL=TR.favL||[];}
  TR.favs=new Set(TR.favL.map(x=>x.user_id));return TR.favL;}
async function trFavSet(uid,on){try{const r=await socRpc('world_fav_set',{p_user:uid,p_on:on});if(r&&r.ok===false){toast(r.msg||'Non riuscito');return false;}
    if(!TR.favs)TR.favs=new Set();on?TR.favs.add(uid):TR.favs.delete(uid);TR.favL=null;toast(on?'⭐ Salvato tra i preferiti':'Tolto dai preferiti');return true;}
  catch(e){toast('Non riuscito: '+(e.message||e));return false;}}
const trAlly=a=>a==='ok'?'🤝 alleato':a==='out'?'⏳ proposta inviata':a==='in'?'📩 ti ha proposto l’alleanza':'';
function trRow(x){const fav=TR.favs&&TR.favs.has(x.user_id);const bits=[`livello ${x.wlevel||1}`];if(x.km!=null)bits.push('a '+kmTxt(+x.km));if(x.comune)bits.push(esc(x.comune));const al=trAlly(x.ally);if(al)bits.push(al);
  return`<div class="trrow"><button class="strow" data-trp="${esc(x.user_id)}"><span class="splogo">${esc((x.nick||'?').slice(0,1).toUpperCase())}</span><div><b>@${esc(x.nick||'superstite')}</b><small>${bits.join(' · ')}</small></div><i>›</i></button>
    <button class="trstar ${fav?'on':''}" data-trs="${esc(x.user_id)}" aria-label="${fav?'Togli dai preferiti':'Salva tra i preferiti'}">${fav?'⭐':'☆'}</button></div>`;}
function trBody(){const H=myHouses();const tabs=`<div class="hkvb trtabs"><button data-trt="casa" class="${TR.tab==='casa'?'on':''}">🏠 Vicino</button><button data-trt="nome" class="${TR.tab==='nome'?'on':''}">🔤 Per nome</button><button data-trt="fav" class="${TR.tab==='fav'?'on':''}">⭐ Preferiti${TR.favs&&TR.favs.size?' ('+TR.favs.size+')':''}</button></div>`;
  let top='',list='';
  if(TR.tab==='casa'){
    if(!H.length)top='<p class="notice">Prima valuta la tua casa: poi trovi i superstiti entro 20 km.</p>';
    else top=`<p class="trlab">Da quale casa?</p><div class="trcase">${H.map((h,i)=>`<button data-trh="${i}" class="${i===TR.hi?'on':''}">${h.ic} ${esc(h.label)}</button>`).join('')}</div><p class="trlab">Superstiti entro <b>20 km</b> da ${esc((H[TR.hi]||H[0]).label)}</p>`;}
  else if(TR.tab==='nome')top=`<div class="row" style="gap:8px;margin-top:8px"><input id="trq" placeholder="Nome del superstite (almeno 2 lettere)" autocomplete="off" value="${esc(TR.q)}" style="flex:1;min-width:0"><button class="btn small" data-trq>Cerca</button></div>`;
  else top='<p class="trlab">I superstiti che hai salvato: li vedi solo tu.</p>';
  if(TR.busy)list='<p><span class="spin"></span> Cerco…</p>';
  else if(TR.err)list=`<p class="muted">${esc(TR.err)}</p>`;
  else if(TR.L)list=TR.L.length?TR.L.map(trRow).join(''):`<p class="muted">${TR.tab==='casa'?'Nessun superstite visibile entro 20 km. Invita amici e vicini!':TR.tab==='fav'?'Ancora nessun preferito: tocca ☆ accanto a un nome.':'Nessuno con questo nome.'}</p>`;
  return tabs+top+`<div class="trlist">${list}</div>`;}
function trPaint(){const c=document.querySelector('#sheet.open .trbox');if(!c)return;c.innerHTML=trBody();trBind(c);}
async function trFetch(){TR.err=null;TR.busy=true;TR.L=null;trPaint();
  try{if(TR.tab==='casa'){const H=myHouses();const h=H[TR.hi]||H[0];if(!h){TR.L=[];}
      else TR.L=await socRpc('world_near_survivors',{p_lat:h.lat,p_lon:h.lon,p_km:20})||[];}
    else if(TR.tab==='nome'){if(TR.q.trim().length<2){TR.L=null;}else TR.L=await socRpc('world_find',{p_q:TR.q.trim()})||[];}
    else TR.L=await trFavLoad(true);}
  catch(e){TR.err=/Accedi/.test(e.message||'')?'Accedi per trovare i superstiti.':'Non riesco a cercare: '+(e.message||e)+(/world_near|world_fav|function/.test(e.message||'')?' (serve il blocco SQL 010)':'');}
  TR.busy=false;trPaint();}
function trBind(c){
  c.querySelectorAll('[data-trt]').forEach(b=>b.onclick=()=>{TR.tab=b.dataset.trt;trFetch();});
  c.querySelectorAll('[data-trh]').forEach(b=>b.onclick=()=>{TR.hi=+b.dataset.trh;trFetch();});
  const q=c.querySelector('#trq'),qb=c.querySelector('[data-trq]');if(q){const go_=()=>{TR.q=q.value;trFetch();};qb.onclick=go_;q.onkeydown=e=>{if(e.key==='Enter')go_();};if(!TR.L&&!TR.busy)setTimeout(()=>{try{q.focus();}catch(e){}},50);}
  c.querySelectorAll('[data-trp]').forEach(b=>b.onclick=()=>{window.SHEET_BACK={t:'‹ Trova superstiti',fn:()=>trovaSheet(true)};playerSheet(b.dataset.trp);});
  c.querySelectorAll('[data-trs]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.trs;const on=!(TR.favs&&TR.favs.has(uid));b.disabled=true;
    if(await trFavSet(uid,on)){if(TR.tab==='fav'&&!on)TR.L=(TR.L||[]).filter(x=>x.user_id!==uid);trPaint();}else b.disabled=false;});}
async function trovaSheet(keep){if(!S.user){toast('Accedi per trovare i superstiti');try{loginSheet();}catch(e){}return;}
  if(!keep){TR.L=null;TR.err=null;}const H=myHouses();if(TR.hi>=H.length)TR.hi=0;
  openSheet('🔎 Trova superstiti','<div class="trbox"></div>',()=>{});trPaint();
  await trFavLoad(true);if(keep&&TR.L&&TR.tab!=='fav'){trPaint();return;}trFetch();}
/* ⭐ nella scheda del giocatore */
async function trFavDecorate(uid){const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('[data-pfav]')||!S.user||uid===S.user.id)return;
  if(/Questo sei tu/.test(c.textContent))return;if(!TR.favs)await trFavLoad();const h=c.querySelector('.plhead');if(!h)return;
  const on=TR.favs&&TR.favs.has(uid);h.insertAdjacentHTML('beforeend',`<button class="trstar ${on?'on':''}" data-pfav aria-label="Preferito">${on?'⭐':'☆'}</button>`);
  const b=c.querySelector('[data-pfav]');b.onclick=async()=>{const now=!(TR.favs&&TR.favs.has(uid));b.disabled=true;if(await trFavSet(uid,now)){b.textContent=now?'⭐':'☆';b.classList.toggle('on',now);}b.disabled=false;};}
</script>
