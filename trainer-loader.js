(()=>{
  let tries=0;
  const timer=setInterval(()=>{
    const frame=document.querySelector('#school28-finger-trainer iframe');
    if(!frame){if(++tries>80)clearInterval(timer);return}
    frame.setAttribute('allow','autoplay');
    if(!frame.src.includes('v=20261126-10'))frame.src='treinador-dedilhado/index.html?v=20261126-10';
    clearInterval(timer);
  },1500);
})();
