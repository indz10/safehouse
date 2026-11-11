<script>
/* =========================================================
   MEZZI, DISTANZA E VIAGGIO (dopo la Fase 10, migrazione 009)
   - il mezzo parte da quello della valutazione (domanda "Che mezzo hai per spostarti?", al massimo l'auto)
     e si compra in Bottega: moto, auto, fuoristrada; le dotazioni (kit medico, radio, scorte) danno +1 ai rinforzi;
   - aiuti e assalti solo entro la portata del mezzo (mai oltre 20 km), con tempo di viaggio:
     se arrivano dopo l'orda valgono per quella dopo (lo decide il server);
   - nella scheda di un giocatore: distanza, tempo di viaggio, rinforzi che porti, forza della tua orda.
   ========================================================= */
const MZ={piedi:['🚶','A piedi',2,5,4,'×0,8'],bici:['🚲','Bici',5,15,5,'×0,9'],moto:['🏍️','Moto',12,40,6,'×1'],auto:['🚗','Auto',20,50,8,'×1,2'],fuori:['🚙','Fuoristrada',20,45,10,'×1,3']};
const MZ_ORD=['piedi','bici','moto','auto','fuori'];
/* dalla valutazione al server: mezzo vero e quante dotazioni (una volta, e di nuovo se cambiano le risposte) */
function mzDaRisposte(a){a=a||{};const m={fuori:'fuori',auto:'auto',bici:'bici',no:'piedi'}[a.mezzo]||'piedi';
  const dot=(['completo','base'].includes(a.medico)?1:0)+(a.radio==='radio'?1:0)+(['14','3'].includes(a.cibo)?1:0);return{m,dot};}
async function mzSync(){try{if(!S.user||!S.answers||typeof SB==='undefined'||!SB)return;const r=mzDaRisposte(S.answers);const k='zsh_mz_'+S.user.id,v=r.m+'|'+r.dot;
  if(localStorage.getItem(k)===v)return;const{data,error}=await SB.rpc('world_set_mezzo_vero',{p_mezzo:r.m,p_dot:r.dot});if(!error&&data&&data.ok)localStorage.setItem(k,v);}catch(e){}}
zEvery(mzSync,60000,'mezzo');
/* riga nella scheda di un giocatore */
function mzRigaHTML(p){const m=MZ[p.mezzo]||MZ.piedi;const dentro=p.dist_km<=p.range_km;const lontano=p.dist_km>20;const d=String(p.dist_km).replace('.',',');
  return`<div class="plmz ${dentro?'ok':'no'}"><b>📍 a ${d} km da te</b>
    <span>${m[0]} ${m[1]}: ${dentro?`arrivi in <b>${p.eta_min} min</b> · rinforzi <b>+${p.help_pts}</b>${p.ally!=='ok'?` · la tua orda <b>−${p.atk_pts}</b>`:''}`:lontano?'oltre 20 km: niente rinforzi né orde (solo dispetti)':`arrivi fino a ${p.range_km} km: serve un mezzo più veloce`}</span>
    ${!dentro&&!lontano?'<button class="btn small ghost" data-mzshop>🛒 Mezzi in Bottega</button>':''}</div>`;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-mzshop]');if(!b)return;window.SHEET_BACK=null;shopSheet(0);});
/* Bottega: il tuo mezzo e quelli in vendita */
async function mzFill(c){const box=c.querySelector('.mzbox');if(!box)return;if(!S.user||typeof SB==='undefined'||!SB){box.remove();return;}
  box.innerHTML='<h4 class="hh">🚗 Il tuo mezzo</h4><p class="muted"><span class="spin"></span></p>';
  let d=null;try{const r=await SB.rpc('world_mezzo');d=r.data;}catch(e){}if(!d){box.innerHTML='';return;}
  const cur=MZ[d.mezzo]||MZ.piedi;const io=MZ_ORD.indexOf(d.mezzo);
  box.innerHTML=`<h4 class="hh">🚗 Il tuo mezzo</h4>
    <div class="mzcur"><span class="mzic">${cur[0]}</span><div><b>${cur[1]}</b><small>arrivi fino a ${cur[2]} km · ${cur[3]} km/h · rinforzi +${d.help_pts}${d.dotazioni?` (con ${d.dotazioni} dotazion${d.dotazioni===1?'e':'i'})`:''} · forza orde ${cur[5]}</small></div></div>
    <div class="mzlist">${['moto','auto','fuori'].map(k=>{const m=MZ[k],pr=d.prezzi[k],gia=MZ_ORD.indexOf(k)<=io;return`<div class="mzrow ${gia?'gia':''}"><span class="mzic">${m[0]}</span><div><b>${m[1]}</b><small>fino a ${m[2]} km · ${m[3]} km/h · rinforzi +${m[4]} · orde ${m[5]}</small></div>
      ${gia?'<i>✔️ ce l’hai</i>':`<button class="btn small" data-mzb="${k}">🧱 ${wNum(pr)}</button>`}</div>`;}).join('')}</div>
    <p class="muted" style="font-size:12px;margin:4px 0 10px">Il mezzo di partenza è quello che hai indicato nella valutazione della casa. Più è veloce, più lontano arrivano i tuoi rinforzi e le tue orde (mai oltre 20 km) e prima arrivano.</p>`;
  box.querySelectorAll('[data-mzb]').forEach(b=>b.onclick=async()=>{const k=b.dataset.mzb;if(!confirm(`Comprare ${MZ[k][1]} per ${wNum(d.prezzi[k])} Mattoni?`))return;b.disabled=true;
    try{const{data,error}=await SB.rpc('world_buy_mezzo',{p_mezzo:k});if(error)throw error;toast((data.ok?MZ[k][0]+' ':'')+data.msg);if(data.ok){try{await wMine(true);}catch(e){}mzFill(c);}else b.disabled=false;}
    catch(e){toast(e.message||'Non riuscito');b.disabled=false;}});}
</script>
