import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FASE 14 — PULIZIA: "📅 Il giro di oggi" (4 caselle: Prepara, Aiuto, Riscatta, Premi) al posto del "prossimo passo"
# per chi ha l'account e la casa valutata; "🎁 Premi di oggi" in un riquadro solo → premiSheet con i 4 premi.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="""async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};
 S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;try{await wMine(true);await orLoad(true);}catch(e){};closeSheet();}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();pg.on('pageerror',lambda e:E.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP)
        await pg.evaluate("()=>{closeSheet();MW.userNav=1;go('home')}");await pg.wait_for_timeout(1500)  # Home come dal menu ☰ (Fase 15a)
        print('giro:',await pg.evaluate("()=>{const c=document.querySelector('.coach.giro');return c?[c.querySelectorAll('.girs').length,c.querySelector('.cohd').textContent.replace(/\\s+/g,' ')]:'manca'}"))
        await pg.evaluate("()=>document.querySelector('.coach.giro [data-gir=prep]').click()");await pg.wait_for_timeout(1500)
        print('casella prepara → orda:',await pg.evaluate("()=>S.tab"))
        await pg.evaluate("async()=>{await SB.rpc('world_prepare');await orLoad(true);closeSheet();go('home')}");await pg.wait_for_timeout(1500)
        print('dopo prepara:',await pg.evaluate("()=>[document.querySelector('.coach.giro [data-gir=prep]').classList.contains('ok'),document.querySelector('.coach.giro .cohd small').textContent]"))
        await pg.evaluate("()=>{go('orda')}");await pg.wait_for_timeout(2500)
        print('premi in un riquadro:',await pg.evaluate("()=>[document.querySelectorAll('.lpan [data-lt]').length,(document.querySelector('.lpan [data-lt=all]')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('.lpan [data-lt=all]').click()");await pg.wait_for_timeout(800)
        print('finestra premi:',await pg.evaluate("()=>[(document.querySelector('#sheet.open h3')||{}).textContent,[...document.querySelectorAll('#sheet.open [data-lt]')].map(b=>b.dataset.lt)]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-lt=daily]').click()");await pg.wait_for_timeout(800)
        print('premio del giorno con indietro:',await pg.evaluate("()=>[!!document.querySelector('#sheet.open'),/Premi di oggi/.test((document.querySelector('#sheet.open .sback')||{}).textContent||'')]"))
        await pg.evaluate("()=>{closeSheet();S.user=null;go('home')}");await pg.wait_for_timeout(1200)
        print('ospite (vecchio prossimo passo):',await pg.evaluate("()=>{const c=document.querySelector('.coach');return c?[c.classList.contains('giro'),c.textContent.replace(/\\s+/g,' ').slice(0,40)]:'manca'}"))
        print('ERR',E);await b.close()
asyncio.run(main())
