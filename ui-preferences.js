(()=>{
 const active=()=>{
  const routeId=decodeURIComponent(location.hash.slice(1));
  const routed=document.getElementById(routeId);
  if(routed?.classList.contains('school28-page'))return routed;
  const pages=[...document.querySelectorAll('#campusV273 .school28-page.active')];
  return pages.filter(page=>getComputedStyle(page).display!=='none').at(-1)||pages.at(-1);
 };
 const key=()=>`schoolZoom:${active()?.id||'global'}`;
 function apply(){const z=Number(localStorage.getItem(key())||1);document.documentElement.style.setProperty('--school-page-zoom',z.toFixed(2));document.body.classList.toggle('trainer-page-active',active()?.id==='school28-finger-trainer');const o=document.querySelector('.school-ui-tools output');if(o)o.value=Math.round(z*100)+'%'}
 function install(){if(document.querySelector('.school-ui-tools'))return;const b=document.createElement('div');b.className='school-ui-tools';b.innerHTML='<button data-u="theme" title="Modo claro ou escuro">☾</button><button data-u="minus" title="Diminuir zoom">A−</button><output>100%</output><button data-u="plus" title="Aumentar zoom">A+</button><button data-u="reset" title="Restaurar zoom">100</button>';document.body.appendChild(b);b.onclick=e=>{const a=e.target.closest('button')?.dataset.u;if(!a)return;if(a==='theme'){document.documentElement.classList.toggle('school-dark');localStorage.setItem('schoolDark',document.documentElement.classList.contains('school-dark')?'1':'0');return}let z=Number(localStorage.getItem(key())||1);if(a==='minus')z=Math.max(.7,z-.1);if(a==='plus')z=Math.min(1.5,z+.1);if(a==='reset')z=1;localStorage.setItem(key(),z.toFixed(2));apply()};if(localStorage.getItem('schoolDark')==='1')document.documentElement.classList.add('school-dark');document.addEventListener('click',()=>setTimeout(apply,0),true);addEventListener('hashchange',()=>setTimeout(apply,0));apply()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
