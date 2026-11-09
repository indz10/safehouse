import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        async def rt(r):
            if 'interpreter' in r.request.url: return await r.fulfill(json={'elements':[{'type':'node','id':1,'lat':45.3,'lon':10.6,'tags':{'name':'Farmacia Comunale','opening_hours':'Mo-Fr 08:30-12:30,15:30-19:30; Sa 08:30-12:30; Su off','phone':'+39 0376 801234','website':'www.farmaciavolta.it','addr:street':'Via Roma','addr:housenumber':'12','addr:city':'Volta Mantovana','wheelchair':'yes','dispensing':'yes'}}]})
            if r.request.url.startswith('file:'): return await r.continue_()
            return await r.abort()
        await pg.route('**/*',rt)
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{const imgs=[];const fm={hasImage:()=>false,addImage:(id,d)=>imgs.push(d)};
          ['zi-cand','zi-super','zi-bar','zi-rist','zi-fuel','zi-shop','zi-osp','zi-farm','zi-cc','zi-vvf','zi-shop-n'].forEach(k=>zIcon(fm,k));
          const c=document.createElement('canvas');c.width=imgs.length*76;c.height=80;c.style.cssText='position:fixed;top:0;left:0;z-index:99999;background:#efe4c8';
          const g=c.getContext('2d');imgs.forEach((d,i)=>g.putImageData(d,i*76,4));document.body.appendChild(c);}""")
        await pg.wait_for_timeout(200);await pg.screenshot(path='y_icons.png',clip={'x':0,'y':0,'width':390,'height':84})
        await pg.evaluate("()=>{document.querySelector('canvas[style*=\"99999\"]').remove();bizSheet({i:1,ic:'📌',name:'Ferramenta Rossi',cat:'Ferramenta',d:340,ll:[45.3,10.6],tel:'+39 0376 111',cand:true},{seed:7})}")
        await pg.wait_for_timeout(300);await pg.screenshot(path='y_cand.png')
        await pg.evaluate("()=>{closeSheet();lmPoi('Farmacia Comunale','Farmacia',540,[45.3,10.6],true)}")
        await pg.wait_for_timeout(1200);await pg.screenshot(path='y_pub.png',full_page=True)
        print('ERR',errs);await b.close()
asyncio.run(main())
