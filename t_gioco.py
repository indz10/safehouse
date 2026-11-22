import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🎮 GIOCO (Fase 55, migrazione 048): tasto 🎮 Gioco → mappa stile Pokémon con strade (OpenStreetMap finto di t_terr),
# superstite che cammina per le strade verso lo zombie (percorso sul grafo), tocco sullo zombie → scheda dell'incontro,
# tocco sul superstite → missioni; tasti a lato (Lente, Vicini, Missioni…); arena col telefono girato non tagliata; round.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__arnVeloce=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();await supLoad(true);S.zv='mondo';go('mappa');"
                          "const h=myHouses()[0];window.__MIS=[{tipo:'scontro',id:9,ic:'💪',titolo:'Verso Bruto · Lv 3',meta:'',lat:h.lat+0.0012,lon:h.lon+0.0015,inizio:new Date(Date.now()-300e3).toISOString(),fine:new Date(Date.now()+300e3).toISOString(),secondi:300,gemme:1}];}")
        await pg.wait_for_timeout(4000)
        print('tasto:',await pg.evaluate("()=>(document.querySelector('.sbar [data-sb=gioca]')||{}).textContent"))
        await pg.click('.sbar [data-sb=gioca]');await pg.wait_for_timeout(4000)
        print('mappa del gioco:',await pg.evaluate("()=>[!!document.getElementById('gmap'),!!GM.map,GM.map&&GM.map.o.style.layers.map(l=>l.id).filter(i=>/bld|road|water|park/.test(i)).length,[...document.querySelectorAll('#gmap .gmside small')].map(x=>x.textContent)]"))
        # strade della mappa → percorso sulle strade (grafo a croce: casa in basso a sinistra, meta in alto a destra)
        await pg.evaluate("()=>{const h=myHouses()[0];const L=(a,b)=>({properties:{class:'minor'},geometry:{type:'LineString',coordinates:[a,b]}});const o=[h.lon,h.lat],x=[h.lon+0.0015,h.lat],y=[h.lon+0.0015,h.lat+0.0012];GM.map.querySourceFeatures=()=>[L(o,x),L(x,y)];gmGraph();}")
        await pg.wait_for_timeout(500)
        print('superstite in viaggio:',await pg.evaluate("()=>{const s=gmSup();return[!s.fermo,s.R.length>=3,/Verso/.test(s.txt),Math.round(s.f*100)]}"))

        # tocco su uno zombie → scheda dell'incontro
        await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='re'&&!z.preso);const p=gmXY(z.lat,z.lon);const q=gmScr(p[0],p[1]);gmTap(q[0],q[1]);}");await pg.wait_for_timeout(1200)
        print('tocco sullo zombie:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-arnd]')"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const s=gmSup();const p=gmScr(s.x,s.y);gmTap(p[0],p[1]-12);}");await pg.wait_for_timeout(1500)
        print('tocco sul superstite:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .mislist, #sheet.open .misrow')"))
        # 🧭 guidi il superstite: tocco sulla mappa → cammina (posizione al server), vicino allo zombie → combatti col superstite
        print('superstite guidato:',await pg.evaluate("()=>!!GM.av"))
        # 🔗 il Mondo nel Gioco: presidi e case degli alleati sulla mappa, tocco → loro scheda
        await pg.evaluate("()=>{window.__PRES=[];GM.mdAt=null;return gmMondoLoad()}");await pg.wait_for_timeout(500)
        print('mondo nel gioco:',await pg.evaluate("()=>[(GM.pres||[]).length>0,(GM.ally||[]).length>0]"))
        await pg.evaluate("()=>{const p=gmMondoPts().find(p=>p.k==='pres');gmTap(p.x,p.y-12,null);}");await pg.wait_for_timeout(800)
        print('tocco sul presidio:',await pg.evaluate("()=>document.querySelector('#sheet.open')!==null"))
        await pg.evaluate("()=>closeSheet()")
        await pg.evaluate("()=>{closeSheet();const z=ZM.L.find(z=>z.tipo==='bruto'&&!z.preso);gmTap(-999,-999,{lat:z.lat-0.0002,lng:z.lon});}");await pg.wait_for_timeout(4500)
        print('cammina verso lo zombie:',await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='bruto');return [Math.round(trM(GM.av.lat,GM.av.lon,z.lat,z.lon))<=50,(window.__EXPN||0)>=2]}"))
        # 🚗 spostamento automatico: scheda dello zombie → "Vai lì per le strade" → il superstite in auto ci va da solo → arena
        await pg.evaluate("()=>{MZU='auto';const z=ZM.L.find(z=>z.k==='zombie'&&z.tipo!=='bruto'&&!z.preso);window.__zA=z;GM.av.lat=z.lat-0.0012;GM.av.lon=z.lon;GM.av.P=null;arnCard(z);}");await pg.wait_for_timeout(1200)
        print('vai automatico:',await pg.evaluate("()=>[!!document.querySelector('#sheet.open [data-arnauto]'),(document.querySelector('#sheet.open [data-arnauto]')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arnauto]').click()");await pg.wait_for_timeout(1500)
        print('in viaggio in auto:',await pg.evaluate("()=>[!!GM.av.P,gmMz(),gmVel()]"))
        await pg.wait_for_timeout(9000)
        print('arrivato e combatte:',await pg.evaluate("()=>[!GM.av.P,window.__ARNP&&window.__ARNP.p_modo,!!document.getElementById('arena')]"))
        await pg.evaluate("()=>{try{arnChiudi();}catch(e){}MZU=null;}");await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='bruto');GM.av.lat=z.lat-0.0002;GM.av.lon=z.lon;}")
        await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='bruto');arnCard(z);}");await pg.wait_for_timeout(1200)
        print('combatti col superstite:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-arne]')"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arne]').click()");await pg.wait_for_timeout(1500)
        print('arena esplora:',await pg.evaluate("()=>[window.__ARNP&&window.__ARNP.p_modo,!!document.getElementById('arena')]"))
        await pg.evaluate("()=>{try{arnChiudi()}catch(e){}}")
        await pg.evaluate("()=>{closeSheet();gmClose();zmRadarSheet();}");await pg.wait_for_timeout(600)
        print('elenco toccabile:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .zmrow.zmtap').length>0"))
        await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .zmrow.zmtap')].find(r=>!/Cassa/.test(r.textContent)).click()");await pg.wait_for_timeout(1200)
        print('riga → incontro:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .arncard')"))
        await pg.evaluate("()=>closeSheet()");await pg.click('.sbar [data-sb=gioca]');await pg.wait_for_timeout(1500);await pg.click('.sbar [data-sb=mondo]');await pg.wait_for_timeout(800)
        print('chiusa con Mappa:',await pg.evaluate("()=>!document.getElementById('gmap')"))
        # arena: col telefono girato la scena riempie il campo (non solo il cielo)
        await pg.evaluate("()=>{window.__ARN={sc:{zA:{id:5,zid:'zA',stato:'pronto',modo:'persona',diff:'equilibrato',arrivo:new Date().toISOString()}},id:5};arnVai(5,'💪');}");await pg.wait_for_timeout(1500)
        await pg.set_viewport_size({'width':844,'height':390});await pg.wait_for_timeout(600)
        print('arena girata:',await pg.evaluate("()=>{const f=document.querySelector('.arnfield').getBoundingClientRect(),c=ARN.g.cv.getBoundingClientRect();return[Math.round(f.height),Math.round(c.height),ARN.g.round]}"))
        await pg.evaluate("()=>{ARN.g.z.hp=1;ARN.g.p.x=ARN.g.z.x-10;ARN.g.z.act=null;ARN.g.z.blk=0;ARN.g.z.stun=1;ARN.g.p.act=null;ARN.g.p.stun=0;}");await pg.keyboard.press('j');await pg.wait_for_timeout(1500)
        print('round 2:',await pg.evaluate("()=>[ARN.g.round,ARN.g.vinti.p,(document.querySelector('[data-arnrd=p]')||{}).textContent,ARN.g.z.hp===ARN.g.z.hp0]"))
        print('ERR',E);await b.close()
asyncio.run(main())
