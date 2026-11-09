import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("()=>go('orda')");await pg.wait_for_timeout(200);await pg.evaluate("()=>{const b=document.querySelector('[data-type=villa]');if(b)b.click();}");await pg.wait_for_timeout(1300)
        print('aperta da sola:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .hw')"))
        # Fase 3c: "Come si gioca" spiega il gioco di oggi (6 schede, poi "Tutte le regole")
        tit=[]
        for i in range(6):
            tit.append(await pg.evaluate("()=>document.querySelector('#sheet.open .hw h3').textContent"))
            if i<5: await pg.click('[data-hnext]');await pg.wait_for_timeout(150)
        print('schede:',tit)
        await pg.screenshot(path='y_h6.png')
        await pg.click('[data-hall]');await pg.wait_for_timeout(300)
        print(await pg.evaluate("()=>document.querySelector('#sheet.open h3').textContent"),'| capitoli:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open details.man').length"))
        await pg.evaluate("()=>openRules(5)");await pg.wait_for_timeout(200);await pg.click('[data-hplay]');await pg.wait_for_timeout(600)
        print('Vai all’Orda:',await pg.evaluate("()=>[S.tab,!document.querySelector('#sheet.open')]"))
        print('ERR',errs);await b.close()
asyncio.run(main())
