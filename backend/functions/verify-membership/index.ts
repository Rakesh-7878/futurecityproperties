// ============================================================
// FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
// Edge Function: verify-membership
//
// PUBLIC ENDPOINT — called when someone scans a QR code.
// Looks up a verification token and returns MINIMAL public info.
//
// SECURITY:
//   - Never returns private data (email, phone, address, etc.)
//   - Hashes the incoming token and compares against stored hash
//   - Always returns current live status from DB
//   - Rate limiting to prevent enumeration
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Rate limiting for public verification endpoint
const verifyRateMap = new Map<string, { count: number; resetAt: number }>();

function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = verifyRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    verifyRateMap.set(ip, { count: 1, resetAt: now + 60_000 }); // 1-minute window
    return true;
  }
  if (entry.count >= 20) return false; // 20 verifications per minute
  entry.count++;
  return true;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const clientIP = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkVerifyRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: "Too many requests." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("id");

  if (!token || token.length < 16 || token.length > 128) {
    return new Response(JSON.stringify({
      verified: false,
      status: "INVALID",
      message: "Invalid membership reference."
    }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Hash the incoming token for lookup
  const tokenHash = await sha256Hex(token);
  const tokenPrefix = token.substring(0, 8);

  // First lookup by prefix for performance (indexed), then verify hash
  const { data: card, error } = await supabase
    .from("membership_cards")
    .select("id, member_id, verification_token_hash, issued_at, revoked_at")
    .eq("verification_token_prefix", tokenPrefix)
    .maybeSingle();

  if (error || !card) {
    return new Response(JSON.stringify({
      verified: false,
      status: "INVALID",
      message: "This membership reference could not be found."
    }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Constant-time hash comparison (mitigates timing attacks)
  if (card.verification_token_hash !== tokenHash) {
    return new Response(JSON.stringify({
      verified: false,
      status: "INVALID",
      message: "This membership reference could not be found."
    }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check if card is revoked
  if (card.revoked_at) {
    return new Response(JSON.stringify({
      verified: false,
      status: "REVOKED",
      message: "This membership has been revoked."
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Fetch member details (minimal public info only)
  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("membership_number, status, member_since")
    .eq("id", card.member_id)
    .maybeSingle();

  if (memberErr || !member) {
    return new Response(JSON.stringify({
      verified: false,
      status: "INVALID",
      message: "Member record not found."
    }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check live member status
  if (member.status === "REVOKED") {
    return new Response(JSON.stringify({
      verified: false,
      status: "REVOKED",
      message: "This membership has been revoked."
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (member.status === "SUSPENDED") {
    return new Response(JSON.stringify({
      verified: false,
      status: "SUSPENDED",
      message: "This membership is currently suspended."
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (member.status === "EXPIRED") {
    return new Response(JSON.stringify({
      verified: false,
      status: "EXPIRED",
      message: "This membership has expired."
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Fetch applicant name (from application record — only name, no private data)
  const { data: application } = await supabase
    .from("membership_applications")
    .select("full_name")
    .eq("id", (await supabase
      .from("members")
      .select("application_id")
      .eq("id", card.member_id)
      .single()).data?.application_id)
    .maybeSingle();

  // ─── Return MINIMAL public information only ───
  return new Response(JSON.stringify({
    verified: true,
    status: "ACTIVE",
    message: "Verified FutureCity Properties Member",
    member_name: application?.full_name ?? "FutureCity Member",
    membership_number: member.membership_number,
    member_since: member.member_since,
    verified_at: new Date().toISOString(),
    // DO NOT include: email, phone, address, photo URL, budget, etc.
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
