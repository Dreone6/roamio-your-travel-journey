import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, Pencil, Trash2, Check, X, DollarSign,
  MapPin, Clock, Loader2, ListChecks, CalendarDays, Share2,
  Utensils, Shield, Navigation, Bookmark, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import TripChecklist from "./TripChecklist";
import ShareItinerarySheet from "./ShareItinerarySheet";
import GetAroundSheet from "./GetAroundSheet";
import OfflineTripToggle from "./OfflineTripToggle";
import BookingsList from "@/components/bookings/BookingsList";
import BookingImportSheet from "@/components/bookings/BookingImportSheet";

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
const BLOCK_META: Record<string, { icon: string; label: string; color: string }> = {
  morning: { icon: "🌅", label: "Morning", color: "text-amber-400" },
  afternoon: { icon: "☀️", label: "Afternoon", color: "text-orange-400" },
  evening: { icon: "🌙", label: "Evening", color: "text-indigo-400" },
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ activity: "", location: "", estimated_cost: "", description: "" });
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"itinerary" | "checklist">("itinerary");
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareSheet, setShareSheet] = useState(false);
  const [getAround, setGetAround] = useState<string | undefined>(undefined);
  const [importBookings, setImportBookings] = useState(false);

  const dayNumbers = [...new Set(items.map((i) => i.day_number))].sort((a, b) => a - b);
  const totalCost = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);

  const toggleDay = (d: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

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
      toast.error(error.message);
    } else {
      onItemsChange(items.map((i) => i.id === editingId ? { ...i, ...editForm, estimated_cost: editForm.estimated_cost ? parseFloat(editForm.estimated_cost) : null } : i));
      setEditingId(null);
      toast.success("Activity updated");
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
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

      const oldIds = items.filter((i) => i.day_number === dayNumber).map((i) => i.id);
      if (oldIds.length > 0) {
        await supabase.from("itinerary_items").delete().in("id", oldIds);
      }

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

      const { data: inserted, error: insertErr } = await supabase.from("itinerary_items").insert(newItems).select();
      if (insertErr) throw insertErr;

      const updatedItems = items.filter((i) => i.day_number !== dayNumber);
      if (inserted) {
        updatedItems.push(...inserted.map((i: any) => ({
          id: i.id, day_number: i.day_number, time_block: i.time_block,
          activity: i.activity, location: i.location, estimated_cost: i.estimated_cost,
          description: i.description, time: i.time,
        })));
      }
      onItemsChange(updatedItems);
      toast.success(`Day ${dayNumber} regenerated ✨`);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate");
    } finally {
      setRegeneratingDay(null);
    }
  };

  return (
    <div className="min-h-screen pb-6">
      {/* Dark header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-4">
          <button onClick={onBack} className="text-dark-muted flex items-center gap-1 text-[12px] mb-3">
            <ArrowLeft className="h-4 w-4" /> Trips
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-[20px] font-bold text-white tracking-tight">{trip.title}</h1>
              <p className="text-dark-muted text-[11px] mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.destination}</span>
                <span>·</span>
                <span>{trip.start_date} → {trip.end_date}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShareSheet(true)}
                className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center"
              >
                <Share2 className="h-4 w-4 text-glow" />
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="dark-card rounded-xl p-2.5 text-center">
              <p className="font-heading font-bold text-sm text-glow">{dayNumbers.length}</p>
              <p className="text-[8px] text-dark-muted uppercase tracking-wider">Days</p>
            </div>
            <div className="dark-card rounded-xl p-2.5 text-center">
              <p className="font-heading font-bold text-sm text-glow">${totalCost}</p>
              <p className="text-[8px] text-dark-muted uppercase tracking-wider">Est. Cost</p>
            </div>
            <div className="dark-card rounded-xl p-2.5 text-center">
              <p className="font-heading font-bold text-sm text-glow">{items.length}</p>
              <p className="text-[8px] text-dark-muted uppercase tracking-wider">Activities</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl dark-card p-1 mt-3">
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                activeTab === "itinerary" ? "gradient-glow text-white glow-accent" : "text-dark-muted"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Itinerary
            </button>
            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                activeTab === "checklist" ? "gradient-glow text-white glow-accent" : "text-dark-muted"
              }`}
            >
              <ListChecks className="h-3.5 w-3.5" /> Checklist
            </button>
          </div>
        </div>
      </div>

      {/* Share menu overlay */}
      {showShareMenu && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-soft space-y-2.5 animate-fade-in">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Share trip</p>
            {[
              { icon: Send, label: "Send to friend", desc: "Share via Roavr messaging" },
              { icon: Share2, label: "Copy link", desc: "Anyone with the link can view" },
              { icon: Bookmark, label: "Save to Globe", desc: "Pin this trip to your map" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => { toast.success(`${a.label} — coming soon`); setShowShareMenu(false); }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left"
              >
                <a.icon className="h-4 w-4 text-accent shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-3">
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
              const dayItems = items
                .filter((i) => i.day_number === dayNum)
                .sort((a, b) => BLOCK_ORDER.indexOf(a.time_block) - BLOCK_ORDER.indexOf(b.time_block));
              const dayCost = dayItems.reduce((s, i) => s + (i.estimated_cost || 0), 0);
              const collapsed = collapsedDays.has(dayNum);

              return (
                <div key={dayNum} className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-soft">
                  {/* Day header */}
                  <button
                    onClick={() => toggleDay(dayNum)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                        <span className="font-heading font-bold text-sm text-emerald-700">{dayNum}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-heading font-semibold text-[13px] text-foreground">Day {dayNum}</p>
                        <p className="text-[10px] text-muted-foreground">{getDateForDay(trip.start_date, dayNum)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">${dayCost}</span>
                      {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {!collapsed && (
                    <div className="divide-y divide-border/30">
                      {dayItems.map((item) => {
                        const meta = BLOCK_META[item.time_block] || BLOCK_META.morning;
                        return (
                          <div key={item.id} className="px-4 py-3.5">
                            {editingId === item.id ? (
                              <div className="space-y-2">
                                <Input value={editForm.activity} onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })} placeholder="Activity" />
                                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Location" />
                                <Input type="number" value={editForm.estimated_cost} onChange={(e) => setEditForm({ ...editForm, estimated_cost: e.target.value })} placeholder="Cost (USD)" />
                                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" rows={2} />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEdit} className="gap-1 rounded-lg"><Check className="h-3 w-3" /> Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <span className="text-lg">{meta.icon}</span>
                                  <span className={`text-[8px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-[13px] text-foreground">{item.activity}</p>
                                      {item.description && (
                                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-0.5 shrink-0">
                                      <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2.5 mt-2 text-[10px] text-muted-foreground">
                                    {item.location && (
                                      <span className="flex items-center gap-1 bg-secondary/50 rounded-full px-2 py-0.5">
                                        <MapPin className="h-2.5 w-2.5" />{item.location}
                                      </span>
                                    )}
                                    {item.time && (
                                      <span className="flex items-center gap-1 bg-secondary/50 rounded-full px-2 py-0.5">
                                        <Clock className="h-2.5 w-2.5" />{item.time}
                                      </span>
                                    )}
                                    {item.estimated_cost != null && (
                                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 font-medium">
                                        <DollarSign className="h-2.5 w-2.5" />${item.estimated_cost}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {dayItems.length === 0 && (
                        <div className="px-4 py-6 text-center text-muted-foreground text-[12px]">No activities yet</div>
                      )}

                      {/* Regenerate */}
                      <div className="px-4 py-2.5">
                        <button
                          onClick={() => regenerateDay(dayNum)}
                          disabled={regeneratingDay === dayNum}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-accent hover:bg-accent/5 transition-colors"
                        >
                          {regeneratingDay === dayNum ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {regeneratingDay === dayNum ? "Regenerating..." : "Regenerate this day"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {dayNumbers.length === 0 && (
              <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
                <p className="text-muted-foreground text-[13px]">No itinerary items yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
