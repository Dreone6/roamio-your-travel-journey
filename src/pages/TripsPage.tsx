/**
 * Trips home — real persisted trips only, bucketed into Upcoming / Past /
 * Drafts. Nothing is seeded into an authenticated account.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ChevronRight, Mail, MapPin, CalendarDays, Users, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bucketOf, daysUntil, listTrips } from "@/lib/trips/api";
import type { Trip, TripBucket } from "@/lib/trips/types";
import CreateTripSheet from "@/components/trip/CreateTripSheet";
import AskRoavrPanel from "@/components/trip/AskRoavrPanel";
import BookingImportSheet from "@/components/bookings/BookingImportSheet";
import NearbySection from "@/components/trips/NearbySection";
import { SkeletonTripCard } from "@/components/ui/skeleton-card";

const TABS: { key: TripBucket; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "drafts", label: "Drafts" },
];

export default function TripsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const askPrompt = searchParams.get("ask") ?? "";
  const focusNearby = searchParams.get("nearby") === "1";

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TripBucket>("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(!!askPrompt);
  const [askTrip, setAskTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listTrips(user.id)
      .then((t) => !cancelled && setTrips(t))
      .catch(() => !cancelled && setTrips([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (focusNearby) {
      setTimeout(() => document.getElementById("nearby")?.scrollIntoView({ behavior: "smooth" }), 250);
    }
  }, [focusNearby]);

  const buckets = useMemo(() => {
    const map: Record<TripBucket, Trip[]> = { upcoming: [], past: [], drafts: [] };
    for (const t of trips) map[bucketOf(t)].push(t);
    map.upcoming.sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
    return map;
  }, [trips]);

  const visible = buckets[tab];

  return (
    <div className="min-h-dvh pb-28" style={{ background: "#080D1A" }}>
      <header className="px-5 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-white font-heading" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>Trips</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 text-white"
          style={{ background: "#3B82F6", borderRadius: 9999, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
        >
          <Plus className="h-4 w-4" /> Plan a Trip
        </button>
      </header>

      {askOpen && (
        <div className="px-5 pb-4">
          <AskRoavrPanel
            trip={askTrip}
            trips={trips}
            items={[]}
            initialPrompt={askPrompt}
            onTripSelect={setAskTrip}
            onItemsAdded={() => askTrip && navigate(`/trips/${askTrip.id}`)}
            onClose={() => {
              setAskOpen(false);
              if (askPrompt) { searchParams.delete("ask"); setSearchParams(searchParams, { replace: true }); }
            }}
          />
        </div>
      )}

      <nav className="px-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? "#3B82F6" : "#111827",
              color: tab === t.key ? "#FFFFFF" : "#94A3B8",
              border: "1px solid #1E2A3F", borderRadius: 9999, padding: "8px 14px", fontSize: 13, fontWeight: 600,
            }}
          >
            {t.label}
            {buckets[t.key].length > 0 && ` · ${buckets[t.key].length}`}
          </button>
        ))}
      </nav>

      <main className="px-5 mt-4 space-y-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonTripCard key={i} />)
        ) : visible.length === 0 ? (
          <div className="rounded-[24px] p-6 text-center" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
            <Compass className="h-7 w-7 mx-auto" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            <p className="mt-3 text-white font-heading" style={{ fontSize: 18, fontWeight: 600 }}>
              {tab === "upcoming" ? "Where are you going next?" : tab === "past" ? "No past trips yet" : "No drafts"}
            </p>
            <p className="mt-1.5" style={{ color: "#94A3B8", fontSize: 13 }}>
              {tab === "upcoming"
                ? "Start a trip and Roavr will bring in the people who know that place."
                : tab === "past"
                  ? "Finished trips land here, ready to become part of your World."
                  : "Trips without dates stay here until you're ready."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => setCreateOpen(true)} className="text-white" style={{ background: "#3B82F6", borderRadius: 9999, height: 46, fontSize: 14, fontWeight: 600 }}>
                Plan a Trip
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center justify-center gap-1.5"
                style={{ background: "#1A2236", border: "1px solid #1E2A3F", color: "#94A3B8", borderRadius: 9999, height: 46, fontSize: 14, fontWeight: 600 }}
              >
                <Mail className="h-4 w-4" /> Import a Booking
              </button>
            </div>
          </div>
        ) : (
          visible.map((trip) => {
            const countdown = daysUntil(trip.start_date);
            return (
              <button
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="w-full text-left rounded-[24px] overflow-hidden active:scale-[0.99] transition-transform"
                style={{ background: "#111827", border: "1px solid #1E2A3F" }}
              >
                {trip.cover_photo && (
                  <img src={trip.cover_photo} alt="" className="w-full h-32 object-cover" loading="lazy" />
                )}
                <div className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate font-heading" style={{ fontSize: 16, fontWeight: 600 }}>{trip.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5" style={{ color: "#94A3B8", fontSize: 12 }}>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.5} />{trip.destination}</span>
                      {trip.start_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" strokeWidth={1.5} />
                          {new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" strokeWidth={1.5} />{trip.travelers}</span>
                    </div>
                    {tab === "upcoming" && countdown !== null && (
                      <p className="mt-1.5" style={{ color: "#3B82F6", fontSize: 12, fontWeight: 600 }}>
                        {countdown <= 0 ? "Happening now" : `${countdown} days to go`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#4B5563" }} />
                </div>
              </button>
            );
          })
        )}

        {!loading && visible.length > 0 && (
          <button
            onClick={() => setImportOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5"
            style={{ background: "#111827", border: "1px solid #1E2A3F", color: "#94A3B8", borderRadius: 9999, height: 46, fontSize: 14, fontWeight: 600 }}
          >
            <Mail className="h-4 w-4" /> Import a Booking
          </button>
        )}

        <div id="nearby" className="pt-2">
          <NearbySection />
        </div>
      </main>

      <CreateTripSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(trip) => { setTrips((t) => [trip, ...t]); setCreateOpen(false); navigate(`/trips/${trip.id}`); }}
      />
      <BookingImportSheet open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
