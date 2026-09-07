/* ============================================================
   FUTURECITY PROPERTIES — ADMIN DASHBOARD JS
   v2.0 — Real-time Supabase subscription + live notifications
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.FCP?.auth) {
        console.error('FCP Auth module missing.');
        return;
    }

    const path = window.location.pathname;

    if (path.includes('/admin/dashboard.html')) {
        const authData = await window.FCP.auth.requireAdminAuth();
        if (authData) {
            window.adminUser = authData.adminUser;
            await initAdminDashboard();
        }
    } else if (path.includes('/admin/login.html')) {
        initAdminLogin();
    }

    // Logout
    document.getElementById('fcp-admin-logout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        _destroyRealtimeSubscription();
        await window.FCP.auth.signOut();
        window.location.href = '/admin/login.html';
    });
});

function initAdminLogin() {
    const form = document.getElementById('admin-login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-pass').value;
        const btn      = document.getElementById('admin-login-btn');

        if (!email || !password) {
            window.FCP?.ui?.toast('Email and password are required.', 'error');
            return;
        }

        window.FCP?.ui?.setLoading(btn, true, 'Authenticating...');

        try {
            const { error } = await window.FCP.auth.signIn(email, password);
            if (error) throw error;

            // Check admin role
            const adminCheck = await window.FCP.auth.requireAdminAuth(false);
            if (adminCheck) {
                window.location.href = '/admin/dashboard.html';
            } else {
                await window.FCP.auth.signOut();
                throw new Error('Access denied. Admin privileges required.');
            }
        } catch (err) {
            window.FCP?.ui?.toast(err.message || 'Login failed.', 'error');
        } finally {
            window.FCP?.ui?.setLoading(btn, false);
        }
    });
}

// ═══════════════════════════════════════════════════════════
// Dashboard Core
// ═══════════════════════════════════════════════════════════

let allApplications       = [];
let filteredApplications  = [];
let _realtimeChannel      = null;
let _newApplicationsQueue = 0; // badge counter for new unseen apps

async function initAdminDashboard() {
    window.FCP?.ui?.showPageLoader();

    try {
        await fetchApplications();
        renderTable();
        updateStats();
        setupFilters();
        setupSidebar();
        _initRealtimeSubscription();
        _updateRealtimeIndicator(true);
    } catch (err) {
        console.error(err);
        window.FCP?.ui?.toast('Failed to load dashboard data.', 'error');
        _updateRealtimeIndicator(false);
    } finally {
        window.FCP?.ui?.hidePageLoader();
    }
}

async function fetchApplications() {
    const sb = window.FCP.auth.getSupabase();
    const { data, error } = await sb
        .from('membership_applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    allApplications      = data || [];
    filteredApplications = [...allApplications];
}

function updateStats() {
    const total    = allApplications.length;
    const pending  = allApplications.filter(a => ['PENDING', 'UNDER_REVIEW'].includes(a.status)).length;
    const approved = allApplications.filter(a => a.status === 'APPROVED').length;

    const elTotal    = document.getElementById('stat-total');
    const elPending  = document.getElementById('stat-pending');
    const elApproved = document.getElementById('stat-approved');

    if (elTotal)    _animateCounter(elTotal,    total);
    if (elPending)  _animateCounter(elPending,  pending);
    if (elApproved) _animateCounter(elApproved, approved);
}

// Smooth number counter animation
function _animateCounter(el, target) {
    const start    = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();

    function step(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value    = Math.round(start + (target - start) * _easeOut(progress));
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function _easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function renderTable() {
    const tbody = document.getElementById('admin-apps-tbody');
    if (!tbody) return;

    if (filteredApplications.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#94A3B8;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">📋</div>
            No applications found.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filteredApplications.map((app, idx) => `
        <tr class="app-row ${app._isNew ? 'app-row-new' : ''}" style="animation-delay:${idx * 30}ms">
            <td class="app-id">${window.FCP.ui.escape(app.application_number)}</td>
            <td>
                <div class="app-name">${window.FCP.ui.escape(app.full_name)}</div>
                <div class="app-email">${window.FCP.ui.escape(app.email)}</div>
            </td>
            <td>${window.FCP.ui.escape(app.phone)}</td>
            <td>${window.FCP.ui.escape(app.city)}</td>
            <td>${window.FCP.ui.formatDate(app.created_at)}</td>
            <td>${window.FCP.ui.statusBadge(app.status)}</td>
            <td>
                <button class="tbl-action-btn primary" onclick="viewApplication('${app.id}')">
                    Review
                </button>
            </td>
        </tr>
    `).join('');
}

function setupFilters() {
    const searchInput  = document.getElementById('admin-search');
    const statusFilter = document.getElementById('admin-filter-status');

    const applyFilters = () => {
        const query  = (searchInput?.value || '').toLowerCase().trim();
        const status = statusFilter?.value || 'ALL';

        filteredApplications = allApplications.filter(app => {
            const matchSearch = !query ||
                app.full_name.toLowerCase().includes(query) ||
                app.email.toLowerCase().includes(query) ||
                app.application_number.toLowerCase().includes(query) ||
                app.phone.includes(query);

            const matchStatus = status === 'ALL' || app.status === status;
            return matchSearch && matchStatus;
        });
        renderTable();
    };

    searchInput?.addEventListener('input', applyFilters);
    statusFilter?.addEventListener('change', applyFilters);
}

// ═══════════════════════════════════════════════════════════
// Real-time Subscription
// ═══════════════════════════════════════════════════════════

function _initRealtimeSubscription() {
    const sb = window.FCP?.auth?.getSupabase();
    if (!sb) {
        console.warn('Supabase client unavailable for realtime.');
        return;
    }

    _realtimeChannel = sb
        .channel('membership_applications_changes')
        .on(
            'postgres_changes',
            {
                event:  '*',
                schema: 'public',
                table:  'membership_applications',
            },
            (payload) => _handleRealtimeEvent(payload)
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[FCP Admin] Realtime subscription active.');
                _updateRealtimeIndicator(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('[FCP Admin] Realtime subscription issue:', status);
                _updateRealtimeIndicator(false);
            }
        });
}

function _destroyRealtimeSubscription() {
    if (_realtimeChannel) {
        window.FCP?.auth?.getSupabase()?.removeChannel(_realtimeChannel);
        _realtimeChannel = null;
    }
}

function _handleRealtimeEvent(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
        // New application submitted
        const app = { ...newRecord, _isNew: true };
        allApplications.unshift(app);
        filteredApplications = [...allApplications];
        renderTable();
        updateStats();

        // Show live notification toast
        _showNewApplicationAlert(newRecord);

        // Update badge counter
        _newApplicationsQueue++;
        _updateNewBadge(_newApplicationsQueue);

        // Play a subtle notification sound
        _playNotificationSound();

    } else if (eventType === 'UPDATE') {
        // Status changed
        const idx = allApplications.findIndex(a => a.id === oldRecord?.id || a.id === newRecord?.id);
        if (idx !== -1) {
            allApplications[idx] = newRecord;
            filteredApplications = allApplications.filter(a => filteredApplications.some(f => f.id === a.id));
        }
        renderTable();
        updateStats();
    }
}

function _showNewApplicationAlert(app) {
    // Premium notification card
    const container = _getOrCreateNotifContainer();

    const notif = document.createElement('div');
    notif.className = 'admin-realtime-notif';
    notif.innerHTML = `
        <div class="realtime-notif-inner">
            <div class="realtime-notif-icon">🔔</div>
            <div class="realtime-notif-body">
                <div class="realtime-notif-title">New Application Received</div>
                <div class="realtime-notif-name">${window.FCP.ui.escape(app.full_name)}</div>
                <div class="realtime-notif-meta">
                    ${window.FCP.ui.escape(app.city)} · ${window.FCP.ui.escape(app.property_interest)}
                </div>
                <div class="realtime-notif-appid">${window.FCP.ui.escape(app.application_number)}</div>
            </div>
            <button class="realtime-notif-review" onclick="viewApplication('${app.id}');this.closest('.admin-realtime-notif').remove()">
                Review Now →
            </button>
            <button class="realtime-notif-close" onclick="this.closest('.admin-realtime-notif').remove()">✕</button>
        </div>
        <div class="realtime-notif-progress"></div>
    `;

    container.appendChild(notif);

    // Animate in
    requestAnimationFrame(() => notif.classList.add('notif-visible'));

    // Auto-dismiss after 12s
    const timeout = setTimeout(() => _dismissNotif(notif), 12000);
    notif.querySelector('.realtime-notif-close').addEventListener('click', () => clearTimeout(timeout));
}

function _dismissNotif(notif) {
    notif.classList.remove('notif-visible');
    notif.classList.add('notif-hiding');
    setTimeout(() => notif.remove(), 400);
}

function _getOrCreateNotifContainer() {
    let c = document.getElementById('admin-notif-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'admin-notif-container';
        document.body.appendChild(c);
    }
    return c;
}

function _updateRealtimeIndicator(online) {
    const dot   = document.querySelector('.admin-realtime-dot');
    const label = document.querySelector('.admin-realtime-label');

    if (dot) {
        dot.classList.toggle('dot-online',  online);
        dot.classList.toggle('dot-offline', !online);
    }
    if (label) label.textContent = online ? 'Live Sync Active' : 'Reconnecting…';
}

function _updateNewBadge(count) {
    let badge = document.getElementById('admin-new-badge');
    if (!badge) {
        const topbar = document.querySelector('.admin-realtime-dot')?.parentElement;
        if (topbar) {
            badge = document.createElement('span');
            badge.id = 'admin-new-badge';
            badge.className = 'admin-new-badge';
            topbar.appendChild(badge);
        }
    }
    if (badge) {
        badge.textContent = `+${count} New`;
        badge.style.display = 'inline-flex';
    }
    document.title = `(${count} New) Admin Dashboard | FutureCity`;
}

function _playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (_) {
        // AudioContext not available (fine)
    }
}

// ═══════════════════════════════════════════════════════════
// Application Detail Modal
// ═══════════════════════════════════════════════════════════

function viewApplication(id) {
    const app = allApplications.find(a => a.id === id);
    if (!app) return;

    // Mark as seen — remove _isNew flag
    app._isNew = false;

    let modal = document.getElementById('admin-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-detail-modal';
        modal.className = 'confirm-modal-overlay';
        document.body.appendChild(modal);
    }

    let actionHTML = '';
    if (['PENDING', 'UNDER_REVIEW'].includes(app.status)) {
        actionHTML = `
            <button class="admin-action-btn approve" onclick="approveMember('${app.id}')">
                ✓ Approve &amp; Generate ID
            </button>
            <button class="admin-action-btn reject" onclick="rejectApplication('${app.id}')">
                ✗ Reject Application
            </button>
        `;
    }

    modal.innerHTML = `
        <div class="confirm-modal" style="max-width:820px; width:92%;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94A3B8;margin-bottom:0.25rem;">Application</div>
                    <h2 class="admin-page-title" style="margin:0;">${window.FCP.ui.escape(app.application_number)}</h2>
                </div>
                <div style="display:flex;gap:0.75rem;align-items:center;">
                    ${window.FCP.ui.statusBadge(app.status)}
                    <button onclick="document.getElementById('admin-detail-modal').classList.remove('active')"
                        class="tbl-action-btn outline" style="padding:0.5rem 1.25rem;">✕ Close</button>
                </div>
            </div>

            <div class="app-detail-grid">
                <div class="app-detail-card">
                    <div class="app-detail-section-head">👤 Applicant Information</div>
                    <div class="app-detail-rows">
                        <div class="app-detail-row">
                            <span class="app-detail-label">Full Name</span>
                            <span class="app-detail-value" style="font-weight:600;">${window.FCP.ui.escape(app.full_name)}</span>
                        </div>
                        <div class="app-detail-row">
                            <span class="app-detail-label">Email</span>
                            <span class="app-detail-value">
                                <a href="mailto:${window.FCP.ui.escape(app.email)}" style="color:var(--color-gold,#B8860B);">
                                    ${window.FCP.ui.escape(app.email)}
                                </a>
                            </span>
                        </div>
                        <div class="app-detail-row">
                            <span class="app-detail-label">Phone</span>
                            <span class="app-detail-value">
                                <a href="tel:${window.FCP.ui.escape(app.phone)}" style="color:var(--color-gold,#B8860B);">
                                    ${window.FCP.ui.escape(app.phone)}
                                </a>
                            </span>
                        </div>
                        <div class="app-detail-row">
                            <span class="app-detail-label">City / State</span>
                            <span class="app-detail-value">${window.FCP.ui.escape(app.city)}, ${window.FCP.ui.escape(app.state)}</span>
                        </div>
                        ${app.occupation ? `
                        <div class="app-detail-row">
                            <span class="app-detail-label">Occupation</span>
                            <span class="app-detail-value">${window.FCP.ui.escape(app.occupation)}</span>
                        </div>` : ''}
                        <div class="app-detail-row">
                            <span class="app-detail-label">Applied On</span>
                            <span class="app-detail-value">${window.FCP.ui.formatDate(app.created_at)}</span>
                        </div>
                    </div>

                    <div class="app-detail-section-head" style="border-top:1px solid #E2E8F0; margin-top:0.5rem;">🏠 Property Preferences</div>
                    <div class="app-detail-rows">
                        <div class="app-detail-row">
                            <span class="app-detail-label">Interest</span>
                            <span class="app-detail-value">${window.FCP.ui.escape(app.property_interest)}</span>
                        </div>
                        <div class="app-detail-row">
                            <span class="app-detail-label">Budget</span>
                            <span class="app-detail-value">${window.FCP.ui.escape(app.budget_range)}</span>
                        </div>
                        ${app.preferred_location ? `
                        <div class="app-detail-row">
                            <span class="app-detail-label">Location Pref.</span>
                            <span class="app-detail-value">${window.FCP.ui.escape(app.preferred_location)}</span>
                        </div>` : ''}
                    </div>
                </div>

                <div class="admin-action-card">
                    <div class="admin-action-title">⚙️ Admin Actions</div>
                    <div style="margin-bottom:1.25rem;">
                        Current Status: ${window.FCP.ui.statusBadge(app.status)}
                    </div>
                    ${actionHTML || '<div style="font-size:0.85rem;color:#64748B;line-height:1.6;">No actions available for this status.</div>'}
                    <div id="qr-result-area" style="margin-top:1.5rem; text-align:center; display:none;">
                        <div style="font-size:0.75rem; font-weight:700; margin-bottom:0.5rem; color:#10B981; letter-spacing:0.08em;">✓ VERIFICATION QR CODE</div>
                        <p style="font-size:0.7rem; color:#64748B; margin-bottom:0.75rem; line-height:1.4;">
                            Right-click and save this QR code to print on the physical card.
                        </p>
                        <canvas id="admin-qr-canvas" style="margin:0 auto; display:block; border-radius:0.5rem;"></canvas>
                        <a id="admin-qr-download" href="#" download="FCP_QR_${app.application_number}.png"
                            class="tbl-action-btn outline" style="margin-top:1rem; display:inline-flex;">
                            ⬇ Download QR
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    requestAnimationFrame(() => modal.classList.add('active'));
}

// ═══════════════════════════════════════════════════════════
// Approvals & Rejections
// ═══════════════════════════════════════════════════════════

window.approveMember = async function(appId) {
    window.FCP.ui.confirm(
        '✓ Approve Membership',
        'Are you sure you want to approve this application? This will generate a membership number, digital ID, and verification QR code.',
        async () => {
            try {
                window.FCP.ui.showPageLoader();
                const jwt = await window.FCP.auth.getJWT();
                const url = `${window.FCP.auth.SUPABASE_URL}/functions/v1/approve-member`;

                const res  = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`
                    },
                    body: JSON.stringify({ application_id: appId })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to approve.');

                window.FCP.ui.toast(`✓ Approved! Membership ID: ${data.membership_number}`, 'success');

                // Show QR
                const qrArea   = document.getElementById('qr-result-area');
                const qrCanvas = document.getElementById('admin-qr-canvas');
                if (qrArea && qrCanvas && window.qrcodegen && data.qr_url) {
                    qrArea.style.display = 'block';
                    const QRC = window.qrcodegen.QrCode;
                    const qr  = QRC.encodeText(data.qr_url, QRC.Ecc.HIGH);
                    const ctx = qrCanvas.getContext('2d');
                    const scale = 5;
                    const size  = qr.size;
                    qrCanvas.width  = size * scale;
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
                    document.getElementById('admin-qr-download').href = qrCanvas.toDataURL('image/png');
                }

                document.querySelectorAll('.admin-action-btn.approve, .admin-action-btn.reject')
                    .forEach(b => b.style.display = 'none');

                // Refresh table
                await fetchApplications();
                renderTable();
                updateStats();

            } catch (err) {
                window.FCP.ui.toast(err.message, 'error');
            } finally {
                window.FCP.ui.hidePageLoader();
            }
        },
        'Approve & Issue ID',
        'approve'
    );
};

window.rejectApplication = async function(appId) {
    window.FCP.ui.confirm(
        '✗ Reject Application',
        'Are you sure you want to reject this application? This action will be logged.',
        async () => {
            try {
                window.FCP.ui.showPageLoader();
                const jwt = await window.FCP.auth.getJWT();
                const url = `${window.FCP.auth.SUPABASE_URL}/functions/v1/reject-application`;

                const res  = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`
                    },
                    body: JSON.stringify({ application_id: appId, action: 'reject' })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to reject.');

                window.FCP.ui.toast('Application rejected successfully.', 'success');
                document.getElementById('admin-detail-modal')?.classList.remove('active');

                await fetchApplications();
                renderTable();
                updateStats();

            } catch (err) {
                window.FCP.ui.toast(err.message, 'error');
            } finally {
                window.FCP.ui.hidePageLoader();
            }
        },
        'Reject Application',
        'reject'
    );
};

function setupSidebar() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
}
