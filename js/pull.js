// ============================================
// PULL-TO-REFRESH С ФОТОАППАРАТОМ
// ============================================
(function() {
    // Создаём HTML-структуру
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

    // Отключаем нативный pull-to-refresh
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
            // Обновление
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