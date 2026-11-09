<script>
/* =========================================================
   CASA ABITATA DA ALTRI: niente "Casa libera · Prezzo", ma chi ci abita (se è alleato o coinquilino)
   o "🏠 Casa abitata" (se è uno sconosciuto: privacy, mai nome + indirizzo esatto)
   ========================================================= */
const _wSheetAb=wSheet;wSheet=async function(bid,lat,lon){let q=null;try{q=await wRpc('world_quote',{p_bid:bid,p_lat:lat,p_lon:lon});}catch(e){}
  /* le MIE case (comprate o casa vera): sempre la pagina della casa, mai la vecchia scheda */
  if(q&&['mine','myhome','mypending'].includes(q.status)&&S.user){const pick=()=>{const H=myHouses();const want=q.status==='mine'?H.filter(x=>!x.home):H.filter(x=>x.home);
      return want.find(x=>x.bid&&x.bid===bid)||want.map(x=>[x,trM(x.lat,x.lon,lat,lon)]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]).find(x=>trM(x.lat,x.lon,lat,lon)<120);};
    let h=pick();if(!h){try{await wMine(true);}catch(e){}h=pick();}if(h)return houseSheet(h);}
  if(!q||q.status!=='home')return _wSheetAb.apply(this,arguments);
  const R=q.residents||[];const pend=!!q.pending;
  openSheet(R.length?`🏠 Casa di @${esc(R[0].nick)}${R.length>1?' e altri':''}`:'🏠 Casa abitata',`
    <div class="abhero ${pend?'pend':''}"><span>${pend?'⏳':'🏠'}</span><div><b>${R.length?R.map(r=>'@'+esc(r.nick)).join(', '):'Qui abita un superstite'}</b>
      <small>${pend?'Casa in conferma: diventa definitiva da domani.':'Casa confermata nel mondo.'} Le case abitate non si possono comprare.</small></div></div>
    ${R.length?R.map(r=>`<div class="alrow"><span class="sav">${esc((r.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(r.nick)}</b><small>${r.status==='pending'?'⏳ in conferma':'🏠 abita qui'}${r.ally?' · 🤝 alleato':''}</small></div>
      <div class="alacts" style="width:auto"><button class="btn small ghost" data-abp="${r.user_id}">👤 Profilo</button><button class="btn small" data-abm="${r.user_id}" data-n="${esc(r.nick)}">💬 Scrivi</button></div></div>`).join('')
     :'<p class="muted" style="font-size:12.5px">Per la privacy, il nome di chi abita qui lo vedono solo i suoi alleati e i suoi coinquilini. Sulla mappa i superstiti compaiono in una posizione approssimata.</p>'}`,
    card=>{card.querySelectorAll('[data-abp]').forEach(b=>b.onclick=()=>playerSheet(b.dataset.abp));card.querySelectorAll('[data-abm]').forEach(b=>b.onclick=()=>dmSheet(b.dataset.abm,b.dataset.n));});};
</script>
