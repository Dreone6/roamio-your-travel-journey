import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const CATEGORY_LABEL: Record<string, { tag: string; bg: string }> = {
  stay:        { tag: "STAY",  bg: "#8B5CF6" },
  food:        { tag: "EATS",  bg: "#F59E0B" },
  experience:  { tag: "TOUR",  bg: "#10B981" },
  activity:    { tag: "TOUR",  bg: "#10B981" },
  nightlife:   { tag: "NIGHT", bg: "#EC4899" },
  shopping:    { tag: "SHOP",  bg: "#3B82F6" },
  wellness:    { tag: "SPA",   bg: "#06B6D4" },
  other:       { tag: "DEAL",  bg: "#3B82F6" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "stay", label: "Stays" },
  { id: "food", label: "Eat & Drink" },
  { id: "experience", label: "Activities" },
] as const;
type FilterId = typeof FILTERS[number]["id"];

const FALLBACK: Offer[] = [
  { id: "f1", business_name: "Le Sirenuse", offer_description: "15% off seaside dinner", discount: "15%", category: "stay",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80", latitude: 40.628, longitude: 14.485 },
  { id: "f2", business_name: "Coastal Kitchen", offer_description: "20% off brunch", discount: "20%", category: "food",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", latitude: 40.629, longitude: 14.483 },
  { id: "f3", business_name: "Sunset Sailing", offer_description: "From $48 · Tonight", discount: null, category: "experience",
    image: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&q=80", latitude: 40.631, longitude: 14.489 },
  { id: "f4", business_name: "Rooftop 360", offer_description: "Live DJ tonight", discount: null, category: "nightlife",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80", latitude: 40.627, longitude: 14.487 },
  { id: "f5", business_name: "Sakura Ramen", offer_description: "4.8★ · 8 min walk", discount: null, category: "food",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", latitude: 40.626, longitude: 14.484 },
  { id: "f6", business_name: "Amalfi Lemon Tour", offer_description: "Half-day · €35", discount: null, category: "experience",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&q=80", latitude: 40.633, longitude: 14.482 },
];

export default function NearbyStrip() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterId>("all");
  const [offers, setOffers] = useState<Offer[]>(FALLBACK);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_offers")
        .select("id,business_name,offer_description,discount,category,image,latitude,longitude")
        .eq("active", true)
        .limit(12);
      if (data && data.length >= 3) setOffers(data as Offer[]);
    })();
  }, []);

  const visible = filter === "all" ? offers : offers.filter(o => o.category === filter);

  return (
    <section className="pt-6">
      <div className="px-5 flex items-center justify-between">
        <h2 className="text-white" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>
          🔥 Nearby Tonight
        </h2>
        <button
          onClick={() => navigate("/trips?nearby=1")}
          style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}
        >
          See all ›
        </button>
      </div>

      {/* Filter chips */}
      <div className="mt-3 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="shrink-0 rounded-full transition-colors"
              style={{
                background: active ? "#3B82F6" : "#1A2236",
                border: active ? "1px solid #3B82F6" : "1px solid #1E2A3F",
                color: active ? "#FFFFFF" : "#94A3B8",
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5">
        {visible.slice(0, 8).map(o => {
          const meta = CATEGORY_LABEL[o.category] || CATEGORY_LABEL.other;
          return (
            <button
              key={o.id}
              onClick={() => navigate("/trips?nearby=1")}
              className="shrink-0 relative overflow-hidden text-left active:scale-[0.98] transition-transform"
              style={{ width: 220, height: 140, borderRadius: 16 }}
            >
              {o.image && (
                <img src={o.image} alt={o.business_name} className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)" }}
              />
              <span
                className="absolute top-2 left-2 rounded-full text-white"
                style={{ background: meta.bg, padding: "3px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.2px" }}
              >
                {meta.tag}
              </span>
              {o.discount && (
                <span
                  className="absolute top-2 right-2 rounded-full text-white"
                  style={{ background: "#EF4444", padding: "3px 8px", fontSize: 10, fontWeight: 700 }}
                >
                  -{o.discount}
                </span>
              )}
              <div className="absolute bottom-2 left-2.5 right-2.5">
                <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                  {o.business_name}
                </p>
                <p className="truncate mt-0.5" style={{ color: "#94A3B8", fontSize: 11 }}>
                  {o.offer_description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
