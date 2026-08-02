/**
 * NIKS ARTPHOTO THEME & BALANCED INTERACTION ENGINE
 * Handles theme toggling, page transitions, scroll reveals, 3D tilts, full-screen lightbox slider, navigation, and help dropdown.
 */

(function () {
    'use strict';

    // ============================================
    // ТЕМЫ: dark, light, green, blue
    // ============================================
    const THEMES = {
        dark: {
            name: 'Тёмная',
            icon: '🌙',
            colors: {
                '--kumo-brand': '#fbbf24',
                '--kumo-brand-glow': 'rgba(251, 191, 36, 0.3)',
                '--kumo-brand-subtle': 'rgba(251, 191, 36, 0.12)',
                '--kumo-canvas': '#0a0a0c',
                '--kumo-hairline': 'rgba(255, 255, 255, 0.08)',
                '--kumo-subtle': '#a1a1aa',
                '--kumo-muted': '#71717a',
                '--kumo-default': '#f4f4f5',
                '--kumo-card-bg': 'rgba(18, 18, 22, 0.6)',
            }
        },
        light: {
            name: 'Светлая',
            icon: '☀️',
            colors: {
                '--kumo-brand': '#f59e0b',
                '--kumo-brand-glow': 'rgba(245, 158, 11, 0.2)',
                '--kumo-brand-subtle': 'rgba(245, 158, 11, 0.08)',
                '--kumo-canvas': '#fafafa',
                '--kumo-hairline': 'rgba(0, 0, 0, 0.08)',
                '--kumo-subtle': '#52525b',
                '--kumo-muted': '#71717a',
                '--kumo-default': '#18181b',
                '--kumo-card-bg': 'rgba(255, 255, 255, 0.6)',
            }
        },
        green: {
            name: 'Зелёная',
            icon: '🌿',
            colors: {
                '--kumo-brand': '#22c55e',
                '--kumo-brand-glow': 'rgba(34, 197, 94, 0.3)',
                '--kumo-brand-subtle': 'rgba(34, 197, 94, 0.12)',
                '--kumo-canvas': '#0a0f0c',
                '--kumo-hairline': 'rgba(255, 255, 255, 0.08)',
                '--kumo-subtle': '#a1a1aa',
                '--kumo-muted': '#71717a',
                '--kumo-default': '#f4f4f5',
                '--kumo-card-bg': 'rgba(18, 22, 18, 0.6)',
            }
        },
        blue: {
            name: 'Синяя',
            icon: '💧',
            colors: {
                '--kumo-brand': '#3b82f6',
                '--kumo-brand-glow': 'rgba(59, 130, 246, 0.3)',
                '--kumo-brand-subtle': 'rgba(59, 130, 246, 0.12)',
                '--kumo-canvas': '#0a0c1a',
                '--kumo-hairline': 'rgba(255, 255, 255, 0.08)',
                '--kumo-subtle': '#a1a1aa',
                '--kumo-muted': '#71717a',
                '--kumo-default': '#f4f4f5',
                '--kumo-card-bg': 'rgba(18, 20, 34, 0.6)',
            }
        }
    };

    // --- ФУНКЦИИ ТЕМ ---
    function getStoredTheme() {
        return localStorage.getItem('theme') || 'dark';
    }

    function setTheme(theme) {
        const themeData = THEMES[theme];
        if (!themeData) return;

        const root = document.documentElement;
        Object.entries(themeData.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        root.setAttribute('data-mode', theme);
        localStorage.setItem('theme', theme);
        updateAllButtons(theme);
    }

    function updateAllButtons(theme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    // ============================================
    // ДОБАВЛЕНИЕ КНОПОК В НАВИГАЦИЮ
    // ============================================
    function addThemeButtons() {
        // Проверяем, есть ли уже кнопки
        if (document.querySelector('.theme-switcher')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'theme-switcher';
        wrapper.style.cssText = `
            display: flex;
            gap: 6px;
            align-items: center;
            padding: 4px 8px;
            border-radius: 40px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--kumo-hairline);
            margin: 0 8px;
            flex-shrink: 0;
        `;

        const themes = [
            { key: 'dark', icon: '🌙', title: 'Тёмная' },
            { key: 'light', icon: '☀️', title: 'Светлая' },
            { key: 'green', icon: '🌿', title: 'Зелёная' },
            { key: 'blue', icon: '💧', title: 'Синяя' },
        ];

        themes.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.dataset.theme = t.key;
            btn.title = t.title;
            btn.textContent = t.icon;
            btn.style.cssText = `
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 2px solid transparent;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                color: var(--kumo-subtle);
                padding: 0;
            `;
            btn.addEventListener('click', () => setTheme(t.key));
            wrapper.appendChild(btn);
        });

        // Ищем куда вставить — ищем .kumo-nav-actions
        let target = document.querySelector('.kumo-nav-actions');
        
        // Если нет .kumo-nav-actions, ищем .nav-container или .navbar
        if (!target) {
            const navbar = document.querySelector('.kumo-navbar');
            if (navbar) {
                const container = navbar.querySelector('.nav-container') || navbar;
                // Создаём actions, если их нет
                target = document.createElement('div');
                target.className = 'kumo-nav-actions';
                target.style.cssText = 'display: flex; align-items: center;';
                container.appendChild(target);
            }
        }

        if (target) {
            target.prepend(wrapper);
        } else {
            // Если совсем ничего нет — вставляем в body
            document.body.prepend(wrapper);
        }

        // Добавляем стили для кнопок
        const style = document.createElement('style');
        style.textContent = `
            .theme-btn.active {
                border-color: var(--kumo-brand);
                background: var(--kumo-brand-subtle);
                color: var(--kumo-brand);
                box-shadow: 0 0 20px var(--kumo-brand-glow);
                transform: scale(1.1);
            }
            .theme-btn:hover {
                transform: scale(1.15);
                border-color: var(--kumo-brand);
            }
            @media (max-width: 768px) {
                .theme-switcher { gap: 4px; padding: 3px 6px; }
                .theme-btn { width: 26px; height: 26px; font-size: 0.7rem; }
            }
        `;
        document.head.appendChild(style);

        // Применяем сохранённую тему
        const stored = getStoredTheme();
        setTheme(stored);
    }

    // ============================================
    // ОСТАЛЬНОЙ КОД (без изменений)
    // ============================================
    // ... (весь остальной код из твоего theme.js: лайтбокс, меню и т.д.)

    // ============================================
    // ЗАПУСК
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        // Добавляем кнопки
        addThemeButtons();

        // Здесь должен быть весь остальной код из твоего theme.js
        // (лайтбокс, мобильное меню, фильтры, анимации и т.д.)
        // Я его не удаляю, просто показываю структуру
    });

})();