import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;G.gems=60;await wMine(true);await orLoad(true);await thrLoad(true);SOC.tab='classifiche';go('social');}")
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>closeSheet()");await pg.evaluate("()=>socPaint()");await pg.wait_for_timeout(1200)
        print('il mio punteggio:',await pg.evaluate("()=>(document.querySelector('.scme')||{}).innerText"))
        print('righe:',await pg.evaluate("()=>[...document.querySelectorAll('.srank')].slice(0,3).map(r=>r.innerText.replace(/\\n+/g,' '))"),'| periodi:',await pg.evaluate("()=>[...document.querySelectorAll('[data-rp]')].map(b=>b.textContent).join('/')"))
        await pg.evaluate("()=>{const r=[...document.querySelectorAll('.srank')].find(r=>!r.classList.contains('me'));r.querySelector('.stx small').click();}");await pg.wait_for_timeout(800)
        print('dettaglio di un altro:',await pg.evaluate("()=>document.querySelector('#sheet.open').innerText.replace(/\\n+/g,' | ').slice(0,260)"))
        await pg.evaluate("()=>{closeSheet();scSheet(null);}");await pg.wait_for_timeout(800)
        await pg.screenshot(path='y_sc.png')
        await pg.evaluate("()=>{closeSheet();allySheet('u2');}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.querySelector('#sheet [data-ah=\"0\"]').click()");await pg.wait_for_timeout(500)
        print('righe zombie toccabili:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet [data-azk]')].map(r=>r.dataset.azk).join(',')"))
        await pg.evaluate("()=>document.querySelector('#sheet [data-azk=runner]').click()");await pg.wait_for_timeout(800)
        print('zombie alleato:',await pg.evaluate("()=>document.querySelector('#sheet.open .zsh').innerText.replace(/\\n+/g,' | ').slice(0,420)"))
        await pg.evaluate("()=>document.querySelector('#sheet [data-azm]').click()");await pg.wait_for_timeout(700)
        print('consiglio mandato:',await pg.evaluate("()=>(__W.dm||[]).map(m=>m.body)"))
        await pg.screenshot(path='y_az.png')
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
