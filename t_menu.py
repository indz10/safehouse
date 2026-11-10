import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        # Fase 4e: il vecchio menu a tendina è stato tolto; si prova il menu ☰ (voci) e la finestra "elimina account"
        await pg.evaluate("()=>{S.user={id:'1a2b3c4d-0000',nick:'ale'};S.zone={address:'x'};zmOpen();}");await pg.wait_for_timeout(300)
        print(await pg.evaluate("()=>[...document.querySelectorAll('#zmenu [data-zm]')].map(e=>e.textContent.trim()).slice(0,30)"))
        await pg.evaluate("()=>{zmClose();deleteSheet();}");await pg.wait_for_timeout(200)
        print(await pg.evaluate("()=>document.querySelector('#sheet.open h3').textContent"))
        print('ERR',errs);await b.close()
asyncio.run(main())
