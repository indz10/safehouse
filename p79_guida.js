<script>
/* =========================================================
   🧭 GUIDA "COSA FARE" (migrazione 016, richiesta di Alessandro 14/11)
   Per chi ha già l'account: un elenco delle azioni più utili ADESSO, in ordine di importanza, ognuna con quanto costa
   (🧱 🪵 🥫 ⛽), cosa rende e UN pulsante. Basta scegliere.
   - difendersi: assalti in arrivo sulle tue case e presidi (🪵 assi, 🆘 chiedi aiuto), casa vera da custodire (📍)
   - alleati: chi chiede rinforzi, chi è sotto assalto (🛡️ difendi)
   - riscuotere: prepara (+15), riscatta l'orda, affitti, premi di oggi
   - crescere: presidi liberi entro 5 km, case dei rivali più facili da conquistare, scorte da usare
   Dati: world_consigli (server) + OR.s (orda), RES.d (scorte), myHouses/frChanceOf (case).
   Si apre da "🧭 Cosa fare" (barra delle scorte nel Mondo) e dal menu ☰; il numero sul pulsante = cose urgenti.
   ========================================================= */
const GD={d:null,t:0,n:0,busy:false};
async function gdLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return GD.d;if(!force&&GD.d&&Date.now()-GD.t<90000)return GD.d;
  try{const{data,error}=await SB.rpc('world_consigli');if(!error&&data&&data.ok!==false){GD.d=data;GD.t=Date.now();}}catch(e){}
  try{GD.n=gdItems(GD.d).filter(x=>x.p>=70).length;}catch(e){}return GD.d;}
const GD_TIPO={home:'la tua casa',owned:'una tua casa',pres:'il tuo presidio'};
/* le azioni possibili, con priorità (più alta = più importante) */
function gdItems(d){d=d||{};const I=[];const R=Object.assign({},RES.d||{},d.risorse||{});const s=OR.s||{};let H=[];try{H=myHouses();}catch(e){}
  const rpc=(fn,a)=>async()=>{const{data,error}=await SB.rpc(fn,a||{});if(error)throw error;return data;};
  /* 📍 casa vera */
  if(H.some(h=>h.home)&&s.custodita===false)I.push({p:100,ic:'📍',t:'Torna a casa: ora è saccheggiabile',why:'Non apri l’app da casa da più di 7 giorni: i rivali possono rubarti le scorte.',acts:[{b:'📍 Sono a casa',run:async()=>{await trrPresenza(true);return null;}}]});
  else{const gg=typeof trrGg==='function'?trrGg():null;if(gg!=null&&gg>=4&&H.some(h=>h.home))I.push({p:45,ic:'📍',t:`Passa da casa entro ${Math.max(0,7-gg)} giorni`,why:'Così resta intoccabile. La prima presenza del giorno fa il pieno: ⛽ +10.',gain:'⛽ +10',acts:[{b:'📍 Sono a casa',run:async()=>{await trrPresenza(true);return null;}}]});}
  /* ⚔️ assalti in arrivo */
  (d.minacce||[]).forEach(m=>{const acts=[];if((R.legno||0)>=20&&(m.assi||0)<18)acts.push({b:'🪵 Inchioda le assi',cost:'🪵 20',run:rpc('world_assi',{p_bid:m.bid,p_lat:m.lat,p_lon:m.lon})});
    if(!d.asked&&m.tipo!=='pres')acts.push({b:'🆘 Chiedi aiuto agli alleati',run:rpc('world_ask_help')});
    I.push({p:95,ic:'⚔️',t:`Ti assaltano ${m.tipo==='pres'&&m.nome?'il presidio '+esc(m.nome):GD_TIPO[m.tipo]||'una casa'}: −${m.atk}`,
      why:`${m.n} ${m.n===1?'squadra':'squadre'} in arrivo per la prossima orda. Ora hai assi +${m.assi||0} e difensori +${m.aiuti||0}.${(R.legno||0)<20?' Ti manca il legno per le assi: prendilo dai parchi (presidi).':''}`,acts});});
  /* 🆘 alleati che chiedono aiuto */
  (d.richieste||[]).forEach(r=>{const mz=(typeof MZ!=='undefined'&&MZ[r.mezzo])||['🚶','A piedi'];
    I.push({p:r.arrivo?85:20,ic:'🆘',t:`@${esc(r.nick)} chiede aiuto`,why:r.arrivo?`A ${String(r.dist_km).replace('.',',')} km: vai ${({piedi:'a piedi',bici:'in bici',moto:'in moto',auto:'in auto',fuori:'in fuoristrada'})[r.mezzo]||'a piedi'} ${mz[0]}. Rinforzi +${r.pts} alla sua difesa, 🧱 10 a te.`:`È a ${String(r.dist_km).replace('.',',')} km: col tuo mezzo (o senza carburante) non arrivi.`,
      cost:r.carb?'⛽ '+r.carb:'',gain:'🧱 +10',acts:r.arrivo&&(R.carb||0)>=(r.carb||0)?[{b:'🛡️ Manda rinforzi',run:rpc('world_send_help',{p_target:r.user_id})}]:[]});});
  /* 🛡️ alleati sotto assalto */
  (d.alleati||[]).forEach(a=>{const ok=a.aiuto&&a.aiuto.ok;I.push({p:ok?80:20,ic:'🛡️',t:`@${esc(a.nick)} è sotto assalto (−${a.atk})`,why:ok?`${a.tipo==='pres'?'Il suo presidio':'Una sua casa'}: vai a difenderla, +${a.aiuto.pts} alla difesa, 🧱 10 a te.`:(a.aiuto&&a.aiuto.msg)||'',
    cost:ok&&a.aiuto.carb?'⛽ '+a.aiuto.carb:'',acts:ok?[{b:'🛡️ Difendi',run:rpc('world_difendi',{p_bid:a.bid,p_lat:a.lat,p_lon:a.lon})}]:[]});});
  /* 🌅 prepara · 🌙 riscatta · 🏦 affitti · 🎁 premi */
  if(!s.prepared)I.push({p:75,ic:'🌅',t:'Prepara le case per la prossima orda',why:'+15 di difesa a tutte le tue case. È gratis.',gain:'+15',acts:[{b:'🛡️ Prepara',run:rpc('world_prepare')}]});
  if(s.total>0&&!s.claimed)I.push({p:72,ic:'🌙',t:'Riscatta i premi dell’orda',why:`${s.held||0} su ${s.total} case hanno tenuto.`,gain:`🧱 +${s.mattoni||0}${s.legno?' 🪵 +'+s.legno:''}${s.cibo?' 🥫 +'+s.cibo:''}`,acts:[{b:'🎁 Riscatta',run:rpc('world_raid_claim')}]});
  if((d.affitti||0)>=1)I.push({p:60,ic:'🏦',t:'Riscuoti gli affitti',why:'Le case comprate rendono ogni giorno (di più nelle zone care).',gain:`🧱 +${d.affitti}`,acts:[{b:'🏦 Riscuoti',run:async()=>wRpc('world_collect')}]});
  try{if(typeof luckReady==='function'&&luckReady()>0)I.push({p:50,ic:'🎁',t:`Premi di oggi: ${luckReady()} pronti`,why:'Premio del giorno, ruota, gratta e vinci, barattolo.',acts:[{b:'🎁 Apri',run:async()=>{premiSheet();return{skip:1};}}]});}catch(e){}
  /* 🚩 presidi liberi entro 5 km */
  if((d.miei_presidi||0)<3)(d.presidi||[]).slice(0,2).forEach(p=>{const k=(typeof PRES_K!=='undefined'&&PRES_K[p.kind])||['🚩','Presidio'];
    I.push({p:40,ic:k[0],t:`Occupa ${esc(p.name)} (${String(p.dist_km).replace('.',',')} km)`,why:`${k[1]} libero: +3 di difesa alle case vicine e a ogni orda retta 40+ della sua risorsa.`,cost:p.carb?'⛽ '+p.carb:'',acts:(R.carb||0)>=(p.carb||0)?[{b:'🚩 Occupa',run:rpc('world_presidio_occupa',{p_id:p.id})}]:[]});});
  /* ⚔️ case dei rivali più facili */
  (d.bersagli||[]).forEach(b=>{const a=b.atk||{};if(!a.ok)return;I.push({p:32,ic:'🏴',t:`Conquista la casa di @${esc(b.nick)} (liv. ${b.level}, ${String(b.dist_km).replace('.',',')} km)`,
    why:`Assalto −${a.pts}${b.fort?`; ha ${b.fort} livelli di barricate/recinto/fossato`:''}. Se all’orda cade, è tua. Meglio se assaltate in più alleati.`,cost:`🥫 10${a.carb?' ⛽ '+a.carb:''}`,
    acts:(R.cibo||0)>=10&&(R.carb||0)>=(a.carb||0)?[{b:'⚔️ Assalta',confirm:1,run:rpc('world_assalta',{p_bid:b.bid,p_lat:b.lat,p_lon:b.lon})}]:[]});});
  /* 🪵 scorte da usare: assi sulla casa più debole */
  if((R.legno||0)>=20&&!(d.minacce||[]).length){let w=null;H.forEach(h=>{let c=null;try{c=frChanceOf(h);}catch(e){}if(c!=null&&c<70&&(!w||c<w.c))w={h,c};});
    if(w&&w.h.bid)I.push({p:28,ic:'🪵',t:`Rinforza ${esc(w.h.home?'casa tua':w.h.label)} (${w.c}%)`,why:'È la tua casa più debole: le assi danno +6 per la prossima orda.',cost:'🪵 20',gain:'+6',acts:[{b:'🪵 Inchioda le assi',run:rpc('world_assi',{p_bid:w.h.bid,p_lat:w.h.lat,p_lon:w.h.lon})}]});}
  const tanti=[['legno','🪵'],['cibo','🥫'],['carb','⛽']].filter(([k])=>(R[k]||0)>=200);
  if(tanti.length)I.push({p:10,ic:'🔄',t:'Hai scorte in più: scambiale',why:`${tanti.map(x=>x[1]).join(' ')} oltre 200: al Mercato 20 = 🧱 10.`,acts:[{b:'🔄 Mercato',run:async()=>{shopSheet(0);return{skip:1};}}]});
  return I.sort((a,b)=>b.p-a.p);}
function gdHTML(){const I=gdItems(GD.d);
  return`<div class="gdtop">${typeof trrScorteHTML==='function'?trrScorteHTML().replace(/<button class="mwguida"[\s\S]*?<\/button>/,''):''}</div>
    <p class="muted" style="font-size:13px;margin:6px 0 10px">In cima le cose più importanti adesso. Tocca il pulsante: al resto pensa il gioco.</p>
    ${!GD.d?'<p class="notice">Non riesco a leggere le minacce e le richieste: serve il blocco SQL 016, oppure la rete è lenta.</p>':''}
    ${I.length?I.map((x,i)=>`<div class="gdcard ${x.p>=80?'urg':x.p>=60?'imp':''}"><span class="gdic">${x.ic}</span><div class="gdtx"><b>${x.t}</b><small>${x.why||''}</small>
      ${x.cost||x.gain?`<div class="gdchips">${x.cost?`<span class="gdc">costa ${x.cost}</span>`:''}${x.gain?`<span class="gdg">rende ${x.gain}</span>`:''}</div>`:''}
      <div class="gdacts">${(x.acts||[]).map((a,j)=>`<button class="btn small ${j?'ghost':''}" data-gda="${i}:${j}">${a.b}${a.cost?' · '+a.cost:''}</button>`).join('')}</div></div></div>`).join('')
     :'<p class="notice">✅ Tutto fatto per adesso. Torna prima della prossima orda.</p>'}`;}
async function gdSheet(){if(!S.user){toast('Accedi per la guida');try{loginSheet();}catch(e){}return;}
  openSheet('🧭 Cosa fare ora','<p><span class="spin"></span> Guardo minacce, alleati e scorte…</p>',()=>{});
  try{await Promise.all([gdLoad(true),resLoad(true),OR.s?null:orLoad()]);}catch(e){}gdPaint();}
function gdPaint(){const c=document.querySelector('#sheet.open .sheet-b');if(!c)return;const I=gdItems(GD.d);c.innerHTML=gdHTML();try{trrScorteBind(c.querySelector('.gdtop'));}catch(e){}
  c.querySelectorAll('[data-gda]').forEach(b=>b.onclick=async()=>{const[i,j]=b.dataset.gda.split(':').map(Number);const a=I[i]&&I[i].acts[j];if(!a)return;
    if(a.confirm&&!confirm(`${I[i].t.replace(/<[^>]+>/g,'')}? ${I[i].cost?'Costa '+I[i].cost+'.':''}`))return;b.disabled=true;
    try{const r=await a.run();if(r&&r.skip)return;if(r)toast(r.msg||(r.got?`🧱 +${wNum(r.got)}`:'Fatto'));try{sfx(r&&r.ok===false?'lose':'win');}catch(e){}}
    catch(e){toast('Non riuscito: '+(e.message||e));}
    RES.t=0;try{await Promise.all([gdLoad(true),resLoad(true),orLoad(true),thrLoad(true)]);}catch(e){}try{wMine(true);}catch(e){}trrRepaint(true);if(document.querySelector('#sheet.open .gdtop'))gdPaint();});}
/* il numero sul pulsante: cose urgenti (aggiornato ogni 2 minuti nel Mondo) */
zEvery(()=>{try{if(document.hidden||!S.user||!['mappa','orda','social'].includes(S.tab))return;if(Date.now()-GD.t>120000)gdLoad(true).then(()=>{try{trrRepaint();}catch(e){}});}catch(e){}},5000,'guida');
</script>
