import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(10000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        print('barra:',await pg.evaluate("()=>[...document.querySelectorAll('#nav button span')].map(s=>s.textContent)"))
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;go('casa');}")
        await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
        print('casa:',await pg.evaluate("()=>[!!document.querySelector('.hcard'),!!document.querySelector('.hval'),!!document.querySelector('.panel.plan'),document.querySelectorAll('.hvalg button').length]"))
        await pg.screenshot(path='y_s_casa.png',full_page=True)
        await pg.tap('#nav [data-tab=mappa]');await pg.wait_for_timeout(2000)
        print('mappa:',await pg.evaluate("()=>{const m=document.querySelector('.mapfull');return[!!m,m&&m.offsetHeight,document.querySelectorAll('.mfchips button').length,!!document.querySelector('.mfbar')]}"))
        await pg.evaluate("()=>document.querySelector('[data-mf=serv]').click()");await pg.wait_for_timeout(200)
        print('filtro servizi acceso:',await pg.evaluate("()=>!document.querySelector('.mapfull').classList.contains('f-serv-off')"))
        await pg.screenshot(path='y_s_mappa.png')
        await pg.evaluate("()=>document.querySelector('[data-mfmore]').click()");await pg.wait_for_timeout(400)
        print('menu ⋯:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .mfmenu button').length"))
        await pg.evaluate("()=>closeSheet()")
        await pg.tap('#nav [data-tab=orda]');await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]')||document.querySelector('[data-type=villa]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();G.howSeen=1;renderHub();}");await pg.wait_for_timeout(1500)
        for ss in ['unica']:
            print('orda',ss,':',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden&&!e.matches('.oseg2')).map(e=>(e.className.match(/opan|lpan|tmp|daily|wpan|apan|terrp|camp|spanx/)||[e.tagName.toLowerCase()+'.'+(e.className.split(' ')[0]||'')])[0]).slice(0,9).join(',')"))
            await pg.screenshot(path=f'y_s_{ss}.png')
        print('vecchie schede visibili:',await pg.evaluate("()=>[...document.querySelectorAll('[data-sub]')].filter(b=>b.offsetParent).length"))
        await pg.evaluate("()=>{zmOpen();document.querySelector('#zmenu [data-zm=io]').click()}");await pg.wait_for_timeout(800)
        print('io:',await pg.evaluate("()=>[...document.querySelectorAll('.iorow b')].map(b=>b.textContent).join(' | ')"))
        await pg.screenshot(path='y_s_io.png',full_page=True)
        print('ERR',errs[:6]);await b.close()
asyncio.run(main())
