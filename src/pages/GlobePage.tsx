import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe as GlobeIcon, Flame, MapPin } from "lucide-react";

// Fix default leaflet marker icon
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
    <div className="dark-immersive flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-emerald-500/8 blur-3xl" />

        <div className="relative px-5 pt-10 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-xs font-semibold tracking-widest uppercase">Your Journey</p>
              <h1 className="font-heading text-2xl font-bold text-white tracking-tight mt-1">Globe</h1>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: 'hsl(220 25% 12%)' }}>
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">{streak} month streak</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Countries", value: totalCountries },
              { label: "Cities", value: totalCities },
              { label: "Trips", value: trips.length },
              { label: "Check-ins", value: checkIns },
              { label: "World", value: `${worldPercent}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-2.5 text-center dark-card">
                <p className="font-heading font-bold text-base text-glow">{s.value}</p>
                <p className="text-[9px] text-dark-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Continent filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            {Object.keys(CONTINENTS).map((c) => (
              <button
                key={c}
                onClick={() => setFilterContinent(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  filterContinent === c ? "gradient-glow text-white" : "text-dark-muted"
                }`}
                style={filterContinent !== c ? { background: 'hsl(220 25% 12%)' } : {}}
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
          <div className="flex flex-col items-center justify-center h-full text-center px-5 space-y-4">
            <div className="h-20 w-20 rounded-full flex items-center justify-center glow-accent">
              <GlobeIcon className="h-10 w-10 text-glow" />
            </div>
            <h2 className="font-heading text-lg font-medium text-white">Your globe is empty</h2>
            <p className="text-dark-muted text-sm max-w-xs">Check in at destinations to start filling your personal map with pins.</p>
          </div>
        ) : (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {filteredPlaces.map((place) => (
              <Marker key={place.id} position={[place.latitude!, place.longitude!]} icon={glowIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{place.city}, {place.country}</p>
                    {place.date_visited && <p className="text-xs text-gray-500">{new Date(place.date_visited).toLocaleDateString()}</p>}
                    <p className="text-xs text-gray-500">{place.photos_count} photos</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
