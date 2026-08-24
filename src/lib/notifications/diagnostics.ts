/**
 * Client boundary for the admin-only push verification harness.
 *
 * Everything here is a thin call into the `push-diagnostics` edge function,
 * which performs its own server-side `has_role('admin')` check. The helpers
 * below are for UI convenience only — hiding the panel is not the security
 * boundary, the function is.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DiagnosticsDevice {
  id: string;
  platform: string | null;
  provider: string | null;
  appVersion: string | null;
  enabled: boolean;
  lastRefreshedAt: string | null;
  registeredAt: string | null;
  /** Last few characters only — a full device token is never returned. */
  tokenFingerprint: string;
}

export interface PushDiagnostics {
  callerId: string;
  targetUserId: string;
  fcm: {
    credentialPresent: boolean;
    credentialValid: boolean;
    projectId: string | null;
    registeredDevices: number;
  };
  apns: {
    deliveredVia: string;
    authKeyVerifiable: boolean;
    registeredDevices: number;
  };
  devices: DiagnosticsDevice[];
  sendPath: { function: string; available: boolean; deliveryConfigured: boolean };
  missing: string[];
}

export const TEST_CATEGORIES = [
  { value: "message", label: "Message" },
  { value: "new_follower", label: "New follower" },
  { value: "trip_collaboration", label: "Trip collaboration" },
  { value: "story_reply", label: "Story reply" },
  { value: "travel_alert", label: "Travel alert" },
  { value: "nearby_offer", label: "Nearby offer" },
] as const;

export type TestCategory = (typeof TEST_CATEGORIES)[number]["value"];

/** UI-only convenience check; the edge function enforces the real gate. */
export async function isPushAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

export async function fetchPushDiagnostics(
  targetUserId?: string
): Promise<{ data: PushDiagnostics | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("push-diagnostics", {
    body: { action: "status", targetUserId },
  });
  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: String(data.error) };
  return { data: data as PushDiagnostics, error: null };
}

export interface TestPushResult {
  status: number;
  result: Record<string, unknown>;
}

export async function sendTestPush(input: {
  targetUserId: string;
  type: TestCategory;
  note?: string;
}): Promise<{ data: TestPushResult | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("push-diagnostics", {
    body: { action: "test", ...input },
  });
  if (error) return { data: null, error: error.message };
  if (data?.error) return { data: null, error: String(data.error) };
  return { data: data as TestPushResult, error: null };
}

/** Human summary of the outcome the real send path reported. */
export function describeTestOutcome(result: Record<string, unknown>): string {
  if (result.skipped === "blocked") return "Blocked — a block exists between the two accounts.";
  if (result.skipped === "private_relationship")
    return "Rejected — recipient is private and has no accepted relationship with you.";
  if (result.skipped === "self") return "Skipped — you cannot notify yourself.";
  switch (result.push) {
    case "sent":
      return `Delivered to ${result.sent ?? 0} of ${result.devices ?? 0} device(s).`;
    case "muted":
      return "In-app notification created; push muted by the recipient's preferences.";
    case "no_devices":
      return "In-app notification created; recipient has no registered device.";
    case "not_configured":
      return "In-app notification created; push provider credentials are not configured.";
    default:
      return "No delivery reported.";
  }
}
