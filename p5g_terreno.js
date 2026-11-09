<script>
/* =========================================================
   TERRENO DEL QUARTIERE (salite, discese, alture, zone basse)
   e QUARTIERE VERO generato dalla zona valutata
   Produzione: quota da modello del rilievo (Copernicus DEM) per cella.
   ========================================================= */
function terrSeed(){const H=G.hoods&&G.hoods[G.curHood];if(H&&H.id!=='own')return H.seed;return G.realHood&&S.zone?(S.zone.seed||7)+101:777;}
function hills(){const r=rng(terrSeed());return Array.from({length:3},()=>({x:40+r()*320,y:40+r()*480,a:.55+r()*.5,s:70+r()*70}));}
function elev(x,y){let e=0;hills().forEach(h=>{e+=h.a*Math.exp(-((x-h.x)**2+(y-h.y)**2)/(2*h.s*h.s));});if(y<0)e+=.9+(-y)/120;if(y>520&&y<590)e-=.35;return e;}
function terrainAt(x,y){const e=elev(x,y),c=elev(200,640)+elev(200,450)*.5;const d=e-c/1.5;
  if(e>1)return{k:'altura',l:'⛰ Altura',m:.8,d:'Zombie −20%, vedetta +1'};
  if(y>515&&y<595&&e<.2)return{k:'bassa',l:'💧 Zona bassa',m:.95,d:'Barricata −25%: rischio allagamento'};
  if(d>.25)return{k:'salita',l:'⬆ Salita',m:.8,d:'L’orda sale: zombie −20%'};
  if(d<-.05)return{k:'discesa',l:'⬇ Discesa',m:1.2,d:'L’orda scende: zombie +20%'};
  return{k:'piano',l:'➖ Pianura',m:1,d:'Nessun effetto'};}
/* effetti in battaglia */
const _buildSites=buildSites;
buildSites=function(c){const out=_buildSites(c);out.forEach(s=>{const t=terrainAt(s.x,s.y);s.slope=t.m;s.terr=t;
  if(t.k==='altura'){if(s.def&&s.def[0])s.def[0].lv+=1;else s.def=[{lv:1,lane:1}];}
  if(t.k==='bassa'&&s.barMax)s.barMax=Math.round(s.barMax*.75);
  if(s.name&&t.k!=='piano')s.name+=' · '+t.l;const lb=G.lots[s.id];if(lb&&lb.owner){s.name+=' · di @'+FRIEND_NICK(lb.owner);s.short='@'+FRIEND_NICK(lb.owner).slice(0,8);}});return out;};
/* mappa del quartiere: rilievo, etichette e, se attivo, quartiere vero */
function freeSpots(n){const used=[...LOTS.map(l=>[l.x,l.y]),...SLOTS.map(s=>[s.x,s.y]),...Object.values(HOME_POS)];const out=[];
  for(let y=-90;y<600&&out.length<n;y+=26)for(let x=26;x<380&&out.length<n;x+=22){if(Math.abs(x-196)<20)continue;if(used.every(([a,b])=>Math.hypot(a-x,b-y)>34)&&out.every(o=>Math.hypot(o[0]-x,o[1]-y)>60)){out.push([x,y]);}}return out;}
const _hoodSVG=hoodSVG;
hoodSVG=function(){let s=_hoodSVG();
  const hl=hills().map(h=>[1,.7,.45].map((k,i)=>`<ellipse cx="${h.x}" cy="${h.y}" rx="${h.s*k}" ry="${h.s*k*.62}" fill="${i===2?'#8a5a34':'none'}" fill-opacity="${i===2?.12:0}" stroke="#8a5a34" stroke-width="1.4" stroke-dasharray="5 4" opacity=".75"/>`).join('')+`<text x="${h.x}" y="${h.y+4}" text-anchor="middle" font-family="Bangers,Impact" font-size="11" fill="#5a3b24" opacity=".85">COLLE</text>`).join('');
  const mine=[['home',...HOME_POS[HTYPES[G.type].zone]],...Object.keys(G.lots).map(id=>{const l=LOTS.find(x=>x.id===id);return l?[id,l.x,l.y]:null;}).filter(Boolean)];
  const tags=mine.map(([id,x,y])=>{const t=terrainAt(x,y);if(t.k==='piano')return'';const col={salita:'#3f9b5f',altura:'#3f9b5f',discesa:'#d7263d',bassa:'#2f7fb8'}[t.k];const w=t.l.length*5.4+8;
    return`<g pointer-events="none"><rect x="${x-w/2}" y="${y+22}" width="${w}" height="12" rx="3" fill="${col}" stroke="#140f1f" stroke-width="1.2"/><text x="${x}" y="${y+31}" text-anchor="middle" font-size="8" font-weight="700" fill="#fff">${t.l}</text></g>`;}).join('');
  let real='';
  if(G.realHood&&S.zone){const sp=freeSpots(9);const kinds=[...new Set(S.zone.resources.map(r=>r.kind))].slice(0,5);
    real=kinds.map((k,i)=>{const r=S.zone.resources.find(x=>x.kind===k);const [x,y]=sp[i]||[0,0];return`<g data-rsv="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="13" fill="#fff" stroke="#140f1f" stroke-width="2.5"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="13">${RES_ICON[k][0]}</text></g>`;}).join('')
     +Object.keys(SPONSORS).map((k,i)=>{const [x,y]=sp[5+i]||[0,0];return`<g data-rsp="${k}" style="cursor:pointer"><rect x="${x-18}" y="${y-14}" width="36" height="28" fill="#f7d64a" stroke="#140f1f" stroke-width="2.5"/><path d="M${x-22} ${y-12} L${x} ${y-26} L${x+22} ${y-12}Z" fill="#d7263d" stroke="#140f1f" stroke-width="2.5"/><text x="${x}" y="${y+5}" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="#140f1f">${SPONSORS[k].logo}</text><text x="${x+15}" y="${y-12}" font-size="10">⭐</text><rect x="${x-18}" y="${y+16}" width="36" height="11" rx="3" fill="#fff" stroke="#140f1f" stroke-width="1.2"/><text x="${x}" y="${y+24.5}" text-anchor="middle" font-size="8" font-weight="700" fill="#140f1f">${rvStarsTxt('sp-'+k).split(' (')[0]}</text></g>`;}).join('');
    s=s.replace("'IL TUO QUARTIERE'","").replace('IL TUO QUARTIERE','QUARTIERE VERO');
    if(S.realNames&&S.realNames.length){const N=S.realNames.map(x=>x.toUpperCase().slice(0,22));[['PIAZZA GRANDE',0],['VIA ROMA',1],['VIALE DEI TIGLI',2],['STRADA ARGINE',3],['PORTO SUL FIUME',4]].forEach(([o,i])=>{if(N[i])s=s.split('>'+o+'<').join('>'+N[i]+'<');});}}
  const own=Object.entries(G.lots).filter(([,b])=>b.owner).map(([id,b])=>{const l=LOTS.find(x=>x.id===id);if(!l)return'';const n=FRIEND_NICK(b.owner);
    return`<g pointer-events="none"><circle cx="${l.x-16}" cy="${l.y-14}" r="8" fill="#c9b8ff" stroke="#140f1f" stroke-width="1.8"/><text x="${l.x-16}" y="${l.y-10.5}" text-anchor="middle" font-family="Bangers,Impact" font-size="10" fill="#140f1f">${n[0].toUpperCase()}</text>${b.sale?`<rect x="${l.x-22}" y="${l.y+16}" width="44" height="11" rx="3" fill="#f7d64a" stroke="#140f1f" stroke-width="1.2"/><text x="${l.x}" y="${l.y+24.5}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#140f1f">€ in vendita</text>`:''}</g>`;}).join('');
  const H=G.hoods&&G.hoods[G.curHood];if(H&&H.id!=='own')s=s.replace('IL TUO QUARTIERE',`DI @${FRIEND_NICK(H.host).toUpperCase()} · ${(H.city||'').toUpperCase()}`);
  real+=own;
  const i=s.lastIndexOf('<g transform="translate(0');const cut=i>0?i:s.lastIndexOf('</svg>');
  return s.slice(0,cut)+`<g pointer-events="none">${hl}</g>`+tags+real+s.slice(cut);};
function realHoodCard(){
  if(!S.zone)return`<div class="panel moon rhood"><b class="disp" style="font-size:20px">🗺️ Gioca nel tuo quartiere vero</b><p style="font-weight:400;font-size:13px;margin:4px 0 8px">Valuta la casa vera: il quartiere del gioco prende fiume, colline, servizi e sponsor della tua zona reale.</p><button class="btn small" data-go="valuta">Valuta la mia casa</button></div>`;
  const on=!!G.realHood;const ht=terrainAt(...HOME_POS[HTYPES[G.type].zone]);
  return`<div class="panel rhood ${on?'moon':''}"><div class="row spread"><b class="disp" style="font-size:20px">🗺️ Quartiere vero</b><label class="sw"><input type="checkbox" id="rhOn" ${on?'checked':''}><span>${on?'Attivo':'Spento'}</span></label></div>
    <p style="font-weight:400;font-size:13px;margin:4px 0">${on?`Generato da <b>${esc(S.zone.address)}</b>: colline, servizi reali e sponsor della zona. Gli sponsor mandano più casse di rifornimenti.`:'Accendilo per giocare nel quartiere generato dalla tua zona reale.'}</p>
    <p style="font-size:13px;margin-top:4px">Casa tua: <b>${ht.l}</b> · ${ht.d}</p></div>`;}
function decorateHood(){const h=[...app.querySelectorAll('h3')].find(x=>x.textContent.trim().startsWith('Il quartiere'));if(!h||app.querySelector('.rhood'))return;
  h.insertAdjacentHTML('beforebegin',realHoodCard());const card=app.querySelector('.rhood');card.dataset.grp='q';card.hidden=(G.sub||'q')!=='q';
  bindGo();const t=$('#rhOn');if(t)t.onchange=()=>{G.realHood=t.checked;toast(G.realHood?'Quartiere vero attivo':'Torni al quartiere di fantasia');renderHub();};
  const svg=app.querySelector('.hood svg');if(svg)svg.addEventListener('click',e=>{const a=e.target.closest('[data-rsv]'),b=e.target.closest('[data-rsp]');
    if(a){const r=S.zone.resources.find(x=>x.kind===a.dataset.rsv);toast(`${RES_ICON[r.kind][0]} ${r.name} · servizio reale a ${r.dist<1000?r.dist+' m':(r.dist/1000).toFixed(1).replace('.',',')+' km'}`);}
    if(b){e.stopPropagation();sponsorSheet(b.dataset.rsp,S.zone);}});}
</script>
