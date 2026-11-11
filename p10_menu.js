<script>
/* =========================================================
   BARRA SUPERIORE, MENU, ACCESSO, SPONSOR, CONTATORE UTENTI
   ========================================================= */
Object.assign(SPONSORS.ferr,{cat:'Ferramenta e sicurezza',tier:'Alleato del quartiere',desc:'Serrature, grate, utensili e tutto per rinforzare porte e finestre.',offer:'−10% per i superstiti con il codice ZSH10',url:'https://www.example.com/ferramenta-volta',col:'#f7d64a'});
Object.assign(SPONSORS.sic,{cat:'Allarmi e porte blindate',tier:'Partner principale',desc:'Sistemi d’allarme, telecamere e porte blindate certificate. Sopralluogo gratuito.',offer:'Sopralluogo gratuito per chi completa la valutazione',url:'https://www.example.com/sicurcasa-mantova',col:'#d7263d'});
Object.assign(SPONSORS.sol,{cat:'Energia',tier:'Alleato del quartiere',desc:'Fotovoltaico e batterie: la casa resta accesa anche quando salta la rete.',offer:'Check-up energetico gratuito',url:'https://www.example.com/solarbox',col:'#2f7fb8'});
const STATS={reg:null,on:null};
function tickStats(){const e=document.getElementById('ucount');if(e)e.innerHTML=statHTML();}
function statHTML(){return`<span title="Utenti registrati">👥 ${STATS.reg==null?'…':STATS.reg.toLocaleString('it-IT')} <small>superstiti</small></span><span class="dotlive"></span><span title="Attivi negli ultimi 5 minuti">${STATS.on==null?'…':STATS.on} <small>online</small></span>`;}
zEvery(tickStats,6000);
function topbar(){
  if(document.getElementById('topbar'))return;
  document.body.insertAdjacentHTML('afterbegin',`<header id="topbar" class="topbar">
     <button class="tb-logo" data-gohome aria-label="Vai alla home"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSVG(64))}"><b>ZombieSafeHouse</b></button>
     <div class="ucount" id="ucount" aria-label="Utenti registrati e online">${statHTML()}</div>
   </header>`);
  document.querySelector('[data-gohome]').onclick=()=>go('home');
  /* il vecchio menu a tendina (pulsante nascosto dallo stile) è stato tolto nella Fase 4e: il menu è ☰ (p28) */
}
function tapOn(el,fn){if(!el)return;let last=0;const h=e=>{const now=Date.now();if(now-last<450)return;last=now;if(e.type==='touchend')e.preventDefault();fn(e);};
  el.addEventListener('touchend',h,{passive:false});el.addEventListener('click',h);}
function loginSheet(mode){
  mode=mode||'login';
  openSheet(mode==='login'?'Accedi':'Crea il tuo account',`
    <div class="seg big"><button class="${mode==='login'?'on':''}" data-lm="login">Accedi</button><button class="${mode==='reg'?'on':''}" data-lm="reg">Registrati</button></div>
    ${mode==='reg'?'<label class="fl" for="lN">Nickname (lo vedono gli altri)</label><input class="field" id="lN" autocomplete="nickname" placeholder="es. bunkerboy">':''}
    <label class="fl" for="lE">Email</label><input class="field" id="lE" type="email" autocomplete="email" inputmode="email">
    <label class="fl" for="lP">Password</label><input class="field" id="lP" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" placeholder="${mode==='reg'?'Almeno 8 caratteri':''}">
    ${mode==='reg'?'<label class="ck"><input type="checkbox" id="lC"> Ho almeno 14 anni e accetto termini e informativa privacy.</label>':'<button class="linkbtn" id="lForgot">Password dimenticata?</button>'}
    <p id="lErr" class="ferr" role="alert"></p>
    <button class="btn wide" id="lGo">${mode==='login'?'Entra':'Crea account'}</button>
    <div class="or">oppure</div>
    <button class="btn ghost wide" data-oauth="Google">Continua con Google</button>
    <button class="btn ghost wide" data-oauth="Apple" style="margin-top:8px">Continua con Apple</button>
    <p class="muted" style="font-size:12px;margin-top:10px">Anteprima: l’accesso è simulato. Nella versione online usa Supabase Auth.</p>`,
  card=>{card.querySelectorAll('[data-lm]').forEach(b=>b.onclick=()=>loginSheet(b.dataset.lm));
    const fg=card.querySelector('#lForgot');if(fg)fg.onclick=()=>toast('Ti abbiamo inviato il link per reimpostare la password (demo)');
    card.querySelectorAll('[data-oauth]').forEach(b=>b.onclick=()=>{S.user={nick:'superstite'+Math.floor(Math.random()*900+100),email:b.dataset.oauth.toLowerCase()+'@account'};closeSheet();toast(`Accesso con ${b.dataset.oauth} riuscito (demo)`);});
    card.querySelector('#lGo').onclick=()=>{const e=card.querySelector('#lE').value.trim(),p=card.querySelector('#lP').value,err=card.querySelector('#lErr');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){err.textContent='Controlla l’email.';return;}
      if(p.length<(mode==='reg'?8:1)){err.textContent=mode==='reg'?'La password deve avere almeno 8 caratteri.':'Scrivi la password.';return;}
      let nick=e.split('@')[0];if(mode==='reg'){nick=card.querySelector('#lN').value.trim();if(nick.length<3){err.textContent='Scegli un nickname di almeno 3 caratteri.';return;}if(!card.querySelector('#lC').checked){err.textContent='Serve accettare termini e informativa.';return;}STATS.reg++;}
      S.user={nick,email:e};closeSheet();toast(mode==='reg'?`Benvenuto, @${nick}!`:`Bentornato, @${nick}!`);};});
}
function renderSponsor(){
  /* Fase 9a-1: gli sponsor veri (prima quelli in evidenza) + iscrizione */
  const K=Object.keys(SPONSORS);
  app.innerHTML=`<div class="page">
    <h2>Sponsor e partner</h2><p class="muted" style="margin:6px 0 14px">Le attività che rendono più sicuri i nostri quartieri. Ogni sponsor è sempre segnalato come tale.</p>
    ${K.length?K.map(k=>{const s=SPONSORS[k];return`<button class="panel spcard ${s.evid?'evid':''}" data-spk="${esc(k)}" style="display:block;width:100%;text-align:left"><div class="row" style="gap:12px;align-items:flex-start"><div class="logo big" style="background:#f7d64a">${esc(s.logo||'')}</div>
        <div style="flex:1"><b class="disp" style="font-size:21px">${s.evid?'⭐ ':''}${esc(s.name)}</b><div class="tag">${esc(SP_CAT[k]||'Sponsor')}</div>
        ${SP_OFF[k]?`<div class="offer" style="margin-top:6px">🎁 ${esc(SP_OFF[k])}</div>`:''}<small class="muted" style="display:block;margin-top:4px">Sponsor · tocca per contatti e sconto</small></div></div></button>`;}).join('')
      :'<p class="muted">Ancora nessuno sponsor nella tua zona.</p>'}
    <div class="panel night" style="margin-top:16px"><h3 style="color:var(--moon)">Hai un’attività?</h3><p style="font-weight:400;color:#e5def5;margin:6px 0 10px">Compari sulla mappa con il bollino giallo, la tua offerta, i tuoi contatti e i tuoi social. Nel pannello del negozio vedi quanti clienti ti porta l’app.</p>
      <button class="btn alt small" data-sp2>⭐ Iscrivi la tua attività</button></div></div>`;
  app.querySelector('[data-sp2]').onclick=()=>sponsorJoin({});
  app.querySelectorAll('[data-spk]').forEach(b=>b.onclick=()=>{try{sponsorSheet(b.dataset.spk,S.zone);}catch(e){}});
}
</script>
