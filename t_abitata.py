import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_reale
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_reale.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};localStorage.setItem('zsh_kit_me','1');G.tourAsked=1;G.tourDone=1;G.howSeen=1;}")
        await pg.evaluate("async()=>{__W.qhome={status:'home',pending:true,residents:[{user_id:'u2',nick:'Giangy',status:'pending',ally:false}],can:false};await wSheet('g45.32160_10.65800',45.3216,10.658);}");await pg.wait_for_timeout(600)
        print('alleato/coinquilino:',await pg.evaluate("()=>document.querySelector('#sheet.open').innerText.replace(/\\n+/g,' | ').slice(0,260)"))
        await pg.evaluate("async()=>{closeSheet();__W.qhome={status:'home',pending:false,residents:[],can:false};await wSheet('g45.32160_10.65800',45.3216,10.658);}");await pg.wait_for_timeout(600)
        print('sconosciuto:',await pg.evaluate("()=>document.querySelector('#sheet.open').innerText.replace(/\\n+/g,' | ').slice(0,260)"))
        await pg.evaluate("async()=>{closeSheet();__W.qhome=null;await wSheet('g45.33000_10.66000',45.33,10.66);}");await pg.wait_for_timeout(900)
        print('casa libera (normale):',await pg.evaluate("()=>document.querySelector('#sheet.open').innerText.replace(/\\n+/g,' | ').slice(0,80)"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
