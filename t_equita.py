import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.gems=0;G.tourAsked=1;G.tourDone=1;G.howSeen=1;localStorage.removeItem('zsh_kit_me');await wMine(true);}")
        await pg.wait_for_timeout(1500)
        print('kit:',await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return s&&s.textContent.replace(/\\s+/g,' ').slice(0,110)}"),'| gemme',await pg.evaluate("()=>G.gems"),'| mattoni',await pg.evaluate("()=>W.m.mattoni"))
        await pg.screenshot(path='y_kit.png')
        await pg.evaluate("async()=>{closeSheet();await wMine(true);}");await pg.wait_for_timeout(800)
        print('kit una sola volta:',await pg.evaluate("()=>[!document.querySelector('#sheet.open'),G.gems]"))
        await pg.evaluate("()=>go('home')");await pg.wait_for_timeout(900)
        print('homepage:',await pg.evaluate("()=>[...document.querySelectorAll('.hschips span')].map(s=>s.textContent)"))
        await pg.evaluate("()=>{SOC.tab='rivali';go('social');}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
        print('rivali:',await pg.evaluate("()=>[...document.querySelectorAll('.rivc')].map(c=>c.querySelector('.rivn').textContent.replace(/\\s+/g,' ').trim()+' | pulsanti attivi '+[...c.querySelectorAll('[data-dv]')].filter(b=>!b.disabled).length)"),'| avviso:',await pg.evaluate("()=>{const e=document.querySelector('.eqriv');return e&&e.textContent.slice(0,60)}"))
        await pg.evaluate("()=>{SOC.tab='classifiche';SOC.rs='lega';renderSocial();}");await pg.wait_for_timeout(1500)
        print('lega:',await pg.evaluate("()=>[...document.querySelectorAll('.schips button')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' ')"),await pg.evaluate("()=>[...document.querySelectorAll('.srank')].map(r=>r.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.screenshot(path='y_lega.png')
        await pg.evaluate("()=>{go('mappa');}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();houseSheet(myHouses()[0]);}");await pg.wait_for_timeout(1000)
        print('scheda casa:',await pg.evaluate("()=>{const e=document.querySelector('#sheet.open .eqhs');return e&&e.textContent}"))
        await pg.evaluate("()=>{closeSheet();inviteSheet();}");await pg.wait_for_timeout(700)
        print('invito:',await pg.evaluate("()=>{const e=document.querySelector('#sheet.open .eqpad');return e&&e.textContent.slice(0,70)}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
