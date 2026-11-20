<script>
/* =========================================================
   💎 GEMME (Fase 51, migrazione 042): unica valuta premium, saldo deciso dal server.
   - GEM.d = world_gemme_info (saldo, regole w_gem_cfg, traguardi, movimenti). G.gems segue il saldo del server
     (le vecchie gemme del telefono si annotano una volta con world_gemme_legacy_segna, non diventano vere).
   - gemSheet: saldo, prossimo livello e traguardi, 💎 → risorse (anteprima: ricevi, costo, saldo dopo; conferma),
     pacchetti (pagamenti non ancora attivi; l'amministratore può fare acquisti di PROVA), movimenti.
   - gemCosto(fine) = come il server (1 💎 ogni min_per_gemma minuti, minimo 1); gemSubito(tipo,id,fine) chiede
     conferma e chiama world_completa_subito (il server ricontrolla il prezzo).
   ========================================================= */
const GEM={d:null,t:0};
async function gemLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return GEM.d;if(!force&&GEM.d&&Date.now()-GEM.t<30000)return GEM.d;GEM.t=Date.now();
  try{const{data,error}=await SB.rpc('world_gemme_info');if(!error&&data&&data.ok){
    const k='zsh_gemleg_'+S.user.id;try{if(!localStorage.getItem(k)){const v=+(G&&G.gems)||0;if(v>0)await SB.rpc('world_gemme_legacy_segna',{p_n:v});localStorage.setItem(k,'1');}}catch(e){}
    GEM.d=data;try{G.gems=data.gemme;}catch(e){}}}catch(e){}return GEM.d;}
function gemCosto(fine){const c=(GEM.d&&GEM.d.cfg)||{};const per=+c.min_per_gemma||6,mn=+c.subito_min||1;const m=Math.max(0,(new Date(fine)-Date.now())/60000);return Math.max(mn,Math.ceil(m/per));}
async function gemSubito(tipo,id,fine){await gemLoad();const costo=gemCosto(fine);const s=(GEM.d&&GEM.d.gemme)||0;
  if(s<costo){if(confirm(`Servono 💎 ${costo}, ne hai ${s}. Aprire il negozio delle gemme?`))gemSheet();return null;}
  if(!confirm(`Completare subito per 💎 ${costo}?\nTi resteranno 💎 ${s-costo}.\nIl risultato segue le regole normali.`))return null;
  let r=null;try{const{data,error}=await SB.rpc('world_completa_subito',{p_tipo:tipo,p_id:+id,p_costo_visto:costo});if(error)throw error;r=data;}catch(e){toast('Non riuscito: riprova');return null;}
  if(!r.ok&&r.costo&&r.costo>costo&&s>=r.costo&&confirm(`Il costo ora è 💎 ${r.costo}. Confermi?`)){try{const{data}=await SB.rpc('world_completa_subito',{p_tipo:tipo,p_id:+id,p_costo_visto:r.costo});r=data;}catch(e){}}
  toast(r.msg||'Fatto');GEM.t=0;gemLoad(true);return r;}
const GEM_R={cibo:['🥫','Cibo'],legno:['🪵','Legno'],carb:['⛽','Carburante'],mattoni:['🧱','Mattoni']};
async function gemSheet(sez){openSheet('💎 Gemme',`<div class="gembox"><p><span class="spin"></span></p></div>`,()=>{});const d=await gemLoad(true);const box=document.querySelector('#sheet.open .gembox');if(!box)return;
  if(!d){box.innerHTML='<p class="notice">Le gemme arrivano dopo l’aggiornamento del server (blocco SQL 042).</p>';return;}
  const c=d.cfg||{},cb=c.cambio||{};let ris=sez&&GEM_R[sez]?sez:'cibo',n=5;
  const T=(d.traguardi||[]);
  box.innerHTML=`<div class="gemsaldo"><b>💎 ${d.gemme}</b><small>Le gemme sono l’unica valuta del gioco che si può comprare. Le guadagni anche giocando: a ogni grado nuovo del superstite e ai traguardi.</small></div>
    <h4>🎖️ Prossime gemme dal gioco</h4><p class="muted" style="font-size:13px;margin:2px 0 6px">Grado ${d.grado} → ${d.grado+1}: +💎 ${d.prossimo_livello} (servono ${d.xp_prossimo} ⭐, ne hai ${d.xp})</p>
    <div class="gemtr">${T.map(t=>`<span class="${t.preso?'ok':''}">${t.preso?'✅':'🏁'} Grado ${t.liv}: 💎 ${t.gemme}</span>`).join('')}</div>
    <h4>🔄 Cambia gemme in risorse</h4>
    <div class="gemris">${Object.keys(GEM_R).map(k=>`<button type="button" data-gr="${k}" class="${k===ris?'on':''}">${GEM_R[k][0]} ${GEM_R[k][1]}<small>1💎 = ${cb[k]||'?'}</small></button>`).join('')}</div>
    <div class="gemn">${[1,5,10,50].map(v=>`<button type="button" data-gn="${v}" class="${v===n?'on':''}">💎 ${v}</button>`).join('')}</div>
    <p class="gemprev"></p><button class="btn wide" data-gconf>Conferma il cambio</button>
    <p class="muted" style="font-size:12.5px">Il cibo non si ricarica da solo: lo trovi con spedizioni, casse, eventi e orde respinte, oppure col cambio qui sopra. Solo l’energia si ricarica col tempo.</p>
    <h4>🛒 Pacchetti di gemme</h4>${(c.pacchetti||[]).map(p=>`<div class="gempk"><b>💎 ${p.gemme}</b><span>${(p.prezzo_cent/100).toFixed(2).replace('.',',')} €</span>${d.pagamenti?`<button class="btn small" data-gbuy="${p.id}">Compra</button>`:d.admin?`<button class="btn small ghost" data-gprova="${p.id}">🧪 Prova</button>`:'<small>presto</small>'}</div>`).join('')}
    ${d.pagamenti?'':'<p class="muted" style="font-size:12.5px">I pagamenti non sono ancora attivi: per ora le gemme si guadagnano giocando.</p>'}
    ${c.provvisorio?'<p class="muted" style="font-size:12px">Valori provvisori, da bilanciare.</p>':''}
    ${d.legacy?`<p class="muted" style="font-size:12px">Le 💎 ${d.legacy} che avevi nella vecchia versione sono annotate: verranno trattate quando sarà deciso.</p>`:''}
    <h4>🧾 Ultimi movimenti</h4>${(d.movimenti||[]).length?d.movimenti.map(m=>`<div class="gemmov"><span>${m.delta>0?'+':''}${m.delta} 💎</span><small>${esc(m.motivo)}${m.test?' (prova)':''} · ${new Date(m.at).toLocaleString('it-IT')}</small></div>`).join(''):'<p class="muted">Nessun movimento.</p>'}`;
  const prev=()=>{const r=n*(+cb[ris]||0);box.querySelector('.gemprev').innerHTML=`Ricevi <b>${GEM_R[ris][0]} ${r}</b> · costo <b>💎 ${n}</b> · saldo dopo <b>💎 ${d.gemme-n}</b>`;box.querySelector('[data-gconf]').disabled=d.gemme<n;};prev();
  box.querySelectorAll('[data-gr]').forEach(b=>b.onclick=()=>{ris=b.dataset.gr;box.querySelectorAll('[data-gr]').forEach(x=>x.classList.toggle('on',x===b));prev();});
  box.querySelectorAll('[data-gn]').forEach(b=>b.onclick=()=>{n=+b.dataset.gn;box.querySelectorAll('[data-gn]').forEach(x=>x.classList.toggle('on',x===b));prev();});
  box.querySelector('[data-gconf]').onclick=async ev=>{ev.target.disabled=true;const key=Date.now()+'-'+Math.random().toString(36).slice(2,7);
    try{const{data,error}=await SB.rpc('world_gemme_converti',{p_ris:ris,p_gemme:n,p_chiave:key});if(error)throw error;toast(data.msg);}catch(e){toast('Non riuscito: riprova');}
    RES.t=0;try{resLoad(true);wMine(true);}catch(e){}gemSheet(ris);};
  box.querySelectorAll('[data-gprova]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data}=await SB.rpc('world_gemme_prova',{p_pacchetto:b.dataset.gprova,p_chiave:Date.now()+''});toast(data.msg);}catch(e){toast('Non riuscito');}gemSheet();});
  box.querySelectorAll('[data-gbuy]').forEach(b=>b.onclick=()=>toast('💳 Il pagamento si apre qui quando sarà attivo'));}
/* 💎 nella barra delle scorte */
const _trrScorteGem=trrScorteHTML;trrScorteHTML=function(){const h=_trrScorteGem.apply(this,arguments);if(!h||!GEM.d)return h;return h.replace('<button class="mwres"',`<button class="mwgem" data-gem>💎 ${wNum(GEM.d.gemme)}</button><button class="mwres"`);};
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-gem]');if(!b)return;e.preventDefault();e.stopPropagation();window.SHEET_BACK=null;gemSheet();},true);
zEvery(()=>{try{if(!document.hidden&&S.user)gemLoad();}catch(e){}},30000,'gemme');
</script>
