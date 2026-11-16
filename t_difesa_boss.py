import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🛡️ DIFENDI CASA NELLA LENTE e 👹 BOSS DELLA SETTIMANA (migrazione 026): torrette piazzate nelle direzioni vere che
# sparano da sole, ondate di zombie da colpire, fine con premi; boss: scheda con vita, alleati, classifica, lotta di
# 20 s (punti deboli, ruggito da schivare), risultato; carta nella guida; tessere in Gioca.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__BOSSDUR=8')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(5000)
        async def bussola(h):
            await pg.evaluate("h=>{for(let i=0;i<20;i++){const e=new Event('deviceorientation');Object.defineProperty(e,'webkitCompassHeading',{value:h});Object.defineProperty(e,'beta',{value:90});window.dispatchEvent(e);}}",h)
            await pg.wait_for_timeout(300)
        # tessere in Gioca
        await pg.evaluate("()=>document.querySelector('.sbar [data-sb=gioca]').click()");await pg.wait_for_timeout(800)
        print('gioca:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .sbtile b')].map(x=>x.textContent).filter(t=>/Difendi casa|Boss/.test(t))"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(400)
        # 🛡️ difesa nella Lente
        await pg.evaluate("()=>lenteOpen()");await pg.wait_for_timeout(2500);await bussola(0)
        print('pulsante:',await pg.evaluate("()=>(document.querySelector('#lente [data-dfago]')||{}).textContent"))
        await pg.evaluate("()=>document.querySelector('#lente [data-dfago]').click()");await pg.wait_for_timeout(1000)
        print('piazza:',await pg.evaluate("()=>[!!document.querySelector('#lente .dfapiazza'),(document.querySelector('#lente [data-dfan]')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#lente [data-dfapz]').click()");await bussola(180)
        await pg.evaluate("()=>document.querySelector('#lente [data-dfapz]').click()");await pg.wait_for_timeout(1000)
        print('torrette:',await pg.evaluate("()=>[DFA.fase,DFA.T.map(t=>Math.round(t.b)),document.querySelectorAll('#lente .dfator').length]"))
        if os.environ.get('SHOT1'):await pg.wait_for_timeout(3500);await pg.screenshot(path=os.environ['SHOT1'])
        await pg.wait_for_timeout(7000)
        print('le torrette hanno sparato:',await pg.evaluate("()=>DFA.uccisi>0||DFA.Z.some(o=>o.hp<o.hp0&&o.st!=='att')"))
        for i in range(40):
            await pg.evaluate("()=>DFA.Z.forEach(o=>{if(o.st==='via')dfaHit(o,2)})");await pg.wait_for_timeout(300)
            if await pg.evaluate("()=>!!document.querySelector('#lente .lncz.dfa .lncres')"):break
        print('fine difesa:',await pg.evaluate("()=>[(document.querySelector('#lente .lncres b')||{}).textContent,(window.__DFAF||{}).p_uccisi,(window.__DFAF||{}).p_casa]"))
        await pg.evaluate("()=>document.querySelector('#lente [data-dfaok]').click()");await pg.evaluate("()=>lenteClose()");await pg.wait_for_timeout(800)
        # 👹 boss
        await pg.evaluate("()=>bossSheet()");await pg.wait_for_timeout(1200)
        print('boss:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .bossbox b')||{}).textContent,(document.querySelector('#sheet.open .bosshp i')||{}).textContent,!!document.querySelector('#sheet.open .bossins.on'),document.querySelectorAll('#sheet.open .bosstop li').length]"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-bossgo]').click()");await pg.wait_for_timeout(800)
        print('lotta:',await pg.evaluate("()=>[!!document.querySelector('#bossf'),(document.querySelector('#bossf .zmfbar b')||{}).textContent]"))
        if os.environ.get('SHOT3'):await pg.wait_for_timeout(600);await pg.screenshot(path=os.environ['SHOT3'])
        for i in range(10):
            await pg.evaluate("()=>document.querySelectorAll('#bossf .zmweak').forEach(w=>w.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})))");await pg.wait_for_timeout(200)
        c0=await pg.evaluate("()=>BOSS.f.colpi");await pg.evaluate("()=>{BOSS.f.nextAtk=0}");await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{const d=BOSS.f.atk.dir==='l'?'r':'l';document.querySelector(`#bossf [data-zmd=${d}]`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))}")
        print('colpi prima/dopo il ruggito:',c0,await pg.evaluate("()=>BOSS.f.colpi"))
        await pg.wait_for_timeout(7500)
        print('fine boss:',await pg.evaluate("()=>[(document.querySelector('#bossf .difres b')||{}).textContent,(window.__BOSSF||{}).p_colpi>0]"))
        await pg.evaluate("()=>document.querySelector('#bossf [data-bossok]').click()");await pg.wait_for_timeout(1200)
        print('dopo:',await pg.evaluate("()=>[!!document.querySelector('#bossf'),(document.querySelector('#sheet.open .bossbox b')||{}).textContent,(document.querySelector('#sheet.open [data-bossgo]')||{}).textContent]"))
        print('guida:',await pg.evaluate("()=>gdItems(GD.d||{}).filter(x=>/Boss/.test(x.t)).map(x=>x.t)"))
        print('ERR',E);await b.close()
asyncio.run(main())
