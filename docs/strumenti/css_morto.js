// Fase 7c · toglie dallo stile (p1_head.html) le regole che riguardano SOLO classi mai usate nel codice dell'app.
// Una classe è "usata" se il suo nome compare come parola in un modulo p*.js (o in p1_head fuori dallo stile).
// Le classi costruite al volo con un prefisso ("map-"+x, `h-${k}`…), quelle delle librerie (mappa) e quelle
// tipo c1/w2 (lettera + numero) sono tenute tutte.
// Uso: node docs/strumenti/css_morto.js <cartella del repository> [--scrivi]   (senza --scrivi: solo l'elenco)
const fs=require('fs'),path=require('path');
const R=process.argv[2]||'.';const scrivi=process.argv.includes('--scrivi');
const PREFISSI=['h-','s-','k-','man-','info-','map-','biz-','fx-','p-','sp-','orda-','zsh-','frz-','maplibregl-','leaflet-','mapboxgl-'];
const order=fs.readFileSync(path.join(R,'build.sh'),'utf8').match(/^cat (.*?) > app\.html/m)[1].split(/\s+/);
const head=fs.readFileSync(path.join(R,'p1_head.html'),'utf8');
const src=order.filter(f=>f!=='p1_head.html').map(f=>fs.readFileSync(path.join(R,f),'utf8')).join('\n')+head.replace(/<style>[\s\S]*?<\/style>/g,'');
const esc=c=>c.replace(/[-]/g,'\\-');
const usata=new Map();const isUsed=c=>{if(usata.has(c))return usata.get(c);
  const u=PREFISSI.some(p=>c.startsWith(p))||/^[a-z]{1,2}\d+$/.test(c)/* c1, w2…: costruite con un numero */||new RegExp('(^|[^\\w-])'+esc(c)+'($|[^\\w-])').test(src);usata.set(c,u);return u;};
/* divide una lista di selettori sulle virgole "di primo livello" (non dentro :is(), :not()…) */
const splitSel=s=>{const out=[];let d=0,cur='';for(const ch of s){if(ch==='('||ch==='[')d++;if(ch===')'||ch===']')d--;if(ch===','&&d===0){out.push(cur);cur='';}else cur+=ch;}out.push(cur);return out;};
let tolte=0,selTolti=0,byte0=0,byte1=0;const morte=new Set();
/* scorre un blocco CSS: regole, commenti, @media/@supports (dentro), @keyframes/@font-face (lasciati) */
function pulisci(css){let i=0,out='';const n=css.length;
  while(i<n){
    if(css.startsWith('/*',i)){const e=css.indexOf('*/',i+2);const j=e<0?n:e+2;out+=css.slice(i,j);i=j;continue;}
    const b=css.indexOf('{',i);if(b<0){out+=css.slice(i);break;}
    const sel=css.slice(i,b);let d=1,j=b+1;while(j<n&&d){if(css[j]==='{')d++;else if(css[j]==='}')d--;j++;}
    const body=css.slice(b+1,j-1);const st=sel.trim();
    if(/^@(media|supports|layer|container)/.test(st)){out+=sel+'{'+pulisci(body)+'}';i=j;continue;}
    if(st.startsWith('@')){out+=css.slice(i,j);i=j;continue;}
    const parts=splitSel(sel);const keep=parts.filter(p=>{const cl=[...p.replace(/:not\([^()]*\)/g,'').matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m=>m[1]);/* .a:not(.morta) vale ancora per .a */const dead=cl.filter(c=>!isUsed(c));dead.forEach(c=>morte.add(c));return !dead.length;});
    if(!keep.length){tolte++;i=j;continue;}
    if(keep.length<parts.length){selTolti+=parts.length-keep.length;out+=(sel.match(/^\s*/)[0])+keep.map(p=>p.trim()).join(',')+'{'+body+'}';i=j;continue;}
    out+=css.slice(i,j);i=j;}
  return out;}
const nuovo=head.replace(/<style>([\s\S]*?)<\/style>/g,(m,css)=>{byte0+=css.length;const p=pulisci(css);byte1+=p.length;return '<style>'+p+'</style>';});
console.log(`regole tolte: ${tolte} · selettori tolti da regole tenute: ${selTolti} · stile ${Math.round(byte0/1024)} KB → ${Math.round(byte1/1024)} KB`);
console.log('classi mai usate:',[...morte].sort().join(' '));
if(scrivi){fs.writeFileSync(path.join(R,'p1_head.html'),nuovo.replace(/\n{3,}/g,'\n\n'));console.log('scritto p1_head.html');}
