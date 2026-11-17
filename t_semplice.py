import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 📱 SCHERMATA SEMPLICE (Fase 27): 4 tasti in basso (Mondo, Gioca, Io, Amici) con i numeri; niente pulsanti a lato,
# tondo, linguette; ogni tasto apre le sue voci e ogni voce apre la funzione di prima.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');window.__mkAlz={in:true};S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);await reqLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(4000)
        print('4 tasti:',await pg.evaluate("()=>[...document.querySelectorAll('.sbar [data-sb] b')].map(x=>x.textContent)"))
        print('nascosti:',await pg.evaluate("()=>['.mwside','.mwmodes','.supme','.mwlente'].map(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display:'-'})"))
        print('scorte e ADESSO visibili:',await pg.evaluate("()=>[getComputedStyle(document.querySelector('.mwres')).display!=='none',!!document.querySelector('.mwdrawer .mwnow')]"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        for k in ['gioca','io','amici']:
            await pg.click(f'.sbar [data-sb={k}]');await pg.wait_for_timeout(900)
            print(k,':',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h, #sheet.open h3')||{}).textContent,[...document.querySelectorAll('#sheet.open .sbtile b')].map(x=>x.textContent)]"))
            if k=='io' and os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
            await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.click('.sbar [data-sb=mondo]');await pg.wait_for_timeout(900)
        print('mondo:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .sbtile b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('.mapfull .iobtns [data-iob=pres]').click()");await pg.wait_for_timeout(1500)
        print('presidi aperti:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .pres-row')||/Presidi/.test((document.querySelector('#sheet.open')||{}).textContent||'')"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.click('.sbar [data-sb=amici]');await pg.wait_for_timeout(800)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbt=rich]').click()");await pg.wait_for_timeout(1800)
        print('richieste:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .reqrow').length"))
        await pg.evaluate("()=>closeSheet()");await pg.click('.sbar [data-sb=gioca]');await pg.wait_for_timeout(800)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbt=ass]').click()");await pg.wait_for_timeout(1500)
        print('assedio:',await pg.evaluate("()=>[!!document.getElementById('assedio'),!document.querySelector('.sbar')]"))
        await pg.evaluate("()=>assClose()");await pg.wait_for_timeout(1500)
        print('di nuovo i tasti:',await pg.evaluate("()=>!!document.querySelector('.sbar')"))
        await pg.evaluate("()=>go('social')");await pg.wait_for_timeout(2000)
        print('superstiti con i tasti:',await pg.evaluate("()=>[!!document.querySelector('.sbar'),(document.querySelector('.sbar .on b')||{}).textContent]"))
        print('ERR',E);await b.close()
asyncio.run(main())
