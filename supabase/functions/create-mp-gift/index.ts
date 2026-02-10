// Ritual — Crea un regalo (pago único en MP) y devuelve init_point.
// Body: { recipient_email: string }. Opcional: Authorization (para guardar quien compró).
// Secrets: MP_ACCESS_TOKEN, MP_BACK_URL (base para success/failure), MP_AMOUNT, MP_CURRENCY_ID.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const MP_BACK_URL = Deno.env.get("MP_BACK_URL") || "https://tudominio.com/precios.html";
const MP_AMOUNT = parseFloat(Deno.env.get("MP_AMOUNT") || "2.99");
const MP_CURRENCY_ID = Deno.env.get("MP_CURRENCY_ID") || "EUR";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
};

function randomToken(): string {
  const u = crypto.randomUUID();
  return u.replace(/-/g, "").slice(0, 24);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  if (!MP_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "mp_not_configured" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  let purchaserUserId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) purchaserUserId = user.id;
  }

  let body: { recipient_email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  const recipientEmail = typeof body?.recipient_email === "string" ? body.recipient_email.trim() : "";
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return new Response(JSON.stringify({ error: "invalid_recipient_email" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const token = randomToken();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: gift, error: insertError } = await supabase
    .from("gifts")
    .insert({
      token,
      recipient_email: recipientEmail,
      purchaser_user_id: purchaserUserId,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !gift?.id) {
    console.error("gifts insert error", insertError);
    return new Response(JSON.stringify({ error: "db_error" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const baseUrl = MP_BACK_URL.includes("?") ? MP_BACK_URL.split("?")[0] : MP_BACK_URL;
  const sep = baseUrl.includes("?") ? "&" : "?";
  const successUrl = `${baseUrl}${sep}mp=gift&token=${encodeURIComponent(token)}`;
  const failureUrl = `${baseUrl}${sep}mp=gift&token=${encodeURIComponent(token)}&failed=1`;

  const amount = Number.isFinite(MP_AMOUNT) && MP_AMOUNT > 0 ? MP_AMOUNT : 2.99;
  const preference = {
    items: [
      {
        id: "ritual-gift",
        title: "Ritual — Un mes de regalo",
        description: "Un mes de acceso a las tres experiencias para quien lo reciba.",
        quantity: 1,
        unit_price: amount,
        currency_id: MP_CURRENCY_ID,
      },
    ],
    back_urls: { success: successUrl, failure: failureUrl, pending: successUrl },
    auto_return: "approved" as const,
    external_reference: gift.id,
  };

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });

  const mpData = await mpRes.json().catch(() => ({}));
  if (!mpRes.ok) {
    const details = mpData.message || mpData.error || mpRes.statusText || "unknown";
    return new Response(
      JSON.stringify({ error: "mp_error", details: details }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  const initPoint = mpData.init_point || mpData.sandbox_init_point;
  if (!initPoint) {
    return new Response(
      JSON.stringify({ error: "no_init_point", details: mpData.message || mpData.error || "MP no devolvió init_point" }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  return new Response(
    JSON.stringify({ init_point: initPoint, token }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
});
