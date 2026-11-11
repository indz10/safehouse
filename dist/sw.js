// ZombieSafeHouse · service worker
// - la pagina arriva dalla rete (versione nuova appena pubblicata); se la rete tarda più di 3 s, la copia salvata
// - senza rete apre la copia salvata
// - il numero di versione cambia a ogni build: l'app installata si aggiorna da sola
const C='zsh-202611110118';const BASE=['/','/index.html','/manifest.json','/icon-192.png','/icon-512.png','/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(BASE.map(u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null)))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==location.origin)return; // Supabase, mappe e font vanno sempre in rete
  if(u.pathname.endsWith('/sw.js'))return;
  const nav=r.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('.html');
  const net=(nav?fetch(u.href,{cache:'no-store',credentials:'same-origin'}):fetch(r)).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(nav?'/index.html':r,cp));}return res;});
  const salvata=()=>caches.match(nav?'/index.html':r).then(m=>m||caches.match('/index.html'));
  if(!nav){e.respondWith(net.catch(salvata));return;}
  // Fase 7c: la pagina arriva dalla rete, ma se la rete tarda più di 3 s si apre la copia salvata
  // (intanto la versione nuova si salva; l'app poi si aggiorna da sola con "Aggiorno l'app…")
  e.respondWith(new Promise(ok=>{let fatto=false;const dai=x=>{if(!fatto&&x){fatto=true;ok(x);}};
    net.then(res=>res.ok?dai(res):salvata().then(m=>dai(m||res))).catch(()=>salvata().then(m=>dai(m||Response.error())));/* sito in errore o senza rete: copia salvata */
    setTimeout(()=>salvata().then(m=>dai(m)),3000);}));});

// notifiche push: orda in arrivo, orda in corso, novità personali
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{};}catch(x){d={title:'ZombieSafeHouse',body:e.data?e.data.text():''};}
  e.waitUntil(self.registration.showNotification(d.title||'ZombieSafeHouse',{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',data:{url:d.url||'/'},tag:d.tag||undefined}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{for(const c of L){if('focus' in c){c.postMessage({zgo:url});return c.focus();}}return self.clients.openWindow(url);}));});
