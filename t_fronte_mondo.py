import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🧟 IL FRONTE SULLA MAPPA DEL MONDO (Fase 34): strade colorate per pendenza e zombie dell'orda che camminano sulla
# mappa del Mondo, riquadri in basso a sinistra (zombie, % di tenere, meteo, giorno), zombie dell'orda nella Zombipedia.
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
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');localStorage.removeItem('zsh_ozv');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(9000)
        print('fronte sulla mappa:',await pg.evaluate("()=>[MFO.paths.length,MFO.zs.length,!!(MFO.map&&MFO.map.getSource&&MFO.map.getSource('mo-p')),document.querySelectorAll('.mapfull .mfoz').length]"))
        print('riquadri:',await pg.evaluate("()=>[...document.querySelectorAll('.mapfull .mfochips button')].map(x=>x.textContent.replace(/\\s+/g,' '))"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('.mapfull .mfochips [data-mfo=z]').click()");await pg.wait_for_timeout(1500)
        print('zombipedia:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .mfoped b')||{}).textContent,[...document.querySelectorAll('#sheet.open .mfoped .zmcard')].map(x=>x.className.includes('no')?'?':x.querySelector('b').textContent)]"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'],full_page=True)
        await pg.evaluate("()=>closeSheet()");await pg.evaluate("()=>sbGo('io')");await pg.wait_for_timeout(1500);await pg.evaluate("()=>sbGo('mondo')");await pg.wait_for_timeout(5000)
        print('dopo il giro:',await pg.evaluate("()=>[MFO.zs.length,!!document.querySelector('.mapfull .mfochips')]"))
        print('ERR',E);await b.close()
asyncio.run(main())
