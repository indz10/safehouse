import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};S.zone=await analyzeZone('Via Roma 10, Volta Mantovana');Q.forEach(q=>{S.answers[q.id]=SAMPLE[q.id];});S.answers.zona=S.zone.type;S.result=computeScore(S.answers,S.zone);S.step=0;go('valuta');}")
        await pg.wait_for_timeout(1200);await pg.screenshot(path='y_home.png')
        await pg.click('[data-mh="move"]');await pg.wait_for_timeout(300);await pg.click('[data-mvok]');await pg.wait_for_timeout(600)
        await pg.screenshot(path='y_new.png')
        print(await pg.evaluate("()=>[document.querySelector('#vv h2').textContent,!!document.querySelector('.mvnew'),S.moving>0]"))
        print('ERR',errs);await b.close()
asyncio.run(main())
