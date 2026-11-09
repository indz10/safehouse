import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json,math
from playwright.async_api import async_playwright
import t_terr, t_reale
async def route(r):
    return await t_reale.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.clear();localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.3255,lon:10.6582,level:2,paid:200};__W.b['g45.33000_10.66000']={owner:'me',lat:45.3255,lon:10.6582,level:1,paid:200};__W.defs={'g45.32600_10.65900fossato':2,'g45.32600_10.65900barricate':2};__W.wallet.mattoni=900;await wMine(true);await orLoad(true);await defLoad(true);go('casa');}")
        await pg.wait_for_timeout(4500);await pg.evaluate("()=>closeSheet()")
        print('La mia casa, schede:',await pg.evaluate("()=>[...document.querySelectorAll('.mycasa')].map(c=>c.querySelector('.disp').textContent+' | disegno vero: '+(c.querySelector('.mcart').dataset.real||'no')+' | '+[...c.querySelectorAll('.mcchips span')].map(s=>s.textContent).join(' · '))"))
        el=await pg.query_selector('.mycasa2');await el.screenshot(path='y_mc2.png')
        await pg.evaluate("()=>{const d=document.querySelector('.mycasa2 .mcdia');d.open=true;d.dispatchEvent(new Event('toggle'));}");await pg.wait_for_timeout(600)
        print('diario:',await pg.evaluate("()=>document.querySelector('.mycasa2 [data-mcdl]').textContent.replace(/\\s+/g,' ').trim()"))
        await pg.evaluate("()=>document.querySelector('.mycasa2 [data-mcs]').click()");await pg.wait_for_timeout(2000)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sadv]').click()");await pg.wait_for_timeout(500)
        print('consigliami:',await pg.evaluate("()=>[document.querySelector('#sheet.open .thres').textContent.replace(/\\s+/g,' '),(document.querySelector('#sheet.open [data-sbuy]')||{}).textContent]"))
        await pg.evaluate("()=>{closeSheet();assalto('sim');}");await pg.wait_for_timeout(5500)
        print('assedio:',await pg.evaluate("()=>{const F=document.getElementById('fumetto');return [F.className,!!F.querySelector('.p1 .fbg svg.real'),F.querySelector('.fspec')&&F.querySelector('.fspec').textContent,[...F.querySelectorAll('.fcron span')].map(s=>s.textContent)]}"))
        await pg.screenshot(path='y_assedio.png')
        await pg.evaluate("()=>{document.getElementById('fumetto').remove();go('mappa');}");await pg.wait_for_timeout(3000)
        print('effetti sulla mappa:',await pg.evaluate("()=>[...document.querySelectorAll('.fxm')].map(e=>e.className+' '+e.textContent)"))
        await pg.evaluate("()=>playerSheet('u2')");await pg.wait_for_timeout(800)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pdm]').click()");await pg.wait_for_timeout(800)
        await pg.fill('#dmT','Ti mando lo scudo!');await pg.evaluate("()=>document.querySelector('#sheet.open [data-dms]').click()");await pg.wait_for_timeout(900)
        print('messaggi:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .dmm')].map(m=>(m.classList.contains('mine')?'io: ':'lui: ')+m.querySelector('span').textContent)"))
        await pg.evaluate("()=>{closeSheet();SOC.tab='piazza';go('social');}");await pg.wait_for_timeout(1500)
        print('Piazza → Privati:',await pg.evaluate("()=>(document.querySelector('[data-pzdm]')||{}).textContent"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
