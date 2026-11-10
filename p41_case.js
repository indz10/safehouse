<script>
/* =========================================================
   CASE DISEGNATE DIVERSE
   - tipo dell'edificio letto dalla mappa vera (OpenStreetMap): villetta, bifamiliare,
     schiera, condominio, cascina, negozio
   - il livello si vede addosso: luci (2), recinzione (3), barricate (4), torretta e scudo (5)
   - colori diversi per ogni casa
   "La mia casa": in cima la TUA casa vera disegnata dalle risposte, poi le case che possiedi
   Mappa: pulsante 🏙️ 3D di nuovo visibile
   ========================================================= */
const BT={villa:['🏡','Villetta'],bifam:['🏘️','Bifamiliare'],schiera:['🏠','Villetta a schiera'],condo:['🏢','Condominio'],cascina:['🌾','Cascina'],shop:['🏪','Negozio']};
function bhash(s){let h=0;s=String(s||'');for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
const WALLS=['#e9c46a','#f4a261','#e5989b','#a8dadc','#cdb4db','#b5e48c','#f1faee','#ffd6a5'],ROOFS=['#d7263d','#8d3b72','#3d405b','#6a994e','#bc6c25','#264653'];
/* il disegno: 300×200, stile fumetto */
function houseArt(type,level,seed,o={}){const h=bhash(seed);const wc=WALLS[h%WALLS.length],rc=ROOFS[(h>>3)%ROOFS.length];const L=level||1;const K='#140f1f';const lit=L>=2?'#f7d64a':'#3b3366';const id='ha'+(h%99999)+(o.k||'');
  const win=(x,y,w=20,hh=18)=>`<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${lit}" stroke="${K}" stroke-width="2.5"/><path d="M${x+w/2} ${y}V${y+hh}" stroke="${K}" stroke-width="2"/>${L>=4?`<path d="M${x-3} ${y+4}L${x+w+3} ${y+hh-4}M${x-3} ${y+hh-4}L${x+w+3} ${y+4}" stroke="#8a5a34" stroke-width="4"/>`:''}`;
  const door=(x,y,w=22,hh=34)=>`<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${L>=4?'#7c8794':'#8a5a34'}" stroke="${K}" stroke-width="2.5"/><circle cx="${x+w-6}" cy="${y+hh/2}" r="2.2" fill="#f7d64a"/>${L>=4?`<path d="M${x-4} ${y+10}H${x+w+4}M${x-4} ${y+24}H${x+w+4}" stroke="#a0703f" stroke-width="5"/>`:''}`;
  let b='';const G=170;
  if(type==='condo'){b=`<rect x="95" y="38" width="110" height="${G-38}" fill="${wc}" stroke="${K}" stroke-width="3"/><rect x="90" y="30" width="120" height="10" fill="${rc}" stroke="${K}" stroke-width="3"/><path d="M180 30V12M174 16H186" stroke="${K}" stroke-width="2.5"/>`;
    for(let r=0;r<5;r++)for(let c=0;c<3;c++)b+=win(108+c*32,48+r*22,18,14);b+=door(139,G-30,22,30);}
  else if(type==='schiera'){[0,1,2].forEach(i=>{const x=60+i*62,me=i===1;b+=`<rect x="${x}" y="80" width="60" height="${G-80}" fill="${me?wc:'#8f86b8'}" stroke="${K}" stroke-width="3"/><path d="M${x-4} 82L${x+30} 50L${x+64} 82Z" fill="${me?rc:'#5a4f8a'}" stroke="${K}" stroke-width="3"/>`+win(x+8,96,18,16)+win(x+34,96,18,16)+door(x+19,G-32,22,32);});}
  else if(type==='bifam'){b=`<rect x="60" y="76" width="180" height="${G-76}" fill="${wc}" stroke="${K}" stroke-width="3"/><path d="M50 80L150 36L250 80Z" fill="${rc}" stroke="${K}" stroke-width="3"/><path d="M150 40V${G}" stroke="${K}" stroke-width="3"/>`+win(75,92)+win(110,92)+win(170,92)+win(205,92)+door(98,G-34)+door(180,G-34)+`<rect x="196" y="40" width="12" height="22" fill="${rc}" stroke="${K}" stroke-width="2.5"/>`;}
  else if(type==='cascina'){b=`<rect x="40" y="88" width="130" height="${G-88}" fill="${wc}" stroke="${K}" stroke-width="3"/><path d="M32 92L105 58L178 92Z" fill="${rc}" stroke="${K}" stroke-width="3"/>`+win(55,104)+win(130,104)+door(94,G-34)+
      `<rect x="172" y="104" width="100" height="${G-104}" fill="#c08552" stroke="${K}" stroke-width="3"/><path d="M168 108L222 80L276 108Z" fill="#8d3b2a" stroke="${K}" stroke-width="3"/><path d="M190 ${G}V128Q222 106 254 128V${G}" fill="#5a3a22" stroke="${K}" stroke-width="3"/><ellipse cx="262" cy="${G-6}" rx="16" ry="9" fill="#e9c46a" stroke="${K}" stroke-width="2.5"/>`;}
  else if(type==='shop'){b=`<rect x="70" y="60" width="160" height="${G-60}" fill="${wc}" stroke="${K}" stroke-width="3"/><rect x="64" y="52" width="172" height="12" fill="${rc}" stroke="${K}" stroke-width="3"/>`+win(84,72)+win(140,72)+win(196,72)+
      `<path d="M70 108H230L222 124H78Z" fill="#d7263d" stroke="${K}" stroke-width="3"/><path d="M90 108L86 124M110 108L108 124M130 108L130 124M150 108V124M170 108L172 124M190 108L192 124M210 108L214 124" stroke="#fff" stroke-width="3"/><rect x="82" y="128" width="96" height="${G-128}" fill="#9fd3e6" stroke="${K}" stroke-width="3"/>`+door(190,G-36,26,36);}
  else{b=`<rect x="80" y="84" width="140" height="${G-84}" fill="${wc}" stroke="${K}" stroke-width="3"/><path d="M68 88L150 40L232 88Z" fill="${rc}" stroke="${K}" stroke-width="3"/><rect x="184" y="48" width="14" height="26" fill="${rc}" stroke="${K}" stroke-width="2.5"/>`+win(96,100)+win(184,100)+door(139,G-36)+
      `<circle cx="252" cy="${G-28}" r="20" fill="#6a994e" stroke="${K}" stroke-width="3"/><path d="M252 ${G-8}V${G}" stroke="${K}" stroke-width="5"/>`;}
  const fence=L>=3?`<g stroke="${K}" stroke-width="2.5" fill="#cfc6e6">${Array.from({length:14},(_,i)=>`<path d="M${16+i*20} ${G+18}V${G-4}L${21+i*20} ${G-10}L${26+i*20} ${G-4}V${G+18}Z"/>`).join('')}<path d="M10 ${G+4}H290" fill="none" stroke-width="3"/></g>`:'';
  const lamp=L>=2?`<path d="M28 ${G}V${G-60}H40" stroke="${K}" stroke-width="3" fill="none"/><circle cx="42" cy="${G-56}" r="6" fill="#f7d64a" stroke="${K}" stroke-width="2"/><path d="M42 ${G-50}L22 ${G}H62Z" fill="#f7d64a" opacity=".25"/>`:'';
  const top=L>=5?`<defs><radialGradient id="${id}s"><stop offset=".6" stop-color="#7cf0ff" stop-opacity="0"/><stop offset="1" stop-color="#7cf0ff" stop-opacity=".55"/></radialGradient></defs><ellipse cx="150" cy="${G-40}" rx="138" ry="110" fill="url(#${id}s)" stroke="#fff" stroke-width="2.5" opacity=".9"/><path d="M150 18V-2" stroke="${K}" stroke-width="2.5"/><path d="M150 -2H170L164 4L170 10H150" fill="#d7263d" stroke="${K}" stroke-width="2"/>`:'';
  const stars=[[30,24],[62,14],[250,22],[280,40],[210,12]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`).join('');
  return`<svg viewBox="0 -6 300 206" class="hart ${o.cls||''}"><rect x="0" y="-6" width="300" height="206" fill="${o.day?'#9fd3e6':'#2b2160'}"/>${o.day?'':stars}<circle cx="268" cy="24" r="14" fill="#f7d64a" stroke="${K}" stroke-width="2.5"/>${top}<rect x="0" y="${G}" width="300" height="40" fill="#3f9b5f" stroke="${K}" stroke-width="3"/>${lamp}${b}${fence}</svg>`;}
/* tipo dell'edificio dalla mappa vera */
function btFromTags(t){const b=(t&&t.building)||'',lv=+((t&&t['building:levels'])||0);
  if(['house','detached','villa','bungalow','cabin','hut'].includes(b))return'villa';if(b==='semidetached_house')return'bifam';if(b==='terrace')return'schiera';
  if(['apartments','dormitory','hotel'].includes(b))return'condo';if(['farm','farmhouse','barn','farm_auxiliary','stable','cowshed'].includes(b))return'cascina';
  if(['commercial','retail','office','industrial','warehouse','supermarket','kiosk','shop'].includes(b))return'shop';if(b==='residential')return lv>=3?'condo':'villa';if(lv>=4)return'condo';return null;}
const BT_MEM={};
/* Fase 4a-4: una sola richiesta per casa anche se la chiedono più parti insieme; se OpenStreetMap risponde
   ma non conosce il tipo, il "non trovato" si ricorda 3 giorni (prima si riaspettava a ogni apertura) */
const BT_WAIT={},BT_NO_MS=3*86400000;
const btFallback=seed=>{const keys=['villa','villa','bifam','schiera','condo','cascina'];return keys[bhash(seed)%keys.length];};
async function bType(lat,lon,seed){const k='zsh_bt_'+lat.toFixed(4)+'_'+lon.toFixed(4);if(BT_MEM[k])return BT_MEM[k];try{const c=localStorage.getItem(k);if(c){BT_MEM[k]=c;return c;}
    const no=+localStorage.getItem(k+'_no')||0;if(no&&Date.now()-no<BT_NO_MS)return btFallback(seed);}catch(e){}
  if(BT_WAIT[k])return BT_WAIT[k];
  return BT_WAIT[k]=(async()=>{let t=null,risposto=false;try{const els=await trOverpass(`[out:json][timeout:15];way(around:18,${lat},${lon})["building"];out tags 5;`,12000,5);risposto=true;if(els&&els.length){for(const e of els){t=btFromTags(e.tags);if(t)break;}}}catch(e){}
    if(!t){t=btFallback(seed);if(risposto)try{localStorage.setItem(k+'_no',String(Date.now()));}catch(e){}}else{try{localStorage.setItem(k,t);}catch(e){}}BT_MEM[k]=t;
    delete BT_WAIT[k];return t;})();}
/* la casa vera: dal tipo scelto all'inizio, altrimenti dalla mappa */
function homeBT(){const g=(typeof G!=='undefined'&&G.type)||'';if(['apt','residence','attico','loft','ringhiera'].includes(g))return'condo';if(g==='schiera')return'schiera';if(g==='bifamiliare')return'bifam';if(g==='casale')return'cascina';if(g==='villa')return'villa';return null;}
/* ---------- LA MIA CASA ---------- */
async function casaTop(){const pg=app.querySelector('.page');if(!pg||pg.querySelector('.mycasa'))return;const r=S.result;const m=W&&W.m;
  const box=document.createElement('div');box.className='panel mycasa';
  box.innerHTML=`<b class="disp" style="font-size:24px">🏠 La tua casa vera</b><small>${esc((S.zone&&S.zone.address)||'')}</small>
    <div class="mcart">${S.answers?houseScene(S.answers,{sid:'my'}):houseArt(homeBT()||'villa',1,'home')}</div>
    <div class="mcchips">${r&&r.idx!=null?`<span>🛡️ Indice <b>${(Math.round(r.idx*10)/10).toString().replace('.',',')}</b>/10</span>`:''}${m?`<span>🌍 Livello mondo <b>${m.wlevel||1}</b></span><span>🧱 <b>${wNum(m.mattoni)}</b></span>`:''}</div>
    <p class="muted" style="font-size:12px;margin:6px 0 0">Forma, piani e tetto vengono dall’edificio vero sulla mappa; porta, grate, vetri, luci e allarme dalle tue risposte; assi, recinzione, scudo e alleati dai rinforzi del gioco.</p>`;
  const after=pg.querySelector('.cback');if(after)after.after(box);else pg.prepend(box);
  /* le case che possiedi */
  const L=myHouses().filter(h=>!h.home);if(!L.length)return;const gal=document.createElement('div');gal.className='panel mygal';
  gal.innerHTML=`<b class="disp" style="font-size:22px">🗺️ Le tue case nel mondo (${L.length})</b><div class="mgrid">${L.map((h,i)=>`<button class="mgc" data-mg="${i}"><div class="mgart" data-mga="${i}">${houseArt('villa',h.level,h.bid,{k:'g'+i})}</div><b>${h.label}</b><small><span data-mgt="${i}">…</span> · liv. ${h.level} · ${kmTxt(h.km)}</small></button>`).join('')}</div>`;
  box.after(gal);gal.querySelectorAll('[data-mg]').forEach(b=>b.onclick=()=>{const h=L[+b.dataset.mg];S.mfHouses=true;go('mappa');setTimeout(()=>mhFly(h,true),900);});
  L.forEach(async(h,i)=>{const t=await bType(h.lat,h.lon,h.bid);const a=gal.querySelector(`[data-mga="${i}"]`),tt=gal.querySelector(`[data-mgt="${i}"]`);if(a)a.innerHTML=houseArt(t,h.level,h.bid,{k:'g'+i});if(tt)tt.textContent=BT[t][1];});}
/* ---------- nella scheda di ogni casa: il suo disegno ---------- */
/* ---------- nella barra "Le tue case" del mondo: miniature ---------- */
</script>
