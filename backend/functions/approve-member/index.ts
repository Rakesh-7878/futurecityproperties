// ============================================================
// FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
// Edge Function: approve-member
//
// PRIVILEGED SERVER-SIDE OPERATION
// Only callable by authenticated admin users.
//
// Steps:
//   1. Verify caller is an authenticated admin
//   2. Validate application exists and is in approvable state
//   3. Generate membership number (DB function)
//   4. Generate secure verification token
//   5. Hash the token before storing
//   6. Create member record
//   7. Create membership card record
//   8. Update application status to APPROVED
//   9. Write audit log entry
//   10. Return membership number + raw verification token (once, to generate QR)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Simple SHA-256 hash using Web Crypto API (available in Deno)
async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Verify admin JWT from Authorization header ───
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jwt = authHeader.replace("Bearer ", "");

  // Use anon client to verify the JWT
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  });

  const { data: { user }, error: userErr } = await anonClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Service client for privileged operations ───
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // ─── Verify caller is an active admin ───
  const { data: adminUser, error: adminErr } = await adminClient
    .from("admin_users")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (adminErr || !adminUser) {
    return new Response(JSON.stringify({ error: "Forbidden. Admin access required." }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Parse body ───
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const application_id = String(body.application_id ?? "");
  if (!application_id) {
    return new Response(JSON.stringify({ error: "application_id is required." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Fetch application ───
  const { data: application, error: appErr } = await adminClient
    .from("membership_applications")
    .select("*")
    .eq("id", application_id)
    .maybeSingle();

  if (appErr || !application) {
    return new Response(JSON.stringify({ error: "Application not found." }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Only PENDING or UNDER_REVIEW can be approved
  if (!["PENDING", "UNDER_REVIEW", "CORRECTION_REQUIRED"].includes(application.status)) {
    return new Response(JSON.stringify({
      error: `Cannot approve application with status: ${application.status}`
    }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─── Generate membership number ───
  const { data: memberNumData, error: memberNumErr } = await adminClient
    .rpc("generate_membership_number");
  if (memberNumErr || !memberNumData) {
    return new Response(JSON.stringify({ error: "Failed to generate membership number." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const membership_number = memberNumData as string;

  // ─── Generate card number ───
  const { data: cardNumData } = await adminClient.rpc("generate_card_number");
  const card_number = cardNumData as string;

  // ─── Generate verification token ───
  const { data: rawToken } = await adminClient.rpc("generate_verification_token");
  const verification_token = rawToken as string;
  const token_prefix = verification_token.substring(0, 8);
  const token_hash = await sha256Hex(verification_token);

  // ─── Create auth user for the member if they don't have one ───
  // This invites the applicant so they can set a password and login
  let auth_user_id: string | null = null;
  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
    application.email,
    {
      data: {
        full_name: application.full_name,
        role: "member"
      },
      redirectTo: `${Deno.env.get("SITE_URL") ?? "http://localhost"}/member/dashboard.html`
    }
  );

  if (inviteErr) {
    // User may already exist — try to find them
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existing = users?.find(u => u.email?.toLowerCase() === application.email.toLowerCase());
    if (existing) {
      auth_user_id = existing.id;
    } else {
      console.error("Failed to invite user:", inviteErr);
      return new Response(JSON.stringify({ error: "Failed to create member account." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    auth_user_id = inviteData?.user?.id ?? null;
  }

  // ─── Create member record ───
  const { data: memberRecord, error: memberErr } = await adminClient
    .from("members")
    .insert({
      auth_user_id,
      application_id,
      membership_number,
      status: "ACTIVE",
      member_since: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (memberErr || !memberRecord) {
    console.error("Member insert error:", memberErr);
    return new Response(JSON.stringify({ error: "Failed to create member record." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Create membership card record ───
  const { error: cardErr } = await adminClient
    .from("membership_cards")
    .insert({
      member_id: memberRecord.id,
      card_number,
      verification_token_hash: token_hash,
      verification_token_prefix: token_prefix,
    });

  if (cardErr) {
    console.error("Card insert error:", cardErr);
    return new Response(JSON.stringify({ error: "Failed to create membership card." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Update application status ───
  await adminClient
    .from("membership_applications")
    .update({
      status: "APPROVED",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", application_id);

  // ─── Write audit log ───
  await adminClient
    .from("audit_logs")
    .insert({
      admin_user_id: adminUser.id,
      action: "APPLICATION_APPROVED",
      target_type: "application",
      target_id: application_id,
      metadata: {
        applicant_name: application.full_name,
        membership_number,
        card_number,
      }
    });

  // ─── Return success (verification token returned once for QR generation on admin side) ───
  return new Response(JSON.stringify({
    success: true,
    membership_number,
    card_number,
    member_id: memberRecord.id,
    // Verification token returned ONCE for admin to generate QR
    // The admin page uses this to create the QR code URL
    // It is NOT stored in this form anywhere after this response
    verification_token,
    qr_url: `${Deno.env.get("SITE_URL") ?? "http://localhost"}/verify.html?id=${verification_token}`,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
