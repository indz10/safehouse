<script>
/* =========================================================
   CLASSIFICA CON PUNTEGGIO SUPERSTITE (su 1000) + SCHEDA ZOMBIE ANCHE PER GLI ALLEATI
   ========================================================= */
const SC_V=[['dif','🛡️','Difesa',300,s=>`${s.held}/${s.orde} orde tenute dalla casa vera`,'Prepara le case prima di ogni orda e fortifica contro gli zombie in arrivo.'],
  ['forte','🧱','Fortezza',200,s=>`${s.fort} livelli di fortificazioni · ${s.lvup} potenziamenti`,'Compra fortificazioni e potenzia le case (pagina della casa).'],
  ['casa','🏠','Casa vera',150,s=>s.indice==null?'valutazione non fatta':`indice ${String(s.indice).replace('.',',')}/10 (più basso = più sicura)`,'Fai i lavori veri del piano d’azione e aggiorna la valutazione.'],
  ['squadra','🤝','Squadra',150,s=>`${s.helps} aiuti dati · ${s.alleati} alleati`,'Manda rinforzi e scudi agli alleati, fai nuove alleanze.'],
  ['costanza','📅','Costanza',100,s=>`${s.giorni}/${s.giorni_max} giorni giocati`,'Entra ogni giorno: premio del giorno, orde, missioni.'],
  ['crescita','📈','Crescita',100,s=>`🧱 ${wNum(s.mattoni)} guadagnati giocando`,'Riscatta le orde, completa le missioni, riscuoti gli affitti.']];
async function scLoad(uid){try{const{data,error}=await SB.rpc('world_score',{p_user:uid||null,p_period:SOC.rp||'settimana'});if(error)throw error;return data;}catch(e){return{err:e.message};}}
function scBars(s,mine){if(!s||s.err)return`<p class="muted" style="font-size:12.5px">Punteggio non disponibile${s&&s.err?' ('+esc(s.err)+')':''}. Esegui il file classifica.sql su Supabase.</p>`;
  const weakest=SC_V.map(v=>[v,s[v[0]]/v[3]]).sort((a,b)=>a[1]-b[1])[0][0];
  return SC_V.map(v=>{const val=s[v[0]]||0;const pc=Math.round(val/v[3]*100);return`<div class="scrow"><div class="sct"><b>${v[1]} ${v[2]}</b><span>${val}<small>/${v[3]}</small></span></div><div class="scbar"><i style="width:${pc}%"></i></div><small>${esc(v[4](s))}</small></div>`;}).join('')
   +(mine?`<p class="sctip">💡 Per salire di più: <b>${weakest[1]} ${weakest[2]}</b> — ${weakest[5]}</p>`:'');}
async function scSheet(uid,nick){openSheet(`🏅 ${nick?'@'+esc(nick):'Il tuo punteggio'}`,'<p><span class="spin"></span></p>');const s=await scLoad(uid);const me=!uid||(S.user&&uid===S.user.id);
  openSheet(`🏅 ${me?'Il tuo Punteggio Superstite':'@'+esc(nick)}`,`<div class="sctot"><b>${s&&!s.err?s.tot:'—'}</b><small>punti su 1000 · ${SOC.rp==='settimana'?'ultima settimana':'ultimi 30 giorni'}</small></div>${scBars(s,me)}
    <p class="muted" style="font-size:11.5px;margin-top:8px">Il punteggio incrocia difesa nelle orde, fortificazioni, sicurezza della casa vera, aiuti alla squadra, costanza e crescita. I Mattoni da soli non bastano.</p>`);}
function scDecorate(){try{if(S.tab!=='social'||SOC.tab!=='classifiche')return;const B=app.querySelector('#socBody');if(!B)return;
  B.querySelectorAll('[data-rp="sempre"]').forEach(b=>{if(b.textContent!=='30 giorni')b.textContent='30 giorni';});
  B.querySelectorAll('.srank').forEach(r=>{const b=r.querySelector(':scope > b');if(b&&/🧱/.test(b.textContent))b.textContent=b.textContent.replace('🧱','🏅');
    if(!r.dataset.sc){r.dataset.sc='1';r.style.cursor='pointer';r.addEventListener('click',e=>{if(e.target.closest('[data-pl],.snick'))return;const n=r.querySelector('.snick');const uid=n&&n.dataset.pl;scSheet(uid,(n&&n.textContent||'').replace('@',''));});}});
  B.querySelectorAll('p.muted').forEach(p=>{if(/Punti = Mattoni/.test(p.textContent))p.innerHTML='🏅 <b>Punteggio Superstite</b> su 1000: difesa nelle orde, fortificazioni, casa vera, squadra, costanza e crescita. Tocca un giocatore per vedere il dettaglio.';});
  if(!B.querySelector('.scme')){const seg=B.querySelector('.schips');if(seg){seg.insertAdjacentHTML('beforebegin','<div class="panel scme"><div class="row spread"><b class="disp" style="font-size:20px">🏅 Il tuo Punteggio Superstite</b><button class="btn small ghost" data-scme>Dettaglio</button></div><div class="scmeb"><p class="muted"><span class="spin"></span></p></div></div>');
    const me=B.querySelector('.scme');me.querySelector('[data-scme]').onclick=()=>scSheet(null);scLoad(null).then(s=>{const b=me.querySelector('.scmeb');if(!b)return;
      b.innerHTML=s&&!s.err?`<div class="scmini"><b>${s.tot}</b><small>/1000</small>${SC_V.map(v=>`<span title="${v[2]}">${v[1]} ${s[v[0]]}</span>`).join('')}</div>`:scBars(s,true);});}}}catch(e){console.warn(e);}}
/* ---- SCHEDA ZOMBIE PER LE CASE DEGLI ALLEATI ---- */
window.__zsCtx=null;
document.addEventListener('click',e=>{const row=e.target.closest&&e.target.closest('[data-azk]');if(!row||!window.__azT)return;const T=window.__azT[+row.dataset.azt];if(!T)return;
  const nick=((document.querySelector('#sheet.open h3')||{}).textContent||'').replace(/^🤝\s*@?/,'');window.__zsCtx={T,ally:true,uid:window.__azU,nick,label:(T.home?'casa vera':'una sua casa')+' di @'+nick};frZSheet(row.dataset.azk);},true);
</script>
