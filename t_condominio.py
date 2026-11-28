import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# CONDOMINIO CON PIÙ GIOCATORI (migrazione 013): 🏅 amministratore, avviso "non hai versato" (difese comuni solo a chi
# versa), vicini con 😈 Rompi / 🕊️ Fai pace (non chi vive nello stesso appartamento), anche dalla scheda del giocatore.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "__W.hk={kind:'condominio',unit:'A 1',kind_set:true,req:false,mem:[]};await wMine(true);closeSheet();await houseSheet(myHouses().find(x=>x.home));}")
        await pg.wait_for_timeout(4500)
        print('amministratore:',await pg.evaluate("()=>(document.querySelector('.cdadm b')||{}).textContent"))
        print('avviso non versato:',await pg.evaluate("()=>!!document.querySelector('.cdko')"))
        print('vicini:',await pg.evaluate("()=>[...document.querySelectorAll('.cdv')].map(v=>v.textContent.replace(/\\s+/g,' ').trim().slice(0,60))"))
        await pg.evaluate("()=>{window.confirm=()=>true;document.querySelector('[data-cdrompi=u9]').click()}");await pg.wait_for_timeout(4500)
        print('dopo Rompi:',await pg.evaluate("()=>[!!__mkCd.rift.u9,!!document.querySelector('[data-cdpace=u9]')]"))
        await pg.evaluate("()=>document.querySelector('[data-cdpace=u9]').click()");await pg.wait_for_timeout(4500)
        print('dopo Pace:',await pg.evaluate("()=>[!!__mkCd.rift.u9,!!document.querySelector('[data-cdrompi=u9]')]"))
        await pg.evaluate("async()=>{closeSheet();CDI.t=0;await playerSheet('u9')}");await pg.wait_for_timeout(2500)
        print('scheda del vicino:',await pg.evaluate("()=>[!!document.querySelector('#sheet.open [data-cdpr]'),!!document.querySelector('#sheet.open [data-cdr2]')]"))
        await pg.evaluate("async()=>{closeSheet();await playerSheet('u7')}");await pg.wait_for_timeout(2500)
        print('scheda di chi vive con me (niente Rompi):',await pg.evaluate("()=>!document.querySelector('#sheet.open [data-cdpr]')"))
        await pg.evaluate("async()=>{closeSheet();__mkCd.me=50;await houseSheet(myHouses().find(x=>x.home));}");await pg.wait_for_timeout(4500)
        print('dopo aver versato:',await pg.evaluate("()=>[!!document.querySelector('.cdok'),!document.querySelector('.cdko')]"))
        print('ERR',E);await b.close()
asyncio.run(main())
