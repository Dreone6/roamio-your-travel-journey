import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FlashKind = "insert" | "update";

export interface PresenceUser {
  user_id: string;
  editing_item_id?: string | null;
  name?: string;
}

export function useTripCollab(tripId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [flashes, setFlashes] = useState<Record<string, FlashKind>>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!tripId) return;

    const ch = supabase
      .channel(`trip-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "itinerary_items", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;
          qc.setQueryData(["trip", tripId, "items"], (old: any[] = []) => {
            if (payload.eventType === "INSERT") {
              if (old.find((i) => i.id === newRow.id)) return old;
              return [...old, newRow];
            }
            if (payload.eventType === "UPDATE") {
              return old.map((i) => (i.id === newRow.id ? newRow : i));
            }
            if (payload.eventType === "DELETE") {
              return old.filter((i) => i.id !== oldRow.id);
            }
            return old;
          });
          const id = newRow?.id ?? oldRow?.id;
          if (id && payload.eventType !== "DELETE") {
            setFlashes((f) => ({ ...f, [id]: payload.eventType === "INSERT" ? "insert" : "update" }));
            setTimeout(() => {
              setFlashes((f) => {
                const n = { ...f };
                delete n[id];
                return n;
              });
            }, 800);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${tripId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["trip", tripId, "members"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "itinerary_item_votes", filter: `trip_id=eq.${tripId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["trip", tripId, "votes"] });
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tripId, qc]);

  // Presence channel
  const presenceRef = useRef<any>(null);
  useEffect(() => {
    if (!tripId || !userId) return;
    const ch = supabase.channel(`presence-trip-${tripId}`, { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const list: PresenceUser[] = Object.entries(state).flatMap(([key, metas]) =>
        metas.map((m: any) => ({ user_id: key, editing_item_id: m.editing_item_id ?? null, name: m.name }))
      );
      setPresence(list);
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ user_id: userId, editing_item_id: null });
      }
    });
    presenceRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tripId, userId]);

  const setEditing = (itemId: string | null) => {
    presenceRef.current?.track({ user_id: userId, editing_item_id: itemId });
  };

  return { presence, flashes, setEditing };
}
