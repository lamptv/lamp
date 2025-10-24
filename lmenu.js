//menu_filter.js
/*
  Lampa Menu Filter — v1.6 (2025-10-24)
  ТОЛЬКО ЛЕВОЕ БОКОВОЕ МЕНЮ.

  Шаги (в одном плагине):
    1) СНАЧАЛА гарантированно ДОБАВЛЯЕМ пункты: «Позже», «Нравится», «Закладки»
       (как в твоём плагине favorite_buttons: component=favorite, type=wath|like|book).
       — идемпотентно: помечаем их data-mf="wath|like|book" и не дублируем.
       — тексты через Lampa.Lang.translate('title_wath'|'title_like'|'title_book') с RU-фолбэками.
    2) ПОТОМ фильтруем и упорядочиваем левое меню строго так:
       Главная → Каталог → История → Закладки → Нравится → Позже → Фильтр → Фильмы → Сериалы → Релизы
       Остальные пункты удаляем.
    3) Наблюдаем DOM с {childList:true, subtree:true} и применяем (ensure → filter) при любых перестройках.

  Подключение:
    • Добавь этот файл в Lampa как обычный плагин по URL.
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

  // Эквиваленты, которые схлопываем в один ключ
  const EQUIVALENT_KEYS = {
    'Закладки': ['Закладки','Избранное'],
    'Нравится': ['Нравится','Понравившиеся'],
    'Позже'   : ['Позже','Смотреть позже']
  };

  // Селекторы левого меню
  const MENU_ROOT_SELECTOR = '.menu .menu__list';
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

  // ====== Шаг 1: гарантированно добавляем три пункта (Позже / Нравится / Закладки) ======

  function tr(id, fallback){
    try{
      const t = window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate==='function'
        ? Lampa.Lang.translate(id) : '';
      return t && typeof t==='string' && t.trim() ? t : fallback;
    }catch(e){ return fallback; }
  }

  function svgIcon(name){
    // Простые монохромные svg, как в исходном плагине
    if (name==='wath') return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M347.216 301.211l-71.387-53.54V138.609c0-10.966-8.864-19.83-19.83-19.83-10.966 0-19.83 8.864-19.83 19.83v118.978c0 6.246 2.935 12.136 7.932 15.864l79.318 59.489a19.713 19.713 0 0011.878 3.966c6.048 0 11.997-2.717 15.884-7.952 6.585-8.746 4.8-21.179-3.965-27.743z"/><path fill="#fff" d="M256 0C114.833 0 0 114.833 0 256s114.833 256 256 256 256-114.833 256-256S397.167 0 256 0zm0 472.341c-119.275 0-216.341-97.066-216.341-216.341S136.725 39.659 256 39.659c119.295 0 216.341 97.066 216.341 216.341S375.275 472.341 256 472.341z"/></svg>';
    if (name==='like') return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 477.534 477.534"><path fill="#fff" d="M438.482 58.61a130.815 130.815 0 00-95.573-41.711 130.968 130.968 0 00-95.676 41.694l-8.431 8.909-8.431-8.909C181.284 5.762 98.662 2.728 45.832 51.815a130.901 130.901 0 00-6.778 6.778c-52.072 56.166-52.072 142.968 0 199.134l187.358 197.581c6.482 6.843 17.284 7.136 24.127.654.224-.212.442-.43.654-.654l187.29-197.581c52.068-56.16 52.068-142.957-.001-199.117zm-24.695 175.616h-.017L238.802 418.768 63.818 234.226c-39.78-42.916-39.78-109.233 0-152.149 36.125-39.154 97.152-41.609 136.306-5.484a96.482 96.482 0 015.484 5.484l20.804 21.948c6.856 6.812 17.925 6.812 24.781 0l20.804-21.931c36.125-39.154 97.152-41.609 136.306-5.484a96.482 96.482 0 015.484 5.484c40.126 42.984 40.42 109.422 0 152.132z"/></svg>';
    if (name==='book') return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M391.416 0H120.584c-17.778 0-32.242 14.464-32.242 32.242v460.413A19.345 19.345 0 00107.687 512a19.34 19.34 0 0010.169-2.882l138.182-85.312 138.163 84.693a19.307 19.307 0 0019.564.387 19.338 19.338 0 009.892-16.875V32.242C423.657 14.464 409.194 0 391.416 0zm-6.449 457.453l-118.85-72.86a19.361 19.361 0 00-20.28.032l-118.805 73.35V38.69h257.935v418.763z"/></svg>';
    return '';
  }

  function createMenuButton(type, text){
    // Используем тот же HTML-каркас, что и в твоём плагине (li.menu__item.selector)
    const li = document.createElement('li');
    li.className = 'menu__item selector';
    li.setAttribute('data-mf', type); // метка, чтобы не дублировать
    li.innerHTML =
      '<div class="menu__ico">'+ svgIcon(type) +'</div>' +
      '<div class="menu__text">'+ text +'</div>';
    // Навешиваем «hover:enter» как в оригинале
    try {
      if (window.Lampa && typeof Lampa.Activity?.push === 'function'){
        li.addEventListener('hover:enter', function (){
          Lampa.Activity.push({
            url: '',
            title: text,
            component: 'favorite',
            type: type==='wath' ? 'wath' : (type==='like' ? 'like' : 'book'),
            page: 1
          });
        });
      } else {
        // Фолбэк на обычный ENTER (для некоторых сборок)
        li.addEventListener('keydown', function(e){
          if (e.key === 'Enter' || e.keyCode === 13){
            e.preventDefault();
            if (window.Lampa && typeof Lampa.Activity?.push === 'function'){
              Lampa.Activity.push({
                url: '',
                title: text,
                component: 'favorite',
                type: type==='wath' ? 'wath' : (type==='like' ? 'like' : 'book'),
                page: 1
              });
            }
          }
        });
        li.tabIndex = 0;
      }
    } catch(e){}
    return li;
  }

  function ensureFavoriteButtons(root){
    if (!root) return;

    const has = t => !!root.querySelector('[data-mf="'+t+'"]');

    // Тексты (с переводами и фолбэками)
    const txtWath = tr('title_wath','Позже');
    const txtLike = tr('title_like','Нравится');
    const txtBook = tr('title_book','Закладки');

    // Добавляем в конец списка, если отсутствуют
    if (!has('wath')) root.appendChild(createMenuButton('wath', txtWath));
    if (!has('like')) root.appendChild(createMenuButton('like', txtLike));
    if (!has('book')) root.appendChild(createMenuButton('book', txtBook));
  }

  // ====== Шаг 2: фильтруем и упорядочиваем левое меню ======

  function applyMenuFilter(root){
    if (!root) return;

    const items = Array.from(root.querySelectorAll(MENU_ITEM_SELECTOR));
    const present = Object.create(null);

    for (const el of items){
      // Для наших "избранных" кнопок используем уже известные каноны
      const mf = el.getAttribute('data-mf');
      if (mf === 'book'){ present['Закладки'] = present['Закладки'] || el; continue; }
      if (mf === 'like'){ present['Нравится'] = present['Нравится'] || el; continue; }
      if (mf === 'wath'){ present['Позже']    = present['Позже']    || el; continue; }

      const labelNode = el.querySelector('.menu__text') || el;
      const label = labelNode ? labelNode.textContent : '';
      let canonical = canonicalFromLabel(label);
      canonical = collapseEquivalent(canonical);

      if (!canonical || !isInWhitelist(canonical)){
        el.remove();
        continue;
      }
      if (!present[canonical]) present[canonical] = el;
    }

    // Собираем согласно WHITELIST_ORDER
    const frag = document.createDocumentFragment();
    for (const desired of WHITELIST_ORDER){
      const collapsed = collapseEquivalent(desired) || desired;
      const node = present[collapsed];
      if (node) frag.appendChild(node);
    }

    root.innerHTML = '';
    root.appendChild(frag);
  }

  // ====== Инициализация и наблюдение ======

  function onceReady(fn){
    // Если Lampa кидает событие готовности — дождёмся его
    try{
      if (window.appready) { fn(); return; }
      if (window.Lampa && Lampa.Listener && typeof Lampa.Listener.follow==='function'){
        Lampa.Listener.follow('app', function(e){
          if (e.type === 'ready') fn();
        });
        // На случай, если событие уже пройдено:
        setTimeout(fn, 1500);
        return;
      }
    }catch(e){}
    // Фолбэк — запустим через DOMContentLoaded / таймер
    if (document.readyState === 'complete' || document.readyState === 'interactive'){
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  function start(){
    let attachTries = 0;

    const iv = setInterval(()=>{
      const root = document.querySelector(MENU_ROOT_SELECTOR);
      attachTries++;

      if (root){
        clearInterval(iv);

        // Сначала — добавить избранные кнопки, затем — фильтр
        try { ensureFavoriteButtons(root); } catch(e){}
        try { applyMenuFilter(root); } catch(e){}

        // Наблюдатель: ловим и поздние добавления, и глухие перестройки
        const mo = new MutationObserver(()=>{
          // ensure → filter (в таком порядке)
          try { ensureFavoriteButtons(root); } catch(e){}
          try { applyMenuFilter(root); } catch(e){}
        });
        mo.observe(root, { childList:true, subtree:true });

        // Релоад корневого узла меню (если кто-то его заменит)
        const reattach = new MutationObserver(()=>{
          const newRoot = document.querySelector(MENU_ROOT_SELECTOR);
          if (newRoot && newRoot !== root){
            try { ensureFavoriteButtons(newRoot); } catch(e){}
            try { applyMenuFilter(newRoot); } catch(e){}
            mo.disconnect();
            reattach.disconnect();
            const mo2 = new MutationObserver(()=>{
              try { ensureFavoriteButtons(newRoot); } catch(e){}
              try { applyMenuFilter(newRoot); } catch(e){}
            });
            mo2.observe(newRoot, { childList:true, subtree:true });
          }
        });
        reattach.observe(document.body, { childList:true, subtree:true });
      }

      if (attachTries > 300){ // ~30 сек ожидания меню
        clearInterval(iv);
      }
    }, 100);
  }

  onceReady(start);

})();
