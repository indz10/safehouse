import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':390,'height':844})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html'); await pg.wait_for_timeout(400)
        await pg.evaluate("()=>go('orda')"); await pg.wait_for_timeout(200); await pg.click('[data-type=villa]'); await pg.wait_for_timeout(400)
        await pg.evaluate("()=>{G.sub='arena';G.tour=null;tourInit();G.tour.day=2;G.tour.groups.A[0].pts=12;G.tour.groups.A[0].p=2;renderHub();}"); await pg.wait_for_timeout(300)
        await pg.wait_for_timeout(900);await pg.evaluate("()=>{if(typeof closeSheet==='function')closeSheet()}");await pg.wait_for_timeout(300);await pg.click('#tPlay'); await pg.wait_for_timeout(300); await pg.click('[data-tp] >> nth=0'); await pg.wait_for_timeout(1500)
        await pg.click('#aQuit'); await pg.wait_for_timeout(2500); await pg.click('#toArena'); await pg.wait_for_timeout(400)
        el=await pg.query_selector('.tour'); await el.screenshot(path='x9_bracket.png')
        print(await pg.evaluate("()=>G.tour.phase"),'ERR',errs)
        await pg.set_viewport_size({'width':844,'height':390}); await pg.click('#tPlay'); await pg.wait_for_timeout(300); await pg.click('[data-tp] >> nth=0'); await pg.wait_for_timeout(3000)
        await pg.screenshot(path='x10_land.png'); print('ERR2',errs); await b.close()
asyncio.run(main())
