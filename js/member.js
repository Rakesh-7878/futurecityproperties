/* ============================================================
   FUTURECITY PROPERTIES — MEMBER PORTAL JS
   Handles member dashboard, digital ID card fetching, logout
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Make sure auth is loaded
    if (!window.FCP?.auth) {
        console.error('FCP Auth module missing.');
        return;
    }

    // Protect member pages
    const path = window.location.pathname;
    if (path.includes('/member/dashboard.html')) {
        const user = await window.FCP.auth.requireMemberAuth();
        if (user) {
            loadDashboard();
        }
    } else if (path.includes('/member/login.html')) {
        initLogin();
    }

    // Logout handler
    document.getElementById('fcp-logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await window.FCP.auth.signOut();
        window.location.href = '/member/login.html';
    });
});

async function loadDashboard() {
    window.FCP?.ui?.showPageLoader();

    try {
        const memberData = await window.FCP.auth.getMyMemberRecord();
        
        if (!memberData) {
            window.FCP?.ui?.toast('Could not load member data.', 'error');
            window.FCP?.ui?.hidePageLoader();
            return;
        }

        const appData = memberData.membership_applications || {};
        
        // Populate UI
        const setEl = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // Welcome banner
        setEl('mem-welcome-name', appData.full_name?.split(' ')[0] || 'Member');
        const statusContainer = document.getElementById('mem-status-container');
        if (statusContainer) {
            statusContainer.innerHTML = window.FCP?.ui?.statusPill(memberData.status);
        }

        // Dashboard info cards
        setEl('mem-info-number', memberData.membership_number || '—');
        setEl('mem-info-since', window.FCP?.ui?.formatDate(memberData.member_since));
        setEl('mem-info-email', appData.email || '—');
        setEl('mem-info-phone', appData.phone || '—');

        // ID Card
        const cardData = await window.FCP.auth.getMyCard(memberData.id);
        
        if (cardData) {
            setEl('card-val-name', appData.full_name?.toUpperCase() || 'MEMBER');
            setEl('card-val-number', memberData.membership_number);
            setEl('card-val-since', window.FCP?.ui?.formatDate(memberData.member_since));
            setEl('card-val-type', memberData.status === 'ACTIVE' ? 'PLATINUM MEMBER' : 'MEMBER');

            // Generate a static QR code for the dashboard display (visual only, real validation uses token)
            // Note: We don't expose the verification token to the member for security.
            // This QR just links to their public profile or the main site if no public profile.
            const qrCanvas = document.getElementById('card-qr');
            if (qrCanvas && window.qrcodegen) {
                const QRC = window.qrcodegen.QrCode;
                const qrUrl = window.location.origin; // Fallback
                const qr = QRC.encodeText(qrUrl, QRC.Ecc.MEDIUM);
                
                // Simple drawing
                const ctx = qrCanvas.getContext('2d');
                const scale = 2;
                const size = qr.size;
                qrCanvas.width = size * scale;
                qrCanvas.height = size * scale;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
                ctx.fillStyle = '#000000';
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        if (qr.getModule(x, y)) {
                            ctx.fillRect(x * scale, y * scale, scale, scale);
                        }
                    }
                }
            }
        } else {
            // Hide card area if no card issued yet
            const cardWrap = document.getElementById('digital-card-wrap');
            if (cardWrap) {
                cardWrap.innerHTML = '<div style="padding:2rem;text-align:center;color:#64748B;">Your digital ID card is being processed.</div>';
            }
        }

    } catch (err) {
        console.error('Dashboard load error:', err);
        window.FCP?.ui?.toast('An error occurred while loading your dashboard.', 'error');
    } finally {
        window.FCP?.ui?.hidePageLoader();
    }
}

function initLogin() {
    const loginForm = document.getElementById('fcp-member-login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const btn = document.getElementById('login-btn');
        const msgEl = document.getElementById('login-msg');
        
        if (!email || !window.FCP?.validation?.isEmail(email)) {
            window.FCP?.ui?.toast('Please enter a valid email address.', 'error');
            return;
        }

        window.FCP?.ui?.setLoading(btn, true, 'Sending Link...');
        msgEl.style.display = 'none';

        try {
            // For simplicity and security, we use magic links for members
            const { error } = await window.FCP.auth.signInWithMagicLink(email);
            
            if (error) {
                window.FCP?.ui?.toast(error.message || 'Login failed.', 'error');
            } else {
                msgEl.textContent = 'A secure login link has been sent to your email.';
                msgEl.style.display = 'block';
                loginForm.reset();
            }
        } catch (err) {
            console.error(err);
            window.FCP?.ui?.toast('An unexpected error occurred.', 'error');
        } finally {
            window.FCP?.ui?.setLoading(btn, false);
        }
    });
}
