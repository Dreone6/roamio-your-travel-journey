/**
 * Live presence for a trip workspace. Uses a Supabase realtime presence
 * channel scoped to the trip id, so only people who can open the trip (RLS
 * governs that) ever join it. Nothing is persisted.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PresentUser {
  user_id: string;
  name: string;
  avatar: string | null;
  self: boolean;
}

export function useTripPresence(tripId: string | undefined) {
  const { user } = useAuth();
  const [present, setPresent] = useState<PresentUser[]>([]);

  useEffect(() => {
    if (!tripId || !user) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, profile_photo")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      channel = supabase.channel(`trip-presence-${tripId}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<{ name?: string; avatar?: string | null }>();
          const list: PresentUser[] = Object.entries(state).map(([id, metas]) => {
            const meta = (metas as any[])[0] ?? {};
            return {
              user_id: id,
              name: meta.name || "Traveler",
              avatar: meta.avatar ?? null,
              self: id === user.id,
            };
          });
          list.sort((a, b) => Number(b.self) - Number(a.self));
          setPresent(list);
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel!.track({
            name: profile?.name || "Traveler",
            avatar: profile?.profile_photo ?? null,
            at: new Date().toISOString(),
          });
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tripId, user]);

  return present;
}
