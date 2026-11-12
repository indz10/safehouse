<script>
/* =========================================================
   HOMEPAGE A DISEGNO + LE TUE CASE NEL MONDO + SCHEDA DELLA CASA
   - home: un disegno a tutto schermo con i pulsanti (🌍 Vai al mondo…)
   - nel mondo: in basso le tue case; un tocco e la mappa ci vola sopra
   - tocco sulla casa: cosa fare con 🧱 Mattoni e 💎 gemme, acquisto in app,
     migliorie consigliate dall'IA, community, lavori veri degli sponsor entro 50 km
   ========================================================= */
/* ---------------- la vecchia pagina Casa diventa "La mia casa" ---------------- */
const renderCasaDash=renderHome;NAV_ACT.casa='home';
/* ---------------- HOMEPAGE: tutta un disegno ---------------- */
renderHome=function(){const m=window.W&&W.m,s=OR.s;const has=!!S.result;const next=(s&&s.next_at)||vNextSlot();
  app.innerHTML=`<section class="hscene"><div class="hsart">${heroSVG()}</div>
    <div class="hstitle"><h1>Zombie<span>Safe House</span></h1><p>${has?'Il mondo ti aspetta, superstite.':'Quanto resiste la tua casa all’orda?'}</p></div>
    <div class="hsbtns">${S.user&&m?`<div class="hschips"><span>🧱 ${wNum(m.mattoni)}</span><span>💎 ${(typeof G!=='undefined'&&G.gems)||0}</span><span>🧟 tra <b data-oleft>${orLeft(next)}</b></span></div>`:''}
      <button class="hsbig" data-hs="mondo">🌍 Vai al mondo</button>
      ${has?`<button class="hsmid" data-hs="casa">🏠 ${S.user?'Le mie case':'La mia casa'}</button>`:'<button class="hsmid" data-hs="valuta">📷 Valuta la mia casa</button>'}
      <div class="hsrow"><button data-hs="orda">🧟 Orda</button><button data-hs="social">👥 Superstiti</button><button data-hs="menu">☰ Tutto</button></div>
    </div></section>`;
  try{const sv=app.querySelector('.hsart svg');if(sv){sv.setAttribute('preserveAspectRatio','xMidYMid slice');}const sc=app.querySelector('.hscene');const nav=$('#nav');sc.style.height=Math.max(460,innerHeight-sc.getBoundingClientRect().top-(nav?nav.offsetHeight:64))+'px';}catch(e){}
  app.querySelectorAll('[data-hs]').forEach(b=>b.onclick=()=>{const k=b.dataset.hs;if(k==='mondo'){S.mfHouses=true;go('mappa');}else if(k==='menu')zmOpen();else go(k);});
  if(S.user&&!W.m&&typeof wMine==='function'&&Date.now()-(window.__homeAsk||0)>30000){window.__homeAsk=Date.now();wMine(true).then(()=>{if(S.tab==='home'&&W.m)renderHome();}).catch(()=>{});}};
/* ---------------- NEL MONDO: le tue case in basso ---------------- */
function myHouses(){const m=window.W&&W.m;const L=[];const home=m&&m.home&&m.home.lat!=null?m.home:(S.zone&&S.zone.real?{lat:S.zone.real.lat,lon:S.zone.real.lon,status:'pending'}:null);
  if(home)L.push({home:true,bid:home.building_id||'',lat:home.lat,lon:home.lon,level:1,label:'Casa tua',ic:'❤️'});
  ((m&&m.houses)||[]).forEach((h,i)=>L.push({home:false,bid:h.building_id,lat:h.lat,lon:h.lon,level:h.level||1,value:h.value||0,label:'Casa '+(i+1),ic:'🔑'}));
  const o=L[0];L.forEach(h=>{h.km=o?trM(o.lat,o.lon,h.lat,h.lon)/1000:0;});return L;}
function kmTxt(k){return k<1?Math.round(k*1000)+' m':k<100?k.toFixed(1).replace('.',',')+' km':wNum(Math.round(k))+' km';}
function mhBarBase(){const w=app.querySelector('.mapfull');if(!w)return;let b=w.querySelector('.mhouses');const L=myHouses();
  const html=`<div class="mhhead"><b>🏠 Le tue case (${L.length})</b><button data-mhx>${S.mhOpen===false?'▲':'▼'}</button></div>
    <div class="mhlist" ${S.mhOpen===false?'hidden':''}>${L.length?L.map((h,i)=>`<button class="mhc" data-mh="${i}"><span>${h.ic}</span><b>${h.label}</b><small>${h.home?'livello '+h.level:'liv. '+h.level+' · '+kmTxt(h.km)}</small></button>`).join(''):`<p class="muted" style="font-size:12.5px;margin:4px">${S.user?'Valuta la tua casa: diventa la prima del tuo impero.':'Accedi per avere le tue case nel mondo.'}</p>`}
     <button class="mhc add" data-mhadd><span>➕</span><b>Compra</b><small>tocca una casa libera</small></button></div>`;
  if(!b){w.insertAdjacentHTML('beforeend',`<div class="mhouses">${html}</div>`);b=w.querySelector('.mhouses');}else b.innerHTML=html;
  b.querySelector('[data-mhx]').onclick=()=>{S.mhOpen=S.mhOpen===false;mhBar();};
  b.querySelectorAll('[data-mh]').forEach(x=>x.onclick=()=>{const h=L[+x.dataset.mh];mhFly(h,true);});
  const ad=b.querySelector('[data-mhadd]');if(ad)ad.onclick=()=>openSheet('➕ Comprare una casa','<p style="font-weight:400">Avvicina la mappa e <b>tocca una casa</b>: se è libera (o di un superstite simulato 🤖) vedi il prezzo in 🧱 Mattoni e il pulsante Compra. Puoi comprare ovunque, anche in Australia: il prezzo sale con la distanza da casa tua.</p><p class="muted" style="font-size:12.5px">Per andare lontano (anche New York) tocca 🔎 Cerca un luogo sulla mappa.</p>');}
function mhFly(h,open){const lm=window.__mf;if(!lm||!lm.map)return;try{lm.map.flyTo({center:[h.lon,h.lat],zoom:17,pitch:0,duration:h.km>500?3200:1500});}catch(e){}
  if(open)setTimeout(()=>houseSheet(h),h.km>500?3300:1600);}
/* ---------------- SCHEDA DELLA CASA ---------------- */
/* tocco su una casa tua sulla mappa → la sua scheda */
/* ---------------- ACQUISTO IN APP (Mattoni e gemme) ---------------- */
function shopSheet(miss){openSheet('🛒 Bottega',`${miss?`<p class="notice">Ti mancano <b>🧱 ${wNum(miss)} Mattoni</b>. Puoi guadagnarli giocando oppure comprarli.</p>`:''}
  <div class="mzbox"></div>
  <h4 class="hh">🧱 Mattoni</h4><div class="shopg">${[['🧱 500','1,99 €'],['🧱 1.500','4,99 €'],['🧱 4.000','9,99 €']].map(([a,b])=>`<div><b>${a}</b><small>${b}</small><button class="btn small ghost" disabled>Presto</button></div>`).join('')}</div>
  <h4 class="hh">💎 Gemme</h4><div class="shopg">${[['💎 80','0,99 €'],['💎 450','4,99 €'],['💎 1.000','9,99 €']].map(([a,b])=>`<div><b>${a}</b><small>${b}</small><button class="btn small ghost" disabled>Presto</button></div>`).join('')}</div>
  <div class="passx" style="margin-top:10px"><b>⭐ Pass del Superstite · 4,99 €/mese</b><small>Case preparate in automatico · +20% affitti · 1 casa in più · premi doppi nelle missioni</small></div>
  <p class="muted" style="font-size:12.5px;margin-top:10px">Gli acquisti si attivano quando l’app sarà su App Store e Google Play (lo richiedono le loro regole). Intanto: <b>Mattoni</b> con orde, missioni, affitti, codici sconto usati in negozio e amici invitati; <b>gemme</b> con premio del giorno, ruota, gratta e vinci e scrigni.</p>
  <div class="row" style="gap:8px;margin-top:8px"><button class="btn small" data-sg="orda">🧟 Vai a guadagnarli</button><button class="btn small ghost" data-sg="inv">📨 Invita (+150 🧱)</button></div>`,c=>{
  try{mzFill(c);}catch(e){}c.querySelector('[data-sg=orda]').onclick=()=>{closeSheet();G.ss='oggi';go('orda');};c.querySelector('[data-sg=inv]').onclick=()=>{closeSheet();if(!S.user)return loginSheet();inviteSheet();};});}
/* il menu porta anche a "La mia casa" */
</script>
