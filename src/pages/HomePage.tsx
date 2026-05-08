import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "@/components/EmptyState";
import SafePassCard from "@/components/safety/SafePassCard";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import WhatsNewModal from "@/components/WhatsNewModal";
import TrialBanner from "@/components/TrialBanner";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Sparkles, ArrowRight, Compass, Globe, TrendingUp,
  Plus, Shield, Zap, Users, Trophy, Camera, MessageCircle, Bell
} from "lucide-react";

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

  const upcomingTrip = trips.find((t) => t.status === "active" || t.status === "planning");
  const worldPercent = Math.min(100, Math.round((stats.countries / 195) * 100));

  return (
    <div className="pb-4">
      <WhatsNewModal />

      {/* Dark Hero Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/6 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative px-5 pt-14 pb-6 space-y-4">
          {/* Greeting + Avatar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-[11px] font-medium tracking-wide">{greeting()}</p>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight mt-0.5">{displayName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/notifications")} className="h-9 w-9 rounded-full dark-card-elevated flex items-center justify-center">
                <Bell className="h-4 w-4 text-dark-muted" />
              </button>
              <button onClick={() => navigate("/messages")} className="h-9 w-9 rounded-full dark-card-elevated flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-dark-muted" />
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Countries", value: stats.countries, emoji: "🌍" },
              { label: "Cities", value: stats.cities, emoji: "🏙" },
              { label: "Trips", value: stats.trips, emoji: "✈️" },
              { label: "Check-ins", value: stats.checkIns, emoji: "📍" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-2.5 text-center dark-card">
                <p className="text-sm mb-0.5">{s.emoji}</p>
                <p className="font-heading font-bold text-base text-white leading-none">{s.value}</p>
                <p className="text-[9px] text-dark-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-5">
        <TrialBanner />
        {/* Upcoming Trip Card */}
        {upcomingTrip ? (
          <button
            onClick={() => navigate("/trips")}
            className="w-full rounded-2xl overflow-hidden border border-border/50 bg-card shadow-soft hover:shadow-elevated transition-all text-left group animate-fade-in"
          >
            <div className="h-20 bg-gradient-to-br from-primary/10 via-emerald-500/8 to-accent/5 flex items-center justify-center relative">
              <Compass className="h-8 w-8 text-primary/20" />
              <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full gradient-glow text-white">
                {upcomingTrip.status === "active" ? "Active" : "Planning"}
              </span>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-sm text-foreground truncate">{upcomingTrip.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {upcomingTrip.destination}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(upcomingTrip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate("/trips")}
            className="w-full rounded-2xl gradient-premium p-4 flex items-center gap-3.5 group transition-all hover:shadow-elevated animate-fade-in"
          >
            <div className="h-11 w-11 rounded-xl gradient-glow flex items-center justify-center shrink-0 glow-accent">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-semibold text-sm">Plan your first trip</p>
              <p className="text-dark-muted text-xs">Let AI create your perfect itinerary</p>
            </div>
            <ArrowRight className="h-4 w-4 text-dark-muted group-hover:text-glow transition-colors" />
          </button>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Plan Trip", icon: Sparkles, route: "/trips", bg: "from-emerald-500/12 to-teal-500/8" },
            { label: "Discover", icon: Compass, route: "/discover", bg: "from-blue-500/12 to-indigo-500/8" },
            { label: "My Globe", icon: Globe, route: "/globe", bg: "from-violet-500/12 to-purple-500/8" },
            { label: "Offers", icon: Zap, route: "/discover", bg: "from-amber-500/12 to-orange-500/8" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.route)}
              className="rounded-2xl border border-border/40 bg-card p-3 text-center hover:shadow-elevated transition-all group"
            >
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${a.bg} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                <a.icon className="h-4 w-4 text-foreground/60" />
              </div>
              <p className="text-[11px] font-semibold text-foreground leading-tight">{a.label}</p>
            </button>
          ))}
        </div>

        {/* AI Challenge Card */}
        <div className="rounded-2xl overflow-hidden border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/2 p-4 space-y-2.5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <p className="text-xs font-bold text-accent uppercase tracking-wider">Daily Challenge</p>
          </div>
          <p className="text-sm font-semibold text-foreground">Check in at a new location today</p>
          <p className="text-xs text-muted-foreground">Earn the Explorer badge by visiting 3 new places this week.</p>
          <button onClick={() => navigate("/checkin")} className="text-xs font-semibold text-accent flex items-center gap-1 mt-1">
            Start Challenge <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Recent Trips */}
        <div>
          <div className="section-header">
            <h2 className="section-title">Recent Trips</h2>
            <button onClick={() => navigate("/trips")} className="section-link">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="shrink-0 w-48" />
              ))}
            </div>
          ) : trips.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
              {trips.slice(0, 4).map((trip) => (
                <div
                  key={trip.id}
                  className="shrink-0 w-48 rounded-2xl border border-border/40 bg-card overflow-hidden shadow-soft hover:shadow-elevated transition-all cursor-pointer"
                  onClick={() => navigate("/trips")}
                >
                  <div className="h-20 bg-gradient-to-br from-primary/10 to-emerald-500/8 flex items-center justify-center">
                    <Compass className="h-6 w-6 text-primary/20" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-semibold text-[13px] text-foreground truncate">{trip.title}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {trip.destination}
                    </p>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      trip.status === "completed" ? "bg-emerald-100 text-emerald-700" : trip.status === "active" ? "bg-accent/12 text-accent" : "bg-secondary text-muted-foreground"
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate("/trips")} className="shrink-0 w-32 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1.5 hover:border-accent/30 transition-colors">
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">New Trip</span>
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

        {/* Globe Progress */}
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3 shadow-soft animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" />
              <p className="font-heading text-sm font-semibold text-foreground">Globe Progress</p>
            </div>
            <button onClick={() => navigate("/globe")} className="text-[11px] text-accent font-semibold flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full gradient-glow transition-all duration-700" style={{ width: `${worldPercent}%` }} />
              </div>
            </div>
            <p className="text-xs font-bold text-foreground">{worldPercent}%</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{stats.countries} countries · {stats.cities} cities explored</p>
        </div>

        {/* SafePass Card */}
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <SafePassCard variant="compact" />
        </div>

        {/* Suggested Section */}
        <div className="rounded-2xl gradient-premium p-4 space-y-3 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-dark-muted" />
            <p className="text-xs font-bold text-dark-muted uppercase tracking-wider">Suggested for You</p>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1">
            {["Tokyo", "Lisbon", "Cape Town"].map((city) => (
              <button
                key={city}
                onClick={() => navigate("/discover")}
                className="shrink-0 rounded-xl dark-card-elevated px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <p className="text-white text-[13px] font-semibold">{city}</p>
                <p className="text-dark-muted text-[10px] mt-0.5">Trending now</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
