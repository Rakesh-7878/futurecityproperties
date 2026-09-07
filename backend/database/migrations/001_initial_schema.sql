-- ============================================================
-- FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
-- Migration 001: Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: membership_applications
-- Stores public registration submissions before approval
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_applications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number  TEXT NOT NULL UNIQUE,           -- FCP-APP-2026-000001
    full_name           TEXT NOT NULL,
    email               TEXT NOT NULL,
    phone               TEXT NOT NULL,
    city                TEXT NOT NULL,
    state               TEXT NOT NULL,
    occupation          TEXT,
    property_interest   TEXT NOT NULL,                  -- enum enforced in check
    budget_range        TEXT NOT NULL,                  -- enum enforced in check
    preferred_location  TEXT,
    photo_path          TEXT,                           -- storage path, not public URL
    status              TEXT NOT NULL DEFAULT 'PENDING',
    admin_notes         TEXT,
    consent_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID REFERENCES auth.users(id)  -- admin user id

    -- Constraints
    ,CONSTRAINT chk_property_interest CHECK (property_interest IN (
        'Residential','Open Plots','Villa','Apartment','Commercial','Investment','Other'
    ))
    ,CONSTRAINT chk_budget_range CHECK (budget_range IN (
        'Below ₹20L','₹20L–₹50L','₹50L–₹1Cr','₹1Cr–₹2Cr','₹2Cr+'
    ))
    ,CONSTRAINT chk_status CHECK (status IN (
        'PENDING','UNDER_REVIEW','APPROVED','REJECTED','CORRECTION_REQUIRED',
        'SUSPENDED','REVOKED','EXPIRED','ACTIVE'
    ))
);

-- ============================================================
-- TABLE: members
-- Created ONLY after admin approval
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id        UUID UNIQUE REFERENCES auth.users(id),
    application_id      UUID NOT NULL UNIQUE REFERENCES membership_applications(id),
    membership_number   TEXT NOT NULL UNIQUE,           -- FCP-MEM-2026-XXXXXX
    status              TEXT NOT NULL DEFAULT 'ACTIVE',
    member_since        DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()

    ,CONSTRAINT chk_member_status CHECK (status IN (
        'ACTIVE','SUSPENDED','REVOKED','EXPIRED'
    ))
);

-- ============================================================
-- TABLE: membership_cards
-- Stores card metadata and secure verification token hash
-- The actual verification token is stored HASHED only
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_cards (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id               UUID NOT NULL REFERENCES members(id),
    card_number             TEXT NOT NULL UNIQUE,
    verification_token_hash TEXT NOT NULL,              -- bcrypt/sha256 hash only
    verification_token_prefix TEXT NOT NULL,            -- first 8 chars for lookup
    card_file_path          TEXT,                       -- storage path to generated card PDF/image
    issued_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: admin_users
-- Authorized admin accounts — must be manually promoted
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    role            TEXT NOT NULL DEFAULT 'admin',      -- admin | super_admin
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()

    ,CONSTRAINT chk_admin_role CHECK (role IN ('admin','super_admin'))
);

-- ============================================================
-- TABLE: audit_logs
-- Tracks all admin actions for accountability
-- NEVER log passwords, tokens, or secret keys
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID REFERENCES admin_users(id),
    action          TEXT NOT NULL,
    target_type     TEXT NOT NULL,                      -- 'application' | 'member' | 'card' | 'admin'
    target_id       UUID,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: application_sequence
-- Safely tracks application number counter per year
-- ============================================================
CREATE TABLE IF NOT EXISTS application_sequence (
    year    INTEGER PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS member_sequence (
    year    INTEGER PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Auto-update updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON membership_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
