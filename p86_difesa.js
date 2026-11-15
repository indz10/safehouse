<script>
/* =========================================================
   🎮 DIFENDI LA CASA (migrazione 023, richiesta di Alessandro 15/11): il minigioco sempre disponibile
   Partita da 45 secondi: gli zombie arrivano da ogni lato verso la tua casa e tu li tocchi per fermarli.
   Vite = livello vero della casa + 2 (max 8; 🛡️ scudo +2). 💣 bomba = spazza via tutti gli zombie sullo schermo.
   Costa ⚡ 1 (la prima del giorno è gratis); premi decisi dal server (world_difesa_inizia / _bomba / _fine):
   ⭐ 2 a zombie, una scorta ogni 2 zombie, se la casa resiste ⭐ 15 e 🧱 5.
   🛒 In Bottega (gameShopFill, chiamato da shopSheet in p31): ⚡ +5, 💣 bomba, 🛡️ scudo, pagati in 🧱 Mattoni.
   Si apre da "🎮 Gioca" sulla mappa, dalla carta ADESSO/guida, dal menu ☰ e dalla scheda del superstite.
   ========================================================= */
const DIF={on:false,id:null,Z:[],raf:0,t0:0,dur:45,vite:3,vite0:3,uccisi:0,bombe:0,next:0,ex:null,exT:0,fine:false};
const DIF_Z=[['🧟',1,1],['🧟‍♂️',1,1.35],['🧟‍♀️',2,.8]];
async function difExtra(force){if(!S.user||typeof SB==='undefined'||!SB)return DIF.ex;if(!force&&DIF.ex&&Date.now()-DIF.exT<60000)return DIF.ex;DIF.exT=Date.now();
  try{const{data,error}=await SB.rpc('world_sup_extra');if(!error&&data&&data.ok)DIF.ex=data;}catch(e){}return DIF.ex;}
function difRoot(){let r=document.getElementById('difesa');if(!r){r=document.createElement('div');r.id='difesa';document.body.appendChild(r);document.documentElement.classList.add('difesa-on');}return r;}
function difClose(){DIF.on=false;cancelAnimationFrame(DIF.raf);const r=document.getElementById('difesa');if(r)r.remove();document.documentElement.classList.remove('difesa-on');}
/* ---------- la schermata d'inizio ---------- */
async function difOpen(){if(!S.user){toast('Accedi per giocare');try{loginSheet();}catch(e){}return;}try{closeSheet();}catch(e){}try{zmClose();}catch(e){}
  const r=difRoot();r.innerHTML='<div class="difstart"><p><span class="spin"></span></p></div>';const x=await difExtra(true);const d=SUP.d||{};let lv=1;try{const h=myHouses().find(z=>z.home);lv=h&&h.level||1;}catch(e){}
  const gratis=x&&x.partite===0;
  r.innerHTML=`<div class="difstart"><button class="difx" data-difx aria-label="Chiudi">✕</button>
    <div class="difhero">🏠<span>🧟</span><span>🧟‍♀️</span><span>🧟‍♂️</span></div>
    <b class="disp">Difendi la casa</b>
    <p>Gli zombie arrivano da tutte le parti verso la tua casa: <b>toccali</b> prima che arrivino. Quelli grossi vogliono 2 colpi. Resisti <b>45 secondi</b>!</p>
    <div class="difinfo"><span>❤️ ${Math.min(8,lv+2)} vite (casa livello ${lv})</span><span>⚡ ${x?x.energia:(d.energia??'?')}</span><span>💣 ${x?x.bombe:0}</span><span>🛡️ ${x?x.scudi:0}</span>${x&&x.record?`<span>🏆 record ${x.record}</span>`:''}</div>
    <p class="muted" style="font-size:12.5px">Premi: ⭐ 2 a zombie, una scorta ogni 2 zombie; se la casa resiste ⭐ 15 e 🧱 5. ${x?`Oggi ${x.partite}/15 partite.`:''}</p>
    ${x&&x.scudi?'<label class="difsc"><input type="checkbox" id="difScudo"> 🛡️ Usa uno scudo (+2 vite)</label>':''}
    <button class="btn wide" data-difgo>▶️ Gioca ${gratis?'· gratis oggi':'· ⚡ 1'}</button>
    <button class="btn wide ghost" data-difshop>🛒 Bottega: ⚡ energia, 💣 bombe, 🛡️ scudi</button></div>`;
  r.querySelector('[data-difx]').onclick=difClose;r.querySelector('[data-difshop]').onclick=()=>{difClose();shopSheet(0);};
  r.querySelector('[data-difgo]').onclick=e=>{e.target.disabled=true;difStart(!!(r.querySelector('#difScudo')||{}).checked);};}
/* ---------- la partita ---------- */
async function difStart(scudo){const r=difRoot();let d=null;try{const{data,error}=await SB.rpc('world_difesa_inizia',{p_scudo:scudo});if(error)throw error;d=data;}catch(e){toast('🎮 Il gioco arriva dopo l’aggiornamento del server (blocco SQL 023)');difClose();return;}
  if(!d.ok){toast('🎮 '+d.msg);difOpen();return;}
  Object.assign(DIF,{on:true,id:d.id,Z:[],t0:performance.now(),dur:d.durata||45,vite:d.vite,vite0:d.vite,uccisi:0,bombe:d.bombe||0,next:0,vel:d.velocita||1,fine:false,last:0});
  r.innerHTML=`<div class="difbar"><span class="difv"></span><b class="dift"></b><span class="difk">💥 0</span></div><div class="difarena"><div class="difcasa">🏠</div></div>
    <button class="difbomb" data-difbomb ${DIF.bombe?'':'disabled'}>💣 ${DIF.bombe}</button>`;
  r.querySelector('[data-difbomb]').onclick=difBomb;difPaint();DIF.raf=requestAnimationFrame(difLoop);try{sfx&&sfx('zombie');}catch(e){}}
function difPaint(){const r=document.getElementById('difesa');if(!r)return;const v=r.querySelector('.difv');if(v)v.textContent='❤️'.repeat(Math.max(0,DIF.vite))+'🖤'.repeat(Math.max(0,DIF.vite0-DIF.vite));
  const k=r.querySelector('.difk');if(k)k.textContent='💥 '+DIF.uccisi;const b=r.querySelector('[data-difbomb]');if(b){b.textContent='💣 '+DIF.bombe;b.disabled=!DIF.bombe;}}
function difSpawn(A){const W=A.clientWidth,H=A.clientHeight;const side=Math.floor(Math.random()*4);const el=document.createElement('button');el.type='button';
  const t=(performance.now()-DIF.t0)/1000;const big=t>12&&Math.random()<.25,fast=!big&&t>6&&Math.random()<.3;const K=big?DIF_Z[2]:fast?DIF_Z[1]:DIF_Z[0];
  el.className='difz'+(big?' big':'');el.innerHTML=`<span>${K[0]}</span>`;A.appendChild(el);
  const x=side===0?Math.random()*W:side===1?W+20:side===2?Math.random()*W:-60,y=side===0?-60:side===1?Math.random()*H:side===2?H+20:Math.random()*H;
  const z={el,x,y,hp:K[1],v:(38+Math.random()*22)*K[2]*DIF.vel,dead:false};
  el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(z.dead||!DIF.on)return;z.hp--;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');try{sfx&&sfx('click');}catch(x){}
    if(z.hp<=0){z.dead=true;DIF.uccisi++;el.innerHTML='<span>💥</span>';el.classList.add('morto');setTimeout(()=>el.remove(),350);difPaint();}});
  DIF.Z.push(z);}
function difLoop(now){if(!DIF.on)return;const r=document.getElementById('difesa');if(!r){DIF.on=false;return;}const A=r.querySelector('.difarena');const W=A.clientWidth,H=A.clientHeight;
  const dt=Math.min(.05,(now-(DIF.last||now))/1000);DIF.last=now;const t=(now-DIF.t0)/1000;const left=Math.max(0,DIF.dur-t);
  r.querySelector('.dift').textContent='⏱ '+Math.ceil(left)+' s';
  /* sempre più zombie: da uno ogni 1,1 s a uno ogni 0,35 s */
  const gap=Math.max(.35,1.1-t*.018)/DIF.vel;if(t>=DIF.next){difSpawn(A);DIF.next=t+gap;}
  const cx=W/2,cy=H/2;DIF.Z.forEach(z=>{if(z.dead)return;const dx=cx-z.x-30,dy=cy-z.y-30,dd=Math.hypot(dx,dy);
    if(dd<34){z.dead=true;z.el.remove();DIF.vite--;r.classList.remove('colpo');void r.offsetWidth;r.classList.add('colpo');try{navigator.vibrate&&navigator.vibrate(90);}catch(e){}difPaint();return;}
    z.x+=dx/dd*z.v*dt;z.y+=dy/dd*z.v*dt;z.el.style.transform=`translate(${Math.round(z.x)}px,${Math.round(z.y)}px)`;});
  DIF.Z=DIF.Z.filter(z=>!z.dead||z.el.isConnected);
  if(DIF.vite<=0||left<=0){DIF.on=false;difEnd(DIF.vite>0);return;}DIF.raf=requestAnimationFrame(difLoop);}
async function difBomb(){if(!DIF.on||!DIF.bombe)return;const b=document.querySelector('[data-difbomb]');if(b)b.disabled=true;
  try{const{data,error}=await SB.rpc('world_difesa_bomba',{p_id:DIF.id});if(error||!data||!data.ok){toast('💣 '+((data&&data.msg)||'Non riuscito'));difPaint();return;}DIF.bombe=data.bombe;}catch(e){difPaint();return;}
  const r=document.getElementById('difesa');if(r){r.classList.remove('boom');void r.offsetWidth;r.classList.add('boom');}
  DIF.Z.forEach(z=>{if(z.dead)return;z.dead=true;DIF.uccisi++;z.el.innerHTML='<span>💥</span>';z.el.classList.add('morto');setTimeout(()=>z.el.remove(),350);});difPaint();}
async function difEnd(salva){if(DIF.fine)return;DIF.fine=true;cancelAnimationFrame(DIF.raf);let res=null;
  try{const{data,error}=await SB.rpc('world_difesa_fine',{p_id:DIF.id,p_uccisi:DIF.uccisi,p_resistita:salva});if(error)throw error;res=data;}catch(e){}
  RES.t=0;try{resLoad(true);supLoad(true);wMine(true);}catch(e){}DIF.exT=0;
  const r=document.getElementById('difesa');if(!r)return;const g=res&&res.ok?[res.legno?'🪵 +'+res.legno:'',res.cibo?'🥫 +'+res.cibo:'',res.carb?'⛽ +'+res.carb:'',res.mattoni?'🧱 +'+res.mattoni:''].filter(Boolean).join(' '):'';
  r.insertAdjacentHTML('beforeend',`<div class="difres"><b>${salva?'🏠 Casa salva!':'💀 Gli zombie sono entrati'}</b><span>💥 ${DIF.uccisi} zombie${res&&res.record?' · 🏆 nuovo record!':''}</span>
    ${res&&res.ok?`<span>⭐ +${res.xp}${g?' · '+g:''}</span>`:'<span>Non riesco a parlare col server: i premi arrivano dopo</span>'}${res&&res.salito?`<span>🎖️ Sei salito al grado ${res.grado}!</span>`:''}
    <div><button class="btn small" data-difagain>🔁 Ancora</button><button class="btn small ghost" data-difout>Esci</button></div></div>`);
  r.querySelector('[data-difagain]').onclick=difOpen;r.querySelector('[data-difout]').onclick=difClose;try{sfx&&sfx(salva?'win':'lose');}catch(e){}}
/* ---------- 🛒 Bottega ---------- */
async function gameShopFill(c){const box=c.querySelector('.gamebox');if(!box)return;if(!S.user||typeof SB==='undefined'||!SB){box.remove();return;}
  const x=await difExtra(true);const mt=typeof trrMat==='function'?trrMat():0;
  const IT=[['energia','⚡','Energia +5','per spedizioni, caccia ed eventi (2 al giorno)',60,x?`oggi ${x.energia_comprata}/2`:''],['bomba','💣','Bomba','spazza via tutti gli zombie in “Difendi la casa”',25,x?`ne hai ${x.bombe}/5`:''],['scudo','🛡️','Scudo','+2 vite in una partita di “Difendi la casa”',25,x?`ne hai ${x.scudi}/5`:'']];
  box.innerHTML=`<h4 class="hh">🎮 Per giocare (con i 🧱 Mattoni)</h4><div class="mktgrid">${IT.map(([k,ic,n,ds,c,st])=>`<div class="mktr"><span class="mki">${ic}</span><div><b>${n}</b><small>${ds}${st?' · '+st:''}</small></div><button class="btn small" data-gsh="${k}" ${mt<c?'disabled':''}>🧱 ${c}</button></div>`).join('')}</div>`;
  box.querySelectorAll('[data-gsh]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_bottega_compra',{p_item:b.dataset.gsh});if(error)throw error;toast(data.msg);if(data.ok){try{await wMine(true);supLoad(true);}catch(e){}}}catch(e){toast('Non riuscito');}gameShopFill(c);});}
/* ---------- nella guida (e quindi nella carta ADESSO quando non c'è niente di urgente) ---------- */
function difGdItems(I){if(!S.user)return;const x=DIF.ex;if(x&&x.partite>=15)return;const gr=!x||x.partite===0;
  I.push({p:gr?48:22,ic:'🎮',t:gr?'Difendi la casa: la prima partita di oggi è gratis':'Difendi la casa: 45 secondi contro gli zombie',why:'Tocca gli zombie prima che arrivino alla tua casa: esperienza, scorte e 🧱 se resisti.',gain:'⭐ 🪵 🥫 ⛽',acts:[{b:'▶️ Gioca',run:async()=>{difOpen();return{skip:1};}}]});}
zEvery(()=>{try{if(document.hidden||!S.user||!['mappa','orda','social'].includes(S.tab))return;if(Date.now()-DIF.exT>120000)difExtra();}catch(e){}},10000,'difesa');
</script>
