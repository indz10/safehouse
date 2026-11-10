<script>
/* =========================================================
   ALLEATI: simulazione delle loro case, elenco con lo stato per la prossima orda,
   aiuti rapidi (rinforzi anche se non li hanno chiesti, scudo, regalo, promemoria)
   ========================================================= */
window.ALS={L:null,t:0,err:null};
async function alsLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return null;if(!force&&ALS.L&&Date.now()-ALS.t<45000)return ALS.L;
  try{const{data,error}=await SB.rpc('world_allies_status');if(error)throw error;ALS.L=data||[];ALS.t=Date.now();ALS.err=null;}catch(e){ALS.err=e.message;}return ALS.L;}
function agoTxt(t){if(!t)return'mai visto';const m=Math.round((Date.now()-new Date(t))/60000);if(m<6)return'🟢 online ora';if(m<60)return`visto ${m} min fa`;const h=Math.round(m/60);if(h<48)return`visto ${h} h fa`;return`visto ${Math.round(h/24)} g fa`;}
function chCls(c){return c==null?'':c>=70?'ok':c>=40?'mid':'ko';}
/* azioni rapide */
async function alHelp(uid,btn){if(btn)btn.disabled=true;try{const{data,error}=await SB.rpc('world_send_help',{p_target:uid});if(error)throw error;toast((data.ok?'🤝 ':'')+data.msg);if(data.ok){ALS.t=0;TB.t=0;}}catch(e){toast(e.message||'Non riuscito');}if(btn)btn.disabled=false;alsRefresh();}
async function alRemind(uid,btn){if(btn)btn.disabled=true;try{const r=await socRpc('world_shout',{p_to:uid,p_code:4});toast(r&&r.ok===false?r.msg:'📣 Avvisato: “🧟 Attento, arriva l’orda!”');}catch(e){toast(e.message||'Non riuscito');if(btn)btn.disabled=false;}}
function alActs(a,big){return`<div class="alacts ${big?'big':''}">
  <button class="btn small" data-alh="${a.user_id}" ${a.helped_by_me?'disabled':''}>${a.helped_by_me?'🤝 ✓ aiutato':'🤝 Rinforzi +5'}</button>
  <button class="btn small ghost" data-als="${a.user_id}" data-n="${esc(a.nick)}" ${a.shield_by_me?'disabled':''}>${a.shield_by_me?'🛡️ ✓':'🛡️ Scudo 💎20'}</button>
  ${a.prepared?'':`<button class="btn small ghost" data-alr="${a.user_id}">📣 Ricordaglielo</button>`}
  <button class="btn small ghost" data-alg="${a.user_id}" data-n="${esc(a.nick)}">🎁 Regala</button></div>`;}
function alBindActs(root){root.querySelectorAll('[data-alh]').forEach(b=>b.onclick=e=>{e.stopPropagation();alHelp(b.dataset.alh,b);});
  root.querySelectorAll('[data-als]').forEach(b=>b.onclick=async e=>{e.stopPropagation();await allyShield(b.dataset.als,b.dataset.n);ALS.t=0;alsRefresh();});
  root.querySelectorAll('[data-alr]').forEach(b=>b.onclick=e=>{e.stopPropagation();alRemind(b.dataset.alr,b);});
  root.querySelectorAll('[data-alg]').forEach(b=>b.onclick=e=>{e.stopPropagation();aySheet(b.dataset.alg,b.dataset.n);});}
/* ---------- la scheda simulazione di un alleato ---------- */
function thrView(T){const r=thrCalc(T);const ev=EVN[T.ev]||EVN.calma;const sl=T.slope||0;
  return`<div class="thhead"><span>${ev[0]} <b>${ev[1]}</b>${T.temp!=null?' · '+Math.round(T.temp)+'°C':''} · <small>${esc(ev[2])}</small></span><span>⛰️ ${Math.abs(sl)<.01?'terreno piano':sl>0?'casa in alto (salita per gli zombie)':'casa in basso (discesa per gli zombie)'}</span></div>
   <div class="thrw"><span>🧟 Vaganti</span><b>${Math.round(T.std_min*T.mw)}–${Math.round(T.std_max*T.mw)}</b></div>
   ${r.sp.map(x=>{const z=ZSP[x.k]||{ic:'🧟',n:x.k};const d=ZDEF[x.dk];const d2=x.dk2?ZDEF[x.dk2]:null;return`<div class="thrw"><span>${z.ic} ${z.n}<small>difesa: ${d[0]} ${d[1]} ${'●'.repeat(x.dl)}${'○'.repeat(3-x.dl)}${d2?` · ${d2[0]} ${'●'.repeat(x.dl2||0)}${'○'.repeat(3-(x.dl2||0))}`:''}</small></span><b>${x.p.toFixed(1).replace('.',',')}</b></div>`;}).join('')}
   <div class="thrw tot"><span>Forza dell’orda</span><b>${r.amin}–${r.amax}</b></div>
   <div class="thres"><div><small>Difesa</small><b>${r.def}</b></div><div><small>Livello casa</small><b>${T.level}</b></div><div class="${chCls(r.ch)}"><small>Tiene</small><b>${r.ch}%</b></div></div>`;}
async function allySheet(uid){openSheet('🤝 Alleato','<p><span class="spin"></span> Carico la sua simulazione…</p>',()=>{});let d=null;
  try{const{data,error}=await SB.rpc('world_ally_view',{p_user:uid});if(error)throw error;d=data;}catch(e){openSheet('🤝 Alleato',`<p class="muted">Simulazione non disponibile (${esc(e.message||'')}). Esegui il file alleati_sim.sql su Supabase.</p>`);return;}
  if(!d||!d.ok){openSheet('🤝 Alleato',`<p>${esc((d&&d.msg)||'Non disponibile')}</p>`);return;}
  const H=d.houses||[];const worst=H.length?Math.min(...H.map(T=>thrCalc(T).ch)):null;
  const draw=(open)=>openSheet(`🤝 @${esc(d.nick)}`,`<div class="alhead ${d.prepared?'ok':'ko'}"><div><b>${d.prepared?'🟢 Case preparate':'🔴 Case NON preparate'}</b><small>${agoTxt(d.seen_at)} · livello ${d.wlevel}${d.coinq?' · 🏢 coinquilino':''}</small><small>${d.asked?'🆘 Ha chiesto aiuto · ':''}rinforzi ricevuti ${d.helps_in} · scudi ${d.shields_in}/2</small></div>${worst!=null?`<div class="alw ${chCls(worst)}"><b>${worst}%</b><small>casa più a rischio</small></div>`:''}</div>
    ${!d.prepared?'<p class="altip">Non ha preparato le case: senza il suo +15 rischia di più. Mandagli rinforzi o uno scudo, oppure ricordaglielo.</p>':''}
    ${alActs({...d,user_id:uid},true)}
    <h4 class="hh">🏠 Le sue case alla prossima orda</h4>
    ${H.length?H.map((T,i)=>{const c=thrCalc(T).ch;return`<div class="alhouse"><button class="alhb" data-ah="${i}"><span>${T.home?'❤️ Casa vera':'🔑 Casa '+i}</span><small>livello ${T.level} · ${(EVN[T.ev]||EVN.calma)[0]}</small><b class="${chCls(c)}">${c}%</b><i>${open===i?'▲':'▼'}</i></button>${open===i?`<div class="alhd">${thrView(T)}</div>`:''}</div>`;}).join(''):'<p class="muted">Non ha ancora case nel mondo.</p>'}
    <p class="muted" style="font-size:12px;margin-top:8px">Ogni rinforzo vale +5 alla sua difesa, ogni scudo +5 (max 2). La % si aggiorna dopo l’invio.</p>`,card=>{alBindActs(card);
      card.querySelectorAll('[data-ah]').forEach(b=>b.onclick=()=>{const i=+b.dataset.ah;draw(open===i?-1:i);});
      card.querySelectorAll('[data-alh],[data-als]').forEach(b=>{const o=b.onclick;b.onclick=async e=>{await o(e);setTimeout(()=>allySheet(uid),900);};});});
  draw(H.length===1?0:-1);}
/* ---------- l'elenco: in Superstiti (scheda "Alleati") ---------- */
function alsHTML(L,compact){if(L==null)return'<p class="muted"><span class="spin"></span> Controllo i tuoi alleati…</p>';
  if(ALS.err&&!L.length)return`<p class="muted" style="font-size:12.5px">Elenco non disponibile (${esc(ALS.err)}). Esegui il file alleati_sim.sql su Supabase.</p>`;
  if(!L.length)return'<p class="muted" style="font-size:13px">Non hai ancora alleati. Cercane uno qui sotto o invita un amico.</p>';
  const LL=compact?L.slice(0,4):L;
  return LL.map(a=>`<div class="alrow" data-alv="${a.user_id}"><span class="sav">${esc((a.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(a.nick)}${a.coinq?' 🏢':''}</b>
     <small><span class="${a.prepared?'okt':'kot'}">${a.prepared?'🟢 pronto':'🔴 non pronto'}</span> · ${agoTxt(a.seen_at)}${a.asked?' · 🆘 chiede aiuto':''}</small></div>
     <div class="alpc ${chCls(a.worst)}"><b>${a.worst!=null?a.worst+'%':'—'}</b><small>${a.houses} ${a.houses===1?'casa':'case'}</small></div>
     ${compact?'':alActs(a,false)}</div>`).join('')+(compact&&L.length>4?`<button class="btn small ghost" data-alall>Tutti gli alleati (${L.length}) ›</button>`:'');}
function alsRefresh(){alsLoad().then(()=>{document.querySelectorAll('.alsbox').forEach(b=>{const c=b.classList.contains('cmp');b.innerHTML=alsHTML(ALS.L,c);alsBind(b);});});}
function alsBind(b){b.querySelectorAll('[data-alv]').forEach(r=>r.onclick=e=>{if(e.target.closest('button'))return;allySheet(r.dataset.alv);});alBindActs(b);
  const all=b.querySelector('[data-alall]');if(all)all.onclick=()=>{SOC.tab='squadra';go('social');};}
const _renderSocialAls=renderSocial;renderSocial=function(){_renderSocialAls();try{const b=app.querySelector('.sseg [data-st=squadra]');if(b)b.innerHTML='🤝 Alleati';}catch(e){}};
const _socPaintAls=socPaint;socPaint=function(){_socPaintAls();try{if(SOC.tab!=='squadra'||!S.user)return;const B=app.querySelector('#socBody');if(!B||B.querySelector('.alspan'))return;
  const html=`<div class="panel alspan"><b class="disp" style="font-size:22px">📋 I tuoi alleati alla prossima orda</b><p style="font-weight:400;font-size:12.5px;margin:2px 0 8px">In alto chi rischia di più. Tocca un alleato per vedere la simulazione delle sue case.</p><div class="alsbox">${alsHTML(ALS.L,false)}</div></div>`;
  const tb=B.querySelector('.tbpan');if(tb)tb.insertAdjacentHTML('beforebegin',html);else B.insertAdjacentHTML('afterbegin',html);
  const ayb=B.querySelector('.ayb');if(ayb)ayb.hidden=true;alsLoad(true).then(alsRefresh);}catch(e){}};
/* ---------- in breve nella scheda Orda ---------- */
function alsPutOrda(){try{if(S.tab!=='orda'||!S.user)return;const pg=app.querySelector('.page');if(!pg)return;let p=pg.querySelector(':scope > .alsorda');
  if(!p){const o=pg.querySelector('.opan');if(!o)return;o.insertAdjacentHTML('afterend','<div class="panel alsorda"><b class="disp" style="font-size:20px">🤝 I tuoi alleati</b><div class="alsbox cmp"></div></div>');p=pg.querySelector(':scope > .alsorda');}
  const b=p.querySelector('.alsbox');b.innerHTML=alsHTML(ALS.L,true);alsBind(b);if(!ALS.L)alsLoad().then(alsRefresh);}catch(e){}}
/* ---------- scheda giocatore di un alleato: "Vedi la sua simulazione" ---------- */
const _playerSheetAls=playerSheet;playerSheet=async function(uid){await _playerSheetAls(uid);try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('[data-alsim]'))return;
  if(!/Siete alleati/.test(c.textContent))return;const ac=c.querySelector('.placts')||c;ac.insertAdjacentHTML('afterbegin','<button class="btn small" data-alsim>🔍 Vedi la sua simulazione</button>');
  c.querySelector('[data-alsim]').onclick=()=>allySheet(uid);}catch(e){}};
setInterval(()=>{if(document.visibilityState==='visible'&&(S.tab==='orda'||(S.tab==='social'&&SOC.tab==='squadra')))alsRefresh();},60000);
</script>
