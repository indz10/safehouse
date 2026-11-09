import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_reale
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(15000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_reale.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};G.tourAsked=1;G.tourDone=1;G.howSeen=1;__W.b['g45.32600_10.65900']={owner:'me',lat:45.32568,lon:10.65848,level:2,paid:200};await wMine(true);await orLoad(true);await thrLoad(true);go('mappa');}")
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>closeSheet()")
        print('miniature con disegno vero:',await pg.evaluate("()=>[...document.querySelectorAll('.mhouses .mhart')].map(d=>!!d.querySelector('svg.real')).join(',')"))
        await pg.evaluate("async()=>{__W.qhome={status:'mine',can:false};await wSheet('w123456',45.3262,10.6589);}");await pg.wait_for_timeout(3500)
        print('tocco a 60 m da Casa 1:',await pg.evaluate("()=>{const s=document.getElementById('sheet');return [s.classList.contains('hfull'),(s.querySelector('h3')||{}).textContent,[...s.querySelectorAll('.hpsel button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()).join(' | '),!!s.querySelector('.hsart svg.real'),!!s.querySelector('.hlegend')]}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
