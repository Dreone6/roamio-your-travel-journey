import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, AlertTriangle, Bell, BellOff, Sparkles } from "lucide-react";

const CATEGORY_MAP: Record<string, string> = {
  "Documents": "documents",
  "Packing": "packing",
  "Bookings": "booking",
  "Pre Trip Tasks": "pre_trip_tasks",
  "Day Of": "day_of",
};

const CATEGORY_DISPLAY: Record<string, string> = {
  documents: "Documents",
  packing: "Packing",
  booking: "Bookings",
  pre_trip_tasks: "Pre Trip Tasks",
  day_of: "Day Of",
  other: "Other",
};

const CATEGORY_ICONS: Record<string, string> = {
  documents: "📄",
  packing: "🧳",
  booking: "🏨",
  pre_trip_tasks: "✅",
  day_of: "🛫",
  other: "📌",
};

interface ChecklistItem {
  id: string;
  item_name: string;
  category: string;
  completed: boolean;
  due_date: string | null;
  reminder: boolean;
}

interface TripChecklistProps {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripStyle: string | null;
}

export default function TripChecklist({ tripId, destination, startDate, endDate, tripStyle }: TripChecklistProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadItems();
  }, [tripId]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("checklists")
      .select("*")
      .eq("trip_id", tripId)
      .order("category")
      .order("completed")
      .order("item_name");
    setItems((data as ChecklistItem[]) || []);
    setLoading(false);
  };

  const generateChecklist = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const tripLength = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const month = start.toLocaleString("en-US", { month: "long" });

      const { data, error } = await supabase.functions.invoke("generate-checklist", {
        body: { destination, trip_length: tripLength, month, trip_style: tripStyle },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newItems: any[] = [];
      for (const cat of data.categories || []) {
        const dbCategory = CATEGORY_MAP[cat.name] || "other";
        for (const itemName of cat.items || []) {
          newItems.push({
            user_id: user.id,
            trip_id: tripId,
            item_name: itemName,
            category: dbCategory,
            completed: false,
            reminder: false,
          });
        }
      }

      if (newItems.length > 0) {
        const { error: insertErr } = await supabase.from("checklists").insert(newItems);
        if (insertErr) throw insertErr;
      }

      await loadItems();
      toast({ title: "Checklist generated!", description: `${newItems.length} items added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate checklist", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const toggleItem = async (id: string, completed: boolean) => {
    await supabase.from("checklists").update({ completed }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed } : i)));
  };

  const toggleReminder = async (id: string, reminder: boolean) => {
    await supabase.from("checklists").update({ reminder }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, reminder } : i)));
  };

  const addCustomItem = async () => {
    if (!user || !newItem.trim()) return;
    const { error } = await supabase.from("checklists").insert({
      user_id: user.id,
      trip_id: tripId,
      item_name: newItem.trim(),
      category: newCategory,
      completed: false,
      reminder: false,
    });
    if (!error) {
      setNewItem("");
      setShowAdd(false);
      await loadItems();
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("checklists").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Smart suggestions
  const suggestions: string[] = [];
  const daysUntilTrip = Math.ceil((new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntilTrip > 0 && daysUntilTrip <= 7) {
    const uncheckedBookings = items.filter((i) => i.category === "booking" && !i.completed);
    if (uncheckedBookings.length > 0) {
      suggestions.push(`Your trip is in ${daysUntilTrip} days. Did you confirm your ${uncheckedBookings[0].item_name.toLowerCase()}?`);
    }
    const uncheckedDocs = items.filter((i) => i.category === "documents" && !i.completed);
    if (uncheckedDocs.length > 0) {
      suggestions.push(`Check your documents before you go: ${uncheckedDocs.map((d) => d.item_name).join(", ")}`);
    }
  }

  if (daysUntilTrip > 0 && daysUntilTrip <= 3) {
    const uncheckedPacking = items.filter((i) => i.category === "packing" && !i.completed);
    if (uncheckedPacking.length > 3) {
      suggestions.push(`You still have ${uncheckedPacking.length} packing items to check off!`);
    }
  }

  // Group by category
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const completedCount = items.filter((i) => i.completed).length;

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Checklist</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)} className="text-xs gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
          {items.length === 0 && (
            <Button size="sm" onClick={generateChecklist} disabled={generating} className="text-xs gap-1">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {items.length} done</span>
            <span>{Math.round((completedCount / items.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(completedCount / items.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-accent/10 border border-accent/20 p-3 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <span>{s}</span>
        </div>
      ))}

      {/* Add Custom Item */}
      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <Input placeholder="Item name" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
          <div className="flex gap-2">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
              {Object.entries(CATEGORY_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button size="sm" onClick={addCustomItem} disabled={!newItem.trim()}>Add</Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showAdd && (
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
          <p className="text-muted-foreground text-sm">No checklist items yet</p>
          <Button size="sm" onClick={generateChecklist} disabled={generating} className="gap-1">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Auto Generate Checklist
          </Button>
        </div>
      )}

      {/* Items by Category */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        return (
          <div key={cat} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 py-1">
              <span>{CATEGORY_ICONS[cat] || "📌"}</span>
              {CATEGORY_DISPLAY[cat] || cat}
            </p>
            {catItems.map((item) => (
              <div key={item.id} className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 ${item.completed ? "opacity-60" : ""}`}>
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => toggleItem(item.id, !!checked)}
                />
                <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {item.item_name}
                </span>
                <button
                  onClick={() => toggleReminder(item.id, !item.reminder)}
                  className={`p-1 ${item.reminder ? "text-accent" : "text-muted-foreground/40"}`}
                >
                  {item.reminder ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Regenerate button if items exist */}
      {items.length > 0 && (
        <Button variant="outline" size="sm" onClick={generateChecklist} disabled={generating} className="w-full text-xs gap-1">
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Add More AI Suggestions
        </Button>
      )}
    </div>
  );
}
