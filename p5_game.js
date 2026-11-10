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
const fLv=f=>Math.min(3,1+Math.floor(f.lv/6));
function socialInit(){
  G.friends=FRIENDS0.map(f=>({...f}));G.req=[{id:'f5',nick:'cascinaz',role:'pomp',lv:9,col:'#3f9b5f'}];
  G.me={nick:'tu',role:null};G.gifts=[{from:'luna_rossa',what:'coins',n:80},{from:'zia_pina',what:'gems',n:5}];
  G.event={name:'Notte collettiva',goal:3000,prog:1140,claimed:false};
  G.hosts=[{fid:'f1'},{fid:'f3'}];
  G.help=[{fid:'f2',lvl:9}];G.famOut=null;G.famIn={};
}
const DIFF={normale:{n:'Normale',hp:1,cnt:1,sp:1,coin:1},difficile:{n:'Difficile',hp:1.35,cnt:1.15,sp:1.08,coin:1.3},incubo:{n:'Incubo',hp:1.8,cnt:1.3,sp:1.18,coin:1.7}};
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

/* ---------- mappa del quartiere fittizio ---------- */

function startGame(type){G.type=type;G.level=1;G.coins=HTYPES[type].coins;G.gems=0;G.h={porta:0,grate:0,muro:0,luci:0,energia:0,vedetta:0,...HTYPES[type].start};G.q={};G.lots={};G.hoods=null;G.curHood=null;G.tools={petardo:1,sirena:1};socialInit();G.spins=1;G.scratch=1;G.perk={};G.wins=0;G.jar=null;G.lastDaily=null;luckInit();G.sel=null;applyViatico();(S.pend||[]).forEach(k=>{if(k==='spin')G.spins=(G.spins||0)+1;if(k==='gems')G.gems+=5;if(k==='coins')G.coins+=150;});S.pend=[];G.view='hub';renderOrda();}

function tenOf(b){if(!b||b.kind!=='house'||!b.ten)return null;
  if(b.ten.f){const f=G.friends.find(x=>x.id===b.ten.f);if(!f)return null;return{type:'friend',f,role:f.role,lv:fLv(f)};}
  return{type:'npc',role:b.ten.n,lv:b.lv};}
function houseOfFriend(fid){return Object.entries(G.lots).find(([,b])=>b.kind==='house'&&b.ten&&b.ten.f===fid);}
function openSheetBase(title,body,bind){
  let sh=document.getElementById('sheet');
  if(!sh){sh=document.createElement('div');sh.id='sheet';sh.className='sheet';sh.innerHTML='<div class="sheet-bg"></div><div class="sheet-card" role="dialog" aria-modal="true"></div>';document.body.appendChild(sh);sh.querySelector('.sheet-bg').onclick=closeSheet;}
  sh.querySelector('.sheet-card').innerHTML=`<div class="row spread sheet-h"><h3>${title}</h3><button class="btn ghost small" data-close aria-label="Chiudi">✕</button></div><div class="sheet-b">${body}</div>`;
  sh.classList.add('open');sh.querySelector('[data-close]').onclick=closeSheet;if(bind)bind(sh.querySelector('.sheet-card'));
}
function closeSheetBase(){const sh=document.getElementById('sheet');if(sh)sh.classList.remove('open');}

/* ---------- battaglia: assedio di tutto il quartiere ---------- */
const HOME_POS={centro:[134,168],periferia:[196,286],campagna:[330,580],fiume:[128,566],montagna:[204,-50]};
function famSize(lv){return 2+Math.floor((lv||1)/5);}

</script>
