import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='ml_stub.js');await pg.add_init_script(path='sb_mock.js');await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');go('orda');}")
        await pg.wait_for_timeout(300);await pg.evaluate("()=>{const b=document.querySelector('[data-type=vera]');if(b)b.click();}");await pg.wait_for_timeout(1200);await pg.evaluate("()=>{closeSheet();G.howSeen=1;G.tourDone=1;}")
        await pg.evaluate("async()=>{await wMine(true);await orLoad(true);renderHub();}");await pg.wait_for_timeout(900)
        el=await pg.query_selector('.opan');print('pannello orda:',bool(el),'| striscia:',await pg.evaluate("()=>{const b=document.querySelector('.obanner');return b&&b.textContent.replace(/\\s+/g,' ')}"))
        try:
            el=await pg.query_selector('.opan')
            if el: await el.screenshot(path='y_opan.png',timeout=4000)
        except Exception as e: print('foto orda saltata')
        print('ordine pannelli:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden).slice(0,6).map(e=>e.className.split(' ').slice(0,2).join('.')||e.tagName)"))
        await pg.click('[data-oprep]');await pg.wait_for_timeout(600);print('preparato:',await pg.evaluate("()=>OR.s.prepared"))
        c0=await pg.evaluate("()=>G.coins");await pg.click('[data-ocl]');await pg.wait_for_timeout(700)
        print('riscatto: monete',c0,'->',await pg.evaluate("()=>G.coins"),'riscattato',await pg.evaluate("()=>OR.s.claimed"))
        await pg.evaluate("()=>orWatch()");await pg.wait_for_timeout(4500)
        print('assalto sulla mappa: zombie',await pg.evaluate("()=>document.querySelectorAll('.lm-z').length"),'banner',await pg.evaluate("()=>!!document.querySelector('.oplay')"))
        await pg.wait_for_timeout(9000);print('dopo assalto: esiti',await pg.evaluate("()=>[...document.querySelectorAll('.lm-ob')].map(e=>e.textContent)"))
        await pg.evaluate("()=>orTour(0)");await pg.wait_for_timeout(1600)
        print('giro guidato passo 1:',await pg.evaluate("()=>{const o=document.querySelector('.ot-box p');return o&&o.textContent.slice(0,60)}"))
        await pg.screenshot(path='y_tour.png')
        for i in range(7):
            await pg.evaluate("()=>{const b=document.querySelector('[data-otn]');if(b)b.click();}");await pg.wait_for_timeout(1500)
        print('ultimo passo:',await pg.evaluate("()=>{const o=document.querySelector('.ot-box small');return o&&o.textContent}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
