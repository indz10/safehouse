import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🔔 NOTIFICHE SEMPRE ATTIVE (migrazione 045): pushKeep riscrive l'iscrizione; se il server l'aveva tolta ('nuovo')
# ne chiede una nuova al telefono; con "Spegni" (zsh_push_off) non fa niente. Telefono finto: pushManager simulato.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
FINTO="""(()=>{const L=window.__pk={sub:0,unsub:0,rpc:[]};let cur=null;const mk=n=>({endpoint:'https://web.push.apple.com/e'+n,toJSON(){return{endpoint:this.endpoint,keys:{p256dh:'p',auth:'a'}};},async unsubscribe(){L.unsub++;cur=null;return true;}});
 const pm={async getSubscription(){return cur;},async subscribe(){L.sub++;cur=mk(L.sub);return cur;}};
 try{Object.defineProperty(window,'Notification',{value:{permission:'granted',requestPermission:async()=>'granted'},configurable:true});}catch(e){}
 window.PushManager=window.PushManager||function(){};
 const reg={pushManager:pm};Object.defineProperty(navigator,'serviceWorker',{value:{ready:Promise.resolve(reg),getRegistration:async()=>reg,register:async()=>reg,addEventListener(){} ,controller:null},configurable:true});})()"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(FINTO);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{SB=__mockSB;S.user={id:'me',nick:'ale'};localStorage.setItem('zsh_pushkey','QUJD');window.__nuovo=true;"
                          "const r=SB.rpc.bind(SB);SB.rpc=async(n,a)=>{if(n==='push_subscribe'){__pk.rpc.push(a.p_endpoint);const v=window.__nuovo;window.__nuovo=false;return{data:{ok:true,nuovo:v},error:null};}return r(n,a);};}")
        await pg.evaluate("()=>pushKeep(true)");await pg.wait_for_timeout(400)
        print('senza iscrizione:',await pg.evaluate("()=>[__pk.sub,__pk.rpc.length]"))
        await pg.evaluate("()=>{window.__nuovo=true;return pushKeep(true);}");await pg.wait_for_timeout(400)
        print('tolta dal server:',await pg.evaluate("()=>[__pk.unsub,__pk.sub,__pk.rpc.slice(-1)[0]]"))
        await pg.evaluate("()=>pushKeep(true)");await pg.wait_for_timeout(400)
        print('ancora valida:',await pg.evaluate("()=>[__pk.sub,__pk.rpc.length]"))
        await pg.evaluate("()=>{localStorage.setItem('zsh_push_off','1');return pushKeep(true);}");await pg.wait_for_timeout(400)
        print('spente da me:',await pg.evaluate("()=>__pk.rpc.length"))
        print('ERR',E);await b.close()
asyncio.run(main())
