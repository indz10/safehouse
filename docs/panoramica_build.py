import asyncio,sys
sys.path.insert(0,'/home/claude/pan')
from content import S
from playwright.async_api import async_playwright
CSS=open('/home/claude/pan/style.css').read()
async def main():
    caps=[]
    for title,body in S: caps.append(('<div class="zsec"><span class="zttl zh2">'+title+'</span></div>',body))
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':794,'height':1123})
        await pg.route('**/*',lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        await pg.add_init_script('window.__noHello=1');await pg.goto('file:///home/claude/v3/app.html');await pg.wait_for_timeout(800)
        n=await pg.evaluate("""([css,caps])=>{document.head.querySelectorAll('style,link[rel=stylesheet]').forEach(s=>s.remove());const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
          const a={...SAMPLE,porta:'b4',grate:'tutte',luci:'sensore',energia:'fv',recinzione:'muro1',cancello:'auto'};let n=1;
          const foot=k=>`<div class="zfoot"><span>ZombieSafeHouse · Panoramica totale</span><span>${k}</span><span>INDZ · ottobre 2026 · documento interno</span></div>`;
          let html=`<section class="zpg cover"><div class="ct"><span class="zttl zh1">ZombieSafeHouse</span><br><span class="zttl sub">Panoramica totale</span></div><div class="scene">${houseScene(a,{sid:'pv'})}</div>
            <div class="bub">Tutta l’app spiegata in modo semplice: casa vera, gioco, quartieri, community, sponsor. Cosa è vero, cosa è simulato, cosa decidere.</div><div class="cf">Documento interno INDZ · ottobre 2026</div></section>`;n=2;
          const meas=document.createElement('div');meas.style.cssText='position:absolute;left:-3000px;top:0;width:184mm';document.body.appendChild(meas);
          const LIM=1123-49-68-30;let cur='',h=0;const pages=[];
          caps.forEach(([t,b])=>{const parts=b.split('<div class="zcap').filter(Boolean).map(x=>'<div class="zcap'+x);let first=true;
            parts.forEach(pc=>{const blk=(first?t:'')+pc;first=false;meas.innerHTML=blk;const hh=meas.scrollHeight+4;if(h&&h+hh>LIM){pages.push(cur);cur='';h=0;}cur+=blk;h+=hh;});
            pages.push(cur);cur='';h=0;});
          meas.remove();pages.filter(Boolean).forEach(p=>{html+=`<section class="zpg">${p}${foot(n++)}</section>`;});document.body.className='';document.body.innerHTML=html;return n-1;}""",[CSS,caps])
        print('pagine',n);await pg.wait_for_timeout(400)
        await pg.pdf(path='/home/claude/pan/ZombieSafeHouse_Panoramica_totale.pdf',format='A4',print_background=True,margin={'top':'0','bottom':'0','left':'0','right':'0'})
        await b.close()
asyncio.run(main())
