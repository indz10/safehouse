import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};__W.b['g-33.86880_151.20930']={owner:'me',lat:-33.8688,lon:151.2093,level:1,paid:3400};await wMine(true);await orLoad(true);go('orda');}")
        await pg.wait_for_timeout(500);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(3500)
        print('fila delle case:',await pg.evaluate("()=>[...document.querySelectorAll('.frsel button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()+(b.classList.contains('on')?' *':''))"))
        print('case attaccate sul fronte:',await pg.evaluate("()=>FR.dests.map(d=>d.label)"),'| percorsi per casa:',await pg.evaluate("()=>FR.dests.map((d,i)=>FR.paths.filter(p=>p.dest===i).length)"))
        print('zombie per casa:',await pg.evaluate("()=>FR.dests.map((d,i)=>FR.zs.filter(z=>z.P.dest===i).length)"),'| anelli:',await pg.evaluate("()=>[...document.querySelectorAll('[data-frpct2]')].map(e=>e.textContent)"))
        x1=await pg.evaluate("()=>FR.zs.map(z=>z.x)");await pg.wait_for_timeout(1500);x2=await pg.evaluate("()=>FR.zs.map(z=>z.x)")
        print('avanzano:',sum(1 for a,b in zip(x1,x2) if b>a),'su',len(x1))
        await pg.evaluate("()=>document.querySelector('.frsel [data-frh=\"2\"]').click()");await pg.wait_for_timeout(4000)
        print('dopo il tocco su Casa 2:',await pg.evaluate("()=>[document.querySelector('.frsel button.on').textContent.replace(/\\s+/g,' ').trim(),FR.dests.map(d=>d.label),FR.paths.length,FR.zs.length,FR.paths.map(p=>Math.round(p.L)).slice(0,3)]"))
        x1=await pg.evaluate("()=>FR.zs.map(z=>z.x)");await pg.wait_for_timeout(1200);x2=await pg.evaluate("()=>FR.zs.map(z=>z.x)")
        print('avanzano a Sydney:',sum(1 for a,b in zip(x1,x2) if b>a),'su',len(x1))
        await pg.evaluate("()=>document.querySelector('.frsel [data-frh=\"0\"]').click()");await pg.wait_for_timeout(3000)
        print('ritorno a casa:',await pg.evaluate("()=>FR.dests.map(d=>d.label)"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
