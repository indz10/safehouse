import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':t_terr.LAT,'longitude':t_terr.LON,'accuracy':60},permissions=['geolocation'])
        pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:(m.type in('error','warning')) and 'Failed to load' not in m.text and errs.append(m.text))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{S.step=0;go('valuta')}");await pg.wait_for_timeout(300)
        await pg.fill('#addr','Via Roma 10, Volta Mantovana');await pg.click('#zBtn');await pg.wait_for_timeout(1500)
        print('pick map markers',await pg.evaluate("()=>__ml.markers"),await pg.evaluate("()=>!!document.querySelector('.lm-tu.pk')"))
        await pg.click('[data-pkok]');await pg.wait_for_timeout(4000)
        print('zone real',await pg.evaluate("()=>!!(S.zone&&S.zone.real)"))
        await pg.evaluate("()=>{window.ZUSERS=[{user_id:'x1',nick:'mario',lat_r:45.326,lon_r:10.6594,indice:4.2,livello:7,seen_at:new Date().toISOString(),comune:'Volta Mantovana'},{user_id:'x2',nick:'zia_pina',lat_r:45.324,lon_r:10.656,indice:7.1,livello:2,seen_at:'2026-01-01'}]}")
        await pg.evaluate("()=>(S.zv='mondo',go('mappa'))");await pg.wait_for_timeout(3500)
        info=await pg.evaluate("()=>({maps:document.querySelectorAll('.lmap').length,sp:document.querySelectorAll('.lm-sp').length,cand:document.querySelectorAll('.lm-cand').length,pub:document.querySelectorAll('.lm-pub').length,biz:document.querySelectorAll('.lm-biz').length,btn3d:!!document.querySelector('.lm-3d'),candNames:[...document.querySelectorAll('.lm-cand em')].map(e=>e.textContent),spNames:[...document.querySelectorAll('.lm-sp em')].map(e=>e.textContent)})")
        print(json.dumps(info,ensure_ascii=False))
        if info['btn3d']:
            await pg.evaluate("()=>{document.querySelector('.lm-3d').click()}");await pg.wait_for_timeout(300);await pg.evaluate("()=>{document.querySelector('.lm-mode').click()}");await pg.wait_for_timeout(800)
        print('calls',await pg.evaluate("()=>__ml.calls.slice(-8)"))
        c=await pg.query_selector('.lm-cand')
        if c:
            await pg.evaluate("()=>document.querySelector('.lm-cand').click()");await pg.wait_for_timeout(300);print('cand sheet:',await pg.evaluate("()=>document.querySelector('#sheet.open .claim b').textContent"))
            await pg.screenshot(path='y6_cand.png')
        await pg.evaluate("()=>{SP_GEO.fv={lat:45.3262,lon:10.6600,id:1};SPONSORS.fv={name:'Ferramenta Vera',logo:'FV'};SP_CAT.fv='Ferramenta';closeSheet();go('mappa');}");await pg.wait_for_timeout(3000)
        print('con sponsor vero',await pg.evaluate("()=>({sp:[...document.querySelectorAll('.lm-sp em')].map(e=>e.textContent),cand:document.querySelectorAll('.lm-cand').length,exps:(dayInit(),EXPS.map(x=>x.n)),bonus:terrBonus().lines.map(l=>l.t)})"))
        print('users',await pg.evaluate("()=>[...document.querySelectorAll('.lm-usr em')].map(e=>e.textContent)"))
        await pg.evaluate("()=>{S.user={id:'me',nick:'ale'};S.pubOk=undefined;zSyncProfile.asked=0;closeSheet();zAskPublic();}");await pg.wait_for_timeout(300)
        print('ask',await pg.evaluate("()=>document.querySelector('#sheet.open h3').textContent"))
        await pg.evaluate("()=>{closeSheet();lmPoi('Farmacia X','Farmacia',300,[45.3,10.6],true)}");await pg.wait_for_timeout(300)
        print('rep',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-rep]')"))
        print('ERR',errs[:8]);await b.close()
asyncio.run(main())
