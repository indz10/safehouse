import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FUNZIONI DELLA MAPPA (Fase 4c): stampa cosa producono mappa (livelli, segnaposto, pulsanti), barra "Le tue case",
# schede degli edifici (mia casa, casa libera, casa di un simulato, casa abitata), schede di attività e servizi.
# Serve a confrontare due versioni: l'uscita deve essere identica. Caso fisso (Math.random con seme).
import asyncio,sys,json
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SEME="window.__noHello=1;Math.random=(()=>{let s=13;return()=>{s=(s*16807)%2147483647;return s/2147483647;}})()"
SHEET="()=>{const c=document.querySelector('#sheet.open');return c?c.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d/g,'HH').trim().slice(0,320):null}"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script(SEME)
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;SPONSORS.ferr={name:'Ferramenta Rossi',logo:'FR'};SP_GEO.ferr={lat:45.3262,lon:10.6590,id:'s1'};await wMine(true);await orLoad(true);go('mappa');}")
        await pg.wait_for_timeout(4000)
        out={}
        out['pulsanti']=await pg.evaluate("()=>[...document.querySelectorAll('.mapfull button, .lmap button')].map(b=>b.className+':'+b.textContent.replace(/\\s+/g,' ').trim()).slice(0,30)")
        out['barra_case']=await pg.evaluate("()=>[...document.querySelectorAll('.mhouses [data-mh]')].map(b=>[b.textContent.replace(/\\s+/g,' ').trim(),!!b.querySelector('.mhart'),!!b.querySelector('.mhart[data-vera]')])")
        out['livelli']=await pg.evaluate("()=>{const lm=window.__mf;return lm&&lm.map?Object.keys(lm.map.lay).sort():null}")
        out['sorgenti']=await pg.evaluate("()=>{const lm=window.__mf;return lm&&lm.map?Object.keys(lm.map.src).sort():null}")
        out['segnaposto']=await pg.evaluate("()=>__ml.markers")
        out['notte']=await pg.evaluate("()=>{const lm=window.__mf;return lm&&lm.map&&lm.map.o?String(lm.map.o.style&&lm.map.o.style.name||'')+'|'+document.querySelectorAll('.lmap.night,.lmap .night').length:null}")
        out['mappe']=await pg.evaluate("()=>(window.__zlms||[]).length")
        # schede degli edifici
        ws={}
        H=await pg.evaluate("()=>myHouses().map(h=>[h.bid||null,h.lat,h.lon,h.home])")
        for i,(bid,lat,lon,home) in enumerate(H):
            await pg.evaluate(f"async()=>{{closeSheet();await wSheet({json.dumps(bid)},{lat},{lon})}}");await pg.wait_for_timeout(2500)
            ws['mia_'+str(i)]=await pg.evaluate("()=>[!!document.querySelector('#sheet.open.hfull .hshead'),(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent||null]")
        await pg.evaluate("async()=>{closeSheet();await wSheet('w9999',45.3270,10.6600)}");await pg.wait_for_timeout(800);ws['libera']=await pg.evaluate(SHEET)
        await pg.evaluate("async()=>{closeSheet();let k=0,bid='';while(k<5000){bid='g45.'+k+'_10.6';if(isNpc(bid))break;k++;}await wSheet(bid,45.3280,10.6610)}");await pg.wait_for_timeout(800);ws['simulato']=await pg.evaluate(SHEET)
        await pg.evaluate("async()=>{closeSheet();__W.qhome={status:'home',residents:[{user_id:'u7',nick:'gio',status:'confirmed',ally:true}],pending:false};await wSheet('w8888',45.3290,10.6620);__W.qhome=null;}");await pg.wait_for_timeout(800);ws['abitata']=await pg.evaluate(SHEET)
        await pg.evaluate("async()=>{closeSheet();__W.qhome={status:'home',residents:[],pending:true};await wSheet('w8889',45.3291,10.6621);__W.qhome=null;}");await pg.wait_for_timeout(800);ws['abitata_privata']=await pg.evaluate(SHEET)
        out['schede_edifici']=ws
        # schede di attività e servizi
        await pg.evaluate("()=>{closeSheet();__T=[];bizSheet({i:'t1',ic:'🔧',name:'Fabbro Bianchi',cat:'Attività per la casa',d:144,ll:[45.326,10.659],cand:true},S.zone)}");await pg.wait_for_timeout(800)
        out['attivita']=await pg.evaluate(SHEET);out['attivita_segnala']=await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-rep]')")
        await pg.evaluate("()=>{closeSheet();lmPoi('Farmacia Centrale','Farmacia',300,[45.327,10.657],true)}");await pg.wait_for_timeout(800)
        out['servizio']=await pg.evaluate(SHEET)
        out['missioni_eventi']=await pg.evaluate("()=>(G.tm&&G.tm.list||[]).map(m=>m.k+':'+m.prog+'/'+m.goal)")
        # ridisegno della mappa (orda, simulati, sponsor, attività)
        await pg.evaluate("async()=>{closeSheet();const lm=window.__mf;if(lm)await wDrawMap(lm,true);}");await pg.wait_for_timeout(1500)
        out['dopo_ridisegno']=await pg.evaluate("()=>{const lm=window.__mf;return lm&&lm.map?[Object.keys(lm.map.src).length,__ml.markers]:null}")
        for k,v in out.items(): print(k,'=',json.dumps(v,ensure_ascii=False))
        print('ERR',errs);await b.close()
asyncio.run(main())
