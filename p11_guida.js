<script>
/* =========================================================
   GUIDA E ORIENTAMENTO (non cambia le funzioni, le rende chiare)
   - home: "Cosa vuoi fare?" con tutte le funzioni
   - guida rapida a schede (prima apertura + su richiesta)
   - "?" accanto ai titoli delle sezioni
   - Orda: "Prossima mossa" e indice per saltare alle sezioni
   - barra in alto: nome della sezione in cui sei
   ========================================================= */
const HELP={
 'Il quartiere':['La mappa del tuo quartiere','I cerchi bianchi sono punti da fortificare (lampioni, acquedotto…). Gli edifici con la € gialla si possono comprare. Quelli col bordo giallo sono tuoi: toccali per gestirli.'],
 'Le tue proprietà':['Le tue proprietà','Tocca una proprietà per scegliere chi ci abita (un amico vero o un inquilino del gioco), addestrarlo e fortificarla. Più sono preparate, più resistono all’orda quando difendi altrove.'],
 'Fortuna':['Fortuna','Ruota e gratta e vinci si sbloccano solo giocando, mai a pagamento. Il barattolo si riempie con le ondate di tutto il gruppo: se giocate tutti, il premio è doppio.'],
 'Amici e quartiere':['Amici e quartiere','Scegli il tuo ruolo, ospita amici nelle tue case, presta la tua famiglia a chi è in difficoltà e rispondi alle richieste d’aiuto.'],
 'Attrezzi anti-zombie':['Attrezzi','Gli attrezzi sono i pulsanti che usi in battaglia (petardo, sirena…). Si sbloccano e migliorano con le monete; ognuno ha un tempo di ricarica.'],
 'La tua casa':['La tua casa','Porta, grate, recinzione, luci, energia e vedetta: ogni livello rende la casa più resistente nelle ondate.'],
 'Bottega':['Bottega','Pacchetti di monete e gemme. Nell’anteprima gli acquisti sono simulati.'],
 'Arena':['Arena','Sfida 1 contro 1: scegli una tua casa, scegli l’avversario e difenditi dalla stessa orda. Vince chi resiste più ondate. La Coppa del Quartiere è il torneo della settimana.'],
 'Le tue case da battaglia':['Case da battaglia','Ogni proprietà può combattere in Arena. Con 🛠️ Personalizza cambi porta, finestre, tetto, giardino e recinzione: cambiano aspetto e difesa.'],
 'Scegli dove vivere':['Scegli dove vivere','Il tipo di casa cambia il gioco: resistenza, spazio per le difese, aiuto dei vicini e forza delle orde. Se hai valutato la tua casa vera, parti avvantaggiato.'],
 'Negozi e attività':['Negozi e attività','Le attività della zona con il voto dei clienti. Tocca “Recensioni” per leggerle o scriverne una.'],
 'Case in zona':['Case in zona','Annunci delle agenzie partner. Quelli a pagamento sono sempre segnati come sponsorizzati.']
};
const SEC_NAME={home:'Home',valuta:'Valuta la casa',gioco:'Simulazione',orda:'Orda',mappa:'Zone',radio:'Radio',contatti:'Chi siamo',sponsor:'Sponsor'};
const TOUR=[
 ['📷','Valuta la tua casa vera','Zona, tre foto e qualche domanda: in 5 minuti sai quanto resiste e cosa migliorare. Le foto restano sul telefono.','valuta'],
 ['🌙','Simula la notte','Applica i potenziamenti e guarda le 9 tavole dell’assedio: cosa tiene, cosa cede e come finisce.','gioco'],
 ['🧟','Orda: difendi il quartiere','Compra edifici, mettici amici o inquilini, fortifica tutto. L’orda arriva ovunque: il radar ti dice dove correre.','orda'],
 ['⚔️','Arena e Coppa','Personalizza le tue case e sfida altri giocatori: 1 contro 1 ogni giorno, Coppa del Quartiere ogni settimana.','arena'],
 ['🏘️','Zone e Vivere qui','Servizi, negozi, prezzi, annunci e recensioni di ogni zona. Anche per le vacanze.','mappa']
];
function goTile(k){if(k==='arena'){G.sub='arena';go('orda');return;}if(k==='orda'){G.sub='q';go('orda');return;}
  if(k==='vivere'){S.zv='vivere';S.rvMode='vivere';go('mappa');return;}if(k==='vacanza'){S.zv='vivere';S.rvMode='vacanza';go('mappa');return;}
  if(k==='tour'){tourGuide(0);return;}go(k);}
function tourGuide(i){const t=TOUR[i];
  openSheet(`Guida rapida · ${i+1} di ${TOUR.length}`,`<div class="tg"><div class="tg-ic">${t[0]}</div><b class="disp" style="font-size:28px">${t[1]}</b><p>${t[2]}</p>
    <div class="tg-dots">${TOUR.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div>
    <div class="row" style="gap:8px;justify-content:center"><button class="btn small ghost" data-tg="prev" ${i?'':'disabled'}>Indietro</button><button class="btn small" data-tg="try">Provalo ora</button><button class="btn small alt" data-tg="next">${i<TOUR.length-1?'Avanti':'Fine'}</button></div></div>`,
  card=>{card.querySelector('[data-tg=prev]').onclick=()=>tourGuide(i-1);card.querySelector('[data-tg=next]').onclick=()=>{if(i<TOUR.length-1)tourGuide(i+1);else closeSheet();};
    card.querySelector('[data-tg=try]').onclick=()=>{closeSheet();goTile(t[3]);};});
  try{window.storage&&window.storage.set('zsh:tour','1');}catch(e){}}
function homeTiles(){return`<h2 style="margin:6px 0 8px">Cosa vuoi fare?</h2><div class="tiles">${[
  ['valuta','📷','Valuta la casa','5 minuti, casa vera'],['gioco','🌙','Simula la notte','9 tavole dell’assedio'],['orda','🧟','Orda','Difendi il quartiere'],['arena','⚔️','Arena','Sfide e Coppa'],
  ['vivere','🏘️','Vivere qui','Servizi, prezzi, annunci'],['vacanza','🧳','Vacanza','Dove dormire, recensioni'],['radio','📻','Radio','Chiedi all’operatore'],['sponsor','🤝','Sponsor','Chi ci sostiene']
 ].map(([k,ic,t,s])=>`<button class="tile" data-tile="${k}"><span>${ic}</span><b>${t}</b><small>${s}</small></button>`).join('')}</div>
 <button class="btn ghost small" data-tile="tour" style="margin:8px 0 16px">❓ Guida rapida in 5 schede</button>`;}
function nextMoves(){const out=[];
  if(document.getElementById('dClaim'))out.push(['🎁','Riscuoti il premio di oggi',()=>{const b=$('#dClaim');b.scrollIntoView({block:'center'});b.click();}]);
  const empty=Object.entries(G.lots||{}).find(([,b])=>b.kind==='house'&&!b.ten);if(empty)out.push(['🚪','Hai una casa vuota: scegli chi ci abita',()=>lotSheet(empty[0])]);
  if(G.tour&&G.tour.phase!=='fine')out.push(['🏆','Coppa del Quartiere: tocca a te',()=>{G.sub='arena';renderHub();window.scrollTo(0,0);}]);
  out.push(['🧟',`Difendi il quartiere: ondata ${G.level}`,()=>{const f=$('#fight');if(f)f.click();}]);
  return out.slice(0,2);}
const JUMPS=[['Difendi','#fight'],['Premi','#dClaim,.daily'],['Mappa','Il quartiere'],['Proprietà','Le tue proprietà'],['Arena','Arena'],['Fortuna','Fortuna'],['Amici','Amici e quartiere'],['Attrezzi','Attrezzi anti-zombie'],['Casa','La tua casa'],['Bottega','Bottega']];
function findHead(txt){return [...app.querySelectorAll('h2,h3')].find(h=>h.textContent.trim().startsWith(txt));}
function decorate(){
  /* titolo della sezione nella barra in alto */
  const lg=document.querySelector('.tb-logo');if(lg){let s=lg.querySelector('#tbSec');if(!s){s=document.createElement('small');s.id='tbSec';lg.appendChild(s);}s.textContent=SEC_NAME[S.tab]||'';}
  /* home */
  if(S.tab==='home'&&!app.querySelector('.tiles')){const pg=app.querySelector('.page.dots');if(pg){pg.insertAdjacentHTML('afterbegin',homeTiles());pg.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{vibe();goTile(b.dataset.tile);});}}
  /* aiuto "?" sui titoli */
  app.querySelectorAll('h2,h3').forEach(h=>{if(h.dataset.help)return;const t=h.textContent.trim();const k=Object.keys(HELP).find(x=>t.startsWith(x));if(!k)return;h.dataset.help=1;
    const b=document.createElement('button');b.className='qhelp';b.type='button';b.textContent='?';b.setAttribute('aria-label','Cos’è: '+HELP[k][0]);b.onclick=e=>{e.stopPropagation();openSheet(HELP[k][0],`<p style="font-weight:400;font-size:15px;line-height:1.5">${HELP[k][1]}</p>`);};h.appendChild(b);});
  /* Orda: prossima mossa + indice */
  if(S.tab==='orda'&&typeof G!=='undefined'&&G.type&&G.view==='hub'&&G.sub!=='arena'&&!app.querySelector('.nextmv')){const seg=app.querySelector('.oseg');if(seg){
    const mv=nextMoves();seg.insertAdjacentHTML('afterend',`<div class="nextmv"><b>Prossima mossa</b>${mv.map((m,i)=>`<button class="nm" data-nm="${i}"><span>${m[0]}</span>${m[1]}<i>›</i></button>`).join('')}</div>
      <div class="jumps" role="navigation" aria-label="Vai alla sezione">${JUMPS.map(([l,t],i)=>`<button data-jump="${i}">${l}</button>`).join('')}</div>`);
    app.querySelectorAll('[data-nm]').forEach(b=>b.onclick=()=>mv[+b.dataset.nm][2]());
    app.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const t=JUMPS[+b.dataset.jump][1];let el=t.startsWith('#')?app.querySelector(t):findHead(t);if(!el){toast('Sezione non disponibile qui');return;}
      el.scrollIntoView({block:'start'});window.scrollBy(0,-70);});}}
}
new MutationObserver(()=>decorate()).observe(document.getElementById('app'),{childList:true});
setTimeout(async()=>{decorate();try{let seen=null;if(window.storage){try{seen=await window.storage.get('zsh:tour');}catch(e){seen=null;}}if(!seen&&S.tab==='home')tourGuide(0);}catch(e){}},600);
</script>
