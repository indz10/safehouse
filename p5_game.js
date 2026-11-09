<script>
/* =========================================================
   TAB ORDA — gioco a ondate (separato da valutazione e mappa)
   ========================================================= */
const HTYPES={
 apt:{name:'Appartamento',zone:'centro',zl:'Centro',hp:130,bar:60,coins:150,ally:.8,mix:[.5,.4,.1],start:{grate:1},pitch:'Al terzo piano: difficile da raggiungere, ma l’orda è veloce.',st:[4,2,5,3]},
 schiera:{name:'Villetta a schiera',zone:'periferia',zl:'Periferia',hp:100,bar:60,coins:190,ally:.9,mix:[.6,.3,.1],start:{},pitch:'Muro a muro con i vicini: l’aiuto arriva subito.',st:[3,3,4,3]},
 villa:{name:'Villa',zone:'periferia',zl:'Periferia',hp:110,bar:80,coins:150,ally:1,mix:[.6,.25,.15],start:{luci:1},pitch:'Giardino grande: tanto spazio per le difese.',st:[3,5,3,3]},
 barca:{name:'Casa galleggiante',zone:'fiume',zl:'Fiume',hp:95,bar:30,coins:170,ally:1.1,mix:[.55,.35,.1],start:{},pitch:'Sull’acqua l’orda arriva solo dal pontile… ma lo scafo è fragile.',st:[2,2,3,2]},
 rifugio:{name:'Rifugio in montagna',zone:'montagna',zl:'Montagna',hp:165,bar:70,coins:140,ally:1.5,mix:[.45,.2,.35],start:{energia:1},pitch:'Muri di pietra e legna per l’inverno, ma i soccorsi sono lontani.',st:[5,3,1,4]},
 camper:{name:'Camper',zone:'campagna',zl:'Campagna',hp:80,bar:20,coins:230,ally:1,mix:[.5,.35,.15],start:{},pitch:'Leggero e senza muri, ma con più monete per partire.',st:[1,1,3,3]},
 residence:{name:'Residence',zone:'periferia',zl:'Periferia',hp:140,bar:90,coins:170,ally:1.4,mix:[.55,.3,.15],start:{muro:1},pitch:'Portineria, cancello controllato e piscina: tanti vicini pronti ad aiutare.',st:[4,4,5,3]},
 attico:{name:'Attico',zone:'centro',zl:'Centro',hp:120,bar:50,coins:200,ally:.7,mix:[.5,.4,.1],start:{vedetta:1},pitch:'In cima al palazzo: la vista è perfetta, ma le scale sono lunghe.',st:[3,2,3,3]},
 loft:{name:'Loft in ex fabbrica',zone:'periferia',zl:'Periferia',hp:150,bar:60,coins:160,ally:.9,mix:[.6,.25,.15],start:{},pitch:'Muri di mattoni spessi e grandi vetrate da proteggere.',st:[5,4,2,4]},
 bifamiliare:{name:'Bifamiliare',zone:'periferia',zl:'Periferia',hp:115,bar:70,coins:170,ally:1.2,mix:[.6,.3,.1],start:{},pitch:'Mezza casa a testa: il vicino è dall’altra parte del muro.',st:[3,4,4,3]},
 ringhiera:{name:'Casa di ringhiera',zone:'centro',zl:'Centro',hp:105,bar:50,coins:180,ally:1.5,mix:[.5,.4,.1],start:{},pitch:'Ballatoi condivisi: tutti si conoscono, ma tutti passano davanti alla tua porta.',st:[3,2,5,4]},
 faro:{name:'Faro',zone:'fiume',zl:'Fiume',hp:175,bar:40,coins:140,ally:.6,mix:[.5,.3,.2],start:{luci:2},pitch:'Torre di pietra sull’acqua: un solo ingresso e una luce che si vede da lontano.',st:[5,1,1,4]},
 trullo:{name:'Trullo',zone:'campagna',zl:'Campagna',hp:160,bar:40,coins:150,ally:1,mix:[.5,.2,.3],start:{},pitch:'Muri a secco spessi un metro e tetti a cono: freschi e solidi.',st:[5,3,2,4]},
 albero:{name:'Casa sull’albero',zone:'campagna',zl:'Campagna',hp:85,bar:30,coins:210,ally:.8,mix:[.55,.35,.1],start:{},pitch:'Si sale con la scala di corda: gli zombie non sono bravi ad arrampicarsi.',st:[2,2,2,2]},
 casale:{name:'Casale',zone:'campagna',zl:'Campagna',hp:150,bar:40,coins:150,ally:1.3,mix:[.5,.15,.35],start:{energia:1},pitch:'Muri spessi e generatore, ma dai campi arrivano i bruti.',st:[5,4,2,5]}
};
const HUP=[
 {id:'porta',name:'Porta',lv:['Legno','Blindata','Classe 4'],eff:'+40 resistenza della casa per livello',cost:[150,350]},
 {id:'grate',name:'Grate e tapparelle',lv:['Nessuna','Grate','Grate + acciaio','Blindatura totale'],eff:'−10% danni alla casa per livello',cost:[120,260,480]},
 {id:'muro',name:'Recinzione',lv:['Rete','Cancellata','Muro','Muro rinforzato'],eff:'Barricata più robusta (60 / 120 / 200 / 300)',cost:[140,300,560]},
 {id:'luci',name:'Luci',lv:['Nessuna','Fisse','Con sensore'],eff:'L’orda rallenta dell’8% per livello',cost:[90,220]},
 {id:'energia',name:'Energia',lv:['Rete','Generatore','Fotovoltaico'],eff:'Petardo e sirena si ricaricano il 20% più in fretta per livello',cost:[160,380]},
 {id:'vedetta',name:'Vedetta sul tetto',lv:['No','Vedetta','Vedetta con faro'],eff:'+1 danno a ogni tocco per livello',cost:[130,320]}
];
const SLOTS=[
 {id:'lampioni',zone:'centro',name:'Lampioni di Via Grande',eff:'Rallenta l’orda del 10% per livello',cost:[80,180,350],x:60,y:60},
 {id:'acquedotto',zone:'centro',name:'Torre dell’acquedotto',eff:'Un getto d’acqua respinge una corsia (ogni 9, 7, 5 secondi)',cost:[150,300,550],x:330,y:48},
 {id:'campanile',zone:'centro',name:'Campanile vedetta',eff:'+1 danno a ogni tocco per livello',cost:[120,260,500],x:200,y:118},
 {id:'rossi',zone:'periferia',name:'Casa dei Rossi',eff:'Vicino alleato sulla corsia alta (più forte a ogni livello)',cost:[100,220,420],x:92,y:262,ally:0},
 {id:'bianchi',zone:'periferia',name:'Casa Bianchi',eff:'Vicino alleato sulla corsia centrale',cost:[100,220,420],x:300,y:312,ally:1},
 {id:'rotonda',zone:'periferia',name:'Barricata alla rotonda',eff:'+50 punti barricata per livello',cost:[90,200,380],x:200,y:352},
 {id:'fattoria',zone:'campagna',name:'Fattoria Bassi',eff:'+15% monete per livello',cost:[120,260,480],x:78,y:498},
 {id:'canile',zone:'campagna',name:'Canile Fido',eff:'Un cane che si lancia sugli zombie (più spesso a ogni livello)',cost:[140,280,520],x:300,y:478},
 {id:'neri',zone:'campagna',name:'Casale Neri',eff:'Vicino alleato sulla corsia bassa',cost:[100,220,420],x:220,y:572,ally:2}
];
/* ogni edificio disegnato sulla mappa è un lotto acquistabile */
const LOT_KIND={barca:{n:'Barca',cost:280,w:40,h:20},rifugio:{n:'Rifugio',cost:260,w:36,h:30},palazzo:{n:'Palazzo',cost:450,w:40,h:34},villetta:{n:'Villetta',cost:320,w:30,h:28},campo:{n:'Campo',cost:220,w:60,h:46},casale:{n:'Casale',cost:300,w:44,h:32}};
const EXTRA_LOTS=[['rifugio','montagna',52,-58],['rifugio','montagna',126,-44],['rifugio','montagna',282,-60],['rifugio','montagna',356,-44],['barca','fiume',52,550],['barca','fiume',290,530],['barca','fiume',372,541]];
const LOTS=(()=>{
  const avoid=[[60,60],[330,48],[200,118],[92,262],[300,312],[200,352],[78,498],[300,478],[220,572],[134,168],[196,286],[330,580],[150,170],[74,480],[52,196],[62,416],[62,608],[300,205],[300,425],[200,140],[330,86]];
  const roadV=x=>Math.abs(x-196)<34, nearAv=(x,y,d)=>avoid.some(([ax,ay])=>Math.hypot(ax-x,ay-y)<d);
  const out=[];let n=0;const add=(kind,zone,x,y)=>{out.push({id:'b'+(n++),kind,zone,x,y,cost:LOT_KIND[kind].cost});};
  [30,76,122,262,308,358].forEach(x=>[40,96,152].forEach(y=>{if(!roadV(x)&&!nearAv(x,y,34)&&!(x>150&&x<250&&y>80&&y<150)&&!(y<60&&x<200))add('palazzo','centro',x,y);}));
  [24,66,108,150,244,286,328,370].forEach(x=>[240,348,392].forEach(y=>{if(!roadV(x)&&!nearAv(x,y,30))add('villetta','periferia',x,y);}));
  [44,128,272,352].forEach(x=>{if(!roadV(x)&&!nearAv(x,462,40))add('campo','campagna',x,462);});
  [24,110,268,364].forEach(x=>{if(!roadV(x)&&!nearAv(x,598,32))add('casale','campagna',x,598);});
  EXTRA_LOTS.forEach(([k,z,x,y])=>add(k,z,x,y));
  return out;
})();

const ZF={centro:1.2,periferia:1,campagna:.85,fiume:1,montagna:.9};
const BLD={
 caserma:{name:'Caserma dei carabinieri',ic:'🚓',col:'#2f5fb8',cost:600,eff:'Una pattuglia spazza una corsia e respinge l’orda (ogni 10, 8, 6 s)'},
 vvf:{name:'Caserma dei pompieri',ic:'🚒',col:'#e2702d',cost:550,eff:'Idranti su tutte le corsie (ogni 12, 10, 8 s)'},
 farmacia:{name:'Farmacia',ic:'💊',col:'#3f9b5f',cost:350,eff:'Cura la casa durante l’ondata (+8 per livello ogni 6 s)'},
 ospedale:{name:'Ospedale',ic:'🏥',col:'#d7263d',cost:800,eff:'Una volta per ondata salva la casa allo stremo (40, 55, 70%)'},
 ferramenta:{name:'Ferramenta',ic:'🔩',col:'#f7d64a',cost:300,eff:'Sconto del 10% per livello su casa e attrezzi'},
 supermercato:{name:'Supermercato',ic:'🛒',col:'#6fb59a',cost:400,eff:'+30 monete per livello a ogni ondata vinta'},
 palestra:{name:'Palestra rifugio',ic:'🏋️',col:'#8f86b8',cost:350,eff:'+30 resistenza della casa per livello'},
 radio:{name:'Stazione radio',ic:'📡',col:'#c9b8ff',cost:450,eff:'Attrezzi più rapidi: ricarica −8% per livello'},
 cabina:{name:'Cabina elettrica',ic:'⚡',col:'#f7d64a',cost:500,eff:'Scarica che stordisce l’orda (ogni 11, 9, 7 s)'},
 mercato:{name:'Mercato contadino',ic:'🧺',col:'#a8743a',cost:300,eff:'+8% monete per livello'}
};
const bLv=k=>Object.values(G.lots).filter(x=>x.kind==='bld'&&x.b===k).reduce((t,x)=>t+x.lv,0);
const disc=()=>Math.max(.6,1-bLv('ferramenta')*.1);

const TENANTS={
 mecc:{name:'Meccanico',ic:'🔧',col:'#7c8794',rent:20,eff:'Ripara la barricata durante l’ondata'},
 inf:{name:'Infermiera',ic:'✚',col:'#3f9b5f',rent:20,eff:'Rimette in sesto la casa durante l’ondata'},
 pomp:{name:'Pompiere',ic:'🚒',col:'#d7263d',rent:25,eff:'Getto d’acqua su una corsia a intervalli'},
 elet:{name:'Elettricista',ic:'⚡',col:'#f7d64a',rent:25,eff:'Scossa che blocca tutta l’orda per un attimo'},
 guard:{name:'Guardiano notturno',ic:'🔦',col:'#2f7fb8',rent:15,eff:'Alleato con fionda su una corsia'},
 orto:{name:'Ortolana',ic:'🥕',col:'#a8743a',rent:40,eff:'Non combatte, ma paga l’affitto più alto e +10% monete'}
};
const TOOLS=[
 {id:'petardo',name:'Petardo',ic:'💥',cd:12,unlock:0,up:[200,450],d:'Botto sulla corsia più affollata'},
 {id:'sirena',name:'Sirena',ic:'📢',cd:20,unlock:0,up:[220,480],d:'Tutta l’orda rallenta per qualche secondo'},
 {id:'idrante',name:'Idrante',ic:'🚿',cd:14,unlock:180,up:[260,520],d:'Getto potente: respinge una corsia e la blocca'},
 {id:'faro',name:'Faro accecante',ic:'🔆',cd:18,unlock:240,up:[300,560],d:'Lampo che stordisce tutti gli zombie'},
 {id:'rete',name:'Rete da pesca',ic:'🕸️',cd:16,unlock:220,up:[280,540],d:'Impiglia il primo zombie di ogni corsia'},
 {id:'fumo',name:'Fumogeno colorato',ic:'🌫️',cd:15,unlock:200,up:[260,500],d:'Una corsia perde la strada e torna indietro'},
 {id:'stereo',name:'Stereo a palla',ic:'🎵',cd:24,unlock:320,up:[360,640],d:'Musica a tutto volume: l’orda si ferma a ballare'}
];
/* ---------- social (demo: amici simulati) ---------- */
const FRIENDS0=[
 {id:'f1',nick:'luna_rossa',role:'inf',lv:12,on:true,col:'#d7263d'},
 {id:'f2',nick:'ilfabbro',role:'mecc',lv:8,on:false,col:'#7c8794'},
 {id:'f3',nick:'zia_pina',role:'orto',lv:15,on:true,col:'#a8743a'},
 {id:'f4',nick:'vedetta',role:'guard',lv:5,on:false,col:'#2f7fb8'}
];
const ROLE_LINE={mecc:'hai rimesso in piedi la barricata',inf:'hai curato la casa',pomp:'hai respinto l’orda con l’idrante',elet:'hai fermato l’orda con una scossa',guard:'hai fatto la guardia tutta la notte',orto:'hai sfamato il quartiere'};
const fLv=f=>Math.min(3,1+Math.floor(f.lv/6));
function socialInit(){
  G.friends=FRIENDS0.map(f=>({...f}));G.req=[{id:'f5',nick:'cascinaz',role:'pomp',lv:9,col:'#3f9b5f'}];
  G.me={nick:'tu',role:null};G.gifts=[{from:'luna_rossa',what:'coins',n:80},{from:'zia_pina',what:'gems',n:5}];
  G.event={name:'Notte collettiva',goal:3000,prog:1140,claimed:false};
  G.hosts=[{fid:'f1'},{fid:'f3'}];
  G.help=[{fid:'f2',lvl:9}];G.famOut=null;G.famIn={};
}
const PACKS=[
 {id:'p1',name:'Sacchetto di monete',give:{coins:500},price:'0,99 €',d:'500 monete'},
 {id:'p2',name:'Scrigno di gemme',give:{gems:60},price:'1,99 €',d:'60 gemme'},
 {id:'p3',name:'Pacchetto Superstite',give:{coins:1500,gems:100},price:'4,99 €',d:'1.500 monete + 100 gemme'}
];
const DIFF={normale:{n:'Normale',hp:1,cnt:1,sp:1,coin:1},difficile:{n:'Difficile',hp:1.35,cnt:1.15,sp:1.08,coin:1.3},incubo:{n:'Incubo',hp:1.8,cnt:1.3,sp:1.18,coin:1.7}};
const MEDALS=[
 {id:'primo',ic:'👋',n:'Primo scacciato',d:'Scaccia il primo zombie',g:5},
 {id:'combo20',ic:'🔥',n:'Mani di fulmine',d:'Fai una combo da 20',g:10},
 {id:'perfetto',ic:'🛡️',n:'Senza un graffio',d:'Vinci un’ondata con la casa intatta',g:10},
 {id:'boss',ic:'👑',n:'Il boss se ne va',d:'Scaccia un boss',g:20},
 {id:'oro',ic:'✨',n:'Zombie d’oro',d:'Scaccia lo zombie d’oro prima che scappi',g:8},
 {id:'buio',ic:'🌑',n:'Occhi nel buio',d:'Vinci un’ondata durante il blackout',g:10},
 {id:'cassa',ic:'📦',n:'Pacco dal cielo',d:'Apri una cassa di rifornimenti',g:5},
 {id:'ondata10',ic:'🏆',n:'Veterano',d:'Supera l’ondata 10',g:25},
 {id:'incubo',ic:'💀',n:'Notte da incubo',d:'Vinci un’ondata in modalità Incubo',g:15}
];
const EVENTS={blackout:{n:'Blackout!',d:'Salta la corrente: vedi solo dove tocchi.'},nebbia:{n:'Nebbia fitta',d:'L’orda sbuca all’ultimo momento.'},luna:{n:'Luna rossa',d:'Zombie più veloci, monete doppie.'},pioggia:{n:'Temporale',d:'Il fango rallenta l’orda.'}};
const ZT={walker:{hp:4,sp:16,dps:6,c:2,s:.5,name:'Vagante'},casco:{hp:6,sp:14,dps:6,c:4,s:.52,name:'Col casco',armor:.5},strillone:{hp:4,sp:15,dps:4,c:4,s:.5,name:'Strillone'},scavatore:{hp:5,sp:22,dps:7,c:5,s:.5,name:'Scavatore'},oro:{hp:3,sp:48,dps:0,c:0,s:.46,name:'Zombie d’oro'},boss:{hp:70,sp:7,dps:22,c:60,s:.95,name:'Il Bruto della Sagra'},runner:{hp:2,sp:32,dps:3,c:3,s:.46,name:'Corridore'},brute:{hp:11,sp:9,dps:12,c:8,s:.72,name:'Bruto'}};
const G={diff:'difficile',med:{},type:null,level:1,coins:0,gems:0,best:0,h:{},q:{},lots:{},tools:{},sel:null,run:null,view:'hub',pickT:null};

/* ---------- effetti sonori sintetizzati (nessun file audio) ---------- */
function sfx(k){if(G.mute)return;try{const c=audioCtx();if(!c)return;const t=c.currentTime;
  const tone=(f,d,type='square',v=.06,f2)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+d);};
  const noise=(d,v=.12)=>{const b=c.createBuffer(1,c.sampleRate*d,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=v;s.connect(g);g.connect(AUD.master);s.start(t);};
  if(k==='tap')tone(320+Math.random()*80,.08,'square',.05,160);
  if(k==='poof')tone(500,.18,'triangle',.05,900);
  if(k==='coin'){tone(988,.07,'square',.035);setTimeout(()=>tone(1319,.12,'square',.035),60);}
  if(k==='boom'){noise(.4,.22);tone(120,.35,'sine',.12,40);}
  if(k==='horn'){tone(110,.6,'sawtooth',.05,90);tone(165,.6,'sawtooth',.03,140);}
  if(k==='win'){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.18,'square',.045),i*110));}
  if(k==='lose'){[392,330,262,196].forEach((f,i)=>setTimeout(()=>tone(f,.25,'triangle',.06),i*150));}
  if(k==='crack')noise(.15,.15);
}catch(e){}}

/* ---------- arte del gioco ---------- */
const NEWTYPES=['residence','attico','loft','bifamiliare','ringhiera','faro','trullo','albero'];
function gHouse(type,h){if(NEWTYPES.includes(type)&&typeof custHouseSVG==='function'){const P=h.porta||0,Gr=h.grate||0,L=h.luci||0,M=h.muro||0,V=h.vedetta||0,E=h.energia||0;
    const c={colore:'#4b3f7a',porta:['legno','blindata','acciaio'][Math.min(2,P)],finestre:Gr>=2?'scuri':Gr?'grate':'vetro',luci:L>=2?'fari':L?'lanterna':'nessuna',recinzione:M>=2?'muro':M?'palizzata':'rete',tetto:V?'torretta':E>=2?'solare':'tegole'};
    return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 0 132 220" width="132" height="220"><svg x="-14" y="56" width="160" height="164" viewBox="0 0 160 180" preserveAspectRatio="xMidYMax meet">${custHouseSVG(type,c,160,180).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg></svg>`;}
  return gHouse0(type,h);}
function gHouse0(type,h){
  const P=h.porta||0,Gr=h.grate||0,L=h.luci||0,E=h.energia||0,V=h.vedetta||0;
  const door=['#8a5a34','#7c8794','#4a5260'][P];
  const glass=Gr>=2?'#9aa4b0':'#f7d64a';
  const w=(x,y,ww=22,hh=22)=>`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${glass}"/>${Gr>=2?[4,8,12,16].map(o=>`<path d="M${x} ${y+o}H${x+ww}" stroke-width="1.2"/>`).join(''):`<path d="M${x+ww/2} ${y}V${y+hh}M${x} ${y+hh/2}H${x+ww}" stroke-width="1.6"/>`}${Gr>=1?[4,10,16].map(o=>`<path d="M${x+o+1} ${y-2}V${y+hh+2}" stroke-width="2.5"/>`).join(''):''}`;
  const roofExtras=(rx,ry)=>`${E===2?`<path d="M${rx} ${ry} l26 -16 l10 6 l-26 16z" fill="#2f7fb8" stroke-width="2"/>`:''}${V>=1?`<g><rect x="${rx+44}" y="${ry-30}" width="16" height="14" fill="#8a5a34"/><path d="M${rx+40} ${ry-30} L${rx+52} ${ry-40} L${rx+64} ${ry-30}Z" fill="#d7263d"/>${V===2?`<path d="M${rx+60} ${ry-24} L${rx+100} ${ry-40} L${rx+100} ${ry-8}Z" fill="#f7d64a" opacity=".5" stroke="none"/>`:''}</g>`:''}`;
  const lamp=L>=1?`<circle cx="104" cy="150" r="${L===2?14:9}" fill="url(#glowgh)" stroke="none"/><rect x="100" y="146" width="8" height="7" fill="#f7d64a" stroke-width="2"/>`:'';
  const gen=E===1?`<rect x="2" y="196" width="22" height="18" fill="#f7d64a" stroke-width="2"/>`:'';
  let body='';
  if(type==='apt')body=`<rect x="14" y="30" width="96" height="184" fill="#8f86b8"/><rect x="14" y="30" width="96" height="184" fill="url(#htgh)"/>
    ${[44,86,128].map(y=>w(24,y)+w(78,y)+`<rect x="20" y="${y+24}" width="34" height="5" fill="#cfc6e6"/>`).join('')}
    <rect x="12" y="24" width="100" height="8" fill="#2b2240"/>${roofExtras(30,24)}
    <rect x="46" y="172" width="32" height="42" fill="${door}"/>${P>=1?'<path d="M50 182H74M50 196H74" stroke-width="2"/>':''}`;
  else if(type==='schiera')body=`<rect x="0" y="96" width="18" height="118" fill="#5d5190"/><rect x="18" y="96" width="78" height="118" fill="#6f5fa8"/><rect x="96" y="96" width="18" height="118" fill="#5d5190"/>
    <path d="M-4 100 L57 52 L118 100Z" fill="#d7263d"/>${roofExtras(30,92)}${w(26,112)}${w(62,112)}${w(26,158)}
    <rect x="60" y="164" width="26" height="50" fill="${door}"/>${P>=1?'<path d="M63 176H83M63 190H83" stroke-width="2"/>':''}`;
  else if(type==='villa')body=`<rect x="8" y="96" width="104" height="118" fill="#4b3f7a"/><rect x="8" y="96" width="104" height="118" fill="url(#htgh)"/>
    <path d="M-2 100 L60 46 L122 100Z" fill="#d7263d"/><rect x="82" y="56" width="14" height="30" fill="#4b3f7a"/>${roofExtras(16,94)}
    ${w(20,110)}${w(78,110)}${w(20,158)}${w(78,158)}<rect x="48" y="162" width="24" height="52" fill="${door}"/>${P>=1?'<path d="M51 174H69M51 188H69" stroke-width="2"/>':''}`;
  else if(type==='barca')body=`<rect x="-6" y="196" width="132" height="24" fill="#2f7fb8"/><path d="M-6 200 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#9fd3e6" stroke-width="2"/>
    <path d="M0 168 H120 L110 200 H10Z" fill="#d7263d"/><path d="M4 176 H116" stroke-width="2"/>
    <rect x="14" y="110" width="92" height="58" fill="#f3e9d2"/><path d="M8 112 L60 84 L112 112Z" fill="#2f7fb8"/>${roofExtras(20,106)}
    ${w(22,124,18,18)}${w(80,124,18,18)}<rect x="48" y="128" width="22" height="40" fill="${door}"/>${P>=1?'<path d="M50 140H68M50 154H68" stroke-width="2"/>':''}
    <circle cx="104" cy="186" r="5" fill="#fff"/><path d="M104 181 V191 M99 186 H109" stroke-width="1.5"/>`;
  else if(type==='rifugio')body=`<rect x="6" y="150" width="108" height="64" fill="#9aa4b0"/>${[160,172,184,196,208].map((y,i)=>`<path d="M6 ${y} H114" stroke-width="1.2"/>`).join('')}
    <rect x="10" y="104" width="100" height="46" fill="#8a5a34"/>${[112,120,128,136,144].map(y=>`<path d="M10 ${y} H110" stroke-width="1"/>`).join('')}
    <path d="M-6 108 L60 44 L126 108Z" fill="#6b2b23"/><path d="M14 90 L60 46 L106 90 L96 86 L60 54 L24 86Z" fill="#fff" stroke-width="2"/>${roofExtras(16,100)}
    <rect x="86" y="56" width="14" height="30" fill="#9aa4b0"/>${w(18,116,20,20)}${w(80,116,20,20)}<rect x="46" y="164" width="28" height="50" fill="${door}"/>${P>=1?'<path d="M49 176H71M49 190H71" stroke-width="2"/>':''}
    <path d="M-6 214 H126" stroke-width="3"/><rect x="92" y="186" width="20" height="28" fill="#c9a36b"/>${[0,1,2].map(r_=>`<circle cx="${96+r_*6}" cy="${206}" r="3" fill="#a8743a" stroke-width="1"/>`).join('')}`;
  else if(type==='camper')body=`<rect x="0" y="120" width="116" height="78" rx="10" fill="#f3e9d2"/><path d="M0 150 H116" stroke="#d7263d" stroke-width="8"/>
    <rect x="80" y="104" width="34" height="20" fill="#f3e9d2"/>${w(10,128,26,18)}${w(84,128,22,18)}${roofExtras(4,118)}
    <rect x="46" y="128" width="26" height="62" fill="${door}"/>${P>=1?'<path d="M48 140H70M48 156H70" stroke-width="2"/>':''}
    <circle cx="24" cy="204" r="12" fill="#2b2240"/><circle cx="94" cy="204" r="12" fill="#2b2240"/><circle cx="24" cy="204" r="4" fill="#cfc6e6"/><circle cx="94" cy="204" r="4" fill="#cfc6e6"/>`;
  else body=`<rect x="4" y="100" width="110" height="114" fill="#c9a36b"/><rect x="4" y="100" width="110" height="114" fill="url(#brickgh)" opacity=".35"/>
    <path d="M-6 104 L60 58 L124 104Z" fill="#a8473a"/>${roofExtras(14,98)}${w(14,116)}${w(80,116)}
    <rect x="40" y="152" width="40" height="62" fill="${door}"/><path d="M40 152 L80 214 M80 152 L40 214" stroke-width="2"/>`;
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 0 132 220" width="264" height="440">${defs('gh')}<g stroke="${INK}" stroke-width="3" stroke-linejoin="round">${body}${lamp}${gen}</g></svg>`;
}
function barrierSVG(lv){
  const fill=lv===0?`<rect x="0" y="10" width="40" height="30" fill="url(#meshb)" stroke="#c9c2b0"/>${[0,13,26,39].map(x=>`<path d="M${x} 6V40" stroke-width="3"/>`).join('')}`
   :lv===1?`${[2,9,16,23,30,37].map(x=>`<path d="M${x} 40V10 l2 -6 l2 6" fill="#7c8794" stroke-width="2.5"/>`).join('')}<path d="M0 18H42M0 32H42"/>`
   :`<rect x="0" y="${lv===3?2:10}" width="42" height="${lv===3?38:30}" fill="url(#brickb)"/>${lv===3?'<path d="M0 2 H42 M6 2 V-4 M20 2 V-4 M34 2 V-4" stroke-width="3"/>':''}`;
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -6 46 48" width="92" height="96">${defs('b')}<g stroke="${INK}" stroke-width="3">${fill}</g></svg>`;
}
function bgSVG(zone){
  let back='';const r=rng(zone.length*99);
  if(zone==='centro'){let x=-4;while(x<484){const w=28+r()*30,h=50+r()*70;back+=`<rect x="${x}" y="${128-h}" width="${w}" height="${h}" fill="#33276a" stroke="${INK}" stroke-width="2.5"/>`+Array.from({length:Math.floor(h/16)},(_,k)=>r()<.4?`<rect x="${x+6}" y="${128-h+6+k*16}" width="6" height="7" fill="#f7d64a"/>`:'').join('');x+=w+3;}}
  else if(zone==='periferia'){for(let x=-10;x<480;x+=64){back+=`<g stroke="${INK}" stroke-width="2.5"><path d="M${x} 128 V96 L${x+24} 78 L${x+48} 96 V128Z" fill="#33276a"/><rect x="${x+16}" y="104" width="12" height="12" fill="${r()<.5?'#f7d64a':'#1d1640'}"/></g>`;}back+=`<path d="M0 128 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 q20 -20 40 0 V130H0Z" fill="#2f6b45" stroke="${INK}" stroke-width="2.5"/>`;}
  else if(zone==='fiume'){back=`<rect x="0" y="96" width="480" height="34" fill="#2f7fb8"/><path d="M0 104 q12 -5 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#9fd3e6" stroke-width="2"/>
    ${[40,170,330].map(x=>`<g stroke="${INK}" stroke-width="2.5"><path d="M${x} 112 h60 l-8 12 h-44z" fill="#d7263d"/><rect x="${x+14}" y="94" width="30" height="18" fill="#f3e9d2"/></g>`).join('')}
    ${Array.from({length:14},(_,i)=>`<path d="M${i*36+8} 96 q4 -18 0 -30 M${i*36+14} 96 q-4 -14 2 -24" stroke="#3f6b4f" stroke-width="3" fill="none"/>`).join('')}`;}
  else if(zone==='montagna'){back=`<path d="M-10 130 L60 40 L120 100 L190 20 L270 110 L340 30 L420 104 L490 50 V130Z" fill="#6b6478" stroke="${INK}" stroke-width="2.5"/>
    <path d="M40 66 L60 40 L82 66 L70 60 L60 70 L50 60Z M170 46 L190 20 L212 46 L200 40 L190 50 L180 40Z M320 56 L340 30 L362 56 L350 50 L340 60 L330 50Z" fill="#fff" stroke="${INK}" stroke-width="2"/>
    ${Array.from({length:12},(_,i)=>{const x=i*42+10;return`<path d="M${x} 130 l12 -34 l12 34z" fill="#2f6b45" stroke="${INK}" stroke-width="2"/>`;}).join('')}`;}
  else{back=`<path d="M-10 128 Q120 70 260 110 T490 96 V130H-10Z" fill="#3a5a3a" stroke="${INK}" stroke-width="2.5"/><g stroke="${INK}" stroke-width="2.5"><rect x="330" y="80" width="58" height="48" fill="#a8473a"/><path d="M324 84 L359 58 L394 84Z" fill="#6b2b23"/><rect x="350" y="100" width="18" height="28" fill="#2b2240"/><path d="M200 128 q18 -40 36 0Z" fill="#d8c27a"/><path d="M420 128 q14 -30 28 0Z" fill="#d8c27a"/></g>`;}
  const laneCol=zone==='centro'?['#6b6478','#5d5670','#6b6478']:zone==='periferia'?['#3b5a3b','#6b6478','#3b5a3b']:zone==='fiume'?['#8a5a34','#2f6fa0','#8a5a34']:zone==='montagna'?['#cfd5dc','#8a8f99','#cfd5dc']:['#7a6a3a','#5f7a3a','#7a6a3a'];
  const lanes=[178,226,274].map((y,i)=>`<rect x="0" y="${y-30}" width="480" height="40" fill="${laneCol[i]}"/><path d="M0 ${y+10}H480" stroke="${INK}" stroke-width="2" opacity=".5"/>`).join('');
  return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="960" height="600">${defs('bg')}
   <rect width="480" height="300" fill="url(#skybg)"/><rect width="480" height="130" fill="url(#htlbg)"/><circle cx="420" cy="40" r="22" fill="#f7d64a" stroke="${INK}" stroke-width="3"/>
   ${back}<rect x="0" y="128" width="480" height="172" fill="#2a2a3a"/>${lanes}<rect x="0" y="128" width="480" height="172" fill="url(#htbg)" opacity=".5"/></svg>`;
}
function svgImage(markup){return new Promise(ok=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>ok(null);im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup);});}
const spr=(inner,vb,w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner}</svg>`;

/* ---------- mappa del quartiere fittizio ---------- */
function hoodSVG(){
  const W=400,H=680,TOP=120;const r=rng(11);
  const lvStars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
  const myPos=(G.type==='camper'?[250,600]:HOME_POS[HTYPES[G.type].zone]);
  let deco='';
  if(false)for(let i=0;i<14;i++){const x=10+(i%7)*55+r()*6,y=12+Math.floor(i/7)*74+r()*8;if(Math.hypot(x-200,y-120)<40)continue;deco+=`<rect x="${x}" y="${y}" width="40" height="${30+r()*14}" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M${x+8} ${y+8}h4M${x+20} ${y+8}h4M${x+8} ${y+18}h4M${x+20} ${y+18}h4M${x+8} ${y+28}h4" stroke="${INK}" stroke-width="2.5"/>`;}
  deco+=`<rect x="170" y="96" width="60" height="44" fill="#e8dcbf" stroke="${INK}" stroke-width="2"/><text x="200" y="146" text-anchor="middle" font-family="Bangers,Impact" font-size="9" fill="${INK}">PIAZZA</text>`;
  if(false)for(let i=0;i<16;i++){const x=16+(i%6)*64+r()*8,y=222+Math.floor(i/6)*66+r()*8;deco+=`<g stroke="${INK}" stroke-width="2"><rect x="${x}" y="${y+10}" width="26" height="18" fill="#fff"/><path d="M${x-2} ${y+12} L${x+13} ${y} L${x+28} ${y+12}Z" fill="#d7263d"/></g>`;}
  if(false)for(let i=0;i<9;i++){const x=12+(i%5)*78,y=440+Math.floor(i/5)*84;deco+=`<rect x="${x}" y="${y}" width="62" height="58" fill="${i%2?'#d8c27a':'#a9c98a'}" stroke="${INK}" stroke-width="2"/>${[10,20,30,40,50].map(o=>`<path d="M${x+4} ${y+o}H${x+58}" stroke="${INK}" stroke-width="1" opacity=".3"/>`).join('')}`;}
  for(let i=0;i<10;i++)deco+=`<circle cx="${20+r()*360}" cy="${440+r()*170}" r="${7+r()*5}" fill="#4f8f5f" stroke="${INK}" stroke-width="2"/>`;
  const roads=`<path d="M0 205 H${W} M0 425 H${W} M196 0 V${H} M0 312 Q120 300 196 312 T${W} 300 M196 520 Q300 500 ${W} 470" stroke="#f3e9d2" stroke-width="16" fill="none"/><path d="M0 205 H${W} M0 425 H${W} M196 0 V${H}" stroke="${INK}" stroke-width="2" stroke-dasharray="6 6" fill="none" opacity=".4"/>
   <path d="M-10 560 C80 520 140 600 220 560 S340 500 410 540" stroke="${INK}" stroke-width="20" fill="none"/><path d="M-10 560 C80 520 140 600 220 560 S340 500 410 540" stroke="#6fa8dc" stroke-width="14" fill="none"/>`;
  const zones=`<rect width="${W}" height="205" fill="#cfc6e6" opacity=".55"/><rect y="205" width="${W}" height="220" fill="#cfe6c5" opacity=".5"/><rect y="425" width="${W}" height="${H-425}" fill="#f0dc9a" opacity=".55"/>`;
  const slots=SLOTS.map(s=>{const lv=G.q[s.id]||0;const on=G.sel===s.id;
    return`<g class="slot" data-slot="${s.id}" style="cursor:pointer" role="button" aria-label="${s.name}, livello ${lv}">
      <circle cx="${s.x}" cy="${s.y}" r="${on?20:17}" fill="${lv?'#f7d64a':'#fff'}" stroke="${on?'#d7263d':INK}" stroke-width="${on?4:3}"/>
      <text x="${s.x}" y="${s.y+5}" text-anchor="middle" font-family="Bangers,Impact" font-size="15" fill="${INK}">${lv?['','I','II','III'][lv]:'+'}</text>
      <text x="${s.x}" y="${s.y+32}" text-anchor="middle" font-size="9" fill="#f7d64a" stroke="${INK}" stroke-width=".6">${lvStars(lv)}</text></g>`;}).join('');
  const bArt=(l,own)=>{const K=LOT_KIND[l.kind],x=l.x,y=l.y,w=K.w,h=K.h;const st=`stroke="${own?'#f7d64a':INK}" stroke-width="${own?3.5:2}"`;
    if(l.kind==='palazzo')return`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="#fff" ${st}/>${[0,1,2].map(r_=>`<path d="M${x-12} ${y-h/2+8+r_*9}h5M${x-2} ${y-h/2+8+r_*9}h5M${x+8} ${y-h/2+8+r_*9}h5" stroke="${INK}" stroke-width="2.5"/>`).join('')}`;
    if(l.kind==='villetta')return`<rect x="${x-12}" y="${y-4}" width="24" height="16" fill="#fff" ${st}/><path d="M${x-15} ${y-2} L${x} ${y-15} L${x+15} ${y-2}Z" fill="#d7263d" ${st}/>`;
    if(l.kind==='barca')return`<path d="M${x-20} ${y} H${x+20} L${x+14} ${y+10} H${x-14}Z" fill="#d7263d" ${st}/><rect x="${x-10}" y="${y-10}" width="20" height="10" fill="#f3e9d2" ${st}/>`;
    if(l.kind==='rifugio')return`<rect x="${x-14}" y="${y-4}" width="28" height="16" fill="#8a5a34" ${st}/><path d="M${x-18} ${y-2} L${x} ${y-18} L${x+18} ${y-2}Z" fill="#fff" ${st}/>`;
    if(l.kind==='campo')return`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="${l.x%2?'#d8c27a':'#a9c98a'}" ${st}/>${[8,16,24,32,40].map(o=>`<path d="M${x-w/2+4} ${y-h/2+o}H${x+w/2-4}" stroke="${INK}" stroke-width="1" opacity=".35"/>`).join('')}`;
    return`<rect x="${x-20}" y="${y-8}" width="40" height="22" fill="#c9a36b" ${st}/><path d="M${x-24} ${y-8} L${x} ${y-22} L${x+24} ${y-8}Z" fill="#a8473a" ${st}/><rect x="${x-5}" y="${y+2}" width="10" height="12" fill="#2b2240"/>`;};
  const lots=LOTS.map(l=>{const b=G.lots[l.id];const on=G.sel===l.id;const K=LOT_KIND[l.kind];
    const top=l.y-(l.kind==='villetta'?16:l.kind==='casale'?22:K.h/2);
    if(!b)return`<g class="slot lotb" data-lot="${l.id}" style="cursor:pointer" role="button" aria-label="${K.n} in vendita, ${l.cost} monete">${bArt(l,false)}<circle cx="${l.x+K.w/2-2}" cy="${top+2}" r="6.5" fill="#f7d64a" stroke="${INK}" stroke-width="1.6"/><text x="${l.x+K.w/2-2}" y="${top+5}" text-anchor="middle" font-family="Bangers,Impact" font-size="9" fill="${INK}">€</text></g>`;
    let badge='',label='';
    if(b.kind==='bld'){const B=BLD[b.b];badge=`<rect x="${l.x-11}" y="${top-14}" width="22" height="20" fill="${B.col}" stroke="${INK}" stroke-width="2"/><text x="${l.x}" y="${top+1}" text-anchor="middle" font-size="12">${B.ic}</text>`;}
    else{const t=tenOf(b);
      if(!t){badge=`<circle cx="${l.x}" cy="${top-4}" r="9" fill="#fff" stroke="${INK}" stroke-width="2"/><text x="${l.x}" y="${top}" text-anchor="middle" font-family="Bangers,Impact" font-size="11" fill="${INK}">?</text>`;label=`<rect x="${l.x-18}" y="${l.y+K.h/2+2}" width="36" height="11" fill="#d7263d" stroke="${INK}" stroke-width="1.4"/><text x="${l.x}" y="${l.y+K.h/2+10.5}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff">VUOTA</text>`;}
      else if(t.type==='friend'){badge=`<circle cx="${l.x}" cy="${top-4}" r="10" fill="${t.f.col}" stroke="${INK}" stroke-width="2"/><text x="${l.x}" y="${top}" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="#fff">${t.f.nick[0].toUpperCase()}</text>`;const lab='@'+t.f.nick;label=`<rect x="${l.x-26}" y="${l.y+K.h/2+2}" width="52" height="11" fill="#fff" stroke="${INK}" stroke-width="1.4"/><text x="${l.x}" y="${l.y+K.h/2+10.5}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${INK}" textLength="${Math.min(48,lab.length*4.6)}" lengthAdjust="spacingAndGlyphs">${lab}</text>`;}
      else badge=`<circle cx="${l.x}" cy="${top-4}" r="10" fill="${TENANTS[t.role].col}" stroke="${INK}" stroke-width="2"/><text x="${l.x}" y="${top}" text-anchor="middle" font-size="11">${TENANTS[t.role].ic}</text>`;}
    return`<g class="slot" data-lot="${l.id}" style="cursor:pointer" role="button" aria-label="Tua proprietà">${on?`<circle cx="${l.x}" cy="${l.y}" r="${K.w/2+10}" fill="#f7d64a" opacity=".35"/>`:''}${bArt(l,true)}${badge}${label}</g>`;}).join('');
  const r3=rng(23);
  const marks=`${mLandmark('chiesa',150,170)}
   <g stroke="${INK}" stroke-width="2.2"><rect x="318" y="40" width="10" height="34" fill="#cfc6e6"/><rect x="332" y="40" width="10" height="34" fill="#cfc6e6"/><ellipse cx="330" cy="30" rx="22" ry="12" fill="#6fa8dc"/><path d="M308 30 V22 Q330 10 352 22 V30"/></g>${mBanner(330,86,'ACQUEDOTTO')}
   ${[30,60,90].map(x=>`<g stroke="${INK}" stroke-width="2"><path d="M${x} 90 V64 h8"/><circle cx="${x+9}" cy="66" r="4" fill="#f7d64a"/></g><circle cx="${x+9}" cy="68" r="14" fill="#f7d64a" opacity=".2"/>`).join('')}
   <g stroke="${INK}" stroke-width="2.2"><circle cx="200" cy="352" r="26" fill="#a9d18e"/><circle cx="200" cy="352" r="10" fill="#6fa8dc"/><path d="M200 342 V332" stroke="#9fd3e6" stroke-width="3"/></g>
   <g stroke="${INK}" stroke-width="2.2"><rect x="52" y="470" width="44" height="26" fill="#a8473a"/><path d="M48 472 L74 452 L100 472Z" fill="#6b2b23"/><rect x="66" y="480" width="14" height="16" fill="#2b2240"/></g>
   ${mBanner(200,140,'PIAZZA GRANDE')}${mBanner(300,205,'VIA ROMA')}${mBanner(300,425,'VIALE DEI TIGLI')}${mBanner(196,470,'STRADA ARGINE',-90)}`;
  const cem=`<rect y="620" width="${W}" height="60" fill="#3b3550"/><rect y="620" width="${W}" height="60" fill="url(#hthd)" opacity=".6"/>
   ${Array.from({length:16},(_,i)=>{const x=14+i*24+r3()*6,y=642+r3()*20;return`<g stroke="${INK}" stroke-width="2"><path d="M${x} ${y+14} V${y} q8 -10 16 0 V${y+14}Z" fill="#9aa4b0"/><path d="M${x+8} ${y+2} v7 M${x+5} ${y+5} h6" stroke-width="1.5"/></g>`;}).join('')}
   ${[60,180,300].map(x=>`<g stroke="${INK}" stroke-width="2"><path d="M${x} 680 l2 -12 l3 6 l3 -9 l3 8 l3 -6 l1 13Z" fill="#6fb59a"/></g>`).join('')}
   ${mFog(4,r3,W,40).replace(/cy="(\d+(\.\d+)?)"/g,(m,v)=>`cy="${640+(+v)}"`)}
   ${mBanner(200,630,'VECCHIO CIMITERO: QUI NASCE L’ORDA',0,9)}
   <path d="M196 620 V560" stroke="#d7263d" stroke-width="3" stroke-dasharray="8 6" fill="none"/><path d="M190 566 L196 554 L202 566Z" fill="#d7263d"/>
   <path d="M60 620 Q40 560 30 470" stroke="#d7263d" stroke-width="3" stroke-dasharray="8 6" fill="none"/><path d="M24 478 L30 466 L37 477Z" fill="#d7263d"/>
   <path d="M360 620 Q380 560 390 470" stroke="#d7263d" stroke-width="3" stroke-dasharray="8 6" fill="none"/><path d="M384 477 L390 465 L396 478Z" fill="#d7263d"/>`;
  const nightH=`<rect width="${W}" height="620" fill="#241a4a" opacity=".22"/>${Array.from({length:40},()=>`<rect x="${10+r3()*380}" y="${10+r3()*400}" width="3.5" height="3.5" fill="#f7d64a"/>`).join('')}${mFog(5,r3,W,600)}`;
  const mtn=`<rect y="${-TOP}" width="${W}" height="${TOP}" fill="#dfe7ee"/><rect y="${-TOP}" width="${W}" height="${TOP}" fill="url(#hthd)" opacity=".5"/>
   <path d="M0 -6 L40 -70 L80 -30 L130 -100 L180 -40 L230 -90 L280 -36 L330 -96 L380 -40 L400 -60 V0 H0Z" fill="#9aa4b0" stroke="${INK}" stroke-width="2.5"/>
   <path d="M118 -82 L130 -100 L143 -82 L136 -86 L130 -80 L124 -86Z M218 -72 L230 -90 L243 -72 L236 -76 L230 -70 L224 -76Z M318 -78 L330 -96 L343 -78 L336 -82 L330 -76 L324 -82Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
   ${Array.from({length:14},(_,i)=>{const x=10+i*28+r()*8;return`<path d="M${x} -2 l8 -22 l8 22z" fill="#2f6b45" stroke="${INK}" stroke-width="1.6"/>`;}).join('')}
   <path d="M196 0 Q170 -40 210 -70 T200 -118" stroke="#f3e9d2" stroke-width="10" fill="none"/><path d="M196 0 Q170 -40 210 -70 T200 -118" stroke="${INK}" stroke-width="1.5" stroke-dasharray="5 5" fill="none" opacity=".5"/>`;
  return`<svg viewBox="0 ${-TOP} ${W} ${H+TOP}" role="img" aria-label="Mappa del quartiere: montagna, centro, periferia, fiume e campagna">${defs('hd')}
   <rect y="${-TOP}" width="${W}" height="${H+TOP}" fill="#e8dcbf"/><rect y="${-TOP}" width="${W}" height="${H+TOP}" fill="url(#hthd)"/>${mtn}${zones}${deco}${roads}${marks}${nightH}${cem}
   ${mBanner(56,-10,"MONTAGNA",0,13)}${mBanner(52,196,"CENTRO",0,13)}${mBanner(62,416,"PERIFERIA",0,13)}${mBanner(62,608,"CAMPAGNA",0,13)}${mBanner(320,505,"PORTO SUL FIUME",0,9)}
   <g transform="translate(${myPos[0]} ${myPos[1]})" stroke="${INK}" stroke-width="3"><circle r="22" fill="#d7263d" opacity=".3" stroke="none"/><path d="M-14 12 V-4 L0 -16 L14 -4 V12Z" fill="#d7263d"/><text y="9" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="#fff" stroke="none">TU</text></g>
   ${lots}${slots}<g transform="translate(0 ${-TOP})">${mFrame(W,H+TOP,'IL TUO QUARTIERE')}</g></svg>`;
}

const hUp=id=>G.h[id]||0;
function upCost(list,id,lv){const it=list.find(x=>x.id===id);const c=it.cost[lv];if(c==null)return null;const sl=SLOTS.find(s=>s.id===id);return Math.round(c*(sl&&sl.ally!=null?HTYPES[G.type].ally:1));}
function houseMaxHP(){return HTYPES[G.type].hp+hUp('porta')*40+bLv('palestra')*30;}
function barrierMax(){return [60,120,200,300][hUp('muro')]+(G.q.rotonda||0)*50+(G.type==='casale'?-20:0);}
function startGame(type){G.type=type;G.level=1;G.coins=HTYPES[type].coins;G.gems=0;G.h={porta:0,grate:0,muro:0,luci:0,energia:0,vedetta:0,...HTYPES[type].start};G.q={};G.lots={};G.hoods=null;G.curHood=null;G.tools={petardo:1,sirena:1};socialInit();G.spins=1;G.scratch=1;G.perk={};G.wins=0;G.jar=null;G.lastDaily=null;luckInit();G.sel=null;applyViatico();(S.pend||[]).forEach(k=>{if(k==='spin')G.spins=(G.spins||0)+1;if(k==='gems')G.gems+=5;if(k==='coins')G.coins+=150;});S.pend=[];G.view='hub';renderOrda();}

function medal(id){if(G.med[id])return;const m=MEDALS.find(x=>x.id===id);if(!m)return;G.med[id]=true;G.gems+=m.g;G.scratch=(G.scratch||0)+1;toast(`🏅 Medaglia: ${m.n} (+${m.g} 💎)`);sfx('win');}
function renderOrda(){
  if(G.run){G.run.stop=true;G.run=null;}
  setMusic('app');
  document.body.classList.remove('inbattle');try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
  if(!G.type)return renderPick();
  if(G.view!=='battle')G.replay=null;
  if(G.view==='battle')return renderBattle();
  renderHub();
}
function renderPick(){
  const VT=viatico();
  const bar=(n)=>`<span class="pips">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`;
  app.innerHTML=`<div class="page">
   <div class="panel night" style="padding:0;overflow:hidden">${skyline()}</div>
   <h2>Orda</h2><p class="muted" style="margin:4px 0 14px">Il gioco a notti: difendi casa e quartiere con carte, trappole e strategia. Guadagna monete e fortifica tutto.</p>
   ${viaticoCard()}
   <h3 style="margin-bottom:10px">Scegli dove vivere</h3>
   ${Object.entries(HTYPES).map(([k,t])=>`<button class="panel pick ${VT&&VT.tipo===k?'mine':''}" data-type="${k}">${VT&&VT.tipo===k?'<span class="tag sp minetag">Come la tua casa</span>':''}
     <img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(gHouse(k,t.start))}">
     <div><div class="row spread"><b class="disp" style="font-size:24px">${t.name}</b><span class="tag">${t.zl}</span></div>
     <p style="font-weight:400;font-size:14px;margin:4px 0 6px">${t.pitch}</p>
     <div class="statgrid"><span>Resistenza</span>${bar(t.st[0])}<span>Spazio difese</span>${bar(t.st[1])}<span>Aiuto vicini</span>${bar(t.st[2])}<span>Forza orde</span>${bar(t.st[3])}</div></div></button>`).join('')}
  </div>`;
  app.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{vibe();startGame(b.dataset.type);});
  bindGo();const vo=$('#viaOn');if(vo)vo.onchange=()=>{S.useVia=vo.checked;renderPick();};
}
function renderHub(){try{return renderHubBase();}catch(e){console.warn('pagina Orda di base:',e);app.innerHTML='<div class="page"><div class="ohold" data-grp="q" hidden></div></div>';try{splitHub();}catch(x){console.warn(x);}}}
function renderHubBase(){
  if(!HTYPES[G.type])G.type=HTYPES.vera?'vera':Object.keys(HTYPES)[0]; /* telefono nuovo o dati cancellati: niente blocco */
  /* partita mai creata su questo account: creo solo i pezzi mancanti (senza toccare gemme, giri e premi) */
  if(G.level==null)G.level=1;if(G.coins==null)G.coins=0;if(G.gems==null)G.gems=0;
  if(!G.h)G.h={porta:0,grate:0,muro:0,luci:0,energia:0,vedetta:0,...((HTYPES[G.type]||{}).start||{})};G.q=G.q||{};G.lots=G.lots||{};G.tools=G.tools||{petardo:1,sirena:1};
  if(!G.friends||!G.me||!G.event)socialInit();G.perk=G.perk||{};G.med=G.med||{};G.wins=G.wins||0;try{luckInit();}catch(e){}
  dailyBonus();
  if(G.sub==='arena')return renderArena();
  const t=HTYPES[G.type];const sel=SLOTS.find(s=>s.id===G.sel);const selLot=LOTS.find(l=>l.id===G.sel);const rent=totalRent();
  app.innerHTML=`<div class="page">${orderSeg()}
   <div class="row spread" style="margin:10px 0"><div><h2>Livello ${G.level}</h2><small class="muted">${t.name} · ${t.zl}</small></div>
     <div class="wallet"><span>🪙 <b>${G.coins}</b></span><span>💎 <b>${G.gems}</b></span></div></div>
   ${dailyHTML()}
   <div class="seg diffseg" style="margin-bottom:8px">${Object.entries(DIFF).map(([k,d])=>`<button class="${G.diff===k?'on':''}" data-diff="${k}">${d.n}${k==='normale'?'':` · 🪙×${String(d.coin).replace('.',',')}`}</button>`).join('')}</div>
   <button class="btn wide" id="fight">Difendi il quartiere · ondata ${G.level}${G.level%5===0?' · BOSS':''}</button>
   <p class="muted" style="font-size:12px;margin:6px 0 10px">Da difendere: casa tua + ${Object.keys(G.lots).length} ${Object.keys(G.lots).length===1?'edificio':'edifici'}. Più edifici possiedi, più grande è l’orda: fortificali e addestra chi ci vive. Se ne perdi uno torni indietro di un livello.</p>
   <details class="howto"><summary>Medaglie (${Object.keys(G.med).length}/${MEDALS.length})</summary><div class="medals">${MEDALS.map(m=>`<div class="medal ${G.med[m.id]?'on':''}"><span>${G.med[m.id]?m.ic:'🔒'}</span><b>${m.n}</b><small>${m.d} · +${m.g} 💎</small></div>`).join('')}</div></details>
   <details class="howto"><summary>Bestiario: chi arriva di notte</summary><div class="medals">${[['🧟','Vagante','Lento ma ostinato'],['🏃','Corridore','Veloce, poca resistenza'],['💪','Bruto','Durissimo, dal livello 1 in campagna'],['⛑️','Col casco','Dimezza i tocchi finché il casco regge (dall’ondata 2)'],['📣','Strillone','Urla e fa infuriare chi gli sta vicino (dall’ondata 4)'],['⛏️','Scavatore','Scava sottoterra e sbuca davanti alla barricata: solo il petardo lo colpisce sotto (dall’ondata 6)'],['✨','Zombie d’oro','Attraversa di corsa: se lo prendi, 3 gemme'],['👑','Bruto della Sagra','Boss ogni 5 ondate: chiama rinforzi']].map(([i,n,d])=>`<div class="medal on"><span>${i}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div></details>
   <h3 style="margin:16px 0 8px">Il quartiere</h3>
   <div class="panel" style="padding:0;overflow:hidden"><div class="hood">${hoodSVG()}</div>
     <div class="legend"><span><i class="lg c"></i> punto da fortificare</span><span><i class="lg e">€</i> edificio in vendita</span><span><i class="lg h"></i> tue proprietà (bordo giallo)</span></div>
     <div class="mapinfo" id="slotinfo">${sel?slotCard(sel):'<span class="muted">Ogni edificio con il simbolo € si può comprare: palazzi, villette, campi e casali. I cerchi sono punti del quartiere da fortificare.</span>'}</div></div>
   <details class="howto" ${Object.keys(G.lots).length?'':'open'}><summary>Come funzionano case e inquilini</summary>
     <ol><li><b>Compra un edificio</b>: tocca un palazzo, una villetta, un campo o un casale con il simbolo €. Poi decidi l’uso: casa da affittare oppure servizio (farmacia, caserma…).</li>
     <li><b>Scegli chi ci abita</b>: un <b>amico vero</b> che usa l’app (ti aiuta con il suo ruolo e vi fate regali) oppure un <b>inquilino del gioco</b> (paga l’affitto).</li>
     <li><b>Gestisci</b>: dalla lista “Le tue proprietà” o toccando la casa sulla mappa cambi inquilino o ristrutturi. Dalla lista amici puoi anche premere “Dagli una casa”.</li></ol></details>
   <h3 style="margin:14px 0 8px">Le tue proprietà</h3>
   <div class="props">${propertiesHTML()}</div>

   <div class="row" style="gap:8px;margin-bottom:6px"><div class="stat"><b>${Object.keys(G.lots).length}/${LOTS.length}</b><small>edifici tuoi</small></div><div class="stat"><b>🪙 ${rent+friendBonus()+bLv('supermercato')*30}</b><small>entrate a ogni ondata vinta</small></div></div>
   ${sfideHTML()}
   ${luckHTML()}
   ${socialHTML()}
   <h3 style="margin:16px 0 8px">Attrezzi anti-zombie</h3>
   ${TOOLS.map(tl=>{const lv=G.tools[tl.id]||0;const c0=lv?tl.up[lv-1]:tl.unlock;const c=c0==null?null:Math.round(c0*disc());
     return`<div class="upg ${lv?'on':''}"><div><span class="tag ${lv?'ia':''}">${lv?'Livello '+lv:'Da sbloccare'}</span><br><b>${tl.ic} ${tl.name}</b><small>${tl.d} · ricarica ${Math.round(toolCd(tl,lv||1))} s</small></div>
     ${c!=null?`<button class="btn small ${lv?'':'alt'}" data-tool="${tl.id}" ${G.coins<c?'disabled':''}>${lv?'Migliora':'Sblocca'} 🪙 ${c}</button>`:'<span class="tag sp">MAX</span>'}</div>`;}).join('')}
   <h3 style="margin:16px 0 8px">La tua casa</h3>
   <div class="panel" style="display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:start">
     <img alt="La tua casa" style="width:110px;border:var(--line);background:#33276a" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(gHouse(G.type,G.h))}">
     <div><div class="stat" style="margin-bottom:6px"><b>${houseMaxHP()}</b><small>resistenza casa</small></div><div class="stat"><b>${barrierMax()}</b><small>barricata</small></div></div></div>
   ${HUP.map(u=>{const lv=hUp(u.id);const c=u.cost[lv]!=null?Math.round(u.cost[lv]*disc()):null;
     return`<div class="upg"><div><span class="tag">${u.lv[lv]}</span><br><b>${u.name}</b><small>${u.eff}${c!=null?` · prossimo: ${u.lv[lv+1]}`:' · al massimo'}</small></div>
     ${c!=null?`<button class="btn small" data-hup="${u.id}" ${G.coins<c?'disabled':''}>🪙 ${c}</button>`:'<span class="tag sp">MAX</span>'}</div>`;}).join('')}
   <h3 style="margin:16px 0 8px">Bottega</h3>
   <div class="notice" style="margin-bottom:10px">Acquisti in app simulati: in questa anteprima non si paga nulla. Nella versione negli store passano da Google Play e App Store.</div>
   ${PACKS.map(p=>`<div class="upg"><div><b>${p.name}</b><small>${p.d}</small></div><button class="btn small alt" data-pack="${p.id}">${p.price}</button></div>`).join('')}
   <div class="upg"><div><b>Cambia gemme</b><small>10 💎 = 250 🪙</small></div><button class="btn small ghost" id="swap" ${G.gems<10?'disabled':''}>Cambia</button></div>
   <div class="row spread" style="margin:14px 0"><small class="muted">Record: livello ${G.best||'-'}</small><button class="btn ghost small" id="restart">Cambia casa</button></div>
  </div>`;
  $('#fight').onclick=()=>{G.view='battle';renderOrda();};
  app.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{G.diff=b.dataset.diff;vibe();renderHub();});
  bindSocial(selLot);bindLuck();bindDaily();bindSfide();bindSeg();splitHub();
  app.querySelectorAll('[data-lot]').forEach(e=>e.onclick=()=>lotSheet(e.dataset.lot));
  app.querySelectorAll('[data-prop]').forEach(e=>e.onclick=()=>lotSheet(e.dataset.prop));
  app.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{const tl=TOOLS.find(x=>x.id===b.dataset.tool);const lv=G.tools[tl.id]||0;const c0=lv?tl.up[lv-1]:tl.unlock;const c=c0==null?null:Math.round(c0*disc());if(c==null||G.coins<c)return;G.coins-=c;G.tools[tl.id]=lv+1;vibe();toast(lv?`${tl.name} migliorato`:`${tl.name} sbloccato: lo trovi in battaglia`);renderHub();});
  app.querySelectorAll('[data-slot]').forEach(e=>e.onclick=()=>{G.sel=e.dataset.slot;vibe();renderHub();setTimeout(()=>$('#slotinfo').scrollIntoView({block:'nearest',behavior:'smooth'}),30);});
  app.querySelectorAll('[data-hup]').forEach(b=>b.onclick=()=>{const id=b.dataset.hup;const c=Math.round(HUP.find(x=>x.id===id).cost[hUp(id)]*disc());if(G.coins<c)return;G.coins-=c;G.h[id]=hUp(id)+1;vibe();toast('Casa rinforzata');renderHub();});
  app.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>{const p=PACKS.find(x=>x.id===b.dataset.pack);G.coins+=p.give.coins||0;G.gems+=p.give.gems||0;toast(`Acquisto simulato: ${p.d}`);renderHub();});
  $('#swap').onclick=()=>{if(G.gems<10)return;G.gems-=10;G.coins+=250;renderHub();};
  $('#restart').onclick=()=>{if(confirm('Ricominciare con un’altra casa? Perdi i progressi.')){G.type=null;renderOrda();}};
  const buy=$('#buySlot');if(buy)buy.onclick=()=>{const s=sel;const lv=G.q[s.id]||0;const c=upCost(SLOTS,s.id,lv);if(c==null||G.coins<c)return;G.coins-=c;G.q[s.id]=lv+1;vibe();toast(`${s.name}: livello ${lv+1}`);renderHub();};
}
function tenOf(b){if(!b||b.kind!=='house'||!b.ten)return null;
  if(b.ten.f){const f=G.friends.find(x=>x.id===b.ten.f);if(!f)return null;return{type:'friend',f,role:f.role,lv:fLv(f)};}
  return{type:'npc',role:b.ten.n,lv:b.lv};}
function lotRole(b){const t=tenOf(b);return t?t.role:null;}
function lotLv(b){const t=tenOf(b);return t?t.lv:0;}
function totalRent(){return Object.values(G.lots).filter(b=>tenOf(b)&&tenOf(b).type==='npc').reduce((t,b)=>t+Math.round(TENANTS[b.ten.n].rent*b.lv*(G.type==='schiera'?1.2:1)),0);}
function friendBonus(){return Object.values(G.lots).filter(b=>tenOf(b)&&tenOf(b).type==='friend').length*25;}
function houseOfFriend(fid){return Object.entries(G.lots).find(([,b])=>b.kind==='house'&&b.ten&&b.ten.f===fid);}
function renoCost(l,lv,base){return lv>=3?null:Math.round((base||l.cost)*(.6+lv*.3));}
function toolCd(tl,lv){return tl.cd*(1-(lv-1)*.15)*(1-hUp('energia')*.2)*Math.max(.6,1-bLv('radio')*.08);}
function openSheet(title,body,bind){
  let sh=document.getElementById('sheet');
  if(!sh){sh=document.createElement('div');sh.id='sheet';sh.className='sheet';sh.innerHTML='<div class="sheet-bg"></div><div class="sheet-card" role="dialog" aria-modal="true"></div>';document.body.appendChild(sh);sh.querySelector('.sheet-bg').onclick=closeSheet;}
  sh.querySelector('.sheet-card').innerHTML=`<div class="row spread sheet-h"><h3>${title}</h3><button class="btn ghost small" data-close aria-label="Chiudi">✕</button></div><div class="sheet-b">${body}</div>`;
  sh.classList.add('open');sh.querySelector('[data-close]').onclick=closeSheet;if(bind)bind(sh.querySelector('.sheet-card'));
}
function closeSheet(){const sh=document.getElementById('sheet');if(sh)sh.classList.remove('open');}
const ZL={centro:'Centro',periferia:'Periferia',campagna:'Campagna',fiume:'Fiume',montagna:'Montagna'};
const fortCost=(l,f)=>f>=3?null:Math.round(l.cost*(.5+.4*f));
const prepCost=p=>p>=5?null:60+p*p*40;
function defenseBlock(l,b,withPrep){const f=b.fort||0,p=b.prep||1,fc=fortCost(l,f),pc=prepCost(p);
  return`<div class="defbox"><b>Difesa dell’edificio</b>
    <div class="row spread"><span>🛡️ Fortificazione ${'■'.repeat(f)}${'□'.repeat(3-f)}<small>barricata e muri più robusti</small></span>${fc!=null?`<button class="btn small" data-fort ${G.coins<fc?'disabled':''}>Fortifica 🪙 ${fc}</button>`:'<span class="tag sp">MAX</span>'}</div>
    ${withPrep?`<div class="row spread"><span>🎓 Addestramento ${'■'.repeat(p)}${'□'.repeat(5-p)}<small>più difensori e colpi più forti</small></span>${pc!=null?`<button class="btn small" data-prep ${G.coins<pc?'disabled':''}>Addestra 🪙 ${pc}</button>`:'<span class="tag sp">MAX</span>'}</div>`:''}
    <small class="muted">Durante l’orda questo edificio si difende da solo con chi ci abita. Se cade lo perdi e torni indietro di un livello.</small></div>`;}
function bindDefense(card,l,b,id){const fb=card.querySelector('[data-fort]');if(fb)fb.onclick=()=>{const c=fortCost(l,b.fort||0);if(G.coins<c)return;G.coins-=c;b.fort=(b.fort||0)+1;sfx('coin');toast('Edificio fortificato');renderHub();lotSheet(id);};
  const pb=card.querySelector('[data-prep]');if(pb)pb.onclick=()=>{const c=prepCost(b.prep||1);if(G.coins<c)return;G.coins-=c;b.prep=(b.prep||1)+1;sfx('coin');toast('Inquilini più preparati');renderHub();lotSheet(id);};}
function lotSheet(id){
  const l=LOTS.find(x=>x.id===id);const b=G.lots[id];vibe();
  if(!b){
    openSheet(`${LOT_KIND[l.kind].n} in vendita · ${ZL[l.zone]}`,`
      <p class="muted" style="margin-bottom:12px">Compralo e scegli che uso farne.</p>
      <button class="choice" data-build="house" ${G.coins<l.cost?'disabled':''}><span class="ci">🏠</span><span><b>Compra come casa da affittare</b><small>Poi scegli chi ci abita: un amico vero oppure un inquilino del gioco.</small></span><span class="cp">🪙 ${l.cost}</span></button>
      <p class="disp" style="font-size:20px;margin:16px 0 8px">Oppure compralo e trasformalo in un servizio</p>
      ${Object.entries(BLD).map(([k,B])=>{const c=Math.round(B.cost*ZF[l.zone]);return`<button class="choice" data-bld="${k}" ${G.coins<c?'disabled':''}><span class="ci" style="background:${B.col}">${B.ic}</span><span><b>${B.name}</b><small>${B.eff}</small></span><span class="cp">🪙 ${c}</span></button>`}).join('')}
      ${G.coins<l.cost?'<p class="notice" style="margin-top:10px">Monete insufficienti: vinci qualche ondata o passa dalla Bottega.</p>':''}`,
    card=>{
      const hb=card.querySelector('[data-build=house]');if(hb)hb.onclick=()=>{if(G.coins<l.cost)return;G.coins-=l.cost;G.lots[id]={kind:'house',lv:1,ten:null};toast('Acquisto fatto: ora scegli l’inquilino');renderHub();tenantSheet(id);};
      card.querySelectorAll('[data-bld]').forEach(x=>x.onclick=()=>{const k=x.dataset.bld;const c=Math.round(BLD[k].cost*ZF[l.zone]);if(G.coins<c)return;G.coins-=c;G.lots[id]={kind:'bld',b:k,lv:1};toast(`${BLD[k].name} costruita`);closeSheet();renderHub();});
    });return;}
  if(b.kind==='bld'){const B=BLD[b.b];const base=Math.round(B.cost*ZF[l.zone]);const c=renoCost(l,b.lv,base);
    openSheet(`${B.ic} ${B.name}`,`<p style="margin-bottom:8px">${B.eff}.</p><div class="stars">${'★'.repeat(b.lv)}${'☆'.repeat(3-b.lv)} livello ${b.lv} di 3</div>
      ${c!=null?`<button class="btn wide" data-up style="margin-top:12px" ${G.coins<c?'disabled':''}>Potenzia · 🪙 ${c}</button>`:'<p class="notice" style="margin-top:12px">Livello massimo raggiunto.</p>'}
      ${defenseBlock(l,b,false)}
      <button class="btn ghost small" data-demo style="margin-top:10px">Rivendi (+🪙 ${Math.round(l.cost/2)})</button>`,
    card=>{bindDefense(card,l,b,id);const u=card.querySelector('[data-up]');if(u)u.onclick=()=>{if(G.coins<c)return;G.coins-=c;b.lv++;toast(`${B.name} al livello ${b.lv}`);closeSheet();renderHub();};
      card.querySelector('[data-demo]').onclick=()=>{if(confirm('Rivendere l’edificio? Recuperi metà del prezzo.')){G.coins+=Math.round(l.cost/2);delete G.lots[id];closeSheet();renderHub();}};});return;}
  const t=tenOf(b);const c=renoCost(l,b.lv);
  const who=!t?`<div class="tcard empty"><span class="ci">🚪</span><div><b>Casa vuota</b><small>Nessuno ci abita: non aiuta e non rende. Scegli un inquilino.</small></div></div>`
    :t.type==='friend'?`<div class="tcard"><span class="ci av" style="background:${t.f.col}">${t.f.nick[0].toUpperCase()}</span><div><b>@${esc(t.f.nick)}</b> <span class="tag ia">amico vero</span><small>${TENANTS[t.role].ic} ${TENANTS[t.role].name} · forza ${'★'.repeat(t.lv)}. ${TENANTS[t.role].eff}. A ogni ondata vinta +25 🪙 a te e un regalo a lui o lei.</small></div></div>`
    :`<div class="tcard"><span class="ci" style="background:${TENANTS[t.role].col}">${TENANTS[t.role].ic}</span><div><b>${TENANTS[t.role].name}</b> <span class="tag">del gioco</span><small>${TENANTS[t.role].eff}. Paga ${Math.round(TENANTS[t.role].rent*b.lv)} 🪙 di affitto a ogni ondata vinta.</small></div></div>`;
  openSheet(`🏠 ${LOT_KIND[l.kind].n} in affitto · ${ZL[l.zone]}`,`${who}
    <button class="btn wide ${t?'ghost':''}" data-ten style="margin-top:12px">${t?'Cambia inquilino':'Scegli l’inquilino'}</button>
    ${t?'<button class="btn ghost small" data-free style="margin-top:8px">Libera la casa</button>':''}
    <div class="row spread" style="margin-top:14px"><span>Casa livello ${b.lv} di 3</span>${c!=null?`<button class="btn small" data-reno ${G.coins<c?'disabled':''}>Ristruttura 🪙 ${c}</button>`:'<span class="tag sp">MAX</span>'}</div>
    ${defenseBlock(l,b,t&&t.type==='npc')}`,
  card=>{bindDefense(card,l,b,id);card.querySelector('[data-ten]').onclick=()=>tenantSheet(id);
    const fr=card.querySelector('[data-free]');if(fr)fr.onclick=()=>{b.ten=null;toast('Casa liberata');closeSheet();renderHub();};
    const rn=card.querySelector('[data-reno]');if(rn)rn.onclick=()=>{if(G.coins<c)return;G.coins-=c;b.lv++;toast('Casa ristrutturata');renderHub();lotSheet(id);};});
}
function tenantSheet(id){
  const b=G.lots[id];const l=LOTS.find(x=>x.id===id);
  const free=G.friends.filter(f=>{const h=houseOfFriend(f.id);return!h||h[0]===id;});
  const tab=G.tenTab||'amici';
  openSheet(`Chi abita qui? · ${ZL[l.zone]}`,`
    <div class="seg big"><button class="${tab==='amici'?'on':''}" data-tt="amici">👥 Un amico vero</button><button class="${tab==='npc'?'on':''}" data-tt="npc">🤖 Del gioco</button></div>
    ${tab==='amici'?`<p class="muted" style="margin:8px 0 10px">Un tuo amico che usa l’app viene ad abitare qui. Riceve una notifica, ti aiuta con il suo ruolo anche quando non è online, e a ogni ondata vinta vi premiate a vicenda.</p>
      ${free.length?free.map(f=>`<button class="choice" data-fr="${f.id}"><span class="ci av" style="background:${f.col}">${f.nick[0].toUpperCase()}</span><span><b>@${esc(f.nick)} ${f.on?'<i class="dot"></i>':''}</b><small>${TENANTS[f.role].ic} ${TENANTS[f.role].name} · livello ${f.lv} · forza ${'★'.repeat(fLv(f))}</small></span><span class="cp">Assegna</span></button>`).join('')
        :'<p class="notice">Tutti i tuoi amici hanno già una casa nel tuo quartiere.</p>'}
      <button class="btn alt small" data-invite style="margin-top:10px">Invita un amico nell’app</button>`
    :`<p class="muted" style="margin:8px 0 10px">Un personaggio del gioco: paga l’affitto e ti aiuta con il suo mestiere. Utile finché non hai amici nell’app.</p>
      ${Object.entries(TENANTS).map(([k,T])=>`<button class="choice" data-npc="${k}"><span class="ci" style="background:${T.col}">${T.ic}</span><span><b>${T.name}</b><small>${T.eff}</small></span><span class="cp">${Math.round(T.rent*b.lv)} 🪙<br><small>affitto</small></span></button>`).join('')}`}`,
  card=>{card.querySelectorAll('[data-tt]').forEach(x=>x.onclick=()=>{G.tenTab=x.dataset.tt;tenantSheet(id);});
    card.querySelectorAll('[data-fr]').forEach(x=>x.onclick=()=>{const f=G.friends.find(y=>y.id===x.dataset.fr);b.ten={f:f.id};toast(`@${f.nick} ora abita nella tua casa in ${ZL[l.zone].toLowerCase()} e riceve una notifica`);closeSheet();renderHub();});
    card.querySelectorAll('[data-npc]').forEach(x=>x.onclick=()=>{b.ten={n:x.dataset.npc};toast(`Arriva ${TENANTS[x.dataset.npc].name.toLowerCase()}`);closeSheet();renderHub();});
    const inv=card.querySelector('[data-invite]');if(inv)inv.onclick=()=>window.doInvite&&window.doInvite();});
}
function giveHouseSheet(fid){
  const f=G.friends.find(x=>x.id===fid);
  const empty=Object.entries(G.lots).filter(([,b])=>b.kind==='house'&&!b.ten);
  const npcH=Object.entries(G.lots).filter(([,b])=>b.kind==='house'&&b.ten&&b.ten.n);
  const freeLots=LOTS.filter(l=>!G.lots[l.id]);
  openSheet(`Dai una casa a @${esc(f.nick)}`,`
    <p class="muted" style="margin-bottom:10px">${TENANTS[f.role].ic} ${TENANTS[f.role].name}: ${TENANTS[f.role].eff.toLowerCase()}.</p>
    ${empty.length?`<p class="disp" style="font-size:18px;margin-bottom:6px">Case vuote</p>${empty.map(([id])=>{const l=LOTS.find(x=>x.id===id);return`<button class="choice" data-to="${id}"><span class="ci">🏠</span><span><b>${LOT_KIND[l.kind].n} in ${ZL[l.zone].toLowerCase()}</b><small>Libera, pronta subito</small></span><span class="cp">Assegna</span></button>`}).join('')}`:''}
    ${npcH.length?`<p class="disp" style="font-size:18px;margin:10px 0 6px">Case con inquilini del gioco</p>${npcH.map(([id,b])=>{const l=LOTS.find(x=>x.id===id);return`<button class="choice" data-to="${id}"><span class="ci" style="background:${TENANTS[b.ten.n].col}">${TENANTS[b.ten.n].ic}</span><span><b>Casa in ${ZL[l.zone].toLowerCase()}</b><small>Ora ci abita: ${TENANTS[b.ten.n].name}. Verrà sostituito.</small></span><span class="cp">Sostituisci</span></button>`}).join('')}`:''}
    ${!empty.length&&!npcH.length?`<p class="notice">Non hai case libere. ${freeLots.length?'Compra un edificio con il simbolo € sulla mappa.':'Tutti i lotti sono occupati.'}</p>`:''}`,
  card=>card.querySelectorAll('[data-to]').forEach(x=>x.onclick=()=>{const h=houseOfFriend(f.id);if(h)h[1].ten=null;G.lots[x.dataset.to].ten={f:f.id};toast(`@${f.nick} si trasferisce nel tuo quartiere`);closeSheet();renderHub();}));
}
function defBadge(b){return` <span class="dbadge">🛡️${b.fort||0}${b.kind==='house'&&b.ten&&b.ten.n?` · 🎓${b.prep||1}`:''}</span>`;}
function propertiesHTML(){
  const ent=Object.entries(G.lots).filter(([,b])=>!b.owner);
  if(!ent.length)return`<div class="notice">Non hai ancora proprietà. Tocca un edificio con il simbolo € sulla mappa per comprarlo.</div>`;
  return ent.map(([id,b])=>{const l=LOTS.find(x=>x.id===id);
    if(b.kind==='bld'){const B=BLD[b.b];return`<button class="prop" data-prop="${id}"><span class="ci" style="background:${B.col}">${B.ic}</span><span><b>${B.name}${defBadge(b)}</b><small>${ZL[l.zone]} · livello ${b.lv}</small></span><span class="go">›</span></button>`;}
    const t=tenOf(b);
    if(!t)return`<button class="prop warn" data-prop="${id}"><span class="ci">🚪</span><span><b>${LOT_KIND[l.kind].n} vuoto</b><small>${ZL[l.zone]} · tocca per scegliere l’inquilino</small></span><span class="go">›</span></button>`;
    if(t.type==='friend')return`<button class="prop" data-prop="${id}"><span class="ci av" style="background:${t.f.col}">${t.f.nick[0].toUpperCase()}</span><span><b>Casa di @${esc(t.f.nick)}${defBadge(b)}</b><small>${ZL[l.zone]} · amico vero · ${TENANTS[t.role].ic} ${TENANTS[t.role].name}</small></span><span class="go">›</span></button>`;
    return`<button class="prop" data-prop="${id}"><span class="ci" style="background:${TENANTS[t.role].col}">${TENANTS[t.role].ic}</span><span><b>Casa del ${TENANTS[t.role].name.toLowerCase()}${defBadge(b)}</b><small>${ZL[l.zone]} · inquilino del gioco · affitto ${Math.round(TENANTS[t.role].rent*b.lv)} 🪙</small></span><span class="go">›</span></button>`;}).join('');
}
function socialHTML(){
  const me=G.me;const ranking=[...G.friends.map(f=>({n:'@'+f.nick,lv:f.lv,col:f.col})),{n:'Tu',lv:G.level-1,col:'#f7d64a',me:true}].sort((a,b)=>b.lv-a.lv);
  const ev=G.event;const pct=Math.min(100,ev.prog/ev.goal*100);
  return`<h3 style="margin:18px 0 8px">Amici e quartiere</h3>
   <div class="panel night">
     <div class="row spread"><div><b style="color:var(--moon)">Il tuo ruolo</b><div style="font-weight:400;font-size:13px;color:#e5def5">È quello che porti quando abiti nel quartiere di un amico.</div></div>${me.role?`<span class="tag" style="background:${TENANTS[me.role].col}">${TENANTS[me.role].ic} ${TENANTS[me.role].name}</span>`:''}</div>
     <div class="chips" style="margin-top:8px">${Object.entries(TENANTS).map(([k,T])=>`<button class="chip ${me.role===k?'on':''}" data-role="${k}" style="font-size:13px">${T.ic} ${T.name}</button>`).join('')}</div>
   </div>
   <div class="panel">
     <div class="row spread"><b>${ev.name}</b><small class="muted">zombie scacciati dal gruppo</small></div>
     <div class="hp" style="height:18px;margin:8px 0"><span style="width:${pct}%;background:var(--ok)"></span></div>
     <div class="row spread"><small>${ev.prog.toLocaleString('it-IT')} / ${ev.goal.toLocaleString('it-IT')}</small>${ev.prog>=ev.goal&&!ev.claimed?'<button class="btn small alt" id="claimEv">Ritira 50 💎</button>':`<small class="muted">${ev.claimed?'Premio ritirato':'Premio: 50 💎 a tutti'}</small>`}</div>
   </div>
   <div class="panel">
     <div class="row spread" style="margin-bottom:6px"><b>Amici (${G.friends.length})</b><button class="btn small alt" data-invite>Invita un amico</button></div>
     ${G.req.map(r=>`<div class="frow"><span class="ti av" style="background:${r.col}">${r.nick[0].toUpperCase()}</span><div style="flex:1"><b>@${esc(r.nick)}</b><small> vuole entrare nel tuo gruppo · ${TENANTS[r.role].ic} ${TENANTS[r.role].name}</small></div><button class="btn small" data-acc="${r.id}">Accetta</button></div>`).join('')}
     ${G.friends.map(f=>{const home=houseOfFriend(f.id);return`<div class="frow"><span class="ti av" style="background:${f.col}">${f.nick[0].toUpperCase()}</span><div style="flex:1"><b>@${esc(f.nick)}</b> ${f.on?'<i class="dot"></i>':''}<small> ${TENANTS[f.role].ic} ${TENANTS[f.role].name} · liv. ${f.lv}${home?' · abita da te':''}</small></div>${home?`<button class="btn small ghost" data-poke="${f.id}">Saluta</button>`:`<button class="btn small" data-give="${f.id}">Dagli una casa</button>`}</div>`}).join('')}
   </div>
   ${G.gifts.length?`<div class="panel moon"><b>Regali ricevuti</b>${G.gifts.map((g,i)=>`<div class="frow"><span style="font-size:22px">🎁</span><div style="flex:1"><b>@${esc(g.from)}</b><small> ti manda ${g.n} ${g.what==='coins'?'🪙':'💎'}</small></div><button class="btn small" data-gift="${i}">Ritira</button></div>`).join('')}</div>`:''}
   <div class="panel">
     <b>📣 Richieste d’aiuto</b>
     ${(G.help||[]).length?G.help.map(h=>{const f=G.friends.find(x=>x.id===h.fid);if(!f)return'';return`<div class="frow"><span class="ti av" style="background:${f.col}">${f.nick[0].toUpperCase()}</span><div style="flex:1"><b>@${esc(f.nick)}</b><small> è in difficoltà all’ondata ${h.lvl}: il suo quartiere è sotto assedio</small></div><div class="row" style="gap:4px;flex-direction:column"><button class="btn small" data-helpnow="${f.id}">Aiuta ora</button><button class="btn small ghost" data-lend="${f.id}">Manda la famiglia</button></div></div>`;}).join(''):'<p class="muted" style="font-size:13px;margin:6px 0">Nessuna richiesta. Quando un amico è in difficoltà ti arriva una notifica qui.</p>'}
   </div>
   <div class="panel">
     <b>👨‍👩‍👧 La tua famiglia (${famSize(G.level)} persone)</b>
     <p style="font-weight:400;font-size:13px;margin:4px 0 8px">Quando non giochi, presta la tua famiglia a un amico: difende il suo quartiere e ogni giorno ti porta monete. Cresce di una persona ogni 5 ondate.</p>
     <div class="chips">${G.friends.map(f=>`<button class="chip opt ${G.famOut===f.id?'on':''}" data-lend="${f.id}">@${esc(f.nick)}</button>`).join('')}${G.famOut?'<button class="chip" data-lend="">Riprendila a casa</button>':''}</div>
     <b style="display:block;margin-top:12px">Famiglie che i tuoi amici ti prestano</b>
     ${G.friends.filter(f=>f.lv>=5).map(f=>{const to=(G.famIn||{})[f.id];const s=to==='home'?'Casa tua':to?(()=>{const b=G.lots[to];const l=LOTS.find(x=>x.id===to);return b&&l?LOT_KIND[l.kind].n+' in '+ZL[l.zone].toLowerCase():'—';})():'non assegnata';
       return`<div class="frow"><span class="ti av" style="background:${f.col}">${f.nick[0].toUpperCase()}</span><div style="flex:1"><b>@${esc(f.nick)}</b><small> presta ${famSize(f.lv)} persone · difende: <b>${s}</b></small></div><button class="btn small ${to?'ghost':''}" data-famin="${f.id}">${to?'Sposta':'Assegna'}</button></div>`;}).join('')}
   </div>
   <div class="panel">
     <b>Abiti anche da</b>
     ${G.hosts.map(h=>{const f=G.friends.find(x=>x.id===h.fid);if(!f)return'';return`<div class="frow"><span class="ti av" style="background:${f.col}">${f.nick[0].toUpperCase()}</span><div style="flex:1"><b>Quartiere di @${esc(f.nick)}</b><small> ${me.role?`Come ${TENANTS[me.role].name.toLowerCase()} questa settimana ${ROLE_LINE[me.role]} 3 volte.`:'Scegli un ruolo per aiutare davvero.'}</small></div></div>`}).join('')}
   </div>
   <div class="panel"><b>Classifica tra amici</b>${ranking.map((r,i)=>`<div class="frow"><b style="width:22px">${i+1}</b><span class="ti av" style="background:${r.col};color:#140f1f">${r.n[r.me?0:1].toUpperCase()}</span><div style="flex:1"><b>${esc(r.n)}</b></div><small>ondata ${Math.max(0,r.lv)}</small></div>`).join('')}</div>
   <p class="notice">Anteprima: amici, regali ed evento sono simulati. Si diventa amici solo con un invito: niente estranei, niente posizioni reali.</p>`;
}
function famInSheet(fid){const f=G.friends.find(x=>x.id===fid);
  const opts=[['home','⭐ Casa tua']].concat(Object.entries(G.lots).map(([id,b])=>{const l=LOTS.find(x=>x.id===id);return[id,(b.kind==='bld'?BLD[b.b].ic+' '+BLD[b.b].name:'🏠 '+LOT_KIND[l.kind].n)+' · '+ZL[l.zone]];}));
  openSheet(`Dove mandi la famiglia di @${esc(f.nick)}?`,`<p class="muted" style="margin-bottom:10px">${famSize(f.lv)} persone difenderanno l’edificio che scegli durante le tue ondate.</p>${opts.map(([id,n])=>`<button class="choice" data-to2="${id}"><span class="ci">🛡️</span><span><b>${n}</b></span><span class="cp">${(G.famIn||{})[fid]===id?'✓':''}</span></button>`).join('')}`,
  card=>card.querySelectorAll('[data-to2]').forEach(x=>x.onclick=()=>{(G.famIn=G.famIn||{})[fid]=x.dataset.to2;toast(`La famiglia di @${f.nick} difenderà ${x.querySelector('b').textContent}`);closeSheet();renderHub();}));}
function bindSocial(selLot){
  app.querySelectorAll('[data-helpnow]').forEach(b=>b.onclick=()=>{missionAdd('s',1);G.coop=b.dataset.helpnow;G.view='battle';renderOrda();});
  app.querySelectorAll('[data-lend]').forEach(b=>b.onclick=()=>{const id=b.dataset.lend||null;G.famOut=id;if(id){G.help=(G.help||[]).filter(h=>h.fid!==id);const f=G.friends.find(x=>x.id===id);toast(`La tua famiglia difende il quartiere di @${f.nick}. Lui riceve una notifica.`);}else toast('La famiglia torna a casa');renderHub();});
  app.querySelectorAll('[data-famin]').forEach(b=>b.onclick=()=>famInSheet(b.dataset.famin));
  app.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{G.me.role=b.dataset.role;vibe();toast(`Ora sei ${TENANTS[G.me.role].name.toLowerCase()} nei quartieri dei tuoi amici`);renderHub();});
  app.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>doInvite());
  app.querySelectorAll('[data-give]').forEach(b=>b.onclick=()=>giveHouseSheet(b.dataset.give));
  window.doInvite=async()=>{const link='https://zombiesafehouse.app/i/'+Math.random().toString(36).slice(2,8);
    try{if(navigator.share)await navigator.share({title:'ZombieSafeHouse',text:'Vieni ad abitare nel mio quartiere: insieme scacciamo l’orda!',url:link});else{await navigator.clipboard.writeText(link);toast('Link d’invito copiato');}}catch(e){toast('Link d’invito: '+link);}
    setTimeout(()=>{if(!G.req.length){G.req.push({id:'f'+Date.now(),nick:'nuovo_superstite',role:'elet',lv:2,col:'#c9b8ff'});toast('Qualcuno ha aperto il tuo invito!');if(S.tab==='orda'&&G.view==='hub')renderHub();}},2500);};
  app.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{const r=G.req.find(x=>x.id===b.dataset.acc);G.req=G.req.filter(x=>x!==r);G.friends.push({...r,on:Math.random()<.5});vibe();toast(`@${r.nick} è nel tuo gruppo`);renderHub();});
  app.querySelectorAll('[data-poke]').forEach(b=>b.onclick=()=>{missionAdd('s',1);const f=G.friends.find(x=>x.id===b.dataset.poke);toast(`Saluto inviato a @${f.nick} 👋`);vibe();});
  app.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>{const g=G.gifts[+b.dataset.gift];if(g.what==='coins')G.coins+=g.n;else G.gems+=g.n;G.gifts.splice(+b.dataset.gift,1);vibe();renderHub();});
  const ce=$('#claimEv');if(ce)ce.onclick=()=>{G.gems+=50;G.event.claimed=true;toast('Premio dell’evento: +50 💎');renderHub();};
}
function slotCard(s){
  const lv=G.q[s.id]||0;const c=upCost(SLOTS,s.id,lv);
  return`<div style="flex:1"><b>${s.name}</b> <span class="tag">${({centro:'Centro',periferia:'Periferia',campagna:'Campagna'})[s.zone]}</span><div style="font-weight:400;font-size:13px;margin-top:2px">${s.eff}. Livello ${lv} di 3.</div></div>
   ${c!=null?`<button class="btn small" id="buySlot" ${G.coins<c?'disabled':''}>🪙 ${c}</button>`:'<span class="tag sp">MAX</span>'}`;
}

/* ---------- battaglia: assedio di tutto il quartiere ---------- */
const HOME_POS={centro:[134,168],periferia:[196,286],campagna:[330,580],fiume:[128,566],montagna:[204,-50]};
const CEM=[200,650];
function siteKindImg(kind){return kind==='palazzo'?'apt':kind==='villetta'?'villa':kind==='barca'?'barca':kind==='rifugio'?'rifugio':'casale';}
function buildSites(coop){
  const t=HTYPES[G.type];const out=[];
  if(coop){
    const f=coop;const lvF=fLv(f);
    out.push({id:'fh',name:`Casa di @${f.nick}`,short:'@'+f.nick,ic:'🏠',kind:'villa',zone:'periferia',x:196,y:286,max:140+f.lv*6,barMax:90+lvF*30,def:[{lv:lvF+1,nick:f.nick}],main:true,friend:true});
    out.push({id:'fp',name:`Palazzo di @${f.nick}`,short:'Palazzo',ic:'🏢',kind:'apt',zone:'centro',x:122,y:96,max:110,barMax:60,def:[{lv:2}]});
    out.push({id:'fc',name:`Casale di @${f.nick}`,short:'Casale',ic:'🌾',kind:'casale',zone:'campagna',x:110,y:598,max:110,barMax:40,def:[{lv:1}]});
    return initSites(out);}
  const p=G.type==='camper'?[250,600]:HOME_POS[t.zone];
  const homeDef=[];
  [['rossi',0],['bianchi',1],['neri',2]].forEach(([id,l])=>{const lv=G.q[id]||0;if(lv)homeDef.push({lv,lane:l});});
  if(G.type==='apt'&&!homeDef.some(a=>a.lane===1))homeDef.push({lv:1,lane:1});
  /* la tua famiglia difende casa, se non l'hai prestata a un amico */
  if(!G.famOut){homeDef.push({lv:1+Math.floor(G.level/6),lane:0,nick:'famiglia'});if(G.level>=3)homeDef.push({lv:1+Math.floor(G.level/6),lane:2});}
  /* la tua famiglia difende sempre casa quando sei altrove nel quartiere */
  homeDef.push({lv:1+Math.floor(hUp('vedetta')/2),lane:0,nick:'famiglia'},{lv:1,lane:2});
  out.push({id:'home',name:'Casa tua',short:'Casa tua',ic:'⭐',kind:G.type,zone:t.zone,x:p[0],y:p[1],max:houseMaxHP(),barMax:barrierMax(),def:homeDef,home:true,main:true});
  Object.entries(G.lots).forEach(([id,b])=>{const l=LOTS.find(x=>x.id===id);if(!l)return;
    const prep=b.prep||1,fort=b.fort||0,tt=tenOf(b);
    const base={palazzo:120,villetta:90,casale:110,campo:70,barca:85,rifugio:130}[l.kind]+(b.kind==='bld'?20:0);
    let def=[],name,ic;
    if(b.kind==='bld'){const B=BLD[b.b];name=B.name;ic=B.ic;def=[{lv:b.lv}];}
    else if(tt&&tt.type==='friend'){name=`Casa di @${tt.f.nick}`;ic='👤';def=[{lv:tt.lv+1,nick:tt.f.nick}];}
    else if(tt){name=`${LOT_KIND[l.kind].n} del ${TENANTS[tt.role].name.toLowerCase()}`;ic=TENANTS[tt.role].ic;def=Array.from({length:Math.min(3,1+Math.floor((prep-1)/2))},()=>({lv:prep}));}
    else{name=`${LOT_KIND[l.kind].n} vuoto`;ic='🚪';}
    out.push({id,name,short:name.length>16?name.slice(0,15)+'…':name,ic,kind:siteKindImg(l.kind),zone:l.zone,x:l.x,y:l.y,max:base+fort*30+prep*10,barMax:[30,80,140,220][fort],def,fort,prep,tenant:tt&&tt.type==='npc'?{k:tt.role,lv:prep}:null,lot:true});});
  /* famiglie prestate dagli amici */
  Object.entries(G.famIn||{}).forEach(([fid,sid])=>{const f=G.friends.find(x=>x.id===fid);const s=out.find(x=>x.id===sid);if(f&&s)for(let i=0;i<famSize(f.lv);i++)s.def.push({lv:1+Math.floor(f.lv/8),nick:i?null:f.nick+' & famiglia'});});
  return initSites(out);
}
function initSites(out){
  out.forEach(s=>{s.hp=s.max;s.bar=s.barMax;s.zs=[];s.shots=[];s.lost=false;s.alert=0;s.sos=false;s.allyT=[0,0,0];
    s.def.forEach((d,i)=>{if(d.lane==null)d.lane=i%3;});s.dist=Math.hypot(s.x-CEM[0],s.y-CEM[1]);});
  return out;
}
function famSize(lv){return 2+Math.floor((lv||1)/5);}
async function renderBattle(){
  const coop=G.coop?G.friends.find(f=>f.id===G.coop):null;
  const t=HTYPES[G.type];
  document.body.classList.add('inbattle');
  const sites=buildSites(coop);
  const L=coop?Math.max(3,Math.round(coop.lv*.8)):(G.replay||G.level);
  const TACT=G.style!=='classico';document.body.classList.remove('bended');
  app.innerHTML=`<div class="page battle" style="padding-top:10px">
   <div class="row spread bhead"><b class="disp" style="font-size:24px;white-space:nowrap">${coop?`Aiuto a @${esc(coop.nick)}`:`Ondata ${L}`}</b><span class="row" style="gap:6px"><button class="btn small" id="pauseB" aria-label="Pausa">❚❚ Pausa</button><button class="btn ghost small bh-x" id="helpB" aria-label="Come si gioca">❓</button><button class="btn ghost small bh-x" id="muteBtn" aria-label="Effetti sonori">${G.mute?'🔇':'🔊'}</button><button class="btn ghost small bh-x" data-music aria-label="Musica">🎵</button><button class="btn ghost small bh-x" id="fsBtn" aria-label="Gioca a schermo intero in orizzontale">⤢</button></span><div class="wallet"><span>🪙 <b id="bc">${G.coins}</b></span><span>💎 <b id="bg">${G.gems}</b></span></div></div>
   <div class="sgoal" id="sgoal"></div><div class="hpbars"><div><small>${coop?'Casa amica':'Casa tua'}</small><div class="hp"><span id="hpH"></span></div></div><div><small id="hpBl">Barricata</small><div class="hp"><span id="hpB" style="background:#7c8794"></span></div></div><div><small>Orda</small><div class="hp"><span id="hpW" style="background:#6fb59a"></span></div></div></div>
   <div class="arena"><canvas id="cv" width="960" height="600" aria-label="Campo di battaglia dell’edificio selezionato: tocca gli zombie per scacciarli"></canvas><div class="cap" id="bcap"></div></div>
   <div class="radar"><div class="radar-h"><div><b>Mappa dell’assedio</b><small id="rsum"></small></div><button class="btn small" id="goDanger">⚠ Vai dove serve</button></div><canvas id="mm" width="680" height="600" aria-label="Mappa del quartiere: tocca un edificio per andarlo a difendere"></canvas><div class="mmleg"><span><i style="background:#3f9b5f"></i>sana</span><span><i style="background:#f7d64a"></i>danneggiata</span><span><i style="background:#d7263d"></i>grave</span><span><i class="dot"></i>zombie in arrivo</span><span>👆 tocca un edificio per difenderlo</span></div><div class="sites" id="sites"></div></div>
   <div class="toolbelt">${TACT?'<div class="hand" id="hand"></div>':''}<button class="tool hab" id="hab" aria-label="Abilità della casa"><span class="ic">⭐</span><span class="nm">Abilità</span><i class="cdv"></i></button>${TACT?'':''}${(TACT?[]:TOOLS.filter(tl=>G.tools[tl.id])).map(tl=>`<button class="tool" data-use="${tl.id}" aria-label="${tl.name}"><span class="ic">${tl.ic}</span><span class="nm">${tl.name}</span><i class="cdv"></i></button>`).join('')}
     ${G.friends.length?`<button class="tool sos" id="aSos" aria-label="Chiama gli amici"><span class="ic">📣</span><span class="nm">SOS amici</span></button>`:''}
     <button class="tool fix" id="aFix" aria-label="Ripara con gemme"><span class="ic">🔧</span><span class="nm">Ripara 20💎</span></button></div>
   <div class="row spread bfoot" style="margin-top:12px"><small class="muted">Tocca un edificio sulla mappa per correre a difenderlo. Gli altri si difendono da soli con chi ci abita.</small><button class="btn ghost small" id="quit">Esci</button></div>
   <div id="endbox"></div></div>`;
  $('#quit').onclick=()=>{G.coop=null;G.view='hub';renderOrda();};
  $('#muteBtn').onclick=()=>{G.mute=!G.mute;$('#muteBtn').textContent=G.mute?'🔇':'🔊';};
  app.querySelectorAll('[data-music]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(AUD.on&&AUD.started)musicOff();else musicOn();});updMusicBtn();
  $('#fsBtn').onclick=async()=>{try{const el=document.documentElement;if(!document.fullscreenElement&&el.requestFullscreen)await el.requestFullscreen();if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}catch(e){toast('Ruota il telefono in orizzontale');}};
  const cv=$('#cv'),ctx=cv.getContext('2d');ctx.scale(2,2);
  const mm=$('#mm'),mx=mm.getContext('2d');mx.scale(2,2);
  const fit=()=>{const land=innerWidth>innerHeight&&innerHeight<600;
    if(land){let h=innerHeight,w=h*1.6;const maxW=innerWidth-250;if(w>maxW){w=maxW;h=w/1.6;}cv.style.width=w+'px';cv.style.height=h+'px';}
    else{cv.style.width='';cv.style.height='';}};
  fit();addEventListener('resize',fit);addEventListener('orientationchange',()=>setTimeout(fit,250));
  const zVar=(flip,k)=>{let z=zombie(0,0,1,flip);
    if(k==='casco')z=z.replace('</g>',`<path d="M-17 -58 Q0 -84 17 -58Z" fill="#7c8794" stroke="${INK}" stroke-width="3"/><path d="M-17 -58 H17" stroke="${INK}" stroke-width="3"/></g>`);
    if(k==='strillone')z=z.replace('</g>',`<ellipse cx="2" cy="-47" rx="6" ry="7" fill="${INK}"/><path d="M${flip?'-':''}20 -64 q${flip?'-':''}8 6 0 12 M${flip?'-':''}26 -68 q${flip?'-':''}12 10 0 20" fill="none" stroke="#f7d64a" stroke-width="3"/></g>`).replace(/#7a6a56/g,'#c96b2c');
    if(k==='scavatore')z=z.replace(/#7a6a56/g,'#8a5a34').replace('</g>',`<path d="M${flip?'-':''}40 -40 L${flip?'-':''}52 -10" stroke="#7c8794" stroke-width="5"/><path d="M${flip?'-':''}46 -12 l${flip?'-':''}12 4 l${flip?'':'-'}2 10 l${flip?'-':''}-12 -4z" fill="#9aa4b0" stroke="${INK}" stroke-width="2"/></g>`);
    if(k==='oro')z=z.replace(/#6fb59a|#5c9c82|#7a6a56|#3b3157/g,'#f7d64a');
    if(k==='boss')z=z.replace(/#7a6a56/g,'#f3e9d2').replace(/#3b3157/g,'#2b2240').replace('</g>',`<path d="M-14 -70 h28 v-8 q-14 -14 -28 0z" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M-12 -40 h24 v34 h-24z" fill="#fff" stroke="${INK}" stroke-width="2.5"/><path d="M-12 -24 h24" stroke="#d7263d" stroke-width="3"/></g>`);
    return svgImage(spr(z,'-60 -95 120 140',120,140));};
  const extra=await Promise.all(['casco','strillone','scavatore','oro','boss'].flatMap(k=>[zVar(true,k),zVar(false,k)]));
  const zones=[...new Set(sites.map(s=>s.zone))];
  const bgI={};await Promise.all(zones.map(async z=>{bgI[z]=await svgImage(bgSVG(z));}));
  await Promise.all(sites.map(async s=>{s.img=await svgImage(typeof battleHouseSVG==='function'?battleHouseSVG(s):(s.home?gHouse(G.type,G.h):gHouse(s.kind,{porta:Math.min(2,s.fort||0),grate:Math.min(3,s.fort||0),luci:s.fort?1:0})));s.barI=await svgImage(barrierSVG(s.home?hUp('muro'):Math.min(3,s.fort||0)));}));
  const [zw,zwR,zr,zrR,zb,zbR,ally,dogI]=await Promise.all([
    svgImage(spr(zombie(0,0,1,true),'-50 -80 100 125',100,125)),svgImage(spr(zombie(0,0,1,false),'-50 -80 100 125',100,125)),
    svgImage(spr(zombie(0,0,1,true).replace(/#7a6a56/g,'#d7263d'),'-50 -80 100 125',100,125)),svgImage(spr(zombie(0,0,1,false).replace(/#7a6a56/g,'#d7263d'),'-50 -80 100 125',100,125)),
    svgImage(spr(zombie(0,0,1,true).replace(/#6fb59a/g,'#4f8f6f').replace(/#7a6a56/g,'#3b3157'),'-50 -80 100 125',100,125)),svgImage(spr(zombie(0,0,1,false).replace(/#6fb59a/g,'#4f8f6f').replace(/#7a6a56/g,'#3b3157'),'-50 -80 100 125',100,125)),
    svgImage(spr(person(0,0,1,'#2f7fb8',{torch:true,coat:'#f7d64a',hood:true}),'-40 -80 120 90',120,90)),svgImage(spr(dog(0,0),'-25 -30 50 34',50,34))
  ]);
  if(G.view!=='battle')return;
  const IMG={walker:[zw,zwR],runner:[zr,zrR],brute:[zb,zbR],casco:[extra[0],extra[1]],strillone:[extra[2],extra[3]],scavatore:[extra[4],extra[5]],oro:[extra[6],extra[7]],boss:[extra[8],extra[9]]};
  const BIG={casco:1,strillone:1,scavatore:1,oro:1,boss:1};
  const LANES=[178,226,274],BX=150,HX=118;
  const D=DIFF[G.diff];const mix=coop?[.55,.3,.15]:t.mix;
  const nS=sites.length;
  const count=Math.round((8+L*3.8)*D.cnt*(1+.34*(nS-1))), hpMul=(1.15+(L-1)*.34)*D.hp, spMul=(1.05+(L-1)*.055)*D.sp;
  const evPool=L>=3?['blackout','nebbia','luna','pioggia']:[];const _rev=typeof realNightEv==='function'?realNightEv(L):undefined;const ev=_rev!==undefined?_rev:(evPool.length&&Math.random()<.5?evPool[Math.floor(Math.random()*evPool.length)]:null);
  const isBoss=!coop&&L%5===0;
  const INTRO=1.3;
  /* l'orda avanza dal cimitero: prima gli edifici più vicini, poi il resto del quartiere */
  const ordered=[...sites].sort((a,b)=>a.dist-b.dist);ordered.forEach((s,i)=>s.unlock=nS>1?i/(nS)*.55:0);
  const specials=['casco','strillone','scavatore'].filter((k,i)=>L>=2+i*2);
  const queue=[];for(let i=0;i<count;i++){const f=i/count;const av=sites.filter(s=>f>=s.unlock);const wts=av.map(s=>(s.main?1.4:1)*(1+1.2/(1+(s.def?s.def.length:0)*.45+(s.barMax||0)/110)));let r=Math.random()*wts.reduce((a,b)=>a+b,0),k=0;for(;k<av.length;k++){r-=wts[k];if(r<=0)break;}const site=av[Math.min(k,av.length-1)];
    const rr=Math.random();let ty=rr<mix[0]?'walker':rr<mix[0]+mix[1]?'runner':'brute';if(specials.length&&Math.random()<Math.min(.4,.12+L*.03))ty=specials[Math.floor(Math.random()*specials.length)];
    const at=INTRO+i*Math.max(.32,1.4-L*.08)/Math.sqrt(nS)+Math.random()*.4;queue.push({ty,at,arr:at+1.5+site.dist/150,site,lane:Math.floor(Math.random()*3)});}
  const mainS=sites.find(s=>s.main);
  if(isBoss){const last=queue[queue.length-1];queue.push({ty:'boss',at:last.at+2,arr:last.at+2+1.5+mainS.dist/150,site:mainS,lane:1});}
  if(Math.random()<.4){const q=queue[Math.floor(queue.length/2)];queue.push({ty:'oro',at:q.at,arr:q.arr,site:q.site,lane:Math.floor(Math.random()*3)});}
  queue.sort((a,b)=>a.arr-b.arr);
  let cur=mainS;
  const perk={...(G.perk||{})};G.perk={};
  const slow=Math.min(.6,(G.q.lampioni||0)*.10+hUp('luci')*.08);
  const tapDmg=1+hUp('vedetta')+(G.q.campanile||0);
  const armorHome=Math.min(.8,hUp('grate')*.10+(perk.house?.4:0));
  const coinMul=1+(typeof presHeld==='function'?presHeld()*.05:0)+bLv('mercato')*.08+(G.q.fattoria||0)*.15+Object.values(G.lots).filter(b=>lotRole(b)==='orto').reduce((t,b)=>t+.1*lotLv(b),0);
  const cdMul=1;
  const st={t:0,parts:[],pops:[],shake:0,combo:{n:0,t:0},intro:INTRO,coinsFly:[],earned:0,stop:false,slow:0,end:false,cd:{},arrived:0,water:0,dogT:0,dog:null,sosUsed:false,power:perk.power?INTRO+10:0,crateT:12+Math.random()*6,crate:null,light:{x:240,y:200},ev,lostN:0,
    clouds:Array.from({length:5},(_,i)=>({x:i*110+Math.random()*60,y:14+Math.random()*60,s:.6+Math.random()*.7,v:4+Math.random()*6}))};
  G.run=st;
  const tenants=sites.filter(s=>s.tenant).map(s=>({k:s.tenant.k,lv:s.tenant.lv,site:s,t:3+Math.random()*3}));
  const bld=Object.entries(G.lots).filter(([,b])=>b.kind==='bld'&&['caserma','vvf','farmacia','cabina'].includes(b.b)).map(([id,b])=>({k:b.b,lv:b.lv,site:sites.find(s=>s.id===id),t:4+Math.random()*3}));const hosp=bLv('ospedale');
  const pop=(txt,x,y,col='#f7d64a',sz=22)=>{st.pops.push({txt,x,y,col,sz,t:0,site:cur});};
  const cap=txt=>{const c=$('#bcap');if(c){c.textContent=txt;c.classList.remove('in');void c.offsetWidth;c.classList.add('in');clearTimeout(cap.t);cap.t=setTimeout(()=>c.classList.remove('in'),2600);}};
  const burst=(x,y,n,cols,sp=90,size=3,type='star')=>{for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=sp*(.4+Math.random()*.8);st.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-30,life:.5+Math.random()*.4,t:0,col:cols[i%cols.length],size:size*(.7+Math.random()*.7),type,site:cur});}};
  const shake=m=>{st.shake=Math.max(st.shake,m);};
  const mix0=queue.reduce((a,q)=>(a[q.ty]=(a[q.ty]||0)+1,a),{});
  st.introSub=coop?`Difendi il quartiere di @${coop.nick}: ${nS} edifici`:nS>1?`L’orda arriva su ${nS} edifici: difendili tutti`:ev?`${EVENTS[ev].n} ${EVENTS[ev].d}`:isBoss?'Stanotte arriva il Bruto della Sagra…':mix0.runner>=count*.35?'Attenti ai corridori!':(TACT?'Gioca le carte, scegli i bersagli!':'Tocca gli zombie per scacciarli!');
  setTimeout(()=>sfx('horn'),200);setMusic('game',L);
  if(perk.house||perk.power)setTimeout(()=>cap(`Bonus della ruota: ${perk.house?'🛡️ Casa blindata ':''}${perk.power?'💪 Superpugno':''}`),INTRO*1000+200);
  if(!coop&&L>=8&&G.friends.length)setTimeout(()=>cap('Ondata dura: se un edificio è in pericolo, i tuoi amici ricevono una notifica'),INTRO*1000+2800);
  const alive=()=>cur.zs.filter(z=>z.state!=='flee');
  const busiest=()=>{const c=[0,1,2].map(l=>alive().filter(z=>z.lane===l).length);return c.indexOf(Math.max(...c));};
  const siteBusiest=()=>sites.filter(s=>!s.lost).sort((a,b)=>b.zs.filter(z=>z.state!=='flee').length-a.zs.filter(z=>z.state!=='flee').length)[0];
  function hitZ(z,d,src,s=cur){if(z.state==='flee')return;if(z.under&&src!=='pet')return;if(TACT&&z===st.mark)d*=1.35*(st.markx||1);if(src==='tap'&&st.power>0)d*=2;if(src==='tap'&&st.frenzy>0)d*=1.5;
    if(ZT[z.ty].armor&&z.hp>z.max*.5){d*=ZT[z.ty].armor;if(src==='tap')pop('TONK!',z.x-10,LANES[z.lane]-80,'#cfc6e6',14);}
    z.hp-=d;z.x+=src==='tap'?9:4;z.flash=.14;const sc=ZT[z.ty].s,y=LANES[z.lane];
    if(s===cur){burst(z.x,y-70*sc,src==='tap'?6:3,['#fff','#f7d64a'],src==='tap'?110:70,3);st.parts.push({x:z.x+8,y:y-100*sc,vx:0,vy:-40,life:.7,t:0,type:'dmg',txt:'-'+(Math.round(d*10)/10),col:'#fff',size:12,site:cur});}
    if(z.ty==='brute'&&s===cur)shake(2);
    if(z.hp<=0){z.state='flee';medal('primo');missionAdd('z',1);if(TACT&&!coop)comboKill(z,s);
      if(z.ty==='boss'){setMusicIntensity(0);medal('boss');G.scratch=(G.scratch||0)+1;shake(10);pop('BOSS SCACCIATO!',z.x-60,90,'#f7d64a',30);}
      if(z.ty==='oro'){G.gems+=3;medal('oro');pop('+3 💎',z.x,LANES[z.lane]-80,'#9fd3e6',20);}
      const comboMul=src==='tap'?Math.min(2,1+.1*Math.max(0,st.combo.n-1)):1;const c=Math.round(ZT[z.ty].c*coinMul*(1+(L-1)*.05)*comboMul*D.coin*(st.ev==='luna'?2:1));st.earned+=c;G.coins+=c;
      if(s===cur&&Math.random()<.14){const r=Math.random();st.drops=st.drops||[];st.drops.push({x:z.x,y:y-30,k:r<.6?'coin':r<.75?'gem':'heart',life:2.4,max:2.4});}
      if(st.arrived>=queue.length&&sites.every(x=>x.lost||x.zs.every(q=>q===z||q.state==='flee'))){st.slowmo=1.1;pop('ULTIMO!',z.x-30,y-110*sc,'#d7263d',30);}
      if(s===cur){burst(z.x,y-40*sc,10,['#cfc6e6','#9aa4b0','#fff'],60,7,'dust');pop('POOF!',z.x-14,y-80*sc,'#fff',18);sfx('poof');st.coinsFly.push({x:z.x,y:y-60*sc,t:0});setTimeout(()=>sfx('coin'),250);}}}
  /* selezione dell'edificio */
  function select(s){if(!s||s.lost||s===cur)return;cur=s;st.light={x:240,y:200};vibe();sfx('tap');const hb=habOf(s);cap(`📍 ${s.name} · abilità: ${hb.ic} ${hb.n}`);if(!st.obj.seen.has(s.id)){st.obj.seen.add(s.id);objAdd('switch');}renderChips();updHab(true);}
  const chipsEl=$('#sites');
  function renderChips(){chipsEl.innerHTML=sites.map(s=>`<button class="site ${s===cur?'on':''} ${s.lost?'lost':''} ${s.alert>0&&s!==cur?'alert':''}" data-site="${s.id}"><span class="si">${s.lost?'💀':s.ic}</span><span class="sn">${esc(s.short)}</span><span class="sb"><i style="width:${Math.max(0,s.hp/s.max*100)}%"></i></span><span class="sz">${s.lost?'persa':s.zs.filter(z=>z.state!=='flee').length+' 🧟'}</span></button>`).join('');
    chipsEl.querySelectorAll('[data-site]').forEach(b=>b.onclick=()=>select(sites.find(x=>x.id===b.dataset.site)));}
  renderChips();
  mm.onpointerdown=e=>{const r=mm.getBoundingClientRect();const X=(e.clientX-r.left)/r.width*340,Y=(e.clientY-r.top)/r.height*300;
    let best=null,bd=1e9;sites.forEach(s=>{const p=mmPos(s.x,s.y);const d=Math.hypot(p[0]-X,p[1]-Y);if(d<bd){bd=d;best=s;}});if(bd<40)select(best);};
  function mmPos(x,y){return[16+(x/400)*308,8+((y+120)/800)*284];}
  const gd=$('#goDanger');if(gd)gd.onclick=()=>{const live=sites.filter(x=>!x.lost);const w=live.map(x=>({x,n:x.zs.filter(z=>z.state!=='flee').length,r:x.hp/x.max})).sort((a,b)=>(b.n>0)-(a.n>0)||a.r-b.r||b.n-a.n)[0];if(w&&w.x!==cur)select(w.x);else toast('Sei già dove serve');};
  /* tocchi */
  const toXY=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*480,(e.clientY-r.top)/r.height*300];};
  const zAt=(x,y)=>{let best=null;cur.zs.forEach(z=>{if(z.state==='flee'||z.under)return;const s=ZT[z.ty].s,fy=LANES[z.lane];if(x>z.x-28*s&&x<z.x+32*s&&y>fy-120*s&&y<fy+8){if(!best||fy>LANES[best.lane])best=z;}});return best;};
  const comboUp=()=>{st.combo.n=st.combo.t>0?st.combo.n+1:1;st.combo.t=1.3;if(st.combo.n===20)medal('combo20');
    if(st.combo.n===15&&!(st.frenzy>0)){st.frenzy=5;pop('FRENESIA!',170,110,'#f7d64a',34);sfx('win');shake(4);}
    if(st.combo.n>(G.bestCombo||0)){if(!st.recCombo&&G.bestCombo>=5){st.recCombo=1;pop('NUOVO RECORD!',150,80,'#9fd3e6',22);}G.bestCombo=st.combo.n;}};
  let down=false,lastP=null,moved=0;
  cv.onpointerdown=e=>{const[x,y]=toXY(e);down=true;lastP=[x,y];moved=0;st.slash={pts:[[x,y]],age:0,hit:new Set()};try{cv.setPointerCapture(e.pointerId);}catch(_){}
    st.light={x,y};
    if(st.crate&&Math.hypot(x-st.crate.x,y-st.crate.y)<26){openCrate();return;}
    const dp=(st.drops||[]).find(d=>Math.hypot(d.x-x,d.y-y)<24);if(dp){st.drops=st.drops.filter(d=>d!==dp);
      objAdd('drop');if(dp.k==='coin'){const c=8+L*2;G.coins+=c;pop('+'+c+' 🪙',dp.x-14,dp.y-10,'#f7d64a',18);}if(dp.k==='gem'){G.gems+=1;pop('+1 💎',dp.x-12,dp.y-10,'#9fd3e6',18);}
      if(dp.k==='heart'){cur.hp=Math.min(cur.max,cur.hp+cur.max*.08);pop('+CASA',dp.x-16,dp.y-10,'#6fb59a',18);}sfx('coin');vibe();return;}
    if(st.qte&&x>BX-24&&x<BX+46){cur.bar=Math.min(cur.barMax,cur.bar+cur.barMax*.07);st.qte.taps++;pop(st.qte.taps>=6?'RIPARATA!':'TUM!',BX-6,150-st.qte.taps*6,st.qte.taps>=6?'#6fb59a':'#f7d64a',st.qte.taps>=6?26:18);sfx('tap');vibe();
      if(st.qte.taps>=6){st.qte=null;st.qteT=22+Math.random()*10;}return;}
    if(TACT){if(st.sel){const lane=[0,1,2].sort((a,b)=>Math.abs(LANES[a]-20-y)-Math.abs(LANES[b]-20-y))[0];playCard(st.sel,lane);return;}
      const tg=zAt(x,y);if(tg){st.mark=tg;objAdd('mark');pop('BERSAGLIO!',x-30,y-14,'#9fd3e6',18);sfx('tap');vibe();}else burst(x,y,3,['#cfc6e6'],40,2);return;}
    const best=zAt(x,y);
    if(best&&(st.en??100)<7){pop('STANCO!',x-20,y-10,'#cfc6e6',16);return;}
    if(best){st.en-=7;const sc=ZT[best.ty].s,fy=LANES[best.lane];const crit=y<fy-120*sc+44*sc;comboUp();hitZ(best,tapDmg*(crit?2:1),'tap');st.slash.hit.add(best);
      if(crit){objAdd('crit');pop('CRITICO!',x-24,y-14,'#d7263d',24);shake(2);try{navigator.vibrate&&navigator.vibrate(25);}catch(_){}}
      else pop(['POW!','BAM!','SBENG!','TOC!','ZAC!'][Math.floor(Math.random()*5)],x,y-10,'#f7d64a',20+Math.min(10,st.combo.n));sfx('tap');vibe();}
    else burst(x,y,4,['#cfc6e6'],50,2);};
  cv.onpointermove=e=>{if(TACT||!down||!st.slash)return;const[x,y]=toXY(e);moved+=Math.hypot(x-lastP[0],y-lastP[1]);const[x0,y0]=lastP;lastP=[x,y];st.slash.pts.push([x,y]);if(st.slash.pts.length>14)st.slash.pts.shift();st.slash.age=0;
    if(moved<26||st.slash.hit.size>=6)return;
    cur.zs.forEach(z=>{if(z.state==='flee'||z.under||st.slash.hit.has(z))return;const sc=ZT[z.ty].s,cx=z.x,cy=LANES[z.lane]-60*sc;
      const vx=x-x0,vy=y-y0,l2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((cx-x0)*vx+(cy-y0)*vy)/l2));const d=Math.hypot(x0+vx*t-cx,y0+vy*t-cy);
      if(d<30*sc+10&&(st.en??100)>=5){st.en-=5;st.slash.hit.add(z);comboUp();objAdd('slash');hitZ(z,tapDmg*.7,'tap');pop('SLASH!',cx-14,cy-30,'#fff',16);}});
    if(st.slash.hit.size>=3&&!st.slash.multi){st.slash.multi=1;pop(`TRIPLO!`,x-20,y-30,'#f7d64a',24);sfx('coin');}};
  cv.onpointerup=cv.onpointercancel=()=>{down=false;};
  if(!G.hintShown){G.hintShown=1;setTimeout(()=>{if(!st.stop)cap(TACT?'Tattica: gioca le carte con le provviste (scegli la corsia), tocca uno zombie per farlo diventare il bersaglio dei difensori.':'Suggerimento: tocca la TESTA per un colpo critico, trascina il dito per colpirne tanti insieme.');},INTRO*1000+400);}
  function openCrate(){const c=st.crate;if(!c)return;st.crate=null;st.crateT=15+Math.random()*8;medal('cassa');sfx('coin');burst(c.x,c.y,16,['#c9a36b','#f7d64a','#fff'],140,4);
    const r=Math.random();if(r<.3){G.coins+=40;pop('+40 🪙',c.x-20,c.y-20,'#f7d64a',20);}else if(r<.55){Object.keys(st.cd).forEach(k=>st.cd[k]=0);pop('ATTREZZI CARICHI!',c.x-60,c.y-20,'#9fd3e6',18);}
    else if(r<.8){cur.hp=Math.min(cur.max,cur.hp+cur.max*.25);pop('EDIFICIO +25%',c.x-30,c.y-20,'#6fb59a',18);}else{st.power=8;pop('SUPERPUGNO x2!',c.x-50,c.y-20,'#d7263d',20);}}
  /* attrezzi: agiscono sull'edificio che stai difendendo */
  const USE={
    petardo:lv=>{const lane=busiest();alive().filter(z=>z.lane===lane).forEach(z=>hitZ(z,2+lv+Math.floor(L/3),'pet'));pop('BOOM!',300,LANES[lane]-40,'#d7263d',34);shake(7);sfx('boom');burst(300,LANES[lane]-30,22,['#d7263d','#f7d64a','#fff'],180,4);},
    sirena:lv=>{st.slow=3+lv;pop('UIIIUUU!',260,120,'#d7263d',28);cap('Sirena: tutta l’orda del quartiere rallenta!');},
    idrante:lv=>{const lane=busiest();alive().filter(z=>z.lane===lane).forEach(z=>{z.x=Math.min(490,z.x+90+lv*30);z.stun=1+lv*.4;});cur.splash={lane,t:.8};pop('SPLASSH!',290,LANES[lane]-50,'#9fd3e6',30);},
    faro:lv=>{alive().forEach(z=>z.stun=Math.max(z.stun,1.6+lv*.6));st.flashAll=.35;pop('FLASH!',220,110,'#fff',36);},
    rete:lv=>{[0,1,2].forEach(l=>{const z=alive().filter(z=>z.lane===l).sort((a,b)=>a.x-b.x)[0];if(z){z.stun=Math.max(z.stun,3+lv);z.net=3+lv;}});pop('ZAC!',230,150,'#f7d64a',28);},
    fumo:lv=>{const lane=busiest();alive().filter(z=>z.lane===lane).forEach(z=>{z.conf=2.2+lv*.6;});cur.smoke={lane,t:2.2+lv*.6};pop('PUFF!',300,LANES[lane]-50,'#c9b8ff',30);},
    stereo:lv=>{alive().forEach(z=>{z.dance=2.5+lv;});pop('♪ BUM CHA ♪',170,110,'#f7d64a',26);}
  };
  app.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const id=b.dataset.use;if((st.cd[id]||0)>0||st.end)return;const tl=TOOLS.find(x=>x.id===id);const lv=G.tools[id];USE[id](lv);st.cd[id]=toolCd(tl,lv);vibe();objAdd('tool');});
  /* abilità della casa: cambia con l'edificio che difendi */
  st.habCd={};
  const pickT=(s,lane)=>{const m=st.mark;if(m&&s.zs.includes(m)&&m.state!=='flee'&&!m.under&&m.hp>0&&(lane==null||m.lane===lane))return m;return s.zs.filter(z=>z.state!=='flee'&&!z.under&&z.x<470&&(lane==null||z.lane===lane)).sort((p,q)=>p.x-q.x)[0];};
  const CARDS={trap:{n:'Trappole',ic:'🪤',c:3,lane:1},tur:{n:'Torretta',ic:'🎯',c:5,lane:1},rinf:{n:'Rinforzo',ic:'🧑‍🚒',c:4,lane:1},rip:{n:'Ripara',ic:'🔨',c:3},
    petardo:{n:'Petardo',ic:'💥',c:3},sirena:{n:'Sirena',ic:'📢',c:4},idrante:{n:'Idrante',ic:'🚿',c:4},faro:{n:'Faro',ic:'🔆',c:5},rete:{n:'Rete',ic:'🕸️',c:3},fumo:{n:'Fumogeno',ic:'🌫️',c:3},stereo:{n:'Stereo',ic:'🎵',c:6}};
  const deck=['trap','tur','rinf','rip',...TOOLS.filter(t=>G.tools[t.id]).map(t=>t.id)].sort(()=>Math.random()-.5);
  st.hand=deck.splice(0,4);st.queue=deck;const sLv=(!coop&&typeof scudoLv==='function')?scudoLv():0;st.pv=Math.min(10,6+Math.floor(sLv/2));if(sLv){sites.forEach(x=>{if(x.main){x.barMax*=1+sLv*.08;x.bar=x.barMax;}});}st.sel=null;
  const cost=k=>Math.max(1,CARDS[k].c-((st.disc||0)>0?1:0));
  function comboKill(z,s){st.pv=Math.min(10,(st.pv??0)+.25);st.kc=(st.t-(st.klast??-9)<1.8)?(st.kc||0)+1:1;st.klast=st.t;
    const B={3:1,5:2,8:3,12:4}[st.kc];if(B&&s===cur){st.pv=Math.min(10,st.pv+B);pop(`COMBO ×${st.kc} · +${B} PROVVISTE`,140,70,'#f7d64a',22);shake(4);sfx('coin');vibe();}}
  const BOONS=[['📦','Scorte extra','+4 provviste subito',()=>{st.pv=Math.min(10,(st.pv??0)+4);}],
    ['🎯','Torretta fissa','Una torretta resta fino alla fine della notte sulla corsia più affollata',()=>{const l=[0,1,2].sort((a,b)=>cur.zs.filter(z=>z.lane===b).length-cur.zs.filter(z=>z.lane===a).length)[0];cur.lu=cur.lu||[];cur.lu.push({k:'tur',lane:l,t:999,cd:.2});}],
    ['🪵','Barricata d’acciaio','Barricata riparata e +50% di resistenza',()=>{cur.barMax*=1.5;cur.bar=cur.barMax;}],
    ['⚡','Mani veloci','Tutte le carte costano 1 in meno per 25 secondi',()=>{st.disc=25;}],
    ['🔭','Mirino','Il bersaglio segnato prende il doppio dei danni',()=>{st.markx=2;}],
    ['🧑‍🤝‍🧑','Vicini in aiuto','Un rinforzo su ogni corsia per 15 secondi',()=>{cur.lu=cur.lu||[];[0,1,2].forEach(l=>cur.lu.push({k:'rinf',lane:l,t:15,cd:.3}));}],
    ['🪤','Campo minato','3 trappole su ogni corsia',()=>{cur.lt=cur.lt||[0,0,0];cur.lt=cur.lt.map(n=>n+3);}]];
  function showBoon(){st.pause=true;sfx('horn');const pick=BOONS.slice().sort(()=>Math.random()-.5).slice(0,3);
    const o=document.createElement('div');o.id='boon';o.innerHTML=`<div class="bbox"><b class="disp">Metà notte! Arrivano rifornimenti</b><small>Scegline uno: cambia il resto della battaglia</small><div class="bopts">${pick.map((b,i)=>`<button data-boon="${i}"><span>${b[0]}</span><b>${b[1]}</b><small>${b[2]}</small></button>`).join('')}</div></div>`;
    document.body.appendChild(o);o.querySelectorAll('[data-boon]').forEach(btn=>btn.onclick=()=>{const b=pick[+btn.dataset.boon];b[3]();o.remove();st.pause=false;pop(b[1].toUpperCase()+'!',150,110,'#f7d64a',24);vibe();renderHand();});}
  function playCard(k,lane){const C=CARDS[k];const cc=cost(k);if((st.pv??0)<cc){toast('Provviste insufficienti');return;}
    st.pv-=cc;if(lane!=null)st.lf={lane,t:.5};st.sel=null;cur.lt=cur.lt||[0,0,0];cur.lu=cur.lu||[];
    if(k==='trap'){cur.lt[lane]+=3;pop('TRAPPOLE PRONTE',BX,LANES[lane]-60,'#c9a36b',16);}
    else if(k==='tur'){cur.lu.push({k:'tur',lane,t:20,cd:.3});pop('TORRETTA!',BX+20,LANES[lane]-70,'#9fd3e6',18);}
    else if(k==='rinf'){cur.lu.push({k:'rinf',lane,t:16,cd:.2});pop('RINFORZI!',BX,LANES[lane]-70,'#6fb59a',18);}
    else if(k==='rip'){cur.bar=Math.min(cur.barMax,cur.bar+cur.barMax*.35);cur.hp=Math.min(cur.max,cur.hp+cur.max*.08);pop('RIPARATA!',BX-10,140,'#6fb59a',20);}
    else USE[k](G.tools[k]||1);
    const i=st.hand.indexOf(k);st.hand.splice(i,1);st.queue.push(k);st.hand.push(st.queue.shift());objAdd('card');sfx('coin');vibe();renderHand();}
  function renderHand(){const h=$('#hand');if(!h)return;const nx=st.queue[0];
    const sig=st.hand.join(',')+'|'+st.sel+'|'+nx+'|'+((st.disc||0)>0);
    if(h.dataset.sig===sig){h.querySelectorAll('[data-card]').forEach(b=>b.classList.toggle('no',(st.pv??0)<cost(b.dataset.card)));return;}
    h.dataset.sig=sig;
    h.innerHTML=st.hand.map(k=>{const C=CARDS[k];const ok=(st.pv??0)>=cost(k);return`<button class="card ${ok?'':'no'} ${st.sel===k?'sel':''}" data-card="${k}"><span class="cc ${cost(k)<C.c?'disc':''}">${cost(k)}</span><span class="ic">${C.ic}</span><span class="nm">${C.n}</span>${C.lane?'<small>su corsia</small>':''}</button>`;}).join('')+(nx?`<div class="nextc"><small>Poi</small><span>${CARDS[nx].ic}</span></div>`:'');
    h.querySelectorAll('[data-card]').forEach(b=>{b.onclick=()=>{if(st.dragUsed){st.dragUsed=0;return;}const k=b.dataset.card,C=CARDS[k];if((st.pv??0)<cost(k)){toast('Provviste insufficienti');return;}if(C.lane){st.sel=st.sel===k?null:k;renderHand();}else playCard(k);};
      b.onpointerdown=e=>{const k=b.dataset.card;if(!CARDS[k].lane||(st.pv??0)<cost(k))return;const x0=e.clientX,y0=e.clientY;let g=null;
        const mv=ev=>{if(!g&&Math.hypot(ev.clientX-x0,ev.clientY-y0)>12){g=document.createElement('div');g.className='dragc';g.textContent=CARDS[k].ic;document.body.appendChild(g);st.sel=k;}if(g){g.style.left=ev.clientX+'px';g.style.top=ev.clientY+'px';}};
        const up=ev=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);if(!g)return;g.remove();st.dragUsed=1;const r=cv.getBoundingClientRect();
          if(ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom){const y=(ev.clientY-r.top)/r.height*300;const lane=[0,1,2].sort((a,c)=>Math.abs(LANES[a]-20-y)-Math.abs(LANES[c]-20-y))[0];playCard(k,lane);}else{st.sel=null;renderHand();}setTimeout(()=>{st.dragUsed=0;},350);};
        document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);};});}
  window.__rh=renderHand;renderHand();
  if(sites.length<2){const r=app.querySelector('.radar');if(r)r.hidden=true;app.querySelectorAll('.battle p.muted').forEach(p=>{if(/mappa/i.test(p.textContent))p.hidden=true;});document.body.classList.add('onesite');st.clip=matchMedia('(orientation:portrait)').matches;const c=$('#cv');if(c&&c.parentElement)c.parentElement.classList.add('cvclip');app.querySelectorAll('p,small,div').forEach(e=>{if(!e.children.length&&/^Tocca un edificio sulla mappa/.test(e.textContent.trim()))e.hidden=true;});}else document.body.classList.remove('onesite');
  {const hb=$('#helpB');if(hb)hb.onclick=()=>openRules();
   const pb=$('#pauseB');if(pb)pb.onclick=()=>{vibe();openSheet('⏸ Pausa',`<div class="pmenu"><button class="btn wide" data-p="go">▶ Riprendi</button><button class="btn wide ghost" data-p="help">📖 Come si gioca</button><button class="btn wide ghost" data-p="snd">${G.mute?'🔇 Suoni spenti':'🔊 Suoni accesi'}</button><button class="btn wide ghost" data-p="mus">🎵 Musica</button><button class="btn wide ghost" data-p="fs">⤢ Schermo intero</button><button class="btn wide alt" data-p="quit">🏳️ Esci dalla battaglia</button></div>`,card=>{
     card.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const k=b.dataset.p;if(k==='go')return closeSheet();if(k==='help')return openRules();
       if(k==='snd'){$('#muteBtn').click();b.textContent=G.mute?'🔇 Suoni spenti':'🔊 Suoni accesi';return;}if(k==='mus'){app.querySelector('[data-music]').click();return;}if(k==='fs'){closeSheet();$('#fsBtn').click();return;}if(k==='quit'){closeSheet();$('#quit').click();}});});};}
  st.prep=true;st.en=100;
  const PTS=2+Math.floor(L/2)+(typeof presHeld==='function'?presHeld():0);
  const plan={};sites.forEach(x=>plan[x.id]={bar:0,trap:0,tur:0});
  function planUsed(){return Object.values(plan).reduce((a,p)=>a+p.bar+p.trap+p.tur,0);}
  function startWave(){if(!st.prep)return;st.prep=false;closeSheet();
    if(typeof dayInit==='function'){dayInit();const K=G.kit;const main=sites.find(x=>x.main)||sites[0];const by={};queue.forEach(q=>{by[q.site.id]=(by[q.site.id]||0)+1;});const hot=sites.slice().sort((a,b)=>(by[b.id]||0)-(by[a.id]||0))[0];
      if(K.trap){hot.trapsK=(hot.trapsK||0)+3*K.trap;}if(K.bar){main.barMax=Math.round(main.barMax*(1+.4*K.bar));main.bar=main.barMax;}if(K.tur){main.turretK=(main.turretK||0)+K.tur;}if(K.med){main.max=Math.round(main.max*(1+.25*K.med));main.hp=main.max;}
      if(K.trap||K.bar||K.tur||K.med)setTimeout(()=>cap(`Kit del laboratorio montati: ${K.trap?'🪤×'+K.trap+' ':''}${K.bar?'🪵×'+K.bar+' ':''}${K.tur?'🎯×'+K.tur+' ':''}${K.med?'⛑️×'+K.med:''}`),INTRO*1000+300);
      G.kit={trap:0,bar:0,tur:0,med:0};}
    sites.forEach(x=>{const p=plan[x.id];if(p.bar){x.barMax=Math.round(x.barMax*(1+.4*p.bar));x.bar=x.barMax;}x.traps=p.trap*3+(x.trapsK||0);x.turret=p.tur+(x.turretK||0);});
    setTimeout(()=>sfx('horn'),100);
    if(TACT&&!G.tutDone&&!coop){st.pause=true;st.pv=10;renderHand();setTimeout(()=>coach(st,0),250);}}
  window.__planSheet=function planSheet(){st.prepOpened=true;const by={};queue.forEach(q=>{by[q.site.id]=(by[q.site.id]||0)+1;});const types={};queue.forEach(q=>{types[q.ty]=(types[q.ty]||0)+1;});
    const TN={walker:'🧟 vaganti',runner:'🏃 corridori',brute:'💪 bruti',casco:'⛑️ col casco',strillone:'📣 strilloni',scavatore:'⛏️ scavatori',oro:'✨ d’oro',boss:'👑 boss'};
    const left=PTS-planUsed();
    openSheet(`🛡️ Piano di difesa · ondata ${L}`,`<div class="scout"><b>Ricognizione</b><span>${Object.entries(types).map(([k,n])=>`${TN[k]||k} ${n}`).join(' · ')}</span>${ev?`<span>Evento: ${EVENTS[ev].n}</span>`:''}</div>
      ${G.kit&&(G.kit.trap||G.kit.bar||G.kit.tur||G.kit.med)?`<div class="notice" style="margin-bottom:8px">🧪 Dal laboratorio, montati in automatico: ${G.kit.trap?'🪤 kit trappole ×'+G.kit.trap+' ':''}${G.kit.bar?'🪵 barricata ×'+G.kit.bar+' ':''}${G.kit.tur?'🎯 torretta ×'+G.kit.tur+' ':''}${G.kit.med?'⛑️ kit medico ×'+G.kit.med:''}</div>`:''}
      <div class="ppts">Punti difesa: <b>${left}</b> su ${PTS}<small>Ogni punto: 🪵 barricata +40% · 🪤 3 trappole · 🎯 una torretta</small></div>
      ${sites.slice().sort((a,b)=>(by[b.id]||0)-(by[a.id]||0)).map(x=>{const p=plan[x.id];return`<div class="prow"><div class="pn"><b>${x.ic} ${esc(x.short)}</b><small>🧟 ${by[x.id]||0} in arrivo · difensori ${x.def?x.def.length:0}</small></div>
        <div class="pbtns">${[['bar','🪵'],['trap','🪤'],['tur','🎯']].map(([k,i])=>`<button data-pk="${x.id}:${k}:-1" ${p[k]?'':'disabled'}>−</button><span>${i}${p[k]}</span><button data-pk="${x.id}:${k}:1" ${left>0&&p[k]<3?'':'disabled'}>+</button>`).join('')}</div></div>`;}).join('')}
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn ghost small" data-pauto>Piano automatico</button><button class="btn wide" data-pgo>Avvia l’ondata</button></div>
      <p class="muted" style="font-size:12px;margin-top:6px">L’orda punta agli edifici più deboli. Per saltare questo passo: “Avvio rapido” nella scheda delle notti.</p>`,
    card=>{card.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>{const[id,k,d]=b.dataset.pk.split(':');const p=plan[id];const nv=p[k]+(+d);if(nv<0||nv>3||(+d>0&&planUsed()>=PTS))return;p[k]=nv;vibe();planSheet();});
      card.querySelector('[data-pauto]').onclick=()=>{Object.values(plan).forEach(p=>{p.bar=p.trap=p.tur=0;});const ord=sites.slice().sort((a,b)=>(by[b.id]||0)-(by[a.id]||0));let k=0;const seq=['trap','bar','tur'];for(let i=0;i<PTS;i++){const x=ord[k%ord.length];const p=plan[x.id];const t=seq[Math.floor(i/ord.length)%3];if(p[t]<3)p[t]++;k++;}planSheet();};
      card.querySelector('[data-pgo]').onclick=()=>startWave();
      if(G.quick!==false&&!coop&&G.tutDone&&!st.quickDone){st.quickDone=1;setTimeout(()=>{const a=card.querySelector('[data-pauto]');if(a)a.click();startWave();},0);}});};
  setTimeout(()=>window.__planSheet(),300);
  const alv=()=>cur.zs.filter(z=>z.state!=='flee'&&!z.under);
  const HABFX={
    condominio:()=>{st.habBuff={t:6,k:'cond'};pop('CONDÒMINI IN AZIONE!',120,90,'#f7d64a',22);cur.def=(cur.def||[]);for(let i=0;i<3;i++){const tgt=alv().sort((p,q)=>p.x-q.x)[i];if(tgt)hitZ(tgt,2.5,'ally');}},
    cane:()=>{const lane=[0,1,2].map(l=>alv().filter(z=>z.lane===l).length);const l=lane.indexOf(Math.max(...lane));alv().filter(z=>z.lane===l).forEach(z=>{z.x=Math.min(495,z.x+90);z.stun=Math.max(z.stun||0,1.2);hitZ(z,1,'ally');});st.habRun={lane:l,x:HX,t:1.2,ic:'🐕'};pop('WOOF!',220,LANES[l]-60,'#fff',26);},
    carro:()=>{const lane=[0,1,2].map(l=>alv().filter(z=>z.lane===l).length);const l=lane.indexOf(Math.max(...lane));alv().filter(z=>z.lane===l).forEach(z=>{z.x=Math.min(495,z.x+160);hitZ(z,2,'ally');});st.habRun={lane:l,x:HX,t:1.4,ic:'🚜'};pop('BRUUUM!',200,LANES[l]-60,'#f7d64a',26);shake(5);},
    valanga:()=>{alv().forEach(z=>{hitZ(z,2,'ally');z.stun=Math.max(z.stun||0,2);});st.flashAll=.5;pop('VALANGA!',170,100,'#fff',32);shake(6);},
    faro:()=>{alv().forEach(z=>z.stun=Math.max(z.stun||0,3));st.flashAll=.6;pop('FASCIO DEL FARO!',140,100,'#f7d64a',26);},
    onda:()=>{alv().forEach(z=>{z.x=Math.min(495,z.x+70);z.stun=Math.max(z.stun||0,1);});st.splashAll=1;pop('ONDATA D’ACQUA!',140,100,'#9fd3e6',24);},
    clacson:()=>{alv().forEach(z=>{z.x=Math.min(495,z.x+50);z.stun=Math.max(z.stun||0,1.5);});pop('PEEEEP!',180,100,'#f7d64a',30);sfx('horn');},
    vicini:()=>{const n=Math.max(1,(window.__vic||[]).length);const k=Math.min(10,3+n*2);alv().sort((p,q)=>p.x-q.x).slice(0,k).forEach(z=>{hitZ(z,2.5,'ally');z.stun=Math.max(z.stun||0,.8);});
      st.habBuff={t:6,k:'cond'};pop((window.__vic||[]).slice(0,2).map(v=>'@'+v).join(' e ')+(n>2?' E ALTRI':'')+' ARRIVANO!',110,90,'#c9b8ff',20);sfx('horn');},
    idranti:()=>{alv().forEach(z=>{z.x=Math.min(495,z.x+85);z.stun=Math.max(z.stun||0,1.3);});st.splashAll=1;pop('IDRANTI DELLA VIA!',130,100,'#9fd3e6',24);shake(3);},
    campane:()=>{alv().forEach(z=>{z.stun=Math.max(z.stun||0,2.3);});st.flashAll=.25;pop('CAMPANE A MARTELLO!',120,100,'#f7d64a',24);sfx('horn');},
    fiume:()=>{alv().filter(z=>z.lane===2).forEach(z=>{z.x=Math.min(495,z.x+150);hitZ(z,1.5,'ally');});alv().filter(z=>z.lane!==2).forEach(z=>{z.x=Math.min(495,z.x+50);});st.splashAll=1;pop('PIENA DEL FIUME!',140,100,'#6fb3e6',24);},
    collina:()=>{const t=alv().sort(()=>Math.random()-.5).slice(0,7);t.forEach(z=>{hitZ(z,2.2,'ally');z.stun=Math.max(z.stun||0,1.5);});pop('SASSI DALLA COLLINA!',130,90,'#c9a36b',24);shake(5);},
    pigne:()=>{const t=alv().sort(()=>Math.random()-.5).slice(0,6);t.forEach(z=>hitZ(z,2.5,'ally'));pop('PIGNE DALL’ALTO!',140,90,'#c9a36b',24);}
  };
  window.__hab=()=>{const h=habOf(cur);if((st.habCd[cur.id]||0)>0||st.end)return;HABFX[h.k]();st.habCd[cur.id]=h.cd;vibe();sfx('win');objAdd('hab');};
  $('#hab').onclick=()=>window.__hab();
  function updHab(force){const b=$('#hab');if(!b)return;const h=habOf(cur);const c=st.habCd[cur.id]||0;if(force||b.dataset.k!==h.k){b.dataset.k=h.k;b.querySelector('.ic').textContent=h.ic;}
    b.querySelector('.nm').textContent=c>0?Math.ceil(c)+' s':h.n;b.classList.toggle('cool',c>0);b.querySelector('.cdv').style.height=(c/h.cd*100)+'%';}
  /* obiettivo dell'ondata */
  const OBJS=[{k:'crit',n:'Fai 6 colpi critici',goal:6,g:6},{k:'tool',n:'Usa 3 attrezzi',goal:3,g:5},{k:'hab',n:'Usa 2 abilità delle case',goal:2,g:6},{k:'slash',n:'Colpisci 12 zombie trascinando il dito',goal:12,g:6},{k:'switch',n:'Difendi 3 edifici diversi',goal:3,g:5},{k:'drop',n:'Raccogli 3 bottini',goal:3,g:5}];
  const OBJT=[{k:'card',n:'Gioca 8 carte',goal:8,g:6},{k:'mark',n:'Segna 6 bersagli',goal:6,g:5},{k:'trap',n:'Ferma 6 zombie con le trappole',goal:6,g:6},{k:'hab',n:'Usa 2 abilità delle case',goal:2,g:6},{k:'switch',n:'Difendi 3 edifici diversi',goal:3,g:5},{k:'drop',n:'Raccogli 3 bottini',goal:3,g:5}];
  const OB=TACT?OBJT:OBJS;st.obj={...OB[Math.floor(Math.random()*OB.length)],c:0,done:false,seen:new Set()};
  if(sites.length<3&&st.obj.k==='switch')st.obj={...OB[0],c:0,done:false,seen:new Set()};
  window.objAdd=(k,v=1)=>{const o=st.obj;if(!o||o.done||o.k!==k)return;o.c+=v;if(o.c>=o.goal){o.done=true;G.gems+=o.g;pop(`OBIETTIVO! +${o.g} 💎`,130,70,'#9fd3e6',24);sfx('win');}};
  const sendSOS=(s,auto)=>{if(!G.friends.length)return;const on=G.friends.filter(f=>f.on);
    toast(`📣 Notifica inviata a ${G.friends.length} amici: «${coop?'Il quartiere di @'+coop.nick:s.name} è sotto assedio${coop?'':' all’ondata '+L}!»`);
    setTimeout(()=>{if(st.stop)return;const f=on.filter(x=>!coop||x.id!==coop.id)[Math.floor(Math.random()*on.length)];if(!f){cap('Nessun amico online ora: la notifica li aspetta');return;}
      s.live={f,t:18,cd:0,lane:1};cap(`@${f.nick} scende in campo a ${s.short}!`);if(s===cur)pop(`ARRIVA @${f.nick.toUpperCase()}!`,150,150,'#f7d64a',18);sfx('horn');},auto?4200:1800);};
  const sosB=$('#aSos');if(sosB)sosB.onclick=()=>{if(st.sosUsed||st.end)return;st.sosUsed=true;sosB.classList.add('cool');sosB.querySelector('.nm').textContent='Inviato';cur.sos=true;sendSOS(cur,false);};
  $('#aFix').onclick=()=>{if(G.gems<20){toast('Servono 20 gemme: le trovi in Bottega');return;}G.gems-=20;cur.hp=cur.max;cur.bar=cur.barMax;pop('RIPARATO!',80,90,'#6fb59a',24);};
  /* ciclo */
  let last=performance.now();
  function siteStep(s,dt,sp){
    if(s.lost)return;
    if(s.lt)s.zs.forEach(z=>{if(s.lt[z.lane]>0&&!z.trapped&&z.state!=='flee'&&!z.under&&z.x<BX+90){z.trapped=1;s.lt[z.lane]--;z.stun=Math.max(z.stun||0,2.6);hitZ(z,3,'ally',s);objAdd('trap');if(s===cur)pop('TRAPPOLA!',z.x-24,LANES[z.lane]-70,'#c9a36b',18);}});
    (s.lu||[]).forEach(u=>{u.t-=dt;u.cd-=dt;if(u.cd<=0){const tg=pickT(s,u.lane);if(tg){s.shots.push({x:HX+(u.k==='tur'?60:34),y:LANES[u.lane]-(u.k==='tur'?62:44),tgt:tg,dmg:u.k==='tur'?1.6:1.2});u.cd=u.k==='tur'?.75:.9;}}});
    if(s.lu)s.lu=s.lu.filter(u=>u.t>0);
    if(s.turret){s.turT=(s.turT||0)-dt;if(s.turT<=0){const tgt=pickT(s);if(tgt){s.shots.push({x:HX+50,y:LANES[1]-70,tgt,dmg:1.3});s.turT=1.15/s.turret;}}}
    if(s.traps>0)s.zs.forEach(z=>{if(s.traps>0&&!z.trapped&&z.state!=='flee'&&!z.under&&z.x<BX+75){z.trapped=1;s.traps--;z.stun=Math.max(z.stun||0,2.4);hitZ(z,2.5,'ally',s);if(s===cur)pop('TRAPPOLA!',z.x-24,LANES[z.lane]-70,'#c9a36b',18);}});
    /* difensori di chi ci abita */
    s.def.forEach((a,i)=>{s.allyT[i]=(s.allyT[i]||0)-dt;if(s.allyT[i]<=0){const tgt=pickT(s);if(tgt){s.shots.push({x:HX+30,y:LANES[a.lane]-46,tgt,dmg:a.lv*.9});s.allyT[i]=Math.max(.6,1.9-a.lv*.25);}}});
    if(s.live){const lv=s.live;lv.t-=dt;lv.cd-=dt;if(lv.cd<=0){const tgt=pickT(s);if(tgt){s.shots.push({x:HX+40,y:LANES[1]-50,tgt,dmg:2+fLv(lv.f)});lv.cd=.45;}}if(lv.t<=0){s.live=null;}}
    s.shots=s.shots.filter(o=>{o.x+=260*dt;if(o.tgt.state==='flee'||o.x>=o.tgt.x-6){if(o.tgt.state!=='flee'){hitZ(o.tgt,o.dmg,'ally',s);if(s===cur)pop('TOC!',o.x,o.y,'#fff',13);}return false;}return o.x<490;});
    let attacking=false;
    s.zs.forEach(z=>{const b=ZT[z.ty];z.flash=Math.max(0,z.flash-dt);z.ph+=dt*6;
      if(z.state==='flee'){z.x+=110*dt;z.alpha=(z.alpha??1)-dt*.8;return;}
      if(z.net>0)z.net-=dt;
      if(z.dance>0){z.dance-=dt;z.ph+=dt*10;return;}
      if(z.stun>0){z.stun-=dt;return;}
      if(z.conf>0){z.conf-=dt;z.x=Math.min(495,z.x+b.sp*.8*dt);z.state='walk';return;}
      if(z.ty==='oro'){z.x-=b.sp*sp*dt;z.state='walk';if(z.x<BX){z.state='flee';z.alpha=0;}return;}
      if(z.ty==='strillone'){z.scream-=dt;if(z.scream<=0){z.scream=5;if(s===cur)pop('AAARGH!',z.x-20,LANES[z.lane]-70,'#f08a4b',16);s.zs.forEach(o=>{if(o!==z&&Math.abs(o.x-z.x)<90)o.rage=2;});}}
      if(z.ty==='boss'){z.summon-=dt;if(z.summon<=0){z.summon=6;[0,2].forEach(l=>s.zs.push({ty:'walker',lane:l,x:z.x+20,hp:ZT.walker.hp*hpMul,max:ZT.walker.hp*hpMul,state:'walk',ph:0,flash:0,stun:0}));}}
      if(z.under&&z.x<BX+70){z.under=false;if(s===cur)burst(z.x,LANES[z.lane]-6,12,['#8a5a34','#5a3b24'],90,5,'dust');}
      if(z.rage>0)z.rage-=dt;
      const stopX=s.bar>0?BX+18:HX+6;
      if(z.x>stopX){z.x-=b.sp*spMul*sp*(z.rage>0?1.45:1)*(z.under?1.2:1)*(z.noSlope?1:(s.slope||1))*(z.spMul||1)*dt;z.state='walk';}
      else{z.state='attack';attacking=true;const dmg=b.dps*(1+(L-1)*.1)*D.sp*dt;
        if(s.bar>0){s.bar-=dmg;if(s.bar<=0){s.bar=0;if(s===cur){pop('CRAAK!',BX,150,'#d7263d',26);shake(5);}sfx('crack');if(s!==cur)cap(`La barricata di ${s.short} è caduta!`);}}
        else s.hp-=dmg*(1-(s.home?armorHome:Math.min(.5,(s.fort||0)*.12)));}});
    s.zs=s.zs.filter(z=>!(z.state==='flee'&&(z.x>500||z.alpha<=0)));
    s.alert=attacking?1:Math.max(0,s.alert-dt);
    if(!s.sos&&s.hp<s.max*.4&&G.friends.length&&!s.lost){s.sos=true;sendSOS(s,true);}
    if(s.hp<=0&&!s.lost){s.lost=true;s.zs=[];s.hp=0;st.lostN++;sfx('lose');shake(6);
      if(s.main&&!coop){cap('La tua casa è caduta!');}else if(s.main&&coop){cap(`La casa di @${coop.nick} è caduta!`);}else cap(`💀 Hai perso: ${s.name}`);
      if(s===cur){const nx=sites.find(x=>!x.lost);if(nx)cur=nx;}renderChips();}
  }
  function frame(now){
    if(st.stop)return;
    if(st.pause||(!st.prep&&document.querySelector('#sheet.open'))){last=now;draw();drawMM();requestAnimationFrame(frame);return;}
    if(st.prep){last=now;if(st.prepOpened&&!document.querySelector('#sheet.open'))startWave();draw();drawMM();requestAnimationFrame(frame);return;}
    const dt0=Math.min(.05,(now-last)/1000);last=now;st.slowmo=Math.max(0,(st.slowmo||0)-dt0);const dt=st.slowmo>0?dt0*.35:dt0;st.t+=dt;
    st.frenzy=Math.max(0,(st.frenzy||0)-dt);if(TACT){st.disc=Math.max(0,(st.disc||0)-dt);if(st.lf)st.lf.t-=dt;if(!coop&&!st.boonDone&&st.arrived>queue.length*.5&&st.t>8){st.boonDone=1;showBoon();}st.pv=Math.min(10,(st.pv??6)+(.78+(typeof presHeld==='function'?presHeld()*.05:0))*dt);if((st.handT=(st.handT||0)+dt)>.25){st.handT=0;renderHand();}}st.en=Math.min(100,(st.en??100)+(st.frenzy>0?60:24)*dt);Object.keys(st.habCd||{}).forEach(k=>st.habCd[k]=Math.max(0,st.habCd[k]-dt));if(st.habRun){st.habRun.t-=dt;st.habRun.x+=380*dt;if(st.habRun.t<=0)st.habRun=null;}st.drops=(st.drops||[]).filter(d=>{d.life-=dt;return d.life>0;});if(st.slash)st.slash.age+=dt;
    if(st.t>INTRO){st.qteT=(st.qteT??18)-dt;if(st.qte){st.qte.t-=dt;if(st.qte.t<=0){st.qte=null;st.qteT=20+Math.random()*10;}}else if(st.qteT<=0&&cur.bar>0&&cur.bar<cur.barMax*.8){st.qte={t:3.5,taps:0};cap('🔨 La barricata scricchiola: toccala più volte per ripararla!');sfx('crack');}}
    st.power=Math.max(0,st.power-dt);st.intro=Math.max(0,st.intro-dt);st.shake=Math.max(0,st.shake-dt*14);st.combo.t=Math.max(0,st.combo.t-dt);if(st.combo.t===0)st.combo.n=0;
    st.clouds.forEach(c=>{c.x-=c.v*dt;if(c.x<-80)c.x=520;});
    st.parts=st.parts.filter(p=>{p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type!=='dmg')p.vy+=160*dt;p.vx*=.96;return p.t<p.life;});
    st.coinsFly=st.coinsFly.filter(c=>{c.t+=dt*1.6;return c.t<1;});
    if(st.t>INTRO){st.crateT-=dt;if(!st.crate&&st.crateT<=0){st.crate={x:200+Math.random()*240,y:-20,ty:LANES[Math.floor(Math.random()*3)]-26,life:7};}
      if(st.crate){const c=st.crate;if(c.y<c.ty)c.y+=60*dt;else c.life-=dt;if(c.life<=0){st.crate=null;st.crateT=14+Math.random()*8;}}}
    /* arrivi dal cimitero */
    while(st.arrived<queue.length&&queue[st.arrived].arr<=st.t){const q=queue[st.arrived++];const s=q.site;if(s.lost)continue;const b=ZT[q.ty];const hpm=q.ty==='oro'?1:q.ty==='boss'?(1+(L/5-1)*.6)*D.hp:hpMul;
      s.zs.push({ty:q.ty,lane:q.lane,x:500+Math.random()*20,hp:b.hp*hpm,max:b.hp*hpm,state:'walk',ph:Math.random()*6,flash:0,stun:0,under:q.ty==='scavatore',scream:3+Math.random()*2,summon:5});try{if(window.zTerrZ)window.zTerrZ(s.zs[s.zs.length-1],s);}catch(e){}
      if(q.ty==='boss'){setMusicIntensity(2);cap(`Il Bruto della Sagra attacca ${s.short}!`);}
      if(s!==cur&&!s.warned){s.warned=true;cap(`⚠️ L’orda è arrivata a ${s.short}`);sfx('crack');}}
    Object.keys(st.cd).forEach(k=>st.cd[k]=Math.max(0,st.cd[k]-dt));st.slow=Math.max(0,st.slow-dt);st.flashAll=Math.max(0,(st.flashAll||0)-dt);
    /* servizi del quartiere e inquilini */
    bld.forEach(bd=>{if(!bd.site||bd.site.lost)return;bd.t-=dt;if(bd.t>0)return;const tg=siteBusiest();if(!tg)return;
      if(bd.k==='caserma'){const z0=tg.zs.filter(z=>z.state!=='flee');if(z0.length){const lane=z0[0].lane;z0.filter(z=>z.lane===lane).forEach(z=>{z.x=Math.min(495,z.x+80);hitZ(z,2,'pat',tg);});if(tg===cur){st.patrol={lane,x:-40};pop('NINO NINO!',200,LANES[lane]-60,'#9fd3e6',20);}}bd.t=12-bd.lv*2;}
      else if(bd.k==='vvf'){tg.zs.forEach(z=>{if(z.state!=='flee'){z.x=Math.min(495,z.x+45);z.stun=Math.max(z.stun,.5);}});if(tg===cur){st.splashAll=.6;pop('SPLASH TOTALE!',170,90,'#9fd3e6',22);}bd.t=14-bd.lv*2;}
      else if(bd.k==='farmacia'){const h=sites.filter(s=>!s.lost).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];if(h&&h.hp<h.max){h.hp=Math.min(h.max,h.hp+8*bd.lv);if(h===cur)pop('💊 +'+8*bd.lv,30,100,'#6fb59a',14);}bd.t=6;}
      else if(bd.k==='cabina'){tg.zs.forEach(z=>{if(z.state!=='flee')z.stun=Math.max(z.stun,.8);});if(tg===cur){st.flashAll=.15;pop('BZZT!',240,110,'#f7d64a',22);}bd.t=13-bd.lv*2;}});
    tenants.forEach(tn=>{const s=tn.site;if(s.lost)return;tn.t-=dt;if(tn.t>0)return;
      if(tn.k==='mecc'){if(s.bar<s.barMax){s.bar=Math.min(s.barMax,s.bar+10*tn.lv);if(s===cur)pop('🔧 +'+10*tn.lv,BX,140,'#cfc6e6',15);}tn.t=6;}
      else if(tn.k==='inf'){if(s.hp<s.max){s.hp=Math.min(s.max,s.hp+8*tn.lv);if(s===cur)pop('✚ +'+8*tn.lv,40,90,'#6fb59a',15);}tn.t=7;}
      else if(tn.k==='pomp'){s.zs.forEach(z=>{if(z.state!=='flee'){z.x=Math.min(490,z.x+30+tn.lv*10);}});if(s===cur){cur.splash={lane:1,t:.5};pop('PSSSH!',320,180,'#9fd3e6',18);}tn.t=10-Math.min(4,tn.lv);}
      else if(tn.k==='elet'){s.zs.forEach(z=>{if(z.state!=='flee')z.stun=Math.max(z.stun,.5+tn.lv*.2);});if(s===cur){st.flashAll=.12;pop('ZAP!',250,100,'#f7d64a',22);}tn.t=13-Math.min(5,tn.lv);}
      else tn.t=99;});
    if(hosp&&!st.hospUsed&&mainS.hp>0&&mainS.hp<mainS.max*.25&&!coop){st.hospUsed=true;mainS.hp=Math.max(mainS.hp,mainS.max*[0,.4,.55,.7][Math.min(3,hosp)]);cap('L’ospedale manda i soccorsi: casa salvata!');}
    if(st.patrol){st.patrol.x+=420*dt;if(st.patrol.x>520)st.patrol=null;}st.splashAll=Math.max(0,(st.splashAll||0)-dt);
    const sp=(1-slow)*(st.slow>0?.4:1)*(st.ev==='luna'?1.2:st.ev==='pioggia'?.85:1);
    sites.forEach(s=>siteStep(s,dt,sp));
    /* fine ondata */
    const left=queue.length-st.arrived+sites.reduce((a,s)=>a+(s.lost?0:s.zs.filter(z=>z.state!=='flee').length),0);
    if(!st.end&&mainS.lost){st.end=true;endBattle(false);}
    if(!st.end&&left===0){st.end=true;endBattle(true);}
    draw();drawMM();
    if((st.chipT=(st.chipT||0)+dt)>.3){st.chipT=0;updChips();}
    if(!st.stop)requestAnimationFrame(frame);else removeEventListener('resize',fit);
  }
  function updChips(){chipsEl.querySelectorAll('[data-site]').forEach(b=>{const s=sites.find(x=>x.id===b.dataset.site);b.classList.toggle('on',s===cur);b.classList.toggle('alert',s.alert>0&&s!==cur&&!s.lost);b.classList.toggle('lost',s.lost);
      b.querySelector('.sb i').style.width=Math.max(0,s.hp/s.max*100)+'%';b.querySelector('.sz').textContent=s.lost?'persa':s.zs.filter(z=>z.state!=='flee').length+' 🧟';b.querySelector('.si').textContent=s.lost?'💀':s.ic;});
    const alive0=sites.filter(s=>!s.lost).length;$('#rsum').textContent=`${alive0}/${sites.length} in piedi · ${sites.filter(s=>!s.lost&&(s.alert>0||s.zs.some(z=>z.state!=='flee'))).length} sotto attacco`;}
  function drawMM(){
    const W=340,H=300;mx.clearRect(0,0,W,H);const P=mmPos;const yy=v=>P(0,v)[1];
    const band=(y0,y1,c,lab,lc)=>{mx.fillStyle=c;mx.fillRect(0,yy(y0),W,yy(y1)-yy(y0));mx.font='11px Bangers, Impact, sans-serif';mx.fillStyle=lc||'rgba(20,15,31,.55)';mx.fillText(lab,6,yy(y0)+13);};
    band(-120,0,'#dfe7ee','MONTAGNA');band(0,205,'#cfc6e6','CENTRO');band(205,425,'#cfe6c5','PERIFERIA');band(425,620,'#f0dc9a','CAMPAGNA');band(620,680,'#3b3550','CIMITERO · DA QUI ARRIVA L’ORDA','#f3e9d2');
    mx.strokeStyle='#6fa8dc';mx.lineWidth=5;mx.beginPath();mx.moveTo(0,yy(560));mx.quadraticCurveTo(W*.45,yy(520),W,yy(545));mx.stroke();
    mx.strokeStyle='#f3e9d2';mx.lineWidth=6;mx.beginPath();const rx=P(196,0)[0];mx.moveTo(rx,0);mx.lineTo(rx,H);mx.moveTo(0,yy(205));mx.lineTo(W,yy(205));mx.moveTo(0,yy(425));mx.lineTo(W,yy(425));mx.stroke();
    mx.fillStyle='#9aa4b0';for(let i=0;i<10;i++){const x=20+i*32,y=yy(640);mx.fillRect(x,y,6,9);mx.fillRect(x-2,y+2,10,2);}
    const c0=P(CEM[0],CEM[1]);
    queue.forEach(q=>{if(q.at>st.t||q.arr<=st.t||q.site.lost)return;const k=(st.t-q.at)/(q.arr-q.at);const p=P(q.site.x,q.site.y);const x=c0[0]+(p[0]-c0[0])*k+Math.sin(q.at*7+st.t*3)*3,y=c0[1]+(p[1]-c0[1])*k;
      mx.fillStyle=q.ty==='boss'?'#f7d64a':'#d7263d';mx.strokeStyle='#140f1f';mx.lineWidth=1;mx.beginPath();mx.arc(x,y,q.ty==='boss'?5:3.2,0,7);mx.fill();mx.stroke();});
    sites.forEach(s=>{const[x,y]=P(s.x,s.y);const n=s.zs.filter(z=>z.state!=='flee').length;const r=s.home?13:11;const hp=s.hp/s.max;
      if(s.alert>0&&!s.lost){mx.fillStyle=`rgba(215,38,61,${.25+.22*Math.sin(st.t*8)})`;mx.beginPath();mx.arc(x,y,r+12,0,7);mx.fill();}
      if(s===cur){mx.strokeStyle='#f7d64a';mx.lineWidth=4;mx.beginPath();mx.arc(x,y,r+8,0,7);mx.stroke();}
      const col=s.lost?'#5a5470':hp>.6?'#3f9b5f':hp>.3?'#f7d64a':'#d7263d';
      mx.fillStyle=col;mx.strokeStyle='#140f1f';mx.lineWidth=2;mx.beginPath();mx.moveTo(x-r,y-2);mx.lineTo(x,y-r-4);mx.lineTo(x+r,y-2);mx.closePath();mx.fill();mx.stroke();
      mx.fillRect(x-r+3,y-2,2*r-6,r+2);mx.strokeRect(x-r+3,y-2,2*r-6,r+2);
      mx.font=`${s.home?12:10}px Arial`;mx.textAlign='center';mx.fillStyle='#140f1f';mx.fillText(s.lost?'💀':s.ic,x,y+r-3);
      mx.fillStyle='#140f1f';mx.fillRect(x-r,y+r+3,2*r,4);mx.fillStyle=col;mx.fillRect(x-r,y+r+3,2*r*Math.max(0,hp),4);
      if(n>0&&!s.lost){mx.fillStyle='#d7263d';mx.strokeStyle='#fff';mx.lineWidth=1.5;mx.beginPath();mx.arc(x+r+2,y-r-2,8,0,7);mx.fill();mx.stroke();mx.fillStyle='#fff';mx.font='bold 9px Arial';mx.fillText(n,x+r+2,y-r+1);}
      if(s===cur){mx.font='bold 9px Arial';const t='TU SEI QUI';const w=mx.measureText(t).width+8;mx.fillStyle='#f7d64a';mx.fillRect(x-w/2,y-r-22,w,12);mx.fillStyle='#140f1f';mx.fillText(t,x,y-r-13);}
      if(s.live){mx.fillStyle='#2f7fb8';mx.beginPath();mx.arc(x-r-3,y-r,4,0,7);mx.fill();}
      mx.textAlign='start';});
    if(sites.length===1){mx.fillStyle='rgba(20,15,31,.78)';mx.fillRect(10,yy(250),W-20,40);mx.fillStyle='#fff';mx.font='bold 10px Arial';mx.textAlign='center';mx.fillText('Difendi solo casa tua: compra edifici nel quartiere',W/2,yy(250)+17);mx.fillText('per avere più case da proteggere e da cui scegliere.',W/2,yy(250)+31);mx.textAlign='start';}
  }
  function draw(){
    const s=cur;ctx.save();if(st.shake>0)ctx.translate((Math.random()-.5)*st.shake*2,(Math.random()-.5)*st.shake*2);
    ctx.clearRect(-10,-10,500,320);const bg=bgI[s.zone];if(bg)ctx.drawImage(bg,0,0,480,300);
    st.clouds.forEach(c=>{ctx.fillStyle='rgba(207,198,230,.28)';ctx.beginPath();ctx.ellipse(c.x,c.y,34*c.s,10*c.s,0,0,7);ctx.ellipse(c.x+18*c.s,c.y-6*c.s,22*c.s,9*c.s,0,0,7);ctx.fill();});
    ctx.fillStyle=`rgba(247,214,74,${.12+.05*Math.sin(st.t*2)})`;ctx.beginPath();ctx.arc(420,40,40,0,7);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(HX/2,262,62,8,0,0,7);ctx.fill();
    if(s.img)ctx.drawImage(s.img,0,64,HX,196);
    const hp=s.hp/s.max;
    if(hp<.6){ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,150);ctx.lineTo(44,170);ctx.lineTo(36,186);ctx.moveTo(80,200);ctx.lineTo(70,214);ctx.lineTo(82,228);ctx.stroke();}
    if(hp<.3){for(let i=0;i<3;i++){const k=(st.t*.6+i/3)%1;ctx.fillStyle=`rgba(60,55,70,${.5*(1-k)})`;ctx.beginPath();ctx.arc(70+Math.sin(k*6+i)*8,90-k*60,8+k*14,0,7);ctx.fill();}ctx.fillStyle=`rgba(215,38,61,${.15+.1*Math.sin(st.t*8)})`;ctx.fillRect(0,0,480,300);}
    if(s.barI&&s.bar>0)LANES.forEach(y=>{const bp=s.bar/s.barMax;ctx.globalAlpha=.45+.55*bp;ctx.drawImage(s.barI,BX-6,y-44,44,46);ctx.globalAlpha=1;});
    s.def.forEach(a=>{if(ally)ctx.drawImage(ally,HX+2,LANES[a.lane]-62,72,54);if(a.nick){ctx.font='bold 8px Arial';ctx.fillStyle='#fff';ctx.strokeStyle='#140f1f';ctx.lineWidth=3;ctx.strokeText('@'+a.nick,HX+4,LANES[a.lane]-64);ctx.fillText('@'+a.nick,HX+4,LANES[a.lane]-64);}});
    if(s.live&&ally){const y=LANES[1];ctx.save();ctx.globalAlpha=Math.min(1,s.live.t);ctx.drawImage(ally,HX+14,y-70,84,62);ctx.font='bold 11px Arial';ctx.fillStyle='#f7d64a';ctx.strokeStyle='#140f1f';ctx.lineWidth=3;const tx='@'+s.live.f.nick+' LIVE';ctx.strokeText(tx,HX+16,y-72);ctx.fillText(tx,HX+16,y-72);ctx.restore();}
    if(s.splash&&s.splash.t>0){s.splash.t-=1/60;ctx.fillStyle='rgba(159,211,230,.55)';ctx.fillRect(BX,LANES[s.splash.lane]-34,330,30);}
    if(st.splashAll>0){ctx.fillStyle='rgba(159,211,230,.4)';LANES.forEach(y=>ctx.fillRect(BX,y-34,330,30));}
    const ord=[...s.zs].sort((p,q)=>p.lane-q.lane);
    ord.forEach(z=>{const sc=ZT[z.ty].s,y=LANES[z.lane];const im=IMG[z.ty][z.state==='flee'?1:0];
      const bob=z.dance>0?Math.sin(z.ph)*7:z.state==='walk'?Math.sin(z.ph)*2:z.state==='attack'?Math.sin(z.ph*2)*3:0;
      const tilt=z.dance>0?Math.sin(z.ph)*.25:z.state==='walk'?Math.sin(z.ph)*.06:z.state==='attack'?-.12+Math.sin(z.ph*2)*.08:z.state==='flee'?.18:0;
      const hop=z.state==='walk'?Math.abs(Math.sin(z.ph))*2.5:0;
      ctx.globalAlpha=Math.max(0,z.alpha??1);
      ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(z.x,y+3,22*sc,5*sc+1,0,0,7);ctx.fill();
      if(z.under){ctx.fillStyle='#5a3b24';ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(z.x,y-2,18,7+Math.sin(z.ph)*2,0,Math.PI,0);ctx.fill();ctx.stroke();ctx.globalAlpha=1;return;}
      if(im){ctx.save();ctx.translate(z.x+bob,y-hop);ctx.rotate(tilt);if(BIG[z.ty])ctx.drawImage(im,-60*sc,-133*sc,120*sc,140*sc);else ctx.drawImage(im,-50*sc,-118*sc,100*sc,125*sc);ctx.restore();}
      if(z.vic&&z.state!=='flee'){ctx.font='15px sans-serif';ctx.textAlign='center';ctx.fillText(z.vic,z.x+bob,y-hop-118*sc-4);}
      if(z.flash>0){ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(z.x,y-70*sc,30*sc,0,7);ctx.fill();}
      if(z.state!=='flee'){ctx.fillStyle='#140f1f';ctx.fillRect(z.x-16,y-128*sc,32,5);ctx.fillStyle='#d7263d';ctx.fillRect(z.x-15,y-127*sc,30*Math.max(0,z.hp/z.max),3);}
      if(z.rage>0){ctx.font='12px Arial';ctx.fillText('💢',z.x+12,y-112*sc);}
      if(z.stun>0&&!z.net){ctx.font='14px Arial';ctx.fillText('💫',z.x-8,y-130*sc);}
      if(z.net>0){ctx.strokeStyle='#f3e9d2';ctx.lineWidth=1.5;for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(z.x-26*sc+k*8*sc,y-110*sc);ctx.lineTo(z.x+26*sc+k*8*sc,y);ctx.stroke();ctx.beginPath();ctx.moveTo(z.x+26*sc+k*8*sc,y-110*sc);ctx.lineTo(z.x-26*sc+k*8*sc,y);ctx.stroke();}}
      if(z.dance>0){ctx.font='16px Arial';ctx.fillStyle='#f7d64a';ctx.fillText(Math.sin(z.ph)>0?'♪':'♫',z.x+10,y-120*sc+Math.sin(z.ph)*4);}
      if(z.ty==='oro'){ctx.fillStyle=`rgba(247,214,74,${.25+.2*Math.sin(st.t*10)})`;ctx.beginPath();ctx.arc(z.x,y-60*sc,34*sc,0,7);ctx.fill();}
      ctx.globalAlpha=1;});
    s.shots.forEach(o=>{ctx.strokeStyle='rgba(247,214,74,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x-16,o.y+2);ctx.lineTo(o.x,o.y);ctx.stroke();ctx.fillStyle='#f7d64a';ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,4,0,7);ctx.fill();ctx.stroke();});
    st.parts.forEach(p=>{if(p.site!==s)return;const a=1-p.t/p.life;ctx.globalAlpha=Math.max(0,a);
      if(p.type==='dmg'){ctx.font='bold 12px Arial';ctx.lineWidth=3;ctx.strokeStyle='#140f1f';ctx.strokeText(p.txt,p.x,p.y);ctx.fillStyle='#fff';ctx.fillText(p.txt,p.x,p.y);}
      else if(p.type==='dust'){ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1+p.t*2),0,7);ctx.fill();}
      else{ctx.fillStyle=p.col;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.t*8);ctx.beginPath();for(let k=0;k<8;k++){const rr=k%2?p.size*.4:p.size;ctx.lineTo(Math.cos(k*Math.PI/4)*rr,Math.sin(k*Math.PI/4)*rr);}ctx.closePath();ctx.fill();ctx.restore();}
      ctx.globalAlpha=1;});
    st.coinsFly.forEach(c=>{const tx=458,ty=14,k=c.t*c.t;const x=c.x+(tx-c.x)*k,y=c.y+(ty-c.y)*k-Math.sin(c.t*Math.PI)*40;ctx.fillStyle='#f7d64a';ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.fill();ctx.stroke();});
    if(st.patrol){const y=LANES[st.patrol.lane];ctx.save();ctx.translate(st.patrol.x,y-6);ctx.fillStyle='#2f5fb8';ctx.strokeStyle='#140f1f';ctx.lineWidth=2.5;ctx.fillRect(-26,-18,52,16);ctx.strokeRect(-26,-18,52,16);ctx.fillStyle=Math.floor(st.t*8)%2?'#d7263d':'#2f7fb8';ctx.fillRect(-4,-26,10,6);ctx.fillStyle='#140f1f';ctx.beginPath();ctx.arc(-14,-2,6,0,7);ctx.arc(14,-2,6,0,7);ctx.fill();ctx.restore();}
    if(s.smoke&&s.smoke.t>0){s.smoke.t-=1/60;ctx.fillStyle='rgba(201,184,255,.45)';for(let k=0;k<7;k++){ctx.beginPath();ctx.arc(200+k*42,LANES[s.smoke.lane]-28+Math.sin(k+st.t*3)*6,22,0,7);ctx.fill();}}
    st.pops=st.pops.filter(p=>{p.t+=1/60;if(p.t>1)return false;if(p.site!==s)return true;ctx.save();ctx.globalAlpha=1-p.t;ctx.translate(p.x,p.y-p.t*24);ctx.rotate(-.12);ctx.font=`${p.sz}px Bangers, Impact, sans-serif`;ctx.lineWidth=4;ctx.strokeStyle='#140f1f';ctx.strokeText(p.txt,0,0);ctx.fillStyle=p.col;ctx.fillText(p.txt,0,0);ctx.restore();return true;});
    if(st.crate){const c=st.crate;ctx.save();ctx.translate(c.x,c.y);if(c.y<c.ty){ctx.strokeStyle='#140f1f';ctx.lineWidth=1.5;ctx.fillStyle='#d7263d';ctx.beginPath();ctx.arc(0,-34,22,Math.PI,0);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-22,-34);ctx.lineTo(-8,-10);ctx.moveTo(22,-34);ctx.lineTo(8,-10);ctx.stroke();}
      ctx.fillStyle=c.life<2&&Math.floor(st.t*8)%2?'#fff':'#c9a36b';ctx.strokeStyle='#140f1f';ctx.lineWidth=2.5;ctx.fillRect(-12,-12,24,22);ctx.strokeRect(-12,-12,24,22);ctx.beginPath();ctx.moveTo(-12,-12);ctx.lineTo(12,10);ctx.moveTo(12,-12);ctx.lineTo(-12,10);ctx.stroke();ctx.restore();}
    if(st.ev==='pioggia'){ctx.strokeStyle='rgba(159,211,230,.45)';ctx.lineWidth=1;for(let i=0;i<60;i++){const x=(i*37+st.t*240)%500-10,y=(i*53+st.t*420)%300;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+10);ctx.stroke();}}
    if(st.ev==='luna'){ctx.fillStyle='rgba(215,38,61,.16)';ctx.fillRect(0,0,480,300);}
    if(st.ev==='nebbia'){const g=ctx.createLinearGradient(220,0,480,0);g.addColorStop(0,'rgba(220,220,235,0)');g.addColorStop(1,'rgba(220,220,235,.92)');ctx.fillStyle=g;ctx.fillRect(220,120,260,180);}
    if(st.ev==='blackout'&&st.intro<=0){const l=st.light;const g=ctx.createRadialGradient(l.x,l.y,30,l.x,l.y,110);g.addColorStop(0,'rgba(10,8,18,0)');g.addColorStop(1,'rgba(10,8,18,.93)');ctx.fillStyle=g;ctx.fillRect(0,0,480,300);}
    if(st.flashAll>0){ctx.fillStyle=`rgba(255,255,240,${Math.min(.8,st.flashAll*2.5)})`;ctx.fillRect(0,0,480,300);}
    if(st.slow>0){ctx.fillStyle='rgba(215,38,61,.12)';ctx.fillRect(0,0,480,300);}
    if(st.power>0){ctx.strokeStyle=`rgba(215,38,61,${.4+.3*Math.sin(st.t*12)})`;ctx.lineWidth=6;ctx.strokeRect(3,3,474,294);}
    const bz=s.zs.find(z=>z.ty==='boss'&&z.state!=='flee');if(bz){ctx.fillStyle='#140f1f';ctx.fillRect(120,280,240,14);ctx.fillStyle='#d7263d';ctx.fillRect(122,282,236*Math.max(0,bz.hp/bz.max),10);ctx.font='12px Bangers, Impact';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#140f1f';ctx.strokeText('👑 IL BRUTO DELLA SAGRA',240,276);ctx.fillStyle='#f7d64a';ctx.fillText('👑 IL BRUTO DELLA SAGRA',240,276);ctx.textAlign='start';}
    const vg=ctx.createRadialGradient(240,170,120,240,170,330);vg.addColorStop(0,'rgba(20,15,31,0)');vg.addColorStop(1,'rgba(20,15,31,.55)');ctx.fillStyle=vg;ctx.fillRect(0,0,480,300);
    /* cartellino dell'edificio */
    ctx.font='bold 11px Arial';const lab=`${s.ic} ${s.name}`;const w=ctx.measureText(lab).width+16;ctx.fillStyle='#140f1f';ctx.fillRect(8,8,w,20);ctx.fillStyle='#f7d64a';ctx.fillText(lab,16,22);
    /* altri edifici sotto attacco */
    const others=sites.filter(x=>x!==s&&!x.lost&&x.alert>0);if(others.length){ctx.fillStyle=`rgba(215,38,61,${.7+.3*Math.sin(st.t*8)})`;ctx.fillRect(8,30,190,18);ctx.fillStyle='#fff';ctx.font='bold 10px Arial';ctx.fillText(`⚠️ Sotto attacco: ${others.map(x=>x.short).slice(0,2).join(', ')}${others.length>2?'…':''}`,14,43);}
    if(st.slash&&st.slash.pts.length>1&&st.slash.age<.25){ctx.save();ctx.lineCap='round';ctx.strokeStyle=`rgba(255,255,255,${.85-st.slash.age*3})`;ctx.lineWidth=7;ctx.beginPath();st.slash.pts.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();ctx.strokeStyle=`rgba(247,214,74,${.8-st.slash.age*3})`;ctx.lineWidth=3;ctx.stroke();ctx.restore();}
    (st.drops||[]).forEach(d=>{const bob=Math.sin(st.t*6+d.x)*3,a=Math.min(1,d.life/.6);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(d.x,d.y+bob,15,-Math.PI/2,-Math.PI/2+Math.PI*2*(d.life/d.max));ctx.stroke();
      ctx.fillStyle=d.k==='coin'?'#f7d64a':d.k==='gem'?'#9fd3e6':'#d7263d';ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(d.x,d.y+bob,10,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#140f1f';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(d.k==='coin'?'€':d.k==='gem'?'◆':'♥',d.x,d.y+bob+4);ctx.textAlign='start';ctx.restore();});
    if(st.qte){const k=Math.sin(st.t*14)>0;ctx.save();ctx.fillStyle=k?'#f7d64a':'#fff';ctx.strokeStyle='#140f1f';ctx.lineWidth=3;ctx.fillRect(BX-22,128,64,30);ctx.strokeRect(BX-22,128,64,30);ctx.fillStyle='#140f1f';ctx.font='16px Bangers, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('🔨 TOCCA!',BX+10,148);
      ctx.fillStyle='#d7263d';ctx.fillRect(BX-22,160,64*(st.qte.t/3.5),5);ctx.textAlign='start';ctx.restore();}
    if(st.frenzy>0){ctx.save();ctx.strokeStyle=`rgba(247,214,74,${.5+.4*Math.sin(st.t*16)})`;ctx.lineWidth=8;ctx.strokeRect(4,4,472,292);ctx.font='18px Bangers, Impact, sans-serif';ctx.fillStyle='#f7d64a';ctx.strokeStyle='#140f1f';ctx.lineWidth=4;ctx.strokeText('FRENESIA ×1,5',196,292);ctx.fillText('FRENESIA ×1,5',196,292);ctx.restore();}
    if(st.slowmo>0){ctx.fillStyle='rgba(20,15,31,.25)';ctx.fillRect(0,0,480,300);}
    if(TACT){const pv=st.pv??5;ctx.fillStyle='rgba(20,15,31,.85)';ctx.fillRect(8,270,214,22);for(let i=0;i<10;i++){ctx.fillStyle=i<Math.floor(pv)?'#f7d64a':(i<pv?'#bfa63a':'#3a3350');ctx.fillRect(12+i*20.6,274,17,14);}ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.fillText('PROVVISTE '+Math.floor(pv)+'/10',14,268);
      if(st.sel){LANES.forEach((y,i)=>{ctx.fillStyle=`rgba(247,214,74,${.18+.1*Math.sin(st.t*8)})`;ctx.fillRect(BX-10,y-44,480-BX+10,44);});ctx.font='18px Bangers, Impact, sans-serif';ctx.fillStyle='#f7d64a';ctx.strokeStyle='#140f1f';ctx.lineWidth=4;ctx.textAlign='center';ctx.strokeText('TOCCA UNA CORSIA',300,120);ctx.fillText('TOCCA UNA CORSIA',300,120);ctx.textAlign='start';}
      if(st.lf&&st.lf.t>0){ctx.fillStyle=`rgba(247,214,74,${st.lf.t})`;ctx.fillRect(BX-10,LANES[st.lf.lane]-44,480-BX+10,44);}
      {const vis=st.clip?480/1.34:480;[0,1,2].forEach(l=>{const n=cur.zs.filter(z=>z.lane===l&&z.state!=='flee'&&z.x>vis-14).length;if(n){const x=vis-34,y=LANES[l]-34,p=.6+.4*Math.sin(st.t*7);ctx.fillStyle=`rgba(215,38,61,${p})`;ctx.beginPath();ctx.moveTo(x+28,y+12);ctx.lineTo(x+4,y);ctx.lineTo(x+4,y+24);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.fillText(n,x+9,y+17);}});}
      if((st.disc||0)>0){ctx.fillStyle='#f7d64a';ctx.font='bold 10px Arial';ctx.fillText('⚡ CARTE −1 · '+Math.ceil(st.disc)+'s',14,256);}
      if(cur.lt)cur.lt.forEach((n,l)=>{if(n>0){ctx.font='16px Arial';ctx.fillText('🪤'.repeat(Math.min(3,n)),BX+40,LANES[l]-4);}});
      (cur.lu||[]).forEach(u=>{if(u.k==='tur'){ctx.fillStyle='#7c8794';ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.fillRect(HX+48,LANES[u.lane]-74,20,22);ctx.strokeRect(HX+48,LANES[u.lane]-74,20,22);ctx.fillStyle='#d7263d';ctx.fillRect(HX+66,LANES[u.lane]-68,12,5);}else if(ally)ctx.drawImage(ally,HX+30,LANES[u.lane]-58,60,46);ctx.fillStyle='#fff';ctx.font='bold 8px Arial';ctx.fillText(u.t>500?'∞':Math.ceil(u.t)+'s',HX+50,LANES[u.lane]-78);});
      const m=st.mark;if(m&&cur.zs.includes(m)&&m.state!=='flee'){const sc=ZT[m.ty].s,my=LANES[m.lane]-60*sc;ctx.strokeStyle='#9fd3e6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,my,26*sc+8,0,7);ctx.moveTo(m.x-40*sc,my);ctx.lineTo(m.x+40*sc,my);ctx.moveTo(m.x,my-40*sc);ctx.lineTo(m.x,my+40*sc);ctx.stroke();}}
    if(!TACT){const e=st.en??100;ctx.fillStyle='rgba(20,15,31,.8)';ctx.fillRect(8,272,124,18);ctx.fillStyle=e<20?'#d7263d':'#6fb59a';ctx.fillRect(10,274,120*e/100,14);ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.fillText('⚡ ENERGIA COLPI',14,285);}
    if(cur.traps>0||cur.turret){ctx.font='bold 10px Arial';const t=`${cur.traps>0?'🪤×'+cur.traps+' ':''}${cur.turret?'🎯×'+cur.turret:''}`;const w=ctx.measureText(t).width+10;ctx.fillStyle='rgba(20,15,31,.8)';ctx.fillRect(140,272,w,18);ctx.fillStyle='#fff';ctx.fillText(t,145,285);}
    if(cur.turret){ctx.fillStyle='#7c8794';ctx.strokeStyle='#140f1f';ctx.lineWidth=2;ctx.fillRect(HX+38,LANES[1]-92,22,26);ctx.strokeRect(HX+38,LANES[1]-92,22,26);ctx.fillStyle='#d7263d';ctx.fillRect(HX+58,LANES[1]-84,12,5);}
    if(st.prep){ctx.fillStyle='rgba(20,15,31,.55)';ctx.fillRect(0,0,480,300);ctx.font='26px Bangers, Impact, sans-serif';ctx.fillStyle='#f7d64a';ctx.textAlign='center';ctx.fillText('PREPARA LA DIFESA',240,150);ctx.textAlign='start';}
    if(st.habRun){ctx.font='34px Arial';ctx.fillText(st.habRun.ic,st.habRun.x,LANES[st.habRun.lane]-6);}
    if(st.obj){const o=st.obj;const t=o.done?`✅ ${o.n}`:`🎯 ${o.n} · ${Math.min(o.c,o.goal)}/${o.goal} · +${o.g}💎`;ctx.font='bold 10px Arial';const w=ctx.measureText(t).width+12;ctx.fillStyle=o.done?'rgba(63,155,95,.92)':'rgba(20,15,31,.82)';ctx.fillRect(8,52,w,17);ctx.fillStyle='#fff';ctx.fillText(t,14,64);}
    if(st.combo.n>=3){ctx.save();ctx.translate(300,40);ctx.rotate(-.06);ctx.font='24px Bangers, Impact, sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#140f1f';const tx=`COMBO x${st.combo.n}!`;ctx.strokeText(tx,0,0);ctx.fillStyle=st.combo.n>=8?'#d7263d':'#f7d64a';ctx.fillText(tx,0,0);ctx.restore();}
    if(st.intro>0){const k=st.intro/INTRO;ctx.fillStyle=`rgba(20,15,31,${.6*Math.min(1,k*2)})`;ctx.fillRect(0,0,480,300);
      ctx.save();ctx.translate(240,140);const zoom=k>.8?1+(k-.8)*5:1;ctx.scale(zoom,zoom);ctx.rotate(-.05);ctx.textAlign='center';
      ctx.fillStyle='#d7263d';ctx.fillRect(-160,-38,320,58);ctx.strokeStyle='#140f1f';ctx.lineWidth=4;ctx.strokeRect(-160,-38,320,58);
      ctx.font='40px Bangers, Impact, sans-serif';ctx.lineWidth=6;const tt=coop?'AIUTO AMICO':'ONDATA '+L;ctx.strokeText(tt,0,6);ctx.fillStyle='#f7d64a';ctx.fillText(tt,0,6);
      ctx.font='bold 13px Arial';ctx.fillStyle='#fff';ctx.fillText(st.introSub,0,44);ctx.restore();ctx.textAlign='start';}
    ctx.restore();
    /* barre */
    const H=$('#hpH'),B=$('#hpB'),Wb=$('#hpW');if(!H)return;
    H.style.width=Math.max(0,mainS.hp/mainS.max*100)+'%';B.style.width=Math.max(0,s.bar/s.barMax*100)+'%';$('#hpBl').textContent='Barricata';{const g=$('#sgoal');if(g&&!coop){const a=mainS.hp/mainS.max>.66,b=!sites.some(x=>x.lost&&!x.main);g.innerHTML=`<span class="on">★ Resisti</span><span class="${a?'on':''}">★ Casa sopra 2/3</span><span class="${b?'on':''}">★ Nessun edificio perso</span>`;}}
    const tot=queue.length;const gone=tot-(queue.length-st.arrived+sites.reduce((a,x)=>a+(x.lost?0:x.zs.filter(z=>z.state!=='flee').length),0));Wb.style.width=(gone/tot*100)+'%';
    $('#bc').textContent=G.coins;$('#bg').textContent=G.gems;
    updHab();
    app.querySelectorAll('[data-use]').forEach(b=>{const id=b.dataset.use;const c=st.cd[id]||0;const tl=TOOLS.find(x=>x.id===id);const full=toolCd(tl,G.tools[id]);b.classList.toggle('cool',c>0);b.querySelector('.cdv').style.height=(c/full*100)+'%';b.querySelector('.nm').textContent=c>0?Math.ceil(c)+' s':tl.name;});
  }
  function endBattle(win){
    const lostSites=sites.filter(s=>s.lost&&!s.main);try{if(window.onWaveEnd)window.onWaveEnd(win,L,st.ev,coop);}catch(e){}
    const stars=win?(mainS.hp/mainS.max>.66&&!lostSites.length?3:mainS.hp/mainS.max>.33?2:1):0;sfx(win?'win':'lose');setMusic('app');
    if(win&&mainS.hp>=mainS.max-.5&&!lostSites.length)medal('perfetto');if(win&&st.ev==='blackout')medal('buio');if(win&&G.diff==='incubo')medal('incubo');if(win&&L>=10&&!coop)medal('ondata10');
    setTimeout(()=>{st.stop=true;let html='';
      if(coop){const rew=win?60+L*10:20;G.coins+=rew;if(win){G.gems+=5;(G.thanks=G.thanks||[]).push(coop.id);}G.help=(G.help||[]).filter(h=>h.fid!==coop.id);
        html=`<div class="sfx" style="font-size:36px">${win?'QUARTIERE SALVATO!':'NON CE L’AVETE FATTA'}</div><p style="margin:6px 0 10px">${win?`@${esc(coop.nick)} ti ringrazia: +${rew} 🪙 e +5 💎. Riceverà la notifica che sei intervenuto.`:`Hai comunque guadagnato ${rew} 🪙. @${esc(coop.nick)} sa che ci hai provato.`}</p>`;G.coop=null;}
      else{const rentNow=totalRent()+bLv('supermercato')*30,fb=friendBonus();G.event.prog+=Math.round(st.earned/2)+(win?120:40);jarAfterWave(win);
        if(G.friends.length&&Math.random()<.5){const f=G.friends[Math.floor(Math.random()*G.friends.length)];if(!(G.help||[]).some(h=>h.fid===f.id)&&G.famOut!==f.id)(G.help=G.help||[]).push({fid:f.id,lvl:Math.max(3,Math.round(f.lv*.8))});}
        const saved=sites.filter(s=>!s.main&&!s.lost).length;
        if(win){missionAdd('w',1);G.wins=(G.wins||0)+1;if(G.wins%3===0)G.spins=(G.spins||0)+1;G.stars=G.stars||{};const oldS=G.stars[L]||0;if(stars>oldS){G.stars[L]=stars;if(G.replay){G.gems+=(stars-oldS)*2;}}const bonus=20+L*5+saved*10;G.coins+=bonus+rentNow+fb;st.earned+=bonus;if(!G.replay)G.level++;G.best=Math.max(G.best,G.level-1);if(L%3===0)G.gems+=5;}
        const drop=lostSites.length;let fix=0;lostSites.forEach(s=>{const l=LOTS.find(x=>x.id===s.id);fix+=Math.round(((l&&l.cost)||300)*.2);});fix=Math.min(fix,G.coins);G.coins-=fix;G.replay=null;
        html=`<div class="sfx" style="font-size:36px;${win?'':'color:#d7263d'}">${win?'QUARTIERE DIFESO!':'CASA INVASA!'}</div>${win?`<div class="endstars">${[1,2,3].map(i=>`<span class="${i<=stars?'on':''}" style="animation-delay:${i*.18}s">★</span>`).join('')}</div>`:''}
          <p style="margin:6px 0 4px">${win?`Monete: <b>${st.earned}</b>${saved?` (bonus ${saved} edifici difesi)`:''}${rentNow?` · affitti e negozi: <b>${rentNow}</b>`:''}${fb?` · bonus amici: <b>${fb}</b>`:''}.`:`Monete guadagnate: <b>${st.earned}</b>, restano tue.`}</p>
          ${drop?`<p class="lostline">🔧 Edifici danneggiati: ${lostSites.map(s=>esc(s.name)).join(', ')}. Riparazioni: <b>−${fix} monete</b>. Restano tuoi: fortificali per la prossima notte.</p>`:''}`;}
      const box=$('#endbox');if(!box)return;document.body.classList.add('bended');if(win&&!coop&&!G.replay)setTimeout(()=>showChest(L),700);const bo=$('#boon');if(bo)bo.remove();const co=document.getElementById('coach');if(co)co.remove();
      box.innerHTML=`<div class="panel ${win?'moon':'night'}" style="margin-top:14px">${html}<div class="row"><button class="btn small" id="toHub">${coop?'Torna al tuo quartiere':'Fortifica il quartiere'}</button>${coop?'':`<button class="btn small alt" id="again">${win?'Ondata '+G.level:'Riprova'}</button>`}</div></div>`;
      box.scrollIntoView({behavior:'smooth',block:'center'});
      $('#toHub').onclick=()=>{G.view='hub';renderOrda();};const ag=$('#again');if(ag)ag.onclick=()=>{renderOrda();};
    },800);
  }
  requestAnimationFrame(frame);
}

</script>
