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
function zWipeLocal(){window.__noSave=true;try{const keep=/^(zsh_snd|zsh_music|zsh_mute|zsh_rm2_|zsh_att_|zsh_spg_|zsh_inv$|zsh_bv_done)/;Object.keys(localStorage).forEach(k=>{if(/^zsh/.test(k)&&!keep.test(k))localStorage.removeItem(k);});}catch(e){}}
(function(){try{if(sessionStorage.getItem('zsh_switched')){sessionStorage.removeItem('zsh_switched');setTimeout(()=>{try{toast('🔄 Account cambiato: dati del telefono separati');}catch(e){}},1500);}}catch(e){}})();
const _zLogoutAc=zLogout;zLogout=async function(){try{if(typeof pushCloud==='function')await Promise.race([pushCloud(),new Promise(r=>setTimeout(r,1500))]);}catch(e){}zWipeLocal();return _zLogoutAc.apply(this,arguments);};
/* ---- chi vive nella mia casa ---- */
async function coresHTML(){let L=[];try{const{data,error}=await SB.rpc('world_coresidents');if(error)throw error;L=data||[];}catch(e){return`<p class="muted" style="font-size:12.5px">Non disponibile (${esc(e.message||'')})${typeof SB!=='undefined'&&SB?': riprova tra poco':': l’app non è collegata al server (controlla la rete e riapri l’app)'}.</p>`;}
  if(!L.length)return'<p class="muted" style="font-size:12.5px">Per ora abiti qui solo tu. Se vivi con qualcuno (famiglia, coinquilini, vicini di condominio), invitalo: diventate coinquilini e vi date +3 di difesa a testa.</p>';
  return L.map(r=>`<div class="alrow"><span class="sav">${esc((r.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(r.nick)}</b><small>${r.status==='pending'?'⏳ casa in conferma':'🏠 abita qui'} · ${agoTxt(r.seen_at)}${r.ally?' · 🤝 alleato':''}</small></div>
    <div class="alacts" style="width:auto"><button class="btn small ghost" data-crm="${r.user_id}" data-n="${esc(r.nick)}">💬 Scrivi</button>${r.ally?'':`<button class="btn small" data-cra="${r.user_id}">🤝 Alleanza</button>`}</div></div>`).join('');}
</script>
