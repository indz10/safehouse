<script>
/* =========================================================
   PEZZI TENUTI DEL VECCHIO GIOCO (Fase 3b-2)
   I moduli p5e_sfide, p5f_arena, p5g_terreno, p5h_presidi, p5i_hoods,
   p5j_campagna e p5k_guida sono stati tolti; queste parti servono ancora:
   - ccvInit: crediti casa vera (trasloco, coupon degli sponsor)
   - rvStarsTxt: stelle delle recensioni sugli sponsor
   ========================================================= */
function ccvInit(){G.ccv=G.ccv||{bal:0,log:[],used:{}};G.trof=G.trof||0;G.duelLog=G.duelLog||[];
  if(G.via&&!G.ccv.used.via){const v=viatico();if(v){const c=v.ver*15+Math.max(0,8-Math.round(v.idx))*10;G.ccv.bal+=c;G.ccv.used.via=1;G.ccv.log.unshift({t:'Casa vera valutata',c});}}}
function rvStarsTxt(key){const l=rvList(key,8,4.2);const a=rvAvg(l);return`★ ${a.toFixed(1).replace('.',',')} (${l.length})`;}
</script>
