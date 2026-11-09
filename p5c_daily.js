<script>
/* =========================================================
   PREMI GIORNALIERI E MISSIONI (per far tornare ogni giorno)
   ========================================================= */
const DAILY=[
 {ic:'🧱',t:'20 Mattoni',f:g=>{giveMattoni(20,'Premio del giorno');}},
 {ic:'🎡',t:'1 giro di ruota',f:g=>{g.spins=(g.spins||0)+1;}},
 {ic:'💎',t:'10 gemme',f:g=>{g.gems+=10;}},
 {ic:'🎟️',t:'1 gratta e vinci',f:g=>{g.scratch=(g.scratch||0)+1;}},
 {ic:'🧱',t:'60 Mattoni',f:g=>{giveMattoni(60,'Premio del giorno');}},
 {ic:'🎡',t:'2 giri di ruota',f:g=>{g.spins=(g.spins||0)+2;}},
 {ic:'👑',t:'40 gemme + 50 Mattoni',f:g=>{g.gems+=40;giveMattoni(50,'Premio del giorno');}}
];
const MISSIONS=[{k:'z',n:'Scaccia 40 zombie',goal:40,g:10},{k:'w',n:'Vinci 2 ondate',goal:2,g:10},{k:'s',n:'Saluta o aiuta un amico',goal:1,g:5}];
const dayKey=d=>d.toDateString();
function dailyState(){G.streak=G.streak||{day:0,last:null};const today=dayKey(new Date()),yest=dayKey(new Date(Date.now()-864e5));
  if(!G.today||G.today.date!==today)G.today={date:today,z:0,w:0,s:0,got:{},all:false};
  const claimed=G.streak.last===today;const cont=G.streak.last===yest;const missed=!claimed&&!cont&&G.streak.day>0;
  const next=claimed?G.streak.day:(cont?G.streak.day%7+1:1);return{today,claimed,missed,next};}
function dailyHTML(){
  const s=dailyState();const fr=(G.friends||[]).filter(f=>f.on).length;
  return`<div class="panel daily">
    <div class="row spread"><b class="disp" style="font-size:22px">🎁 Premio del giorno</b><span class="tag ${s.claimed?'':'sp'}">${s.claimed?'Riscosso':'Giorno '+s.next+' di 7'}</span></div>
    ${s.missed?'<p class="muted" style="font-size:12px;margin:4px 0">Hai saltato un giorno: la serie riparte dal giorno 1.</p>':''}
    <div class="dtrack">${DAILY.map((d,i)=>{const n=i+1;const done=s.claimed?n<=s.next:n<s.next;const now=!s.claimed&&n===s.next;return`<div class="dday ${done?'done':''} ${now?'now':''} ${n===7?'big':''}"><small>G${n}</small><span>${done?'✓':d.ic}</span></div>`;}).join('')}</div>
    <button class="btn wide ${s.claimed?'ghost':''}" id="dClaim" ${s.claimed?'disabled':''}>${s.claimed?'Torna domani per il giorno '+(s.next%7+1):'Riscuoti: '+DAILY[s.next-1].ic+' '+DAILY[s.next-1].t}</button>
    <p class="muted" style="font-size:12px;margin-top:6px">👥 Oggi hanno già riscosso ${fr} tuoi amici. Se riscuotete in almeno 3, +5 💎 a tutti.</p>
    <div class="missions"><b>Missioni di oggi</b>${MISSIONS.map(m=>{const v=Math.min(m.goal,G.today[m.k]||0),ok=v>=m.goal,got=G.today.got[m.k];return`<div class="mis"><div style="flex:1"><span>${m.n}</span><div class="hp" style="height:9px;margin-top:3px"><span style="width:${v/m.goal*100}%;background:var(--ok)"></span></div><small>${v}/${m.goal}</small></div>${got?'<span class="tag ia">✓</span>':`<button class="btn small" data-mis="${m.k}" ${ok?'':'disabled'}>+${m.g} 💎</button>`}</div>`;}).join('')}
      <small class="muted">Completale tutte e tre: +1 gratta e vinci bonus. Si rinnovano a mezzanotte.</small></div>
  </div>`;
}
</script>
