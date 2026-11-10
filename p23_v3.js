<script>
/* =========================================================
   MONDO v3 — semplice e unico
   - case dei superstiti simulati 🤖 (1 su 6, dichiarati)
   - alleati e rivali in tutto il mondo
   - orda su misura del livello, case comprabili ovunque
   - pagina Casa rifatta: la tua casa, l'orda, il tuo impero, sponsor veri
   - bottega (gemme e pass: acquisti veri quando l'app sarà negli store)
   ========================================================= */
/* md5 compatto: serve a riconoscere le case dei simulati come fa il server */
function md5hex(s){function L(x,c){return(x<<c)|(x>>>(32-c));}function A(x,y){const l=(x&0xFFFF)+(y&0xFFFF);return(((x>>16)+(y>>16)+(l>>16))<<16)|(l&0xFFFF);}
  function C(q,a,b,x,s,t){return A(L(A(A(a,q),A(x,t)),s),b);}function F(a,b,c,d,x,s,t){return C((b&c)|(~b&d),a,b,x,s,t);}function G2(a,b,c,d,x,s,t){return C((b&d)|(c&~d),a,b,x,s,t);}
  function H(a,b,c,d,x,s,t){return C(b^c^d,a,b,x,s,t);}function I(a,b,c,d,x,s,t){return C(c^(b|~d),a,b,x,s,t);}
  s=unescape(encodeURIComponent(s));const n=s.length,w=[];for(let i=0;i<n;i++)w[i>>2]|=s.charCodeAt(i)<<((i%4)*8);w[n>>2]|=0x80<<((n%4)*8);w[(((n+8)>>6)+1)*16-2]=n*8;
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878;for(let i=0;i<w.length;i+=16){const[oa,ob,oc,od]=[a,b,c,d];const x=k=>w[i+k]|0;
    a=F(a,b,c,d,x(0),7,-680876936);d=F(d,a,b,c,x(1),12,-389564586);c=F(c,d,a,b,x(2),17,606105819);b=F(b,c,d,a,x(3),22,-1044525330);a=F(a,b,c,d,x(4),7,-176418897);d=F(d,a,b,c,x(5),12,1200080426);c=F(c,d,a,b,x(6),17,-1473231341);b=F(b,c,d,a,x(7),22,-45705983);
    a=F(a,b,c,d,x(8),7,1770035416);d=F(d,a,b,c,x(9),12,-1958414417);c=F(c,d,a,b,x(10),17,-42063);b=F(b,c,d,a,x(11),22,-1990404162);a=F(a,b,c,d,x(12),7,1804603682);d=F(d,a,b,c,x(13),12,-40341101);c=F(c,d,a,b,x(14),17,-1502002290);b=F(b,c,d,a,x(15),22,1236535329);
    a=G2(a,b,c,d,x(1),5,-165796510);d=G2(d,a,b,c,x(6),9,-1069501632);c=G2(c,d,a,b,x(11),14,643717713);b=G2(b,c,d,a,x(0),20,-373897302);a=G2(a,b,c,d,x(5),5,-701558691);d=G2(d,a,b,c,x(10),9,38016083);c=G2(c,d,a,b,x(15),14,-660478335);b=G2(b,c,d,a,x(4),20,-405537848);
    a=G2(a,b,c,d,x(9),5,568446438);d=G2(d,a,b,c,x(14),9,-1019803690);c=G2(c,d,a,b,x(3),14,-187363961);b=G2(b,c,d,a,x(8),20,1163531501);a=G2(a,b,c,d,x(13),5,-1444681467);d=G2(d,a,b,c,x(2),9,-51403784);c=G2(c,d,a,b,x(7),14,1735328473);b=G2(b,c,d,a,x(12),20,-1926607734);
    a=H(a,b,c,d,x(5),4,-378558);d=H(d,a,b,c,x(8),11,-2022574463);c=H(c,d,a,b,x(11),16,1839030562);b=H(b,c,d,a,x(14),23,-35309556);a=H(a,b,c,d,x(1),4,-1530992060);d=H(d,a,b,c,x(4),11,1272893353);c=H(c,d,a,b,x(7),16,-155497632);b=H(b,c,d,a,x(10),23,-1094730640);
    a=H(a,b,c,d,x(13),4,681279174);d=H(d,a,b,c,x(0),11,-358537222);c=H(c,d,a,b,x(3),16,-722521979);b=H(b,c,d,a,x(6),23,76029189);a=H(a,b,c,d,x(9),4,-640364487);d=H(d,a,b,c,x(12),11,-421815835);c=H(c,d,a,b,x(15),16,530742520);b=H(b,c,d,a,x(2),23,-995338651);
    a=I(a,b,c,d,x(0),6,-198630844);d=I(d,a,b,c,x(7),10,1126891415);c=I(c,d,a,b,x(14),15,-1416354905);b=I(b,c,d,a,x(5),21,-57434055);a=I(a,b,c,d,x(12),6,1700485571);d=I(d,a,b,c,x(3),10,-1894986606);c=I(c,d,a,b,x(10),15,-1051523);b=I(b,c,d,a,x(1),21,-2054922799);
    a=I(a,b,c,d,x(8),6,1873313359);d=I(d,a,b,c,x(15),10,-30611744);c=I(c,d,a,b,x(6),15,-1560198380);b=I(b,c,d,a,x(13),21,1309151649);a=I(a,b,c,d,x(4),6,-145523070);d=I(d,a,b,c,x(11),10,-1120210379);c=I(c,d,a,b,x(2),15,718787259);b=I(b,c,d,a,x(9),21,-343485551);
    a=A(a,oa);b=A(b,ob);c=A(c,oc);d=A(d,od);}
  return[a,b,c,d].map(v=>{let h='';for(let j=0;j<4;j++)h+=('0'+((v>>(j*8))&255).toString(16)).slice(-2);return h;}).join('');}
const npcByte=bid=>parseInt(md5hex('npc'+bid).slice(0,2),16);
const isNpc=bid=>npcByte(bid)<42;
const NPC_N=['nonna_ninja','il_geometra','bunkerboy','luna_rossa','vedetta','zia_pina','mister_grate','cascinaz','tetto_sicuro','lampione','fortezza','spranga','ilfabbro','sentinella','orto_blindato','catenaccio'];
const npcNick=bid=>NPC_N[parseInt(md5hex('nick'+bid).slice(0,2),16)%NPC_N.length];
W_ST.npc=['🤖','Casa di un superstite simulato','#d9dde3'];
/* codice edificio da un anello del disegno della mappa (stesso calcolo del tocco) */
function wGidRing(R0){const R=R0.slice(0,-1);if(R.length<3)return null;let A=0,cx=0,cy=0;for(let i=0;i<R.length;i++){const[x1,y1]=R[i],[x2,y2]=R[(i+1)%R.length];const c=x1*y2-x2*y1;A+=c;cx+=(x1+x2)*c;cy+=(y1+y2)*c;}
  if(Math.abs(A)<1e-12){cx=R.reduce((a,p)=>a+p[0],0)/R.length;cy=R.reduce((a,p)=>a+p[1],0)/R.length;}else{cx/=3*A;cy/=3*A;}const la=+cy.toFixed(5),lo=+cx.toFixed(5);return{bid:'g'+la.toFixed(5)+'_'+lo.toFixed(5),lat:la,lon:lo};}
/* scheda: case dei simulati */
/* mappa: case dei simulati visibili da vicino */
function wDrawNpc(lm){try{const map=lm.map;(lm._npc||[]).forEach(x=>x.remove());lm._npc=[];if(map.getZoom()<15.6||!W.on)return;
  const taken=new Set((lm._wrows||[]).map(r=>r.building_id));const fs=map.queryRenderedFeatures({layers:['bld']});const seen=new Set();let n=0;
  for(const f of fs){const g=f.geometry;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
    for(const pl of polys){if(n>=40)break;const q=pl[0]&&wGidRing(pl[0]);if(!q||seen.has(q.bid)||taken.has(q.bid))continue;seen.add(q.bid);if(!isNpc(q.bid))continue;
      if(lm.m&&trM(q.lat,q.lon,lm.m.lat,lm.m.lon)<8)continue;n++;const el=elDiv('lm-w npc','<b>🤖</b>');el.addEventListener('click',e=>{e.stopPropagation();wSheet(q.bid,q.lat,q.lon);});
      lm._npc.push(new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([q.lon,q.lat]).addTo(map));}}}catch(e){}}
/* l'assalto colpisce anche i simulati della zona (esito uguale per tutti) */
/* ---- ALLEATI E RIVALI (tutto il mondo) ---- */
window.AL={help:[],riv:[],t:0};
async function alLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return;if(!force&&Date.now()-AL.t<60000)return;AL.t=Date.now();
  try{const a=await SB.rpc('world_help_list');if(!a.error)AL.help=a.data||[];const b=await SB.rpc('world_rivals');if(!b.error)AL.riv=b.data||[];}catch(e){}alRefresh();}
function alHTMLBase(){if(!S.user)return'';const s=OR.s||{};
  return`<div class="panel apan"><b class="disp" style="font-size:22px">🤝 Alleati e rivali</b>
   <p class="rtxt2">Tutto il mondo gioca insieme: aiuta chi chiede rinforzi (guadagni Mattoni), oppure manda un’orda a un rivale. I giocatori molto più deboli di te sono protetti.</p>
   <div class="rrow">${s.asked?`<span class="rok2">🆘 Aiuto chiesto · ${s.helpers||0} alleati · difesa ${s.next_bonus>=0?'+':''}${s.next_bonus||0}</span>`:`<button class="btn" data-ahelp>🆘 Chiedi aiuto per la prossima orda</button>`}</div>
   ${s.attacks_in?`<p class="notice" style="margin:8px 0">🧟 ${s.attacks_in} ${s.attacks_in===1?'rivale ti ha':'rivali ti hanno'} mandato un’orda: −${Math.min(16,8*s.attacks_in)} di difesa. Chiedi aiuto o preparati!</p>`:''}
   <h4 class="ah">🛡️ Chiedono aiuto (${AL.help.length})</h4>${AL.help.length?AL.help.slice(0,8).map(h=>`<div class="arow"><div><b>@${esc(h.nick)}</b><small>livello ${h.wlevel} · ${h.dist_km!=null?wNum(h.dist_km)+' km':'—'} · ${h.helpers} alleati</small></div>${h.mine_helped?'<span class="rok2">✔ aiutato</span>':`<button class="btn small" data-asend="${h.user_id}">Manda rinforzi</button>`}</div>`).join(''):'<p class="muted" style="font-size:12.5px">Nessuna richiesta ora.</p>'}
   <h4 class="ah">🧟 Rivali alla tua portata (${AL.riv.length})</h4>${AL.riv.length?AL.riv.slice(0,8).map(h=>`<div class="arow"><div><b>@${esc(h.nick)}</b><small>livello ${h.wlevel} · ${h.dist_km!=null?wNum(h.dist_km)+' km':'—'}</small></div>${h.attacked?'<span class="rko2">orda mandata</span>':`<button class="btn small ghost" data-aatk="${h.user_id}">Manda orda · 🧱30</button>`}</div>`).join(''):'<p class="muted" style="font-size:12.5px">Nessun rivale alla tua portata per ora: invita qualcuno!</p>'}
   <button class="btn ghost small" data-ainv style="margin-top:8px">📨 Invita qualcuno nel mondo</button></div>`;}
function alBindBase(){const p=app.querySelector('.apan');if(!p)return;const h=p.querySelector('[data-ahelp]');if(h)h.onclick=async()=>{h.disabled=true;try{const{data,error}=await SB.rpc('world_ask_help');if(error)throw error;toast('🆘 '+data.msg);}catch(e){toast(e.message||'Non riuscito');}await orLoad(true);alLoad(true);};
  p.querySelectorAll('[data-asend]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_send_help',{p_target:b.dataset.asend});if(error)throw error;toast((data.ok?'🛡️ ':'')+data.msg);if(typeof wMine==='function')wMine(true);}catch(e){toast(e.message||'Non riuscito');}alLoad(true);});
  p.querySelectorAll('[data-aatk]').forEach(b=>b.onclick=async()=>{if(!confirm('Mandare un’orda a questo rivale? Costa 30 Mattoni.'))return;b.disabled=true;try{const{data,error}=await SB.rpc('world_send_attack',{p_target:b.dataset.aatk});if(error)throw error;toast((data.ok?'🧟 ':'')+data.msg);if(typeof wMine==='function')wMine(true);}catch(e){toast(e.message||'Non riuscito');}alLoad(true);});
  const iv=p.querySelector('[data-ainv]');if(iv)iv.onclick=()=>inviteSheet();}
function alRefresh(){try{const p=app.querySelector('.apan');if(p){const n=document.createElement('div');n.innerHTML=alHTML();const np=n.firstElementChild;if(!np)return;np.dataset.grp=p.dataset.grp||'q';p.replaceWith(np);alBind();}}catch(e){}}
/* premi dell'orda: anche le taglie, e raddoppio monete con le gemme */
/* ---- BOTTEGA: gemme, pass, e cosa si fa con le gemme ---- */
function shopHTML(){return`<div class="panel spanx"><b class="disp" style="font-size:22px">💎 Bottega</b>
  <p class="rtxt2">Gemme e Pass si compreranno con un tocco quando l’app sarà su App Store e Google Play. Oggi le gemme si guadagnano giocando.</p>
  <div class="shopg">${[['💎 80','0,99 €'],['💎 450','4,99 €'],['💎 1.000','9,99 €']].map(([a,b])=>`<div><b>${a}</b><small>${b}</small><button class="btn small ghost" disabled>Presto</button></div>`).join('')}</div>
  <div class="passx"><b>⭐ Pass del Superstite · 4,99 €/mese</b><small>Case preparate in automatico a ogni orda · +20% affitti · 1 casa in più · premi doppi nelle missioni</small><button class="btn small ghost" disabled>Presto</button></div>
  <h4 class="ah">Cosa fai con le gemme, già oggi</h4><div class="shopu">
   <div><b>💰 10 💎 → 🪙 250</b><small>cambio in Potenzia</small></div><div><b>🔧 20 💎</b><small>ripara tutto durante una notte</small></div><div><b>✨ 5 💎</b><small>raddoppia le monete dell’ultima orda</small><button class="btn small" data-dbl ${G.gems>=5&&OR.s&&OR.s.claimed&&window.__dbl!==OR.s.prev_id?'':'disabled'}>Raddoppia</button></div></div></div>`;}

/* ---- PAGINA CASA, rifatta e pulita ---- */
function vNextSlot(){const n=new Date();for(const d of[0,1])for(const h of[9,21]){const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+d,h,0,0);if(t>n)return t;}return n;}
setInterval(()=>{document.querySelectorAll('[data-oleft]').forEach(e=>{e.textContent=orLeft((OR.s&&OR.s.next_at)||vNextSlot());});},20000);
renderHome=function(){const z=S.zone,Rr=S.result,m=W&&W.m,s=OR.s;const next=(s&&s.next_at)||vNextSlot();
  const hero=`<section class="hero2">${heroSVG()}<div class="h2t"><h1>Zombie<span>Safe House</span></h1></div><div class="boom sfx">GRRRAAH!</div></section>`;
  const sp=Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&g.lat!=null&&SPONSORS[k]);const near=z&&z.real?sp.map(([k,g])=>({k,d:trM(z.real.lat,z.real.lon,g.lat,g.lon)})).sort((a,b)=>a.d-b.d).slice(0,3):sp.slice(0,3).map(([k])=>({k,d:null}));
  const spons=near.length?`<div class="panel"><div class="row spread"><b class="disp" style="font-size:22px">⭐ Sponsor vicino a te</b><button class="btn ghost small" data-hmap>Mappa</button></div>${near.map(x=>`<button class="strow" data-hsp="${x.k}"><span class="splogo">${esc(SPONSORS[x.k].logo)}</span><div><b>${esc(SPONSORS[x.k].name)}</b><small>${esc(SP_CAT[x.k]||'Sponsor')}${x.d!=null?' · '+dist(Math.round(x.d)):''} · offerte e codici sconto</small></div></button>`).join('')}</div>`:'';
  let body;
  if(!Rr){body=`<div class="cta2"><div class="caption">Mezzanotte. La luna è piena. Quanto resiste la tua casa all’orda?</div>
     <button class="btn wide" data-go="valuta">📷 Valuta la mia casa</button><button class="btn alt wide" data-go="orda">🧟 Prova il gioco con una casa d’esempio</button><button class="btn ghost wide" data-howhome>❓ Come funziona</button></div>
    <div class="page dots"><div class="steps3">${[['📷','Valuti la tua casa vera','45 domande e foto: indice da 1 a 10 e cosa migliorare'],['🌍','Entri nel mondo vero','La tua casa è tua; compri case libere vicino o in Australia'],['🧟','Ogni 12 ore arriva l’orda','Prepari le case, guardi l’assalto, riscatti i premi']].map((x,i)=>`<div><span class="n">${i+1}</span><b>${x[0]} ${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div>${spons}${homeFoot()}</div>`;}
  else{const[g,col]=grade(Rr.idx);const live=orLive();
   body=`<div class="page dots">
    <div class="panel night hcard"><div class="row spread"><div><span class="bzc-cat">La tua casa</span><h3 style="color:#fff;margin:4px 0">${esc(z?z.address:'')}</h3><b style="color:${col}">${g}</b></div><div class="hidx">${fmtI(Rr.idx)}</div></div>
     <div class="hgrid"><div><b>${m?'🧱 '+wNum(m.mattoni):'🧱 …'}</b><small>Mattoni</small></div><div><b>${m?m.wlevel:'…'}</b><small>livello mondo</small></div><div><b>${m?1+m.houses.length:'…'}</b><small>case</small></div></div></div>
    <div class="panel rmini ${live?'live':''}"><div class="row spread"><b class="disp" style="font-size:22px">🧟 ${live?'Orda in corso!':'Prossima orda'}</b><span class="rtime">⏱ <span data-oleft>${orLeft(next)}</span></span></div>
     <div class="rrow" style="margin-top:8px">${s&&s.prepared?'<span class="rok2">✅ Case preparate</span>':'<button class="btn" data-hprep>🛡️ Prepara le case</button>'}${s&&s.total&&!s.claimed?'<button class="btn alt" data-hgo>🎁 Riscatta i premi</button>':''}<button class="btn ghost small" data-hwatch>👀 Guarda l’assalto</button></div></div>
    <div class="qact">${[['🌍','Il mio impero','orda'],['🗺️','Mappa del mondo','mappa'],['🤝','Alleati e rivali','orda'],['📷','La mia casa','valuta']].map(x=>`<button data-qa="${x[2]}"><span>${x[0]}</span>${x[1]}</button>`).join('')}</div>
    ${spons}
    <div class="panel moon"><b>📻 Radio Operatore</b><p style="font-weight:400;margin:4px 0 8px">Dubbi su punteggio, foto o privacy? Chiedi.</p><button class="btn small" data-go="radio">Apri la radio</button></div>
    ${homeFoot()}</div>`;}
  app.innerHTML=hero+body;bindGo&&bindGo();
  app.querySelectorAll('[data-hsp]').forEach(b=>b.onclick=()=>sponsorSheet(b.dataset.hsp,S.zone||{seed:7}));
  const hm=app.querySelector('[data-hmap]');if(hm)hm.onclick=()=>{S.zv='mondo';go('mappa');};
  const hw=app.querySelector('[data-howhome]');if(hw)hw.onclick=()=>openRules(0);
  const hp=app.querySelector('[data-hprep]');if(hp)hp.onclick=async()=>{if(!S.user){loginSheet();return;}hp.disabled=true;try{const{data,error}=await SB.rpc('world_prepare');if(error)throw error;toast('🛡️ '+data.msg);}catch(e){toast(e.message||'Non riuscito');}await orLoad(true);renderHome();};
  const hg=app.querySelector('[data-hgo]');if(hg)hg.onclick=()=>{G.sub='q';go('orda');};
  const hwt=app.querySelector('[data-hwatch]');if(hwt)hwt.onclick=()=>orWatch();
  app.querySelectorAll('[data-qa]').forEach(b=>b.onclick=()=>{const t=b.dataset.qa;if(t==='mappa')S.zv='mondo';if(t==='orda')G.sub='q';go(t);});
  /* dati dell'orda e del mondo: li chiedo UNA volta; ridisegno solo se sono arrivati davvero (niente cicli infiniti) */
  const now=Date.now();if(S.user&&(!OR.s||!W.m)&&now-(window.__homeAsk||0)>30000){window.__homeAsk=now;const had=[!!OR.s,!!W.m];
    Promise.all([OR.s?null:orLoad(true).catch(()=>{}),(W.m||typeof wMine!=='function')?null:wMine(true).catch(()=>{})]).then(()=>{if(S.tab==='home'&&((!had[0]&&OR.s)||(!had[1]&&W.m)))setTimeout(renderHome,50);});}};
function homeFoot(){return`<footer class="foot"><div class="disp" style="font-size:24px;color:var(--moon)">ZombieSafeHouse</div><p>La casa sicura, raccontata con un fumetto. Un marchio INDZ, nato in provincia di Mantova.</p>
  <div class="row wrap" style="gap:8px;margin-top:10px"><button class="btn small alt" data-go="contatti">Chi siamo e contatti</button><button class="btn small ghost" data-go="contatti" data-mot2="sponsor">Diventa sponsor</button></div><small>© 2026 INDZ</small></footer>`;}
/* manuale */
const _manualV3=manualHTML;manualHTML=function(){return _manualV3().replace('<details class="man"',`<details class="man"><summary>🤝 Alleati, rivali e simulati</summary><div class="man-b"><p><b>Chiedi aiuto</b> per la prossima orda: chiunque nel mondo può mandarti rinforzi (+5 di difesa ciascuno, fino a +20) e chi aiuta guadagna Mattoni. <b>Manda un’orda</b> a un rivale: costa 30 Mattoni, gli toglie 8 di difesa e, se la sua casa cade, prendi una taglia di 25 Mattoni. Chi è molto più debole di te (3 livelli sotto) è protetto.</p><p>L’orda è <b>su misura</b>: cresce con il tuo livello, così chi arriva dopo può crescere. Le case si comprano <b>ovunque</b>: il prezzo sale con la distanza da casa tua.</p><p>🤖 Circa una casa su sei è di un <b>superstite simulato</b>, un personaggio del gioco: si può comprare (+30%).</p></div></details><details class="man"`);};
</script>
<script>
/* la sezione con gli amici simulati non compare più (la fortuna resta) */
</script>
