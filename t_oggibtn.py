import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;G.spins=5;G.scratch=5;await wMine(true);go('orda');}")
        await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();G.ss='oggi';renderHub();}");await pg.wait_for_timeout(1500)
        print('pagina:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden&&e.offsetParent).map(e=>(e.className||e.tagName).toString().slice(0,30)).join(' | ')"))
        for sel in ["[data-lt=daily]","[data-lt=wheel]","[data-lt=scratch]","[data-lt=jar]",".tmp button",".tmp [data-tmgo]"]:
            ok=await pg.evaluate(f"()=>!!document.querySelector('{sel}')")
            if not ok: print(sel,'non c’è');continue
            y0=await pg.evaluate("()=>scrollY")
            await pg.evaluate(f"()=>{{closeSheet();document.querySelector('{sel}').click()}}");await pg.wait_for_timeout(1200)
            r=await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return s?'apre: '+s.textContent.replace(/\\s+/g,' ').slice(0,40):'nessuna finestra'}")
            print(sel,'→',r,'| scorre:',y0,'→',await pg.evaluate("()=>scrollY"),'| tab',await pg.evaluate("()=>S.tab+'/'+(G.view||'')"))
            await pg.evaluate("()=>{closeSheet();if(S.tab!=='orda'||G.view!=='hub'){go('orda');}}");await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{closeSheet();G.ss='oggi';renderHub();}");await pg.wait_for_timeout(900)
        info=await pg.evaluate("()=>G.tm.list.map((m,i)=>i+':'+m.go+':'+(m.cl?'cl':m.done?'done':'vai'))")
        print('missioni:',info)
        for i,m in enumerate(info):
            if m.endswith('vai'):
                await pg.evaluate(f"()=>{{G.ss='oggi';renderHub();}}");await pg.wait_for_timeout(700)
                await pg.evaluate(f"()=>document.querySelector('[data-tmg=\"{i}\"]').click()");await pg.wait_for_timeout(1200)
                print('  Vai',m,'→ sezione',await pg.evaluate("()=>G.ss"),'| finestra',await pg.evaluate("()=>{const s=document.querySelector('#sheet.open');return s?s.textContent.replace(/\\s+/g,' ').slice(0,30):'no'}"))
                await pg.evaluate("()=>closeSheet()")
        await pg.evaluate("()=>{closeSheet();G.ss='difendi';renderHub();}");await pg.wait_for_timeout(900)
        print('difendi tu:',await pg.evaluate("()=>{const d=[...document.querySelectorAll('details.fold')].find(x=>!x.closest('[hidden]')&&x.offsetParent&&/Missioni delle notti/.test(x.textContent));return d?d.querySelector('summary').textContent.trim()+' | '+[...d.querySelectorAll('.mis span')].map(s=>s.textContent).join(', '):'manca'}"))
        await pg.evaluate("()=>{G.ss='oggi';renderHub();}");await pg.wait_for_timeout(900)
        print('oggi, doppioni visibili:',await pg.evaluate("()=>[...document.querySelectorAll('details.fold, .luck, h3')].filter(e=>e.offsetParent&&/Premi e missioni|Fortuna|Ruota del superstite/.test(e.textContent)).length"))
        print('pulsanti +💎 disattivati in Oggi:',await pg.evaluate("()=>[...document.querySelectorAll('button')].filter(b=>/\\+\\d+/.test(b.textContent)&&b.disabled&&b.offsetParent).length"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
