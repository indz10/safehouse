import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);go('home');}")
        await pg.wait_for_timeout(1000);await pg.evaluate("()=>closeSheet()")
        print('home:',await pg.evaluate("()=>[...document.querySelectorAll('[data-hs]')].map(b=>b.textContent.trim())"))
        await pg.screenshot(path='y_s_home.png')
        await pg.evaluate("()=>go('orda')");await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();G.ss='impero';renderHub();}");await pg.wait_for_timeout(1300)
        print('orda sezioni:',await pg.evaluate("()=>[...document.querySelectorAll('.oseg2 button')].map(b=>b.textContent+(b.classList.contains('on')?'*':''))"))
        print('oggi:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden&&!e.matches('.oseg2')).map(e=>(e.className.match(/opan|lpan|tmp|daily|wpan|apan|acard/)||[e.tagName.toLowerCase()])[0]).slice(0,8).join(',')"),'| riquadro orda:',await pg.evaluate("()=>[...document.querySelectorAll('.opan .opx button')].map(b=>b.textContent.trim())"))
        await pg.screenshot(path='y_s_orda.png',full_page=True)
        await pg.evaluate("()=>{SOC.tab='squadra';go('social');}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
        print('squadra:',await pg.evaluate("()=>{const a=document.querySelector('#socBody .apan');return a?a.textContent.replace(/\\s+/g,' ').slice(0,120):'manca'}"))
        await pg.evaluate("()=>go('mappa')");await pg.wait_for_timeout(2000)
        print('mondo: filtri visibili?',await pg.evaluate("()=>{const c=document.querySelector('.mfchips');return !!(c&&c.offsetParent)}"),'| case:',await pg.evaluate("()=>document.querySelectorAll('.mhc').length"))
        await pg.evaluate("()=>document.querySelector('[data-mfmore]').click()");await pg.wait_for_timeout(400)
        print('⋯ interruttori:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-mft]')].map(b=>b.textContent.trim())"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-mft=serv]').click()");await pg.wait_for_timeout(200)
        print('servizi acceso:',await pg.evaluate("()=>!document.querySelector('.mapfull').classList.contains('f-serv-off')"))
        await pg.evaluate("()=>{closeSheet();go('casa');}");await pg.wait_for_timeout(1000)
        print('la mia casa (visibili):',await pg.evaluate("()=>['.hcard','.panel.plan','.hval','.rmini','.qact','.hsoc'].map(s=>{const e=document.querySelector(s);return s+':'+(!!(e&&e.offsetParent))})"))
        await pg.evaluate("()=>zmOpen()");await pg.wait_for_timeout(300)
        print('menu voci:',await pg.evaluate("()=>document.querySelectorAll('#zmenu .zmrow').length"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
