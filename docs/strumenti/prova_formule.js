// Fase 6c · PROVA DELLE FORMULE: stessa difesa e stesso attacco in app e database.
// Sul Postgres di prova (docs/strumenti/db_locale.sh deve essere già stato lanciato) costruisce case con livelli,
// fortificazioni, condominio, pendenza e meteo diversi, poi controlla che:
//  1) thrCalc dell'app (p47_zombie.js) dia gli stessi numeri di w_threats_of (attacco min/max, difesa, %);
//  2) il risultato vero dell'orda (world_raid_status: potenza e tenuta) usi la stessa difesa di w_threats_of;
//  3) l'attacco vero (w_attack3) stia nell'intervallo mostrato e la % mostrata sia vicina a quella reale su 300 orde;
//  4) il riquadro "Perché" (world_my_defense) dia lo stesso totale della casa;
//  5) (Fase 9b) i presidi tenuti entro 500 m diano +3 ciascuno (max +6) in tutte le funzioni.
// Uso: node docs/strumenti/prova_formule.js <cartella di lavoro di db_locale.sh>
const fs=require('fs'),path=require('path'),cp=require('child_process');
const R=path.join(__dirname,'..','..');const W=process.argv[2];if(!W){console.log('Uso: node docs/strumenti/prova_formule.js <cartella di lavoro>');process.exit(1);}
const sql=q=>cp.execFileSync('psql',['-h',W,'-p','5499','-U','postgres','-d','zsh','-tA','-v','ON_ERROR_STOP=1','-c',q],{encoding:'utf8'}).trim();
/* thrCalc dell'app, preso così com'è dal sorgente */
const src=fs.readFileSync(path.join(R,'p47_zombie.js'),'utf8');const m=src.match(/function thrCalc\(T,o=\{\}\)\{[\s\S]*?return\{def,amin,amax,ch,sp,ss\};\}/);
if(!m)throw new Error('thrCalc non trovata in p47_zombie.js');const thrCalc=new Function(m[0]+';return thrCalc;')();
const U='aaaaaaaa-0000-0000-0000-000000000001',U2='aaaaaaaa-0000-0000-0000-000000000002';
const EV=['calma','pioggia','neve','nebbia','blackout','luna'],SL=[-0.1,0,0.06,0.12],LIFE=[0,900,4900,22500,90000];
const DK=['fossato','barricate','sirena','fondamenta','fari','trappole','grate','recinto','cani','pompa'];
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const pick=a=>a[Math.floor(rnd()*a.length)];
let fail=0,checks=0;const bad=(t)=>{fail++;if(fail<=15)console.log('  ✗',t);};
for(let sc=0;sc<12;sc++){
  const ev=pick(EV),slope=pick(SL),life=pick(LIFE),hl=1+Math.floor(rnd()*5),bl=1+Math.floor(rnd()*5),condo=sc%3===0?0:1+Math.floor(rnd()*3),rs=Math.floor(rnd()*6),prep=rnd()<.5;
  const defs=b=>DK.filter(()=>rnd()<.4).map(k=>`('${b}','${k}',${1+Math.floor(rnd()*3)})`).join(',');
  const npres=sc%4;/* 0–3 presidi tenuti da U2 vicino alla casa vera (uno è lontano 2 km: non conta) */
  sql(`delete from world_presidi; delete from world_homes; delete from world_buildings; delete from world_defs; delete from world_condo; delete from world_wallet; delete from world_terrain; delete from world_wx; delete from auth.users where id in ('${U}','${U2}');
    insert into auth.users(id,email,created_at) values ('${U}','a@x',now()-interval '60 days'),('${U2}','b@x',now()-interval '60 days');
    insert into world_wallet(user_id,lifetime,caps) values ('${U}',${life},jsonb_build_object('rs',${rs})${prep?`||jsonb_build_object('prep:'||w_slot_id(w_next_slot(now())),1,'prep:'||w_slot_id(w_prev_slot(now())),1)`:''});
    insert into world_homes(user_id,building_id,lat,lon,status,first_at,kind) values ('${U}','H1#2',45.1,10.1,'home',now()-interval '30 days','${condo?'condominio':'casa'}');
    ${condo?`insert into world_homes(user_id,building_id,lat,lon,status,first_at,kind) values ('${U2}','H1#5',45.1,10.1,'home',now()-interval '30 days','condominio');
      insert into world_condo(ckey,kind,level) values ('H1','portone',${condo}),('H1','cancello',${condo>1?1:0});`:''}
    insert into world_buildings(building_id,lat,lon,owner,level,bought_at) values ('H1#2',45.1,10.1,null,${hl},null),('B1',45.2,10.2,'${U}',${bl},now()-interval '10 days');
    ${defs('H1#2')?`insert into world_defs values ${defs('H1#2')};`:''} ${defs('B1')?`insert into world_defs values ${defs('B1')} on conflict do nothing;`:''}
    insert into world_terrain(building_id,slope) values ('H1#2',${slope}),('B1',${-slope});
    insert into world_wx(building_id,slot_id,ev) select b, w_slot_id(w_next_slot(now())), '${ev}' from (values ('H1#2'),('B1')) v(b)
      union all select b, w_slot_id(w_prev_slot(now())), '${ev}' from (values ('H1#2'),('B1')) v(b);`);
  for(let i=0;i<npres;i++){const far=i===2;sql(`insert into world_presidi(id,name,kind,lat,lon,holder,held_since) values ('osm:n${i}','P${i}','parco',${far?45.118:45.1+0.002*i},10.1,'${U2}',now()-interval '3 days');
    insert into world_presidi_tenute(presidio_id,user_id,dal) values ('osm:n${i}','${U2}',now()-interval '3 days');`);}
  const attesi=Math.min(6,3*Math.min(npres,2));
  const T=JSON.parse(sql(`select w_threats_of('${U}')`));
  /* 5) presidi vicini */
  {checks++;const t=T.find(x=>x.home);if(!t||t.pres!==attesi)bad(`scenario ${sc}: presidi vicini ${t&&t.pres} ≠ ${attesi}`);}
  /* 1) app = database */
  for(const t of T){checks++;const r=thrCalc(t);
    if(r.amin!==t.atk_min||r.amax!==t.atk_max||r.ch!==t.chance||r.def!==t.def)bad(`scenario ${sc} ${t.home?'casa vera':'comprata'}: app ${r.amin}-${r.amax} dif ${r.def} ${r.ch}% · database ${t.atk_min}-${t.atk_max} dif ${t.def} ${t.chance}%`);}
  /* 2) risultato vero dell'orda (slot precedente; stesso meteo e stessi bonus) */
  const RS=JSON.parse(sql(`select set_config('request.jwt.claim.sub','${U}',false); select world_raid_status()`).split('\n').pop());
  for(const h of RS.houses||[]){checks++;const t=T.find(x=>x.bid===h.bid);if(!t){bad('casa senza minaccia '+h.bid);continue;}
    if(h.power!==t.def)bad(`scenario ${sc} ${h.home?'casa vera':'comprata'}: potenza nell'orda vera ${h.power} ≠ difesa mostrata ${t.def} (condominio ${t.condo})`);
    if(h.held!==(h.power>=h.attack))bad(`scenario ${sc}: tenuta non coerente`);}
  /* 4) "Perché" */
  const D=JSON.parse(sql(`select set_config('request.jwt.claim.sub','${U}',false); select world_my_defense()`).split('\n').pop());
  for(const h of D.houses||[]){checks++;const t=T.find(x=>(h.home&&x.home)||(!h.home&&x.bid===h.bid));if(t&&h.total!==t.def)bad(`scenario ${sc}: "Perché" totale ${h.total} ≠ difesa ${t.def}`);}
  /* 3) su 300 orde (stesso meteo): attacco nell'intervallo e % reale vicina a quella mostrata */
  for(const t of T){checks++;
    sql(`insert into world_wx(building_id,slot_id,ev) select '${t.bid}', w_slot_id(now()+make_interval(hours=>12*i)), '${ev}' from generate_series(1,300) i on conflict do nothing`);
    const at=sql(`select string_agg(w_attack3(w_slot_id(now()+make_interval(hours=>12*i)),'${t.bid}',${t.wl})::text,',') from generate_series(1,300) i`).split(',').map(Number);
    /* l'ora dell'orda (9 o 21) cambia solo gli zombie Ombra: confronto con la minaccia delle 21 */
    const out=at.filter(a=>a<t.atk_min-2||a>t.atk_max+2).length;const held=at.filter(a=>t.def>=a).length/at.length*100;
    if(out>at.length*0.6)bad(`scenario ${sc}: attacchi fuori dall'intervallo ${t.atk_min}-${t.atk_max}: ${out}/300`);
    if(Math.abs(held-t.chance)>25)bad(`scenario ${sc}: % mostrata ${t.chance} ma reale ${Math.round(held)}`);}
}
console.log(`controlli: ${checks} · differenze: ${fail}`);console.log(fail?'FORMULE DIVERSE':'FORMULE UGUALI');process.exit(fail?1:0);
