<script>
/* =========================================================
   🧑 IL SUPERSTITE (Fase 52, migrazione 043)
   - supCrea: nome e aspetto (volto, colore, accessorio) la prima volta che si entra nel gioco, anche per chi gioca
     già (niente si perde). world_sup_crea.
   - Pannello in cima a 🎖️ Io (supIoPaint avvolta): aspetto, grado, barra XP, statistiche (w_sup_stats) e gli
     sviluppi delle 4 statistiche: grado attuale → prossimo, beneficio, grado richiesto, risorse, durata,
     cosa manca, ▶️ Avvia (world_sup_potenzia) oppure tempo residuo e 💎 Completa subito (gemSubito 'sup').
   - Lavori di abilità e attrezzi in corso nella stessa lista. Avviso se manca cibo, con dove trovarlo.
   ========================================================= */
const SV={d:null,t:0,chiesto:false};
const SV_V=['🧑','👩','👨','🧔','👱','🧓','👩‍🦰','🧑‍🦱'],SV_C=['#ffd23f','#7fd1ff','#ff9db0','#9be39b','#c7a6ff','#ffb36b'],SV_A=['','🧢','🎒','🕶️','🪖','🧣'];
const SV_S={vita:['❤️','Vita','punti vita in più nello scontro'],forza:['💪','Forza','danno dei tuoi colpi'],difesa:['🛡️','Difesa','danno che ti tolgono'],agilita:['💨','Agilità','velocità e schivate']};
const SV_N={zaino:'🎒 Zaino',torcia:'🔦 Torcia',arma:'🔪 Arma',radio:'📻 Radio',esploratore:'🧭 Esploratore',resistenza:'🔋 Resistenza',combattente:'⚔️ Combattente',cercatore:'🔎 Cercatore',mercante:'💰 Mercante'};
const svDur=s=>s>=3600?`${Math.floor(s/3600)} h${s%3600>=60?' '+Math.floor(s%3600/60)+' min':''}`:s>=60?`${Math.round(s/60)} min`:`${s} s`;
const svLeft=t=>svDur(Math.max(0,Math.round((new Date(t)-Date.now())/1000)));
async function svLoad(force){if(!S.user||typeof SB==='undefined'||!SB)return SV.d;if(!force&&SV.d&&Date.now()-SV.t<20000)return SV.d;SV.t=Date.now();
  try{const{data,error}=await SB.rpc('world_sup_profilo');if(!error&&data&&data.ok)SV.d=data;}catch(e){}return SV.d;}
function svAvatar(a,big){a=a||{};return`<span class="svav ${big?'big':''}" style="background:${SV_C[a.c||0]}">${SV_V[a.v||0]}${SV_A[a.a||0]?`<i>${SV_A[a.a]}</i>`:''}</span>`;}
/* ---------- creazione ---------- */
function supCrea(dopo){const a={v:0,c:0,a:0};const nick=(S.user&&S.user.nick)||'';
  openSheet('🧑 Crea il tuo superstite',`<p class="muted" style="font-size:14px">È il personaggio che esplora, viaggia e combatte per te. Scegli nome e aspetto: casa, scorte e progressi restano.</p>
    <div class="svprev"></div><label class="svlab">Nome<input class="svnome" maxlength="20" value="${esc(nick)}" placeholder="Es. Ombra"></label>
    <b>Volto</b><div class="svpick" data-k="v">${SV_V.map((x,i)=>`<button type="button" data-i="${i}" class="${i?'':'on'}">${x}</button>`).join('')}</div>
    <b>Colore</b><div class="svpick" data-k="c">${SV_C.map((x,i)=>`<button type="button" data-i="${i}" class="${i?'':'on'}" style="background:${x}">&nbsp;</button>`).join('')}</div>
    <b>Accessorio</b><div class="svpick" data-k="a">${SV_A.map((x,i)=>`<button type="button" data-i="${i}" class="${i?'':'on'}">${x||'—'}</button>`).join('')}</div>
    <p class="muted" style="font-size:13px">Parti dal grado ${(SV.d&&SV.d.grado)||1} con le statistiche di base: ❤️ vita, 💪 forza, 🛡️ difesa, 💨 agilità. Le potenzi dalla scheda Io.</p>
    <button class="btn wide" data-svok>✅ Crea il superstite</button>`,c=>{
    const prev=()=>{c.querySelector('.svprev').innerHTML=svAvatar(a,true)+`<b>${esc(c.querySelector('.svnome').value||'?')}</b>`;};prev();
    c.querySelector('.svnome').oninput=prev;
    c.querySelectorAll('.svpick').forEach(p=>p.querySelectorAll('button').forEach(b=>b.onclick=()=>{a[p.dataset.k]=+b.dataset.i;p.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));prev();}));
    c.querySelector('[data-svok]').onclick=async ev=>{ev.target.disabled=true;let r=null;try{const{data,error}=await SB.rpc('world_sup_crea',{p_nome:c.querySelector('.svnome').value,p_avatar:a});if(error)throw error;r=data;}catch(e){toast('Non riuscito: riprova');}
      if(r){toast(r.msg);if(r.ok){await svLoad(true);closeSheet();if(dopo)dopo();return;}}ev.target.disabled=false;};});}
zEvery(()=>{try{if(document.hidden||SV.chiesto||!S.user||typeof mwOk!=='function'||!mwOk()||document.querySelector('#sheet.open'))return;if(window.__noHello&&!window.__supCrea)return;
  svLoad().then(d=>{if(d&&d.ok&&!d.nome&&!SV.chiesto&&!document.querySelector('#sheet.open')){SV.chiesto=true;supCrea();}});}catch(e){}},5000,'sup-crea');
/* ---------- pannello: statistiche e sviluppi ---------- */
function svPanel(d){const st=d.stats||{},R=(typeof RES!=='undefined'&&RES.d)||{},L=d.lavori||[];const pc=d.xp_a>d.xp_da?Math.round((d.xp-d.xp_da)/(d.xp_a-d.xp_da)*100):100;
  const card=k=>{const n=(d.prossimi||{})[k]||{},inc=L.find(l=>l.tipo==='stat'&&l.chiave===k),cur=(d.stat&&d.stat[k])||0;const S2=SV_S[k];
    if(n.max)return`<div class="svpot"><div><b>${S2[0]} ${S2[1]} · grado ${cur} (massimo)</b><small>${st[k]} · ${S2[2]}</small></div></div>`;
    const manca=[];if(d.grado<n.richiesto)manca.push(`grado ${n.richiesto}`);if((R.legno||0)<n.costo.legno)manca.push(`🪵 ${n.costo.legno-(R.legno||0)}`);if(n.costo.mattoni&&typeof trrMat==='function'&&trrMat()<n.costo.mattoni)manca.push(`🧱 ${n.costo.mattoni-trrMat()}`);
    return`<div class="svpot ${inc?'on':''}"><div><b>${S2[0]} ${S2[1]} · grado ${cur} → ${n.grado}</b><small>Ora ${st[k]} → ${st[k]+n.beneficio} (${S2[2]})</small>
      <small>Serve grado ${n.richiesto} · 🪵 ${n.costo.legno}${n.costo.mattoni?' 🧱 '+n.costo.mattoni:''} · ⏱️ ${svDur(n.secondi)}</small>${!inc&&manca.length?`<small class="svmanca">Manca: ${manca.join(', ')}</small>`:''}</div>
      ${inc?`<div class="svrun"><small>⏳ <i data-svt="${inc.fine}">${svLeft(inc.fine)}</i></small><button class="btn small" data-svsub="${inc.id}" data-fine="${inc.fine}">💎 ${gemCosto(inc.fine)}</button></div>`:`<button class="btn small" data-svgo="${k}" ${manca.length?'disabled':''}>▶️ Avvia</button>`}</div>`;};
  const altri=L.filter(l=>l.tipo!=='stat');
  return`<div class="svpanel"><div class="svtop">${svAvatar(d.avatar,true)}<div><b>${esc(d.nome||'Superstite')}</b><small>🎖️ Grado ${d.grado} · ⭐ ${d.xp}/${d.xp_a}</small><div class="pvpbar integ"><span style="width:${Math.max(2,pc)}%"></span></div></div>${d.nome?'':'<button class="btn small" data-svcrea>Crea</button>'}</div>
    <div class="svst">${Object.keys(SV_S).map(k=>`<div><span>${SV_S[k][0]}</span><b>${st[k]??'?'}</b><small>${SV_S[k][1]}</small></div>`).join('')}</div>
    ${(R.cibo??99)<10?`<p class="svcibo">🥫 Poco cibo (${R.cibo}). Il cibo non arriva da solo: spedizioni, casse, eventi, orde respinte, oppure <u data-svcibo>💎 → cibo</u>.</p>`:''}
    <h4 style="margin:10px 0 4px">⬆️ Sviluppi (${L.length}/${(d.cfg&&d.cfg.max_lavori)||2} in corso)</h4>${Object.keys(SV_S).map(card).join('')}
    ${altri.map(l=>`<div class="svpot on"><div><b>${SV_N[l.chiave]||l.chiave} → grado ${l.grado}</b><small>${l.tipo==='abil'?'abilità':'attrezzo'}</small></div><div class="svrun"><small>⏳ <i data-svt="${l.fine}">${svLeft(l.fine)}</i></small><button class="btn small" data-svsub="${l.id}" data-fine="${l.fine}">💎 ${gemCosto(l.fine)}</button></div></div>`).join('')}
    <p class="muted" style="font-size:12px">Puoi esplorare e combattere mentre lavora: il beneficio arriva quando il tempo finisce. Il costo e la durata restano quelli della partenza.${d.cfg&&d.cfg.provvisorio?' Valori provvisori.':''}</p></div>`;}
function svBind(box){const re=async()=>{await svLoad(true);RES.t=0;try{await resLoad(true);}catch(e){}const p=box.querySelector('.svpanel');if(p&&SV.d){p.outerHTML=svPanel(SV.d);svBind(box);}};
  box.querySelectorAll('[data-svgo]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const{data,error}=await SB.rpc('world_sup_potenzia',{p_stat:b.dataset.svgo});if(error)throw error;toast(data.msg);}catch(e){toast('Non riuscito: riprova');}re();});
  box.querySelectorAll('[data-svsub]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await gemSubito('sup',b.dataset.svsub,b.dataset.fine);if(!r||!r.ok)b.disabled=false;else re();});
  const c=box.querySelector('[data-svcrea]');if(c)c.onclick=()=>supCrea(()=>supSheet('io'));const ci=box.querySelector('[data-svcibo]');if(ci)ci.onclick=()=>gemSheet('cibo');}
const _supIoPaintSv=supIoPaint;supIoPaint=function(box){const r=_supIoPaintSv.apply(this,arguments);(async()=>{const d=await svLoad(true);if(!d||!box.isConnected||box.querySelector('.svpanel'))return;box.insertAdjacentHTML('afterbegin',svPanel(d));svBind(box);})();return r;};
zEvery(()=>{try{document.querySelectorAll('#sheet.open [data-svt]').forEach(i=>{i.textContent=svLeft(i.dataset.svt);});}catch(e){}},1000,'sup-tempi');
</script>
