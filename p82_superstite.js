<script>
/* =========================================================
   🎖️ IL SUPERSTITE CHE CRESCE (migrazione 020, richiesta di Alessandro 15/11)
   Oltre alle case cresce il giocatore, così conviene entrare spesso e si gioca quando si vuole:
   - 🎖️ Grado dall'esperienza ⭐ (ogni premio in Mattoni, spedizioni, serie, condivisione, amici invitati)
   - 🧠 Abilità (1 punto per grado), ⚡ Energia (si ricarica da sola), 📅 Serie di 7 giorni
   - 🎒 Spedizioni nei posti veri vicino alle tue case (OpenStreetMap): supermercato → 🥫, ferramenta/parco → 🪵,
     distributore → ⛽, farmacia → ⚡ e 🥫, altri posti → un po' di tutto. Tornano da sole (notifica).
   - 🛠️ Equipaggiamento (zaino, torcia, arma, radio) costruito con 🪵 e 🧱.
   Tutto deciso dal server (world_sup_info, world_sped_parti, world_sped_raccogli, world_sup_abilita, world_sup_equip,
   world_sup_serie, world_sup_share); qui solo le schede. Formule in docs/FORMULE.md (w_sped_calc).
   Si apre da "🎖️" nella barra delle scorte del Mondo, dalla guida 🧭, dal menu ☰ e dalla notifica (?sup=1).
   ========================================================= */
const SUP={d:null,t:0,tab:'io',P:null,Pk:'',f:'tutti',h:0,busy:false,mk:[],mkSig:'',mkMap:null};
const SUP_AB=[['esploratore','🧭','Esploratore','+0,5 km di raggio e +10% di bottino nelle spedizioni'],['resistenza','💪','Resistenza','+1 ⚡ di energia massima e ricarica 10 minuti più veloce'],
  ['combattente','🔪','Combattente','−4% di rischio di dover scappare dagli zombie'],['cercatore','🔍','Cercatore','+3% di trovare un tesoro (🧱) in spedizione'],['mercante','🤝','Mercante','+1 🧱 ogni 10 🧱 scambiati al Mercato']];
const SUP_EQ=[['zaino','🎒','Zaino','porta 15 provviste in più (senza zaino: 25)'],['torcia','🔦','Torcia','di notte (dalle 20 alle 7) niente rischio in più, e +2% di tesoro'],
  ['arma','🪓','Arma','−5% di rischio in spedizione'],['radio','📻','Radio','una spedizione in più nello stesso momento']];
const SUP_K={cibo:['🥫','Cibo','supermercati, alimentari, panifici, mercati'],legno:['🪵','Legno','ferramenta, fai da te, vivai, parchi'],carb:['⛽','Carburante','distributori'],
  farmaco:['💊','Medicine','farmacie e ospedali: ⚡ +2 e un po’ di 🥫'],misto:['📦','Un po’ di tutto','scuole, municipio, poste, biblioteche']};
/* il superstite sei tu: l'aspetto e il titolo cambiano con il grado */
const SUP_RANK=[[1,'🧑','Recluta','appena arrivato nell’apocalisse'],[3,'🧑‍🔧','Raccoglitore','conosce i negozi della zona'],[5,'🧑‍🚒','Veterano','torna sempre a casa'],[10,'🥷','Ranger','si muove come un’ombra'],[15,'🦸','Leggenda','lo conoscono tutti in città']];
function supRank(g){let r=SUP_RANK[0];SUP_RANK.forEach(x=>{if(g>=x[0])r=x;});return r;}
function supNextRank(g){return SUP_RANK.find(x=>x[0]>g)||null;}
/* la cosa da fare adesso, una sola */
function supAdesso(){const d=SUP.d;if(!d)return null;const r=supReady();
  if(r)return{ic:'🎁',t:`È tornato dalla spedizione: raccogli quello che ha trovato`,b:'🎁 Raccogli',go:'sped'};
  if(!d.serie_oggi)return{ic:'📅',t:'Ritira il premio di oggi della serie (cresce ogni giorno di fila)',b:'📅 Ritira il premio',go:'serie'};
  if(d.punti)return{ic:'🧠',t:`Hai ${d.punti===1?'un punto':d.punti+' punti'} da usare: scegli in cosa migliorare`,b:'🧠 Scegli l’abilità',go:'abil'};
  const via=supVia();if(via.length>=(d.max_sped||1))return{ic:'🎒',t:`È fuori in spedizione: torna fra ${supLeft(via[0].end_at)}. Intanto gioca col resto.`,b:'🎒 Guarda dov’è',go:'sped'};
  if(d.energia>=1)return{ic:'⚡',t:`Hai ⚡ ${d.energia}: mandalo in un posto vero vicino a casa a prendere provviste`,b:'🎒 Scegli dove mandarlo',go:'sped'};
  return{ic:'😴',t:`Si sta riposando: +⚡1 fra ${supLeft(Date.now()+d.prossima_s*1000)}`,b:'❓ Come si cresce',go:'come'};}
function supStato(){const d=SUP.d;if(!d)return{l:'Tu',c:''};const r=supReady();if(r)return{l:'✅ Tornato',c:'ok'};const v=supVia();if(v.length)return{l:'🎒 '+supLeft(v[0].end_at).replace(' min','′'),c:'via'};
  if(!d.serie_oggi||d.punti)return{l:'❗ Novità',c:'ok'};return{l:'⚡ '+d.energia,c:''};}
const supAb=(k)=>Math.min(5,Math.max(0,+((SUP.d&&SUP.d.abil||{})[k])||0));
const supEq=(k)=>Math.min(3,Math.max(0,+((SUP.d&&SUP.d.equip||{})[k])||0));
/* stessa formula del server (w_sped_calc): serve solo a mostrare durata, rischio e bottino prima di partire */
function supCalc(km){const ab=supAb,eq=supEq,notte=!!(SUP.d&&SUP.d.notte);
  return{min:Math.min(180,Math.round(10+14*km)),energia:Math.min(3,1+Math.floor(km/2.5)),
    rischio:Math.min(60,Math.max(3,Math.round(10+4*km-4*ab('combattente')-5*eq('arma')+(notte&&eq('torcia')===0?10:0)))),
    bottino:Math.min(25+15*eq('zaino'),Math.round((10+6*km)*(1+0.1*ab('esploratore')))),xp:10+Math.round(6*km),tesoro:5+3*ab('cercatore')+2*eq('torcia')};}
function supLoot(kind,b){return kind==='cibo'?`🥫 ~${b}`:kind==='legno'?`🪵 ~${b}`:kind==='carb'?`⛽ ~${Math.round(b*0.6)}`:kind==='farmaco'?`⚡ +2 · 🥫 ~${Math.floor(b/2)}`:`🪵 🥫 ⛽ ~${Math.floor(b/3)}`;}
const supReady=()=>((SUP.d&&SUP.d.spedizioni)||[]).filter(x=>x.stato==='via'&&new Date(x.end_at)<=Date.now()).length;
const supVia=()=>((SUP.d&&SUP.d.spedizioni)||[]).filter(x=>x.stato==='via');
async function supLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return SUP.d;if(!force&&SUP.d&&Date.now()-SUP.t<60000)return SUP.d;
  try{const{data,error}=await SB.rpc('world_sup_info');if(!error&&data&&data.ok!==false){const old=SUP.d;SUP.d=data;SUP.t=Date.now();
      if(data.inviti&&(data.inviti.nuovi||data.inviti.valutati))toast(`🎉 Amici entrati col tuo link: ⭐ +${50*data.inviti.nuovi+150*data.inviti.valutati}`);
      if(old&&data.grado>old.grado)setTimeout(()=>supSalito(data.grado),400);}}catch(e){}return SUP.d;}
function supChip(){if(!S.user||!SUP.d)return'';const d=SUP.d,r=supReady();
  return`<button class="mwguida mwsup" data-trsup aria-label="Il tuo superstite">🎖️ ${d.grado} · ⚡${d.energia}${r?` <b>🎒${r}</b>`:''}</button>`;}
const supLeft=t=>{const s=Math.max(0,Math.round((new Date(t)-Date.now())/1000));return s>=3600?Math.floor(s/3600)+' h '+String(Math.floor(s%3600/60)).padStart(2,'0')+' min':s>=60?Math.ceil(s/60)+' min':s+' s';};
/* ---------- la scheda ---------- */
async function supSheet(tab){if(!S.user){toast('Accedi per far crescere il tuo superstite');try{loginSheet();}catch(e){}return;}
  let vis=null;try{vis=localStorage.getItem('zsh_sup_intro');}catch(e){vis='1';}if(!vis&&!tab)return supIntro(0);
  SUP.tab=tab||SUP.tab||'io';
  const tabs=()=>`<div class="hkvb trtabs suptabs">${[['io','🎖️ Io'],['sped',`🎒 Spedizioni${supReady()?` (${supReady()})`:''}`],['eq','🛠️ Attrezzi'],['come','❓ Come si cresce']].map(([k,n])=>`<button data-spt="${k}" class="${SUP.tab===k?'on':''}">${n}</button>`).join('')}</div>`;
  openSheet('🎖️ Il tuo superstite',tabs()+'<div class="supbox"><p><span class="spin"></span></p></div>',c=>c.querySelectorAll('[data-spt]').forEach(b=>b.onclick=()=>supSheet(b.dataset.spt)));
  await supLoad(true);const box=document.querySelector('#sheet.open .supbox');if(!box)return;
  const tb=document.querySelector('#sheet.open .suptabs');if(tb){tb.outerHTML=tabs();document.querySelectorAll('#sheet.open [data-spt]').forEach(b=>b.onclick=()=>supSheet(b.dataset.spt));}
  if(!SUP.d){box.innerHTML='<p class="notice">Il superstite arriva dopo l’aggiornamento del server (blocco SQL 020), oppure la rete è lenta. Riprova fra poco.</p>';return;}
  if(SUP.tab==='sped')return supSped(box);if(SUP.tab==='eq')return supEqPaint(box);if(SUP.tab==='come'){box.innerHTML=supComeHTML();supBindCommon(box);return;}
  supIoPaint(box);}
function supIoPaint(box){const d=SUP.d;const pc=d.xp_a>d.xp_da?Math.round((d.xp-d.xp_da)/(d.xp_a-d.xp_da)*100):100;const g=((Math.max(1,d.serie)-1)%7)+1;
  const rk=supRank(d.grado),nx=supNextRank(d.grado),ad=supAdesso();const eq=SUP_EQ.filter(([k])=>supEq(k)).map(x=>x[1]).join('');
  box.innerHTML=`<div class="supcard"><div class="supav">${rk[1]}${eq?`<i>${eq}</i>`:''}</div><div class="supinfo"><b>@${esc((S.user&&S.user.nick)||'tu')} · ${rk[2]}</b><small>🎖️ Grado ${d.grado} · ${rk[3]}</small>
      <div class="vbar supxp"><span style="width:${Math.min(100,Math.max(3,pc))}%"></span></div><small>⭐ ${wNum(d.xp)} · al grado ${d.grado+1} mancano ⭐ ${wNum(Math.max(0,d.xp_a-d.xp))}${nx?` · al grado ${nx[0]} diventi ${nx[1]} ${nx[2]}`:''}</small></div></div>
    ${ad?`<div class="supnow"><span>${ad.ic}</span><div><small>ADESSO</small><b>${ad.t}</b></div><button class="btn" data-spnow="${ad.go}">${ad.b}</button></div>`:''}
    <p class="muted" style="font-size:12.5px;margin:0 0 8px">Questo sei tu. Più ti muovi nel mondo (spedizioni, orde, aiuti, ogni giorno), più cresci: sali di grado, vai più lontano e porti a casa più provviste.</p>
    <div class="supen"><b>⚡ Energia ${d.energia}/${d.energia_max}</b><small>${d.energia>=d.energia_max?'Piena: usala per una spedizione, altrimenti si spreca la ricarica':`+1 fra ${supLeft(Date.now()+d.prossima_s*1000)} · una carica ogni ${d.ricarica_min} min`}</small>
      <div class="supcar">${Array.from({length:Math.max(d.energia_max,d.energia)},(_,i)=>`<i class="${i<d.energia?'on':''}"></i>`).join('')}</div></div>
    <h4 class="hh">📅 Serie di giorni ${d.serie?`· ${d.serie} di fila`:''}</h4>
    <div class="supserie">${[1,2,3,4,5,6,7].map(i=>{const fatto=d.serie_oggi?i<=g:i<=(d.serie%7);return`<span class="${fatto?'ok':''} ${i===7?'big':''}"><b>${i}</b><small>${i===7?'🧱50':'🥫'+5*i}</small></span>`;}).join('')}</div>
    ${d.serie_oggi?'<p class="muted" style="font-size:12.5px">Premio di oggi preso: torna domani per non perdere la serie.</p>':'<button class="btn wide" data-spserie>📅 Ritira il premio di oggi</button>'}
    ${supVia().length||supReady()?`<button class="btn wide alt" data-spt2="sped">🎒 ${supReady()?`${supReady()} spedizioni tornate: raccogli`:`${supVia().length} in spedizione`}</button>`:`<button class="btn wide alt" data-spt2="sped">🎒 Manda il superstite in spedizione</button>`}
    <h4 class="hh">🧠 Abilità ${d.punti?`<span class="supdot">${d.punti} ${d.punti===1?'punto libero':'punti liberi'}</span>`:''}</h4>
    <p class="muted" style="font-size:12.5px;margin:0 0 6px">A ogni grado guadagni un punto: mettilo dove ti serve (massimo 5 per abilità).</p>
    ${SUP_AB.map(([k,ic,n,ds])=>{const a=supAb(k);return`<div class="supab"><span>${ic}</span><div><b>${n} <i class="supdots">${'●'.repeat(a)}${'○'.repeat(5-a)}</i></b><small>${ds}</small></div><button class="btn small" data-spab="${k}" ${!d.punti||a>=5?'disabled':''}>+1</button></div>`;}).join('')}
    <h4 class="hh">📣 Fatti conoscere</h4>
    <p class="muted" style="font-size:12.5px;margin:0 0 6px">La prima condivisione del giorno: ⭐ +20 e ⚡ +1. Ogni amico che crea l’account col tuo link: ⭐ +50, ⚡ +2 e scorte; quando valuta la casa ⭐ +150 e 🧱 150.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-spshare>📣 Condividi sui social${d.share_oggi?'':' · ⭐ +20'}</button><button class="btn ghost small" data-spinv>📨 Invita un amico</button></div>`;
  supBindCommon(box);
  const nw=box.querySelector('[data-spnow]');if(nw)nw.onclick=()=>{const g=nw.dataset.spnow;if(g==='serie'){const b=box.querySelector('[data-spserie]');if(b)b.click();return;}
    if(g==='abil'){const a=box.querySelector('.supab');if(a)a.scrollIntoView({behavior:'smooth',block:'center'});return;}supSheet(g);};
  const se=box.querySelector('[data-spserie]');if(se)se.onclick=async()=>{se.disabled=true;try{const{data,error}=await SB.rpc('world_sup_serie');if(error)throw error;
      if(data.ok){toast(`📅 Giorno ${data.giorno}: 🪵 +${data.legno} 🥫 +${data.cibo} ⛽ +${data.carb} ⭐ +${data.xp} ⚡ +${data.energia}${data.mattoni?' 🧱 +'+data.mattoni:''}`);RES.t=0;try{resLoad(true);}catch(e){}}else toast(data.msg);}catch(e){toast('Non riuscito');}supSheet('io');};
  box.querySelectorAll('[data-spab]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_sup_abilita',{p_k:b.dataset.spab});if(error)throw error;toast(data.ok?'🧠 '+data.msg:data.msg);}catch(e){toast('Non riuscito');}supSheet('io');});}
function supBindCommon(box){box.querySelectorAll('[data-spt2]').forEach(b=>b.onclick=()=>supSheet(b.dataset.spt2));
  const sh=box.querySelector('[data-spshare]');if(sh)sh.onclick=()=>{window.SHEET_BACK={t:'‹ Il tuo superstite',fn:()=>supSheet('io')};shareSheet();};
  const iv=box.querySelector('[data-spinv]');if(iv)iv.onclick=()=>{window.SHEET_BACK={t:'‹ Il tuo superstite',fn:()=>supSheet('io')};inviteSheet();};}
/* ---------- 🎒 spedizioni ---------- */
function supKind(t){const s=t.shop||'',a=t.amenity||'';
  if(/^(supermarket|convenience|bakery|butcher|greengrocer|deli|pastry|frozen_food)$/.test(s)||a==='marketplace')return'cibo';
  if(/^(hardware|doityourself|garden_centre|trade)$/.test(s)||t.leisure==='park')return'legno';
  if(a==='fuel')return'carb';if(/^(pharmacy|hospital|clinic)$/.test(a)||s==='chemist')return'farmaco';return'misto';}
const SUP_CAT={supermarket:'Supermercato',convenience:'Alimentari',bakery:'Panificio',butcher:'Macelleria',greengrocer:'Frutta e verdura',deli:'Gastronomia',pastry:'Pasticceria',frozen_food:'Surgelati',
  hardware:'Ferramenta',doityourself:'Fai da te',garden_centre:'Vivaio',trade:'Materiali edili',chemist:'Drogheria',marketplace:'Mercato',fuel:'Distributore',pharmacy:'Farmacia',hospital:'Ospedale',clinic:'Clinica',
  school:'Scuola',townhall:'Municipio',post_office:'Ufficio postale',library:'Biblioteca',park:'Parco'};
async function supPoi(lat,lon,rkm){const R=Math.round(Math.min(4,Math.max(1,rkm))*1000);const key='zsh_sp_'+lat.toFixed(3)+'_'+lon.toFixed(3)+'_'+R;
  try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c&&Date.now()-c.t<3*864e5)return c.P;}catch(e){}
  const A=`(around:${R},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const q=`[out:json][timeout:25];(nwr["shop"~"^(supermarket|convenience|bakery|butcher|greengrocer|deli|pastry|frozen_food|hardware|doityourself|garden_centre|trade|chemist)$"]${A};nwr["amenity"~"^(marketplace|fuel|pharmacy|hospital|clinic|school|townhall|post_office|library)$"]${A};nwr["leisure"="park"]["name"]${A};);out center tags 250;`;
  const els=await trOverpass(q,22000,4);const P=[],seen=new Set();
  (els||[]).forEach(e=>{const t=e.tags||{};const la=e.lat!=null?e.lat:e.center&&e.center.lat,lo=e.lon!=null?e.lon:e.center&&e.center.lon;if(la==null||lo==null)return;
    const k=supKind(t);const cat=SUP_CAT[t.shop]||SUP_CAT[t.amenity]||SUP_CAT[t.leisure]||SUP_K[k][1];const name=String(t.name||cat).slice(0,40);
    const id=Math.round(la*3000)+':'+Math.round(lo*2500);if(seen.has(id))return;seen.add(id);P.push({k,cat,name,lat:+la.toFixed(6),lon:+lo.toFixed(6)});});
  try{localStorage.setItem(key,JSON.stringify({t:Date.now(),P}));}catch(e){}return P;}
function supPlaces(){let H=[];try{H=myHouses().filter(h=>h.lat!=null&&h.lon!=null);}catch(e){}return H;}
/* distanza dal più vicino dei tuoi posti (come fa il server) */
function supKm(p){const H=supPlaces();let m=null;H.forEach(h=>{const k=trM(h.lat,h.lon,p.lat,p.lon)/1000;if(m==null||k<m)m=k;});return m==null?null:Math.max(0.2,Math.round(m*100)/100);}
async function supSped(box){const d=SUP.d;const H=supPlaces();const via=supVia();const done=(d.spedizioni||[]).filter(x=>x.stato==='raccolta');
  const run=via.map(x=>{const k=SUP_K[x.kind]||SUP_K.misto;const ok=new Date(x.end_at)<=Date.now();const tot=Math.max(1,new Date(x.end_at)-new Date(x.start_at));const pc=Math.min(100,Math.max(2,(Date.now()-new Date(x.start_at))/tot*100));
    return`<div class="suprun ${ok?'ok':''}"><span>${k[0]}</span><div><b>${esc(x.nome||'Spedizione')}</b><small>${String(x.km).replace('.',',')} km · ${ok?'✅ È tornato!':'torna fra <span data-spleft="'+esc(x.end_at)+'">'+supLeft(x.end_at)+'</span>'} · rischio ${x.rischio}%</small>
      <div class="vbar"><span style="width:${pc}%"></span></div></div>${ok?`<button class="btn small" data-sprac="${x.id}">🎁 Raccogli</button>`:''}</div>`;}).join('');
  const es=done.slice(0,3).map(x=>{const e=x.esito||{};const k=SUP_K[x.kind]||SUP_K.misto;const g=[e.legno?'🪵 +'+e.legno:'',e.cibo?'🥫 +'+e.cibo:'',e.carb?'⛽ +'+e.carb:'',e.energia?'⚡ +'+e.energia:'',e.mattoni?'💰 🧱 +'+e.mattoni:'',e.xp?'⭐ +'+e.xp:''].filter(Boolean).join(' ');
    return`<div class="supes"><span>${k[0]}</span><small><b>${esc(x.nome||'')}</b> ${e.ko?'🧟 scappato, metà bottino: ':''}${g||'niente'}</small></div>`;}).join('');
  const maxs=d.max_sped||1;
  box.innerHTML=`<div class="supsthead"><span>⚡ ${d.energia}/${d.energia_max}</span><span>📏 raggio ${String(d.raggio_km).replace('.',',')} km</span><span>👥 ${via.length}/${maxs} fuori</span>${d.notte?'<span>🌙 notte: +10% rischio'+(supEq('torcia')?' (🔦 no)':'')+'</span>':''}</div>
    ${run?`<h4 class="hh">In viaggio</h4>${run}`:''}${es?`<h4 class="hh">Tornati oggi</h4>${es}`:''}
    ${!H.length?'<p class="notice">Ti serve una casa nel mondo: le spedizioni partono dalle tue case.</p>':`
    <h4 class="hh">Dove lo mandi?</h4>
    ${H.length>1?`<div class="supfrom">${H.map((h,i)=>`<button data-spfrom="${i}" class="${SUP.h===i?'on':''}">${h.home?'❤️ Casa tua':'🔑 '+esc(h.label)}</button>`).join('')}</div>`:''}
    <div class="supfilt">${[['tutti','Tutti'],...Object.entries(SUP_K).map(([k,v])=>[k,v[0]+' '+v[1]])].map(([k,n])=>`<button data-spf="${k}" class="${SUP.f===k?'on':''}">${n}</button>`).join('')}</div>
    <div class="suppoi"><p class="muted"><span class="spin"></span> Cerco i posti veri intorno…</p></div>`}`;
  supBindCommon(box);
  box.querySelectorAll('[data-spleft]').forEach(s=>{const t=setInterval(()=>{if(!s.isConnected){clearInterval(t);return;}s.textContent=supLeft(s.dataset.spleft);if(new Date(s.dataset.spleft)<=Date.now()){clearInterval(t);supSheet('sped');}},1000);});
  box.querySelectorAll('[data-sprac]').forEach(b=>b.onclick=()=>supRaccogli(b.dataset.sprac,b));
  box.querySelectorAll('[data-spfrom]').forEach(b=>b.onclick=()=>{SUP.h=+b.dataset.spfrom;SUP.P=null;supSped(box);});
  box.querySelectorAll('[data-spf]').forEach(b=>b.onclick=()=>{SUP.f=b.dataset.spf;supSped(box);});
  if(!H.length)return;const h=H[Math.min(SUP.h,H.length-1)];const pk=h.lat.toFixed(4)+','+h.lon.toFixed(4)+','+d.raggio_km;
  if(SUP.Pk!==pk||!SUP.P){try{SUP.P=await supPoi(h.lat,h.lon,d.raggio_km);SUP.Pk=pk;}catch(e){SUP.P=null;}}
  const pb=box.querySelector('.suppoi');if(!pb||!pb.isConnected)return;
  if(!SUP.P){pb.innerHTML='<p class="muted">OpenStreetMap non risponde: riprova fra un minuto.</p><button class="btn small" data-spretry>Riprova</button>';pb.querySelector('[data-spretry]').onclick=()=>supSped(box);return;}
  const L=SUP.P.map(p=>({...p,km:supKm(p)})).filter(p=>p.km!=null&&(SUP.f==='tutti'||p.k===SUP.f)).sort((a,b)=>a.km-b.km).slice(0,40);
  const recenti=(d.spedizioni||[]).filter(x=>Date.now()-new Date(x.start_at)<12*3600e3);
  pb.innerHTML=L.length?L.map((p,i)=>{const c=supCalc(p.km);const fuori=p.km>d.raggio_km;const gia=recenti.some(x=>Math.abs(x.lat-p.lat)<0.0003&&Math.abs(x.lon-p.lon)<0.0004);
      const pieno=via.length>=maxs;const poca=d.energia<c.energia;const k=SUP_K[p.k];
      return`<div class="supp ${fuori?'off':''}"><span class="supi">${k[0]}</span><div><b>${esc(p.name)}</b><small>${esc(p.cat)} · ${kmTxt(p.km)} · ⏱ ${c.min} min · ⚠️ ${c.rischio}%</small>
        <small class="supg">${supLoot(p.k,c.bottino)} · ⭐ +${c.xp}</small></div>
        <button class="btn small" data-spgo="${i}" ${fuori||gia||pieno||poca?'disabled':''}>${fuori?'Troppo lontano':gia?'Già visitato':pieno?'Squadra fuori':poca?`Serve ⚡${c.energia}`:`Parti · ⚡${c.energia}`}</button></div>`;}).join('')
    :`<p class="muted">Nessun posto di questo tipo entro ${String(d.raggio_km).replace('.',',')} km. Prova un altro filtro o sali di grado per allargare il raggio.</p>`;
  pb.querySelectorAll('[data-spgo]').forEach(b=>b.onclick=async()=>{const p=L[+b.dataset.spgo];b.disabled=true;
    try{const{data,error}=await SB.rpc('world_sped_parti',{p_kind:p.k,p_nome:p.name,p_lat:p.lat,p_lon:p.lon});if(error)throw error;toast(data.ok?data.msg:data.msg);}catch(e){toast('Non riuscito: riprova');}
    supSheet('sped');});}
async function supRaccogli(id,b){if(b)b.disabled=true;let r=null;try{const{data,error}=await SB.rpc('world_sped_raccogli',{p_id:+id});if(error)throw error;r=data;}catch(e){toast('Non riuscito');}
  if(r&&!r.ok)toast(r.msg);
  if(r&&r.ok){const g=[r.legno?'🪵 +'+r.legno:'',r.cibo?'🥫 +'+r.cibo:'',r.carb?'⛽ +'+r.carb:'',r.energia?'⚡ +'+r.energia:'',r.xp?'⭐ +'+r.xp:''].filter(Boolean).join(' ');
    toast(`${r.ko?'🧟 ':'🎒 '}${r.msg}: ${g}${r.mattoni?' · 💰 tesoro 🧱 +'+r.mattoni:''}`);RES.t=0;try{resLoad(true);}catch(e){}try{wMine(true);}catch(e){}
    if(r.salito){await supLoad(true);supSalito(r.grado);return;}}
  supSheet('sped');}
function supSalito(g){openSheet('🎖️ Sei salito di grado!',`<div class="supup"><b>🎖️ ${g}</b><p>Il tuo superstite è più esperto: hai <b>un punto abilità</b> da usare e il raggio delle spedizioni è più ampio.</p></div>
  <button class="btn wide" data-spgo2>🧠 Usa il punto</button><button class="btn wide alt" data-spsh2>📣 Fallo sapere agli amici</button>`,c=>{
  c.querySelector('[data-spgo2]').onclick=()=>supSheet('io');c.querySelector('[data-spsh2]').onclick=()=>{window.SHEET_BACK={t:'‹ Il tuo superstite',fn:()=>supSheet('io')};shareSheet({grado:g});};});}
/* ---------- la prima volta: chi è il superstite, in 3 passi ---------- */
const SUP_INTRO=[['🧑','Questo sei tu','Nel mondo unico non ci sono solo le tue case: ci sei anche <b>tu</b>, un superstite. Lo vedi sulla mappa sopra casa tua e nel tondo in basso a sinistra.'],
  ['🎒','Lo mandi a cercare provviste','Con l’<b>⚡ energia</b> lo mandi nei <b>posti veri</b> vicino a casa: al supermercato per il 🥫 cibo, in ferramenta o al parco per il 🪵 legno, al distributore per il ⛽ carburante. Dopo qualche minuto torna e ti avvisa.'],
  ['🎖️','Più giochi, più cresce','Ogni spedizione, orda, aiuto e ogni giorno di gioco gli danno <b>esperienza ⭐</b>: sale di grado (da Recluta a Leggenda), va più lontano, porta più provviste e impara abilità. L’energia si ricarica da sola: giochi quando vuoi.']];
function supIntro(i){const x=SUP_INTRO[i];if(!x){try{localStorage.setItem('zsh_sup_intro','1');}catch(e){}return supSheet('sped');}
  openSheet('🎖️ Il tuo superstite',`<div class="supintro"><span>${x[0]}</span><small>${i+1} di ${SUP_INTRO.length}</small><b>${x[1]}</b><p>${x[2]}</p></div>
    <div class="supdots2">${SUP_INTRO.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div>
    <button class="btn wide" data-spin>${i<SUP_INTRO.length-1?'Avanti ›':'🎒 Mandalo in spedizione'}</button><button class="btn wide ghost" data-spsk>Salta</button>`,c=>{
    c.querySelector('[data-spin]').onclick=()=>supIntro(i+1);c.querySelector('[data-spsk]').onclick=()=>{try{localStorage.setItem('zsh_sup_intro','1');}catch(e){}supSheet('io');};});}
/* ---------- il tondo "Tu" in basso a sinistra (Mappa) ---------- */
function supMeBtn(){try{const on=S.user&&S.tab==='mappa'&&document.body.classList.contains('nonav')&&!document.getElementById('lente');let b=document.querySelector('.supme');
  if(!on){if(b)b.remove();return;}const d=SUP.d;const rk=supRank(d?d.grado:1);const st=supStato();
  const html=`<span class="supme-av">${rk[1]}</span>${d?`<em>${d.grado}</em>`:''}<b class="${st.c}">${st.l}</b>`;
  if(!b){document.body.insertAdjacentHTML('beforeend',`<button class="supme" aria-label="Il tuo superstite">${html}</button>`);b=document.querySelector('.supme');b.onclick=()=>{window.SHEET_BACK=null;supSheet(supReady()?'sped':undefined);};}
  else if(b.dataset.h!==html){b.innerHTML=html;}b.dataset.h=html;b.classList.toggle('pulse',st.c==='ok');}catch(e){}}
/* ---------- 🛠️ attrezzi ---------- */
function supEqPaint(box){const legno=(RES.d&&RES.d.legno)||0,mat=typeof trrMat==='function'?trrMat():0;
  box.innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 8px">Gli attrezzi si costruiscono con il 🪵 legno (dalle spedizioni in ferramenta e nei parchi) e i 🧱 mattoni. Ogni attrezzo ha 3 livelli. Ora hai 🪵 ${wNum(legno)} e 🧱 ${wNum(mat)}.</p>
    ${SUP_EQ.map(([k,ic,n,ds])=>{const l=supEq(k);const nx=l+1;const cl=30*nx,cm=50*nx;const can=l<3&&legno>=cl&&mat>=cm;
      return`<div class="supab"><span>${ic}</span><div><b>${n} <i class="supdots">${'●'.repeat(l)}${'○'.repeat(3-l)}</i></b><small>${ds}</small>${l<3?`<small class="supg">livello ${nx}: 🪵 ${cl} · 🧱 ${cm}</small>`:'<small class="supg">al massimo</small>'}</div>
        <button class="btn small" data-speq="${k}" ${can?'':'disabled'}>${l<3?'🔨 Costruisci':'✅'}</button></div>`;}).join('')}`;
  box.querySelectorAll('[data-speq]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_sup_equip',{p_k:b.dataset.speq});if(error)throw error;toast(data.ok?'🔨 '+data.msg:data.msg);
      if(data.ok){RES.t=0;try{await resLoad(true);}catch(e){}try{await wMine(true);}catch(e){}}}catch(e){toast('Non riuscito');}supSheet('eq');});}
/* ---------- ❓ come si cresce ---------- */
function supComeHTML(){return`<div class="supcome">
  <p><b>Il superstite sei tu</b>: lo vedi sulla mappa sopra casa tua e nel tondo in basso a sinistra. Il suo aspetto cambia col grado: ${SUP_RANK.map(r=>`${r[1]} ${r[2]} (${r[0]})`).join(', ')}.</p>
  <p><b>Il tuo superstite cresce con te.</b> Più giochi, più sale di grado, più provviste porta a casa, e puoi giocare quando vuoi, non solo per l’orda.</p>
  <h4 class="hh">🎖️ Grado ed esperienza ⭐</h4><p>Ogni premio in 🧱 Mattoni ti dà anche esperienza (⭐ 1 ogni 🧱 4): orde rette, affitti, rinforzi, presidi. In più: spedizioni, serie di giorni, condivisione e amici invitati. Grado 2 a ⭐ 50, grado 3 a ⭐ 200, grado 4 a ⭐ 450, grado 5 a ⭐ 800…</p>
  <h4 class="hh">⚡ Energia</h4><p>Hai 10 cariche (di più con 💪 Resistenza). Ogni spedizione ne usa da 1 a 3 secondo la distanza. Si ricaricano da sole, una ogni 2 ore: chi entra più spesso le usa tutte e cresce di più.</p>
  <h4 class="hh">🎒 Spedizioni nei posti veri</h4><p>Scegli un posto vero vicino a una tua casa: 🛒 supermercati e alimentari danno 🥫 cibo; 🔧 ferramenta, vivai e parchi 🪵 legno; ⛽ distributori carburante; 💊 farmacie energia; scuole, poste e municipio un po’ di tutto. Più è lontano, più dura, più rende e più è rischioso. Il raggio parte da 1,5 km e cresce di 0,5 km a ogni grado. Se gli zombie lo inseguono torna con metà bottino. A volte trova un 💰 tesoro in Mattoni. Ogni posto si può rifare dopo 12 ore. Quando torna arriva la notifica.</p>
  <h4 class="hh">🔫 Caccia nella Lente</h4><p>Apri 📷 Lente e tocca 🔫 Caccia (⚡ 1): arrivano 3–6 zombie da direzioni diverse, girati e toccali prima che ti raggiungano. Ognuno: ⭐ 5 e una scorta; presi tutti ⭐ 10 in più. Max 10 al giorno.</p>
  <h4 class="hh">🧠 Abilità</h4><p>Un punto a ogni grado: ${SUP_AB.map(a=>`${a[1]} <b>${a[2]}</b> ${a[3]}`).join('; ')}.</p>
  <h4 class="hh">🛠️ Attrezzi</h4><p>${SUP_EQ.map(a=>`${a[1]} <b>${a[2]}</b>: ${a[3]}`).join('; ')}. Livello n: 🪵 30×n e 🧱 50×n.</p>
  <h4 class="hh">📅 Serie di giorni</h4><p>Entra e ritira il premio ogni giorno: cresce per 7 giorni (il 7° dà 🧱 50 e ⚡ +3), poi ricomincia. Se salti un giorno si riparte da 1.</p>
  <h4 class="hh">Dove vanno le provviste?</h4><p>🥫 serve per gli assalti, 🪵 per le assi e gli attrezzi, ⛽ per viaggiare in moto o in auto verso alleati e rivali. Quelle in più si scambiano al 🔄 Mercato. Massimo 400 al giorno per risorsa.</p>
  <h4 class="hh">📣 Amici e social</h4><p>Condividi il tuo grado e la tua casa: la prima condivisione del giorno dà ⭐ 20 e ⚡ 1. Ogni amico che entra col tuo link ti fa crescere (⭐ 50 + ⚡ 2 + scorte, e ⭐ 150 + 🧱 150 quando valuta la casa).</p>
  <button class="btn wide" data-spt2="sped">🎒 Prova una spedizione</button></div>`;}
/* ---------- 🧭 nella guida "Cosa fare" ---------- */
function supGdItems(I){const d=SUP.d;if(!d)return;const r=supReady();
  if(r)I.push({p:70,ic:'🎒',t:`Il tuo superstite è tornato${r>1?` (${r} spedizioni)`:''}`,why:'Raccogli le provviste e l’esperienza.',acts:[{b:'🎁 Raccogli',run:async()=>{supSheet('sped');return{skip:1};}}]});
  if(!d.serie_oggi)I.push({p:55,ic:'📅',t:`Serie di giorni: ritira il premio${d.serie?` (giorno ${(d.serie%7)+1})`:''}`,why:'Cresce per 7 giorni di fila: il 7° dà 🧱 50.',acts:[{b:'📅 Ritira',run:async()=>{supSheet('io');return{skip:1};}}]});
  if(d.punti)I.push({p:52,ic:'🧠',t:`Hai ${d.punti} ${d.punti===1?'punto abilità':'punti abilità'} da usare`,why:'Più raggio, più energia, meno rischio, più tesori o più Mattoni al Mercato.',acts:[{b:'🧠 Scegli',run:async()=>{supSheet('io');return{skip:1};}}]});
  if(d.energia>=Math.min(d.energia_max,3)&&supVia().length<(d.max_sped||1))I.push({p:d.energia>=d.energia_max?58:35,ic:'⚡',t:`Energia ${d.energia}/${d.energia_max}: manda una spedizione`,why:d.energia>=d.energia_max?'È piena: se non la usi, la ricarica si spreca.':'Provviste ed esperienza dai posti veri intorno alle tue case.',acts:[{b:'🎒 Scegli il posto',run:async()=>{supSheet('sped');return{skip:1};}}]});}
/* ---------- 🗺️ spedizioni in corso sulla mappa ---------- */
/* tu sulla mappa: sopra casa tua, o in cammino verso la spedizione (linea tratteggiata) */
function supMe(lm){try{const H=supPlaces();const home=H.find(h=>h.home)||H[0];if(!home)return;const d=SUP.d;const rk=supRank(d?d.grado:1);
  const v=supVia()[0];let la=home.lat,lo=home.lon,f=0;if(v){const t0=new Date(v.start_at),t1=new Date(v.end_at);const tot=Math.max(1,t1-t0),el=Date.now()-t0;
    /* andata nella prima metà, ritorno nella seconda */f=Math.min(1,Math.max(0,el/tot));const k=f<.5?f*2:2-f*2;
    const o=H.reduce((a,h)=>!a||trM(h.lat,h.lon,v.lat,v.lon)<trM(a.lat,a.lon,v.lat,v.lon)?h:a,null)||home;la=o.lat+(v.lat-o.lat)*k;lo=o.lon+(v.lon-o.lon)*k;
    const gj={type:'Feature',geometry:{type:'LineString',coordinates:[[o.lon,o.lat],[v.lon,v.lat]]}};
    if(!lm.map.getSource('supl')){lm.map.addSource('supl',{type:'geojson',data:gj});lm.map.addLayer({id:'supl',type:'line',source:'supl',paint:{'line-color':'#ffd23f','line-width':4,'line-dasharray':[1.5,1.5]}});}else lm.map.getSource('supl').setData(gj);}
  else if(lm.map.getSource('supl'))lm.map.getSource('supl').setData({type:'FeatureCollection',features:[]});
  const html=`<b>${rk[1]}</b><span>Tu${d?' · '+d.grado:''}</span>`;
  if(!SUP.me||SUP.meMap!==lm.map){try{SUP.me&&SUP.me.remove();}catch(e){}const el=elDiv('lm-ally lm-me',html);el.style.zIndex='7';el.onclick=e=>{e.stopPropagation();window.SHEET_BACK=null;supSheet();};
    SUP.me=new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,-34]}).setLngLat([lo,la]).addTo(lm.map);SUP.meMap=lm.map;}
  else{SUP.me.setLngLat([lo,la]);const el=SUP.me.getElement();if(el.dataset.h!==html){el.innerHTML=html;el.dataset.h=html;}SUP.me.setOffset(v?[0,0]:[0,-34]);}}catch(e){}}
function supMarks(){try{if(S.tab!=='mappa'||!S.user||typeof maplibregl==='undefined')return;const lm=window.__mf;if(!lm||!lm.map||!document.body.contains(lm.map.getContainer()))return;supMe(lm);
  const V=supVia();const sig=V.map(x=>x.id+(new Date(x.end_at)<=Date.now()?'ok':'')).join('|');if(SUP.mkSig===sig&&SUP.mkMap===lm.map){SUP.mk.forEach(m=>{const s=m.getElement().querySelector('[data-spl]');if(s)s.textContent=supLeft(s.dataset.spl);});return;}
  SUP.mk.forEach(m=>{try{m.remove();}catch(e){}});SUP.mk=[];SUP.mkSig=sig;SUP.mkMap=lm.map;
  V.forEach(x=>{const ok=new Date(x.end_at)<=Date.now();const k=SUP_K[x.kind]||SUP_K.misto;const el=elDiv('lm-ally lm-sped'+(ok?' ok':''),`<b>🎒${k[0]}</b><span>${esc(x.nome||'')}</span><i ${ok?'':`data-spl="${esc(x.end_at)}"`}>${ok?'tornato!':supLeft(x.end_at)}</i>`);
    el.onclick=e=>{e.stopPropagation();window.SHEET_BACK=null;supSheet('sped');};try{SUP.mk.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([x.lon,x.lat]).addTo(lm.map));}catch(e){}});}catch(e){}}
/* ---------- avvio, giro e notifica ---------- */
const _zGoSup=zGoUrl;zGoUrl=function(u){_zGoSup(u);try{if(new URL(u,location.href).searchParams.get('sup'))setTimeout(()=>supSheet('sped'),900);}catch(e){}};
zEvery(()=>{try{if(document.hidden||!S.user)return;if(Date.now()-SUP.t>(['mappa','orda','social'].includes(S.tab)?90000:300000))supLoad().then(()=>{try{trrRepaint();}catch(e){}});supMarks();}catch(e){}},3000,'superstite');
zEvery(()=>{if(!document.hidden)supMeBtn();},1000,'superstite-tu');
setTimeout(()=>{try{supLoad(true);}catch(e){}},3000);
</script>
