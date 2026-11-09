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
function liveLabel(v){return v>=80?['Ottima','#3f9b5f']:v>=65?['Buona','#6fb59a']:v>=50?['Discreta','#f7d64a']:['Da migliorare','#d7263d'];}
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
function b2b(){return`<div class="panel night" style="margin-top:16px"><h3 style="color:var(--moon)">Sei un’agenzia o un negozio?</h3>
   <p style="font-weight:400;color:#e5def5;margin:6px 0 10px">Chi usa ZombieSafeHouse conosce la sua zona: servizi, negozi, prezzi. Fatti trovare proprio lì.</p>
   <div class="b2b"><div><b>Vetrina di zona</b><small>Logo e scheda in evidenza nella zona scelta</small><span>da 49 € al mese</span></div>
   <div><b>Annuncio in evidenza</b><small>In cima alla lista e sulla mappa</small><span>da 19 € ad annuncio al mese</span></div>
   <div><b>Contatti qualificati</b><small>Richieste di chi cerca casa in zona</small><span>8–15 € a contatto</span></div></div>
   <button class="btn alt small" style="margin-top:10px" id="b2bBtn">Richiedi informazioni</button>
   <p style="font-size:11px;font-weight:400;color:#cfc6e6;margin-top:8px">Prezzi indicativi da validare.</p></div>`;}
function zoneSeg(){const v=S.zv==='mondo'?'mondo':S.zv!=='vivere'?'zombie':S.rvMode==='vacanza'?'vacanza':'vivere';return`<div class="seg zseg" style="margin:12px 14px 0;width:auto"><button class="${v==='zombie'?'on':''}" data-zv="zombie">🧟 Sicurezza</button><button class="${v==='vivere'?'on':''}" data-zv="vivere">🏘️ Vivere qui</button><button class="${v==='vacanza'?'on':''}" data-zv="vacanza">🧳 Vacanza</button><button class="${v==='mondo'?'on':''}" data-zv="mondo">🌍 Mondo</button></div>`;}
function bindZoneSeg(){app.querySelectorAll('[data-zv]').forEach(b=>b.onclick=()=>{const k=b.dataset.zv;if(k==='mondo')S.zv='mondo';else if(k==='zombie')S.zv='zombie';else{S.zv='vivere';S.rvMode=k==='vacanza'?'vacanza':'vivere';}vibe();renderMappa();window.scrollTo(0,0);});}
</script>
