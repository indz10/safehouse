import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FUNZIONI COMUNI (Fase 4f-1): navigazione tra le schede, accesso, le mie case, salvataggi, finestre, analisi della zona.
# Serve a confrontare due versioni: l'uscita deve essere identica. Caso fisso (Math.random con seme).
import asyncio,sys,json
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SEME="window.__noHello=1;Math.random=(()=>{let s=23;return()=>{s=(s*16807)%2147483647;return s/2147483647;}})()"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script(SEME)
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        out={}
        # analisi della zona (prima dell'accesso, poi con le risposte)
        out['zona']=await pg.evaluate("async()=>{S.answers={};const z=await analyzeZone('A');return [Object.keys(z).sort().join(','),!!z.real,z.real&&z.real.house&&z.real.house.kind,JSON.stringify(S.answers),JSON.stringify(S.aiFilled||{})]}")
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;}")
        # accesso: stesso proprietario
        out['accesso']=await pg.evaluate("async()=>{localStorage.setItem('zsh_owner','me');window.__R=[];const o=__mockSB.rpc;__mockSB.rpc=async function(fn){__R.push(fn);return o.apply(this,arguments);};await onLogin({id:'me',email:'a@b'},false);await new Promise(r=>setTimeout(r,2500));return [localStorage.getItem('zsh_owner'),window.ZADMIN,[...new Set(__R)].sort()]}")
        # le mie case
        out['mie_case']=await pg.evaluate("async()=>{await wMine(true);await new Promise(r=>setTimeout(r,1200));return [!!W.m,(W.m&&W.m.mattoni),myHouses().length,!!wMine.__fl]}")
        # navigazione: ogni scheda
        nav={}
        for t in ['home','mappa','orda','social','casa','io','valuta','home']:
            await pg.evaluate(f"()=>{{closeSheet();go('{t}')}}");await pg.wait_for_timeout(1600)
            nav[t]=await pg.evaluate("()=>[S.tab,REG.active,document.body.dataset.tab||null,[...document.querySelectorAll('#nav button.on')].map(b=>b.dataset.tab).join(','),(app.querySelector('.page,section')||app).className.slice(0,40),!!app.querySelector('.cback'),app.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d(:\\d\\d)?/g,'HH').replace(/tra \\d+ h \\d+ min/g,'tra X').trim().slice(0,160)]")
        out['navigazione']=nav
        # finestre
        out['finestre']=await pg.evaluate("async()=>{openSheet('Prova','<p>ciao 🪙 50</p>');await new Promise(r=>setTimeout(r,200));const a=[document.getElementById('sheet').className,document.querySelector('#sheet .sheet-b').textContent];document.getElementById('sheet').classList.add('hfull');closeSheet();return a.concat([document.getElementById('sheet').className])}")
        # salvataggi
        out['salvataggi']=await pg.evaluate("()=>{const r=[];window.__noSave=1;localStorage.removeItem('zsh_v2_salvataggio');saveLocal();r.push(!!localStorage.getItem('zsh_v2_salvataggio'));window.__noSave=0;saveLocal();r.push(!!localStorage.getItem('zsh_v2_salvataggio'));S.case=[{address:'Via X'}];S.pubOk=false;const d=snapshot();r.push(d&&d.S&&[d.S.pubOk,JSON.stringify(d.S.case)]);S.pubOk=true;S.case=[];restore(d);r.push([S.pubOk,JSON.stringify(S.case)]);return r}")
        for k,v in out.items(): print(k,'=',json.dumps(v,ensure_ascii=False))
        print('ERR',errs);await b.close()
asyncio.run(main())
