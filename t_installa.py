import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# INSTALLA L'APP (dopo la Fase 10): su Android Chrome la vera installazione (BV_PROMPT), passi per Samsung/iPhone,
# dentro WhatsApp "apri nel browser"; voce nel menu ☰, in Controlla il mio gioco e nelle Notifiche.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();}"
async def apri(p,b,dev,ua=None):
    o=dict(p.devices[dev]);
    if ua:o['user_agent']=ua
    pg=await (await b.new_context(**o)).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
    await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
    await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP);return pg,errs
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        # Android Chrome con installazione disponibile
        pg,e=await apri(p,b,'Pixel 5');E+=e
        await pg.evaluate("()=>{const ev=new Event('beforeinstallprompt');ev.prompt=()=>{window.__PR=1};ev.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(ev);zmOpen()}");await pg.wait_for_timeout(600)
        print('menu:',await pg.evaluate("()=>/Installa l’app sul telefono/.test(document.getElementById('zmenu').textContent)"))
        await pg.evaluate("()=>document.querySelector('#zmenu [data-zm=inst]').click()");await pg.wait_for_timeout(800)
        print('android chrome:',await pg.evaluate("()=>[(document.querySelector('#sheet.open h3')||{}).textContent,!!document.querySelector('#sheet.open [data-ziinst]')]"))
        await pg.click('#sheet.open [data-ziinst]');await pg.wait_for_timeout(300)
        print('installata:',await pg.evaluate("()=>[window.__PR,(document.querySelector('#sheet.open [data-ziinst]')||{}).textContent]"))
        await pg.evaluate("async()=>{closeSheet();await zStatusSheet()}");await pg.wait_for_timeout(1500)
        print('controlla:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-zsa=inst]')"))
        # Samsung Internet senza installazione automatica
        pg,e=await apri(p,b,'Galaxy S9+','Mozilla/5.0 (Linux; Android 10; SM-G965F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/111.0 Mobile Safari/537.36');E+=e
        await pg.evaluate("()=>zInstallSheet()");await pg.wait_for_timeout(500)
        print('samsung:',await pg.evaluate("()=>/Aggiungi pagina a/.test(document.querySelector('#sheet.open').textContent)"))
        # dentro WhatsApp: niente notifiche, apri nel browser
        pg,e=await apri(p,b,'Pixel 5','Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 WhatsApp/2.24');E+=e
        await pg.evaluate("async()=>{window.pushState=async()=>'nosupport';await pushSheet()}");await pg.wait_for_timeout(500)
        print('whatsapp notifiche:',await pg.evaluate("()=>[/dentro un’altra app/.test(document.querySelector('#sheet.open').textContent),!!document.querySelector('#sheet.open [data-psi]')]"))
        await pg.click('#sheet.open [data-psi]');await pg.wait_for_timeout(500)
        print('whatsapp installa:',await pg.evaluate("()=>[/Apri in Chrome/.test(document.querySelector('#sheet.open').textContent),/Notifiche/.test(document.querySelector('#sheet.open').textContent)]"))
        print('ERR',E);await b.close()
asyncio.run(main())
