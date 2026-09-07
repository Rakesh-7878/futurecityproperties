-- ============================================================
-- FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
-- Migration 004: Secure ID Generation Functions
-- These run with SECURITY DEFINER on the server
-- ============================================================

-- ============================================================
-- Generate Application Number: FCP-APP-YYYY-NNNNNN
-- Uses a per-year sequence table for unique incrementing IDs
-- ============================================================
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    next_seq     INTEGER;
BEGIN
    -- Upsert year row and increment atomically
    INSERT INTO application_sequence(year, last_seq) VALUES (current_year, 0)
    ON CONFLICT(year) DO NOTHING;

    UPDATE application_sequence
       SET last_seq = last_seq + 1
     WHERE year = current_year
    RETURNING last_seq INTO next_seq;

    RETURN 'FCP-APP-' || current_year::TEXT || '-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Generate Membership Number: FCP-MEM-YYYY-NNNNNN
-- Adds a secure random suffix component to avoid enumeration
-- ============================================================
CREATE OR REPLACE FUNCTION generate_membership_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    next_seq     INTEGER;
    random_hex   TEXT;
BEGIN
    INSERT INTO member_sequence(year, last_seq) VALUES (current_year, 0)
    ON CONFLICT(year) DO NOTHING;

    UPDATE member_sequence
       SET last_seq = last_seq + 1
     WHERE year = current_year
    RETURNING last_seq INTO next_seq;

    -- Add 4 random hex chars to make the number harder to enumerate
    random_hex := UPPER(ENCODE(gen_random_bytes(2), 'hex'));

    RETURN 'FCP-MEM-' || current_year::TEXT || '-' || LPAD(next_seq::TEXT, 4, '0') || random_hex;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Generate Card Number: FCP-CARD-YYYY-UUID_PREFIX
-- ============================================================
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    rand_part    TEXT;
BEGIN
    rand_part := UPPER(ENCODE(gen_random_bytes(6), 'hex'));
    RETURN 'FCP-CARD-' || current_year::TEXT || '-' || rand_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Generate a secure verification token (raw, for returning to caller once)
-- The caller MUST hash this before storing.
-- This function should only be called by Edge Functions.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
BEGIN
    -- 32 random bytes = 64 hex chars — cryptographically secure
    RETURN ENCODE(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
