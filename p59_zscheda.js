<script>
/* =========================================================
   SCHEDA DELLO ZOMBIE (pulsanti sotto il fronte e zombie in marcia):
   in più "Su questa casa": forza, salita/meteo, fortificazioni che lo fermano (comprabili, con +% e costo)
   ========================================================= */
const _frZSheetZS=frZSheet;frZSheet=function(k){_frZSheetZS(k);try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.zsh'))return;
  const F=FR.dests&&FR.dests[0];const T=F&&typeof thrOf==='function'?thrOf(F):null;if(!T)return;const r=thrCalc(T);
  const x=k==='walker'?null:r.sp.find(s=>s.k===k);if(k!=='walker'&&!x){c.insertAdjacentHTML('afterbegin',`<div class="zsh"><b>🏠 ${esc(F.label)}</b><small>Al tuo livello del mondo (${T.wl}) questo zombie non arriva ancora.</small></div>`);return;}
  const kinds=k==='walker'?['trappole']:[x.dk,x.dk2].filter(Boolean);const O=fortOpts(T).filter(o=>kinds.includes(o.k));
  const ev=EVN[T.ev]||EVN.calma;const force=k==='walker'?`${Math.round(T.std_min*T.mw)}–${Math.round(T.std_max*T.mw)}`:x.p.toFixed(1).replace('.',',');
  const why=k==='walker'?`Sono la massa dell’orda: le 🪤 trappole ne frenano il 6% per livello.`:`Qui pesa ×${(Math.round(x.mod*100)/100).toString().replace('.',',')} (salita e ${ev[1].toLowerCase()}). Difesa principale −30% per livello, supporto −15%.`;
  c.insertAdjacentHTML('afterbegin',`<div class="zsh"><div class="zshh"><div><b>🏠 Su ${esc(F.label)}</b><small>${ev[0]} ${ev[1]} · orda delle ${String(T.hh).padStart(2,'0')}:00</small></div><div class="zshf"><small>forza</small><b>${force}</b></div></div>
    <small class="zshw">${why}</small><div class="rinf">${O.map(o=>`<button class="fch ${o.max?'max':o.cur>0?'ok':'no'} ${o.gain>0?'up':''}" data-zfk="${o.k}"><span>${fortLabel(o)}</span>${o.max?'<small>massimo</small>':`<small>${o.gain>0?`<b>+${o.gain}%</b> · `:''}🧱 ${wNum(o.cost)}</small>`}</button>`).join('')}</div>
    <small class="zshw">Questa casa oggi tiene il <b>${r.ch}%</b>.</small></div>`);
  c.querySelectorAll('[data-zfk]').forEach(b=>b.onclick=()=>{const o=fortOpts(T).find(y=>y.k===b.dataset.zfk);if(o)fortBuy(F,T,o,()=>{try{frRings();}catch(e){}frZSheet(k);});});}catch(e){console.warn(e);}};
</script>
