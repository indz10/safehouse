import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# PRESIDI (Fase 9b): segnaposto 🚩 sulla mappa, elenco, scheda, occupa, fai la guardia, lascia; "Perché" con i presidi vicini.
# Deve stampare: segnaposto: 3 ... occupa: Presidio occupato! ... guardia: ... difesa 67 ... perché: True ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();S.zv='mondo';go('mappa')}")
        await pg.wait_for_timeout(4500)
        print('pulsante:',await pg.evaluate("()=>!!document.querySelector('[data-mfpres]')"),'| segnaposto:',await pg.evaluate("()=>document.querySelectorAll('.lm-pres').length"),
              await pg.evaluate("()=>[...document.querySelectorAll('.lm-pres')].map(e=>e.className.replace('lm lm-pres ',''))"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(400)
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/pres_mappa.png')
        await pg.click('[data-mfpres]');await pg.wait_for_timeout(1200)
        print('elenco:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .pres-row b')].map(b=>b.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pr=\"osm:n1\"]').click()");await pg.wait_for_timeout(600)
        print('scheda:',await pg.evaluate("()=>(document.querySelector('#sheet.open .pres-st')||{}).textContent"),'| indietro:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .sheet-back, #sheet.open [data-sback]')"))
        await pg.click('#sheet.open [data-pocc]');await pg.wait_for_timeout(1000)
        print('occupa:',await pg.evaluate("()=>(document.querySelector('#toast, .toast')||{}).textContent"),'|',await pg.evaluate("()=>(document.querySelector('#sheet.open .pres-st')||{}).textContent"))
        await pg.click('#sheet.open [data-pgua]');await pg.wait_for_timeout(1000)
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/pres_scheda.png')
        print('guardia:',await pg.evaluate("()=>(document.querySelector('#sheet.open .pres-orda')||{}).textContent"))
        await pg.evaluate("()=>{window.confirm=()=>true;document.querySelector('#sheet.open [data-plas]').click()}");await pg.wait_for_timeout(1000)
        print('lascia:',await pg.evaluate("()=>(document.querySelector('#sheet.open .pres-st')||{}).textContent"))
        # "Perché": riga dei presidi vicini quando il server la manda
        await pg.evaluate("()=>{closeSheet();DEF.d=Object.assign({prep:0,realshield:0,realshield_pts:0,helps:0,helps_pts:0,shields:0,shields_pts:0,squad:0,squad_pts:0,coinq:0,coinq_pts:0,malus:0,wlevel:1,attack_min:32,attack_max:81},DEF.d||{});DEF.d.houses=[{bid:'h',home:true,level:1,pres:3,total:110}];window.thrOf=()=>null;whySheet('h',true)}")
        await pg.wait_for_timeout(500)
        print('perché:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .whyr span')].some(s=>/Presidi/.test(s.textContent))"))
        print('ERR',errs);await b.close()
asyncio.run(main())
