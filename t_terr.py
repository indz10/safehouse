import os;D=os.path.dirname(os.path.abspath(__file__))  # cartella del repository
import asyncio, json, math
from playwright.async_api import async_playwright
LAT,LON=45.3255,10.6582
def off(dx,dy):
    k=math.cos(LAT*math.pi/180);return LAT+dy/110540, LON+dx/(111320*k)
def elev(la,lo):  # collina a nord-est, fiume basso a sud
    k=math.cos(LAT*math.pi/180);dx=(lo-LON)*111320*k;dy=(la-LAT)*110540
    return 95+18*math.exp(-((dx-200)**2+(dy-220)**2)/(2*150**2))-4*math.exp(-((dy+300)**2)/(2*80**2))+dy*0.01
def fac():
    E=[];i=1
    def n(dx,dy,tags):
        nonlocal i;la,lo=off(dx,dy);E.append({'type':'node','id':i,'lat':la,'lon':lo,'tags':tags});i+=1
    n(300,100,{'shop':'supermarket','name':'Conad Volta'})
    n(-500,200,{'amenity':'pharmacy','name':'Farmacia Comunale'})
    n(900,-800,{'amenity':'hospital','name':'Ospedale di Esempio'})
    n(150,-60,{'shop':'hardware','name':'Ferramenta Rossi','phone':'+39 0376 111111'})
    n(-120,80,{'craft':'locksmith','name':'Fabbro Bianchi'})
    n(600,-200,{'amenity':'fuel','name':'Eni Volta'})
    n(-1200,500,{'amenity':'police','name':'Carabinieri Volta'})
    for b in range(160):
        la,lo=off((b%16-8)*28,(b//16-5)*28);E.append({'type':'way','id':5000+b,'center':{'lat':la,'lon':lo},'tags':{'building':'yes'}})
    g=[dict(zip(('lat','lon'),off(x,-280))) for x in range(-700,701,100)]
    E.append({'type':'way','id':9999,'tags':{'waterway':'river','name':'Mincio'},'geometry':g})
    return E
async def route(r):
    u=r.request.url
    if 'nominatim' in u and '/search' in u:
        return await r.fulfill(json=[{'lat':str(LAT),'lon':str(LON),'address':{'road':'Via Roma','house_number':'10','village':'Volta Mantovana'}}])
    if 'nominatim' in u and 'reverse' in u:
        return await r.fulfill(json={'address':{'road':'Via Roma','house_number':'10','village':'Volta Mantovana'}})
    if 'interpreter' in u:
        body=r.request.post_data or ''
        if 'out+body+geom' in body or 'out body geom' in body or 'body%20geom' in body or 'body+geom' in body:
            sq=[(-7,-5),(7,-5),(7,5),(-7,5),(-7,-5)];nb=[(7,-5),(17,-5),(17,5),(7,5),(7,-5)]
            g=lambda pts:[dict(zip(('lat','lon'),off(x,y))) for x,y in pts]
            return await r.fulfill(json={'elements':[{'type':'way','id':1,'nodes':[1,2,3,4,1],'tags':{'building':'house','building:levels':'2','roof:shape':'hipped'},'geometry':g(sq)},{'type':'way','id':2,'nodes':[2,5,6,3,2],'tags':{'building':'house'},'geometry':g(nb)}]})
        if 'highway' in body:
            from urllib.parse import unquote_plus
            E=[];nid=[10000]
            def node(x,y):
                nid[0]+=1;la,lo=off(x,y);return nid[0],{'lat':la,'lon':lo}
            def way(i,pts,tags,ids=None):
                g=[dict(zip(('lat','lon'),off(x,y))) for x,y in pts];E.append({'type':'way','id':i,'nodes':ids or list(range(i*100,i*100+len(pts))),'geometry':g,'tags':tags})
            # strade: griglia con nomi, nodi condivisi agli incroci
            names=['Via Roma','Viale Risorgimento','Via Mazzini','Via Cavour','Via Garibaldi','Via Custoza']
            for k,yv in enumerate([-240,-80,80,240]):
                way(1+k,[(x,yv) for x in range(-400,401,80)],{'highway':'residential' if k%2 else 'secondary','name':names[k]},[5000+k*20+j for j in range(11)])
            for k,xv in enumerate([-160,0,160]):
                pts=[(xv,y) for y in range(-400,401,80)];ids=[]
                for y in range(-400,401,80):
                    if y in (-240,-80,80,240): ids.append(5000+[-240,-80,80,240].index(y)*20+(xv+400)//80)
                    else: ids.append(7000+k*20+(y+400)//80)
                way(10+k,pts,{'highway':'tertiary','name':names[4] if k==1 else 'Via '+str(k)},ids)
            way(20,[(40+30*math.cos(a/8*6.283),40+30*math.sin(a/8*6.283)) for a in range(9)],{'highway':'primary','junction':'roundabout'})
            b=100
            for gx in range(-360,361,52):
                for gy in range(-360,361,52):
                    if abs(gx)<12 and abs(gy)<12: continue
                    if any(abs(gy-v)<20 for v in (-240,-80,80,240)) or any(abs(gx-v)<20 for v in (-160,0,160)): continue
                    w=8 if (gx+gy)%3 else 18
                    way(b,[(gx-w,gy-w),(gx+w,gy-w),(gx+w,gy+w),(gx-w,gy+w),(gx-w,gy-w)],{'building':'apartments' if w==18 else 'house'});b+=1
            way(9000,[(200,-360),(380,-360),(380,-260),(200,-260),(200,-360)],{'landuse':'farmland'})
            way(9001,[(x,-300) for x in range(-400,401,100)],{'waterway':'river','name':'Mincio'})
            la,lo=off(-60,130);E.append({'type':'node','id':77,'lat':la,'lon':lo,'tags':{'amenity':'place_of_worship','name':'Chiesa di San Martino'}})
            return await r.fulfill(json={'elements':E})
        if 'housenumber' in body: return await r.fulfill(json={'elements':[{'type':'node','id':1,'lat':LAT,'lon':LON,'tags':{'addr:street':'Via Roma','addr:housenumber':'10'}}]})
        return await r.fulfill(json={'elements':fac()})
    if 'forecast' in u:
        return await r.fulfill(json={'current':{'weather_code':61,'precipitation':1.4,'wind_speed_10m':12,'wind_gusts_10m':25,'visibility':8000,'temperature_2m':11.6,'is_day':0}})
    if 'open-meteo' in u:
        from urllib.parse import urlparse,parse_qs
        q=parse_qs(urlparse(u).query);la=[float(x) for x in q['latitude'][0].split(',')];lo=[float(x) for x in q['longitude'][0].split(',')]
        return await r.fulfill(json={'elevation':[round(elev(a,b),1) for a,b in zip(la,lo)]})
    if u.startswith('file:'): return await r.continue_()
    return await r.abort()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844},geolocation={'latitude':LAT,'longitude':LON,'accuracy':12},permissions=['geolocation'])
        pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append('console:'+m.text))
        await pg.route('**/*',route)
        await pg.add_init_script('window.__noHello=1');await pg.goto('file://'+D+'/app.html');await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{S.step=0;go('valuta')}");await pg.wait_for_timeout(400)
        await pg.click('#geoBtn');await pg.wait_for_timeout(6500)
        print('sheet:',await pg.evaluate("()=>document.querySelector('#sheet.open h3')&&document.querySelector('#sheet.open h3').textContent"),'|',await pg.evaluate("()=>(document.querySelector('#pkTxt')||{}).textContent"))
        await pg.click('[data-pkok]');await pg.wait_for_timeout(3000)
        z=await pg.evaluate("()=>({type:S.zone.type,real:!!S.zone.real,home:S.zone.real&&S.zone.real.home,pos:S.zone.real&&S.zone.real.pos,slope:S.zone.real&&S.zone.real.slope,bld:S.zone.real&&S.zone.real.bld,water:S.zone.real&&S.zone.real.water,res:S.zone.resources.map(r=>r.kind+':'+r.name+':'+r.dist),level:S.zone.level,geo:S.geo})")
        print(json.dumps(z,ensure_ascii=False,indent=0))
        await pg.screenshot(path='y1_valuta.png',full_page=False)
        tb=await pg.query_selector('.terrbox')
        if tb: await tb.screenshot(path='y2_terrbox.png')
        print('terrbox', bool(tb), 'answers', await pg.evaluate("()=>[S.answers.tipo,S.answers.piani,JSON.stringify(S.zone.real.house&&{k:S.zone.real.house.kind,l:S.zone.real.house.levels,att:S.zone.real.house.att,len:S.zone.real.house.len})]"))
        # gioco
        await pg.evaluate("()=>go('orda')");await pg.wait_for_timeout(300)
        await pg.screenshot(path='y_pick.png')
        print('vera' , await pg.evaluate("()=>HTYPES.vera&&[HTYPES.vera.name,HTYPES.vera.zl,HTYPES.vera.pitch,Object.keys(HTYPES)[0]]"))
        await pg.evaluate("()=>{const b=document.querySelector('[data-type=vera]');if(b)b.click();}");await pg.wait_for_timeout(600)
        g=await pg.evaluate("()=>({rh:G.realHood,exps:EXPS.map(x=>x.id+':'+x.n+':'+x.t+'s:'+x.d),hp:houseMaxHP(),bar:barrierMax(),terr:terrainAt(...trHomeXY()),hills:hills().length,bonus:terrBonus()})")
        print(json.dumps(g,ensure_ascii=False,indent=0))
        await pg.wait_for_timeout(1500)
        print('hq', await pg.evaluate("()=>({data:!!hqData(),slots:SLOTS.map(s=>s.id+':'+Math.round(s.x)+','+Math.round(s.y)+':'+s.name),lotsVis:LOTS.filter(l=>l.x>0).length,lotsAll:LOTS.length})"))
        h=await pg.query_selector('.hood');
        if h: await h.screenshot(path='y_hood.png')
        tp=await pg.query_selector('.terrp')
        await pg.wait_for_timeout(800);tp=await pg.query_selector('.terrp')
        print('terrp',bool(tp),await pg.evaluate("()=>[realNightEv(5),(document.querySelector('.wnight')||{}).textContent,STATS.reg]"))
        if tp: await tp.screenshot(path='y3_terrp.png')
        print('tm',await pg.evaluate("()=>G.tm&&G.tm.list.map(m=>m.k+':'+m.id+':'+m.t.replace(/<[^>]+>/g,''))"))
        await pg.evaluate("()=>{const T=G.tm;T.list.forEach(m=>{if(m.k==='exp')onExpDone(m.id,true);if(m.k==='poi'||m.k==='biz')tmEvent(m.k,m.id);if(m.k==='ev')onWaveEnd(true,3,m.id,false);if(m.k==='def'){G.q[m.id]=1;onWaveEnd(true,3,null,false);}if(m.k==='win'){onWaveEnd(true,3,null,false);onWaveEnd(true,3,null,false);}});closeSheet();renderHub();}")
        await pg.wait_for_timeout(400)
        print('done',await pg.evaluate("()=>G.tm.list.map(m=>m.done)"))
        c0=await pg.evaluate("()=>G.coins");btn=await pg.query_selector('[data-tmc]')
        if btn:
            await btn.scroll_into_view_if_needed();await btn.click();await pg.wait_for_timeout(400)
        print('riscatta: monete',c0,'->',await pg.evaluate("()=>G.coins"),'riscattate',await pg.evaluate("()=>G.tm.list.map(m=>m.cl)"))
        el=await pg.query_selector('.tmp')
        if el: await el.screenshot(path='y_tm.png')
        await pg.screenshot(path='y4_hub.png',full_page=True)
        # zone typed + battle sanity
        await pg.evaluate("()=>{G.view='battle';renderOrda();}");await pg.wait_for_timeout(2500)
        await pg.screenshot(path='y5_battle.png')
        print('ERR',errs[:8]);await b.close()
if __name__=='__main__': asyncio.run(main())
