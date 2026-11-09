/* Service worker: guarda o app no aparelho para abrir sem internet.
   Ao publicar uma versão nova, aumente o número em VERSAO. */
const VERSAO="minha-diaria-v13";
const ARQUIVOS=["./","./index.html","./styles.css",
  "./js/base.js","./js/interface.js","./js/lancamento.js","./js/inicio.js","./js/dias.js","./js/contas.js","./js/rotina.js","./js/ajustes.js","./js/configuracao.js","./js/premium-tela.js","./js/pesquisa.js","./js/lembretes.js","./js/conquistas.js","./js/analise.js","./js/feriados.js","./js/dev.js","./js/nuvem-config.js","./js/nuvem.js","./js/inicia.js","./premium.js","./manifest.webmanifest","./privacidade.html",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
  // Rede primeiro (pega atualizações), cache se estiver sem internet.
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(VERSAO).then(c=>c.put(e.request,cp))}return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("./index.html"))));
});
// Lembrete diário: o servidor manda um "toque" (sem conteúdo) no horário escolhido e o app mostra a notificação.
self.addEventListener("push",e=>{e.waitUntil(self.registration.showNotification("Quanto você fez hoje?",{
  body:"Lance o dia em 10 segundos e veja se bateu a meta.",icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag:"lembrete-diario",renotify:true}))});
self.addEventListener("notificationclick",e=>{e.notification.close();
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    const c=cs.find(x=>new URL(x.url).origin===location.origin);
    if(c){c.navigate("./?lancar=1").catch(()=>{});return c.focus()}
    return clients.openWindow("./?lancar=1")}))});
