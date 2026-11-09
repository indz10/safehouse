import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_reale
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_reale.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.clear();localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;G.coins=500;"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.3255,lon:10.6582,level:2,paid:200};__W.wallet.mattoni=900;await wMine(true);await orLoad(true);await defLoad(true);go('home');}")
        await pg.wait_for_timeout(3500);await pg.evaluate("()=>closeSheet()")
        print('monete convertite: monete',await pg.evaluate("()=>G.coins"),'| mattoni',await pg.evaluate("()=>W.m.mattoni"))
        await pg.evaluate("()=>document.querySelector('[data-hs=casa]').click()");await pg.wait_for_timeout(3500)
        print('pagina casa:',await pg.evaluate("()=>{const s=document.getElementById('sheet');const a=s.querySelector('.hsart');return [s.classList.contains('hfull'),Math.round(a.getBoundingClientRect().height),[...s.querySelectorAll('.hpsel button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()),s.querySelectorAll('.fortpan .fch').length,s.querySelectorAll('.hpreal .fch').length,!!s.querySelector('.hpdia'),!!s.querySelector('.thpan'),!s.querySelector('.eqpr')]}"))
        await pg.screenshot(path='y_hp.png')
        await pg.evaluate("()=>document.querySelector('#sheet [data-hps=\"1\"]').click()");await pg.wait_for_timeout(3000)
        print('passo a Casa 1:',await pg.evaluate("()=>document.querySelector('#sheet .hpsel .on').textContent.replace(/\\s+/g,' ').trim()"))
        await pg.evaluate("()=>document.querySelector('#sheet .fortpan [data-fk=trappole]').click()");await pg.wait_for_timeout(3500)
        print('compro trappole da qui:',await pg.evaluate("()=>__W.defs"))
        await pg.evaluate("()=>{closeSheet();go('casa');}");await pg.wait_for_timeout(4500)
        print('in La mia casa si vede:',await pg.evaluate("()=>{const b=document.querySelector('.mycasa2 .rinf [data-fk=trappole]');return b&&b.textContent.replace(/\\s+/g,' ').trim()}"))
        await pg.evaluate("()=>{go('mappa');}");await pg.wait_for_timeout(1500)
        await pg.evaluate("async()=>{closeSheet();const h=myHouses()[1];await wSheet(h.bid,h.lat,h.lon);}");await pg.wait_for_timeout(3000)
        print('dalla mappa:',await pg.evaluate("()=>document.getElementById('sheet').classList.contains('hfull')"))
        await pg.evaluate("()=>closeSheet()")
        m0=await pg.evaluate("()=>W.m.mattoni");await pg.evaluate("()=>{const i=WHEEL.findIndex(s=>s.k==='mat');giveMattoni(WHEEL[i].v,'Ruota');}");await pg.wait_for_timeout(1500)
        print('ruota: mattoni',m0,'→',await pg.evaluate("()=>W.m.mattoni"),'| premi della ruota:',await pg.evaluate("()=>WHEEL.map(s=>s.ic+s.l).join(' ')"))
        print('premio del giorno:',await pg.evaluate("()=>DAILY.map(d=>d.ic+' '+d.t).join(' | ')"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
