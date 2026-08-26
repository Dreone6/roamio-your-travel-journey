/**
 * Save-to-trip for feed items.
 *
 * One tap turns a real place from someone's memory/story/check-in into a
 * saved place on one of the viewer's own planning/active trips. When the
 * destination matches an existing trip it lands there directly; when several
 * trips could take it, a picker sheet opens. Never creates trips silently.
 */
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { listTrips, savePlace } from "@/lib/trips/api";
import type { Trip } from "@/lib/trips/types";
import type { FeedItem } from "@/lib/social/types";

export interface SaveTarget {
  title: string;
  subtitle: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  sourceId: string;
}

export function feedItemToSave(item: FeedItem): SaveTarget {
  const place = item.locationName ?? [item.city, item.country].filter(Boolean).join(", ");
  const caption = item.type === "milestone" && item.caption ? item.caption.replace(/_/g, " ") : item.caption;
  return {
    title: place || caption || `Shared by ${item.author.name}`,
    subtitle: item.author.name === "You" ? null : `From ${item.author.name}`,
    city: item.city,
    country: item.country,
    notes: caption && place ? caption : null,
    sourceId: item.id,
  };
}

const norm = (s: string) => s.trim().toLowerCase();

export function useSaveToTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pending, setPending] = useState<SaveTarget | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const persist = useCallback(
    async (trip: Trip, target: SaveTarget) => {
      if (!user) return;
      await savePlace(trip.id, user.id, {
        title: target.title,
        kind: "place",
        subtitle: target.subtitle,
        city: target.city,
        country: target.country,
        notes: target.notes,
        source: "feed",
        source_id: target.sourceId,
      });
      setSavedIds((prev) => new Set(prev).add(target.sourceId));
      toast.success(`Saved to ${trip.title ?? trip.destination}`);
    },
    [user],
  );

  const save = useCallback(
    async (item: FeedItem) => {
      if (!user || busyId) return;
      const target = feedItemToSave(item);
      if (savedIds.has(target.sourceId)) return;
      setBusyId(target.sourceId);
      try {
        const all = await listTrips(user.id);
        const active = all.filter((t) => t.status !== "completed");
        const match = target.city
          ? active.find((t) => norm(t.destination).includes(norm(target.city!)))
          : undefined;
        if (match) {
          await persist(match, target);
        } else if (active.length === 1) {
          await persist(active[0], target);
        } else if (active.length === 0) {
          toast("No trip to save to yet", {
            description: "Plan a trip first — then places you save land on it.",
            action: { label: "Plan a trip", onClick: () => navigate("/trips") },
          });
        } else {
          setTrips(active);
          setPending(target);
          setSheetOpen(true);
        }
      } catch {
        toast.error("Couldn't save that place");
      } finally {
        setBusyId(null);
      }
    },
    [user, busyId, savedIds, persist, navigate],
  );

  const choose = useCallback(
    async (trip: Trip) => {
      if (!pending) return;
      try {
        await persist(trip, pending);
      } catch {
        toast.error("Couldn't save that place");
      }
      setSheetOpen(false);
      setPending(null);
    },
    [pending, persist],
  );

  return {
    save,
    choose,
    sheetOpen,
    setSheetOpen,
    trips,
    pending,
    busyId,
    isSaved: (sourceId: string) => savedIds.has(sourceId),
  };
}
