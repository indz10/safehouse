import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# RISORSE E RICOMPENSE (migrazione 012): gettoni 🪵 🥫 ⛽ nella homepage, Mercato in Bottega (20 → 🧱 10),
# premi dell'orda con le risorse, testi nuovi (10 + 6 × livello, taglia 35).
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();}"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();pg.on('pageerror',lambda e:E.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP)
        await pg.evaluate("async()=>{await resLoad(true);go('home')}");await pg.wait_for_timeout(3500)
        print('gettoni:',await pg.evaluate("()=>[...document.querySelectorAll('#app .resc')].map(x=>x.textContent)"))
        await pg.evaluate("()=>{closeSheet();shopSheet(0)}");await pg.wait_for_timeout(1500)
        print('mercato:',await pg.evaluate("()=>{const m=document.querySelector('#sheet.open .mktbox');return m?[/20 = 🧱 10/.test(m.textContent),m.querySelectorAll('[data-mk]').length,!!m.querySelector('[data-mk=carb][disabled]')]:'manca'}"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-mk=legno]').click()");await pg.wait_for_timeout(900)
        print('scambio:',await pg.evaluate("()=>[__mkRes.legno,__mkRes.left,/Legno: 40/.test(document.querySelector('#sheet.open .mktbox').textContent)]"))
        print('premi orda:',await pg.evaluate("()=>resTxt({legno:4,cibo:6,carb:10})"))
        print('regole:',await pg.evaluate("()=>{const t=manualHTML();return [/10 \\+ 6 × livello/.test(t),/35 Mattoni e ⛽ 10/.test(t)]}"))
        print('ERR',E);await b.close()
asyncio.run(main())
