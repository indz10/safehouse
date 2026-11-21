import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🧑 IL SUPERSTITE (Fase 52, migrazione 043): creazione (nome e aspetto) la prima volta, pannello con grado, XP,
# statistiche e sviluppi a tempo (avvia, tempo residuo, 💎 completa subito), avviso per il poco cibo.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__supCrea=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();await resLoad(true);await gemLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(8000)
        print('creazione:',await pg.evaluate("()=>(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent"))
        await pg.evaluate("()=>{const c=document.querySelector('#sheet.open');c.querySelector('.svnome').value='Ombra';c.querySelectorAll('.svpick[data-k=\"v\"] button')[3].click();c.querySelectorAll('.svpick[data-k=\"a\"] button')[4].click();c.querySelector('[data-svok]').click();}");await pg.wait_for_timeout(1500)
        print('creato:',await pg.evaluate("()=>[(window.__SV||{}).nome,JSON.stringify((window.__SV||{}).avatar),!document.querySelector('#sheet.open')]"))
        await pg.evaluate("()=>{RES.d.cibo=4;supSheet('io');}");await pg.wait_for_timeout(2500)
        print('pannello:',await pg.evaluate("()=>{const p=document.querySelector('#sheet.open .svpanel');return p?[p.querySelector('.svtop b').textContent,p.querySelectorAll('.svst>div').length,p.querySelectorAll('[data-svgo]').length,!!p.querySelector('.svcibo'),!!p.querySelector('.svmanca')]:null}"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-svgo=\"forza\"]').click()");await pg.wait_for_timeout(1800)
        print('in corso:',await pg.evaluate("()=>{const b=document.querySelector('#sheet.open [data-svsub]');return b?[b.textContent,!!document.querySelector('#sheet.open [data-svt]')]:null}"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-svsub]').click()");await pg.wait_for_timeout(1500)
        print('completa subito:',await pg.evaluate("()=>{const a=window.__SUB||{};return [a.p_tipo,a.p_id]}"))
        print('ERR',E);await b.close()
asyncio.run(main())
