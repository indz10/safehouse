<script>
/* =========================================================
   ORDA PULITA (Fase 3b-1)
   La scheda Orda disegna direttamente i suoi riquadri, nell'ordine di prima:
   🧭 il tuo prossimo passo · 🗺️ il fronte · 🧟 l'orda del mondo · 🤝 i tuoi alleati
   · 🎁 premi e fortuna · 🎯 missioni di oggi.
   Prima costruiva tutto il vecchio gioco a carte/notti (33 blocchi, ~115 KB di pagina)
   e poi ne nascondeva 27 con 14 strati di splitHub/ssOf/ordaUnify.
   Niente più schermata "scegli il tipo di casa": si gioca sempre con la casa vera.
   ========================================================= */
/* partita: gli stessi pezzi che creava renderHubBase (premi, missioni e Mattoni li usano ancora) */
function ordaPrep(){
  try{trSetupVera();}catch(e){}
  /* prima volta: la partita parte come quando si sceglieva la casa (monete di partenza poi convertite in Mattoni,
     un giro di ruota, un gratta e vinci, vantaggio della casa vera); startGame ridisegna già la scheda */
  if(!G.type){startGame(HTYPES.vera?'vera':Object.keys(HTYPES)[0]);return true;}
  if(!HTYPES[G.type])G.type=HTYPES.vera?'vera':Object.keys(HTYPES)[0];
  if(G.level==null)G.level=1;if(G.coins==null)G.coins=0;if(G.gems==null)G.gems=0;
  if(!G.h)G.h={porta:0,grate:0,muro:0,luci:0,energia:0,vedetta:0,...((HTYPES[G.type]||{}).start||{})};G.q=G.q||{};G.lots=G.lots||{};G.tools=G.tools||{petardo:1,sirena:1};
  if(!G.friends||!G.me||!G.event)socialInit();G.perk=G.perk||{};G.med=G.med||{};G.wins=G.wins||0;
  try{luckInit();}catch(e){}
  try{dailyBonus();}catch(e){}
  G.view='hub';G.sub='q';G.ss='oggi';G.replay=null;return false;}

var renderOrda=function(){
  if(G.run){G.run.stop=true;G.run=null;}
  try{setMusic('app');}catch(e){}
  document.body.classList.remove('inbattle');try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
  renderHub();};

var renderHub=function(){
  if(ordaPrep())return;
  app.innerHTML='<div class="page orda1" data-one="1"></div>';const pg=app.querySelector('.page');
  /* 🗺️ il fronte (lo stesso riquadro di prima, riusato tra un disegno e l'altro) */
  try{const fr=frNode();pg.appendChild(fr);
    const n=fr.querySelector('.frinfo p.muted');if(n)n.innerHTML='Strade: <b style="color:#2f9e44">verde</b> piano · <b style="color:#e8590c">arancio</b> salita verso casa (zombie più lenti) · <b style="color:#d7263d">rosso</b> discesa (più veloci). Tocca uno zombie per vederlo. È una simulazione: l’esito dell’orda lo calcola il server con livello, preparazione e aiuti.';}catch(e){console.warn('fronte',e);}
  /* 🧟 l'orda del mondo, con simula / le mie case / notifiche */
  try{pg.insertAdjacentHTML('beforeend',orPanelHTML());orBind(pg);opanExtra();}catch(e){console.warn('orda',e);}
  /* 🤝 i tuoi alleati alla prossima orda (subito sotto l'orda) */
  try{alsPutOrda();}catch(e){}
  /* 🎁 premi e fortuna */
  try{pg.insertAdjacentHTML('beforeend',luckTopHTML());luckTopBind();
    const l=pg.querySelector('.lpan');if(l)l.querySelectorAll('p,small').forEach(x=>{if(/vincendo notti/.test(x.textContent))x.textContent='Giri e biglietti si guadagnano riscattando l’orda, completando le missioni e aiutando gli alleati.';});}catch(e){console.warn('fortuna',e);}
  /* 🎯 missioni di oggi */
  try{const h=tmHTML();if(h){pg.insertAdjacentHTML('beforeend',h);tmBind();}}catch(e){console.warn('missioni',e);}
  /* 🧭 il tuo prossimo passo (in cima) */
  try{coPut();}catch(e){}
  /* 🌍 Mondo (Fase 13a, p75): barra dell'orda e linguette Mappa · Orda · Lente in cima */
  try{mwOrda(pg);}catch(e){}
  setTimeout(()=>{try{frMount();}catch(e){}},30);
  /* dati: come faceva la vecchia catena di renderHub */
  try{orLoad();}catch(e){}
  try{if(S.user&&!W.m&&!W.busy)wMine();else if(W.on)wHood();}catch(e){}
  try{if(!OGGI.d||Date.now()-OGGI.t>20*60*1000)oggiMeteo();}catch(e){}
  try{if(W.on&&!G.tourDone&&G.howSeen)setTimeout(orOffer,1500);}catch(e){}
  try{if(!G.howSeen&&!document.querySelector('#sheet.open')&&(G.level||1)<=2){G.howSeen=1;setTimeout(()=>{if(!document.querySelector('#sheet.open'))openRules(0);},700);}}catch(e){}};
/* =========================================================
   ORDA — UNA FUNZIONE PER OGNI COSA (Fase 4b)
   Prima ognuna di queste era una funzione di base più 1–3 strati in moduli diversi
   (p22, p23, p29, p30, p32, p38, p39, p40, p44, p46, p47, p59, p60).
   Ora: la parte di base ha il nome …Base (dove serve) e UNA funzione fa, in ordine,
   quello che facevano gli strati. Il comportamento è lo stesso.
   ========================================================= */

/* ---- il fronte: zombie, meteo, % di tenuta ---- */
/* elenco degli zombie: dal calcolo del server per la casa scelta (p47); senza dati, quello generico (p39) */
function frComp(wl){const F=FR.dests&&FR.dests[0];const T=F&&thrOf(F);if(!T)return frCompBase(wl);const L=[];const n=Math.min(14,6+Math.floor(T.wl/2));for(let i=0;i<n;i++)L.push('walker');
  (T.specials||[]).forEach(x=>{const c=x.k==='boss'?1:Math.max(1,Math.round(2*x.mod*(1-.3*Math.min(3,x.dl||0))));for(let i=0;i<c;i++)L.push(x.k);});L.push('oro');return L;}
/* meteo dell'orda: quello del server per la casa scelta (p47); senza dati, quello di "Oggi" (p39) */
function frWx(){const F=FR.dests&&FR.dests[0];const T=F&&thrOf(F);if(!T||T.ev==null)return frWxBase();const e=EVN[T.ev]||EVN.calma;
  const base=F.home?frWxBase():null;const t=T.temp!=null?Math.round(T.temp):(base?base.t:null);return{ev:T.ev==='neve'?'pioggia':T.ev,ic:e[0],name:e[1],t,eff:`${e[0]} ${e[1]}: ${e[2]}`};}
/* % di tenuta di una casa: formula condivisa (p47 thrCalc); senza dati, il conto del server (p46) */
function frChanceOf(h){const T=thrOf(h);if(T)return thrCalc(T).ch;return frChanceOfBase(h);}
/* intestazione del fronte: base (p39) + % dal server con "perché" (p44) + meteo senza temperatura (p47) */
function frHeader(){frHeaderBase();
  try{const d=DEF.d;if(d){const hh=defHouse(null,true);if(hh){let ch=null;try{const hm=myHouses().find(x=>x.home);if(hm)ch=frChanceOf(hm);}catch(e){}if(ch==null)ch=defChance(hh.total);const n=FR.node;if(n){
    const chip=[...n.querySelectorAll('[data-frchips] span')].find(s=>/di tenere/.test(s.textContent));if(chip){chip.innerHTML=`🛡️ ${ch}% di tenere · <u>perché</u>`;chip.style.cursor='pointer';chip.onclick=()=>whySheet(null,true);}
    const pc=n.querySelector('[data-frpct]');if(pc)pc.textContent=ch+'%';const ring=n.querySelector('.frring');if(ring)ring.style.setProperty('--ok',ch>=50?'#5bd16a':'#d7263d');}}}}catch(e){}
  try{const w=FR.wx;const wb=FR.node&&FR.node.querySelector('.frwx');if(w&&wb&&(w.t==null||w.t===''))wb.textContent=`${w.ic} ${w.name}`;}catch(e){}}
/* scheda dello zombie: base (p39) + missione "zombie d'oro" (p40) + "Su questa casa" con fortificazioni (p59);
   per la casa di un alleato (p60) la stessa scheda con i suoi dati e i pulsanti per aiutarlo */
function frZSheet(k){const ctx=window.__zsCtx;if(!ctx)return frZSheetCasa(k);window.__zsCtx=null;
  const sv=FR.dests;FR.dests=[{label:ctx.label,home:ctx.T.home,bid:ctx.T.bid}];const svT=window.thrOf;window.thrOf=()=>ctx.T;try{frZSheetCasa(k);}finally{FR.dests=sv;window.thrOf=svT;}
  try{const c=document.querySelector('#sheet.open .sheet-b');const z=c&&c.querySelector('.zsh');if(!z)return;
    z.querySelectorAll('[data-zfk]').forEach(b=>{b.disabled=true;b.classList.add('ro');const sm=b.querySelector('small');if(sm)sm.innerHTML=sm.innerHTML.replace(/ · 🧱 \d+/,'').replace(/🧱 \d+/,'da comprare');});
    const zs=ZSP[k]||{n:'Vaganti'};const best=[...z.querySelectorAll('[data-zfk]')].map(b=>b.dataset.zfk)[0];const PL={walker:'tanti Vaganti',runner:'i Corridori',casco:'gli zombie col casco',strillone:'gli Strilloni',scavatore:'gli Scavatori',brute:'i Bruti',ombra:'le Ombre',boss:'il Bruto della Sagra'};const tip=best&&ZDEF[best]?`Ti arrivano ${PL[k]||'gli zombie'}: metti ${ZDEF[best][0]} ${ZDEF[best][1]}!`:`Attento all’orda di stasera!`;
    z.insertAdjacentHTML('beforeend',`<small class="zshw">È la casa del tuo alleato: le fortificazioni le compra lui. Tu puoi aiutarlo così:</small><div class="alacts big"><button class="btn small" data-azh>🤝 Rinforzi +5</button><button class="btn small ghost" data-azs>🛡️ Scudo 💎20</button><button class="btn small ghost" data-azm>💬 Consigliagli</button></div>`);
    z.querySelector('[data-azh]').onclick=e=>alHelp(ctx.uid,e.target);z.querySelector('[data-azs]').onclick=()=>allyShield(ctx.uid,ctx.nick);
    z.querySelector('[data-azm]').onclick=async e=>{e.target.disabled=true;try{const{data,error}=await SB.rpc('world_dm_send',{p_to:ctx.uid,p_body:tip});if(error)throw error;toast(data.ok?'💬 Inviato: “'+tip+'”':data.msg);}catch(x){toast(x.message||'Non inviato');e.target.disabled=false;}};}catch(e){console.warn(e);}}
function frZSheetCasa(k){const before=FR.gold;frZSheetBase(k);if(k==='oro'&&!before&&FR.gold)tmSim('gold');
  try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.zsh'))return;
  const F=FR.dests&&FR.dests[0];const T=F&&typeof thrOf==='function'?thrOf(F):null;if(!T)return;const r=thrCalc(T);
  const x=k==='walker'?null:r.sp.find(s=>s.k===k);if(k!=='walker'&&!x){c.insertAdjacentHTML('afterbegin',`<div class="zsh"><b>🏠 ${esc(F.label)}</b><small>Al tuo livello del mondo (${T.wl}) questo zombie non arriva ancora.</small></div>`);return;}
  const kinds=k==='walker'?['trappole']:[x.dk,x.dk2].filter(Boolean);const O=fortOpts(T).filter(o=>kinds.includes(o.k));
  const ev=EVN[T.ev]||EVN.calma;const force=k==='walker'?`${Math.round(T.std_min*T.mw)}–${Math.round(T.std_max*T.mw)}`:x.p.toFixed(1).replace('.',',');
  const why=k==='walker'?`Sono la massa dell’orda: le 🪤 trappole ne frenano il 6% per livello.`:`Qui pesa ×${(Math.round(x.mod*100)/100).toString().replace('.',',')} (salita e ${ev[1].toLowerCase()}). Difesa principale −30% per livello, supporto −15%.`;
  c.insertAdjacentHTML('afterbegin',`<div class="zsh"><div class="zshh"><div><b>🏠 Su ${esc(F.label)}</b><small>${ev[0]} ${ev[1]} · orda delle ${String(T.hh).padStart(2,'0')}:00</small></div><div class="zshf"><small>forza</small><b>${force}</b></div></div>
    <small class="zshw">${why}</small><div class="rinf">${O.map(o=>`<button class="fch ${o.max?'max':o.cur>0?'ok':'no'} ${o.gain>0?'up':''}" data-zfk="${o.k}"><span>${fortLabel(o)}</span>${o.max?'<small>massimo</small>':`<small>${o.gain>0?`<b>+${o.gain}%</b> · `:''}🧱 ${wNum(o.cost)}</small>`}</button>`).join('')}</div>
    <small class="zshw">Questa casa oggi tiene il <b>${r.ch}%</b>.</small></div>`);
  c.querySelectorAll('[data-zfk]').forEach(b=>b.onclick=()=>{const o=fortOpts(T).find(y=>y.k===b.dataset.zfk);if(o)fortBuy(F,T,o,()=>{try{frRings();}catch(e){}frZSheet(k);});});}catch(e){console.warn(e);}}

/* ---- caricamenti dal server ---- */
/* difesa dal server (p44) → anelli del fronte (p46) → minacce per casa e di nuovo anelli (p47) */
async function defLoad(force){const r=await defLoadBase(force);
  try{if(S.tab==='orda'&&FR.node){frRings();}}catch(e){}
  try{await thrLoad(true);if(S.tab==='orda'&&FR.node){frRings();}}catch(e){}return r;}
/* stato dell'orda (p22) → poi difesa e "prossimo passo" (p44) */
async function orLoad(force){const r=await orLoadBase(force);try{await defLoad(true);coPut();}catch(e){}return r;}
/* ridisegna il pannello dell'orda (p22) e, in Orda, i pulsanti in più (p32) */
function orRefresh(){const r=orRefreshBase();try{if(S.tab==='orda')opanExtra();}catch(e){}return r;}

/* ---- assalti: fumetto e regia sulla mappa ---- */
/* case da mostrare nella regia: simulazione con case dei superstiti simulati (p29) oppure ultima orda
   dal server (p22) con in più le case dei simulati vicine (p23) */
async function orView(lm){if(REG.mode==='sim'&&REG.active){const rows=regSimRows();
    try{const map=lm.map;const fs=map.queryRenderedFeatures({layers:['bld']});const seen=new Set();let n=0;for(const f of fs){const g=f.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
      for(const pl of polys){if(n>=6)break;const q=pl[0]&&wGidRing(pl[0]);if(!q||seen.has(q.bid))continue;seen.add(q.bid);if(isNpc(q.bid)){n++;rows.push({building_id:q.bid,lat:q.lat,lon:q.lon,held:Math.random()<.55,kind:'npc',mine:false});}}}}catch(e){}
    REG.lastRows=rows;return rows;}
  const rows=await orViewBase(lm);let r=rows;
  try{const map=lm.map;if(map.getZoom()>=14.5){const fs=map.queryRenderedFeatures({layers:['bld']});const add=[];const seen=new Set(rows.map(x=>x.building_id));
    for(const f of fs){const g=f.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];for(const pl of polys){const q=pl[0]&&wGidRing(pl[0]);if(!q||seen.has(q.bid))continue;seen.add(q.bid);
      if(isNpc(q.bid)&&add.length<8)add.push({building_id:q.bid,lat:q.lat,lon:q.lon,held:parseInt(md5hex(((OR.s&&OR.s.prev_id)||'x')+q.bid).slice(0,2),16)%60<34,kind:'npc',mine:false});}}
    r=rows.concat(add);}}catch(e){r=rows;}
  REG.lastRows=r;return r;}
/* "Guarda l'assalto": missione (p40) + fumetto di 4 vignette (p30); dal fumetto "sulla mappa" apre la regia (p29) */
async function assalto(mode,i){tmSim('watch');REG.mode=mode||'last';REG.H=regHouses();REG.i=Math.max(0,Math.min(i||0,REG.H.length-1));if(!OR.s&&S.user){try{await orLoad(true);}catch(e){}}
  const show=()=>{const h=REG.H[REG.i];if(!h){toast('Valuta la tua casa per vedere gli assalti');return;}const r=fuRes(h,REG.mode);
    if(r.none&&REG.mode!=='sim'){toast('Questa casa non c’era ancora durante l’ultima orda: ecco la simulazione');REG.mode='sim';return show();}
    const s=OR.s||{};const ctx={sim:REG.mode==='sim',time:REG.mode==='sim'?(s.next_at?orTime(s.next_at):'21:00'):(s.prev_at?orTime(s.prev_at):''),where:(S.zone&&S.zone.address||'').split(',').slice(-1)[0].trim(),
      prep:REG.mode==='sim'?!!s.prepared:!!s.prev_prepared,i:REG.i,n:REG.H.length,
      reward:REG.mode==='sim'?`Simulazione: difesa ${r.sim.pw} contro ${r.sim.atk}. Prepara le case per stare tranquillo.`:`Premi da riscattare: 🧱 ${s.mattoni||0}`,
      advice:REG.mode==='sim'?`Simulazione: difesa ${r.sim.pw} contro ${r.sim.atk}. Prepara le case (+15) o potenziala (+12 per livello).`:'Prepara le case (+15) e chiedi aiuto agli alleati prima della prossima orda.'};
    fumetto(h,r,ctx,how=>{if(how==='next'){REG.i=(REG.i+1)%REG.H.length;show();}else if(how==='map'){assaltoMappa(REG.mode,REG.i);}});};
  show();}

/* ---- missioni e fortuna ---- */
/* missioni del giorno (p20) trasformate nelle missioni dell'orda simulata (p40) */
function tmInit(){const T=tmInitBase();return ORDA_SIM?tmSimFix(T):T;}
/* pulsanti delle missioni: riscatto e "Vai" (p20); le missioni dell'orda simulata portano al punto giusto (p40).
   Le vecchie missioni "giorno / notte / mappa" (p38) non vengono più create da quando l'Orda è simulata. */
function tmBind(){tmBindBase();try{const p=app.querySelector('.tmp');if(!p||!G.tm)return;p.querySelectorAll('[data-tmg]').forEach(b=>{const m=G.tm.list[+b.dataset.tmg];if(!m||!SIMM.some(s=>s[0]===m.k))return;
  b.onclick=()=>{if(m.k==='watch')return assalto('last');if(m.k==='help'){SOC.tab='squadra';return go('social');}
    const t=m.k==='gold'?app.querySelector('.fronte'):app.querySelector('.opan');if(t){t.scrollIntoView({behavior:'smooth',block:'start'});t.classList.remove('flashme');void t.offsetWidth;t.classList.add('flashme');}
    toast(m.k==='prep'?'🛡️ Tocca “Prepara le case”':m.k==='claim'?'🎁 Tocca “Riscatta” quando l’orda è passata':'💰 Cerca lo zombie d’oro sul fronte e toccalo');};});}catch(e){}}
/* le 4 caselle di "Premi e fortuna" (p38, con i messaggi di p40) */
function luckTopBind(){const p=app.querySelector('.lpan');if(!p)return;p.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{const k=b.dataset.lt;if(k==='all')return premiSheet();
  if(k==='daily')return dailySheet();if(k==='jar')return jarSheet();
  if(k==='wheel'){if(G.spins>0)wheelSheet();else toast('Niente giri: riscatta l’orda o completa le missioni');return;}
  if(k==='scratch'){if(G.scratch>0)scratchSheet();else toast('Niente biglietti: aiuta un alleato o completa le missioni');return;}});}
</script>
