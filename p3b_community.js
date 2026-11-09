<script>
/* =========================================================
   COMMUNITY E SPONSOR SULLA MAPPA REALE
   - celle esagonali: si mostra il numero di utenti solo se >= 5
   - sponsor: segnaposto con scheda e collegamento
   Produzione: celle H3 su Supabase (si salva solo la cella).
   ========================================================= */
const K_MIN=5;
const SP_CAT={ferr:'Ferramenta e sicurezza',sic:'Allarmi e porte blindate',sol:'Energia e fotovoltaico'};
const SP_LINK={ferr:{web:'https://www.example.com/ferramenta-volta',ig:'https://www.instagram.com/',fb:'https://www.facebook.com/'},sic:{web:'https://www.example.com/sicurcasa',ig:'https://www.instagram.com/'},sol:{web:'https://www.example.com/solarbox',fb:'https://www.facebook.com/'}};
const SP_OFF={ferr:'−10% sulle grate con il codice dell’app',sic:'Sopralluogo gratuito dopo la valutazione',sol:'Check-up energetico gratuito'};
function commCells(z){const gr=(typeof S!=='undefined'&&S.commGrowth)||1;if(z._comm&&z._commG===gr)return z._comm;z._commG=gr;const r=rng((z.seed||7)+11);const R=34,s3=Math.sqrt(3);const base=z.type==='centro'?14:z.type==='periferia'?8:4;const out=[];
  for(let row=0;row<6;row++)for(let col=0;col<8;col++){const x=24+col*R*s3+(row%2)*R*s3/2,y=36+row*R*1.5;if(x>392)continue;
    const n=Math.max(0,Math.round(base*gr*(.15+r()*1.5)));const avg=Math.max(1,Math.min(10,(z.avgU||5)+(r()-.5)*3));out.push({x,y,n,avg});}
  z._comm=out;return out;}
function commSummary(z){const c=commCells(z);const vis=c.filter(x=>x.n>=K_MIN);const tot=c.reduce((a,x)=>a+x.n,0);const avg=vis.length?vis.reduce((a,x)=>a+x.avg*x.n,0)/vis.reduce((a,x)=>a+x.n,0):0;return{tot,cells:vis.length,avg};}
function hexPath(x,y,R){let d='';for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);d+=(i?'L':'M')+(x+R*Math.cos(a)).toFixed(1)+' '+(y+R*Math.sin(a)).toFixed(1);}return d+'Z';}
function commLayer(z){return`<g class="commL">${commCells(z).map((c,i)=>{const ok=c.n>=K_MIN;const col=c.avg<=4?'#3f9b5f':c.avg<=6?'#f7d64a':'#d7263d';
  return`<g data-hex="${i}" style="cursor:pointer"><path d="${hexPath(c.x,c.y,33)}" fill="${ok?col:'#cfc6e6'}" fill-opacity="${ok?.32:.18}" stroke="#140f1f" stroke-width="1.2" stroke-dasharray="${ok?'':'3 3'}"/>
   ${ok?`<rect x="${c.x-15}" y="${c.y-11}" width="30" height="20" fill="#fff" stroke="#140f1f" stroke-width="1.5"/><text x="${c.x}" y="${c.y+4}" text-anchor="middle" font-family="Bangers,Impact" font-size="13" fill="#140f1f">${c.n}</text>`:`<text x="${c.x}" y="${c.y+4}" text-anchor="middle" font-size="9" font-weight="700" fill="#140f1f" opacity=".7">&lt;5</text>`}</g>`;}).join('')}</g>`;}
function sponsorSpots(z){const r=rng((z.seed||7)+57);return Object.keys(SPONSORS).map(k=>({k,x:50+r()*300,y:60+r()*300,d:Math.round(150+r()*1400)}));}
function sponsorLayer(z){return sponsorSpots(z).map(s=>`<g data-spn="${s.k}" style="cursor:pointer"><path d="M${s.x} ${s.y+16} l-7 -10 h14z" fill="#140f1f"/><rect x="${s.x-16}" y="${s.y-22}" width="32" height="26" rx="4" fill="#f7d64a" stroke="#140f1f" stroke-width="2.5"/>
  <text x="${s.x}" y="${s.y-5}" text-anchor="middle" font-family="Bangers,Impact" font-size="13" fill="#140f1f">${SPONSORS[s.k].logo}</text><text x="${s.x+14}" y="${s.y-18}" font-size="10">⭐</text><rect x="${s.x-17}" y="${s.y+6}" width="34" height="11" rx="3" fill="#fff" stroke="#140f1f" stroke-width="1.2"/><text x="${s.x}" y="${s.y+14.5}" text-anchor="middle" font-size="8" font-weight="700" fill="#140f1f">${typeof rvStarsTxt==='function'?rvStarsTxt('sp-'+s.k).split(' (')[0]:''}</text></g>`).join('');}
function hexInfo(z,i){const c=commCells(z)[i];if(c.n<K_MIN)return`<b>Area con meno di ${K_MIN} utenti</b><span>Per proteggere la privacy non mostriamo numeri sotto questa soglia.</span>`;
  return`<b>👥 ${c.n} superstiti in quest’area</b><span>Indice medio ${fmtI(c.avg)} · ${c.avg<=4?'zona ben preparata':c.avg<=6?'zona da presidiare':'zona fragile'}</span>`;}
function wireCommunity(root,z,info){if(!root||root.__comm)return;root.__comm=1;
  root.addEventListener('click',e=>{const h=e.target.closest('[data-hex]'),p=e.target.closest('[data-spn]');
    if(p){sponsorSheet(p.dataset.spn,z);return;}if(h&&info){info.innerHTML=hexInfo(z,+h.dataset.hex);}});}
</script>
