//menu_filter.js
/*
  Lampa Menu Filter — v1.2 (2025-10-24)
  ЦЕЛЬ: Работать ТОЛЬКО с ЛЕВЫМ БОКОВЫМ МЕНЮ.
  • Оставить и упорядочить пункты ровно так:
      Главная → Поиск → История → Избранное/Закладки → Каталог → Фильтр → Фильмы → Сериалы → Релизы
  • Все остальные пункты левого меню скрыть.
  • «Поиск» сделать рабочим и фокусируемым; если его нет — добавить.
  • «Избранное» и «Закладки» считаются одним и тем же пунктом (любой из вариантов, если присутствует).
  • Поддержка ru/en алиасов, пересборки DOM (MutationObserver).

  ПОДКЛЮЧЕНИЕ:
  1) Подними HTTP-сервер в папке с файлом (пример):  python3 -m http.server 8000
  2) В Lampa → Настройки → Расширения/Plugins → Добавить плагин → http://<IP>:8000/menu_filter.js
  3) Полностью перезапусти Lampa.
*/

(function(){
  'use strict';

  /*** === КОНФИГ: желаемый порядок ЛЕВОГО МЕНЮ === ***/
  const WHITELIST_ORDER = [
    'Главная',
    'Поиск',
    'История',
    'Избранное',   // или 'Закладки' — см. ALIASES
    'Каталог',
    'Фильтр',
    'Фильмы',
    'Сериалы',
    'Релизы'
  ];

  /*** Алиасы: распознаём подписи в разных локалях/сборках ***/
  const ALIASES = {
    'Главная'   : ['Главная','Home'],
    'Поиск'     : ['Поиск','Search'],
    'История'   : ['История','History','Recently watched'],
    'Избранное' : ['Избранное','Закладки','Favorites','Bookmarks','Favs'],
    'Каталог'   : ['Каталог','Library','Catalog','Browse'],
    'Фильтр'    : ['Фильтр','Filter'],
    'Фильмы'    : ['Фильмы','Movies','HD Фильмы','Films'],
    'Сериалы'   : ['Сериалы','Series','TV Shows'],
    'Релизы'    : ['Релизы','Releases','HD Релизы','HD Releases']
  };

  // Пары «взаимозаменяемых» пунктов: берём любой, но позиционируем как один (для Избранное/Закладки)
  const EQUIVALENT_KEYS = {
    'Избранное': ['Избранное','Закладки']
  };

  // Селекторы ЛЕВОГО МЕНЮ
  const MENU_LIST_SELECTOR = '.menu__list';
  const MENU_ITEM_SELECTOR = '.menu__item, .menu__list > *';

  // Утилиты
  const norm = s => (s ? String(s).trim().toLowerCase() : '');

  function canonicalFromLabel(label){
    const n = norm(label);
    for (const key in ALIASES){
      const arr = ALIASES[key];
      for (let i=0;i<arr.length;i++){
        if (norm(arr[i]) === n) return key;
      }
      // прямое совпадение на случай, если лейбл уже «канонический»
      if (norm(key) === n) return key;
    }
    return null;
  }

  function isInWhitelist(canonical){
    if (!canonical) return false;
    return WHITELIST_ORDER.some(w => norm(w) === norm(canonical));
  }

  // Возвращает «канонический ключ-группу» с учётом эквивалентов (для «Избранное»/«Закладки»)
  function collapseEquivalent(canonical){
    if (!canonical) return null;
    for (const mainKey in EQUIVALENT_KEYS){
      const list = EQUIVALENT_KEYS[mainKey];
      if (list.some(k => norm(k) === norm(canonical))) return mainKey;
    }
    return canonical;
  }

  // Создать фокусируемый элемент «Поиск» (если его нет в меню)
  function createSearchItem(){
    const el = document.createElement('div');
    // Классы под Lampa: делаем фокусируемым и совместимым с навигацией пульта
    el.className = 'menu__item selector focusable menu-filter__search';
    el.setAttribute('tabindex','0');
    el.innerHTML = '<div class="menu__ico">🔍</div><div class="menu__text">Поиск</div>';

    const openSearch = ()=>{
      // 1) Клик по системной кнопке поиска в шапке (если такая есть)
      const headBtn = document.querySelector('.head__search, .head__action--search, [data-action="search"]');
      if (headBtn && typeof headBtn.click === 'function'){ headBtn.click(); return; }
      // 2) Попробовать вызвать контроллер поиска
      try {
        if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function'){
          Lampa.Controller.toggle('search');
          return;
        }
      } catch(e){}
      // 3) Бэкап — сгенерировать клавишу "/"
      const ev = new KeyboardEvent('keydown', { key:'/', code:'Slash', bubbles:true });
      document.dispatchEvent(ev);
    };

    el.addEventListener('click', openSearch);
    el.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === 'OK' || e.keyCode === 13){
        e.preventDefault();
        openSearch();
      }
    });

    return el;
  }

  function applyMenuFilter(root){
    if (!root) return;

    // Собираем текущие пункты
    const items = Array.from(root.querySelectorAll(MENU_ITEM_SELECTOR));

    // Карта: canonicalCollapsed -> DOM-элемент (берём первый найденный подходящий)
    const present = Object.create(null);

    for (const el of items){
      const labelNode = el.querySelector('.menu__text') || el;
      const label = labelNode ? labelNode.textContent : '';
      let canonical = canonicalFromLabel(label);
      canonical = collapseEquivalent(canonical);

      // Если это не нужный пункт — удаляем
      if (!canonical || !isInWhitelist(canonical)){
        el.remove();
        continue;
      }

      // Сохраняем первый встретившийся DOM-элемент для этого канонического ключа
      if (!present[canonical]) present[canonical] = el;
    }

    // Выстраиваем согласно WHITELIST_ORDER
    const frag = document.createDocumentFragment();
    let hasSearch = false;

    for (const desired of WHITELIST_ORDER){
      const desiredCollapsed = collapseEquivalent(desired) || desired;
      const node = present[desiredCollapsed];

      if (norm(desiredCollapsed) === norm('Поиск')) hasSearch = !!node;
      if (node) frag.appendChild(node);
    }

    // Если «Поиск» отсутствовал — добавляем его в нужное место (по позиции в WHITELIST_ORDER)
    if (!hasSearch){
      // Сформируем список узлов в соответствии с текущим фрагментом
      const nodes = Array.from(frag.childNodes);
      const searchIdx = WHITELIST_ORDER.findIndex(x => norm(x) === norm('Поиск'));
      const searchNode = createSearchItem();

      if (searchIdx <= 0 || nodes.length === 0){
        frag.insertBefore(searchNode, frag.firstChild);
      } else if (searchIdx >= nodes.length){
        frag.appendChild(searchNode);
      } else {
        frag.insertBefore(searchNode, nodes[searchIdx]);
      }
    }

    // Перерисовываем меню
    root.innerHTML = '';
    root.appendChild(frag);
  }

  function init(){
    let tries = 0;
    const iv = setInterval(()=>{
      const root = document.querySelector(MENU_LIST_SELECTOR);
      tries++;

      if (root){
        clearInterval(iv);
        try { applyMenuFilter(root); } catch(e){}

        // Наблюдаем за пересборкой меню
        const mo = new MutationObserver(()=>{
          // небольшой debounce — меню иногда пересобирается пачкой
          if (init._t) clearTimeout(init._t);
          init._t = setTimeout(()=>{ try{ applyMenuFilter(root); }catch(e){} }, 60);
        });
        mo.observe(root, { childList:true });
      }

      if (tries > 200){ // ~20 секунд ожидания
        clearInterval(iv);
      }
    }, 100);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);

})();
