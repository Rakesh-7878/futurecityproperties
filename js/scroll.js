/* ==========================================================================
   FUTURECITY PROPERTIES - SCROLL CONTROLLER
   Scroll Progress Indicator, Back-to-Top trigger & Smooth Anchor Navigation
   ========================================================================== */

class ScrollController {
    constructor() {
        this.progressBar = document.querySelector('.scroll-progress-fill');
        this.backToTopBtn = document.querySelector('.back-to-top');

        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            this.updateProgressBar();
            this.toggleBackToTop();
        });

        this.bindBackToTop();
        this.bindSmoothAnchors();
    }

    updateProgressBar() {
        if (!this.progressBar) return;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (window.scrollY / totalHeight) * 100;
        this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    toggleBackToTop() {
        if (!this.backToTopBtn) return;
        if (window.scrollY > 400) {
            this.backToTopBtn.classList.add('active');
        } else {
            this.backToTopBtn.classList.remove('active');
        }
    }

    bindBackToTop() {
        this.backToTopBtn?.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    bindSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const targetId = anchor.getAttribute('href');
                if (targetId === '#' || !targetId) return;

                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    targetEl.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ScrollController();
});
