import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json,datetime
from playwright.async_api import async_playwright
import t_terr
def meteo(code):
    now=datetime.datetime.now();base=datetime.datetime(now.year,now.month,now.day)
    T=[(base+datetime.timedelta(hours=h)).strftime('%Y-%m-%dT%H:00') for h in range(48)]
    return {'current':{'temperature_2m':9,'weather_code':code,'is_day':0},'hourly':{'time':T,'weather_code':[code]*48,'precipitation':[0]*48,'temperature_2m':[8]*48,'visibility':[300]*48,'wind_gusts_10m':[5]*48},
            'daily':{'weather_code':[code,code],'temperature_2m_max':[12,12],'temperature_2m_min':[5,5],'precipitation_probability_max':[10,10],'sunset':[base.strftime('%Y-%m-%dT17:05')]*2}}
async def route(r):
    if 'open-meteo.com/v1/forecast' in r.request.url and 'hourly=' in r.request.url:
        return await r.fulfill(status=200,content_type='application/json',body=json.dumps(meteo(45)))
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;localStorage.setItem('zsh_kit_me','1');S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch(S.zone.address||'A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);await oggiMeteo();go('orda');}")
        await pg.wait_for_timeout(400);await pg.evaluate("()=>{const v=document.querySelector('[data-type=vera]');if(v)v.click();}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>{closeSheet();renderHub();}");await pg.wait_for_timeout(2500)
        print('scheda unica:',await pg.evaluate("()=>[...document.querySelector('.page').children].filter(e=>!e.hidden).map(e=>(e.className||e.tagName).toString().replace('panel ','').slice(0,18)).join(' | ')"))
        print('pulsanti Oggi/Difendi spariti:',await pg.evaluate("()=>!document.querySelector('.oseg2')"))
        print('percorsi:',await pg.evaluate("()=>FR.paths.map(p=>Math.round(p.L)+'m ⬆'+Math.round(p.climb)+' ⬇'+Math.round(p.drop))"))
        print('zombie:',await pg.evaluate("()=>{const c={};FR.zs.forEach(z=>c[z.k]=(c[z.k]||0)+1);return c}"))
        x1=await pg.evaluate("()=>FR.zs.map(z=>z.x)");await pg.wait_for_timeout(2000);x2=await pg.evaluate("()=>FR.zs.map(z=>z.x)")
        print('avanzano:',sum(1 for a,b in zip(x1,x2) if b>a),'su',len(x1))
        print('meteo:',await pg.evaluate("()=>[FR.wx&&FR.wx.ev,document.querySelector('.frfx').className,document.querySelector('.frwx').textContent]"))
        print('nebbia: lontani quasi invisibili:',await pg.evaluate("()=>FR.zs.filter(z=>z.x>0&&parseFloat(z.el.style.opacity)<.5).length"),'/',await pg.evaluate("()=>FR.zs.filter(z=>z.x>0).length"))
        print('chips:',await pg.evaluate("()=>document.querySelector('[data-frchips]').textContent"))
        print('legenda:',await pg.evaluate("()=>[...document.querySelectorAll('[data-frz]')].map(b=>b.textContent)"))
        await pg.evaluate("()=>document.querySelector('[data-frz=oro]').click()");await pg.wait_for_timeout(500)
        print('zombie d’oro:',await pg.evaluate("()=>[document.querySelector('#sheet.open h3, #sheet.open .sheet-h, #sheet.open b')?.textContent, G.coins]"))
        await pg.evaluate("()=>{closeSheet();FR.zs[0].el.click()}");await pg.wait_for_timeout(400)
        print('tocco su uno zombie:',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,90)"))
        await pg.evaluate("()=>closeSheet()")
        print('gioca la notte nascosto:',await pg.evaluate("()=>{const p=document.querySelector('.odplay');return !p||p.hidden}"))
        print('fisarmoniche nascoste:',await pg.evaluate("()=>[...document.querySelectorAll('details.ofold')].every(d=>d.hidden)"))
        print('bottega vecchia nascosta:',await pg.evaluate("()=>![...document.querySelectorAll('.page h3')].some(h=>!h.hidden&&h.offsetParent&&/Bottega/.test(h.textContent))"))
        await pg.screenshot(path='y_fronte.png')
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
