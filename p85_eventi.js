<script>
/* =========================================================
   ⚡ EVENTI DAL VIVO · 🏆 SFIDA DEL QUARTIERE · 👉 UNA MOSSA ALLA VOLTA · 🏢 CONDOMINIO (Fase 23, migrazione 022)
   - Eventi a tempo sulla mappa vicino alle case (📦 cassa, 🚑 superstite ferito, 🧟 nido, ⭐ sponsor sotto assedio):
     segnaposto .lm-evt con il tempo che resta (evtMarks), scheda evtSheet → world_evento_azione (⚡ 1 a mossa,
     dentro il raggio del superstite); notifica "evento" dal giro di zsh-push (url ?evt=id).
   - 🏆 Sfida del quartiere (sfidaSheet → world_sfida_quartiere): linguetta nella scheda del superstite, carta nella guida.
   - 👉 ADESSO: il cassetto chiuso della Mappa mostra UNA sola carta (la prima di gdItems: eventi, casa da registrare,
     condominio, assalti, superstite, orda, premi…) con un pulsante; "Altre N cose" apre la guida 🧭.
   - 🏢 Condominio: se la casa è in un palazzo (altri residenti nello stesso edificio o edificio "apartments") e il tipo
     non è ancora scelto, carta in cima e scheda condoSheet (il mio appartamento + interno / stessa famiglia / casa singola).
   ========================================================= */
const EVT={L:[],t:0,mk:new Map(),mkMap:null,HI:null,hiT:0,SF:null,sfT:0};
const EVT_K={cassa:['📦','Rifornimento caduto','I primi 3 superstiti che arrivano si dividono le scorte: 24, 14 e 8 di 🪵 🥫 ⛽. Chi arriva prima prende di più.'],
  salva:['🚑','Superstite ferito','Il primo che lo raggiunge e lo cura con 🥫 5 riceve ⭐ 50, 🧱 20 e ⛽ 10.'],
  nido:['🧟','Nido di zombie','Si abbatte insieme ai vicini: ogni colpo costa ⚡ 1 (massimo 3 a testa). Quando cade, tutti quelli che hanno colpito prendono scorte ed esperienza; chi dà il colpo finale anche 🧱 15.'],
  sponsor:['⭐','Sponsor sotto assedio','Un negozio sponsor del quartiere è assediato: difendetelo insieme come per il nido. Premi a tutti quelli che colpiscono.']};
const evtLeft=t=>{const s=Math.max(0,Math.round((new Date(t)-Date.now())/1000));return s>=3600?Math.floor(s/3600)+' h '+Math.floor(s%3600/60)+' min':s>=60?Math.ceil(s/60)+' min':s+' s';};
async function evtLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return EVT.L;if(!force&&Date.now()-EVT.t<60000)return EVT.L;EVT.t=Date.now();
  try{const{data,error}=await SB.rpc('world_eventi_vicini');if(!error&&Array.isArray(data))EVT.L=data;}catch(e){}return EVT.L;}
const evtAperti=()=>(EVT.L||[]).filter(e=>new Date(e.end_at)>Date.now());
function evtFatto(e){const m=e.mio;if(!m)return false;return(e.kind==='cassa'||e.kind==='salva')?true:(m.colpi||0)>=3;}
/* ---------- la scheda dell'evento ---------- */
async function evtSheet(id){await evtLoad(true);const e=(EVT.L||[]).find(x=>String(x.id)===String(id));
  if(!e){openSheet('⚡ Evento','<p class="notice">Questo evento è già finito. Ne arrivano di nuovi ogni ora circa: tieni accese le notifiche.</p>',()=>{});return;}
  const K=EVT_K[e.kind]||EVT_K.cassa;const ok=e.km!=null&&e.km<=e.raggio;const fatto=evtFatto(e);
  openSheet(`${K[0]} ${esc(e.nome.replace(/^\S+\s/,''))}`,`<div class="evtcard k-${e.kind}"><span>${K[0]}</span><div><b>${esc(K[1])}</b><small>⏱ finisce fra ${evtLeft(e.end_at)} · 📏 ${e.km!=null?kmTxt(+e.km):'?'} da casa tua · 👥 ${e.gente} ${e.gente===1?'superstite':'superstiti'}</small></div></div>
    <p style="font-weight:400;font-size:14px">${K[2]}</p>
    ${e.hp_max?`<div class="evthp"><span style="width:${Math.max(2,Math.round(e.hp/e.hp_max*100))}%"></span><b>${e.hp}/${e.hp_max}</b></div>`:''}
    ${e.mio&&e.mio.colpi?`<p class="muted" style="font-size:13px">Tu: ${e.kind==='cassa'?`arrivato ${e.mio.posto}°`:e.kind==='salva'?'l’hai salvato':`${e.mio.colpi} colpi (−${e.mio.danno})`}</p>`:''}
    ${!ok?`<p class="notice">È fuori dal raggio del tuo superstite (${String(e.raggio).replace('.',',')} km): sali di grado o usa 🧭 Esploratore.</p>`:''}
    <button class="btn wide" data-evgo ${!ok||fatto?'disabled':''}>${fatto?'✅ Fatto':e.kind==='salva'?'🚑 Curalo · 🥫 5 · ⚡ 1':e.kind==='cassa'?'🎒 Manda il superstite · ⚡ 1':'💥 Colpisci · ⚡ 1'}</button>
    <button class="btn wide ghost" data-evmap>🗺️ Vedi sulla mappa</button>`,c=>{
    c.querySelector('[data-evgo]').onclick=async x=>{x.target.disabled=true;let r=null;try{const{data,error}=await SB.rpc('world_evento_azione',{p_id:e.id});if(error)throw error;r=data;}catch(err){toast('Non riuscito: riprova');}
      if(r){toast(r.msg||(r.ok?'Fatto':'Non riuscito'));try{sfx&&sfx(r.ok?'win':'lose');}catch(z){}}RES.t=0;try{resLoad(true);supLoad(true);}catch(z){}EVT.t=0;evtSheet(e.id);};
    c.querySelector('[data-evmap]').onclick=()=>{closeSheet();if(S.tab!=='mappa'){S.zv='mondo';go('mappa');}setTimeout(()=>{try{const lm=window.__mf;lm&&lm.map&&lm.map.flyTo({center:[e.lon,e.lat],zoom:16});}catch(z){}},S.tab==='mappa'?50:1500);};});}
/* ---------- sulla mappa ---------- */
function evtMarks(){try{if(S.tab!=='mappa'||!S.user||typeof maplibregl==='undefined')return;const lm=window.__mf;if(!lm||!lm.map||!document.body.contains(lm.map.getContainer()))return;
  if(EVT.mkMap!==lm.map){EVT.mk.forEach(m=>{try{m.remove();}catch(e){}});EVT.mk=new Map();EVT.mkMap=lm.map;}
  const L=evtAperti();const ids=new Set(L.map(e=>String(e.id)));EVT.mk.forEach((m,id)=>{if(!ids.has(id)){try{m.remove();}catch(e){}EVT.mk.delete(id);}});
  L.forEach(e=>{const K=EVT_K[e.kind]||EVT_K.cassa;const html=`<b>${K[0]}</b><span>${esc(K[1])}</span><i>${evtFatto(e)?'✅':'⏱ '+evtLeft(e.end_at)}</i>`;let m=EVT.mk.get(String(e.id));
    if(!m){const el=elDiv('lm-ally lm-evt k-'+e.kind,html);el.style.zIndex='8';el.onclick=x=>{x.stopPropagation();window.SHEET_BACK=null;evtSheet(e.id);};
      try{m=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([e.lon,e.lat]).addTo(lm.map);EVT.mk.set(String(e.id),m);}catch(x){}}
    else{const el=m.getElement();if(el.dataset.h!==html){el.innerHTML=html;el.dataset.h=html;}}});}catch(e){}}
/* ---------- 🏆 sfida del quartiere ---------- */
async function sfidaLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return EVT.SF;if(!force&&EVT.SF&&Date.now()-EVT.sfT<300000)return EVT.SF;EVT.sfT=Date.now();
  try{const{data,error}=await SB.rpc('world_sfida_quartiere');if(!error&&data)EVT.SF=data;}catch(e){}return EVT.SF;}
function sfidaHTML(d){if(!d)return'<p class="notice">La sfida arriva dopo l’aggiornamento del server (blocco SQL 022).</p>';if(d.ok===false)return`<p class="notice">${esc(d.msg||'')}</p>`;
  const io=d.io||{punti:0,pos:'-'};const med=p=>p===1?'🥇':p===2?'🥈':p===3?'🥉':p+'°';
  return`<div class="sfme"><b>${io.pos<=3&&io.punti>0?med(io.pos):'🏆'} Sei ${io.punti>0?io.pos+'° su '+d.tot:'in gara'} · ${io.punti} punti</b><small>La sfida finisce fra ${evtLeft(d.fine)}. Premi ai primi 3 del quartiere (entro 10 km): 🧱 ${d.premi.join(' / ')}</small></div>
    ${d.ultimo?`<p class="notice">Settimana scorsa: ${d.ultimo.posto}° posto, 🧱 +${d.ultimo.mattoni}!</p>`:''}
    <h4 class="hh">Come si fanno punti</h4><div class="sfpt"><span>🔫 zombie abbattuto <b>2</b></span><span>🎒 spedizione <b>5</b></span><span>⚡ evento <b>10</b></span></div>
    <h4 class="hh">Classifica del quartiere</h4>${(d.top||[]).map(r=>`<div class="sfrow ${r.io?'io':''}"><span>${med(r.pos)}</span><b>${r.io?'Tu':'@'+esc(r.nick||'superstite')}</b><i>${r.punti}</i></div>`).join('')||'<p class="muted">Nessuno ha ancora punti questa settimana: comincia tu!</p>'}`;}
async function sfidaSheet(){openSheet('🏆 Sfida del quartiere','<div class="sfbox"><p><span class="spin"></span></p></div>',()=>{});const d=await sfidaLoad(true);const b=document.querySelector('#sheet.open .sfbox');if(b)b.innerHTML=sfidaHTML(d);}
/* ---------- 🏢 condominio ---------- */
async function evtHiLoad(force){if(!S.user||typeof hiLoad!=='function')return EVT.HI;if(!force&&Date.now()-EVT.hiT<300000)return EVT.HI;EVT.hiT=Date.now();try{const I=await hiLoad();if(I&&!I.err)EVT.HI=I;}catch(e){}return EVT.HI;}
/* tutti quelli che non hanno ancora detto che tipo di casa è (condominio, stessa famiglia, casa singola) */
function condoServe(){const I=EVT.HI;return!!(I&&I.building_id&&!I.kind_set);}
function condoProb(){const I=EVT.HI||{};const H=S.zone&&S.zone.real&&S.zone.real.house;return(I.members||[]).length>0||(I.neighbors||[]).length>0||!!(H&&(H.kind==='apt'||H.bt==='apartments'));}
function condoSheet(){const I=EVT.HI||{};const M=I.members||[];
  openSheet('🏠 Che tipo di casa è la tua?',`<p style="font-weight:400;font-size:14px">${M.length?`Nel tuo stesso edificio c’è anche ${M.map(m=>'<b>@'+esc(m.nick)+'</b>').join(', ')}. `:''}Dillo al gioco una volta sola: <b>stessa famiglia</b> = una casa con fortificazioni in comune; <b>condominio</b> = ogni famiglia ha il suo appartamento, una finestra nel palazzo e le difese comuni sul tetto (portone, cancello, telecamere) che valgono per tutti.</p>
    <div class="cdq"><b>🏢 Ho il mio appartamento</b><input class="field" id="cdUnit" placeholder="Scala e interno, per esempio A 5 o 3B" autocomplete="off"><button class="btn wide" data-cdq="condominio">🏢 Salva il mio appartamento</button></div>
    ${M.length?`<button class="btn wide alt" data-cdq="famiglia">👨‍👩‍👧 Vivo con ${M.map(m=>'@'+esc(m.nick)).join(', ')}: stessa famiglia</button>`:''}
    <button class="btn wide ghost" data-cdq="casa">🏠 È una casa singola (villetta)${M.length?' dove viviamo insieme':''}</button>`,c=>{
    c.querySelectorAll('[data-cdq]').forEach(b=>b.onclick=async()=>{const k=b.dataset.cdq;const u=(c.querySelector('#cdUnit').value||'').trim();if(k==='condominio'&&!u){toast('Scrivi scala e interno');return;}
      b.disabled=true;try{const{data,error}=await SB.rpc('world_set_home',{p_kind:k==='condominio'?'condominio':'casa',p_unit:k==='condominio'?u:''});if(error)throw error;toast(data.ok?'🏢 '+data.msg:data.msg);
        if(data.ok){EVT.HI=null;EVT.hiT=0;await evtHiLoad(true);try{await wMine(true);}catch(e){}closeSheet();const h=myHouses().find(x=>x.home);if(h)setTimeout(()=>houseSheet(h),400);}else b.disabled=false;}catch(e){toast('Non riuscito');b.disabled=false;}});});}
/* ---------- carte per la guida (e quindi per ADESSO) ---------- */
function evtGdItems(I){
  if(condoServe()){const M=(EVT.HI.members||[]);I.push({p:condoProb()?104:66,ic:'🏠',t:M.length?`Vivi con @${esc(M[0].nick)} o è un condominio?`:'Che tipo di casa è la tua?',why:'Casa singola, stessa famiglia o il tuo appartamento in un condominio: si dice una volta sola e il gioco sistema coinquilini, vicini e difese comuni.',acts:[{b:'🏠 Scegli',run:async()=>{condoSheet();return{skip:1};}}]});}
  evtAperti().forEach(e=>{if(evtFatto(e)||e.km==null||e.km>e.raggio)return;const K=EVT_K[e.kind]||EVT_K.cassa;
    I.push({p:e.kind==='cassa'?93:e.kind==='salva'?91:86,ic:K[0],t:`${K[1]} a ${kmTxt(+e.km)} · finisce fra ${evtLeft(e.end_at)}`,why:K[2],cost:e.kind==='salva'?'🥫 5 · ⚡ 1':'⚡ 1',
      acts:[{b:e.kind==='cassa'?'🎒 Corri':e.kind==='salva'?'🚑 Curalo':'💥 Colpisci',run:async()=>{const{data,error}=await SB.rpc('world_evento_azione',{p_id:e.id});if(error)throw error;EVT.t=0;evtLoad(true);return data;}},{b:'Dettagli',run:async()=>{evtSheet(e.id);return{skip:1};}}]});});
  const d=EVT.SF;if(d&&d.ok&&d.io)I.push({p:24,ic:'🏆',t:`Sfida del quartiere: ${d.io.punti>0?'sei '+d.io.pos+'°':'entra in gara'} (${d.io.punti} punti)`,why:`Zombie, spedizioni ed eventi fanno punti. Ai primi 3 del quartiere 🧱 ${(d.premi||[]).join(' / ')} lunedì.`,acts:[{b:'🏆 Classifica',run:async()=>{sfidaSheet();return{skip:1};}}]});}
/* ---------- 👉 ADESSO: una mossa alla volta ---------- */
function nowTop(){try{const I=gdItems(GD.d);return{I,x:I[0]||null};}catch(e){return{I:[],x:null};}}
function nowSig(){const{I,x}=nowTop();return x?x.t+'|'+I.length:'0';}
function nowHTML(){if(!S.user)return'';const{I,x}=nowTop();
  if(!x)return`<div class="mwnow ok"><span>✅</span><div><small>ADESSO</small><b>Tutto fatto per adesso</b><em>Se vuoi giocare: 🎒 spedizione col tuo superstite o 🔫 caccia nella Lente.</em></div><button class="btn" data-nowsup>🎒 Spedizione</button></div>`;
  const a=(x.acts||[])[0];
  return`<div class="mwnow ${x.p>=80?'urg':''}"><span>${x.ic}</span><div><small>ADESSO</small><b>${x.t}</b>${x.why?`<em>${x.why}</em>`:''}</div>${a?`<button class="btn" data-nowgo>${a.b}${x.cost?` · ${x.cost}`:''}</button>`:''}</div>
    ${I.length>1?`<button class="mwnowall" data-nowall>🧭 Altre ${I.length-1} cose da fare ›</button>`:''}`;}
function nowBind(root){const{x}=nowTop();const g=root.querySelector('[data-nowgo]');
  if(g&&x)g.onclick=async()=>{const a=x.acts[0];if(a.confirm&&!confirm(`${String(x.t).replace(/<[^>]+>/g,'')}?`))return;g.disabled=true;
    try{const r=await a.run();if(r&&!r.skip){toast(r.msg||(r.got?`🧱 +${wNum(r.got)}`:'Fatto'));try{sfx(r.ok===false?'lose':'win');}catch(e){}}}catch(e){toast('Non riuscito: '+(e.message||e));}
    RES.t=0;try{await Promise.all([gdLoad(true),resLoad(true),orLoad(true)]);}catch(e){}try{wMine(true);supLoad(true);}catch(e){}trrRepaint(true);};
  const al=root.querySelector('[data-nowall]');if(al)al.onclick=()=>{window.SHEET_BACK=null;gdSheet();};
  const sp=root.querySelector('[data-nowsup]');if(sp)sp.onclick=()=>{window.SHEET_BACK=null;supSheet('sped');};}
/* ---------- avvio, giro, notifiche ---------- */
const _zGoEvt=zGoUrl;zGoUrl=function(u){_zGoEvt(u);try{const q=new URL(u,location.href).searchParams;if(q.get('evt'))setTimeout(()=>evtSheet(q.get('evt')),1500);if(q.get('sfida'))setTimeout(sfidaSheet,1500);}catch(e){}};
zEvery(()=>{try{if(document.hidden||!S.user||!['mappa','orda','social'].includes(S.tab))return;
  Promise.all([evtLoad(),evtHiLoad(),sfidaLoad()]).then(()=>{try{trrRepaint();}catch(e){}});evtMarks();}catch(e){}},4000,'eventi');
</script>
