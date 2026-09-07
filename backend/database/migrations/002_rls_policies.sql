-- ============================================================
-- FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
-- Migration 002: Row Level Security Policies
-- Run after 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE members                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: Check if current user is an admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE auth_user_id = auth.uid()
        AND active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: Get member id for current user
-- ============================================================
CREATE OR REPLACE FUNCTION my_member_id()
RETURNS UUID AS $$
    SELECT id FROM members WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES: membership_applications
-- ============================================================

-- Anyone can INSERT a new application (public registration)
-- The actual insertion is validated server-side in Edge Function
CREATE POLICY "Public can submit applications"
ON membership_applications FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Members can view ONLY their own application (matched by email after login)
CREATE POLICY "Member can view own application"
ON membership_applications FOR SELECT
TO authenticated
USING (
    id = (
        SELECT application_id FROM members
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- Admins can view all applications
CREATE POLICY "Admin can view all applications"
ON membership_applications FOR SELECT
TO authenticated
USING (is_admin());

-- Admins can update applications (change status, add notes)
CREATE POLICY "Admin can update applications"
ON membership_applications FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Nobody can delete applications (audit trail)
-- (No DELETE policy = no deletions allowed)

-- ============================================================
-- POLICIES: members
-- ============================================================

-- Members can read ONLY their own record
CREATE POLICY "Member can view own member record"
ON members FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Admins can view all members
CREATE POLICY "Admin can view all members"
ON members FOR SELECT
TO authenticated
USING (is_admin());

-- Admins can insert new member records (after approval)
CREATE POLICY "Admin can create members"
ON members FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can update member status
CREATE POLICY "Admin can update members"
ON members FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Members cannot update their own membership status, number, etc.
-- (No member self-update policy — only admin can update)

-- ============================================================
-- POLICIES: membership_cards
-- ============================================================

-- Members can view only their own card
CREATE POLICY "Member can view own card"
ON membership_cards FOR SELECT
TO authenticated
USING (
    member_id = my_member_id()
);

-- Admins can view all cards
CREATE POLICY "Admin can view all cards"
ON membership_cards FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can insert cards
CREATE POLICY "Admin can create cards"
ON membership_cards FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update cards (revocation)
CREATE POLICY "Admin can update cards"
ON membership_cards FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================
-- POLICIES: admin_users
-- ============================================================

-- Admins can view admin table (to verify roles)
CREATE POLICY "Admin can view admin users"
ON admin_users FOR SELECT
TO authenticated
USING (is_admin());

-- Nobody can insert/update via client (must be done via service role or Supabase dashboard)
-- This prevents privilege escalation

-- ============================================================
-- POLICIES: audit_logs
-- ============================================================

-- Admins can view audit logs
CREATE POLICY "Admin can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (is_admin());

-- Admins can insert audit log entries
CREATE POLICY "Admin can insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Nobody can update or delete audit logs
