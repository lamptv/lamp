// Lampa plugin: menu_filter.js
// Фильтрация пунктов левого меню с добавлением поиска
(function() {
    'use strict';
    
    // Белый список пунктов меню (в нужном порядке)
    const WHITE_LIST = [
        'Главная',   // существует
        'Поиск',     // нужно создать и привязать действие
        'История',   // существует
        'Коллекции', // существует
        'Каталог',   // существует
        'Фильтр',    // существует
        'Фильмы',    // существует
        'Сериалы',   // существует
        'Релизы'     // существует
    ];
    
    // Сопоставление ключей с различными названиями
    const MENU_ITEMS_MAP = {
        'Главная': ['главная', 'home', 'main', 'начало'],
        'Поиск': ['поиск', 'search', 'искать', 'найти'],
        'История': ['история', 'history', 'последние', 'недавние'],
        'Коллекции': ['коллекции', 'collections', 'подборки', 'collection'],
        'Каталог': ['каталог', 'catalog', 'категории', 'categories'],
        'Фильтр': ['фильтр', 'filter', 'фильтрация', 'filters'],
        'Фильмы': ['фильмы', 'movies', 'кино', 'films', 'movie'],
        'Сериалы': ['сериалы', 'tv', 'series', 'телесериалы', 'serial'],
        'Релизы': ['релизы', 'releases', 'новинки', 'новые']
    };
    
    let applied = false;
    
    function createSearchMenuItem() {
        return {
            id: 'search',
            name: 'Поиск',
            icon: 'search',
            component: 'search',
            on_click: function() {
                openSearch();
            }
        };
    }
    
    function openSearch() {
        try {
            // Способ 1: через глобальные методы Lampa
            if (window.lampa && window.lampa.search) {
                if (typeof window.lampa.search.open === 'function') {
                    window.lampa.search.open();
                    return;
                }
            }
            
            // Способ 2: через компонент хедера
            if (window.lampa && window.lampa.app && window.lampa.app.header) {
                if (typeof window.lampa.app.header.search === 'function') {
                    window.lampa.app.header.search();
                    return;
                }
            }
            
            // Способ 3: через событие
            const searchEvent = new Event('lampa-search-open');
            window.dispatchEvent(searchEvent);
            
            // Способ 4: пытаемся найти кнопку поиска в DOM и кликнуть
            setTimeout(() => {
                const searchButtons = document.querySelectorAll([
                    '.header .search',
                    '.header [onclick*="search"]',
                    '.header [data-action="search"]',
                    '.icon-search',
                    '.search-icon'
                ].join(','));
                
                if (searchButtons.length > 0) {
                    searchButtons[0].click();
                } else {
                    // Если кнопка не найдена, пробуем открыть через роутинг
                    if (window.lampa && window.lampa.router) {
                        window.lampa.router.navigate('search');
                    }
                }
            }, 100);
            
        } catch (error) {
            console.error('Lampa menu_filter: Ошибка при открытии поиска', error);
        }
    }
    
    function initializePlugin() {
        if (applied) return;
        
        // Ищем объект меню в различных возможных местах
        const menuTargets = [
            window.lampa?.app?.left_menu?.items,
            window.lampa?.left_menu?.items,
            window.app?.left_menu?.items,
            window.lampa?.menus?.left?.items
        ];
        
        for (let target of menuTargets) {
            if (target && Array.isArray(target)) {
                patchMenuArray(target);
                applied = true;
                console.log('Lampa menu_filter: Меню успешно отфильтровано');
                break;
            }
        }
        
        // Дублирующая проверка через секунду на случай динамической загрузки
        setTimeout(() => {
            if (!applied) {
                const delayedTarget = window.lampa?.app?.left_menu?.items;
                if (delayedTarget && Array.isArray(delayedTarget)) {
                    patchMenuArray(delayedTarget);
                    applied = true;
                }
            }
        }, 1000);
    }
    
    function patchMenuArray(menuArray) {
        if (!menuArray || !menuArray.length) return;
        
        // Создаем карту для быстрого поиска по ключам/названиям
        const menuMap = new Map();
        
        // Сначала собираем все пункты в карту
        menuArray.forEach((item, index) => {
            if (!item) return;
            
            const key = findItemKey(item);
            if (key) {
                menuMap.set(key, item);
            }
        });
        
        // Фильтруем и упорядочиваем согласно белому списку
        const filteredMenu = [];
        
        WHITE_LIST.forEach(key => {
            if (key === 'Поиск') {
                // Добавляем кастомный пункт поиска
                const searchItem = createSearchMenuItem();
                filteredMenu.push(searchItem);
            } else {
                const menuItem = menuMap.get(key);
                if (menuItem) {
                    filteredMenu.push(menuItem);
                }
            }
        });
        
        // Очищаем оригинальный массив и добавляем отфильтрованные пункты
        menuArray.length = 0;
        filteredMenu.forEach(item => menuArray.push(item));
    }
    
    function findItemKey(menuItem) {
        if (!menuItem) return null;
        
        // Пробуем получить ключ из различных свойств
        const possibleKeys = [
            menuItem.id,
            menuItem.name,
            menuItem.component,
            menuItem.key,
            menuItem.title
        ];
        
        for (let key of possibleKeys) {
            if (!key) continue;
            
            const keyStr = String(key).toLowerCase();
            
            // Ищем совпадение в нашей карте MENU_ITEMS_MAP
            for (let [validKey, aliases] of Object.entries(MENU_ITEMS_MAP)) {
                if (aliases.some(alias => keyStr.includes(alias.toLowerCase()))) {
                    return validKey;
                }
            }
        }
        
        return null;
    }
    
    // Запускаем плагин когда Lampa загружена
    if (window.lampa) {
        initializePlugin();
    } else {
        window.addEventListener('lampa-loaded', initializePlugin);
    }
    
    // Дополнительная инициализация при полной загрузке страницы
    document.addEventListener('DOMContentLoaded', initializePlugin);
    
    // Экспортируем функции для ручного управления при необходимости
    window.lampaMenuFilter = {
        reapply: initializePlugin,
        getWhiteList: () => [...WHITE_LIST],
        setWhiteList: (newList) => {
            WHITE_LIST.length = 0;
            WHITE_LIST.push(...newList);
            initializePlugin();
        },
        openSearch: openSearch
    };
    
    console.log('Lampa menu_filter: Плагин загружен и ожидает инициализации');
    
})();
