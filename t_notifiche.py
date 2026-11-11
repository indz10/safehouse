import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# NOTIFICHE DELLA PIAZZA (migrazione 007): in "🔔 Notifiche delle orde" si sceglie No / La mia zona / Anche il Mondo;
# toccando la notifica si apre la Piazza. Deve stampare: scelta iniziale: zona | dopo: tutto | piazza aperta: True | ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e.stack)[:600]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();"
                          "window.pushState=async()=>'on';window.pushPzEndpoint=async()=>'https://push.example/ep1';await pushSheet();}")
        await pg.wait_for_timeout(700)
        on=lambda:pg.evaluate("()=>(document.querySelector('#sheet.open [data-pz].on')||{}).dataset?.pz")
        print('scelta iniziale:',await on(),end=' | ');await pg.click('#sheet.open [data-pz=tutto]');await pg.wait_for_timeout(400);print('dopo:',await on(),'| server:',await pg.evaluate("()=>window.__PZ"))
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=social&tab=piazza')}");await pg.wait_for_timeout(1500)
        print('piazza aperta:',await pg.evaluate("()=>S.tab==='social'&&SOC.tab==='piazza'"))
        print('ERR',errs);await b.close()
asyncio.run(main())
