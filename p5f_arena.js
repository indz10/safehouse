<script>
/* =========================================================
   ARENA: case personalizzabili, sfida 1 contro 1 giocabile,
   Coppa del Quartiere settimanale (gironi + fase finale)
   ========================================================= */
const CUST={
 muri:{n:'Muri',o:[['intonaco','Intonaco',{},0],['mattoni','Mattoni a vista',{hp:20},160],['pietra','Pietra',{hp:35},300],['legno','Legno',{},90]]},
 porta:{n:'Porta',o:[['legno','Legno',{},0],['blindata','Blindata',{hp:40},200],['acciaio','Acciaio rinforzato',{hp:70,arm:.05},450]]},
 finestre:{n:'Finestre',o:[['vetro','Vetro con tende',{},0],['grate','Grate',{arm:.08},180],['scuri','Scuri d’acciaio',{arm:.12,bar:20},380]]},
 tetto:{n:'Tetto',o:[['tegole','Tegole',{},0],['torretta','Torretta di guardia',{dps:.7},300],['solare','Pannelli solari',{regen:1.2},320],['sirena','Sirena',{slow:.12},260]]},
 luci:{n:'Luci',o:[['nessuna','Nessuna',{},0],['lanterna','Lanterna sul portico',{slow:.04},80],['fari','Fari a sensore',{slow:.1,dps:.2},240],['festoni','Festoni di lucine',{regen:.3},120]]},
 giardino:{n:'Giardino',o:[['prato','Prato fiorito',{},0],['siepe','Siepe spinosa',{slow:.1},150],['trappole','Trappole',{dps:.35,slow:.05},280],['cane','Cane da guardia',{dps:.45},240]]},
 recinzione:{n:'Recinzione',o:[['rete','Rete',{},0],['palizzata','Palizzata',{bar:40,slow:.04},180],['filo','Filo spinato',{bar:30,slow:.08},220],['muro','Muro',{bar:60},260]]},
 extra:{n:'Extra',o:[['nessuno','Nessuno',{},0],['bandiera','Bandiera',{},40],['antenna','Antenna radio',{dps:.2},150],['cisterna','Cisterna d’acqua',{regen:.8},220],['scorte','Cassa di scorte',{hp:25},130]]}
};
const CUST_COL=['#4b3f7a','#3f6b8f','#7a3f3f','#3f7a55','#8a6a3a','#5a5a66','#c9a36b','#e8dcbf'];
const CUST_DEF={muri:'intonaco',porta:'legno',finestre:'vetro',tetto:'tegole',luci:'nessuna',giardino:'prato',recinzione:'rete',extra:'nessuno'};
function custOf(id){G.cust=G.cust||{};G.own=G.own||{};
  if(!G.cust[id]){G.cust[id]={...CUST_DEF,colore:CUST_COL[(id.length*7)%6]};
    if(id==='home'){const h=G.h||{};if(h.porta>=1)G.cust[id].porta=h.porta>=2?'acciaio':'blindata';if(h.grate>=1)G.cust[id].finestre=h.grate>=2?'scuri':'grate';if(h.muro>=2)G.cust[id].recinzione='muro';if(h.vedetta>=1)G.cust[id].tetto='torretta';if(h.luci>=1)G.cust[id].luci=h.luci>=2?'fari':'lanterna';}}
  const c=G.cust[id];Object.keys(CUST_DEF).forEach(k=>{if(!c[k])c[k]=CUST_DEF[k];});
  G.own[id]=G.own[id]||{};Object.keys(CUST).forEach(k=>{G.own[id][k+':'+CUST[k].o[0][0]]=1;G.own[id][k+':'+c[k]]=1;});return c;}
function custDelta(id,c0){const c=c0||custOf(id),d={hp:0,bar:0,arm:0,dps:0,regen:0,slow:0};Object.keys(CUST).forEach(k=>{const o=CUST[k].o.find(x=>x[0]===c[k]);if(o)Object.entries(o[2]).forEach(([s,v])=>d[s]+=v);});return d;}
function custPower(id,c0){const d=custDelta(id,c0);return Math.round(d.hp*.6+d.bar*.5+d.arm*400+d.dps*60+d.regen*40+d.slow*300);}
function propKind(id){if(id==='home')return G.type;const l=LOTS.find(x=>x.id===id);const b=G.lots[id];if(b&&b.kind==='bld')return'bld';return l?l.kind:'villetta';}
function propName(id){if(id==='home')return'Casa tua';const p=myProps().find(x=>x.id===id);return p?p.name:'Proprietà';}
let CUSTN=0;
function custHouseSVG(kind,c0,w=160,h=180){
  const c={...CUST_DEF,...c0};const I='#140f1f',u='h'+(CUSTN++);const body=c.colore||'#4b3f7a';
  const K=kind==='villetta'?'villa':kind==='palazzo'||kind==='bld'?'apt':kind==='campo'?'casale':kind;
  const sw=`stroke="${I}" stroke-width="2.6" stroke-linejoin="round"`;
  const wallFill={intonaco:body,mattoni:`url(#br${u})`,pietra:`url(#st${u})`,legno:`url(#pl${u})`}[K==='rifugio'?'legno':c.muri]||body;
  const defs=`<defs>
   <pattern id="br${u}" width="16" height="10" patternUnits="userSpaceOnUse"><rect width="16" height="10" fill="#a8473a"/><path d="M0 0H16M0 5H16M4 0V5M12 5V10" stroke="#6b2b23" stroke-width="1.2"/></pattern>
   <pattern id="st${u}" width="22" height="16" patternUnits="userSpaceOnUse"><rect width="22" height="16" fill="#9a958c"/><path d="M1 1h9v6h-9zM12 1h9v6h-9zM5 9h10v6h-10zM-5 9h8v6h-8zM17 9h8v6h-8z" fill="#b5b0a6" stroke="#5a564f" stroke-width="1"/></pattern>
   <pattern id="pl${u}" width="40" height="8" patternUnits="userSpaceOnUse"><rect width="40" height="8" fill="${c.muri==='legno'||K==='rifugio'?'#8a5a34':body}"/><path d="M0 7.5H40M18 0V8" stroke="#5a3b24" stroke-width="1.2"/></pattern>
   <pattern id="tl${u}" width="10" height="7" patternUnits="userSpaceOnUse"><rect width="10" height="7" fill="${K==='rifugio'?'#5a3b24':'#c0392b'}"/><path d="M0 6.5H10M5 0V3.5" stroke="#7a1f16" stroke-width="1.1"/></pattern>
   <radialGradient id="gl${u}"><stop offset="0" stop-color="#f7d64a" stop-opacity=".75"/><stop offset="1" stop-color="#f7d64a" stop-opacity="0"/></radialGradient>
  </defs>`;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" width="${w}" height="${h}">${defs}`;
  /* terreno */
  if(K==='barca')s+=`<rect x="0" y="150" width="160" height="30" fill="#2f7fb8"/>${[0,1,2].map(i=>`<path d="M${-10+i*7} ${158+i*8} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#9fd3e6" stroke-width="2" fill="none"/>`).join('')}`;
  else s+=`<rect x="0" y="150" width="160" height="30" fill="${K==='rifugio'?'#eef3f6':'#3f7a4a'}"/><path d="M0 150H160" stroke="${I}" stroke-width="2.5"/>`+(K==='rifugio'?'':Array.from({length:14},(_,i)=>`<path d="M${6+i*11} 168 l2 -6 l2 6" stroke="#2f5f3a" stroke-width="1.5" fill="none"/>`).join(''));
  /* luci: alone dietro */
  if(c.luci==='fari')s+=`<path d="M40 96 L-10 170 L60 170Z" fill="#f7d64a" opacity=".22"/><path d="M120 96 L170 170 L100 170Z" fill="#f7d64a" opacity=".22"/>`;
  /* corpo per tipo */
  const win=(x,y,ww=16,hh=18)=>{let o=`<rect x="${x-2}" y="${y-2}" width="${ww+4}" height="${hh+4}" fill="#f3e9d2" ${sw}/><rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#f7d64a"/>`;
    if(c.finestre==='vetro')o+=`<path d="M${x} ${y} q${ww/4} ${hh*.6} 0 ${hh}M${x+ww} ${y} q-${ww/4} ${hh*.6} 0 ${hh}" fill="#d7263d" opacity=".75"/><path d="M${x+ww/2} ${y}V${y+hh}M${x} ${y+hh/2}H${x+ww}" stroke="${I}" stroke-width="1.5"/>`;
    if(c.finestre==='grate')o+=[1,2,3].map(i=>`<path d="M${x+i*ww/4} ${y-1}V${y+hh+1}" stroke="#2b2240" stroke-width="2.2"/>`).join('')+`<path d="M${x} ${y+hh/2}H${x+ww}" stroke="#2b2240" stroke-width="2"/>`;
    if(c.finestre==='scuri')o+=`<rect x="${x-9}" y="${y-2}" width="8" height="${hh+4}" fill="#7c8794" ${sw}/><rect x="${x+ww+1}" y="${y-2}" width="8" height="${hh+4}" fill="#7c8794" ${sw}/>${[3,7,11,15].map(t=>`<path d="M${x-8} ${y+t}h6M${x+ww+2} ${y+t}h6" stroke="${I}" stroke-width="1"/>`).join('')}<path d="M${x+ww/2} ${y}V${y+hh}" stroke="${I}" stroke-width="1.5"/>`;
    return o+`<rect x="${x-4}" y="${y+hh+1}" width="${ww+8}" height="4" fill="#cfc6e6" ${sw}/>`;};
  const door=(x,y,ww=18,hh=30)=>{const dc=c.porta==='legno'?'#8a5a34':c.porta==='blindata'?'#3e3e4a':'#9aa4b0';let o=`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${dc}" ${sw}/>`;
    if(c.porta==='legno')o+=`<rect x="${x+3}" y="${y+4}" width="${ww-6}" height="9" fill="none" stroke="#5a3b24" stroke-width="1.5"/><rect x="${x+3}" y="${y+16}" width="${ww-6}" height="10" fill="none" stroke="#5a3b24" stroke-width="1.5"/>`;
    if(c.porta==='blindata')o+=[0,1,2].map(i=>`<circle cx="${x+4}" cy="${y+6+i*9}" r="1.3" fill="#9aa4b0"/><circle cx="${x+ww-4}" cy="${y+6+i*9}" r="1.3" fill="#9aa4b0"/>`).join('')+`<circle cx="${x+ww/2}" cy="${y+8}" r="2" fill="#f7d64a" stroke="${I}" stroke-width="1"/>`;
    if(c.porta==='acciaio')o+=`<path d="M${x} ${y+9}H${x+ww}M${x} ${y+20}H${x+ww}" stroke="${I}" stroke-width="2.5"/>`+[0,1,2,3].map(i=>`<circle cx="${x+3+i*4}" cy="${y+5}" r="1" fill="${I}"/>`).join('');
    return o+`<circle cx="${x+ww-5}" cy="${y+hh/2+2}" r="1.8" fill="#f7d64a" stroke="${I}" stroke-width="1"/><rect x="${x-4}" y="${y+hh}" width="${ww+8}" height="4" fill="#9aa4b0" ${sw}/>`;};
  let roofTop=0,roofCx=80,chim=true;
  if(K==='apt'){roofTop=22;s+=`<rect x="34" y="28" width="92" height="122" fill="${wallFill}" ${sw}/>`+[0,1,2,3].map(f=>{const y=36+f*27;return win(44,y)+win(100,y)+(f<3?`<rect x="70" y="${y+14}" width="22" height="3" fill="#7c8794" ${sw}/><path d="M71 ${y+8}V${y+14}M76 ${y+8}V${y+14}M81 ${y+8}V${y+14}M86 ${y+8}V${y+14}M91 ${y+8}V${y+14}M70 ${y+8}H92" stroke="${I}" stroke-width="1.4"/>`:'');}).join('')
     +`<rect x="30" y="20" width="100" height="10" fill="#2b2240" ${sw}/><rect x="96" y="6" width="18" height="14" rx="3" fill="#cfc6e6" ${sw}/><path d="M64 118h32l-4 -6h-24z" fill="#d7263d" ${sw}/>`+door(71,120);chim=false;roofCx=60;}
  else if(K==='barca'){s+=`<path d="M10 128 H150 L136 156 H24Z" fill="#d7263d" ${sw}/><path d="M16 138H144" stroke="#fff" stroke-width="3"/><rect x="40" y="86" width="80" height="42" fill="${wallFill}" ${sw}/>`+[56,76,96].map(x=>`<circle cx="${x}" cy="100" r="6" fill="#f7d64a" ${sw}/>`).join('')+`<path d="M34 88 L80 66 L126 88Z" fill="url(#tl${u})" ${sw}/>`+door(106,98,12,30);roofTop=66;chim=false;}
  else if(K==='camper'){s+=`<rect x="14" y="88" width="132" height="54" rx="12" fill="${wallFill}" ${sw}/><path d="M118 92 h20 q8 0 8 12 v14 h-28z" fill="#9fd3e6" ${sw}/><circle cx="42" cy="146" r="11" fill="#2b2240" ${sw}/><circle cx="42" cy="146" r="4" fill="#9aa4b0"/><circle cx="116" cy="146" r="11" fill="#2b2240" ${sw}/><circle cx="116" cy="146" r="4" fill="#9aa4b0"/>
     <path d="M14 86 L4 104 H62 L70 86Z" fill="#f08a4b" ${sw}/>${[14,26,38,50].map(x=>`<path d="M${x} 104 l4 -18" stroke="${I}" stroke-width="1"/>`).join('')}`+win(28,106,16,14)+win(84,98,18,14)+door(62,106,16,30);roofTop=86;chim=false;}
  else if(K==='rifugio'){s+=`<rect x="30" y="122" width="100" height="28" fill="url(#st${u})" ${sw}/><rect x="30" y="80" width="100" height="44" fill="url(#pl${u})" ${sw}/><path d="M18 84 L80 34 L142 84Z" fill="url(#tl${u})" ${sw}/><path d="M26 78 L80 36 L134 78 L124 74 L80 44 L36 74Z" fill="#fff" stroke="${I}" stroke-width="1.6"/>`+win(42,92)+win(102,92)+door(70,118,20,32)+`<g ${sw}>${[0,1,2].map(i=>`<circle cx="${140+((i%2)*6)}" cy="${140-i*7}" r="4" fill="#8a5a34"/>`).join('')}</g>`;roofTop=34;}
  else if(K==='casale'){s+=`<rect x="18" y="86" width="124" height="64" fill="${wallFill}" ${sw}/>${[18,60,100,142].map(x=>`<path d="M${x} 86V150" stroke="#5a3b24" stroke-width="4"/>`).join('')}<path d="M18 104H142" stroke="#5a3b24" stroke-width="4"/><path d="M8 90 L80 46 L152 90Z" fill="url(#tl${u})" ${sw}/>
     <path d="M96 150 v-26 a14 14 0 0 1 28 0 v26z" fill="#a8473a" ${sw}/><path d="M96 124 L124 150 M124 124 L96 150" stroke="${I}" stroke-width="2"/>`+win(30,110)+door(66,118,18,32)+`<rect x="128" y="138" width="20" height="12" rx="3" fill="#e0c060" ${sw}/>`;roofTop=46;}
  else if(K==='residence'){s+=`<rect x="8" y="60" width="64" height="90" fill="${wallFill}" ${sw}/><rect x="88" y="44" width="64" height="106" fill="${wallFill}" ${sw}/><rect x="4" y="54" width="72" height="8" fill="#2b2240" ${sw}/><rect x="84" y="38" width="72" height="8" fill="#2b2240" ${sw}/>`+[0,1,2].map(f=>win(16,68+f*26,14,14)+win(48,68+f*26,14,14)).join('')+[0,1,2,3].map(f=>win(96,52+f*24,14,13)+win(128,52+f*24,14,13)).join('')
     +`<rect x="62" y="132" width="36" height="18" fill="#cfc6e6" ${sw}/><rect x="66" y="126" width="28" height="7" fill="#d7263d" ${sw}/><text x="80" y="131.5" text-anchor="middle" font-family="Arial" font-weight="700" font-size="5" fill="#fff">PORTINERIA</text><rect x="74" y="136" width="12" height="14" fill="#9fd3e6" ${sw}/>
     <ellipse cx="80" cy="166" rx="26" ry="7" fill="#9fd3e6" ${sw}/><path d="M60 166 q10 -3 20 0 t20 0" stroke="#fff" stroke-width="1.5" fill="none"/>`;roofTop=38;roofCx=120;chim=false;}
  else if(K==='attico'){s+=`<rect x="30" y="60" width="100" height="90" fill="#8f86b8" ${sw}/>`+[0,1,2].map(f=>[40,64,88,112].map(x=>`<rect x="${x}" y="${70+f*26}" width="12" height="14" fill="#1d1640" stroke="${I}" stroke-width="1.5"/>`).join('')).join('')
     +`<rect x="24" y="54" width="112" height="8" fill="#2b2240" ${sw}/><rect x="46" y="22" width="68" height="32" fill="${wallFill}" ${sw}/><rect x="52" y="28" width="40" height="22" fill="#9fd3e6" ${sw}/><path d="M72 28V50M52 39H92" stroke="${I}" stroke-width="1.5"/><rect x="42" y="16" width="76" height="7" fill="#2b2240" ${sw}/>
     <path d="M24 54V46H46M114 46H136V54" stroke="${I}" stroke-width="2"/>${[28,32,36,40,120,124,128,132].map(x=>`<path d="M${x} 46V54" stroke="${I}" stroke-width="1.2"/>`).join('')}<circle cx="128" cy="40" r="7" fill="#3f7a4a" ${sw}/><rect x="125" y="44" width="6" height="8" fill="#8a5a34" ${sw}/>`+door(96,30,12,22)+`<rect x="68" y="124" width="24" height="26" fill="#7c8794" ${sw}/>`;roofTop=16;roofCx=80;chim=false;}
  else if(K==='loft'){s+=`<rect x="14" y="70" width="132" height="80" fill="url(#br${u})" ${sw}/><path d="M14 72 L36 50 V72 L58 50 V72 L80 50 V72 L102 50 V72 L124 50 V72 L146 50 V72Z" fill="#7c8794" ${sw}/>${[36,58,80,102,124].map(x=>`<path d="M${x} 50 V72" stroke="#9fd3e6" stroke-width="3"/>`).join('')}
     ${[22,82].map(x=>`<rect x="${x}" y="84" width="52" height="34" fill="#f7d64a" ${sw}/>${[1,2,3].map(i=>`<path d="M${x+i*13} 84V118" stroke="${I}" stroke-width="1.5"/>`).join('')}<path d="M${x} 101H${x+52}" stroke="${I}" stroke-width="1.5"/>`).join('')}<rect x="122" y="30" width="12" height="42" fill="url(#br${u})" ${sw}/><rect x="120" y="26" width="16" height="6" fill="#2b2240" ${sw}/>`+door(70,120,20,30);roofTop=50;roofCx=100;chim=false;
     if(c.finestre==='grate')s+=[22,82].map(x=>[0,1,2,3,4,5,6,7].map(i=>`<path d="M${x+3+i*6.5} 84V118" stroke="#2b2240" stroke-width="2"/>`).join('')).join('');}
  else if(K==='bifamiliare'){s+=`<rect x="14" y="80" width="132" height="70" fill="${wallFill}" ${sw}/><path d="M80 80V150" stroke="${I}" stroke-width="3"/><rect x="80" y="80" width="66" height="70" fill="#000" opacity=".08"/><path d="M4 84 L80 36 L156 84Z" fill="url(#tl${u})" ${sw}/><path d="M80 36V84" stroke="${I}" stroke-width="2"/>`+win(26,94)+win(114,94)+door(48,120)+door(94,120)+`<rect x="40" y="58" width="0" height="0"/>`;roofTop=36;roofCx=56;}
  else if(K==='ringhiera'){s+=`<rect x="20" y="36" width="120" height="114" fill="${wallFill}" ${sw}/><path d="M14 40 L80 12 L146 40Z" fill="url(#tl${u})" ${sw}/>`+[0,1,2].map(f=>{const y=44+f*34;return[0,1,2].map(i=>door(30+i*38,y,14,22)+win(48+i*38,y+3,10,10)).join('')+`<rect x="16" y="${y+24}" width="128" height="4" fill="#7c8794" ${sw}/><path d="M16 ${y+14}H144" stroke="${I}" stroke-width="1.6"/>${Array.from({length:17},(_,i)=>`<path d="M${18+i*7.6} ${y+14}V${y+24}" stroke="${I}" stroke-width="1"/>`).join('')}`;}).join('')+`<rect x="68" y="130" width="24" height="20" fill="#2b2240" ${sw}/>`;roofTop=12;roofCx=60;}
  else if(K==='faro'){s+=`<rect x="0" y="150" width="160" height="30" fill="#2f7fb8"/><path d="M30 150 h100 l-10 -14 h-80z" fill="url(#st${u})" ${sw}/><path d="M58 136 L64 40 H96 L102 136Z" fill="#fff" ${sw}/>${[60,84,108].map(y=>`<path d="M${58+ (136-y)/16} ${y} L${102-(136-y)/16} ${y} L${102-(136-y+12)/16} ${y-12} L${58+(136-y+12)/16} ${y-12}Z" fill="#d7263d"/>`).join('')}
     <rect x="60" y="30" width="40" height="10" fill="#2b2240" ${sw}/><rect x="66" y="14" width="28" height="16" fill="#f7d64a" ${sw}/><path d="M62 14 L80 0 L98 14Z" fill="#d7263d" ${sw}/><path d="M66 22 L-10 6 V40Z M94 22 L170 6 V40Z" fill="#f7d64a" opacity=".22"/>`+door(72,112,16,24);roofTop=0;roofCx=80;chim=false;}
  else if(K==='trullo'){s+=`<rect x="14" y="96" width="132" height="54" fill="#f3efe4" ${sw}/>${[40,80,120].map((x,i)=>`<path d="M${x-26} 98 Q${x} ${i===1?20:40} ${x+26} 98Z" fill="url(#st${u})" ${sw}/><path d="M${x} ${i===1?34:52} v-10" stroke="${I}" stroke-width="2"/><circle cx="${x}" cy="${i===1?20:38}" r="4" fill="#fff" ${sw}/>`).join('')}
     <path d="M70 72 a10 10 0 0 1 20 0z" fill="#fff" stroke="${I}" stroke-width="1.4"/><text x="80" y="70" text-anchor="middle" font-size="7" fill="${I}">☼</text>`+win(26,110,14,14)+win(118,110,14,14)+`<path d="M70 150 v-22 a10 10 0 0 1 20 0 v22z" fill="${c.porta==='legno'?'#3f6b8f':c.porta==='blindata'?'#3e3e4a':'#9aa4b0'}" ${sw}/>`;roofTop=20;roofCx=80;chim=false;}
  else if(K==='albero'){s+=`<path d="M70 150 Q74 110 66 84 H94 Q86 110 90 150Z" fill="#8a5a34" ${sw}/><path d="M66 150 q-10 2 -16 0 M94 150 q10 2 16 0" stroke="${I}" stroke-width="2.5" fill="none"/>
     <ellipse cx="80" cy="34" rx="70" ry="30" fill="#3f7a4a" ${sw}/><ellipse cx="40" cy="44" rx="30" ry="18" fill="#4f8f5f" ${sw}/><ellipse cx="120" cy="44" rx="30" ry="18" fill="#4f8f5f" ${sw}/>
     <rect x="40" y="64" width="80" height="8" fill="#5a3b24" ${sw}/><rect x="48" y="40" width="64" height="26" fill="${c.muri==='intonaco'?`url(#pl${u})`:wallFill}" ${sw}/><path d="M42 42 L80 22 L118 42Z" fill="url(#tl${u})" ${sw}/>`+win(56,46,12,12)+door(88,44,12,22)
     +`<path d="M100 72 V146 M112 72 V146" stroke="#c9a36b" stroke-width="2"/>${[82,94,106,118,130,142].map(y=>`<path d="M100 ${y}H112" stroke="#c9a36b" stroke-width="2"/>`).join('')}`;roofTop=22;roofCx=80;chim=false;}
  else{const sch=K==='schiera';
    if(sch)s+=`<rect x="0" y="80" width="30" height="70" fill="#8f86b8" opacity=".75" ${sw}/><rect x="130" y="80" width="30" height="70" fill="#8f86b8" opacity=".75" ${sw}/><path d="M-6 84 L22 58 H30 V84Z M166 84 L138 58 H130 V84Z" fill="#a85a50" opacity=".8" ${sw}/>`;
    s+=`<rect x="30" y="80" width="${sch?100:76}" height="70" fill="${wallFill}" ${sw}/>`;
    if(!sch)s+=`<rect x="106" y="104" width="40" height="46" fill="${wallFill}" ${sw}/><path d="M102 106 L126 92 L150 106Z" fill="url(#tl${u})" ${sw}/><rect x="112" y="118" width="28" height="32" fill="#cfc6e6" ${sw}/>${[124,130,136,142].map(y=>`<path d="M112 ${y}H140" stroke="${I}" stroke-width="1.2"/>`).join('')}`;
    s+=`<path d="M${sch?22:20} 84 L${sch?80:68} 40 L${sch?138:116} 84Z" fill="url(#tl${u})" ${sw}/>`+win(40,94)+(sch?win(104,94):'')+door(sch?72:74,120)+`<rect x="${sch?56:58}" y="58" width="${sch?48:22}" height="0" fill="none"/>`;
    roofTop=40;roofCx=sch?80:68;if(!sch)s+=win(84,94,0,0).slice(0,0);}
  if(chim)s+=`<rect x="${roofCx+20}" y="${roofTop+6}" width="10" height="18" fill="${c.muri==='mattoni'?`url(#br${u})`:'#7a3f3f'}" ${sw}/><circle cx="${roofCx+27}" cy="${roofTop}" r="4" fill="#cfc6e6" opacity=".7"/><circle cx="${roofCx+32}" cy="${roofTop-7}" r="5.5" fill="#cfc6e6" opacity=".5"/>`;
  /* tetto: accessori */
  if(c.tetto==='torretta')s+=`<g ${sw}><rect x="${roofCx-34}" y="${roofTop-16}" width="16" height="24" fill="#8a5a34"/><rect x="${roofCx-38}" y="${roofTop-22}" width="24" height="8" fill="#c9a36b"/><path d="M${roofCx-40} ${roofTop-22} L${roofCx-26} ${roofTop-34} L${roofCx-12} ${roofTop-22}Z" fill="#d7263d"/><rect x="${roofCx-31}" y="${roofTop-12}" width="10" height="7" fill="#f7d64a"/></g><path d="M${roofCx-26} ${roofTop-34}V${roofTop-46}" stroke="${I}" stroke-width="2"/><path d="M${roofCx-26} ${roofTop-46}h12l-3 4 3 4h-12" fill="#f7d64a" stroke="${I}" stroke-width="1.5"/>`;
  if(c.tetto==='solare')s+=`<g transform="translate(${roofCx-10} ${roofTop+10}) rotate(-34)"><rect width="30" height="16" fill="#2f5fb8" ${sw}/><path d="M10 0V16M20 0V16M0 8H30" stroke="#9fd3e6" stroke-width="1.2"/></g>`;
  if(c.tetto==='sirena')s+=`<rect x="${roofCx-6}" y="${roofTop-8}" width="12" height="7" fill="#7c8794" ${sw}/><path d="M${roofCx-7} ${roofTop-8} a7 7 0 0 1 14 0z" fill="#d7263d" ${sw}/><path d="M${roofCx-14} ${roofTop-16} q-5 5 0 10 M${roofCx+14} ${roofTop-16} q5 5 0 10 M${roofCx-19} ${roofTop-20} q-8 9 0 18 M${roofCx+19} ${roofTop-20} q8 9 0 18" stroke="#d7263d" stroke-width="2" fill="none"/>`;
  /* extra */
  if(c.extra==='bandiera')s+=`<path d="M${K==='apt'?40:30} ${K==='apt'?20:80}V${K==='apt'?-4:52}" stroke="${I}" stroke-width="2"/><path d="M${K==='apt'?40:30} ${K==='apt'?-4:52}h18l-4 5 4 5h-18z" fill="#3f9b5f" stroke="${I}" stroke-width="1.5"/>`;
  if(c.extra==='antenna')s+=`<path d="M${roofCx+4} ${roofTop+2}V${roofTop-26}M${roofCx-4} ${roofTop-18}H${roofCx+12}M${roofCx-1} ${roofTop-24}H${roofCx+9}" stroke="${I}" stroke-width="2"/><circle cx="${roofCx+4}" cy="${roofTop-28}" r="2.5" fill="#d7263d"/>`;
  if(c.extra==='cisterna')s+=`<g ${sw}><rect x="6" y="112" width="20" height="30" rx="5" fill="#2f7fb8"/><path d="M6 122H26M6 132H26" stroke="#9fd3e6" stroke-width="1.5"/><path d="M10 142v8M22 142v8"/></g>`;
  if(c.extra==='scorte')s+=`<g ${sw}><rect x="4" y="132" width="24" height="18" fill="#c9a36b"/><path d="M4 132L28 150M28 132L4 150" stroke="#5a3b24" stroke-width="1.5"/></g>`;
  /* luci */
  if(c.luci==='lanterna')s+=`<circle cx="${K==='apt'?66:K==='camper'?58:68}" cy="112" r="18" fill="url(#gl${u})"/><rect x="${K==='apt'?63:K==='camper'?55:65}" y="108" width="6" height="8" fill="#f7d64a" ${sw}/>`;
  if(c.luci==='fari')s+=`<rect x="36" y="${K==='apt'?28:84}" width="9" height="6" fill="#cfc6e6" ${sw}/><rect x="${K==='apt'?116:112}" y="${K==='apt'?28:84}" width="9" height="6" fill="#cfc6e6" ${sw}/>`;
  if(c.luci==='festoni')s+=`<path d="M24 ${roofTop+46} q28 12 56 0 t56 0" stroke="${I}" stroke-width="1.2" fill="none"/>${Array.from({length:9},(_,i)=>`<circle cx="${30+i*13}" cy="${roofTop+48+Math.sin(i)*3}" r="2.6" fill="${['#f7d64a','#d7263d','#3f9b5f','#2f7fb8'][i%4]}" stroke="${I}" stroke-width=".8"/>`).join('')}`;
  /* giardino (davanti) */
  if(K!=='barca'){
    if(c.giardino==='prato')s+=[16,44,118,146].map((x,i)=>`<path d="M${x} 160 v-6" stroke="#2f5f3a" stroke-width="1.5"/><circle cx="${x}" cy="152" r="3" fill="${['#f7d64a','#d7263d','#fff','#c9b8ff'][i]}" stroke="${I}" stroke-width="1"/>`).join('');
    if(c.giardino==='siepe')s+=[0,1,2,3,4,5,6,7].map(i=>`<circle cx="${8+i*20}" cy="160" r="10" fill="#2f6b45" stroke="${I}" stroke-width="2"/><path d="M${4+i*20} 156l-3 -2M${12+i*20} 155l3 -3" stroke="${I}" stroke-width="1.2"/>`).join('');
    if(c.giardino==='trappole')s+=[18,52,108,140].map(x=>`<path d="M${x-8} 166 l4 -8 l4 8 l4 -8 l4 8z" fill="#9aa4b0" stroke="${I}" stroke-width="1.4"/>`).join('')+`<g ${sw}><ellipse cx="80" cy="170" rx="10" ry="4" fill="#7c8794"/><path d="M72 168 l3 -5 l3 5 l3 -5 l3 5 l3 -5" stroke="${I}" fill="none" stroke-width="1.4"/></g>`;
    if(c.giardino==='cane')s+=`<g ${sw}><rect x="130" y="138" width="24" height="16" fill="#a8473a"/><path d="M127 140 L142 128 L157 140Z" fill="#5a3b24"/><rect x="138" y="144" width="8" height="10" fill="${I}"/></g><g transform="translate(112 162) scale(.6)">${dog(0,0)}</g>`;}
  /* recinzione (in primo piano) */
  const gap=[[0,54],[106,160]];
  if(K!=='barca'&&K!=='camper'){
    if(c.recinzione==='rete')gap.forEach(([a,b])=>{s+=`<path d="M${a} 156H${b}M${a} 168H${b}" stroke="#9aa4b0" stroke-width="1.5"/>`;for(let x=a+2;x<=b;x+=12)s+=`<path d="M${x} 150V176" stroke="#7c8794" stroke-width="2.5"/>`;for(let x=a;x<b;x+=6)s+=`<path d="M${x} 156l6 12M${x+6} 156l-6 12" stroke="#9aa4b0" stroke-width=".8"/>`;});
    if(c.recinzione==='palizzata')gap.forEach(([a,b])=>{for(let x=a+1;x<b;x+=8)s+=`<path d="M${x} 176V154l3.5 -5l3.5 5V176z" fill="#c9a36b" stroke="${I}" stroke-width="1.6"/>`;s+=`<path d="M${a} 162H${b}" stroke="#8a5a34" stroke-width="3"/>`;});
    if(c.recinzione==='filo')gap.forEach(([a,b])=>{for(let x=a+2;x<=b;x+=14)s+=`<path d="M${x} 150V176" stroke="#5a3b24" stroke-width="3"/>`;[156,164,172].forEach(y=>{s+=`<path d="M${a} ${y}H${b}" stroke="#7c8794" stroke-width="1.4"/>`;for(let x=a+4;x<b;x+=8)s+=`<path d="M${x-2} ${y-2}l4 4M${x+2} ${y-2}l-4 4" stroke="${I}" stroke-width="1"/>`;});});
    if(c.recinzione==='muro')gap.forEach(([a,b])=>{s+=`<rect x="${a}" y="152" width="${b-a}" height="24" fill="url(#br${u})" ${sw}/><rect x="${a-2}" y="148" width="${b-a+4}" height="6" fill="#cfc6e6" ${sw}/>`;});}
  return s+'</svg>';
}
const custImg=(id,w,h)=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(custHouseSVG(propKind(id),custOf(id),w,h))}`;
function propStats(id){const pow=propPower(id),d=custDelta(id);
  let srv={dps:0,regen:0};if(id!=='home'){const b=G.lots[id];if(b&&b.kind==='bld'){if(['caserma','vvf'].includes(b.b))srv.dps=.8;if(['farmacia','ospedale'].includes(b.b))srv.regen=1.2;}}
  return{hp:Math.round(90+pow*.32+d.hp),bar:Math.round(40+pow*.12+d.bar),arm:Math.min(.5,.02+d.arm),dps:.45+pow/700+d.dps+srv.dps,regen:d.regen+srv.regen,slow:Math.min(.4,d.slow),tap:1+Math.floor(pow/450)};}

/* ---------- officina (personalizzazione) ---------- */
const WS={};
function workshop(id,back){
  const c=custOf(id),own=G.own[id];const tr=WS[id];const prev=tr?{...c,[tr.k]:tr.o}:c;
  const statLine=st=>Object.entries(st).map(([k,v])=>({hp:`+${v} casa`,bar:`+${v} barricata`,arm:`−${Math.round(v*100)}% danni`,dps:`+${v} difesa`,regen:`+${v} cura/s`,slow:`−${Math.round(v*100)}% orda`}[k])).join(' · ')||'base';
  const tOpt=tr?CUST[tr.k].o.find(x=>x[0]===tr.o):null;const miss=tOpt?Math.max(0,tOpt[3]-G.coins):0;
  const powNow=propPower0(id)+custPower(id,prev);
  openSheet(`🛠️ Officina · ${esc(propName(id))}`,`
    <div class="ws-prev"><img alt="Anteprima della casa" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(custHouseSVG(propKind(id),prev,200,225))}">
      <div><b class="disp" style="font-size:34px">${powNow}</b><small>potenza</small><div class="wsbal">🪙 ${G.coins}</div><div class="muted" style="font-size:12px;margin-top:6px">Tocca un’opzione per vederla sulla casa. Quelle con il prezzo si comprano una volta e restano tue.</div></div></div>
    ${tr?`<div class="wsbuy ${miss?'no':''}"><div><b>${tOpt[1]}</b><small>${statLine(tOpt[2])}</small><small>${miss?`Ti mancano ${miss} monete: le guadagni nelle ondate e nelle sfide.`:`Costa ${tOpt[3]} monete.`}</small></div>
      <div class="col2"><button class="btn small" data-wsbuy ${miss?'disabled':''}>Compra 🪙 ${tOpt[3]}</button><button class="btn small ghost" data-wsno>Annulla</button></div></div>`:''}
    <p class="fl">Colore</p><div class="row wrap" style="gap:6px">${CUST_COL.map(col=>`<button class="swatch ${c.colore===col?'on':''}" data-col="${col}" style="background:${col}" aria-label="Colore"></button>`).join('')}</div>
    ${Object.entries(CUST).map(([k,S_])=>`<p class="fl">${S_.n}</p><div class="wsopts">${S_.o.map(([o,n,st,cost])=>{const has=own[k+':'+o],on=c[k]===o,tri=tr&&tr.k===k&&tr.o===o;return`<button class="wso ${on?'on':''} ${tri?'try':''}" data-ws="${k}:${o}"><b>${n}</b><small>${statLine(st)}</small><span>${on?'✓ In uso':has?'Usa':tri?'In prova':`🪙 ${cost}`}</span></button>`;}).join('')}</div>`).join('')}
    <button class="btn wide" data-wsdone style="margin-top:14px">Fatto</button>`,
  card=>{card.onclick=e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.col){c.colore=b.dataset.col;delete WS[id];workshop(id,back);return;}
      if(b.dataset.ws){const[k,o]=b.dataset.ws.split(':');if(own[k+':'+o]){c[k]=o;delete WS[id];vibe();workshop(id,back);}else{WS[id]={k,o};vibe();workshop(id,back);}return;}
      if(b.hasAttribute('data-wsbuy')){const t=WS[id];const op=CUST[t.k].o.find(x=>x[0]===t.o);if(G.coins<op[3])return;G.coins-=op[3];own[t.k+':'+t.o]=1;c[t.k]=t.o;delete WS[id];sfx('coin');toast(`${op[1]} montata!`);workshop(id,back);return;}
      if(b.hasAttribute('data-wsno')){delete WS[id];workshop(id,back);return;}
      if(b.hasAttribute('data-wsdone')){delete WS[id];closeSheet();if(back)back();}};});
}

/* ---------- avversari ---------- */
const OPP_N=['bunkerboy','nonna_ninja','il_geometra','luna_rossa','fortezza_mn','zia_pina','vedetta','cascinaz','mister_grate','lago_blu','montanaro','tetto_sicuro','ilfabbro','casamatta','torre_nord','ponte_vecchio'];
function randCust(r){const c={...CUST_DEF,colore:CUST_COL[Math.floor(r()*CUST_COL.length)]};Object.entries(CUST).forEach(([k,S_])=>{c[k]=S_.o[Math.floor(r()*S_.o.length)][0];});return c;}
function makeOpp(pow,r,nick){const kinds=['villa','apt','schiera','casale','barca','rifugio','camper','residence','attico','loft','bifamiliare','ringhiera','faro','trullo','albero'];
  return{nick:nick||OPP_N[Math.floor(r()*OPP_N.length)],kind:kinds[Math.floor(r()*kinds.length)],pow:Math.round(pow*(.88+r()*.24)),cust:randCust(r),lega:league(Math.round(G.trof*(.7+r()*.6)))[0]};}
function oppStats(o){const d={hp:0,bar:0,arm:0,dps:0,regen:0,slow:0};Object.keys(CUST).forEach(k=>{const x=CUST[k].o.find(y=>y[0]===o.cust[k]);if(x)Object.entries(x[2]).forEach(([s,v])=>d[s]+=v);});
  return{hp:Math.round(90+o.pow*.32+d.hp),bar:Math.round(40+o.pow*.12+d.bar),arm:Math.min(.5,.02+d.arm),dps:.45+o.pow/700+d.dps,regen:d.regen,slow:Math.min(.4,d.slow),tap:1+Math.floor(o.pow/450)};}
function waveSpec(w,seed){const r=rng(seed*31+w);const n=3+Math.floor(w*1.6);const out=[];for(let i=0;i<n;i++){const x=r();out.push({ty:w>=3&&x<.08+w*.015?'brute':x<.3+w*.02?'runner':'walker',lane:Math.floor(r()*3),at:i*Math.max(.35,1.1-w*.05)+r()*.3});}return out;}
const AZT={walker:{hp:2.2,sp:20,dps:5,s:.5},runner:{hp:1.4,sp:38,dps:4,s:.48},brute:{hp:6,sp:12,dps:10,s:.62}};
function ghostWaves(st,seed){ /* stima onesta delle ondate di un giocatore medio con quelle difese */
  let hp=st.hp,bar=st.bar,w=0;const tapDps=2.6*st.tap;
  while(hp>0&&w<60){w++;const spec=waveSpec(w,seed);const hm=1+.18*(w-1);let H=0,D=0;spec.forEach(z=>{H+=AZT[z.ty].hp*hm;D+=AZT[z.ty].dps*(1+.12*(w-1));});
    const clear=H/(st.dps+tapDps);const expo=Math.max(0,clear-3.5*(1+st.slow))*.3;let dmg=D*expo/Math.max(1,spec.length/3);
    if(bar>0){const t=Math.min(bar,dmg);bar-=t;dmg-=t;}hp-=dmg*(1-st.arm);hp=Math.min(st.hp,hp+st.regen*clear);}
  return Math.max(0,w-1);}

/* ---------- partita giocabile ---------- */
async function arenaPlay(myId,opp,ctx){
  const seed=ctx.seed||Math.floor(Math.random()*1e6);const st=propStats(myId);const ost=oppStats(opp);const target=ctx.targetOverride!=null?ctx.targetOverride:Math.max(1,ghostWaves(ost,seed)+Math.round((rng(seed+9)()-.5)*2));
  setMusic('game',6);document.body.classList.add('inbattle');
  app.innerHTML=`<div class="page arena-play">
    <div class="row spread"><b class="disp" style="font-size:24px">${esc(ctx.title)}</b><button class="btn ghost small" id="aQuit">Arrenditi</button></div>
    <div class="race"><div class="rme"><img alt="" src="${custImg(myId,44,52)}"><div><b>Tu · ${esc(propName(myId))}</b><small>Potenza ${propPower(myId)}</small></div></div>
      <div class="rvs">VS</div><div class="rop"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(custHouseSVG(opp.kind,opp.cust,44,52))}"><div><b>@${esc(opp.nick)}</b><small>Potenza ${opp.pow} · record: ondata ${target}</small></div></div></div>
    <div class="track"><span class="tme" id="tme" style="left:0%">TU</span><span class="top" style="left:${Math.min(96,target/(target+4)*100)}%">@${esc(opp.nick)}</span><i class="tline"></i></div>
    <div class="hpbars"><div><small>Casa</small><div class="hp"><span id="aH"></span></div></div><div><small>Barricata</small><div class="hp"><span id="aB" style="background:#7c8794"></span></div></div><div><small id="aW">Ondata 1</small><div class="hp"><span id="aP" style="background:#6fb59a"></span></div></div></div>
    <div class="arena"><canvas id="acv" width="960" height="600" aria-label="Sfida: tocca gli zombie"></canvas></div>
    <div class="toolbelt"><button class="tool" data-ai="fix"><span class="ic">🔧</span><span class="nm">Ripara</span></button><button class="tool" data-ai="pet"><span class="ic">💥</span><span class="nm">Petardo</span></button><button class="tool" data-ai="sir"><span class="ic">📢</span><span class="nm">Sirena</span></button><button class="tool" disabled><span class="ic">🎯</span><span class="nm">Tocco ${st.tap}</span></button></div>
    <p class="muted" style="font-size:12px;margin-top:6px">Stessa orda di @${esc(opp.nick)}: superalo resistendo più ondate. Tocca gli zombie; tre interventi, uno a testa.</p></div>`;
  window.scrollTo(0,0);
  const cv=$('#acv'),g=cv.getContext('2d');g.scale(2,2);
  const zone=propKind(myId)==='barca'?'fiume':propKind(myId)==='rifugio'?'montagna':(HTYPES[G.type]||{}).zone||'periferia';
  const [bg,hs,zw,zr,zb]=await Promise.all([svgImage(bgSVG(zone)),svgImage(custHouseSVG(propKind(myId),custOf(myId),160,180)),
    svgImage(spr(zombie(0,0,1,true),'-50 -80 100 125',100,125)),svgImage(spr(zombie(0,0,1,true).replace(/#7a6a56/g,'#d7263d'),'-50 -80 100 125',100,125)),svgImage(spr(zombie(0,0,1,true).replace(/#7a6a56/g,'#2b2240'),'-50 -80 100 125',100,125))]);
  const IM={walker:zw,runner:zr,brute:zb};const LN=[178,226,274],BX=128;
  const S_={hp:st.hp,bar:st.bar,w:1,t:0,zs:[],q:waveSpec(1,seed),qi:0,pops:[],shots:[],pool:0,slowT:0,end:false,gap:0,used:{}};
  const pop=(t,x,y,c='#f7d64a')=>S_.pops.push({t,x,y,c,a:0});
  const startWave=w=>{S_.w=w;S_.q=waveSpec(w,seed);S_.qi=0;S_.t=0;$('#aW').textContent='Ondata '+w;if(w>target&&!S_.passed){S_.passed=1;pop('SORPASSO!',170,90,'#f7d64a');sfx('win');}else sfx('horn');};
  app.querySelectorAll('[data-ai]').forEach(b=>b.onclick=()=>{const k=b.dataset.ai;if(S_.used[k]||S_.end)return;S_.used[k]=1;b.classList.add('cool');
    if(k==='fix'){S_.hp=Math.min(st.hp,S_.hp+st.hp*.3);S_.bar=Math.min(st.bar,S_.bar+st.bar*.4);pop('RIPARATA!',30,90,'#6fb59a');}
    if(k==='pet'){const c=[0,1,2].map(l=>S_.zs.filter(z=>z.lane===l).length);const l=c.indexOf(Math.max(...c));S_.zs.filter(z=>z.lane===l).forEach(z=>z.hp-=6);pop('BOOM!',300,LN[l]-40,'#d7263d');sfx('boom');}
    if(k==='sir'){S_.slowT=5;pop('UIIIUUU!',240,110,'#d7263d');}vibe();});
  const axy=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*480,(e.clientY-r.top)/r.height*300];};let adown=false,alast=null,ahit=new Set();
  cv.addEventListener('pointerdown',e=>{if(S_.end)return;const[x,y]=axy(e);adown=true;alast=[x,y];ahit=new Set();try{cv.setPointerCapture(e.pointerId);}catch(_){}
    let best=null,bd=48;S_.zs.forEach(z=>{const d=Math.hypot(z.x-x,(LN[z.lane]-30)-y);if(d<bd){bd=d;best=z;}});
    if(best){const Z=AZT[best.ty];const crit=y<LN[best.lane]-118*Z.s+42*Z.s;best.hp-=st.tap*(crit?2:1);best.fl=.12;ahit.add(best);pop(crit?'CRITICO!':['POW!','BAM!','TOC!'][Math.floor(Math.random()*3)],x-10,y-10,crit?'#d7263d':'#f7d64a');sfx('tap');}});
  cv.addEventListener('pointermove',e=>{if(!adown||S_.end)return;const[x,y]=axy(e);const[x0,y0]=alast;alast=[x,y];if(ahit.size>=5)return;
    S_.zs.forEach(z=>{if(ahit.has(z))return;const cx=z.x,cy=LN[z.lane]-30;const vx=x-x0,vy=y-y0,l2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((cx-x0)*vx+(cy-y0)*vy)/l2));if(Math.hypot(x0+vx*t-cx,y0+vy*t-cy)<26){ahit.add(z);z.hp-=st.tap*.7;z.fl=.12;pop('SLASH!',cx-12,cy-20,'#fff');}});});
  ['pointerup','pointercancel'].forEach(k=>cv.addEventListener(k,()=>{adown=false;}));
  $('#aQuit').onclick=()=>{S_.hp=0;};
  let last=performance.now();
  const frame=now=>{if(!document.getElementById('acv'))return;const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!S_.end){S_.t+=dt;S_.slowT=Math.max(0,S_.slowT-dt);
      while(S_.qi<S_.q.length&&S_.q[S_.qi].at<=S_.t){const q=S_.q[S_.qi++],Z=AZT[q.ty],hm=1+.18*(S_.w-1);S_.zs.push({ty:q.ty,lane:q.lane,x:500,hp:Z.hp*hm,max:Z.hp*hm,ph:Math.random()*6,fl:0});}
      const slow=(1-st.slow)*(S_.slowT>0?.5:1);
      S_.zs.forEach(z=>{const Z=AZT[z.ty];z.ph+=dt*6;z.fl=Math.max(0,z.fl-dt);const stopX=S_.bar>0?BX+30:BX-10;
        if(z.x>stopX)z.x-=Z.sp*(1+.03*S_.w)*slow*dt;else{let d=Z.dps*(1+.14*(S_.w-1))*dt*.7;if(S_.bar>0){S_.bar=Math.max(0,S_.bar-d);}else S_.hp-=d*(1-st.arm);}});
      S_.pool+=st.dps*dt;while(S_.pool>=1&&S_.zs.length){S_.pool-=1;const t=S_.zs.slice().sort((a,b)=>a.x-b.x)[0];t.hp-=1;S_.shots.push({x:BX+6,y:LN[t.lane]-40,tx:t.x,ty:LN[t.lane]-40,a:0});}
      if(!S_.zs.length)S_.pool=Math.min(S_.pool,1);
      S_.zs=S_.zs.filter(z=>{if(z.hp<=0){pop('POOF',z.x-10,LN[z.lane]-60,'#fff');G.coins+=1;return false;}return true;});
      S_.hp=Math.min(st.hp,S_.hp+st.regen*dt);
      if(S_.qi>=S_.q.length&&!S_.zs.length){S_.gap+=dt;if(S_.gap>1.4){S_.gap=0;startWave(S_.w+1);}}
      if(S_.hp<=0){S_.end=true;done();}}
    /* disegno */
    if(bg)g.drawImage(bg,0,0,480,300);if(hs)g.drawImage(hs,-4,104,128,144);
    if(S_.bar>0){g.globalAlpha=.35+.65*S_.bar/st.bar;LN.forEach(y=>{g.fillStyle='#8a5a34';g.strokeStyle='#140f1f';g.lineWidth=2;g.fillRect(BX,y-40,14,40);g.strokeRect(BX,y-40,14,40);g.fillRect(BX-4,y-30,22,6);g.fillRect(BX-4,y-16,22,6);});g.globalAlpha=1;}
    S_.zs.slice().sort((a,b)=>a.lane-b.lane).forEach(z=>{const Z=AZT[z.ty],y=LN[z.lane],im=IM[z.ty];g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(z.x,y+2,20*Z.s,5,0,0,7);g.fill();
      if(im){g.save();g.translate(z.x+Math.sin(z.ph)*2,y);g.rotate(Math.sin(z.ph)*.06);if(z.fl>0)g.globalAlpha=.6;g.drawImage(im,-50*Z.s,-118*Z.s,100*Z.s,125*Z.s);g.restore();}
      g.fillStyle='#140f1f';g.fillRect(z.x-14,y-118*Z.s-8,28,4);g.fillStyle='#d7263d';g.fillRect(z.x-14,y-118*Z.s-8,28*Math.max(0,z.hp/z.max),4);});
    S_.shots=S_.shots.filter(s=>{s.a+=dt*4;const x=s.x+(s.tx-s.x)*s.a;g.fillStyle='#f7d64a';g.beginPath();g.arc(x,s.ty,3.5,0,7);g.fill();return s.a<1;});
    S_.pops=S_.pops.filter(p=>{p.a+=dt;g.globalAlpha=Math.max(0,1-p.a);g.font='18px Bangers, Impact, sans-serif';g.lineWidth=4;g.strokeStyle='#140f1f';g.strokeText(p.t,p.x,p.y-p.a*20);g.fillStyle=p.c;g.fillText(p.t,p.x,p.y-p.a*20);g.globalAlpha=1;return p.a<1;});
    if(S_.slowT>0){g.fillStyle='rgba(215,38,61,.12)';g.fillRect(0,0,480,300);}
    const hh=$('#aH'),bb=$('#aB'),pp=$('#aP'),tm=$('#tme');if(hh){hh.style.width=Math.max(0,S_.hp/st.hp*100)+'%';bb.style.width=Math.max(0,S_.bar/st.bar*100)+'%';pp.style.width=(S_.q.length?S_.qi/S_.q.length*100:0)+'%';tm.style.left=Math.min(96,(S_.w-1)/(target+4)*100)+'%';}
    if(!S_.end||S_.pops.length)requestAnimationFrame(frame);};
  requestAnimationFrame(frame);startWave(1);
  function done(){const mine=S_.w-1;const res=mine>target?'win':mine===target?'draw':'lose';
    document.body.classList.remove('inbattle');setMusic('app');sfx(res==='lose'?'lose':'win');
    setTimeout(()=>ctx.onEnd({mine,opp:target,res}),300);}
}

/* ---------- sfida 1 contro 1 ---------- */
function duel1v1(){
  if(duelTickets()<1){toast('Sfide di oggi finite: tornano domani');return;}
  const ps=myProps();
  openSheet('⚔️ Passo 1 di 2 · Scegli la tua casa',`<p class="muted" style="margin-bottom:8px">La casa che scegli combatte con le sue difese. Personalizzala prima, se vuoi.</p>
    ${ps.sort((a,b)=>b.pow-a.pow).map(p=>`<div class="choice2"><img alt="" src="${custImg(p.id,54,64)}"><span><b>${esc(p.name)}</b><small>Potenza ${p.pow}</small></span><span class="col2"><button class="btn small" data-dp="${p.id}">Scegli</button><button class="btn small ghost" data-dw="${p.id}">🛠️</button></span></div>`).join('')}`,
  card=>{card.querySelectorAll('[data-dw]').forEach(b=>b.onclick=()=>workshop(b.dataset.dw,duel1v1));
    card.querySelectorAll('[data-dp]').forEach(b=>b.onclick=()=>pickOpp(b.dataset.dp));});
}
function pickOpp(myId){
  const r=rng(Date.now()%100000);const pw=propPower(myId);const opps=[makeOpp(pw*.9,r),makeOpp(pw,r),makeOpp(pw*1.12,r)];
  opps[0].diff='Facile';opps[1].diff='Pari';opps[2].diff='Difficile';
  openSheet('⚔️ Passo 2 di 2 · Scegli l’avversario',`<p class="muted" style="margin-bottom:8px">Sono difese registrate di altri giocatori. Più è forte, più coppe vinci.</p>
    ${opps.map((o,i)=>`<div class="choice2"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(custHouseSVG(o.kind,o.cust,54,64))}"><span><b>@${esc(o.nick)}</b><small>${HTYPES[o.kind]?HTYPES[o.kind].name:'Casa'} · potenza ${o.pow} · lega ${o.lega}</small><span class="tag ${i===2?'sp':i===0?'ia':''}">${o.diff} · ${[18,25,35][i]} coppe</span></span><span class="col2"><button class="btn small" data-op="${i}">Gioca</button></span></div>`).join('')}`,
  card=>card.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{closeSheet();const i=+b.dataset.op,o=opps[i];G.today.duels--;
    arenaPlay(myId,o,{title:'Sfida 1 contro 1',onEnd:res=>{const dt=res.res==='win'?[18,25,35][i]:res.res==='draw'?5:-12;G.trof=Math.max(0,G.trof+dt);if(res.res==='win'){G.gems+=5;G.coins+=60;}
      G.duelLog.unshift({win:res.res==='win',mine:propName(myId),opp:o.nick,w1:res.mine,w2:res.opp,dt});arenaResult(res,o,dt);}});}));
}
function arenaResult(res,o,dt,extra=''){
  const t={win:'SFIDA VINTA!',draw:'PAREGGIO',lose:'SFIDA PERSA'}[res.res];
  app.innerHTML=`<div class="page"><div class="panel ${res.res==='lose'?'night':'moon'}" style="margin-top:10px"><div class="sfx" style="font-size:38px;${res.res==='lose'?'color:#d7263d':''}">${t}</div>
    <p style="margin:8px 0">Hai resistito <b>${res.mine}</b> ondate, @${esc(o.nick)} <b>${res.opp}</b>. ${dt!=null?`${dt>0?'+':''}${dt} coppe.`:''}</p>${extra}
    <p style="font-weight:400;font-size:13px">${res.res==='lose'?'Prova a cambiare porta, tetto o giardino in officina: ogni scelta cambia la difesa.':'La tua casa ora è una difesa registrata: altri giocatori la sfideranno.'}</p>
    <button class="btn wide" id="toArena" style="margin-top:10px">Torna all’Arena</button></div></div>`;
  $('#toArena').onclick=()=>{G.sub='arena';G.view='hub';renderOrda();};
}

/* ---------- Coppa del Quartiere ---------- */
function tourInit(){if(G.tour)return G.tour;const r=rng(4242+(G.trof||0));const best=Math.max(...myProps().map(p=>p.pow));
  const groups={A:[],B:[],C:[],D:[]};const names=OPP_N.slice().sort(()=>r()-.5);let n=0;
  Object.keys(groups).forEach(g=>{for(let i=0;i<4;i++){if(g==='A'&&i===0){groups[g].push({me:true,nick:'Tu',pts:0,gw:0,ga:0,p:0});continue;}const o=makeOpp(best,r,names[n++]);groups[g].push({...o,pts:0,gw:0,ga:0,p:0});}});
  G.tour={week:1,phase:'gironi',groups,day:0,ko:null,out:false,prize:null,seed:Math.floor(r()*1e5)};return G.tour;}
function grpSort(arr){return arr.slice().sort((a,b)=>b.pts-a.pts||(b.gw-b.ga)-(a.gw-a.ga)||b.gw-a.gw);}
function simMatch(a,b,seed){const wa=a.me?0:ghostWaves(oppStats(a),seed)+Math.floor(rng(seed+1)()*3),wb=ghostWaves(oppStats(b),seed)+Math.floor(rng(seed+2)()*3);return[wa,wb];}
function addRes(x,y,wx,wy){x.p++;y.p++;x.gw+=wx;x.ga+=wy;y.gw+=wy;y.ga+=wx;if(wx>wy)x.pts+=3;else if(wy>wx)y.pts+=3;else{x.pts++;y.pts++;}}
function tourHTML(){
  const T=tourInit();const A=T.groups.A;const me=A[0];
  const table=(g,arr)=>`<table class="gt"><tr><th>Girone ${g}</th><th>G</th><th>Ond.</th><th>Pt</th></tr>${grpSort(arr).map((p,i)=>`<tr class="${p.me?'me':''} ${i<2?'q':''}"><td>${i+1}. ${p.me?'<b>Tu</b>':'@'+esc(p.nick)}</td><td>${p.p}</td><td>${p.gw}-${p.ga}</td><td><b>${p.pts}</b></td></tr>`).join('')}</table>`;
  let body='';
  if(T.phase==='gironi'){const opp=A[T.day+1];
    body=`${table('A',A)}<p class="muted" style="font-size:12px;margin:6px 0">Passano i primi 2 di ogni girone (in verde).</p>
      <div class="nextm"><div><small>Giornata ${T.day+1} di 3</small><b>Tu contro @${esc(opp.nick)}</b><small>${HTYPES[opp.kind]?HTYPES[opp.kind].name:''} · potenza ${opp.pow}</small></div><button class="btn small" id="tPlay">Gioca</button></div>
      <details class="howto"><summary>Altri gironi</summary>${['B','C','D'].map(g=>table(g,T.groups[g])).join('')}</details>`;}
  else if(T.phase==='ko'){const K=T.ko;const rnd=K.round;const lbl=['Quarti','Semifinale','Finale'][rnd];
    const bracket=K.rounds.map((ms,ri)=>`<div class="bcol"><small>${['Quarti','Semifinali','Finale'][ri]}</small>${ms.map(m=>`<div class="bm"><span class="${m.w===0?'w':''} ${m.a.me?'me':''}">${m.a.me?'Tu':'@'+esc(m.a.nick)} ${m.s?m.s[0]:''}</span><span class="${m.w===1?'w':''} ${m.b.me?'me':''}">${m.b.me?'Tu':'@'+esc(m.b.nick)} ${m.s?m.s[1]:''}</span></div>`).join('')}</div>`).join('');
    const myM=!T.out&&K.rounds[rnd]?K.rounds[rnd].find(m=>(m.a.me||m.b.me)&&m.w==null):null;
    body=`<div class="bracket">${bracket}</div>${myM?`<div class="nextm"><div><small>${lbl}</small><b>Tu contro @${esc((myM.a.me?myM.b:myM.a).nick)}</b><small>potenza ${(myM.a.me?myM.b:myM.a).pow}</small></div><button class="btn small" id="tPlay">Gioca</button></div>`:''}`;}
  if(T.prize)body+=`<div class="notice" style="margin-top:8px">${T.prize}</div><button class="btn small alt" id="tNew" style="margin-top:8px">Iscriviti alla prossima Coppa</button>`;
  return`<div class="panel tour"><div class="row spread"><b class="disp" style="font-size:24px">🏆 Coppa del Quartiere</b><span class="tag">${T.phase==='gironi'?'Fase a gironi':T.phase==='ko'?'Fase finale':'Conclusa'}</span></div>
    <p style="font-weight:400;font-size:13px;margin:4px 0 8px">Ogni settimana: 16 giocatori, 4 gironi da 4. Gironi da lunedì a giovedì (una partita al giorno), fase finale da venerdì a domenica. Premi: campione 100 💎, finale 60 💎, semifinale 35 💎.</p>${body}
    <p class="muted" style="font-size:11px;margin-top:6px">Anteprima: le giornate si giocano subito, una dopo l’altra.</p></div>`;
}
function tourPlay(){
  const T=G.tour;let opp,onRes;
  if(T.phase==='gironi'){const A=T.groups.A;opp=A[T.day+1];
    onRes=res=>{addRes(A[0],opp,res.mine,res.opp);const others=A.slice(1).filter(p=>p!==opp);const sd=T.seed+T.day*7;
      const [a,b]=simMatch(others[0],others[1],sd);addRes(others[0],others[1],a,b);
      ['B','C','D'].forEach((g,gi)=>{const P=T.groups[g];const pairs=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]][T.day];pairs.forEach(([i,j],k)=>{const[x,y]=simMatch(P[i],P[j],sd+gi*13+k);addRes(P[i],P[j],x,y);});});
      T.day++;let extra='';
      if(T.day>=3){const q=['A','B','C','D'].map(g=>grpSort(T.groups[g]));const meIn=q[0].slice(0,2).some(p=>p.me);
        if(meIn){T.phase='ko';const qf=[[q[0][0],q[1][1]],[q[1][0],q[0][1]],[q[2][0],q[3][1]],[q[3][0],q[2][1]]].map(([a,b])=>({a,b}));T.ko={round:0,rounds:[qf]};extra='<p><b>Passi il girone! Si va ai quarti.</b></p>';}
        else{T.phase='fine';T.out=true;T.prize='Fuori ai gironi: +10 💎. La prossima Coppa parte lunedì.';G.gems+=10;extra='<p><b>Eliminato ai gironi.</b></p>';}}
      arenaResult(res,opp,null,extra);};}
  else{const K=T.ko,ms=K.rounds[K.round],m=ms.find(x=>(x.a.me||x.b.me)&&x.w==null);opp=m.a.me?m.b:m.a;
    onRes=res=>{const meA=m.a.me;m.s=meA?[res.mine,res.opp]:[res.opp,res.mine];const iw=res.mine>res.opp||(res.mine===res.opp&&Math.random()<.5);m.w=iw?(meA?0:1):(meA?1:0);
      ms.forEach((x,k)=>{if(x.w==null){const[a,b]=simMatch(x.a,x.b,T.seed+K.round*31+k);x.s=[a,b];x.w=a>=b?0:1;}});
      let extra='';
      if(!iw){T.out=true;T.phase='fine';const pr=[20,35,60][K.round];G.gems+=pr;if(K.round===2)G.trof+=50;T.prize=`Eliminato in ${['quarti','semifinale','finale'][K.round]}: +${pr} 💎${K.round===2?' e +50 coppe':''}.`;extra=`<p><b>${T.prize}</b></p>`;}
      else if(K.round===2){T.phase='fine';G.gems+=100;G.trof+=100;G.champ=(G.champ||0)+1;T.prize='🏆 CAMPIONE DELLA SETTIMANA! +100 💎 e +100 coppe.';extra=`<p><b>${T.prize}</b></p>`;sfx('win');}
      else{const win=ms.map(x=>x.w===0?x.a:x.b);const nx=[];for(let i=0;i<win.length;i+=2)nx.push({a:win[i],b:win[i+1]});K.rounds.push(nx);K.round++;extra=`<p><b>Avanti: ${['semifinale','finale'][K.round-1]}!</b></p>`;}
      arenaResult(res,opp,null,extra);};}
  const ps=myProps();
  openSheet('🏆 Schiera la tua casa',`<p class="muted" style="margin-bottom:8px">Avversario: @${esc(opp.nick)} · potenza ${opp.pow}. Puoi schierare una casa diversa a ogni partita.</p>
    ${ps.sort((a,b)=>b.pow-a.pow).map(p=>`<div class="choice2"><img alt="" src="${custImg(p.id,54,64)}"><span><b>${esc(p.name)}</b><small>Potenza ${p.pow}</small></span><span class="col2"><button class="btn small" data-tp="${p.id}">Schiera</button><button class="btn small ghost" data-tw="${p.id}">🛠️</button></span></div>`).join('')}`,
  card=>{card.querySelectorAll('[data-tw]').forEach(b=>b.onclick=()=>workshop(b.dataset.tw,tourPlay));
    card.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>{closeSheet();arenaPlay(b.dataset.tp,opp,{title:'Coppa del Quartiere',seed:T.seed+T.day*3+(T.ko?T.ko.round*17:0),onEnd:onRes});});});
}

/* ---------- pagina Arena ---------- */
const OTABS=[['q','🏘️','Quartiere'],['pot','🛠️','Potenzia'],['amici','👥','Amici'],['arena','⚔️','Arena']];
function orderSeg(){const cur=G.sub||'q';return`<div class="otabs" role="tablist">${OTABS.map(([k,i,l])=>`<button role="tab" aria-selected="${cur===k}" class="${cur===k?'on':''}" data-sub="${k}"><span>${i}</span>${l}</button>`).join('')}</div>`;}
function bindSeg(){app.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{G.sub=b.dataset.sub;vibe();renderHub();window.scrollTo(0,0);});}
/* divide la pagina del quartiere nelle schede: ogni titolo porta con sé il contenuto che lo segue */
const OGRP={'Il quartiere':'q','Le tue proprietà':'q','Arena':'pot','Attrezzi anti-zombie':'pot','La tua casa':'pot','Bottega':'pot','Fortuna':'amici','Amici e quartiere':'amici'};
function foldQ(){const pg=app.querySelector('.page');if(!pg||(G.sub||'q')!=='q')return;
  const f=app.querySelector('#fight');const camp=app.querySelector('.camp');
  const top=camp||f;const tabs=app.querySelector('.otabs');
  if(tabs&&!app.querySelector('.scudo')&&typeof scudoBar==='function'){tabs.insertAdjacentHTML('afterend',scudoBar());const sc=app.querySelector('.scudo');sc.dataset.grp='q';}
  const scEl=app.querySelector('.scudo');if(camp&&tabs){(scEl||tabs).after(camp);const fh=f&&[...pg.children].find(e=>e===f||e.contains(f));if(fh&&fh!==camp)camp.after(fh);}
  const fold=(el,t)=>{if(!el||el.closest('details.fold'))return;const d=document.createElement('details');d.className='fold';d.dataset.grp='q';d.innerHTML=`<summary>${t}</summary>`;el.before(d);d.appendChild(el);el.hidden=false;};
  const daily=[...pg.children].find(e=>e.querySelector&&e.querySelector('#dClaim, .dcal'));
  fold(daily,'🎁 Premi e missioni di oggi');fold(app.querySelector('.dayp'),'☀️ Il giorno: prepara la notte');fold(app.querySelector('.hoodbar'),'👥 Amici e quartieri condivisi');
  if(f)f.classList.add('bigplay');if(typeof addPreNight==='function')addPreNight();}
function splitHub(){const pg=app.querySelector('.page');if(!pg)return;const cur=G.sub||'q';let grp='q';
  [...pg.children].forEach(el=>{if(el.classList.contains('otabs'))return;if(el.tagName==='H3'){const t=el.textContent.trim();const k=Object.keys(OGRP).find(x=>t.startsWith(x));if(k)grp=OGRP[k];}
    el.dataset.grp=grp;el.hidden=grp!==cur;});
  const duel=pg.querySelector('.duelc');if(duel)duel.hidden=true;
  /* nel Quartiere l'azione principale (Difendi) viene prima dei premi del giorno */
  const kids=[...pg.children];const dEl=kids.find(e=>e.querySelector&&e.querySelector('#dClaim, .dcal')||/Premio del giorno/.test(e.textContent||'')&&e.tagName!=='H3'&&e.textContent.length<4000&&e.querySelector('.btn'));
  const fEl=kids.find(e=>e.id==='fight'||(e.querySelector&&e.querySelector('#fight')));
  if(dEl&&fEl&&dEl!==fEl&&(dEl.compareDocumentPosition(fEl)&Node.DOCUMENT_POSITION_FOLLOWING)){let after=fEl;const nx=fEl.nextElementSibling;if(nx&&nx.tagName==='P')after=nx;after.after(dEl);}
  pg.querySelectorAll('h3').forEach(h=>{if(h.textContent.trim().startsWith('Arena'))h.textContent='Crediti Casa Vera';});
  if(typeof decorateHood==='function'&&cur==='q')decorateHood();
  if(cur==='q'&&typeof campHTML==='function'&&!app.querySelector('.camp')){const f=app.querySelector('#fight');const host=f&&[...pg.children].find(e=>e===f||e.contains(f));if(host){host.insertAdjacentHTML('beforebegin',campHTML());const c=app.querySelector('.camp');c.dataset.grp='q';bindCamp();}}
  if(cur==='q'&&typeof dayHTML==='function'&&!app.querySelector('.dayp')){const f=app.querySelector('#fight');const host=f&&[...pg.children].find(e=>e===f||e.contains(f));if(host){host.insertAdjacentHTML('beforebegin',dayHTML());const d=app.querySelector('.dayp');d.dataset.grp='q';bindDay();host.insertAdjacentHTML('beforebegin','<p class="disp nightlbl">🌙 Notte: difendi il quartiere</p>');}}
  if(cur==='q'&&typeof hoodBar==='function'&&!app.querySelector('.hoodbar')){const tabs=app.querySelector('.otabs');if(tabs){tabs.insertAdjacentHTML('afterend',hoodBar());const hb=app.querySelector('.hoodbar');hb.dataset.grp='q';bindHoods();}}
  foldQ();}
function renderArena(){
  ccvInit();const L=league(G.trof);const nx=LEAGUES[LEAGUES.indexOf(L)+1];const ps=myProps();
  app.innerHTML=`<div class="page">${orderSeg()}
   <div class="row spread" style="margin:10px 0"><div><h2>Arena</h2><span class="lg-badge" style="background:${L[2]}">${L[0]}</span> <b>${G.trof} coppe</b>${G.champ?` · 🏆×${G.champ}`:''}</div><div class="wallet"><span>🪙 <b>${G.coins}</b></span><span>💎 <b>${G.gems}</b></span></div></div>
   ${nx?`<div class="vbar"><span style="width:${Math.min(100,(G.trof-L[1])/(nx[1]-L[1])*100)}%;background:${nx[2]}"></span></div><small class="muted">${nx[1]-G.trof} coppe per la lega ${nx[0]}</small>`:''}
   <div class="steps3"><div><span>1</span>Scegli e personalizza una tua casa</div><div><span>2</span>Scegli l’avversario</div><div><span>3</span>Gioca: resisti più ondate di lui</div></div>
   <button class="btn wide bigcta" id="go1v1" ${duelTickets()<1?'disabled':''}>⚔️ Sfida 1 contro 1 <small>${duelTickets()<1?'finite: tornano domani':duelTickets()+' rimaste oggi'}</small></button>
   ${tourHTML()}
   ${presHTML()}
   <h3 style="margin:16px 0 8px">Le tue case da battaglia</h3>
   <div class="bhouses">${ps.map(p=>`<div class="bh"><img alt="" src="${custImg(p.id,96,112)}"><b>${esc(p.name)}</b><small>Potenza ${p.pow}</small><button class="btn small" data-wsh="${p.id}">🛠️ Personalizza</button></div>`).join('')}</div>
   ${G.duelLog.length?`<h3 style="margin:16px 0 8px">Ultime sfide</h3><div class="panel dlog">${G.duelLog.slice(0,5).map(d=>`<div><span class="tag ${d.win?'ia':'sp'}">${d.win?'Vinta':'Persa'}</span> ${esc(d.mine)} contro @${esc(d.opp)} · ${d.w1}–${d.w2} · ${d.dt>0?'+':''}${d.dt} coppe</div>`).join('')}</div>`:''}
  </div>`;
  bindSeg();bindPres();$('#go1v1').onclick=duel1v1;const tp=$('#tPlay');if(tp)tp.onclick=tourPlay;const tn=$('#tNew');if(tn)tn.onclick=()=>{G.tour=null;renderArena();};
  app.querySelectorAll('[data-wsh]').forEach(b=>b.onclick=()=>workshop(b.dataset.wsh,renderArena));
}
</script>

<script>
/* abilità della casa in battaglia e aspetto personalizzato */
function habOf(site){const k=site.home?G.type:(site.kind||'villa');
  const M={apt:'condominio',attico:'condominio',ringhiera:'condominio',residence:'condominio',palazzo:'condominio',bld:'condominio',villa:'cane',villetta:'cane',schiera:'cane',bifamiliare:'cane',loft:'cane',casale:'carro',trullo:'carro',campo:'carro',rifugio:'valanga',faro:'faro',barca:'onda',camper:'clacson',albero:'pigne'};
  const D={condominio:['🏢','Condòmini',16],cane:['🐕','Cane',12],carro:['🚜','Trattore',16],valanga:['❄️','Valanga',20],faro:['🔦','Faro',18],onda:['🌊','Onda',16],clacson:['📯','Clacson',12],pigne:['🌰','Pigne',14]};
  const key=M[k]||'cane';const d=D[key];return{k:key,ic:d[0],n:d[1],cd:d[2]};}
function battleHouseSVG(site){let kind,c;
  if(site.home){kind=G.type;c=custOf('home');}
  else{const lb=G.lots&&G.lots[site.id];const l=LOTS.find(x=>x.id===site.id);kind=lb&&lb.kind==='bld'?'bld':(l?l.kind:(site.kind||'villa'));
    c=lb&&!lb.owner?custOf(site.id):{...CUST_DEF,colore:'#5a5a66',porta:(site.fort||0)>=2?'acciaio':(site.fort?'blindata':'legno'),finestre:(site.fort||0)>=2?'scuri':(site.fort?'grate':'vetro')};}
  if(kind==='villetta')kind='villa';if(kind==='palazzo')kind='apt';if(kind==='campo')kind='casale';
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 0 132 220" width="132" height="220"><svg x="-14" y="56" width="160" height="164" viewBox="0 0 160 180" preserveAspectRatio="xMidYMax meet">${custHouseSVG(kind,c,160,180).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg></svg>`;}
</script>
