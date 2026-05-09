import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computeTravelStats, type TravelStats } from "@/lib/travelStats";
import { Globe, MapPin, Camera, Trophy, Plane, Flame, Heart, Award, Compass, Map } from "lucide-react";

export default function TravelStatsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TravelStats | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [places, trips, checkins, mems, badges] = await Promise.all([
        supabase.from("places_visited").select("latitude, longitude, country, city, date_visited").eq("user_id", user.id),
        supabase.from("trips").select("id, status").eq("user_id", user.id),
        supabase.from("check_ins").select("id").eq("user_id", user.id),
        supabase.from("memories").select("id").eq("user_id", user.id),
        supabase.from("badges").select("id").eq("user_id", user.id),
      ]);
      setStats(computeTravelStats((places.data as any) || [], {
        trips: (trips.data || []).filter((t: any) => t.status === "completed").length,
        checkIns: checkins.data?.length || 0,
        memories: mems.data?.length || 0,
        badges: badges.data?.length || 0,
      }));
    })();
  }, [user]);

  if (!stats) return null;

  const tiles = [
    { icon: Globe, label: "Countries", value: stats.countries },
    { icon: Map, label: "Cities", value: stats.cities },
    { icon: Plane, label: "Miles", value: stats.miles.toLocaleString() },
    { icon: Compass, label: "Continents", value: `${stats.continents}/7` },
    { icon: Trophy, label: "Trips", value: stats.trips },
    { icon: MapPin, label: "Check-ins", value: stats.checkIns },
    { icon: Camera, label: "Memories", value: stats.memories },
    { icon: Award, label: "Badges", value: stats.badges },
    { icon: Heart, label: "Heritage", value: stats.heritageSites },
    { icon: Flame, label: "Streak", value: `${stats.streakMonths}mo` },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-glow" /> Travel Stats
      </h3>
      <div className="grid grid-cols-5 gap-1.5">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="dark-card rounded-xl p-2 text-center">
            <Icon className="h-3 w-3 text-glow mx-auto mb-1 opacity-70" />
            <p className="font-heading font-bold text-[13px] text-white leading-none">{value}</p>
            <p className="text-[8px] text-dark-muted mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {stats.favorites.length > 0 && (
        <div className="dark-card rounded-xl p-3">
          <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-2">Favorite destinations</p>
          <div className="space-y-1.5">
            {stats.favorites.map((f) => (
              <div key={f.name} className="flex items-center justify-between">
                <p className="text-[11px] text-white">{f.name}</p>
                <span className="text-[10px] text-glow font-bold">×{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
