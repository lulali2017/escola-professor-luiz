/* Laranjinha: assistente local, sem custo e sem envio de dados a servidores. */
(()=>{
  if(window.__laranjinhaLoaded)return; window.__laranjinhaLoaded=true;
  const KEY='escola_laranjinha_memoria_v1';
  const POSITION_KEY='escola_laranjinha_posicao_v1';
  let memoria=[];
  /* Índice local dos ambientes da própria escola: não envia perguntas nem
     dados do aluno para fora do aplicativo. */
  const scriptUrl=document.currentScript?.src||location.href;
  const appRoot=new URL('./',scriptUrl);
  const localCopyStyle=document.createElement('style');
  localCopyStyle.textContent='.school-local-copy-offer .school-copy-choices{display:flex!important;flex-direction:row!important;justify-content:flex-start!important;align-items:stretch!important;gap:10px;margin:14px 0!important;padding:2px 2px 12px!important;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:thin;text-align:left;-webkit-overflow-scrolling:touch}.school-local-copy-offer .school-copy-choice{display:grid!important;grid-template-columns:18px 1fr!important;grid-template-rows:auto auto;align-items:start;gap:4px 8px;flex:0 0 150px!important;min-width:150px;min-height:126px;margin:0!important;padding:10px!important;border:1px solid #bdd4ca;border-radius:12px;background:#f2f8f4;color:#173f36!important;cursor:pointer;font-size:12px!important;line-height:1.18}.school-local-copy-offer .school-copy-choice input{grid-row:1/3;width:16px!important;height:16px!important;margin:3px 0!important;accent-color:#126050}.school-local-copy-offer .school-copy-choice span{min-width:0}.school-local-copy-offer .school-copy-choice b{display:block;margin:0!important;font-size:14px!important;line-height:1.15!important;word-break:normal}.school-local-copy-offer .school-copy-choice small{display:block;margin:4px 0 0!important;font-size:10px!important;line-height:1.2!important}.school-local-copy-offer .school-copy-choice em{grid-column:2;font-style:normal;font-weight:800;color:#8a5417;white-space:nowrap;font-size:10px}.school-copy-space{padding:10px 12px;border-radius:10px;background:#eef5f1;font-size:14px!important}.school-copy-progress{width:100%;height:12px;accent-color:#126050}.school-copy-status{min-height:20px;text-align:center!important;font-size:13px!important;color:#245d4f}@media(max-width:600px){.school-local-copy-offer section{max-height:calc(100vh - 24px);overflow:auto;padding:16px!important}.school-local-copy-offer .school-copy-choice{flex-basis:138px!important;min-width:138px;min-height:116px}.school-local-copy-offer .school-copy-choices{margin-left:-2px!important;margin-right:-2px!important}}';
  document.head.appendChild(localCopyStyle);
  const copyNoticeStyle=document.createElement('style');
  copyNoticeStyle.textContent='.school-copy-waiting{display:none;position:absolute;inset:0;z-index:5;place-items:center;padding:18px;background:#062b25d9;backdrop-filter:blur(4px);border-radius:22px}.school-copy-busy .school-copy-waiting{display:grid}.school-copy-waiting-box{width:min(330px,100%);padding:24px 20px;border:2px solid #f1bd40;border-radius:20px;background:#fffdf6;color:#16483e;text-align:center;box-shadow:0 16px 42px #0008}.school-copy-spinner{width:42px;height:42px;margin:0 auto 13px;border:5px solid #cce0d8;border-top-color:#da9b24;border-radius:50%;animation:schoolCopySpin .8s linear infinite}.school-copy-waiting strong{display:block;font-size:19px}.school-copy-waiting p{margin:8px 0!important;text-align:center!important}.school-copy-waiting progress{width:100%;height:12px;accent-color:#126050}.school-floating-notice{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:16px;background:#061e1b99;backdrop-filter:blur(4px)}.school-floating-notice section{width:min(420px,100%);padding:25px;border:3px solid #efb73d;border-radius:22px;background:#fffdf6;color:#153f37;box-shadow:0 18px 48px #0008;text-align:center;font:16px Arial,sans-serif}.school-floating-notice .notice-icon{font-size:42px}.school-floating-notice h2{margin:8px 0;color:#135344;font-size:22px}.school-floating-notice p{line-height:1.45}.school-floating-notice button{border:0;border-radius:12px;padding:11px 22px;background:#126050;color:#fff;font-weight:800;cursor:pointer}@keyframes schoolCopySpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(copyNoticeStyle);
  const schoolPages=['index.html','aulas_interativas/aprofundamento_teoria_pratica.html','primeira-nota/index.html','primeira-nota-compasso/index.html','treinador-dedilhado/index.html','repertorio-interativo/index.html'];
  let schoolIndex='';
  Promise.all(schoolPages.map(async path=>{
    try{
      const response=await fetch(new URL(path,appRoot),{cache:'force-cache'});
      if(!response.ok)return '';
      const html=await response.text();
      return new DOMParser().parseFromString(html,'text/html').body?.innerText||'';
    }catch(_){return ''}
  })).then(parts=>{schoolIndex=parts.join(' ').replace(/\s+/g,' ')});
  try{memoria=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){memoria=[]}
  const clean=value=>String(value||'').replace(/[<>]/g,'').trim();
  const save=()=>localStorage.setItem(KEY,JSON.stringify(memoria.slice(-120)));
  function corpus(){
    const parts=[document.body?.innerText||''];
    document.querySelectorAll('iframe').forEach(frame=>{try{parts.push(frame.contentDocument?.body?.innerText||'')}catch(_){}});
    return (parts.join(' ')+' '+schoolIndex).replace(/\s+/g,' ');
  }
  function findInSchool(question){
    const words=question.toLocaleLowerCase('pt-BR').split(/[^\p{L}\p{N}]+/u).filter(word=>word.length>2);
    if(!words.length)return '';
    let best='',bestScore=0;
    for(const sentence of corpus().split(/[.?!]\s+/)){
      const score=words.reduce((n,word)=>n+(sentence.toLocaleLowerCase('pt-BR').includes(word)?1:0),0);
      if(score>bestScore&&sentence.length>32&&sentence.length<600){best=sentence.trim();bestScore=score}
    }
    return best;
  }
  /* Cópia local do aluno: reúne o progresso e preferências deste navegador. */
  const BACKUP_READY='escola_professor_luiz_copia_local_v1';
  const BACKUP_DISMISSED='escola_professor_luiz_copia_local_nao_perguntar_v1';
  const DB_NAME='escola-professor-luiz-dados-locais';
  const OFFLINE_GROUPS={essencial:{nome:'Escola e aulas essenciais',mb:10,detalhe:'corredores, portas, aulas e funcionamento básico'},visuais:{nome:'Imagens e personagens',mb:58,detalhe:'fotos, ilustrações, avatares e ambientes'},partituras:{nome:'Biblioteca de partituras',mb:42,detalhe:'acervo de partituras e arquivos para tocar'},materiais:{nome:'Apostilas e materiais de consulta',mb:30,detalhe:'materiais didáticos disponíveis na escola'}};
  const mb=value=>Math.max(0,Math.round(value/104857.6)/10);
  async function storageInfo(){try{const data=await navigator.storage?.estimate?.();return data?.quota?{livre:Math.max(0,data.quota-(data.usage||0)),quota:data.quota,uso:data.usage||0}:null}catch(_){return null}}
  function showSchoolNotice(title,message,icon='✅'){
    const notice=document.createElement('div');notice.className='school-floating-notice';notice.innerHTML='<section role="dialog" aria-modal="true"><div class="notice-icon">'+icon+'</div><h2>'+title+'</h2><p>'+message+'</p><button type="button">Entendi</button></section>';
    const close=()=>notice.remove();notice.querySelector('button').onclick=close;notice.addEventListener('click',event=>{if(event.target===notice)close()});document.body.appendChild(notice);setTimeout(close,12000);
  }
  async function prepareOffline(groups=['essencial'],progress=()=>{}){if(!('serviceWorker'in navigator))return false;try{const registration=await navigator.serviceWorker.register(new URL('offline.js',appRoot));await navigator.serviceWorker.ready;const worker=registration.active||registration.waiting||registration.installing||navigator.serviceWorker.controller;if(!worker)return false;return await new Promise(resolve=>{const channel=new MessageChannel();const timeout=setTimeout(()=>resolve(false),300000);channel.port1.onmessage=event=>{const data=event.data||{};if(data.type==='OFFLINE_PROGRESS')progress(data);if(data.type==='OFFLINE_DONE'){clearTimeout(timeout);resolve(data.ok!==false)}};worker.postMessage({type:'CACHE_SELECTION',groups},[channel.port2])})}catch(_){return false}}
  function db(mode,value){return new Promise(resolve=>{try{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('config');req.onsuccess=()=>{const tx=req.result.transaction('config',mode==='put'?'readwrite':'readonly'),store=tx.objectStore('config');if(mode==='put'){store.put(value,'pasta');tx.oncomplete=()=>resolve(true)}else{const get=store.get('pasta');get.onsuccess=()=>resolve(get.result||null);get.onerror=()=>resolve(null)}};req.onerror=()=>resolve(null)}catch(_){resolve(null)}})}
  function studentData(){const data={escola:'Escola Professor Luiz',marcaDagua:'Cópia pessoal · Escola Professor Luiz',atualizadoEm:new Date().toISOString(),dados:{}};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key)data.dados[key]=localStorage.getItem(key)}return JSON.stringify(data,null,2)}
  function downloadCopy(){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([studentData()],{type:'application/json'}));link.download='Escola Professor Luiz - dados do aluno.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),3000)}
  async function writeCopy(root,groups=['essencial'],progress=()=>{}){try{const folder=await root.getDirectoryHandle('Escola Professor Luiz - dados do aluno',{create:true});const file=await folder.getFileHandle('meu-progresso-e-historico.json',{create:true});const writer=await file.createWritable();await writer.write(studentData());await writer.close();const info=await folder.getFileHandle('LEIA-ME - Escola Professor Luiz.txt',{create:true});const infoWriter=await info.createWritable();await infoWriter.write('ESCOLA PROFESSOR LUIZ\n\nEsta pasta guarda o progresso e o histórico pessoal deste aluno.\nA cópia offline selecionada foi preparada no navegador para abrir mais rápido e funcionar sem internet após o download inicial.\n\nQuando houver internet, a escola continua recebendo atualizações automaticamente.\nCópia pessoal identificada: Escola Professor Luiz.');await infoWriter.close();if(groups.length){const cached=await prepareOffline(groups,progress);if(!cached)throw new Error('offline')}localStorage.setItem(BACKUP_READY,'1');return true}catch(_){return false}}
  async function automaticCopy(){const root=await db('get');if(!root||!root.queryPermission)return false;try{if(await root.queryPermission({mode:'readwrite'})!=='granted')return false;return await writeCopy(root,[])}catch(_){return false}}
  /* Atualiza a cópia ao trocar de página e periodicamente enquanto a escola está aberta. */
  window.addEventListener('pagehide',()=>{automaticCopy()});
  setInterval(()=>{automaticCopy()},120000);
  function offerLocalCopy(){
    if(localStorage.getItem(BACKUP_READY)||localStorage.getItem(BACKUP_DISMISSED)||document.getElementById('schoolLocalCopyOffer')){automaticCopy();return}
    const modal=document.createElement('div');modal.id='schoolLocalCopyOffer';modal.className='school-local-copy-offer';
    modal.innerHTML='<section role="dialog" aria-modal="true" aria-label="Pasta local e modo offline"><span>💾</span><h2>Ativar pasta pessoal e estudo offline?</h2><p>Com sua autorização, a escola cria uma pasta pessoal no local que você escolher — por exemplo, <b>Documentos</b> ou <b>Arquivos</b>. Marque abaixo o que deseja deixar pronto no aparelho.</p><div class="school-copy-choices"></div><p class="school-copy-space" aria-live="polite">Verificando espaço disponível…</p><progress class="school-copy-progress" value="0" max="100" hidden></progress><p class="school-copy-status" aria-live="polite"></p><button class="school-copy-terms" type="button">Ler detalhes importantes</button><p class="school-copy-details" hidden><b>Como funciona:</b> a primeira cópia baixa os itens marcados. Depois, eles abrem mais rápido e podem funcionar sem internet. Quando houver conexão, a escola procura atualizações normalmente. A pasta guarda seu progresso; cada aluno mantém uma cópia separada.</p><div><button class="school-copy-yes">Ativar pasta e copiar itens marcados</button><button class="school-copy-later">Agora não</button></div><label><input type="checkbox" class="school-copy-never"> Não perguntar novamente</label><small>Se o aparelho não tiver espaço suficiente, a escola avisará antes de iniciar.</small></section>';
    document.body.appendChild(modal);
    const waiting=document.createElement('div');waiting.className='school-copy-waiting';waiting.innerHTML='<div class="school-copy-waiting-box"><div class="school-copy-spinner"></div><strong>Aguarde, a cópia está sendo preparada</strong><p class="school-copy-waiting-text">Escolha uma pasta para continuar.</p><progress value="0" max="100"></progress><p class="school-copy-waiting-percent">0%</p></div>';modal.appendChild(waiting);
    const localIntro=modal.querySelector('section>p');
    if(localIntro)localIntro.innerHTML='Com sua autorização, a escola cria uma pasta pessoal no local que você escolher — por exemplo, <b>Documentos</b>, <b>Arquivos</b> ou <b>cartão de memória</b>, quando ele aparecer nas opções do aparelho. Marque abaixo o que deseja deixar pronto.';
    const localDetails=modal.querySelector('.school-copy-details');
    if(localDetails)localDetails.innerHTML='<b>Como funciona:</b> a primeira cópia baixa os itens marcados. Depois, eles abrem mais rápido e podem funcionar sem internet. Quando houver conexão, a escola procura atualizações normalmente. A pasta guarda seu progresso; cada aluno mantém uma cópia separada. Em aparelhos com cartão de memória, selecione o cartão somente se o próprio sistema o mostrar como local disponível.';
    const choices=modal.querySelector('.school-copy-choices'),space=modal.querySelector('.school-copy-space'),status=modal.querySelector('.school-copy-status'),yesButton=modal.querySelector('.school-copy-yes');
    choices.innerHTML=Object.entries(OFFLINE_GROUPS).map(([key,item])=>'<label class="school-copy-choice"><input type="checkbox" value="'+key+'" '+(key==='essencial'?'checked':'')+'><span><b>'+item.nome+'</b><small>'+item.detalhe+'</small></span><em>~ '+item.mb.toLocaleString('pt-BR')+' MB</em></label>').join('');
    async function updateSpace(){const selected=[...choices.querySelectorAll('input:checked')].map(input=>input.value),needed=selected.reduce((sum,key)=>sum+OFFLINE_GROUPS[key].mb,0),info=await storageInfo();if(!selected.length){space.textContent='Escolha pelo menos um item para copiar.';yesButton.disabled=true;return}yesButton.disabled=false;if(!info){space.textContent='Itens selecionados: cerca de '+needed.toLocaleString('pt-BR')+' MB. O navegador não informou o espaço livre.';return}const free=mb(info.livre);if(needed>free){space.innerHTML='<b>Espaço insuficiente.</b> Itens marcados: cerca de '+needed.toLocaleString('pt-BR')+' MB · espaço livre informado: '+free.toLocaleString('pt-BR')+' MB.';yesButton.disabled=true}else space.textContent='Itens marcados: cerca de '+needed.toLocaleString('pt-BR')+' MB · espaço livre informado: '+free.toLocaleString('pt-BR')+' MB.'}
    choices.addEventListener('change',updateSpace);updateSpace();
    modal.querySelector('.school-copy-terms').onclick=()=>{const details=modal.querySelector('.school-copy-details');details.hidden=!details.hidden};
    modal.querySelector('.school-copy-later').onclick=()=>{if(modal.querySelector('.school-copy-never').checked)localStorage.setItem(BACKUP_DISMISSED,'1');modal.remove()};
    modal.querySelector('.school-copy-yes').onclick=async()=>{
      const groups=[...choices.querySelectorAll('input:checked')].map(input=>input.value);const info=await storageInfo(),needed=groups.reduce((sum,key)=>sum+OFFLINE_GROUPS[key].mb,0);if(info&&needed>mb(info.livre)){await updateSpace();return}const yes=modal.querySelector('.school-copy-yes');yes.disabled=true;yes.textContent='Escolha uma pasta para continuar...';modal.classList.add('school-copy-busy');waiting.querySelector('.school-copy-waiting-text').textContent='Abrindo os locais disponíveis no aparelho…';
      try{
        if(!window.showDirectoryPicker)throw new Error('sem pasta');
        const root=await window.showDirectoryPicker({mode:'readwrite'});
        status.textContent='Aguarde: preparando a cópia no aparelho…';modal.querySelector('.school-copy-progress').hidden=false;waiting.querySelector('.school-copy-waiting-text').textContent='Copiando os itens selecionados…';
        if(!await writeCopy(root,groups,data=>{const percent=data.total?Math.round(data.done/data.total*100):0;modal.querySelector('.school-copy-progress').value=percent;status.textContent='Copiando: '+percent+'% ('+data.done+' de '+data.total+' arquivos)…';waiting.querySelector('progress').value=percent;waiting.querySelector('.school-copy-waiting-percent').textContent=percent+'% · '+data.done+' de '+data.total+' arquivos'}))throw new Error('falhou');
        await db('put',root);modal.remove();
        showSchoolNotice('Cópia preparada','Sua pasta pessoal e os itens marcados já estão prontos para estudo offline.','🎉');
      }catch(error){modal.remove();if(error?.name==='AbortError'){showSchoolNotice('Pasta não escolhida','Nenhuma cópia foi feita. Você pode ativar esta opção novamente quando quiser.','ℹ️')}else{downloadCopy();showSchoolNotice('Cópia baixada','O navegador não liberou a criação direta da pasta. Salve o arquivo em Documentos, Arquivos ou no cartão de memória, se ele estiver disponível, em uma pasta chamada Escola Professor Luiz - dados do aluno.','💾')}}
    };
  }
  function mount(){
    if(document.getElementById('laranjinhaLauncher'))return;
    const launch=document.createElement('button'); launch.id='laranjinhaLauncher'; launch.className='laranjinha-launcher'; launch.title='Abrir Laranjinha, assistente de música'; launch.setAttribute('aria-label','Abrir Laranjinha'); launch.innerHTML='🐈';
    const panel=document.createElement('aside'); panel.id='laranjinhaPanel'; panel.className='laranjinha-panel'; panel.setAttribute('aria-label','Laranjinha, assistente de música');
    panel.innerHTML='<div class="laranjinha-head"><div class="laranjinha-cat">🐈</div><div><b>Laranjinha</b><small>Assistente de música de toda a escola</small></div><button class="laranjinha-close" title="Fazer Laranjinha sair">Sair ×</button></div><div class="laranjinha-log" aria-live="polite"></div><div class="laranjinha-actions"><button data-l="course">🔎 Procurar na escola</button><button data-l="web" class="secondary">🌐 Ampliar na internet</button><button data-l="folder" class="secondary">💾 Salvar no aparelho</button><button data-l="import" class="secondary">📂 Restaurar cópia</button></div><p class="laranjinha-tip">Escreva ou fale. Primeiro procuro em toda a Escola Professor Luiz; depois você pode ampliar na internet.</p><div class="laranjinha-compose"><input maxlength="360" placeholder="Pergunte sobre música..." aria-label="Pergunta ao Laranjinha"><button class="laranjinha-mic" title="Falar com Laranjinha" aria-label="Falar com Laranjinha">🎙</button><button class="laranjinha-send">Enviar</button></div>';
    document.body.append(launch,panel);
    if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('offline.js',appRoot)).catch(()=>{});
    offerLocalCopy();
    /* O botão pode ser arrastado para qualquer canto e a posição fica salva neste aparelho. */
    try{
      const saved=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');
      if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)){
        launch.style.left=saved.x+'px'; launch.style.top=saved.y+'px';
        launch.style.right='auto'; launch.style.bottom='auto';
      }
    }catch(_){}
    let dragging=null,justDragged=false;
    launch.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0)return;
      const box=launch.getBoundingClientRect();
      dragging={dx:event.clientX-box.left,dy:event.clientY-box.top,moved:false};
      launch.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    launch.addEventListener('pointermove',event=>{
      if(!dragging)return;
      const x=Math.max(4,Math.min(window.innerWidth-launch.offsetWidth-4,event.clientX-dragging.dx));
      const y=Math.max(4,Math.min(window.innerHeight-launch.offsetHeight-4,event.clientY-dragging.dy));
      const old=launch.getBoundingClientRect();
      if(Math.abs(x-old.left)>3||Math.abs(y-old.top)>3)dragging.moved=true;
      launch.style.left=x+'px'; launch.style.top=y+'px';
      launch.style.right='auto'; launch.style.bottom='auto';
    });
    const finishDrag=event=>{
      if(!dragging)return;
      justDragged=dragging.moved;
      const box=launch.getBoundingClientRect();
      localStorage.setItem(POSITION_KEY,JSON.stringify({x:Math.round(box.left),y:Math.round(box.top)}));
      dragging=null;
      launch.releasePointerCapture?.(event.pointerId);
    };
    launch.addEventListener('pointerup',finishDrag);
    launch.addEventListener('pointercancel',finishDrag);
    launch.addEventListener('click',event=>{
      if(!justDragged)return;
      justDragged=false; event.preventDefault(); event.stopImmediatePropagation();
    },true);
    const log=panel.querySelector('.laranjinha-log'), input=panel.querySelector('input');
    function say(text,who='bot',voice=false){const bubble=document.createElement('div');bubble.className='laranjinha-msg '+who;bubble.textContent=text;log.appendChild(bubble);log.scrollTop=log.scrollHeight;if(voice&&'speechSynthesis'in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='pt-BR';utterance.rate=1.05;utterance.pitch=1.15;speechSynthesis.speak(utterance)}}
    function answer(value){const question=clean(value);if(!question)return;say(question,'user');const hit=findInSchool(question);const reply=hit?'Encontrei esta informação na Escola Professor Luiz:\n\n'+hit+'\n\nPosso explicar com palavras mais simples ou você pode ampliar na internet.':'Ainda não encontrei uma resposta clara no material da escola. Use “Ampliar na internet” para pesquisar outras fontes ou guarde esta dúvida para estudar depois.';memoria.push({pergunta:question,resposta:reply,data:new Date().toISOString(),pagina:document.title});save();say(reply,'bot',true)}
    async function backup(){const data=JSON.stringify({nome:'Conhecimentos do Laranjinha',criadoEm:new Date().toISOString(),conhecimentos:memoria},null,2);try{if(!window.showDirectoryPicker)throw new Error('sem pasta');const root=await window.showDirectoryPicker({mode:'readwrite'});const folder=await root.getDirectoryHandle('Conhecimentos do Laranjinha',{create:true});const file=await folder.getFileHandle('conhecimentos-laranjinha.json',{create:true});const write=await file.createWritable();await write.write(data);await write.close();say('Pronto! Criei a pasta “Conhecimentos do Laranjinha” no local escolhido e salvei sua cópia.','bot',true)}catch(_){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));link.download='Conhecimentos do Laranjinha - copia.json';link.click();URL.revokeObjectURL(link.href);say('Este navegador não permite criar uma pasta diretamente. Baixei a cópia: salve-a em Documentos ou Arquivos, numa pasta chamada “Conhecimentos do Laranjinha”.','bot',true)}}
    function restore(){const file=document.createElement('input');file.type='file';file.accept='application/json';file.onchange=async()=>{try{const raw=JSON.parse(await file.files[0].text());memoria=Array.isArray(raw.conhecimentos)?raw.conhecimentos:[];save();say('Cópia restaurada. Encontrei '+memoria.length+' conhecimento(s) guardado(s).','bot',true)}catch(_){say('Não consegui ler esta cópia. Escolha um arquivo de conhecimentos do Laranjinha.','bot',true)}};file.click()}
    function web(){const question=input.value.trim()||'violão música teoria musical';say('Vou abrir uma pesquisa externa. Confira as fontes: páginas externas podem mudar e não pertencem à escola.','bot');window.open('https://www.google.com/search?q='+encodeURIComponent(question),'_blank','noopener,noreferrer')}
    function speech(){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){say('Seu navegador não oferece fala por aqui. Escreva a pergunta que eu respondo.','bot',true);return}const recognizer=new Recognition();recognizer.lang='pt-BR';recognizer.interimResults=false;recognizer.maxAlternatives=1;recognizer.onresult=event=>{input.value=event.results[0][0].transcript;answer(input.value);input.value=''};recognizer.onerror=()=>say('Não consegui ouvir agora. Tente novamente ou escreva sua pergunta.','bot');recognizer.start()}
    launch.onclick=()=>{panel.classList.add('open');launch.setAttribute('aria-expanded','true');if(!log.children.length)say('Olá! Eu sou o Laranjinha. Procuro primeiro em toda a Escola Professor Luiz. Posso ajudar com violão, partitura, cifras, tablatura, ritmo e teoria.','bot',true)};
    panel.querySelector('.laranjinha-close').onclick=()=>{panel.classList.remove('open');launch.setAttribute('aria-expanded','false');if('speechSynthesis'in window)speechSynthesis.cancel()};
    panel.querySelector('.laranjinha-send').onclick=()=>{answer(input.value);input.value=''}; input.onkeydown=event=>{if(event.key==='Enter'){answer(input.value);input.value=''}};
    panel.querySelector('.laranjinha-mic').onclick=speech; panel.querySelector('[data-l="course"]').onclick=()=>{if(input.value.trim())answer(input.value);else say('Escreva uma pergunta, por exemplo: “o que é uma pestana?”','bot')}; panel.querySelector('[data-l="web"]').onclick=web; panel.querySelector('[data-l="folder"]').onclick=backup; panel.querySelector('[data-l="import"]').onclick=restore;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
