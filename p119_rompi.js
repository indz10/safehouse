<script>
/* ===== Fase 73 — 💔 ROMPI L'ALLEANZA (migrazione 057) =====
   Tasto "💔 Rompi l'alleanza" in fondo alla scheda di un alleato (allySheet di p66) e nella scheda del superstite
   (playerSheet, la più usata: si apre toccando un nome), sotto "🤝 Siete alleati" (.rok2) →
   world_ally_rompi(uid) (058): chiude l'alleanza a due e, se siete coinquilini/vicini, segna la rottura; per l'alleanza a gruppi il server risponde che bisogna uscirne.
   Dalla 057 gli alleati sono solo quelli veri (alleanza accettata, alleanza a gruppi, coinquilini). */
async function rompiBtn(uid,sempre){try{const c=document.querySelector('#sheet.open');if(!c||c.querySelector('[data-arompi]')||!uid||!S.user||uid===S.user.id)return;
  /* nella scheda del superstite: solo se c'è "🤝 Siete alleati" (lo decide il server con w_are_allies), e il tasto va proprio lì sotto */
  const ok=c.querySelector('.rok2');if(!sempre&&!(ok&&/alleat/i.test(ok.textContent)))return;
  const B='<button class="btn wide ghost" data-arompi type="button" style="margin-top:8px">💔 Rompi l’alleanza</button>';
  if(ok&&!sempre)ok.insertAdjacentHTML('afterend',B);else (c.querySelector('.sheet-b')||c).insertAdjacentHTML('beforeend',B);
  c.querySelector('[data-arompi]').onclick=async e=>{if(!confirm('Vuoi davvero rompere l’alleanza? Non sarete più alleati e potrete attaccarvi.'))return;e.target.disabled=true;
    try{const{data,error}=await SB.rpc('world_ally_rompi',{p_target:uid});if(error)throw error;toast(data.msg);
      if(data.ok){closeSheet();try{if(typeof AY!=='undefined'){AY.t=0;AY.list=(AY.list||[]).filter(a=>a.user_id!==uid);}}catch(x){}try{if(S.tab==='social')go('social');}catch(x){}}else e.target.disabled=false;}
    catch(x){toast('Non riuscito: riprova');e.target.disabled=false;}};}catch(e){}}
const _allySheetRompi=allySheet;allySheet=async function(uid){const r=await _allySheetRompi.apply(this,arguments);await rompiBtn(uid,true);return r;};
const _playerSheetRompi=playerSheet;playerSheet=async function(uid){const r=await _playerSheetRompi.apply(this,arguments);await rompiBtn(uid,false);return r;};
</script>
