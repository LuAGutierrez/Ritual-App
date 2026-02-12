// Ritual — Crea una suscripción pendiente en Mercado Pago y devuelve init_point para redirigir al usuario.
// Requiere: sesión válida (JWT). En Supabase Secrets: MP_ACCESS_TOKEN, opcional MP_BACK_URL, MP_AMOUNT, MP_CURRENCY_ID.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const MP_BACK_URL = Deno.env.get("MP_BACK_URL") || "https://rituales.vercel.app/precios.html";
const backUrlWithParam = MP_BACK_URL.includes("?") ? MP_BACK_URL : `${MP_BACK_URL}?mp=success`;
const MP_AMOUNT = parseFloat(Deno.env.get("MP_AMOUNT") || "5000");
const MP_CURRENCY_ID = Deno.env.get("MP_CURRENCY_ID") || "ARS";

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
  if (!MP_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "mp_not_configured" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "missing_auth" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    const errMsg = userError?.message || "invalid_session";
    return new Response(
      JSON.stringify({ error: "invalid_session", details: errMsg }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }

  const userId = user.id;
  const payerEmail = user.email || "";
  if (!payerEmail) {
    return new Response(JSON.stringify({ error: "user_email_required" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const amount = Number.isFinite(MP_AMOUNT) && MP_AMOUNT > 0 ? MP_AMOUNT : 2.99;
  const body = {
    reason: "Ritual — Suscripción mensual",
    external_reference: userId,
    payer_email: payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: amount,
      currency_id: MP_CURRENCY_ID,
    },
    back_url: backUrlWithParam,
    status: "pending",
  };

  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
    JSON.stringify({ init_point: initPoint, subscription_id: mpData.id }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
});
