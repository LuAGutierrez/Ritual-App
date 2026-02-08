// Ritual — Webhook de Mercado Pago para suscripciones.
// MP envía POST con type (ej. subscription_preapproval) y data.id = preapproval id.
// Si la suscripción está authorized, actualizamos/creamos la fila en subscriptions (service_role).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  if (!MP_ACCESS_TOKEN || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let preapprovalId: string | null = null;
  try {
    const body = await req.json();
    const type = body?.type || "";
    if (type === "subscription_preapproval" || type === "subscription_authorized_payment") {
      preapprovalId = body?.data?.id ?? null;
    }
    if (!preapprovalId && body?.data?.id) preapprovalId = body.data.id;
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const urlParams = new URL(req.url).searchParams;
  const dataIdParam = urlParams.get("data.id");
  if (!preapprovalId && dataIdParam) preapprovalId = dataIdParam;

  if (!preapprovalId) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

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
  } else if (status === "cancelled" || status === "paused" || status === "pending") {
    if (status === "cancelled" || status === "paused") {
      await supabase.from("subscriptions").update({ status: "canceled", updated_at: now }).eq("mp_subscription_id", preapprovalId);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
