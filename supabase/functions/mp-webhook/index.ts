// Ritual — Webhook de Mercado Pago: suscripciones (preapproval) y regalos (payment).
// Suscripción: type subscription_preapproval, data.id = preapproval id.
// Regalo: type payment, data.id = payment id → external_reference = gift id.
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  // Regalo: pago único aprobado → marcar gift como paid
  if (type === "payment") {
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await payRes.json().catch(() => ({}));
    if (payRes.ok && (payment.status === "approved" || payment.status === "authorized")) {
      const giftId = payment.external_reference ?? null;
      if (giftId) {
        await supabase.from("gifts").update({
          status: "paid",
          mp_payment_id: dataId,
          updated_at: now,
        }).eq("id", giftId);
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

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
