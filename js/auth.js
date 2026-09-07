/* ============================================================
   FUTURECITY PROPERTIES — SUPABASE AUTH MODULE
   Handles: Supabase initialization, session management,
   login, logout, role checking
   
   SECURITY NOTE:
   Only the ANON KEY (public/publishable) is used here.
   The service-role key is NEVER placed in browser JS.
   ============================================================ */

// ── Configuration (REPLACE with your actual Supabase project values) ──
// These are PUBLIC/PUBLISHABLE values — safe for browser use.
// Find these in: Supabase Dashboard → Settings → API
const SUPABASE_URL  = 'https://grukpryqufghejsypnhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydWtwcnlxdWZnaGVqc3lwbmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzQ2NTksImV4cCI6MjEwMjIxMDY1OX0.9fAEx23lF1vAY6SUPPKbMP4VCrCKarpeVW_KCFfspP8';

// ── Supabase Client ──
// Loaded via CDN script tag (see HTML pages)
let _supabase = null;

function getSupabase() {
    if (!_supabase) {
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase JS not loaded. Add the CDN script tag before auth.js');
            return null;
        }
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                storageKey: 'fcp_session',
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
    return _supabase;
}

// ── Get current session ──
async function getSession() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session;
}

// ── Get current user ──
async function getUser() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

// ── Sign in with email/password ──
async function signIn(email, password) {
    const sb = getSupabase();
    if (!sb) return { error: 'Authentication service unavailable.' };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { data, error };
}

// ── Sign in with magic link (passwordless) ──
async function signInWithMagicLink(email, redirectTo) {
    const sb = getSupabase();
    if (!sb) return { error: 'Authentication service unavailable.' };
    const { data, error } = await sb.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectTo || window.location.origin + '/member/dashboard.html'
        }
    });
    return { data, error };
}

// ── Sign out ──
async function signOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
}

// ── Require authenticated member — redirect if not logged in ──
async function requireMemberAuth() {
    const user = await getUser();
    if (!user) {
        window.location.href = '/member/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
    }
    return user;
}

// ── Require admin role ──
// Checks the admin_users table server-side via Supabase query
async function requireAdminAuth(redirectOnFail = true) {
    const sb = getSupabase();
    if (!sb) return null;

    const user = await getUser();
    if (!user) {
        if (redirectOnFail) {
            window.location.href = '/admin/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        }
        return null;
    }

    // Check admin_users table (RLS ensures only real admins can read this)
    const { data: adminUser, error } = await sb
        .from('admin_users')
        .select('id, role, active')
        .eq('auth_user_id', user.id)
        .eq('active', true)
        .maybeSingle();

    if (error || !adminUser) {
        // Not an admin — redirect away only if requested
        if (redirectOnFail) {
            window.location.href = '/member/dashboard.html';
        }
        return null;
    }

    return { user, adminUser };
}

// ── Get member record for current user ──
async function getMyMemberRecord() {
    const sb = getSupabase();
    if (!sb) return null;
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await sb
        .from('members')
        .select('*, membership_applications(*)')
        .eq('auth_user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching member record:', error.message);
        return null;
    }
    return data;
}

// ── Get my membership card ──
async function getMyCard(memberId) {
    const sb = getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
        .from('membership_cards')
        .select('id, card_number, issued_at, revoked_at')
        .eq('member_id', memberId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching card:', error.message);
        return null;
    }
    return data;
}

// ── Auth state change listener ──
function onAuthStateChange(callback) {
    const sb = getSupabase();
    if (!sb) return;
    return sb.auth.onAuthStateChange(callback);
}

// ── Get JWT for Edge Function calls ──
async function getJWT() {
    const session = await getSession();
    return session?.access_token ?? null;
}

// Export for module use
window.FCP = window.FCP || {};
window.FCP.auth = {
    getSupabase,
    getSession,
    getUser,
    signIn,
    signInWithMagicLink,
    signOut,
    requireMemberAuth,
    requireAdminAuth,
    getMyMemberRecord,
    getMyCard,
    onAuthStateChange,
    getJWT,
    SUPABASE_URL,
};
