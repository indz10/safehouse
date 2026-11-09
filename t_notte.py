import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(15000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        print('tramonto e alba a Volta Mantovana il 4 novembre (ora italiana):',await pg.evaluate("()=>{const s=zSun(45.3255,10.6582,new Date('2026-11-04T12:00:00Z'));const f=m=>{m=m+60;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.round(m%60)).padStart(2,'0');};return 'alba '+f(s.rise)+' · tramonto '+f(s.set);}"))
        print('notte alle 23:14?',await pg.evaluate("()=>zIsNight(45.3255,10.6582,new Date('2026-11-04T22:14:00Z'))"),'| alle 12:00?',await pg.evaluate("()=>zIsNight(45.3255,10.6582,new Date('2026-11-04T11:00:00Z'))"),'| alle 17:30?',await pg.evaluate("()=>zIsNight(45.3255,10.6582,new Date('2026-11-04T16:30:00Z'))"),'| a luglio alle 21:00?',await pg.evaluate("()=>zIsNight(45.3255,10.6582,new Date('2026-07-04T19:00:00Z'))"))
        # mappa che finisce di caricare in ritardo
        await pg.evaluate("()=>{window.__lateStyle=true;const P=maplibregl.Map.prototype;const o=P.isStyleLoaded;P.isStyleLoaded=function(){return !window.__lateStyle&&(o?o.call(this):true);};setTimeout(()=>{window.__lateStyle=false;},2500);}")
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);await thrLoad(true);go('orda');}")
        await pg.wait_for_timeout(800);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(600);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(7000)
        print('strade colorate disegnate anche con caricamento in ritardo:',await pg.evaluate("()=>!!(FR.lm&&FR.lm.map.getSource&&FR.lm.map.getSource('fr-p'))"),'| zombie:',await pg.evaluate("()=>(FR.zs||[]).length"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
