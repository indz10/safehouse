import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);go('orda');}")
        await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(2500)
        print('scheda Orda:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden).map(e=>(e.className||e.tagName).toString().replace('panel ','').slice(0,12)).join(' | ')"))
        print('niente Difendi tu:',await pg.evaluate("()=>!document.querySelector('#fight')||!document.querySelector('#fight').offsetParent"))
        print('missioni:',await pg.evaluate("()=>G.tm.list.map(m=>m.ic+' '+m.t+' ['+m.k+']')"))
        c0=await pg.evaluate("()=>G.coins")
        ks=await pg.evaluate("()=>G.tm.list.map(m=>m.k)")
        if 'prep' in ks:
            await pg.evaluate("async()=>{await SB.rpc('world_prepare')}");await pg.wait_for_timeout(2200)
        if 'watch' in ks:
            await pg.evaluate("()=>assalto('last')");await pg.wait_for_timeout(1200);await pg.evaluate("()=>{const f=document.getElementById('fumetto');if(f)f.remove();}");await pg.wait_for_timeout(1500)
        if 'claim' in ks:
            await pg.evaluate("async()=>{await SB.rpc('world_raid_claim')}");await pg.wait_for_timeout(2200)
        if 'help' in ks:
            await pg.evaluate("async()=>{await SB.rpc('world_shout',{p_to:'u2',p_code:1})}");await pg.wait_for_timeout(2200)
        if 'gold' in ks:
            await pg.evaluate("()=>{FR.gold=false;Object.keys(localStorage).filter(k=>k.startsWith('zsh_gold_')).forEach(k=>localStorage.removeItem(k));frZSheet('oro');closeSheet();}");await pg.wait_for_timeout(2200)
        print('dopo le azioni:',await pg.evaluate("()=>G.tm.list.map(m=>m.k+':'+(m.cl?'fatta':'da fare'))"),'| monete',c0,'→',await pg.evaluate("()=>G.coins"))
        await pg.evaluate("()=>{go('orda');}");await pg.wait_for_timeout(1500)
        print('menu Gioco:',await pg.evaluate("()=>zmItems().find(x=>x[0]==='Gioco')[1].map(r=>r[1])"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
