//menu_filter.js
/*
  Lampa Menu Filter — v1.5 (2025-10-24)
  ТОЛЬКО ЛЕВОЕ БОКОВОЕ МЕНЮ.

  ЦЕЛЬ:
    • Оставить и упорядочить пункты ровно так:
        Главная → Каталог → История → Закладки → Нравится → Позже → Фильтр → Фильмы → Сериалы → Релизы
    • Все остальные пункты левого меню скрыть.
    • Не удалять динамически добавляемые пункты из других плагинов (напр. favorite_buttons / want_like_book),
      которые под именами (переводами) «Закладки», «Нравится», «Позже» появляются ПОСЛЕ старта приложения.

  ОТЛИЧИЯ v1.5:
    • Наблюдатель меню c {childList:true, subtree:true}: ловим поздние добавления пунктов другими плагинами.
    • Расширенные алиасы: «Закладки» ⇄ «Избранное», «Нравится» ⇄ «Понравившиеся», «Позже» ⇄ «Смотреть позже», и англ. варианты.
    • Без обработки «Поиска» — он полностью убран по запросу.

  ПОДКЛЮЧЕНИЕ:
    1) Подними HTTP-сервер (пример):  python3 -m http.server 8000
    2) Lampa → Настройки → Расширения/Plugins → Добавить плагин → http://<IP>:8000/menu_filter.js
    3) Полностью перезапусти Lampa.
*/

(function(){
  'use strict';

  /*** === ЖЕЛАЕМЫЙ ПОРЯДОК ЛЕВОГО МЕНЮ === ***/
  const WHITELIST_ORDER = [
    'Главная',
    'Каталог',
    'История',
    'Закладки',  // эквивалент «Избранное»
    'Нравится',  // эквивалент «Понравившиеся»
    'Позже',     // эквивалент «Смотреть позже»
    'Фильтр',
    'Фильмы',
    'Сериалы',
    'Релизы'
  ];

  /*** Алиасы: распознаём подписи в разных локалях/сборках ***/
  const ALIASES = {
    'Главная'  : ['Главная','Home'],
    'Каталог'  : ['Каталог','Library','Catalog','Browse'],
    'История'  : ['История','History','Recently watched','Watch history','Recents'],
    'Закладки' : ['Закладки','Избранное','Favorites','Bookmarks','Favs','Favourites'],
    'Нравится' : ['Нравится','Понравившиеся','Liked','Likes','Like'],
    'Позже'    : ['Позже','Смотреть позже','Watch later','Later','To watch'],
    'Фильтр'   : ['Фильтр','Filter'],
    'Фильмы'   : ['Фильмы','Movies','Films','HD Фильмы','HD Movies'],
    'Сериалы'  : ['Сериалы','Series','TV Shows','Shows'],
    'Релизы'   : ['Релизы','Releases','HD Релизы','HD Releases']
  };

  // Группы эквивалентов (ключ — каноническое имя, значения — «синонимы», схлопываемые в ключ)
  const EQUIVALENT_KEYS = {
    'Закладки': ['Закладки','Избранное'],
    'Нравится': ['Нравится','Понравившиеся'],
    'Позже'   : ['Позже','Смотреть позже']
  };

  // Селекторы левого меню
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

    // Текущие пункты
    const items = Array.from(root.querySelectorAll(MENU_ITEM_SELECTOR));

    // Карта: canonicalCollapsed -> DOM-элемент (берём первый подходящий)
    const present = Object.create(null);

    for (const el of items){
      const labelNode = el.querySelector('.menu__text') || el;
      const label = labelNode ? labelNode.textContent : '';
      let canonical = canonicalFromLabel(label);
      canonical = collapseEquivalent(canonical);

      // Удаляем всё, что не входит в белый список
      if (!canonical || !isInWhitelist(canonical)){
        el.remove();
        continue;
      }
      if (!present[canonical]) present[canonical] = el;
    }

    // Выстраиваем по WHITELIST_ORDER
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

        // Первичное применение (если пункты уже есть)
        try { applyMenuFilter(root); } catch(e){}

        // Наблюдаем за поздними добавлениями (другими плагинами)
        // ВАЖНО: subtree:true — чтобы ловить любые изменения внутри списка
        const mo = new MutationObserver(()=>{
          // debounce — меню иногда собирается пачкой
          if (init._t) clearTimeout(init._t);
          init._t = setTimeout(()=>{ try{ applyMenuFilter(root); }catch(e){} }, 60);
        });
        mo.observe(root, { childList:true, subtree:true });

        // Доп. страховка: если другой плагин правит MENU_LIST заново, найдём новый root
        const reattach = new MutationObserver(()=>{
          const newRoot = document.querySelector(MENU_LIST_SELECTOR);
          if (newRoot && newRoot !== root){
            try { applyMenuFilter(newRoot); } catch(e){}
            mo.disconnect();
            reattach.disconnect();
            // Повесим наблюдатель уже на новую ноду
            const mo2 = new MutationObserver(()=>{
              if (init._t2) clearTimeout(init._t2);
              init._t2 = setTimeout(()=>{ try{ applyMenuFilter(newRoot); }catch(e){} }, 60);
            });
            mo2.observe(newRoot, { childList:true, subtree:true });
          }
        });
        reattach.observe(document.body, { childList:true, subtree:true });
      }

      if (tries > 200){ // ~20 секунд ожидания меню
        clearInterval(iv);
      }
    }, 100);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);

})();
