/* ==========================================================================
   FUTURECITY PROPERTIES - ANIMATED STAT COUNTER
   Counts upward smoothly when stat cards intersect viewport
   ========================================================================== */

class StatCounter {
    constructor() {
        this.counters = document.querySelectorAll('.stat-counter');
        this.init();
    }

    init() {
        if (!this.counters.length) return;

        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.startCounting(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, observerOptions);

        this.counters.forEach(counter => observer.observe(counter));
    }

    startCounting(el) {
        const target = parseInt(el.getAttribute('data-target'), 10) || 0;
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000; // 2 seconds
        const frameDuration = 1000 / 60;
        const totalFrames = Math.round(duration / frameDuration);

        let frame = 0;

        const countTimer = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            // Ease out expo
            const currentCount = Math.round(target * (1 - Math.pow(2, -10 * progress)));

            el.textContent = `${prefix}${currentCount}${suffix}`;

            if (frame === totalFrames) {
                clearInterval(countTimer);
                el.textContent = `${prefix}${target}${suffix}`;
            }
        }, frameDuration);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StatCounter();
});
