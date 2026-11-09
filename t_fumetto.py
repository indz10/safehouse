import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};S.zone=await analyzeZone('A');S.zone.address='Via Roma 10, Volta Mantovana';S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};await wMine(true);await orLoad(true);go('orda');}")
        await pg.wait_for_timeout(800)
        await pg.evaluate("()=>assalto('last')");await pg.wait_for_timeout(6500)
        print('tavola 1:',await pg.evaluate("()=>[document.getElementById('fumetto').className,document.querySelectorAll('#fumetto .fpan.in').length,document.querySelector('.ftop span').textContent]"))
        await pg.screenshot(path='y_fu1.png')
        await pg.evaluate("()=>document.querySelector('[data-fnext]').click()");await pg.wait_for_timeout(6500)
        print('tavola 2:',await pg.evaluate("()=>[document.getElementById('fumetto').className,document.querySelector('.ftop span').textContent]"))
        await pg.screenshot(path='y_fu2.png')
        await pg.evaluate("()=>document.querySelector('[data-fx]').click()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>assalto('sim')");await pg.wait_for_timeout(1000)
        await pg.evaluate("()=>document.getElementById('fumetto').click()");await pg.wait_for_timeout(1500)
        print('simulazione (tocco per saltare):',await pg.evaluate("()=>[document.querySelector('.ftop b').textContent,document.querySelectorAll('#fumetto .fpan.in').length,document.querySelector('.fcap.b').textContent.slice(0,60)]"))
        await pg.evaluate("()=>document.querySelector('[data-fmap]').click()");await pg.wait_for_timeout(2500)
        print('poi la mappa:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.regbar')]"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
