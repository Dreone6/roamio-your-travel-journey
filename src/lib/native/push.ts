/**
 * Native push notification adapter.
 *
 * Roavr rules encoded here:
 *  - permission is requested only after the user opts in from a Roavr screen,
 *    never on first launch;
 *  - a device token is persisted only for an authenticated user, and is removed
 *    from that user on sign-out so a shared device never leaks activity;
 *  - registration is a no-op on web (there is no web push provider configured),
 *    so every call is safe to make from shared code;
 *  - nothing in this module *sends* anything. Delivery is server-side only.
 */
import { PushNotifications, type Token } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { platform } from "./platform";
import type { PermissionOutcome } from "./permissionCopy";

export type PushPermission = PermissionOutcome | "prompt";

/** Payload handed to the app when a notification arrives or is opened. */
export interface IncomingPush {
  title?: string;
  body?: string;
  data: Record<string, unknown>;
}

const APP_VERSION = "1.0.0";

export function isPushSupported(): boolean {
  return platform.isNative;
}

function mapPermission(state: string | undefined): PushPermission {
  switch (state) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    case "prompt":
    case "prompt-with-rationale":
      return "prompt";
    default:
      return "unavailable";
  }
}

/** Current OS-level permission, without prompting. */
export async function getPushPermission(): Promise<PushPermission> {
  if (!isPushSupported()) return "unavailable";
  try {
    const { receive } = await PushNotifications.checkPermissions();
    return mapPermission(receive);
  } catch {
    return "unavailable";
  }
}

/** Prompts (only if the OS still allows a prompt) and returns the outcome. */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!isPushSupported()) return "unavailable";
  try {
    const current = await PushNotifications.checkPermissions();
    if (current.receive === "granted") return "granted";
    if (current.receive === "denied") return "denied";
    const { receive } = await PushNotifications.requestPermissions();
    return mapPermission(receive);
  } catch {
    return "unavailable";
  }
}

/**
 * Upserts the device token against the signed-in user. The unique constraint on
 * `token` means a device that changes hands is re-pointed at the new user
 * instead of fanning out to both.
 */
export async function persistDeviceToken(token: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user || !token) return;

  await supabase.from("push_devices").upsert(
    {
      user_id: data.user.id,
      token,
      platform: platform.platform,
      // iOS returns an APNs token unless a Firebase messaging layer is added.
      provider: platform.isIOS ? "apns" : "fcm",
      app_version: APP_VERSION,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );
}

/** Disables every token belonging to the current user (sign-out cleanup). */
export async function clearDeviceTokens(userId?: string): Promise<void> {
  const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!id) return;
  await supabase.from("push_devices").delete().eq("user_id", id);
}

export interface PushHandlers {
  /** Fires once the OS hands back a token (also on refresh). */
  onToken?: (token: string) => void;
  onError?: (message: string) => void;
  /** Notification delivered while the app is in the foreground. */
  onForeground?: (push: IncomingPush) => void;
  /** User tapped a notification (cold start or background). */
  onOpened?: (push: IncomingPush) => void;
}

/**
 * Attaches listeners and registers with APNs/FCM. Returns a cleanup function.
 * Safe to call on web — it simply does nothing.
 */
export async function startPush(handlers: PushHandlers): Promise<() => void> {
  if (!isPushSupported()) return () => undefined;

  const subs = await Promise.all([
    PushNotifications.addListener("registration", (t: Token) => {
      void persistDeviceToken(t.value);
      handlers.onToken?.(t.value);
    }),
    PushNotifications.addListener("registrationError", (err) => {
      handlers.onError?.(String((err as { error?: unknown })?.error ?? "registration failed"));
    }),
    PushNotifications.addListener("pushNotificationReceived", (n) => {
      handlers.onForeground?.({
        title: n.title,
        body: n.body,
        data: (n.data ?? {}) as Record<string, unknown>,
      });
    }),
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      handlers.onOpened?.({
        title: a.notification?.title,
        body: a.notification?.body,
        data: (a.notification?.data ?? {}) as Record<string, unknown>,
      });
    }),
  ]);

  try {
    await PushNotifications.register();
    // Clearing on launch keeps the tray in sync with the in-app inbox.
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : "register failed");
  }

  return () => {
    subs.forEach((s) => void s.remove());
  };
}
