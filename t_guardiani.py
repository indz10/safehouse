import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# GUARDIANI (Fase 72): comprare una casa o occupare un presidio infestato apre la scheda del guardiano → picchiaduro →
# vinto, "🔑 Compra ora" ripete l'acquisto. Deve stampare: scheda: [True, ...] ... arena: True ... comprata: True ... presidio: True ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);closeSheet();window.__GUARD={};}")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("async()=>{try{await wRpc('world_buy',{p_bid:'way/77',p_lat:45.3258,p_lon:10.6586})}catch(e){}}");await pg.wait_for_timeout(900)
        print('scheda:',await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return s?[!!s.querySelector('.grdbox'),(s.querySelector('.grdbox b')||{}).textContent,s.querySelectorAll('[data-gdiff]').length]:null}"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/guardiano.png')
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-gdiff=facile]').click()")
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-gvai]').click()");await pg.wait_for_timeout(2500)
        print('richiesta:',await pg.evaluate("()=>[(window.__GA||{}).p_target,(window.__GA||{}).p_diff]"),'| arena:',await pg.evaluate("()=>!!document.getElementById('arena')"))
        await pg.evaluate("()=>arnFine('vinto')");await pg.wait_for_timeout(1800)
        print('liberata:',await pg.evaluate("()=>{const r=document.querySelector('.arnres');return r?[!!r.querySelector('[data-grdok]'),(r.querySelector('.grdlib')||{}).textContent]:null}"))
        await pg.evaluate("()=>document.querySelector('.arnres [data-grdok]').click()");await pg.wait_for_timeout(1500)
        print('comprata:',await pg.evaluate("()=>!!(__W.b['way/77']&&__W.b['way/77'].owner==='me')"))
        await pg.evaluate("()=>{window.__GUARD={};window.__PRES=[{id:'osm:n1',name:'Parco Nord',kind:'parco',lat:45.3285,lon:10.6584,stato:'libero',record:0,guardie:0,difesa:55,vicino:true}];}")
        await pg.evaluate("async()=>{await SB.rpc('world_presidio_occupa',{p_id:'osm:n1'})}");await pg.wait_for_timeout(900)
        print('presidio:',await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return !!(s&&s.querySelector('.grdbox')&&/Presidio infestato/.test(s.textContent))}"))
        # 💔 rompi l'alleanza (Fase 73)
        await pg.evaluate("()=>{closeSheet();window.confirm=()=>true;allySheet('u2')}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arompi]').click()");await pg.wait_for_timeout(800)
        print('rompi:',await pg.evaluate("()=>[(window.__ROMPI||{}).p_target,!document.querySelector('#sheet.open [data-arompi]')]"))
        print('ERR',errs);await b.close()
asyncio.run(main())
