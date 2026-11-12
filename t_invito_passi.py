import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# INVITO CHE FUNZIONA SUBITO: chi apre il link vede i 3 passi (account, installa, notifiche) con i pulsanti
# "Apri in Chrome" (intent:// su Android) e "Apri in Safari" (x-safari-https:// su iPhone); nell'app installata,
# con l'account e le notifiche mai chieste, compare "Ultimo passo 🔔".
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
WA='Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 WhatsApp/2.24'
async def apri(p,b,dev,ua=None,pre=''):
    o=dict(p.devices[dev])
    if ua:o['user_agent']=ua
    pg=await (await b.new_context(**o)).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
    await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;'+pre)
    await pg.goto('file://'+D+'/app.html?invito=abcd1234');await pg.wait_for_timeout(2500);return pg,errs
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg,e=await apri(p,b,'Pixel 5');E+=e
        print('android:',await pg.evaluate("()=>{const P=document.getElementById('bvpage');if(!P)return 'nessuna pagina';const a=[...P.querySelectorAll('a')].map(x=>x.getAttribute('href'));return [/Crea l’account/.test(P.textContent),/attiva le notifiche/.test(P.textContent),a.some(h=>/^intent:\\/\\/safehousezombie\\.netlify\\.app\\/\\?invito=abcd1234#Intent;scheme=https;package=com\\.android\\.chrome/.test(h)),!P.querySelector('[data-bvchr]').hidden]}"))
        await pg.evaluate("()=>{const ev=new Event('beforeinstallprompt');ev.prompt=()=>{};ev.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(ev)}")
        print('android installa vera:',await pg.evaluate("()=>[!document.querySelector('#bvpage [data-bvinst]').hidden,document.querySelector('#bvpage [data-bvchr]').hidden]"))
        pg,e=await apri(p,b,'iPhone 13',IOS);E+=e
        print('iphone:',await pg.evaluate("()=>{const P=document.getElementById('bvpage');if(!P)return 'nessuna pagina';return [/Apri come app web/.test(P.textContent),[...P.querySelectorAll('a')].some(x=>x.getAttribute('href')==='x-safari-https://safehousezombie.netlify.app/?invito=abcd1234')]}"))
        pg,e=await apri(p,b,'Pixel 5',WA);E+=e
        print('whatsapp:',await pg.evaluate("()=>{const P=document.getElementById('bvpage');if(!P)return 'nessuna pagina';return [/Sei dentro/.test(P.textContent),[...P.querySelectorAll('a.btn')].some(x=>/Apri in Chrome/.test(x.textContent)&&/^intent:/.test(x.getAttribute('href')))]}"))
        # app installata (iPhone, dall'icona) con l'account: ultimo passo notifiche
        pg,e=await apri(p,b,'iPhone 13',IOS,"Object.defineProperty(navigator,'standalone',{get:()=>true});window.PushManager=window.PushManager||function(){};");E+=e
        await pg.evaluate("()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();window.__PE=0;pushEnable=()=>{window.__PE=1};bvNotifCheck()}")
        await pg.wait_for_timeout(400)
        print('ultimo passo:',await pg.evaluate("()=>{const P=document.getElementById('bvnot');return P?[/Ultimo passo/.test(P.textContent),getComputedStyle(P).position]:'nessuno'}"))
        await pg.click('#bvnot [data-bvnon]');await pg.wait_for_timeout(200)
        print('attiva:',await pg.evaluate("()=>[window.__PE,!document.getElementById('bvnot')]"))
        await pg.evaluate("()=>bvNotifCheck()")
        print('non ripete oggi:',await pg.evaluate("()=>!document.getElementById('bvnot')"))
        print('testo invito:',await pg.evaluate("()=>/3 passi/.test(invTxt())&&/Apri in Chrome/.test(invTxt())"))
        print('ERR',E);await b.close()
asyncio.run(main())
