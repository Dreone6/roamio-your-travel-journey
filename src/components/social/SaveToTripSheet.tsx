/**
 * Trip picker shown when a saved place could belong to more than one active
 * trip. Plain list, real trips only.
 */
import { MapPin, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Trip } from "@/lib/trips/types";
import { daysUntil } from "@/lib/trips/api";
import type { SaveTarget } from "@/hooks/useSaveToTrip";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trips: Trip[];
  target: SaveTarget | null;
  onChoose: (trip: Trip) => void;
}

export default function SaveToTripSheet({ open, onOpenChange, trips, target, onChoose }: Props) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" style={{ background: "#111827", borderColor: "#1E2A3F" }}>
        <SheetHeader>
          <SheetTitle className="text-white font-heading">Save to a trip</SheetTitle>
        </SheetHeader>
        {target && (
          <p className="mt-1 flex items-center gap-1.5" style={{ color: "#94A3B8", fontSize: 13 }}>
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {target.title}
          </p>
        )}
        <div className="mt-4 space-y-2 pb-4">
          {trips.map((t) => {
            const days = daysUntil(t.start_date);
            return (
              <button
                key={t.id}
                onClick={() => onChoose(t)}
                className="w-full flex items-center justify-between rounded-2xl px-4 text-left active:scale-[0.99] transition-transform"
                style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 56 }}
              >
                <div className="min-w-0">
                  <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                    {t.title ?? t.destination}
                  </p>
                  <p className="truncate" style={{ color: "#94A3B8", fontSize: 12 }}>
                    {t.destination}
                    {days !== null && days >= 0 ? ` · in ${days}d` : ""}
                  </p>
                </div>
                <Plus className="h-4 w-4 shrink-0" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
              </button>
            );
          })}
          <button
            onClick={() => { onOpenChange(false); navigate("/trips"); }}
            className="w-full text-center pt-2"
            style={{ color: "#3B82F6", fontSize: 13, fontWeight: 600 }}
          >
            Plan a new trip instead
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
