<script>
/* =========================================================
   OROLOGIO UNICO (Fase 4f-2)
   Prima: 28 setInterval permanenti sparsi in 20 moduli, ognuno col suo timer di sistema.
   Ora: UN solo timer (ogni 250 ms) che fa girare i compiti periodici, ognuno col suo intervallo
   di sempre. zEvery(fn, ms, nome) ha gli stessi argomenti di setInterval(fn, ms).
   I timer "di una volta" dentro pagine e animazioni (ruota, musica, attese) restano setInterval.
   Un errore in un compito non ferma gli altri (come con setInterval).
   ========================================================= */
const ZCLOCK={tick:250,h:null,t:[]};
function zEvery(fn,ms,nome){const t={fn,ms:Math.max(ZCLOCK.tick,+ms||0),nome:nome||(fn&&fn.name)||'',next:Date.now()+(+ms||0)};ZCLOCK.t.push(t);
  if(!ZCLOCK.h)ZCLOCK.h=setInterval(zClockTick,ZCLOCK.tick);return t;}
function zClockTick(){const now=Date.now();
  for(const t of ZCLOCK.t){if(now<t.next-60)continue;   /* 60 ms di tolleranza: il compito da 1 s gira davvero ogni secondo */
    t.next+=t.ms;if(t.next<=now)t.next=now+t.ms;          /* cadenza fissa; dopo una pausa lunga riparte da adesso */
    try{t.fn();}catch(e){console.warn('orologio',t.nome,e);}}}
</script>
