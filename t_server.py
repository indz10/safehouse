import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# COLLEGAMENTO AL SERVER (dopo la Fase 10, telefono Android di un amico: "Cannot read properties of null (reading 'rpc')"):
# la libreria di Supabase arriva dal nostro sito (dist/supabase.js) anche se jsdelivr e unpkg sono bloccati.
# Deve stampare: libreria dal sito: True ok ... tutto bloccato: errore NON collegato al server ... ERR []
import asyncio,sys,threading,http.server,functools,socketserver
from playwright.async_api import async_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
def serve():
    h=functools.partial(Q,directory=D+'/dist');s=socketserver.TCPServer(('127.0.0.1',0),h);threading.Thread(target=s.serve_forever,daemon=True).start();return s
async def main():
    srv=serve();url=f'http://127.0.0.1:{srv.server_address[1]}/'
    async with async_playwright() as p:
        b=await p.chromium.launch();errs=[]
        async def prova(blocca_sito):
            ctx=await b.new_context(**p.devices['iPhone 13'],service_workers='block');pg=await ctx.new_page();pg.on('pageerror',lambda e:errs.append(str(e)[:160]))
            async def r(route):
                u=route.request.url
                if 'jsdelivr' in u or 'unpkg' in u or 'supabase.co' in u or 'googleapis' in u or 'gstatic' in u:return await route.abort()
                if blocca_sito and u.endswith('/supabase.js'):return await route.abort()
                if u.startswith(url):return await route.continue_()
                return await route.abort()
            await pg.route('**/*',r);await pg.add_init_script('window.__noHello=1')
            await pg.goto(url);await pg.wait_for_timeout(1500 if not blocca_sito else 30000)
            st=await pg.evaluate("()=>[!!window.supabase,window.SB_STATO,typeof SB!=='undefined'&&!!SB]")
            await pg.evaluate("()=>{try{closeSheet()}catch(e){};zStatusSheet()}");await pg.wait_for_timeout(1500)
            riga=await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .zst b')].map(b=>b.textContent).find(t=>/server/.test(t))")
            await ctx.close();return st,riga
        st,riga=await prova(False);print('libreria dal sito:',st[0],st[1],st[2],'|',riga)
        st,riga=await prova(True);print('tutto bloccato:',st[1],'|',riga)
        print('ERR',errs);await b.close()
    srv.shutdown()
asyncio.run(main())
