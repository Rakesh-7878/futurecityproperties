/* ============================================================
   FUTURECITY PROPERTIES — MEMBERSHIP REGISTRATION JS
   v2.0 — Real-time Supabase submit + Professional button feedback
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const form        = document.getElementById('fcp-reg-form');
    const formWrapper = document.getElementById('fcp-form-wrapper');
    const successScreen = document.getElementById('fcp-success-screen');
    const submitBtn   = document.getElementById('fcp-submit-btn');

    // Join / Group CTA buttons → open WhatsApp group
    const WHATSAPP_GROUP = 'https://chat.whatsapp.com/Fj9gY3gaUTVHniNFPFgvWS?s=cl&p=a&ilr=1';
    document.querySelectorAll('.js-join-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(WHATSAPP_GROUP, '_blank', 'noopener');
        });
    });

    if (!form) return;

    // ── Validation schema ──
    const schema = {
        full_name:         { required: true, minLength: 2, maxLength: 120 },
        email:             { required: true, email: true },
        phone:             { required: true, phone: true },
        city:              { required: true, minLength: 2 },
        state:             { required: true, minLength: 2 },
        property_interest: { required: true },
        budget_range:      { required: true },
    };

    // Attach live validation
    window.FCP?.validation?.attachLiveValidation(form, schema, 'reg');

    // ── Form submission ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        window.FCP?.validation?.clearAllErrors(form);

        // Gather values
        const formData = {
            full_name:          (form.querySelector('[name="full_name"]')?.value ?? '').trim(),
            email:              (form.querySelector('[name="email"]')?.value ?? '').trim().toLowerCase(),
            phone:              (form.querySelector('[name="phone"]')?.value ?? '').trim(),
            city:               (form.querySelector('[name="city"]')?.value ?? '').trim(),
            state:              (form.querySelector('[name="state"]')?.value ?? '').trim(),
            occupation:         (form.querySelector('[name="occupation"]')?.value ?? '').trim(),
            property_interest:  (form.querySelector('[name="property_interest"]')?.value ?? ''),
            budget_range:       (form.querySelector('[name="budget_range"]')?.value ?? ''),
            preferred_location: (form.querySelector('[name="preferred_location"]')?.value ?? '').trim(),
        };

        const consentTerms   = form.querySelector('#reg-consent-terms')?.checked;
        const consentPrivacy = form.querySelector('#reg-consent-privacy')?.checked;
        const honeypot       = form.querySelector('[name="website_url"]')?.value;

        // Bot check — silently succeed
        if (honeypot) {
            _showButtonSuccess(submitBtn, 'Application Submitted!');
            return;
        }

        // Client-side validation
        const { valid, errors } = window.FCP?.validation?.validateForm(formData, schema) ?? { valid: false, errors: {} };

        if (!consentTerms || !consentPrivacy) {
            errors.consent = 'Please accept the terms and privacy policy.';
        }

        if (Object.keys(errors).length > 0) {
            window.FCP?.validation?.showErrors(errors, 'reg');
            if (errors.consent) {
                window.FCP?.ui?.toast('Please accept the terms and privacy policy to continue.', 'error');
            }
            // Shake button
            _shakeButton(submitBtn);
            return;
        }

        // Set loading state
        _showButtonLoading(submitBtn);

        try {
            // ── Primary: Call Edge Function ──
            const result = await _submitViaEdgeFunction(formData, consentTerms && consentPrivacy);

            if (result.success) {
                _showButtonSuccess(submitBtn, '✓ Successfully Submitted!');
                setTimeout(() => {
                    // Show full success screen after 1.5s delay so user sees the button state
                    if (formWrapper) formWrapper.style.display = 'none';
                    if (successScreen) {
                        successScreen.classList.add('visible');
                        const appNumEl = document.getElementById('success-app-number');
                        if (appNumEl) appNumEl.textContent = result.application_number || 'FCP-APP-...' ;
                    }
                }, 1500);
            } else {
                throw new Error(result.error || 'Submission failed.');
            }

        } catch (edgeErr) {
            console.warn('Edge Function failed, attempting direct Supabase insert:', edgeErr.message);

            // ── Fallback: Direct Supabase anonymous insert ──
            try {
                const appNumber = await _submitDirectToSupabase(formData, consentTerms && consentPrivacy);
                _showButtonSuccess(submitBtn, '✓ Successfully Submitted!');
                setTimeout(() => {
                    if (formWrapper) formWrapper.style.display = 'none';
                    if (successScreen) {
                        successScreen.classList.add('visible');
                        const appNumEl = document.getElementById('success-app-number');
                        if (appNumEl) appNumEl.textContent = appNumber;
                    }
                }, 1500);

            } catch (directErr) {
                console.error('Direct submit also failed:', directErr.message);
                _showButtonError(submitBtn, '✗ Submission Failed — Try Again');
                window.FCP?.ui?.toast(
                    directErr.message || 'We could not submit your application. Please check your connection.',
                    'error',
                    8000
                );
            }
        }
    });

    // ═══════════════════════════════════════════════════════
    // Button state helpers
    // ═══════════════════════════════════════════════════════

    function _showButtonLoading(btn) {
        if (!btn) return;
        btn._originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.className = btn.className.replace(/\bbtn-success\b|\bbtn-error\b/g, '').trim();
        btn.innerHTML = `
            <span class="btn-state-inner">
                <svg class="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
                <span>Submitting Application…</span>
            </span>`;
    }

    function _showButtonSuccess(btn) {
        if (!btn) return;
        btn.disabled = true;
        btn.className = (btn.className + ' btn-state-success').trim();
        btn.innerHTML = `
            <span class="btn-state-inner">
                <svg class="btn-icon-check" width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
                    <path d="M7 12.5l3.5 3.5 6.5-7"/>
                </svg>
                <span>Successfully Submitted — We'll Reach You Soon!</span>
            </span>`;
        // Pulse the button once
        btn.classList.add('btn-pulse-once');
        btn.addEventListener('animationend', () => btn.classList.remove('btn-pulse-once'), { once: true });
    }

    function _showButtonError(btn) {
        if (!btn) return;
        btn.disabled = false;
        btn.className = (btn.className + ' btn-state-error').trim();
        btn.innerHTML = `
            <span class="btn-state-inner">
                <svg class="btn-icon-x" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.3"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <span>Submission Unsuccessful — Tap to Retry</span>
            </span>`;
        // Reset back to normal after 6s so user can retry
        setTimeout(() => {
            if (!btn.classList.contains('btn-state-success')) {
                btn.disabled = false;
                btn.className = btn.className
                    .replace(/\bbtn-state-error\b/g, '').trim();
                btn.innerHTML = btn._originalHTML || 'Submit Application';
            }
        }, 6000);
    }

    function _shakeButton(btn) {
        if (!btn) return;
        btn.classList.add('btn-shake');
        btn.addEventListener('animationend', () => btn.classList.remove('btn-shake'), { once: true });
    }

    // ═══════════════════════════════════════════════════════
    // Submission methods
    // ═══════════════════════════════════════════════════════

    async function _submitViaEdgeFunction(formData, consent) {
        const SUPABASE_URL = window.FCP?.auth?.SUPABASE_URL;
        if (!SUPABASE_URL) throw new Error('Supabase URL not configured.');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, consent }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        return result;
    }

    async function _submitDirectToSupabase(formData, consent) {
        const sb = window.FCP?.auth?.getSupabase();
        if (!sb) throw new Error('Supabase client unavailable.');

        // Generate application number client-side as fallback
        const year = new Date().getFullYear();
        const seq  = String(Math.floor(Math.random() * 900000) + 100000);
        const application_number = `FCP-APP-${year}-${seq}`;

        const { error } = await sb.from('membership_applications').insert({
            application_number,
            full_name:          formData.full_name,
            email:              formData.email,
            phone:              formData.phone.replace(/[\s\-+]/g, ''),
            city:               formData.city,
            state:              formData.state,
            occupation:         formData.occupation || null,
            property_interest:  formData.property_interest,
            budget_range:       formData.budget_range,
            preferred_location: formData.preferred_location || null,
            status:             'PENDING',
            consent_at:         new Date().toISOString(),
        });

        if (error) {
            // Friendly duplicate message
            if (error.code === '23505') {
                throw new Error('An application with your email already exists. Please contact our team.');
            }
            throw new Error(error.message || 'Database insertion failed.');
        }

        return application_number;
    }
});
