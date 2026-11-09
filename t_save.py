import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context();pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(400)
        # partita piena salvata su questo telefono
        await pg.evaluate("()=>{S.zone={address:'Via Roma 10, Volta',type:'periferia',resources:[],users:[],avgU:5,level:5};S.answers={tipo:'villa'};S.result={idx:5.5};S.geo={lat:45,lon:10,addr:'Via Roma 10, Volta'};saveLocal();}")
        a1=await pg.evaluate("()=>loadLocal().at");await pg.wait_for_timeout(6000);a2=await pg.evaluate("()=>loadLocal().at")
        print('at stabile senza modifiche:',a1==a2)
        await pg.reload();await pg.wait_for_timeout(600)
        print('dopo riapertura:',await pg.evaluate("()=>[S.zone&&S.zone.address,S.geo&&S.geo.addr,S.result&&S.result.idx]"))
        # telefono vuoto + cloud pieno: deve vincere il cloud
        await pg.evaluate("()=>{localStorage.clear();}");await pg.reload();await pg.wait_for_timeout(400)
        await pg.evaluate("""()=>{const cloud={v:1,at:Date.now()-86400000,S:{zone:{address:'Cloud 1',type:'centro',resources:[],users:[],avgU:5,level:5},answers:{tipo:'apt_12'},result:{idx:4}},G:null};
          const local=loadLocal();const wc=saveWeight(cloud),wl=saveWeight(local);window.__r=[wc,wl,!!(cloud&&(!local||wl<1&&wc>=1||(wc>=1&&cloud.at>=local.at)))];}""")
        print('cloud vince su telefono vuoto:',await pg.evaluate("()=>window.__r"))
        print('ERR',errs);await b.close()
asyncio.run(main())
