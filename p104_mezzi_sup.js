<script>
/* =========================================================
   🚗 I MEZZI DEL SUPERSTITE (Fase 50, migrazione 041)
   - Linguetta "🚗 Mezzi" in cima al superstite (al posto di "Come si cresce", che resta in fondo alla scheda):
     ogni mezzo con velocità, cosa consuma (🔋 a piedi e in bici, ⛽ al km a motore), quanto bottino porta (capienza),
     prezzo in Bottega; "Usa questo" (world_mezzo_scegli) o "Compra" (world_buy_mezzo).
   - 🥫 → 🔋: world_energia_compra (🥫 10 = 🔋 1, max 10 al giorno).
   - Le spedizioni chiedono da quale casa partire, come le casse (PART_SEL di p100).
   ========================================================= */
MZ.furgone=['🚐','Furgone',20,45,9,'×1,1'];if(MZ_ORD.indexOf('furgone')<0)MZ_ORD.push('furgone');
const MZS={piedi:{en:'1 energia a viaggio',carb:0,cap:1,pr:0},bici:{en:'2 energia a viaggio',carb:0,cap:1.2,pr:100},moto:{en:'',carb:1,cap:1.4,pr:300},
  auto:{en:'',carb:1.5,cap:1.8,pr:600},fuori:{en:'',carb:2,cap:2.2,pr:1200},furgone:{en:'',carb:2.5,cap:3,pr:1800}};
const mzN=v=>String(v).replace('.',',');
async function supMezzi(box){box.innerHTML='<p><span class="spin"></span></p>';let d=null;try{const r=await SB.rpc('world_mezzo');d=r.data;}catch(e){}
  let info=null;try{info=await mzInfo(3);}catch(e){}const io=MZ_ORD.indexOf((d&&d.mezzo)||'piedi');const sc=(info&&info.usato)||(d&&d.mezzo)||'piedi';const sp=SUP.d||{};
  if(!box.isConnected)return;
  box.innerHTML=`<div class="mzen"><div><b>🔋 Energia ${sp.energia??'?'}/${sp.energia_max??'?'}</b><small>A piedi e in bici il superstite si stanca; con i mezzi a motore usa solo ⛽. 🥫 10 = 🔋 1 (max 10 al giorno).</small></div>
      <button class="btn small" data-mzen="1">🥫10 → 🔋1</button><button class="btn small ghost" data-mzen="5">🥫50 → 🔋5</button></div>
    <p class="muted" style="font-size:13px;margin:6px 0">Il tempo di ogni viaggio è la distanza vera sulla mappa diviso la velocità. Più grande il mezzo, più scorte riporta dalle spedizioni e dalle casse.</p>
    ${MZ_ORD.map((k,i)=>{const m=MZ[k],s=MZS[k],ho=i<=io,on=k===sc;return`<div class="mzcard ${on?'on':''} ${ho?'':'no'}"><span class="mzic">${m[0]}</span><div><b>${m[1]}${on?' · in uso':''}</b>
      <small>⏱️ ${m[3]} km/h · ${s.carb?`⛽ ${mzN(s.carb)} al km (niente energia)`:`🔋 ${s.en}`} · 🎒 bottino ×${mzN(s.cap)} · arriva fino a ${m[2]} km</small>
      <small>${s.pr?`🛒 costa 🧱 ${wNum(s.pr)}`:'gratis'} · ${ho?'✔️ ce l’hai':'non ce l’hai'}</small></div>
      ${ho?(on?'':`<button class="btn small" data-mzuse="${k}">Usa</button>`):`<button class="btn small" data-mzbuy="${k}">🧱 ${wNum(s.pr)}</button>`}</div>`;}).join('')}
    <button class="btn small ghost" data-mzmig style="margin-top:6px">⚡ Usa sempre il più veloce</button>
    <button class="btn wide ghost" data-mzcome style="margin-top:10px">❓ Come si cresce</button>`;
  box.querySelectorAll('[data-mzuse],[data-mzmig]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data}=await SB.rpc('world_mezzo_scegli',{p_mz:b.dataset.mzuse||'migliore'});toast(data.msg);}catch(e){toast('Non riuscito');}await mzUsoLoad();supMezzi(box);});
  box.querySelectorAll('[data-mzbuy]').forEach(b=>b.onclick=async()=>{const k=b.dataset.mzbuy;if(!confirm(`Comprare ${MZ[k][1]} per ${wNum(MZS[k].pr)} Mattoni?`))return;b.disabled=true;
    try{const{data}=await SB.rpc('world_buy_mezzo',{p_mezzo:k});toast((data.ok?MZ[k][0]+' ':'')+data.msg);if(data.ok){try{await wMine(true);}catch(e){}}}catch(e){toast('Non riuscito');}await mzUsoLoad();supMezzi(box);});
  box.querySelectorAll('[data-mzen]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data}=await SB.rpc('world_energia_compra',{p_n:+b.dataset.mzen});toast(data.msg);}catch(e){toast('Non riuscito');}
    RES.t=0;try{resLoad(true);await supLoad(true);}catch(e){}supMezzi(box);});
  box.querySelector('[data-mzcome]').onclick=()=>supSheet('come');}
/* la lista delle spedizioni (supCalc) usa il mezzo scelto: a motore niente energia, tempo e bottino del mezzo */
let MZU=null;const MZV={piedi:5,bici:15,moto:40,auto:60,fuori:50,furgone:45};
async function mzUsoLoad(){try{MZC.d={};const d=await mzInfo(3);if(d&&d.usato)MZU=d.usato;}catch(e){}return MZU;}
const _supCalcMz=supCalc;supCalc=function(km){const c=_supCalcMz.apply(this,arguments);try{const mz=MZU;if(!mz)return c;const base=c.energia;
  c.energia=mz==='piedi'?base:mz==='bici'?base+1:0;c.min=2*(2+Math.ceil(km/(MZV[mz]||5)*60))+5;c.bottino=Math.round(c.bottino*(MZS[mz]?MZS[mz].cap:1));c.mz=mz;}catch(e){}return c;};
const _supSheetMz=supSheet;supSheet=async function(){await mzUsoLoad();return _supSheetMz.apply(this,arguments);};
</script>
