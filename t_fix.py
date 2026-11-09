import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        print('audio in alto:',await pg.evaluate("()=>{const b=document.getElementById('zsound');return b&&[b.textContent,!!b.offsetParent]}"))
        await pg.evaluate("()=>document.getElementById('zsound').click()");await pg.wait_for_timeout(300)
        print('dopo tocco:',await pg.evaluate("()=>[document.getElementById('zsound').textContent,G.mute,localStorage.getItem('zsh_mute')]"))
        await pg.evaluate("()=>document.getElementById('zsound').click()");await pg.wait_for_timeout(300)
        print('di nuovo:',await pg.evaluate("()=>[document.getElementById('zsound').textContent,G.mute]"))
        await pg.screenshot(path='y_fx_top.png',clip={'x':0,'y':0,'width':390,'height':70})
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:1,paid:200};__W.wallet.mattoni=67;await wMine(true);await orLoad(true);go('mappa');}")
        await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();houseSheet(myHouses()[1]);}");await pg.wait_for_timeout(1000)
        print('scheda casa:',await pg.evaluate("()=>[document.querySelector('#sheet.open [data-ha=shop]').textContent,!!document.querySelector('#sheet.open .hwhy')]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-ha=shop]').click()");await pg.wait_for_timeout(500)
        print('bottega:',await pg.evaluate("()=>{const e=document.querySelector('#sheet.open .earnfirst');return e&&e.textContent.replace(/\\s+/g,' ').slice(0,90)}"))
        print('aiuto alleato:',await pg.evaluate("()=>{const d=document.createElement('div');d.innerHTML=socLine({kind:'ask_ally',actor:'u2',actor_nick:'giangy',created_at:new Date().toISOString()});return [d.textContent.replace(/\\s+/g,' ').trim(),!!d.querySelector('[data-shelp]')]}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
