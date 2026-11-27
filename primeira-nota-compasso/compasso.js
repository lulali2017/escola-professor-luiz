(() => {
  const notes=[{name:'Sol',freq:392},{name:'Lá',freq:440},{name:'Si',freq:493.88},{name:'Dó',freq:523.25}];
  const $=id=>document.getElementById(id), groups=[...document.querySelectorAll('[data-note]')];
  const bpm=$('bpm'), bpmValue=$('bpmValue'), student=$('studentNotes'), metro=$('metro'), instrument=$('instrument'), status=$('status');
  let running=false, timer=null, audio=null;
  const wait=ms=>new Promise(resolve=>timer=setTimeout(resolve,ms));
  function context(){audio ||= new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==='suspended') audio.resume(); return audio}
  function tone(freq,duration,accent=false){const ctx=context(), o=ctx.createOscillator(), g=ctx.createGain(), type=instrument.value; o.type=type==='piano'?'sine':type==='flute'?'triangle':'triangle'; o.frequency.value=freq; const now=ctx.currentTime; const volume=type==='guitar'?.14:.11; g.gain.setValueAtTime(accent?volume*1.35:volume,now); g.gain.exponentialRampToValueAtTime(.001,now+duration*.9); o.connect(g).connect(ctx.destination); o.start(now); o.stop(now+duration)}
  function click(accent){const ctx=context(),o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime;o.type='square';o.frequency.value=accent?1200:820;g.gain.setValueAtTime(.07,now);g.gain.exponentialRampToValueAtTime(.001,now+.07);o.connect(g).connect(ctx.destination);o.start(now);o.stop(now+.08)}
  function clear(){groups.forEach(g=>g.classList.remove('active','done'));document.querySelectorAll('.beat-row span').forEach(b=>b.classList.remove('active'))}
  function stop(message='Exercício parado.'){running=false;clearTimeout(timer);timer=null;$('start').disabled=false;$('demo').disabled=false;$('stop').disabled=true;status.textContent=message}
  async function play(demo){
    stop(''); clear(); running=true;$('start').disabled=true;$('demo').disabled=true;$('stop').disabled=false;
    const mine=Number(student.value), beat=60000/Number(bpm.value);
    status.textContent=demo?'Demonstração em andamento: acompanhe a partitura.':`Sua vez: toque as ${mine===1?'primeira nota':mine+' primeiras notas'}; eu completo o restante.`;
    for(let i=0;i<notes.length&&running;i++){
      groups[i].classList.add('active');document.querySelectorAll('.beat-row span')[i].classList.add('active');
      if(metro.checked) click(i===0);
      if(demo || i>=mine) tone(notes[i].freq,beat/1000,i===0);
      await wait(beat);
      groups[i].classList.remove('active');groups[i].classList.add('done');document.querySelectorAll('.beat-row span')[i].classList.remove('active');
    }
    if(running){running=false;$('start').disabled=false;$('demo').disabled=false;$('stop').disabled=true;status.textContent='✓ Compasso concluído! Repita e aumente a quantidade de notas que você toca.';status.classList.add('good')}
  }
  bpm.addEventListener('input',()=>bpmValue.textContent=`${bpm.value} BPM`);
  $('demo').addEventListener('click',()=>play(true)); $('start').addEventListener('click',()=>play(false)); $('stop').addEventListener('click',()=>stop());
  student.addEventListener('change',()=>{clear();status.classList.remove('good');status.textContent='Configuração atualizada. Clique em “Começar compasso”.'});
})();
