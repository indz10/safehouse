<script>
/* =========================================================
   ORDA → OGGI: ogni pulsante fa qualcosa, ogni cosa in un posto solo
   - Premio del giorno e Barattolo aprono la loro finestra (come Ruota e Gratta)
   - "Vai" delle missioni porta davvero dove si fa la missione
   - via la fisarmonica vecchia "Premi e missioni di oggi" e la "Fortuna" doppia;
     le missioni delle notti (Scaccia zombie, Vinci ondate…) vanno in ⚔️ Difendi tu
   ========================================================= */
/* ---- dove sta ogni riquadro ---- */
try{const _ssOfOf=ssOf;ssOf=function(el){try{
  if(el&&el.matches){
    if(el.matches('details.fold')&&el.querySelector('.daily'))return'difendi';               /* missioni delle notti */
    if(el.matches('h3')&&/Fortuna/.test(el.textContent))return'x';                           /* fortuna doppia */
    if(el.matches('.luck'))return'x';
    if(el.matches('p.muted')&&/Giri e biglietti si guadagnano solo giocando/.test(el.textContent))return'x';
    if(el.matches('.panel')&&(el.querySelector('#jarDraw,#jarPoke,.jarbar')))return'x';
  }}catch(e){}return _ssOfOf(el);};}catch(e){}
/* la fisarmonica vecchia diventa "Missioni delle notti": tengo solo le missioni */
/* ---- Premio del giorno in una finestra ---- */
function dailySheet(){const tmp=document.createElement('div');tmp.innerHTML=dailyHTML();const dl=tmp.querySelector('.daily');if(!dl)return;const ms=dl.querySelector('.missions');if(ms)ms.remove();
  const b=dl.querySelector('#dClaim');if(b){b.id='dClaimS';}
  openSheet('🎁 Premio del giorno',dl.innerHTML,card=>{const x=card.querySelector('#dClaimS');if(x)x.onclick=()=>{const s=dailyState();if(s.claimed)return;DAILY[s.next-1].f(G);G.streak={day:s.next,last:s.today};
    const fr=(G.friends||[]).filter(f=>f.on).length;if(fr+1>=3)G.gems+=5;try{sfx('win');}catch(e){}try{saveLocal();}catch(e){}toast(`Giorno ${s.next}: ${DAILY[s.next-1].t}${fr+1>=3?' + 5 💎 bonus di gruppo':''}`);closeSheet();if(S.tab==='orda')renderHub();};});}
/* ---- Barattolo in una finestra ---- */
function jarSheet(){const tmp=document.createElement('div');tmp.innerHTML=luckHTML();const p=[...tmp.querySelectorAll('.panel')].find(x=>x.querySelector('.jarbar'));if(!p)return;
  openSheet('🫙 Barattolo del quartiere',p.innerHTML,card=>{const d=card.querySelector('#jarDraw');if(d)d.onclick=()=>{const all=(G.friends||[]).every(f=>G.jar.fr[f.id]);const m=all?2:1;giveMattoni(20*m,'Barattolo');G.gems+=10*m;try{sfx('win');}catch(e){}
      toast(`Estrazione del quartiere: +${20*m} 🧱 e +${10*m} 💎 a te e a ogni amico${all?' (doppio: avete giocato tutti!)':''}`);G.jar={goal:Math.round(G.jar.goal*1.25),mine:0,fr:{},round:G.jar.round+1};try{saveLocal();}catch(e){}closeSheet();if(S.tab==='orda')renderHub();};
    const k=card.querySelector('#jarPoke');if(k)k.onclick=()=>{const ab=(G.friends||[]).filter(f=>!G.jar.fr[f.id]);toast(`Promemoria inviato a ${ab.map(f=>'@'+f.nick).join(', ')}: “Manca solo il tuo biglietto!”`);try{vibe();}catch(e){}};});}
/* le 4 caselle: tutte aprono qualcosa */
luckTopBind=function(){const p=app.querySelector('.lpan');if(!p)return;p.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{const k=b.dataset.lt;
  if(k==='daily')return dailySheet();if(k==='jar')return jarSheet();
  if(k==='wheel'){if(G.spins>0)wheelSheet();else toast('Niente giri: riscatta l’orda o vinci una notte');return;}
  if(k==='scratch'){if(G.scratch>0)scratchSheet();else toast('Niente biglietti: aiuta un alleato o vinci una notte');return;}});};
/* ---- "Vai" delle missioni: se il posto è in Difendi tu, ci porto lì ---- */
const _tmBindOf=tmBind;tmBind=function(){_tmBindOf();try{const p=app.querySelector('.tmp');if(!p||!G.tm)return;p.querySelectorAll('[data-tmg]').forEach(b=>{const orig=b.onclick;b.onclick=()=>{const m=G.tm.list[+b.dataset.tmg];if(!m)return;
  if(['day','fight','map'].includes(m.go)){G.ss='difendi';if(m.go==='map')G.sel=m.id;renderHub();setTimeout(()=>{let t=null;
      if(m.go==='day'){t=app.querySelector('.dayp');const f=t&&t.closest('details');if(f)f.open=true;}else if(m.go==='fight')t=app.querySelector('#fight');else t=app.querySelector('#slotinfo')||app.querySelector('#fight');
      if(t)t.scrollIntoView({behavior:'smooth',block:'center'});toast(m.go==='fight'?'⚔️ Gioca una notte qui: la missione avanza da sola':m.go==='map'?'📍 Ecco il posto della missione':'☀️ Prepara la notte');},200);return;}
  if(orig)orig();};});}catch(e){}};
</script>
