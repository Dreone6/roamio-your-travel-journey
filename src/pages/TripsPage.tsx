import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Map, Plus, ChevronRight, Sparkles, Plane } from "lucide-react";
import NewTripForm from "@/components/trip/NewTripForm";
import ItineraryView from "@/components/trip/ItineraryView";
import EmptyState from "@/components/EmptyState";
import { SkeletonTripCard } from "@/components/ui/skeleton-card";

type ViewState = "list" | "new" | "view";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  travelers: number;
  trip_style: string | null;
  pace: string | null;
  dietary: string | null;
  interests: string[] | null;
  status: string;
}

export default function TripsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewState>("list");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadTrips();
  }, [user]);

  const loadTrips = async () => {
    setLoading(true);
    const { data } = await supabase.from("trips").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setTrips((data as Trip[]) || []);
    setLoading(false);
  };

  const openTrip = async (trip: Trip) => {
    setSelectedTrip(trip);
    const { data } = await supabase.from("itinerary_items").select("id, day_number, time_block, activity, location, estimated_cost, description, time").eq("trip_id", trip.id).order("day_number").order("time_block");
    setItineraryItems(data || []);
    setView("view");
  };

  const handleTripCreated = async (tripId: string) => {
    await loadTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (trip) { openTrip(trip); } else {
      const { data } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (data) openTrip(data as Trip);
    }
  };

  if (view === "new") return <NewTripForm onBack={() => setView("list")} onTripCreated={handleTripCreated} />;
  if (view === "view" && selectedTrip) return <ItineraryView trip={selectedTrip} items={itineraryItems} onBack={() => { setView("list"); loadTrips(); }} onItemsChange={setItineraryItems} />;

  const activeTrips = trips.filter((t) => t.status === "active" || t.status === "planning");
  const pastTrips = trips.filter((t) => t.status === "completed");

  return (
    <div className="pb-24">
      {/* Dark header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute top-10 right-0 w-60 h-60 rounded-full bg-emerald-500/8 blur-3xl" />
        
        <div className="relative px-5 pt-12 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-xs font-semibold tracking-widest uppercase">AI-Powered</p>
              <h1 className="font-heading text-2xl font-bold text-white tracking-tight mt-1">Trip Planner</h1>
            </div>
            <Button onClick={() => setView("new")} size="sm" className="gradient-glow border-0 text-white gap-1.5 rounded-xl glow-accent">
              <Plus className="h-4 w-4" /> New Trip
            </Button>
          </div>

          {/* Quick new trip CTA */}
          <button
            onClick={() => setView("new")}
            className="w-full rounded-2xl p-4 flex items-center gap-4 group transition-all"
            style={{ background: 'linear-gradient(135deg, hsl(220 25% 12%), hsl(220 25% 16%))' }}
          >
            <div className="h-12 w-12 rounded-xl gradient-glow flex items-center justify-center shrink-0 glow-accent">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-semibold text-sm">Surprise Me ✨</p>
              <p className="text-dark-muted text-xs">Let AI plan your next adventure</p>
            </div>
            <ChevronRight className="h-5 w-5 text-dark-muted group-hover:text-glow transition-colors" />
          </button>
        </div>
      </div>

      {/* Light content */}
      <div className="px-5 pt-5 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonTripCard key={i} />)}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={Map}
            title="No trips yet"
            description="Tap New Trip to plan your first AI-powered adventure."
            actionLabel="Plan a Trip"
            onAction={() => setView("new")}
          />
        ) : (
          <>
            {activeTrips.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-base font-semibold text-foreground">Upcoming</h2>
                {activeTrips.map((trip, i) => (
                  <button
                    key={trip.id}
                    onClick={() => openTrip(trip)}
                    className="w-full rounded-2xl border border-border/50 bg-card p-4 text-left hover:shadow-elevated transition-all animate-fade-in active:scale-[0.98] shadow-soft"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center shrink-0">
                        <Plane className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{trip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{trip.destination} · {trip.start_date} → {trip.end_date}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {pastTrips.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-base font-semibold text-foreground">Past Trips</h2>
                {pastTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => openTrip(trip)}
                    className="w-full rounded-2xl border border-border/50 bg-card p-4 text-left hover:shadow-soft transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Plane className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{trip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{trip.destination}</p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Completed</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
