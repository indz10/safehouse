<script>
/* =========================================================
   CREDITI CASA VERA + SFIDE TRA PROPRIETÀ (asincrone)
   - crediti: dalla casa vera verificata e dagli acquisti reali
     verificati presso gli sponsor (codice sullo scontrino)
   - sfida: scegli una tua proprietà; l'avversario è la difesa
     registrata di un altro giocatore con potenza simile;
     stessa orda per entrambi, vince chi resiste più ondate
   ========================================================= */
const CCV_CODES={'ZSH-PORTA':{n:'Porta blindata (SicurCasa Mantova)',c:150},'ZSH-ALLARME':{n:'Allarme con telecamere',c:120},'ZSH-GRATE':{n:'Grate su misura (Ferramenta Volta)',c:80},'ZSH10':{n:'Acquisto in ferramenta',c:40}};
const LEAGUES=[['Bronzo',0,'#a8743a'],['Argento',300,'#9aa4b0'],['Oro',700,'#f7d64a'],['Diamante',1300,'#9fd3e6'],['Leggenda',2200,'#d7263d']];
const DUEL_NICK=['bunkerboy','nonna_ninja','il_geometra','luna_rossa','fortezza_mn','zia_pina','vedetta','cascinaz','mister_grate','lago_blu','montanaro','tetto_sicuro'];
function ccvInit(){G.ccv=G.ccv||{bal:0,log:[],used:{}};G.trof=G.trof||0;G.duelLog=G.duelLog||[];
  if(G.via&&!G.ccv.used.via){const v=viatico();if(v){const c=v.ver*15+Math.max(0,8-Math.round(v.idx))*10;G.ccv.bal+=c;G.ccv.used.via=1;G.ccv.log.unshift({t:'Casa vera valutata',c});}}}
function league(t){let L=LEAGUES[0];LEAGUES.forEach(l=>{if(t>=l[1])L=l;});return L;}
function propPower(id){return propPower0(id)+(typeof custPower==='function'?custPower(id):0);}
function propPower0(id){
  if(id==='home')return Math.round(houseMaxHP()+barrierMax()*.6+hUp('grate')*25+hUp('luci')*15+hUp('vedetta')*20+hUp('energia')*10+Object.values(G.q).reduce((a,b)=>a+b*12,0)+G.level*6);
  const b=G.lots[id],l=LOTS.find(x=>x.id===id);if(!b||!l)return 0;
  const base={palazzo:120,villetta:90,casale:110,campo:70,barca:80,rifugio:120}[l.kind]||90;
  const t=tenOf(b);return Math.round(base+(b.fort||0)*45+(b.prep||1)*18+(b.lv||1)*20+(b.kind==='bld'?40+b.lv*15:0)+(t?t.lv*15:0));}
function myProps(){const out=[{id:'home',name:'Casa tua',kind:G.type,ic:'⭐'}];
  Object.entries(G.lots).forEach(([id,b])=>{const l=LOTS.find(x=>x.id===id);if(!l||b.owner)return;const t=tenOf(b);
    out.push({id,name:b.kind==='bld'?BLD[b.b].name:t&&t.type==='friend'?`Casa di @${t.f.nick}`:`${LOT_KIND[l.kind].n} in ${ZL[l.zone].toLowerCase()}`,kind:siteKindImg(l.kind),ic:b.kind==='bld'?BLD[b.b].ic:'🏠'});});
  return out.map(p=>({...p,pow:propPower(p.id)}));}
function duelTickets(){if(typeof dailyState==='function')dailyState();G.today=G.today||{};if(G.today.duels==null)G.today.duels=3;return G.today.duels;}
function sfideHTML(){
  ccvInit();const L=league(G.trof);const nx=LEAGUES[LEAGUES.indexOf(L)+1];
  return`<h3 style="margin:18px 0 8px">Arena ⚔️</h3>
   <div class="panel duelc"><div class="row spread"><div><span class="lg-badge" style="background:${L[2]}">${L[0]}</span> <b>${G.trof} coppe</b></div><small>${duelTickets()} sfide oggi</small></div>
     <p style="font-weight:400;font-size:14px;margin:8px 0">Sfida 1 contro 1 e Coppa del Quartiere settimanale: personalizza le tue case e mettile alla prova.</p>
     <button class="btn wide" id="toArena2">Entra nell’Arena</button></div>
   <div class="panel">
     <div class="row spread"><b>🏠 Crediti Casa Vera</b><b class="disp" style="font-size:26px">${G.ccv.bal}</b></div>
     <p style="font-weight:400;font-size:13px;margin:4px 0 8px">Li guadagni nel mondo reale: casa valutata e confermata con le foto, acquisti di sicurezza presso gli sponsor (codice sullo scontrino o foto del prodotto installato). Li spendi in atti di proprietà e potenziamenti.</p>
     <div class="row" style="gap:6px"><input class="field" id="ccvCode" placeholder="Codice dello scontrino, es. ZSH-PORTA" autocapitalize="characters" style="flex:1"><button class="btn small" id="ccvOk">Riscatta</button></div>
     <div class="row wrap" style="gap:6px;margin-top:8px"><button class="btn small alt" data-ccvbuy="deed" ${G.ccv.bal<60?'disabled':''}>Atto di proprietà · 60</button><button class="btn small ghost" data-ccvbuy="coins" ${G.ccv.bal<10?'disabled':''}>10 → 150 🪙</button></div>
     ${G.ccv.log.length?`<div class="dlog">${G.ccv.log.slice(0,4).map(x=>`<div>${x.c>0?'+':''}${x.c} · ${esc(x.t)}</div>`).join('')}</div>`:''}
     <p class="muted" style="font-size:11px;margin-top:6px">Anteprima: codici di prova ZSH-PORTA, ZSH-ALLARME, ZSH-GRATE, ZSH10. Ogni codice vale una sola volta.</p>
   </div>`;
}
function bindSfide(){
  const g=$('#toArena2');if(g)g.onclick=()=>{G.sub='arena';renderHub();window.scrollTo(0,0);};
  const ok=$('#ccvOk');if(ok)ok.onclick=()=>{const c=$('#ccvCode').value.trim().toUpperCase();const it=CCV_CODES[c];
    if(!it){toast('Codice non valido');return;}if(G.ccv.used[c]){toast('Codice già usato');return;}
    G.ccv.used[c]=1;G.ccv.bal+=it.c;G.ccv.log.unshift({t:it.n,c:it.c});sfx('coin');toast(`+${it.c} Crediti Casa Vera: ${it.n}`);renderHub();};
  app.querySelectorAll('[data-ccvbuy]').forEach(b=>b.onclick=()=>{const k=b.dataset.ccvbuy;
    if(k==='coins'){if(G.ccv.bal<10)return;G.ccv.bal-=10;G.coins+=150;G.ccv.log.unshift({t:'Cambio in monete',c:-10});renderHub();return;}
    if(G.ccv.bal<60)return;const free=LOTS.filter(l=>!G.lots[l.id]);if(!free.length){toast('Nessun edificio libero');return;}
    openSheet('Atto di proprietà',`<p class="muted" style="margin-bottom:8px">Scegli l’edificio da intestarti con 60 Crediti Casa Vera.</p>${free.slice(0,12).map(l=>`<button class="choice" data-deed="${l.id}"><span class="ci">🏠</span><span><b>${LOT_KIND[l.kind].n}</b><small>${ZL[l.zone]} · vale ${l.cost} 🪙</small></span><span class="cp">Prendi</span></button>`).join('')}`,
      card=>card.querySelectorAll('[data-deed]').forEach(x=>x.onclick=()=>{G.ccv.bal-=60;G.lots[x.dataset.deed]={kind:'house',lv:1,ten:null};G.ccv.log.unshift({t:'Atto di proprietà',c:-60});closeSheet();toast('Edificio intestato: scegli l’inquilino');renderHub();}));});
}
function duelPick(){
  const ps=myProps();
  openSheet('Scegli chi mandi in sfida',`<p class="muted" style="margin-bottom:8px">L’avversario avrà una potenza simile alla proprietà che scegli.</p>
    ${ps.sort((a,b)=>b.pow-a.pow).map(p=>`<button class="choice" data-dp="${p.id}"><span class="ci">${p.ic}</span><span><b>${esc(p.name)}</b><small>Potenza ${p.pow}</small></span><span class="cp">Sfida</span></button>`).join('')}`,
  card=>card.querySelectorAll('[data-dp]').forEach(b=>b.onclick=()=>{closeSheet();duelStart(ps.find(p=>p.id===b.dataset.dp));}));
}
function duelStats(pow,seed){const r=rng(seed);return{hp:Math.round(pow*.9),bar:Math.round(pow*.45),def:pow*.11*(.92+r()*.16),arm:Math.min(.45,pow/1600)};}
async function duelStart(me){
  if(duelTickets()<1)return;G.today.duels--;
  const seed=Math.floor(Math.random()*1e6);const r=rng(seed);
  const opp={nick:DUEL_NICK[Math.floor(r()*DUEL_NICK.length)],kind:['villa','apt','schiera','casale','barca','rifugio','camper'][Math.floor(r()*7)],pow:Math.round(me.pow*(.9+r()*.2))};
  opp.name=HTYPES[opp.kind]?HTYPES[opp.kind].name:'Casa';
  const A=duelStats(me.pow,seed+1),B=duelStats(opp.pow,seed+2);A.max=A.hp;B.max=B.hp;A.bmax=A.bar;B.bmax=B.bar;
  const imgA=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(gHouse(me.id==='home'?G.type:me.kind,me.id==='home'?G.h:{}))}`;
  const imgB=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(gHouse(opp.kind,{porta:1,grate:1}))}`;
  const side=(id,img,t,s)=>`<div class="dside" id="${id}"><img alt="" src="${img}"><div class="dinfo"><b>${t}</b><small>Potenza ${s}</small>
     <div class="hp"><span class="dh"></span></div><div class="hp" style="height:8px;margin-top:3px"><span class="db" style="background:#7c8794"></span></div><div class="dz"></div></div></div>`;
  app.innerHTML=`<div class="page duel">
    <div class="row spread"><b class="disp" style="font-size:26px">Sfida</b><span class="tag" id="dw">Ondata 0</span></div>
    ${side('dA',imgA,esc(me.name)+' (tu)',me.pow)}
    <div class="vs">VS</div>
    ${side('dB',imgB,'@'+esc(opp.nick)+' · '+opp.name,opp.pow)}
    <div class="row" style="gap:6px;margin-top:10px"><button class="btn small" data-di="fix">🔧 Ripara</button><button class="btn small" data-di="pet">💥 Petardo</button><button class="btn small" data-di="sir">📢 Sirena</button></div>
    <p class="muted" style="font-size:12px;margin-top:6px">Tre interventi, uno a testa per tutta la sfida. L’avversario usa i suoi in automatico: è la sua difesa registrata.</p>
    <div id="dres"></div></div>`;
  window.scrollTo(0,0);setMusic('game',6);
  const used={};let mod={dmg:1};
  app.querySelectorAll('[data-di]').forEach(b=>b.onclick=()=>{const k=b.dataset.di;if(used[k]||end)return;used[k]=1;b.disabled=true;sfx(k==='pet'?'boom':'tap');
    if(k==='fix'){A.hp=Math.min(A.max,A.hp+A.max*.3);A.bar=Math.min(A.bmax,A.bar+A.bmax*.3);}if(k==='pet')mod.pet=1;if(k==='sir')mod.sir=1;draw();});
  const oppUse={fix:3+Math.floor(r()*5),pet:2+Math.floor(r()*5),sir:4+Math.floor(r()*5)};
  let w=0,end=false,wA=0,wB=0;
  function hit(S,str,cut){let d=Math.max(0,str-S.def)*cut;if(S.bar>0){const t=Math.min(S.bar,d);S.bar-=t;d-=t;}S.hp-=d*(1-S.arm);}
  function draw(){[['dA',A],['dB',B]].forEach(([id,S])=>{const e=document.getElementById(id);if(!e)return;e.querySelector('.dh').style.width=Math.max(0,S.hp/S.max*100)+'%';e.querySelector('.db').style.width=Math.max(0,S.bar/S.bmax*100)+'%';e.classList.toggle('down',S.hp<=0);});}
  draw();
  const tick=()=>{if(end||!document.getElementById('dA'))return;w++;const str=14*Math.pow(1.2,w-1)*(.95+rng(seed+w)()*.1);
    $('#dw').textContent='Ondata '+w;
    const cA=(mod.pet===1?.6:1)*(mod.sir===1?.7:1);if(mod.pet===1)mod.pet=2;if(mod.sir===1)mod.sir=2;
    let cB=1;if(w===oppUse.pet)cB*=.6;if(w===oppUse.sir)cB*=.7;if(w===oppUse.fix&&B.hp>0){B.hp=Math.min(B.max,B.hp+B.max*.3);B.bar=Math.min(B.bmax,B.bar+B.bmax*.3);}
    if(A.hp>0){hit(A,str,cA);if(A.hp>0)wA=w;}if(B.hp>0){hit(B,str,cB);if(B.hp>0)wB=w;}
    ['dA','dB'].forEach(id=>{const z=document.querySelector('#'+id+' .dz');if(z)z.textContent='🧟'.repeat(Math.min(12,2+Math.floor(w/2)));});
    draw();sfx('crack');
    if(A.hp<=0&&B.hp<=0||A.hp<=0||B.hp<=0||w>=40){end=true;finish();return;}
    setTimeout(tick,S.duelFast?60:900);};
  setTimeout(tick,900);
  function finish(){
    let win=wA>wB||(wA===wB&&A.hp/A.max>=B.hp/B.max);const dt=win?25+Math.max(0,Math.round((opp.pow-me.pow)/10)):-12;
    const L0=league(G.trof)[0];G.trof=Math.max(0,G.trof+dt);const L1=league(G.trof)[0];if(win){G.gems+=5;G.coins+=60;}else G.coins+=20;
    G.duelLog.unshift({win,mine:me.name,opp:opp.nick,w1:wA,w2:wB,dt});sfx(win?'win':'lose');setMusic('app');
    $('#dres').innerHTML=`<div class="panel ${win?'moon':'night'}" style="margin-top:12px"><div class="sfx" style="font-size:34px;${win?'':'color:#d7263d'}">${win?'SFIDA VINTA!':'SFIDA PERSA'}</div>
      <p style="margin:6px 0">${esc(me.name)} ha resistito <b>${wA}</b> ondate, @${esc(opp.nick)} <b>${wB}</b>. ${win?`+${dt} coppe, +5 💎, +60 🪙`:`${dt} coppe, +20 🪙`}${L0!==L1?` · Nuova lega: <b>${L1}</b>`:''}</p>
      <p style="font-weight:400;font-size:13px">${win?'La tua difesa resta registrata: ora può essere sfidata dagli altri.':'Fortifica e addestra chi ci abita: la potenza conta più della fortuna.'}</p>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn small" id="dBack">Torna al quartiere</button>${duelTickets()>0?'<button class="btn small alt" id="dAgain">Nuova sfida</button>':''}</div></div>`;
    $('#dBack').onclick=()=>{G.view='hub';renderOrda();};const ag=$('#dAgain');if(ag)ag.onclick=()=>{G.view='hub';renderOrda();duelPick();};
    $('#dres').scrollIntoView({behavior:'smooth',block:'center'});}
}
</script>
