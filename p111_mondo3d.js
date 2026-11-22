<script>
/* 🏙️ IL MONDO IN 3D CURATO (Fase 65)
   Sulla mappa del Mondo il tasto 🏙️ 3D (`.lm-3d` di p19) ora usa la stessa cura della mappa del Gioco:
   palazzi con finestre (accese di sera) e tetto chiaro, altezze diverse, righe gialle sulle strade, nomi di negozi e posti,
   numeri civici, ferrovie e luce. Tutto il resto del Mondo (case, alleati, presidi, zombie, scorte, tocchi) non cambia:
   si aggiungono solo strati `w3-*` sopra la mappa, nascosti quando il 3D è spento. */
const W3_H=['coalesce',['get','render_height'],['+',6,['*',3,['%',['to-number',['id'],0],4]]]];
function w3Strati(m){const R=['interpolate',['exponential',1.6],['zoom']];const L=[
  {id:'w3-tetto',type:'fill-extrusion',source:'omt','source-layer':'building',minzoom:15,paint:{'fill-extrusion-color':['match',['%',['to-number',['id'],0],6],0,'#c69ad8',1,'#9cc6e0',2,'#e0aa8c',3,'#9ce0c0',4,'#e8d890','#c0b0ec'],'fill-extrusion-height':['+',W3_H,.6],'fill-extrusion-base':W3_H,'fill-extrusion-opacity':1}},
  {id:'w3-mid',type:'line',source:'omt','source-layer':'transportation',minzoom:15,filter:['in',['get','class'],['literal',['motorway','trunk','primary','secondary','tertiary','minor']]],paint:{'line-color':'#e8d36a','line-width':[...R,15,.8,18,2.2],'line-dasharray':[3,3]}},
  {id:'w3-civici',type:'symbol',source:'omt','source-layer':'housenumber',minzoom:17.5,layout:{'text-field':['get','housenumber'],'text-font':['Noto Sans Regular'],'text-size':10},paint:{'text-color':'#f0ecf8','text-halo-color':'#1a1420','text-halo-width':1}},
  {id:'w3-posti-pt',type:'circle',source:'omt','source-layer':'poi',minzoom:15.5,filter:['has','name'],paint:{'circle-radius':4,'circle-color':['match',['get','class'],['shop','grocery','pharmacy','hospital','fuel'],'#ffe66d',['park','playground'],'#9be27a','#ff9fe8'],'circle-stroke-color':'#1a1420','circle-stroke-width':1.5}},
  {id:'w3-posti',type:'symbol',source:'omt','source-layer':'poi',minzoom:15.5,filter:['has','name'],layout:{'text-field':['get','name'],'text-font':['Noto Sans Bold'],'text-size':12,'text-anchor':'top','text-offset':[0,.4],'text-max-width':8},paint:{'text-color':['match',['get','class'],['shop','grocery','pharmacy','hospital','fuel'],'#ffe66d',['park','playground'],'#9be27a','#ff9fe8'],'text-halo-color':'#1a1420','text-halo-width':2}}];
  L.forEach(l=>{try{if(!m.getLayer(l.id))m.addLayer(l);}catch(e){}});}
function w3Apply(m,on){if(!m||!m.getLayer)return;try{if(!m.getLayer('bld3d'))return;
  if(on){w3Strati(m);g3Finestre(m,'bld3d');m.setPaintProperty('bld3d','fill-extrusion-height',W3_H);m.setPaintProperty('bld3d','fill-extrusion-opacity',1);
    try{m.setLight({anchor:'viewport',color:'#ffffff',intensity:.45,position:[1.3,200,35]});}catch(e){}}
  ['w3-tetto','w3-mid','w3-civici','w3-posti-pt','w3-posti'].forEach(id=>{if(m.getLayer(id))m.setLayoutProperty(id,'visibility',on?'visible':'none');});}catch(e){}}
function w3Btn(b){const lm=window.__mf;if(!lm||!lm.map)return;const m=lm.map;const on=b.classList.contains('on');w3Apply(m,on);
  if(!m._w3){m._w3=1;try{m.on('styledata',()=>{const t=document.querySelector('.lm-3d.on');if(t&&window.__mf&&window.__mf.map===m)setTimeout(()=>w3Apply(m,true),50);});}catch(e){}}}
// dopo il tocco sul tasto 3D (il gestore di p19 ha già cambiato lo stato)
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('.lm-3d');if(b)setTimeout(()=>w3Btn(b),30);},true); // in cattura: il tasto di p19 ferma la propagazione
</script>
