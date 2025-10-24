//menu_filter.js
/*
  Lampa Menu Filter — v1.7 (2025-10-24)
  ТОЛЬКО ЛЕВОЕ БОКОВОЕ МЕНЮ.

  Шаги (в одном плагине, строго по просьбе пользователя):
    1) СНАЧАЛА — БЕЗ ИЗМЕНЕНИЙ вставляем рабочий плагин добавления пунктов:
       «Позже» (favorite/wath), «Нравится» (favorite/like), «Закладки» (favorite/book).
    2) ПОТОМ — лёгкая одноразовая фильтрация и упорядочивание левого меню:
       Главная → Каталог → История → Закладки → Нравится → Позже → Фильтр → Фильмы → Сериалы → Релизы
       Остальные пункты удаляются.
    3) НИКАКИХ тяжёлых наблюдателей и бесконечных перестроек. Только 2 мягких прохода по таймеру.

  Подключение: добавьте этот файл как плагин по URL в Lampa.
*/

(function(){
  'use strict';

  /*** === ЧАСТЬ 1. Ровно твой рабочий плагин (без изменений) — добавляет три пункта === ***/
  (function () {
      'use strict';

      function startPlugin() {
        window.plugin_want_ready = true;

        function add() {

          var button_wath = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" x=\"0\" y=\"0\" viewBox=\"0 0 512 512\" xml:space=\"preserve\"><path fill=\"#fff\" d=\"M347.216 301.211l-71.387-53.54V138.609c0-10.966-8.864-19.83-19.83-19.83-10.966 0-19.83 8.864-19.83 19.83v118.978c0 6.246 2.935 12.136 7.932 15.864l79.318 59.489a19.713 19.713 0 0011.878 3.966c6.048 0 11.997-2.717 15.884-7.952 6.585-8.746 4.8-21.179-3.965-27.743z\"/><path fill=\"#fff\" d=\"M256 0C114.833 0 0 114.833 0 256s114.833 256 256 256 256-114.833 256-256S397.167 0 256 0zm0 472.341c-119.275 0-216.341-97.066-216.341-216.341S136.725 39.659 256 39.659c119.295 0 216.341 97.066 216.341 216.341S375.275 472.341 256 472.341z\"/></svg>\n            </div>\n            <div class=\"menu__text\">".concat(Lampa.Lang.translate('title_wath'), "</div>\n        </li>"));
          button_wath.on('hover:enter', function () {        
            Lampa.Activity.push({
              url: '',
              title: Lampa.Lang.translate('title_wath'),
              component: 'favorite',
              type: 'wath',
              page: 1
            });        
          });
          $('.menu .menu__list').eq(0).append(button_wath);

          var button_like = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" x=\"0\" y=\"0\" viewBox=\"0 0 477.534 477.534\" xml:space=\"preserve\"><path fill=\"#fff\" d=\"M438.482 58.61a130.815 130.815 0 00-95.573-41.711 130.968 130.968 0 00-95.676 41.694l-8.431 8.909-8.431-8.909C181.284 5.762 98.662 2.728 45.832 51.815a130.901 130.901 0 00-6.778 6.778c-52.072 56.166-52.072 142.968 0 199.134l187.358 197.581c6.482 6.843 17.284 7.136 24.127.654.224-.212.442-.43.654-.654l187.29-197.581c52.068-56.16 52.068-142.957-.001-199.117zm-24.695 175.616h-.017L238.802 418.768 63.818 234.226c-39.78-42.916-39.78-109.233 0-152.149 36.125-39.154 97.152-41.609 136.306-5.484a96.482 96.482 0 015.484 5.484l20.804 21.948c6.856 6.812 17.925 6.812 24.781 0l20.804-21.931c36.125-39.154 97.152-41.609 136.306-5.484a96.482 96.482 0 015.484 5.484c40.126 42.984 40.42 109.422 0 152.132z\"/></svg>\n            </div>\n            <div class=\"menu__text\">".concat(Lampa.Lang.translate('title_like'), "</div>\n        </li>"));
          button_like.on('hover:enter', function () {        
            Lampa.Activity.push({
              url: '',
              title: Lampa.Lang.translate('title_like'),
              component: 'favorite',
              type: 'like',
              page: 1
            });        
          });
          $('.menu .menu__list').eq(0).append(button_like);

          var button_book = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" x=\"0\" y=\"0\" viewBox=\"0 0 512 512\" xml:space=\"preserve\"><path fill=\"#fff\" d=\"M391.416 0H120.584c-17.778 0-32.242 14.464-32.242 32.242v460.413A19.345 19.345 0 00107.687 512a19.34 19.34 0 0010.169-2.882l138.182-85.312 138.163 84.693a19.307 19.307 0 0019.564.387 19.338 19.338 0 009.892-16.875V32.242C423.657 14.464 409.194 0 391.416 0zm-6.449 457.453л-118.85-72.86a19.361 19.361 0 00-20.28.032л-118.805 73.35V38.69h257.935v418.763z\"/></svg>\n            </div>\n            <div class=\"menu__text\">".concat(Lampa.Lang.translate('title_book'), "</div>\n        </li>"));
          button_book.on('hover:enter', function () {        
            Lampa.Activity.push({
              url: '',
              title: Lampa.Lang.translate('title_book'),
              component: 'favorite',
              type: 'book',
              page: 1
            });        
          });
          $('.menu .menu__list').eq(0).append(button_book);
          
        }

        if (window.appready) add(); else {
          Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') add();
          });
        }
      }

      if (!window.plugin_want_ready) startPlugin();

  })();

  /*** === ЧАСТЬ 2. Лёгкая одноразовая фильтрация и упорядочивание левого меню === ***/

  // Желаемый порядок
  const ORDER = [
    'Главная',
    'Каталог',
    'История',
    'Закладки',  // = «Избранное»
    'Нравится',  // = «Понравившиеся»
    'Позже',     // = «Смотреть позже»
    'Фильтр',
    'Фильмы',
    'Сериалы',
    'Релизы'
  ];

  // Алиасы для распознавания подписей (ru/en)
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

  // Учитываем текущие переводы Lampa для «Позже/Нравится/Закладки», чтобы распознать именно эти пункты
  function withRuntimeAliases(){
    try{
      const t = (k,f)=>{ try{ const s=Lampa.Lang.translate(k)||''; return s.trim()||f; }catch(e){return f;} };
      const tw = t('title_wath','Позже');
      const tl = t('title_like','Нравится');
      const tb = t('title_book','Закладки');
      if (ALIASES['Позже'].indexOf(tw)  <0) ALIASES['Позже'].push(tw);
      if (ALIASES['Нравится'].indexOf(tl)<0) ALIASES['Нравится'].push(tl);
      if (ALIASES['Закладки'].indexOf(tb)<0) ALIASES['Закладки'].push(tb);
    }catch(e){}
  }

  const norm = s => (s ? String(s).trim().toLowerCase() : '');
  function toCanonical(label){
    const n = norm(label);
    for (const key in ALIASES){
      const list = ALIASES[key];
      for (let i=0;i<list.length;i++){
        if (norm(list[i]) === n) return key;
      }
      if (norm(key) === n) return key;
    }
    return null;
  }

  function filterOnce(){
    try{
      withRuntimeAliases();

      const $root = $('.menu .menu__list').eq(0);
      const root = $root && $root.length ? $root[0] : document.querySelector('.menu .menu__list, .menu__list');
      if (!root) return;

      const items = Array.from(root.children);
      const keepMap = Object.create(null);

      // Пройдёмся по текущим пунктам и оставим только те, что в ORDER
      for (const el of items){
        const labelNode = el.querySelector('.menu__text') || el;
        const label = labelNode ? labelNode.textContent : '';
        const canonical = toCanonical(label);
        if (!canonical || ORDER.every(o => norm(o)!==norm(canonical))){
          // удалить лишнее
          el.remove();
          continue;
        }
        if (!keepMap[canonical]) keepMap[canonical] = el; // сохраняем первый найденный
      }

      // Перестановка по заданному порядку (без innerHTML = '')
      for (const name of ORDER){
        const node = keepMap[name];
        if (node){
          // если узел уже в нужном месте — append его просто переместит в конец; нам важна последовательность,
          // поэтому добавляем по порядку — это сформирует точный порядок.
          root.appendChild(node);
        }
      }
    }catch(e){}
  }

  // Два лёгких прохода: после готовности приложения и повтор через 1200 мс (чтобы поймать поздние вставки)
  function kick(){
    filterOnce();
    setTimeout(filterOnce, 1200);
  }

  // Ждём готовности Lampa (если есть событие), иначе — DOMContentLoaded
  try{
    if (window.appready) kick();
    else if (window.Lampa && Lampa.Listener && typeof Lampa.Listener.follow==='function'){
      Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') kick(); });
      // страховка, если событие уже прошло
      setTimeout(kick, 1500);
    } else {
      if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(kick, 600);
      else document.addEventListener('DOMContentLoaded', ()=>setTimeout(kick,600));
    }
  }catch(e){
    // на всякий — последний фолбэк
    setTimeout(kick, 1200);
  }

})();
