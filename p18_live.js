<script>
/* =========================================================
   DATI VERI: sponsor dal database, mappa vera in Valuta e
   nella simulazione del quartiere, codici e preventivi salvati
   ========================================================= */
window.SP_GEO={};
function waitSB(ms=12000){return new Promise(r=>{const t0=Date.now();(function ck(){if(typeof SB!=='undefined'&&SB)return r(SB);if(Date.now()-t0>ms)return r(null);setTimeout(ck,250);})();});}
const slugify=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
(async function loadSponsors(){const sb=await waitSB();if(!sb)return;
  try{const{data:sp,error}=await sb.from('sponsors').select('*').eq('active',true);if(error||!sp||!sp.length)return;
    const{data:of}=await sb.from('offers').select('*').eq('active',true);
    Object.keys(SPONSORS).forEach(k=>{delete SPONSORS[k];});
    /* Fase 9a-1: prima quelli in evidenza; quelli oscurati non arrivano (active=false) */
    sp.sort((a,b)=>(b.visibility==='evidenza')-(a.visibility==='evidenza'));
    sp.forEach(r=>{const k=r.slug||slugify(r.name);SPONSORS[k]={name:r.name,logo:r.logo_text||r.name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(),evid:r.visibility==='evidenza',orari:r.orari||'',descr:r.descrizione||'',addr:r.address||''};
      SP_CAT[k]=r.category;const o=(of||[]).find(x=>x.sponsor_id===r.id);SP_OFF[k]=o?o.title:'Offerta per chi usa l’app';
      SP_LINK[k]={web:r.website||'',ig:r.instagram||'',fb:r.facebook||'',tt:r.tiktok||'',g:r.google_url||'',tel:r.phone||'',wa:(r.whatsapp||'').replace(/\D/g,'')};
      SP_GEO[k]={lat:r.lat,lon:r.lon,id:r.id,offer:o?o.id:null};});
    if(typeof goBase==='function'&&S.tab)try{goBase(S.tab);}catch(e){}/* all'avvio, come prima: la navigazione di p4 (Fase 4f-1) */
  }catch(e){console.warn('sponsor',e);}})();
/* registrazioni nel database (contano per le statistiche dello sponsor) */
window.dbEvent=async(k,kind)=>{try{const g=SP_GEO[k];if(!g||!SB)return;await SB.from('sponsor_events').insert({sponsor_id:g.id,kind});}catch(e){}};
window.dbCoupon=async(k,c)=>{try{const g=SP_GEO[k];if(!g||!SB||!S.user||!S.user.id)return;await SB.from('coupons').insert({code:c.code,sponsor_id:g.id,offer_id:g.offer,user_id:S.user.id,expires_at:new Date(c.exp).toISOString()});dbEvent(k,'codice_creato');}catch(e){}};
window.dbLead=async(k,l)=>{try{const g=SP_GEO[k];if(!g||!SB||!S.user||!S.user.id)return;await SB.from('leads').insert({sponsor_id:g.id,user_id:S.user.id,name:l.name,contact:l.contact,message:l.message,consent:true,house_index:S.result?S.result.idx:null});dbEvent(k,'preventivo');}catch(e){}};
/* Valuta: la zona disegnata con le vie vere quando c'è la rete */
const _vZona=vZona;
vZona=function(){_vZona();if(!S.zone||!S.zone.address||!navigator.onLine)return;const own=document.getElementById('map-own');if(!own||document.getElementById('rmZ'))return;
  own.insertAdjacentHTML('beforebegin',`<div id="rmZwrap">${rmBox('rmZ')}<p class="muted" style="font-size:11.5px;margin:-6px 0 10px">🗺️ Le vie vere della tua zona (© OpenStreetMap): la prima volta può servire qualche secondo. Sotto, la mappa della community per aree.</p></div>`);
  rmMount(document.getElementById('rmZ'),S.zone.address).then(ok=>{const w=document.getElementById('rmZwrap');if(!ok){if(w)w.remove();return;}
    /* la mappa vera funziona: la mappa disegnata (doppione) si nasconde */
    const o=document.getElementById('map-own');if(o&&document.getElementById('rmZ').querySelector('.lmap')){o.hidden=true;const n=w&&w.querySelector('p.muted');if(n)n.textContent='🗺️ La tua zona vera (© OpenStreetMap): casa tua in rosso, 📌 posti sponsor, cerchi blu = servizi pubblici, grigi = altre attività. Tasto “Community” = livello delle aree.';
      const b=document.querySelector('[data-realmap]');if(b)b.closest('div').hidden=true;}});};
/* Simula → Il mio quartiere: le aree sopra la mappa vera */
const _rsq=renderSimQuart;
renderSimQuart=function(){S.qScale=null;_rsq();if(!S.zone||!S.zone.address||!navigator.onLine)return;const box=document.getElementById('qmap');if(!box)return;
  rmFetch(S.zone.address).then(m=>{if(!document.body.contains(box))return;let svg=rmSVG(m,{spons:true,pub:true,biz:false,comm:false});
    const cs=commCells(S.zone);const hex=cs.map((c,i)=>{const ok=c.n>=K_MIN;const col=c.avg<=4?'#3f9b5f':c.avg<=6?'#f7d64a':'#d7263d';
      return`<g data-hex="${i}" style="cursor:pointer"><path d="${hexPath(c.x*2,c.y*2.65-30,66)}" fill="${ok?col:'#cfc6e6'}" fill-opacity="${ok?.22:.08}" stroke="#140f1f" stroke-width="1.5" stroke-dasharray="${ok?'':'5 5'}"/>${ok?`<text x="${c.x*2}" y="${c.y*2.65-24}" text-anchor="middle" font-family="Bangers,Impact" font-size="18" fill="#140f1f" stroke="#fff" stroke-width="3" paint-order="stroke">${c.n}</text>`:''}</g>`;}).join('');
    svg=svg.replace(/(<\/svg>\s*)$/,`<g class="commL">${hex}</g>$1`);box.innerHTML=svg;S.qScale={sx:2,sy:2.65,oy:-30};
    const n=document.querySelector('.page p.muted');if(n)n.textContent='La tua zona vera, con le vie vere, divisa in aree della community. Solo dati aggregati, mai una casa singola.';}).catch(()=>{});};
const _qCells=qCells;qCells=function(){const cs=_qCells();if(!S.qScale)return cs;return cs.map(c=>({...c,x:c.x*S.qScale.sx,y:c.y*S.qScale.sy+(S.qScale.oy||0)}));};
</script>
