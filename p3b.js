/* ---------- personaggi ---------- */
function person(x,y,s,shirt,opt={}){
  const f=opt.flip?-1:1;
  const torch=opt.torch?`<path d="M14 -40 L70 -62 L70 -20Z" fill="#f7d64a" opacity=".45" stroke="none"/><rect x="8" y="-44" width="10" height="7" fill="#7c8794"/>`:'';
  const coat=opt.coat?`<path d="M-10 -46 L10 -46 L13 -10 L-13 -10Z" fill="${opt.coat}"/>`:'';
  return`<g transform="translate(${x} ${y}) scale(${s*f} ${s})" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
   ${torch}
   <path d="M-7 -10 L-11 0 M7 -10 L11 0" stroke-width="5"/>
   <rect x="-10" y="-46" width="20" height="38" rx="4" fill="${shirt}"/>${coat}
   <path d="M10 -40 L18 -24" stroke-width="5"/><path d="M-10 -40 L-18 -24" stroke-width="5"/>
   <circle cx="0" cy="-56" r="11" fill="#f2c9a0"/>
   ${opt.hood?`<path d="M-12 -56 Q0 -76 12 -56" fill="${opt.coat||shirt}"/>`:`<path d="M-11 -60 Q0 -72 11 -60" fill="#3b2a1e"/>`}
   <circle cx="4" cy="-56" r="1.6" fill="${INK}" stroke="none"/>
  </g>`;
}
function vehicle(type,x,y){
  if(type==='bici')return`<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="3" fill="none"><circle cx="-14" cy="0" r="10" fill="#fff"/><circle cx="16" cy="0" r="10" fill="#fff"/><path d="M-14 0 L-2 -16 L12 -16 L16 0 M-2 -16 L2 0 L-14 0 M12 -16 L10 -22 M-4 -20 h6" stroke="#d7263d"/></g>`;
  const suv=type==='fuori';
  const body=suv?'#3f6b4f':'#2f7fb8';
  return`<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
   ${suv?`<rect x="-22" y="-44" width="12" height="9" fill="#d7263d"/><rect x="-6" y="-44" width="12" height="9" fill="#d7263d"/>`:''}
   <path d="M-38 0 V-16 L-26 -18 L-16 ${suv?-36:-32} H18 L30 -18 L40 -16 V0Z" fill="${body}"/>
   <path d="M-12 ${suv?-32:-28} H2 V-18 H-22Z M6 ${suv?-32:-28} H16 L24 -18 H6Z" fill="#bfe3f2" stroke-width="2"/>
   <circle cx="-22" cy="0" r="9" fill="#2b2240"/><circle cx="24" cy="0" r="9" fill="#2b2240"/><circle cx="-22" cy="0" r="3" fill="#cfc6e6" stroke="none"/><circle cx="24" cy="0" r="3" fill="#cfc6e6" stroke="none"/>
   <rect x="34" y="-14" width="6" height="5" fill="#f7d64a" stroke-width="2"/>
  </g>`;
}
function dog(x,y){return`<g transform="translate(${x} ${y})" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"><path d="M-14 0 V-10 Q-14 -16 -6 -16 H8 L12 -24 L18 -22 L18 -12 Q18 -6 10 -6 V0 M-14 -12 L-20 -18" fill="#a8743a"/><circle cx="14" cy="-18" r="1.5" fill="${INK}"/></g>`;}
function treeShape(x,y,s=1){return`<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="3"><rect x="-5" y="-20" width="10" height="20" fill="#5a3b24"/><circle cx="0" cy="-40" r="22" fill="#2f6b45"/><circle cx="-14" cy="-28" r="13" fill="#2f6b45"/><circle cx="14" cy="-28" r="13" fill="#2f6b45"/><circle cx="-6" cy="-46" r="6" fill="#4f8f5f" stroke="none"/></g>`;}

/* ---------- scena del gioco: casa dettagliata ---------- */
function houseScene(a,opt={}){
  const id='g'+(opt.sid||'');
  const W=480,G=282;
  const door={b4:['#4a5260','#d7263d'],blindata:['#7c8794',null],legno:['#8a5a34',null],vetro:['#9fd3e6',null],ns:['#8a5a34',null]}[a.porta]||['#8a5a34',null];
  const anti=a.vetri==='anti';
  const glass=anti?'#bfe3f2':'#f7d64a';
  const win=(x,y,ground)=>{
    let g=`<rect x="${x-4}" y="${y+34}" width="46" height="6" fill="#cfc6e6"/><rect x="${x}" y="${y}" width="38" height="34" fill="${glass}"/><path d="M${x+19} ${y}V${y+34}M${x} ${y+17}H${x+38}" stroke-width="2.5"/>`;
    if(anti)g+=`<path d="M${x+28} ${y+4} l6 2 v5 q0 5 -6 7 q-6 -2 -6 -7 v-5z" fill="#3f9b5f" stroke-width="1.5"/>`;
    const shut=a.tapparelle==='blind'?'#7c8794':a.tapparelle==='allu'?'#d9d4c8':a.tapparelle==='legno'?'#6b8f4e':null;
    if(shut&&a.tapparelle!=='blind')g+=`<rect x="${x-10}" y="${y}" width="9" height="34" fill="${shut}"/><rect x="${x+39}" y="${y}" width="9" height="34" fill="${shut}"/>`;
    if(a.tapparelle==='blind')g+=`<rect x="${x}" y="${y}" width="38" height="${ground?16:34}" fill="#7c8794"/>${[5,10,15,20,25,30].filter(o=>ground?o<16:true).map(o=>`<path d="M${x} ${y+o}H${x+38}" stroke-width="1.4"/>`).join('')}`;
    if(ground&&(a.grate==='tutte'||(a.grate==='alcune'&&x<240)))g+=[5,13,21,29,35].map(o=>`<path d="M${x+o} ${y-4}V${y+38}" stroke-width="3.5"/>`).join('')+`<path d="M${x-4} ${y+9}H${x+42}M${x-4} ${y+27}H${x+42}" stroke-width="3"/>`;
    return g;
  };
  /* sfondo e vicini */
  const helpers=a.gruppo==='org'||a.vicini==='20';
  const nb=(x,lit)=>`<g stroke="${INK}" stroke-width="2.5"><path d="M${x} ${G} V${G-46} L${x+30} ${G-70} L${x+60} ${G-46} V${G}Z" fill="#33276a"/><rect x="${x+20}" y="${G-36}" width="16" height="16" fill="${lit?'#f7d64a':'#1d1640'}"/></g>`;
  const neighbors=(a.vicini!=='lontani'?nb(-8,a.gruppo==='org')+nb(430,a.gruppo==='org'):'')+(a.gruppo==='org'?`<g stroke="${INK}" stroke-width="2.5"><path d="M402 150 H476 V178 H440 L430 190 L432 178 H402Z" fill="#fff"/></g><text x="410" y="170" font-family="Bangers,Impact" font-size="15" fill="${INK}" textLength="58" lengthAdjust="spacingAndGlyphs">CI SIAMO!</text>`:'');
  const trees=a.visibile==='nasc'?treeShape(34,G,1.15)+treeShape(118,G-2,.9)+treeShape(452,G,1.1):a.visibile==='poco'?treeShape(30,G,.9):'';
  const hedge=a.visibile==='nasc'?`<path d="M0 ${G+6} q14 -26 28 0 q14 -26 28 0 q14 -26 28 0 q14 -26 28 0 q14 -26 28 0 q14 -26 28 0 q14 -26 28 0 V${G+8}H0Z" fill="#2f6b45" stroke="${INK}" stroke-width="2.5"/>`:'';
  /* tetto */
  const solar=a.energia==='fv'?`<g stroke="${INK}" stroke-width="2"><path d="M146 126 L196 92 L214 104 L164 138Z" fill="#2f7fb8"/><path d="M158 118 L176 130 M170 110 L188 122 M182 102 L200 114 M152 132 L202 98" stroke="#9fd3e6"/></g>`:'';
  const ant=a.radio==='radio'?`<g stroke="${INK}" stroke-width="3" fill="none"><path d="M226 64 V28 M214 38 H238 M218 48 H234"/><circle cx="226" cy="26" r="4" fill="#d7263d"/></g>`:'';
  const mast=a.walkie==='1'?`<g stroke="${INK}" stroke-width="3" fill="none"><path d="M300 108 V14 M292 30 L300 14 L308 30 M294 60 H306"/><path d="M314 22 q8 8 0 16 M322 16 q14 14 0 28" stroke="#f7d64a" stroke-width="2.5"/></g>`:'';
  const smoke=a.calore==='legna'?`<g fill="#cfc6e6" class="smoke"><circle cx="282" cy="62" r="8" opacity=".85"/><circle cx="292" cy="46" r="11" opacity=".6"/><circle cx="306" cy="28" r="14" opacity=".4"/></g>`:'';
  const ladder=a.tetto==='est'?`<g stroke="${INK}" stroke-width="3"><path d="M118 ${G} L150 120 M132 ${G} L164 120" fill="none"/>${[0,1,2,3,4,5,6].map(i=>`<path d="M${121+i*4.6} ${G-14-i*22} H${135+i*4.6}"/>`).join('')}</g>`:'';
  /* garage e mezzo */
  const gar=a.garage!=='no'&&a.garage?`<g stroke="${INK}" stroke-width="3"><rect x="320" y="196" width="84" height="${G-196}" fill="#3e3470"/><rect x="316" y="190" width="92" height="8" fill="#2b2240"/>
     ${a.garage==='sez'?`<rect x="330" y="214" width="64" height="${G-214}" fill="#9aa4b0"/>${[226,238,250,262,274].map(y=>`<path d="M330 ${y}H394" stroke-width="2"/>`).join('')}`:a.garage==='bas'?`<rect x="330" y="214" width="64" height="${G-214}" fill="#c9c2b0"/><rect x="356" y="248" width="12" height="4" fill="${INK}"/>`:`<rect x="330" y="214" width="64" height="${G-214}" fill="#140f1f"/><path d="M330 214 L394 222" stroke="#7c8794"/>`}</g>`:'';
  const veh=a.mezzo&&a.mezzo!=='no'?`<g id="vehicle${id}" class="actor">${a.mezzo==='bici'?vehicle('bici',122,G+2):vehicle(a.mezzo==='fuori'?'fuori':'auto',368,G+20)}</g>`:'';
  /* cortile */
  const tank=a.acqua==='pozzo'?`<g stroke="${INK}" stroke-width="2.5"><rect x="92" y="${G-52}" width="36" height="52" rx="7" fill="#6fa8dc"/><path d="M92 ${G-38}H128M92 ${G-20}H128"/><path d="M104 ${G-52} V${G-62} H116 V${G-52}" fill="none"/></g>`:'';
  const orto=a.orto==='1'?`<g stroke="${INK}" stroke-width="2.5"><rect x="22" y="${G-12}" width="62" height="12" fill="#6b4a2b"/>${[30,44,58,72].map(x=>`<path d="M${x} ${G-12} q-6 -14 0 -18 q6 4 0 18" fill="#5fae5a"/>`).join('')}
     <path d="M48 ${G-30} V${G-50} L64 ${G-60} L80 ${G-50} V${G-30}Z" fill="#c9a36b" transform="translate(-30 -6)"/><circle cx="40" cy="${G-34}" r="5" fill="#fff"/></g>`:'';
  const wood=a.calore==='legna'?`<g stroke="${INK}" stroke-width="2">${[0,1,2].map(r=>[0,1,2].map(c=>`<circle cx="${126+c*7}" cy="${G-5-r*8}" r="4" fill="#a8743a"/>`).join('')).join('')}</g>`:'';
  const crates=a.cibo==='14'?`<g stroke="${INK}" stroke-width="2.5"><rect x="100" y="${G-18}" width="22" height="18" fill="#c9a36b"/><rect x="104" y="${G-34}" width="18" height="16" fill="#d9b77e"/><path d="M100 ${G-9}H122"/></g>`:'';
  const gen=a.energia==='gen'?`<g stroke="${INK}" stroke-width="2.5"><rect x="410" y="${G-28}" width="40" height="28" fill="#f7d64a"/><circle cx="420" cy="${G-14}" r="5" fill="#2b2240"/><text x="428" y="${G-10}" font-family="Bangers,Impact" font-size="12" fill="${INK}" stroke="none">GEN</text></g>`:'';
  const dogH=a.cane==='1'?`<g stroke="${INK}" stroke-width="2.5"><path d="M56 ${G} V${G-22} L72 ${G-36} L88 ${G-22} V${G}Z" fill="#a8473a"/><rect x="65" y="${G-16}" width="14" height="16" fill="#2b2240"/></g>${dog(104,G+2)}`:'';
  const signs=(a.fuga==='2'||a.fuga==='1')?`<g stroke="${INK}" stroke-width="2.5">${a.fuga==='2'?`<path d="M14 ${G+40} V${G+6}" /><path d="M2 ${G+6} H34 L40 ${G+13} L34 ${G+20} H2Z" fill="#3f9b5f"/>`:''}<path d="M466 ${G+40} V${G+6}"/><path d="M478 ${G+6} H446 L440 ${G+13} L446 ${G+20} H478Z" fill="#3f9b5f"/></g>`:'';
  /* luci e allarme */
  const lights=a.luci==='sensore'?`<g class="cone"><path d="M150 206 L96 ${G+30} L206 ${G+30}Z" fill="#f7d64a" opacity=".3"/><path d="M310 206 L254 ${G+30} L364 ${G+30}Z" fill="#f7d64a" opacity=".3"/></g><rect x="144" y="198" width="12" height="9" fill="#f7d64a" stroke="${INK}" stroke-width="2.5"/><rect x="304" y="198" width="12" height="9" fill="#f7d64a" stroke="${INK}" stroke-width="2.5"/>`:'';
  const porch=a.luci==='fisse'||a.luci==='sensore'?`<circle cx="230" cy="214" r="18" fill="url(#glow${id})"/><circle cx="230" cy="214" r="4" fill="#f7d64a" stroke="${INK}" stroke-width="2"/>`:'';
  const alarm=a.allarme==='cam'||a.allarme==='allarme'?`<g stroke="${INK}" stroke-width="2.5"><rect id="siren${id}" x="294" y="160" width="18" height="14" fill="#d7263d"/>${a.allarme==='cam'?`<rect x="142" y="140" width="10" height="7" fill="#7c8794"/><path d="M152 141 l8 -3 v9 z" fill="#7c8794"/><rect x="310" y="226" width="10" height="7" fill="#7c8794"/><path d="M310 227 l-8 -3 v9 z" fill="#7c8794"/>`:''}</g>`:'';
  /* porta, retro, cantina, portico */
  const side=a.ingressi==='1'?`<g stroke="${INK}" stroke-width="2.5"><rect x="144" y="246" width="12" height="36" fill="url(#brick${id})"/></g>`:`<g stroke="${INK}" stroke-width="2.5"><rect x="144" y="246" width="12" height="36" fill="#8a5a34"/></g>`;
  const cellar=a.cantina==='int'?`<g stroke="${INK}" stroke-width="2"><rect x="270" y="${G-12}" width="40" height="10" fill="#f7d64a"/><text x="273" y="${G-4}" font-family="Bangers,Impact" font-size="9" fill="${INK}" stroke="none">RIFUGIO</text></g>`:a.cantina==='fin'?`<g stroke="${INK}" stroke-width="2"><rect x="272" y="${G-12}" width="30" height="10" fill="#bfe3f2"/></g>`:'';
  const med=a.medico==='completo'?`<g stroke="${INK}" stroke-width="2"><rect x="252" y="${G-16}" width="14" height="12" fill="#fff"/><path d="M259 ${G-14} V${G-6} M255 ${G-10} H263" stroke="#d7263d" stroke-width="2.5"/></g>`:'';
  const pack=a.zaino==='1'?`<g stroke="${INK}" stroke-width="2"><rect x="196" y="${G-18}" width="13" height="17" rx="3" fill="#d7263d"/><path d="M198 ${G-18} q4 -6 9 0" fill="none"/></g>`:'';
  /* recinzione */
  const fy=a.recinzione==='muro2'?G-4:a.recinzione==='muro1'?G+8:G+6, fh=G+32-fy;
  const seg=(x1,x2)=>{if(x2<=x1)return'';
    if(a.recinzione==='muro2'||a.recinzione==='muro1')return`<rect x="${x1}" y="${fy}" width="${x2-x1}" height="${fh}" fill="url(#brick${id})" stroke="${INK}" stroke-width="3"/>${a.recinzione==='muro1'?`<path d="M${x1} ${fy-12} H${x2}" stroke="${INK}" stroke-width="3"/>${Array.from({length:Math.floor((x2-x1)/10)},(_,i)=>`<path d="M${x1+5+i*10} ${fy} V${fy-14}" stroke="${INK}" stroke-width="2.5"/>`).join('')}`:''}`;
    if(a.recinzione==='rete'||a.recinzione==='cond')return`<rect x="${x1}" y="${fy}" width="${x2-x1}" height="${fh}" fill="url(#mesh${id})"/>${Array.from({length:Math.floor((x2-x1)/36)+1},(_,i)=>`<path d="M${x1+i*36} ${fy-4}V${G+32}" stroke="${INK}" stroke-width="3"/>`).join('')}<path d="M${x1} ${fy}H${x2}" stroke="${INK}" stroke-width="2"/>`;
    return'';};
  const hasF=a.recinzione&&a.recinzione!=='no';
  const gate=(x1,x2,gid)=>{if(!hasF||a.cancello==='no')return'';
    return a.cancello==='auto'?`<g id="${gid}${id}" class="actor" stroke="${INK}" stroke-width="3"><rect x="${x1}" y="${fy}" width="${x2-x1}" height="${fh}" fill="#7c8794"/>${Array.from({length:Math.floor((x2-x1)/10)},(_,i)=>`<path d="M${x1+6+i*10} ${fy}V${G+32}" stroke-width="2"/>`).join('')}</g>`
      :`<g id="${gid}${id}" class="actor" stroke="${INK}" stroke-width="3"><rect x="${x1}" y="${fy+4}" width="${x2-x1}" height="${fh-4}" fill="#8a5a34"/><path d="M${x1} ${fy+4} L${x2} ${G+32}"/></g>`;};
  const fence=hasF?seg(0,208)+seg(252,326)+seg(410,W)+gate(208,252,'gp')+gate(326,410,'gd'):'';
  /* attori assedio */
  let actors='';
  if(opt.siege){
    const Z=[['l',-40,334,.5],['l',-110,326,.46],['l',-180,338,.52],['l',-250,330,.44],['l',-320,336,.5],['r',520,333,.5],['r',590,327,.46],['r',660,338,.52],['r',730,330,.44],['r',800,335,.48]];
    actors+=`<g id="zg${id}">${Z.map(([side,x,y,sc],i)=>`<g class="zw" data-side="${side}" data-x="${x}" data-i="${i}">${zombie(x,y,sc,side==='r')}</g>`).join('')}</g>`;
    actors+=`<g id="help${id}" class="actor" style="opacity:0">${person(-40,336,.62,'#2f7fb8',{torch:true,coat:'#f7d64a',hood:true})}${person(-90,334,.58,'#3f9b5f',{torch:true,coat:'#f7d64a',hood:true})}${person(-140,338,.6,'#d7263d',{coat:'#f7d64a',hood:true})}</g>`;
    actors+=`<g id="fam${id}" class="actor" style="opacity:0">${person(222,G+2,.5,'#d7263d')}${person(240,G+2,.48,'#2f7fb8')}${person(256,G+2,.34,'#f7d64a')}</g>`;
    actors+=`<rect id="dawn${id}" x="0" y="0" width="${W}" height="${G}" fill="url(#dawng${id})" style="opacity:0;transition:opacity 2s"/>`;
  }
  return `<svg viewBox="0 0 ${W} 340" role="img" aria-label="La tua casa nel gioco">${defs(id)}
   <defs><linearGradient id="dawng${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f08a4b"/><stop offset="1" stop-color="#f7d64a"/></linearGradient></defs>
   <rect width="${W}" height="340" fill="url(#sky${id})"/><rect width="${W}" height="${G}" fill="url(#htl${id})"/>
   <g id="moon${id}"><circle cx="412" cy="52" r="30" fill="#f7d64a" stroke="${INK}" stroke-width="3"/><circle cx="402" cy="44" r="5" fill="#e8c23a"/></g>
   <path d="M-10 ${G-40} Q80 ${G-80} 170 ${G-50} T490 ${G-56} V${G}H-10Z" fill="#2a1f55"/>
   ${neighbors}${trees}
   <rect x="0" y="${G}" width="${W}" height="${340-G}" fill="#2a3a2a"/><rect x="0" y="${G+30}" width="${W}" height="28" fill="#3b3550"/><path d="M0 ${G+44} H${W}" stroke="#f7d64a" stroke-width="2" stroke-dasharray="14 12"/>
   <path d="M326 ${G} H410 V${G+30} H326Z" fill="#6b6478"/><path d="M208 ${G} H252 V${G+30} H208Z" fill="#8a8299"/>
   ${tank}${orto}${dogH}${crates}${gen}
   <g stroke="${INK}" stroke-width="3" stroke-linejoin="round">
     ${gar}
     <rect x="140" y="128" width="180" height="${G-128}" fill="#4b3f7a"/><rect x="140" y="128" width="180" height="${G-128}" fill="url(#ht${id})"/>
     <path d="M140 196 H320" stroke-width="2"/>
     <rect x="268" y="74" width="22" height="44" fill="#4b3f7a"/><rect x="264" y="70" width="30" height="8" fill="#2b2240"/>
     <path d="M124 134 L230 62 L336 134Z" fill="#d7263d"/>
     <path d="M146 120 L230 70 L314 120 M158 112 L230 76 L302 112" fill="none" stroke-width="1.5" opacity=".6"/>
     <path d="M120 136 H340" stroke-width="4"/>
   </g>
   ${solar}${ant}${mast}${smoke}
   <g stroke="${INK}" stroke-width="3" stroke-linejoin="round">
     ${win(160,146,false)}${win(262,146,false)}
     ${win(160,212,true)}${win(262,212,true)}
     ${side}
     <rect x="206" y="${G-6}" width="48" height="6" fill="#cfc6e6"/>
     <rect x="212" y="222" width="36" height="${G-228}" fill="${door[0]}"/>
     ${a.porta==='b4'||a.porta==='blindata'?`<path d="M216 232H244M216 248H244M216 264H244" stroke-width="2"/><circle cx="242" cy="252" r="3" fill="${INK}"/>`:`<circle cx="242" cy="252" r="2.5" fill="#f7d64a"/>`}
     ${door[1]?`<rect x="212" y="222" width="6" height="${G-228}" fill="${door[1]}"/>`:''}
     ${a.porta==='vetro'?`<rect x="220" y="230" width="20" height="22" fill="#bfe3f2" stroke-width="2"/>`:''}
   </g>
   ${cellar}${med}${pack}${wood}${porch}${lights}${alarm}${ladder}
   ${veh}
   ${hedge}${fence}${signs}
   ${actors}
  </svg>`;
}

/* ---------- mappa illustrata ---------- */
const RES_ICON={super:['🛒','#6fb59a'],farm:['✚','#3f9b5f'],osp:['H','#d7263d'],ferr:['🔧','#f7d64a'],dist:['⛽','#7c8794'],acqua:['💧','#6fa8dc'],cc:['🚓','#2f5fb8'],vvf:['🚒','#e2702d'],racc:['⛺','#c9b8ff']};
function gradeCol(i){return grade(i)[1];}
function mapScene(z,o={}){
  const L=Object.assign({poi:true,users:true,heat:true,me:true},o);
  const r=rng(z.seed||7);const W=400,H=420;
  const dense=z.type==='centro'?1:z.type==='periferia'?.62:.25;
  const roadsX=[0,128,272,W], roadsY=[0,138,284,H];
  let city='';
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){
    const x0=roadsX[i]+14,x1=roadsX[i+1]-14,y0=roadsY[j]+14,y1=roadsY[j+1]-14;
    if(z.type==='campagna'&&r()<.55){city+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${r()<.5?'#d8c27a':'#a9c98a'}" stroke="${INK}" stroke-width="2"/>${Array.from({length:6},(_,k)=>`<path d="M${x0+6} ${y0+10+k*((y1-y0-14)/6)} H${x1-6}" stroke="${INK}" stroke-width="1" opacity=".35"/>`).join('')}`;continue;}
    if(r()<.14){city+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="#a9d18e" stroke="${INK}" stroke-width="2"/>`+Array.from({length:6},()=>`<circle cx="${x0+12+r()*(x1-x0-24)}" cy="${y0+12+r()*(y1-y0-24)}" r="${6+r()*6}" fill="#4f8f5f" stroke="${INK}" stroke-width="2"/>`).join('');continue;}
    for(let yy=y0;yy<y1-20;yy+=30)for(let xx=x0;xx<x1-22;xx+=30){
      if(r()>dense)continue;
      if(z.type==='centro'&&r()<.6)city+=`<g stroke="${INK}" stroke-width="2"><rect x="${xx}" y="${yy}" width="24" height="24" fill="#fff"/><path d="M${xx+5} ${yy+6}h3M${xx+12} ${yy+6}h3M${xx+5} ${yy+13}h3M${xx+12} ${yy+13}h3M${xx+5} ${yy+20}h3" stroke-width="2.4"/></g>`;
      else city+=`<g stroke="${INK}" stroke-width="2"><rect x="${xx+2}" y="${yy+9}" width="20" height="15" fill="#fff"/><path d="M${xx} ${yy+10} L${xx+12} ${yy} L${xx+24} ${yy+10}Z" fill="#d7263d"/></g>`;
    }
  }
  const roads=roadsX.slice(1,3).map(x=>`<rect x="${x-10}" y="0" width="20" height="${H}" fill="#f3e9d2" stroke="${INK}" stroke-width="2.5"/><path d="M${x} 0V${H}" stroke="#c9bd9d" stroke-width="2" stroke-dasharray="8 8"/>`).join('')
             +roadsY.slice(1,3).map(y=>`<rect x="0" y="${y-10}" width="${W}" height="20" fill="#f3e9d2" stroke="${INK}" stroke-width="2.5"/><path d="M0 ${y}H${W}" stroke="#c9bd9d" stroke-width="2" stroke-dasharray="8 8"/>`).join('');
  const ry=60+r()*300;
  const river=`<path d="M-10 ${ry} C110 ${ry-80} 250 ${ry+90} 410 ${ry-20}" stroke="${INK}" stroke-width="26" fill="none"/><path d="M-10 ${ry} C110 ${ry-80} 250 ${ry+90} 410 ${ry-20}" stroke="#6fa8dc" stroke-width="20" fill="none"/>`;
  /* livello aggregato a esagoni (solo celle con almeno 2 utenti) */
  let heat='';
  if(L.heat){const R=46;for(let cy=R;cy<H;cy+=R*1.5)for(let cx=(Math.round(cy/(R*1.5))%2)*R*.87;cx<W+R;cx+=R*1.74){
      const us=z.users.filter(u=>Math.hypot(u.x*W-cx,u.y*H-cy)<R);if(us.length<2)continue;
      const av=us.reduce((t,u)=>t+u.idx,0)/us.length;const pts=Array.from({length:6},(_,k)=>{const an=Math.PI/3*k+Math.PI/6;return`${cx+Math.cos(an)*R*.98},${cy+Math.sin(an)*R*.98}`}).join(' ');
      heat+=`<polygon points="${pts}" fill="${gradeCol(av)}" opacity=".33" stroke="${gradeCol(av)}" stroke-width="2"/>`;}}
  const pois=L.poi?z.resources.map((p,i)=>{const[ic,c]=RES_ICON[p.kind];const x=p.x*W,y=p.y*H;
    return`<g class="pin" data-poi="${i}" style="cursor:pointer"><path d="M${x} ${y+4} l-10 -14 a13 13 0 1 1 20 0z" fill="${c}" stroke="${INK}" stroke-width="2.5"/><text x="${x}" y="${y-12}" text-anchor="middle" font-size="12" font-family="Arial" font-weight="700" fill="${INK}">${ic}</text></g>`}).join(''):'';
  const users=L.users?z.users.map((u,i)=>{const x=u.x*W,y=u.y*H,c=gradeCol(u.idx);
    return`<g class="pin" data-user="${i}" style="cursor:pointer"><g stroke="${INK}" stroke-width="2.5"><path d="M${x-9} ${y+8} V${y-2} L${x} ${y-10} L${x+9} ${y-2} V${y+8}Z" fill="${c}"/></g>
      <rect x="${x-13}" y="${y-27}" width="26" height="14" fill="#fff" stroke="${INK}" stroke-width="2"/><text x="${x}" y="${y-16}" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="${INK}">${fmtI(u.idx)}</text></g>`}).join(''):'';
  const me=L.me?`<g transform="translate(200 210)" stroke="${INK}" stroke-width="3"><circle r="26" fill="#d7263d" opacity=".25" stroke="none"/><path d="M-16 14 V-4 L0 -18 L16 -4 V14Z" fill="#d7263d"/><text y="10" text-anchor="middle" font-family="Bangers,Impact" font-size="13" fill="#fff" stroke="none">TU</text></g>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa illustrata con servizi e superstiti della zona">${defs('m')}
   <rect width="${W}" height="${H}" fill="#e8dcbf"/><rect width="${W}" height="${H}" fill="url(#htm)"/>
   ${city}${river}${roads}${heat}${pois}${users}${me}
   <g transform="translate(366 36)" stroke="${INK}" stroke-width="2"><circle r="18" fill="#fff"/><path d="M0 -13 L5 4 L0 0 L-5 4Z" fill="#d7263d"/><text y="-21" text-anchor="middle" font-family="Bangers,Impact" font-size="11" fill="${INK}" stroke="none">N</text></g>
   <g transform="translate(16 400)"><rect width="60" height="6" fill="#fff" stroke="${INK}" stroke-width="2"/><rect width="30" height="6" fill="${INK}"/><text y="-4" font-family="Arial" font-size="10" font-weight="700" fill="${INK}">~${z.type==='campagna'?'1 km':z.type==='periferia'?'400 m':'150 m'}</text></g>
  </svg>`;
}

/* ---------- sfondi illustrati ---------- */
function skyline(){
  const r=rng(42);let b='';let x=-6;while(x<410){const w=26+r()*30,h=40+r()*90;b+=`<rect x="${x}" y="${170-h}" width="${w}" height="${h}" fill="#1d1640" stroke="${INK}" stroke-width="2.5"/>`+Array.from({length:Math.floor(h/18)},(_,k)=>r()<.35?`<rect x="${x+6}" y="${170-h+8+k*18}" width="6" height="8" fill="#f7d64a"/>`:'').join('');x+=w+2;}
  return`<svg viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Città di notte con fari nel cielo">${defs('sk')}
   <rect width="400" height="190" fill="url(#skysk)"/><rect width="400" height="190" fill="url(#htlsk)"/>
   <path d="M90 170 L30 -10 L70 -10Z" fill="#f7d64a" opacity=".22"/><path d="M300 170 L340 -10 L390 -10Z" fill="#f7d64a" opacity=".18"/>
   <circle cx="320" cy="46" r="24" fill="#f7d64a" stroke="${INK}" stroke-width="3"/>
   ${b}<rect y="168" width="400" height="22" fill="${INK}"/>
   ${zombie(40,186,.38)}${zombie(360,186,.36,true)}</svg>`;
}
function postcard(place){
  const p=esc(place).slice(0,26).toUpperCase();
  return`<svg viewBox="0 0 400 170" role="img" aria-label="Cartolina da ${esc(place)}">${defs('pc')}
   <rect width="400" height="170" fill="#f7d64a"/><rect width="400" height="170" fill="url(#htpc)"/>
   <circle cx="320" cy="58" r="30" fill="#f08a4b" stroke="${INK}" stroke-width="3"/>
   <path d="M0 120 L70 50 L120 96 L170 40 L250 120Z" fill="#6b8f4e" stroke="${INK}" stroke-width="3"/><path d="M150 58 L170 40 L188 58 L176 54 L170 60 L162 54Z" fill="#fff" stroke="${INK}" stroke-width="2"/>
   <rect y="120" width="400" height="50" fill="#6fa8dc" stroke="${INK}" stroke-width="3"/><path d="M20 140 q10 -6 20 0 t20 0 M120 150 q10 -6 20 0 t20 0 M260 138 q10 -6 20 0 t20 0" stroke="#fff" stroke-width="2.5" fill="none"/>
   ${zombie(370,150,.32,true)}
   <rect x="10" y="10" width="190" height="30" fill="#fff" stroke="${INK}" stroke-width="3"/><text x="20" y="32" font-family="Bangers,Impact" font-size="20" fill="${INK}">SALUTI DA…</text>
   <text x="20" y="${p.length>16?84:92}" font-family="Bangers,Impact" font-size="${p.length>16?30:40}" fill="#fff" stroke="${INK}" stroke-width="2" textLength="${Math.min(360,p.length*20)}" lengthAdjust="spacingAndGlyphs">${p}</text></svg>`;
}

/* ---------- tavole della valutazione ---------- */
function operatore(x,y,s){return`<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
  <path d="M-34 60 Q-30 10 0 8 Q30 10 34 60Z" fill="#3f6b4f"/><path d="M-10 12 L0 30 L10 12" fill="#f7d64a"/>
  <circle cx="0" cy="-12" r="24" fill="#f2c9a0"/>
  <path d="M-27 -14 Q-26 -44 0 -44 Q26 -44 27 -14Z" fill="#3f6b4f"/><path d="M-28 -16 H28" stroke-width="4"/>
  <rect x="-20" y="-12" width="16" height="10" rx="4" fill="#9fd3e6"/><rect x="4" y="-12" width="16" height="10" rx="4" fill="#9fd3e6"/><path d="M-4 -7 H4"/>
  <path d="M-8 6 Q0 12 8 6" fill="none"/><path d="M22 -6 v14 h8" fill="none"/><circle cx="31" cy="9" r="4" fill="${INK}"/>
 </g>`;}
function stepArt(i){
  const d=defs('st'+i);
  const frame=c=>`<svg viewBox="0 0 400 150" role="img" aria-hidden="true">${d}<rect width="400" height="150" fill="${c}"/><rect width="400" height="150" fill="url(#${c==='#241a4a'?'htl':'ht'}st${i})"/>`;
  if(i===0)return frame('#241a4a')+`
   <g transform="rotate(-4 260 76)"><rect x="170" y="22" width="200" height="108" fill="#e8dcbf" stroke="${INK}" stroke-width="3"/>
   <path d="M170 88 C230 60 280 110 370 70" stroke="#6fa8dc" stroke-width="10" fill="none"/><path d="M230 22V130M300 22V130M170 52H370M170 104H370" stroke="${INK}" stroke-width="2" opacity=".5"/>
   <path d="M268 92 c-12 -16 -12 -30 0 -34 c12 4 12 18 0 34z" fill="#d7263d" stroke="${INK}" stroke-width="3"/><circle cx="268" cy="70" r="4" fill="#fff"/></g>
   ${operatore(80,86,1.05)}</svg>`;
  if(i===1)return frame('#f3e9d2')+`
   <g stroke="${INK}" stroke-width="3"><path d="M120 150 L150 96 Q160 84 176 90 L196 98" fill="#f2c9a0"/>
   <rect x="160" y="10" width="96" height="136" rx="12" fill="${INK}"/><rect x="167" y="22" width="82" height="112" fill="#9fd3c0"/>
   <path d="M178 120 V78 L208 56 L238 78 V120Z" fill="#fff"/><rect x="198" y="92" width="20" height="28" fill="#a8473a"/>
   <path d="M171 28h12M171 28v12M245 28h-12M245 28v12M171 128h12M171 128v-12M245 128h-12M245 128v-12" stroke="#d7263d" stroke-width="3"/></g>
   ${zombie(345,190,.75,true)}
   <text x="30" y="56" font-family="Bangers,Impact" font-size="34" fill="#f7d64a" stroke="${INK}" stroke-width="2" transform="rotate(-8 30 56)">CLICK!</text></svg>`;
  if(i===2)return frame('#f3e9d2')+`
   <g stroke="${INK}" stroke-width="3" transform="rotate(3 200 75)"><rect x="120" y="8" width="160" height="140" fill="#c9a36b"/><rect x="132" y="22" width="136" height="122" fill="#fff"/><rect x="176" y="2" width="48" height="16" fill="#7c8794"/>
   ${[0,1,2,3].map(k=>`<rect x="144" y="${36+k*26}" width="14" height="14" fill="#fff"/><path d="M168 ${44+k*26} H${248-k*14}" stroke-width="3"/>${k<3?`<path d="M146 ${42+k*26} l4 5 l8 -10" stroke="#3f9b5f" stroke-width="3.5" fill="none"/>`:''}`).join('')}</g>
   ${zombie(48,190,.8)}
   <path d="M300 120 L360 30 L370 36 L312 126Z" fill="#f7d64a" stroke="${INK}" stroke-width="3"/><path d="M300 120 L304 132 L312 126" fill="#f2c9a0" stroke="${INK}" stroke-width="2"/></svg>`;
  return frame('#241a4a')+`
   <path d="M200 150 L120 0 H280Z" fill="#f7d64a" opacity=".18"/>
   <g transform="translate(140 40) scale(.55)" stroke="${INK}" stroke-width="5"><rect x="0" y="80" width="220" height="110" fill="#4b3f7a"/><path d="M-20 86 L110 0 L240 86Z" fill="#d7263d"/><rect x="92" y="122" width="36" height="68" fill="#8a5a34"/></g>
   <g transform="rotate(-12 300 70)"><rect x="236" y="44" width="136" height="48" fill="none" stroke="#d7263d" stroke-width="5"/><text x="248" y="80" font-family="Bangers,Impact" font-size="32" fill="#d7263d" textLength="112" lengthAdjust="spacingAndGlyphs">VERDETTO</text></g></svg>`;
}
function chapterIcon(ch){
  const g={str:`<path d="M10 54 V28 L32 12 L54 28 V54Z" fill="#fff"/><path d="M18 54 V36 H28 V54 M36 34 H46 V44 H36Z"/>`,
   acc:`<rect x="18" y="8" width="28" height="48" fill="#8a5a34"/><rect x="34" y="28" width="10" height="12" fill="#f7d64a"/><path d="M39 34 v4"/>`,
   per:`${[10,22,34,46].map(x=>`<path d="M${x} 56 V20 l4 -8 l4 8 V56" fill="#7c8794"/>`).join('')}<path d="M6 30 H58 M6 46 H58"/>`,
   ris:`<rect x="10" y="22" width="22" height="32" rx="3" fill="#d7263d"/><path d="M10 30 H32"/><path d="M46 14 C36 30 36 40 46 44 C56 40 56 30 46 14Z" fill="#6fa8dc"/>`,
   com:`<rect x="8" y="24" width="48" height="30" rx="4" fill="#3f6b4f"/><circle cx="40" cy="39" r="8" fill="#f7d64a"/><path d="M16 24 L44 8 M14 34 h12 M14 42 h12"/>`,
   mob:`<path d="M6 46 V34 L14 32 L22 18 H44 L52 32 L58 34 V46Z" fill="#2f7fb8"/><circle cx="18" cy="48" r="7" fill="#2b2240"/><circle cx="46" cy="48" r="7" fill="#2b2240"/>`}[ch];
  return`<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true"><rect width="64" height="64" fill="#f7d64a" stroke="${INK}" stroke-width="4"/><g stroke="${INK}" stroke-width="3" stroke-linejoin="round">${g}</g></svg>`;
}

