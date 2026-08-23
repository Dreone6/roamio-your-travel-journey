import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOffers } from "@/lib/marketplace/api";
import { useMarketplaceLocation } from "@/lib/marketplace/location";
import type { DealType, MarketplaceOffer, OfferCategory } from "@/lib/marketplace/types";
import OfferCard from "@/components/marketplace/OfferCard";
import OfferDetailSheet from "@/components/marketplace/OfferDetailSheet";

const CATEGORIES: { id: OfferCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lodging", label: "Stays" },
  { id: "activity", label: "Things to do" },
  { id: "food", label: "Eat & drink" },
  { id: "transport", label: "Getting around" },
  { id: "shopping", label: "Shopping" },
];

const DEALS: { id: DealType | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "roavr_exclusive", label: "Roavr Exclusive" },
  { id: "roavr_drop", label: "Roavr Drops" },
  { id: "roavr_price", label: "Roavr Price" },
];

export default function NearbyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location, requestDeviceLocation } = useMarketplaceLocation(user?.id);

  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<OfferCategory | "all">("all");
  const [dealType, setDealType] = useState<DealType | "all">("all");
  const [radius, setRadius] = useState(15);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketplaceOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOffers({
      lat: location.lat,
      lng: location.lng,
      city: location.lat == null ? location.city : null,
      radiusMiles: radius,
      limit: 80,
    })
      .then((rows) => !cancelled && setOffers(rows))
      .catch(() => !cancelled && setOffers([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng, location.city, radius]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return offers.filter((o) => {
      if (category !== "all" && o.category !== category) return false;
      if (dealType !== "all" && o.deal_type !== dealType) return false;
      if (
        needle &&
        !`${o.merchant_name} ${o.title} ${o.city ?? ""}`.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [offers, category, dealType, query]);

  const drops = visible.filter((o) => o.deal_type === "roavr_drop");
  const rest = visible.filter((o) => o.deal_type !== "roavr_drop");

  return (
    <div className="min-h-dvh pb-24" style={{ background: "#080D1A" }}>
      <header className="sticky top-0 z-20 px-5 pt-5 pb-3" style={{ background: "#080D1A" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>
          <h1 className="text-white" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>
            Nearby
          </h1>
        </div>

        {/* Location context — always explicit about what is being shown */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0" style={{ color: "#94A3B8", fontSize: 13 }}>
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">
              {location.mode === "device"
                ? "Around you"
                : location.mode === "trip"
                  ? `Planning for ${location.label}`
                  : "No location shared"}
            </span>
          </div>
          {location.mode !== "device" && (
            <button
              onClick={requestDeviceLocation}
              className="shrink-0 rounded-full flex items-center gap-1.5"
              style={{ background: "#1A2236", color: "#FFFFFF", padding: "8px 14px", fontSize: 12, fontWeight: 600 }}
            >
              <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
              {location.loading ? "Locating…" : "Use my location"}
            </button>
          )}
        </div>

        <div
          className="mt-3 flex items-center gap-2 rounded-full px-3.5"
          style={{ background: "#111827", border: "1px solid #1E2A3F", height: 42 }}
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: "#4B5563" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stays, tours, tables"
            className="flex-1 bg-transparent outline-none text-white"
            style={{ fontSize: 14 }}
          />
        </div>
      </header>

      <div className="px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="shrink-0 rounded-full"
              style={{
                background: active ? "#3B82F6" : "#1A2236",
                border: `1px solid ${active ? "#3B82F6" : "#1E2A3F"}`,
                color: active ? "#FFFFFF" : "#94A3B8",
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {DEALS.map((d) => {
          const active = dealType === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setDealType(d.id)}
              className="shrink-0 rounded-full"
              style={{
                background: active ? "#1E2A3F" : "transparent",
                border: `1px solid ${active ? "#3B82F6" : "#1E2A3F"}`,
                color: active ? "#FFFFFF" : "#94A3B8",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {location.lat != null && (
        <div className="mx-5 mt-4 rounded-2xl p-4" style={{ background: "#111827" }}>
          <div className="flex items-center justify-between">
            <span className="text-white" style={{ fontSize: 13, fontWeight: 600 }}>Within</span>
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

      <div className="px-5 mt-5 space-y-3">
        {loading ? (
          <p style={{ color: "#94A3B8", fontSize: 13 }}>Loading offers…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#111827" }}>
            <p className="text-white" style={{ fontSize: 15, fontWeight: 600 }}>Nothing here yet</p>
            <p className="mt-1.5" style={{ color: "#94A3B8", fontSize: 13 }}>
              {location.mode === "unset" || location.mode === "denied"
                ? "Share your location or plan a trip and Roavr will surface offers around you."
                : "No offers match these filters. Try widening the radius."}
            </p>
          </div>
        ) : (
          <>
            {drops.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-white" style={{ fontSize: 17, fontWeight: 700 }}>Roavr Drops</h2>
                {drops.map((o) => (
                  <OfferCard key={o.id} offer={o} onOpen={setSelected} />
                ))}
              </section>
            )}
            <section className="space-y-3">
              {drops.length > 0 && (
                <h2 className="text-white pt-2" style={{ fontSize: 17, fontWeight: 700 }}>More nearby</h2>
              )}
              {rest.map((o) => (
                <OfferCard key={o.id} offer={o} onOpen={setSelected} />
              ))}
            </section>
          </>
        )}
      </div>

      {selected && <OfferDetailSheet offer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
