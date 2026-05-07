import { useState, useMemo, Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Globe as GlobeIcon, Map, Share2, Camera, Lock, Users, Eye,
  ChevronRight, Flame, Compass, Sparkles,
} from "lucide-react";
import GlobeStatsBar from "@/components/globe/GlobeStatsBar";
import FlatMapView from "@/components/globe/FlatMapView";
import TravelTimeline from "@/components/globe/TravelTimeline";
import TravelerCard from "@/components/globe/TravelerCard";
import CountryProgress from "@/components/globe/CountryProgress";
import {
  MOCK_MAP_PINS, MOCK_GLOBE_STATS, MOCK_CHECKINS,
  MOCK_MEMORIES, MOCK_BADGES, MOCK_USERS, MOCK_TRIPS,
} from "@/data";
import type { MapPin } from "@/data/types";

const InteractiveGlobe = lazy(() => import("@/components/globe/InteractiveGlobe"));

type ViewMode = "globe" | "map";
type Tab = "mine" | "followers" | "explore";
type PrivacyMode = "public" | "followers" | "private";

export default function GlobePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("globe");
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [privacy, setPrivacy] = useState<PrivacyMode>("public");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const pins = MOCK_MAP_PINS;
  const stats = MOCK_GLOBE_STATS;
  const checkIns = MOCK_CHECKINS;
  const memories = MOCK_MEMORIES;
  const badges = MOCK_BADGES;
  const travelers = MOCK_USERS.filter((u) => u.id !== "u-001");

  const globePins = useMemo(
    () => pins.map((p) => ({ lat: p.latitude, lng: p.longitude, label: p.label, category: p.category })),
    [pins]
  );

  const flatPins = useMemo(
    () => pins.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, label: p.label, description: p.description, category: p.category })),
    [pins]
  );

  const privacyIcon = privacy === "public" ? Eye : privacy === "followers" ? Users : Lock;
  const PrivIcon = privacyIcon;

  const cyclePrivacy = () => {
    const order: PrivacyMode[] = ["public", "followers", "private"];
    setPrivacy(order[(order.indexOf(privacy) + 1) % 3]);
  };

  const TABS: { key: Tab; label: string; icon: typeof GlobeIcon }[] = [
    { key: "mine", label: "My Globe", icon: GlobeIcon },
    { key: "followers", label: "Following", icon: Users },
    { key: "explore", label: "Explore", icon: Compass },
  ];

  return (
    <div className="dark-immersive min-h-screen pb-24">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-teal-500/4 blur-3xl" />

        <div className="relative px-5 pt-14 pb-4 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">Your Journey</p>
              <h1 className="font-heading text-[24px] font-bold text-white tracking-tight mt-0.5">Globe</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cyclePrivacy}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold dark-card-elevated transition-all"
              >
                <PrivIcon className={`h-3 w-3 ${privacy === "public" ? "text-glow" : privacy === "followers" ? "text-blue-400" : "text-dark-muted"}`} />
                <span className={privacy === "public" ? "text-glow" : privacy === "followers" ? "text-blue-400" : "text-dark-muted"}>
                  {privacy === "public" ? "Public" : privacy === "followers" ? "Followers" : "Private"}
                </span>
              </button>
              <button className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center" onClick={() => {/* share */}}>
                <Share2 className="h-4 w-4 text-glow" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl dark-card p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                  activeTab === key
                    ? "gradient-glow text-white glow-accent"
                    : "text-dark-muted hover:text-white/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── My Globe Tab ───────────────────────────────── */}
      {activeTab === "mine" && (
        <div className="space-y-0">
          {/* Globe / Map toggle + view */}
          <div className="relative">
            {/* Toggle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex rounded-full dark-card-elevated p-0.5">
              <button
                onClick={() => setViewMode("globe")}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  viewMode === "globe" ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                <GlobeIcon className="h-3 w-3 inline mr-1" />3D Globe
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  viewMode === "map" ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                <Map className="h-3 w-3 inline mr-1" />Flat Map
              </button>
            </div>

            <div className="h-[340px] w-full">
              {viewMode === "globe" ? (
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    </div>
                  }
                >
                  <InteractiveGlobe pins={globePins} />
                </Suspense>
              ) : (
                <FlatMapView pins={flatPins} />
              )}
            </div>

            {/* Floating action buttons */}
            <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
              <button
                onClick={() => navigate("/camera")}
                className="h-10 w-10 rounded-full gradient-accent flex items-center justify-center shadow-lg"
              >
                <Camera className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Stats section */}
          <div className="px-5 pt-5 space-y-6">
            <GlobeStatsBar stats={stats} />

            {/* Recent Check-ins */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-white">Recent Check-ins</h3>
                <button className="text-[10px] text-glow font-bold flex items-center gap-0.5">
                  See all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
                {checkIns.map((ci) => (
                  <div key={ci.id} className="dark-card rounded-2xl overflow-hidden min-w-[160px] snap-start group hover:bg-white/[0.04] transition-colors">
                    {ci.photo && (
                      <div className="h-20 overflow-hidden">
                        <img src={ci.photo} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-[11px] font-semibold text-white truncate">{ci.locationName}</p>
                      <p className="text-[9px] text-dark-muted mt-0.5">
                        {new Date(ci.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Recaps by Trip */}
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-glow" /> Memory Recaps
              </h3>
              <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
                {MOCK_TRIPS.filter((t) => t.status === "completed").map((trip) => {
                  const tripMemories = memories.filter((m) => m.tripId === trip.id);
                  return (
                    <div key={trip.id} className="dark-card rounded-2xl overflow-hidden min-w-[200px] snap-start">
                      <div className="h-24 relative overflow-hidden">
                        {trip.coverImage && (
                          <img src={trip.coverImage} alt="" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-2 left-3 right-3">
                          <p className="text-[11px] font-bold text-white truncate">{trip.title}</p>
                          <p className="text-[9px] text-white/60">{trip.destination}</p>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-[10px] text-dark-muted">{tripMemories.length} memories</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-glow">
                          View
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Country Progress */}
            <CountryProgress />

            {/* Timeline */}
            <TravelTimeline checkIns={checkIns} memories={memories} badges={badges} />

            {/* Badges connected to destinations */}
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-bold text-white">Destination Badges</h3>
              <div className="grid grid-cols-3 gap-2">
                {badges.slice(0, 6).map((b) => (
                  <div key={b.id} className="dark-card rounded-xl p-3 text-center hover:bg-white/[0.04] transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg">
                        {b.category === "milestone" ? "🏆" : b.category === "social" ? "🦋" : "⭐"}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-white truncate">{b.badgeName}</p>
                    <p className="text-[8px] text-dark-muted mt-0.5">{b.earnedDate}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Followers Tab ──────────────────────────────── */}
      {activeTab === "followers" && (
        <div className="px-5 pt-5 space-y-5">
          <div className="space-y-2.5">
            <h3 className="text-[13px] font-bold text-white">Following · Maps</h3>
            <p className="text-[11px] text-dark-muted">Explore the travel maps of people you follow</p>
          </div>

          <div className="space-y-3">
            {travelers.map((t) => (
              <div key={t.id} className="dark-card rounded-2xl p-4 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/20" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-glow">{t.name[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-white truncate">{t.name}</p>
                      {t.verified && <span className="text-[9px] text-glow">✓</span>}
                    </div>
                    <p className="text-[10px] text-dark-muted mt-0.5">{t.bio}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-dark-muted">{t.totalCountries} countries</span>
                      <span className="text-[9px] text-dark-muted">{t.totalCities} cities</span>
                      <span className="text-[9px] text-dark-muted">{t.totalMemories} memories</span>
                    </div>
                  </div>
                  <button className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center shrink-0">
                    <GlobeIcon className="h-4 w-4 text-glow" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Explore Tab ────────────────────────────────── */}
      {activeTab === "explore" && (
        <div className="px-5 pt-5 space-y-5">
          {/* Featured Travelers */}
          <div className="space-y-2.5">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-glow" /> Featured Travelers
            </h3>
            <p className="text-[11px] text-dark-muted">Discover inspiring travel maps from the Roavr community</p>
          </div>

          <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
            {travelers.map((t) => (
              <TravelerCard
                key={t.id}
                profile={t}
                isFollowing={t.id === "u-002" || t.id === "u-004"}
                onFollow={() => {}}
                onViewGlobe={() => {}}
              />
            ))}
          </div>

          {/* Top Destinations */}
          <div className="space-y-2.5">
            <h3 className="text-[13px] font-bold text-white">Trending Destinations</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: "Tokyo, Japan", travelers: "2.4k", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400" },
                { name: "Bali, Indonesia", travelers: "1.8k", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400" },
                { name: "Lisbon, Portugal", travelers: "1.2k", img: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400" },
                { name: "Medellín, Colombia", travelers: "890", img: "https://images.unsplash.com/photo-1583997052301-0042b33fc598?w=400" },
              ].map((dest) => (
                <div key={dest.name} className="dark-card rounded-2xl overflow-hidden group hover:bg-white/[0.04] transition-colors">
                  <div className="h-28 overflow-hidden relative">
                    <img src={dest.img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <p className="text-[11px] font-bold text-white">{dest.name}</p>
                      <p className="text-[9px] text-white/60">{dest.travelers} travelers</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global Stats */}
          <div className="dark-card rounded-2xl p-4 space-y-3">
            <h3 className="text-[13px] font-bold text-white">🌍 Roavr Community</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Travelers", value: "124K" },
                { label: "Countries", value: "195" },
                { label: "Pins Dropped", value: "2.1M" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-heading font-bold text-lg text-glow">{s.value}</p>
                  <p className="text-[9px] text-dark-muted uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
