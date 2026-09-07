-- ============================================================
-- FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
-- Migration 003: Indexes for Performance
-- ============================================================

-- membership_applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_status
    ON membership_applications(status);

CREATE INDEX IF NOT EXISTS idx_applications_created_at
    ON membership_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_email
    ON membership_applications(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_applications_phone
    ON membership_applications(phone);

CREATE INDEX IF NOT EXISTS idx_applications_application_number
    ON membership_applications(application_number);

CREATE INDEX IF NOT EXISTS idx_applications_property_interest
    ON membership_applications(property_interest);

-- members indexes
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id
    ON members(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_members_membership_number
    ON members(membership_number);

CREATE INDEX IF NOT EXISTS idx_members_status
    ON members(status);

-- membership_cards indexes
CREATE INDEX IF NOT EXISTS idx_cards_member_id
    ON membership_cards(member_id);

CREATE INDEX IF NOT EXISTS idx_cards_verification_token_prefix
    ON membership_cards(verification_token_prefix);

-- admin_users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id
    ON admin_users(auth_user_id);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id
    ON audit_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type
    ON audit_logs(target_type);
