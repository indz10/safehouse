import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# LENTE (Fase 10A): fotocamera finta di Chromium, filtro fumetto WebGL, etichette con GPS + bussola, zombie, chiusura.
# Deve stampare: fotocamera: True | filtro: True ... etichette visibili: >0 ... zombie: >0 ... dopo la chiusura: fotocamera spenta True ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();S.zv='mondo';go('mappa')}")
        await pg.wait_for_timeout(3500);await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        # presidi del server finto vicino a me (a nord-est e a nord-ovest)
        await pg.evaluate("()=>{window.__PRES=[{id:'osm:n1',name:'Parco Nord',kind:'parco',lat:45.3285,lon:10.6584,stato:'libero',record:0,guardie:0,difesa:55,vicino:true},{id:'osm:n2',name:'Piazza Est',kind:'piazza',lat:45.3256,lon:10.6622,stato:'mio',record:2,guardie:1,difesa:67,vicino:true}];SP_GEO.lx={lat:45.3240,lon:10.6582};SPONSORS.lx=SPONSORS.lx||{name:'Ferramenta Sud',logo:'FS'}}")
        print('pulsante mappa:',await pg.evaluate("()=>!!document.querySelector('[data-mflente]')"))
        await pg.click('[data-mflente]');await pg.wait_for_timeout(3000)
        print('fotocamera:',await pg.evaluate("()=>!!(LENTE.stream&&LENTE.stream.active)"),'| filtro:',await pg.evaluate("()=>!!LENTE.G"),'| fotogrammi:',await pg.evaluate("()=>LENTE.frames>10"))
        # bussola verso nord (iPhone: webkitCompassHeading)
        async def bussola(h):
            await pg.evaluate("h=>{for(let i=0;i<30;i++){const e=new Event('deviceorientation');Object.defineProperty(e,'webkitCompassHeading',{value:h});Object.defineProperty(e,'beta',{value:90});window.dispatchEvent(e);}}",h)
            await pg.wait_for_timeout(500)
        vis="()=>[...document.querySelectorAll('.lnlab')].filter(e=>e.style.display!=='none').map(e=>e.querySelector('b').textContent)"
        await bussola(0);print('verso nord:',await pg.evaluate(vis))
        await bussola(90);print('verso est:',await pg.evaluate(vis))
        await bussola(180);print('verso sud:',await pg.evaluate(vis))
        print('stato:',await pg.evaluate("()=>document.querySelector('.lnst').textContent"),'|',await pg.evaluate("()=>document.querySelector('.lnn').textContent"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente.png')
        # casa tua (sei lì): etichetta fissa in basso; toccandola si potenzia dentro la Lente
        print('casa tua qui:',await pg.evaluate("()=>[...document.querySelectorAll('.lnlab.qui')].map(e=>e.textContent)"))
        await pg.evaluate("()=>document.querySelector('.lnlab.qui').click()");await pg.wait_for_timeout(2500)
        print('potenzia:',await pg.evaluate("()=>{const p=document.querySelector('.lnpan');return p?[!!p.querySelector('[data-sd]'),!!p.querySelector('[data-sbuy]'),!!p.querySelector('[data-sprep]'),(p.querySelector('.thres')||{}).textContent]:null}"),'| fotocamera accesa:',await pg.evaluate("()=>!!(LENTE.stream&&LENTE.stream.active)"))
        await pg.evaluate("()=>{const b=document.querySelector('.lnpan [data-sd][data-v=\"1\"]:not([disabled])');if(b)b.click()}");await pg.wait_for_timeout(300)
        print('prova miglioria:',await pg.evaluate("()=>(document.querySelector('.lnpan .thres')||{}).textContent"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente_casa.png')
        await pg.click('[data-lnpx]');await pg.wait_for_timeout(300)
        await pg.click('[data-lnprev]');await pg.wait_for_timeout(4000)
        print('zombie:',await pg.evaluate("()=>document.querySelectorAll('.lnzb').length"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente_orda.png')
        await pg.evaluate("()=>{window.__TR=LENTE.stream.getTracks()}");await pg.click('[data-lnx]');await pg.wait_for_timeout(500)
        print('dopo la chiusura: fotocamera spenta',await pg.evaluate("()=>__TR.every(t=>t.readyState==='ended')"),'| lente tolta',await pg.evaluate("()=>!document.getElementById('lente')"))
        # dal menu ☰
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(700)
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+"/lente_menu.png")
        # casa comprata a 12 m dalla casa vera: "Sei qui" deve restare sulla casa vera
        await pg.evaluate("async()=>{__W.b['B9']={owner:'me',lat:45.3256,lon:10.6583,level:1,paid:200};await wMine(true);}")
        await pg.evaluate("()=>{closeSheet();lenteOpen()}");await pg.wait_for_timeout(1500)
        # edifici e servizi intorno (come li darebbe OpenStreetMap): un edificio libero a est, i carabinieri a nord
        await pg.evaluate("""()=>{const R=(la,lo,dx,dy)=>[[lo-dx,la-dy],[lo+dx,la-dy],[lo+dx,la+dy],[lo-dx,la+dy]];
          LENTE.area={lat:LENTE.pos.lat,lon:LENTE.pos.lon,B:[{id:'w77',R:R(45.3255,10.6582,.00008,.00006),t:{b:'house',l:'2',n:'',a:''}},{id:'w88',R:R(45.3255,10.6590,.00007,.00006),t:{b:'house',l:'2',n:'',a:'Via Roma 12'}}],
            P:[{id:'n5',ic:'🚓',cat:'Carabinieri / Polizia',name:'Stazione Carabinieri',lat:45.3270,lon:10.6582,tel:'0376 1',ore:'',ind:'Via Garibaldi 1',srv:true},{id:'n6',ic:'☕',cat:'Bar',name:'Bar Sport',lat:45.3262,lon:10.6582,tel:'',ore:'7-20',ind:'',srv:false}]};
          LENTE.tpos=null;lnRefresh(true);}""")
        await pg.wait_for_timeout(800)
        await bussola(90);await pg.wait_for_timeout(600)
        print('sei qui:',await pg.evaluate("()=>[...document.querySelectorAll('.lnlab.qui b')].map(e=>e.textContent)"))
        print('mirino:',await pg.evaluate("()=>{const a=document.querySelector('.lnaim');return a&&!a.hidden?a.textContent:null}"))
        # due passi fuori da casa tua, verso est: il mirino prende la casa libera del vicino
        await pg.evaluate("()=>{LENTE.pos={lat:45.3255,lon:10.6586};LENTE.gps=true;}");await pg.wait_for_timeout(900)
        print('mie case fuori inquadratura:',await pg.evaluate("()=>[...document.querySelectorAll('.lnlab.edge')].map(e=>e.textContent)"))
        print('mirino sul vicino:',await pg.evaluate("()=>{const a=document.querySelector('.lnaim');return a&&!a.hidden?a.textContent:null}"))
        await pg.click('.lnaim');await pg.wait_for_timeout(1500)
        print('scheda sopra la Lente:',await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return s?[(s.querySelector('h3')||{}).textContent,!!document.getElementById('lente'),/Compra/.test(s.textContent)]:null}"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente_compra.png')
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await bussola(0);await pg.wait_for_timeout(600)
        print('servizi verso nord:',await pg.evaluate("()=>[...document.querySelectorAll('.lnlab.k-srv,.lnlab.k-att')].filter(e=>e.style.display!=='none').map(e=>e.querySelector('b').textContent)"))
        await pg.evaluate("()=>[...document.querySelectorAll('.lnlab.k-srv')].find(e=>/Carabinieri/.test(e.textContent)).click()");await pg.wait_for_timeout(400)
        print('scheda servizio:',await pg.evaluate("()=>(document.querySelector('.lnpan .lnph')||{}).textContent"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente_servizi.png')
        await pg.evaluate("()=>lenteClose()")
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(700)
        print('menu:',await pg.evaluate("()=>/Lente: guarda/.test(document.body.innerText)"))
        print('ERR',errs);await b.close()
asyncio.run(main())
