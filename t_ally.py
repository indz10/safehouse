import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=false;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');go('orda');}")
        await pg.wait_for_timeout(300);await pg.evaluate("()=>{const b=document.querySelector('[data-type=vera]');if(b)b.click();}");await pg.wait_for_timeout(1300)
        await pg.evaluate("async()=>{closeSheet();G.howSeen=1;G.tourDone=1;await wMine(true);renderHub();}");await pg.wait_for_timeout(1800)
        print('ordine:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden&&/opan|apan|lpan|wpan|tmp|spanx/.test(e.className)).map(e=>e.className.match(/opan|apan|lpan|wpan|tmp|spanx/)[0])"))
        print('regali ricevuti -> monete/gemme:',await pg.evaluate("()=>[G.coins,G.gems]"))
        # gli alleati (regali e prestiti) stanno in 👥 Superstiti → Squadra (nella vecchia Orda erano nascosti)
        await pg.evaluate("()=>{closeSheet();SOC.tab='squadra';go('social')}");await pg.wait_for_timeout(1500)
        print('alleati:',await pg.evaluate("()=>{const e=document.querySelector('.ayb');return e&&e.textContent.replace(/\\s+/g,' ').slice(0,120)}"))
        await pg.evaluate("()=>document.querySelector('[data-agive]').click()");await pg.wait_for_timeout(300)
        await pg.fill('#ayN','50');await pg.click('[data-ayok]');await pg.wait_for_timeout(800)
        print('dopo prestito: mattoni',await pg.evaluate("()=>__W.wallet.mattoni"),'| prestiti:',await pg.evaluate("()=>{const e=document.querySelector('.ayb');return e&&e.textContent.includes('Hai prestato')}"))
        await pg.evaluate("()=>{G.spins=2;G.scratch=1;closeSheet();go('orda');}");await pg.wait_for_timeout(800)
        el=await pg.query_selector('.lpan')
        if el: await el.screenshot(path='y_lpan.png')
        await pg.evaluate("()=>document.querySelector('[data-lt=wheel]').click()");await pg.wait_for_timeout(400)
        print('ruota aperta:',await pg.evaluate("()=>{const h=document.querySelector('#sheet.open h3');return h&&h.textContent}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
