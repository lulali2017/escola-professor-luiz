(()=>{
const $=s=>document.querySelector(s);
let timer=0,audio=null,current=-1,running=false,nextAt=0;
const semitones={'Dó':0,'Dó♯':1,'Ré':2,'Ré♯':3,'Mi':4,'Fá':5,'Fá♯':6,'Sol':7,'Sol♯':8,'Lá':9,'Lá♯':10,'Si':11};

function context(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return null;
  audio??=new Audio();
  if(audio.state==='suspended')audio.resume();
  return audio;
}
function sound(note,duration=.35){
  const ctx=context(); if(!ctx||note==='Pausa')return;
  const midi=60+(semitones[note]??0),osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type='triangle';osc.frequency.value=440*Math.pow(2,(midi-69)/12);
  gain.gain.setValueAtTime(.14,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
  osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);
}
function click(accent){
  if($('#metro')?.value!=='on')return;
  const ctx=context();if(!ctx)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),kind=$('#click')?.value||'wood';
  osc.type=kind==='classic'?'square':kind==='soft'?'sine':'triangle';
  osc.frequency.value=accent?950:650;gain.gain.setValueAtTime(.07,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.05);
  osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.06);
}
function notes(){return [...document.querySelectorAll('#staff .note')].map(el=>({el,name:el.querySelector('b')?.textContent.trim()||'',beats:parseFloat(el.querySelector('small')?.textContent)||1}))}
function label(text){const status=$('#status');if(status)status.innerHTML=text}
function stop(done=false){
  clearInterval(timer);timer=0;running=false;current=-1;nextAt=0;
  document.querySelectorAll('#staff .note').forEach(el=>el.classList.remove('active'));
  const demo=$('#demo'),practice=$('#practice');if(demo)demo.textContent='▶ Ouvir demonstração';if(practice)practice.textContent='🎸 Tocar a primeira nota';
  if(done)label('<b>Exercício concluído.</b> Você pode repetir, diminuir a velocidade ou escolher outra partitura.');
}
function run(mode){
  stop();const list=notes();if(!list.length)return;
  context();running=true;const demo=$('#demo'),practice=$('#practice');
  if(mode==='demo'&&demo)demo.textContent='■ Parar demonstração';
  if(mode==='practice'&&practice)practice.textContent='■ Parar exercício';
  const next=()=>{
    if(!running)return;
    current++;
    if(current>=list.length){stop(true);return}
    list.forEach((item,i)=>item.el.classList.toggle('active',i===current));
    const item=list[current],bpm=Math.max(40,Number($('#bpm')?.value)||80);
    const originalMilliseconds=60000/bpm*item.beats;
    const milliseconds=Math.max(280,Math.min(originalMilliseconds,1800));
    const wait=mode==='practice'&&current===0?Math.min(milliseconds,1200):milliseconds;
    nextAt=Date.now()+wait;
    try{click(current%4===0)}catch(error){console.warn('Metrônomo indisponível:',error)}
    try{if(mode==='demo'||current>0)sound(item.name,Math.max(.12,milliseconds/1000*.72))}catch(error){console.warn('Áudio indisponível:',error)}
    label(mode==='practice'&&current===0
      ?`<b>Sua vez:</b> toque a primeira nota. O computador continuará em ${Math.round(milliseconds/100)/10} segundo(s).`
      :`Tocando <b>nota ${current+1} de ${list.length}</b>.`);
    item.el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  };
  next();
  timer=window.setInterval(()=>{if(running&&Date.now()>=nextAt)next()},100);
}
function install(){
  const demo=$('#demo'),practice=$('#practice'),stopButton=$('#stop');if(!demo||!practice||!stopButton)return;
  if(!$('#previousNote')){const previous=document.createElement('button');previous.id='previousNote';previous.type='button';previous.className='step-note';previous.textContent='← Nota anterior';previous.title='Voltar uma nota';stopButton.insertAdjacentElement('afterend',previous);previous.onclick=()=>{if(!running)return;current=Math.max(-1,current-2);nextAt=0}}
  if(!$('#nextNote')){const nextButton=document.createElement('button');nextButton.id='nextNote';nextButton.type='button';nextButton.className='step-note';nextButton.textContent='Próxima nota →';nextButton.title='Avançar imediatamente';$('#previousNote').insertAdjacentElement('afterend',nextButton);nextButton.onclick=()=>{if(running)nextAt=0;else run('practice')}}
  const files=$('#files'),originalChange=files?.onchange;
  if(files&&originalChange)files.onchange=async event=>{
    const file=files.files?.[0];
    if(file&&/\.mxl$/i.test(file.name)&&window.fflate){
      try{
        const zipped=window.fflate.unzipSync(new Uint8Array(await file.arrayBuffer()));
        const names=Object.keys(zipped),containerName=names.find(name=>/META-INF\/container\.xml$/i.test(name));
        let scoreName='';
        if(containerName){
          const xml=new TextDecoder().decode(zipped[containerName]);
          scoreName=new DOMParser().parseFromString(xml,'application/xml').querySelector('rootfile')?.getAttribute('full-path')||'';
        }
        if(!scoreName)scoreName=names.find(name=>/\.(musicxml|xml)$/i.test(name)&&!/container\.xml$/i.test(name))||'';
        if(!scoreName||!zipped[scoreName])throw Error('Partitura interna não encontrada.');
        const dt=new DataTransfer();
        dt.items.add(new File([zipped[scoreName]],file.name.replace(/\.mxl$/i,'.musicxml'),{type:'application/vnd.recordare.musicxml+xml'}));
        files.files=dt.files;
      }catch(error){alert('Não foi possível descompactar esta partitura MXL.');return}
    }
    return originalChange.call(files,event);
  };
  demo.onclick=()=>running?stop():run('demo');
  practice.onclick=()=>running?stop():run('practice');
  stopButton.onclick=()=>stop();
  practice.textContent='🎸 Tocar a primeira nota';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
