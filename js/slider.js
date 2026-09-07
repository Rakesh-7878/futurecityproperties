/* ==========================================================================
   FUTURECITY PROPERTIES - CAROUSEL & SLIDER ENGINE
   Native smooth scroll & snap slider for properties & customer video testimonials
   ========================================================================== */

class LuxurySlider {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.track = this.container.querySelector('.slider-track');
        this.slides = this.container.querySelectorAll('.slider-slide');
        this.prevBtn = this.container.querySelector('.slider-prev');
        this.nextBtn = this.container.querySelector('.slider-next');
        this.dotsContainer = this.container.querySelector('.slider-dots');

        // Apply native scrolling to track
        if (this.track) {
            this.track.style.overflowX = 'auto';
            this.track.style.scrollSnapType = 'x mandatory';
            this.track.style.scrollBehavior = 'smooth';
            this.track.style.msOverflowStyle = 'none'; 
            this.track.style.scrollbarWidth = 'none';
            this.track.style.transition = 'none'; 
            this.track.style.transform = 'none';
            
            // Hide webkit scrollbar
            const style = document.createElement('style');
            style.textContent = `
                ${containerSelector} .slider-track::-webkit-scrollbar { display: none; }
            `;
            document.head.appendChild(style);
        }

        this.slides.forEach(slide => {
            slide.style.scrollSnapAlign = 'start';
            slide.style.flexShrink = '0';
        });

        this.init();
    }

    init() {
        this.createDots();
        this.bindEvents();
        // Update dots on native scroll
        if (this.track) {
            this.track.addEventListener('scroll', () => {
                this.updateDotsOnScroll();
            }, { passive: true });
        }
        // Initial dot update
        setTimeout(() => this.updateDotsOnScroll(), 100);
    }

    createDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        this.slides.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.classList.add('slider-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this.goToSlide(i));
            this.dotsContainer.appendChild(dot);
        });
    }

    updateDotsOnScroll() {
        if (!this.dotsContainer || !this.track || !this.slides.length) return;
        const scrollLeft = this.track.scrollLeft;
        
        // Find closest slide
        let closestIndex = 0;
        let minDistance = Infinity;
        
        this.slides.forEach((slide, i) => {
            const distance = Math.abs((slide.offsetLeft - this.track.offsetLeft) - scrollLeft);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        });
        
        const dots = this.dotsContainer.querySelectorAll('.slider-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === closestIndex);
        });
    }

    goToSlide(index) {
        if (!this.track || !this.slides[index]) return;
        const targetScroll = this.slides[index].offsetLeft - this.track.offsetLeft;
        this.track.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    nextSlide() {
        if (!this.track) return;
        const currentScroll = this.track.scrollLeft;
        let targetScroll = currentScroll;
        
        for (let i = 0; i < this.slides.length; i++) {
            const slideLeft = this.slides[i].offsetLeft - this.track.offsetLeft;
            if (slideLeft > currentScroll + 10) { 
                targetScroll = slideLeft;
                break;
            }
        }
        
        // Loop back if at the end
        if (targetScroll === currentScroll) {
            targetScroll = 0;
        }
        
        this.track.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    prevSlide() {
        if (!this.track) return;
        const currentScroll = this.track.scrollLeft;
        let targetScroll = currentScroll;
        
        for (let i = this.slides.length - 1; i >= 0; i--) {
            const slideLeft = this.slides[i].offsetLeft - this.track.offsetLeft;
            if (slideLeft < currentScroll - 10) {
                targetScroll = slideLeft;
                break;
            }
        }
        
        // Loop to end if at the start
        if (targetScroll === currentScroll) {
            targetScroll = this.slides[this.slides.length - 1].offsetLeft - this.track.offsetLeft;
        }
        
        this.track.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    bindEvents() {
        this.nextBtn?.addEventListener('click', () => this.nextSlide());
        this.prevBtn?.addEventListener('click', () => this.prevSlide());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LuxurySlider('.property-slider');
    new LuxurySlider('.testimonial-slider');
});
