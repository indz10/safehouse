<script>
/* =========================================================
   🗺️ MONDO = SOLO LA MAPPA · 🧑 IO = LA TUA ORDA E LE TUE COSE (Fase 33, richiesta di Alessandro 17/11, nessun SQL)
   - Mondo: niente più menu a riquadri. Sulla mappa: in alto la barra dell'orda (🛡️ Prepara) e le scorte con il tasto
     🏠 (le tue case); a destra i tasti piccoli 🏙️ 3D · 🚩 Presidi · 🤝 Alleati (= tutto il tab Amici + aiuta) · 🔎 Cerca;
     il tasto 📷 Lente com'era. La barra in alto si rimette da sola se manca (ioHud).
   - Io: la pagina dell'Orda di prima (renderHub) con in cima il superstite e i riquadri (superstite, case, scorte,
     Bottega, condividi, regole, menu) e sotto "L'orda del mondo" (prepara, fortifica, guarda l'assalto, ultima orda,
     simula, le mie case). Tolti: il giro di oggi, il fronte (gli zombie e il 3D sono sulla mappa), premi e missioni.
   - Premi automatici (ioAuto, all'apertura e ogni 10 minuti): riscatto dell'orda (world_raid_claim), premio del giorno,
     giri di ruota, gratta e vinci e barattolo pieno → un solo avviso "🎁 Premi riscattati".
   ========================================================= */
const IO={last:0,busy:false};
/* ---------- 🗺️ la mappa con i tasti ---------- */
function ioHud(){if(S.tab!=='mappa'||typeof sbOk!=='function'||!sbOk())return;const w=app.querySelector('.mapfull');if(!w)return;
  if(!w.querySelector('.mwtop')){try{w.insertAdjacentHTML('afterbegin',mwTopHTML('mappa'));mwTopBind(w);}catch(e){}}
  const sc=w.querySelector('.mwtop .mwscorte');if(sc&&!sc.querySelector('[data-iohome]')){sc.insertAdjacentHTML('afterbegin','<button class="iohome" data-iohome type="button" aria-label="Le mie case">🏠</button>');
    sc.querySelector('[data-iohome]').addEventListener('click',e=>{e.stopPropagation();window.SHEET_BACK=null;casasSheet();},true);}
  if(!w.querySelector('.iobtns')){w.insertAdjacentHTML('beforeend',`<div class="iobtns"><button data-iob="3d" type="button">🏙️<small>3D</small></button><button data-iob="pres" type="button">🚩<small>Presidi</small></button><button data-iob="ally" type="button">🤝<small>Alleati</small></button><button data-iob="cerca" type="button">🔎<small>Cerca</small></button><button data-iob="casse" type="button">📦<small>Casse</small></button></div>`);
    w.querySelectorAll('[data-iob]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.iob;
      if(k==='3d'){const t=w.querySelector('.lm-3d');if(t)t.click();else toast('🏙️ Il 3D arriva quando la mappa è pronta');}
      else if(k==='pres')presList5(window.__mf);else if(k==='casse')zmVicino();else if(k==='ally')sbGo('amici');else cercaLuogo();});}}
zEvery(()=>{try{if(!document.hidden)ioHud();}catch(e){}},1000,'mondo-tasti');
/* i tasti in basso: Mondo = solo la mappa, Io = la pagina dell'orda */
const _sbGoIo=sbGo;sbGo=function(k){if(k==='mondo'){try{zmClose();}catch(e){}closeSheet();if(S.tab!=='mappa'){S.zv='mondo';go('mappa');}else{try{trrFit();}catch(e){}}return;}
  if(k==='io'){try{zmClose();}catch(e){}closeSheet();if(S.tab!=='orda'){S.zv='mondo';go('orda');}else{try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}}return;}
  return _sbGoIo.apply(this,arguments);};
/* ---------- 🧑 Io: il superstite e i riquadri in cima alla pagina dell'orda ---------- */
function ioHead(){const d=(typeof SUP!=='undefined'&&SUP.d)||null;const rk=typeof supRank==='function'?supRank(d?d.grado:1):['','🧑','Superstite',''];
  const head=d?`<div class="sbme"><span>${rk[1]}</span><div><b>@${esc((S.user&&S.user.nick)||'tu')} · ${rk[2]} · grado ${d.grado}</b><small>🔋 Energia ${d.energia}/${d.energia_max}: ogni azione del superstite ne usa 1, si ricarica da sola</small><div class="sbbar"><span style="width:${Math.round(d.energia/Math.max(1,d.energia_max)*100)}%"></span></div></div></div>`:'';
  const tiles=[sbTile('sup','🎖️','Il mio superstite','grado, abilità, attrezzi, serie',d&&d.punti),sbTile('case','🏠','Le mie case','fortificazioni e % di tenere'),
    sbTile('scorte','🎒','Le mie scorte','🧱 🪵 🥫 ⛽ e a cosa servono'),sbTile('shop','🛒','Bottega','mezzi, energia, bombe, scudi, mercato'),sbTile('share','📣','Condividi','fatti conoscere sui social'),
    sbTile('regole','📚','Come si gioca','tutte le regole'),sbTile('menu','☰','Tutto il menu','impostazioni, notifiche, account')];
  return`<div class="iotop"><h2 class="disp">🧑 Io</h2>${head}<div class="sbtiles">${tiles.join('')}</div><h3 class="disp iosec">🧟 L’orda e le tue case</h3></div>`;}
const IO_ACT={sup:()=>supSheet('io'),case:()=>casasSheet(),scorte:()=>trrScorteSheet(),shop:()=>shopSheet(0),share:()=>shareSheet(),regole:()=>openSheet('📚 Tutte le regole',rulesHTML()),menu:()=>zmOpen()};
function ioPage(){if(S.tab!=='orda'||typeof sbOk!=='function'||!sbOk())return;const pg=app.querySelector('.page.orda1');if(!pg)return;document.body.classList.add('iopage');
  let h=pg.querySelector('.iotop');const html=ioHead();if(!h){pg.insertAdjacentHTML('afterbegin',html);h=pg.querySelector('.iotop');}else if(h.dataset.h!==html){h.outerHTML=html;h=pg.querySelector('.iotop');}
  if(h.dataset.h===html&&h._b)return;h.dataset.h=html;h._b=1;h.querySelectorAll('[data-sbt]').forEach(b=>b.onclick=()=>{const f=IO_ACT[b.dataset.sbt];if(f){window.SHEET_BACK=null;f();}});}
const _renderHubIo=renderHub;renderHub=function(){const r=_renderHubIo.apply(this,arguments);try{ioPage();}catch(e){}return r;};
zEvery(()=>{try{if(!document.hidden){document.body.classList.toggle('iopage',S.tab==='orda'&&typeof sbOk==='function'&&sbOk());ioPage();}}catch(e){}},1500,'io-pagina');
/* ---------- 🛡️ aiuta un alleato (dal tab Amici e dal tasto 🤝 della mappa) ---------- */
function ioAiuta(){openSheet('🛡️ Aiuta un alleato',`<p class="muted" style="font-size:13px;margin:0 0 8px">Manda rinforzi per la prossima orda: +difesa a lui, 🧱 e 🥫 a te. Se è troppo lontano ti proponiamo un 📦 pacco.</p><div class="alsbox"></div>`,c=>{
  const b=c.querySelector('.alsbox');const paint=()=>{b.innerHTML=alsHTML(ALS.L,false);alsBind(b);};paint();alsLoad(true).then(()=>{if(b.isConnected)paint();});});}
/* ---------- 🎁 premi automatici ---------- */
async function ioAuto(force){if(window.__noHello&&!window.__ioAuto)return;if(IO.busy||!S.user||typeof SB==='undefined'||!SB)return;if(!force&&Date.now()-IO.last<10*60*1000)return;IO.busy=true;IO.last=Date.now();const got=[];
  try{await orLoad(true);const s=(typeof OR!=='undefined'&&OR.s)||{};
    if(s.total>0&&!s.claimed){const{data}=await SB.rpc('world_raid_claim');if(data&&data.ok){G.spins=(G.spins||0)+1;got.push(`🌙 Orda: 🧱 +${data.mattoni+6*data.held}${typeof resTxt==='function'?resTxt(data):''}`);try{wMine(true);orLoad(true);}catch(e){}}}}catch(e){}
  try{const s=dailyState();if(s&&!s.claimed){DAILY[s.next-1].f(G);G.streak={day:s.next,last:s.today};got.push(`📅 Premio del giorno: ${DAILY[s.next-1].t}`);}}catch(e){}
  for(let k=0;k<3&&((G.spins||0)>0||(G.scratch||0)>0);k++){
  try{let n=0;while((G.scratch||0)>0&&n<10){n++;G.scratch--;if(Math.random()<.4){const p=SCR[Math.floor(Math.random()*SCR.length)];p[2](G);got.push(`🎟️ Gratta e vinci: ${p[1]}`);}}}catch(e){}
  try{const tw=WHEEL.reduce((a,x)=>a+x.w,0);let n=0;while((G.spins||0)>0&&n<10){n++;G.spins--;let r=Math.random()*tw,i=0;for(;i<WHEEL.length;i++){r-=WHEEL[i].w;if(r<=0)break;}const w=WHEEL[Math.min(i,WHEEL.length-1)];
      if(w.k==='mat')giveMattoni(w.v,'Ruota');if(w.k==='gems')G.gems+=w.v;if(w.k==='scratch')G.scratch=(G.scratch||0)+w.v;if(w.k==='spins')G.spins=(G.spins||0)+w.v;
      got.push(`🎡 Ruota: ${w.ic} ${w.k==='mat'?w.v+' Mattoni':w.k==='gems'?w.v+' gemme':w.k==='scratch'?'1 gratta e vinci':'1 giro in più'}`);}}catch(e){}
  }
  try{const tot=jarTotal(),goal=(G.jar&&G.jar.goal)||60;if(tot>=goal){const all=(G.friends||[]).every(f=>G.jar.fr[f.id]);const m=all?2:1;giveMattoni(20*m,'Barattolo');G.gems+=10*m;
      G.jar={goal:Math.round(G.jar.goal*1.25),mine:0,fr:{},round:G.jar.round+1};got.push(`🫙 Barattolo: 🧱 ${20*m}`);}}catch(e){}
  try{saveLocal();}catch(e){}IO.busy=false;
  if(got.length){try{sfx('coin');}catch(e){}if(!document.querySelector('#sheet.open')&&!document.getElementById('lente'))openSheet('🎁 Premi riscattati',`<p class="muted" style="margin:0 0 8px">Li prendiamo noi per te ogni volta che apri il gioco.</p><ul class="ioprem">${got.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><button class="btn wide" data-iook>👍 Ok</button>`,c=>c.querySelector('[data-iook]').onclick=()=>closeSheet());
    else toast('🎁 '+got.join(' · '));}}
zEvery(()=>{try{if(!document.hidden&&S.user&&typeof sbOk==='function'&&sbOk())ioAuto();}catch(e){}},5000,'premi-automatici');
document.addEventListener('visibilitychange',()=>{if(!document.hidden)IO.last=Math.min(IO.last,Date.now()-9*60*1000);});
</script>
