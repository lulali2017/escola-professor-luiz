(() => {
  const $ = selector => document.querySelector(selector);
  let audio = null;
  let running = false;
  let mode = '';
  let current = -1;
  let animation = 0;
  let nextAt = 0;
  const semitones = {'Dó':0,'Dó♯':1,'Ré':2,'Ré♯':3,'Mi':4,'Fá':5,'Fá♯':6,'Sol':7,'Sol♯':8,'Lá':9,'Lá♯':10,'Si':11};

  function audioContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    audio ??= new Audio();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  function sound(note, duration = .35) {
    const context = audioContext();
    if (!context || note === 'Pausa') return;
    const midi = 60 + (semitones[note] ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(.16, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function metronome(accent) {
    if ($('#metro')?.value !== 'on') return;
    const context = audioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const kind = $('#click')?.value || 'wood';
    oscillator.type = kind === 'classic' ? 'square' : kind === 'soft' ? 'sine' : 'triangle';
    oscillator.frequency.value = accent ? 950 : 650;
    gain.gain.setValueAtTime(.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .05);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .06);
  }

  function scoreNotes() {
    return [...document.querySelectorAll('#staff .note')].map(element => ({
      element,
      name: element.querySelector('b')?.textContent.trim() || '',
      beats: parseFloat(element.querySelector('small')?.textContent) || 1
    }));
  }

  function status(html) {
    const element = $('#status');
    if (element) element.innerHTML = html;
  }

  function controls() {
    return {demo:$('#demo'), practice:$('#practice'), stop:$('#stop'), previous:$('#previousNote'), next:$('#nextNote')};
  }

  function updateButtons() {
    const buttons = controls();
    if (buttons.demo) buttons.demo.textContent = running && mode === 'demo' ? '■ Parar demonstração' : '▶ Ouvir demonstração';
    if (buttons.practice) buttons.practice.textContent = current < 0 ? '🎸 Tocar a primeira nota' : '🎸 Tocar a próxima nota';
    if (buttons.next) buttons.next.textContent = current < 0 ? 'Primeira nota →' : 'Próxima nota →';
  }

  function highlight(list, index) {
    list.forEach((item, position) => item.element.classList.toggle('active', position === index));
    list[index]?.element.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
  }

  function stop(reset = true) {
    running = false;
    mode = '';
    nextAt = 0;
    cancelAnimationFrame(animation);
    animation = 0;
    if (reset) {
      current = -1;
      document.querySelectorAll('#staff .note').forEach(element => element.classList.remove('active'));
    }
    updateButtons();
  }

  function playAt(index, withClick = true) {
    const list = scoreNotes();
    if (!list.length) {
      status('<b>Escolha uma partitura no índice antes de tocar.</b>');
      return false;
    }
    current = Math.max(0, Math.min(index, list.length - 1));
    const item = list[current];
    const bpm = Math.max(40, Number($('#bpm')?.value) || 80);
    const milliseconds = Math.max(280, Math.min(60000 / bpm * item.beats, 1800));
    highlight(list, current);
    try {
      if (withClick) metronome(current % 4 === 0);
      sound(item.name, Math.max(.18, milliseconds / 1000 * .72));
    } catch (error) {
      status('<b>A nota avançou, mas o navegador bloqueou o som.</b> Toque novamente para liberar o áudio.');
    }
    status(`Nota <b>${current + 1} de ${list.length}</b>: <b>${item.name || 'nota'}</b>.`);
    updateButtons();
    return milliseconds;
  }

  function frame(now) {
    if (!running) return;
    if (now >= nextAt) {
      const list = scoreNotes();
      if (current + 1 >= list.length) {
        stop(false);
        status('<b>Demonstração concluída.</b> Você pode repetir ou praticar nota por nota.');
        return;
      }
      const wait = playAt(current + 1, true);
      nextAt = now + (wait || 600);
    }
    animation = requestAnimationFrame(frame);
  }

  function demo() {
    if (running) {
      stop();
      status('Demonstração parada.');
      return;
    }
    stop();
    audioContext();
    running = true;
    mode = 'demo';
    current = -1;
    nextAt = 0;
    updateButtons();
    animation = requestAnimationFrame(frame);
  }

  function manual(delta) {
    stop(false);
    audioContext();
    const list = scoreNotes();
    if (!list.length) {
      status('<b>Escolha uma partitura no índice antes de tocar.</b>');
      return;
    }
    let target = current + delta;
    if (current < 0 && delta <= 0) target = 0;
    if (target >= list.length) {
      status('<b>Fim da partitura.</b> Use “Nota anterior” ou inicie novamente.');
      return;
    }
    playAt(Math.max(0, target), false);
  }

  function cleanButton(id) {
    const oldButton = document.getElementById(id);
    if (!oldButton) return null;
    const newButton = oldButton.cloneNode(true);
    oldButton.replaceWith(newButton);
    return newButton;
  }

  function enableMxl(files) {
    const originalChange = files?.onchange;
    if (!files || !originalChange || files.dataset.mxlReady) return;
    files.dataset.mxlReady = '1';
    files.onchange = async event => {
      const file = files.files?.[0];
      if (file && /\.mxl$/i.test(file.name) && window.fflate) {
        try {
          const zipped = window.fflate.unzipSync(new Uint8Array(await file.arrayBuffer()));
          const names = Object.keys(zipped);
          let scoreName = names.find(name => /\.(musicxml|xml)$/i.test(name) && !/^META-INF\//i.test(name));
          const containerName = names.find(name => /META-INF\/container\.xml$/i.test(name));
          if (containerName) {
            const container = new TextDecoder().decode(zipped[containerName]);
            const match = container.match(/full-path=["']([^"']+)["']/i);
            if (match && zipped[match[1]]) scoreName = match[1];
          }
          if (scoreName) {
            const transfer = new DataTransfer();
            transfer.items.add(new File([zipped[scoreName]], file.name.replace(/\.mxl$/i, '.musicxml'), {type:'application/vnd.recordare.musicxml+xml'}));
            files.files = transfer.files;
          }
        } catch (error) {
          console.error('Não foi possível abrir o arquivo MXL.', error);
        }
      }
      return originalChange.call(files, event);
    };
  }

  function install() {
    enableMxl($('#files'));
    const demoButton = cleanButton('demo');
    const practiceButton = cleanButton('practice');
    const stopButton = cleanButton('stop');
    if (!demoButton || !practiceButton || !stopButton) return;
    let previous = $('#previousNote');
    let next = $('#nextNote');
    if (!previous) {
      previous = document.createElement('button');
      previous.id = 'previousNote';
      previous.type = 'button';
      previous.className = 'step-note';
      stopButton.insertAdjacentElement('afterend', previous);
    } else previous = cleanButton('previousNote');
    if (!next) {
      next = document.createElement('button');
      next.id = 'nextNote';
      next.type = 'button';
      next.className = 'step-note';
      previous.insertAdjacentElement('afterend', next);
    } else next = cleanButton('nextNote');
    previous.textContent = '← Nota anterior';
    previous.title = 'Voltar e ouvir a nota anterior';
    demoButton.addEventListener('click', demo);
    practiceButton.addEventListener('click', () => manual(1));
    stopButton.addEventListener('click', () => {
      stop();
      status('Reprodução parada. Escolha uma opção para começar novamente.');
    });
    previous.addEventListener('click', () => manual(-1));
    next.addEventListener('click', () => manual(1));
    updateButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
