window.__W={wallet:{mattoni:1000,lifetime:1000,last:Date.now()-36*3600e3},b:{},homes:{},me:'me',log:[]};
window.__mockSB={rpc:async(fn,a)=>{const M=__W;if(fn==='world_quote'&&M.qhome)return{data:M.qhome,error:null};const lvl=1+Math.floor(Math.sqrt(M.wallet.lifetime/100));const price=200;
  const st=(bid)=>{const h=M.homes[bid];const b=M.b[bid];if(h==='me-home')return'myhome';if(h)return'home';if(b&&b.owner==='me')return'mine';if(b&&b.owner)return'owned';return'free';};
  switch(fn){
  case'world_allies':return{data:[{user_id:'u2',nick:'giangy',wlevel:2,dist_km:3,coinq:false},{user_id:'u5',nick:'vicina',wlevel:3,dist_km:0,coinq:true}],error:null};
  case'world_loans':return{data:M.loan?[{dir:'dato',nick:'giangy',amount:50,left_due:50,due_at:new Date(Date.now()+3*864e5).toISOString()}]:[],error:null};
  case'world_gifts_in':return{data:M.gift_done?[]:[{id:7,kind:'monete',amount:120,nick:'giangy'},{id:8,kind:'gemme',amount:3,nick:'giangy'}],error:null};
  case'world_gift_claim':M.gift_done=true;return{data:{ok:true},error:null};
  case'world_give':if(a.p_kind==='mattoni'){M.wallet.mattoni-=a.p_amount;if(a.p_loan)M.loan=true;}return{data:{ok:true,msg:a.p_loan?'Prestito fatto: torna da solo fra 3 giorni':'Regalo inviato'},error:null};
  case'world_mine2':
  case'world_mine':return{data:{mattoni:M.wallet.mattoni,lifetime:M.wallet.lifetime,wlevel:lvl,next:100*lvl*lvl,max:2+Math.floor(lvl/2),radius_km:lvl,rate:Object.values(M.b).filter(b=>b.owner==='me').reduce((t,b)=>t+5+5*b.level,0),ready:12,home:{status:'pending'},houses:Object.entries(M.b).filter(([k,b])=>b.owner==='me').map(([k,b])=>({building_id:k,lat:b.lat,lon:b.lon,level:b.level,value:b.paid})),news:M.log.splice(0)},error:null};
  case'world_earn':return{data:{ok:true,got:10,mattoni:(M.wallet.mattoni+=10)},error:null};
  case'world_sup_info':{const U=window.__SUP=window.__SUP||{xp:260,abil:{esploratore:1},equip:{},energia:6,serie:2,serie_oggi:false,share_oggi:false,sp:[]};const g=Math.min(50,1+Math.floor(Math.sqrt(U.xp/50)));
    const sum=Object.values(U.abil).reduce((a,b)=>a+b,0);return{data:{ok:true,xp:U.xp,grado:g,xp_da:50*(g-1)*(g-1),xp_a:50*g*g,punti:Math.max(0,g-1-sum),abil:U.abil,equip:U.equip,energia:U.energia,energia_max:10+(U.abil.resistenza||0),ricarica_min:120,prossima_s:3000,
      raggio_km:1.5+0.5*(g-1)+0.5*(U.abil.esploratore||0),max_sped:1+(U.equip.radio||0),serie:U.serie,serie_oggi:U.serie_oggi,share_oggi:U.share_oggi,inviti:{nuovi:0,valutati:0},notte:false,spedizioni:U.sp},error:null};}
  case'world_sped_parti':{const U=window.__SUP;if(U.sp.some(x=>x.stato==='via'))return{data:{ok:false,msg:'La squadra è già fuori'},error:null};U.energia-=1;
    U.sp.unshift({id:U.sp.length+1,kind:a.p_kind,nome:a.p_nome,lat:a.p_lat,lon:a.p_lon,km:0.5,start_at:new Date().toISOString(),end_at:new Date(Date.now()+(window.__SPED_SUBITO?-1000:18*60e3)).toISOString(),rischio:12,stato:'via'});return{data:{ok:true,id:U.sp.length,min:18,msg:'🎒 Partito! Torna fra 18 min'},error:null};}
  case'world_sped_raccogli':{const U=window.__SUP;const x=U.sp.find(y=>y.id===a.p_id);if(!x||x.stato!=='via')return{data:{ok:false,msg:'Spedizione già raccolta'},error:null};x.stato='raccolta';x.esito={cibo:14,xp:13};U.xp+=13;
    return{data:{ok:true,ko:false,legno:0,cibo:14,carb:0,energia:0,xp:13,mattoni:0,grado:3,salito:false,msg:'Spedizione riuscita'},error:null};}
  case'world_sup_abilita':{const U=window.__SUP;U.abil[a.p_k]=(U.abil[a.p_k]||0)+1;return{data:{ok:true,livello:U.abil[a.p_k],msg:'Abilità migliorata'},error:null};}
  case'world_sup_equip':{const U=window.__SUP;U.equip[a.p_k]=(U.equip[a.p_k]||0)+1;return{data:{ok:true,livello:U.equip[a.p_k],msg:'Costruito!'},error:null};}
  case'world_sup_serie':{const U=window.__SUP;U.serie_oggi=true;U.serie++;return{data:{ok:true,serie:U.serie,giorno:U.serie,legno:15,cibo:15,carb:9,xp:30,energia:1,mattoni:0},error:null};}
  case'world_sup_share':{const U=window.__SUP;window.__SHARE=(window.__SHARE||[]).concat(a.p_dove);if(U.share_oggi)return{data:{ok:false,msg:'Uno al giorno'},error:null};U.share_oggi=true;return{data:{ok:true,xp:20,energia:1,msg:'Grazie per la condivisione: ⭐ +20 e ⚡ +1'},error:null};}
  case'world_seen':return{data:null,error:null};
  case'sponsor_request':{window.__SPREQ=a.p;return{data:a.p&&a.p.name?{ok:true,id:'sp1',msg:'Richiesta inviata'}:{ok:false,msg:'Scrivi il nome'},error:null};}
  case'world_presidi_list':{const P=window.__PRES=window.__PRES||[];if(!P.length&&!window.__PRES_VUOTO){const la=(a.p_minlat+a.p_maxlat)/2,lo=(a.p_minlon+a.p_maxlon)/2;
      P.push({id:'osm:n1',name:'Parco della Pace',kind:'parco',lat:la+0.001,lon:lo+0.001,stato:'libero',record:0,guardie:0,io_guardia:false,difesa:55,vicino:true,perso:true},
             {id:'osm:w2',name:'Piazza Grande',kind:'piazza',lat:la-0.001,lon:lo-0.0015,stato:'altro',nick:null,record:4,guardie:1,io_guardia:false,difesa:67,vicino:true},
             {id:'osm:n3',name:'Stazione',kind:'stazione',lat:la+0.002,lon:lo-0.002,stato:'alleato',nick:'Gio',record:1,guardie:0,io_guardia:false,difesa:55,vicino:false});}
    return{data:{presidi:P.filter(p=>p.lat>=a.p_minlat&&p.lat<=a.p_maxlat&&p.lon>=a.p_minlon&&p.lon<=a.p_maxlon),miei:P.filter(p=>p.stato==='mio').length,max:3,slot:'x',attacco_min:50,attacco_max:99},error:null};}
  case'world_presidi_seed':{window.__PRES_SEED=(window.__PRES_SEED||0)+1;return{data:{ok:true,nuovi:0},error:null};}
  case'world_pres_fortifica':{const p=(window.__PRES||[]).find(x=>x.id===a.p_id);if(!p)return{data:{ok:false,msg:'Presidio non trovato'},error:null};p[a.p_kind]=(p[a.p_kind]||0)+1;if(a.p_kind==='mura')p.difesa+=8;return{data:{ok:true,level:p[a.p_kind],msg:'Fortificazione costruita'},error:null};}
  case'world_presidio_occupa':{const p=(window.__PRES||[]).find(x=>x.id===a.p_id);if(!p||p.stato!=='libero')return{data:{ok:false,msg:'È già tenuto'},error:null};p.stato='mio';p.perso=false;p.record=0;return{data:{ok:true,msg:'Presidio occupato!'},error:null};}
  case'world_presidio_guardia':{const p=(window.__PRES||[]).find(x=>x.id===a.p_id);if(!p||p.stato==='libero'||p.stato==='altro')return{data:{ok:false,msg:'No'},error:null};p.io_guardia=true;p.guardie++;p.difesa=55+12*Math.min(5,p.guardie);return{data:{ok:true,guardie:p.guardie,difesa:p.difesa,msg:'Sei di guardia per la prossima orda'},error:null};}
  case'world_presidio_lascia':{const p=(window.__PRES||[]).find(x=>x.id===a.p_id);if(!p||p.stato!=='mio')return{data:{ok:false,msg:'Non lo tieni tu'},error:null};p.stato='libero';p.guardie=0;p.io_guardia=false;p.difesa=55;return{data:{ok:true,msg:'Presidio lasciato'},error:null};}
  case'push_piazza':{window.__PZ=a.p_mode?a.p_mode:(window.__PZ||'zona');return{data:{ok:true,piazza:window.__PZ},error:null};}
  case'world_mezzo':{const mz=M.mz||'bici';return{data:{mezzo:mz,vero:'bici',comprato:M.mz||null,range_km:{piedi:2,bici:5,moto:12,auto:20,fuori:20}[mz],speed:15,help_pts:{piedi:4,bici:5,moto:6,auto:8,fuori:10}[mz]+1,dotazioni:1,atk_mult:1,prezzi:{moto:300,auto:600,fuori:1200}},error:null};}
  case'world_buy_mezzo':{M.mz=a.p_mezzo;M.wallet.mattoni-=({moto:300,auto:600,fuori:1200}[a.p_mezzo]||0);return{data:{ok:true,msg:'Nuovo mezzo pronto',mezzo:a.p_mezzo},error:null};}
  case'world_set_mezzo_vero':{window.__MZV=[a.p_mezzo,a.p_dot];return{data:{ok:true,mezzo:a.p_mezzo},error:null};}
  case'world_shape_get':{const S=window.__SHP=window.__SHP||{};const v=S[a.p_kind+'|'+a.p_k];return{data:v===undefined?null:{found:v!==null,val:v},error:null};}
  case'world_shape_put':{const S=window.__SHP=window.__SHP||{};const key=a.p_kind+'|'+a.p_k;if(!(S[key]&&a.p_val==null))S[key]=a.p_val;return{data:{ok:true},error:null};}
  case'world_claim_home':return{data:{ok:true,status:'pending',msg:'Casa registrata: domani riapri l’app per confermarla'},error:null};
  case'world_view':return{data:Object.entries(M.b).map(([k,b])=>({building_id:k,lat:b.lat,lon:b.lon,status:st(k),nick:b.owner&&b.owner!=='me'?b.owner:null,level:b.level})),error:null};
  case'world_quote':{const s=st(a.p_bid);return{data:{status:s,price,can:s==='free'&&M.wallet.mattoni>=price,why:'',owner_nick:M.b[a.p_bid]&&M.b[a.p_bid].owner,level:(M.b[a.p_bid]||{}).level||1,value:(M.b[a.p_bid]||{}).paid||0,mattoni:M.wallet.mattoni,wlevel:lvl,owned:1,max:3,radius_km:3,dist_km:0.2,up_cost:150},error:null};}
  case'world_buy':{if(st(a.p_bid)!=='free')return{data:{ok:false,msg:'occupata'},error:null};M.b[a.p_bid]={owner:'me',lat:a.p_lat,lon:a.p_lon,level:1,paid:price};M.wallet.mattoni-=price;return{data:{ok:true,msg:'Casa comprata',price},error:null};}
  case'world_raid_status':{const now=new Date();const p=new Date(now.getTime()-3600e3),n=new Date(now.getTime()+3*3600e3);M.prep=M.prep||false;
     const H=[{bid:'w1',lat:45.3255,lon:10.6582,level:1,home:true,attack:70,power:62,held:false},{bid:'w9',lat:45.326,lon:10.659,level:2,home:false,attack:50,power:69,held:true}];
     const TP=window.__mkTrr||{};return{data:{next_at:n.toISOString(),prev_at:p.toISOString(),prepared:M.prep,claimed:!!M.claimed,houses:H,held:1,total:2,mattoni:18,legno:4,cibo:6,carb:0,custodita:TP.custodita!==false,presente_at:TP.presente_at||new Date(now.getTime()-2*864e5).toISOString()},error:null};}
  case'world_prepare':M.prep=true;return{data:{ok:true,msg:'Case preparate per la prossima orda'},error:null};
  case'world_raid_claim':M.claimed=true;M.wallet.mattoni+=18;return{data:{ok:true,held:1,total:2,mattoni:18,legno:4,cibo:6,carb:0},error:null};
  case'world_raid_view':return{data:[{building_id:'w1',lat:45.3255,lon:10.6582,held:false,kind:'home',mine:true},{building_id:'w9',lat:45.326,lon:10.659,held:true,kind:'owned',mine:true},{building_id:'x2',lat:45.3248,lon:10.6575,held:true,kind:'home',mine:false}],error:null};
  case'world_raid_status':{const now=Date.now();return{data:{next_at:new Date(now+2*3600e3+14*6e4).toISOString(),next_id:'n',prev_at:new Date(now-9*3600e3).toISOString(),prev_id:'p',prepared:!!M.prep,prev_prepared:false,claimed:!!M.claimed,total:2,held:1,mattoni:22,houses:[]},error:null};}
  case'world_prepare':M.prep=1;return{data:{ok:true},error:null};
  case'world_raid_claim':if(M.claimed)return{data:{ok:false,msg:'già'},error:null};M.claimed=1;M.wallet.mattoni+=22;return{data:{ok:true,held:1,total:2,mattoni:22},error:null};
  case'world_raid_view':return{data:[{building_id:'a',lat:45.3258,lon:10.6585,held:true,kind:'home',mine:true},{building_id:'b',lat:45.3250,lon:10.6575,held:false,kind:'owned',mine:false}],error:null};
  case'world_help_list':return{data:[{user_id:'u2',nick:'giangy',wlevel:2,helpers:1,dist_km:3,mine_helped:!!M.helped}],error:null};
  case'world_rivals':return{data:[{user_id:'u3',nick:'mario',wlevel:4,dist_km:12,attacked:!!M.att,shield:false},{user_id:'u4',nick:'nuovo',wlevel:1,dist_km:3,attacked:false,shield:true}],error:null};
  case'world_ask_help':M.asked=true;return{data:{ok:true,msg:'Richiesta di aiuto inviata a tutto il mondo'},error:null};
  case'world_send_help':M.helped=true;M.hg=M.hg||{};M.hg[a.p_target]=1;return{data:{ok:true,msg:'Rinforzi mandati: +5 alla sua difesa, +5 Mattoni a te'},error:null};
  case'world_send_attack':M.att=true;return{data:{ok:true,msg:'Orda mandata'},error:null};
  case'world_feed_list':{const now=Date.now();const F=[{id:3,kind:'ask',actor:'u2',actor_nick:'giangy',comune:'Volta Mantovana',created_at:new Date(now-6e4).toISOString()},{id:2,kind:'buy',actor:'u3',actor_nick:'mario',comune:'Valeggio',info:'npc',created_at:new Date(now-36e5).toISOString()},{id:1,kind:'shout',actor:'u2',actor_nick:'giangy',target:'me',target_nick:'ale',info:'2',created_at:new Date(now-72e5).toISOString()}];
     return{data:a.p_scope==='pervoi'?[F[2]]:F,error:null};}
  case'world_ally_pending':return{data:M.accepted?[]:[{user_id:'u3',nick:'mario',wlevel:4}],error:null};
  case'world_ally_answer':M.accepted=true;return{data:{ok:true,msg:'Alleanza fatta!'},error:null};
  case'world_ally_request':return{data:{ok:true,msg:'Proposta di alleanza inviata'},error:null};
  case'world_rank':return{data:[{pos:1,user_id:'u3',nick:'mario',wlevel:5,punti:2400,comune:'Valeggio',me:false},{pos:2,user_id:'me',nick:'ale',wlevel:4,punti:1600,comune:'Volta Mantovana',me:true}],error:null};
  case'world_allies':return{data:[{user_id:'u2',nick:'giangy',wlevel:2,dist_km:3,coinq:false},{user_id:'u5',nick:'vicina',wlevel:3,dist_km:0,coinq:true}],error:null};
  case'world_player':return{data:{user_id:a.p_user,nick:a.p_user==='u2'?'giangy':'mario',wlevel:3,comune:'Volta Mantovana',houses:2,home:true,me:false,ally:a.p_user==='u2'?'ok':'none',asked:true,helped:false,attacked:false,protected:false,dist_km:a.p_user==='u9'?8.4:3.2,mezzo:M.mz||'bici',mezzo_pieno:M.mz||'bici',carb_cost:0,carb_pieno:0,carb:25,range_km:M.mz?20:5,eta_min:13,help_pts:6,atk_pts:7,custodita:a.p_user!=='u8',saccheggiabile:a.p_user==='u8',scudo:false},error:null};
  case'world_shout':M.shouts=(M.shouts||0)+1;return{data:{ok:true,msg:'Saluto inviato'},error:null};
  case'world_chat_list':{M.chat=M.chat||[{id:1,user_id:'u2',nick:'giangy',wlevel:2,body:'Stanotte ho tenuto tutto 💪',created_at:new Date(Date.now()-6e5).toISOString(),mine:false}];return{data:M.chat.filter(m=>m.id>(a.p_after||0)).slice().reverse(),error:null};}
  case'world_chat_send':{if(/porco dio|ti ammazzo/i.test(a.p_body))return{data:{ok:false,msg:'Non inviato: niente bestemmie, insulti pesanti o minacce.'},error:null};M.chat=M.chat||[];M.chat.push({id:M.chat.length+1,user_id:'me',nick:'ale',wlevel:4,body:a.p_body,created_at:new Date().toISOString(),mine:true});return{data:{ok:true},error:null};}
  case'world_chat_report':M.rep=(M.rep||0)+1;return{data:{ok:true,msg:'Segnalazione inviata, grazie'},error:null};
  case'world_block':M.blk=true;return{data:{ok:true,msg:'Bloccato'},error:null};
  case'world_upgrade':{const b=M.b[a.p_bid];if(!b)return{data:{ok:false,msg:'Non è tua'},error:null};const c=150*b.level;if(M.wallet.mattoni<c)return{data:{ok:false,msg:'Mattoni insufficienti'},error:null};M.wallet.mattoni-=c;b.level++;return{data:{ok:true,level:b.level},error:null};}
  case'world_send_curse':M.curses=(M.curses||0)+1;return{data:{ok:true,msg:a.p_kind==='nebbia'?'Nebbia mandata: −5 alla sua difesa alla prossima orda':'Sabotaggio riuscito'},error:null};
  case'world_welcome':if(M.kit)return{data:{ok:false,got:0},error:null};M.kit=1;M.wallet.mattoni+=300;return{data:{ok:true,got:300,shield:true},error:null};
  case'world_status_extra':return{data:{shield:true,shield_days:12,boost:true,median:4,wlevel:1,league:'Bronzo',houses:1},error:null};
  case'world_rank_lega':return{data:[{pos:1,user_id:'u2',nick:'giangy',wlevel:3,punti:120,comune:'Volta Mantovana',me:false},{pos:2,user_id:'me',nick:'ale',wlevel:1,punti:80,comune:null,me:true}],error:null};
  case'world_team_bonus':return{data:{coinq:['vicina'],coinq_prep:1,allies:3,allies_prep:3,shields_in:1,shields_out:M.shout||[]},error:null};
  case'world_ally_shield':M.shout=(M.shout||[]).concat([a.p_target]);return{data:{ok:true,msg:'Scudo dato: +5 alla sua difesa alla prossima orda'},error:null};
  case'world_my_defense':return{data:{prep:15,realshield:3,realshield_pts:6,helps:2,helps_pts:10,shields:1,shields_pts:5,squad:3,squad_pts:5,coinq:1,coinq_pts:3,attacks:1,fog:0,sab:0,malus:8,bonus:36,attack_min:46,attack_max:105,wlevel:4,houses:[{bid:'home',home:true,level:1,total:98},{bid:'g45.32600_10.65900',home:false,level:2,total:105}]},error:null};
  case'world_set_realshield':M.rs=a.p_lvl;return{data:{ok:true,rs:a.p_lvl},error:null};
  case'world_condo_info':{const C=window.__mkCd||(window.__mkCd={me:0,rift:{}});return{data:{ok:true,admin:{user_id:'u9',nick:'gina',tot:300},versati:[{nick:'gina',tot:300,me:false}].concat(C.me?[{nick:'ale',tot:C.me,me:true}]:[]),me_tot:C.me,bonus:C.me?3:0,
    vicini:[{user_id:'u9',nick:'gina',unit:'B 3',rotto:!!C.rift.u9,rotto_da_me:!!C.rift.u9,pace_chiesta:false,puo_rompere:true},{user_id:'u7',nick:'mamma',unit:'A 1',rotto:false,rotto_da_me:false,pace_chiesta:false,puo_rompere:false}]},error:null};}
  case'world_condo_break':{const C=window.__mkCd||(window.__mkCd={me:0,rift:{}});C.rift[a.p_user]=1;return{data:{ok:true,msg:'Avete rotto: ora siete rivali. Puoi fare pace quando vuoi'},error:null};}
  case'world_condo_peace':{const C=window.__mkCd||(window.__mkCd={me:0,rift:{}});delete C.rift[a.p_user];return{data:{ok:true,peace:true,msg:'Pace fatta: siete di nuovo alleati'},error:null};}
  /* territorio (migrazione 014) */
  case'world_edificio_info':{const T=window.__mkTrr||(window.__mkTrr={});const mio=/^w/.test(a.p_bid);const al=a.p_bid==='al1';const pres=/^pres:/.test(a.p_bid);
    const R=window.__mkRes||(window.__mkRes={legno:60,cibo:45,carb:25,left:100});const k=a.p_bid;const e=(T[k]||(T[k]={atk:0,aiuto:0,assi:0}));
    const tipo=pres?'pres':(a.p_bid==='w1'?'home':'owned');
    return{data:{tipo,bid:k,level:1,mio,alleato:al,nick:mio?'ale':al?'giangy':'mario',owner:mio?'me':'u7',scudo:false,custodita:tipo==='home'?T.custodita!==false:null,fort:1,rendita:tipo==='owned'?14:null,slot:'2026-11-14-21',
      assalti:e.atk?1:0,assalti_pts:e.atk,aiuti:e.aiuto?1:0,aiuti_pts:e.aiuto,assi_pts:e.assi,ultimo:null,
      atk:(mio||al)?{ok:false,msg:mio?'È tua':'È di un tuo alleato: puoi solo difenderla'}:e.atk?{ok:false,msg:'La tua squadra è già in viaggio'}:{ok:true,pts:9,carb:3,cibo:10,mezzo:'auto',mezzo_pieno:'auto',eta_min:2,in_tempo:true},
      aiuto:al?(e.aiuto?{ok:false,msg:'Sei già in viaggio per difenderla'}:{ok:true,pts:8,carb:3,mezzo:'auto',eta_min:2,in_tempo:true}):{ok:false,msg:'Si difendono solo gli alleati'},
      assi:(mio||al)?(e.assi>=18?{ok:false,msg:'Già 3 file di assi per questa orda (+18)'}:R.legno<20?{ok:false,msg:'Servono 🪵 20 di legno'}:{ok:true,pts:6,legno:20}):{ok:false,msg:'Le assi si inchiodano solo sulle tue case e su quelle degli alleati'}},error:null};}
  case'world_assalta':case'world_difendi':case'world_assi':{const T=window.__mkTrr||(window.__mkTrr={});const R=window.__mkRes||(window.__mkRes={legno:60,cibo:45,carb:25,left:100});const e=(T[a.p_bid]||(T[a.p_bid]={atk:0,aiuto:0,assi:0}));
    if(fn==='world_assalta'){e.atk=9;R.cibo-=10;R.carb-=3;return{data:{ok:true,msg:'⚔️ Squadra partita in auto: arriva tra 2 min'},error:null};}
    if(fn==='world_difendi'){e.aiuto=8;R.carb-=3;return{data:{ok:true,msg:'🛡️ In viaggio in auto'},error:null};}
    e.assi+=6;R.legno-=20;return{data:{ok:true,msg:'🪵 Assi inchiodate: +6'},error:null};}
  case'world_presenza':{const T=window.__mkTrr||(window.__mkTrr={});T.custodita=true;T.presente_at=new Date().toISOString();return{data:{ok:true,carb:10,msg:'📍 Sei a casa: rifugio intoccabile per 7 giorni'},error:null};}
  case'world_consigli':{const G=window.__mkGd||{};return{data:{ok:true,slot:'2026-11-14-21',asked:false,affitti:G.affitti!=null?G.affitti:24,miei_presidi:0,
    minacce:G.minacce||[{bid:'w9',tipo:'owned',nome:'',lat:45.326,lon:10.659,atk:9,n:1,aiuti:0,assi:0}],
    richieste:[{user_id:'u2',nick:'giangy',dist_km:1.2,mezzo:'auto',carb:2,arrivo:true,pts:8}],
    alleati:[{bid:'al1',owner:'u2',nick:'giangy',tipo:'owned',lat:45.327,lon:10.661,atk:7,aiuto:{ok:true,pts:8,carb:2}}],
    presidi:[{id:'osm:n7',name:'Parco Vero',kind:'parco',lat:45.33,lon:10.66,dist_km:0.6,carb:1}],
    bersagli:[{bid:'x5',lat:45.326,lon:10.66,level:1,nick:'mario',dist_km:0.8,fort:0,atk:{ok:true,pts:9,carb:2}}],
    risorse:{mattoni:1000,legno:(window.__mkRes||{}).legno||60,cibo:45,carb:25}},error:null};}
  case'world_alleanze_mie':{const A=window.__mkAlz||(window.__mkAlz={in:false});return{data:{ok:true,max:3,alleanze:A.in?[{id:1,nome:'Lupi di Volta',emblema:'🐺',capo:'me',capo_nick:'ale',votanti:['me','u2'],membri:[{user_id:'me',nick:'ale',wlevel:3,attivita:12,me:true},{user_id:'u2',nick:'giangy',wlevel:2,attivita:9,me:false}],
      da_votare:[{id:7,tipo:'richiesta',user_id:'u8',nick:'gina',wlevel:1,da:null,si:0,no:0,votanti:2,candidato_ok:true,dist_km:3.1}],in_corso:[]}].concat(A.br?[{id:9,nome:'Onças',emblema:'🐆',capo:'u5',capo_nick:'joao',votanti:['u5'],membri:[{user_id:'u5',nick:'joao',wlevel:2,attivita:5,me:false},{user_id:'me',nick:'ale',wlevel:3,attivita:12,me:true}],da_votare:[],in_corso:[]}]:[]):[],
      inviti:A.in?[]:[{id:5,alleanza:'Cerchio di Ferro',emblema:'🔥',da:'mario',membri:4,perche_no:null}],mie_richieste:[]},error:null};}
  case'world_alleanza_fonda':{const A=window.__mkAlz||(window.__mkAlz={});A.in=true;return{data:{ok:true,id:1,msg:'🛡️ Alleanza fondata'},error:null};}
  case'world_alleanza_invita2':return{data:{ok:true,msg:'📨 Invito partito'},error:null};
  case'world_alleanza_esci2':{const A=window.__mkAlz||(window.__mkAlz={});if(a.p_aid===9)A.br=false;else A.in=false;return{data:{ok:true,msg:'Sei uscito'},error:null};}
  case'world_alleanza_chat2':return{data:((window.__mkAlzChat2||{})[a.p_aid]||[]).map((b,i)=>({id:i+1,user_id:'me',nick:'ale',body:b,created_at:new Date().toISOString(),mine:true})),error:null};
  case'world_alleanza_scrivi2':{const C=window.__mkAlzChat2=window.__mkAlzChat2||{};(C[a.p_aid]=C[a.p_aid]||[]).push(a.p_body);return{data:{ok:true},error:null};}
  case'world_alleanza_info':{const A=window.__mkAlz||(window.__mkAlz={in:false});return{data:{ok:true,alleanza:A.in?{id:1,nome:'Lupi di Volta',emblema:'🐺',capo:'me',capo_nick:'ale',votanti:['me','u2'],ultimo_msg:1,membri:[{user_id:'me',nick:'ale',wlevel:3,attivita:12,me:true},{user_id:'u2',nick:'giangy',wlevel:2,attivita:9,me:false}]}:null,
    da_votare:A.in?[{id:7,tipo:'richiesta',user_id:'u8',nick:'gina',wlevel:1,da:null,si:0,no:0,votanti:2,candidato_ok:true,dist_km:3.1}]:[],in_corso:[],inviti:A.in?[]:[{id:5,alleanza:'Cerchio di Ferro',emblema:'🔥',da:'mario',membri:4}],mie_richieste:[]},error:null};}
  case'world_alleanze_vicine':return{data:[{id:2,nome:'Cerchio di Ferro',emblema:'🔥',capo:'mario',membri:4,dist_km:2.3,chiesto:false}],error:null};
  case'world_alleanza_crea':{const A=window.__mkAlz||(window.__mkAlz={});A.in=true;return{data:{ok:true,id:1,msg:'🛡️ Alleanza fondata'},error:null};}
  case'world_alleanza_chiedi':return{data:{ok:true,msg:'🗳️ Richiesta inviata'},error:null};
  case'world_alleanza_invita':return{data:{ok:true,msg:'📨 Invito partito'},error:null};
  case'world_alleanza_vota':{window.__mkAlzVoto=(window.__mkAlzVoto||0)+1;return{data:{ok:true,esito:'aperta',msg:'🗳️ Voto registrato'},error:null};}
  case'world_alleanza_risposta':{const A=window.__mkAlz||(window.__mkAlz={});if(a.p_si)A.in=true;return{data:{ok:true,msg:a.p_si?'🛡️ Benvenuto':'Invito rifiutato'},error:null};}
  case'world_alleanza_esci':{const A=window.__mkAlz||(window.__mkAlz={});A.in=false;return{data:{ok:true,msg:'Sei uscito'},error:null};}
  case'world_alleanza_chat':return{data:(window.__mkAlzChat||[]).map((b,i)=>({id:i+1,user_id:'me',nick:'ale',body:b,created_at:new Date().toISOString(),mine:true})),error:null};
  case'world_alleanza_scrivi':{(window.__mkAlzChat=window.__mkAlzChat||[]).push(a.p_body);return{data:{ok:true},error:null};}
  case'world_rank_alleanze':return{data:[{pos:1,id:2,nome:'Cerchio di Ferro',emblema:'🔥',membri:4,punti:980,mia:false},{pos:2,id:1,nome:'Lupi di Volta',emblema:'🐺',membri:2,punti:610,mia:true}],error:null};
  case'world_saccheggia':return{data:{ok:true,msg:'⚔️ Squadra partita'},error:null};
  case'world_resources':{const R=window.__mkRes||(window.__mkRes={legno:60,cibo:45,carb:25,left:100});return{data:{ok:true,mattoni:1000,legno:R.legno,cibo:R.cibo,carb:R.carb,mercato_left:R.left},error:null};}
  case'world_trade':{const R=window.__mkRes||(window.__mkRes={legno:60,cibo:45,carb:25,left:100});if(R[a.p_kind]<20)return{data:{ok:false,msg:'Servono almeno 20 di quella risorsa'},error:null};R[a.p_kind]-=20;R.left-=10;return{data:{ok:true,dato:20,mattoni:10,mercato_left:R.left},error:null};}
  case'world_near_survivors':window.__mkNear=a;return{data:[{user_id:'u2',nick:'giangy',wlevel:3,comune:'Volta',km:3.2,ally:'ok',fav:false},{user_id:'u9',nick:'rino',wlevel:1,comune:'Cereta',km:11.5,ally:'none',fav:false}],error:null};
  case'world_favs_list':{const F=window.__mkFav||(window.__mkFav={});return{data:Object.keys(F).map(k=>({user_id:k,nick:F[k],wlevel:1,comune:null,ally:'none'})),error:null};}
  case'world_fav_set':{const F=window.__mkFav||(window.__mkFav={});if(a.p_on)F[a.p_user]=a.p_user==='u9'?'rino':a.p_user==='u8'?'gina':'mario';else delete F[a.p_user];return{data:{ok:true,on:a.p_on},error:null};}
  case'world_find':return{data:[{user_id:'u7',nick:'giangy',wlevel:2,comune:'Cereta',ally:'out'},{user_id:'u8',nick:'gina',wlevel:1,comune:null,ally:'none'}],error:null};
  case'world_threats':{const mk=(bid,home,lvl,ev,sl)=>({bid,home,level:lvl,lat:45.3255,lon:10.6582,def:45+12*lvl+(home?5:0)+20,bonus:20,wl:6,slope:sl,ev,hh:21,mw:+(Math.max(.3,1-sl)*(ev==='pioggia'?.9:1)).toFixed(2),std_min:42,std_max:91,
      specials:[{k:'runner',base:4.72,mod:ev==='pioggia'?.7*(1-4*sl):1-4*sl,dk:'fossato',dl:(M.defs&&M.defs[bid+'fossato'])||0,dk2:'trappole',dl2:(M.defs&&M.defs[bid+'trappole'])||0},{k:'casco',base:4.72,mod:1-sl,dk:'barricate',dl:(M.defs&&M.defs[bid+'barricate'])||0,dk2:'grate',dl2:0},{k:'strillone',base:3.54,mod:1,dk:'sirena',dl:0},{k:'scavatore',base:5.9,mod:ev==='pioggia'?1.3:1,dk:'fondamenta',dl:0},{k:'brute',base:7.08,mod:1-3*sl,dk:'barricate',dl:(M.defs&&M.defs[bid+'barricate'])||0},{k:'ombra',base:5.9,mod:1.2,dk:'fari',dl:0,dk2:'cani',dl2:0}],
      atk_min:0,atk_max:0,defs:Object.fromEntries(Object.entries(M.defs||{}).filter(([k])=>k.startsWith(bid)).map(([k,v])=>[k.slice(bid.length),v]))});
      return{data:[mk('home',true,1,'pioggia',.05),mk('g45.32600_10.65900',false,2,'nebbia',-.03)],error:null};}
  case'world_def_upgrade':{M.defs=M.defs||{};const k=a.p_bid+a.p_kind;M.defs[k]=(M.defs[k]||0)+1;M.wallet.mattoni-=80*M.defs[k];return{data:{ok:true,level:M.defs[k],msg:'ok'},error:null};}
  case'world_allies_status':return{data:[{user_id:'u2',nick:'giangy',wlevel:2,seen_at:new Date(Date.now()-26*3600e3).toISOString(),prepared:false,asked:false,helped_by_me:!!(M.hg&&M.hg.u2),shield_by_me:false,coinq:false,houses:2,worst:31},{user_id:'u5',nick:'vicina',wlevel:3,seen_at:new Date().toISOString(),prepared:true,asked:true,helped_by_me:false,shield_by_me:false,coinq:true,houses:1,worst:78}],error:null};
  case'world_ally_view':{const r=await window.__mockSB.rpc('world_threats');return{data:{ok:true,user_id:a.p_user,nick:a.p_user==='u2'?'giangy':'vicina',wlevel:2,seen_at:new Date(Date.now()-26*3600e3).toISOString(),prepared:false,asked:false,helps_in:(M.hg&&M.hg[a.p_user])?1:0,shields_in:0,helped_by_me:!!(M.hg&&M.hg[a.p_user]),shield_by_me:false,coinq:false,houses:r.data},error:null};}
  case'world_send_help':M.hg=M.hg||{};M.hg[a.p_target]=1;return{data:{ok:true,msg:'Rinforzi mandati: +5 alla sua difesa, +5 Mattoni a te'},error:null};
  case'world_dm_send':M.dm=(M.dm||[]);M.dm.push({id:M.dm.length+1,mine:true,body:a.p_body,created_at:new Date().toISOString(),to:a.p_to});return{data:{ok:true},error:null};
  case'world_dm_list':return{data:(M.dm||[]).filter(m=>m.to===a.p_with).concat([{id:0,mine:false,body:'Ciao! Stasera preparo le case',created_at:new Date(Date.now()-600e3).toISOString()}]).sort((x,y)=>y.id-x.id),error:null};
  case'world_dm_threads':return{data:[{user_id:'u2',nick:'giangy',last_body:'Ciao! Stasera preparo le case',last_at:new Date().toISOString(),unread:1}],error:null};
  case'world_my_effects':return{data:[{user_id:'u3',nick:'mario',kind:'nebbia',lat:45.327,lon:10.66},{user_id:'u3',nick:'mario',kind:'orda',lat:45.327,lon:10.66},{user_id:'u2',nick:'giangy',kind:'scudo',lat:45.324,lon:10.656}],error:null};
  case'world_house_log':return{data:[{reason:'Difesa: fari livello 2',delta:-160,created_at:new Date(Date.now()-86400e3).toISOString()},{reason:'Difesa: fari livello 1',delta:-80,created_at:new Date(Date.now()-2*86400e3).toISOString()}],error:null};
  case'world_reward':{M.rew=(M.rew||0);const g=Math.min(a.p_amount,60,300-M.rew);if(g<=0)return{data:{ok:false,got:0,msg:'max'},error:null};M.rew+=g;M.wallet.mattoni+=g;return{data:{ok:true,got:g},error:null};}
  case'world_coresidents':return{data:[{user_id:'u5',nick:'vicina',status:'home',seen_at:new Date().toISOString(),ally:false},{user_id:'u9',nick:'arf18',status:'pending',seen_at:new Date(Date.now()-3600e3).toISOString(),ally:true}],error:null};
  case'world_house_info':{M.hk=M.hk||{kind:'casa',unit:null,kind_set:false};M.cd=M.cd||{portone:{level:0,pot:0},cancello:{level:1,pot:30},telecamere:{level:0,pot:0}};
      return{data:{kind:M.hk.kind,unit:M.hk.unit,kind_set:M.hk.kind_set,building_id:'home',status:'home',me_prep:!!M.prep,members:(M.hk.mem||[]).map(m=>({...m,prep:m.prep!==undefined?m.prep:false})),requests:M.hk.req===false?[]:[{user_id:'u7',nick:'mamma'}],
        neighbors:[{user_id:'u5',nick:'vicina',status:'home',kind:'condominio',unit:'B 3',prep:true,seen_at:new Date().toISOString(),ally:false,asked:!!M.hk.asked}],
        condo:M.hk.kind==='condominio'?{bonus:3*Object.values(M.cd).reduce((a,d)=>a+d.level,0),defs:Object.entries(M.cd).map(([k,d])=>({kind:k,level:d.level,pot:d.pot,next:d.level>=3?null:240*(d.level+1),top:d.pot?[{nick:'ale',tot:d.pot}]:[]}))}:null},error:null};}
  case'world_set_home':M.hk=M.hk||{};M.hk.kind=a.p_kind;M.hk.unit=a.p_unit||null;M.hk.kind_set=true;return{data:{ok:true,msg:'salvato'},error:null};
  case'world_house_invite':M.hk.asked=true;return{data:{ok:true,msg:'Richiesta inviata'},error:null};
  case'world_house_answer':M.hk.req=false;if(a.p_yes)M.hk.mem=[{user_id:'u7',nick:'mamma'}];return{data:{ok:true,msg:'Ora vivete nella stessa casa'},error:null};
  case'world_condo_give':{const d=M.cd[a.p_kind];d.pot+=a.p_amount;M.wallet.mattoni-=a.p_amount;let up=0;while(d.level<3&&d.pot>=240*(d.level+1)){d.pot-=240*(d.level+1);d.level++;up++;}return{data:{ok:true,level:d.level,up,msg:up?'Il condominio sale':'Grazie!'},error:null};}
  case'world_inviter':return{data:'ale',error:null};
  case'world_home_vis':{M.vis=M.vis||'alleati';if(a.p_vis)M.vis=a.p_vis;return{data:{ok:true,vis:M.vis},error:null};}
  case'world_score':return{data:{tot:a.p_user?512:438,dif:150,forte:40,casa:68,squadra:55,costanza:70,crescita:55,held:7,orde:14,fort:4,lvup:1,indice:5.5,helps:2,alleati:2,giorni:5,giorni_max:7,mattoni:440},error:null};
  case'world_collect':M.wallet.mattoni+=12;return{data:{ok:true,got:12},error:null};
  }return{data:null,error:{message:'rpc '+fn}};},from:()=>{const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:window.__INVDA?{invitato_da:window.__INVDA}:null}),update(v){window.__UPD=v;return q},is(){return q},insert:async()=>({error:null}),limit(){return q},order(){return q},not(){return q},in(){return q},then(r){return Promise.resolve({data:window.__mkFrom||[],error:null}).then(r)}};return q;},functions:{invoke:async()=>({data:null,error:{message:'no'}})}};
