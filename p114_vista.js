<script>
/* ===== Fase 69 — 🎥 VISTA DA DIETRO AL MEZZO (nel 🎮 Gioco) =====
   Tasto .vcbtn "🎥 Segui da vicino" sulla mappa del Gioco → vcOn: la telecamera di MapLibre si mette dietro al mezzo
   (o al superstite a piedi) con pitch 78°, zoom 19,4 e la direzione del viaggio (vcCam a ogni fotogramma di gmDraw).
   I palazzi sono quelli veri (fill-extrusion con le finestre di p110), il mezzo è il modello 3D di g3Mezzo; sopra il
   cielo .gmmap.vc (sfondo CSS: sopra l'orizzonte la mappa è trasparente).
   In alto il navigatore .vcnav (vcNav: prossima svolta del percorso GM sulle strade, "➡️ 100 m · gira a destra"),
   in basso a sinistra la mappa piccola .vcmini (vcMini: percorso girato secondo la direzione).
   All'arrivo (o senza viaggio dopo 3 s fermo col superstite guidato arrivato) si resta dietro al mezzo; "🗺️ Mappa" (vcOff)
   rimette la vista di prima. Telefono senza 3D (G3.on falso): la vista funziona lo stesso, col mezzo disegnato in 2D. */
const VC={on:false,b:null,t:0};
function vcPos(){const s=GM.lastS||{};
  if(s.m&&!s.fermo&&s.x!=null)return{x:s.x,y:s.y,a:s.a||0,R:s.R,f:s.f,ar:s.ar,viaggio:true,s};
  if(GM.av){const p=gmXY(GM.av.lat,GM.av.lon);return{x:p[0],y:p[1],a:GM.av.a||0,R:GM.av.P,i:GM.av.i,viaggio:!!GM.av.P,av:true};}
  if(s.x!=null)return{x:s.x,y:s.y,a:s.a||0,viaggio:false,s};return null;}
/* direzione (gradi da nord, in senso orario) da un angolo nelle coordinate locali (x est, y sud) */
const vcBear=a=>(Math.atan2(Math.cos(a),-Math.sin(a))*180/Math.PI+360)%360;
function vcCam(){if(!VC.on||!GM.map)return;const p=vcPos();if(!p)return;const m=GM.map;
  let b=vcBear(p.a);if(VC.b==null)VC.b=b;else{const d=((b-VC.b+540)%360)-180;VC.b=(VC.b+d*.12+360)%360;}
  const r=VC.b*Math.PI/180,av=18;const x=p.x+Math.sin(r)*av,y=p.y-Math.cos(r)*av;
  try{m.jumpTo({center:gmLL(x,y),zoom:19.4,pitch:78,bearing:VC.b});}catch(e){}
  const now=performance.now();if(now-VC.t>400){VC.t=now;vcNav(p);vcMini(p);}}
/* la prossima svolta lungo il percorso */
function vcNav(p){const el=GM.el&&GM.el.querySelector('.vcnav');if(!el)return;let t='';
  if(p.viaggio&&p.R&&p.R.length>1){const R=p.R;
    /* indice del tratto in cui si trova adesso */
    let i0=0,bd=1e18;for(let i=0;i<R.length-1;i++){const ax=R[i][0],ay=R[i][1],bx=R[i+1][0],by=R[i+1][1];const L2=(bx-ax)**2+(by-ay)**2||1;let k=((p.x-ax)*(bx-ax)+(p.y-ay)*(by-ay))/L2;k=Math.max(0,Math.min(1,k));const q=(ax+(bx-ax)*k-p.x)**2+(ay+(by-ay)*k-p.y)**2;if(q<bd){bd=q;i0=i;}}
    let d=Math.hypot(R[i0+1][0]-p.x,R[i0+1][1]-p.y),dir='';
    for(let i=i0+1;i<R.length-1;i++){const a1=Math.atan2(R[i][1]-R[i-1][1],R[i][0]-R[i-1][0]),a2=Math.atan2(R[i+1][1]-R[i][1],R[i+1][0]-R[i][0]);let da=((a2-a1)*180/Math.PI+540)%360-180;
      if(Math.abs(da)>35&&Math.hypot(R[i+1][0]-R[i][0],R[i+1][1]-R[i][1])>4){dir=da>0?'destra':'sinistra';break;}d+=Math.hypot(R[i+1][0]-R[i][0],R[i+1][1]-R[i][1]);}
    const dm=Math.max(5,Math.round(d/5)*5);
    if(dir)t=`<i>${dir==='destra'?'➡️':'⬅️'}</i><b>${dm} m</b><span>gira a ${dir}</span>`;
    else{const fine=p.s&&!p.s.ar?'🏠':'🧟';t=`<i>⬆️</i><b>${dm} m</b><span>${p.av?'arrivo':fine==='🧟'?'arrivo dallo zombie':'arrivo'}</span>`;}}
  else t='<i>🏠</i><b>Fermo</b><span>manda il superstite verso uno zombie</span>';
  if(el.dataset.h!==t){el.dataset.h=t;el.innerHTML=t;}}
/* la mappa piccola, girata come la strada davanti */
function vcMini(p){const c=GM.el&&GM.el.querySelector('.vcmini');if(!c)return;const x=c.getContext('2d'),W=c.width,H=c.height,k=W/240;
  x.clearRect(0,0,W,H);x.save();x.beginPath();x.arc(W/2,H/2,W/2-2,0,7);x.clip();x.fillStyle='#1d2433';x.fillRect(0,0,W,H);
  x.translate(W/2,H/2);x.rotate(-(VC.b||0)*Math.PI/180);
  /* le strade caricate (grafo del Gioco) intorno */
  try{const d=GM.d;if(d&&d.adj){x.strokeStyle='#4b5670';x.lineWidth=3*k;x.beginPath();let n=0;
    for(let i=0;i<d.N.length&&n<4000;i++){const a=d.N[i];if(Math.abs(a[0]-p.x)>160||Math.abs(a[1]-p.y)>160)continue;for(const[v]of d.adj[i]){if(v<i)continue;const b=d.N[v];x.moveTo((a[0]-p.x)*k,(a[1]-p.y)*k);x.lineTo((b[0]-p.x)*k,(b[1]-p.y)*k);n++;}}x.stroke();}}catch(e){}
  if(p.R&&p.R.length>1){x.strokeStyle='#b25cff';x.lineWidth=5*k;x.lineJoin='round';x.beginPath();p.R.forEach((q,i)=>{const X=(q[0]-p.x)*k,Y=(q[1]-p.y)*k;i?x.lineTo(X,Y):x.moveTo(X,Y);});x.stroke();
    const e=p.R[p.R.length-1];x.fillStyle='#e23b3b';x.beginPath();x.arc((e[0]-p.x)*k,(e[1]-p.y)*k,6*k,0,7);x.fill();}
  x.restore();x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.moveTo(W/2,H/2-9*k);x.lineTo(W/2+7*k,H/2+7*k);x.lineTo(W/2,H/2+3*k);x.lineTo(W/2-7*k,H/2+7*k);x.closePath();x.fill();x.stroke();
  x.strokeStyle='#f7d64a';x.lineWidth=3;x.beginPath();x.arc(W/2,H/2,W/2-2,0,7);x.stroke();}
function vcOn(){const m=GM.map,el=GM.el;if(!m||!el||VC.on)return;if(!vcPos()){toast('Il superstite non è sulla mappa');return;}
  VC.on=true;VC.b=null;const g=(f,d)=>{try{const v=m[f]&&m[f]();return v==null?d:v;}catch(e){return d;}};VC.prima={z:g('getZoom',18),p:g('getPitch',55),mp:g('getMaxPitch',60)};VC.follow=GM.follow;GM.follow=false;
  try{m.setMaxPitch(85);m.setMaxZoom(20);}catch(e){}try{m.dragPan.disable();m.scrollZoom.disable();m.touchZoomRotate.disable();}catch(e){}
  el.classList.add('vcon');el.querySelector('.gmmap').classList.add('vc');
  el.insertAdjacentHTML('beforeend','<div class="vcnav"></div><canvas class="vcmini" width="240" height="240"></canvas><button class="vcout" data-vcout type="button">🗺️ Mappa</button>');
  el.querySelector('[data-vcout]').onclick=vcOff;vcBtnPaint();try{sfx&&sfx('click');}catch(e){}}
function vcOff(){const m=GM.map,el=GM.el;if(!VC.on)return;VC.on=false;
  if(el){el.classList.remove('vcon');const mm=el.querySelector('.gmmap');if(mm)mm.classList.remove('vc');el.querySelectorAll('.vcnav,.vcmini,.vcout').forEach(x=>x.remove());}
  if(m){const P=VC.prima||{};try{m.dragPan.enable();m.scrollZoom.enable();m.touchZoomRotate.enable();}catch(e){}
    try{m.easeTo({zoom:Math.min(19,P.z||18),pitch:55,bearing:0,duration:600});setTimeout(()=>{try{m.setMaxPitch(P.mp||60);m.setMaxZoom(19);}catch(e){}},650);}catch(e){}}
  GM.follow=true;GM.lastFollow=0;vcBtnPaint();}
/* il tasto, sopra lo zoom: si illumina quando il superstite è in viaggio */
function vcBtnPaint(){const el=GM.el;if(!el)return;let b=el.querySelector('.vcbtn');
  if(!b){b=document.createElement('button');b.type='button';b.className='vcbtn';b.onclick=()=>VC.on?vcOff():vcOn();el.appendChild(b);}
  b.hidden=VC.on;const p=vcPos();const v=!!(p&&p.viaggio);b.classList.toggle('caldo',v);const t=v?'🎥 Segui da vicino':'🎥 Vista da vicino';if(b.textContent!==t)b.textContent=t;}
const _gmDrawVc=gmDraw;gmDraw=function(s){const r=_gmDrawVc.apply(this,arguments);try{if(VC.on)vcCam();else if(performance.now()-(VC.bt||0)>1000){VC.bt=performance.now();vcBtnPaint();}}catch(e){}return r;};
/* in vista da vicino niente nome sopra il mezzo (lo copre) */
const _gmNomeVc=gmNome;gmNome=function(){if(VC.on)return;return _gmNomeVc.apply(this,arguments);};
const _gmCloseVc=gmClose;gmClose=function(){VC.on=false;VC.b=null;return _gmCloseVc.apply(this,arguments);};
/* prima di uno scontro si torna alla mappa (l'arena si apre sopra) */
const _arnCardVc=typeof arnCard==='function'?arnCard:null;if(_arnCardVc)arnCard=function(){try{if(VC.on)vcOff();}catch(e){}return _arnCardVc.apply(this,arguments);};
</script>
