/**
 * Saved places for a trip. A saved item is a candidate — it never becomes an
 * itinerary item on its own; the traveller promotes it explicitly.
 */
import { useEffect, useState } from "react";
import { Bookmark, Plus, Trash2, CalendarPlus, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { addItems, listSaved, removeSaved, savePlace } from "@/lib/trips/api";
import type { ItineraryItem, SavedPlace, Trip } from "@/lib/trips/types";

interface Props {
  trip: Trip;
  items: ItineraryItem[];
  onItemsAdded: (added: ItineraryItem[]) => void;
}

export default function TripSavedSection({ trip, items, onItemsAdded }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    listSaved(trip.id).then(setSaved).catch(() => setSaved([]));
  }, [trip.id]);

  const add = async () => {
    if (!user || !title.trim()) return;
    try {
      const row = await savePlace(trip.id, user.id, {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        city: trip.destination.split(",")[0]?.trim() ?? null,
        source: "manual",
      });
      setSaved((s) => [row, ...s]);
      setTitle(""); setSubtitle(""); setAdding(false);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save that");
    }
  };

  const remove = async (id: string) => {
    await removeSaved(id).catch(() => toast.error("Couldn't remove"));
    setSaved((s) => s.filter((x) => x.id !== id));
  };

  const promote = async (p: SavedPlace) => {
    if (!user) return;
    const day = 1;
    try {
      const added = await addItems(
        trip.id,
        user.id,
        [{ day_number: day, time: null, activity: p.title, type: "activity", location: p.subtitle ?? p.city, notes: p.notes }],
        items.filter((i) => i.day_number === day).length,
      );
      onItemsAdded(added);
      toast.success(`Added to Day ${day}`);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add that");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-heading" style={{ fontSize: 16, fontWeight: 600 }}>Saved</p>
        <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1" style={{ color: "#3B82F6", fontSize: 12, fontWeight: 600 }}>
          <Plus className="h-3.5 w-3.5" /> Save a place
        </button>
      </div>

      {adding && (
        <div className="rounded-2xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Place or idea"
            className="w-full bg-transparent outline-none text-white rounded-xl px-3" style={{ background: "#1A2236", height: 42, fontSize: 14 }} />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Why it's worth it (optional)"
            className="w-full bg-transparent outline-none text-white rounded-xl px-3" style={{ background: "#1A2236", height: 42, fontSize: 13 }} />
          <button onClick={add} className="w-full text-white" style={{ background: "#3B82F6", borderRadius: 12, height: 42, fontSize: 13, fontWeight: 600 }}>
            Save
          </button>
        </div>
      )}

      {saved.length === 0 && !adding && (
        <div className="rounded-2xl p-5 text-center" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
          <Bookmark className="h-6 w-6 mx-auto" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
          <p className="mt-2 text-white" style={{ fontSize: 14, fontWeight: 600 }}>Nothing saved yet</p>
          <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
            Save places from Explore or add your own. Saved places stay out of the itinerary until you add them.
          </p>
        </div>
      )}

      {saved.map((p) => (
        <div key={p.id} className="flex items-start gap-3 rounded-2xl p-3" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1A2236" }}>
            <Bookmark className="h-4 w-4" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</p>
            {p.subtitle && <p className="truncate" style={{ color: "#94A3B8", fontSize: 12 }}>{p.subtitle}</p>}
          </div>
          <button onClick={() => promote(p)} aria-label="Add to itinerary" className="p-1.5">
            <CalendarPlus className="h-4 w-4" style={{ color: "#3B82F6" }} />
          </button>
          <button onClick={() => remove(p.id)} aria-label="Remove" className="p-1.5">
            <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
          </button>
        </div>
      ))}

      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px dashed #1E2A3F" }}>
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          <p className="text-white" style={{ fontSize: 13, fontWeight: 600 }}>Stays, experiences and Roavr Deals</p>
        </div>
        <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
          Bookable inventory isn't connected yet. When it is, anything you book will save straight into this trip.
        </p>
      </div>
    </div>
  );
}
