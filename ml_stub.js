(function(){const ev=()=>{const h={};return{on(k,a,b){const f=b||a;(h[k]=h[k]||[]).push(f);return this;},once(k,f){const w=(...x)=>{h[k]=h[k].filter(y=>y!==w);f(...x)};(h[k]=h[k]||[]).push(w);return this;},fire(k,x){(h[k]||[]).slice().forEach(f=>f(x||{}));}};};
window.__ml={markers:0,calls:[]};
class Map{constructor(o){Object.assign(this,ev());this.o=o;this.src={};this.lay={};this.z=o.zoom;this.c=o.center;this.touchZoomRotate={disableRotation(){}};this.loaded=false;setTimeout(()=>{this.loaded=true;this.fire('load');this.fire('styledata');setTimeout(()=>this.fire('idle'),50);},30);}
 addControl(){} isStyleLoaded(){return this.loaded} addSource(id,s){if(this.src[id])throw new Error('source exists '+id);this.src[id]={...s,setData(d){this.data=d}};} getSource(id){return this.src[id]}
 addLayer(l){if(this.lay[l.id])throw new Error('layer exists '+l.id);this.lay[l.id]=l;} getLayer(id){return this.lay[id]} setLayoutProperty(id,k,v){__ml.calls.push(['vis',id,v]);}
 project(ll){return{x:200+(ll[0]-this.c[0])*1e5,y:200-(ll[1]-this.c[1])*1e5}} unproject(p){return{lng:this.c[0],lat:this.c[1]}}
 queryRenderedFeatures(){return[{properties:{render_height:9},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}]} querySourceFeatures(){return[]}
 setTerrain(t){__ml.calls.push(['terrain',!!t])} easeTo(o){__ml.calls.push(['ease',o.pitch])} getZoom(){return this.z} resize(){} getBounds(){return{getNorth:()=>1,getSouth:()=>0,getEast:()=>1,getWest:()=>0}}
 jumpTo(o){if(o.zoom)this.z=o.zoom;if(o.center)this.c=o.center;} getContainer(){return typeof this.o.container==='string'?document.getElementById(this.o.container):this.o.container} setStyle(s){this.src={};this.lay={};setTimeout(()=>this.fire('styledata'),10);}}
class Marker{constructor(o){Object.assign(this,ev());this.el=o.element;__ml.markers++;} setLngLat(l){this.ll=l;return this} addTo(){document.body.appendChild(this.el);return this} getElement(){return this.el} remove(){this.el.remove()} getLngLat(){return{lng:this.ll[0],lat:this.ll[1]}}}
window.maplibregl={Map,Marker,NavigationControl:class{},AttributionControl:class{}};})();
