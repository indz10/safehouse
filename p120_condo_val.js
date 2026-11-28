<script>
/* ===== Fase 74b — 🏢 CONDOMINIO NELLA VALUTAZIONE (nessun SQL) =====
   Nella domanda "Che tipo di casa è?" gli appartamenti sono "in condominio": scegliendone uno compare il campo
   "Scala e interno" (S.answers.interno, non conta nel punteggio). Appena la casa è nel mondo (W.m.home), cvSync
   la segna come condominio con quell'interno (world_set_home), una volta per interno (zsh_cv_<utente>): così il server
   sa che è un condominio (appartamenti comprabili, vicini alleati per forza) senza chiederlo di nuovo. */
const cvApt=()=>/^apt/.test((S.answers||{}).tipo||'');
const _vDomandeCv=vDomande;vDomande=function(){const r=_vDomandeCv.apply(this,arguments);try{cvBox();}catch(e){}return r;};
function cvBox(){const q=document.querySelector('#vv [data-q="tipo"]');if(!q||!cvApt())return;const box=q.closest('.q');if(!box||box.querySelector('.cvbox'))return;
  box.insertAdjacentHTML('beforeend',`<div class="cvbox"><b>🏢 Condominio: scala e interno</b><small>Serve per distinguere la tua famiglia dai vicini del palazzo (chi vive nello stesso palazzo è tuo alleato).</small>
    <input id="cvU" maxlength="16" placeholder="per esempio: A 5" value="${esc(S.answers.interno||'')}" autocomplete="off"></div>`);
  const i=box.querySelector('#cvU');i.oninput=()=>{S.answers.interno=i.value.trim();try{saveLocal();}catch(e){}};}
async function cvSync(){try{if(!S.user||typeof SB==='undefined'||!SB||!cvApt())return;const u=(S.answers.interno||'').trim();const m=window.W&&W.m;
  if(!u||!m||!m.home)return;const k='zsh_cv_'+S.user.id;if(localStorage.getItem(k)===u)return;
  const{data,error}=await SB.rpc('world_set_home',{p_kind:'condominio',p_unit:u});if(error)return;if(data&&data.ok){localStorage.setItem(k,u);try{wMine(true);}catch(e){}}}catch(e){}}
zEvery(cvSync,30000,'condo-valutazione');
</script>
