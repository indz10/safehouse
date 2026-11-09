import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json,math
from playwright.async_api import async_playwright
import t_terr
LAT,LON=45.3255,10.6582
def rect(cx,cy,w,h,ang=0):
    pts=[(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2),(-w/2,-h/2)];c,s=math.cos(ang),math.sin(ang)
    kx=111320*math.cos(LAT*math.pi/180)
    return [{'lat':LAT+(cy+x*s+y*c)/110540,'lon':LON+(cx+x*c-y*s)/kx} for x,y in pts]
def L(cx,cy):
    kx=111320*math.cos(LAT*math.pi/180);P=[(0,0),(14,0),(14,6),(6,6),(6,14),(0,14),(0,0)]
    return [{'lat':LAT+(cy+y)/110540,'lon':LON+(cx+x)/kx} for x,y in P]
B={'elements':[{'type':'way','id':1,'tags':{'building':'house','building:levels':'2','roof:shape':'gabled'},'geometry':rect(0,0,12,9,.3)},
 {'type':'way','id':2,'tags':{'building':'house','building:levels':'2'},'geometry':L(10,8)},
 {'type':'way','id':3,'tags':{'building':'apartments','building:levels':'6'},'geometry':rect(-22,18,20,12,.3)},
 {'type':'way','id':4,'tags':{'building':'garage'},'geometry':rect(-12,-4,4,6,.3)}]}
async def route(r):
    pd=r.request.post_data or ''
    if 'interpreter' in r.request.url and ('around%3A70' in pd or 'around:70' in pd):
        return await r.fulfill(status=200,content_type='application/json',body=json.dumps(B))
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(9000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.clear();localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE,porta:'blindata',grate:'alcune',luci:'sensore',allarme:'cam',recinzione:'si'};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);OR.s.prepared=true;OR.s.helps_in=2;go('casa');}")
        await pg.wait_for_timeout(3500);await pg.evaluate("()=>closeSheet()")
        print('casa vera disegnata:',await pg.evaluate("()=>{const a=document.querySelector('.mycasa .mcart');return [a&&a.dataset.real,a&&a.dataset.desc,document.querySelector('.mycasa small').textContent]}"))
        print('rinforzi:',await pg.evaluate("()=>[...document.querySelectorAll('.rinf span')].map(s=>s.textContent)"))
        el=await pg.query_selector('.mycasa');await el.screenshot(path='y_real1.png')
        # campionario: stessa casa a livello 1 senza rinforzi, livello 5; e il condominio
        await pg.evaluate("""async()=>{const g=await bGeom(45.3255,10.6582);const g2={main:{...g.near.find(n=>n.b==='apartments')},near:[g.main]};
          document.body.innerHTML='<div id=cmp style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px;background:#f3e9d2;width:740px"></div>';const c=document.getElementById('cmp');
          const add=(svg,t)=>c.insertAdjacentHTML('beforeend','<div style="border:2px solid #140f1f;background:#fff;font:700 12px sans-serif;overflow:hidden">'+svg.replace('<svg ','<svg style="width:100%;height:auto;display:block" ')+t+'</div>');
          add(realHouseSVG(g,{lvl:1,a:{},seed:'x'}),'Casa vera · livello 1 · nessun rinforzo');
          add(realHouseSVG(g,{lvl:3,a:{porta:'blindata',grate:'alcune',luci:'sensore',allarme:'cam',recinzione:'si'},prep:true,helps:2,seed:'x'}),'Livello 3 · blindata, grate, luci, telecamera, preparata, 2 alleati');
          add(realHouseSVG(g,{lvl:5,a:{porta:'blindata',grate:'tutte',vetri:'anti',luci:'sensore',allarme:'allarme'},prep:true,helps:3,seed:'x'}),'Livello 5 · tutto + scudo');
          add(realHouseSVG(g2,{lvl:2,a:{},seed:'y'}),'Condominio vero 6 piani · livello 2');}""")
        await pg.wait_for_timeout(400);el=await pg.query_selector('#cmp');await el.screenshot(path='y_real_cmp.png')
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
