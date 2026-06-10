import { useEffect, useMemo, useState } from "react";
import { Heart, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  business_name: string;
  offer_description: string;
  discount: string | null;
  category: string;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
}

const TABS = [
  { id: "stay", label: "Stays", match: (c: string) => c === "lodging" || c === "stay" },
  { id: "activity", label: "Activities", match: (c: string) => c === "experience" || c === "activity" },
  { id: "deal", label: "Local Specials", match: (c: string) => ["food","shopping","other","transport","nightlife","wellness"].includes(c) },
] as const;
type TabId = typeof TABS[number]["id"];

const CAT_BG: Record<string, string> = {
  lodging: "#8B5CF6", stay: "#8B5CF6", food: "#F59E0B", experience: "#10B981", activity: "#10B981",
  shopping: "#3B82F6", transport: "#06B6D4", other: "#EC4899",
};

// Positano (latest pin)
const ORIGIN = { lat: 40.628, lng: 14.485 };

function distMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3959;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const FALLBACK: Offer[] = [
  { id: "n1", business_name: "Le Sirenuse", offer_description: "Luxury seaside hotel · 15% off", discount: "15%", category: "stay",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", latitude: 40.628, longitude: 14.485 },
  { id: "n2", business_name: "Hotel Marincanto", offer_description: "Cliffside views · Free breakfast", discount: null, category: "stay",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", latitude: 40.629, longitude: 14.484 },
  { id: "n3", business_name: "Amalfi Lemon Tour", offer_description: "Half-day · €35", discount: null, category: "experience",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80", latitude: 40.633, longitude: 14.482 },
  { id: "n4", business_name: "Sunset Sailing", offer_description: "Private boat · From $48", discount: null, category: "experience",
    image: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80", latitude: 40.631, longitude: 14.489 },
  { id: "n5", business_name: "Coastal Kitchen", offer_description: "20% off brunch", discount: "20%", category: "food",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80", latitude: 40.629, longitude: 14.483 },
  { id: "n6", business_name: "Rooftop 360", offer_description: "2-for-1 cocktails before 8pm", discount: "2-for-1", category: "nightlife",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80", latitude: 40.627, longitude: 14.487 },
  { id: "n7", business_name: "Sakura Ramen", offer_description: "Free drink with any ramen", discount: null, category: "food",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", latitude: 40.626, longitude: 14.484 },
  { id: "n8", business_name: "Riva Spa", offer_description: "25% off massages", discount: "25%", category: "wellness",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80", latitude: 40.625, longitude: 14.486 },
];

export default function NearbySection() {
  const [tab, setTab] = useState<TabId>("stay");
  const [radius, setRadius] = useState(10);
  const [offers, setOffers] = useState<Offer[]>(FALLBACK);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_offers")
        .select("id,business_name,offer_description,discount,category,image,latitude,longitude")
        .eq("active", true)
        .limit(50);
      if (data && data.length >= 3) setOffers(data as Offer[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const tabDef = TABS.find(t => t.id === tab)!;
    return offers
      .filter(o => tabDef.match(o.category))
      .map(o => ({
        ...o,
        _dist: o.latitude != null && o.longitude != null
          ? distMiles(ORIGIN, { lat: o.latitude, lng: o.longitude })
          : 999,
      }))
      .filter(o => o._dist <= radius)
      .sort((a, b) => a._dist - b._dist);
  }, [offers, tab, radius]);

  return (
    <section className="px-5 pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-white" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>
          Nearby
        </h2>
        <div className="flex items-center gap-1.5" style={{ color: "#94A3B8", fontSize: 12 }}>
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
          Positano
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 rounded-full"
              style={{
                background: active ? "#3B82F6" : "#1A2236",
                border: active ? "1px solid #3B82F6" : "1px solid #1E2A3F",
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

      {/* Radius slider */}
      <div className="mt-4 rounded-2xl p-4" style={{ background: "#111827" }}>
        <div className="flex items-center justify-between">
          <span className="text-white text-[13px] font-semibold">Within</span>
          <span style={{ color: "#3B82F6", fontSize: 13, fontWeight: 700 }}>{radius} mi</span>
        </div>
        <input
          type="range"
          min={1}
          max={25}
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value))}
          className="w-full mt-3 accent-[#3B82F6]"
        />
      </div>

      {/* Cards */}
      <div className="mt-4 space-y-3 pb-6">
        {filtered.length === 0 ? (
          <p className="text-center py-8" style={{ color: "#94A3B8", fontSize: 13 }}>
            Nothing within {radius} miles. Try widening the search.
          </p>
        ) : (
          filtered.map(o => (
            <div
              key={o.id}
              className="flex gap-3 rounded-2xl overflow-hidden"
              style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            >
              {o.image && (
                <img src={o.image} alt={o.business_name} className="h-24 w-24 object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0 py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full text-white"
                    style={{ background: CAT_BG[o.category] || "#3B82F6", padding: "2px 7px", fontSize: 9, fontWeight: 700 }}
                  >
                    {o.category.toUpperCase()}
                  </span>
                  {o.discount && (
                    <span className="text-[11px] font-bold" style={{ color: "#EF4444" }}>-{o.discount}</span>
                  )}
                </div>
                <p className="text-white mt-1.5 truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                  {o.business_name}
                </p>
                <p className="truncate" style={{ color: "#94A3B8", fontSize: 12 }}>
                  {o.offer_description}
                </p>
                <p className="mt-1" style={{ color: "#94A3B8", fontSize: 11 }}>
                  {(o as any)._dist.toFixed(1)} mi away
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
