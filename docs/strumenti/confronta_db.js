// Fase 6a · confronta le impronte del database VERO (risultato di supabase/controllo/001_impronte.sql, incollato in un file)
// con quelle attese (supabase/controllo/impronte_attese.txt, dal database di prova di db_locale.sh).
// Uso: node docs/strumenti/confronta_db.js <file con le impronte vere> [file atteso]
const fs=require('fs');
const [,,vero,atteso='supabase/controllo/impronte_attese.txt']=process.argv;
if(!vero){console.log('Uso: node docs/strumenti/confronta_db.js <impronte vere> [impronte attese]');process.exit(1);}
function parse(file){let t=fs.readFileSync(file,'utf8').replace(/\r/g,'');
  /* "Copy as JSON" del SQL Editor: [{"impronte":"FUNZIONI\n..."}] */
  try{const j=JSON.parse(t.trim());const r=Array.isArray(j)?j[0]:j;if(r&&typeof r==='object')t=String(Object.values(r)[0]);}catch(e){}
  /* se è stato copiato con le virgolette o come CSV con l'intestazione "impronte" */
  t=t.replace(/^\s*"?impronte"?\s*\n/,'').replace(/^"/,'').replace(/"\s*$/,'').replace(/""/g,'"');
  const S={};let cur=null;
  for(const l of t.split('\n')){const x=l.trim();if(!x)continue;if(/^(FUNZIONI|TABELLE|REGOLE|CRON)$/.test(x)){cur=x;S[cur]=new Map();continue;}if(!cur)continue;
    if(cur==='REGOLE'){S[cur].set(x,'');continue;}
    const i=x.lastIndexOf(' ');S[cur].set(i>0?x.slice(0,i):x,i>0?x.slice(i+1):'');}
  return S;}
const V=parse(vero),A=parse(atteso);let diff=0;
const nome=k=>k.replace(/\(.*$/,'');
for(const sec of ['FUNZIONI','TABELLE','REGOLE','CRON']){const v=V[sec]||new Map(),a=A[sec]||new Map();
  const soloV=[...v.keys()].filter(k=>!a.has(k)),soloA=[...a.keys()].filter(k=>!v.has(k)),div=[...a.keys()].filter(k=>v.has(k)&&v.get(k)!==a.get(k));
  console.log(`\n== ${sec}: nel database vero ${v.size}, attesi ${a.size}`);
  /* stessa funzione con argomenti diversi: la segnalo come "firma diversa" */
  const firme=sec==='FUNZIONI'?soloV.filter(k=>soloA.some(x=>nome(x)===nome(k))):[];
  if(firme.length){console.log('  firma diversa (stesso nome, argomenti diversi):');firme.forEach(k=>console.log('   · vero:',k,'| atteso:',soloA.filter(x=>nome(x)===nome(k)).join(' ; ')));}
  const sv=soloV.filter(k=>!firme.includes(k)),sa=soloA.filter(k=>!firme.some(f=>nome(f)===nome(k)));
  if(sv.length){console.log('  solo nel database vero:');sv.forEach(k=>console.log('   +',k));}
  if(sa.length){console.log('  mancano nel database vero:');sa.forEach(k=>console.log('   -',k));}
  if(div.length){console.log(sec==='FUNZIONI'?'  versione diversa (corpo della funzione):':'  diversi:');div.forEach(k=>console.log('   ≠',k));}
  diff+=soloV.length+soloA.length+div.length;
  if(!soloV.length&&!soloA.length&&!div.length)console.log('  identici');}
console.log(diff?`\nDIFFERENZE: ${diff}`:'\nTUTTO UGUALE');
