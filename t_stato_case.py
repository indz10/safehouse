import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 📊 STATO DELLE CASE (migrazione 036): nella pagina della casa danni in %, integrità, lavori in corso col tempo
# (riparazione e potenziamenti in coda), ⚡ accelera, 🎬 rivedi l'assalto; in "Le mie case" riga di stato per casa e
# case perse; dopo "Prepara" si apre "Le mie case". Migrazione 040: ogni difesa col suo danno e 🔧 Restaura.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__casePop=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);"
                          "window.__PVP={in_arrivo:[],in_viaggio:[],storico:[],cn:[{id:7,bid:myHouses()[0].bid,home:true,tipo:'potenzia',def_kind:'barricate',def_level:2,fine:new Date(Date.now()+2400e3).toISOString(),accelera:8}]};S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>SB.rpc('world_prepare')");await pg.wait_for_timeout(3000)
        print('dopo prepara:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent,[...document.querySelectorAll('#sheet.open .csst')].map(x=>x.textContent),(document.querySelector('#sheet.open .csperse')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-cs=\"0\"]').click()");await pg.wait_for_timeout(5000)
        print('pagina casa:',await pg.evaluate("()=>(document.querySelector('#sheet.open .csbox')||{}).textContent.replace(/\\s+/g,' ').slice(0,260)"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>SB.rpc('world_prepare')");await pg.wait_for_timeout(2000)
        print('prepara dalla casa resta:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .csbox')"))
        await pg.evaluate("()=>document.querySelector('#sheet.open .csbox [data-pvacc]').click()");await pg.wait_for_timeout(1500)
        print('difese:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .csdif')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-csres]').click()");await pg.wait_for_timeout(1500)
        print('restaura:',await pg.evaluate("()=>(window.__RES||{}).p_kind"))
        print('accelera:',await pg.evaluate("()=>(window.__CNA||{}).p_id"))
        print('ERR',E);await b.close()
asyncio.run(main())
