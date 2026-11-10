import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FORME DEGLI EDIFICI SUL SERVER (Fase 7b): la prima volta la forma arriva da OpenStreetMap e viene salvata sul server;
# su un telefono "nuovo" (memoria vuota) arriva dal server, senza chiamare OpenStreetMap.
# Deve stampare: ... seconda volta: dal server, richieste a OpenStreetMap 0 ... ERR []
import asyncio,sys,json,math
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        ovp=[0]
        LAT,LON=45.3255,10.6582;kx=111320*math.cos(LAT*math.pi/180)
        rect=[{'lat':LAT+y/110540,'lon':LON+x/kx} for x,y in [(-6,-4),(6,-4),(6,4),(-6,4),(-6,-4)]]
        B={'elements':[{'type':'way','id':1,'tags':{'building':'house','building:levels':'2','roof:shape':'gabled'},'geometry':rect}]}
        async def route(r):
            pd=r.request.post_data or ''
            if 'interpreter' in r.request.url:
                ovp[0]+=1
                if 'around%3A70' in pd or 'around:70' in pd: return await r.fulfill(status=200,content_type='application/json',body=json.dumps(B))
            return await t_terr.route(r)
        await pg.route('**/*',route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};}")
        ovp[0]=0
        r1=await pg.evaluate("async()=>{const g=await bGeom(45.3255,10.6582);const t=await bType(45.3255,10.6582,'x');return [!!(g&&g.main),t,Object.keys(window.__SHP||{}).sort()]}")
        print('prima volta: forma',r1[0],'| tipo',r1[1],'| salvati sul server',r1[2],'| richieste a OpenStreetMap',ovp[0])
        # telefono "nuovo": memoria e salvataggi del telefono vuoti
        await pg.evaluate("()=>{for(const k of Object.keys(RH))delete RH[k];for(const k of Object.keys(BT_MEM))delete BT_MEM[k];Object.keys(localStorage).filter(k=>/^zsh_b(g2|t)_/.test(k)).forEach(k=>localStorage.removeItem(k));}")
        ovp[0]=0
        r2=await pg.evaluate("async()=>{const g=await bGeom(45.3255,10.6582);const t=await bType(45.3255,10.6582,'x');return [!!(g&&g.main),t]}")
        print('seconda volta: dal server, forma',r2[0],'| tipo',r2[1],'| richieste a OpenStreetMap',ovp[0])
        # senza account: come prima (OpenStreetMap)
        await pg.evaluate("()=>{S.user=null;for(const k of Object.keys(RH))delete RH[k];Object.keys(localStorage).filter(k=>/^zsh_bg2_/.test(k)).forEach(k=>localStorage.removeItem(k));}")
        ovp[0]=0
        r3=await pg.evaluate("async()=>{const g=await bGeom(45.3255,10.6582);return !!(g&&g.main)}")
        print('senza account: forma',r3,'| richieste a OpenStreetMap',ovp[0])
        print('ERR',errs);await b.close()
asyncio.run(main())
