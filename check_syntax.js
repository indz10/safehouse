// controlla la sintassi di ogni <script> di ogni modulo prima di pubblicare
const fs=require('fs');let bad=0;
for(const f of fs.readdirSync('.').filter(f=>/^p\d.*\.(js|html)$/.test(f))){
  const s=fs.readFileSync(f,'utf8');const parts=s.split(/<script[^>]*>/).slice(1).map(x=>x.split('</script>')[0]);
  parts.forEach((p,i)=>{try{new Function(p);}catch(e){bad++;console.log('ERRORE',f,'blocco',i+1,':',e.message);}});}
console.log(bad?`${bad} errori di sintassi`:'sintassi ok in tutti i moduli');process.exit(bad?1:0);
