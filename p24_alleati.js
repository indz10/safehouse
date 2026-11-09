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
async function ayInbox(){if(!S.user||typeof SB==='undefined'||!SB||typeof G==='undefined'||!G.type)return;try{const{data,error}=await SB.rpc('world_gifts_in');if(error||!data||!data.length)return;
  const got=[];for(const g of data){const r=await SB.rpc('world_gift_claim',{p_id:g.id});if(r.data&&r.data.ok){const k=g.kind;
    if(k==='monete')G.coins+=g.amount;else if(k==='gemme')G.gems+=g.amount;else{G.mat=G.mat||{};G.mat[k]=(G.mat[k]||0)+g.amount;}got.push(`${GK[k][0]} ${g.amount} da @${g.nick}`);}}
  if(got.length){try{saveLocal();sfx('coin');}catch(e){}toast('🎁 Regali ricevuti: '+got.join(' · '));}}catch(e){}}
const _wMineAY=wMine;wMine=async function(silent){await _wMineAY(silent);ayInbox();};
function ayHTML(){if(!S.user)return'';const L=AY.list,LO=AY.loans;
  return`<div class="ayb"><h4 class="ah">🤝 I tuoi alleati (${L.length})</h4>
   ${L.length?L.map(a=>`<div class="arow"><div><b>@${esc(a.nick)}</b><small>livello ${a.wlevel}${a.dist_km!=null?' · '+wNum(a.dist_km)+' km':''}</small></div><button class="btn small" data-agive="${a.user_id}" data-anick="${esc(a.nick)}">🎁 Regala / Presta</button></div>`).join(''):'<p class="muted" style="font-size:12.5px">Diventate alleati aiutandovi in un’orda o invitandovi: poi potete regalarvi e prestarvi Mattoni, e regalarvi monete e materiali (le gemme no).</p>'}
   ${LO.length?`<h4 class="ah">📒 Prestiti in corso</h4>${LO.map(l=>`<div class="arow"><div><b>${l.dir==='dato'?'Hai prestato':'Devi restituire'} 🧱 ${l.left_due}</b><small>${l.dir==='dato'?'a':'a'} @${esc(l.nick)} · ${new Date(l.due_at)>new Date()?'torna il '+new Date(l.due_at).toLocaleDateString('it-IT',{day:'numeric',month:'short'}):'in restituzione'}</small></div></div>`).join('')}`:''}</div>`;}
function ayRefresh(){try{const p=app.querySelector('.apan');if(!p)return;const old=p.querySelector('.ayb');const n=document.createElement('div');n.innerHTML=ayHTML();const nb=n.firstElementChild;if(!nb)return;if(old)old.replaceWith(nb);else{const iv=p.querySelector('[data-ainv]');if(iv)iv.insertAdjacentElement('beforebegin',nb);else p.appendChild(nb);}ayBind();}catch(e){}}
function ayBind(){app.querySelectorAll('[data-agive]').forEach(b=>b.onclick=()=>aySheet(b.dataset.agive,b.dataset.anick));}
function aySheet(uid,nick){let kind='mattoni',loan=true;const have=k=>k==='mattoni'?(W.m?W.m.mattoni:0):k==='monete'?G.coins:k==='gemme'?G.gems:((G.mat||{})[k]||0);
  const draw=card=>{card.querySelector('.ayk').innerHTML=Object.entries(GK).map(([k,v])=>`<button class="chip ${k===kind?'on':''}" data-k="${k}">${v[0]} ${v[1]}<small> (${wNum(have(k))})</small></button>`).join('');
    card.querySelector('.aym').innerHTML=kind==='mattoni'?`<button class="chip ${loan?'on':''}" data-m="1">🤝 Presta (torna fra 3 giorni)</button><button class="chip ${!loan?'on':''}" data-m="0">🎁 Regala</button>`:'<span class="muted" style="font-size:12.5px">Monete, gemme e materiali si possono solo regalare.</span>';
    card.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{kind=b.dataset.k;if(kind!=='mattoni')loan=false;draw(card);});card.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{loan=b.dataset.m==='1';draw(card);});};
  openSheet('🎁 A @'+esc(nick),`<p style="font-weight:400">Cosa vuoi dare?</p><div class="ayk chips" style="margin:6px 0"></div><div class="aym" style="margin:6px 0"></div>
   <label class="disp" style="font-size:16px">Quantità</label><input id="ayN" type="number" inputmode="numeric" min="1" value="50" class="field">
   <p class="muted" style="font-size:12px;margin:6px 0">Limiti al giorno: 300 Mattoni, 1.000 monete, 20 gemme, 10 per materiale.</p>
   <button class="btn wide" data-ayok>Conferma</button>`,card=>{draw(card);card.querySelector('[data-ayok]').onclick=async()=>{const n=Math.floor(+card.querySelector('#ayN').value||0);if(n<1){toast('Scrivi una quantità');return;}
     if(have(kind)<n){toast('Non ne hai abbastanza');return;}const btn=card.querySelector('[data-ayok]');btn.disabled=true;
     try{const{data,error}=await SB.rpc('world_give',{p_to:uid,p_kind:kind,p_amount:n,p_loan:kind==='mattoni'&&loan});if(error)throw error;
       if(data.ok){if(kind==='monete')G.coins-=n;else if(kind==='gemme')G.gems-=n;else if(kind!=='mattoni'){G.mat[kind]-=n;}try{saveLocal();}catch(e){}toast('✅ '+data.msg);closeSheet();wMine(true);ayLoad(true);}else{toast(data.msg);btn.disabled=false;}}
     catch(e){toast(e.message||'Non riuscito');btn.disabled=false;}};});}
/* il pannello alleati mostra anche gli alleati, regali e prestiti */
const _alHTMLAY=alHTML;alHTML=function(){const h=_alHTMLAY();return h?h.replace('<button class="btn ghost small" data-ainv',ayHTML()+'<button class="btn ghost small" data-ainv'):h;};
const _alBindAY=alBind;alBind=function(){_alBindAY();ayBind();ayLoad();};
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
function luckTopBind(){const p=app.querySelector('.lpan');if(!p)return;p.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{const k=b.dataset.lt;
  if(k==='wheel'){if(G.spins>0)wheelSheet();else toast('Niente giri: riscatta l’orda o vinci una notte');return;}
  if(k==='scratch'){if(G.scratch>0)scratchSheet();else toast('Niente biglietti: aiuta un alleato o vinci una notte');return;}
  const t=k==='daily'?document.getElementById('dClaim'):document.querySelector('[data-luck]');if(t){const f=t.closest('details');if(f)f.open=true;const sec=t.closest('[data-grp]');if(sec&&sec.hidden){G.sub=sec.dataset.grp;renderHub();setTimeout(()=>{const t2=k==='daily'?document.getElementById('dClaim'):document.querySelector('[data-luck]');if(t2){const f2=t2.closest('details');if(f2)f2.open=true;t2.scrollIntoView({behavior:'smooth',block:'center'});}},150);return;}
    t.scrollIntoView({behavior:'smooth',block:'center'});if(k==='daily'&&!t.disabled)setTimeout(()=>t.click(),600);}});}
const _splitHubL=splitHub;splitHub=function(){_splitHubL();try{if((G.sub||'q')!=='q'||app.querySelector('.lpan'))return;const anchor=app.querySelector('.apan')||app.querySelector('.opan');const h=luckTopHTML();
  if(anchor)anchor.insertAdjacentHTML('afterend',h);else{const pg=app.querySelector('.page');if(pg)pg.insertAdjacentHTML('afterbegin',h);}const p=app.querySelector('.lpan');if(p){p.dataset.grp='q';luckTopBind();}}catch(e){console.warn('fortuna',e);}};
/* manuale */
const _manualAY=manualHTML;manualHTML=function(){return _manualAY().replace('<details class="man"',`<details class="man"><summary>🎁 Regali, prestiti e fortuna</summary><div class="man-b"><p><b>Alleati</b> sono i giocatori con cui vi siete aiutati negli ultimi 30 giorni e chi hai invitato (o chi ti ha invitato). Agli alleati puoi <b>prestare Mattoni</b> (tornano da soli dopo 3 giorni) o <b>regalare</b> Mattoni, monete, gemme e materiali. Limiti al giorno: 300 Mattoni, 1.000 monete, 20 gemme, 10 per materiale; gli account nuovi possono regalare dopo 3 giorni.</p><p><b>Ruota, gratta e vinci, premio del giorno e barattolo</b> sono in alto nel gioco: giri e biglietti si guadagnano riscattando l’orda, vincendo notti e aiutando gli alleati.</p></div></details><details class="man"`);};
</script>
