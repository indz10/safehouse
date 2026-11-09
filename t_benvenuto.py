import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_reale
UA={'iPhone + WhatsApp':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.24',
    'iPhone Safari':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Android Chrome':'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    'Computer':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();errs=[]
        for name,ua in UA.items():
            ctx=await b.new_context(user_agent=ua,viewport={'width':390,'height':844},is_mobile=name!='Computer',has_touch=name!='Computer');pg=await ctx.new_page();pg.set_default_timeout(9000);pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
            await pg.route('**/*',t_reale.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
            await pg.goto('file://'+D+'/app.html?invito=abcdef12');await pg.wait_for_timeout(300)
            await pg.evaluate("async()=>{SB=__mockSB;const x=document.getElementById('bvpage');if(x)x.remove();await bvShow();}");await pg.wait_for_timeout(500)
            t=await pg.evaluate("()=>document.getElementById('bvpage').innerText.replace(/\\n+/g,' | ')")
            print(f'== {name}:',t[:330])
            if name=='iPhone Safari':
                await pg.screenshot(path='y_bv1.png')
                await pg.evaluate("()=>{S.user={id:'nuovo',nick:'giangy'};document.getElementById('bvpage').remove();bvShow();}");await pg.wait_for_timeout(500)
                print('   dopo l’account:',(await pg.evaluate("()=>document.querySelector('#bvpage .bvst').innerText.replace(/\\n+/g,' ')")))
                print('   codice d’invito conservato:',await pg.evaluate("()=>localStorage.getItem('zsh_inv')"))
            if name=='iPhone + WhatsApp': await pg.screenshot(path='y_bv0.png')
            await ctx.close()
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
