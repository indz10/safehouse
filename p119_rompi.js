<script>
/* ===== Fase 73 — 💔 ROMPI L'ALLEANZA (migrazione 057) =====
   Tasto "💔 Rompi l'alleanza" in fondo alla scheda di un alleato (allySheet di p66) e nella scheda del superstite
   (playerSheet, la più usata: si apre toccando un nome), solo se è nell'elenco degli alleati (world_allies) →
   world_ally_rompi(uid): chiude l'alleanza a due. Per l'alleanza a gruppi il server risponde che bisogna uscirne.
   Dalla 057 gli alleati sono solo quelli veri (alleanza accettata, alleanza a gruppi, coinquilini). */
async function rompiBtn(uid,sempre){try{const c=document.querySelector('#sheet.open');if(!c||c.querySelector('[data-arompi]')||!uid||!S.user||uid===S.user.id)return;
  if(!sempre){let L=[];try{const{data,error}=await SB.rpc('world_allies');if(!error&&Array.isArray(data))L=data;}catch(e){}if(!L.some(a=>a.user_id===uid))return;}
  const c2=document.querySelector('#sheet.open');if(!c2||c2.querySelector('[data-arompi]'))return;const host=c2.querySelector('.sheet-b')||c2;
  host.insertAdjacentHTML('beforeend','<button class="btn wide ghost" data-arompi type="button" style="margin-top:10px">💔 Rompi l’alleanza</button>');
  host.querySelector('[data-arompi]').onclick=async e=>{if(!confirm('Vuoi davvero rompere l’alleanza? Non sarete più alleati e potrete attaccarvi.'))return;e.target.disabled=true;
    try{const{data,error}=await SB.rpc('world_ally_rompi',{p_target:uid});if(error)throw error;toast(data.msg);
      if(data.ok){closeSheet();try{if(typeof AY!=='undefined'){AY.t=0;AY.list=(AY.list||[]).filter(a=>a.user_id!==uid);}}catch(x){}try{if(S.tab==='social')go('social');}catch(x){}}else e.target.disabled=false;}
    catch(x){toast('Non riuscito: riprova (serve il blocco SQL 057)');e.target.disabled=false;}};}catch(e){}}
const _allySheetRompi=allySheet;allySheet=async function(uid){const r=await _allySheetRompi.apply(this,arguments);await rompiBtn(uid,true);return r;};
const _playerSheetRompi=playerSheet;playerSheet=async function(uid){const r=await _playerSheetRompi.apply(this,arguments);await rompiBtn(uid,false);return r;};
</script>
