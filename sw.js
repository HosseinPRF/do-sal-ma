const CACHE = 'do-sal-ma-v1';
const ASSETS = ['./','./index.html','./styles.css','./cards.js','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/favicon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if(event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if(response.ok) {const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request).then(found=>found||caches.match('./index.html'))));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});
