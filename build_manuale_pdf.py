import asyncio
from playwright.async_api import async_playwright
JS=r"""
()=>{
const H=(t)=>t;
const css=`
@page{size:A4;margin:0}
html,body{background:#f3e9d2 !important}
body{margin:0;font-family:'Poppins','DejaVu Sans',sans-serif;color:#140f1f;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#topbar,#nav,.navbar,#drawer,#sheet,.accbar,#accBar,.toast,#toast{display:none !important}
.zpg{width:210mm;min-height:297mm;box-sizing:border-box;padding:14mm 13mm 16mm;position:relative;break-after:page;background:#f3e9d2;background-image:radial-gradient(rgba(20,15,31,.07) 1.2px,transparent 1.6px);background-size:9px 9px;overflow:hidden}
.zpg:last-child{break-after:auto}
.zttl{font-family:'Poppins',sans-serif;font-weight:800;font-style:italic;text-transform:uppercase;letter-spacing:.5px;transform:skew(-6deg);display:inline-block;color:#f7d64a;-webkit-text-stroke:2px #140f1f;text-shadow:4px 4px 0 #140f1f}
.zh1{font-size:46px;line-height:1}.zh2{font-size:30px;line-height:1.05;margin:0 0 8px}
.zband{background:#241a4a;color:#f3e9d2;border:4px solid #140f1f;box-shadow:6px 6px 0 #140f1f;padding:10px 14px;margin:0 0 12px}
.zfoot{position:absolute;bottom:7mm;left:13mm;right:13mm;display:flex;justify-content:space-between;font-size:10px;color:#5a5470}
.zcap{background:#fff;border:3px solid #140f1f;box-shadow:5px 5px 0 #140f1f;padding:10px 12px;margin:0 0 12px;break-inside:avoid}
.zcap h3{margin:0 0 6px;font-weight:800;font-size:18px}
.zcap p{margin:5px 0;font-size:12.5px;line-height:1.45}
.mtab{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;margin:6px 0}
.mtab>div{display:grid;grid-template-columns:24px 1fr;column-gap:6px;padding:4px 0;border-top:1px dashed rgba(20,15,31,.25);break-inside:avoid}
.mtab span{font-size:16px;grid-row:1/3}.mtab b{font-size:12px}.mtab small{font-size:10.5px;color:#3d3550;line-height:1.35}
.mcost{font-style:normal;background:#f7d64a;border:2px solid #140f1f;border-radius:50%;padding:0 5px;font-size:10px;margin-left:3px}
.zcols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ztav{background:#f1ebf9;border:3px solid #140f1f;box-shadow:5px 5px 0 #140f1f;padding:10px;break-inside:avoid;position:relative}
.ztav .n{position:absolute;top:-3px;left:-3px;background:#140f1f;color:#f7d64a;font-weight:800;padding:2px 8px;font-size:13px}
.ztav .ic{font-size:30px;text-align:center}.ztav h4{text-align:center;margin:2px 0 4px;font-weight:800;font-size:16px}
.ztav p{font-size:11.5px;margin:0 0 6px;text-align:center;line-height:1.4}
.ztav .demo{background:#fff;border:2px solid #140f1f;padding:6px}
.zbubble2{background:#fff;border:3px solid #140f1f;border-radius:18px;padding:10px 14px;font-size:14px;position:relative;box-shadow:4px 4px 0 #140f1f}
.zloop{display:grid;grid-template-columns:1fr 26px 1fr 26px 1fr;align-items:center;gap:6px;margin:10px 0}
.zloop>div{background:#fff;border:3px solid #140f1f;box-shadow:4px 4px 0 #140f1f;padding:8px;text-align:center;font-size:11.5px}
.zloop>div b{display:block;font-size:14px;margin:4px 0}.zloop .ar{font-size:24px;text-align:center;background:none;border:0;box-shadow:none;padding:0}
.zbig{font-size:40px}
.zsp{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.zsp>div{background:#fff8d6;border:3px dashed #b8860b;padding:8px 10px;font-size:11.5px;line-height:1.4}
.zsp b{font-size:13px}
.zscene svg{width:100%;height:auto;display:block;border:4px solid #140f1f;box-shadow:6px 6px 0 #140f1f}
.ztoc{columns:2;font-size:13px;line-height:1.9}
.hw-field{grid-template-rows:repeat(3,26px) !important}.hw-house{font-size:24px !important}.hw-z{font-size:18px !important;animation:none !important;right:30% !important}
.hw-pb span{font-size:18px}.hw-chips span{font-size:16px}.hw-chips b{font-size:11px}.hw-chips small{font-size:10px}
.hw-hab button{width:70px;height:70px;font-size:11px}.hw-stars{font-size:26px}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const foot=(n)=>`<div class="zfoot"><span>ZombieSafeHouse · Manuale del superstite</span><span>${n}</span><span>un marchio INDZ · safehousezombie.netlify.app</span></div>`;
let n=1;const P=(inner)=>`<section class="zpg">${inner}${foot(n++)}</section>`;
// copertina
const a={...SAMPLE,porta:'b4',grate:'tutte',luci:'sensore',energia:'fv',recinzione:'muro1',cancello:'auto'};
const cover=`<section class="zpg" style="background:#241a4a;background-image:radial-gradient(rgba(247,214,74,.12) 1.4px,transparent 1.8px);background-size:10px 10px">
  <div style="text-align:center;margin-top:6mm"><span class="zttl zh1" style="font-size:58px">ZombieSafeHouse</span></div>
  <div style="text-align:center;margin:10px 0 14px"><span class="zttl" style="font-size:30px;color:#fff">Manuale del superstite</span></div>
  <div class="zscene" style="margin:0 6mm">${houseScene(a,{sid:'cov'})}</div>
  <div class="zbubble2" style="margin:16px 8mm 0;font-size:15px"><b>Quanto resisterebbe casa tua a un’apocalisse zombie?</b><br>Valuti la casa vera, la difendi nel tuo quartiere vero, e ogni miglioramento fatto davvero ti rende più forte nel gioco.</div>
  <div style="position:absolute;bottom:12mm;left:0;right:0;text-align:center;color:#f3e9d2;font-size:12px">Edizione ottobre 2026 · un marchio INDZ · safehousezombie.netlify.app</div></section>`;
n=2;
const intro=P(`<span class="zttl zh2">In 30 secondi</span>
  <div class="zloop"><div><span class="zbig">📷</span><b>1. Valuti la casa</b>Indirizzo o GPS, 7 foto per stanza, 45 domande: indice da 1 (fortezza) a 10 (buffet per zombie) e un piano d’azione.</div><div class="ar">➜</div>
  <div><span class="zbig">🧟</span><b>2. Giochi sul territorio</b>La tua casa vera nel tuo quartiere vero: vie, servizi, salite, meteo e vicini veri decidono la notte.</div><div class="ar">➜</div>
  <div><span class="zbig">🛠️</span><b>3. Migliori la casa vera</b>Consigli, sconti e preventivi degli sponsor della zona: ogni cosa fatta davvero ti rinforza nel gioco.</div></div>
  <div class="zcap"><h3>📍 Il tuo territorio vero</h3><p>L’app legge la zona vera intorno a casa tua da OpenStreetMap e dalle quote del terreno: servizi fino a 10 km (ospedali, farmacie, carabinieri, vigili del fuoco, supermercati, negozi per la casa), quante case ci sono intorno, fiumi e laghi, salite e alture. Riconosce anche il tuo <b>edificio</b>: forma, misure, piani, tetto e se è attaccato ai vicini.</p></div>
  <div class="zcap"><h3>🗺️ La mappa</h3><p>Di giorno lilla e giallo, di notte viola e blu. Icone a fumetto per attività e servizi; in giallo tratteggiato i <b>posti sponsor liberi</b>; col bollino giallo e il nome gli <b>sponsor</b>; casa tua in rosso; i superstiti della community come cerchi con l’iniziale (verde se online). Pulsanti 3D e 🔭 10 km.</p></div>
  <div class="zcap"><h3>🗂️ Le schede delle attività</h3><p>Ogni attività e servizio ha la sua scheda: distanza a piedi, orari con “aperto ora”, telefono, sito, social, foto e recensioni su Google, controllo “in attività / chiusa”. Chi trova un’attività chiusa la segnala con un tocco.</p></div>
  <div class="zcap"><h3>📋 Indice dei capitoli</h3><div class="ztoc">${['Le 7 tavole: come si gioca','Lo scopo del gioco','Le schede del gioco','La tua casa e i potenziamenti','Il quartiere vero','Il piano','Provviste e carte','Bersaglio, combo, rifornimenti','L’abilità della casa','Attrezzi anti-zombie','I nemici','La notte vera','Spedizioni e missioni','Bonus del territorio','Premi','Community e inviti','Casa vera ⇄ gioco','Per gli sponsor'].map((t,i)=>`${i+1}. ${t}`).join('<br>')}</div></div>`);
// tavole
const tav=(i)=>{const h=HOW[i];return`<div class="ztav"><span class="n">${i+1}/7</span><div class="ic">${h.ic}</div><h4>${h.t}</h4><p>${h.p.replace(/Prova[^.!]*[.!]/g,'').replace(/Prova sul bruto!/,'')}</p><div class="demo">${h.demo()}</div></div>`;};
const tav1=P(`<span class="zttl zh2">Come si gioca: le 7 tavole</span><div class="zcols">${[0,1,2,3].map(tav).join('')}</div>`);
const tav2=P(`<div class="zcols" style="margin-top:4mm">${[4,5,6].map(tav).join('')}<div class="ztav" style="background:#fff3b0"><div class="ic">📖</div><h4>Nell’app è interattivo</h4><p>Le tavole si sfogliano col dito e si provano: metti i punti difesa, giochi la carta sulla corsia, segni il bersaglio, usi l’abilità della casa. Partono da sole la prima volta.</p></div></div>`);
// capitoli del manuale (dall'app, tutti aperti)
const tmp=document.createElement('div');tmp.innerHTML=manualHTML();
const caps=[...tmp.querySelectorAll('details.man')].map(d=>`<div class="zcap"><h3>${d.querySelector('summary').innerHTML}</h3>${d.querySelector('.man-b').innerHTML}</div>`);
// impagino: ~3 capitoli per pagina secondo lunghezza
const meas=document.createElement('div');meas.style.cssText='position:absolute;left:-9999px;top:0;width:calc(210mm - 26mm)';document.body.appendChild(meas);
const LIM=1123-57-60-40;const pages=[];let cur='',h=0;
caps.forEach((c,i)=>{meas.innerHTML=c;const hh=meas.firstElementChild.offsetHeight+16;const lim=pages.length===0?LIM-50:LIM;if(h&&h+hh>lim){pages.push(cur);cur='';h=0;}cur+=c;h+=hh;});if(cur)pages.push(cur);meas.remove();
const man=pages.map((p,i)=>P(`${i===0?'<span class="zttl zh2">Il manuale completo</span>':''}${p}`)).join('');
const spons=P(`<span class="zttl zh2">Per gli sponsor</span>
  <div class="zbubble2" style="margin-bottom:12px">Gli sponsor sono le attività della zona che aiutano a rendere le case più sicure: ferramenta, fabbri, serramenti, sicurezza, elettricisti, edilizia. Nell’app non sono pubblicità: sono <b>presidi del quartiere</b>.</div>
  <div class="zsp"><div><b>⭐ Bollino sulla mappa</b><br>Col nome, visibile a tutto il quartiere, anche fino a 10 km.</div><div><b>🛡️ Presidio nel gioco</b><br>Chi abita entro 3 km ha +5% di barricata: un motivo per conoscerti.</div>
  <div><b>🎒 Spedizione giornaliera</b><br>Gli utenti “mandano una squadra” da te ogni giorno, senza rischi.</div><div><b>🎯 Missioni del giorno</b><br>“Scopri l’offerta e prendi il codice sconto”: traffico diretto.</div>
  <div><b>📋 Piano d’azione</b><br>Sotto ogni consiglio della valutazione (es. cilindro antiscasso) compare “Chiedi a [sponsor]”.</div><div><b>🎟️ Codici sconto</b><br>Personali, validati in cassa dal pannello del negozio.</div>
  <div><b>📩 Preventivi</b><br>Richieste con contatto e indice della casa, da seguire fino al “vinto”.</div><div><b>📊 Statistiche del mese</b><br>Visualizzazioni, schede aperte, codici creati e usati, preventivi.</div></div>
  <div class="zcap" style="margin-top:12px"><h3>📱 Il pannello del negozio</h3><p>Dal telefono, su <b>safehousezombie.netlify.app/negozio.html</b>: il negoziante entra con il suo account, scrive il codice del cliente e vede subito se è valido (verde) o già usato, scaduto o di un altro negozio (rosso). Nella stessa pagina: statistiche e richieste di preventivo.</p></div>
  <div class="zcap"><h3>🔒 Privacy degli utenti</h3><p>Gli sponsor ricevono dati personali solo quando un utente chiede un preventivo o usa un codice in negozio. Sulla mappa della community nessuno vede indirizzi: solo nickname e posizione approssimata (circa 200 m), e solo per chi lo sceglie.</p></div>
  <div class="zband" style="margin-top:14px"><b style="font-size:16px">Diventa presidio del tuo quartiere</b><br>INDZ · raschi.ale@gmail.com · safehousezombie.netlify.app</div>`);
document.body.innerHTML=cover+intro+tav1+tav2+man+spons;window.scrollTo(0,0);return n-1;}
"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':794,'height':1123})
        await pg.route('**/*',lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.add_init_script('window.__noHello=1')
        await pg.goto('file:///home/claude/v3/app.html');await pg.wait_for_timeout(800)
        n=await pg.evaluate(JS);print('pagine',n)
        await pg.wait_for_timeout(500)
        await pg.pdf(path='/home/claude/man/ZombieSafeHouse_Manuale_del_superstite.pdf',format='A4',print_background=True,margin={'top':'0','bottom':'0','left':'0','right':'0'})
        await b.close()
asyncio.run(main())
