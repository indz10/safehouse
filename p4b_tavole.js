<script>
/* =========================================================
   SIMULA: LE TAVOLE DELLA NOTTE
   9 fasi dell'assedio, ognuna con due versioni (tiene / cede)
   scelte in base alle risposte reali, poi il finale.
   ========================================================= */
function tvHouse(x,y,s=1,lit=true,o={}){return`<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
  <rect x="0" y="40" width="110" height="80" fill="#4b3f7a"/><path d="M-10 44 L55 0 L120 44Z" fill="#d7263d"/>${o.solar?`<path d="M64 20 l30 18 l-8 6 l-30 -18z" fill="#2f7fb8" stroke-width="2"/>`:''}
  <rect x="14" y="56" width="24" height="22" fill="${lit?'#f7d64a':'#1d1640'}"/><rect x="72" y="56" width="24" height="22" fill="${lit?'#f7d64a':'#1d1640'}"/>
  <rect x="44" y="84" width="22" height="36" fill="${o.door||'#8a5a34'}"/></g>`;}
function tvSky(id,day){return day?`<rect width="480" height="220" fill="#f08a4b"/><rect width="480" height="220" fill="url(#htl${id})"/>`
  :`<rect width="480" height="220" fill="#241a4a"/><rect width="480" height="220" fill="url(#htl${id})"/><circle cx="420" cy="38" r="20" fill="#f7d64a" stroke="${INK}" stroke-width="3"/>`;}
function tvBubble(x,y,t,col='#fff'){const w=t.length*9+18;return`<g transform="translate(${x} ${y})"><path d="M0 0 h${w} v26 h-${w-24} l-10 10 l2 -10 h-16z" fill="${col}" stroke="${INK}" stroke-width="2.5"/><text x="${w/2}" y="18" text-anchor="middle" font-family="Bangers,Impact" font-size="16" fill="${INK}">${t}</text></g>`;}
function tvStamp(ok){return`<g transform="translate(380 176) rotate(-8)"><rect x="-6" y="-22" width="${ok?96:90}" height="32" fill="${ok?'#3f9b5f':'#d7263d'}" stroke="${INK}" stroke-width="3"/><text x="${ok?42:39}" y="2" text-anchor="middle" font-family="Bangers,Impact" font-size="22" fill="#fff">${ok?'TIENE!':'CEDE!'}</text></g>`;}
const TV_ORDER=['arrivo','allarme','perimetro','blackout','porta','finestre','vicini','radio','scorte'];
function tvEval(a){
  const has=(k,v)=>[].concat(v).includes(a[k]);
  return{
   arrivo:{ok:has('visibile','nasc')||has('zona',['campagna','montagna']),t:'Mezzanotte',y:a.visibile==='nasc'?'Alberi e siepi nascondono la casa: l’orda passa oltre, poi torna indietro.':'Dalla strada la casa si vede bene: l’orda punta dritta verso di te.',n:a.zona==='centro'?7:a.zona==='periferia'?5:4},
   allarme:{ok:has('luci','sensore')||a.cane==='1'||has('allarme',['cam','allarme']),t:'Il primo allarme',y:[a.luci==='sensore'&&'le luci a sensore si accendono',a.cane==='1'&&'il cane abbaia',has('allarme',['cam','allarme'])&&'parte la sirena'].filter(Boolean).join(', ').replace(/^./,c=>c.toUpperCase())||'Nessuno se ne accorge: la casa dorme e l’orda arriva sotto le finestre.'},
   perimetro:{ok:has('recinzione',['muro2','muro1'])&&a.cancello!=='no',t:'Il perimetro',y:has('recinzione',['muro2','muro1'])&&a.cancello!=='no'?'Muro e cancello reggono: l’orda si ammassa fuori.':'Rete bassa o cancello aperto: in pochi secondi sono in giardino.'},
   blackout:{ok:has('energia',['fv','gen']),t:'Blackout',y:has('energia',['fv','gen'])?`Salta la corrente in tutto il quartiere, ma il ${a.energia==='fv'?'fotovoltaico':'generatore'} tiene accesa la tua casa.`:'Salta la corrente: buio totale, solo una candela.',solar:a.energia==='fv'},
   porta:{ok:has('porta',['b4','blindata']),t:'La porta',y:has('porta',['b4','blindata'])?'La porta blindata incassa i colpi senza muoversi.':'La porta d’ingresso inizia a spaccarsi.'},
   finestre:{ok:a.grate==='tutte'||(a.vetri==='anti'&&a.tapparelle==='blind'),t:'Finestre e garage',y:a.grate==='tutte'?'Le grate fermano le mani che entrano dalle finestre basse.':(a.vetri==='anti'&&a.tapparelle==='blind')?'Tapparelle d’acciaio e vetri antisfondamento: niente da fare.':'Un vetro va in pezzi: le finestre basse sono il punto debole.'},
   vicini:{ok:a.gruppo==='org'||(a.gruppo==='qualche'&&a.vicini==='20'),t:'I vicini',y:a.gruppo==='org'?'Il gruppo di quartiere arriva con torce e megafoni.':(a.gruppo==='qualche'&&a.vicini==='20')?'Un vicino ti sente e arriva di corsa.':'Le altre case restano buie. Nessuno risponde.'},
   radio:{ok:a.radio==='radio'||a.walkie==='1',t:'Radio e contatti',y:a.radio==='radio'?'La radio a manovella capta le istruzioni dei soccorsi.':a.walkie==='1'?'Con il walkie-talkie coordini i vicini.':'Il telefono non prende: nessuna notizia dal mondo.'},
   scorte:{ok:has('acqua',['pozzo','14'])&&has('cibo',['14','3'])&&a.medico!=='no',t:'Scorte e calore',y:has('acqua',['pozzo','14'])&&has('cibo',['14','3'])?`Acqua e cibo bastano per giorni${a.calore==='legna'?', e la stufa scalda la casa':''}.`:'Le scorte finiscono in fretta: domani sarà dura.',warm:a.calore==='legna'}
  };
}
function tvSVG(k,ok,e){
  const id='tv'+k+(ok?1:0);const Z=(x,y,s=.45,f=false)=>zombie(x,y,s,f);const P=(x,y,s,c,o)=>person(x,y,s,c,o||{});
  const ground=`<rect y="176" width="480" height="44" fill="#1d1640" stroke="${INK}" stroke-width="3"/>`;
  let b='';
  if(k==='arrivo'){const n=e.n;b=tvHouse(320,64,1,true)+(ok?Array.from({length:6},(_,i)=>`<path d="M${290+i*30} 184 q14 -46 28 0z" fill="#2f6b45" stroke="${INK}" stroke-width="2.5"/>`).join(''):'')
     +Array.from({length:n},(_,i)=>Z(30+i*34,196-(i%2)*6,.42,true)).join('')+(ok?tvBubble(40,30,'DOVE SONO?'):tvBubble(40,30,'LÀ! LUCI!','#f7d64a'));}
  if(k==='allarme'){b=tvHouse(250,64,1,ok)+(ok?`<path d="M300 110 L120 196 L260 196Z" fill="#f7d64a" opacity=".35"/><circle cx="352" cy="88" r="9" fill="#d7263d" stroke="${INK}" stroke-width="2.5"/>`+dog(200,186)+tvBubble(150,120,'WOOF! WOOF!','#f7d64a')+Z(100,198,.45,true)+Z(60,200,.42,true)
     :`<text x="300" y="50" font-family="Bangers,Impact" font-size="22" fill="#cfc6e6">Z z z…</text>`+Z(240,198,.45,true)+Z(200,200,.42,true)+Z(150,198,.45,true));}
  if(k==='perimetro'){b=tvHouse(320,64,.9,true)+(ok?`<rect x="20" y="132" width="280" height="50" fill="#a8473a" stroke="${INK}" stroke-width="3"/>${[0,1,2,3,4,5,6].map(i=>`<path d="M${20+i*40} 132 V182 M${20} ${148+(i%2)*16} H300" stroke="${INK}" stroke-width="1.5"/>`).join('')}`+Z(60,130,.4)+Z(120,128,.42,true)+Z(200,130,.4)+tvBubble(180,40,'BONK!','#f7d64a')
     :`<path d="M20 150 H300 M20 166 H300" stroke="#c9c2b0" stroke-width="2"/>${[0,1,2,3,4,5,6,7].map(i=>`<path d="M${20+i*40} 140 V182" stroke="#9aa4b0" stroke-width="3"/>`).join('')}<path d="M140 140 L170 176 L200 142" stroke="#d7263d" stroke-width="3" fill="none"/>`+Z(160,198,.45)+Z(230,200,.45,true)+Z(280,198,.42,true)+tvBubble(60,40,'CRAAK!'));}
  if(k==='blackout'){b=[0,1,3].map(i=>tvHouse(10+i*120,96,.62,false)).join('')+tvHouse(242,82,.78,ok,{solar:e.solar})+(ok?`<circle cx="285" cy="132" r="70" fill="#f7d64a" opacity=".2"/>`+tvBubble(40,26,'DA TE C’È LUCE!','#f7d64a')
     :`<circle cx="262" cy="128" r="4" fill="#f7d64a"/><circle cx="262" cy="128" r="14" fill="#f7d64a" opacity=".25"/>`+tvBubble(40,26,'CLICK. BUIO.'))+Z(450,200,.4,false);}
  if(k==='porta'){b=`<rect x="140" y="20" width="200" height="160" fill="#4b3f7a" stroke="${INK}" stroke-width="3"/><rect x="190" y="40" width="100" height="140" fill="${ok?'#7c8794':'#8a5a34'}" stroke="${INK}" stroke-width="4"/>`
     +(ok?`${[70,100,130,160].map(y=>`<path d="M196 ${y} H284" stroke="${INK}" stroke-width="2"/>`).join('')}<circle cx="270" cy="110" r="6" fill="#f7d64a" stroke="${INK}" stroke-width="2"/>`+tvBubble(20,30,'BANG! BANG!')+Z(110,200,.5,false)+Z(370,200,.5,true)
     :`<path d="M220 50 L240 90 L226 120 L250 160" stroke="#140f1f" stroke-width="4" fill="none"/><path d="M236 92 l20 6 M228 118 l-16 8" stroke="#140f1f" stroke-width="3"/><g transform="translate(230 100)" fill="#6fb59a" stroke="${INK}" stroke-width="2"><rect x="0" y="0" width="22" height="9" rx="4"/><rect x="2" y="14" width="22" height="9" rx="4"/></g>`+tvBubble(20,30,'CRACK!','#f7d64a')+Z(120,200,.5,false));}
  if(k==='finestre'){b=`<rect x="80" y="20" width="320" height="160" fill="#4b3f7a" stroke="${INK}" stroke-width="3"/><rect x="170" y="50" width="140" height="100" fill="${ok?'#f7d64a':'#1d1640'}" stroke="${INK}" stroke-width="4"/>`
     +(ok?[184,204,224,244,264,284].map(x=>`<path d="M${x} 50 V150" stroke="#7c8794" stroke-width="6"/>`).join('')+`<g fill="#6fb59a" stroke="${INK}" stroke-width="2"><rect x="196" y="140" width="24" height="10" rx="4"/><rect x="250" y="140" width="24" height="10" rx="4"/></g>`+tvBubble(30,26,'TONK!')
     :`<path d="M170 50 L220 96 L190 150 M310 50 L262 100 L300 150 M240 50 L246 96" stroke="#9fd3e6" stroke-width="3"/>${[0,1,2,3,4].map(i=>`<path d="M${180+i*28} 170 l8 -6 l4 8z" fill="#9fd3e6" stroke="${INK}" stroke-width="1.5"/>`).join('')}`+Z(240,170,.55,false)+tvBubble(30,26,'SKRASH!','#f7d64a'));}
  if(k==='vicini'){b=tvHouse(180,70,.9,true)+(ok?[40,90,330,380,430].map((x,i)=>P(x,200,.55,['#2f7fb8','#d7263d','#3f9b5f','#f08a4b','#7c8794'][i],{torch:true,coat:'#f7d64a',hood:true,flip:i>1})).join('')+tvBubble(130,20,'ARRIVIAMO!','#f7d64a')
     :[20,350].map(x=>tvHouse(x,100,.6,false)).join('')+Z(120,200,.45,true)+Z(300,200,.45,false)+tvBubble(140,20,'…C’È QUALCUNO?'));}
  if(k==='radio'){b=`<rect x="120" y="70" width="240" height="110" fill="#8a5a34" stroke="${INK}" stroke-width="3"/>`+(ok?`<rect x="180" y="96" width="90" height="56" rx="8" fill="#d7263d" stroke="${INK}" stroke-width="3"/><circle cx="206" cy="124" r="14" fill="#cfc6e6" stroke="${INK}" stroke-width="2.5"/><path d="M226 104 h34 M226 116 h34 M226 128 h34" stroke="${INK}" stroke-width="2"/><path d="M262 96 l14 -40" stroke="${INK}" stroke-width="3"/>${[1,2,3].map(i=>`<path d="M${280+i*12} ${60-i*4} a${i*14} ${i*14} 0 0 1 0 ${i*24}" fill="none" stroke="#f7d64a" stroke-width="3"/>`).join('')}`+tvBubble(20,20,'QUI SUPERSTITE 1, MI SENTITE?','#f7d64a')
     :`<rect x="206" y="88" width="60" height="96" rx="8" fill="#2b2240" stroke="${INK}" stroke-width="3"/><rect x="212" y="98" width="48" height="70" fill="#1d1640"/><text x="236" y="136" text-anchor="middle" font-family="Arial" font-weight="700" font-size="8" fill="#cfc6e6">NESSUN</text><text x="236" y="148" text-anchor="middle" font-family="Arial" font-weight="700" font-size="8" fill="#cfc6e6">SERVIZIO</text>`+tvBubble(20,20,'PRONTO? PRONTO?'));}
  if(k==='scorte'){b=`<rect x="60" y="30" width="360" height="150" fill="#8a5a34" stroke="${INK}" stroke-width="3"/>${[70,110,150].map(y=>`<path d="M60 ${y} H420" stroke="${INK}" stroke-width="4"/>`).join('')}`
     +(ok?[70,110].map(y=>Array.from({length:9},(_,i)=>i%3===0?`<rect x="${74+i*36}" y="${y-30}" width="18" height="28" rx="4" fill="#9fd3e6" stroke="${INK}" stroke-width="2"/>`:`<rect x="${74+i*36}" y="${y-22}" width="22" height="20" fill="${['#d7263d','#f7d64a','#3f9b5f'][i%3]}" stroke="${INK}" stroke-width="2"/>`).join('')).join('')+`<rect x="80" y="122" width="40" height="26" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M92 135 h16 M100 127 v16" stroke="#d7263d" stroke-width="4"/>`+(e.warm?`<path d="M360 150 q10 -26 20 0 q-10 -12 -20 0z" fill="#f08a4b" stroke="${INK}" stroke-width="2"/>`:'')+tvBubble(150,8,'C’È TUTTO!','#f7d64a')
     :`<rect x="300" y="90" width="18" height="18" fill="#d7263d" stroke="${INK}" stroke-width="2"/><text x="190" y="128" font-family="Bangers,Impact" font-size="18" fill="#f3e9d2">vuoto…</text>`+tvBubble(150,8,'E DOMANI?'));}
  return`<svg viewBox="0 0 480 220" role="img" aria-label="${esc(e.t)}: ${ok?'tiene':'cede'}">${defs(id)}${['porta','finestre','radio','scorte'].includes(k)?`<rect width="480" height="220" fill="#33276a"/><rect width="480" height="220" fill="url(#htl${id})"/>`:tvSky(id)}${['porta','finestre','radio','scorte'].includes(k)?'':ground}${b}${tvStamp(ok)}</svg>`;
}
function playTavole(a,box,done){
  const ev=tvEval(a);let i=0;const okN=TV_ORDER.filter(k=>ev[k].ok).length;
  box.innerHTML=`<div class="tv-head"><b class="disp" style="font-size:26px">Le tavole della notte</b><span class="tag" id="tvc">0/${TV_ORDER.length}</span></div><div class="tv-list" id="tvl"></div>`;
  const list=box.querySelector('#tvl');
  const step=()=>{if(i>=TV_ORDER.length){box.insertAdjacentHTML('beforeend',`<div class="tv-sum"><b>${okN} difese su ${TV_ORDER.length} hanno tenuto.</b></div>`);done(ev,okN);return;}
    const k=TV_ORDER[i];const e=ev[k];i++;
    list.insertAdjacentHTML('beforeend',`<figure class="tv ${e.ok?'ok':'ko'}"><figcaption><span class="tvn">${i}</span><b>${e.t}</b></figcaption>${tvSVG(k,e.ok,e)}<p>${esc(e.y)}</p></figure>`);
    const f=list.lastElementChild;requestAnimationFrame(()=>f.classList.add('in'));f.scrollIntoView({behavior:'smooth',block:'center'});
    box.querySelector('#tvc').textContent=`${i}/${TV_ORDER.length}`;try{sfx(e.ok?'coin':'crack');}catch(x){}
    setTimeout(step,S.tvFast?120:1900);};
  step();
}
</script>
