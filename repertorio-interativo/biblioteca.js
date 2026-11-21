(()=>{
let system=[];
const $=s=>document.querySelector(s);
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filename=x=>`${x.title.trim()} - ${(x.author||'Autor desconhecido').trim()}.musicxml`.replace(/[\\/:*?"<>|]/g,'-');

function filtered(){
  const q=norm($('#libSearch').value),field=$('#libSort').value;
  return system.filter(x=>!q||norm(x.title).includes(q)||norm(x.author).includes(q)).sort((a,b)=>(field==='author'?a.author:a.title).localeCompare(field==='author'?b.author:b.title,'pt-BR'));
}

function render(){
  const items=filtered(),query=$('#libSearch').value.trim(),host=$('#libList');
  $('#libResult').textContent=items.length
    ? `${items.length} partitura(s) ${query?'encontrada(s) para “'+query+'”':'disponível(is) no índice'}. Clique no nome da música para abrir.`
    : `Nenhuma partitura encontrada${query?' para “'+query+'”':''}.`;
  host.innerHTML=items.length?items.map(x=>{
    const format=(x.format||'musicxml').toUpperCase();
    return `<article class="lib-item system">
      <button class="lib-title-button" data-open="${escapeHtml(x.id)}">
        <span class="lib-music-icon">🎼</span><span><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.author||'Autor desconhecido')} · ${format}</small></span><i>ABRIR →</i>
      </button>
    </article>`;
  }).join(''):'<div class="lib-empty">O índice está vazio neste filtro.</div>';
  host.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openItem(system.find(x=>x.id===b.dataset.open)));
}

async function textOf(x){const r=await fetch(x.url);if(!r.ok)throw Error('Não foi possível abrir esta partitura.');return r.text()}
async function openItem(x){
  if(!x)return;
  if((x.format||'').toLowerCase()==='pdf'){location.href=x.url;return}
  try{
    const text=await textOf(x),dt=new DataTransfer();
    dt.items.add(new File([text],filename(x),{type:'application/vnd.recordare.musicxml+xml'}));
    $('#files').files=dt.files;
    $('#files').dispatchEvent(new Event('change',{bubbles:true}));
    $('#reader').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){alert(e.message)}
}

async function init(){
  try{const r=await fetch('../repertorio-drive/index.json',{cache:'no-store'}),j=await r.json();system=j.items||[]}catch(e){system=[]}
  render();
  const show=()=>{render();$('#libResult').scrollIntoView({behavior:'smooth',block:'center'})};
  $('#libSearch').onkeydown=e=>{if(e.key==='Enter')show()};
  $('#libSearchButton').onclick=show;
  $('#libListAll').onclick=()=>{$('#libSearch').value='';show()};
  $('#libSort').onchange=render;
  $('#backToIndex').onclick=()=>document.querySelector('.lib').scrollIntoView({behavior:'smooth',block:'start'});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
