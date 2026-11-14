import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# TERRITORIO (migrazione 014): scorte 🧱🪵🥫⛽ e case nella barra in basso del Mondo (Mappa e Orda), presenza a casa
# (casa intoccabile / saccheggiabile, "📍 Sono a casa"), scheda degli edifici con ⚔️ Assalta, 🛡️ Difendi, 🪵 assi,
# presidi assaltabili, ⚔️ Saccheggia e carburante nella scheda del giocatore.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':15})
        pg=await ctx.new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "__W.b.w9={owner:'me',lat:45.326,lon:10.659,level:2,paid:300};await wMine(true);closeSheet();await resLoad(true);await orLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3500)
        print('mappa · scorte nel cassetto:',await pg.evaluate("()=>{const s=document.querySelector('.mwdrawer .mwscorte');return s?[s.querySelectorAll('.mwres span').length,!!s.querySelector('[data-trpres]')]:null}"))
        print('mappa · case nel cassetto:',await pg.evaluate("()=>document.querySelectorAll('.mwdrawer .mwchip[data-mwh]').length"))
        await pg.evaluate("()=>document.querySelector('[data-mwm=orda]').click()");await pg.wait_for_timeout(3000)
        print('orda · barra in basso:',await pg.evaluate("()=>{const d=document.getElementById('mwdock');return d?[!!d.querySelector('.mwscorte'),d.querySelectorAll('[data-trh]').length,getComputedStyle(d).position]:null}"))
        await pg.evaluate("()=>document.querySelector('#mwdock [data-trres]').click()");await pg.wait_for_timeout(800)
        print('scorte · a cosa servono:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .trruso').length"))
        # casa incustodita → saccheggiabile → "Sono a casa"
        await pg.evaluate("async()=>{closeSheet();__mkTrr.custodita=false;await orLoad(true);trrRepaint(true);}");await pg.wait_for_timeout(1500)
        print('presenza scaduta:',await pg.evaluate("()=>{const c=document.querySelector('#mwdock [data-trpres]');return c?[c.classList.contains('ko'),c.textContent.trim()]:null}"))
        await pg.evaluate("()=>document.querySelector('#mwdock [data-trpres]').click()");await pg.wait_for_timeout(700)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trpgo]').click()");await pg.wait_for_timeout(3500)
        print('dopo "Sono a casa":',await pg.evaluate("()=>[__mkTrr.custodita,(document.querySelector('#mwdock [data-trpres]')||{}).textContent]"))
        # la mia casa: assi
        await pg.evaluate("async()=>{closeSheet();await houseSheet(myHouses().find(x=>!x.home)||myHouses()[0]);}");await pg.wait_for_timeout(5000)
        print('mia casa · riquadro:',await pg.evaluate("()=>{const p=document.querySelector('#sheet.open .trrpan');return p?[...p.querySelectorAll('[data-trk]')].map(b=>b.dataset.trk):null}"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trk=assi]').click()");await pg.wait_for_timeout(2500)
        print('dopo le assi:',await pg.evaluate("()=>(document.querySelector('#sheet.open .trrnext')||{}).textContent.replace(/\\s+/g,' ')"))
        # casa comprata da un rivale: assalto
        await pg.evaluate("async()=>{closeSheet();window.confirm=()=>true;await wSheetEdificio('x5',45.326,10.66);}");await pg.wait_for_timeout(3500)
        print('casa del rivale · azioni:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .trrpan [data-trk]')].map(b=>b.dataset.trk)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trk=atk]').click()");await pg.wait_for_timeout(2500)
        print('dopo l\'assalto:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .trrnext')||{}).textContent.replace(/\\s+/g,' '),(document.querySelector('#sheet.open .trrwhy')||{}).textContent]"))
        # casa di un alleato: difendi e assi
        await pg.evaluate("async()=>{closeSheet();await wSheetEdificio('al1',45.327,10.661);}");await pg.wait_for_timeout(3500)
        print('casa dell\'alleato · azioni:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .trrpan [data-trk]')].map(b=>b.dataset.trk)"))
        # presidio tenuto da un rivale
        await pg.evaluate("async()=>{closeSheet();PRES.L=[{id:'osm:n1',name:'Parco Vero',kind:'parco',lat:45.3262,lon:10.6589,stato:'altro',difesa:55,guardie:0,record:2}];presSheet('osm:n1');}");await pg.wait_for_timeout(3000)
        print('presidio · assalto:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .trrpan [data-trk]')].map(b=>b.dataset.trk)"))
        # scheda del giocatore: saccheggio e carburante
        await pg.evaluate("async()=>{closeSheet();await playerSheet('u9');}");await pg.wait_for_timeout(3000)
        print('giocatore incustodito:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-trsac]')"))
        await pg.evaluate("async()=>{closeSheet();await playerSheet('u7');}");await pg.wait_for_timeout(3000)
        print('giocatore custodito:',await pg.evaluate("()=>[!document.querySelector('#sheet.open [data-trsac]'),/intoccabile/.test((document.querySelector('#sheet.open .plmz')||{}).textContent||'')]"))
        print('ERR',E);await b.close()
asyncio.run(main())
