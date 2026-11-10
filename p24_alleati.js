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
const _wMineAY=wMine;wMine=async function(silent){await _wMineAY(silent);ayInbox();};
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
function luckTopHTML(){try{luckInit();}catch(e){}const ds=(typeof dailyState==='function')?dailyState():null;const tot=(typeof jarTotal==='function')?jarTotal():0;const goal=(G.jar&&G.jar.goal)||60;
  return`<div class="panel lpan"><b class="disp" style="font-size:22px">🎁 Premi e fortuna</b>
   <div class="lgrid">
    <button data-lt="daily" class="${ds&&!ds.claimed?'hot':''}"><span>📅</span><b>Premio del giorno</b><small>${ds?(ds.claimed?'riscosso · torna domani':'giorno '+ds.next+' di 7: riscuoti!'):''}</small></button>
    <button data-lt="wheel" class="${G.spins>0?'hot':''}"><span>🎡</span><b>Ruota</b><small>${G.spins||0} ${G.spins===1?'giro':'giri'}</small></button>
    <button data-lt="scratch" class="${G.scratch>0?'hot':''}"><span>🎟️</span><b>Gratta e vinci</b><small>${G.scratch||0} ${G.scratch===1?'biglietto':'biglietti'}</small></button>
    <button data-lt="jar"><span>🫙</span><b>Barattolo</b><small>${Math.min(tot,goal)}/${goal}</small></button></div>
   <p class="muted" style="font-size:12px;margin:8px 0 0">Giri e biglietti si guadagnano riscattando l’orda, vincendo notti e aiutando gli alleati.</p></div>`;}
/* manuale */
const _manualAY=manualHTML;manualHTML=function(){return _manualAY().replace('<details class="man"',`<details class="man"><summary>🎁 Regali, prestiti e fortuna</summary><div class="man-b"><p><b>Alleati</b> sono i giocatori con cui vi siete aiutati negli ultimi 30 giorni e chi hai invitato (o chi ti ha invitato). Agli alleati puoi <b>prestare Mattoni</b> (tornano da soli dopo 3 giorni) o <b>regalare</b> Mattoni, monete, gemme e materiali. Limiti al giorno: 300 Mattoni, 1.000 monete, 20 gemme, 10 per materiale; gli account nuovi possono regalare dopo 3 giorni.</p><p><b>Ruota, gratta e vinci, premio del giorno e barattolo</b> sono in alto nel gioco: giri e biglietti si guadagnano riscattando l’orda, vincendo notti e aiutando gli alleati.</p></div></details><details class="man"`);};
</script>
