import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# LENTE (Fase 68): niente mirino, 📸 foto con anteprima e condivisione, 🚨 eventi di persona intorno a dove sei.
# Deve stampare: mirino: False | eventi in alto: 2 ... di persona: [71, ...] ... foto: True ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['camera','geolocation'],geolocation={'latitude':48.8566,'longitude':2.3522,'accuracy':10});pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();S.zv='mondo';go('mappa')}")
        await pg.wait_for_timeout(3000);await pg.evaluate("()=>closeSheet()")
        # lontano dalle mie case (Parigi): la Lente funziona lo stesso
        await pg.evaluate("()=>lenteOpen()");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{LENTE.pos={lat:48.8566,lon:2.3522};LENTE.gps=true;LENTE.acc=10;leLoad(true)}");await pg.wait_for_timeout(1500)
        print('mirino:',await pg.evaluate("()=>!!document.querySelector('.lnret,.lnaim')"))
        print('eventi chiesti dove sono:',await pg.evaluate("()=>[(window.__EQ||{}).p_lat,(window.__EQ||{}).p_lon]"))
        print('eventi in alto:',await pg.evaluate("()=>[...document.querySelectorAll('.lnevt')].map(e=>e.textContent)"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente_eventi.png')
        await pg.evaluate("()=>document.querySelector('.lnevt.qui').click()");await pg.wait_for_timeout(400)
        print('pannello:',await pg.evaluate("()=>{const p=document.querySelector('.lnpan');return p?[!!p.querySelector('[data-lepers]'),p.querySelector('.lnph b').textContent]:null}"))
        await pg.evaluate("()=>document.querySelector('[data-lepers]').click()");await pg.wait_for_timeout(1200)
        print('di persona:',await pg.evaluate("()=>{const a=window.__EQA||{};return [a.p_id,a.p_lat,a.p_acc]}"))
        await pg.evaluate("()=>{const x=document.querySelector('.lnpan [data-lnpx]');if(x)x.click()}")
        await pg.evaluate("()=>[...document.querySelectorAll('.lnevt')].find(e=>/Nido/.test(e.textContent)).click()");await pg.wait_for_timeout(400)
        print('lontano:',await pg.evaluate("()=>{const p=document.querySelector('.lnpan');return [!!p.querySelector('[data-lepers]'),!!p.querySelector('[data-lesped]'),/senza spendere energia/.test(p.textContent)]}"))
        await pg.evaluate("()=>document.querySelector('.lnpan [data-lnpx]').click()")
        # 📸 foto
        await pg.evaluate("()=>{window.__SH=null;navigator.canShare=()=>true;navigator.share=async o=>{window.__SH={n:o.files.length,t:o.text,ty:o.files[0].type,sz:o.files[0].size}}}")
        await pg.evaluate("()=>document.querySelector('.lnfoto').click()");await pg.wait_for_timeout(2500)
        print('foto:',await pg.evaluate("()=>{const i=document.querySelector('.lnfbox img');return !!(i&&i.naturalWidth>300)}"))
        if len(sys.argv)>1:await pg.screenshot(path=sys.argv[1]+'/lente_foto.png')
        await pg.evaluate("()=>document.querySelector('[data-lfs]').click()");await pg.wait_for_timeout(800)
        print('condivisa:',await pg.evaluate("()=>{const s=window.__SH;return s?[s.n,s.ty,s.sz>5000,/ZombieSafeHouse/.test(s.t)]:null}"))
        await pg.evaluate("()=>document.querySelector('[data-lfx]').click()");await pg.wait_for_timeout(200)
        print('anteprima chiusa:',await pg.evaluate("()=>!document.querySelector('.lnfbox')"))
        await pg.evaluate("()=>lenteClose()")
        print('ERR',errs);await b.close()
asyncio.run(main())
