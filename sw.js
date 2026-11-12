const CACHE='do-sal-ma-v2';
const ASSETS=['./','./index.html','./styles.css','./cards.js','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/favicon.svg'];
self.addEventListener('install', e=>{e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('do-sal-ma-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}return res}).catch(()=>caches.match(e.request).then(res=>res||(e.request.mode==='navigate'?caches.match('./index.html'):undefined))));
});
