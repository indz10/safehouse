// Fase 7c · comprime app.html (tolti spazi e commenti, nomi locali accorciati) con esbuild.
// I nomi globali (funzioni e variabili in cima ai moduli) restano uguali: i moduli si chiamano tra loro per nome.
// Uso (da build.sh): node minifica.js app.html  → riscrive il file e stampa i pesi prima/dopo.
// esbuild sta in .strumenti/ (non nel repository): build.sh lo installa la prima volta.
const fs=require('fs'),path=require('path');
let esbuild;try{esbuild=require(path.join(__dirname,'.strumenti','node_modules','esbuild'));}catch(e){console.log('minifica: esbuild non disponibile, app non compressa');process.exit(0);}
const f=process.argv[2]||'app.html';const s=fs.readFileSync(f,'utf8');
let errori=0;
const out=s.replace(/<script>([\s\S]*?)<\/script>/g,(m,code)=>{
  try{const r=esbuild.transformSync(code,{loader:'js',minify:true,target:'safari14',legalComments:'none',charset:'utf8'});
    if(/<\/script/i.test(r.code)){errori++;return m;}return '<script>'+r.code.trim()+'</script>';}
  catch(e){errori++;console.log('minifica: blocco JS lasciato com\'è:',e.message.split('\n')[0]);return m;}})
 .replace(/<style>([\s\S]*?)<\/style>/g,(m,css)=>{
  try{const r=esbuild.transformSync(css,{loader:'css',minify:true,target:'safari14',legalComments:'none',charset:'utf8',logLevel:'silent'});return '<style>'+r.code.trim()+'</style>';}
  catch(e){errori++;console.log('minifica: stile lasciato com\'è:',e.message.split('\n')[0]);return m;}})
 .replace(/\n\s*\n+/g,'\n');
fs.writeFileSync(f,out);
console.log(`minifica: ${Math.round(s.length/1024)} KB → ${Math.round(out.length/1024)} KB${errori?` (${errori} blocchi lasciati com'erano)`:''}`);
