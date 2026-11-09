<script>
/* =========================================================
   SIMULAZIONE: DALLA CASA SINGOLA AL QUARTIERE
   - Mondo vero (Valuta → Simula): "La mia casa" | "Il mio quartiere"
     la notte simulata sulle aree della community (dati aggregati)
   - Mondo di gioco (Gioco → Quartiere): anteprima animata della
     notte su tutti gli edifici, prima di combattere
   ========================================================= */
S.simMode=S.simMode||'casa';S.qtog=S.qtog||{gruppo:false,raccolta:false,luci:false,rimedi:true};
const _renderGioco=renderGioco;
renderGioco=function(){if(S.simMode==='quart')return renderSimQuart();_renderGioco();const pg=app.querySelector('.page');if(pg&&!pg.querySelector('.simseg')){const h=pg.querySelector('h2');let anc=h;while(anc&&anc.parentElement!==pg)anc=anc.parentElement;(anc||pg.firstElementChild).insertAdjacentHTML('afterend',simSeg());bindSimSeg();}};
function simSeg(){return`<div class="seg simseg"><button class="${S.simMode==='casa'?'on':''}" data-sm="casa">🏠 La mia casa</button><button class="${S.simMode==='quart'?'on':''}" data-sm="quart">🏘️ Il mio quartiere</button></div>`;}
function bindSimSeg(){app.querySelectorAll('[data-sm]').forEach(b=>b.onclick=()=>{S.simMode=b.dataset.sm;vibe();renderGioco();window.scrollTo(0,0);});}
/* ---------- calcolo ---------- */
function svgPoint(svg,el){try{const r=el.getBoundingClientRect();if(r.width||r.height){const pt=svg.createSVGPoint();pt.x=r.x+r.width/2;pt.y=r.y+r.height/2;const q=pt.matrixTransform(svg.getScreenCTM().inverse());return{x:q.x,y:q.y};}}catch(e){}try{const b=el.getBBox();return{x:b.x+b.width/2,y:b.y+b.height/2};}catch(e){return null;}}
function myIdxNow(){try{return computeScore(gameAnswers(),S.zone).idx;}catch(e){return S.result?S.result.idx:5;}}
function qCells(){const z=S.zone,cs=commCells(z).map((c,i)=>({...c,i}));const t=S.qtog;
  return cs.map(c=>{let a=c.n>=K_MIN?c.avg:(z.avgU||5.5);
    if(t.gruppo)a-=.7;if(t.luci)a-=.5;if(t.raccolta&&(z.resources||[]).length)a-=.35;a=Math.max(1,Math.min(10,a));
    return{...c,eff:a,known:c.n>=K_MIN,out:a<=4.2?'tiene':a<=6?'regge':'cede'};});}
function myCell(cs,svg){const me=svg&&[...svg.querySelectorAll('text')].find(t=>t.textContent.trim()==='TU');let p=me?svgPoint(svg,me):null;if(!p)p={x:200,y:210};
  let best=null,bd=1e9;cs.forEach(c=>{const d=Math.hypot(c.x-p.x,c.y-p.y);if(d<bd){bd=d;best=c;}});return best;}
/* ---------- pagina: il mio quartiere (mondo vero) ---------- */
function renderSimQuart(){
  if(!S.zone){app.innerHTML=`<div class="page"><h2 class="disp" style="font-size:32px;margin-top:6px">Simulazione</h2>${simSeg()}<div class="notice">Per simulare il quartiere serve l’indirizzo della tua casa.</div><button class="btn wide" data-go="valuta">Valuta la mia casa</button></div>`;bindSimSeg();if(typeof bindGo==='function')bindGo();return;}
  const cs=qCells(),tot=cs.reduce((a,c)=>a+c.n,0),avg=cs.reduce((a,c)=>a+c.avg*c.n,0)/Math.max(1,tot);
  app.innerHTML=`<div class="page"><h2 class="disp" style="font-size:32px;margin-top:6px">Simulazione del quartiere</h2>${simSeg()}
   <p class="muted" style="margin:4px 0 10px">La tua zona vera, area per area: come passerebbe la notte. Solo dati aggregati, mai una casa singola.</p>
   <div class="panel mapwrap" style="padding:0;overflow:hidden;position:relative"><div id="qmap">${mapScene(S.zone,{poi:true,users:false,heat:false,me:true,mode:'night',spons:true,comm:true})}</div><div class="qcap" id="qcap"></div><div class="qclock" id="qclock"></div><div class="qbar"><i id="qprog"></i></div><div class="qlive" id="qlive"></div><div class="mapinfo qinfo" id="qinfo"><span class="muted">Lancia la notte, poi tocca un’area per i dettagli.</span></div></div>
   <div class="grid3 qstats"><div class="stat"><b>${cs.length}</b><small>aree</small></div><div class="stat"><b>${tot}</b><small>vicini nella community</small></div><div class="stat"><b>${fmtI(avg)}</b><small>indice medio</small></div></div>
   <div class="panel"><b class="disp" style="font-size:20px">Strategie del quartiere</b><small class="muted" style="display:block;margin-bottom:6px">Accendile e rilancia la notte: guarda cosa cambia.</small>
    ${[['rimedi','🏠 La mia casa con i rimedi applicati in Simula'],['gruppo','👥 Gruppo di quartiere nell’app: i vicini si avvisano e si aiutano'],['raccolta','🏥 Punti di raccolta ai servizi pubblici'],['luci','💡 Luci a sensore nelle vie (offerta sponsor)']].map(([k,l])=>`<label class="qtog"><input type="checkbox" data-qt="${k}" ${S.qtog[k]?'checked':''}><span>${l}</span></label>`).join('')}</div>
   <button class="btn wide" id="qGo">🌙 Simula la notte del quartiere</button><div id="qrep"></div></div>`;
  bindSimSeg();app.querySelectorAll('[data-qt]').forEach(c=>c.onchange=()=>{S.qtog[c.dataset.qt]=c.checked;vibe();});
  $('#qGo').onclick=qSiege;}
function qSiege(){const box=$('#qmap'),svg=box.querySelector('svg');if(!svg)return;const btn=$('#qGo');btn.disabled=true;$('#qrep').innerHTML='';
  box.scrollIntoView({behavior:'smooth',block:'start'});
  const cs=qCells(),me=myCell(cs,svg);const myIdx=S.qtog.rimedi?myIdxNow():(S.result?S.result.idx:myIdxNow());
  me.eff=Math.min(me.eff,myIdx);me.out=myIdx<=4.2?'tiene':myIdx<=6?'regge':'cede';
  const NS='http://www.w3.org/2000/svg';let L=svg.querySelector('#qsimL');if(L)L.remove();L=document.createElementNS(NS,'g');L.id='qsimL';L.setAttribute('pointer-events','none');svg.appendChild(L);
  const vb=svg.viewBox.baseVal,W=vb&&vb.width||400,H=vb&&vb.height||420;const DUR=20000;
  const live=$('#qlive'),prog=$('#qprog');const cnt={tiene:0,regge:0,cede:0};const upd=()=>{if(live)live.innerHTML=`<span class="ok">✓ ${cnt.tiene} tengono</span><span class="mid">! ${cnt.regge} reggono</span><span class="ko">✕ ${cnt.cede} cedono</span>`;};upd();
  const cap=t=>{const c=$('#qcap');if(!c)return;c.textContent=t;c.classList.remove('in');void c.offsetWidth;c.classList.add('in');};
  const clock=t=>{const c=$('#qclock');if(c)c.textContent=t;};
  const hexEl=i=>svg.querySelector(`[data-hex="${i}"]`);
  const paint=(c,col,op)=>{const h=hexEl(c.i);if(!h)return;(h.tagName==='path'?[h]:[...h.querySelectorAll('path,polygon')]).forEach(p=>{p.style.transition='fill .5s,fill-opacity .5s';p.setAttribute('fill',col);p.setAttribute('fill-opacity',op);});};
  cs.forEach(c=>paint(c,'#1a1433',.35));
  /* gli zombie puntano soprattutto alle aree deboli */
  const pool=[];cs.forEach(c=>{const w=Math.max(1,Math.round((c.eff-2)*1.6));for(let k=0;k<w;k++)pool.push(c);});
  const Z=[];for(let k=0;k<64;k++){const side=k%3,sx=side===0?Math.random()*W:side===1?-10:W+10,sy=side===0?H+10:Math.random()*H;const tg=pool[Math.floor(Math.random()*pool.length)];
    const e=document.createElementNS(NS,'circle');e.setAttribute('r','4.2');e.setAttribute('fill','#7bd36b');e.setAttribute('stroke','#140f1f');e.setAttribute('stroke-width','1.5');L.appendChild(e);Z.push({e,sx,sy,tx:tg.x+(Math.random()-.5)*22,ty:tg.y+(Math.random()-.5)*22,d:Math.random()*5000});}
  const t0=performance.now();let raf;(function mv(){if(!document.body.contains(svg))return;const t=performance.now()-t0;Z.forEach(z=>{const p=Math.max(0,Math.min(1,(t-z.d)/8000));const q=1-Math.pow(1-p,2);z.e.setAttribute('cx',z.sx+(z.tx-z.sx)*q);z.e.setAttribute('cy',z.sy+(z.ty-z.sy)*q+Math.sin(t/180+z.d)*1.4);});
    if(prog)prog.style.width=Math.min(100,t/DUR*100)+'%';if(t<DUR+400)raf=requestAnimationFrame(mv);})();
  const col={tiene:'#3f9b5f',regge:'#f7d64a',cede:'#d7263d'};
  const mark=(c,txt,size=16)=>{const t=document.createElementNS(NS,'text');t.setAttribute('x',c.x);t.setAttribute('y',c.y+6);t.setAttribute('text-anchor','middle');t.setAttribute('font-size',size);t.setAttribute('font-family','Bangers,Impact');t.setAttribute('stroke','#140f1f');t.setAttribute('stroke-width','3');t.setAttribute('paint-order','stroke');t.setAttribute('fill','#fff');t.textContent=txt;L.appendChild(t);return t;};
  const ring=document.createElementNS(NS,'circle');ring.setAttribute('cx',me.x);ring.setAttribute('cy',me.y);ring.setAttribute('r','30');ring.setAttribute('fill','none');ring.setAttribute('stroke','#f7d64a');ring.setAttribute('stroke-width','4');ring.setAttribute('stroke-dasharray','6 5');ring.innerHTML='<animate attributeName="r" values="26;34;26" dur="1.2s" repeatCount="indefinite"/>';L.appendChild(ring);
  const T=(ms,f)=>setTimeout(()=>{if(document.body.contains(svg))try{f();}catch(e){}},ms);
  /* ogni area si decide nel corso della notte: prima le più deboli */
  const order=cs.slice().sort((a,b)=>b.eff-a.eff);
  order.forEach((c,k)=>{const at=4000+k/order.length*12500;T(at,()=>{paint(c,col[c.out],c.known?.62:.38);cnt[c.out]++;upd();
    if(c.out==='cede'){const m=mark(c,'💥',18);setTimeout(()=>{m.textContent='✕';},700);sfx('crack');}else if(c===me||c.known)mark(c,c.out==='tiene'?'✓':'!');});});
  const steps=[[0,'22:00','L’orda arriva dalla campagna e dalle strade di ingresso.'],[3500,'23:00','Gli zombie puntano alle aree meno preparate.'],
   [7500,'00:30',S.qtog.gruppo?'Il gruppo di quartiere si attiva: i vicini si avvisano e si aiutano.':'Ogni casa si difende da sola: nessuno avvisa i vicini.'],
   [11500,'02:00',S.qtog.raccolta?'I servizi pubblici diventano punti di raccolta sicuri.':'Il momento più duro della notte.'],[15500,'04:30',S.qtog.luci?'Le luci a sensore nelle vie rallentano l’orda.':'L’orda insiste sulle ultime aree.'],[18000,'06:00','Alba. Ecco come ha passato la notte il quartiere.']];
  steps.forEach(([ms,h,t])=>T(ms,()=>{clock(h);cap(t);}));
  T(1,()=>sfx('horn'));
  T(7600,()=>{if(S.qtog.gruppo)cs.filter(c=>Math.hypot(c.x-me.x,c.y-me.y)<90&&c!==me).forEach(c=>{const l=document.createElementNS(NS,'line');l.setAttribute('x1',me.x);l.setAttribute('y1',me.y);l.setAttribute('x2',c.x);l.setAttribute('y2',c.y);l.setAttribute('stroke','#7bd36b');l.setAttribute('stroke-width','3');l.setAttribute('stroke-dasharray','5 4');L.appendChild(l);});});
  T(DUR,()=>{cancelAnimationFrame(raf);Z.forEach(z=>z.e.setAttribute('opacity','.22'));sfx('win');btn.disabled=false;btn.textContent='🌙 Rilancia la notte';
    /* dopo la notte ogni area si può toccare */
    svg.addEventListener('click',ev=>{let c=null;const h=ev.target.closest&&ev.target.closest('[data-hex]');if(h)c=cs.find(x=>x.i===+h.dataset.hex);
      if(!c){try{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const q=pt.matrixTransform(svg.getScreenCTM().inverse());let bd=1e9;cs.forEach(x=>{const d=Math.hypot(x.x-q.x,x.y-q.y);if(d<bd){bd=d;c=x;}});if(bd>45)c=null;}catch(e){}}
      if(c){ev.stopPropagation();qArea(c,c===me);}});
    qReport(cs,me);});}
function qArea(c,mine){const tips={tiene:'Area preparata: tenetela così, invitate chi non ha ancora valutato la casa.',regge:'Regge a fatica: luci, gruppo di quartiere e qualche rinforzo alle porte fanno la differenza.',cede:'Area esposta: è qui che servono di più i rimedi e il gruppo di quartiere.'};
  const i=$('#qinfo');if(!i)return;i.innerHTML=`<b>${mine?'⭐ La tua area':'Area del quartiere'} · ${c.out==='tiene'?'✓ tiene':c.out==='regge'?'! regge a fatica':'✕ cederebbe'}</b>
   <span>${c.known?`${c.n} vicini hanno valutato la casa · indice medio ${fmtI(c.avg)}`:'Meno di 5 vicini: dati non mostrati, stima sulla zona'}</span><span>${tips[c.out]}</span>`;i.classList.remove('flash');void i.offsetWidth;i.classList.add('flash');vibe();}
function qReport(cs,me){const n=k=>cs.filter(c=>c.out===k).length,pp=k=>cs.filter(c=>c.out===k).reduce((a,c)=>a+c.n,0),tot=Math.max(1,cs.reduce((a,c)=>a+c.n,0));
  const safe=Math.round((pp('tiene')+pp('regge')*.5)/tot*100);const nights=Math.max(1,Math.round(30-cs.reduce((a,c)=>a+c.eff,0)/cs.length*3.2));
  const prev=S.qlast;S.qlast={safe,cede:n('cede')};const delta=prev?`<div class="qdelta ${safe>=prev.safe?'up':'down'}">Rispetto alla notte prima: ${safe-prev.safe>=0?'+':''}${safe-prev.safe}% vicini al sicuro · ${prev.cede-n('cede')>=0?prev.cede-n('cede'):'−'+(n('cede')-prev.cede)} aree in meno che cedono</div>`:'';
  const sp=Object.keys(SPONSORS);const out={tiene:'tiene',regge:'regge a fatica',cede:'cederebbe'}[me.out];
  const acts=[];if(!S.qtog.gruppo)acts.push(['👥','Attiva il gruppo di quartiere','I vicini si avvisano: le aree vicine reggono meglio.','qt:gruppo']);
  if(!S.qtog.luci&&sp[0])acts.push(['💡','Luci a sensore nelle vie',`${SPONSORS[sp[0]].name}: ${SP_OFF[sp[0]]||'offerta per la community'}`,'sp:'+sp[0]]);
  if(me.out!=='tiene')acts.push(['🏠','Rinforza la tua casa','Applica i rimedi in “La mia casa”: la tua area è tra le più esposte.','casa']);
  acts.push(['📣','Invita i vicini','Più vicini valutano la casa, più la simulazione diventa precisa.','inv']);
  $('#qrep').innerHTML=`<div class="panel qrep"><b class="disp" style="font-size:24px">Il quartiere dopo la notte</b>
   <div class="grid3" style="margin-top:8px"><div class="stat ok"><b>${n('tiene')}</b><small>aree tengono</small></div><div class="stat mid"><b>${n('regge')}</b><small>reggono a fatica</small></div><div class="stat ko"><b>${n('cede')}</b><small>cederebbero</small></div></div>
   <div class="qbig"><div><b>${safe}%</b><small>dei vicini al sicuro</small></div><div><b>${nights}</b><small>notti di resistenza del quartiere</small></div><div><b>${out}</b><small>la tua area</small></div></div>
   ${delta}<p class="muted" style="font-size:12px;margin-top:6px">👆 Tocca un’area sulla mappa per vederne il dettaglio.</p>
   <b style="display:block;margin-top:10px">Cosa farebbe la differenza</b>${acts.map(a=>`<button class="qact" data-qa="${a[3]}"><span>${a[0]}</span><b>${a[1]}</b><small>${a[2]}</small></button>`).join('')}
   <p class="muted" style="font-size:11.5px;margin-top:8px">Simulazione su dati aggregati per area (almeno 5 utenti). Nessuna casa singola viene mostrata o valutata.</p></div>`;
  $('#qrep').querySelectorAll('[data-qa]').forEach(b=>b.onclick=()=>{const a=b.dataset.qa;vibe();
    if(a.startsWith('qt:')){S.qtog[a.slice(3)]=true;renderSimQuart();setTimeout(qSiege,300);}
    else if(a.startsWith('sp:'))sponsorSheet(a.slice(3),S.zone);
    else if(a==='casa'){S.simMode='casa';renderGioco();window.scrollTo(0,0);}
    else{const txt='Valuta la tua casa con ZombieSafeHouse e aiuta il nostro quartiere a reggere la notte!';if(navigator.share)navigator.share({title:'ZombieSafeHouse',text:txt}).catch(()=>{});else toast('Messaggio pronto da condividere');}});
  }
/* ---------- gioco: anteprima della notte sul quartiere ---------- */
function preNightCalc(){const L=G.level,att=1+L*.13;const res=[];
  Object.entries(G.lots||{}).forEach(([id,o])=>{const lot=LOTS.find(l=>l.id===id);if(!lot)return;const isB=o.kind==='bld';
    const def=1.1+(o.lv||1)*.55+(o.prep||0)*.3+(o.fort||0)*.35+(isB?.5:0)+(o.ten?.25:0);const r=def/att;
    res.push({id,name:isB?(BLD[o.b]?BLD[o.b].name:'Edificio'):(lot.kind.charAt(0).toUpperCase()+lot.kind.slice(1)),out:r>=1.0?'tiene':r>=.78?'rischio':'cade'});});
  const sl=typeof scudoLv==='function'?scudoLv():0;const hr=(1.6+(G.fort?Object.keys(G.fort).length*.1:0)+sl*.12)/att;
  return{home:hr>=1.1?'tiene':hr>=.8?'rischio':'cade',res,L};}
function preNight(){const hood=app.querySelector('.hood'),svg=hood&&hood.querySelector('svg');if(!svg)return;hood.scrollIntoView({behavior:'smooth',block:'center'});
  const NS='http://www.w3.org/2000/svg';let L=svg.querySelector('#preL');if(L)L.remove();L=document.createElementNS(NS,'g');L.id='preL';svg.appendChild(L);
  const vb=svg.viewBox.baseVal,W=vb&&vb.width||400,H=vb&&vb.height||680,y0=(vb&&vb.y||0);
  const C=preNightCalc();const targets=C.res.map(r=>{const el=svg.querySelector(`[data-lot="${r.id}"]`);const p=el&&svgPoint(svg,el);return p?{...r,...p}:null;}).filter(Boolean);
  const meT=[...svg.querySelectorAll('text')].find(t=>t.textContent.trim()==='TU');const mp=meT&&svgPoint(svg,meT);if(mp)targets.push({id:'home',name:'Casa tua',out:C.home,...mp});
  const Z=[];for(let k=0;k<40;k++){const tg=targets.length?targets[k%targets.length]:{x:W/2,y:H/2};const e=document.createElementNS(NS,'circle');e.setAttribute('r','4.5');e.setAttribute('fill','#7bd36b');e.setAttribute('stroke','#140f1f');e.setAttribute('stroke-width','1.5');L.appendChild(e);
    Z.push({e,sx:40+Math.random()*(W-80),sy:y0+H-10,tx:tg.x+(Math.random()-.5)*16,ty:tg.y+(Math.random()-.5)*16,d:Math.random()*2400});}
  const t0=performance.now();(function mv(){const t=performance.now()-t0;Z.forEach(z=>{const p=Math.max(0,Math.min(1,(t-z.d)/6000)),q=1-Math.pow(1-p,2);z.e.setAttribute('cx',z.sx+(z.tx-z.sx)*q);z.e.setAttribute('cy',z.sy+(z.ty-z.sy)*q);});if(t<9000&&document.body.contains(svg))requestAnimationFrame(mv);})();
  sfx('horn');toast(`Anteprima della notte ${C.L}: l’orda esce dal cimitero`);
  setTimeout(()=>{if(!document.body.contains(svg))return;const col={tiene:'#3f9b5f',rischio:'#f7d64a',cade:'#d7263d'},ic={tiene:'✓',rischio:'!',cade:'✕'};
    targets.forEach(t=>{const c=document.createElementNS(NS,'circle');c.setAttribute('cx',t.x);c.setAttribute('cy',t.y-18);c.setAttribute('r','11');c.setAttribute('fill',col[t.out]);c.setAttribute('stroke','#140f1f');c.setAttribute('stroke-width','2.5');L.appendChild(c);
      const x=document.createElementNS(NS,'text');x.setAttribute('x',t.x);x.setAttribute('y',t.y-13.5);x.setAttribute('text-anchor','middle');x.setAttribute('font-size','13');x.setAttribute('font-weight','900');x.setAttribute('fill',t.out==='rischio'?'#140f1f':'#fff');x.textContent=ic[t.out];L.appendChild(x);});
    Z.forEach(z=>z.e.setAttribute('opacity','.3'));sfx(targets.some(t=>t.out==='cade')?'crack':'win');
    const box=$('#preRep');if(box){const k=o=>targets.filter(t=>t.out===o);const risk=k('rischio').concat(k('cade'));
      box.innerHTML=`<div class="panel qrep"><b class="disp" style="font-size:22px">Anteprima della notte ${C.L}</b>
       <div class="grid3" style="margin-top:6px"><div class="stat ok"><b>${k('tiene').length}</b><small>tengono</small></div><div class="stat mid"><b>${k('rischio').length}</b><small>a rischio</small></div><div class="stat ko"><b>${k('cade').length}</b><small>cadrebbero</small></div></div>
       ${risk.length?`<p style="font-weight:400;margin:8px 0 4px">Da rinforzare prima di combattere:</p><ul class="prl">${risk.slice(0,6).map(t=>`<li><span style="color:${col[t.out]}">●</span> ${esc(t.name)} · ${t.out==='cade'?'cadrebbe':'a rischio'}</li>`).join('')}</ul>`:'<p style="font-weight:400;margin-top:8px">Il quartiere è pronto: tutti gli edifici reggono.</p>'}
       <div class="row" style="gap:8px;margin-top:8px"><button class="btn small ghost" data-pr="pot">🛠️ Rinforza</button><button class="btn small" data-pr="go">⚔️ Difendi ora</button></div></div>`;
      box.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{if(b.dataset.pr==='pot'){G.sub='pot';renderHub();window.scrollTo(0,0);}else{window.scrollTo(0,0);const f=$('#fight');if(f)f.click();}});
      box.scrollIntoView({behavior:'smooth',block:'nearest'});}},6800);}
function addPreNight(){if((G.sub||'q')!=='q'||app.querySelector('#preBtn'))return;const hood=app.querySelector('.hood');if(!hood)return;const pan=hood.closest('.panel')||hood;
  pan.insertAdjacentHTML('afterend',`<button class="btn wide alt" id="preBtn" style="margin-top:8px">🎬 Anteprima della notte ${G.level} sul quartiere</button><div id="preRep"></div>`);$('#preBtn').onclick=()=>{vibe();preNight();};}
</script>
