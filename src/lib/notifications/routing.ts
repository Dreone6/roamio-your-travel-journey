/**
 * Notification -> in-app destination mapping.
 *
 * Pure and dependency-free so it can be unit tested and reused by both the
 * native "notification opened" handler and the in-app notifications list.
 *
 * Routing never grants access: every destination is an authenticated route and
 * RLS still governs what the screen can read. A malicious or stale payload can
 * only ever land the user on a screen they could have reached by hand.
 */

export type NotificationType =
  | "new_follower"
  | "follow_request"
  | "message"
  | "trip_invite"
  | "trip_collaboration"
  | "story_reply"
  | "story_reaction"
  | "story_view_milestone"
  | "travel_alert"
  | "nearby_offer";

/** Preference column each notification type is gated by. */
export const TYPE_TO_PREFERENCE: Record<NotificationType, PreferenceKey> = {
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

export type PreferenceKey =
  | "new_follower"
  | "messages"
  | "trip_collaboration"
  | "story_activity"
  | "travel_alerts"
  | "nearby_offers";

export interface NotificationPayload {
  type?: string;
  /** Optional explicit destination, validated against the allow-list below. */
  path?: string;
  /** Entity ids used to build a destination when no path is supplied. */
  conversationId?: string;
  tripId?: string;
  handle?: string;
  [key: string]: unknown;
}

/** Only these shapes may be opened from a push payload. */
const ALLOWED = [
  /^\/notifications$/,
  /^\/home$/,
  /^\/messages$/,
  /^\/messages\/[A-Za-z0-9_-]+$/,
  /^\/trips$/,
  /^\/trips\/[A-Za-z0-9_-]+$/,
  /^\/u\/[A-Za-z0-9_.-]+$/,
  /^\/nearby$/,
  /^\/globe$/,
];

function sanitize(path: string | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return ALLOWED.some((p) => p.test(pathname)) ? pathname : null;
}

/**
 * Resolves the route a notification should open. Falls back to the
 * notifications inbox rather than guessing, and never returns an unknown path.
 */
export function routeForNotification(payload: NotificationPayload): string {
  const explicit = sanitize(typeof payload.path === "string" ? payload.path : undefined);
  if (explicit) return explicit;

  switch (payload.type) {
    case "message":
      return payload.conversationId
        ? sanitize(`/messages/${payload.conversationId}`) ?? "/messages"
        : "/messages";
    case "trip_invite":
    case "trip_collaboration":
      return payload.tripId
        ? sanitize(`/trips/${payload.tripId}`) ?? "/trips"
        : "/trips";
    case "new_follower":
    case "follow_request":
      return payload.handle ? sanitize(`/u/${payload.handle}`) ?? "/notifications" : "/notifications";
    case "nearby_offer":
      return "/nearby";
    default:
      return "/notifications";
  }
}

export function preferenceForType(type: string | undefined): PreferenceKey | null {
  if (!type) return null;
  return TYPE_TO_PREFERENCE[type as NotificationType] ?? null;
}
