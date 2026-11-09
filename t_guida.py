import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        print('ospite, homepage:',await pg.evaluate("()=>{const c=document.querySelector('.coach');return c&&c.textContent.replace(/\\s+/g,' ').trim().slice(0,90)}"))
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};await wMine(true);await orLoad(true);go('home');}")
        await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
        print('scudo al server:',await pg.evaluate("()=>[scudoLv(),__W.rs]"))
        print('homepage:',await pg.evaluate("()=>document.querySelector('.coach').textContent.replace(/\\s+/g,' ').trim().slice(0,90)"))
        await pg.screenshot(path='y_coach_home.png')
        await pg.evaluate("()=>document.querySelector('.coach [data-cogo]').click()");await pg.wait_for_timeout(1500)
        print('Fammelo fare →',await pg.evaluate("()=>S.tab+' | '+(document.querySelector('.flashme')?document.querySelector('.flashme').className.slice(0,20):'')"))
        print('orda, guida in cima:',await pg.evaluate("()=>{const c=document.querySelector('.page > .coach');return c&&!c.hidden&&c.textContent.replace(/\\s+/g,' ').trim().slice(0,70)}"))
        await pg.evaluate("()=>document.querySelector('.page > .coach [data-coall]').click()");await pg.wait_for_timeout(400)
        print('tutti i passi:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .costep b')].map(b=>b.textContent)"))
        await pg.screenshot(path='y_coach_all.png')
        await pg.evaluate("()=>closeSheet()")
        await pg.evaluate("()=>{go('orda');}");await pg.wait_for_timeout(500);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(2500)
        print('fronte, chips:',await pg.evaluate("()=>{const c=document.querySelector('[data-frchips]');return c?c.textContent:'nessun fronte'}"))
        print('fronte, tenere:',await pg.evaluate("()=>{const s=[...document.querySelectorAll('[data-frchips] span')].find(s=>/tenere/.test(s.textContent));return s&&s.textContent}"))
        await pg.evaluate("()=>whySheet(null,true)");await pg.wait_for_timeout(300)
        print('perché:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .whyr')].map(r=>r.textContent.replace(/\\s+/g,' ').trim()).concat([document.querySelector('#sheet.open .whytot').textContent])"))
        await pg.screenshot(path='y_why.png')
        await pg.evaluate("()=>{closeSheet();go('mappa');}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();houseSheet(myHouses()[1]);}");await pg.wait_for_timeout(1200)
        print('scheda casa:',await pg.evaluate("()=>document.querySelector('#sheet.open .hsdef').textContent"))
        await pg.evaluate("()=>{closeSheet();openScudo();}");await pg.wait_for_timeout(300)
        print('scudo:',await pg.evaluate("()=>document.querySelector('#sheet.open .panel.moon').textContent.replace(/\\s+/g,' ').trim()"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
