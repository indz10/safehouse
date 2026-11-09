import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]));pg.on('console',lambda m:errs.append('C:'+m.text[:200]) if m.type=='error' or 'Error' in m.text else None)
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);await defLoad(true);__W.b['g45.32600_10.65900']={owner:'me',lat:45.3259,lon:10.6585,level:1,paid:200};__W.b['g45.33000_10.66000']={owner:'me',lat:45.3253,lon:10.6585,level:2,paid:200};await wMine(true);await thrLoad(true);S.zone=null;go('orda');}")
        await pg.wait_for_timeout(1500);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{try{closeSheet();renderHub();}catch(e){window.__e1=String(e.stack).slice(0,1500);}}");await pg.wait_for_timeout(5000);x0=await pg.evaluate('()=>(FR.zs||[]).map(z=>z.x).join(",")');await pg.wait_for_timeout(1500);x1=await pg.evaluate('()=>(FR.zs||[]).map(z=>z.x).join(",")');print('zombie in movimento:',x0!=x1)
        print('pagina:',await pg.evaluate("()=>[S.tab,G.view,G.sub,[...document.querySelectorAll('.page > *')].map(e=>e.className).join(' / ')]"));print(await pg.evaluate("()=>({node:!!FR.node,zombies:(FR.zs||[]).length,els:document.querySelectorAll('.frz').length,legend:[...document.querySelectorAll('[data-frz]')].map(b=>b.textContent).join(' '),paths:(FR.paths||[]).length,dests:(FR.dests||[]).length,comp:(typeof frComp==='function'?frComp(3).length:-1)})"))
        print('errore renderHub:',repr(await pg.evaluate('()=>window.__e1||null')));await pg.evaluate("()=>document.querySelector('[data-frz=runner]').click()");await pg.wait_for_timeout(600)
        print('pulsante Corridore:',await pg.evaluate("()=>document.querySelector('#sheet.open .zsh').innerText.replace(/\\n+/g,' | ').slice(0,300)"))
        await pg.evaluate("()=>{closeSheet();const z=FR.zs.find(z=>z.k==='casco');z.el.click();}");await pg.wait_for_timeout(600)
        print('tocco sullo zombie col casco:',await pg.evaluate("()=>document.querySelector('#sheet.open .zsh').innerText.replace(/\\n+/g,' | ').slice(0,200)"))
        await pg.screenshot(path=D+'/y_zs.png')
        print('ERR',[e for e in errs if 'upsert' not in e and 'sw.js' not in e and 'ERR_FAILED' not in e and 'Orda di base' not in e][:5]);await b.close()
asyncio.run(main())
