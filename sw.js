// ZombieSafeHouse · service worker
// - la pagina arriva sempre dalla rete (versione nuova appena pubblicata)
// - senza rete apre la copia salvata
// - il numero di versione cambia a ogni build: l'app installata si aggiorna da sola
const C='zsh-202610260902';const BASE=['/','/index.html','/manifest.json','/icon-192.png','/icon-512.png','/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(BASE.map(u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null)))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==location.origin)return; // Supabase, mappe e font vanno sempre in rete
  if(u.pathname.endsWith('/sw.js'))return;
  const nav=r.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('.html');
  e.respondWith((nav?fetch(u.href,{cache:'no-store',credentials:'same-origin'}):fetch(r)).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(nav?'/index.html':r,cp));}return res;})
    .catch(()=>caches.match(nav?'/index.html':r).then(m=>m||caches.match('/index.html'))));});
