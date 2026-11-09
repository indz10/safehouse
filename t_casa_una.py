import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# PAGINA DELLA CASA DISEGNATA UNA VOLTA SOLA (Fase 4a)
# Mentre si compone resta nascosta ("Carico la casa…"); quando compare ha già tutte le parti.
# Rete lenta simulata: ogni chiamata al server finto risponde dopo 300 ms.
# Deve stampare: "cambi visibili: 0" per ogni casa e ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
WATCH="""()=>{window.__hv=[];const sel={art:'.hsart',tenuta:'.hsdef',zombie:'.thpan',fort:'.fortpan',vera:'.hpreal',fila:'.hpsel',chi:'.crpan',legenda:'.hlegend'};
  const snap=()=>{const sh=document.getElementById('sheet');const b=sh&&sh.querySelector('.sheet-card .sheet-b');if(!b||!sh.classList.contains('open'))return;
    const vis=getComputedStyle(b).visibility!=='hidden';if(!vis)return;const k=Object.entries(sel).filter(([n,s])=>b.querySelector(s)).map(([n])=>n).join(',');
    if(!__hv.length||__hv[__hv.length-1]!==k)__hv.push(k);};
  window.__mo=new MutationObserver(snap);__mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);go('home');}")
        await pg.wait_for_timeout(800)
        # rete lenta: rallento il server finto
        await pg.evaluate("()=>{const o=__mockSB.rpc.bind(__mockSB);__mockSB.rpc=async(...a)=>{await new Promise(r=>setTimeout(r,300));return o(...a);};}")
        n=await pg.evaluate("()=>myHouses().length")
        for i in range(n):
            await pg.evaluate("()=>closeSheet()");await pg.evaluate(WATCH)
            await pg.evaluate(f"()=>{{houseSheet(myHouses()[{i}])}}");await pg.wait_for_timeout(200)
            loading=await pg.evaluate("()=>/Carico la casa/.test((document.querySelector('#sheet.open .sheet-card')||{}).textContent||'')")
            await pg.wait_for_timeout(6000)
            hv=await pg.evaluate("()=>{__mo.disconnect();return __hv}")
            h=await pg.evaluate(f"()=>myHouses()[{i}].label")
            print(f'casa {i+1} ({h}): "Carico la casa…" visibile: {loading} | stati mostrati: {hv} | cambi visibili: {max(0,len([x for x in hv if x])-1)}')
        # pulsante "La mia casa" della homepage: apre la pagina nuova anche se i dati delle case non ci sono ancora
        await pg.evaluate("()=>{closeSheet();W.m=null;go('home')}");await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const b=document.querySelector('[data-hs=casa]');if(b)b.click();}");await pg.wait_for_timeout(5000)
        print('homepage → La mia casa:',await pg.evaluate("()=>[S.tab,!!document.querySelector('#sheet.open.hfull .hsart')]"))
        # app appena aperta: l'accesso all'account arriva dopo 3 s; tocco subito "La mia casa"
        await pg.evaluate("()=>{closeSheet();window.__U=S.user;S.user=null;W.m=null;localStorage.setItem('sb-prova-auth-token','1');go('home')}");await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const b=document.querySelector('[data-hs=casa]');if(b)b.click();setTimeout(()=>{S.user=window.__U;},3000);}");await pg.wait_for_timeout(1000)
        print('accesso in corso → attesa:',await pg.evaluate("()=>/Carico la casa/.test((document.querySelector('#sheet.open')||{}).textContent||'')"))
        await pg.wait_for_timeout(7000)
        print('accesso arrivato dopo 3 s → pagina nuova:',await pg.evaluate("()=>[!!document.querySelector('#sheet.open.hfull .hsart'),!document.querySelector('#app .mycasa2')]"))
        print('ERR',errs);await b.close()
asyncio.run(main())
