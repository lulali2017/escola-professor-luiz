(() => {
  const $ = selector => document.querySelector(selector);
  let audio = null;
  let running = false;
  let mode = '';
  let current = -1;
  let animation = 0;
  let nextAt = 0;
  let clock = 0;
  let beatCounter = 0;
  let beatsPerMeasure = 4;
  let beatType = 4;
  let arrangingScore = false;
  let arrangeTimer = 0;
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
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const instrument = $('#instrument')?.value || 'guitar';
    const presets = {
      guitar: {types:['triangle','sine'], ratios:[1,2], volumes:[.14,.035], attack:.008, release:.58},
      piano: {types:['triangle','sine','sine'], ratios:[1,2,3], volumes:[.13,.045,.018], attack:.004, release:.9},
      flute: {types:['sine','sine'], ratios:[1,2], volumes:[.12,.018], attack:.07, release:.95},
      electric: {types:['sawtooth','square'], ratios:[1,1.002], volumes:[.075,.035], attack:.012, release:.7},
      synth: {types:['square','sine'], ratios:[1,2], volumes:[.08,.035], attack:.025, release:.8}
    };
    const preset = presets[instrument] || presets.guitar;
    const length = Math.max(.22, duration * preset.release);
    preset.types.forEach((type, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency * preset.ratios[index];
      gain.gain.setValueAtTime(.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(preset.volumes[index], context.currentTime + preset.attack);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + length + .03);
    });
  }

  function pulseMetronome(accent) {
    const widget = $('#floatingMetronome');
    if (!widget) return;
    widget.classList.toggle('accent', accent);
    widget.classList.remove('beat');
    void widget.offsetWidth;
    widget.classList.add('beat');
  }

  function metronome(accent) {
    pulseMetronome(accent);
    if ($('#metro')?.value !== 'on') return;
    const context = audioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const kind = $('#click')?.value || 'wood';
    const volume = {low:.035, equal:.11, high:.2}[$('#metroVolume')?.value || 'equal'];
    oscillator.type = kind === 'classic' ? 'square' : kind === 'soft' ? 'sine' : 'triangle';
    oscillator.frequency.value = accent ? 950 : 650;
    gain.gain.setValueAtTime(accent ? Math.min(.24, volume * 1.18) : volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .05);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .06);
  }

  function stopMetronome() {
    clearInterval(clock);
    clock = 0;
    beatCounter = 0;
    $('#floatingMetronome')?.classList.remove('playing', 'beat', 'accent');
  }

  function startMetronome() {
    stopMetronome();
    const selector = $('#metro');
    const widget = $('#floatingMetronome');
    if (!selector || selector.value === 'off') {
      if (widget) widget.hidden = true;
      return;
    }
    if (widget) {
      widget.hidden = false;
      widget.classList.add('playing');
      widget.style.setProperty('--beat-duration', `${(60000 / Math.max(40, Number($('#bpm')?.value) || 80)) * (4 / beatType)}ms`);
    }
    const beat = () => {
      metronome(beatCounter % beatsPerMeasure === 0);
      beatCounter += 1;
    };
    beat();
    clock = setInterval(beat, (60000 / Math.max(40, Number($('#bpm')?.value) || 80)) * (4 / beatType));
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
    stopMetronome();
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
    const milliseconds = Math.max(100, 60000 / bpm * item.beats);
    highlight(list, current);
    try {
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
    startMetronome();
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

  function ensureInstrumentControl(anchor) {
    let select = $('#instrument');
    if (select) return select;
    const label = document.createElement('label');
    label.className = 'instrument-control';
    label.append('Som do instrumento');
    select = document.createElement('select');
    select.id = 'instrument';
    select.innerHTML = '<option value="guitar">Violão</option><option value="piano">Piano</option><option value="flute">Flauta</option><option value="electric">Guitarra</option><option value="synth">Teclado eletrônico</option>';
    label.appendChild(select);
    anchor.insertAdjacentElement('afterend', label);
    return select;
  }

  function ensureMetronomeVolumeControl() {
    if ($('#metroVolume')) return;
    const click = $('#click');
    const anchor = click?.closest('label');
    if (!anchor) return;
    const label = document.createElement('label');
    label.className = 'metronome-volume-control';
    label.append('Volume do metrônomo');
    const select = document.createElement('select');
    select.id = 'metroVolume';
    select.innerHTML = '<option value="low">Mais baixo que as notas</option><option value="equal" selected>Mesma altura das notas</option><option value="high">Mais alto que as notas</option>';
    label.appendChild(select);
    anchor.insertAdjacentElement('afterend', label);
  }

  function ensureFloatingControls() {
    const controls = $('.controls');
    if (!controls || $('#controlsSpacer')) return;
    const spacer = document.createElement('div');
    spacer.id = 'controlsSpacer';
    spacer.setAttribute('aria-hidden', 'true');
    controls.insertAdjacentElement('beforebegin', spacer);
    controls.classList.add('controls-floating');
    const synchronizeHeight = () => {
      if (!controls.offsetHeight) return;
      spacer.style.height = `${controls.offsetHeight + 18}px`;
    };
    new ResizeObserver(synchronizeHeight).observe(controls);
    addEventListener('resize', synchronizeHeight);
    requestAnimationFrame(synchronizeHeight);
  }

  function applyScoreView() {
    if (arrangingScore) return;
    const staff = $('#staff');
    const selector = $('#scoreView');
    if (!staff || !selector) return;
    arrangingScore = true;
    const notes = [...staff.querySelectorAll('.note')];
    const rows = [...staff.querySelectorAll('.system-row')];
    if (selector.value === 'continuous') {
      rows.forEach(row => [...row.children].forEach(note => staff.insertBefore(note, row)));
      rows.forEach(row => row.remove());
      staff.classList.remove('view-pages');
      staff.classList.add('view-continuous');
    } else if (notes.length) {
      rows.forEach(row => [...row.children].forEach(note => staff.appendChild(note)));
      rows.forEach(row => row.remove());
      const allNotes = [...staff.querySelectorAll(':scope > .note')];
      for (let index = 0; index < allNotes.length; index += 12) {
        const row = document.createElement('div');
        row.className = 'system-row';
        allNotes.slice(index, index + 12).forEach(note => row.appendChild(note));
        staff.appendChild(row);
      }
      staff.classList.remove('view-continuous');
      staff.classList.add('view-pages');
    }
    setTimeout(() => { arrangingScore = false; }, 0);
  }

  function ensureScoreViewControl(anchor) {
    if ($('#scoreView')) return;
    const style = document.createElement('style');
    style.textContent = '.controls.controls-floating{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9997;width:min(1120px,calc(100% - 24px));max-height:48vh;overflow:auto;margin:0;padding:12px;border:1px solid #c8d9d2;border-radius:14px;background:#fffdf6f5;box-shadow:0 8px 22px #07182745;backdrop-filter:blur(8px)}#controlsSpacer{display:block}.staff{position:relative;background:none!important}.staff.view-continuous{width:max-content;min-width:100%}.staff.view-continuous::before,.system-row::before{content:"";position:absolute;z-index:0;left:16px;right:16px;top:54px;height:62px;background:repeating-linear-gradient(to bottom,#678078 0 2px,transparent 2px 15px);pointer-events:none}.note{z-index:1}.staff.view-pages{display:block;min-width:0;padding:18px;background:#f7f1e4!important}.staff.view-pages::before{display:none}.system-row{position:relative;display:flex;gap:12px;align-items:center;min-width:720px;margin:0 0 18px;padding:26px 16px 18px;border:1px solid #d8cdb7;border-radius:12px;background:#fffdf6;break-inside:avoid}.system-row:last-child{margin-bottom:0}@media(max-width:760px){.controls.controls-floating{top:6px;width:calc(100% - 12px);max-height:46vh}.staff.view-pages{overflow-x:auto}.system-row{min-width:720px}}@media print{.controls,#controlsSpacer,.tip,#floatingMetronome{display:none!important}.score{overflow:visible;border:0;padding:0}.staff.view-pages{padding:0}.system-row{margin-bottom:10mm;page-break-inside:avoid}}';
    document.head.appendChild(style);
    const label = document.createElement('label');
    label.className = 'score-view-control';
    label.append('Visualização');
    const select = document.createElement('select');
    select.id = 'scoreView';
    select.innerHTML = '<option value="continuous">Contínua</option><option value="pages">Por trechos / impressão</option>';
    label.appendChild(select);
    anchor.insertAdjacentElement('afterend', label);
    select.addEventListener('change', applyScoreView);
    const staff = $('#staff');
    if (staff) {
      new MutationObserver(() => {
        if (arrangingScore) return;
        clearTimeout(arrangeTimer);
        arrangeTimer = setTimeout(applyScoreView, 0);
      }).observe(staff, {childList:true, subtree:false});
    }
    applyScoreView();
  }

  async function readMusicalSettings(file) {
    if (!file || !/\.(musicxml|xml)$/i.test(file.name)) return;
    try {
      const documentXml = new DOMParser().parseFromString(await file.text(), 'application/xml');
      const beats = Number(documentXml.querySelector('time beats')?.textContent);
      const denominator = Number(documentXml.querySelector('time beat-type')?.textContent);
      beatsPerMeasure = Number.isFinite(beats) && beats > 0 ? beats : 4;
      beatType = Number.isFinite(denominator) && denominator > 0 ? denominator : 4;
      const meterLabel = $('#meterLabel');
      if (meterLabel) meterLabel.textContent = `${beatsPerMeasure}/${beatType}`;
      const informedTempo = Number(documentXml.querySelector('sound[tempo]')?.getAttribute('tempo') || documentXml.querySelector('per-minute')?.textContent);
      if (Number.isFinite(informedTempo) && informedTempo >= 40 && informedTempo <= 180) {
        const bpm = $('#bpm');
        if (bpm) bpm.value = String(Math.round(informedTempo));
        const bpmOutput = $('#bpmOut');
        if (bpmOutput) bpmOutput.textContent = `${Math.round(informedTempo)} BPM`;
      }
    } catch (error) {
      beatsPerMeasure = 4;
      beatType = 4;
    }
  }

  function ensureFloatingMetronome() {
    if ($('#floatingMetronome')) return;
    const style = document.createElement('style');
    style.textContent = '#floatingMetronome{position:fixed;right:22px;bottom:90px;z-index:9998;width:112px;padding:10px 8px 8px;border:3px solid #f5bd45;border-radius:18px;background:#fffdf6;color:#183932;text-align:center;box-shadow:0 12px 30px #07182755;font-weight:900;cursor:grab;user-select:none;touch-action:none}#floatingMetronome.dragging{cursor:grabbing;opacity:.92}#floatingMetronome .case{position:relative;width:52px;height:70px;margin:auto;background:linear-gradient(145deg,#173d36,#0e5145);clip-path:polygon(35% 0,65% 0,100% 100%,0 100%);border-radius:8px}#floatingMetronome .arm{position:absolute;left:25px;bottom:10px;width:3px;height:48px;background:#f5bd45;transform-origin:50% 100%;transform:rotate(-24deg)}#floatingMetronome .weight{position:absolute;left:-6px;top:10px;width:15px;height:15px;border-radius:50%;background:#fff}#floatingMetronome.playing .arm{animation:metronomeSwing var(--beat-duration,750ms) ease-in-out infinite alternate}#floatingMetronome.beat{box-shadow:0 0 0 6px #f5bd4540,0 12px 30px #07182755}#floatingMetronome.accent .case{background:linear-gradient(145deg,#8f283f,#bd3e39)}#floatingMetronome small{display:block;margin-top:5px}@keyframes metronomeSwing{from{transform:rotate(-27deg)}to{transform:rotate(27deg)}}@media(max-width:650px){#floatingMetronome{right:10px;bottom:76px;width:88px;transform:scale(.88);transform-origin:bottom right}}';
    document.head.appendChild(style);
    const widget = document.createElement('div');
    widget.id = 'floatingMetronome';
    widget.hidden = true;
    widget.title = 'Arraste para colocar o metrônomo onde preferir';
    widget.innerHTML = '<div class="case"><span class="arm"><span class="weight"></span></span></div><small>Metrônomo <span id="meterLabel">4/4</span></small>';
    document.body.appendChild(widget);
    enableMetronomeDragging(widget);
  }

  function enableMetronomeDragging(widget) {
    try {
      const saved = JSON.parse(localStorage.getItem('escolaLuizMetronomePosition') || 'null');
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        widget.style.left = `${Math.max(0, Math.min(saved.left, innerWidth - widget.offsetWidth))}px`;
        widget.style.top = `${Math.max(0, Math.min(saved.top, innerHeight - widget.offsetHeight))}px`;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
      }
    } catch (error) {}
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    widget.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      const rectangle = widget.getBoundingClientRect();
      dragging = true;
      offsetX = event.clientX - rectangle.left;
      offsetY = event.clientY - rectangle.top;
      widget.classList.add('dragging');
      widget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    widget.addEventListener('pointermove', event => {
      if (!dragging) return;
      const left = Math.max(0, Math.min(event.clientX - offsetX, innerWidth - widget.offsetWidth));
      const top = Math.max(0, Math.min(event.clientY - offsetY, innerHeight - widget.offsetHeight));
      widget.style.left = `${left}px`;
      widget.style.top = `${top}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    });
    const finish = event => {
      if (!dragging) return;
      dragging = false;
      widget.classList.remove('dragging');
      widget.releasePointerCapture?.(event.pointerId);
      const rectangle = widget.getBoundingClientRect();
      try { localStorage.setItem('escolaLuizMetronomePosition', JSON.stringify({left:rectangle.left, top:rectangle.top})); } catch (error) {}
    };
    widget.addEventListener('pointerup', finish);
    widget.addEventListener('pointercancel', finish);
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
      const result = await originalChange.call(files, event);
      await readMusicalSettings(files.files?.[0]);
      return result;
    };
  }

  function install() {
    enableMxl($('#files'));
    ensureFloatingMetronome();
    const demoButton = cleanButton('demo');
    const practiceButton = cleanButton('practice');
    const stopButton = cleanButton('stop');
    if (!demoButton || !practiceButton || !stopButton) return;
    ensureInstrumentControl(stopButton);
    ensureMetronomeVolumeControl();
    ensureScoreViewControl($('#instrument')?.closest('label') || stopButton);
    ensureFloatingControls();
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
    $('#bpm')?.addEventListener('input', () => { if (running && mode === 'demo') startMetronome(); });
    $('#metro')?.addEventListener('change', () => {
      if (running && mode === 'demo') startMetronome();
      else {
        stopMetronome();
        const widget = $('#floatingMetronome');
        if (widget) widget.hidden = $('#metro').value === 'off';
      }
    });
    const widget = $('#floatingMetronome');
    if (widget) widget.hidden = $('#metro')?.value === 'off';
    updateButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
