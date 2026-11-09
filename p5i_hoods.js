<script>
/* =========================================================
   QUARTIERI CONDIVISI
   - ognuno ha il proprio quartiere; con un invito si entra nel
     quartiere di un altro (es. Mantova ↔ Firenze) e lo si difende insieme
   - gli edifici hanno un proprietario; si possono vendere e comprare
     tra i membri del quartiere
   - nessuna casa reale: solo edifici a fumetto
   ========================================================= */
const FRIEND_NICK=id=>{const f=(G.friends||[]).find(x=>x.id===id);return f?f.nick:id;};
function hoodsInit(){if(G.hoods)return;G.hoods={own:{id:'own',name:'Il tuo quartiere',city:S.zone?S.zone.address.split(',').slice(-1)[0].trim():'Il tuo comune',host:null,members:[],lots:G.lots}};G.curHood='own';
  G.invites=[{id:'h-luna',from:'f1',city:'Firenze'}];}
function curHood(){hoodsInit();return G.hoods[G.curHood];}
function makeGuestHood(inv){const r=rng(9131+inv.city.length*31);const ids=LOTS.map(l=>l.id).sort(()=>r()-.5);const lots={};
  ids.slice(0,7).forEach((id,i)=>{lots[id]=i%3===2?{kind:'bld',b:['farmacia','caserma','supermercato'][i%3===2?Math.floor(r()*3):0],lv:1+Math.floor(r()*2),owner:inv.from}:{kind:'house',lv:1+Math.floor(r()*2),ten:{n:['mecc','inf','guard','orto'][Math.floor(r()*4)]},prep:1+Math.floor(r()*2),owner:inv.from};});
  lots[ids[1]].sale=Math.round(LOTS.find(l=>l.id===ids[1]).cost*1.3/10)*10;
  return{id:inv.id,name:`Quartiere di @${FRIEND_NICK(inv.from)}`,city:inv.city,host:inv.from,members:[inv.from],lots,seed:inv.city.length*977+13};}
function setHood(id){hoodsInit();G.hoods[G.curHood].lots=G.lots;G.curHood=id;G.lots=G.hoods[id].lots;G.sel=null;vibe();toast(`Sei in: ${G.hoods[id].name}${G.hoods[id].city?' · '+G.hoods[id].city:''}`);renderHub();window.scrollTo(0,0);}
function hoodBar(){hoodsInit();const H=curHood();
  return`<div class="panel hoodbar"><div class="row spread"><b class="disp" style="font-size:20px">🏘️ I tuoi quartieri</b><small class="muted">difendili insieme</small></div>
   <div class="hchips">${Object.values(G.hoods).map(h=>`<button class="hchip ${h.id===G.curHood?'on':''}" data-hood="${h.id}"><b>${h.id==='own'?'Il mio':'@'+esc(FRIEND_NICK(h.host))}</b><small>${esc(h.city||'')}${h.members.length?` · ${h.members.length+1} giocatori`:''}</small></button>`).join('')}</div>
   ${(G.invites||[]).map(v=>`<div class="hinv"><span>📨 <b>@${esc(FRIEND_NICK(v.from))}</b> ti invita nel suo quartiere a <b>${esc(v.city)}</b></span><button class="btn small" data-hacc="${v.id}">Unisciti</button></div>`).join('')}
   <div class="row" style="gap:6px;margin-top:8px"><input class="field" id="hcode" placeholder="Codice invito (prova: ZSH-ROMA)" autocapitalize="characters" style="flex:1"><button class="btn small ghost" id="hjoin">Entra</button></div>
   ${H.id==='own'?`<button class="btn small alt" id="hinvite" style="margin-top:8px">Invita qualcuno nel tuo quartiere</button>`:`<p style="font-weight:400;font-size:13px;margin-top:8px">Sei ospite di @${esc(FRIEND_NICK(H.host))}: compra edifici liberi, difendi anche i suoi. Edifici in vendita hanno il bollino <b>€ in vendita</b>.</p>`}
   ${H.members.length?`<p class="muted" style="font-size:12px;margin-top:6px">In questo quartiere: Tu, ${H.members.map(m=>'@'+esc(FRIEND_NICK(m))).join(', ')}. L’orda attacca tutti gli edifici: chi gioca difende anche quelli degli altri.</p>`:''}</div>`;}
function bindHoods(){
  app.querySelectorAll('[data-hood]').forEach(b=>b.onclick=()=>setHood(b.dataset.hood));
  app.querySelectorAll('[data-hacc]').forEach(b=>b.onclick=()=>{const v=G.invites.find(x=>x.id===b.dataset.hacc);G.invites=G.invites.filter(x=>x!==v);G.hoods[v.id]=makeGuestHood(v);sfx('win');setHood(v.id);});
  const j=$('#hjoin');if(j)j.onclick=()=>{const c=($('#hcode').value||'').trim().toUpperCase();const m=c.match(/^ZSH-([A-Z]+)$/);if(!m){toast('Codice non valido');return;}
    const city=m[1][0]+m[1].slice(1).toLowerCase();const id='h-'+city.toLowerCase();if(G.hoods[id]){setHood(id);return;}
    const from=(G.friends||[])[1]?G.friends[1].id:'f2';G.hoods[id]=makeGuestHood({id,from,city});setHood(id);};
  const inv=$('#hinvite');if(inv)inv.onclick=()=>{if(window.doInvite)window.doInvite();setTimeout(()=>{const H=G.hoods.own;if(H.members.includes('f3'))return;H.members.push('f3');
    const r=rng(77);const free=LOTS.filter(l=>!G.lots[l.id]).sort(()=>r()-.5).slice(0,2);free.forEach((l,i)=>{G.lots[l.id]={kind:'house',lv:1,ten:{n:'orto'},owner:'f3',...(i===0?{sale:Math.round(l.cost*1.2/10)*10}:{})};});
    toast('@zia_pina è entrata nel tuo quartiere e ha comprato 2 edifici');if(S.tab==='orda'&&G.view==='hub')renderHub();},2600);};
}
/* edifici di altri: scheda dedicata; i propri: vendita */
const _lotSheet=lotSheet;
lotSheet=function(id){const b=G.lots[id];const l=LOTS.find(x=>x.id===id);
  if(b&&b.owner){const nick=FRIEND_NICK(b.owner);const nm=b.kind==='bld'?BLD[b.b].name:LOT_KIND[l.kind].n;
    openSheet(`${b.kind==='bld'?BLD[b.b].ic:'🏠'} ${nm} di @${esc(nick)}`,`<p style="font-weight:400;margin-bottom:8px">${ZL[l.zone]} · lo difendi anche tu: quando l’orda arriva qui, puoi correre a proteggerlo dal radar.</p>
      ${b.sale?`<div class="wsbuy ${G.coins<b.sale?'no':''}"><div><b>In vendita</b><small>@${esc(nick)} lo vende a 🪙 ${b.sale}</small>${G.coins<b.sale?`<small>Ti mancano ${b.sale-G.coins} monete.</small>`:''}</div><div class="col2"><button class="btn small" data-obuy ${G.coins<b.sale?'disabled':''}>Compra</button></div></div>`
        :`<button class="btn wide ghost" data-oask>Chiedi a @${esc(nick)} di vendertelo</button>`}`,
    card=>{const bb=card.querySelector('[data-obuy]');if(bb)bb.onclick=()=>{if(G.coins<b.sale)return;G.coins-=b.sale;delete b.owner;delete b.sale;sfx('coin');toast(`Comprato da @${nick}: ora è tuo`);closeSheet();renderHub();};
      const ak=card.querySelector('[data-oask]');if(ak)ak.onclick=()=>{ak.disabled=true;ak.textContent='Richiesta inviata…';setTimeout(()=>{b.sale=Math.round(l.cost*1.4/10)*10;toast(`@${nick} accetta: te lo vende a 🪙 ${b.sale}`);lotSheet(id);},1600);};});return;}
  _lotSheet(id);
  const H=curHood();const others=H.id==='own'?H.members:[H.host,...H.members.filter(m=>m!==H.host)];
  if(b&&others.length){const body=document.querySelector('#sheet .sheet-b');if(!body)return;const nick=FRIEND_NICK(others[0]);const price=Math.round(l.cost*(b.kind==='bld'?1.1:1)*(1+.2*((b.lv||1)-1))/10)*10;
    body.insertAdjacentHTML('beforeend',`<div class="wsbuy" style="margin-top:12px"><div><b>💱 Vendi a @${esc(nick)}</b><small>Prezzo proposto 🪙 ${price}. Lui o lei decide se comprare.</small></div><div class="col2"><button class="btn small alt" data-osell>Proponi</button></div></div>`);
    body.querySelector('[data-osell]').onclick=e=>{e.target.disabled=true;e.target.textContent='Proposta inviata';setTimeout(()=>{if(!G.lots[id])return;G.coins+=price;G.lots[id].owner=others[0];delete G.lots[id].sale;toast(`@${nick} ha comprato per 🪙 ${price}`);closeSheet();if(S.tab==='orda'&&G.view==='hub')renderHub();},1800);};}
};
</script>
