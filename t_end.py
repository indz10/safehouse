import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];ctx=await b.new_context(**dev);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("()=>go('orda')");await pg.wait_for_timeout(200);await pg.tap('[data-type=villa]');await pg.wait_for_timeout(1200)
        await pg.evaluate("()=>{closeSheet();G.tutDone=1;G.coins=5000;G.view='battle';renderOrda();}");await pg.wait_for_timeout(1500)
        await pg.wait_for_timeout(500);await pg.evaluate("()=>closeSheet()")
        for i in range(60):
            await pg.wait_for_timeout(3000)
            # aiuto la difesa: uso le carte di tanto in tanto
            await pg.evaluate("()=>{document.querySelectorAll('[data-use]').forEach(b=>b.click());const bo=document.querySelector('#boon button');if(bo)bo.click();}")
            if i==10: await pg.screenshot(path='y_mid.png')
            if await pg.evaluate("()=>!!document.getElementById('chest')||!!document.getElementById('toHub')"): break
        print('fine dopo',i*3,'s; scrigno:',await pg.evaluate("()=>!!document.getElementById('chest')"),'livello',await pg.evaluate("()=>G.level"))
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='y_end.png')
        if await pg.evaluate("()=>!!document.getElementById('chest')"):
            el=await pg.query_selector('#chest [data-ch]');bb=await el.bounding_box();print('box',bb)
            print('elemento al centro:',await pg.evaluate(f"()=>{{const e=document.elementFromPoint({bb['x']+bb['width']/2},{bb['y']+bb['height']/2});return e&&(e.id||e.className||e.tagName)}}"))
            await pg.tap('#chest [data-ch] >> nth=0');await pg.wait_for_timeout(500)
            print('aperto:',await pg.evaluate("()=>document.getElementById('chest').dataset.done"))
            await pg.screenshot(path='y_end2.png')
        print('ERR',errs[:3]);await b.close()
asyncio.run(main())
