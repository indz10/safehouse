<script>
/* =========================================================
   CAMPAGNA "LE NOTTI DELL'ASSEDIO": progressione chiara del gioco
   capitoli da 5 notti, stelle per notte, boss, notti da rigiocare
   ========================================================= */
const CHAP=['Prime notti','L’orda cresce','Il Bruto della Sagra','Notti senza luce','La grande migrazione','Assedio totale'];
function campHTML(){const max=Math.max(G.level+4,10);G.stars=G.stars||{};const totS=Object.values(G.stars).reduce((a,b)=>a+b,0);
  const ch=Math.floor((G.level-1)/5);
  return`<div class="panel camp"><div class="row spread"><div><b class="disp" style="font-size:22px">🌙 Le notti dell’assedio</b><small class="muted" style="display:block">Capitolo ${ch+1} · ${CHAP[ch%CHAP.length]}</small></div><span class="tag sp">★ ${totS} / ${(G.level-1)*3}</span></div>
   <div class="seg" style="margin:8px 0 0"><button class="${G.style!=='classico'?'on':''}" data-style="tattico">♟️ Tattico</button><button class="${G.style==='classico'?'on':''}" data-style="classico">👆 Classico</button></div><small class="muted" style="display:block;margin-top:4px">${G.style==='classico'?'Si colpiscono gli zombie toccandoli.':'Si gioca con carte, provviste e bersagli: conta la strategia.'}</small>
   <div class="cpath">${Array.from({length:max},(_,i)=>{const n=i+1;const done=n<G.level,cur=n===G.level,boss=n%5===0;const st=G.stars[n]||0;
     return`${n%5===1?`<div class="cch">Cap. ${Math.floor(i/5)+1}<br><small>${CHAP[Math.floor(i/5)%CHAP.length]}</small></div>`:''}<button class="cn ${done?'done':''} ${cur?'cur':''} ${boss?'boss':''}" data-night="${n}" ${n>G.level?'disabled':''} aria-label="Notte ${n}"><b>${boss?'👑':n}</b><small>${done?'★'.repeat(st)+'☆'.repeat(3-st):cur?'ORA':'🔒'}</small></button>`;}).join('')}</div>
   <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn small" data-rules>📖 Come si gioca</button><button class="btn small ${G.quick!==false?'':'ghost'}" data-quick>⚡ Avvio rapido: ${G.quick!==false?'sì':'no'}</button></div>
   <p class="muted" style="font-size:12px;margin-top:6px">Tocca una notte già superata per rigiocarla e prendere tutte e 3 le stelle (+2 💎 per ogni stella nuova). Ogni 5 notti un boss e un nuovo capitolo.</p></div>`;}
function bindCamp(){app.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{G.quick=G.quick===false;vibe();renderHub();});app.querySelectorAll('[data-rules]').forEach(b=>b.onclick=()=>openRules());app.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{G.style=b.dataset.style==='classico'?'classico':'tattico';vibe();renderHub();});app.querySelectorAll('[data-night]').forEach(b=>b.onclick=()=>{const n=+b.dataset.night;if(n===G.level){const f=$('#fight');if(f)f.click();return;}
  openSheet(`🌙 Notte ${n}`,`<p style="font-weight:400;margin-bottom:10px">Rigioca la notte ${n} per migliorare le stelle: ora ne hai ${G.stars[n]||0} su 3. Non perdi livelli se va male.</p><button class="btn wide" data-replay>Rigioca la notte ${n}</button>`,
    card=>card.querySelector('[data-replay]').onclick=()=>{closeSheet();G.replay=n;G.view='battle';renderOrda();});});}
</script>
