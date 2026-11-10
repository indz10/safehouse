import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# MENU ☰, BARRE E ISTRUZIONI (Fase 4e): stampa le voci del menu, cosa fa ognuna (scheda aperta / pagina / avviso),
# cosa compare all'apertura del menu, la barra in alto e in basso, i capitoli delle istruzioni.
# Serve a confrontare due versioni: l'uscita deve essere identica.
import asyncio,sys,json
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SEME="window.__noHello=1;Math.random=(()=>{let s=19;return()=>{s=(s*16807)%2147483647;return s/2147483647;}})()"
VIEW="()=>{const sh=document.querySelector('#sheet.open');const t=sh?(sh.querySelector('h3')||{}).textContent:null;const f=document.getElementById('fumetto');return [S.tab,t,!!f,(window.__T||[]).slice(-1)[0]||null]}"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]));pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script(SEME)
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("()=>{const o=toast;window.__T=[];toast=function(m){__T.push(String(m));return o.apply(this,arguments);};}")
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);go('home');}")
        await pg.wait_for_timeout(1500)
        out={}
        out['barra_alto']=await pg.evaluate("()=>[...document.querySelectorAll('#topbar > *')].map(e=>(e.id||e.className)+':'+e.textContent.replace(/\\s+/g,' ').trim().slice(0,30))")
        out['barra_basso']=await pg.evaluate("()=>[...document.querySelectorAll('#nav button')].map(b=>b.dataset.tab+':'+b.textContent.trim()+(b.classList.contains('on')?'*':''))")
        out['voci']=await pg.evaluate("()=>zmItems().map(g=>g[0]+': '+g[1].map(r=>r[2]+'='+r[1]).join(' | '))")
        await pg.evaluate("()=>zmOpen()");await pg.wait_for_timeout(300)
        out['menu_aperto']=await pg.evaluate("()=>{const m=document.getElementById('zmenu');return m?[...m.querySelectorAll('button,.zmver,.zmwal span')].map(e=>(e.dataset.zm||e.className)+':'+e.textContent.replace(/\\s+/g,' ').replace(/\\d\\d\\/\\d\\d \\d\\d:\\d\\d \\(zsh-\\d+\\)/,'VER').trim().slice(0,40)):null}")
        keys=await pg.evaluate("()=>[...document.querySelectorAll('#zmenu [data-zm]')].map(b=>b.dataset.zm)")
        await pg.evaluate("()=>zmClose()")
        az={}
        for k in keys:
            if k in ('logout','del','delete','esci'): continue
            await pg.evaluate("()=>{closeSheet();const f=document.getElementById('fumetto');if(f)f.remove();window.__T.length=0;go('home')}");await pg.wait_for_timeout(500)
            await pg.evaluate(f"()=>{{zmOpen();const b=document.querySelector('#zmenu [data-zm=\"{k}\"]');if(b)b.click();}}");await pg.wait_for_timeout(1300)
            az[k]=await pg.evaluate(VIEW)
        out['azioni']=az
        out['istruzioni']=await pg.evaluate("()=>{const d=document.createElement('div');d.innerHTML=manualHTML();return [...d.querySelectorAll('details.man')].map(x=>x.querySelector('summary').textContent.trim()+' :: '+x.querySelector('.man-b').textContent.replace(/\\s+/g,' ').trim().slice(0,160))}")
        for k,v in out.items(): print(k,'=',json.dumps(v,ensure_ascii=False))
        print('ERR',errs);await b.close()
asyncio.run(main())
