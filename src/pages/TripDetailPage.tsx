import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronLeft, Sparkles, Lightbulb, Plus, Copy, UserPlus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import TripMap from "@/components/trips/TripMap";
import FlightStatusCard from "@/components/flight/FlightStatusCard";
import ItemVotes from "@/components/trips/ItemVotes";
import { useTripCollab } from "@/hooks/useTripCollab";

const ACCENT = "#3B82F6";
const SURFACE = "#111827";
const ELEVATED = "#1A2236";
const BORDER = "#1E2A3F";
const BG = "#080D1A";

const TYPE_COLORS: Record<string, string> = {
  food: "#F59E0B",
  activity: "#10B981",
  transport: "#94A3B8",
  lodging: "#F59E0B",
  landmark: "#3B82F6",
  other: "#94A3B8",
};

const TYPE_EMOJI: Record<string, string> = {
  food: "🍽",
  activity: "🎯",
  transport: "🚆",
  lodging: "🏨",
  landmark: "📍",
  other: "✨",
};

type Tab = "itinerary" | "map" | "checklist" | "members" | "packing";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("itinerary");
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());

  const tripQ = useQuery({
    queryKey: ["trip", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const itemsQ = useQuery({
    queryKey: ["trip", id, "items"],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", id!)
        .order("day_number")
        .order("time", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const checklistQ = useQuery({
    queryKey: ["trip", id, "checklist"],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("checklists")
        .select("*")
        .eq("trip_id", id!)
        .order("created_at");
      return data ?? [];
    },
  });

  const membersQ = useQuery({
    queryKey: ["trip", id, "members"],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("trip_members").select("*").eq("trip_id", id!);
      return data ?? [];
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      await supabase.from("itinerary_items").update({ completed }).eq("id", itemId);
    },
    onMutate: async ({ itemId, completed }) => {
      qc.setQueryData(["trip", id, "items"], (old: any[] = []) =>
        old.map((i) => (i.id === itemId ? { ...i, completed } : i))
      );
    },
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      await supabase.from("checklists").update({ completed }).eq("id", itemId);
    },
    onMutate: async ({ itemId, completed }) => {
      qc.setQueryData(["trip", id, "checklist"], (old: any[] = []) =>
        old.map((i) => (i.id === itemId ? { ...i, completed } : i))
      );
    },
  });

  const trip = tripQ.data;
  const items = itemsQ.data ?? [];
  const members = membersQ.data ?? [];
  const { presence, flashes, setEditing } = useTripCollab(id, user?.id);
  const onlineIds = new Set(presence.map((p) => p.user_id));
  const editingByItem = new Map<string, string>(); // item_id -> user_id
  presence.forEach((p) => {
    if (p.editing_item_id && p.user_id !== user?.id) editingByItem.set(p.editing_item_id, p.user_id);
  });

  const days = useMemo(() => {
    const map = new Map<number, any[]>();
    items.forEach((it) => {
      const k = it.day_number ?? 1;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [items]);

  const dayDate = (n: number) => {
    if (!trip?.start_date) return null;
    const d = parseISO(trip.start_date);
    d.setDate(d.getDate() + (n - 1));
    return d;
  };

  if (tripQ.isLoading || !trip) {
    return (
      <div className="min-h-screen px-5 pt-6" style={{ background: BG }}>
        <div className="h-[220px] animate-pulse rounded-2xl" style={{ background: SURFACE }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: BG }}>
      {/* Header card */}
      <div className="relative h-[220px] overflow-hidden">
        {trip.cover_photo ? (
          <img src={trip.cover_photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, #0D0F1C 0%, ${ELEVATED} 100%)` }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(8,13,26,0.95) 0%, rgba(8,13,26,0.1) 70%, rgba(8,13,26,0.5) 100%)",
          }}
        />

        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
          aria-label="Back"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>

        <div className="absolute inset-x-5 bottom-4">
          {trip.ai_generated && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              <Sparkles size={12} strokeWidth={2} /> AI generated
            </span>
          )}
          <h1 className="mt-2 font-display text-[22px] font-semibold text-white">{trip.title}</h1>
          <p className="text-[13px] text-white/70">{trip.destination}</p>
          <p className="mt-1 text-[12px] text-white/50">
            {trip.start_date && format(parseISO(trip.start_date), "MMM d")} —{" "}
            {trip.end_date && format(parseISO(trip.end_date), "MMM d, yyyy")} · {trip.travelers}{" "}
            traveler{trip.travelers === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="sticky top-14 z-20 flex gap-1 overflow-x-auto px-3 py-2 no-scrollbar"
        style={{ background: BG, borderBottom: `0.5px solid ${BORDER}` }}
      >
        {(["itinerary", "map", "checklist", "members", "packing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium capitalize transition-colors"
            style={{
              background: tab === t ? ACCENT : "transparent",
              color: tab === t ? "#fff" : "rgba(255,255,255,0.6)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-5 pt-5">
        {tab === "itinerary" && (
          <div className="space-y-6">
            {members.length > 0 && (
              <div className="flex items-center gap-1.5">
                {members.slice(0, 8).map((m: any) => {
                  const online = onlineIds.has(m.user_id);
                  return (
                    <div key={m.id} className="relative">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: ELEVATED, border: `1px solid ${BORDER}` }}
                      >
                        {(m.user_id || "?").slice(0, 2).toUpperCase()}
                      </div>
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#10B981] ring-2 ring-[#080D1A]" />
                      )}
                    </div>
                  );
                })}
                <span className="ml-1 text-[11px] text-white/40">
                  {presence.length} online
                </span>
              </div>
            )}
            {days.length === 0 && (
              <p className="text-center text-[13px] text-white/50">No itinerary items yet.</p>
            )}
            {days.map(([dayNum, dayItems]) => {
              const d = dayDate(dayNum);
              const flightItem = dayItems.find((it: any) => it.type === "transport" && /\b[A-Z]{2}\s?\d{1,4}\b/.test(it.activity || ""));
              const flightMatch = flightItem?.activity?.match(/\b([A-Z]{2})\s?(\d{1,4})\b/);
              const flightNum = flightMatch ? `${flightMatch[1]}${flightMatch[2]}` : null;
              const flightDate = d ? format(d, "yyyy-MM-dd") : null;
              return (
                <section key={dayNum}>
                  <div className="mb-3">
                    <h2 className="font-display text-[16px] font-semibold text-white">
                      Day {dayNum}
                      {d && ` — ${format(d, "EEEE MMM d")}`}
                    </h2>
                  </div>
                  {flightNum && flightDate && (
                    <div className="mb-3">
                      <FlightStatusCard flightNumber={flightNum} date={flightDate} />
                    </div>
                  )}
                  <div className="space-y-2">

                    {dayItems.map((it) => {
                      const color = TYPE_COLORS[it.type] ?? ACCENT;
                      const isOpen = expandedTips.has(it.id);
                      const flash = flashes[it.id];
                      const editingBy = editingByItem.get(it.id);
                      return (
                        <article
                          key={it.id}
                          className="rounded-2xl p-3 transition-colors"
                          style={{
                            background:
                              flash === "insert"
                                ? "rgba(16,185,129,0.10)"
                                : flash === "update"
                                ? "rgba(245,158,11,0.10)"
                                : SURFACE,
                            border: editingBy
                              ? `1px dashed #F59E0B`
                              : `1px solid ${BORDER}`,
                            opacity: it.completed ? 0.5 : 1,
                            transition: "background 800ms ease-out, border 200ms ease-out",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <label className="mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md"
                              style={{
                                background: it.completed ? ACCENT : "transparent",
                                border: `1.5px solid ${it.completed ? ACCENT : BORDER}`,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!it.completed}
                                onChange={(e) =>
                                  toggleItem.mutate({ itemId: it.id, completed: e.target.checked })
                                }
                                className="sr-only"
                              />
                              {it.completed && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </label>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {(it.time_block || it.time) && (
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                    style={{ background: `${ACCENT}26`, color: ACCENT }}
                                  >
                                    {it.time_block || it.time}
                                  </span>
                                )}
                                <span className="text-base" style={{ color }}>
                                  {TYPE_EMOJI[it.type] ?? "✨"}
                                </span>
                              </div>
                              <p
                                className={cn(
                                  "mt-1 text-[14px] font-medium text-white",
                                  it.completed && "line-through"
                                )}
                              >
                                {it.activity}
                              </p>
                              {editingBy && (
                                <p className="mt-0.5 text-[11px] text-[#F59E0B]">
                                  {editingBy.slice(0, 6)} is editing…
                                </p>
                              )}
                              {it.location && (
                                <p className="text-[12px] text-white/50">{it.location}</p>
                              )}
                              {it.estimated_cost && (
                                <p className="mt-1 text-[12px] font-medium" style={{ color: ACCENT }}>
                                  ~${Number(it.estimated_cost).toFixed(0)}
                                </p>
                              )}
                              {(it.tips || it.notes) && (
                                <button
                                  onClick={() => {
                                    setExpandedTips((s) => {
                                      const n = new Set(s);
                                      n.has(it.id) ? n.delete(it.id) : n.add(it.id);
                                      return n;
                                    });
                                  }}
                                  className="mt-2 flex items-center gap-1.5 text-[11px]"
                                  style={{ color: ACCENT }}
                                >
                                  <Lightbulb size={12} strokeWidth={1.75} />
                                  {isOpen ? "Hide tip" : "Show tip"}
                                </button>
                              )}
                              {isOpen && (it.tips || it.notes) && (
                                <p className="mt-2 text-[12px] text-white/60">{it.tips || it.notes}</p>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {tab === "map" && (
          <TripMap days={days} startDate={trip.start_date} />
        )}

        {tab === "checklist" && (
          <ChecklistView
            items={checklistQ.data ?? []}
            onToggle={(itemId, completed) => toggleChecklist.mutate({ itemId, completed })}
            tripId={id!}
            userId={user!.id}
            onChange={() => qc.invalidateQueries({ queryKey: ["trip", id, "checklist"] })}
          />
        )}

        {tab === "members" && (
          <MembersView
            members={membersQ.data ?? []}
            tripId={id!}
            isOwner={trip.user_id === user?.id}
          />
        )}

        {tab === "packing" && (
          <PackingView
            items={(checklistQ.data ?? []).filter((c: any) => c.category === "packing")}
            onToggle={(itemId, completed) => toggleChecklist.mutate({ itemId, completed })}
          />
        )}
      </div>
    </div>
  );
}

function ChecklistView({
  items,
  onToggle,
  tripId,
  userId,
  onChange,
}: {
  items: any[];
  onToggle: (id: string, completed: boolean) => void;
  tripId: string;
  userId: string;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [text, setText] = useState("");

  const cats = ["packing", "documents", "pre_trip_tasks", "day_of", "booking", "other"] as const;
  type Cat = (typeof cats)[number];
  const grouped = cats.map((c) => ({
    cat: c,
    items: items.filter((i) => (i.category as Cat) === c),
  }));

  const total = items.length;
  const done = items.filter((i) => i.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const addItem = async (category: Cat) => {
    if (!text.trim()) return;
    await supabase.from("checklists").insert({
      user_id: userId,
      trip_id: tripId,
      item_name: text.trim(),
      category,
    });
    setText("");
    setAdding(null);
    onChange();
  };

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[12px] text-white/60">{done} of {total} packed</p>
          <p className="text-[12px] font-semibold" style={{ color: ACCENT }}>{pct}%</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: SURFACE }}>
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: ACCENT }} />
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map((g) => (
          <section key={g.cat}>
            <h3 className="mb-2 font-display text-[13px] font-semibold capitalize text-white/80">
              {g.cat}
            </h3>
            <div className="space-y-1.5">
              {g.items.map((i) => (
                <ChecklistRow key={i.id} item={i} onToggle={onToggle} />
              ))}
              {adding === g.cat ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <input
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem(g.cat)}
                    onBlur={() => (text.trim() ? addItem(g.cat) : setAdding(null))}
                    placeholder="New item..."
                    className="flex-1 rounded-lg px-3 py-1.5 text-[13px] text-white outline-none"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAdding(g.cat)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-[12px]"
                  style={{ color: ACCENT }}
                >
                  <Plus size={14} strokeWidth={1.75} /> Add item
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  onToggle,
}: {
  item: any;
  onToggle: (id: string, completed: boolean) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
        style={{
          background: item.completed ? ACCENT : "transparent",
          border: `1.5px solid ${item.completed ? ACCENT : BORDER}`,
        }}
      >
        {item.completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={!!item.completed}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn("flex-1 text-[13px] text-white", item.completed && "line-through opacity-50")}
      >
        {item.item_name}
      </span>
    </label>
  );
}

function PackingView({
  items,
  onToggle,
}: {
  items: any[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  if (items.length === 0) {
    return <p className="text-center text-[13px] text-white/50">No packing suggestions yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <ChecklistRow key={i.id} item={i} onToggle={onToggle} />
      ))}
    </div>
  );
}

function MembersView({
  members,
  tripId,
  isOwner,
}: {
  members: any[];
  tripId: string;
  isOwner: boolean;
}) {
  const inviteLink = `https://roavr.io/join/${tripId.slice(0, 8)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  };

  return (
    <div>
      <button
        onClick={copy}
        className="mb-4 flex w-full items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: SURFACE, border: `1px dashed ${ACCENT}` }}
      >
        <div className="flex items-center gap-3">
          <UserPlus size={18} style={{ color: ACCENT }} strokeWidth={1.75} />
          <div className="text-left">
            <p className="text-[13px] font-semibold text-white">Invite traveler</p>
            <p className="text-[11px] text-white/50">{inviteLink}</p>
          </div>
        </div>
        <Copy size={16} className="text-white/60" strokeWidth={1.75} />
      </button>

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold text-white"
              style={{ background: ELEVATED }}
            >
              <MapPin size={14} strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-white">Member</p>
              <p className="text-[11px] capitalize text-white/50">{m.role}</p>
            </div>
            {isOwner && m.role !== "owner" && (
              <button
                onClick={async () => {
                  await supabase.from("trip_members").delete().eq("id", m.id);
                  toast.success("Member removed");
                }}
                className="text-[11px] text-red-400"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
