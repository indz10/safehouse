import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# CACCIA NELLA LENTE e CASE DEI CONDOMINI (migrazione 021): pulsante 🔫 nella Lente, zombie intorno (girarsi con la
# bussola), colpi, zombie che ti raggiunge, fine con premi; casa non registrata → guida, scheda "Registra la tua casa",
# notifica ?reg=1; riconoscimento dell'edificio dal bordo (condomini grandi con l'indirizzo sulla strada).
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3000);await pg.evaluate("()=>closeSheet()")
        async def bussola(h):
            await pg.evaluate("h=>{for(let i=0;i<20;i++){const e=new Event('deviceorientation');Object.defineProperty(e,'webkitCompassHeading',{value:h});Object.defineProperty(e,'beta',{value:90});window.dispatchEvent(e);}}",h)
            await pg.wait_for_timeout(300)
        await pg.click('[data-mwlente]');await pg.wait_for_timeout(2500);await bussola(0)
        print('pulsante caccia:',await pg.evaluate("()=>{const b=document.querySelector('#lente [data-cacgo]');return b&&b.textContent}"))
        en0=await pg.evaluate("()=>__SUP.energia")
        await pg.evaluate("()=>document.querySelector('#lente [data-cacgo]').click()");await pg.wait_for_timeout(1800)
        vis="()=>[...document.querySelectorAll('#lente .lncz1')].filter(e=>e.style.display!=='none'&&e.style.visibility!=='hidden').length"
        print('caccia partita:',await pg.evaluate("()=>[CAC.on,CAC.Z.length]"),'energia usata:',en0-await pg.evaluate("()=>__SUP.energia"),'| zombie davanti:',await pg.evaluate(vis),'| freccia:',await pg.evaluate("()=>getComputedStyle(document.querySelector('#lente .lncedge.l')).display"))
        # colpisco i due davanti (2 colpi ciascuno)
        for i in range(4):
            await pg.evaluate("()=>{const z=CAC.Z.find(o=>o.st==='via'&&o.el.style.visibility!=='hidden');if(z)z.el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}");await pg.wait_for_timeout(250)
        print('abbattuti davanti:',await pg.evaluate("()=>CAC.uccisi"))
        # mi giro a ovest per il bruto (4 colpi)
        await bussola(270);await pg.wait_for_timeout(400)
        print('bruto visibile girandosi:',await pg.evaluate(vis))
        for i in range(4):
            await pg.evaluate("()=>{const z=CAC.Z.find(o=>o.st==='via'&&o.el.style.visibility!=='hidden');if(z)z.el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}");await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(2500)
        print('fine:',await pg.evaluate("()=>[(window.__CACF||{}).p_uccisi,(document.querySelector('#lente .lncres b')||{}).textContent,(document.querySelector('#lente .lncres span')||{}).textContent]"))
        # una seconda caccia lasciata andare: lo zombie ti raggiunge
        await pg.evaluate("()=>{document.querySelector('#lente [data-cacagain]').click()}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>CAC.Z.forEach(o=>{o.dur=300})");await pg.wait_for_timeout(3000)
        print('raggiunto dagli zombie:',await pg.evaluate("()=>[CAC.persi,(window.__CACF||{}).p_uccisi]"))
        await pg.evaluate("()=>lenteClose()");await pg.wait_for_timeout(600)
        print('lente chiusa:',await pg.evaluate("()=>!document.getElementById('lente')"))
        # casa non registrata nel mondo
        await pg.evaluate("async()=>{W.m.home=null;await gdLoad(true);gdSheet()}");await pg.wait_for_timeout(1500)
        print('guida, prima carta:',await pg.evaluate("()=>(document.querySelector('#sheet.open .gdcard .gdtx>b')||{}).textContent"))
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=mappa&reg=1')}");await pg.wait_for_timeout(3500)
        print('dalla notifica:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h, #sheet.open h3')||{}).textContent,document.querySelectorAll('#sheet.open [data-creg]').length]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-creg]').click()");await pg.wait_for_timeout(2500)
        print('registrata:',await pg.evaluate("()=>!!window.__CLAIM"))
        # condominio grande: indirizzo sulla strada a 20 m dal bordo, centro a 45 m
        r=await pg.evaluate("()=>{const g=[[45.0,10.0],[45.0,10.0012],[45.0008,10.0012],[45.0008,10.0]].map(([la,lo])=>({lat:la,lon:lo}));return [wPick([{type:'way',id:5,tags:{building:'apartments'},geometry:g}],44.99982,10.0006)?.bid||null,wPick([{type:'way',id:5,tags:{building:'apartments'},geometry:g}],44.9994,10.0006)]}")
        print('condominio dalla strada (20 m):',r[0],'| troppo lontano (70 m):',r[1])
        print('ERR',E);await b.close()
asyncio.run(main())
