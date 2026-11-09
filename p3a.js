<script>
/* ================= ARTE A FUMETTO (SVG originali) ================= */
const INK='#140f1f';
const defs=(id='')=>`<defs>
 <pattern id="ht${id}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="${INK}" opacity=".28"/></pattern>
 <pattern id="htl${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#fff" opacity=".18"/></pattern>
 <pattern id="brick${id}" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#a8473a"/><path d="M0 0H24M0 6H24M12 0V6M0 6V12M24 6V12" stroke="${INK}" stroke-width="1.6"/></pattern>
 <pattern id="mesh${id}" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0L10 10M10 0L0 10" stroke="#c9c2b0" stroke-width="1.4"/></pattern>
 <linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160f33"/><stop offset=".65" stop-color="#3a2a78"/><stop offset="1" stop-color="#6b3f8f"/></linearGradient>
 <radialGradient id="glow${id}"><stop offset="0" stop-color="#f7d64a" stop-opacity=".55"/><stop offset="1" stop-color="#f7d64a" stop-opacity="0"/></radialGradient>
</defs>`;

function zombie(x,y,s=1,flip=false,cls=''){
  const f=flip?-1:1;
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${s*f} ${s})" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
   <path d="M-10 0 L-14 38 L-5 38 L-2 14 L3 38 L12 38 L9 0Z" fill="#3b3157"/>
   <path d="M-13 -42 L12 -44 L14 2 L-12 4Z" fill="#7a6a56"/>
   <path d="M-6 -40 L-2 -28 L2 -40" fill="none" stroke-width="2"/>
   <path d="M10 -36 L44 -40 L44 -32 L12 -26Z" fill="#6fb59a"/>
   <path d="M8 -24 L40 -22 L39 -15 L8 -16Z" fill="#5c9c82"/>
   <circle cx="0" cy="-56" r="15" fill="#6fb59a"/>
   <path d="M-6 -60 h5 M5 -60 h5" stroke-width="3"/>
   <circle cx="-3" cy="-59" r="2.5" fill="#f7d64a" stroke="none"/><circle cx="8" cy="-59" r="2.5" fill="#f7d64a" stroke="none"/>
   <path d="M-5 -48 Q2 -44 9 -48" fill="none" stroke-width="2.5"/>
   <path d="M-12 -66 l4 -6 l3 5 l4 -6 l3 6" fill="none" stroke-width="2"/>
  </g>`;
}

/* ---------- hero a tutta pagina ---------- */
function heroSVG(){
  const lines=Array.from({length:22},(_,i)=>{const a=i/22*Math.PI*2;return`<line x1="${300+Math.cos(a)*80}" y1="${190+Math.sin(a)*80}" x2="${300+Math.cos(a)*560}" y2="${190+Math.sin(a)*560}" stroke="#fff" stroke-opacity=".05" stroke-width="${i%2?6:14}"/>`}).join('');
  const bats=[[70,250,1],[120,215,.7],[215,270,.8]].map(([x,y,s])=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 q8 -10 16 0 q4 -6 8 0 q4 -6 8 0 q8 -10 16 0 q-10 0 -16 8 q-4 -4 -8 0 q-4 -4 -8 0 q-6 -8 -16 -8z" fill="${INK}"/>`).join('');
  return `<svg class="scene" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Notte di luna piena: una casa sulla collina e gli zombie che avanzano">${defs('h')}
   <rect width="400" height="860" fill="url(#skyh)"/>${lines}
   <rect width="400" height="860" fill="url(#htlh)"/>
   <circle cx="300" cy="190" r="150" fill="url(#glowh)"/>
   <circle cx="300" cy="190" r="78" fill="#f7d64a" stroke="${INK}" stroke-width="4"/>
   <clipPath id="moonclip"><circle cx="300" cy="190" r="78"/></clipPath><rect x="222" y="112" width="156" height="156" fill="url(#hth)" opacity=".7" clip-path="url(#moonclip)"/>
   <circle cx="272" cy="168" r="13" fill="#e8c23a" stroke="${INK}" stroke-width="2.5"/><circle cx="322" cy="214" r="9" fill="#e8c23a" stroke="${INK}" stroke-width="2.5"/><circle cx="318" cy="160" r="6" fill="#e8c23a" stroke="${INK}" stroke-width="2"/>
   ${bats}
   <path d="M-10 450 Q90 380 200 410 T420 380 V860 H-10Z" fill="#2a1f55" stroke="${INK}" stroke-width="4"/>
   <path d="M-10 510 Q120 455 250 490 T420 465 V860 H-10Z" fill="#1d1640" stroke="${INK}" stroke-width="4"/>
   <!-- casa sulla collina -->
   <g transform="translate(144 300) scale(1.1)" stroke="${INK}" stroke-width="4" stroke-linejoin="round">
     <rect x="0" y="46" width="112" height="84" fill="#4b3f7a"/>
     <rect x="0" y="46" width="112" height="84" fill="url(#hth)"/>
     <path d="M-14 50 L56 -6 L126 50Z" fill="#d7263d"/>
     <rect x="80" y="2" width="16" height="30" fill="#4b3f7a"/>
     <rect x="14" y="64" width="24" height="24" fill="#f7d64a"/><rect x="74" y="64" width="24" height="24" fill="#f7d64a"/>
     <path d="M26 64V88M14 76H38M86 64V88M74 76H98" stroke-width="3"/>
     <rect x="44" y="92" width="24" height="38" fill="#2b2240"/>
     <path d="M-20 130 H132" stroke-width="5"/>
     ${Array.from({length:8},(_,i)=>`<path d="M${-14+i*18} 130 V108 l4 -6 l4 6 V130" fill="#7c8794" stroke-width="3"/>`).join('')}
   </g>
   <!-- primo piano -->
   ${zombie(150,548,.75,false)}
   ${zombie(262,552,.7,true)}
   <path d="M-10 585 Q200 548 420 585 V860 H-10Z" fill="${INK}"/>
   ${zombie(58,600,1.35,false)}
   ${zombie(342,596,1.3,true)}
  </svg>`;
}

/* ---------- piccole vignette della home ---------- */
function vignette(kind){
  const bg=`<rect width="200" height="120" fill="#f3e9d2"/><rect width="200" height="120" fill="url(#htv${kind})"/>`;
  const d=defs('v'+kind);
  if(kind==='cam')return`<svg viewBox="0 0 200 120" role="img" aria-label="Telefono che inquadra una porta">${d}${bg}
   <g stroke="${INK}" stroke-width="3"><rect x="62" y="10" width="76" height="104" rx="10" fill="${INK}"/><rect x="68" y="20" width="64" height="84" fill="#9fd3c0"/>
   <path d="M76 100 V58 L100 40 L124 58 V100Z" fill="#fff"/><rect x="92" y="72" width="16" height="28" fill="#a8473a"/>
   <path d="M70 26 h10 M70 26 v10 M130 26 h-10 M130 26 v10 M70 98 h10 M70 98 v-10 M130 98 h-10 M130 98 v-10" stroke="#d7263d" stroke-width="3"/></g>
   <text x="140" y="38" font-family="Bangers,Impact" font-size="24" textLength="52" lengthAdjust="spacingAndGlyphs" fill="#f7d64a" stroke="${INK}" stroke-width="1.5" transform="rotate(10 140 38)">CLICK!</text></svg>`;
  if(kind==='map')return`<svg viewBox="0 0 200 120" role="img" aria-label="Mappa del quartiere con un segnaposto">${d}${bg}
   <g stroke="${INK}" stroke-width="2.5"><path d="M0 70 Q60 50 100 72 T200 60" fill="none" stroke="#6fa8dc" stroke-width="10"/>
   <rect x="16" y="14" width="44" height="30" fill="#fff"/><rect x="72" y="10" width="54" height="34" fill="#fff"/><rect x="140" y="16" width="46" height="28" fill="#cfe6c5"/>
   <rect x="22" y="86" width="50" height="26" fill="#fff"/><rect x="130" y="84" width="56" height="28" fill="#fff"/>
   <path d="M100 98 c-14 -18 -14 -36 0 -40 c14 4 14 22 0 40z" fill="#d7263d"/><circle cx="100" cy="70" r="5" fill="#fff"/></g></svg>`;
  if(kind==='quiz')return`<svg viewBox="0 0 200 120" role="img" aria-label="Fumetto con domande sulla casa">${d}${bg}
   <g stroke="${INK}" stroke-width="3"><path d="M20 14 H180 V74 H70 L48 98 L52 74 H20Z" fill="#fff"/></g>
   <text x="32" y="44" font-family="Bangers,Impact" font-size="22" textLength="136" lengthAdjust="spacingAndGlyphs" fill="${INK}">PORTA? GRATE?</text><text x="32" y="66" font-family="Bangers,Impact" font-size="17" textLength="136" lengthAdjust="spacingAndGlyphs" fill="#d7263d">SCORTE? VIE DI FUGA?</text></svg>`;
  return`<svg viewBox="0 0 200 120" role="img" aria-label="Casa che si fortifica">${d}<rect width="200" height="120" fill="#241a4a"/><rect width="200" height="120" fill="url(#htlv${kind})"/>
   <g stroke="${INK}" stroke-width="3"><path d="M60 104 V62 L100 34 L140 62 V104Z" fill="#4b3f7a"/><path d="M52 64 L100 28 L148 64" fill="none" stroke-width="4"/>
   <rect x="68" y="44" width="24" height="12" fill="#2f7fb8" transform="rotate(-36 80 50)"/>
   <rect x="90" y="76" width="20" height="28" fill="#7c8794"/><circle cx="105" cy="90" r="2" fill="${INK}"/>
   <path d="M30 104 H170" stroke-width="4"/><rect x="24" y="84" width="152" height="20" fill="url(#brickv${kind})"/></g>
   <text x="112" y="28" font-family="Bangers,Impact" font-size="24" textLength="78" lengthAdjust="spacingAndGlyphs" fill="#f7d64a" stroke="${INK}" stroke-width="1.5" transform="rotate(8 112 28)">+DIFESA!</text></svg>`;
}

