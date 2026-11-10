<script>
/* =========================================================
   1) La mia casa: TUTTE le case come la casa vera (edificio vero a fumetto, difese e meteo disegnati,
      % di tenuta, rinforzi, 🕑 diario delle modifiche)
   2) Assedio a fumetto: la casa vera con le sue difese, il meteo, gli speciali veri, 📜 cronaca
   3) Bonus e malus dati da me visibili sulla mappa (nebbia sulle case del rivale…)
   4) 💬 Messaggi diretti: giocatori (privati) e sponsor (scrivi al negozio)
   ========================================================= */
const DKS=['fossato','trappole','barricate','grate','recinto','fari','cani','sirena','fondamenta','pompa'];
function hOpts(h,T,extra){const s=OR.s||{};return Object.assign({lvl:T?T.level:(h.level||1),defs:T?T.defs||{}:{},ev:T?T.ev:'calma',prep:!!s.prepared,helps:h.home?Math.min(4,+(s.helps_in||0)):0,a:h.home?(S.answers||{}):{}},extra||{});}
/* ---- diario ---- */
const DIA_K='zsh_diary_';
function diaryAdd(bid,txt){try{const k=DIA_K+bid;const L=JSON.parse(localStorage.getItem(k)||'[]');L.unshift({t:Date.now(),x:txt});localStorage.setItem(k,JSON.stringify(L.slice(0,40)));}catch(e){}}
async function diaryLoad(bid){let srv=[];try{const{data,error}=await SB.rpc('world_house_log',{p_bid:bid});if(!error&&data)srv=data.map(r=>({t:new Date(r.created_at).getTime(),x:r.reason+(r.delta?` (🧱 ${r.delta})`:'')}));}catch(e){}
  let loc=[];try{loc=JSON.parse(localStorage.getItem(DIA_K+bid)||'[]');}catch(e){}
  const seen=new Set();return[...srv,...loc].sort((a,b)=>b.t-a.t).filter(x=>{const k=x.x+Math.round(x.t/60000);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,25);}
function diaryHTML(L){return L.length?L.map(r=>`<div class="dia"><small>${new Date(r.t).toLocaleDateString('it-IT',{day:'numeric',month:'short'})}</small><span>${esc(r.x)}</span></div>`).join(''):'<p class="muted" style="font-size:12.5px">Ancora nessuna modifica: le difese che compri e i potenziamenti compariranno qui.</p>';}
/* ---- le schede grandi di ogni casa ---- */
function rinfList(T,h){const s=OR.s||{};const d=(T&&T.defs)||{};const R=[['🛡️','Case preparate',!!s.prepared],['⬆️',`Livello ${T?T.level:h.level||1}`,(T?T.level:h.level||1)>=2]];
  DKS.forEach(k=>{const v=d[k]||0;R.push([ZDEF[k][0],`${ZDEF[k][1]} ${'●'.repeat(v)}${'○'.repeat(3-v)}`,v>0]);});return R;}
function casaCardHTML(h,i,T){const c=T?thrCalc(T).ch:null;const e=T?(EVN[T.ev]||EVN.calma):null;
  return`<div class="panel mycasa mycasa2" data-mc="${i}"><b class="disp" style="font-size:24px">🔑 ${esc(h.label)}</b><small>${h.km>0.05?kmTxt(h.km)+' da casa tua':'vicino a casa tua'}<span data-mcd></span></small>
   <div class="mcart" data-mca>${houseArt('villa',h.level,h.bid,{k:'mc'+i})}</div>
   <div class="mcchips">${c!=null?`<span class="${chCls(c)}">🛡️ Tiene <b>${c}%</b></span>`:''}<span>⬆️ Livello <b>${T?T.level:h.level}</b></span>${e?`<span>${e[0]} ${e[1]}</span>`:''}</div>
   <h4 class="hh">🛡️ Rinforzi di questa casa</h4><div class="rinf">${rinfList(T,h).map(([ic,t,ok])=>`<span class="${ok?'ok':'no'}">${ok?'✓':'✗'} ${ic} ${esc(t)}</span>`).join('')}</div>
   <div class="mcbtn"><button class="btn" data-mcs>🎯 Simula e migliora</button><button class="btn ghost" data-mcm>🗺️ Sulla mappa</button></div>
   <details class="man mcdia"><summary>🕑 Diario delle modifiche</summary><div class="man-b" data-mcdl><p class="muted"><span class="spin"></span></p></div></details></div>`;}
async function casaAll(){const pg=app.querySelector('.page');if(!pg||pg.dataset.all)return;pg.dataset.all='1';await thrLoad();
  const L=myHouses().filter(h=>!h.home);const gal=pg.querySelector('.mygal');if(gal)gal.hidden=true;
  let anchor=pg.querySelector('.mycasa');
  /* la casa vera: difese e meteo disegnati + diario */
  try{const home=myHouses().find(h=>h.home);const T=home&&thrOf(home);const art=anchor&&anchor.querySelector('.mcart');
    if(home&&art){await drawHouse(art,home,hOpts(home,T));const ch=anchor.querySelector('.mcchips');if(T&&ch&&!ch.querySelector('.mcwx')){const e=EVN[T.ev]||EVN.calma;ch.insertAdjacentHTML('afterbegin',`<span class="${chCls(thrCalc(T).ch)}">🛡️ Tiene <b>${thrCalc(T).ch}%</b></span><span class="mcwx">${e[0]} ${e[1]}</span>`);}
      const rf=anchor.querySelector('.rinf');if(rf&&T)DKS.forEach(k=>{const v=(T.defs||{})[k]||0;rf.insertAdjacentHTML('beforeend',`<span class="${v?'ok':'no'}">${v?'✓':'✗'} ${ZDEF[k][0]} ${ZDEF[k][1]} ${'●'.repeat(v)}${'○'.repeat(3-v)}</span>`);});
      if(!anchor.querySelector('.mcdia')){anchor.insertAdjacentHTML('beforeend',`<div class="mcbtn"><button class="btn" data-mhs>🎯 Simula e migliora</button></div><details class="man mcdia"><summary>🕑 Diario delle modifiche</summary><div class="man-b" data-mcdl><p class="muted"><span class="spin"></span></p></div></details>`);
        anchor.querySelector('[data-mhs]').onclick=()=>houseSheet(home);const d=anchor.querySelector('.mcdia');d.addEventListener('toggle',async()=>{if(d.open)d.querySelector('[data-mcdl]').innerHTML=diaryHTML(await diaryLoad(home.bid||'home'));});}}}catch(e){console.warn(e);}
  /* le altre case */
  L.forEach((h,i)=>{const T=thrOf(h);anchor.insertAdjacentHTML('afterend',casaCardHTML(h,i,T));anchor=anchor.nextElementSibling;const card=anchor;
    drawHouse(card.querySelector('[data-mca]'),h,hOpts(h,T)).then(g=>{if(g){const d=card.querySelector('[data-mcd]');if(d)d.textContent=' · '+realDesc(g);}});
    card.querySelector('[data-mcs]').onclick=()=>houseSheet(h);card.querySelector('[data-mcm]').onclick=()=>{S.mfHouses=true;go('mappa');setTimeout(()=>mhFly(h,true),900);};
    const d=card.querySelector('.mcdia');d.addEventListener('toggle',async()=>{if(d.open)d.querySelector('[data-mcdl]').innerHTML=diaryHTML(await diaryLoad(h.bid));});});}
/* nella scheda casa: anche lì difese e meteo disegnati */
const _drawHouseAs=drawHouse;drawHouse=async function(el,h,o={}){if(o.defs==null||o.ev==null){const T=typeof thrOf==='function'?thrOf(h):null;if(T)o=Object.assign({defs:T.defs||{},ev:T.ev},o);}return _drawHouseAs(el,h,o);};
/* il diario si scrive anche dall'app (potenziamenti, preparazione) */
const _wRpcAs=wRpc;wRpc=async function(fn,args){const r=await _wRpcAs.apply(this,arguments);try{if(fn==='world_upgrade'&&r&&r.ok)diaryAdd(args.p_bid,`Potenziata al livello ${r.level}`);}catch(e){}return r;};
/* ---- 2) ASSEDIO A FUMETTO ---- */
function cronaca(T,res){if(!T)return[];const r=thrCalc(T);const e=EVN[T.ev]||EVN.calma;const L=[];
  L.push(`${e[0]} ${T.ev==='calma'?'Notte senza sorprese dal cielo.':e[1]+': '+e[2]+'.'}`);
  if(Math.abs(T.slope||0)>=.01)L.push(T.slope>0?`⛰️ La casa sta in alto: i corridori e i bruti arrivano col fiato corto.`:`⬇️ La casa sta in basso: gli zombie arrivano di corsa in discesa.`);
  r.sp.forEach(x=>{const z=ZSP[x.k];const d=ZDEF[x.dk];if(!z)return;if(x.dl>0)L.push(`${d[0]} ${d[1]} (liv. ${x.dl}): ${z.ic} ${z.n} indeboliti del ${Math.round(x.dl*30)}%.`);else if(x.p>=x.base*1.1)L.push(`${z.ic} ${z.n}: più forte del solito, mancavano ${d[0]} ${d[1].toLowerCase()}.`);});
  const sim=res&&res.sim;L.push(sim&&sim.atk?`🧮 Difesa ${sim.pw} contro un’orda di ${sim.atk}: ${res.held?'TENUTA':'SFONDATA'}.`:`🧮 Difesa ${r.def} contro un’orda tra ${r.amin} e ${r.amax}: ${res&&res.held?'TENUTA':'SFONDATA'}.`);
  return L.slice(0,6);}
const _fumettoAs=fumetto;fumetto=function(h,res,ctx,onEnd){_fumettoAs(h,res,ctx,onEnd);try{const F=document.getElementById('fumetto');if(!F)return;const T=typeof thrOf==='function'?thrOf(h):null;
  if(T){F.classList.add('fx-'+(T.ev||'calma'));
    /* la casa vera nelle vignette 1 e 4 */
    ['.p1 .fbg','.p4 .fbg'].forEach((sel,j)=>{const el=F.querySelector(sel);if(el)drawHouse(el,h,hOpts(h,T,{prep:j===1?(!!(OR.s&&OR.s.prepared)):false})).then(g=>{const sv=el.querySelector('svg');if(sv)sv.setAttribute('preserveAspectRatio','xMidYMid slice');});});
    /* gli zombie veri nella vignetta 2 */
    const hz=F.querySelector('.fhorde:not(.in)');if(hz){const K=[...(T.specials||[]).map(x=>x.k).sort((a,b)=>((T.specials.find(s=>s.k===b)||{}).p||0)-((T.specials.find(s=>s.k===a)||{}).p||0))];const pick=[...K.slice(0,3)];while(pick.length<5)pick.push('walker');
      hz.innerHTML=pick.map((k,i)=>zArt((FZ[k]||FZ.walker).v+i,{cls:'w'+i,style:`--d:${i*.12}s`})).join('');
      const sp=(T.specials||[]);if(sp.length)hz.insertAdjacentHTML('afterend',`<div class="fspec">${sp.map(x=>`<span title="${esc((ZSP[x.k]||{}).n||x.k)}">${(ZSP[x.k]||{}).ic||''}</span>`).join('')}</div>`);}
    const cap=F.querySelector('.p1 .fcap');if(cap){const e=EVN[T.ev]||EVN.calma;cap.innerHTML+=` · ${e[0]}`;}}
  /* la cronaca */
  const L=cronaca(T,res);if(L.length){const bot=F.querySelector('.fbot');if(bot)bot.insertAdjacentHTML('beforebegin',`<div class="fcron"><b>📜 Cronaca dell’assedio</b>${L.map((x,i)=>`<span style="--d:${3.2+i*.5}s">${esc(x)}</span>`).join('')}</div>`);}}catch(e){console.warn(e);}};
/* ---- 3) BONUS E MALUS VISIBILI SULLA MAPPA ---- */
window.FXM={L:[],t:0};
const FXI={nebbia:['🌫️','nebbia'],sabotaggio:['🔨','sabotaggio'],orda:['🧟','orda mandata'],scudo:['🛡️','scudo dato'],rinforzi:['🤝','rinforzi dati']};
async function fxLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return;if(!force&&Date.now()-FXM.t<60000)return fxDraw();try{const{data,error}=await SB.rpc('world_my_effects');if(!error){FXM.L=data||[];FXM.t=Date.now();}}catch(e){}fxDraw();}
function fxDraw(){(window.__zlms||[]).forEach(lm=>{try{if(!lm||!lm.map)return;(lm._fx||[]).forEach(m=>m.remove());lm._fx=[];
  const by={};(FXM.L||[]).forEach(e=>{const k=e.lat.toFixed(5)+','+e.lon.toFixed(5);(by[k]=by[k]||{lat:e.lat,lon:e.lon,nick:e.nick,uid:e.user_id,k:[]}).k.push(e.kind);});
  Object.values(by).forEach(g=>{const el=document.createElement('div');el.className='fxm '+g.k.map(k=>'fx-'+k).join(' ');
    el.innerHTML=`<div class="fxa"></div><div class="fxb">${[...new Set(g.k)].map(k=>(FXI[k]||['✨'])[0]).join('')}</div><small>@${esc(g.nick||'')}</small>`;
    el.title=[...new Set(g.k)].map(k=>(FXI[k]||['',''])[1]).join(', ');el.addEventListener('click',e=>{e.stopPropagation();playerSheet(g.uid);});
    lm._fx.push(new maplibregl.Marker({element:el}).setLngLat([g.lon,g.lat]).addTo(lm.map));});}catch(e){}});}
['doDisp','allyShield','alHelp'].forEach(n=>{try{const f=window[n];if(typeof f!=='function')return;window[n]=async function(){const r=await f.apply(this,arguments);setTimeout(()=>fxLoad(true),700);return r;};}catch(e){}});
zEvery(()=>{if(document.visibilityState==='visible'&&(S.tab==='mappa'||S.tab==='orda'))fxLoad();},60000);
/* ---- 4) MESSAGGI DIRETTI ---- */
window.DM={with:null,nick:'',t:0,timer:0};
async function dmSheet(uid,nick){DM.with=uid;DM.nick=nick||'';const draw=async()=>{let L=[];try{const{data,error}=await SB.rpc('world_dm_list',{p_with:uid});if(error)throw error;L=(data||[]).slice().reverse();}catch(e){return openSheet('💬 Messaggi',`<p class="muted">Messaggi non disponibili (${esc(e.message||'')}). Esegui il file assedio.sql su Supabase.</p>`);}
    const box=document.querySelector('#sheet.open .dmlist');const html=L.length?L.map(m=>`<div class="dmm ${m.mine?'mine':''}"><span>${esc(m.body)}</span><small>${socAgo(m.created_at)}</small></div>`).join(''):'<p class="muted" style="font-size:13px">Nessun messaggio. Scrivi tu per primo!</p>';
    if(box&&box.dataset.with===uid){if(box.dataset.n!==String(L.length)){box.innerHTML=html;box.dataset.n=L.length;box.scrollTop=box.scrollHeight;}return;}
    openSheet(`💬 @${esc(DM.nick)}`,`<div class="dmlist" data-with="${uid}" data-n="${L.length}">${html}</div>
      <div class="dmin"><input class="field" id="dmT" maxlength="500" placeholder="Scrivi un messaggio…" autocomplete="off"><button class="btn" data-dms>Invia</button></div>
      <div class="dmq">${['Ciao! 👋','Ti mando rinforzi 🤝','Prepara le case, stasera arriva l’orda! 🧟','Facciamo squadra? 🤝','Grazie! 🙏'].map(q=>`<button data-dmq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <button class="btn small ghost" data-dmp>👤 Profilo di @${esc(DM.nick)}</button>`,card=>{const l=card.querySelector('.dmlist');l.scrollTop=l.scrollHeight;const inp=card.querySelector('#dmT');
      const send=async t=>{const b=(t||inp.value).trim();if(!b)return;try{const{data,error}=await SB.rpc('world_dm_send',{p_to:uid,p_body:b});if(error)throw error;if(!data.ok){toast(data.msg);return;}inp.value='';draw();}catch(e){toast(e.message||'Non inviato');}};
      card.querySelector('[data-dms]').onclick=()=>send();inp.onkeydown=e=>{if(e.key==='Enter')send();};card.querySelectorAll('[data-dmq]').forEach(b=>b.onclick=()=>send(b.dataset.dmq));
      card.querySelector('[data-dmp]').onclick=()=>playerSheet(uid);});};
  await draw();clearInterval(DM.timer);DM.timer=setInterval(()=>{const s=document.querySelector('#sheet.open .dmlist');if(!s||s.dataset.with!==uid){clearInterval(DM.timer);return;}draw();},4000);}
async function dmThreads(){let L=[];try{const{data,error}=await SB.rpc('world_dm_threads');if(error)throw error;L=data||[];}catch(e){return openSheet('✉️ Messaggi privati',`<p class="muted">Messaggi non disponibili (${esc(e.message||'')}). Esegui il file assedio.sql su Supabase.</p>`);}
  openSheet('✉️ Messaggi privati',L.length?L.map(t=>`<button class="dmt ${t.unread>0?'un':''}" data-dmt="${t.user_id}" data-n="${esc(t.nick)}"><span class="sav">${esc((t.nick||'?')[0].toUpperCase())}</span><div><b>@${esc(t.nick)}${t.unread>0?` · ${t.unread} nuovi`:''}</b><small>${esc(t.last_body||'')}</small></div><i>${socAgo(t.last_at)}</i></button>`).join(''):'<p class="muted">Nessuna conversazione. Apri il profilo di un giocatore e tocca “💬 Scrivi”.</p>',
    card=>card.querySelectorAll('[data-dmt]').forEach(b=>b.onclick=()=>dmSheet(b.dataset.dmt,b.dataset.n)));}
/* dove si scrive: profilo giocatore, Piazza, bacheca, sponsor */
async function dmBadge(){try{const{data}=await SB.rpc('world_dm_threads');const n=(data||[]).reduce((a,t)=>a+(+t.unread||0),0);const b=app.querySelector('[data-pzdm]');if(b)b.textContent=n?`✉️ Privati (${n})`:'✉️ Privati';}catch(e){}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-dmr]');if(b)dmSheet(b.dataset.dmr,b.dataset.n);});
const _sponsorSheetDm=sponsorSheet;sponsorSheet=function(){const r=_sponsorSheetDm.apply(this,arguments);setTimeout(()=>{try{const c=document.querySelector('#sheet.open .sheet-b');if(!c||c.querySelector('[data-spdm]'))return;const q=c.querySelector('[data-sa=quote]');if(!q)return;
  q.insertAdjacentHTML('beforebegin','<button class="btn" data-spdm>💬 Scrivi al negozio</button>');c.querySelector('[data-spdm]').onclick=()=>{q.click();setTimeout(()=>{const t=c.querySelector('.quote textarea, .quote [id^=q]');if(t)t.focus();},200);};}catch(e){}},80);return r;};
</script>
