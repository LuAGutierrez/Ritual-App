// Ritual — Webhook de Mercado Pago: suscripciones (preapproval).
// Suscripción: type subscription_preapproval, data.id = preapproval id.
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
  const now = new Date().toISOString();

  // Suscripción recurrente
  if (type !== "subscription_preapproval" && type !== "subscription_authorized_payment") {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const preapprovalId = dataId;
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
  });
  const preapproval = await mpRes.json().catch(() => ({}));
  if (!mpRes.ok) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const status = preapproval.status;
  const externalRef = preapproval.external_reference;
  const userId = typeof externalRef === "string" ? externalRef : (externalRef != null ? String(externalRef) : null);
  if (!userId) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (status === "authorized") {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "monthly",
        status: "active",
        mp_subscription_id: preapprovalId,
        current_period_start: now,
        current_period_end: preapproval.next_payment_date || null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("mp-webhook upsert error", error);
    }
  } else if (status === "cancelled" || status === "paused") {
    await supabase.from("subscriptions").update({ status: "canceled", updated_at: now }).eq("mp_subscription_id", preapprovalId);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
