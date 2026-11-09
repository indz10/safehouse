// Analisi statica dei moduli ZombieSafeHouse: definizioni globali, avvolgimenti, riferimenti.
// uso: node analizza.js <cartella repo> > analisi.json
const fs=require('fs'),path=require('path');const acorn=require('acorn');const walk=require('acorn-walk');
const R=process.argv[2];
const order=fs.readFileSync(path.join(R,'build.sh'),'utf8').match(/^cat (.*?) > app\.html/m)[1].split(/\s+/);
const all=fs.readdirSync(R).filter(f=>/^p\d.*\.(js|html)$/.test(f));
const extra=all.filter(f=>!order.includes(f)).sort();
const mods=[...order,...extra];
const src={};const scripts={};
for(const m of mods){const s=fs.readFileSync(path.join(R,m),'utf8');src[m]=s;
  scripts[m]=[];const re=/<script[^>]*>([\s\S]*?)<\/script>/g;let x;while((x=re.exec(s)))scripts[m].push(x[1]);}
const G={};// nome -> {def:modulo, kind, wraps:[{m,how}], loc}
const info={};
function fnLike(n){return n&&/Function|ArrowFunction/.test(n.type);}
const known=new Set();
for(const m of mods){const inBuild=order.includes(m);
  const I=info[m]={inBuild,bytes:Buffer.byteLength(src[m]),lines:src[m].split('\n').length,defs:[],wraps:[],replaces:[],parseErr:null,head:''};
  const hm=src[m].match(/\/\*\s*=+\s*\n([\s\S]*?)=+\s*\*\//);I.head=hm?hm[1].replace(/\s+/g,' ').trim().slice(0,300):'';
  for(const code of scripts[m]){let ast;try{ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true});}catch(e){I.parseErr=e.message;continue;}
    const aliases={};// alias -> target (anche dentro try{} e blocchi)
    walk.full(ast,node=>{if(node.type==='VariableDeclarator'&&node.id.type==='Identifier'&&node.init&&node.init.type==='Identifier'&&known.has(node.init.name))aliases[node.id.name]=node.init.name;});
    for(const st of ast.body){
      if(st.type==='FunctionDeclaration'){I.defs.push(st.id.name);if(inBuild){if(G[st.id.name]&&G[st.id.name].def!==m)I.replaces.push(st.id.name);else if(!G[st.id.name])G[st.id.name]={def:m,kind:'function',wraps:[]};known.add(st.id.name);}}
      if(st.type==='VariableDeclaration')for(const d of st.declarations){if(d.id.type!=='Identifier')continue;const n=d.id.name;
        if(d.init&&d.init.type==='Identifier'&&known.has(d.init.name)){aliases[n]=d.init.name;continue;}
        I.defs.push(n);if(inBuild&&!G[n]){G[n]={def:m,kind:fnLike(d.init)?'function':(st.kind+' '+(d.init?d.init.type:'')),wraps:[]};known.add(n);}}
    }
    // assegnazioni di funzioni a nomi globali gia' noti (ovunque nel modulo)
    walk.full(ast,node=>{if(node.type!=='AssignmentExpression'||node.operator!=='=')return;let L=node.left,n=null;
      if(L.type==='Identifier')n=L.name;else if(L.type==='MemberExpression'&&L.object.type==='Identifier'&&L.object.name==='window'&&L.property.type==='Identifier')n=L.property.name;
      if(!n||!G[n]||!inBuild)return;if(!fnLike(node.right)&&node.right.type!=='CallExpression')return;
      if(G[n].def===m&&!Object.values(aliases).includes(n))return;
      const how=(Object.values(aliases).includes(n)||(node.right.type==='CallExpression'&&node.right.arguments.some(a=>a.type==='Identifier'&&a.name===n)))?'avvolge':'sostituisce';
      if(!G[n].wraps.find(w=>w.m===m))G[n].wraps.push({m,how});
      if(how==='avvolge'){if(!I.wraps.includes(n))I.wraps.push(n);}else if(!I.replaces.includes(n))I.replaces.push(n);});
  }}
// riferimenti: in quali altri moduli (della build) compare il nome
const built=order.map(m=>[m,src[m]]);
for(const [n,g] of Object.entries(G)){const re=new RegExp('(^|[^\\w$.])'+n.replace(/\$/g,'\\$')+'(?![\\w$])','g');
  g.usedIn=[];g.count=0;for(const [m,s] of built){const c=(s.match(re)||[]).length;if(c){g.count+=c;if(m!==g.def)g.usedIn.push(m);}}
  g.selfCount=(src[g.def].match(re)||[]).length;}
console.log(JSON.stringify({order,extra,info,G},null,0));
