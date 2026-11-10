import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FUNZIONI DELL'ORDA (Fase 4b): stampa cosa producono scheda zombie (anche per un alleato), intestazione del fronte,
# pannello dell'orda (taglie e bonus), missioni, fortuna, assalti. Serve a confrontare due versioni: l'uscita deve
# essere identica (a parte orari). Caso fisso (Math.random con seme) per avere sempre gli stessi numeri.
import asyncio,sys,json,re
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SEME="window.__noHello=1;Math.random=(()=>{let s=11;return()=>{s=(s*16807)%2147483647;return s/2147483647;}})()"
TXT="(e)=>e?e.textContent.replace(/\\s+/g,' ').trim():null"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]));toasts=[]
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script(SEME)
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("()=>{const o=toast;window.__T=[];toast=function(m){__T.push(String(m));return o.apply(this,arguments);};}")
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);await thrLoad(true);go('orda');}")
        await pg.wait_for_timeout(2500)
        out={}
        out['pagina']=await pg.evaluate("()=>[...document.querySelectorAll('#app .page > *')].map(e=>e.className)")
        out['fronte_chips']=await pg.evaluate("()=>[...document.querySelectorAll('.fronte [data-frchips] span')].map(s=>s.textContent)")
        out['fronte_leg']=await pg.evaluate("()=>[...document.querySelectorAll('.fronte [data-frz]')].map(b=>b.dataset.frz+':'+b.textContent)")
        out['frComp']=await pg.evaluate("()=>frComp(3).join(',')")
        out['frWx']=await pg.evaluate("()=>JSON.stringify(frWx())")
        out['frChanceOf']=await pg.evaluate("()=>myHouses().map(h=>frChanceOf(h))")
        out['opan']=await pg.evaluate("()=>{const o=document.querySelector('.opan');return o?o.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d(:\\d\\d)?/g,'HH').replace(/tra [^·]*/g,'tra X').trim():null}")
        out['orPanel_taglie']=await pg.evaluate("()=>{const s=OR.s;const sv=JSON.stringify(s);OR.s={...s,bounty:3,next_bonus:5,total:2,held:1,claimed:false,mattoni:40};const h=orPanelHTML();OR.s=JSON.parse(sv);return [/taglie incluse · Riscatta/.test(h),/\\+5 difesa da aiuti/.test(h)]}")
        # scheda di ogni zombie
        zs={}
        for k in ['walker','runner','casco','strillone','scavatore','brute','boss','oro']:
            await pg.evaluate(f"()=>{{closeSheet();FR.dests=[myHouses()[0]];frZSheet('{k}')}}");await pg.wait_for_timeout(150)
            zs[k]=await pg.evaluate("()=>{const c=document.querySelector('#sheet.open');return c?c.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d/g,'HH').trim().slice(0,400):null}")
        out['zombie']=zs
        # scheda zombie per la casa di un alleato
        await pg.evaluate("()=>{closeSheet();const T=thrOf(myHouses()[0]);window.__zsCtx={label:'Casa di Gio',T:{...T,home:false,bid:'x1'},uid:'u1',nick:'gio'};frZSheet('runner')}");await pg.wait_for_timeout(200)
        out['zombie_alleato']=await pg.evaluate("()=>{const c=document.querySelector('#sheet.open');return c?c.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d/g,'HH').trim().slice(0,500):null}")
        # fortuna: giri finiti
        await pg.evaluate("()=>{closeSheet();G.spins=0;G.scratch=0;go('orda')}");await pg.wait_for_timeout(1200)
        await pg.evaluate("()=>{__T.length=0;document.querySelector('[data-lt=wheel]').click();document.querySelector('[data-lt=scratch]').click();}")
        out['fortuna_vuota']=await pg.evaluate("()=>__T.slice()")
        await pg.evaluate("()=>{G.spins=1;G.scratch=1;document.querySelector('[data-lt=wheel]').click()}");await pg.wait_for_timeout(300)
        out['ruota']=await pg.evaluate("()=>{const h=document.querySelector('#sheet.open h3');return h&&h.textContent}")
        # missioni
        await pg.evaluate("()=>{closeSheet();go('orda')}");await pg.wait_for_timeout(1200)
        out['missioni']=await pg.evaluate("()=>(G.tm&&G.tm.list||[]).map(m=>m.k+':'+m.go+':'+m.t.replace(/<[^>]+>/g,''))")
        mis=[]
        for i in range(await pg.evaluate("()=>document.querySelectorAll('.tmp [data-tmg]').length")):
            await pg.evaluate("()=>{closeSheet();__T.length=0;if(S.tab!=='orda')go('orda')}");await pg.wait_for_timeout(900)
            await pg.evaluate(f"()=>{{const b=document.querySelectorAll('.tmp [data-tmg]')[{i}];if(b)b.click();}}");await pg.wait_for_timeout(500)
            mis.append(await pg.evaluate("()=>[S.tab,__T.slice(0,2),(document.querySelector('#sheet.open h3')||{}).textContent||null]"))
        out['missioni_vai']=mis
        # assalti: fumetto (ultima e simulazione) e regia sulla mappa
        await pg.evaluate("()=>{closeSheet();go('orda');assalto('last')}");await pg.wait_for_timeout(1500)
        out['fumetto']=await pg.evaluate("()=>{const f=document.getElementById('fumetto');return f?f.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d/g,'HH').trim().slice(0,200):null}")
        await pg.evaluate("()=>{const f=document.getElementById('fumetto');if(f)f.remove();assalto('sim')}");await pg.wait_for_timeout(1500)
        out['fumetto_sim']=await pg.evaluate("()=>{const f=document.getElementById('fumetto');return f?f.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d/g,'HH').trim().slice(0,200):null}")
        out['missione_guarda']=await pg.evaluate("()=>(G.tm&&G.tm.list||[]).filter(m=>m.k==='watch').map(m=>m.prog+'/'+m.goal)")
        for k,v in out.items(): print(k,'=',json.dumps(v,ensure_ascii=False))
        print('ERR',errs);await b.close()
asyncio.run(main())
