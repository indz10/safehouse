<script>
/* =========================================================
   ALLEATI: REGALI E PRESTITI + PREMI E FORTUNA IN PRIMO PIANO
   - alleati = chi vi siete aiutati negli ultimi 30 giorni, inviti
   - Mattoni: regalo o prestito (torna da solo dopo 3 giorni)
   - monete e materiali: regalo (casella da ritirare); le gemme non si regalano
   - ruota, gratta e vinci, premio del giorno, barattolo: in alto
   ========================================================= */
window.AY={list:[],loans:[],t:0};
const GK={mattoni:['🧱','Mattoni'],monete:['🪙','Monete'],cibo:['🥫','Cibo'],legno:['🪵','Legno'],metallo:['🔩','Metallo'],batterie:['🔋','Batterie'],medicine:['💊','Medicine']};
async function ayLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return;if(!force&&Date.now()-AY.t<60000)return;AY.t=Date.now();
  try{const a=await SB.rpc('world_allies');if(!a.error)AY.list=a.data||[];const l=await SB.rpc('world_loans');if(!l.error)AY.loans=l.data||[];}catch(e){}ayRefresh();}
/* regali ricevuti: monete, gemme, materiali entrano nella partita */
function ayHTML(){if(!S.user)return'';const L=AY.list,LO=AY.loans;
  return`<div class="ayb"><h4 class="ah">🤝 I tuoi alleati (${L.length})</h4>
   ${L.length?L.map(a=>`<div class="arow"><div><b>@${esc(a.nick)}</b><small>livello ${a.wlevel}${a.dist_km!=null?' · '+wNum(a.dist_km)+' km':''}</small></div><button class="btn small" data-agive="${a.user_id}" data-anick="${esc(a.nick)}">🎁 Regala / Presta</button></div>`).join(''):'<p class="muted" style="font-size:12.5px">Diventate alleati aiutandovi in un’orda o invitandovi: poi potete regalarvi e prestarvi Mattoni, e regalarvi monete e materiali (le gemme no).</p>'}
   ${LO.length?`<h4 class="ah">📒 Prestiti in corso</h4>${LO.map(l=>`<div class="arow"><div><b>${l.dir==='dato'?'Hai prestato':'Devi restituire'} 🧱 ${l.left_due}</b><small>${l.dir==='dato'?'a':'a'} @${esc(l.nick)} · ${new Date(l.due_at)>new Date()?'torna il '+new Date(l.due_at).toLocaleDateString('it-IT',{day:'numeric',month:'short'}):'in restituzione'}</small></div></div>`).join('')}`:''}</div>`;}
function ayRefreshBase(){try{const p=app.querySelector('.apan');if(!p)return;const old=p.querySelector('.ayb');const n=document.createElement('div');n.innerHTML=ayHTML();const nb=n.firstElementChild;if(!nb)return;if(old)old.replaceWith(nb);else{const iv=p.querySelector('[data-ainv]');if(iv)iv.insertAdjacentElement('beforebegin',nb);else p.appendChild(nb);}ayBind();}catch(e){}}
function ayBind(){app.querySelectorAll('[data-agive]').forEach(b=>b.onclick=()=>aySheet(b.dataset.agive,b.dataset.anick));}
/* il pannello alleati mostra anche gli alleati, regali e prestiti */
/* aiutare un alleato regala anche un biglietto del gratta e vinci */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-asend]');if(!b||typeof G==='undefined')return;setTimeout(()=>{G.scratch=(G.scratch||0)+1;try{saveLocal();}catch(x){}},800);},true);
/* ---- PREMI E FORTUNA, in alto nel gioco ---- */
function luckTiles(){const ds=(typeof dailyState==='function')?dailyState():null;const tot=(typeof jarTotal==='function')?jarTotal():0;const goal=(G.jar&&G.jar.goal)||60;
  return[['daily','📅','Premio del giorno',ds?(ds.claimed?'riscosso · torna domani':'giorno '+ds.next+' di 7: riscuoti!'):'',!!(ds&&!ds.claimed)],
    ['wheel','🎡','Ruota',`${G.spins||0} ${G.spins===1?'giro':'giri'}`,G.spins>0],['scratch','🎟️','Gratta e vinci',`${G.scratch||0} ${G.scratch===1?'biglietto':'biglietti'}`,G.scratch>0],
    ['jar','🫙','Barattolo',`${Math.min(tot,goal)}/${goal}`,tot>=goal]];}
function luckReady(){try{luckInit();}catch(e){}return luckTiles().filter(t=>t[4]).length;}
/* Fase 14: un solo riquadro "🎁 Premi di oggi" (premio del giorno, ruota, gratta e vinci, barattolo) → premiSheet */
function luckTopHTML(){const n=luckReady();
  return`<div class="panel lpan"><button class="lone ${n?'hot':''}" data-lt="all"><span>🎁</span><div><b>Premi di oggi</b><small>${n?n+(n===1?' premio pronto da aprire':' premi pronti da aprire'):'Premio del giorno, ruota, gratta e vinci, barattolo'}</small></div><i>${n?n:'›'}</i></button></div>`;}
function premiSheet(){try{luckInit();}catch(e){}const T=luckTiles();
  openSheet('🎁 Premi di oggi',`<div class="lgrid">${T.map(([k,ic,t,sub,hot])=>`<button data-lt="${k}" class="${hot?'hot':''}"><span>${ic}</span><b>${t}</b><small>${sub}</small></button>`).join('')}</div>
   <p class="muted" style="font-size:12px;margin:8px 0 0">Giri e biglietti si guadagnano riscattando l’orda, completando le missioni e aiutando gli alleati.</p>`,c=>{
   c.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{const k=b.dataset.lt;window.SHEET_BACK={t:'‹ Premi di oggi',fn:premiSheet};
     if(k==='daily')return dailySheet();if(k==='jar')return jarSheet();
     if(k==='wheel'){if(G.spins>0)wheelSheet();else{window.SHEET_BACK=null;toast('Niente giri: riscatta l’orda o completa le missioni');}return;}
     if(k==='scratch'){if(G.scratch>0)scratchSheet();else{window.SHEET_BACK=null;toast('Niente biglietti: aiuta un alleato o completa le missioni');}}});});}
/* manuale */
</script>
