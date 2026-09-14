// Ritual — Crea una preferencia de pago único en Mercado Pago (Checkout
// Pro) para comprar un paquete de créditos, y devuelve init_point.
// Reemplaza a create-mp-subscription (suscripción recurrente) para
// Sprint 5 -- ver docs/ROADMAP.md. create-mp-subscription sigue activa
// sin tocar hasta que se cancelen las suscripciones existentes.
//
// Body: { package_id: string }. Requiere sesión (JWT) -- la compra
// siempre queda asociada a un usuario, con o sin pareja vinculada
// (consume_credits/grant_purchase_credits ya distinguen solo vs.
// pareja, ver migración 063).
//
// Secrets (Supabase Secrets, no Vercel): MP_ACCESS_TOKEN, MP_BACK_URL.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const MP_BACK_URL = Deno.env.get("MP_BACK_URL") || "https://rituales.site/precios";
const MP_CURRENCY_ID = Deno.env.get("MP_CURRENCY_ID") || "ARS";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  if (!MP_ACCESS_TOKEN) {
    return jsonResponse({ error: "mp_not_configured" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing_auth" });
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "invalid_session", details: userError?.message });
  }

  let body: { package_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_body" }, 400);
  }
  const packageId = typeof body?.package_id === "string" ? body.package_id.trim() : "";
  if (!packageId) {
    return jsonResponse({ error: "package_id_required" });
  }

  const { data: pack, error: packError } = await supabaseAuth
    .from("credit_packages")
    .select("id, credits, price_ars")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();

  if (packError || !pack) {
    return jsonResponse({ error: "invalid_package" });
  }

  // couple_id es opcional -- ver migración 063, la compra en modo solo
  // acredita a user_credits en vez de couple_credits.
  const { data: membership } = await supabaseAuth
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: purchase, error: insertError } = await supabaseService
    .from("credit_purchases")
    .insert({
      couple_id: membership?.couple_id ?? null,
      user_id: user.id,
      package_id: pack.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !purchase?.id) {
    console.error("credit_purchases insert error", insertError);
    return jsonResponse({ error: "db_error" });
  }

  const baseUrl = MP_BACK_URL.includes("?") ? MP_BACK_URL.split("?")[0] : MP_BACK_URL;
  const successUrl = `${baseUrl}?purchase=${encodeURIComponent(purchase.id)}&mp=success`;
  const failureUrl = `${baseUrl}?purchase=${encodeURIComponent(purchase.id)}&mp=failure`;

  const preference = {
    items: [
      {
        id: pack.id,
        title: `Rituales — ${pack.credits} créditos`,
        quantity: 1,
        unit_price: pack.price_ars,
        currency_id: MP_CURRENCY_ID,
      },
    ],
    payer: { email: user.email || undefined },
    back_urls: { success: successUrl, failure: failureUrl, pending: successUrl },
    auto_return: "approved" as const,
    external_reference: purchase.id,
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
    return jsonResponse({ error: "mp_error", details });
  }

  const initPoint = mpData.init_point || mpData.sandbox_init_point;
  if (!initPoint) {
    return jsonResponse({ error: "no_init_point", details: mpData.message || mpData.error || "MP no devolvió init_point" });
  }

  return jsonResponse({ init_point: initPoint, purchase_id: purchase.id });
});
