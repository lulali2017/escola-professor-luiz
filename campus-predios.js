(() => {
  const buildings = {
    partitura: { title: 'Prédio Partitura e Violão Clássico', image: 'assets/assistente-apontando.jpg', floors: [['1º','Fundamentos','Postura, instrumento, acessórios e sistemas musicais','school28-partitura-predio'],['2º','Curso guiado','Currículo Mestre dividido em 17 salas','school28-partitura-curso'],['3º','Aulas interativas','Uma porta para cada aula de partitura','school28-partitura-aulas'],['4º','Biblioteca e laboratórios','Partituras, dicionário de acordes e treinador','school28-partitura-recursos']] },
    popular: { title: 'Prédio Cifras e Violão Popular', image: 'assets/professor-em-pe.jpg', floors: [['T','Curso de cifras','Notas, acordes, ritmo e harmonia','school28-popular'],['1º','Instrumentos adaptados','Ukulele, cavaquinho, viola, baixo e percussão','school28-popular'],['2º','Repertório popular','Músicas cifradas e acompanhamento','school28-cifradas']] },
    tablatura: { title: 'Prédio Tablatura', image: 'assets/assistente-acenando.jpg', floors: [['T','Fundamentos','Cordas, casas, números e símbolos','school28-tablatura-curso'],['1º','Técnicas','Ligados, slides, bends e ritmo','school28-tablatura-curso'],['2º','Laboratórios','Vídeo, captura, revisão e impressão','school28-labs']] },
    outros: { title: 'Prédio de Ferramentas e Salas', image: 'assets/professor-pegando-violao.jpg', floors: [['T','Salas complementares','Leitura, músicas pelo mundo e orientação','school28-outros'],['1º','Ferramentas','Afinação, ritmo, captura e apoio','school28-labs'],['2º','Fingerstyle','Baixo, harmonia e melodia juntos','school28-fingerstyle']] }
  };

  function getModal() {
    let modal = document.getElementById('s51BuildingGuide');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 's51BuildingGuide';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.addEventListener('click', event => {
        if (event.target === modal) closeModal();
      });
      document.body.appendChild(modal);
    }
    return modal;
  }

  function closeModal() {
    document.getElementById('s51BuildingGuide')?.classList.remove('open');
    document.body.classList.remove('s51-map-open');
  }

  window.s51ShowGuide = key => {
    const building = buildings[key];
    if (!building) return;
    const modal = getModal();
    modal.dataset.building = key;
    modal.innerHTML = `<section class="s51-guide-card"><header class="s51-guide-head"><img src="${building.image}" alt="Guia do prédio"><div><h2>${building.title}</h2><p>Consulte o mapa e escolha o andar desejado.</p></div><button type="button" class="s51-guide-close" aria-label="Fechar mapa">×</button></header><div class="s51-diagram">${building.floors.map(floor => `<div class="s51-floor"><b>${floor[0]}</b><span><strong>${floor[1]}</strong><small>${floor[2]}</small></span><button type="button" data-destination="${floor[3]}">Visitar</button></div>`).join('')}</div></section>`;
    modal.classList.add('open');
    document.body.classList.add('s51-map-open');
    modal.querySelector('.s51-guide-close').onclick = closeModal;
    modal.querySelectorAll('[data-destination]').forEach(button => button.onclick = () => {
      closeModal();
      window.school28Show?.(button.dataset.destination);
    });
    setTimeout(() => window.s52PaintGuide?.(), 0);
  };

  function installButtons() {
    const hall = document.querySelector('#school28-hall .s28-final-hall');
    if (!hall) return false;
    const cards = [...hall.querySelectorAll(':scope > .school28-door')];
    const keys = ['partitura', 'popular', 'tablatura', 'outros'];
    cards.slice(0, 4).forEach((card, index) => {
      card.dataset.s51Building = keys[index];
      let trigger = card.querySelector('.s51-guide-trigger');
      if (!trigger) {
        trigger = document.createElement('span');
        trigger.className = 's51-guide-trigger';
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('aria-label', 'Ver mapa deste prédio');
        trigger.textContent = '🧭';
        card.appendChild(trigger);
      }
      trigger.dataset.building = keys[index];
    });
    return cards.length >= 4;
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('.s51-guide-trigger');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    window.s51ShowGuide(trigger.dataset.building);
  }, true);
  document.addEventListener('keydown', event => {
    const trigger = event.target.closest?.('.s51-guide-trigger');
    if (!trigger || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    window.s51ShowGuide(trigger.dataset.building);
  }, true);

  function start() {
    installButtons();
    let attempts = 0;
    const timer = setInterval(() => {
      if (installButtons() || ++attempts > 80) clearInterval(timer);
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
