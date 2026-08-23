import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, DollarSign, Share2 } from "lucide-react";

export default function SharedItineraryPage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: share } = await supabase.from("trip_shares").select("trip_id, visibility").eq("token", token).maybeSingle();
      if (!share) { setError("This shared trip is not available."); return; }
      const { data: t } = await supabase.from("trips").select("*").eq("id", share.trip_id).maybeSingle();
      const { data: it } = await supabase.from("itinerary_items").select("*").eq("trip_id", share.trip_id).order("day_number").order("time_block");
      const { data: bk } = await supabase.from("bookings").select("*").eq("trip_id", share.trip_id).order("start_at");
      setTrip(t);
      setItems(it || []);
      setBookings(bk || []);
    })();
  }, [token]);

  if (error) return <div className="min-h-dvh flex items-center justify-center text-dark-muted">{error}</div>;
  if (!trip) return <div className="min-h-dvh flex items-center justify-center text-dark-muted">Loading…</div>;

  const days = [...new Set(items.map((i) => i.day_number))].sort((a, b) => a - b);

  return (
    <div className="dark-immersive min-h-dvh pb-12">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-5">
          <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5">
            <Share2 className="h-3 w-3" /> Shared via Roavr
          </p>
          <h1 className="font-heading text-[26px] font-bold text-white tracking-tight mt-1">{trip.title}</h1>
          <p className="text-dark-muted text-[12px] mt-1 flex items-center gap-2">
            <MapPin className="h-3 w-3" />{trip.destination}
            <span>·</span>
            <Calendar className="h-3 w-3" />{trip.start_date} → {trip.end_date}
          </p>
        </div>
      </div>

      <div className="px-5 mt-3 space-y-4">
        {bookings.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-white mb-2">Bookings</p>
            <div className="space-y-1.5">
              {bookings.map((b) => (
                <div key={b.id} className="dark-card rounded-xl p-3">
                  <p className="text-[12px] font-semibold text-white">{b.title}</p>
                  <p className="text-[10px] text-dark-muted">{[b.provider, b.location].filter(Boolean).join(" · ")}</p>
                  {b.confirmation_code && <p className="text-[10px] text-glow mt-0.5">Confirmation: {b.confirmation_code}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {days.map((d) => (
          <div key={d} className="dark-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.03]">
              <p className="font-heading font-bold text-[14px] text-white">Day {d}</p>
            </div>
            <div className="divide-y divide-white/5">
              {items.filter((i) => i.day_number === d).map((it) => (
                <div key={it.id} className="px-4 py-3">
                  <p className="text-[12px] font-semibold text-white">{it.activity}</p>
                  {it.description && <p className="text-[11px] text-dark-muted mt-0.5">{it.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-dark-muted">
                    {it.location && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{it.location}</span>}
                    {it.time && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{it.time}</span>}
                    {it.estimated_cost && <span className="flex items-center gap-0.5 text-emerald-400"><DollarSign className="h-2.5 w-2.5" />{it.estimated_cost}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
