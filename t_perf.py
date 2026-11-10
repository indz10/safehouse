import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# VELOCITÀ DI APERTURA (Fase 7c): peso dell'app e tempi di apertura con il processore rallentato 4 volte (come un telefono).
# Uso: python3 t_perf.py [cartella con app.html]   → per confrontare due versioni lanciarla su entrambe le cartelle.
# I caratteri di Google arrivano dopo 1,5 s (rete del telefono).
# Stampa: peso, peso compresso (quello che scarica il telefono), tempo fino alla prima schermata, tempo di calcolo JS (mediana di 5).
import asyncio,sys,gzip,statistics
from playwright.async_api import async_playwright
sys.path.insert(0,D)
import t_terr
A=sys.argv[1] if len(sys.argv)>1 else D
async def main():
    raw=open(os.path.join(A,'app.html'),'rb').read()
    print('peso app:',round(len(raw)/1024),'KB | compresso (scaricato dal telefono):',round(len(gzip.compress(raw,9))/1024),'KB')
    async with async_playwright() as p:
        b=await p.chromium.launch();R=[]
        for i in range(5):
            ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page();cdp=await ctx.new_cdp_session(pg)
            await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4});await cdp.send('Performance.enable')
            async def lenta(r):
                # rete del telefono simulata: i caratteri di Google arrivano dopo 1,5 s
                if 'fonts.googleapis' in r.request.url or 'fonts.gstatic' in r.request.url:
                    await asyncio.sleep(1.5);return await r.fulfill(status=200,content_type='text/css',body='')
                return await t_terr.route(r)
            await pg.route('**/*',lenta);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
            await pg.goto('file://'+A+'/app.html',wait_until='load')
            await pg.wait_for_function("()=>document.querySelector('#app .hscene, #app .page')",timeout=20000)
            t=await pg.evaluate("()=>{const n=performance.getEntriesByType('navigation')[0];const p=performance.getEntriesByName('first-contentful-paint')[0];return [Math.round(n.domContentLoadedEventEnd),Math.round(n.loadEventEnd),p?Math.round(p.startTime):null,Math.round(performance.now())]}")
            m={x['name']:x['value'] for x in (await cdp.send('Performance.getMetrics'))['metrics']}
            R.append((t[0],t[2] or 0,round(m.get('ScriptDuration',0)*1000)))
            await ctx.close()
        med=lambda k:round(statistics.median(r[k] for r in R))
        print('pronta (DOMContentLoaded):',med(0),'ms | prima schermata (first paint):',med(1),'ms | calcolo JS:',med(2),'ms  (processore ×4 più lento, mediana di 5)')
        await b.close()
asyncio.run(main())
