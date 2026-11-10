<script>
/* =========================================================
   PERCHÉ UN AMICO VEDE MENO COSE: controllo, versione nuova, browser di WhatsApp
   - "🩺 Controlla il mio gioco" (menu): versione, dove è aperta l'app, account, casa, tipo, livello,
     meteo, notifiche, alleati → per ogni ✗ cosa fare; "📤 Manda lo stato" per mandarlo su WhatsApp
   - avviso "versione nuova" se il telefono tiene in memoria una versione vecchia
   - avviso "sei nel browser di WhatsApp/Instagram/Facebook"
   ========================================================= */
function zWhere(){const ua=navigator.userAgent||'';const sa=window.navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
  if(sa)return'app';if(/FBAN|FBAV|Instagram|WhatsApp|Line\/|Telegram/i.test(ua))return'inapp';
  if(/iPhone|iPad/.test(ua)&&!/Safari\//.test(ua))return'inapp';return'browser';}
async function zLatest(){try{const r=await fetch('/sw.js?ts='+Date.now(),{cache:'no-store'});const t=await r.text();const m=t.match(/zsh-(\d{12})/);return m?m[1]:null;}catch(e){return null;}}
async function zUpdateNow(){try{toast('Aggiorno l’app…');}catch(e){}try{const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)));}catch(e){}
  try{const r=await navigator.serviceWorker.getRegistration();if(r)await r.update();}catch(e){}location.replace(location.pathname+'?v='+Date.now());}
function zBanner(id,html,onBind){if(document.getElementById(id))return;document.body.insertAdjacentHTML('beforeend',`<div id="${id}" class="zbanner">${html}<button class="zbx" aria-label="Chiudi">✕</button></div>`);
  const b=document.getElementById(id);b.querySelector('.zbx').onclick=()=>b.remove();if(onBind)onBind(b);}
async function zCheckVersion(){const L=await zLatest();if(!L||!/^\d{12}$/.test(String(APPV)))return;
  /* l'aggiornamento automatico (anche quando l'app torna dallo sfondo) lo fa autoUpdate in p20 (Fase 5d); qui solo l'avviso */
  if(+L>+APPV)zBanner('zbver',`🆕 <b>C’è una versione nuova</b> dell’app<button class="btn small" data-zup>Aggiorna</button>`,b=>b.querySelector('[data-zup]').onclick=zUpdateNow);}
setTimeout(zCheckVersion,4000);zEvery(()=>{if(document.visibilityState==='visible')zCheckVersion();},10*60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(zCheckVersion,800);});
setTimeout(()=>{try{if(zWhere()==='inapp'&&!sessionStorage.getItem('zsh_inapp'))
  zBanner('zbinapp',`⚠️ <b>Sei nel browser di un’altra app</b> (es. WhatsApp): qui l’app funziona a metà. Tocca <b>•••</b> o <b>⋮</b> → <b>Apri in Safari/Chrome</b>, poi aggiungila alla Home.`,b=>{sessionStorage.setItem('zsh_inapp','1');});}catch(e){}},2500);
/* ---- il controllo ---- */
async function zStatus(){const out=[];const add=(ok,t,how,act)=>out.push({ok,t,how,act});
  const L=await zLatest();add(!L||+L<=+APPV,`Versione app: ${typeof appVerTxt==='function'?appVerTxt():APPV}`,L&&+L>+APPV?'C’è una versione più nuova: tocca Aggiorna':'',L&&+L>+APPV?'upd':null);
  const w=zWhere();add(w==='app',w==='app'?'Aperta dall’icona sulla schermata Home':w==='inapp'?'Aperta dentro WhatsApp o un’altra app':'Aperta nel browser',w==='app'?'':w==='inapp'?'Apri il link con Safari (iPhone) o Chrome (Android)':'iPhone: Condividi → Aggiungi alla schermata Home; Android: ⋮ → Installa app');
  add(!!S.user,S.user?`Account: @${S.user.nick||''}`:'Non hai fatto l’accesso',S.user?'':'Menu ☰ → Accedi o crea l’account: senza account non c’è il mondo condiviso','login');
  add(!!S.result,S.result?'Valutazione della casa vera fatta':'Valutazione della casa vera da fare',S.result?'':'Fai la valutazione: serve per la casa disegnata e lo Scudo','val');
  let I=null;if(S.user){try{const{data}=await SB.rpc('world_house_info');I=data;}catch(e){}}
  const st=I&&I.status||(W&&W.m&&W.m.home&&W.m.home.status)||null;
  add(st==='home',st==='home'?'Casa nel mondo confermata':st==='pending'?'Casa in conferma':'Casa non ancora nel mondo',st==='home'?'':st==='pending'?'Riapri l’app domani per confermarla (serve contro i furbi)':'Dopo la valutazione, apri la Mappa: la casa si registra da sola');
  if(I)add(!!I.kind_set,I.kind_set?`Tipo di abitazione: ${(HK[I.kind]||['',''])[1]}${I.unit?' · '+I.unit:''}`:'Tipo di abitazione da scegliere',I.kind_set?'':'🏠 La mia casa → “Che tipo di casa è?”');
  const wl=(typeof w_lvl==='function')?null:null;let T=null;try{await thrLoad(true);T=(THR.L||[]).find(x=>x.home);}catch(e){}
  if(T){const sp=(T.specials||[]).map(x=>(ZSP[x.k]||{}).ic).join('');const nx=[[2,'🏃'],[3,'🪖📢'],[4,'⛏️'],[5,'💪'],[6,'👤'],[8,'👑']].find(([l])=>l>T.wl);
    add(true,`Livello del mondo ${T.wl}: zombie ${sp?'speciali '+sp:'solo vaganti'}`,nx?`Al livello ${nx[0]} arrivano anche ${nx[1]}`:'');
    add(T.temp!=null,T.temp!=null?`Meteo e terreno letti (${(EVN[T.ev]||EVN.calma)[1].toLowerCase()})`:'Meteo e terreno in arrivo',T.temp!=null?'':'Il server li legge entro 10–20 minuti dalla registrazione della casa');}
  const notif=('Notification' in window)&&Notification.permission==='granted';add(notif,notif?'Notifiche attive':'Notifiche spente',notif?'':(w==='app'?'Menu ☰ → Notifiche':'Prima metti l’app sulla schermata Home, poi attivale dal menu'));
  try{const n=(ALS&&ALS.L)?ALS.L.length:(await alsLoad(true)||[]).length;add(n>0,`Alleati: ${n}`,n?'':'Superstiti → 🤝 Alleati: cerca o invita qualcuno');}catch(e){}
  return out;}
async function zStatusSheet(){openSheet('🩺 Controlla il mio gioco','<p><span class="spin"></span> Controllo…</p>');const L=await zStatus();
  const txt='🩺 ZombieSafeHouse – stato\n'+L.map(x=>`${x.ok?'✅':'❌'} ${x.t}${x.how?' → '+x.how:''}`).join('\n');
  openSheet('🩺 Controlla il mio gioco',`<p class="muted" style="font-size:12.5px;margin-top:0">Se un amico vede meno cose di te, il motivo è quasi sempre qui sotto.</p>
    ${L.map(x=>`<div class="zst ${x.ok?'ok':'ko'}"><span>${x.ok?'✅':'❌'}</span><div><b>${esc(x.t)}</b>${x.how?`<small>${esc(x.how)}</small>`:''}</div>${x.ok?'':x.act==='upd'?'<button class="btn small" data-zsa="upd">Aggiorna</button>':x.act==='login'?'<button class="btn small" data-zsa="login">Accedi</button>':x.act==='val'?'<button class="btn small" data-zsa="val">Valuta</button>':''}</div>`).join('')}
    <button class="btn wide" data-zshare>📤 Manda lo stato (WhatsApp, messaggi…)</button>`,card=>{
    card.querySelectorAll('[data-zsa]').forEach(b=>b.onclick=()=>{const a=b.dataset.zsa;if(a==='upd')zUpdateNow();else if(a==='login'){closeSheet();try{loginSheet();}catch(e){zmOpen();}}else{closeSheet();S.step=1;go('valuta');}});
    card.querySelector('[data-zshare]').onclick=()=>{if(navigator.share)navigator.share({text:txt}).catch(()=>{});else{try{navigator.clipboard.writeText(txt);toast('Copiato: incollalo nel messaggio');}catch(e){}}};});}
/* nel menu, sopra la versione */
</script>
