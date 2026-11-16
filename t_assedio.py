import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🧟 ASSEDIO A LIVELLI (migrazione 024): 🎮 Gioca apre la strada dei livelli; livello → piazzo difese → ▶️ Via → zombie che
# scendono, torrette che sparano, tocchi; fine con stelle e premi; potenziamenti; carta nella guida.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__ASSZ=4;window.__ASSI=0.4')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3500)
        await pg.evaluate("()=>document.querySelector('.mwside [data-mws=gioca]').click()");await pg.wait_for_timeout(1500)
        print('strada dei livelli:',await pg.evaluate("()=>[document.querySelectorAll('#assedio .assnodo').length,document.querySelectorAll('#assedio .assnodo:not(.chiuso)').length,(document.querySelector('#assedio .assnodo.qui b')||{}).textContent]"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#assedio .assnodo.qui').click()");await pg.wait_for_timeout(600)
        await pg.evaluate("()=>document.querySelector('#assedio [data-assgo]').click()");await pg.wait_for_timeout(1500)
        print('campo:',await pg.evaluate("()=>[document.querySelectorAll('#assedio .asscell').length,ASS.prov,ASS.fase]"))
        # piazzo una torretta e una barricata nella colonna centrale, e torrette ai lati
        await pg.evaluate("()=>{const t=document.querySelector('#assedio [data-assd=torretta]');t.click();[22,20,24].forEach(i=>document.querySelector(`#assedio .asscell[data-c='${i}']`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));}")
        await pg.wait_for_timeout(300)
        print('difese:',await pg.evaluate("()=>[ASS.D.map(d=>d.k+d.col+d.row).join(','),ASS.prov]"))
        await pg.evaluate("()=>document.querySelector('#assedio [data-assvia]').click()");await pg.wait_for_timeout(2500)
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        for i in range(20):
            await pg.evaluate("()=>{document.querySelectorAll('#assedio .assz:not(.morto)').forEach(z=>{for(let k=0;k<3;k++)z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))})}");await pg.wait_for_timeout(400)
            if await pg.evaluate("()=>!!document.querySelector('#assedio .difres')"):break
        print('fine:',await pg.evaluate("()=>[(document.querySelector('#assedio .difres b')||{}).textContent,(window.__ASSF||{}).p_vinto,(window.__ASSF||{}).p_stelle,ASS.uccisi]"))
        if os.environ.get('SHOT3'):await pg.screenshot(path=os.environ['SHOT3'])
        await pg.evaluate("()=>document.querySelector('#assedio [data-assmap]').click()");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.querySelector('#assedio [data-assup]').click()");await pg.wait_for_timeout(1200)
        await pg.evaluate("()=>document.querySelector('#assedio [data-assu=torretta]').click()");await pg.wait_for_timeout(1500)
        print('potenziamento:',await pg.evaluate("()=>__ASS.up.torretta"))
        await pg.evaluate("()=>assClose()");await pg.wait_for_timeout(300)
        await pg.evaluate("async()=>{await gdLoad(true);gdSheet()}");await pg.wait_for_timeout(1800)
        print('nella guida:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .gdcard .gdtx>b')].map(x=>x.textContent).filter(t=>/Assedio/.test(t)).length"))
        print('ERR',E);await b.close()
asyncio.run(main())
