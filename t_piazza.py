import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(10000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{SB=__mockSB;go('social');}");await pg.wait_for_timeout(600)
        print('non collegato:',await pg.evaluate("()=>!!document.querySelector('.nolog')"))
        await pg.evaluate("async()=>{S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.zone=await analyzeZone('A');go('social');}");await pg.wait_for_timeout(2600)
        print('schede:',await pg.evaluate("()=>[...document.querySelectorAll('.sseg button')].map(b=>b.textContent+(b.classList.contains('on')?'*':''))"))
        print('avviso novità:',await pg.evaluate("()=>{const n=document.querySelector('.pznews');return n&&n.textContent}"))
        print('messaggi:',await pg.evaluate("()=>[...document.querySelectorAll('.pzm .pzb')].map(x=>x.textContent)"))
        await pg.evaluate("()=>closeSheet()");await pg.fill('#pzTxt','Ciao a tutti!');await pg.click('[data-pzsend]');await pg.wait_for_timeout(800)
        await pg.click('[data-pzq=\"🔥 Che orda!\"]');await pg.wait_for_timeout(200);print('frase rapida nel campo:',await pg.input_value('#pzTxt'))
        await pg.fill('#pzTxt','porco dio');await pg.click('[data-pzsend]');await pg.wait_for_timeout(700)
        print('dopo invio:',await pg.evaluate("()=>[...document.querySelectorAll('.pzm .pzb')].map(x=>x.textContent)"),'| toast filtro:',await pg.evaluate("()=>{const t=document.querySelector('.toast');return t&&t.textContent.slice(0,40)}"))
        await pg.screenshot(path='y_pz.png')
        await pg.evaluate("()=>document.querySelector('.pzm:not(.mine)').click()");await pg.wait_for_timeout(500)
        print('azioni messaggio:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-pa]')].map(b=>b.textContent.trim().slice(0,22))"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pa=rep]').click()");await pg.wait_for_timeout(500)
        print('segnalazioni:',await pg.evaluate("()=>__W.rep"))
        print('ERR',errs[:6]);await b.close()
asyncio.run(main())
