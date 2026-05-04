import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Map, Plus, ChevronRight, Loader2 } from "lucide-react";
import NewTripForm from "@/components/trip/NewTripForm";
import ItineraryView from "@/components/trip/ItineraryView";

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

export default function PlanPage() {
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
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setTrips((data as Trip[]) || []);
    setLoading(false);
  };

  const openTrip = async (trip: Trip) => {
    setSelectedTrip(trip);
    const { data } = await supabase
      .from("itinerary_items")
      .select("id, day_number, time_block, activity, location, estimated_cost, description, time")
      .eq("trip_id", trip.id)
      .order("day_number")
      .order("time_block");
    setItineraryItems(data || []);
    setView("view");
  };

  const handleTripCreated = async (tripId: string) => {
    await loadTrips();
    const trip = trips.find((t) => t.id === tripId);
    if (trip) {
      openTrip(trip);
    } else {
      // Reload and find
      const { data } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (data) openTrip(data as Trip);
    }
  };

  if (view === "new") {
    return <NewTripForm onBack={() => setView("list")} onTripCreated={handleTripCreated} />;
  }

  if (view === "view" && selectedTrip) {
    return (
      <ItineraryView
        trip={selectedTrip}
        items={itineraryItems}
        onBack={() => { setView("list"); loadTrips(); }}
        onItemsChange={setItineraryItems}
      />
    );
  }

  return (
    <div className="px-5 pt-12 pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Plan</h1>
        <Button onClick={() => setView("new")} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Trip
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-8 text-center space-y-3">
          <Map className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="font-heading text-lg font-medium text-foreground">No trips yet</h2>
          <p className="text-muted-foreground text-sm">Tap New Trip to plan your first AI powered adventure.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => openTrip(trip)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-accent/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{trip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{trip.destination} · {trip.start_date} → {trip.end_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "active" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}>
                    {trip.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
