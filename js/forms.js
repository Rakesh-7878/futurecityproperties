/* ==========================================================================
   FUTURECITY PROPERTIES - FORM CONTROLLER & TOAST ENGINE
   Validation, Float Inputs, Schedule Site Visit Modal & Toast Alerts
   ========================================================================== */

class FormHandler {
    constructor() {
        this.initForms();
        this.initAccordions();
    }

    initForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(form);
            });
        });
    }

    handleFormSubmit(form) {
        const formId = form.id;
        
        if (formId === 'searchForm') {
            this.showToast('Filter Applied', 'Searching matching luxury properties in Hyderabad...', 'info');
            // Scroll to property section if exists
            document.querySelector('#featured-properties')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (formId === 'newsletterForm') {
            const emailInput = form.querySelector('input[type="email"]');
            if (emailInput && emailInput.value) {
                this.showToast('Subscribed Successfully', 'Thank you for subscribing to FutureCity Market Insights.', 'success');
                emailInput.value = '';
            }
            return;
        }

        if (formId === 'contactForm') {
            const nameInput  = form.querySelector('[name="name"]');
            const phoneInput = form.querySelector('[name="phone"]');
            const assetInput = form.querySelector('select');

            if (!nameInput?.value || !phoneInput?.value) {
                this.showToast('Validation Error', 'Please complete all required fields.', 'error');
                return;
            }

            // Build the HIGH-PRIORITY WhatsApp message
            const name  = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            const asset = assetInput ? assetInput.value.trim() : 'Not specified';
            const now   = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

            const message =
                `🚨 *HIGH PRIORITY LEAD* 🚨\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🏙️ *FUTURECITY PROPERTIES*\n` +
                `📌 *VIP CONCIERGE ENQUIRY*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👤 *Name:*  ${name}\n` +
                `📞 *Phone / WhatsApp:*  ${phone}\n` +
                `🏠 *Interested In:*  ${asset}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🕐 *Submitted:* ${now}\n` +
                `⚡ *Action Required:* Call / WhatsApp immediately!\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `_🌐 Source: FutureCity Properties Website_`;

            // Open WhatsApp immediately – no extra input needed
            const waURL = `https://wa.me/917660858895?text=${encodeURIComponent(message)}`;
            window.open(waURL, '_blank');

            this.showToast('🚀 WhatsApp Opening!', `High-priority lead sent for ${name}!`, 'success');
            form.reset();
            return;
        }

        if (formId === 'siteVisitForm') {
            const nameInput = form.querySelector('[name="name"]');
            const phoneInput = form.querySelector('[name="phone"]');

            if (!nameInput?.value || !phoneInput?.value) {
                this.showToast('Validation Error', 'Please complete all required fields.', 'error');
                return;
            }

            // Build the HIGH-PRIORITY WhatsApp message for site visit form
            const name     = nameInput.value.trim();
            const phone    = phoneInput.value.trim();
            const property = form.querySelector('select')?.value?.trim() || 'Not specified';
            const date     = form.querySelector('[type="date"]')?.value || 'Not specified';
            const now      = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

            const message =
                `🚨 *HIGH PRIORITY LEAD* 🚨\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🏙️ *FUTURECITY PROPERTIES*\n` +
                `🥂 *VIP SITE VISIT REQUEST*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👤 *Name:*  ${name}\n` +
                `📞 *Phone / WhatsApp:*  ${phone}\n` +
                `🏠 *Property / Corridor:*  ${property}\n` +
                `📅 *Preferred Visit Date:*  ${date}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `🕐 *Submitted:* ${now}\n` +
                `⚡ *Action Required:* Arrange VIP pickup & site tour ASAP!\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `_🌐 Source: FutureCity Properties Website_`;

            const waURL = `https://wa.me/917660858895?text=${encodeURIComponent(message)}`;
            window.open(waURL, '_blank');

            this.showToast('🚀 WhatsApp Opening!', `VIP site visit request sent for ${name}!`, 'success');
            form.reset();

            // Close modal if open
            const modal = document.querySelector('.modal-overlay.active');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    }

    initAccordions() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const body = item.querySelector('.accordion-body');
                const isActive = item.classList.contains('active');

                // Close all other active items
                document.querySelectorAll('.accordion-item.active').forEach(activeItem => {
                    if (activeItem !== item) {
                        activeItem.classList.remove('active');
                        activeItem.querySelector('.accordion-body').style.maxHeight = null;
                    }
                });

                if (isActive) {
                    item.classList.remove('active');
                    body.style.maxHeight = null;
                } else {
                    item.classList.add('active');
                    body.style.maxHeight = body.scrollHeight + 'px';
                }
            });
        });
    }

    showToast(title, message, type = 'success') {
        const isMobile = window.innerWidth <= 600;

        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Responsive positioning via JS (supplements CSS)
        if (isMobile) {
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 5rem;
                left: 0.75rem;
                right: 0.75rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                pointer-events: none;
            `;
        } else {
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 2rem;
                left: 2rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                pointer-events: none;
            `;
        }

        const toast = document.createElement('div');
        toast.className = 'glass-panel';

        const slideFrom = isMobile ? 'translateY(40px)' : 'translateX(-40px)';
        const slideTo   = isMobile ? 'translateY(0)'    : 'translateX(0)';
        const slideOut  = isMobile ? 'translateY(40px)' : 'translateX(-40px)';

        toast.style.cssText = `
            pointer-events: auto;
            padding: 1rem 1.5rem;
            width: 100%;
            ${isMobile ? '' : 'min-width: 300px; max-width: 400px;'}
            background: rgba(15, 36, 60, 0.95);
            border-left: 4px solid ${type === 'success' ? '#D4AF37' : type === 'error' ? '#EF4444' : '#3B82F6'};
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
            transform: ${slideFrom};
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        toast.innerHTML = `
            <div style="font-family: 'Syne', sans-serif; font-weight: 700; color: #FAFAFA; margin-bottom: 0.25rem; font-size: 0.95rem;">${title}</div>
            <div style="font-size: 0.85rem; color: #A0B0C0; line-height: 1.5;">${message}</div>
        `;

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = slideTo;
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = slideOut;
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    initModalCloseBtns() {
        // Wire up all .modal-close buttons and overlay-click-to-dismiss
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            const closeBtn = overlay.querySelector('.modal-close');
            const closeModal = () => {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            };
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
            });
        });

        // Patch open buttons to lock body scroll on open
        document.querySelectorAll('.open-site-visit-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('siteVisitModal');
                if (modal) {
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const handler = new FormHandler();
    handler.initModalCloseBtns();
});
