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
     ${L.tel?`<a class="btn ghost" data-trk="clic_tel" href="tel:${esc(L.tel)}">📞 Chiama</a>`:`<button class="btn ghost" data-sa="tel">📞 Chiama</button>`}
     ${L.wa?`<a class="btn ghost" data-trk="clic_wa" href="https://wa.me/${L.wa}" target="_blank" rel="noopener">💬 WhatsApp</a>`:`<button class="btn ghost" data-sa="wa">💬 WhatsApp</button>`}
     <a class="btn ghost" data-trk="clic_mappa" href="${mapsLink(s.name,z)}" target="_blank" rel="noopener">🧭 Indicazioni</a>
     <a class="btn ghost" data-trk="clic_google" href="${esc(L.g||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.name+' '+(s.addr||''))))}" target="_blank" rel="noopener">🔎 Google</a>
     ${L.web?`<a class="btn ghost" data-trk="clic_web" href="${esc(L.web)}" target="_blank" rel="noopener">🌐 Sito</a>`:''}${L.ig?`<a class="btn ghost" data-trk="clic_social" href="${esc(L.ig)}" target="_blank" rel="noopener">📷 Instagram</a>`:''}${L.fb?`<a class="btn ghost" data-trk="clic_social" href="${esc(L.fb)}" target="_blank" rel="noopener">📘 Facebook</a>`:''}${L.tt?`<a class="btn ghost" data-trk="clic_social" href="${esc(L.tt)}" target="_blank" rel="noopener">🎵 TikTok</a>`:''}
   </div>
   ${s.orari||s.descr?`<p style="font-weight:400;font-size:13.5px;margin:8px 0 0">${s.descr?esc(s.descr)+'<br>':''}${s.orari?'🕑 '+esc(s.orari):''}</p>`:''}
   <div id="spBox"></div>
   <p style="font-weight:400;font-size:13px;margin-top:10px">Alleato del quartiere: lo trovi sulla mappa vera e come edificio nel gioco. Ogni acquisto con il codice alza il tuo <b>Scudo della casa vera</b>.</p>
   <button class="btn small ghost" data-tosp style="margin-top:8px">Tutti gli sponsor</button><p class="muted" style="font-size:11px;margin-top:6px">Contenuto sponsorizzato · contatti di esempio nell’anteprima.</p>`,
  card=>{const box=card.querySelector('#spBox');
    /* Fase 9a-1: ogni contatto toccato nell'app conta per lo sponsor (così sa che il cliente arriva da ZombieSafeHouse) */
    card.querySelectorAll('[data-trk]').forEach(a=>a.addEventListener('click',()=>{try{if(window.dbEvent)dbEvent(k,a.dataset.trk);}catch(e){}}));
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
/* ---- Fase 9a-1: un'attività si iscrive da sola come sponsor (poi INDZ approva dal pannello admin) ---- */
const SP_CATS=['Ferramenta','Fabbro e serrature','Porte e finestre','Impianti di sicurezza e allarmi','Elettricista','Edilizia e ristrutturazioni','Giardino e recinzioni','Negozio','Bar e ristorante','Altro'];
function sponsorJoin(b){b=b||{};
  if(!S.user){toast('Accedi o crea l’account: servirà anche per il pannello del tuo negozio');try{loginSheet();}catch(e){}return;}
  const ll=b.ll||null;const f=(id,lab,ph,v,t)=>`<label class="disp" style="font-size:15px;margin-top:8px;display:block">${lab}</label><input id="sj_${id}" class="field" ${t?`type="${t}"`:''} placeholder="${esc(ph||'')}" value="${esc(v||'')}">`;
  openSheet('⭐ Iscrivi la tua attività',`<p style="font-weight:400;margin-bottom:6px">La tua attività compare nell’app con il bollino giallo, la tua offerta e i tuoi contatti. INDZ controlla la richiesta e la attiva.</p>
    ${f('name','Nome dell’attività *','es. Ferramenta Rossi',b.name)}
    <label class="disp" style="font-size:15px;margin-top:8px;display:block">Categoria *</label><select id="sj_category" class="field">${SP_CATS.map(c=>`<option ${b.cat===c?'selected':''}>${c}</option>`).join('')}</select>
    ${f('address','Indirizzo','via, numero, paese',b.addr||'')}
    ${f('phone','Telefono','',b.tel||'','tel')}${f('whatsapp','WhatsApp','','','tel')}
    ${f('website','Sito web','https://…',b.web||'')}${f('google_url','Scheda Google Maps (link)','https://maps.app.goo.gl/…')}
    ${f('instagram','Instagram','https://instagram.com/…')}${f('facebook','Facebook','https://facebook.com/…')}${f('tiktok','TikTok','https://tiktok.com/@…')}
    ${f('orari','Orari','es. lun–sab 8:30–12:30, 15–19')}
    <label class="disp" style="font-size:15px;margin-top:8px;display:block">Descrizione</label><textarea id="sj_descrizione" class="field" rows="3" placeholder="Cosa fai e perché sceglierti"></textarea>
    ${f('offer','La tua offerta per chi usa l’app','es. 10% di sconto su serrature e luci')}
    <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-weight:400;font-size:13.5px"><input type="checkbox" id="sj_ok" style="width:22px;height:22px;flex:none"> Sono il titolare dell’attività o sono autorizzato a iscriverla.</label>
    <button class="btn wide" data-sjok style="margin-top:10px">Invia la richiesta</button>
    <p class="muted" style="font-size:12px;margin-top:6px">Ogni contatto dei clienti dall’app (telefono, sito, social, Google, codici sconto, preventivi) viene contato nel tuo pannello: così vedi quanti clienti ti porta ZombieSafeHouse.</p>`,card=>{
    card.querySelector('[data-sjok]').onclick=async()=>{const v=id=>(card.querySelector('#sj_'+id)||{}).value||'';
      if(v('name').trim().length<2){toast('Scrivi il nome dell’attività');return;}if(!card.querySelector('#sj_ok').checked){toast('Conferma di essere il titolare o autorizzato');return;}
      const url=x=>{x=x.trim();return x&&!/^https?:\/\//i.test(x)?'https://'+x:x;};
      const p={name:v('name').trim(),category:v('category'),address:v('address').trim(),phone:v('phone').trim(),whatsapp:v('whatsapp').trim(),website:url(v('website')),google_url:url(v('google_url')),
        instagram:url(v('instagram')),facebook:url(v('facebook')),tiktok:url(v('tiktok')),orari:v('orari').trim(),descrizione:v('descrizione').trim(),offer:v('offer').trim(),
        lat:ll?String(ll[0]):'',lon:ll?String(ll[1]):''};
      if(!p.lat&&S.geo){p.lat=String(S.geo.lat);p.lon=String(S.geo.lon);}
      const bt=card.querySelector('[data-sjok]');bt.disabled=true;
      try{const{data,error}=await SB.rpc('sponsor_request',{p});if(error)throw error;
        if(!data||!data.ok){toast((data&&data.msg)||'Non riuscito');bt.disabled=false;return;}
        openSheet('✅ Richiesta inviata',`<p style="font-weight:400">Grazie! INDZ controlla la richiesta e la attiva: poi la tua attività compare nell’app.</p>
          <p style="font-weight:400">Intanto puoi completare scheda e offerta nel <b>pannello del negozio</b>, con questo stesso account:</p>
          <a class="btn wide" href="negozio.html" target="_blank" rel="noopener">🏪 Apri il pannello del negozio</a>`);}
      catch(e){toast(e.message||'Non riuscito: riprova');bt.disabled=false;}};});}
</script>
