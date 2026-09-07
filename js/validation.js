/* ============================================================
   FUTURECITY PROPERTIES — VALIDATION MODULE
   Reusable client-side validation utilities.
   
   NOTE: Server-side validation is ALWAYS performed additionally.
   Client-side validation is UX only — never a security boundary.
   ============================================================ */

const Validation = {
    
    // ── Validators ──
    
    isEmail(value) {
        return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value?.trim());
    },

    isPhone(value) {
        const cleaned = value?.replace(/[\s\-+()]/g, '') ?? '';
        return /^[6-9]\d{9}$/.test(cleaned);
    },

    isRequired(value) {
        return value !== null && value !== undefined && String(value).trim().length > 0;
    },

    minLength(value, min) {
        return String(value ?? '').trim().length >= min;
    },

    maxLength(value, max) {
        return String(value ?? '').trim().length <= max;
    },

    isOneOf(value, allowed) {
        return allowed.includes(value);
    },

    // ── Field-level validation ──

    validateField(name, value, rules) {
        for (const [rule, param] of Object.entries(rules)) {
            switch (rule) {
                case 'required':
                    if (param && !this.isRequired(value))
                        return 'This field is required.';
                    break;
                case 'email':
                    if (param && value && !this.isEmail(value))
                        return 'Please enter a valid email address.';
                    break;
                case 'phone':
                    if (param && value && !this.isPhone(value))
                        return 'Please enter a valid 10-digit mobile number.';
                    break;
                case 'minLength':
                    if (value && !this.minLength(value, param))
                        return `Must be at least ${param} characters.`;
                    break;
                case 'maxLength':
                    if (value && !this.maxLength(value, param))
                        return `Must not exceed ${param} characters.`;
                    break;
                case 'oneOf':
                    if (param && value && !this.isOneOf(value, param))
                        return 'Please select a valid option.';
                    break;
            }
        }
        return null; // no error
    },

    // ── Form-level validation ──
    // Returns { valid: bool, errors: { fieldName: errorMessage } }

    validateForm(formData, schema) {
        const errors = {};
        let valid = true;

        for (const [fieldName, rules] of Object.entries(schema)) {
            const value = formData[fieldName];
            const error = this.validateField(fieldName, value, rules);
            if (error) {
                errors[fieldName] = error;
                valid = false;
            }
        }

        return { valid, errors };
    },

    // ── DOM helpers ──

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(fieldId + '-error');
        if (field) field.classList.add('error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('visible');
        }
    },

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorEl = document.getElementById(fieldId + '-error');
        if (field) field.classList.remove('error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('visible');
        }
    },

    clearAllErrors(formEl) {
        if (!formEl) return;
        formEl.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        formEl.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
            el.classList.remove('visible');
        });
    },

    showErrors(errors, prefix = '') {
        for (const [field, message] of Object.entries(errors)) {
            this.showFieldError(prefix ? `${prefix}-${field}` : field, message);
        }
    },

    // ── Real-time field validation on blur ──

    attachLiveValidation(formEl, schema, idPrefix = '') {
        if (!formEl) return;
        
        for (const fieldName of Object.keys(schema)) {
            const id = idPrefix ? `${idPrefix}-${fieldName}` : fieldName;
            const el = document.getElementById(id) || formEl.querySelector(`[name="${fieldName}"]`);
            if (!el) continue;
            
            el.addEventListener('blur', () => {
                const value = el.type === 'checkbox' ? el.checked : el.value;
                const error = this.validateField(fieldName, value, schema[fieldName]);
                if (error) {
                    this.showFieldError(id, error);
                } else {
                    this.clearFieldError(id);
                }
            });

            el.addEventListener('input', () => {
                this.clearFieldError(id);
            });
        }
    }
};

window.FCP = window.FCP || {};
window.FCP.validation = Validation;
