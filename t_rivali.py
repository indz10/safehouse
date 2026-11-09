import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json
from playwright.async_api import async_playwright
import t_terr
ATT={'elements':[{'type':'node','id':1,'lat':45.327,'lon':10.660,'tags':{'shop':'hardware','name':'Ferramenta Bianchi','phone':'0376 111','addr:street':'Via Roma','addr:housenumber':'5','addr:city':'Volta Mantovana'}},
 {'type':'way','id':2,'center':{'lat':45.36,'lon':10.70},'tags':{'craft':'locksmith','name':'Fabbro Verdi'}},{'type':'node','id':3,'lat':45.30,'lon':10.62,'tags':{'craft':'window_construction','name':'Serramenti Neri','website':'https://esempio.it'}}]}
async def route(r):
    if 'interpreter' in r.request.url and 'around%3A20000' in (r.request.post_data or '') or ('interpreter' in r.request.url and 'around:20000' in (r.request.post_data or '')):
        return await r.fulfill(status=200,content_type='application/json',body=json.dumps(ATT))
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();pg.set_default_timeout(8000);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.gems=40;await wMine(true);localStorage.clear();zIsAdmin=async()=>true;window.zHide=async(n)=>{window.ZHID=(window.ZHID||[]).concat([n]);};go('mappa');}")
        await pg.wait_for_timeout(3500)
        print('sponsor finti spariti:',await pg.evaluate("()=>Object.values(SP_GEO).filter(g=>g&&g.demo).length===0"),'| attività in mappa:',await pg.evaluate("()=>[...document.querySelectorAll('.lm-att span')].map(s=>s.textContent)"),'| pulsante:',await pg.evaluate("()=>document.querySelector('.mfsp').textContent"))
        await pg.evaluate("()=>document.querySelector('.lm-att').click()");await pg.wait_for_timeout(700)
        print('scheda attività:',await pg.evaluate("()=>document.querySelector('#sheet.open').textContent.replace(/\\s+/g,' ').slice(0,190)"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-at=hide]').click()");await pg.wait_for_timeout(600)
        print('dopo "togli":',await pg.evaluate("()=>[...document.querySelectorAll('.lm-att span')].map(s=>s.textContent)"))
        await pg.evaluate("()=>{SOC.tab='rivali';go('social');}");await pg.wait_for_timeout(1500);await pg.evaluate("()=>closeSheet()")
        print('schede:',await pg.evaluate("()=>[...document.querySelectorAll('.sseg button')].map(b=>b.textContent+(b.classList.contains('on')?'*':''))"))
        print('rivali:',await pg.evaluate("()=>[...document.querySelectorAll('.rivc')].map(r=>r.textContent.replace(/\\s+/g,' ').trim().slice(0,110))"))
        await pg.screenshot(path='y_riv.png')
        g0=await pg.evaluate("()=>G.gems");await pg.evaluate("()=>document.querySelector('[data-dv=nebbia]').click()");await pg.wait_for_timeout(800)
        print('nebbia: gemme',g0,'→',await pg.evaluate("()=>G.gems"),'| dispetti al server:',await pg.evaluate("()=>__W.curses"))
        await pg.evaluate("()=>playerSheet('u3')");await pg.wait_for_timeout(900)
        print('scheda giocatore dispetti:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-pdv]')].map(b=>b.textContent.trim())"))
        print('bacheca vittima:',await pg.evaluate("()=>{const d=document.createElement('div');d.innerHTML=socLine({kind:'curse',actor:'u3',actor_nick:'mario',target:'me',target_nick:'ale',info:'sabotaggio',created_at:new Date().toISOString()});return [d.textContent.replace(/\\s+/g,' ').trim(),!!d.querySelector('[data-askh]')]}"))
        print('ERR',errs[:5]);await b.close()
asyncio.run(main())
