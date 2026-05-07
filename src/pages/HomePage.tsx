import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "@/components/EmptyState";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import WhatsNewModal from "@/components/WhatsNewModal";
import { useNavigate } from "react-router-dom";
import { MapPin, Sparkles, ArrowRight, Compass, Globe, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  status: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Traveler";
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState({ countries: 0, cities: 0, trips: 0, checkIns: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [tripsRes, placesRes, checkInsRes] = await Promise.all([
      supabase.from("trips").select("id, title, destination, start_date, status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("places_visited").select("country, city").eq("user_id", user!.id),
      supabase.from("check_ins").select("id").eq("user_id", user!.id),
    ]);

    setTrips((tripsRes.data as Trip[]) || []);
    const places = placesRes.data || [];
    setStats({
      countries: new Set(places.map((p: any) => p.country)).size,
      cities: new Set(places.map((p: any) => `${p.city}-${p.country}`)).size,
      trips: tripsRes.data?.length || 0,
      checkIns: checkInsRes.data?.length || 0,
    });
    setLoading(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="pb-24">
      <WhatsNewModal />

      {/* Dark Hero Section */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute top-10 right-0 w-60 h-60 rounded-full bg-emerald-500/8 blur-3xl" />
        
        <div className="relative px-5 pt-12 pb-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-xs font-medium">{greeting()},</p>
              <h1 className="font-heading text-2xl font-bold text-white tracking-tight mt-0.5">{displayName}</h1>
            </div>
            <button onClick={() => navigate("/profile")} className="h-10 w-10 rounded-full dark-card-elevated flex items-center justify-center">
              <Globe className="h-5 w-5 text-glow" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Countries", value: stats.countries, icon: "🌍" },
              { label: "Cities", value: stats.cities, icon: "🏙️" },
              { label: "Trips", value: stats.trips, icon: "✈️" },
              { label: "Check-ins", value: stats.checkIns, icon: "📍" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center dark-card">
                <p className="text-lg">{s.icon}</p>
                <p className="font-heading font-bold text-lg text-white">{s.value}</p>
                <p className="text-[10px] text-dark-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* AI CTA */}
          <button
            onClick={() => navigate("/trips")}
            className="w-full rounded-2xl p-4 flex items-center gap-4 group transition-all"
            style={{ background: 'linear-gradient(135deg, hsl(220 25% 12%), hsl(220 25% 16%))' }}
          >
            <div className="h-12 w-12 rounded-xl gradient-glow flex items-center justify-center shrink-0 glow-accent">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-semibold text-sm">Plan with AI</p>
              <p className="text-dark-muted text-xs">Generate your next perfect trip</p>
            </div>
            <ArrowRight className="h-5 w-5 text-dark-muted group-hover:text-glow transition-colors" />
          </button>
        </div>
      </div>

      {/* Light content area */}
      <div className="px-5 pt-6 space-y-6">
        {/* Recent Trips */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">Recent Trips</h2>
            <button onClick={() => navigate("/trips")} className="text-xs text-accent font-medium flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="shrink-0 w-56" />
              ))}
            </div>
          ) : trips.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
              {trips.map((trip) => (
                <div key={trip.id} className="shrink-0 w-56 rounded-2xl border border-border/50 bg-card overflow-hidden shadow-soft hover:shadow-elevated transition-all cursor-pointer" onClick={() => navigate("/trips")}>
                  <div className="h-24 bg-gradient-to-br from-primary/15 to-emerald-500/10 flex items-center justify-center">
                    <Compass className="h-8 w-8 text-primary/30" />
                  </div>
                  <div className="p-3.5 space-y-1">
                    <p className="font-semibold text-sm text-foreground truncate">{trip.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {trip.destination}
                    </p>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                      trip.status === "completed" ? "bg-emerald-100 text-emerald-700" : trip.status === "active" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                </div>
              ))}
              {/* Add trip card */}
              <button onClick={() => navigate("/trips")} className="shrink-0 w-40 rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-2 hover:border-accent/40 transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">New Trip</span>
              </button>
            </div>
          ) : (
            <EmptyState
              icon={Compass}
              title="Plan your first trip"
              description="Let AI create a personalized itinerary for your next adventure."
              actionLabel="Plan a Trip"
              onAction={() => navigate("/trips")}
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Discover", desc: "Explore destinations", icon: Compass, route: "/discover", gradient: "from-emerald-500/10 to-teal-500/10" },
              { label: "My Globe", desc: "View your map", icon: Globe, route: "/globe", gradient: "from-blue-500/10 to-indigo-500/10" },
              { label: "Trending", desc: "Popular places", icon: TrendingUp, route: "/discover", gradient: "from-amber-500/10 to-orange-500/10" },
              { label: "Offers", desc: "Deals near you", icon: MapPin, route: "/discover", gradient: "from-rose-500/10 to-pink-500/10" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className="rounded-2xl border border-border/50 bg-card p-4 text-left hover:shadow-elevated transition-all group"
              >
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5 text-foreground/60" />
                </div>
                <p className="font-semibold text-sm text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
