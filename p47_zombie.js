<script>
/* =========================================================
   ZOMBIE SPECIALI, METEO E TERRENO VERI, DIFESE MIRATE, SIMULATORE
   Stessa formula del server (zombie.sql):
   attacco = (30 + 2×liv + caso 0–49) × mod(vagante) + Σ speciali base×(1+0,03×liv)×mod×(1−0,3×difesa)
   ========================================================= */
const ZSP={runner:{ic:'🏃',n:'Corridore',dk:'fossato',why:'soffre le salite, scivola con pioggia e neve'},casco:{ic:'🪖',n:'Col casco',dk:'barricate',why:'resistente, la pioggia non lo ferma'},
  strillone:{ic:'📢',n:'Strillone',dk:'sirena',why:'urla e spinge tutta l’orda'},scavatore:{ic:'⛏️',n:'Scavatore',dk:'fondamenta',why:'ignora le salite, più forte con la pioggia'},
  brute:{ic:'💪',n:'Bruto',dk:'barricate',why:'fortissimo, ma lento in salita'},ombra:{ic:'👤',n:'Ombra',dk:'fari',why:'fortissima con nebbia, blackout e di notte'},boss:{ic:'👑',n:'Bruto della Sagra',dk:'barricate',why:'il boss: arriva con le orde grandi'}};
const ZDEF={fossato:['🕳️','Fossato'],barricate:['🚪','Barricate rinforzate'],sirena:['🚨','Sirena'],fondamenta:['🧱','Fondamenta rinforzate'],fari:['🔦','Fari e luci'],
  trappole:['🪤','Trappole'],grate:['▦','Grate d’acciaio'],recinto:['⚡','Recinto elettrificato'],cani:['🐕','Cani da guardia'],pompa:['💧','Pompa di drenaggio']};
const EVN={calma:['🌙','Tempo calmo','nessun effetto'],pioggia:['🌧️','Pioggia','corridori e vaganti più lenti, scavatori più forti'],neve:['❄️','Neve','corridori quasi fermi, scavatori deboli'],
  nebbia:['🌫️','Nebbia','le Ombre diventano fortissime'],blackout:['⚡','Blackout','Ombre fortissime, orda un po’ più forte'],luna:['🌕','Luna piena','tutta l’orda più forte (+15%)']};
/* replica della formula del server */
function zm(k,s,ev,hh){let t={runner:1-4*s,brute:1-3*s,boss:1-2*s,walker:1-s,casco:1-s,ombra:1-s}[k];if(t==null)t=1;
  const W={pioggia:{runner:.7,walker:.9,scavatore:1.3,ombra:1.1},neve:{runner:.5,walker:.8,scavatore:.6,brute:.8},nebbia:{ombra:1.6,runner:.9},blackout:{ombra:1.6,_:1.05},luna:{_:1.15}}[ev]||{};
  const w=W[k]!=null?W[k]:(W._||1);const tm=k==='ombra'?(hh>=18?1.2:.6):1;return Math.max(.3,Math.min(1.8,t*w*tm));}
function thrCalc(T,o={}){const lvl=o.level!=null?o.level:T.level;const defs=Object.assign({},T.defs||{},o.defs||{});
  const def=T.def+12*(Math.max(lvl,1)-Math.max(T.level,1));const sp=(T.specials||[]).map(x=>{const dl=Math.min(3,defs[x.dk]||0),dl2=x.dk2?Math.min(3,defs[x.dk2]||0):0;return{...x,dl,dl2,p:x.base*x.mod*(1-.3*dl)*(1-.15*dl2)};});
  const tr=1-.06*Math.min(3,defs.trappole||0);const ss=sp.reduce((a,x)=>a+x.p,0);const amin=Math.round(T.std_min*T.mw*tr+ss),amax=Math.round(T.std_max*T.mw*tr+ss);
  const ch=Math.max(0,Math.min(100,Math.round((def-amin+1)/(amax-amin+1)*100)));return{def,amin,amax,ch,sp,ss};}
window.THR={L:null,t:0};
async function thrLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return null;if(!force&&THR.L&&Date.now()-THR.t<60000)return THR.L;
  try{const{data,error}=await SB.rpc('world_threats');if(error)throw error;THR.L=data||[];THR.t=Date.now();}catch(e){THR.err=e.message;}return THR.L;}
function thrOf(h){const L=THR.L||[];return L.find(x=>(h.home&&x.home)||(!h.home&&x.bid===h.bid))||null;}
/* le % ovunque vengono dalla minaccia vera della casa */
const _frChanceOfZ=frChanceOf;frChanceOf=function(h){const T=thrOf(h);if(T)return thrCalc(T).ch;return _frChanceOfZ(h);};
/* ---------- scheda della casa: chi arriva + difese mirate + simulatore ---------- */
function thrHTML(T,sim){const r=thrCalc(T,sim);const base=thrCalc(T);const ev=EVN[T.ev]||EVN.calma;const sl=T.slope||0;const slT=Math.abs(sl)<.01?'terreno piano':sl>0?`casa in alto: salita del ${Math.round(sl*100)}% per gli zombie`:`casa in basso: discesa del ${Math.round(-sl*100)}% per gli zombie`;
  const lvl=sim.level!=null?sim.level:T.level;let cost=0;Object.keys(sim.defs||{}).forEach(k=>{const a=(T.defs||{})[k]||0,b=sim.defs[k];for(let l=a;l<b;l++)cost+=80*(l+1);});for(let l=T.level;l<lvl;l++)cost+=150*l;
  const kinds=[...new Set(['trappole',...r.sp.map(x=>x.dk),...r.sp.map(x=>x.dk2).filter(Boolean)])];
  return`<div class="thhead"><span>${ev[0]} <b>${ev[1]}</b> all’orda delle ${String(T.hh).padStart(2,'0')}:00 · <small>${esc(ev[2])}</small></span><span>⛰️ ${slT}</span></div>
   <div class="thrw"><span>🧟 Vaganti (standard)<small>frenati da 🪤 Trappole</small></span><b>${Math.round(T.std_min*T.mw*(1-.06*Math.min(3,(Object.assign({},T.defs||{},sim.defs||{})).trappole||0)))}–${Math.round(T.std_max*T.mw*(1-.06*Math.min(3,(Object.assign({},T.defs||{},sim.defs||{})).trappole||0)))}</b></div>
   ${r.sp.length?r.sp.map(x=>{const z=ZSP[x.k]||{ic:'🧟',n:x.k,why:''};const d=ZDEF[x.dk];const d2=x.dk2?ZDEF[x.dk2]:null;return`<div class="thrw"><span>${z.ic} ${z.n}<small>${z.why}${x.mod!==1?` · qui ×${(Math.round(x.mod*100)/100).toString().replace('.',',')}`:''} · ferma: ${d[0]} ${d[1]}${d2?` (+ ${d2[0]} ${d2[1]})`:''}</small></span><b>${x.p.toFixed(1).replace('.',',')}</b></div>`;}).join(''):'<p class="muted" style="font-size:12.5px">Al tuo livello arrivano solo vaganti. Gli speciali arrivano dal livello 2.</p>'}
   <div class="thrw tot"><span>Forza dell’orda su questa casa</span><b>${r.amin}–${r.amax}</b></div>
   ${kinds.length?`<h4 class="hh">🎯 Difese mirate (prova e guarda la %)</h4>${kinds.map(k=>{const d=ZDEF[k];const cur=(T.defs||{})[k]||0;const v=(sim.defs&&sim.defs[k]!=null)?sim.defs[k]:cur;
      return`<div class="thdef"><span>${d[0]} <b>${d[1]}</b><small>${'●'.repeat(v)}${'○'.repeat(3-v)}${v>cur?' (prova)':''}</small></span><div><button data-sd="${k}" data-v="-1" ${v<=cur?'disabled':''}>−</button><button data-sd="${k}" data-v="1" ${v>=3?'disabled':''}>+</button></div></div>`;}).join('')}`:''}
   <div class="thdef"><span>⬆️ <b>Livello casa</b><small>${lvl}${lvl>T.level?' (prova)':''} · +12 di difesa per livello</small></span><div><button data-sl="-1" ${lvl<=T.level?'disabled':''}>−</button><button data-sl="1" ${lvl>=5?'disabled':''}>+</button></div></div>
   <div class="thres"><div><small>Difesa</small><b>${r.def}</b></div><div><small>Oggi</small><b>${base.ch}%</b></div><div class="${r.ch>base.ch?'up':''}"><small>Con le prove</small><b>${r.ch}%</b></div></div>
   <div class="thtools"><button class="btn small" data-sadv>🧠 Consigliami (🧱 ${wNum((window.W&&W.m&&W.m.mattoni)||0)})</button>${!(OR.s&&OR.s.prepared)?'<button class="btn small alt" data-sprep>🛡️ Prepara tutte le case (+15)</button>':''}</div>
   ${cost?`<button class="btn wide" data-sbuy>Compra queste migliorie · 🧱 ${wNum(cost)}</button>`:''}`;}
/* 🧠 consiglio: con i Mattoni che hai, le migliorie che alzano di più la % */
function thrAdvise(T,budget){const sim={defs:{},level:T.level};const kinds=[...new Set(['trappole',...(T.specials||[]).map(x=>x.dk),...(T.specials||[]).map(x=>x.dk2).filter(Boolean)])];let left=budget;const ch=()=>thrCalc(T,sim).ch;
  for(let guard=0;guard<20;guard++){const base=ch();let best=null;
    kinds.forEach(k=>{const cur=sim.defs[k]!=null?sim.defs[k]:((T.defs||{})[k]||0);if(cur>=3)return;const c=80*(cur+1);if(c>left)return;sim.defs[k]=cur+1;const g=ch()-base;sim.defs[k]=cur===((T.defs||{})[k]||0)?undefined:cur;if(sim.defs[k]===undefined)delete sim.defs[k];if(g>0&&(!best||g/c>best.r))best={t:'d',k,c,r:g/c};});
    if(sim.level<5){const c=150*sim.level;if(c<=left){sim.level++;const g=ch()-base;sim.level--;if(g>0&&(!best||g/c>best.r))best={t:'l',c,r:g/c};}}
    if(!best)break;left-=best.c;if(best.t==='d'){const cur=sim.defs[best.k]!=null?sim.defs[best.k]:((T.defs||{})[best.k]||0);sim.defs[best.k]=cur+1;}else sim.level++;}
  return{sim,spent:budget-left};}
async function thrSection(card,h){await thrLoad();const T=thrOf(h);const box=card.querySelector('.thbox');if(!box)return;
  if(!T){box.innerHTML=`<p class="muted" style="font-size:12.5px">${THR.err?'Simulatore non disponibile ('+esc(THR.err)+'). Esegui il file zombie.sql su Supabase.':'Questa casa non è ancora nel mondo.'}</p>`;return;}
  const sim={defs:{},level:T.level};const draw=()=>{box.innerHTML=thrHTML(T,sim);
    box.querySelectorAll('[data-sd]').forEach(b=>b.onclick=()=>{const k=b.dataset.sd;const cur=(T.defs||{})[k]||0;const v=(sim.defs[k]!=null?sim.defs[k]:cur)+(+b.dataset.v);sim.defs[k]=Math.max(cur,Math.min(3,v));draw();});
    box.querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{sim.level=Math.max(T.level,Math.min(5,sim.level+(+b.dataset.sl)));draw();});
    const adv=box.querySelector('[data-sadv]');if(adv)adv.onclick=()=>{const m=(window.W&&W.m&&W.m.mattoni)||0;const before=thrCalc(T).ch;const r=thrAdvise(T,m);
      if(!r.spent){toast(m<80?'Servono almeno 🧱 80 per una difesa':'Con i Mattoni che hai non ci sono migliorie utili qui');return;}sim.defs=r.sim.defs;sim.level=r.sim.level;draw();toast(`🧠 Con 🧱 ${wNum(r.spent)}: da ${before}% a ${thrCalc(T,sim).ch}%. Controlla e tocca “Compra”.`);};
    const pr=box.querySelector('[data-sprep]');if(pr)pr.onclick=async()=>{pr.disabled=true;try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);await orLoad(true);await thrLoad(true);await defLoad(true);houseSheet(h);}catch(e){toast(e.message||'Non riuscito');pr.disabled=false;}};
    const buy=box.querySelector('[data-sbuy]');if(buy)buy.onclick=async()=>{buy.disabled=true;try{
      for(const k of Object.keys(sim.defs)){const cur=(T.defs||{})[k]||0;for(let l=cur;l<sim.defs[k];l++){const{data,error}=await SB.rpc('world_def_upgrade',{p_bid:T.bid,p_kind:k});if(error)throw error;if(!data.ok)throw new Error(data.msg);}}
      for(let l=T.level;l<sim.level;l++){const r=await wRpc('world_upgrade',{p_bid:T.bid});if(!r.ok)throw new Error(r.msg);}
      toast('🛡️ Migliorie fatte!');try{sfx('win');}catch(e){}}catch(e){toast(e.message||'Non riuscito');}
      await wMine(true);await thrLoad(true);await defLoad(true);houseSheet(h);};};draw();}
/* ---------- fronte: composizione e meteo veri della casa inquadrata ---------- */
FZ.ombra={ic:'👤',v:3,sc:1.05,sp:'Si muove nell’ombra: fortissima con nebbia, blackout e di notte. La fermano fari e luci.'};
if(typeof ZT!=='undefined'&&!ZT.ombra)ZT.ombra={name:'Ombra',sp:22,hp:14,dps:9};
const _frCompZ=frComp;frComp=function(wl){const F=FR.dests&&FR.dests[0];const T=F&&thrOf(F);if(!T)return _frCompZ(wl);const L=[];const n=Math.min(14,6+Math.floor(T.wl/2));for(let i=0;i<n;i++)L.push('walker');
  (T.specials||[]).forEach(x=>{const c=x.k==='boss'?1:Math.max(1,Math.round(2*x.mod*(1-.3*Math.min(3,x.dl||0))));for(let i=0;i<c;i++)L.push(x.k);});L.push('oro');return L;};
const _frWxZ=frWx;frWx=function(){const F=FR.dests&&FR.dests[0];const T=F&&thrOf(F);if(!T||T.ev==null)return _frWxZ();const e=EVN[T.ev]||EVN.calma;
  const base=F.home?_frWxZ():null;const t=T.temp!=null?Math.round(T.temp):(base?base.t:null);return{ev:T.ev==='neve'?'pioggia':T.ev,ic:e[0],name:e[1],t,eff:`${e[0]} ${e[1]}: ${e[2]}`};};
const _frHeaderZ=frHeader;frHeader=function(){_frHeaderZ();try{const w=FR.wx;const wb=FR.node&&FR.node.querySelector('.frwx');if(w&&wb&&(w.t==null||w.t===''))wb.textContent=`${w.ic} ${w.name}`;}catch(e){}};
/* aggiornamenti */
const _defLoadZ=defLoad;defLoad=async function(){const r=await _defLoadZ.apply(this,arguments);try{await thrLoad(true);if(S.tab==='orda'&&FR.node){frRings();}}catch(e){}return r;};
</script>
<script>
/* "Perché": la forza dell'orda è quella vera di quella casa */
const _whySheetZ=whySheet;whySheet=function(bid,home){_whySheetZ(bid,home);try{const T=(THR.L||[]).find(x=>(home&&x.home)||(!home&&x.bid===bid));if(!T)return;const r=thrCalc(T);const c=document.querySelector('#sheet.open .sheet-b');if(!c)return;
  const t=c.querySelector('.whytot b');if(t)t.textContent=r.def;const p=[...c.querySelectorAll('p')].find(x=>/avrà una forza/.test(x.textContent));const e=EVN[T.ev]||EVN.calma;
  if(p)p.innerHTML=`L’orda su questa casa (livello ${T.wl}, ${e[0]} ${e[1].toLowerCase()}, terreno ${T.slope>0.01?'in salita':T.slope<-0.01?'in discesa':'piano'}) avrà una forza tra <b>${r.amin}</b> e <b>${r.amax}</b>. Con ${r.def} di difesa tieni nel <b>${r.ch}%</b> dei casi. Le difese mirate le provi nella scheda della casa.`;
  document.querySelector('#sheet.open h3').textContent='🧮 Perché '+r.ch+'%';}catch(e){}};
</script>
