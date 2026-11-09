import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,time
from playwright.async_api import async_playwright
import t_terr
async def route(r):
    u=r.request.url
    if 'overpass' in u or 'elevation' in u or 'kumi' in u:
        await asyncio.sleep(40);return await r.abort()
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(15000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone={address:'Viale Risorgimento, Volta Mantovana',real:{lat:45.3255,lon:10.6582}};S.answers={...SAMPLE};G.tourAsked=1;G.tourDone=1;G.howSeen=1;RM.cache={};"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.3259,lon:10.6585,level:1,paid:200};await wMine(true);await orLoad(true);await thrLoad(true);go('orda');}")
        await pg.wait_for_timeout(800);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(600);await pg.evaluate("()=>{closeSheet();renderHub();}")
        t0=time.time()
        for i in range(20):
            await pg.wait_for_timeout(1000)
            n=await pg.evaluate("()=>(FR.zs||[]).length")
            if n: break
        print(f'zombie partiti dopo {time.time()-t0:.0f} s con strade e quote che non rispondono:',n)
        print(await pg.evaluate("()=>({lm:!!FR.lm,busy:FR.busy,key:FR.key,node:!!FR.node,lmap:!!document.querySelector('.fronte .lmap')})"));print(await pg.evaluate("()=>({paths:(FR.paths||[]).length,case:(FR.homes||[]).length,anelli:[...document.querySelectorAll('[data-frpct2]')].map(e=>e.textContent).join(' '),avviso:(document.querySelector('.frerr')||{}).textContent||null,tasto3d:!!document.querySelector('.fronte .lm-3d')&&getComputedStyle(document.querySelector('.fronte .lm-3d')).display})"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
