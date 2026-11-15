import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# MESSAGGI DA OVUNQUE: 💬 nella barra del Mondo con i non letti, "💬 Messaggi" (conversazioni, alleati, cerca), 💬 accanto agli alleati,
# nei risultati di Trova superstiti, nella casa comprata di un altro; ogni 💬 apre la chat.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await orLoad(true);await msgCount();S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3500)
        print('barra 💬:',await pg.evaluate("()=>{const b=document.querySelector('.mwtop [data-trmsg]');return b?b.textContent.trim():null}"))
        await pg.evaluate("()=>document.querySelector('.mwtop [data-trmsg]').click()");await pg.wait_for_timeout(1500)
        print('conversazioni:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .msgbox .dmt b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open .msgbox [data-dmr]').click()");await pg.wait_for_timeout(1500)
        print('chat aperta:',await pg.evaluate("()=>[!!document.querySelector('#sheet.open .dmlist'),(document.querySelector('#sheet.open [data-sback], #sheet.open .sheet-back')||{}).textContent||'']"))
        await pg.evaluate("async()=>{closeSheet();await msgHub('al')}");await pg.wait_for_timeout(1500)
        print('alleati con 💬:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .msgbox [data-dmr]').length"))
        await pg.evaluate("async()=>{closeSheet();await msgHub('cerca')}");await pg.wait_for_timeout(800)
        await pg.fill('#msgQ','gia');await pg.evaluate("()=>document.querySelector('[data-msq]').click()");await pg.wait_for_timeout(1200)
        print('cerca:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .msgres .dmt b')].map(x=>x.textContent)"))
        await pg.evaluate("async()=>{closeSheet();await trovaSheet()}");await pg.wait_for_timeout(2500)
        print('trova con 💬:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .trrow [data-dmr]').length>0"))
        await pg.evaluate("async()=>{closeSheet();await wSheetEdificio('x5',45.326,10.66)}");await pg.wait_for_timeout(3000)
        print('casa del rivale con 💬:',await pg.evaluate("()=>{const b=document.querySelector('#sheet.open .trrpan [data-dmr]');return b?b.textContent:null}"))
        await pg.evaluate("()=>document.querySelector('#sheet.open .trrpan [data-dmr]').click()");await pg.wait_for_timeout(1500)
        print('chat dal rivale:',await pg.evaluate("()=>[!!document.querySelector('#sheet.open .dmlist'),/Messaggi/.test((document.querySelector('#sheet.open [data-sback], #sheet.open .sheet-back')||{}).textContent||'')]"))
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(600)
        print('menu:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].some(r=>/Messaggi/.test(r.textContent))"))
        print('ERR',E);await b.close()
asyncio.run(main())
