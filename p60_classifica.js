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
const _socPaintSc=socPaint;socPaint=function(){_socPaintSc();scDecorate();};
try{const _eqRankPaintSc=eqRankPaint;eqRankPaint=function(){_eqRankPaintSc();scDecorate();};}catch(e){}
/* ---- SCHEDA ZOMBIE PER LE CASE DEGLI ALLEATI ---- */
window.__zsCtx=null;
const _thrViewAz=thrView;thrView=function(T){const h=_thrViewAz(T);if(!window.__azT)return h;const i=window.__azT.push(T)-1;
  return h.replace(/<div class="thrw"><span>🧟 Vaganti/,`<div class="thrw azk" data-azk="walker" data-azt="${i}"><span>🧟 Vaganti`).replace(/<div class="thrw"><span>(\S+) ([^<]+)<small>difesa:/g,(m,ic,n)=>{const k=Object.keys(ZSP).find(x=>ZSP[x].n===n.trim());return k?`<div class="thrw azk" data-azk="${k}" data-azt="${i}"><span>${ic} ${n}<small>difesa:`:m;});};
const _allySheetAz=allySheet;allySheet=async function(uid){window.__azT=[];window.__azU=uid;const r=await _allySheetAz(uid);return r;};
document.addEventListener('click',e=>{const row=e.target.closest&&e.target.closest('[data-azk]');if(!row||!window.__azT)return;const T=window.__azT[+row.dataset.azt];if(!T)return;
  const nick=((document.querySelector('#sheet.open h3')||{}).textContent||'').replace(/^🤝\s*@?/,'');window.__zsCtx={T,ally:true,uid:window.__azU,nick,label:(T.home?'casa vera':'una sua casa')+' di @'+nick};frZSheet(row.dataset.azk);},true);
const _frZSheetAz=frZSheet;frZSheet=function(k){const ctx=window.__zsCtx;if(!ctx)return _frZSheetAz(k);window.__zsCtx=null;
  const sv=FR.dests;FR.dests=[{label:ctx.label,home:ctx.T.home,bid:ctx.T.bid}];const svT=window.thrOf;window.thrOf=()=>ctx.T;try{_frZSheetAz(k);}finally{FR.dests=sv;window.thrOf=svT;}
  try{const c=document.querySelector('#sheet.open .sheet-b');const z=c&&c.querySelector('.zsh');if(!z)return;
    z.querySelectorAll('[data-zfk]').forEach(b=>{b.disabled=true;b.classList.add('ro');const sm=b.querySelector('small');if(sm)sm.innerHTML=sm.innerHTML.replace(/ · 🧱 \d+/,'').replace(/🧱 \d+/,'da comprare');});
    const zs=ZSP[k]||{n:'Vaganti'};const best=[...z.querySelectorAll('[data-zfk]')].map(b=>b.dataset.zfk)[0];const PL={walker:'tanti Vaganti',runner:'i Corridori',casco:'gli zombie col casco',strillone:'gli Strilloni',scavatore:'gli Scavatori',brute:'i Bruti',ombra:'le Ombre',boss:'il Bruto della Sagra'};const tip=best&&ZDEF[best]?`Ti arrivano ${PL[k]||'gli zombie'}: metti ${ZDEF[best][0]} ${ZDEF[best][1]}!`:`Attento all’orda di stasera!`;
    z.insertAdjacentHTML('beforeend',`<small class="zshw">È la casa del tuo alleato: le fortificazioni le compra lui. Tu puoi aiutarlo così:</small><div class="alacts big"><button class="btn small" data-azh>🤝 Rinforzi +5</button><button class="btn small ghost" data-azs>🛡️ Scudo 💎20</button><button class="btn small ghost" data-azm>💬 Consigliagli</button></div>`);
    z.querySelector('[data-azh]').onclick=e=>alHelp(ctx.uid,e.target);z.querySelector('[data-azs]').onclick=()=>allyShield(ctx.uid,ctx.nick);
    z.querySelector('[data-azm]').onclick=async e=>{e.target.disabled=true;try{const{data,error}=await SB.rpc('world_dm_send',{p_to:ctx.uid,p_body:tip});if(error)throw error;toast(data.ok?'💬 Inviato: “'+tip+'”':data.msg);}catch(x){toast(x.message||'Non inviato');e.target.disabled=false;}};}catch(e){console.warn(e);}};
</script>
