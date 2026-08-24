/**
 * Notification preference reads/writes.
 *
 * Defaults are deliberately conservative: relationship and collaboration
 * activity is on, anything commercial (travel alerts, nearby offers) is off
 * until the user turns it on. Roavr never pushes location-based marketing by
 * default.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PreferenceKey } from "./routing";

export interface NotificationPreferences {
  push_enabled: boolean;
  new_follower: boolean;
  messages: boolean;
  trip_collaboration: boolean;
  story_activity: boolean;
  travel_alerts: boolean;
  nearby_offers: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  new_follower: true,
  messages: true,
  trip_collaboration: true,
  story_activity: true,
  travel_alerts: false,
  nearby_offers: false,
};

export const PREFERENCE_COPY: Array<{
  key: PreferenceKey;
  label: string;
  desc: string;
  commercial?: boolean;
}> = [
  { key: "messages", label: "Messages", desc: "Direct messages from travelers you can talk to" },
  { key: "new_follower", label: "Follows & requests", desc: "When someone follows you or asks to" },
  { key: "trip_collaboration", label: "Trip collaboration", desc: "Invites and changes on shared trips" },
  { key: "story_activity", label: "Story activity", desc: "Replies and reactions to your stories" },
  { key: "travel_alerts", label: "Travel alerts", desc: "Time-sensitive updates for a trip you saved", commercial: true },
  { key: "nearby_offers", label: "Nearby offers", desc: "Local specials while you're travelling. Off by default.", commercial: true },
];

export async function fetchPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { ...DEFAULT_PREFERENCES, ...(data ?? {}) } as NotificationPreferences;
}

export async function savePreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
  return { error: (error as Error) ?? null };
}
