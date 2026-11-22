<script>
/* 🎖️ PISTA DELLA SETTIMANA (Fase 66, migrazione 052)
   Il 🎮 Gioco fa guadagnare, il 🌍 Mondo fa spendere. Nel Gioco: 💎 con tetto giornaliero (10, deciso dal server in w_gioco_cfg)
   e 🎖️ piastrine senza tetto, che riempiono la pista della settimana: ogni tappa dà premi per il Mondo (risorse, energia,
   mattoni, gemme). Qui: la scheda della pista (`pistaSheet`, world_pista_info / world_pista_riscatta). */
const PISTA={d:null};
const PISTA_IC={cibo:'🥫',legno:'🪵',carb:'⛽',energia:'🔋',mattoni:'🧱',gemme:'💎'};
function pistaPremio(t){return Object.keys(PISTA_IC).filter(k=>t[k]).map(k=>`${PISTA_IC[k]} ${t[k]}`).join(' · ');}
async function pistaSheet(){if(!S.user){toast('Accedi per giocare');return;}let d=null;try{const{data,error}=await SB.rpc('world_pista_info');if(error)throw error;d=data;}catch(e){}
  if(!d||!d.ok){openSheet('🎖️ Pista della settimana','<p>La pista arriva dopo l’aggiornamento del server. Riprova più tardi.</p>');return;}
  PISTA.d=d;const T=d.tappe||[],max=T.length?T[T.length-1].p:1,pr=Math.min(100,d.piastrine/max*100);const pronte=T.filter((t,i)=>i>=d.presi&&d.piastrine>=t.p).length;
  const giorni=Math.max(0,Math.ceil((new Date(d.fine)-Date.now())/864e5));
  openSheet('🎖️ Pista della settimana',`<p class="pstin">Nel 🎮 <b>Gioco</b> guadagni, nel 🌍 <b>Mondo</b> spendi. Ogni zombie battuto, ogni "Difenditi" perfetto e ogni colpo al Boss ti danno 🎖️ piastrine: riempiono questa pista e ogni tappa dà premi per il Mondo.</p>
    <div class="pstbar"><s style="width:${pr}%"></s><b>🎖️ ${d.piastrine} / ${max}</b></div>
    <p class="muted" style="font-size:12.5px">💎 dal Gioco oggi: <b>${d.gemme_oggi}/${d.gemme_max}</b> · la pista ricomincia fra ${giorni} giorn${giorni===1?'o':'i'}</p>
    ${pronte?`<button class="btn wide" data-pstr>🎁 Riscatta ${pronte} tapp${pronte===1?'a':'e'}</button>`:''}
    <div class="pstlist">${T.map((t,i)=>{const preso=i<d.presi,ok=!preso&&d.piastrine>=t.p;return`<div class="pst ${preso?'preso':ok?'ok':''}"><i>${preso?'✅':ok?'🎁':'🔒'}</i><b>🎖️ ${t.p}</b><span>${pistaPremio(t)}</span></div>`;}).join('')}</div>
    <h4 style="margin:12px 0 4px">💎 Gemme dal Gioco (max ${d.gemme_max} al giorno)</h4>
    <p class="muted" style="font-size:12.5px">Vittoria in arena 1 (difficile 2) · prima vittoria del giorno +2 · zombie nuovo nella Zombipedia +3 · "Difenditi" senza errori +1 · colpo finale al Boss +5. Le spendi nel Mondo: 💎 completa subito, scudo, cambio in risorse.</p>
    <button class="btn wide ghost" data-pstgioca>🎮 Vai al Gioco</button>`,sh=>{
  const b=sh.querySelector('[data-pstr]');if(b)b.onclick=async()=>{b.disabled=true;let r=null;try{const{data}=await SB.rpc('world_pista_riscatta');r=data;}catch(e){}
    if(r&&r.ok){toast('🎁 '+pistaPremio(r)+' — nel Mondo!');try{sfx&&sfx('coin');}catch(e){}try{RES.t=0;resLoad(true);supLoad(true);if(r.gemme&&typeof gemLoad==='function')gemLoad();}catch(e){}}else toast((r&&r.msg)||'Non riuscito: riprova');pistaSheet();};
  const gg=sh.querySelector('[data-pstgioca]');if(gg)gg.onclick=()=>{closeSheet();if(typeof gmOpen==='function'&&!GM.on)gmOpen();};});}
</script>
