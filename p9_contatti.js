<script>
/* =========================================================
   CHI SIAMO E CONTATTI
   COMPANY: dati societari da completare prima della pubblicazione
   ========================================================= */
const COMPANY={
  name:'ZombieSafeHouse S.r.l.', status:'in costituzione',
  area:'Provincia di Mantova', sede:'', piva:'', rea:'', pec:'',
  email:'info@zombiesafehouse.it', sponsor:'partner@zombiesafehouse.it', press:'stampa@zombiesafehouse.it', support:'aiuto@zombiesafehouse.it'
};
const TODO=v=>v?esc(v):'<span class="todo">da completare</span>';
const MOTIVI=[['info','Informazioni generali'],['sponsor','Diventare sponsor'],['agenzia','Sono un’agenzia immobiliare'],['negozio','Ho un negozio o un’attività in zona'],['stampa','Stampa e media'],['assistenza','Assistenza sull’app'],['altro','Altro']];
function contattiHero(){
  return`<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="La squadra di ZombieSafeHouse al lavoro di notte">${defs('ch')}
   <rect width="400" height="200" fill="url(#skych)"/><rect width="400" height="200" fill="url(#htlch)"/>
   <circle cx="330" cy="46" r="26" fill="#f7d64a" stroke="${INK}" stroke-width="3"/>
   <g stroke="${INK}" stroke-width="3"><rect x="40" y="70" width="190" height="110" fill="#4b3f7a"/><path d="M28 74 L135 20 L242 74Z" fill="#d7263d"/>
   <rect x="58" y="92" width="64" height="44" fill="#f7d64a"/><rect x="148" y="92" width="64" height="44" fill="#f7d64a"/><path d="M90 92V136M58 114H122M180 92V136M148 114H212"/>
   <rect x="112" y="146" width="44" height="34" fill="#8a5a34"/><rect x="104" y="150" width="60" height="10" fill="#fff"/></g>
   <text x="134" y="158" text-anchor="middle" font-family="Bangers,Impact" font-size="9" fill="${INK}">ZSH · QUARTIER GENERALE</text>
   ${operatore(300,150,.9)}
   <rect y="180" width="400" height="20" fill="${INK}"/>${zombie(380,196,.34,true)}</svg>`;
}
function renderContatti(){
  const mot=S.motivo||'info';
  app.innerHTML=`
   <div class="maphero">${contattiHero()}<div class="mh-t"><h2>Chi siamo</h2><div class="caption">La squadra dietro ZombieSafeHouse</div></div></div>
   <div class="page">
   <div class="panel">
     <h3>La casa sicura, raccontata con un fumetto</h3>
     <p style="font-weight:400;margin-top:8px">ZombieSafeHouse nasce in provincia di Mantova da un’idea semplice: parlare di sicurezza della casa senza fare paura, anzi facendo sorridere. Abbiamo preso la domanda «quanto è sicura casa mia?» e l’abbiamo trasformata in un gioco a fumetto horror: se la tua casa regge a un’orda di zombie, regge anche a un inverno senza corrente o a un ladro alla porta.</p>
     <p style="font-weight:400;margin-top:8px">Dietro ogni vignetta c’è un lavoro serio: un’intelligenza artificiale che guarda porte e finestre, mappe con i servizi veri di ogni zona, consigli pratici che funzionano nella vita reale.</p>
   </div>
   <h3 style="margin:16px 0 8px">Cosa facciamo</h3>
   <div class="pillars">
     <div class="panel"><span class="pi">📷</span><b>Valutiamo la casa</b><p>Fotocamera, mappa e poche domande: in cinque minuti sai dove la casa è forte e dove no.</p></div>
     <div class="panel"><span class="pi">🧟</span><b>La rendiamo un gioco</b><p>Simulazione, ondate e quartiere da difendere con gli amici: imparare a proteggersi diventa divertente.</p></div>
     <div class="panel"><span class="pi">🏘️</span><b>Raccontiamo le zone</b><p>Servizi, negozi, trasporti e prezzi: per chi ci vive e per chi cerca casa.</p></div>
   </div>
   <h3 style="margin:16px 0 8px">Come lavoriamo</h3>
   <div class="panel values">
     <div><b>🔒 Privacy prima di tutto</b><p>Le foto delle case non vengono salvate e le posizioni degli utenti non sono mai mostrate con precisione.</p></div>
     <div><b>✅ Solo consigli veri</b><p>Suggeriamo difese legali e sensate: porte, luci, scorte, piani di emergenza, rete di vicini.</p></div>
     <div><b>📢 Sponsor sempre dichiarati</b><p>Ogni prodotto o annuncio a pagamento è segnalato in modo chiaro. Chi usa l’app sa sempre cosa sta guardando.</p></div>
     <div><b>⚖️ Dati onesti sulle zone</b><p>Misuriamo servizi e qualità della vita, non etichettiamo i quartieri e chi ci abita.</p></div>
   </div>
   <div class="panel night">
     <h3 style="color:var(--moon)">Lavora con noi: sponsor, agenzie, negozi</h3>
     <p style="font-weight:400;color:#e5def5;margin:6px 0 10px">Le persone aprono ZombieSafeHouse quando pensano alla loro casa e al loro quartiere. È il momento giusto per incontrare chi vende sicurezza, chi offre servizi in zona e chi aiuta a trovare casa.</p>
     <div class="b2b">
       <div><b>Aziende di sicurezza e assicurazioni</b><small>Prodotti nel gioco, consigli dell’IA, contatti di chi vuole migliorare davvero la casa</small></div>
       <div><b>Agenzie immobiliari</b><small>Annunci in evidenza e vetrina nelle zone che vi interessano</small></div>
       <div><b>Negozi e attività locali</b><small>Presenza sulla mappa del quartiere e negli edifici del gioco</small></div>
     </div>
     <button class="btn alt small" style="margin-top:10px" data-mot="sponsor">Scrivici per una proposta</button>
   </div>
   <h3 style="margin:16px 0 8px" id="formTop">Scrivici</h3>
   <div class="panel" id="cform">
     <label class="fl" for="fN">Nome e cognome</label><input class="field" id="fN" autocomplete="name">
     <label class="fl" for="fE">Email</label><input class="field" id="fE" type="email" autocomplete="email" inputmode="email">
     <div class="row" style="gap:8px"><div style="flex:1"><label class="fl" for="fT">Telefono <small>(facoltativo)</small></label><input class="field" id="fT" type="tel" autocomplete="tel"></div>
       <div style="flex:1"><label class="fl" for="fA">Azienda <small>(facoltativo)</small></label><input class="field" id="fA" autocomplete="organization"></div></div>
     <label class="fl" for="fM">Motivo</label><select class="field" id="fM">${MOTIVI.map(([k,l])=>`<option value="${k}" ${k===mot?'selected':''}>${l}</option>`).join('')}</select>
     <label class="fl" for="fX">Messaggio</label><textarea class="field" id="fX" rows="5" placeholder="${mot==='sponsor'?'Raccontaci la tua azienda e cosa ti interessa':mot==='agenzia'?'In quali zone lavorate e quanti immobili gestite?':'Come possiamo aiutarti?'}"></textarea>
     <label class="ck"><input type="checkbox" id="fP"> Ho letto l’informativa privacy e acconsento al trattamento dei miei dati per ricevere una risposta.</label>
     <label class="ck"><input type="checkbox" id="fN2"> Voglio ricevere novità sull’app (facoltativo).</label>
     <p id="fErr" class="ferr" role="alert"></p>
     <button class="btn wide" id="fSend">Invia il messaggio</button>
     <p class="muted" style="font-size:12px;margin-top:8px">Rispondiamo entro due giorni lavorativi. Anteprima: il modulo non invia ancora dati.</p>
   </div>
   <h3 style="margin:16px 0 8px">Contatti diretti</h3>
   <div class="panel">
     <div class="frow"><span style="font-size:20px;width:28px">✉️</span><div style="flex:1"><b>Informazioni</b><small> <a href="mailto:${COMPANY.email}">${COMPANY.email}</a></small></div></div>
     <div class="frow"><span style="font-size:20px;width:28px">🤝</span><div style="flex:1"><b>Sponsor e partner</b><small> <a href="mailto:${COMPANY.sponsor}">${COMPANY.sponsor}</a></small></div></div>
     <div class="frow"><span style="font-size:20px;width:28px">📰</span><div style="flex:1"><b>Stampa</b><small> <a href="mailto:${COMPANY.press}">${COMPANY.press}</a></small></div></div>
     <div class="frow"><span style="font-size:20px;width:28px">🛟</span><div style="flex:1"><b>Assistenza app</b><small> <a href="mailto:${COMPANY.support}">${COMPANY.support}</a></small></div></div>
   </div>
   <h3 style="margin:16px 0 8px">Dati societari</h3>
   <div class="panel company">
     <div><span>Ragione sociale</span><b>${esc(COMPANY.name)}${COMPANY.status?` <small>(${esc(COMPANY.status)})</small>`:''}</b></div>
     <div><span>Sede legale</span><b>${TODO(COMPANY.sede)}</b></div>
     <div><span>Partita IVA</span><b>${TODO(COMPANY.piva)}</b></div>
     <div><span>Iscrizione REA</span><b>${TODO(COMPANY.rea)}</b></div>
     <div><span>PEC</span><b>${TODO(COMPANY.pec)}</b></div>
     <div><span>Area</span><b>${esc(COMPANY.area)}</b></div>
   </div>
   <div class="row wrap" style="gap:8px;margin:12px 0 24px"><button class="btn ghost small" data-legal="privacy">Informativa privacy</button><button class="btn ghost small" data-legal="termini">Termini d’uso</button><button class="btn ghost small" data-legal="cookie">Cookie</button></div>
   </div>`;
  app.querySelectorAll('[data-mot]').forEach(b=>b.onclick=()=>{S.motivo=b.dataset.mot;renderContatti();setTimeout(()=>$('#formTop').scrollIntoView({behavior:'smooth'}),30);});
  app.querySelectorAll('[data-legal]').forEach(b=>b.onclick=()=>openSheet({privacy:'Informativa privacy',termini:'Termini d’uso',cookie:'Cookie'}[b.dataset.legal],
    `<p style="font-weight:400">Documento in preparazione con il consulente privacy: sarà pubblicato prima del lancio pubblico. Titolare del trattamento: ${esc(COMPANY.name)}.</p>${b.dataset.legal==='cookie'?'<p style="font-weight:400;margin-top:8px">L’app non usa cookie di profilazione.</p>':''}`));
  $('#fSend').onclick=()=>{const n=$('#fN').value.trim(),e=$('#fE').value.trim(),m=$('#fX').value.trim();const err=$('#fErr');
    if(!n){err.textContent='Scrivi il tuo nome.';$('#fN').focus();return;}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){err.textContent='Controlla l’email: sembra incompleta.';$('#fE').focus();return;}
    if(m.length<10){err.textContent='Scrivi un messaggio di almeno qualche parola.';$('#fX').focus();return;}
    if(!$('#fP').checked){err.textContent='Per risponderti serve il consenso al trattamento dei dati.';return;}
    const lab=MOTIVI.find(x=>x[0]===$('#fM').value)[1];
    $('#cform').innerHTML=`<div class="sfx" style="font-size:32px">MESSAGGIO RICEVUTO!</div><p style="margin-top:8px">Grazie ${esc(n.split(' ')[0])}. Ti rispondiamo a <b>${esc(e)}</b> entro due giorni lavorativi.</p><p class="muted" style="font-size:12px;margin-top:6px">Motivo: ${lab}. Anteprima: nessun dato è stato inviato.</p>`;vibe();};
}
</script>
