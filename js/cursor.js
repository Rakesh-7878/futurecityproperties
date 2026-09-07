/* ==========================================================================
   FUTURECITY PROPERTIES - CUSTOM CURSOR ENGINE
   Dual-Ring Smooth Following Cursor with Magnetic Hover Attraction
   ========================================================================== */

class LuxuryCursor {
    constructor() {
        this.dot = document.querySelector('.custom-cursor-dot');
        this.ring = document.querySelector('.custom-cursor-ring');
        
        if (!this.dot || !this.ring) return;

        this.mousePos = { x: -100, y: -100 };
        this.ringPos = { x: -100, y: -100 };
        this.ease = 0.15;
        this.isHovered = false;

        this.init();
    }

    init() {
        window.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            // Instant dot position
            this.dot.style.transform = `translate(${this.mousePos.x}px, ${this.mousePos.y}px) translate(-50%, -50%)`;
        });

        // Smooth trailing ring animation loop
        this.render();
        this.bindHoverEvents();
    }

    render() {
        this.ringPos.x += (this.mousePos.x - this.ringPos.x) * this.ease;
        this.ringPos.y += (this.mousePos.y - this.ringPos.y) * this.ease;

        this.ring.style.transform = `translate(${this.ringPos.x}px, ${this.ringPos.y}px) translate(-50%, -50%)`;

        requestAnimationFrame(() => this.render());
    }

    bindHoverEvents() {
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .property-card, .feature-card, .map-node');

        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-hover');
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-hover');
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LuxuryCursor();
});
