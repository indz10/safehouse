import asyncio
from playwright.async_api import async_playwright
I='file:///home/claude/equ/img/'
CSS=open('/home/claude/pan/style.css').read()+r"""
.pg{height:297mm}.shot{width:56mm;border:3px solid #140f1f;box-shadow:4px 4px 0 #140f1f;display:block}
.two{display:flex;gap:12px;align-items:flex-start}.two .zcap{flex:1}
.say{background:#241a4a;color:#fff;border:3px solid #140f1f;box-shadow:4px 4px 0 #140f1f;padding:10px 12px;font-size:12px;line-height:1.5;margin:8px 0}
code{font-size:10.5px;background:#f1ebf9;padding:0 3px}
"""
def page(n,title,body):return f'<section class="zpg"><div class="zsec"><span class="zttl zh2">{title}</span></div>{body}<div class="zfoot"><span>ZombieSafeHouse · Equità del mondo unico</span><span>{n}</span><span>INDZ · novembre 2026</span></div></section>'
def cap(t,b):return f'<div class="zcap"><h3>{t}</h3>{b}</div>'
def tab(rows,head):return '<table class="zt"><tr>'+''.join(f'<th>{h}</th>' for h in head)+'</tr>'+''.join('<tr>'+''.join(f'<td>{c}</td>' for c in r)+'</tr>' for r in rows)+'</table>'
def ul(L):return '<ul style="margin:4px 0 0 16px;padding:0;font-size:11.5px;line-height:1.5">'+''.join(f'<li>{x}</li>' for x in L)+'</ul>'
def ol(L):return '<ol style="margin:4px 0 0 16px;padding:0;font-size:11.5px;line-height:1.55">'+''.join(f'<li>{x}</li>' for x in L)+'</ol>'
P=[]
P.append(f'''<section class="zpg cover"><div class="ct" style="margin-top:28mm"><span class="zttl zh1">ZombieSafeHouse</span><br><br><span class="zttl sub">Equità del mondo unico</span></div>
<div style="display:flex;gap:10px;justify-content:center;margin-top:12mm"><img class="shot" src="{I}y_kit.png"><img class="shot" src="{I}y_lega.png"></div>
<div class="bub">Come fa chi arriva dopo a non restare indietro in un mondo condiviso da tutti: 6 regole, decise dal server, spiegate con esempi. In fondo: come installarle.</div>
<div class="cf">INDZ · novembre 2026</div></section>''')
P.append(page(2,'Il problema e cosa c’era già',cap('Il problema','<p>Nel mondo unico tutti giocano sulla stessa mappa. Chi entra dopo trova veterani con più case, più livello e più gemme. Se il distacco sembra impossibile da recuperare, il nuovo arrivato se ne va: e senza nuovi arrivati il mondo muore.</p>')
 +cap('Cosa c’era già (e perché il distacco non esplode)',tab([['Tetti giornalieri','Notti, missioni, accesso, aiuti hanno un massimo al giorno: il vantaggio di un veterano si misura in giorni di gioco, non cresce a valanga'],['Orda su misura','La forza dell’orda dipende dal livello di chi la subisce: il nuovo affronta orde piccole'],['Protezione dai più forti','Chi è 3 o più livelli sotto non può ricevere orde né dispetti'],['Case che si liberano','Chi non gioca da 30 giorni perde le case; il mondo è enorme, con superstiti simulati da cui comprare']],['Meccanismo','Effetto']))
 +'<div class="say"><b>L’idea guida</b><br>Non togliere niente a chi gioca da tempo, ma far correre più veloce chi arriva dopo, finché non raggiunge gli altri.</div>'))
P.append(page(3,'Le 6 regole',tab([
 ['1','🎁 Kit di benvenuto','300 🧱 e 50 💎 una volta per account','Comprare subito la seconda casa'],
 ['2','🛡️ Scudo del nuovo arrivato','14 giorni senza orde né dispetti da altri giocatori. Se ne fa lui, lo perde','Imparare senza essere bersagliato'],
 ['3','🚀 Spinta di recupero','+50% sui Mattoni guadagnati giocando, finché il livello è sotto la mediana dei giocatori attivi entro circa 20 km (servono almeno 3 giocatori)','Recuperare il distacco più in fretta'],
 ['4','🏅 Leghe','Classifiche per fascia: Bronzo 1–5, Argento 6–12, Oro 13–20, Diamante 21+','Vincere la propria lega da subito'],
 ['5','🏠 Case più care per chi ne ha tante','+10% di prezzo per ogni casa già posseduta (tetto 9.000 🧱)','Il mondo resta comprabile per i nuovi'],
 ['6','🤝 Padrino','Nei primi 14 giorni chi ha invitato riceve il 10% in più di quello che guadagna l’invitato (all’invitato non si toglie niente)','I veterani aiutano i nuovi invece di schiacciarli']],['#','Regola','Come funziona','A cosa serve'])
 +cap('Cosa conta per la spinta e il padrino','<p>Solo i guadagni da gioco: notti vinte, missioni, accesso del giorno, premi dell’orda, affitti, rinforzi agli alleati. Regali, prestiti, kit e restituzioni no: così nessuno può “gonfiare” la spinta passandosi Mattoni.</p>')
 +cap('Chi decide','<p>Tutte le regole sono calcolate dal <b>server</b> (Supabase). Il telefono mostra soltanto: non si può barare modificando l’app.</p>')))
P.append(page(4,'Un esempio: Giulia entra a marzo',ol([
 '<b>Giorno 1.</b> Giulia valuta la casa a Volta Mantovana. Riceve il <b>kit</b>: 300 🧱 e 50 💎. Con i Mattoni compra una seconda casa vicino al lago.',
 '<b>Giorni 1–14.</b> Ha lo <b>scudo</b>: Marco, livello 9, non può mandarle orde o dispetti. Lei impara a preparare le case e riscattare i premi.',
 '<b>Spinta.</b> Nella sua zona il livello medio è 6, lei è al 2: ogni Mattone guadagnato giocando vale +50%. Se una sera i premi dell’orda le danno 40 🧱, ne riceve 60.',
 '<b>Leghe.</b> Nella classifica della settimana Giulia gioca nella lega <b>Bronzo</b> con chi è al suo livello: può arrivare prima già alla seconda settimana.',
 '<b>Prezzi.</b> Marco ha 8 case: per lui una nuova casa costa +80%. Per Giulia, con 1 casa, solo +10%.',
 '<b>Padrino.</b> Giulia era stata invitata da Alessandro: nelle prime 2 settimane, su quei 40 🧱 di premio Alessandro ne riceve 4 in più. A Giulia non viene tolto niente.',
 '<b>Dopo qualche settimana</b> Giulia arriva al livello medio della zona: la spinta si spegne da sola e gioca alla pari con gli altri.'])
 +cap('Cosa vede Giulia nell’app',ul(['In homepage, accanto a Mattoni e gemme: <b>🛡️ Scudo 12 g</b> · <b>🚀 +50% 🧱</b> · <b>🏅 Bronzo</b>.','Nella scheda di ogni casa: una riga verde che spiega spinta e scudo.','Nei Rivali: un avviso sullo scudo; i giocatori con lo scudo hanno i pulsanti spenti e la scritta “nuovo arrivato, protetto”.','Nelle Classifiche: il nuovo pulsante <b>🏅 La mia lega</b>.','Quando compra una casa: “Hai già N case, il prezzo è +N×10%”.','Nell’invito: la spiegazione del padrino.']))))
P.append(page(5,'Cosa non facciamo, e perché',tab([['Azzerare le ricchezze a ogni stagione','Chi ha investito tempo (o soldi) se ne andrebbe. Si azzerano solo le classifiche, che già sono settimanali'],['Vendere vantaggi diretti (difesa, dispetti più forti)','Allargherebbe il distacco e farebbe scappare i nuovi. Con gli acquisti in app si comprano tempo e comodità, con tetti uguali per tutti'],['Togliere Mattoni ai veterani','Nessuna punizione: le case extra costano solo di più']],['Idea scartata','Perché'])
 +cap('Le gemme','<p>Oggi le gemme stanno sul telefono, quindi non sono confrontabili tra giocatori in modo sicuro. Lo scudo e le leghe risolvono il problema dove conta (dispetti e classifiche). Con gli acquisti in app le gemme andranno sul server, come i Mattoni.</p>')
 +cap('Numeri che puoi cambiare in futuro','<p>Durata dello scudo (14 giorni), spinta (+50%), aumento per casa (+10%), padrino (10% per 14 giorni), kit (300 🧱 e 50 💎), fasce delle leghe. Dimmi i nuovi valori e aggiorno il blocco SQL.</p>')))
P.append(page(6,'Come installarlo (una volta sola)',cap('A · Database: Supabase → SQL Editor',ol(['Apri <b>supabase.com</b> → progetto → <b>SQL Editor</b> → <b>New query</b>.','Incolla i blocchi <b>A, B, C, D, E, F, G</b> del messaggio in chat, <b>uno alla volta e in ordine</b>, premendo <b>Run</b> dopo ciascuno.','Dopo ogni Run deve comparire <b>“Success”</b>. Se compare un errore, fermati e manda la foto.','Prima servono i blocchi già dati: <b>dispetti</b> (tabella world_curses) e <b>aiuto agli alleati</b>.']))
 +cap('B · App: GitHub',ol(['Carica <code>index.html</code> e <code>sw.js</code> → <b>Commit changes</b>.','Netlify → aspetta <b>Published</b>.','Controlla che <code>safehousezombie.netlify.app/sw.js</code> mostri il nuovo numero di versione.','Sull’iPhone chiudi l’app del tutto e riaprila dall’icona.']))
 +cap('C · Come verificare',ol(['Appena riapri l’app compare <b>“🎁 Benvenuto nel mondo!”</b> con 300 🧱 e 50 💎 (una volta sola, anche per gli account già esistenti).','In homepage vedi <b>🏅 Bronzo</b> (o la tua lega). Lo scudo compare solo per gli account creati da meno di 14 giorni.','Superstiti → Classifica → <b>🏅 La mia lega</b>.','Supabase → Table Editor → <b>world_log</b>: compaiono righe “Kit di benvenuto” e, quando scattano, “Spinta di recupero +50%” e “Padrino”.']))))
html=f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(P)}</body></html>'
open('/home/claude/equ/e.html','w',encoding='utf-8').write(html)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':794,'height':1123})
        await pg.goto('file:///home/claude/equ/e.html');await pg.wait_for_timeout(700)
        await pg.pdf(path='/home/claude/equ/ZombieSafeHouse_Equita_mondo_unico.pdf',format='A4',print_background=True,margin={'top':'0','bottom':'0','left':'0','right':'0'})
        await b.close()
asyncio.run(main())
