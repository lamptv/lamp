//menu_filter.js
/*
  Lampa Menu Filter — v1.4 (2025-10-24)
  ЦЕЛЬ: Работать ТОЛЬКО с ЛЕВЫМ БОКОВЫМ МЕНЮ.
  • Оставить и упорядочить пункты ровно так:
      Главная → Каталог → История → Закладки → Нравится → Позже → Фильтр → Фильмы → Сериалы → Релизы
  • Все остальные пункты левого меню скрыть.
  • Поддержка ru/en алиасов, эквивалентов (например, «Закладки» ⇄ «Избранное»), пересборки DOM (MutationObserver).

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
    'Каталог',
    'История',
    'Закладки',   // эквивалент «Избранное»
    'Нравится',   // эквивалент «Понравившиеся»
    'Позже',      // эквивалент «Смотреть позже»
    'Фильтр',
    'Фильмы',
    'Сериалы',
    'Релизы'
  ];

  /*** Алиасы: распознаём подписи в разных локалях/сборках ***/
  const ALIASES = {
    'Главная'   : ['Главная','Home'],
    'Каталог'   : ['Каталог','Library','Catalog','Browse'],
    'История'   : ['История','History','Recently watched','Watch history','Recents'],
    'Закладки'  : ['Закладки','Избранное','Favorites','Bookmarks','Favs','Favourites'],
    'Нравится'  : ['Нравится','Понравившиеся','Liked','Likes'],
    'Позже'     : ['Позже','Смотреть позже','Watch later','Later'],
    'Фильтр'    : ['Фильтр','Filter'],
    'Фильмы'    : ['Фильмы','Movies','Films','HD Фильмы'],
    'Сериалы'   : ['Сериалы','Series','TV Shows'],
    'Релизы'    : ['Релизы','Releases','HD Релизы','HD Releases']
  };

  // Группы эквивалентов (ключ — каноническое имя, значения — синонимы, которые надо «схлопнуть» в ключ)
  const EQUIVALENT_KEYS = {
    'Закладки': ['Закладки','Избранное'],
    'Нравится': ['Нравится','Понравившиеся'],
    'Позже'   : ['Позже','Смотреть позже']
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
      // точное совпадение с алиасами
      for (let i=0;i<arr.length;i++){
        if (norm(arr[i]) === n) return key;
      }
      // совпадение с самим ключом
      if (norm(key) === n) return key;
    }
    return null;
  }

  function collapseEquivalent(canonical){
    if (!canonical) return null;
    for (const mainKey in EQUIVALENT_KEYS){
      const list = EQUIVALENT_KEYS[mainKey];
      if (list.some(k => norm(k) === norm(canonical))) return mainKey;
    }
    return canonical;
  }

  function isInWhitelist(canonical){
    if (!canonical) return false;
    return WHITELIST_ORDER.some(w => norm(w) === norm(canonical));
  }

  function applyMenuFilter(root){
    if (!root) return;

    // Собираем текущие пункты
    const items = Array.from(root.querySelectorAll(MENU_ITEM_SELECTOR));

    // Карта: canonicalCollapsed -> DOM-элемент (берём первый подходящий)
    const present = Object.create(null);

    for (const el of items){
      const labelNode = el.querySelector('.menu__text') || el;
      const label = labelNode ? labelNode.textContent : '';
      let canonical = canonicalFromLabel(label);
      canonical = collapseEquivalent(canonical);

      // Если не из списка — удаляем
      if (!canonical || !isInWhitelist(canonical)){
        el.remove();
        continue;
      }

      if (!present[canonical]) present[canonical] = el;
    }

    // Выстраиваем согласно WHITELIST_ORDER
    const frag = document.createDocumentFragment();

    for (const desired of WHITELIST_ORDER){
      const collapsed = collapseEquivalent(desired) || desired;
      const node = present[collapsed];
      if (node) frag.appendChild(node);
    }

    // Перерисовываем левое меню
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
