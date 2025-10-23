//menu_filter.js
/*
  Lampa Menu Filter — v1.3 (2025-10-24)
  ЦЕЛЬ: Работать ТОЛЬКО с ЛЕВЫМ БОКОВЫМ МЕНЮ.
  • Оставить и упорядочить пункты ровно так:
      Главная → Поиск → История → Избранное/Закладки → Каталог → Фильтр → Фильмы → Сериалы → Релизы
  • Все остальные пункты левого меню скрыть.
  • «Поиск» сделать фокусируемым и кликабельным: сперва как штатный элемент (data-action="search"),
    затем надёжные фолбэки (клик по кнопке поиска, Controller.toggle, keydown Slash).
  • Поддержка ru/en алиасов, пересборки DOM (MutationObserver).
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
    'Избранное' : ['Избранное','Закладки','Коллекции','Favorites','Bookmarks','Favs'],
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

  // Надёжный вызов поиска (цепочка вариантов)
  function invokeSearch(){
    // 1) Клик по существующей системной кнопке поиска (если она есть в DOM)
    const btnSelectors = ['[data-action="search"]', '.head__action--search', '.head__search'];
    for (const s of btnSelectors){
      const b = document.querySelector(s);
      if (b && typeof b.click === 'function'){
        b.click();
        return true;
      }
    }
    // 2) Попытка вызвать контроллер
    try {
      if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function'){
        Lampa.Controller.toggle('search');
        return true;
      }
      if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.call === 'function'){
        Lampa.Controller.call('search');
        return true;
      }
    } catch(e){}
    // 3) Бэкап: сгенерировать нажатие Slash
    try{
      const ev = new KeyboardEvent('keydown', { key:'/', code:'Slash', bubbles:true });
      document.dispatchEvent(ev);
      return true;
    }catch(e){}
    return false;
  }

  // Создать фокусируемый элемент «Поиск» (если его нет в меню)
  function createSearchItem(){
    const el = document.createElement('div');
    // Важно: класс selector + data-action="search" — чтобы штатная делегация обработчиков в Lampa сработала
    el.className = 'menu__item selector focusable menu-filter__search';
    el.setAttribute('tabindex','0');
    el.setAttribute('role','button');
    el.setAttribute('data-action','search');
    el.innerHTML = '<div class="menu__ico">🔍</div><div class="menu__text">Поиск</div>';

    // На некоторых сборках делегация может отсутствовать — подстрахуемся своими обработчиками
    el.addEventListener('click', function(){
      // сначала пробуем штатный путь — клик уже прошёл; если сборка не ловит, дергаем цепочку вручную
      setTimeout(()=>{ invokeSearch(); }, 0);
    });

    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === 'OK' || e.keyCode === 13){
        e.preventDefault();
        // отправим click по самому элементу (для делегата), а затем, на всякий случай, вызовем фолбэки
        if (typeof el.click === 'function') el.click();
        setTimeout(()=>{ invokeSearch(); }, 0);
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

      // Если это «Поиск», убедимся, что он имеет нужные классы/атрибуты для делегатов
      if (norm(canonical) === norm('Поиск')){
        el.classList.add('selector','focusable');
        el.setAttribute('tabindex','0');
        el.setAttribute('role','button');
        el.setAttribute('data-action','search');
        // подстраховка на старых сборках
        if (!el._menu_filter_bound){
          el.addEventListener('click', ()=>{ setTimeout(()=>{ invokeSearch(); }, 0); });
          el.addEventListener('keydown', (e)=>{
            if (e.key === 'Enter' || e.key === 'OK' || e.keyCode === 13){
              e.preventDefault();
              if (typeof el.click === 'function') el.click();
              setTimeout(()=>{ invokeSearch(); }, 0);
            }
          });
          el._menu_filter_bound = true;
        }
      }
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
