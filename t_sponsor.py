import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# SPONSOR (Fase 9a-1): pagina "Sponsor e partner", scheda con Google/sito/social che contano i contatti, iscrizione di un'attività.
# Deve stampare: ... contatti contati: ['clic_google', 'clic_tel'] ... iscrizione: Richiesta inviata ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
            "const k=Object.keys(SPONSORS)[0];SPONSORS[k].evid=true;SP_LINK[k]=Object.assign({},SP_LINK[k],{tel:'0376 111',g:'https://maps.app.goo.gl/x'});window.__EV=[];window.dbEvent=(k,kind)=>__EV.push(kind);closeSheet();go('sponsor')}")
        await pg.wait_for_timeout(800)
        print('pagina sponsor:',await pg.evaluate("()=>[...document.querySelectorAll('[data-spk] b')].map(b=>b.textContent).slice(0,3)"),'| iscrivi:',await pg.evaluate("()=>!!document.querySelector('[data-sp2]')"))
        await pg.wait_for_timeout(2500);await pg.evaluate("()=>{closeSheet();go('sponsor')}");await pg.wait_for_timeout(500)
        await pg.evaluate("()=>document.querySelector('[data-spk]').click()");await pg.wait_for_timeout(800)
        print('scheda:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open [data-trk]')].map(a=>a.textContent.trim())"))
        await pg.evaluate("()=>{document.querySelectorAll('#sheet.open a[target=_blank]').forEach(a=>a.removeAttribute('target'));const g=document.querySelector('#sheet.open [data-trk=clic_google]');g.addEventListener('click',e=>e.preventDefault());g.click();const t=document.querySelector('#sheet.open [data-trk=clic_tel]');t.addEventListener('click',e=>e.preventDefault());t.click();}")
        print('contatti contati:',await pg.evaluate("()=>__EV.filter(x=>/^clic_/.test(x))"))
        await pg.evaluate("()=>{closeSheet();go('sponsor')}");await pg.wait_for_timeout(500)
        await pg.click('[data-sp2]');await pg.wait_for_timeout(500)
        await pg.fill('#sj_name','Ferramenta Prova');await pg.fill('#sj_website','ferramentaprova.it');await pg.check('#sj_ok')
        await pg.click('[data-sjok]');await pg.wait_for_timeout(800)
        print('iscrizione:',await pg.evaluate("()=>(document.querySelector('#sheet.open h3')||{}).textContent"),'| inviato:',await pg.evaluate("()=>window.__SPREQ&&[__SPREQ.name,__SPREQ.website,!!__SPREQ.lat]"))
        print('ERR',errs);await b.close()
asyncio.run(main())
