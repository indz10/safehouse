<script>
/* =========================================================
   📖 L'ORDA A FUMETTO (stile manga/anime, disegnata in vettoriale)
   4 vignette: la notte · l'orda arriva · l'impatto · il risultato
   + zombie disegnati sulla mappa al posto delle faccine
   ========================================================= */
const ZV=[ /* varianti dei personaggi: pelle, vestito, pantaloni, capelli, occhi */
 {sk:'#a9bfa0',ss:'#6f8b72',sh:'#c8323f',sd:'#8e1f2b',pa:'#3b3f5c',pd:'#262a42',ha:'#2b2235',ey:'#ffe14d'},
 {sk:'#b7b9a0',ss:'#7c7f68',sh:'#3d6fb3',sd:'#284d80',pa:'#4a3b2e',pd:'#30261d',ha:'#5b2f22',ey:'#ff5a3c'},
 {sk:'#9fb7b0',ss:'#66807a',sh:'#e8e1cf',sd:'#b9b09a',pa:'#23232f',pd:'#14141c',ha:'#d9d3c4',ey:'#7cf0ff'},
 {sk:'#a8b394',ss:'#717c5f',sh:'#6b4a8c',sd:'#4a3163',pa:'#5c5c5c',pd:'#3c3c3c',ha:'#141019',ey:'#ffe14d'},
 {sk:'#b8a99a',ss:'#7d6f62',sh:'#2f7a52',sd:'#1f5538',pa:'#3a3f52',pd:'#252937',ha:'#8a1f2b',ey:'#ff5a3c'}];
let ZSEQ=0;
/* uno zombie in stile anime, rivolto a destra; ~120×230 */
function zArt(i,o={}){const v=ZV[i%ZV.length];const id='z'+(ZSEQ++);const lean=o.lean!=null?o.lean:(i%2?6:-2);
  return`<svg viewBox="0 0 120 230" class="zart ${o.cls||''}" style="${o.style||''}"><defs>
   <radialGradient id="${id}g"><stop offset="0" stop-color="${v.ey}" stop-opacity=".95"/><stop offset=".45" stop-color="${v.ey}" stop-opacity=".35"/><stop offset="1" stop-color="${v.ey}" stop-opacity="0"/></radialGradient>
   <linearGradient id="${id}s" x1="0" x2="1"><stop offset=".55" stop-color="${v.sk}"/><stop offset=".56" stop-color="${v.ss}"/></linearGradient>
   <linearGradient id="${id}t" x1="0" x2="1"><stop offset=".6" stop-color="${v.sh}"/><stop offset=".61" stop-color="${v.sd}"/></linearGradient></defs>
  <ellipse cx="60" cy="224" rx="36" ry="6" fill="#000" opacity=".4"/>
  <g transform="rotate(${lean} 60 222)" stroke="#140f1f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
   <path d="M47 150 L37 214 L30 220 L52 222 L56 162 Z" fill="${v.pa}"/><path d="M66 150 L78 212 L90 219 L94 213 L80 150 Z" fill="${v.pd}"/>
   <path d="M30 220 L52 222 L53 227 L28 226 Z" fill="#1c1622"/><path d="M78 212 L94 213 L97 219 L80 220 Z" fill="#1c1622"/>
   <path d="M82 100 Q100 104 112 100 L116 96 L119 101 L114 104 L118 108 L112 108 L114 113 Q98 114 80 112 Z" fill="${v.ss}"/>
   <path d="M38 92 Q60 82 86 92 L90 152 L82 146 L76 158 L68 148 L60 160 L52 148 L44 158 L40 146 L33 154 Z" fill="url(#${id}t)"/>
   <path d="M50 104 L56 118 M70 112 L66 128" stroke="${v.sd}" stroke-width="2.5"/>
   <path d="M60 86 Q48 96 52 110" fill="none" stroke-width="2"/>
   <path d="M40 58 Q37 30 61 25 Q86 28 83 58 Q81 80 61 86 Q43 82 40 58 Z" fill="url(#${id}s)"/>
   <path d="M35 52 L28 30 L43 37 L44 16 L56 30 L63 10 L70 29 L84 17 L82 37 L94 33 L85 55 Q72 37 61 38 Q48 38 35 52 Z" fill="${v.ha}"/>
   <path d="M44 55 Q52 48 58 55 Q52 62 44 57 Z" fill="#26162b" stroke-width="2"/><path d="M65 55 Q72 48 80 54 Q73 62 65 57 Z" fill="#26162b" stroke-width="2"/>
   <path d="M47 71 Q61 64 75 71 Q69 82 61 82 Q52 82 47 71 Z" fill="#3a0d14"/>
   <path d="M50 71 L53 76 L56 70 L59 76 L62 70 L65 76 L68 70 L71 75 L73 71" fill="#f3ead6" stroke-width="1.5"/>
   <path d="M42 98 Q78 100 106 90 L110 86 L114 91 L110 95 L116 97 L110 100 L114 104 L106 104 Q76 114 40 112 Z" fill="${v.sk}"/>
   <path d="M64 102 L68 108 M74 100 L78 106" stroke="#7a1a24" stroke-width="2"/>
   <path d="M52 34 L49 44 M58 31 L56 40" stroke="#7a1a24" stroke-width="2"/>
  </g>
  <g transform="rotate(${lean} 60 222)"><circle cx="52" cy="55" r="11" fill="url(#${id}g)"/><circle cx="72" cy="55" r="11" fill="url(#${id}g)"/>
   <ellipse cx="52" cy="55" rx="3.2" ry="2.2" fill="${v.ey}"/><ellipse cx="72" cy="55" rx="3.2" ry="2.2" fill="${v.ey}"/>
   <path d="M47 33 Q55 28 64 30" stroke="#fff" stroke-width="2" fill="none" opacity=".55"/></g></svg>`;}
/* linee di velocità e retinatura */
function speedLines(cx,cy,n,W,H){let s='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.random()*.08;const r1=Math.min(W,H)*(.22+Math.random()*.18),r2=Math.max(W,H)*1.2;const w=.8+Math.random()*3.2;
  const p=(r,d)=>[cx+Math.cos(a+d)*r,cy+Math.sin(a+d)*r];const[a1,b1]=p(r1,0),[a2,b2]=p(r2,w/300),[a3,b3]=p(r2,-w/300);s+=`<path d="M${a1|0} ${b1|0}L${a2|0} ${b2|0}L${a3|0} ${b3|0}Z" fill="#140f1f" opacity="${.35+Math.random()*.55}"/>`;}return s;}
const TONE=id=>`<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.4" fill="#140f1f" opacity=".28"/></pattern>`;
function burst(cx,cy,r,txt,col,rot=-8,fs=34){let p='';const n=18;for(let i=0;i<n*2;i++){const a=i/(n*2)*Math.PI*2;const rr=i%2?r*.62:r*(1+Math.random()*.12);p+=`${(cx+Math.cos(a)*rr)|0},${(cy+Math.sin(a)*rr)|0} `;}
  return`<polygon points="${p}" fill="${col}" stroke="#140f1f" stroke-width="4"/><text x="${cx}" y="${cy+fs*.35}" text-anchor="middle" font-family="Bangers,Impact,sans-serif" font-size="${fs}" fill="#fff" stroke="#140f1f" stroke-width="5" paint-order="stroke" transform="rotate(${rot} ${cx} ${cy})">${txt}</text>`;}
/* le 4 vignette */
function fumettoHTML(h,res,ctx){const held=res.held,hh=ctx.time||'21:00',where=ctx.where||'',prep=ctx.prep;
  let house='';try{house=houseScene(S.answers||SAMPLE,{sid:'fu'+(ZSEQ++)});}catch(e){house='';}
  const z5=[0,1,2,3,4];
  const p1=`<div class="fpan p1"><div class="fbg">${house}</div><div class="fcap">🌕 Ore ${hh}${where?' · '+esc(where):''}</div><div class="fcap r">${esc(h.label.replace(/^[^\s]+\s/,''))}</div><div class="fsfx s1">GRRR…</div></div>`;
  const p2=`<div class="fpan p2"><svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" class="fsvg"><defs>${TONE('t2'+ZSEQ)}<radialGradient id="fog${ZSEQ}"><stop offset="0" stop-color="#5b4d8f"/><stop offset="1" stop-color="#140f1f"/></radialGradient></defs>
     <rect width="300" height="380" fill="url(#fog${ZSEQ})"/><rect width="300" height="380" fill="url(#t2${ZSEQ})"/>${speedLines(150,150,46,300,380)}
     <ellipse cx="150" cy="370" rx="190" ry="40" fill="#0c0912"/></svg>
     <div class="fhorde">${z5.map((k,i)=>zArt(k+(h.lat*1000|0),{cls:'w'+i,style:`--d:${i*.12}s`})).join('')}</div><div class="fsfx s2">ARRIVANO!</div></div>`;
  const door=`<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" class="fsvg"><defs>${TONE('t3'+ZSEQ)}</defs><rect width="300" height="300" fill="#3b2f6e"/>${speedLines(200,120,36,300,300)}
     <rect x="120" y="20" width="150" height="270" fill="#6b4226" stroke="#140f1f" stroke-width="5"/>${[0,1,2,3,4].map(i=>`<line x1="${150+i*25}" y1="22" x2="${150+i*25}" y2="288" stroke="#4a2c18" stroke-width="3"/>`).join('')}
     <circle cx="250" cy="160" r="7" fill="#f7d64a" stroke="#140f1f" stroke-width="3"/>
     ${prep?`<rect x="105" y="90" width="180" height="22" fill="#a0703f" stroke="#140f1f" stroke-width="4" transform="rotate(-8 195 101)"/><rect x="105" y="190" width="180" height="22" fill="#a0703f" stroke="#140f1f" stroke-width="4" transform="rotate(7 195 201)"/>`:''}
     ${held?'':'<path d="M180 120 L200 150 L188 168 L214 200 M200 150 L232 140" stroke="#140f1f" stroke-width="4" fill="none"/>'}
     <rect width="300" height="300" fill="url(#t3${ZSEQ})"/></svg>`;
  const hands=[0,1,2].map(i=>`<svg viewBox="0 0 160 80" class="fhand h${i}"><path d="M0 50 Q60 44 110 30 L118 20 L126 26 L122 32 L134 30 L130 38 L140 42 L128 46 L134 54 L120 52 Q70 70 0 74 Z" fill="${ZV[i].sk}" stroke="#140f1f" stroke-width="4" stroke-linejoin="round"/><path d="M60 52 L64 60 M80 46 L84 54" stroke="#7a1a24" stroke-width="3"/></svg>`).join('');
  const p3=`<div class="fpan p3">${door}<div class="fhands">${hands}</div><svg viewBox="0 0 300 300" class="fsvg fx"><g class="fbam">${burst(205,150,62,held?'BAM!':'CRACK!',held?'#f7d64a':'#d7263d',-10,held?40:34)}</g></svg></div>`;
  const p4=held?`<div class="fpan p4 ok"><div class="fbg">${house}</div><svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" class="fsvg fx"><defs><radialGradient id="sh${ZSEQ}"><stop offset=".55" stop-color="#7cf0ff" stop-opacity="0"/><stop offset=".8" stop-color="#7cf0ff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity=".85"/></radialGradient></defs>
       <ellipse cx="200" cy="140" rx="150" ry="120" fill="url(#sh${ZSEQ})" stroke="#fff" stroke-width="4" class="fshield"/></svg>
       <div class="fthrow">${[1,3].map((k,i)=>zArt(k,{cls:'t'+i,lean:i?-40:40})).join('')}</div><div class="fsfx win">TENUTA!</div><div class="fcap b">${esc(ctx.reward||'Le difese hanno retto. Riscatta i premi!')}</div></div>`
    :`<div class="fpan p4 ko"><div class="fbg">${house}</div><svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" class="fsvg fx"><rect width="400" height="220" fill="#d7263d" opacity=".28"/>
       ${[0,1,2,3,4,5].map(i=>`<path class="ffire" style="--d:${i*.15}s" d="M${60+i*55} 220 Q${50+i*55} 170 ${70+i*55} 140 Q${75+i*55} 175 ${92+i*55} 150 Q${100+i*55} 190 ${88+i*55} 220 Z" fill="${i%2?'#f7d64a':'#ff7a2f'}" stroke="#140f1f" stroke-width="3"/>`).join('')}</svg>
       <div class="fhorde in">${[2,4].map((k,i)=>zArt(k,{cls:'w'+i})).join('')}</div><div class="fsfx lose">SFONDATA!</div><div class="fcap b">${esc(ctx.advice||'Prepara le case e potenziale prima della prossima orda.')}</div></div>`;
  return`<div class="fpage">${p1}<div class="frow">${p2}${p3}</div>${p4}</div>`;}
/* mostra la tavola: vignette che entrano una alla volta, tocco per saltare */
function fumetto(h,res,ctx,onEnd){const old=document.getElementById('fumetto');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend',`<div id="fumetto" class="${res.held?'held':'fell'}"><div class="ftop"><b>${ctx.sim?'🔮 SIMULAZIONE':'🧟 L’ORDA DELLE '+esc(ctx.time||'')}</b><span>${esc(h.label)}${ctx.n>1?` · ${ctx.i+1}/${ctx.n}`:''}</span><button data-fx>✕</button></div>${fumettoHTML(h,res,ctx)}
    <div class="fbot"><button class="btn ghost" data-fmap>🗺️ Vedi sulla mappa</button>${ctx.n>1?'<button class="btn" data-fnext>Casa successiva ▶</button>':'<button class="btn" data-fx2>Fatto</button>'}</div></div>`);
  const F=document.getElementById('fumetto');const P=[...F.querySelectorAll('.fpan')];let k=0;try{setMusic('battle');}catch(e){}
  const next=()=>{if(k<P.length){P[k].classList.add('in');try{if(k===2)vibe();sfx&&sfx(k===3?(res.held?'win':'lose'):'hit');}catch(e){}k++;if(k<P.length)F._t=setTimeout(next,k===1?1300:1500);else F.classList.add('done');}};
  F._t=setTimeout(next,200);F.addEventListener('click',e=>{if(e.target.closest('button'))return;clearTimeout(F._t);while(k<P.length){P[k].classList.add('in');k++;}F.classList.add('done');});
  const close=(go2)=>{clearTimeout(F._t);F.remove();try{setMusic('app');}catch(e){}if(onEnd)onEnd(go2);};
  F.querySelectorAll('[data-fx],[data-fx2]').forEach(b=>b.onclick=()=>close('x'));const m=F.querySelector('[data-fmap]');if(m)m.onclick=()=>close('map');const n=F.querySelector('[data-fnext]');if(n)n.onclick=()=>close('next');}
/* risultato di una casa: vero (ultima orda) o simulato */
function fuRes(h,mode){if(mode==='sim'){const r=regSimRows().find(x=>Math.abs(x.lat-h.lat)<.0003&&Math.abs(x.lon-h.lon)<.0004)||{held:true,sim:{pw:0,atk:0}};return{held:r.held,sim:r.sim};}
  const real=(OR.s&&OR.s.houses||[]).find(x=>Math.abs(x.lat-h.lat)<.0003&&Math.abs(x.lon-h.lon)<.0004);return real?{held:!!real.held,real:true}:{held:true,none:true};}
/* l'assalto parte dal fumetto, poi (se vuoi) la mappa */
/* sulla mappa: zombie disegnati al posto delle faccine */
(function(){const css=document.createElement('style');const svg=encodeURIComponent(zArt(0,{lean:4}).replace(/class="zart[^"]*"/,'xmlns="http://www.w3.org/2000/svg"'));
  css.textContent=`.lm-z{width:30px;height:56px;font-size:0!important;background:url("data:image/svg+xml,${svg}") center bottom/contain no-repeat;animation:zwalk .5s ease-in-out infinite alternate;filter:drop-shadow(0 0 4px rgba(255,225,77,.5))}
  .lm-z.hit{width:auto;height:auto;font-size:24px!important;background:none;animation:none}@keyframes zwalk{from{transform:rotate(-5deg) translateY(0)}to{transform:rotate(5deg) translateY(-2px)}}`;document.head.appendChild(css);})();
</script>
