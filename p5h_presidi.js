<script>
/* =========================================================
   PRESIDI DI ZONA (livello condiviso) + RECENSIONI OVUNQUE
   - presidi: luoghi pubblici e attività sponsor reali; ogni settimana
     li tiene chi stabilisce il record di resistenza. Nessuna casa privata.
   - recensioni: toccando attività e sponsor su qualsiasi mappa
   ========================================================= */
const PRES_BASE=[['piazza','Piazza principale','⛲','Luogo pubblico'],['parco','Parco giochi','🌳','Luogo pubblico'],['stazione','Stazione','🚆','Luogo pubblico']];
function presList(){
  const z=S.zone;const r=rng(((z&&z.seed)||7)+404);
  const seen=new Set();const real=z?z.resources.filter(x=>['farm','super','ferr','osp'].includes(x.kind)&&!seen.has(x.kind)&&seen.add(x.kind)).slice(0,2).map(x=>[('r-'+x.kind),x.name,RES_ICON[x.kind][0],'Attività della zona']):[['farm','Farmacia Centrale','💊','Attività della zona']];
  const sp=Object.keys(SPONSORS).slice(0,2).map(k=>['sp-'+k,SPONSORS[k].name,'⭐','Sponsor']);
  G.pres=G.pres||{};
  return[...PRES_BASE,...real,...sp].map(([id,name,ic,kind])=>{if(!G.pres[id]){const n=OPP_N[Math.floor(r()*OPP_N.length)];G.pres[id]={holder:n,rec:3+Math.floor(r()*6),mine:0};}return{id,name,ic,kind,...G.pres[id]};});}
function presHeld(){return Object.values(G.pres||{}).filter(p=>p.holder==='Tu').length;}
function presDays(){const d=new Date().getDay();return d===1?7:(8-d)%7||7;}
function presHTML(){const ps=presList();const held=presHeld();
  return`<div class="panel pres"><div class="row spread"><b class="disp" style="font-size:24px">🚩 Presidi della zona</b><span class="tag">azzeramento tra ${presDays()} g</span></div>
   <p style="font-weight:400;font-size:13px;margin:4px 0 8px">Luoghi pubblici e attività vere della tua zona${S.zone?` (${esc(S.zone.address)})`:''}. Li tiene chi resiste più ondate questa settimana. Ogni presidio tenuto: <b>+5% monete</b> in tutte le ondate${held?` · ora ne tieni <b>${held}</b>`:''}.</p>
   ${ps.map(p=>`<div class="presr ${p.holder==='Tu'?'mine':''}"><span class="pi">${p.ic}</span><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><small>${p.kind}${p.kind==='Sponsor'?' · '+rvStarsTxt('sp-'+p.id.slice(3)):''}</small>
     <small>${p.holder==='Tu'?'🚩 Lo tieni tu':'Tenuto da @'+esc(p.holder)} · record ${p.rec} ondate${p.mine&&p.holder!=='Tu'?` · il tuo ${p.mine}`:''}</small></div>
     <button class="btn small ${p.holder==='Tu'?'ghost':''}" data-pres="${p.id}">${p.holder==='Tu'?'Difendi':'Conquista'}</button></div>`).join('')}
   <p class="muted" style="font-size:11px;margin-top:6px">Nessuna casa privata: solo luoghi pubblici e attività che hanno scelto di partecipare.</p></div>`;}
function presPlay(id){const p=presList().find(x=>x.id===id);const ps=myProps();
  openSheet(`🚩 ${esc(p.name)}`,`<p class="muted" style="margin-bottom:8px">Record da battere: <b>${p.rec} ondate</b> (${p.holder==='Tu'?'tuo':'@'+esc(p.holder)}). Scegli la casa che difende il presidio.</p>
    ${ps.sort((a,b)=>b.pow-a.pow).map(x=>`<div class="choice2"><img alt="" src="${custImg(x.id,54,64)}"><span><b>${esc(x.name)}</b><small>Potenza ${x.pow}</small></span><span class="col2"><button class="btn small" data-pp="${x.id}">Gioca</button></span></div>`).join('')}`,
  card=>card.querySelectorAll('[data-pp]').forEach(b=>b.onclick=()=>{closeSheet();
    const opp={nick:p.holder==='Tu'?'record':p.holder,kind:'apt',pow:propPower(b.dataset.pp),cust:randCust(rng(7))};
    arenaPlay(b.dataset.pp,opp,{title:'Presidio · '+p.name,seed:id.length*977+7,targetOverride:p.rec,onEnd:res=>{const st=G.pres[id];st.mine=Math.max(st.mine||0,res.mine);let extra='';
      if(res.mine>st.rec){st.rec=res.mine;const was=st.holder;st.holder='Tu';G.gems+=8;extra=`<p><b>🚩 Presidio conquistato${was!=='Tu'?' da @'+esc(was):''}! +8 💎 e +5% monete in tutte le ondate.</b></p>`;}
      else extra=`<p>Record da battere: ${st.rec} ondate.</p>`;
      arenaResult({...res,opp:st.rec,res:res.mine>=st.rec?'win':'lose'},{nick:p.holder==='Tu'?'il record':p.holder},null,extra);}});}));}
function bindPres(){app.querySelectorAll('[data-pres]').forEach(b=>b.onclick=()=>presPlay(b.dataset.pres));}
/* ---------- stelle e recensioni ovunque ---------- */
function rvStarsTxt(key){const l=rvList(key,8,4.2);const a=rvAvg(l);return`★ ${a.toFixed(1).replace('.',',')} (${l.length})`;}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-rvx]');if(!b)return;e.stopPropagation();reviewsSheet(b.dataset.rvx,b.dataset.rvn,+b.dataset.rvc,+b.dataset.rvb);},true);
</script>
