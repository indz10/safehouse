# MAPPA DELL'APP · fotografa tutte le schermate principali (server finto, iPhone 13) e scrive una pagina HTML
# con le foto numerate, per controllare l'app pagina per pagina e chiedere modifiche ("Pagina 12: …").
# Uso: python3 docs/strumenti/mappa_app.py <cartella di uscita>   → <cartella>/mappa_app.html (foto dentro la pagina)
import asyncio,sys,os,base64,json,html,datetime
R=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'));sys.path.insert(0,R)
from playwright.async_api import async_playwright
import t_terr
OUT=sys.argv[1] if len(sys.argv)>1 else '.'
SETUP="""async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};
 S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;
 __W.b['B1']={owner:'me',lat:45.3262,lon:10.6600,level:2,paid:320};try{await wMine(true);}catch(e){}}"""
RESET="()=>{try{lenteClose()}catch(e){};document.querySelectorAll('#fumetto,.otour').forEach(e=>e.remove());try{zmClose()}catch(e){};window.SHEET_BACK=null;closeSheet();}"
# (sezione, titolo, cosa c'è, js da eseguire, attesa ms)
P=[
 ('Barra in basso','🏠 Casa (homepage)','La prima schermata: la tua casa, l’orda di oggi, i pulsanti principali.',"()=>go('home')",1800),
 ('Barra in basso','🗺️ Mappa','La mappa a fumetto con case, attività, presidi; pulsanti Cerca, Presidi, Lente, 3D.',"()=>{S.zv='mondo';go('mappa')}",3500),
 ('Barra in basso','🧟 Orda','La scheda dell’orda: fronte, difesa, prossima orda, premi.',"()=>go('orda')",2200),
 ('Barra in basso','👥 Superstiti','Gli altri giocatori: vicini, alleati, classifica, chat.',"()=>go('social')",2200),
 ('Le tue case','🏠 Le mie case','Elenco: in cima ❤️ la casa dove abiti, poi quelle comprate.',"()=>casasSheet()",1500),
 ('Le tue case','❤️ Pagina della casa vera','La casa a fumetto, difese, zombie, valutazione e piano d’azione.',"async()=>{const h=myHouses().find(x=>x.home);await houseSheet(h);}",3000),
 ('Le tue case','🔑 Pagina di una casa comprata','Una casa comprata nel mondo: livello, difese, tenuta.',"async()=>{const h=myHouses().find(x=>!x.home);if(h)await houseSheet(h);}",3000),
 ('Le tue case','📷 Valuta la casa','Il percorso di valutazione della casa vera (indirizzo, domande, foto).',"()=>{S.step=0;go('valuta')}",1500),
 ('Le tue case','🧮 Perché (conto della difesa)','Il conto della prossima orda: da dove viene ogni punto di difesa.',"async()=>{try{await defLoad(true)}catch(e){};const h=myHouses().find(x=>x.home);whySheet(h&&h.bid,true)}",1500),
 ('Mappa','🔎 Cerca un luogo','Cerca qualsiasi luogo nel mondo; la mappa ci vola sopra.',"()=>{S.zv='mondo';go('mappa');setTimeout(()=>cercaLuogo(),2500)}",3500),
 ('Mappa','🚩 Presidi (elenco)','I luoghi pubblici veri vicino a te: chi li tiene, % di tenere.',"()=>{S.zv='mondo';go('mappa');setTimeout(()=>presList(window.__mf),2500)}",4200),
 ('Mappa','🚩 Scheda di un presidio','Occupa, fai la guardia, lascia; difesa per la prossima orda.',"()=>{S.zv='mondo';go('mappa');setTimeout(async()=>{await presLoad(window.__mf);presSheet('osm:n1')},2500)}",4200),
 ('Mappa','⭐ Sponsor sulla mappa (elenco)','Le attività che sponsorizzano, per distanza.',"()=>{S.zv='mondo';go('mappa');setTimeout(()=>spList(window.__mf),2500)}",4000),
 ('Mappa','⭐ Scheda di uno sponsor','Offerta, contatti, Google, social, orari.',"()=>sponsorSheet(Object.keys(SPONSORS)[0],S.zone)",1500),
 ('Mappa','🏚️ Scheda di un edificio libero','Un edificio del mondo: prezzo in Mattoni e “Compra”.',"()=>wSheet('W9',45.3270,10.6610)",2200),
 ('Mappa','📷 Lente','La fotocamera a fumetto con etichette e zombie (qui con la fotocamera finta).',"()=>{lenteOpen();setTimeout(()=>{LENTE.prevUntil=Date.now()+20000},800)}",4000),
 ('Orda','🎬 Guarda gli assalti','Il film dell’ultima orda sulle tue case.',"()=>assalto('last')",3500),
 ('Orda','🔮 Simula la prossima orda','Cosa succederebbe se l’orda arrivasse adesso.',"()=>assalto('sim')",3500),
 ('Orda','🧭 Giro guidato','Il tour che spiega l’Orda passo per passo.',"()=>{go('orda');setTimeout(()=>{try{orTour(0)}catch(e){}},700)}",2500),
 ('Superstiti','👤 Scheda di un superstite','Il profilo di un altro giocatore: livello, punteggio, alleanza.',"()=>playerSheet('x1')",2000),
 ('Superstiti','📨 Invita amici e vicini','Il tuo link d’invito e i premi.',"()=>inviteSheet()",1800),
 ('Menu ☰','☰ Menu','Tutte le voci del menu.',"()=>zmOpen()",900),
 ('Menu ☰','📅 Oggi','Ora, meteo vero e calendario delle orde.',"()=>oggiSheet()",2500),
 ('Menu ☰','💎 Bottega','Cosa si compra con i Mattoni.',"()=>shopSheet(0)",1200),
 ('Menu ☰','🔔 Notifiche delle orde','Accendere le notifiche sul telefono.',"()=>pushSheet()",1500),
 ('Menu ☰','📻 Radio Operatore','La chat con l’operatore radio (consigli sulla casa).',"()=>go('radio')",1800),
 ('Menu ☰','📖 Come si gioca','Le istruzioni del gioco.',"()=>zmDo('rules')",1500),
 ('Menu ☰','📚 Tutte le regole','Il manuale completo.',"()=>openSheet('📚 Tutte le regole',rulesHTML())",1200),
 ('Menu ☰','⭐ Sponsor e partner','La pagina degli sponsor e “Iscrivi la tua attività”.',"()=>go('sponsor')",1800),
 ('Menu ☰','📝 Iscrivi la tua attività','Il modulo per diventare sponsor.',"()=>sponsorJoin()",1500),
 ('Menu ☰','👤 Il mio profilo','Il tuo profilo, nome, visibilità.',"()=>go('io')",1800),
 ('Menu ☰','🩺 Controlla il mio gioco','Il controllo che tutto funzioni (account, case, server).',"()=>zStatusSheet()",3000),
]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        dev=dict(p.devices['iPhone 13']);dev['device_scale_factor']=2
        ctx=await b.new_context(**dev,permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10})
        pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=R+'/sb_mock.js');await pg.add_init_script(path=R+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+R+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP);await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{window.ZUSERS=[{user_id:'x1',nick:'mario',lat_r:45.326,lon_r:10.6594,indice:4.2,livello:7,seen_at:new Date().toISOString(),comune:'Volta Mantovana'}]}")
        foto=[]
        for i,(sez,tit,cosa,js,ms) in enumerate(P,1):
            try:
                await pg.evaluate(RESET);await pg.evaluate("()=>go('home')");await pg.wait_for_timeout(500);await pg.evaluate(RESET)
                await pg.evaluate(js);await pg.wait_for_timeout(ms)
                img=await pg.screenshot(type='jpeg',quality=72)
                foto.append((i,sez,tit,cosa,base64.b64encode(img).decode()))
                print(i,tit,'ok',flush=True)
            except Exception as e:
                print(i,tit,'ERRORE',str(e)[:120],flush=True);foto.append((i,sez,tit,cosa,None))
        await b.close()
    ver=open(R+'/dist/sw.js').read().split('\n')[1][:80] if os.path.exists(R+'/dist/sw.js') else ''
    oggi=datetime.date.today().strftime('%d/%m/%Y')
    sez=[];[sez.append(f[1]) for f in foto if f[1] not in sez]
    E=html.escape
    card=lambda f:f'''<article class="p" id="p{f[0]}"><div class="ph">{f'<img loading="lazy" alt="" src="data:image/jpeg;base64,{f[4]}">' if f[4] else '<div class="noimg">foto non riuscita</div>'}</div>
      <div class="pt"><span class="n">Pagina {f[0]}</span><h3>{E(f[2])}</h3><p>{E(f[3])}</p></div></article>'''
    indice=''.join(f'<li><a href="#p{f[0]}"><b>{f[0]}</b> {E(f[2])}</a></li>' for f in foto)
    corpo=''.join(f'<section><h2>{E(s)}</h2><div class="grid">'+''.join(card(f) for f in foto if f[1]==s)+'</div></section>' for s in sez)
    page=f'''<title>Mappa di ZombieSafeHouse</title><meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;600;800&display=swap"><style>
/* colori e caratteri dell'app (fumetto: inchiostro scuro, giallo, carta) — griglia di foto del telefono per sezione */
:root{{--bg:#f6efe0;--fg:#140f1f;--card:#fffdf7;--mut:#5d5670;--acc:#f7d64a;--line:#140f1f;--acc-fg:#140f1f;--disp:'Bangers',Impact,sans-serif;--body:'Inter',-apple-system,system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#17131f;--fg:#f3eee4;--card:#231d2e;--mut:#b9b0c9;--line:#d9d2e6;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#17131f;--fg:#f3eee4;--card:#231d2e;--mut:#b9b0c9;--line:#d9d2e6;color-scheme:dark}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.45 var(--body)}}
header,main,footer{{max-width:1100px;margin:0 auto;padding-block:16px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
h1,h2{{font-family:var(--disp);font-weight:400;letter-spacing:.02em;text-wrap:balance}}h1{{font-size:38px;line-height:1.05}}h1{{margin:8px 0 4px}}.sub{{color:var(--mut);margin:0 0 12px}}
.how{{background:var(--acc);color:var(--acc-fg);border:3px solid var(--acc-fg);box-shadow:4px 4px 0 var(--line);padding:12px 14px;margin:12px 0}}.how p{{margin:4px 0}}
.idx{{columns:2 220px;padding-left:0;list-style:none;margin:8px 0 0}}.idx li{{break-inside:avoid;margin:2px 0}}.idx a{{color:var(--fg);text-decoration:none}}.idx b{{display:inline-block;min-width:2em}}
h2{{margin:28px 0 10px;font-size:28px;border-bottom:3px solid var(--line);padding-bottom:4px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}}
.p{{background:var(--card);border:3px solid var(--line);box-shadow:4px 4px 0 var(--line);display:flex;flex-direction:column;scroll-margin-top:12px}}
.ph img{{display:block;width:100%;height:auto;border-bottom:3px solid var(--line)}}.noimg{{padding:40px 10px;text-align:center;color:var(--mut)}}
.pt{{padding:10px 12px;min-width:0}}.pt h3{{margin:2px 0 4px;font-size:17px}}.pt p{{margin:0;color:var(--mut);font-size:14px}}
.n{{display:inline-block;background:var(--acc);color:var(--acc-fg);border:2px solid var(--acc-fg);font-variant-numeric:tabular-nums;font-weight:800;font-size:13px;padding:1px 8px}}
footer{{color:var(--mut);font-size:13px}}
</style><header><h1>🗺️ Mappa dell'app ZombieSafeHouse</h1><p class="sub">{len(foto)} pagine fotografate il {oggi} · versione {E(ver)}</p>
<div class="how"><p><b>Come chiedere una modifica:</b> scrivi a Claude il numero della pagina e cosa cambiare.</p>
<p>Esempio: <i>“Pagina 6: il pulsante Valuta più in alto, e il testo del piano più corto.”</i></p>
<p>Le foto sono fatte con dati di prova (server finto): nomi e numeri non sono quelli veri.</p></div>
<ol class="idx">{indice}</ol></header><main>{corpo}</main>
<footer>Si rifà con: python3 docs/strumenti/mappa_app.py &lt;cartella&gt;</footer>'''
    os.makedirs(OUT,exist_ok=True);open(os.path.join(OUT,'mappa_app.html'),'w').write(page)
    print('scritta',os.path.join(OUT,'mappa_app.html'),round(len(page)/1024),'KB · errori pagina:',errs[:5])
asyncio.run(main())
