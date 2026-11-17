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
   - 🛡️ Rinforzi (029, Fase 36): "📣 Chiedi rinforzi" (world_rinforzi_chiedi), "👥 Chi arriva in tempo" (pvpRinfSheet),
     "🆘 Alleati sotto attacco" con "🛡️ Manda rinforzi" (world_rinforza), allarme .pvpal.sos, carte pvpGdItems.
   - 📯 Attacchi d’alleanza (030, Fase 37): "🛡️ Attacca con l’alleanza" nella scheda (pvpAlzHTML → world_raduno_crea),
     "📯 Raduni della tua alleanza" in Io (unisciti, partite adesso, annulla), quote del bottino nello storico e nel riepilogo.
   - 🏚️ Integrità delle case comprate (031, Fase 38): righe in Io (world_case_integrita → PVP.ci, 🔨 Ripara = world_ripara),
     barra nella pagina della casa (trrSection), integrità nella scheda d’attacco (world_integrita), riepilogo, carta pvpCiGdItems.
   - 🧟 Orde sul motore unico (032, Fase 39): "Le ultime orde" in Io (world_orde_mie → PVP.or, ordaHTML) e riepilogo automatico
     delle perdite (ordaRiepilogo, zsh_orda_visti).
   ========================================================= */
const PVP={d:null,t:0,uid:null};
const PVP_ESITO=['🛡️ Respinto','⚔️ Vittoria di misura','⚔️ Vittoria','💥 Vittoria schiacciante'];
const PVP_PERSO=['🛡️ Attacco respinto','😣 Sconfitta di misura','😣 Sconfitta','💀 Sconfitta pesante'];
async function pvpLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return PVP.d;if(!force&&PVP.d&&Date.now()-PVP.t<30000)return PVP.d;PVP.t=Date.now();
  try{const{data,error}=await SB.rpc('world_case_integrita');PVP.ci=!error&&data&&data.ok?(data.case||[]):null;}catch(e){PVP.ci=null;}
  try{const{data,error}=await SB.rpc('world_orde_mie');PVP.or=!error&&data&&data.ok?(data.orde||[]):null;}catch(e){PVP.or=null;}
  try{const{data,error}=await SB.rpc('world_attacchi_miei');if(!error&&data&&data.ok){PVP.d=data;PVP.skew=Date.now()-new Date(data.ora).getTime();}}catch(e){}return PVP.d;}
const pvpLeft=iso=>{const ms=new Date(iso).getTime()-(Date.now()-(PVP.skew||0));if(ms<=0)return'adesso';const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000);if(m>=60)return`${Math.floor(m/60)} h ${m%60} min`;return`${m}:${String(s).padStart(2,'0')}`;};
const pvpLoot=l=>{l=l||{};const t=[l.legno?'🪵 '+l.legno:'',l.cibo?'🥫 '+l.cibo:'',l.carb?'⛽ '+l.carb:'',l.mattoni?'🧱 '+l.mattoni:''].filter(Boolean).join(' · ');return t||'niente';};
/* ---------- la scheda dell'attacco ---------- */
async function pvpSheet(o){o=o||{};let d=null;try{const{data,error}=await SB.rpc('world_attacco_info',{p_user:o.user||null,p_bid:o.bid||null});if(error)throw error;d=data;}catch(e){toast('⚔️ Gli attacchi arrivano dopo l’aggiornamento del server (blocco SQL 028)');return;}
  if(!d||!d.owner){toast('⚔️ '+((d&&d.msg)||'Bersaglio non trovato'));return;}
  if(!d.home){try{const{data}=await SB.rpc('world_integrita',{p_bid:d.bid});if(data&&data.ok){d.integ=data.integrita;d.crollata=data.crollata;}}catch(e){}}
  const r=+d.rapporto||0;const st=r<0.9?['Quasi impossibile','ko']:r<1.1?['In bilico: può andare in tutti e due i modi','mid']:r<1.4?['Probabile vittoria di misura (10%)','ok']:r<1.75?['Probabile vittoria (20%)','ok']:['Vittoria schiacciante (30%)','ok'];
  const c=d.costo||{};const pc=Math.max(4,Math.min(100,Math.round(d.forza/Math.max(1,d.forza+d.difesa)*100)));
  openSheet(`⚔️ Attacca @${esc(d.nick)}`,`<p class="muted" style="margin:0 0 8px">${esc(d.label)}${d.home?' · ❤️ casa vera':' · 🔑 casa comprata'}${d.integ!=null?` · 🏚️ integrità ${d.integ}/100`:''}</p>${d.integ!=null&&!d.crollata?'<p class="muted" style="font-size:12.5px;margin:-4px 0 8px">Se vinci la sua integrità scende di 10, 17 o 25: a 0 la casa crolla e, se non la ripara in 48 ore, passa a te.</p>':''}
    ${d.ok?'':`<div class="pvpno">🚫 ${esc(d.msg||'Non si può attaccare')}</div>`}
    <div class="pvpgrid"><div><span>📏</span><b>${String(d.km).replace('.',',')} km</b><small>distanza</small></div><div><span>⏱️</span><b>${d.minuti} min</b><small>viaggio ${esc(d.mezzo_nome||'')}</small></div>
      <div><span>💰</span><b>🥫 ${c.cibo}${c.carb?' ⛽ '+c.carb:''}</b><small>+ ${c.energia} energia</small></div></div>
    <div class="pvpvs"><div><small>La tua forza</small><b>⚔️ ${Math.round(d.forza)}</b></div><div class="pvpbar"><span style="width:${pc}%"></span></div><div><small>La sua difesa</small><b>🛡️ ~${d.difesa}</b></div></div>
    <p class="pvpstima ${st[1]}">${st[0]}</p>
    <p class="muted" style="font-size:12.5px">Forza = (30 + 3 × livello) × mezzo × 🔪 Combattente (${d.combattente}/9: +${d.combattente*5}%). Lui si difende con case, fortificazioni, preparazione, rinforzi e il suo Combattente. Vinci se attacco > difesa: di misura 10%, normale 20%, schiacciante 30% delle sue scorte (oltre la scorta protetta). Riceve subito la notifica e può prepararsi.</p>
    ${d.ok?`<button class="btn wide" data-pvgo>⚔️ Parti all’attacco (arrivo fra ${d.minuti} min)</button>`:''}${pvpAlzHTML(d)}`,box=>{
    box.querySelectorAll('[data-pvrad]').forEach(x=>x.onclick=async()=>{const[aid,min]=x.dataset.pvrad.split('|');box.querySelectorAll('[data-pvrad]').forEach(y=>y.disabled=true);
      try{const{data,error}=await SB.rpc('world_raduno_crea',{p_alleanza:+aid,p_user:o.user||null,p_bid:o.bid||null,p_minuti:+min});if(error)throw error;toast(data.msg);if(data.ok){closeSheet();RES.t=0;try{resLoad(true);supLoad(true);}catch(e){}pvpVaiBox();}else box.querySelectorAll('[data-pvrad]').forEach(y=>y.disabled=false);}
      catch(e){toast('🛡️ Gli attacchi d’alleanza arrivano dopo l’aggiornamento del server (blocco SQL 030)');box.querySelectorAll('[data-pvrad]').forEach(y=>y.disabled=false);}});
    box.querySelectorAll('[data-pvjoin]').forEach(x=>x.onclick=async()=>{await pvpUnisciti(+x.dataset.pvjoin,x);closeSheet();pvpVaiBox();});
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
const PVP_RF_CIBO=5;
function pvpRinfRiga(a){const R=a.rinforzi||[];if(!R.length)return a.chiesto?'<small class="pvprf">🛡️ Rinforzi chiesti: aspetta le squadre degli alleati</small>':'';
  return`<small class="pvprf">🛡️ Rinforzi +${Math.round(a.rinf||0)} · ${R.map(r=>`@${esc(r.nick)} ${r.in_tempo?(new Date(r.arrivo).getTime()<=Date.now()-(PVP.skew||0)?'✅ arrivato':`⏱️ <i data-pvt="${r.arrivo}">${pvpLeft(r.arrivo)}</i>`):'❌ in ritardo'}`).join(' · ')}</small>`;}
function pvpHTML(){const d=PVP.d;if(!d)return'';const A=d.in_arrivo||[],V=d.in_viaggio||[],H=(d.storico||[]).slice(0,6);
  const arr=A.map(a=>`<div class="pvprow arr"><span>⚔️</span><div><b>${a.alleanza?`${esc(a.alleanza)} (${a.n}) con @${esc(a.da)}`:'@'+esc(a.da)} attacca la tua ${a.casa_vera?'casa vera':'casa comprata'}</b><small>impatto fra <i data-pvt="${a.impatto}">${pvpLeft(a.impatto)}</i> · ${String(a.km).replace('.',',')} km</small>
      ${pvpRinfRiga(a)}<div class="pvpacts"><button class="btn small" data-pvprep>🛡️ Prepara (+15)</button>${a.chiesto?'<button class="btn small ghost" disabled>📣 Rinforzi chiesti</button>':`<button class="btn small ghost" data-pvaiuto="${a.id}">📣 Chiedi rinforzi</button>`}<button class="btn small ghost" data-pvchi="${a.id}">👥 Chi arriva in tempo</button></div></div></div>`).join('');
  const al=(d.alleati||[]).map(a=>`<div class="pvprow sos"><span>🆘</span><div><b>@${esc(a.chi)} è attaccato da @${esc(a.da)}</b><small>impatto fra <i data-pvt="${a.impatto}">${pvpLeft(a.impatto)}</i> · tu sei a ${String(a.km==null?'?':a.km).replace('.',',')} km (${a.minuti} min)</small>
      <div class="pvpacts">${a.partito?`<span class="pvpok">✅ La tua squadra arriva fra <i data-pvt="${a.arrivo}">${pvpLeft(a.arrivo)}</i></span>`:a.in_tempo?`<button class="btn small" data-pvrf="${a.id}">🛡️ Manda rinforzi · 🥫 ${PVP_RF_CIBO}</button>`:'<span class="pvpno2">❌ Non arrivi in tempo</span>'}</div></div></div>`).join('');
  const rad=(d.raduni||[]).map(r=>`<div class="pvprow rad"><span>📯</span><div><b>${esc(r.alleanza)} contro @${esc(r.contro)}</b><small>partenza fra <i data-pvt="${r.partenza}">${pvpLeft(r.partenza)}</i> · ${r.n}/${r.max} · forza insieme ⚔️ ${Math.round(r.forza||0)} · chiamato da @${esc(r.capo)}</small>
      <small>${(r.membri||[]).map(m=>'@'+esc(m)).join(' · ')}</small>
      <div class="pvpacts">${r.ci_sono?(r.io_capo?`<button class="btn small" data-pvpart="${r.id}">🚀 Partite adesso</button><button class="btn small ghost" data-pvann="${r.id}">✖ Annulla</button>`:'<span class="pvpok">✅ Ci sei: partite insieme</span>'):r.no?`<span class="pvpno2">🚫 ${esc(r.no)}</span>`:`<button class="btn small" data-pvjoin="${r.id}">⚔️ Unisciti · 🥫 ${(r.costo||{}).cibo||10}${(r.costo||{}).carb?' ⛽ '+r.costo.carb:''}</button>`}</div></div></div>`).join('');
  const via=V.map(a=>`<div class="pvprow"><span>🏃</span><div><b>${a.alleanza?`Squadra ${esc(a.alleanza)} (${a.n})`:'Squadra'} verso @${esc(a.contro)}</b><small>arriva fra <i data-pvt="${a.impatto}">${pvpLeft(a.impatto)}</i> · forza ${Math.round(a.forza)}</small></div></div>`).join('');
  const st=H.map(x=>{const e=x.esito||{};const k=+e.esito||0;const io=x.io==='att';const t=x.stato==='annullato'?'↩️ Annullato':io?PVP_ESITO[k]:PVP_PERSO[k];
    return`<button class="pvprow st ${io?(k?'win':'lose'):(k?'lose':'win')}" data-pvst="${x.id}"><span>${io?'⚔️':'🛡️'}</span><div><b>${t} · @${esc(x.altro)}</b><small>${x.stato==='annullato'?esc(e.msg||''):(io?(k?(x.alleanza?'la tua parte: ':'preso: '):'niente bottino'):(k?'perso: ':'nessuna perdita'))+(k&&x.stato!=='annullato'?pvpLoot(io&&x.mia?x.mia:e.loot):'')}${x.alleanza?' · '+esc(x.alleanza):''}</small></div></button>`;}).join('');
  const dn=(d.danno_casa||0)+(PVP.ci?0:(d.danni||[]).reduce((s,x)=>s+(+x.danno||0),0));
  const ci=(PVP.ci||[]).map(c=>`<div class="pvprow ${c.caduta_at?'crollo':'integ'}"><span>${c.caduta_at?'💥':'🏚️'}</span><div><b>${c.caduta_at?'Casa comprata crollata!':'Casa comprata danneggiata'} · integrità ${c.integrita}/100</b>
      <div class="pvpbar integ"><span style="width:${Math.max(2,c.integrita)}%"></span></div>
      <small>${c.caduta_at?`Niente affitto. Riparala entro <i data-pvt="${c.scade}">${pvpLeft(c.scade)}</i> o passa a @${esc(c.chi||'chi l’ha abbattuta')}`:'Ogni attacco perso la abbassa (−10/−17/−25); a 0 crolla.'}${c.danno?' · difese −'+c.danno:''}</small>
      <div class="pvpacts"><button class="btn small" data-pvrc="${esc(c.bid)}">🔨 Ripara · 🪵 ${c.legno}${c.mattoni?' 🧱 '+c.mattoni:''}</button></div></div></div>`).join('');
  return`<div class="panel pvpbox"><b class="disp" style="font-size:22px">⚔️ Attacchi</b>
    ${arr||'<p class="muted" style="margin:4px 0">Nessun attacco in arrivo. Per attaccare: tocca un superstite o una casa e poi ⚔️ Attacca.</p>'}${rad?`<h4 style="margin:10px 0 4px">📯 Raduni della tua alleanza</h4>${rad}`:''}${via}${al?`<h4 style="margin:10px 0 4px">🆘 Alleati sotto attacco</h4>${al}`:''}
    ${dn?`<div class="pvprow dan"><span>🔨</span><div><b>Difese danneggiate: −${dn}</b><small>riparale con 🪵 (2 a punto)</small></div><button class="btn small" data-pvrip>Ripara</button></div>`:''}${ci}
    ${ordaHTML()}${st?`<h4 style="margin:10px 0 4px">📜 Storico</h4>${st}`:''}</div>`;}
function pvpPaint(){if(S.tab!=='orda'||!document.body.classList.contains('iopage'))return;const pg=app.querySelector('.page.orda1');if(!pg)return;const h=pvpHTML();
  let b=pg.querySelector('.pvpbox');const top=pg.querySelector('.iotop .sbtiles')||pg.querySelector('.iotop .iosec');
  if(!h){if(b)b.remove();return;}const k=h.replace(/data-pvt="[^"]*">[^<]*</g,'');if(b&&b.dataset.k===k)return;
  if(b)b.outerHTML=h;else if(top)top.insertAdjacentHTML('beforebegin',h);else pg.insertAdjacentHTML('afterbegin',h);b=pg.querySelector('.pvpbox');b.dataset.k=k;
  b.querySelectorAll('[data-pvprep]').forEach(x=>x.onclick=async()=>{x.disabled=true;try{const{data}=await SB.rpc('world_prepare');toast(data&&data.ok?'🛡️ Case preparate: +15 di difesa':((data&&data.msg)||'Già preparate'));}catch(e){toast('Non riuscito');}try{orLoad(true);}catch(e){}});
  b.querySelectorAll('[data-pvaiuto]').forEach(x=>x.onclick=()=>pvpChiedi(+x.dataset.pvaiuto,x));
  b.querySelectorAll('[data-pvchi]').forEach(x=>x.onclick=()=>pvpRinfSheet(+x.dataset.pvchi));
  b.querySelectorAll('[data-pvrf]').forEach(x=>x.onclick=()=>pvpRinforza(+x.dataset.pvrf,x));
  b.querySelectorAll('[data-pvjoin]').forEach(x=>x.onclick=()=>pvpUnisciti(+x.dataset.pvjoin,x));
  b.querySelectorAll('[data-pvpart]').forEach(x=>x.onclick=()=>pvpRadRpc('world_raduno_parti',+x.dataset.pvpart,x));
  b.querySelectorAll('[data-pvann]').forEach(x=>x.onclick=()=>pvpRadRpc('world_raduno_annulla',+x.dataset.pvann,x));
  b.querySelectorAll('[data-pvrc]').forEach(x=>x.onclick=()=>pvpRiparaCasa(x.dataset.pvrc,x));
  const rp=b.querySelector('[data-pvrip]');if(rp)rp.onclick=async()=>{rp.disabled=true;const d=PVP.d;const L=[];try{const h=myHouses().find(x=>x.home);if(d.danno_casa)L.push((h&&h.bid)||'');}catch(e){}if(!PVP.ci)(d.danni||[]).forEach(x=>L.push(x.bid));
    for(const bid of L){try{const{data}=await SB.rpc('world_ripara',{p_bid:bid});toast(data.msg);}catch(e){}}RES.t=0;try{resLoad(true);}catch(e){}pvpLoad(true).then(pvpPaint);};
  b.querySelectorAll('[data-pvor]').forEach(x=>x.onclick=()=>{const o=(PVP.or||[]).find(y=>y.slot===x.dataset.pvor);if(o)ordaRiepilogo(o);});
  b.querySelectorAll('[data-pvst]').forEach(x=>x.onclick=()=>{const s=(PVP.d.storico||[]).find(y=>String(y.id)===x.dataset.pvst);if(s)pvpRiepilogo(s);});}
/* ---------- riepilogo del combattimento ---------- */
function pvpRiepilogo(x){const e=x.esito||{};const k=+e.esito||0;const io=x.io==='att';try{const v=JSON.parse(localStorage.getItem('zsh_pvp_visti')||'[]');if(!v.includes(x.id)){v.push(x.id);localStorage.setItem('zsh_pvp_visti',JSON.stringify(v.slice(-60)));}}catch(er){}
  if(x.stato==='annullato'){openSheet('⚔️ Attacco annullato',`<p>${esc(e.msg||'')}</p><p class="muted">Ti abbiamo restituito il 🥫.</p>`);return;}
  const titolo=io?PVP_ESITO[k]:PVP_PERSO[k];const pc=Math.max(4,Math.min(100,Math.round((+e.att||0)/Math.max(1,(+e.att||0)+(+e.dif||0))*100)));
  openSheet(`${titolo}`,`<div class="pvpris ${io===!!k?'win':'lose'}"><b>${io?'La tua squadra':'@'+esc(x.altro)} ⚔️ ${Math.round(e.att||0)} contro 🛡️ ${Math.round(e.dif||0)} ${io?'@'+esc(x.altro):'la tua casa'}</b>
      <div class="pvpbar"><span style="width:${pc}%"></span></div><small>Rapporto ${String(e.r||0).replace('.',',')} (caso ${(e.caso>0?'+':'')+Math.round((e.caso||0)*100)}%)${e.rinf_n?` · 🛡️ ${e.rinf_n} ${e.rinf_n==1?'squadra':'squadre'} di rinforzo +${Math.round(e.rinf||0)}`:''}</small></div>
    ${x.alleanza&&e.squadra?`<p class="pvpsq">${io?'La tua squadra':'La squadra'} ${esc(x.alleanza)}: ${e.squadra.map(m=>`@${esc(m.nick)} ⚔️ ${Math.round(m.c)}`).join(' · ')}</p>`:''}
    ${k&&io&&x.mia?`<p>🎒 La tua parte (secondo la forza che hai portato): <b>${pvpLoot(x.mia)}</b><br><small class="muted">Bottino di tutta la squadra: ${pvpLoot(e.loot)}</small></p>`:''}
    ${k&&!(io&&x.mia)?`<p>${io?'🎒 Bottino':'📦 Scorte perse'}: <b>${pvpLoot(e.loot)}</b></p>`:''}${k?`${e.danno?`<p>🔨 Difese ${io?'nemiche':'tue'} danneggiate: −${e.danno}${io?'':' (riparale in Io con 🪵)'}</p>`:''}`:''}${k&&e.integ!=null?(e.crollata?`<p class="pvpcrollo">💥 ${io?'La sua casa comprata è crollata! Se non la ripara entro 48 ore passa a chi l’ha abbattuta.':'La tua casa comprata è crollata! Riparala entro 48 ore in Io, o la perdi.'}</p>`:`<p>🏚️ Integrità della casa comprata −${e.integ} → ${e.integrita}/100${io?'':' (riparala in Io)'}</p>`):''}${!k?`<p>${io?'La sua difesa ha tenuto: niente bottino.':'La tua casa ha tenuto: nessuna perdita.'}</p>`:''}
    <p class="muted" style="font-size:12.5px">${io?'Sali di 🔪 Combattente e attacca con gli alleati per vincere più spesso.':'Per difenderti meglio: prepara le case, fortifica, chiedi rinforzi agli alleati e sali di 🔪 Combattente.'}</p>`);}
function pvpNuovi(){const d=PVP.d;if(window.__noHello&&!window.__pvpPop)return;if(!d||document.querySelector('#sheet.open')||document.getElementById('lente'))return;
  try{const ov=JSON.parse(localStorage.getItem('zsh_orda_visti')||'[]');const no=(PVP.or||[]).find(o=>o.esito>0&&!ov.includes(o.slot)&&Date.now()-new Date(o.quando)<24*3600e3);if(no){ordaRiepilogo(no);return;}}catch(e){}let v=[];try{v=JSON.parse(localStorage.getItem('zsh_pvp_visti')||'[]');}catch(e){}
  const n=(d.storico||[]).find(x=>!v.includes(x.id)&&x.stato==='risolto'&&Date.now()-new Date(x.quando)<48*3600e3);if(n)pvpRiepilogo(n);}
/* ---------- 🗺️ allarme sulla mappa ---------- */
function pvpAllarme(){const w=app.querySelector('.mapfull');const A=(PVP.d&&PVP.d.in_arrivo)||[];const L=((PVP.d&&PVP.d.alleati)||[]).filter(x=>x.in_tempo&&!x.partito);let a=w&&w.querySelector('.pvpal');
  if(w&&S.tab==='mappa'&&!A.length&&L.length){if(a&&!a.classList.contains('sos')){a.remove();a=null;}
    if(!a){w.insertAdjacentHTML('beforeend','<button class="pvpal sos" type="button"></button>');a=w.querySelector('.pvpal');a.onclick=()=>pvpVaiBox();}
    const t=`🆘 @${L[0].chi} sotto attacco · ${pvpLeft(L[0].impatto)} · manda rinforzi`;if(a.textContent!==t)a.textContent=t;return;}
  if(a&&a.classList.contains('sos')){a.remove();a=null;}
  if(!w||S.tab!=='mappa'||!A.length){if(a)a.remove();return;}
  if(!a){w.insertAdjacentHTML('beforeend','<button class="pvpal" type="button"></button>');a=w.querySelector('.pvpal');a.onclick=()=>{sbGo('io');setTimeout(()=>{const b=document.querySelector('.pvpbox');if(b)b.scrollIntoView({behavior:'smooth',block:'start'});},900);};}
  const x=A[0];const t=`⚔️ @${x.da} attacca! · ${pvpLeft(x.impatto)}${A.length>1?' · +'+(A.length-1):''}`;if(a.textContent!==t)a.textContent=t;}
zEvery(()=>{try{if(document.hidden||!S.user)return;document.querySelectorAll('[data-pvt]').forEach(i=>{const t=pvpLeft(i.dataset.pvt);if(i.textContent!==t)i.textContent=t;});pvpAllarme();
  const near=((PVP.d&&PVP.d.in_arrivo)||[]).concat((PVP.d&&PVP.d.in_viaggio)||[]).some(a=>new Date(a.impatto).getTime()-(Date.now()-(PVP.skew||0))<1500);
  pvpLoad(near).then(()=>{pvpPaint();pvpNuovi();});}catch(e){}},1000,'attacchi');
/* novità e notifiche → Io, al riquadro degli attacchi */
const _zGoPvp=zGoUrl;zGoUrl=function(u){_zGoPvp(u);try{if(new URL(u,location.href).searchParams.get('attacchi'))setTimeout(()=>{sbGo('io');setTimeout(()=>{pvpLoad(true).then(()=>{pvpPaint();const b=document.querySelector('.pvpbox');if(b)b.scrollIntoView({block:'start'});});},900);},1200);}catch(e){}};
/* ---------- 🛡️ rinforzi (migrazione 029, Fase 36) ---------- */
function pvpVaiBox(){sbGo('io');setTimeout(()=>{pvpLoad(true).then(()=>{pvpPaint();const b=document.querySelector('.pvpbox');if(b)b.scrollIntoView({behavior:'smooth',block:'start'});});},900);}
async function pvpChiedi(id,x){if(x)x.disabled=true;try{const{data,error}=await SB.rpc('world_rinforzi_chiedi',{p_att:id});if(error)throw error;toast(data.msg);}catch(e){toast('🛡️ I rinforzi arrivano dopo l’aggiornamento del server (blocco SQL 029)');if(x)x.disabled=false;}
  pvpLoad(true).then(pvpPaint);}
async function pvpRinforza(id,x){if(x)x.disabled=true;try{const{data,error}=await SB.rpc('world_rinforza',{p_att:id});if(error)throw error;toast(data.msg);if(data.ok){RES.t=0;try{resLoad(true);}catch(e){}}else if(x)x.disabled=false;}
  catch(e){toast('🛡️ I rinforzi arrivano dopo l’aggiornamento del server (blocco SQL 029)');if(x)x.disabled=false;}pvpLoad(true).then(pvpPaint);}
async function pvpRinfSheet(id){let d=null;try{const{data,error}=await SB.rpc('world_rinforzi_info',{p_att:id});if(error)throw error;d=data;}catch(e){toast('🛡️ I rinforzi arrivano dopo l’aggiornamento del server (blocco SQL 029)');return;}
  if(!d||!d.ok){toast((d&&d.msg)||'Attacco finito');return;}const L=d.alleati||[];const ok=L.filter(a=>a.in_tempo||a.partito).length;
  const row=a=>`<div class="pvprow ${a.in_tempo||a.partito?'':'tardi'}"><span>${a.partito?'🛡️':a.in_tempo?'✅':'❌'}</span><div><b>@${esc(a.nick)}</b><small>${a.km==null?'senza casa nel mondo':String(a.km).replace('.',',')+' km · '+a.minuti+' min di viaggio'} · ${a.partito?'squadra in viaggio, arriva fra <i data-pvt="'+a.arrivo+'">'+pvpLeft(a.arrivo)+'</i>':a.in_tempo?'può arrivare in tempo':'non arriva in tempo'}</small></div></div>`;
  openSheet('👥 Chi arriva in tempo',`<p class="muted" style="margin:0 0 8px">Impatto fra <b data-pvt="${d.impatto}">${pvpLeft(d.impatto)}</b>. Contano solo le squadre che arrivano <b>prima</b>: ognuna vale metà della sua forza (la 2ª il 60%, la 3ª il 40%, poi il 25%), al massimo +60 alla difesa. Adesso: <b>+${Math.round(d.rinf||0)}</b>.</p>
    ${L.length?L.map(row).join(''):'<p>Non hai ancora alleati: fai alleanza con i vicini (👥 Amici).</p>'}
    ${d.chiesto?'<p class="pvpok">📣 Hai già chiamato i tuoi alleati.</p>':L.length?`<button class="btn wide" data-pvch>📣 Chiedi rinforzi a tutti (${ok} in tempo)</button>`:''}`,box=>{const b=box.querySelector('[data-pvch]');if(b)b.onclick=async()=>{await pvpChiedi(id,b);closeSheet();};});}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pvaiutoopen]');if(!b)return;e.preventDefault();e.stopPropagation();window.SHEET_BACK=null;closeSheet();pvpVaiBox();},true);
/* carte della guida e di ADESSO */
function pvpGdItems(I){const d=PVP.d;if(!d)return;
  (d.in_arrivo||[]).slice(0,1).forEach(a=>I.push({p:96,ic:'⚔️',t:`@${esc(a.da)} ti attacca fra ${pvpLeft(a.impatto)}`,why:a.chiesto?`Rinforzi chiesti: +${Math.round(a.rinf||0)} alla difesa finora. Prepara le case.`:'Chiama gli alleati: le loro squadre contano se arrivano prima dell’impatto.',cost:'gratis',
    acts:[a.chiesto?{b:'👥 Chi arriva',run:async()=>{pvpRinfSheet(a.id);return{skip:1};}}:{b:'📣 Chiedi rinforzi',run:async()=>{await pvpChiedi(a.id);return{skip:1};}},{b:'Vedi',run:async()=>{pvpVaiBox();return{skip:1};}}]}));
  (d.alleati||[]).filter(a=>a.in_tempo&&!a.partito).slice(0,1).forEach(a=>I.push({p:90,ic:'🆘',t:`@${esc(a.chi)} è sotto attacco`,why:`@${esc(a.da)} arriva fra ${pvpLeft(a.impatto)}: tu ci metti ${a.minuti} min. Se lo respingete: ⭐ 15 e 🥫 5.`,cost:`🥫 ${PVP_RF_CIBO}`,
    acts:[{b:'🛡️ Manda rinforzi',run:async()=>{await pvpRinforza(a.id);return{skip:1};}}]}));}
const _gdItemsPvp=gdItems;gdItems=function(){const I=_gdItemsPvp.apply(this,arguments);try{pvpGdItems(I);I.sort((a,b)=>b.p-a.p);}catch(e){}return I;};
/* ---------- 📯 attacchi d'alleanza (migrazione 030, Fase 37) ---------- */
function pvpAlzHTML(d){const L=d.alleanze||[];if(!L.length||!(d.ok||L.some(a=>a.raduno)))return'';
  return`<div class="pvpalz"><b>🛡️ Attacca con l’alleanza</b><small>Chiami i membri: hanno 10, 20 o 30 minuti per unirsi, poi partite insieme (il viaggio dura quanto quello del più lontano). Le forze si sommano con un calo (la più forte intera, poi 60%, 40%, 25%), al massimo 10; il bottino si divide secondo la forza di ciascuno. Ognuno paga 🥫 10, il carburante e 1 energia.</small>
    ${L.map(a=>`<div class="pvpalzr"><span>${esc(a.emblema||'🛡️')} ${esc(a.nome)} · ${a.membri} membri</span>${a.raduno?`<button class="btn small" data-pvjoin="${a.raduno}">⚔️ Unisciti al raduno</button>`:`<span class="pvpalzb">📯 Raduno fra ${[10,20,30].map(m=>`<button class="btn small ghost" data-pvrad="${a.id}|${m}">${m} min</button>`).join('')}</span>`}</div>`).join('')}</div>`;}
async function pvpUnisciti(id,x){if(x)x.disabled=true;try{const{data,error}=await SB.rpc('world_raduno_unisciti',{p_raduno:id});if(error)throw error;toast(data.msg);if(data.ok){RES.t=0;try{resLoad(true);supLoad(true);}catch(e){}}else if(x)x.disabled=false;}
  catch(e){toast('🛡️ Gli attacchi d’alleanza arrivano dopo l’aggiornamento del server (blocco SQL 030)');if(x)x.disabled=false;}pvpLoad(true).then(pvpPaint);}
async function pvpRadRpc(fn,id,x){if(x)x.disabled=true;try{const{data,error}=await SB.rpc(fn,{p_raduno:id});if(error)throw error;toast(data.msg);if(data.ok){RES.t=0;try{resLoad(true);}catch(e){}}}catch(e){toast('Non riuscito');}if(x)x.disabled=false;pvpLoad(true).then(pvpPaint);}
function pvpRadGdItems(I){const d=PVP.d;if(!d)return;(d.raduni||[]).filter(r=>!r.ci_sono&&!r.no).slice(0,1).forEach(r=>I.push({p:89,ic:'📯',t:`${esc(r.alleanza)} attacca @${esc(r.contro)}`,why:`@${esc(r.capo)} chiama il raduno: partenza fra ${pvpLeft(r.partenza)}, siete ${r.n}. Il bottino si divide secondo la forza di ciascuno.`,cost:`🥫 ${(r.costo||{}).cibo||10}${(r.costo||{}).carb?' ⛽ '+r.costo.carb:''} + 1 energia`,
  acts:[{b:'⚔️ Unisciti',run:async()=>{await pvpUnisciti(r.id);return{skip:1};}},{b:'Vedi',run:async()=>{pvpVaiBox();return{skip:1};}}]}));}
const _gdItemsRad=gdItems;gdItems=function(){const I=_gdItemsRad.apply(this,arguments);try{pvpRadGdItems(I);I.sort((a,b)=>b.p-a.p);}catch(e){}return I;};
/* ---------- 🏚️ integrità delle case comprate (migrazione 031, Fase 38) ---------- */
async function pvpRiparaCasa(bid,x){if(x)x.disabled=true;try{const{data,error}=await SB.rpc('world_ripara',{p_bid:bid});if(error)throw error;toast(data.msg);if(data.ok){RES.t=0;try{resLoad(true);wMine(true);}catch(e){}}else if(x)x.disabled=false;}catch(e){toast('Non riuscito');if(x)x.disabled=false;}pvpLoad(true).then(pvpPaint);}
function pvpCiGdItems(I){(PVP.ci||[]).filter(c=>c.caduta_at).slice(0,1).forEach(c=>I.push({p:98,ic:'💥',t:'Una tua casa comprata è crollata',why:`Riparala entro ${pvpLeft(c.scade)} o passa a @${esc(c.chi||'chi l’ha abbattuta')}. Finché è crollata non rende affitto.`,cost:`🪵 ${c.legno}${c.mattoni?' 🧱 '+c.mattoni:''}`,
  acts:[{b:'🔨 Ripara',run:async()=>{await pvpRiparaCasa(c.bid);return{skip:1};}},{b:'Vedi',run:async()=>{pvpVaiBox();return{skip:1};}}]}));}
const _gdItemsCi=gdItems;gdItems=function(){const I=_gdItemsCi.apply(this,arguments);try{pvpCiGdItems(I);I.sort((a,b)=>b.p-a.p);}catch(e){}return I;};
/* nella pagina della casa comprata: la barra dell'integrità */
const _trrSectionCi=trrSection;trrSection=async function(c,bid){const r=await _trrSectionCi.apply(this,arguments);try{const x=(PVP.ci||[]).find(y=>y.bid===bid);const p=c&&c.querySelector('.trrpan');
  if(x&&p&&!p.querySelector('.pvpcibox')){p.insertAdjacentHTML('afterbegin',`<div class="pvpcibox ${x.caduta_at?'crollo':''}"><b>${x.caduta_at?'💥 Crollata':'🏚️ Integrità'} ${x.integrita}/100</b><div class="pvpbar integ"><span style="width:${Math.max(2,x.integrita)}%"></span></div>
    <small>${x.caduta_at?'Riparala entro '+pvpLeft(x.scade)+' o la perdi':'Gli attacchi persi la abbassano; a 0 crolla'}</small><button class="btn small" data-pvrc2>🔨 Ripara · 🪵 ${x.legno}${x.mattoni?' 🧱 '+x.mattoni:''}</button></div>`);
    p.querySelector('[data-pvrc2]').onclick=e=>{e.stopPropagation();pvpRiparaCasa(bid,e.currentTarget);};}}catch(e){}return r;};
/* ---------- 🧟 le orde sul motore unico (migrazione 032, Fase 39) ---------- */
const ORDA_ESITO=['🛡️ Le case hanno tenuto','🧟 L’orda ti ha colpito (di misura)','🧟 L’orda ha sfondato','💀 L’orda ti ha travolto'];
const ordaOra=o=>{const m=/^(\d{4})-(\d{2})-(\d{2})-(\d{2})$/.exec(o.slot||'');return m?`delle ${m[4]}:00 del ${+m[3]}/${+m[2]}`:'';};
function ordaHTML(){const L=(PVP.or||[]).slice(0,3);if(!L.length)return'';
  return`<h4 style="margin:10px 0 4px">🧟 Le ultime orde</h4>${L.map(o=>{const nc=(o.case||[]).length;const t=o.scudo&&nc?'🛡️ Scudo del nuovo arrivato: niente perdite':o.esito>0?ORDA_ESITO[o.esito]:nc?'🔪 Case cadute, ma il tuo Combattente ha salvato le scorte':ORDA_ESITO[0];
    return`<button class="pvprow st ${o.esito>0?'lose':'win'}" data-pvor="${esc(o.slot)}"><span>🧟</span><div><b>Orda ${ordaOra(o)} · ${t}</b><small>${o.esito>0?'scorte distrutte: '+pvpLoot(o.loot):nc?nc+' '+(nc==1?'casa caduta':'case cadute'):'nessuna perdita'}</small></div></button>`;}).join('')}`;}
function ordaRiepilogo(o){try{const v=JSON.parse(localStorage.getItem('zsh_orda_visti')||'[]');if(!v.includes(o.slot)){v.push(o.slot);localStorage.setItem('zsh_orda_visti',JSON.stringify(v.slice(-30)));}}catch(e){}
  const C=o.case||[];const k=+o.esito||0;
  openSheet(`🧟 Orda ${ordaOra(o)}`,`<div class="pvpris ${k?'lose':'win'}"><b>${ORDA_ESITO[k]}</b>${C.map(c=>`<small>${c.home?'❤️ Casa vera':'🔑 Casa comprata'}: orda 🧟 ${c.attacco} contro 🛡️ ${c.difesa} → ${['tenuto grazie al Combattente','di misura','normale','schiacciante'][c.esito]||''}</small>`).join('')}</div>
    ${o.scudo?'<p>🛡️ Hai ancora lo scudo del nuovo arrivato: questa volta niente perdite.</p>':k?`<p>📦 Scorte distrutte (oltre la scorta protetta): <b>${pvpLoot(o.loot)}</b></p><p>🔨 Le difese delle case cadute si sono danneggiate (−${[0,5,10,15][k]}) e le case comprate hanno perso integrità (−${[0,10,17,25][k]}). Riparale qui in Io con 🪵.</p>`:'<p>Nessuna scorta persa.</p>'}
    <p class="muted" style="font-size:12.5px">Le orde usano le stesse regole degli attacchi: di misura 10%, normale 20%, schiacciante 30% delle scorte, che però spariscono. Prima dell’orda: 🛡️ Prepara, fortifica, chiedi rinforzi agli alleati e sali di 🔪 Combattente.</p>`);}
</script>
