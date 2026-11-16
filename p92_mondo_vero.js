<script>
/* =========================================================
   🌍 IL MONDO VERO, SPIEGATO (migrazione 027, Fase 30 — richiesta di Alessandro 16/11)
   Tre modi di giocare col mondo vero, sempre gli stessi:
   1) 📍 DI PERSONA con la 📷 Lente (gratis): farmacie, supermercati, ferramenta, distributori, sponsor intorno a te
      danno un vantaggio (MV_VANT). A meno di 50 m: "🎁 Prendi" → world_posto_visita (niente energia, niente scorte).
      Zombie e casse veri (Fase 28); se abbatti uno zombie vicino alla casa di un altro superstite, lui riceve la
      notifica "ti ha protetto" (zm_aiuto) → così nascono le alleanze.
   2) 🎒 COL SUPERSTITE (da casa): la spedizione nello stesso posto costa scorte per il viaggio (🥫 2 + km, ⛽ oltre 3 km).
   3) 🤝 CON GLI ALLEATI: alleanze per zona (una casa, vera o comprata, entro 50 km da un membro; una sola alleanza per
      zona); un alleato fuori portata (anche in un altro continente) si aiuta con un 📦 pacco da lontano, che costa di più
      (world_aiuto_lontano): world_send_help lo propone da solo (lontano: true) e qui si apre mvLontano.
   Notifiche nuove: "lente" (zombie e casse vicino a casa → ?lente=1 apre la Lente), "zm_aiuto", "aiuto_lontano".
   mvSheet = la spiegazione in 3 carte (la prima volta che si entra nel Mondo, da 🎮 Gioca, dal menu ☰ e dal Capitano).
   ========================================================= */
const MV={vis:null,t:0};
const MV_VANT={cibo:['🥫','cibo'],legno:['🪵','legno'],carb:['⛽','carburante'],farmaco:['💊','🔋 +2 energia e 🥫'],misto:['📦','un po’ di tutto'],sponsor:['⭐','più ricco di tutto']};
const mvKind=x=>x.k==='sponsor'?'sponsor':(typeof supCatKind==='function'?supCatKind(x.cat):'misto');
const mvCostoSped=km=>({cibo:2+Math.ceil(km),carb:km>3?Math.ceil(km/3):0});
const mvBreve=k=>{const v=MV_VANT[k]||MV_VANT.misto;return k==='farmaco'?'🔋 🥫':k==='misto'?'🪵 🥫 ⛽':k==='sponsor'?'⭐ 🪵 🥫 ⛽':v[0];};
/* ---------- 📍 nella Lente: le etichette dei posti dicono cosa danno ---------- */
const _lnTargetsMv=lnTargets;lnTargets=async function(lat,lon){const T=await _lnTargetsMv.apply(this,arguments);
  try{const P=(LENTE.area&&LENTE.area.P)||[];T.forEach(x=>{
    if(x.k==='att'||x.k==='srv'){const p=P.find(q=>'o'+q.id===x.id);if(!p)return;const k=mvKind(p);x.t=`${x.t} · ${mvBreve(k)}`;x.act=()=>lnPoiCard(p);}
    else if(x.k==='sp'){const sk=x.id.slice(1);const g=(window.SP_GEO||{})[sk],sp=(typeof SPONSORS!=='undefined'&&SPONSORS[sk])||{};
      if(g){const p={id:'s'+sk,sk,ic:'⭐',name:String(sp.name||'Sponsor').slice(0,40),cat:'⭐ Sponsor'+(sp.cat||sp.category?' · '+(sp.cat||sp.category):''),lat:+g.lat,lon:+g.lon,k:'sponsor'};
        x.t=`${x.t} · ⭐`;x.k='att';x.act=()=>lnPoiCard(p);}}});}catch(e){}
  return T;};
const _lnPoiCardMv=lnPoiCard;lnPoiCard=function(x){_lnPoiCardMv.apply(this,arguments);try{mvPoiExtra(x);}catch(e){}};
function mvPoiExtra(x){const L=LENTE;const pan=L.root&&L.root.querySelector('.lnpan');if(!pan)return;const k=mvKind(x);const v=MV_VANT[k]||MV_VANT.misto;
  const d=L.pos?Math.round(trM(L.pos.lat,L.pos.lon,x.lat,x.lon)):null;const vicino=d!=null&&d<=50;
  let km=null;try{km=supKm(x);}catch(e){}const c=km!=null?mvCostoSped(km):null;
  const box=document.createElement('div');box.className='mvposto';
  box.innerHTML=`<b>${v[0]} Qui trovi: ${v[1]}</b>
    <div class="mvdue"><div class="${vicino?'on':''}"><span>📍 Di persona</span><small>${vicino?'Ci sei! Gratis':d!=null?`sei a ${d} m: avvicinati a 50 m`:'serve il GPS'}</small>
      <button class="btn small" data-mvvis ${vicino?'':'disabled'}>🎁 Prendi (gratis)</button></div>
    <div><span>🎒 Col superstite</span><small>${c?`costa 🥫 ${c.cibo}${c.carb?' ⛽ '+c.carb:''} + energia`:'serve una casa nel mondo'}</small>
      <button class="btn small ghost" data-mvsped ${c?'':'disabled'}>🎒 Mandalo</button></div></div>`;
  (pan.querySelector('.lnpb')||pan).appendChild(box);
  if(x.k==='sponsor'&&x.sk){const a=document.createElement('button');a.className='btn small ghost';a.textContent='⭐ Vedi lo sponsor';a.onclick=()=>{try{lnSheet(()=>sponsorSheet(x.sk,S.zone||{seed:7}));}catch(e){}};box.appendChild(a);}
  box.querySelector('[data-mvvis]').onclick=async e=>{e.currentTarget.disabled=true;await mvVisita(x,k);};
  box.querySelector('[data-mvsped]').onclick=async e=>{e.currentTarget.disabled=true;try{const{data,error}=await SB.rpc('world_sped_parti',{p_kind:k,p_nome:x.name,p_lat:x.lat,p_lon:x.lon});if(error)throw error;toast(data.msg);if(data.ok){RES.t=0;try{resLoad(true);supLoad(true);}catch(er){}}}catch(er){toast('Non riuscito: riprova');}};}
async function mvVisita(x,k){const p=LENTE.pos||S.geo;if(!p){toast('📍 Serve la posizione');return;}let r=null;
  try{const{data,error}=await SB.rpc('world_posto_visita',{p_kind:k,p_nome:x.name,p_lat:x.lat,p_lon:x.lon,p_mylat:p.lat,p_mylon:p.lon});if(error)throw error;r=data;}catch(e){toast('📍 I posti di persona arrivano dopo l’aggiornamento del server (blocco SQL 027)');return;}
  if(!r.ok){if(/già passato/.test(r.msg||'')){try{pvSegna(x);}catch(e){}}toast(r.msg);return;}try{pvSegna(x);}catch(e){}if(x.k==='sponsor'&&x.sk){try{dbEvent(x.sk,'scheda');}catch(e){}}
  RES.t=0;try{resLoad(true);supLoad(true);}catch(e){}try{sfx&&sfx('win');}catch(e){}
  toast(`🎁 ${x.name}: ${[r.legno?'🪵 +'+r.legno:'',r.cibo?'🥫 +'+r.cibo:'',r.carb?'⛽ +'+r.carb:'',r.energia?'🔋 +'+r.energia:'','⭐ +'+r.xp].filter(Boolean).join(' ')}${r.salito?' · 🎖️ grado '+r.grado+'!':''}`);
  const pan=LENTE.root&&LENTE.root.querySelector('.lnpan');if(pan)pan.remove();}
/* ---------- 📦 aiuti da lontano ---------- */
zEvery(()=>{try{if(typeof SB==='undefined'||!SB||SB.__mvw||!SB.rpc)return;const o=SB.rpc.bind(SB);
  SB.rpc=async function(n,a){const r=await o(n,a);try{if(n==='world_send_help'&&r&&r.data&&r.data.lontano)setTimeout(()=>mvLontano(r.data),400);}catch(e){}return r;};SB.__mvw=1;}catch(e){}},1000,'aiuti-lontano');
function mvLontano(d){const c=d.costo||{};const R=(typeof RES!=='undefined'&&RES.d)||{};const ok=(R.cibo==null||R.cibo>=c.cibo)&&(R.carb==null||R.carb>=c.carb);
  openSheet('📦 Aiuto da lontano',`<p style="font-weight:400">Il tuo alleato è a <b>${(+d.km||0).toLocaleString('it-IT')} km</b>: i rinforzi col tuo mezzo non arrivano fin lì.</p>
    <div class="mvpacco"><span>📦</span><div><b>Pacco da lontano</b><small>+${c.pts} alla sua difesa all’orda dopo almeno 3 ore · massimo 2 al giorno</small><small>Costa: 🥫 ${c.cibo} · ⛽ ${c.carb} · 🧱 ${c.mattoni}</small></div></div>
    <p class="muted" style="font-size:12.5px">💡 Se compri una casa a meno di 50 km da lui, aiutarlo costa come per un vicino e puoi entrare nella sua alleanza (se in quella zona non sei già in un’altra).</p>
    <button class="btn wide" data-mvpk ${ok?'':'disabled'}>${ok?'📦 Manda il pacco':'Scorte insufficienti'}</button>`,box=>{
    const b=box.querySelector('[data-mvpk]');if(b)b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_aiuto_lontano',{p_target:d.target});if(error)throw error;toast(data.msg);if(data.ok){closeSheet();RES.t=0;try{resLoad(true);}catch(e){}}else b.disabled=false;}catch(e){toast('Non riuscito');b.disabled=false;}};});}
/* ---------- 🌍 la spiegazione in 3 carte ---------- */
function mvSheet(){const H=(()=>{try{return myHouses();}catch(e){return[];}})();const fuori=H.filter(h=>!h.home).length;
  openSheet('🌍 Come funziona il mondo',`<p style="font-weight:400;margin-top:0">Il gioco è il <b>mondo vero</b> intorno a te. Ci sono tre modi di giocarci:</p>
    <div class="mvcard c1"><span>📍</span><div><b>1 · Esci di casa con la 📷 Lente (gratis)</b><small>Farmacie, supermercati, ferramenta, distributori e sponsor vicino a te danno vantaggi: a meno di 50 m tocchi <b>🎁 Prendi</b> e non consumi niente. Per strada trovi anche <b>zombie</b> e <b>📦 casse</b>. Se abbatti uno zombie vicino alla casa di un altro superstite, <b>a lui arriva la notifica che l’hai protetto</b>: è così che si trovano gli alleati.</small><button class="btn small" data-mvgo="lente">📷 Apri la Lente</button></div></div>
    <div class="mvcard c2"><span>🎒</span><div><b>2 · Manda il superstite (da casa)</b><small>Negli stessi posti puoi mandare il tuo superstite digitale senza muoverti, ma <b>consuma scorte</b> per il viaggio (🥫 e, se è lontano, ⛽) e un po’ di energia. Torna da solo e ti avvisa.</small><button class="btn small" data-mvgo="sped">🎒 Spedizioni</button></div></div>
    <div class="mvcard c3"><span>🤝</span><div><b>3 · Gioca con gli alleati, anche lontani</b><small>Le alleanze sono <b>per zona</b>: entri se hai una casa (vera o comprata) a meno di 50 km da un membro, e in ogni zona puoi stare in una sola alleanza. Esempio: compri casa a New York vicino a un amico → puoi entrare nella sua alleanza. Se lì non hai casa, lo aiuti da qui con un <b>📦 pacco da lontano</b>, che costa più scorte.${fuori?` Hai ${fuori} ${fuori===1?'casa comprata':'case comprate'}: ognuna ti apre la sua zona.`:''}</small><button class="btn small" data-mvgo="alz">🛡️ Le mie alleanze</button></div></div>
    <p class="muted" style="font-size:12.5px">Ti avvisiamo noi: quando vicino a casa ci sono zombie o casse arriva la notifica “📷 Apri la Lente”.</p>`,c=>{
    c.querySelectorAll('[data-mvgo]').forEach(b=>b.onclick=()=>{const k=b.dataset.mvgo;closeSheet();setTimeout(()=>{if(k==='lente')lenteOpen();else if(k==='sped')supSheet('sped');else if(k==='alz')alzMenu();},80);});});
  try{localStorage.setItem('zsh_mondo30','1');}catch(e){}}
/* la prima volta che si entra nel Mondo dopo l'aggiornamento */
zEvery(()=>{try{if(window.__noHello||document.hidden||!S.user||S.tab!=='mappa'||document.querySelector('#sheet.open')||document.getElementById('lente'))return;
  if(typeof sbOk==='function'&&!sbOk())return;if(localStorage.getItem('zsh_mondo30'))return;if(!localStorage.getItem('zsh_sup_intro'))return;mvSheet();}catch(e){}},4000,'mondo-spiega');
/* menu ☰ */
const _zmItemsMv=zmItems;zmItems=function(){const L=_zmItemsMv.apply(this,arguments);try{const g=L[0];if(g){const i=g[1].findIndex(x=>x[2]==='guida');g[1].splice(i<0?2:i,0,['❓','Come funziona il mondo','mondov']);}}catch(e){}return L;};
const _zmDoRunMv=zmDoRun;zmDoRun=function(k,b){if(k==='mondov'){mvSheet();return;}return _zmDoRunMv.apply(this,arguments);};
/* pulsanti nelle novità: 🤝 Ringrazia (scheda di chi ti ha protetto: messaggio o alleanza) e 📷 Apri la Lente */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-mvpl],[data-mvlente]');if(!b)return;e.stopPropagation();e.preventDefault();
  if(b.dataset.mvpl){window.SHEET_BACK=null;try{playerSheet(b.dataset.mvpl);}catch(er){}}else{try{closeSheet();}catch(er){}lenteOpen();}},true);
/* notifica "📷 Apri la Lente" */
const _zGoMv=zGoUrl;zGoUrl=function(u){_zGoMv(u);try{if(new URL(u,location.href).searchParams.get('lente'))setTimeout(()=>{try{lenteOpen();}catch(e){}},1500);}catch(e){}};
</script>
