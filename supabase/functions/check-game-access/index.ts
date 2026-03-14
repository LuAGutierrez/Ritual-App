/// <reference path="../deno.d.ts" />
// Ritual — Decide en el servidor si el usuario puede jugar por juego+modo.
// Regla: modo 1 de cada juego es gratis; modos 2/3 requieren suscripción activa.
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

const FREE_MODE_BY_GAME: Record<string, string> = {
  conexion: "suave",
  picante: "nivel1",
  eleccion: "modo1",
  memoria: "modo1",
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

  let payload: { gameSlug?: string; modeSlug?: string } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
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

  const gameSlug = typeof payload?.gameSlug === "string" ? payload.gameSlug.trim() : "";
  const modeSlug = typeof payload?.modeSlug === "string" ? payload.modeSlug.trim() : "";

  if (gameSlug && modeSlug && FREE_MODE_BY_GAME[gameSlug] === modeSlug) {
    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  // Si no viene juego+modo, solo validamos sesión/email (para gate inicial).
  if (!gameSlug || !modeSlug) {
    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (sub?.id) {
    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }

  return new Response(
    JSON.stringify({ allowed: false }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
  );
});
