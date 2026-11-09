<script>
/* =========================================================
   ORDA · GIORNO E NOTTE
   Giorno: spedizioni con la tua squadra (tempo reale) → materiali
           laboratorio → kit montati automaticamente la notte
   Notte:  piano di difesa e battaglia (già esistenti)
   Nella versione online i tempi sono in minuti/ore; qui in secondi.
   ========================================================= */
const MATS={legno:'🪵',metallo:'🔩',batterie:'🔋',medicine:'💊',cibo:'🥫'};
const EXPS=[
 {id:'spon',n:'Magazzino di Ferramenta Volta',ic:'⭐',t:25,risk:0,loot:{legno:[2,3],metallo:[2,3]},sp:'ferr',d:'Offerto dallo sponsor: una volta al giorno, senza rischi'},
 {id:'super',n:'Supermercato abbandonato',ic:'🛒',t:35,risk:.15,loot:{cibo:[2,4],legno:[0,2]},d:'Vicino e sicuro: cibo e qualche asse'},
 {id:'ferr',n:'Cantiere dietro la chiesa',ic:'🏗️',t:55,risk:.25,loot:{metallo:[2,4],legno:[1,3]},d:'Metallo e legno per trappole e barricate'},
 {id:'osp',n:'Vecchio ospedale',ic:'🏥',t:80,risk:.35,loot:{medicine:[1,3],batterie:[0,2]},d:'Medicine preziose, ma l’orda è vicina'},
 {id:'cen',n:'Centrale elettrica',ic:'⚡',t:110,risk:.45,loot:{batterie:[2,4],metallo:[1,2]},d:'Batterie per le torrette: il posto più pericoloso'}];
const RECIPES=[
 {id:'trap',n:'Kit trappole',ic:'🪤',cost:{metallo:2,legno:1},eff:'+3 trappole sull’edificio più attaccato'},
 {id:'bar',n:'Barricata rinforzata',ic:'🪵',cost:{legno:3,metallo:1},eff:'+40% barricata a casa tua'},
 {id:'tur',n:'Torretta',ic:'🎯',cost:{metallo:2,batterie:2},eff:'+1 torretta a casa tua'},
 {id:'med',n:'Kit medico',ic:'⛑️',cost:{medicine:2,cibo:1},eff:'Casa tua parte con il 25% di resistenza in più'}];
function dayInit(){G.mat=G.mat||{legno:2,metallo:1,batterie:0,medicine:0,cibo:2};G.kit=G.kit||{trap:0,bar:0,tur:0,med:0};G.exp=G.exp||[];G.expDay=G.expDay||{};}
function squad(){const s=[{id:'fam',n:'La tua famiglia',p:2}];Object.entries(G.lots||{}).forEach(([id,b])=>{const t=tenOf(b);if(t&&!b.owner)s.push({id,n:t.type==='friend'?'@'+t.f.nick:TENANTS[t.role].name,p:1+(b.prep||1)});});return s;}
function busy(id){return G.exp.some(e=>e.who.includes(id));}
function dayHTML(){dayInit();const now=Date.now();const today=new Date().toDateString();
  return`<div class="panel dayp"><div class="row spread"><b class="disp" style="font-size:24px">☀️ Giorno: prepara la notte</b><span class="mats">${Object.entries(MATS).map(([k,i])=>`<span title="${k}">${i} ${G.mat[k]}</span>`).join('')}</span></div>
   <p style="font-weight:400;font-size:13px;margin:4px 0 8px">Manda la squadra in spedizione, torna a raccogliere, costruisci in laboratorio. I kit si montano da soli quando parte la notte.</p>
   ${G.exp.map((e,i)=>{const X=EXPS.find(x=>x.id===e.id)||{n:'Spedizione',ic:'🎒'};const done=now>=e.end;const pc=Math.min(100,(now-e.start)/(e.end-e.start)*100);return`<div class="exprun"><span>${X.ic}</span><div style="flex:1"><b>${X.n}</b><small>${e.who.length} in squadra · ${done?'rientrati':'rientro tra '+Math.ceil((e.end-now)/1000)+' s'}</small><div class="vbar"><span style="width:${pc}%"></span></div></div>${done?`<button class="btn small" data-expok="${i}">Raccogli</button>`:''}</div>`;}).join('')}
   <div class="explist">${EXPS.filter(x=>!x.hide).map(x=>{const used=x.sp&&G.expDay[x.id]===today;return`<button class="expc ${x.sp?'sp':''}" data-exp="${x.id}" ${used?'disabled':''}><span class="ei">${x.ic}</span><b>${x.n}</b><small>${x.d}</small><small>⏱ ${x.t} s · rischio ${Math.round(x.risk*100)}% · ${Object.keys(x.loot).map(k=>MATS[k]).join(' ')}</small>${used?'<small><b>Già fatta oggi</b></small>':''}</button>`;}).join('')}</div>
   <p class="disp" style="font-size:20px;margin:10px 0 6px">🧪 Laboratorio</p>
   <div class="recs">${RECIPES.map(r=>{const ok=Object.entries(r.cost).every(([k,v])=>G.mat[k]>=v);return`<button class="rec" data-rec="${r.id}" ${ok?'':'disabled'}><span>${r.ic}</span><b>${r.n} ${G.kit[r.id]?'×'+G.kit[r.id]:''}</b><small>${Object.entries(r.cost).map(([k,v])=>MATS[k]+v).join(' ')} → ${r.eff}</small></button>`;}).join('')}</div></div>`;}
function expSheet(id){const X=EXPS.find(x=>x.id===id);const sq=squad().filter(s=>!busy(s.id));const sel=new Set(sq.slice(0,1).map(s=>s.id));
  const draw=()=>openSheet(`${X.ic} ${X.n}`,`<p style="font-weight:400;margin-bottom:8px">${X.d}. Durata ${X.t} secondi (online: minuti o ore).</p>
    ${sq.length?sq.map(s=>`<button class="choice" data-sq="${s.id}"><span class="ci">${sel.has(s.id)?'✅':'⬜'}</span><span><b>${esc(s.n)}</b><small>forza ${s.p}</small></span><span class="cp">${sel.has(s.id)?'In squadra':'Aggiungi'}</span></button>`).join(''):'<p class="notice">Sono tutti fuori in spedizione: aspetta che rientrino.</p>'}
    <div class="notice" style="margin:8px 0">Probabilità di successo: <b>${Math.round(Math.min(.98,1-X.risk+[...sel].reduce((a,id)=>a+(sq.find(s=>s.id===id)||{p:0}).p*.05,0))*100)}%</b>. Più persone e più addestrate = meno rischi.</div>
    <button class="btn wide" data-sgo ${sel.size?'':'disabled'}>Parti</button>`,card=>{
    card.querySelectorAll('[data-sq]').forEach(b=>b.onclick=()=>{const k=b.dataset.sq;sel.has(k)?sel.delete(k):sel.add(k);draw();});
    card.querySelector('[data-sgo]').onclick=()=>{const now=Date.now();G.exp.push({id,who:[...sel],start:now,end:now+X.t*1000,pow:[...sel].reduce((a,id)=>a+(sq.find(s=>s.id===id)||{p:0}).p,0)});if(X.sp)G.expDay[id]=new Date().toDateString();closeSheet();toast('Squadra partita');sfx('tap');renderHub();if(window.__dayT)clearInterval(window.__dayT);window.__dayT=setInterval(()=>{if(S.tab==='orda'&&G.view==='hub'&&(G.sub||'q')==='q'&&!document.querySelector('#sheet.open'))dayRefresh();},1000);};});
  draw();}
function dayRefresh(){const el=app.querySelector('.dayp');if(!el)return;const n=document.createElement('div');n.innerHTML=dayHTML();el.replaceWith(n.firstElementChild);bindDay();}
function bindDay(){app.querySelectorAll('[data-exp]').forEach(b=>b.onclick=()=>expSheet(b.dataset.exp));
  app.querySelectorAll('[data-expok]').forEach(b=>b.onclick=()=>{const e=G.exp[+b.dataset.expok];const X=EXPS.find(x=>x.id===e.id)||{risk:.2,loot:{cibo:[1,2]}};const ok=Math.random()<Math.min(.98,1-X.risk+e.pow*.05);
    const got={};Object.entries(X.loot).forEach(([k,[a,c]])=>{let n=a+Math.floor(Math.random()*(c-a+1));if(!ok)n=Math.floor(n/2);if(n>0){G.mat[k]+=n;got[k]=n;}});
    G.exp.splice(+b.dataset.expok,1);try{if(window.onExpDone)window.onExpDone(e.id,ok);}catch(x){}sfx(ok?'coin':'crack');if(typeof objAdd==='function'){}
    openSheet(ok?'Spedizione riuscita!':'Spedizione difficile',`<p style="font-size:18px">${ok?'La squadra torna con:':'Attaccati sulla via del ritorno, salvano solo:'}</p><p class="disp" style="font-size:34px;margin:10px 0">${Object.entries(got).map(([k,n])=>MATS[k]+' +'+n).join(' · ')||'niente'}</p>${X.sp?`<p class="notice">Materiali offerti da <b>${(SPONSORS[X.sp]||{name:'uno sponsor della zona'}).name}</b>. ${SP_OFF&&SP_OFF[X.sp]?'Nella vita vera: '+SP_OFF[X.sp]:''}</p>`:''}`);renderHub();});
  app.querySelectorAll('[data-rec]').forEach(b=>b.onclick=()=>{const r=RECIPES.find(x=>x.id===b.dataset.rec);if(!Object.entries(r.cost).every(([k,v])=>G.mat[k]>=v))return;Object.entries(r.cost).forEach(([k,v])=>G.mat[k]-=v);G.kit[r.id]++;sfx('coin');toast(`${r.ic} ${r.n} pronto per stanotte`);renderHub();});}
</script>
