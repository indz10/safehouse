import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# FUNZIONI DEI SUPERSTITI (Fase 4d): stampa cosa producono le linguette (Piazza, Bacheca, Squadra, Rivali,
# Classifiche), le righe della bacheca per ogni tipo di evento, la scheda di un giocatore, la scheda dell'alleato,
# gli inviti. Serve a confrontare due versioni: l'uscita deve essere identica. Caso fisso (Math.random con seme).
import asyncio,sys,json
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SEME="window.__noHello=1;Math.random=(()=>{let s=17;return()=>{s=(s*16807)%2147483647;return s/2147483647;}})()"
PULISCI="(t)=>t.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d(:\\d\\d)?/g,'HH').replace(/\\d+ (min|ore|ora|h|s|sec|giorni?) fa/g,'X fa').trim()"
SHEET="()=>{const c=document.querySelector('#sheet.open');return c?c.textContent.replace(/\\s+/g,' ').replace(/\\d\\d:\\d\\d/g,'HH').replace(/\\d+ (min|ore|ora|h|s|sec|giorni?) fa/g,'X fa').trim().slice(0,400):null}"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script(SEME)
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("async()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');await rmFetch('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);G.tourAsked=1;G.tourDone=1;G.howSeen=1;await wMine(true);await orLoad(true);}")
        await pg.evaluate("()=>{window.__R=[];const o=__mockSB.rpc;__mockSB.rpc=async function(fn,a){__R.push(fn);return o.apply(this,arguments);};}")
        out={}
        for tab in ['piazza','bacheca','squadra','rivali','classifiche']:
            await pg.evaluate(f"()=>{{closeSheet();__R.length=0;SOC.tab='{tab}';go('social')}}");await pg.wait_for_timeout(2500)
            out['tab_'+tab]=await pg.evaluate("()=>{const a=document.querySelector('#app');return ("+PULISCI+")(a.textContent).slice(0,700)}")
            out['tab_'+tab+'_linguette']=await pg.evaluate("()=>[...document.querySelectorAll('.sseg [data-st]')].map(b=>b.dataset.st+':'+b.textContent.trim()+(b.classList.contains('on')?'*':''))")
            out['tab_'+tab+'_pannelli']=await pg.evaluate("()=>[...document.querySelectorAll('#socBody > *')].map(e=>e.className).slice(0,20)")
            out['tab_'+tab+'_rpc']=sorted(set(await pg.evaluate("()=>__R.slice()")))
        # righe della bacheca per ogni tipo
        out['righe']=await pg.evaluate("()=>{const K=['join','buy','help','ask_ally','curse','shield','dm','house_req','house_ok','raid','gift','upgrade','xyz'];const now=new Date(Date.now()-120000).toISOString();return K.map(k=>{const d=document.createElement('div');try{d.innerHTML=socLine({kind:k,actor:'u1',actor_nick:'gio',target:k==='dm'||k==='house_req'?'me':'u2',target_nick:'ale',info:k==='curse'?'fango':k==='dm'?'ciao':'',created_at:now,comune:'Volta'});}catch(e){return k+': ERRORE '+e.message}return k+': '+d.textContent.replace(/\\s+/g,' ').replace(/\\d+ (min|ore|ora|h|s|sec|giorni?) fa/g,'X fa').trim()})}")
        # scheda di un giocatore: me, alleato, sconosciuto
        for uid in ['me','u1','u5']:
            await pg.evaluate(f"async()=>{{closeSheet();await playerSheet('{uid}')}}");await pg.wait_for_timeout(1200)
            out['giocatore_'+uid]=await pg.evaluate(SHEET)
            out['giocatore_'+uid+'_pulsanti']=await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open button')].map(b=>Object.keys(b.dataset).join(',')+':'+b.textContent.replace(/\\s+/g,' ').trim()).slice(0,20)")
        # scheda dell'alleato (simulazione)
        await pg.evaluate("async()=>{closeSheet();await allySheet('u1')}");await pg.wait_for_timeout(1500)
        out['alleato']=await pg.evaluate(SHEET);out['alleato_zombie_cliccabili']=await pg.evaluate("()=>document.querySelectorAll('#sheet.open [data-azk]').length")
        # alleati in squadra (alHTML) e inviti
        out['alHTML']=await pg.evaluate("()=>{const d=document.createElement('div');d.innerHTML=alHTML();return d.textContent.replace(/\\s+/g,' ').trim().slice(0,400)}")
        await pg.evaluate("async()=>{closeSheet();await inviteSheet()}");await pg.wait_for_timeout(1200)
        out['inviti']=await pg.evaluate(SHEET)
        for k,v in out.items(): print(k,'=',json.dumps(v,ensure_ascii=False))
        print('ERR',errs);await b.close()
asyncio.run(main())
