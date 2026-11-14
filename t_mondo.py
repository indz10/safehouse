import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🌍 MONDO (Fase 13a): barra in basso Home · Mondo · Superstiti; Mappa e Orda con la barra dell'orda e le linguette;
# pulsanti tondi; cassetto chiuso (case con %, Riscatta, alleati) e aperto (orda, alleati, fortuna, missioni); Prepara.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="""async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};
 S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;try{await wMine(true);await orLoad(true);await thrLoad(true);}catch(e){};closeSheet();}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();pg.on('pageerror',lambda e:E.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP)
        await pg.evaluate("()=>{closeSheet();go('home')}");await pg.wait_for_timeout(800)
        print('barra:',await pg.evaluate("()=>[...document.querySelectorAll('#nav button')].map(b=>b.textContent)"))
        await pg.evaluate("()=>document.querySelector('#nav [data-tab=mappa]').click()");await pg.wait_for_timeout(3500)
        print('mondo:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.mapfull .mwtop .mwbar'),[...document.querySelectorAll('.mwmodes button')].map(b=>b.textContent.trim()+(b.classList.contains('on')?'*':'')),document.querySelectorAll('.mwside button').length,(document.querySelector('.mwbar .mwpc')||{}).textContent]"))
        print('cassetto chiuso:',await pg.evaluate("()=>[...document.querySelectorAll('.mwdrawer .mwchip')].map(c=>c.textContent.trim())"))
        await pg.evaluate("()=>document.querySelector('.mwdrawer [data-mwg]').click()");await pg.wait_for_timeout(1200)
        print('cassetto aperto:',await pg.evaluate("()=>{const d=document.querySelector('.mwdrawer');return [d.classList.contains('open'),!!d.querySelector('.opan'),!!d.querySelector('.alsorda'),!!d.querySelector('.lpan')]}"))
        await pg.evaluate("()=>document.querySelector('[data-mwprep]').click()");await pg.wait_for_timeout(1500)
        print('prepara:',await pg.evaluate("()=>[!!OR.s.prepared,document.querySelector('[data-mwprep]').disabled]"))
        await pg.evaluate("()=>document.querySelector('.mwside [data-mws=ally]').click()");await pg.wait_for_timeout(1200)
        print('alleati:',await pg.evaluate("()=>(document.querySelector('#sheet.open h3')||{}).textContent"))
        await pg.evaluate("()=>{closeSheet();document.querySelector('[data-mwm=orda]').click()}");await pg.wait_for_timeout(3500)
        print('modalità orda:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.page .mwtop'),!!document.querySelector('.fronte'),(document.querySelector('#nav button.on')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('[data-mwm=mappa]').click()");await pg.wait_for_timeout(2500)
        print('di nuovo mappa:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.mapfull .mwtop')]"))
        print('ERR',E);await b.close()
asyncio.run(main())
