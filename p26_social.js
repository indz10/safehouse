<script>
/* =========================================================
   👥 SUPERSTITI: il social al centro
   bacheca · per te · squadra · classifiche · scheda giocatore · saluti
   + ⭐ SPONSOR sulla mappa: tutti, grandi, con offerta, con elenco
   ========================================================= */
const SHOUTS=['','👋 Ciao vicino!','🛡️ Ti copro io stanotte','🙏 Grazie dei rinforzi!','🧟 Attento, arriva l’orda!','🤝 Facciamo squadra?','💪 Bella difesa!','😈 Ci vediamo all’orda…','🎁 Grazie del regalo!','🏠 Bella casa!','🆘 Mi serve aiuto!','🔥 Che assalto!','🌙 Buona guardia stanotte'];
window.SOC={feed:{},rank:{},allies:[],pend:[],per:[],t:{},tab:'bacheca',scope:'zona',rs:'zona',rp:'settimana'};
const socAgo=t=>{const s=Math.max(1,Math.round((Date.now()-new Date(t))/1000));return s<60?'ora':s<3600?Math.round(s/60)+' min fa':s<86400?Math.round(s/3600)+' h fa':Math.round(s/86400)+' g fa';};
async function socRpc(fn,args){if(typeof SB==='undefined'||!SB||!S.user)throw new Error('Accedi per entrare tra i superstiti');const{data,error}=await SB.rpc(fn,args||{});if(error)throw error;return data;}
function socNick(id,nick){return`<b class="snick" data-pl="${esc(id||'')}">@${esc(nick||'superstite')}</b>`;}
function socLineBase(f){const a=socNick(f.actor,f.actor_nick),t=f.target?socNick(f.target,f.target_nick):'';const where=f.comune?` <span class="scom">· ${esc(f.comune)}</span>`:'';
  const K={join:['🏠',`${a} è entrato nel mondo${where}`],buy:['🔑',`${a} ha comprato una casa${f.info==='npc'?' da un superstite simulato':''}${where}`],ask:['🆘',`${a} chiede aiuto per la prossima orda${where}`],
    help:['🛡️',`${a} ha mandato rinforzi a ${t}`],attack:['🧟',`${a} ha mandato un’orda contro ${t}`],gift:['🎁',`${a} ha ${f.info==='prestito'?'prestato Mattoni':'fatto un regalo'} a ${t}`],
    ally:['🤝',`${a} e ${t} sono alleati`],ally_req:['🤝',`${a} propone un’alleanza a ${t}`],invite_join:['🎉',`${a} è entrato con l’invito di ${t}`],shout:['💬',`${a} → ${t}: «${esc((SHOUTS[+f.info]||'').replace(/^\S+\s/,''))}»`]};
  const k=K[f.kind]||['📣',a];const act=f.kind==='ask'&&f.actor!==(S.user&&S.user.id)?`<button class="btn small" data-shelp="${esc(f.actor)}">Manda rinforzi</button>`:'';
  return`<div class="sitem"><span class="sic">${k[0]}</span><div class="stx">${k[1]}<small>${socAgo(f.created_at)}</small></div>${act}</div>`;}
async function socLoad(what,force){const key=what+(what==='feed'?SOC.scope:what==='rank'?SOC.rs+SOC.rp:'');if(!force&&Date.now()-(SOC.t[key]||0)<30000)return;SOC.t[key]=Date.now();
  try{if(what==='feed')SOC.feed[SOC.scope]=await socRpc('world_feed_list',{p_scope:SOC.scope})||[];
    else if(what==='per'){SOC.per=await socRpc('world_feed_list',{p_scope:'pervoi'})||[];SOC.pend=await socRpc('world_ally_pending')||[];socBadge();}
    else if(what==='rank')SOC.rank[SOC.rs+SOC.rp]=await socRpc('world_rank',{p_scope:SOC.rs,p_period:SOC.rp})||[];
    else if(what==='allies')SOC.allies=await socRpc('world_allies')||[];SOC.err=null;}catch(e){SOC.err=e.message;if(what==='feed'&&SOC.feed[SOC.scope]==null)SOC.feed[SOC.scope]=[];if(what==='rank'&&SOC.rank[SOC.rs+SOC.rp]==null)SOC.rank[SOC.rs+SOC.rp]=[];}
  if(S.tab==='social')socPaint();}
/* numerino rosso sulla scheda: novità per te dall'ultima visita */
function socBadge(){try{const seen=+(localStorage.getItem('zsh_soc_seen')||0);const n=(SOC.per||[]).filter(f=>new Date(f.created_at).getTime()>seen).length+(SOC.pend||[]).length;
  const b=document.querySelector('#nav [data-tab=social]');if(!b)return;let d=b.querySelector('.nbadge');if(n>0){if(!d){b.insertAdjacentHTML('beforeend','<i class="nbadge"></i>');d=b.querySelector('.nbadge');}d.textContent=n>9?'9+':n;}else if(d)d.remove();}catch(e){}}
zEvery(()=>{if(S.user&&document.visibilityState==='visible')socLoad('per');},60000);
/* ---------------- la scheda ---------------- */
function renderSocialBase(){app.innerHTML=`<div class="page dots soc">
  <div class="panel night shead"><div><b class="disp" style="font-size:28px;color:var(--moon)">👥 Superstiti</b><small>${typeof STATS!=='undefined'&&STATS.reg?`${STATS.reg} nel mondo · 🟢 ${STATS.on||0} online ora`:'Il mondo gioca insieme'}</small></div><button class="btn small" data-sinv>📨 Invita</button></div>
  <div class="oseg2 sseg">${[['bacheca','📰 Bacheca'],['squadra','🤝 Squadra'],['classifiche','🏆 Classifiche']].map(([k,l])=>`<button data-st="${k}" class="${SOC.tab===k?'on':''}">${l}</button>`).join('')}</div>
  <div id="socBody"></div></div>`;
  app.querySelector('[data-sinv]').onclick=()=>{if(!S.user)return loginSheet();inviteSheet();};
  app.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{SOC.tab=b.dataset.st;app.querySelectorAll('[data-st]').forEach(x=>x.classList.toggle('on',x===b));socPaint();socFetchTab();});
  try{localStorage.setItem('zsh_soc_seen',Date.now());}catch(e){}socPaint();socFetchTab();setTimeout(socBadge,200);}
function socFetchTabBase(){if(!S.user)return;socLoad('per');if(SOC.tab==='bacheca')socLoad('feed');if(SOC.tab==='squadra')socLoad('allies');if(SOC.tab==='classifiche')socLoad('rank');}
function socPaintBase(){const B=app.querySelector('#socBody');if(!B)return;
  if(!S.user){B.innerHTML=`<div class="panel"><p style="font-weight:400">Accedi per vedere chi difende il mondo con te, allearti, salutare e scalare le classifiche.</p><button class="btn" onclick="loginSheet()">Accedi o registrati</button></div>`;return;}
  const per=(SOC.per||[]).slice(0,6),pend=SOC.pend||[];
  const perHTML=(pend.length||per.length)?`<div class="panel sper"><b class="disp" style="font-size:20px">📬 Per te</b>
    ${pend.map(p=>`<div class="sitem"><span class="sic">🤝</span><div class="stx">${socNick(p.user_id,p.nick)} vuole allearsi con te<small>livello ${p.wlevel}</small></div><button class="btn small" data-ayes="${p.user_id}">Accetta</button><button class="btn small ghost" data-ano="${p.user_id}">No</button></div>`).join('')}
    ${per.map(socLine).join('')}</div>`:'';
  let body='';
  if(SOC.tab==='bacheca'){const L=SOC.feed[SOC.scope];body=`<div class="schips">${[['zona','📍 Zona'],['alleati','🤝 Alleati'],['mondo','🌍 Mondo']].map(([k,l])=>`<button data-sc="${k}" class="${SOC.scope===k?'on':''}">${l}</button>`).join('')}</div>
    <div class="panel">${L==null?'<p class="muted"><span class="spin"></span> Carico…</p>':L.length?L.map(socLine).join(''):`<p class="muted">${SOC.scope==='zona'?'Ancora niente nella tua zona: invita un vicino!':'Ancora niente qui.'}</p>`}</div>`;}
  else if(SOC.tab==='squadra'){const A=SOC.allies||[];body=`<div class="panel"><b class="disp" style="font-size:20px">🤝 La tua squadra (${A.length})</b><p class="muted" style="font-size:12.5px;margin:4px 0 8px">Alleati: chi accetta la tua proposta, chi vi siete aiutati nelle orde, chi hai invitato o ti ha invitato.</p>
    ${A.length?A.map(a=>`<div class="sitem"><span class="sav">${esc((a.nick||'?')[0].toUpperCase())}</span><div class="stx">${socNick(a.user_id,a.nick)}<small>livello ${a.wlevel}${a.dist_km!=null?' · '+wNum(a.dist_km)+' km':''}</small></div><button class="btn small" data-pl="${a.user_id}">Apri</button></div>`).join(''):'<p class="muted">Nessun alleato ancora. Proponi un’alleanza dalla bacheca, dalla mappa o dalle classifiche, oppure invita qualcuno.</p>'}</div>
    <div class="panel"><b>🔎 Trova superstiti</b><p class="muted" style="font-size:12.5px;margin:4px 0 8px">Sulla mappa accendi il filtro 🤝 Alleati: vedi chi è visibile vicino a te e lo tocchi per allearti.</p><button class="btn ghost small" data-smap>🗺️ Apri la mappa</button></div>`;}
  else{const L=SOC.rank[SOC.rs+SOC.rp];body=`<div class="schips">${[['zona','📍 Zona'],['mondo','🌍 Mondo']].map(([k,l])=>`<button data-rs="${k}" class="${SOC.rs===k?'on':''}">${l}</button>`).join('')}<span style="flex:1"></span>${[['settimana','Settimana'],['sempre','Sempre']].map(([k,l])=>`<button data-rp="${k}" class="${SOC.rp===k?'on':''}">${l}</button>`).join('')}</div>
    <div class="panel">${L==null?'<p class="muted"><span class="spin"></span> Carico…</p>':L.length?L.map(r=>`<div class="srank ${r.me?'me':''}"><span class="rpos">${r.pos<=3?['🥇','🥈','🥉'][r.pos-1]:r.pos}</span><div class="stx">${socNick(r.user_id,r.nick)}<small>livello ${r.wlevel}${r.comune?' · '+esc(r.comune):''}</small></div><b>🧱 ${wNum(r.punti)}</b></div>`).join(''):'<p class="muted">Nessuno in classifica ancora.</p>'}
    <p class="muted" style="font-size:12px;margin-top:8px">Punti = Mattoni guadagnati giocando (orde, missioni, affitti, aiuti). Regali e prestiti non contano.</p></div>`;}
  const errN=SOC.err?`<p class="notice">Il social non risponde ora (${esc(SOC.err)}). Se compare “does not exist”, manca il blocco SQL del social su Supabase.</p>`:'';
  B.innerHTML=errN+perHTML+body;
  B.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{SOC.scope=b.dataset.sc;socPaint();socLoad('feed');});
  B.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{SOC.rs=b.dataset.rs;socPaint();socLoad('rank');});
  B.querySelectorAll('[data-rp]').forEach(b=>b.onclick=()=>{SOC.rp=b.dataset.rp;socPaint();socLoad('rank');});
  B.querySelectorAll('[data-ayes],[data-ano]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await socRpc('world_ally_answer',{p_requester:b.dataset.ayes||b.dataset.ano,p_yes:!!b.dataset.ayes});toast('🤝 '+r.msg);}catch(e){toast(e.message);}socLoad('per',true);socLoad('allies',true);});
  B.querySelectorAll('[data-shelp]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await socRpc('world_send_help',{p_target:b.dataset.shelp});toast((r.ok?'🛡️ ':'')+r.msg);}catch(e){toast(e.message);}});
  const sm=B.querySelector('[data-smap]');if(sm)sm.onclick=()=>{S.mf=S.mf||{};S.mf.all=true;go('mappa');};}
/* ---------------- scheda del giocatore (da ovunque) ---------------- */
document.addEventListener('click',e=>{const n=e.target.closest&&e.target.closest('[data-pl]');if(!n||!n.dataset.pl)return;e.preventDefault();e.stopPropagation();playerSheet(n.dataset.pl);},true);
async function playerSheetBase(uid){if(!S.user){loginSheet();return;}openSheet('👤 Superstite','<p><span class="spin"></span> Carico…</p>',()=>{});let p;
  try{p=await socRpc('world_player',{p_user:uid});window.PLX=p;}catch(e){openSheet('👤 Superstite',`<p class="notice">${esc(e.message)}</p>`);return;}
  const allyBtn=p.me?'':p.ally==='ok'?'<span class="rok2">🤝 Siete alleati</span>':p.ally==='out'?'<span class="muted">Proposta inviata: aspetta che accetti</span>':p.ally==='in'?'<button class="btn" data-pa="yes">✅ Accetta l’alleanza</button>':'<button class="btn" data-pa="req">🤝 Proponi alleanza</button>';
  openSheet('👤 Superstite',`<div class="plhead"><span class="sav big">${esc((p.nick||'?')[0].toUpperCase())}</span><div><b class="disp" style="font-size:26px">@${esc(p.nick)}</b><small>Livello mondo ${p.wlevel} · ${p.houses} ${p.houses===1?'casa comprata':'case comprate'}${p.comune?' · '+esc(p.comune):''}</small></div></div>
    ${p.me?'<p class="muted">Questo sei tu.</p>':`<div class="placts">${allyBtn}
      ${p.asked&&!p.helped?'<button class="btn alt" data-pa="help">🛡️ Manda rinforzi (chiede aiuto)</button>':p.helped?'<span class="rok2">🛡️ Rinforzi mandati per questa orda</span>':''}
      ${p.ally==='ok'?'<button class="btn ghost" data-pa="gift">🎁 Regala o presta</button>':''}
      ${p.home&&!p.protected&&!p.attacked&&p.ally!=='ok'?'<button class="btn ghost" data-pa="atk">🧟 Manda un’orda · 🧱30</button>':p.protected?'<small class="muted">È molto più debole di te: è protetto dalle tue orde.</small>':''}</div>
    <h4 style="margin:14px 0 6px">💬 Saluta</h4><div class="shouts">${SHOUTS.slice(1).map((s,i)=>`<button data-sh="${i+1}">${esc(s)}</button>`).join('')}</div>`}`,card=>{
    card.querySelectorAll('[data-pa]').forEach(b=>b.onclick=async()=>{const k=b.dataset.pa;b.disabled=true;try{let r;
      if(k==='req')r=await socRpc('world_ally_request',{p_target:uid});else if(k==='yes')r=await socRpc('world_ally_answer',{p_requester:uid,p_yes:true});
      else if(k==='help')r=await socRpc('world_send_help',{p_target:uid});
      else if(k==='atk'){if(!confirm('Mandare un’orda a @'+p.nick+'? Costa 30 Mattoni.')){b.disabled=false;return;}r=await socRpc('world_send_attack',{p_target:uid});}
      else if(k==='gift'){closeSheet();try{aySheet(uid,p.nick);}catch(e){G.ss='impero';go('orda');}return;}
      toast(r.msg||'Fatto');playerSheet(uid);socLoad('allies',true);}catch(e){toast(e.message||'Non riuscito');b.disabled=false;}});
    card.querySelectorAll('[data-sh]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await socRpc('world_shout',{p_to:uid,p_code:+b.dataset.sh});toast((r.ok?'💬 ':'')+r.msg);}catch(e){toast(e.message);}setTimeout(()=>b.disabled=false,1500);});});}
/* ---------------- barra: 👥 Superstiti al posto di Io; Io sull'avatar in alto ---------------- */
ICON.social='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="8.5" cy="8" r="3.3"/><circle cx="16.5" cy="9" r="2.7"/><path d="M2.5 20c0-3.6 2.7-6 6-6s6 2.4 6 6M14 14.6c3.4-.4 7 1.4 7 5"/></svg>';
NAV_ACT.social='social';NAV_ACT.io='io';
function renderNavBase(){try{document.body.dataset.tab=S.tab;}catch(e){}const items=[['home','Home'],['mappa','Mondo'],['social','Superstiti']];/* Fase 13a: Mappa e Orda unite in 🌍 Mondo (p75) */const act=NAV_ACT[S.tab]||S.tab;
  $('#nav').innerHTML=items.map(([k,l])=>`<button class="${act===k?'on':''}" data-tab="${k}" aria-label="${l}">${ICON[k==='mappa'?'mondo':k]}<span>${l}</span></button>`).join('');
  $('#nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{try{vibe();}catch(e){}go(b.dataset.tab);});socBadge();ioBtn();}
/* in Casa: le novità dei superstiti, per entrarci ogni giorno */
const _renderHomeSoc=renderHome;renderHome=function(){_renderHomeSoc();try{if(!S.user||!S.result||app.querySelector('.hsoc'))return;const after=app.querySelector('.hval')||app.querySelector('.hcard');if(!after)return;
  const L=(SOC.feed.zona||SOC.feed.mondo||[]).slice(0,3);
  after.insertAdjacentHTML('afterend',`<div class="panel hsoc"><div class="row spread"><b class="disp" style="font-size:20px">👥 Dai superstiti</b><button class="btn ghost small" data-hsoc>Apri</button></div>${L.length?L.map(socLine).join(''):'<p class="muted" style="font-size:12.5px">Qui vedi chi entra, compra, chiede aiuto o ti saluta.</p>'}</div>`);
  app.querySelector('[data-hsoc]').onclick=()=>go('social');if(!SOC.feed.zona){SOC.scope='zona';socLoad('feed').then(()=>{if(S.tab==='home'&&SOC.feed.zona&&SOC.feed.zona.length){const h=app.querySelector('.hsoc');if(h)h.remove();renderHome();}});}}catch(e){}};

/* ---------------- ⭐ SPONSOR SULLA MAPPA, FATTI BENE ---------------- */
/* 1) gli sponsor senza segnaposto prendono la posizione dal loro indirizzo */
(async function spFixGeo(){try{const sb=await waitSB();if(!sb)return;const{data}=await sb.from('sponsors').select('id,name,slug,address,comune,lat,lon').eq('active',true);if(!data)return;
  let ch=false;for(const r of data){const k=r.slug||slugify(r.name);if(!SPONSORS[k]||(SP_GEO[k]&&SP_GEO[k].lat!=null))continue;const q=[r.address,r.comune].filter(Boolean).join(', ');if(!q)continue;
    let g=null;try{g=JSON.parse(localStorage.getItem('zsh_spg_'+r.id)||'null');}catch(e){}
    if(!g){try{const w=await lmGeocode(q);g={lat:w.lat,lon:w.lon};localStorage.setItem('zsh_spg_'+r.id,JSON.stringify(g));}catch(e){continue;}}
    SP_GEO[k]=Object.assign(SP_GEO[k]||{id:r.id},{lat:g.lat,lon:g.lon});ch=true;}
  if(ch)(window.__zlms||[]).forEach(lm=>{try{spDraw(lm);}catch(e){}});}catch(e){}})();
/* 2) segnaposto grandi: logo, nome, offerta; sempre sopra agli altri; ridisegnati quando arrivano i dati */
const spOFF=()=>typeof SP_OFF!=='undefined'?SP_OFF:{},spCAT=()=>typeof SP_CAT!=='undefined'?SP_CAT:{};
function spShortOff(k){const o=spOFF()[k]||'';const m=o.match(/-?\s?\d+\s?%/);return m?('−'+m[0].replace(/[-\s]/g,'')):o?'Offerta':'';}
function spDraw(lm){if(!lm||!lm.map)return;(lm._sp2||[]).forEach(x=>x.remove());lm._sp2=[];const z=S.zone||{seed:7};
  Object.entries(window.SP_GEO||{}).forEach(([k,g])=>{if(!g||g.lat==null||!SPONSORS[k])return;const off=spShortOff(k);
    const el=elDiv('lm-sp2',`<div class="sp2"><b>${esc(SPONSORS[k].logo)}</b><span class="spn">${esc(SPONSORS[k].name.slice(0,22))}</span>${off?`<span class="spo">${esc(off)}</span>`:''}</div><i class="spp"></i>`);
    el.style.zIndex='6';el.addEventListener('click',e=>{e.stopPropagation();try{dbEvent&&dbEvent(k,'map_tap');}catch(x){}sponsorSheet(k,z);});
    lm._sp2.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([g.lon,g.lat]).addTo(lm.map));});}
/* 3) elenco degli sponsor per distanza, con "portami lì" */
/* i dati degli sponsor arrivati dopo: ridisegno senza ricaricare la pagina */
(function(){let last='';zEvery(()=>{try{const sig=Object.entries(window.SP_GEO||{}).map(([k,g])=>k+(g&&g.lat)).join('|');if(sig!==last){last=sig;(window.__zlms||[]).forEach(lm=>spDraw(lm));}}catch(e){}},3000);})();
/* nella Mappa: pulsante "⭐ Sponsor" con l'elenco, accanto a "⋯" */
/* i giocatori sulla mappa (filtro 🤝): toccandoli si apre la loro scheda */
document.addEventListener('click',e=>{const m=e.target.closest&&e.target.closest('.lm-usr');if(!m)return;const id=m.dataset.uid;if(id&&S.user){e.stopPropagation();playerSheet(id);}},true);
S.mf=S.mf||{};if(S.mf.all===false&&!S.mfAllSet){S.mf.all=true;S.mfAllSet=1;}
/* Io: niente più voce nella barra; ci si arriva dall'avatar in alto */
setTimeout(()=>{try{renderNav();}catch(e){}},300);
</script>
