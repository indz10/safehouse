import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🧭 SEZIONI E ⏳ MISSIONI (Fase 54, migrazione 047): 5 tasti (Mappa · Lente · Superstite · Casa · Amici),
# scheda Lente e scheda Superstite con Missioni e Negozio gemme; ⏳ Missioni: righe con tempo, ora di fine,
# 💎 Finisci ora (completa subito col costo del server), Raccogli, Prepara; voce del menu ☰; scudo all'alleato col saldo del server.
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
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(4000)
        print('tasti:',await pg.evaluate("()=>[...document.querySelectorAll('.sbar [data-sb] b')].map(x=>x.textContent)"))
        await pg.click('.sbar [data-sb=gioca]');await pg.wait_for_timeout(800)
        print('gioco:',await pg.evaluate("()=>[!!document.getElementById('gmap'),[...document.querySelectorAll('#gmap .gmside small')].map(x=>x.textContent)]"))
        await pg.evaluate("()=>closeSheet()");await pg.click('.sbar [data-sb=sup]');await pg.wait_for_timeout(800)
        print('superstite:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .sbtile b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbt=mis]').click()");await pg.wait_for_timeout(1500)
        print('missioni:',await pg.evaluate("()=>[document.querySelectorAll('#sheet.open .misrow').length,[...document.querySelectorAll('#sheet.open .misact')].map(x=>x.textContent.trim()),/fine alle/.test(document.querySelector('#sheet.open .mislist').textContent)]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-missub]').click()");await pg.wait_for_timeout(1500)
        print('finisci ora:',await pg.evaluate("()=>window.__SUB&&[window.__SUB.p_tipo,window.__SUB.p_id,window.__SUB.p_costo_visto]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-misgo]').click()");await pg.wait_for_timeout(1500)
        print('raccogli → spedizioni:',await pg.evaluate("()=>(document.querySelector('#sheet.open')||{}).textContent.includes('Spedizion')"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.click('.sbar [data-sb=io]');await pg.wait_for_timeout(2000)
        print('casa:',await pg.evaluate("()=>[S.tab,(document.querySelector('.sbar .on b')||{}).textContent]"))
        print('menu:',await pg.evaluate("()=>zmItems().some(g=>g[1].some(r=>r[2]==='missioni'))"))
        print('badge superstite:',await pg.evaluate("()=>sbBadges().sup>=1"))
        print('ERR',E);await b.close()
asyncio.run(main())
