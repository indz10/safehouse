<script>
/* =========================================================
   PEZZI TENUTI DEL VECCHIO GIOCO (Fase 3b-2)
   I moduli p5e_sfide, p5f_arena, p5g_terreno, p5h_presidi, p5i_hoods,
   p5j_campagna e p5k_guida sono stati tolti; queste parti servono ancora:
   - ccvInit: crediti casa vera (trasloco, coupon degli sponsor)
   - rvStarsTxt: stelle delle recensioni sugli sponsor
   - RULES_CARDS, RULES_Z: tabelle usate dalle istruzioni (manualHTML)
   ========================================================= */
function ccvInit(){G.ccv=G.ccv||{bal:0,log:[],used:{}};G.trof=G.trof||0;G.duelLog=G.duelLog||[];
  if(G.via&&!G.ccv.used.via){const v=viatico();if(v){const c=v.ver*15+Math.max(0,8-Math.round(v.idx))*10;G.ccv.bal+=c;G.ccv.used.via=1;G.ccv.log.unshift({t:'Casa vera valutata',c});}}}
function rvStarsTxt(key){const l=rvList(key,8,4.2);const a=rvAvg(l);return`★ ${a.toFixed(1).replace('.',',')} (${l.length})`;}
const RULES_CARDS=[['🪤','Trappole','3','su corsia','Ferma e ferisce i primi 3 zombie che arrivano su quella corsia'],['🎯','Torretta','5','su corsia','Spara da sola per 20 secondi sulla corsia scelta'],['🧑‍🚒','Rinforzo','4','su corsia','Un difensore in più per 16 secondi'],['🔨','Ripara','3','subito','+35% barricata e un po’ di casa'],['💥','Petardo','3','subito','Esplosione sulla corsia più affollata; unico che colpisce gli scavatori'],['📢','Sirena','4','subito','Rallenta tutta l’orda'],['🚿','Idrante','4','subito','Respinge indietro una corsia'],['🔆','Faro','5','subito','Acceca e ferma tutti per qualche secondo'],['🕸️','Rete','3','subito','Blocca gli zombie in testa'],['🌫️','Fumogeno','3','subito','Confonde: gli zombie si fermano'],['🎵','Stereo','6','subito','Attira l’orda lontano dalla casa']];
const RULES_Z=[['🧟','Vagante','lento, il più comune'],['🏃','Corridore','veloce: fermalo con trappole'],['💪','Bruto','tanta vita: segnalo come bersaglio'],['⛑️','Col casco','dimezza i danni'],['📣','Strillone','fa infuriare chi gli sta vicino'],['⛏️','Scavatore','sotto terra: solo il petardo lo colpisce'],['✨','D’oro','scappa: se lo prendi, 3 gemme'],['👑','Boss','ogni 5 notti, chiama rinforzi']];
</script>
