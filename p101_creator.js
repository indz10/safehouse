<script>
/* =========================================================
   🎬 CONTENT CREATOR (Fase 47, nessun SQL) e 🔔 NOTIFICHE CHE PORTANO ALL'AZIONE
   - creatorSheet (menu ☰ "🎬 Content creator"): il proprio link d'invito, gli amici portati (miei_invitati),
     immagine pronta per i social (shareSheet), idee per i video e la 🎬 Modalità video.
   - Modalità video (body.vidmode, zsh_vid): sfoca i nomi degli altri, gli indirizzi e la posizione mentre si
     registra o si fa una diretta; bollino "🎬 REC" in alto, toccandolo si spegne.
   - Notifiche: ?req=1 → 📬 Richieste, ?alz=1 → le tue alleanze, ?alz=chat → chat dell'alleanza.
   ========================================================= */
const CRT={vid:false};
try{CRT.vid=localStorage.getItem('zsh_vid')==='1';}catch(e){}
function crtVid(on){CRT.vid=!!on;try{localStorage.setItem('zsh_vid',on?'1':'0');}catch(e){}document.body.classList.toggle('vidmode',CRT.vid);
  let b=document.querySelector('.vidrec');if(CRT.vid&&!b){b=document.createElement('button');b.type='button';b.className='vidrec';b.textContent='🎬 REC · nomi nascosti';
    b.onclick=()=>{crtVid(false);toast('🎬 Modalità video spenta');};document.body.appendChild(b);}else if(!CRT.vid&&b)b.remove();}
const CRT_IDEE=[['🏠','“Quanto è sicura casa mia?”','Fai la valutazione in diretta e commenta il punteggio.'],['📷','Caccia con la Lente','Esci in strada, mira gli zombie e apri le casse dei posti veri.'],
  ['🚨','Evento del quartiere','Quando arriva la notifica corri all’evento e chiedi ai follower di aiutarti.'],['👹','Boss della settimana','Organizza i follower della tua zona per abbatterlo insieme.'],
  ['⚔️','Attacco e difesa','Racconta un assalto: chi arriva, i rinforzi, il risultato e i danni da riparare.']];
async function creatorSheet(){if(!S.user){toast('Accedi per il tuo link da creator');try{loginSheet();}catch(e){}return;}
  let L=[];try{const{data}=await SB.rpc('miei_invitati');L=data||[];}catch(e){}const val=L.filter(x=>x.valutato).length;
  openSheet('🎬 Content creator',`<p class="muted" style="font-size:14px">Porta i tuoi follower nel gioco: ognuno che entra col tuo link e valuta la casa ti dà 🧱 150 e gioca nel tuo stesso mondo.</p>
    <div class="crtnum"><div><b>${L.length}</b><small>entrati col tuo link</small></div><div><b>${val}</b><small>hanno valutato la casa</small></div></div>
    <div class="invl"><input readonly value="${esc(shrLink())}"><button class="btn small" data-crtcp>Copia</button></div>
    <button class="btn wide" data-crtsh>📣 Immagine e link per i social</button>
    <div class="crtvid"><div><b>🎬 Modalità video</b><small>Nasconde i nomi degli altri giocatori, gli indirizzi e la posizione mentre registri o sei in diretta.</small></div>
      <button class="btn small ${CRT.vid?'':'ghost'}" data-crtvid>${CRT.vid?'Accesa':'Accendi'}</button></div>
    <h4 style="margin:12px 0 6px">💡 Idee per i video</h4>
    ${CRT_IDEE.map(i=>`<div class="crtidea"><span>${i[0]}</span><div><b>${esc(i[1])}</b><small>${esc(i[2])}</small></div></div>`).join('')}`,c=>{
    c.querySelector('[data-crtcp]').onclick=async()=>{try{await navigator.clipboard.writeText(shrLink());toast('📋 Link copiato');}catch(e){toast('Tieni premuto sul link per copiarlo');}};
    c.querySelector('[data-crtsh]').onclick=()=>{window.SHEET_BACK={t:'‹ Content creator',fn:creatorSheet};shareSheet();};
    c.querySelector('[data-crtvid]').onclick=()=>{crtVid(!CRT.vid);toast(CRT.vid?'🎬 Modalità video accesa: nomi e indirizzi nascosti':'🎬 Modalità video spenta');creatorSheet();};});}
if(CRT.vid)setTimeout(()=>crtVid(true),0);
/* ---------- le notifiche aprono l'azione ---------- */
const _zGoCrt=zGoUrl;zGoUrl=function(u){_zGoCrt(u);try{const q=new URL(u,location.href).searchParams;
  if(q.get('req'))setTimeout(()=>{window.SHEET_BACK=null;msgHub('rich');},1500);
  const a=q.get('alz');if(a)setTimeout(()=>{window.SHEET_BACK=null;a==='chat'?alzChat():alzMenu();},1500);}catch(e){}};
</script>
