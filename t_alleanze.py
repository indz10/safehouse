import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# ALLEANZE A GRUPPI (migrazione 018): riquadro nei Superstiti (invito ricevuto, alleanze vicine, fonda), scheda con membri e voto,
# chat dell'alleanza, classifica delle alleanze, voce nel menu ☰.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();go('social');}")
        await pg.wait_for_timeout(4000)
        print('riquadro senza alleanza:',await pg.evaluate("()=>{const c=document.querySelector('.alzcard');return c?[!!c.querySelector('[data-alzr]'),!!c.querySelector('[data-alzv]'),!!c.querySelector('[data-alzc]')]:null}"))
        await pg.evaluate("()=>document.querySelector('.alzcard [data-alzv]').click()");await pg.wait_for_timeout(1200)
        print('alleanze vicine:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .alzmem b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-alzj]').click()");await pg.wait_for_timeout(1000)
        await pg.evaluate("()=>{closeSheet();alzCrea()}");await pg.wait_for_timeout(600)
        await pg.fill('#alzN','Lupi di Volta');await pg.evaluate("()=>{document.querySelector('[data-e=\"🐺\"]').click();document.querySelector('[data-alzok]').click()}");await pg.wait_for_timeout(2000)
        print('dopo la fondazione:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .sheet-h, #sheet.open h3')||{}).textContent,document.querySelectorAll('#sheet.open .alzmem').length,document.querySelectorAll('#sheet.open [data-alzvo]').length]"))
        await pg.evaluate("()=>{window.confirm=()=>true;document.querySelector('#sheet.open [data-alzvo][data-si=\"1\"]').click()}");await pg.wait_for_timeout(1500)
        print('voto:',await pg.evaluate("()=>window.__mkAlzVoto||0"))
        await pg.evaluate("async()=>{closeSheet();__mkAlz.br=true;ALZ.t=0;await alzLoad(true);await alzChat(1)}");await pg.wait_for_timeout(1000)
        await pg.fill('#alzT','Stasera tutti pronti');await pg.evaluate("()=>document.querySelector('[data-alzsend]').click()");await pg.wait_for_timeout(1500)
        print('chat:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .dmlist[data-alz] .dmm span')].map(x=>x.textContent)"))
        print('linguette di più alleanze:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-alzt]')].map(b=>b.textContent)"))
        await pg.evaluate("async()=>{closeSheet();go('social');await new Promise(r=>setTimeout(r,300));const c=document.querySelector('.alzcard');if(c)c.remove();await alzCard()}");await pg.wait_for_timeout(1500)
        print('riquadro con 2 alleanze:',await pg.evaluate("()=>[...document.querySelectorAll('.alzcard .alzhead b')].map(x=>x.textContent)"))
        await pg.evaluate("async()=>{closeSheet();SOC.tab='classifica';SOC.rs='alleanze';try{socPaint()}catch(e){};await socLoad('rank',true);socPaint()}");await pg.wait_for_timeout(1500)
        print('classifica alleanze:',await pg.evaluate("()=>[...document.querySelectorAll('.srank .stx b')].map(x=>x.textContent).slice(0,3)"))
        await pg.evaluate("()=>zmOpen()");await pg.wait_for_timeout(600)
        print('menu:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].some(r=>/Le mie alleanze/.test(r.textContent))"))
        print('ERR',E);await b.close()
asyncio.run(main())
