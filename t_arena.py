import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🧟 ARENA (Fase 53, migrazione 046): tocco sullo zombie della mappa → scheda dell'incontro (difficoltà, statistiche,
# 📍 di persona entro 80 m + GPS, 🎒 manda il superstite col viaggio); di persona → passaggio → arena: barre della vita,
# colpi, parata, schivata, speciale, tastiera, avviso "gira il telefono", vittoria con premi; superstite in viaggio →
# avviso in alto con 💎, arrivato → ⚔️ Combatti; notifica ?scontro=<id>; scappa = abbandono.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(**p.devices['iPhone 13'],permissions=['geolocation'],geolocation={'latitude':45.3255,'longitude':10.6582,'accuracy':10});pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__arnVeloce=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_kit_me','1');localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);"
                          "await wMine(true);closeSheet();await resLoad(true);await supLoad(true);S.zv='mondo';go('mappa');}")
        await pg.wait_for_timeout(6500)
        await pg.evaluate("()=>{const z=[...document.querySelectorAll('.lm-zm:not(.cassa)')][0];z.click();}");await pg.wait_for_timeout(1200)
        print('scheda incontro:',await pg.evaluate("()=>[document.querySelectorAll('#sheet.open [data-arnd]').length,!!document.querySelector('#sheet.open [data-arnp]'),!!document.querySelector('#sheet.open [data-arns]'),(document.querySelector('#sheet.open .arnvia')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arnd=difficile]').click()");await pg.wait_for_timeout(200)
        print('difficile:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .arndiff .on')||{}).textContent,(document.querySelector('#sheet.open .arnzc b:not(.arnzic)')||{}).textContent]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arnp]').click()");await pg.wait_for_timeout(1500)
        print('partito di persona:',await pg.evaluate("()=>[window.__ARNP&&window.__ARNP.p_modo,window.__ARNP&&window.__ARNP.p_diff,!!document.getElementById('arena')]"))
        print('gira il telefono:',await pg.evaluate("()=>document.querySelector('#arena [data-arnrot]').classList.contains('on')"))
        await pg.evaluate("()=>document.querySelector('#arena [data-arnrotok]').click()");await pg.set_viewport_size({'width':844,'height':390});await pg.wait_for_timeout(500)
        print('orizzontale:',await pg.evaluate("()=>[document.querySelector('#arena [data-arnrot]').classList.contains('on'),document.querySelectorAll('#arena [data-arnk]').length,(document.querySelector('#arena [data-arnhpt=z]')||{}).textContent]"))
        # avvicinati col tasto ▶ e colpisci (anche con la tastiera); para e schiva
        await pg.evaluate("()=>{ARN.g.p.x=ARN.g.z.x-12;}")
        for i in range(4):
            await pg.keyboard.press('j');await pg.wait_for_timeout(600)
        await pg.evaluate("()=>{const b=document.querySelector('#arena [data-arnk=sp]');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));}");await pg.wait_for_timeout(300)
        print('colpi:',await pg.evaluate("()=>[ARN.g.colpi,ARN.g.z.hp<ARN.g.z.hp0,(document.querySelector('#arena [data-arncd]')||{}).textContent!=='']"))
        c0=await pg.evaluate("()=>{ARN.g.p.x=ARN.g.z.x-14;ARN.g.z.blk=0;ARN.g.z.act=null;ARN.g.z.stun=1;ARN.g.p.act=null;ARN.g.p.stun=0;return ARN.g.colpi}")
        await pg.keyboard.press('k');await pg.wait_for_timeout(600)
        print('calcio a segno:',await pg.evaluate("c=>ARN.g.colpi>c",c0))
        await pg.evaluate("()=>{ARN.g.p.x=ARN.g.z.x-11;ARN.g.z.cd=0;}");await pg.wait_for_timeout(3500)
        print('lo zombie attacca:',await pg.evaluate("()=>ARN.g.p.hp<ARN.g.p.hp0"))
        await pg.keyboard.down('x');await pg.wait_for_timeout(300);blk=await pg.evaluate("()=>ARN.g.k.blk");await pg.keyboard.up('x')
        await pg.keyboard.press('l');await pg.wait_for_timeout(100)
        print('para e schiva:',blk,await pg.evaluate("()=>ARN.g.p.inv>0||ARN.g.dodCd>0"))
        # 🕹️ salto, abbassati (schiva i colpi alti), combo TRIPLA, mosse del tipo di zombie
        await pg.evaluate("()=>{const p=ARN.g.p;p.act=null;p.stun=0;p.dash=0;p.down=0;p.hit=0;}");await pg.wait_for_timeout(900)
        await pg.keyboard.press('ArrowUp');await pg.wait_for_timeout(120)
        print('salto:',await pg.evaluate("()=>ARN.g.p.y>0"));await pg.wait_for_timeout(900)
        sc=await pg.evaluate("()=>{const g=ARN.g,p=g.p,z=g.z;p.act=null;p.stun=0;p.down=0;p.hit=0;g.k.dn=1;z.act=null;z.stun=0;z.down=0;z.x=p.x+12;z.dir=-1;z.cd=9;const h=p.hp;z.act={k:'graffio',t:0,hit:false};return h}")
        await pg.wait_for_timeout(900)
        print('abbassato schiva:',await pg.evaluate("h=>{ARN.g.k.dn=0;return ARN.g.p.hp===h}",sc))
        await pg.evaluate("()=>{const g=ARN.g,p=g.p,z=g.z;z.act=null;z.stun=3;z.blk=0;z.down=0;z.cd=9;p.act=null;p.stun=0;p.down=0;p.hit=0;p.dash=0;p.x=z.x-14;g.seq=[];}")
        for k in ['j','j','k']:
            await pg.evaluate("()=>{ARN.g.p.act=null;}");await pg.keyboard.press(k);await pg.wait_for_timeout(60)
        print('combo a schermo:',await pg.evaluate("()=>[document.querySelectorAll('#arena .arncombo div').length,(()=>{const t=performance.now()/1000;ARN.g.seq=[['atk',t],['atk',t]];arnCombo();const r=document.querySelector('#arena .arncombo div.va');ARN.g.seq=[];return r&&r.textContent})(),ARN_ROUND]"))
        print('combo tripla:',await pg.evaluate("()=>(ARN.g.p.act&&ARN.g.p.act.k)||(ARN.g.txt&&ARN.g.txt.t)"))
        await pg.wait_for_timeout(900)
        print('mosse zombie:',await pg.evaluate("()=>[ARN_ZM.cane[0].includes('balzo'),ARN_ZM.sputatore[1].includes('sputo'),ARN_MV.schianto.ub===1,typeof arnSnd]"))
        await pg.evaluate("()=>{ARN.g.vinti.p=1;ARN.g.z.hp=1;ARN.g.z.down=0;ARN.g.p.down=0;ARN.g.k.dn=0;ARN.g.z.act=null;ARN.g.z.blk=0;ARN.g.z.stun=1;ARN.g.p.act=null;ARN.g.p.stun=0;ARN.g.p.dash=0;ARN.g.p.x=ARN.g.z.x-10;}");await pg.keyboard.press('j');await pg.wait_for_timeout(1200)
        print('casa vicina:',await pg.evaluate("()=>[!!document.querySelector('#arena [data-arncasa]'),(document.querySelector('#arena .arncasa')||{}).textContent]"))
        print('vittoria:',await pg.evaluate("()=>[(document.querySelector('#arena .arnrc .disp')||{}).textContent,document.querySelectorAll('#arena .arnpremi span').length,window.__ARNF&&window.__ARNF.p_esito]"))
        await pg.evaluate("()=>document.querySelector('#arena [data-arnchiudi]').click()");await pg.wait_for_timeout(300)
        await pg.set_viewport_size({'width':390,'height':844})
        # 🎒 col superstite: viaggio → avviso in alto → 💎 arriva subito → Combatti
        await pg.evaluate("()=>arnCard({id:'z9_9_1',tipo:'bruto',lat:45.33,lon:10.66,k:'zombie'})");await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('scegli il mezzo:',await pg.evaluate("()=>[(document.querySelector('#sheet.open .mzchip')||{}).textContent||null,document.querySelector('#sheet.open [data-arns]').dataset.km]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open .mzchip').click()");await pg.wait_for_timeout(1000)
        print('mezzi:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .mzpick [data-mz]').length"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arns]').click()");await pg.wait_for_timeout(1500)
        print('in viaggio:',await pg.evaluate("()=>[window.__ARNP.p_modo,(document.querySelector('#arnban span')||{}).textContent,!!document.querySelector('#arnban [data-arnbsub]')]"))
        await pg.evaluate("()=>document.querySelector('#arnban [data-arnbsub]').click()");await pg.wait_for_timeout(1500)
        print('arrivato:',await pg.evaluate("()=>[!!window.__ARNSUB,(document.querySelector('#arnban span')||{}).textContent,!!document.querySelector('#arnban [data-arnbgo]')]"))
        await pg.evaluate("()=>document.querySelector('#arnban [data-arnbgo]').click()");await pg.wait_for_timeout(1500)
        print('arena col superstite:',await pg.evaluate("()=>!!document.getElementById('arena')"))
        await pg.evaluate("()=>document.querySelector('#arena [data-arnx]').click()");await pg.wait_for_timeout(1200)
        print('scappato:',await pg.evaluate("()=>[window.__ARNF.p_esito,(document.querySelector('#arena .arnrc .disp')||{}).textContent]"))
        await pg.evaluate("()=>arnChiudi()")
        # notifica ?scontro=<id>
        await pg.evaluate("()=>{__ARN.sc.zN={id:77,zid:'zN',stato:'pronto',modo:'superstite',diff:'facile',arrivo:new Date().toISOString()};zGoUrl('/?go=mappa&scontro=77');}");await pg.wait_for_timeout(3500)
        print('dalla notifica:',await pg.evaluate("()=>!!document.getElementById('arena')"))
        print('ERR',E);await b.close()
asyncio.run(main())
