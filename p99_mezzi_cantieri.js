<script>
/* =========================================================
   🚗 MEZZI CON TEMPI VERI e 🔨 CANTIERI (migrazione 035, richiesta di Alessandro 18/11)
   - Tessera .mzchip in ogni scheda con un viaggio (⚔️ attacco, 🎒 spedizione a un posto, 📦 cassa dal divano):
     mezzo usato, minuti e ⛽ per quella distanza (world_mezzi_info); toccandola si sceglie il mezzo (mzPick →
     world_mezzo_scegli): più veloce = più ⛽. Per le spedizioni conta andata e ritorno + 5 minuti di ricerca.
   - Cantieri: "🔨 Ripara" apre un cantiere a tempo (world_ripara); in Io la riga mostra il conto alla rovescia e
     "⚡ Accelera · 🧱 n" (world_cantiere_accelera). Notifica 'cantiere_ok' a fine lavori.
   ========================================================= */
const MZC={d:{},t:{}};
async function mzInfo(km){const k=Math.round((+km||0)*10)/10;if(MZC.d[k]&&Date.now()-MZC.t[k]<20000)return MZC.d[k];
  try{const{data,error}=await SB.rpc('world_mezzi_info',{p_km:k});if(!error&&data&&data.ok){MZC.d[k]=data;MZC.t[k]=Date.now();return data;}}catch(e){}return null;}
const mzOra=m=>m>=60?`${Math.floor(m/60)} h ${m%60} min`:`${m} min`;
function mzRiga(d,sped){const u=(d.mezzi||[]).find(x=>x.mz===d.usato)||(d.mezzi||[])[0];if(!u)return'';const min=sped?2*u.min+5:u.min,carb=sped?2*u.carb:u.carb;
  return`🚗 <b>${esc(u.nome)}</b> · ⏱️ ${mzOra(min)}${carb?` · ⛽ ${carb}`:''}${sped?' andata e ritorno':''} <u>cambia</u>`;}
async function mzChip(btn){const km=+btn.dataset.km;if(!km&&km!==0)return;const sped=!btn.dataset.viaggio;const d=await mzInfo(km);if(!d||!btn.isConnected)return;
  let c=btn.previousElementSibling;if(!c||!c.classList.contains('mzchip')){btn.insertAdjacentHTML('beforebegin','<button type="button" class="mzchip"></button>');c=btn.previousElementSibling;}
  c.innerHTML=mzRiga(d,sped);c.onclick=e=>{e.preventDefault();e.stopPropagation();mzPick(km,sped,()=>{MZC.d={};mzChip(btn);});};}
async function mzPick(km,sped,dopo){const d=await mzInfo(km);if(!d){toast('🚗 I mezzi arrivano dopo l’aggiornamento del server (blocco SQL 035)');return;}
  const box=document.createElement('div');box.className='mzpick';
  box.innerHTML=`<b>🚗 Con che mezzo vai? (${String(d.km).replace('.',',')} km)</b><small>Più veloce = più ⛽. Hai ⛽ ${d.carb}.${sped?' Spedizione: andata e ritorno + 5 min.':''}</small>
    ${(d.mezzi||[]).map(m=>{const min=sped?2*m.min+5:m.min,carb=sped?2*m.carb:m.carb;return`<button type="button" class="mzopt ${m.mz===d.usato?'on':''}" data-mz="${m.mz}"><span>${({piedi:'🚶',bici:'🚲',moto:'🏍️',auto:'🚗',fuori:'🚙'})[m.mz]||'🚶'}</span><b>${esc(m.nome)}</b><small>${m.kmh} km/h · ⏱️ ${mzOra(min)} · ${carb?'⛽ '+carb:'senza carburante'} · forza ×${String(m.forza).replace('.',',')}</small></button>`;}).join('')}
    <button type="button" class="mzopt" data-mz="migliore"><span>⚡</span><b>Sempre il più veloce</b><small>se hai il carburante</small></button>`;
  const host=document.querySelector('#sheet.open .mzchip');if(host){const old=host.parentElement.querySelector('.mzpick');if(old){old.remove();return;}host.insertAdjacentElement('afterend',box);}else return;
  box.querySelectorAll('[data-mz]').forEach(b=>b.onclick=async e=>{e.stopPropagation();try{const{data}=await SB.rpc('world_mezzo_scegli',{p_mz:b.dataset.mz});toast(data.msg);}catch(er){toast('Non riuscito');}box.remove();dopo&&dopo();});}
zEvery(()=>{try{if(document.hidden||!S.user)return;document.querySelectorAll('#sheet.open [data-km]').forEach(b=>{if(b.dataset.mzc)return;b.dataset.mzc=1;mzChip(b);});}catch(e){}},800,'mezzo-chip');
/* ---------- 🔨 cantieri in Io ---------- */
const _pvpLoadCn=pvpLoad;pvpLoad=async function(force){const r=await _pvpLoadCn.apply(this,arguments);
  if(force||!PVP.cnT||Date.now()-PVP.cnT>30000){PVP.cnT=Date.now();try{const{data,error}=await SB.rpc('world_cantieri_miei');PVP.cn=!error&&data&&data.ok?(data.cantieri||[]):null;}catch(e){PVP.cn=null;}}return r;};
const cnRiga=c=>`<span class="pvpok">🔨 In cantiere · finisce fra <i data-pvt="${c.fine}">${pvpLeft(c.fine)}</i></span><button class="btn small" data-pvacc="${c.id}">⚡ Accelera · 🧱 ${c.accelera}</button>`;
const _pvpHTMLCn=pvpHTML;pvpHTML=function(){let h=_pvpHTMLCn.apply(this,arguments);try{(PVP.cn||[]).forEach(c=>{
  if(c.home)h=h.replace('<button class="btn small" data-pvrip>Ripara</button>',cnRiga(c));
  else h=h.replace(new RegExp(`<button class="btn small" data-pvrc="${String(c.bid).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">[^<]*</button>`),cnRiga(c));});}catch(e){}return h;};
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-pvacc]');if(!b)return;e.preventDefault();e.stopPropagation();b.disabled=true;
  try{const{data,error}=await SB.rpc('world_cantiere_accelera',{p_id:+b.dataset.pvacc});if(error)throw error;toast(data.msg);if(!data.ok)b.disabled=false;}catch(er){toast('Non riuscito');b.disabled=false;}
  RES.t=0;try{resLoad(true);wMine(true);}catch(er){}pvpLoad(true).then(pvpPaint);},true);
/* ---------- 📊 stato delle case: danni, cantieri, assalto, case perse (migrazione 036) ---------- */
const CS={d:null,t:0};
async function csLoad(force){if(!force&&CS.d&&Date.now()-CS.t<20000)return CS.d;CS.t=Date.now();
  try{const{data,error}=await SB.rpc('world_case_stato');if(!error&&data&&data.ok)CS.d=data;}catch(e){}
  try{await pvpLoad(true);}catch(e){}return CS.d;}
const CS_DEF={fossato:'🌊 Fossato',barricate:'🪵 Barricate',sirena:'🚨 Sirena',fondamenta:'🧱 Fondamenta',fari:'💡 Fari',trappole:'🪤 Trappole',grate:'🔩 Grate',recinto:'🚧 Recinto',cani:'🐕 Cani',pompa:'🚿 Pompa'};
const csCant=bid=>((PVP&&PVP.cn)||[]).filter(c=>c.bid===bid||(c.home&&!bid));
function csLavori(L){return L.map(c=>`<div class="cslav"><span>${c.tipo==='potenzia'?'🏗️':c.tipo==='restaura'?'🔧':'🔨'}</span><div><b>${c.tipo==='potenzia'?`${CS_DEF[c.def_kind]||c.def_kind} → livello ${c.def_level}`:c.tipo==='restaura'?`Restauro: ${CS_DEF[c.def_kind]||c.def_kind}`:'Riparazione'}</b><small>pronto fra <i data-pvt="${c.fine}">${pvpLeft(c.fine)}</i></small></div><button class="btn small" data-pvacc="${c.id}">⚡ 🧱 ${c.accelera}</button></div>`).join('');}
function csRiga(h){const d=CS.d;if(!d)return'';const x=(d.case||[]).find(c=>c.bid===h.bid||(h.home&&c.home));const L=csCant(h.bid);const t=[];
  if(x&&(x.danno_pct||x.integrita<100))t.push(`💥 danni ${x.danno_pct}%`+(h.home?'':` · integrità ${x.integrita}%`));if(x&&x.crollata)t.push('🏚️ crollata');
  L.forEach(c=>t.push(`${c.tipo==='potenzia'?'🏗️ '+(CS_DEF[c.def_kind]||c.def_kind)+' '+c.def_level:c.tipo==='restaura'?'🔧 restauro '+(CS_DEF[c.def_kind]||c.def_kind):'🔨 riparazione'} fra ${pvpLeft(c.fine)}`));
  const rov=((x&&x.difese)||[]).filter(f=>f.danno>0&&!f.lavori);if(rov.length)t.push('🔧 da restaurare: '+rov.map(f=>(CS_DEF[f.kind]||f.kind)+' '+f.danno+'%').join(', '));
  return t.length?`<small class="csst">${t.join(' · ')}</small>`:'';}
function csDifese(x){const D=(x&&x.difese)||[];if(!D.length)return'';
  return`<h4 style="margin:8px 0 2px">🛡️ Difese</h4>${D.map(f=>`<div class="csdif ${f.danno>0?'rov':''}"><div><b>${CS_DEF[f.kind]||f.kind}</b> <small>${'●'.repeat(f.level)}${'○'.repeat(Math.max(0,3-f.level))}${f.danno>0?' · 💥 '+f.danno+'%':' · intatta'}</small><div class="pvpbar integ"><span style="width:${Math.max(2,100-f.danno)}%"></span></div></div>${f.danno>0?(f.lavori?'<small>🔧 in restauro</small>':`<button class="btn small" data-csres="${f.kind}">🔧 Restaura · 🪵 ${f.restauro.legno} · ⏱ ${f.restauro.minuti} min</button>`):''}</div>`).join('')}
  ${D.some(f=>f.danno>0)?'<p class="muted" style="font-size:12.5px;margin:4px 0">Una difesa rovinata vale meno contro l’orda: restaurala prima di salire di livello.</p>':''}`;}
function csBox(h){const d=CS.d;if(!d)return'';const x=(d.case||[]).find(c=>c.bid===h.bid||(h.home&&c.home))||{danno:0,danno_pct:0,integrita:100};const L=csCant(h.bid);
  const ord=d.orda&&(d.orda.case||[]).find(c=>c.bid===h.bid);const att=(d.attacchi||[]).filter(a=>a.bid===h.bid).slice(0,3);const rip=L.some(c=>c.tipo==='ripara');
  const bar=(v,cl)=>`<div class="pvpbar integ ${cl||''}"><span style="width:${Math.max(2,v)}%"></span></div>`;
  return`<div class="csbox"><b class="disp" style="font-size:19px">📊 Stato della casa</b>
    <div class="csgrid"><div><small>💥 Danni alle difese</small><b>${x.danno_pct}%</b>${bar(100-x.danno_pct)}</div>${h.home?'':`<div><small>🏚️ Integrità</small><b>${x.integrita}%</b>${bar(x.integrita)}</div>`}</div>
    ${ord?`<p class="csorda">🧟 Ultima orda: <b>${['tenuta grazie al Combattente','sfondata di misura','sfondata','travolta'][ord.esito]||'sfondata'}</b> · orda ${ord.attacco} contro difesa ${ord.difesa}</p>`:''}${ord&&ord.difese&&Object.keys(ord.difese).length?`<p class="csorda">💥 Difese rovinate: ${Object.entries(ord.difese).map(([k,v])=>(CS_DEF[k]||k)+' −'+v+'%').join(', ')}</p>`:''}
    ${csDifese(x)}
    ${att.map(a=>`<p class="csorda">⚔️ @${esc(a.da)}: ${a.esito?'ha vinto':'respinto'}${a.danno?' · difese −'+a.danno:''}${a.integ?' · integrità −'+a.integ:''}</p>`).join('')}
    ${L.length?`<h4 style="margin:8px 0 2px">⏱️ Lavori in corso</h4>${csLavori(L)}`:''}
    <div class="pvpacts">${(x.danno>0||x.integrita<100)&&!rip?`<button class="btn small" data-csrip>🔨 Ripara</button>`:''}<button class="btn small ghost" data-cswatch>🎬 Rivedi l’assalto</button></div></div>`;}
function csBind(c,h){c.querySelectorAll('[data-csres]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data}=await SB.rpc('world_def_restaura',{p_bid:h.bid,p_kind:b.dataset.csres});toast(data.msg);}catch(e){toast('Non riuscito');}RES.t=0;try{resLoad(true);}catch(e){}CS.t=0;await csLoad(true);csPaint(h);});
  const r=c.querySelector('[data-csrip]');if(r)r.onclick=async()=>{r.disabled=true;try{const{data}=await SB.rpc('world_ripara',{p_bid:h.home?'':h.bid});toast(data.msg);}catch(e){toast('Non riuscito');}RES.t=0;try{resLoad(true);}catch(e){}await csLoad(true);csPaint(h);};
  const w=c.querySelector('[data-cswatch]');if(w)w.onclick=()=>{closeSheet();const i=myHouses().findIndex(x=>x.bid===h.bid&&x.home===h.home);assalto('last',Math.max(0,i));};}
function csPaint(h){const c=document.querySelector('#sheet.open');if(!c)return;const b=c.querySelector('.sheet-b')||c;let x=b.querySelector('.csbox');const html=csBox(h);if(!html)return;
  if(x)x.outerHTML=html;else b.insertAdjacentHTML('afterbegin',html);x=b.querySelector('.csbox');x._h=h;csBind(x,h);}
const _houseSheetCs=houseSheet;houseSheet=async function(h){CS.h=h;CS.ht=(h&&h.label)||'';csLoad().catch(()=>{});return _houseSheetCs.apply(this,arguments);};
zEvery(()=>{try{const h=CS.h;const c=document.querySelector('#sheet.open');if(!h||!c)return;const t=(c.querySelector('.sheet-h h3')||{}).textContent||'';
  if(t&&CS.ht&&t.indexOf(CS.ht)<0)return;const b=c.querySelector('.sheet-b');if(b&&b.style.visibility==='hidden')return;if(!c.querySelector('.csbox')&&CS.d)csPaint(h);}catch(e){}},700,'stato-casa');
const _casasSheetCs=casasSheet;casasSheet=function(){const r=_casasSheetCs.apply(this,arguments);(async()=>{try{await csLoad();const c=document.querySelector('#sheet.open');if(!c)return;const H=myHouses();
  c.querySelectorAll('[data-cs]').forEach(b=>{const h=H[+b.dataset.cs];if(!h||b.querySelector('.csst'))return;const t=csRiga(h);if(t)b.querySelector('div').insertAdjacentHTML('beforeend',t);});
  const P=(CS.d&&CS.d.perse)||[];const box=c.querySelector('.sheet-b')||c;if(!box.querySelector('.csperse')){box.insertAdjacentHTML('beforeend',`<div class="csperse"><button class="btn small ghost" data-cswall>🎬 Guarda l’ultima orda sulle tue case</button>${P.length?`<h4 style="margin:10px 0 4px">🏴 Case perse (30 giorni)</h4>${P.map(p=>`<p class="csorda">${p.kind==='conquista'?'🏴 Conquistata da @'+esc(p.da||'?'):'🏚️ Crollata e non riparata: tornata libera'} · ${new Date(p.quando).toLocaleDateString('it-IT')}</p>`).join('')}`:''}</div>`);
    box.querySelector('[data-cswall]').onclick=()=>{closeSheet();assalto('last',0);};}}catch(e){}})();return r;};
/* dopo "Prepara" (tutte le case) o un potenziamento: la scheda delle case; se sei già nella pagina di una casa resti lì */
zEvery(()=>{try{if(typeof SB==='undefined'||!SB||SB.__csw||!SB.rpc)return;const o=SB.rpc.bind(SB);
  SB.rpc=async function(n,a){const r=await o(n,a);try{const d=r&&r.data;if(d&&d.ok&&['world_prepare','world_def_upgrade','world_ripara'].includes(n)&&!(window.__noHello&&!window.__casePop)){CS.t=0;
    setTimeout(async()=>{const x=document.querySelector('#sheet.open .csbox');if(x){await csLoad(true);csPaint(x._h);return;}
      if(n==='world_prepare'&&!document.getElementById('lente')){window.SHEET_BACK=null;casasSheet();}},700);}}catch(e){}return r;};SB.__csw=1;}catch(e){}},1000,'case-dopo');
</script>
