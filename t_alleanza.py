import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);go('home');}")
        await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{closeSheet();inviteSheet();}");await pg.wait_for_timeout(1200)
        print('padrino dentro la finestra:',await pg.evaluate("()=>!!document.querySelector('#sheet .sheet-b .eqpad')"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(1200);await pg.evaluate("()=>go('mappa')");await pg.wait_for_timeout(800);await pg.evaluate("()=>go('home')");await pg.wait_for_timeout(600)
        print('dopo chiusura e navigazione, avanzi a schermo:',await pg.evaluate("()=>[...document.querySelectorAll('.eqpad')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&getComputedStyle(document.getElementById('sheet')).visibility!=='hidden'&&!(e.closest('.sheet-card')&&!document.getElementById('sheet').classList.contains('open'))}).length"),'| figli del contenitore:',await pg.evaluate("()=>[...document.getElementById('sheet').children].map(c=>c.className)"))
        # simulo un vecchio avanzo nel contenitore e verifico la pulizia
        await pg.evaluate("()=>document.getElementById('sheet').insertAdjacentHTML('beforeend','<p class=eqpad>avanzo</p>')");await pg.wait_for_timeout(1800)
        print('avanzo vecchio ripulito:',await pg.evaluate("()=>!document.querySelector('#sheet > .eqpad')"))
        # scheda giocatore con proposta in attesa
        await pg.evaluate("async()=>{await playerSheet('u2');const c=document.querySelector('#sheet.open .sheet-b');if(c&&!c.querySelector('.alwait')){c.insertAdjacentHTML('beforeend','<span class=muted>Proposta inviata: aspetta che accetti</span>');}}")
        await pg.evaluate("async()=>{const o=playerSheet;}");await pg.wait_for_timeout(300)
        await pg.evaluate("async()=>{const _w=socRpc;window.socRpc=async(n,a)=>{const r=await _w(n,a);if(n==='world_player'&&r)r.ally='out';return r;};await playerSheet('u2');}");await pg.wait_for_timeout(700)
        print('proposta in attesa:',await pg.evaluate("()=>{const a=document.querySelector('#sheet.open .alwait');return a&&a.textContent.replace(/\\s+/g,' ').trim().slice(0,80)}"))
        await pg.evaluate("()=>{closeSheet();SOC.tab='squadra';go('social');}");await pg.wait_for_timeout(1800);await pg.evaluate("()=>closeSheet()")
        print('aggiungi alla squadra:',await pg.evaluate("()=>{const a=document.querySelector('.afpan');return a&&a.querySelector('.afbox').textContent.replace(/\\s+/g,' ').trim().slice(0,100)}"))
        await pg.fill('#afQ','gi');await pg.wait_for_timeout(900)
        print('ricerca "gi":',await pg.evaluate("()=>[...document.querySelectorAll('.afr')].map(r=>r.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.evaluate("()=>document.querySelector('[data-afa]').click()");await pg.wait_for_timeout(600)
        print('dopo "Proponi":',await pg.evaluate("()=>[...document.querySelectorAll('.afr')].map(r=>r.textContent.replace(/\\s+/g,' ').trim().slice(-16))"))
        await pg.screenshot(path='y_af.png')
        await pg.evaluate("()=>{SOC.tab='rivali';renderSocial();}");await pg.wait_for_timeout(1500)
        print('rivali con alleanza:',await pg.evaluate("()=>document.querySelectorAll('[data-rally]').length"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
