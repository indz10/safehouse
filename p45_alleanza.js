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
const _closeSheetAl=closeSheet;closeSheet=function(){const r=_closeSheetAl.apply(this,arguments);sheetClean();return r;};
setInterval(sheetClean,6000);try{const _osSc=openSheet;openSheet=function(){const r=_osSc.apply(this,arguments);setTimeout(sheetClean,80);return r;};}catch(e){}
/* ---- 2) ---- */
async function allyAsk(uid,nick,btn){try{if(btn)btn.disabled=true;const r=await socRpc('world_ally_request',{p_target:uid});toast((r&&r.msg)||'🤝 Proposta inviata');}catch(e){toast(e.message||'Non riuscito');if(btn)btn.disabled=false;}}
async function allyNudge(uid,btn){try{if(btn)btn.disabled=true;const r=await socRpc('world_shout',{p_to:uid,p_code:5});toast(r&&r.ok===false?r.msg:'📣 Ricordato: “🤝 Facciamo squadra?”');}catch(e){toast(e.message||'Non riuscito');if(btn)btn.disabled=false;}}
const _playerSheetAl=playerSheet;playerSheet=async function(uid){await _playerSheetAl(uid);try{const c=document.querySelector('#sheet.open .sheet-b');if(!c)return;
  const sp=[...c.querySelectorAll('span.muted')].find(s=>/Proposta inviata/.test(s.textContent));if(!sp)return;
  sp.outerHTML=`<div class="alwait"><b>⏳ Proposta di alleanza inviata</b><small>Diventerete alleati quando accetta. Intanto puoi ricordarglielo o aiutarlo in un’orda: chi si aiuta diventa alleato da solo.</small><button class="btn small" data-alnudge>📣 Ricordaglielo</button></div>`;
  c.querySelector('[data-alnudge]').onclick=e=>allyNudge(uid,e.currentTarget);}catch(e){}};
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
const _socPaintAl=socPaint;socPaint=function(){_socPaintAl();try{if(SOC.tab!=='squadra'||!S.user)return;const B=app.querySelector('#socBody');if(!B||B.querySelector('.afpan'))return;
  const anchor=B.querySelector('.tbpan');const html=`<div class="panel afpan"><b class="disp" style="font-size:22px">➕ Aggiungi alla squadra</b><p style="font-weight:400;font-size:12.5px;margin:2px 0 8px">Cerca un superstite e proponigli l’alleanza. Diventate alleati anche se vi aiutate in un’orda, se vi invitate o se abitate nello stesso palazzo.</p>
    <div class="afsearch"><input class="field" id="afQ" placeholder="Nome del superstite (almeno 2 lettere)" value="${esc(AF.q)}" autocomplete="off"><button class="btn small" data-afinv>📨 Invita</button></div><div class="afbox"></div></div>`;
  if(anchor)anchor.insertAdjacentHTML('afterend',html);else B.insertAdjacentHTML('afterbegin',html);
  const q=B.querySelector('#afQ');let t=0;q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>afSearch(q.value),350);};B.querySelector('[data-afinv]').onclick=()=>inviteSheet();
  if(!SOC.riv)rivLoad().then(afPaint).catch(()=>{});afPaint();}catch(e){}};
/* ---- 4) nei Rivali: anche proporre l'alleanza ---- */
const _socPaintAl2=socPaint;socPaint=function(){_socPaintAl2();try{if(SOC.tab!=='rivali')return;app.querySelectorAll('.rivc').forEach((c,i)=>{const r=(SOC.riv||[])[i];if(!r||c.querySelector('[data-rally]'))return;const n=c.querySelector('.rivn');if(!n)return;
  n.insertAdjacentHTML('beforeend',`<button class="btn small ghost rally" data-rally="${r.user_id}">🤝 Alleanza</button>`);n.querySelector('[data-rally]').onclick=e=>allyAsk(r.user_id,r.nick,e.currentTarget);});}catch(e){}};
</script>
