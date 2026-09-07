// ============================================================
// FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
// Edge Function: submit-application
// 
// Handles public registration form submissions.
// Runs server-side — validates, rate-limits, checks duplicates,
// then inserts into membership_applications table.
//
// SECURITY:
//   - Uses SERVICE ROLE key (server-side only, never in browser)
//   - Validates all inputs server-side
//   - Rate limits by IP
//   - Checks for duplicate email/phone
//   - Generates unique application number via DB function
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// These come from Supabase Edge Function secrets — never hardcoded
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// In-memory rate limiter (per Edge Function instance)
// For production, use Upstash Redis or a similar persistent store
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 3;   // max submissions per window
const RATE_LIMIT_WINDOW_MS = 300_000; // 5 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return false; // rate limited
  }
  entry.count++;
  return true; // allowed
}

// Validation helpers
const VALID_PROPERTY_INTERESTS = [
  "Residential","Open Plots","Villa","Apartment","Commercial","Investment","Other"
];
const VALID_BUDGET_RANGES = [
  "Below ₹20L","₹20L–₹50L","₹50L–₹1Cr","₹1Cr–₹2Cr","₹2Cr+"
];

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/[\s\-+]/g, ""));
}

function sanitizeText(text: string, maxLen: number): string {
  return text.trim().substring(0, maxLen);
}

Deno.serve(async (req: Request) => {
  // CORS headers for browser requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Restrict to your domain in production
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // IP-based rate limiting
  const clientIP = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({
      error: "Too many requests. Please wait a few minutes and try again."
    }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request format." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Anti-bot honeypot check ───
  if (body.website_url) { // honeypot field — real users leave this blank
    // Return a fake success to confuse bots
    return new Response(JSON.stringify({
      success: true,
      application_number: "FCP-APP-0000-000000",
      message: "Application submitted."
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─── Server-side validation ───
  const errors: string[] = [];

  const full_name = sanitizeText(String(body.full_name ?? ""), 120);
  const email = sanitizeText(String(body.email ?? "").toLowerCase(), 254);
  const phone = sanitizeText(String(body.phone ?? "").replace(/[\s\-+]/g, ""), 20);
  const city = sanitizeText(String(body.city ?? ""), 100);
  const state = sanitizeText(String(body.state ?? ""), 100);
  const occupation = sanitizeText(String(body.occupation ?? ""), 100);
  const property_interest = sanitizeText(String(body.property_interest ?? ""), 50);
  const budget_range = sanitizeText(String(body.budget_range ?? ""), 30);
  const preferred_location = sanitizeText(String(body.preferred_location ?? ""), 200);
  const consent = body.consent === true;

  if (!full_name || full_name.length < 2) errors.push("Full name is required.");
  if (!isValidEmail(email)) errors.push("Please enter a valid email address.");
  if (!isValidPhone(phone)) errors.push("Please enter a valid 10-digit mobile number.");
  if (!city || city.length < 2) errors.push("City is required.");
  if (!state || state.length < 2) errors.push("State is required.");
  if (!VALID_PROPERTY_INTERESTS.includes(property_interest)) errors.push("Please select a valid property interest.");
  if (!VALID_BUDGET_RANGES.includes(budget_range)) errors.push("Please select a budget range.");
  if (!consent) errors.push("You must accept the terms and privacy policy to proceed.");

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: errors.join(" ") }), {
      status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Supabase admin client (service role — server-side only) ───
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // ─── Duplicate detection (privacy-safe response) ───
  const { data: existingByEmail } = await supabase
    .from("membership_applications")
    .select("id, status")
    .ilike("email", email)
    .not("status", "in", '("REJECTED")')
    .maybeSingle();

  if (existingByEmail) {
    return new Response(JSON.stringify({
      error: "An application with these details may already exist. Please contact our team if you need assistance."
    }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─── Generate application number via DB function ───
  const { data: appNumData, error: appNumErr } = await supabase
    .rpc("generate_application_number");

  if (appNumErr || !appNumData) {
    console.error("App number generation failed:", appNumErr);
    return new Response(JSON.stringify({
      error: "We encountered an issue processing your application. Please try again."
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const application_number = appNumData as string;

  // ─── Insert application ───
  const { error: insertError } = await supabase
    .from("membership_applications")
    .insert({
      application_number,
      full_name,
      email,
      phone,
      city,
      state,
      occupation: occupation || null,
      property_interest,
      budget_range,
      preferred_location: preferred_location || null,
      status: "PENDING",
      consent_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error("Insert error:", insertError);
    // Check for unique constraint violation
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({
        error: "An application with these details may already exist."
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      error: "We encountered an issue submitting your application. Please try again."
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─── Success response — reveal only application number and status ───
  return new Response(JSON.stringify({
    success: true,
    application_number,
    status: "PENDING",
    message: "Your application has been submitted successfully. Our team will review it shortly."
  }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
