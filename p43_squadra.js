<script>
/* =========================================================
   ALLEANZE 2: coinquilini, scudo per un alleato (20 💎), difesa di squadra,
   doni anche di gemme, giri di ruota e biglietti
   ========================================================= */
GK.gemme=['💎','Gemme'];GK.giri=['🎡','Giri di ruota'];GK.biglietti=['🎟️','Biglietti gratta'];
const GLIM={mattoni:300,monete:300,gemme:20,giri:1,biglietti:1};
function gHave(k){return k==='mattoni'?(W.m?W.m.mattoni:0):k==='monete'?(G.coins||0):k==='gemme'?(G.gems||0):k==='giri'?(G.spins||0):k==='biglietti'?(G.scratch||0):((G.mat||{})[k]||0);}
function gAdd(k,n){if(k==='monete')G.coins=(G.coins||0)+n;else if(k==='gemme')G.gems=(G.gems||0)+n;else if(k==='giri')G.spins=(G.spins||0)+n;else if(k==='biglietti')G.scratch=(G.scratch||0)+n;else if(k!=='mattoni'){G.mat=G.mat||{};G.mat[k]=(G.mat[k]||0)+n;}}
/* ritiro dei regali ricevuti */
ayInbox=async function(){if(!S.user||typeof SB==='undefined'||!SB||typeof G==='undefined'||!G.type)return;try{const{data,error}=await SB.rpc('world_gifts_in');if(error||!data||!data.length)return;
  const got=[];for(const g of data){const r=await SB.rpc('world_gift_claim',{p_id:g.id});if(r.data&&r.data.ok){gAdd(g.kind,g.amount);got.push(`${(GK[g.kind]||['🎁'])[0]} ${g.amount} da @${g.nick}`);}}
  if(got.length){try{saveLocal();sfx('coin');}catch(e){}toast('🎁 Regali ricevuti: '+got.join(' · '));}}catch(e){}};
/* finestra dei doni */
aySheet=function(uid,nick){let kind='mattoni',loan=true;const order=['mattoni','gemme','monete','giri','biglietti'];
  const draw=card=>{card.querySelector('.ayk').innerHTML=order.map(k=>`<button class="chip ${k===kind?'on':''}" data-k="${k}">${GK[k][0]} ${GK[k][1]}<small> (${wNum(gHave(k))})</small></button>`).join('');
    card.querySelector('.aym').innerHTML=kind==='mattoni'?`<button class="chip ${loan?'on':''}" data-m="1">🤝 Presta (torna fra 3 giorni)</button><button class="chip ${!loan?'on':''}" data-m="0">🎁 Regala</button>`:`<span class="muted" style="font-size:12.5px">Si può solo regalare. Massimo oggi: ${GLIM[kind]||10}.</span>`;
    const n=card.querySelector('#ayN');if(n&&(kind==='giri'||kind==='biglietti'))n.value=1;
    card.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{kind=b.dataset.k;if(kind!=='mattoni')loan=false;draw(card);});card.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{loan=b.dataset.m==='1';draw(card);});};
  openSheet('🎁 A @'+esc(nick),`<p style="font-weight:400">Cosa vuoi dare?</p><div class="ayk chips" style="margin:6px 0"></div><div class="aym" style="margin:6px 0"></div>
   <label class="disp" style="font-size:16px">Quantità</label><input id="ayN" type="number" inputmode="numeric" min="1" value="50" class="field">
   <p class="muted" style="font-size:12px;margin:6px 0">Limiti al giorno: 300 Mattoni, 20 gemme, 300 monete, 1 giro di ruota, 1 biglietto.</p>
   <button class="btn wide" data-ayok>Conferma</button>`,card=>{draw(card);card.querySelector('[data-ayok]').onclick=async()=>{const n=Math.floor(+card.querySelector('#ayN').value||0);if(n<1){toast('Scrivi una quantità');return;}
     if(gHave(kind)<n){toast('Non ne hai abbastanza');return;}const btn=card.querySelector('[data-ayok]');btn.disabled=true;
     try{const{data,error}=await SB.rpc('world_give',{p_to:uid,p_kind:kind,p_amount:n,p_loan:kind==='mattoni'&&loan});if(error)throw error;
       if(data.ok){if(kind!=='mattoni')gAdd(kind,-n);try{saveLocal();}catch(e){}toast('✅ '+data.msg);closeSheet();wMine(true);ayLoad(true);}else{toast(data.msg);btn.disabled=false;}}catch(e){toast(e.message||'Non riuscito');btn.disabled=false;}};});};
/* scudo per un alleato */
async function allyShield(uid,nick){if((G.gems||0)<20){toast('Servono 💎 20');shopSheet(0);return;}if(!confirm(`🛡️ Dare uno scudo a @${nick} per la prossima orda? +5 alla sua difesa, costa 💎 20.`))return;
  try{const{data,error}=await SB.rpc('world_ally_shield',{p_target:uid});if(error)throw error;if(data.ok){G.gems-=20;try{saveLocal();sfx('coin');}catch(e){}TB.t=0;await tbLoad();try{document.querySelectorAll(`[data-ashield="${uid}"]`).forEach(b=>{b.disabled=true;b.textContent='🛡️ ✓';});}catch(e){}}toast((data.ok?'🛡️ ':'')+data.msg);}catch(e){toast(e.message||'Non riuscito');}}
/* riepilogo della squadra per la prossima orda */
window.TB={d:null,t:0};
async function tbLoad(){if(!S.user||typeof SB==='undefined'||!SB)return;if(TB.d&&Date.now()-TB.t<60000)return tbPaint();try{const{data,error}=await SB.rpc('world_team_bonus');if(error)throw error;TB.d=data;TB.t=Date.now();}catch(e){TB.d={err:e.message};}tbPaint();}
function tbHTML(){const d=TB.d;if(!d)return'<p class="muted"><span class="spin"></span> Calcolo i bonus…</p>';if(d.err)return`<p class="muted" style="font-size:12.5px">Bonus di squadra non disponibili (${esc(d.err)}).</p>`;
  const cq=d.coinq||[];const sq=d.allies_prep>=3;const tot=(sq?5:0)+Math.min(9,3*(d.coinq_prep||0))+Math.min(10,5*(d.shields_in||0));
  return`<div class="tbrow"><span>👥 Difesa di squadra</span><b class="${sq?'ok':''}">${d.allies_prep||0}/3 alleati pronti ${sq?'→ +5':''}</b></div>
   <div class="tbrow"><span>🏢 Coinquilini</span><b>${cq.length?cq.map(n=>'@'+esc(n)).join(', ')+` · ${d.coinq_prep||0} pronti → +${Math.min(9,3*(d.coinq_prep||0))}`:'nessuno nel tuo edificio'}</b></div>
   <div class="tbrow"><span>🛡️ Scudi ricevuti</span><b>${d.shields_in||0}/2 → +${Math.min(10,5*(d.shields_in||0))}</b></div>
   <div class="tbtot">Bonus di squadra alla prossima orda: <b>+${tot}</b></div>`;}
function tbPaint(){const b=app.querySelector('.tbbox');if(b)b.innerHTML=tbHTML();}
function tbDecorate(){try{const B=app.querySelector('#socBody')||app;
  B.querySelectorAll('[data-agive]').forEach(g=>{if(g.parentNode.querySelector('[data-ashield]'))return;const uid=g.dataset.agive,nick=g.dataset.anick;const a=(AY.list||[]).find(x=>x.user_id===uid);
    if(a&&a.coinq){const sm=g.parentNode.querySelector('small');if(sm&&!/coinquilino/.test(sm.textContent))sm.insertAdjacentHTML('afterbegin','🏢 coinquilino · ');}
    const given=TB.d&&Array.isArray(TB.d.shields_out)&&TB.d.shields_out.includes(uid);
    g.insertAdjacentHTML('beforebegin',`<button class="btn small ghost" data-ashield="${uid}" data-anick="${esc(nick)}" ${given?'disabled':''}>${given?'🛡️ ✓':'🛡️ Scudo'}</button>`);
    g.parentNode.querySelector('[data-ashield]').onclick=()=>allyShield(uid,nick);});}catch(e){}}
/* scheda del giocatore: scudo se alleato */
/* bacheca e "per te" */
</script>
