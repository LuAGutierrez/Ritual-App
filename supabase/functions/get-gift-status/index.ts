// Ritual — Devuelve el estado de un regalo por token (para mostrar el enlace tras el pago).
// Body: { token: string }. Respuesta: { status: 'pending' | 'paid' | 'claimed', activar_link?: string }.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_BACK_URL = Deno.env.get("MP_BACK_URL") || "https://tudominio.com/precios.html";

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

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ status: "pending" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return new Response(JSON.stringify({ status: "pending" }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: gift } = await supabase
    .from("gifts")
    .select("status")
    .eq("token", token)
    .maybeSingle();

  const status = gift?.status || "pending";
  const base = MP_BACK_URL.replace(/\/[^/]*$/, "");
  const activarLink = status === "paid" ? `${base}/activar.html?token=${encodeURIComponent(token)}` : undefined;

  return new Response(
    JSON.stringify({ status, activar_link: activarLink }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
});
