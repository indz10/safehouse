<script>
/* =========================================================
   SPONSOR DI ESEMPIO SULLA MAPPA (come prima)
   Finché nel database non ci sono sponsor veri con posizione,
   gli sponsor di esempio vengono appoggiati sui negozi veri più vicini
   alla casa (prima ferramenta, fabbri, elettricisti, serramentisti…).
   Il primo sponsor vero inserito dal pannello admin li sostituisce tutti.
   ========================================================= */
window.SP_DEMO_ON=false;
/* gli sponsor di esempio sono quelli presenti all'avvio, prima che arrivino quelli veri dal database */
const SP_DEMO_KEYS=Object.keys(SPONSORS||{});
function spRealCount(){return Object.entries(window.SP_GEO||{}).filter(([k,g])=>g&&g.lat!=null&&!g.demo&&SPONSORS[k]).length;}
function spDemoPlace(){try{if(spRealCount()>0){/* ci sono sponsor veri: via gli esempi */Object.keys(SP_GEO).forEach(k=>{if(SP_GEO[k]&&SP_GEO[k].demo)delete SP_GEO[k];});SP_DEMO_ON=false;return;}
  if(Object.keys(SPONSORS||{}).some(k=>!SP_DEMO_KEYS.includes(k)))return;/* sponsor veri caricati: niente esempi */
  const keys=SP_DEMO_KEYS.filter(k=>SPONSORS[k]);if(!keys.length)return;if(keys.every(k=>SP_GEO[k]&&SP_GEO[k].lat!=null))return;
  const R=S.zone&&S.zone.real;const m=S.zone&&RM&&RM.cache&&RM.cache[S.zone.address];if(!R)return;
  const els=(m&&m.els)||[];const prio=t=>{if(!t||!t.name)return 9;const s=t.shop||'',c=t.craft||'';
    if(['hardware','doityourself','locksmith'].includes(s)||['locksmith'].includes(c))return 0;
    if(['electrician','window_construction','glaziery','builder','carpenter','metal_construction'].includes(c)||['electrical','windows','doors','security','paint','trade'].includes(s))return 1;
    if(s)return 2;if(t.amenity&&['bank','pharmacy','fuel'].includes(t.amenity))return 3;return 9;};
  const C=els.filter(e=>e.tags&&prio(e.tags)<9).map(e=>{const g=e.geometry&&e.geometry.length?e.geometry.reduce((q,p)=>[q[0]+p.lat/e.geometry.length,q[1]+p.lon/e.geometry.length],[0,0]):[e.lat,e.lon];
      return{lat:g[0],lon:g[1],name:e.tags.name,p:prio(e.tags),d:trM(R.lat,R.lon,g[0],g[1])};}).filter(x=>x.lat!=null&&x.d<2500).sort((a,b)=>a.p-b.p||a.d-b.d);
  const used=new Set();keys.forEach((k,i)=>{if(SP_GEO[k]&&SP_GEO[k].lat!=null)return;let x=C.find(c=>!used.has(c.name));
    if(x){used.add(x.name);SP_GEO[k]={lat:x.lat,lon:x.lon,demo:true,place:x.name};}
    else{const a=(i+1)*2.1,r=260+i*140;const o=trOff(R.lat,R.lon,Math.cos(a)*r,Math.sin(a)*r);SP_GEO[k]={lat:o[0],lon:o[1],demo:true};}});
  SP_DEMO_ON=true;(window.__zlms||[]).forEach(lm=>{try{spDraw(lm);}catch(e){}});}catch(e){console.warn('sponsor esempio',e);}}
setInterval(spDemoPlace,8000);setTimeout(spDemoPlace,800);
/* alla prima apertura della mappa li piazzo subito */
const _liveMapSd=liveMap;liveMap=async function(el,addr,o){const lm=await _liveMapSd(el,addr,o);try{spDemoPlace();setTimeout(()=>{spDemoPlace();spDraw(lm);},1500);}catch(e){}return lm;};
/* il segnaposto "vecchio" piccolo non serve: c'è quello grande con l'offerta */
</script>
