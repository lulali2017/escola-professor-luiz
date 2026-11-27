(() => {
  const notes=[{name:'Sol',freq:392},{name:'Lá',freq:440},{name:'Si',freq:493.88},{name:'Dó',freq:523.25}];
  const $=id=>document.getElementById(id),groups=[...document.querySelectorAll('[data-note]')],beats=[...document.querySelectorAll('.beat-row span')];
  const bpm=$('bpm'),student=$('studentNotes'),instrument=$('instrument'),metroMode=$('metroMode'),metroVolume=$('metroVolume'),status=$('status'),card=$('metronomeCard');
  let audio=null,running=false,timers=[];
  function ctx(){audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();return audio}
  function clearTimers(){timers.forEach(clearTimeout);timers=[]}
  function setMetro(){const on=metroMode.value!=='off';card.hidden=!on;card.classList.toggle('running',running&&on);card.style.setProperty('--beat-duration',`${60000/Number(bpm.value)}ms`);$('metroLabel').textContent=`${{sound:'som e imagem',visual:'somente imagem',off:'desligado'}[metroMode.value]} · ${bpm.value} BPM`;$('metroVolumeValue').textContent=`${metroVolume.value}%`;$('bpmValue').textContent=`${bpm.value} BPM`}
  function audioTone(at,freq,duration,accent=false){const c=ctx(),o=c.createOscillator(),g=c.createGain(),kind=instrument.value;o.type=kind==='piano'?'sine':kind==='flute'?'triangle':'triangle';o.frequency.setValueAtTime(freq,at);const vol=kind==='guitar'?.16:.12;g.gain.setValueAtTime(accent?vol*1.25:vol,at);g.gain.exponentialRampToValueAtTime(.001,at+duration*.85);o.connect(g).connect(c.destination);o.start(at);o.stop(at+duration)}
  function metronomeTone(at,accent){const c=ctx(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(accent?1220:820,at);const vol=Number(metroVolume.value)/100*.16;g.gain.setValueAtTime(vol,at);g.gain.exponentialRampToValueAtTime(.001,at+.06);o.connect(g).connect(c.destination);o.start(at);o.stop(at+.07)}
  function clear(){groups.forEach(g=>g.classList.remove('active','done'));beats.forEach(b=>b.classList.remove('active'));status.classList.remove('good')}
  function stop(message='Exercício parado.'){running=false;clearTimers();card.classList.remove('running');$('start').disabled=false;$('demo').disabled=false;$('stop').disabled=true;if(message)status.textContent=message}
  function later(fn,ms){timers.push(setTimeout(fn,ms))}
  function play(demo){
    stop('');clear();running=true;$('start').disabled=true;$('demo').disabled=true;$('stop').disabled=false;setMetro();
    const mine=Number(student.value),beat=60000/Number(bpm.value),begin=ctx().currentTime+.08;
    status.textContent=demo?'Demonstração em andamento: acompanhe a partitura.':`Sua vez: toque ${mine===1?'a primeira nota':`as ${mine} primeiras notas`}; o sistema completa o restante.`;
    notes.forEach((note,i)=>{const time=beat*i;if(metroMode.value==='sound')metronomeTone(begin+time/1000,i===0);if(demo||i>=mine)audioTone(begin+time/1000,note.freq,beat/1000,i===0);later(()=>{if(!running)return;groups[i].classList.add('active');beats[i].classList.add('active')},time);later(()=>{groups[i].classList.remove('active');groups[i].classList.add('done');beats[i].classList.remove('active')},time+beat-35)});
    later(()=>{if(!running)return;running=false;card.classList.remove('running');$('start').disabled=false;$('demo').disabled=false;$('stop').disabled=true;status.textContent='✓ Compasso concluído! Repita e aumente a quantidade de notas que você toca.';status.classList.add('good')},beat*notes.length+50);
  }
  bpm.addEventListener('input',setMetro);metroMode.addEventListener('change',setMetro);metroVolume.addEventListener('input',setMetro);$('demo').addEventListener('click',()=>play(true));$('start').addEventListener('click',()=>play(false));$('stop').addEventListener('click',()=>stop());student.addEventListener('change',()=>{clear();status.textContent='Configuração atualizada. Clique em “Começar compasso”.'});setMetro();
})();
