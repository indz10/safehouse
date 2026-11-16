<script>
/* =========================================================
   🛡️ DIFENDI CASA NELLA LENTE e 👹 BOSS DELLA SETTIMANA (migrazione 026, Fase 29 — seconda parte del gioco della Lente)
   🛡️ Difesa (DFA): vicino alla casa vera (meno di 300 m), nella Lente "🛡️ Difendi casa":
     1) PIAZZA LE TORRETTE: punti il telefono in una direzione vera e tocchi "🔫 Piazza qui" (1 + livello torretta
        dell'Assedio, max 3); 2) arrivano 3 ONDATE di zombie da tutte le direzioni: le torrette sparano da sole a quelli
        davanti a loro (±30°), tu giri il telefono e tocchi gli altri; se uno arriva, la casa perde una vita.
     world_difar_inizia (1 energia, max 6 al giorno) / world_difar_fine (il server controlla i tempi e dà i premi).
   👹 Boss (BOSS): un mostro per zona (~25 km) e per settimana, uguale per tutti: bossSheet (vita, classifica, alleati di
     oggi che rendono il colpo più forte), bossFight: 20 secondi per colpire i punti deboli e schivare i suoi colpi
     (world_boss_inizia / world_boss_fine, 3 attacchi al giorno). Quando cade, premi a tutti quelli che l'hanno colpito.
   ========================================================= */
const DFA={on:false,fase:'',id:null,Z:[],T:[],t0:0,raf:0,danno:1,uccisi:0,casa:0,casa0:0,tor:1,fine:false,ond:1};
const DFA_K={lento:['🧟',15000],corridore:['🧟‍♂️',9000],bruto:['💪',20000]};
const dfaHead=()=>{const L=LENTE;return((L.h==null?0:L.h)+L.man+360)%360;};
const dfaRel=b=>((b-dfaHead()+540)%360)-180;
/* il pulsante nella Lente, accanto alla caccia */
const _lenteOpenDfa=lenteOpen;lenteOpen=async function(){const r=await _lenteOpenDfa.apply(this,arguments);try{dfaBtn();}catch(e){}return r;};
function dfaBtn(){const L=LENTE;if(!L.root||L.root.querySelector('[data-dfago]'))return;const bot=L.root.querySelector('.lnbot');if(!bot)return;
  bot.insertAdjacentHTML('beforeend','<button class="lncac dfabtn" data-dfago type="button">🛡️ Difendi casa</button>');
  bot.querySelector('[data-dfago]').onclick=e=>{e.stopPropagation();dfaStart();};}
async function dfaStart(){const L=LENTE;if(DFA.on||!L.root)return;if(typeof CAC!=='undefined'&&CAC.on)return;if(!S.user){toast('Accedi per difendere la casa');return;}
  const p=L.pos||S.geo;if(!p){toast('🛡️ Serve la posizione: permetti il GPS');return;}
  const b=L.root.querySelector('[data-dfago]');if(b)b.disabled=true;let d=null;
  try{const{data,error}=await SB.rpc('world_difar_inizia',{p_lat:p.lat,p_lon:p.lon});if(error)throw error;d=data;}catch(e){toast('🛡️ La difesa nella Lente arriva dopo l’aggiornamento del server (blocco SQL 026)');}
  if(b)b.disabled=false;if(!d)return;if(!d.ok){toast('🛡️ '+d.msg);return;}
  Object.assign(DFA,{on:true,fase:'piazza',id:d.id,Z:[],T:[],danno:d.danno||1,uccisi:0,casa:d.casa||5,casa0:d.casa||5,tor:d.torrette||1,fine:false,ond:1,zr:d.zombie||[]});
  let box=L.root.querySelector('.lncz');if(box)box.remove();box=document.createElement('div');box.className='lncz dfa';L.root.appendChild(box);
  box.innerHTML=`<div class="lncbar"><b>🛡️ Difendi casa</b><span data-dfan></span></div><div class="lncedge l">◀</div><div class="lncedge r">▶</div>
    <div class="dfapiazza"><b>🔫 Piazza le torrette</b><span>Punta il telefono verso una strada da cui possono arrivare e tocca “Piazza qui”. Sparano da sole a chi arriva davanti a loro.</span>
    <div><button class="btn small" data-dfapz>🔫 Piazza qui</button><button class="btn small ghost" data-dfavia>▶️ Via!</button></div></div>`;
  box.querySelector('[data-dfapz]').addEventListener('click',e=>{e.stopPropagation();dfaPiazza();});
  box.querySelector('[data-dfavia]').addEventListener('click',e=>{e.stopPropagation();dfaVia();});
  L.root.classList.add('caccia');dfaBar();DFA.raf=requestAnimationFrame(dfaLoop);}
function dfaPiazza(){if(DFA.fase!=='piazza'||DFA.T.length>=DFA.tor)return;const L=LENTE,box=L.root.querySelector('.lncz.dfa');if(!box)return;
  const el=document.createElement('div');el.className='dfator';el.innerHTML='<span>🔫</span><i></i>';box.appendChild(el);
  DFA.T.push({b:dfaHead(),el,next:0});try{sfx&&sfx('click');}catch(e){}toast(`🔫 Torretta ${DFA.T.length} piazzata`);if(DFA.T.length>=DFA.tor)setTimeout(dfaVia,500);else dfaBar();}
function dfaVia(){if(DFA.fase!=='piazza')return;const L=LENTE,box=L.root.querySelector('.lncz.dfa');if(!box)return;const pz=box.querySelector('.dfapiazza');if(pz)pz.remove();
  DFA.fase='ondata';DFA.t0=performance.now();
  DFA.Z=DFA.zr.map(z=>{const K=DFA_K[z.k]||DFA_K.lento;const el=document.createElement('button');el.type='button';el.className='lncz1 k-'+z.k;
    el.innerHTML=`<span>${K[0]}</span><i>${'❤'.repeat(z.hp)}</i>`;el.style.display='none';box.appendChild(el);
    const o={k:z.k,hp:z.hp,o:z.o||1,bear:(+z.b||0)%360,dt:(+z.dt||0)*1000,dur:K[1],el,st:'att'};
    el.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();dfaHit(o,DFA.danno);});return o;});
  try{sfx&&sfx('zombie');}catch(e){}toast('🧟 Arrivano! Girati e difendi la casa');dfaBar();}
function dfaHit(o,n){if(o.st!=='via')return;o.hp-=n;o.el.classList.remove('hit');void o.el.offsetWidth;o.el.classList.add('hit');try{sfx&&sfx('click');}catch(e){}
  if(o.hp<=0){o.st='morto';DFA.uccisi++;o.el.innerHTML='<span>💥</span><i>⭐+4</i>';o.el.classList.add('morto');setTimeout(()=>{o.el.style.display='none';},700);}
  else o.el.querySelector('i').textContent='❤'.repeat(Math.max(0,o.hp));}
function dfaBar(){const n=LENTE.root&&LENTE.root.querySelector('[data-dfan]');if(!n)return;
  if(DFA.fase==='piazza'){n.textContent=`🔫 ${DFA.T.length}/${DFA.tor} torrette`;return;}
  const rest=DFA.Z.filter(o=>o.st==='att'||o.st==='via');n.textContent=`🏠 ${'❤️'.repeat(Math.max(0,DFA.casa))} · ondata ${DFA.ond}/3 · 💥 ${DFA.uccisi}`;}
function dfaLoop(){const L=LENTE;if(!DFA.on)return;if(!L.on){DFA.on=false;dfaEnd();return;}DFA.raf=requestAnimationFrame(dfaLoop);
  const W=L.root.clientWidth,H=L.root.clientHeight;const hor=H*.52-((L.beta||90)-90)/LN_VFOV*H;
  /* torrette: segnate sull'orizzonte nella loro direzione */
  DFA.T.forEach(t=>{const rel=dfaRel(t.b);const vis=Math.abs(rel)<=LN_HFOV/2+4;t.el.style.visibility=vis?'':'hidden';if(vis)t.el.style.transform=`translate(${Math.round(W/2+rel/LN_HFOV*W-26)}px,${Math.round(hor+H*.18)}px)`;});
  if(DFA.fase!=='ondata')return;const now=performance.now()-DFA.t0;let sx=false,dx=false;
  DFA.Z.forEach(o=>{if(o.st==='att'&&now>=o.dt){o.st='via';o.ts=now;o.el.style.display='';DFA.ond=Math.max(DFA.ond,o.o);}
    if(o.st!=='via')return;const f=Math.min(1,(now-o.ts)/o.dur);
    if(f>=1){o.st='perso';o.el.style.display='none';DFA.casa--;L.root.classList.remove('graffio');void L.root.offsetWidth;L.root.classList.add('graffio');try{navigator.vibrate&&navigator.vibrate(150);}catch(e){}return;}
    o.f=f;const rel=dfaRel(o.bear);const vis=Math.abs(rel)<=LN_HFOV/2+6;if(!vis){if(rel<0)sx=true;else dx=true;o.el.style.visibility='hidden';return;}o.el.style.visibility='';
    const s=.45+f*1.5,wob=Math.sin((now+o.dt)/150)*5;o.el.style.transform=`translate(${Math.round(W/2+rel/LN_HFOV*W-40)}px,${Math.round(hor-20+f*H*.3+wob-40)}px) scale(${s.toFixed(2)})`;});
  /* le torrette sparano ogni secondo al più vicino davanti a loro */
  DFA.T.forEach(t=>{if(now<t.next)return;let best=null;DFA.Z.forEach(o=>{if(o.st!=='via'||(o.f||0)<.15)return;const a=Math.abs(((o.bear-t.b+540)%360)-180);if(a<=30&&(!best||o.f>best.f))best=o;});
    if(best){t.next=now+1000;dfaHit(best,1);t.el.classList.remove('spara');void t.el.offsetWidth;t.el.classList.add('spara');}});
  const el=L.root.querySelector('.lncedge.l'),er=L.root.querySelector('.lncedge.r');if(el)el.style.display=sx?'':'none';if(er)er.style.display=dx?'':'none';
  dfaBar();const rest=DFA.Z.filter(o=>o.st==='att'||o.st==='via').length;
  if(DFA.casa<=0||!rest){DFA.on=false;cancelAnimationFrame(DFA.raf);setTimeout(dfaEnd,600);}}
async function dfaEnd(){if(DFA.fine)return;DFA.fine=true;DFA.on=false;const L=LENTE;let r=null;
  try{const{data,error}=await SB.rpc('world_difar_fine',{p_id:DFA.id,p_uccisi:DFA.uccisi,p_casa:Math.max(0,DFA.casa)});if(error)throw error;r=data;}catch(e){}
  try{RES.t=0;resLoad(true);supLoad(true);}catch(e){}
  if(!L.root){if(r&&r.ok)toast(`🛡️ Difesa: ${r.vinto?'casa salva':'casa caduta'} · ⭐ +${r.xp}`);return;}L.root.classList.remove('caccia');const box=L.root.querySelector('.lncz.dfa');if(!box)return;
  const g=r&&r.ok?[r.legno?'🪵 +'+r.legno:'',r.cibo?'🥫 +'+r.cibo:'',r.carb?'⛽ +'+r.carb:'',r.mattoni?'🧱 +'+r.mattoni:''].filter(Boolean).join(' '):'';
  box.innerHTML=`<div class="lncres"><b>${r&&r.ok?(r.vinto?'🏠 Casa salva!':'💔 La casa è caduta'):'Difesa finita'}</b>${r&&r.ok?`<span>💥 ${r.uccisi} zombie su ${r.n} · ⭐ +${r.xp}${g?' · '+g:''}</span>`:'<span>Non riesco a parlare col server: riprova</span>'}
    ${r&&r.salito?`<span>🎖️ Sei salito al grado ${r.grado}!</span>`:''}${r&&r.ok&&!r.vinto?'<span class="muted" style="font-size:12.5px">Potenzia torretta e casa nell’🧟 Assedio: qui hai più torrette e più vite.</span>':''}
    <div><button class="btn small" data-dfaagain>🛡️ Ancora (1 energia)</button><button class="btn small ghost" data-dfaok>Fatto</button></div></div>`;
  box.querySelector('[data-dfaagain]').onclick=e=>{e.stopPropagation();box.remove();dfaStart();};box.querySelector('[data-dfaok]').onclick=e=>{e.stopPropagation();box.remove();};}
const _lenteCloseDfa=lenteClose;lenteClose=function(){if(DFA.on){DFA.on=false;cancelAnimationFrame(DFA.raf);dfaEnd();}return _lenteCloseDfa.apply(this,arguments);};
/* dal tasto Gioca: apre la Lente e parte subito */
async function dfaGo(){try{await lenteOpen();}catch(e){}setTimeout(()=>{if(LENTE.on&&!DFA.on)dfaStart();},700);}

/* ---------- 👹 BOSS DELLA SETTIMANA ---------- */
const BOSS={d:null,t:0,f:null};
async function bossLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return null;if(!force&&BOSS.d&&Date.now()-BOSS.t<120000)return BOSS.d;BOSS.t=Date.now();
  try{const{data,error}=await SB.rpc('world_boss_info');if(!error&&data)BOSS.d=data;}catch(e){}return BOSS.d;}
const bossGiorni=t=>{const ms=new Date(t)-Date.now();if(!(ms>0))return'';const g=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);return g?`${g} g ${h} h`:`${h} h`;};
async function bossSheet(){const d=await bossLoad(true);
  if(!d){openSheet('👹 Boss della settimana','<p>Il boss arriva dopo l’aggiornamento del server (blocco SQL 026).</p>');return;}
  if(!d.ok){openSheet('👹 Boss della settimana',`<p>${esc(d.msg||'Non disponibile')}</p>`);return;}
  const pc=Math.max(0,Math.round(d.hp/Math.max(1,d.hp0)*100));const al=d.alleati_oggi||[];const m=+d.molt||1;
  const top=(d.top||[]).map((x,i)=>`<li class="${x.io?'io':''}"><b>${i+1}.</b> @${esc(x.nick)}${x.alleato?' 🤝':''}<span>💥 ${x.danno}</span></li>`).join('');
  openSheet('👹 Boss della settimana',`<div class="bossbox ${d.caduto?'morto':''}"><span class="bossic">${d.caduto?'💀':d.ic}</span><b>${esc(d.nome)}</b>
      <div class="bosshp"><span style="width:${pc}%"></span><i>${d.caduto?'ABBATTUTO':`❤️ ${d.hp} / ${d.hp0}`}</i></div>
      <small>${d.caduto?'Il prossimo arriva lunedì':`Se ne va fra ${bossGiorni(d.end_at)} · ${d.giocatori||0} superstiti l’hanno colpito`}</small></div>
    <p style="font-weight:400;font-size:13.5px">È uno solo per tutta la zona (circa 25 km). Ognuno lo colpisce <b>fino a 3 volte al giorno</b>: quando cade, <b>premi a tutti</b> quelli che l’hanno colpito (più danno, più premi) e 🧱 ai primi 3.</p>
    <div class="bossins ${al.length?'on':''}">🤝 <b>Insieme fate più male</b>: ${al.length?`oggi l’hanno colpito ${al.map(n=>'@'+esc(n)).join(', ')} → il tuo colpo vale <b>×${String(m).replace('.',',')}</b>`:'ogni alleato che lo colpisce oggi rende il tuo colpo più forte (+25%, fino a ×2). Avvisali!'}</div>
    ${d.caduto?'':`<button class="btn wide" data-bossgo ${d.oggi>=d.max?'disabled':''}>⚔️ Attacca (1 energia) · ${Math.max(0,d.max-d.oggi)} su ${d.max} oggi</button>`}
    ${d.mio?`<p class="muted" style="font-size:12.5px;text-align:center">Il tuo danno questa settimana: 💥 ${d.mio}</p>`:''}
    ${top?`<h4 style="margin:12px 0 4px">🏆 Chi l’ha colpito di più</h4><ol class="bosstop">${top}</ol>`:''}
    ${typeof alzMenu==='function'?'<button class="btn wide ghost" data-bossal>📣 Avvisa i miei alleati</button>':''}`,c=>{
    const g=c.querySelector('[data-bossgo]');if(g)g.onclick=()=>{closeSheet();bossFight();};
    const a=c.querySelector('[data-bossal]');if(a)a.onclick=()=>{closeSheet();try{alzMenu();}catch(e){}toast('👹 Scrivi nella chat dell’alleanza: “Attacchiamo il boss!”');};});}
async function bossFight(){if(BOSS.f)return;let d=null;try{const{data,error}=await SB.rpc('world_boss_inizia');if(error)throw error;d=data;}catch(e){toast('👹 Il boss arriva dopo l’aggiornamento del server (blocco SQL 026)');return;}
  if(!d.ok){toast('👹 '+d.msg);return;}
  const F=BOSS.f={id:d.id,colpi:0,t0:performance.now(),dur:(d.durata||20)*1000,weak:[],nextW:0,atk:null,nextAtk:4,fine:false,raf:0,hp:d.hp,hp0:d.hp0};
  document.body.insertAdjacentHTML('beforeend',`<div id="bossf" class="zmfight bossf"><div class="zmfbar"><b>${d.ic} ${esc(d.nome)}</b><small>×${String(d.molt).replace('.',',')}</small><div class="zmhp"><span style="width:${Math.round(d.hp/Math.max(1,d.hp0)*100)}%"></span></div><span class="bosst"></span></div>
    <div class="zmbody"><span class="zmbig">${d.ic}</span></div><div class="zmatk" hidden><b></b><div><button data-zmd="l">⬅️</button><button data-zmd="r">➡️</button></div></div>
    <p class="zmtip">Tocca più <b>cerchi gialli</b> che puoi! Quando ruggisce, schiva con la freccia giusta o perdi 3 colpi.</p></div>`);
  const b=document.getElementById('bossf');b.querySelectorAll('[data-zmd]').forEach(x=>x.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();bossDodge(x.dataset.zmd);}));
  try{sfx&&sfx('zombie');}catch(e){}F.raf=requestAnimationFrame(bossLoop);}
function bossLoop(now){const F=BOSS.f;if(!F||F.fine)return;const b=document.getElementById('bossf');if(!b){F.fine=true;return;}const t=(now-F.t0)/1000;const body=b.querySelector('.zmbody');
  b.querySelector('.zmbig').style.transform=`translate(${Math.sin(t*1.3)*16}px,${Math.sin(t*2.6)*6}px) rotate(${Math.sin(t*1.9)*4}deg)`;
  b.querySelector('.bosst').textContent=`⏱️ ${Math.max(0,Math.ceil(F.dur/1000-t))} s · 💥 ${F.colpi}`;
  if(!F.atk&&F.weak.length<2&&t>=F.nextW){const w=document.createElement('button');w.type='button';w.className='zmweak';w.style.left=(15+Math.random()*70)+'%';w.style.top=(12+Math.random()*66)+'%';body.appendChild(w);
    const o={el:w,t};F.weak.push(o);F.nextW=t+.35;
    w.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(!F.weak.includes(o)||F.fine)return;w.remove();F.weak=F.weak.filter(x=>x!==o);F.colpi++;
      const big=b.querySelector('.zmbig');big.classList.remove('hit');void big.offsetWidth;big.classList.add('hit');try{sfx&&sfx('click');}catch(x){}});}
  F.weak=F.weak.filter(o=>{if(t-o.t>1.1){o.el.remove();return false;}return true;});
  if(!F.atk&&t>=F.nextAtk&&t<F.dur/1000-1.5){F.weak.forEach(o=>o.el.remove());F.weak=[];F.atk={dir:Math.random()<.5?'l':'r',t};const a=b.querySelector('.zmatk');a.hidden=false;
    a.querySelector('b').textContent=`⚠️ Ruggisce da ${F.atk.dir==='l'?'destra: schiva a ⬅️ SINISTRA':'sinistra: schiva a ➡️ DESTRA'}!`;b.classList.add('allarme');}
  if(F.atk&&t-F.atk.t>1.2)bossColpito();
  if(t>=F.dur/1000){bossEnd();return;}
  F.raf=requestAnimationFrame(bossLoop);}
function bossAtkEnd(){const F=BOSS.f;const t=(performance.now()-F.t0)/1000;F.atk=null;F.nextAtk=t+4+Math.random()*2;F.nextW=t+.2;const b=document.getElementById('bossf');if(b){b.querySelector('.zmatk').hidden=true;b.classList.remove('allarme');}}
function bossDodge(dir){const F=BOSS.f;if(!F||!F.atk)return;if(dir===F.atk.dir){toast('💨 Schivato!');bossAtkEnd();}else bossColpito();}
function bossColpito(){const F=BOSS.f;F.colpi=Math.max(0,F.colpi-3);try{navigator.vibrate&&navigator.vibrate(150);}catch(e){}toast('💥 Ti ha colpito: −3 colpi');bossAtkEnd();}
async function bossEnd(){const F=BOSS.f;if(!F||F.fine)return;F.fine=true;cancelAnimationFrame(F.raf);let r=null;
  try{const{data,error}=await SB.rpc('world_boss_fine',{p_id:F.id,p_colpi:F.colpi});if(error)throw error;r=data;}catch(e){}
  BOSS.t=0;try{supLoad(true);RES.t=0;resLoad(true);}catch(e){}const b=document.getElementById('bossf');if(!b){BOSS.f=null;return;}
  b.innerHTML=`<div class="difres"><b>${r&&r.caduto?'💀 L’avete abbattuto!':`💥 Danno ${r&&r.ok?r.danno:0}`}</b>${r&&r.ok?`<span>${F.colpi} colpi${r.caduto?' · premi a tutti quelli che l’hanno colpito!':` · vita del boss ${r.hp}/${r.hp0}`}</span>`:'<span>Non riesco a parlare col server: riprova</span>'}
    <div><button class="btn small" data-bossok>👍 Continua</button></div></div>`;try{sfx&&sfx(r&&r.caduto?'win':'click');}catch(e){}
  b.querySelector('[data-bossok]').onclick=()=>{b.remove();BOSS.f=null;bossSheet();};}
/* 🧭 guida e ADESSO */
function bossGdItems(I){const d=BOSS.d;if(!d||!d.ok||d.caduto||d.oggi>=d.max)return;const pc=Math.round(d.hp/Math.max(1,d.hp0)*100);
  I.push({p:(d.alleati_oggi||[]).length?84:46,ic:d.ic,t:`Boss della settimana: ${esc(d.nome)} (${pc}% di vita)`,why:(d.alleati_oggi||[]).length?`I tuoi alleati l’hanno già colpito oggi: il tuo colpo vale ×${String(d.molt).replace('.',',')}.`:'Uno per tutta la zona: quando cade, premi a tutti quelli che l’hanno colpito.',cost:'1 energia',
    acts:[{b:'⚔️ Attacca',run:async()=>{bossFight();return{skip:1};}},{b:'Dettagli',run:async()=>{bossSheet();return{skip:1};}}]});}
const _gdItemsBoss=gdItems;gdItems=function(){const I=_gdItemsBoss.apply(this,arguments);try{bossGdItems(I);I.sort((a,b)=>b.p-a.p);}catch(e){}return I;};
const _zGoBoss=zGoUrl;zGoUrl=function(u){_zGoBoss(u);try{if(new URL(u,location.href).searchParams.get('boss'))setTimeout(bossSheet,1500);}catch(e){}};
zEvery(()=>{try{if(!document.hidden&&S.user&&S.tab==='mappa')bossLoad();}catch(e){}},30000,'boss');
</script>
