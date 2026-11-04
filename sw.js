/* Service worker: guarda o app no aparelho para abrir sem internet.
   Ao publicar uma versão nova, aumente o número em VERSAO. */
const VERSAO="meta-do-dia-v6";
const ARQUIVOS=["./","./index.html","./styles.css","./app.js","./premium.js","./manifest.webmanifest","./privacidade.html",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
  // Rede primeiro (pega atualizações), cache se estiver sem internet.
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(VERSAO).then(c=>c.put(e.request,cp))}return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("./index.html"))));
});
