<script>
/* =========================================================
   👤 I SUPERSTITI DAPPERTUTTO (richiesta di Alessandro 18/11, migrazione 034)
   - Ogni "@nome" scritto nell'app (bacheca, attacchi, alleanze, raduni, messaggi, schede) diventa toccabile
     (.nicklink): apre la scheda del superstite (playerSheet). Il nome si trova con world_find (ricerca già usata
     da Trova); "@tuonome" apre il tuo superstite.
   - La scheda del superstite mostra anche livello, grado, Combattente, case, alleanze, scorte (arrotondate),
     attacchi vinti/subiti/respinti (world_player_extra).
   - Notifiche: quelle che parlano di un superstite (rinforzi, regali, assalti, conquiste, aiuti…) portano
     alla sua scheda (url ?pl=<id>, aggiunto da zsh-push).
   ========================================================= */
const GIO={uid:{},busy:false};
/* ---------- la scheda con le informazioni in più ---------- */
function gioExtraHTML(x){const s=x.scorte||{};const A=x.alleanze||[];
  return`<div class="plinfo"><div class="plgrid"><div><b>${x.livello}</b><small>livello</small></div><div><b>🎖️ ${x.grado}</b><small>grado</small></div><div><b>🔪 ${x.combattente}/9</b><small>Combattente</small></div>
    <div><b>${x.casa_vera?'❤️ 1':'—'}</b><small>casa vera</small></div><div><b>🔑 ${x.case}</b><small>${x.case==1?'casa comprata':'case comprate'}${x.crollate?' · '+x.crollate+' crollate':''}</small></div>
    <div><b>⚔️ ${x.vinti}</b><small>attacchi vinti</small></div></div>
    <p class="plscorte">🎒 Scorte (circa): 🪵 ${s.legno??'?'} · 🥫 ${s.cibo??'?'} · ⛽ ${s.carb??'?'} · 🧱 ${s.mattoni??'?'}</p>
    <p class="plscorte">🛡️ Attacchi subiti: ${x.subiti} persi · ${x.respinti} respinti</p>
    ${A.length?`<p class="plscorte">🛡️ Alleanze: ${A.map(a=>`${esc(a.emblema||'🛡️')} ${esc(a.nome)} (${a.membri})`).join(' · ')}</p>`:'<p class="plscorte muted">Non è in nessuna alleanza.</p>'}</div>`;}
const _playerSheetGio=playerSheet;playerSheet=async function(uid){const r=await _playerSheetGio.apply(this,arguments);
  try{const{data,error}=await SB.rpc('world_player_extra',{p_user:uid});const c=document.querySelector('#sheet.open');
    if(!error&&data&&data.ok&&c&&!c.querySelector('.plinfo')){const h=c.querySelector('.plhead');if(h)h.insertAdjacentHTML('afterend',gioExtraHTML(data));}}catch(e){}return r;};
/* ---------- le notifiche che parlano di un superstite ---------- */
const _zGoGio=zGoUrl;zGoUrl=function(u){_zGoGio(u);try{const pl=new URL(u,location.href).searchParams.get('pl');if(pl)setTimeout(()=>{window.SHEET_BACK=null;playerSheet(pl);},1600);}catch(e){}};
/* ---------- ogni @nome toccabile ---------- */
const GIO_RX=/@([A-Za-z0-9À-ÿ_.\-]{2,30})/g;
const GIO_NO='input,textarea,button,a,select,script,style,svg,.nicklink,.plhead,.opdock,[contenteditable]';
function gioScan(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.indexOf('@')<0||!n.parentElement||n.parentElement.closest(GIO_NO)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const L=[];let n;while((n=w.nextNode()))L.push(n);
  L.slice(0,200).forEach(t=>{const v=t.nodeValue;GIO_RX.lastIndex=0;if(!GIO_RX.test(v))return;GIO_RX.lastIndex=0;const f=document.createDocumentFragment();let i=0,m;
    while((m=GIO_RX.exec(v))){const nick=m[1].replace(/[.\-]+$/,'');if(m.index>0&&/[A-Za-z0-9]/.test(v[m.index-1]))continue;
      f.appendChild(document.createTextNode(v.slice(i,m.index)));const s=document.createElement('span');s.className='nicklink';s.dataset.nick=nick;s.textContent='@'+nick;f.appendChild(s);i=m.index+1+nick.length;}
    if(!i)return;f.appendChild(document.createTextNode(v.slice(i)));t.parentNode.replaceChild(f,t);});}
zEvery(()=>{try{if(document.hidden||!S.user)return;gioScan(document.querySelector('#sheet.open'));gioScan(app);}catch(e){}},1500,'nomi-cliccabili');
async function gioApri(nick){const me=S.user&&S.user.nick;if(me&&nick.toLowerCase()===String(me).toLowerCase()){try{supSheet('io');}catch(e){}return;}
  let uid=GIO.uid[nick.toLowerCase()];
  if(!uid){try{const{data}=await SB.rpc('world_find',{p_q:nick});const x=(data||[]).find(r=>String(r.nick).toLowerCase()===nick.toLowerCase());if(x)uid=GIO.uid[nick.toLowerCase()]=x.user_id;}catch(e){}}
  if(!uid){toast('👤 @'+nick+': superstite non trovato');return;}window.SHEET_BACK=null;playerSheet(uid);}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.nicklink');if(!b)return;e.preventDefault();e.stopPropagation();gioApri(b.dataset.nick);},true);
</script>
