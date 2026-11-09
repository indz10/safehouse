import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844});pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');go('orda');}");await pg.wait_for_timeout(300)
        await pg.click('[data-type=vera]');await pg.wait_for_timeout(500);await pg.evaluate("()=>{G.ss='difendi';try{closeSheet();renderHub();}catch(e){}}");await pg.wait_for_timeout(500)
        print('hab0',await pg.evaluate("()=>terrHab()&&terrHab().k"))
        await pg.evaluate("()=>{window.ZUSERS=[{user_id:'x',nick:'giangy',lat_r:45.326,lon_r:10.659,indice:5}];G.tutDone=1;}")
        print('hab1',await pg.evaluate("()=>[terrHab().k,terrHab().why,terrZList()]"))
        tp=await pg.query_selector('.terrp')
        await pg.evaluate("()=>{renderHub()}");await pg.wait_for_timeout(300);tp=await pg.query_selector('.terrp')
        await pg.evaluate("()=>{const t=document.querySelector('.terrp');if(t){let d=t.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details');}}}");tp=await pg.query_selector('.terrp')
        if tp:
            try: await tp.screenshot(path='y_thab.png',timeout=4000)
            except Exception as e: print('foto territorio saltata')
        await pg.evaluate("()=>{G.level=4;G.view='battle';renderOrda();}");await pg.wait_for_timeout(2500)
        a=await pg.query_selector('[data-pauto]')
        await pg.evaluate("()=>{const g=document.querySelector('[data-pgo]');if(g)g.click();}");await pg.wait_for_timeout(9000)
        await pg.evaluate("()=>window.__hab&&window.__hab()");await pg.wait_for_timeout(1500)
        await pg.screenshot(path='y_bat.png')
        print('hab btn',await pg.evaluate("()=>{const b=document.querySelector('#hab');return b&&b.textContent}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
