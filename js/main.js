/* ==========================================================================
   FUTURECITY PROPERTIES - MASTER INITIALIZER
   Global event handlers, Modal management & Interactive Map Controllers
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c FutureCity Properties Platform Loaded ', 'background: #081522; color: #D4AF37; font-size: 14px; font-weight: bold; padding: 4px 8px; border: 1px solid #D4AF37;');

    // 1. Remove Preloader after window fully renders
    const preloader = document.querySelector('.preloader');
    const fillBar = document.querySelector('.preloader-bar-fill');

    if (fillBar) {
        fillBar.style.width = '100%';
    }

    setTimeout(() => {
        if (preloader) {
            preloader.classList.add('loaded');
        }
    }, 700);

    // 2. Book / Consultation buttons → direct phone call
    const PHONE_NUMBER = 'tel:7660858895';
    const WHATSAPP_GROUP = 'https://chat.whatsapp.com/Fj9gY3gaUTVHniNFPFgvWS?s=cl&p=a&ilr=1';

    const modalOpenBtns = document.querySelectorAll('.open-site-visit-modal');
    modalOpenBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = PHONE_NUMBER;
        });
    });

    // WhatsApp group buttons
    document.querySelectorAll('.join-whatsapp-group').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(WHATSAPP_GROUP, '_blank', 'noopener');
        });
    });

    // Floating call button — update href
    document.querySelectorAll('.float-call').forEach(el => {
        el.setAttribute('href', PHONE_NUMBER);
    });

    // Floating WhatsApp button — update href to group
    document.querySelectorAll('.float-whatsapp').forEach(el => {
        el.setAttribute('href', WHATSAPP_GROUP);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
    });

    // 3. Interactive Hyderabad Map Node click triggers
    const mapNodes = document.querySelectorAll('.map-node');
    mapNodes.forEach(node => {
        node.addEventListener('click', () => {
            mapNodes.forEach(n => n.classList.remove('active'));
            node.classList.add('active');
        });
    });

    // 4. Video Lightbox Simulation
    const playVideoBtns = document.querySelectorAll('.play-video-btn');
    playVideoBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('FutureCity Properties Corporate Video Playing in 4K HDR Ambient Player.');
        });
    });
});
