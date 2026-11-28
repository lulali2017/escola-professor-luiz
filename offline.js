/* Cópia offline da Escola Professor Luiz.
   Só baixa conteúdos escolhidos pelo aluno na janela de autorização. */
const CACHE='escola-professor-luiz-offline-v2';
const CORE=[
  './','./index.html','./ui-preferences.js','./laranjinha.js','./laranjinha.css',
  './campus-predios.js','./campus-predios.css','./partitura-predio.js','./partitura-predio.css',
  './partitura-andares.js','./partitura-andares.css','./progresso-predios.js','./progresso-predios.css',
  './escola-integracoes.js','./escola-acessibilidade.css','./acessorios-palhetas.js','./acessorios-palhetas.css',
  './primeira-nota/','./primeira-nota/index.html','./primeira-nota-compasso/','./primeira-nota-compasso/index.html',
  './treinador-dedilhado/','./treinador-dedilhado/index.html','./repertorio-interativo/','./repertorio-interativo/index.html'
];
const TEXT_SOURCES=[...CORE.filter(url=>/\.(?:html|js|css)$/.test(url)),'./index.html'];
const visualPattern=/(?:src|href|url\()\s*["']?([^"'()\s]+\.(?:png|jpe?g|gif|webp|svg|mp4)(?:\?[^"'()\s]*)?)/gi;
const materialPattern=/(?:src|href|url\()\s*["']?([^"'()\s]+\.(?:pdf|musicxml|mxl)(?:\?[^"'()\s]*)?)/gi;
function report(port,data){try{port?.postMessage(data)}catch(_){}}
function localUrl(value,base=location.href){try{const url=new URL(value,base);return url.origin===location.origin?url.href:null}catch(_){return null}}
async function discover(pattern){
  const found=new Set();
  for(const source of TEXT_SOURCES){
    try{
      const response=await fetch(source,{cache:'no-store'}); if(!response.ok)continue;
      const text=await response.text(); pattern.lastIndex=0;
      let match; while((match=pattern.exec(text))){const url=localUrl(match[1],new URL(source,location.href));if(url)found.add(url)}
    }catch(_){}
  }
  return [...found];
}
async function scoreFiles(){
  const files=[];
  for(const source of ['./repertorio-publico/index.json','./repertorio-drive/index.json']){
    try{
      const response=await fetch(source,{cache:'no-store'});if(!response.ok)continue;
      const data=await response.json();
      for(const item of data.items||[]){
        for(const key of ['pdfUrl','playUrl','url','xmlUrl']){const url=localUrl(item[key],new URL(source,location.href));if(url)files.push(url)}
      }
      files.push(localUrl(source));
    }catch(_){}
  }
  return files.filter(Boolean);
}
async function selectedFiles(groups){
  const files=new Set();
  if(groups.includes('essencial'))CORE.forEach(file=>files.add(localUrl(file)));
  if(groups.includes('visuais'))(await discover(visualPattern)).forEach(file=>files.add(file));
  if(groups.includes('materiais'))(await discover(materialPattern)).forEach(file=>files.add(file));
  if(groups.includes('partituras'))(await scoreFiles()).forEach(file=>files.add(file));
  return [...files].filter(Boolean);
}
async function cacheFiles(files,port){
  const cache=await caches.open(CACHE); let done=0; let failed=0;
  report(port,{type:'OFFLINE_PROGRESS',phase:'prepare',done,total:files.length});
  for(const file of files){
    try{const response=await fetch(file,{cache:'reload'});if(response.ok)await cache.put(file,response.clone());else failed++}catch(_){failed++}
    done++; report(port,{type:'OFFLINE_PROGRESS',phase:'copy',done,total:files.length,failed});
  }
  return {done,failed};
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('escola-professor-luiz-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
  const data=event.data||{}; const port=event.ports?.[0];
  if(data.type==='CACHE_SELECTION')event.waitUntil((async()=>{
    try{const files=await selectedFiles(Array.isArray(data.groups)?data.groups:[]);const result=await cacheFiles(files,port);report(port,{type:'OFFLINE_DONE',ok:true,...result})}
    catch(_){report(port,{type:'OFFLINE_DONE',ok:false})}
  })());
  if(data.type==='CACHE_CORE')event.waitUntil(cacheFiles(CORE));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const response=await fetch(request);if(response?.ok)cache.put(request,response.clone());return response}
    catch(_){const saved=await cache.match(request,{ignoreSearch:true});if(saved)return saved;if(request.mode==='navigate')return (await cache.match('./index.html'))||Response.error();return Response.error()}
  })());
});
