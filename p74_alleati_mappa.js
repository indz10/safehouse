<script>
/* =========================================================
   🤝 ALLEATI SULLA MAPPA (richiesta 12/11: "in mappa e orda vedere i miei superstiti alleati e le loro case")
   - Mappa: pulsante "🤝 Alleati" (in renderMappa, p65) → alPick: elenco degli alleati con "🗺️ Le sue case" / "🔍 Scheda",
     più "🗺️ Tutti sulla mappa"
   - Orda: nel riquadro "🤝 I tuoi alleati" (alsHTML in p48) ogni alleato ha 🗺️; nella sua scheda (allySheetBase) "🗺️ Vedi le sue case"
   - alMapShow(uid|'tutti'): va sulla Mappa, mette un segnaposto 🤝 su ogni sua casa (❤️ dove abita, 🔑 comprate, % di tenere
     alla prossima orda), inquadra le case e mostra la barra "🤝 Case di @nome ✕"; toccando un segnaposto si apre la sua scheda.
   Dati: world_allies_status (elenco) e world_ally_view (case con lat/lon, solo per gli alleati: privacy rispettata).
   ========================================================= */
const ALM={on:null,mk:[],nick:''};
function alMapWait(){return new Promise(res=>{let n=0;const t=setInterval(()=>{const lm=window.__mf;n++;
  if(lm&&lm.map&&document.body.contains(lm.map.getContainer())&&(!lm.map.isStyleLoaded||lm.map.isStyleLoaded())){clearInterval(t);res(lm);}else if(n>60){clearInterval(t);res(lm&&lm.map?lm:null);}},150);});}
function alMapClear(){ALM.mk.forEach(m=>{try{m.remove();}catch(e){}});ALM.mk=[];ALM.on=null;const b=document.querySelector('.almapbar');if(b)b.remove();}
async function alMapShow(uid){if(!S.user||typeof SB==='undefined'||!SB){toast('Accedi per vedere gli alleati');return;}
  try{closeSheet();}catch(e){}toast('🤝 Cerco le case…');
  let L=[];try{if(uid==='tutti'){const A=(ALS&&ALS.L)||await alsLoad(true)||[];
      const V=await Promise.all(A.slice(0,12).map(a=>SB.rpc('world_ally_view',{p_user:a.user_id}).then(r=>r.data).catch(()=>null)));L=V.filter(v=>v&&v.ok);}
    else{const{data,error}=await SB.rpc('world_ally_view',{p_user:uid});if(error)throw error;if(!data||!data.ok){toast((data&&data.msg)||'Solo per i tuoi alleati');return;}L=[data];}}
  catch(e){toast('Non riesco a caricare le case: '+(e.message||e));return;}
  const P=[];L.forEach(d=>(d.houses||[]).forEach((T,i)=>{if(T.lat!=null&&T.lon!=null)P.push({u:d.user_id,nick:d.nick,T,i,ch:(()=>{try{return thrCalc(T).ch;}catch(e){return T.chance;}})()});}));
  if(!P.length){toast(L.length?'Non ha ancora case nel mondo':'Non hai ancora alleati');return;}
  if(S.tab!=='mappa'){S.zv='mondo';go('mappa');}
  const lm=await alMapWait();if(!lm){toast('Mappa non pronta: riprova');return;}
  alMapClear();ALM.on=uid;ALM.nick=uid==='tutti'?'tutti i tuoi alleati':'@'+(L[0].nick||'');
  P.forEach(p=>{const el=elDiv('lm-ally '+chCls(p.ch),`<b>${p.T.home?'❤️':'🔑'}</b><span>@${esc(p.nick||'')}</span><i>${p.ch!=null?p.ch+'%':''}</i>`);
    el.title=`@${p.nick} · ${p.T.home?'dove abita':'casa comprata'} · livello ${p.T.level}`;el.style.zIndex='7';
    el.onclick=e=>{e.stopPropagation();window.SHEET_BACK=null;allySheet(p.u);};
    try{ALM.mk.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([p.T.lon,p.T.lat]).addTo(lm.map));}catch(e){}});
  try{const la=P.map(p=>p.T.lat),lo=P.map(p=>p.T.lon);
    if(P.length===1||!lm.map.fitBounds){(lm.map.flyTo||lm.map.jumpTo).call(lm.map,{center:[P[0].T.lon,P[0].T.lat],zoom:17});}
    else lm.map.fitBounds([[Math.min(...lo),Math.min(...la)],[Math.max(...lo),Math.max(...la)]],{padding:80,maxZoom:17,duration:1500});}catch(e){}
  const w=app.querySelector('.mapfull');if(w){const b=w.querySelector('.almapbar');if(b)b.remove();
    w.insertAdjacentHTML('beforeend',`<div class="almapbar"><span>🤝 Case di <b>${esc(ALM.nick)}</b> (${P.length})</span>${uid!=='tutti'?`<button data-almsk>🔍 Scheda</button>`:''}<button data-almx aria-label="Chiudi">✕</button></div>`);
    const bar=w.querySelector('.almapbar');bar.querySelector('[data-almx]').onclick=alMapClear;const sk=bar.querySelector('[data-almsk]');if(sk)sk.onclick=()=>allySheet(uid);}}
/* elenco degli alleati, dalla mappa */
async function alPick(){if(!S.user){toast('Accedi per vedere gli alleati');return;}
  openSheet('🤝 I tuoi alleati','<p><span class="spin"></span> Carico…</p>',()=>{});const A=await alsLoad(true)||[];
  openSheet('🤝 I tuoi alleati',A.length?`<p class="muted" style="font-size:13px;margin:0 0 8px">Tocca 🗺️ per vedere le sue case sulla mappa, con la % di tenere alla prossima orda.</p>
    <button class="btn wide alt" data-alpt>🗺️ Tutti sulla mappa (${A.length})</button>
    ${A.map(a=>`<div class="alprow"><span class="sav">${esc((a.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(a.nick)}${a.coinq?' 🏢':''}</b><small>${a.prepared?'🟢 pronto':'🔴 non pronto'} · ${a.houses} ${a.houses===1?'casa':'case'}${a.worst!=null?' · '+a.worst+'%':''}</small></div>
      <button class="btn small" data-alpm="${esc(a.user_id)}">🗺️</button><button class="btn small ghost" data-alps="${esc(a.user_id)}">🔍</button></div>`).join('')}`
    :'<p class="muted">Non hai ancora alleati. Superstiti → 🔎 Trova superstiti, oppure 📨 Invita un amico.</p>',card=>{
    const t=card.querySelector('[data-alpt]');if(t)t.onclick=()=>alMapShow('tutti');
    card.querySelectorAll('[data-alpm]').forEach(b=>b.onclick=()=>alMapShow(b.dataset.alpm));
    card.querySelectorAll('[data-alps]').forEach(b=>b.onclick=()=>{window.SHEET_BACK={t:'‹ I tuoi alleati',fn:alPick};allySheet(b.dataset.alps);});});}
</script>
