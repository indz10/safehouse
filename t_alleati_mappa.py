import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🤝 ALLEATI SULLA MAPPA: pulsante "🤝 Alleati" sulla mappa → elenco → 🗺️ le sue case (segnaposto con %),
# barra "Case di @nome", tocco sul segnaposto → scheda; 🗺️ nel riquadro alleati dell'Orda e nella scheda dell'alleato.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="""async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};
 S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;try{await wMine(true);}catch(e){};closeSheet();}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();pg.on('pageerror',lambda e:E.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP)
        await pg.evaluate("()=>{S.zv='mondo';go('mappa')}");await pg.wait_for_timeout(3000)
        print('pulsante mappa:',await pg.evaluate("()=>!!document.querySelector('.mapfull [data-mfally]')"))
        await pg.evaluate("()=>document.querySelector('.mapfull [data-mfally]').click()");await pg.wait_for_timeout(1200)
        print('elenco:',await pg.evaluate("()=>[(document.querySelector('#sheet.open h3')||{}).textContent,document.querySelectorAll('#sheet.open [data-alpm]').length,!!document.querySelector('#sheet.open [data-alpt]')]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-alpm=\"u2\"]').click()");await pg.wait_for_timeout(2500)
        print('case sulla mappa:',await pg.evaluate("()=>[document.querySelectorAll('.lm-ally').length,(document.querySelector('.almapbar')||{}).textContent,!document.querySelector('#sheet.open')]"))
        await pg.evaluate("()=>document.querySelector('.lm-ally').click()");await pg.wait_for_timeout(1500)
        print('scheda dal segnaposto:',await pg.evaluate("()=>[(document.querySelector('#sheet.open h3')||{}).textContent,!!document.querySelector('#sheet.open [data-ahmap]')]"))
        await pg.evaluate("()=>{closeSheet();document.querySelector('.almapbar [data-almx]').click()}");await pg.wait_for_timeout(300)
        print('chiusa:',await pg.evaluate("()=>[document.querySelectorAll('.lm-ally').length,!!document.querySelector('.almapbar')]"))
        await pg.evaluate("()=>alMapShow('tutti')");await pg.wait_for_timeout(2500)
        print('tutti:',await pg.evaluate("()=>[document.querySelectorAll('.lm-ally').length,(document.querySelector('.almapbar')||{}).textContent]"))
        await pg.evaluate("()=>{alMapClear();go('orda')}");await pg.wait_for_timeout(3000)
        print('orda 🗺️:',await pg.evaluate("()=>document.querySelectorAll('.alsorda [data-almap]').length"))
        await pg.evaluate("()=>document.querySelector('.alsorda [data-almap]').click()");await pg.wait_for_timeout(3000)
        print('da orda a mappa:',await pg.evaluate("()=>[S.tab,document.querySelectorAll('.lm-ally').length]"))
        await pg.screenshot(path=D+'/y_alleati_mappa.png')
        print('ERR',E);await b.close()
asyncio.run(main())
