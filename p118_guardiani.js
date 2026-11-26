<script>
/* ===== Fase 72 — 🧟 GUARDIANI DI CASE E PRESIDI (migrazione 056) =====
   world_buy e world_presidio_occupa rispondono { guardiano, target } finché il posto non è liberato: qui (SB.rpc avvolto)
   si apre guardSheet: chi è il guardiano (tipo fisso del posto), difficoltà, "⚔️ Combatti" → world_guardiano(target, diff,
   lat, lon) (1 energia, scontro subito pronto, ovunque tu sia) → arnVai (il picchiaduro di p107). Vinto, world_scontro_fine
   risponde liberata: nel risultato dell'arena compare "🔑 Compra ora" / "🚩 Occupa ora" che ripete la richiesta di prima.
   La casa vera si prende come prima (wClaim), senza guardiano. */
const GRD={last:null};
function guardSheet(d,n,a){const g=d.guardiano||{};const casa=n==='world_buy';GRD.last={n,a,target:d.target};let diff='equilibrato';
  openSheet(`${g.ic||'🧟'} ${casa?'Casa infestata':'Presidio infestato'}`,`<div class="grdbox"><span class="grdic">${g.ic||'🧟'}</span><div><b>${esc(g.nome||'Guardiano')}</b><small>${casa?'Ha fatto il nido in questa casa':'Tiene il presidio'}: battilo nel combattimento e ${casa?'la casa':'il presidio'} resta libero per te 24 ore.</small></div></div>
    <p class="muted" style="font-size:13px;margin:6px 0">Ogni ${casa?'casa':'presidio'} ha sempre lo stesso guardiano. Il combattimento costa 1 energia e si fa da dove sei.</p>
    <div class="gemris">${[['facile','😌 Facile'],['equilibrato','⚖️ Equilibrato'],['difficile','💀 Difficile']].map(([k,t])=>`<button type="button" data-gdiff="${k}" class="${k===diff?'on':''}">${t}</button>`).join('')}</div>
    <button class="btn wide" data-gvai>⚔️ Combatti il guardiano</button>`,c=>{
    c.querySelectorAll('[data-gdiff]').forEach(b=>b.onclick=()=>{diff=b.dataset.gdiff;c.querySelectorAll('[data-gdiff]').forEach(x=>x.classList.toggle('on',x===b));});
    c.querySelector('[data-gvai]').onclick=async e=>{e.target.disabled=true;let r=null;
      try{const x=await SB.rpc('world_guardiano',{p_target:d.target,p_diff:diff,p_lat:a.p_lat==null?null:a.p_lat,p_lon:a.p_lon==null?null:a.p_lon});if(x.error)throw x.error;r=x.data;}catch(err){toast('Non riuscito: riprova');e.target.disabled=false;return;}
      if(!r||!r.ok){toast((r&&r.msg)||'Non riuscito');e.target.disabled=false;return;}
      if(r.liberata){closeSheet();toast(r.msg);guardRiprova();return;}
      closeSheet();try{if(typeof vcOff==='function'&&VC.on)vcOff();}catch(x){}arnVai(r.id,g.ic);};});}
async function guardRiprova(){const L=GRD.last;if(!L)return;try{const{data}=await SB.rpc(L.n,L.a);toast((data&&data.msg)||'Fatto');if(data&&data.ok){GRD.last=null;try{wMine(true);}catch(e){}try{if(typeof presList==='function'&&L.n==='world_presidio_occupa')closeSheet();}catch(e){}}}catch(e){toast('Non riuscito: riprova');}}
zEvery(()=>{try{if(typeof SB==='undefined'||!SB||SB.__grdw||!SB.rpc)return;const o=SB.rpc.bind(SB);
  SB.rpc=async function(n,a){const r=await o(n,a);try{const d=r&&r.data;
    if(d&&d.guardiano&&!d.ok&&(n==='world_buy'||n==='world_presidio_occupa'))setTimeout(()=>guardSheet(d,n,a||{}),350);
    if(n==='world_scontro_fine'&&d&&d.liberata&&GRD.last&&GRD.last.target===d.liberata)setTimeout(guardBottone,700);}catch(e){}return r;};SB.__grdw=1;}catch(e){}},1000,'guardiani');
/* nel risultato dell'arena: prendi subito quello che hai liberato */
function guardBottone(){const res=document.querySelector('.arnres');const L=GRD.last;if(!res||!L||res.querySelector('[data-grdok]'))return;
  const casa=L.n==='world_buy';res.insertAdjacentHTML('beforeend',`<p class="grdlib">✅ ${casa?'Casa liberata: è tua':'Presidio liberato: è tuo'} per 24 ore</p><button class="btn" data-grdok>${casa?'🔑 Compra ora':'🚩 Occupa ora'}</button>`);
  res.querySelector('[data-grdok]').onclick=async ev=>{ev.target.disabled=true;try{arnChiudi();}catch(e){}await guardRiprova();};}
</script>
