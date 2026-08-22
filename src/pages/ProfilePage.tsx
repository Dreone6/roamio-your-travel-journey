import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTravelIdentity } from "@/hooks/useTravelIdentity";
import { toast } from "sonner";
import {
  Pencil, MapPin, Globe as GlobeIcon, Share2, MessageCircle,
  BadgeCheck, ChevronRight, Lock, Play, Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import roavrPin from "@/assets/roavr-pin.png";
import SafePassCard from "@/components/safety/SafePassCard";

const BADGE_LIBRARY = [
  { name: "First Steps", emoji: "📍" },
  { name: "Globe Trotter", emoji: "🌍" },
  { name: "Memory Maker", emoji: "✨" },
  { name: "Social Butterfly", emoji: "🦋" },
  { name: "Night Owl", emoji: "🌙" },
  { name: "Foodie Explorer", emoji: "🍜" },
  { name: "Wanderer", emoji: "🧭" },
  { name: "Streak Keeper", emoji: "🔥" },
  { name: "Mountain Goat", emoji: "⛰️" },
];

type Tab = "map" | "trips" | "moments" | "badges" | "saved";

const TABS: { key: Tab; label: string }[] = [
  { key: "map", label: "Map" },
  { key: "trips", label: "Trips" },
  { key: "moments", label: "Moments" },
  { key: "badges", label: "Badges" },
  { key: "saved", label: "Saved" },
];

function fmtNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function travelLevel(countries: number) {
  if (countries >= 25) return "Globe Trotter";
  if (countries >= 10) return "Adventure Traveler";
  if (countries >= 3) return "Explorer";
  if (countries >= 1) return "First Steps";
  return "New Traveler";
}

interface Moment { id: string; img: string; isVideo: boolean; live: boolean }
interface TripRow { id: string; title: string; destination: string; cover_photo: string | null; status: string }
interface HighlightRow { name: string; img: string }

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const identity = useTravelIdentity();
  const [tab, setTab] = useState<Tab>("map");
  const [statsOpen, setStatsOpen] = useState(false);

  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [earnedNames, setEarnedNames] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [memRes, tripRes, badgeRes] = await Promise.all([
        supabase.from("memories")
          .select("id, media_url, media_type, location_name, created_at, pinned_to_globe")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(24),
        supabase.from("trips")
          .select("id, title, destination, cover_photo, status")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("badges").select("badge_name").eq("user_id", user.id),
      ]);
      if (cancelled) return;

      const mems = (memRes.data ?? []).filter((m) => m.media_url);
      const dayAgo = Date.now() - 86_400_000;
      setMoments(mems.slice(0, 12).map((m) => ({
        id: m.id,
        img: m.media_url!,
        isVideo: (m.media_type ?? "").startsWith("video"),
        live: new Date(m.created_at).getTime() > dayAgo,
      })));
      setHighlights(
        mems.filter((m) => m.pinned_to_globe && m.location_name)
          .slice(0, 6)
          .map((m) => ({ name: m.location_name!, img: m.media_url! }))
      );
      setTrips((tripRes.data ?? []) as TripRow[]);
      setEarnedNames(new Set((badgeRes.data ?? []).map((b) => b.badge_name)));
      setSavedCount(0);
    })().catch(() => {
      if (!cancelled) { setMoments([]); setTrips([]); }
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleShare = async () => {
    const url = `${window.location.origin}/profile`;
    try {
      if (navigator.share) await navigator.share({ title: `${identity.name} on Roavr`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
    } catch { /* dismissed */ }
  };

  const hasCover = highlights[0]?.img;

  return (
    <div className="min-h-screen pb-28" style={{ background: "#080D1A" }}>
      {/* 1. HERO ──────────────────────────────────────── */}
      <div className="relative">
        <div className="relative h-[200px] overflow-hidden">
          {hasCover ? (
            <img src={hasCover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 30% 20%, #1E3A5F 0%, transparent 55%), radial-gradient(ellipse at 75% 60%, #1A2236 0%, transparent 50%), #0A1628" }}
            />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(8,13,26,0.9) 90%, #080D1A)" }} />

          {/* Roavr Passport pill */}
          <div
            className="absolute top-12 left-5 flex items-center gap-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)", padding: "6px 12px" }}
          >
            <img src={roavrPin} alt="" className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold text-white tracking-wider uppercase" style={{ letterSpacing: "0.06em" }}>
              Roavr Passport
            </span>
          </div>

          <button
            onClick={() => navigate("/settings")}
            className="absolute top-12 right-5 h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}
            aria-label="Edit profile"
          >
            <Pencil className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-5 -mt-9 relative z-10">
          <div
            className="h-[72px] w-[72px] rounded-full overflow-hidden flex items-center justify-center"
            style={{ border: "2.5px solid #FFFFFF", background: "#1A2236" }}
          >
            {identity.avatar ? (
              <img src={identity.avatar} alt={identity.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-heading text-[26px] font-bold text-white">
                {(identity.name || "R").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. IDENTITY ──────────────────────────────────── */}
      <div className="px-5 mt-3">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-[32px] font-bold text-white leading-none tracking-tight">
            {identity.loading ? "…" : identity.name}
          </h1>
          <BadgeCheck className="h-[18px] w-[18px] shrink-0" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <GlobeIcon className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          <span className="text-[12px]" style={{ color: "#94A3B8", letterSpacing: "0.02em" }}>
            {identity.countries} {identity.countries === 1 ? "country" : "countries"} · {identity.cities} {identity.cities === 1 ? "city" : "cities"}
          </span>
        </div>

        {identity.homeCity && (
          <p className="mt-1.5 text-[12px]" style={{ color: "#94A3B8" }}>
            <MapPin className="inline h-3.5 w-3.5 -mt-0.5 mr-1" strokeWidth={1.5} />
            {identity.homeCity}
          </p>
        )}

        <div className="inline-flex mt-3 px-2.5 py-1 rounded-full" style={{ border: "1px solid #3B82F6" }}>
          <span className="text-[12px] font-semibold uppercase" style={{ color: "#3B82F6", letterSpacing: "0.08em" }}>
            {travelLevel(identity.countries)}
          </span>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "#94A3B8" }}>
          {identity.bio || "Add a bio so travelers know what you're into."}
        </p>
      </div>

      {/* 3. STATS ROW ──────────────────────── */}
      <div className="px-5 mt-5">
        <div className="flex items-end justify-between">
          {[
            { v: fmtNum(identity.followers), l: "Followers" },
            { v: fmtNum(identity.following), l: "Following" },
            { v: fmtNum(identity.countries), l: "Countries" },
          ].map(s => (
            <div key={s.l} className="flex-1">
              <p className="font-heading text-[20px] font-semibold text-white leading-none tracking-tight">{s.v}</p>
              <p className="text-[12px] uppercase mt-1.5" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>{s.l}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStatsOpen(true)}
          className="mt-2 text-[12px] font-semibold flex items-center gap-0.5"
          style={{ color: "#3B82F6" }}
        >
          View all stats <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* 4. ACTION BUTTONS ─────────────────────────── */}
      <div className="px-5 mt-5 flex gap-2">
        <button
          onClick={() => navigate("/settings")}
          className="flex-1 rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px]"
          style={{ background: "#3B82F6", height: 52 }}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} /> Edit Profile
        </button>
        <button
          onClick={() => navigate("/messages")}
          className="rounded-full flex items-center justify-center text-white font-semibold text-[14px]"
          style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 52, width: 52 }}
          aria-label="Messages"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleShare}
          className="rounded-full flex items-center justify-center text-white font-semibold text-[14px]"
          style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 52, width: 52 }}
          aria-label="Share profile"
        >
          <Share2 className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* 4b. SAFEPASS */}
      <div className="px-5 mt-5">
        <SafePassCard />
      </div>

      {/* 4c. YOUR WORLD */}
      <div className="px-5 mt-5">
        <button
          onClick={() => navigate("/globe")}
          className="w-full text-left rounded-[24px] p-5 active:scale-[0.99] transition-transform"
          style={{ background: "#111827", boxShadow: "0px 2px 8px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-2">
            <GlobeIcon className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            <h3 className="flex-1 text-white" style={{ fontSize: 16, fontWeight: 600 }}>Your World</h3>
            <ChevronRight className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          </div>
          {identity.isEmpty ? (
            <p className="mt-2" style={{ color: "#94A3B8", fontSize: 12 }}>
              Nothing pinned yet — build your world from your photo library.
            </p>
          ) : (
            <>
              <p className="mt-2" style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>
                {identity.countries} countries · {identity.cities} cities · {identity.memories} memories
              </p>
              {identity.latestPin && (
                <p className="mt-2" style={{ color: "#94A3B8", fontSize: 12 }}>
                  Latest pin: {identity.latestPin.label}
                </p>
              )}
            </>
          )}
        </button>
      </div>

      {/* 5. HIGHLIGHTS */}
      <div className="mt-7">
        <div className="px-5 flex items-center justify-between mb-3">
          <h3 className="font-heading text-[20px] font-semibold text-white tracking-tight">Highlights</h3>
          <button
            onClick={() => navigate("/camera")}
            className="text-[12px] font-semibold flex items-center gap-0.5"
            style={{ color: "#3B82F6" }}
          >
            New <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-5 flex gap-3 overflow-x-auto scrollbar-none pb-1">
          <button onClick={() => navigate("/camera")} className="shrink-0 flex flex-col items-center gap-1.5">
            <div
              className="h-[60px] w-[60px] rounded-full flex items-center justify-center"
              style={{ background: "#111827", border: "1px dashed #1E2A3F" }}
            >
              <Plus className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
            </div>
            <span className="text-[12px]" style={{ color: "#94A3B8" }}>Add</span>
          </button>
          {highlights.map(h => (
            <div key={h.name} className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="h-[60px] w-[60px] rounded-full overflow-hidden" style={{ border: "2px solid #FFFFFF" }}>
                <img src={h.img} alt={h.name} className="h-full w-full object-cover" />
              </div>
              <span className="text-[12px] truncate max-w-[68px]" style={{ color: "#94A3B8" }}>{h.name}</span>
            </div>
          ))}
          {highlights.length === 0 && (
            <div className="flex items-center">
              <p className="text-[12px]" style={{ color: "#94A3B8" }}>
                Pinned memories become highlights.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. TAB BAR */}
      <div className="mt-6 px-5" style={{ borderBottom: "1px solid #1E2A3F" }}>
        <div className="flex gap-5">
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="relative pb-3 text-[14px] transition-colors"
                style={{ color: active ? "#FFFFFF" : "#94A3B8", fontWeight: active ? 600 : 500 }}
              >
                {label}
                {active && <span className="absolute left-0 right-0 -bottom-px h-[2px]" style={{ background: "#3B82F6" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. TAB CONTENT */}
      <div className="px-5 mt-5">
        {tab === "map" && (
          <div
            onClick={() => navigate("/globe")}
            className="relative overflow-hidden cursor-pointer"
            style={{ background: "#111827", borderRadius: 24, height: 220, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 30% 40%, #1E3A5F 0%, transparent 45%), radial-gradient(ellipse at 70% 65%, #1E3A5F 0%, transparent 35%), #0A1628" }}
            />
            <div className="absolute inset-0">
              {identity.pins.slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{
                    top: `${((90 - p.lat) / 180) * 100}%`,
                    left: `${((p.lng + 180) / 360) * 100}%`,
                    background: "#3B82F6",
                    boxShadow: "0 0 8px rgba(59,130,246,0.6)",
                  }}
                />
              ))}
            </div>

            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.45)", padding: "4px 10px" }}
            >
              <img src={roavrPin} alt="" className="h-3 w-3" />
              <span className="text-[12px] text-white font-medium">My Globe</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-heading text-white text-[16px] font-semibold leading-tight">
                  {identity.isEmpty ? "Build your world" : `${identity.countries} ${identity.countries === 1 ? "country" : "countries"} pinned`}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>
                  {identity.isEmpty
                    ? "Import from photos or capture a moment"
                    : `${identity.cities} cities · ${identity.checkIns} check-ins`}
                </p>
              </div>
              <button
                className="shrink-0 rounded-full flex items-center gap-1 text-white font-semibold text-[12px]"
                style={{ background: "#3B82F6", padding: "8px 14px" }}
              >
                Open <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {tab === "trips" && (
          trips === null ? <SkeletonGrid /> :
          trips.length === 0 ? (
            <EmptyTab title="No trips yet" body="Plan your first trip and it will live here forever." cta="New Trip" onCta={() => navigate("/trips")} />
          ) : (
            <div className="space-y-3">
              {trips.map(t => (
                <button
                  key={t.id}
                  onClick={() => navigate("/trips")}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                  style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                >
                  <div
                    className="h-14 w-14 rounded-xl bg-cover bg-center shrink-0"
                    style={{ background: t.cover_photo ? `url(${t.cover_photo}) center/cover` : "#1A2236" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white truncate">{t.title}</p>
                    <p className="text-[12px] mt-0.5 capitalize" style={{ color: "#94A3B8" }}>{t.destination} · {t.status}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          )
        )}

        {tab === "moments" && (
          moments === null ? <SkeletonGrid /> :
          moments.length === 0 ? (
            <EmptyTab
              title="No Moments yet."
              body="Capture a photo and post your first Moment."
              cta="Open Capture"
              onCta={() => navigate("/camera")}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {moments.map(m => (
                <div
                  key={m.id}
                  className="relative overflow-hidden bg-cover bg-center"
                  style={{ borderRadius: 12, aspectRatio: "4 / 5", backgroundImage: `url(${m.img})` }}
                >
                  {m.isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                        <Play className="h-5 w-5 text-white" fill="white" strokeWidth={1.5} />
                      </div>
                    </div>
                  )}
                  {m.live && (
                    <div
                      className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full animate-pulse"
                      style={{ background: "#3B82F6", boxShadow: "0 0 6px rgba(59,130,246,0.8)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === "badges" && (
          <div className="grid grid-cols-3 gap-3">
            {BADGE_LIBRARY.map(b => {
              const earned = earnedNames.has(b.name);
              return (
                <div key={b.name} className="rounded-2xl p-3 text-center" style={{ background: "#111827" }}>
                  <div
                    className="relative mx-auto h-12 w-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: "#1A2236", opacity: earned ? 1 : 0.3 }}
                  >
                    <span>{b.emoji}</span>
                    {!earned && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(8,13,26,0.55)", borderRadius: 9999 }}>
                        <Lock className="h-4 w-4 text-white" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] mt-2 truncate" style={{ color: earned ? "#FFFFFF" : "#94A3B8" }}>
                    {b.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {tab === "saved" && (
          <EmptyTab
            title="No saved places yet"
            body="Bookmark spots from Discover to see them here."
            cta="Open Discover"
            onCta={() => navigate("/discover")}
          />
        )}
      </div>

      {/* Stats sheet */}
      <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
        <SheetContent
          side="bottom"
          className="border-0"
          style={{ background: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-white font-heading text-[20px] font-semibold tracking-tight">All stats</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { v: fmtNum(identity.followers), l: "Followers" },
              { v: fmtNum(identity.following), l: "Following" },
              { v: identity.countries, l: "Countries" },
              { v: identity.cities, l: "Cities" },
              { v: identity.trips, l: "Trips" },
              { v: identity.checkIns, l: "Check-ins" },
              { v: identity.memories, l: "Memories" },
              { v: identity.badges, l: "Badges" },
            ].map(s => (
              <div key={s.l} className="rounded-2xl p-4" style={{ background: "#1A2236" }}>
                <p className="font-heading text-[24px] font-bold text-white leading-none tracking-tight">{s.v}</p>
                <p className="text-[12px] uppercase mt-2" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>{s.l}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#111827" }} />
      ))}
    </div>
  );
}

function EmptyTab({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <div className="text-center py-10">
      <p className="font-heading text-[16px] font-semibold text-white">{title}</p>
      <p className="text-[14px] mt-2" style={{ color: "#94A3B8" }}>{body}</p>
      <button
        onClick={onCta}
        className="mt-5 px-6 rounded-full font-semibold text-white text-[14px]"
        style={{ background: "#3B82F6", height: 52 }}
      >
        {cta}
      </button>
    </div>
  );
}
