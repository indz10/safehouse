import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.screenshot(path='y_home_new.png');print('casa (nuovo):',await pg.evaluate("()=>[!!document.querySelector('.hero2'),!!document.querySelector('.cta2'),document.querySelectorAll('.panel.sponsor').length]"))
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=false;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);await orLoad(true);go('casa');}")
        await pg.wait_for_timeout(1200);await pg.evaluate("()=>closeSheet()");await pg.screenshot(path='y_home_user.png',full_page=True)
        print('casa (utente):',await pg.evaluate("()=>[!!document.querySelector('.hcard'),!!document.querySelector('.rmini'),document.querySelectorAll('.qact button').length]"))
        await pg.evaluate("()=>{go('orda')}");await pg.wait_for_timeout(300);await pg.evaluate("()=>{const b=document.querySelector('[data-type=vera]');if(b)b.click();}");await pg.wait_for_timeout(1300);await pg.evaluate("()=>{closeSheet();G.howSeen=1;G.tourDone=1;renderHub();}");await pg.wait_for_timeout(1500)
        print('schede gioco:',await pg.evaluate("()=>[...document.querySelectorAll('[data-sub]')].map(b=>b.dataset.sub)"))
        print('ordine pannelli:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden&&/opan|apan|wpan|tmp|spanx/.test(e.className)).map(e=>e.className.match(/opan|apan|wpan|tmp|spanx/)[0])"))
        # alleati e rivali stanno in 👥 Superstiti → Squadra (nella vecchia Orda erano nascosti)
        await pg.evaluate("()=>{closeSheet();SOC.tab='squadra';go('social')}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{document.querySelector('[data-ahelp]').click()}");await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const b=document.querySelector('[data-asend]');if(b)b.click();}");await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{window.confirm=()=>true;const b=document.querySelector('[data-aatk]');if(b)b.click();}");await pg.wait_for_timeout(500)
        print('alleati:',await pg.evaluate("()=>document.querySelector('.apan').textContent.replace(/\\s+/g,' ').slice(0,260)"))
                # simulati
        r=await pg.evaluate("()=>{let n=0,t=0;for(let i=0;i<3000;i++){t++;if(isNpc('g45.'+i+'_10.6'))n++;}return [n,t,md5hex('abc')]}")
        print('simulati: ',r[0],'su',r[1],'| md5 ok:',r[2]=='900150983cd24fb0d6963f7d28e17f72')
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
