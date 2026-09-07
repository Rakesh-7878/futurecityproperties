// ============================================================
// FUTURECITY PROPERTIES — MEMBERSHIP SYSTEM
// Edge Function: reject-application
//
// PRIVILEGED — Admin only.
// Updates application status to REJECTED with optional notes.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jwt = authHeader.replace("Bearer ", "");
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

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  const { data: adminUser } = await adminClient
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Forbidden." }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { application_id, reason, action } = body as {
    application_id?: string;
    reason?: string;
    action?: string; // 'reject' | 'correction' | 'suspend'
  };

  if (!application_id) {
    return new Response(JSON.stringify({ error: "application_id is required." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const statusMap: Record<string, string> = {
    reject: "REJECTED",
    correction: "CORRECTION_REQUIRED",
    suspend: "SUSPENDED",
  };
  const newStatus = statusMap[String(action)] ?? "REJECTED";
  const auditAction = {
    reject: "APPLICATION_REJECTED",
    correction: "CORRECTION_REQUESTED",
    suspend: "MEMBER_SUSPENDED",
  }[String(action)] ?? "APPLICATION_REJECTED";

  await adminClient
    .from("membership_applications")
    .update({
      status: newStatus,
      admin_notes: String(reason ?? "").substring(0, 500) || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", application_id);

  await adminClient.from("audit_logs").insert({
    admin_user_id: adminUser.id,
    action: auditAction,
    target_type: "application",
    target_id: application_id,
    metadata: { reason: String(reason ?? "").substring(0, 500) }
  });

  return new Response(JSON.stringify({ success: true, status: newStatus }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
