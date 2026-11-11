import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# INVITI E MENU (dopo la Fase 10): versione e "Controlla il mio gioco" restano nel menu anche quando si ridisegna;
# chi non risulta invitato (link perso installando l'app) si collega a mano a chi l'ha invitato.
# Deve stampare: versione: True True | ... collegato: {'invitato_da': 'u7'} ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();zmOpen()}");await pg.wait_for_timeout(600)
        v="()=>[/versione \\d\\d\\/\\d\\d/.test(document.querySelector('#zmenu .zmver').textContent),!!document.querySelector('#zmenu [data-zstat]'),/🪙/.test(document.getElementById('zmenu').textContent)]"
        print('versione:',await pg.evaluate(v),end=' | ');await pg.evaluate("()=>zmRefresh()");await pg.wait_for_timeout(200);print('dopo ridisegno:',await pg.evaluate(v))
        await pg.click('#zmenu [data-zstat]');await pg.wait_for_timeout(1500)
        print('controlla:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .zst b')].map(b=>b.textContent).filter(t=>/invit/i.test(t))"),'| pulsante:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-zsa=inv]')"))
        await pg.click('#sheet.open [data-zsa=inv]');await pg.wait_for_timeout(500)
        await pg.fill('#invq','gi');await pg.click('[data-invq]');await pg.wait_for_timeout(500)
        print('box:',await pg.evaluate("()=>document.querySelector('.invres').innerHTML.slice(0,200)"))
        print('trovati:',await pg.evaluate("()=>[...document.querySelectorAll('[data-invp]')].map(b=>b.textContent.trim().split(' ')[0])"),'| indietro:',await pg.evaluate("()=>/Controlla/.test(document.querySelector('#sheet.open').textContent)"))
        await pg.click('[data-invp="0"]');await pg.wait_for_timeout(500)
        print('collegato:',await pg.evaluate("()=>window.__UPD"))
        # chi è già collegato non vede il pulsante
        await pg.evaluate("()=>{window.__INVDA='u7';closeSheet();inviteSheet()}");await pg.wait_for_timeout(1900)
        print('invita (già collegato):',await pg.evaluate("()=>!!document.querySelector('[data-invme]')"))
        await pg.evaluate("()=>{window.__INVDA=null;closeSheet();inviteSheet()}");await pg.wait_for_timeout(1900)
        print('invita (non collegato):',await pg.evaluate("()=>!!document.querySelector('[data-invme]')"))
        print('ERR',errs);await b.close()
asyncio.run(main())
