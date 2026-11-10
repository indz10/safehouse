<script>
/* =========================================================
   1) La casa vera conta nell'orda: Scudo 0–5 → +2 difesa a tutte le case per livello
   2) Conto esatto della prossima orda dal server (world_my_defense) + "🧮 Perché X%"
   3) 🧭 Il tuo prossimo passo: guida per tutti, sempre presente
   ========================================================= */
/* ---- 1) Scudo della casa vera al server ---- */
async function rsSync(){if(!S.user||typeof SB==='undefined'||!SB)return;let lv=0;try{lv=scudoLv();}catch(e){return;}const k='zsh_rs_'+S.user.id;try{if(localStorage.getItem(k)===String(lv))return;}catch(e){}
  try{const{data,error}=await SB.rpc('world_set_realshield',{p_lvl:lv});if(!error&&data&&data.ok){try{localStorage.setItem(k,String(lv));}catch(e){}DEF.t=0;}}catch(e){}}
scudoBar=function(){const lv=scudoLv();return`<button class="scudo" data-scudo><span class="sc-i">🛡️</span><span class="sc-t"><b>Scudo della casa vera · ${lv}/5</b><span class="sc-b">${[1,2,3,4,5].map(i=>`<i class="${i<=lv?'on':''}"></i>`).join('')}</span><small>${lv?`Nell’orda: +${lv*2} di difesa a tutte le tue case`:'Migliora la casa vera: ogni livello vale +2 di difesa'}</small></span><span class="sc-a">›</span></button>`;};
openScudo=function(){const st=scudoSteps(),lv=scudoLv();
  openSheet('🛡️ Scudo della casa vera',`<p style="font-weight:400;margin-bottom:8px">Una regola sola: <b>quello che fai per la casa vera ti rende più forte nel gioco.</b></p>
   <div class="scl">${st.map(s=>`<div class="${s[2]?'ok':''}"><span>${s[2]?'✅':s[0]}</span><b>${s[1]}</b>${s[2]?'<small>fatto</small>':`<button class="btn small" data-sgo="${s[3]}">Fai</button>`}</div>`).join('')}</div>
   <div class="panel moon" style="margin-top:10px"><b>Il tuo Scudo ora: ${lv}/5</b><p style="font-weight:400;margin-top:4px">Ogni livello dà <b>+2 di difesa a tutte le tue case</b> a ogni orda del mondo (fino a +10). Ora: <b>+${lv*2}</b>.</p></div>`,
   card=>card.querySelectorAll('[data-sgo]').forEach(x=>x.onclick=()=>{closeSheet();if(x.dataset.sgo==='mondo'){go('casa');}else go('valuta');}));};
/* ---- 2) conto esatto ---- */
window.DEF={d:null,t:0};
async function defLoadBase(force){if(!S.user||typeof SB==='undefined'||!SB)return null;if(!force&&DEF.d&&Date.now()-DEF.t<60000)return DEF.d;
  try{const{data,error}=await SB.rpc('world_my_defense');if(error)throw error;DEF.d=data;DEF.t=Date.now();}catch(e){}return DEF.d;}
function defChance(total){const d=DEF.d;if(!d||total==null)return null;return Math.max(0,Math.min(100,Math.round((total-d.attack_min+1)/60*100)));}
function defHouse(bid,home){const d=DEF.d;if(!d||!d.houses)return null;return d.houses.find(h=>(home&&h.home)||(bid&&h.bid===bid))||null;}
function whySheet(bid,home){const d=DEF.d;if(!d){toast('Conto non disponibile ora');return;}const h=defHouse(bid,home)||d.houses&&d.houses[0];const tot=h?h.total:null;const ch=defChance(tot);
  const row=(ic,t,v,on=true)=>`<div class="whyr ${v<0?'neg':v>0?'pos':''}"><span>${ic} ${t}</span><b>${v>0?'+':''}${v}</b></div>`;
  openSheet('🧮 Perché '+(ch!=null?ch+'%':''),`<p style="font-weight:400;margin:0 0 8px">Il conto della <b>prossima orda</b>, calcolato dal server con le stesse regole per tutti.</p>
   ${h?row('🏠','Base della casa',45)+row('⬆️',`Livello casa ${h.level} (12 per livello)`,12*Math.max(h.level,1))+(h.home?row('❤️','Casa vera',5):''):''}
   ${row('🛡️','Case preparate',d.prep)}${row('🏡',`Scudo della casa vera ${d.realshield}/5`,d.realshield_pts)}${row('🤝',`Rinforzi degli alleati (${d.helps})`,d.helps_pts)}
   ${row('🛡️',`Scudi degli alleati (${d.shields})`,d.shields_pts)}${row('👥',`Difesa di squadra (${d.squad}/3 alleati pronti)`,d.squad_pts)}${row('🏢',`Coinquilini pronti (${d.coinq})`,d.coinq_pts)}
   ${d.malus?row('😈',`Malus dei rivali (orde ${d.attacks}, nebbia ${d.fog}, sabotaggio ${d.sab})`,-d.malus):''}
   <div class="whytot"><span>Difesa totale</span><b>${tot!=null?tot:'—'}</b></div>
   <p style="font-weight:400;font-size:13px;margin:8px 0 0">L’orda per il tuo livello (${d.wlevel}) avrà una forza tra <b>${d.attack_min}</b> e <b>${d.attack_max}</b>. ${ch!=null?`Con ${tot} di difesa tieni nel <b>${ch}%</b> dei casi.`:''}</p>
   <p class="muted" style="font-size:12px;margin-top:6px">Per salire: prepara le case, chiedi rinforzi, potenzia la casa, migliora la casa vera (Scudo).</p>`);}
/* nella scheda di ogni casa: probabilità vera + "Perché" */
/* sul fronte: probabilità vera della casa vera */
/* la simulazione usa il conto vero di ogni casa */
const _regSimRowsDef=regSimRows;regSimRows=function(){const rows=_regSimRowsDef();try{if(!DEF.d)return rows;rows.forEach((r,i)=>{const h=REG.H[i];const dh=h&&defHouse(h.bid,h.home);if(!dh)return;r.sim.pw=dh.total;r.held=dh.total>=r.sim.atk;});}catch(e){}return rows;};
/* ---- 3) 🧭 IL TUO PROSSIMO PASSO ---- */
function coSteps(){const s=OR.s||{},m=window.W&&W.m,L=[];const add=(id,ic,t,why,done,go)=>L.push({id,ic,t,why,done:!!done,go});
  const nx=(()=>{try{const d=oggiNext();return String(d.getHours()).padStart(2,'0')+':00';}catch(e){return'';}})();
  add('valuta','📷','Valuta la tua casa vera','È la base: indice, piano d’azione e Scudo della casa vera.',!!S.result,()=>go('valuta'));
  if(!S.user){add('login','🔑','Accedi o crea l’account','Serve per entrare nel mondo, salvare e giocare con gli altri.',false,()=>loginSheet());return L;}
  if(s.total>0&&!s.claimed)add('claim','🎁','Riscatta i premi dell’ultima orda','Mattoni, giri e biglietti ti aspettano.',false,()=>coGoOrda('.opan'));
  add('prep','🛡️',`Prepara le case per l’orda delle ${nx}`,'+15 di difesa a tutte le tue case, gratis.',!!s.prepared,()=>coGoOrda('.opan'));
  add('help','🆘','Chiedi aiuto agli alleati','+5 per ogni alleato che risponde (fino a +20).',!!s.asked,()=>coGoOrda('.opan'));
  const td=window.TB&&TB.d;if(td&&td.allies>0)add('shield','🛡️','Dai uno scudo a un alleato','20 💎: +5 alla sua difesa, e lui farà lo stesso con te.',Array.isArray(td.shields_out)&&td.shields_out.length>0,()=>{SOC.tab='squadra';go('social');});
  try{const ds=dailyState();add('daily','🎁','Riscuoti il premio del giorno','Ogni giorno di fila il premio cresce.',ds.claimed,()=>{go('orda');setTimeout(()=>dailySheet(),500);});}catch(e){}
  try{const st=scudoSteps();const miss=st.find(x=>!x[2]);add('scudo','🏡',miss?`Casa vera: ${miss[1]}`:'Scudo della casa vera al massimo','Ogni livello di Scudo dà +2 di difesa a tutte le tue case.',!miss,()=>openScudo());}catch(e){}
  if(m){const hs=myHouses();const up=hs.find(h=>!h.home&&h.level<5&&m.mattoni>=150*h.level);add('up','⬆️',up?`Potenzia ${up.label} (🧱 ${150*up.level})`:'Potenzia una casa','+12 di difesa e più affitti per livello.',!up,()=>{if(up){S.mfHouses=true;go('mappa');setTimeout(()=>mhFly(up,true),900);}else go('mappa');});
    if(m.mattoni>=500)add('buy','🏠','Compra una casa nel mondo','Più case = più affitti e più premi a ogni orda.',false,()=>{S.mfHouses=true;go('mappa');});}
  try{const T=tmInit();if(T){const mm=T.list.find(x=>!x.cl);add('mis','🎯',mm?`Missione: ${String(mm.t).replace(/<[^>]+>/g,'')}`:'Missioni di oggi completate','Monete e gemme in premio.',!mm,()=>coGoOrda('.tmp'));}}catch(e){}
  if(td&&td.allies===0)add('ally','🤝','Fatti un alleato','Invita un amico: 150 🧱 a te e alleanza automatica.',false,()=>inviteSheet());
  return L;}
function coGoOrda(sel){go('orda');setTimeout(()=>{const t=app.querySelector(sel);if(t){t.scrollIntoView({behavior:'smooth',block:'start'});t.classList.remove('flashme');void t.offsetWidth;t.classList.add('flashme');}},600);}
function coHTML(compact){const L=coSteps();const todo=L.filter(x=>!x.done);const done=L.length-todo.length;const s=todo[0];
  if(!s)return`<div class="coach ${compact?'cmp':''}"><div class="cohd">🧭 Il tuo prossimo passo<small>${done}/${L.length}</small></div><b>✅ Tutto fatto per ora!</b><small>Guarda il fronte o torna dopo l’orda per riscattare i premi.</small><div class="cobt"><button class="btn small" data-cogo="fronte">🗺️ Il fronte</button><button class="btn small ghost" data-coall>Tutti i passi</button></div></div>`;
  return`<div class="coach ${compact?'cmp':''}"><div class="cohd">🧭 Il tuo prossimo passo<small>${done}/${L.length} fatti</small></div><b>${s.ic} ${esc(s.t)}</b><small>${esc(s.why)}</small><div class="cobt"><button class="btn small" data-cogo="${s.id}">Fammelo fare</button><button class="btn small ghost" data-coall>Tutti i passi</button></div></div>`;}
function coBind(root){root.querySelectorAll('[data-cogo]').forEach(b=>b.onclick=()=>{const id=b.dataset.cogo;if(id==='fronte')return coGoOrda('.fronte');const s=coSteps().find(x=>x.id===id);if(s)s.go();});
  root.querySelectorAll('[data-coall]').forEach(b=>b.onclick=coAll);}
function coAll(){const L=coSteps();openSheet('🧭 I tuoi passi',`<p style="font-weight:400;margin:0 0 8px">In ordine di importanza. Tocca un passo per farlo.</p>${L.map(s=>`<button class="costep ${s.done?'ok':''}" data-cs="${s.id}"><span>${s.done?'✅':s.ic}</span><div><b>${esc(s.t)}</b><small>${esc(s.why)}</small></div>${s.done?'':'<i>›</i>'}</button>`).join('')}
   <button class="btn ghost small" data-cotour style="margin-top:8px">🧭 Rifai il giro guidato completo</button>`,card=>{card.querySelectorAll('[data-cs]').forEach(b=>b.onclick=()=>{const s=L.find(x=>x.id===b.dataset.cs);if(s&&!s.done){closeSheet();s.go();}});
   const t=card.querySelector('[data-cotour]');if(t)t.onclick=()=>{closeSheet();try{zmDo('tour');}catch(e){go('home');}};});}
function coPut(){try{if(S.tab==='home'){const h=app.querySelector('.hsbtns');if(h){const o=h.querySelector('.coach');const n=document.createElement('div');n.innerHTML=coHTML(true);const el=n.firstElementChild;if(o)o.replaceWith(el);else h.prepend(el);coBind(el);}}
  if(S.tab==='orda'){const pg=app.querySelector('.page');if(pg){const o=pg.querySelector(':scope > .coach');const n=document.createElement('div');n.innerHTML=coHTML(false);const el=n.firstElementChild;if(o)o.replaceWith(el);else pg.prepend(el);coBind(el);}}}catch(e){}}
const _renderHomeCo=renderHome;renderHome=function(){_renderHomeCo();coPut();};
/* aggiornamenti */
zEvery(()=>{if(document.visibilityState==='visible'&&(S.tab==='home'||S.tab==='orda'))coPut();},30000);
</script>
<script>
</script>
