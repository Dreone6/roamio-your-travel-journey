import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOffers } from "@/lib/marketplace/api";
import { useMarketplaceLocation } from "@/lib/marketplace/location";
import type { MarketplaceOffer } from "@/lib/marketplace/types";
import OfferCard from "@/components/marketplace/OfferCard";
import OfferDetailSheet from "@/components/marketplace/OfferDetailSheet";

/**
 * Home strip: a small window into the marketplace. It never invents offers —
 * when there is no location context it asks for one instead.
 */
export default function NearbyStrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location, requestDeviceLocation } = useMarketplaceLocation(user?.id);
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
      radiusMiles: 20,
      limit: 10,
    })
      .then((rows) => !cancelled && setOffers(rows))
      .catch(() => !cancelled && setOffers([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng, location.city]);

  const contextLabel =
    location.mode === "device"
      ? "Around you"
      : location.mode === "trip"
        ? location.label
        : null;

  return (
    <section className="pt-6">
      <div className="px-5 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-white" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>
            Nearby
          </h2>
          {contextLabel && (
            <p className="flex items-center gap-1 mt-0.5 truncate" style={{ color: "#94A3B8", fontSize: 12 }}>
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {contextLabel}
            </p>
          )}
        </div>
        <button onClick={() => navigate("/nearby")} style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}>
          See all ›
        </button>
      </div>

      {loading ? (
        <div className="mt-4 px-5 flex gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="shrink-0" style={{ width: 220, height: 150, borderRadius: 16, background: "#111827" }} />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="mx-5 mt-4 rounded-2xl p-4" style={{ background: "#111827" }}>
          <p className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
            {location.mode === "device" || location.mode === "trip"
              ? "No offers here yet"
              : "See what's around you"}
          </p>
          <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
            {location.mode === "device" || location.mode === "trip"
              ? "Roavr will show stays, tours and tables as partners come online here."
              : "Share your location and Roavr will surface stays, tours and tables nearby."}
          </p>
          {location.mode !== "device" && location.mode !== "trip" && (
            <button
              onClick={requestDeviceLocation}
              className="mt-3 rounded-full flex items-center gap-1.5"
              style={{ background: "#3B82F6", color: "#FFFFFF", padding: "9px 16px", fontSize: 13, fontWeight: 600 }}
            >
              <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
              {location.loading ? "Locating…" : "Use my location"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar px-5">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} onOpen={setSelected} variant="tile" />
          ))}
        </div>
      )}

      {selected && <OfferDetailSheet offer={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
