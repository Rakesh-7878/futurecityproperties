/* ============================================================
   FUTURECITY PROPERTIES — QR VERIFICATION JS
   Hits the public verify-membership Edge Function
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('id');

    const verifyWrap = document.getElementById('verify-wrap');
    if (!verifyWrap) return;

    if (!token) {
        renderResult(false, 'INVALID', 'No verification ID provided.');
        return;
    }

    try {
        // We use the auth config to find the Supabase URL
        // It's safe to read SUPABASE_URL directly, we just don't need a session
        const SUPABASE_URL = window.FCP?.auth?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-membership?id=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        if (response.ok && data.verified) {
            renderResult(true, data.status, data.message, data);
        } else {
            renderResult(false, data.status || 'INVALID', data.message || 'Verification failed.');
        }

    } catch (err) {
        console.error('Verification error:', err);
        renderResult(false, 'ERROR', 'Could not connect to verification server. Please try again later.');
    }
});

function renderResult(isValid, status, message, data = null) {
    const iconEl = document.getElementById('verify-icon');
    const badgeEl = document.getElementById('verify-badge');
    const titleEl = document.getElementById('verify-title');
    const msgEl = document.getElementById('verify-msg');
    const detailsWrap = document.getElementById('verify-details');

    if (!iconEl) return;

    // Remove loading classes
    iconEl.classList.remove('loading');
    badgeEl.classList.remove('badge-loading');

    if (isValid && status === 'ACTIVE') {
        iconEl.classList.add('verified');
        iconEl.innerHTML = '✓';
        
        badgeEl.classList.add('badge-verified');
        badgeEl.textContent = 'VERIFIED ACTIVE';
        
        titleEl.textContent = data.member_name || 'Verified Member';
        msgEl.textContent = data.membership_number || message;

        // Render details securely (no private info)
        if (detailsWrap && data) {
            detailsWrap.innerHTML = `
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Status</span>
                    <span class="verify-detail-value" style="color:#10B981;">Active Member</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Member Since</span>
                    <span class="verify-detail-value">${window.FCP?.ui?.formatDate(data.member_since)}</span>
                </div>
                <div class="verify-detail-row">
                    <span class="verify-detail-label">Verification Time</span>
                    <span class="verify-detail-value">${new Date(data.verified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;
        }

    } else {
        // Invalid, revoked, expired, suspended, or error
        iconEl.classList.add('invalid');
        iconEl.innerHTML = '✕';
        
        const badgeClass = status === 'REVOKED' || status === 'INVALID' ? 'badge-invalid' : 'badge-loading';
        badgeEl.classList.add(badgeClass);
        badgeEl.textContent = status === 'ERROR' ? 'SYSTEM ERROR' : status;
        
        titleEl.textContent = 'Verification Failed';
        titleEl.style.color = '#EF4444';
        msgEl.textContent = message;

        if (detailsWrap) detailsWrap.innerHTML = ''; // clear details
    }
}
