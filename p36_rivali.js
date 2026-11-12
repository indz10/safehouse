<script>
/* =========================================================
   1) ATTIVITÀ VERE DELLA ZONA (20 km) al posto degli sponsor di esempio
      mostrate come "attività della zona" (non come sponsor, niente offerte inventate);
      l'admin le toglie con un tocco o le fa diventare sponsor dal pannello
   2) 😈 RIVALI: dispetti con gemme e Mattoni, con regole anti-bullismo
   ========================================================= */
/* ---- 1) attività della zona ---- */
spDemoPlace=function(){try{Object.keys(window.SP_GEO||{}).forEach(k=>{if(SP_GEO[k]&&SP_GEO[k].demo)delete SP_GEO[k];});}catch(e){}};
/* il vecchio piazzamento automatico non deve più rimetterli: svuoto l'elenco degli sponsor di esempio */
try{SP_DEMO_KEYS.length=0;}catch(e){}setTimeout(()=>{spDemoPlace();(window.__zlms||[]).forEach(lm=>{try{spDraw(lm);}catch(e){}});},100);
const ATT_CAT={locksmith:['🔑','Fabbro e chiavi'],hardware:['🔧','Ferramenta'],doityourself:['🔧','Fai da te'],security:['🛡️','Sicurezza'],windows:['🪟','Serramenti'],doors:['🚪','Porte'],
  electrician:['💡','Elettricista'],window_construction:['🪟','Serramentista'],glaziery:['🪟','Vetraio'],metal_construction:['🔩','Carpenteria metallica'],carpenter:['🪚','Falegname']};
window.ATT={L:[],k:'',busy:false};
async function attLoad(){const R=S.zone&&S.zone.real;if(!R||ATT.busy)return ATT.L;const k=R.lat.toFixed(2)+','+R.lon.toFixed(2);if(ATT.k===k&&ATT.L.length)return ATT.L;
  try{const c=JSON.parse(localStorage.getItem('zsh_att_'+k)||'null');if(c&&Date.now()-c.t<7*864e5){ATT.L=c.L;ATT.k=k;attDraw();return ATT.L;}}catch(e){}
  ATT.busy=true;try{const q=`[out:json][timeout:25];(nwr["shop"~"^(hardware|doityourself|locksmith|security|windows|doors)$"]["name"](around:20000,${R.lat},${R.lon});nwr["craft"~"^(locksmith|electrician|window_construction|glaziery|metal_construction|carpenter)$"]["name"](around:20000,${R.lat},${R.lon}););out center tags 120;`;
    const els=await trOverpass(q,25000,4);const seen=new Set();
    ATT.L=(els||[]).map(e=>{const t=e.tags||{};const typ=t.shop&&ATT_CAT[t.shop]?t.shop:t.craft;const la=e.lat!=null?e.lat:(e.center&&e.center.lat),lo=e.lon!=null?e.lon:(e.center&&e.center.lon);if(la==null||!ATT_CAT[typ])return null;
        return{id:e.type[0]+e.id,name:t.name,typ,lat:la,lon:lo,d:trM(R.lat,R.lon,la,lo),phone:t.phone||t['contact:phone']||'',web:t.website||t['contact:website']||'',hours:t.opening_hours||'',
          addr:[[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' '),t['addr:city']].filter(Boolean).join(', ')};})
      .filter(x=>x&&!seen.has(x.name+x.typ)&&seen.add(x.name+x.typ)).sort((a,b)=>a.d-b.d).slice(0,80);
    ATT.k=k;try{localStorage.setItem('zsh_att_'+k,JSON.stringify({t:Date.now(),L:ATT.L}));}catch(e){}}catch(e){}finally{ATT.busy=false;}attDraw();return ATT.L;}
const attVis=()=>ATT.L.filter(a=>!(window.ZHID||[]).includes(a.name)&&!Object.keys(SPONSORS||{}).some(k=>(SPONSORS[k].name||'').toLowerCase()===a.name.toLowerCase()));
function attDraw(){(window.__zlms||[]).forEach(lm=>{try{if(!lm||!lm.map)return;(lm._att||[]).forEach(x=>x.remove());lm._att=[];
  attVis().forEach(a=>{const c=ATT_CAT[a.typ];const el=elDiv('lm-att',`<div class="att"><b>${c[0]}</b><span>${esc(a.name.slice(0,20))}</span></div><i class="attp"></i>`);
    el.addEventListener('click',e=>{e.stopPropagation();attSheet(a);});lm._att.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([a.lon,a.lat]).addTo(lm.map));});}catch(e){}});}
async function attSheet(a){const c=ATT_CAT[a.typ];let adm=false;try{adm=typeof zIsAdmin==='function'&&await zIsAdmin();}catch(e){}
  openSheet(`${c[0]} ${a.name}`,`<div class="hshead"><div><b>${esc(a.name)}</b><small>${c[1]} · attività della zona · ${kmTxt(a.d/1000)}</small></div></div>
   ${a.addr?`<p style="font-weight:400;margin:8px 0 2px">📍 ${esc(a.addr)}</p>`:''}${a.hours?`<p style="font-weight:400;margin:2px 0">🕒 ${esc(a.hours)}</p>`:''}
   <p class="muted" style="font-size:12px">Dati da OpenStreetMap. Non è uno sponsor di ZombieSafeHouse.</p>
   <div class="placts">${a.phone?`<a class="btn" href="tel:${esc(a.phone.replace(/\s/g,''))}">📞 Chiama</a>`:''}${a.web?`<a class="btn ghost" href="${esc(a.web)}" target="_blank" rel="noopener">🌐 Sito</a>`:''}
    <a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lon}" target="_blank" rel="noopener">🧭 Portami lì</a>
    ${adm?`<button class="btn alt" data-at="spon">⭐ Fallo diventare sponsor (pannello admin)</button><button class="btn ghost" data-at="hide" style="color:#d7263d">🚫 Togli dalla mappa</button>`:'<button class="btn ghost small" data-at="mine">È il tuo negozio? Diventa sponsor</button>'}</div>`,card=>{
   card.querySelectorAll('[data-at]').forEach(b=>b.onclick=async()=>{const k=b.dataset.at;
     if(k==='spon'){window.open('admin.html','_blank');return;}if(k==='mine'){closeSheet();go('sponsor');return;}
     if(k==='hide'){if(!confirm('Togliere “'+a.name+'” dalla mappa per tutti? Puoi rimetterla dal pannello admin.'))return;await zHide(a.name,[a.lat,a.lon]);closeSheet();attDraw();toast('🚫 Tolta dalla mappa');}});});}
/* elenco "⭐": sponsor veri + attività della zona */
spList=function(lm){let c=null;try{c=lm&&lm.map&&lm.map.getCenter?lm.map.getCenter():null;}catch(e){}const o=c?{lat:c.lat,lon:c.lng}:(S.zone&&S.zone.real)||{lat:0,lon:0};
  const SPn=Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&g.lat!=null&&!g.demo&&SPONSORS[k]).map(([k,g])=>({k,g,d:trM(o.lat,o.lon,g.lat,g.lon)})).sort((a,b)=>a.d-b.d);
  const A=attVis().map(a=>({...a,d2:trM(o.lat,o.lon,a.lat,a.lon)})).sort((a,b)=>a.d2-b.d2);
  openSheet('⭐ Sponsor e attività',`<h4 class="hh" style="margin-top:0">⭐ Sponsor (${SPn.length})</h4>${SPn.length?SPn.map(x=>`<button class="strow" data-spk="${x.k}"><span class="splogo">${esc(SPONSORS[x.k].logo)}</span><div><b>${esc(SPONSORS[x.k].name)}</b><small>${dist(Math.round(x.d))}</small></div></button>`).join(''):'<p class="muted" style="font-size:13px">Ancora nessuno sponsor.</p>'}
    <h4 class="hh">🔧 Attività della zona (${A.length})</h4>${A.length?A.map((a,i)=>`<button class="strow" data-ati="${i}"><span class="splogo">${ATT_CAT[a.typ][0]}</span><div><b>${esc(a.name)}</b><small>${ATT_CAT[a.typ][1]} · ${dist(Math.round(a.d2))}</small></div></button>`).join(''):'<p class="muted" style="font-size:13px"><span class="spin"></span> Cerco le attività entro 20 km…</p>'}`,card=>{
    card.querySelectorAll('[data-spk]').forEach(b=>b.onclick=()=>{const k=b.dataset.spk,g=SP_GEO[k];closeSheet();try{lm.map.flyTo({center:[g.lon,g.lat],zoom:17});}catch(e){}setTimeout(()=>sponsorSheet(k,S.zone||{seed:7}),900);});
    card.querySelectorAll('[data-ati]').forEach(b=>b.onclick=()=>{const a=A[+b.dataset.ati];closeSheet();try{lm.map.flyTo({center:[a.lon,a.lat],zoom:17});}catch(e){}setTimeout(()=>attSheet(a),900);});});};
zEvery(()=>{try{const b=document.querySelector('.mfsp');if(!b)return;const n=Object.values(window.SP_GEO||{}).filter(g=>g&&g.lat!=null&&!g.demo).length;const t=n?`⭐ ${n} sponsor`:`🔧 ${attVis().length} attività`;if(b.textContent!==t)b.textContent=t;}catch(e){}},1500);
/* nella scheda casa: se non ci sono sponsor entro 50 km, le attività della zona */

/* ---- 2) 😈 RIVALI ---- */
const DISP=[['orda','🧟','Manda un’orda','più forte col tuo livello e il tuo mezzo, meno contro le sue barricate · solo entro 20 km · taglia di 35 🧱 e ⛽ 10 se la sua casa cade',30,'mat'],['nebbia','🌫️','Nebbia','−5 alla sua difesa',15,'gem'],['sabotaggio','🔨','Sabotaggio','annulla il suo “Prepara le case” (−15)',25,'gem']];
async function doDisp(uid,nick,k){const d=DISP.find(x=>x[0]===k);if(!d)return;
  if(d[5]==='gem'&&((typeof G!=='undefined'&&G.gems)||0)<d[4]){shopSheet(0);toast(`Servono 💎 ${d[4]} gemme`);return;}
  if(!confirm(`${d[1]} ${d[2]} a @${nick}? Costa ${d[5]==='gem'?'💎':'🧱'} ${d[4]}.`))return;
  try{const r=k==='orda'?await socRpc('world_send_attack',{p_target:uid}):await socRpc('world_send_curse',{p_target:uid,p_kind:k});
    if(r.ok&&d[5]==='gem'){G.gems-=d[4];try{saveLocal();}catch(e){}}toast((r.ok?d[1]+' ':'')+(r.msg||'Fatto'));if(typeof wMine==='function')wMine(true);}catch(e){toast(e.message||'Non riuscito');}}
SOC.riv=null;
async function rivLoad(){try{SOC.riv=await socRpc('world_rivals')||[];}catch(e){SOC.riv=[];SOC.err=e.message;}if(S.tab==='social'&&SOC.tab==='rivali')socPaint();}
/* scheda del giocatore: anche i dispetti */
/* bacheca: il dispetto ricevuto */
document.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-askh]');if(!b)return;b.disabled=true;try{const{data,error}=await SB.rpc('world_ask_help');if(error)throw error;toast('🆘 '+data.msg);}catch(x){toast(x.message||'Non riuscito');}});
</script>
