import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context()).new_page();pg.set_default_timeout(8000)
        await pg.route('**/*',t_terr.route);await pg.add_init_script('window.__noHello=1');await pg.add_init_script(path='ml_stub.js')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("""()=>{const q={select(){return q},eq(){return q},neq(){return q},in(){return q},not(){return q},order(){return q},limit(){return q},maybeSingle:async()=>({data:null,error:null}),insert:async()=>({error:null}),upsert:async()=>({error:null}),update(){return q},delete(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
          window.__rpc=0;SB={from:()=>q,rpc:async()=>{window.__rpc++;return{data:null,error:{message:'x'}}},auth:{getUser:async()=>({data:{user:{id:'me'}}})},functions:{invoke:async()=>({data:null,error:{message:'x'}})}};S.user={id:'me',nick:'ale'};}""")
        await pg.evaluate("async()=>{S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);go('home');}")
        await pg.wait_for_timeout(3000);a=await pg.evaluate("()=>window.__rpc");await pg.wait_for_timeout(20000);b2=await pg.evaluate("()=>window.__rpc")
        print('richieste al server in 20 s da fermo:',b2-a);await b.close()
asyncio.run(main())
