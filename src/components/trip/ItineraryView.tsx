import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Pencil, Trash2, Check, X, DollarSign, MapPin, Clock, Loader2, ListChecks, CalendarDays } from "lucide-react";
import TripChecklist from "./TripChecklist";

interface ItineraryItem {
  id: string;
  day_number: number;
  time_block: string;
  activity: string;
  location: string | null;
  estimated_cost: number | null;
  description: string | null;
  time: string | null;
}

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
}

interface ItineraryViewProps {
  trip: Trip;
  items: ItineraryItem[];
  onBack: () => void;
  onItemsChange: (items: ItineraryItem[]) => void;
}

const BLOCK_ORDER = ["morning", "afternoon", "evening"];
const BLOCK_ICONS: Record<string, string> = { morning: "🌅", afternoon: "☀️", evening: "🌙" };

function getDateForDay(startDate: string, dayNumber: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayNumber - 1);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getISODateForDay(startDate: string, dayNumber: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayNumber - 1);
  return d.toISOString().split("T")[0];
}

export default function ItineraryView({ trip, items, onBack, onItemsChange }: ItineraryViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ activity: "", location: "", estimated_cost: "", description: "" });
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"itinerary" | "checklist">("itinerary");

  const dayNumbers = [...new Set(items.map((i) => i.day_number))].sort((a, b) => a - b);

  const startEdit = (item: ItineraryItem) => {
    setEditingId(item.id);
    setEditForm({
      activity: item.activity,
      location: item.location || "",
      estimated_cost: item.estimated_cost?.toString() || "",
      description: item.description || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("itinerary_items")
      .update({
        activity: editForm.activity,
        location: editForm.location || null,
        estimated_cost: editForm.estimated_cost ? parseFloat(editForm.estimated_cost) : null,
        description: editForm.description || null,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onItemsChange(items.map((i) => i.id === editingId ? { ...i, ...editForm, estimated_cost: editForm.estimated_cost ? parseFloat(editForm.estimated_cost) : null } : i));
      setEditingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onItemsChange(items.filter((i) => i.id !== id));
    }
  };

  const regenerateDay = async (dayNumber: number) => {
    if (!user) return;
    setRegeneratingDay(dayNumber);

    try {
      const dateStr = getISODateForDay(trip.start_date, dayNumber);
      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          budget: trip.budget,
          travelers: trip.travelers,
          trip_style: trip.trip_style,
          pace: trip.pace,
          interests: trip.interests?.join(", ") || "",
          dietary: trip.dietary || "",
          regenerate_day: { day_number: dayNumber, date: dateStr },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Delete old items for this day
      const oldIds = items.filter((i) => i.day_number === dayNumber).map((i) => i.id);
      if (oldIds.length > 0) {
        await supabase.from("itinerary_items").delete().in("id", oldIds);
      }

      // Insert new items
      const newItems: any[] = [];
      for (const block of BLOCK_ORDER) {
        const act = data[block];
        if (act) {
          newItems.push({
            trip_id: trip.id,
            user_id: user.id,
            day_number: dayNumber,
            time: act.time || null,
            activity: act.activity || "Activity",
            location: act.location || null,
            type: "activity" as const,
            estimated_cost: act.estimated_cost || null,
            description: act.description || null,
            time_block: block,
          });
        }
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("itinerary_items")
        .insert(newItems)
        .select();

      if (insertErr) throw insertErr;

      const updatedItems = items.filter((i) => i.day_number !== dayNumber);
      if (inserted) {
        updatedItems.push(...inserted.map((i: any) => ({
          id: i.id,
          day_number: i.day_number,
          time_block: i.time_block,
          activity: i.activity,
          location: i.location,
          estimated_cost: i.estimated_cost,
          description: i.description,
          time: i.time,
        })));
      }
      onItemsChange(updatedItems);
      toast({ title: "Day regenerated!", description: `Day ${dayNumber} has fresh activities.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to regenerate", variant: "destructive" });
    } finally {
      setRegeneratingDay(null);
    }
  };

  return (
    <div className="px-5 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-semibold text-foreground">{trip.title}</h1>
          <p className="text-muted-foreground text-xs">{trip.start_date} → {trip.end_date}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("itinerary")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${activeTab === "itinerary" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Itinerary
        </button>
        <button
          onClick={() => setActiveTab("checklist")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${activeTab === "checklist" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <ListChecks className="h-3.5 w-3.5" /> Checklist
        </button>
      </div>

      {activeTab === "checklist" ? (
        <TripChecklist
          tripId={trip.id}
          destination={trip.destination}
          startDate={trip.start_date}
          endDate={trip.end_date}
          tripStyle={trip.trip_style}
        />
      ) : (
      <>

      {dayNumbers.map((dayNum) => {
        const dayItems = items.filter((i) => i.day_number === dayNum).sort((a, b) => BLOCK_ORDER.indexOf(a.time_block) - BLOCK_ORDER.indexOf(b.time_block));
        return (
          <div key={dayNum} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
              <div>
                <span className="font-heading font-semibold text-foreground text-sm">Day {dayNum}</span>
                <span className="text-muted-foreground text-xs ml-2">{getDateForDay(trip.start_date, dayNum)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => regenerateDay(dayNum)}
                disabled={regeneratingDay === dayNum}
                className="text-xs gap-1"
              >
                {regeneratingDay === dayNum ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerate
              </Button>
            </div>

            <div className="divide-y divide-border">
              {dayItems.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <Input value={editForm.activity} onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })} placeholder="Activity name" />
                      <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Location" />
                      <Input type="number" value={editForm.estimated_cost} onChange={(e) => setEditForm({ ...editForm, estimated_cost: e.target.value })} placeholder="Cost (USD)" />
                      <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} className="gap-1"><Check className="h-3 w-3" /> Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="text-lg mt-0.5">{BLOCK_ICONS[item.time_block] || "📌"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm text-foreground">{item.activity}</p>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-foreground p-1"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                          {item.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>}
                          {item.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.time}</span>}
                          {item.estimated_cost != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${item.estimated_cost}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {dayItems.length === 0 && (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">No activities for this day</div>
              )}
            </div>
          </div>
        );
      })}

      {dayNumbers.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          No itinerary items yet
        </div>
      )}
    </div>
  );
}
