import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def run(p,path,noanim=False,css=''):
    b=await p.chromium.launch();dev=p.devices['iPhone 13'];ctx=await b.new_context(**dev);pg=await ctx.new_page();pg.set_default_timeout(15000)
    await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
    if css: await pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent="+repr(css)+";document.head.appendChild(st);});")
    if noanim: await pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';document.head.appendChild(st);});")
    await pg.goto('file://'+path);await pg.wait_for_timeout(400)
    await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);await thrLoad(true);go('orda');}")
    await pg.wait_for_timeout(800);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(600);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(6000)
    cdp=await ctx.new_cdp_session(pg);await cdp.send('Performance.enable');m0={x['name']:x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
    await pg.wait_for_timeout(15000)
    m1={x['name']:x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
    z=await pg.evaluate("()=>(FR.zs||[]).length")
    await b.close()
    return (m1['TaskDuration']-m0['TaskDuration'])/15*100, (m1['ScriptDuration']-m0['ScriptDuration'])/15*100, (m1['LayoutCount']-m0['LayoutCount'])/15, z
async def main():
    async with async_playwright() as p:
        for name,css in [('versione nuova finale','')]:
            t,sc,lay,z=await run(p,D+'/app.html',False,css)
            print(f'{name}: processore occupato {t:.1f}% · di cui codice {sc:.1f}% · ricalcoli pagina {lay:.0f}/s · zombie {z}')
asyncio.run(main())
