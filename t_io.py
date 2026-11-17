import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🗺️ MONDO = MAPPA CON I TASTI, 🧑 IO = LA TUA ORDA (Fase 33): barra dell'orda e scorte con 🏠 sempre in cima alla mappa
# (anche se spariscono), tasti 3D/Presidi/Alleati/Cerca, Mondo ritoccato non apre menu, Io apre la pagina dell'orda col
# superstite in cima e senza giro/premi/missioni/fronte, Amici con "Aiuta un alleato", premi riscattati in automatico.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(4000)
        print('mappa:',await pg.evaluate("()=>[!!document.querySelector('.mapfull .mwtop'),!!document.querySelector('.mapfull [data-iohome]'),[...document.querySelectorAll('.mapfull .iobtns small')].map(x=>x.textContent),!!document.querySelector('.mapfull .mlfab')]"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('.mapfull .mwtop').remove()");await pg.wait_for_timeout(1500)
        print('barra rimessa:',await pg.evaluate("()=>!!document.querySelector('.mapfull .mwtop .mwscorte [data-iohome]')"))
        await pg.evaluate("()=>document.querySelector('.mapfull [data-iohome]').click()");await pg.wait_for_timeout(1200)
        print('le mie case:',await pg.evaluate("()=>(document.querySelector('#sheet.open')||{}).textContent.slice(0,40)"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(400)
        await pg.evaluate("()=>document.querySelector('.sbar [data-sb=mondo]').click()");await pg.wait_for_timeout(700)
        print('mondo senza menu:',await pg.evaluate("()=>[S.tab,!document.querySelector('#sheet.open')]"))
        await pg.evaluate("()=>document.querySelector('.mapfull [data-iob=ally]').click()");await pg.wait_for_timeout(800)
        print('alleati:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .sbtile b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbt=aiuta]').click()");await pg.wait_for_timeout(1500)
        print('aiuta:',await pg.evaluate("()=>[(document.querySelector('#sheet.open')||{}).textContent.slice(0,30),document.querySelectorAll('#sheet.open .alsbox [data-alv],#sheet.open .alsbox .alrow,#sheet.open .alsbox button').length]"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>document.querySelector('.sbar [data-sb=io]').click()");await pg.wait_for_timeout(2500)
        print('io:',await pg.evaluate("()=>{const v=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display!=='none':null};return[S.tab,(document.querySelector('.sbar .on b')||{}).textContent,[...document.querySelectorAll('.iotop .sbtile b')].map(x=>x.textContent),v('.page.orda1 .opan'),v('.page.orda1 .fronte'),v('.page.orda1 .lpan'),v('.page.orda1 .coach'),v('.page.orda1 .tmp')]}"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        await pg.evaluate("()=>document.querySelector('.iotop [data-sbt=sup]').click()");await pg.wait_for_timeout(1000)
        print('superstite da Io:',await pg.evaluate("()=>(document.querySelector('#sheet.open')||{}).textContent.slice(0,30)"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        # 🎁 premi automatici
        await pg.evaluate("()=>{window.__ioAuto=1;G.spins=2;G.scratch=1;}");await pg.evaluate("()=>ioAuto(true)");await pg.wait_for_timeout(1500)
        print('premi:',await pg.evaluate("()=>[[...document.querySelectorAll('#sheet.open .ioprem li')].map(x=>x.textContent.slice(0,40)),G.spins,G.scratch]"))
        if os.environ.get('SHOT3'):await pg.screenshot(path=os.environ['SHOT3'])
        print('ERR',E);await b.close()
asyncio.run(main())
