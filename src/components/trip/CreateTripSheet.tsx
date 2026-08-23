/**
 * Fast trip creation: destination, dates, travellers, optional name.
 * Once a destination is entered we surface real travel-graph context —
 * people the user follows who have genuinely been there.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createTrip } from "@/lib/trips/api";
import type { Trip } from "@/lib/trips/types";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (trip: Trip) => void;
}

export default function CreateTripSheet({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [busy, setBusy] = useState(false);
  const [contextCity, setContextCity] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setContextCity(destination.trim().split(",")[0].trim()), 500);
    return () => clearTimeout(t);
  }, [destination]);

  useEffect(() => {
    if (!open) {
      setDestination(""); setTitle(""); setStart(""); setEnd(""); setTravelers(1);
    }
  }, [open]);

  const submit = async () => {
    if (!user || !destination.trim() || busy) return;
    if (start && end && end < start) return toast.error("End date is before the start date");
    setBusy(true);
    try {
      const trip = await createTrip(user.id, {
        destination: destination.trim(),
        title: title.trim() || undefined,
        start_date: start || null,
        end_date: end || start || null,
        travelers,
      });
      if (trip) onCreated(trip);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't create the trip");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full bg-transparent outline-none text-white rounded-xl px-3";
  const fieldStyle = { background: "#1A2236", height: 46, fontSize: 14 } as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto" style={{ background: "#111827", borderColor: "#1E2A3F" }}>
        <SheetHeader>
          <SheetTitle className="text-white font-heading">Plan a trip</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div>
            <label style={{ color: "#94A3B8", fontSize: 11 }}>Where to?</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Cartagena, Colombia"
              className={`${field} mt-1`}
              style={fieldStyle}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label style={{ color: "#94A3B8", fontSize: 11 }}>Start</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${field} mt-1`} style={fieldStyle} />
            </div>
            <div className="flex-1">
              <label style={{ color: "#94A3B8", fontSize: 11 }}>End</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={`${field} mt-1`} style={fieldStyle} />
            </div>
          </div>

          <div className="flex gap-2">
            <div style={{ width: 110 }}>
              <label style={{ color: "#94A3B8", fontSize: 11 }}>Travelers</label>
              <input
                type="number"
                min={1}
                value={travelers}
                onChange={(e) => setTravelers(Math.max(1, Number(e.target.value) || 1))}
                className={`${field} mt-1`}
                style={fieldStyle}
              />
            </div>
            <div className="flex-1">
              <label style={{ color: "#94A3B8", fontSize: 11 }}>Trip name (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto" className={`${field} mt-1`} style={fieldStyle} />
            </div>
          </div>

          <p style={{ color: "#4B5563", fontSize: 11 }}>
            No dates yet? Leave them blank and it stays a draft. You can invite travellers after it exists.
          </p>

          {contextCity.length > 2 && (
            <div className="pt-1">
              <PeopleWhoKnowPlace city={contextCity} title={`Going to ${contextCity}?`} />
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy || !destination.trim()}
            className="w-full inline-flex items-center justify-center gap-2 text-white disabled:opacity-40"
            style={{ background: "#3B82F6", borderRadius: 9999, height: 50, fontSize: 15, fontWeight: 600 }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create trip
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
