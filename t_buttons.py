import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,sys
from playwright.async_api import async_playwright
import t_terr
SKIP="logout|del|elimina|Elimina|Esci|atk|Manda un|pzsend|data-io=\"login\"|Arrenditi|aQuit|Trasloco|moving|hv=\"pos\"|hv=\"foto\"|hv=\"risposte\"|hv=\"tutto\""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(6000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:150]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;SPONSORS.ferr={name:'Ferramenta Rossi',logo:'FR'};SP_GEO.ferr={lat:45.3262,lon:10.6590,id:'s1'};go('orda');}")
        await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
        plan=[('home',None),('mappa',None),('orda','oggi'),('orda','impero'),('orda','difendi'),('social','piazza'),('social','bacheca'),('social','squadra'),('social','classifiche'),('io',None)]
        tot=0;bad=[]
        for tab,sub in plan:
            setup=f"()=>{{closeSheet();{'G.ss='+repr(sub)+';' if tab=='orda' else ''}{'SOC.tab='+repr(sub)+';' if tab=='social' else ''}go('{tab}');}}"
            await pg.evaluate(setup);await pg.wait_for_timeout(1200);await pg.evaluate("()=>closeSheet()")
            n=await pg.evaluate("()=>{const L=[...document.querySelectorAll('#app button, #app .strow, #app .iorow')].filter(b=>b.offsetParent&&!b.disabled);L.forEach((b,i)=>b.dataset.tbi=i);return L.length}")
            for i in range(min(n,40)):
                html=await pg.evaluate(f"()=>{{const b=document.querySelector('[data-tbi=\"{i}\"]');return b?b.outerHTML.slice(0,140):''}}")
                import re
                if not html or re.search(SKIP,html): continue
                e0=len(errs)
                try:
                    await asyncio.wait_for(pg.evaluate(f"()=>{{const b=document.querySelector('[data-tbi=\"{i}\"]');if(b)b.click();}}"),5);await pg.wait_for_timeout(350)
                except Exception as ex: bad.append((tab,sub,html[:90],'BLOCCO '+type(ex).__name__))
                tot+=1
                if len(errs)>e0: bad.append((tab,sub,html[:90],errs[-1]))
                # torna alla scheda per il pulsante successivo
                await pg.evaluate(setup);await pg.wait_for_timeout(500);await pg.evaluate("()=>closeSheet()")
                await pg.evaluate("()=>{const L=[...document.querySelectorAll('#app button, #app .strow, #app .iorow')].filter(b=>b.offsetParent&&!b.disabled);L.forEach((b,i)=>b.dataset.tbi=i);}")
        print('pulsanti premuti:',tot);print('problemi:',len(bad))
        for x in bad[:25]: print(' -',x)
        await b.close()
asyncio.run(main())
