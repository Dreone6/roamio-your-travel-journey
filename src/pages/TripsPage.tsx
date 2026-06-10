import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ChevronRight, Sparkles, Plane, Mail } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NewTripForm from "@/components/trip/NewTripForm";
import ItineraryView from "@/components/trip/ItineraryView";
import BookingImportSheet from "@/components/bookings/BookingImportSheet";
import NearbySection from "@/components/trips/NearbySection";

type ViewState = "list" | "new" | "view";
type TabKey = "upcoming" | "past" | "drafts";

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

// Canonical fallback — California, Past
const CANON_PAST: Trip = {
  id: "canon-california",
  title: "Trip to California",
  destination: "California",
  start_date: "2025-05-07",
  end_date: "2025-05-12",
  budget: null,
  travelers: 1,
  trip_style: null,
  pace: null,
  dietary: null,
  interests: [],
  status: "completed",
};

export default function TripsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusNearby = searchParams.get("nearby") === "1";
  const [view, setView] = useState<ViewState>("list");
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<any[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (focusNearby) {
      // Smooth-scroll to the nearby section after render
      setTimeout(() => {
        document.getElementById("nearby-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [focusNearby]);

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
    if (trip.id === "canon-california") return;
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
    const { data } = await supabase.from("trips").select("*").eq("id", tripId).single();
    if (data) openTrip(data as Trip);
  };

  if (view === "new") return <NewTripForm onBack={() => setView("list")} onTripCreated={handleTripCreated} />;
  if (view === "view" && selectedTrip)
    return (
      <ItineraryView
        trip={selectedTrip}
        items={itineraryItems}
        onBack={() => {
          setView("list");
          loadTrips();
        }}
        onItemsChange={setItineraryItems}
      />
    );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = trips.filter((t) => {
    if (t.status === "draft") return false;
    if (!t.start_date) return false;
    return new Date(t.start_date) >= today;
  });
  const dbPastTrips = trips.filter((t) => {
    if (t.status === "draft") return false;
    if (!t.start_date) return false;
    return new Date(t.start_date) < today;
  });
  const pastTrips: Trip[] = dbPastTrips.length > 0 ? dbPastTrips : [CANON_PAST];
  const draftTrips = trips.filter((t) => t.status === "draft");

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen pb-6" style={{ background: "#080D1A" }}>
      <BookingImportSheet open={importOpen} onOpenChange={setImportOpen} />

      {/* === HEADER === */}
      <header className="px-5 pt-12 pb-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p
              style={{
                color: "#3B82F6",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              AI-Powered
            </p>
            <h1
              className="text-white mt-1"
              style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1 }}
            >
              Trip Planner
            </h1>
          </div>
          <button
            onClick={() => setView("new")}
            className="shrink-0 inline-flex items-center gap-1.5 text-white active:scale-95 transition-transform"
            style={{
              background: "#3B82F6",
              borderRadius: 9999,
              height: 44,
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New Trip
          </button>
        </div>
      </header>

      {/* === ACTION CARDS === */}
      <section className="px-5 pt-5 space-y-3">
        <button
          onClick={() => navigate("/surprise")}
          className="w-full flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
          style={{
            background: "#1A2236",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0px 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ background: "#3B82F6", borderRadius: 12, width: 40, height: 40 }}
          >
            <Sparkles className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
              Surprise Me
            </p>
            <p style={{ color: "#94A3B8", fontSize: 14, letterSpacing: "0.1px" }}>
              Let Roavr plan your next adventure
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
        </button>

        <button
          onClick={() => setImportOpen(true)}
          className="w-full flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
          style={{
            background: "#1A2236",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0px 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              background: "#111827",
              border: "1px solid #1E2A3F",
              borderRadius: 12,
              width: 40,
              height: 40,
            }}
          >
            <Mail className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
              Import Bookings
            </p>
            <p style={{ color: "#94A3B8", fontSize: 14, letterSpacing: "0.1px" }}>
              Forward your confirmation email or add manually
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
        </button>
      </section>

      {/* === TAB BAR === */}
      <nav className="px-5 pt-6">
        <div className="flex items-center gap-6" style={{ borderBottom: "1px solid #1E2A3F" }}>
          {(["upcoming", "past", "drafts"] as TabKey[]).map((key) => {
            const active = tab === key;
            const label = key === "upcoming" ? "Upcoming" : key === "past" ? "Past" : "Drafts";
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="relative pb-3"
                style={{
                  color: active ? "#FFFFFF" : "#94A3B8",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                }}
              >
                {label}
                {active && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                    style={{ background: "#3B82F6" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* === TAB CONTENT === */}
      <section className="px-5 pt-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ background: "#1A2236", borderRadius: 16, height: 76 }}
              />
            ))}
          </div>
        ) : tab === "upcoming" ? (
          upcomingTrips.length === 0 ? (
            <EmptyTrips
              title="No upcoming trips yet."
              body="Tap + New Trip to start planning your next adventure."
              onNew={() => setView("new")}
            />
          ) : (
            <div className="space-y-3">
              {upcomingTrips.map((t) => (
                <TripCard
                  key={t.id}
                  trip={t}
                  variant="upcoming"
                  onClick={() => openTrip(t)}
                  fmtDate={fmtDate}
                />
              ))}
            </div>
          )
        ) : tab === "past" ? (
          <div className="space-y-3">
            {pastTrips.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                variant="past"
                onClick={() => openTrip(t)}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        ) : draftTrips.length === 0 ? (
          <EmptyTrips
            title="No drafts saved."
            body="Start planning a trip and save it as a draft."
            onNew={() => setView("new")}
          />
        ) : (
          <div className="space-y-3">
            {draftTrips.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                variant="upcoming"
                onClick={() => openTrip(t)}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        )}
      </section>

      {/* === NEARBY (stays / activities / local specials) === */}
      <div id="nearby-section">
        <NearbySection />
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function TripCard({
  trip,
  variant,
  onClick,
  fmtDate,
}: {
  trip: Trip;
  variant: "upcoming" | "past";
  onClick: () => void;
  fmtDate: (iso: string) => string;
}) {
  const isPast = variant === "past";
  const dateLabel = trip.start_date ? fmtDate(trip.start_date) : "—";
  const meta = isPast
    ? `${trip.destination} · ${dateLabel} · Past`
    : `${trip.destination} · ${dateLabel}`;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      style={{
        background: "#1A2236",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0px 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: isPast ? "#1A2236" : "rgba(16,185,129,0.15)",
          border: isPast ? "1px solid #1E2A3F" : "none",
        }}
      >
        <Plane
          className="h-5 w-5"
          style={{ color: isPast ? "#94A3B8" : "#10B981" }}
          strokeWidth={1.5}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white truncate" style={{ fontSize: 16, fontWeight: 600 }}>
          {trip.title}
        </p>
        <p
          className="truncate mt-0.5"
          style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}
        >
          {meta}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
    </button>
  );
}

function EmptyTrips({
  title,
  body,
  onNew,
}: {
  title: string;
  body: string;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center pt-10 pb-4">
      {/* Airplane line art */}
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        stroke="#1E2A3F"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 60 L82 38 L72 50 L46 58 L38 74 L32 70 L34 58 L20 56 Z" />
        <path d="M46 58 L58 70" />
      </svg>
      <h2
        className="text-white mt-6"
        style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}
      >
        {title}
      </h2>
      <p
        className="mt-2 max-w-[280px]"
        style={{ color: "#94A3B8", fontSize: 14, letterSpacing: "0.1px" }}
      >
        {body}
      </p>
      <button
        onClick={onNew}
        className="mt-6 inline-flex items-center gap-1.5 text-white active:scale-95 transition-transform"
        style={{
          background: "#3B82F6",
          borderRadius: 9999,
          height: 52,
          padding: "0 24px",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        New Trip
      </button>
    </div>
  );
}
