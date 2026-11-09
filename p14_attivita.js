<script>
/* =========================================================
   MAPPA DELLE ATTIVITÀ INTERATTIVA + SCHEDA SPONSOR CHE VENDE
   - sponsor: contatti, indicazioni, codice sconto personale,
     richiesta di preventivo (contatto pagato), recensioni
   - attività non sponsor: scheda base + "Mettiti in evidenza"
   - servizi pubblici e community: schede informative
   ========================================================= */
const BIZ_DEMO=[['☕','Bar Centrale','Bar'],['🥖','Panificio del Borgo','Panificio'],['🍕','Pizzeria Da Gino','Ristorante'],['💈','Parrucchiere Anna','Parrucchiere'],['📰','Edicola Tabacchi','Edicola'],['🛒','Alimentari Rossi','Alimentari'],['🔩','Officina Bertoldi','Officina'],['💐','Fiori e Piante','Fiorista']];
function bizSpots(z){const r=rng((z.seed||7)+91);return BIZ_DEMO.map((b,i)=>({i,ic:b[0],name:b[1],cat:b[2],x:40+r()*320,y:70+r()*300,d:Math.round(120+r()*1600)}));}
function bizLayer(z){return`<g class="bizL">${bizSpots(z).map(b=>`<g data-biz="${b.i}" style="cursor:pointer" opacity=".95"><circle cx="${b.x}" cy="${b.y}" r="11" fill="#9aa4b0" stroke="#140f1f" stroke-width="2"/><text x="${b.x}" y="${b.y+4}" text-anchor="middle" font-size="11">${b.ic}</text></g>`).join('')}</g>`;}
const dist=d=>d<1000?d+' m':(d/1000).toFixed(1).replace('.',',')+' km';
const mapsLink=(name,z)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+((z&&z.address)||''))}`;
function bizSheet(b,z){const key='biz-'+(z.seed||7)+'-'+b.i;
  const nav=b.ll?`https://www.google.com/maps/dir/?api=1&destination=${b.ll[0]},${b.ll[1]}`:mapsLink(b.name,z);
  const tel=(b.tel||'').replace(/[^\d+]/g,'');const web=b.web&&/^https?:/.test(b.web)?b.web:(b.web?'https://'+b.web:'');
  openSheet(`${b.ic} ${esc(b.name)}`,`<p class="muted">${esc(b.cat)} · a ${dist(b.d)}${b.cand?' · <b style="color:#b8860b">📌 posto sponsor libero</b>':''}</p>
   <div class="row" style="gap:8px;align-items:center;margin:8px 0">${rvLine(key,5,4)}${rvBtn(key,b.name,5,4)}</div>
   <div class="splinks"><a class="btn small ghost" href="${nav}" target="_blank" rel="noopener">🧭 Indicazioni</a>${tel?`<a class="btn small ghost" href="tel:${tel}">📞 Chiama</a>`:''}${web?`<a class="btn small ghost" href="${esc(web)}" target="_blank" rel="noopener">🌐 Sito</a>`:''}</div>
   <div class="claim"><b>${b.cand?'Questa attività può diventare il presidio sponsor della zona':'È la tua attività?'}</b><p>${b.cand?'Bollino giallo sulla mappa, offerta con codice in cassa, preventivi dai clienti della zona, presidio nel gioco (+5% barricata a chi abita vicino) e statistiche.':'Mettiti in evidenza: bollino sulla mappa, offerte con codice, contatti diretti, presenza nel gioco e statistiche delle visite.'}</p><button class="btn wide" data-claim>${b.cand?'Diventa sponsor':'Mettiti in evidenza'}</button></div>`,
   card=>{card.querySelector('[data-claim]').onclick=()=>{closeSheet();S.motivo=b.cand?'sponsor':'negozio';S.motivoBiz=b.name;go('contatti');};});}
function poiSheet(r,z){const key='p-'+(z.address||'')+'-'+r.name;const ic=(RES_ICON[r.kind]||['📍'])[0];
  openSheet(`${ic} ${esc(r.name)}`,`<p class="muted">Servizio pubblico · a ${dist(r.dist)}</p><div class="row" style="gap:8px;align-items:center;margin:8px 0">${rvLine(key,6,4)}${rvBtn(key,r.name,6,4)}</div>
   <div class="splinks"><a class="btn small" href="${mapsLink(r.name,z)}" target="_blank" rel="noopener">🧭 Indicazioni</a></div>`);}
/* codice sconto personale */
function couponFor(k){S.coupons=S.coupons||{};let c=S.coupons[k];if(!c||c.exp<Date.now()){c={code:'ZSH-'+(SPONSORS[k].logo||'SP')+'-'+(1000+Math.floor(Math.random()*9000)),exp:Date.now()+7*864e5,used:false};S.coupons[k]=c;if(window.dbCoupon)dbCoupon(k,c);}return c;}
function couponHTML(k){const c=couponFor(k);const d=new Date(c.exp);
  return`<div class="coupon ${c.used?'used':''}"><small>Il tuo codice personale</small><b>${c.code}</b><span>${SP_OFF[k]||'Sconto per chi usa l’app'}</span><small>Valido fino al ${d.getDate()}/${d.getMonth()+1} · mostralo in cassa</small>
   ${c.used?'<em>✅ Codice usato: Crediti Casa Vera e Scudo aggiornati</em>':'<button class="btn small alt" data-cused>Ho usato il codice in negozio</button>'}</div>`;}
function useCoupon(k){const c=couponFor(k);if(c.used)return;c.used=true;S.couponUsed=true;
  if(typeof G!=='undefined'&&G.type){ccvInit();G.ccv.bal+=40;G.ccv.log.unshift({t:'Acquisto con codice da '+SPONSORS[k].name,c:40});toast('+40 Crediti Casa Vera nel gioco');}else{S.pend=(S.pend||[]).concat('coins');toast('Premio in attesa nel gioco');}sfx('coin');vibe();}
/* scheda sponsor completa */
sponsorSheet=function(k,z){const s=SPONSORS[k];if(window.dbEvent)dbEvent(k,'scheda');z=z||S.zone||{seed:7,address:''};const sp=sponsorSpots(z).find(x=>x.k===k);const L=SP_LINK[k]||{};
  openSheet(`⭐ ${esc(s.name)}`,`<p class="muted" style="margin-bottom:6px">${SP_CAT[k]||'Sponsor'}${sp?' · a '+dist(sp.d):''} · <b>partner verificato</b></p>
   <div class="row" style="gap:8px;align-items:center;margin-bottom:8px">${rvLine('sp-'+k,8,4.2)}${rvBtn('sp-'+k,s.name)}</div>
   <div class="spact">
     <button class="btn" data-sa="coupon">🎟️ Ottieni lo sconto</button>
     <button class="btn alt" data-sa="quote">📩 Chiedi un preventivo</button>
     ${L.tel?`<a class="btn ghost" href="tel:${L.tel}">📞 Chiama</a>`:`<button class="btn ghost" data-sa="tel">📞 Chiama</button>`}
     ${L.wa?`<a class="btn ghost" href="https://wa.me/${L.wa}" target="_blank" rel="noopener">💬 WhatsApp</a>`:`<button class="btn ghost" data-sa="wa">💬 WhatsApp</button>`}
     <a class="btn ghost" href="${mapsLink(s.name,z)}" target="_blank" rel="noopener">🧭 Indicazioni</a>
     ${L.web?`<a class="btn ghost" href="${L.web}" target="_blank" rel="noopener">🌐 Sito</a>`:''}${L.ig?`<a class="btn ghost" href="${L.ig}" target="_blank" rel="noopener">📷 Instagram</a>`:''}${L.fb?`<a class="btn ghost" href="${L.fb}" target="_blank" rel="noopener">📘 Facebook</a>`:''}
   </div>
   <div id="spBox"></div>
   <p style="font-weight:400;font-size:13px;margin-top:10px">Alleato del quartiere: lo trovi sulla mappa vera e come edificio nel gioco. Ogni acquisto con il codice alza il tuo <b>Scudo della casa vera</b>.</p>
   <button class="btn small ghost" data-tosp style="margin-top:8px">Tutti gli sponsor</button><p class="muted" style="font-size:11px;margin-top:6px">Contenuto sponsorizzato · contatti di esempio nell’anteprima.</p>`,
  card=>{const box=card.querySelector('#spBox');
    const showCoupon=()=>{box.innerHTML=couponHTML(k);const u=box.querySelector('[data-cused]');if(u)u.onclick=()=>{useCoupon(k);showCoupon();};};
    if(S.coupons&&S.coupons[k])showCoupon();
    card.querySelectorAll('[data-sa]').forEach(b=>b.onclick=()=>{const a=b.dataset.sa;vibe();
      if(a==='coupon'){showCoupon();box.scrollIntoView({behavior:'smooth',block:'center'});}
      else if(a==='quote'){box.innerHTML=`<div class="quote"><b>Richiesta a ${esc(s.name)}</b><input class="field" id="qN" placeholder="Nome"><input class="field" id="qT" placeholder="Telefono o email"><textarea class="field" id="qM" rows="3">${S.result?`Ho valutato la casa con ZombieSafeHouse (indice ${fmtI(S.result.idx)}). Vorrei un preventivo.`:'Vorrei un preventivo.'}</textarea><label class="row" style="gap:6px;font-size:12px;font-weight:400"><input type="checkbox" id="qOk"> Acconsento a essere ricontattato da questo sponsor</label><button class="btn wide" id="qGo">Invia la richiesta</button></div>`;
        box.querySelector('#qGo').onclick=()=>{if(!box.querySelector('#qN').value.trim()||!box.querySelector('#qT').value.trim()){toast('Scrivi nome e contatto');return;}if(!box.querySelector('#qOk').checked){toast('Serve il consenso per inoltrarla');return;}
          S.leads=(S.leads||0)+1;if(window.dbLead)dbLead(k,{name:box.querySelector('#qN').value.trim(),contact:box.querySelector('#qT').value.trim(),message:box.querySelector('#qM').value.trim()});box.innerHTML=`<div class="notice">✅ Richiesta inviata a ${esc(s.name)}. Ti ricontatterà a breve.</div>`;sfx('coin');};}
      else toast('Nella versione online: il contatto diretto dello sponsor');});
    card.querySelector('[data-tosp]').onclick=()=>{closeSheet();go('sponsor');};});};
/* acquisto con codice: vale anche per lo Scudo */
if(typeof scudoSteps==='function'){const _ss=scudoSteps;scudoSteps=function(){const s=_ss();if(S.couponUsed)s[4][2]=true;return s;};}
/* mappa illustrata interattiva (Mondo, quando la mappa vera non è disponibile) */
function fallbackMap(el,z){const info=document.createElement('div');info.className='mapinfo';info.innerHTML='<span class="muted">Tocca uno sponsor, un’attività, un servizio o un’area.</span>';
  const draw=()=>{const L=S.rmL||{spons:true,biz:true,pub:true,comm:false};let svg=mapScene(z,{poi:L.pub,users:false,heat:false,me:true,mode:'day',spons:L.spons,comm:L.comm});
    if(L.biz)svg=svg.replace(/<\/svg>\s*$/,bizLayer(z)+'</svg>');const m=el.querySelector('.fbm');m.innerHTML=svg;};
  el.insertAdjacentHTML('beforeend','<div class="fbm"></div>');el.appendChild(info);draw();{const w=el.closest('.mapwrap');const ri=w&&w.querySelector('.rm-info');if(ri)ri.remove();}
  el.onclick=e=>{const t=e.target;const sp=t.closest('[data-spn]'),bz=t.closest('[data-biz]'),po=t.closest('[data-poi]'),hx=t.closest('[data-hex]');
    if(sp){vibe();sponsorSheet(sp.dataset.spn,z);}else if(bz){vibe();bizSheet(bizSpots(z)[+bz.dataset.biz],z);}else if(po){vibe();poiSheet(z.resources[+po.dataset.poi],z);}else if(hx){info.innerHTML=hexInfo(z,+hx.dataset.hex);}};
  const box=el.closest('.mapwrap');if(box)box.querySelectorAll('[data-rml]').forEach(b=>b.onclick=()=>{S.rmL[b.dataset.rml]=!S.rmL[b.dataset.rml];b.classList.toggle('on');draw();});}
</script>
