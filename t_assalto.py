import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};await wMine(true);await orLoad(true);go('orda');}")
        await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();G.ss='oggi';renderHub();}");await pg.wait_for_timeout(1200)
        print('scheda Oggi: riquadro assalti',await pg.evaluate("()=>{const c=document.querySelector('.acard');return c&&!c.hidden}"),'| notifiche:',await pg.evaluate("()=>{const r=document.getElementById('pushRow');return r&&r.textContent.trim().slice(0,40)}"))
        await pg.evaluate("()=>document.querySelector('[data-acl]').click()");await pg.wait_for_timeout(1200)
        print('fumetto aperto:',await pg.evaluate("()=>!!document.getElementById('fumetto')"))
        await pg.evaluate("()=>document.querySelector('[data-fmap]').click()");await pg.wait_for_timeout(2500)
        print('regia aperta:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.regbar'),REG.H.length,document.querySelector('.regbar .regt b').textContent]"))
        await pg.wait_for_timeout(8000)
        print('esito casa 1:',await pg.evaluate("()=>document.querySelector('.regtx').textContent"))
        await pg.screenshot(path='y_reg1.png')
        await pg.evaluate("()=>document.querySelector('[data-rg=next]').click()");await pg.wait_for_timeout(9500)
        print('casa 2:',await pg.evaluate("()=>[document.querySelector('.regn').textContent,document.querySelector('.regtx').textContent]"))
        await pg.evaluate("()=>document.querySelector('[data-rg=mode]').click()");await pg.wait_for_timeout(9000)
        print('simulazione:',await pg.evaluate("()=>[document.querySelector('.regbar .regt b').textContent,document.querySelector('.regtx').textContent]"))
        await pg.screenshot(path='y_reg2.png')
        await pg.evaluate("()=>{zmOpen();}");await pg.wait_for_timeout(300)
        print('menu:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu [data-zm^=\"a:\"],#zmenu [data-zm=push]')].map(b=>b.textContent.trim())"))
        await pg.evaluate("()=>document.querySelector('#zmenu [data-zm=push]').click()");await pg.wait_for_timeout(700)
        print('scheda notifiche:',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,110)"))
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=social');}");await pg.wait_for_timeout(600)
        print('tocco notifica novità →',await pg.evaluate("()=>[S.tab,SOC.tab]"))
        print('ERR',errs[:6]);await b.close()
asyncio.run(main())
