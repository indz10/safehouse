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
</script>
