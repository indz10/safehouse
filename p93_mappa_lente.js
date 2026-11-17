<script>
/* =========================================================
   🗺️ MAPPA PIÙ LIBERA E 📷 LENTE SEMPRE A PORTATA (Fase 31, richiesta di Alessandro 16/11, nessun SQL)
   "La mappa non ha la possibilità di tirare giù i banner e non c'è la Lente che indica dove sono zombie e provviste
    entro 80 m. Semplifica."
   - Il cassetto in basso (carta ADESSO) si TIRA GIÙ: trascinando in basso (o col tasto ▾) diventa una riga sottile
     ("⬆️ Adesso: …"); trascinando in su torna. Si ricorda la scelta (zsh_mwmin). Aperto del tutto come prima (▲).
   - 📷 Tasto Lente tondo e grande sulla mappa, sopra il cassetto (mlFab): con quanti 🧟 zombie e 📦 casse ci sono
     entro 80 m; se ce n'è uno vicino pulsa ("🧟 a 33 m: entra!").
   - Nella Lente il tasto 🛡️ Difendi casa compare solo vicino alla tua casa (entro 300 m), così sotto restano meno tasti.
   ========================================================= */
MW.min=(()=>{try{return localStorage.getItem('zsh_mwmin')==='1';}catch(e){return false;}})();
function mlSetMin(v){MW.min=!!v;try{localStorage.setItem('zsh_mwmin',MW.min?'1':'0');}catch(e){}const d=document.querySelector('.mapfull .mwdrawer');if(d)mwDrawerPaint(d);}
const _mwDrawerPaintMl=mwDrawerPaint;mwDrawerPaint=function(d){_mwDrawerPaintMl.apply(this,arguments);try{mlDrawer(d);}catch(e){}};
function mlDrawer(d){if(!d)return;
  if(MW.min&&!MW.open){let t='';try{const I=typeof gdItems==='function'&&GD&&GD.d?gdItems(GD.d):[];if(I[0])t=I[0].t;}catch(e){}
    d.classList.add('min');d.innerHTML=`<button class="mlmin" data-mlup type="button"><i>⬆️</i><span><b>ADESSO</b>${t?' · '+String(t).replace(/<[^>]+>/g,''):' · tocca per vedere'}</span></button>`;
    d.querySelector('[data-mlup]').onclick=()=>mlSetMin(false);}
  else{d.classList.remove('min');if(!MW.open&&!d.querySelector('[data-mldown]')){const g=d.querySelector('.mwgrip');if(g)g.insertAdjacentHTML('afterend','<button class="mldown" data-mldown type="button" aria-label="Abbassa">▾ Abbassa</button>');
    const b=d.querySelector('[data-mldown]');if(b)b.onclick=e=>{e.stopPropagation();mlSetMin(true);};}}
  requestAnimationFrame(()=>{try{document.body.style.setProperty('--mwdh',Math.max(MW.min&&!MW.open?44:100,d.offsetHeight||0)+'px');}catch(e){}});
  if(!d._mlsw){d._mlsw=1;let y0=null;d.addEventListener('touchstart',e=>{y0=e.touches[0].clientY;},{passive:true});
    d.addEventListener('touchend',e=>{if(y0==null)return;const dy=e.changedTouches[0].clientY-y0;y0=null;if(Math.abs(dy)<45)return;
      if(dy>0){if(MW.open){MW.open=false;mwDrawerPaint(d);}else if(!MW.min)mlSetMin(true);}
      else{if(MW.min)mlSetMin(false);else if(!MW.open&&d.scrollTop<=0){MW.open=true;mwDrawerPaint(d);}}},{passive:true});}}
/* 📷 il tasto Lente sulla mappa, con quello che c'è entro 80 m */
function mlNear(){const p=typeof zmPos==='function'?zmPos():null;if(!p||typeof ZM==='undefined')return{z:0,c:0,v:null};let z=0,c=0,v=null;
  (ZM.L||[]).forEach(o=>{if(o.preso)return;const d=trM(p.lat,p.lon,o.lat,o.lon);if(d>80)return;if(o.k==='cassa')c++;else z++;if(!v||d<v.d)v={...o,d};});return{z,c,v};}
function mlFab(){const w=document.querySelector('.mapfull');if(!w||S.tab!=='mappa'||!S.user||document.getElementById('lente')){const o=document.querySelector('.mlfab');if(o&&!w)o.remove();return;}
  let b=w.querySelector('.mlfab');if(!b){w.insertAdjacentHTML('beforeend','<button class="mlfab" type="button" data-mlfab><span>📷</span><b>Lente</b><i></i></button>');b=w.querySelector('.mlfab');b.onclick=()=>lenteOpen();}
  const n=mlNear();const g=typeof pvNear==='function'?pvNear(80):0;const t=[n.z?'🧟 '+n.z:'',n.c?'📦 '+n.c:'',g?'🎁 '+g:''].filter(Boolean).join(' · ');const i=b.querySelector('i');if(i.textContent!==t)i.textContent=t;i.hidden=!t;
  b.classList.toggle('caldo',!!n.v||g>0);b.title=n.v?`${n.v.k==='cassa'?'📦 Cassa':'🧟 Zombie'} a ${Math.round(n.v.d)} m: entra nella Lente!`:'Apri la Lente: zombie, casse e posti veri intorno a te';}
zEvery(()=>{try{if(!document.hidden)mlFab();}catch(e){}},1500,'lente-mappa');
/* nella Lente: 🛡️ Difendi casa solo vicino a casa */
zEvery(()=>{try{if(typeof LENTE==='undefined'||!LENTE.on||!LENTE.root)return;const b=LENTE.root.querySelector('[data-dfago]');if(!b)return;const p=LENTE.pos;let h=null;try{h=myHouses().find(x=>x.home);}catch(e){}
  const vic=!!(p&&h&&trM(p.lat,p.lon,h.lat,h.lon)<=300);b.hidden=!vic;}catch(e){}},2000,'lente-difendi');
</script>
