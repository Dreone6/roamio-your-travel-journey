/**
 * Pure delivery gates for `send-push`.
 *
 * Extracted from the handler so the rules that decide *whether* a person may
 * be notified can be tested directly (see `gates_test.ts`) without a network,
 * a database or a Firebase project. Nothing here relaxes RLS: these gates run
 * in addition to the service-role queries in `index.ts`, never instead of them.
 */

export const PREF_BY_TYPE: Record<string, string> = {
  new_follower: "new_follower",
  follow_request: "new_follower",
  message: "messages",
  trip_invite: "trip_collaboration",
  trip_collaboration: "trip_collaboration",
  story_reply: "story_activity",
  story_reaction: "story_activity",
  story_view_milestone: "story_activity",
  travel_alert: "travel_alerts",
  nearby_offer: "nearby_offers",
};

export const DEFAULT_PREFS: Record<string, boolean> = {
  push_enabled: true,
  new_follower: true,
  messages: true,
  trip_collaboration: true,
  story_activity: true,
  travel_alerts: false,
  nearby_offers: false,
};

/**
 * Types that describe activity *inside* someone's private circle. If the
 * recipient's profile is private, an actor with no accepted relationship must
 * not be able to generate one of these — that would leak both the activity and
 * the fact that the recipient exists.
 */
export const RELATIONSHIP_SCOPED = new Set([
  "story_reply",
  "story_reaction",
  "story_view_milestone",
]);

export interface NotifyPayload {
  userId?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  data?: unknown;
}

export type ValidationResult =
  | { ok: true; recipientId: string; type: string; title: string; body: string; data: Record<string, string> }
  | { ok: false; error: string };

/** Rejects malformed or unknown-type payloads before anything is written. */
export function validatePayload(payload: NotifyPayload): ValidationResult {
  const recipientId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const type = typeof payload.type === "string" ? payload.type : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";

  if (!recipientId || !type || !title) {
    return { ok: false, error: "userId, type and title are required" };
  }
  if (!(type in PREF_BY_TYPE)) {
    return { ok: false, error: `unknown notification type: ${type}` };
  }
  if (title.length > 120) return { ok: false, error: "title too long" };

  const rawBody = typeof payload.body === "string" ? payload.body : "";
  if (rawBody.length > 500) return { ok: false, error: "body too long" };

  const data: Record<string, string> = {};
  if (payload.data && typeof payload.data === "object") {
    for (const [k, v] of Object.entries(payload.data as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        data[k] = String(v);
      }
    }
  }

  return { ok: true, recipientId, type, title, body: rawBody, data };
}

export function requiresRelationship(type: string): boolean {
  return RELATIONSHIP_SCOPED.has(type);
}

/**
 * Relationship gate for a private recipient. `null` means allowed.
 */
export function relationshipSkip(input: {
  type: string;
  actorId: string | null;
  recipientPrivate: boolean;
  actorFollowsRecipient: boolean;
  recipientFollowsActor: boolean;
}): "private_relationship" | null {
  if (!requiresRelationship(input.type)) return null;
  if (!input.recipientPrivate) return null;
  if (!input.actorId) return "private_relationship";
  if (input.actorFollowsRecipient || input.recipientFollowsActor) return null;
  return "private_relationship";
}

export type PushDecision = "muted" | "no_devices" | "not_configured" | "send";

/** Decides the push outcome once the notification row is safely written. */
export function pushDecision(input: {
  type: string;
  prefs: Record<string, unknown>;
  deviceCount: number;
  fcmConfigured: boolean;
}): PushDecision {
  const prefs = { ...DEFAULT_PREFS, ...input.prefs };
  if (!prefs.push_enabled) return "muted";
  if (!prefs[PREF_BY_TYPE[input.type]]) return "muted";
  if (input.deviceCount <= 0) return "no_devices";
  if (!input.fcmConfigured) return "not_configured";
  return "send";
}

/** FCM statuses that mean the token is permanently dead. */
export function isDeadToken(status: number): boolean {
  return status === 404 || status === 403;
}
