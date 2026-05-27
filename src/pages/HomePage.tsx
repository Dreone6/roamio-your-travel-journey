import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, MapPin, Trophy, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Canonical fallbacks (locked project data)
const CANON = {
  countries: 27,
  cities: 64,
  trips: 1,
  memories: 342,
  worldPct: 13,
};

const STALE = 60_000;

function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ background: "#1A2236", ...style }}
    />
  );
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function greetingFor(h: number) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useAppStore((s) => s.user.profile);

  const firstName =
    profile?.name?.split(" ")[0] ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    "Traveler";

  const greeting = greetingFor(new Date().getHours());
  const today = fmtDate(new Date());

  // === Queries ===
  const tripQuery = useQuery({
    queryKey: ["home", "active-trip", user?.id],
    staleTime: STALE,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["active", "planning"])
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const offersQuery = useQuery({
    queryKey: ["home", "offers"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_offers")
        .select("*")
        .eq("active", true)
        .limit(6);
      return data ?? [];
    },
  });

  const challengesQuery = useQuery({
    queryKey: ["home", "challenges", user?.id],
    staleTime: STALE,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(4);
      return data ?? [];
    },
  });

  const memoriesQuery = useQuery({
    queryKey: ["home", "memories", user?.id],
    staleTime: STALE,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("check_ins")
        .select("id, location_name, photo, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const countries = profile?.total_countries_visited ?? CANON.countries;
  const cities = profile?.total_cities_visited ?? CANON.cities;
  const trips = profile?.total_trips ?? CANON.trips;

  const daysLeft = useMemo(() => {
    const t = tripQuery.data;
    if (!t?.end_date) return null;
    const diff = Math.ceil((+new Date(t.end_date) - Date.now()) / 86_400_000);
    return diff > 0 ? diff : null;
  }, [tripQuery.data]);

  const initials = firstName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 1) GREETING HEADER */}
      <section
        className="px-6 pb-6 pt-5"
        style={{
          background: "#0D0F1C",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="font-display text-foreground"
              style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.4px", lineHeight: 1.15 }}
            >
              {greeting}, {firstName}
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {today}
            </p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            aria-label="Open profile"
            className="shrink-0"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.profile_photo} alt={firstName} />
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: "🌍", label: `${countries} countries` },
            { icon: "🏙", label: `${cities} cities` },
            { icon: "✈️", label: `${trips} trips` },
          ].map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)" }}
            >
              <span>{s.icon}</span>
              {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* 2) ACTIVE TRIP CARD */}
      <section className="px-5 pt-6">
        {tripQuery.isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : tripQuery.data ? (
          <button
            onClick={() => navigate("/trips")}
            className="relative block h-[180px] w-full overflow-hidden text-left active:scale-[0.99] transition-transform"
            style={{ borderRadius: 20, background: "linear-gradient(135deg, #111827 0%, #1A2236 100%)" }}
          >
            {/* Optional cover image */}
            {(tripQuery.data as any).cover_photo && (
              <img
                src={(tripQuery.data as any).cover_photo}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(13,15,28,0.85) 0%, rgba(13,15,28,0.15) 60%, transparent 100%)",
              }}
            />
            <div className="absolute inset-x-5 bottom-4">
              <h2
                className="font-display text-foreground"
                style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}
              >
                {tripQuery.data.title}
              </h2>
              <p className="mt-0.5 text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                {tripQuery.data.destination}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {daysLeft !== null && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: "#3B82F6", color: "#0D0F1C" }}
                  >
                    {daysLeft} days left
                  </span>
                )}
                {["Itinerary", "Checklist", "Share"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full px-2.5 py-1 text-[11px]"
                    style={{ background: "rgba(255,255,255,0.1)", color: "#FFFFFF" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate("/trips")}
            className="flex w-full flex-col items-center justify-center gap-2 px-6 py-8 text-center active:scale-[0.99] transition-transform"
            style={{
              borderRadius: 20,
              border: "1.5px dashed #3B82F6",
              background: "#111827",
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <Plus className="h-6 w-6" style={{ color: "#3B82F6" }} strokeWidth={1.75} />
            </div>
            <p className="font-display text-foreground" style={{ fontSize: 17, fontWeight: 600 }}>
              Plan your next trip
            </p>
            <p className="text-[13px]" style={{ color: "#94A3B8" }}>
              Let AI build your itinerary in seconds.
            </p>
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold"
              style={{ background: "#3B82F6", color: "#FFFFFF" }}
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              Start planning
            </span>
          </button>
        )}
      </section>

      {/* 3) NEARBY PARTNER OFFERS */}
      <section className="pt-7">
        <div className="flex items-center justify-between px-5">
          <p
            className="text-[11px] uppercase"
            style={{ color: "#7B7D96", letterSpacing: "0.08em", fontWeight: 600 }}
          >
            Deals near you
          </p>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}
          >
            Within 2 miles
          </span>
        </div>

        {offersQuery.isLoading ? (
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 no-scrollbar">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[240px] shrink-0" style={{ width: "72%" }} />
            ))}
          </div>
        ) : offersQuery.data && offersQuery.data.length > 0 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
            {offersQuery.data.map((o: any) => (
              <article
                key={o.id}
                className="shrink-0 overflow-hidden"
                style={{ width: "72%", borderRadius: 16, background: "#111827" }}
              >
                {o.image ? (
                  <img src={o.image} alt={o.business_name} className="h-[120px] w-full object-cover" />
                ) : (
                  <div className="h-[120px] w-full" style={{ background: "#1A2236" }} />
                )}
                <div className="p-[14px]">
                  <h3
                    className="font-display text-foreground"
                    style={{ fontSize: 15, fontWeight: 600 }}
                  >
                    {o.business_name}
                  </h3>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] capitalize"
                    style={{ background: "#1A2236", color: "#94A3B8" }}
                  >
                    {o.category}
                  </span>
                  <p className="mt-2 text-[13px]" style={{ color: "#94A3B8" }}>
                    {o.offer_description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "#7B7D96" }}>
                      0.4 mi away
                    </span>
                    {o.discount && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#3B82F6", color: "#FFFFFF" }}
                      >
                        {o.discount}
                      </span>
                    )}
                  </div>
                  <button
                    className="mt-3 w-full rounded-full py-2 text-[13px] font-semibold active:scale-[0.98] transition-transform"
                    style={{ background: "#3B82F6", color: "#FFFFFF" }}
                  >
                    Claim offer
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 px-5">
            <div
              className="flex flex-col items-center gap-2 px-5 py-6 text-center"
              style={{ borderRadius: 16, background: "#111827" }}
            >
              <MapPin className="h-6 w-6" style={{ color: "#3B82F6" }} strokeWidth={1.75} />
              <p className="font-display text-foreground" style={{ fontSize: 15, fontWeight: 600 }}>
                Enable location to see nearby deals
              </p>
              <button
                className="mt-1 rounded-full px-4 py-1.5 text-[12px] font-semibold"
                style={{ background: "#3B82F6", color: "#FFFFFF" }}
              >
                Enable location
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4) CHALLENGES */}
      <section className="pt-7">
        <p
          className="px-5 text-[11px] uppercase"
          style={{ color: "#7B7D96", letterSpacing: "0.08em", fontWeight: 600 }}
        >
          Challenges for you
        </p>

        {challengesQuery.isLoading ? (
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 no-scrollbar">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-[140px] shrink-0" style={{ width: "72%" }} />
            ))}
          </div>
        ) : challengesQuery.data && challengesQuery.data.length > 0 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
            {challengesQuery.data.map((c: any) => (
              <article
                key={c.id}
                className="shrink-0 p-4"
                style={{ width: "72%", borderRadius: 16, background: "#111827" }}
              >
                <span className="text-2xl">🏆</span>
                <h3
                  className="mt-2 font-display text-foreground"
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {c.challenge_text}
                </h3>
                {c.location && (
                  <p className="mt-0.5 text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {c.location}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: "rgba(245,158,11,0.18)" }}
                  >
                    <Trophy className="h-4 w-4" style={{ color: "#F59E0B" }} strokeWidth={1.75} />
                  </div>
                  <button
                    className="rounded-full px-3 py-1 text-[11px] font-semibold"
                    style={{ border: "1px solid rgba(255,255,255,0.4)", color: "#FFFFFF" }}
                  >
                    Accept challenge
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 px-5">
            <div
              className="flex items-center gap-3 p-4"
              style={{ borderRadius: 16, background: "#111827" }}
            >
              <MapPin className="h-5 w-5 shrink-0" style={{ color: "#3B82F6" }} strokeWidth={1.75} />
              <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                Check in somewhere to unlock challenges
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5) GLOBE MINI */}
      <section className="px-5 pt-7">
        <button
          onClick={() => navigate("/globe")}
          className="flex w-full items-center gap-4 p-5 text-left active:scale-[0.99] transition-transform"
          style={{ borderRadius: 20, background: "#111827" }}
        >
          <div className="min-w-0 flex-1">
            <h3
              className="font-display text-foreground"
              style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px" }}
            >
              Your world
            </h3>
            <p className="mt-1 text-[13px]" style={{ color: "#94A3B8" }}>
              You have visited {CANON.worldPct}% of the world
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold"
              style={{ color: "#3B82F6" }}
            >
              Explore your globe <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          {/* Mini globe SVG teaser */}
          <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
            <defs>
              <radialGradient id="g" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#0D0F1C" />
              </radialGradient>
            </defs>
            <circle cx="42" cy="42" r="38" fill="url(#g)" stroke="#1E2A3F" strokeWidth="1" />
            <ellipse cx="42" cy="42" rx="38" ry="14" fill="none" stroke="#1E2A3F" strokeWidth="0.6" />
            <ellipse cx="42" cy="42" rx="14" ry="38" fill="none" stroke="#1E2A3F" strokeWidth="0.6" />
            {[
              [30, 32],
              [52, 36],
              [44, 54],
              [60, 50],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2.5" fill="#3B82F6">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
              </circle>
            ))}
          </svg>
        </button>
      </section>

      {/* 6) RECENT MEMORIES */}
      <section className="pt-7">
        <p
          className="px-5 text-[11px] uppercase"
          style={{ color: "#7B7D96", letterSpacing: "0.08em", fontWeight: 600 }}
        >
          Recent memories
        </p>

        {memoriesQuery.isLoading ? (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[80px] w-[80px] shrink-0" style={{ borderRadius: 12 }} />
            ))}
          </div>
        ) : memoriesQuery.data && memoriesQuery.data.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
            {memoriesQuery.data.map((m: any) => (
              <button
                key={m.id}
                className="h-[80px] w-[80px] shrink-0 overflow-hidden"
                style={{ borderRadius: 12, background: "#1A2236" }}
              >
                {m.photo ? (
                  <img src={m.photo} alt={m.location_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">📍</div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 px-5">
            <div
              className="flex items-center justify-center px-5 py-6 text-center"
              style={{ borderRadius: 16, background: "#111827" }}
            >
              <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                Your check-in photos will appear here
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
