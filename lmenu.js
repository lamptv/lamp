//menu_filter.js
/*
  Lampa Menu Filter — v1.0 (2025-10-24)
  Оставляет только нужные пункты левого меню в заданном порядке и добавляет пункт «Поиск».
  Белый список по умолчанию: ["Поиск","Фильмы","Сериалы","Каталог","История","Релизы"].

  Как работает:
  - Ждёт появления DOM-элемента левого меню ('.menu__list'), затем:
      * удаляет все пункты, не входящие в белый список,
      * переставляет оставшиеся согласно порядку в белом списке,
      * если пункта «Поиск» в меню нет — добавляет его в самое начало; по клику вызывает штатную кнопку поиска ('.head__search').
  - Повторяет процедуру при каждом пересборе меню через MutationObserver.
  - Не трогает парсеры/источники; только DOM меню.

  Подключение:
  1) Подними локальный HTTP-сервер, чтобы отдать этот файл по сети (пример: `python3 -m http.server 8000` в папке с файлом).
  2) В Lampa: Настройки → Расширения/Plugins → Добавить плагин → укажи URL вида:
       http://<IP_твоей_машины>:8000/menu_filter.js
  3) Перезапусти Lampa. Готово.
*/

(function(){
  'use strict';

  /*** === НАСТРОЙКИ === ***/
  // Пункты и порядок, которые ДОЛЖНЫ остаться в левом меню
  var WHITELIST = [
    'Поиск',
    'Фильмы',
    'Сериалы',
    'Каталог',
    'История',
    'Релизы'
  ];

  // Синонимы/варианты названий для разных локалей (key = "нормализованное имя", values = возможные подписи)
  var ALIASES = {
    'Поиск'   : ['Поиск','Search'],
    'Фильмы'  : ['Фильмы','Movies','Фильмы HD','HD Фильмы'],
    'Сериалы' : ['Сериалы','Series','TV Shows'],
    'Каталог' : ['Каталог','Library','Catalog','Browse'],
    'История' : ['История','History','Recently watched'],
    'Релизы'  : ['Релизы','Releases','HD Релизы','HD Releases']
  };

  // Селекторы меню
  var MENU_LIST_SELECTOR = '.menu__list';
  var MENU_ITEM_SELECTOR = '.menu__item, .menu__list > *';

  // --- Утилиты ---
  function normalizeLabel(text){
    if (!text) return '';
    return String(text).trim().toLowerCase();
  }

  function matchToCanonical(label){
    var norm = normalizeLabel(label);
    for (var canonical in ALIASES){
      var arr = ALIASES[canonical];
      for (var i=0;i<arr.length;i++){
        if (normalizeLabel(arr[i]) === norm) return canonical;
      }
    }
    for (var canonical2 in ALIASES){
      if (normalizeLabel(canonical2) === norm) return canonical2;
    }
    return null;
  }

  function allowed(canonical){
    if (!canonical) return false;
    for (var i=0;i<WHITELIST.length;i++){
      if (normalizeLabel(WHITELIST[i]) === normalizeLabel(canonical)) return true;
    }
    return false;
  }

  // Создаём пункт «Поиск», если его нет
  function createSearchItem(){
    var li = document.createElement('div');
    li.className = 'menu__item focusable menu-filter__search';
    li.setAttribute('tabindex','0');
    li.innerHTML = '<div class="menu__ico">🔍</div><div class="menu__text">Поиск</div>';

    var openSearch = function(){
      var headBtn = document.querySelector('.head__search, .head__action--search, [data-action="search"]');
      if (headBtn && typeof headBtn.click === 'function'){
        headBtn.click();
        return;
      }
      try{
        if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function'){
          Lampa.Controller.toggle('search');
          return;
        }
      }catch(e){}
      var ev = new KeyboardEvent('keydown', { key: '/', code: 'Slash', bubbles: true });
      document.dispatchEvent(ev);
    };

    li.addEventListener('click', openSearch);
    li.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === 'OK' || e.keyCode === 13) {
        e.preventDefault();
        openSearch();
      }
    });

    return li;
  }

  // Основная логика фильтрации/упорядочивания
  function applyMenuFilter(root){
    if (!root) return;

    var items = Array.prototype.slice.call(root.querySelectorAll(MENU_ITEM_SELECTOR));
    var present = {};

    items.forEach(function(el){
      var labelNode = el.querySelector('.menu__text') || el;
      var text = labelNode ? labelNode.textContent : '';
      var canonical = matchToCanonical(text);

      if (!canonical || !allowed(canonical)) {
        el.remove();
        return;
      }
      if (!present[canonical]) present[canonical] = el;
    });

    var fragment = document.createDocumentFragment();
    var hasSearch = false;

    WHITELIST.forEach(function(name){
      var canon = matchToCanonical(name) || name;
      var node = present[canon];

      if (normalizeLabel(canon) === normalizeLabel('Поиск')) {
        hasSearch = !!node;
      }
      if (node) fragment.appendChild(node);
    });

    if (!hasSearch){
      fragment.insertBefore(createSearchItem(), fragment.firstChild);
    }

    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(fragment);
  }

  // Ожидание появления меню и отслеживание его пересборки
  function waitMenuAndApply(){
    var tries = 0;
    var iv = setInterval(function(){
      var root = document.querySelector(MENU_LIST_SELECTOR);
      tries++;

      if (root){
        clearInterval(iv);
        try { applyMenuFilter(root); } catch(e){}

        var mo = new MutationObserver(function(){
          try {
            if (waitMenuAndApply._t) clearTimeout(waitMenuAndApply._t);
            waitMenuAndApply._t = setTimeout(function(){ applyMenuFilter(root); }, 50);
          } catch(e){}
        });
        mo.observe(root, { childList: true, subtree: false });
      }

      if (tries > 200) { // ~20 секунд ожидания
        clearInterval(iv);
      }
    }, 100);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(waitMenuAndApply, 0);
  } else {
    document.addEventListener('DOMContentLoaded', waitMenuAndApply);
  }

})();
