<script>
/* 🧟 ARENA (Fase 53, migrazione 046): ogni zombie del mondo vero si affronta 📍 di persona (Lente, entro 80 m + GPS)
   o 🎒 mandando il superstite (viaggio dalla casa scelta, col mezzo; notifica all'arrivo, 💎 accorciano solo il viaggio).
   Poi l'arena in orizzontale: muovi, colpisci, para, schiva, mossa speciale. Statistiche fissate all'inizio dal server. */
const ARN={miei:[],t:0,g:null,nascosti:new Set()};
const ARN_DIFF={facile:'🟢 Facile',equilibrato:'🟡 Equilibrato',difficile:'🔴 Difficile'};
function arnRidotti(){try{return localStorage.getItem('zsh_fx_ridotti')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
function arnStatRiga(s){return`<span class="arnst">❤️ ${s.vita}</span><span class="arnst">💪 ${s.forza}</span><span class="arnst">🛡️ ${s.difesa}</span><span class="arnst">💨 ${s.agilita}</span>`;}
function arnT(sec){sec=Math.max(0,Math.round(sec));return sec>=3600?`${Math.floor(sec/3600)} h ${Math.round(sec%3600/60)} min`:sec>=60?`${Math.ceil(sec/60)} min`:`${sec} s`;}
// scheda dell'incontro: difficoltà, statistiche, di persona o col superstite
async function arnCard(z){if(!S.user){toast('Accedi per combattere');return;}let d=null;
  try{const{data,error}=await SB.rpc('world_scontro_info',{p_zid:z.id});if(error)throw error;d=data;}catch(e){toast('🧟 L’arena arriva dopo l’aggiornamento del server (blocco SQL 046)');return;}
  if(!d||!d.ok){toast((d&&d.msg)||'Zombie sparito');return;}
  const sc=d.scontro;const p=zmPos();const acc=(typeof LENTE!=='undefined'&&LENTE.on&&LENTE.acc)?LENTE.acc:(p&&p.acc)||0;const c=d.cfg||{};
  const lim=(+c.dist_m||80)+Math.min(Math.max(acc||0,0),+c.acc_max_m||50);const dist=p?Math.round(trM(p.lat,p.lon,z.lat,z.lon)):null;
  let diff=localStorage.getItem('zsh_arn_diff')||'equilibrato';if(!d.livelli[diff])diff='equilibrato';const v=d.viaggio||{};const L0=d.livelli.equilibrato;
  const body=()=>{const zs=d.livelli[diff];
    if(sc)return`<div class="arnzc"><b class="arnzic">${L0.ic}</b><div><b>${esc(L0.nome)}</b><small>${ARN_DIFF[sc.diff]||''}</small></div></div>`+
      (sc.stato==='viaggio'?`<p>🎒 Il superstite è in viaggio: arriva fra <b data-arnleft>${arnT(sc.secondi)}</b>. Ti mando una notifica.</p><button class="btn wide ghost" data-arnsub>💎 ${gemCosto(sc.arrivo)} · Arriva subito</button><p class="muted" style="font-size:12px">Le gemme accorciano solo il viaggio: lo scontro lo vinci tu.</p>`
       :`<p>Lo zombie ti aspetta${sc.modo==='superstite'?' (fino a '+new Date(sc.scade).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+')':''}.</p><button class="btn wide" data-arnvai="${sc.id}">⚔️ Combatti ora</button>`);
    return`<div class="arnzc"><b class="arnzic">${zs.ic}</b><div><b>${esc(zs.nome)} · Lv ${zs.livello}</b><small>${ZM_RAR[zs.rar]||''}</small><div>${arnStatRiga(zs)}</div></div></div>
    <div class="arndiff">${Object.keys(ARN_DIFF).map(k=>`<button class="${k===diff?'on':''}" data-arnd="${k}">${ARN_DIFF[k]}<small>Lv ${d.livelli[k].livello}</small></button>`).join('')}</div>
    <div class="arnio">${svAvatar((SV.d&&SV.d.avatar)||{},false)}<div><b>Tu · grado ${d.io.grado}</b><div>${arnStatRiga(d.io)}</div></div></div>
    <h4 style="margin:12px 0 4px">📍 Di persona</h4>${dist!=null&&dist<=lim?`<button class="btn wide" data-arnp>⚔️ Combatti qui · 🔋 1</button>`
      :`<p class="muted" style="margin:2px 0 6px">Sei a ${dist!=null?dist+' m':'?'}: serve meno di ${Math.round(lim)} m (80 m + precisione del GPS). Gratis a parte 🔋 1.</p>${typeof LENTE!=='undefined'&&LENTE.on?'':'<button class="btn wide ghost" data-arnlente>📷 Apri la Lente e avvicinati</button>'}`}
    <h4 style="margin:12px 0 4px">🎒 Manda il superstite</h4>${v.km!=null?`<p class="arnvia">${esc(v.mezzo_nome||'')} · ${String(v.km).replace('.',',')} km · ⏱️ ${v.min} min · 🥫 ${v.cibo}${v.carb?' · ⛽ '+v.carb:''}${v.energia?' · 🔋 '+v.energia:''}</p>`:''}
    ${v.ok?`<button class="btn wide ghost" data-arns>🎒 Manda il superstite</button><p class="muted" style="font-size:12px">All’arrivo ti avviso e lo zombie ti aspetta 30 minuti; poi combatti tu nell’arena.</p>`:`<p class="muted">${esc(v.msg||(v.km!=null?`È a ${v.km} km: il raggio del superstite è ${v.raggio} km`:'Non raggiungibile'))}</p>`}`;};
  const bind=cc=>{const r=()=>{cc.querySelector('.arncard').innerHTML=body();bind(cc);};
    cc.querySelectorAll('[data-arnd]').forEach(b=>b.onclick=()=>{diff=b.dataset.arnd;try{localStorage.setItem('zsh_arn_diff',diff);}catch(e){}r();});
    const P=cc.querySelector('[data-arnp]');if(P)P.onclick=()=>arnParti(z,'persona',diff,P);
    const M=cc.querySelector('[data-arns]');if(M)M.onclick=()=>arnParti(z,'superstite',diff,M);
    const Ln=cc.querySelector('[data-arnlente]');if(Ln)Ln.onclick=()=>{closeSheet();lenteOpen();};
    const V=cc.querySelector('[data-arnvai]');if(V)V.onclick=()=>{closeSheet();arnVai(+V.dataset.arnvai,L0.ic);};
    const G=cc.querySelector('[data-arnsub]');if(G)G.onclick=()=>arnSubito(sc.id,sc.arrivo);};
  const apri=()=>openSheet(`🧟 Incontro`,`<div class="arncard">${body()}</div>`,bind);
  if(typeof LENTE!=='undefined'&&LENTE.on)lnSheet(apri);else apri();}
async function arnParti(z,modo,diff,btn){btn.disabled=true;const p=zmPos();const acc=(typeof LENTE!=='undefined'&&LENTE.on&&LENTE.acc)||(p&&p.acc)||0;let r=null;
  try{const{data,error}=await SB.rpc('world_scontro_parti',{p_zid:z.id,p_modo:modo,p_diff:diff,p_lat:p?p.lat:null,p_lon:p?p.lon:null,p_acc:acc});if(error)throw error;r=data;}catch(e){toast('Non riuscito: riprova');}
  btn.disabled=false;if(!r)return;if(!r.ok){toast(r.msg);return;}
  if(modo==='persona'){closeSheet();arnVai(r.id,(ZM_T[z.tipo]||['🧟'])[0]);}else{toast(r.msg);closeSheet();arnMiei(true);}}
async function arnSubito(id,arrivo){await gemLoad();const costo=gemCosto(arrivo);const s=(GEM.d&&GEM.d.gemme)||0;
  if(s<costo){if(confirm(`Servono 💎 ${costo}, ne hai ${s}. Aprire il negozio delle gemme?`))gemSheet();return;}
  if(!confirm(`Far arrivare subito il superstite per 💎 ${costo}?\nTi resteranno 💎 ${s-costo}.\nLo scontro lo combatti tu.`))return;
  let r=null;try{const{data,error}=await SB.rpc('world_scontro_subito',{p_id:id,p_costo_visto:costo});if(error)throw error;r=data;}catch(e){toast('Non riuscito: riprova');return;}
  if(!r.ok&&r.cambiato&&confirm(`Il costo ora è 💎 ${r.costo}. Confermi?`)){try{const{data}=await SB.rpc('world_scontro_subito',{p_id:id,p_costo_visto:r.costo});r=data;}catch(e){}}
  toast(r.msg);if(r.ok){closeSheet();gemLoad();await arnMiei(true);}}
// passaggio all'arena: lampo e zoom (ridotto se l'utente preferisce meno effetti)
function arnFx(ic,fn){const rid=arnRidotti();document.body.insertAdjacentHTML('beforeend',`<div class="arnfx ${rid?'rid':''}"><b>${ic||'🧟'}</b></div>`);
  const el=document.querySelector('.arnfx');try{sfx&&sfx('zombie');}catch(e){}setTimeout(()=>{el.remove();fn();},rid?180:700);}
async function arnVai(id,ic){let d=null;try{const{data,error}=await SB.rpc('world_scontro_inizia',{p_id:id});if(error)throw error;d=data;}catch(e){toast('Non riuscito: riprova');return;}
  if(!d.ok){toast(d.msg);return;}arnFx(ic||d.zombie.ic,()=>arnApri(d));}
/* ---------- l'arena ---------- */
const ARN_W=100;
function arnApri(d){try{if(typeof LENTE!=='undefined'&&LENTE.on)lenteClose();}catch(e){}
  const io=d.io,zz=d.zombie,av=d.avatar||{};const g=ARN.g={d,id:d.id,diff:d.diff,px:22,zx:78,php:io.vita,php0:io.vita,zhp:zz.vita,zhp0:zz.vita,colpi:0,t0:performance.now(),last:performance.now(),
    k:{l:0,r:0,blk:0},atkCd:0,dodCd:0,spCd:0,inv:0,zst:'avanza',zt:0,fine:false,raf:0,pic:SV_V[av.v||0]||'🧑',zic:zz.ic,shake:0,
    vel:28+io.agilita*1.4,zvel:10+zz.agilita*1.3,wind:{facile:.95,equilibrato:.75,difficile:.55}[d.diff]||.75,rip:{facile:1.15,equilibrato:.9,difficile:.7}[d.diff]||.9,via:false};
  document.body.insertAdjacentHTML('beforeend',`<div id="arena" class="${arnRidotti()?'rid':''}" role="dialog" aria-label="Arena">
    <div class="arntop"><div class="arnhp me"><b>${esc((SV.d&&SV.d.nome)||S.user.nick||'Tu')} · grado ${io.grado}</b><i><u data-arnhp="me"></u></i><small data-arnhpt="me">${io.vita}/${io.vita}</small></div>
      <button class="arnx" data-arnx aria-label="Scappa">✕</button>
      <div class="arnhp z"><b>${zz.ic} ${esc(zz.nome)} · Lv ${zz.livello}</b><i><u data-arnhp="z"></u></i><small data-arnhpt="z">${zz.vita}/${zz.vita}</small></div></div>
    <div class="arnfield"><canvas></canvas><div class="arnmsg" data-arnmsg>3</div></div>
    <div class="arnctl"><div class="arnpad"><button data-arnk="l" aria-label="Sinistra">◀</button><button data-arnk="r" aria-label="Destra">▶</button></div>
      <div class="arnpad dx"><button data-arnk="blk" aria-label="Para">🛡️<small>Para</small></button><button data-arnk="dod" aria-label="Schiva">💨<small>Schiva</small></button>
        <button class="big" data-arnk="atk" aria-label="Colpisci">👊<small>Colpisci</small></button><button data-arnk="sp" aria-label="Mossa speciale">⭐<small>Speciale</small><span class="cd" data-arncd></span></button></div></div>
    <div class="arnrot" data-arnrot><b>📱↻</b><p>Gira il telefono in orizzontale per combattere meglio</p><button class="btn small ghost" data-arnrotok>Gioca così</button></div></div>`);
  const A=document.getElementById('arena');g.A=A;g.cv=A.querySelector('canvas');g.ctx=g.cv.getContext('2d');
  try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{});}catch(e){}
  const rot=()=>{const r=A.querySelector('[data-arnrot]');if(r)r.classList.toggle('on',innerHeight>innerWidth&&!g.rotOk);arnSize();};g.rot=rot;addEventListener('resize',rot);rot();
  A.querySelector('[data-arnrotok]').onclick=()=>{g.rotOk=1;rot();};
  A.querySelector('[data-arnx]').onclick=()=>{if(g.fine)return;if(confirm('Scappare? Lo scontro conta come perso e non ricevi premi.'))arnFine('abbandonato');};
  A.querySelectorAll('[data-arnk]').forEach(b=>{const k=b.dataset.arnk;
    const giu=e=>{e.preventDefault();if(k==='l'||k==='r'||k==='blk')g.k[k]=1;else arnAzione(k);b.classList.add('pr');};
    const su=e=>{e.preventDefault();if(k==='l'||k==='r'||k==='blk')g.k[k]=0;b.classList.remove('pr');};
    b.addEventListener('pointerdown',giu);b.addEventListener('pointerup',su);b.addEventListener('pointerleave',su);b.addEventListener('pointercancel',su);});
  g.kd=e=>{const K=e.key.toLowerCase();const m={arrowleft:'l',a:'l',arrowright:'r',d:'r',k:'blk',x:'blk',arrowdown:'blk'};
    if(m[K]){g.k[m[K]]=1;e.preventDefault();return;}if(K==='j'||K==='z'||K==='arrowup')arnAzione('atk');else if(K==='l'||K==='c')arnAzione('dod');else if(K===' '||K==='u')arnAzione('sp');else if(K==='escape')A.querySelector('[data-arnx]').click();else return;e.preventDefault();};
  g.ku=e=>{const K=e.key.toLowerCase();const m={arrowleft:'l',a:'l',arrowright:'r',d:'r',k:'blk',x:'blk',arrowdown:'blk'};if(m[K])g.k[m[K]]=0;};
  addEventListener('keydown',g.kd);addEventListener('keyup',g.ku);
  arnBarre();let n=3;const msg=A.querySelector('[data-arnmsg]');const cd=setInterval(()=>{n--;if(g.fine){clearInterval(cd);return;}if(n>0)msg.textContent=n;else{clearInterval(cd);msg.textContent='VIA!';g.via=true;g.last=performance.now();g.t0=performance.now();setTimeout(()=>msg.textContent='',600);}},window.__arnVeloce?30:650);
  g.raf=requestAnimationFrame(arnLoop);}
function arnSize(){const g=ARN.g;if(!g)return;const c=g.cv,r=c.parentNode.getBoundingClientRect(),dp=Math.min(2,devicePixelRatio||1);c.width=Math.max(1,r.width*dp);c.height=Math.max(1,r.height*dp);c.style.width=r.width+'px';c.style.height=r.height+'px';}
// danno di un colpo come sul server (w_arena_danno): forza × 1,5 − difesa × 0,6, almeno 1
function arnDanno(f,d){return Math.max(1,Math.round(f*1.5-d*.6));}
function arnAzione(k){const g=ARN.g;if(!g||g.fine||!g.via)return;const dist=Math.abs(g.zx-g.px);
  if(k==='atk'){if(g.atkCd>0||g.k.blk)return;g.atkCd=Math.max(.3,.55-g.d.io.agilita*.01);g.swing=.15;if(dist<=14)arnColpo(1);}
  else if(k==='sp'){if(g.spCd>0||g.k.blk)return;g.spCd=8;g.swing=.3;g.spfx=.35;if(dist<=19)arnColpo(3);}
  else if(k==='dod'){if(g.dodCd>0)return;g.dodCd=Math.max(.7,1.3-g.d.io.agilita*.02);g.inv=.38;g.px=Math.max(4,Math.min(ARN_W-4,g.px+(g.px<g.zx?-18:18)));}}
function arnColpo(m){const g=ARN.g;const dn=Math.round(g.d.danno_io*m*(.9+Math.random()*.2));g.zhp=Math.max(0,g.zhp-dn);g.colpi++;g.zx=Math.min(ARN_W-4,g.zx+(g.zx>g.px?3*m:-3*m));
  if(g.zst==='carica'&&m>1){g.zst='riposo';g.zt=g.rip;}g.zflash=.15;arnNum(g.zx,'−'+dn,m>1?'sp':'');try{sfx&&sfx(m>1?'boom':'tap');}catch(e){}arnBarre();if(g.zhp<=0)arnFine('vinto');}
function arnNum(x,t,cl){const g=ARN.g;const f=g.A.querySelector('.arnfield');const s=document.createElement('span');s.className='arnnum '+(cl||'');s.textContent=t;s.style.left=(x/ARN_W*100)+'%';f.appendChild(s);setTimeout(()=>s.remove(),800);}
function arnBarre(){const g=ARN.g;if(!g)return;const A=g.A;const set=(k,v,v0)=>{const u=A.querySelector(`[data-arnhp="${k}"]`);if(u)u.style.width=Math.max(0,v/v0*100)+'%';const t=A.querySelector(`[data-arnhpt="${k}"]`);if(t)t.textContent=`${Math.max(0,Math.round(v))}/${v0}`;};
  set('me',g.php,g.php0);set('z',g.zhp,g.zhp0);}
function arnLoop(now){const g=ARN.g;if(!g||g.fine)return;const dt=Math.min(.05,(now-g.last)/1000);g.last=now;
  if(g.via){const blk=g.k.blk;if(!blk){if(g.k.l)g.px-=g.vel*dt;if(g.k.r)g.px+=g.vel*dt;}g.px=Math.max(4,Math.min(ARN_W-4,g.px));
    ['atkCd','dodCd','spCd','inv','swing','zflash','spfx','pflash','shake'].forEach(k=>{if(g[k]>0)g[k]=Math.max(0,g[k]-dt);});
    // intelligenza dello zombie: avanza, carica il colpo (si vede), colpisce, riprende fiato
    const dist=Math.abs(g.zx-g.px);const dir=g.px<g.zx?-1:1;
    if(g.zst==='avanza'){if(dist>10)g.zx+=dir*g.zvel*dt;else{g.zst='carica';g.zt=g.wind;}}
    else if(g.zst==='carica'){g.zt-=dt;if(g.zt<=0){g.zst='riposo';g.zt=g.rip;if(Math.abs(g.zx-g.px)<=13&&g.inv<=0){let dn=Math.round(g.d.danno_z*(.9+Math.random()*.2));if(g.k.blk)dn=Math.max(1,Math.round(dn*.3));
        g.php=Math.max(0,g.php-dn);g.pflash=.2;g.shake=arnRidotti()?0:.25;arnNum(g.px,'−'+dn,g.k.blk?'blk':'me');arnBarre();if(g.php<=0){arnFine('perso');return;}}else if(g.inv>0)arnNum(g.px,'schivato!','ok');}}
    else if(g.zst==='riposo'){g.zt-=dt;g.zx+=(-dir)*g.zvel*.25*dt;if(g.zt<=0)g.zst='avanza';}
    g.zx=Math.max(4,Math.min(ARN_W-4,g.zx));
    if((now-g.t0)/1000>(g.d.max_s||280)){arnFine('perso');return;}
    const c=g.A.querySelector('[data-arncd]');if(c)c.textContent=g.spCd>0?Math.ceil(g.spCd):'';}
  arnDraw();g.raf=requestAnimationFrame(arnLoop);}
function arnDraw(){const g=ARN.g,c=g.cv,x=g.ctx;if(!c.width)return;const W=c.width,H=c.height;x.save();
  if(g.shake>0)x.translate((Math.random()-.5)*12,(Math.random()-.5)*8);
  const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#2b1d4a');sky.addColorStop(1,'#6b3a5b');x.fillStyle=sky;x.fillRect(-10,-10,W+20,H+20);
  x.fillStyle='#1d1430';for(let i=0;i<7;i++){const bw=W/7;const bh=H*(.25+((i*37)%5)/14);x.fillRect(i*bw,H*.72-bh,bw*.8,bh);}
  x.fillStyle='#3b2a1f';x.fillRect(0,H*.72,W,H*.28);x.fillStyle='#55402f';x.fillRect(0,H*.72,W,H*.03);
  const sz=Math.min(H*.32,W*.14),y=H*.72;const X=v=>v/ARN_W*W;
  x.textAlign='center';x.textBaseline='bottom';x.font=`${sz}px system-ui, "Apple Color Emoji", sans-serif`;
  // zombie: rosso mentre carica il colpo (segnale per parare o schivare)
  if(g.zst==='carica'){x.fillStyle='rgba(255,40,40,.35)';x.beginPath();x.arc(X(g.zx),y-sz*.5,sz*.75,0,7);x.fill();x.fillStyle='#ff4040';x.font=`bold ${sz*.45}px system-ui`;x.fillText('!',X(g.zx),y-sz*1.05);x.font=`${sz}px system-ui, "Apple Color Emoji", sans-serif`;}
  x.globalAlpha=g.zflash>0?.4:1;x.save();x.translate(X(g.zx),y);if(g.px>g.zx)x.scale(-1,1);x.fillText(g.zic,0,0);x.restore();x.globalAlpha=1;
  x.globalAlpha=g.inv>0?.45:(g.pflash>0?.55:1);x.save();x.translate(X(g.px),y);if(g.px>g.zx)x.scale(-1,1);x.fillText(g.pic,0,0);x.restore();x.globalAlpha=1;
  if(g.k.blk){x.font=`${sz*.55}px system-ui, "Apple Color Emoji", sans-serif`;x.fillText('🛡️',X(g.px)+(g.px<g.zx?sz*.45:-sz*.45),y-sz*.25);}
  if(g.swing>0){x.font=`${sz*(g.spfx>0?.8:.5)}px system-ui, "Apple Color Emoji", sans-serif`;x.fillText(g.spfx>0?'💥':'👊',X(g.px)+(g.px<g.zx?sz*.7:-sz*.7),y-sz*.35);}
  x.restore();}
async function arnFine(esito){const g=ARN.g;if(!g||g.fine)return;g.fine=true;cancelAnimationFrame(g.raf);let r=null;
  try{const{data,error}=await SB.rpc('world_scontro_fine',{p_id:g.id,p_esito:esito,p_colpi:g.colpi});if(error)throw error;r=data;}catch(e){r={ok:false,msg:'Collegamento perso: lo scontro non è stato salvato'};}
  const v=r&&r.vinto;const res=g.A.querySelector('.arnres')||document.createElement('div');res.className='arnres';
  res.innerHTML=`<div class="arnrc"><b class="disp">${v?'🏆 Vittoria!':esito==='abbandonato'?'🏃 Sei scappato':'💀 Sconfitta'}</b>
    ${v?`<p>${r.ic||g.zic} ${esc(r.nome||'')} abbattuto${r.nuovo?' · 📖 nuovo nella Zombipedia':''}</p><div class="arnpremi"><span>⭐ +${r.xp} XP</span>${r.legno?`<span>🪵 +${r.legno}</span>`:''}${r.cibo?`<span>🥫 +${r.cibo}</span>`:''}${r.carb?`<span>⛽ +${r.carb}</span>`:''}${r.mattoni?`<span>🧱 +${r.mattoni}</span>`:''}</div>${r.salito?`<p>🎖️ Sei salito al grado ${r.grado}!</p>`:''}`
      :`<p>${esc((r&&r.msg)||'')}</p>`}
    <p class="muted" style="font-size:12.5px">Colpi a segno ${g.colpi} · tempo ${Math.round((performance.now()-g.t0)/1000)} s</p><button class="btn wide" data-arnchiudi>Chiudi</button></div>`;
  g.A.appendChild(res);res.querySelector('[data-arnchiudi]').onclick=arnChiudi;try{sfx&&sfx(v?'coin':'poof');}catch(e){}
  try{zmLoad(true);}catch(e){}arnMiei(true);try{if(v&&typeof svLoad==='function')svLoad();}catch(e){}}
function arnChiudi(){const g=ARN.g;if(g){removeEventListener('keydown',g.kd);removeEventListener('keyup',g.ku);removeEventListener('resize',g.rot);cancelAnimationFrame(g.raf);}
  try{screen.orientation&&screen.orientation.unlock&&screen.orientation.unlock();}catch(e){}const A=document.getElementById('arena');if(A)A.remove();ARN.g=null;}
/* ---------- scontri in corso: avviso in alto (in viaggio / arrivato) ---------- */
async function arnMiei(forza){if(!S.user||typeof SB==='undefined'||!SB)return;if(!forza&&Date.now()-ARN.t<60000)return;ARN.t=Date.now();
  try{const{data,error}=await SB.rpc('world_scontri_miei');if(!error&&data&&data.ok)ARN.miei=(data.scontri||[]).map(s=>({...s,fineMs:Date.now()+s.secondi*1000}));}catch(e){}arnBan();}
function arnBan(){let el=document.getElementById('arnban');const s=(ARN.miei||[]).find(x=>x.modo==='superstite'&&!ARN.nascosti.has(x.id+x.stato));
  if(!s||ARN.g||document.getElementById('lente')){if(el)el.remove();return;}
  const left=Math.max(0,(s.fineMs-Date.now())/1000);const pronto=s.stato==='pronto'||left<=0;
  const h=`<span>${pronto?`🧟 Il superstite è arrivato da ${s.ic} ${esc(s.nome)}`:`🎒 In viaggio verso ${s.ic} ${esc(s.nome)} · ${arnT(left)}`}</span>${pronto?`<button class="btn small" data-arnbgo>⚔️ Combatti</button>`:`<button class="btn small ghost" data-arnbsub>💎 ${gemCosto(new Date(s.fineMs))}</button>`}<button class="btn ghost small" data-arnbx aria-label="Nascondi">✕</button>`;
  if(!el){document.body.insertAdjacentHTML('beforeend',`<div id="arnban" class="arnban"></div>`);el=document.getElementById('arnban');}
  if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h;const go=el.querySelector('[data-arnbgo]');if(go)go.onclick=()=>{el.remove();arnVai(s.id,s.ic);};
    const sb=el.querySelector('[data-arnbsub]');if(sb)sb.onclick=()=>arnSubito(s.id,new Date(s.fineMs).toISOString());el.querySelector('[data-arnbx]').onclick=()=>{ARN.nascosti.add(s.id+s.stato);el.remove();};}
  if(pronto&&s.stato!=='pronto')arnMiei(true);}
zEvery(()=>{try{if(document.hidden||!S.user)return;arnMiei(false);arnBan();}catch(e){}},5000,'arena');
setTimeout(()=>arnMiei(true),4000);
// la notifica "Il superstite è arrivato" porta qui: ?scontro=<id>
const _zGoArn=zGoUrl;zGoUrl=function(u){_zGoArn(u);try{const id=new URL(u,location.href).searchParams.get('scontro');if(id)setTimeout(()=>arnVai(+id),1500);}catch(e){}};
// sulla mappa: toccare uno zombie apre l'incontro (le casse restano come prima)
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('.lm-zm');if(!el||el.classList.contains('cassa'))return;let z=null;
  try{ZM.mk.forEach((m,id)=>{if(m.getElement&&m.getElement()===el)z=(ZM.L||[]).find(x=>x.id===id);});}catch(x){}if(!z)return;e.stopPropagation();e.preventDefault();arnCard(z);},true);
// nella Lente: lo zombie vicino si affronta nell'arena (non più "spara a ripetizione")
const _zmSparaArn=zmSpara;zmSpara=function(z){if(ZM.f&&!ZM.f.fine)return _zmSparaArn.apply(this,arguments);if(z&&z.k!=='cassa')return arnCard(z);return _zmSparaArn.apply(this,arguments);};
</script>
