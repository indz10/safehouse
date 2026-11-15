<script>
/* =========================================================
   💬 MESSAGGI DA OVUNQUE (richiesta di Alessandro 15/11)
   - "💬" nella barra delle scorte del Mondo (con i non letti) e "💬 Messaggi" nel menu ☰ → msgHub:
     📬 Conversazioni (world_dm_threads) · 🤝 Alleati · 🔤 Cerca un superstite (world_find) + ⭐ preferiti
   - 💬 accanto a ogni alleato (Orda, elenco dalla mappa), nei risultati di Trova superstiti, nella scheda di una
     casa comprata o di un presidio di un altro ("💬 Scrivi a @nome"), oltre al profilo del giocatore e alla casa
     abitata da chi si conosce (alleati, coinquilini, chi si mostra a tutti).
   - ogni pulsante con data-dmr="<id>" data-n="<nome>" apre la chat (dmSheet di p49).
   Per la privacy non si scrive a chi abita in una casa sconosciuta: il suo nome resta nascosto.
   ========================================================= */
const MSG={n:0,t:0,L:null,tab:'conv'};
async function msgCount(){if(!S.user||typeof SB==='undefined'||!SB)return 0;try{const{data,error}=await SB.rpc('world_dm_threads');if(!error){MSG.L=data||[];MSG.n=MSG.L.reduce((a,t)=>a+(+t.unread||0),0);MSG.t=Date.now();}}catch(e){}return MSG.n;}
/* un tocco su qualsiasi 💬 apre la chat (prima degli altri tocchi sulla riga) */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-dmr]');if(!b)return;e.stopPropagation();e.preventDefault();
  if(!S.user){toast('Accedi per scrivere');return;}window.SHEET_BACK=b.closest('.msgbox')?{t:'‹ Messaggi',fn:()=>msgHub(MSG.tab)}:null;dmSheet(b.dataset.dmr,b.dataset.n);},true);
const msgRow=(uid,nick,sub,un)=>`<button class="dmt ${un?'un':''}" data-dmr="${esc(uid)}" data-n="${esc(nick||'')}"><span class="sav">${esc((nick||'?')[0].toUpperCase())}</span><div><b>@${esc(nick||'superstite')}${un?` · ${un} nuovi`:''}</b><small>${sub||''}</small></div><i>💬</i></button>`;
async function msgHub(tab){if(!S.user){toast('Accedi per i messaggi');try{loginSheet();}catch(e){}return;}if(tab==='alz'){window.SHEET_BACK={t:'‹ Messaggi',fn:()=>msgHub('conv')};return alzChat();}MSG.tab=tab||MSG.tab||'conv';if(MSG.tab==='alz')MSG.tab='conv';
  const tabs=`<div class="hkvb trtabs"><button data-mst="conv" class="${MSG.tab==='conv'?'on':''}">📬 Conversazioni${MSG.n?` (${MSG.n})`:''}</button><button data-mst="alz" class="${MSG.tab==='alz'?'on':''}">🛡️ Alleanza</button><button data-mst="al" class="${MSG.tab==='al'?'on':''}">🤝 Alleati</button><button data-mst="cerca" class="${MSG.tab==='cerca'?'on':''}">🔤 Cerca</button></div>`;
  openSheet('💬 Messaggi',tabs+'<div class="msgbox"><p><span class="spin"></span></p></div>',c=>c.querySelectorAll('[data-mst]').forEach(b=>b.onclick=()=>msgHub(b.dataset.mst)));
  const box=document.querySelector('#sheet.open .msgbox');if(!box)return;let h='';
  if(MSG.tab==='conv'){await msgCount();const L=MSG.L||[];
    h=L.length?L.map(t=>msgRow(t.user_id,t.nick,`${esc(t.last_body||'')} · ${socAgo(t.last_at)}`,+t.unread||0)).join(''):'<p class="muted">Nessuna conversazione. Scrivi a un alleato, cerca un superstite per nome, oppure tocca 💬 sulla casa o sul presidio di qualcuno.</p>';}
  else if(MSG.tab==='al'){let A=[];try{A=await alsLoad(true)||[];}catch(e){}
    h=A.length?A.map(a=>msgRow(a.user_id,a.nick,`${a.prepared?'🟢 pronto':'🔴 non pronto'}${a.asked?' · 🆘 chiede aiuto':''}`)).join(''):'<p class="muted">Non hai ancora alleati: cercane uno qui accanto (🔤 Cerca) o invita un amico.</p>';}
  else{let F=[];try{F=await trFavLoad(true)||[];}catch(e){}
    h=`<div class="row" style="gap:8px;margin:6px 0 10px"><input class="field" id="msgQ" placeholder="Nome del superstite (almeno 2 lettere)" autocomplete="off" style="flex:1;min-width:0"><button class="btn small" data-msq>Cerca</button></div><div class="msgres"></div>
      ${F.length?`<h4 class="hh">⭐ I tuoi preferiti</h4>${F.map(f=>msgRow(f.user_id,f.nick,f.comune?esc(f.comune):'')).join('')}`:''}`;}
  if(!box.isConnected)return;box.innerHTML=h;
  const q=box.querySelector('#msgQ');if(q){const go_=async()=>{const v=q.value.trim();const r=box.querySelector('.msgres');if(v.length<2){r.innerHTML='<p class="muted">Scrivi almeno 2 lettere.</p>';return;}
      r.innerHTML='<p><span class="spin"></span></p>';let L=[];try{L=await socRpc('world_find',{p_q:v})||[];}catch(e){}
      r.innerHTML=L.length?L.map(x=>msgRow(x.user_id,x.nick,`livello ${x.wlevel||1}${x.comune?' · '+esc(x.comune):''}`)).join(''):'<p class="muted">Nessuno con questo nome.</p>';};
    box.querySelector('[data-msq]').onclick=go_;q.onkeydown=e=>{if(e.key==='Enter')go_();};}}
/* chiudendo la chat da "Messaggi" si torna all'elenco con il pulsante ‹ Messaggi; il conto dei non letti ogni minuto nel Mondo */
zEvery(()=>{try{if(document.hidden||!S.user)return;if(['mappa','orda','social'].includes(S.tab)&&Date.now()-MSG.t>60000)msgCount().then(()=>{try{trrRepaint();}catch(e){}});}catch(e){}},5000,'messaggi');
</script>
