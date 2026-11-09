const fs=require('fs'),path=require('path');const acorn=require('acorn');const R=process.argv[2];
const A=require('./analisi.json');const M=require('./moduli.json');const C=require('./cov.json');
const built=A.order.map(m=>fs.readFileSync(path.join(R,m),'utf8')).join('\n');
// dimensione di ogni funzione globale
const size={};
for(const m of A.order){const s=fs.readFileSync(path.join(R,m),'utf8');const re=/<script[^>]*>([\s\S]*?)<\/script>/g;let x;
 while((x=re.exec(s))){let ast;try{ast=acorn.parse(x[1],{ecmaVersion:'latest',allowReturnOutsideFunction:true});}catch(e){continue;}
  for(const st of ast.body){if(st.type==='FunctionDeclaration')size[m+':'+st.id.name]=st.end-st.start;
   if(st.type==='VariableDeclaration')for(const d of st.declarations)if(d.id.type==='Identifier'&&d.init)size[m+':'+d.id.name]=d.end-d.start;}}}
const dead=[];
for(const [n,g] of Object.entries(A.G)){if(g.kind!=='function')continue;const re=new RegExp('(^|[^\\w$.])'+n.replace(/\$/g,'\\$')+'(?![\\w$])','g');const c=(built.match(re)||[]).length;
 if(c<=1)dead.push({n,m:g.def,b:size[g.def+':'+n]||0});}
const byM={};dead.forEach(d=>{(byM[d.m]=byM[d.m]||[]).push(d)});
console.log('FUNZIONI MAI NOMINATE ALTROVE:',dead.length,'byte',dead.reduce((a,d)=>a+d.b,0));
for(const [m,L] of Object.entries(byM))console.log(' ',m,L.map(d=>d.n+'('+d.b+')').join(' '));
// strati scavalcati da una sostituzione
console.log('\nSTRATI SCAVALCATI (sostituzione):');
for(const [n,g] of Object.entries(A.G)){const k=g.wraps.map(w=>w.how).lastIndexOf('sostituisce');if(k<0)continue;
 console.log(' ',n,': base',g.def,'+',g.wraps.slice(0,k).map(w=>w.m).join(',')||'-','→ sostituita in',g.wraps[k].m);}
// vecchio gioco: funzioni p5* eseguite nel giro
console.log('\nP5 ESEGUITE:');for(const [m,o] of Object.entries(M))if(/^p5|p4b|p7_|p7b|p16|p9_|p13|p15|p12/.test(m)){const f=Object.entries(A.G).filter(([n,g])=>g.def===m&&g.kind==='function').map(([n])=>n).filter(n=>!o.notRun.includes(n));console.log(' ',m,f.join(' '));}
