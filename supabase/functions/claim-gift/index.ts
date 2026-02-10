// Ritual — El usuario con sesión activa reclama un regalo por token.
// Body: { token: string }. Marca el gift como claimed y crea/actualiza subscription (1 mes, plan gift).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "missing_auth" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "invalid_session" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "invalid_token" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: gift, error: giftError } = await supabase
    .from("gifts")
    .select("id, status, claimed_user_id")
    .eq("token", token)
    .maybeSingle();

  if (giftError || !gift) {
    return new Response(JSON.stringify({ error: "gift_not_found" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  if (gift.status !== "paid") {
    return new Response(JSON.stringify({ error: "gift_not_paid" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  if (gift.claimed_user_id) {
    return new Response(JSON.stringify({ error: "gift_already_claimed" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const now = new Date().toISOString();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabase.from("gifts").update({
    status: "claimed",
    claimed_user_id: user.id,
    updated_at: now,
  }).eq("id", gift.id);

  await supabase.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan: "gift",
      status: "active",
      current_period_start: now,
      current_period_end: periodEnd.toISOString(),
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
});
