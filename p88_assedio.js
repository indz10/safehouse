<script>
/* =========================================================
   🧟 ASSEDIO A LIVELLI (migrazione 024, scelta di Alessandro 16/11: "un gioco più strutturato") — prende il posto di
   "Difendi la casa" (p86: difOpen ora apre l'Assedio).
   1) 🗺️ La strada dei livelli (assOpen): ogni livello ha da 0 a 3 ⭐; vinci per aprire il successivo.
   2) Prima dell'ondata PIAZZI le difese sul campo (5 colonne × 6 righe, la casa in fondo) con le provviste del livello:
      🪵 barricata (ferma gli zombie finché non la rompono), 🔫 torretta (spara da sola), 💣 mina (esplode al passaggio).
      Ogni zombie abbattuto dà +3 provviste: puoi piazzare altre difese anche durante l'ondata.
   3) L'ondata: gli zombie scendono lungo le colonne verso la casa; toccali per colpirli. Se arrivano alla casa le tolgono vita.
      ⭐⭐⭐ casa intatta · ⭐⭐ almeno metà vita · ⭐ vinta.
   4) 🛠️ Potenziamenti per sempre (🪵 + 🧱): torretta, barricata, mina, casa. 💣 bomba e 🛡️ scudo della Bottega valgono anche qui.
   Server: world_assedio_info / _inizia / _bomba / _fine / _potenzia (premi e controlli decisi lì).
   ========================================================= */
const ASS={d:null,t:0,on:false,fase:'',id:null,P:null,Z:[],D:[],raf:0,t0:0,last:0,casa:10,casa0:10,prov:0,uccisi:0,spawned:0,next:0,sel:'barricata',up:{},bombe:0,fine:false,liv:1};
const ASS_C=5,ASS_R=6;
const ASS_D={barricata:['🪵','Barricata',20,'ferma gli zombie finché non la rompono'],torretta:['🔫','Torretta',35,'spara da sola agli zombie vicini'],mina:['💣','Mina',15,'esplode quando uno zombie ci passa sopra']};
const ASS_UP=[['torretta','🔫','Torretta','spara più forte (+1 danno per livello)'],['barricata','🪵','Barricata','più robusta (+3 resistenza per livello)'],['mina','💣','Mina','più potente (+2 danno per livello)'],['casa','🏠','Casa','più vita (+2 per livello)']];
const assUp=k=>Math.min(3,Math.max(0,+((ASS.up||{})[k])||0));
async function assLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return ASS.d;if(!force&&ASS.d&&Date.now()-ASS.t<30000)return ASS.d;ASS.t=Date.now();
  try{const{data,error}=await SB.rpc('world_assedio_info');if(!error&&data&&data.ok)ASS.d=data;}catch(e){}return ASS.d;}
function assRoot(){let r=document.getElementById('assedio');if(!r){r=document.createElement('div');r.id='assedio';document.body.appendChild(r);document.documentElement.classList.add('difesa-on');}return r;}
function assClose(){ASS.on=false;cancelAnimationFrame(ASS.raf);const r=document.getElementById('assedio');if(r)r.remove();document.documentElement.classList.remove('difesa-on');}
const assStars=n=>'⭐'.repeat(n)+'<i>☆</i>'.repeat(3-n);
/* ---------- 1) la strada dei livelli ---------- */
async function assOpen(){if(!S.user){toast('Accedi per giocare');try{loginSheet();}catch(e){}return;}try{closeSheet();}catch(e){}try{zmClose();}catch(e){}
  const r=assRoot();r.innerHTML='<div class="asshead"><p><span class="spin"></span></p></div>';const d=await assLoad(true);
  if(!d){r.innerHTML=`<div class="asshead"><button class="difx" data-assx>✕</button><b class="disp">Assedio</b><p>Il gioco arriva dopo l’aggiornamento del server (blocco SQL 024).</p></div>`;r.querySelector('[data-assx]').onclick=assClose;return;}
  ASS.up=d.up||{};const max=d.max_liv||0;const N=Math.max(6,max+4);const gratis=d.partite===0;
  const nodi=Array.from({length:N},(_,i)=>{const L=i+1,st=+((d.stelle||{})[L])||0,open=L<=max+1;return`<button class="assnodo ${open?'':'chiuso'} ${L===max+1?'qui':''}" data-assl="${L}" ${open?'':'disabled'} style="margin-left:${[8,38,62,38,8,24][i%6]}%"><b>${open?L:'🔒'}</b><span>${open?assStars(st):''}</span></button>`;}).reverse().join('');
  r.innerHTML=`<div class="asshead"><button class="difx" data-assx aria-label="Chiudi">✕</button><b class="disp">🧟 Assedio</b>
      <p>Difendi la casa livello dopo livello: <b>piazza le difese</b>, poi resisti all’ondata. ⭐ ${d.tot_stelle} stelle · livello ${max+1} da fare</p>
      <div class="difinfo"><span>🔋 ${d.energia} energia</span><span>💣 ${d.bombe}</span><span>🛡️ ${d.scudi}</span><span>${gratis?'🎁 prima partita gratis':'1 energia a partita'}</span></div>
      <div class="assbtns"><button class="btn small" data-assup>🛠️ Potenziamenti</button><button class="btn small ghost" data-asshelp>❓ Come si gioca</button></div></div>
    <div class="assstrada">${nodi}</div>`;
  r.querySelector('[data-assx]').onclick=assClose;r.querySelector('[data-assup]').onclick=assUpSheet;r.querySelector('[data-asshelp]').onclick=assHelp;
  r.querySelectorAll('[data-assl]').forEach(b=>b.onclick=()=>assIntro(+b.dataset.assl));
  const q=r.querySelector('.assnodo.qui');if(q)q.scrollIntoView({block:'center'});}
function assHelp(){const r=assRoot();r.insertAdjacentHTML('beforeend',`<div class="difres asshelp"><b>❓ Come si gioca</b>
  <span>1. Scegli una difesa in basso e tocca una casella del campo per piazzarla (costa provviste).</span>
  <span>2. Premi <b>▶️ Via!</b>: gli zombie scendono verso la tua casa 🏠.</span>
  <span>3. Le difese lavorano da sole; tu tocca gli zombie per colpirli. Ogni zombie abbattuto dà +3 provviste.</span>
  <span>4. ⭐⭐⭐ se la casa resta intatta. I livelli vinti aprono i successivi e danno premi veri.</span>
  <div><button class="btn small" data-asshok>Ho capito</button></div></div>`);r.querySelector('[data-asshok]').onclick=e=>e.target.closest('.difres').remove();}
function assIntro(L){const d=ASS.d||{};const st=+((d.stelle||{})[L])||0;const r=assRoot();
  const z=Math.min(60,6+2*L);const tipi=['🧟 lenti'].concat(L>=3?['🧟‍♂️ veloci']:[]).concat(L>=5?['🧟‍♀️ bruti (6 colpi)']:[]);
  r.insertAdjacentHTML('beforeend',`<div class="difres"><b>Livello ${L}</b><span>${assStars(st)}</span><span>${z} zombie: ${tipi.join(', ')}</span><span>🧰 ${60+5*L} provviste per le difese</span>
    ${st?'<span class="muted">Già fatto: rigiocarlo dà meno premi, ma puoi prendere le stelle che mancano.</span>':`<span>Premio: ⭐ esperienza, scorte${st===0?' e 🧱 la prima volta':''}</span>`}
    ${d.scudi?'<label class="difsc"><input type="checkbox" id="assScudo"> 🛡️ Usa uno scudo (+3 vita alla casa)</label>':''}
    <div><button class="btn small" data-assgo>▶️ Gioca${d.partite===0?' · gratis':' (1 energia)'}</button><button class="btn small ghost" data-assno>Indietro</button></div></div>`);
  r.querySelector('[data-assno]').onclick=e=>e.target.closest('.difres').remove();
  r.querySelector('[data-assgo]').onclick=e=>{e.target.disabled=true;assStart(L,!!(r.querySelector('#assScudo')||{}).checked);};}
/* ---------- 2) la partita ---------- */
async function assStart(L,scudo){let d=null;try{const{data,error}=await SB.rpc('world_assedio_inizia',{p_liv:L,p_scudo:scudo});if(error)throw error;d=data;}catch(e){toast('Non riuscito: riprova');return;}
  if(!d.ok){toast(d.msg);assOpen();return;}const P=d.piano;
  Object.assign(ASS,{on:true,fase:'prepara',id:d.id,P,Z:[],D:[],casa:d.casa,casa0:d.casa,prov:P.provviste,uccisi:0,spawned:0,next:0,up:d.up||{},bombe:d.bombe||0,fine:false,liv:L,last:0,sel:'barricata'});
  const r=assRoot();r.innerHTML=`<div class="assbar"><span class="assvita"></span><b class="asslv">Livello ${L}</b><span class="assprov"></span></div>
    <div class="assmsg">Piazza le difese: scegli in basso e tocca una casella. Poi ▶️ Via!</div>
    <div class="asscampo"><div class="assgrid">${Array.from({length:ASS_R*ASS_C},(_,i)=>`<div class="asscell" data-c="${i}"></div>`).join('')}</div><div class="asscasa">🏠</div></div>
    <div class="asstray">${Object.entries(ASS_D).map(([k,v])=>`<button data-assd="${k}" class="${k===ASS.sel?'on':''}"><span>${v[0]}</span><small>${v[1]} · ${v[2]}</small></button>`).join('')}
      <button class="assvia" data-assvia>▶️ Via!</button><button class="assbomb" data-assbomb hidden>💣 ${ASS.bombe}</button></div>`;
  r.querySelectorAll('[data-assd]').forEach(b=>b.onclick=()=>{ASS.sel=b.dataset.assd;r.querySelectorAll('[data-assd]').forEach(x=>x.classList.toggle('on',x===b));});
  r.querySelectorAll('.asscell').forEach(c=>c.addEventListener('pointerdown',e=>{e.preventDefault();assPlace(+c.dataset.c);}));
  r.querySelector('[data-assvia]').onclick=()=>{ASS.fase='onda';ASS.t0=performance.now();ASS.next=0;r.querySelector('[data-assvia]').hidden=true;const bb=r.querySelector('[data-assbomb]');bb.hidden=!ASS.bombe;bb.onclick=assBomb;
    r.querySelector('.assmsg').textContent='Tocca gli zombie! Puoi piazzare altre difese con le provviste.';try{sfx&&sfx('zombie');}catch(e){}};
  assPaint();ASS.raf=requestAnimationFrame(assLoop);}
function assPlace(i){if(!ASS.on)return;const col=i%ASS_C,row=Math.floor(i/ASS_C);const v=ASS_D[ASS.sel];if(ASS.D.some(x=>x.col===col&&x.row===row)){toast('Casella già occupata');return;}
  if(ASS.prov<v[2]){toast('Provviste finite: abbatti zombie per averne altre');return;}ASS.prov-=v[2];
  const hp=ASS.sel==='barricata'?6+3*assUp('barricata'):1;ASS.D.push({k:ASS.sel,col,row,hp,hp0:hp,cd:0});assPaint();}
function assPaint(){const r=document.getElementById('assedio');if(!r||!r.querySelector('.assgrid'))return;
  r.querySelector('.assvita').innerHTML=`🏠 ${'❤️'.repeat(Math.max(0,Math.ceil(ASS.casa/2)))}<small>${Math.max(0,ASS.casa)}/${ASS.casa0}</small>`;r.querySelector('.assprov').textContent=`🧰 ${ASS.prov}`;
  r.querySelectorAll('.asscell').forEach(c=>{const i=+c.dataset.c,col=i%ASS_C,row=Math.floor(i/ASS_C);const d=ASS.D.find(x=>x.col===col&&x.row===row);
    c.innerHTML=d?`<span>${ASS_D[d.k][0]}</span>${d.k==='barricata'?`<i style="width:${Math.round(d.hp/d.hp0*100)}%"></i>`:''}`:'';});
  const bb=r.querySelector('[data-assbomb]');if(bb){bb.textContent='💣 '+ASS.bombe;bb.disabled=!ASS.bombe;}}
function assSpawn(G){const P=ASS.P;const r=Math.random();const k=r<P.bruti?'bruto':r<P.bruti+P.corridori?'corridore':'lento';
  const hp=(k==='bruto'?6:k==='corridore'?1:2)+P.hp_extra;const v=k==='bruto'?.32:k==='corridore'?.95:.5;
  const el=document.createElement('button');el.type='button';el.className='assz k-'+k;el.innerHTML=`<span>${k==='bruto'?'🧟‍♀️':k==='corridore'?'🧟‍♂️':'🧟'}</span><i></i>`;G.appendChild(el);
  /* colonna libera in alto, così non si sovrappongono */const libere=[0,1,2,3,4].filter(c=>!ASS.Z.some(o=>!o.dead&&o.col===c&&o.y<.6));const col=libere.length?libere[Math.floor(Math.random()*libere.length)]:Math.floor(Math.random()*ASS_C);
  const z={el,k,col,y:-.8,hp,hp0:hp,v,stop:false,dead:false};
  el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();assHit(z,1);});ASS.Z.push(z);ASS.spawned++;}
function assHit(z,dmg){if(z.dead||!ASS.on||ASS.fase!=='onda')return;z.hp-=dmg;z.el.classList.remove('hit');void z.el.offsetWidth;z.el.classList.add('hit');
  if(z.hp<=0){z.dead=true;ASS.uccisi++;ASS.prov+=3;z.el.innerHTML='<span>💥</span>';z.el.classList.add('morto');setTimeout(()=>z.el.remove(),350);assPaint();}}
function assLoop(now){if(!ASS.on)return;const r=document.getElementById('assedio');const G=r&&r.querySelector('.asscampo');if(!G){ASS.on=false;return;}
  const dt=Math.min(.05,(now-(ASS.last||now))/1000);ASS.last=now;const cw=G.clientWidth/ASS_C,ch=G.querySelector('.assgrid').clientHeight/ASS_R;
  if(ASS.fase==='onda'){const t=(now-ASS.t0)/1000;
    if(ASS.spawned<ASS.P.zombie&&t>=ASS.next){assSpawn(G);ASS.next=t+ASS.P.intervallo*(.7+Math.random()*.6);}
    ASS.Z.forEach(z=>{if(z.dead)return;const b=ASS.D.find(d=>d.k==='barricata'&&d.col===z.col&&d.row-z.y>0&&d.row-z.y<=1);
      if(b){b.hp-=dt*(z.k==='bruto'?2:1);if(b.hp<=0){ASS.D=ASS.D.filter(x=>x!==b);assPaint();}else if(Math.random()<.05)assPaint();}
      else z.y+=z.v*dt;
      const m=ASS.D.find(d=>d.k==='mina'&&d.col===z.col&&Math.abs(d.row-z.y)<.4);
      if(m){ASS.D=ASS.D.filter(x=>x!==m);const dmg=4+2*assUp('mina');ASS.Z.forEach(o=>{if(!o.dead&&Math.abs(o.col-m.col)<=1&&Math.abs(o.y-m.row)<=1.2)assHit(o,dmg);});G.classList.remove('boom');void G.offsetWidth;G.classList.add('boom');assPaint();}
      if(z.y>=ASS_R-.2&&!z.dead){z.dead=true;z.el.remove();ASS.casa-=z.k==='bruto'?3:2;r.classList.remove('colpo');void r.offsetWidth;r.classList.add('colpo');try{navigator.vibrate&&navigator.vibrate(90);}catch(e){}assPaint();}
      if(!z.dead)z.el.style.transform=`translate(${Math.round(z.col*cw+cw/2-26)}px,${Math.round(z.y*ch)}px)`;});
    /* torrette */
    ASS.D.forEach(d=>{if(d.k!=='torretta')return;d.cd-=dt;if(d.cd>0)return;let best=null,bd=9;ASS.Z.forEach(z=>{if(z.dead)return;const dd=Math.hypot(z.col-d.col,z.y-d.row);if(dd<2.6&&dd<bd){bd=dd;best=z;}});
      if(best){d.cd=.9;assHit(best,1+assUp('torretta'));const c=r.querySelector(`.asscell[data-c="${d.row*ASS_C+d.col}"]`);if(c){c.classList.remove('spara');void c.offsetWidth;c.classList.add('spara');}}});
    ASS.Z=ASS.Z.filter(z=>!z.dead||z.el.isConnected);
    if(ASS.casa<=0){assEnd(false);return;}
    if(ASS.spawned>=ASS.P.zombie&&ASS.Z.every(z=>z.dead)){assEnd(true);return;}}
  ASS.raf=requestAnimationFrame(assLoop);}
async function assBomb(){if(!ASS.on||ASS.fase!=='onda'||!ASS.bombe)return;try{const{data,error}=await SB.rpc('world_assedio_bomba',{p_id:ASS.id});if(error||!data||!data.ok){toast((data&&data.msg)||'Non riuscito');return;}ASS.bombe=data.bombe;}catch(e){return;}
  const G=document.querySelector('#assedio .asscampo');if(G){G.classList.remove('boom');void G.offsetWidth;G.classList.add('boom');}ASS.Z.forEach(z=>assHit(z,99));assPaint();}
async function assEnd(vinto){if(ASS.fine)return;ASS.fine=true;ASS.on=false;cancelAnimationFrame(ASS.raf);
  const st=vinto?(ASS.casa>=ASS.casa0?3:ASS.casa>=ASS.casa0/2?2:1):0;let res=null;
  try{const{data,error}=await SB.rpc('world_assedio_fine',{p_id:ASS.id,p_vinto:vinto,p_stelle:st,p_uccisi:ASS.uccisi});if(error)throw error;res=data;}catch(e){}
  RES.t=0;try{resLoad(true);supLoad(true);wMine(true);}catch(e){}ASS.t=0;await assLoad(true);
  const r=document.getElementById('assedio');if(!r)return;const g=res&&res.ok?[res.legno?'🪵 +'+res.legno:'',res.cibo?'🥫 +'+res.cibo:'',res.carb?'⛽ +'+res.carb:'',res.mattoni?'🧱 +'+res.mattoni:''].filter(Boolean).join(' '):'';
  r.insertAdjacentHTML('beforeend',`<div class="difres"><b>${vinto?'🏆 Livello '+ASS.liv+' superato!':'💀 La casa è caduta'}</b><span class="assst">${assStars(st)}</span><span>💥 ${ASS.uccisi} zombie</span>
    ${res&&res.ok?`<span>⭐ +${res.xp} esperienza${g?' · '+g:''}</span>`:''}${res&&res.salito?`<span>🎖️ Sei salito al grado ${res.grado}!</span>`:''}
    ${!vinto?'<span class="muted">Consiglio: metti le 🪵 barricate davanti alle 🔫 torrette, e potenzia la casa.</span>':''}
    <div>${vinto?`<button class="btn small" data-assnext>▶️ Livello ${ASS.liv+1}</button>`:`<button class="btn small" data-assre>🔁 Riprova</button>`}<button class="btn small ghost" data-assmap>🗺️ Livelli</button></div></div>`);
  const nx=r.querySelector('[data-assnext]');if(nx)nx.onclick=()=>{assOpen().then(()=>assIntro(ASS.liv+1));};
  const re=r.querySelector('[data-assre]');if(re)re.onclick=()=>{assOpen().then(()=>assIntro(ASS.liv));};r.querySelector('[data-assmap]').onclick=assOpen;try{sfx&&sfx(vinto?'win':'lose');}catch(e){}}
/* ---------- 4) potenziamenti ---------- */
async function assUpSheet(){const d=await assLoad(true)||{};ASS.up=d.up||{};const r=assRoot();
  r.insertAdjacentHTML('beforeend',`<div class="difres assup"><b>🛠️ Potenziamenti</b><span class="muted">Valgono per sempre in tutti i livelli. Hai 🪵 ${d.legno||0} e 🧱 ${d.mattoni||0}.</span>
    ${ASS_UP.map(([k,ic,n,ds])=>{const l=assUp(k),nx=l+1;return`<div class="assuprow"><span>${ic}</span><div><b>${n} ${'●'.repeat(l)}${'○'.repeat(3-l)}</b><small>${ds}</small></div>${l<3?`<button class="btn small" data-assu="${k}">🪵 ${20*nx} · 🧱 ${30*nx}</button>`:'<small>max</small>'}</div>`;}).join('')}
    <div><button class="btn small ghost" data-assuok>Chiudi</button></div></div>`);
  const box=r.querySelector('.assup');box.querySelector('[data-assuok]').onclick=()=>{box.remove();assOpen();};
  box.querySelectorAll('[data-assu]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_assedio_potenzia',{p_k:b.dataset.assu});if(error)throw error;toast(data.msg);if(data.ok){try{wMine(true);resLoad(true);}catch(e){}}}catch(e){toast('Non riuscito');}box.remove();assUpSheet();});}
/* ---------- al posto di "Difendi la casa" ---------- */
difOpen=assOpen;
difGdItems=function(I){if(!S.user)return;const d=ASS.d;if(d&&d.partite>=20)return;const gr=!d||d.partite===0;
  I.push({p:gr?48:22,ic:'🧟',t:gr?`Assedio: livello ${(d&&d.max_liv||0)+1}, la prima partita di oggi è gratis`:`Assedio: livello ${(d&&d.max_liv||0)+1}`,why:'Piazza le difese intorno alla casa e resisti all’ondata: stelle, esperienza, scorte e 🧱.',acts:[{b:'▶️ Gioca',run:async()=>{assOpen();return{skip:1};}}]});};
zEvery(()=>{try{if(document.hidden||!S.user||!['mappa','orda','social'].includes(S.tab))return;if(Date.now()-ASS.t>120000)assLoad();}catch(e){}},10000,'assedio');
</script>
