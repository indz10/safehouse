<script>
/* =========================================================
   🏢 IL CONDOMINIO CON PIÙ GIOCATORI (migrazione 013, scelte di Alessandro 14/11)
   - difese comuni: il bonus vale solo per chi ha versato negli ultimi 30 giorni (avviso se non hai versato)
   - 🏅 Amministratore: chi ha versato di più nel mese; elenco di chi ha versato
   - vicini di altri appartamenti: "😈 Rompi" (diventate rivali) / "🕊️ Fai pace" (o proponila), anche dalla scheda del giocatore
   Chiamate: cdExtra(box) da abitMount (p55) dopo il riquadro delle difese; cdPlayer(uid) da playerSheet (p66).
   ========================================================= */
const CDI={d:null,t:0};
async function cdLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return null;if(!force&&CDI.d&&Date.now()-CDI.t<30000)return CDI.d;
  try{const{data,error}=await SB.rpc('world_condo_info');if(error)throw error;CDI.d=data;CDI.t=Date.now();}catch(e){CDI.d=null;}return CDI.d;}
function cdVicinoHTML(v){return`<div class="cdv ${v.rotto?'rotto':''}"><span class="sav">${esc((v.nick||'?')[0].toUpperCase())}</span><div><b>@${esc(v.nick||'')}</b><small>${v.unit?'interno '+esc(v.unit)+' · ':''}${v.rotto?(v.rotto_da_me?'😈 hai rotto tu: siete rivali':'😈 ha rotto con te: siete rivali'):'🤝 alleati'}${v.pace_chiesta?' · 🕊️ pace proposta':''}</small></div>
  ${v.puo_rompere?(v.rotto?`<button class="btn small" data-cdpace="${esc(v.user_id)}">🕊️ ${v.rotto_da_me?'Fai pace':'Proponi pace'}</button>`:`<button class="btn small ghost" data-cdrompi="${esc(v.user_id)}" data-n="${esc(v.nick||'')}">😈 Rompi</button>`):'<small class="muted">stesso appartamento</small>'}</div>`;}
async function cdRompi(uid,nick){if(!confirm(`Rompere con @${nick}? Non sarete più alleati (niente rinforzi tra voi) e potrete mandarvi orde come rivali. Potrai fare pace quando vuoi.`))return false;
  try{const{data,error}=await SB.rpc('world_condo_break',{p_user:uid});if(error)throw error;toast((data.ok?'😈 ':'')+data.msg);CDI.t=0;try{alsLoad&&alsLoad(true);}catch(e){}return data.ok;}catch(e){toast(e.message||'Non riuscito');return false;}}
async function cdPace(uid){try{const{data,error}=await SB.rpc('world_condo_peace',{p_user:uid});if(error)throw error;toast((data.ok?'🕊️ ':'')+data.msg);CDI.t=0;try{alsLoad&&alsLoad(true);}catch(e){}return data.ok;}catch(e){toast(e.message||'Non riuscito');return false;}}
async function cdExtra(b,redo){const p=b&&b.querySelector('.cdpan');if(!p)return;const d=await cdLoad(true);if(!d||!d.ok)return;
  const ad=d.admin;const vers=d.versati||[];
  p.insertAdjacentHTML('afterbegin',`<div class="cdadm">${ad?`<span>🏅</span><div><b>Amministratore: @${esc(ad.nick||'')}</b><small>ha versato 🧱 ${wNum(ad.tot)} negli ultimi 30 giorni${ad.user_id===S.user.id?' · sei tu!':''}</small></div>`:'<span>🏅</span><div><b>Nessun amministratore</b><small>Chi versa di più nel mese diventa amministratore del palazzo.</small></div>'}</div>
    ${d.me_tot>0?`<p class="cdok">✅ Hai versato 🧱 ${wNum(d.me_tot)} nel mese: le difese comuni proteggono la tua casa (+${d.bonus}).</p>`:'<p class="cdko">⚠️ Non hai versato nel mese: le difese del palazzo <b>non proteggono</b> la tua casa. Basta versare almeno 🧱 10.</p>'}`);
  if(vers.length>1)p.insertAdjacentHTML('beforeend',`<small class="muted">Classifica del mese: ${vers.map((v,i)=>`${i===0?'🏅':''}@${esc(v.nick||'')} ${wNum(v.tot)}`).join(' · ')}</small>`);
  if((d.vicini||[]).length){p.insertAdjacentHTML('beforeend',`<h4 class="hh" style="margin-top:10px">🚪 I vicini del palazzo</h4><div class="cdvs">${d.vicini.map(cdVicinoHTML).join('')}</div>`);
    p.querySelectorAll('[data-cdrompi]').forEach(x=>x.onclick=async()=>{if(await cdRompi(x.dataset.cdrompi,x.dataset.n)&&redo)redo();});
    p.querySelectorAll('[data-cdpace]').forEach(x=>x.onclick=async()=>{if(await cdPace(x.dataset.cdpace)&&redo)redo();});}}
/* scheda del giocatore: se è un vicino di condominio, Rompi / Fai pace */
async function cdPlayer(uid){if(!S.user||uid===S.user.id)return;const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('[data-cdpr]'))return;
  const d=await cdLoad();if(!d||!d.ok)return;const v=(d.vicini||[]).find(x=>x.user_id===uid);if(!v||!v.puo_rompere)return;const c2=document.querySelector('#sheet.open .sheet-b');if(!c2||c2.querySelector('[data-cdpr]'))return;
  const ac=c2.querySelector('.placts')||c2;ac.insertAdjacentHTML('beforeend',`<div class="cdpr" data-cdpr><b>🏢 Vicino di condominio</b><small>${v.rotto?'Avete rotto: siete rivali.':'Siete alleati perché abitate nello stesso palazzo.'}</small>${v.rotto?`<button class="btn small" data-cdp2>🕊️ ${v.rotto_da_me?'Fai pace':'Proponi pace'}</button>`:'<button class="btn small ghost" data-cdr2>😈 Rompi con il vicino</button>'}</div>`);
  const r=c2.querySelector('[data-cdr2]');if(r)r.onclick=async()=>{if(await cdRompi(uid,v.nick))playerSheet(uid);};
  const pz=c2.querySelector('[data-cdp2]');if(pz)pz.onclick=async()=>{if(await cdPace(uid))playerSheet(uid);};}
</script>
