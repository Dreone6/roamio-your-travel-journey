/**
 * Client boundary for triggering a notification.
 *
 * Callers never talk to FCM and never write the notifications table directly:
 * the `send-push` edge function enforces block checks, relationship scope and
 * the recipient's preferences. Roavr only calls this from a real user action
 * (sending a message, inviting a collaborator, following someone).
 */
import { supabase } from "@/integrations/supabase/client";
import type { NotificationType } from "./routing";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, string>;
}

export type NotifyOutcome =
  | { ok: true; push: "sent" | "muted" | "no_devices" | "not_configured" }
  | { ok: false; reason: string };

export async function notifyUser(input: NotifyInput): Promise<NotifyOutcome> {
  const { data, error } = await supabase.functions.invoke("send-push", { body: input });
  if (error) return { ok: false, reason: error.message };
  if (data?.error) return { ok: false, reason: String(data.error) };
  if (data?.skipped) return { ok: false, reason: String(data.skipped) };
  return { ok: true, push: data?.push ?? "muted" };
}
