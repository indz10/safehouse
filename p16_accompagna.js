<script>
/* =========================================================
   L'ACCOMPAGNATORE: guida passo passo per chi non è pratico
   - pulsante "🙋 Aiuto" sempre visibile
   - modalità "accompagnami": a ogni schermata dice cosa fare,
     con "Mostrami dove" che illumina il punto da toccare
   - domande libere all'IA (con risposte di riserva se offline)
   - testo grande e lettura ad alta voce
   ========================================================= */
S.acc=S.acc||{on:false,asked:false,big:false};
const ACC_FAQ=[[/scudo/i,'Lo Scudo della casa vera va da 0 a 5. Sale quando valuti la casa, migliori l’indice, fai le missioni reali e compri dagli sponsor con il codice. Nel gioco ti dà una barricata più forte.'],
 [/codice|sconto/i,'Apri Mondo, tocca un bollino giallo (uno sponsor) e poi “Ottieni lo sconto”. Il codice vale 7 giorni: mostralo in cassa.'],
 [/preventiv/i,'Apri la scheda di uno sponsor e tocca “Chiedi un preventivo”: scrivi nome e telefono, metti la spunta del consenso e invia.'],
 [/indice/i,'L’indice va da 0 a 10: più è basso, più la casa è sicura. Lo trovi nel verdetto della valutazione.'],
 [/foto/i,'Nella valutazione, passo 2: tocca i tre riquadri e fotografa la porta, una finestra del piano terra e il cancello. Le foto non vengono salvate.'],
 [/gioc|zombie|notte|carte/i,'Nel Gioco scegli la tua casa e tocca “Difendi il quartiere”. Alla prima notte un tutorial ti spiega tutto. Le carte si trascinano sulla strada dove arrivano gli zombie.'],
 [/quartiere/i,'In Simula trovi “Il mio quartiere”: mostra come passerebbe la notte la tua zona, area per area, senza mai mostrare le case dei singoli.'],
 [/privacy|dati/i,'I dati della tua casa restano sul tuo profilo. Sulla mappa non compaiono mai case private, solo aree con almeno 5 persone.'],
 [/sponsor|negozi|attivit/i,'Gli sponsor sono negozi e professionisti della tua zona. Li trovi in Mondo con il bollino giallo: offrono sconti, preventivi e recensioni vere.']];
function accNext(){const t=S.tab;const q=s=>document.querySelector(s);
  if(t==='home')return['Iniziamo dalla tua casa','Tocca il pulsante rosso “Valuta la mia casa”.','[data-go=valuta]'];
  if(t==='valuta'){
    if(!S.zone)return['Passo 1 · L’indirizzo','Scrivi qui l’indirizzo di casa tua, per esempio “Via Roma 10, Volta Mantovana”. Poi tocca “Analizza la zona”.','#addr'];
    if((S.step||0)===0)return['Passo 1 · La tua zona','Questa è la tua zona. Quando hai guardato, tocca “Avanti: le foto”.','#next0'];
    if(S.step===1)return['Passo 2 · Tre foto','Tocca i riquadri e fotografa porta, finestra e cancello. Poi tocca “Analizza con l’IA”. Se non vuoi fare foto, puoi andare direttamente alle domande in alto.','#aiBtn'];
    if(S.step===2){const o=q('.opt:not(.on)');return['Passo 3 · Le domande','Rispondi toccando la frase giusta. Una domanda alla volta: non c’è fretta.',o?'.opt:not(.on)':null];}
    return['Passo 4 · Il verdetto','Questo è il risultato: più l’indice è basso, più la casa è sicura. Sotto trovi i consigli. Poi prova la simulazione della notte.','[data-go=gioco]'];}
  if(t==='gioco'){if(S.simMode==='quart')return['Il tuo quartiere','Tocca “Simula la notte del quartiere” e guarda come reagisce la tua zona.','#qGo'];
    return['La simulazione','Tocca “Simula la notte dell’assedio” per vedere cosa succede alla tua casa. Poi prova i potenziamenti con “Applica”.','#siege'];}
  if(t==='mappa'){if(S.zv==='mondo')return['La mappa del paese','Scrivi il tuo indirizzo e tocca “Vai”. Poi tocca un bollino giallo per vedere offerte e contatti.','#mq'];
    return['La tua zona','In alto scegli: Sicurezza, Vivere qui, Vacanza o Mondo. “Mondo” mostra gli sponsor e i negozi.','[data-zv=mondo]'];}
  if(t==='orda'){if(typeof G==='undefined'||!G.type)return['Il gioco','Scegli il tipo di casa con cui giocare: tocca una delle case.','[data-type]'];
    if(G.view==='battle')return['La battaglia','Trascina una carta sulla strada dove arrivano gli zombie. Il tasto “Pausa” ferma tutto.','#hand'];
    return['La tua notte','Tocca il grande pulsante rosso “Difendi il quartiere”: la prima volta ti guida un tutorial.','#fight'];}
  return['Ricominciamo','Tocca “Casa” in basso a sinistra per tornare all’inizio.','[data-tab=home]'];}
function accShow(sel){document.querySelectorAll('.acc-hl').forEach(e=>e.classList.remove('acc-hl'));document.querySelectorAll('.acc-tip').forEach(e=>e.remove());
  const el=sel&&document.querySelector(sel);if(!el){toast('Scorri la pagina: il punto giusto è più in basso');return;}
  el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('acc-hl');
  setTimeout(()=>{const r=el.getBoundingClientRect();const tip=document.createElement('div');tip.className='acc-tip';tip.textContent='👆 Tocca qui';tip.style.left=Math.max(8,Math.min(innerWidth-130,r.left+r.width/2-60))+'px';tip.style.top=(r.bottom+8)+'px';document.body.appendChild(tip);},450);
  const off=()=>{el.classList.remove('acc-hl');document.querySelectorAll('.acc-tip').forEach(e=>e.remove());document.removeEventListener('pointerdown',off,true);};
  setTimeout(()=>document.addEventListener('pointerdown',off,true),500);setTimeout(off,9000);}
function accBar(){let b=document.getElementById('accBar');if(!S.acc.on){if(b)b.remove();return;}
  const [h,t,sel]=accNext();if(!b){b=document.createElement('div');b.id='accBar';document.body.appendChild(b);}
  b.innerHTML=`<div class="ab-t"><b>🙋 ${h}</b><span>${t}</span></div><div class="ab-b">${sel?'<button data-ab="show">Mostrami dove</button>':''}<button data-ab="guide">📖 Guida</button><button data-ab="x" aria-label="Chiudi">✕</button></div>`;
  b.querySelectorAll('[data-ab]').forEach(x=>x.onclick=e=>{e.stopPropagation();const a=x.dataset.ab;if(a==='show')accShow(sel);if(a==='guide')guideSheet(0);if(a==='x'){S.acc.on=false;accBar();toast('Accompagnatore spento: lo riaccendi con 🙋');}});}
function accPanel(){const [h,t,sel]=accNext();
  openSheet('🙋 Ti accompagno io',`<div class="accp"><div class="accnow"><small>Adesso</small><b>${h}</b><p>${t}</p>${sel?'<button class="btn wide" data-ap="show">👆 Mostrami dove toccare</button>':''}</div>
   <button class="btn wide alt" data-ap="guide" style="margin-bottom:8px">📖 Guida passo passo, con le scritte</button>
   <label class="qtog"><input type="checkbox" data-ap="on" ${S.acc.on?'checked':''}><span>Accompagnami passo passo in tutta l’app</span></label>
   <label class="qtog"><input type="checkbox" data-ap="big" ${S.acc.big?'checked':''}><span>Scritte più grandi</span></label>
   <div class="accq"><b>Fai una domanda</b><small>Scrivi come parleresti a una persona: “come prendo lo sconto?”, “cos’è lo scudo?”</small>
   <div class="row" style="gap:6px;margin-top:6px"><input class="field" id="accIn" placeholder="La tua domanda"><button class="btn small" data-ap="ask">Chiedi</button></div><div id="accOut"></div></div>
   <div class="accfaq">${['Come prendo lo sconto?','Cos’è lo Scudo?','Come si gioca?','I miei dati sono al sicuro?'].map(q=>`<button data-faq="${q}">${q}</button>`).join('')}</div></div>`,
  card=>{const ask=async q=>{const out=card.querySelector('#accOut');if(!q)return;out.innerHTML='<p class="muted">Ci penso…</p>';
      const loc=ACC_FAQ.find(([re])=>re.test(q));let ans=null;
      try{ans=await Promise.race([askAI('Sei l’accompagnatore dell’app ZombieSafeHouse. Rispondi in italiano semplicissimo, frasi brevi, massimo 4 frasi, indicando quale pulsante toccare. Sezioni: Casa, Valuta (indirizzo, 3 foto, domande, verdetto), Simula (La mia casa, Il mio quartiere), Gioco (quartiere, battaglia con carte, Arena, Amici), Mondo (mappa, sponsor con codice sconto e preventivo, Vivere qui, Vacanza). Lo Scudo della casa vera sale con valutazione, indice migliore, missioni reali e acquisti con codice.',[{role:'user',content:q}]),new Promise((_,r)=>setTimeout(()=>r(new Error('tempo')),9000))]);}catch(e){}
      out.innerHTML=`<div class="accans">${esc(ans||(loc?loc[1]:'Posso aiutarti su valutazione, simulazione, sponsor e gioco. Prova a chiedere: “come prendo lo sconto?”'))}</div>`;};
    card.querySelectorAll('[data-ap]').forEach(x=>{const a=x.dataset.ap;
      if(a==='show')x.onclick=()=>{closeSheet();setTimeout(()=>accShow(sel),250);};
      if(a==='guide')x.onclick=()=>guideSheet(0);
      if(a==='on')x.onchange=()=>{S.acc.on=x.checked;accBar();};
      if(a==='big')x.onchange=()=>{S.acc.big=x.checked;document.body.classList.toggle('bigtxt',x.checked);};
      if(a==='ask')x.onclick=()=>ask(card.querySelector('#accIn').value.trim());});
    card.querySelectorAll('[data-faq]').forEach(x=>x.onclick=()=>{card.querySelector('#accIn').value=x.dataset.faq;ask(x.dataset.faq);});});}
/* pulsante sempre visibile + proposta alla prima apertura */
(function(){const f=document.createElement('button');f.id='accFab';f.innerHTML='🙋<span>Aiuto</span>';f.setAttribute('aria-label','Aiuto: ti accompagno io');f.onclick=e=>{e.stopPropagation();vibe();accPanel();};document.body.appendChild(f);
  if(!S.acc.asked&&!window.__noHello){setTimeout(()=>{if(S.acc.asked)return;S.acc.asked=true;const d=document.createElement('div');d.id='accHello';d.innerHTML=`<b>Prima volta qui?</b><span>Ti accompagno io, passo passo.</span><div><button data-h="y">Sì, accompagnami</button><button data-h="n">No, grazie</button></div>`;document.body.appendChild(d);
    d.querySelectorAll('[data-h]').forEach(x=>x.onclick=()=>{if(x.dataset.h==='y'){S.acc.on=true;accBar();}d.remove();});},1800);}
  let tm=null;const ob=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(()=>{if(S.acc.on)accBar();const fb=document.getElementById('accFab');if(fb)fb.style.display=document.body.classList.contains('inbattle')?'none':'';},350);});
  ob.observe(document.getElementById('app'),{childList:true,subtree:false});})();

/* ---------- guida passo passo scritta ---------- */
const GUIDE=[
 ['🏠','Valuta la tua casa','Dalla pagina Casa tocca il pulsante rosso “Valuta la mia casa”. Ci vogliono circa 5 minuti.',()=>{go('valuta');},'#addr'],
 ['📍','Scrivi l’indirizzo','Scrivi l’indirizzo di casa tua, per esempio “Via Roma 10, Volta Mantovana”, poi tocca “Analizza la zona”. Vedrai la tua zona disegnata a fumetto.',()=>{go('valuta');},'#addr'],
 ['📷','Le tre foto','Tocca i tre riquadri e fotografa la porta d’ingresso, una finestra del piano terra e il cancello. Le foto servono solo all’analisi e non vengono salvate.',()=>{go('valuta');},'#next0'],
 ['✍️','Rispondi alle domande','Leggi una domanda alla volta e tocca la risposta giusta. Molte sono già compilate. In alto vedi a che capitolo sei.',()=>{go('valuta');},null],
 ['🩺','Leggi il verdetto','L’indice va da 0 a 10: più è basso, più la casa è sicura. Sotto trovi i punti deboli e i rimedi, con il negozio della zona che li vende.',()=>{go('valuta');},null],
 ['🌙','Simula la notte','Nella pagina Simula tocca “Simula la notte dell’assedio” per vedere la tua casa sotto attacco. Poi tocca “Il mio quartiere” per vedere tutta la zona.',()=>{go('gioco');},'#siege'],
 ['🎟️','Sconti e preventivi','In Mondo tocca un bollino giallo: è uno sponsor. “Ottieni lo sconto” ti dà un codice da mostrare in cassa. “Chiedi un preventivo” manda la richiesta al negozio.',()=>{S.zv='mondo';go('mappa');},'#mq'],
 ['🛡️','Lo Scudo della casa vera','Più fai per la casa vera, più lo Scudo sale (da 0 a 5): valutazione, indice migliore, missioni reali, acquisti con il codice. Nel gioco ti rende più forte.',()=>{S.zv='mondo';go('mappa');},'.myhood'],
 ['🧟','Il gioco','In Gioco scegli una casa e tocca “Difendi il quartiere”. La prima volta un tutorial ti spiega tutto. Le carte si trascinano sulla strada.',()=>{go('orda');},null],
 ['📅','Ogni giorno','Torna ogni giorno: c’è un premio, ci sono missioni, puoi sfidare gli altri in Arena e difendere quartieri con gli amici. Il pulsante 🙋 Aiuto è sempre qui.',()=>{go('home');},null]];
function guideSheet(i){i=Math.max(0,Math.min(GUIDE.length-1,i));const g=GUIDE[i];
  openSheet('📖 Guida passo passo',`<div class="gstep"><div class="gdots">${GUIDE.map((_,k)=>`<i class="${k===i?'on':k<i?'ok':''}"></i>`).join('')}</div>
   <div class="gcard"><span class="gic">${g[0]}</span><small>Passo ${i+1} di ${GUIDE.length}</small><b>${g[1]}</b><p>${g[2]}</p></div>
   <button class="btn wide" data-gs="go">👉 Portami lì</button>
   <div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost" data-gs="prev" ${i===0?'disabled':''} style="flex:1">‹ Indietro</button><button class="btn alt" data-gs="next" style="flex:1">${i<GUIDE.length-1?'Avanti ›':'Fine ✓'}</button></div></div>`,
  card=>card.querySelectorAll('[data-gs]').forEach(b=>b.onclick=()=>{const a=b.dataset.gs;vibe();
    if(a==='prev')guideSheet(i-1);else if(a==='next'){if(i<GUIDE.length-1)guideSheet(i+1);else{closeSheet();toast('Guida completata! Il pulsante 🙋 Aiuto è sempre qui');}}
    else{closeSheet();try{g[3]();}catch(e){}setTimeout(()=>{if(g[4])accShow(g[4]);},600);}}));}

/* segnale visivo quando si tocca la mappa: il riquadro dei dettagli lampeggia */
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-poi],[data-hex],[data-res]');if(!t)return;const w=t.closest('.mapwrap');if(!w)return;
  setTimeout(()=>{const i=w.querySelector('.mapinfo');if(!i)return;i.classList.remove('flash');void i.offsetWidth;i.classList.add('flash');vibe&&vibe();},40);},true);
</script>
