import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
# 🎮 GIOCO (Fase 55, migrazione 048): tasto 🎮 Gioco → mappa stile Pokémon con strade (OpenStreetMap finto di t_terr),
# superstite che cammina per le strade verso lo zombie (percorso sul grafo), tocco sullo zombie → scheda dell'incontro,
# tocco sul superstite → missioni; tasti a lato (Lente, Vicini, Missioni…); arena col telefono girato non tagliata; round.
import asyncio,sys
sys.path.insert(0,D)
from playwright.async_api import async_playwright
import t_terr
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(**p.devices['iPhone 13']);pg=await ctx.new_page()
        E=[];pg.on('pageerror',lambda e:E.append(str(e)[:200]));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',t_terr.route);await pg.add_init_script(path=D+'/sb_mock.js');await pg.add_init_script(path=D+'/ml_stub.js');await pg.add_init_script('window.__noHello=1;window.__arnVeloce=1')
        await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(800)
        await pg.evaluate("async()=>{SB=__mockSB;localStorage.setItem('zsh_sup_intro','1');localStorage.setItem('zsh_mondo30','1');S.user={id:'me',nick:'ale'};S.pubOk=true;zSyncProfile.asked=1;G.tourAsked=1;G.tourDone=1;G.howSeen=1;"
                          "S.geo={lat:45.3255,lon:10.6582,acc:10,addr:'A',src:'gps'};S.zone=await analyzeZone('A');S.answers={...SAMPLE};S.result=computeScore(S.answers,S.zone);await wMine(true);closeSheet();await supLoad(true);S.zv='mondo';go('mappa');"
                          "const h=myHouses()[0];window.__MIS=[{tipo:'scontro',id:9,ic:'💪',titolo:'Verso Bruto · Lv 3',meta:'',lat:h.lat+0.0012,lon:h.lon+0.0015,inizio:new Date(Date.now()-300e3).toISOString(),fine:new Date(Date.now()+300e3).toISOString(),secondi:300,gemme:1}];}")
        await pg.wait_for_timeout(4000)
        print('tasto:',await pg.evaluate("()=>(document.querySelector('.sbar [data-sb=gioca]')||{}).textContent"))
        await pg.click('.sbar [data-sb=gioca]');await pg.wait_for_timeout(4000)
        print('mappa del gioco:',await pg.evaluate("()=>[!!document.getElementById('gmap'),!!GM.map,GM.map&&GM.map.o.style.layers.map(l=>l.id).filter(i=>/bld|road|water|park/.test(i)).length,[...document.querySelectorAll('#gmap .gmside small')].map(x=>x.textContent)]"))
        # strade della mappa → percorso sulle strade (grafo a croce: casa in basso a sinistra, meta in alto a destra)
        await pg.evaluate("()=>{const h=myHouses()[0];const L=(a,b)=>({properties:{class:'minor'},geometry:{type:'LineString',coordinates:[a,b]}});const o=[h.lon,h.lat],x=[h.lon+0.0015,h.lat],y=[h.lon+0.0015,h.lat+0.0012];GM.map.querySourceFeatures=()=>[L(o,x),L(x,y)];gmGraph();}")
        await pg.wait_for_timeout(500)
        # 🛣️ strade a pezzi (mattonelle): due vie con un buco di 6 m e una che finisce a metà di un'altra → si uniscono, il percorso segue le strade
        print('strade cucite:',await pg.evaluate("""()=>{const N=[[0,0],[100,0],[106,0],[200,0],[150,-60],[150,-4]];const adj=N.map(()=>[]);const e=(a,b)=>{const L=Math.hypot(N[a][0]-N[b][0],N[a][1]-N[b][1]);adj[a].push([b,L]);adj[b].push([a,L]);};
          e(0,1);e(2,3);e(4,5);gmCuci(N,adj);const old=GM.d;GM.d={N,adj};const R=gmRoute([0,5],[150,-60]);GM.d=old;return [R.length>=4,R.some(p=>p[0]===100||p[0]===106)]}"""))
        # 🏙️ modelli 3D (Fase 63): ogni mezzo, gli zombie di ogni tipo e le casse si costruiscono senza errori
        await pg.add_script_tag(path=D+'/pwa/three.min.js')
        print('modelli 3d:',await pg.evaluate("()=>{const M=['piedi','bici','moto','auto','fuori','furgone'].map(m=>g3Mezzo(m).children.length>3);const Z=['vagante','bruto','cane','re','strega','clown','soldato'].map(t=>g3Zombie({tipo:t,k:'zombie'}).children.length>3);return [M.every(Boolean),Z.every(Boolean),g3Zombie({k:'cassa'}).userData.cassa===1]}"))
        print('superstite in viaggio:',await pg.evaluate("()=>{const s=gmSup();return[!s.fermo,s.R.length>=3,/Verso/.test(s.txt),Math.round(s.f*100)]}"))

        # tocco su uno zombie → scheda dell'incontro
        await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='re'&&!z.preso);const p=gmXY(z.lat,z.lon);const q=gmScr(p[0],p[1]);gmTap(q[0],q[1]);}");await pg.wait_for_timeout(1200)
        print('tocco sullo zombie:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-arnd]')"))
        await pg.evaluate("()=>closeSheet()");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const s=gmSup();const p=gmScr(s.x,s.y);gmTap(p[0],p[1]-12);}");await pg.wait_for_timeout(1500)
        print('tocco sul superstite:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .mislist, #sheet.open .misrow')"))
        # 🧭 guidi il superstite: tocco sulla mappa → cammina (posizione al server), vicino allo zombie → combatti col superstite
        print('superstite guidato:',await pg.evaluate("()=>!!GM.av"))
        # 🔗 il Mondo nel Gioco: presidi e case degli alleati sulla mappa, tocco → loro scheda
        await pg.evaluate("()=>{window.__PRES=[];GM.mdAt=null;return gmMondoLoad()}");await pg.wait_for_timeout(500)
        print('mondo nel gioco:',await pg.evaluate("()=>[(GM.pres||[]).length>0,(GM.ally||[]).length>0]"))
        await pg.evaluate("()=>{const p=gmMondoPts().find(p=>p.k==='pres');gmTap(p.x,p.y-12,null);}");await pg.wait_for_timeout(800)
        print('tocco sul presidio:',await pg.evaluate("()=>document.querySelector('#sheet.open')!==null"))
        await pg.evaluate("()=>closeSheet()")
        await pg.evaluate("()=>{closeSheet();const z=ZM.L.find(z=>z.tipo==='bruto'&&!z.preso);gmTap(-999,-999,{lat:z.lat-0.0002,lng:z.lon});}");await pg.wait_for_timeout(4500)
        print('cammina verso lo zombie:',await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='bruto');return [Math.round(trM(GM.av.lat,GM.av.lon,z.lat,z.lon))<=50,(window.__EXPN||0)>=2]}"))
        # 🎒 un solo modo col superstite (dalla casa e col mezzo scelti): niente "Vai lì per le strade"; in viaggio si disegna il mezzo
        print('un solo tasto:',await pg.evaluate("()=>{const z=ZM.L.find(z=>z.k==='zombie'&&z.tipo!=='bruto'&&!z.preso);GM.av.lat=z.lat-0.0012;GM.av.lon=z.lon;return arnCard(z).then(()=>[!document.querySelector('#sheet.open [data-arnauto]'),!!document.querySelector('#sheet.open [data-arns]')])}"))
        await pg.evaluate("()=>closeSheet()")
        await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='bruto');GM.av.lat=z.lat-0.0002;GM.av.lon=z.lon;}")
        await pg.evaluate("()=>{const z=ZM.L.find(z=>z.tipo==='bruto');arnCard(z);}");await pg.wait_for_timeout(1200)
        print('combatti col superstite:',await pg.evaluate("()=>!!document.querySelector('#sheet.open [data-arne]')"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-arne]').click()");await pg.wait_for_timeout(1500)
        print('arena esplora:',await pg.evaluate("()=>[window.__ARNP&&window.__ARNP.p_modo,!!document.getElementById('arena')]"))
        await pg.evaluate("()=>{try{arnChiudi()}catch(e){}}")
        await pg.evaluate("()=>{closeSheet();gmClose();zmRadarSheet();}");await pg.wait_for_timeout(600)
        print('elenco toccabile:',await pg.evaluate("()=>document.querySelectorAll('#sheet.open .zmrow.zmtap').length>0"))
        await pg.evaluate("()=>[...document.querySelectorAll('#sheet.open .zmrow.zmtap')].find(r=>!/Cassa/.test(r.textContent)).click()");await pg.wait_for_timeout(1200)
        print('riga → incontro:',await pg.evaluate("()=>!!document.querySelector('#sheet.open .arncard')"))
        await pg.evaluate("()=>closeSheet()");await pg.click('.sbar [data-sb=gioca]');await pg.wait_for_timeout(1500);await pg.click('.sbar [data-sb=mondo]');await pg.wait_for_timeout(800)
        print('chiusa con Mappa:',await pg.evaluate("()=>!document.getElementById('gmap')"))
        # arena: col telefono girato la scena riempie il campo (non solo il cielo)
        await pg.evaluate("()=>{window.__ARN={sc:{zA:{id:5,zid:'zA',stato:'pronto',modo:'persona',diff:'equilibrato',arrivo:new Date().toISOString()}},id:5};arnVai(5,'💪');}");await pg.wait_for_timeout(1500)
        await pg.set_viewport_size({'width':844,'height':390});await pg.wait_for_timeout(600)
        print('arena girata:',await pg.evaluate("()=>{const f=document.querySelector('.arnfield').getBoundingClientRect(),c=ARN.g.cv.getBoundingClientRect();return[Math.round(f.height),Math.round(c.height),ARN.g.round]}"))
        await pg.evaluate("()=>{ARN.g.z.hp=1;ARN.g.p.x=ARN.g.z.x-10;ARN.g.z.act=null;ARN.g.z.blk=0;ARN.g.z.stun=1;ARN.g.p.act=null;ARN.g.p.stun=0;}");await pg.keyboard.press('j');await pg.wait_for_timeout(1500)
        print('round 2:',await pg.evaluate("()=>[ARN.g.round,ARN.g.vinti.p,(document.querySelector('[data-arnrd=p]')||{}).textContent,ARN.g.z.hp===ARN.g.z.hp0]"))
        # 🏰 fortificazioni (Fase 70): ogni difesa ha il suo modello; rivali senza livello; casa crollata = macerie
        print('fortificazioni 3d:',await pg.evaluate("()=>{const K=Object.keys(FZ_K);const n=K.map(k=>fzModello({defs:{[k]:2}}).children[0].children.length>0);const r=fzModello({defs:{recinto:0,fossato:0}});const c=fzModello({crollata:true});return [K.length,n.every(Boolean),r.children.length,c.children.length>10]}"))
        # ☣️ scenario apocalittico (Fase 70b): auto bruciate, macerie, barili in fiamme col fumo, barricate, zombie di scena
        print('apocalisse 3d:',await pg.evaluate("()=>{const sc=new THREE.Scene();const N=[[0,0],[0,40],[40,40],[40,0],[80,0],[80,40],[0,80],[40,80]],adj=N.map(()=>[]);[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,2],[1,6],[6,7],[7,2]].forEach(([a,b])=>{adj[a].push([b,40]);adj[b].push([a,40]);});const d0=GM.d;GM.d={N,adj};apoRifai(sc,20,20);const n=APO.n;GM.d=d0;return [n>0,[apoAuto(3),apoMacerie(5),apoBarile(),apoBarricata(7),apoZombie(9)].every(g=>g.children.length>2)]}"))
        # ☣️ Mondo (Fase 71): i pezzi apocalittici si mettono lungo le strade della mappa del Mondo, i più vicini al centro
        print('apocalisse mondo:',await pg.evaluate("()=>{const F=[{properties:{class:'residential'},geometry:{type:'LineString',coordinates:Array.from({length:40},(_,j)=>[10.65+j*0.0003,45.32])}},{properties:{class:'minor'},geometry:{type:'LineString',coordinates:Array.from({length:40},(_,j)=>[10.656,45.315+j*0.0003])}}];const m={querySourceFeatures:()=>F,getCenter:()=>({lat:45.32,lng:10.656}),getZoom:()=>17,getPitch:()=>0};const sc=new THREE.Scene();MWA.c0={lat:45.32,lon:10.656};MWA.g=null;mwApoRifai({sc},m);const g=MWA.g;const d=g.children.map(c=>Math.hypot(c.position.x,c.position.z));return [MWA.n>0,Math.max(...d)<450,mwApoK(m)>3]}"))
        # 🎥 vista da dietro al mezzo (Fase 69): tasto sulla mappa del Gioco → navigatore e mappa piccola → 🗺️ Mappa
        await pg.set_viewport_size({'width':390,'height':844})
        await pg.evaluate("()=>{try{arnChiudi()}catch(e){};closeSheet();if(!GM.on)gmOpen()}");await pg.wait_for_timeout(2500)
        print('vista da vicino:',await pg.evaluate("()=>{const b=document.querySelector('#gmap .vcbtn');if(!b)return null;b.click();return [!!document.querySelector('#gmap .vcnav'),!!document.querySelector('#gmap .vcmini'),VC.on]}"))
        await pg.wait_for_timeout(600)
        print('navigatore:',await pg.evaluate("()=>(document.querySelector('#gmap .vcnav')||{}).textContent"))
        await pg.evaluate("()=>document.querySelector('#gmap [data-vcout]').click()");await pg.wait_for_timeout(300)
        print('vista normale:',await pg.evaluate("()=>[VC.on,!document.querySelector('#gmap .vcnav'),!!document.querySelector('#gmap .vcbtn')]"))
        # 🎖️ pista della settimana (Fase 66): tasto sulla mappa del Gioco → scheda con tappe → riscatta
        await pg.evaluate("()=>{closeSheet();gmOpen()}");await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>document.querySelector('#gmap [data-gmb=pista]').click()");await pg.wait_for_timeout(1000)
        print('pista:',await pg.evaluate("()=>[document.querySelectorAll('#sheet.open .pst').length,document.querySelectorAll('#sheet.open .pst.ok').length,!!document.querySelector('#sheet.open [data-pstr]')]"))
        await pg.evaluate("()=>document.querySelector('#sheet.open [data-pstr]').click()");await pg.wait_for_timeout(1200)
        print('riscattata:',await pg.evaluate("()=>[window.__PISTA.presi,document.querySelectorAll('#sheet.open .pst.preso').length]"))
        print('ERR',E);await b.close()
asyncio.run(main())
