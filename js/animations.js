/* ==========================================================================
   FUTURECITY PROPERTIES - ANIMATION ENGINE (LIGHT THEME)
   IntersectionObserver Reveals, Ambient Particle Canvas & Parallax
   ========================================================================== */

class AnimationEngine {
    constructor() {
        this.initScrollReveals();
        this.initAmbientCanvas();
        this.initMouseParallax();
    }

    initScrollReveals() {
        const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .stagger-parent');

        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.15
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    obs.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));
    }

    initAmbientCanvas() {
        const canvas = document.getElementById('ambientCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const particles = [];
        const particleCount = 35;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3
            });
        }

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(184, 134, 11, ${p.alpha})`;
                ctx.fill();
            });

            requestAnimationFrame(render);
        };

        render();
    }

    initMouseParallax() {
        const parallaxItems = document.querySelectorAll('[data-parallax]');

        window.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth) - 0.5;
            const mouseY = (e.clientY / window.innerHeight) - 0.5;

            parallaxItems.forEach(item => {
                const speed = parseFloat(item.getAttribute('data-parallax')) || 20;
                const moveX = mouseX * speed;
                const moveY = mouseY * speed;
                item.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnimationEngine();
});
