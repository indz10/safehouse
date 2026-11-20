import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🚗 I MEZZI DEL SUPERSTITE (migrazione 041): linguetta Mezzi nel superstite (6 mezzi con consumo, bottino, prezzo),
# compra/usa, 🥫 → 🔋; la spedizione chiede da quale casa partire; Bottega con bici e furgone.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(2000)
        await pg.evaluate("()=>supSheet('mezzi')");await pg.wait_for_timeout(2000)
        print('linguette:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-spt]')].map(x=>x.textContent)"))
        print('mezzi:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .mzcard b')].map(x=>x.textContent)"))
        print('furgone:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .mzcard')].pop().textContent.replace(/\\s+/g,' ').trim()"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-mzbuy=\"furgone\"]').click()");await pg.wait_for_timeout(1500)
        print('comprato:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .mzcard')].pop().textContent.includes('ce l’hai')"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-mzen=\"5\"]').click()");await pg.wait_for_timeout(1200)
        print('energia:',await pg.evaluate("()=>(window.__ENC||{}).p_n"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-mzcome]').click()");await pg.wait_for_timeout(1200)
        print('come si cresce:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-spt=\"mezzi\"].on')||document.querySelector('#sheet.open .supbox').textContent.length>50"))
        await pg.evaluate("()=>{W.m.houses=[{building_id:'w/77',lat:45.34,lon:10.67,level:2}];}")
        await pg.evaluate("()=>{const d=document.createElement('button');d.dataset.spgo='0';d.id='tsp';d.textContent='Parti';document.querySelector('#sheet.open .supbox').appendChild(d);d.click();}");await pg.wait_for_timeout(600)
        print('casa di partenza:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .partpick')"))
        print('ERR',E);await b.close()
asyncio.run(main())
