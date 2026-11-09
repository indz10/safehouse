import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,sys
from playwright.async_api import async_playwright
import t_terr
MODE=sys.argv[1] if len(sys.argv)>1 else 'err'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();dev=p.devices['iPhone 13'];pg=await (await b.new_context(**dev)).new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.add_init_script(path='ml_stub.js')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(600)
        await pg.evaluate("""(mode)=>{const q={select(){return q},eq(){return q},neq(){return q},in(){return q},not(){return q},order(){return q},limit(){return q},gte(){return q},lte(){return q},
            maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:null,error:null}),insert:async()=>({error:null}),upsert:async()=>({error:null}),update(){return q},delete(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
          SB={from:()=>q,rpc:async(fn)=>mode==='err'?{data:null,error:{message:'function '+fn+' does not exist'}}:{data:null,error:null},auth:{getUser:async()=>({data:{user:{id:'me'}}}),signOut:async()=>{}},functions:{invoke:async()=>({data:null,error:{message:'x'}})},channel:()=>({on(){return this},subscribe(){return this}})};
          S.user={id:'me',nick:'ale'};S.pubOk=true;}""",MODE)
        await pg.evaluate("async()=>{S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);go('home');}")
        await pg.wait_for_timeout(1500)
        for tab in ['home','orda','mappa','valuta','home']:
            try:
                await pg.evaluate("()=>{const o=document.querySelector('.otour');if(o)o.remove();closeSheet&&closeSheet();}")
                btn=await pg.query_selector(f'#nav [data-tab="{tab}"], nav [data-go="{tab}"], [data-nav="{tab}"]')
                if btn: await btn.tap()
                else: await pg.evaluate(f"()=>go('{tab}')")
                await pg.wait_for_timeout(1500)
                print(tab,'ok' if await pg.evaluate("()=>document.getElementById('app').innerText.length>50") else 'VUOTA', '| tab attuale:',await pg.evaluate("()=>S.tab"))
            except Exception as e: print(tab,'ERRORE',str(e)[:120])
        if await pg.evaluate("()=>S.tab")=='home': pass
        await pg.evaluate("()=>{G.type=G.type||null}")
        await pg.screenshot(path='y_real.png')
        print('errori:',errs[:6]);await b.close()
asyncio.run(main())
