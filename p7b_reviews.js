<script>
/* =========================================================
   RECENSIONI (stile TripAdvisor) per attività e vacanze
   Produzione: tabella reviews su Supabase, una recensione per
   utente e attività, moderazione prima della pubblicazione.
   ========================================================= */
const RV_NICK=['viaggiatrice_mn','bunkerboy','zia_pina','lucaB','marta.r','il_pescatore','cicloturista','famigliaferri','gio_lago','nebbia'];
const RV_TYPE=[['famiglia','In famiglia'],['coppia','In coppia'],['amici','Con amici'],['solo','Da solo'],['lavoro','Per lavoro']];
const RV_TXT={
 5:[['Da tornarci','Accoglienza ottima, tutto pulito e personale gentile. Lo consiglio senza dubbi.'],['Perfetto','Posizione comoda e servizio veloce. Prezzi onesti per la qualità.'],['Una certezza','Ci veniamo ogni volta che siamo in zona: mai una delusione.']],
 4:[['Molto bene','Esperienza positiva, qualche attesa nelle ore di punta ma ne vale la pena.'],['Consigliato','Buon rapporto qualità prezzo. Parcheggio un po’ scomodo.']],
 3:[['Nella media','Niente di speciale ma nemmeno di negativo. Personale cordiale.'],['Così così','Il posto è carino, il servizio un po’ lento.']],
 2:[['Da migliorare','Ci aspettavamo di più, soprattutto per il prezzo.']],
 1:[['Deludente','Esperienza negativa: attesa lunga e nessuna scusa.']]
};
const VAC=[['hotel','Hotel','🏨',['€€','€€€']],['bb','B&B','🛏️',['€','€€']],['agri','Agriturismo','🌾',['€€']],['risto','Ristorante','🍝',['€','€€','€€€']],['attr','Da vedere','🏛️',['gratis','€']],['camp','Campeggio','⛺',['€']]];
const VNAME={hotel:['Hotel Mincio','Hotel Alla Torre','Grand Hotel Lago'],bb:['B&B La Corte','B&B Il Glicine','B&B Casa Nonna'],agri:['Agriturismo Le Valli','Corte Bassa'],risto:['Trattoria del Ponte','Osteria La Nebbia','Pizzeria Luna Piena'],attr:['Castello medievale','Pista ciclabile del fiume','Museo civico'],camp:['Camping Riva Verde']};
function rvGen(key,n,base){const r=rng(key.split('').reduce((a,c)=>a+c.charCodeAt(0),0)*7+n);const out=[];
  for(let i=0;i<n;i++){let st=Math.max(1,Math.min(5,Math.round(base+(r()-.5)*2.4)));const pool=RV_TXT[st];const tx=pool[Math.floor(r()*pool.length)];
    out.push({nick:RV_NICK[Math.floor(r()*RV_NICK.length)],st,title:tx[0],txt:tx[1],type:RV_TYPE[Math.floor(r()*RV_TYPE.length)][0],when:['settembre 2026','agosto 2026','luglio 2026','giugno 2026','ottobre 2026'][Math.floor(r()*5)],useful:Math.floor(r()*14),ver:r()<.6});}
  return out;}
function rvStore(){S.rv=S.rv||{};return S.rv;}
function rvList(key,seedN,base){const st=rvStore();if(!st[key])st[key]=rvGen(key,seedN,base);return st[key];}
function rvAvg(l){return l.length?l.reduce((a,x)=>a+x.st,0)/l.length:0;}
function rvStars(v,size=14){const full=Math.round(v*2)/2;return`<span class="rstars" style="font-size:${size}px" aria-label="${v.toFixed(1).replace('.',',')} su 5">${[1,2,3,4,5].map(i=>`<i class="${full>=i?'f':full>=i-.5?'h':''}"></i>`).join('')}</span>`;}
function rvLine(key,seedN,base){const l=rvList(key,seedN,base);const a=rvAvg(l);return`${rvStars(a)} <b>${a.toFixed(1).replace('.',',')}</b> <small class="muted">(${l.length})</small>`;}
function vacData(z){const r=rng((z.seed||7)+333);const out=[];VAC.forEach(([k,l,ic,pr])=>{(VNAME[k]||[]).forEach((nm,i)=>{if(r()<(k==='camp'&&z.type==='centro'?.1:.85))out.push({k,l,ic,name:nm,price:pr[Math.floor(r()*pr.length)],dist:Math.round(200+r()*4000),base:3.2+r()*1.6,n:6+Math.floor(r()*10),key:'v-'+(z.address||'')+'-'+nm,partner:r()<.18});});});return out;}
function vacanzaHTML(z){
  const items=vacData(z);const f=S.vf||'tutti';const sorted=items.filter(x=>f==='tutti'||x.k===f).sort((a,b)=>(b.partner-a.partner)||(rvAvg(rvList(b.key,b.n,b.base))-rvAvg(rvList(a.key,a.n,a.base))));
  return`${commCard(z)}<div class="panel mapwrap" style="padding:0;overflow:hidden" id="vacmap"><div class="mapsvg">${mapScene(z,{poi:false,users:false,heat:false,me:false,mode:'day',comm:true,spons:true})}</div><div class="mapinfo" id="vacinfo"><span class="muted">Tocca un’area per vedere la community, o una ⭐ per lo sponsor.</span></div></div><div class="panel moon"><b class="disp" style="font-size:22px">Vacanza in zona</b><p style="font-weight:400;font-size:14px;margin-top:4px">Dove dormire, mangiare e cosa vedere, con le recensioni di chi c’è stato davvero. E il livello di sicurezza della zona, per dormire tranquilli.</p></div>
   <div class="chips" style="margin:8px 0">${[['tutti','Tutto'],...VAC.map(v=>[v[0],v[2]+' '+v[1]])].map(([k,l])=>`<button class="chip ${f===k?'on':''}" data-vf="${k}">${l}</button>`).join('')}</div>
   ${sorted.map(x=>{const l=rvList(x.key,x.n,x.base);const a=rvAvg(l);return`<div class="vcard ${x.partner?'feat':''}">
     <div class="vic">${x.ic}</div><div style="flex:1;min-width:0">${x.partner?'<span class="tag sp">Sponsorizzato</span> ':''}<b class="disp" style="font-size:20px">${esc(x.name)}</b>
     <div class="row" style="gap:6px;flex-wrap:wrap">${rvStars(a,15)}<b>${a.toFixed(1).replace('.',',')}</b><small class="muted">${l.length} recensioni</small></div>
     <small>${x.l} · ${x.price} · a ${x.dist<1000?x.dist+' m':(x.dist/1000).toFixed(1).replace('.',',')+' km'}</small>
     ${l[0]?`<p class="vq">“${esc(l[l.length-1].txt)}” <small>— @${esc(l[l.length-1].nick)}</small></p>`:''}
     <div class="row" style="gap:6px;margin-top:6px"><button class="btn small" data-rv="${esc(x.key)}" data-rvn="${esc(x.name)}" data-rvc="${x.n}" data-rvb="${x.base.toFixed(2)}">Recensioni</button><button class="btn small ghost" data-rvw="${esc(x.key)}" data-rvn="${esc(x.name)}" data-rvc="${x.n}" data-rvb="${x.base.toFixed(2)}">Scrivi</button></div></div></div>`;}).join('')}
   <p class="notice" style="margin:10px 0">Come verifichiamo: una recensione per persona e per attività, controllo prima della pubblicazione, nessuna recensione a pagamento. Le recensioni “verificate” arrivano da chi ha dimostrato la visita.</p>`;
}
function reviewsSheet(key,name,n,base){
  const l=rvList(key,n,base);const a=rvAvg(l);const flt=S.rvf||'tutti';const cnt=[5,4,3,2,1].map(s=>l.filter(x=>x.st===s).length);
  const shown=l.filter(x=>flt==='tutti'||x.type===flt).slice().reverse();
  openSheet(`Recensioni · ${esc(name)}`,`
    <div class="rvtop"><div class="rvbig"><b>${a.toFixed(1).replace('.',',')}</b>${rvStars(a,18)}<small>${l.length} recensioni</small></div>
      <div class="rvbars">${[5,4,3,2,1].map((s,i)=>`<div><span>${['Eccellente','Molto buono','Nella media','Scarso','Pessimo'][i]}</span><i><b style="width:${l.length?cnt[i]/l.length*100:0}%"></b></i><small>${cnt[i]}</small></div>`).join('')}</div></div>
    <div class="chips" style="margin:10px 0">${[['tutti','Tutti'],...RV_TYPE].map(([k,t])=>`<button class="chip ${flt===k?'on':''}" data-rvf="${k}">${t}</button>`).join('')}</div>
    <button class="btn wide alt" data-rvw2>Scrivi una recensione</button>
    ${shown.map((r,i)=>`<div class="rv"><div class="row spread"><div class="row" style="gap:8px"><span class="ti av" style="background:${['#d7263d','#2f7fb8','#3f9b5f','#a8743a','#8f86b8'][r.nick.length%5]};width:32px;height:32px">${esc(r.nick[0].toUpperCase())}</span><div><b>@${esc(r.nick)}</b><small class="muted" style="display:block">${RV_TYPE.find(t=>t[0]===r.type)[1]} · ${esc(r.when)}</small></div></div>${r.ver?'<span class="tag ia">✓ visita verificata</span>':''}</div>
      <div style="margin-top:6px">${rvStars(r.st,15)} <b>${esc(r.title)}</b></div><p style="font-weight:400;font-size:14px;margin:4px 0">${esc(r.txt)}</p>
      <div class="row" style="gap:8px"><button class="linkbtn" data-useful="${l.indexOf(r)}">👍 Utile (${r.useful})</button><button class="linkbtn" data-report="1">Segnala</button></div></div>`).join('')||'<p class="notice">Nessuna recensione per questo tipo di viaggio.</p>'}`,
  card=>{card.querySelectorAll('[data-rvf]').forEach(b=>b.onclick=()=>{S.rvf=b.dataset.rvf;reviewsSheet(key,name,n,base);});
    card.querySelector('[data-rvw2]').onclick=()=>writeReview(key,name,n,base);
    card.querySelectorAll('[data-useful]').forEach(b=>b.onclick=()=>{const r=l[+b.dataset.useful];if(r._u)return;r._u=1;r.useful++;b.textContent=`👍 Utile (${r.useful})`;});
    card.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>toast('Segnalazione inviata ai moderatori (demo)'));});
}
function writeReview(key,name,n,base){
  let st=0;
  openSheet(`La tua recensione · ${esc(name)}`,`
    <p class="muted" style="margin-bottom:6px">Com’è andata?</p>
    <div class="rpick" role="radiogroup" aria-label="Voto">${[1,2,3,4,5].map(i=>`<button data-st="${i}" role="radio" aria-label="${i} su 5">★</button>`).join('')}</div>
    <label class="fl" for="rT">Titolo</label><input class="field" id="rT" maxlength="60" placeholder="In breve">
    <label class="fl" for="rX">La tua esperienza</label><textarea class="field" id="rX" rows="4" placeholder="Cosa ti è piaciuto e cosa no? Almeno 50 caratteri."></textarea>
    <div class="row" style="gap:8px"><div style="flex:1"><label class="fl" for="rY">Con chi</label><select class="field" id="rY">${RV_TYPE.map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select></div>
      <div style="flex:1"><label class="fl" for="rM">Quando</label><select class="field" id="rM">${['ottobre 2026','settembre 2026','agosto 2026','luglio 2026'].map(m=>`<option>${m}</option>`).join('')}</select></div></div>
    <label class="ck"><input type="checkbox" id="rC"> Racconto una mia esperienza reale e non ho ricevuto compensi o sconti per questa recensione.</label>
    <p id="rErr" class="ferr" role="alert"></p>
    <button class="btn wide" id="rSend">Pubblica</button>
    <p class="muted" style="font-size:12px;margin-top:8px">Le recensioni vengono controllate prima della pubblicazione.</p>`,
  card=>{const btns=[...card.querySelectorAll('[data-st]')];btns.forEach(b=>b.onclick=()=>{st=+b.dataset.st;btns.forEach(x=>x.classList.toggle('on',+x.dataset.st<=st));});
    card.querySelector('#rSend').onclick=()=>{const t=card.querySelector('#rT').value.trim(),x=card.querySelector('#rX').value.trim(),e=card.querySelector('#rErr');
      if(!st){e.textContent='Scegli da 1 a 5 stelle.';return;}if(t.length<3){e.textContent='Scrivi un titolo.';return;}if(x.length<50){e.textContent=`Ancora ${50-x.length} caratteri, raccontaci qualcosa in più.`;return;}
      if(!card.querySelector('#rC').checked){e.textContent='Conferma che è un’esperienza reale e non pagata.';return;}
      rvList(key,n,base).push({nick:(S.user&&S.user.nick)||'tu',st,title:t,txt:x,type:card.querySelector('#rY').value,when:card.querySelector('#rM').value,useful:0,ver:false});
      toast('Grazie! La recensione è pubblicata (in produzione passa prima dalla moderazione)');sfx('coin');reviewsSheet(key,name,n,base);if(S.tab==='mappa')renderVivere();};});
}
function bindReviews(){
  app.querySelectorAll('[data-rv]').forEach(b=>b.onclick=()=>reviewsSheet(b.dataset.rv,b.dataset.rvn,+b.dataset.rvc,+b.dataset.rvb));
  app.querySelectorAll('[data-rvw]').forEach(b=>b.onclick=()=>writeReview(b.dataset.rvw,b.dataset.rvn,+b.dataset.rvc,+b.dataset.rvb));
  app.querySelectorAll('[data-vf]').forEach(b=>b.onclick=()=>{S.vf=b.dataset.vf;renderVivere();});
  const vm=document.querySelector('#vacmap .mapsvg');if(vm){const z=S.reZone||S.zone;if(z)wireCommunity(vm,z,$('#vacinfo'));}
  app.querySelectorAll('[data-rvm]').forEach(b=>b.onclick=()=>{S.rvMode=b.dataset.rvm;renderVivere();});
}
function rvSeg(){return'';return`<div class="seg" style="margin-bottom:12px"><button class="${S.rvMode!=='vacanza'?'on':''}" data-rvm="vivere">🏘️ Ci vivo o compro</button><button class="${S.rvMode==='vacanza'?'on':''}" data-rvm="vacanza">🧳 Ci vado in vacanza</button></div>`;}
</script>
