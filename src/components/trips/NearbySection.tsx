import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOffers } from "@/lib/marketplace/api";
import { useMarketplaceLocation } from "@/lib/marketplace/location";
import type { MarketplaceOffer, OfferCategory } from "@/lib/marketplace/types";
import OfferCard from "@/components/marketplace/OfferCard";
import OfferDetailSheet from "@/components/marketplace/OfferDetailSheet";

const TABS: { id: string; label: string; match: (c: OfferCategory) => boolean }[] = [
  { id: "stay", label: "Stays", match: (c) => c === "lodging" },
  { id: "activity", label: "Activities", match: (c) => c === "activity" },
  { id: "deal", label: "Local Specials", match: (c) => ["food", "shopping", "transport", "other"].includes(c) },
];

/**
 * Trips → Nearby. Uses the same normalized marketplace inventory as Home and
 * the full Nearby screen; the only difference is the tabbed presentation.
 */
export default function NearbySection() {
  const { user } = useAuth();
  const { location, requestDeviceLocation } = useMarketplaceLocation(user?.id);
  const [tab, setTab] = useState("stay");
  const [radius, setRadius] = useState(15);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MarketplaceOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOffers({
      lat: location.lat,
      lng: location.lng,
      city: location.lat == null ? location.city : null,
      radiusMiles: radius,
      limit: 60,
    })
      .then((rows) => !cancelled && setOffers(rows))
      .catch(() => !cancelled && setOffers([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng, location.city, radius]);

  const filtered = useMemo(() => {
    const def = TABS.find((t) => t.id === tab)!;
    return offers.filter((o) => def.match(o.category));
  }, [offers, tab]);

  const contextLabel =
    location.mode === "device" ? "Around you" : location.mode === "trip" ? location.label : "No location shared";

  return (
    <section className="px-5 pt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-white" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>
          Nearby
        </h2>
        <div className="flex items-center gap-1.5 min-w-0" style={{ color: "#94A3B8", fontSize: 12 }}>
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{contextLabel}</span>
        </div>
      </div>

      {location.mode !== "device" && (
        <button
          onClick={requestDeviceLocation}
          className="mt-3 rounded-full flex items-center gap-1.5"
          style={{ background: "#1A2236", color: "#FFFFFF", padding: "9px 16px", fontSize: 13, fontWeight: 600 }}
        >
          <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
          {location.loading ? "Locating…" : "Use my location"}
        </button>
      )}

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-full"
              style={{
                background: active ? "#3B82F6" : "#1A2236",
                border: `1px solid ${active ? "#3B82F6" : "#1E2A3F"}`,
                color: active ? "#FFFFFF" : "#94A3B8",
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {location.lat != null && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: "#111827" }}>
          <div className="flex items-center justify-between">
            <span className="text-white text-[13px] font-semibold">Within</span>
            <span style={{ color: "#3B82F6", fontSize: 13, fontWeight: 700 }}>{radius} mi</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value, 10))}
            className="w-full mt-3 accent-[#3B82F6]"
            aria-label="Search radius in miles"
          />
        </div>
      )}

      <div className="mt-4 space-y-3 pb-6">
        {loading ? (
          <p className="text-center py-8" style={{ color: "#94A3B8", fontSize: 13 }}>Loading offers…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8" style={{ color: "#94A3B8", fontSize: 13 }}>
            {location.lat == null && location.city == null
              ? "Share your location or plan a trip to see offers here."
              : "Nothing in this category yet. Try another tab or widen the radius."}
          </p>
        ) : (
          filtered.map((o) => <OfferCard key={o.id} offer={o} onOpen={setSelected} />)
        )}
      </div>

      {selected && <OfferDetailSheet offer={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
