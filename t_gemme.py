import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 💎 GEMME (Fase 51, migrazione 042): saldo dal server nella barra delle scorte, negozio con cambio in risorse
# (anteprima e conferma), "completa subito" dei cantieri in gemme, vecchie gemme del telefono solo annotate.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;G.gems=17;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();await resLoad(true);await gemLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(2500)
        print('vecchie annotate:',await pg.evaluate("()=>[(window.__LEG||{}).p_n,G.gems]"))
        print('chip:',await pg.evaluate("()=>(document.querySelector('.mwgem')||{}).textContent"))
        await pg.evaluate("()=>document.querySelector('.mwgem').click()");await pg.wait_for_timeout(1200)
        print('negozio:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .gemsaldo b')||{}).textContent,(document.querySelector('#sheet.open .gemprev')||{}).textContent]"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-ca=\"legno\"]').click()");await pg.wait_for_timeout(200)
        await pg.fill('#sheet.open .cmbq input','10');await pg.wait_for_timeout(200)
        print('anteprima:',await pg.evaluate("()=>document.querySelector('#sheet.open .cmbbox .gemprev').textContent"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-cgo]').click()");await pg.wait_for_timeout(1200)
        print('cambio:',await pg.evaluate("()=>{const a=window.__CMB||{};return [a.p_da,a.p_a,a.p_n,!!a.p_chiave]}"))
        await pg.evaluate("()=>{closeSheet();const f=new Date(Date.now()+60*60000).toISOString();const d=document.createElement('button');d.dataset.pvacc='7';d.dataset.fine=f;d.id='tacc';document.body.appendChild(d);d.click();}");await pg.wait_for_timeout(1500)
        print('completa subito:',await pg.evaluate("()=>{const a=window.__SUB||{};return [a.p_tipo,a.p_id,a.p_costo_visto]}"))
        print('ERR',E);await b.close()
asyncio.run(main())
