<script>
/* =========================================================
   APP VERA: login Supabase, salvataggio, posizione reale
   - senza chiave o senza rete l'app funziona in modalità anteprima
   ========================================================= */
CONFIG.SB_URL='https://wmweptdpfworispqjhto.supabase.co';
CONFIG.SB_KEY='sb_publishable_kaNxtTEWBzAdqGVAp_wLdA_XzOtNQFp';
let SB=null;const SAVE_KEY='zsh_v2_salvataggio';const SNAP={b:null,at:0};
function sbReady(){return!!SB;}
(function loadSB(){if(!CONFIG.SB_KEY||CONFIG.SB_KEY.indexOf('%%')===0)return;
  const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  s.onload=async()=>{try{SB=window.supabase.createClient(CONFIG.SB_URL,CONFIG.SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
      const{data}=await SB.auth.getSession();if(data&&data.session)await onLogin(data.session.user,false);
      SB.auth.onAuthStateChange((ev,ses)=>{if(ev==='SIGNED_IN'&&ses&&(!S.user||S.user.id!==ses.user.id))onLogin(ses.user,true);if(ev==='SIGNED_OUT'){S.user=null;}});
    }catch(e){console.warn('Supabase non disponibile',e);SB=null;}};
  s.onerror=()=>{SB=null;};document.head.appendChild(s);})();
/* ---------- salvataggio: cosa si salva ---------- */
function snapshot(){const s={zone:S.zone||null,answers:S.answers||null,result:S.result||null,game:S.game?{base:S.game.base||null,applied:[...(S.game.applied||[])]}:null,
   rmiss:S.rmiss||{},coupons:S.coupons||{},couponUsed:!!S.couponUsed,acc:S.acc||{},qtog:S.qtog||{},finali:S.finali||{},leads:S.leads||0,geo:S.geo||null,pubOk:S.pubOk,case:S.case||[]};
  let g=null;try{if(typeof G!=='undefined'&&G.type){g={};Object.keys(G).forEach(k=>{if(['run','sel','pickT','view','replay'].includes(k))return;g[k]=G[k];});}}catch(e){}
  const body=JSON.stringify({S:s,G:g});if(body!==SNAP.b){SNAP.b=body;SNAP.at=Date.now();}
  return{v:1,at:SNAP.at||Date.now(),S:s,G:g};}
/* quanto è "pieno" un salvataggio: serve per non sostituire dati veri con una partita vuota */
function saveWeight(d){if(!d||!d.S)return 0;const s=d.S;return(s.zone?4:0)+(s.result?3:0)+Object.keys(s.answers||{}).length/10+(d.G&&d.G.type?3:0)+((d.G&&d.G.level)||0)/10;}
function restore(d){if(!d||d.v!==1)return false;const s=d.S||{};
  ['zone','answers','result','rmiss','coupons','couponUsed','acc','qtog','finali','leads','geo','pubOk','case'].forEach(k=>{if(s[k]!=null)S[k]=s[k];});
  if(s.game){S.game=S.game||{};S.game.base=s.game.base;S.game.applied=new Set(s.game.applied||[]);}
  if(d.G&&typeof G!=='undefined'){Object.assign(G,d.G);G.run=null;G.view='hub';G.sel=null;}
  if(S.acc&&S.acc.big)document.body.classList.add('bigtxt');return true;}
function saveLocal(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));}catch(e){}}
function loadLocal(){try{const t=localStorage.getItem(SAVE_KEY);return t?JSON.parse(t):null;}catch(e){return null;}}
/* ---------- cloud ---------- */
let pushT=null;
async function pushCloud(){if(!SB||!S.user||!S.user.id)return;const d=snapshot();if(saveWeight(d)<1)return;if(SNAP.pushed&&d.at<=SNAP.pushed)return;
  try{const{data:c}=await SB.from('salvataggi').select('dati').eq('user_id',S.user.id).maybeSingle();
    /* se un altro dispositivo ha salvato dopo di me, prendo il suo invece di sovrascriverlo */
    if(c&&c.dati&&c.dati.at>d.at&&saveWeight(c.dati)>=1){applyCloud(c.dati);return;}
    const{error}=await SB.from('salvataggi').upsert({user_id:S.user.id,dati:d,updated_at:new Date().toISOString()});if(!error)SNAP.pushed=d.at;}catch(e){console.warn(e);}}
/* sincronizzazione continua tra iPhone, Mac, Safari e icona Home */
function canSwap(){try{return!(typeof G!=='undefined'&&G.view==='battle'&&S.tab==='orda')&&!document.querySelector('#sheet.open')&&!(document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));}catch(e){return true;}}
function applyCloud(d){if(!canSwap()){SNAP.waiting=d;return;}restore(d);snapshot();SNAP.at=d.at;SNAP.pushed=d.at;saveLocal();
  try{if(typeof trSetupVera==='function')trSetupVera();}catch(e){}try{go(S.tab||'home');}catch(e){}toast('🔄 Aggiornato con l’ultima partita');}
async function syncCloud(){if(!SB||!S.user||!S.user.id||document.hidden)return;
  if(SNAP.waiting&&canSwap()){const w=SNAP.waiting;SNAP.waiting=null;if(w.at>SNAP.at)applyCloud(w);}
  try{const{data}=await SB.from('salvataggi').select('dati').eq('user_id',S.user.id).maybeSingle();const c=data&&data.dati;
    const mine=snapshot();if(c&&c.at>mine.at&&saveWeight(c)>=1)applyCloud(c);else if(mine.at>(SNAP.pushed||0))pushCloud();}catch(e){}}
async function pullCloud(){if(!SB||!S.user||!S.user.id)return null;try{const{data}=await SB.from('salvataggi').select('dati,updated_at').eq('user_id',S.user.id).maybeSingle();return data?data.dati:null;}catch(e){return null;}}
async function onLogin(u,fresh){S.user={id:u.id,email:u.email,nick:(u.user_metadata&&u.user_metadata.nick)||u.email.split('@')[0]};
  const cloud=await pullCloud(),local=loadLocal();const wc=saveWeight(cloud),wl=saveWeight(local);
  const useCloud=cloud&&(!local||wl<1&&wc>=1||(wc>=1&&cloud.at>=local.at));
  if(useCloud){restore(cloud);snapshot();SNAP.at=cloud.at||SNAP.at;SNAP.pushed=SNAP.at;saveLocal();try{if(typeof trSetupVera==='function')trSetupVera();}catch(e){}if(fresh||wl<1)toast('Dati recuperati dal tuo account');try{go(S.tab||'home');}catch(e){}}
  else if(wl>=1)pushCloud();
  if(fresh)toast(`Ciao @${S.user.nick}! I tuoi progressi ora sono salvati.`);}
setInterval(()=>{saveLocal();const d=snapshot();if(S.user&&S.user.id&&d.at>(SNAP.pushed||0)){clearTimeout(SNAP.t);SNAP.t=setTimeout(pushCloud,3000);}},10000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){saveLocal();pushCloud();}else syncCloud();});
window.addEventListener('focus',()=>syncCloud());window.addEventListener('pagehide',()=>{saveLocal();pushCloud();});
setInterval(()=>{if(S.user&&S.user.id)syncCloud();},20000);
/* al primo avvio: riprende da dove eri rimasto */
(function(){const d=loadLocal();if(d){try{restore(d);snapshot();SNAP.at=d.at||SNAP.at;}catch(e){}}})();
/* ---------- login vero ---------- */
const TRAD=m=>/Invalid login/i.test(m)?'Email o password non corretti.':/already registered|already exists/i.test(m)?'Questa email è già registrata: prova ad accedere.':/at least|weak/i.test(m)?'La password è troppo corta.':/valid email|invalid email/i.test(m)?'Controlla l’email.':/confirm/i.test(m)?'Conferma l’email dal messaggio che ti abbiamo mandato, poi accedi.':/fetch|network/i.test(m)?'Connessione assente: riprova tra poco.':m;
const _loginSheet=loginSheet;
loginSheet=function(mode){_loginSheet(mode);if(!SB)return;
  const box=document.getElementById('lGo');if(!box)return;const card=box.closest('.sheet,.card,#sheet')||document;
  const note=[...card.querySelectorAll('p.muted')].find(p=>/simulato/.test(p.textContent));if(note)note.textContent='Accesso sicuro con il tuo account ZombieSafeHouse.';
  box.onclick=async()=>{const e=card.querySelector('#lE').value.trim(),p=card.querySelector('#lP').value,err=card.querySelector('#lErr');err.textContent='';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){err.textContent='Controlla l’email.';return;}
    const reg=!!card.querySelector('#lN');let nick=e.split('@')[0];
    if(reg){nick=card.querySelector('#lN').value.trim();if(nick.length<3){err.textContent='Scegli un nickname di almeno 3 caratteri.';return;}if(p.length<8){err.textContent='La password deve avere almeno 8 caratteri.';return;}if(!card.querySelector('#lC').checked){err.textContent='Serve accettare termini e informativa privacy.';return;}}
    else if(!p){err.textContent='Scrivi la password.';return;}
    box.disabled=true;box.textContent='Un momento…';
    try{const r=reg?await SB.auth.signUp({email:e,password:p,options:{data:{nick}}}):await SB.auth.signInWithPassword({email:e,password:p});
      if(r.error)throw r.error;
      if(reg&&!r.data.session){err.style.color='#3f9b5f';err.textContent='Account creato! Controlla la posta e conferma l’email, poi accedi.';box.disabled=false;box.textContent='Crea account';return;}
      closeSheet();await onLogin(r.data.user,true);}
    catch(x){err.textContent=TRAD(x.message||'Errore');box.disabled=false;box.textContent=reg?'Crea account':'Entra';}};
  const fg=card.querySelector('#lForgot');if(fg)fg.onclick=async()=>{const e=card.querySelector('#lE').value.trim();if(!e){card.querySelector('#lErr').textContent='Scrivi prima la tua email qui sopra.';return;}
    try{await SB.auth.resetPasswordForEmail(e,{redirectTo:location.origin});toast('Ti abbiamo mandato un’email per cambiare la password');}catch(x){toast(TRAD(x.message));}};
  card.querySelectorAll('[data-oauth]').forEach(b=>b.onclick=async()=>{try{const{error}=await SB.auth.signInWithOAuth({provider:b.dataset.oauth.toLowerCase(),options:{redirectTo:location.origin}});if(error)throw error;}catch(x){toast('Accesso con '+b.dataset.oauth+' non ancora attivo: usa email e password');}});};
/* uscita vera */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#logout');if(b&&SB){pushCloud().finally(()=>SB.auth.signOut());}},true);
/* posizione reale e aggiornamento automatico: vedi p20_territorio.js */
</script>
