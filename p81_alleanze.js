<script>
/* =========================================================
   🛡️ ALLEANZE A GRUPPI (migrazione 018, richiesta di Alessandro 15/11)
   - riquadro "🛡️ La tua alleanza" in cima ai Superstiti (alzCard, chiamato da renderSocial in p66) e voce nel menu ☰
   - si entra solo con il VOTO dei 3 membri più attivi (tutti se sono meno di 3); un invito lo accetta anche l'invitato
   - serve una casa entro 50 km dalla casa di un membro; max 20 membri; un'alleanza a testa
   - 💬 chat dell'alleanza (alzChat) e tab nei Messaggi; 🏆 classifica delle alleanze nei Superstiti (p26)
   ========================================================= */
const ALZ={d:null,t:0,last:0};
const ALZ_EMB=['🛡️','🐺','🦅','🔥','⚔️','🏰','🦁','🐻','☢️','🧟'];
async function alzLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return null;if(!force&&ALZ.d&&Date.now()-ALZ.t<30000)return ALZ.d;
  try{const{data,error}=await SB.rpc('world_alleanza_info');if(!error&&data&&data.ok!==false){ALZ.d=data;ALZ.t=Date.now();}}catch(e){}return ALZ.d;}
const alzRpc=async(fn,a)=>{const{data,error}=await SB.rpc(fn,a||{});if(error)throw error;return data;};
function alzCardHTML(d){if(!d)return'<p class="muted" style="font-size:13px">🛡️ Alleanze: serve il blocco SQL 018.</p>';const A=d.alleanza;
  const inv=(d.inviti||[]).map(i=>`<div class="alzinv"><span>📨</span><div><b>@${esc(i.da||'')} ti invita in ${esc(i.emblema)} ${esc(i.alleanza)}</b><small>${i.membri} membri · dopo il tuo sì votano i membri più attivi</small></div>
    <button class="btn small" data-alzr="${i.id}" data-si="1">✅</button><button class="btn small ghost" data-alzr="${i.id}" data-si="0">✖</button></div>`).join('');
  if(!A)return`${inv}<div class="alzhead"><span>🛡️</span><div><b>Non sei in un’alleanza</b><small>Un gruppo di superstiti vicini (entro 50 km) che si difende insieme. Si entra col voto dei 3 membri più attivi.</small></div></div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn small" data-alzv>🔎 Alleanze vicine</button><button class="btn small ghost" data-alzc>🛡️ Fondane una</button></div>
    ${(d.mie_richieste||[]).map(r=>`<p class="muted" style="font-size:12.5px;margin:6px 0 0">🗳️ Hai chiesto di entrare in ${esc(r.emblema)} ${esc(r.alleanza)}: ${r.si}/${r.votanti} sì</p>`).join('')}`;
  const nv=(d.da_votare||[]).length;
  return`${inv}<div class="alzhead"><span>${esc(A.emblema)}</span><div><b>${esc(A.nome)}</b><small>${A.membri.length} ${A.membri.length===1?'membro':'membri'} · 👑 @${esc(A.capo_nick||'')}</small></div></div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn small" data-alzchat>💬 Chat</button><button class="btn small ${nv?'':'ghost'}" data-alzs>👥 Membri${nv?` · 🗳️ ${nv} da votare`:''}</button><button class="btn small ghost" data-alzi>📨 Invita</button></div>`;}
function alzBind(c){if(!c)return;
  c.querySelectorAll('[data-alzr]').forEach(b=>b.onclick=()=>alzAct('world_alleanza_risposta',{p_id:+b.dataset.alzr,p_si:b.dataset.si==='1'},b));
  const v=c.querySelector('[data-alzv]');if(v)v.onclick=alzVicine;const cr=c.querySelector('[data-alzc]');if(cr)cr.onclick=alzCrea;
  const ch=c.querySelector('[data-alzchat]');if(ch)ch.onclick=()=>{window.SHEET_BACK=null;alzChat();};const s=c.querySelector('[data-alzs]');if(s)s.onclick=()=>{window.SHEET_BACK=null;alzSheet();};
  const i=c.querySelector('[data-alzi]');if(i)i.onclick=alzInvita;}
async function alzAct(fn,a,b,dopo){if(b)b.disabled=true;try{const r=await alzRpc(fn,a);toast((r&&r.msg)||'Fatto');if(r&&r.ok!==false){ALZ.t=0;await alzLoad(true);try{alsLoad&&alsLoad(true);}catch(e){}alzCardPaint();if(dopo)dopo();}else if(b)b.disabled=false;}
  catch(e){toast('Non riuscito: '+(/world_alleanz|function/.test(e.message||'')?'serve il blocco SQL 018':(e.message||e)));if(b)b.disabled=false;}}
/* riquadro in cima ai Superstiti */
async function alzCard(){if(!S.user||S.tab!=='social')return;const pg=app.querySelector('.page')||app.firstElementChild;if(!pg)return;
  let c=pg.querySelector('.alzcard');if(!c){const at=pg.querySelector('[data-trova]')||pg.querySelector('.shead');if(!at)return;at.insertAdjacentHTML('afterend','<div class="panel alzcard"><p class="muted"><span class="spin"></span> La tua alleanza…</p></div>');c=pg.querySelector('.alzcard');}
  const d=await alzLoad();if(!c.isConnected)return;c.innerHTML=alzCardHTML(d);alzBind(c);}
function alzCardPaint(){const c=app.querySelector('.alzcard');if(c){c.innerHTML=alzCardHTML(ALZ.d);alzBind(c);}}
/* membri, votazioni, uscita */
async function alzSheet(){openSheet('🛡️ La tua alleanza','<p><span class="spin"></span></p>',()=>{});const d=await alzLoad(true);const A=d&&d.alleanza;if(!A){openSheet('🛡️ Alleanza',alzCardHTML(d),alzBind);return;}
  const V=d.votanti||A.votanti||[];
  openSheet(`${esc(A.emblema)} ${esc(A.nome)}`,`${(d.da_votare||[]).length?`<h4 class="hh">🗳️ Tocca a te votare</h4>${d.da_votare.map(q=>`<div class="alzvote"><div><b>@${esc(q.nick)}</b><small>${q.tipo==='invito'?`invitato da @${esc(q.da||'')}${q.candidato_ok?'':' · non ha ancora accettato'}`:'chiede di entrare'} · livello ${q.wlevel}${q.dist_km!=null?` · a ${String(q.dist_km).replace('.',',')} km da te`:''} · sì ${q.si}/${q.votanti}</small></div>
      <button class="btn small" data-alzvo="${q.id}" data-si="1">✅ Sì</button><button class="btn small ghost" data-alzvo="${q.id}" data-si="0">❌ No</button></div>`).join('')}`:''}
    <h4 class="hh">👥 Membri (${A.membri.length}/20)</h4>
    ${A.membri.map(m=>`<div class="alzmem"><span class="sav">${esc((m.nick||'?')[0].toUpperCase())}</span><div><b>@${esc(m.nick)}${m.user_id===A.capo?' 👑':''}${V.includes(m.user_id)?' 🗳️':''}${m.me?' · tu':''}</b><small>livello ${m.wlevel} · ${m.attivita} giorni di gioco su 30</small></div>${m.me?'':`<button class="btn small ghost" data-dmr="${esc(m.user_id)}" data-n="${esc(m.nick)}">💬</button>`}</div>`).join('')}
    <p class="muted" style="font-size:12px">🗳️ = i 3 membri più attivi: votano chi entra. 👑 = chi l’ha fondata (passa al più attivo se esce).</p>
    ${(d.in_corso||[]).length?`<h4 class="hh">⏳ Votazioni in corso</h4>${d.in_corso.map(q=>`<p class="muted" style="font-size:12.5px;margin:2px 0">@${esc(q.nick)} · ${q.tipo==='invito'?'invitato':'chiede di entrare'} · sì ${q.si}/${q.votanti}${q.candidato_ok?'':' · aspetta che accetti'}</p>`).join('')}`:''}
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-alzchat>💬 Chat dell’alleanza</button><button class="btn ghost small" data-alzi>📨 Invita</button><button class="btn ghost small" data-alzx>🚪 Esci</button></div>`,
    c=>{c.querySelectorAll('[data-alzvo]').forEach(b=>b.onclick=()=>alzAct('world_alleanza_vota',{p_id:+b.dataset.alzvo,p_si:b.dataset.si==='1'},b,alzSheet));
      c.querySelector('[data-alzchat]').onclick=()=>{window.SHEET_BACK={t:'‹ Alleanza',fn:alzSheet};alzChat();};c.querySelector('[data-alzi]').onclick=alzInvita;
      c.querySelector('[data-alzx]').onclick=()=>{if(confirm('Uscire dall’alleanza? Per rientrare servirà di nuovo il voto.'))alzAct('world_alleanza_esci',{},null,closeSheet);};});}
/* fondare */
function alzCrea(){let emb='🛡️';openSheet('🛡️ Fonda un’alleanza',`<p class="muted" style="font-size:13px;margin:0 0 8px">Ne sarai il capo. Poi inviti i superstiti con una casa entro 50 km: per entrare li votano i 3 membri più attivi.</p>
    <input class="field" id="alzN" maxlength="30" placeholder="Nome dell’alleanza (es. Lupi di Volta)"><div class="alzemb">${ALZ_EMB.map(e=>`<button data-e="${e}" class="${e===emb?'on':''}">${e}</button>`).join('')}</div>
    <button class="btn wide" data-alzok>🛡️ Fonda</button>`,c=>{c.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{emb=b.dataset.e;c.querySelectorAll('[data-e]').forEach(x=>x.classList.toggle('on',x===b));});
    c.querySelector('[data-alzok]').onclick=e=>alzAct('world_alleanza_crea',{p_nome:c.querySelector('#alzN').value,p_emblema:emb},e.target,alzSheet);});}
/* alleanze vicine */
async function alzVicine(){openSheet('🔎 Alleanze vicine','<p><span class="spin"></span> Cerco le alleanze entro 50 km…</p>',()=>{});let L=[];try{L=await alzRpc('world_alleanze_vicine')||[];}catch(e){}
  openSheet('🔎 Alleanze vicine',L.length?`<p class="muted" style="font-size:13px;margin:0 0 8px">Alleanze con un membro entro 50 km da una tua casa. Chiedi di entrare: votano i 3 membri più attivi.</p>${L.map(a=>`<div class="alzmem"><span class="sav">${esc(a.emblema)}</span><div><b>${esc(a.nome)}</b><small>${a.membri} membri · 👑 @${esc(a.capo||'')} · a ${String(a.dist_km).replace('.',',')} km</small></div>
      ${a.chiesto?'<i>🗳️ chiesto</i>':`<button class="btn small" data-alzj="${a.id}">Chiedi di entrare</button>`}</div>`).join('')}`:'<p class="notice">Nessuna alleanza entro 50 km: fondane una tu e invita i vicini.</p><button class="btn" data-alzc2>🛡️ Fonda un’alleanza</button>',
    c=>{c.querySelectorAll('[data-alzj]').forEach(b=>b.onclick=()=>alzAct('world_alleanza_chiedi',{p_aid:+b.dataset.alzj},b,alzVicine));const f=c.querySelector('[data-alzc2]');if(f)f.onclick=alzCrea;});}
/* invitare: per nome o dai preferiti (deve avere una casa entro 50 km da un membro) */
async function alzInvita(){let F=[];try{F=await trFavLoad(true)||[];}catch(e){}
  openSheet('📨 Invita nell’alleanza',`<p class="muted" style="font-size:13px;margin:0 0 8px">Puoi invitare chi ha una casa entro 50 km da un membro. Dopo il suo sì votano i 3 membri più attivi.</p>
    <div class="row" style="gap:8px"><input class="field" id="alzQ" placeholder="Nome del superstite" style="flex:1;min-width:0"><button class="btn small" data-alzq>Cerca</button></div><div class="alzres"></div>
    ${F.length?`<h4 class="hh">⭐ Preferiti</h4>${F.map(f=>`<div class="alzmem"><span class="sav">${esc((f.nick||'?')[0].toUpperCase())}</span><div><b>@${esc(f.nick)}</b><small>${f.comune?esc(f.comune):''}</small></div><button class="btn small" data-alzu="${esc(f.user_id)}">📨 Invita</button></div>`).join('')}`:''}`,
    c=>{const bind=()=>c.querySelectorAll('[data-alzu]').forEach(b=>b.onclick=()=>alzAct('world_alleanza_invita',{p_user:b.dataset.alzu},b));bind();
      const go_=async()=>{const v=c.querySelector('#alzQ').value.trim();const r=c.querySelector('.alzres');if(v.length<2)return;r.innerHTML='<p><span class="spin"></span></p>';let L=[];try{L=await socRpc('world_find',{p_q:v})||[];}catch(e){}
        r.innerHTML=L.length?L.map(x=>`<div class="alzmem"><span class="sav">${esc((x.nick||'?')[0].toUpperCase())}</span><div><b>@${esc(x.nick)}</b><small>livello ${x.wlevel||1}${x.comune?' · '+esc(x.comune):''}</small></div><button class="btn small" data-alzu="${esc(x.user_id)}">📨 Invita</button></div>`).join(''):'<p class="muted">Nessuno con questo nome.</p>';bind();};
      c.querySelector('[data-alzq]').onclick=go_;c.querySelector('#alzQ').onkeydown=e=>{if(e.key==='Enter')go_();};});}
/* 💬 chat dell'alleanza */
async function alzChat(){const d=await alzLoad();const A=d&&d.alleanza;if(!A){toast('Non sei in un’alleanza');return alzSheet();}
  const draw=async()=>{let L=[];try{L=await alzRpc('world_alleanza_chat',{p_after:0})||[];}catch(e){}
    const html=L.length?L.map(m=>`<div class="dmm ${m.mine?'mine':''}">${m.mine?'':`<b class="alzwho">@${esc(m.nick)}</b>`}<span>${esc(m.body)}</span><small>${socAgo(m.created_at)}</small></div>`).join(''):'<p class="muted" style="font-size:13px">Nessun messaggio: scrivi per primo alla tua alleanza!</p>';
    const box=document.querySelector('#sheet.open .dmlist[data-alz]');if(box){if(box.dataset.n!==String(L.length)){box.innerHTML=html;box.dataset.n=L.length;box.scrollTop=box.scrollHeight;}return;}
    openSheet(`💬 ${esc(A.emblema)} ${esc(A.nome)}`,`<div class="dmlist" data-alz="1" data-n="${L.length}">${html}</div>
      <div class="dmin"><input class="field" id="alzT" maxlength="500" placeholder="Scrivi all’alleanza…" autocomplete="off"><button class="btn" data-alzsend>Invia</button></div>
      <div class="dmq">${['Stasera tutti a preparare! 🛡️','Chi viene a fare la guardia al presidio? 💂','Mi stanno assaltando: aiuto! ⚔️','Assaltiamo insieme? 🏴','Grazie a tutti! 🙏'].map(q=>`<button data-alzq2="${esc(q)}">${esc(q)}</button>`).join('')}</div>`,
      c=>{const l=c.querySelector('.dmlist');l.scrollTop=l.scrollHeight;const inp=c.querySelector('#alzT');
        const send=async t=>{const b=(t||inp.value).trim();if(!b)return;try{const r=await alzRpc('world_alleanza_scrivi',{p_body:b});if(r&&r.ok===false){toast(r.msg);return;}inp.value='';draw();}catch(e){toast('Non inviato');}};
        c.querySelector('[data-alzsend]').onclick=()=>send();inp.onkeydown=e=>{if(e.key==='Enter')send();};c.querySelectorAll('[data-alzq2]').forEach(b=>b.onclick=()=>send(b.dataset.alzq2));});};
  await draw();clearInterval(ALZ.timer);ALZ.timer=setInterval(()=>{if(!document.querySelector('#sheet.open .dmlist[data-alz]')){clearInterval(ALZ.timer);return;}draw();},4000);}
/* nei Superstiti il riquadro compare da solo */
zEvery(()=>{try{if(document.hidden||!S.user||S.tab!=='social')return;if(!app.querySelector('.alzcard'))alzCard();}catch(e){}},1500,'alleanza');
</script>
