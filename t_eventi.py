import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FASE 23 (migrazione 022): una mossa alla volta (carta ADESSO nel cassetto della Mappa), eventi dal vivo sulla mappa
# (cassa, nido) con scheda e azione, sfida del quartiere, scelta del condominio, notifica ?evt=.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await orLoad(true);await supLoad(true);await evtLoad(true);EVT.HI={building_id:'w1',kind_set:true};EVT.hiT=Date.now()+1e9;await gdLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(5000)
        print('lati:',await pg.evaluate("()=>[...document.querySelectorAll('.mwside small')].map(x=>x.textContent)"))
        print('ADESSO:',await pg.evaluate("()=>{const n=document.querySelector('.mwdrawer .mwnow');return n?[n.querySelector('b').textContent,(n.querySelector('[data-nowgo]')||{}).textContent]:null}"))
        print('segnaposti eventi:',await pg.evaluate("()=>document.querySelectorAll('.lm-evt').length"))
        await pg.evaluate("()=>{const m=[...document.querySelectorAll('.lm-evt')].find(x=>/Rifornimento/.test(x.textContent));m.click()}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-evgo]').click()");await pg.wait_for_timeout(2500)
        print('cassa presa:',await pg.evaluate("()=>[(__EVT[0].mio||{}).posto,(document.querySelector('#sheet.open [data-evgo]')||{}).textContent]"))
        await pg.evaluate("()=>closeSheet()")
        # scheda del nido dal segnaposto
        await pg.evaluate("()=>{const m=[...document.querySelectorAll('.lm-evt')].find(x=>/Nido/.test(x.textContent));m.click()}");await pg.wait_for_timeout(1500)
        print('scheda nido:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .evtcard b')||{}).textContent,(document.querySelector('#sheet.open .evthp b')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-evgo]').click()");await pg.wait_for_timeout(1800)
        print('dopo il colpo:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .evthp b')||{}).textContent,__EVT[1].hp]"))
        # sfida
        await pg.evaluate("()=>{closeSheet();supSheet('sfida')}");await pg.wait_for_timeout(1800)
        print('sfida:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sfme b')||{}).textContent,document.querySelectorAll('#sheet.open .sfrow').length]"))
        # condominio: altri nello stesso edificio, tipo non scelto
        await pg.evaluate("async()=>{closeSheet();__W.hk={kind:'casa',unit:null,kind_set:false};const I=await hiLoad();I.members=[{user_id:'u5',nick:'Anna88',prep:false}];EVT.HI=I;EVT.hiT=Date.now();await gdLoad(true);trrRepaint(true);mwRefresh()}");await pg.wait_for_timeout(1500)
        print('ADESSO condominio:',await pg.evaluate("()=>(document.querySelector('.mwdrawer .mwnow b')||{}).textContent"))
        await pg.evaluate("()=>document.querySelector('.mwdrawer [data-nowgo]').click()");await pg.wait_for_timeout(1200)
        await pg.evaluate("()=>{document.querySelector('#cdUnit').value='B 7';document.querySelector('#sheet.open [data-cdq=condominio]').click()}");await pg.wait_for_timeout(2500)
        print('condominio salvato:',await pg.evaluate("()=>[__W.hk.kind,__W.hk.unit]"))
        # notifica di un evento
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=mappa&evt=12')}");await pg.wait_for_timeout(3500)
        print('dalla notifica:',await pg.evaluate("()=>(document.querySelector('#sheet.open .evtcard b')||{}).textContent"))
        print('ERR',E);await b.close()
asyncio.run(main())
