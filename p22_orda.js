<script>
/* =========================================================
   L'ORDA DEL MONDO (semplice da usare, stesso concetto)
   - ogni giorno alle 9:00 e alle 21:00 un'orda attacca tutte le
     case del mondo unico, in automatico (esito dal server)
   - prima: "Prepara le case" (+15 difesa) e potenziale
   - dopo: guardi l'assalto sulla mappa vera e riscatti i premi
   - le notti giocate a mano restano: "Difendi tu"
   - giro guidato facoltativo
   ========================================================= */
window.OR={s:null,t:0,busy:false};
const orTime=t=>new Date(t).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
function orLeft(t){const ms=new Date(t)-Date.now();if(ms<=0)return'adesso';const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);return h?`${h} h ${m} min`:`${m} min`;}
function orLive(){return OR.s&&Date.now()-new Date(OR.s.prev_at)<20*60*1000;}
async function orLoadBase(force){if(OR.busy||(!force&&Date.now()-OR.t<45000))return OR.s;if(typeof SB==='undefined'||!SB)return null;OR.busy=true;
  try{const{data,error}=await SB.rpc('world_raid_status');if(!error&&data){OR.s=data;OR.t=Date.now();orRefresh();}}catch(e){}finally{OR.busy=false;}return OR.s;}
function orChance(){const m=W.m;if(!m)return null;const prep=OR.s&&OR.s.prepared;const L=[];if(m.home)L.push({lv:1,home:true});(m.houses||[]).forEach(h=>L.push({lv:h.level,home:false}));if(!L.length)return null;
  const p=L.map(x=>{const pw=45+12*x.lv+(prep?15:0)+(x.home?5:0);return Math.max(0,Math.min(1,(pw-40+1)/60));});return Math.round(p.reduce((a,b)=>a+b,0)/p.length*100);}
/* ---- pannello: la cosa principale del gioco ---- */
function orPanelHTML(){const s=OR.s;
  if(!S.user)return`<div class="panel opan"><b class="disp opt">🧟 L’orda del mondo</b><p class="osub">Ogni giorno alle 9 e alle 21 un’orda attacca tutte le case del mondo vero. Accedi per difendere la tua.</p><button class="btn" onclick="loginSheet()">Accedi</button></div>`;
  if(!s||!s.next_at)return`<div class="panel opan"><b class="disp opt">🧟 L’orda del mondo</b><p class="osub"><span class="spin"></span> Controllo quando arriva… (serve il blocco SQL “orda del mondo” su Supabase)</p></div>`;
  const live=orLive(),ch=orChance();const nH=s.total||0;
  const last=nH?`<div class="olast ${s.held===s.total?'ok':''}"><b>Ultima orda · ore ${orTime(s.prev_at)}</b><span>${s.held===s.total?'🛡️ Tutte le tue case hanno tenuto!':`🛡️ ${s.held} ${s.held===1?'tenuta':'tenute'} · 💥 ${s.total-s.held} ${s.total-s.held===1?'sfondata':'sfondate'}`}</span>
     ${s.claimed?'<small>✅ Premi riscattati</small>':`<button class="btn" data-ocl>🎁 ${s.bounty?'🎯 taglie incluse · ':''}Riscatta: 🧱 ${s.mattoni} + 🪙 ${30*s.held}${s.held===s.total?' + 💎 2':''}</button>`}</div>`:'';
  return`<div class="panel opan ${live?'live':''}"><div class="row spread"><b class="disp opt">🧟 L’orda del mondo</b>${live?'<span class="olive">● IN CORSO</span>':''}</div>
   <div class="onext"><span>${s.next_bonus?`<span class="rbon">${s.next_bonus>0?'+':''}${s.next_bonus} difesa da aiuti/orde</span> `:''}Prossima orda</span><b>${orTime(s.next_at)}</b><small>tra ${orLeft(s.next_at)}</small></div>
   <div class="ostep"><div class="${s.prepared?'done':''}"><i>1</i><b>Prepara</b>${s.prepared?'<small>✅ Case pronte (+15 difesa)</small>':'<button class="btn small" data-oprep>🛡️ Prepara le case</button>'}</div>
     <div><i>2</i><b>Fortifica</b><small>${ch!=null?`Probabilità di tenere: <b>${ch}%</b>`:'Valuta la casa per entrare'}</small><button class="btn small ghost" data-ofort>🔨 Fortifica</button></div>
     <div><i>3</i><b>Dopo l’orda</b><small>Guarda l’assalto e riscatta</small><button class="btn small ghost" data-owatch>👀 Guarda l’assalto</button></div></div>
   ${last}
   <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px"><button class="bzc-rep" data-ocal style="margin:0">📅 Ricordamelo ogni giorno</button><button class="bzc-rep" data-otour style="margin:0">🧭 Giro guidato</button></div></div>`;}
function orBind(root){const p=(root||document).querySelector('.opan');if(!p)return;
  const pr=p.querySelector('[data-oprep]');if(pr)pr.onclick=async()=>{pr.disabled=true;try{const{data}=await SB.rpc('world_prepare');toast(data&&data.ok?'🛡️ Case preparate: +15 difesa per la prossima orda':'Non riuscito');}catch(e){toast('Non riuscito');}orLoad(true);};
  const cl=p.querySelector('[data-ocl]');if(cl)cl.onclick=async()=>{cl.disabled=true;try{const{data}=await SB.rpc('world_raid_claim');
      if(data&&data.ok){if(typeof G!=='undefined'&&G.type){G.coins+=30*data.held;if(data.held===data.total)G.gems+=2;G.spins=(G.spins||0)+1;}try{saveLocal();sfx('coin');vibe();}catch(e){}toast(`🎁 +🧱 ${data.mattoni} · +🪙 ${30*data.held}${data.held===data.total?' · +💎 2':''} · +1 giro di ruota 🎡`);if(typeof wMine==='function')wMine(true);}
      else toast(data&&data.msg||'Non riuscito');}catch(e){toast('Non riuscito');}orLoad(true);};
  const f=p.querySelector('[data-ofort]');if(f)f.onclick=()=>orFortify();
  const wa=p.querySelector('[data-owatch]');if(wa)wa.onclick=()=>orWatch();
  const ca=p.querySelector('[data-ocal]');if(ca)ca.onclick=orCalendar;const to=p.querySelector('[data-otour]');if(to)to.onclick=()=>orTour(0);}
function orRefreshBase(){document.querySelectorAll('.opan').forEach(p=>{const n=document.createElement('div');n.innerHTML=orPanelHTML();const np=n.firstElementChild;if(p.dataset.grp)np.dataset.grp=p.dataset.grp;const par=p.parentElement;p.replaceWith(np);orBind(par);});
  const b=document.querySelector('.obanner');if(b){const n=document.createElement('div');n.innerHTML=orBannerHTML();b.replaceWith(n.firstElementChild);orBindBanner();}}
function orFortify(){const m=W.m;if(!m){toast('Accedi e valuta la casa');return;}const L=[];if(m.home)L.push({bid:m.home.building_id,lat:m.home.lat,lon:m.home.lon,t:'❤️ Casa tua'});(m.houses||[]).forEach(h=>L.push({bid:h.building_id,lat:h.lat,lon:h.lon,t:`🔑 Casa ${h.building_id.slice(1,7)} · livello ${h.level}`}));
  openSheet('🔨 Fortifica le tue case',`<p style="font-weight:400">Ogni livello dà <b>+12 difesa</b> contro l’orda (massimo 5). “Prepara” dà +15. Nel gioco, i potenziamenti della casa la rendono più forte nelle notti.</p>${L.map((x,i)=>`<button class="strow" data-of="${i}"><span>🏠</span><div><b>${x.t}</b><small>Tocca per potenziarla</small></div></button>`).join('')||'<p class="muted">Ancora nessuna casa nel mondo: valuta la tua.</p>'}
   <button class="btn ghost small" data-ogame style="margin-top:10px">🏠 Potenziamenti della casa nel gioco</button>`,card=>{
   card.querySelectorAll('[data-of]').forEach(b=>b.onclick=()=>{const x=L[+b.dataset.of];wSheet(x.bid,x.lat,x.lon);});
   card.querySelector('[data-ogame]').onclick=()=>{closeSheet();G.sub='pot';go('orda');};});}
/* promemoria nel calendario del telefono (8:45 e 20:45, ogni giorno) */
function orCalendar(){const d=new Date();const pad=n=>String(n).padStart(2,'0');const day=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const ev=(hm,lab,id)=>`BEGIN:VEVENT\r\nUID:zsh-orda-${id}@safehousezombie\r\nDTSTAMP:${day}T000000Z\r\nDTSTART;TZID=Europe/Rome:${day}T${hm}00\r\nDURATION:PT15M\r\nRRULE:FREQ=DAILY\r\nSUMMARY:🧟 Orda del mondo alle ${lab}\r\nDESCRIPTION:Prepara le case su ZombieSafeHouse\\, poi guarda l’assalto e riscatta i premi.\r\nURL:${location.origin}/\r\nBEGIN:VALARM\r\nTRIGGER:PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:Prepara le case: l’orda arriva tra 15 minuti\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
  const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//INDZ//ZombieSafeHouse//IT\r\n${ev('0845','9:00','mattina')}${ev('2045','21:00','sera')}END:VCALENDAR\r\n`;
  const a=document.createElement('a');a.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(ics);a.download='orda-del-mondo.ics';document.body.appendChild(a);a.click();a.remove();
  toast('📅 Apri il file e tocca “Aggiungi tutto”: ti avvisa alle 8:45 e alle 20:45');}
/* ---- striscia in cima: sempre chiaro cosa fare ---- */
function orBannerHTML(){const s=OR.s;if(!S.user||!s||!s.next_at)return'<div class="obanner" hidden></div>';
  const todo=s.total&&!s.claimed?`<button class="btn small" data-bcl>🎁 Riscatta l’orda delle ${orTime(s.prev_at)}</button>`:!s.prepared?'<button class="btn small" data-bpr>🛡️ Prepara le case</button>':'<span class="ok">✅ Case pronte</span>';
  return`<div class="obanner ${orLive()?'live':''}"><span>🧟 ${orLive()?'<b>Orda in corso!</b>':`Prossima orda alle <b>${orTime(s.next_at)}</b> · tra ${orLeft(s.next_at)}`}</span>${todo}</div>`;}
function orBindBanner(){const b=document.querySelector('.obanner');if(!b)return;const c=b.querySelector('[data-bcl]');if(c)c.onclick=()=>{G.sub='q';go('orda');setTimeout(()=>{const x=document.querySelector('[data-ocl]');if(x)x.scrollIntoView({behavior:'smooth',block:'center'});},400);};
  const p=b.querySelector('[data-bpr]');if(p)p.onclick=async()=>{p.disabled=true;try{await SB.rpc('world_prepare');toast('🛡️ Case preparate: +15 difesa');}catch(e){}orLoad(true);};}
function orPutBanner(){try{if(!S.user||!OR.s||app.querySelector('.obanner')||!['mappa','valuta'].includes(S.tab)||(S.tab==='orda'&&G.view==='battle'))return;const h=document.createElement('div');h.innerHTML=orBannerHTML();app.insertBefore(h.firstElementChild,app.firstChild);orBindBanner();}catch(e){}}
/* ---- nel gioco: l'orda del mondo in cima, le notti a mano ("Difendi tu") sotto ---- */
/* ---- l'assalto sulla mappa vera (visto da tutti) ---- */
async function orViewBase(lm){if(!lm||!lm.map||typeof SB==='undefined'||!SB)return[];const b=lm.map.getBounds();
  try{const{data}=await SB.rpc('world_raid_view',{p_minlat:b.getSouth(),p_minlon:b.getWest(),p_maxlat:b.getNorth(),p_maxlon:b.getEast()});return data||[];}catch(e){return[];}}
async function orBadges(lm){if(!lm||!lm.map||lm.map.getZoom()<13)return;const rows=await orView(lm);(lm._ob||[]).forEach(x=>x.remove());lm._ob=[];
  rows.forEach(r=>{const el=elDiv('lm-ob '+(r.held?'held':'fell')+(r.mine?' mine':''),r.held?'🛡️':'💥');lm._ob.push(new maplibregl.Marker({element:el,anchor:'bottom',offset:[14,-14]}).setLngLat([r.lon,r.lat]).addTo(lm.map));});}
async function orPlay(lm){if(!lm||!lm.map||lm._playing)return;lm._playing=true;const map=lm.map;const rows=(await orView(lm)).slice(0,30);const box=map.getContainer().closest('.lmap')||map.getContainer();
  const ban=document.createElement('div');ban.className='oplay';ban.innerHTML=`<b>🧟 ORDA DELLE ${OR.s?orTime(OR.s.prev_at):''}</b><span>${rows.length?`${(n=>n===1?'1 casa ha tenuto':n+' case hanno tenuto')(rows.filter(r=>r.held).length)} · ${(n=>n===1?'1 sfondata':n+' sfondate')(rows.filter(r=>!r.held).length)}`:'Nessuna casa del mondo in questa zona: allarga la mappa'}</span>`;box.appendChild(ban);
  (lm._ob||[]).forEach(x=>x.remove());lm._ob=[];const zs=[];const k=Math.cos((rows[0]?rows[0].lat:45)*Math.PI/180);
  rows.forEach((r,i)=>{for(let j=0;j<4;j++){const a=Math.random()*Math.PI*2,d=220+Math.random()*180;const s=[r.lat+Math.sin(a)*d/110540,r.lon+Math.cos(a)*d/(111320*k)];
    const el=elDiv('lm-z','🧟');const mk=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([s[1],s[0]]).addTo(map);zs.push({mk,s,r,t0:performance.now()+i*180+j*260,dur:5200+Math.random()*2200});}});
  const end=()=>{zs.forEach(z=>z.mk.remove());setTimeout(()=>{ban.remove();lm._playing=false;},2500);orBadges(lm);};
  const step=now=>{let alive=0;zs.forEach(z=>{const p=Math.max(0,Math.min(1,(now-z.t0)/z.dur));if(p<1)alive++;const lat=z.s[0]+(z.r.lat-z.s[0])*p,lon=z.s[1]+(z.r.lon-z.s[1])*p;z.mk.setLngLat([lon,lat]);
      if(p>=1&&!z.hit){z.hit=1;z.mk.getElement().textContent=z.r.held?'🛡️':'💥';z.mk.getElement().classList.add('hit');}});if(alive)requestAnimationFrame(step);else end();};
  if(rows.length)requestAnimationFrame(step);else end();}
function orWatch(){S.zv='mondo';go('mappa');let n=0;const t=setInterval(()=>{const lm=(window.__zlms||[]).slice(-1)[0];n++;if(lm&&lm.map&&document.body.contains(lm.map.getContainer())){clearInterval(t);setTimeout(()=>orPlay(lm),900);}if(n>40)clearInterval(t);},300);}
/* ---- giro guidato (facoltativo) ---- */
const OT=[
 {tab:()=>{S.zv='mondo';go('mappa');},sel:'.lmap',t:'Questa è la <b>mappa vera</b>. La casetta rossa <b>TU</b> è casa tua: nel mondo unico è tua e nessuno può comprarla.'},
 {tab:null,sel:'.lmap',t:'Tocca una <b>casa qualsiasi</b>: se è libera la compri con i <b>🧱 Mattoni</b>. Se un giorno chi ci abita si iscrive, a te torna tutto, più un bonus.'},
 {tab:null,sel:'.lm-orda',t:'Con <b>🧟 Orda</b> guardi l’ultimo assalto sulla mappa: 🛡️ case che hanno tenuto, 💥 case sfondate. Anche quelle degli altri.'},
 {tab:()=>{G.sub='q';go('orda');},sel:'.opan',t:'Ogni giorno alle <b>9</b> e alle <b>21</b> arriva l’<b>orda del mondo</b>, da sola. Qui vedi quando.'},
 {tab:null,sel:'.opan .ostep',t:'Prima: tocca <b>Prepara</b> (+15 difesa) e, se vuoi, <b>Fortifica</b>. Dopo: <b>guarda l’assalto</b> e <b>riscatta</b> i premi. Tutto qui.'},
 {tab:null,sel:'.wpan',t:'Qui ci sono i tuoi <b>Mattoni</b>, le tue case e gli <b>affitti</b> da riscuotere ogni giorno.'},
 {tab:null,sel:'.tmp',t:'Ogni giorno <b>3 missioni</b> sui posti veri della tua zona: premi in più.'},
 {tab:null,sel:'.odyou',t:'E se vuoi giocare di più: <b>Difendi tu</b> la casa nelle notti, con carte e abilità. È facoltativo.'}];
function orTour(i){try{G.tourDone=1;}catch(e){}if(i===0)closeSheet();const st=OT[i];document.querySelectorAll('.otour').forEach(x=>x.remove());if(!st){toast('🧭 Giro finito: buona difesa!');return;}
  if(st.tab)st.tab();setTimeout(()=>{const el=[...document.querySelectorAll(st.sel)].find(e=>e.offsetParent!==null);if(!el){orTour(i+1);return;}
    el.scrollIntoView({block:'center'});setTimeout(()=>{const r=el.getBoundingClientRect();const o=document.createElement('div');o.className='otour';
      const top=Math.min(innerHeight-230,r.bottom+190<innerHeight?r.bottom+12:Math.max(12,r.top-200));
      o.innerHTML=`<div class="ot-hole" style="left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${Math.min(r.height+12,innerHeight-20)}px"></div>
        <div class="ot-box" style="top:${top}px"><small>${i+1} di ${OT.length}</small><p>${st.t}</p><div class="row" style="gap:8px;justify-content:space-between"><button class="btn ghost small" data-otx>Esci</button><button class="btn small" data-otn>${i<OT.length-1?'Avanti →':'Fine'}</button></div></div>`;
      document.body.appendChild(o);o.querySelector('[data-otn]').onclick=()=>orTour(i+1);o.querySelector('[data-otx]').onclick=()=>o.remove();},350);},st.tab?1000:200);}
/* la prima volta nel mondo: proposta del giro guidato */
function orOffer(){if(!S.user||typeof G==='undefined'||G.tourDone||document.querySelector('#sheet.open'))return;G.tourDone=1;
  openSheet('🧭 Vuoi un giro guidato?',`<p style="font-weight:400">Un minuto per capire tutto: la mappa vera, le case da comprare, l’<b>orda del mondo</b> delle 9 e delle 21, i premi da riscattare.</p><div class="row" style="gap:8px;margin-top:12px"><button class="btn" data-oty>Sì, fammi vedere</button><button class="btn ghost small" data-otn2>No, grazie</button></div>`,c=>{c.querySelector('[data-oty]').onclick=()=>orTour(0);c.querySelector('[data-otn2]').onclick=closeSheet;});}
/* menu */
/* aggiornamenti */
setInterval(()=>{if(!document.hidden&&S.user){orLoad(Date.now()-OR.t>60000);document.querySelectorAll('.onext small').forEach(x=>{if(OR.s)x.textContent='tra '+orLeft(OR.s.next_at);});}},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.user)orLoad(true);});
setTimeout(()=>{if(S.user)orLoad(true);},3500);
/* manuale */
</script>
