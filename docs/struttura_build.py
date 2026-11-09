import asyncio
from playwright.async_api import async_playwright
U='file:///mnt/user-data/uploads/'
CSS=r"""
@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;font-family:'Poppins','DejaVu Sans',sans-serif;color:#140f1f;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;padding:12mm 12mm 14mm;position:relative;break-after:page;overflow:hidden;background:#f3e9d2;background-image:radial-gradient(rgba(20,15,31,.06) 1.2px,transparent 1.6px);background-size:9px 9px}
.pg:last-child{break-after:auto}
.ttl{font-weight:800;font-style:italic;text-transform:uppercase;transform:skew(-6deg);display:inline-block;color:#f7d64a;-webkit-text-stroke:2px #140f1f;text-shadow:4px 4px 0 #140f1f;letter-spacing:.5px}
.h1{font-size:50px;line-height:1}.h2{font-size:28px;margin-bottom:8px}
.foot{position:absolute;bottom:6mm;left:12mm;right:12mm;font-size:9.5px;color:#5a5470;display:flex;justify-content:space-between}
.card{background:#fff;border:3px solid #140f1f;box-shadow:4px 4px 0 #140f1f;padding:9px 11px;margin-bottom:10px}
.card h3{margin:0 0 5px;font-size:15px;font-weight:800}.card p,.card li{font-size:11.5px;line-height:1.45;margin:3px 0}.card ul{margin:2px 0 0 16px;padding:0}
.row{display:flex;gap:14px;align-items:flex-start}
.lbl{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border:2px solid #140f1f;margin-bottom:6px}
.lbl.before{background:#f6b8bf}.lbl.after{background:#bfe8c9}
.shot{width:250px;border:3px solid #140f1f;box-shadow:4px 4px 0 #140f1f;display:block}
/* telefono finto */
.ph{width:330px;height:690px;border:4px solid #140f1f;border-radius:26px;overflow:hidden;position:relative;background:#f3e9d2;box-shadow:5px 5px 0 #140f1f;flex:0 0 auto}
.sc{transform-origin:top left}
.tb{height:46px;background:#140f1f;display:flex;align-items:center;justify-content:space-between;padding:0 10px;color:#f3e9d2;font-size:10px;border-bottom:3px solid #f7d64a}
.tb .lg{width:30px;height:30px;border-radius:7px;background:#3b2f6e;display:grid;place-items:center;font-size:17px}
.tb .st{font-weight:700}.tb .mn{font-size:18px;color:#f7d64a}
.nav{position:absolute;left:0;right:0;bottom:0;height:56px;background:#140f1f;border-top:3px solid #f7d64a;display:grid;grid-template-columns:repeat(4,1fr)}
.nav div{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#c9b8ff;font-size:10px;font-weight:700;gap:1px}.nav div span{font-size:19px}.nav div.on{color:#f7d64a}
.ct{position:absolute;top:46px;left:0;right:0;bottom:56px;overflow:hidden;padding:8px}
.pn{background:#fff;border:2.5px solid #140f1f;box-shadow:3px 3px 0 #140f1f;padding:7px 8px;margin-bottom:8px;font-size:10px}
.pn b.t{display:block;font-size:13px;font-weight:800;margin-bottom:3px}
.dk{background:linear-gradient(180deg,#2b2240,#3b2f6e);color:#f3e9d2}.dk b.t{color:#f7d64a}
.btn{display:inline-block;padding:5px 8px;border:2px solid #140f1f;box-shadow:2px 2px 0 #140f1f;font-weight:800;font-size:10px;background:#f7d64a;margin:2px 3px 2px 0}
.btn.r{background:#d7263d;color:#fff}.btn.w{background:#fff}.btn.g{background:#bfe8c9}
.g4{display:grid;grid-template-columns:1fr 1fr;gap:6px}.g4>div{background:#f1ebf9;border:2px solid #140f1f;padding:6px;text-align:center;font-weight:700;font-size:10px}.g4 span{display:block;font-size:20px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:5px}.g3>div{background:rgba(255,255,255,.12);border:1.5px solid #c9b8ff;padding:4px;text-align:center;font-size:9px}.g3 b{display:block;font-size:12px;color:#fff}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}.seg div{border:2px solid #140f1f;background:#fff;text-align:center;font-weight:800;font-size:10.5px;padding:5px 2px}.seg div.on{background:#f7d64a}
.ln{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #ccc;padding:4px 0;font-size:9.5px}
.chips{position:absolute;left:6px;right:6px;bottom:6px;display:flex;gap:4px;flex-wrap:wrap}.chips span{background:#fff;border:2px solid #140f1f;padding:3px 6px;font-size:9.5px;font-weight:800;box-shadow:2px 2px 0 #140f1f}.chips span.on{background:#f7d64a}
.mapbar{position:absolute;left:6px;right:6px;top:6px;background:#2b2240;color:#f3e9d2;border:2.5px solid #140f1f;padding:5px 7px;font-size:10px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.more{position:absolute;right:8px;top:44px;width:34px;height:34px;background:#fff;border:2.5px solid #140f1f;box-shadow:2px 2px 0 #140f1f;display:grid;place-items:center;font-size:18px;font-weight:800}
.sheet{position:absolute;left:0;right:0;bottom:0;background:#f3e9d2;border-top:3px solid #140f1f;padding:8px;border-radius:14px 14px 0 0;font-size:10px}
.mk{position:absolute;font-size:15px;width:24px;height:24px;display:grid;place-items:center;border:2px solid #140f1f;border-radius:6px;background:#fff0a0}
table.t{width:100%;border-collapse:collapse;font-size:10.5px}table.t th{background:#241a4a;color:#f7d64a;text-align:left;padding:5px}table.t td{border-top:1px solid #d9cfe9;padding:5px;vertical-align:top}table.t tr:nth-child(even) td{background:#f7f3fc}
.cover{background:#241a4a;background-image:radial-gradient(rgba(247,214,74,.12) 1.4px,transparent 1.8px);background-size:10px 10px;color:#fff}
.tabs4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
.tabs4>div{background:#fff;border:3px solid #140f1f;box-shadow:4px 4px 0 #140f1f;padding:8px;font-size:10.5px;line-height:1.4}.tabs4 b{display:block;font-size:14px;margin-bottom:4px}.tabs4 .ic{font-size:30px}
"""
def phone(content,active,extra='',scale=1):
    tabs=[('🏠','Casa'),('🗺️','Mappa'),('🧟','Orda'),('👤','Io')]
    nav=''.join(f'<div class="{"on" if n==active else ""}"><span>{i}</span>{n}</div>' for i,n in tabs)
    w,h=330*scale,690*scale
    return f'<div style="width:{w}px;height:{h}px;flex:0 0 auto"><div class="sc" style="transform:scale({scale})"><div class="ph"><div class="tb"><div class="lg">🏚️</div><div class="st">👥 2 superstiti · 🟢 1 online</div><div class="mn">☰</div></div><div class="ct">{content}</div>{extra}<div class="nav">{nav}</div></div></div></div>'
MAP_SVG='''<svg viewBox="0 0 330 600" width="330" height="600" style="position:absolute;inset:0"><rect width="330" height="600" fill="#e2d5f4"/>
<path d="M0 420 C80 400 200 380 330 330" stroke="#4a3a6e" stroke-width="16" fill="none"/><path d="M0 420 C80 400 200 380 330 330" stroke="#f6d65a" stroke-width="11" fill="none"/>
<path d="M120 0 L170 600 M0 200 L330 240 M260 0 L220 600" stroke="#4a3a6e" stroke-width="11" fill="none"/><path d="M120 0 L170 600 M0 200 L330 240 M260 0 L220 600" stroke="#fff" stroke-width="7" fill="none"/>
<rect x="20" y="90" width="60" height="70" fill="#cfe3bd" stroke="#4a3a6e"/>
''' + ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff0b4" stroke="#4a3a6e" stroke-width="1.5"/>' for x,y,w,h in [(30,250,30,24),(70,260,26,20),(185,120,34,26),(190,280,30,30),(270,150,34,22),(40,480,40,24),(250,430,30,26),(95,300,22,22),(200,470,36,24),(280,500,26,22),(30,330,28,22),(250,260,24,22),(130,90,22,30),(80,520,30,22)]) + '''
<path d="M150 300 l16 -14 l16 14 v18 h-32z" fill="#d7263d" stroke="#140f1f" stroke-width="2.5"/><text x="166" y="315" font-size="10" text-anchor="middle" fill="#fff" font-weight="800">TU</text></svg>'''
def mapscreen(sheet=''):
    marks=''.join(f'<div class="mk" style="left:{x}px;top:{y}px;background:{c}">{e}</div>' for x,y,e,c in [(180,108,'🔑','#ffe680'),(262,140,'🤖','#d9dde3'),(32,238,'⭐','#f7d64a'),(244,420,'🛡️','#bfe8c9'),(196,268,'🏠','#e2d6f5'),(60,470,'💊','#fff'),(92,286,'🔧','#ffe680')])
    return f'<div style="position:absolute;inset:0;overflow:hidden">{MAP_SVG}{marks}<div class="mapbar"><span>🧟 Prossima orda tra 2 h 14 min</span><span class="btn" style="margin:0;font-size:9px">▶ Rivedi</span></div><div class="more">⋯</div><div class="chips"><span class="on">🏠 Case</span><span class="on">⭐ Sponsor</span><span>🏥 Servizi</span><span>🧳 Vacanza</span><span>🤝 Alleati</span></div>{sheet}</div>'
CASA='''<div class="pn dk"><span style="font-size:9px;background:#140f1f;color:#f7d64a;padding:1px 5px;font-weight:800">LA TUA CASA</span><div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:13px;color:#fff">Via Roma 10, Volta</b><br><b style="color:#f7d64a">RIFUGIO</b> · resisti 5 notti</div><b style="font-size:34px;color:#fff">5,3</b></div>
<div class="g3"><div><b>🧱 1.240</b>Mattoni</div><div><b>4</b>livello</div><div><b>3</b>case</div></div></div>
<div class="pn"><b class="t">📋 Il tuo piano d’azione</b><div class="ln"><span>🆓 Sposta i bidoni dai muri</span><b>−0,1</b></div><div class="ln"><span>💶 Cilindro antiscasso · 150 €</span><span class="btn" style="font-size:8.5px">⭐ Chiedi a Fabbro</span></div><div class="ln"><span>🏗️ Grate portefinestre · 700 €</span><b>−0,3</b></div></div>
<div class="pn"><b class="t">⭐ Sponsor vicino a te</b><div class="ln"><span>🔑 Ferramenta Rossi · 160 m</span><span>Offerta −10%</span></div><div class="ln"><span>🛡️ SicurCasa · 1,2 km</span><span>Preventivo</span></div></div>
<div class="pn"><span class="btn w">📷 Nuove foto</span><span class="btn w">✏️ Risposte</span><span class="btn w">📍 Posizione</span><span class="btn w">🚚 Trasloco</span></div>'''
OGGI='''<div class="seg"><div class="on">Oggi</div><div>Impero</div><div>Difendi tu</div></div>
<div class="pn dk"><b class="t">🧟 Orda del mondo · tra 2 h 14 min</b>Difesa stimata 72% · 3 case<br><span class="btn r">🛡️ Prepara le case</span><span class="btn">🎁 Riscatta 🧱 44</span><span class="btn w">👀 Guarda</span></div>
<div class="pn"><b class="t">🎁 Premi e fortuna</b><div class="g4"><div><span>📅</span>Premio del giorno</div><div><span>🎡</span>Ruota · 2 giri</div><div><span>🎟️</span>Gratta · 1</div><div><span>🫙</span>Barattolo</div></div></div>
<div class="pn"><b class="t">🎯 Missioni di oggi · 1/3</b><div class="ln"><span>🎒 Spedizione a Conad (316 m)</span><span class="btn g" style="font-size:8.5px">Vai</span></div><div class="ln"><span>🛡️ Fortifica la rotonda</span><span class="btn g" style="font-size:8.5px">Vai</span></div><div class="ln"><span>⭐ Codice di Ferramenta Rossi</span><b>✅</b></div></div>'''
IMPERO='''<div class="seg"><div>Oggi</div><div class="on">Impero</div><div>Difendi tu</div></div>
<div class="pn" style="background:#f1ebf9"><b class="t">🌍 Il tuo impero · 🧱 1.240</b>Livello mondo 4 · 3/4 case · affitti 🧱 35/giorno<br><span class="btn">🏦 Riscuoti affitti 🧱 21</span></div>
<div class="pn"><b class="t">🔑 Le tue case</b><div class="ln"><span>❤️ Casa tua · Volta</span><b>liv. 2</b></div><div class="ln"><span>🔑 Via Adda · 400 m</span><span class="btn w" style="font-size:8.5px">👀 Assalto</span></div><div class="ln"><span>🔑 Sydney · 16.000 km</span><span class="btn w" style="font-size:8.5px">👀 Assalto</span></div></div>
<div class="pn"><b class="t">🤝 Alleati e rivali</b><div class="ln"><span>@giangy · liv. 2 · 3 km</span><span class="btn g" style="font-size:8.5px">🎁 Regala/Presta</span></div><div class="ln"><span>🆘 @mario chiede aiuto</span><span class="btn" style="font-size:8.5px">Rinforzi</span></div><div class="ln"><span>🧟 @luca · liv. 5</span><span class="btn w" style="font-size:8.5px">Manda orda</span></div></div>'''
DIFENDI='''<div class="seg"><div>Oggi</div><div>Impero</div><div class="on">Difendi tu</div></div>
<div class="pn dk"><b class="t">⚔️ Notte 7 · Le notti dell’assedio</b>Capitolo 2 · boss alla notte 10 · ⭐⭐☆<br><span class="btn r">▶ Gioca la notte</span><span class="btn w">📖 Come si gioca</span></div>
<div class="pn"><b class="t">🏘️ Il tuo quartiere vero</b><div style="height:110px;background:#e2d5f4;border:2px solid #140f1f;position:relative"><div style="position:absolute;left:46%;top:40%;font-size:20px">🏠</div><div style="position:absolute;left:20%;top:20%">🔑</div><div style="position:absolute;left:70%;top:60%">🛡️</div><div style="position:absolute;right:4px;top:4px;font-size:9px;color:#d7263d;font-weight:800">🧟 ORDA DA VIA ROMA</div></div></div>
<div class="pn"><b class="t">🔧 Potenzia</b><div class="ln"><span>🚪 Porta blindata → Classe 4</span><span class="btn" style="font-size:8.5px">🪙 350</span></div><div class="ln"><span>🧨 Petardo · livello 2</span><span class="btn" style="font-size:8.5px">🪙 180</span></div></div>'''
IO='''<div class="pn dk"><b class="t">👤 @arf18</b>Livello mondo 4 · 💎 37 · 🪙 1.250 · in gioco dal 24 ottobre</div>
<div class="pn"><b class="t">📨 Invita</b>Il tuo link: chi entra e valuta la casa ti dà 💎 5 e diventa tuo alleato.<br><span class="btn">📤 Condividi</span><span class="btn w">WhatsApp</span></div>
<div class="pn"><b class="t">💎 Bottega</b>Gemme · Pass del Superstite (con gli store) · raddoppia premi</div>
<div class="pn"><div class="ln"><span>🧭 Giro guidato</span><span>›</span></div><div class="ln"><span>📖 Come si gioca e manuale</span><span>›</span></div><div class="ln"><span>📻 Radio Operatore</span><span>›</span></div><div class="ln"><span>👥 Visibile sulla mappa: sì</span><span>›</span></div><div class="ln"><span>🔒 Privacy e termini</span><span>›</span></div><div class="ln"><span style="color:#d7263d">🗑 Elimina account</span><span>›</span></div></div>'''
SHEET='<div class="sheet"><b style="font-size:13px">⭐ Ferramenta Rossi</b> · sponsor · 160 m<br>Offerta: −10% sulle serrature con il codice<br><span class="btn r">🎟️ Prendi il codice</span><span class="btn w">📩 Preventivo</span><span class="btn w">🧭 Portami lì</span><span class="btn w">🌐 Sito</span></div>'
def page(n,inner): return f'<section class="pg">{inner}<div class="foot"><span>ZombieSafeHouse · Nuova struttura</span><span>{n}</span><span>INDZ · documento interno</span></div></section>'
pages=[]
pages.append(f'''<section class="pg cover"><div style="text-align:center;margin-top:20mm"><span class="ttl h1">ZombieSafeHouse</span><br><br><span class="ttl" style="font-size:30px;color:#fff">La nuova struttura</span></div>
<div style="display:flex;justify-content:center;margin-top:14mm">{phone(OGGI,'Orda',scale=0.95)}</div>
<p style="text-align:center;font-size:15px;margin-top:10mm">4 schede, un solo scopo ciascuna. Tutte le funzioni restano: cambia solo dove stanno.</p><div class="foot" style="color:#c9b8ff"><span>INDZ · ottobre 2026</span><span>1</span><span>da approvare prima dello sviluppo</span></div></section>''')
pages.append(page(2,f'''<span class="ttl h2">La struttura in una pagina</span>
<div class="tabs4"><div><span class="ic">🏠</span><b>Casa</b>La tua casa vera: indice, valutazione, piano d’azione, sponsor che ti aiutano, trasloco.</div>
<div><span class="ic">🗺️</span><b>Mappa</b>Il mondo vero: case (tue, libere, di altri, 🤖), sponsor, servizi, vacanza, alleati, assalto.</div>
<div><span class="ic">🧟</span><b>Orda</b><u>Oggi</u>: orda, premi e fortuna, missioni.<br><u>Impero</u>: case, Mattoni, alleati.<br><u>Difendi tu</u>: notti, quartiere, potenzia.</div>
<div><span class="ic">👤</span><b>Io</b>Profilo, inviti, bottega, giro guidato, manuale, radio, privacy, account.</div></div>
<div class="card"><h3>Dove finisce ogni cosa di oggi</h3><table class="t"><tr><th>Oggi si trova…</th><th>Domani in…</th></tr>
<tr><td>Valuta (zona, foto, domande, verdetto)</td><td>🏠 Casa → “Valuta / aggiorna”</td></tr>
<tr><td>Mondo: Sicurezza · Vivere qui · Vacanza · Mondo + mappa a esagoni</td><td>🗺️ Mappa, con filtri in basso (una sola mappa)</td></tr>
<tr><td>Gioco: orda, alleati, premi, mondo unico, missioni, territorio, campagna, spedizioni, bottega</td><td>🧟 Orda → Oggi / Impero / Difendi tu</td></tr>
<tr><td>Menu ☰ (inviti, privacy, giro, radio, elimina account…)</td><td>👤 Io</td></tr>
<tr><td>Potenzia (casa, attrezzi, carte)</td><td>🧟 Orda → Difendi tu</td></tr></table></div>
<div class="card"><h3>3 regole di semplicità</h3><ul><li><b>Una cosa, un posto</b>: niente più funzioni ripetute in due schede.</li><li><b>In primo piano solo ciò che si fa ogni giorno</b>: prepara, riscatta, premi, missioni. Il resto un tocco più in là.</li><li><b>Sulla mappa massimo 2 pulsanti</b>: “⋯” (notte, 3D, 10 km) e la barra dell’orda.</li></ul></div>'''))
pages.append(page(3,f'''<span class="ttl h2">🏠 Casa</span><div class="row"><div><span class="lbl before">OGGI</span><img class="shot" src="{U}IMG_8788.png"></div><div><span class="lbl after">DOMANI</span>{phone(CASA,'Casa',scale=0.82)}</div></div>
<div class="card" style="margin-top:10px"><h3>Cosa cambia</h3><ul><li>Niente copertina a tutto schermo per chi ha già la casa: si entra direttamente nella <b>scheda della casa</b> (indice, Mattoni, livello, case).</li><li>Il <b>piano d’azione</b> e gli <b>sponsor vicini</b> sono qui: è la parte che porta ricavi.</li><li>“Valuta” non è più una scheda: diventa i 4 pulsanti in fondo (foto, risposte, posizione, trasloco).</li><li>Chi entra la prima volta vede ancora la copertina con “Valuta la mia casa”.</li></ul></div>'''))
pages.append(page(4,f'''<span class="ttl h2">🗺️ Mappa</span><div class="row"><div><span class="lbl before">OGGI</span><img class="shot" src="{U}IMG_8791.png"></div><div><span class="lbl after">DOMANI</span>{phone(mapscreen(),'Mappa',scale=0.82)}</div></div>
<div class="card" style="margin-top:10px"><h3>Cosa cambia</h3><ul><li><b>Una sola mappa</b> a tutto schermo. Spariscono Sicurezza / Vivere qui / Vacanza / Mondo e la vecchia mappa a esagoni.</li><li><b>Filtri in basso</b>: 🏠 Case · ⭐ Sponsor · 🏥 Servizi · 🧳 Vacanza · 🤝 Alleati (si accendono e spengono).</li><li><b>Pulsante “⋯”</b>: Notte, 3D, 10 km. Niente più 4 pulsanti che escono dallo schermo.</li><li><b>Barra in alto</b>: conto alla rovescia dell’orda + “Rivedi l’assalto”.</li></ul></div>'''))
pages.append(page(5,f'''<span class="ttl h2">🗺️ Mappa: tocco su uno sponsor</span><div class="row"><div>{phone(mapscreen(SHEET),'Mappa',scale=0.82)}</div>
<div class="card" style="flex:1"><h3>Gli sponsor restano il cuore</h3><ul><li>Bollino giallo col nome, sempre visibile col filtro ⭐.</li><li>Il tocco apre la <b>scheda dal basso</b>, senza lasciare la mappa: offerta, <b>codice sconto</b>, <b>preventivo</b>, indicazioni, sito, telefono, recensioni.</li><li>Stessa scheda per servizi, case del mondo (compra / potenzia) e alleati (regala / presta).</li><li>Posti sponsor liberi (📌) visibili con il filtro ⭐: con il tuo account admin vedi anche “Diventa sponsor”.</li></ul></div></div>'''))
pages.append(page(6,f'''<span class="ttl h2">🧟 Orda: tre sezioni</span><div class="row" style="gap:8px">{phone(OGGI,'Orda',scale=0.56)}{phone(IMPERO,'Orda',scale=0.56)}{phone(DIFENDI,'Orda',scale=0.56)}</div>
<div class="card" style="margin-top:10px"><h3>Oggi · Impero · Difendi tu</h3><ul><li><b>Oggi</b> (si apre qui): orda del mondo con Prepara / Riscatta / Guarda, <b>premi e fortuna</b> (premio del giorno, ruota, gratta e vinci, barattolo), <b>missioni</b>. È quello che si fa più volte al giorno.</li>
<li><b>Impero</b>: le tue case nel mondo (anche lontanissime, con “👀 Assalto” per vederle attaccate), Mattoni, affitti, <b>alleati e rivali</b>, regali e prestiti.</li>
<li><b>Difendi tu</b>: le notti giocate a mano (campagna, boss), il tuo quartiere vero, potenziamenti e attrezzi. Facoltativo, ma con premi in più.</li></ul></div>'''))
pages.append(page(7,f'''<span class="ttl h2">👤 Io e i doppioni tolti</span><div class="row"><div>{phone(IO,'Io',scale=0.72)}</div>
<div class="card" style="flex:1"><h3>Doppioni che spariscono</h3><table class="t"><tr><th>Doppione</th><th>Resta solo in</th></tr>
<tr><td>Premio del giorno (due posti)</td><td>Orda → Oggi</td></tr><tr><td>Due barre dell’orda</td><td>Barra della mappa + pannello Oggi</td></tr>
<tr><td>Bollettino del territorio (Gioco e Valuta)</td><td>Orda → Difendi tu</td></tr><tr><td>“Come funziona” sulla Casa e nel menu</td><td>Io → Come si gioca</td></tr>
<tr><td>Mappa a esagoni e mappa vera</td><td>Mappa (vera)</td></tr><tr><td>Mondo unico in Gioco e Casa</td><td>Orda → Impero (riassunto in Casa)</td></tr>
<tr><td>Menu ☰ e voci sparse</td><td>Io</td></tr></table></div></div>'''))
pages.append(page(8,f'''<span class="ttl h2">Come la costruisco: 4 tappe</span>
<div class="card"><table class="t"><tr><th>#</th><th>Tappa</th><th>Cosa vedi alla fine</th><th>Ok?</th></tr>
<tr><td>1</td><td><b>Mappa</b></td><td>Una sola mappa, filtri in basso, “⋯”, barra orda, schede dal basso per sponsor, case, servizi, alleati</td><td>☐</td></tr>
<tr><td>2</td><td><b>Orda</b></td><td>Tre sezioni Oggi / Impero / Difendi tu; doppioni tolti; “👀 Assalto” per ogni casa lontana</td><td>☐</td></tr>
<tr><td>3</td><td><b>Casa + Io</b></td><td>Casa con valutazione dentro; scheda Io al posto del menu ☰</td><td>☐</td></tr>
<tr><td>4</td><td><b>Pulizia finale</b></td><td>Manuale, giro guidato e PDF aggiornati alla nuova struttura; prove complete su iPhone simulato</td><td>☐</td></tr></table></div>
<div class="card"><h3>Come lavoriamo</h3><ul><li>A ogni tappa: <b>app nuova + prove</b> (anche con server lento o con errori, come per il blocco della pagina Casa).</li><li>Tu provi e mi mandi le foto; si passa alla tappa dopo solo quando quella è a posto.</li><li>Nessuna funzione viene tolta: se qualcosa non la trovi più, è un errore mio e lo rimetto.</li></ul></div>
<div class="card"><h3>Da decidere ora</h3><ul><li>☐ Va bene che la scheda <b>Orda</b> si apra su <b>Oggi</b>?</li><li>☐ Va bene che la <b>Mappa</b> parta con i filtri <b>Case + Sponsor</b> accesi e gli altri spenti?</li><li>☐ Va bene togliere il menu ☰ e mettere tutto in <b>Io</b>?</li></ul></div>'''))
html=f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'
open('/home/claude/strut/s.html','w',encoding='utf-8').write(html)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':794,'height':1123})
        await pg.goto('file:///home/claude/strut/s.html');await pg.wait_for_timeout(800)
        await pg.pdf(path='/home/claude/strut/ZombieSafeHouse_Nuova_struttura.pdf',format='A4',print_background=True,margin={'top':'0','bottom':'0','left':'0','right':'0'})
        await b.close()
asyncio.run(main())
