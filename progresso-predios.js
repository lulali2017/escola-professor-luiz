(() => {
  let currentLesson = null;
  let closingLesson = false;

  const lessonKey = title => 's52_lesson_' + String(title || 'aula')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const isComplete = title => localStorage.getItem(lessonKey(title)) === '1';
  const pageKey = id => `s52_page_${id}`;
  const buildingPages = {
    partitura: ['school28-orientacao','school28-mundo','school28-acordes','school28-repertorio-interativo','school28-finger-trainer'],
    popular: ['school28-popular','school28-cifradas'],
    tablatura: ['school28-tablatura-curso'],
    outros: ['school28-outros','school28-labs','school28-fingerstyle','school28-accessories','school28-biblioteca','school28-biblioteca-musical']
  };
  const lessonCards = () => [...document.querySelectorAll('.s28-afternoon-card,.s28-popular-card,.s28-deep-card')]
    .filter(card => card.getAttribute('onclick')?.includes('s28OpenLesson'));
  const cardTitle = card => card?.querySelector('b')?.textContent.trim() || '';

  function paintLessonCards() {
    lessonCards().forEach(card => {
      const complete = isComplete(cardTitle(card));
      card.classList.toggle('s52-card-done', complete);
      card.dataset.s52Done = complete ? '1' : '0';
      let control = card.querySelector('.s52-door-check');
      if (!control) {
        control = document.createElement('label');
        control.className = 's52-door-check';
        control.innerHTML = '<input type="checkbox"><span></span>';
        control.addEventListener('click', event => event.stopPropagation());
        control.querySelector('input').addEventListener('change', event => {
          event.stopPropagation();
          const title = cardTitle(card);
          if (event.target.checked) localStorage.setItem(lessonKey(title), '1');
          else localStorage.removeItem(lessonKey(title));
          update();
        });
        card.appendChild(control);
      }
      control.querySelector('input').checked = complete;
      control.querySelector('span').textContent = complete ? 'Completa' : 'Ainda não';
    });
  }

  function curriculumModules() {
    return [...document.querySelectorAll('#cmModules details.cm-module')].map(module => {
      const match = (module.querySelector('.cm-count')?.textContent || '0/1').match(/(\d+)\s*\/\s*(\d+)/);
      const count = match ? Number(match[1]) : 0;
      const total = match ? Number(match[2]) : 1;
      return { count, total, complete: total > 0 && count === total };
    });
  }

  function curriculumStats() {
    const modules = curriculumModules();
    const count = modules.reduce((sum, item) => sum + item.count, 0);
    const total = modules.reduce((sum, item) => sum + item.total, 0) || 72;
    return { count, total, complete: total > 0 && count === total, modules };
  }

  function interactiveStats() {
    const cards = [...document.querySelectorAll('#s28AfternoonLessons .s28-afternoon-card')];
    const count = cards.filter(card => isComplete(cardTitle(card))).length;
    const total = cards.length || 20;
    return { count, total, complete: cards.length > 0 && count === cards.length };
  }

  function floorData() {
    const guided = curriculumStats();
    const interactive = interactiveStats();
    const fundamentalsComplete = localStorage.getItem(pageKey('school28-orientacao')) === '1';
    const resourcePages = ['school28-mundo','school28-acordes','school28-repertorio-interativo','school28-finger-trainer'].filter(id => document.getElementById(id));
    const resourcesComplete = resourcePages.length > 0 && resourcePages.every(id => localStorage.getItem(pageKey(id)) === '1');
    return [
      { name: '1º Fundamentos', detail: fundamentalsComplete ? 'Orientações concluídas' : 'Orientações pendentes', complete: fundamentalsComplete },
      { name: '2º Curso guiado', detail: `${guided.count}/${guided.total} aulas`, complete: guided.complete },
      { name: '3º Aulas interativas', detail: `${interactive.count}/${interactive.total} aulas`, complete: interactive.complete },
      { name: '4º Biblioteca', detail: resourcesComplete ? 'Recursos consultados' : 'Consulta e prática permanente', complete: resourcesComplete }
    ];
  }

  function paintModuleDoors() {
    const stats = curriculumStats();
    document.querySelectorAll('#school28-partitura-curso .s50-module-door').forEach((door, index) => {
      const complete = Boolean(stats.modules[index]?.complete);
      door.classList.toggle('s52-done', complete);
      door.classList.toggle('s52-pending', !complete);
      let stamp = door.querySelector('.s52-stamp');
      if (complete && !stamp) {
        stamp = document.createElement('span');
        stamp.className = 's52-stamp';
        stamp.textContent = '✓ COMPLETO';
        door.appendChild(stamp);
      }
      if (!complete) stamp?.remove();
    });
  }

  function backupPanel() {
    return `<div class="s52-backup">
      <div><strong>🛡️ Cópia de segurança do aluno</strong><small>Guarde o progresso fora do navegador para não perdê-lo ao limpar os dados.</small></div>
      <button type="button" onclick="s52SaveBackup()">💾 Salvar cópia</button>
      <button type="button" onclick="document.getElementById('s52RestoreFile').click()">📂 Restaurar cópia</button>
      <input id="s52RestoreFile" type="file" accept="application/json,.json" hidden onchange="s52RestoreBackup(this)">
    </div>`;
  }

  function progressMap() {
    const building = document.querySelector('#school28-partitura-predio .s49-building');
    if (!building) return;
    let map = document.getElementById('s52ProgressMap');
    if (!map) {
      map = document.createElement('section');
      map.id = 's52ProgressMap';
      map.className = 's52-progress-map';
      const note = building.querySelector('.s50-floor-note');
      note?.insertAdjacentElement('afterend', map) || building.prepend(map);
    }
    const floors = floorData();
    const progress = buildingStats('partitura');
    const count = progress.count;
    const total = progress.total;
    const percent = total ? Math.round(count / total * 100) : 0;
    const signature = JSON.stringify({ floors, percent });
    if (map.dataset.signature === signature) return;
    map.dataset.signature = signature;
    map.innerHTML = `<div class="s52-progress-head"><div><h2>🏫 Painel de progresso do prédio</h2><span>Verde: concluído · Azul: ainda falta</span></div><b style="--p:${percent}%">${percent}%</b></div>
      <div class="s52-progress-floors">${floors.map(floor => `<div class="s52-progress-floor ${floor.complete ? 'done' : ''}"><strong>${floor.name}</strong><small>${floor.detail}</small></div>`).join('')}</div>
      ${backupPanel()}`;
  }

  function paintGuide() {
    const guide = document.getElementById('s51BuildingGuide');
    if (!guide || !/Partitura/i.test(guide.querySelector('h2')?.textContent || '')) return;
    const floors = floorData();
    guide.querySelectorAll('.s51-floor').forEach((floor, index) => {
      if (!floors[index]) return;
      floor.classList.toggle('s52-floor-done', floors[index].complete);
      floor.classList.toggle('s52-floor-pending', !floors[index].complete);
    });
  }

  window.s52PaintGuide = paintGuide;

  function checkedStats(selectors) {
    const inputs = [...document.querySelectorAll(selectors)].filter(input => !input.disabled);
    const count = inputs.filter(input => input.checked).length;
    return { count, total: inputs.length, complete: inputs.length > 0 && count === inputs.length };
  }

  function pageStats(key) {
    const pages = (buildingPages[key] || []).filter(id => document.getElementById(id));
    const count = pages.filter(id => localStorage.getItem(pageKey(id)) === '1').length;
    return { count, total: pages.length };
  }

  function buildingStats(key) {
    const pages = pageStats(key);
    if (key === 'partitura') {
      const guided = curriculumStats();
      const interactive = interactiveStats();
      const count = guided.count + interactive.count + pages.count;
      const total = guided.total + interactive.total + pages.total;
      return { count, total, complete: total > 0 && count === total };
    }
    const selectors = {
      popular: '#school28-popular input[type="checkbox"],#school28-cifradas input[type="checkbox"]',
      tablatura: '#school28-tablatura-curso input[type="checkbox"],#school28-labs input[type="checkbox"]',
      outros: '#school28-outros input[type="checkbox"],#school28-fingerstyle input[type="checkbox"]'
    };
    const checks = checkedStats(selectors[key] || 'input.s52-never');
    const count = checks.count + pages.count;
    const total = checks.total + pages.total;
    return { count, total, complete: total > 0 && count === total };
  }

  function pageCompletionWidget() {
    const page = document.querySelector('#campusV273 .school28-page.active');
    const excluded = !page || ['school28-home','school28-hall'].includes(page.id);
    let widget = document.getElementById('s52PageCompletion');
    if (excluded) {
      widget?.classList.remove('open');
      return;
    }
    if (!widget) {
      widget = document.createElement('aside');
      widget.id = 's52PageCompletion';
      widget.innerHTML = '<small>PROGRESSO DESTA SALA</small><strong></strong><label><input type="checkbox"><span>Ainda não concluída</span></label>';
      document.body.appendChild(widget);
      widget.querySelector('input').addEventListener('change', event => {
        const id = widget.dataset.pageId;
        if (!id) return;
        if (event.target.checked) localStorage.setItem(pageKey(id), '1');
        else localStorage.removeItem(pageKey(id));
        update();
      });
    }
    const title = page.querySelector('.school28-roomhead h1,.s49-building h1,.school28-brand small,h1')?.textContent?.trim() || 'Sala atual';
    const complete = localStorage.getItem(pageKey(page.id)) === '1';
    widget.dataset.pageId = page.id;
    widget.querySelector('strong').textContent = title;
    widget.querySelector('input').checked = complete;
    widget.querySelector('span').textContent = complete ? '✓ Concluída' : 'Ainda não concluída';
    widget.classList.toggle('done', complete);
    widget.classList.add('open');
  }

  function paintBuildingBoards() {
    document.querySelectorAll('#school28-hall .s28-final-hall > .school28-door[data-s51-building]').forEach(card => {
      const key = card.dataset.s51Building;
      const stats = buildingStats(key);
      const percent = stats.total ? Math.round(stats.count / stats.total * 100) : 0;
      let board = card.querySelector('.s52-building-board');
      if (!board) {
        board = document.createElement('div');
        board.className = 's52-building-board';
        card.appendChild(board);
      }
      board.classList.toggle('done', stats.complete);
      board.innerHTML = `<span>QUADRO DE AVISOS</span><strong>${percent}%</strong><small>${stats.complete ? '✓ COMPLETO' : `${stats.count}/${stats.total || '—'} concluídas`}</small>`;
      const celebrationKey = `s52_celebrated_${key}`;
      if (stats.complete && localStorage.getItem(celebrationKey) !== '1') {
        localStorage.setItem(celebrationKey, '1');
        showCelebration(key);
      }
      if (!stats.complete) localStorage.removeItem(celebrationKey);
    });
  }

  function showCelebration(key) {
    const names = {
      partitura: 'Partitura e Violão Clássico',
      popular: 'Cifras e Violão Popular',
      tablatura: 'Tablatura',
      outros: 'Ferramentas e Salas'
    };
    let celebration = document.getElementById('s52Celebration');
    if (!celebration) {
      celebration = document.createElement('div');
      celebration.id = 's52Celebration';
      document.body.appendChild(celebration);
    }
    celebration.innerHTML = `<div class="s52-balloons" aria-hidden="true">${['🎈','🎈','🎈','🎈','🎈','🎈','🎈','🎈'].map((balloon, index) => `<i style="--i:${index}">${balloon}</i>`).join('')}</div><section><div class="s52-party-icons">🎉🏆🎊</div><h2>Parabéns!</h2><h3>Você completou 100% do prédio<br>${names[key] || 'da Escola Professor Luiz'}!</h3><p>Seu esforço, sua dedicação e sua constância produziram resultado. Continue praticando e fazendo a música florescer.</p><strong>Que Deus continue abençoando seus estudos!</strong><button type="button" onclick="document.getElementById('s52Celebration').classList.remove('open')">Continuar na escola</button></section>`;
    celebration.classList.add('open');
  }

  function update() {
    paintLessonCards();
    paintModuleDoors();
    progressMap();
    paintGuide();
    paintBuildingBoards();
    pageCompletionWidget();
  }

  function completionPrompt() {
    let box = document.getElementById('s52CompletePrompt');
    if (!box) {
      box = document.createElement('div');
      box.id = 's52CompletePrompt';
      box.innerHTML = `<section class="s52-prompt"><img src="assets/aulas_classicas/assistente_positivo.png" alt="Assistente da escola"><h2>Aula encerrada</h2><p id="s52PromptText"></p><div class="s52-prompt-actions"><button class="s52-yes" onclick="s52FinishLesson(true)">✓ Marcar como completa</button><button class="s52-no" onclick="s52FinishLesson(false)">Ainda não</button></div></section>`;
      document.body.appendChild(box);
    }
    document.getElementById('s52PromptText').textContent = `Você concluiu “${currentLesson?.title || 'esta aula'}” e conseguiu realizar o exercício?`;
    box.classList.add('open');
  }

  window.s52FinishLesson = complete => {
    if (currentLesson) {
      if (complete) localStorage.setItem(lessonKey(currentLesson.title), '1');
      else localStorage.removeItem(lessonKey(currentLesson.title));
    }
    document.getElementById('s52CompletePrompt')?.classList.remove('open');
    currentLesson = null;
    closingLesson = true;
    window.s28CloseLesson?.();
    closingLesson = false;
    update();
  };

  function wrapLessons() {
    if (typeof window.s28OpenLesson !== 'function' || window.s28OpenLesson.s52) return;
    const originalOpen = window.s28OpenLesson;
    const originalClose = window.s28CloseLesson;
    function openLesson(file, title) {
      currentLesson = { file, title: String(title || '').replace(/^(Aula|Capítulo|Oficina)\s+\d+\s*-\s*/i, '') };
      return originalOpen.apply(this, arguments);
    }
    openLesson.s52 = true;
    window.s28OpenLesson = openLesson;
    window.s28CloseLesson = function () {
      const viewer = document.getElementById('s28LessonViewer');
      if (!closingLesson && currentLesson && viewer?.classList.contains('open')) {
        viewer.classList.remove('open');
        document.body.style.overflow = '';
        completionPrompt();
        return;
      }
      return originalClose?.apply(this, arguments);
    };
  }

  function wrapGuide() {
    if (typeof window.s51ShowGuide !== 'function' || window.s51ShowGuide.s52) return;
    const original = window.s51ShowGuide;
    const wrapped = function () {
      original.apply(this, arguments);
      setTimeout(paintGuide, 0);
    };
    wrapped.s52 = true;
    window.s51ShowGuide = wrapped;
  }

  function wrapPageNavigation() {
    if (typeof window.school28Show !== 'function' || window.school28Show.s52Progress) return;
    const original = window.school28Show;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      setTimeout(update, 0);
      setTimeout(update, 120);
      return result;
    };
    wrapped.s52Progress = true;
    window.school28Show = wrapped;
  }

  function removeSecondCorridorNavigation() {
    document.querySelectorAll('.school28-top .school28-btn').forEach(button => {
      if (/segundo corredor/i.test(button.textContent || '')) button.remove();
    });
  }

  function backupData() {
    const data = { application: 'Escola Professor Luiz', version: 1, savedAt: new Date().toISOString(), localStorage: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      data.localStorage[name] = localStorage.getItem(name);
    }
    return JSON.stringify(data, null, 2);
  }

  window.s52SaveBackup = async () => {
    const content = backupData();
    const suggestedName = `progresso-escola-professor-luiz-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({ suggestedName, types: [{ description: 'Cópia de segurança da Escola', accept: { 'application/json': ['.json'] } }] });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        link.download = suggestedName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }
      alert('Cópia salva. Guarde este arquivo em Documentos ou Downloads.');
    } catch (error) {
      if (error?.name !== 'AbortError') alert('Não foi possível salvar a cópia neste aparelho.');
    }
  };

  window.s52RestoreBackup = input => {
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.localStorage || typeof data.localStorage !== 'object') throw new Error('Formato inválido');
        Object.entries(data.localStorage).forEach(([name, value]) => localStorage.setItem(name, String(value)));
        alert('Progresso restaurado com sucesso. A página será atualizada.');
        location.reload();
      } catch (_) {
        alert('Este arquivo não é uma cópia válida da Escola Professor Luiz.');
      }
    };
    reader.readAsText(file);
    input.value = '';
  };

  function start() {
    wrapLessons();
    wrapGuide();
    wrapPageNavigation();
    removeSecondCorridorNavigation();
    update();
    document.addEventListener('change', event => {
      if (event.target.matches('.cm-check,input[data-k],input[data-path]')) setTimeout(update, 80);
    });
    window.addEventListener('pageshow', update);
    window.addEventListener('hashchange', () => setTimeout(update, 50));
    setInterval(() => { wrapLessons(); wrapGuide(); wrapPageNavigation(); removeSecondCorridorNavigation(); update(); }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
