import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const TRIP_STYLES = ["adventure", "relaxation", "culture", "foodie", "luxury", "budget", "family", "romantic"];
const INTEREST_OPTIONS = ["food", "history", "nightlife", "nature", "shopping", "photography", "art", "sports"];
const PACE_OPTIONS = ["chill", "balanced", "packed"];

interface NewTripFormProps {
  onBack: () => void;
  onTripCreated: (tripId: string, itinerary: any) => void;
}

export default function NewTripForm({ onBack, onTripCreated }: NewTripFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [tripStyle, setTripStyle] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [dietary, setDietary] = useState("");
  const [pace, setPace] = useState("balanced");

  const toggleInterest = (id: string) => {
    setInterests((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!destination || !startDate || !endDate || !tripStyle) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: `Trip to ${destination}`,
          destination,
          start_date: startDate,
          end_date: endDate,
          budget: parseFloat(budget) || null,
          trip_style: tripStyle as any,
          travelers: parseInt(travelers) || 1,
          pace,
          dietary,
          interests,
          status: "planning" as const,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Generate itinerary via AI
      const { data: aiData, error: fnError } = await supabase.functions.invoke("generate-itinerary", {
        body: { destination, start_date: startDate, end_date: endDate, budget, travelers, trip_style: tripStyle, pace, interests: interests.join(", "), dietary },
      });

      if (fnError) throw fnError;
      if (aiData?.error) throw new Error(aiData.error);

      // Save itinerary items
      const items: any[] = [];
      for (const day of aiData.days || []) {
        for (const block of ["morning", "afternoon", "evening"] as const) {
          const act = day[block];
          if (act) {
            items.push({
              trip_id: trip.id,
              user_id: user.id,
              day_number: day.day,
              time: act.time || null,
              activity: act.activity || "Activity",
              location: act.location || null,
              notes: null,
              type: "activity" as const,
              estimated_cost: act.estimated_cost || null,
              description: act.description || null,
              time_block: block,
            });
          }
        }
      }

      if (items.length > 0) {
        const { error: insertError } = await supabase.from("itinerary_items").insert(items);
        if (insertError) throw insertError;
      }

      toast({ title: "Itinerary created!", description: `Your trip to ${destination} is ready.` });
      onTripCreated(trip.id, aiData);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to create trip", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pt-6 pb-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-heading text-xl font-semibold text-foreground">New Trip</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Destination *</Label>
          <Input placeholder="Paris, Tokyo, Bali..." value={destination} onChange={(e) => setDestination(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>End Date *</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Budget (USD)</Label>
            <Input type="number" placeholder="2000" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Travelers</Label>
            <Input type="number" min="1" value={travelers} onChange={(e) => setTravelers(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Trip Style *</Label>
          <div className="flex flex-wrap gap-2">
            {TRIP_STYLES.map((s) => (
              <button key={s} type="button" onClick={() => setTripStyle(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all capitalize ${tripStyle === s ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => (
              <button key={i} type="button" onClick={() => toggleInterest(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all capitalize ${interests.includes(i) ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50"}`}>
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Pace</Label>
          <div className="flex gap-2">
            {PACE_OPTIONS.map((p) => (
              <button key={p} type="button" onClick={() => setPace(p)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-all capitalize flex-1 ${pace === p ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-accent/50"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Dietary Preferences</Label>
          <Input placeholder="Vegetarian, gluten free, halal..." value={dietary} onChange={(e) => setDietary(e.target.value)} />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Itinerary...</> : "Generate AI Itinerary"}
        </Button>
      </form>
    </div>
  );
}
