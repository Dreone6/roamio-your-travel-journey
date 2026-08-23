/**
 * The trip workspace: one mobile screen with Overview, Itinerary, Saved and
 * People. Every value here is a real, RLS-authorised row.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Users, MapPin, Globe2, Loader2, Trash2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  addTripToWorld, bucketOf, daysUntil, deleteTrip, getTrip, listItems, tripDayCount, worldLinkState,
} from "@/lib/trips/api";
import type { ItineraryItem, Trip } from "@/lib/trips/types";
import TripItinerary from "@/components/trip/TripItinerary";
import TripSavedSection from "@/components/trip/TripSavedSection";
import TripPeopleSection from "@/components/trip/TripPeopleSection";
import AskRoavrPanel from "@/components/trip/AskRoavrPanel";
import BookingImportSheet from "@/components/bookings/BookingImportSheet";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";

type Tab = "overview" | "itinerary" | "saved" | "people";
const TABS: Tab[] = ["overview", "itinerary", "saved", "people"];

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [importOpen, setImportOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [worldLinked, setWorldLinked] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getTrip(id), listItems(id)])
      .then(([t, i]) => {
        if (cancelled) return;
        setTrip(t);
        setItems(i);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!trip || !user) return;
    worldLinkState(trip, user.id).then((s) => setWorldLinked(s.linked)).catch(() => undefined);
  }, [trip, user]);

  const countdown = useMemo(() => (trip ? daysUntil(trip.start_date) : null), [trip]);
  const bucket = trip ? bucketOf(trip) : null;
  const city = trip?.destination.split(",")[0]?.trim() ?? "";

  const remove = async () => {
    if (!trip || !confirm("Delete this trip and its itinerary?")) return;
    try {
      await deleteTrip(trip.id);
      toast.success("Trip deleted");
      navigate("/trips");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't delete this trip");
    }
  };

  const toWorld = async () => {
    if (!trip || !user) return;
    try {
      await addTripToWorld(trip, user.id);
      setWorldLinked(true);
      toast.success("Added to your World — private until you change it");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't add this trip to World");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080D1A" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#3B82F6" }} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-8 text-center" style={{ background: "#080D1A" }}>
        <p className="text-white font-heading" style={{ fontSize: 18, fontWeight: 600 }}>Trip not found</p>
        <p style={{ color: "#94A3B8", fontSize: 13 }}>It may have been deleted, or you no longer have access.</p>
        <button onClick={() => navigate("/trips")} className="text-white" style={{ background: "#3B82F6", borderRadius: 9999, padding: "10px 18px", fontSize: 14, fontWeight: 600 }}>
          Back to Trips
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#080D1A" }}>
      <header className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/trips")} aria-label="Back" className="p-1.5 -ml-1.5">
            <ArrowLeft className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>
          <button onClick={remove} aria-label="Delete trip" className="p-1.5">
            <Trash2 className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          </button>
        </div>

        <h1 className="mt-3 text-white font-heading" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.5px" }}>
          {trip.title}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: "#94A3B8", fontSize: 13 }}>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />{trip.destination}</span>
          {trip.start_date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
              {new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" strokeWidth={1.5} />{trip.travelers}</span>
        </div>

        <div className="mt-3 inline-flex rounded-full px-3 py-1" style={{ background: "#1A2236" }}>
          <span style={{ color: bucket === "upcoming" ? "#3B82F6" : "#94A3B8", fontSize: 12, fontWeight: 600 }}>
            {bucket === "drafts"
              ? "Draft — add dates"
              : bucket === "past"
                ? "Past trip"
                : countdown === 0
                  ? "Today"
                  : `${countdown} days to go`}
          </span>
        </div>
      </header>

      <nav className="px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="shrink-0 capitalize"
            style={{
              background: tab === t ? "#3B82F6" : "#111827",
              color: tab === t ? "#FFFFFF" : "#94A3B8",
              border: "1px solid #1E2A3F", borderRadius: 9999, padding: "8px 14px", fontSize: 13, fontWeight: 600,
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="px-5 mt-5 space-y-5">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Days", value: tripDayCount(trip) },
                { label: "Plans", value: items.length },
                { label: "Travelers", value: trip.travelers },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
                  <p className="text-white font-heading" style={{ fontSize: 20, fontWeight: 600 }}>{s.value}</p>
                  <p style={{ color: "#94A3B8", fontSize: 11 }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAskOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-white"
                style={{ background: "#3B82F6", borderRadius: 9999, height: 46, fontSize: 14, fontWeight: 600 }}
              >
                <Sparkles className="h-4 w-4" /> Ask Roavr
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5"
                style={{ background: "#111827", border: "1px solid #1E2A3F", color: "#94A3B8", borderRadius: 9999, height: 46, fontSize: 14, fontWeight: 600 }}
              >
                <Mail className="h-4 w-4" /> Import booking
              </button>
            </div>

            {askOpen && (
              <AskRoavrPanel
                trip={trip}
                trips={[trip]}
                items={items}
                onTripSelect={() => undefined}
                onItemsAdded={(added) => { setItems((i) => [...i, ...added]); setTab("itinerary"); }}
                onClose={() => setAskOpen(false)}
              />
            )}

            {bucket === "past" && (
              <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4" style={{ color: "#F4A261" }} strokeWidth={1.5} />
                  <p className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
                    {worldLinked ? "This trip is in your World" : "Add this trip to your World"}
                  </p>
                </div>
                <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
                  {worldLinked
                    ? "It already has a visit record — nothing will be duplicated."
                    : "Turns this trip into a private visit on your globe and passport."}
                </p>
                {!worldLinked && (
                  <button onClick={toWorld} className="mt-3 text-white" style={{ background: "#3B82F6", borderRadius: 9999, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
                    Add to World
                  </button>
                )}
              </div>
            )}

            {city && <PeopleWhoKnowPlace city={city} title={`People who know ${city}`} />}
          </>
        )}

        {tab === "itinerary" && <TripItinerary trip={trip} items={items} onChange={setItems} />}

        {tab === "saved" && (
          <TripSavedSection trip={trip} items={items} onItemsAdded={(added) => setItems((i) => [...i, ...added])} />
        )}

        {tab === "people" && (
          <TripPeopleSection trip={trip} onTripChange={(patch) => setTrip((t) => (t ? { ...t, ...patch } : t))} />
        )}
      </main>

      <BookingImportSheet open={importOpen} onOpenChange={setImportOpen} tripId={trip.id} />
    </div>
  );
}
