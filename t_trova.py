import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🔎 TROVA SUPERSTITI e ⭐ PREFERITI (migrazione 010): pulsante nella pagina Superstiti; scegli una tua casa →
# superstiti entro 20 km; per nome; ⭐ preferiti anche non alleati; ⭐ nella scheda del giocatore; "‹ Trova superstiti".
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="""async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;
  window.W=window.W||{};W.m=W.m||{};W.m.home={lat:45.40,lon:10.20,building_id:'w1',status:'home'};W.m.houses=[{building_id:'w2',lat:45.50,lon:10.30,level:2}];closeSheet();}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();pg.on('pageerror',lambda e:E.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP)
        await pg.evaluate("()=>{closeSheet();go('social')}");await pg.wait_for_timeout(1200)
        print('pulsante:',await pg.evaluate("()=>!!document.querySelector('#app [data-trova]')"))
        await pg.evaluate("()=>{document.querySelectorAll('#bvpage,#bvnot').forEach(x=>x.remove());closeSheet();document.querySelector('#app [data-trova]').click()}");await pg.wait_for_timeout(900)
        print('case:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-trh]')].map(x=>x.textContent)"))
        print('vicini:',await pg.evaluate("()=>[[...document.querySelectorAll('#sheet.open [data-trp] b')].map(x=>x.textContent),__mkNear]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trh=\"1\"]').click()");await pg.wait_for_timeout(500)
        print('altra casa:',await pg.evaluate("()=>[__mkNear.p_lat,__mkNear.p_km,/entro 20 km da Casa 1/.test(document.querySelector('#sheet.open').textContent)]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trs=\"u9\"]').click()");await pg.wait_for_timeout(500)
        print('stella:',await pg.evaluate("()=>[document.querySelector('#sheet.open [data-trs=\"u9\"]').textContent,Object.keys(__mkFav)]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trt=nome]').click()");await pg.wait_for_timeout(300)
        await pg.fill('#trq','gi');await pg.evaluate("()=>document.querySelector('#sheet.open [data-trq]').click()");await pg.wait_for_timeout(500)
        print('per nome:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-trp] b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trs=\"u8\"]').click()");await pg.wait_for_timeout(400)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trt=fav]').click()");await pg.wait_for_timeout(500)
        print('preferiti:',await pg.evaluate("()=>[document.querySelector('#sheet.open [data-trt=fav]').textContent,[...document.querySelectorAll('#sheet.open [data-trp] b')].map(x=>x.textContent)]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-trp=\"u9\"]').click()");await pg.wait_for_timeout(1500)
        print('scheda:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .shback')||document.querySelector('#sheet.open [data-sback]')||{}).textContent||[...document.querySelectorAll('#sheet.open button')].map(x=>x.textContent).find(t=>/Trova superstiti/.test(t)),(document.querySelector('#sheet.open [data-pfav]')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pfav]').click()");await pg.wait_for_timeout(400)
        print('tolta dalla scheda:',await pg.evaluate("()=>[document.querySelector('#sheet.open [data-pfav]').textContent,Object.keys(__mkFav)]"))
        await pg.screenshot(path=D+'/y_trova2.png')
        b2=[x for x in await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open button')].map(x=>x.textContent)") if 'Trova superstiti' in x]
        if b2:
            await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open button')].find(x=>/Trova superstiti/.test(x.textContent)).click()");await pg.wait_for_timeout(700)
            print('indietro:',await pg.evaluate("()=>[(document.querySelector('#sheet.open h3')||{}).textContent,[...document.querySelectorAll('#sheet.open [data-trp] b')].map(x=>x.textContent)]"))
        await pg.screenshot(path=D+'/y_trova.png')
        print('ERR',E);await b.close()
asyncio.run(main())
