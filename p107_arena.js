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
// posizione VERA (GPS o Lente) per combattere di persona: mai quella della casa scelta nella mappa del Gioco
function arnGps(){if(typeof LENTE!=='undefined'&&LENTE.on&&LENTE.pos)return LENTE.pos;if(S.geo&&S.geo.lat!=null)return S.geo;return null;}
async function arnCard(z){if(!S.user){toast('Accedi per combattere');return;}let d=null;
  try{const{data,error}=await SB.rpc('world_scontro_info',{p_zid:z.id});if(error)throw error;d=data;}catch(e){toast('🧟 L’arena arriva dopo l’aggiornamento del server (blocco SQL 046)');return;}
  if(!d||!d.ok){toast((d&&d.msg)||'Zombie sparito');return;}
  const sc=d.scontro;const p=arnGps();const acc=(typeof LENTE!=='undefined'&&LENTE.on&&LENTE.acc)?LENTE.acc:(p&&p.acc)||0;const c=d.cfg||{};
  const lim=(+c.dist_m||80)+Math.min(Math.max(acc||0,0),+c.acc_max_m||50);const dist=p?Math.round(trM(p.lat,p.lon,z.lat,z.lon)):null;
  let diff=localStorage.getItem('zsh_arn_diff')||'equilibrato';if(!d.livelli[diff])diff='equilibrato';const v=d.viaggio||{};const L0=d.livelli.equilibrato;
  const body=()=>{const zs=d.livelli[diff];
    if(sc)return`<div class="arnzc"><b class="arnzic">${L0.ic}</b><div><b>${esc(L0.nome)}</b><small>${ARN_DIFF[sc.diff]||''}</small></div></div>`+
      (sc.stato==='viaggio'?`<p>🎒 Il superstite è in viaggio: arriva fra <b data-arnleft>${arnT(sc.secondi)}</b>. Ti mando una notifica.</p><button class="btn wide ghost" data-arnsub>💎 ${gemCosto(sc.arrivo)} · Arriva subito</button><p class="muted" style="font-size:12px">Le gemme accorciano solo il viaggio: lo scontro lo vinci tu.</p>`
       :`<p>Lo zombie ti aspetta${sc.modo==='superstite'?' (fino a '+new Date(sc.scade).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+')':''}.</p><button class="btn wide" data-arnvai="${sc.id}">⚔️ Combatti ora</button>`);
    return`<div class="arnzc"><b class="arnzic">${zs.ic}</b><div><b>${esc(zs.nome)} · Lv ${zs.livello}</b><small>${ZM_RAR[zs.rar]||''}</small><div>${arnStatRiga(zs)}</div></div></div>
    <div class="arndiff">${Object.keys(ARN_DIFF).map(k=>`<button class="${k===diff?'on':''}" data-arnd="${k}">${ARN_DIFF[k]}<small>Lv ${d.livelli[k].livello}</small></button>`).join('')}</div>
    <div class="arnio">${svAvatar((SV.d&&SV.d.avatar)||{},false)}<div><b>Tu · grado ${d.io.grado}</b><div>${arnStatRiga(d.io)}</div></div></div>
    ${typeof GM!=='undefined'&&GM.on&&GM.av&&trM(GM.av.lat,GM.av.lon,z.lat,z.lon)<=50?`<h4 style="margin:12px 0 4px">🧭 Il tuo superstite è qui</h4><button class="btn wide" data-arne>⚔️ Combatti col superstite · 🔋 1</button>`:''}
    <h4 style="margin:12px 0 4px">📍 Di persona</h4>${dist!=null&&dist<=lim?`<button class="btn wide" data-arnp>⚔️ Combatti qui · 🔋 1</button>`
      :`<p class="muted" style="margin:2px 0 6px">Sei a ${dist!=null?dist+' m':'?'}: serve meno di ${Math.round(lim)} m (80 m + precisione del GPS). Gratis a parte 🔋 1.</p>${typeof LENTE!=='undefined'&&LENTE.on?'':'<button class="btn wide ghost" data-arnlente>📷 Apri la Lente e avvicinati</button>'}`}
    <h4 style="margin:12px 0 4px">🎒 Manda il superstite</h4>${v.km!=null?`<p class="arnvia">📏 ${String(v.km).replace('.',',')} km dalla tua casa · 🥫 ${v.cibo} per il viaggio · solo andata. Tocca il mezzo qui sotto per cambiarlo: tempo e carburante cambiano.</p>`:''}
    ${v.ok?`<button class="btn wide ghost" data-arns data-km="${v.km}" data-viaggio="1">🎒 Manda il superstite</button><p class="muted" style="font-size:12px">All’arrivo ti avviso e lo zombie ti aspetta 30 minuti; poi combatti tu nell’arena.</p>`:`<p class="muted">${esc(v.msg||(v.km!=null?`È a ${v.km} km: il raggio del superstite è ${v.raggio} km`:'Non raggiungibile'))}</p>`}`;};
  const bind=cc=>{const r=()=>{cc.querySelector('.arncard').innerHTML=body();bind(cc);};
    cc.querySelectorAll('[data-arnd]').forEach(b=>b.onclick=()=>{diff=b.dataset.arnd;try{localStorage.setItem('zsh_arn_diff',diff);}catch(e){}r();});
    const P=cc.querySelector('[data-arnp]');if(P)P.onclick=()=>arnParti(z,'persona',diff,P);const E=cc.querySelector('[data-arne]');if(E)E.onclick=()=>arnParti(z,'esplora',diff,E);
    const M=cc.querySelector('[data-arns]');if(M)M.onclick=()=>arnParti(z,'superstite',diff,M);
    const Ln=cc.querySelector('[data-arnlente]');if(Ln)Ln.onclick=()=>{closeSheet();lenteOpen();};
    const V=cc.querySelector('[data-arnvai]');if(V)V.onclick=()=>{closeSheet();arnVai(+V.dataset.arnvai,L0.ic);};
    const G=cc.querySelector('[data-arnsub]');if(G)G.onclick=()=>arnSubito(sc.id,sc.arrivo);};
  const apri=()=>openSheet(`🧟 Incontro`,`<div class="arncard">${body()}</div>`,bind);
  if(typeof LENTE!=='undefined'&&LENTE.on)lnSheet(apri);else apri();}
async function arnParti(z,modo,diff,btn){btn.disabled=true;const p=arnGps();const acc=(typeof LENTE!=='undefined'&&LENTE.on&&LENTE.acc)||(p&&p.acc)||0;let r=null;
  try{const{data,error}=await SB.rpc('world_scontro_parti',{p_zid:z.id,p_modo:modo,p_diff:diff,p_lat:p?p.lat:null,p_lon:p?p.lon:null,p_acc:acc});if(error)throw error;r=data;}catch(e){toast('Non riuscito: riprova');}
  btn.disabled=false;if(!r)return;if(!r.ok){toast(r.msg);return;}
  if(modo!=='superstite'){closeSheet();arnVai(r.id,(ZM_T[z.tipo]||['🧟'])[0]);}else{toast(r.msg);closeSheet();arnMiei(true);}}
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
/* ---------- l'arena: picchiaduro anni '80 (Fase 54b) ----------
   Grafica in pixel art disegnata su un foglio piccolo (384×216) e ingrandita senza sfumature.
   Tu: pugno, calcio, parata, schivata, ⭐ montante di fuoco. Lo zombie: graffio, morso, carica, combo; para e contrattacca. */
const ARN_W=100,ALW=384,ALH=216,AGY=188;
// mosse: st = carica, ac = colpo, rc = recupero (s), rng = portata, m = danno ×, h = alto (ti abbassi) / basso (salti), kd = a terra, ub = non si para
const ARN_MV={pugno:{st:.07,ac:.09,rc:.16,rng:15,m:1},calcio:{st:.14,ac:.1,rc:.26,rng:20,m:1.3},speciale:{st:.18,ac:.16,rc:.32,rng:19,m:3,kd:1},
  basso:{st:.06,ac:.09,rc:.18,rng:15,m:.9},aereo:{st:.05,ac:.2,rc:.12,rng:19,m:1.4},tripla:{st:.1,ac:.12,rc:.35,rng:18,m:1.8,kd:1},rotante:{st:.16,ac:.16,rc:.35,rng:23,m:1.5,kd:1},
  graffio:{st:.32,ac:.1,rc:.35,rng:14,m:.8,h:'alto'},morso:{st:.65,ac:.12,rc:.55,rng:11,m:1.45,h:'basso'},carica:{st:.45,ac:.35,rc:.55,rng:12,m:1.1,dash:75},
  schianto:{st:.8,ac:.12,rc:.7,rng:17,m:2.2,kd:1,ub:1},sputo:{st:.5,ac:.05,rc:.5,rng:0,m:.9,h:'alto',proj:1},urlo:{st:.6,ac:.15,rc:.6,rng:32,m:.3,stun:.9},
  balzo:{st:.4,ac:.3,rc:.5,rng:12,m:1.2,dash:90,h:'basso'}};
// mosse di ogni tipo di zombie (vicino / da lontano)
const ARN_ZM={vagante:[['graffio','morso'],['carica']],corridore:[['graffio','graffio','morso'],['carica','carica']],urlatrice:[['graffio','urlo'],['urlo']],
  bruto:[['schianto','graffio'],['carica']],sputatore:[['graffio','morso'],['sputo','sputo']],cane:[['morso','balzo'],['balzo','balzo']],operaio:[['schianto','graffio'],['carica']],
  soldato:[['graffio','graffio','carica'],['carica']],dottore:[['morso','graffio'],['sputo']],clown:[['morso','carica'],['carica','balzo']],re:[['schianto','urlo','graffio'],['urlo','carica']],strega:[['graffio','urlo'],['sputo','urlo']]};
const ARN_ZL={bruto:{s:1.18,pelle:'#6f9a50',maglia:'#7a3b2e'},corridore:{s:.95,pelle:'#9cc77a',maglia:'#2f6db3'},urlatrice:{s:.95,pelle:'#a7c98a',maglia:'#b03a7a'},
  sputatore:{s:1,pelle:'#b8c95a',maglia:'#5a7a2e'},cane:{s:1,pelle:'#8a9a6a',maglia:'#5a4a3a'},operaio:{s:1.05,pelle:'#8fbf6a',maglia:'#e88f1c'},soldato:{s:1.08,pelle:'#86ad66',maglia:'#4b5d2e'},
  dottore:{s:1,pelle:'#9fc48a',maglia:'#e8e8e8'},clown:{s:1,pelle:'#b5d39a',maglia:'#d43c3c'},re:{s:1.15,pelle:'#7fa85e',maglia:'#6a2a8a'},strega:{s:1,pelle:'#93b87a',maglia:'#2a2a3a'}};
function arnF(x,dir,hp){return{x,dir,hp,hp0:hp,hpv:hp,act:null,stun:0,inv:0,blk:0,kb:0,dash:0,cd:.8,t:0,walk:0,ko:false,q:null,y:0,vy:0,down:0,hk:'',hit:0};}
function arnApri(d){try{if(typeof LENTE!=='undefined'&&LENTE.on)lenteClose();}catch(e){}
  const io=d.io,zz=d.zombie,av=d.avatar||{};const zl=ARN_ZL[zz.tipo]||{s:1,pelle:'#8fbf6a',maglia:'#6b5a8a'};
  const g=ARN.g={d,id:d.id,diff:d.diff,p:arnF(24,1,io.vita),z:arnF(76,-1,zz.vita),colpi:0,t0:0,last:performance.now(),k:{l:0,r:0,blk:0,dn:0},seq:[],proj:[],spCd:0,dodCd:0,fine:false,raf:0,via:false,
    shake:0,flash:0,fx:[],txt:null,tempo:60,round:1,vinti:{p:0,z:0},combo:{n:0,t:0},super:0,furia:false,slow:1,rid:arnRidotti(),zl,col:SV_C[av.c||0]||'#ffd23f',pelle:['#f1c27d','#e0ac69','#c68642','#8d5524','#f1c27d','#ffdbac','#e0ac69','#c68642'][av.v||0],
    vel:30+io.agilita*1.3,zvel:9+zz.agilita*1.2,wind:{facile:1.3,equilibrato:1,difficile:.8}[d.diff]||1,
    punisci:{facile:.3,equilibrato:.55,difficile:.8}[d.diff]||.55,para:{facile:.06,equilibrato:.16,difficile:.3}[d.diff]||.16,nome:((SV.d&&SV.d.nome)||S.user.nick||'Tu').toUpperCase(),znome:String(zz.nome||'Zombie').toUpperCase()};
  document.body.insertAdjacentHTML('beforeend',`<div id="arena" class="${g.rid?'rid':''}" role="dialog" aria-label="Arena">
    <div class="arntop"><div class="arnhp me"><b>${esc(g.nome)}</b><i><s data-arnhv="me"></s><u data-arnhp="me"></u></i><small>GRADO ${io.grado}${io.casa?` · <span data-arncasa title="Vicino a casa: le fortificazioni ti aiutano">🏰+${io.casa*5}</span>`:''} · ❤️ <span data-arnhpt="me">${io.vita}</span> · <span class="arnrd" data-arnrd="p">○○</span></small><em class="arnsup"><span data-arnsup></span><b>SUPER</b></em></div>
      <div class="arntime"><b data-arntime>60</b><small data-arnround>ROUND 1</small><button class="arnx" data-arnx aria-label="Scappa">✕</button></div>
      <div class="arnhp z"><b>${esc(g.znome)}</b><i><s data-arnhv="z"></s><u data-arnhp="z"></u></i><small>LV ${zz.livello} · ${({facile:'FACILE',equilibrato:'EQUILIBRATO',difficile:'DIFFICILE'})[d.diff]||''} · ❤️ <span data-arnhpt="z">${zz.vita}</span> · <span class="arnrd" data-arnrd="z">○○</span></small></div></div>
    <div class="arnfield"><canvas></canvas><div class="arnann" data-arnann></div></div>
    <div class="arnctl"><div class="arnpad cr"><button data-arnk="up" class="psu" aria-label="Salta">▲</button><button data-arnk="l" class="psx" aria-label="Sinistra">◀</button><button data-arnk="r" class="pdx" aria-label="Destra">▶</button><button data-arnk="dn" class="pgiu" aria-label="Abbassati">▼</button></div>
      <div class="arnpad dx"><button data-arnk="blk" aria-label="Para">🛡️<small>Para</small></button><button data-arnk="dod" aria-label="Schiva">💨<small>Schiva</small></button>
        <button class="big" data-arnk="atk" aria-label="Pugno">👊<small>Pugno</small></button><button class="big k" data-arnk="kick" aria-label="Calcio">🦵<small>Calcio</small></button><button data-arnk="sp" aria-label="Mossa speciale">🔥<small>Super</small><span class="cd" data-arncd></span></button></div></div>
    <div class="arnrot" data-arnrot><b>📱↻</b><p>Gira il telefono in orizzontale per combattere meglio</p><button class="btn small ghost" data-arnrotok>Gioca così</button></div></div>`);
  const A=document.getElementById('arena');g.A=A;g.cv=A.querySelector('canvas');g.ctx=g.cv.getContext('2d');
  g.off=document.createElement('canvas');g.off.width=ALW;g.off.height=ALH;g.o=g.off.getContext('2d');g.bg=arnSfondo();
  try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{});}catch(e){}
  // niente zoom dell'iPhone col doppio tocco o con due dita dentro l'arena (spostava la scena)
  let tLast=0;A.addEventListener('touchend',e=>{const t=Date.now();if(t-tLast<400&&e.cancelable)e.preventDefault();tLast=t;},{passive:false});
  ['gesturestart','gesturechange'].forEach(k=>A.addEventListener(k,e=>e.preventDefault()));A.addEventListener('dblclick',e=>e.preventDefault());
  const rot=()=>{const r=A.querySelector('[data-arnrot]');if(r)r.classList.toggle('on',innerHeight>innerWidth&&!g.rotOk);arnSize();};g.rot=rot;addEventListener('resize',rot);rot();
  A.querySelector('[data-arnrotok]').onclick=()=>{g.rotOk=1;rot();};
  A.querySelector('[data-arnx]').onclick=()=>{if(g.fine)return;if(confirm('Scappare? Lo scontro conta come perso e non ricevi premi.'))arnFine('abbandonato');};
  A.querySelectorAll('[data-arnk]').forEach(b=>{const k=b.dataset.arnk;
    const tieni=k==='l'||k==='r'||k==='blk'||k==='dn';const giu=e=>{e.preventDefault();if(tieni)g.k[k]=1;else arnAzione(k);b.classList.add('pr');};
    const su=e=>{e.preventDefault();if(tieni)g.k[k]=0;b.classList.remove('pr');};
    b.addEventListener('pointerdown',giu);b.addEventListener('pointerup',su);b.addEventListener('pointerleave',su);b.addEventListener('pointercancel',su);});
  const KM={arrowleft:'l',a:'l',arrowright:'r',d:'r',x:'blk',arrowdown:'dn',s:'dn'};
  g.kd=e=>{const K=e.key.toLowerCase();if(KM[K]){g.k[KM[K]]=1;e.preventDefault();return;}
    if(K==='arrowup'||K==='w')arnAzione('up');else if(K==='j'||K==='z')arnAzione('atk');else if(K==='k'||K==='c')arnAzione('kick');else if(K==='l'||K==='v')arnAzione('dod');else if(K===' '||K==='u')arnAzione('sp');else if(K==='escape')A.querySelector('[data-arnx]').click();else return;e.preventDefault();};
  g.ku=e=>{const K=e.key.toLowerCase();if(KM[K])g.k[KM[K]]=0;};
  addEventListener('keydown',g.kd);addEventListener('keyup',g.ku);
  arnBarre();const v=window.__arnVeloce;arnAnn('ROUND 1',v?60:900,()=>arnAnn('FIGHT!',v?60:650,()=>{g.via=true;g.t0=performance.now();}));
  g.raf=requestAnimationFrame(arnLoop);}
function arnAnn(t,ms,dopo,cl){const g=ARN.g;if(!g)return;const el=g.A.querySelector('[data-arnann]');el.className='arnann on '+(cl||'');el.textContent=t;try{sfx&&sfx('boom');}catch(e){}
  clearTimeout(g.annT);g.annT=setTimeout(()=>{el.className='arnann';dopo&&dopo();},ms);}
function arnSize(){const g=ARN.g;if(!g)return;const c=g.cv,r=c.parentNode.getBoundingClientRect(),dp=Math.min(2,devicePixelRatio||1);c.width=Math.max(1,r.width*dp);c.height=Math.max(1,r.height*dp);c.style.width='100%';c.style.height='100%';g.sz=r.width+'x'+r.height;}
// danno di un colpo come sul server (w_arena_danno): forza × 1,5 − difesa × 0,6, almeno 1
function arnDanno(f,d){return Math.max(1,Math.round(f*1.5-d*.6));}
const arnPX=x=>24+x*3.36;
// suoni sintetizzati (nessun file): pugni, calci, parate, versi, salto, K.O.
function arnSnd(k){try{if(typeof G!=='undefined'&&G.mute)return;const c=audioCtx();if(!c)return;const t=c.currentTime;
  const tone=(f,d,ty,v,f2)=>{const o=c.createOscillator(),q=c.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);q.gain.setValueAtTime(v,t);q.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(q);q.connect(AUD.master);o.start(t);o.stop(t+d+.02);};
  const rum=(d,v,lp)=>{const b=c.createBuffer(1,Math.floor(c.sampleRate*d),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);
    const s=c.createBufferSource(),f=c.createBiquadFilter(),q=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=lp;q.gain.value=v;s.connect(f);f.connect(q);q.connect(AUD.master);s.start(t);};
  if(k==='pugno'){rum(.09,.35,1800);tone(160,.08,'square',.05,60);}
  else if(k==='forte'){rum(.18,.5,1200);tone(110,.18,'sawtooth',.07,40);}
  else if(k==='zcolpo'){rum(.12,.4,900);tone(220,.12,'triangle',.05,90);}
  else if(k==='parata'){tone(900,.06,'square',.04,500);rum(.05,.2,4000);}
  else if(k==='salto')tone(300,.12,'triangle',.04,600);
  else if(k==='sputo'){rum(.2,.25,600);tone(140,.2,'sawtooth',.03,70);}
  else if(k==='verso'){const f=90+Math.random()*60;tone(f,.45,'sawtooth',.05,f*.6);tone(f*1.5,.35,'square',.02,f);}
  else if(k==='ko'){rum(.5,.6,500);tone(200,.6,'sawtooth',.07,35);}}catch(e){}}
function arnLibero(F){return!F.act&&F.stun<=0&&!F.ko&&F.dash<=0&&F.down<=0;}
function arnAzione(k){const g=ARN.g;if(!g||g.fine||!g.via)return;const p=g.p;if(!arnLibero(p)||g.k.blk)return;
  if(k==='up'){if(p.y<=0){p.vy=230;arnSnd('salto');}return;}
  const now=performance.now()/1000;if(k==='atk'||k==='kick'){g.seq=g.seq.filter(x=>now-x[1]<1).concat([[k,now]]);}
  const sq=g.seq.map(x=>x[0]).join(',');
  if(p.y>0&&(k==='atk'||k==='kick'))p.act={k:'aereo',t:0,hit:false};
  else if(k==='kick'&&/atk,atk,kick$/.test(sq)){p.act={k:'tripla',t:0,hit:false};g.txt={t:'TRIPLA!',l:.7};g.seq=[];}
  else if(k==='kick'&&/kick,kick$/.test(sq)){p.act={k:'rotante',t:0,hit:false};g.txt={t:'CALCIO ROTANTE!',l:.7};g.seq=[];}
  else if(k==='atk'&&g.k.dn)p.act={k:'basso',t:0,hit:false};
  else if(k==='atk')p.act={k:'pugno',t:0,hit:false};else if(k==='kick')p.act={k:'calcio',t:0,hit:false};
  else if(k==='sp'){if(g.super<100){g.txt={t:'SUPER '+Math.floor(g.super)+'%',l:.6};return;}g.super=0;p.act={k:'speciale',t:0,hit:false};g.txt={t:'🔥 SUPER!',l:.8};}
  else if(k==='dod'){if(g.dodCd>0)return;g.dodCd=Math.max(.7,1.3-g.d.io.agilita*.02);p.inv=.4;p.dash=.22;p.dashv=-p.dir*95;return;}
  // lo zombie a volte para quando vede arrivare il colpo
  const z=g.z;if(arnLibero(z)&&Math.abs(z.x-p.x)<22&&Math.random()<g.para)z.blk=.5;}
function arnColpisci(a,b,mv,io){const g=ARN.g;const dir=a.dir;let dn=Math.round((io?g.d.danno_io:g.d.danno_z)*mv.m*(.9+Math.random()*.2)*(!io&&g.furia?1.15:1));
  const now=performance.now()/1000;if(io&&!(b.blk>0)){g.combo.n=now-g.combo.t<.8?g.combo.n+1:1;g.combo.t=now;if(g.combo.n>=3){dn=Math.round(dn*1.5);g.txt={t:'COMBO ×'+g.combo.n,l:.7};}}
  g.super=Math.min(100,g.super+(io?(b.blk>0?4:12):6));
  arnSnd(mv.m>=1.4?'forte':io?'pugno':'zcolpo');
  if(!mv.ub&&(b.blk>0||(!io&&g.k.blk&&arnLibero(b)))){arnSnd('parata');dn=Math.max(1,Math.round(dn*.25));b.stun=.12;b.kb=dir*35;arnSpark(b.x,'blk');arnNum(b.x,'−'+dn,'blk');
    if(io&&Math.random()<g.punisci){b.blk=0;b.act={k:'graffio',t:ARN_MV.graffio.st*g.wind*.5,hit:false};}}
  else{const counter=b.act&&b.act.t<(ARN_MV[b.act.k].st*(io?g.wind:1));b.act=null;b.blk=0;b.stun=mv.stun||(mv.kd?.7:.3);b.kb=dir*(mv.kd?95:55);b.hit=.25;b.hk=mv.h==='basso'?'corpo':'testa';
    if(mv.kd){b.down=.95;b.vy=0;b.y=0;for(let i=0;i<8;i++)g.fx.push({x:arnPX(b.x)+(Math.random()-.5)*24,y:AGY-2,vx:(Math.random()-.5)*60,vy:-Math.random()*30,t:.5,k:'dust'});}
    if(mv.m>=1.4)g.fx.push({x:arnPX(b.x),y:AGY-70,vx:0,vy:-10,t:.6,k:'pow',s:['POW!','BAM!','KRAK!','SBAM!'][Math.floor(Math.random()*4)]});
    arnSpark(b.x,io?'goo':'hit');arnNum(b.x,'−'+dn,io?(mv.m>1.5?'sp':''):'me');if(counter)g.txt={t:'COUNTER!',l:.8};if(!g.rid){g.shake=mv.kd?.3:.14;g.flash=.08;}
    if(io&&Math.random()<g.punisci*.5)b.q='graffio';}
  b.hp=Math.max(0,b.hp-dn);if(io)g.colpi++;if(!g.rid)g.stop=mv.m>1.5?.12:.06;try{sfx&&sfx(mv.m>1.5?'boom':'tap');}catch(e){}arnBarre();
  if(!g.furia&&g.z.hp>0&&g.z.hp/g.z.hp0<.35){g.furia=true;g.zvel*=1.3;g.txt={t:'😡 FURIA!',l:1};}
  if(b.hp<=0)arnFineRound(io?'p':'z');}
// fine di un round: al meglio di 3 (2 round vinti)
function arnFineRound(chi){const g=ARN.g;if(!g.via)return;g.via=false;const p=g.p,z=g.z;(chi==='p'?z:p).ko=true;(chi==='p'?z:p).stun=9;g.slow=.25;arnSnd('ko');g.proj=[];g.vinti[chi]++;
  const set=k=>{const el=g.A.querySelector(`[data-arnrd="${k}"]`);if(el)el.textContent='●'.repeat(g.vinti[k])+'○'.repeat(2-g.vinti[k]);};set('p');set('z');
  const v=window.__arnVeloce;if(g.vinti[chi]>=2){arnAnn('K.O.',v?80:1300,()=>arnFine(chi==='p'?'vinto':'perso'),'ko');return;}
  arnAnn(g.tempo<=0?'TEMPO!':'K.O.',v?60:1200,()=>{g.round++;g.slow=1;Object.assign(p,arnF(24,1,p.hp0));Object.assign(z,arnF(76,-1,z.hp0));g.furia=false;g.zvel=9+g.d.zombie.agilita*1.2;g.tempo=60;g.combo.n=0;arnBarre();
    const r=g.A.querySelector('[data-arnround]');if(r)r.textContent='ROUND '+g.round;
    arnAnn(g.round===3?'ROUND FINALE':'ROUND '+g.round,v?60:900,()=>arnAnn('FIGHT!',v?60:650,()=>{g.via=true;g.t0=performance.now();}));},'ko');}
function arnSpark(x,k){const g=ARN.g;for(let i=0;i<(k==='blk'?6:10);i++)g.fx.push({x:arnPX(x)+(Math.random()-.5)*10,y:AGY-48+(Math.random()-.5)*14,vx:(Math.random()-.5)*120,vy:-Math.random()*90,t:.4,k});}
function arnNum(x,t,cl){const g=ARN.g;g.fx.push({x:arnPX(x),y:AGY-80,vx:0,vy:-40,t:.8,k:'num',s:t,cl});}
function arnBarre(){const g=ARN.g;if(!g)return;const A=g.A;const set=(k,F)=>{const u=A.querySelector(`[data-arnhp="${k}"]`);if(u)u.style.width=Math.max(0,F.hp/F.hp0*100)+'%';const t=A.querySelector(`[data-arnhpt="${k}"]`);if(t)t.textContent=Math.max(0,Math.round(F.hp));};
  set('me',g.p);set('z',g.z);}
function arnStep(F,O,dt,io){const g=ARN.g;F.t+=dt;['stun','inv','blk','dash','cd','down','hit'].forEach(k=>{if(F[k]>0)F[k]=Math.max(0,F[k]-dt);});
  if(F.y>0||F.vy>0){F.vy-=700*dt;F.y=Math.max(0,F.y+F.vy*dt);if(F.y<=0)F.vy=0;}
  F.crouch=io&&g.k.dn&&F.y<=0&&!F.act&&F.down<=0;
  if(F.kb){F.x+=F.kb*dt;F.kb*=Math.pow(.02,dt);if(Math.abs(F.kb)<2)F.kb=0;}
  if(F.dash>0)F.x+=F.dashv*dt;
  if(F.act){const mv=ARN_MV[F.act.k];const st=mv.st*(io?1:g.wind);F.act.t+=dt;const a=F.act;
    if(a.t>=st&&a.t<st+mv.ac){if(mv.dash)F.x+=F.dir*mv.dash*dt;
      if(mv.proj&&!a.hit){a.hit=true;g.proj.push({x:F.x+F.dir*6,dir:F.dir,mv,io});arnSnd('sputo');}
      else if(!a.hit&&Math.abs(O.x-F.x)<=mv.rng&&O.inv<=0&&!O.ko&&O.down<=0){a.hit=true;
        if((mv.h==='alto'&&O.crouch)||(mv.h==='basso'&&O.y>6)){g.fx.push({x:arnPX(O.x),y:AGY-60,vx:0,vy:-30,t:.6,k:'num',s:'SCHIVATO!',cl:'ok'});}else arnColpisci(F,O,mv,io);}}
    if(a.t>=st+mv.ac+mv.rc){F.act=null;if(F.q&&!F.ko){F.act={k:F.q,t:0,hit:false};F.q=null;}}}
  F.x=Math.max(4,Math.min(ARN_W-4,F.x));}
function arnAI(dt){const g=ARN.g,z=g.z,p=g.p;if(!arnLibero(z)||z.blk>0)return;const dist=Math.abs(z.x-p.x);
  // contrattacco: se hai colpito a vuoto e sei vicino, ti punisce
  if(p.act&&p.act.t>ARN_MV[p.act.k].st+ARN_MV[p.act.k].ac&&dist<17&&Math.random()<g.punisci*dt*6){z.act={k:'graffio',t:ARN_MV.graffio.st*g.wind*.4,hit:false};return;}
  if(z.cd>0){if(dist>12)z.x+=z.dir*g.zvel*.6*dt;return;}
  const MS=ARN_ZM[g.d.zombie.tipo]||ARN_ZM.vagante;const pick=L=>L[Math.floor(Math.random()*L.length)];
  if(dist>24&&Math.random()<dt*1.4){const k=pick(MS[1]);z.act={k,t:0,hit:false};z.cd=1.1;if(k==='urlo'||k==='sputo')arnSnd('verso');return;}
  if(dist>13){z.x+=z.dir*g.zvel*dt;z.walk+=dt;if(Math.random()<dt*.4)arnSnd('verso');return;}
  const k=pick(MS[0]);z.act={k,t:0,hit:false};if(k==='graffio'&&Math.random()<.35)z.q='graffio';if(k==='schianto'||k==='urlo')arnSnd('verso');
  z.cd=({facile:1.3,equilibrato:.95,difficile:.65}[g.diff]||1)*(.7+Math.random()*.6)*(g.furia?.7:1);}
function arnLoop(now){const g=ARN.g;if(!g)return;let dt=Math.min(.05,(now-g.last)/1000);g.last=now;dt*=g.slow;if(g.stop>0){g.stop-=dt;dt*=.15;}const p=g.p,z=g.z;
  if(g.via){const fermo=!arnLibero(p)||g.k.blk||(g.k.dn&&p.y<=0);if(!fermo){if(g.k.l){p.x-=g.vel*dt;p.walk+=dt;}if(g.k.r){p.x+=g.vel*dt;p.walk+=dt;}}
    ['spCd','dodCd'].forEach(k=>{if(g[k]>0)g[k]=Math.max(0,g[k]-dt);});arnAI(dt);
    g.tempo=Math.max(0,60-(now-g.t0)/1000);const tl=g.A.querySelector('[data-arntime]');if(tl)tl.textContent=Math.ceil(g.tempo);
    if(g.tempo<=0)arnFineRound(p.hp/p.hp0>z.hp/z.hp0?'p':'z');
    const c=g.A.querySelector('[data-arncd]');if(c)c.textContent=g.super<100?Math.floor(g.super)+'%':'';const sb=g.A.querySelector('[data-arnsup]');if(sb)sb.style.width=g.super+'%';const kb=g.A.querySelector('[data-arnk="sp"]');if(kb)kb.classList.toggle('pieno',g.super>=100);}
  if(!g.fine){g.proj.forEach(q=>{q.x+=q.dir*60*dt;const O=q.io?z:p;if(!q.fatto&&Math.abs(q.x-O.x)<4&&O.inv<=0&&O.down<=0){q.fatto=1;if(q.mv.h==='alto'&&O.crouch)g.fx.push({x:arnPX(O.x),y:AGY-60,vx:0,vy:-30,t:.6,k:'num',s:'SCHIVATO!',cl:'ok'});else arnColpisci(q.io?p:z,O,q.mv,q.io);}});
    g.proj=g.proj.filter(q=>!q.fatto&&q.x>0&&q.x<ARN_W);arnStep(p,z,dt,true);arnStep(z,p,dt,false);
    if(Math.abs(z.x-p.x)<8){const m=(8-Math.abs(z.x-p.x))/2,s=p.x<z.x?-1:1;p.x+=s*m;z.x-=s*m;}
    if(!p.act&&!p.ko)p.dir=p.x<z.x?1:-1;if(!z.act&&!z.ko)z.dir=z.x<p.x?1:-1;}
  ['shake','flash'].forEach(k=>{if(g[k]>0)g[k]=Math.max(0,g[k]-dt);});if(g.txt){g.txt.l-=dt;if(g.txt.l<=0)g.txt=null;}
  g.fx.forEach(f=>{f.t-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=(f.k==='num'?0:260)*dt;});g.fx=g.fx.filter(f=>f.t>0);
  ['p','z'].forEach(k=>{const F=g[k];F.hpv+=(F.hp-F.hpv)*Math.min(1,dt*3);const s=g.A.querySelector(`[data-arnhv="${k==='p'?'me':'z'}"]`);if(s)s.style.width=Math.max(0,F.hpv/F.hp0*100)+'%';});
  arnDraw(now/1000);g.raf=requestAnimationFrame(arnLoop);}
/* ---- disegno ---- */
function arnSfondo(){const c=document.createElement('canvas');c.width=ALW;c.height=ALH;const x=c.getContext('2d');
  const sky=x.createLinearGradient(0,0,0,AGY);sky.addColorStop(0,'#12062a');sky.addColorStop(.55,'#4a1250');sky.addColorStop(1,'#ff5f6d');x.fillStyle=sky;x.fillRect(0,0,ALW,AGY);
  for(let i=0;i<40;i++){x.fillStyle=i%3?'#ffffff88':'#ffd23f';x.fillRect((i*97)%ALW,(i*53)%70,1,1);}
  // sole al neon a strisce
  const sx=ALW/2,sy=118,R=44;const sg=x.createLinearGradient(0,sy-R,0,sy+R);sg.addColorStop(0,'#ffe66d');sg.addColorStop(1,'#ff3d7f');x.fillStyle=sg;x.beginPath();x.arc(sx,sy,R,0,7);x.fill();
  x.fillStyle='#4a1250';for(let i=0;i<7;i++){const yy=sy+4+i*6;x.fillRect(sx-R,yy,R*2,1+i*.6);}
  // palazzi con finestre accese
  for(let i=0;i<14;i++){const w=22+(i*13)%18,h=40+(i*29)%60,bx=i*28-8;x.fillStyle=i%2?'#1b0d33':'#24103f';x.fillRect(bx,AGY-14-h,w,h);
    for(let wy=AGY-10-h;wy<AGY-20;wy+=7)for(let wx=bx+3;wx<bx+w-3;wx+=5)if(((wx*7+wy*3+i)%5)<2){x.fillStyle=(wx+wy)%3?'#ffd23f':'#ff9f1c';x.fillRect(wx,wy,2,3);}}
  // strada con la griglia
  x.fillStyle='#160a24';x.fillRect(0,AGY-14,ALW,ALH-AGY+14);x.strokeStyle='#ff3df2';x.globalAlpha=.55;x.lineWidth=1;
  for(let i=-12;i<=12;i++){x.beginPath();x.moveTo(ALW/2+i*8,AGY-14);x.lineTo(ALW/2+i*60,ALH);x.stroke();}
  for(let j=0;j<6;j++){const yy=AGY-14+Math.pow(j/5,1.8)*(ALH-AGY+14);x.beginPath();x.moveTo(0,yy);x.lineTo(ALW,yy);x.stroke();}x.globalAlpha=1;
  // auto distrutta e bidone
  x.fillStyle='#3a2c4a';x.fillRect(300,AGY-34,64,16);x.fillRect(312,AGY-44,36,12);x.fillStyle='#0a0612';x.fillRect(306,AGY-20,10,8);x.fillRect(348,AGY-20,10,8);x.fillStyle='#7ad7ff';x.fillRect(316,AGY-42,12,8);
  x.fillStyle='#5a3a2a';x.fillRect(18,AGY-34,16,22);x.fillStyle='#3a2418';x.fillRect(18,AGY-28,16,2);x.fillRect(18,AGY-20,16,2);
  return c;}
function arnLimb(x,x0,y0,a,len,w,col,dir){const x1=x0+Math.sin(a)*len*dir,y1=y0+Math.cos(a)*len;x.lineCap='round';x.strokeStyle='#0a0612';x.lineWidth=w+2;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();
  x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();return[x1,y1];}
function arnPosa(F,zom,T){const a=F.act,mv=a?ARN_MV[a.k]:null;const ARN_G=ARN.g;const st=mv?mv.st*(zom?ARN_G.wind:1):0;const fase=a?(a.t<st?'su':a.t<st+mv.ac?'col':'giu'):null;
  const sw=Math.sin(F.walk*10),bob=Math.sin(T*(zom?3:5))*1;
  let P=zom?{lean:.28+Math.sin(T*2)*.04,t1:.25+sw*.4,s1:.1+sw*.3,t2:-.2-sw*.4,s2:-.05-sw*.2,u1:1.45+Math.sin(T*3)*.1,f1:1.6,u2:1.3+Math.sin(T*3+1)*.1,f2:1.5,dy:bob,hd:0,bocca:0}
    :{lean:.08,t1:.3+sw*.45,s1:-.05+sw*.3,t2:-.3-sw*.45,s2:.05-sw*.3,u1:.8,f1:2.3,u2:.6,f2:2.2,dy:bob,hd:0,bocca:0};
  if(zom&&ARN_G.furia)P.rosso=Math.floor(T*4)%2;
  const cane=zom&&ARN_G.d.zombie.tipo==='cane';
  if(cane){P={...P,lean:1.45,t1:sw*.5,s1:sw*.3,t2:-sw*.5,s2:-sw*.3,u1:-sw*.5,f1:-sw*.3,u2:sw*.5,f2:sw*.3,dy:15+bob,hd:-1.2,cane:1};}
  if(F.ko||F.down>.35)return{...P,ko:1};
  if(F.down>0)return{...P,lean:.9,t1:1.6,s1:0,t2:1.2,s2:-.4,u1:.2,f1:.2,dy:14};
  if(F.hit>0&&!F.act&&!cane)return F.hk==='corpo'?{...P,lean:.55,u1:.3,f1:.2,u2:.5,f2:.3,hd:.3,dy:3}:{...P,lean:-.45,u1:-.5,f1:-.3,u2:-.7,f2:-.4,hd:-.5};
  if(F.stun>0&&!F.act)return{...P,lean:-.4,u1:-.4,f1:-.2,u2:-.6,f2:-.3,hd:-.3,stelle:1};
  if(F.y>0&&!F.act)return{...P,t1:1.2,s1:-1.4,t2:.7,s2:-1.2,u1:2.2,f1:2.6,u2:1.8,f2:2.4};
  if(F.crouch)return{...P,lean:.25,t1:1.4,s1:-.3,t2:.9,s2:-.9,u1:.7,f1:2.4,u2:.5,f2:2.3,dy:11};
  if(F.blk>0||(!zom&&ARN_G.k.blk&&!F.act))return{...P,lean:zom?.1:.05,u1:.5,f1:2.7,u2:.75,f2:2.6,dy:2};
  if(F.dash>0)return{...P,lean:-.35,t1:.6,s1:.2,t2:-.5,s2:-.1,dy:3};
  if(!a)return P;
  const k=a.k;
  if(k==='pugno')return fase==='su'?{...P,u1:.3,f1:2.5,lean:0}:fase==='col'?{...P,u1:1.57,f1:1.57,lean:.2}:{...P,u1:1.2,f1:2};
  if(k==='calcio')return fase==='su'?{...P,t1:1.3,s1:.2,lean:-.1}:fase==='col'?{...P,t1:1.55,s1:1.6,lean:-.3,t2:-.1,s2:0}:{...P,t1:.9,s1:.6};
  if(k==='speciale')return fase==='su'?{...P,u1:.4,f1:.2,dy:4,lean:.2}:fase==='col'?{...P,u1:2.9,f1:3.05,lean:-.15,dy:-10,fuoco:1}:{...P,u1:2.4,f1:2.6,dy:-4};
  if(k==='graffio')return fase==='su'?{...P,u1:2.7,f1:2.9,lean:.05}:fase==='col'?{...P,u1:1.3,f1:.9,lean:.45}:{...P,u1:1,f1:.8};
  if(k==='morso')return fase==='su'?{...P,lean:-.25,hd:-.2,bocca:1,rosso:1}:fase==='col'?{...P,lean:.75,hd:.3,bocca:1,u1:1.7,f1:1.7}:{...P,lean:.4};
  if(k==='basso')return fase==='col'?{...P,lean:.35,t1:1.4,s1:-.3,t2:.9,s2:-.9,u1:1.75,f1:1.75,dy:11}:{...P,lean:.25,t1:1.4,s1:-.3,t2:.9,s2:-.9,u1:.6,f1:2.4,dy:11};
  if(k==='aereo')return{...P,t1:fase==='su'?1:2,s1:fase==='su'?-.6:2,t2:.6,s2:-1.3,lean:-.35,u1:2.4,f1:2.6};
  if(k==='tripla')return fase==='su'?{...P,u1:.4,f1:2.6,lean:-.1}:fase==='col'?{...P,t1:2.2,s1:2.4,lean:-.55,t2:-.1,s2:0,u1:2.6,f1:2.8,dy:-6}:{...P,t1:.9,s1:.6};
  if(k==='rotante')return fase==='col'?{...P,t1:1.65,s1:1.65,lean:-.4,t2:-.2,s2:0,gira:1,dy:-4}:fase==='su'?{...P,lean:.3,t1:.6}:{...P,t1:.9,s1:.6};
  if(k==='schianto')return fase==='su'?{...P,u1:3,f1:3.1,u2:2.9,f2:3,lean:-.2,rosso:1}:fase==='col'?{...P,u1:1.2,f1:1,u2:1.1,f2:.9,lean:.7,dy:4}:{...P,u1:.6,f1:.4,lean:.5};
  if(k==='sputo')return fase==='su'?{...P,lean:-.35,hd:-.4,bocca:1}:{...P,lean:.35,hd:.25,bocca:1,verde:1};
  if(k==='urlo')return{...P,lean:-.3,hd:-.5,bocca:1,u1:2.4,f1:2.7,u2:2.2,f2:2.6,urlo:fase!=='su'};
  if(k==='balzo')return fase==='su'?{...P,dy:P.dy+3,rosso:1}:{...P,dy:P.dy-8,lean:(P.lean||0)+.2};
  if(k==='carica')return fase==='su'?{...P,lean:-.1,dy:3,rosso:1}:{...P,lean:.65,u1:1.6,f1:1.6,u2:1.5,f2:1.5,t1:.9,s1:.3,t2:-.6,s2:-.2};
  return P;}
function arnFighter(x,F,zom,T){const g=ARN.g;const P=arnPosa(F,zom,T);const sc=zom?g.zl.s:1;const d=F.dir;const X=arnPX(F.x);
  x.save();x.translate(X,AGY);x.scale(sc*1.2,sc*1.2);
  x.fillStyle='#00000066';x.beginPath();x.ellipse(0,0,16-Math.min(8,F.y/8),4,0,0,7);x.fill();x.translate(0,-F.y);
  if(P.ko){x.rotate(-d*1.45);x.translate(0,-6);}
  if(P.gira)x.scale(Math.cos(F.act.t*28)<0?-1:1,1);
  if(F.inv>0&&!zom)x.globalAlpha=.55;
  const pelle=zom?g.zl.pelle:g.pelle,maglia=zom?g.zl.maglia:g.col,pant=zom?'#3b3346':'#24315e',scuro=c=>c;
  const hip=[0,-34+P.dy];
  const legL=10,legS=12;
  // gamba e braccio dietro
  const back=(c)=>{x.globalAlpha*=.82;c();x.globalAlpha/=.82;};
  back(()=>{const k=arnLimb(x,hip[0],hip[1],P.t2,legL+3,6,pant,d);arnLimb(x,k[0],k[1],P.s2,legS+3,5,pant,d);x.fillStyle='#111';x.fillRect(k[0]+Math.sin(P.s2)*(legS+3)*d-3,k[1]+Math.cos(P.s2)*(legS+3)-2,7,3);});
  const top=[hip[0]+Math.sin(P.lean)*22*d,hip[1]-Math.cos(P.lean)*22];
  const sh=[hip[0]+Math.sin(P.lean)*19*d,hip[1]-Math.cos(P.lean)*19];
  back(()=>{const e=arnLimb(x,sh[0],sh[1],P.u2,10,5,zom?pelle:maglia,d);const h=arnLimb(x,e[0],e[1],P.f2,10,4,pelle,d);x.fillStyle=pelle;x.fillRect(h[0]-2,h[1]-2,4,4);});
  // busto
  x.lineCap='butt';x.strokeStyle='#0a0612';x.lineWidth=14;x.beginPath();x.moveTo(hip[0],hip[1]);x.lineTo(top[0],top[1]);x.stroke();
  x.strokeStyle=maglia;x.lineWidth=12;x.beginPath();x.moveTo(hip[0],hip[1]);x.lineTo(top[0],top[1]);x.stroke();
  if(zom){x.fillStyle=pelle;x.fillRect(hip[0]-2*d,hip[1]-12,4,4);x.fillStyle='#8a1c1c';x.fillRect(hip[0]+1*d,hip[1]-7,2,2);}else{x.fillStyle='#ffffff55';x.fillRect(top[0]-1,top[1]+3,2,10);}
  x.fillStyle='#111';x.fillRect(hip[0]-6,hip[1]-2,12,3);
  // gamba davanti
  const k1=arnLimb(x,hip[0],hip[1],P.t1,legL+3,6,pant,d);const f1=arnLimb(x,k1[0],k1[1],P.s1,legS+3,5,pant,d);x.fillStyle='#111';x.fillRect(f1[0]-3,f1[1]-2,7,3);
  // testa
  const hx=top[0]+Math.sin(P.lean+P.hd)*7*d,hy=top[1]-Math.cos(P.lean+P.hd)*7;
  x.fillStyle='#0a0612';x.fillRect(hx-7,hy-8,14,15);x.fillStyle=P.rosso&&Math.floor(T*12)%2?'#ff4d4d':pelle;x.fillRect(hx-6,hy-7,12,13);
  if(zom){x.fillStyle='#2a3a1a';x.fillRect(hx-6,hy-7,12,3);x.fillRect(hx-6+(d>0?0:9),hy-4,3,3);x.fillStyle='#ff2a2a';x.fillRect(hx+2*d-1,hy-2,2,2);x.fillRect(hx+5*d-1,hy-2,2,2);
    x.fillStyle=P.bocca?'#5a0000':'#3a1a1a';x.fillRect(hx+2*d-(d>0?0:4),hy+2,P.bocca?6:4,P.bocca?3:1);if(P.bocca){x.fillStyle='#fff';x.fillRect(hx+3*d-(d>0?0:3),hy+2,1,1);x.fillRect(hx+5*d-(d>0?0:3),hy+2,1,1);}
    const tp=g.d.zombie.tipo;
    if(tp==='re'){x.fillStyle='#ffd23f';x.fillRect(hx-6,hy-11,12,3);x.fillRect(hx-6,hy-13,2,2);x.fillRect(hx-1,hy-13,2,2);x.fillRect(hx+4,hy-13,2,2);}
    else if(tp==='soldato'){x.fillStyle='#3d4a24';x.fillRect(hx-8,hy-10,16,5);x.fillRect(hx-7,hy-12,14,2);}
    else if(tp==='operaio'){x.fillStyle='#ffd23f';x.fillRect(hx-8,hy-10,16,4);x.fillRect(hx-6,hy-12,12,2);}
    else if(tp==='clown'){x.fillStyle='#ff3d3d';x.fillRect(hx+5*d-1,hy,3,3);x.fillStyle='#3df2ff';x.fillRect(hx-9,hy-9,4,6);x.fillRect(hx+5,hy-9,4,6);}
    else if(tp==='strega'){x.fillStyle='#1a1a24';x.fillRect(hx-9,hy-9,18,2);x.fillRect(hx-5,hy-14,10,5);x.fillRect(hx-3,hy-18,6,4);x.fillRect(hx-1,hy-21,3,3);}
    else if(tp==='urlatrice'){x.fillStyle='#d9d9d9';x.fillRect(hx-7*d-(d>0?2:0),hy-7,3,16);x.fillRect(hx-7,hy-9,14,3);}
    else if(tp==='dottore'){x.fillStyle='#e8e8e8';x.fillRect(hx-6,hy+3,12,2);x.fillStyle='#9fd3ff';x.fillRect(hx+1*d-(d>0?0:6),hy-3,6,2);}
    else if(tp==='cane'){x.fillStyle=pelle;x.fillRect(hx-6+(d>0?-2:10),hy-11,3,5);x.fillRect(hx+(d>0?1:5),hy-11,3,5);}}
  else{x.fillStyle='#2a1a0a';x.fillRect(hx-6,hy-7,12,4);x.fillRect(hx-6+(d>0?0:9),hy-4,3,4);x.fillStyle='#e8212e';x.fillRect(hx-7,hy-4,14,2);x.fillRect(hx-7*d-(d>0?2:0),hy-4,2,6);
    x.fillStyle='#111';x.fillRect(hx+3*d-1,hy-1,2,2);x.fillStyle='#8a3a2a';x.fillRect(hx+2*d-(d>0?0:2),hy+3,3,1);}
  // braccio davanti
  const e1=arnLimb(x,sh[0],sh[1],P.u1,10,5,zom?pelle:maglia,d);const h1=arnLimb(x,e1[0],e1[1],P.f1,10,4,pelle,d);
  x.fillStyle='#0a0612';x.fillRect(h1[0]-3,h1[1]-3,6,6);x.fillStyle=zom?pelle:'#e8212e';x.fillRect(h1[0]-2,h1[1]-2,4,4);
  if(zom&&P.u1>1.2){x.fillStyle='#e8e8c8';x.fillRect(h1[0]+2*d,h1[1]-2,2,1);x.fillRect(h1[0]+2*d,h1[1],2,1);x.fillRect(h1[0]+2*d,h1[1]+2,2,1);}
  if(P.stelle){for(let i=0;i<3;i++){const a=T*6+i*2.1;x.fillStyle='#ffe66d';x.fillRect(hx+Math.cos(a)*9-1,hy-12+Math.sin(a)*3-1,3,3);}}
  if(P.urlo){x.strokeStyle='#ffffffaa';x.lineWidth=1;for(let i=1;i<4;i++){const r=((T*60+i*10)%30)+6;x.beginPath();x.arc(hx+6*d,hy+2,r,-.6,.6);if(d<0){x.beginPath();x.arc(hx+6*d,hy+2,r,Math.PI-.6,Math.PI+.6);}x.stroke();}}
  if(P.fuoco){for(let i=0;i<8;i++){x.fillStyle=['#ffe66d','#ff9f1c','#ff3d00'][i%3];const r=3+((i*7+Math.floor(T*30))%5);x.fillRect(h1[0]-r/2+Math.sin(i+T*20)*3,h1[1]-i*3-r,r,r);}}
  x.restore();}
function arnDraw(T){const g=ARN.g,c=g.cv,M=g.ctx,x=g.o;if(!c.width)return;
  {const r=c.parentNode.getBoundingClientRect();if(r.width+'x'+r.height!==g.sz)arnSize();} // il telefono girato: rimisura sempre (su iPhone il resize arriva prima della nuova misura)
  x.imageSmoothingEnabled=false;x.drawImage(g.bg,0,0);
  // insegna al neon che lampeggia e fuoco del bidone
  const on=g.rid||Math.floor(T*3)%7!==0;x.fillStyle=on?'#ff3df2':'#5a1a5a';x.font='bold 11px monospace';x.textAlign='left';x.fillText('ZOMBIE BAR',40,AGY-96);
  x.strokeStyle=on?'#ff3df2':'#5a1a5a';x.strokeRect(36,AGY-108,78,15);x.fillStyle=on?'#3df2ff':'#1a4a5a';x.fillText('24H',300,AGY-60);
  for(let i=0;i<6;i++){x.fillStyle=['#ffe66d','#ff9f1c','#ff3d00'][i%3];const r=3+((i*5+Math.floor(T*12))%4);x.fillRect(22+((i*5)%10)+Math.sin(T*9+i)*2,AGY-36-i*3-r,r,r);}
  const p=g.p,z=g.z;(p.act?[z,p]:[p,z]).forEach(F=>arnFighter(x,F,F===z,T));
  g.fx.forEach(f=>{x.globalAlpha=Math.min(1,f.t*3);if(f.k==='num'){x.font='bold 13px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText(f.s,f.x+1,f.y+1);x.fillStyle=f.cl==='me'?'#ff4d4d':f.cl==='blk'?'#9fd3ff':f.cl==='sp'?'#ff9f1c':'#ffe66d';x.fillText(f.s,f.x,f.y);}
    else if(f.k==='pow'){x.font='bold 16px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText(f.s,f.x+2,f.y+2);x.fillStyle=Math.floor(f.t*20)%2?'#ff3d00':'#ffe66d';x.fillText(f.s,f.x,f.y);}
    else if(f.k==='dust'){x.fillStyle='#b9a68a';x.fillRect(f.x,f.y,3,3);}
    else{x.fillStyle=f.k==='goo'?(Math.random()<.5?'#7ad13a':'#c0ff4a'):f.k==='blk'?'#9fd3ff':(Math.random()<.5?'#ffffff':'#ffe66d');x.fillRect(f.x,f.y,2,2);}x.globalAlpha=1;});
  (g.proj||[]).forEach(q=>{const X=arnPX(q.x);x.fillStyle='#0a0612';x.fillRect(X-4,AGY-55,8,6);x.fillStyle='#9be23a';x.fillRect(X-3,AGY-54,6,4);x.fillStyle='#c0ff4a';x.fillRect(X-4*q.dir-1,AGY-53,3,2);});
  if(g.txt){x.font='bold 18px monospace';x.textAlign='center';x.fillStyle='#000';x.fillText(g.txt.t,ALW/2+2,62);x.fillStyle='#ffe66d';x.fillText(g.txt.t,ALW/2,60);}
  if(g.flash>0){x.fillStyle='#ffffff55';x.fillRect(0,0,ALW,ALH);}
  // ingrandimento a pixel, con le bande nere
  M.imageSmoothingEnabled=false;const sky=M.createLinearGradient(0,0,0,c.height);sky.addColorStop(0,'#12062a');sky.addColorStop(.7,'#4a1250');sky.addColorStop(1,'#160a24');M.fillStyle=sky;M.fillRect(0,0,c.width,c.height);
  const a=arnPX(g.p.x),b=arnPX(g.z.x),mid=(a+b)/2,dist=Math.abs(a-b);
  // orizzontale: i lottatori interi nella parte alta (terreno al 62% dell'altezza), i tasti sotto non li coprono
  const rr=c.getBoundingClientRect(),kd=c.width/Math.max(1,rr.width),vh=document.documentElement.clientHeight||innerHeight;const Hv=Math.max(60,Math.min(rr.height,vh-Math.max(0,rr.top)))*kd;
  const oriz=c.width>Hv;const sT=oriz?Math.min(Hv*.6/112,c.width/(dist+190)):Math.min(c.height/(ALH*.62),c.width/(dist+150));g.cs=g.cs?g.cs+(sT-g.cs)*.08:sT;const s=g.cs,w=ALW*s,h=ALH*s;
  let ox=c.width/2-mid*s;if(w>c.width)ox=Math.min(0,Math.max(c.width-w,ox));else ox=(c.width-w)/2;
  if(g.shake>0)ox+=(Math.random()-.5)*10;const oy=(oriz?Hv*.62-AGY*s:c.height-h)+(g.shake>0?(Math.random()-.5)*6:0);M.drawImage(g.off,ox,oy,w,h);
  if(oy+h<c.height){M.fillStyle='#160a24';M.fillRect(0,oy+h,c.width,c.height-oy-h);}
  if(w<c.width){M.fillStyle='#160a24';M.fillRect(0,oy+(AGY-14)*s,ox,c.height);M.fillRect(ox+w,oy+(AGY-14)*s,c.width-ox-w,c.height);}}
async function arnFine(esito){const g=ARN.g;if(!g||g.fine)return;g.fine=true;cancelAnimationFrame(g.raf);let r=null;
  try{const{data,error}=await SB.rpc('world_scontro_fine',{p_id:g.id,p_esito:esito,p_colpi:g.colpi});if(error)throw error;r=data;}catch(e){r={ok:false,msg:'Collegamento perso: lo scontro non è stato salvato'};}
  const v=r&&r.vinto;const res=g.A.querySelector('.arnres')||document.createElement('div');res.className='arnres';
  res.innerHTML=`<div class="arnrc"><b class="disp">${v?'🏆 Vittoria!':esito==='abbandonato'?'🏃 Sei scappato':'💀 Sconfitta'}</b>
    ${v?`<p>${r.ic||g.d.zombie.ic} ${esc(r.nome||'')} abbattuto${r.nuovo?' · 📖 nuovo nella Zombipedia':''}</p><div class="arnpremi"><span>⭐ +${r.xp} XP</span>${r.legno?`<span>🪵 +${r.legno}</span>`:''}${r.cibo?`<span>🥫 +${r.cibo}</span>`:''}${r.carb?`<span>⛽ +${r.carb}</span>`:''}${r.mattoni?`<span>🧱 +${r.mattoni}</span>`:''}</div>${r.case_difese?`<p class="arncasa">🏠 Zombie vicino a casa: +2 alla difesa ${r.case_difese>1?'di '+r.case_difese+' tue case':'della tua casa'} per l’orda delle ${esc(r.orda||'')}:00</p>`:''}${r.salito?`<p>🎖️ Sei salito al grado ${r.grado}!</p>`:''}`
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
