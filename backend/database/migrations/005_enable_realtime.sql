-- ============================================================
-- FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
-- Migration 005: Enable Realtime for Admin Dashboard
-- Run this in Supabase SQL Editor
-- 
-- This enables Postgres Realtime (Supabase's real-time engine)
-- on the membership_applications table so the admin dashboard
-- receives instant INSERT and UPDATE events without polling.
-- ============================================================

-- Enable the replication role for the table
-- (Required for Supabase Realtime to broadcast changes)
ALTER PUBLICATION supabase_realtime ADD TABLE membership_applications;

-- Confirm it's added (run to verify):
-- SELECT schemaname, tablename FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime';
