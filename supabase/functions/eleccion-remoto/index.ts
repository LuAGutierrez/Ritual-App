// Ritual — Modo remoto para Elección mutua (host pago, invitado puede unirse con cuenta).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
};

const VALID_MODES = new Set(["modo1", "modo2", "modo3"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function normalizeRoomCode(input: string) {
  return (input || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function createUniqueCode(admin: ReturnType<typeof createClient>) {
  for (let i = 0; i < 8; i += 1) {
    const code = randomCode();
    const { data } = await admin
      .from("remote_eleccion_rooms")
      .select("id")
      .eq("room_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  return `${Date.now().toString(36).slice(-6)}`.toUpperCase();
}

function isParticipant(room: any, userId: string) {
  return room && (room.owner_user_id === userId || room.guest_user_id === userId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing_auth" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: "invalid_session" });

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const action = typeof payload.action === "string" ? payload.action : "";

  if (action === "create") {
    const modeSlug = typeof payload.modeSlug === "string" ? payload.modeSlug.trim() : "";
    if (!VALID_MODES.has(modeSlug)) return json({ error: "invalid_mode" });

    const { data: sub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();
    if (!sub?.id) return json({ error: "subscription_required" });

    const roomCode = await createUniqueCode(admin);
    const { data: room, error } = await admin
      .from("remote_eleccion_rooms")
      .insert({
        room_code: roomCode,
        owner_user_id: user.id,
        mode_slug: modeSlug,
        status: "waiting",
      })
      .select("*")
      .single();

    if (error || !room) return json({ error: "create_failed", details: error?.message || "unknown" });
    return json({ room });
  }

  if (action === "join") {
    const roomCode = normalizeRoomCode(payload.roomCode || "");
    if (!roomCode) return json({ error: "invalid_room_code" });

    const { data: room, error } = await admin
      .from("remote_eleccion_rooms")
      .select("*")
      .eq("room_code", roomCode)
      .maybeSingle();
    if (error || !room) return json({ error: "room_not_found" });
    if (new Date(room.expires_at).getTime() < Date.now()) return json({ error: "room_expired" });
    if (room.status === "closed") return json({ error: "room_closed" });

    if (room.owner_user_id === user.id || room.guest_user_id === user.id) return json({ room });
    if (room.guest_user_id && room.guest_user_id !== user.id) return json({ error: "room_full" });

    const { data: updated, error: updateErr } = await admin
      .from("remote_eleccion_rooms")
      .update({
        guest_user_id: user.id,
        status: room.status === "waiting" ? "playing" : room.status,
      })
      .eq("id", room.id)
      .select("*")
      .single();
    if (updateErr || !updated) return json({ error: "join_failed", details: updateErr?.message || "unknown" });
    return json({ room: updated });
  }

  if (action === "state") {
    const roomCode = normalizeRoomCode(payload.roomCode || "");
    if (!roomCode) return json({ error: "invalid_room_code" });
    const { data: room, error } = await admin
      .from("remote_eleccion_rooms")
      .select("*")
      .eq("room_code", roomCode)
      .maybeSingle();
    if (error || !room) return json({ error: "room_not_found" });
    if (!isParticipant(room, user.id)) return json({ error: "not_allowed" });
    return json({ room });
  }

  if (action === "submit_choice") {
    const roomCode = normalizeRoomCode(payload.roomCode || "");
    const choiceIndex = Number(payload.choiceIndex);
    if (!roomCode || !Number.isInteger(choiceIndex)) return json({ error: "invalid_payload" });

    const { data: room, error } = await admin
      .from("remote_eleccion_rooms")
      .select("*")
      .eq("room_code", roomCode)
      .maybeSingle();
    if (error || !room) return json({ error: "room_not_found" });
    if (!isParticipant(room, user.id)) return json({ error: "not_allowed" });
    if (room.status === "closed") return json({ error: "room_closed" });

    const patch: Record<string, unknown> = {};
    if (user.id === room.owner_user_id) {
      if (room.owner_choice != null) return json({ error: "already_submitted" });
      patch.owner_choice = choiceIndex;
    } else if (user.id === room.guest_user_id) {
      if (room.guest_choice != null) return json({ error: "already_submitted" });
      patch.guest_choice = choiceIndex;
    } else {
      return json({ error: "not_allowed" });
    }

    const nextOwner = patch.owner_choice != null ? Number(patch.owner_choice) : room.owner_choice;
    const nextGuest = patch.guest_choice != null ? Number(patch.guest_choice) : room.guest_choice;
    patch.status = nextOwner != null && nextGuest != null ? "revealed" : "playing";

    const { data: updated, error: updateErr } = await admin
      .from("remote_eleccion_rooms")
      .update(patch)
      .eq("id", room.id)
      .select("*")
      .single();
    if (updateErr || !updated) return json({ error: "submit_failed", details: updateErr?.message || "unknown" });
    return json({ room: updated });
  }

  if (action === "reset_round") {
    const roomCode = normalizeRoomCode(payload.roomCode || "");
    if (!roomCode) return json({ error: "invalid_room_code" });
    const { data: room, error } = await admin
      .from("remote_eleccion_rooms")
      .select("*")
      .eq("room_code", roomCode)
      .maybeSingle();
    if (error || !room) return json({ error: "room_not_found" });
    if (room.owner_user_id !== user.id) return json({ error: "only_host_can_reset" });

    const { data: updated, error: updateErr } = await admin
      .from("remote_eleccion_rooms")
      .update({
        owner_choice: null,
        guest_choice: null,
        status: room.guest_user_id ? "playing" : "waiting",
      })
      .eq("id", room.id)
      .select("*")
      .single();
    if (updateErr || !updated) return json({ error: "reset_failed", details: updateErr?.message || "unknown" });
    return json({ room: updated });
  }

  return json({ error: "unknown_action" }, 400);
});
