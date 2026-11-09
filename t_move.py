import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844});pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'Via Roma 10, Volta Mantovana',src:'gps'};S.zone=await analyzeZone('Via Roma 10, Volta Mantovana');S.answers={...S.answers,cibo:'14',porta:'blindata',mezzo:'auto',gruppo:'org'};S.result={idx:5.5};go('orda');}");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const b=document.querySelector('[data-type=vera]');if(b)b.click();}");await pg.wait_for_timeout(1000);await pg.evaluate("()=>closeSheet()")
        await pg.evaluate("()=>{G.coins=500;const l=LOTS[0];G.lots[l.id]={kind:'house',lv:1};G.q.rotonda=2;G.h.porta=2;S.step=0;go('valuta');}");await pg.wait_for_timeout(500)
        await pg.click('[data-mh="move"]');await pg.wait_for_timeout(300);await pg.screenshot(path='y_move.png')
        await pg.click('[data-mvok]');await pg.wait_for_timeout(500)
        print(await pg.evaluate("()=>({coins:G.coins,lots:Object.keys(G.lots).length,q:G.q,h:G.h,zone:S.zone,answers:S.answers,case:S.case.map(c=>c.address),tab:S.tab})"))
        print('ERR',errs);await b.close()
asyncio.run(main())
