/// <reference path="../deno.d.ts" />
// Ritual — Decide en el servidor si el usuario puede jugar (suscripción activa o prueba gratuita).
// El cliente solo confía en esta respuesta; no hay bypass posible en el front.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore — Deno resuelve npm: en runtime; el IDE no
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  const authHeader = req.headers.get("Authorization");
  const CORS = { ...CORS_HEADERS };
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ allowed: false, error: "missing_auth" }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ allowed: false, error: "invalid_session" }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  if (!user.email_confirmed_at) {
    return new Response(
      JSON.stringify({ allowed: false, needsEmailConfirmation: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  const userId = user.id;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (sub?.id) {
    return new Response(
      JSON.stringify({ allowed: true, usedTrial: false }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("trial_used")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ allowed: false }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  if (profile.trial_used === true) {
    return new Response(
      JSON.stringify({ allowed: false }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  await supabase
    .from("profiles")
    .update({ trial_used: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return new Response(
    JSON.stringify({ allowed: true, usedTrial: true }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
  );
});
