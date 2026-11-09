import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(700)
        print('home ospite:',await pg.evaluate("()=>[!!document.querySelector('.hscene'),[...document.querySelectorAll('[data-hs]')].map(b=>b.textContent.trim())]"))
        await pg.screenshot(path='y_h1.png')
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};__W.b['g-33.86880_151.20930']={owner:'me',lat:-33.8688,lon:151.2093,level:1,paid:3400};"
          "SPONSORS.ferr={name:'Ferramenta Rossi',logo:'FR'};SP_GEO.ferr={lat:45.3262,lon:10.6590,id:'s1'};SP_OFF.ferr='Sconto 10% serrature';SP_CAT.ferr='Ferramenta';await wMine(true);await orLoad(true);go('home');}")
        await pg.wait_for_timeout(1200);await pg.evaluate("()=>closeSheet()");await pg.screenshot(path='y_h2.png')
        print('home collegato:',await pg.evaluate("()=>[[...document.querySelectorAll('.hschips span')].map(s=>s.textContent),[...document.querySelectorAll('[data-hs]')].map(b=>b.textContent.trim())]"))
        await pg.evaluate("()=>document.querySelector('[data-hs=mondo]').click()");await pg.wait_for_timeout(2200)
        print('mondo, le tue case:',await pg.evaluate("()=>[...document.querySelectorAll('.mhc')].map(c=>c.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.screenshot(path='y_m1.png')
        await pg.evaluate("()=>document.querySelector('[data-mh=\"2\"]').click()");await pg.wait_for_timeout(3800)
        print('scheda Australia:',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,200)"))
        await pg.evaluate("()=>closeSheet()");await pg.evaluate("()=>document.querySelector('[data-mh=\"1\"]').click()");await pg.wait_for_timeout(2000)
        print('azioni:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .hact b')].map(b=>b.textContent)"),'| lavori 50 km:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-hsp] b')].map(b=>b.textContent)"))
        await pg.screenshot(path='y_m2.png',full_page=False)
        m0=await pg.evaluate("()=>W.m.mattoni");await pg.evaluate("()=>document.querySelector('#sheet.open [data-ha=up]').click()");await pg.wait_for_timeout(1200)
        print('potenzia: mattoni',m0,'→',await pg.evaluate("()=>W.m.mattoni"),'| livello casa 1:',await pg.evaluate("()=>__W.b['g45.32600_10.65900'].level"))
        await pg.evaluate("()=>{__W.wallet.mattoni=10;}");await pg.evaluate("async()=>{await wMine(true);houseSheet(myHouses()[1]);}");await pg.wait_for_timeout(900)
        print('pochi mattoni:',await pg.evaluate("()=>{const n=document.querySelector('#sheet.open .need');return n&&n.textContent}"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-ha=up]').click()");await pg.wait_for_timeout(500)
        print('→ bottega:',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,90)"))
        await pg.evaluate("()=>{closeSheet();go('casa');}");await pg.wait_for_timeout(1000)
        print('la mia casa:',await pg.evaluate("()=>[!!document.querySelector('.hcard'),!!document.querySelector('.cback'),!!document.querySelector('.panel.plan')]"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
