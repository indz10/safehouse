import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,sys,time
from playwright.async_api import async_playwright
import t_terr
MODE=sys.argv[1]
def log(*a):
    open('/tmp/hang.log','a').write(' '.join(str(x) for x in a)+'\n')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page()
        pg.set_default_timeout(8000)
        pg.on('pageerror',lambda e:log('PAGEERR',str(e)[:150]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.add_init_script(path='ml_stub.js')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600);log('caricata')
        await pg.evaluate("""(mode)=>{const q={select(){return q},eq(){return q},neq(){return q},in(){return q},not(){return q},order(){return q},limit(){return q},gte(){return q},lte(){return q},
            maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:null,error:null}),insert:async()=>({error:null}),upsert:async()=>({error:null}),update(){return q},delete(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
          window.__rpc=0;SB={from:()=>q,rpc:async(fn)=>{window.__rpc++;return mode==='err'?{data:null,error:{message:'function '+fn+' does not exist'}}:{data:null,error:null}},auth:{getUser:async()=>({data:{user:{id:'me'}}}),signOut:async()=>{}},functions:{invoke:async()=>({data:null,error:{message:'x'}})}};
          S.user={id:'me',nick:'ale'};S.pubOk=true;}""",MODE);log('SB finto')
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);}");log('zona')
        await pg.evaluate("()=>{go('orda');}");await asyncio.sleep(0.5)
        try:
            await asyncio.wait_for(pg.evaluate("()=>{const b=document.querySelector('[data-type=villa]');if(b)b.click();return 1}"),8);await asyncio.sleep(2)
            await asyncio.wait_for(pg.evaluate("()=>{closeSheet();G.howSeen=1;G.tourDone=1;G.tourAsked=1;return 1}"),8);log('partita avviata')
        except Exception as e: log('BLOCCO avvio partita',type(e).__name__)
        for tab in ['home','social','io','mappa','orda','social','home']:
            t0=time.time()
            try:
                await asyncio.wait_for(pg.evaluate(f"()=>{{go('{tab}');return 1}}"),8);await asyncio.sleep(1.5)
                n=await asyncio.wait_for(pg.evaluate("()=>[document.getElementById('app').innerText.length,window.__rpc]"),8)
                log(tab,'ok',n,round(time.time()-t0,1))
            except Exception as e: log(tab,'BLOCCO/ERRORE',type(e).__name__,str(e)[:100]);break
        await b.close()
asyncio.run(main())
