import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plane, Hotel, Car, Map, Utensils, Bus, Train, Calendar, ArrowLeft } from "lucide-react";

const TYPES = [
  { value: "flight", label: "Flight", icon: Plane },
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "car", label: "Car rental", icon: Car },
  { value: "tour", label: "Tour", icon: Map },
  { value: "restaurant", label: "Restaurant", icon: Utensils },
  { value: "transfer", label: "Transfer", icon: Car },
  { value: "train", label: "Train", icon: Train },
  { value: "bus", label: "Bus", icon: Bus },
  { value: "event", label: "Event", icon: Calendar },
] as const;

interface Props {
  tripId?: string;
  onBack: () => void;
  onSaved: () => void;
}

export default function ManualBookingForm({ tripId, onBack, onSaved }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<typeof TYPES[number]["value"]>("flight");
  const [form, setForm] = useState({
    title: "", provider: "", confirmation_code: "",
    location: "", start_at: "", end_at: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    if (!form.title) return toast.error("Add a title");
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      trip_id: tripId || null,
      type,
      title: form.title,
      provider: form.provider || null,
      confirmation_code: form.confirmation_code || null,
      location: form.location || null,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      details: form.notes ? { notes: form.notes } : {},
      source: "manual",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking added");
    onSaved();
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-dark-muted flex items-center gap-1 text-[12px]">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-2">Type</p>
        <div className="grid grid-cols-3 gap-1.5">
          {TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`rounded-xl p-2.5 text-center transition-all ${
                type === value ? "gradient-glow text-white glow-accent" : "dark-card text-dark-muted"
              }`}
            >
              <Icon className="h-4 w-4 mx-auto mb-1" />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Input placeholder="Title (e.g. AA 102 SFO → JFK)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Provider (e.g. American Airlines)" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
        <Input placeholder="Confirmation code" value={form.confirmation_code} onChange={(e) => setForm({ ...form, confirmation_code: e.target.value })} />
        <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
          <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
        </div>
        <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>

      <Button onClick={save} disabled={saving} className="w-full gradient-glow text-white border-0 rounded-xl glow-accent">
        {saving ? "Saving…" : "Save booking"}
      </Button>
    </div>
  );
}
