// Ritual — Decide en el servidor si el usuario puede jugar (suscripción activa o prueba gratuita).
// El cliente solo confía en esta respuesta; no hay bypass posible en el front.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ allowed: false, error: "missing_auth" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace(/^Bearer\s*/i, "").trim();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(
      JSON.stringify({ allowed: false, error: "invalid_session" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
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
      { headers: { "Content-Type": "application/json" } }
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
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (profile.trial_used === true) {
    return new Response(
      JSON.stringify({ allowed: false }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  await supabase
    .from("profiles")
    .update({ trial_used: true, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return new Response(
    JSON.stringify({ allowed: true, usedTrial: true }),
    { headers: { "Content-Type": "application/json" } }
  );
});
