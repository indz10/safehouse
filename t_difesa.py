import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🎮 DIFENDI LA CASA (migrazione 023): pulsante 🎮 Gioca sulla mappa, schermata d'inizio, partita (zombie che arrivano,
# tocchi, vite, bomba), fine con premi; 🛒 Bottega con energia, bombe e scudi; carta nella guida; voce del menu.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__DIFDUR=8')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3500)
        print('pulsante gioca:',await pg.evaluate("()=>!!document.querySelector('.mwside [data-mws=gioca]')"))
        await pg.evaluate("()=>document.querySelector('.mwside [data-mws=gioca]').click()");await pg.wait_for_timeout(1500)
        print('inizio:',await pg.evaluate("()=>[(document.querySelector('#difesa .disp')||{}).textContent,(document.querySelector('#difesa [data-difgo]')||{}).textContent.trim(),[...document.querySelectorAll('#difesa .difinfo span')].map(x=>x.textContent)]"))
        await pg.screenshot(path=os.environ.get('SHOT1','/dev/null')) if os.environ.get('SHOT1') else None
        await pg.evaluate("()=>{document.querySelector('#difScudo').checked=true;document.querySelector('#difesa [data-difgo]').click()}");await pg.wait_for_timeout(2500)
        print('partita:',await pg.evaluate("()=>[DIF.on,DIF.vite,document.querySelectorAll('#difesa .difz').length>0]"))
        # colpisco gli zombie per un po'
        for i in range(10):
            await pg.evaluate("()=>{document.querySelectorAll('#difesa .difz:not(.morto)').forEach(z=>{z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));z.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))})}");await pg.wait_for_timeout(300)
        print('abbattuti:',await pg.evaluate("()=>DIF.uccisi>0"))
        if os.environ.get('SHOT2'):await pg.screenshot(path=os.environ['SHOT2'])
        await pg.evaluate("()=>document.querySelector('#difesa [data-difbomb]').click()");await pg.wait_for_timeout(800)
        print('bomba:',await pg.evaluate("()=>[DIF.bombe,__DIFX.bombe]"))
        await pg.wait_for_timeout(5000)
        print('fine:',await pg.evaluate("()=>[!!document.querySelector('#difesa .difres'),(document.querySelector('#difesa .difres b')||{}).textContent,(window.__DIFF||{}).p_uccisi>0]"))
        if os.environ.get('SHOT3'):await pg.screenshot(path=os.environ['SHOT3'])
        await pg.evaluate("()=>document.querySelector('#difesa [data-difout]').click()");await pg.wait_for_timeout(500)
        print('chiuso:',await pg.evaluate("()=>!document.getElementById('difesa')"))
        # bottega
        await pg.evaluate("()=>shopSheet(0)");await pg.wait_for_timeout(2000)
        print('bottega:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .gamebox .mktr b')].map(x=>x.textContent)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-gsh=bomba]').click()");await pg.wait_for_timeout(1500)
        print('bomba comprata:',await pg.evaluate("()=>__DIFX.bombe"))
        # guida e menu
        await pg.evaluate("async()=>{closeSheet();await gdLoad(true);gdSheet()}");await pg.wait_for_timeout(1800)
        print('nella guida:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .gdcard .gdtx>b')].map(x=>x.textContent).filter(t=>/Difendi/.test(t)).length"))
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(600)
        print('menu:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].some(r=>/Gioca/.test(r.textContent))"))
        print('ERR',E);await b.close()
asyncio.run(main())
