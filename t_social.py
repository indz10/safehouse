import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(10000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
          "SPONSORS.ferr={name:'Ferramenta Rossi',logo:'FR'};SP_GEO.ferr={lat:45.3262,lon:10.6590,id:'s1'};SP_OFF.ferr='Sconto 10% sulle serrature';SP_CAT.ferr='Ferramenta';go('home');}")
        await pg.wait_for_timeout(1800);await pg.evaluate("()=>closeSheet()")
        print('barra:',await pg.evaluate("()=>[...document.querySelectorAll('#nav button span')].map(s=>s.textContent)"),'| menu:',await pg.evaluate("()=>!!document.getElementById('zmenuBtn')"))
        print('casa novità:',await pg.evaluate("()=>{const h=document.querySelector('.hsoc');return h&&h.querySelectorAll('.sitem').length}"))
        await pg.evaluate("()=>{SOC.tab='bacheca';}");await pg.tap('#nav [data-tab=social]');await pg.wait_for_timeout(1200)
        print('bacheca:',await pg.evaluate("()=>[...document.querySelectorAll('#socBody .sitem .stx')].map(x=>x.textContent.replace(/\\s+/g,' ').slice(0,60))"))
        await pg.screenshot(path='y_soc1.png')
        await pg.evaluate("()=>document.querySelector('[data-ayes]').click()");await pg.wait_for_timeout(600)
        print('proposta accettata, richieste rimaste:',await pg.evaluate("()=>document.querySelectorAll('[data-ayes]').length"))
        await pg.evaluate("()=>document.querySelector('[data-st=classifiche]').click()");await pg.wait_for_timeout(600)
        print('classifica:',await pg.evaluate("()=>[...document.querySelectorAll('.srank')].map(r=>r.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.evaluate("()=>document.querySelector('[data-st=squadra]').click()");await pg.wait_for_timeout(600)
        await pg.screenshot(path='y_soc2.png')
        await pg.evaluate("()=>document.querySelector('.snick[data-pl=u3]')?.click()||document.querySelector('[data-pl]').click()");await pg.wait_for_timeout(800)
        print('scheda giocatore:',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,140)"))
        await pg.screenshot(path='y_soc3.png')
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sh=\"2\"]').click()");await pg.wait_for_timeout(500)
        print('saluti inviati:',await pg.evaluate("()=>__W.shouts"))
        await pg.evaluate("()=>closeSheet()");await pg.tap('#nav [data-tab=mappa]');await pg.wait_for_timeout(2500)
        print('sponsor sulla mappa:',await pg.evaluate("()=>[document.querySelectorAll('.lm-sp2').length,document.querySelector('.lm-sp2 .spo')&&document.querySelector('.lm-sp2 .spo').textContent,document.querySelector('.mfsp')&&document.querySelector('.mfsp').textContent]"))
        await pg.evaluate("()=>document.querySelector('.mfsp').click()");await pg.wait_for_timeout(500)
        print('elenco sponsor:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-spk] b')].map(b=>b.textContent)"))
        await pg.evaluate("()=>closeSheet()");await pg.evaluate("()=>{zmOpen();document.querySelector('#zmenu [data-zm=io]').click()}");await pg.wait_for_timeout(600)
        print('Io da avatar:',await pg.evaluate("()=>[S.tab,document.querySelectorAll('.iorow').length]"))
        print('ERR',errs[:6]);await b.close()
asyncio.run(main())
