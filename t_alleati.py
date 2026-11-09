import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;G.gems=60;await wMine(true);await orLoad(true);SOC.tab='squadra';go('social');}")
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>closeSheet()")
        print('schede Superstiti:',await pg.evaluate("()=>[...document.querySelectorAll('.sseg button')].map(b=>b.textContent.trim()).join(' | ')"))
        print('elenco alleati:',await pg.evaluate("()=>[...document.querySelectorAll('.alspan .alrow')].map(r=>r.querySelector('.alrt').textContent.replace(/\\s+/g,' ').trim()+' | '+r.querySelector('.alpc').textContent.replace(/\\s+/g,' ').trim())"))
        print('vecchia lista nascosta:',await pg.evaluate("()=>{const a=document.querySelector('.ayb');return !a||a.hidden}"))
        await pg.screenshot(path='y_als.png')
        await pg.evaluate("()=>document.querySelector('.alspan [data-alv=\"u2\"] .alrt').click()");await pg.wait_for_timeout(1500)
        print('simulazione di giangy:',await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return [s.querySelector('.alhead').textContent.replace(/\\s+/g,' ').trim(),[...s.querySelectorAll('.alhb')].map(b=>b.textContent.replace(/\\s+/g,' ').trim())]}"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-ah=\"1\"]').click()");await pg.wait_for_timeout(500)
        print('dettaglio casa:',await pg.evaluate("()=>{const d=document.querySelector('#sheet.open .alhd');return d&&d.textContent.replace(/\\s+/g,' ').trim().slice(0,160)}"))
        await pg.screenshot(path='y_alsim.png')
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-alh]').click()");await pg.wait_for_timeout(1800)
        print('dopo rinforzi:',await pg.evaluate("()=>{const b=document.querySelector('#sheet.open [data-alh]');return b&&b.textContent}"))
        await pg.evaluate("()=>closeSheet()");await pg.evaluate("()=>{go('orda');}");await pg.wait_for_timeout(500);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(2500)
        print('in Orda:',await pg.evaluate("()=>{const p=document.querySelector('.alsorda');return p&&!p.hidden&&p.textContent.replace(/\\s+/g,' ').trim().slice(0,140)}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
