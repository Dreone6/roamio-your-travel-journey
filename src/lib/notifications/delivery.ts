/**
 * How an arriving push turns into app behaviour.
 *
 * Pure and dependency-free so the three delivery modes a real device produces
 * (cold start, background resume, foreground) can be covered by automated
 * tests. The OS side of the round trip still needs a physical device; this
 * module makes sure that once the payload reaches JavaScript, the decision is
 * deterministic and safe.
 *
 * Routing never grants access — every destination is an authenticated route
 * and RLS still governs what the screen can read.
 */
import { routeForNotification, type NotificationPayload } from "./routing";

export type DeliveryMode = "cold_start" | "background" | "foreground";

export type DeliveryAction =
  /** Navigate immediately; the user explicitly tapped the notification. */
  | { kind: "navigate"; path: string; replace: boolean }
  /** Show an in-app toast with a "View" action; do not steal the current screen. */
  | { kind: "toast"; path: string; title: string; body?: string };

const DEFAULT_TITLE = "Roavr";

export function resolveDelivery(
  push: { title?: string; body?: string; data?: unknown } | null | undefined,
  mode: DeliveryMode
): DeliveryAction {
  const data: NotificationPayload =
    push?.data && typeof push.data === "object" ? (push.data as NotificationPayload) : {};

  // routeForNotification already falls back to /notifications for anything
  // unknown, malformed or outside the allow-list.
  const path = routeForNotification(data);

  if (mode === "foreground") {
    return { kind: "toast", path, title: push?.title ?? DEFAULT_TITLE, body: push?.body };
  }

  // A cold start replaces the launch route; a background resume pushes onto
  // the existing stack so Back still returns where the user was.
  return { kind: "navigate", path, replace: mode === "cold_start" };
}
