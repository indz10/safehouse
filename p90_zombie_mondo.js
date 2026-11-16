<script>
/* =========================================================
   🧟 ZOMBIE NEL MONDO VERO · 📦 CASSE · 📖 ZOMBIPEDIA (migrazione 025, Fase 28 — il gioco della Lente, stile Pokémon GO)
   - world_zombie_vicini(lat,lon): zombie e casse nei punti veri intorno a te (uguali per tutti, cambiano ogni ora).
   - Nella Lente: gli zombie compaiono nella strada vera alla loro direzione e distanza (zmRender, chiamato dopo lnLabels);
     radar in alto con il più vicino; MIRA E SPARA (Fase 31): metti lo zombie nel mirino e premi il grande tasto 🔫 SPARA
     (zmAct/zmSpara/zmColpo): entro 80 m il primo colpo fa partire la lotta, abbattilo prima che scada il tempo. Vecchia lotta: punti deboli che si
     accendono sul corpo, e quando attacca premi la freccia giusta per schivare; 3 cuori. Vinto → 📖 Zombipedia.
   - 📦 casse entro 40 m: si aprono con un tocco (scorte, a volte 🧱 o una 💣).
   - Sulla Mappa: segnaposti 🧟/📦 vicino a te (zmMarks) → scheda con distanza e "Apri la Lente".
   - 📖 Zombipedia (zmPedia): i 12 tipi, quelli non ancora presi in ombra.
   ========================================================= */
const ZM={L:[],t:0,pos:null,fine:null,els:new Map(),mk:new Map(),mkMap:null,f:null};
const ZM_RAR=['','Comune','Non comune','Raro','Leggendario'];
const ZM_T={vagante:['🧟',1],corridore:['🧟‍♂️',1],urlatrice:['🧟‍♀️',1],bruto:['💪',2],sputatore:['🤢',2],cane:['🐕',2],operaio:['👷',2],soldato:['🪖',3],dottore:['🧑‍⚕️',3],clown:['🤡',3],re:['👑',4],strega:['🧙',4]};
const ZM_N={vagante:'Vagante',corridore:'Corridore',urlatrice:'Urlatrice',bruto:'Bruto',sputatore:'Sputatore',cane:'Cane zombie',operaio:'Operaio',soldato:'Soldato',dottore:'Dottore',clown:'Clown',re:'Re dei morti',strega:'Strega'};
function zmPos(){const L=typeof LENTE!=='undefined'&&LENTE.on&&LENTE.pos?LENTE.pos:null;if(L)return L;if(S.geo&&S.geo.lat!=null)return S.geo;try{const h=myHouses().find(x=>x.home);if(h)return h;}catch(e){}return null;}
async function zmLoad(force){const p=zmPos();if(!S.user||!p||typeof SB==='undefined'||!SB)return ZM.L;
  if(!force&&Date.now()-ZM.t<60000&&ZM.pos&&trM(ZM.pos.lat,ZM.pos.lon,p.lat,p.lon)<120)return ZM.L;ZM.t=Date.now();ZM.pos={lat:p.lat,lon:p.lon};
  try{const{data,error}=await SB.rpc('world_zombie_vicini',{p_lat:p.lat,p_lon:p.lon});if(!error&&data&&data.L){ZM.L=data.L;ZM.fine=data.fine;}}catch(e){}return ZM.L;}
/* ---------- nella Lente ---------- */
const _lnLabelsZm=lnLabels;lnLabels=function(){const r=_lnLabelsZm.apply(this,arguments);try{zmRender();}catch(e){}return r;};
const _lenteOpenZm=lenteOpen;lenteOpen=async function(){const r=_lenteOpenZm.apply(this,arguments);try{zmLenteUI();}catch(e){}return r;};
function zmLenteUI(){const L=LENTE;if(!L.root||L.root.querySelector('.zmradar'))return;
  L.root.insertAdjacentHTML('beforeend','<div class="zmlayer"></div><button class="zmradar" type="button"><b>🧟 Cerco zombie…</b></button><button class="zmpedia" type="button" data-zmped>📖</button><button class="zmact spento" type="button">🧟 Cerco zombie…</button>');
  const za=L.root.querySelector('.zmact');['pointerdown','pointerup','pointermove'].forEach(k=>za.addEventListener(k,e=>e.stopPropagation()));za.addEventListener('pointerdown',e=>{e.preventDefault();if(za._go)za._go();else zmRadarSheet();});
  L.root.querySelector('.zmradar').onclick=e=>{e.stopPropagation();zmRadarSheet();};L.root.querySelector('[data-zmped]').onclick=e=>{e.stopPropagation();zmPedia();};
  zmLoad(true);ZM.lt=setInterval(()=>{if(!LENTE.on){clearInterval(ZM.lt);return;}zmLoad();},15000);}
function zmRender(){const L=LENTE;if(!L.on||!L.root||!L.pos)return;const lay=L.root.querySelector('.zmlayer');if(!lay)return;
  const W=L.root.clientWidth,H=L.root.clientHeight;const head=((L.h==null?0:L.h)+L.man+360)%360;const hor=H*.52-((L.beta||90)-90)/LN_VFOV*H;
  const vivi=(ZM.L||[]).filter(z=>!z.preso);let vic=null;const seen=new Set();
  let mira=null;vivi.forEach(z=>{const d=trM(L.pos.lat,L.pos.lon,z.lat,z.lon);z.d=d;if(!vic||d<vic.d)vic=z;if(d>350)return;if(ZM.f&&ZM.f.z.id!==z.id)return;const rel=((lnBearing(L.pos.lat,L.pos.lon,z.lat,z.lon)-head+540)%360)-180;z.rel=rel;if(Math.abs(rel)<=ZM_MIRA&&(!mira||d<mira.d))mira=z;
    if(Math.abs(rel)>LN_HFOV/2+6)return;seen.add(z.id);let el=ZM.els.get(z.id);
    if(!el){el=document.createElement('button');el.type='button';el.className='zmobj '+z.k;lay.appendChild(el);ZM.els.set(z.id,el);el.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();zmTap(z);});}
    const ic=z.k==='cassa'?'📦':(ZM_T[z.tipo]||['🧟'])[0];const near=z.k==='cassa'?d<=40:d<=80;el.classList.toggle('vicino',near);
    const F=ZM.f&&ZM.f.z.id===z.id?ZM.f:null;const h=F?`<i class="zmvita"><b style="width:${Math.max(0,F.hp/F.hp0*100)}%"></b></i><span>${ic}</span><small>${esc(F.nome)} · ${Math.round(d)} m</small>`:`<span>${ic}</span><small>${z.k==='cassa'?'Cassa':ZM_N[z.tipo]||'Zombie'} · ${Math.round(d)} m${near?' · tocca!':''}</small>`;el.classList.toggle('mirato',!!F||Math.abs(rel)<=ZM_MIRA);if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
    const s=Math.max(.45,Math.min(1.6,1.6-d/250))*(F?1+0.7*Math.min(1,(performance.now()-F.t0)/F.dur):1);const X=W/2+rel/LN_HFOV*W,Y=Math.min(H*.55,hor+(1-Math.min(1,d/350))*H*.22);el.style.transform=`translate(${Math.round(X-50)}px,${Math.round(Y-60)}px) scale(${s.toFixed(2)})`;});
  ZM.els.forEach((el,id)=>{if(!seen.has(id)){el.remove();ZM.els.delete(id);}});
  zmAct(mira,vic);
  const rd=L.root.querySelector('.zmradar b');if(rd){if(!vic)rd.textContent=ZM.L.length?'🧟 Tutti presi qui: torna fra un’ora':'🧟 Cerco zombie…';
    else{const rel=((lnBearing(L.pos.lat,L.pos.lon,vic.lat,vic.lon)-head+540)%360)-180;const fr=Math.abs(rel)<20?'⬆️ davanti':rel<0?'⬅️ a sinistra':'➡️ a destra';
      rd.textContent=`${vic.k==='cassa'?'📦':'🧟'} ${vivi.length} qui intorno · il più vicino ${Math.round(vic.d)} m ${fr}`;}}}
function zmTap(z){const p=LENTE.pos;const d=trM(p.lat,p.lon,z.lat,z.lon);
  if(z.k==='cassa'){if(d>40){toast(`📦 Avvicinati: sei a ${Math.round(d)} m (serve meno di 40)`);return;}zmCassa(z);return;}
  if(d>80){toast(`🧟 Avvicinati: sei a ${Math.round(d)} m (serve meno di 80)`);return;}zmSpara(z);}
async function zmCassa(z){const p=LENTE.pos;let r=null;try{const{data,error}=await SB.rpc('world_cassa_apri',{p_id:z.id,p_lat:p.lat,p_lon:p.lon});if(error)throw error;r=data;}catch(e){toast('Non riuscito');return;}
  if(!r.ok){toast(r.msg);return;}z.preso=true;try{sfx&&sfx('win');}catch(e){}RES.t=0;try{resLoad(true);supLoad(true);}catch(e){}
  toast(`📦 Cassa: 🪵 +${r.legno} 🥫 +${r.cibo} ⛽ +${r.carb}${r.mattoni?' 🧱 +'+r.mattoni:''}${r.bomba?' · 💣 una bomba!':''}`);}
/* ---------- la lotta: MIRA E SPARA (Fase 31: un tasto solo) ----------
   Metti lo zombie nel mirino (al centro) e premi il grande tasto 🔫 SPARA (o tocca lo zombie).
   Il primo colpo fa partire la lotta (1 energia): lo zombie ha una barra di vita sopra la testa e si avvicina;
   abbattilo prima che il tempo finisca. Un colpo ogni 0,4 s (il server controlla i tempi). */
const ZM_MIRA=12,ZM_CD=400;
function zmAct(mira,vic){const L=LENTE;let b=L.root&&L.root.querySelector('.zmact');if(!b)return;const F=ZM.f;let t,cl='',dis=false,go=null;
  if(F&&!F.fine){const in_=mira&&mira.id===F.z.id;t=in_?'🔫 SPARA!':'🎯 Rimetti lo zombie nel mirino';cl=in_?'fuoco':'';go=in_?()=>zmSpara(F.z):null;}
  else if(mira&&mira.k==='zombie'){if(mira.d<=80){t=`🔫 SPARA a ${ZM_N[mira.tipo]||'zombie'}`;cl='fuoco';go=()=>zmSpara(mira);}else{t=`🚶 Avvicinati: ${Math.round(mira.d)} m (serve 80)`;dis=true;}}
  else if(mira&&mira.k==='cassa'){if(mira.d<=40){t='📦 APRI LA CASSA';cl='apri';go=()=>zmCassa(mira);}else{t=`🚶 Avvicinati: ${Math.round(mira.d)} m (serve 40)`;dis=true;}}
  else if(vic){const r=vic.rel;const fr=r==null?'':r<0?'⬅️ girati a sinistra':'➡️ girati a destra';t=`🎯 ${vic.k==='cassa'?'📦 Cassa':'🧟 '+(ZM_N[vic.tipo]||'Zombie')} a ${Math.round(vic.d)} m · ${fr}`;dis=true;}
  else{t=ZM.L.length?'🧟 Tutti presi qui: torna fra un’ora':'🧟 Cerco zombie…';dis=true;}
  L.root.classList.toggle('zmon',!!(F&&!F.fine)||cl==='fuoco'||cl==='apri');
  const k=t+cl+dis;if(b.dataset.k!==k){b.dataset.k=k;b.textContent=t;b.className='zmact '+cl+(dis?' spento':'');}b._go=go;}
async function zmSpara(z){const L=LENTE;const now=performance.now();
  if(ZM.f&&!ZM.f.fine){const F=ZM.f;if(F.z.id!==z.id||F.busy)return;if(now-F.last<ZM_CD)return;F.last=now;zmColpo(F);return;}
  if(ZM.starting)return;ZM.starting=true;const p=L.pos;let d=null;
  try{const{data,error}=await SB.rpc('world_zombie_lotta',{p_id:z.id,p_lat:p.lat,p_lon:p.lon});if(error)throw error;d=data;}catch(e){toast('🧟 Gli zombie nel mondo arrivano dopo l’aggiornamento del server (blocco SQL 025)');}
  ZM.starting=false;if(!d)return;if(!d.ok){toast(d.msg);return;}
  const F=ZM.f={id:d.id,z,hp:d.hp,hp0:d.hp,danno:d.danno||1,nome:d.nome,ic:d.ic,rar:d.rar,t0:performance.now(),dur:(10+d.hp*1.2)*1000,last:performance.now(),fine:false,raf:0};
  try{sfx&&sfx('zombie');}catch(e){}L.root.insertAdjacentHTML('beforeend',`<div class="zmhud"><b>${d.ic} ${esc(d.nome)}</b><small>${ZM_RAR[d.rar]}</small><span data-zmt></span></div>`);
  zmColpo(F);F.raf=requestAnimationFrame(zmTimer);}
function zmColpo(F){F.hp-=F.danno;try{sfx&&sfx('click');}catch(e){}const r=LENTE.root;const el=ZM.els.get(F.z.id);
  if(el){el.classList.remove('colpito');void el.offsetWidth;el.classList.add('colpito');}
  r.insertAdjacentHTML('beforeend','<i class="zmflash"></i>');setTimeout(()=>{const f=r.querySelector('.zmflash');if(f)f.remove();},160);
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}if(F.hp<=0&&!F.busy){F.busy=true;setTimeout(()=>zmEnd(true),Math.max(0,F.hp0*380-(performance.now()-F.t0)));}}
function zmTimer(){const F=ZM.f;if(!F||F.fine)return;const left=Math.max(0,F.dur-(performance.now()-F.t0));const t=LENTE.root&&LENTE.root.querySelector('[data-zmt]');
  if(t)t.textContent=`⏱️ ${Math.ceil(left/1000)} s`;if(left<=0&&F.hp>0){zmEnd(false);return;}F.raf=requestAnimationFrame(zmTimer);}
async function zmEnd(vinto){const F=ZM.f;if(!F||F.fine)return;F.fine=true;cancelAnimationFrame(F.raf);let r=null;
  try{const{data,error}=await SB.rpc('world_zombie_fine',{p_id:F.id,p_vinto:vinto});if(error)throw error;r=data;}catch(e){}
  if(r&&r.vinto)F.z.preso=true;RES.t=0;try{resLoad(true);supLoad(true);wMine(true);}catch(e){}
  const R=LENTE.root;ZM.f=null;if(!R)return;const hud=R.querySelector('.zmhud');if(hud)hud.remove();
  const g=r&&r.vinto?[r.legno?'🪵 +'+r.legno:'',r.cibo?'🥫 +'+r.cibo:'',r.carb?'⛽ +'+r.carb:'',r.mattoni?'🧱 +'+r.mattoni:''].filter(Boolean).join(' '):'';
  R.insertAdjacentHTML('beforeend',`<div class="difres zmres"><b>${r&&r.vinto?`${r.ic} ${esc(r.nome)} abbattuto!`:'🏃 È scappato'}</b>${r&&r.vinto?`<span>${r.nuovo?'📖 NUOVO nella Zombipedia!':'📖 Zombipedia aggiornata'}</span><span>⭐ +${r.xp}${g?' · '+g:''}</span>${r.salito?`<span>🎖️ Grado ${r.grado}!</span>`:''}${r.protetti?`<span>🛡️ Era vicino alla casa di ${r.protetti===1?'un superstite':r.protetti+' superstiti'}: gli arriva la notifica che l’hai protetto!</span>`:''}`:'<span>Il tempo è finito. Resta lì fino alla fine dell’ora: riprova quando vuoi (costa 1 energia).</span>'}
    <div><button class="btn small" data-zmok>👍 Continua</button><button class="btn small ghost" data-zmped2>📖 Zombipedia</button></div></div>`);try{sfx&&sfx(r&&r.vinto?'win':'lose');}catch(e){}
  const b=R.querySelector('.zmres');b.querySelector('[data-zmok]').onclick=e=>{e.stopPropagation();b.remove();};b.querySelector('[data-zmped2]').onclick=e=>{e.stopPropagation();b.remove();zmPedia();};}
/* ---------- radar e Zombipedia ---------- */
function zmRadarSheet(){const p=zmPos();const L=(ZM.L||[]).filter(z=>!z.preso).map(z=>({...z,d:p?trM(p.lat,p.lon,z.lat,z.lon):null})).sort((a,b)=>(a.d||0)-(b.d||0)).slice(0,12);
  const host=LENTE.on?LENTE.root:null;const html=`<b>🧟 Qui intorno</b><span class="muted">Cambiano ogni ora. Combatti entro 80 m, casse entro 40 m.</span>${L.map(z=>`<span class="zmrow">${z.k==='cassa'?'📦 Cassa':(ZM_T[z.tipo]||['🧟'])[0]+' '+(ZM_N[z.tipo]||'Zombie')} · ${z.d!=null?Math.round(z.d)+' m':''}${z.k==='zombie'?' · '+ZM_RAR[(ZM_T[z.tipo]||[0,1])[1]]:''}</span>`).join('')||'<span>Nessuno: cammina un po’!</span>'}`;
  if(host){host.insertAdjacentHTML('beforeend',`<div class="difres zmlist">${html}<div><button class="btn small" data-zmlok>Ok</button></div></div>`);const x=host.querySelector('.zmlist');x.querySelector('[data-zmlok]').onclick=e=>{e.stopPropagation();x.remove();};}
  else openSheet('🧟 Zombie qui intorno',`<div class="zmlistsheet">${html}</div><button class="btn wide" data-zmlente>📷 Apri la Lente</button>`,c=>c.querySelector('[data-zmlente]').onclick=()=>{closeSheet();lenteOpen();});}
async function zmPedia(){let d=null;try{const{data,error}=await SB.rpc('world_zombipedia');if(!error)d=data;}catch(e){}const T=(d&&d.tipi)||[];const n=T.filter(t=>t.presi>0).length;
  const html=`<b>📖 Zombipedia · ${n}/12</b><span class="muted">Abbatti gli zombie nella Lente per collezionarli tutti. I rari danno anche 🧱.</span>
    <div class="zmgrid">${T.map(t=>`<div class="zmcard r${t.rar} ${t.presi?'':'no'}"><span>${t.presi?t.ic:'❓'}</span><b>${t.presi?esc(t.nome):'???'}</b><small>${ZM_RAR[t.rar]}${t.presi?' · ×'+t.presi:''}</small></div>`).join('')}</div>
    <span class="muted">📦 Casse aperte: ${(d&&d.casse)||0}</span>`;
  if(typeof LENTE!=='undefined'&&LENTE.on){LENTE.root.insertAdjacentHTML('beforeend',`<div class="difres zmped">${html}<div><button class="btn small" data-zmpok>Chiudi</button></div></div>`);const x=LENTE.root.querySelector('.zmped');x.querySelector('[data-zmpok]').onclick=e=>{e.stopPropagation();x.remove();};}
  else openSheet('📖 Zombipedia',`<div class="zmlistsheet">${html}</div>`,()=>{});}
/* ---------- sulla mappa ---------- */
function zmMarks(){try{if(S.tab!=='mappa'||!S.user||typeof maplibregl==='undefined')return;const lm=window.__mf;if(!lm||!lm.map||!document.body.contains(lm.map.getContainer()))return;
  if(ZM.mkMap!==lm.map){ZM.mk.forEach(m=>{try{m.remove();}catch(e){}});ZM.mk=new Map();ZM.mkMap=lm.map;}
  const V=(ZM.L||[]).filter(z=>!z.preso);const ids=new Set(V.map(z=>z.id));ZM.mk.forEach((m,id)=>{if(!ids.has(id)){try{m.remove();}catch(e){}ZM.mk.delete(id);}});
  V.forEach(z=>{if(ZM.mk.has(z.id))return;const ic=z.k==='cassa'?'📦':(ZM_T[z.tipo]||['🧟'])[0];const el=elDiv('lm-zm '+(z.k==='cassa'?'cassa':'r'+((ZM_T[z.tipo]||[0,1])[1])),`<b>${ic}</b>`);
    el.onclick=e=>{e.stopPropagation();const p=zmPos();const d=p?Math.round(trM(p.lat,p.lon,z.lat,z.lon)):null;
      openSheet(z.k==='cassa'?'📦 Cassa di rifornimenti':`${ic} ${ZM_N[z.tipo]||'Zombie'}`,`<p style="font-weight:400">${z.k==='cassa'?'Una cassa piena di scorte. Vai a meno di 40 m e aprila con la Lente.':`${ZM_RAR[(ZM_T[z.tipo]||[0,1])[1]]}. Vai a meno di 80 m, apri la Lente e combattilo: finisce nella tua Zombipedia.`}</p>${d!=null?`<p>📏 Sei a <b>${d} m</b>.</p>`:''}<p class="muted" style="font-size:12.5px">Resta qui fino alla fine dell’ora.</p><button class="btn wide" data-zmgo>📷 Apri la Lente</button>`,c=>c.querySelector('[data-zmgo]').onclick=()=>{closeSheet();lenteOpen();});};
    try{ZM.mk.set(z.id,new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([z.lon,z.lat]).addTo(lm.map));}catch(x){}});}catch(e){}}
zEvery(()=>{try{if(document.hidden||!S.user)return;if(S.tab==='mappa'){zmLoad().then(zmMarks);}}catch(e){}},5000,'zombie-mondo');
</script>
