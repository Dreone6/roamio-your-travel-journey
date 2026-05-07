import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe as GlobeIcon, Flame, MapPin, Lock, Unlock, Eye, Trophy, Share2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const glowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Place {
  id: string;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  date_visited: string | null;
  photos_count: number;
  trip_id: string | null;
}

const CONTINENTS: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  "All": { lat: [-90, 90], lng: [-180, 180] },
  "Europe": { lat: [35, 72], lng: [-25, 45] },
  "Asia": { lat: [-10, 55], lng: [25, 145] },
  "Africa": { lat: [-35, 37], lng: [-20, 55] },
  "N. America": { lat: [7, 84], lng: [-170, -50] },
  "S. America": { lat: [-56, 13], lng: [-82, -34] },
  "Oceania": { lat: [-50, 0], lng: [100, 180] },
};

export default function GlobePage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [checkIns, setCheckIns] = useState<number>(0);
  const [trips, setTrips] = useState<{ id: string; title: string }[]>([]);
  const [streak, setStreak] = useState(0);
  const [filterContinent, setFilterContinent] = useState<string>("All");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [placesRes, checkInsRes, tripsRes] = await Promise.all([
      supabase.from("places_visited").select("*").eq("user_id", user!.id),
      supabase.from("check_ins").select("id, timestamp").eq("user_id", user!.id),
      supabase.from("trips").select("id, title").eq("user_id", user!.id),
    ]);
    setPlaces((placesRes.data as Place[]) || []);
    setCheckIns(checkInsRes.data?.length || 0);
    setTrips(tripsRes.data || []);

    if (checkInsRes.data && checkInsRes.data.length > 0) {
      const months = new Set(
        checkInsRes.data.map((c: any) => {
          const d = new Date(c.timestamp);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })
      );
      const sorted = [...months].sort().reverse();
      let s = 0;
      const now = new Date();
      let checkMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      for (const m of sorted) {
        if (m === checkMonth) {
          s++;
          const d = new Date(checkMonth + "-01");
          d.setMonth(d.getMonth() - 1);
          checkMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } else break;
      }
      setStreak(s);
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (!p.latitude || !p.longitude) return false;
      if (filterContinent !== "All") {
        const c = CONTINENTS[filterContinent];
        if (p.latitude < c.lat[0] || p.latitude > c.lat[1] || p.longitude < c.lng[0] || p.longitude > c.lng[1]) return false;
      }
      return true;
    });
  }, [places, filterContinent]);

  const totalCountries = new Set(filteredPlaces.map((p) => p.country)).size;
  const totalCities = new Set(filteredPlaces.map((p) => `${p.city}-${p.country}`)).size;
  const worldPercent = Math.min(100, Math.round((totalCountries / 195) * 100));

  return (
    <div className="dark-immersive flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 gradient-dark-radial" />

        <div className="relative px-5 pt-12 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">Your Journey</p>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight mt-0.5">Globe</h1>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold dark-card-elevated">
                  <Flame className="h-3 w-3 text-amber-400" />
                  <span className="text-amber-400">{streak}mo</span>
                </div>
              )}
              <button
                onClick={() => setIsPublic(!isPublic)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold dark-card-elevated"
              >
                {isPublic ? <Unlock className="h-3 w-3 text-glow" /> : <Lock className="h-3 w-3 text-dark-muted" />}
                <span className={isPublic ? "text-glow" : "text-dark-muted"}>{isPublic ? "Public" : "Private"}</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: "Countries", value: totalCountries },
              { label: "Cities", value: totalCities },
              { label: "Trips", value: trips.length },
              { label: "Pins", value: checkIns },
              { label: "World", value: `${worldPercent}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-2 text-center dark-card">
                <p className="font-heading font-bold text-sm text-glow leading-none">{s.value}</p>
                <p className="text-[8px] text-dark-muted mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Continent filters */}
          <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 no-scrollbar">
            {Object.keys(CONTINENTS).map((c) => (
              <button
                key={c}
                onClick={() => setFilterContinent(c)}
                className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                  filterContinent === c ? "gradient-glow text-white" : "text-dark-muted dark-card-elevated"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {filteredPlaces.length === 0 && places.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 space-y-4">
            <div className="h-20 w-20 rounded-full flex items-center justify-center glow-accent-strong relative">
              <GlobeIcon className="h-10 w-10 text-glow" />
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full gradient-accent flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h2 className="font-heading text-lg font-bold text-white">Your globe awaits</h2>
              <p className="text-dark-muted text-[13px] max-w-[260px] leading-relaxed">
                Every check-in adds a pin to your personal travel map. Start exploring to fill your globe.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <div className="rounded-full dark-card-elevated px-4 py-2 text-[11px] font-semibold text-dark-muted flex items-center gap-1.5">
                <Eye className="h-3 w-3" /> 0 viewers
              </div>
              <div className="rounded-full dark-card-elevated px-4 py-2 text-[11px] font-semibold text-dark-muted flex items-center gap-1.5">
                <Trophy className="h-3 w-3" /> 0 badges
              </div>
            </div>
          </div>
        ) : (
          <>
            <MapContainer center={[20, 0]} zoom={2} className="h-full w-full z-0" scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {filteredPlaces.map((place) => (
                <Marker key={place.id} position={[place.latitude!, place.longitude!]} icon={glowIcon}>
                  <Popup>
                    <div className="text-sm p-0.5">
                      <p className="font-semibold">{place.city}, {place.country}</p>
                      {place.date_visited && <p className="text-xs text-gray-500 mt-0.5">{new Date(place.date_visited).toLocaleDateString()}</p>}
                      <p className="text-xs text-gray-500">{place.photos_count} photos</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            {/* Share overlay */}
            <button className="absolute bottom-4 right-4 z-[500] h-10 w-10 rounded-full gradient-glow flex items-center justify-center glow-accent">
              <Share2 className="h-4 w-4 text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
