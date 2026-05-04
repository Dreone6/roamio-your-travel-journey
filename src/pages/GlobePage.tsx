import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe as GlobeIcon, MapPin, Flame, Filter } from "lucide-react";

// Fix default leaflet marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const coralIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
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
  "North America": { lat: [7, 84], lng: [-170, -50] },
  "South America": { lat: [-56, 13], lng: [-82, -34] },
  "Oceania": { lat: [-50, 0], lng: [100, 180] },
};

export default function GlobePage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [checkIns, setCheckIns] = useState<number>(0);
  const [trips, setTrips] = useState<{ id: string; title: string }[]>([]);
  const [streak, setStreak] = useState(0);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterTrip, setFilterTrip] = useState<string>("all");
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

    // Calculate streak (consecutive months with check-ins)
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
        } else {
          break;
        }
      }
      setStreak(s);
    }
  };

  const years = useMemo(() => {
    const ySet = new Set<string>();
    places.forEach((p) => {
      if (p.date_visited) ySet.add(p.date_visited.substring(0, 4));
    });
    return [...ySet].sort().reverse();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (!p.latitude || !p.longitude) return false;
      if (filterYear !== "all" && p.date_visited && !p.date_visited.startsWith(filterYear)) return false;
      if (filterTrip !== "all" && p.trip_id !== filterTrip) return false;
      if (filterContinent !== "All") {
        const c = CONTINENTS[filterContinent];
        if (p.latitude < c.lat[0] || p.latitude > c.lat[1] || p.longitude < c.lng[0] || p.longitude > c.lng[1]) return false;
      }
      return true;
    });
  }, [places, filterYear, filterTrip, filterContinent]);

  const totalCountries = new Set(filteredPlaces.map((p) => p.country)).size;
  const totalCities = new Set(filteredPlaces.map((p) => `${p.city}-${p.country}`)).size;
  const worldPercent = Math.min(100, Math.round((totalCountries / 195) * 100));

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="font-heading text-2xl font-semibold text-foreground mb-3">Globe</h1>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {[
            { label: "Countries", value: totalCountries, icon: "🌍" },
            { label: "Cities", value: totalCities, icon: "🏙️" },
            { label: "Trips", value: trips.length, icon: "✈️" },
            { label: "Check ins", value: checkIns, icon: "📍" },
            { label: "World", value: `${worldPercent}%`, icon: "🗺️" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-card border border-border p-2 text-center">
              <p className="text-base">{s.icon}</p>
              <p className="font-heading font-semibold text-sm text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Streak + Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium shrink-0">
              <Flame className="h-3 w-3" /> {streak} month streak
            </div>
          )}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-full border border-border bg-card text-xs px-2 py-1 text-foreground"
          >
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterTrip}
            onChange={(e) => setFilterTrip(e.target.value)}
            className="rounded-full border border-border bg-card text-xs px-2 py-1 text-foreground"
          >
            <option value="all">All trips</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select
            value={filterContinent}
            onChange={(e) => setFilterContinent(e.target.value)}
            className="rounded-full border border-border bg-card text-xs px-2 py-1 text-foreground"
          >
            {Object.keys(CONTINENTS).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {filteredPlaces.length === 0 && places.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-5 space-y-3">
            <GlobeIcon className="h-12 w-12 text-muted-foreground" />
            <h2 className="font-heading text-lg font-medium text-foreground">Your globe is empty</h2>
            <p className="text-muted-foreground text-sm">Check in at a destination to start filling your map.</p>
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
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredPlaces.map((place) => (
              <Marker
                key={place.id}
                position={[place.latitude!, place.longitude!]}
                icon={coralIcon}
              >
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
