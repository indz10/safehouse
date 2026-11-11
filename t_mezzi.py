import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# MEZZI E DISTANZE (migrazione 009): la valutazione manda mezzo e dotazioni al server; Bottega con i mezzi;
# scheda del giocatore con distanza, tempo di viaggio, rinforzi e forza dell'orda; fuori portata → "serve un mezzo più veloce".
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.answers={...SAMPLE,mezzo:'bici',medico:'base',radio:'radio',cibo:'0'};closeSheet();await mzSync();}")
        print('valutazione → server:',await pg.evaluate("()=>window.__MZV"))
        await pg.evaluate("()=>playerSheet('u5')");await pg.wait_for_timeout(1200)
        print('scheda vicino:',await pg.evaluate("()=>(document.querySelector('#sheet.open .plmz')||{}).textContent"))
        await pg.evaluate("()=>{closeSheet();playerSheet('u9')}");await pg.wait_for_timeout(1200)
        print('scheda lontano:',await pg.evaluate("()=>(document.querySelector('#sheet.open .plmz')||{}).textContent"),'| pulsante bottega:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-mzshop]')"))
        await pg.click('#sheet.open [data-mzshop]');await pg.wait_for_timeout(1200)
        print('bottega:',await pg.evaluate("()=>[(document.querySelector('.mzcur b')||{}).textContent,[...document.querySelectorAll('.mzrow b')].map(b=>b.textContent)]"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/mezzi_bottega.png')
        await pg.evaluate("()=>{window.confirm=()=>true}");await pg.click('[data-mzb=auto]');await pg.wait_for_timeout(1200)
        print('dopo acquisto:',await pg.evaluate("()=>[(document.querySelector('.mzcur b')||{}).textContent,[...document.querySelectorAll('.mzrow i')].length]"))
        print('ERR',errs);await b.close()
asyncio.run(main())
