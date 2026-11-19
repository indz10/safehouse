<script>
/* =========================================================
   📬 BACHECA TOCCABILE (Fase 48b, nessun SQL): ogni riga di "Per te" e della Bacheca porta all'azione,
   come la notifica sul telefono (stesse pagine di feedMsg in zsh-push). Se la novità riguarda un altro
   giocatore, si apre la scheda di chi l'ha fatta. I pulsanti e i @nomi dentro la riga restano com'erano.
   ========================================================= */
const FD_URL={dm:a=>'/?go=social&dm='+a,ally_req:()=>'/?go=social&req=1',all_voto:()=>'/?go=social&req=1',all_invito:()=>'/?go=social&req=1',house_req:()=>'/?go=social&req=1',
  all_msg:()=>'/?go=social&alz=chat',all_entrato:()=>'/?go=social&alz=1',all_si:()=>'/?go=social&alz=1',all_no:()=>'/?go=social&alz=1',
  assalto:()=>'/?go=orda&case=1',conquista:()=>'/?go=orda&case=1',saccheggio:()=>'/?go=orda&case=1',difesa:()=>'/?go=orda&case=1',assi:()=>'/?go=orda&case=1',
  help:()=>'/?go=orda&case=1',attack:()=>'/?go=orda&case=1',curse:()=>'/?go=orda&case=1',shield:()=>'/?go=orda&case=1',orda_perdite:()=>'/?go=orda&case=1',
  casa_crollata:()=>'/?go=orda&case=1',casa_libera:()=>'/?go=orda&case=1',cantiere_ok:()=>'/?go=orda&case=1',
  respinto:()=>'/?go=orda&attacchi=1',pvp_arrivo:()=>'/?go=orda&attacchi=1',pvp_esito:()=>'/?go=orda&attacchi=1',pvp_aiuto:()=>'/?go=orda&attacchi=1',
  pvp_rinf:()=>'/?go=orda&attacchi=1',pvp_difeso:()=>'/?go=orda&attacchi=1',raduno:()=>'/?go=orda&attacchi=1',
  evento:(a,i)=>'/?go=mappa&evt='+(String(i).split('|')[1]||''),lente:(a,i)=>+String(i).split('|')[1]?'/?go=mappa&casse=1':'/?go=mappa&lente=1',
  boss_caduto:()=>'/?go=mappa&boss=1',sfida_vinta:()=>'/?go=mappa&sfida=1',sped_ok:()=>'/?go=mappa&sup=1',casa_manca:()=>'/?go=mappa&reg=1'};
function fdGo(k,info,actor,target){const me=S.user&&S.user.id;const f=FD_URL[k];
  if(f&&(!target||target===me||k==='evento'||k==='lente')){try{closeSheet();}catch(e){}window.SHEET_BACK=null;zGoUrl(f(actor,info));return;}
  if(actor&&actor!==me){window.SHEET_BACK=null;playerSheet(actor);return;}
  if(f){window.SHEET_BACK=null;zGoUrl(f(actor,info));}}
const _socLineFd=socLine;socLine=function(f){let h=_socLineFd.apply(this,arguments);try{
  if(f.kind==='evento'){const k=String(f.info||'').split('|')[0];const K=typeof EVT_K!=='undefined'&&EVT_K[k];if(K)h=h.replace('guarda la mappa',K[0]+' '+K[1].toLowerCase());}
  if(FD_URL[f.kind]||f.actor)h=h.replace('<div class="sitem"',`<div class="sitem sgo" data-fk="${esc(f.kind||'')}" data-fi="${esc(f.info||'')}" data-fa="${esc(f.actor||'')}" data-ft="${esc(f.target||'')}"`);}catch(e){}return h;};
document.addEventListener('click',e=>{const r=e.target.closest&&e.target.closest('.sitem.sgo');if(!r)return;
  if(e.target.closest('button,a,input,textarea,select,.nicklink,.snick,[data-pl]'))return;fdGo(r.dataset.fk,r.dataset.fi,r.dataset.fa,r.dataset.ft);});
</script>
