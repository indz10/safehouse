<script>
/* =========================================================
   CASE VERE A FUMETTO
   Pianta reale, piani, tetto e colori da OpenStreetMap, vicini veri intorno,
   prospettiva obliqua con contorni spessi e ombre a due toni.
   Rinforzi visibili: dalla valutazione (porta blindata, grate, vetri, luci, allarme,
   recinzione) e dal gioco (case preparate, livello, alleati che aiutano).
   ========================================================= */
const RH={};const INKC='#140f1f';
/* ---- dati dell'edificio vero ---- */
async function bGeom(lat,lon){const k='zsh_bg2_'+lat.toFixed(5)+'_'+lon.toFixed(5);if(RH[k])return RH[k];try{const c=localStorage.getItem(k);if(c){RH[k]=JSON.parse(c);return RH[k];}}catch(e){}
  let els=null;try{els=await trOverpass(`[out:json][timeout:20];(way(around:70,${lat},${lon})["building"];way(around:70,${lat},${lon})["leisure"="swimming_pool"];);out tags geom 60;`,15000,60);}catch(e){}
  if(!els||!els.length)return null;const kx=111320*Math.cos(lat*Math.PI/180),ky=110540;
  const POOLS=els.filter(e=>e.tags&&e.tags.leisure==='swimming_pool'&&e.geometry&&e.geometry.length>=4).map(e=>({p:e.geometry.map(g=>[Math.round((g.lon-lon)*kx*10)/10,Math.round((g.lat-lat)*ky*10)/10])}));
  const B=els.filter(e=>e.geometry&&e.geometry.length>=4&&!(e.tags&&e.tags.leisure)).map(e=>{let p=e.geometry.map(g=>[(g.lon-lon)*kx,(g.lat-lat)*ky]);if(p.length>1&&p[0][0]===p[p.length-1][0]&&p[0][1]===p[p.length-1][1])p.pop();
      if(p.length>40){const st=Math.ceil(p.length/40);p=p.filter((_,i)=>i%st===0);}const t=e.tags||{};return{p:p.map(q=>[Math.round(q[0]*10)/10,Math.round(q[1]*10)/10]),lv:+t['building:levels']||0,roof:t['roof:shape']||'',col:t['building:colour']||'',rcol:t['roof:colour']||'',b:t.building||'',mat:t['building:material']||''};});
  if(!B.length)return null;
  const inside=(p)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[xi,yi]=p[i],[xj,yj]=p[j];if((yi>0)!==(yj>0)&&0<(xj-xi)*(0-yi)/(yj-yi)+xi)c=!c;}return c;};
  const cen=p=>[p.reduce((s,q)=>s+q[0],0)/p.length,p.reduce((s,q)=>s+q[1],0)/p.length];
  let mi=B.findIndex(b=>inside(b.p));if(mi<0){let bd=1e9;B.forEach((b,i)=>{const c=cen(b.p);const d=Math.hypot(c[0],c[1]);if(d<bd){bd=d;mi=i;}});if(bd>60)return null;}
  const out={main:B[mi],near:B.filter((b,i)=>i!==mi&&Math.hypot(...cen(b.p))<55).slice(0,10),pools:POOLS.filter(q=>Math.hypot(...cen(q.p))<45).slice(0,3)};RH[k]=out;try{localStorage.setItem(k,JSON.stringify(out));}catch(e){}return out;}
/* ---- disegno ---- */
const PLASTER=['#efe0c4','#f2e6d0','#e9c9a0','#dcb48c','#f3ece2','#d6dcc8','#e8c4b4','#f0d9a8'];
function shade(hex,f){try{const n=parseInt(hex.slice(1),16);const r=Math.round(((n>>16)&255)*f),g=Math.round(((n>>8)&255)*f),b=Math.round((n&255)*f);return'#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}catch(e){return hex;}}
function colOf(c,fb){if(!c)return fb;if(/^#[0-9a-f]{6}$/i.test(c))return c;const N={white:'#f3ece2',beige:'#e9d6b0',yellow:'#efd27a',orange:'#e9a96a',red:'#c4553f',brown:'#9a6a46',grey:'#a8a8ad',gray:'#a8a8ad',pink:'#e8b4b4',green:'#b9c9a0',blue:'#a9c4dc',cream:'#f2e6c8'};return N[String(c).toLowerCase()]||fb;}
function area(p){let a=0;for(let i=0;i<p.length;i++){const[x1,y1]=p[i],[x2,y2]=p[(i+1)%p.length];a+=x1*y2-x2*y1;}return a/2;}
/* geo: dati edificio; o: {lvl, a (risposte), prep, helps, seed, k, home} */
function realHouseSVG(geo,o={}){const m=geo.main;const lvl=o.lvl||1,a=o.a||{};const prep=!!o.prep;
  /* orientamento: lato più lungo davanti */
  let best=0,ang=0;m.p.forEach((q,i)=>{const r=m.p[(i+1)%m.p.length];const L=Math.hypot(r[0]-q[0],r[1]-q[1]);if(L>best){best=L;ang=Math.atan2(r[1]-q[1],r[0]-q[0]);}});
  const ca=Math.cos(-ang),sa=Math.sin(-ang);const rot=p=>p.map(([x,y])=>[x*ca-y*sa,x*sa+y*ca]);
  const prep2=b=>{let p=rot(b.p);if(area(p)<0)p.reverse();return{...b,q:p};};const M=prep2(m);const NB=geo.near.map(prep2);const PL=(geo.pools||[]).map(b=>({q:rot(b.p)}));
  /* se dopo la rotazione la facciata lunga è dietro, giro di 180° */
  {const ys=M.q.map(q=>q[1]);const mid=(Math.min(...ys)+Math.max(...ys))/2;const fr=M.q.filter(q=>q[1]<mid).length;if(fr<M.q.length/2-1){[M,...NB,...PL].forEach(b=>{b.q=b.q.map(([x,y])=>[-x,-y]);});}}
  const lvH=b=>{const lv=b.lv||(b===m?(/apartments|residential/.test(b.b)?4:2):2);return Math.max(1,Math.min(12,lv));};
  const K=.55,S=(x,y,z)=>[x+K*y,-(K*y)-z];
  const els=[];const H=b=>lvH(b)*3;
  const wallCol=o.col||colOf(m.col,PLASTER[bhash(o.seed||'x')%PLASTER.length]);
  const roofType=b=>{const r=(b.roof||'').toLowerCase();if(/flat/.test(r))return'flat';if(/gabled|hipped|pyramidal|half-hipped|skillion/.test(r))return r.includes('gabl')?'gabled':'hipped';
    const xs=b.q.map(q=>q[0]),ys=b.q.map(q=>q[1]);const bb=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));const ar=Math.abs(area(b.q));if(lvH(b)>=5||ar>600)return'flat';return ar/bb>.82?'gabled':'hipped';};
  const poly=(pts,fill,extra='')=>`<path d="M${pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')}Z" fill="${fill}" stroke="${INKC}" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${extra}/>`;
  const sgn=pts=>{let s=0;for(let i=0;i<pts.length;i++){const[x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];s+=x1*y2-x2*y1;}return s;};
  function drawB(b,isMain){const h=H(b);const wc=isMain?wallCol:'#6c6396',wd=isMain?shade(wallCol,.78):'#564d80';const rc=isMain?colOf(b.rcol,roofType(b)==='flat'?'#8a8f98':'#b5523b'):'#463e6e';
    const W=[];b.q.forEach((q,i)=>{const r=b.q[(i+1)%b.q.length];const quad=[S(q[0],q[1],0),S(r[0],r[1],0),S(r[0],r[1],h),S(q[0],q[1],h)];if(sgn(quad)<0)W.push({q,r,quad,d:(q[1]+r[1])/2,east:(r[1]-q[1])>Math.abs(r[0]-q[0])*.3});});
    W.sort((x,y)=>y.d-x.d);let out='';const front=[];
    W.forEach(w=>{out+=poly(w.quad,w.east?wd:wc);if(!isMain)return;front.push(w);
      {const Z=(z)=>[S(w.q[0],w.q[1],z),S(w.r[0],w.r[1],z)];const zb=[S(w.q[0],w.q[1],0),S(w.r[0],w.r[1],0),S(w.r[0],w.r[1],.55),S(w.q[0],w.q[1],.55)];out+=poly(zb,shade(w.east?wd:wc,.72),'stroke-width="1.2"');
       for(let f=1;f<lvH(b);f++){const[A,B2]=Z(f*3-.05);out+=`<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B2[0].toFixed(1)} ${B2[1].toFixed(1)}" stroke="${shade(w.east?wd:wc,.7)}" stroke-width="2.4" vector-effect="non-scaling-stroke"/>`;}}
      /* finestre su ogni piano */
      const L=Math.hypot(w.r[0]-w.q[0],w.r[1]-w.q[1]);const n=Math.max(1,Math.floor(L/3.4));const fl=lvH(b);
      for(let f=0;f<fl;f++)for(let j=0;j<n;j++){const t0=(j+.5)/n-.6/L,t1=(j+.5)/n+.6/L;const P=(t,z)=>S(w.q[0]+(w.r[0]-w.q[0])*t,w.q[1]+(w.r[1]-w.q[1])*t,z);const z0=f*3+.9,z1=f*3+2.2;
        const quad=[P(t0,z0),P(t1,z0),P(t1,z1),P(t0,z1)];const night=!!o.night;const glass=a.vetri==='anti'?'#a9d8ee':night?'#f7d64a':'#7fa7c4';
        const sw=(t1-t0)*.55;const sh=w.east?'#4f6b4a':'#5f8a57';[[t0-sw-.004,t0-.004],[t1+.004,t1+sw+.004]].forEach(([u0,u1])=>{out+=poly([P(u0,z0),P(u1,z0),P(u1,z1),P(u0,z1)],sh,'stroke-width="1.2"');});
        out+=poly(quad,'#f6f1e7','stroke-width="1.4"');const ins=(t1-t0)*.14;out+=poly([P(t0+ins,z0+.12),P(t1-ins,z0+.12),P(t1-ins,z1-.12),P(t0+ins,z1-.12)],glass,'stroke-width="1"');
        {const A=P(t0-.01,z0-.05),B2=P(t1+.01,z0-.05);out+=`<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B2[0].toFixed(1)} ${B2[1].toFixed(1)}" stroke="#d9d2c3" stroke-width="3" vector-effect="non-scaling-stroke"/>`;}
        if(f===0&&(a.grate==='tutte'||(a.grate==='alcune'&&j%2===0)))for(let g=1;g<4;g++){const tt=t0+(t1-t0)*g/4;const A=P(tt,z0-.1),B=P(tt,z1+.1);out+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="${INKC}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;}
        if(f===0&&prep){[z0+(z1-z0)*.33,z0+(z1-z0)*.7].forEach(zz=>{const A=P(t0-.03,zz),B=P(t1+.03,zz+.08);out+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="#7a5230" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="#c08a52" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;});}}});
    /* tetto */
    const rt=roofType(b);const top=b.q.map(q=>S(q[0],q[1],h));
    if(rt==='flat'){out+=poly(top,rc);if(isMain)out+=poly(b.q.map(q=>S(q[0],q[1],h+.6)),'none','stroke-width="1.4" opacity=".6"');}
    else if(rt==='gabled'){const xs=b.q.map(q=>q[0]),ys=b.q.map(q=>q[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),ym=(y0+y1)/2,rh=Math.min(4.5,(y1-y0)*.45);
      out+=poly([S(x0,ym,h+rh),S(x1,ym,h+rh),S(x1,y1,h),S(x0,y1,h)],shade(rc,.8));out+=poly([S(x1,y0,h),S(x1,y1,h),S(x1,ym,h+rh)],wd);out+=poly([S(x0,y0,h),S(x1,y0,h),S(x1,ym,h+rh),S(x0,ym,h+rh)],rc);
      if(isMain){for(let t=.2;t<.95;t+=.2){const yy=y0+(ym-y0)*t,zz=h+rh*t;const A=S(x0,yy,zz),B2=S(x1,yy,zz);out+=`<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B2[0].toFixed(1)} ${B2[1].toFixed(1)}" stroke="${shade(rc,.72)}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;}
        const n=Math.max(4,Math.round((x1-x0)/1.4));for(let i=1;i<n;i++){const xx=x0+(x1-x0)*i/n;const A=S(xx,y0,h),B2=S(xx,ym,h+rh);out+=`<path d="M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B2[0].toFixed(1)} ${B2[1].toFixed(1)}" stroke="${shade(rc,.8)}" stroke-width="1" opacity=".55" vector-effect="non-scaling-stroke"/>`;}}
      if(isMain&&b.lv<=3){const cx=x0+(x1-x0)*.72,cy=y0+(ym-y0)*.5;const ch=[S(cx,cy,h+rh*.5),S(cx+.9,cy,h+rh*.5),S(cx+.9,cy,h+rh+1.2),S(cx,cy,h+rh+1.2)];out+=poly(ch,shade(rc,.7));}}
    else{const c=[b.q.reduce((s,q)=>s+q[0],0)/b.q.length,b.q.reduce((s,q)=>s+q[1],0)/b.q.length];const ap=S(c[0],c[1],h+3);const F=[];
      b.q.forEach((q,i)=>{const r=b.q[(i+1)%b.q.length];F.push({pts:[S(q[0],q[1],h),S(r[0],r[1],h),ap],d:(q[1]+r[1])/2,f:(r[1]-q[1])>0?.85:1});});F.sort((x,y)=>y.d-x.d);F.forEach(f=>{out+=poly(f.pts,shade(rc,f.f));});}
    return{svg:out,front,h};}
  /* ordine: dal più lontano */
  const all=[...NB.map(b=>({b,main:false})),{b:M,main:true}].sort((x,y)=>{const cy=b=>b.q.reduce((s,q)=>s+q[1],0)/b.q.length;return cy(y.b)-cy(x.b);});
  let body='';let mainInfo=null;all.forEach(x=>{const r=drawB(x.b,x.main);body+=r.svg;if(x.main)mainInfo=r;});
  /* porta, luci, allarme, recinzione, alleati, scudo (sulla facciata principale) */
  let deco='';const fw=(mainInfo&&mainInfo.front||[]).filter(w=>!w.east).sort((x,y)=>Math.hypot(y.r[0]-y.q[0],y.r[1]-y.q[1])-Math.hypot(x.r[0]-x.q[0],x.r[1]-x.q[1]))[0];
  let doorPt=null;
  if(fw){const L=Math.hypot(fw.r[0]-fw.q[0],fw.r[1]-fw.q[1]);const P=(t,z)=>S(fw.q[0]+(fw.r[0]-fw.q[0])*t,fw.q[1]+(fw.r[1]-fw.q[1])*t,z);const tc=.5+((bhash(o.seed||'d')%3)-1)*.18,dw=.65/L;
    const steel=a.porta==='blindata'||a.porta==='b4';const dq=[P(tc-dw,0),P(tc+dw,0),P(tc+dw,2.3),P(tc-dw,2.3)];deco+=poly(dq,steel?'#7c8794':'#8a5a34');doorPt=P(tc,0);
    if(steel){[.6,1.2,1.8].forEach(z=>{const A=P(tc-dw*.7,z),B=P(tc+dw*.7,z);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="${INKC}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;});}
    if(prep){[.7,1.6].forEach(z=>{const A=P(tc-dw*1.5,z),B=P(tc+dw*1.5,z+.25);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="#a0703f" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;});}
    const kn=P(tc+dw*.6,1.15);deco+=`<circle cx="${kn[0]}" cy="${kn[1]}" r=".25" fill="#f7d64a"/>`;
    if(a.luci==='sensore'||lvl>=2){const lp=P(tc+dw*2.2,2.6);deco+=`<path d="M${lp[0]} ${lp[1]}L${lp[0]-3} ${lp[1]+5}L${lp[0]+3} ${lp[1]+5}Z" fill="#f7d64a" opacity=".35"/><circle cx="${lp[0]}" cy="${lp[1]}" r=".45" fill="#f7d64a" stroke="${INKC}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;}
    if(a.allarme==='allarme'||a.allarme==='cam'){const sp=P(.1,mainInfo.h-.9);deco+=`<rect x="${sp[0]}" y="${sp[1]-.8}" width="1" height=".8" fill="#d7263d" stroke="${INKC}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
      if(a.allarme==='cam'){const cp=P(.9,mainInfo.h-.7);deco+=`<path d="M${cp[0]} ${cp[1]}h.9v.5h-.9z" fill="#3d405b" stroke="${INKC}" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;}}
    /* recinzione davanti */
    if(lvl>=3||(a.recinzione&&a.recinzione!=='no')){const xs=M.q.map(q=>q[0]),ys=M.q.map(q=>q[1]);const yF=Math.min(...ys)-3;const x0=Math.min(...xs)-2,x1=Math.max(...xs)+2;
      for(let x=x0;x<=x1;x+=1.1){const A=S(x,yF,0),B=S(x,yF,1.1);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="${INKC}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`;}
      const A=S(x0,yF,.7),B=S(x1,yF,.7);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="#cfc6e6" stroke-width="3" vector-effect="non-scaling-stroke"/>`;}
    /* alleati davanti alla porta */
    const n=Math.min(3,o.helps||0);for(let i=0;i<n;i++){const pp=S(fw.q[0]+(fw.r[0]-fw.q[0])*(tc+(i-1)*.12),fw.q[1]+(fw.r[1]-fw.q[1])*(tc+(i-1)*.12)-2.2,0);
      deco+=`<g transform="translate(${pp[0]} ${pp[1]})"><circle cx="0" cy="-2.3" r=".55" fill="#f2c9a0" stroke="${INKC}" stroke-width="1.3" vector-effect="non-scaling-stroke"/><path d="M-.6 -1.7h1.2v1.7h-1.2z" fill="${['#3d6fb3','#2f7a52','#c8323f'][i]}" stroke="${INKC}" stroke-width="1.3" vector-effect="non-scaling-stroke"/></g>`;}}
  /* difese mirate disegnate */
  const DF=o.defs||{};if(fw&&M){const xs=M.q.map(q=>q[0]),ys=M.q.map(q=>q[1]);const x0=Math.min(...xs)-2,x1=Math.max(...xs)+2,yF=Math.min(...ys);const hM=mainInfo?mainInfo.h:6;
    const fo=Math.min(3,DF.fossato||0),ba=Math.min(3,DF.barricate||0),fa=Math.min(3,DF.fari||0),si=Math.min(3,DF.sirena||0),fd=Math.min(3,DF.fondamenta||0);
    if(fd){const zh=.35+.3*fd;(mainInfo.front||[]).forEach(w=>{const q=[S(w.q[0],w.q[1],0),S(w.r[0],w.r[1],0),S(w.r[0],w.r[1],zh),S(w.q[0],w.q[1],zh)];deco=poly(q,w.east?'#6f6a7d':'#8d8799')+deco;});}
    if(fo){const d=1.2+.7*fo,y1=yF-4.6,y0=y1-d;deco=poly([S(x0-1,y0,0),S(x1+1,y0,0),S(x1+1,y1,0),S(x0-1,y1,0)],'#3a86c8')+deco;
      for(let x=x0;x<x1;x+=2.2){const A=S(x,(y0+y1)/2,0),B=S(x+1.1,(y0+y1)/2,0);deco+=`<path d="M${A[0]} ${A[1]}q${(B[0]-A[0])/2} -.5 ${B[0]-A[0]} 0" stroke="#bfe3f2" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/>`;}
      if(fo>=3)for(let x=x0;x<=x1;x+=2.5){const A=S(x,y1,0),B=S(x,y1,1.2);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="#7a5230" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;}}
    if(ba){const n=3+3*ba,yb=yF-1.4;for(let i=0;i<n;i++){const t=(i+.5)/n;const x=x0+1+(x1-x0-2)*t;for(let r=0;r<Math.min(2,ba);r++){const P=S(x,yb,.3+r*.5);deco+=`<ellipse cx="${P[0]}" cy="${P[1]}" rx="${.55}" ry=".3" fill="#c9a66b" stroke="${INKC}" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;}}}
    if(fa){const pts=[[x0+2,yF],[x1-2,yF]].slice(0,fa>=2?2:1);pts.forEach(([x,y])=>{const L=S(x,y,hM-.2);const G1=S(x-2.5-fa,y-6-2*fa,0),G2=S(x+2.5+fa,y-6-2*fa,0);
      deco+=`<path d="M${L[0]} ${L[1]}L${G1[0]} ${G1[1]}L${G2[0]} ${G2[1]}Z" fill="#fff6b0" opacity="${.22+.08*fa}"/><circle cx="${L[0]}" cy="${L[1]}" r=".55" fill="#fff6b0" stroke="${INKC}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;});}
    const tp=Math.min(3,DF.trappole||0),gr=Math.min(3,DF.grate||0),rc=Math.min(3,DF.recinto||0),cn=Math.min(3,DF.cani||0),pm=Math.min(3,DF.pompa||0);
    if(tp){const n=4+3*tp,yt=yF-3;for(let i=0;i<n;i++){const x=x0+(x1-x0)*(i+.5)/n;const A=S(x-.35,yt,0),B=S(x,yt,.55),C=S(x+.35,yt,0);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}L${C[0]} ${C[1]}Z" fill="#9aa0a8" stroke="${INKC}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;}}
    if(gr){(mainInfo.front||[]).forEach(w=>{const L=Math.hypot(w.r[0]-w.q[0],w.r[1]-w.q[1]);const n=Math.floor(L/(1.1-gr*.2));for(let i=1;i<n;i++){const t=i/n;const A=S(w.q[0]+(w.r[0]-w.q[0])*t,w.q[1]+(w.r[1]-w.q[1])*t,.8),B=S(w.q[0]+(w.r[0]-w.q[0])*t,w.q[1]+(w.r[1]-w.q[1])*t,2.3);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="#3d405b" stroke-width="${1.2+gr*.4}" vector-effect="non-scaling-stroke"/>`;}});}
    if(rc){const yr=yF-6.2;let z='';for(let x=x0-1.5;x<=x1+1.5;x+=1.6){const A=S(x,yr,0),B=S(x,yr,1.6);deco+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="${INKC}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`;}
      for(let k=0;k<rc;k++){const zh=.6+k*.45;let d='';for(let x=x0-1.5,j=0;x<=x1+1.5;x+=.8,j++){const P=S(x,yr,zh+(j%2?.15:-.15));d+=(d?'L':'M')+P[0].toFixed(1)+' '+P[1].toFixed(1);}deco+=`<path d="${d}" stroke="#f7d64a" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/>`;}}
    if(cn&&fw){for(let i=0;i<cn;i++){const t=.2+.25*i;const P=S(fw.q[0]+(fw.r[0]-fw.q[0])*t,fw.q[1]+(fw.r[1]-fw.q[1])*t-2.6,0);deco+=`<text x="${P[0]}" y="${P[1]}" font-size="1.6" text-anchor="middle">🐕</text>`;}}
    if(pm&&mainInfo.front&&mainInfo.front.length){const w=mainInfo.front.find(x=>x.east)||mainInfo.front[0];const T0=S(w.r[0],w.r[1],hM),B0=S(w.r[0],w.r[1],0),P2=S(w.r[0]+.2,w.r[1]-1.6-pm*.5,0);
      deco+=`<path d="M${T0[0]} ${T0[1]}L${B0[0]} ${B0[1]}L${P2[0]} ${P2[1]}" stroke="#3a86c8" stroke-width="${2+pm}" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/><ellipse cx="${P2[0]}" cy="${P2[1]+.2}" rx="${.9+pm*.4}" ry="${.35+pm*.12}" fill="#7cc4f2" stroke="${INKC}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;}
    if(si){const P=S((x0+x1)/2,(yF+Math.max(...ys))/2,hM+3.2);deco+=`<rect x="${P[0]-.5}" y="${P[1]-1}" width="1" height="1" fill="#d7263d" stroke="${INKC}" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;
      for(let k=1;k<=si;k++)deco+=`<path d="M${P[0]+.8} ${P[1]-1.1-k*.6}a${.6+k*.6} ${.6+k*.6} 0 0 1 0 ${1.6+k*1.2}" stroke="#d7263d" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke" opacity=".8"/>`;}}
  /* terreno e strada */
  const xsA=[M,...NB].flatMap(b=>b.q.map(q=>q[0])),ysA=[M,...NB].flatMap(b=>b.q.map(q=>q[1]));const gx0=Math.min(...xsA,-25)-6,gx1=Math.max(...xsA,25)+6,gy0=Math.min(...ysA)-9,gy1=Math.max(...ysA)+6;
  const ground=poly([S(gx0,gy0,0),S(gx1,gy0,0),S(gx1,gy1,0),S(gx0,gy1,0)],'#4f9b5d');const road=poly([S(gx0,gy0-6,0),S(gx1,gy0-6,0),S(gx1,gy0,0),S(gx0,gy0,0)],'#55506b');
  let yard='';PL.forEach(pl=>{yard+=poly(pl.q.map(q=>S(q[0],q[1],0)),'#e9eef0','stroke-width="1.6"');const c=[pl.q.reduce((t,q)=>t+q[0],0)/pl.q.length,pl.q.reduce((t,q)=>t+q[1],0)/pl.q.length];yard+=poly(pl.q.map(q=>S(c[0]+(q[0]-c[0])*.86,c[1]+(q[1]-c[1])*.86,0)),'#3fb6e0','stroke-width="1.2"');});
  {const xs=M.q.map(q=>q[0]),ys=M.q.map(q=>q[1]);const yF=Math.min(...ys),xm=(Math.min(...xs)+Math.max(...xs))/2+((bhash(o.seed||'d')%3)-1)*.18*(Math.max(...xs)-Math.min(...xs));
   yard+=poly([S(xm-.8,gy0,0),S(xm+.8,gy0,0),S(xm+.8,yF,0),S(xm-.8,yF,0)],'#cfc4ab','stroke-width="1.2"');
   [[Math.min(...xs)-1.2,yF-1.2],[Math.max(...xs)+1.2,yF-1.2]].forEach(([x,y])=>{const P0=S(x,y,.7);yard+=`<ellipse cx="${P0[0].toFixed(1)}" cy="${P0[1].toFixed(1)}" rx="1.3" ry="1" fill="#2f7a42" stroke="${INKC}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;});}
  /* adatto alla cornice */
  const pts=[S(gx0,gy0-6,0),S(gx1,gy1,0),S(gx0,gy1,0),S(gx1,gy0-6,0)];const maxH=Math.max(...[M,...NB].map(b=>H(b)))+5;pts.push(S(gx0,gy1,maxH),S(gx1,gy1,maxH));
  const mx0=Math.min(...pts.map(p=>p[0])),mx1=Math.max(...pts.map(p=>p[0])),my0=Math.min(...pts.map(p=>p[1])),my1=Math.max(...pts.map(p=>p[1]));
  /* inquadro la casa principale, non tutto il quartiere */
  const mq=M.q;const fx0=Math.min(...mq.map(q=>S(q[0],q[1],0)[0]))-7,fx1=Math.max(...mq.map(q=>S(q[0],q[1],0)[0]))+8,fy0=Math.min(...mq.map(q=>S(q[0],q[1],H(M)+5)[1]))-2,fy1=Math.max(...mq.map(q=>S(q[0],q[1],0)[1]))+6;
  const VW=320,VH=220;const sc=Math.min(VW/(fx1-fx0),VH/(fy1-fy0));const tx=-fx0*sc+(VW-(fx1-fx0)*sc)/2,ty=-fy0*sc+(VH-(fy1-fy0)*sc)/2;
  const shield=lvl>=5?`<ellipse cx="${VW/2}" cy="${VH*.55}" rx="${VW*.46}" ry="${VH*.5}" fill="#7cf0ff" fill-opacity=".14" stroke="#fff" stroke-width="2.5" opacity=".9"/>`:'';
  const stars=[[20,18],[60,10],[250,16],[290,34],[200,8],[140,22]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('');
  return`<svg viewBox="0 0 ${VW} ${VH}" class="hart real"><rect width="${VW}" height="${VH}" fill="#2b2160"/>${stars}<circle cx="282" cy="26" r="13" fill="#f7d64a" stroke="${INKC}" stroke-width="2.5"/>
    <g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${sc.toFixed(3)})">${road}${ground}${yard}${body}${deco}</g>${shield}${rhWx(o.ev,VW,VH)}</svg>`;}
function rhWx(ev,W,H){if(!ev||ev==='calma')return'';let g='';
  if(ev==='pioggia'){for(let i=0;i<70;i++){const x=(i*47)%W,y=(i*29)%H;g+=`<path d="M${x} ${y}l-4 10" stroke="#cfe2ff" stroke-width="1.4" opacity=".75"/>`;}g=`<rect width="${W}" height="${H}" fill="#1d2a55" opacity=".25"/>`+g;}
  else if(ev==='neve'){for(let i=0;i<80;i++){const x=(i*53)%W,y=(i*31)%H;g+=`<circle cx="${x}" cy="${y}" r="${1+(i%3)*.6}" fill="#fff" opacity=".9"/>`;}}
  else if(ev==='nebbia'){g=`<defs><linearGradient id="nb${W}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8e8f0" stop-opacity=".15"/><stop offset=".6" stop-color="#e8e8f0" stop-opacity=".7"/><stop offset="1" stop-color="#e8e8f0" stop-opacity=".85"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#nb${W})"/>`;
    for(let i=0;i<5;i++)g+=`<ellipse cx="${(i*83)%W}" cy="${H*.55+i*12}" rx="90" ry="14" fill="#f2f2f7" opacity=".55"/>`;}
  else if(ev==='blackout'){g=`<rect width="${W}" height="${H}" fill="#05030c" opacity=".55"/><path d="M${W*.7} 0l-14 46h12l-18 50 34-62h-13l12-34z" fill="#f7d64a" stroke="#140f1f" stroke-width="2"/>`;}
  else if(ev==='luna'){g=`<circle cx="${W-38}" cy="26" r="40" fill="#fff3b0" opacity=".25"/><circle cx="${W-38}" cy="26" r="22" fill="#fff3b0" opacity=".35"/>`;}
  return`<g class="rhwx" pointer-events="none">${g}</g>`;}
function realDesc(geo){const m=geo.main;const lv=m.lv;const r=(m.roof||'').toLowerCase();const rt=/flat/.test(r)?'tetto piano':/gabl/.test(r)?'tetto a due falde':/hip|pyram/.test(r)?'tetto a padiglione':'';
  return[lv?`${lv} ${lv===1?'piano':'piani'}`:'',rt,`${Math.round(Math.abs(area(m.p)))} m² di pianta`].filter(Boolean).join(' · ');}
/* disegno di una casa: vera se c'è la pianta, altrimenti il modello per tipo */
async function drawHouse(el,h,o={}){if(!el)return;try{const g=await bGeom(h.lat,h.lon);if(g){el.innerHTML=realHouseSVG(g,{...o,seed:h.bid||'home'});el.dataset.real='1';el.dataset.desc=realDesc(g);return g;}}catch(e){console.warn('casa vera',e);}return null;}
/* ---------- LA MIA CASA: casa vera + rinforzi ---------- */
function rinforzi(a,lvl,prep,helps){const R=[['🚪','Porta blindata',a.porta==='blindata'||a.porta==='b4'],['▦','Grate alle finestre',a.grate==='tutte'||a.grate==='alcune'],['🪟','Vetri antisfondamento',a.vetri==='anti'],
  ['💡','Luci a sensore',a.luci==='sensore'],['🚨','Allarme o telecamere',a.allarme==='allarme'||a.allarme==='cam'],['🧱','Recinzione',a.recinzione&&a.recinzione!=='no'],
  ['🛡️','Case preparate per la prossima orda',prep],['⬆️',`Livello casa ${lvl}`+(lvl>=5?' (massimo)':''),lvl>=2],['🤝',`Alleati in difesa: ${helps}`,helps>0]];return R;}
const _casaTopRe=casaTop;casaTop=async function(){await _casaTopRe();try{const box=app.querySelector('.mycasa');if(!box||box.dataset.re)return;box.dataset.re='1';const art=box.querySelector('.mcart');
  const home=myHouses().find(h=>h.home);const s=OR.s||{};let lvl=1;try{if(S.user&&home&&home.bid){const q=await wRpc('world_quote',{p_bid:home.bid,p_lat:home.lat,p_lon:home.lon});lvl=(q&&q.level)||1;}}catch(e){}
  const helps=Math.min(4,+(s.helps_in||s.helps||0)||0);const a=S.answers||{};
  const R=rinforzi(a,lvl,!!s.prepared,helps);box.insertAdjacentHTML('beforeend',`<h4 class="hh">🛡️ Rinforzi della tua casa</h4><div class="rinf">${R.map(([i,t,ok])=>`<span class="${ok?'ok':'no'}">${ok?'✓':'✗'} ${i} ${esc(t)}</span>`).join('')}</div>
    <p class="muted" style="font-size:12px;margin:6px 0 0">Quelli con ✓ si vedono sul disegno. Per aggiungere gli altri: piano d’azione qui sotto (casa vera) e scheda della casa sulla mappa (Potenzia, Prepara, Chiedi aiuto).</p>`);
  if(home){const g=await drawHouse(art,home,{lvl,a,prep:!!s.prepared,helps,col:null});const sm=box.querySelector('small');if(g&&sm)sm.textContent=(S.zone&&S.zone.address||'')+' · '+realDesc(g);}}catch(e){console.warn(e);}
  /* le case del mondo: vere */
  try{const L=myHouses().filter(h=>!h.home);L.forEach((h,i)=>{const el=app.querySelector(`[data-mga="${i}"]`);if(el)drawHouse(el,h,{lvl:h.level,prep:!!(OR.s&&OR.s.prepared),k:'g'+i});});}catch(e){}};
/* scheda di ogni casa: l'edificio vero */
const _houseSheetRe=houseSheet;houseSheet=async function(h){await _houseSheetRe(h);try{const c=document.querySelector('#sheet.open');const box=c&&c.querySelector('.hsart');if(!box)return;const lvl=+((c.querySelector('.hshead b')||{}).textContent||'').replace(/\D/g,'')||h.level||1;
  const tmp=document.createElement('div');const g=await drawHouse(tmp,h,{lvl,a:h.home?(S.answers||{}):{},prep:!!(OR.s&&OR.s.prepared),helps:h.home?Math.min(4,+((OR.s||{}).helps_in||0)):0});
  if(g){const sp=box.querySelector('span');box.innerHTML=tmp.innerHTML+`<span>${esc(realDesc(g))}</span>`;}}catch(e){}};
</script>
