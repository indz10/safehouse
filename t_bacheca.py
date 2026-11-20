import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 📬 BACHECA TOCCABILE (Fase 48b): ogni riga di "Per te" / Bacheca apre l'azione (evento, casse, case, attacchi,
# richieste, scheda del giocatore); i pulsanti dentro la riga restano; gli eventi nuovi hanno il loro nome.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();go('social');}")
        await pg.wait_for_timeout(1500)
        rows="""[{kind:'evento',info:'lancio|11',target:'me',created_at:new Date().toISOString()},{kind:'lente',info:'5|1',target:'me',created_at:new Date().toISOString()},
          {kind:'assalto',info:'',actor:'u3',actor_nick:'mario',target:'me',target_nick:'ale',created_at:new Date().toISOString()},
          {kind:'difesa',info:'',actor:'u3',actor_nick:'giangy',target:'u4',target_nick:'arf18',created_at:new Date().toISOString()},
          {kind:'all_voto',info:'',actor:'u3',actor_nick:'mario',target:'me',created_at:new Date().toISOString()}]"""
        await pg.evaluate("()=>{const L="+rows+";const d=document.createElement('div');d.id='tfeed';d.className='panel sper';d.innerHTML=L.map(socLine).join('');document.querySelector('#app').prepend(d);}")
        print('righe toccabili:',await pg.evaluate("()=>[...document.querySelectorAll('#tfeed .sitem')].map(r=>r.classList.contains('sgo'))"))
        print('nome evento:',await pg.evaluate("()=>document.querySelector('#tfeed .sitem .stx').textContent.slice(0,60)"))
        if os.environ.get('SHOT1'):
            await pg.evaluate("()=>document.getElementById('tfeed').scrollIntoView()");await pg.screenshot(path=os.environ['SHOT1'])
        async def tocca(i,wait=3000):
            await pg.evaluate("()=>{if(!document.getElementById('tfeed')){const L="+rows+";const d=document.createElement('div');d.id='tfeed';d.innerHTML=L.map(socLine).join('');document.querySelector('#app').prepend(d);}}")
            await pg.evaluate(f"()=>{{closeSheet();const r=document.querySelectorAll('#tfeed .sitem')[{i}];r.querySelector('.stx small').click();}}");await pg.wait_for_timeout(wait)
            return await pg.evaluate("()=>(document.querySelector('#sheet.open .sheet-h h3')||{}).textContent")
        print('evento →',await tocca(0))
        await pg.evaluate("()=>{if(S.tab!=='social')go('social');}");await pg.wait_for_timeout(1200)
        await pg.evaluate("()=>{if(!document.getElementById('tfeed')){const L="+rows+";const d=document.createElement('div');d.id='tfeed';d.innerHTML=L.map(socLine).join('');document.querySelector('#app').prepend(d);}}")
        print('lente →',await tocca(1))
        print('assalto →',await tocca(2))
        await pg.evaluate("()=>{go('social');}");await pg.wait_for_timeout(1200)
        await pg.evaluate("()=>{if(!document.getElementById('tfeed')){const L="+rows+";const d=document.createElement('div');d.id='tfeed';d.innerHTML=L.map(socLine).join('');document.querySelector('#app').prepend(d);}}")
        print('difesa di altri →',await tocca(3,2000))
        print('voto →',await tocca(4))
        print('ERR',E);await b.close()
asyncio.run(main())
