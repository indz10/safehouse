import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_reale
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_reale.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        # account 1 gioca: dati salvati sul telefono
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.clear();window.pushCloud=async()=>{window.__pushed=(window.__pushed||0)+1;};window.pullCloud=async()=>null;await onLogin({id:'acc1',email:'a@x.it',user_metadata:{nick:'arf19'}},false);S.answers={...SAMPLE};S.zone={address:'Casa di arf19'};G.gems=258;saveLocal();}")
        print('account 1: proprietario =',await pg.evaluate("()=>localStorage.getItem('zsh_owner')"),'| salvataggio =',await pg.evaluate("()=>!!localStorage.getItem('zsh_v2_salvataggio')"))
        # entra account 2 sullo stesso telefono
        async with pg.expect_navigation(timeout=9000):
            await pg.evaluate("async()=>{window.__pushed=0;await onLogin({id:'acc2',email:'b@x.it',user_metadata:{nick:'arf18'}},true);}")
        await pg.wait_for_timeout(1200)
        print('account 2: proprietario =',await pg.evaluate("()=>localStorage.getItem('zsh_owner')"),'| dati di arf19 rimasti =',await pg.evaluate("()=>{const t=localStorage.getItem('zsh_v2_salvataggio');return !!t&&t.includes('Casa di arf19')}"),'| gemme =',await pg.evaluate("()=>G.gems"))
        # pagina della casa: chi vive qui
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);await defLoad(true);go('home');}")
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>closeSheet()");await pg.evaluate("()=>houseSheet(myHouses()[0])");await pg.wait_for_timeout(3000)
        print('chi vive qui:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet .crpan .alrow')].map(r=>r.textContent.replace(/\\s+/g,' ').trim())"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
