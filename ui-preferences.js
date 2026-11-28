/* Carrega o assistente local em todas as salas do aplicativo principal. */
(()=>{const css=document.createElement('link');css.rel='stylesheet';css.href='laranjinha.css?v=5';document.head.appendChild(css);const script=document.createElement('script');script.src='laranjinha.js?v=5';document.head.appendChild(script)})();
(()=>{
 const active=()=>{
  const routeId=decodeURIComponent(location.hash.slice(1));
  const routed=document.getElementById(routeId);
  if(routed?.classList.contains('school28-page'))return routed;
  const pages=[...document.querySelectorAll('#campusV273 .school28-page.active')];
  return pages.filter(page=>getComputedStyle(page).display!=='none').at(-1)||pages.at(-1);
 };
 const key=()=>`schoolZoom:${active()?.id||'global'}`;
 const isDark=()=>document.documentElement.classList.contains('school-dark');
 const bridgeCss=`
 html{color-scheme:light}html.school-iframe-dark{color-scheme:dark;background:#071513!important}
 html.school-iframe-dark body{background:#0a211e!important;color:#f4f7f2!important}
 html.school-iframe-dark body :where(p,li,dd,dt,small,label,span,strong,b,em,h1,h2,h3,h4,h5,h6){color:inherit}
 html.school-iframe-dark :where(main,section,article,.page,.sheet,.lesson,.content,.oficina,.workshop){border-color:#55756d!important}
 html.school-iframe-dark :where(.card,.box,.panel,.step,.passo,.etapa,.exemplo,.exercise,.atividade,blockquote,aside,table,td,th){background:#14352f!important;color:#f4f7f2!important;border-color:#66857d!important}
 html.school-iframe-dark :where(input,select,textarea,button){background:#0d2b27!important;color:#fff!important;border-color:#78958e!important}
 html.school-iframe-dark a{color:#ffd36a!important}
 html.school-iframe-dark :where(h1,h2,h3,h4,.title,.titulo){color:#ffd36a!important}
 .school-guide-choice{position:fixed;right:10px;bottom:10px;z-index:2147483000;display:flex;align-items:center;gap:6px;padding:6px 8px;border:2px solid #efb632;border-radius:12px;background:#103c35f2;color:#fff!important;font:800 12px Arial;box-shadow:0 6px 18px #0005}
 .school-guide-choice select{min-width:122px;padding:5px;border-radius:8px;background:#fff7dc!important;color:#123d36!important;font-weight:800}`;
 function installGuideChoice(doc){
  const top=[...doc.querySelectorAll('.guia.topo,.guia-flutuante.cima,.personagem')];
  const bottom=[...doc.querySelectorAll('.guia.baixo,.guia-flutuante.baixo')];
  if(!top.length&&!bottom.length)return;
  let box=doc.getElementById('school-guide-choice');
  if(!box){
   box=doc.createElement('label');box.id='school-guide-choice';box.className='school-guide-choice';
   box.innerHTML='Personagens <select aria-label="Personagens móveis"><option value="both">Os dois</option><option value="top">Só em cima</option><option value="bottom">Só embaixo</option><option value="none">Nenhum</option></select>';
   doc.body.appendChild(box);
   box.querySelector('select').addEventListener('change',e=>{localStorage.setItem('schoolMovingGuides',e.target.value);installGuideChoice(doc)});
  }
  const mode=localStorage.getItem('schoolMovingGuides')||'both';box.querySelector('select').value=mode;
  top.forEach(el=>el.hidden=!(mode==='both'||mode==='top'));
  bottom.forEach(el=>el.hidden=!(mode==='both'||mode==='bottom'));
 }
 function bridgeFrame(frame,z){
  try{
   const doc=frame.contentDocument;if(!doc?.documentElement)return;
   let style=doc.getElementById('school-ui-bridge-style');
   if(!style){style=doc.createElement('style');style.id='school-ui-bridge-style';style.textContent=bridgeCss;(doc.head||doc.documentElement).appendChild(style)}
   doc.documentElement.classList.toggle('school-iframe-dark',isDark());
   doc.documentElement.style.zoom=String(z);
   doc.documentElement.style.setProperty('--school-page-zoom',String(z));
   installGuideChoice(doc);
  }catch(_){/* O visualizador de PDF controla suas próprias preferências. */}
 }
 function bridgeAll(z){
  document.querySelectorAll('#campusV273 iframe').forEach(frame=>{
   if(!frame.dataset.schoolUiBridge){frame.dataset.schoolUiBridge='1';frame.addEventListener('load',()=>bridgeFrame(frame,Number(localStorage.getItem(key())||1)))}
   bridgeFrame(frame,z);
  });
 }
 function apply(){
  const z=Number(localStorage.getItem(key())||1);
  document.documentElement.style.setProperty('--school-page-zoom',z.toFixed(2));
  document.body.classList.toggle('trainer-page-active',active()?.id==='school28-finger-trainer');
  const o=document.querySelector('.school-ui-tools output');if(o)o.value=Math.round(z*100)+'%';
  bridgeAll(z);
 }
 function install(){
  if(document.querySelector('.school-ui-tools'))return;
  const b=document.createElement('div');b.className='school-ui-tools';
  b.innerHTML='<button data-u="theme" title="Modo claro ou escuro">☾</button><button data-u="minus" title="Diminuir zoom">A−</button><output>100%</output><button data-u="plus" title="Aumentar zoom">A+</button><button data-u="reset" title="Restaurar zoom">100</button>';
  document.body.appendChild(b);
  b.onclick=e=>{
   const a=e.target.closest('button')?.dataset.u;if(!a)return;
   if(a==='theme'){document.documentElement.classList.toggle('school-dark');localStorage.setItem('schoolDark',isDark()?'1':'0');apply();return}
   let z=Number(localStorage.getItem(key())||1);
   if(a==='minus')z=Math.max(.7,z-.1);if(a==='plus')z=Math.min(1.5,z+.1);if(a==='reset')z=1;
   localStorage.setItem(key(),z.toFixed(2));apply();
  };
  if(localStorage.getItem('schoolDark')==='1')document.documentElement.classList.add('school-dark');
  document.addEventListener('click',()=>setTimeout(apply,0),true);
  addEventListener('hashchange',()=>setTimeout(apply,0));
  new MutationObserver(()=>setTimeout(apply,0)).observe(document.getElementById('campusV273')||document.body,{childList:true,subtree:true});
  apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
