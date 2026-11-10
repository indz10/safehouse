<script>
/* =========================================================
   VIA LE MONETE: tutti i premi sono in 🧱 Mattoni (accreditati dal server, tetto 300 al giorno)
   - giveMattoni(n, motivo): accredito; se non sei collegato resta in attesa e arriva al login
   - ogni moneta guadagnata altrove (missioni…) diventa Mattoni (5 monete = 1 Mattone)
   - le monete che avevi vengono convertite una volta sola (massimo 300 Mattoni)
   ========================================================= */
const MAT_Q='zsh_mat_pending';
async function giveMattoni(n,why){n=Math.max(0,Math.round(n||0));if(!n)return;
  if(n>60&&S.user){let tot=0;while(n>0){const c=Math.min(60,n);n-=c;try{const{data}=await SB.rpc('world_reward',{p_amount:c,p_reason:why||'premio'});if(data&&data.got>0)tot+=data.got;else break;}catch(e){break;}}if(tot){toast(`🧱 +${tot} Mattoni`);if(typeof wMine==='function')wMine(true);}return;}
  if(!S.user||typeof SB==='undefined'||!SB){try{const q=JSON.parse(localStorage.getItem(MAT_Q)||'[]');q.push([n,why]);localStorage.setItem(MAT_Q,JSON.stringify(q));}catch(e){}toast(`🧱 +${n} Mattoni: arriveranno quando accedi`);return;}
  try{const{data,error}=await SB.rpc('world_reward',{p_amount:n,p_reason:why||'premio'});if(error)throw error;
    if(data&&data.got>0){toast(`🧱 +${data.got} Mattoni`);if(typeof wMine==='function')wMine(true);}else if(data&&data.msg)toast(data.msg);}
  catch(e){try{const q=JSON.parse(localStorage.getItem(MAT_Q)||'[]');q.push([n,why]);localStorage.setItem(MAT_Q,JSON.stringify(q));}catch(x){}}}
async function matFlush(){if(!S.user)return;let q=[];try{q=JSON.parse(localStorage.getItem(MAT_Q)||'[]');localStorage.removeItem(MAT_Q);}catch(e){}for(const[n,w]of q)await giveMattoni(n,w);}
/* monete → Mattoni */
function coinSweep(){try{if(typeof G==='undefined'||!G)return;const k='zsh_coinbase';let base=+(localStorage.getItem(k)||NaN);
  if(isNaN(base)){/* prima volta: converto le monete che avevi */const old=Math.max(0,G.coins||0);localStorage.setItem(k,'0');G.coins=0;try{saveLocal();}catch(e){}if(old>=5)giveMattoni(Math.min(300,Math.floor(old/5)),'Monete convertite');return;}
  const c=G.coins||0;if(c>0){G.coins=0;try{saveLocal();}catch(e){}if(c>=5)giveMattoni(Math.floor(c/5),'Premi');}}catch(e){}}
setInterval(coinSweep,10000);
const _wMineMt=wMine;wMine=async function(){const r=await _wMineMt.apply(this,arguments);try{if(S.user&&!wMine.__fl){wMine.__fl=1;setTimeout(()=>{matFlush();coinSweep();},500);}}catch(e){}return r;};
/* testi: dove c'erano monete ora ci sono Mattoni */
function coinText(root){try{(root||app).querySelectorAll('.tmp, .lpan, .daily, #sheet.open .sheet-b').forEach(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;const L=[];while((n=w.nextNode()))if(/🪙/.test(n.nodeValue))L.push(n);
  L.forEach(n=>{n.nodeValue=n.nodeValue.replace(/🪙\s*(\d+)/g,(m,v)=>'🧱 '+Math.max(1,Math.floor(+v/5))).replace(/(\d+)\s*🪙/g,(m,v)=>Math.max(1,Math.floor(+v/5))+' 🧱').replace(/🪙/g,'🧱').replace(/\bmonete\b/g,'Mattoni');});});}catch(e){}}
/* i testi si sistemano quando si apre una scheda o si cambia pagina (non più ogni secondo) */
try{const _osCt=openSheet;openSheet=function(){const r=_osCt.apply(this,arguments);setTimeout(()=>coinText(),60);return r;};}catch(e){}
try{const _goCt=go;go=function(){const r=_goCt.apply(this,arguments);setTimeout(()=>coinText(),400);return r;};}catch(e){}
/* il portafoglio nel menu senza monete */
</script>
