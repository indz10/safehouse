<script>
/* =========================================================
   VIATICO: la valutazione vera della casa dà un vantaggio in Orda
   - livello di partenza più alto se la casa è sicura (indice basso)
   - le difese reali diventano difese nel gioco (porta, grate, luci…)
   - pieno valore solo per ciò che è confermato dalle foto (IA)
   ========================================================= */
const VIA_FOTO=['porta','finestre','grate','tapparelle','recinzione','cancello','luci'];
function viatico(){
  if(!S.result||!S.game||!S.game.base)return null;
  const a=S.game.base,idx=S.result.idx;
  const ver=VIA_FOTO.filter(k=>S.aiFilled&&S.aiFilled[k]).length,verR=ver/VIA_FOTO.length,w=.5+.5*verR;
  const L0=idx<=2.5?8:idx<=3.5?6:idx<=4.5?5:idx<=5.5?4:idx<=6.5?3:idx<=7.5?2:1;
  const level=1+Math.round((L0-1)*w), coins=Math.round(80*(L0-1)*w/10)*10, gems=ver>=5?15:ver>=3?8:0;
  const h={},why=[];const up=(k,v,t)=>{if(v>0){h[k]=Math.max(h[k]||0,v);why.push(t);}};
  up('porta',a.porta==='b4'?2:a.porta==='blindata'?1:0,a.porta==='b4'?'porta blindata classe 4':'porta blindata');
  up('grate',Math.min(3,(a.grate==='tutte'?2:a.grate==='alcune'?1:0)+(a.tapparelle==='blind'?1:0)),'grate e tapparelle');
  up('muro',a.recinzione==='muro2'?2:a.recinzione==='muro1'?1:0,a.recinzione==='muro2'?'muro alto':'cancellata');
  up('luci',a.luci==='sensore'?2:a.luci==='fisse'?1:0,a.luci==='sensore'?'luci a sensore':'luci esterne');
  up('energia',a.energia==='fv'?2:a.energia==='gen'?1:0,a.energia==='fv'?'fotovoltaico':'generatore');
  up('vedetta',a.allarme==='cam'?1:0,'allarme con telecamere');
  const q={};if(a.gruppo==='org'){q.rossi=1;q.bianchi=1;why.push('gruppo di vicini');}else if(a.gruppo==='qualche'&&a.vicini==='20'){q.rossi=1;why.push('un vicino vicino');}
  const tipo=a.tipo==='schiera'?'schiera':/^apt/.test(a.tipo||'')?'apt':a.zona==='montagna'?'rifugio':a.zona==='campagna'?'casale':'villa';
  return{idx,L0,level,coins,gems,ver,verR,h,q,why,tipo};
}
function viaticoCard(){
  const v=viatico();
  if(!v)return`<div class="panel moon via"><b class="disp" style="font-size:22px">Parti avvantaggiato</b>
    <p style="font-weight:400;margin:4px 0 10px">Valuta la tua casa vera: più è protetta, più alto è il livello da cui parti in Orda. Porta blindata, grate e luci diventano difese anche nel gioco.</p>
    <button class="btn small" data-go="valuta">Valuta la mia casa</button></div>`;
  const on=S.useVia!==false;
  return`<div class="panel via ${on?'moon':''}">
    <div class="row spread"><b class="disp" style="font-size:22px">Viatico della tua casa</b><label class="sw"><input type="checkbox" id="viaOn" ${on?'checked':''}><span>${on?'Attivo':'Spento'}</span></label></div>
    <p style="font-weight:400;font-size:14px;margin:4px 0 8px">Indice reale <b>${fmtI(v.idx)}</b>: parti dall’<b>ondata ${v.level}</b>${v.coins?` con <b>+${v.coins} monete</b>`:''}${v.gems?` e <b>+${v.gems} gemme</b>`:''}.</p>
    ${v.why.length?`<p style="font-size:13px;font-weight:400;margin-bottom:8px">Difese portate dalla casa vera: ${v.why.join(', ')}.</p>`:'<p class="muted" style="font-size:13px;margin-bottom:8px">Nessuna difesa reale da portare nel gioco: migliora la casa e rivaluta.</p>'}
    <div class="vbar"><span style="width:${Math.round(v.verR*100)}%"></span></div>
    <small>${v.ver}/${VIA_FOTO.length} difese confermate dalle foto. ${v.ver<VIA_FOTO.length?`Con tutte confermate partiresti dall’ondata ${v.L0}.`:'Bonus pieno.'}</small>
    ${v.ver<VIA_FOTO.length?'<div style="margin-top:8px"><button class="btn small ghost" data-go="valuta" data-step="1">Conferma con le foto</button></div>':''}
    <p class="muted" style="font-size:11px;margin-top:8px">Il viatico vale una volta per casa e per account. Rispondere il falso non conviene: senza foto vale metà.</p></div>`;
}
function applyViatico(){
  const v=viatico();if(!v||S.useVia===false)return null;
  G.level=Math.max(G.level,v.level);G.best=Math.max(G.best||0,v.level-1);G.coins+=v.coins;G.gems+=v.gems;
  Object.entries(v.h).forEach(([k,lv])=>{const max=(HUP.find(u=>u.id===k)||{cost:[]}).cost.length;G.h[k]=Math.max(G.h[k]||0,Math.min(max,lv));});
  Object.entries(v.q).forEach(([k,lv])=>{G.q[k]=Math.max(G.q[k]||0,lv);});
  G.via={level:v.level,idx:v.idx};
  setTimeout(()=>toast(`Viatico attivo: parti dall’ondata ${v.level}${v.why.length?' con '+v.why.length+' difese della casa vera':''}`),300);
  return v;
}
</script>
