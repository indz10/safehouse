import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🎬 CONTENT CREATOR e 🔔 NOTIFICHE ALL'AZIONE (Fase 47): scheda Creator dal menu, Modalità video che sfoca i nomi,
# ?req=1 → Richieste, ?alz=1 → alleanze; fumetto con la pioggia non più trasparente; Home senza scritta coperta.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();MW.userNav=1;go('home');}")
        await pg.wait_for_timeout(1500)
        print('home scritta:',await pg.evaluate("()=>{const p=document.querySelector('.hstitle p');return [!!document.querySelector('.hscene .coach.giro'),p?getComputedStyle(p).display:'-']}"))
        print('menu:',await pg.evaluate("()=>zmItems().some(g=>g[1].some(r=>r[2]==='creator'))"))
        await pg.evaluate("()=>creatorSheet()");await pg.wait_for_timeout(1200)
        print('creator:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent,document.querySelectorAll('#sheet.open .crtidea').length,!!document.querySelector('#sheet.open [data-crtvid]')]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-crtvid]').click()");await pg.wait_for_timeout(900)
        await pg.evaluate("()=>{const s=document.createElement('span');s.className='nicklink';s.textContent='@mario';s.id='tnick';document.body.appendChild(s);}")
        print('video:',await pg.evaluate("()=>[document.body.classList.contains('vidmode'),!!document.querySelector('.vidrec'),getComputedStyle(document.getElementById('tnick')).filter,localStorage.getItem('zsh_vid')]"))
        await pg.evaluate("()=>document.querySelector('.vidrec').click()");await pg.wait_for_timeout(300)
        print('video spenta:',await pg.evaluate("()=>[document.body.classList.contains('vidmode'),!!document.querySelector('.vidrec')]"))
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=social&req=1');}");await pg.wait_for_timeout(2800)
        print('notifica richieste:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent,(document.querySelector('#sheet.open .on,#sheet.open .act,#sheet.open [aria-selected=true]')||{}).textContent]"))
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=social&alz=1');}");await pg.wait_for_timeout(2800)
        print('notifica alleanze:',await pg.evaluate("()=>(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent"))
        await pg.evaluate("()=>{closeSheet();fumetto({label:'Casa tua'},{held:false},{time:'00:04'},()=>{});document.getElementById('fumetto').classList.add('fx-pioggia');}");await pg.wait_for_timeout(500)
        print('fumetto sfondo:',await pg.evaluate("()=>getComputedStyle(document.getElementById('fumetto')).backgroundColor"))
        print('ERR',E);await b.close()
asyncio.run(main())
