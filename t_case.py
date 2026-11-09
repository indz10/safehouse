import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
          "__W.b['g45.32600_10.65900']={owner:'me',lat:45.326,lon:10.659,level:3,paid:200};__W.b['g-33.86880_151.20930']={owner:'me',lat:-33.8688,lon:151.2093,level:5,paid:3400};await wMine(true);go('casa');}")
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>closeSheet()")
        print('la mia casa:',await pg.evaluate("()=>[!!document.querySelector('.mycasa .mcart svg'),document.querySelector('.mcchips')&&document.querySelector('.mcchips').textContent]"))
        print('galleria:',await pg.evaluate("()=>[...document.querySelectorAll('.mgc')].map(c=>c.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.screenshot(path='y_casa1.png')
        await pg.evaluate("()=>{document.querySelector('.mgc').click()}");await pg.wait_for_timeout(3000)
        print('dal tocco → mappa e scheda:',await pg.evaluate("()=>[S.tab,!!document.querySelector('#sheet.open .hsart svg'),document.querySelector('#sheet.open .hsart span')&&document.querySelector('#sheet.open .hsart span').textContent]"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(1500)
        print('miniature nella barra:',await pg.evaluate("()=>document.querySelectorAll('.mhouses .mhart svg').length"),'| pulsante 3D visibile:',await pg.evaluate("()=>{const b=document.querySelector('.mapfull .lm-3d');return !!(b&&b.offsetParent)}"))
        # campionario
        await pg.evaluate("""()=>{const T=['villa','bifam','schiera','condo','cascina','shop'];document.body.innerHTML='<div id=cmp style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px;background:#f3e9d2"></div>';
          const c=document.getElementById('cmp');T.forEach((t,i)=>[1,5].forEach(l=>{c.insertAdjacentHTML('beforeend','<div style="border:2px solid #140f1f;background:#fff;font:700 10px sans-serif">'+houseArt(t,l,'s'+i+l,{k:t+l})+BT[t][1]+' · liv. '+l+'</div>');}));}""")
        await pg.wait_for_timeout(300);el=await pg.query_selector('#cmp');await el.screenshot(path='y_campionario.png')
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
