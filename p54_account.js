<script>
/* =========================================================
   ACCOUNT SEPARATI SULLO STESSO TELEFONO + CHI VIVE NELLA MIA CASA
   - entrando con un account diverso dal precedente, i dati del vecchio si cancellano dal telefono
     PRIMA che possano finire nel nuovo (prima venivano copiati nel nuovo account)
   - "Esci" cancella anche i dati di gioco salvati sul telefono (restano nel cloud del proprio account)
   - pagina della casa vera: "🏢 Chi vive qui" (coinquilini, anche in conferma)
   ========================================================= */
const OWN_K='zsh_owner';
/* durante il cambio di account e l'uscita non si salva più niente sul telefono */
const _saveLocalAc=saveLocal;saveLocal=function(){if(window.__noSave)return;return _saveLocalAc.apply(this,arguments);};
try{const _pushAc=pushCloud;pushCloud=async function(){if(window.__noSave)return;return _pushAc.apply(this,arguments);};}catch(e){}
function zWipeLocal(){window.__noSave=true;try{const keep=/^(zsh_snd|zsh_music|zsh_mute|zsh_rm2_|zsh_att_|zsh_spg_|zsh_inv$|zsh_bv_done)/;Object.keys(localStorage).forEach(k=>{if(/^zsh/.test(k)&&!keep.test(k))localStorage.removeItem(k);});}catch(e){}}
const _onLoginAc=onLogin;onLogin=async function(u,fresh){try{const prev=localStorage.getItem(OWN_K);
  if(prev&&u&&prev!==u.id){zWipeLocal();localStorage.setItem(OWN_K,u.id);sessionStorage.setItem('zsh_switched','1');location.reload();return;}
  if(u)localStorage.setItem(OWN_K,u.id);}catch(e){}return _onLoginAc.apply(this,arguments);};
(function(){try{if(sessionStorage.getItem('zsh_switched')){sessionStorage.removeItem('zsh_switched');setTimeout(()=>{try{toast('🔄 Account cambiato: dati del telefono separati');}catch(e){}},1500);}}catch(e){}})();
const _zLogoutAc=zLogout;zLogout=async function(){try{if(typeof pushCloud==='function')await Promise.race([pushCloud(),new Promise(r=>setTimeout(r,1500))]);}catch(e){}zWipeLocal();return _zLogoutAc.apply(this,arguments);};
/* ---- chi vive nella mia casa ---- */
async function coresHTML(){let L=[];try{const{data,error}=await SB.rpc('world_coresidents');if(error)throw error;L=data||[];}catch(e){return`<p class="muted" style="font-size:12.5px">Non disponibile (${esc(e.message||'')}). Esegui il file residenti.sql su Supabase.</p>`;}
  if(!L.length)return'<p class="muted" style="font-size:12.5px">Per ora abiti qui solo tu. Se vivi con qualcuno (famiglia, coinquilini, vicini di condominio), invitalo: diventate coinquilini e vi date +3 di difesa a testa.</p>';
  return L.map(r=>`<div class="alrow"><span class="sav">${esc((r.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(r.nick)}</b><small>${r.status==='pending'?'⏳ casa in conferma':'🏠 abita qui'} · ${agoTxt(r.seen_at)}${r.ally?' · 🤝 alleato':''}</small></div>
    <div class="alacts" style="width:auto"><button class="btn small ghost" data-crm="${r.user_id}" data-n="${esc(r.nick)}">💬 Scrivi</button>${r.ally?'':`<button class="btn small" data-cra="${r.user_id}">🤝 Alleanza</button>`}</div></div>`).join('');}
const _houseSheetAc=houseSheet;houseSheet=async function(h){await _houseSheetAc(h);try{if(!h.home)return;const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.crpan'))return;
  const at=c.querySelector('.hpreal')||c.querySelector('.fortpan');const box=document.createElement('div');box.className='crpan';box.innerHTML='<h4 class="hh">🏢 Chi vive qui</h4><div class="crbox"><p class="muted"><span class="spin"></span></p></div>';
  if(at)at.after(box);else c.appendChild(box);const b=box.querySelector('.crbox');b.innerHTML=await coresHTML();
  b.querySelectorAll('[data-crm]').forEach(x=>x.onclick=()=>dmSheet(x.dataset.crm,x.dataset.n));
  b.querySelectorAll('[data-cra]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const r=await socRpc('world_ally_request',{p_target:x.dataset.cra});toast(r&&r.msg?r.msg:'🤝 Richiesta inviata');}catch(e){toast(e.message||'Non riuscito');x.disabled=false;}});}catch(e){console.warn(e);}};
</script>
