import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("()=>go('orda')");await pg.wait_for_timeout(200);await pg.click('[data-type=villa]');await pg.wait_for_timeout(1300)
        print('aperta da sola:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .hw')"))
        await pg.screenshot(path='y_h1.png')
        await pg.click('[data-hnext]');await pg.wait_for_timeout(200)
        await pg.click('[data-hp=\"0\"]');await pg.click('[data-hp=\"2\"]');print(await pg.inner_text('#hwPlanOk'))
        await pg.click('[data-hnext]');await pg.wait_for_timeout(200)
        await pg.click('[data-hc]');await pg.click('[data-hl=\"1\"]');print(await pg.inner_text('#hwTip'))
        await pg.screenshot(path='y_h3.png')
        await pg.click('[data-hnext]');await pg.click('[data-ht]');print(await pg.inner_text('#hwTgt'))
        await pg.click('[data-hnext]');await pg.click('[data-hh]');print(await pg.inner_text('#hwHab'))
        await pg.click('[data-hnext]');await pg.wait_for_timeout(200);await pg.screenshot(path='y_h6.png')
        await pg.click('[data-hnext]');await pg.click('[data-hall]');await pg.wait_for_timeout(200)
        print(await pg.evaluate("()=>document.querySelector('#sheet.open h3').textContent"))
        print('ERR',errs);await b.close()
asyncio.run(main())
