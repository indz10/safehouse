import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];ctx=await b.new_context(**dev);pg=await ctx.new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:150]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()));ctx.on('page',lambda np:asyncio.ensure_future(np.close()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        print('barra in alto (ospite):',await pg.evaluate("()=>[...document.getElementById('topbar').children].filter(c=>c.offsetWidth).map(c=>c.id||c.className)"))
        await pg.tap('#zmenuBtn');await pg.wait_for_timeout(400);await pg.screenshot(path='y_zm0.png')
        await pg.evaluate("()=>zmClose(true)")
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);go('home');}")
        await pg.wait_for_timeout(1200);await pg.evaluate("()=>closeSheet()")
        await pg.tap('#zmenuBtn');await pg.wait_for_timeout(400);await pg.screenshot(path='y_zm1.png')
        keys=await pg.evaluate("()=>[...document.querySelectorAll('#zmenu [data-zm]')].map(b=>b.dataset.zm)")
        print('voci del menu:',len(keys),keys)
        res=[]
        for k in keys:
            if k in('logout','del'):continue
            e0=len(errs)
            await pg.evaluate("()=>{closeSheet();zmClose(true);zmOpen();}");await pg.wait_for_timeout(250)
            before=await pg.evaluate("()=>[S.tab,G.ss,SOC.tab,!!S.pubOk,!!G.mute,!!(window.AUD&&AUD.on&&AUD.started)]")
            await pg.evaluate(f"()=>document.querySelector('#zmenu [data-zm=\"{k}\"]').click()");await pg.wait_for_timeout(700)
            after=await pg.evaluate("()=>[S.tab,G.ss,SOC.tab,!!S.pubOk,!!G.mute,!!(window.AUD&&AUD.on&&AUD.started),!!document.querySelector('#sheet.open'),!!document.getElementById('zmenu')]")
            res.append((k,'ERR' if len(errs)>e0 else 'ok',after))
        for r in res: print(' ',r)
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
