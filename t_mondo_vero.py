import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🌍 IL MONDO VERO, SPIEGATO (migrazione 027): Gioca diviso per modo di giocare, spiegazione in 3 carte, posti veri nella
# Lente con il vantaggio (di persona gratis entro 50 m / col superstite a pagamento), zombie vicino alla casa di altri
# ("l'hai protetto"), pacco da lontano per un alleato fuori portata, novità nuove nella bacheca, voce del menu.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__ZMPROT=2')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(5000)
        # 🎮 Gioca a sezioni + spiegazione
        await pg.evaluate("()=>document.querySelector('.sbar [data-sb=gioca]').click()");await pg.wait_for_timeout(800)
        print('gioca:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .sbsec')].map(x=>x.textContent)"))
        if os.environ.get('SHOT1'):await pg.screenshot(path=os.environ['SHOT1'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sbt=mv]').click()");await pg.wait_for_timeout(900)
        print('spiegazione:',await pg.evaluate("()=>[(document.querySelector('#sheet.open h2,#sheet.open .sh-t')||{}).textContent,[...document.querySelectorAll('#sheet.open .mvcard b')].map(x=>x.textContent.slice(0,30))]"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'],full_page=False)
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(400)
        print('menu:',await pg.evaluate("()=>zmItems()[0][1].some(x=>x[2]==='mondov')"))
        # 📍 posti veri nella Lente
        await pg.evaluate("()=>lenteOpen()");await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const L=LENTE;L.area={...(L.area||{B:[]}),t:Date.now(),lat:L.pos.lat,lon:L.pos.lon,P:[{id:'n1',ic:'💊',cat:'Farmacia',name:'Farmacia Centrale',lat:L.pos.lat+0.00015,lon:L.pos.lon,srv:true},{id:'n2',ic:'🛒',cat:'Supermercato',name:'Super Uno',lat:L.pos.lat+0.003,lon:L.pos.lon+0.001}]};L.tpos=null;lnRefresh(true);}")
        await pg.wait_for_timeout(1500)
        print('etichette:',await pg.evaluate("()=>LENTE.T.filter(x=>/Farmacia|Super/.test(x.t)).map(x=>x.t)"))
        await pg.evaluate("()=>lnPoiCard(LENTE.area.P[0])");await pg.wait_for_timeout(500)
        print('farmacia vicina:',await pg.evaluate("()=>[(document.querySelector('#lente .mvposto>b')||{}).textContent,!document.querySelector('#lente [data-mvvis]').disabled,(document.querySelector('#lente .mvdue>div:last-child small')||{}).textContent]"))
        if os.environ.get('SHOT3'):await pg.screenshot(path=os.environ['SHOT3'])
        await pg.evaluate("()=>document.querySelector('#lente [data-mvvis]').click()");await pg.wait_for_timeout(800)
        print('presa di persona:',await pg.evaluate("()=>[(window.__MVV||{}).p_kind,!document.querySelector('#lente .lnpan')]"))
        await pg.evaluate("()=>lnPoiCard(LENTE.area.P[1])");await pg.wait_for_timeout(500)
        print('super lontano:',await pg.evaluate("()=>[document.querySelector('#lente [data-mvvis]').disabled,(document.querySelector('#lente .mvdue>div small')||{}).textContent]"))
        # 🛡️ zombie vicino alla casa di altri
        await pg.evaluate("async()=>{await zmLoad(true);const z=ZM.L.find(x=>x.k==='zombie');await zmFight(z);}");await pg.wait_for_timeout(800)
        await pg.evaluate("()=>zmEnd(true)");await pg.wait_for_timeout(900)
        print('protetti:',await pg.evaluate("()=>[...document.querySelectorAll('#lente .zmfight .difres span')].map(x=>x.textContent).filter(t=>/protetto/.test(t))"))
        await pg.evaluate("()=>{const b=document.querySelector('#lente [data-zmok]');if(b)b.click();lenteClose();}");await pg.wait_for_timeout(1500)
        # 📦 pacco da lontano
        await pg.evaluate("()=>{window.__LONT=1;RES.d.carb=100;RES.d.cibo=100;}");await pg.evaluate("()=>alHelp('u2')");await pg.wait_for_timeout(1200)
        print('pacco:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .mvpacco b')||{}).textContent,(document.querySelector('#sheet.open [data-mvpk]')||{}).textContent]"))
        if os.environ.get('SHOT4'):await pg.screenshot(path=os.environ['SHOT4'])
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-mvpk]').click()");await pg.wait_for_timeout(800)
        print('pacco mandato:',await pg.evaluate("()=>[(window.__MVL||{}).p_target,!document.querySelector('#sheet.open .mvpacco')]"))
        # novità nella bacheca
        print('bacheca:',await pg.evaluate("()=>['zm_aiuto','lente','aiuto_lontano'].map(k=>socLine({id:9,kind:k,actor:'u2',actor_nick:'giangy',target:'me',info:k==='zm_aiuto'?'💪 Bruto|56':k==='lente'?'5|1|2':'6627',created_at:new Date().toISOString()}).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim().slice(0,90))"))
        print('ERR',E);await b.close()
asyncio.run(main())
