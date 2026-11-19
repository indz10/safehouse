import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🚨 EVENTI PIÙ VARI (migrazione 038) e 👹 BOSS SULLA MAPPA: i 6 tipi nuovi hanno segnaposto, scheda e pulsante giusti;
# il boss della settimana compare sulla mappa vicino a casa e dal tasto 👹 Boss.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.add_init_script("""(()=>{const t=n=>new Date(Date.now()+n*60e3).toISOString();const la=45.3262,lo=10.6592;
          window.__EVT=[['lancio','🚁 Lancio dall’elicottero',0,5],['auto','🚗 Auto abbandonata',0,2],['farmacia','💊 Farmacia aperta',0,3],['scorta','🚐 Famiglia da scortare',0,1],['cani','🐕 Branco di cani rabbiosi',24,1],['orda','🧟‍♂️ Orda di passaggio',160,1]]
            .map((x,i)=>({id:20+i,kind:x[0],nome:x[1],lat:la+i*0.0004,lon:lo,end_at:t(30),hp:x[2],hp_max:x[2],posti:x[3],km:0.2,raggio:5,gente:0,mio:null}));})()""")
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("async()=>{EVT.t=0;await evtLoad(true);evtMarks();await bossLoad(true);bossMark();}");await pg.wait_for_timeout(600)
        print('segnaposti:',await pg.evaluate("()=>[...document.querySelectorAll('.lm-evt')].map(x=>x.className.split(' ').find(c=>c.startsWith('k-')||c==='lm-boss'))"))
        for i in (20,23,25):
            await pg.evaluate(f"()=>evtSheet({i})");await pg.wait_for_timeout(700)
            print('scheda',i,':',await pg.evaluate("()=>[(document.querySelector('#sheet.open .evtcard b')||{}).textContent,(document.querySelector('#sheet.open [data-evgo]')||{}).textContent]"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>document.querySelector('.lm-boss').click()");await pg.wait_for_timeout(1200)
        print('boss dalla mappa:',await pg.evaluate("()=>(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const b=document.querySelector('[data-iob=\"boss\"]');b&&b.click();}");await pg.wait_for_timeout(1200)
        print('tasto boss:',await pg.evaluate("()=>(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent"))
        if os.environ.get('SHOT2'):
            await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(400);await pg.screenshot(path=os.environ['SHOT2'])
        print('ERR',E);await b.close()
asyncio.run(main())
