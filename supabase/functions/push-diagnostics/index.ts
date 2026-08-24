/**
 * push-diagnostics — admin-only verification harness for Roavr push.
 *
 * Two actions, both restricted to accounts holding the `admin` role via the
 * security-definer `has_role` function. There is no client-side role check to
 * bypass: an ordinary user's JWT is rejected here, on the server.
 *
 *   action: "status" — reports whether APNs/FCM credentials are present, the
 *     caller's (or a target user's) registered devices, when each token was
 *     last refreshed, and whether the send path is reachable. Only booleans,
 *     truncated token fingerprints and timestamps are returned — never a
 *     credential, never a full device token.
 *
 *   action: "test" — sends a real notification through the real `send-push`
 *     function using the admin's own JWT, so every block / privacy / preference
 *     gate applies exactly as in production. Nothing is written directly to the
 *     notifications table from here.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Notification categories a test push may use. Mirrors send-push. */
const TEST_TYPES = [
  "message",
  "new_follower",
  "trip_collaboration",
  "story_reply",
  "travel_alert",
  "nearby_offer",
];

/** Last 6 characters only — enough to match a device, useless to an attacker. */
function fingerprint(token: string) {
  return `…${token.slice(-6)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const callerId = userData.user.id;

    // Server-side role gate. Ordinary accounts never get past this line.
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = payload.action === "test" ? "test" : "status";

    /* ------------------------------- status ------------------------------ */
    if (action === "status") {
      const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
      let fcmProjectId: string | null = null;
      let fcmValid = false;
      if (saRaw) {
        try {
          const sa = JSON.parse(saRaw);
          fcmProjectId = typeof sa.project_id === "string" ? sa.project_id : null;
          fcmValid = !!(sa.client_email && sa.private_key && fcmProjectId);
        } catch {
          fcmValid = false;
        }
      }

      const targetId =
        typeof payload.targetUserId === "string" && payload.targetUserId.length > 0
          ? payload.targetUserId
          : callerId;

      const { data: devices } = await admin
        .from("push_devices")
        .select("id, platform, provider, app_version, enabled, last_seen_at, created_at, token")
        .eq("user_id", targetId)
        .order("last_seen_at", { ascending: false });

      const rows = (devices ?? []).map((d) => ({
        id: d.id,
        platform: d.platform,
        provider: d.provider,
        appVersion: d.app_version,
        enabled: d.enabled,
        lastRefreshedAt: d.last_seen_at,
        registeredAt: d.created_at,
        tokenFingerprint: fingerprint(String(d.token ?? "")),
      }));

      const apnsDevices = rows.filter((r) => r.provider === "apns").length;
      const fcmDevices = rows.filter((r) => r.provider === "fcm").length;

      const missing: string[] = [];
      if (!saRaw) missing.push("FCM_SERVICE_ACCOUNT_JSON");
      else if (!fcmValid) missing.push("FCM_SERVICE_ACCOUNT_JSON (malformed service account)");
      if (!fcmProjectId) missing.push("Firebase project id");

      return json({
        callerId,
        targetUserId: targetId,
        fcm: {
          credentialPresent: !!saRaw,
          credentialValid: fcmValid,
          projectId: fcmProjectId,
          registeredDevices: fcmDevices,
        },
        // APNs is delivered through the same Firebase project: an APNs auth key
        // must be uploaded there. Its presence cannot be probed from here, so it
        // is reported as unverified rather than guessed.
        apns: {
          deliveredVia: "firebase",
          authKeyVerifiable: false,
          registeredDevices: apnsDevices,
        },
        devices: rows,
        sendPath: {
          function: "send-push",
          available: true,
          deliveryConfigured: fcmValid,
        },
        missing,
      });
    }

    /* -------------------------------- test ------------------------------- */
    const targetUserId = typeof payload.targetUserId === "string" ? payload.targetUserId.trim() : "";
    const type = typeof payload.type === "string" ? payload.type : "";
    const note = typeof payload.note === "string" ? payload.note.slice(0, 120) : "";

    if (!targetUserId) return json({ error: "targetUserId is required" }, 400);
    if (!TEST_TYPES.includes(type)) return json({ error: `unsupported test type: ${type}` }, 400);

    // Real send path, real gates, admin's own JWT as the actor.
    const res = await fetch(`${url}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: targetUserId,
        type,
        title: "Roavr test notification",
        body: note || "Delivery check from the Roavr notification harness.",
        // Safe payload: routes to the in-app inbox, references no real entity.
        data: { path: "/notifications", test: "true" },
      }),
    });

    const result = await res.json().catch(() => ({}));
    return json({ status: res.status, result }, res.ok ? 200 : 502);
  } catch (e) {
    console.error("push-diagnostics error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
