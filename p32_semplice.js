<script>
/* =========================================================
   SEMPLIFICAZIONE: ogni cosa in un posto solo
   🏠 Home → 🌍 Mondo (case, scheda casa, sponsor) → 🧟 Orda (Oggi · Difendi tu)
   → 👥 Superstiti (Piazza, Bacheca, Squadra con alleati e rivali, Classifiche)
   ========================================================= */
/* ---- HOME: solo "Vai al mondo" e "La mia casa" (Orda e Superstiti sono già nella barra) ---- */
const _renderHomeS1=renderHome;renderHome=function(){_renderHomeS1();try{const r=app.querySelector('.hsrow');if(r)r.remove();}catch(e){}};
/* ---- ORDA: due sezioni. "Impero" sparisce: le case sono nel Mondo, gli alleati in Superstiti ---- */
/* l'orda in UN solo riquadro: conto alla rovescia, prepara, riscatta + assalti, simulazione, notifiche */
function opanExtra(){const o=app.querySelector('.opan');if(!o||o.querySelector('.opx'))return;
  o.insertAdjacentHTML('beforeend',`<div class="opx"><div class="rrow"><button class="btn ghost small" data-opx="sim">🔮 Simula la prossima</button><button class="btn ghost small" data-opx="mondo">🌍 Le mie case</button></div><div id="pushRow"></div></div>`);
  const w=o.querySelector('[data-owatch]');if(w)w.onclick=e=>{e.stopPropagation();assalto('last');};
  o.querySelectorAll('[data-opx]').forEach(b=>b.onclick=()=>{const k=b.dataset.opx;if(k==='mondo')go('mappa');else assalto(k);});try{pushRow();}catch(e){}}
/* ---- SUPERSTITI: la Squadra contiene alleati, richieste d'aiuto, rivali, regali e prestiti ---- */
/* ---- MONDO: in basso solo le tue case; i filtri si spostano nel menu ⋯ ---- */
const _mfMoreS1=mfMore;mfMore=function(){_mfMoreS1();try{const c=document.querySelector('#sheet.open .mfmenu');if(!c||c.parentNode.querySelector('.mftog'))return;
  c.insertAdjacentHTML('beforebegin',`<h4 style="margin:0 0 6px">Mostra sulla mappa</h4><div class="mftog">${MF.map(([k,i,l])=>`<button data-mft="${k}" class="${S.mf[k]?'on':''}">${i} ${l}<i class="zsw ${S.mf[k]?'on':''}"><em></em></i></button>`).join('')}</div><h4 style="margin:12px 0 6px">Altro</h4>`);
  c.parentNode.querySelectorAll('[data-mft]').forEach(b=>b.onclick=()=>{const k=b.dataset.mft;S.mf[k]=!S.mf[k];b.classList.toggle('on',S.mf[k]);b.querySelector('.zsw').classList.toggle('on',S.mf[k]);mfApply();});}catch(e){}};
/* ---- LA MIA CASA: solo la casa (orda, scorciatoie e novità stanno nelle loro schede) ---- */
/* (nascosti via stile: .rmini, .qact, .hsoc dentro "La mia casa") */
/* ---- MENU: corto, senza doppioni della barra in basso ---- */
function zmItemsBase(){const u=S.user;const adm=!!window.__zmAdmin,shop=!!window.__zmShop;
  return[
   ['Casa',[['🏠','Le mie case','casa'],['📷','Valuta o aggiorna la casa','valuta'],['🚚','Ho cambiato casa','move']]],
   ['Gioco',[['🎬','Guarda gli assalti','a:last'],['🔮','Simula la prossima orda','a:sim'],['⚔️','Difendi tu (notti)','g:difendi'],['💎','Bottega','shop']]],
   ['Amici',[['📨','Invita amici e vicini','invite']]],
   ['Aiuto',[['🧭','Giro guidato','tour'],['📖','Come si gioca','rules'],['📚','Tutte le regole','manual'],['📻','Radio Operatore','radio'],['⭐','Sponsor e contatti','sponsor']]],
   ['Account',[...(u?[['👤','Il mio profilo','io']]:[]),['🔔','Notifiche delle orde','push'],['toggle','Visibile sulla mappa','vis',u?!!S.pubOk:null],['toggle','Suoni','snd',!(typeof G!=='undefined'&&G.mute)],['toggle','Musica','mus',!!(window.AUD&&AUD.on&&AUD.started)],
     ['🔒','Privacy','url:privacy.html'],['📄','Termini','url:termini.html'],...(adm?[['🛠️','Pannello admin INDZ','url:admin.html']]:[]),...(shop?[['🏪','Pannello del mio negozio','url:negozio.html']]:[]),
     ...(u?[['🚪','Esci','logout'],['🗑','Elimina il mio account','del']]:[])]]];}
/* ---- il giro guidato segue la nuova struttura ---- */
try{if(typeof OT!=='undefined'&&Array.isArray(OT)){for(let i=OT.length-1;i>=0;i--){const st=OT[i];if(st&&st.sel&&/wpan|apan/.test(st.sel))OT.splice(i,1);}}}catch(e){}
/* ---- manuale: testo dei regali allineato alle regole vere ---- */
</script>
