/**
 * Ask Roavr — the planning conversation. Answers arrive as a short reply plus
 * a structured plan that the traveller can push into the itinerary, item by
 * item or a whole day at a time. Nothing is saved without an explicit tap.
 */
import { useState } from "react";
import { Sparkles, Send, Loader2, Plus, RefreshCw, CalendarPlus, X } from "lucide-react";
import { toast } from "sonner";
import { askRoavr, type PlannerResult } from "@/lib/ai/planner";
import { commitSuggestedDay, addItems } from "@/lib/trips/api";
import type { ItineraryItem, SuggestedDay, SuggestedItem, Trip } from "@/lib/trips/types";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  trip: Trip | null;
  trips: Trip[];
  items: ItineraryItem[];
  initialPrompt?: string;
  onTripSelect: (trip: Trip) => void;
  onItemsAdded: (added: ItineraryItem[]) => void;
  onClose?: () => void;
}

const CHIPS = [
  "Plan me four days in Cartagena",
  "Give me a romantic day in Paris",
  "What should we do near our hotel tomorrow?",
  "Build a Saturday around food and nightlife",
];

export default function AskRoavrPanel({
  trip,
  trips,
  items,
  initialPrompt,
  onTripSelect,
  onItemsAdded,
  onClose,
}: Props) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [lastPrompt, setLastPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlannerResult | null>(null);

  const run = async (p: string) => {
    const text = p.trim();
    if (!text || busy) return;
    setBusy(true);
    setLastPrompt(text);
    const res = await askRoavr(
      text,
      trip,
      items.map((i) => ({ day_number: i.day_number, activity: i.activity, time: i.time })),
    );
    setResult(res);
    setBusy(false);
  };

  const nextSort = (day: number) =>
    items.filter((i) => i.day_number === day).length;

  const addDay = async (day: SuggestedDay) => {
    if (!trip || !user) return toast.error("Pick a trip first");
    try {
      const added = await commitSuggestedDay(trip.id, user.id, day, nextSort(day.day_number));
      onItemsAdded(added);
      toast.success(`Day ${day.day_number} added to ${trip.title}`);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add that day");
    }
  };

  const addOne = async (day: SuggestedDay, item: SuggestedItem) => {
    if (!trip || !user) return toast.error("Pick a trip first");
    try {
      const added = await addItems(
        trip.id,
        user.id,
        [
          {
            day_number: day.day_number,
            time: item.time,
            activity: item.title,
            type: item.type,
            location: item.location,
            notes: item.notes,
            estimated_cost: item.estimated_cost,
          },
        ],
        nextSort(day.day_number),
      );
      onItemsAdded(added);
      toast.success("Added to itinerary");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add that item");
    }
  };

  return (
    <div className="rounded-[24px] p-5" style={{ background: "#111827", boxShadow: "0px 2px 8px rgba(0,0,0,0.4)" }}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        <h2 className="text-white font-heading" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>
          Ask Roavr
        </h2>
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg" aria-label="Close">
            <X className="h-4 w-4" style={{ color: "#94A3B8" }} />
          </button>
        )}
      </div>

      {!trip && (
        <div className="mt-3">
          <p style={{ color: "#94A3B8", fontSize: 12 }}>
            {trips.length ? "Planning for" : "Create a trip to save any plan Roavr builds."}
          </p>
          {trips.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTripSelect(t)}
                  className="shrink-0 text-white"
                  style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 8, padding: "6px 10px", fontSize: 12 }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2.5 rounded-2xl px-3" style={{ background: "#1A2236", height: 48 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(prompt)}
          placeholder={trip ? `Plan something in ${trip.destination}` : "Plan me four days in Cartagena"}
          className="flex-1 bg-transparent outline-none text-white"
          style={{ fontSize: 14 }}
        />
        <button
          onClick={() => run(prompt)}
          disabled={busy || !prompt.trim()}
          aria-label="Ask Roavr"
          className="h-8 w-8 flex items-center justify-center disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#3B82F6" }} />
          ) : (
            <Send className="h-[18px] w-[18px]" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
          )}
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => { setPrompt(c); run(c); }}
            className="shrink-0"
            style={{ color: "#94A3B8", background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}
          >
            {c}
          </button>
        ))}
      </div>

      {busy && <MiloLoading className="mt-5" context={trip?.destination} />}


      {result?.status === "unavailable" && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}>
          <p className="text-white" style={{ fontSize: 13, fontWeight: 600 }}>AI planning is unavailable</p>
          <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
            {result.error} You can still build this trip by hand — everything else in the planner works.
          </p>
        </div>
      )}

      {result?.status === "error" && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "#EF4444", fontSize: 13 }}>{result.error}</p>
          <button onClick={() => run(lastPrompt)} className="mt-2 inline-flex items-center gap-1.5 text-white" style={{ fontSize: 12 }}>
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      )}

      {result?.status === "ok" && (
        <div className="mt-4 space-y-3">
          {result.reply && (
            <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.5 }}>{result.reply}</p>
          )}

          {result.days.map((day) => (
            <div key={day.day_number} className="rounded-2xl p-4" style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
                  Day {day.day_number}
                  {day.label ? ` · ${day.label}` : ""}
                </p>
                <button
                  onClick={() => addDay(day)}
                  disabled={!trip}
                  className="inline-flex items-center gap-1.5 text-white disabled:opacity-40"
                  style={{ background: "#3B82F6", borderRadius: 9999, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Add day
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {day.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="shrink-0 tabular-nums" style={{ color: "#3B82F6", fontSize: 12, width: 44 }}>
                      {item.time ?? "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white" style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</p>
                      {item.location && (
                        <p style={{ color: "#94A3B8", fontSize: 11 }}>{item.location}</p>
                      )}
                      {item.notes && (
                        <p className="mt-0.5" style={{ color: "#4B5563", fontSize: 11, lineHeight: 1.4 }}>{item.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => addOne(day, item)}
                      disabled={!trip}
                      aria-label={`Add ${item.title}`}
                      className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-40"
                      style={{ background: "#111827", border: "1px solid #1E2A3F" }}
                    >
                      <Plus className="h-3.5 w-3.5" style={{ color: "#3B82F6" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {result.days.length > 0 && (
            <button
              onClick={() => run(lastPrompt)}
              className="inline-flex items-center gap-1.5"
              style={{ color: "#94A3B8", fontSize: 12 }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
