# Copertura delle funzioni: apre l'app col server finto, visita schede, preme pulsanti
# (anche dentro le schede aperte) e registra quali funzioni JS sono state eseguite.
# uso: python3 copertura.py <cartella repo> <uscita.json>
import asyncio,sys,json,re,os
R=sys.argv[1];OUT=sys.argv[2];sys.path.insert(0,R);os.chdir(R)
from playwright.async_api import async_playwright
import t_terr
SKIP="logout|del|elimina|Elimina|Esci|atk|Manda un|pzsend|data-io=\"login\"|Arrenditi|aQuit|Trasloco|moving|hv=\"pos\"|hv=\"foto\"|hv=\"risposte\"|hv=\"tutto\"|href="
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();dev=p.devices['iPhone 13'];ctx=await b.new_context(**dev);pg=await ctx.new_page();pg.set_default_timeout(6000)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:150]));pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
    cdp=await ctx.new_cdp_session(pg);scripts={}
    cdp.on('Debugger.scriptParsed',lambda e:scripts.__setitem__(e['scriptId'],e))
    await cdp.send('Debugger.enable');await cdp.send('Profiler.enable');await cdp.send('Profiler.startPreciseCoverage',{'callCount':True,'detailed':False})
    await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
    await pg.goto('file://'+R+'/app.html');await pg.wait_for_timeout(800)
    await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;SPONSORS.ferr={name:'Ferramenta Rossi',logo:'FR'};SP_GEO.ferr={lat:45.3262,lon:10.6590,id:'s1'};go('orda');}")
    await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
    plan=[('home',None),('mappa',None),('orda','oggi'),('orda','impero'),('orda','difendi'),('social','piazza'),('social','bacheca'),('social','squadra'),('social','classifiche'),('io',None)]
    tot=0
    MARK="(sel)=>{const L=[...document.querySelectorAll(sel)].filter(b=>b.offsetParent&&!b.disabled);L.forEach((b,i)=>b.dataset.tbi=i);return L.length}"
    for tab,sub in plan:
      setup=f"()=>{{closeSheet();{'G.ss='+repr(sub)+';' if tab=='orda' else ''}{'SOC.tab='+repr(sub)+';' if tab=='social' else ''}go('{tab}');}}"
      await pg.evaluate(setup);await pg.wait_for_timeout(1200);await pg.evaluate("()=>closeSheet()")
      n=await pg.evaluate(MARK,'#app button, #app .strow, #app .iorow')
      for i in range(min(n,45)):
        html=await pg.evaluate(f"()=>{{const b=document.querySelector('[data-tbi=\"{i}\"]');return b?b.outerHTML.slice(0,140):''}}")
        if not html or re.search(SKIP,html): continue
        try:
          await asyncio.wait_for(pg.evaluate(f"()=>{{const b=document.querySelector('[data-tbi=\"{i}\"]');if(b)b.click();}}"),5);await pg.wait_for_timeout(450);tot+=1
          # un livello dentro la scheda aperta (max 8 pulsanti)
          m=await pg.evaluate(MARK.replace('b.dataset.tbi','b.dataset.tsi'),'#sheet.open button')
          for j in range(min(m,8)):
            h2=await pg.evaluate(f"()=>{{const b=document.querySelector('#sheet.open [data-tsi=\"{j}\"]');return b?b.outerHTML.slice(0,140):''}}")
            if not h2 or re.search(SKIP+"|close|chiudi|✕",h2): continue
            await asyncio.wait_for(pg.evaluate(f"()=>{{const b=document.querySelector('#sheet.open [data-tsi=\"{j}\"]');if(b)b.click();}}"),5);await pg.wait_for_timeout(300);tot+=1
            break
        except Exception as ex: pass
        await pg.evaluate(setup);await pg.wait_for_timeout(400);await pg.evaluate("()=>closeSheet()")
        await pg.evaluate(MARK,'#app button, #app .strow, #app .iorow')
    # menu ☰: ogni voce
    try:
      k=await pg.evaluate("()=>{zmOpen();return document.querySelectorAll('#sheet.open [data-zm], #sheet.open button').length}")
      for j in range(min(k,30)):
        await pg.evaluate(f"()=>{{closeSheet();zmOpen();const L=[...document.querySelectorAll('#sheet.open [data-zm], #sheet.open button')];const b=L[{j}];if(b&&!/logout|Esci|elimina/i.test(b.outerHTML))b.click();}}");await pg.wait_for_timeout(350);tot+=1
    except Exception as ex: print('menu',ex)
    cov=await cdp.send('Profiler.takePreciseCoverage')
    res=[]
    for s in cov['result']:
      sp=scripts.get(s['scriptId'])
      if not sp or not sp.get('url','').endswith('app.html'): continue
      src=(await cdp.send('Debugger.getScriptSource',{'scriptId':s['scriptId']}))['scriptSource']
      for f in s['functions']:
        r=f['ranges'][0];name=f['functionName']
        if not name: continue
        line=sp['startLine']+src.count('\n',0,r['startOffset'])
        res.append({'name':name,'line':line,'count':r['count']})
    json.dump({'pressed':tot,'errs':errs[:20],'fn':res},open(OUT,'w'))
    print('premuti',tot,'funzioni con nome',len(res),'errori',len(errs))
    await b.close()
asyncio.run(main())
