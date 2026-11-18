import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🚗 MEZZI CON TEMPI VERI e 🔨 CANTIERI (migrazione 035): tessera del mezzo nella scheda d'attacco e nelle spedizioni
# (tempo e ⛽ per distanza, scelta del mezzo), cantiere a tempo in Io con conto alla rovescia e ⚡ Accelera.
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
        await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>pvpSheet({user:'u3'})");await pg.wait_for_timeout(2500)
        print('mezzo attacco:',await pg.evaluate("()=>(document.querySelector('#sheet.open .mzchip')||{}).textContent"))
        await pg.evaluate("()=>document.querySelector('#sheet.open .mzchip').click()");await pg.wait_for_timeout(1200)
        print('scelta:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .mzopt b')].map(x=>x.textContent)"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#sheet.open .mzopt[data-mz=bici]').click()");await pg.wait_for_timeout(1500)
        print('dopo la scelta:',await pg.evaluate("()=>[window.__MZS,(document.querySelector('#sheet.open .mzchip')||{}).textContent]"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>pvSheet({k:'farmaco',name:'Farmacia',cat:'farmacia',lat:45.33,lon:10.66})");await pg.wait_for_timeout(2000)
        print('mezzo spedizione:',await pg.evaluate("()=>(document.querySelector('#sheet.open .mzchip')||{}).textContent"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        # 🔨 cantiere in Io
        await pg.evaluate("()=>{window.__PVP={in_arrivo:[],in_viaggio:[],storico:[],danno:10,ci:[{bid:'wb1',integrita:40,danno:0,caduta_at:null,legno:60,mattoni:0}],cn:[{id:3,bid:'wb1',home:false,fine:new Date(Date.now()+5400e3).toISOString(),accelera:18}]};PVP.t=0;PVP.cnT=0;}")
        await pg.evaluate("()=>sbGo('io')");await pg.wait_for_timeout(3500)
        print('cantiere:',await pg.evaluate("()=>[...document.querySelectorAll('.pvpbox .pvpok, .pvpbox [data-pvacc]')].map(x=>x.textContent)"))
        if os.environ.get('SHOT2'):
            await pg.evaluate("()=>{const x=document.querySelector('.pvpbox [data-pvacc]');if(x)x.scrollIntoView({block:'center'});}");await pg.wait_for_timeout(300);await pg.screenshot(path=os.environ['SHOT2'])
        await pg.evaluate("()=>document.querySelector('.pvpbox [data-pvacc]').click()");await pg.wait_for_timeout(2000)
        print('accelerato:',await pg.evaluate("()=>[(window.__CNA||{}).p_id,document.querySelectorAll('.pvpbox [data-pvacc]').length]"))
        print('ERR',E);await b.close()
asyncio.run(main())
