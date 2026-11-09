import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;G.type=G.type||'villa';G.gems=60;G.spins=3;G.scratch=2;await wMine(true);await ayLoad(true);SOC.tab='squadra';go('social');}")
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>closeSheet()")
        print('bonus di squadra:',await pg.evaluate("()=>{const b=document.querySelector('.tbbox');return b&&b.textContent.replace(/\\s+/g,' ').trim()}"))
        print('alleati:',await pg.evaluate("()=>[...document.querySelectorAll('[data-ashield]')].map(b=>b.parentNode.textContent.replace(/\\s+/g,' ').trim().slice(0,70))"))
        await pg.screenshot(path='y_sq.png')
        g0=await pg.evaluate("()=>G.gems");await pg.evaluate("()=>document.querySelector('[data-ashield]').click()");await pg.wait_for_timeout(1200)
        print('scudo: gemme',g0,'→',await pg.evaluate("()=>G.gems"),'| pulsante dopo:',await pg.evaluate("()=>{renderSocial();return new Promise(r=>setTimeout(()=>r([...document.querySelectorAll('[data-ashield]')].map(b=>b.textContent)),900))}"))
        await pg.evaluate("()=>document.querySelector('[data-agive]').click()");await pg.wait_for_timeout(400)
        print('tipi di dono:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-k]')].map(b=>b.textContent.trim())"))
        await pg.evaluate("()=>{document.querySelector('#sheet.open [data-k=giri]').click()}");await pg.wait_for_timeout(200)
        s0=await pg.evaluate("()=>G.spins");await pg.evaluate("()=>document.querySelector('#sheet.open [data-ayok]').click()");await pg.wait_for_timeout(800)
        print('dono di un giro: giri',s0,'→',await pg.evaluate("()=>G.spins"))
        await pg.evaluate("()=>{document.querySelector('[data-agive]').click()}");await pg.wait_for_timeout(300);await pg.evaluate("()=>{document.querySelector('#sheet.open [data-k=gemme]').click();document.querySelector('#ayN').value=10;document.querySelector('#sheet.open [data-ayok]').click()}");await pg.wait_for_timeout(800)
        print('dono di 10 gemme: gemme ora',await pg.evaluate("()=>G.gems"))
        print('bacheca scudo:',await pg.evaluate("()=>{const d=document.createElement('div');d.innerHTML=socLine({kind:'shield',actor:'u2',actor_nick:'giangy',target:'me',target_nick:'ale',created_at:new Date().toISOString()});return d.textContent.replace(/\\s+/g,' ').trim()}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
