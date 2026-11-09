import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;SB.auth=SB.auth||{};SB.auth.signOut=async()=>{await new Promise(r=>setTimeout(r,600));localStorage.removeItem('sb-wmwe-auth-token');window.__out=1;};localStorage.setItem('sb-wmwe-auth-token','{\"x\":1}');S.user={id:'me',nick:'ale'};G.tourAsked=1;G.tourDone=1;go('home');}")
        await pg.wait_for_timeout(600)
        print('prima: sessione salvata =',await pg.evaluate("()=>!!localStorage.getItem('sb-wmwe-auth-token')"))
        await pg.evaluate("()=>zmOpen()");await pg.wait_for_timeout(400)
        print('pulsante Esci nel menu:',await pg.evaluate("()=>!!document.querySelector('#zmenu [data-zm=\"logout\"]')"))
        async with pg.expect_navigation(timeout=9000):
            await pg.evaluate("()=>document.querySelector('#zmenu [data-zm=\"logout\"]').click()")
        await pg.wait_for_timeout(1500)
        print('dopo: sessione salvata =',await pg.evaluate("()=>!!localStorage.getItem('sb-wmwe-auth-token')"),'| utente =',await pg.evaluate("()=>S.user"),'| indirizzo =',await pg.evaluate("()=>location.search"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
