<script>
/* =========================================================
   📣 CONDIVIDI SUI SOCIAL (migrazione 020, richiesta di Alessandro 15/11: "pubblicità gratis")
   shareSheet(o): un'immagine pronta (grado, % della casa, comune: MAI l'indirizzo) + il tuo link d'invito,
   con i pulsanti per WhatsApp, Facebook, X, Telegram, Instagram/TikTok (immagine da mettere nella storia),
   📤 Condividi del telefono (immagine + link insieme, dove si può) e 📋 Copia link.
   Premi: la prima condivisione del giorno ⭐ 20 e 🔋 1 (world_sup_share); il premio vero arriva quando un amico
   entra dal link (⭐ 50 + 🔋 2 + scorte, e quando valuta la casa ⭐ 150 + 🧱 150): non si può barare.
   Si apre dal menu ☰ (📣 Condividi), dalla scheda del superstite, quando si sale di grado e da Invita amici.
   ========================================================= */
const SHR={blob:null,url:''};
const shrLink=()=>S.user&&typeof myCode==='function'&&myCode()?invLink():ZSH_SITO;
function shrPct(){try{return typeof mwPct==='function'?mwPct():null;}catch(e){return null;}}
function shrComune(){try{return((S.zone&&S.zone.address)||'').split(',').slice(-1)[0].trim().replace(/^\d{5}\s*/,'').slice(0,30);}catch(e){return'';}}
function shrTxt(o){o=o||{};const g=o.grado||(SUP.d&&SUP.d.grado);const pc=shrPct();
  return`🧟 ${g?`Sono un superstite di grado ${g} su ZombieSafeHouse`:'Gioco a ZombieSafeHouse'}${pc!=null?`: la mia casa vera reggerebbe all’orda zombie al ${pc}%`:''}. Tu quanto resisti?
Valuta la tua casa (è gratis), costruisci le difese e alleati con me 👉 ${shrLink()}`;}
/* l'immagine da condividere (1080×1350, va bene per storie e post) */
async function shrCard(o){o=o||{};const W_=1080,H_=1350;const c=document.createElement('canvas');c.width=W_;c.height=H_;const x=c.getContext('2d');
  const gr=x.createLinearGradient(0,0,0,H_);gr.addColorStop(0,'#1b1f2a');gr.addColorStop(1,'#3b0f12');x.fillStyle=gr;x.fillRect(0,0,W_,H_);
  x.fillStyle='#ffd23f';x.fillRect(0,0,W_,18);x.fillRect(0,H_-18,W_,18);
  x.textAlign='center';x.fillStyle='#fff';x.font='900 86px "Bangers","Impact",system-ui,sans-serif';x.fillText('ZOMBIE SAFEHOUSE',W_/2,150);
  x.font='170px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif';x.fillText('🧟',W_/2,370);
  const g=o.grado||(SUP.d&&SUP.d.grado);const pc=shrPct();const nk=S.user&&S.user.nick?'@'+S.user.nick:'';const cm=shrComune();
  x.font='800 74px system-ui,sans-serif';x.fillStyle='#ffd23f';x.fillText(g?`🎖️ Grado ${g}`:'Superstite',W_/2,520);
  if(nk){x.font='700 52px system-ui,sans-serif';x.fillStyle='#fff';x.fillText(nk,W_/2,600);}
  if(pc!=null){x.fillStyle=pc>=70?'#2bb673':pc>=40?'#f5a623':'#e94b3c';x.beginPath();x.arc(W_/2,800,150,0,Math.PI*2);x.fill();
    x.fillStyle='#fff';x.font='900 120px system-ui,sans-serif';x.fillText(pc+'%',W_/2,840);x.font='600 44px system-ui,sans-serif';x.fillText('la mia casa regge all’orda',W_/2,1010);}
  else{x.font='600 48px system-ui,sans-serif';x.fillStyle='#fff';x.fillText('Quanto resisterebbe casa tua',W_/2,800);x.fillText('a un’apocalisse zombie?',W_/2,870);}
  if(cm){x.font='500 40px system-ui,sans-serif';x.fillStyle='#cfd3dc';x.fillText('📍 '+cm,W_/2,1075);}
  x.font='800 56px system-ui,sans-serif';x.fillStyle='#ffd23f';x.fillText('E tu quanto resisti?',W_/2,1170);
  x.font='500 36px system-ui,sans-serif';x.fillStyle='#fff';x.fillText(ZSH_SITO.replace('https://',''),W_/2,1250);
  return await new Promise(ok=>{try{c.toBlob(b=>ok(b),'image/png');}catch(e){ok(null);}});}
async function shrPremio(dove){if(!S.user||typeof SB==='undefined'||!SB)return;try{const{data,error}=await SB.rpc('world_sup_share',{p_dove:dove});if(!error&&data&&data.ok){toast('📣 '+data.msg);try{supLoad(true);}catch(e){}}}catch(e){}}
async function shareSheet(o){o=o||{};const L=shrLink();const T=shrTxt(o);const e=encodeURIComponent;
  const soc=[['shr-wa','🟢','WhatsApp',`https://wa.me/?text=${e(T)}`],['shr-fb','🔵','Facebook',`https://www.facebook.com/sharer/sharer.php?u=${e(L)}&quote=${e(T)}`],
    ['shr-x','⚫','X (Twitter)',`https://twitter.com/intent/tweet?text=${e(T.replace(L,'').trim())}&url=${e(L)}`],['shr-tg','✈️','Telegram',`https://t.me/share/url?url=${e(L)}&text=${e(T.replace(L,'').trim())}`]];
  openSheet('📣 Condividi e fatti conoscere',`<p class="muted" style="font-size:13px;margin:0 0 8px">Mostra a tutti come resisti all’orda. Ogni amico che entra col <b>tuo link</b> ti fa crescere: ⭐ +50, 🔋 +2 e scorte; quando valuta la casa ⭐ +150 e 🧱 150. La prima condivisione del giorno: ⭐ +20 e 🔋 +1.</p>
    <div class="shrimg"><p class="muted"><span class="spin"></span> Preparo l’immagine…</p></div>
    <button class="btn wide" data-shrnat>📤 Condividi immagine e link</button>
    <div class="shrgrid">${soc.map(s=>`<a class="shrb ${s[0]}" href="${s[3]}" target="_blank" rel="noopener" data-shr="${s[0].slice(4)}"><span>${s[1]}</span>${s[2]}</a>`).join('')}
      <button class="shrb shr-ig" data-shrig><span>📸</span>Instagram</button><button class="shrb shr-tt" data-shrtt><span>🎵</span>TikTok</button></div>
    <div class="invl"><input readonly value="${esc(L)}"><button class="btn small" data-shrcp>📋 Copia</button></div>
    <details class="shrcome"><summary>Come lo metto nella storia di Instagram o su TikTok?</summary><ol><li>Tocca 📸 Instagram o 🎵 TikTok: l’immagine si salva (o si apre la condivisione del telefono) e il link viene copiato.</li><li>Apri l’app e crea una storia o un video con l’immagine.</li><li>Su Instagram aggiungi l’adesivo <b>🔗 Link</b> e incolla il link; su TikTok incollalo nella descrizione o nella bio.</li></ol></details>
    ${!S.user?'<p class="notice" style="margin-top:10px">Crea l’account per avere il tuo link personale e i premi degli amici che entrano.</p>':''}`,async c=>{
    const cp=async(t)=>{try{await navigator.clipboard.writeText(t||L);toast('🔗 Link copiato');}catch(e){toast(L);}};
    c.querySelector('[data-shrcp]').onclick=()=>{cp();shrPremio('copia');};
    c.querySelectorAll('[data-shr]').forEach(a=>a.addEventListener('click',()=>shrPremio(a.dataset.shr)));
    const file=()=>SHR.blob?new File([SHR.blob],'zombiesafehouse.png',{type:'image/png'}):null;
    const nat=async(dove)=>{const f=file();try{if(f&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:T,title:'ZombieSafeHouse'});shrPremio(dove);return true;}
        if(navigator.share){await navigator.share({title:'ZombieSafeHouse',text:T});shrPremio(dove);return true;}}catch(e){if(e&&e.name==='AbortError')return true;}return false;};
    const save=()=>{if(!SHR.url)return;const a=document.createElement('a');a.href=SHR.url;a.download='zombiesafehouse.png';document.body.appendChild(a);a.click();a.remove();};
    c.querySelector('[data-shrnat]').onclick=async()=>{if(!await nat('telefono')){await cp(T);toast('Testo e link copiati: incollali dove vuoi');shrPremio('copia');}};
    const story=dove=>async()=>{await cp();const ok=await nat(dove);if(!ok){save();toast('📸 Immagine salvata e link copiato: mettila nella storia');shrPremio(dove);}};
    c.querySelector('[data-shrig]').onclick=story('instagram');c.querySelector('[data-shrtt]').onclick=story('tiktok');
    try{SHR.blob=await shrCard(o);if(SHR.url)URL.revokeObjectURL(SHR.url);SHR.url=SHR.blob?URL.createObjectURL(SHR.blob):'';}catch(e){SHR.blob=null;}
    const im=c.querySelector('.shrimg');if(im)im.innerHTML=SHR.url?`<img src="${SHR.url}" alt="Immagine da condividere">`:'';});}
</script>
