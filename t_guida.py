import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# GUIDA "COSA FARE" (migrazione 016): pulsante 🧭 nella barra delle scorte con il numero delle cose urgenti, elenco in ordine
# di importanza (assalti in arrivo, alleati che chiedono aiuto o sono assaltati, prepara, riscatta, affitti, presidi, rivali),
# un pulsante per azione; presidi entro 5 km; niente superstite doppio sulla mappa se il suo nome è già sopra la casa.
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
                          "__W.b.w9={owner:'me',lat:45.326,lon:10.659,level:2,paid:300};await wMine(true);closeSheet();await resLoad(true);await orLoad(true);await gdLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3500)
        print('pulsante guida:',await pg.evaluate("()=>{const b=document.querySelector('.mwtop [data-trguida]');return b?b.textContent.trim():null}"))
        await pg.evaluate("()=>document.querySelector('.mwtop [data-trguida]').click()");await pg.wait_for_timeout(2500)
        print('carte:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .gdcard .gdtx>b')].map(x=>x.textContent).slice(0,12)"))
        print('urgenti:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .gdcard.urg').length"))
        await pg.evaluate("()=>{const c=[...document.querySelectorAll('#sheet.open .gdcard')].find(x=>/Prepara/.test(x.textContent));c.querySelector('[data-gda]').click()}");await pg.wait_for_timeout(2500)
        print('dopo Prepara:',await pg.evaluate("()=>[!!(OR.s&&OR.s.prepared),![...document.querySelectorAll('#sheet.open .gdcard .gdtx>b')].some(x=>/Prepara/.test(x.textContent))]"))
        await pg.evaluate("()=>{const c=[...document.querySelectorAll('#sheet.open .gdcard')].find(x=>/assaltano/.test(x.textContent));c.querySelector('[data-gda]').click()}");await pg.wait_for_timeout(2500)
        print('assi sulla casa assaltata:',await pg.evaluate("()=>(__mkTrr.w9||{}).assi||0"))
        # menu ☰
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(600)
        print('voce nel menu:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].some(r=>/Cosa fare ora/.test(r.textContent))"))
        await pg.evaluate("()=>{try{zmClose()}catch(e){}}")
        # presidi entro 5 km
        await pg.evaluate("()=>{closeSheet();window.__PRES=[];localStorage.removeItem('zsh_pres_seed');window.trOverpass=()=>new Promise(r=>setTimeout(()=>r([]),20000));presList5(window.__mf)}");await pg.wait_for_timeout(1500)
        print('presidi entro 5 km (subito, anche con OpenStreetMap lento):',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h, #sheet.open h3')||{}).textContent,document.querySelectorAll('#sheet.open .pres-row').length]"))
        # superstite doppio
        n=await pg.evaluate("()=>{closeSheet();const lm=window.__mf;lm._wrows=[{nick:'Anna88',residents:null}];window.ZUSERS=[{user_id:'u5',nick:'Anna88',lat_r:45.326,lon_r:10.659},{user_id:'u6',nick:'Bob',lat_r:45.327,lon_r:10.66}];zDrawUsers(lm);return [...document.querySelectorAll('.lm-usr em')].map(e=>e.textContent)}")
        print('superstiti approssimati (senza chi ha il nome sulla casa):',n)
        print('ERR',E);await b.close()
asyncio.run(main())
