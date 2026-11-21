(()=>{
let system=[];
const $=s=>document.querySelector(s);
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function filtered(){
  const q=norm($('#libSearch').value),field=$('#libSort').value,category=$('#libCategory').value;
  return system.filter(x=>(!category||x.category===category)&&(!q||norm(x.title).includes(q)||norm(x.author).includes(q))).sort((a,b)=>(field==='author'?a.author:a.title).localeCompare(field==='author'?b.author:b.title,'pt-BR'));
}
function categoryName(value){return ({classica:'Clássica',popular:'Popular',estudo:'Estudo',exercicio:'Exercício'})[value]||'Sem categoria'}
function render(){
  const items=filtered(),query=$('#libSearch').value.trim(),host=$('#libList');
  $('#libResult').textContent=items.length?`${items.length} partitura(s) ${query?'encontrada(s) para “'+query+'”':'disponível(is) no índice'}. Escolha Ver PDF, Tocar ou Pesquisar áudio/vídeo.`:`Nenhuma partitura encontrada${query?' para “'+query+'”':''}.`;
  host.innerHTML=items.length?items.map(x=>{
    const format=(x.format||'mxl').toUpperCase();
    const searchTerms=`${x.title} ${x.author&&x.author!=='Autor desconhecido'?x.author:''} áudio vídeo música`.trim();
    const searchUrl=`https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
    return `<article class="lib-item system"><div class="lib-title-button"><span class="lib-music-icon">🎼</span><span><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.author||'Autor desconhecido')} · ${escapeHtml(categoryName(x.category))} · PDF + ${format}</small></span><span class="lib-actions"><a href="${escapeHtml(x.pdfUrl)}" target="_blank" rel="noopener">Ver PDF</a><button data-open="${escapeHtml(x.id)}">▶ Tocar</button><a class="web-search" href="${escapeHtml(searchUrl)}" target="_blank" rel="noopener noreferrer" title="Pesquisar áudio ou vídeo desta música na internet">🔎 Áudio/vídeo</a></span></div></article>`;
  }).join(''):'<div class="lib-empty">O índice está vazio neste filtro.</div>';
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openItem(system.find(x=>x.id===b.dataset.open)));
}
async function dataOf(x){
  const r=await fetch(x.playUrl||x.url);if(!r.ok)throw Error('Não foi possível abrir esta partitura.');
  return (x.format||'').toLowerCase()==='mxl'?r.arrayBuffer():r.text();
}
async function openItem(x){
  if(!x)return;
  try{
    const data=await dataOf(x),dt=new DataTransfer(),ext=(x.format||'musicxml').toLowerCase();
    dt.items.add(new File([data],`${x.title} - ${x.author||'Autor desconhecido'}.${ext}`,{type:ext==='mxl'?'application/vnd.recordare.musicxml':'application/vnd.recordare.musicxml+xml'}));
    $('#files').files=dt.files;$('#files').dispatchEvent(new Event('change',{bubbles:true}));$('#reader').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){alert(error.message)}
}
async function init(){
  try{const r=await fetch('../repertorio-publico/index.json',{cache:'no-store'}),j=await r.json();system=j.items||[]}catch(error){system=[]}
  render();
  const show=()=>{render();$('#libResult').scrollIntoView({behavior:'smooth',block:'center'})};
  $('#libSearch').onkeydown=e=>{if(e.key==='Enter')show()};$('#libSearchButton').onclick=show;$('#libListAll').onclick=()=>{$('#libSearch').value='';show()};$('#libSort').onchange=render;$('#libCategory').onchange=render;$('#backToIndex').onclick=()=>document.querySelector('.lib').scrollIntoView({behavior:'smooth',block:'start'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
