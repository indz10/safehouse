<script>
/* VELOCITÀ: i timer di sottofondo (≥1 s) non lavorano quando l'app non è in primo piano */
(function(){const _si=window.setInterval;window.__zsiv=1;window.setInterval=function(fn,ms,...a){if(typeof fn==='function'&&ms>=1000){const f=fn;fn=function(){if(document.hidden)return;return f.apply(this,arguments);};}return _si.call(window,fn,ms,...a);};})();
/* =========================================================
   ZOMBIESAFEHOUSE v2 — ANTEPRIMA
   ---------------------------------------------------------
   CONFIG: predisposizione per i servizi reali.
   - GOOGLE_MAPS_API_KEY vuota = dati di zona simulati (demo).
     In produzione: Geocoding API (indirizzo -> coordinate) +
     Places API (supermercati, farmacie, ospedali, ferramenta)
     chiamate da una funzione server (es. Supabase Edge Function),
     mai con la chiave esposta nel browser.
   - AI_ENDPOINT: dentro Claude la demo usa l'IA vera (chatbot e
     analisi foto). Fuori da Claude passa in automatico alle
     risposte simulate. In produzione: chiamata da funzione server.
   ========================================================= */
const CONFIG={
  GOOGLE_MAPS_API_KEY:'',
  AI_ENDPOINT:'https://api.anthropic.com/v1/messages',
  AI_MODEL:'claude-sonnet-4-6',
  PHOTO_MAX_SIDE:768
};

/* ---------- capitoli e domande (rischio 0 = ottimo, 10 = pessimo) ---------- */
const CHAPTERS=[
 {id:'str',name:'Struttura',w:.15},
 {id:'acc',name:'Accessi',w:.25},
 {id:'per',name:'Perimetro',w:.20},
 {id:'ris',name:'Risorse',w:.20},
 {id:'com',name:'Comunicazioni',w:.10},
 {id:'mob',name:'Mobilità',w:.10}
];
const Q=[
 {id:'tipo',ch:'str',t:'Che tipo di casa è?',o:[['villa','Villetta indipendente',6],['bifam','Bifamiliare',5],['schiera','Villetta a schiera',5],['apt_pt','Appartamento al piano terra',7],['apt_12','Appartamento al 1° o 2° piano',3],['apt_3','Appartamento dal 3° piano in su',2],['cascina','Cascina o rustico',6],['rifugio','Rifugio o baita in montagna',5],['barca','Barca o casa galleggiante',6],['camper','Camper o roulotte',8]]},
 {id:'materiale',ch:'str',t:'Di cosa sono fatti i muri?',o:[['ca','Cemento armato',2],['mattoni','Mattoni o pietra',3],['legno','Legno',7],['prefab','Prefabbricato leggero',6],['ns','Non lo so',5]]},
 {id:'piani',ch:'str',t:'Quanti piani ha la casa?',o:[['1','Uno',6],['2','Due',4],['3','Tre o più',3]]},
 {id:'cantina',ch:'str',t:'C’è una cantina o un seminterrato?',h:'Una cantina con accesso solo da dentro è un ottimo rifugio.',o:[['int','Sì, con accesso solo da dentro',2],['fin','Sì, con finestre a livello della strada',7],['no','No',5]]},
 {id:'tetto',ch:'str',t:'Il tetto o il terrazzo si raggiunge da fuori?',o:[['no','No, non è praticabile',4],['int','Terrazzo raggiungibile solo da dentro',2],['est','Sì, si sale da fuori (scale, alberi, tettoie)',8]]},
 {id:'porta',ch:'acc',t:'Com’è la porta d’ingresso?',ai:1,o:[['b4','Blindata classe 4 o superiore',1],['blindata','Blindata',3],['legno','Legno pieno',6],['vetro','Con parti in vetro',8],['ns','Non lo so',6]]},
 {id:'ingressi',ch:'acc',t:'Quante porte danno sull’esterno?',o:[['1','Una',2],['2','Due',5],['3','Tre o più',8]]},
 {id:'finestre',ch:'acc',t:'Quante finestre al piano terra?',ai:1,o:[['0','Nessuna',1],['2','Una o due',4],['5','Da tre a cinque',6],['6','Più di cinque',8]]},
 {id:'grate',ch:'acc',t:'Ci sono grate o inferriate?',ai:1,o:[['tutte','Su tutte le finestre basse',1],['alcune','Solo su alcune',5],['no','Nessuna',8]]},
 {id:'tapparelle',ch:'acc',t:'Che tapparelle o persiane hai?',ai:1,o:[['blind','Blindate o in acciaio',2],['allu','In alluminio o PVC',5],['legno','In legno o persiane',5],['no','Nessuna',8]]},
 {id:'vetri',ch:'acc',t:'Che vetri hanno le finestre?',o:[['anti','Antisfondamento',2],['doppi','Doppi vetri normali',5],['singolo','Vetro singolo',8],['ns','Non lo so',6]]},
 {id:'garage',ch:'acc',t:'Il garage è collegato alla casa?',o:[['no','Non ho garage',3],['sez','Sì, con portone robusto',3],['bas','Sì, con basculante',6],['aperto','Sì, e non c’è una porta blindata tra garage e casa',8]]},
 {id:'recinzione',ch:'per',t:'Cosa c’è intorno alla casa?',ai:1,o:[['muro2','Muro pieno oltre 2 metri',1],['muro1','Muro o cancellata da 1 a 2 metri',4],['rete','Rete o siepe',7],['cond','Recinzione del condominio',4],['no','Niente',9]]},
 {id:'cancello',ch:'per',t:'Com’è il cancello?',ai:1,o:[['auto','Automatico e robusto',2],['manuale','Manuale con serratura',4],['no','Non c’è cancello',8]]},
 {id:'luci',ch:'per',t:'Illuminazione esterna di notte',ai:1,o:[['sensore','Luci con sensore di movimento',2],['fisse','Luci sempre accese',4],['no','Nessuna luce',8]]},
 {id:'visibile',ch:'per',t:'Quanto si vede la casa dalla strada?',o:[['nasc','Nascosta da alberi o edifici',2],['poco','Poco: è in una via secondaria',4],['molto','Molto: è sulla strada principale',7]]},
 {id:'vicini',ch:'per',t:'Quanto sono lontani i vicini?',o:[['20','Meno di 20 metri',4],['100','Tra 20 e 100 metri',5],['lontani','Oltre 100 metri',7]]},
 {id:'acqua',ch:'ris',t:'Quanta acqua hai di scorta?',o:[['pozzo','Pozzo o cisterna',1],['14','Per più di due settimane',2],['3','Da 3 giorni a due settimane',5],['0','Meno di 3 giorni',8]]},
 {id:'cibo',ch:'ris',t:'E quanto cibo a lunga conservazione?',o:[['14','Per più di due settimane',1],['3','Da 3 giorni a due settimane',4],['0','Meno di 3 giorni',8]]},
 {id:'energia',ch:'ris',t:'Se salta la corrente?',o:[['fv','Fotovoltaico con batteria',1],['gen','Generatore',3],['no','Resto al buio',8]]},
 {id:'calore',ch:'ris',t:'Come ti scaldi senza gas e corrente?',o:[['legna','Stufa o camino a legna',2],['no','Non posso',7]]},
 {id:'medico',ch:'ris',t:'Kit di primo soccorso',o:[['completo','Completo, con farmaci di base',2],['base','Kit base',5],['no','Nessuno',8]]},
 {id:'radio',ch:'com',t:'Come ricevi notizie senza internet?',o:[['radio','Radio a batterie o a manovella',2],['no','Solo con lo smartphone',7]]},
 {id:'allarme',ch:'com',t:'Allarme e telecamere',o:[['cam','Allarme con telecamere',2],['allarme','Solo allarme',4],['no','Nessuno',8]]},
 {id:'gruppo',ch:'com',t:'Hai una rete di vicini o amici?',o:[['org','Sì, un gruppo organizzato',2],['qualche','Qualche contatto',5],['no','Nessuno',8]]},
 {id:'mezzo',ch:'mob',t:'Che mezzo hai per spostarti?',o:[['fuori','Fuoristrada o auto con serbatoio pieno',2],['auto','Auto',4],['bici','Solo bici',6],['no','Nessuno',8]]},
 {id:'fuga',ch:'mob',t:'Quante vie per allontanarti da casa?',o:[['2','Due o più',2],['1','Una sola',6],['0','Nessuna sicura',9]]},
 {id:'zona',ch:'mob',t:'Dove si trova la casa?',map:1,o:[['campagna','In campagna',3],['periferia','In periferia',5],['centro','In centro città',8],['montagna','In montagna',4],['lago','Sul lago, sul mare o su un fiume',6]]}
];
const QBY=Object.fromEntries(Q.map(q=>[q.id,q]));

/* ---------- potenziamenti del gioco ---------- */
const SPONSORS={
 ferr:{name:'Ferramenta Volta',logo:'FV'},
 sic:{name:'SicurCasa Mantova',logo:'SC'},
 sol:{name:'SolarBox',logo:'SB'}
};
const UPG=[
 {id:'u_porta',q:'porta',v:'b4',name:'Porta blindata classe 4',cost:1800,src:'sponsor',sp:'sic',note:'Montaggio incluso, sopralluogo gratuito'},
 {id:'u_porta2',q:'porta',v:'blindata',name:'Porta blindata base',cost:900,src:'community',likes:88,note:'Buon compromesso se il budget è stretto'},
 {id:'u_grate',q:'grate',v:'tutte',name:'Grate su tutte le finestre basse',cost:900,src:'sponsor',sp:'ferr',note:'Su misura, da 180 € a finestra'},
 {id:'u_tapp',q:'tapparelle',v:'blind',name:'Tapparelle in acciaio',cost:1200,src:'community',likes:212,note:'«Le ho messe l’anno scorso: dormo meglio» — nebbia'},
 {id:'u_vetri',q:'vetri',v:'anti',name:'Vetri antisfondamento',cost:1500,src:'community',likes:96,note:'Utili anche contro i furti veri'},
 {id:'u_garage',q:'garage',v:'sez',name:'Portone sezionale per il garage',cost:1600,src:'sponsor',sp:'sic',note:'Chiude il punto debole tra garage e casa'},
 {id:'u_retro',q:'ingressi',v:'1',name:'Blinda l’ingresso sul retro',cost:600,src:'ia',note:'Un solo accesso da difendere'},
 {id:'u_rifugio',q:'cantina',v:'int',name:'Stanza rifugio rinforzata',cost:500,src:'ia',note:'Porta robusta, scorte, torcia: l’ultima linea'},
 {id:'u_tetto',q:'tetto',v:'no',name:'Togli gli appigli verso il tetto',cost:200,src:'ia',note:'Pota i rami, sposta le scale'},
 {id:'u_muro',q:'recinzione',v:'muro2',name:'Muro di cinta oltre 2 metri',cost:6000,src:'community',likes:58,note:'Costoso ma cambia tutto'},
 {id:'u_canc1',q:'recinzione',v:'muro1',name:'Cancellata da 1,5 metri',cost:2500,src:'community',likes:64,note:'Più economica del muro'},
 {id:'u_canc',q:'cancello',v:'auto',name:'Cancello automatico robusto',cost:2500,src:'community',likes:41,note:''},
 {id:'u_luci',q:'luci',v:'sensore',name:'Luci con sensore di movimento',cost:120,src:'ia',note:'Il miglior rapporto costo/beneficio'},
 {id:'u_siepe',q:'visibile',v:'nasc',name:'Siepe alta e alberi',cost:800,src:'community',likes:49,note:'La casa sparisce dalla strada'},
 {id:'u_cane',q:'cane',v:'1',name:'Cane da guardia',cost:600,src:'community',likes:254,note:'Abbaia prima che tu veda qualcosa'},
 {id:'u_fv',q:'energia',v:'fv',name:'Fotovoltaico con batteria',cost:9000,src:'sponsor',sp:'sol',note:'Kit 4 kW + batteria 10 kWh'},
 {id:'u_gen',q:'energia',v:'gen',name:'Generatore portatile',cost:700,src:'community',likes:133,note:'Alternativa economica al fotovoltaico'},
 {id:'u_acqua',q:'acqua',v:'pozzo',name:'Cisterna per l’acqua',cost:400,src:'ia',note:'1.000 litri, raccolta piovana'},
 {id:'u_cibo',q:'cibo',v:'14',name:'Dispensa per due settimane',cost:250,src:'ia',note:'Ruota le scorte ogni 6 mesi'},
 {id:'u_orto',q:'orto',v:'1',name:'Orto e pollaio',cost:300,src:'community',likes:118,note:'Cibo fresco anche dopo la prima settimana'},
 {id:'u_med',q:'medico',v:'completo',name:'Kit di primo soccorso completo',cost:90,src:'ia',note:''},
 {id:'u_stufa',q:'calore',v:'legna',name:'Stufa a legna',cost:1800,src:'community',likes:77,note:''},
 {id:'u_radio',q:'radio',v:'radio',name:'Radio a manovella',cost:40,src:'ia',note:'Funziona senza batterie né rete'},
 {id:'u_walkie',q:'walkie',v:'1',name:'Walkie-talkie per il quartiere',cost:120,src:'sponsor',sp:'ferr',note:'Kit da 4, portata 5 km'},
 {id:'u_cam',q:'allarme',v:'cam',name:'Allarme con telecamere',cost:900,src:'sponsor',sp:'sic',note:'App inclusa, installazione in giornata'},
 {id:'u_gruppo',q:'gruppo',v:'org',name:'Gruppo di quartiere nell’app',cost:0,src:'community',likes:301,note:'Gratis: i vicini arrivano in aiuto'},
 {id:'u_fuga',q:'fuga',v:'2',name:'Piano con due vie di fuga',cost:0,src:'ia',note:'Segna i percorsi sulla mappa'},
 {id:'u_zaino',q:'zaino',v:'1',name:'Zaino di fuga pronto',cost:150,src:'ia',note:'Acqua, torcia, documenti, 72 ore'},
 {id:'u_suv',q:'mezzo',v:'fuori',name:'Fuoristrada con taniche',cost:12000,src:'community',likes:37,note:'Per chi abita in campagna'}
];
/* extra del gioco: non sono domande, danno un bonus al capitolo */
const EXTRA={cane:{ch:'per',b:-.7},orto:{ch:'ris',b:-.7},walkie:{ch:'com',b:-.8},zaino:{ch:'mob',b:-.6}};

/* ---------- risposte di partenza (casa d'esempio) ---------- */
const SAMPLE={tipo:'villa',materiale:'mattoni',piani:'2',cantina:'no',tetto:'no',porta:'legno',ingressi:'2',finestre:'5',grate:'no',tapparelle:'allu',vetri:'doppi',garage:'bas',recinzione:'rete',cancello:'manuale',luci:'no',visibile:'poco',vicini:'100',acqua:'3',cibo:'3',energia:'no',calore:'no',medico:'base',radio:'no',allarme:'no',gruppo:'qualche',mezzo:'auto',fuga:'1',zona:'periferia'};

/* ---------- stato ---------- */
const S={
 tab:'home',
 answers:{}, aiFilled:{}, zone:null, photos:{porta:null,finestre:null,perimetro:null}, findings:null,
 result:null,
 game:{base:null,applied:new Set(),src:'ia'},
 chat:[{r:'bot',t:'Qui Radio Operatore. Chiedimi come funziona la valutazione, cosa fare con la casa o come entrano gli sponsor nel gioco.'}],
 step:0
};

/* ---------- calcolo ---------- */
function risk(qid,val){const q=QBY[qid];if(!q)return null;const o=q.o.find(x=>x[0]===val);return o?o[2]:null;}
function computeScore(ans,zone){
  const subs={};
  CHAPTERS.forEach(c=>{
    const qs=Q.filter(q=>q.ch===c.id);let sum=0,n=0;
    qs.forEach(q=>{const r=risk(q.id,ans[q.id]);if(r!=null){sum+=r;n++;}});
    subs[c.id]=n?sum/n:5;
  });
  Object.entries(EXTRA).forEach(([k,e])=>{if(ans[k]==='1')subs[e.ch]=Math.max(0,subs[e.ch]+e.b);});
  if(zone){subs.ris=subs.ris*.85+zone.resRisk*.15; subs.mob=subs.mob*.8+zone.mobRisk*.2;}
  let tot=0;CHAPTERS.forEach(c=>tot+=subs[c.id]*c.w);
  const idx=Math.max(1,Math.min(10,Math.round(tot*10)/10));
  return{idx,subs};
}
function nightsFor(idx){if(idx<=2)return'più di 60';if(idx<=3)return'30';if(idx<=4.5)return'14';if(idx<=6)return'5';if(idx<=7.5)return'2';return'meno di 1';}
function grade(idx){if(idx<=2.5)return['FORTEZZA','#3f9b5f'];if(idx<=4.5)return['BUNKER','#6fb59a'];if(idx<=6.5)return['RIFUGIO FRAGILE','#f7d64a'];return['BUFFET PER ZOMBIE','#d7263d'];}
function weakest(subs,n=3){return CHAPTERS.map(c=>({...c,v:subs[c.id]})).sort((a,b)=>b.v-a.v).slice(0,n);}

/* ---------- zona (demo deterministica, pronta per Google Maps) ---------- */
function hash(str){let h=2166136261;for(const ch of str.toLowerCase())h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
function rng(seed){let s=seed||1;return()=>{s=Math.imul(s^(s>>>15),2246822507)^Math.imul(s^(s>>>13),3266489909);return((s^=s>>>16)>>>0)/4294967296;};}
const POI_KINDS=[['super','Supermercato'],['farm','Farmacia'],['osp','Ospedale'],['ferr','Ferramenta'],['dist','Distributore'],['acqua','Fontana o fiume'],['cc','Carabinieri'],['vvf','Vigili del fuoco'],['racc','Area di raccolta']];
const NICKS=['bunkerboy','nebbia','lagosafe','attico','maglia_nera','zia_pina','orto_forte','ilfabbro','luna_rossa','vedetta','cascinaz','mister_grate','ultimolume','padellona','sirena','topo_cantina','barricata','ninja_vespa'];
async function analyzeZone(address){
  if(CONFIG.GOOGLE_MAPS_API_KEY){
    /* PRODUZIONE: funzione server con Geocoding + Places -> {type,pois:[{kind,name,dist,lat,lng}]}
       e utenti dal database Supabase (solo profili pubblici, posizione arrotondata). */
  }
  await new Promise(r=>setTimeout(r,0));
  const r=rng(hash(address||'casa'));
  const lower=address.toLowerCase();
  let type=/monte|montagna|rifugio|baita|passo|alpe|malga|val |cortina|livigno/.test(lower)?'montagna':/lago|riva|mare|porto|spiaggia|lungolago|lido|darsena|garda/.test(lower)?'lago':/via roma|piazza|centro|corso/.test(lower)?'centro':/strada|cascina|località|loc\.|frazione/.test(lower)?'campagna':(r()<.33?'centro':r()<.5?'campagna':'periferia');
  const spread=type==='centro'?260:type==='periferia'?700:type==='lago'?900:type==='montagna'?3200:1900;
  const resources=[];
  POI_KINDS.forEach(([k,n])=>{const copies=type==='centro'&&['super','farm','ferr'].includes(k)?2:1;
    for(let i=0;i<copies;i++){const x=.08+r()*.84,y=.1+r()*.8;const dx=x-.5,dy=y-.5;resources.push({kind:k,name:n,x,y,dist:Math.round(Math.hypot(dx,dy)*2*spread*(.6+r()*.5))});}});
  const nU=type==='centro'?16:type==='periferia'?11:type==='lago'?9:type==='montagna'?4:6;
  const users=Array.from({length:nU},(_,i)=>{const idx=Math.round((1.6+r()*7)*10)/10;
    return{nick:NICKS[(i+Math.floor(r()*NICKS.length))%NICKS.length],idx,x:Math.round((.08+r()*.84)*20)/20,y:Math.round((.12+r()*.78)*20)/20,valutazioni:1+Math.floor(r()*6)};});
  const near=resources.filter(x=>x.dist<800).length;
  const resRisk=Math.max(1,9-near*.9);
  const mobRisk=type==='centro'?8:type==='periferia'?5:type==='lago'?6:type==='montagna'?4:3;
  const avgU=users.reduce((t,u)=>t+u.idx,0)/users.length;
  const level=Math.round((resRisk*.35+mobRisk*.35+avgU*.3)*10)/10;
  return{address,type,resources,users,resRisk,mobRisk,avgU,level,seed:hash(address)};
}

/* ---------- IA ---------- */
async function askAI(system,messages){
  const res=await fetch(CONFIG.AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:CONFIG.AI_MODEL,max_tokens:1000,system,messages})});
  if(!res.ok)throw new Error('AI '+res.status);
  const d=await res.json();
  return(d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
}
function fileToJpeg(file){
  return new Promise((ok,ko)=>{
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{const m=CONFIG.PHOTO_MAX_SIDE;let w=img.width,h=img.height;const s=Math.min(1,m/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);
      const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      ok({url,b64:c.toDataURL('image/jpeg',.72).split(',')[1]});};
    img.onerror=ko;img.src=url;
  });
}
const VISION_PROMPT=`Sei il modulo di valutazione di ZombieSafeHouse, un'app-gioco sulla sicurezza della casa.
Ricevi foto della casa dell'utente, ognuna con il nome della stanza o della zona (porta d'ingresso, finestre al piano terra, cancello e recinzione, retro e giardino, ingresso visto da dentro, soggiorno e portefinestre, garage o cantina).
Valuta SOLO elementi difensivi visibili. Ignora persone, volti, targhe, numeri civici, oggetti di valore e qualsiasi dato identificativo: non citarli mai.
Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo e senza blocchi di codice, con queste chiavi:
{"porta":"b4|blindata|legno|vetro|ns","grate":"tutte|alcune|no|ns","finestre":"0|2|5|6|ns","tapparelle":"blind|allu|legno|no|ns","recinzione":"muro2|muro1|rete|cond|no|ns","cancello":"auto|manuale|no|ns","luci":"sensore|fisse|no|ns","serratura":"cil|dop|norm|ns","portafin":"no|prot|si|ns","retro":"nessuna|blind|norm|ns","appigli":"no|qualche|molti|ns","garage":"no|sez|bas|aperto|ns","allarme":"cam|allarme|no|ns","note":["massimo 4 osservazioni brevi in italiano, una per stanza fotografata"]}
Usa "ns" quando l'elemento non si vede.`;
function simulateFindings(){
  const have=Object.values(S.photos).filter(Boolean).length;
  return{porta:'legno',grate:have>1?'alcune':'no',finestre:'5',tapparelle:'allu',recinzione:'rete',cancello:'manuale',luci:'no',
    note:['Porta in legno senza rinforzi visibili','Finestre basse raggiungibili da terra','Recinzione bassa: si scavalca facilmente'],simulated:true};
}
const CHAT_SYSTEM=`Sei "Radio Operatore", l'assistente dell'app ZombieSafeHouse: un gioco a fumetto horror che valuta quanto la casa dell'utente resisterebbe a un'apocalisse zombie, con consigli che migliorano anche la sicurezza reale.
Rispondi in italiano, con tono ironico da fumetto ma chiaro, in massimo 5 frasi.
Sai che: la valutazione combina indirizzo (zona e risorse vicine), foto analizzate dall'IA (porta, finestre, perimetro) e circa 28 domande in 6 capitoli (struttura, accessi, perimetro, risorse, comunicazioni, mobilità); l'indice va da 1 (fortezza) a 10 (buffet per zombie); nella sezione Gioco l'utente applica potenziamenti consigliati da IA, community e sponsor e vede la casa cambiare; le foto non vengono salvate e la mappa mostra solo livelli di zona aggregati, mai le case degli altri.
Dai solo consigli difensivi e legali (porte, grate, scorte, luci, piani di emergenza, rete di vicini). Non dare mai indicazioni su come entrare in case altrui, armi o trappole pericolose.`;
function fallbackChat(t){
  t=t.toLowerCase();
  if(/foto|fotocamera|camera/.test(t))return'Inquadri porta, finestre basse e cancello: l’IA riconosce grate, tipo di porta e recinzione e compila le domande per te. Le foto restano sul telefono, non vengono salvate.';
  if(/mappa|zona|indirizzo|google/.test(t))return'Dall’indirizzo ricavo il tipo di zona e le risorse vicine: supermercati, farmacie, ospedali, ferramenta. In questa anteprima i dati sono simulati; nella versione pubblicata arrivano da Google Maps.';
  if(/gioco|potenziament|sponsor/.test(t))return'Nel Gioco applichi potenziamenti: quelli marcati IA sono i più efficaci per la tua casa, la community vota i suoi preferiti, gli sponsor propongono prodotti veri. La casa cambia a vista e l’indice scende.';
  if(/indice|punteggio|voto/.test(t))return'L’indice va da 1 a 10: più è basso, più la casa resiste. Pesano di più accessi (25%), perimetro e risorse (20% ciascuno).';
  if(/privacy|dati/.test(t))return'Le foto non vengono salvate e nessuno vede la tua casa: sulla mappa compaiono solo livelli di zona aggregati.';
  return'Domanda ricevuta, ma il segnale è debole: in questa anteprima fuori da Claude rispondo solo su valutazione, foto, mappa, gioco, indice e privacy. Prova con una di queste parole.';
}
</script>
