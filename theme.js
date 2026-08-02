/**
 * NIKS ARTPHOTO THEME & BALANCED INTERACTION ENGINE
 * Handles theme toggling, page transitions, scroll reveals, 3D tilts, full-screen lightbox slider, navigation, and help dropdown.
 */

(function () {
    'use strict';

    // --- THEME ENGINE ---
    function getStoredTheme() {
        return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark');
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-mode', theme);
        localStorage.setItem('theme', theme);
        updateThemeToggleIcons(theme);
    }

    function updateThemeToggleIcons(theme) {
        document.querySelectorAll('.kumo-theme-toggle').forEach(btn => {
            btn.innerHTML = theme === 'dark' 
                ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="13" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>` 
                : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            btn.setAttribute('title', theme === 'dark' ? 'Светлая тема (Press D)' : 'Темная тема (Press D)');
        });
    }

    // Apply theme immediately
    setTheme(getStoredTheme());

    document.addEventListener('DOMContentLoaded', () => {
        // Init theme toggles
        document.querySelectorAll('.kumo-theme-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-mode') || 'dark';
                setTheme(current === 'dark' ? 'light' : 'dark');
            });
        });

        // Key shortcut 'd' to toggle theme
        document.addEventListener('keydown', (e) => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return;
            if (e.key?.toLowerCase() === 'd') {
                const current = document.documentElement.getAttribute('data-mode') || 'dark';
                setTheme(current === 'dark' ? 'light' : 'dark');
            }
        });

        // --- KUMO DROPDOWN MENU ENGINE ---
        document.querySelectorAll('.kumo-dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.kumo-dropdown-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = dropdown.classList.contains('open');
                    document.querySelectorAll('.kumo-dropdown').forEach(d => d.classList.remove('open'));
                    if (!isOpen) {
                        dropdown.classList.add('open');
                    }
                });
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.kumo-dropdown')) {
                document.querySelectorAll('.kumo-dropdown').forEach(d => d.classList.remove('open'));
            }
        });

        // --- MOBILE SIDEBAR DRAWER & NAVIGATION ---
        const mobileBtn = document.querySelector('.kumo-mobile-toggle');
        let sidebar = document.querySelector('.kumo-sidebar');
        let overlay = document.querySelector('.kumo-sidebar-overlay');

        function closeSidebar() {
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (mobileBtn) {
            mobileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (sidebar) sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('open');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        // Direct, bulletproof navigation for mobile sidebar links
        document.querySelectorAll('.kumo-sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                    e.preventDefault();
                    window.location.href = href;
                }
            });
        });

        // --- GENERAL PAGE TRANSITION ANIMATIONS ON TAB CLICK ---
        document.querySelectorAll('a[href]').forEach(link => {
            if (link.closest('.kumo-sidebar-nav')) return; // Skip sidebar links safely
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                link.addEventListener('click', (e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    
                    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
                    if (href === currentPath) return;

                    e.preventDefault();
                    document.body.classList.add('page-leaving');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 180);
                });
            }
        });

        // --- NAVBAR SCROLL STATE ---
        const navbar = document.querySelector('.kumo-navbar');
        if (navbar) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 30) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }, { passive: true });
        }

        // --- FULLSCREEN LIGHTBOX & GALLERY SLIDER ---
        // Purge any stale lightbox instances
        document.querySelectorAll('.kumo-lightbox').forEach(el => el.remove());

        const lightbox = document.createElement('div');
        lightbox.className = 'kumo-lightbox';
        lightbox.innerHTML = `
            <button class="kumo-lightbox-close" aria-label="Close">
                <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <button class="kumo-lightbox-prev" aria-label="Previous">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="kumo-lightbox-next" aria-label="Next">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <div class="kumo-lightbox-content">
                <img class="kumo-lightbox-img" src="" alt="Full view">
            </div>
            <div class="kumo-lightbox-counter">1 / 1</div>
        `;
        document.body.appendChild(lightbox);

        const lightboxImg = lightbox.querySelector('.kumo-lightbox-img');
        const lightboxClose = lightbox.querySelector('.kumo-lightbox-close');
        const lightboxPrev = lightbox.querySelector('.kumo-lightbox-prev');
        const lightboxNext = lightbox.querySelector('.kumo-lightbox-next');
        const lightboxCounter = lightbox.querySelector('.kumo-lightbox-counter');

        let currentGalleryImages = [];
        let currentImageIndex = 0;

        function updateLightboxImage(index) {
            if (!currentGalleryImages || currentGalleryImages.length === 0) return;
            if (index < 0) index = currentGalleryImages.length - 1;
            if (index >= currentGalleryImages.length) index = 0;

            currentImageIndex = index;
            const targetImg = currentGalleryImages[currentImageIndex];
            if (!targetImg) return;

            lightboxImg.style.opacity = '1';
            lightboxImg.style.display = 'block';
            lightboxImg.src = targetImg.src;
            lightboxImg.alt = targetImg.alt || `Фото ${index + 1}`;
            
            if (lightboxCounter) {
                lightboxCounter.textContent = `${index + 1} / ${currentGalleryImages.length}`;
            }
        }

        function openLightbox(index = 0) {
            const visibleImgs = Array.from(document.querySelectorAll('.kumo-gallery-item:not(.hidden) img, .gallery-item:not(.hidden) img'));
            currentGalleryImages = visibleImgs.length > 0 ? visibleImgs : Array.from(document.querySelectorAll('img'));
            
            updateLightboxImage(index);
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
        if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            updateLightboxImage(currentImageIndex - 1);
        });
        if (lightboxNext) lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            updateLightboxImage(currentImageIndex + 1);
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('kumo-lightbox-content')) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('open')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') updateLightboxImage(currentImageIndex - 1);
            if (e.key === 'ArrowRight') updateLightboxImage(currentImageIndex + 1);
        });

        // Bind click event to all gallery items
        function bindGalleryClickHandlers() {
            const items = document.querySelectorAll('.gallery-item, .kumo-gallery-item');
            items.forEach((item) => {
                item.style.cursor = 'pointer';
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const visibleImgs = Array.from(document.querySelectorAll('.kumo-gallery-item:not(.hidden) img, .gallery-item:not(.hidden) img'));
                    const itemImg = item.querySelector('img');
                    const idx = visibleImgs.indexOf(itemImg);
                    openLightbox(idx >= 0 ? idx : 0);
                });
            });
        }

        bindGalleryClickHandlers();

        // --- CATEGORY FILTERING & SORTING WITH STAGGER ---
        const filterBtns = document.querySelectorAll('.filter-btn, .kumo-tab-btn');
        const filterableItems = document.querySelectorAll('.gallery-item, .kumo-gallery-item, .blog-card');

        // Auto-sort blog posts by date descending (newest first)
        const blogGrid = document.querySelector('.blog-grid');
        if (blogGrid) {
            const blogCards = Array.from(blogGrid.querySelectorAll('.blog-card'));
            blogCards.sort((a, b) => {
                const dateA = a.getAttribute('data-date') || '';
                const dateB = b.getAttribute('data-date') || '';
                return dateB.localeCompare(dateA);
            });
            blogCards.forEach(card => blogGrid.appendChild(card));
        }

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter') || 'all';

                let count = 0;
                filterableItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    if (filter === 'all' || category === filter) {
                        item.style.display = '';
                        item.classList.remove('hidden');
                        item.style.animation = 'none';
                        item.offsetHeight; // Reflow
                        item.style.animation = `kumoFadeScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${count * 0.03}s forwards`;
                        count++;
                    } else {
                        item.style.display = 'none';
                        item.classList.add('hidden');
                    }
                });
            });
        });

        // --- SCROLL REVEAL OBSERVER ---
        const revealElements = document.querySelectorAll('.kumo-card, .kumo-gallery-item, .blog-card, section h2, .hero-content');
        revealElements.forEach((el, index) => {
            el.classList.add('kumo-reveal');
            if (index % 3 === 1) el.classList.add('delay-1');
            if (index % 3 === 2) el.classList.add('delay-2');
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.kumo-reveal').forEach(el => observer.observe(el));

        // --- SUBTLE DESKTOP TILT PARALLAX ---
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) {
            document.querySelectorAll('.kumo-card, .hero-image-card').forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = (e.clientX - rect.left - rect.width / 2) / 25;
                    const y = (e.clientY - rect.top - rect.height / 2) / 25;
                    card.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-4px)`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                });
            });
        }
    });
})();
// ============================================
// PULL-TO-REFRESH С ФОТОАППАРАТОМ (добавлен в theme.js)
// ============================================
(function() {
    // Добавляем HTML
    const container = document.createElement('div');
    container.className = 'pull-container';
    container.id = 'pullContainer';
    container.innerHTML = `
        <div class="pull-spinner" id="pullSpinner">
            <span class="camera-icon" id="pullIcon">📸</span>
        </div>
    `;
    document.body.prepend(container);

    // Добавляем CSS
    const style = document.createElement('style');
    style.textContent = `
        .pull-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 0;
            overflow: visible;
            pointer-events: none;
            transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pull-container.active {
            height: 80px;
            pointer-events: auto;
        }
        .pull-spinner {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: rgba(18, 18, 22, 0.85);
            backdrop-filter: blur(12px);
            border: 2px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateY(-20px) scale(0.8);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        }
        .pull-container.active .pull-spinner {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        .pull-spinner .camera-icon {
            font-size: 1.8rem;
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pull-spinner .camera-icon.spinning {
            animation: spinCamera 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pull-spinner .camera-icon.loading {
            animation: loadingSpin 1.2s linear infinite;
        }
        @keyframes spinCamera {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.2); }
            100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes loadingSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
            .pull-spinner { width: 48px; height: 48px; }
            .pull-spinner .camera-icon { font-size: 1.5rem; }
            .pull-container.active { height: 68px; }
        }
        @media (max-width: 400px) {
            .pull-spinner { width: 40px; height: 40px; }
            .pull-spinner .camera-icon { font-size: 1.2rem; }
            .pull-container.active { height: 56px; }
        }
    `;
    document.head.appendChild(style);

    // ===== ЛОГИКА =====
    const containerEl = document.getElementById('pullContainer');
    const spinnerEl = document.getElementById('pullSpinner');
    const iconEl = document.getElementById('pullIcon');

    let startY = 0;
    let isPulling = false;
    let isRefreshing = false;

    document.body.style.overscrollBehavior = 'none';

    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0 && window.scrollY === 0) {
            const progress = Math.min(diff / 150, 1);
            containerEl.style.height = (progress * 80) + 'px';

            const scale = 0.8 + progress * 0.2;
            spinnerEl.style.transform = `translateY(0) scale(${scale})`;
            spinnerEl.style.opacity = Math.min(1, progress * 1.2);

            iconEl.style.transform = `rotate(${progress * 180}deg) scale(${1 + progress * 0.15})`;

            if (progress >= 0.9) {
                iconEl.classList.add('spinning');
            } else {
                iconEl.classList.remove('spinning');
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (!isPulling || isRefreshing) {
            isPulling = false;
            return;
        }

        const currentY = e.changedTouches[0].clientY;
        const diff = currentY - startY;

        if (diff > 130) {
            isRefreshing = true;
            iconEl.className = 'camera-icon loading';
            containerEl.classList.add('active');

            setTimeout(() => {
                iconEl.className = 'camera-icon spinning';
                setTimeout(() => {
                    iconEl.className = 'camera-icon';
                    containerEl.classList.remove('active');
                    containerEl.style.height = '0';
                    isRefreshing = false;
                    window.location.reload();
                }, 400);
            }, 1200);
        } else {
            containerEl.style.height = '0';
            spinnerEl.style.transform = 'translateY(-20px) scale(0.8)';
            spinnerEl.style.opacity = '0';
            iconEl.className = 'camera-icon';
        }

        isPulling = false;
    }, { passive: true });
})();