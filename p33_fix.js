<script>
/* =========================================================
   CORREZIONI dalle foto
   1) pulsante audio 🔊/🔇 sempre visibile in alto
   2) "Acquista" → "🧱 Più Mattoni" con spiegazione chiara
   3) richiesta d'aiuto: gli alleati la vedono (bacheca, per te, push)
   ========================================================= */
/* ---- 1) audio: un tocco spegne/accende musica e suoni ---- */
function zSoundOn(){try{return!(typeof G!=='undefined'&&G.mute)||!!(window.AUD&&AUD.on&&AUD.started);}catch(e){return true;}}
function zSoundBtn(){try{const T=document.getElementById('topbar');if(!T)return;let b=document.getElementById('zsound');
  if(!b){const bell=document.getElementById('zbell');if(!bell)return;bell.insertAdjacentHTML('beforebegin','<button id="zsound" aria-label="Audio"></button>');b=document.getElementById('zsound');
    b.onclick=()=>{const on=zSoundOn();try{if(typeof G!=='undefined')G.mute=on;}catch(e){}try{if(on)musicOff();else musicOn();}catch(e){}try{saveLocal();}catch(e){}try{localStorage.setItem('zsh_mute',on?'1':'0');}catch(e){}zSoundBtn();toast(on?'🔇 Audio spento':'🔊 Audio acceso');};}
  const on=zSoundOn();b.textContent=on?'🔊':'🔇';b.classList.toggle('off',!on);}catch(e){}}
const _zTopbarFx=zTopbar;zTopbar=function(){_zTopbarFx();zSoundBtn();};setTimeout(zSoundBtn,400);
/* se l'audio era stato spento, resta spento alla riapertura */
setTimeout(()=>{try{if(localStorage.getItem('zsh_mute')==='1'){if(typeof G!=='undefined')G.mute=true;try{musicOff();}catch(e){}zSoundBtn();}}catch(e){}},1200);
/* ---- 2) "Acquista" più chiaro ---- */
const _shopSheetFx=shopSheet;shopSheet=function(miss){_shopSheetFx(miss);try{const c=document.querySelector('#sheet.open');if(!c||c.querySelector('.earnfirst'))return;const h=c.querySelector('.sheet-h, h3, .disp');
  const box=`<div class="earnfirst"><b>Come avere Mattoni adesso, gratis</b><ul><li>🧟 Riscatta i premi di ogni orda (2 al giorno)</li><li>🎯 3 missioni al giorno: 15 🧱 ciascuna</li><li>🏦 Affitti delle tue case, ogni giorno</li><li>📨 Ogni amico che entra e valuta la casa: 150 🧱</li><li>🎟️ Ogni codice sconto usato in un negozio sponsor: 100 🧱</li></ul></div>`;
  const first=c.querySelector('.notice')||c.querySelector('h4.hh');if(first)first.insertAdjacentHTML(first.classList.contains('notice')?'afterend':'beforebegin',box);}catch(e){}};
/* ---- 3) richieste d'aiuto degli alleati in bacheca e "per te" ---- */
</script>
