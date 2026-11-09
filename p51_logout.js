<script>
/* =========================================================
   USCITA DALL'ACCOUNT CHE FUNZIONA
   Prima: si ricaricava la pagina senza aspettare la chiusura della sessione → si restava dentro.
   Ora: aspetta la chiusura (max 3 s), cancella dal telefono i dati di accesso, poi ricarica.
   ========================================================= */
async function zLogout(){try{toast('Esco dall’account…');}catch(e){}
  try{if(typeof pushCloud==='function')await Promise.race([pushCloud(),new Promise(r=>setTimeout(r,1500))]);}catch(e){}
  try{if(typeof SB!=='undefined'&&SB&&SB.auth)await Promise.race([SB.auth.signOut({scope:'local'}),new Promise(r=>setTimeout(r,3000))]);}catch(e){}
  try{Object.keys(localStorage).forEach(k=>{if(/^sb-.*-auth-token/.test(k)||/supabase\.auth/.test(k)||/^zsh_kit_|^zsh_rs_/.test(k))localStorage.removeItem(k);});}catch(e){}
  try{sessionStorage.clear();}catch(e){}
  try{S.user=null;S.pubOk=false;if(window.W)W.m=null;if(typeof saveLocal==='function')saveLocal();}catch(e){}
  location.replace(location.pathname+'?uscito='+Date.now());}
/* entrambi i pulsanti "Esci": menu ☰ e pagina profilo */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-zm="logout"],[data-io="logout"],#logout');if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(!confirm('Uscire dall’account?'))return;try{zmClose();}catch(x){}zLogout();},true);
/* dopo l'uscita: messaggio chiaro e indirizzo pulito */
(function(){try{if(/[?&]uscito=/.test(location.search)){history.replaceState(null,'',location.pathname);setTimeout(()=>{try{toast('👋 Sei uscito. Per rientrare: menu ☰ → Accedi');}catch(e){}},900);}}catch(e){}})();
</script>
