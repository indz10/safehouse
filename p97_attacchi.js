<script>
/* =========================================================
   ⚔️ ATTACCHI TRA SUPERSTITI (migrazione 028, Fase 35 — sistema tipo Travian, motore unico sul server)
   - pvpSheet({user|bid}): anteprima dal server (world_attacco_info: distanza, viaggio, costo, tua forza contro la sua
     difesa, cosa ci si può aspettare) e "⚔️ Parti all'attacco" (world_attacca). Si apre da: scheda del giocatore,
     edifici degli altri, guida, rivali; le vecchie azioni (orda mandata, saccheggio, assalto alle case) rispondono
     "nuovo: true" e qui aprono pvpSheet (avvolge SB.rpc).
   - Io: riquadro "⚔️ Attacchi" (.pvpbox): in arrivo col conto alla rovescia (🛡️ Prepara, 🔨 Ripara, 📣 Chiedi aiuto),
     le tue squadre in viaggio, lo storico; sulla mappa l'allarme rosso .pvpal quando arriva qualcuno.
   - Riepilogo del combattimento (pvpRiepilogo) la prima volta che vedi un esito nuovo (zsh_pvp_visti).
   ========================================================= */
const PVP={d:null,t:0,uid:null};
const PVP_ESITO=['🛡️ Respinto','⚔️ Vittoria di misura','⚔️ Vittoria','💥 Vittoria schiacciante'];
const PVP_PERSO=['🛡️ Attacco respinto','😣 Sconfitta di misura','😣 Sconfitta','💀 Sconfitta pesante'];
async function pvpLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return PVP.d;if(!force&&PVP.d&&Date.now()-PVP.t<30000)return PVP.d;PVP.t=Date.now();
  try{const{data,error}=await SB.rpc('world_attacchi_miei');if(!error&&data&&data.ok){PVP.d=data;PVP.skew=Date.now()-new Date(data.ora).getTime();}}catch(e){}return PVP.d;}
const pvpLeft=iso=>{const ms=new Date(iso).getTime()-(Date.now()-(PVP.skew||0));if(ms<=0)return'adesso';const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000);return`${m}:${String(s).padStart(2,'0')}`;};
const pvpLoot=l=>{l=l||{};const t=[l.legno?'🪵 '+l.legno:'',l.cibo?'🥫 '+l.cibo:'',l.carb?'⛽ '+l.carb:'',l.mattoni?'🧱 '+l.mattoni:''].filter(Boolean).join(' · ');return t||'niente';};
/* ---------- la scheda dell'attacco ---------- */
async function pvpSheet(o){o=o||{};let d=null;try{const{data,error}=await SB.rpc('world_attacco_info',{p_user:o.user||null,p_bid:o.bid||null});if(error)throw error;d=data;}catch(e){toast('⚔️ Gli attacchi arrivano dopo l’aggiornamento del server (blocco SQL 028)');return;}
  if(!d||!d.owner){toast('⚔️ '+((d&&d.msg)||'Bersaglio non trovato'));return;}
  const r=+d.rapporto||0;const st=r<0.9?['Quasi impossibile','ko']:r<1.1?['In bilico: può andare in tutti e due i modi','mid']:r<1.4?['Probabile vittoria di misura (10%)','ok']:r<1.75?['Probabile vittoria (20%)','ok']:['Vittoria schiacciante (30%)','ok'];
  const c=d.costo||{};const pc=Math.max(4,Math.min(100,Math.round(d.forza/Math.max(1,d.forza+d.difesa)*100)));
  openSheet(`⚔️ Attacca @${esc(d.nick)}`,`<p class="muted" style="margin:0 0 8px">${esc(d.label)}${d.home?' · ❤️ casa vera':' · 🔑 casa comprata'}</p>
    ${d.ok?'':`<div class="pvpno">🚫 ${esc(d.msg||'Non si può attaccare')}</div>`}
    <div class="pvpgrid"><div><span>📏</span><b>${String(d.km).replace('.',',')} km</b><small>distanza</small></div><div><span>⏱️</span><b>${d.minuti} min</b><small>viaggio ${esc(d.mezzo_nome||'')}</small></div>
      <div><span>💰</span><b>🥫 ${c.cibo}${c.carb?' ⛽ '+c.carb:''}</b><small>+ ${c.energia} energia</small></div></div>
    <div class="pvpvs"><div><small>La tua forza</small><b>⚔️ ${Math.round(d.forza)}</b></div><div class="pvpbar"><span style="width:${pc}%"></span></div><div><small>La sua difesa</small><b>🛡️ ~${d.difesa}</b></div></div>
    <p class="pvpstima ${st[1]}">${st[0]}</p>
    <p class="muted" style="font-size:12.5px">Forza = (30 + 3 × livello) × mezzo × 🔪 Combattente (${d.combattente}/9: +${d.combattente*5}%). Lui si difende con case, fortificazioni, preparazione, rinforzi e il suo Combattente. Vinci se attacco > difesa: di misura 10%, normale 20%, schiacciante 30% delle sue scorte (oltre la scorta protetta). Riceve subito la notifica e può prepararsi.</p>
    ${d.ok?`<button class="btn wide" data-pvgo>⚔️ Parti all’attacco (arrivo fra ${d.minuti} min)</button>`:''}`,box=>{
    const b=box.querySelector('[data-pvgo]');if(b)b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_attacca',{p_user:o.user||null,p_bid:o.bid||null});if(error)throw error;toast(data.msg);
      if(data.ok){closeSheet();RES.t=0;try{resLoad(true);supLoad(true);}catch(e){}pvpLoad(true).then(pvpPaint);}else b.disabled=false;}catch(e){toast('Non riuscito');b.disabled=false;}};});}
/* le vecchie azioni portano qui */
zEvery(()=>{try{if(typeof SB==='undefined'||!SB||SB.__pvpw||!SB.rpc)return;const o=SB.rpc.bind(SB);
  SB.rpc=async function(n,a){const r=await o(n,a);try{const d=r&&r.data;if(d&&d.nuovo&&['world_send_attack','world_saccheggia','world_assalta'].includes(n))setTimeout(()=>pvpSheet(n==='world_assalta'?{bid:a.p_bid}:{user:a.p_target||a.p_user}),300);}catch(e){}return r;};SB.__pvpw=1;}catch(e){}},1000,'attacchi-vecchi');
const _playerSheetPvp=playerSheet;playerSheet=async function(uid){PVP.uid=uid;return _playerSheetPvp.apply(this,arguments);};
const _trrSectionPvp=trrSection;trrSection=async function(c,bid){const r=await _trrSectionPvp.apply(this,arguments);try{const b=c&&c.querySelector('.trrpan');if(b)b.dataset.pvbid=bid;}catch(e){}return r;};
if(typeof doDisp==='function'){const _doDispPvp=doDisp;doDisp=function(uid,nick,k){if(k==='orda'){pvpSheet({user:uid});return;}return _doDispPvp.apply(this,arguments);};}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-pa="atk"],[data-aatk],[data-trsac],[data-trk="atk"]');if(!t)return;
  let o=null;if(t.matches('[data-pa="atk"]'))o={user:PVP.uid};else if(t.dataset.aatk)o={user:t.dataset.aatk};else if(t.dataset.trsac)o={user:t.dataset.trsac};
  else{const p=t.closest('.trrpan');const bid=p&&p.dataset.pvbid;if(bid&&!String(bid).startsWith('pres:'))o={bid};}
  if(!o||(!o.user&&!o.bid))return;e.stopPropagation();e.preventDefault();window.SHEET_BACK=null;pvpSheet(o);},true);
zEvery(()=>{try{document.querySelectorAll('[data-pa="atk"],[data-trsac],[data-aatk]').forEach(b=>{if(b.textContent!=='⚔️ Attacca')b.textContent='⚔️ Attacca';b.disabled=false;});
  document.querySelectorAll('.trrpan [data-trk="atk"]').forEach(b=>{const p=b.closest('.trrpan');if(p&&p.dataset.pvbid&&!String(p.dataset.pvbid).startsWith('pres:')&&b.textContent!=='⚔️ Attacca')b.textContent='⚔️ Attacca';});}catch(e){}},1000,'attacchi-etichette');
/* ---------- 🧑 Io: il riquadro degli attacchi ---------- */
function pvpHTML(){const d=PVP.d;if(!d)return'';const A=d.in_arrivo||[],V=d.in_viaggio||[],H=(d.storico||[]).slice(0,6);
  const arr=A.map(a=>`<div class="pvprow arr"><span>⚔️</span><div><b>@${esc(a.da)} attacca la tua ${a.casa_vera?'casa vera':'casa comprata'}</b><small>impatto fra <i data-pvt="${a.impatto}">${pvpLeft(a.impatto)}</i> · ${String(a.km).replace('.',',')} km</small>
      <div class="pvpacts"><button class="btn small" data-pvprep>🛡️ Prepara (+15)</button><button class="btn small ghost" data-pvaiuto>📣 Chiedi aiuto</button></div></div></div>`).join('');
  const via=V.map(a=>`<div class="pvprow"><span>🏃</span><div><b>Squadra verso @${esc(a.contro)}</b><small>arriva fra <i data-pvt="${a.impatto}">${pvpLeft(a.impatto)}</i> · forza ${Math.round(a.forza)}</small></div></div>`).join('');
  const st=H.map(x=>{const e=x.esito||{};const k=+e.esito||0;const io=x.io==='att';const t=x.stato==='annullato'?'↩️ Annullato':io?PVP_ESITO[k]:PVP_PERSO[k];
    return`<button class="pvprow st ${io?(k?'win':'lose'):(k?'lose':'win')}" data-pvst="${x.id}"><span>${io?'⚔️':'🛡️'}</span><div><b>${t} · @${esc(x.altro)}</b><small>${x.stato==='annullato'?esc(e.msg||''):(io?(k?'preso: ':'niente bottino'):(k?'perso: ':'nessuna perdita'))+(k&&x.stato!=='annullato'?pvpLoot(e.loot):'')}</small></div></button>`;}).join('');
  const dn=(d.danno_casa||0)+(d.danni||[]).reduce((s,x)=>s+(+x.danno||0),0);
  return`<div class="panel pvpbox"><b class="disp" style="font-size:22px">⚔️ Attacchi</b>
    ${arr||'<p class="muted" style="margin:4px 0">Nessun attacco in arrivo. Per attaccare: tocca un superstite o una casa e poi ⚔️ Attacca.</p>'}${via}
    ${dn?`<div class="pvprow dan"><span>🔨</span><div><b>Difese danneggiate: −${dn}</b><small>riparale con 🪵 (2 a punto)</small></div><button class="btn small" data-pvrip>Ripara</button></div>`:''}
    ${st?`<h4 style="margin:10px 0 4px">📜 Storico</h4>${st}`:''}</div>`;}
function pvpPaint(){if(S.tab!=='orda'||!document.body.classList.contains('iopage'))return;const pg=app.querySelector('.page.orda1');if(!pg)return;const h=pvpHTML();
  let b=pg.querySelector('.pvpbox');const top=pg.querySelector('.iotop .sbtiles')||pg.querySelector('.iotop .iosec');
  if(!h){if(b)b.remove();return;}const k=h.replace(/data-pvt="[^"]*">[^<]*</g,'');if(b&&b.dataset.k===k)return;
  if(b)b.outerHTML=h;else if(top)top.insertAdjacentHTML('beforebegin',h);else pg.insertAdjacentHTML('afterbegin',h);b=pg.querySelector('.pvpbox');b.dataset.k=k;
  b.querySelectorAll('[data-pvprep]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const{data}=await SB.rpc('world_prepare');toast(data&&data.ok?'🛡️ Case preparate: +15 di difesa':((data&&data.msg)||'Già preparate'));}catch(e){toast('Non riuscito');}try{orLoad(true);}catch(e){}});
  b.querySelectorAll('[data-pvaiuto]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const{data}=await SB.rpc('world_ask_help');toast(data&&data.ok?'📣 Richiesta mandata ai tuoi alleati: i rinforzi valgono se arrivano prima':((data&&data.msg)||'Fatto'));}catch(e){toast('Non riuscito');}});
  const rp=b.querySelector('[data-pvrip]');if(rp)rp.onclick=async()=>{rp.disabled=true;const d=PVP.d;const L=[];try{const h=myHouses().find(x=>x.home);if(d.danno_casa)L.push((h&&h.bid)||'');}catch(e){}(d.danni||[]).forEach(x=>L.push(x.bid));
    for(const bid of L){try{const{data}=await SB.rpc('world_ripara',{p_bid:bid});toast(data.msg);}catch(e){}}RES.t=0;try{resLoad(true);}catch(e){}pvpLoad(true).then(pvpPaint);};
  b.querySelectorAll('[data-pvst]').forEach(x=>x.onclick=()=>{const s=(PVP.d.storico||[]).find(y=>String(y.id)===x.dataset.pvst);if(s)pvpRiepilogo(s);});}
/* ---------- riepilogo del combattimento ---------- */
function pvpRiepilogo(x){const e=x.esito||{};const k=+e.esito||0;const io=x.io==='att';try{const v=JSON.parse(localStorage.getItem('zsh_pvp_visti')||'[]');if(!v.includes(x.id)){v.push(x.id);localStorage.setItem('zsh_pvp_visti',JSON.stringify(v.slice(-60)));}}catch(er){}
  if(x.stato==='annullato'){openSheet('⚔️ Attacco annullato',`<p>${esc(e.msg||'')}</p><p class="muted">Ti abbiamo restituito il 🥫.</p>`);return;}
  const titolo=io?PVP_ESITO[k]:PVP_PERSO[k];const pc=Math.max(4,Math.min(100,Math.round((+e.att||0)/Math.max(1,(+e.att||0)+(+e.dif||0))*100)));
  openSheet(`${titolo}`,`<div class="pvpris ${io===!!k?'win':'lose'}"><b>${io?'La tua squadra':'@'+esc(x.altro)} ⚔️ ${Math.round(e.att||0)} contro 🛡️ ${Math.round(e.dif||0)} ${io?'@'+esc(x.altro):'la tua casa'}</b>
      <div class="pvpbar"><span style="width:${pc}%"></span></div><small>Rapporto ${String(e.r||0).replace('.',',')} (caso ${(e.caso>0?'+':'')+Math.round((e.caso||0)*100)}%)</small></div>
    ${k?`<p>${io?'🎒 Bottino':'📦 Scorte perse'}: <b>${pvpLoot(e.loot)}</b></p>${e.danno?`<p>🔨 Difese ${io?'nemiche':'tue'} danneggiate: −${e.danno}${io?'':' (riparale in Io con 🪵)'}</p>`:''}`:`<p>${io?'La sua difesa ha tenuto: niente bottino.':'La tua casa ha tenuto: nessuna perdita.'}</p>`}
    <p class="muted" style="font-size:12.5px">${io?'Sali di 🔪 Combattente e attacca con gli alleati per vincere più spesso.':'Per difenderti meglio: prepara le case, fortifica, chiedi rinforzi agli alleati e sali di 🔪 Combattente.'}</p>`);}
function pvpNuovi(){const d=PVP.d;if(window.__noHello&&!window.__pvpPop)return;if(!d||document.querySelector('#sheet.open')||document.getElementById('lente'))return;let v=[];try{v=JSON.parse(localStorage.getItem('zsh_pvp_visti')||'[]');}catch(e){}
  const n=(d.storico||[]).find(x=>!v.includes(x.id)&&x.stato==='risolto'&&Date.now()-new Date(x.quando)<48*3600e3);if(n)pvpRiepilogo(n);}
/* ---------- 🗺️ allarme sulla mappa ---------- */
function pvpAllarme(){const w=app.querySelector('.mapfull');const A=(PVP.d&&PVP.d.in_arrivo)||[];let a=w&&w.querySelector('.pvpal');
  if(!w||S.tab!=='mappa'||!A.length){if(a)a.remove();return;}
  if(!a){w.insertAdjacentHTML('beforeend','<button class="pvpal" type="button"></button>');a=w.querySelector('.pvpal');a.onclick=()=>{sbGo('io');setTimeout(()=>{const b=document.querySelector('.pvpbox');if(b)b.scrollIntoView({behavior:'smooth',block:'start'});},900);};}
  const x=A[0];const t=`⚔️ @${x.da} attacca! · ${pvpLeft(x.impatto)}${A.length>1?' · +'+(A.length-1):''}`;if(a.textContent!==t)a.textContent=t;}
zEvery(()=>{try{if(document.hidden||!S.user)return;document.querySelectorAll('[data-pvt]').forEach(i=>{const t=pvpLeft(i.dataset.pvt);if(i.textContent!==t)i.textContent=t;});pvpAllarme();
  const near=((PVP.d&&PVP.d.in_arrivo)||[]).concat((PVP.d&&PVP.d.in_viaggio)||[]).some(a=>new Date(a.impatto).getTime()-(Date.now()-(PVP.skew||0))<1500);
  pvpLoad(near).then(()=>{pvpPaint();pvpNuovi();});}catch(e){}},1000,'attacchi');
/* novità e notifiche → Io, al riquadro degli attacchi */
const _zGoPvp=zGoUrl;zGoUrl=function(u){_zGoPvp(u);try{if(new URL(u,location.href).searchParams.get('attacchi'))setTimeout(()=>{sbGo('io');setTimeout(()=>{pvpLoad(true).then(()=>{pvpPaint();const b=document.querySelector('.pvpbox');if(b)b.scrollIntoView({block:'start'});});},900);},1200);}catch(e){}};
</script>
