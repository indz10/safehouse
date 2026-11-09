<script>
/* =========================================================
   IL PONTE SEMPLICE: lo Scudo della casa vera
   tutto ciò che fai nel mondo vero alza lo Scudo;
   lo Scudo ti rende più forte nel gioco
   + pagina "Come funziona"
   ========================================================= */
function scudoSteps(){const r=S.result,m=Object.keys(S.rmiss||{}).length,g=(typeof G!=='undefined'&&G.ccv&&G.ccv.log&&G.ccv.log.length>0);
  return[['📷','Valuta la tua casa vera',!!r,'valuta'],['🛡️','Indice di casa sotto 3,5',!!r&&r.idx<=3.5,'valuta'],['🏰','Indice di casa sotto 2,5',!!r&&r.idx<=2.5,'valuta'],
   ['✅','Fai 2 missioni della casa vera',m>=2,'mondo'],['🧾','Un acquisto verificato da uno sponsor',!!g,'mondo']];}
function scudoLv(){return scudoSteps().filter(s=>s[2]).length;}
function scudoBonus(lv){return{bar:lv*8,pv:Math.floor(lv/2)};}
function scudoBar(){const lv=scudoLv(),b=scudoBonus(lv);
  return`<button class="scudo" data-scudo><span class="sc-i">🛡️</span><span class="sc-t"><b>Scudo della casa vera · ${lv}/5</b><span class="sc-b">${[1,2,3,4,5].map(i=>`<i class="${i<=lv?'on':''}"></i>`).join('')}</span><small>${lv?`Nel gioco: barricata +${b.bar}%${b.pv?` · +${b.pv} provvist${b.pv>1?'e iniziali':'a iniziale'}`:''}`:'Migliora la casa vera per essere più forte qui'}</small></span><span class="sc-a">›</span></button>`;}
function openScudo(){const st=scudoSteps(),lv=scudoLv(),b=scudoBonus(lv);
  openSheet('🛡️ Scudo della casa vera',`<p style="font-weight:400;margin-bottom:8px">Una regola sola: <b>quello che fai per la casa vera ti rende più forte nel gioco.</b></p>
   <div class="scl">${st.map(s=>`<div class="${s[2]?'ok':''}"><span>${s[2]?'✅':s[0]}</span><b>${s[1]}</b>${s[2]?'<small>fatto</small>':`<button class="btn small" data-sgo="${s[3]}">Fai</button>`}</div>`).join('')}</div>
   <div class="panel moon" style="margin-top:10px"><b>Il tuo Scudo ora: ${lv}/5</b><p style="font-weight:400;margin-top:4px">Ogni livello: <b>+8% barricata</b> di casa tua. Ogni 2 livelli: <b>+1 provvista</b> all’inizio della notte. In più il <b>viatico</b> ti fa partire da una notte più avanzata.</p><p style="font-weight:400;margin-top:4px">Ora: barricata +${b.bar}% · provviste +${b.pv}.</p></div>`,
   card=>card.querySelectorAll('[data-sgo]').forEach(x=>x.onclick=()=>{closeSheet();if(x.dataset.sgo==='mondo'){S.zv='mondo';go('mappa');}else go('valuta');}));}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-scudo]');if(b){vibe();openScudo();}},true);
/* pagina Come funziona */
function renderGuida(){const lv=scudoLv();
  const sec=(t,h)=>`<div class="panel gsec"><b class="disp">${t}</b>${h}</div>`;
  app.innerHTML=`<div class="page"><h2 class="disp" style="font-size:34px;margin-top:6px">Come funziona</h2>
   ${sec('In una riga',`<p class="big">Valuti la sicurezza della tua <b>casa vera</b> e la trasformi in un <b>gioco</b>: più la casa vera è sicura, più sei forte nel gioco.</p>`)}
   ${sec('Le 4 voci in basso',`<div class="g4">${[['🏠','Casa','Da dove parti'],['📷','Valuta','Zona, 3 foto, domande, verdetto, simulazione della notte'],['🧟','Gioco','Il tuo quartiere da difendere: notti, carte, Arena, amici'],['🗺️','Mondo','La tua zona vera: community, sponsor, offerte, missioni, vivere qui, vacanze']].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div><p class="muted" style="margin-top:6px">Nel menu ☰: Radio, sponsor, contatti, privacy.</p>`)}
   ${sec('Il ponte tra i due mondi',`<p>Lo <b>Scudo della casa vera</b> (da 0 a 5) sale con quello che fai davvero e ti dà forza nel gioco.</p>${scudoBar()}<div class="two"><div><b>Si alza se…</b><small>valuti la casa · l’indice scende sotto 3,5 e poi 2,5 · fai 2 missioni reali · compri da uno sponsor e inserisci il codice</small></div><div><b>Nel gioco dà…</b><small>+8% barricata per livello · +1 provvista ogni 2 livelli · partenza avanzata (viatico) · Crediti Casa Vera da spendere</small></div></div>`)}
   ${sec('Gli sponsor',`<p>Sono negozi e professionisti veri della tua zona. Li trovi in <b>Mondo</b> con il bollino giallo, in <b>Valuta</b> accanto ai rimedi giusti e nel <b>Gioco</b> come edifici e presidi. Offrono sconti con il codice dell’app; le recensioni sono di chi ci è stato davvero.</p>`)}
   ${sec('Il percorso consigliato',`<ol>${['<b>Valuta</b> la casa: 5 minuti, scopri il punto debole','<b>Simula</b> la notte e guarda cosa cambia con i rimedi','<b>Gioca</b> la prima notte: il tutorial ti guida','In <b>Mondo</b> apri “Il mio quartiere vero”: offerte e missioni','<b>Torna ogni giorno</b>: premio, una notte, le offerte vicine'].map(x=>`<li>${x}</li>`).join('')}</ol>`)}
   ${sec('Il gioco in 30 secondi',`<p>Ogni notte arriva un’orda. Prima scegli il piano (o avvio rapido), poi giochi <b>carte</b> con le <b>provviste</b>, segni i <b>bersagli</b>, fai <b>combo</b>, scegli un <b>rifornimento</b> a metà notte e apri lo <b>scrigno</b> se vinci. Tra una notte e l’altra compri edifici, potenzi la casa, sfidi gli altri in Arena, difendi quartieri con gli amici.</p><button class="btn small" id="gRules">📖 Regole complete del gioco</button>`)}
   ${sec('La tua privacy',`<p>I dati della casa restano sul tuo profilo. Sulla mappa non compaiono mai case private: solo aree con almeno 5 utenti. Le foto si analizzano e non si salvano.</p>`)}
   <button class="btn wide alt" id="gGuide" style="margin-top:10px">📖 Guida passo passo, con le scritte</button><div class="row wrap" style="gap:8px;margin:10px 0 20px"><button class="btn" data-go="valuta">Valuta la mia casa</button><button class="btn alt" data-go="orda">Vai al gioco</button></div></div>`;
  if(typeof bindGo==='function')bindGo();app.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  {const gg=$('#gGuide');if(gg)gg.onclick=()=>guideSheet(0);}
  $('#gRules').onclick=()=>openRules(0);}
</script>
