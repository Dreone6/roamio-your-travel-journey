/**
 * The trip itinerary: real persisted rows, grouped by day, add / edit / remove
 * / reorder. Ordering is stored in itinerary_items.sort_order.
 */
import { useMemo, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  Plane, BedDouble, Utensils, Ticket, Car, StickyNote, Pencil, Trash2, Plus,
  ChevronUp, ChevronDown, Check, X, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { addItems, dateForDay, deleteItem, persistOrder, tripDayCount, updateItem } from "@/lib/trips/api";
import { ITEM_TYPES, type ItemType, type ItineraryItem, type Trip } from "@/lib/trips/types";

const ICONS: Record<ItemType, typeof Plane> = {
  flight: Plane,
  lodging: BedDouble,
  restaurant: Utensils,
  food: Utensils,
  activity: Ticket,
  transport: Car,
  note: StickyNote,
};

const NEEDS_REF: ItemType[] = ["flight", "lodging", "transport", "restaurant"];

interface Props {
  trip: Trip;
  items: ItineraryItem[];
  onChange: (items: ItineraryItem[]) => void;
}

interface Draft {
  day_number: number;
  time: string;
  activity: string;
  type: ItemType;
  location: string;
  notes: string;
  confirmation_ref: string;
}

const emptyDraft = (day: number): Draft => ({
  day_number: day,
  time: "",
  activity: "",
  type: "activity",
  location: "",
  notes: "",
  confirmation_ref: "",
});

export default function TripItinerary({ trip, items, onChange }: Props) {
  const { user } = useAuth();
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(1));

  const dayCount = tripDayCount(trip);
  const days = useMemo(() => {
    const known = new Set<number>(items.map((i) => i.day_number));
    for (let d = 1; d <= dayCount; d++) known.add(d);
    return [...known].sort((a, b) => a - b);
  }, [items, dayCount]);

  const forDay = (d: number) =>
    items.filter((i) => i.day_number === d).sort((a, b) => a.sort_order - b.sort_order);

  const submitAdd = async () => {
    if (!user || !draft.activity.trim()) return;
    try {
      const added = await addItems(
        trip.id,
        user.id,
        [{
          day_number: draft.day_number,
          time: draft.time || null,
          activity: draft.activity.trim(),
          type: draft.type,
          location: draft.location || null,
          notes: draft.notes || null,
          confirmation_ref: draft.confirmation_ref || null,
        }],
        forDay(draft.day_number).length,
      );
      onChange([...items, ...added]);
      setAddingDay(null);
      toast.success("Added to itinerary");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add that");
    }
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const patch = {
      time: draft.time || null,
      activity: draft.activity.trim(),
      type: draft.type,
      location: draft.location || null,
      notes: draft.notes || null,
      confirmation_ref: draft.confirmation_ref || null,
    };
    try {
      await updateItem(editingId, patch as Partial<ItineraryItem>);
      onChange(items.map((i) => (i.id === editingId ? { ...i, ...patch } : i)));
      setEditingId(null);
      toast.success("Updated");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteItem(id);
      onChange(items.filter((i) => i.id !== id));
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't remove");
    }
  };

  const move = async (day: number, index: number, dir: -1 | 1) => {
    const list = forDay(day);
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const reordered = list.map((it, idx) => ({ ...it, sort_order: idx }));
    onChange([...items.filter((i) => i.day_number !== day), ...reordered]);
    try {
      await persistOrder(reordered);
    } catch {
      toast.error("Couldn't save the new order");
    }
  };

  /** Live drag reorder — local first for buttery motion, persisted on drop. */
  const reorder = (day: number, next: ItineraryItem[]) => {
    const renumbered = next.map((it, idx) => ({ ...it, sort_order: idx }));
    onChange([...items.filter((i) => i.day_number !== day), ...renumbered]);
  };

  const persistDay = async (day: number) => {
    try {
      await persistOrder(forDay(day));
    } catch {
      toast.error("Couldn't save the new order");
    }
  };

  const startEdit = (it: ItineraryItem) => {
    setAddingDay(null);
    setEditingId(it.id);
    setDraft({
      day_number: it.day_number,
      time: it.time?.slice(0, 5) ?? "",
      activity: it.activity,
      type: it.type,
      location: it.location ?? "",
      notes: it.notes ?? it.description ?? "",
      confirmation_ref: it.confirmation_ref ?? "",
    });
  };

  const form = (onSubmit: () => void, onCancel: () => void) => (
    <div className="rounded-2xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {ITEM_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setDraft((d) => ({ ...d, type: t }))}
            className="shrink-0 capitalize"
            style={{
              background: draft.type === t ? "#3B82F6" : "#1A2236",
              color: draft.type === t ? "#FFFFFF" : "#94A3B8",
              border: "1px solid #1E2A3F", borderRadius: 8, padding: "6px 10px", fontSize: 12,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={draft.activity}
        onChange={(e) => setDraft((d) => ({ ...d, activity: e.target.value }))}
        placeholder="Title (e.g. Castillo San Felipe)"
        className="w-full bg-transparent outline-none text-white rounded-xl px-3"
        style={{ background: "#1A2236", height: 42, fontSize: 14 }}
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={draft.time}
          onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
          className="bg-transparent outline-none text-white rounded-xl px-3"
          style={{ background: "#1A2236", height: 42, fontSize: 14, width: 120 }}
        />
        <input
          value={draft.location}
          onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          placeholder="Place"
          className="flex-1 bg-transparent outline-none text-white rounded-xl px-3"
          style={{ background: "#1A2236", height: 42, fontSize: 14 }}
        />
      </div>
      {NEEDS_REF.includes(draft.type) && (
        <input
          value={draft.confirmation_ref}
          onChange={(e) => setDraft((d) => ({ ...d, confirmation_ref: e.target.value }))}
          placeholder="Confirmation / reference"
          className="w-full bg-transparent outline-none text-white rounded-xl px-3"
          style={{ background: "#1A2236", height: 42, fontSize: 14 }}
        />
      )}
      <textarea
        value={draft.notes}
        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        placeholder="Notes"
        rows={2}
        className="w-full bg-transparent outline-none text-white rounded-xl px-3 py-2 resize-none"
        style={{ background: "#1A2236", fontSize: 13 }}
      />
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-white"
          style={{ background: "#3B82F6", borderRadius: 12, height: 42, fontSize: 13, fontWeight: 600 }}
        >
          <Check className="h-4 w-4" /> Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 inline-flex items-center justify-center"
          style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 12, height: 42, color: "#94A3B8", fontSize: 13 }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {days.map((day) => {
        const list = forDay(day);
        const date = dateForDay(trip, day);
        return (
          <section key={day}>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-white font-heading" style={{ fontSize: 16, fontWeight: 600 }}>Day {day}</p>
                {date && (
                  <p style={{ color: "#94A3B8", fontSize: 12 }}>
                    {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setEditingId(null); setAddingDay(day); setDraft(emptyDraft(day)); }}
                className="inline-flex items-center gap-1"
                style={{ color: "#3B82F6", fontSize: 12, fontWeight: 600 }}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {list.length === 0 && addingDay !== day && (
                <p style={{ color: "#4B5563", fontSize: 12 }}>Nothing planned yet.</p>
              )}

              <Reorder.Group
                axis="y"
                values={list}
                onReorder={(next) => reorder(day, next as ItineraryItem[])}
                className="space-y-2"
              >
                {list.map((it, idx) => {
                  if (editingId === it.id) return <div key={it.id}>{form(submitEdit, () => setEditingId(null))}</div>;
                  return (
                    <ItemNode
                      key={it.id}
                      item={it}
                      first={idx === 0}
                      last={idx === list.length - 1}
                      onUp={() => move(day, idx, -1)}
                      onDown={() => move(day, idx, 1)}
                      onEdit={() => startEdit(it)}
                      onRemove={() => remove(it.id)}
                      onDrop={() => persistDay(day)}
                    />
                  );
                })}
              </Reorder.Group>


              {addingDay === day && form(submitAdd, () => setAddingDay(null))}
            </div>

          </section>
        );
      })}
    </div>
  );
}

/** A single draggable itinerary node with its own drag handle. */
function ItemNode({
  item, first, last, onUp, onDown, onEdit, onRemove, onDrop,
}: {
  item: ItineraryItem;
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDrop: () => void;
}) {
  const controls = useDragControls();
  const Icon = ICONS[item.type] ?? Ticket;

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      layout
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0,0,0,.6)", zIndex: 20 }}
      className="flex items-start gap-2.5 rounded-2xl p-3"
      style={{ background: "#111827", border: "1px solid #1E2A3F" }}
    >
      <button
        aria-label="Drag to reorder"
        onPointerDown={(e) => controls.start(e)}
        className="shrink-0 -ml-1 py-1 touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" style={{ color: "#4B5563" }} strokeWidth={1.5} />
      </button>

      <div className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "#1A2236" }}>
        <Icon className="h-4 w-4" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {item.time && (
            <span className="tabular-nums" style={{ color: "#3B82F6", fontSize: 12 }}>{item.time.slice(0, 5)}</span>
          )}
          <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 500 }}>{item.activity}</p>
        </div>
        {item.location && <p className="truncate" style={{ color: "#94A3B8", fontSize: 12 }}>{item.location}</p>}
        {(item.notes || item.description) && (
          <p className="mt-0.5" style={{ color: "#4B5563", fontSize: 11, lineHeight: 1.4 }}>
            {item.notes ?? item.description}
          </p>
        )}
        {item.confirmation_ref && (
          <p className="mt-1 inline-block rounded-md px-1.5 py-0.5" style={{ background: "#1A2236", color: "#94A3B8", fontSize: 10 }}>
            Ref {item.confirmation_ref}
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <div className="flex">
          <button onClick={onUp} aria-label="Move up" className="p-1">
            <ChevronUp className="h-3.5 w-3.5" style={{ color: first ? "#1E2A3F" : "#94A3B8" }} />
          </button>
          <button onClick={onDown} aria-label="Move down" className="p-1">
            <ChevronDown className="h-3.5 w-3.5" style={{ color: last ? "#1E2A3F" : "#94A3B8" }} />
          </button>
        </div>
        <div className="flex">
          <button onClick={onEdit} aria-label="Edit" className="p-1">
            <Pencil className="h-3.5 w-3.5" style={{ color: "#94A3B8" }} />
          </button>
          <button onClick={onRemove} aria-label="Remove" className="p-1">
            <Trash2 className="h-3.5 w-3.5" style={{ color: "#EF4444" }} />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}
