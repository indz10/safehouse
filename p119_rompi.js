<script>
/* ===== Fase 73 — 💔 ROMPI L'ALLEANZA (migrazione 057) =====
   Nella scheda di un alleato (allySheet di p66) il tasto "💔 Rompi l'alleanza" → world_ally_rompi(uid): chiude
   l'alleanza a due. Per l'alleanza a gruppi il server risponde che bisogna uscirne (alzMenu). Dalla 057 gli alleati sono
   solo quelli veri (alleanza accettata, alleanza a gruppi, coinquilini): inviti e aiuti non fanno più alleati. */
const _allySheetRompi=allySheet;allySheet=async function(uid){const r=await _allySheetRompi.apply(this,arguments);
  try{const c=document.querySelector('#sheet.open');if(c&&!c.querySelector('[data-arompi]')&&uid&&S.user&&uid!==S.user.id){
    const host=c.querySelector('.sheet-b')||c;
    host.insertAdjacentHTML('beforeend','<button class="btn wide ghost" data-arompi type="button" style="margin-top:10px">💔 Rompi l’alleanza</button>');
    host.querySelector('[data-arompi]').onclick=async e=>{if(!confirm('Vuoi davvero rompere l’alleanza? Non sarete più alleati e potrete attaccarvi.'))return;e.target.disabled=true;
      try{const{data,error}=await SB.rpc('world_ally_rompi',{p_target:uid});if(error)throw error;toast(data.msg);if(data.ok){closeSheet();try{if(typeof AY!=='undefined')AY.t=0;}catch(x){}try{if(S.tab==='social')go('social');}catch(x){}}else e.target.disabled=false;}
      catch(x){toast('Non riuscito: riprova');e.target.disabled=false;}};}}catch(e){}
  return r;};
</script>
