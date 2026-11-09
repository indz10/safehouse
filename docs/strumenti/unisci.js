const fs=require('fs'),path=require('path');const R=process.argv[2];
const A=require('./analisi.json');const C=require('./cov.json');
// righe di ogni modulo dentro app.html (0-based)
let ln=0;const rng={};for(const m of A.order){const n=fs.readFileSync(path.join(R,m),'utf8').split('\n').length-1;rng[m]=[ln,ln+n];ln+=n;}
const modOf=l=>A.order.find(m=>l>=rng[m][0]&&l<rng[m][1]);
const ran={};// modulo -> {nome: count}
for(const f of C.fn){const m=modOf(f.line);if(!m)continue;(ran[m]=ran[m]||{});ran[m][f.name]=(ran[m][f.name]||0)+f.count;}
const out={};
for(const m of A.order){const I=A.info[m];const fns=Object.entries(A.G).filter(([n,g])=>g.def===m&&g.kind==='function').map(([n])=>n);
  const r=ran[m]||{};const exec=fns.filter(n=>r[n]>0);
  // un modulo che avvolge: lo strato è eseguito se la funzione avvolta (anonima) è stata chiamata -> usiamo il nome della funzione avvolta
  const wrapRun=I.wraps.filter(n=>r[n]>0);
  out[m]={bytes:I.bytes,fns:fns.length,exec:exec.length,notRun:fns.filter(n=>!(r[n]>0)),wraps:I.wraps,wrapRun,replaces:I.replaces,head:I.head,anyRun:Object.values(r).some(c=>c>0)};}
fs.writeFileSync('moduli.json',JSON.stringify(out,null,1));
for(const [m,o] of Object.entries(out))console.log(m.padEnd(20),String(o.bytes).padStart(7),'fn',String(o.fns).padStart(3),'eseguite',String(o.exec).padStart(3),'avv',o.wraps.length,'avvEseg',o.wrapRun.length);
