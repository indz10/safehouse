// Inventario del database dai file *.sql (Fase 6a) → docs/DATABASE.md: per ogni funzione in quali file è definita
// e chi la usa (app / Edge / trigger / cron / regole / altre funzioni); funzioni non usate.
// Contiene anche ORDER, l'ordine di esecuzione dei file, usato da db_locale.sh (che scrive supabase/schema.sql).
// Uso: node docs/strumenti/schema_sql.js <cartella del repository>
// Nessun pacchetto esterno: basta Node.
const fs=require('fs'),path=require('path');
const R=process.argv[2]||'.';
/* ordine di esecuzione (dal riepilogo, sezioni in ordine di tempo) */
const ORDER=['ZombieSafeHouse_backend_sponsor.sql','community.sql','aggiornamento_ottobre.sql','mondo_unico.sql','mondo_unico_agg1.sql','orda_mondo.sql',
 'mondo_v3.sql','mondo_v4.sql','social.sql','chat.sql','push.sql','push_cron.sql','aiuto_alleati.sql','dispetti.sql','equita.sql','alleanze2.sql','casavera.sql',
 'squadra_fix.sql','zombie.sql','alleati_sim.sql','zombie_alleati.sql','assedio.sql','fortezze.sql','premi.sql','residenti.sql','abitazione.sql','benvenuto.sql',
 'casa_abitata.sql','nome_casa.sql','classifica.sql'];
const SKIP=['controllo_residenti.sql'];/* solo lettura */
const all=fs.readdirSync(R).filter(f=>f.endsWith('.sql'));
const missing=all.filter(f=>!ORDER.includes(f)&&!SKIP.includes(f));if(missing.length)throw new Error('file SQL senza posto nell\'ordine: '+missing.join(', '));

/* divide un file in istruzioni, rispettando commenti, stringhe e blocchi $tag$ … $tag$ */
function split(s){const out=[];let i=0,st=0;const n=s.length;
  while(i<n){const c=s[i],d=s[i+1];
    if(c==='-'&&d==='-'){const e=s.indexOf('\n',i);i=e<0?n:e+1;continue;}
    if(c==='/'&&d==='*'){const e=s.indexOf('*/',i+2);i=e<0?n:e+2;continue;}
    if(c==="'"){i++;while(i<n){if(s[i]==="'"){if(s[i+1]==="'"){i+=2;continue;}i++;break;}i++;}continue;}
    if(c==='$'){const m=/^\$[A-Za-z_]*\$/.exec(s.slice(i,i+40));if(m){const tag=m[0];const e=s.indexOf(tag,i+tag.length);i=e<0?n:e+tag.length;continue;}}
    if(c===';'){out.push(s.slice(st,i+1));st=i+1;}
    i++;}
  const rest=s.slice(st);if(rest.replace(/--.*$/mg,'').trim())out.push(rest);
  return out.map(x=>x.replace(/^(\s*--[^\n]*\n|\s+)+/,'').trim()).filter(x=>x&&x!==';');}
const norm=t=>t.replace(/\s+/g,' ').toLowerCase();
/* argomenti di una funzione → solo i tipi (per distinguere le versioni con firme diverse) */
function argTypes(a){const L=[];let depth=0,cur='';for(const ch of a){if(ch==='('){depth++;}if(ch===')')depth--;if(ch===','&&depth===0){L.push(cur);cur='';}else cur+=ch;}if(cur.trim())L.push(cur);
  return L.map(x=>{x=x.replace(/\bdefault\b[\s\S]*$/i,'').replace(/=[\s\S]*$/,'').trim();const w=x.split(/\s+/);if(/^(in|out|inout|variadic)$/i.test(w[0]))w.shift();
    const t=(w.length>1?w.slice(1):w).join(' ').toLowerCase();return({int:'integer',int4:'integer',bool:'boolean',float8:'double precision',timestamptz:'timestamp with time zone',int8:'bigint'})[t]||t;}).join(',');}
function fnHead(t){const m=/^create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?("?)([a-z_0-9]+)\1\s*\(/i.exec(t);if(!m)return null;
  let i=m[0].length,depth=1;const s=i;while(i<t.length&&depth){if(t[i]==='(')depth++;else if(t[i]===')')depth--;i++;}
  return{name:m[2].toLowerCase(),args:t.slice(s,i-1),sig:m[2].toLowerCase()+'('+argTypes(t.slice(s,i-1))+')'};}
function body(t){const m=/(\$[A-Za-z_]*\$)([\s\S]*?)\1/.exec(t);return m?m[2]:null;}

const S={tab:new Map(),alter:[],view:new Map(),idx:new Map(),fn:new Map(),fnHist:new Map(),drop:[],trig:new Map(),pol:new Map(),rls:new Set(),grant:[],cron:[],other:[],ext:new Set()};
/* dopo la storia, le migrazioni (supabase/migrazioni/NNN_*.sql) in ordine */
const MIG=(()=>{try{return fs.readdirSync(path.join(R,'supabase/migrazioni')).filter(f=>/^\d{3}_.*\.sql$/.test(f)).sort().map(f=>'supabase/migrazioni/'+f);}catch(e){return[];}})();
for(const f of [...ORDER,...MIG]){const s=fs.readFileSync(path.join(R,f),'utf8');
  for(const t of split(s)){const n=norm(t);let m;
    if(/^(begin|commit|select pg_notify)/.test(n)&&!/cron\.schedule/.test(n))continue;
    if((m=/^create extension (?:if not exists )?"?([a-z_]+)/.exec(n))){S.ext.add(t);continue;}
    if((m=/^create table (?:if not exists )?(?:public\.)?([a-z_0-9]+)/.exec(n))){if(!S.tab.has(m[1]))S.tab.set(m[1],{t,f});continue;}
    if((m=/^alter table (?:if exists )?(?:only )?(?:public\.)?([a-z_0-9]+)\s+(?:enable|force) row level security/.exec(n))){S.rls.add(m[1]);continue;}
    if((m=/^alter table (?:if exists )?(?:only )?(?:public\.)?([a-z_0-9]+)\s+rename to\s+([a-z_0-9]+)/.exec(n))){S.alter.push({t,f,tab:m[1]});continue;}
    if((m=/^alter table (?:if exists )?(?:only )?(?:public\.)?([a-z_0-9]+)/.exec(n))){S.alter.push({t,f,tab:m[1]});continue;}
    if((m=/^create (?:or replace )?view (?:public\.)?([a-z_0-9]+)/.exec(n))){S.view.set(m[1],{t,f});continue;}
    if((m=/^create (?:unique )?index (?:if not exists )?([a-z_0-9]+)/.exec(n))){S.idx.set(m[1],{t,f});continue;}
    if(/^create (or replace )?function/.test(n)){const h=fnHead(t);if(!h){S.other.push({t,f});continue;}
      S.fn.set(h.sig,{t,f,name:h.name,sig:h.sig,body:body(t)});if(!S.fnHist.has(h.name))S.fnHist.set(h.name,[]);S.fnHist.get(h.name).push(f.replace(/\.sql$/,'').replace('supabase/migrazioni/','migr. '));continue;}
    if((m=/^drop function (?:if exists )?(?:public\.)?([a-z_0-9]+)\s*(\(([^)]*)\))?/.exec(n))){
      const nm=m[1];const sig=m[2]!=null?nm+'('+argTypes(m[3]||'')+')':null;
      for(const k of [...S.fn.keys()])if(sig?k===sig:S.fn.get(k).name===nm)S.fn.delete(k);S.drop.push({t,f});continue;}
    if((m=/^drop (table|view|index|trigger|policy)/.exec(n))){S.drop.push({t,f});
      if((m=/^drop policy (?:if exists )?"?([^"]+?)"? on (?:public\.)?([a-z_0-9]+)/.exec(n)))S.pol.delete(m[2]+'|'+m[1]);
      if((m=/^drop trigger (?:if exists )?([a-z_0-9]+) on (?:public\.)?([a-z_0-9]+)/.exec(n)))S.trig.delete(m[2]+'|'+m[1]);
      if((m=/^drop view (?:if exists )?(?:public\.)?([a-z_0-9]+)/.exec(n)))S.view.delete(m[1]);
      if((m=/^drop table (?:if exists )?(?:public\.)?([a-z_0-9]+)/.exec(n)))S.tab.delete(m[1]);
      continue;}
    if((m=/^create (?:or replace )?trigger ([a-z_0-9]+).*? on (?:public\.)?([a-z_0-9]+)/.exec(n))){S.trig.set(m[2]+'|'+m[1],{t,f});continue;}
    if((m=/^create policy "?([^"]+?)"? on (?:public\.)?([a-z_0-9]+)/.exec(n))){S.pol.set(m[2]+'|'+m[1],{t,f});continue;}
    if(/^(grant|revoke)/.test(n)){S.grant.push({t,f});continue;}
    if(/cron\.(un)?schedule/.test(n)){S.cron.push({t,f});continue;}
    S.other.push({t,f});}}

/* chi usa ogni funzione */
const appSrc=fs.readdirSync(R).filter(f=>/^p.*\.(js|html)$/.test(f)).map(f=>fs.readFileSync(path.join(R,f),'utf8')).join('\n')
  +['admin.html','negozio.html'].map(f=>{try{return fs.readFileSync(path.join(R,'pwa',f),'utf8');}catch(e){try{return fs.readFileSync(path.join(R,f),'utf8');}catch(x){return'';}}}).join('\n');
const edge=['supabase/functions/zsh-push/index.ts','supabase/zsh-api.ts'].map(f=>{try{return fs.readFileSync(path.join(R,f),'utf8');}catch(e){return'';}}).join('\n');
const fns=[...S.fn.values()];const names=[...new Set(fns.map(x=>x.name))].sort();
const inApp=nm=>new RegExp(`rpc\\(\\s*['"\`]${nm}['"\`]`).test(appSrc)||new RegExp(`['"\`]${nm}['"\`]`).test(appSrc);
const inEdge=nm=>new RegExp(`\\b${nm}\\b`).test(edge);
const trigFns=new Set([...S.trig.values()].map(x=>(/execute (?:function|procedure) (?:public\.)?([a-z_0-9]+)/i.exec(x.t)||[])[1]).filter(Boolean).map(x=>x.toLowerCase()));
const cronTxt=S.cron.map(x=>x.t).join('\n').toLowerCase();const polTxt=[...S.pol.values(),...S.view.values()].map(x=>x.t).join('\n').toLowerCase();
const callers=nm=>fns.filter(x=>x.name!==nm&&x.body&&new RegExp(`\\b${nm}\\s*\\(`,'i').test(x.body)).map(x=>x.name);
const use={};for(const nm of names){const c=[...new Set(callers(nm))];use[nm]={app:inApp(nm),edge:inEdge(nm),trig:trigFns.has(nm),cron:new RegExp(`\\b${nm}\\b`).test(cronTxt),pol:new RegExp(`\\b${nm}\\s*\\(`).test(polTxt),by:c};}
/* usata se raggiungibile da app / Edge / trigger / cron / regole, anche passando per altre funzioni */
const live=new Set(names.filter(n=>{const u=use[n];return u.app||u.edge||u.trig||u.cron||u.pol;}));let grew=true;
while(grew){grew=false;for(const x of fns)if(live.has(x.name)&&x.body)for(const nm of names)if(!live.has(nm)&&new RegExp(`\\b${nm}\\s*\\(`,'i').test(x.body)){live.add(nm);grew=true;}}
const dead=names.filter(n=>!live.has(n));

/* DATABASE.md */
const yes=b=>b?'✓':'';
let md=`# Database (Supabase) — inventario

Generato da \`docs/strumenti/schema_sql.js\` (Fase 6a) a partire dai ${ORDER.length} file \`*.sql\` alla radice, nell'ordine in cui sono stati eseguiti.
Lo stato ricostruito è in \`supabase/schema.sql\` (eseguendo i file su un Postgres di prova con \`docs/strumenti/db_locale.sh\`; documento, non va eseguito). Ogni cambio d'ora in poi: \`supabase/migrazioni/NNN_nome.sql\`.

- Tabelle: **${S.tab.size}** · viste: **${S.view.size}** · indici: **${S.idx.size}** · regole (policy): **${S.pol.size}** · trigger: **${S.trig.size}** · lavori programmati: **${S.cron.filter(x=>/cron\.schedule/i.test(x.t)).length}**
- Funzioni: **${fns.length}** (${names.length} nomi); usate (direttamente o tramite altre funzioni): **${live.size}**; **non usate: ${dead.length}**

## Funzioni non usate (candidate da togliere nella Fase 6b)
Nessuna chiamata dall'app (\`p*.js\`, admin, negozio), dalle funzioni Edge, da trigger, cron, regole o da altre funzioni usate.
${dead.length?dead.map(n=>`- \`${n}\` — definita in: ${S.fnHist.get(n).join(', ')}`).join('\n'):'- nessuna'}

## Tutte le funzioni
| funzione | app | Edge | trigger/cron/regole | chiamata da | versioni (file) |
|---|---|---|---|---|---|
${names.map(n=>{const u=use[n];return`| \`${n}\` | ${yes(u.app)} | ${yes(u.edge)} | ${[u.trig?'trigger':'',u.cron?'cron':'',u.pol?'regole':''].filter(Boolean).join(', ')} | ${u.by.slice(0,6).join(', ')}${u.by.length>6?' …':''} | ${S.fnHist.get(n).length}: ${S.fnHist.get(n).join(' → ')} |`;}).join('\n')}

## Tabelle
| tabella | creata in | modifiche | RLS |
|---|---|---|---|
${[...S.tab].sort().map(([k,x])=>`| \`${k}\` | ${x.f.replace(/\.sql$/,'')} | ${S.alter.filter(a=>a.tab===k).length} | ${S.rls.has(k)?'✓':''} |`).join('\n')}
`;
fs.writeFileSync(path.join(R,'docs/DATABASE.md'),md);
console.log(`tabelle ${S.tab.size}, funzioni ${fns.length} (${names.length} nomi), usate ${live.size}, non usate ${dead.length}: ${dead.join(', ')}`);
console.log(`policy ${S.pol.size}, trigger ${S.trig.size}, cron ${S.cron.length}, grant ${S.grant.length}, altro ${S.other.length}, drop ${S.drop.length}`);
