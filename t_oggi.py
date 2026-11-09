import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json,datetime
from playwright.async_api import async_playwright
import t_terr
def meteo():
    now=datetime.datetime.now();base=datetime.datetime(now.year,now.month,now.day)
    T=[(base+datetime.timedelta(hours=h)).strftime('%Y-%m-%dT%H:00') for h in range(48)]
    code=[61 if h%24==21 else 1 for h in range(48)];pr=[1.2 if h%24==21 else 0 for h in range(48)]
    return {'current':{'temperature_2m':14.3,'weather_code':2,'is_day':1},'hourly':{'time':T,'weather_code':code,'precipitation':pr,'temperature_2m':[12]*48,'visibility':[20000]*48,'wind_gusts_10m':[10]*48},
            'daily':{'weather_code':[61,1],'temperature_2m_max':[17,18],'temperature_2m_min':[8,9],'precipitation_probability_max':[70,10],'sunset':[base.strftime('%Y-%m-%dT17:05'),base.strftime('%Y-%m-%dT17:04')]}}
async def route(r):
    if 'open-meteo.com/v1/forecast' in r.request.url and 'hourly=' in r.request.url:
        return await r.fulfill(status=200,content_type='application/json',body=json.dumps(meteo()))
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__opened=[];window.open=(u)=>{window.__opened.push(u)}')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);go('orda');}")
        await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();G.ss='oggi';renderHub();}");await pg.wait_for_timeout(2000)
        c1=await pg.evaluate("()=>document.querySelector('.fronte [data-clock]').textContent");await pg.wait_for_timeout(1500);c2=await pg.evaluate("()=>document.querySelector('.fronte [data-clock]').textContent")
        print('fronte:',await pg.evaluate("()=>{const c=document.querySelector('.fronte .frtop');return c&&c.textContent.replace(/\\s+/g,' ').trim().slice(0,150)}"))
        print('orologio scorre:',c1,'→',c2)
        print('casella premio:',await pg.evaluate("()=>{const t=[...document.querySelectorAll('.lpan *')].find(x=>x.classList&&x.classList.contains('ocd'));return t&&t.textContent}"))
        pass
        await pg.evaluate("()=>document.querySelector('[data-frcal]').click()");await pg.wait_for_timeout(1200)
        print('scheda:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .orow')].map(r=>r.textContent.replace(/\\s+/g,' ').trim())"))
        await pg.screenshot(path='y_oggi.png')
        for k in ['google','next']:
            await pg.evaluate(f"()=>document.querySelector('#sheet.open [data-oc={k}]').click()");await pg.wait_for_timeout(200)
        print('link calendario:',await pg.evaluate("()=>window.__opened.map(u=>u.slice(0,90))"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
