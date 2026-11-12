import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# NOTIFICHE SUBITO (migrazione 011): la notifica di un messaggio privato apre la chat (/?go=social&dm=<id>);
# quella di un'alleanza apre gli Alleati; la novità "invite_join" ha la sua riga in bacheca;
# la funzione zsh-push ha la task "feed" con titoli diversi per tipo.
import asyncio,sys,re
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
SETUP="async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_bv_done','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;closeSheet();}"
async def main():
    ts=open(D+'/supabase/functions/zsh-push/index.ts',encoding='utf-8').read()
    print('funzione:',['task === \"feed\"' in ts,all(k in ts for k in ['Messaggio da','Proposta di alleanza','Richiesta di coinquilino','Il tuo invito ha funzionato','&dm=']),'sent += await feedFor(L)' in ts])
    async with async_playwright() as p:
        b=await p.chromium.launch();E=[]
        pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();pg.on('pageerror',lambda e:E.append(str(e)[:160]))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800);await pg.evaluate(SETUP)
        await pg.evaluate("()=>{window.__DM=null;dmSheet=(u,n)=>{window.__DM=[u,n]};zGoUrl('/?go=social&dm=00000000-0000-0000-0000-0000000000b2')}");await pg.wait_for_timeout(1500)
        print('messaggio → chat:',await pg.evaluate("()=>[SOC.tab,window.__DM&&window.__DM[0]]"))
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=social&tab=squadra')}");await pg.wait_for_timeout(800)
        print('alleanza → alleati:',await pg.evaluate("()=>SOC.tab"))
        print('bacheca invito:',await pg.evaluate("()=>/è entrato con l’invito di/.test(socLine({kind:'invite_join',actor:'u2',actor_nick:'anna',target:'me',target_nick:'ale',created_at:new Date().toISOString()}))"))
        print('ERR',E);await b.close()
asyncio.run(main())
