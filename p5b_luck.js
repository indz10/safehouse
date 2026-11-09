<script>
/* =========================================================
   FORTUNA: ruota, gratta e vinci, barattolo di quartiere
   Regole: biglietti solo giocando (mai a pagamento), premi solo
   dentro il gioco, probabilità sempre visibili.
   ========================================================= */
const WHEEL=[
 {l:'10',ic:'🧱',k:'mat',v:10,w:26,c:'#f7d64a'},{l:'5',ic:'💎',k:'gems',v:5,w:16,c:'#9fd3e6'},
 {l:'25',ic:'🧱',k:'mat',v:25,w:18,c:'#f3e9d2'},{l:'1 biglietto',ic:'🎟️',k:'scratch',v:1,w:12,c:'#6fb59a'},
 {l:'60',ic:'🧱',k:'mat',v:60,w:7,c:'#f7d64a'},{l:'+1 giro',ic:'🎡',k:'spins',v:1,w:12,c:'#f08a4b'},
 {l:'15',ic:'💎',k:'gems',v:15,w:6,c:'#9fd3e6'},{l:'JACKPOT',ic:'👑',k:'gems',v:50,w:3,c:'#d7263d'}
];
const SCR=[['🧱','40 Mattoni',g=>{giveMattoni(40,'Gratta e vinci');}],['💎','10 gemme',g=>{g.gems+=10;}],['🍀','2 giri di ruota',g=>{g.spins+=2;}],['🧱','20 Mattoni',g=>{giveMattoni(20,'Gratta e vinci');}]];
function luckInit(){G.spins=G.spins??1;G.scratch=G.scratch??1;G.perk=G.perk||{};G.wins=G.wins||0;G.jar=G.jar||{goal:60,mine:0,fr:{},round:1};G.lastDaily=G.lastDaily||null;}
function dailyBonus(){luckInit();const today=new Date().toDateString();if(G.lastDaily===today)return;G.lastDaily=today;
  const team=G.friends?G.friends.filter(f=>f.on&&houseOfFriend(f.id)).length:0;G.spins+=1+team;
  if(G.famOut){const f=G.friends.find(x=>x.id===G.famOut);const c=15*famSize(G.level);G.coins+=c;setTimeout(()=>toast(`La tua famiglia ha difeso il quartiere di @${f?f.nick:'un amico'}: +${c} 🪙`),2600);}
  setTimeout(()=>toast(team?`Giro del giorno + ${team} bonus squadra: i tuoi amici-inquilini hanno giocato oggi 🎡`:'Giro della ruota del giorno 🎡'),400);}
function jarAfterWave(win){luckInit();G.jar.mine+=win?3:1;(G.friends||[]).forEach(f=>{if(Math.random()<(f.on?.8:.35))G.jar.fr[f.id]=(G.jar.fr[f.id]||0)+1+Math.floor(Math.random()*3);});}
function jarTotal(){return G.jar.mine+Object.values(G.jar.fr).reduce((a,b)=>a+b,0);}
function luckHTML(){
  luckInit();const tot=jarTotal(),pct=Math.min(100,tot/G.jar.goal*100);const fr=G.friends||[];const absent=fr.filter(f=>!G.jar.fr[f.id]);
  const segs=[['Tu',G.jar.mine,'#f7d64a'],...fr.map(f=>['@'+f.nick,G.jar.fr[f.id]||0,f.col])];
  return`<h3 style="margin:18px 0 8px">Fortuna 🍀</h3>
   <div class="luck">
     <button class="luckc" data-luck="wheel"><span class="lk">🎡</span><b>Ruota del superstite</b><small>${G.spins} ${G.spins===1?'giro':'giri'}</small></button>
     <button class="luckc" data-luck="scratch"><span class="lk">🎟️</span><b>Gratta e vinci</b><small>${G.scratch} ${G.scratch===1?'biglietto':'biglietti'}</small></button>
   </div>
   <p class="muted" style="font-size:12px;margin:6px 0 10px">Giri e biglietti si guadagnano solo giocando: 1 giro al giorno (+1 per ogni amico che abita da te e ha giocato oggi), 1 giro ogni 3 ondate vinte, 1 biglietto per ogni boss e ogni medaglia.</p>
   <div class="panel">
     <div class="row spread"><b>🫙 Barattolo del quartiere · giro ${G.jar.round}</b><small class="muted">${tot}/${G.jar.goal} biglietti</small></div>
     <div class="jarbar">${segs.map(([n,v,c])=>v?`<span title="${esc(n)}" style="width:${Math.min(100,v/G.jar.goal*100)}%;background:${c}"></span>`:'').join('')}</div>
     <div class="jarleg">${segs.map(([n,v,c])=>`<span><i style="background:${c}"></i>${esc(n)} ${v}</span>`).join('')}</div>
     <p style="font-weight:400;font-size:13px;margin:6px 0">Ogni ondata giocata da te o dai tuoi amici aggiunge biglietti. Quando il barattolo è pieno si estrae un premio <b>per tutto il gruppo</b>, ${absent.length?`<b>doppio se giocano tutti</b>. Mancano: ${absent.map(f=>'@'+esc(f.nick)).join(', ')}.`:'<b>doppio perché avete giocato tutti</b> 🎉'}</p>
     <div class="row wrap" style="gap:8px">${pct>=100?'<button class="btn small" id="jarDraw">Estrai il premio del gruppo</button>':''}${absent.length?`<button class="btn small ghost" id="jarPoke">Sprona chi manca</button>`:''}</div>
   </div>
   ${G.perk.house||G.perk.power?`<div class="notice" style="margin-top:8px">Pronti per la prossima ondata: ${G.perk.house?'🛡️ Casa blindata':''}${G.perk.house&&G.perk.power?' · ':''}${G.perk.power?'💪 Superpugno':''}</div>`:''}`;
}
function bindLuck(){
  app.querySelectorAll('[data-luck]').forEach(b=>b.onclick=()=>b.dataset.luck==='wheel'?wheelSheet():scratchSheet());
  const d=$('#jarDraw');if(d)d.onclick=()=>{const all=(G.friends||[]).every(f=>G.jar.fr[f.id]);const m=all?2:1;giveMattoni(20*m,'Barattolo');G.gems+=10*m;sfx('win');
    toast(`Estrazione del quartiere: +${100*m} 🪙 e +${10*m} 💎 a te e a ogni amico${all?' (doppio: avete giocato tutti!)':''}`);G.jar={goal:Math.round(G.jar.goal*1.25),mine:0,fr:{},round:G.jar.round+1};renderHub();};
  const p=$('#jarPoke');if(p)p.onclick=()=>{const ab=(G.friends||[]).filter(f=>!G.jar.fr[f.id]);toast(`Promemoria inviato a ${ab.map(f=>'@'+f.nick).join(', ')}: “Manca solo il tuo biglietto!”`);vibe();};
}
function wheelSheet(){
  const tw=WHEEL.reduce((a,s)=>a+s.w,0);const n=WHEEL.length,A=360/n;
  const sl=WHEEL.map((s,i)=>{const a0=(i*A-90-A/2)*Math.PI/180,a1=((i+1)*A-90-A/2)*Math.PI/180;const r=120;
    const x0=Math.cos(a0)*r,y0=Math.sin(a0)*r,x1=Math.cos(a1)*r,y1=Math.sin(a1)*r;const am=(i*A-90)*Math.PI/180;
    return`<path d="M0 0 L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}Z" fill="${s.c}" stroke="${INK}" stroke-width="3"/>
      <g transform="rotate(${i*A}) translate(0 -84)"><text text-anchor="middle" font-size="22">${s.ic}</text><text y="22" text-anchor="middle" font-family="Bangers,Impact" font-size="${s.l.length>6?12:16}" fill="${INK}">${s.l}</text></g>`;}).join('');
  openSheet('🎡 Ruota del superstite',`
    <div class="wheelbox"><div class="pointer">▼</div><svg viewBox="-130 -130 260 260" class="wheel" id="wheel">${sl}<circle r="22" fill="${INK}"/><circle r="12" fill="#f7d64a"/></svg></div>
    <button class="btn wide" id="spin" ${G.spins<1?'disabled':''}>${G.spins<1?'Nessun giro disponibile':`Gira (${G.spins} ${G.spins===1?'giro':'giri'})`}</button>
    <p id="wres" class="wres"></p>
    <details class="odds"><summary>Probabilità dei premi</summary>${WHEEL.map(s=>`<div class="row spread"><span>${s.ic} ${s.l}${s.k==='mat'?' Mattoni':s.k==='scratch'?'':s.k==='spins'?'':s.k==='gems'&&s.l!=='JACKPOT'?' gemme':s.l==='JACKPOT'?' (50 gemme)':''}</span><b>${(s.w/tw*100).toFixed(1).replace('.',',')}%</b></div>`).join('')}</details>`,
  card=>{let rot=G.wheelRot||0;const w=card.querySelector('#wheel');w.style.transform=`rotate(${rot}deg)`;
    card.querySelector('#spin').onclick=e=>{if(G.spins<1||card.spinning)return;card.spinning=true;G.spins--;e.target.disabled=true;sfx('tap');
      let r=Math.random()*tw,i=0;for(;i<n;i++){r-=WHEEL[i].w;if(r<=0)break;}i=Math.min(i,n-1);
      const target=360-i*A+(Math.random()-.5)*A*.6;rot=rot+360*5+((target-rot%360)+360)%360;G.wheelRot=rot;
      w.style.transition='transform 3.6s cubic-bezier(.12,.75,.15,1)';w.style.transform=`rotate(${rot}deg)`;
      let tick=0;const tk=setInterval(()=>{if(++tick>14)return clearInterval(tk);sfx('tap');},200);
      setTimeout(()=>{const s=WHEEL[i];if(s.k==='mat')giveMattoni(s.v,'Ruota');if(s.k==='gems')G.gems+=s.v;if(s.k==='scratch')G.scratch=(G.scratch||0)+s.v;if(s.k==='spins')G.spins=(G.spins||0)+s.v;
        sfx(s.l==='JACKPOT'?'win':'coin');card.querySelector('#wres').innerHTML=`<span class="sfx" style="font-size:30px">${s.l==='JACKPOT'?'JACKPOT!':'HAI VINTO!'}</span><br>${s.ic} ${s.k==='mat'?s.v+' Mattoni':s.k==='gems'?s.v+' gemme':s.k==='scratch'?'1 gratta e vinci':'1 giro di ruota in più'}`;
        card.spinning=false;const b=card.querySelector('#spin');b.disabled=G.spins<1;b.textContent=G.spins<1?'Nessun giro disponibile':`Gira ancora (${G.spins})`;renderHub();},3700);};});
}
function scratchSheet(){
  if(G.scratch<1){openSheet('🎟️ Gratta e vinci','<p>Non hai biglietti. Li guadagni scacciando un boss o conquistando una medaglia.</p>');return;}
  G.scratch--;const win=Math.random()<.4;const pick=SCR[Math.floor(Math.random()*SCR.length)];
  let cells;if(win)cells=[pick,pick,pick];else{do{cells=[0,1,2].map(()=>SCR[Math.floor(Math.random()*SCR.length)]);}while(cells[0]===cells[1]&&cells[1]===cells[2]);}
  openSheet('🎟️ Gratta e vinci della notte',`
    <p class="muted" style="margin-bottom:8px">Gratta con il dito: tre simboli uguali vincono. Vince circa 1 biglietto su 2,5.</p>
    <div class="ticket"><div class="cells">${cells.map(c=>`<span>${c[0]}</span>`).join('')}</div><canvas id="scr" width="600" height="220" aria-label="Superficie da grattare"></canvas></div>
    <p id="sres" class="wres"></p>
    <div class="legendp">${SCR.map(s=>`<span>${s[0]}${s[0]}${s[0]} = ${s[1]}</span>`).join('')}</div>`,
  card=>{const cv=card.querySelector('#scr'),ctx=cv.getContext('2d');
    const g=ctx.createLinearGradient(0,0,600,220);g.addColorStop(0,'#9aa4b0');g.addColorStop(.5,'#cfd5dc');g.addColorStop(1,'#8a939e');ctx.fillStyle=g;ctx.fillRect(0,0,600,220);
    ctx.fillStyle='#140f1f';ctx.font='54px Bangers, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('GRATTA QUI',300,128);
    for(let i=0;i<200;i++){ctx.fillStyle=`rgba(255,255,255,${Math.random()*.25})`;ctx.fillRect(Math.random()*600,Math.random()*220,2,2);}
    let done=false,down=false,n=0;
    const at=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*600,(e.clientY-r.top)/r.height*220];};
    const scratch=e=>{if(!down||done)return;e.preventDefault();const[x,y]=at(e);ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(x,y,34,0,7);ctx.fill();if(++n%6===0){sfx('tap');check();}};
    const check=()=>{const d=ctx.getImageData(0,0,600,220).data;let clear=0;for(let i=3;i<d.length;i+=64)if(d[i]===0)clear++;if(clear/(d.length/64)>.55)reveal();};
    const reveal=()=>{if(done)return;done=true;cv.style.transition='opacity .5s';cv.style.opacity=0;
      if(win){pick[2](G);sfx('win');card.querySelector('#sres').innerHTML=`<span class="sfx" style="font-size:30px">TRIS!</span><br>Hai vinto ${pick[1]}`;}
      else{sfx('lose');card.querySelector('#sres').innerHTML='Niente tris stavolta. Il prossimo biglietto arriva con un boss o una medaglia.';}
      renderHub();};
    cv.addEventListener('pointerdown',e=>{down=true;cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);scratch(e);});
    cv.addEventListener('pointermove',scratch);['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,()=>{down=false;}));
  });
}
</script>
