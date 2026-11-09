import asyncio,sys,os
R=sys.argv[1];sys.path.insert(0,R);os.chdir(R)
from playwright.async_api import async_playwright
import t_terr
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
    await pg.route('**/*',t_terr.route);await pg.add_init_script(path='sb_mock.js');await pg.add_init_script(path='ml_stub.js');await pg.add_init_script('window.__noHello=1')
    await pg.goto('file://'+R+'/app.html');await pg.wait_for_timeout(800)
    await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;go('home');await wMine(true);}")
    await pg.wait_for_timeout(1500)
    r=await pg.evaluate("""async()=>{const H=myHouses();const h=H.find(x=>x.home)||H[0];if(!h)return 'nessuna casa';const t0=performance.now();const ev=[];const seen=new Set();
      const sel={'scheda aperta':'#sheet.open','pagina intera (p53)':'#sheet.hfull','disegno casa (p41/42)':'#sheet.open .hsart','% tenuta (p44)':'#sheet.open .hsdef b','chi arriva (p47)':'#sheet.open .thpan','fortificazioni (p50)':'#sheet.open .fortpan','fila case (p53)':'#sheet.open [data-hps]','chi vive qui (p54)':'#sheet.open .crpan','abitazione (p55)':'#sheet.open .abpan','legenda (p62)':'#sheet.open .hlegend'};
      const mo=new MutationObserver(()=>{for(const [k,s] of Object.entries(sel))if(!seen.has(k)&&document.querySelector(s)){seen.add(k);ev.push([k,Math.round(performance.now()-t0)]);}});
      mo.observe(document.body,{subtree:true,childList:true,attributes:true});let n=0;mo.takeRecords();
      const mut=new MutationObserver(r=>{n+=r.length});mut.observe(document.body,{subtree:true,childList:true});
      await houseSheet(h);await new Promise(r=>setTimeout(r,3000));mo.disconnect();mut.disconnect();return {ev,mutazioni:n,fine:Math.round(performance.now()-t0)}}""")
    print(r);await b.close()
asyncio.run(main())
