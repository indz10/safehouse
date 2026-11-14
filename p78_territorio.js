<script>
/* =========================================================
   🏴 TERRITORIO (migrazione 014, scelte di Alessandro 14/11)
   - barra in basso nel Mondo (Mappa e Orda): 🧱 🪵 🥫 ⛽ e le tue case con la % (trrScorteHTML, trrDock);
     all'apertura della Mappa si inquadrano le tue case (trrFit)
   - ❤️ casa vera intoccabile solo con la PRESENZA: una volta ogni 7 giorni l'app da lì (GPS entro 200 m, world_presenza);
     in automatico se la posizione è già permessa (al massimo ogni 6 ore), altrimenti "📍 Sono a casa"
   - scheda di un edificio (case comprate, case vere incustodite, presidi): assalti e difese della prossima orda,
     ⚔️ Assalta (🥫 10 + ⛽), 🛡️ Difendi (alleati, ⛽), 🪵 Inchioda assi (20 = +6, max +18) — trrSection
   - ⛽ carburante per i viaggi: moto 1, auto 1,5, fuoristrada 2 al km; senza carburante si va a piedi
   ========================================================= */
const TRR={fit:false,sig:'',presT:0};
const TRR_USO=[['mattoni','🧱','Mattoni','comprare case, fortificazioni, mezzi','orde rette, premi del giorno, affitti (più la zona è cara, più rendono)'],
  ['legno','🪵','Legno','inchiodare le assi: 🪵 20 = +6 di difesa a una casa o a un presidio per la prossima orda (max +18), anche per gli alleati','parchi e campi sportivi tenuti, orde rette, accesso del giorno'],
  ['cibo','🥫','Cibo','sfamare la squadra d’assalto: 🥫 10 per ogni assalto','piazze, centri e chiese tenuti, orde rette, rinforzi agli alleati'],
  ['carb','⛽','Carburante','viaggiare: moto ⛽ 1, auto ⛽ 1,5, fuoristrada ⛽ 2 al km (a piedi e in bici è gratis, ma arrivi meno lontano)','il pieno a casa (⛽ 10 al giorno con la presenza), stazioni, polizia e pompieri tenuti, assalti riusciti']];
function trrMat(){const d=RES.d||{};return(window.W&&W.m&&W.m.mattoni!=null)?W.m.mattoni:(d.mattoni||0);}
function trrGg(){const t=OR.s&&OR.s.presente_at;return t?Math.floor((Date.now()-new Date(t).getTime())/864e5):null;}
function trrPresChip(){const s=OR.s||{};let H=[];try{H=myHouses();}catch(e){}if(!H.some(h=>h.home)||s.custodita==null)return'';const gg=trrGg();
  if(s.custodita===false)return'<button class="mwpres ko" data-trpres>⚠️ Saccheggiabile · 📍 Sono a casa</button>';
  if(gg!=null&&gg>=4)return`<button class="mwpres mid" data-trpres>📍 Passa da casa: ${Math.max(0,7-gg)} gg</button>`;
  return'<button class="mwpres" data-trpres>❤️ Intoccabile</button>';}
function trrScorteHTML(){if(!S.user||!RES.d)return'';const d=RES.d;
  return`<div class="mwscorte"><button class="mwres" data-trres aria-label="Le tue scorte"><span>🧱 ${wNum(trrMat())}</span><span>🪵 ${wNum(d.legno||0)}</span><span>🥫 ${wNum(d.cibo||0)}</span><span>⛽ ${wNum(d.carb||0)}</span></button>${trrPresChip()}</div>`;}
function trrScorteBind(root){if(!root)return;const r=root.querySelector('[data-trres]');if(r)r.onclick=trrScorteSheet;const p=root.querySelector('[data-trpres]');if(p)p.onclick=()=>trrPresSheet();}
function trrScorteSheet(){const d=RES.d||{};openSheet('🎒 Le tue scorte',`<p class="muted" style="font-size:13px;margin:0 0 8px">Ogni risorsa serve a qualcosa. Le dà solo il server, al massimo 400 al giorno ciascuna.</p>
  ${TRR_USO.map(([k,ic,n,uso,da])=>`<div class="trruso"><span>${ic}</span><div><b>${n}: ${wNum(k==='mattoni'?trrMat():(d[k]||0))}</b><small><b>Serve per</b> ${uso}</small><small><b>Si prende da</b> ${da}</small></div></div>`).join('')}
  <button class="btn wide alt" data-trshop>🔄 Mercato in Bottega</button>`,c=>{c.querySelector('[data-trshop]').onclick=()=>{window.SHEET_BACK=null;shopSheet(0);};});}
/* ---------- 📍 presenza a casa ---------- */
function trrPresSheet(){const s=OR.s||{};const gg=trrGg();
  openSheet('❤️ La tua casa vera',`<div class="trrstato ${s.custodita===false?'ko':gg>=4?'mid':'ok'}"><b>${s.custodita===false?'⚠️ Saccheggiabile':'❤️ Intoccabile'}</b>
    <small>${gg==null?'Presenza non ancora registrata':gg===0?'Sei passato da casa oggi':`Ultima presenza a casa: ${gg} ${gg===1?'giorno':'giorni'} fa`}${s.custodita!==false&&gg!=null?` · resta intoccabile ancora ${Math.max(0,7-gg)} ${7-gg===1?'giorno':'giorni'}`:''}</small></div>
    <p style="font-weight:400;font-size:14px">La casa dove abiti non si perde mai. È <b>intoccabile</b> se almeno una volta ogni 7 giorni apri l’app da lì (entro 200 m). Altrimenti i rivali possono <b>saccheggiarla</b>: se all’orda cade, rubano una parte delle tue scorte.</p>
    <p class="muted" style="font-size:12.5px">Ogni giorno la prima presenza a casa fa il pieno: ⛽ +10. Se la posizione è già permessa, l’app la registra da sola quando sei a casa.</p>
    <button class="btn wide" data-trpgo>📍 Sono a casa adesso</button>`,c=>{c.querySelector('[data-trpgo]').onclick=e=>{e.target.disabled=true;trrPresenza(true).then(()=>{e.target.disabled=false;});};});}
function trrPresenza(manual){return new Promise(res=>{if(!S.user||typeof SB==='undefined'||!SB||!navigator.geolocation){if(manual)toast('Posizione non disponibile su questo telefono');return res(false);}
  const go_=()=>{if(manual)toast('📍 Controllo dove sei…');TRR.presT=Date.now();try{localStorage.setItem('zsh_pres_t_'+S.user.id,String(TRR.presT));}catch(e){}
    navigator.geolocation.getCurrentPosition(async pos=>{try{const{data,error}=await SB.rpc('world_presenza',{p_lat:pos.coords.latitude,p_lon:pos.coords.longitude,p_acc:pos.coords.accuracy||0});
        if(error)throw error;if(manual||(data&&data.ok&&data.carb))toast(data.msg);if(data&&data.ok){try{await orLoad(true);}catch(e){}RES.t=0;try{await resLoad(true);}catch(e){}trrRepaint(true);if(manual&&document.querySelector('#sheet.open .trrstato'))trrPresSheet();}res(!!(data&&data.ok));}
      catch(e){if(manual)toast('Non riesco a registrare la presenza: '+(/world_presenza|function/.test(e.message||'')?'serve il blocco SQL 014':(e.message||e)));res(false);}},
      err=>{if(manual)toast(err.code===1?'Posizione negata: permettila nelle impostazioni del telefono (Privacy → Posizione → il browser)':'Non riesco a leggere la posizione: riprova tra poco');res(false);},
      {enableHighAccuracy:true,timeout:15000,maximumAge:300000});};
  if(manual)return go_();
  if(Date.now()-TRR.presT<6*3600e3||Date.now()-(TRR.permT||0)<600000)return res(false);TRR.permT=Date.now();
  try{navigator.permissions.query({name:'geolocation'}).then(p=>{if(p.state==='granted')go_();else res(false);}).catch(()=>res(false));}catch(e){res(false);}});}
/* ---------- barra in basso nella pagina Orda ---------- */
function trrChipsHTML(){let H=[];try{H=myHouses();}catch(e){}const s=OR.s||{};const claim=S.user&&s.total>0&&!s.claimed;
  return H.map((h,i)=>{let c=null;try{c=frChanceOf(h);}catch(e){}return`<button class="mwchip" data-trh="${i}">${h.home?'❤️':'🔑'} ${esc(h.home?'Casa tua':h.label)}${c!=null?` <b class="${chCls(c)}">${c}%</b>`:''}</button>`;}).join('')
    +(claim?'<button class="mwchip hot" data-trc>🎁 Riscatta</button>':'')+(S.user?'<button class="mwchip" data-tra>🤝 Alleati</button>':'');}
function trrDockPaint(){let d=document.getElementById('mwdock');const on=mwOk()&&S.tab==='orda'&&app.querySelector('.mwtop');
  document.body.classList.toggle('hasdock',!!on);if(!on){if(d)d.remove();return;}
  if(!d){d=document.createElement('div');d.id='mwdock';document.body.appendChild(d);}
  d.innerHTML=`${trrScorteHTML()}<div class="mwchips">${trrChipsHTML()}</div>`;trrScorteBind(d);
  d.querySelectorAll('[data-trh]').forEach(x=>x.onclick=()=>{const h=myHouses()[+x.dataset.trh];if(h){window.SHEET_BACK=null;houseSheet(h);}});
  const c=d.querySelector('[data-trc]');if(c)c.onclick=()=>{const x=app.querySelector('[data-ocl]');if(x)x.scrollIntoView({behavior:'smooth',block:'center'});else{S.zv='mondo';go('mappa');}};
  const a=d.querySelector('[data-tra]');if(a)a.onclick=()=>alPick();}
/* ridisegna barra e cassetto quando cambiano scorte, % o presenza */
function trrRepaint(force){try{let pc='';try{pc=myHouses().map(h=>frChanceOf(h)).join(',');}catch(e){}
  const sig=[S.tab,JSON.stringify(RES.d||{}),trrMat(),OR.s&&OR.s.custodita,OR.s&&OR.s.presente_at,OR.s&&OR.s.claimed,pc].join('|');
  if(!force&&sig===TRR.sig&&(S.tab!=='orda'||document.getElementById('mwdock')))return;TRR.sig=sig;
  if(S.tab==='orda')trrDockPaint();else{const d=document.getElementById('mwdock');if(d)d.remove();document.body.classList.remove('hasdock');}
  if(S.tab==='mappa'&&typeof MW!=='undefined'&&!MW.open){const dr=app.querySelector('.mwdrawer');if(dr)mwDrawerPaint(dr);}}catch(e){}}
/* ---------- all'apertura della Mappa: le tue case inquadrate ---------- */
function trrFit(){if(TRR.fit)return;TRR.fit=true;alMapWait().then(lm=>{try{if(!lm||!lm.map||(typeof ALM!=='undefined'&&ALM.on))return;
  const H=myHouses().filter(h=>h.lat!=null&&h.lon!=null);if(!H.length)return;
  if(H.length===1||!lm.map.fitBounds)(lm.map.flyTo||lm.map.jumpTo).call(lm.map,{center:[H[0].lon,H[0].lat],zoom:16});
  else{const la=H.map(h=>h.lat),lo=H.map(h=>h.lon);lm.map.fitBounds([[Math.min(...lo),Math.min(...la)],[Math.max(...lo),Math.max(...la)]],{padding:{top:170,bottom:170,left:40,right:96},maxZoom:16,duration:1200});}}catch(e){}});}
/* ---------- ⚔️ scheda di un edificio: assalti, difese, assi ---------- */
const TRR_TIPO={owned:['🔑','casa comprata'],home:['❤️','casa vera'],pres:['🚩','presidio']};
function trrEsito(u){if(!u)return'';const v=u.vincitore?'@'+esc(u.vincitore):'';
  return{conquista:`🏴 All’ultima orda è stata conquistata da ${v}`,respinto:'🛡️ All’ultima orda ha respinto l’assalto',saccheggio:`💰 All’ultima orda ${v} ha saccheggiato le scorte`,bottino:`💰 All’ultima orda è caduta: bottino a ${v}`}[u.esito]||'';}
function trrBtn(a,k){const cost=[];if(a.cibo)cost.push('🥫 '+a.cibo);if(a.carb)cost.push('⛽ '+a.carb);if(a.legno)cost.push('🪵 '+a.legno);
  const L={atk:['⚔️ Assalta',`−${a.pts} alla sua difesa`],aiuto:['🛡️ Difendi',`+${a.pts} alla difesa`],assi:['🪵 Inchioda le assi',`+6 alla difesa (ora +${a.somma||0}/18)`]}[k];
  const via=k==='assi'?'':` · ${(MZ[a.mezzo]||MZ.piedi)[0]} ${a.eta_min} min${a.in_tempo?'':' (arriva per l’orda dopo)'}`;
  return`<button class="btn ${k==='atk'?'red':k==='aiuto'?'':'alt'} trract" data-trk="${k}"><b>${L[0]}${cost.length?' · '+cost.join(' '):''}</b><small>${L[1]}${via}</small></button>`;}
function trrHTML(d){const T=TRR_TIPO[d.tipo]||['🏠','edificio'];const net=(d.assi_pts||0)+(d.aiuti_pts||0)-(d.assalti_pts||0);
  const chi=d.mio?'È tua':d.alleato?`Di @${esc(d.nick||'')} · 🤝 alleato`:d.nick?`Di @${esc(d.nick)}`:(d.tipo==='home'?'Ci abita un superstite':'Di un superstite');
  let stato='';if(d.tipo==='home')stato=d.custodita?'<span class="trrtag ok">❤️ Intoccabile: chi ci abita è passato da qui negli ultimi 7 giorni</span>':'<span class="trrtag ko">⚠️ Incustodita da più di 7 giorni: si può saccheggiare</span>';
  else if(d.scudo&&!d.mio)stato='<span class="trrtag ok">🛡️ Nuovo arrivato: 15 giorni di scudo</span>';
  const acts=[];if(!d.mio&&!d.alleato){if(d.atk&&d.atk.ok)acts.push(trrBtn(d.atk,'atk'));else if(d.atk&&d.atk.msg&&!/È tua|alleato|nessuno/.test(d.atk.msg))acts.push(`<p class="trrwhy">⚔️ ${esc(d.atk.msg)}</p>`);}
  if(d.alleato){if(d.aiuto&&d.aiuto.ok)acts.push(trrBtn(d.aiuto,'aiuto'));else if(d.aiuto&&d.aiuto.msg)acts.push(`<p class="trrwhy">🛡️ ${esc(d.aiuto.msg)}</p>`);}
  if(d.mio||d.alleato){if(d.assi&&d.assi.ok)acts.push(trrBtn(Object.assign({},d.assi,{somma:d.assi_pts}),'assi'));else if(d.assi&&d.assi.msg)acts.push(`<p class="trrwhy">🪵 ${esc(d.assi.msg)}</p>`);}
  if(d.mio&&d.tipo==='home')acts.push('<button class="btn small ghost" data-trpres2>📍 Sono a casa</button>');
  const regola=d.tipo==='owned'?'Se all’orda cade dopo un assalto, passa a chi l’ha assaltata di più (al padrone torna metà della spesa). Gli alleati la difendono; il padrone e i suoi alleati possono inchiodare le assi.'
    :d.tipo==='pres'?'Se all’orda cade dopo un assalto, passa a chi l’ha assaltato di più (se ne tiene meno di 3), altrimenti torna libero.'
    :'La casa vera non si perde mai. Se chi ci abita non passa da qui per 7 giorni, i rivali possono saccheggiarne le scorte.';
  return`<h4 class="hh">⚔️ Assalti e difese</h4>
    <div class="trrhead"><span>${T[0]}</span><div><b>${T[1][0].toUpperCase()+T[1].slice(1)} · ${chi}</b>${stato}</div></div>
    <div class="trrnext"><b>🧟 Orda delle ${String(d.slot||'').slice(-2)}:00</b>
      <span>⚔️ ${d.assalti||0} ${d.assalti===1?'assalto':'assalti'} <i>−${d.assalti_pts||0}</i></span><span>🛡️ ${d.aiuti||0} ${d.aiuti===1?'difensore':'difensori'} <i>+${d.aiuti_pts||0}</i></span><span>🪵 assi <i>+${d.assi_pts||0}</i></span>
      <span class="trrnet ${net<0?'ko':net>0?'ok':''}">In tutto: ${net>0?'+':''}${net} alla difesa</span></div>
    ${d.fort&&!d.mio?`<p class="trrwhy">🚪 Barricate, recinto e fossato: −${Math.min(60,d.fort*10)}% alla forza degli assalti</p>`:''}
    ${d.rendita?`<p class="trrwhy">💰 Rende 🧱 ${d.rendita} al giorno a chi la tiene (le zone più care rendono di più)</p>`:''}
    ${d.ultimo&&trrEsito(d.ultimo)?`<p class="trrlast">${trrEsito(d.ultimo)}</p>`:''}
    <div class="trracts">${acts.join('')}</div><p class="muted" style="font-size:12px;margin:6px 0 0">${regola}</p>`;}
async function trrSection(c,bid,lat,lon,dopo){if(!S.user||typeof SB==='undefined'||!SB||!c||!bid||c.querySelector('.trrpan'))return;
  const at=dopo&&c.querySelector(dopo);(at||c).insertAdjacentHTML(at?'afterend':'beforeend','<div class="trrpan panel"><p class="muted"><span class="spin"></span> Assalti e difese…</p></div>');const box=c.querySelector('.trrpan');
  let d=null;try{const r=await SB.rpc('world_edificio_info',{p_bid:bid,p_lat:lat,p_lon:lon});if(r.error)throw r.error;d=r.data;}catch(e){box.remove();return;}
  if(!d||d.tipo==='none'||!box.isConnected){box.remove();return;}
  box.innerHTML=trrHTML(d);
  const p2=box.querySelector('[data-trpres2]');if(p2)p2.onclick=()=>trrPresenza(true).then(ok=>{if(ok){box.remove();trrSection(c,bid,lat,lon,dopo);}});
  box.querySelectorAll('[data-trk]').forEach(b=>b.onclick=async()=>{const k=b.dataset.trk;const a=d[k]||{};
    if(k==='atk'&&!confirm(`Mandare la squadra d’assalto? Costa 🥫 10${a.carb?' e ⛽ '+a.carb:''}.`))return;b.disabled=true;
    try{const{data,error}=await SB.rpc(k==='atk'?'world_assalta':k==='aiuto'?'world_difendi':'world_assi',{p_bid:bid,p_lat:lat,p_lon:lon});if(error)throw error;
      toast((data&&data.msg)||'Fatto');try{sfx(data&&data.ok?'win':'lose');}catch(e){}
      if(data&&data.ok){RES.t=0;try{await resLoad(true);}catch(e){}try{await thrLoad(true);}catch(e){}trrRepaint(true);box.remove();trrSection(c,bid,lat,lon,dopo);}else b.disabled=false;}
    catch(e){toast('Non riuscito: '+(/world_|function/.test(e.message||'')?'serve il blocco SQL 014':(e.message||e)));b.disabled=false;}});}
/* nella pagina della casa (passo hs_territorio di p64) */
async function hs_territorio(h){try{if(!S.user||!h||!h.bid)return;const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('.trrpan'))return;await trrSection(c,h.bid,h.lat,h.lon,'.hwal');}catch(e){}}
/* ⚔️ saccheggio dalla scheda del giocatore */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-trsac]');if(!b)return;
  if(!confirm('Mandare la squadra a saccheggiare la sua casa incustodita? Costa 🥫 10 e il carburante del viaggio.'))return;b.disabled=true;
  try{const{data,error}=await SB.rpc('world_saccheggia',{p_user:b.dataset.trsac});if(error)throw error;toast(data.msg);if(data.ok){b.textContent='⚔️ Squadra in viaggio';RES.t=0;resLoad(true);}else b.disabled=false;}
  catch(x){toast('Non riuscito');b.disabled=false;}});
/* orologio: presenza automatica, barra in basso aggiornata */
try{TRR.presT=0;}catch(e){}
zEvery(()=>{try{if(document.hidden||!S.user)return;
  if(!TRR.presT){try{TRR.presT=+localStorage.getItem('zsh_pres_t_'+S.user.id)||1;}catch(e){TRR.presT=1;}}
  if(myHouses().some(h=>h.home))trrPresenza(false);trrRepaint();}catch(e){}},1500,'territorio');
</script>
