import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🧟 ZOMBIE NEL MONDO VERO (migrazione 025): nella Lente lo zombie vicino compare davanti (bussola verso nord), radar,
# tocco → lotta: punti deboli da toccare, attacco da schivare con la freccia giusta, fine con premi e Zombipedia;
# cassa vicina da aprire; segnaposti sulla mappa; Zombipedia da Gioca.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__ZMHP=3')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(6500)
        print('segnaposti sulla mappa:',await pg.evaluate("()=>document.querySelectorAll('.lm-zm').length"))
        # 📷 tasto Lente sulla mappa con quello che c'è entro 80 m; cassetto che si abbassa
        print('tasto Lente sulla mappa:',await pg.evaluate("()=>{const b=document.querySelector('.mapfull .mlfab');return b?[b.textContent,b.classList.contains('caldo')]:null}"))
        await pg.evaluate("()=>document.querySelector('.mapfull [data-mldown]').click()");await pg.wait_for_timeout(500)
        print('cassetto abbassato:',await pg.evaluate("()=>[document.querySelector('.mapfull .mwdrawer').classList.contains('min'),(document.querySelector('.mapfull .mlmin')||{}).textContent,document.querySelector('.mapfull .mwdrawer').offsetHeight]"))
        if os.environ.get('SHOT0'):await pg.screenshot(path=os.environ['SHOT0'])
        await pg.evaluate("()=>document.querySelector('.mapfull [data-mlup]').click()");await pg.wait_for_timeout(500)
        print('cassetto rialzato:',await pg.evaluate("()=>!document.querySelector('.mapfull .mwdrawer').classList.contains('min')"))
        async def bussola(h):
            await pg.evaluate("h=>{for(let i=0;i<20;i++){const e=new Event('deviceorientation');Object.defineProperty(e,'webkitCompassHeading',{value:h});Object.defineProperty(e,'beta',{value:90});window.dispatchEvent(e);}}",h)
            await pg.wait_for_timeout(400)
        await pg.evaluate("()=>document.querySelector('.mapfull .mlfab').click()");await pg.wait_for_timeout(2500);await bussola(0);await pg.wait_for_timeout(800)
        print('radar:',await pg.evaluate("()=>(document.querySelector('#lente .zmradar b')||{}).textContent"))
        print('zombie davanti:',await pg.evaluate("()=>[...document.querySelectorAll('#lente .zmobj')].map(e=>e.textContent)"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        print('tasto grande:',await pg.evaluate("()=>(document.querySelector('#lente .zmact')||{}).textContent"))
        # 🎯 mira e spara: il primo colpo fa partire la lotta, poi si spara col tasto grande
        await pg.evaluate("()=>document.querySelector('#lente .zmact').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))");await pg.wait_for_timeout(700)
        print('lotta:',await pg.evaluate("()=>[!!ZM.f,(document.querySelector('#lente .zmhud b')||{}).textContent,(document.querySelector('#lente .zmact')||{}).textContent,!!document.querySelector('#lente .zmobj .zmvita')]"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        await bussola(90);await pg.wait_for_timeout(300)
        print('fuori mira:',await pg.evaluate("()=>(document.querySelector('#lente .zmact')||{}).textContent"))
        await bussola(0)
        for i in range(30):
            await pg.evaluate("()=>{const b=document.querySelector('#lente .zmact');if(b)b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}");await pg.wait_for_timeout(450)
            if await pg.evaluate("()=>!!document.querySelector('#lente .zmres')"):break
        print('fine:',await pg.evaluate("()=>[(document.querySelector('#lente .zmres b')||{}).textContent,(window.__ZMF||{}).p_vinto]"))
        await pg.evaluate("()=>document.querySelector('#lente [data-zmok]').click()");await pg.wait_for_timeout(800)
        # cassa a 15 m
        await pg.evaluate("()=>{const c=ZM.L.find(z=>z.k==='cassa');zmTap(c)}");await pg.wait_for_timeout(1200)
        print('cassa aperta:',await pg.evaluate("()=>ZM.L.find(z=>z.k==='cassa').preso"))
        # re lontano: non si combatte
        await pg.evaluate("()=>{window.__T=null;const o=toast;toast=m=>{window.__T=m;o(m)};const r=ZM.L.find(z=>z.tipo==='re');zmTap(r)}");await pg.wait_for_timeout(500)
        print('troppo lontano:',await pg.evaluate("()=>window.__T"))
        await pg.evaluate("()=>document.querySelector('#lente [data-zmped]').click()");await pg.wait_for_timeout(1200)
        print('zombipedia:',await pg.evaluate("()=>[(document.querySelector('#lente .zmped b')||{}).textContent,document.querySelectorAll('#lente .zmcard').length]"))
        await pg.evaluate("()=>lenteClose()");await pg.wait_for_timeout(2000)
        await pg.evaluate("()=>document.querySelector('.sbar [data-sb=gioca]').click()");await pg.wait_for_timeout(800)
        print('gioca:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .sbtile b')].map(x=>x.textContent).filter(t=>/Lente|Zombipedia/.test(t))"))
        print('ERR',E);await b.close()
asyncio.run(main())
