import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FASE 15: (a) schermata unica — con account e casa valutata l'app apre il Mondo, niente barra in basso, linguette
# Mappa · Orda · Superstiti, grande tasto 📷 Lente, Home dal menu ☰; (b) primo accesso — Home semplice con il
# Capitano Kilo (radio operatore), racconto, guida nella valutazione (👆 Mostrami, 💬 Chiedi), fine → account / mondo.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="""async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};
 S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;try{await wMine(true);await orLoad(true);}catch(e){};closeSheet();}"""
async def nuova(p,b):
    pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:160]))
    await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
    await pg.goto('file://'+D+'/app.html');return pg,E
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # (a) chi gioca già
        pg,E=await nuova(p,b);await pg.wait_for_timeout(800);await pg.evaluate(SETUP);await pg.wait_for_timeout(3000)
        print('avvio al mondo:',await pg.evaluate("()=>[S.tab,document.body.classList.contains('nonav'),getComputedStyle(document.getElementById('nav')).display]"))
        print('linguette:',await pg.evaluate("()=>[...document.querySelectorAll('.mwmodes button')].map(b=>b.textContent.trim())"))
        print('tasto lente:',await pg.evaluate("()=>{const l=document.querySelector('.mwlente');return l?getComputedStyle(l).display:'manca'}"))
        await pg.evaluate("()=>document.querySelector('[data-mwm=social]').click()");await pg.wait_for_timeout(2000)
        print('superstiti con la barra:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.page .mwtop'),!!document.querySelector('[data-trova]')]"))
        await pg.evaluate("()=>zmOpen()");await pg.wait_for_timeout(600)
        print('menu, prime voci:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].slice(0,2).map(r=>r.textContent.replace(/[›\\s]+/g,' ').trim())"))
        await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].find(r=>/Home/.test(r.textContent)).click()");await pg.wait_for_timeout(2500)
        print('home dal menu:',await pg.evaluate("()=>[S.tab,!!document.querySelector('.coach.giro')]"))
        print('ERR a',E)
        # (b) primo accesso
        pg,E=await nuova(p,b);await pg.wait_for_timeout(2000)
        print('home semplice:',await pg.evaluate("()=>[!!document.querySelector('.ophomep .oplogo'),!!document.querySelector('[data-opgo]'),document.body.classList.contains('ophome')]"))
        await pg.evaluate("()=>document.querySelector('[data-opgo]').click()");await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{document.querySelector('[data-opnx]').click();document.querySelector('[data-opnx]').click()}");await pg.wait_for_timeout(200)
        await pg.evaluate("()=>document.querySelector('[data-opval]').click()");await pg.wait_for_timeout(2500)
        print('valutazione col Capitano:',await pg.evaluate("()=>[S.tab,!!document.getElementById('opdock'),!!document.querySelector('#opdock [data-opshow]')]"))
        await pg.evaluate("()=>document.querySelector('#opdock [data-opask]').click()");await pg.wait_for_timeout(500)
        await pg.fill('#opIn','perché servono le foto?');await pg.evaluate("()=>document.querySelector('#sheet.open [data-opq]').click()");await pg.wait_for_timeout(9800)
        print('risposta:',await pg.evaluate("()=>(document.querySelector('#opOut')||{}).textContent.slice(0,50)"))
        await pg.evaluate("async()=>{closeSheet();SB=__mockSB;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);S.step=3;go('valuta')}");await pg.wait_for_timeout(2500)
        print('fine valutazione:',await pg.evaluate("()=>[/indice/.test(document.querySelector('#opdock [data-optx]').textContent),!!document.querySelector('#opdock [data-oplogin]')]"))
        await pg.evaluate("()=>{S.user={id:'me',nick:'ale'};OP.key='';opDock();}");await pg.wait_for_timeout(400)
        await pg.evaluate("()=>document.querySelector('#opdock [data-opend]').click()");await pg.wait_for_timeout(2500)
        print('entra nel mondo:',await pg.evaluate("()=>[S.tab,!document.getElementById('opdock'),OP.on]"))
        print('ERR b',E);await b.close()
asyncio.run(main())
