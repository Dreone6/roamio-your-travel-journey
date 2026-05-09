import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plane, Hotel, Car, Map, Utensils, Bus, Train, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  flight: Plane, hotel: Hotel, car: Car, tour: Map,
  restaurant: Utensils, transfer: Car, train: Train, bus: Bus, event: Calendar,
};

interface Booking {
  id: string;
  type: string;
  title: string;
  provider: string | null;
  confirmation_code: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
}

export default function BookingsList({ tripId, refreshKey = 0 }: { tripId?: string; refreshKey?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let q = supabase.from("bookings").select("*").eq("user_id", user.id).order("start_at", { ascending: true });
    if (tripId) q = q.eq("trip_id", tripId);
    q.then(({ data }) => {
      setItems((data as Booking[]) || []);
      setLoading(false);
    });
  }, [user, tripId, refreshKey]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((p) => p.filter((b) => b.id !== id));
  };

  if (loading) return <div className="dark-card rounded-xl p-4 text-center text-dark-muted text-[11px]">Loading bookings…</div>;
  if (items.length === 0) return <div className="dark-card rounded-xl p-4 text-center text-dark-muted text-[11px]">No bookings yet</div>;

  return (
    <div className="space-y-2">
      {items.map((b) => {
        const Icon = ICONS[b.type] || Calendar;
        return (
          <div key={b.id} className="dark-card rounded-xl p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-glow" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">{b.title}</p>
              <p className="text-[10px] text-dark-muted truncate">
                {[b.provider, b.location, b.start_at && new Date(b.start_at).toLocaleDateString()].filter(Boolean).join(" · ")}
              </p>
              {b.confirmation_code && <p className="text-[9px] text-dark-muted mt-0.5">Code: {b.confirmation_code}</p>}
            </div>
            <button onClick={() => remove(b.id)} className="p-1.5 text-dark-muted hover:text-rose-400 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
