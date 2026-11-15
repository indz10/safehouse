import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# IL SUPERSTITE CHE CRESCE (migrazione 020): pulsante 🎖️ nella barra delle scorte, scheda con grado, energia, serie, abilità;
# spedizioni nei posti veri (OpenStreetMap finto) → parti → torna → raccogli; attrezzi; guida 🧭; menu ☰; condividi sui social.
import asyncio,sys,json
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
POI={'elements':[{'type':'node','id':1,'lat':45.3275,'lon':10.6582,'tags':{'shop':'supermarket','name':'Coop Volta'}},
  {'type':'node','id':2,'lat':45.3235,'lon':10.6600,'tags':{'shop':'hardware','name':'Ferramenta Rossi'}},
  {'type':'node','id':3,'lat':45.3300,'lon':10.6550,'tags':{'amenity':'fuel','name':'Q8'}},
  {'type':'node','id':4,'lat':45.3260,'lon':10.6620,'tags':{'amenity':'pharmacy','name':'Farmacia Centrale'}},
  {'type':'way','id':5,'center':{'lat':45.5,'lon':10.6582},'tags':{'leisure':'park','name':'Parco Lontano'}}]}
async def route(r):
    if 'interpreter' in r.request.url and 'supermarket' in (r.request.post_data or ''):
        await asyncio.sleep(4)
        return await r.fulfill(status=200,content_type='application/json',body=json.dumps(POI))
    return await t_terr.route(r)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await (await b.new_context(**p.devices['iPhone 13'])).new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]))
        await pg.route('**/*',route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await orLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(3500)
        # la prima volta: il tondo "Tu" in basso a sinistra apre la spiegazione in 3 passi
        print('tondo Tu:',await pg.evaluate("()=>{const b=document.querySelector('.supme');return b?[b.textContent.trim(),getComputedStyle(b).display]:null}"))
        await pg.evaluate("()=>document.querySelector('.supme').click()");await pg.wait_for_timeout(1200)
        print('intro:',await pg.evaluate("()=>document.querySelector('#sheet.open .supintro b').textContent"))
        for i in range(3):
            await pg.evaluate("()=>document.querySelector('#sheet.open [data-spin]').click()");await pg.wait_for_timeout(1500)
        print('dopo intro:',await pg.evaluate("()=>[localStorage.getItem('zsh_sup_intro'),SUP.tab]"))
        await pg.evaluate("()=>{closeSheet();supSheet('io')}");await pg.wait_for_timeout(1500)
        print('adesso:',await pg.evaluate("()=>[document.querySelector('#sheet.open .supinfo b').textContent,(document.querySelector('#sheet.open .supnow b')||{}).textContent]"))
        print('tu sulla mappa:',await pg.evaluate("()=>!!document.querySelector('.lm-me')"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(500)
        print('pulsante superstite:',await pg.evaluate("()=>{const b=document.querySelector('.mwtop [data-trsup]');return b?b.textContent.trim():null}"))
        await pg.evaluate("()=>document.querySelector('.mwtop [data-trsup]').click()");await pg.wait_for_timeout(1500)
        print('scheda:',await pg.evaluate("()=>[document.querySelector('#sheet.open .supinfo b').textContent,document.querySelector('#sheet.open .supen b').textContent,document.querySelectorAll('#sheet.open .supab').length,document.querySelectorAll('#sheet.open .supserie span.ok').length]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-spserie]').click()");await pg.wait_for_timeout(1500)
        print('serie presa:',await pg.evaluate("()=>[__SUP.serie_oggi,!document.querySelector('#sheet.open [data-spserie]'),document.querySelectorAll('#sheet.open .supserie span.ok').length]"))
        print('punti liberi:',await pg.evaluate("()=>SUP.d.punti"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-spab=resistenza]').click()");await pg.wait_for_timeout(1500)
        print('abilità resistenza:',await pg.evaluate("()=>[__SUP.abil.resistenza,SUP.d.energia_max]"))
        # spedizioni: subito gli sponsor e i posti già noti, anche con OpenStreetMap lento
        await pg.evaluate("()=>{SP_GEO.zz={lat:45.3262,lon:10.6590,id:'s1'};SPONSORS.zz=SPONSORS.zz||{name:'Ferramenta Sponsor',cat:'Ferramenta'};window.__OVP_LENTO=1}")
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-spt=sped]').click()");await pg.wait_for_timeout(1200)
        print('subito (OSM lento):',await pg.evaluate("()=>[[...document.querySelectorAll('#sheet.open .supp b')].map(x=>x.textContent),!!document.querySelector('#sheet.open .supst')]"))
        await pg.evaluate("()=>{window.__OVP_LENTO=0}");await pg.wait_for_timeout(6000)
        L=await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .supp')].map(x=>[x.querySelector('b').textContent,x.querySelector('button').textContent.trim(),x.classList.contains('off')])")
        print('posti veri:',L)
        await pg.evaluate("()=>{const b=[...document.querySelectorAll('#sheet.open .supp')].find(x=>/Coop/.test(x.textContent)).querySelector('[data-spgo]');b.click()}");await pg.wait_for_timeout(1800)
        print('partito:',await pg.evaluate("()=>[__SUP.sp.length,__SUP.sp[0]&&__SUP.sp[0].kind,document.querySelectorAll('#sheet.open .suprun').length,[...document.querySelectorAll('#sheet.open [data-spgo]')].every(b=>b.disabled)]"))
        await pg.evaluate("()=>{__SUP.sp[0].end_at=new Date(Date.now()-1000).toISOString();SUP.t=0;supSheet('sped')}");await pg.wait_for_timeout(1800)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-sprac]').click()");await pg.wait_for_timeout(1800)
        print('raccolto:',await pg.evaluate("()=>[__SUP.sp[0].stato,document.querySelectorAll('#sheet.open .supes').length]"))
        # attrezzi
        await pg.evaluate("()=>{RES.d=Object.assign({},RES.d,{legno:100});W.m.mattoni=500;supSheet('eq')}");await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-speq=zaino]').click()");await pg.wait_for_timeout(1500)
        print('zaino:',await pg.evaluate("()=>__SUP.equip.zaino"))
        await pg.evaluate("()=>supSheet('come')");await pg.wait_for_timeout(1200)
        print('come si cresce:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .supcome h4').length"))
        # guida e menu
        await pg.evaluate("async()=>{closeSheet();__SUP.serie_oggi=false;__SUP.energia=10;await supLoad(true);await gdLoad(true);gdSheet()}");await pg.wait_for_timeout(2000)
        print('nella guida:',await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .gdcard .gdtx>b')].map(x=>x.textContent).filter(t=>/Serie|Energia|superstite|abilità/.test(t))"))
        await pg.evaluate("()=>{closeSheet();zmOpen()}");await pg.wait_for_timeout(600)
        print('menu:',await pg.evaluate("()=>[...document.querySelectorAll('#zmenu .zmrow')].map(r=>r.textContent).filter(t=>/superstite|Condividi/.test(t)).length"))
        await pg.evaluate("()=>{try{zmClose()}catch(e){}}")
        # condividi
        await pg.evaluate("()=>{closeSheet();shareSheet()}");await pg.wait_for_timeout(2500)
        print('condividi:',await pg.evaluate("()=>[document.querySelectorAll('#sheet.open .shrb').length,!!document.querySelector('#sheet.open .shrimg img'),(document.querySelector('#sheet.open .shr-wa')||{}).href.slice(0,40),/invito=me/.test(document.querySelector('#sheet.open .invl input').value)]"))
        await pg.evaluate("()=>{const a=document.querySelector('#sheet.open .shr-wa');a.removeAttribute('href');a.click()}");await pg.wait_for_timeout(1200)
        print('premio condivisione:',await pg.evaluate("()=>[__SUP.share_oggi,window.__SHARE]"))
        # notifica ?sup=1
        await pg.evaluate("()=>{closeSheet();zGoUrl('/?go=mappa&sup=1')}");await pg.wait_for_timeout(2500)
        print('dalla notifica:',await pg.evaluate("()=>[S.tab,SUP.tab,!!document.querySelector('#sheet.open .supbox')]"))
        # casa non registrata nel mondo (condomini): pulsante per registrarla
        await pg.evaluate("()=>{closeSheet();window.__NOHOME=true;const h=myHouses().find(x=>x.home);houseSheet(h)}");await pg.wait_for_timeout(9000)
        print('casa non registrata:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-abclaim]')"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-abclaim]').click()");await pg.wait_for_timeout(2500)
        print('registrata:',await pg.evaluate("()=>[!!window.__CLAIM,!document.querySelector('#sheet.open [data-abclaim]')]"))
        print('ERR',E);await b.close()
asyncio.run(main())
