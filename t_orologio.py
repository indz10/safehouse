import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# OROLOGIO UNICO (Fase 4f-2): un solo timer di sistema per i compiti periodici; l'orologio di "Oggi" mostra ogni secondo;
# il salvataggio periodico avviene; la scritta degli sponsor sulla Mappa non salta tra due versioni.
# Deve stampare: timer permanenti all'avvio: 1 ... secondi saltati: 0 ... scritte sponsor diverse: 1 ... ERR []
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
CONTA="""window.__si=[];const _si=window.setInterval;window.setInterval=function(f,ms){const id=_si.apply(this,arguments);__si.push({ms,t:performance.now(),id});return id;};
const _ci=window.clearInterval;window.clearInterval=function(id){const x=(window.__si||[]).find(y=>y.id===id);if(x)x.clear=1;return _ci.apply(this,arguments);};"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(CONTA);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(1500)
        print('timer permanenti all\'avvio:',await pg.evaluate("()=>__si.filter(x=>!x.clear).length"),'| compiti dell\'orologio:',await pg.evaluate("()=>typeof ZCLOCK!=='undefined'?ZCLOCK.t.length:'—'"))
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);go('orda');}")
        await pg.wait_for_timeout(2000)
        # orologio di "Oggi" (nel fronte): leggo 6 secondi, ogni 200 ms
        seen=[]
        for i in range(30):
            t=await pg.evaluate("()=>{const e=document.querySelector('[data-clock]');return e?e.textContent:null}")
            if t and (not seen or seen[-1]!=t): seen.append(t)
            await pg.wait_for_timeout(200)
        sec=[int(x.split(':')[-1]) for x in seen if x and x.count(':')==2]
        salti=sum(1 for a,b in zip(sec,sec[1:]) if (b-a)%60 not in (1,))
        print('orologio:',seen[:3],'…',seen[-1:],'| secondi saltati:',salti)
        # salvataggio periodico (ogni 10 s)
        await pg.evaluate("()=>{localStorage.removeItem('zsh_v2_salvataggio');}");await pg.wait_for_timeout(11000)
        print('salvataggio periodico avvenuto:',await pg.evaluate("()=>!!localStorage.getItem('zsh_v2_salvataggio')"))
        # scritta degli sponsor sulla Mappa: guardo per 6 s se cambia tra versioni diverse
        await pg.evaluate("()=>{SPONSORS.ferr={name:'Ferramenta Rossi',logo:'FR'};SP_GEO.ferr={lat:45.3262,lon:10.6590,id:'s1'};SP_GEO.demo1={lat:45.327,lon:10.66,demo:1};go('mappa')}");await pg.wait_for_timeout(2500)
        lab=set()
        for i in range(30):
            t=await pg.evaluate("()=>{const b=document.querySelector('.mfsp');return b?b.textContent:null}")
            if t: lab.add(t)
            await pg.wait_for_timeout(200)
        print('scritte sponsor diverse:',len(lab),sorted(lab))
        print('ERR',errs);await b.close()
asyncio.run(main())
