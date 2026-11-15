<script>
/* =========================================================
   🔫 CACCIA AGLI ZOMBIE NELLA LENTE (migrazione 021, richiesta di Alessandro 15/11)
   Nella Lente il pulsante "🔫 Caccia · ⚡1" fa partire un'ondata di 3–6 zombie (di più salendo di grado) che arrivano
   da direzioni diverse intorno a te: girati col telefono (o trascina il dito) e toccali prima che ti raggiungano.
   🧟 lento (2 colpi), 🏃 corridore (2 colpi, veloce), 💪 bruto (4 colpi, lento). Un'🪓 arma di livello 2+ colpisce doppio.
   Il server decide gli zombie (world_caccia_inizia) e i premi (world_caccia_fine: ⭐ 5 a zombie, ⭐ 10 se li prendi
   tutti, una scorta da ognuno), controllando i tempi; massimo 10 cacce al giorno.
   ========================================================= */
const CAC={on:false,id:null,Z:[],t0:0,raf:0,head0:0,danno:1,uccisi:0,persi:0,fine:false};
const CAC_K={lento:['🧟',14000,'lento'],corridore:['🧟‍♂️',8000,'corridore'],bruto:['🧟‍♀️',19000,'bruto']};
const cacHead=()=>{const L=LENTE;return((L.h==null?0:L.h)+L.man+360)%360;};
/* il pulsante nella Lente */
const _lenteOpenCac=lenteOpen;lenteOpen=async function(){const r=_lenteOpenCac.apply(this,arguments);try{cacBtn();}catch(e){}return r;};
function cacBtn(){const L=LENTE;if(!L.root||L.root.querySelector('[data-cacgo]'))return;const bot=L.root.querySelector('.lnbot');if(!bot)return;
  bot.insertAdjacentHTML('beforeend','<button class="lncac" data-cacgo type="button">🔫 Caccia · ⚡1</button>');
  bot.querySelector('[data-cacgo]').onclick=e=>{e.stopPropagation();cacStart();};}
async function cacStart(){const L=LENTE;if(CAC.on||!L.root)return;if(!S.user){toast('Accedi per cacciare gli zombie');return;}
  const b=L.root.querySelector('[data-cacgo]');if(b)b.disabled=true;let d=null;
  try{const{data,error}=await SB.rpc('world_caccia_inizia');if(error)throw error;d=data;}catch(e){toast('🔫 La caccia arriva dopo l’aggiornamento del server (blocco SQL 021)');}
  if(b)b.disabled=false;if(!d)return;if(!d.ok){toast('🔫 '+d.msg);return;}
  Object.assign(CAC,{on:true,id:d.id,t0:performance.now(),head0:cacHead(),danno:d.danno||1,uccisi:0,persi:0,fine:false,rimaste:d.rimaste});
  let box=L.root.querySelector('.lncz');if(!box){box=document.createElement('div');box.className='lncz';L.root.appendChild(box);}box.innerHTML='<div class="lncbar"><b>🔫 Caccia</b><span data-cacn></span></div><div class="lncedge l">◀</div><div class="lncedge r">▶</div>';
  CAC.Z=(d.zombie||[]).map((z,i)=>{const K=CAC_K[z.k]||CAC_K.lento;const el=document.createElement('button');el.type='button';el.className='lncz1 k-'+z.k;
    el.innerHTML=`<span>${K[0]}</span><i>${'❤'.repeat(z.hp)}</i>`;el.style.display='none';box.appendChild(el);
    const o={k:z.k,hp:z.hp,hp0:z.hp,bear:(CAC.head0+(+z.b||0)+360)%360,dt:(+z.dt||0)*1000,dur:K[1],el,st:'att'};
    el.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();cacHit(o);});return o;});
  L.root.classList.add('caccia');try{sfx&&sfx('zombie');}catch(e){}cacLoop();}
function cacHit(o){if(o.st!=='via')return;o.hp-=CAC.danno;o.el.classList.remove('hit');void o.el.offsetWidth;o.el.classList.add('hit');try{sfx&&sfx('click');}catch(e){}
  if(o.hp<=0){o.st='morto';CAC.uccisi++;o.el.innerHTML='<span>💥</span><i>⭐+5</i>';o.el.classList.add('morto');setTimeout(()=>{o.el.style.display='none';},700);}
  else o.el.querySelector('i').textContent='❤'.repeat(Math.max(0,o.hp));}
function cacLoop(){const L=LENTE;if(!CAC.on)return;if(!L.on){CAC.on=false;cacEnd();return;}CAC.raf=requestAnimationFrame(cacLoop);
  const now=performance.now()-CAC.t0;const W=L.root.clientWidth,H=L.root.clientHeight;const head=cacHead();const hor=H*.52-((L.beta||90)-90)/LN_VFOV*H;let sx=false,dx=false;
  CAC.Z.forEach(o=>{if(o.st==='att'&&now>=o.dt){o.st='via';o.ts=now;o.el.style.display='';}
    if(o.st!=='via')return;const f=Math.min(1,(now-o.ts)/o.dur);if(f>=1){o.st='perso';CAC.persi++;o.el.style.display='none';L.root.classList.remove('graffio');void L.root.offsetWidth;L.root.classList.add('graffio');try{navigator.vibrate&&navigator.vibrate(120);}catch(e){}return;}
    const rel=((o.bear-head+540)%360)-180;const vis=Math.abs(rel)<=LN_HFOV/2+6;if(!vis){if(rel<0)sx=true;else dx=true;o.el.style.visibility='hidden';return;}o.el.style.visibility='';
    const s=.45+f*1.5,wob=Math.sin((now+o.dt)/150)*5;const X=W/2+rel/LN_HFOV*W,Y=hor-20+f*H*.3+wob;
    o.el.style.transform=`translate(${Math.round(X-40)}px,${Math.round(Y-40)}px) scale(${s.toFixed(2)})`;});
  const el=L.root.querySelector('.lncedge.l'),er=L.root.querySelector('.lncedge.r');if(el)el.style.display=sx?'':'none';if(er)er.style.display=dx?'':'none';
  const n=L.root.querySelector('[data-cacn]');const rest=CAC.Z.filter(o=>o.st==='att'||o.st==='via').length;if(n)n.textContent=`💥 ${CAC.uccisi} · 🧟 ${rest}${sx||dx?' · girati '+(sx?'◀':'')+(dx?'▶':''):''}`;
  if(!rest){CAC.on=false;cancelAnimationFrame(CAC.raf);setTimeout(cacEnd,600);}}
async function cacEnd(){if(CAC.fine)return;CAC.fine=true;const L=LENTE;let r=null;
  try{const{data,error}=await SB.rpc('world_caccia_fine',{p_id:CAC.id,p_uccisi:CAC.uccisi});if(error)throw error;r=data;}catch(e){}
  try{RES.t=0;resLoad(true);}catch(e){}try{supLoad(true);}catch(e){}
  if(!L.root){if(r&&r.ok)toast(`🔫 Caccia: ${r.uccisi}/${r.n} · ⭐ +${r.xp}`);return;}L.root.classList.remove('caccia');const box=L.root.querySelector('.lncz');if(!box)return;
  const g=r&&r.ok?[r.legno?'🪵 +'+r.legno:'',r.cibo?'🥫 +'+r.cibo:'',r.carb?'⛽ +'+r.carb:''].filter(Boolean).join(' '):'';
  box.innerHTML=`<div class="lncres"><b>${r&&r.ok?(r.tutti?'🏆 Presi tutti!':`💥 ${r.uccisi} su ${r.n}`):'Caccia finita'}</b>${r&&r.ok?`<span>⭐ +${r.xp}${g?' · '+g:''}</span>`:'<span>Non riesco a parlare col server: riprova</span>'}
    ${r&&r.salito?`<span>🎖️ Sei salito al grado ${r.grado}!</span>`:''}<div><button class="btn small" data-cacagain>🔫 Ancora · ⚡1</button><button class="btn small ghost" data-cacok>Fatto</button></div></div>`;
  box.querySelector('[data-cacagain]').onclick=e=>{e.stopPropagation();box.remove();cacStart();};box.querySelector('[data-cacok]').onclick=e=>{e.stopPropagation();box.remove();};}
const _lenteCloseCac=lenteClose;lenteClose=function(){if(CAC.on){CAC.on=false;cancelAnimationFrame(CAC.raf);cacEnd();}return _lenteCloseCac.apply(this,arguments);};
</script>
