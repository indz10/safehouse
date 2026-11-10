// riferimenti AL CARICAMENTO (fuori da funzioni) a nomi globali definiti solo in un modulo successivo
const fs=require('fs'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');const R=process.argv[2];
const order=fs.readFileSync(path.join(R,'build.sh'),'utf8').match(/^cat (.*?) > app\.html/m)[1].split(/\s+/);
const first={};const asts=[];
order.forEach((m,i)=>{const s=fs.readFileSync(path.join(R,m),'utf8');const re=/<script[^>]*>([\s\S]*?)<\/script>/g;let x;while((x=re.exec(s))){const ast=acorn.parse(x[1],{ecmaVersion:'latest',allowReturnOutsideFunction:true});asts.push([m,i,ast,x[1]]);
  for(const st of ast.body){const ns=st.type==='FunctionDeclaration'?[st.id.name]:st.type==='VariableDeclaration'?st.declarations.map(d=>d.id.name):[];ns.forEach(n=>{if(first[n]==null)first[n]=i;});
    if(st.type==='ExpressionStatement'&&st.expression.type==='AssignmentExpression'&&st.expression.left.type==='Identifier'){const n=st.expression.left.name;if(first[n]==null)first[n]=i;}}}});
for(const [m,i,ast,code] of asts){walk.fullAncestor(ast,(n,st,anc)=>{if(n.type!=='Identifier'||first[n.name]==null||first[n.name]<=i)return;
  /* dentro una funzione: conta come "al caricamento" solo se tutte le funzioni che la contengono sono auto-eseguite: (function(){…})() o (()=>{…})() */
  const fns=anc.map((a,k)=>[a,anc[k-1]]).filter(([a])=>/Function/.test(a.type));
  if(fns.some(([f,par])=>!(par&&par.type==='CallExpression'&&par.callee===f)))return;const p=anc[anc.length-2];if(p&&p.type==='MemberExpression'&&p.property===n&&!p.computed)return;if(p&&p.type==='Property'&&p.key===n&&!p.computed)return;
  if(p&&p.type==='AssignmentExpression'&&p.left===n)return;if(p&&p.type==='UnaryExpression'&&p.operator==='typeof')return;
  console.log(m,'usa al caricamento',n.name,'(definito in',order[first[n.name]]+')','|',code.slice(Math.max(0,n.start-50),n.end+20).replace(/\s+/g,' '));});}
