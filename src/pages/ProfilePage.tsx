import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Pencil, MapPin, Globe as GlobeIcon, Share2, MessageCircle,
  BadgeCheck, ChevronRight, Plane, Sparkles, Bookmark, Trophy,
  Plus, Map as MapIcon, Lock, Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import roavrPin from "@/assets/roavr-pin.png";
import { CURRENT_USER, MOCK_TRIPS, MOCK_BADGES, MOCK_MEMORIES } from "@/data";

// CANONICAL DATA — must match every other screen
const CANON = {
  name: "Andre A Pelissier",
  location: "London",
  countries: 27,
  cities: 64,
  trips: 1,
  checkIns: 1,
  memories: 342,
  followers: 1200,
  following: 318,
  bio: "Explorer at heart. 27 countries and counting 🌍",
  level: "Adventure Traveler",
};

const HERO_COVER =
  "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1400&q=80"; // Tokyo neon

const HIGHLIGHTS = [
  { name: "Swiss Alps", img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=200&q=70" },
  { name: "Vik", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=200&q=70" },
  { name: "Marrakech", img: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=200&q=70" },
  { name: "Zermatt", img: "https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=200&q=70" },
];

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

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("map");
  const [statsOpen, setStatsOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>(CURRENT_USER.avatarUrl);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("profile_photo, name").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.profile_photo) setAvatar(data.profile_photo);
      });
  }, [user]);

  const moments = useMemo(
    () => MOCK_MEMORIES.filter(m => m.userId === "u-001" && m.mediaUrl).slice(0, 12)
      .map((m, i) => ({
        id: m.id,
        img: m.mediaUrl!,
        isVideo: i % 5 === 2,
        live: i === 0, // first one is "live" (within 24h)
      })),
    []
  );

  const trips = useMemo(
    () => MOCK_TRIPS.filter(t => t.status === "completed").slice(0, 6),
    []
  );

  const earnedNames = new Set(MOCK_BADGES.map(b => b.badgeName));

  return (
    <div className="min-h-screen pb-28" style={{ background: "#080D1A" }}>
      {/* 1. HERO ──────────────────────────────────────── */}
      <div className="relative">
        <div className="relative h-[200px] overflow-hidden">
          <img src={HERO_COVER} alt="" className="absolute inset-0 h-full w-full object-cover" />
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

          {/* Edit pencil */}
          <button
            onClick={() => navigate("/settings")}
            className="absolute top-12 right-5 h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}
            aria-label="Edit profile"
          >
            <Pencil className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* Avatar — overlaps cover */}
        <div className="px-5 -mt-9 relative z-10">
          <div
            className="h-[72px] w-[72px] rounded-full overflow-hidden"
            style={{ border: "2.5px solid #FFFFFF", background: "#1A2236" }}
          >
            {avatar && <img src={avatar} alt={CANON.name} className="h-full w-full object-cover" />}
          </div>
        </div>
      </div>

      {/* 2. IDENTITY ──────────────────────────────────── */}
      <div className="px-5 mt-3">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-[32px] font-bold text-white leading-none tracking-tight">
            {CANON.name}
          </h1>
          <BadgeCheck className="h-[18px] w-[18px] shrink-0" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <GlobeIcon className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          <span className="text-[12px]" style={{ color: "#94A3B8", letterSpacing: "0.02em" }}>
            {CANON.countries} countries · {CANON.cities} cities
          </span>
        </div>

        <p className="mt-1.5 text-[12px]" style={{ color: "#94A3B8" }}>
          <MapPin className="inline h-3.5 w-3.5 -mt-0.5 mr-1" strokeWidth={1.5} />
          {CANON.location}
        </p>

        <div
          className="inline-flex mt-3 px-2.5 py-1 rounded-full"
          style={{ border: "1px solid #3B82F6" }}
        >
          <span className="text-[12px] font-semibold uppercase" style={{ color: "#3B82F6", letterSpacing: "0.08em" }}>
            {CANON.level}
          </span>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "#94A3B8" }}>
          {CANON.bio}
        </p>
      </div>

      {/* 3. STATS ROW (3 stats) ──────────────────────── */}
      <div className="px-5 mt-5">
        <div className="flex items-end justify-between">
          {[
            { v: fmtNum(CANON.followers), l: "Followers" },
            { v: fmtNum(CANON.following), l: "Following" },
            { v: fmtNum(CANON.countries), l: "Countries" },
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
          onClick={() => navigate("/inbox")}
          className="rounded-full flex items-center justify-center text-white font-semibold text-[14px]"
          style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 52, width: 52 }}
          aria-label="Message"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          className="rounded-full flex items-center justify-center text-white font-semibold text-[14px]"
          style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 52, width: 52 }}
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* 4b. SAFEPASS — personal safety lives on profile, not feed */}
      <div className="px-5 mt-5">
        <SafePassCard />
      </div>

      {/* 5. HIGHLIGHTS ───────────────────────────── */}
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
          <button
            onClick={() => navigate("/camera")}
            className="shrink-0 flex flex-col items-center gap-1.5"
          >
            <div
              className="h-[60px] w-[60px] rounded-full flex items-center justify-center"
              style={{ background: "#111827", border: "1px dashed #1E2A3F" }}
            >
              <Plus className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
            </div>
            <span className="text-[12px]" style={{ color: "#94A3B8" }}>Add</span>
          </button>
          {HIGHLIGHTS.map(h => (
            <div key={h.name} className="shrink-0 flex flex-col items-center gap-1.5">
              <div
                className="h-[60px] w-[60px] rounded-full overflow-hidden"
                style={{ border: "2px solid #FFFFFF" }}
              >
                <img src={h.img} alt={h.name} className="h-full w-full object-cover" />
              </div>
              <span className="text-[12px] truncate max-w-[68px]" style={{ color: "#94A3B8" }}>{h.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TAB BAR ─────────────────────────── */}
      <div className="mt-6 px-5" style={{ borderBottom: "1px solid #1E2A3F" }}>
        <div className="flex gap-5">
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="relative pb-3 text-[14px] transition-colors"
                style={{
                  color: active ? "#FFFFFF" : "#94A3B8",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {label}
                {active && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[2px]"
                    style={{ background: "#3B82F6" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. TAB CONTENT ─────────────────────── */}
      <div className="px-5 mt-5">
        {tab === "map" && (
          <div
            onClick={() => navigate("/globe")}
            className="relative overflow-hidden cursor-pointer"
            style={{
              background: "#111827",
              borderRadius: 24,
              height: 220,
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {/* Faux dark map background */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 30% 40%, #1E3A5F 0%, transparent 45%), radial-gradient(ellipse at 70% 65%, #1E3A5F 0%, transparent 35%), #0A1628",
              }}
            />
            {/* Pin dots overlay */}
            <div className="absolute inset-0">
              {[
                { t: "20%", l: "25%" }, { t: "40%", l: "55%" }, { t: "55%", l: "30%" },
                { t: "30%", l: "75%" }, { t: "65%", l: "70%" }, { t: "70%", l: "45%" },
              ].map((p, i) => (
                <div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{ top: p.t, left: p.l, background: "#3B82F6", boxShadow: "0 0 8px rgba(59,130,246,0.6)" }}
                />
              ))}
            </div>

            {/* My Globe chip */}
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.45)", padding: "4px 10px" }}
            >
              <img src={roavrPin} alt="" className="h-3 w-3" />
              <span className="text-[12px] text-white font-medium">My Globe</span>
            </div>

            {/* Bottom overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-heading text-white text-[16px] font-semibold leading-tight">
                  {CANON.countries} countries pinned
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>
                  {CANON.cities} cities · {CANON.checkIns} check-in
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
          trips.length === 0 ? (
            <EmptyTab title="No trips yet" body="Plan your first trip to see it here." cta="New Trip" onCta={() => navigate("/trips")} />
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
                    style={{ backgroundImage: `url(${t.coverImage})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white truncate">{t.title}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>{t.destination} · Past</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          )
        )}

        {tab === "moments" && (
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
                <div
                  key={b.name}
                  className="rounded-2xl p-3 text-center"
                  style={{ background: "#111827" }}
                >
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
                  <p
                    className="text-[12px] mt-2 truncate"
                    style={{ color: earned ? "#FFFFFF" : "#94A3B8" }}
                  >
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
              { v: fmtNum(CANON.followers), l: "Followers" },
              { v: fmtNum(CANON.following), l: "Following" },
              { v: CANON.countries, l: "Countries" },
              { v: CANON.cities, l: "Cities" },
              { v: CANON.trips, l: "Trips" },
              { v: CANON.checkIns, l: "Check-ins" },
              { v: CANON.memories, l: "Memories" },
              { v: MOCK_BADGES.length, l: "Badges" },
            ].map(s => (
              <div
                key={s.l}
                className="rounded-2xl p-4"
                style={{ background: "#1A2236" }}
              >
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
