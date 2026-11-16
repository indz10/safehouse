import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🎁 POSTI VERI (Fase 32): segnaposti dei posti veri sulla mappa col premio, scheda con i due modi (di persona gratis,
# dal divano col superstite a pagamento), tasto Lente che conta anche i posti, nella Lente il tasto grande "🎁 PRENDI".
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__ZMP=[]')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{const p=zmPos();PV.P=[{k:'farmaco',cat:'Farmacia',name:'Farmacia Centrale',lat:p.lat+0.00018,lon:p.lon},{k:'cibo',cat:'Supermercato',name:'Super Uno',lat:p.lat-0.002,lon:p.lon+0.001},{k:'legno',cat:'Ferramenta',name:'Ferramenta Rossi',lat:p.lat+0.001,lon:p.lon-0.002}];PV.pos={lat:p.lat,lon:p.lon};PV.t=Date.now();PV.sig='';pvMarks();mlFab();}")
        await pg.wait_for_timeout(800)
        print('posti sulla mappa:',await pg.evaluate("()=>[...document.querySelectorAll('.lm-posto b')].map(x=>x.textContent)"))
        print('tasto Lente:',await pg.evaluate("()=>(document.querySelector('.mlfab i')||{}).textContent"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('.lm-posto').click()");await pg.wait_for_timeout(700)
        print('scheda:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .pvpremio b')||{}).textContent,[...document.querySelectorAll('#sheet.open .pvdue small')].map(x=>x.textContent)]"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pvl]').click()");await pg.wait_for_timeout(2500)
        await pg.evaluate("h=>{for(let i=0;i<20;i++){const e=new Event('deviceorientation');Object.defineProperty(e,'webkitCompassHeading',{value:0});Object.defineProperty(e,'beta',{value:90});window.dispatchEvent(e);}}",0)
        await pg.wait_for_timeout(1500)
        print('Lente:',await pg.evaluate("()=>[(document.querySelector('#lente .zmact')||{}).textContent,(document.querySelector('#lente .zmradar b')||{}).textContent]"))
        if os.environ.get('SHOT3'):await pg.screenshot(path=os.environ['SHOT3'])
        await pg.evaluate("()=>document.querySelector('#lente .zmact').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");await pg.wait_for_timeout(1200)
        print('preso:',await pg.evaluate("()=>[(window.__MVV||{}).p_kind,!!pvPreso(PV.P[0]),(document.querySelector('#lente .zmact')||{}).textContent]"))
        await pg.evaluate("()=>lenteClose()");await pg.wait_for_timeout(7000)
        print('sulla mappa grigio:',await pg.evaluate("()=>document.querySelectorAll('.lm-posto.preso').length"))
        print('ERR',E);await b.close()
asyncio.run(main())
