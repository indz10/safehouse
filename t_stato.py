import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,re
from playwright.async_api import async_playwright
import t_reale
NEW=None
async def route(r):
    if r.request.url.split('?')[0].endswith('/sw.js'):
        return await r.fulfill(status=200,content_type='text/javascript',body="const C='zsh-%s';"%NEW)
    return await t_reale.route(r)
async def main():
    global NEW
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        v=await pg.evaluate("()=>APPV");NEW=str(int(v)+1)
        await pg.evaluate("()=>{window.fetch0=window.fetch;window.fetch=(u,o)=>String(u).startsWith('/sw.js')?Promise.resolve(new Response(\"const C='zsh-"+NEW+"';\")):window.fetch0(u,o);window.__upd=0;zUpdateNow=async()=>{window.__upd++;};}")
        await pg.evaluate("()=>zCheckVersion()");await pg.wait_for_timeout(300)
        print('versione app',v,'| online',NEW,'| aggiornamento automatico all’apertura =',await pg.evaluate("()=>window.__upd"))
        await pg.evaluate("()=>zCheckVersion()");await pg.wait_for_timeout(300)
        print('seconda volta: niente ciclo, aggiornamenti =',await pg.evaluate("()=>window.__upd"),'| avviso mostrato =',await pg.evaluate("()=>!!document.getElementById('zbver')"))
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'giangy'};localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);go('home');}")
        await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();zmOpen();}");await pg.wait_for_timeout(300)
        print('nel menu:',await pg.evaluate("()=>!!document.querySelector('#zmenu [data-zstat]')"))
        await pg.evaluate("()=>document.querySelector('#zmenu [data-zstat]').click()");await pg.wait_for_timeout(3000)
        print('controllo:');[print('  ',x) for x in await pg.evaluate("()=>[...document.querySelectorAll('#sheet .zst')].map(r=>r.innerText.replace(/\\n+/g,' · '))")]
        await pg.screenshot(path='y_stato.png')
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
