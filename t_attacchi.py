import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# ⚔️ ATTACCHI TRA SUPERSTITI (Fase 35, migrazione 028): scheda dell'attacco (distanza, viaggio, costo, forza contro difesa),
# partenza, vecchie azioni che portano qui, riquadro Attacchi in Io (in viaggio, in arrivo col conto alla rovescia,
# ripara), allarme sulla mappa, riepilogo del combattimento, Combattente fino a 9.
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
        await pg.wait_for_timeout(3500)
        # la vecchia "manda un'orda" porta alla nuova scheda
        await pg.evaluate("()=>SB.rpc('world_send_attack',{p_target:'u3'})");await pg.wait_for_timeout(1200)
        print('scheda attacco:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-t, #sheet.open h2')||{}).textContent,[...document.querySelectorAll('#sheet.open .pvpgrid b')].map(x=>x.textContent),(document.querySelector('#sheet.open .pvpstima')||{}).textContent,(document.querySelector('#sheet.open [data-pvgo]')||{}).textContent]"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pvgo]').click()");await pg.wait_for_timeout(1200)
        print('partito:',await pg.evaluate("()=>[(window.__PVA||{}).p_user,!document.querySelector('#sheet.open')]"))
        # Io: il riquadro degli attacchi
        await pg.evaluate("()=>{const P=window.__PVP;P.in_arrivo.push({id:8,da:'giangy',da_id:'u2',bid:'w1',casa_vera:true,impatto:new Date(Date.now()+300e3).toISOString(),minuti:10,km:3.1});P.danno=10;PVP.t=0;}")
        await pg.evaluate("()=>sbGo('io')");await pg.wait_for_timeout(3000)
        print('io attacchi:',await pg.evaluate("()=>[...document.querySelectorAll('.pvpbox .pvprow b')].map(x=>x.textContent)"))
        print('conto alla rovescia:',await pg.evaluate("()=>[...document.querySelectorAll('.pvpbox [data-pvt]')].map(x=>x.textContent)"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        await pg.evaluate("()=>document.querySelector('.pvpbox [data-pvrip]').click()");await pg.wait_for_timeout(1000)
        print('riparato:',await pg.evaluate("()=>!!window.__PVR"))
        await pg.evaluate("()=>sbGo('mondo')");await pg.wait_for_timeout(2500)
        print('allarme sulla mappa:',await pg.evaluate("()=>(document.querySelector('.mapfull .pvpal')||{}).textContent||null"))
        if os.environ.get('SHOT3'):await pg.screenshot(path=os.environ['SHOT3'])
        # 🛡️ rinforzi (Fase 36): chiedi, chi arriva in tempo, alleati sotto attacco
        await pg.evaluate("()=>{const P=window.__PVP;P.in_arrivo[0].rinforzi=[{nick:'giangy',arrivo:new Date(Date.now()+120e3).toISOString(),in_tempo:true}];P.in_arrivo[0].rinf=13;P.alleati=[{id:12,chi:'luca',chi_id:'u4',da:'bruto',casa_vera:true,impatto:new Date(Date.now()+900e3).toISOString(),km:1.2,minuti:10,in_tempo:true,partito:false}];PVP.t=0;}")
        await pg.evaluate("()=>sbGo('io')");await pg.wait_for_timeout(2500)
        print('rinforzi riga:',await pg.evaluate("()=>(document.querySelector('.pvpbox .pvprf')||{}).textContent"))
        print('alleati sotto attacco:',await pg.evaluate("()=>[...document.querySelectorAll('.pvpbox .pvprow.sos b, .pvpbox [data-pvrf]')].map(x=>x.textContent)"))
        if os.environ.get('SHOT5'):await pg.screenshot(path=os.environ['SHOT5'])
        await pg.evaluate("()=>document.querySelector('.pvpbox [data-pvaiuto]').click()");await pg.wait_for_timeout(1500)
        print('chiesti:',await pg.evaluate("()=>[(window.__RFC||{}).p_att,!!document.querySelector('.pvpbox [data-pvaiuto]')]"))
        await pg.evaluate("()=>document.querySelector('.pvpbox [data-pvchi]').click()");await pg.wait_for_timeout(1200)
        print('chi arriva:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .pvprow')].map(x=>x.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>document.querySelector('.pvpbox [data-pvrf]').click()");await pg.wait_for_timeout(1500)
        print('mandati:',await pg.evaluate("()=>[(window.__RFR||{}).p_att,(document.querySelector('.pvpbox .pvprow.sos .pvpok')||{}).textContent]"))
        print('carte guida:',await pg.evaluate("()=>gdItems({}).filter(x=>/attacc|sotto attacco/.test(x.t)).map(x=>x.t)"))
        # riepilogo del combattimento
        await pg.evaluate("()=>{window.__pvpPop=1;window.__PVP.storico=[{id:9,io:'dif',altro:'giangy',altro_id:'u2',casa_vera:true,stato:'risolto',esito:{r:1.31,caso:0.04,att:120,dif:92,esito:2,loot:{legno:30,cibo:12,carb:5,mattoni:40},danno:10},quando:new Date().toISOString()}];PVP.t=0;}")
        await pg.wait_for_timeout(2500)
        print('riepilogo:',await pg.evaluate("()=>(document.querySelector('#sheet.open')||{}).textContent.replace(/\\s+/g,' ').slice(0,140)"))
        if os.environ.get('SHOT4'):await pg.screenshot(path=os.environ['SHOT4'])
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        # Combattente fino a 9
        await pg.evaluate("()=>supSheet('io')");await pg.wait_for_timeout(1200)
        print('combattente:',await pg.evaluate("()=>{const r=[...document.querySelectorAll('#sheet.open .supab')].find(x=>/Combattente/.test(x.textContent));return r?r.querySelector('.supdots').textContent.length:null}"))
        print('ERR',E);await b.close()
asyncio.run(main())
