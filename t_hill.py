import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':t_terr.LAT,'longitude':t_terr.LON,'accuracy':12},permissions=['geolocation'])
        pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'X',src:'gps'};S.zone=await analyzeZone('X');go('orda');}");await pg.wait_for_timeout(400)
        await pg.evaluate("()=>{const b=document.querySelector('[data-type=villa]');if(b)b.click();}");await pg.wait_for_timeout(500)
        print(await pg.evaluate("()=>{const c={};for(let y=-80;y<600;y+=40)for(let x=20;x<400;x+=40){const t=terrainAt(x,y);c[t.k]=(c[t.k]||0)+1;}return c;}"))
        print(await pg.evaluate("()=>buildSites(false).map(s=>s.name).slice(0,6)"))
        h=await pg.query_selector('.hood');await h.screenshot(path='y7_hood.png')
        print('ERR',errs);await b.close()
asyncio.run(main())
