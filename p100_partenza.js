<script>
/* =========================================================
   🏠 DA QUALE CASA PARTI (migrazione 037, richiesta di Alessandro 18/11)
   - Prima di ⚔️ attaccare, 📯 unirsi a un raduno, 🛡️ mandare rinforzi o aiuti, 🎒 mandare il superstite a un posto o
     a una cassa, se hai più di una casa compare la scelta della casa di partenza (.partpick, sotto il pulsante):
     distanza, tempo, ⛽ e portata si calcolano da lì (world_partenza_set, vale 30 minuti).
   - Le notifiche dei danni (orda, casa crollata o persa, lavori finiti) aprono 🏠 Le mie case (url ?case=1).
   ========================================================= */
const PART={bid:null,label:'',at:0};
const PART_SEL='[data-pvgo],[data-pvrad],[data-pvjoin],[data-pvrf],[data-pvs],[data-spgo],[data-mvsped],[data-zmsped],[data-pa="help"],[data-shelp],[data-arns]';
const partOk=()=>PART.bid!=null&&Date.now()-PART.at<30*60e3;
function partCase(){try{return myHouses().filter(h=>h.lat!=null&&(h.bid||h.home));}catch(e){return[];}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest(PART_SEL);if(!b||!S.user)return;
  if(b.dataset.partok==='1'){delete b.dataset.partok;return;}const H=partCase();if(H.length<2)return;
  e.preventDefault();e.stopImmediatePropagation();
  const old=document.querySelector('.partpick');if(old)old.remove();
  const box=document.createElement('div');box.className='partpick';
  box.innerHTML=`<b>🏠 Da quale casa parti?</b><small>Distanza, tempo e carburante si calcolano dalla casa che scegli.</small>
    ${H.map((h,i)=>`<button type="button" class="mzopt ${partOk()&&PART.bid===(h.bid||'')?'on':''}" data-pi="${i}"><span>${h.home?'❤️':'🔑'}</span><b>${esc(h.home?'Casa tua':h.label||'Casa comprata')}</b><small>livello ${h.level||1}</small></button>`).join('')}
    <button type="button" class="mzopt" data-pi="-1"><span>📍</span><b>La più vicina</b><small>come prima</small></button>`;
  b.insertAdjacentElement('beforebegin',box);box.scrollIntoView({block:'nearest',behavior:'smooth'});
  box.querySelectorAll('[data-pi]').forEach(x=>x.onclick=async ev=>{ev.stopPropagation();const i=+x.dataset.pi;const h=i>=0?H[i]:null;
    try{await SB.rpc('world_partenza_set',{p_bid:h?(h.bid||''):''});}catch(er){}
    PART.bid=h?(h.bid||''):null;PART.label=h?(h.home?'Casa tua':h.label):'';PART.at=Date.now();try{MZC.d={};}catch(er){}
    box.remove();if(h)toast('🏠 Parti da: '+PART.label);b.dataset.partok='1';b.click();});},true);
/* la distanza che vede l'app (spedizioni, casse, mezzi) parte dalla casa scelta */
const _supKmPart=supKm;supKm=function(p){try{if(partOk()&&PART.bid!==null){const h=partCase().find(x=>(x.bid||'')===PART.bid);if(h&&p&&p.lat!=null)return Math.max(0.2,Math.round(trM(h.lat,h.lon,p.lat,p.lon)/10)/100);}}catch(e){}return _supKmPart.apply(this,arguments);};
/* notifiche dei danni → Le mie case */
const _zGoPart=zGoUrl;zGoUrl=function(u){_zGoPart(u);try{if(new URL(u,location.href).searchParams.get('case'))setTimeout(()=>{window.SHEET_BACK=null;casasSheet();},1600);}catch(e){}};
</script>
