<script>
/* =========================================================
   NOTTE AUTOMATICA SU TUTTE LE MAPPE, con il tramonto vero del posto
   (calcolo astronomico per data, latitudine e longitudine; notte da 20 min dopo il tramonto a 20 min prima dell'alba)
   Se tocchi 🌙/☀️ vale la tua scelta su quella mappa.
   ========================================================= */
function zSun(lat,lon,d){d=d||new Date();const rad=Math.PI/180;const y0=Date.UTC(d.getUTCFullYear(),0,0);const day=Math.floor((d.getTime()-y0)/864e5);const g=2*Math.PI/365*(day-1);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const c=Math.cos(90.833*rad)/(Math.cos(lat*rad)*Math.cos(dec))-Math.tan(lat*rad)*Math.tan(dec);if(c>1)return{polar:'notte'};if(c<-1)return{polar:'giorno'};
  const ha=Math.acos(c)/rad;return{rise:720-4*(lon+ha)-eq,set:720-4*(lon-ha)-eq};}
function zIsNight(lat,lon,d){try{d=d||new Date();if(lat==null){const H=typeof myHouses==='function'?myHouses():[];const h=H[0]||(S.geo&&{lat:S.geo.lat,lon:S.geo.lon});if(!h)return d.getHours()>=18||d.getHours()<7;lat=h.lat;lon=h.lon;}
  const s=zSun(lat,lon,d);if(s.polar)return s.polar==='notte';const m=d.getUTCHours()*60+d.getUTCMinutes();return m>s.set+20||m<s.rise-20;}catch(e){return d.getHours()>=18||d.getHours()<7;}}
/* all'apertura: ogni mappa parte col giorno o la notte veri (se chi la apre non ha già scelto) */
/* scelta manuale: se tocchi 🌙/☀️ quella mappa non cambia più da sola */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.lm-mode');if(b&&e.isTrusted){const box=b.closest('.lmap');if(box)box.dataset.manual='1';}},true);
/* con l'app aperta: al tramonto e all'alba le mappe cambiano da sole */
zEvery(()=>{try{if(document.hidden)return;const want=zIsNight();document.querySelectorAll('.lmap').forEach(box=>{if(box.dataset.manual)return;const now=box.classList.contains('night');if(now!==want){const b=box.querySelector('.lm-mode');if(b)b.click();}});}catch(e){}},60000);
</script>
