import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Map, Plus, ChevronRight, Sparkles, Plane, Calendar, Users, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  const daysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff}d away` : diff === 0 ? "Today" : "Past";
  };

  return (
    <div className="pb-4">
      {/* Dark header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-emerald-500/6 blur-3xl" />

        <div className="relative px-5 pt-14 pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">AI-Powered</p>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight mt-1">Trip Planner</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/camera")} className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center">
                <Camera className="h-4 w-4 text-glow" />
              </button>
              <Button onClick={() => setView("new")} size="sm" className="gradient-glow border-0 text-white gap-1.5 rounded-xl text-xs font-bold glow-accent h-9 px-4">
                <Plus className="h-3.5 w-3.5" /> New Trip
              </Button>
            </div>
          </div>

          {/* AI CTA */}
          <button
            onClick={() => setView("new")}
            className="w-full rounded-2xl p-4 flex items-center gap-3.5 group transition-all dark-card hover:bg-white/[0.03]"
          >
            <div className="h-11 w-11 rounded-xl gradient-glow flex items-center justify-center shrink-0 glow-accent">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-semibold text-[13px]">Surprise Me ✨</p>
              <p className="text-dark-muted text-[11px]">Let AI plan your next adventure</p>
            </div>
            <ChevronRight className="h-4 w-4 text-dark-muted group-hover:text-glow transition-colors" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonTripCard key={i} />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="pt-4">
            <EmptyState
              icon={Map}
              title="No trips yet"
              description="Create your first AI-powered trip and watch your itinerary come to life."
              actionLabel="Plan a Trip"
              onAction={() => setView("new")}
            />
          </div>
        ) : (
          <>
            {activeTrips.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="section-title px-0.5">Upcoming</h2>
                {activeTrips.map((trip, i) => (
                  <button
                    key={trip.id}
                    onClick={() => openTrip(trip)}
                    className="w-full rounded-2xl border border-border/40 bg-card p-4 text-left hover:shadow-card-hover transition-all animate-fade-in active:scale-[0.98] shadow-soft"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center shrink-0">
                        <Plane className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-foreground truncate">{trip.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" /> {daysUntil(trip.start_date)}</span>
                          <span>·</span>
                          <span>{trip.destination}</span>
                        </p>
                        {trip.travelers > 1 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" /> {trip.travelers} travelers
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {pastTrips.length > 0 && (
              <div className="space-y-2.5">
                <h2 className="section-title px-0.5">Past Trips</h2>
                {pastTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => openTrip(trip)}
                    className="w-full rounded-2xl border border-border/40 bg-card p-4 text-left hover:shadow-soft transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Plane className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px] text-foreground truncate">{trip.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{trip.destination}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Done</span>
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
