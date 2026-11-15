<script>
/* =========================================================
   📬 RICHIESTE IN UN POSTO SOLO (Fase 25, richiesta di Alessandro 16/11: "non ho la possibilità di accogliere qualcuno
   che mi chiede un'alleanza") — nessun SQL nuovo.
   Raccoglie tutto ciò che aspetta un tuo SÌ o NO, con i pulsanti ✅ Accetta / ❌ Rifiuta / 💬 Scrivi:
   - 🗳️ chi chiede di entrare (o è invitato) in una tua alleanza → world_alleanza_vota
   - 📨 inviti in un'alleanza per te → world_alleanza_risposta
   - 🤝 proposte di alleanza tra due superstiti → world_ally_answer
   - 🏠 "viviamo nella stessa casa" → world_house_answer
   Dove: prima linguetta "📬 Richieste" dei 💬 Messaggi (msgHub, p80), carta in cima alla guida e quindi nella carta
   ADESSO (reqGdItems), pulsante "Rispondi" sulle novità della bacheca (data-reqopen), numero sul pulsante 💬.
   In più: l'energia del superstite si scrive 🔋 (prima ⚡, che si confondeva con gli eventi 🚨).
   ========================================================= */
const REQ={L:[],n:0,t:0,busy:false};
async function reqLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return REQ.L;if(REQ.busy||(!force&&Date.now()-REQ.t<45000))return REQ.L;REQ.busy=true;REQ.t=Date.now();
  const L=[];try{
    const[alz,ap,hi]=await Promise.all([typeof alzLoad==='function'?alzLoad(true).catch(()=>null):null,SB.rpc('world_ally_pending').then(r=>r.data||[]).catch(()=>[]),typeof hiLoad==='function'?hiLoad().catch(()=>null):null]);
    ((alz&&alz.alleanze)||[]).forEach(A=>(A.da_votare||[]).forEach(q=>L.push({k:'voto',id:q.id,user_id:q.user_id,nick:q.nick,t:`@${q.nick} ${q.tipo==='invito'?'è stato invitato':'chiede di entrare'} in ${A.emblema} «${A.nome}»`,
      sub:`${q.tipo==='invito'?`invitato da @${q.da||''}${q.candidato_ok?'':' · deve ancora accettare'} · `:''}livello ${q.wlevel}${q.dist_km!=null?` · a ${String(q.dist_km).replace('.',',')} km`:''} · sì ${q.si}/${q.votanti}`})));
    ((alz&&alz.inviti)||[]).forEach(i=>L.push({k:'invito',id:i.id,nick:i.da,t:`@${i.da||''} ti invita in ${i.emblema} «${i.alleanza}»`,sub:`${i.membri} membri${i.perche_no?' · '+String(i.perche_no):''}`}));
    (ap||[]).forEach(a=>L.push({k:'ally',user_id:a.user_id,nick:a.nick,t:`@${a.nick} ti propone un’alleanza`,sub:`livello ${a.wlevel||1}: vi aiutate con rinforzi e scudi contro le orde`}));
    ((hi&&hi.requests)||[]).forEach(r=>L.push({k:'casa',user_id:r.user_id,nick:r.nick,t:`@${r.nick} dice che vivete nella stessa casa`,sub:'Se è così, la casa e le fortificazioni diventano in comune'}));
    REQ.L=L;REQ.n=L.length;}catch(e){}REQ.busy=false;return REQ.L;}
const REQ_IC={voto:'🗳️',invito:'📨',ally:'🤝',casa:'🏠'};
function reqHTML(L){L=L||REQ.L;if(!L.length)return'<p class="muted">Nessuna richiesta da accettare. Quando qualcuno chiede di entrare nella tua alleanza, ti propone un’alleanza o dice che vivete insieme, lo trovi qui.</p>';
  return L.map((r,i)=>`<div class="reqrow"><span>${REQ_IC[r.k]}</span><div><b>${esc(r.t)}</b><small>${esc(r.sub||'')}</small>
    <div class="reqacts"><button class="btn small" data-reqy="${i}">✅ Accetta</button><button class="btn small ghost" data-reqn="${i}">❌ Rifiuta</button>${r.user_id?`<button class="btn small ghost" data-dmr="${esc(r.user_id)}" data-n="${esc(r.nick||'')}">💬</button>`:''}</div></div></div>`).join('');}
async function reqAnswer(r,yes){const call=r.k==='voto'?['world_alleanza_vota',{p_id:r.id,p_si:yes}]:r.k==='invito'?['world_alleanza_risposta',{p_id:r.id,p_si:yes}]:r.k==='ally'?['world_ally_answer',{p_requester:r.user_id,p_yes:yes}]:['world_house_answer',{p_from:r.user_id,p_yes:yes}];
  const{data,error}=await SB.rpc(call[0],call[1]);if(error)throw error;return data||{ok:true};}
function reqBind(box,dopo){const L=REQ.L.slice();box.querySelectorAll('[data-reqy],[data-reqn]').forEach(b=>b.onclick=async()=>{const r=L[+(b.dataset.reqy||b.dataset.reqn)];if(!r)return;const yes=b.hasAttribute('data-reqy');
  if(!yes&&!confirm('Rifiuti la richiesta?'))return;box.querySelectorAll('[data-reqy],[data-reqn]').forEach(x=>x.disabled=true);
  try{const d=await reqAnswer(r,yes);toast((yes?'✅ ':'❌ ')+((d&&d.msg)||'Fatto'));}catch(e){toast('Non riuscito: '+(e.message||e));}
  try{ALZ.t=0;}catch(e){}await reqLoad(true);try{alsLoad&&alsLoad(true);wMine(true);}catch(e){}try{trrRepaint(true);}catch(e){}if(dopo)dopo();});}
/* nella guida (e nella carta ADESSO): una carta per richiesta, con Accetta e Rifiuta */
function reqGdItems(I){REQ.L.forEach(r=>I.push({p:88,ic:REQ_IC[r.k],t:esc(r.t),why:esc(r.sub||''),acts:[{b:'✅ Accetta',run:async()=>{const d=await reqAnswer(r,true);REQ.t=0;reqLoad(true);return d;}},{b:'❌ Rifiuta',confirm:1,run:async()=>{const d=await reqAnswer(r,false);REQ.t=0;reqLoad(true);return d;}}]}));}
/* "Rispondi" sulle novità della bacheca */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-reqopen]');if(!b)return;e.preventDefault();window.SHEET_BACK=null;msgHub('rich');});
/* 🔋: gli avvisi del server scrivono ancora ⚡ per l'energia */
const _toastReq=toast;toast=function(m,...a){return _toastReq(typeof m==='string'?m.replace(/⚡/g,'🔋'):m,...a);};
zEvery(()=>{try{if(document.hidden||!S.user||!['mappa','orda','social'].includes(S.tab))return;if(Date.now()-REQ.t>60000)reqLoad().then(()=>{try{trrRepaint();}catch(e){}});}catch(e){}},5000,'richieste');
</script>
