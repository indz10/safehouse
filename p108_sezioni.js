<script>
/* 🧭 SEZIONI E ⏳ MISSIONI (Fase 54, migrazione 047)
   Barra in fondo con 5 tasti: 🗺️ Mappa · 📷 Lente · 🧑 Superstite · 🏠 Casa · 👥 Amici (le chiavi restano mondo/gioca/sup/io/amici).
   ⏳ Missioni: tutte le attività a tempo in un elenco (world_missioni) con meta, tempo che manca, ora di fine e 💎 per finire subito. */
const MIS={L:[],t:0,cfg:null};
async function misLoad(forza){if(!S.user||typeof SB==='undefined'||!SB)return MIS.L;if(!forza&&Date.now()-MIS.t<30000)return MIS.L;MIS.t=Date.now();
  try{const{data,error}=await SB.rpc('world_missioni');if(!error&&data&&data.ok){MIS.cfg=data.cfg;MIS.L=(data.missioni||[]).map(m=>({...m,fineMs:Date.now()+(m.secondi||0)*1000}));}}catch(e){}return MIS.L;}
function misPronte(){return(MIS.L||[]).filter(m=>m.pronto||(m.tipo!=='arrivo'&&m.fineMs<=Date.now())).length;}
function misT(s){s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h} h ${m} min`:m?`${m} min ${x<10?'0':''}${x} s`:`${x} s`;}
function misOra(ms){return new Date(ms).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});}
function misRiga(m,i){const left=(m.fineMs-Date.now())/1000;const fatto=m.pronto||left<=0;
  const act=m.tipo==='spedizione'&&fatto?`<button class="btn small" data-misgo="${i}">📦 Raccogli</button>`
    :m.tipo==='scontro'&&fatto?`<button class="btn small" data-misgo="${i}">⚔️ Combatti</button>`
    :m.tipo==='arrivo'?`<button class="btn small ghost" data-misgo="${i}">🛡️ Prepara</button>`
    :fatto?'<b class="misok">✅ Fatto</b>':m.gemme!=null?`<button class="btn small ghost" data-missub="${i}">💎 ${m.gemme} · Finisci ora</button>`:'';
  const pct=m.inizio&&m.fine?Math.min(100,Math.max(0,(Date.now()-new Date(m.inizio))/(new Date(m.fine)-new Date(m.inizio))*100)):0;
  return`<div class="misrow ${fatto?'ok':''} ${m.tipo==='arrivo'?'warn':''}"><span class="misic">${m.ic||'⏳'}</span><div class="misb"><b>${esc(m.titolo||'')}</b><small>${esc(m.meta||'')}</small>
    <div class="misbar"><i style="width:${fatto?100:pct}%"></i></div><small data-misleft="${i}">${fatto?(m.tipo==='scontro'?'arrivato: lo zombie ti aspetta':'finito'):`⏱️ ${misT(left)} · fine alle ${misOra(m.fineMs)}`}</small></div><div class="misact">${act}</div></div>`;}
async function misSheet(){await misLoad(true);await (typeof gemLoad==='function'?gemLoad():null);const L=MIS.L;
  const saldo=(typeof GEM!=='undefined'&&GEM.d&&GEM.d.gemme)||0;
  const h=`<p class="muted" style="font-size:13px;margin:0 0 8px">Tutto quello che sta andando avanti da solo. Puoi continuare a giocare: ti avviso quando finisce. Con 💎 lo finisci subito (1 💎 ogni ${(MIS.cfg&&MIS.cfg.min_per_gemma)||6} minuti); il risultato segue le regole normali. Hai 💎 ${saldo}.</p>`+
    (L.length?`<div class="mislist">${L.map(misRiga).join('')}</div>`:'<p style="text-align:center;margin:18px 0">Niente in corso.<br><small class="muted">Avvia uno sviluppo, una spedizione o manda il superstite verso uno zombie.</small></p>')+
    `<div class="rrow" style="margin-top:10px"><button class="btn ghost small" data-misshop>💎 Negozio gemme</button><button class="btn ghost small" data-missup>🧑 Il mio superstite</button></div>`;
  openSheet('⏳ Missioni in corso',h,c=>{
    c.querySelectorAll('[data-missub]').forEach(b=>b.onclick=()=>misSubito(L[+b.dataset.missub],b));
    c.querySelectorAll('[data-misgo]').forEach(b=>b.onclick=()=>{const m=L[+b.dataset.misgo];closeSheet();
      if(m.tipo==='spedizione')supSheet('sped');else if(m.tipo==='scontro')arnVai(m.id,m.ic);else if(m.tipo==='arrivo')pvpVaiBox();});
    c.querySelector('[data-misshop]').onclick=()=>{closeSheet();gemSheet();};c.querySelector('[data-missup]').onclick=()=>{closeSheet();supSheet('io');};
    const iv=setInterval(()=>{if(!document.body.contains(c)){clearInterval(iv);return;}L.forEach((m,i)=>{const el=c.querySelector(`[data-misleft="${i}"]`);if(!el)return;const left=(m.fineMs-Date.now())/1000;
      if(left>0&&!m.pronto)el.textContent=`⏱️ ${misT(left)} · fine alle ${misOra(m.fineMs)}`;else if(!el.dataset.fin){el.dataset.fin=1;misSheet();}});},1000);});}
async function misSubito(m,b){await gemLoad();const s=(GEM.d&&GEM.d.gemme)||0;const costo=m.gemme;
  if(s<costo){if(confirm(`Servono 💎 ${costo}, ne hai ${s}. Aprire il negozio delle gemme?`)){closeSheet();gemSheet();}return;}
  if(!confirm(`${m.ic} ${m.titolo}\nFinire subito per 💎 ${costo}?\nTi resteranno 💎 ${s-costo}.${m.tipo==='attacco'?'\nL’attacco arriva comunque fra 5 minuti.':''}\nIl risultato segue le regole normali.`))return;
  b.disabled=true;let r=null;
  try{const q=m.tipo==='scontro'?SB.rpc('world_scontro_subito',{p_id:m.id,p_costo_visto:costo}):SB.rpc('world_completa_subito',{p_tipo:m.tipo,p_id:m.id,p_costo_visto:costo});
    const{data,error}=await q;if(error)throw error;r=data;}catch(e){toast('Non riuscito: riprova');b.disabled=false;return;}
  if(!r.ok&&r.costo&&r.costo!==costo&&s>=r.costo&&confirm(`Il costo ora è 💎 ${r.costo}. Confermi?`)){try{const q=m.tipo==='scontro'?SB.rpc('world_scontro_subito',{p_id:m.id,p_costo_visto:r.costo}):SB.rpc('world_completa_subito',{p_tipo:m.tipo,p_id:m.id,p_costo_visto:r.costo});const{data}=await q;r=data;}catch(e){}}
  toast(r.msg||(r.ok?'💎 Fatto':'Non riuscito'));gemLoad();try{if(m.tipo==='scontro')arnMiei(true);if(m.tipo==='sup'&&typeof svLoad==='function')svLoad();}catch(e){}misSheet();}
/* ---------- i 5 tasti ---------- */
const _sbBadges54=sbBadges;sbBadges=function(){const b=_sbBadges54.apply(this,arguments);const g=b.gioca||0,io=b.io||0;
  const nz=typeof ZM!=='undefined'&&ZM.L?ZM.L.filter(z=>!z.preso&&z.k==='zombie').length:0;
  return{gioca:g,sup:io+misPronte()+((typeof supReady==='function'?supReady():0)),io:(MIS.L||[]).filter(m=>m.tipo==='arrivo').length,amici:b.amici||0,nz};};
sbHTML=function(){const b=sbBadges();const on=k=>(k==='mondo'&&S.tab==='mappa')||(k==='io'&&S.tab==='orda')||(k==='amici'&&S.tab==='social')?'on':'';
  const B=(k,ic,n)=>`<button data-sb="${k}" class="${on(k)}"><span>${ic}</span><b>${n}</b>${b[k]?`<i>${b[k]}</i>`:''}</button>`;
  return B('mondo','🗺️','Mappa')+B('gioca','📷','Lente')+B('sup','🧑','Superstite')+B('io','🏠','Casa')+B('amici','👥','Amici');};
const _sbGo54=sbGo;sbGo=function(k){
  if(k==='gioca'){try{zmClose();}catch(e){}const ev=typeof EVT!=='undefined'?evtAperti().filter(e=>e.km!=null&&e.km<=e.raggio):[];const nz=typeof ZM!=='undefined'&&ZM.L?ZM.L.filter(z=>!z.preso&&z.k==='zombie').length:0;
    const sec=t=>`<h4 class="sbsec">${t}</h4>`;
    sbSheet('📷 Lente · fuori casa','<p class="muted" style="font-size:13px;margin:0 0 8px">Esci col telefono: zombie, casse e posti veri intorno a te. Di persona è gratis o quasi.</p>',
      [sbTile('lente','📷','Apri la Lente',nz?`${nz} zombie vicino a te`:'posti, zombie e casse intorno a te'),sbTile('zombie','🧟','Zombie qui intorno',nz?`${nz} da affrontare nell’arena`:'dove sono e quanto distano',nz),
       sbTile('casse','📦','Casse vicino a te','aprile di persona o manda il superstite'),sbTile('pedia','📖','Zombipedia','i 12 zombie da collezionare'),
       sec('🤝 Con gli altri'),sbTile('dfa','🛡️','Difendi casa nella Lente','torrette vere intorno alla tua casa'),
       sbTile('boss','👹','Boss della settimana',typeof BOSS!=='undefined'&&BOSS.d&&BOSS.d.ok?(BOSS.d.caduto?'abbattuto! il prossimo lunedì':`${Math.round(BOSS.d.hp/Math.max(1,BOSS.d.hp0)*100)}% di vita · con gli alleati`):'battetelo insieme agli alleati'),
       sbTile('evt','🚨','Eventi qui vicino',ev.length?`${ev.length} attivi ora`:'nessuno adesso: arrivano ogni ora',ev.length),sbTile('mv','❓','Come funziona il mondo','i 3 modi di giocare, spiegati')],
      {lente:()=>lenteOpen(),zombie:()=>zmRadarSheet(),casse:()=>zmVicino(),pedia:()=>zmPedia(),dfa:()=>dfaGo(),boss:()=>bossSheet(),mv:()=>mvSheet(),
       evt:()=>{if(ev.length)evtSheet(ev[0].id);else toast('🚨 Nessun evento qui vicino adesso: ti arriva la notifica quando compare');}});return;}
  if(k==='sup'){try{zmClose();}catch(e){}const d=(typeof SUP!=='undefined'&&SUP.d)||null;const p=(typeof SV!=='undefined'&&SV.d)||null;const ad=typeof ASS!=='undefined'&&ASS.d?ASS.d:null;
    const r=typeof supReady==='function'?supReady():0;const nm=(MIS.L||[]).filter(m=>m.tipo!=='arrivo').length,np=misPronte();const sec=t=>`<h4 class="sbsec">${t}</h4>`;
    const head=d?`<div class="sbme">${typeof svAvatar==='function'?svAvatar((p&&p.avatar)||{},false):'<span>🧑</span>'}<div><b>${esc((p&&p.nome)||('@'+((S.user&&S.user.nick)||'tu')))} · grado ${d.grado}</b><small>🔋 Energia ${d.energia}/${d.energia_max} · 💎 ${(typeof GEM!=='undefined'&&GEM.d&&GEM.d.gemme)||0}</small><div class="sbbar"><span style="width:${Math.round(d.energia/Math.max(1,d.energia_max)*100)}%"></span></div></div></div>`:'';
    sbSheet('🧑 Superstite',head,[sbTile('me','🎖️','Statistiche e sviluppi','vita, forza, difesa, agilità',d&&d.punti),sbTile('mis','⏳','Missioni in corso',nm?`${nm} in corso${np?` · ${np} finite`:''}`:'niente in corso',np),
       sbTile('mezzi','🚗','Mezzi','a piedi, bici, moto… cosa consumano'),sbTile('sped','🎒','Spedizioni',r?`${r} da raccogliere!`:'mandalo nei posti veri',r),
       sec('🎮 Allenamento'),sbTile('ass','🧟','Assedio',ad?`livello ${(ad.max_liv||0)+1} · ⭐ ${ad.tot_stelle||0}`:'difendi la casa livello dopo livello'),sbTile('sfida','🏆','Sfida del quartiere','classifica della settimana'),
       sec('💎 Negozio'),sbTile('gemme','💎','Negozio gemme','cambia gemme in scorte, finisci subito'),sbTile('shop','🛒','Bottega','mezzi, energia, bombe, scudi, mercato'),sbTile('scorte','🎒','Le mie scorte','🧱 🪵 🥫 ⛽ e a cosa servono'),
       sec('Altro'),sbTile('share','📣','Condividi','fatti conoscere sui social'),sbTile('regole','📚','Come si gioca','tutte le regole'),sbTile('menu','☰','Tutto il menu','impostazioni, notifiche, account')],
      {me:()=>supSheet('io'),mis:()=>misSheet(),mezzi:()=>supSheet('mezzi'),sped:()=>supSheet('sped'),ass:()=>assOpen(),sfida:()=>sfidaSheet(),gemme:()=>gemSheet(),shop:()=>shopSheet(0),
       scorte:()=>trrScorteSheet(),share:()=>shareSheet(),regole:()=>openSheet('📚 Tutte le regole',rulesHTML()),menu:()=>zmOpen()});return;}
  return _sbGo54.apply(this,arguments);};
zEvery(()=>{try{if(!document.hidden&&S.user)misLoad(false);}catch(e){}},10000,'missioni');
</script>
