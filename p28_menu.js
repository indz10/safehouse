<script>
/* =========================================================
   BARRA IN ALTO + MENU A TENDINA (come nelle app moderne)
   logo · contatore · 🔔 novità · ☰ menu
   il menu raggiunge TUTTO: casa, gioco, community, aiuto, account
   ========================================================= */
function zmItems(){const u=S.user;const adm=!!window.__zmAdmin,shop=!!window.__zmShop;
  return[
   ['La mia casa',[['📷','Valuta o aggiorna la casa','valuta'],['📋','Piano d’azione e sponsor','home'],['📍','Correggi la posizione','pos'],['🚚','Ho cambiato casa','move']]],
   ['Gioco',[['☀️','Oggi: orda, premi, missioni','g:oggi'],['🌍','Il mio impero','g:impero'],['⚔️','Difendi tu (notti)','g:difendi'],['🎁','Premi e fortuna','g:oggi'],['💎','Bottega','io']]],
   ['Community',[['💬','Piazza (chat)','s:piazza'],['📰','Bacheca','s:bacheca'],['🤝','La mia squadra','s:squadra'],['🏆','Classifiche','s:classifiche'],['📨','Invita amici e vicini','invite']]],
   ['Aiuto',[['🧭','Giro guidato','tour'],['📖','Come si gioca','rules'],['📻','Radio Operatore','radio'],['⭐','Sponsor e come diventarlo','sponsor'],['✉️','Chi siamo e contatti','contatti']]],
   ['Account',[...(u?[['👤','Il mio profilo','io']]:[]),['toggle','Visibile sulla mappa','vis',u?!!S.pubOk:null],['toggle','Suoni del gioco','snd',!(typeof G!=='undefined'&&G.mute)],['toggle','Musica','mus',!!(window.AUD&&AUD.on&&AUD.started)],
     ['🔒','Privacy','url:privacy.html'],['📄','Termini','url:termini.html'],...(adm?[['🛠️','Pannello admin INDZ','url:admin.html']]:[]),...(shop?[['🏪','Pannello del mio negozio','url:negozio.html']]:[]),
     ...(u?[['🚪','Esci dall’account','logout'],['🗑','Elimina il mio account','del']]:[])]]];}
function zmHTML(){const u=S.user,m=window.W&&W.m;const nk=u?(u.nick||(u.email||'?').split('@')[0]):'';
  const head=u?`<div class="zmhead"><span class="zmav">${esc((nk[0]||'?').toUpperCase())}</span><div><b>@${esc(nk)}</b><small>Livello mondo ${m?m.wlevel:'…'}</small>${typeof STATS!=='undefined'&&STATS.reg?`<span class="zmstats">👥 ${STATS.reg} superstiti · 🟢 ${STATS.on||0} online ora</span>`:''}<div class="zmwal"><span>🧱 ${m?wNum(m.mattoni):'…'}</span><span>💎 ${(typeof G!=='undefined'&&G.gems)||0}</span><span>🪙 ${(typeof G!=='undefined'&&G.coins)||0}</span></div></div></div>`
    :`<div class="zmhead"><span class="zmav">👤</span><div><b>Ospite</b><small>Accedi per salvare i progressi e giocare con gli altri</small><button class="btn small" data-zm="login" style="margin-top:6px">Accedi o registrati</button></div></div>`;
  const quick=[['🏠','Casa','home'],['🗺️','Mappa','mappa'],['🧟','Orda','orda'],['👥','Superstiti','social']].map(([i,l,k])=>`<button data-zm="${k}" class="${(NAV_ACT[S.tab]||S.tab)===k?'on':''}"><span>${i}</span>${l}</button>`).join('');
  const sec=zmItems().map(([t,L])=>`<div class="zmsec"><h5>${t}</h5>${L.map(it=>it[0]==='toggle'?(it[3]==null?'':`<button class="zmrow" data-zm="${it[2]}"><span>${it[2]==='vis'?'👥':it[2]==='snd'?'🔊':'🎵'}</span><b>${it[1]}</b><i class="zsw ${it[3]?'on':''}"><em></em></i></button>`)
      :`<button class="zmrow" data-zm="${it[2]}"><span>${it[0]}</span><b>${it[1]}</b><i>›</i></button>`).join('')}</div>`).join('');
  return`<div class="zmback" data-zmclose></div><aside class="zmpanel" role="dialog" aria-label="Menu"><div class="zmtop"><b class="disp">Menu</b><button class="zmx" data-zmclose aria-label="Chiudi">✕</button></div>${head}<div class="zmquick">${quick}</div>${sec}<p class="zmver">ZombieSafeHouse · un marchio INDZ · v${(window.ZV||'').toString().slice(-6)||'—'}</p></aside>`;}
function zmOpen(){zmClose(true);document.body.insertAdjacentHTML('beforeend',`<div id="zmenu">${zmHTML()}</div>`);requestAnimationFrame(()=>document.getElementById('zmenu').classList.add('open'));
  const M=document.getElementById('zmenu');M.querySelectorAll('[data-zmclose]').forEach(b=>b.onclick=()=>zmClose());
  M.querySelectorAll('[data-zm]').forEach(b=>b.onclick=()=>zmDo(b.dataset.zm,b));
  /* scorri a destra per chiudere */
  let x0=null;const P=M.querySelector('.zmpanel');P.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});P.addEventListener('touchend',e=>{if(x0!=null&&e.changedTouches[0].clientX-x0>70)zmClose();x0=null;},{passive:true});
  (async()=>{try{if(!S.user)return;if(typeof zIsAdmin==='function'&&await zIsAdmin()&&!window.__zmAdmin){window.__zmAdmin=true;zmRefresh();}
    if(!window.__zmShopChk){window.__zmShopChk=1;const{data}=await SB.from('sponsor_users').select('sponsor_id').eq('user_id',S.user.id).limit(1);if(data&&data.length){window.__zmShop=true;zmRefresh();}}}catch(e){}})();}
function zmRefresh(){const M=document.getElementById('zmenu');if(!M)return;const sc=M.querySelector('.zmpanel').scrollTop;M.innerHTML=zmHTML();M.classList.add('open');M.querySelector('.zmpanel').scrollTop=sc;
  M.querySelectorAll('[data-zmclose]').forEach(b=>b.onclick=()=>zmClose());M.querySelectorAll('[data-zm]').forEach(b=>b.onclick=()=>zmDo(b.dataset.zm,b));}
function zmClose(now){const M=document.getElementById('zmenu');if(!M)return;if(now){M.remove();return;}M.classList.remove('open');setTimeout(()=>M.remove(),220);}
function zmDo(k,b){try{
  if(k==='vis'){try{zTogglePublic();}catch(e){S.pubOk=!S.pubOk;}setTimeout(zmRefresh,150);return;}
  if(k==='snd'){if(typeof G!=='undefined')G.mute=!G.mute;try{saveLocal();}catch(e){}zmRefresh();return;}
  if(k==='mus'){try{if(AUD.on&&AUD.started)musicOff();else musicOn();}catch(e){}setTimeout(zmRefresh,120);return;}
  zmClose();
  if(['home','mappa','orda','social','io','radio','sponsor','contatti','valuta'].includes(k)){if(k==='valuta')S.step=S.result?3:0;go(k);return;}
  if(k.startsWith('g:')){G.ss=k.slice(2);go('orda');return;}
  if(k.startsWith('s:')){SOC.tab=k.slice(2);go('social');return;}
  if(k.startsWith('url:')){window.open(k.slice(4),'_blank');return;}
  if(k==='pos'){S.step=0;go('valuta');return;}
  if(k==='move'){try{moveSheet();}catch(e){go('valuta');}return;}
  if(k==='invite'){if(!S.user)return loginSheet();inviteSheet();return;}
  if(k==='tour'){go('orda');setTimeout(()=>{try{orTour(0);}catch(e){}},700);return;}
  if(k==='rules'){openRules(0);return;}
  if(k==='login'){loginSheet();return;}
  if(k==='logout'){if(confirm('Uscire dall’account?')){try{SB.auth.signOut();}catch(e){}S.user=null;location.reload();}return;}
  if(k==='del'){try{deleteSheet();}catch(e){location.href='elimina-account.html';}return;}
  }catch(e){toast('Non disponibile ora');}}
/* ---------------- barra in alto rinnovata ---------------- */
function zTopbar(){try{const T=document.getElementById('topbar');if(!T)return;
  if(!T.querySelector('.tbname')){const lg=T.querySelector('.tb-logo');if(lg)lg.insertAdjacentHTML('afterend','<b class="tbname">Zombie<span>SafeHouse</span></b>');}
  if(!document.getElementById('zbell')){T.insertAdjacentHTML('beforeend','<button id="zbell" aria-label="Novità">🔔</button><button id="zmenuBtn" aria-label="Apri il menu"><i></i><i></i><i></i></button>');
    document.getElementById('zmenuBtn').onclick=zmOpen;document.getElementById('zbell').onclick=()=>{SOC.tab='bacheca';go('social');};}
  const io=document.getElementById('ioBtn');if(io)io.remove();
  const n=(()=>{try{const seen=+(localStorage.getItem('zsh_soc_seen')||0);return(SOC.per||[]).filter(f=>new Date(f.created_at).getTime()>seen).length+(SOC.pend||[]).length;}catch(e){return 0;}})();
  const bb=document.getElementById('zbell');let d=bb.querySelector('.nbadge');if(n>0){if(!d){bb.insertAdjacentHTML('beforeend','<i class="nbadge"></i>');d=bb.querySelector('.nbadge');}d.textContent=n>9?'9+':n;}else if(d)d.remove();}catch(e){}}
ioBtn=function(){zTopbar();};
const _renderNavZm=renderNav;renderNav=function(){_renderNavZm();zTopbar();};
setInterval(zTopbar,3000);setTimeout(zTopbar,200);
/* musica: niente più pulsante volante, sta nel menu */
setTimeout(()=>{try{const f=document.querySelector('.musicfab');if(f)f.style.display='none';}catch(e){}},300);
/* tasto indietro del telefono / gesto: chiude prima il menu */
window.addEventListener('keydown',e=>{if(e.key==='Escape')zmClose();});
</script>
