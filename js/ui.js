/* ============================================================
   FUTURECITY PROPERTIES — UI UTILITIES MODULE
   Toast notifications, modals, loaders, helpers
   ============================================================ */

const UI = {

    // ── Toast Notifications ──

    toast(message, type = 'info', duration = 4500) {
        let container = document.querySelector('.admin-toast-container, .toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'admin-toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️',
            gold: '🏆',
        };

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.innerHTML = `
            <div class="admin-toast-title">${icons[type] ?? '📢'} ${
                type === 'success' ? 'Success' :
                type === 'error' ? 'Error' :
                type === 'warning' ? 'Warning' : 'Notice'
            }</div>
            <div class="admin-toast-msg">${this.escape(message)}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            const isMobile = window.innerWidth <= 600;
            toast.style.opacity = '0';
            toast.style.transform = isMobile ? 'translateY(40px)' : 'translateX(120%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 350);
        }, duration);
    },

    // ── Confirmation Modal ──

    confirm(title, description, onConfirm, confirmLabel = 'Confirm', confirmClass = 'primary') {
        // Remove existing
        document.getElementById('fcp-confirm-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'fcp-confirm-modal';
        overlay.className = 'confirm-modal-overlay';
        overlay.innerHTML = `
            <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                <div class="confirm-modal-title" id="confirm-title">${this.escape(title)}</div>
                <div class="confirm-modal-desc">${this.escape(description)}</div>
                <div class="confirm-modal-actions">
                    <button class="tbl-action-btn outline" id="confirm-cancel">Cancel</button>
                    <button class="admin-action-btn ${confirmClass}" id="confirm-ok" style="width:auto; margin:0;">
                        ${this.escape(confirmLabel)}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        const close = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        };

        overlay.querySelector('#confirm-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        overlay.querySelector('#confirm-ok').addEventListener('click', () => {
            close();
            onConfirm();
        });
    },

    // ── Button Loading State ──

    setLoading(btn, loading, loadingText = 'Processing...') {
        if (!btn) return;
        if (loading) {
            btn._originalText = btn.textContent;
            btn.disabled = true;
            btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" style="animation:spin 0.8s linear infinite">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
                ${this.escape(loadingText)}
            </span>`;
        } else {
            btn.disabled = false;
            btn.textContent = btn._originalText || 'Submit';
        }
    },

    // ── Page Loader ──

    showPageLoader() {
        const el = document.createElement('div');
        el.id = 'fcp-page-loader';
        el.style.cssText = `
            position:fixed; inset:0; background:#fff; z-index:99999;
            display:flex; align-items:center; justify-content:center;
            flex-direction:column; gap:1rem;
        `;
        el.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="#B8860B" stroke-width="2"
                style="animation:spin 1s linear infinite">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.2"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            <div style="font-size:0.85rem; color:#94A3B8; font-family:sans-serif;">Loading...</div>
        `;
        document.body.appendChild(el);
    },

    hidePageLoader() {
        const el = document.getElementById('fcp-page-loader');
        if (el) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => el.remove(), 300);
        }
    },

    // ── XSS-safe text escaping ──

    escape(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // ── Format date ──

    formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch { return dateStr; }
    },

    // ── Status badge HTML ──

    statusBadge(status) {
        const map = {
            PENDING:             ['tbl-badge-pending',   'Pending'],
            UNDER_REVIEW:        ['tbl-badge-review',    'Under Review'],
            APPROVED:            ['tbl-badge-approved',  'Approved'],
            ACTIVE:              ['tbl-badge-active',    'Active'],
            REJECTED:            ['tbl-badge-rejected',  'Rejected'],
            CORRECTION_REQUIRED: ['tbl-badge-correction','Correction Required'],
            SUSPENDED:           ['tbl-badge-suspended', 'Suspended'],
            REVOKED:             ['tbl-badge-revoked',   'Revoked'],
            EXPIRED:             ['tbl-badge-revoked',   'Expired'],
        };
        const [cls, label] = map[status] ?? ['tbl-badge-pending', status];
        return `<span class="tbl-badge ${cls}">${label}</span>`;
    },

    // ── Member status pill HTML ──

    statusPill(status) {
        const cls = {
            ACTIVE: 'status-active', PENDING: 'status-pending',
            APPROVED: 'status-approved', REJECTED: 'status-rejected',
            REVOKED: 'status-revoked', SUSPENDED: 'status-suspended',
        }[status] ?? 'status-pending';
        return `<span class="member-status-pill ${cls}">${this.escape(status)}</span>`;
    }
};

// Add spin keyframe if not present
if (!document.getElementById('fcp-ui-styles')) {
    const style = document.createElement('style');
    style.id = 'fcp-ui-styles';
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}

window.FCP = window.FCP || {};
window.FCP.ui = UI;
