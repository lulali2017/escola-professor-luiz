(() => {
  const $ = selector => document.querySelector(selector);
  let audio = null;
  let running = false;
  let mode = '';
  let current = -1;
  let animation = 0;
  let nextAt = 0;
  let clock = 0;
  let testClock = 0;
  let beatCounter = 0;
  let beatsPerMeasure = 4;
  let beatType = 4;
  let arrangingScore = false;
  let arrangeTimer = 0;
  let metronomePlayer = null;
  let metronomeBarPlayer = null;
  let metronomeBarSource = null;
  let metronomeBarGain = null;
  const metronomeAudioUrls = new Map();
  const metronomeBarUrls = new Map();
  const semitones = {'Dó':0,'Dó♯':1,'Ré':2,'Ré♯':3,'Mi':4,'Fá':5,'Fá♯':6,'Sol':7,'Sol♯':8,'Lá':9,'Lá♯':10,'Si':11};

  function audioContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    audio ??= new Audio();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  async function ensureAudioReady() {
    const context = audioContext();
    if (context && context.state !== 'running') {
      try { await context.resume(); } catch (error) {}
    }
    return context;
  }

  function hideSchoolHeader() {
    try {
      if (parent !== window) parent.postMessage({type:'school28-repertoire-playback', action:'hide-header'}, location.origin);
    } catch (error) {}
  }

  function levelToGain(value) {
    const level = Math.max(0, Math.min(200, Number(value) || 0));
    return .001 + Math.pow(level / 200, 1.6) * .31;
  }

  function metronomeLevelToGain(value) {
    const level = Math.max(0, Math.min(200, Number(value) || 0));
    if (!level) return 0;
    return .04 + Math.pow(level / 200, 1.25) * .91;
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
    const noteGain = levelToGain($('#noteVolume')?.value ?? 100);
    const presetTotal = preset.volumes.reduce((sum, value) => sum + value, 0) || 1;
    preset.types.forEach((type, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency * preset.ratios[index];
      gain.gain.setValueAtTime(.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(noteGain * (preset.volumes[index] / presetTotal), context.currentTime + preset.attack);
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

  function metronomeAudioUrl(accent, kind) {
    const key = `${kind}-${accent ? 'accent' : 'beat'}`;
    if (metronomeAudioUrls.has(key)) return metronomeAudioUrls.get(key);
    const sampleRate = 44100;
    const seconds = kind === 'soft' ? .16 : .11;
    const samples = Math.floor(sampleRate * seconds);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const writeText = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, samples * 2, true);
    const high = accent ? 1760 : 1320;
    const low = accent ? 330 : 245;
    for (let index = 0; index < samples; index += 1) {
      const time = index / sampleRate;
      const envelope = Math.pow(1 - index / samples, kind === 'soft' ? 2.2 : 4.5);
      const bright = Math.sin(2 * Math.PI * high * time) * (kind === 'soft' ? .55 : .78);
      const body = Math.sin(2 * Math.PI * low * time) * .34;
      const attack = kind === 'wood' && index < 180 ? (Math.random() * 2 - 1) * (1 - index / 180) * .3 : 0;
      const sample = Math.max(-1, Math.min(1, (bright + body + attack) * envelope));
      view.setInt16(44 + index * 2, sample * 32767, true);
    }
    const url = URL.createObjectURL(new Blob([buffer], {type:'audio/wav'}));
    metronomeAudioUrls.set(key, url);
    return url;
  }

  function metronomeBarAudioUrl() {
    const bpm = Math.max(40, Number($('#bpm')?.value) || 80);
    const kind = $('#click')?.value || 'wood';
    const beatMilliseconds = (60000 / bpm) * (4 / beatType);
    const key = `${beatsPerMeasure}-${beatType}-${bpm}-${kind}`;
    if (metronomeBarUrls.has(key)) return metronomeBarUrls.get(key);
    const sampleRate = 44100;
    const barSeconds = beatMilliseconds * beatsPerMeasure / 1000;
    const samples = Math.max(1, Math.floor(sampleRate * barSeconds));
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const writeText = (offset, text) => [...text].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, samples * 2, true);
    const beatSamples = beatMilliseconds / 1000 * sampleRate;
    const clickSamples = Math.floor(sampleRate * (kind === 'soft' ? .16 : .11));
    for (let index = 0; index < samples; index += 1) {
      const beatIndex = Math.floor(index / beatSamples);
      const localIndex = Math.floor(index - beatIndex * beatSamples);
      let sample = 0;
      if (beatIndex < beatsPerMeasure && localIndex >= 0 && localIndex < clickSamples) {
        const accent = beatIndex === 0;
        const time = localIndex / sampleRate;
        const envelope = Math.pow(1 - localIndex / clickSamples, kind === 'soft' ? 2.2 : 4.5);
        const high = accent ? 1760 : 1320;
        const low = accent ? 330 : 245;
        const bright = Math.sin(2 * Math.PI * high * time) * (kind === 'soft' ? .55 : .78);
        const body = Math.sin(2 * Math.PI * low * time) * .34;
        const attack = kind === 'wood' && localIndex < 180 ? (Math.random() * 2 - 1) * (1 - localIndex / 180) * .3 : 0;
        sample = Math.max(-1, Math.min(1, (bright + body + attack) * envelope * (accent ? 1 : .78)));
      }
      view.setInt16(44 + index * 2, sample * 32767, true);
    }
    const url = URL.createObjectURL(new Blob([buffer], {type:'audio/wav'}));
    metronomeBarUrls.set(key, url);
    return url;
  }

  function playMetronomeBar(loop = false) {
    metronomeBarPlayer ??= new Audio();
    const context = audioContext();
    if (context && !metronomeBarSource) {
      metronomeBarSource = context.createMediaElementSource(metronomeBarPlayer);
      metronomeBarGain = context.createGain();
      metronomeBarSource.connect(metronomeBarGain).connect(context.destination);
    }
    metronomeBarPlayer.pause();
    metronomeBarPlayer.src = metronomeBarAudioUrl();
    metronomeBarPlayer.currentTime = 0;
    metronomeBarPlayer.loop = loop;
    metronomeBarPlayer.onended = null;
    metronomeBarPlayer.preload = 'auto';
    const volume = Math.max(0, Math.min(1, Number($('#metroVolume')?.value ?? 100) / 200));
    if (metronomeBarGain && context) {
      metronomeBarPlayer.volume = 1;
      metronomeBarGain.gain.value = volume;
    } else {
      metronomeBarPlayer.volume = volume;
    }
    const playback = metronomeBarPlayer.play();
    if (playback?.catch) playback.catch(() => {
      webAudioMetronome(true, $('#click')?.value || 'wood', metronomeLevelToGain($('#metroVolume')?.value ?? 100));
    });
    return playback;
  }

  function webAudioMetronome(accent, kind, volume) {
    const context = audioContext();
    if (!context) return;
    const frequencies = accent ? [1760, 330] : [1320, 245];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === 'classic' ? 'square' : kind === 'soft' ? 'sine' : index ? 'triangle' : 'square';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      if (kind === 'wood') oscillator.frequency.exponentialRampToValueAtTime(Math.max(90, frequency * .58), context.currentTime + .055);
      const layerVolume = volume * (index ? .34 : .78);
      gain.gain.setValueAtTime(layerVolume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + (kind === 'soft' ? .16 : .085));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + (kind === 'soft' ? .18 : .1));
    });
  }

  function metronome(accent) {
    pulseMetronome(accent);
    if ($('#metro')?.value !== 'on') return;
    const kind = $('#click')?.value || 'wood';
    const volume = metronomeLevelToGain($('#metroVolume')?.value ?? 100);
    if (!volume) return;
    metronomePlayer ??= new Audio();
    const click = metronomePlayer;
    click.preload = 'auto';
    click.pause();
    if (click.dataset.soundKind !== kind) {
      click.src = metronomeAudioUrl(false, kind);
      click.dataset.soundKind = kind;
      click.load();
    }
    click.currentTime = 0;
    const baseVolume = Math.max(.01, Math.min(1, Number($('#metroVolume')?.value || 100) / 200));
    click.volume = Math.max(.01, Math.min(1, baseVolume * (accent ? 1 : .78)));
    const playback = click.play();
    if (playback?.catch) playback.catch(() => {
      webAudioMetronome(accent, kind, volume);
    });
  }

  function stopMetronome() {
    clearInterval(clock);
    clearInterval(testClock);
    clock = 0;
    testClock = 0;
    if (metronomeBarPlayer) {
      metronomeBarPlayer.pause();
      metronomeBarPlayer.currentTime = 0;
      metronomeBarPlayer.loop = false;
    }
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
      requestAnimationFrame(placeDefaultMetronome);
      widget.classList.add('playing');
      widget.style.setProperty('--beat-duration', `${(60000 / Math.max(40, Number($('#bpm')?.value) || 80)) * (4 / beatType)}ms`);
    }
    playMetronomeBar(true);
    const beat = () => {
      pulseMetronome(beatCounter % beatsPerMeasure === 0);
      beatCounter += 1;
    };
    beat();
    clock = setInterval(beat, (60000 / Math.max(40, Number($('#bpm')?.value) || 80)) * (4 / beatType));
  }

  function scoreNotes() {
    return [...document.querySelectorAll('#staff .note')].map(element => ({
      element,
      name: element.querySelector('b')?.textContent.trim() || '',
      beats: parseFloat(element.querySelector('small')?.dataset.beats || element.querySelector('small')?.textContent) || 1
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

  async function demo() {
    if (running) {
      stop();
      status('Demonstração parada.');
      return;
    }
    stop();
    await ensureAudioReady();
    hideSchoolHeader();
    running = true;
    mode = 'demo';
    current = -1;
    nextAt = 0;
    updateButtons();
    startMetronome();
    animation = requestAnimationFrame(frame);
  }

  async function manual(delta) {
    stop(false);
    await ensureAudioReady();
    hideSchoolHeader();
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
    if ($('#metro')?.value !== 'off') {
      const widget = $('#floatingMetronome');
      if (widget) {
        widget.hidden = false;
        requestAnimationFrame(placeDefaultMetronome);
      }
      metronome(current % beatsPerMeasure === 0);
    }
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

  function ensureNoteVolumeControl() {
    if ($('#noteVolume')) return;
    const instrument = $('#instrument');
    const anchor = instrument?.closest('label');
    if (!anchor) return;
    const label = document.createElement('label');
    label.className = 'note-volume-control';
    label.append('Volume das notas');
    const slider = document.createElement('input');
    slider.id = 'noteVolume';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '200';
    slider.step = '5';
    slider.value = '100';
    slider.title = 'Use a mesma porcentagem do metrônomo para obter o mesmo volume';
    const output = document.createElement('span');
    output.id = 'noteVolumeOut';
    output.textContent = '100%';
    output.style.display = 'block';
    output.style.textAlign = 'center';
    output.style.fontSize = '12px';
    slider.addEventListener('input', () => {
      output.textContent = `${slider.value}%`;
    });
    const test = document.createElement('button');
    test.type = 'button';
    test.id = 'testMetronome';
    test.textContent = '🔊 Testar metrônomo';
    test.style.marginTop = '5px';
    test.style.padding = '7px 9px';
    test.addEventListener('click', () => {
      const context = audioContext();
      if (context && context.state !== 'running') context.resume().catch(() => {});
      const widget = $('#floatingMetronome');
      if (widget) widget.hidden = false;
      metronome(true);
      status('Batida de teste do metrônomo. Ajuste o volume se necessário.');
    });
    label.append(slider, output, test);
    anchor.insertAdjacentElement('afterend', label);
  }

  function ensureMetronomeVolumeControl() {
    if ($('#metroVolume')) return;
    const click = $('#click');
    const anchor = click?.closest('label');
    if (!anchor) return;
    const label = document.createElement('label');
    label.className = 'metronome-volume-control';
    label.append('Volume do metrônomo');
    const slider = document.createElement('input');
    slider.id = 'metroVolume';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '200';
    slider.step = '5';
    slider.value = '100';
    slider.title = '0% quase sem som · 100% junto das notas · 200% bem mais alto';
    const output = document.createElement('span');
    output.id = 'metroVolumeOut';
    output.textContent = '100%';
    output.style.display = 'block';
    output.style.textAlign = 'center';
    output.style.fontSize = '12px';
    slider.addEventListener('input', () => {
      output.textContent = `${slider.value}%`;
      const volume = Math.max(0, Math.min(1, Number(slider.value) / 200));
      const context = audioContext();
      if (metronomeBarGain && context) {
        metronomeBarGain.gain.cancelScheduledValues(context.currentTime);
        metronomeBarGain.gain.value = volume;
      } else if (metronomeBarPlayer) {
        metronomeBarPlayer.volume = volume;
      }
      if (metronomePlayer) metronomePlayer.volume = volume;
    });
    label.append(slider, output);
    anchor.insertAdjacentElement('afterend', label);
    const oldTest = $('#testMetronome');
    if (oldTest) {
      const test = oldTest.cloneNode(true);
      oldTest.replaceWith(test);
      test.className = 'metronome-test-button';
      test.textContent = `Testar metronomo - ${beatsPerMeasure} batidas`;
      test.style.marginTop = '0';
      test.style.alignSelf = 'flex-end';
      test.style.minHeight = '42px';
      test.style.background = '#0e5145';
      test.style.color = '#fff';
      test.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        clearInterval(testClock);
        await ensureAudioReady();
        const widget = $('#floatingMetronome');
        const beatMilliseconds = (60000 / Math.max(40, Number($('#bpm')?.value) || 80)) * (4 / beatType);
        if (widget) {
          widget.hidden = false;
          widget.classList.add('playing');
          widget.style.setProperty('--beat-duration', `${beatMilliseconds}ms`);
          requestAnimationFrame(placeDefaultMetronome);
        }
        playMetronomeBar(false);
        let count = 0;
        let finished = false;
        const finishTest = () => {
          if (finished) return;
          finished = true;
          clearInterval(testClock);
          testClock = 0;
          test.textContent = `Testar metronomo - ${beatsPerMeasure} batidas`;
          widget?.classList.remove('playing', 'beat', 'accent');
        };
        if (metronomeBarPlayer) metronomeBarPlayer.onended = finishTest;
        const beat = () => {
          pulseMetronome(count === 0);
          count += 1;
          if (count >= beatsPerMeasure) {
            clearInterval(testClock);
            testClock = 0;
            setTimeout(finishTest, beatMilliseconds);
          }
        };
        test.textContent = `Tocando ${beatsPerMeasure} batidas`;
        beat();
        if (count < beatsPerMeasure) testClock = setInterval(beat, beatMilliseconds);
      });
      label.insertAdjacentElement('afterend', test);
    }
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
      spacer.style.height = `${controls.offsetHeight + 10}px`;
    };
    const synchronizePosition = () => {
      let top = 8;
      try {
        if (parent !== window && frameElement) {
          const frameRectangle = frameElement.getBoundingClientRect();
          const maximum = Math.max(8, frameElement.clientHeight - controls.offsetHeight - 8);
          top = Math.min(maximum, Math.max(8, 8 - frameRectangle.top));
        }
      } catch (error) {}
      controls.style.top = `${top}px`;
    };
    new ResizeObserver(synchronizeHeight).observe(controls);
    addEventListener('resize', () => { synchronizeHeight(); synchronizePosition(); });
    addEventListener('scroll', synchronizePosition, {passive:true});
    try {
      if (parent !== window) {
        parent.addEventListener('scroll', synchronizePosition, {passive:true});
        parent.addEventListener('resize', synchronizePosition);
      }
    } catch (error) {}
    requestAnimationFrame(() => { synchronizeHeight(); synchronizePosition(); });
  }

  function updateTimeSignatures() {
    const staff = $('#staff');
    if (!staff) return;
    const rows = [...staff.querySelectorAll(':scope > .system-row')];
    const targets = staff.classList.contains('view-pages') && rows.length ? rows : [staff];
    staff.querySelectorAll('.time-signature').forEach(signature => {
      if (!targets.includes(signature.parentElement)) signature.remove();
    });
    targets.forEach(target => {
      let signature = target.querySelector(':scope > .time-signature');
      if (!signature) {
        signature = document.createElement('span');
        signature.className = 'time-signature';
        target.appendChild(signature);
      }
      signature.innerHTML = `<b>${beatsPerMeasure}</b><b>${beatType}</b>`;
      signature.setAttribute('aria-label', `Compasso ${beatsPerMeasure} por ${beatType}`);
    });
  }

  function formatRhythmNumber(value) {
    if (Number.isInteger(value)) return String(value);
    if (Math.abs(value * 10000 - Math.round(value * 10000)) < .0001) {
      return String(Math.round(value * 10000) / 10000).replace('.', ',');
    }
    const rounded = Math.round(value * 100) / 100;
    return `${String(rounded).replace('.', ',')}...`;
  }

  function formatRhythmFraction(value) {
    if (Number.isInteger(value)) return String(value);
    for (let denominator = 2; denominator <= 64; denominator += 1) {
      const numerator = Math.round(value * denominator);
      if (Math.abs(value - numerator / denominator) < .00001) {
        const divisor = (a, b) => b ? divisor(b, a % b) : a;
        const common = divisor(Math.abs(numerator), denominator);
        return `${numerator / common}/${denominator / common}`;
      }
    }
    return formatRhythmNumber(value);
  }

  function formatRhythmValue(value) {
    return $('#rhythmFractionToggle')?.checked ? formatRhythmFraction(value) : formatRhythmNumber(value);
  }

  function updateRhythmGuide() {
    const guide = $('#rhythmGuide');
    if (!guide) return;
    const figures = [
      ['𝅝', '𝄻', 'Semibreve', 4],
      ['𝅗𝅥', '𝄼', 'Mínima', 2],
      ['♩', '𝄽', 'Semínima', 1],
      ['♪', '𝄾', 'Colcheia', .5],
      ['𝅘𝅥𝅯', '𝄿', 'Semicolcheia', .25],
      ['𝅘𝅥𝅰', '𝅀', 'Fusa', .125],
      ['𝅘𝅥𝅱', '𝅁', 'Semifusa', .0625]
    ];
    guide.querySelector('summary').textContent = `Figuras e tempos · compasso ${beatsPerMeasure}/${beatType}`;
    guide.querySelector('.rhythm-items').innerHTML = figures.map(([symbol, rest, name, quarterUnits]) => {
      const beats = quarterUnits * beatType / 4;
      return `<span><b class="rhythm-symbol" title="Figura e pausa">${symbol} ${rest}</b><strong>${name}</strong><small>${formatRhythmValue(beats)} ${beats === 1 ? 'tempo' : 'tempos'}</small></span>`;
    }).join('') + '<span class="tuplet-info"><b class="rhythm-symbol">3:2</b><strong>Tercina</strong><small>quiáltera: 3 notas no tempo de 2</small></span>';
  }

  function ensureRhythmGuide() {
    if ($('#rhythmGuide')) return;
    const controls = $('.controls');
    if (!controls) return;
    const style = document.createElement('style');
    style.textContent = '#rhythmGuide{flex:1 1 100%;order:20;border:1px solid #d8c086;border-radius:10px;background:#fff8df;padding:3px 7px;color:#183932}#rhythmGuide summary{cursor:pointer;font-size:13px;font-weight:900;line-height:1.2}#rhythmGuide .rhythm-items{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}#rhythmGuide .rhythm-items>span{display:flex;align-items:center;gap:4px;min-width:0;padding:2px 6px;border-radius:7px;background:#fff;white-space:nowrap}.rhythm-symbol{font:20px/1 "Noto Music","Segoe UI Symbol",serif}.rhythm-items strong{font-size:10px}.rhythm-items small{font-size:9px}.tuplet-info{background:#e9f4ee!important}.music-open .controls.controls-floating{padding:6px 8px;gap:5px;max-height:42vh}.music-open .controls.controls-floating button{min-height:32px!important;padding:5px 9px!important;border-radius:8px;font-size:13px;line-height:1.05}.music-open .controls.controls-floating label{font-size:10px;line-height:1}.music-open .controls.controls-floating select,.music-open .controls.controls-floating input{margin-top:2px;padding:4px 6px;min-height:32px;font-size:12px}.music-open .controls.controls-floating input[type=range]{min-height:18px;padding:0}.music-open .controls.controls-floating .reader-check{padding:5px 8px!important;font-size:12px!important}.note .figure-name{display:block;margin-top:2px;color:#815b12;font:700 10px/1.2 system-ui,sans-serif}.note.figure-whole i,.note.figure-half i{background:#fffdf6;border:3px solid #143f38}.note.figure-whole i:after{display:none}.note.figure-eighth i:before,.note.figure-sixteenth i:before,.note.figure-thirtysecond i:before,.note.figure-sixtyfourth i:before{content:"";position:absolute;right:-10px;bottom:34px;width:13px;height:12px;border-top:4px solid #143f38;border-radius:0 12px 0 0;transform:rotate(25deg)}.note.figure-sixteenth i:before{box-shadow:2px 7px 0 -1px #143f38}.note.figure-thirtysecond i:before{box-shadow:2px 7px 0 -1px #143f38,4px 14px 0 -1px #143f38}.note.figure-sixtyfourth i:before{box-shadow:2px 6px 0 -1px #143f38,4px 12px 0 -1px #143f38,6px 18px 0 -1px #143f38}.note.figure-triplet .figure-name::after{content:" 3";display:inline-block;margin-left:3px;padding:0 3px;border-top:1px solid currentColor;border-radius:4px}.note.is-rest i{display:none}.note .rest-symbol{position:absolute;z-index:2;left:10px;top:45px;width:40px;color:#143f38;text-align:center;font:42px/1 "Noto Music","Segoe UI Symbol",serif}.note.is-rest b{color:#815b12}@media(max-width:650px){#rhythmGuide .rhythm-items>span{padding:2px 4px}.music-open .controls.controls-floating{max-height:38vh}}';
    style.textContent += '#rhythmGuide .rhythm-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:3px;font-size:10px}.rhythm-note{font-weight:700;color:#674d16}.rhythm-mode{display:flex!important;align-items:center;gap:5px;white-space:nowrap;font-size:10px!important}.rhythm-switch{position:relative;width:34px;height:18px}.rhythm-switch input{position:absolute;opacity:0;pointer-events:none}.rhythm-switch i{position:absolute;inset:0;border-radius:999px;background:#c7d4cf;cursor:pointer}.rhythm-switch i::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0004;transition:.18s}.rhythm-switch input:checked+i{background:#0e5145}.rhythm-switch input:checked+i::after{transform:translateX(16px)}@media(max-width:650px){#rhythmGuide .rhythm-toolbar{align-items:flex-start;flex-direction:column;gap:2px}}';
    document.head.appendChild(style);
    const guide = document.createElement('details');
    guide.id = 'rhythmGuide';
    guide.open = true;
    guide.innerHTML = '<summary></summary><div class="rhythm-toolbar"><span class="rhythm-note">Observação: a nota e sua pausa correspondente têm a mesma duração.</span><label class="rhythm-mode">Dízima <span class="rhythm-switch"><input id="rhythmFractionToggle" type="checkbox"><i></i></span> Fração</label></div><div class="rhythm-items"></div>';
    controls.appendChild(guide);
    const toggle = $('#rhythmFractionToggle');
    try { toggle.checked = localStorage.getItem('escolaLuizRhythmFractions') === '1'; } catch (error) {}
    toggle.addEventListener('change', () => {
      try { localStorage.setItem('escolaLuizRhythmFractions', toggle.checked ? '1' : '0'); } catch (error) {}
      updateRhythmGuide();
    });
    updateRhythmGuide();
  }

  function classifyRhythmicFigure(note, duration) {
    const classes = ['figure-whole','figure-half','figure-quarter','figure-eighth','figure-sixteenth','figure-thirtysecond','figure-sixtyfourth','figure-triplet','is-rest'];
    note.classList.remove(...classes);
    let cssClass = 'figure-quarter';
    let name = 'Semínima';
    if (duration >= 3.75) { cssClass = 'figure-whole'; name = 'Semibreve'; }
    else if (duration >= 1.75) { cssClass = 'figure-half'; name = 'Mínima'; }
    else if (duration >= .875) { cssClass = 'figure-quarter'; name = 'Semínima'; }
    else if (duration >= .4375) { cssClass = 'figure-eighth'; name = 'Colcheia'; }
    else if (duration >= .21875) { cssClass = 'figure-sixteenth'; name = 'Semicolcheia'; }
    else if (duration >= .109375) { cssClass = 'figure-thirtysecond'; name = 'Fusa'; }
    else { cssClass = 'figure-sixtyfourth'; name = 'Semifusa'; }
    const eighthTriplet = Math.abs(duration - 1 / 3) < .02;
    const quarterTriplet = Math.abs(duration - 2 / 3) < .02;
    const triplet = eighthTriplet || quarterTriplet;
    if (eighthTriplet) { cssClass = 'figure-eighth'; name = 'Colcheia'; }
    if (quarterTriplet) { cssClass = 'figure-quarter'; name = 'Semínima'; }
    note.classList.add(cssClass);
    if (triplet) note.classList.add('figure-triplet');
    const isRest = note.querySelector('b')?.textContent.trim() === 'Pausa';
    note.classList.toggle('is-rest', isRest);
    const restSymbols = { 'figure-whole':'𝄻', 'figure-half':'𝄼', 'figure-quarter':'𝄽', 'figure-eighth':'𝄾', 'figure-sixteenth':'𝄿', 'figure-thirtysecond':'𝅀', 'figure-sixtyfourth':'𝅁' };
    let rest = note.querySelector('.rest-symbol');
    if (isRest) {
      if (!rest) {
        rest = document.createElement('span');
        rest.className = 'rest-symbol';
        note.appendChild(rest);
      }
      rest.textContent = restSymbols[cssClass] || '𝄽';
    } else rest?.remove();
    let label = note.querySelector('.figure-name');
    if (!label) {
      label = document.createElement('em');
      label.className = 'figure-name';
      note.appendChild(label);
    }
    label.textContent = `${isRest ? 'Pausa de ' : ''}${name}${triplet ? ' (tercina/quiáltera)' : ''}`;
  }

  function applyCalculatedBarlines() {
    const notes = [...document.querySelectorAll('#staff .note')];
    if (!notes.length) return;
    const measureDuration = Math.max(.25, beatsPerMeasure * (4 / beatType));
    let elapsed = 0;
    notes.forEach((note, index) => {
      const label = note.querySelector('small');
      if (label && !label.dataset.beats) {
        const original = parseFloat(label.textContent) || 1;
        label.dataset.beats = String(original);
        const decimal = String(original).split('.')[1] || '';
        const display = decimal.length > 2
          ? `${original.toFixed(2).replace('.', ',')}...`
          : String(original).replace('.', ',');
        label.textContent = `${display} tempo(s)`;
      }
      const duration = Math.max(.0625, parseFloat(label?.dataset.beats || label?.textContent) || 1);
      classifyRhythmicFigure(note, duration);
      elapsed += duration;
      const closesMeasure = elapsed >= measureDuration - .001;
      note.classList.toggle('measure-end', closesMeasure || index === notes.length - 1);
      note.classList.toggle('score-end', index === notes.length - 1);
      if (closesMeasure) elapsed %= measureDuration;
    });
  }

  function applyScoreView() {
    if (arrangingScore) return;
    const staff = $('#staff');
    const selector = $('#scoreView');
    if (!staff || !selector) return;
    arrangingScore = true;
    const rows = [...staff.querySelectorAll('.system-row')];
    rows.forEach(row => [...row.querySelectorAll(':scope > .note')].forEach(note => staff.insertBefore(note, row)));
    rows.forEach(row => row.remove());
    staff.querySelectorAll(':scope > .time-signature').forEach(signature => signature.remove());
    const notes = [...staff.querySelectorAll(':scope > .note')];
    applyCalculatedBarlines();
    if (selector.value === 'continuous') {
      staff.classList.remove('view-pages');
      staff.classList.add('view-continuous');
    } else if (notes.length) {
      const measures = [];
      let measure = [];
      notes.forEach(note => {
        measure.push(note);
        if (note.classList.contains('measure-end')) {
          measures.push(measure);
          measure = [];
        }
      });
      if (measure.length) measures.push(measure);
      const lines = [];
      let line = [];
      measures.forEach(group => {
        if (line.length && line.length + group.length > 12) {
          lines.push(line);
          line = [];
        }
        line.push(...group);
      });
      if (line.length) lines.push(line);
      lines.forEach(lineNotes => {
        const row = document.createElement('div');
        row.className = 'system-row';
        lineNotes.forEach(note => row.appendChild(note));
        staff.appendChild(row);
      });
      staff.classList.remove('view-continuous');
      staff.classList.add('view-pages');
    }
    updateTimeSignatures();
    setTimeout(() => { arrangingScore = false; }, 0);
  }

  function ensureScoreViewControl(anchor) {
    if ($('#scoreView')) return;
    const style = document.createElement('style');
    style.textContent = '.controls.controls-floating{position:fixed;top:8px;left:8px;right:8px;transform:none;z-index:9997;width:auto;max-width:none;max-height:48vh;overflow-y:auto;overflow-x:hidden;margin:0;padding:12px;border:1px solid #c8d9d2;border-radius:14px;background:#fffdf6f5;box-shadow:0 8px 22px #07182745;backdrop-filter:blur(8px)}#controlsSpacer{display:block}.music-open .wrap{width:100%;max-width:none;margin:0}.music-open .hero,.music-open .book-panel,.music-open .lib,.music-open header{display:none!important}.music-open #reader{margin:0;padding:10px 8px 18px;border:0;border-radius:0;box-shadow:none}.music-open #reader>.index-back,.music-open #reader>.tip,.music-open #reader>.status,.music-open #reader>.music-head{display:none!important}.music-open .score{margin-top:0}.staff{position:relative;background:none!important}.staff.view-continuous{width:max-content;min-width:100%;padding-left:118px}.staff.view-continuous::before,.system-row::before{content:"";position:absolute;z-index:0;left:16px;right:16px;top:54px;height:62px;background:repeating-linear-gradient(to bottom,#678078 0 2px,transparent 2px 15px);pointer-events:none}.staff.view-continuous::after,.system-row::after{content:"𝄞";position:absolute;z-index:2;left:24px;top:27px;font-family:"Noto Music","Segoe UI Symbol",serif;font-size:72px;line-height:1;color:#183932;pointer-events:none}.time-signature{position:absolute;z-index:3;left:78px;top:53px;width:26px;color:#183932;text-align:center;font-family:Georgia,serif;font-size:25px;font-weight:900;line-height:.78;pointer-events:none}.time-signature b{display:block}.note{z-index:1;min-height:176px}.note small{display:block;min-height:18px;margin-top:2px}.note .tab-pos{position:static!important;display:block;margin-top:6px}.note.measure-end::after{content:"";position:absolute;z-index:4;right:-7px;top:48px;width:3px;height:74px;background:#264b43}.note.measure-end.score-end::after{width:7px;background:transparent;border-left:2px solid #264b43;border-right:4px solid #264b43}.staff.view-pages{display:block;min-width:0;padding:18px;background:#f7f1e4!important}.staff.view-pages::before{display:none}.system-row{position:relative;display:flex;gap:12px;align-items:center;min-width:720px;margin:0 0 18px;padding:26px 16px 18px 118px;border:1px solid #d8cdb7;border-radius:12px;background:#fffdf6;break-inside:avoid}.system-row:last-child{margin-bottom:0}@media(max-width:760px){.controls.controls-floating{top:4px;left:4px;right:4px;max-height:46vh;padding:6px;gap:5px}.controls.controls-floating>*{flex:1 1 116px;min-width:0}.controls.controls-floating button{padding:7px 5px;font-size:12px;line-height:1.15}.controls.controls-floating label{font-size:10px;line-height:1.1}.controls.controls-floating select,.controls.controls-floating input{margin-top:2px;padding:5px;font-size:12px}.controls.controls-floating .reader-check{padding:6px!important;font-size:11px!important}.music-open #reader{padding:4px}.staff.view-pages{overflow-x:auto}.system-row{min-width:720px}}@media print{.controls,#controlsSpacer,.tip,#floatingMetronome{display:none!important}.score{overflow:visible;border:0;padding:0}.staff.view-pages{padding:0}.system-row{margin-bottom:10mm;page-break-inside:avoid}}';
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
      updateTimeSignatures();
      updateRhythmGuide();
      const testButton = $('#testMetronome');
      if (testButton && !testClock) testButton.textContent = `Testar metronomo - ${beatsPerMeasure} batidas`;
      const informedTempo = Number(documentXml.querySelector('sound[tempo]')?.getAttribute('tempo') || documentXml.querySelector('per-minute')?.textContent);
      if (Number.isFinite(informedTempo) && informedTempo >= 40 && informedTempo <= 180) {
        const bpm = $('#bpm');
        if (bpm) bpm.value = String(Math.round(informedTempo));
        const bpmOutput = $('#bpmOut');
        if (bpmOutput) bpmOutput.textContent = `${Math.round(informedTempo)} BPM`;
      }
      const measureStarts = [];
      let renderedNoteCount = 0;
      const part = documentXml.querySelector('part');
      part?.querySelectorAll(':scope > measure').forEach(measure => {
        const measureNotes = [...measure.querySelectorAll(':scope > note')].filter(note => !note.querySelector('chord'));
        if (measureNotes.length) measureStarts.push(renderedNoteCount);
        renderedNoteCount += measureNotes.length;
      });
      const renderedNotes = [...document.querySelectorAll('#staff .note')];
      renderedNotes.forEach((note, index) => {
        note.classList.toggle('measure-start', measureStarts.includes(index));
      });
      applyCalculatedBarlines();
    } catch (error) {
      beatsPerMeasure = 4;
      beatType = 4;
    }
  }

  function ensureFloatingMetronome() {
    if ($('#floatingMetronome')) return;
    const style = document.createElement('style');
    style.textContent = '#floatingMetronome{position:fixed;right:8px;top:118px;bottom:auto;z-index:9998;width:112px;padding:10px 8px 8px;border:3px solid #f5bd45;border-radius:18px;background:#fffdf6;color:#183932;text-align:center;box-shadow:0 12px 30px #07182755;font-weight:900;cursor:grab;user-select:none;touch-action:none}#floatingMetronome.dragging{cursor:grabbing;opacity:.92}#floatingMetronome .case{position:relative;width:52px;height:70px;margin:auto;background:linear-gradient(145deg,#173d36,#0e5145);clip-path:polygon(35% 0,65% 0,100% 100%,0 100%);border-radius:8px}#floatingMetronome .arm{position:absolute;left:25px;bottom:10px;width:3px;height:48px;background:#f5bd45;transform-origin:50% 100%;transform:rotate(-24deg)}#floatingMetronome .weight{position:absolute;left:-6px;top:10px;width:15px;height:15px;border-radius:50%;background:#fff}#floatingMetronome.playing .arm{animation:metronomeSwing var(--beat-duration,750ms) ease-in-out infinite alternate}#floatingMetronome.beat{box-shadow:0 0 0 6px #f5bd4540,0 12px 30px #07182755}#floatingMetronome.accent .case{background:linear-gradient(145deg,#8f283f,#bd3e39)}#floatingMetronome small{display:block;margin-top:5px}@keyframes metronomeSwing{from{transform:rotate(-27deg)}to{transform:rotate(27deg)}}@media(max-width:650px){#floatingMetronome{right:4px;top:96px;width:88px;transform:scale(.88);transform-origin:top right}}';
    document.head.appendChild(style);
    const widget = document.createElement('div');
    widget.id = 'floatingMetronome';
    widget.hidden = true;
    widget.title = 'Arraste para colocar o metrônomo onde preferir';
    widget.innerHTML = '<div class="case"><span class="arm"><span class="weight"></span></span></div><small>Metrônomo <span id="meterLabel">4/4</span></small>';
    document.body.appendChild(widget);
    enableMetronomeDragging(widget);
  }

  function placeDefaultMetronome() {
    const widget = $('#floatingMetronome');
    const controls = $('.controls');
    if (!widget || !controls || widget.dataset.customPosition === '1') return;
    const controlsRectangle = controls.getBoundingClientRect();
    const widgetRectangle = widget.getBoundingClientRect();
    if (controlsRectangle.height < 40 || widgetRectangle.height < 40) return;
    const left = Math.max(4, innerWidth - widgetRectangle.width - 8);
    const top = Math.max(4, controlsRectangle.top + (controlsRectangle.height - widgetRectangle.height) / 2);
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
  }

  function enableMetronomeDragging(widget) {
    try {
      const saved = JSON.parse(localStorage.getItem('escolaLuizMetronomePosition') || 'null');
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        widget.dataset.customPosition = '1';
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
      widget.dataset.customPosition = '1';
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
      document.body.classList.add('music-open');
      hideSchoolHeader();
      requestAnimationFrame(() => {
        scrollTo({top:0, left:0, behavior:'auto'});
        $('#reader')?.scrollIntoView({block:'start', behavior:'auto'});
      });
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
    ensureNoteVolumeControl();
    ensureMetronomeVolumeControl();
    ensureScoreViewControl($('#instrument')?.closest('label') || stopButton);
    ensureRhythmGuide();
    const floatingIndexButton = document.createElement('button');
    floatingIndexButton.id = 'floatingBackToIndex';
    floatingIndexButton.type = 'button';
    floatingIndexButton.className = 'index-return-button';
    floatingIndexButton.textContent = '← Índice de músicas';
    floatingIndexButton.title = 'Voltar ao índice para escolher outra música';
    $('.controls')?.insertAdjacentElement('afterbegin', floatingIndexButton);
    ensureFloatingControls();
    requestAnimationFrame(placeDefaultMetronome);
    addEventListener('resize', placeDefaultMetronome);
    $('#backToIndex')?.addEventListener('click', () => {
      stop();
      document.body.classList.remove('music-open');
      scrollTo({top:0, left:0, behavior:'auto'});
    });
    floatingIndexButton.addEventListener('click', () => $('#backToIndex')?.click());
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
