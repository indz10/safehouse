<script>
/* =========================================================
   ZONE > VIVERE QUI — dati di zona per chi cerca casa
   Produzione: negozi e servizi da Google Places / OpenStreetMap,
   trasporti da GTFS regionali, prezzi da quotazioni OMI (Agenzia
   delle Entrate) + annunci forniti dalle agenzie partner via feed.
   Nessun dato su criminalità o composizione sociale.
   ========================================================= */
const BIZ=[['bar','Bar','☕'],['alim','Alimentari','🧀'],['pane','Panificio','🥖'],['risto','Ristorante','🍝'],['edic','Edicola','🗞️'],['parr','Parrucchiere','💈'],['gym','Palestra','🏋️'],['banca','Banca','🏦'],['posta','Ufficio postale','✉️'],['ferr','Ferramenta','🔧']];
const SURN=['Rossi','Bianchi','Ferrari','Gatti','Bassi','Neri','Colombo','Galli','Mantovani','Bellini'];
const AGENCIES=[{n:'Immobiliare Mincio',c:'#2f5fb8'},{n:'Casa & Co.',c:'#d7263d'},{n:'Studio Abitare',c:'#3f9b5f'},{n:'Agenzia Lago Blu',c:'#6fa8dc'}];
function reData(z){
  if(z._re)return z._re;
  const r=rng((z.seed||7)+77);const k=z.type==='centro'?1:z.type==='periferia'?.6:.3;
  const shops=[];BIZ.forEach(([id,lab,ic])=>{const n=Math.max(id==='posta'||id==='banca'?1:0,Math.round((1+r()*2.4)*k));for(let i=0;i<n;i++)shops.push({id,lab,ic,name:id==='ferr'&&i===0?'Ferramenta Volta':`${lab} ${SURN[Math.floor(r()*SURN.length)]}`,partner:id==='ferr'&&i===0||r()<.12,x:.06+r()*.88,y:.08+r()*.84,dist:Math.round((60+r()*900)/(.4+k))});});
  const stops=Array.from({length:z.type==='centro'?5:z.type==='periferia'?3:1},()=>({x:.08+r()*.84,y:.1+r()*.8}));
  const station=Math.round((z.type==='centro'?400:z.type==='periferia'?1500:5200)*(.6+r()*.8));
  const schools=Array.from({length:z.type==='centro'?3:z.type==='periferia'?2:1},(_,i)=>({name:['Scuola dell’infanzia','Scuola primaria','Scuola media'][i],x:.1+r()*.8,y:.1+r()*.8}));
  const parks=z.type==='campagna'?4:Math.round(1+r()*2);
  const base=z.type==='centro'?1950:z.type==='periferia'?1550:z.type==='lago'?2600:z.type==='montagna'?2900:1100;const sale=Math.round(base*(.85+r()*.3)/10)*10;
  const rent=Math.round(sale*.0046*10)/10;const trend=Math.round((-2+r()*8)*10)/10;
  const kinds=z.type==='montagna'?['rifugio','apt','rifugio','villa']:z.type==='lago'?['barca','villa','apt','schiera']:z.type==='centro'?['apt','apt','apt','schiera']:z.type==='periferia'?['schiera','villa','apt','villa']:['casale','villa','casale','schiera'];
  const KL={apt:'Appartamento',schiera:'Villetta a schiera',villa:'Villa',casale:'Casale',barca:'Casa galleggiante',rifugio:'Baita'};
  const listings=Array.from({length:7},(_,i)=>{const t=kinds[Math.floor(r()*kinds.length)];const mq=Math.round((t==='apt'?55+r()*70:t==='schiera'?90+r()*60:t==='villa'?140+r()*120:180+r()*200));const isRent=r()<.38;
    const ag=AGENCIES[Math.floor(r()*(z.address.toLowerCase().includes('lago')||z.address.toLowerCase().includes('riva')?4:3))];
    return{t,kl:KL[t],mq,rooms:Math.max(2,Math.round(mq/32)),rent:isRent,price:isRent?Math.round(mq*rent*(.85+r()*.35)/10)*10:Math.round(mq*sale*(.85+r()*.35)/1000)*1000,ag,feat:r()<.35,x:.08+r()*.84,y:.1+r()*.8,energy:'ABCDEFG'[Math.floor(r()*7)]};});
  const d=(kind)=>{const x=z.resources.filter(p=>p.kind===kind).sort((a,b)=>a.dist-b.dist)[0];return x?x.dist:5000;};
  const sc=v=>Math.max(5,Math.min(100,Math.round(v)));
  const subs=[
    ['Sanità e farmacie',sc(100-d('farm')/25-d('osp')/70)],
    ['Spesa e negozi',sc(25+shops.length*5-d('super')/40)],
    ['Trasporti',sc(stops.length*16+60-station/90)],
    ['Scuole',sc(schools.length*28+10)],
    ['Verde e sport',sc(parks*20+shops.filter(s=>s.id==='gym').length*12+15)],
    ['Servizi di emergenza',sc(100-d('cc')/35-d('vvf')/45)]
  ];
  const score=Math.round(subs.reduce((t,s)=>t+s[1],0)/subs.length);
  z._re={shops,stops,station,schools,parks,sale,rent,trend,listings,subs,score};return z._re;
}
function liveLabel(v){return v>=80?['Ottima','#3f9b5f']:v>=65?['Buona','#6fb59a']:v>=50?['Discreta','#f7d64a']:['Da migliorare','#d7263d'];}
const fmtEur=v=>v.toLocaleString('it-IT')+' €';
const fmtK=v=>v>=1000?Math.round(v/1000)+'k':v;
function vivereHero(){
  const shops=[['BAR','#d7263d'],['PANE','#f7d64a'],['FARMACIA','#3f9b5f'],['CASE','#2f5fb8'],['FIORI','#c9b8ff']];
  return`<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Via di quartiere di giorno con negozi">${defs('vh')}
   <rect width="400" height="200" fill="#9fd3e6"/><rect width="400" height="200" fill="url(#htlvh)"/>
   <circle cx="340" cy="40" r="24" fill="#f7d64a" stroke="${INK}" stroke-width="3"/>
   ${shops.map(([t,c],i)=>{const x=-6+i*84;return`<g stroke="${INK}" stroke-width="3"><rect x="${x}" y="58" width="80" height="120" fill="#e8dcbf"/><rect x="${x+10}" y="70" width="22" height="20" fill="#bfe3f2"/><rect x="${x+48}" y="70" width="22" height="20" fill="#bfe3f2"/>
     <path d="M${x} 112 H${x+80} L${x+74} 128 H${x+6}Z" fill="${c}"/>${[0,1,2,3].map(k=>`<path d="M${x+6+k*20} 128 L${x+12+k*20} 112" stroke-width="1.5"/>`).join('')}
     <rect x="${x+8}" y="96" width="64" height="14" fill="#fff"/><text x="${x+40}" y="107" text-anchor="middle" font-family="Bangers,Impact" font-size="11" fill="${INK}" stroke="none">${t}</text>
     <rect x="${x+12}" y="134" width="24" height="44" fill="#8a5a34"/><rect x="${x+44}" y="134" width="26" height="28" fill="#bfe3f2"/></g>`;}).join('')}
   <rect y="176" width="400" height="24" fill="#cfc6e6" stroke="${INK}" stroke-width="3"/></svg>`;
}
function reMap(z,d,own){
  const L=S.reL||(S.reL={shops:true,serv:true,tr:true,sch:true,ads:true,comm:false,spons:true});
  let svg=mapScene(z,{poi:L.serv,users:false,heat:false,me:own,mode:'day',comm:L.comm,spons:L.spons});
  const W=400,H=420;let pins='';
  if(L.tr)d.stops.forEach((s,i)=>{pins+=`<g class="pin" data-re="tr:${i}" style="cursor:pointer"><circle cx="${s.x*W}" cy="${s.y*H}" r="9" fill="#2f5fb8" stroke="${INK}" stroke-width="2.5"/><text x="${s.x*W}" y="${s.y*H+4}" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="#fff">B</text></g>`;});
  if(L.sch)d.schools.forEach((s,i)=>{pins+=`<g class="pin" data-re="sch:${i}" style="cursor:pointer"><rect x="${s.x*W-10}" y="${s.y*H-10}" width="20" height="20" fill="#f7d64a" stroke="${INK}" stroke-width="2.5"/><text x="${s.x*W}" y="${s.y*H+5}" text-anchor="middle" font-size="12">🏫</text></g>`;});
  if(L.shops)d.shops.forEach((s,i)=>{if(!s.partner)return;pins+=`<g class="pin" data-re="sh:${i}" style="cursor:pointer"><rect x="${s.x*W-10}" y="${s.y*H-10}" width="20" height="20" rx="4" fill="${s.partner?'#f7d64a':'#fff'}" stroke="${INK}" stroke-width="${s.partner?3:2}"/><text x="${s.x*W}" y="${s.y*H+5}" text-anchor="middle" font-size="12">${s.ic}</text></g>`;});
  if(L.ads)d.listings.forEach((l,i)=>{const x=l.x*W,y=l.y*H,t=l.rent?fmtEur(l.price)+'/m':'€'+fmtK(l.price);const w=Math.max(44,t.length*6.4);
    pins+=`<g class="pin" data-re="ad:${i}" style="cursor:pointer"><path d="M${x-w/2} ${y-26} h${w} v18 h${-w/2+6} l-6 8 l-6 -8 h${-w/2+6}Z" fill="${l.rent?'#2f7fb8':'#d7263d'}" stroke="${INK}" stroke-width="2.5"/><text x="${x}" y="${y-13}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="10" fill="#fff">${t}</text></g>`;});
  return svg.replace(/<\/svg>\s*$/,pins+'</svg>');
}
function renderVivere(){
  const z=S.reZone||S.zone;const own=z&&S.zone&&z===S.zone;
  const head=`<div class="maphero">${vivereHero()}<div class="mh-t"><h2>Vivere qui</h2><div class="caption">Servizi, negozi, prezzi e annunci di ogni zona</div></div></div>${zoneSeg()}`;
  const search=`<div class="panel"><label for="reQ" class="disp" style="font-size:20px">Cerca una zona o un indirizzo</label>
     <div class="row" style="margin-top:6px"><input id="reQ" class="field" placeholder="Es. Mantova centro" value="${esc(z?z.address:'')}"><button class="btn small" id="reGo">Cerca</button></div></div>`;
  if(!z){app.innerHTML=head+`<div class="page">${search}<div class="panel moon"><p>Scrivi una zona per vedere vivibilità, prezzi, negozi e annunci. Oppure valuta prima la tua casa: la tua zona comparirà qui.</p></div>${b2b()}</div>`;bindVivere(null);return;}
  if(S.rvMode==='vacanza'){app.innerHTML=head+`<div class="page">${search}${rvSeg()}${vacanzaHTML(z)}</div>`;bindVivere(z,reData(z));bindReviews();return;}
  const d=reData(z);const [lab,col]=liveLabel(d.score);
  const L=S.reL||(S.reL={shops:true,serv:true,tr:true,sch:true,ads:true,comm:false,spons:true});
  const ads=d.listings.filter(l=>(S.reMode||'vendita')==='affitto'?l.rent:!l.rent).sort((a,b)=>b.feat-a.feat);
  const cats={};d.shops.forEach(s=>{(cats[s.lab]=cats[s.lab]||[]).push(s);});
  const cmp=S.zone&&z!==S.zone?(()=>{const o=reData(S.zone);return`<div class="panel"><h3>Confronto con la tua zona</h3><table class="cmp"><tr><th></th><th>${esc(z.address)}</th><th>La tua zona</th></tr>
     <tr><td>Vivibilità</td><td><b>${d.score}</b></td><td><b>${o.score}</b></td></tr><tr><td>Vendita €/m²</td><td>${fmtEur(d.sale)}</td><td>${fmtEur(o.sale)}</td></tr>
     <tr><td>Affitto €/m² mese</td><td>${d.rent.toFixed(1).replace('.',',')} €</td><td>${o.rent.toFixed(1).replace('.',',')} €</td></tr><tr><td>Negozi</td><td>${d.shops.length}</td><td>${o.shops.length}</td></tr><tr><td>Fermate bus</td><td>${d.stops.length}</td><td>${o.stops.length}</td></tr></table></div>`;})():'';
  app.innerHTML=head+`<div class="page">${search}${rvSeg()}
   <div class="panel">
     <div class="row spread"><div><small class="muted">Indice di vivibilità</small><h3>${esc(z.address)}</h3><span class="tag" style="background:${col}">${lab}</span></div><div class="ring-s" style="--v:${d.score};--c:${col}"><b>${d.score}</b><small>su 100</small></div></div>
     <div class="bars" style="margin-top:8px">${d.subs.map(([n,v])=>`<div class="b"><div class="row spread"><span>${n}</span><b>${v}</b></div><div><span class="fill ${v>=65?'good':v>=50?'mid':''}" style="width:${v}%"></span></div></div>`).join('')}</div>
     <p class="muted" style="font-size:12px;margin-top:8px">Calcolato su distanze e quantità di servizi, negozi, trasporti, scuole e verde. Non usiamo dati su criminalità o sulle persone che ci abitano.</p>
   </div>
   <div class="row" style="gap:8px;margin-bottom:16px">
     <div class="stat"><b>${fmtEur(d.sale)}</b><small>al m² in vendita</small></div>
     <div class="stat"><b>${d.rent.toFixed(1).replace('.',',')} €</b><small>al m² al mese in affitto</small></div>
     <div class="stat"><b style="color:${d.trend>=0?'#3f9b5f':'#d7263d'}">${d.trend>=0?'▲':'▼'} ${Math.abs(d.trend).toString().replace('.',',')}%</b><small>ultimi 12 mesi</small></div>
   </div>
   <div class="panel mapwrap" style="padding:0;overflow:hidden" id="remap">
     <div class="maptools">${[['ads','Annunci'],['spons','Sponsor'],['comm','Community'],['shops','Negozi partner'],['serv','Servizi pubblici'],['tr','Trasporti'],['sch','Scuole']].map(([k,l])=>`<button class="chip ${L[k]?'on':''}" data-rl="${k}">${l}</button>`).join('')}</div>
     <div class="mapsvg">${reMap(z,d,own)}</div>
     <div class="mapinfo" id="reinfo"><span class="muted">Tocca un segnaposto: negozi, fermate, scuole o annunci.</span></div>
   </div>
   <h3 style="margin:16px 0 8px">Case in zona</h3>
   <div class="seg" style="margin-bottom:10px"><button class="${(S.reMode||'vendita')==='vendita'?'on':''}" data-rm="vendita">In vendita</button><button class="${S.reMode==='affitto'?'on':''}" data-rm="affitto">In affitto</button></div>
   ${ads.length?ads.map((l,i)=>`<div class="listing ${l.feat?'feat':''}">
      <img alt="${l.kl}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(gHouse(l.t,{}))}">
      <div style="flex:1;min-width:0">${l.feat?'<span class="tag sp">Annuncio sponsorizzato</span>':''}
        <div class="disp" style="font-size:26px;margin-top:2px">${l.rent?fmtEur(l.price)+' al mese':fmtEur(l.price)}</div>
        <div style="font-size:14px">${l.kl} · ${l.mq} m² · ${l.rooms} locali · classe ${l.energy}</div>
        <div class="row" style="gap:6px;margin-top:6px"><span class="aglogo" style="background:${l.ag.c}">${l.ag.n[0]}</span><small>${l.ag.n}</small></div>
        <button class="btn small alt" style="margin-top:8px" data-contact="${d.listings.indexOf(l)}">Contatta l’agenzia</button>
      </div></div>`).join(''):`<div class="notice">Nessun annuncio ${S.reMode==='affitto'?'in affitto':'in vendita'} in questa zona per ora.</div>`}
   <div id="contactBox"></div>
   ${cmp}
   <h3 style="margin:16px 0 8px">Negozi e attività</h3>
   <div class="panel">${Object.entries(cats).map(([k,arr])=>`<div class="shopcat"><b>${arr[0].ic} ${k}</b><small class="muted"> · ${arr.length}</small>${arr.map(s=>{const key='s-'+z.address+'-'+s.name;const n=4+(s.name.length%7),b=3.4+(s.name.length%5)*.3;return`<div class="shoprow"><div style="flex:1;min-width:0">${s.partner?`<b class="ptn">${esc(s.name)} ★ partner</b>`:`<b>${esc(s.name)}</b>`}<div>${rvLine(key,n,b)}</div></div><button class="btn small ghost" data-rv="${esc(key)}" data-rvn="${esc(s.name)}" data-rvc="${n}" data-rvb="${b}">Recensioni</button></div>`;}).join('')}</div>`).join('')}</div>
   <div class="panel"><b>Trasporti e scuole</b>
     <div class="frow"><span style="font-size:20px;width:28px">🚌</span><div style="flex:1">${d.stops.length} fermate dell’autobus in zona</div></div>
     <div class="frow"><span style="font-size:20px;width:28px">🚆</span><div style="flex:1">Stazione a ${d.station<1000?d.station+' m':(d.station/1000).toFixed(1).replace('.',',')+' km'}</div></div>
     <div class="frow"><span style="font-size:20px;width:28px">🏫</span><div style="flex:1">${d.schools.map(s=>s.name).join(', ')}</div></div>
     <div class="frow"><span style="font-size:20px;width:28px">🌳</span><div style="flex:1">${d.parks} aree verdi</div></div></div>
   <h3 style="margin:16px 0 8px">Agenzie in zona</h3>
   ${[...new Set(d.listings.map(l=>l.ag))].map(a=>`<div class="panel sponsor"><div class="logo" style="background:${a.c};color:#fff">${a.n[0]}</div><div style="flex:1"><b>${a.n}</b><div class="muted" style="font-size:13px">${d.listings.filter(l=>l.ag===a).length} annunci in zona · agenzia partner</div></div></div>`).join('')}
   ${b2b()}
   <p class="notice" style="margin:8px 0 20px">Anteprima: dati simulati. Nella versione pubblicata: negozi e servizi da Google Maps e OpenStreetMap, prezzi dalle quotazioni dell’Agenzia delle Entrate (OMI), annunci dalle agenzie partner. Gli annunci a pagamento sono sempre segnalati come sponsorizzati.</p>
  </div>`;
  bindVivere(z,d);bindReviews();wireCommunity($('#remap .mapsvg'),z,$('#reinfo'));
}
function b2b(){return`<div class="panel night" style="margin-top:16px"><h3 style="color:var(--moon)">Sei un’agenzia o un negozio?</h3>
   <p style="font-weight:400;color:#e5def5;margin:6px 0 10px">Chi usa ZombieSafeHouse conosce la sua zona: servizi, negozi, prezzi. Fatti trovare proprio lì.</p>
   <div class="b2b"><div><b>Vetrina di zona</b><small>Logo e scheda in evidenza nella zona scelta</small><span>da 49 € al mese</span></div>
   <div><b>Annuncio in evidenza</b><small>In cima alla lista e sulla mappa</small><span>da 19 € ad annuncio al mese</span></div>
   <div><b>Contatti qualificati</b><small>Richieste di chi cerca casa in zona</small><span>8–15 € a contatto</span></div></div>
   <button class="btn alt small" style="margin-top:10px" id="b2bBtn">Richiedi informazioni</button>
   <p style="font-size:11px;font-weight:400;color:#cfc6e6;margin-top:8px">Prezzi indicativi da validare.</p></div>`;}
function bindVivere(z,d){
  const go=async()=>{const q=$('#reQ').value.trim();if(!q){toast('Scrivi una zona');return;}$('#reGo').innerHTML='<span class="spin"></span>';S.reZone=(S.zone&&S.zone.address===q)?S.zone:await analyzeZone(q);renderVivere();};
  $('#reGo').onclick=go;$('#reQ').onkeydown=e=>{if(e.key==='Enter')go();};
  bindZoneSeg();
  const bb=$('#b2bBtn');if(bb)bb.onclick=()=>{S.motivo='agenzia';go('contatti');};
  if(!z)return;
  app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{S.reMode=b.dataset.rm;renderVivere();});
  app.querySelectorAll('[data-rl]').forEach(b=>b.onclick=()=>{S.reL[b.dataset.rl]=!S.reL[b.dataset.rl];renderVivere();setTimeout(()=>$('#remap').scrollIntoView({block:'center'}),10);});
  const info=$('#reinfo');
  app.querySelectorAll('#remap [data-re]').forEach(p=>p.onclick=()=>{const [k,i]=p.dataset.re.split(':');vibe();
    if(k==='sh'){const s=d.shops[+i];const key='s-'+z.address+'-'+s.name;const n=4+(s.name.length%7),b=3.4+(s.name.length%5)*.3;info.innerHTML=`<b>${s.ic} ${esc(s.name)}</b>${s.partner?'<span class="tag sp">partner</span>':''}<span>${s.lab} · a ${s.dist} m</span><span>${rvLine(key,n,b)}</span>${rvBtn(key,s.name,n,b)}`;}
    if(k==='tr')info.innerHTML=`<b>🚌 Fermata autobus</b><span>Linee urbane ed extraurbane (dati demo)</span>`;
    if(k==='sch'){info.innerHTML=`<b>🏫 ${d.schools[+i].name}</b>`;}
    if(k==='ad'){const l=d.listings[+i];info.innerHTML=`<b>${l.kl} · ${l.mq} m²</b><span>${l.rent?fmtEur(l.price)+' al mese':fmtEur(l.price)} · ${l.ag.n}</span><button class="btn small alt" data-contact="${i}">Contatta</button>`;bindContact();}});
  app.querySelectorAll('#remap [data-poi]').forEach(p=>p.onclick=()=>{const r=z.resources[+p.dataset.poi];const key='p-'+(z.address||'')+'-'+r.name;info.innerHTML=`<b>${RES_ICON[r.kind][0]} ${r.name}</b><span>a ${r.dist<1000?r.dist+' m':(r.dist/1000).toFixed(1).replace('.',',')+' km'}</span><span>${rvLine(key,6,4)}</span>${rvBtn(key,r.name,6,4)}`;});
  bindContact();
  function bindContact(){app.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>{const l=d.listings[+b.dataset.contact];const box=$('#contactBox');
    box.innerHTML=`<div class="panel moon"><h3>Contatta ${l.ag.n}</h3><p style="font-weight:400;margin:4px 0 8px">${l.kl} · ${l.mq} m² · ${l.rent?fmtEur(l.price)+' al mese':fmtEur(l.price)}</p>
      <input class="field" id="cN" placeholder="Nome" autocomplete="name" style="margin-bottom:8px"><input class="field" id="cE" placeholder="Email o telefono" style="margin-bottom:8px">
      <label style="display:flex;gap:8px;font-size:13px;font-weight:400;align-items:flex-start"><input type="checkbox" id="cP" style="width:20px;height:20px;flex:none"> Acconsento a inviare i miei dati a ${l.ag.n} per essere ricontattato su questo annuncio.</label>
      <button class="btn small" id="cSend" style="margin-top:10px">Invia la richiesta</button></div>`;
    box.scrollIntoView({behavior:'smooth',block:'center'});
    $('#cSend').onclick=()=>{if(!$('#cN').value.trim()||!$('#cE').value.trim()){toast('Scrivi nome e contatto');return;}if(!$('#cP').checked){toast('Serve il consenso per inviare la richiesta');return;}box.innerHTML='<div class="panel"><b>Richiesta inviata.</b> L’agenzia ti ricontatterà (demo: nessun dato è stato inviato).</div>';};});}
}
function zoneSeg(){const v=S.zv==='mondo'?'mondo':S.zv!=='vivere'?'zombie':S.rvMode==='vacanza'?'vacanza':'vivere';return`<div class="seg zseg" style="margin:12px 14px 0;width:auto"><button class="${v==='zombie'?'on':''}" data-zv="zombie">🧟 Sicurezza</button><button class="${v==='vivere'?'on':''}" data-zv="vivere">🏘️ Vivere qui</button><button class="${v==='vacanza'?'on':''}" data-zv="vacanza">🧳 Vacanza</button><button class="${v==='mondo'?'on':''}" data-zv="mondo">🌍 Mondo</button></div>`;}
function bindZoneSeg(){app.querySelectorAll('[data-zv]').forEach(b=>b.onclick=()=>{const k=b.dataset.zv;if(k==='mondo')S.zv='mondo';else if(k==='zombie')S.zv='zombie';else{S.zv='vivere';S.rvMode=k==='vacanza'?'vacanza':'vivere';}vibe();renderMappa();window.scrollTo(0,0);});}
</script>
