import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,math
from playwright.async_api import async_playwright
import t_terr
def struct():
    E=[];i=1
    def n(dx,dy,tags):
        nonlocal i;la,lo=t_terr.off(dx,dy);E.append({'type':'node','id':i,'lat':la,'lon':lo,'tags':tags});i+=1
    n(100,50,{'shop':'supermarket','name':'Conad Volta'});n(-80,20,{'amenity':'bar','name':'Bar Centrale'});n(200,-30,{'amenity':'pharmacy','name':'Farmacia Comunale','opening_hours':'Mo-Sa 08:30-19:30'})
    n(60,60,{'highway':'bus_stop'});n(-300,100,{'amenity':'school','name':'Scuola primaria G. Rodari'});n(400,0,{'leisure':'park','name':'Parco del Mincio'})
    n(3000,2000,{'railway':'station','name':'Stazione di Peschiera'});n(1500,800,{'tourism':'hotel','name':'Hotel Vero'});n(2500,-900,{'tourism':'guest_house','name':'Agriturismo La Corte','agriturismo':'yes'})
    n(900,300,{'amenity':'restaurant','name':'Pizzeria Da Mario','cuisine':'pizza'});n(1800,1800,{'historic':'castle','name':'Castello di Volta'});n(120,-20,{'shop':'vacant'})
    return E
async def route(r):
    b=r.request.post_data or ''
    if 'interpreter' in r.request.url and ('bus_stop' in b or 'bus_stop' in __import__('urllib.parse').parse.unquote_plus(b)):
        return await r.fulfill(json={'elements':struct()})
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',route);await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.zv='vivere';S.rvMode='vivere';go('mappa');}")
        await pg.wait_for_timeout(1500);await pg.screenshot(path='y_viv.png',full_page=True)
        print('vivere',await pg.evaluate("()=>[...document.querySelectorAll('.strow b')].map(e=>e.textContent).slice(0,8)"))
        await pg.evaluate("()=>{S.rvMode='vacanza';renderVivere();}");await pg.wait_for_timeout(1000);await pg.screenshot(path='y_vac.png',full_page=True)
        print('vacanza',await pg.evaluate("()=>[...document.querySelectorAll('.strow b')].map(e=>e.textContent)"))
        print('ERR',errs);await b.close()
asyncio.run(main())
