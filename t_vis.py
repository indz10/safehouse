import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_reale
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_reale.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);go('home');}")
        await pg.wait_for_timeout(2000);await pg.evaluate("()=>{closeSheet();houseSheet(myHouses()[0]);}");await pg.wait_for_timeout(3500)
        print('scelta:',await pg.evaluate("()=>document.querySelector('#sheet .hkvis').innerText.replace(/\\n+/g,' | ')"),'| attiva:',await pg.evaluate("()=>document.querySelector('#sheet .hkvb .on').textContent"))
        await pg.evaluate("()=>document.querySelector('#sheet [data-hkv=tutti]').click()");await pg.wait_for_timeout(800)
        print('dopo “Tutti”: attiva =',await pg.evaluate("()=>document.querySelector('#sheet .hkvb .on').textContent"),'| server =',await pg.evaluate("()=>__W.vis"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
