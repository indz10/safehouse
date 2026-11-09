import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers.zona=S.zone.type;S.step=1;go('valuta');}");await pg.wait_for_timeout(400)
        print('slots',await pg.evaluate("()=>document.querySelectorAll('#vv .shot').length"),await pg.evaluate("()=>[...document.querySelectorAll('.shg')].map(e=>e.textContent)"))
        await pg.screenshot(path='y_foto.png',full_page=True)
        # foto finta per la porta
        await pg.evaluate("()=>{const c=document.createElement('canvas');c.width=80;c.height=60;const g=c.getContext('2d');g.fillStyle='#8a5a34';g.fillRect(0,0,80,60);S.photos.porta={url:c.toDataURL('image/jpeg'),b64:''};S.photos.ingresso={url:c.toDataURL('image/jpeg'),b64:''};}")
        await pg.evaluate("()=>{vFoto();document.querySelector('#aiBtn').click();}");await pg.wait_for_timeout(800)
        print('findings',await pg.evaluate("()=>S.findings"))
        await pg.evaluate("()=>{S.step=2;S.chapter=1;renderValuta();}");await pg.wait_for_timeout(300)
        print('Q tot',await pg.evaluate("()=>Q.length"),'qph',await pg.evaluate("()=>document.querySelectorAll('.qph').length"))
        await pg.screenshot(path='y_dom.png',full_page=True)
        await pg.evaluate("()=>{Q.forEach(q=>{if(!S.answers[q.id])S.answers[q.id]=SAMPLE[q.id];});S.result=computeScore(S.answers,S.zone);S.game.base={...S.answers};S.step=3;renderValuta();}");await pg.wait_for_timeout(500)
        print('plan',await pg.evaluate("()=>planItems().length"),await pg.evaluate("()=>S.result.idx"))
        el=await pg.query_selector('.plan')
        if el: await el.screenshot(path='y_plan.png')
        print('ERR',errs);await b.close()
asyncio.run(main())
