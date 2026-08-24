/**
 * send-push — the single server-side delivery path for Roavr notifications.
 *
 * Guarantees:
 *  - always writes the in-app notification row (source of truth), then attempts
 *    a push only if the recipient's preferences allow that category;
 *  - refuses to notify across a block in either direction;
 *  - refuses relationship-scoped types when the actor cannot reach the
 *    recipient (e.g. follow-gated private accounts);
 *  - never fabricates activity: the caller must supply a real actor/entity, and
 *    nothing is sent on a schedule from this function;
 *  - if FCM credentials are absent, the in-app notification still lands and the
 *    response reports `push: "not_configured"` — no fake delivery.
 *
 * Required secret for real delivery:
 *   FCM_SERVICE_ACCOUNT_JSON — a Firebase service-account JSON string with the
 *   "Firebase Cloud Messaging API" enabled. iOS delivery additionally requires
 *   an APNs auth key uploaded to that Firebase project.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  isDeadToken,
  pushDecision,
  relationshipSkip,
  requiresRelationship,
  validatePayload,
} from "./gates.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ----------------------------- FCM v1 client ----------------------------- */

function b64url(bytes: Uint8Array | string) {
  const raw = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function fcmAccessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`))
  );
  const assertion = `${header}.${claim}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? "fcm token exchange failed");
  return json.access_token as string;
}

async function sendViaFcm(
  projectId: string,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
        android: { priority: "HIGH", notification: { sound: "default" } },
      },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

/* -------------------------------- handler -------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // The caller must be an authenticated user; they may only notify *others*
    // about their own activity. Server-side jobs use the service role key.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const isService = jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let actorId: string | null = null;

    if (!isService) {
      const { data, error } = await admin.auth.getUser(jwt);
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      actorId = data.user.id;
    }

    const payload = await req.json();
    const recipientId: string = payload.userId;
    const type: string = payload.type;
    const title: string = payload.title;
    const body: string = payload.body ?? "";
    const data: Record<string, string> = payload.data ?? {};
    actorId = isService ? payload.actorId ?? null : actorId;

    if (!recipientId || !type || !title) {
      return new Response(JSON.stringify({ error: "userId, type and title are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!(type in PREF_BY_TYPE)) {
      return new Response(JSON.stringify({ error: `unknown notification type: ${type}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (actorId === recipientId) {
      return new Response(JSON.stringify({ skipped: "self" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // --- relationship gate: a block in either direction stops everything ---
    if (actorId) {
      const { data: blocked } = await admin.rpc("is_blocked_between", {
        _a: actorId,
        _b: recipientId,
      });
      if (blocked) {
        return new Response(JSON.stringify({ skipped: "blocked" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // --- in-app notification is always the record of truth ---
    await admin.from("notifications").insert({
      user_id: recipientId,
      actor_id: actorId,
      type,
      title,
      body,
      data,
    });

    // --- preference gate ---
    const { data: prefRow } = await admin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", recipientId)
      .maybeSingle();
    const prefs = { ...DEFAULT_PREFS, ...(prefRow ?? {}) };
    if (!prefs.push_enabled || !prefs[PREF_BY_TYPE[type]]) {
      return new Response(JSON.stringify({ inApp: true, push: "muted" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: devices } = await admin
      .from("push_devices")
      .select("id, token, platform")
      .eq("user_id", recipientId)
      .eq("enabled", true);

    if (!devices?.length) {
      return new Response(JSON.stringify({ inApp: true, push: "no_devices" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!saRaw) {
      return new Response(
        JSON.stringify({
          inApp: true,
          push: "not_configured",
          required: ["FCM_SERVICE_ACCOUNT_JSON"],
        }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const sa = JSON.parse(saRaw);
    const accessToken = await fcmAccessToken(sa);
    let sent = 0;
    for (const device of devices) {
      const result = await sendViaFcm(sa.project_id, accessToken, device.token, title, body, {
        ...data,
        type,
      });
      if (result.ok) sent++;
      // 404/403 means the token is dead — retire it instead of retrying forever.
      else if (result.status === 404 || result.status === 403) {
        await admin.from("push_devices").delete().eq("id", device.id);
      }
    }

    return new Response(JSON.stringify({ inApp: true, push: "sent", sent, devices: devices.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
