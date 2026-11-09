import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');go('orda');}")
        await pg.wait_for_timeout(300);await pg.click('[data-type=vera]');await pg.wait_for_timeout(1200);await pg.evaluate("()=>{closeSheet();G.howSeen=1;}")
        await pg.evaluate("async()=>{await wMine(true);G.ss='impero';renderHub();}");await pg.wait_for_timeout(800)
        print('casa bid',await pg.evaluate("()=>S.zone.real.house&&S.zone.real.house.bid"))
        print('pannello',await pg.evaluate("()=>{const p=document.querySelector('.wpan');return p&&p.textContent.replace(/\\s+/g,' ').slice(0,160)}"))
        el=await pg.query_selector('.wpan');
        pass
        # un altro giocatore possiede un edificio del quartiere, uno è abitato
        r=await pg.evaluate("""async()=>{const LB=HQ.map.lotsB;const ids=Object.keys(LB);__W.b[LB[ids[1]].bid]={owner:'mario',lat:LB[ids[1]].lat,lon:LB[ids[1]].lon,level:2,paid:300};__W.homes[LB[ids[2]].bid]='x';__W.b[LB[ids[2]].bid]={owner:null,lat:LB[ids[2]].lat,lon:LB[ids[2]].lon,level:1,paid:0};
           HQW.t=0;await wHood();await new Promise(r=>setTimeout(r,300));const L1=LOTS.find(l=>l.id===ids[1]),L2=LOTS.find(l=>l.id===ids[2]);
           return{lotti:ids.length,altri_nascosti:[L1.x,L2.x],pin:document.querySelectorAll('[data-wst]').length};}""")
        print('quartiere',r)
        # compro un edificio libero dal quartiere del gioco
        lid=await pg.evaluate("()=>{const LB=HQ.map.lotsB;return Object.keys(LB).find(id=>!G.lots[id]&&!HQW.blocked.has(LB[id].bid))}")
        await pg.evaluate(f"()=>lotSheet('{lid}')");await pg.wait_for_timeout(500)
        print('scheda',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,120)"))
        await pg.screenshot(path='y_wsheet.png')
        await pg.click('[data-wbuy]');await pg.wait_for_timeout(1200)
        print('dopo acquisto: lotto mio nel gioco',await pg.evaluate(f"()=>JSON.stringify(G.lots['{lid}'])"),'mattoni',await pg.evaluate("()=>__W.wallet.mattoni"))
        # arriva l'abitante vero della casa comprata: passa a lui
        await pg.evaluate(f"async()=>{{const bid=HQ.map.lotsB['{lid}'].bid;__W.homes[bid]='y';__W.b[bid].owner=null;HQW.t=0;await wHood();}}");await pg.wait_for_timeout(400)
        print('dopo arrivo abitante: lotto',await pg.evaluate(f"()=>JSON.stringify(G.lots['{lid}']||null)"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
