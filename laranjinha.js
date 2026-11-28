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
  function mount(){
    if(document.getElementById('laranjinhaLauncher'))return;
    const launch=document.createElement('button'); launch.id='laranjinhaLauncher'; launch.className='laranjinha-launcher'; launch.title='Abrir Laranjinha, assistente de música'; launch.setAttribute('aria-label','Abrir Laranjinha'); launch.innerHTML='🐈';
    const panel=document.createElement('aside'); panel.id='laranjinhaPanel'; panel.className='laranjinha-panel'; panel.setAttribute('aria-label','Laranjinha, assistente de música');
    panel.innerHTML='<div class="laranjinha-head"><div class="laranjinha-cat">🐈</div><div><b>Laranjinha</b><small>Assistente de música de toda a escola</small></div><button class="laranjinha-close" title="Fazer Laranjinha sair">Sair ×</button></div><div class="laranjinha-log" aria-live="polite"></div><div class="laranjinha-actions"><button data-l="course">🔎 Procurar na escola</button><button data-l="web" class="secondary">🌐 Ampliar na internet</button><button data-l="folder" class="secondary">💾 Salvar no aparelho</button><button data-l="import" class="secondary">📂 Restaurar cópia</button></div><p class="laranjinha-tip">Escreva ou fale. Primeiro procuro em toda a Escola Professor Luiz; depois você pode ampliar na internet.</p><div class="laranjinha-compose"><input maxlength="360" placeholder="Pergunte sobre música..." aria-label="Pergunta ao Laranjinha"><button class="laranjinha-mic" title="Falar com Laranjinha" aria-label="Falar com Laranjinha">🎙</button><button class="laranjinha-send">Enviar</button></div>';
    document.body.append(launch,panel);
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
