import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':980,'height':760});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{const mk=(house,a)=>{S.zone={real:{house}};return houseScene({...SAMPLE,...a},{sid:Math.random().toString(36).slice(2,6)});};
          const L=[mk(null,{}),mk({kind:'apt',levels:5,roof:'flat',len:30},{tipo:'apt_3'}),mk({kind:'schiera',levels:2,roof:'gabled',len:8,rcol:'#8a5a34'},{tipo:'schiera',materiale:'mattoni'}),mk({kind:'casale',levels:2,roof:'hipped',len:28},{tipo:'cascina',energia:'fv'}),mk({kind:'villa',levels:1,roof:'gabled',len:12},{piani:'1'}),mk({kind:'bifamiliare',levels:3,roof:'gabled',len:14},{})];
          document.body.innerHTML='<div style="display:grid;grid-template-columns:repeat(3,320px);gap:6px;background:#fff">'+L.map(s=>'<div style="width:320px">'+s.replace('<svg ','<svg width="320" ')+'</div>').join('')+'</div>';}""")
        await pg.wait_for_timeout(300);await pg.screenshot(path='y_houses.png');print('ERR',errs);await b.close()
asyncio.run(main())
