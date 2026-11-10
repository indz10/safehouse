<script>
/* =========================================================
   1) la nota "Padrino" va dentro la finestra (non resta più a schermo)
      + pulizia di qualunque avanzo nel contenitore delle finestre
   2) scheda giocatore: proposta di alleanza chiara (proponi / in attesa + ricordaglielo / accetta)
   3) Squadra: "➕ Aggiungi alla squadra" (cerca per nome + superstiti vicini)
   4) Rivali: anche "🤝 Alleanza"
   ========================================================= */
/* ---- 1) ---- */
eqPad=function(){const c=document.querySelector('#sheet.open .sheet-b');if(c&&/[Ii]nvit/.test(c.textContent)&&!c.querySelector('.eqpad'))c.insertAdjacentHTML('beforeend','<p class="eqpad">🤝 <b>Padrino</b>: per i primi 14 giorni ricevi anche il 10% in più di quello che guadagna chi hai invitato (a lui non togliamo niente).</p>');};
function sheetClean(){try{const sh=document.getElementById('sheet');if(!sh)return;[...sh.children].forEach(ch=>{if(!ch.classList.contains('sheet-bg')&&!ch.classList.contains('sheet-card'))ch.remove();});}catch(e){}}
zEvery(sheetClean,6000);
/* ---- 2) ---- */
async function allyAsk(uid,nick,btn){try{if(btn)btn.disabled=true;const r=await socRpc('world_ally_request',{p_target:uid});toast((r&&r.msg)||'🤝 Proposta inviata');}catch(e){toast(e.message||'Non riuscito');if(btn)btn.disabled=false;}}
async function allyNudge(uid,btn){try{if(btn)btn.disabled=true;const r=await socRpc('world_shout',{p_to:uid,p_code:5});toast(r&&r.ok===false?r.msg:'📣 Ricordato: “🤝 Facciamo squadra?”');}catch(e){toast(e.message||'Non riuscito');if(btn)btn.disabled=false;}}
/* ---- 3) ---- */
window.AF={q:'',L:null,busy:false};
async function afSearch(q){AF.q=q;if(q.trim().length<2){AF.L=null;afPaint();return;}AF.busy=true;afPaint();try{AF.L=await socRpc('world_find',{p_q:q.trim()})||[];}catch(e){AF.L={err:e.message};}AF.busy=false;afPaint();}
function afRow(p,src){const st=p.ally||'none';const b=st==='ok'?'<span class="rok2">🤝 Alleati</span>':st==='out'?`<button class="btn small ghost" data-afn="${p.user_id}">📣 Ricorda</button>`:st==='in'?`<button class="btn small" data-afy="${p.user_id}">✅ Accetta</button>`:`<button class="btn small" data-afa="${p.user_id}" data-n="${esc(p.nick)}">🤝 Proponi</button>`;
  return`<div class="afr"><span class="sav">${esc((p.nick||'?')[0].toUpperCase())}</span><div>${socNick(p.user_id,p.nick)}<small>livello ${p.wlevel||1}${p.comune?' · '+esc(p.comune):''}${p.dist_km!=null?' · '+wNum(p.dist_km)+' km':''}${st==='out'?' · proposta inviata':''}</small></div>${b}</div>`;}
function afPaint(){const box=app.querySelector('.afbox');if(!box)return;const L=AF.L;
  let html='';if(AF.busy)html='<p class="muted"><span class="spin"></span> Cerco…</p>';else if(L&&L.err)html=`<p class="muted">Ricerca non disponibile (${esc(L.err)}).</p>`;else if(Array.isArray(L))html=L.length?L.map(p=>afRow(p)).join(''):'<p class="muted">Nessun superstite con questo nome.</p>';
  else{const R=(SOC.riv||[]).slice(0,6);html=R.length?'<p class="muted" style="font-size:12px;margin:0 0 4px">Superstiti vicini alla tua portata:</p>'+R.map(r=>afRow({...r,ally:'none'})).join(''):'<p class="muted" style="font-size:12.5px">Scrivi un nome qui sopra, oppure invita un amico: chi entra con il tuo invito è alleato da subito.</p>';}
  box.innerHTML=html;
  box.querySelectorAll('[data-afa]').forEach(b=>b.onclick=()=>allyAsk(b.dataset.afa,b.dataset.n,b).then(()=>{b.outerHTML='<span class="muted" style="font-size:12px">⏳ inviata</span>';}));
  box.querySelectorAll('[data-afn]').forEach(b=>b.onclick=()=>allyNudge(b.dataset.afn,b));
  box.querySelectorAll('[data-afy]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await socRpc('world_ally_answer',{p_requester:b.dataset.afy,p_yes:true});toast((r&&r.msg)||'🤝 Alleanza fatta');if(AF.q)afSearch(AF.q);}catch(e){toast(e.message);}});}
/* ---- 4) nei Rivali: anche proporre l'alleanza ---- */
</script>
