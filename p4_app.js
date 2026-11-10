<script>
/* ================= INTERFACCIA ================= */
const $=s=>document.querySelector(s);
const app=$('#app');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtE=v=>v===0?'gratis':v.toLocaleString('it-IT')+' €';
const fmtI=v=>v.toFixed(1).replace('.',',');
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2600);}
function vibe(){try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}}

function goBase(tab){window.__last='apre '+tab;document.body.classList.remove('inbattle');if(typeof G!=='undefined'&&G.run){G.run.stop=true;G.run=null;}S.tab=tab;renderNav();window.scrollTo(0,0);if(tab!=='orda')setMusic('app');closeSheet&&closeSheet();({sponsor:renderSponsor,contatti:renderContatti,home:renderHome,valuta:renderValuta,gioco:renderGioco,orda:()=>{G.view=G.view==='battle'?'hub':G.view;renderOrda();},mappa:renderMappa,radio:renderRadio,guida:renderGuida})[tab]();}

/* ---------------- HOME ---------------- */
function bindGo(){app.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{vibe();if(b.dataset.step)S.step=+b.dataset.step;if(b.dataset.mot2)S.motivo=b.dataset.mot2;else if(b.dataset.go==='contatti')S.motivo='info';go(b.dataset.go);});}

/* ---------------- VALUTA ---------------- */
const STEP_LBL=['Zona','Foto','Domande','Verdetto'];
const STEP_SAY=['Prima cosa: dimmi dove sta la casa. Guardo che risorse hai intorno e chi c’è nel quartiere.','Ora fammi vedere porta, finestre basse e cancello. Le foto le guardo e le dimentico.','Il resto me lo dici tu. Dove ho già capito dalle foto, controlla e basta.','Ecco il verdetto. Non prenderla sul personale: si può sempre fortificare.'];
function stepsBar(){return`<div class="stepbar">${STEP_LBL.map((l,i)=>`<button class="sb ${i<S.step?'done':i===S.step?'on':''}" data-jump="${i}" ${i>S.step&&!(i===3&&S.result)?'disabled':''}><span>${i<S.step?'✓':i+1}</span>${l}</button>`).join('')}</div>`;}
function stepHead(i){return`<div class="panel tavola" style="padding:0;overflow:hidden">${stepArt(i)}</div><div class="bubble op" style="margin:-4px 0 24px">${STEP_SAY[i]}</div>`;}
function renderValuta(){
  const views=[vZona,vFoto,vDomande,vRisultato];
  app.innerHTML=`<div class="page">${stepsBar()}${stepHead(S.step)}<div id="vv"></div></div>`;
  app.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{S.step=+b.dataset.jump;renderValuta();});
  views[S.step]();
}
function vZona(){
  const z=S.zone;
  $('#vv').innerHTML=`
   <h2>Dove si trova la casa?</h2>
   <p class="muted" style="margin:6px 0 12px">Sulla mappa pubblica il tuo indirizzo non compare mai: gli altri vedono solo una posizione approssimativa, se scegli il profilo pubblico.</p>
   <label for="addr" class="disp" style="font-size:20px">Indirizzo</label>
   <input id="addr" class="field" placeholder="Es. Via Roma 10, Volta Mantovana" value="${esc(z?z.address:'')}" autocomplete="street-address">
   <div class="row wrap" style="margin-top:10px">
     <button class="btn" id="zBtn">Analizza la zona</button>
     <button class="btn ghost small" id="geoBtn">Usa la mia posizione</button>
   </div>
   <div id="zres" style="margin-top:16px">${z?zoneCard(z,'own'):''}</div>
   <div class="row spread" style="margin-top:6px"><span></span><button class="btn alt" id="next0" ${z?'':'disabled'}>Avanti: le foto</button></div>`;
  $('#zBtn').onclick=async()=>{
    const a=$('#addr').value.trim();if(!a){toast('Scrivi un indirizzo o usa la posizione');return;}
    $('#zBtn').innerHTML='<span class="spin"></span> Analizzo';$('#zBtn').disabled=true;
    S.zone=await analyzeZone(a);S.answers.zona=S.zone.type;S.aiFilled.zona=true;vibe();vZona();
  };
  $('#geoBtn').onclick=()=>{
    if(!navigator.geolocation){toast('Posizione non disponibile su questo dispositivo');return;}
    navigator.geolocation.getCurrentPosition(p=>{$('#addr').value=`Posizione ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`;},()=>toast('Permesso posizione negato: scrivi l’indirizzo'),{timeout:6000});
  };
  if(z)bindMap('own',z);
  $('#next0').onclick=()=>{S.step=1;renderValuta();};
}
function zoneCard(z,key='z',me=true){
  const lab={centro:'Centro città',periferia:'Periferia',campagna:'Campagna',lago:'Lago, mare e fiume',montagna:'Montagna'}[z.type];
  const [g,c]=z.level<=4?['Zona tranquilla','#3f9b5f']:z.level<=6?['Zona da presidiare','#f7d64a']:['Zona calda','#d7263d'];
  const L=S.layers||(S.layers={poi:true,users:false,heat:false,comm:true,spons:true});L.users=false;
  return`<div class="panel mapwrap" style="padding:0;overflow:hidden" id="map-${key}">
     <div class="maptools">${[['comm','Community'],['spons','Sponsor'],['poi','Servizi pubblici'],['heat','Livello zone']].map(([k,l])=>`<button class="chip ${L[k]?'on':''}" data-layer="${k}">${l}</button>`).join('')}</div>
     <div class="mapsvg">${mapScene(z,{...L,me})}</div>
     <div class="mapinfo" id="info-${key}"><span class="muted">Tocca un segnaposto per i dettagli.</span></div>
   </div>
   <div class="panel">
     <div class="row spread"><div><h3>${lab}</h3><span class="tag" style="background:${c}">${g}</span></div><div style="text-align:right"><div class="disp" style="font-size:44px;line-height:1">${fmtI(z.level)}</div><small class="muted">livello zona</small></div></div>
     <div class="row" style="gap:8px;margin:10px 0"><div class="stat"><b>${z.users.length}</b><small>superstiti</small></div><div class="stat"><b>${fmtI(z.avgU)}</b><small>indice medio</small></div><div class="stat"><b>${z.resources.filter(x=>x.dist<800).length}</b><small>servizi entro 800 m</small></div></div>
     <details><summary class="disp" style="font-size:20px;cursor:pointer">Tutti i servizi</summary>
     ${z.resources.slice().sort((a,b)=>a.dist-b.dist).map(r=>`<div class="row spread" style="padding:5px 0;border-bottom:2px dashed rgba(20,15,31,.15)"><span>${RES_ICON[r.kind][0]} ${r.name}</span><b>${r.dist<1000?r.dist+' m':(r.dist/1000).toFixed(1).replace('.',',')+' km'}</b></div>`).join('')}</details>
     <p class="notice" style="margin-top:10px">${CONFIG.GOOGLE_MAPS_API_KEY?'Servizi da Google Maps.':'Servizi e superstiti simulati. In produzione: servizi da Google Maps, superstiti dal database.'} I superstiti compaiono solo con profilo pubblico, in posizione approssimativa (circa 200 m) e con il solo indice generale: i punti deboli delle case non sono mai visibili.</p>
   ${me?`<div style="padding:8px 12px"><button class="btn small alt" data-realmap="${esc(z.address)}">🗺️ Vedi la tua zona vera a fumetto</button></div>`:''}</div>`;
}
function bindMap(key,z,me=true){
  const box=document.getElementById('map-'+key);if(!box)return;
  box.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{S.layers[b.dataset.layer]=!S.layers[b.dataset.layer];box.querySelector('.mapsvg').innerHTML=mapScene(z,{...S.layers,me,mode:'night'});box.querySelectorAll('[data-layer]').forEach(x=>x.classList.toggle('on',S.layers[x.dataset.layer]));wirePins();});
  const info=document.getElementById('info-'+key);
  if(typeof wireCommunity==='function')wireCommunity(box.querySelector('.mapsvg'),z,info);
  function wirePins(){
    box.querySelectorAll('[data-poi]').forEach(p=>p.onclick=()=>{const r=z.resources[+p.dataset.poi];const key='p-'+(z.address||'')+'-'+r.name;info.innerHTML=`<b>${RES_ICON[r.kind][0]} ${r.name}</b><span>${r.dist<1000?r.dist+' m':(r.dist/1000).toFixed(1).replace('.',',')+' km'} da ${me?'casa':'il centro della zona'}</span><span>${rvLine(key,6,4)}</span>${rvBtn(key,r.name,6,4)}`;vibe();});
    box.querySelectorAll('[data-user]').forEach(p=>p.onclick=()=>{const u=z.users[+p.dataset.user];const[g,c]=grade(u.idx);info.innerHTML=`<b>@${esc(u.nick)}</b><span class="tag" style="background:${c}">${g}</span><span>Indice ${fmtI(u.idx)} · ${u.valutazioni} valutazioni · posizione approssimativa</span><button class="btn small alt" data-challenge>Sfida</button>`;const ch=info.querySelector('[data-challenge]');ch.onclick=()=>toast(`Sfida inviata a @${u.nick}: vince chi abbassa di più l’indice in una settimana`);vibe();});
  }
  wirePins();
}
function vFoto(){
  const slots=PHOTO_SLOTS;
  const f=S.findings;
  $('#vv').innerHTML=`
   <h2>Inquadra la casa</h2>
   <p class="muted" style="margin:6px 0 14px">Tre foto dall’esterno. Persone e targhe vengono ignorate. Le foto servono solo all’analisi e non vengono salvate.</p>
   <div class="shots">${slots.map(([k,l])=>`<label class="shot" for="ph_${k}">${S.photos[k]?`<img src="${S.photos[k].url}" alt="Foto ${l}">`:`<span style="font-size:30px">📷</span><span>Tocca per scattare</span>`}<span class="lbl">${l}</span><input type="file" id="ph_${k}" accept="image/*" capture="environment" data-k="${k}"></label>`).join('')}</div>
   <div class="row wrap" style="margin:14px 0">
     <button class="btn" id="aiBtn" ${Object.values(S.photos).some(Boolean)?'':'disabled'}>Analizza con l’IA</button>
     <button class="btn ghost small" id="simBtn">Non ho foto: usa l’esempio</button>
   </div>
   <div id="fres">${f?findingsCard(f):''}</div>
   <div class="row spread" style="margin-top:6px"><button class="btn ghost small" id="back1">Indietro</button><button class="btn alt" id="next1">${f?'Avanti: le domande':'Salta le foto'}</button></div>`;
  document.querySelectorAll('.shot input').forEach(inp=>inp.onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{S.photos[inp.dataset.k]=await fileToJpeg(file);vibe();vFoto();}catch(err){toast('Immagine non leggibile: prova con un’altra foto');}
  });
  $('#aiBtn').onclick=async()=>{
    $('#aiBtn').innerHTML='<span class="spin"></span> L’IA osserva';$('#aiBtn').disabled=true;
    const imgs=Object.entries(S.photos).filter(([,v])=>v);
    try{
      const content=[];imgs.forEach(([k,v])=>{content.push({type:'text',text:'Foto: '+((PHOTO_SLOTS.find(x=>x[0]===k)||[0,k])[1])});content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:v.b64}});});
      content.push({type:'text',text:'Analizza le foto e rispondi solo con il JSON richiesto.'});
      const txt=await askAI(VISION_PROMPT,[{role:'user',content}]);
      const json=JSON.parse(txt.replace(/```json|```/g,'').trim());S.findings=json;
    }catch(e){S.findings=null;toast('Analisi automatica non ancora attiva: guarda le tue foto mentre rispondi alle domande');return vFoto();toast('IA non raggiungibile: uso un’analisi simulata');}
    vFoto();
  };
  $('#simBtn').onclick=()=>{S.findings=simulateFindings();vFoto();};
  $('#back1').onclick=()=>{S.step=0;renderValuta();};
  $('#next1').onclick=()=>{if(S.findings)applyFindings(S.findings);S.step=2;S.chapter=0;renderValuta();};
}
const FIND_LABEL={porta:'Porta',grate:'Grate',finestre:'Finestre basse',tapparelle:'Tapparelle',recinzione:'Recinzione',cancello:'Cancello',luci:'Luci esterne'};
function findingsCard(f){
  const rows=Object.keys(FIND_LABEL).map(k=>{const v=f[k];const q=QBY[k];const o=q&&q.o.find(x=>x[0]===v);
    return`<div class="finding"><span class="tag ia">IA</span><div><b>${FIND_LABEL[k]}</b><div class="muted" style="font-size:14px">${o?o[1]:'Non visibile: rispondi tu'}</div></div></div>`;}).join('');
  return`<div class="panel"><div class="row spread"><h3>Cosa ha visto l’IA</h3>${f.simulated?'<span class="tag sp">simulata</span>':''}</div>${rows}
   ${(f.note||[]).length?`<div class="caption" style="margin-top:10px">${f.note.map(esc).join(' · ')}</div>`:''}
   <p class="muted" style="font-size:13px;margin-top:10px">Queste risposte vengono inserite nelle domande: puoi sempre correggerle.</p></div>`;
}
function applyFindings(f){Object.keys(FIND_LABEL).forEach(k=>{if(f[k]&&f[k]!=='ns'&&QBY[k].o.some(o=>o[0]===f[k])){S.answers[k]=f[k];S.aiFilled[k]=true;}});}
function vDomande(){
  const ch=CHAPTERS[S.chapter||0];
  const qs=Q.filter(q=>q.ch===ch.id);
  const done=Q.filter(q=>S.answers[q.id]).length;
  $('#vv').innerHTML=`
   <div class="row spread"><div class="row" style="gap:12px">${chapterIcon(ch.id)}<div><h2>${ch.name}</h2><small class="muted">Capitolo ${(S.chapter||0)+1} di ${CHAPTERS.length}</small></div></div><span class="caption">${done}/${Q.length}</span></div>
   <div class="row wrap" style="gap:6px;margin:10px 0">${CHAPTERS.map((c,i)=>{const n=Q.filter(q=>q.ch===c.id),a=n.filter(q=>S.answers[q.id]).length;return`<button class="chip ${i===(S.chapter||0)?'on':''}" data-ch="${i}">${c.name} ${a}/${n.length}</button>`}).join('')}</div>
   <div class="panel">${qs.map(q=>`<div class="q"><label>${q.t}</label>${q.h?`<div class="hint">${q.h}</div>`:''}
     <div class="chips" role="radiogroup" aria-label="${esc(q.t)}">${q.o.map(o=>`<button class="chip opt ${q.ai||q.map?'ai':''} ${S.answers[q.id]===o[0]?'on':''}" role="radio" aria-checked="${S.answers[q.id]===o[0]}" data-q="${q.id}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>
     ${S.aiFilled[q.id]?`<div class="hint" style="margin-top:6px">Compilata da ${q.map?'mappa':'IA'}: controlla</div>`:''}</div>`).join('')}</div>
   <div class="row wrap spread">
     <button class="btn ghost small" id="sample">Compila con la casa d’esempio</button>
     <button class="btn alt" id="nextCh">${(S.chapter||0)<CHAPTERS.length-1?'Capitolo successivo':'Calcola l’indice'}</button>
   </div>
   <div style="margin-top:12px"><button class="btn ghost small" id="back2">Torna alle foto</button></div>`;
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{vibe();S.answers[b.dataset.q]=b.dataset.v;delete S.aiFilled[b.dataset.q];vDomande();});
  document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{S.chapter=+b.dataset.ch;vDomande();window.scrollTo(0,0);});
  $('#sample').onclick=()=>{Q.forEach(q=>{if(!S.answers[q.id])S.answers[q.id]=SAMPLE[q.id];});toast('Risposte mancanti compilate con la casa d’esempio');vDomande();};
  $('#back2').onclick=()=>{S.step=1;renderValuta();};
  $('#nextCh').onclick=()=>{
    if((S.chapter||0)<CHAPTERS.length-1){S.chapter=(S.chapter||0)+1;vDomande();window.scrollTo(0,0);return;}
    const miss=Q.filter(q=>!S.answers[q.id]);
    if(miss.length){toast(`Mancano ${miss.length} risposte: ${miss[0].t}`);S.chapter=CHAPTERS.findIndex(c=>c.id===miss[0].ch);vDomande();return;}
    S.result=computeScore(S.answers,S.zone);S.game.base={...S.answers};S.game.applied=new Set();S.step=3;renderValuta();
  };
}
function ring(idx,size=150){
  const r=58,c=2*Math.PI*r,frac=(10-idx)/9;const [,col]=grade(idx);
  return`<svg viewBox="0 0 150 150" width="${size}" height="${size}" role="img" aria-label="Indice ${fmtI(idx)} su 10">
   <circle cx="75" cy="75" r="${r}" fill="#fff" stroke="${INK}" stroke-width="4"/>
   <circle cx="75" cy="75" r="${r}" fill="none" stroke="${col}" stroke-width="16" stroke-dasharray="${c*frac} ${c}" transform="rotate(-90 75 75)"/>
   <circle cx="75" cy="75" r="${r-9}" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="75" cy="75" r="${r+9}" fill="none" stroke="${INK}" stroke-width="3"/>
   <text x="75" y="88" text-anchor="middle" font-family="Bangers,Impact" font-size="44" fill="${INK}">${fmtI(idx)}</text></svg>`;
}
function vRisultato(){
  const R=S.result;if(!R){S.step=2;return vDomande();}
  const [g,col]=grade(R.idx);
  const weak=weakest(R.subs);
  const tips=weak.map(w=>{const u=UPG.filter(u=>(QBY[u.q]?QBY[u.q].ch:EXTRA[u.q].ch)===w.id&&S.answers[u.q]!==u.v).sort((a,b)=>gain(a,S.answers)/Math.max(a.cost,50)<gain(b,S.answers)/Math.max(b.cost,50)?1:-1)[0];return{w,u};});
  $('#vv').innerHTML=`
   <div class="panel night" style="margin-top:0"><div class="score">${ring(R.idx)}<div>
     <div class="sfx" style="font-size:30px;color:${col}">${g}</div>
     <p style="margin-top:6px">Resisti <b style="color:var(--moon)">${nightsFor(R.idx)} notti</b></p>
     <p style="font-size:13px;font-weight:400;color:#cfc6e6;margin-top:4px">1 = fortezza · 10 = buffet per zombie</p></div></div></div>
   <div class="panel"><h3>Capitolo per capitolo</h3><div class="bars">${CHAPTERS.map(c=>{const v=R.subs[c.id];return`<div class="b"><div class="row spread" style="border:0;height:auto;background:none;margin:0"><span>${c.name}</span><b>${fmtI(v)}</b></div><div><span class="fill ${v<=4?'good':v<=6?'mid':''}" style="width:${Math.max(6,v*10)}%"></span></div></div>`}).join('')}</div></div>
   <div class="panel paper"><h3>Le tre falle più grosse</h3>${tips.map(({w,u})=>`<div class="finding"><span class="tag" style="background:var(--blood);color:#fff">${fmtI(w.v)}</span><div><b>${w.name}</b><div class="muted" style="font-size:14px">${u?`Prova: ${u.name} (${fmtE(u.cost)})`:'Già messo bene: mantieni così'}</div></div></div>`).join('')}</div>
   <div class="game-scene" style="margin-bottom:16px">${houseScene(S.answers,{sid:'r'})}</div>
   <button class="btn wide" id="toGame">Fortifica la casa nel gioco</button>
   <div class="row" style="margin-top:12px"><button class="btn ghost small" id="redo">Cambia risposte</button><button class="btn alt small" id="ask">Chiedi a Radio Operatore</button></div>`;
  setTimeout(()=>document.querySelectorAll('.bars .fill').forEach(s=>{const w=s.style.width;s.style.width='0';requestAnimationFrame(()=>s.style.width=w);}),30);
  $('#toGame').onclick=()=>go('gioco');
  $('#redo').onclick=()=>{S.step=2;S.chapter=0;renderValuta();};
  $('#ask').onclick=()=>{S.chat.push({r:'me',t:`La mia casa ha indice ${fmtI(R.idx)}. Le falle sono ${weak.map(w=>w.name).join(', ')}. Da cosa parto?`});go('radio');sendChat(true);};
}

/* ---------------- GIOCO ---------------- */
function gameAnswers(){
  const a={...(S.game.base||SAMPLE)};
  UPG.filter(u=>S.game.applied.has(u.id)).forEach(u=>a[u.q]=u.v);
  return a;
}
function gain(u,base){const now=computeScore(base,S.zone).idx;const after=computeScore({...base,[u.q]:u.v},S.zone).idx;return Math.round((now-after)*10)/10;}
function renderGioco(){
  const sample=!S.game.base;
  const a=gameAnswers();const sc=computeScore(a,S.zone);const baseIdx=computeScore(S.game.base||SAMPLE,S.zone).idx;
  const spent=UPG.filter(u=>S.game.applied.has(u.id)).reduce((t,u)=>t+u.cost,0);
  const [g,col]=grade(sc.idx);
  let list=UPG.filter(u=>u.src===S.game.src||S.game.applied.has(u.id)&&S.game.src==='mine');
  if(S.game.src==='ia'){list=UPG.filter(u=>!S.game.applied.has(u.id)&&a[u.q]!==u.v).map(u=>({...u,g:gain(u,a)})).filter(u=>u.g>0).sort((x,y)=>y.g/Math.max(y.cost,50)-x.g/Math.max(x.cost,50)).slice(0,6);}
  if(S.game.src==='community')list=list.slice().sort((x,y)=>(y.likes||0)-(x.likes||0));
  if(S.game.src==='mine')list=UPG.filter(u=>S.game.applied.has(u.id));
  app.innerHTML=`<div class="page">
   <div class="row spread"><h2>Simulazione</h2><span class="tag" style="background:${col}">${g}</span></div>
   <p class="muted" style="margin:4px 0 12px">${sample?'Stai giocando con una casa d’esempio. Valuta la tua per vederla qui.':'Questa è la tua casa: applica i potenziamenti e guarda cosa cambia.'}</p>
   <div class="game-scene" id="scene">${houseScene(a)}</div>
   <p class="muted" style="font-size:13px;margin-top:6px">${UPG.filter(u=>S.game.applied.has(u.id)).length} potenziamenti applicati su ${UPG.length}</p>
   <div class="hud">
     <div><b>${fmtI(sc.idx)}</b><small>indice (era ${fmtI(baseIdx)})</small></div>
     <div><b>${nightsFor(sc.idx)}</b><small>notti di resistenza</small></div>
     <div><b>${spent?spent.toLocaleString('it-IT'):'0'}</b><small>€ spesi davvero</small></div>
   </div>
   ${!sample&&typeof viatico==='function'&&viatico()?`<div class="notice via-n">🎁 Questa valutazione vale un <b>viatico in Orda</b>: parti dall’ondata ${viatico().level}. <button class="linkbtn" data-go="orda">Vai a Orda</button></div>`:''}
   <button class="btn wide" id="siege">Simula la notte dell’assedio</button>
   <div id="report" style="margin-top:14px"></div>
   <div class="tabs" style="margin-top:16px" role="tablist">
     ${[['ia','Consiglia l’IA'],['community','Community'],['sponsor','Sponsor'],['mine','Applicati']].map(([k,l])=>`<button role="tab" aria-selected="${S.game.src===k}" class="${S.game.src===k?'on':''}" data-src="${k}">${l}</button>`).join('')}
   </div>
   ${S.game.src==='ia'?`<div class="bubble" style="margin-bottom:22px">Ordinati per efficacia rispetto al costo, calcolati sulla tua casa di adesso.</div>`:''}
   ${list.length?list.map(u=>upgCard(u,a)).join(''):`<div class="notice">${S.game.src==='mine'?'Nessun potenziamento applicato: parti dai consigli dell’IA.':'Qui hai già fatto tutto. Ottimo lavoro, superstite.'}</div>`}
   <div class="row" style="margin:6px 0 10px"><button class="btn ghost small" id="reset">Ricomincia</button><button class="btn alt small" id="askGame">Chiedi un consiglio alla radio</button></div>
  </div>`;
  app.querySelectorAll('[data-src]').forEach(b=>b.onclick=()=>{S.game.src=b.dataset.src;renderGioco();});
  app.querySelectorAll('[data-upg]').forEach(b=>b.onclick=()=>toggleUpg(b.dataset.upg));
  app.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>toast('Qui si apre l’offerta dello sponsor (link tracciato)'));
  $('#reset').onclick=()=>{S.game.applied=new Set();renderGioco();};
  $('#siege').onclick=siege;bindGo();
  $('#askGame').onclick=()=>{S.chat.push({r:'me',t:`Nel gioco la casa ha indice ${fmtI(sc.idx)}. Ho applicato: ${UPG.filter(u=>S.game.applied.has(u.id)).map(u=>u.name).join(', ')||'niente'}. Cosa mi conviene fare dopo?`});go('radio');sendChat(true);};
}
function upgCard(u,a){
  const on=S.game.applied.has(u.id);const gn=on?null:gain(u,a);
  const src=u.src==='sponsor'?`<span class="tag sp">Sponsor · ${SPONSORS[u.sp].name}</span>`:u.src==='community'?`<span class="tag cm">Community · ${u.likes} voti</span>`:`<span class="tag ia">Consiglio IA</span>`;
  return`<div class="upg ${on?'on':''}"><div>${src}<br><b>${u.name}</b><small>${u.note?esc(u.note)+' · ':''}${fmtE(u.cost)}${gn!=null&&gn>0?` · indice −${fmtI(gn)}`:''}</small>
   ${u.src==='sponsor'?`<button class="btn ghost small" style="margin-top:6px;font-size:15px;min-height:34px;padding:4px 10px" data-offer="${u.id}">Vedi offerta</button>`:''}</div>
   <button class="btn small ${on?'ghost':''}" data-upg="${u.id}">${on?'Togli':'Applica'}</button></div>`;
}
function toggleUpg(id){
  vibe();const u=UPG.find(x=>x.id===id);const before=computeScore(gameAnswers(),S.zone).idx;
  if(S.game.applied.has(id))S.game.applied.delete(id);
  else{UPG.forEach(o=>{if(o.q===u.q)S.game.applied.delete(o.id);});S.game.applied.add(id);}
  const after=computeScore(gameAnswers(),S.zone).idx;
  renderGioco();
  const d=Math.round((before-after)*10)/10;
  const sc=$('#scene');const p=document.createElement('div');p.className='pop sfx';p.style.left='14px';p.style.top='12px';
  p.textContent=d>0?`BAM! −${fmtI(d)}`:d<0?`OPS! +${fmtI(-d)}`:'CLANG!';sc.appendChild(p);
}
const FINALI={
 fortezza:{t:'La fortezza',d:'L’orda non trova un solo varco. Prima dell’alba gli zombie si arrendono e tornano da dove sono venuti.',ok:true},
 quartiere:{t:'Il quartiere unito',d:'I vicini arrivano con torce e megafoni: insieme respingete l’orda. Nessuno si salva da solo.',ok:true},
 luce:{t:'Luce nella notte',d:'Salta la corrente in tutto il quartiere, ma la tua casa resta accesa: le luci accecano l’orda fino all’alba.',ok:true},
 alba:{t:'Resistito all’alba',d:'Porte graffiate e nervi a pezzi, ma all’alba la casa è ancora in piedi.',ok:true},
 elicottero:{t:'Soccorso dal cielo',d:'La radio funziona: lanciate l’SOS e un elicottero vi recupera dal giardino.',ok:false},
 auto:{t:'Fuga a tutto gas',d:'Tutti in macchina lungo la via di fuga libera. L’orda resta nello specchietto.',ok:false},
 bici:{t:'Pedalare per vivere',d:'In bici lungo la via di fuga: lenti, ma silenziosi.',ok:false},
 zaino:{t:'Ritirata organizzata',d:'Zaini pronti, percorso deciso: lasciate la casa in ordine e raggiungete un posto sicuro.',ok:false},
 piedi:{t:'Corsa nella notte',d:'Senza mezzo e senza zaino si scappa a piedi. Ce la fate, ma per un soffio.',ok:false},
 tetto:{t:'Tutti sul tetto',d:'Nessuna via di fuga: vi rifugiate sul terrazzo e aspettate l’alba con la torcia accesa.',ok:false},
 rifugio:{t:'La stanza rifugio',d:'Porta robusta e scorte: l’orda entra in casa ma non nella stanza rifugio.',ok:false},
 gameover:{t:'Game over',d:'Nessun varco chiuso, nessuna via di fuga. L’orda si prende la casa. Ricomincia dai consigli dell’IA.',ok:false}
};
function finaleKey(a,eff,helpers){
  const canFlee=a.fuga!=='0';
  if(eff<=4.5){if(eff<=2.5)return'fortezza';if(helpers===2)return'quartiere';if(a.luci==='sensore'&&(a.energia==='fv'||a.energia==='gen'))return'luce';return'alba';}
  if(a.radio==='radio'&&(a.walkie==='1'||a.gruppo==='org'))return'elicottero';
  if(canFlee&&['auto','fuori'].includes(a.mezzo))return'auto';
  if(canFlee&&a.mezzo==='bici')return'bici';
  if(canFlee&&a.zaino==='1')return'zaino';
  if(canFlee)return'piedi';
  if(a.tetto==='int')return'tetto';
  if(a.cantina==='int')return'rifugio';
  return'gameover';
}
function finaleSVG(k,a){
  const dawn=['fortezza','quartiere','alba','zaino'].includes(k);
  const sky=dawn?`<defs><linearGradient id="fsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f08a4b"/><stop offset="1" stop-color="#f7d64a"/></linearGradient></defs><rect width="480" height="270" fill="url(#fsk)"/><circle cx="400" cy="200" r="46" fill="#fff3b0" stroke="${INK}" stroke-width="3"/>`
    :`<rect width="480" height="270" fill="#241a4a"/><rect width="480" height="270" fill="url(#htlfi)"/><circle cx="400" cy="50" r="26" fill="#f7d64a" stroke="${INK}" stroke-width="3"/>`;
  const ground=`<rect y="210" width="480" height="60" fill="${dawn?'#6b8f4e':'#1d1640'}" stroke="${INK}" stroke-width="3"/>`;
  const house=(x,y,s=1,lit=true)=>`<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="3"><rect x="0" y="40" width="110" height="80" fill="#4b3f7a"/><path d="M-10 44 L55 0 L120 44Z" fill="#d7263d"/><rect x="14" y="56" width="24" height="22" fill="${lit?'#f7d64a':'#1d1640'}"/><rect x="72" y="56" width="24" height="22" fill="${lit?'#f7d64a':'#1d1640'}"/><rect x="44" y="84" width="22" height="36" fill="#8a5a34"/></g>`;
  const Z=(x,y,s=.5,f=false)=>zombie(x,y,s,f);const P=(x,y,s,c,o)=>person(x,y,s,c,o);
  let b='';
  if(k==='fortezza')b=house(150,90)+`<rect x="40" y="186" width="330" height="30" fill="url(#brickfi)" stroke="${INK}" stroke-width="3"/><rect x="160" y="166" width="90" height="22" fill="#fff" stroke="${INK}" stroke-width="2.5"/><text x="205" y="182" text-anchor="middle" font-family="Bangers,Impact" font-size="13" fill="${INK}">CHIUSO PER ZOMBIE</text>`+Z(400,232,.5,false)+Z(440,236,.45,false)+Z(360,238,.42,false);
  if(k==='quartiere')b=house(170,90)+[60,110,300,350,400].map((x,i)=>P(x,238,.6,['#2f7fb8','#d7263d','#3f9b5f','#f08a4b','#7c8794'][i],{torch:true,coat:'#f7d64a',hood:true,flip:i>2})).join('')+Z(470,240,.4,false)+`<rect x="120" y="20" width="240" height="34" fill="#fff" stroke="${INK}" stroke-width="3"/><text x="240" y="44" text-anchor="middle" font-family="Bangers,Impact" font-size="22" fill="#d7263d">IL QUARTIERE NON SI ARRENDE</text>`;
  if(k==='luce')b=[0,1,3,4].map(i=>house(10+i*95,110,.7,false)).join('')+`<circle cx="245" cy="160" r="70" fill="#f7d64a" opacity=".3"/>`+house(205,104,.75,true)+`<path d="M210 120 l40 -26 l14 8 l-40 26z" fill="#2f7fb8" stroke="${INK}" stroke-width="2"/>`+Z(120,240,.45,false)+Z(380,240,.45,true)+`<text x="160" y="250" font-family="Bangers,Impact" font-size="16" fill="#f7d64a">ARGH, LA LUCE!</text>`;
  if(k==='alba')b=house(160,90)+`<path d="M190 150 l10 10 M196 146 l10 10 M250 140 l10 12" stroke="${INK}" stroke-width="2"/>`+P(185,170,.35,'#d7263d')+P(245,170,.35,'#2f7fb8')+Z(400,236,.5,false)+Z(450,240,.45,false);
  if(k==='elicottero')b=house(80,90,1,false)+`<g transform="translate(270 40)" stroke="${INK}" stroke-width="3"><path d="M-80 0 H80" stroke-width="5"/><path d="M0 0 V12"/><ellipse cx="0" cy="34" rx="46" ry="24" fill="#d7263d"/><path d="M40 34 H100 L110 20" fill="none" stroke-width="6"/><circle cx="-14" cy="30" r="12" fill="#bfe3f2"/><path d="M-20 58 L-26 140 M-6 58 L-12 140" stroke-width="2"/>${[70,86,102,118,134].map(y=>`<path d="M${-25} ${y} H${-11}" stroke-width="2"/>`).join('')}</g>`+P(250,170,.45,'#2f7fb8')+P(240,212,.5,'#d7263d')+Z(120,238,.5)+Z(380,238,.5,true)+`<text x="330" y="140" font-family="Bangers,Impact" font-size="24" fill="#f7d64a" stroke="${INK}" stroke-width="1">FLAP FLAP!</text>`;
  if(k==='auto')b=`<rect y="200" width="480" height="30" fill="#3b3550"/><path d="M0 215 H480" stroke="#f7d64a" stroke-dasharray="20 14" stroke-width="3"/>`+`<g transform="translate(300 214) scale(1.6)">${vehicle(a.mezzo==='fuori'?'fuori':'auto',0,0)}</g>`+`<path d="M180 180 H240 M170 196 H230 M190 166 H236" stroke="#fff" stroke-width="3"/>`+Z(70,236,.45,false)+Z(110,240,.4,false)+`<rect x="400" y="120" width="70" height="26" fill="#3f9b5f" stroke="${INK}" stroke-width="3"/><text x="435" y="138" text-anchor="middle" font-family="Bangers,Impact" font-size="13" fill="#fff">VIA DI FUGA</text>`;
  if(k==='bici')b=`<rect y="200" width="480" height="30" fill="#3b3550"/>`+`<g transform="translate(300 222) scale(1.5)">${vehicle('bici',0,0)}</g>`+P(306,200,.5,'#2f7fb8')+`<path d="M200 186 H250 M190 200 H240" stroke="#fff" stroke-width="3"/>`+Z(80,236,.45,false)+`<text x="360" y="150" font-family="Bangers,Impact" font-size="22" fill="#f7d64a">DLIN DLIN!</text>`;
  if(k==='zaino')b=`<path d="M0 220 Q240 190 480 230" stroke="#c9a36b" stroke-width="22" fill="none"/>`+Array.from({length:6},(_,i)=>`<path d="M${30+i*80} 210 l14 -40 l14 40z" fill="#2f6b45" stroke="${INK}" stroke-width="2"/>`).join('')+[220,270,310].map((x,i)=>P(x,214,.55,['#d7263d','#2f7fb8','#3f9b5f'][i])+`<rect x="${x-14}" y="${180}" width="12" height="16" rx="3" fill="#a8743a" stroke="${INK}" stroke-width="2"/>`).join('')+`<rect x="380" y="150" width="70" height="26" fill="#fff" stroke="${INK}" stroke-width="3"/><text x="415" y="168" text-anchor="middle" font-family="Bangers,Impact" font-size="12" fill="${INK}">PUNTO SICURO 2 KM</text>`;
  if(k==='piedi')b=house(30,90,.8,false)+[250,290,330].map((x,i)=>P(x,232,.55,['#d7263d','#2f7fb8','#f7d64a'][i],{flip:false})).join('')+`<path d="M220 200 H200 M226 214 H196" stroke="#fff" stroke-width="3"/>`+Z(170,238,.5,false)+Z(140,238,.45,false)+`<text x="350" y="150" font-family="Bangers,Impact" font-size="24" fill="#f7d64a">CORRETE!</text>`;
  if(k==='tetto')b=house(170,100)+[200,230,258].map((x,i)=>P(x,108,.4,['#d7263d','#2f7fb8','#f7d64a'][i],{torch:i===1})).join('')+Z(120,238,.5)+Z(160,240,.45)+Z(330,238,.5,true)+Z(370,240,.45,true)+`<text x="300" y="70" font-family="Bangers,Impact" font-size="20" fill="#f7d64a">TENETE DURO FINO ALL’ALBA</text>`;
  if(k==='rifugio')b=`<rect x="40" y="40" width="400" height="200" fill="#3b3550" stroke="${INK}" stroke-width="4"/><rect x="40" y="40" width="400" height="60" fill="#1d1640" stroke="${INK}" stroke-width="3"/>`+Z(120,98,.4)+Z(200,98,.38,true)+Z(330,98,.4)+`<rect x="60" y="120" width="70" height="110" fill="#8a5a34" stroke="${INK}" stroke-width="3"/>${[140,170,200].map(y=>`<path d="M60 ${y} H130" stroke="${INK}" stroke-width="2"/>`).join('')}<rect x="66" y="126" width="16" height="12" fill="#c9a36b"/><rect x="90" y="150" width="20" height="16" fill="#6fa8dc"/><circle cx="240" cy="130" r="30" fill="#f7d64a" opacity=".35"/><path d="M240 104 V118" stroke="${INK}" stroke-width="2"/><circle cx="240" cy="124" r="7" fill="#f7d64a" stroke="${INK}" stroke-width="2"/>`+[220,260,300].map((x,i)=>P(x,232,.5,['#d7263d','#2f7fb8','#f7d64a'][i])).join('')+`<rect x="380" y="130" width="40" height="100" fill="#7c8794" stroke="${INK}" stroke-width="3"/><text x="400" y="186" text-anchor="middle" font-family="Bangers,Impact" font-size="11" fill="#fff">RIFUGIO</text>`;
  if(k==='gameover')b=house(170,90,1,false)+`<rect x="214" y="174" width="22" height="36" fill="#140f1f"/>`+Z(120,236,.5)+Z(160,240,.45)+Z(300,236,.5,true)+Z(340,240,.45,true)+Z(225,170,.3)+`<text x="240" y="70" text-anchor="middle" font-family="Bangers,Impact" font-size="54" fill="#d7263d" stroke="${INK}" stroke-width="2">GAME OVER</text>`;
  return`<svg viewBox="0 0 480 270" role="img" aria-label="Finale: ${FINALI[k].t}">${defs('fi')}${sky}${ground}${b}</svg>`;
}
function siege(){const sTo=(f,ms)=>setTimeout(()=>{if(!document.getElementById('scene')||!document.getElementById('report'))return;try{f();}catch(e){console.warn(e);}},ms);
  const a=gameAnswers();const sc=computeScore(a,S.zone).idx;
  const helpers=a.gruppo==='org'?2:(a.vicini==='20'&&a.gruppo==='qualche')?1:0;
  const eff=Math.max(1,sc-(helpers===2?1:helpers===1?.4:0));
  const key=finaleKey(a,eff,helpers);const strong=FINALI[key].ok;
  const fence=a.recinzione==='muro2'?'muro alto':a.recinzione==='muro1'?'cancellata':(a.recinzione==='rete'||a.recinzione==='cond')?'rete':null;
  const box=$('#scene');box.innerHTML=houseScene(a,{siege:true,sid:'s'})+`<div class="cap" id="cap"></div>`;
  box.scrollIntoView({behavior:'smooth',block:'center'});
  ($('#siege')||{}).disabled=true;($('#report')||{}).innerHTML='';
  const svg=box.querySelector('svg');const sid='gs';
  const Z=[...box.querySelectorAll('.zw')];
  const cap=t=>{const c=$('#cap');if(!c)return;c.textContent=t;c.classList.remove('in');void c.offsetWidth;c.classList.add('in');};
  const pop=(t,x,y,col)=>{const p=document.createElement('div');p.className='pop sfx';p.textContent=t;p.style.left=x;p.style.top=y;if(col)p.style.color=col;box.appendChild(p);sTo(()=>p.remove(),1300);};
  const move=(el,dx,dur,dy=0)=>{if(!el)return;el.style.transition=`transform ${dur}s linear, opacity .8s`;el.style.transform=`translate(${dx}px,${dy}px)`;};
  const stopL=fence?(fence==='rete'?150:120):200, stopR=fence?(fence==='rete'?300:330):250;
  const log=[];const T=(ms,fn)=>sTo(fn,ms);
  cap('Mezzanotte. L’orda arriva dalla strada.');try{sfx('horn');}catch(e){}
  requestAnimationFrame(()=>requestAnimationFrame(()=>Z.forEach((g,i)=>{const x=+g.dataset.x,l=g.dataset.side==='l';const k=+g.dataset.i%5;move(g,(l?stopL-k*22:stopR+k*22)-x,3+k*.35);})));
  if(a.luci==='sensore'){T(1800,()=>{svg.querySelector('.cone')&&svg.querySelector('.cone').classList.add('flash');pop('FLASH!','8%','30%');});log.push('Le luci a sensore hanno scoperto l’orda in anticipo');}
  if(a.cane==='1'){T(1500,()=>pop('WOOF!','12%','62%'));log.push('Il cane ha dato l’allarme');}
  if(a.allarme==='cam'||a.allarme==='allarme'){T(2600,()=>{const s=document.getElementById('siren'+sid);s&&s.classList.add('blink');pop('UIIIUUU!','58%','40%','#d7263d');});log.push('L’allarme ha svegliato tutto il quartiere');}
  if(a.energia==='fv'||a.energia==='gen'){T(3200,()=>{cap('Blackout nel quartiere… ma da te le luci restano accese.');});log.push(a.energia==='fv'?'Il fotovoltaico ha tenuto accesa la casa':'Il generatore ha tenuto accesa la casa');}
  T(4000,()=>{if(fence){pop(fence==='rete'?'CRAAK!':'BONK!','30%','70%');cap(fence==='rete'?'La rete scricchiola…':`Il ${fence} li tiene fuori.`);}else cap('Niente recinzione: sono già in giardino!');});
  log.push(fence?`Recinzione: ${fence}`:'Nessuna recinzione: orda subito alla porta');
  if(a.porta==='b4'||a.porta==='blindata')log.push('La porta blindata ha retto agli urti');
  if(a.grate==='tutte')log.push('Le grate hanno chiuso le finestre basse');
  let t=5400;
  if(helpers){T(t,()=>{cap(helpers===2?'Il gruppo di quartiere arriva in aiuto!':'Un vicino accorre con la torcia!');const h=document.getElementById('help'+sid);if(h){h.style.opacity=1;move(h,helpers===2?190:150,2.4);}pop('ARRIVIAMO!','4%','46%','#f7d64a');
      Z.filter(g=>g.dataset.side==='l').forEach(g=>{const cur=g.style.transform.match(/-?\d+(\.\d+)?/);const dx=cur?+cur[0]:0;move(g,dx-260,2.2);g.style.opacity=.25;});});
    log.push(helpers===2?'I vicini del gruppo hanno respinto il lato sinistro':'Un vicino ha dato una mano');t+=2800;}
  T(t,()=>{
    if(strong){cap(key==='fortezza'?'Nessun varco: l’orda si arrende.':'Alba. La casa ha resistito.');const d=document.getElementById('dawn'+sid);if(d)d.style.opacity=.55;const m=document.getElementById('moon'+sid);if(m)m.style.opacity=.2;
      Z.forEach(g=>{const l=g.dataset.side==='l';move(g,l?-420:420,3);g.style.opacity=0;});pop(key==='fortezza'?'FORTEZZA!':'RESISTITO!','22%','26%','#6fb59a');finish();return;}
    cap('Le difese cedono!');pop('SFONDATO!','24%','26%','#d7263d');
    Z.forEach(g=>{const x=+g.dataset.x,l=g.dataset.side==='l';move(g,(l?190:250)-x+(Math.random()*20-10),1.6);});
    T(1900,()=>{const fam=document.getElementById('fam'+sid);
      if(key==='elicottero'){cap('SOS via radio… arrivano i soccorsi!');pop('FLAP FLAP!','55%','10%','#f7d64a');if(fam){fam.style.opacity=1;move(fam,0,1.6,-90);T(1700,()=>fam.style.opacity=0);}log.push('La radio ha chiamato i soccorsi');}
      else if(key==='auto'){if(fam){fam.style.opacity=1;move(fam,175,1.2,40);}cap('Tutti in macchina, via di fuga libera!');T(1300,()=>{if(fam)fam.style.opacity=0;move(document.getElementById('vehicle'+sid),260,1.6);pop('VROOOM!','60%','62%','#f7d64a');});log.push('Fuga in auto riuscita');}
      else if(key==='bici'){if(fam){fam.style.opacity=1;move(fam,-150,1.2,40);}cap('In bici lungo la via di fuga!');T(1300,()=>{if(fam)fam.style.opacity=0;move(document.getElementById('vehicle'+sid),-200,2);pop('DLIN DLIN!','10%','62%','#f7d64a');});log.push('Fuga in bici riuscita');}
      else if(key==='zaino'||key==='piedi'){if(fam){fam.style.opacity=1;move(fam,320,key==='zaino'?3:2.4,40);}cap(key==='zaino'?'Zaini in spalla: ritirata organizzata.':'Si scappa a piedi: correte!');pop(key==='zaino'?'VIA!':'SCAPPA!','56%','58%','#f7d64a');log.push(key==='zaino'?'Lo zaino di fuga ha fatto la differenza':'Fuga a piedi senza preparazione');}
      else if(key==='tetto'){if(fam){fam.style.opacity=1;move(fam,0,1.4,-130);}cap('Tutti sul terrazzo!');pop('SU, SU!','46%','20%','#f7d64a');log.push('Il terrazzo raggiungibile solo da dentro vi ha salvati');}
      else if(key==='rifugio'){cap('Tutti nella stanza rifugio.');pop('CLANG!','50%','60%');log.push('La stanza rifugio ha retto');}
      else{cap('Nessuna via di fuga. Game over.');pop('GAME OVER','14%','40%','#d7263d');log.push('Nessuna via di fuga e nessun rifugio');}
      finish();});
  });
  function finish(){
    T(strong?2600:3000,()=>{const rep=$('#report');rep.innerHTML='<div id="tavole"></div><div id="finale"></div>';playTavole(a,$('#tavole'),()=>showFinale());});
  }
  function showFinale(){
    T(400,()=>{
      ($('#siege')||{}).disabled=false;S.finali=S.finali||{};const nuovo=!S.finali[key];S.finali[key]=true;const nf=Object.keys(S.finali).length;
      const F=FINALI[key];
      $('#finale').innerHTML=`<div class="panel finale ${F.ok?'ok':''}"><div class="fin-h"><span class="tag ${F.ok?'ia':'sp'}">${nuovo?'Nuovo finale!':'Finale'} · ${nf}/12 scoperti</span><h3>${F.t}</h3></div>
        <div class="fin-art">${finaleSVG(key,a)}</div><p style="font-weight:400;margin:8px 0">${F.d}</p>
        <div class="fin-list">${Object.keys(FINALI).map(k=>`<span class="${S.finali[k]?'on':''}" title="${FINALI[k].t}">${S.finali[k]?FINALI[k].t:'???'}</span>`).join('')}</div></div>
        <div class="panel ${F.ok?'':'night'}"><h3 ${F.ok?'':'style="color:var(--moon)"'}>Rapporto della notte</h3>
        <p style="margin:6px 0 8px">${F.ok?`Esito: <b>resistito</b>. Autonomia stimata: ${nightsFor(sc)} notti.`:'Esito: <b>difese superate</b>.'}</p>
        ${log.map(l=>`<div class="finding"><span class="tag ${F.ok?'ia':'sp'}">✓</span><div>${l}</div></div>`).join('')}
        ${F.ok?'':'<p style="margin-top:8px;font-weight:400">Prova i potenziamenti consigliati dall’IA e scopri un finale migliore.</p>'}</div>`;
      $('#finale').scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
}

/* ---------------- MAPPA ---------------- */

/* ---------------- RADIO IA ---------------- */
function renderRadio(){
  app.innerHTML=`<div class="page">
   <div class="row" style="gap:12px;margin-bottom:12px"><div style="width:58px;height:58px;border:var(--line);background:var(--zom);display:grid;place-items:center;flex:none">${ICON.radio.replace('<svg','<svg width="34" height="34" style="color:#140f1f"')}</div>
     <div><h2 style="font-size:30px">Radio Operatore</h2><p class="muted" style="font-size:14px">Chatbot per info su app, valutazione e consigli</p></div></div>
   <div class="chat" id="chat">${S.chat.map(m=>`<div class="msg ${m.r==='me'?'me':'bot'} ${m.typing?'typing':''}">${esc(m.t)}</div>`).join('')}</div>
   <div class="chips" style="margin:12px 0">${['Come funziona la foto?','Cosa vuol dire il mio indice?','Come entrano gli sponsor?','Che fine fanno i miei dati?'].map(t=>`<button class="chip" data-quick="${esc(t)}">${t}</button>`).join('')}<button class="chip" data-go="contatti">✉️ Scrivi a una persona</button></div>
   <div class="composer"><input id="chatIn" class="field" placeholder="Scrivi alla radio" aria-label="Messaggio"><button class="btn small" id="send">Invia</button></div></div>`;
  bindGo();
  app.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{S.chat.push({r:'me',t:b.dataset.quick});sendChat();});
  $('#send').onclick=()=>{const t=$('#chatIn').value.trim();if(!t)return;S.chat.push({r:'me',t});sendChat();};
  $('#chatIn').onkeydown=e=>{if(e.key==='Enter')$('#send').click();};
  const c=$('#chat');c.lastElementChild&&c.lastElementChild.scrollIntoView({block:'end'});
}
async function sendChat(fromElsewhere){
  S.chat.push({r:'bot',t:'…',typing:true});if(S.tab==='radio')renderRadio();
  const hist=S.chat.filter(m=>!m.typing).slice(-10).map(m=>({role:m.r==='me'?'user':'assistant',content:m.t}));
  while(hist.length&&hist[0].role!=='user')hist.shift();
  let reply;
  try{reply=await askAI(CHAT_SYSTEM,hist);if(!reply)throw 0;}
  catch(e){reply=fallbackChat(hist[hist.length-1].content);}
  S.chat=S.chat.filter(m=>!m.typing);S.chat.push({r:'bot',t:reply});
  if(S.tab==='radio')renderRadio();
}

</script>
