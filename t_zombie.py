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
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:2,paid:200};__W.wallet.mattoni=2000;await wMine(true);await orLoad(true);await defLoad(true);go('mappa');}")
        await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();houseSheet(myHouses()[1]);}");await pg.wait_for_timeout(1800)
        print('chi arriva (Casa 1, nebbia, in basso):',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .thrw')].map(r=>r.textContent.replace(/\\s+/g,' ').trim().slice(0,90))"))
        print('esito:',await pg.evaluate("()=>document.querySelector('#sheet.open .thres').textContent.replace(/\\s+/g,' ')"),'| % in alto:',await pg.evaluate("()=>document.querySelector('#sheet.open .hsdef b').textContent"))
        for k in ['fari','fari','barricate']:
            await pg.evaluate(f"()=>document.querySelector('#sheet.open [data-sd={k}][data-v=\"1\"]').click()");await pg.wait_for_timeout(150)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sl=\"1\"]').click()");await pg.wait_for_timeout(150)
        print('dopo le prove (fari 2, barricate 1, livello +1):',await pg.evaluate("()=>document.querySelector('#sheet.open .thres').textContent.replace(/\\s+/g,' ')"),'|',await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbuy]').textContent"))
        await pg.screenshot(path='y_thr.png',full_page=False)
        el=await pg.query_selector('#sheet.open .thpan');await el.screenshot(path='y_thr2.png')
        m0=await pg.evaluate("()=>W.m.mattoni");await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbuy]').click()");await pg.wait_for_timeout(2500)
        print('acquisto: mattoni',m0,'→',await pg.evaluate("()=>W.m.mattoni"),'| difese server:',await pg.evaluate("()=>__W.defs"),'| livello casa:',await pg.evaluate("()=>__W.b['g45.32600_10.65900'].level"))
        await pg.evaluate("()=>{closeSheet();go('orda');}");await pg.wait_for_timeout(500);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(3000)
        print('fronte casa vera:',await pg.evaluate("()=>[FR.wx&&FR.wx.ev,document.querySelector('.frwx').textContent,[...document.querySelectorAll('[data-frz]')].map(b=>b.textContent).join(' ')]"))
        print('fila case:',await pg.evaluate("()=>[...document.querySelectorAll('.frsel button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.evaluate("()=>whySheet(null,true)");await pg.wait_for_timeout(300)
        print('perché:',await pg.evaluate("()=>[document.querySelector('#sheet.open h3').textContent,[...document.querySelectorAll('#sheet.open p')].map(p=>p.textContent).find(t=>/forza/.test(t))]"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
