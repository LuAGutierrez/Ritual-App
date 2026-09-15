// Ritual — Webhook de Mercado Pago: pagos únicos de paquetes de créditos
// (Sprint 5). type payment, data.id = payment id, external_reference =
// credit_purchases.id (seteado por create-credit-checkout).
//
// La rama de suscripciones (subscription_preapproval, legacy) se retiró
// el 14/09/2026 junto con create-mp-subscription: sin esa función nada
// puede crear una preapproval nueva, y las 3 filas de subscriptions que
// había eran de prueba (ver docs/ROADMAP.md, Sprint 5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
// Configurar en Supabase (Edge Functions -> Secrets) con la "Clave secreta"
// que Mercado Pago muestra en Tu negocio > Configuración > Webhooks. Hasta
// que esté configurada, verifyMpSignature no bloquea nada (mismo
// comportamiento que antes) -- una vez seteada, empieza a rechazar
// requests sin firma válida.
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");

// Verificación de firma segun la documentación de Mercado Pago:
// x-signature: "ts=<timestamp>,v1=<hmac-sha256 hex>"
// manifest = `id:{data.id};request-id:{x-request-id};ts:{ts};`
async function verifyMpSignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) return true;

  const signatureHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts: Record<string, string> = {};
  for (const piece of signatureHeader.split(",")) {
    const [k, v] = piece.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === v1;
}

// Pago único de un paquete de créditos (Checkout Pro, Sprint 5).
// external_reference es el id de la fila en credit_purchases que
// create-credit-checkout ya insertó en estado 'pending' -- acá solo se
// confirma contra la API de MP (nunca se confía en el body del webhook
// solo) y se marca approved/rejected. grant_purchase_credits es
// idempotente (chequea credits_granted), así que no hace falta guardia
// extra contra reintentos del webhook.
async function handlePaymentEvent(supabase: ReturnType<typeof createClient>, dataId: string) {
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
  });
  const payment = await mpRes.json().catch(() => ({}));
  if (!mpRes.ok) return;

  const status = payment.status;
  const purchaseId = payment.external_reference;
  if (!purchaseId) return;

  if (status === "approved") {
    const { error } = await supabase
      .from("credit_purchases")
      .update({ status: "approved", mp_payment_id: String(payment.id) })
      .eq("id", purchaseId)
      .eq("status", "pending");
    if (error) console.error("mp-webhook credit_purchases update error", error);

    const { error: grantError } = await supabase.rpc("grant_purchase_credits", { p_purchase_id: purchaseId });
    if (grantError) console.error("mp-webhook grant_purchase_credits error", grantError);
  } else if (status === "rejected" || status === "cancelled") {
    await supabase
      .from("credit_purchases")
      .update({ status: "rejected", mp_payment_id: String(payment.id) })
      .eq("id", purchaseId)
      .eq("status", "pending");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  if (!MP_ACCESS_TOKEN || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let body: { type?: string; data?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const type = body?.type || "";
  const dataId = body?.data?.id ?? new URL(req.url).searchParams.get("data.id");

  if (!dataId) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (!(await verifyMpSignature(req, dataId))) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (type === "payment") {
    await handlePaymentEvent(supabase, dataId);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
