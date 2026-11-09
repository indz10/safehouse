import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};__W.wallet.mattoni=900;await wMine(true);await orLoad(true);await defLoad(true);go('casa');}")
        await pg.wait_for_timeout(4500);await pg.evaluate("()=>closeSheet()")
        print('casa vera, pulsanti:',await pg.evaluate("()=>[...document.querySelectorAll('.page > .mycasa:not(.mycasa2) .rinf .fch')].slice(0,6).map(b=>b.textContent.replace(/\\s+/g,' ').trim())"))
        print('casa vera, valutazione:',await pg.evaluate("()=>[...document.querySelectorAll('.rinfreal .fch')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()).slice(0,3)"))
        print('Casa 1, pulsanti:',await pg.evaluate("()=>[...document.querySelectorAll('.mycasa2 .rinf .fch')].map(b=>b.textContent.replace(/\\s+/g,' ').trim())"))
        el=await pg.query_selector('.mycasa2');await el.screenshot(path='y_fort.png')
        m0=await pg.evaluate("()=>W.m.mattoni");await pg.evaluate("()=>document.querySelector('.mycasa2 .rinf [data-fk=fossato]').click()");await pg.wait_for_timeout(3500)
        print('compra fossato: mattoni',m0,'→',await pg.evaluate("()=>W.m.mattoni"),'| server:',await pg.evaluate("()=>__W.defs"),'| scheda dopo:',await pg.evaluate("()=>{const b=document.querySelector('.mycasa2 .rinf [data-fk=fossato]');return b&&b.textContent.replace(/\\s+/g,' ').trim()}"))
        await pg.evaluate("()=>{go('mappa');}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();houseSheet(myHouses()[1]);}");await pg.wait_for_timeout(2200)
        print('scheda casa, consigliate:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .fortpan .fch')].map(b=>b.textContent.replace(/\\s+/g,' ').trim())"),'| vecchi consigli IA tolti:',await pg.evaluate("()=>!document.querySelector('#sheet.open .hai')"))
        print('simulatore, difese provabili:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .thdef b')].map(b=>b.textContent)"))
        await pg.evaluate("()=>{closeSheet();zmOpen();}");await pg.wait_for_timeout(300)
        print('menu:',await pg.evaluate("()=>document.querySelector('#zmenu .zmver').textContent"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
