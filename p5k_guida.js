<script>
/* =========================================================
   ISTRUZIONI DEL GIOCO: "Come si gioca" + tutorial guidato
   ========================================================= */
const RULES_CARDS=[['🪤','Trappole','3','su corsia','Ferma e ferisce i primi 3 zombie che arrivano su quella corsia'],['🎯','Torretta','5','su corsia','Spara da sola per 20 secondi sulla corsia scelta'],['🧑‍🚒','Rinforzo','4','su corsia','Un difensore in più per 16 secondi'],['🔨','Ripara','3','subito','+35% barricata e un po’ di casa'],['💥','Petardo','3','subito','Esplosione sulla corsia più affollata; unico che colpisce gli scavatori'],['📢','Sirena','4','subito','Rallenta tutta l’orda'],['🚿','Idrante','4','subito','Respinge indietro una corsia'],['🔆','Faro','5','subito','Acceca e ferma tutti per qualche secondo'],['🕸️','Rete','3','subito','Blocca gli zombie in testa'],['🌫️','Fumogeno','3','subito','Confonde: gli zombie si fermano'],['🎵','Stereo','6','subito','Attira l’orda lontano dalla casa']];
const RULES_Z=[['🧟','Vagante','lento, il più comune'],['🏃','Corridore','veloce: fermalo con trappole'],['💪','Bruto','tanta vita: segnalo come bersaglio'],['⛑️','Col casco','dimezza i danni'],['📣','Strillone','fa infuriare chi gli sta vicino'],['⛏️','Scavatore','sotto terra: solo il petardo lo colpisce'],['✨','D’oro','scappa: se lo prendi, 3 gemme'],['👑','Boss','ogni 5 notti, chiama rinforzi']];
function rulesHTML(){return`<div class="rules">
  <div class="rb"><b>🎯 Obiettivo</b><p>Resisti finché l’orda della notte è finita. Se cade <b>casa tua</b> la notte è persa. Gli altri edifici persi escono dal quartiere e fanno scendere di livello.</p></div>
  <div class="rb"><b>🛡️ 1 · Prima dell’ondata: il piano</b><p>Guarda la <b>ricognizione</b> (quanti zombie, quali, verso quali edifici) e distribuisci i <b>punti difesa</b>: 🪵 barricata +40%, 🪤 trappole, 🎯 torretta. Di fretta? “Piano automatico”.</p></div>
  <div class="rb"><b>🃏 2 · Durante: provviste e carte</b><p>Le <b>provviste</b> (barra gialla in basso a sinistra del campo) si ricaricano da sole. Ogni carta costa provviste (numero giallo). Le carte “su corsia”: <b>trascinale</b> sulla corsia, oppure tocca la carta e poi la corsia. Hai 4 carte; quando ne usi una entra la successiva.</p>
   <div class="rtab">${RULES_CARDS.map(c=>`<div><span>${c[0]}</span><b>${c[1]}</b><i>${c[2]}</i><small>${c[3]} · ${c[4]}</small></div>`).join('')}</div></div>
  <div class="rb"><b>🎯 3 · Il bersaglio</b><p>Tocca uno zombie: diventa il <b>bersaglio</b> (mirino azzurro). Difensori, torrette e rinforzi sparano prima a lui e gli fanno <b>+35% di danni</b>. Usalo su bruti, caschi e boss.</p></div>
  <div class="rb"><b>🔥 Combo e rifornimenti</b><p>Ogni zombie scacciato ridà un po’ di provviste. Scacciane 3, 5, 8 di fila (entro 2 secondi l’uno dall’altro): <b>combo</b> con provviste extra. A <b>metà notte</b> arrivano i rifornimenti: scegli 1 tra 3 bonus (torretta fissa, carte scontate, campo minato…). Le <b>frecce rosse</b> sul bordo destro indicano gli zombie in arrivo per corsia.</p></div>
  <div class="rb"><b>⭐ 4 · L’abilità della casa</b><p>Il pulsante arancione: un colpo speciale con ricarica, diverso per ogni tipo di edificio (cane, trattore, faro, valanga…).</p></div>
  <div class="rb"><b>🗺️ 5 · Più edifici, più strategia</b><p>Nella <b>mappa dell’assedio</b> tocca un edificio per correre a difenderlo; “Vai dove serve” ti porta dove c’è più pericolo. L’orda punta agli edifici più deboli: chi ha difensori e barricate resiste da solo.</p></div>
  <div class="rb"><b>🧟 I nemici</b><div class="rtab z">${RULES_Z.map(z=>`<div><span>${z[0]}</span><b>${z[1]}</b><small>${z[2]}</small></div>`).join('')}</div></div>
  <div class="rb"><b>✨ Premi</b><p>Fino a 3 <b>stelle</b> per notte (casa poco danneggiata, nessun edificio perso). In alto c’è l’<b>obiettivo bonus</b> dell’ondata. Raccogli il <b>bottino</b> (monete, gemme, cuori) toccandolo prima che sparisca.</p></div>
  <div class="rb"><b>👆 Stile Classico</b><p>Se lo scegli nella campagna: tocchi gli zombie per colpirli (testa = critico), trascini il dito per colpirne tanti; il tocco consuma energia.</p></div>
  <button class="btn small ghost" data-tutagain style="margin-top:8px">Rifai il tutorial alla prossima battaglia</button></div>`;}
function openRules(){openSheet('📖 Come si gioca',rulesHTML(),card=>{const b=card.querySelector('[data-tutagain]');if(b)b.onclick=()=>{G.tutDone=false;toast('Il tutorial ripartirà alla prossima battaglia');closeSheet();};});}
const COACH=[[null,'Benvenuta nell’assedio!','Gli zombie arrivano da destra su 3 corsie. Prima abbattono la barricata, poi attaccano la casa. Il gioco è in pausa: leggi con calma.'],
 ['#cv','Le provviste','La barra gialla in basso a sinistra del campo. Si ricaricano da sole e servono per giocare le carte. Per la prova te le abbiamo riempite.'],
 ['#hand','Le carte','Il numero giallo è il costo. Le carte “su corsia”: trascinale sulla corsia (o toccale e poi tocca la corsia). Le altre agiscono subito. Prova a mettere le trappole!'],
 ['#cv','Bersaglio e combo','Tocca uno zombie: diventa il bersaglio e prende più danni. Scacciane tanti di fila per una combo che ridà provviste. A metà notte sceglierai un rifornimento.'],
 ['#hab','L’abilità della casa','Il pulsante arancione: un colpo speciale con ricarica, diverso per ogni edificio.'],
 ['.radar','La mappa dell’assedio','Se hai più edifici, toccali qui per correre a difenderli. “Vai dove serve” ti porta dove c’è più pericolo.'],
 [null,'Pronta!','In alto trovi l’obiettivo bonus. Le regole complete sono sempre nel pulsante ❓. Buona difesa!']];
function coach(st,i=0){document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));let o=document.getElementById('coach');if(!o){o=document.createElement('div');o.id='coach';document.body.appendChild(o);}
  if(i>=COACH.length){o.remove();st.pause=false;G.tutDone=true;return;}
  const [sel,t,x]=COACH[i];const el=sel&&document.querySelector(sel);o.classList.toggle('dim',!el);if(el){el.classList.add('coach-hl');el.scrollIntoView({block:'center',behavior:'smooth'});}
  o.innerHTML=`<div class="cbox"><small>Tutorial ${i+1} di ${COACH.length}</small><b>${t}</b><p>${x}</p><div class="row" style="gap:8px;justify-content:flex-end"><button class="btn small ghost" data-cskip>Salta</button><button class="btn small" data-cnext>${i<COACH.length-1?'Avanti':'Gioca!'}</button></div></div>`;
  o.querySelector('[data-cnext]').onclick=()=>coach(st,i+1);o.querySelector('[data-cskip]').onclick=()=>coach(st,COACH.length);}
</script>

<script>
/* scrigno di fine notte: 3 scrigni chiusi, ne apri uno, vedi cosa c'era negli altri */
function chestPrize(L){const r=Math.random();const notOwned=TOOLS.filter(t=>!G.tools[t.id]);
  if(r<.22&&notOwned.length){const t=notOwned[Math.floor(Math.random()*notOwned.length)];return{ic:t.ic||'🃏',t:'Nuova carta: '+(t.n||t.name||t.id),f:()=>{G.tools[t.id]=1;}};}
  if(r<.45){const g=3+Math.floor(Math.random()*6)+Math.floor(L/5);return{ic:'💎',t:`${g} gemme`,f:()=>{G.gems+=g;}};}
  if(r<.6)return{ic:'🎡',t:'Un giro di ruota',f:()=>{G.spins=(G.spins||0)+1;}};
  const c=40+Math.floor(Math.random()*60)+L*6;return{ic:'🪙',t:`${c} monete`,f:()=>{G.coins+=c;}};}
function showChest(L){const P=[chestPrize(L),chestPrize(L),chestPrize(L)];const o=document.createElement('div');o.id='chest';
  o.innerHTML=`<div class="bbox"><b class="disp">Bottino della notte</b><small>Scegli uno scrigno</small><div class="chests">${P.map((p,i)=>`<button data-ch="${i}"><span class="cl">🧰</span><span class="op">${p.ic}<small>${p.t}</small></span></button>`).join('')}</div><button class="btn wide" data-chok hidden>Prendi e continua</button></div>`;
  document.body.appendChild(o);sfx('horn');
  o.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{if(o.dataset.done)return;o.dataset.done=1;const i=+b.dataset.ch;P[i].f();b.classList.add('mine');o.querySelectorAll('[data-ch]').forEach(x=>x.classList.add('open'));sfx('coin');vibe();
    o.querySelector('[data-chok]').hidden=false;const bc=document.getElementById('bc'),bg=document.getElementById('bg');if(bc)bc.textContent=G.coins;if(bg)bg.textContent=G.gems;});
  o.querySelector('[data-chok]').onclick=()=>o.remove();}
</script>
