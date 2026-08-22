/**
 * Bottom sheet for a tapped place on the globe.
 *
 * Shows only what the database actually stores: the city, every authorised
 * visit with its date window, and the visit-level memory count. Individual
 * imported photos are not persisted yet, so no thumbnails are fabricated —
 * when real memory records exist for a place they can be slotted in here
 * without changing the layout.
 */
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Camera, Share2, ListTree, MapPin } from "lucide-react";
import { flagEmoji } from "@/lib/world/countries";
import { formatVisitDate, type CityPlace } from "@/lib/world/visits";
import { toast } from "sonner";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";

interface Props {
  place: CityPlace | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Owner sees capture actions; visitors see a read-only sheet. */
  owner?: boolean;
  onViewVisits?: (place: CityPlace) => void;
  onAddMemory?: (place: CityPlace) => void;
}

export default function PlaceDetailSheet({
  place, open, onOpenChange, owner = false, onViewVisits, onAddMemory,
}: Props) {
  if (!place) return null;
  const flag = flagEmoji(place.country);

  const share = async () => {
    const text = `${place.city}, ${place.country}`;
    try {
      if (navigator.share) await navigator.share({ title: text, text });
      else { await navigator.clipboard.writeText(text); toast.success("Place copied"); }
    } catch { /* dismissed */ }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-0 px-5 pb-8"
        style={{ background: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <div className="pt-2">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full flex items-center justify-center text-[20px] shrink-0"
              style={{ background: "rgba(59,130,246,0.12)" }}>
              {flag ?? <MapPin className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-[24px] font-bold text-white leading-tight tracking-tight truncate">
                {place.city}
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: "#94A3B8" }}>{place.country}</p>
            </div>
          </div>

          <p className="mt-4 text-[14px] text-white font-semibold">
            {place.visitCount === 1 ? "Visited once" : `Visited ${place.visitCount} times`}
          </p>

          <div className="mt-2 space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-none">
            {place.visits.map((v) => (
              <div key={v.id} className="flex items-center justify-between">
                <span className="text-[14px]" style={{ color: "#94A3B8" }}>
                  {formatVisitDate(v.startDate, v.endDate)}
                </span>
                {v.memories > 0 && (
                  <span className="text-[12px]" style={{ color: "#4B5563" }}>
                    {v.memories} {v.memories === 1 ? "memory" : "memories"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {place.memories > 0 && (
            <p className="mt-3 text-[13px]" style={{ color: "#94A3B8" }}>
              {place.memories} {place.memories === 1 ? "memory" : "memories"} from this place
            </p>
          )}

          {/* Who else genuinely knows this place — authorised visits only. */}
          <div className="mt-5">
            <PeopleWhoKnowPlace city={place.city} country={place.country} />
          </div>


          <div className="mt-5 flex gap-2">
            <button
              onClick={() => onViewVisits?.(place)}
              disabled={!onViewVisits}
              className="flex-1 rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] disabled:opacity-40"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 48 }}
            >
              <ListTree className="h-4 w-4" strokeWidth={1.5} /> View visits
            </button>
            {owner && (
              <button
                onClick={() => onAddMemory?.(place)}
                disabled={!onAddMemory}
                className="flex-1 rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] disabled:opacity-40"
                style={{ background: "#3B82F6", height: 48 }}
              >
                <Camera className="h-4 w-4" strokeWidth={1.5} /> Add memory
              </button>
            )}
            <button
              onClick={share}
              className="rounded-full flex items-center justify-center text-white shrink-0"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 48, width: 48 }}
              aria-label="Share place"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
