import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 📬 RICHIESTE (Fase 25): in un posto solo chi chiede di entrare nelle tue alleanze (voto), gli inviti, le proposte di
# alleanza e i coinquilini, con Accetta / Rifiuta; linguetta nei Messaggi, carta nella guida, "Rispondi" in bacheca;
# l'energia si scrive 🔋 (niente ⚡ nella scheda del superstite).
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
        await pg.wait_for_timeout(3500)
        print('numero sul 💬:',await pg.evaluate("()=>(document.querySelector('.mwtop [data-trmsg] b')||{}).textContent"))
        await pg.evaluate("()=>document.querySelector('.mwtop [data-trmsg]').click()");await pg.wait_for_timeout(2000)
        print('richieste:',await pg.evaluate("()=>[(document.querySelector('#sheet.open [data-mst=rich]')||{}).className,[...document.querySelectorAll('#sheet.open .reqrow b')].map(x=>x.textContent)]"))
        await pg.evaluate("()=>{const r=[...document.querySelectorAll('#sheet.open .reqrow')].find(x=>/gina/.test(x.textContent));r.querySelector('[data-reqy]').click()}");await pg.wait_for_timeout(2000)
        print('voto mandato:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .reqrow b')].length"))
        await pg.evaluate("()=>{const r=[...document.querySelectorAll('#sheet.open .reqrow')].find(x=>/mario/.test(x.textContent)&&/propone/.test(x.textContent));r.querySelector('[data-reqy]').click()}");await pg.wait_for_timeout(2000)
        print('alleanza accettata:',await pg.evaluate("()=>__W.accepted===true||!![...document.querySelectorAll('#sheet.open .reqrow b')].every(x=>!/propone/.test(x.textContent))"))
        await pg.evaluate("async()=>{closeSheet();REQ.t=0;await reqLoad(true);await gdLoad(true);gdSheet()}");await pg.wait_for_timeout(1800)
        print('nella guida:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .gdcard .gdtx>b')].map(x=>x.textContent).filter(t=>/chiede|invita|propone/.test(t))"))
        await pg.evaluate("()=>{closeSheet();supSheet('io')}");await pg.wait_for_timeout(1500)
        print('niente ⚡ nel superstite:',await pg.evaluate("()=>!/⚡/.test(document.querySelector('#sheet.open').textContent)&&/🔋/.test(document.querySelector('#sheet.open').textContent)"))
        print('ERR',E);await b.close()
asyncio.run(main())
