/* Acervo offline da Escola Professor Luiz.
   Quando houver internet, busca a versão nova; sem internet, usa a cópia já guardada. */
const CACHE='escola-professor-luiz-offline-v1';
const CORE=[
  './','./index.html','./ui-preferences.js','./laranjinha.js','./laranjinha.css',
  './primeira-nota/','./primeira-nota/index.html',
  './primeira-nota-compasso/','./primeira-nota-compasso/index.html',
  './treinador-dedilhado/','./treinador-dedilhado/index.html',
  './repertorio-interativo/','./repertorio-interativo/index.html'
];
async function saveCore(){const cache=await caches.open(CACHE);await Promise.all(CORE.map(async url=>{try{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response.clone())}catch(_){}}))}
self.addEventListener('install',event=>event.waitUntil(saveCore().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('escola-professor-luiz-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='CACHE_CORE')event.waitUntil(saveCore())});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(response&&response.ok)cache.put(request,response.clone());
      return response;
    }catch(_){
      const saved=await cache.match(request,{ignoreSearch:true});
      if(saved)return saved;
      if(request.mode==='navigate')return (await cache.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});
