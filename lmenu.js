//menu_filter.js
/*
  Lampa Menu Filter — v1.4 (2025-01-24)
  ЦЕЛЬ: Работать ТОЛЬКО с ЛЕВЫМ БОКОВЫМ МЕНЮ.
  • Оставить и упорядочить пункты ровно так:
      Главная → Поиск → История → Коллекции → Каталог → Фильтр → Фильмы → Сериалы → Релизы
  • Все остальные пункты левого меню скрыть.
  • «Поиск» сделать фокусируемым и кликабельным.
  • Поддержка ru/en алиасов, пересборки DOM (MutationObserver).
*/

(function(){
  'use strict';

  /*** === КОНФИГ: желаемый порядок ЛЕВОГО МЕНЮ === ***/
  const WHITELIST_ORDER = [
    'Главная',
    'Поиск', 
    'История',
    'Коллекции',
    'Каталог',
    'Фильтр',
    'Фильмы',
    'Сериалы',
    'Релизы'
  ];

  /*** Алиасы: распознаём подписи в разных локалях/сборках ***/
  const ALIASES = {
    'Главная'   : ['Главная','Home','Main'],
    'Поиск'     : ['Поиск','Search'],
    'История'   : ['История','History','Recently watched'],
    'Коллекции' : ['Коллекции','Collections','Подборки','Library'],
    'Каталог'   : ['Каталог','Library','Catalog','Browse'],
    'Фильтр'    : ['Фильтр','Filter','Filters'],
    'Фильмы'    : ['Фильмы','Movies','HD Фильмы','Films','Movie'],
    'Сериалы'   : ['Сериалы','Series','TV Shows','TV'],
    'Релизы'    : ['Релизы','Releases','HD Релизы','HD Releases','New']
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
      if (norm(key) === n) return key;
    }
    return null;
  }

  function isInWhitelist(canonical){
    if (!canonical) return false;
    return WHITELIST_ORDER.some(w => norm(w) === norm(canonical));
  }

  // Улучшенный вызов поиска с приоритетами
  function invokeSearch(){
    console.log('MenuFilter: Opening search...');
    
    // 1) Попробовать через Lampa API если доступно
    try {
      if (window.Lampa && Lampa.Controller) {
        if (typeof Lampa.Controller.toggle === 'function') {
          Lampa.Controller.toggle('search');
          return true;
        }
        if (typeof Lampa.Controller.call === 'function') {
          Lampa.Controller.call('search');
          return true;
        }
      }
      
      // Альтернативные пути через Lampa
      if (window.Lampa && Lampa.search && typeof Lampa.search.open === 'function') {
        Lampa.search.open();
        return true;
      }
      
      if (window.Lampa && Lampa.app && Lampa.app.header && typeof Lampa.app.header.search === 'function') {
        Lampa.app.header.search();
        return true;
      }
      
      if (window.Lampa && Lampa.router) {
        Lampa.router.navigate('search');
        return true;
      }
    } catch(e) {
      console.log('MenuFilter: Lampa API search failed', e);
    }

    // 2) Клик по существующей системной кнопке поиска
    const btnSelectors = [
      '[data-action="search"]',
      '.head__action--search', 
      '.head__search',
      '.header .search',
      '.search-button',
      '.icon-search',
      'button[onclick*="search"]',
      'button[onclick*="Search"]'
    ];
    
    for (const selector of btnSelectors){
      const button = document.querySelector(selector);
      if (button && typeof button.click === 'function'){
        button.click();
        console.log('MenuFilter: Clicked search button via selector:', selector);
        return true;
      }
    }

    // 3) Событие для открытия поиска
    try {
      const searchEvent = new CustomEvent('lampa-search-open', { bubbles: true });
      document.dispatchEvent(searchEvent);
      window.dispatchEvent(searchEvent);
      console.log('MenuFilter: Dispatched search event');
      
      // Дадим время на обработку события
      setTimeout(() => {
        // Проверим, не появилось ли модальное окно поиска
        const searchModal = document.querySelector('.search, .search-modal, [class*="search"]');
        if (!searchModal) {
          // 4) Бэкап: сгенерировать нажатие Slash
          const keyEvent = new KeyboardEvent('keydown', { 
            key: '/', 
            code: 'Slash', 
            keyCode: 191,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(keyEvent);
          console.log('MenuFilter: Dispatched Slash key event');
        }
      }, 100);
      
      return true;
    } catch(e) {
      console.log('MenuFilter: Event dispatch failed', e);
    }

    return false;
  }

  // Создать фокусируемый элемент «Поиск»
  function createSearchItem(){
    const el = document.createElement('div');
    el.className = 'menu__item selector focusable menu-filter__search';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('data-action', 'search');
    el.innerHTML = '<div class="menu__ico">🔍</div><div class="menu__text">Поиск</div>';

    // Обработчики для поиска
    const handleSearch = function(e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ' && e.keyCode !== 13 && e.keyCode !== 32) {
        return;
      }
      
      if (e.type === 'keydown') {
        e.preventDefault();
        e.stopPropagation();
      }
      
      console.log('MenuFilter: Search item activated');
      
      // Сначала дадим время на обработку стандартных обработчиков Lampa
      setTimeout(() => {
        invokeSearch();
      }, 50);
    };

    el.addEventListener('click', handleSearch);
    el.addEventListener('keydown', handleSearch);

    return el;
  }

  // Обновить существующий элемент поиска
  function updateSearchItem(el){
    if (!el._menu_filter_bound) {
      el.classList.add('selector', 'focusable', 'menu-filter__search');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('data-action', 'search');
      
      const handleSearch = function(e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ' && e.keyCode !== 13 && e.keyCode !== 32) {
          return;
        }
        
        if (e.type === 'keydown') {
          e.preventDefault();
          e.stopPropagation();
        }
        
        console.log('MenuFilter: Existing search item activated');
        
        setTimeout(() => {
          invokeSearch();
        }, 50);
      };

      // Удаляем старые обработчики если были
      el.removeEventListener('click', handleSearch);
      el.removeEventListener('keydown', handleSearch);
      
      // Добавляем новые
      el.addEventListener('click', handleSearch);
      el.addEventListener('keydown', handleSearch);
      
      el._menu_filter_bound = true;
    }
    return el;
  }

  function applyMenuFilter(root){
    if (!root) return;

    const items = Array.from(root.querySelectorAll(MENU_ITEM_SELECTOR));
    const present = {};
    let hasSearch = false;

    // Первый проход: собираем нужные пункты
    for (const el of items){
      const labelNode = el.querySelector('.menu__text') || el;
      const label = labelNode ? labelNode.textContent : '';
      const canonical = canonicalFromLabel(label);

      if (!canonical || !isInWhitelist(canonical)){
        el.remove();
        continue;
      }

      if (norm(canonical) === norm('Поиск')) {
        hasSearch = true;
        present[canonical] = updateSearchItem(el);
      } else {
        present[canonical] = el;
      }
    }

    // Создаем новый порядок
    const frag = document.createDocumentFragment();
    
    for (const desired of WHITELIST_ORDER){
      const node = present[desired];
      
      if (node) {
        frag.appendChild(node);
      } else if (norm(desired) === norm('Поиск') && !hasSearch) {
        // Создаем поиск если его нет
        const searchNode = createSearchItem();
        frag.appendChild(searchNode);
        hasSearch = true;
      }
    }

    // Применяем новый порядок
    root.innerHTML = '';
    root.appendChild(frag);
    
    console.log('MenuFilter: Menu filtered successfully');
  }

  function init(){
    let tries = 0;
    const maxTries = 200; // ~20 секунд
    
    const checkMenu = function() {
      const root = document.querySelector(MENU_LIST_SELECTOR);
      tries++;

      if (root){
        try { 
          applyMenuFilter(root); 
          
          // Наблюдаем за изменениями в меню
          const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            for (const mutation of mutations) {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldUpdate = true;
                break;
              }
            }
            if (shouldUpdate) {
              setTimeout(() => {
                try { applyMenuFilter(root); } catch(e) {
                  console.error('MenuFilter: Observer error', e);
                }
              }, 100);
            }
          });
          
          observer.observe(root, { childList: true, subtree: false });
          
          console.log('MenuFilter: Plugin initialized successfully');
        } catch(e) {
          console.error('MenuFilter: Initial filter error', e);
        }
        return true;
      }

      if (tries < maxTries) {
        setTimeout(checkMenu, 100);
      } else {
        console.error('MenuFilter: Menu not found after', maxTries, 'tries');
      }
    };

    // Запускаем проверку
    setTimeout(checkMenu, 100);
  }

  // Запуск плагина
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
