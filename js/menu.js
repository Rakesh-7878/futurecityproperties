/* ==========================================================================
   FUTURECITY PROPERTIES - NAVIGATION & MENU CONTROLLER
   Sticky Glass Header, Mobile Nav Drawer & Active Page Detection
   ========================================================================== */

class MenuController {
    constructor() {
        this.header = document.querySelector('.header');
        this.hamburgerBtn = document.querySelector('.hamburger-btn');
        this.mobileDrawer = document.querySelector('.mobile-drawer');
        this.drawerOverlay = document.querySelector('.mobile-drawer-overlay');
        this.navLinks = document.querySelectorAll('.nav-link, .mobile-nav-links a');

        this.init();
    }

    init() {
        this.handleScroll();
        this.setActivePage();
        this.bindEvents();
    }

    handleScroll() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.header?.classList.add('scrolled');
            } else {
                this.header?.classList.remove('scrolled');
            }
        });
    }

    setActivePage() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        this.navLinks.forEach(link => {
            const linkPath = link.getAttribute('href')?.split('/').pop();
            if (linkPath === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    bindEvents() {
        this.hamburgerBtn?.addEventListener('click', () => this.toggleDrawer());
        this.drawerOverlay?.addEventListener('click', () => this.closeDrawer());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileDrawer?.classList.contains('open')) {
                this.closeDrawer();
            }
        });
    }

    toggleDrawer() {
        this.hamburgerBtn?.classList.toggle('active');
        this.mobileDrawer?.classList.toggle('open');
        this.drawerOverlay?.classList.toggle('active');
        document.body.style.overflow = this.mobileDrawer?.classList.contains('open') ? 'hidden' : '';
    }

    closeDrawer() {
        this.hamburgerBtn?.classList.remove('active');
        this.mobileDrawer?.classList.remove('open');
        this.drawerOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MenuController();
});
