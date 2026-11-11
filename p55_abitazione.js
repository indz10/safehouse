<script>
/* =========================================================
   TIPI DI ABITAZIONE (pagina della casa vera → "🏘️ La tua abitazione")
   🏠 casa (anche condivisa: chi vive insieme ha UNA casa con fortificazioni e livello in comune)
   🏢 condominio (scala/interno: casa tua separata + difese comuni pagate insieme, +3 per livello a tutti)
   🏨 residence (temporanea: cambi indirizzo quando vuoi, senza attese)
   ========================================================= */
const HK={casa:['🏠','Casa','singola o condivisa con chi vive con te'],condominio:['🏢','Condominio','palazzina, condominio, villetta a schiera: ogni famiglia la sua casa'],residence:['🏨','Residence','casa temporanea: residence, B&B, studenti, affitto breve']};
const CD={portone:['🚪','Portone blindato'],cancello:['🔒','Cancello automatico'],telecamere:['📹','Telecamere condominiali']};
async function hiLoad(){try{const{data,error}=await SB.rpc('world_house_info');if(error)throw error;return data;}catch(e){return{err:e.message};}}
function kindSheet(I,after){let k=(I&&I.kind_set&&I.kind)||'casa';const draw=()=>openSheet('🏘️ Che tipo di casa è?',`
  ${Object.entries(HK).map(([id,[ic,n,d]])=>`<button class="hkopt ${k===id?'on':''}" data-hk="${id}"><span>${ic}</span><div><b>${n}</b><small>${d}</small></div></button>`).join('')}
  ${k==='condominio'?`<label class="fl">Scala e interno<input class="field" id="hkU" maxlength="30" placeholder="per esempio: A 5" value="${esc((I&&I.unit)||'')}"></label><p class="muted" style="font-size:12px">Serve a distinguere la tua casa da quella dei vicini nello stesso palazzo. Le difese comuni del condominio le pagate insieme.</p>`:''}
  ${k==='casa'?'<p class="muted" style="font-size:12px">Se vivi con altri iscritti (famiglia, coinquilini), dopo invitali con “🏠 Viviamo insieme”: avrete una casa sola con fortificazioni e livello in comune.</p>':''}
  ${k==='residence'?'<p class="muted" style="font-size:12px">Per chi sta in un posto per poco: quando cambi indirizzo la nuova casa è attiva subito, senza aspettare il giorno dopo.</p>':''}
  <button class="btn wide" data-hks>Salva</button>`,card=>{card.querySelectorAll('[data-hk]').forEach(b=>b.onclick=()=>{k=b.dataset.hk;draw();});
    card.querySelector('[data-hks]').onclick=async e=>{const u=(card.querySelector('#hkU')||{}).value||'';e.target.disabled=true;try{const{data,error}=await SB.rpc('world_set_home',{p_kind:k,p_unit:u});if(error)throw error;
      if(!data.ok){toast(data.msg);e.target.disabled=false;return;}toast('🏘️ '+data.msg);await wMine(true);await thrLoad(true);if(after)after();}catch(x){toast(x.message||'Non riuscito');e.target.disabled=false;}};});draw();}
function condoHTML(C){if(!C)return'';return`<div class="cdpan"><h4 class="hh">🏢 Difese del condominio <small style="font-weight:400;font-size:12px">· +3 di difesa per livello a tutte le case del palazzo · ora <b>+${C.bonus}</b></small></h4>
  ${(C.defs||[]).map(d=>{const[ic,n]=CD[d.kind];const pct=d.next?Math.round(d.pot/d.next*100):100;return`<div class="cdrow"><div class="cdt"><b>${ic} ${n}</b><span>${'●'.repeat(d.level)}${'○'.repeat(3-d.level)}</span></div>
    ${d.next?`<div class="cdbar"><i style="width:${pct}%"></i><small>🧱 ${wNum(d.pot)} / ${wNum(d.next)} per il livello ${d.level+1}</small></div>
    <div class="cdbtn">${[20,50,100].map(v=>`<button class="btn small ghost" data-cdg="${d.kind}" data-v="${v}">+🧱 ${v}</button>`).join('')}</div>`:'<small class="muted">Al massimo</small>'}
    ${(d.top||[]).length?`<small class="muted">Hanno versato: ${d.top.map(t=>`@${esc(t.nick)} ${wNum(t.tot)}`).join(' · ')}</small>`:''}</div>`;}).join('')}</div>`;}
/* 🤝 INSIEME (dopo la Fase 10): la cooperazione si vede. Casa condivisa → le persone con ✅/⏳ e la difesa che vi date;
   condominio → il palazzo con una finestra per famiglia (accesa = pronta) e le difese comuni sul tetto.
   'prep' = ha preparato la casa per la prossima orda (migrazione 008; senza, si vede solo chi c'è). */
function coopHTML(I){if(!I||I.err)return'';const M=I.members||[];const N=(I.neighbors||[]).filter(r=>r.status==='home'||r.status==='pending');
  const ora=(typeof OR!=='undefined'&&OR.s&&OR.s.next_at)?new Date(OR.s.next_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):'';
  const orP=(typeof OR!=='undefined'&&OR.s)?!!OR.s.prepared:undefined;const meP=I.me_prep!==undefined?(I.me_prep===true||orP===true):orP;const nkMe=(S.user&&S.user.nick)||'tu';
  const stato=p=>p===true?'<i class="cp-ok">✅ Pronto</i>':p===false?'<i class="cp-no">⏳ Non ancora</i>':'';
  let out='';
  if(M.length){const P=M.filter(m=>m.prep).length;const pts=Math.min(9,3*P);
    out+=`<div class="coop"><div class="coop-h"><b>🤝 Insieme contro l’orda</b>${ora?`<span>prossima orda alle ${ora}</span>`:''}</div>
      <div class="coop-row">${[{nick:nkMe,prep:meP,me:1},...M].map(m=>`<div class="cp-p ${m.prep?'on':''} ${m.me?'':'cp-tap'}" ${m.me?'':`data-cpu="${m.user_id}" data-n="${esc(m.nick)}" role="button" tabindex="0"`}><span class="cp-av">${esc((m.nick||'?')[0].toUpperCase())}</span><b>${m.me?'Tu':'@'+esc(m.nick)}</b>${stato(m.prep)}${m.me?'':`<span class="cp-mini"><button class="cp-dm" data-cpdm="${m.user_id}" data-n="${esc(m.nick)}" aria-label="Scrivi a ${esc(m.nick)}">💬</button><small>scheda ›</small></span>`}</div>`).join('')}</div>
      <div class="coop-bar"><span>Difesa in più dai coinquilini pronti</span><div class="cp-bar">${[0,1,2].map(i=>`<i class="${i<P?'on':''}">${i<P?'+3':''}</i>`).join('')}</div><b>+${pts} / +9</b></div>
      <div class="coop-act">${meP?'':'<button class="btn small" data-cpprep>🛡️ Prepara anche tu (+15)</button>'}${M.filter(m=>m.prep===false).map(m=>`<button class="btn small ghost" data-cpav="${m.user_id}">📣 Avvisa @${esc(m.nick)}</button>`).join('')}</div>
      <small class="coop-n">Tocca una persona per la sua scheda (case, difese, simulazione), 💬 per scriverle. Casa condivisa: livello e fortificazioni sono di tutti. Ogni coinquilino pronto dà +3 di difesa a tutti (massimo +9).</small></div>`;}
  if(I.kind==='condominio'){const F=[{nick:nkMe,unit:I.unit,prep:meP,me:1},...N.filter(r=>r.kind==='condominio')];const C=I.condo||{};const D=C.defs||[];const pr=F.filter(f=>f.prep).length;
    const cols=Math.min(3,Math.max(2,Math.ceil(Math.sqrt(F.length))));
    out+=`<div class="coop"><div class="coop-h"><b>🏢 Il nostro palazzo</b><span>${pr}/${F.length} famiglie pronte${ora?' · orda alle '+ora:''}</span></div>
      <div class="pal"><div class="pal-tetto">${D.map(d=>{const[ic,n]=(CD[d.kind]||['🛡️',d.kind]);return`<span title="${esc(n)}">${ic}<small>${'●'.repeat(d.level)}${'○'.repeat(3-d.level)}</small></span>`;}).join('')}</div>
        <div class="pal-corpo" style="grid-template-columns:repeat(${cols},1fr)">${F.map(f=>`<div class="pal-fin ${f.prep?'on':''} ${f.me?'me':'cp-tap'}" ${f.me?'':`data-cpu="${f.user_id}" data-n="${esc(f.nick)}" role="button" tabindex="0"`}><i></i><b>${f.me?'Tu':'@'+esc(f.nick)}</b><small>${f.unit?esc(f.unit):''}${f.prep===true?' · pronto':f.prep===false?' · non ancora':''}</small>${f.me?'':`<button class="cp-dm" data-cpdm="${f.user_id}" data-n="${esc(f.nick)}" aria-label="Scrivi a ${esc(f.nick)}">💬</button>`}</div>`).join('')}</div>
        <div class="pal-porta">🚪</div></div>
      <div class="coop-bar"><span>Difese comuni: bonus a tutte le case del palazzo</span><b>+${C.bonus||0}</b></div>
      <div class="coop-act">${meP?'':'<button class="btn small" data-cpprep>🛡️ Prepara la tua casa (+15)</button>'}${F.filter(f=>!f.me&&f.prep===false).map(f=>`<button class="btn small ghost" data-cpav="${f.user_id}">📣 Avvisa @${esc(f.nick)}</button>`).join('')}</div>
      <small class="coop-n">Tocca una finestra per la scheda di quella famiglia, 💬 per scriverle. Finestra accesa = famiglia pronta per la prossima orda. Le difese comuni (sotto) si pagano insieme e valgono per tutti.</small></div>`;}
  return out;}
function abitHTML(I){if(!I||I.err)return`<p class="muted" style="font-size:12.5px">Non disponibile${I&&I.err?' ('+esc(I.err)+')':''}${typeof SB!=='undefined'&&SB?': riprova tra poco':': l’app non è collegata al server (controlla la rete e riapri l’app)'}.</p>`;
  const[ic,n,d]=HK[I.kind]||HK.casa;const M=I.members||[],N=I.neighbors||[],R=I.requests||[];
  return`${coopHTML(I)}<div class="hktype ${I.kind_set?'':'todo'}"><span>${ic}</span><div><b>${I.kind_set?n:'Che tipo di casa è?'}${I.kind==='condominio'&&I.unit?' · '+esc(I.unit):''}</b><small>${I.kind_set?d:'Dillo al gioco: casa, condominio o residence'}</small></div><button class="btn small" data-hkc>${I.kind_set?'Cambia':'Scegli'}</button></div>
   ${R.map(r=>`<div class="hkreq">🏠 <b>@${esc(r.nick)}</b> dice che vivete nella stessa casa<div><button class="btn small" data-hra="${r.user_id}" data-y="1">Sì, viviamo insieme</button><button class="btn small ghost" data-hra="${r.user_id}" data-y="0">No</button></div></div>`).join('')}
   ${M.length?`<div class="hkmem"><span>🏠 <b>Vivete insieme</b>: ${M.map(m=>'@'+esc(m.nick)).join(', ')}</span><small>Casa condivisa: fortificazioni e livello in comune.</small><button class="lnk" data-hkl>Ho una casa mia in questo edificio</button></div>`:''}
   ${N.length?`<h4 class="hh" style="margin-top:8px">🏢 Nello stesso edificio</h4>${N.map(r=>`<div class="alrow"><span class="sav">${esc((r.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(r.nick)}${r.kind==='condominio'&&r.unit?' · '+esc(r.unit):''}</b><small>${r.status==='pending'?'⏳ casa in conferma':'🏠 abita qui'} · ${agoTxt(r.seen_at)}${r.ally?' · 🤝 alleato':''}</small></div>
     <div class="alacts"><button class="btn small ghost" data-crm="${r.user_id}" data-n="${esc(r.nick)}">💬 Scrivi</button>${r.ally?'':`<button class="btn small ghost" data-cra="${r.user_id}">🤝 Alleanza</button>`}${r.asked?'<button class="btn small" disabled>🏠 richiesta inviata</button>':`<button class="btn small" data-hki="${r.user_id}">🏠 Viviamo insieme</button>`}</div></div>`).join('')}`
   :(!M.length?'<p class="muted" style="font-size:12.5px">Per ora in questo edificio ci sei solo tu. Se vivi con qualcuno, invitalo: diventate coinquilini e vi date +3 di difesa a testa.</p>':'')}
   ${condoHTML(I.condo)}`;}
async function abitMount(c,h){let p=c.querySelector('.abpan');if(!p){p=document.createElement('div');p.className='abpan';const old=c.querySelector('.crpan');if(old){old.replaceWith(p);}else{const at=c.querySelector('.hpreal')||c.querySelector('.fortpan');if(at)at.after(p);else c.appendChild(p);}}
  p.innerHTML='<h4 class="hh">🏘️ La tua abitazione</h4><div class="abbox"><p class="muted"><span class="spin"></span></p></div>';const I=await hiLoad();const b=p.querySelector('.abbox');b.innerHTML=abitHTML(I);
  const redo=()=>houseSheet(h);
  /* 🤝 Insieme: prepara e avvisa */
  b.querySelectorAll('[data-cpprep]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ Casa preparata: +15 di difesa');try{await orLoad(true);}catch(e){}redo();}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});
  b.querySelectorAll('[data-cpav]').forEach(x=>x.onclick=()=>alRemind(x.dataset.cpav,x));
  /* tocco su una persona: la sua scheda da giocatore; 💬: messaggio diretto. "‹ Casa tua" per tornare */
  const back=()=>{window.SHEET_BACK={t:'‹ Casa tua',fn:()=>houseSheet(h)};};
  b.querySelectorAll('[data-cpdm]').forEach(x=>x.onclick=e=>{e.stopPropagation();back();dmSheet(x.dataset.cpdm,x.dataset.n);});
  b.querySelectorAll('[data-cpu]').forEach(x=>{const apri=()=>{back();playerSheet(x.dataset.cpu);};x.onclick=apri;x.onkeydown=e=>{if(e.key==='Enter')apri();};});
  const kc=b.querySelector('[data-hkc]');if(kc)kc.onclick=()=>kindSheet(I,redo);
  /* 👁️ chi vede il mio nome sulla mia casa */
  try{const{data:V}=await SB.rpc('world_home_vis',{p_vis:null});if(V&&V.ok){const tp=b.querySelector('.hktype');tp.insertAdjacentHTML('afterend',`<div class="hkvis"><b>👁️ Chi vede il tuo nome sulla tua casa</b><small>La casa è sempre nel punto esatto sulla mappa; qui scegli chi vede anche il tuo nome sopra.</small>
      <div class="hkvb"><button data-hkv="tutti" class="${V.vis==='tutti'?'on':''}">🌍 Tutti</button><button data-hkv="alleati" class="${V.vis!=='tutti'?'on':''}">🤝 Solo alleati e coinquilini</button></div></div>`);
    b.querySelectorAll('[data-hkv]').forEach(x=>x.onclick=async()=>{if(x.classList.contains('on'))return;if(x.dataset.hkv==='tutti'&&!confirm('Tutti i giocatori vedranno il tuo nome sulla tua casa, nel punto esatto. Confermi?'))return;
      try{const{data}=await SB.rpc('world_home_vis',{p_vis:x.dataset.hkv});if(data&&data.ok){b.querySelectorAll('[data-hkv]').forEach(y=>y.classList.toggle('on',y===x));toast(data.vis==='tutti'?'🌍 Il tuo nome ora è visibile a tutti':'🤝 Il tuo nome lo vedono solo alleati e coinquilini');}}catch(e){toast(e.message||'Non riuscito');}});}}catch(e){}
  b.querySelectorAll('[data-crm]').forEach(x=>x.onclick=()=>dmSheet(x.dataset.crm,x.dataset.n));
  b.querySelectorAll('[data-cra]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const r=await socRpc('world_ally_request',{p_target:x.dataset.cra});toast(r&&r.msg?r.msg:'🤝 Richiesta inviata');}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});
  b.querySelectorAll('[data-hki]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const{data,error}=await SB.rpc('world_house_invite',{p_to:x.dataset.hki});if(error)throw error;toast((data.ok?'🏠 ':'')+data.msg);if(data.ok)x.textContent='🏠 richiesta inviata';else x.disabled=false;}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});
  b.querySelectorAll('[data-hra]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const{data,error}=await SB.rpc('world_house_answer',{p_from:x.dataset.hra,p_yes:x.dataset.y==='1'});if(error)throw error;toast('🏠 '+data.msg);await wMine(true);await thrLoad(true);redo();}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});
  const lv=b.querySelector('[data-hkl]');if(lv)lv.onclick=async()=>{if(!confirm('Avere una casa tua separata in questo edificio? Le fortificazioni condivise restano a chi vive lì.'))return;try{const{data,error}=await SB.rpc('world_house_leave');if(error)throw error;toast('🏠 '+data.msg);await wMine(true);await thrLoad(true);redo();}catch(e){toast(e.message||'Non riuscito');}};
  b.querySelectorAll('[data-cdg]').forEach(x=>x.onclick=async()=>{const v=+x.dataset.v;if(((W.m&&W.m.mattoni)||0)<v){toast(`Servono 🧱 ${v}`);return;}x.disabled=true;try{const{data,error}=await SB.rpc('world_condo_give',{p_kind:x.dataset.cdg,p_amount:v});if(error)throw error;toast((data.ok?'🏢 ':'')+data.msg);await wMine(true);await thrLoad(true);redo();}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});}
/* bacheca: richieste di vivere insieme */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-hkopen]');if(!b)return;const home=myHouses().find(x=>x.home);if(home)houseSheet(home);});
</script>
