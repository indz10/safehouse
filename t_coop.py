import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# COOPERAZIONE VISIVA (migrazione 008): nella pagina della casa, "🤝 Insieme contro l'orda" per i coinquilini
# e "🏢 Il nostro palazzo" per il condominio. Deve stampare: persone: ['Tu', '@mamma'] ... dopo Prepara: Tu pronto True ... palazzo: 2 finestre ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "__W.hk={kind:'casa',kind_set:true,req:false,mem:[{user_id:'u7',nick:'mamma',prep:false}]};await wMine(true);closeSheet();await houseSheet(myHouses().find(x=>x.home));}")
        await pg.wait_for_timeout(4000)
        await pg.evaluate("()=>{const c=document.querySelector('#sheet.open .coop');if(c)c.scrollIntoView()}");await pg.wait_for_timeout(300)
        print('persone:',await pg.evaluate("()=>[...document.querySelectorAll('.coop .cp-p b')].map(b=>b.textContent)"),'| barra:',await pg.evaluate("()=>(document.querySelector('.coop .coop-bar b')||{}).textContent"),
              '| pulsanti:',await pg.evaluate("()=>[...document.querySelectorAll('.coop .coop-act button')].map(b=>b.textContent)"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/coop_casa.png')
        await pg.click('.coop [data-cpprep]');await pg.wait_for_timeout(4500)
        print('dopo Prepara: Tu pronto',await pg.evaluate("()=>!!document.querySelector('.coop .cp-p.on')&&/Tu/.test(document.querySelector('.coop .cp-p.on b').textContent)"))
        await pg.evaluate("async()=>{__W.hk={kind:'condominio',unit:'A 1',kind_set:true,req:false,mem:[]};__W.prep=false;closeSheet();await houseSheet(myHouses().find(x=>x.home));}")
        await pg.wait_for_timeout(4000);await pg.evaluate("()=>{const c=document.querySelector('#sheet.open .pal');if(c)c.scrollIntoView({block:'center'})}");await pg.wait_for_timeout(300)
        print('palazzo:',await pg.evaluate("()=>document.querySelectorAll('.pal .pal-fin').length"),'finestre | accese:',await pg.evaluate("()=>document.querySelectorAll('.pal .pal-fin.on').length"),'| titolo:',await pg.evaluate("()=>(document.querySelectorAll('.coop .coop-h span')[0]||{}).textContent"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/coop_palazzo.png')
        print('ERR',errs);await b.close()
asyncio.run(main())
