<script>
/* =========================================================
   MAPPA — UNA FUNZIONE PER OGNI COSA (Fase 4c)
   Prima: liveMap = base (p19) + 9 strati (p20 ×2, p21, p22, p26, p35, p36, p49, p61);
   renderMappa, mhBar, wSheet, wDrawMap, bizSheet, lmPoi = base + 1–4 strati ciascuna.
   Ora: la base si chiama …Base nel modulo di origine e UNA funzione fa, in ordine,
   quello che facevano gli strati. Comportamento identico.
   ========================================================= */
/* la mappa a fumetto: notte automatica col tramonto vero (p61), poi la mappa (p19), poi in ordine:
   superstiti (p20), luoghi aggiunti dall'admin (p20), mondo unico (p21), orda (p22), sponsor (p26),
   sponsor di esempio (p35), attività della zona (p36), effetti dell'assedio (p49) */
async function liveMap(el,addr,o){
  o=Object.assign({},o||{});if(o.night===undefined){const c=(RM.cache&&RM.cache[addr])||null;o.night=zIsNight(c&&c.lat,c&&c.lon);}
  const lm=await liveMapBase(el,addr,o);
  await (async()=>{try{(window.__zlms=window.__zlms||[]).push(lm);zDrawUsers(lm);}catch(e){}})();
  await (async()=>{try{zDrawCustom(lm);}catch(e){}})();
  await (async()=>{try{const map=lm.map;
  const homeG=()=>{try{if(window.__homeG||!S.zone||S.zone.address!==addr||map.getZoom()<14)return;const pt=map.project([lm.m.lon,lm.m.lat]);const fs=map.queryRenderedFeatures([[pt.x-3,pt.y-3],[pt.x+3,pt.y+3]],{layers:['bld']});
    const g=wFromTile(fs,lm.m.lat,lm.m.lon);if(g){window.__homeG=g;if(S.user&&!(S.zone.real&&S.zone.real.house&&S.zone.real.house.bid))wClaim(false);}}catch(e){}};map.on('idle',homeG);
  map.on('moveend',()=>{clearTimeout(lm._wt);lm._wt=setTimeout(()=>wDrawMap(lm),350);});setTimeout(()=>wDrawMap(lm),900);
  map.on('click','bld',async e=>{if(!W.on)return;const pts=map.queryRenderedFeatures(e.point,{layers:['poi-biz','poi-pub','poi-cand','poi-hid'].filter(id=>map.getLayer(id))});if(pts.length)return;
    const g=wFromTile(e.features,e.lngLat.lat,e.lngLat.lng);if(g){wSheet(g.bid,g.lat,g.lon);return;}
    openSheet('🌍 Edificio del mondo','<p><span class="spin"></span> Riconosco l’edificio…</p>',()=>{});
    try{const b=await wIdentify(e.lngLat.lat,e.lngLat.lng);if(!b){openSheet('🌍 Edificio del mondo','<p class="notice">Non riesco a riconoscere l’edificio: avvicina la mappa e riprova.</p>');return;}wSheet(b.bid,b.lat,b.lon);}
    catch(x){openSheet('🌍 Edificio del mondo','<p class="notice">I server pubblici delle mappe sono molto occupati in questo momento: riprova tra un minuto. Le case vicino a casa tua si riconoscono sempre subito.</p>');}});}catch(e){}})();
  await (async()=>{try{const box=lm.map.getContainer().closest('.lmap');
  if(box&&!box.querySelector('.lm-orda')){box.insertAdjacentHTML('beforeend','<button class="lm-orda" type="button">🧟 Orda</button>');box.querySelector('.lm-orda').onclick=e=>{e.stopPropagation();orPlay(lm);};}
  lm.map.on('moveend',()=>{clearTimeout(lm._obt);lm._obt=setTimeout(()=>{if(!lm._playing)orBadges(lm);},500);});
  setTimeout(()=>{if(orLive()&&!lm._autoplay){lm._autoplay=1;orPlay(lm);}else orBadges(lm);},1500);}catch(e){}})();
  await (async()=>{try{spDraw(lm);setTimeout(()=>spDraw(lm),2500);
}catch(e){}})();
  await (async()=>{try{spDemoPlace();setTimeout(()=>{spDemoPlace();spDraw(lm);},1500);}catch(e){}})();
  await (async()=>{try{attLoad().then(()=>attDraw());setTimeout(attDraw,1500);}catch(e){}})();
  await (async()=>{try{setTimeout(()=>fxLoad(),1200);}catch(e){}})();
  return lm;}
/* scheda Mappa: base (p25) + pulsante sponsor (p26) + pulsante assalti (p29) + barra "Le tue case" (p31) */
function renderMappa(){renderMappaBase();
  (()=>{try{const w=app.querySelector('.mapfull');if(!w||w.querySelector('.mfsp'))return;
  const n=Object.values(window.SP_GEO||{}).filter(g=>g&&g.lat!=null).length;w.insertAdjacentHTML('beforeend',`<button class="mfsp" data-mfsp>⭐ ${n} sponsor</button>`);
  w.querySelector('[data-mfsp]').onclick=()=>spList(window.__mf);}catch(e){}})();
  (()=>{try{const r=app.querySelector('[data-mfraid]');if(r){r.textContent='🎬 Assalti';r.onclick=e=>{e.stopPropagation();assalto('last');};}}catch(e){}})();
  (()=>{try{mhBar();setTimeout(mhBar,1500);}catch(e){}})();
  /* 🔎 cerca un luogo in tutto il mondo (Fase 9-0): la mappa ci vola sopra e lì si comprano case come vicino a casa */
  (()=>{try{const w=app.querySelector('.mapfull');if(!w||w.querySelector('[data-mfcerca]'))return;
    w.insertAdjacentHTML('beforeend','<button class="mfcerca" data-mfcerca>🔎 Cerca un luogo</button>');w.querySelector('[data-mfcerca]').onclick=()=>cercaLuogo();}catch(e){}})();}
const CERCA_K='zsh_cerca';
function cercaVola(lat,lon,zoom){const lm=window.__mf;if(!lm||!lm.map)return;try{const c=lm.map.getCenter();const km=trM(c.lat,c.lng,lat,lon)/1000;
  lm.map.flyTo({center:[lon,lat],zoom:zoom||17,pitch:0,duration:km>300?4000:km>20?2500:1200});}catch(e){}}
function cercaLuogo(){let ult=[];try{ult=JSON.parse(localStorage.getItem(CERCA_K)||'[]');}catch(e){}
  const riga=(r,i,k)=>`<button class="strow" data-${k}="${i}"><span class="splogo">📍</span><div><b>${esc(r.n)}</b><small>${esc(r.d||'')}</small></div><i>›</i></button>`;
  const home=myHouses().find(x=>x.home);
  openSheet('🔎 Cerca un luogo',`<p style="font-weight:400;margin-bottom:8px">Città, via o luogo di tutto il mondo: la mappa ci vola sopra. Tocca una casa libera per comprarla, come vicino a casa.</p>
    <div class="row" style="gap:8px"><input id="cercaIn" class="field" placeholder="es. Times Square, New York" aria-label="Luogo da cercare" enterkeyhint="search"><button class="btn small" data-cercavai>Cerca</button></div>
    <div data-cercares style="margin-top:8px"></div>
    ${home?'<button class="btn ghost small" data-cercahome style="margin-top:8px">❤️ Torna a casa mia</button>':''}
    ${ult.length?`<h4 class="hh">Ultime ricerche</h4>${ult.map((r,i)=>riga(r,i,'cercault')).join('')}`:''}`,card=>{
    const inp=card.querySelector('#cercaIn'),box=card.querySelector('[data-cercares]');
    const scegli=r=>{try{const L=[r,...ult.filter(x=>x.n!==r.n)].slice(0,5);localStorage.setItem(CERCA_K,JSON.stringify(L));}catch(e){}closeSheet();cercaVola(r.lat,r.lon,r.z);};
    const vai=async()=>{const q=inp.value.trim();if(q.length<2){inp.focus();return;}box.innerHTML='<p class="muted"><span class="spin"></span> Cerco…</p>';
      try{const d=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=it&q='+encodeURIComponent(q),{signal:trSig(9000)}).then(x=>x.json());
        const R=(d||[]).map(x=>{const p=String(x.display_name||'').split(', ');return{n:p[0]||q,d:p.slice(1,4).join(', '),lat:+x.lat,lon:+x.lon,z:/house|building|residential|apartments|yes/.test(x.type||'')||x.addresstype==='building'?18:x.addresstype==='road'?17:x.addresstype==='city'||x.addresstype==='town'?14:16};}).filter(r=>isFinite(r.lat)&&isFinite(r.lon));
        if(!R.length){box.innerHTML='<p class="muted">Nessun luogo trovato: prova con città e via (es. “Broadway 1, New York”).</p>';return;}
        box.innerHTML=R.map((r,i)=>riga(r,i,'cercar')).join('');box.querySelectorAll('[data-cercar]').forEach(b=>b.onclick=()=>scegli(R[+b.dataset.cercar]));}
      catch(e){box.innerHTML='<p class="muted">Ricerca non riuscita: controlla la connessione e riprova.</p>';}};
    card.querySelector('[data-cercavai]').onclick=vai;inp.onkeydown=e=>{if(e.key==='Enter')vai();};
    card.querySelectorAll('[data-cercault]').forEach(b=>b.onclick=()=>scegli(ult[+b.dataset.cercault]));
    const hb=card.querySelector('[data-cercahome]');if(hb)hb.onclick=()=>{closeSheet();cercaVola(home.lat,home.lon,17);};
    setTimeout(()=>{try{inp.focus();}catch(e){}},300);});}
/* barra "Le tue case": base (p31) + disegno per tipo (p41) + disegno della casa vera (p62) */
function mhBar(){mhBarBase();
  (()=>{try{const L=myHouses();document.querySelectorAll('.mhouses [data-mh]').forEach(b=>{const h=L[+b.dataset.mh];if(!h||b.querySelector('.mhart'))return;const sp=b.querySelector('span');if(!sp)return;
  const put=t=>{if(!sp.isConnected)return;sp.outerHTML=`<span class="mhart">${h.home&&S.answers?houseArt(homeBT()||t,1,'home',{k:'m'}):houseArt(t,h.level,h.bid,{k:'m'+h.bid})}</span>`;};
  const ht=h.home?homeBT():null;if(ht)put(ht);else bType(h.lat,h.lon,h.bid||'home').then(put);});}catch(e){}})();
  (()=>{try{const L=myHouses();document.querySelectorAll('.mhouses .mhc[data-mh]').forEach(b=>{const h=L[+b.dataset.mh];if(!h||b.querySelector('.mhart[data-vera]'))return;
  const old=b.querySelector('.mhart')||b.querySelector('svg,span');const d=document.createElement('div');d.className='mhart';d.dataset.vera='1';if(old)old.replaceWith(d);else b.prepend(d);drawHouse(d,h,{noLegend:true}).then(g=>{if(!g&&!d.innerHTML)d.innerHTML=`<span style="font-size:28px">${h.ic}</span>`;});});}catch(e){}})();}
/* case del mondo sulla mappa (p21) + case dei superstiti simulati (p23) */
async function wDrawMap(lm,force){await wDrawMapBase(lm,force);setTimeout(()=>wDrawNpc(lm),250);}
/* scheda di un edificio del mondo:
   1) le MIE case e le case abitate (p58): pagina della casa o "Casa abitata"
   2) un'altra mia casa riconosciuta per posizione (p31): pagina della casa
   3) altrimenti la scheda dell'edificio (p21) col nome del simulato (p23); poi il prezzo per chi ha già case (p37) */
async function wSheet(bid,lat,lon){
  let q=null;
  try{q=await wRpc('world_quote',{p_bid:bid,p_lat:lat,p_lon:lon});}catch(e){}
  if(q&&['mine','myhome','mypending'].includes(q.status)&&S.user){const pick=()=>{const H=myHouses();const want=q.status==='mine'?H.filter(x=>!x.home):H.filter(x=>x.home);
      return want.find(x=>x.bid&&x.bid===bid)||want.map(x=>[x,trM(x.lat,x.lon,lat,lon)]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]).find(x=>trM(x.lat,x.lon,lat,lon)<120);};
    let h=pick();if(!h){try{await wMine(true);}catch(e){}h=pick();}if(h)return houseSheet(h);}
  if(!q||q.status!=='home')return wSheetEdificio(bid,lat,lon);
  const R=q.residents||[];
  const pend=!!q.pending;
  openSheet(R.length?`🏠 Casa di @${esc(R[0].nick)}${R.length>1?' e altri':''}`:'🏠 Casa abitata',`
    <div class="abhero ${pend?'pend':''}"><span>${pend?'⏳':'🏠'}</span><div><b>${R.length?R.map(r=>'@'+esc(r.nick)).join(', '):'Qui abita un superstite'}</b>
      <small>${pend?'Casa in conferma: diventa definitiva da domani.':'Casa confermata nel mondo.'} Le case abitate non si possono comprare.</small></div></div>
    ${R.length?R.map(r=>`<div class="alrow"><span class="sav">${esc((r.nick||'?')[0].toUpperCase())}</span><div class="alrt"><b>@${esc(r.nick)}</b><small>${r.status==='pending'?'⏳ in conferma':'🏠 abita qui'}${r.ally?' · 🤝 alleato':''}</small></div>
      <div class="alacts" style="width:auto"><button class="btn small ghost" data-abp="${r.user_id}">👤 Profilo</button><button class="btn small" data-abm="${r.user_id}" data-n="${esc(r.nick)}">💬 Scrivi</button></div></div>`).join('')
     :'<p class="muted" style="font-size:12.5px">Per la privacy, il nome di chi abita qui lo vedono solo i suoi alleati e i suoi coinquilini. Sulla mappa i superstiti compaiono in una posizione approssimata.</p>'}`,
    card=>{card.querySelectorAll('[data-abp]').forEach(b=>b.onclick=()=>playerSheet(b.dataset.abp));card.querySelectorAll('[data-abm]').forEach(b=>b.onclick=()=>dmSheet(b.dataset.abm,b.dataset.n));});}
async function wSheetEdificio(bid,lat,lon){
  const h=myHouses().find(x=>(x.bid&&x.bid===bid)||(Math.abs(x.lat-lat)<.0002&&Math.abs(x.lon-lon)<.0003));let r;
  if(h&&S.user)r=await houseSheet(h);else{await wSheetBase(bid,lat,lon);
    await (async()=>{try{const c=document.querySelector('#sheet.open .bzc-cat');if(c&&/simulato/.test(c.textContent)){const h=document.querySelector('#sheet.open .bzc-t h4');if(h)h.textContent='🤖 @'+npcNick(bid);
    const box=document.querySelector('#sheet.open .bzc');if(box&&!box.querySelector('.npcn'))box.insertAdjacentHTML('afterend','<p class="npcn muted" style="font-size:12.5px;margin:8px 0 0">È un <b>personaggio del gioco</b>, non una persona: tiene vivo il mondo finché arrivano giocatori veri. Puoi comprargli la casa (+30%). Se l’abitante vero si iscrive, la casa passa a lui con le regole di sempre.</p>');}}catch(e){}})();}
  await (async()=>{try{const c=document.querySelector('#sheet.open .sheet-b');const buy=c&&[...c.querySelectorAll('button')].find(b=>/^\s*(🛒|🔑|🏠)?\s*Compra/.test(b.textContent));if(c&&!c.querySelector('.hshead')&&buy&&EQ.s&&EQ.s.houses>0&&!c.querySelector('.eqpr'))
  buy.insertAdjacentHTML('beforebegin',`<p class="eqpr">Hai già ${EQ.s.houses} ${EQ.s.houses===1?'casa':'case'} comprate: il prezzo è +${EQ.s.houses*10}% (chi ha più case paga di più, così il mondo resta aperto ai nuovi).</p>`);}catch(e){}})();
  return r;}
/* scheda di un'attività: base (p20) + dati online (p20) + "segnala" (p20) + missione (p20) */
function bizSheet(b,z){bizSheetBase(b,z);
  (()=>{const c=document.querySelector('#sheet.open .sheet-card');
  if(c)fillOnline(c,b);})();
  (()=>{const c=document.querySelector('#sheet.open .sheet-card');
  const r=c&&c.querySelector('[data-rep]');
  if(r)r.onclick=()=>zReport(b.name,b.ll);})();
  (()=>{try{tmEvent('biz',b.name);}catch(e){}})();}
function lmPoi(name,cat,d,ll,pub){lmPoiBase(name,cat,d,ll,pub);
  (()=>{const c=document.querySelector('#sheet.open .sheet-card');
  if(c)fillOnline(c,{name,ll});})();
  (()=>{const c=document.querySelector('#sheet.open .sheet-card');
  const r=c&&c.querySelector('[data-rep]');
  if(r)r.onclick=()=>zReport(name,ll);})();
  (()=>{try{tmEvent('poi',name);}catch(e){}})();}
</script>
