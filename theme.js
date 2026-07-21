/**
 * NIKS ARTPHOTO THEME & BALANCED INTERACTION ENGINE
 * Handles theme toggling, page transitions, scroll reveals, 3D tilts, full-screen lightbox slider, and navigation.
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

        // --- CATEGORY FILTERING WITH STAGGER ---
        const filterBtns = document.querySelectorAll('.filter-btn, .kumo-tab-btn');
        const galleryItems = document.querySelectorAll('.gallery-item, .kumo-gallery-item');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter') || 'all';

                let count = 0;
                galleryItems.forEach(item => {
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
