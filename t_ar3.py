import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# PROVA GENERALE (riscritta nella Fase 3b-1: prima provava l'arena del vecchio gioco, tolta)
# Apre l'app col server finto, passa da tutte le schede, la scheda Orda pulita, la pagina della casa,
# il menu ☰ e lo schermo in orizzontale. Deve stampare  ERR2 []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;}")
        for t in ['home','mappa','orda','social','casa']:
            await pg.evaluate(f"()=>{{closeSheet();go('{t}')}}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{closeSheet();go('orda')}");await pg.wait_for_timeout(1500)
        orda=await pg.evaluate("()=>[...document.querySelectorAll('#app .page > *')].filter(e=>!e.hidden&&e.offsetParent).map(e=>e.className.replace('panel ',''))")
        print('orda:',orda)
        # pagina della casa vera
        await pg.evaluate("async()=>{await wMine(true);const h=myHouses().find(x=>x.home)||myHouses()[0];if(h)await houseSheet(h);}");await pg.wait_for_timeout(1200)
        print('casa:',await pg.evaluate("()=>!!document.querySelector('#sheet.open')"))
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(500)
        print('menu voci:',await pg.evaluate("()=>document.querySelectorAll('#zmenu [data-zm], #sheet.open [data-zm]').length"))
        print('ERR',errs)
        # schermo in orizzontale
        await pg.evaluate("()=>{try{zmClose()}catch(e){};closeSheet();go('orda')}");await pg.set_viewport_size({'width':844,'height':390});await pg.wait_for_timeout(1500)
        await pg.screenshot(path=D+'/x10_land.png');print('ERR2',errs);await b.close()
asyncio.run(main())
