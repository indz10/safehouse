<script>
/* =========================================================
   📱 SCHERMATA SEMPLICE: 4 TASTI IN BASSO (Fase 27, richiesta di Alessandro 16/11: "semplicità parola d'ordine")
   Come nei giochi simili: in alto l'orda, al centro la mappa, sopra i tasti UNA carta "Adesso", in fondo 4 tasti grandi:
     🗺️ Mondo  (la mappa; toccato di nuovo: orda, presidi, alleati sulla mappa, sponsor, cerca, opzioni della mappa)
     🎮 Gioca  (Assedio, spedizioni, Lente e caccia, eventi vicini, premi di oggi, sfida del quartiere)
     🧑 Io     (il superstite con energia e grado, le mie case, scorte, Bottega, condividi, regole, menu completo)
     👥 Amici  (richieste, messaggi, alleanze, alleati, classifica e bacheca, invita)
   Tutte le funzioni restano: spariscono solo dallo schermo i pulsanti a lato, il tondo "Tu", la riga delle scorte,
   le linguette Mappa/Orda/Superstiti e il tasto Lente (body.semplice nasconde; i tasti li richiamano).
   Si accende per chi ha account e casa valutata (mwOk), come la schermata unica della Fase 15.
   ========================================================= */
const SB4={on:false};
const sbOk=()=>{try{return mwOk()&&document.body.classList.contains('nonav');}catch(e){return false;}};
function sbBadges(){const g=(typeof EVT!=='undefined'?evtAperti().filter(e=>!evtFatto(e)&&e.km!=null&&e.km<=e.raggio).length:0)+(typeof supReady==='function'?supReady():0);
  const io=(typeof SUP!=='undefined'&&SUP.d)?((SUP.d.punti||0)+(SUP.d.serie_oggi?0:1)):0;const am=(typeof REQ!=='undefined'?REQ.n:0)+(typeof MSG!=='undefined'?MSG.n:0);return{gioca:g,io,amici:am};}
function sbHTML(){const b=sbBadges();const on=k=>(k==='mondo'&&['mappa','orda'].includes(S.tab))||(k==='amici'&&S.tab==='social')?'on':'';
  const B=(k,ic,n)=>`<button data-sb="${k}" class="${on(k)}"><span>${ic}</span><b>${n}</b>${b[k]?`<i>${b[k]}</i>`:''}</button>`;
  return B('mondo','🗺️','Mondo')+B('gioca','🎮','Gioca')+B('io','🧑','Io')+B('amici','👥','Amici');}
function sbPaint(){let n=document.querySelector('.sbar');const ok=sbOk()&&!document.getElementById('lente')&&!document.getElementById('assedio');
  document.body.classList.toggle('semplice',ok);if(!ok){if(n)n.remove();return;}
  const h=sbHTML();if(!n){document.body.insertAdjacentHTML('beforeend',`<nav class="sbar">${h}</nav>`);n=document.querySelector('.sbar');n.addEventListener('click',e=>{const b=e.target.closest('[data-sb]');if(b)sbGo(b.dataset.sb);});}
  else if(n.dataset.h!==h){n.innerHTML=h;}n.dataset.h=h;}
const sbTile=(k,ic,t,s,badge)=>`<button class="sbtile" data-sbt="${k}"><span>${ic}</span><b>${t}</b>${s?`<small>${s}</small>`:''}${badge?`<i>${badge}</i>`:''}</button>`;
function sbSheet(title,intro,tiles,acts){openSheet(title,`${intro||''}<div class="sbtiles">${tiles.join('')}</div>`,c=>{c.querySelectorAll('[data-sbt]').forEach(b=>b.onclick=()=>{const f=acts[b.dataset.sbt];if(!f)return;window.SHEET_BACK=null;closeSheet();setTimeout(f,60);});});}
function sbGo(k){try{zmClose();}catch(e){}
  if(k==='mondo'){if(S.tab!=='mappa'){closeSheet();S.zv='mondo';go('mappa');return;}
    sbSheet('🗺️ Mondo','<p class="muted" style="font-size:13px;margin:0 0 8px">La mappa è il mondo vero: le tue case, quelle degli altri, gli eventi. Da qui anche:</p>',
      [sbTile('orda','🧟','La mia orda','quando arriva, come stanno le case, premi'),sbTile('pres','🚩','Presidi','posti da occupare entro 5 km'),sbTile('ally','🤝','Alleati sulla mappa','dove sono le loro case'),
       sbTile('spons','⭐','Sponsor','negozi e offerte qui intorno'),sbTile('cerca','🔎','Cerca un luogo',''),sbTile('altro','⋯','Opzioni della mappa','notte, 3D, torna a casa…')],
      {orda:()=>go('orda'),pres:()=>presList5(window.__mf),ally:()=>alPick(),spons:()=>spList(window.__mf),cerca:()=>cercaLuogo(),altro:()=>mfMore()});return;}
  if(k==='gioca'){const ev=typeof EVT!=='undefined'?evtAperti().filter(e=>e.km!=null&&e.km<=e.raggio):[];const r=typeof supReady==='function'?supReady():0;const ad=typeof ASS!=='undefined'&&ASS.d?ASS.d:null;
    sbSheet('🎮 Gioca','<p class="muted" style="font-size:13px;margin:0 0 8px">Scegli come giocare: tutto dà esperienza e scorte per il mondo.</p>',
      [sbTile('ass','🧟','Assedio',ad?`livello ${(ad.max_liv||0)+1} · ⭐ ${ad.tot_stelle||0}`:'difendi la casa livello dopo livello'),sbTile('lente','📷','Lente: zombie qui intorno',typeof ZM!=='undefined'&&ZM.L&&ZM.L.filter(z=>!z.preso&&z.k==='zombie').length?`${ZM.L.filter(z=>!z.preso&&z.k==='zombie').length} zombie vicino a te`:'cammina e cacciali nella strada vera'),sbTile('pedia','📖','Zombipedia','i 12 zombie da collezionare'),sbTile('dfa','🛡️','Difendi casa nella Lente','torrette vere intorno alla tua casa'),sbTile('boss','👹','Boss della settimana',typeof BOSS!=='undefined'&&BOSS.d&&BOSS.d.ok?(BOSS.d.caduto?'abbattuto! il prossimo lunedì':`${Math.round(BOSS.d.hp/Math.max(1,BOSS.d.hp0)*100)}% di vita · con gli alleati`):'battetelo insieme agli alleati'),
       sbTile('sped','🎒','Spedizioni',r?`${r} da raccogliere!`:'manda il superstite nei posti veri',r),sbTile('evt','🚨','Eventi qui vicino',ev.length?`${ev.length} attivi ora`:'nessuno adesso: arrivano ogni ora',ev.length),
       sbTile('premi','🎁','Premi di oggi','ruota, gratta e vinci, premio del giorno'),sbTile('sfida','🏆','Sfida del quartiere','classifica della settimana')],
      {ass:()=>assOpen(),lente:()=>lenteOpen(),pedia:()=>zmPedia(),dfa:()=>dfaGo(),boss:()=>bossSheet(),sped:()=>supSheet('sped'),evt:()=>{if(ev.length)evtSheet(ev[0].id);else toast('🚨 Nessun evento qui vicino adesso: ti arriva la notifica quando compare');},premi:()=>premiSheet(),sfida:()=>sfidaSheet()});return;}
  if(k==='io'){const d=(typeof SUP!=='undefined'&&SUP.d)||null;const rk=typeof supRank==='function'?supRank(d?d.grado:1):['','🧑','Superstite',''];
    const head=d?`<div class="sbme"><span>${rk[1]}</span><div><b>@${esc((S.user&&S.user.nick)||'tu')} · ${rk[2]} · grado ${d.grado}</b><small>🔋 Energia ${d.energia}/${d.energia_max}: ogni azione del superstite ne usa 1, si ricarica da sola</small><div class="sbbar"><span style="width:${Math.round(d.energia/Math.max(1,d.energia_max)*100)}%"></span></div></div></div>`:'';
    sbSheet('🧑 Io',head,[sbTile('sup','🎖️','Il mio superstite','grado, abilità, attrezzi, serie',d&&d.punti),sbTile('case','🏠','Le mie case','fortificazioni e % di tenere'),
       sbTile('scorte','🎒','Le mie scorte','🧱 🪵 🥫 ⛽ e a cosa servono'),sbTile('shop','🛒','Bottega','mezzi, energia, bombe, scudi, mercato'),sbTile('share','📣','Condividi','fatti conoscere sui social'),
       sbTile('regole','📚','Come si gioca','tutte le regole'),sbTile('menu','☰','Tutto il menu','impostazioni, notifiche, account')],
      {sup:()=>supSheet('io'),case:()=>casasSheet(),scorte:()=>trrScorteSheet(),shop:()=>shopSheet(0),share:()=>shareSheet(),regole:()=>openSheet('📚 Tutte le regole',rulesHTML()),menu:()=>zmOpen()});return;}
  if(k==='amici'){const nr=typeof REQ!=='undefined'?REQ.n:0,nm=typeof MSG!=='undefined'?MSG.n:0;
    sbSheet('👥 Amici','',[sbTile('rich','📬','Richieste',nr?`${nr} da accettare o rifiutare`:'alleanze, inviti, coinquilini',nr),sbTile('msg','💬','Messaggi',nm?`${nm} da leggere`:'chat con chi vuoi',nm),
       sbTile('alz','🛡️','Le mie alleanze','gruppi, voti, chat'),sbTile('ally','🤝','I miei alleati','rinforzi, scudi, regali'),sbTile('social','🏆','Superstiti e classifica','bacheca, piazza, classifiche'),sbTile('inv','📨','Invita un amico','e ricevi premi quando entra')],
      {rich:()=>msgHub('rich'),msg:()=>msgHub('conv'),alz:()=>alzMenu(),ally:()=>alPick(),social:()=>go('social'),inv:()=>inviteSheet()});return;}}
zEvery(()=>{if(!document.hidden)sbPaint();},1000,'quattro-tasti');
</script>
