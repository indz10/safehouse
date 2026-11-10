<script>
/* =========================================================
   📅 OGGI: data vera, ora che scorre, meteo adesso e all'ora dell'orda,
   effetto sul gioco, sincronizzazione con Google Calendar e Calendario iPhone
   ========================================================= */
const GG=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'],MM=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const MMs=['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
window.OGGI={d:null,t:0,k:''};
async function oggiMeteo(){const R=(S.zone&&S.zone.real)||(S.geo&&S.geo.lat?{lat:S.geo.lat,lon:S.geo.lon}:null);if(!R)return null;const k=R.lat.toFixed(2)+','+R.lon.toFixed(2);
  if(OGGI.d&&OGGI.k===k&&Date.now()-OGGI.t<20*60*1000)return OGGI.d;
  try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${R.lat.toFixed(3)}&longitude=${R.lon.toFixed(3)}&current=temperature_2m,weather_code,is_day&hourly=weather_code,precipitation,temperature_2m,visibility,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&timezone=Europe%2FRome&forecast_days=2`;
    const d=await fetch(u,{signal:trSig(8000)}).then(x=>x.json());if(!d||!d.hourly)return null;OGGI.d=d;OGGI.t=Date.now();OGGI.k=k;return d;}catch(e){return null;}}
/* meteo all'ora dell'orda e cosa cambia nel gioco */
function oggiAt(d,when){if(!d||!d.hourly)return null;const p=n=>String(n).padStart(2,'0');const key=`${when.getFullYear()}-${p(when.getMonth()+1)}-${p(when.getDate())}T${p(when.getHours())}:00`;const i=d.hourly.time.indexOf(key);if(i<0)return null;
  const c=d.hourly.weather_code[i],pr=d.hourly.precipitation[i]||0,vis=d.hourly.visibility?d.hourly.visibility[i]:null,g=d.hourly.wind_gusts_10m?d.hourly.wind_gusts_10m[i]:0,t=d.hourly.temperature_2m[i];const m=moonInfo(when);
  let ev='calma',eff='Notte tranquilla: nessun effetto speciale.';
  if(c>=95||g>=60){ev='blackout';eff='⚡ Blackout: salta la corrente, si vede solo vicino alla luce.';}
  else if(c===45||c===48||(vis!=null&&vis<1000)){ev='nebbia';eff='🌫️ Nebbia: gli zombie spuntano all’ultimo momento.';}
  else if((c>=51&&c<=67)||(c>=80&&c<=82)||pr>=.2){ev='pioggia';eff='🌧️ Pioggia: zombie più lenti (ma le zone basse si allagano).';}
  else if(m.full&&when.getHours()>=18){ev='luna';eff='🌕 Luna piena: orda più veloce.';}
  return{c,ic:wIcon(c),name:wName(c),t:Math.round(t),pr,ev,eff,moon:m};}
function oggiNext(){const s=OR&&OR.s;return s&&s.next_at?new Date(s.next_at):vNextSlot();}
zEvery(()=>{const n=new Date();document.querySelectorAll('[data-clock]').forEach(e=>{e.textContent=n.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'});});},1000);
/* il dettaglio: meteo delle prossime orde + calendario */
async function oggiSheet(){openSheet('📅 Oggi','<p><span class="spin"></span> Leggo il meteo vero della tua zona…</p>',()=>{});const d=await oggiMeteo();const n=new Date();
  const slots=[];for(const dd of[0,1])for(const h of[9,21]){const t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+dd,h,0,0);if(t>n&&slots.length<3)slots.push(t);}
  const daily=d&&d.daily;const sun=daily&&daily.sunset?new Date(daily.sunset[0]):null;const m=moonInfo();
  const rows=slots.map(t=>{const a=oggiAt(d,t);return`<div class="orow"><div><b>${t.getDate()===n.getDate()?'Oggi':'Domani'} alle ${String(t.getHours()).padStart(2,'0')}:00</b><small>${a?esc(a.eff):'meteo non disponibile'}</small></div><span>${a?`${a.ic} ${a.t}°C`:'—'}</span></div>`;}).join('');
  openSheet('📅 Oggi',`<div class="obig"><div class="ocd big"><small>${MMs[n.getMonth()]}</small><b>${n.getDate()}</b><i>${GG[n.getDay()]}</i></div><div><b class="occ" data-clock>${n.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</b>
     <small>${GG[n.getDay()]} ${n.getDate()} ${MM[n.getMonth()]} ${n.getFullYear()}</small>${daily?`<small>${wIcon(daily.weather_code[0])} ${wName(daily.weather_code[0])} · ${Math.round(daily.temperature_2m_min[0])}–${Math.round(daily.temperature_2m_max[0])}°C · pioggia ${daily.precipitation_probability_max[0]||0}%</small>`:''}
     <small>${m.ic} ${m.n}${sun?` · tramonto ${sun.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`:''}</small></div></div>
    <h4 class="hh">🧟 Le prossime orde e il meteo</h4>${rows}
    <p class="muted" style="font-size:12px;margin:6px 0 0">Il meteo vero cambia l’assalto che vedi sul fronte. L’esito dell’orda del mondo dipende da livello, preparazione e aiuti.</p>
    <h4 class="hh">📅 Sincronizza con il calendario</h4>
    <div class="ocals"><button class="btn" data-oc="google">🗓️ Google Calendar · tutte le orde</button><button class="btn alt" data-oc="apple">🍎 Calendario iPhone · tutte le orde</button><button class="btn ghost" data-oc="next">➕ Solo la prossima orda (Google)</button></div>
    <p class="muted" style="font-size:12px;margin-top:6px">“Tutte le orde” ti abbona una volta: le orde delle 9:00 e delle 21:00 compaiono ogni giorno nel tuo calendario.</p>`,c=>{
    c.querySelectorAll('[data-oc]').forEach(b=>b.onclick=()=>{const k=b.dataset.oc;const feed='safehousezombie.netlify.app/orde.ics';
      if(k==='google')window.open('https://calendar.google.com/calendar/r?cid='+encodeURIComponent('webcal://'+feed),'_blank');
      else if(k==='apple')location.href='webcal://'+feed;
      else{const nx=oggiNext();const f=t=>t.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const end=new Date(nx.getTime()+15*60000);
        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('🧟 Orda del mondo – ZombieSafeHouse')}&dates=${f(nx)}/${f(end)}&details=${encodeURIComponent('Prepara le case 30 minuti prima, poi guarda l’assalto e riscatta i premi: https://safehousezombie.netlify.app/?go=orda')}`,'_blank');}});});}
/* il calendario vero nella casella "Premio del giorno" (l'emoji di Apple mostra sempre 17 luglio) */
function oggiTile(){try{document.querySelectorAll('.lpan button, .lpan .ltile, .lpan [data-luck]').forEach(t=>{if(!/Premio del giorno/.test(t.textContent)||t.querySelector('.ocd'))return;
  const n=new Date();const em=[...t.querySelectorAll('span,b,i,div')].find(x=>x.textContent.trim()==='📅');const tile=`<span class="ocd mini"><small>${MMs[n.getMonth()]}</small><b>${n.getDate()}</b></span>`;
  if(em)em.outerHTML=tile;else{const w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);let x;while((x=w.nextNode())){if(x.nodeValue.includes('📅')){x.nodeValue=x.nodeValue.replace('📅','');x.parentNode.insertAdjacentHTML('afterbegin',tile);break;}}}});}catch(e){}}
zEvery(()=>{if(S.tab==='home'||S.tab==='orda')oggiTile();},5000);
/* nel menu */
</script>
